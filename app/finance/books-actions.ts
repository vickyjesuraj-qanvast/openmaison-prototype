'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { and, eq, inArray, isNull, like } from 'drizzle-orm'
import { db } from '@/lib/db'
import { commissionPayouts, commissionRequests, commissionRules, commissionShares, creditNotes, leadEvents, leadFiles, members, notifications, projectInvoices } from '@/lib/db/schema'
import { fetchViewer } from '@/lib/leads/visibility'
import { runsStudio } from '@/lib/leads/assign-policy'
import { runsMoney } from '@/lib/settings/roles'   // (parity map, MI-007 · FB-114) Accounting issues credit notes and pays commission; the rules stay runsStudio
import { notify } from '@/lib/notifications/emit'
import { money2 } from '@/lib/quotes/math'
import { moneySummaryOf } from '@/lib/projects/money-queries'
import { fileMoneyDoc } from '@/lib/projects/payments'
import { PAY_OUT_METHODS, methodLabel } from '@/lib/finance/model'
import { forCosts, isRefusal, logCost, moneyHref, touchCosts, type Refusal } from '@/lib/finance/server'
import { CREDIT_REASON_MAX, CREDIT_RULE, CREDIT_SENT_RULE, OVERPAY_VOID_RULE, creditGstOf, heldNow } from '@/lib/finance/credit-model'
import { insertNumberedCredit } from '@/lib/finance/credit-hold'   // (pending modules S07) the credit notes' one numbered writer
import { autoPushXero } from '@/lib/finance/xero-server'
import { dropCommissionEvent, fetchCommissions, logCommissionEvent, ruleRecord } from '@/lib/finance/books'
import { studioRunnerIds } from '@/lib/notifications/queries'
import {
  COMMISSION_ANSWER_RULE, COMMISSION_ASK_RULE, COMMISSION_PAY_RULE, COMMISSION_RULE_RULE, isBasis, owedOldestFirst, ruleWords, splitOldestFirst, validRule, type CommissionBasis,
} from '@/lib/finance/commission'

/*
 * (gaps build F2 — the books, F2-Q9) Credit notes on the server. Against a sent invoice only, never more than it has left to credit, the GST split
 * out at the invoice's own rate, numbered when issued (Settings › Finance › Credit notes). Owners and Admins issue, void and record a refund (F-18's
 * rule, as Void). Each step writes its Activity line (a money line), files the note in Files › Payments (the receipts' way — its entry opens the
 * paper) and answers with an Undo. Every refusal is `{ error: <the rule> }`.
 */

const CN_GONE = 'This credit note is not there any more'
const words = (v: string | null | undefined, max: number) => { const t = (v ?? '').trim().replace(/\s+/g, ' ').slice(0, max); return t || null }
const dayOf = (ms: number) => { const d = new Date(ms); return new Date(d.getFullYear(), d.getMonth(), d.getDate()) }

/* (pending modules S07) the numbering read and the numbered insert moved to lib/finance/credit-hold.ts — one writer for both kinds of credit note */
function touch(p: { id: string; leadId: string }) {
  touchCosts(p)
  revalidatePath(`/projects/${p.id}`, 'layout')
}
/** The invoice, after the project's checks, for an Owner or an Admin. */
async function forCreditInvoice(invoiceId: string) {
  const [inv] = await db.select().from(projectInvoices).where(eq(projectInvoices.id, invoiceId)).limit(1)
  if (!inv) return { error: 'This invoice is not there any more' } as Refusal
  const c = await forCosts(inv.projectId); if (isRefusal(c)) return c
  if (!runsMoney(c.viewer.role)) return { error: CREDIT_RULE } as Refusal
  return { ...c, inv }
}
async function forCredit(id: string) {
  const [cn] = await db.select().from(creditNotes).where(eq(creditNotes.id, id)).limit(1)
  if (!cn) return { error: CN_GONE } as Refusal
  const c = await forCreditInvoice(cn.invoiceId); if (isRefusal(c)) return c
  return { ...c, cn }
}

export type CreditInput = { invoiceId: string; amountMinor: number; reason: string }
export type CreditUndo = { id: string; eventId: string | null; fileId: string | null }

