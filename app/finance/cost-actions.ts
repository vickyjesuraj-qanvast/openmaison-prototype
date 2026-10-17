'use server'

import { requirePlan } from '@/lib/credits/plan-gate'
import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { and, eq, inArray, isNull, ne } from 'drizzle-orm'
import { db } from '@/lib/db'
import { costDocuments, expenses, notifications, paymentsOut, projects, purchaseOrders, settings, supplierBills, vendors, type Expense, type SupplierBill } from '@/lib/db/schema'
import { fetchViewer } from '@/lib/leads/visibility'
import { runsStudio } from '@/lib/leads/assign-policy'
import { runsMoney, seesBooks } from '@/lib/settings/roles'   // (parity map, MO-098) Accounting records and corrects the books; approving stays runsStudio
import { notify } from '@/lib/notifications/emit'
import { studioRunnerIds } from '@/lib/notifications/queries'
import { dropLeadEvents } from '@/lib/leads/events'
import { fetchStudio } from '@/lib/settings/queries'
import { displayDate } from '@/lib/format'
import { costsOf, payable } from '@/lib/finance/costs'
import { fetchCostRules, fetchCostRulesStored, fetchExpenseCategories, loadCostRecords } from '@/lib/finance/queries'
import { raiseDueRepeats } from '@/lib/finance/repeats-server'
import { completedBlock } from '@/lib/projects/handover-model'   // (S42 audit C-08)
import { dayOf, firstRepeat, isRepeatEvery, repeatAfter, repeatWords, type RepeatEvery } from '@/lib/finance/repeats'
import { CATEGORIES_MAX, EXPENSE_CATEGORIES_KEY, categoryAllowed, categoryIn, categoryProblem, cleanCategory, parseExpenseCategories } from '@/lib/finance/expense-categories'
import {
  DESCRIPTION_MAX, NOTE_MAX, REASON_MAX, RECEIPTS_MAX, REF_MAX, PAY_OUT_METHODS, gstInside, methodLabel, poState, type BillLine,
} from '@/lib/finance/model'
import {
  BILL_RULE, CATEGORIES_RULE, CLAIM_FOR_RULE, COST_RULES_KEY, REPEAT_RULE, COST_SETTINGS_RULE, EXPENSE_APPROVE_RULE, EXPENSE_CHANGE_RULE, EXPENSE_RULE, OVERHEAD_BILL_RULE, PAY_RULE,
  approvesExpense, changesCostRules, expenseWaits, logsExpense, parseCostRules, paysOut, recordsBill, type CostRules,
  BILL_APPROVE_RULE, BILL_WAITS_RULE, approvesBill, billWaitWhy, billWaitWords, type BillWaitWhy,   // (S44R, C8)
} from '@/lib/finance/rules'
import { docProblem, financeHref, forCosts, isRefusal, keepDoc, logCost, moneyHref, moneyWords, nameOf, touchCosts, type PickedDoc, type ProjectCtx, type Refusal } from '@/lib/finance/server'
import type { Viewer } from '@/lib/leads/assign-policy'
import { todoHref } from '@/lib/finance/sections'

/*
 * (gaps build F1 — F1-Q10 · Q11 · Q12) Supplier bills, expenses and payments out on the server, and Settings › Finance › Costs. A record on a
 * project passes the project's two checks (Who sees leads, then its money — F-17); a record with no project is the studio's overhead (bills:
 * Owners and Admins; expenses: anyone's own). Paying out is the Owners' and Admins' (F-16). Every refusal is `{ error: <the rule> }`, every
 * removal answers with an Undo, and a project's records write their Activity lines.
 */
type Scope = { ctx: ProjectCtx | null; viewer: Viewer }
async function scopeOf(projectId: string | null): Promise<Scope | Refusal> {
  if (!projectId) return { ctx: null, viewer: await fetchViewer() }
  const c = await forCosts(projectId); if (isRefusal(c)) return c
  return { ctx: c, viewer: c.viewer }
}
/** (S42 audit C-08) *(invented copy)* */
const REPEAT_CLOSED_RULE = 'This project is completed — log the expense once; it can’t repeat'
const day = (ms: number | null | undefined) => { if (!ms) return null; const d = new Date(ms); return new Date(d.getFullYear(), d.getMonth(), d.getDate()) }
const words = (v: string | null | undefined, max: number) => { const t = (v ?? '').trim().replace(/\s+/g, ' ').slice(0, max); return t || null }

/* ── Supplier bills (F1-Q10) ──────────────────────────────────────────────────────────────────────────────────────────────────── */

export type BillInput = {
  id?: string | null; projectId: string | null; vendorId: string; poId: string | null; reference: string; issuedOn: number; dueOn: number | null
  subtotalMinor: number; gstMinor: number; totalMinor: number; lines: BillLine[]; note: string | null
  readFrom: string | null; readFields: string[]; file: PickedDoc | null
  /** (1.0 G-427) Record it although it looks like one already recorded. */ force?: boolean
}
const BILL_GONE = 'This bill is not there any more'
async function billChecks(i: BillInput, s: Scope, except?: string): Promise<{ vendor: string } | Refusal | { duplicate: string }> {
  if (!recordsBill(s.viewer, s.ctx ? s.ctx.team : null)) return { error: s.ctx ? BILL_RULE : OVERHEAD_BILL_RULE }
  const [v] = await db.select().from(vendors).where(eq(vendors.id, i.vendorId)).limit(1)
  if (!v || v.mergedInto) return { error: 'Pick the vendor again — that one is not in the directory' }
  const ref = words(i.reference, REF_MAX)
  if (!ref) return { error: 'Enter the bill’s own number' }
  if (!i.issuedOn) return { error: 'Pick the day it was issued' }
  if (i.dueOn && i.dueOn < (day(i.issuedOn)?.getTime() ?? 0)) return { error: 'It can’t be due before it was issued' }
  if (!(i.totalMinor > 0)) return { error: 'Enter the bill’s total' }
  if (i.subtotalMinor < 0 || i.gstMinor < 0) return { error: 'Amounts can’t be below zero' }
  if (Math.abs(i.subtotalMinor + i.gstMinor - i.totalMinor) > 1) return { error: `The subtotal and the GST come to ${moneyWords(i.subtotalMinor + i.gstMinor)}, not the ${moneyWords(i.totalMinor)} total` }
  if (i.poId) {
    const [po] = await db.select().from(purchaseOrders).where(and(eq(purchaseOrders.id, i.poId), isNull(purchaseOrders.deletedAt))).limit(1)
    if (!po || po.projectId !== i.projectId) return { error: 'That PO is not on this project' }
    if (po.vendorId !== i.vendorId) return { error: 'That PO is to another vendor' }
    const st = poState({ status: po.status as 'sent', submittedAt: po.submittedAt?.getTime() ?? null, reviewNote: po.reviewNote, vendorAnswer: po.vendorAnswer as 'accepted' | null }, 0)
    if (st === 'draft' || st === 'awaiting' || st === 'sent_back' || st === 'cancelled') return { error: `${po.number} isn’t with the vendor — a bill goes on a PO that was sent` }
  }
  if (i.file) { const why = docProblem(i.file); if (why) return { error: why } }
  if (!i.force) {
    /* (1.0 G-427) the same vendor and number, or the same vendor and total within 30 days */
    const same = await db.select().from(supplierBills).where(and(eq(supplierBills.vendorId, i.vendorId), isNull(supplierBills.deletedAt), except ? ne(supplierBills.id, except) : undefined))
    const near = (b: SupplierBill) => Math.abs(b.issuedOn.getTime() - i.issuedOn) <= 30 * 86_400_000
    const twin = same.find((b) => b.reference.trim().toLowerCase() === ref.toLowerCase()) ?? same.find((b) => b.totalMinor === i.totalMinor && near(b))
    if (twin) return { duplicate: `A bill from ${v.name} ${twin.reference.trim().toLowerCase() === ref.toLowerCase() ? `numbered ${twin.reference}` : `for ${moneyWords(twin.totalMinor)}`} is recorded already (${displayDate(twin.issuedOn)}). Record this one anyway?` }
  }
  return { vendor: v.name }
}
const billCols = (i: BillInput) => ({
  projectId: i.projectId, vendorId: i.vendorId, poId: i.poId, reference: words(i.reference, REF_MAX)!, issuedOn: day(i.issuedOn)!, dueOn: day(i.dueOn),
  subtotalMinor: Math.round(i.subtotalMinor), gstMinor: Math.round(i.gstMinor), totalMinor: Math.round(i.totalMinor),
  linesJson: i.lines.length ? JSON.stringify(i.lines.slice(0, 60).map((l, k) => ({ id: l.id || `l${k}`, description: (l.description ?? '').slice(0, DESCRIPTION_MAX), qty: Number(l.qty) || 0, unitMinor: Math.round(Number(l.unitMinor) || 0) }))) : null,
  note: words(i.note, NOTE_MAX), readFrom: words(i.readFrom, 160), readFields: i.readFields.length ? JSON.stringify(i.readFields.slice(0, 20)) : null,
})
/* ── (S44R — UAT row 361, call C8, as recommended — her UAT ask 2026-10-15; REVERSES F1-Q10 "bills: no approval") A bill's OK ──────────────
   A bill recorded or changed by someone who approves nothing waits for an Owner's or an Admin's OK when it is over the PO approval limit on no PO,
   or takes its PO's bills over the PO by more than the studio's tolerance (lib/finance/rules.ts `billWaitWhy`). The approvers hear it in their
   bell and find it in Finance › To do › To approve; nobody pays it until it is approved (`recordPayout`). */
