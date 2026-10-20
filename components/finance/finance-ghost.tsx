'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { GhostChips, GhostTable, Line, Slot, Words, cycle, type Col } from '@/components/shell/ghost-kit'
import { CompanyGhostFrame } from '@/components/company/company-ghost-frame'
import { BOOKS_TABS, FINANCE_TABS, financeTabsFor, moneyInKindOf, moneyOutKindOf, moneyOutKindsFor } from '@/lib/finance/sections'
import { BooksGhost } from './books/books-ghost'   // (gaps build F2)
import { useSeedFlag, useViewerShape } from '@/lib/ghost-shape'
import { ProLockedGhost, useLockedNow } from '@/components/credits/pro-locked-ghost'   // (pending modules S19) Expenses on Free
import { MoneyInGhostBody } from './money-in/money-in-ghost'   // (parity map, FB-013 · FB-016 · FB-012 — P-A's Money in)
import books from './books/books.module.css'
import plan from '@/components/company/plan/plan.module.css'
import fin from './finance.module.css'
import todo from './todo/todo.module.css'

/*
 * (gaps build F1 — REG-708's rule) Finance's ghost, one per tab, each the tab's own shape: the L1 header and the tab strip (Company's frame), the
 * toolbar, then the tab's tables with their section heads — the same classes the page draws, so the hand-over from the route's loading.tsx to the
 * page's PageReveal is invisible. `tab` from the page; the loader reads it from the address.
 * (simplify S-10 · S-11, his "build everything" 2026-10-09) To do (the toolbar — search · the group chips · New ▾ — then To approve · To pay · To
 * collect · Stuck, or a member's four) and Money out (search · the kind switch · the Status pill · New ▾, then the kind's table, `?kind=` read
 * from the address); Vendors as it was; Commission and Xero are the books' (books-ghost.tsx). A member's strip has four tabs — the page's own
 * reveal knows; the route's loader, which cannot ask who is signed in, draws the Owners' five.
 */
const KIND_COLS: Record<string, { title: string; help: string; cols: Col[] }> = {
  'purchase-orders': { title: 'Purchase orders', help: 'S$54,321.00 committed across the studio · S$18,000.00 still to pay', cols: [
    { basis: 220, grow: 220, head: 110, cell: (r) => [cycle([92, 92, 92], r), cycle(['70%', '54%', '62%'], r)], stick: true },
    { basis: 200, grow: 200, head: 52, cell: (r) => cycle(['78%', '64%', '72%'], r) },
    { basis: 190, grow: 190, head: 52, cell: (r) => cycle(['70%', '58%', '76%'], r) },
    { basis: 130, grow: 130, head: 56, cell: [84, 96] },
    { basis: 150, grow: 150, head: 34, cell: (r) => (r % 2 ? 24 : [84, 92]) },
    { basis: 210, grow: 210, head: 46, cell: { slot: 'chip', w: 96 } },
    { basis: 170, grow: 170, head: 70, cell: { slot: 'btn', w: 96 } },
  ] },
  bills: { title: 'Supplier bills', help: 'Supplier bills on every project and the studio’s overhead.', cols: [
    { basis: 220, grow: 220, head: 30, cell: (r) => [cycle(['72%', '60%', '80%'], r), 64], stick: true },
    { basis: 190, grow: 190, head: 52, cell: (r) => cycle(['70%', '62%', '74%'], r) },
    { basis: 120, grow: 120, head: 24, cell: 84 },
    { basis: 110, grow: 110, head: 44, cell: 72 },
    { basis: 120, grow: 120, head: 30, cell: 72 },
    { basis: 130, grow: 130, head: 56, cell: 84 },
    { basis: 150, grow: 150, head: 46, cell: { slot: 'chip', w: 72 } },
    { basis: 150, grow: 150, head: 70, cell: { slot: 'btn', w: 56 } },
  ] },
  expenses: { title: 'Expenses', help: 'Every expense and claim — on projects and the studio’s overhead.', cols: [
    { basis: 240, grow: 240, head: 56, cell: (r) => [cycle(['78%', '60%', '70%'], r), 90], stick: true },
    { basis: 190, grow: 190, head: 52, cell: (r) => cycle(['70%', '62%', '74%'], r) },
    { basis: 110, grow: 110, head: 52, cell: 72 },
    { basis: 130, grow: 130, head: 56, cell: [72, 90] },
    { basis: 170, grow: 170, head: 64, cell: [80, 96] },
    { basis: 200, grow: 200, head: 46, cell: { slot: 'chip', w: 120 } },
    { basis: 150, grow: 150, head: 70, cell: { slot: 'btn', w: 72 } },
  ] },
  paid: { title: 'Payments out', help: 'S$12,345.00 paid out — a payment is recorded from its PO, bill or claim.', cols: [
    { basis: 220, grow: 220, head: 52, cell: (r) => [cycle(['70%', '58%', '76%'], r), 80], stick: true },
    { basis: 200, grow: 200, head: 30, cell: (r) => cycle(['62%', '74%', '56%'], r) },
    { basis: 190, grow: 190, head: 52, cell: (r) => cycle(['70%', '62%', '74%'], r) },
    { basis: 110, grow: 110, head: 52, cell: 72 },
    { basis: 130, grow: 130, head: 56, cell: 84 },
    { basis: 170, grow: 170, head: 30, cell: [90, 70] },
    { basis: 72, grow: 72, head: null, cell: { slot: 'icon' } },
  ] },
}
/** (S42 audit C-27) The header's *Reports ›* link, as wide as it reads. */
const REPORTS_DOOR_W = 61
const VENDOR_COLS: Col[] = [
  { basis: 240, grow: 240, head: 52, cell: (r) => [cycle(['72%', '60%', '80%'], r), 72], stick: true },
  { basis: 190, grow: 190, head: 52, cell: [96, 80] },
  { basis: 110, grow: 110, head: 30, cell: 80 },
  { basis: 80, grow: 80, head: 30, cell: 16 },
  { basis: 130, grow: 130, head: 66, cell: 84 },
  { basis: 130, grow: 130, head: 40, cell: 72 },
  { basis: 130, grow: 130, head: 46, cell: { slot: 'chip', w: 60 } },
  { basis: 72, grow: 72, head: null, cell: { slot: 'icon' } },
]
/* To do's four column sets (todo-workspace.tsx DEFS): the first column two lines, the action a text button and ⋮ */
const todoCols = (heads: number[], first: number, tracks: number[]): Col[] => heads.map((h, i) => (i === 0
  ? { basis: first, grow: first, head: h, cell: (r: number) => [cycle(['74%', '58%', '66%'], r), cycle(['52%', '64%', '40%'], r)], stick: true }
  : i === heads.length - 1 ? { basis: tracks[i - 1]!, grow: tracks[i - 1]!, head: h, cell: { slot: 'btn', w: cycle([110, 72, 96], i) } }
  : { basis: tracks[i - 1]!, grow: tracks[i - 1]!, head: h, cell: (r: number) => cycle(['72%', '56%', '64%'], r + i) }))