/** Issue a credit note against a sent invoice — numbered at once, filed in Files › Payments, the team told, the client's portal shows it. */
export async function issueCreditNote(i: CreditInput): Promise<{ sentence: string; id: string; number: string; undo: CreditUndo } | Refusal> {
  const c = await forCreditInvoice(i?.invoiceId ?? ''); if (isRefusal(c)) return c
  if (c.inv.status !== 'sent') return { error: CREDIT_SENT_RULE }
  const reason = words(i.reason, CREDIT_REASON_MAX)
  if (!reason) return { error: 'Say why it is credited' }
  const amount = Math.round(Number(i.amountMinor))
  if (!(amount > 0)) return { error: 'Enter the amount to credit' }
  const m = await moneySummaryOf(c.p)
  const view = m.invoices.find((x) => x.id === c.inv.id)
  const left = view ? Math.max(0, view.amountMinor - (view.creditedMinor ?? 0)) : 0
  if (amount > left) return { error: left ? `${c.inv.number ?? 'This invoice'} has ${money2(left)} left to credit` : `${c.inv.number ?? 'This invoice'} is credited in full` }
  const gst = creditGstOf(amount, { amountMinor: c.inv.amountMinor, gstMinor: c.inv.gstMinor })
  const now = new Date()
  const id = randomUUID()
  const number = await insertNumberedCredit({ id, projectId: c.p.id, invoiceId: c.inv.id, reason, amountMinor: amount, gstMinor: gst, status: 'issued', issuedBy: c.viewer.id, issuedAt: now, createdAt: now }, now)   // a race took the number — the next one
  const fileId = await fileMoneyDoc(c.p.leadId, c.viewer.id, { number, stage: `Credit note · ${c.inv.number ?? c.inv.stageName}`, at: now })
  await db.update(creditNotes).set({ fileId }).where(eq(creditNotes.id, id))
  const eventId = await logCost(c, 'project_credit_issued', { id, number, title: c.inv.number ?? c.inv.stageName, to: money2(amount), reason }, c.viewer.id)
  await notify('credit_issued', c.team, { title: `Credit note ${number} — ${money2(amount)}`, body: `On ${c.inv.number ?? c.inv.stageName} for ${c.client}: ${reason}`, href: moneyHref(c.p.id, id), leadId: c.p.leadId, actorId: c.viewer.id,
    fields: { credit_note: number, amount: money2(amount), note: reason, lead_name: c.client } })
  touch(c.p)
  await autoPushXero(c.viewer.id)
  return { sentence: `${number} issued — ${money2(amount)} off ${c.inv.number ?? 'the invoice'}`, id, number, undo: { id, eventId, fileId } }
}
/** Undo, right after: the note, its entry in Files, its Activity line and the bell rows it raised go. */
export async function undoIssueCreditNote(u: CreditUndo): Promise<{ ok: true } | Refusal> {
  const c = await forCredit(u?.id ?? ''); if (isRefusal(c)) return c.error === CN_GONE ? { ok: true } : c
  if (c.cn.kind === 'overpayment') return { error: OVERPAY_VOID_RULE }   // (pending modules S07) it goes only with its payment's own Undo
  await db.delete(creditNotes).where(eq(creditNotes.id, c.cn.id))
  if (u.fileId) await db.delete(leadFiles).where(and(eq(leadFiles.id, u.fileId), eq(leadFiles.leadId, c.p.leadId)))
  if (u.eventId) await db.delete(leadEvents).where(and(eq(leadEvents.id, u.eventId), eq(leadEvents.projectId, c.p.id)))
  await db.delete(notifications).where(and(eq(notifications.kind, 'credit_issued'), like(notifications.href, `%${c.cn.id}%`)))
  touch(c.p)
  return { ok: true }
}

async function renameFile(fileId: string | null, voided: boolean) {
  if (!fileId) return
  const [f] = await db.select({ name: leadFiles.name }).from(leadFiles).where(eq(leadFiles.id, fileId)).limit(1)
  if (!f) return
  const plain = f.name.replace(/ \(void\)(\.pdf)$/i, '$1')
  await db.update(leadFiles).set({ name: voided ? plain.replace(/\.pdf$/i, ' (void).pdf') : plain, updatedAt: new Date() }).where(eq(leadFiles.id, fileId))
}