type BillWait = { why: BillWaitWhy; words: string; po: { number: string; totalMinor: number; billedMinor: number } | null }
async function billWaitFor(viewer: Pick<Viewer, 'role'>, i: Pick<BillInput, 'poId' | 'totalMinor'>, except?: string): Promise<BillWait | null> {
  const rules = await fetchCostRules()
  let po: BillWait['po'] = null
  if (i.poId) {
    const [o] = await db.select({ number: purchaseOrders.number, total: purchaseOrders.totalMinor }).from(purchaseOrders).where(eq(purchaseOrders.id, i.poId)).limit(1)
    const others = (await db.select({ t: supplierBills.totalMinor }).from(supplierBills).where(and(eq(supplierBills.poId, i.poId), isNull(supplierBills.deletedAt), except ? ne(supplierBills.id, except) : undefined))).reduce((x, r) => x + r.t, 0)
    po = { number: o?.number ?? 'its PO', totalMinor: o?.total ?? 0, billedMinor: others + Math.round(i.totalMinor) }
  }
  const why = billWaitWhy(viewer, rules, { totalMinor: Math.round(i.totalMinor) }, po ? { totalMinor: po.totalMinor, otherBilledMinor: po.billedMinor - Math.round(i.totalMinor) } : null)
  return why ? { why, words: billWaitWords(why, { limitMinor: rules.poLimitMinor, po }, moneyWords), po } : null
}
/** The approvers hear that a bill waits for them — To do opens on it. */
async function askBillApproval(s: Scope, billId: string, reference: string, vendor: string, totalMinor: number, wait: BillWait, o: { recorder?: string | null } = {}) {
  /* the approvers hear it from whoever recorded it — an approval undone puts every approver's row back, the one who undid it too */
  const actor = o.recorder !== undefined ? o.recorder : s.viewer.id
  const runners = (await studioRunnerIds()).filter((id) => id !== actor)
  await notify('bill_review', runners, { title: `${vendor}’s bill ${reference} needs your OK before it is paid`, body: `${moneyWords(totalMinor)} · ${wait.words}${s.ctx ? ` · ${s.ctx.p.name}` : ''}`, href: todoHref(billId), leadId: s.ctx?.p.leadId ?? null, actorId: actor,
    fields: { '{bill}': reference, '{vendor}': vendor, '{amount}': moneyWords(totalMinor), '{note}': wait.words } })
}
/** Record a supplier bill — on a project, or the studio's overhead; its file kept beside it. A likely duplicate asks first (`duplicate`).
    (S44R, C8) `waits` = it waits for an Owner's or an Admin's OK before it is paid — with the reason in words. */
export async function recordBill(i: BillInput): Promise<{ id: string; waits?: string } | { duplicate: string } | Refusal> {
  const s = await scopeOf(i.projectId); if (isRefusal(s)) return s
  const ok = await billChecks(i, s); if (isRefusal(ok) || 'duplicate' in ok) return ok
  const id = randomUUID(), now = new Date()
  const wait = await billWaitFor(s.viewer, i)   // (S44R, C8)
  await db.transaction(async (tx) => {
    await tx.insert(supplierBills).values({ id, ...billCols(i), createdBy: s.viewer.id, createdAt: now, updatedBy: s.viewer.id, updatedAt: now, approvalWhy: wait?.why ?? null })
    if (i.file) await keepDoc(tx, 'bill', id, i.file, s.viewer.id)
  })
  if (s.ctx) {
    const po = i.poId ? (await db.select({ n: purchaseOrders.number }).from(purchaseOrders).where(eq(purchaseOrders.id, i.poId)).limit(1))[0]?.n ?? null : null
    await logCost(s.ctx, 'project_bill_recorded', { id, title: words(i.reference, REF_MAX)!, vendor: ok.vendor, to: moneyWords(i.totalMinor), po, due: i.dueOn ? displayDate(new Date(i.dueOn)) : undefined, ...(wait ? { waits: wait.words } : {}) })
  }
  if (wait) await askBillApproval(s, id, words(i.reference, REF_MAX)!, ok.vendor, Math.round(i.totalMinor), wait)
  touchCosts(s.ctx?.p)
  return { id, ...(wait ? { waits: wait.words } : {}) }
}
async function forBill(id: string): Promise<{ b: SupplierBill; s: Scope; paid: number } | Refusal> {
  const [b] = await db.select().from(supplierBills).where(and(eq(supplierBills.id, id), isNull(supplierBills.deletedAt))).limit(1)
  if (!b) return { error: BILL_GONE }
  const s = await scopeOf(b.projectId); if (isRefusal(s)) return s
  if (!b.projectId && !runsMoney(s.viewer.role)) return { error: OVERHEAD_BILL_RULE }
  const paid = (await db.select({ a: paymentsOut.amountMinor }).from(paymentsOut).where(and(eq(paymentsOut.billId, id), isNull(paymentsOut.reversedAt)))).reduce((x, r) => x + r.a, 0)
  return { b, s, paid }
}
/** Change a bill while nothing is paid on it — its maker, or an Owner or an Admin. (S44R, C8) A change that leaves its total and its PO as they
    were keeps its OK; any other is read again: it may now wait (its OK goes), or no longer wait. An Owner's or an Admin's change needs no OK. */
