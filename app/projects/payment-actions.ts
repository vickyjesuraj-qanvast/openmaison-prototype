'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { and, eq, inArray, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { creditNotes, leadEvents, leadFiles, notifications, projectInvoices, projectPayments, type ProjectInvoice, type ProjectPayment } from '@/lib/db/schema'
import { fetchViewer } from '@/lib/leads/visibility'
import { revalidateLead } from '@/lib/leads/queries'
import { runsStudio } from '@/lib/leads/assign-policy'
import { notify } from '@/lib/notifications/emit'
import { bookkeeperIds, leadMemberIds, moneyRunnerIds } from '@/lib/notifications/queries'
import { displayDate } from '@/lib/format'
import { money2 } from '@/lib/quotes/math'
import { logProjectEvent, type ProjectEventDetail, type ProjectEventKind } from '@/lib/projects/events'
import { CHANGE_RULE, mayChangeProject } from '@/lib/projects/policy'
import { pickPriceDifference } from '@/lib/projects/choices'
import { CALL_AFTER_REMINDERS } from '@/lib/projects/invoices-kinds'   // (parity map, MI-068)
import { methodRefusal } from '@/lib/projects/payment-methods'   // (parity map, FB-112) P-D's rules
import { fetchCollectionRules } from '@/lib/projects/payment-methods-queries'
import { NO_PRICE_CHANGE, draftVariationForPick } from '@/lib/projects/draft-variation'   // (simplify round 2, R2-A) drafted as a named member
import {
  confirmerIdsFor, fetchPaymentRules, fetchReceiptNumbering, fileProof, homeownerName, invoiceAfter, issueReceipt, markReceiptFile, moneyContext, savePaymentRules,
  saveReceiptNumbering, withdrawReceipt, type MoneyContext,
} from '@/lib/projects/payments'
import {
  CONFIRM_RULE, CREDIT_METHOD, NOTE_MAX, PAYMENT_SETTINGS_RULE, PROOF_CAP, REASON_MAX, RECORD_RULE, REFERENCE_MAX, REVERSE_RULE, amountProblem, confirmsPayments,
  isPaymentMethod, overpaidBy, paidOnProblem, parsePaymentRules, parseReceiptNumbering, recordsPayments, reversesPayments, type PaymentRules,
} from '@/lib/projects/payments-model'
import { dropHeldCredit, heldCreditOfPayment, holdOverpayment } from '@/lib/finance/credit-hold'   // (pending modules S07 — D-14)
import { OVERPAY_USED_RULE, heldNow, usableOn } from '@/lib/finance/credit-model'
import { moneySummaryOf } from '@/lib/projects/money-queries'
import type { ProjectNumbering } from '@/lib/projects/model'
import { tellReceipt } from '@/lib/portal/client-tells'   // (gaps build H)
import { workspaceRefusal } from '@/lib/settings/desk'   // (S45C) the workspace's role rule

/*
 * (Projects round 6 — money in, part two: F-10 · F-11 · F-12 · F-14 · F-18 · Q-48) The Money tab's payment actions. Who sees a project is its
 * lead's rule; who sees and records its money is the project's team, Owners and Admins (F-17); who confirms a client's payment is the
 * confirmer Settings › Projects names, and every Owner and Admin; who reverses one is an Owner or an Admin (F-18). Every refusal answers
 * `{ error: <the rule> }`; every step writes its `project_payment_*` event so Activity reads the whole trail; a proof (a picture or a PDF)
 * travels inside the one object argument (F205). The client's own "I have paid" is app/portal/payment-actions.ts.
 */
type Refusal = { error: string }
const isRefusal = (x: unknown): x is Refusal => !!x && typeof x === 'object' && 'error' in x
const GONE = 'This invoice is not there any more'
const PAY_GONE = 'This payment is not there any more'