/** Void a credit note with a reason — it stays on the record and counts for nothing; its invoice is owed again. */
export async function voidCreditNote(id: string, o: { reason: string }): Promise<{ sentence: string; undo: { id: string; eventId: string } } | Refusal> {
  const c = await forCredit(id); if (isRefusal(c)) return c
  if (c.cn.kind === 'overpayment') return { error: OVERPAY_VOID_RULE }   // (pending modules S07) the client's money — Undo the payment, reverse it, use it or refund it
  if (c.cn.status === 'void') return { error: `${c.cn.number} is already void` }
  if (c.cn.refundMinor) return { error: 'A refund is recorded on it — take the refund back first' }
  const reason = words(o?.reason, CREDIT_REASON_MAX)
  if (!reason) return { error: 'Say why it is void' }
  const now = new Date()
  await db.update(creditNotes).set({ status: 'void', voidReason: reason, voidedBy: c.viewer.id, voidedAt: now }).where(eq(creditNotes.id, id))
  await renameFile(c.cn.fileId, true)
  const eventId = await logCost(c, 'project_credit_voided', { id, number: c.cn.number, title: c.inv.number ?? c.inv.stageName, reason }, c.viewer.id)
  touch(c.p)
  await autoPushXero(c.viewer.id)
  return { sentence: `${c.cn.number} is void — ${c.inv.number ?? 'the invoice'} is owed its ${money2(c.cn.amountMinor)} again`, undo: { id, eventId } }
}
export async function undoVoidCreditNote(u: { id: string; eventId: string }): Promise<{ ok: true } | Refusal> {
  const c = await forCredit(u?.id ?? ''); if (isRefusal(c)) return c
  if (c.cn.status !== 'void') return { ok: true }
  await db.update(creditNotes).set({ status: 'issued', voidReason: null, voidedBy: null, voidedAt: null }).where(eq(creditNotes.id, c.cn.id))
  await renameFile(c.cn.fileId, false)
  if (u.eventId) await db.delete(leadEvents).where(and(eq(leadEvents.id, u.eventId), eq(leadEvents.projectId, c.p.id)))
  touch(c.p)
  return { ok: true }
}

export type RefundInput = { id: string; amountMinor: number; paidOn: number; method: string; reference: string | null }
/** Record the refund on a credit note — what the client paid beyond what the invoice is left owing, paid back to them. */
export async function recordCreditRefund(i: RefundInput): Promise<{ sentence: string; undo: { id: string; eventId: string } } | Refusal> {
  const c = await forCredit(i?.id ?? ''); if (isRefusal(c)) return c
  if (c.cn.status === 'void') return { error: 'A void credit note takes no refund' }
  if (c.cn.refundMinor) return { error: 'A refund is already recorded on it' }
  const m = await moneySummaryOf(c.p)
  /* (pending modules S07) an overpayment's refund is what is left of it to give back; a credit note's, what was paid beyond its invoice */
  const due = c.cn.kind === 'overpayment' ? heldNow(m, c.cn.id) : m.invoices.find((x) => x.id === c.inv.id)?.refundDueMinor ?? 0
  const amount = Math.round(Number(i.amountMinor))
  if (!(amount > 0)) return { error: 'Enter the amount refunded' }
  if (amount > Math.min(due, c.cn.amountMinor)) return { error: due ? `Up to ${money2(Math.min(due, c.cn.amountMinor))} is owed back on it` : 'Nothing was paid beyond what the invoice is owed — no refund is due' }
  if (!PAY_OUT_METHODS.some((x) => x.value === i.method)) return { error: 'Pick how it was refunded' }
  if (!i.paidOn) return { error: 'Pick the day it was refunded' }
  await db.update(creditNotes).set({ refundMinor: amount, refundedOn: dayOf(i.paidOn), refundMethod: i.method, refundReference: words(i.reference, 60), refundedBy: c.viewer.id }).where(eq(creditNotes.id, c.cn.id))
  const eventId = await logCost(c, 'project_credit_refunded', { id: c.cn.id, number: c.cn.number, title: c.inv.number ?? c.inv.stageName, to: money2(amount), method: methodLabel(i.method) }, c.viewer.id)
  touch(c.p)
  await autoPushXero(c.viewer.id)
  return { sentence: `Refund of ${money2(amount)} recorded on ${c.cn.number}`, undo: { id: c.cn.id, eventId } }
}
export async function undoCreditRefund(u: { id: string; eventId: string }): Promise<{ ok: true } | Refusal> {
  const c = await forCredit(u?.id ?? ''); if (isRefusal(c)) return c
  await db.update(creditNotes).set({ refundMinor: null, refundedOn: null, refundMethod: null, refundReference: null, refundedBy: null }).where(eq(creditNotes.id, c.cn.id))
  if (u.eventId) await db.delete(leadEvents).where(and(eq(leadEvents.id, u.eventId), eq(leadEvents.projectId, c.p.id)))
  touch(c.p)
  return { ok: true }
}

/* (simplify round 2) Credit notes are numbered by Settings › Finance › Document numbers (`setDocumentNumbers`, app/settings/document-numbers-actions.ts);
   the old `setCreditRules` had no caller left and is gone. */

