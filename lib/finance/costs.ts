/**
 * (gaps build F1 — money out: the costs, F1-Q13) ONE SET OF NUMBERS for what a project (or the studio's overhead) costs. 1.0 had three again —
 * the PO list's strip, the expense list's total and the Overview's committed figures each added differently (G-378 · G-416), and a bill on a
 * PO counted twice (G-81) — so here every surface — the Money tab's Costs half, Finance's lists, a vendor's balance, F2's profit — reads
 * `costsOf`, and nothing recomputes. Pure and client-safe: the server loads the records (lib/finance/queries.ts) and hands them in.
 *
 * - **Committed**: a PO from Sent on — its total, or its bills when they come to more; a closed one, what was paid — + a bill on no PO + an
 *   approved expense. A Draft, one waiting for approval, sent back, answered with changes or a no, or cancelled binds nothing (the pipeline).
 * - **Paid**: payments out not reversed (a bill on a PO pays the PO too — one payment, both records) + approved expenses the studio paid itself.
 * - **You owe** = committed − paid: a bound PO's balance, an unpaid bill on no PO, an approved claim not yet paid back. **Overdue**: what is past
 *   its due day — a bill's, else a PO's own.
 */
import type { RepeatEvery } from './repeats'
import {
  billState, billWaiting, binds, deliveryLateDays, expenseState, poState,
  type BillRecord, type BillState, type ExpenseRecord, type ExpenseState, type PayoutRecord, type PoRecord, type PoState,
} from './model'

const DAY = 86_400_000
const live = (p: PayoutRecord) => !p.reversedAt

/** (pending modules S12) `qty` = the quote's own quantity: a PO line ordering more (its waste on top) is compared on what the client buys */
export type QuoteLineFacts = { id: string; costMinor: number; priceMinor: number; qty?: number }
export type CostInput = {
  pos: PoRecord[]; bills: BillRecord[]; expenses: ExpenseRecord[]; payouts: PayoutRecord[]
  /** The signed quote's lines a PO's lines came from — their cost and the client's price (before GST); empty for whoever may not see figures. */
  quoteLines?: QuoteLineFacts[]
  /** Each vendor's trade — a line or a bill with no category of its own is counted under it. */
  vendorTrades?: Record<string, string | null>
}

export type PoView = PoRecord & {
  state: PoState
  /** Paid against it — its advance and every payment on its bills. */
  paidMinor: number; advancePaidMinor: number
  /** The live bills on it, and what they come to. */
  billIds: string[]; billedMinor: number
  /** What the vendor is owed in all: its total, or its bills when they come to more. */
  dueInAllMinor: number
  /** What it binds the studio to (0 before it is sent) and what is still to pay. */
  committedMinor: number; balanceMinor: number; overdueMinor: number
  /** (F1-Q7, Owners and Admins) its lines that came from the quote: the client's price for them and what this PO leaves of it. Null with none. */
  againstQuote: { clientMinor: number; quotedCostMinor: number; poMinor: number; leftMinor: number; pct: number } | null
  /** (parity map, MO-094 · PR-089) how many days its delivery is late (0 = on time, delivered, or nothing expected) */
  deliveryLateDays: number
}
export type BillView = BillRecord & { state: BillState; paidMinor: number; balanceMinor: number; overdueMinor: number; committedMinor: number
  /** (S44R — UAT row 361, call C8) it waits for an Owner's or an Admin's OK before anyone pays it */ waits: boolean }
export type ExpenseView = ExpenseRecord & { state: ExpenseState; committedMinor: number; paidMinor: number; owedMinor: number; paidBackMinor: number
  /** (pending modules S06) the repeat it belongs to — its first expense's rule and every expense the series holds (oldest first); null for
      an expense that never repeated (or whose first one is not in this list) */
  series: ExpenseSeries | null }
export type ExpenseSeries = { rootId: string; every: RepeatEvery | null; next: number | null; stoppedAt: number | null; stoppedBy: string | null; live: boolean
  members: { id: string; spentOn: number; amountMinor: number; status: ExpenseRecord['status'] }[] }