type InvCtx = MoneyContext & { i: ProjectInvoice }
async function forInvoice(invoiceId: string): Promise<InvCtx | Refusal> {
  const [i] = await db.select().from(projectInvoices).where(eq(projectInvoices.id, typeof invoiceId === 'string' ? invoiceId : '')).limit(1)
  if (!i) return { error: GONE }
  const c = await moneyContext(i.projectId); if (isRefusal(c)) return c
  return { ...c, i }
}
type PayCtx = InvCtx & { pay: ProjectPayment }
async function forPayment(paymentId: string): Promise<PayCtx | Refusal> {
  const [pay] = await db.select().from(projectPayments).where(eq(projectPayments.id, typeof paymentId === 'string' ? paymentId : '')).limit(1)
  if (!pay) return { error: PAY_GONE }
  const c = await forInvoice(pay.invoiceId); if (isRefusal(c)) return c
  return { ...c, pay }
}
const moneyHref = (projectId: string, id?: string) => `/projects/${projectId}/money${id ? `?open=${encodeURIComponent(id)}` : ''}`
function touch(c: { p: { id: string; leadId: string } }) {
  revalidatePath('/projects', 'layout')
  revalidatePath(moneyHref(c.p.id))
  revalidateLead(c.p.leadId)
}
const log = (c: MoneyContext, kind: ProjectEventKind, detail: ProjectEventDetail, o: { actorId?: string | null; at?: Date } = {}) =>
  logProjectEvent(db, c.p.leadId, c.p.id, kind, { name: c.p.name, number: c.p.number, ...detail }, o)
const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '')
const dayStart = (ms: number) => { const d = new Date(ms); return new Date(d.getFullYear(), d.getMonth(), d.getDate()) }
/** What an invoice still owes: its amount less the payments that count or wait to be confirmed and (pending modules S07) less its issued credit
    notes — the figure Money shows as its balance; an overpayment's credit lowers no invoice. */
const owedOn = async (i: ProjectInvoice, exceptId?: string) => {
  const [pays, credits] = await Promise.all([
    db.select({ id: projectPayments.id, amountMinor: projectPayments.amountMinor, status: projectPayments.status }).from(projectPayments)
      .where(and(eq(projectPayments.invoiceId, i.id), inArray(projectPayments.status, ['confirmed', 'to_confirm']))),
    db.select({ amountMinor: creditNotes.amountMinor, kind: creditNotes.kind }).from(creditNotes).where(and(eq(creditNotes.invoiceId, i.id), eq(creditNotes.status, 'issued'))),
  ])
  const credited = credits.filter((c) => c.kind !== 'overpayment').reduce((s, c) => s + c.amountMinor, 0)
  return Math.max(0, i.amountMinor - credited - pays.filter((p) => p.id !== exceptId).reduce((s, p) => s + p.amountMinor, 0))
}
const labelOf = (i: ProjectInvoice) => i.number ?? i.externalRef ?? `the ${i.stageName} invoice`

/* ── Record a payment (F-10 · F-11: the studio's are confirmed on entry, with their receipt) ───────────────────────────────────── */

export type RecordInput = { amountMinor: number; paidOn: number; method: string; reference?: string | null; note?: string | null; proof?: { name: string; dataUrl: string } | null }
export type RecordAnswer = { paymentId: string; receipt: string | null; state: string; balanceMinor: number
  /** (pending modules S07 — D-14) more came than was owed: the extra, kept as the client's credit note */ credit?: { number: string; amountMinor: number } | null }