/* ── Commission (F2-Q4…Q8) ─────────────────────────────────────────────────────────────────────────────────────────────────────── */

const today = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()) }
function touchCommission(projectId?: string | null) {
  revalidatePath('/company/finance', 'layout')
  revalidatePath('/settings')
  if (projectId) revalidatePath(`/projects/${projectId}`, 'layout')
}
const memberName = async (id: string) => (await db.select({ name: members.name }).from(members).where(eq(members.id, id)).limit(1))[0]?.name ?? 'A member'

export type RuleInput = { memberId: string | null; projectId: string | null; basis: CommissionBasis; rateBp: number; fixedMinor: number }
export type RuleUndo = { added: string | null; ended: string[]; /** (parity map, FB-057) the Activity line a project's rate wrote */ eventId?: string | null }

/** The rules in force for one scope (studio · a member · a project · a member on a project) — a change ends them from today. */
const sameScope = (memberId: string | null, projectId: string | null) => and(
  memberId ? eq(commissionRules.memberId, memberId) : isNull(commissionRules.memberId),
  projectId ? eq(commissionRules.projectId, projectId) : isNull(commissionRules.projectId),
  isNull(commissionRules.endedAt),
)
async function startRule(i: RuleInput, by: string, requestId: string | null): Promise<RuleUndo> {
  const now = new Date()
  const ended = (await db.select({ id: commissionRules.id }).from(commissionRules).where(sameScope(i.memberId, i.projectId))).map((r) => r.id)
  if (ended.length) await db.update(commissionRules).set({ endedAt: now, endedBy: by }).where(inArray(commissionRules.id, ended))
  const id = randomUUID()
  await db.insert(commissionRules).values({ id, memberId: i.memberId, projectId: i.projectId, basis: i.basis, rateBp: i.basis === 'payments' || i.basis === 'profit' ? Math.round(i.rateBp) : 0,
    fixedMinor: i.basis === 'fixed' ? Math.round(i.fixedMinor) : 0, fromDay: today(), requestId, createdBy: by, createdAt: now })
  return { added: id, ended }
}

/** Set a rule — the studio's, a member's, a project's or a member's on a project. Applies from today; earlier payments keep their rate. */
export async function setCommissionRule(i: RuleInput): Promise<{ sentence: string; undo: RuleUndo } | Refusal> {
  const viewer = await fetchViewer()
  if (!runsStudio(viewer.role)) return { error: COMMISSION_RULE_RULE }
  if (!i || !isBasis(i.basis)) return { error: 'Pick how commission is worked out' }
  if (i.basis === 'none' && (i.memberId || i.projectId)) return { error: 'Remove the rate instead — the next rule up applies' }
  const why = validRule(i); if (why) return { error: why }
  if (i.memberId && !(await db.select({ id: members.id }).from(members).where(eq(members.id, i.memberId)).limit(1)).length) return { error: 'That member is not in the studio' }
  if (i.projectId) { const c = await forCosts(i.projectId); if (isRefusal(c)) return c }
  /* (parity map, FB-057) a rate on a project — its own, or a member's there — is a line on the project's Activity: from → to */
  const was = i.projectId ? (await db.select().from(commissionRules).where(sameScope(i.memberId, i.projectId)).limit(1))[0] : undefined
  const undo: RuleUndo = await startRule(i, viewer.id, null)
  const who = i.memberId ? await memberName(i.memberId) : null
  if (i.projectId) undo.eventId = await logCommissionEvent(i.projectId, 'parity_c_commission_rule', { memberId: i.memberId, title: who, from: was ? ruleWords(ruleRecord(was)) : null, to: ruleWords(i) }, viewer.id)
  touchCommission(i.projectId)
  return { sentence: `${who ? `${who}: ` : ''}${ruleWords(i)} from today`, undo }
}
/** Remove an override (a member's, a project's, a member's on a project) — the next rule up applies from today. */
export async function removeCommissionRule(ruleId: string): Promise<{ sentence: string; undo: RuleUndo } | Refusal> {
  const viewer = await fetchViewer()
  if (!runsStudio(viewer.role)) return { error: COMMISSION_RULE_RULE }
  const [r] = await db.select().from(commissionRules).where(eq(commissionRules.id, ruleId)).limit(1)
  if (!r || r.endedAt) return { error: 'That rate is not in force any more' }
  if (!r.memberId && !r.projectId) return { error: 'The studio’s rule stays — set it to No commission instead' }
  await db.update(commissionRules).set({ endedAt: new Date(), endedBy: viewer.id }).where(eq(commissionRules.id, ruleId))
  /* (parity map, FB-057) a project's rate removed is a line on its Activity */
  const eventId = r.projectId ? await logCommissionEvent(r.projectId, 'parity_c_commission_rule', { memberId: r.memberId, title: r.memberId ? await memberName(r.memberId) : null, from: ruleWords(ruleRecord(r)), to: null, removed: true }, viewer.id) : null
  touchCommission(r.projectId)
  return { sentence: 'Rate removed — the next rule up applies from today', undo: { added: null, ended: [ruleId], eventId } }
}
export async function undoCommissionRule(u: RuleUndo): Promise<{ ok: true } | Refusal> {
  const viewer = await fetchViewer()
  if (!runsStudio(viewer.role)) return { error: COMMISSION_RULE_RULE }
  if (u?.added) await db.delete(commissionRules).where(eq(commissionRules.id, u.added))
  if (u?.ended?.length) await db.update(commissionRules).set({ endedAt: null, endedBy: null }).where(inArray(commissionRules.id, u.ended))
  await dropCommissionEvent(u?.eventId)   // (parity map, FB-057)
  touchCommission()
  return { ok: true }
}