export type CostSummary = {
  committedMinor: number; paidMinor: number; owedMinor: number; overdueMinor: number
  /** Drafts and POs waiting for approval — prepared, binding nothing yet (F2's pipeline). */
  pipelineMinor: number
  /** Approved claims not yet paid back. */
  claimsOwedMinor: number
  pos: PoView[]; bills: BillView[]; expenses: ExpenseView[]; payouts: PayoutRecord[]
  /** (F2) Committed by trade / category, biggest first. */
  byCategory: { category: string; committedMinor: number }[]
  /** (F2 · the vendor's balance) Per vendor: committed, paid, owed. */
  byVendor: { vendorId: string; committedMinor: number; paidMinor: number; owedMinor: number; overdueMinor: number }[]
  /** What waits on someone: POs and expenses waiting for approval, POs the vendor answered with changes or a no — (S44R, C8) and bills waiting
      for their OK. */
  waiting: { poApprovals: number; expenseApprovals: number; vendorAnswers: number; billApprovals: number }
}

/** (pending modules S06) The repeat an expense belongs to, read from the list: its first expense's rule and the series' expenses, oldest first. */
function seriesOf(all: ExpenseRecord[], e: ExpenseRecord): ExpenseSeries | null {
  const root = e.repeatOf ? all.find((x) => x.id === e.repeatOf) : e
  if (!root || (!root.repeatEvery && !all.some((x) => x.repeatOf === root.id))) return null
  const members = all.filter((x) => x.id === root.id || x.repeatOf === root.id).sort((a, b) => a.spentOn - b.spentOn)
    .map((x) => ({ id: x.id, spentOn: x.spentOn, amountMinor: x.amountMinor, status: x.status }))
  return { rootId: root.id, every: root.repeatEvery, next: root.repeatStoppedAt ? null : root.repeatNext, stoppedAt: root.repeatStoppedAt, stoppedBy: root.repeatStoppedBy,
    live: !!root.repeatEvery && !root.repeatStoppedAt, members }
}