export async function recordPayment(invoiceId: string, o: RecordInput): Promise<RecordAnswer | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forInvoice(invoiceId); if (isRefusal(c)) return c
  if (!recordsPayments(c.viewer, c.team)) return { error: RECORD_RULE }
  if (c.i.status !== 'sent') return { error: c.i.status === 'void' ? 'A void invoice takes no payment — its fresh Draft does, once it is sent' : 'Send the invoice first — a Draft takes no payment' }
  const amount = Math.round(Number(o?.amountMinor))
  const owed = await owedOn(c.i)
  const why = amountProblem(amount, owed, { studio: true })
  if (why) return { error: why }
  const day = typeof o?.paidOn === 'number' && Number.isFinite(o.paidOn) ? dayStart(o.paidOn) : null
  const dayWhy = paidOnProblem(day, { now: Date.now() })   // (fix-D, D-32) a payment may come before the invoice went out
  if (dayWhy) return { error: dayWhy }
  if (!isPaymentMethod(o?.method)) return { error: 'Say how it was paid' }
  const off = methodRefusal(await fetchCollectionRules(), o.method); if (off) return { error: off }   // (parity map, FB-112) a way switched off in Settings › Finance › Client payments
  const proof = o?.proof && typeof o.proof.dataUrl === 'string' && o.proof.dataUrl.startsWith('data:') ? o.proof : null
  if (proof && proof.dataUrl.length > PROOF_CAP) return { error: 'The confirmation is too large — under 6 MB, please' }
  const now = new Date()
  const id = randomUUID()
  /* (pending modules S07 — D-14, as recommended) what arrived is recorded: what the invoice owed settles it, the extra becomes the client's credit */
  const extra = overpaidBy(amount, owed)
  const settles = amount - extra
  const proofFileId = proof ? await fileProof(c.p.leadId, c.viewer.id, { name: clean(proof.name, 90) || `Payment ${c.i.number ?? ''}`, dataUrl: proof.dataUrl }) : null
  await db.insert(projectPayments).values({
    id, projectId: c.p.id, invoiceId: c.i.id, amountMinor: settles, paidOn: day!, method: o.method, reference: clean(o.reference, REFERENCE_MAX) || null, note: clean(o.note, NOTE_MAX) || null,
    proofFileId, source: 'studio', status: 'confirmed', trusted: false, recordedBy: c.viewer.id, submittedBy: null, confirmedBy: c.viewer.id, confirmedAt: now, createdAt: now, updatedAt: now,
  })
  const receipt = await issueReceipt(id, { at: now, ownerId: c.viewer.id })
  await log(c, 'project_payment_recorded', { id, invoice: c.i.id, stage: c.i.stageName, title: c.i.number ?? '', to: money2(settles), method: o.method, receipt })
  const held = extra > 0 ? await holdOverpayment(c, { paymentId: id, invoiceId: c.i.id, invoiceLabel: labelOf(c.i), extraMinor: extra, paidMinor: amount, owedMinor: owed, at: now }) : null
  await tellReceipt(id)   // (gaps build H, H-Q17) a payment the studio records counts at once — its receipt reaches the client
  touch(c)
  const after = await invoiceAfter(c.p, c.i.id)
  return { paymentId: id, receipt, state: after?.state ?? 'sent', balanceMinor: after?.balanceMinor ?? 0, credit: held ? { number: held.number, amountMinor: extra } : null }
}
/** A recorded payment's Undo, right after it: the payment, its receipt (its number given back when it was the newest), its files and its line go. */
export async function undoRecordPayment(paymentId: string): Promise<{ ok: true } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forPayment(paymentId); if (isRefusal(c)) return c
  if (!recordsPayments(c.viewer, c.team)) return { error: RECORD_RULE }
  if (c.pay.source !== 'studio' || c.pay.status !== 'confirmed') return { error: 'Only a payment just recorded is taken back — reverse it instead' }
  if (Date.now() - c.pay.createdAt.getTime() > 10 * 60_000) return { error: 'It was recorded a while ago — an Owner or an Admin reverses it instead' }
  /* (pending modules S07) its overpayment's credit goes with it — unless some of it was used or refunded since (the payment is reversed then) */
  const held = await heldCreditOfPayment(c.pay.id)
  if (held && (await creditTaken(c, held.id))) return { error: `Its extra is credit note ${held.number}, and some of it was used or refunded since — reverse the payment instead` }
  if (held) await dropHeldCredit(held, c.p.leadId)
  await withdrawReceipt(c.pay.id)
  if (c.pay.proofFileId) await db.delete(leadFiles).where(eq(leadFiles.id, c.pay.proofFileId))
  await db.delete(leadEvents).where(and(eq(leadEvents.projectId, c.p.id), eq(leadEvents.kind, 'project_payment_recorded'), sql`json_extract(${leadEvents.detail}, '$.id') = ${c.pay.id}`))
  await db.delete(projectPayments).where(eq(projectPayments.id, c.pay.id))
  touch(c)
  return { ok: true }
}

/* ── A client's payment: Confirm · Not received (Q-48) ─────────────────────────────────────────────────────────────────────── */