/** A project's shares between its team — always 100% in all (Owners and Admins). An empty list goes back to equal shares. */
export async function setCommissionShares(projectId: string, o: { shares: { memberId: string; shareBp: number }[] }): Promise<{ sentence: string; undo: { projectId: string; before: { memberId: string; shareBp: number }[] } } | Refusal> {
  const c = await forCosts(projectId); if (isRefusal(c)) return c
  if (!runsStudio(c.viewer.role)) return { error: COMMISSION_RULE_RULE }
  const list = (o?.shares ?? []).filter((x) => x.shareBp > 0)
  if (list.some((x) => !c.team.includes(x.memberId))) return { error: 'Shares go to the project’s team only' }
  if (list.length && list.reduce((s, x) => s + Math.round(x.shareBp), 0) !== 10_000) return { error: 'The shares must add up to 100%' }
  const before = (await db.select().from(commissionShares).where(eq(commissionShares.projectId, projectId))).map((x) => ({ memberId: x.memberId, shareBp: x.shareBp }))
  await writeShares(projectId, list, c.viewer.id)
  touchCommission(projectId)
  return { sentence: list.length ? 'Shares saved — the team splits it this way' : 'Back to equal shares', undo: { projectId, before } }
}
async function writeShares(projectId: string, list: { memberId: string; shareBp: number }[], by: string) {
  await db.delete(commissionShares).where(eq(commissionShares.projectId, projectId))
  const now = new Date()
  if (list.length) await db.insert(commissionShares).values(list.map((x) => ({ id: randomUUID(), projectId, memberId: x.memberId, shareBp: Math.round(x.shareBp), updatedBy: by, updatedAt: now })))
}
export async function undoCommissionShares(u: { projectId: string; before: { memberId: string; shareBp: number }[] }): Promise<{ ok: true } | Refusal> {
  const c = await forCosts(u?.projectId ?? ''); if (isRefusal(c)) return c
  if (!runsStudio(c.viewer.role)) return { error: COMMISSION_RULE_RULE }
  await writeShares(u.projectId, u.before ?? [], c.viewer.id)
  touchCommission(u.projectId)
  return { ok: true }
}

/* ── Paying commission (F2-Q6) ─────────────────────────────────────────────────────────────────────────────────────────────────── */

export type PayoutInput = { memberId: string; projectId: string; amountMinor: number; paidOn: number; method: string; reference: string | null; note: string | null }
const COMMISSION_HREF = '/company/finance/commissions'

