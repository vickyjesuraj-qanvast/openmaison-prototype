'use server'

import { randomUUID } from 'node:crypto'
import { and, eq, inArray, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { projectInvoices, projectPayments, projects } from '@/lib/db/schema'
import { revalidateLead } from '@/lib/leads/queries'
import { notify } from '@/lib/notifications/emit'
import { bookkeeperIds } from '@/lib/notifications/queries'
import { money2 } from '@/lib/quotes/math'
import { portalActor } from '@/lib/portal/session'
import { logProjectEvent } from '@/lib/projects/events'
import { confirmerIdsFor, fetchPaymentRules, fileProof } from '@/lib/projects/payments'
import { CLIENT_METHODS, NOTE_MAX, PROOF_CAP, REFERENCE_MAX, amountProblem, paidOnProblem } from '@/lib/projects/payments-model'
import { methodRefusal } from '@/lib/projects/payment-methods'   // (parity map, FB-112 · P-D)
import { fetchCollectionRules } from '@/lib/projects/payment-methods-queries'

/*
 * (Projects round 6 — Q-48 · F-10 · F-11, board 4's "I have paid") The client says they paid, on their portal's Money tab: how much, the day,
 * the bank's reference and its confirmation (a screenshot or a PDF — 1.0 asked for it and never showed it to the studio, G-327; here it is filed
 * in the project's Files › Payments and opens from the payment). Checked on the server as every portal request is (`portalActor`): the address,
 * Live / Paused, the session — a studio's preview records nothing — then the invoice: one of this visitor's homes, sent, something still
 * owed. The payment waits as To confirm for the confirmer Settings › Projects names; with *Trust the client's proof* on it counts at once and
 * still waits to be checked. Portal actions revalidate no portal path (round 4b: a revalidation wipes "Since you last looked"); the page
 * refreshes itself.
 */
type Refusal = { error: string }

export type SayPaidInput = { invoiceId: string; amountMinor: number; paidOn: number; method: string; reference?: string | null; note?: string | null; proof: { name: string; dataUrl: string } | null }

export async function sayPaid(slug: string, o: SayPaidInput): Promise<{ trusted: boolean; amountMinor: number } | Refusal> {
  const who = await portalActor(slug, { write: true, section: 'money' })   /* (round 9, Q-45) a Money section switched off refuses it */
  if ('error' in who) return who
  const [row] = await db.select({ i: projectInvoices, p: projects }).from(projectInvoices).innerJoin(projects, eq(projects.id, projectInvoices.projectId))
    .where(and(eq(projectInvoices.id, typeof o?.invoiceId === 'string' ? o.invoiceId : ''), isNull(projects.deletedAt))).limit(1)
  const link = row ? who.visitor.links.find((l) => l.leadId === row.p.leadId) : null
  if (!row || !link) return { error: 'This invoice isn’t one of yours' }
  const { i, p } = row
  if (i.status !== 'sent') return { error: 'This invoice isn’t open for payment' }
  const pays = await db.select({ amountMinor: projectPayments.amountMinor }).from(projectPayments).where(and(eq(projectPayments.invoiceId, i.id), inArray(projectPayments.status, ['confirmed', 'to_confirm'])))
  const owed = Math.max(0, i.amountMinor - pays.reduce((s, x) => s + x.amountMinor, 0))
  if (owed <= 0) return { error: 'This invoice is paid — thank you' }
  const amount = Math.round(Number(o?.amountMinor))
  const why = amountProblem(amount, owed)
  if (why) return { error: why }
  const day = typeof o?.paidOn === 'number' && Number.isFinite(o.paidOn) ? (() => { const d = new Date(o.paidOn); return new Date(d.getFullYear(), d.getMonth(), d.getDate()) })() : null
  const dayWhy = paidOnProblem(day, { sentAt: i.sentAt?.getTime() ?? null, now: Date.now() })
  if (dayWhy) return { error: dayWhy }
  if (!CLIENT_METHODS.some((m) => m.value === o?.method)) return { error: 'Say how you paid' }
  /* (parity map, FB-112 — P-D's `methodRefusal`) a way the studio switched off in Settings › Finance › Client payments is refused, in the
     client's words (the studio's rule names a Settings page the client never sees) */
  if (methodRefusal(await fetchCollectionRules(), o.method)) return { error: `${CLIENT_METHODS.find((m) => m.value === o.method)?.label ?? 'That way'} isn’t a way ${who.look.studio} takes payments now — choose another` }
  const proof = o?.proof && typeof o.proof.dataUrl === 'string' && /^data:(image\/[a-z0-9.+-]+|application\/pdf)[;,]/i.test(o.proof.dataUrl) ? o.proof : null
  if (!proof) return { error: 'Add your bank’s confirmation so the studio can match it' }
  if (proof.dataUrl.length > PROOF_CAP) return { error: 'The confirmation is too large — under 6 MB, please' }
  const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '')
  const rules = await fetchPaymentRules()
  const now = new Date()
  const id = randomUUID()
  const proofFileId = await fileProof(p.leadId, null, { name: clean(proof.name, 90) || `Payment for ${i.number ?? i.stageName}`, dataUrl: proof.dataUrl })
  await db.insert(projectPayments).values({
    id, projectId: p.id, invoiceId: i.id, amountMinor: amount, paidOn: day!, method: o.method, reference: clean(o.reference, REFERENCE_MAX) || null, note: clean(o.note, NOTE_MAX) || null,
    proofFileId, source: 'client', status: 'to_confirm', trusted: rules.trust, recordedBy: null, submittedBy: who.visitor.homeownerId, createdAt: now, updatedAt: now,
  })
  await logProjectEvent(db, p.leadId, p.id, 'project_payment_submitted', { id, invoice: i.id, stage: i.stageName, title: i.number ?? '', to: money2(amount), method: o.method, trusted: rules.trust, name: p.name, number: p.number, person: who.visitor.name }, { actorId: null })   // (fix-F, F-04) who said it — the client, or someone from their household
  await notify('payment_to_confirm', [...new Set([...await confirmerIdsFor(p.leadId, rules), ...await bookkeeperIds()])], {   // (parity map, MI-007) and Accounting
    title: `${who.visitor.name} says they paid ${money2(amount)}`, body: `${i.stageName} · ${i.number ?? ''}${rules.trust ? ' — it counts at once; check it arrived' : ' — check it arrived and confirm'}`,
    href: `/projects/${p.id}/money?open=${encodeURIComponent(id)}`, leadId: p.leadId, actorId: null,
  })
  revalidateLead(p.leadId)
  return { trusted: rules.trust, amountMinor: amount }
}