export async function confirmPayment(paymentId: string): Promise<{ receipt: string | null; credit?: { number: string; amountMinor: number } | null } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forPayment(paymentId); if (isRefusal(c)) return c
  const confirmers = await confirmerIdsFor(c.p.leadId)
  if (!confirmsPayments(c.viewer, confirmers)) return { error: CONFIRM_RULE }
  if (c.pay.status === 'confirmed') return { receipt: c.pay.receiptNumber }
  if (c.pay.status !== 'to_confirm') return { error: c.pay.status === 'reversed' ? 'This payment was reversed' : 'This payment was marked not received' }
  /* (pending modules S07 — D-14) more than is owed now (another payment or a credit note came since the client sent it): what is owed settles
     the invoice and the extra becomes their credit, as the studio's own record does; nothing owed at all is still refused */
  const owed = await owedOn(c.i, c.pay.id)
  if (!c.pay.trusted && owed <= 0) return { error: 'Nothing is owed on the invoice any more — mark it not received' }
  const extra = c.pay.trusted ? 0 : overpaidBy(c.pay.amountMinor, owed)
  const now = new Date()
  const r = await db.update(projectPayments).set({ status: 'confirmed', confirmedBy: c.viewer.id, confirmedAt: now, updatedAt: now, ...(extra ? { amountMinor: c.pay.amountMinor - extra } : {}) }).where(and(eq(projectPayments.id, c.pay.id), eq(projectPayments.status, 'to_confirm')))
  if (!r.rowsAffected) return { error: 'Someone answered this payment a moment ago' }
  const receipt = await issueReceipt(c.pay.id, { at: now, ownerId: c.viewer.id })
  await log(c, 'project_payment_confirmed', { id: c.pay.id, invoice: c.i.id, stage: c.i.stageName, title: c.i.number ?? '', to: money2(c.pay.amountMinor - extra), receipt, trusted: c.pay.trusted })
  const held = extra ? await holdOverpayment(c, { paymentId: c.pay.id, invoiceId: c.i.id, invoiceLabel: labelOf(c.i), extraMinor: extra, paidMinor: c.pay.amountMinor, owedMinor: owed, at: now }) : null
  await tellReceipt(c.pay.id)   // (gaps build H, H-Q17)
  await db.delete(notifications).where(and(eq(notifications.kind, 'payment_to_confirm'), eq(notifications.href, moneyHref(c.p.id, c.pay.id))))
  await notify('payment_confirmed', await leadMemberIds(c.p.leadId), { title: `${c.client}’s payment of ${money2(c.pay.amountMinor)} is confirmed`, body: `${c.i.stageName} · ${receipt ?? c.i.number ?? ''} — ${c.p.name}${held ? ` · ${money2(extra)} kept as credit ${held.number}` : ''}`, href: moneyHref(c.p.id, c.pay.id), leadId: c.p.leadId, actorId: c.viewer.id })
  touch(c)
  return { receipt, credit: held ? { number: held.number, amountMinor: extra } : null }
}
/** A confirmation's Undo: back to To confirm, its receipt and its line taken back, the team's rows gone. */
export async function undoConfirmPayment(paymentId: string): Promise<{ ok: true } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forPayment(paymentId); if (isRefusal(c)) return c
  if (!confirmsPayments(c.viewer, await confirmerIdsFor(c.p.leadId))) return { error: CONFIRM_RULE }
  if (c.pay.source !== 'client' || c.pay.status !== 'confirmed') return { ok: true }
  /* (pending modules S07) the extra the confirmation kept as credit goes back into the client's payment as they sent it */
  const held = await heldCreditOfPayment(c.pay.id)
  if (held && (await creditTaken(c, held.id))) return { error: `Its extra is credit note ${held.number}, and some of it was used or refunded since — it stays confirmed` }
  if (held) await dropHeldCredit(held, c.p.leadId)
  await withdrawReceipt(c.pay.id)
  await db.update(projectPayments).set({ status: 'to_confirm', confirmedBy: null, confirmedAt: null, updatedAt: new Date(), ...(held ? { amountMinor: c.pay.amountMinor + held.amountMinor } : {}) }).where(eq(projectPayments.id, c.pay.id))
  await db.delete(leadEvents).where(and(eq(leadEvents.projectId, c.p.id), eq(leadEvents.kind, 'project_payment_confirmed'), sql`json_extract(${leadEvents.detail}, '$.id') = ${c.pay.id}`))
  await db.delete(notifications).where(and(eq(notifications.kind, 'payment_confirmed'), eq(notifications.href, moneyHref(c.p.id, c.pay.id))))
  await askConfirmersAgain(c)   // (fix-D, D-13) the payment waits again — so does the confirmer's prompt
  touch(c)
  return { ok: true }
}
/** (fix-D, D-13) A client's payment back to To confirm (an Undo): the confirmers' bell row that the answer took away is raised again. */
async function askConfirmersAgain(c: PayCtx) {
  const rules = await fetchPaymentRules()
  const who = (await homeownerName(c.pay.submittedBy)) ?? c.client
  await notify('payment_to_confirm', [...new Set([...await confirmerIdsFor(c.p.leadId, rules), ...await bookkeeperIds()])], {   // (parity map, MI-007) and Accounting
    title: `${who} says they paid ${money2(c.pay.amountMinor)}`, body: `${c.i.stageName} · ${c.i.number ?? ''}${c.pay.trusted ? ' — it counts at once; check it arrived' : ' — check it arrived and confirm'}`,
    href: moneyHref(c.p.id, c.pay.id), leadId: c.p.leadId, actorId: null,
  })
}