export function costsOf(input: CostInput, now: number): CostSummary {
  const payouts = input.payouts
  const paidOn = (pick: (p: PayoutRecord) => boolean) => payouts.filter((p) => live(p) && pick(p)).reduce((s, p) => s + p.amountMinor, 0)
  const quote = new Map((input.quoteLines ?? []).map((q) => [q.id, q]))
  const trade = (vendorId: string | null) => (vendorId ? input.vendorTrades?.[vendorId] ?? null : null)
  const overdueOf = (balance: number, dueOn: number | null) => (balance > 0 && dueOn && now >= dueOn + DAY ? balance : 0)

  const billsOf = (poId: string) => input.bills.filter((b) => b.poId === poId)
  const bills: BillView[] = input.bills.map((b) => {
    const paidMinor = paidOn((p) => p.billId === b.id)
    const balanceMinor = Math.max(0, b.totalMinor - paidMinor)
    const waits = billWaiting(b, paidMinor) && b.totalMinor > 0
    /* (S44R, C8) a bill on no PO that waits for its OK counts once approved — as a PO or a claim that waits (and as Xero holds a bill awaiting
       approval out of the books): out of the committed costs, You owe and overdue until then; still on the list, in To approve and on its panel.
       A bill on a PO counts through its PO (approved already) — its OK is about paying what it bills over. */
    return { ...b, state: billState(b, paidMinor, now), paidMinor, balanceMinor, overdueMinor: waits && !b.poId ? 0 : overdueOf(balanceMinor, b.dueOn), committedMinor: b.poId || waits ? 0 : b.totalMinor, waits }
  })
  const billView = new Map(bills.map((b) => [b.id, b]))

  const pos: PoView[] = input.pos.map((po) => {
    const paidMinor = paidOn((p) => p.poId === po.id)
    const advancePaidMinor = paidOn((p) => p.poId === po.id && p.advance)
    const state = poState(po, paidMinor)
    const mine = billsOf(po.id)
    const billedMinor = mine.reduce((s, b) => s + b.totalMinor, 0)
    const dueInAllMinor = Math.max(po.totalMinor, billedMinor)
    const committedMinor = state === 'closed' ? paidMinor : binds(state) ? dueInAllMinor : Math.max(0, paidMinor)
    const balanceMinor = Math.max(0, committedMinor - paidMinor)
    /* overdue: its bills' days when it has bills, else its own (the terms' day) */
    const overdueMinor = !binds(state) || state === 'closed' ? 0
      : mine.length ? Math.min(balanceMinor, mine.reduce((s, b) => s + (billView.get(b.id)?.overdueMinor ?? 0), 0))
        : overdueOf(balanceMinor, po.dueOn)
    let againstQuote: PoView['againstQuote'] = null
    const matched = po.lines.filter((l) => l.quoteItemId && quote.has(l.quoteItemId))
    if (matched.length) {
      /* (pending modules S12) the client pays for the quoted quantity — a PO ordering the waste on top never makes the client's share bigger */
      const bought = (l: { qty: number; quoteItemId: string | null }) => { const q = quote.get(l.quoteItemId!)!; return q.qty !== undefined && q.qty > 0 ? Math.min(l.qty, q.qty) : l.qty }
      const clientMinor = matched.reduce((s, l) => s + Math.round(bought(l) * quote.get(l.quoteItemId!)!.priceMinor), 0)
      const quotedCostMinor = matched.reduce((s, l) => s + Math.round(bought(l) * quote.get(l.quoteItemId!)!.costMinor), 0)
      const poMinor = matched.reduce((s, l) => s + l.amountMinor, 0)
      const leftMinor = clientMinor - poMinor
      againstQuote = { clientMinor, quotedCostMinor, poMinor, leftMinor, pct: clientMinor ? Math.round((leftMinor / clientMinor) * 1000) / 10 : 0 }
    }
    return { ...po, state, paidMinor, advancePaidMinor, billIds: mine.map((b) => b.id), billedMinor, dueInAllMinor, committedMinor, balanceMinor, overdueMinor, againstQuote, deliveryLateDays: deliveryLateDays(po, state, now) }
  })

  const expenses: ExpenseView[] = input.expenses.map((e) => {
    const paidBackMinor = paidOn((p) => p.expenseId === e.id)
    const state = expenseState(e, paidBackMinor)
    const approved = e.status === 'approved'
    const committedMinor = approved ? e.amountMinor : 0
    const paidMinor = !approved ? 0 : e.paidBy === 'member' ? Math.min(e.amountMinor, paidBackMinor) : e.amountMinor
    return { ...e, state, committedMinor, paidMinor, owedMinor: Math.max(0, committedMinor - paidMinor), paidBackMinor, series: seriesOf(input.expenses, e) }
  })

  const committedMinor = pos.reduce((s, p) => s + p.committedMinor, 0) + bills.reduce((s, b) => s + b.committedMinor, 0) + expenses.reduce((s, e) => s + e.committedMinor, 0)
  /* paid: every live payment out once (a bill on a PO is one payment for both) + what the studio paid itself on an approved expense */
  const paidMinor = payouts.filter(live).reduce((s, p) => s + p.amountMinor, 0) + expenses.filter((e) => e.status === 'approved' && e.paidBy !== 'member').reduce((s, e) => s + e.amountMinor, 0)
  const owedMinor = pos.reduce((s, p) => s + p.balanceMinor, 0) + bills.filter((b) => !b.poId && !b.waits).reduce((s, b) => s + b.balanceMinor, 0) + expenses.reduce((s, e) => s + e.owedMinor, 0)   // (S44R, C8) a waiting bill is owed once approved
  const overdueMinor = pos.reduce((s, p) => s + p.overdueMinor, 0) + bills.filter((b) => !b.poId).reduce((s, b) => s + b.overdueMinor, 0)
  const pipelineMinor = pos.filter((p) => p.state === 'draft' || p.state === 'awaiting' || p.state === 'sent_back').reduce((s, p) => s + p.totalMinor, 0)

  /* (F2) where the costs go: a bound PO's committed share by its lines' trades, a bill on no PO by its vendor's trade, an expense by its category */
  const cat = new Map<string, number>()
  const add = (k: string | null | undefined, m: number) => { if (!m) return; const key = k?.trim() || 'Other'; cat.set(key, (cat.get(key) ?? 0) + m) }
  for (const p of pos) {
    if (!p.committedMinor) continue
    const total = p.lines.reduce((s, l) => s + l.amountMinor, 0)
    if (!total) { add(trade(p.vendorId), p.committedMinor); continue }
    let given = 0
    p.lines.forEach((l, i) => { const share = i === p.lines.length - 1 ? p.committedMinor - given : Math.round((p.committedMinor * l.amountMinor) / total); given += share; add(l.category ?? trade(p.vendorId), share) })
  }
  for (const b of bills) add(trade(b.vendorId), b.committedMinor)
  for (const e of expenses) add(e.category, e.committedMinor)
  const byCategory = [...cat.entries()].map(([category, m]) => ({ category, committedMinor: m })).sort((a, b) => b.committedMinor - a.committedMinor)

  const ven = new Map<string, { committedMinor: number; paidMinor: number; owedMinor: number; overdueMinor: number }>()
  const v = (id: string) => { let x = ven.get(id); if (!x) { x = { committedMinor: 0, paidMinor: 0, owedMinor: 0, overdueMinor: 0 }; ven.set(id, x) } return x }
  for (const p of pos) { const x = v(p.vendorId); x.committedMinor += p.committedMinor; x.owedMinor += p.balanceMinor; x.overdueMinor += p.overdueMinor }
  for (const b of bills) if (!b.poId && !b.waits) { const x = v(b.vendorId); x.committedMinor += b.committedMinor; x.owedMinor += b.balanceMinor; x.overdueMinor += b.overdueMinor }   // (S44R, C8)
  for (const p of payouts) if (live(p) && p.vendorId && p.kind !== 'claim') v(p.vendorId).paidMinor += p.amountMinor
  for (const e of expenses) if (e.vendorId && e.committedMinor) { const x = v(e.vendorId); x.committedMinor += e.committedMinor; x.paidMinor += e.paidBy === 'member' ? 0 : e.paidMinor }
  const byVendor = [...ven.entries()].map(([vendorId, x]) => ({ vendorId, ...x }))

  return {
    committedMinor, paidMinor, owedMinor, overdueMinor, pipelineMinor,
    claimsOwedMinor: expenses.reduce((s, e) => s + (e.paidBy === 'member' ? e.owedMinor : 0), 0),
    pos, bills, expenses, payouts, byCategory, byVendor,
    waiting: {
      poApprovals: pos.filter((p) => p.state === 'awaiting').length,
      expenseApprovals: expenses.filter((e) => e.state === 'pending').length,
      vendorAnswers: pos.filter((p) => p.state === 'changes' || p.state === 'declined').length,
      billApprovals: bills.filter((b) => b.waits).length,   // (S44R, C8)
    },
  }
}