const TODO_SHAPES = {
  approve: todoCols([32, 52, 60, 56, 88, 70], 260, [170, 140, 130, 240, 190]),
  pay: todoCols([20, 24, 52, 30, 56, 70], 210, [200, 170, 170, 140, 170]),
  collect: todoCols([40, 52, 52, 30, 56, 70], 190, [230, 170, 180, 140, 210]),
  quiet: todoCols([32, 52, 36, 56, 88, 70], 280, [170, 150, 130, 220, 170]),
}
const RUNNER_TODO: { title: string; help: string; shape: keyof typeof TODO_SHAPES; rows: number }[] = [
  { title: 'To approve', help: '3 waiting for you · S$5,568.07', shape: 'approve', rows: 3 },
  { title: 'To pay', help: 'S$19,002.20 to pay · S$9,030.00 overdue', shape: 'pay', rows: 8 },   // (pending modules S17) the demo's groups as the page shows them
  { title: 'To collect', help: 'S$34,802.98 owed on 4 invoices', shape: 'collect', rows: 4 },
  { title: 'Stuck', help: '1 waiting on someone else', shape: 'quiet', rows: 1 },
]
/** (parity map, MO-098) Accounting's To do (lib/finance/todo.ts BOOKS_GROUPS): pay, collect, unstick — then what waits for an Owner or an Admin. */
const BOOKS_TODO: typeof RUNNER_TODO = [
  { title: 'To pay', help: 'S$19,002.20 to pay · S$1,400.00 overdue', shape: 'pay', rows: 4 },
  { title: 'To collect', help: 'S$34,802.98 owed on 3 invoices', shape: 'collect', rows: 3 },
  { title: 'Stuck', help: '2 waiting on someone else', shape: 'quiet', rows: 2 },
  { title: 'Waiting for approval', help: '3 for an Owner or an Admin · S$5,568.07', shape: 'approve', rows: 3 },
]
const MEMBER_TODO: typeof RUNNER_TODO = [
  { title: 'Your drafts', help: '1 to change or send', shape: 'quiet', rows: 1 },
  { title: 'Sent back to you', help: 'Nothing sent back', shape: 'quiet', rows: 0 },
  { title: 'Vendors who answered', help: '1 to change', shape: 'quiet', rows: 1 },
  { title: 'Your claims', help: '2 · S$124.90', shape: 'quiet', rows: 2 },
]