/** Not received — the money isn't in the bank: the payment is refused with a reason the client reads on their page; a trusted proof stops
    counting (1.0's "the cascade reverses", M-256). */
export async function markNotReceived(paymentId: string, o: { reason: string }): Promise<{ ok: true } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forPayment(paymentId); if (isRefusal(c)) return c
  if (!confirmsPayments(c.viewer, await confirmerIdsFor(c.p.leadId))) return { error: CONFIRM_RULE }
  if (c.pay.status !== 'to_confirm') return { error: c.pay.status === 'confirmed' ? 'It is confirmed — an Owner or an Admin reverses it instead' : 'This payment was answered already' }
  const reason = clean(o?.reason, REASON_MAX)
  if (!reason) return { error: `Say why — ${c.client.split(/\s+/)[0]} reads it` }
  const now = new Date()
  const r = await db.update(projectPayments).set({ status: 'not_received', rejectedBy: c.viewer.id, rejectedAt: now, rejectReason: reason, updatedAt: now }).where(and(eq(projectPayments.id, c.pay.id), eq(projectPayments.status, 'to_confirm')))
  if (!r.rowsAffected) return { error: 'Someone answered this payment a moment ago' }
  await log(c, 'project_payment_not_received', { id: c.pay.id, invoice: c.i.id, stage: c.i.stageName, title: c.i.number ?? '', to: money2(c.pay.amountMinor), reason })
  await db.delete(notifications).where(and(eq(notifications.kind, 'payment_to_confirm'), eq(notifications.href, moneyHref(c.p.id, c.pay.id))))
  await notify('payment_not_received', await leadMemberIds(c.p.leadId), { title: `${c.client}’s payment of ${money2(c.pay.amountMinor)} was not received`, body: `${c.i.stageName} — “${reason}”`, href: moneyHref(c.p.id, c.pay.id), leadId: c.p.leadId, actorId: c.viewer.id })
  touch(c)
  return { ok: true }
}
export async function undoNotReceived(paymentId: string): Promise<{ ok: true } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forPayment(paymentId); if (isRefusal(c)) return c
  if (!confirmsPayments(c.viewer, await confirmerIdsFor(c.p.leadId))) return { error: CONFIRM_RULE }
  if (c.pay.status !== 'not_received') return { ok: true }
  /* (fix-D, D-05) an Undo that no longer holds is refused: a proof can't wait again on an invoice that is void since */
  if (c.i.status !== 'sent') return { error: `${c.i.number ?? 'The invoice'} is void since — the payment stays not received` }
  await db.update(projectPayments).set({ status: 'to_confirm', rejectedBy: null, rejectedAt: null, rejectReason: null, updatedAt: new Date() }).where(eq(projectPayments.id, c.pay.id))
  await db.delete(leadEvents).where(and(eq(leadEvents.projectId, c.p.id), eq(leadEvents.kind, 'project_payment_not_received'), sql`json_extract(${leadEvents.detail}, '$.id') = ${c.pay.id}`))
  await db.delete(notifications).where(and(eq(notifications.kind, 'payment_not_received'), eq(notifications.href, moneyHref(c.p.id, c.pay.id))))
  await askConfirmersAgain(c)   // (fix-D, D-13)
  touch(c)
  return { ok: true }
}

/* ── Reverse (F-18: an Owner's or an Admin's, with a reason; the receipt reads Reversed) ─────────────────────────────────────── */

