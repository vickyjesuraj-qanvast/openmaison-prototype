'use client'

import { useState, type ReactNode } from 'react'
import { repeatLabel } from '@/lib/finance/repeats'   // (pending modules S06) a repeat says how often
import { Button } from '@/components/ds'
import { Chips } from '@/components/om/chips'
import { CreditsTable } from '@/components/company/plan/credits-table'
import type { TableColumnDef } from '@/components/om/table-columns'
import { displayDate } from '@/lib/format'
import { money2 } from '@/lib/quotes/math'
import type { BillView, ExpenseView, PoView } from '@/lib/finance/costs'
import { BILL_STATE_LABEL, BILL_STATE_TONE, EXPENSE_STATE_LABEL, EXPENSE_STATE_TONE, PO_STATE_LABEL, PO_STATE_TONE } from '@/lib/finance/model'
import type { ProjectCostsData } from '@/lib/finance/queries'
import { RowMenu, poStatusWords, recordLink, tagOf, type Next, type RowAction } from './cost-tables'
import { Tooltip } from '@/components/om/tooltip'
import fin from './finance.module.css'
import { useCosts } from './use-costs'
import { WhereCostsGo } from './where-costs-go'
import money from '@/components/projects/money/money.module.css'

/**
 * (gaps build F1 — F1-Q1 · Q2 · Q13) The project's Money tab, its money out: **Costs** — what the project costs the studio, beside what comes in.
 * Every figure is `costsOf`'s (lib/finance/costs.ts). `?open=<id>` lands on a PO, a bill or an expense (the bell, Activity, the search).
 * (simplify S-07 · P3 §6.2 Region 5) ONE list in one grammar with Billing: POs, bills not on a PO and expenses, newest first, a **Kind** column
 * and a Kind filter (All · Purchase orders · Bills · Expenses); a bill on a PO is its PO's money — the PO row's sub-line, never a second row.
 * Pressing a row opens today's `CostPanel` (use-costs.tsx, unchanged). The New cost ▾ moved into the tab's one New ▾ (its Costs group); the
 * three cost tiles became the To pay tile; the four cost bands became Needs you rows (lib/projects/money-needs.ts). Empty: one line with its
 * three ways in (REG-735). The tab owns the orchestrator (`useProjectCosts`) so New ▾, Needs you and `?open=…&do=` reach the same steps.
 */
export function useProjectCosts(data: ProjectCostsData) {
  const c = useCosts({ summary: data.summary, vendors: data.vendors, projects: [data.project], fixed: { project: data.project, context: data.context }, rules: data.rules, viewer: data.viewer, people: data.people, trades: data.trades, gstRate: data.context.gstRate, now: data.now, studio: data.studio, entities: data.entities, categories: data.categories })
  const locked = data.project.locked
  const can = { po: data.viewer.prepares && !locked, bill: data.viewer.recordsBill, expense: data.viewer.logs, /** (parity map, MO-098) a PO made elsewhere — Accounting too */ external: data.viewer.records && !locked }
  /** (Q-10) Order from the quote — only with a signed quote whose lines carry a cost */
  /* (pending modules S41b-1) it prices each Draft at the quote's costs — never offered to a member who doesn't see costs (they raise a PO and
     Add from the quote, entering the vendor's prices); the server refuses it to them too */
  const fromQuote = can.po && data.context.quoteLines.length > 0 && data.viewer.costs !== false
  return { c, data, summary: data.summary, can, fromQuote }
}

type Kind = 'all' | 'po' | 'bill' | 'expense'
type Row = { kind: 'po'; id: string; at: number; p: PoView } | { kind: 'bill'; id: string; at: number; b: BillView } | { kind: 'expense'; id: string; at: number; e: ExpenseView }
const DEFS: readonly TableColumnDef[] = [
  { key: 'what', label: 'What', track: 'minmax(220px, 260fr)', locked: true },
  { key: 'kind', label: 'Kind', track: 'minmax(96px, 100fr)' },
  { key: 'amount', label: 'Amount', track: 'minmax(130px, 140fr)' },
  { key: 'paid', label: 'Paid', track: 'minmax(130px, 150fr)' },
  { key: 'status', label: 'Status', track: 'minmax(170px, 200fr)' },
  { key: 'next', label: 'Next step', track: 'minmax(160px, 170fr)' },
]
const KINDS = [{ value: 'all', label: 'All' }, { value: 'po', label: 'Purchase orders' }, { value: 'bill', label: 'Bills' }, { value: 'expense', label: 'Expenses' }]
const day = (ms: number | null | undefined) => (ms ? displayDate(new Date(ms)) : '—')
/* (the calm UI build 2026-10-27 — 5-12 · 5-25 · T-08) Finance's one grammar here too: the record's name in the page's ink, the facts wrap instead of
   "…", an empty cell is "—" */
const wrap = `${money.sub} ${fin.wrapLine}`

