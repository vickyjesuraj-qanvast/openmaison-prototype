import 'server-only'
import { and, asc, eq, inArray, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { contracts, members, projectInvoices, projectPayments, projectScheduleShares, projectSelections, projectUpdates, projects, quotes } from '@/lib/db/schema'
import { money2 } from '@/lib/quotes/math'
import { dayLabel, dayOf } from '@/lib/projects/schedule-model'
import { clientStageName } from './model'
import { tellClient } from './client-messages-send'

/*
 * (gaps build H — H-Q17) One call per sender, after its own write — each reads what its message needs, so a sender adds one line:
 * an invoice sent (money-actions `sendInvoice`), a payment confirmed or recorded (payment-actions), an agreement or a bundle out for
 * signature (contracts' `sendContract` · `shareContractLink` · `sendBundle`), a quote or a variation order sent for the client's answer
 * (`sendQuoteForConfirmation`), the schedule shared (schedule-actions), an update out to the client (updates-actions' `tellTeam`, which runs
 * at every go-out). Each answers how many messages went; none throws.
 */
const first = (name: string) => name.split(/\s+/)[0] ?? name

export async function tellInvoiceSent(invoiceId: string): Promise<number> {
  try {
    const [r] = await db.select({ i: projectInvoices, leadId: projects.leadId }).from(projectInvoices).innerJoin(projects, eq(projects.id, projectInvoices.projectId)).where(eq(projectInvoices.id, invoiceId)).limit(1)
    if (!r || r.i.status !== 'sent') return 0
    const stage = clientStageName(r.i.stageName).toLowerCase()
    return tellClient({ event: 'client_invoice_sent', leadId: r.leadId, ref: invoiceId, path: `money?open=${encodeURIComponent(invoiceId)}`,
      fields: { '{invoice}': stage, '{amount}': money2(r.i.amountMinor) },
      plain: { title: `Your ${stage} invoice`, line: `Your ${stage} invoice for ${money2(r.i.amountMinor)} is on your page, with how to pay.` } })
  } catch { return 0 }
}

export async function tellReceipt(paymentId: string): Promise<number> {
  try {
    const [r] = await db.select({ pay: projectPayments, i: projectInvoices, leadId: projects.leadId }).from(projectPayments).innerJoin(projectInvoices, eq(projectInvoices.id, projectPayments.invoiceId))
      .innerJoin(projects, eq(projects.id, projectPayments.projectId)).where(eq(projectPayments.id, paymentId)).limit(1)
    if (!r || r.pay.status !== 'confirmed') return 0
    const what = r.i.number ? `invoice ${r.i.number}` : `the ${clientStageName(r.i.stageName).toLowerCase()} invoice`
    return tellClient({ event: 'client_receipt', leadId: r.leadId, ref: paymentId, path: `money?open=${encodeURIComponent(r.i.id)}`,
      fields: { '{invoice}': what, '{amount}': money2(r.pay.amountMinor) },
      plain: { title: 'Your payment is confirmed', line: `Your payment of ${money2(r.pay.amountMinor)} for ${what} is confirmed — the receipt is on your page.` } })
  } catch { return 0 }
}

/** An agreement (or a bundle of them) out for signature, or a quote / variation order sent for the client's answer. */
export async function tellToAnswer(o: { kind: 'agreement'; id: string } | { kind: 'bundle'; id: string; contractIds: string[] } | { kind: 'quote'; id: string }): Promise<number> {
  try {
    if (o.kind === 'quote') {
      const [q] = await db.select().from(quotes).where(eq(quotes.id, o.id)).limit(1)
      if (!q || q.status !== 'Sent to Client') return 0
      const vo = q.kind === 'variation'
      const document = vo ? `a change to your contract to approve (${q.number})` : 'your quote to look through and confirm'
      return tellClient({ event: 'client_to_answer', leadId: q.leadId, ref: `${q.id}:${(q.clientSentAt ?? q.sentAt ?? q.createdAt).getTime()}`, path: '',
        fields: { '{document}': document }, plain: { title: vo ? 'A change to approve' : 'Your quote is ready', line: `There is ${document} waiting on your page.` } })
    }
    const ids = o.kind === 'bundle' ? o.contractIds : [o.id]
    const rows = ids.length ? await db.select({ id: contracts.id, title: contracts.title, leadId: contracts.leadId, status: contracts.status }).from(contracts).where(and(inArray(contracts.id, ids), isNull(contracts.deletedAt))) : []
    const live = rows.filter((c) => c.status === 'Sent to Client')
    const lead = live[0]?.leadId
    if (!lead) return 0
    const document = live.length > 1 ? `${live.length} documents to sign` : `your agreement to sign — ${live[0]!.title}`
    return tellClient({ event: 'client_to_answer', leadId: lead, ref: o.kind === 'bundle' ? `bundle:${o.id}` : o.id, path: '',
      fields: { '{document}': document }, plain: { title: 'Something to sign', line: `There is ${document} waiting on your page.` } })
  } catch { return 0 }
}

export async function tellScheduleShared(projectId: string): Promise<number> {
  try {
    const [p] = await db.select({ leadId: projects.leadId, name: projects.name }).from(projects).where(eq(projects.id, projectId)).limit(1)
    const shares = await db.select({ id: projectScheduleShares.id, note: projectScheduleShares.note }).from(projectScheduleShares).where(eq(projectScheduleShares.projectId, projectId)).orderBy(asc(projectScheduleShares.sharedAt))
    const last = shares[shares.length - 1]
    if (!p || !last) return 0
    const again = shares.length > 1
    return tellClient({ event: 'client_schedule_shared', leadId: p.leadId, ref: last.id, path: 'schedule', fields: {},
      plain: { title: again ? 'Your schedule has changed' : 'Your schedule is ready', line: again ? 'Your schedule has changed — see what moved on your page.' : 'The stages ahead and when each is planned are on your page.' } })
  } catch { return 0 }
}

export async function tellUpdate(updateId: string): Promise<number> {
  try {
    const [u] = await db.select({ u: projectUpdates, leadId: projects.leadId }).from(projectUpdates).innerJoin(projects, eq(projects.id, projectUpdates.projectId)).where(eq(projectUpdates.id, updateId)).limit(1)
    if (!u || u.u.status !== 'published') return 0
    const [a] = u.u.authorId ? await db.select({ name: members.name }).from(members).where(eq(members.id, u.u.authorId)).limit(1) : []
    return tellClient({ event: 'client_update', leadId: u.leadId, ref: `${updateId}:${(u.u.publishedAt ?? u.u.createdAt).getTime()}`, path: 'updates',
      fields: { '{update}': u.u.title, ...(a ? { '{sender}': first(a.name) } : {}) },
      plain: { title: `New update: ${u.u.title}`, line: `A new update on the work at your home: “${u.u.title}”.` } })
  } catch { return 0 }
}

/* ── (simplify S-21 · Q-13, her "build everything" 2026-10-09) four more moments the client hears of by themselves ──────────────────── */

/** A choice shared with the client (or shared again after their no) — "A choice to make". Once per share: the share's moment is in the key. */
export async function tellChoiceShared(selectionId: string): Promise<number> {
  try {
    const [r] = await db.select({ s: projectSelections, leadId: projects.leadId }).from(projectSelections).innerJoin(projects, eq(projects.id, projectSelections.projectId))
      .where(and(eq(projectSelections.id, selectionId), isNull(projectSelections.deletedAt), isNull(projects.deletedAt))).limit(1)
    if (!r || r.s.status !== 'shared') return 0
    return tellClient({ event: 'client_choice', leadId: r.leadId, ref: `${selectionId}:${(r.s.sharedAt ?? r.s.updatedAt).getTime()}`, path: `choices?open=${encodeURIComponent(selectionId)}`,
      fields: { '{choice}': r.s.title },
      plain: { title: `A choice to make: ${r.s.title}`, line: `There’s a choice for you to make: “${r.s.title}”. The options are on your page.` } })
  } catch { return 0 }
}

/** The kinds `tellClientEvent` sends — a choice shared, the work paused, running again, the home handed over. */
export type ClientEventKind = 'choice' | 'paused' | 'resumed' | 'handed_over'

/**
 * (simplify Q-13) One door for the moments a project's own actions raise — called after the action's own write, and it reads what it needs:
 * `'paused'` after a project is put on hold (its reason, which the client reads on their schedule anyway, and the day it should resume),
 * `'resumed'` after Resume, `'handed_over'` once the handover completes, `'choice'` after a choice is shared. Each checks the project is in that
 * state now, so a call after an Undo sends nothing; each goes once per moment (the moment is in the key). Never throws; answers how many went.
 * (simplify round 2, R2-C) The hold's, the resume's and the handover's callers run it inside their Undo's window (`holdClientMail`,
 * lib/notifications/delivery.ts): the messages wait in the outbox as held, and the Undo deletes them — it no longer races the email.
 */
export async function tellClientEvent(kind: ClientEventKind, o: { projectId?: string; selectionId?: string }): Promise<number> {
  try {
    if (kind === 'choice') return o.selectionId ? tellChoiceShared(o.selectionId) : 0
    const [p] = o.projectId ? await db.select().from(projects).where(and(eq(projects.id, o.projectId), isNull(projects.deletedAt))).limit(1) : []
    if (!p) return 0
    if (kind === 'paused') {
      if (!p.onHoldAt) return 0
      const reason = (p.onHoldReason ?? '').trim().replace(/[.!?]+$/, '')
      const resume = typeof p.onHoldUntil === 'number' && Number.isFinite(p.onHoldUntil) ? `We expect to pick up around ${dayLabel(dayOf(new Date(p.onHoldUntil)))}.` : 'We’ll tell you as soon as we pick up again.'   // (invented copy)
      return tellClient({ event: 'client_paused', leadId: p.leadId, ref: `${p.id}:paused:${p.onHoldAt.getTime()}`, path: 'schedule',
        fields: { '{reason}': reason || 'for a short while', '{resume}': resume },
        plain: { title: 'The works are paused', line: `We’re pausing the works${reason ? ` — ${reason}` : ''}. ${resume}` } })
    }
    if (kind === 'resumed') {
      if (p.onHoldAt || p.stage === 'completed') return 0
      return tellClient({ event: 'client_resumed', leadId: p.leadId, ref: `${p.id}:resumed:${p.updatedAt.getTime()}`, path: 'schedule', fields: {},
        plain: { title: 'The works are running again', line: 'The works are running again — the schedule ahead is on your page.' } })
    }
    if (p.stage !== 'completed') return 0
    return tellClient({ event: 'client_handed_over', leadId: p.leadId, ref: `${p.id}:handed_over:${(p.completedAt ?? p.updatedAt).getTime()}`, path: '', fields: {},
      plain: { title: 'Your home is handed over', line: 'Your home is handed over — thank you for having us. Your page keeps everything from the project.' } })
  } catch { return 0 }
}