export async function reversePayment(paymentId: string, o: { reason: string }): Promise<{ ok: true } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forPayment(paymentId); if (isRefusal(c)) return c
  if (!reversesPayments(c.viewer.role)) return { error: REVERSE_RULE }
  if (c.pay.status !== 'confirmed') return { error: c.pay.status === 'reversed' ? 'It is reversed already' : 'Only a confirmed payment is reversed' }
  const reason = clean(o?.reason, REASON_MAX)
  if (!reason) return { error: 'Say why it is reversed' }
  /* (pending modules S07 — D-14) the payment's extra, kept as credit, is reversed with it — once nothing of it was used or refunded */
  const held = await heldCreditOfPayment(c.pay.id)
  if (held && held.status === 'issued' && (await creditTaken(c, held.id))) return { error: `Its extra is credit note ${held.number}, and some of it was used or refunded — take that back first` }
  const now = new Date()
  await db.update(projectPayments).set({ status: 'reversed', reversedBy: c.viewer.id, reversedAt: now, reverseReason: reason, updatedAt: now }).where(eq(projectPayments.id, c.pay.id))
  if (held && held.status === 'issued') await db.update(creditNotes).set({ status: 'void', voidReason: `Its payment was reversed — ${reason}`, voidedBy: c.viewer.id, voidedAt: now }).where(eq(creditNotes.id, held.id))
  await markReceiptFile(c.pay.receiptFileId, true)
  await log(c, 'project_payment_reversed', { id: c.pay.id, invoice: c.i.id, stage: c.i.stageName, title: c.i.number ?? '', receipt: c.pay.receiptNumber, to: money2(c.pay.amountMinor), reason })
  await notify('payment_reversed', await leadMemberIds(c.p.leadId), { title: `A payment of ${money2(c.pay.amountMinor)} from ${c.client} was reversed`, body: `${c.i.stageName} · ${c.pay.receiptNumber ?? ''} — “${reason}”`, href: moneyHref(c.p.id, c.pay.id), leadId: c.p.leadId, actorId: c.viewer.id })
  touch(c)
  return { ok: true }
}
export async function undoReversePayment(paymentId: string): Promise<{ ok: true } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forPayment(paymentId); if (isRefusal(c)) return c
  if (!reversesPayments(c.viewer.role)) return { error: REVERSE_RULE }
  if (c.pay.status !== 'reversed') return { ok: true }
  /* (fix-D, D-05) an Undo that no longer holds is refused: a payment never counts again against an invoice voided since its reversal */
  if (c.i.status !== 'sent') return { error: `${c.i.number ?? 'The invoice'} is void since — the payment stays reversed` }
  await db.update(projectPayments).set({ status: 'confirmed', reversedBy: null, reversedAt: null, reverseReason: null, updatedAt: new Date() }).where(eq(projectPayments.id, c.pay.id))
  /* (pending modules S07) its credit, made void by the reversal, holds again */
  const held = await heldCreditOfPayment(c.pay.id)
  if (held && held.status === 'void' && (held.voidReason ?? '').startsWith('Its payment was reversed')) await db.update(creditNotes).set({ status: 'issued', voidReason: null, voidedBy: null, voidedAt: null }).where(eq(creditNotes.id, held.id))
  await markReceiptFile(c.pay.receiptFileId, false)
  await db.delete(leadEvents).where(and(eq(leadEvents.projectId, c.p.id), eq(leadEvents.kind, 'project_payment_reversed'), sql`json_extract(${leadEvents.detail}, '$.id') = ${c.pay.id}`))
  await db.delete(notifications).where(and(eq(notifications.kind, 'payment_reversed'), eq(notifications.href, moneyHref(c.p.id, c.pay.id))))
  touch(c)
  return { ok: true }
}

/* ── A client's credit used on a later invoice (pending modules S07 — the projects card's D-14, as recommended) ──────────────────── */

/** Whether any of an overpayment's credit was used on an invoice (a payment from it that counts) or refunded. */
async function creditTaken(c: { p: { id: string } }, creditId: string): Promise<boolean> {
  const [cn] = await db.select({ refund: creditNotes.refundMinor }).from(creditNotes).where(eq(creditNotes.id, creditId)).limit(1)
  if (cn?.refund) return true
  const [used] = await db.select({ id: projectPayments.id }).from(projectPayments).where(and(eq(projectPayments.projectId, c.p.id), eq(projectPayments.creditNoteId, creditId), eq(projectPayments.status, 'confirmed'))).limit(1)
  return !!used
}
export type ApplyCreditAnswer = { paymentId: string; receipt: string | null; amountMinor: number; leftMinor: number; state: string; balanceMinor: number }
/**
 * Take a client's credit off a sent invoice: a payment FROM the credit note (method `credit`), confirmed at once with its receipt — what is left
 * of the credit, never more than the invoice still owes. The project's team, Owners, Admins and Accounting record it (a payment's rule).
 */