export async function updateBill(i: BillInput & { id: string }): Promise<{ id: string; waits?: string } | { duplicate: string } | Refusal> {
  const f = await forBill(i.id); if (isRefusal(f)) return f
  if (f.paid > 0) return { error: 'Something is paid on it — reverse the payment first' }
  if (f.b.createdBy !== f.s.viewer.id && !runsMoney(f.s.viewer.role)) return { error: 'Only whoever recorded it, an Owner, an Admin or Accounting changes a bill' }
  if (i.projectId !== f.b.projectId) return { error: 'A bill stays on its project — remove it and record it on the other' }
  const ok = await billChecks(i, f.s, i.id); if (isRefusal(ok) || 'duplicate' in ok) return ok
  const same = Math.round(i.totalMinor) === f.b.totalMinor && (i.poId ?? null) === (f.b.poId ?? null)
  const wait = same && (f.b.approvedAt || !f.b.approvalWhy) ? null : await billWaitFor(f.s.viewer, i, i.id)
  const approval = same ? {} : { approvalWhy: wait?.why ?? null, approvedBy: null, approvedAt: null }
  await db.transaction(async (tx) => {
    await tx.update(supplierBills).set({ ...billCols(i), updatedBy: f.s.viewer.id, updatedAt: new Date(), ...approval }).where(eq(supplierBills.id, i.id))
    if (i.file) { await tx.delete(costDocuments).where(and(eq(costDocuments.recordKind, 'bill'), eq(costDocuments.recordId, i.id))); await keepDoc(tx, 'bill', i.id, i.file, f.s.viewer.id) }
  })
  if (f.s.ctx) await logCost(f.s.ctx, 'project_bill_edited', { id: i.id, title: words(i.reference, REF_MAX)!, vendor: ok.vendor, from: moneyWords(f.b.totalMinor), to: moneyWords(i.totalMinor), ...(wait ? { waits: wait.words } : {}) })
  if (wait && !(f.b.approvalWhy && !f.b.approvedAt)) await askBillApproval(f.s, i.id, words(i.reference, REF_MAX)!, ok.vendor, Math.round(i.totalMinor), wait)   // newly waiting: the approvers hear it once
  touchCosts(f.s.ctx?.p)
  const stillWaits = same ? (f.b.approvalWhy && !f.b.approvedAt ? (await billWaitFor({ role: 'Designer' }, { poId: f.b.poId, totalMinor: f.b.totalMinor }, i.id))?.words : undefined) : wait?.words
  return { id: i.id, ...(stillWaits ? { waits: stillWaits } : {}) }
}

export type BillApprovalUndo = { billId: string; eventId: string | null }
/** (S44R, C8) An Owner or an Admin approves a bill that waits — it can be paid from then on; whoever recorded it hears it. Undo while nothing is paid. */
export async function approveBill(id: string): Promise<{ ok: true; undo: BillApprovalUndo; reference: string } | Refusal> {
  const f = await forBill(id); if (isRefusal(f)) return f
  if (!approvesBill(f.s.viewer.role)) return { error: BILL_APPROVE_RULE }
  if (!f.b.approvalWhy || f.b.approvedAt || f.paid > 0) return { error: f.b.approvedAt ? 'It is approved already' : 'It doesn’t wait for approval' }
  await db.update(supplierBills).set({ approvedBy: f.s.viewer.id, approvedAt: new Date() }).where(eq(supplierBills.id, id))
  const vendor = (await db.select({ n: vendors.name }).from(vendors).where(eq(vendors.id, f.b.vendorId)).limit(1))[0]?.n ?? 'The vendor'
  const eventId = f.s.ctx ? await logCost(f.s.ctx, 'project_bill_approved', { id, title: f.b.reference, vendor, to: moneyWords(f.b.totalMinor) }) : null
  /* the approvers' rows for it are answered; whoever recorded it hears the OK (never the approver themself) */
  await db.delete(notifications).where(and(eq(notifications.kind, 'bill_review'), eq(notifications.href, todoHref(id))))
  if (f.b.createdBy && f.b.createdBy !== f.s.viewer.id) await notify('bill_approved', [f.b.createdBy], { title: `${vendor}’s bill ${f.b.reference} is approved — it can be paid`, body: moneyWords(f.b.totalMinor), href: f.s.ctx ? moneyHref(f.s.ctx.p.id, id) : financeHref('bills', id), leadId: f.s.ctx?.p.leadId ?? null, fields: { '{bill}': f.b.reference, '{vendor}': vendor, '{amount}': moneyWords(f.b.totalMinor) } })
  touchCosts(f.s.ctx?.p)
  return { ok: true, undo: { billId: id, eventId }, reference: f.b.reference }
}
/** The approval's Undo — the bill waits again (and its approvers' rows come back), only while nothing is paid on it. */
export async function undoBillApproval(u: BillApprovalUndo): Promise<{ ok: true } | Refusal> {
  const f = await forBill(u.billId); if (isRefusal(f)) return f
  if (!approvesBill(f.s.viewer.role)) return { error: BILL_APPROVE_RULE }
  if (f.paid > 0) return { error: 'Something is paid on it — reverse the payment first' }
  if (!f.b.approvedAt) return { ok: true }
  await db.update(supplierBills).set({ approvedBy: null, approvedAt: null }).where(eq(supplierBills.id, u.billId))
  if (u.eventId) await dropLeadEvents([u.eventId])
  await db.delete(notifications).where(and(eq(notifications.kind, 'bill_approved'), eq(notifications.href, f.s.ctx ? moneyHref(f.s.ctx.p.id, u.billId) : financeHref('bills', u.billId))))
  const vendor = (await db.select({ n: vendors.name }).from(vendors).where(eq(vendors.id, f.b.vendorId)).limit(1))[0]?.n ?? 'The vendor'
  const wait = f.b.approvalWhy === 'limit' || f.b.approvalWhy === 'differs' ? await billWaitFor({ role: 'Designer' }, { poId: f.b.poId, totalMinor: f.b.totalMinor }, f.b.id) : null
  await askBillApproval(f.s, f.b.id, f.b.reference, vendor, f.b.totalMinor, wait ?? { why: f.b.approvalWhy === 'differs' ? 'differs' : 'limit', words: 'It waits for approval again', po: null }, { recorder: f.b.createdBy ?? null })
  touchCosts(f.s.ctx?.p)
  return { ok: true }
}
/** Remove a bill nothing is paid on — with Undo. */
export async function removeBill(id: string): Promise<{ ok: true; undo: { billId: string; eventId: string | null } } | Refusal> {
  const f = await forBill(id); if (isRefusal(f)) return f
  if (f.paid > 0) return { error: 'Something is paid on it — reverse the payment first' }
  if (f.b.createdBy !== f.s.viewer.id && !runsMoney(f.s.viewer.role)) return { error: 'Only whoever recorded it, an Owner, an Admin or Accounting removes a bill' }
  await db.update(supplierBills).set({ deletedAt: new Date(), deletedBy: f.s.viewer.id }).where(eq(supplierBills.id, id))
  const vendor = (await db.select({ n: vendors.name }).from(vendors).where(eq(vendors.id, f.b.vendorId)).limit(1))[0]?.n ?? ''
  const eventId = f.s.ctx ? await logCost(f.s.ctx, 'project_bill_removed', { id, title: f.b.reference, vendor, to: moneyWords(f.b.totalMinor) }) : null
  touchCosts(f.s.ctx?.p)
  return { ok: true, undo: { billId: id, eventId } }
}
export async function undoRemoveBill(u: { billId: string; eventId: string | null }): Promise<{ ok: true } | Refusal> {
  const [b] = await db.select().from(supplierBills).where(eq(supplierBills.id, u.billId)).limit(1)
  if (!b || !b.deletedAt) return { error: BILL_GONE }
  const s = await scopeOf(b.projectId); if (isRefusal(s)) return s
  if (b.createdBy !== s.viewer.id && !runsMoney(s.viewer.role)) return { error: BILL_RULE }
  await db.update(supplierBills).set({ deletedAt: null, deletedBy: null }).where(eq(supplierBills.id, u.billId))
  if (u.eventId) await dropLeadEvents([u.eventId])
  touchCosts(s.ctx?.p)
  return { ok: true }
}