/** Pay a member commission for a project — never more than they are owed on it. The member is told. */
export async function payCommission(i: PayoutInput): Promise<{ sentence: string; undo: { id: string; eventId: string } } | Refusal> {
  const c = await forCosts(i?.projectId ?? ''); if (isRefusal(c)) return c
  if (!runsMoney(c.viewer.role)) return { error: COMMISSION_PAY_RULE }
  const facts = await fetchCommissions()
  const line = facts.summary.lines.find((l) => l.memberId === i.memberId && l.projectId === i.projectId)
  const owed = line?.owedMinor ?? 0
  const amount = Math.round(Number(i.amountMinor))
  if (!(amount > 0)) return { error: 'Enter the amount paid' }
  if (amount > owed) return { error: owed ? `${await memberName(i.memberId)} is owed ${money2(owed)} on this project` : `${await memberName(i.memberId)} is owed nothing on this project` }
  if (!PAY_OUT_METHODS.some((x) => x.value === i.method)) return { error: 'Pick how it was paid' }
  if (!i.paidOn) return { error: 'Pick the day it was paid' }
  const id = randomUUID(), now = new Date()
  await db.insert(commissionPayouts).values({ id, memberId: i.memberId, projectId: i.projectId, amountMinor: amount, paidOn: dayOf(i.paidOn), method: i.method, reference: words(i.reference, 60), note: words(i.note, 300), createdBy: c.viewer.id, createdAt: now })
  const who = await memberName(i.memberId)
  const eventId = await logCost(c, 'project_commission_paid', { id, memberId: i.memberId, title: who, to: money2(amount), method: methodLabel(i.method) }, c.viewer.id)
  await notify('commission_paid', [i.memberId], { title: `${money2(amount)} commission paid to you`, body: `For ${c.p.name}`, href: COMMISSION_HREF, leadId: c.p.leadId, actorId: c.viewer.id, fields: { amount: money2(amount), lead_name: c.client } })
  touchCommission(i.projectId)
  await autoPushXero(c.viewer.id)
  return { sentence: `${money2(amount)} paid to ${who}`, undo: { id, eventId } }
}
async function forPayout(id: string) {
  const [x] = await db.select().from(commissionPayouts).where(eq(commissionPayouts.id, id)).limit(1)
  if (!x) return { error: 'This payment is not there any more' } as Refusal
  const c = await forCosts(x.projectId); if (isRefusal(c)) return c
  if (!runsMoney(c.viewer.role)) return { error: COMMISSION_PAY_RULE } as Refusal
  return { ...c, x }
}
/** Undo, right after: the payment, its Activity line and the member's bell row go. */
export async function undoCommissionPayout(u: { id: string; eventId: string }): Promise<{ ok: true } | Refusal> {
  const c = await forPayout(u?.id ?? ''); if (isRefusal(c)) return c
  await db.delete(commissionPayouts).where(eq(commissionPayouts.id, c.x.id))
  if (u.eventId) await db.delete(leadEvents).where(and(eq(leadEvents.id, u.eventId), eq(leadEvents.projectId, c.p.id)))
  await db.delete(notifications).where(and(eq(notifications.kind, 'commission_paid'), eq(notifications.memberId, c.x.memberId), eq(notifications.leadId, c.p.leadId), eq(notifications.title, `${money2(c.x.amountMinor)} commission paid to you`)))
  touchCommission(c.p.id)
  return { ok: true }
}
/**
 * (simplify S-12, his "build everything" 2026-10-09) **Pay {member}** — what a member is owed across their projects, in one press: the amount pays
 * their owed lines oldest first (`owedOldestFirst` · `splitOldestFirst`, lib/finance/commission.ts), never more than a line is owed, one payout row
 * per project — each with its Activity line and the member's bell row, as `payCommission` writes them. Every project is checked before anything
 * is written. Undo takes the whole payment back (`undoMemberCommission`).
 */