/* (parity map, MO-084) To do ends with Recently — its head, then five rows: the kind's chip, what happened over its project and when, the amount */
const RecentGhost = ({ runs }: { runs: boolean }) => (
  <section className={plan.section}>
    <div className={plan.sectionHead}>
      <div className={plan.sectionTitles}><Words as="h2" className={plan.sectionTitle}>Recently</Words><Words className={plan.sectionHelp}>{runs ? 'The newest money in and out across the studio' : 'The newest money out on your projects'}</Words></div>
    </div>
    <ul className={todo.recent}>
      {[0, 1, 2, 3, 4].map((r) => (
        <li key={r} className={todo.recentRow}>
          <span className={todo.recentKind}><Slot kind="chip" w={cycle([52, 40, 64], r)} /></span>
          <span className={todo.recentText}><Line w={cycle(['62%', '48%', '56%'], r)} lh={20} h={12} /><Line w={cycle(['34%', '40%', '28%'], r)} lh={16} h={10} /></span>
          <span className={todo.recentAmount}><Line w={84} lh={20} h={12} /></span>
        </li>
      ))}
    </ul>
  </section>
)

const Section = ({ title, help, cols, rows, card = 222 }: { title: string; help: string; cols: Col[]; rows: number; /** (pending modules S17) a phone's card as the page's stack draws the table's row */ card?: number }) => (
  <section className={plan.section}>
    <div className={plan.sectionHead}>
      <div className={plan.sectionTitles}><Words as="h2" className={plan.sectionTitle}>{title}</Words><Words className={plan.sectionHelp}>{help}</Words></div>
      {rows ? <div className={plan.sectionTools}><Slot kind="icon" desk /></div> : null}
    </div>
    {rows ? <GhostTable cols={cols} rows={rows} head={56} row={64} phone={{ card, lines: 5 }} /> : null}
  </section>
)