export async function applyCredit(creditId: string, invoiceId: string): Promise<ApplyCreditAnswer | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forInvoice(invoiceId); if (isRefusal(c)) return c
  if (!recordsPayments(c.viewer, c.team)) return { error: RECORD_RULE }
  if (c.i.status !== 'sent') return { error: 'A credit goes on a sent invoice — send it first' }
  const [cn] = await db.select().from(creditNotes).where(and(eq(creditNotes.id, typeof creditId === 'string' ? creditId : ''), eq(creditNotes.projectId, c.p.id))).limit(1)
  if (!cn || cn.kind !== 'overpayment') return { error: 'This credit is not there any more' }
  if (cn.status !== 'issued') return { error: `${cn.number} is void` }
  const held = heldNow(await moneySummaryOf(c.p), cn.id)
  if (held <= 0) return { error: OVERPAY_USED_RULE }
  const owed = await owedOn(c.i)
  const amount = usableOn(held, owed)
  if (amount <= 0) return { error: `Nothing is owed on ${labelOf(c.i)}` }
  const now = new Date()
  const id = randomUUID()
  const today = dayStart(now.getTime())
  await db.insert(projectPayments).values({
    id, projectId: c.p.id, invoiceId: c.i.id, amountMinor: amount, paidOn: today, method: CREDIT_METHOD, reference: cn.number, note: null, proofFileId: null,
    source: 'studio', status: 'confirmed', trusted: false, recordedBy: c.viewer.id, submittedBy: null, confirmedBy: c.viewer.id, confirmedAt: now, createdAt: now, updatedAt: now, creditNoteId: cn.id,
  })
  /* two presses at once never use more than the credit held: the second sees the first and takes its own back (single statements, no transaction) */
  const [{ used } = { used: 0 }] = await db.select({ used: sql<number>`coalesce(sum(${projectPayments.amountMinor}), 0)` }).from(projectPayments).where(and(eq(projectPayments.creditNoteId, cn.id), eq(projectPayments.status, 'confirmed')))
  if (Number(used) + (cn.refundMinor ?? 0) > cn.amountMinor) { await db.delete(projectPayments).where(eq(projectPayments.id, id)); return { error: 'Someone used this credit a moment ago' } }
  const receipt = await issueReceipt(id, { at: now, ownerId: c.viewer.id })
  await log(c, 'project_credit_used', { id: cn.id, number: cn.number, title: labelOf(c.i), invoice: c.i.id, to: money2(amount), payment: id, receipt })
  /* no "your payment is confirmed" message: this is no payment the client made — its receipt, saying the credit paid it, is on their page */
  touch(c)
  const after = await invoiceAfter(c.p, c.i.id)
  return { paymentId: id, receipt, amountMinor: amount, leftMinor: Math.max(0, held - amount), state: after?.state ?? 'sent', balanceMinor: after?.balanceMinor ?? 0 }
}
/** Its Undo, right after: the payment, its receipt and its line go; the credit holds what it held. */
export async function undoApplyCredit(paymentId: string): Promise<{ ok: true } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forPayment(paymentId); if (isRefusal(c)) return c
  if (!recordsPayments(c.viewer, c.team)) return { error: RECORD_RULE }
  if (!c.pay.creditNoteId || c.pay.status !== 'confirmed') return { ok: true }
  await withdrawReceipt(c.pay.id)
  await db.delete(leadEvents).where(and(eq(leadEvents.projectId, c.p.id), eq(leadEvents.kind, 'project_credit_used'), sql`json_extract(${leadEvents.detail}, '$.payment') = ${c.pay.id}`))
  await db.delete(projectPayments).where(eq(projectPayments.id, c.pay.id))
  touch(c)
  return { ok: true }
}

/* ── Remind on WhatsApp (F-14: the message is drafted and WhatsApp opens on the press, in the browser; this records it) ────────── */