export type MemberPayoutInput = { memberId: string; amountMinor: number; paidOn: number; method: string; reference: string | null; note: string | null }
export async function payMemberCommission(i: MemberPayoutInput): Promise<{ sentence: string; undo: { items: { id: string; eventId: string }[] } } | Refusal> {
  const viewer = await fetchViewer()
  if (!runsMoney(viewer.role)) return { error: COMMISSION_PAY_RULE }
  const facts = await fetchCommissions()
  const lines = owedOldestFirst(facts.summary.lines, i?.memberId ?? '')
  const owed = lines.reduce((x, l) => x + l.owedMinor, 0)
  const who = await memberName(i?.memberId ?? '')
  const amount = Math.round(Number(i?.amountMinor))
  if (!(amount > 0)) return { error: 'Enter the amount paid' }
  if (amount > owed) return { error: owed ? `${who} is owed ${money2(owed)} in all` : `${who} is owed nothing` }
  if (!PAY_OUT_METHODS.some((x) => x.value === i.method)) return { error: 'Pick how it was paid' }
  if (!i.paidOn) return { error: 'Pick the day it was paid' }
  const parts = splitOldestFirst(lines, amount)
  const ctxs = []
  for (const part of parts) { const c = await forCosts(part.line.projectId); if (isRefusal(c)) return c; ctxs.push({ c, amountMinor: part.amountMinor }) }
  const now = new Date()
  const items: { id: string; eventId: string }[] = []
  for (const { c, amountMinor } of ctxs) {
    const id = randomUUID()
    await db.insert(commissionPayouts).values({ id, memberId: i.memberId, projectId: c.p.id, amountMinor, paidOn: dayOf(i.paidOn), method: i.method, reference: words(i.reference, 60), note: words(i.note, 300), createdBy: c.viewer.id, createdAt: now })
    const eventId = await logCost(c, 'project_commission_paid', { id, memberId: i.memberId, title: who, to: money2(amountMinor), method: methodLabel(i.method) }, c.viewer.id)
    await notify('commission_paid', [i.memberId], { title: `${money2(amountMinor)} commission paid to you`, body: `For ${c.p.name}`, href: COMMISSION_HREF, leadId: c.p.leadId, actorId: c.viewer.id, fields: { amount: money2(amountMinor), lead_name: c.client } })
    items.push({ id, eventId })
    revalidatePath(`/projects/${c.p.id}`, 'layout')
  }
  touchCommission()
  await autoPushXero(viewer.id)
  return { sentence: `${money2(amount)} paid to ${who}${parts.length > 1 ? ` — ${parts.length} projects, oldest first` : ''}`, undo: { items } }
}
/** Pay {member}'s Undo, right after: every payout it wrote, its Activity lines and the member's bell rows go. */
export async function undoMemberCommission(u: { items: { id: string; eventId: string }[] }): Promise<{ ok: true } | Refusal> {
  for (const item of u?.items ?? []) { const r = await undoCommissionPayout(item); if ('error' in r) return r }
  return { ok: true }
}
/** Reverse a payment later, with a reason — it stays on the record and counts for nothing; the commission is owed again. */
export async function reverseCommissionPayout(id: string, o: { reason: string }): Promise<{ sentence: string; undo: { id: string; eventId: string } } | Refusal> {
  const c = await forPayout(id); if (isRefusal(c)) return c
  if (c.x.reversedAt) return { error: 'It is already reversed' }
  const reason = words(o?.reason, 300)
  if (!reason) return { error: 'Say why it is reversed' }
  await db.update(commissionPayouts).set({ reversedAt: new Date(), reversedBy: c.viewer.id, reverseReason: reason }).where(eq(commissionPayouts.id, id))
  const who = await memberName(c.x.memberId)
  const eventId = await logCost(c, 'project_commission_reversed', { id, memberId: c.x.memberId, title: who, to: money2(c.x.amountMinor), reason }, c.viewer.id)
  touchCommission(c.p.id)
  return { sentence: `${money2(c.x.amountMinor)} to ${who} reversed — it is owed again`, undo: { id, eventId } }
}
export async function undoReverseCommissionPayout(u: { id: string; eventId: string }): Promise<{ ok: true } | Refusal> {
  const c = await forPayout(u?.id ?? ''); if (isRefusal(c)) return c
  await db.update(commissionPayouts).set({ reversedAt: null, reversedBy: null, reverseReason: null }).where(eq(commissionPayouts.id, c.x.id))
  if (u.eventId) await db.delete(leadEvents).where(and(eq(leadEvents.id, u.eventId), eq(leadEvents.projectId, c.p.id)))
  touchCommission(c.p.id)
  return { ok: true }
}

/* ── Asking for a different rate (F2-Q7) ───────────────────────────────────────────────────────────────────────────────────────── */

