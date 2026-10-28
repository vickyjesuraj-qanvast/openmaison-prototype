'use client'

import { usePathname } from 'next/navigation'
import { GhostChips, GhostTable, Slot, Words, cycle, type Col } from '@/components/shell/ghost-kit'
import { MONEY_IN_KINDS, type MoneyInKind } from '@/lib/finance/sections'
import { FinanceGhost } from '../finance-ghost'
import plan from '@/components/company/plan/plan.module.css'
import fin from '../finance.module.css'

/*
 * (parity map 2026-10-10 — FB-013 · FB-016 · FB-012, REG-708's rule) Money in's ghost — the page's own shape: Company's frame (the L1 header and the
 * strip, Money in second), the toolbar (search · the four kinds · the Status pill · Export; on a phone the search and Export's icon, the kinds'
 * rail, the pill), then the kind's table under its section head — the same classes the page draws. The kind is read from the address (`?kind=`).
 * `MoneyInLoading` is the route loader's Money in branch: the route's loader can't be told the tab, so it reads the path and hands every other tab
 * to Finance's own ghost.
 */
const COLS: Record<MoneyInKind, { help: string; cols: Col[] }> = {
  invoices: { help: 'S$34,802.98 to collect on 3 invoices · S$20,784.94 overdue. Sent invoices and Drafts ready to send. How this works', cols: [
    { basis: 200, grow: 200, head: 52, cell: (r) => [cycle([104, 96, 112], r), cycle(['62%', '74%', '54%'], r)], stick: true },
    { basis: 240, grow: 240, head: 52, cell: (r) => [cycle(['80%', '66%', '72%'], r), cycle([96, 84, 110], r)] },
    { basis: 210, grow: 210, head: 46, cell: (r) => ({ slot: 'chip', w: cycle([64, 96, 52], r) }) },
    { basis: 130, grow: 130, head: 34, cell: 84 },
    { basis: 130, grow: 130, head: 30, cell: (r) => (r % 3 ? 84 : 24) },
    { basis: 130, grow: 130, head: 70, cell: (r) => (r % 2 ? 24 : 84) },   /* (the calm UI build) "To collect" */
    { basis: 140, grow: 140, head: 28, cell: [80, 64] },
    { basis: 130, grow: 130, head: 70, cell: { slot: 'btn', w: 48 } },
  ] },
  payments: { help: 'S$120,560.00 confirmed. Every client payment — confirmed with its receipt, or sent from the portal and waiting to be confirmed. How this works', cols: [
    { basis: 170, grow: 170, head: 52, cell: (r) => [cycle([96, 104, 88], r), 112], stick: true },
    { basis: 180, grow: 180, head: 52, cell: [96, 80] },
    { basis: 240, grow: 240, head: 52, cell: (r) => [cycle(['80%', '66%', '72%'], r), 96] },
    { basis: 130, grow: 130, head: 52, cell: 84 },
    { basis: 160, grow: 160, head: 52, cell: [80, 110] },
    { basis: 200, grow: 200, head: 46, cell: { slot: 'chip', w: 80 } },
    { basis: 130, grow: 130, head: 70, cell: { slot: 'btn', w: 88 } },
  ] },
  variations: { help: 'Every variation order on the projects. How this works', cols: [
    { basis: 260, grow: 260, head: 104, cell: (r) => [40, cycle(['72%', '58%', '66%'], r)], stick: true },
    { basis: 240, grow: 240, head: 52, cell: (r) => [cycle(['80%', '66%', '72%'], r), 96] },
    { basis: 140, grow: 140, head: 52, cell: 84 },
    { basis: 240, grow: 240, head: 46, cell: { slot: 'chip', w: 120 } },
    { basis: 130, grow: 130, head: 70, cell: { slot: 'btn', w: 48 } },
  ] },
  credits: { help: 'Every credit note and the refunds recorded on them. How this works', cols: [
    { basis: 240, grow: 240, head: 80, cell: (r) => [96, cycle(['70%', '56%', '64%'], r)], stick: true },
    { basis: 160, grow: 160, head: 52, cell: 96 },
    { basis: 240, grow: 240, head: 52, cell: (r) => [cycle(['80%', '66%', '72%'], r), 96] },
    { basis: 130, grow: 130, head: 52, cell: 84 },
    { basis: 130, grow: 130, head: 46, cell: 84 },
    { basis: 170, grow: 170, head: 46, cell: { slot: 'chip', w: 56 } },
    { basis: 130, grow: 130, head: 70, cell: { slot: 'btn', w: 48 } },
  ] },
}

/** The body under Company's frame — Finance's frame (`FinanceGhost`'s `frame`) draws around it. */
export function MoneyInGhostBody({ kind }: { kind: MoneyInKind }) {
  const g = COLS[kind]
  /* (pending modules S17) the kinds are the house chips in their own words (32, 44 with a finger); the search the 36 bar; Status the 36 scope pill */
  const labels = MONEY_IN_KINDS.map((k) => k.label)
  return (
    <div className={fin.page}>
      <div className={`${fin.toolbar} ${fin.ghostDesk}`}>
        <span className={fin.search} style={{ display: 'flex' }}><Slot kind="btn" w="100%" /></span>
        <GhostChips labels={labels} />
        <Slot kind="btn" w={127} />
        <span className={fin.toolEnd}><Slot kind="btn" w={104} /></span>
      </div>
      <div className={`${fin.phoneTools} ${fin.ghostPhone}`}>
        <div className={fin.phoneBar}><span className={fin.phoneSearch} style={{ display: 'flex' }}><Slot kind="btn" w="100%" /></span><Slot kind="icon" /></div>
        <div className={fin.kindRail}><GhostChips labels={labels} rail /></div>
        <span className={fin.inlineRow}><Slot kind="btn" w={127} /></span>   {/* (the calm UI build, 5-10) "Status: All ▾", named on a phone */}
      </div>
      <div className={fin.kindBody}>
        <section className={plan.section}>
          <div className={plan.sectionHead}>
            <div className={plan.sectionTitles}><Words as="h2" className={plan.sectionTitle}>{MONEY_IN_KINDS.find((k) => k.key === kind)!.label}</Words><Words className={plan.sectionHelp}>{g.help}</Words></div>
            <div className={plan.sectionTools}><Slot kind="icon" desk /></div>
          </div>
          <GhostTable cols={g.cols} rows={7} head={56} row={64} phone={{ card: 196, lines: 4 }} />   {/* (the calm UI build, 5-10) a phone's card on the Leads model (finance-cards.tsx) */}
        </section>
      </div>
    </div>
  )
}

/** The whole ghost — Company's frame around the body — for the page's own reveal and the route's loader. (S42 audit C-27) Finance's own frame
    (finance-ghost.tsx) draws it, so the loader's header carries the *Reports ›* door and the viewer's strip exactly as the page's reveal does. */
export function MoneyInGhost({ runs }: { runs?: boolean }) {
  return <FinanceGhost tab="money-in" runs={runs} />
}

/** The route loader's Money in branch: Money in's ghost on its address, Finance's own ghost on every other tab. */
export function MoneyInLoading() {
  const pathname = usePathname()
  return pathname.startsWith('/company/finance/money-in') ? <MoneyInGhost /> : <FinanceGhost />
}