export async function remindInvoice(invoiceId: string): Promise<{ eventId: string } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forInvoice(invoiceId); if (isRefusal(c)) return c
  if (!recordsPayments(c.viewer, c.team)) return { error: RECORD_RULE }
  if (c.i.status !== 'sent') return { error: 'Only a sent invoice is reminded' }
  const owed = await owedOn(c.i)
  if (owed <= 0) return { error: 'Nothing is owed on it' }
  const eventId = await log(c, 'project_invoice_reminded', { id: c.i.id, stage: c.i.stageName, title: c.i.number ?? '', to: money2(owed), due: c.i.dueAt ? displayDate(c.i.dueAt) : '' })
  /* (parity map, MI-068 — 1.0 escalated from the third logged reminder) the third reminder and it is still owed: Owners and Admins hear it, once
     per invoice — the row now says to call; no ticket (2.0's tickets are the client's) */
  const [{ n } = { n: 0 }] = await db.select({ n: sql<number>`count(*)` }).from(leadEvents)
    .where(and(eq(leadEvents.projectId, c.p.id), eq(leadEvents.kind, 'project_invoice_reminded'), sql`json_extract(${leadEvents.detail}, '$.id') = ${c.i.id}`))
  const late = !!c.i.dueAt && Date.now() >= c.i.dueAt.getTime() + 86_400_000   // past its due day — a reminder before then is a courtesy, never an escalation
  if (late && Number(n) === CALL_AFTER_REMINDERS) {
    const href = moneyHref(c.p.id, c.i.id)
    const [told] = await db.select({ id: notifications.id }).from(notifications).where(and(eq(notifications.kind, 'invoice_reminded'), eq(notifications.href, href))).limit(1)
    const label = c.i.number ?? `the ${c.i.stageName} invoice`
    if (!told) await notify('invoice_reminded', await moneyRunnerIds(), /* (parity map, FB-114) and Accounting */ { title: `${label} is still unpaid after three reminders`, body: `${c.client} · ${money2(owed)} owed — ${c.p.name}. A call may help.`, href, leadId: c.p.leadId, actorId: c.viewer.id, fields: { '{invoice}': label } })   // (invented copy)
  }
  touch(c)
  return { eventId }
}

/* ── Settings › Projects › Payments (Q-48 · F-11 · F-13) ──────────────────────────────────────────────────────────────────── */

export async function setPaymentRules(o: { rules?: Partial<PaymentRules>; numbering?: ProjectNumbering }): Promise<{ rules: PaymentRules; numbering: ProjectNumbering } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const viewer = await fetchViewer()
  if (!runsStudio(viewer.role)) return { error: PAYMENT_SETTINGS_RULE }
  const cur = await fetchPaymentRules()
  const rules = parsePaymentRules({ ...cur, ...(o?.rules ?? {}) })
  if (o?.rules?.confirmer === 'member' && !rules.memberId) return { error: 'Pick the member who confirms' }
  await savePaymentRules(rules)
  let numbering = await fetchReceiptNumbering()
  if (o?.numbering) {
    const prev = numbering
    numbering = parseReceiptNumbering(o.numbering)
    if (numbering.prefix !== prev.prefix && numbering.next === prev.next) numbering = { ...numbering, next: 0 }   // (fix-D, D-31) a new prefix, its own count
    await saveReceiptNumbering(numbering)
  }
  revalidatePath('/settings'); revalidatePath('/projects', 'layout')
  return { rules, numbering }
}

/* ── A pick's variation order (Q-18: a chosen option with a price difference drafts a VO, money part one's variation mode) ─────── */

/**
 * Draft a variation order from a choice's pick: a quote in variation mode on the project (money part one's — VO-n, the signed quote's entity,
 * template and GST), titled after the choice, its one line the pick at its price against the quote (a saving is a line with a minus quantity,
 * as every omission), linked back to the choice. A second press opens the one already drafted. It then follows the variation order's own path
 * (approval, the client's link, the rebalance).
 * (simplify round 2, R2-A) The studio's press: the viewer's gate stays here (they see the project's money and may change it); the drafting is
 * lib/projects/draft-variation.ts `draftVariationForPick`, as this viewer — the client's pick on the portal drafts through it as the project's own
 * member (app/portal/choices-actions.ts), never through this action.
 */
export async function draftVariationFromPick(selectionId: string): Promise<{ id: string; number: string; existing: boolean } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const sid = typeof selectionId === 'string' ? selectionId : ''
  const diff = await pickPriceDifference(sid)
  if (!diff) return { error: NO_PRICE_CHANGE }
  const c = await moneyContext(diff.projectId); if (isRefusal(c)) return c
  if (!mayChangeProject(c.viewer, c.team)) return { error: CHANGE_RULE }
  return draftVariationForPick(sid, { memberId: c.viewer.id })
}