export type AskInput = { projectId: string; basis: CommissionBasis; rateBp: number; fixedMinor: number; reason: string }
/** A member on a project's team asks for another rate on it — one open ask per member and project. Owners and Admins are told. */
export async function askCommissionRate(i: AskInput): Promise<{ sentence: string; id: string } | Refusal> {
  const c = await forCosts(i?.projectId ?? ''); if (isRefusal(c)) return c
  if (!c.team.includes(c.viewer.id)) return { error: COMMISSION_ASK_RULE }
  if (!isBasis(i.basis) || i.basis === 'none') return { error: 'Pick how you would like it worked out' }
  const why = validRule(i); if (why) return { error: why }
  const reason = words(i.reason, 300)
  if (!reason) return { error: 'Say why — the Owner reads it' }
  const open = await db.select({ id: commissionRequests.id }).from(commissionRequests).where(and(eq(commissionRequests.projectId, c.p.id), eq(commissionRequests.memberId, c.viewer.id), eq(commissionRequests.status, 'open'))).limit(1)
  if (open.length) return { error: 'You already have an ask open on this project — withdraw it to ask again' }
  const id = randomUUID()
  await db.insert(commissionRequests).values({ id, projectId: c.p.id, memberId: c.viewer.id, basis: i.basis, rateBp: i.basis === 'fixed' ? 0 : Math.round(i.rateBp), fixedMinor: i.basis === 'fixed' ? Math.round(i.fixedMinor) : 0, reason, status: 'open', createdAt: new Date() })
  const words_ = ruleWords(i)
  await logCommissionEvent(c.p.id, 'parity_c_commission_asked', { memberId: c.viewer.id, title: await memberName(c.viewer.id), to: words_, reason }, c.viewer.id)   // (parity map, FB-057)
  await notify('commission_asked', await studioRunnerIds(), { title: `${await memberName(c.viewer.id)} asks for ${words_}`, body: `On ${c.p.name}: ${reason}`, href: `${COMMISSION_HREF}?open=${id}`, leadId: c.p.leadId, actorId: c.viewer.id, fields: { rate: words_, note: reason, lead_name: c.client } })
  touchCommission(c.p.id)
  return { sentence: 'Asked — an Owner or an Admin answers it', id }
}
export async function withdrawCommissionAsk(id: string): Promise<{ ok: true } | Refusal> {
  const viewer = await fetchViewer()
  const [r] = await db.select().from(commissionRequests).where(eq(commissionRequests.id, id)).limit(1)
  if (!r || r.status !== 'open') return { error: 'That ask is not open any more' }
  if (r.memberId !== viewer.id) return { error: 'Only whoever asked takes it back' }
  await db.update(commissionRequests).set({ status: 'withdrawn', answeredAt: new Date() }).where(eq(commissionRequests.id, id))
  await logCommissionEvent(r.projectId, 'parity_c_commission_withdrawn', { memberId: r.memberId, title: await memberName(r.memberId), to: ruleWords({ basis: isBasis(r.basis) ? r.basis : 'payments', rateBp: r.rateBp, fixedMinor: r.fixedMinor }) }, viewer.id)   // (parity map, FB-057)
  touchCommission(r.projectId)
  return { ok: true }
}
/** Approve (perhaps at another rate) → a rule for that member on that project from today; or decline with a note. The member is told. */
export async function answerCommissionAsk(id: string, o: { approve: boolean; rateBp?: number | null; fixedMinor?: number | null; note: string | null }): Promise<{ sentence: string } | Refusal> {
  const [r] = await db.select().from(commissionRequests).where(eq(commissionRequests.id, id)).limit(1)
  if (!r || r.status !== 'open') return { error: 'That ask is not open any more' }
  const c = await forCosts(r.projectId); if (isRefusal(c)) return c
  if (!runsStudio(c.viewer.role)) return { error: COMMISSION_ANSWER_RULE }
  const note = words(o?.note, 300)
  const basis = isBasis(r.basis) ? r.basis : 'payments'
  const rateBp = o?.rateBp != null ? Math.round(o.rateBp) : r.rateBp
  const fixedMinor = o?.fixedMinor != null ? Math.round(o.fixedMinor) : r.fixedMinor
  if (o?.approve) { const why = validRule({ basis, rateBp, fixedMinor }); if (why) return { error: why } }
  else if (!note) return { error: 'Say why — they read it' }
  const now = new Date()
  if (o?.approve) await startRule({ memberId: r.memberId, projectId: r.projectId, basis, rateBp, fixedMinor }, c.viewer.id, r.id)
  await db.update(commissionRequests).set({ status: o?.approve ? 'approved' : 'declined', answeredBy: c.viewer.id, answeredAt: now, answerNote: note,
    approvedRateBp: o?.approve && rateBp !== r.rateBp ? rateBp : null, approvedFixedMinor: o?.approve && fixedMinor !== r.fixedMinor ? fixedMinor : null }).where(eq(commissionRequests.id, id))
  const w = ruleWords({ basis, rateBp, fixedMinor })
  await logCommissionEvent(r.projectId, 'parity_c_commission_answered', { memberId: r.memberId, title: await memberName(r.memberId), to: w, answer: o?.approve ? 'approved' : 'declined', note }, c.viewer.id)   // (parity map, FB-057)
  await notify('commission_answered', [r.memberId], { title: o?.approve ? `Approved: ${w} on ${c.p.name}` : `Declined: your ask on ${c.p.name}`, body: note, href: `${COMMISSION_HREF}?open=${id}`, leadId: c.p.leadId, actorId: c.viewer.id, fields: { rate: w, note: note ?? '', lead_name: c.client } })
  touchCommission(r.projectId)
  return { sentence: o?.approve ? `Approved — ${await memberName(r.memberId)} earns ${w} on it from today` : 'Declined — they read your note' }
}