/* ── Expenses (F1-Q11) ────────────────────────────────────────────────────────────────────────────────────────────────────────── */

export type ExpenseInput = {
  id?: string | null; projectId: string | null; vendorId: string | null; category: string; description: string; amountMinor: number; includesGst: boolean; spentOn: number
  paidBy: 'studio' | 'member'; claimantId: string | null; note: string | null
  /** the receipts kept from before (their ids), and new ones */ keep: string[]; add: PickedDoc[]
  /** (parity map, MO-058) the issuing entity it is recorded under — offered only with two or more; null = the project's (or the studio's own) */
  issuingEntity?: string | null
  /** (pending modules S06) how often it repeats — for its whole series (the rule lives on the first one); null stops it; left out = unchanged */
  repeat?: RepeatEvery | null
}
const EXPENSE_GONE = 'This expense is not there any more'
async function forExpense(id: string): Promise<{ e: Expense; s: Scope; paidBack: number } | Refusal> {
  const [e] = await db.select().from(expenses).where(and(eq(expenses.id, id), isNull(expenses.deletedAt))).limit(1)
  if (!e) return { error: EXPENSE_GONE }
  const s = await scopeOf(e.projectId); if (isRefusal(s)) return s
  const mine = e.createdBy === s.viewer.id || e.claimantId === s.viewer.id
  if (!e.projectId && !mine && !seesBooks(s.viewer.role)) return { error: EXPENSE_GONE }
  const paidBack = (await db.select({ a: paymentsOut.amountMinor }).from(paymentsOut).where(and(eq(paymentsOut.expenseId, id), isNull(paymentsOut.reversedAt)))).reduce((x, r) => x + r.a, 0)
  return { e, s, paidBack }
}
/** Log or change an expense. A Designer's or a Manager's waits for an Owner or an Admin while the rule is on (the bell tells them); a change to
    one that was sent back sends it again. */
export async function saveExpense(i: ExpenseInput): Promise<{ id: string; waits: boolean; repeat: RepeatSaved | null } | Refusal> {
  { const lock = await requirePlan('expense_management'); if (lock) return lock }   // (pending modules S19) expenses are Pro
  await raiseDueRepeats()   // (pending modules S06) a day that came is logged before a change moves the series' rhythm
  const before = i.id ? await forExpense(i.id) : null
  if (before && isRefusal(before)) return before
  const s = before ? before.s : await scopeOf(i.projectId); if (isRefusal(s)) return s
  if (!logsExpense(s.viewer, s.ctx ? s.ctx.team : null)) return { error: EXPENSE_RULE }
  if (before) {
    const e = before.e
    const runner = runsMoney(s.viewer.role)
    if (before.paidBack > 0) return { error: 'It is paid back — reverse the payment first' }
    if (!runner && (e.createdBy !== s.viewer.id || e.status === 'approved')) return { error: EXPENSE_CHANGE_RULE }
    if (i.projectId !== e.projectId) return { error: 'An expense stays where it was logged — remove it and log it again' }
  }
  /* (pending modules S06) the studio's own categories — an expense keeps one removed since it was logged */
  if (!categoryAllowed((await fetchExpenseCategories()).list, i.category, before?.e.category)) return { error: 'Pick a category from the list' }
  if (i.repeat !== undefined && i.repeat !== null && !isRepeatEvery(i.repeat)) return { error: 'Pick how often it repeats' }
  /* (S42 audit C-08) a completed project's money is closed: a repeat on it would stop on its first day (lib/finance/repeats-server.ts) — said now,
     never promised ("next on …") and broken later. One logged once stays welcome. */
  if (i.repeat && s.ctx && completedBlock(s.ctx.p.stage, 'money')) return { error: REPEAT_CLOSED_RULE }
  const description = words(i.description, DESCRIPTION_MAX)
  if (!description) return { error: 'Say what it was for' }
  if (!(i.amountMinor > 0)) return { error: 'Enter what was paid' }
  if (!i.spentOn) return { error: 'Pick the day it was paid' }
  if (i.spentOn > Date.now() + 86_400_000) return { error: 'It can’t be paid in the future' }
  const claimant = i.paidBy === 'member' ? (i.claimantId || s.viewer.id) : null
  if (claimant && claimant !== s.viewer.id && !runsMoney(s.viewer.role)) return { error: CLAIM_FOR_RULE }
  if (i.vendorId) { const [v] = await db.select({ id: vendors.id }).from(vendors).where(eq(vendors.id, i.vendorId)).limit(1); if (!v) return { error: 'Pick the vendor again' } }
  const kept = before ? (await db.select({ id: costDocuments.id }).from(costDocuments).where(and(eq(costDocuments.recordKind, 'expense'), eq(costDocuments.recordId, before.e.id)))).map((r) => r.id) : []
  const keep = i.keep.filter((k) => kept.includes(k))
  if (keep.length + i.add.length > RECEIPTS_MAX) return { error: `Up to ${RECEIPTS_MAX} receipts on one expense` }
  for (const d of i.add) { const why = docProblem(d); if (why) return { error: why } }
  const rules = await fetchCostRules()
  const studio = await fetchStudio()
  /* (parity map, MO-058) an entity the studio has (a retired one only when it already names it) */
  const entityName = (i.issuingEntity ?? '').trim() || null
  if (entityName) {
    const { fetchBrand } = await import('@/lib/templates/queries')
    const list = (await fetchBrand()).details.entities
    const hit = list.find((x) => x.name === entityName)
    if (!hit || (hit.retired && before?.e.issuingEntity !== entityName)) return { error: 'Pick the issuing entity again — that one is not on Company › Profile' }
  }
  const waits = expenseWaits(s.viewer.role, rules)
  const now = new Date()
  const gstMinor = i.includesGst ? gstInside(Math.round(i.amountMinor), studio.gstPct) : 0
  const cols = {
    projectId: i.projectId, vendorId: i.vendorId, category: i.category, description, amountMinor: Math.round(i.amountMinor), gstMinor, spentOn: day(i.spentOn)!,
    paidBy: i.paidBy === 'member' ? 'member' : 'studio', claimantId: claimant, note: words(i.note, NOTE_MAX), updatedBy: s.viewer.id, updatedAt: now,
    ...(i.issuingEntity !== undefined ? { issuingEntity: entityName } : {}),   // (parity map, MO-058) left as it was when the dialog offers none
  }
  const id = before?.e.id ?? randomUUID()
  /* (pending modules S06) the series this expense belongs to: its own (a new one, or a first one), or the first one it repeats */
  const root = before ? (before.e.repeatOf ? (await db.select().from(expenses).where(eq(expenses.id, before.e.repeatOf)).limit(1))[0] ?? null : before.e) : null
  const liveRepeat = root && isRepeatEvery(root.repeatEvery) && !root.repeatStoppedAt && !root.deletedAt ? root.repeatEvery : null
  /* one its repeat logged, whose first expense was removed: its rhythm can't be set from here — say why */
  if (i.repeat && root?.deletedAt && root.id !== id) return { error: 'Its first expense was removed — bring it back to repeat it again, or log a new one that repeats' }   // invented copy (pending modules S06)
  if (i.repeat !== undefined && (i.repeat ?? null) !== liveRepeat && root && root.createdBy !== s.viewer.id && !runsMoney(s.viewer.role)) return { error: REPEAT_RULE }
  /* who answers it: a runner's counts at once; anyone else's waits (a change by its maker sends it again) */
  const status = before && runsStudio(s.viewer.role) ? before.e.status === 'sent_back' ? 'approved' : before.e.status : waits ? 'pending' : 'approved'
  const review = status === 'approved' && (!before || before.e.status !== 'approved') ? { reviewedBy: s.viewer.id, reviewedAt: now, reviewNote: null } : status === 'pending' ? { reviewedBy: null, reviewedAt: null } : {}
  await db.transaction(async (tx) => {
    if (before) await tx.update(expenses).set({ ...cols, status, ...review }).where(eq(expenses.id, id))
    else await tx.insert(expenses).values({ id, ...cols, status, ...review, createdBy: s.viewer.id, createdAt: now })
    if (before) { const drop = kept.filter((k) => !keep.includes(k)); if (drop.length) await tx.delete(costDocuments).where(inArray(costDocuments.id, drop)) }
    for (const d of i.add) await keepDoc(tx, 'expense', id, d, s.viewer.id)
  })
  /* (pending modules S06) the repeat — set on a new one; on a change, for the series (its first expense holds the rule) */
  const repeat = await applyRepeat({ root: root ?? null, own: { id, spentOn: cols.spentOn.getTime(), isNew: !before }, ask: i.repeat, viewerId: s.viewer.id })
  if (s.ctx) await logCost(s.ctx, before ? 'project_expense_edited' : 'project_expense_logged', { id, title: description, to: moneyWords(cols.amountMinor), category: i.category, claim: claimant ? await nameOf(claimant) : null, ...(repeat && !before && repeat.every ? { repeat: repeatWords(repeat.every) } : {}) })
  if (s.ctx && before && repeat?.changed) await logCost(s.ctx, 'project_expense_repeat', { id: repeat.rootId, title: description, ...(repeat.every ? { repeat: repeatWords(repeat.every) } : { stopped: true }) })
  if (status === 'pending' && (!before || before.e.status !== 'pending')) {
    /* (simplify S-10 · F1 F3) the approvers' bell lands on the To do row they approve from */
    await notify('expense_review', await studioRunnerIds(), { title: `${await nameOf(s.viewer.id)} logged an expense of ${moneyWords(cols.amountMinor)}`, body: `${description}${s.ctx ? ` · ${s.ctx.p.name}` : ' · Studio overhead'}`, href: todoHref(id), leadId: s.ctx?.p.leadId ?? null, fields: { '{expense}': description, '{amount}': moneyWords(cols.amountMinor) } })
  }
  touchCosts(s.ctx?.p)
  return { id, waits: status === 'pending', repeat }
}