/** (S-07) The Costs list — the tab's second list, under Billing at a desk; one of the two behind the phone's switch (Q-06). */
export function CostsSection({ h, onOrder }: { h: ReturnType<typeof useProjectCosts>; onOrder: () => void }) {
  const { c, summary: s, can, data } = h
  const [kind, setKind] = useState<Kind>('all')
  const vendor = (id: string | null) => c.vendorOf(id)?.name ?? 'Vendor'
  const byNew = (a: Row, z: Row) => z.at - a.at
  const all: Row[] = [
    ...s.pos.map((p): Row => ({ kind: 'po', id: p.id, at: p.createdAt, p })),
    ...s.bills.filter((b) => !b.poId).map((b): Row => ({ kind: 'bill', id: b.id, at: b.createdAt, b })),
    ...s.expenses.map((e): Row => ({ kind: 'expense', id: e.id, at: e.createdAt, e })),
  ].sort(byNew)
  /* the Bills filter lists every bill — a bill on a PO too (with All it is its PO's sub-line, never a second row) */
  const rows = kind === 'all' ? all : kind === 'bill' ? s.bills.map((b): Row => ({ kind: 'bill', id: b.id, at: b.createdAt, b })).sort(byNew) : all.filter((r) => r.kind === kind)
  /** A PO's sub-line: its bills, each opening its own panel (its file, Edit, Pay, Remove), else its title. */
  const poSub = (p: PoView): ReactNode => {
    const bills = p.billIds.map((id) => s.bills.find((b) => b.id === id)).filter((b): b is BillView => !!b)
    if (bills.length) return <>{bills.map((b, k) => <span key={b.id}>{k ? ' · ' : ''}<button type="button" className={money.inlineLink} onClick={() => c.openBill(b)} data-testid="bill-open">Bill {b.reference} · {money2(b.totalMinor)}{b.docId ? ' · with its file' : ''}</button></span>)}</>
    return p.title
  }
  /* (parity map, MO-038 · MO-094) one set of words with Finance's lists — a PO made elsewhere and a late delivery say so */
  const poStatus = (p: PoView) => poStatusWords(p, day)
  const nextCell = (next: Next, menu: RowAction[], label: string, title: string) => (
    <span className={money.rowActions}>
      {next ? <Button appearance="text" onPress={next.run} data-testid={next.testId}>{next.label}</Button> : null}
      <RowMenu label={label} title={title} items={menu} />
    </span>
  )
  const paidCell = (paid: number, overdue: number, balance: number) => (paid
    ? <span className={money.stack}><span className={money.num}>{money2(paid)}</span><span className={money.sub} data-tone={overdue ? 'alert' : undefined}>{overdue ? `${money2(overdue)} overdue` : balance ? `${money2(balance)} to pay` : 'Nothing to pay'}</span></span>
    : overdue ? <span className={money.stack}><span className={money.none}>—</span><span className={money.sub} data-tone="alert">{money2(overdue)} overdue</span></span> : <span className={money.none}>—</span>)
  const cell = (r: Row, key: string): ReactNode => {
    if (r.kind === 'po') {
      const p = r.p
      switch (key) {
        case 'what': { const sub = poSub(p); return <span className={money.stack}><button type="button" className={`${recordLink} ${fin.wrapLine}`} onClick={() => c.openPo(p)} data-testid="po-open">{p.number} · {vendor(p.vendorId)}</button>{sub ? <span className={wrap}>{sub}</span> : null}</span> }
        case 'kind': return <span className={money.text}>PO</span>
        case 'amount': return <span className={money.stack}><span className={money.num}>{money2(p.totalMinor)}</span>{p.advanceMinor ? <span className={money.sub}>{money2(p.advanceMinor)} advance</span> : p.gstMinor ? <span className={money.sub}>incl. {money2(p.gstMinor)} GST</span> : null}</span>
        case 'paid': return paidCell(p.paidMinor, p.overdueMinor, p.balanceMinor)
        case 'status': { const sub = poStatus(p); return <span className={money.tagStack}>{tagOf(PO_STATE_LABEL[p.state], PO_STATE_TONE[p.state])}{sub ? <span className={wrap} data-tone={p.state === 'declined' ? 'alert' : undefined}>{sub}</span> : null}</span> }
        case 'next': return nextCell(c.poNext(p), c.poMenu(p), `More actions for ${p.number}`, p.number)
        default: return null
      }
    }
    if (r.kind === 'bill') {
      const b = r.b
      switch (key) {
        case 'what': return <span className={money.stack}><button type="button" className={`${recordLink} ${fin.wrapLine}`} onClick={() => c.openBill(b)} data-testid="bill-open">{vendor(b.vendorId)}</button><span className={money.sub}>Bill {b.reference}{b.poId ? ` · on ${s.pos.find((p) => p.id === b.poId)?.number ?? 'its PO'}` : ''}{b.docId ? ' · with its file' : ''}</span></span>
        case 'kind': return <span className={money.text}>Bill</span>
        case 'amount': return <span className={money.stack}><span className={money.num}>{money2(b.totalMinor)}</span><span className={money.sub}>Due {day(b.dueOn)}</span></span>
        case 'paid': return paidCell(b.paidMinor, b.overdueMinor, b.balanceMinor)
        case 'status': return tagOf(BILL_STATE_LABEL[b.state], BILL_STATE_TONE[b.state])
        case 'next': return nextCell(c.billNext(b), c.billMenu(b), `More actions for bill ${b.reference}`, `Bill ${b.reference}`)
        default: return null
      }
    }
    const e = r.e
    switch (key) {
      case 'what': return <span className={money.stack}><button type="button" className={`${recordLink} ${fin.wrapLine}`} onClick={() => c.openExpense(e)} data-testid="expense-open">{e.description}</button><span className={money.sub}>{e.category}{e.series?.live && e.series.every ? <span data-testid="expense-repeat-words">{` · ${repeatLabel(e.series.every)}`}</span> : null}{e.paidBy === 'member' ? ` · ${c.personName(e.claimantId)}’s claim` : ''}{e.receipts.length ? ` · ${e.receipts.length} receipt${e.receipts.length === 1 ? '' : 's'}` : ''}</span></span>
      case 'kind': return <span className={money.text}>Expense</span>
      case 'amount': return <span className={money.stack}><span className={money.num}>{money2(e.amountMinor)}</span><span className={money.sub}>{day(e.spentOn)}{e.gstMinor ? ` · incl. ${money2(e.gstMinor)} GST` : ''}</span></span>
      case 'paid': return e.paidBy === 'member' ? paidCell(e.paidBackMinor, 0, e.owedMinor) : <span className={money.stack}><span className={money.text}>The studio</span><span className={money.sub}>Logged by {c.personName(e.createdBy)}</span></span>
      case 'status': { const sub = e.state === 'sent_back' && e.reviewNote ? `“${e.reviewNote}”` : e.state === 'pending' ? 'An Owner or an Admin approves it' : null
        return <span className={money.tagStack}>{tagOf(EXPENSE_STATE_LABEL[e.state], EXPENSE_STATE_TONE[e.state])}{sub ? <span className={wrap}>{sub}</span> : null}</span> }
      case 'next': return nextCell(c.expenseNext(e), c.expenseMenu(e), `More actions for ${e.description}`, e.description)
      default: return null
    }
  }
  /* (REG-735) empty: one line, its three ways in — the first filled */
  const ways = [
    ...(h.fromQuote ? [{ label: 'Order from the quote', run: onOrder, testId: 'costs-empty-order' }] : can.po ? [{ label: 'Raise a purchase order', run: () => c.newPo(), testId: 'costs-empty-po' }] : []),
    ...(can.bill ? [{ label: 'Record a bill', run: () => c.newBill(), testId: 'costs-empty-bill' }] : []),
    ...(can.expense ? [{ label: 'Log an expense', run: () => c.newExpense(), testId: 'costs-empty-expense' }] : []),
  ]
  const empty = all.length ? `No ${KINDS.find((k) => k.value === kind)?.label.toLowerCase() ?? 'costs'} on this project.` : (
    <span className={money.emptyLine}>
      <span>No costs yet{ways.length ? ' — order from the quote, record a bill or log an expense.' : ' on this project.'}</span>
      {ways.length ? <span className={money.emptyActions}>{ways.map((w, k) => <Button key={w.label} appearance={k === 0 ? 'filled' : 'outlined'} variant={k === 0 ? 'primary' : 'secondary'} onPress={w.run} data-testid={w.testId}>{w.label}</Button>)}</span> : null}
    </span>
  )
  return (
    <section id="costs" className={money.list} aria-label="Costs" data-testid="project-costs" data-list="costs">
      {/* (parity map, MO-087 · FB-031) the Costs half opens with where the committed money goes — for whoever sees the figures; none with no costs */}
      {data.viewer.seesFigures ? <WhereCostsGo rows={s.byCategory} /> : null}
      {/* (the calm UI build, W-644) one sentence of help; the PO rule behind How this works and on the row that waits */}
      <div className={fin.grows}><CreditsTable table="project-costs-list" title="Costs" testId="costs-list" defs={DEFS} rows={rows} rowKey={(r) => r.id} cell={cell}
                    help={<>{`Purchase orders, bills and the team’s expenses.${data.viewer.seesFigures ? '' : ' The totals are for Owners and Admins.'}`}{data.rules.poApproval ? <> <Tooltip label={`Over ${money2(data.rules.poLimitMinor)}, or with an advance, a PO waits for an Owner or an Admin — its row says so while it waits.`}><button type="button" className={fin.how} data-testid="costs-how">How this works</button></Tooltip></> : null}</>}
                    actions={all.length ? <Chips label="Kind" options={KINDS} value={kind} onChange={(v) => setKind(v as Kind)} testId="costs-kind" /> : undefined}
                    rowAttrs={(r) => ({ [`data-${r.kind}`]: r.id, 'data-focus': c.focus === r.id ? '' : undefined })}
                    empty={empty} /></div>
      {c.dialogs}
    </section>
  )
}