/** (F1-Q12) What may be paid on a record now: a bound PO's balance (its advance first), a bill's, a claim's. */
export function payable(o: { po?: PoView | null; bill?: BillView | null; expense?: ExpenseView | null; /** (S44R, C8) the PO's bills, so a waiting one's money stays held */ bills?: BillView[] }): { owedMinor: number; advanceDueMinor: number } {
  if (o.bill) return { owedMinor: o.bill.waits ? 0 : o.bill.balanceMinor, advanceDueMinor: 0 }   // (S44R, C8) nothing is paid on a bill that waits for its OK
  if (o.expense) return { owedMinor: o.expense.owedMinor, advanceDueMinor: 0 }
  if (o.po) {
    /* (S44R, C8) a bill on it that waits for its OK holds what it bills over the PO back from a payment on the PO itself */
    const held = (o.bills ?? []).filter((b) => b.poId === o.po!.id && b.waits).reduce((s, b) => s + b.balanceMinor, 0)
    const room = Math.max(0, o.po.balanceMinor - Math.min(held, Math.max(0, o.po.billedMinor - o.po.totalMinor)))
    const owed = o.po.state === 'accepted' || o.po.state === 'sent' || o.po.state === 'part_paid' ? room : 0
    return { owedMinor: owed, advanceDueMinor: Math.min(owed, Math.max(0, o.po.advanceMinor - o.po.advancePaidMinor)) }
  }
  return { owedMinor: 0, advanceDueMinor: 0 }
}

/**
 * (parity map, MO-079 · FB-105) The issuing entity each money-out record is under, as the "Issued by" scope and the rows' chips read it: a PO's
 * own (its signed quote's when it was made), a bill's PO's, an expense's own (MO-058), a payment's record's — else its project's; null = the
 * studio's own. `projectEntity` names a project's (its signed quote's) entity.
 */
export function costEntities(s: Pick<CostSummary, 'pos' | 'bills' | 'expenses'>, projectEntity: (projectId: string | null) => string | null) {
  const po = (p: Pick<PoRecord, 'issuingEntity' | 'projectId'>) => p.issuingEntity ?? projectEntity(p.projectId)
  const poOf = (id: string | null) => (id ? s.pos.find((x) => x.id === id) ?? null : null)
  const bill = (b: Pick<BillRecord, 'poId' | 'projectId'>) => { const p = poOf(b.poId); return p ? po(p) : projectEntity(b.projectId) }
  const expense = (e: Pick<ExpenseRecord, 'issuingEntity' | 'projectId'>) => e.issuingEntity ?? projectEntity(e.projectId)
  const payout = (p: PayoutRecord) => {
    if (p.billId) { const b = s.bills.find((x) => x.id === p.billId); if (b) return bill(b) }
    if (p.poId) { const x = poOf(p.poId); if (x) return po(x) }
    if (p.expenseId) { const e = s.expenses.find((x) => x.id === p.expenseId); if (e) return expense(e) }
    return projectEntity(p.projectId)
  }
  return { po, bill, expense, payout }
}