/* ── (pending modules S06) A repeating expense ────────────────────────────────────────────────────────────────────────────────── */

/** What a save did to the series' repeat: its rhythm now (null = it doesn't repeat), the next day it logs, and whether it changed. */
export type RepeatSaved = { rootId: string; every: RepeatEvery | null; next: number | null; changed: boolean }
type Root = Pick<Expense, 'id' | 'spentOn' | 'repeatEvery' | 'repeatNext' | 'repeatStoppedAt'>
/** The rhythm's next day after a change: the first one after today and after the series' latest logged day (never a day already there). */
async function nextAfterChange(root: Root, every: RepeatEvery): Promise<number> {
  const rows = await db.select({ d: expenses.spentOn }).from(expenses).where(eq(expenses.repeatOf, root.id))
  const latest = Math.max(root.spentOn.getTime(), ...rows.map((r) => r.d.getTime()))
  return repeatAfter(root.spentOn.getTime(), every, Math.max(latest, dayOf(Date.now())))
}
async function applyRepeat(o: { root: Root | null; own: { id: string; spentOn: number; isNew: boolean }; ask: RepeatEvery | null | undefined; viewerId: string }): Promise<RepeatSaved | null> {
  if (o.own.isNew) {
    if (!o.ask) return null
    const next = firstRepeat(o.own.spentOn, o.ask, Date.now())
    await db.update(expenses).set({ repeatEvery: o.ask, repeatNext: new Date(next), repeatStoppedAt: null, repeatStoppedBy: null }).where(eq(expenses.id, o.own.id))
    return { rootId: o.own.id, every: o.ask, next, changed: true }
  }
  const root = o.root
  if (!root) return null
  const [fresh] = await db.select().from(expenses).where(eq(expenses.id, root.id)).limit(1)   // the first one as saved now (its day may have moved)
  if (!fresh) return null
  const live = isRepeatEvery(fresh.repeatEvery) && !fresh.repeatStoppedAt ? fresh.repeatEvery : null
  const want = o.ask === undefined ? live : o.ask
  if (!want) {
    if (!live) return o.ask === undefined ? null : { rootId: fresh.id, every: null, next: null, changed: false }
    await db.update(expenses).set({ repeatStoppedAt: new Date(), repeatStoppedBy: o.viewerId, repeatNext: null }).where(eq(expenses.id, fresh.id))
    return { rootId: fresh.id, every: null, next: null, changed: true }
  }
  /* on, changed, or the first one's day moved: the next day from the rhythm, after today and after what is already logged */
  const next = await nextAfterChange(fresh, want)
  const changed = want !== live
  if (changed || fresh.repeatNext?.getTime() !== next) await db.update(expenses).set({ repeatEvery: want, repeatNext: new Date(next), repeatStoppedAt: null, repeatStoppedBy: null }).where(eq(expenses.id, fresh.id))
  return { rootId: fresh.id, every: want, next, changed }
}
export type RepeatUndo = { rootId: string; every: string | null; next: number | null; stoppedAt: number | null; stoppedBy: string | null; eventId: string | null }
/** Stop an expense's repeat — from any expense of the series: nothing more is logged; what was logged stays. Undo starts it again. */
export async function stopExpenseRepeat(id: string): Promise<{ ok: true; undo: RepeatUndo; title: string } | Refusal> {
  { const lock = await requirePlan('expense_management'); if (lock) return lock }   // (pending modules S19) expenses are Pro
  const f = await forExpense(id); if (isRefusal(f)) return f
  const [root] = f.e.repeatOf ? await db.select().from(expenses).where(eq(expenses.id, f.e.repeatOf)).limit(1) : [f.e]
  if (!root || !isRepeatEvery(root.repeatEvery) || root.repeatStoppedAt) return { error: 'It doesn’t repeat' }
  if (root.createdBy !== f.s.viewer.id && !runsMoney(f.s.viewer.role)) return { error: REPEAT_RULE }
  const undo: Omit<RepeatUndo, 'eventId'> = { rootId: root.id, every: root.repeatEvery, next: root.repeatNext?.getTime() ?? null, stoppedAt: null, stoppedBy: null }
  await db.update(expenses).set({ repeatStoppedAt: new Date(), repeatStoppedBy: f.s.viewer.id, repeatNext: null }).where(eq(expenses.id, root.id))
  const eventId = f.s.ctx ? await logCost(f.s.ctx, 'project_expense_repeat', { id: root.id, title: root.description, stopped: true }) : null
  touchCosts(f.s.ctx?.p)
  return { ok: true, undo: { ...undo, eventId }, title: root.description }
}
export async function undoStopExpenseRepeat(u: RepeatUndo): Promise<{ ok: true } | Refusal> {
  { const lock = await requirePlan('expense_management'); if (lock) return lock }   // (pending modules S19) expenses are Pro
  const f = await forExpense(u.rootId); if (isRefusal(f)) return f
  if (f.e.createdBy !== f.s.viewer.id && !runsMoney(f.s.viewer.role)) return { error: REPEAT_RULE }
  if (!isRepeatEvery(u.every)) return { error: 'It doesn’t repeat' }
  await db.update(expenses).set({ repeatEvery: u.every, repeatNext: u.next ? new Date(u.next) : new Date(await nextAfterChange(f.e, u.every)), repeatStoppedAt: null, repeatStoppedBy: null }).where(eq(expenses.id, u.rootId))
  if (u.eventId) await dropLeadEvents([u.eventId])
  touchCosts(f.s.ctx?.p)
  return { ok: true }
}