export function FinanceGhost({ tab: given, runs: told, asks }: { tab?: string; runs?: boolean; asks?: boolean }) {
  const pathname = usePathname()
  const params = useSearchParams()
  const tab = given ?? FINANCE_TABS.find((t) => pathname.startsWith(t.href))?.key ?? FINANCE_TABS[0]!.key
  const keeper = useViewerShape('role.accounting')   // (parity map, MO-098) Accounting's To do draws its own groups
  /* (S42 audit C-27) the page's own `runs` (who sees the books — Owners, Admins, Accounting); the route's loader reads it from the shell's seed
     now (a member's strip, and no Reports ›), where it drew the Owners' always */
  const seedRuns = useSeedFlag('role.runs', true)
  const seedCrews = useSeedFlag('fin.contractors', false)   // (S45B) Vendors' *Contractors* chip, while an active vendor works on site
  const crews = seedCrews || params.get('show') === 'contractors'   // … or when the address opens on it, as the page's rule
  const runs = told ?? (seedRuns || keeper)
  const labels = financeTabsFor(runs).map((t) => t.label)
  const expLocked = useLockedNow('expense_management')   // (pending modules S19) on Free, Money out › Expenses is the lock
  /* (S42 C-27) the header's door to the numbers — *Reports ›* (finance-frame.tsx), for whoever sees the books */
  const at = financeTabsFor(runs).findIndex((t) => t.key === tab)   // (S42 audit A-10) the ghost's strip opens on the page's own tab
  const frame = (body: React.ReactNode) => <CompanyGhostFrame title={74} tabs={labels} active={at} label="Loading Finance" actions={runs ? [REPORTS_DOOR_W] : []}>{body}</CompanyGhostFrame>
  /* (gaps build F2) the books' tabs draw their own shapes */
  if (BOOKS_TABS.includes(tab)) return frame(<div className={books.page}><BooksGhost tab={tab} runs={runs} asks={asks} /></div>)   // (S43D, F2-01) `asks` from the page's reveal
  /* (pending modules S17) the tab's chips are the house chips (32, 44 with a finger), its search the 36 search bar — the ghost drew 20 tall tags and a 48 field */
  const chipRow = (ws: number[], rail = false) => <GhostChips widths={ws} rail={rail} />
  /* a phone's toolbar (finance.module.css phoneTools): the search and the "+" on one row, the chips on the next (then Money out's Status pill) */
  const phoneTools = (chips: number[], pill = false, labels?: string[]) => (
    <div className={`${fin.phoneTools} ${fin.ghostPhone}`}>
      <div className={fin.phoneBar}><span className={fin.phoneSearch} style={{ display: 'flex' }}><Slot kind="btn" w="100%" /></span><Slot kind="icon" /></div>
      <div className={fin.kindRail}>{labels ? <GhostChips labels={labels} rail /> : chipRow(chips, true)}</div>
      {pill ? <span className={fin.inlineRow}><Slot kind="btn" w={72} /></span> : null}   {/* (pending modules S17) the scope pill, "All ▾" on a phone */}
    </div>
  )
  /* (parity map, MO-098) the chips and groups of the To do this viewer reads: a runner's, Accounting's (approves nothing) or a member's */
  const todoChips = runs ? (keeper ? [64, 80, 96, 64, 168] : [64, 108, 82, 100, 74]) : [64, 104, 92, 136, 100]
  /* (pending modules S17) an Owner's or an Admin's groups as the demo has them — the chips' own words (with their counts), so a phone's wider
     chips are drawn as wide; the other viewers' chips keep their desk widths */
  const todoLabels = runs && !keeper ? ['All · 16', 'To approve · 3', 'To pay · 8', 'To collect · 4', 'Stuck · 1'] : undefined
  if (tab === 'todo') return frame(
    <div className={todo.page}>
      <div className={`${fin.toolbar} ${fin.ghostDesk}`}>
        <span className={fin.search} style={{ display: 'flex' }}><Slot kind="btn" w="100%" /></span>
        {todoLabels ? <GhostChips labels={todoLabels} /> : chipRow(todoChips)}
        <span className={fin.toolEnd}><Slot kind="btn" w={110} /></span>
      </div>
      {phoneTools(todoChips, false, todoLabels)}
      {(runs ? (keeper ? BOOKS_TODO : RUNNER_TODO) : MEMBER_TODO).map((g) => <Section key={g.title} title={g.title} help={g.help} cols={TODO_SHAPES[g.shape]} rows={g.rows} />)}
      <RecentGhost runs={runs} />
    </div>,
  )
  if (tab === 'vendors') return frame(
    <div className={fin.page}>
      <div className={fin.toolbar}>
        <span className={fin.search} style={{ display: 'flex' }}><Slot kind="btn" w="100%" /></span>
        <GhostChips widths={crews ? [85, 114, 90, 63] : [85, 90, 63]} />   {/* (pending modules S17) Active · Inactive · All — house chips, 44 with a finger; (S45B) Contractors second while the page shows it */}
        <span className={fin.toolEnd}><Slot kind="btn" w={138} /></span>
      </div>
      <Section title="Vendors" help="The studio’s sub-contractors and suppliers. Merge a duplicate into the one that stays; deactivate one you no longer use." cols={VENDOR_COLS} rows={7} card={270} />
    </div>,
  )
  /* (parity map — P-A) Money in: its own body, the kind from the address */
  if (tab === 'money-in') return frame(<MoneyInGhostBody kind={moneyInKindOf(params.get('kind'))} />)
  /* Money out: the kind the address asks for */
  const kind = moneyOutKindOf(params.get('kind'), runs)
  const g = KIND_COLS[kind] ?? KIND_COLS['purchase-orders']!
  const kindWidths: Record<string, number> = { 'purchase-orders': 128, bills: 56, expenses: 80, paid: 52 }
  const kindChips = moneyOutKindsFor(runs).map((k) => kindWidths[k.key] ?? 80)
  const kindLabels = moneyOutKindsFor(runs).map((k) => k.label)   // (pending modules S17) the kinds' own words
  return frame(
    <div className={fin.page}>
      <div className={`${fin.toolbar} ${fin.ghostDesk}`}>
        <span className={fin.search} style={{ display: 'flex' }}><Slot kind="btn" w="100%" /></span>
        <GhostChips labels={kindLabels} />
        <Slot kind="btn" w={127} />   {/* (pending modules S17) the Status scope pill: 36 */}
        <span className={fin.toolEnd}><Slot kind="btn" w={110} /></span>
      </div>
      {phoneTools(kindChips, true, kindLabels)}
      <div className={fin.kindBody}>{kind === 'expenses' && expLocked ? <ProLockedGhost feature="expense_management" /> : <Section title={g.title} help={g.help} cols={g.cols} rows={7} card={264} />}</div>
    </div>,
  )
}