/* ── (pending modules S06) Settings › Finance › Money out › Expense categories ──────────────────────────────────────────────────── */

async function writeCategories(list: string[]) {
  const value = JSON.stringify(list)
  await db.insert(settings).values({ key: EXPENSE_CATEGORIES_KEY, value, updatedAt: new Date() }).onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } })
}
/** A category Xero keeps an account for, mapped the moment it is added while Xero is connected (its row's hint), so no expense fails on it. */
async function mapNewCategories(list: string[]) {
  const { fetchXeroSettings, saveXeroSettings } = await import('@/lib/finance/xero-server')
  const { accountKeysFor, hintedAccount } = await import('@/lib/finance/xero')
  const x = await fetchXeroSettings()
  if (!x.connected) return
  const missing = accountKeysFor(list).filter((k) => k.key.startsWith('exp:') && !x.accounts[k.key])
  if (!missing.length) return
  await saveXeroSettings({ ...x, accounts: { ...x.accounts, ...Object.fromEntries(missing.map((k) => [k.key, hintedAccount(k)])) } })
}
/** The list as the studio orders it — add (at the end), remove (the expenses logged under it keep it) or move; Undo writes the list it had. */
export async function setExpenseCategories(next: string[]): Promise<{ list: string[] } | Refusal> {
  { const lock = await requirePlan('expense_management'); if (lock) return lock }   // (pending modules S19) expenses are Pro
  const viewer = await fetchViewer()
  if (!changesCostRules(viewer.role)) return { error: CATEGORIES_RULE }
  const raw = Array.isArray(next) ? next.map(cleanCategory).filter(Boolean) : []
  if (!raw.length) return { error: 'Keep at least one category — every expense is logged under one' }
  if (raw.length > CATEGORIES_MAX) return { error: `Up to ${CATEGORIES_MAX} categories` }
  const { list } = parseExpenseCategories(raw)
  if (list.length < raw.length) return { error: 'Each category is in the list once' }
  await writeCategories(list)
  await mapNewCategories(list)
  touchCosts(); revalidatePath('/settings')
  return { list }
}
/** Rename a category: the expenses logged under it follow (any case), and so does its Xero account. */
export async function renameExpenseCategory(from: string, to: string): Promise<{ list: string[]; moved: number } | Refusal> {
  { const lock = await requirePlan('expense_management'); if (lock) return lock }   // (pending modules S19) expenses are Pro
  const viewer = await fetchViewer()
  if (!changesCostRules(viewer.role)) return { error: CATEGORIES_RULE }
  const now = (await fetchExpenseCategories()).list
  const was = categoryIn(now, from)
  if (!was) return { error: `${from} isn’t in the list any more` }
  const name = cleanCategory(to)
  const why = categoryProblem(now, name, was); if (why) return { error: why }
  const list = now.map((c) => (c === was ? name : c))
  const { sql } = await import('drizzle-orm')
  const moved = await db.update(expenses).set({ category: name }).where(sql`lower(${expenses.category}) = lower(${was})`)
  await writeCategories(list)
  /* its Xero account follows the name */
  const { fetchXeroSettings, saveXeroSettings } = await import('@/lib/finance/xero-server')
  const x = await fetchXeroSettings()
  const fromKey = `exp:${was}`, toKey = `exp:${name}`
  if (fromKey !== toKey && x.accounts[fromKey] !== undefined) {
    const accounts = { ...x.accounts, [toKey]: x.accounts[fromKey] ?? null }
    delete accounts[fromKey]
    await saveXeroSettings({ ...x, accounts })
  }
  await mapNewCategories(list)
  touchCosts(); revalidatePath('/settings')
  return { list, moved: moved.rowsAffected }
}

export type ExpenseAnswerUndo = { id: string; status: string; note: string | null; by: string | null; at: number | null; eventId: string | null }
/** Approve an expense, or send it back with a note (Owners and Admins); whoever logged it hears the answer. */
export async function answerExpense(id: string, o: { approve: boolean; note?: string | null }): Promise<{ ok: true; undo: ExpenseAnswerUndo } | Refusal> {
  { const lock = await requirePlan('expense_management'); if (lock) return lock }   // (pending modules S19) expenses are Pro
  const f = await forExpense(id); if (isRefusal(f)) return f
  if (!approvesExpense(f.s.viewer.role)) return { error: EXPENSE_APPROVE_RULE }
  if (f.e.status !== 'pending') return { error: f.e.status === 'approved' ? 'It is approved already' : 'It was sent back — it waits for its maker' }
  const note = words(o.note, REASON_MAX)
  if (!o.approve && !note) return { error: 'Say what should change' }
  const undo: Omit<ExpenseAnswerUndo, 'eventId'> = { id, status: f.e.status, note: f.e.reviewNote, by: f.e.reviewedBy, at: f.e.reviewedAt?.getTime() ?? null }
  await db.update(expenses).set({ status: o.approve ? 'approved' : 'sent_back', reviewNote: o.approve ? null : note, reviewedBy: f.s.viewer.id, reviewedAt: new Date() }).where(eq(expenses.id, id))
  const eventId = f.s.ctx ? await logCost(f.s.ctx, o.approve ? 'project_expense_approved' : 'project_expense_sent_back', { id, title: f.e.description, to: moneyWords(f.e.amountMinor), note: note ?? undefined }) : null
  const to = [f.e.createdBy, f.e.claimantId].filter((x): x is string => !!x)
  await notify('expense_answered', to, { title: o.approve ? `Your expense “${f.e.description}” is approved` : `Your expense “${f.e.description}” was sent back`, body: o.approve ? moneyWords(f.e.amountMinor) : note, href: f.s.ctx ? moneyHref(f.s.ctx.p.id, id) : financeHref('expenses', id), leadId: f.s.ctx?.p.leadId ?? null, fields: { '{expense}': f.e.description, '{amount}': moneyWords(f.e.amountMinor), '{note}': o.approve ? 'approved' : `sent back — “${note}”` } })
  touchCosts(f.s.ctx?.p)
  return { ok: true, undo: { ...undo, eventId } }
}
export async function undoExpenseAnswer(u: ExpenseAnswerUndo): Promise<{ ok: true } | Refusal> {
  { const lock = await requirePlan('expense_management'); if (lock) return lock }   // (pending modules S19) expenses are Pro
  const f = await forExpense(u.id); if (isRefusal(f)) return f
  if (!approvesExpense(f.s.viewer.role)) return { error: EXPENSE_APPROVE_RULE }
  if (f.paidBack > 0) return { error: 'It is paid back — reverse the payment first' }
  await db.update(expenses).set({ status: u.status, reviewNote: u.note, reviewedBy: u.by, reviewedAt: u.at ? new Date(u.at) : null }).where(eq(expenses.id, u.id))
  if (u.eventId) await dropLeadEvents([u.eventId])
  touchCosts(f.s.ctx?.p)
  return { ok: true }
}
/** Remove an expense — its maker while it waits or was sent back, an Owner or an Admin until it is paid back — with Undo. */
export async function removeExpense(id: string): Promise<{ ok: true; undo: { id: string; eventId: string | null }; stopsRepeat: boolean } | Refusal> {
  { const lock = await requirePlan('expense_management'); if (lock) return lock }   // (pending modules S19) expenses are Pro
  const f = await forExpense(id); if (isRefusal(f)) return f
  if (f.paidBack > 0) return { error: 'It is paid back — reverse the payment first' }
  if (!runsMoney(f.s.viewer.role) && (f.e.createdBy !== f.s.viewer.id || f.e.status === 'approved')) return { error: EXPENSE_CHANGE_RULE }
  await db.update(expenses).set({ deletedAt: new Date(), deletedBy: f.s.viewer.id }).where(eq(expenses.id, id))
  const eventId = f.s.ctx ? await logCost(f.s.ctx, 'project_expense_removed', { id, title: f.e.description, to: moneyWords(f.e.amountMinor) }) : null
  touchCosts(f.s.ctx?.p)
  /* (pending modules S06) a series' first expense holds its repeat: removed, nothing more is logged (Undo brings both back) */
  return { ok: true, undo: { id, eventId }, stopsRepeat: !f.e.repeatOf && isRepeatEvery(f.e.repeatEvery) && !f.e.repeatStoppedAt }
}
export async function undoRemoveExpense(u: { id: string; eventId: string | null }): Promise<{ ok: true } | Refusal> {
  { const lock = await requirePlan('expense_management'); if (lock) return lock }   // (pending modules S19) expenses are Pro
  const [e] = await db.select().from(expenses).where(eq(expenses.id, u.id)).limit(1)
  if (!e || !e.deletedAt) return { error: EXPENSE_GONE }
  const s = await scopeOf(e.projectId); if (isRefusal(s)) return s
  if (e.createdBy !== s.viewer.id && !runsMoney(s.viewer.role)) return { error: EXPENSE_CHANGE_RULE }
  await db.update(expenses).set({ deletedAt: null, deletedBy: null }).where(eq(expenses.id, u.id))
  if (u.eventId) await dropLeadEvents([u.eventId])
  touchCosts(s.ctx?.p)
  return { ok: true }
}

/* ── Payments out (F1-Q12) ────────────────────────────────────────────────────────────────────────────────────────────────────── */

export type PayoutInput = { kind: 'po' | 'bill' | 'claim'; recordId: string; amountMinor: number; paidOn: number; method: string; reference: string | null; note: string | null; proof: PickedDoc | null }
export type PayoutUndo = { payoutId: string; reopened: string | null; eventId: string | null }
/** Pay a vendor (a PO, a bill — a bill on a PO pays the PO too) or a member's claim; never more than is owed. A PO paid in full closes itself. */
export async function recordPayout(i: PayoutInput): Promise<{ id: string; sentence: string; undo: PayoutUndo } | Refusal> {
  const viewer = await fetchViewer()
  if (!paysOut(viewer.role)) return { error: PAY_RULE }
  /* the record and its project */
  let projectId: string | null = null, vendorId: string | null = null, memberId: string | null = null, poId: string | null = null, billId: string | null = null, expenseId: string | null = null
  let label = ''
  if (i.kind === 'po') {
    const [po] = await db.select().from(purchaseOrders).where(and(eq(purchaseOrders.id, i.recordId), isNull(purchaseOrders.deletedAt))).limit(1)
    if (!po) return { error: 'This purchase order is not there any more' }
    projectId = po.projectId; vendorId = po.vendorId; poId = po.id; label = po.number
  } else if (i.kind === 'bill') {
    const [b] = await db.select().from(supplierBills).where(and(eq(supplierBills.id, i.recordId), isNull(supplierBills.deletedAt))).limit(1)
    if (!b) return { error: BILL_GONE }
    /* (S44R, C8) a bill that waits for its OK is paid once an Owner or an Admin approves it — nothing paid on it yet means it still waits */
    if (b.approvalWhy && !b.approvedAt && !(await db.select({ id: paymentsOut.id }).from(paymentsOut).where(and(eq(paymentsOut.billId, b.id), isNull(paymentsOut.reversedAt))).limit(1)).length) return { error: BILL_WAITS_RULE }
    projectId = b.projectId; vendorId = b.vendorId; billId = b.id; poId = b.poId; label = `bill ${b.reference}`
  } else {
    const [e] = await db.select().from(expenses).where(and(eq(expenses.id, i.recordId), isNull(expenses.deletedAt))).limit(1)
    if (!e) return { error: EXPENSE_GONE }
    if (e.paidBy !== 'member' || !e.claimantId) return { error: 'The studio paid this one itself — there is nothing to pay back' }
    if (e.status !== 'approved') return { error: 'Approve the claim first' }
    projectId = e.projectId; expenseId = e.id; memberId = e.claimantId; vendorId = e.vendorId; label = `“${e.description}”`
  }
  const s = await scopeOf(projectId); if (isRefusal(s)) return s
  /* what is owed, by the one set of numbers */
  const recs = await loadCostRecords({ projectIds: projectId ? [projectId] : [], overhead: !projectId })
  const sum = costsOf(recs, Date.now())
  const owed = payable({ bills: sum.bills, po: i.kind === 'po' ? sum.pos.find((p) => p.id === poId) : null, bill: billId ? sum.bills.find((b) => b.id === billId) : null, expense: expenseId ? sum.expenses.find((x) => x.id === expenseId) : null })
  const amount = Math.round(i.amountMinor)
  if (!(amount > 0)) return { error: 'Enter the amount paid' }
  if (owed.owedMinor <= 0) return { error: i.kind === 'po' ? 'Nothing is owed on it — the vendor has it to accept, or it is paid' : 'Nothing is owed on it' }
  if (amount > owed.owedMinor) return { error: `That is more than the ${moneyWords(owed.owedMinor)} owed — record at most what is owed` }
  if (!PAY_OUT_METHODS.some((m) => m.value === i.method)) return { error: 'Say how it was paid' }
  const paidOn = day(i.paidOn)
  if (!paidOn || paidOn.getTime() > Date.now()) return { error: 'Pick the day it was paid — today or before' }
  if (i.proof) { const why = docProblem(i.proof); if (why) return { error: why } }
  const id = randomUUID(), now = new Date()
  const advance = i.kind === 'po' && owed.advanceDueMinor > 0
  let reopened: string | null = null
  await db.transaction(async (tx) => {
    await tx.insert(paymentsOut).values({ id, kind: i.kind, projectId, vendorId, memberId, poId, billId, expenseId, amountMinor: amount, advance, paidOn, method: i.method, reference: words(i.reference, 60), note: words(i.note, NOTE_MAX), createdBy: viewer.id, createdAt: now })
    if (i.proof) await keepDoc(tx, 'payout', id, i.proof, viewer.id)
  })
  /* a PO paid in full closes itself (1.0 G-371) */
  if (poId) {
    const after = costsOf(await loadCostRecords({ projectIds: projectId ? [projectId] : [], overhead: !projectId }), Date.now()).pos.find((p) => p.id === poId)
    if (after && after.balanceMinor <= 0 && after.state !== 'closed' && after.state !== 'cancelled') {
      await db.update(purchaseOrders).set({ status: 'closed', closedAt: now, closedBy: viewer.id, closeNote: null }).where(eq(purchaseOrders.id, poId))
      reopened = poId
    }
  }
  const member = memberId ? await nameOf(memberId) : null
  const vendor = vendorId ? (await db.select({ n: vendors.name }).from(vendors).where(eq(vendors.id, vendorId)).limit(1))[0]?.n ?? null : null
  const eventId = s.ctx ? await logCost(s.ctx, 'project_payout_recorded', { id, title: label, vendor: vendor ?? undefined, claim: member, to: moneyWords(amount), method: methodLabel(i.method), po: reopened ? label : null, kind: i.kind }) : null
  if (memberId) {
    const [e] = await db.select({ d: expenses.description }).from(expenses).where(eq(expenses.id, expenseId!)).limit(1)
    await notify('claim_paid', [memberId], { title: `${moneyWords(amount)} for “${e?.d ?? 'your claim'}” is paid back`, body: methodLabel(i.method), href: s.ctx ? moneyHref(s.ctx.p.id, expenseId!) : financeHref('expenses', expenseId!), leadId: s.ctx?.p.leadId ?? null, fields: { '{expense}': e?.d ?? '', '{amount}': moneyWords(amount) } })
  }
  touchCosts(s.ctx?.p)
  const whom = i.kind === 'claim' ? member : vendor
  const sentence = `${moneyWords(amount)} paid to ${whom ?? 'the vendor'} for ${label}${advance ? ' — the advance' : ''}${reopened ? ` — ${label} is paid in full and closed` : ''}`
  return { id, sentence, undo: { payoutId: id, reopened, eventId } }
}
/** The payment's Undo, right after it: gone, and a PO it closed is open again. */
export async function undoPayout(u: PayoutUndo): Promise<{ ok: true } | Refusal> {
  const viewer = await fetchViewer()
  if (!paysOut(viewer.role)) return { error: PAY_RULE }
  const [p] = await db.select().from(paymentsOut).where(eq(paymentsOut.id, u.payoutId)).limit(1)
  if (!p) return { error: 'This payment is not there any more' }
  if (p.reversedAt) return { error: 'It is reversed already' }
  await db.transaction(async (tx) => {
    await tx.delete(costDocuments).where(and(eq(costDocuments.recordKind, 'payout'), eq(costDocuments.recordId, p.id)))
    await tx.delete(paymentsOut).where(eq(paymentsOut.id, p.id))
    if (u.reopened) await tx.update(purchaseOrders).set({ status: 'sent', closedAt: null, closedBy: null }).where(and(eq(purchaseOrders.id, u.reopened), eq(purchaseOrders.status, 'closed')))
  })
  if (u.eventId) await dropLeadEvents([u.eventId])
  touchCosts(p.projectId ? (await db.select({ id: projects.id, leadId: projects.leadId }).from(projects).where(eq(projects.id, p.projectId)).limit(1))[0] : null)
  return { ok: true }
}
/** Reverse a payment out later (Owners and Admins), with a reason: it stays on the record and counts for nothing; a PO it closed opens again. */
export async function reversePayout(id: string, o: { reason: string }): Promise<{ ok: true; undo: { id: string; eventId: string | null; reopened: string | null } } | Refusal> {
  const viewer = await fetchViewer()
  if (!paysOut(viewer.role)) return { error: PAY_RULE }
  const [p] = await db.select().from(paymentsOut).where(eq(paymentsOut.id, id)).limit(1)
  if (!p) return { error: 'This payment is not there any more' }
  if (p.reversedAt) return { error: 'It is reversed already' }
  const reason = words(o.reason, REASON_MAX)
  if (!reason) return { error: 'Say why it is reversed' }
  const s = await scopeOf(p.projectId); if (isRefusal(s)) return s
  await db.update(paymentsOut).set({ reversedAt: new Date(), reversedBy: viewer.id, reverseReason: reason }).where(eq(paymentsOut.id, id))
  let reopened: string | null = null
  if (p.poId) {
    const [po] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, p.poId)).limit(1)
    if (po?.status === 'closed' && !po.closeNote) { await db.update(purchaseOrders).set({ status: 'sent', closedAt: null, closedBy: null }).where(eq(purchaseOrders.id, po.id)); reopened = po.id }
  }
  const eventId = s.ctx ? await logCost(s.ctx, 'project_payout_reversed', { id, to: moneyWords(p.amountMinor), reason, kind: p.kind }) : null
  touchCosts(s.ctx?.p)
  return { ok: true, undo: { id, eventId, reopened } }
}
export async function undoReversePayout(u: { id: string; eventId: string | null; reopened: string | null }): Promise<{ ok: true } | Refusal> {
  const viewer = await fetchViewer()
  if (!paysOut(viewer.role)) return { error: PAY_RULE }
  const [p] = await db.select().from(paymentsOut).where(eq(paymentsOut.id, u.id)).limit(1)
  if (!p || !p.reversedAt) return { error: 'It is not reversed' }
  await db.update(paymentsOut).set({ reversedAt: null, reversedBy: null, reverseReason: null }).where(eq(paymentsOut.id, u.id))
  if (u.reopened) await db.update(purchaseOrders).set({ status: 'closed', closedAt: new Date(), closedBy: viewer.id }).where(eq(purchaseOrders.id, u.reopened))
  if (u.eventId) await dropLeadEvents([u.eventId])
  touchCosts(p.projectId ? (await db.select({ id: projects.id, leadId: projects.leadId }).from(projects).where(eq(projects.id, p.projectId)).limit(1))[0] : null)
  return { ok: true }
}

/* ── Settings › Finance › Costs ──────────────────────────────────────────────────────────────────────────────────────────────── */

export async function setCostRules(patch: Partial<CostRules>): Promise<{ rules: CostRules } | Refusal> {
  const viewer = await fetchViewer()
  if (!changesCostRules(viewer.role)) return { error: COST_SETTINGS_RULE }
  if (patch && ('poApproval' in patch || 'expenseApproval' in patch)) { const lock = await requirePlan('internal_approvals'); if (lock) return lock }   // (pending modules S19) approvals are Pro
  const now = await fetchCostRulesStored()   // the studio's own rules (a Free plan reads the approvals off — never written back)
  const next = parseCostRules({ ...now, ...patch, numbering: { ...now.numbering, ...(patch.numbering ?? {}) } })
  const value = JSON.stringify(next)
  await db.insert(settings).values({ key: COST_RULES_KEY, value, updatedAt: new Date() }).onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } })
  touchCosts()
  revalidatePath('/settings')
  return { rules: next }
}
