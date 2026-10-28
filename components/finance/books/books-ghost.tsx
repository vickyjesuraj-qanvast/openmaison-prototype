'use client'

import { GhostChip, GhostChips, GhostField, GhostTable, HelpLines, Line, Slot, Words, cycle, deskOnly, type Col } from '@/components/shell/ghost-kit'
import { PROFIT_REPORTS, REPORTS } from '@/lib/finance/reports'
import { useFirstRunShape, useSeedFlag } from '@/lib/ghost-shape'   // (pending modules S41b-1)
import { commissionAsksShape } from '@/lib/finance/sections'   // (S43D, F2-01)
import tile from '@/components/om/stat-tile.module.css'
import plan from '@/components/company/plan/plan.module.css'
import int from '@/components/company/integrations-view.module.css'
import b from './books.module.css'

/*
 * (gaps build F2 — REG-708's rule) The books tabs' ghosts, each the tab's own shape on the classes the page draws, drawn by FinanceGhost inside
 * Company's frame. (simplify S-10 · S-12 · S-13, his "build everything" 2026-10-09) The Overview became To do (finance-ghost.tsx); Commission is
 * three tiles, the table grouped by member (a member's: their projects) and the payments; Xero is its card, then the sync log; Reports (Company ›
 * Reports draws it) is the report chips, the Period select and Export, the head, the tiles and two tables.
 */
const Tiles = ({ n }: { n: 3 | 4 }) => (
  <div className={n === 3 ? b.tiles3 : b.tiles}>
    {Array.from({ length: n }, (_, i) => (
      <div key={i} className={tile.tile}>
        <Line w={cycle([96, 72, 104, 84], i)} lh={16} h={10} />
        <Line w={cycle([140, 120, 150, 110], i)} lh={24} h={20} />
        <HelpLines w={cycle(['70%', '58%', '76%', '62%'], i)} w2={cycle(['44%', '52%', '36%', '48%'], i)} />   {/* (pending modules S17) a tile's line wraps in a phone's half width */}
      </div>
    ))}
  </div>
)
const cols = (heads: number[], first = 220): Col[] => heads.map((h, i) => (i === 0
  ? { basis: first, grow: first, head: h, cell: (r: number) => [cycle(['72%', '60%', '80%'], r), cycle([64, 80, 72], r)], stick: true }
  : { basis: 130, grow: 130, head: h, cell: (r: number) => cycle([84, 96, 72], r) }))
const Table = ({ title, help, heads, rows = 4, first, columns, phone = { card: 150, lines: 3 }, testId }: { title: string; help?: string; heads: number[]; rows?: number; first?: number; columns?: Col[]; phone?: { card: number; lines: number }; testId?: string }) => (
  <section className={plan.section} data-testid={testId}>
    <div className={plan.sectionHead}>
      <div className={plan.sectionTitles}><Words as="h2" className={plan.sectionTitle}>{title}</Words>{help ? <Words className={plan.sectionHelp}>{help}</Words> : null}</div>
      <div className={plan.sectionTools}><Slot kind="icon" /></div>
    </div>
    <GhostTable cols={columns ?? cols(heads, first)} rows={rows} head={56} row={64} phone={phone} />
  </section>
)
/* (S43D, F2-01 — S17's "left as data") the asks for another rate, as the page draws them under the tiles while one is open (commissions-view.tsx
   ASK_DEFS: Member · Project and its day · Asks for · Why · the status tag · Decline / Approve) — a member's own read *Your asks*, the same columns;
   on a phone the ask's card holds its five labelled lines (210 tall, as the page's) */
const ASK_COLS: Col[] = [
  { basis: 170, grow: 170, head: 52, cell: (r) => cycle([96, 84, 104], r), stick: true },
  { basis: 200, grow: 200, head: 48, cell: (r) => [cycle(['72%', '60%', '80%'], r), 72] },
  { basis: 200, grow: 200, head: 56, cell: (r) => cycle(['70%', '62%', '76%'], r) },
  { basis: 240, grow: 240, head: 28, cell: (r) => cycle(['78%', '64%', '72%'], r) },
  { basis: 150, grow: 150, head: 44, cell: { slot: 'chip', w: 140 } },
  { basis: 170, grow: 170, head: 64, cell: { slot: 'btn', w: 128 } },
]
const Asks = ({ runs }: { runs: boolean }) => (
  <Table testId="ghost-commission-asks" title={runs ? 'Rate requests' : 'Your asks'} heads={[]} rows={1} columns={ASK_COLS} phone={{ card: 210, lines: 5 }}
         help={runs ? 'A member asks for a different rate on a project they work on. Approved, it applies to them on that project from today.' : 'What you asked for — the answer shows on the project’s rate.'} />
)
const Head = ({ title, help }: { title: string; help: string }) => (
  <div className={b.head}><Words as="h2" className={b.headTitle}>{title}</Words><Words as="p" className={b.headHelp}>{help}</Words></div>
)

export function BooksGhost({ tab, runs = true, asks: told }: { tab: string; runs?: boolean; asks?: boolean }) {
  /* (pending modules S41b-1) a role kept from profit and margin has no Profit and loss or Profitability — its Reports open on Owed to you */
  const profits = useSeedFlag('role.costs', true)
  /* (S43D, F2-01) Commission's asks band: the page's own answer in its reveal, else what this browser saw last, else the server's seed */
  const seen = useFirstRunShape(commissionAsksShape(runs))
  const asks = told ?? seen
  const reports = profits ? REPORTS : REPORTS.filter((r) => !PROFIT_REPORTS.includes(r.key))
  if (tab === 'commissions') return runs ? (
    <>
      <Tiles n={3} />
      {asks ? <Asks runs /> : null}
      {/* (the calm UI build 2026-10-27, 5-39) the page's own words: one sentence of help, "Commission paid" with none */}
      <Table title="By member" help="Each member’s commission, project by project, before GST. How this works · The rules are in Settings › Finance." heads={[96, 40, 36, 48, 32, 36, 60]} rows={6} first={250} />
      <Table title="Commission paid" heads={[52, 52, 48, 52, 32]} rows={3} first={170} />
    </>
  ) : (
    <>
      <Tiles n={3} />
      {asks ? <Asks runs={false} /> : null}
      <Table title="Your projects" help="Your share of each project and the rate that applies to you." heads={[52, 40, 36, 48, 32, 36, 60]} rows={3} />
      <Table title="Paid to you" heads={[52, 48, 52, 32]} rows={2} first={200} />
    </>
  )
  if (tab === 'reports') return (
    <>
      {/* (simplify S-13) the report chips (a select on a phone), then the Period select beside Export — (parity map, FB-065 · FB-076) ten chips
          with GST and Expenses */}
      {/* (pending modules S17) as the page sets it: on a phone the Report select, at a desk the report chips in their own words — then the Period
          select beside Export */}
      <div className={b.block}>
        <span className={`${b.search} ${b.phoneOnly}`}><GhostField /></span>
        <GhostChips labels={reports.map((r) => r.label)} className={deskOnly} />
        {/* (pending modules S41b-1) Owed to you reads no period — its toolbar is Export alone */}
        <div className={b.toolbar}>{profits ? <span className={b.search}><GhostField /></span> : null}<span className={b.toolEnd}><Slot kind="btn" w={100} /></span></div>
      </div>
      {profits ? (
        <>
          <Head title="Profit and loss" help="What was invoiced and what it cost, before GST." />
          <Tiles n={4} />
          <Table title="Revenue" help="Invoices sent in the period, less the credit notes issued in it." heads={[36, 56, 72]} rows={3} first={240} />
          <Table title="Costs by trade and category" help="POs sent, bills on no PO and approved expenses — the projects’ and the studio’s overhead." heads={[36, 56, 72]} rows={4} first={240} />
        </>
      ) : (
        <>
          <Head title={REPORTS.find((r) => r.key === 'ar')!.label} help={`${REPORTS.find((r) => r.key === 'ar')!.help}.`} />   {/* (the calm UI build 2026-10-27 — a bug fix) the report's own name, "To collect" (§2), as its page says it — the ghost had kept "Owed to you" */}
          <Tiles n={3} />
          <Table title="By how late" heads={[48, 56, 52]} rows={6} first={240} />
        </>
      )}
    </>
  )
  return (
    <>
      {/* (simplify S-11) Connect Xero, in place — (pending modules S17) the card in its own words, as a studio that has not connected it reads it */}
      <section className={int.card}>
        <div className={int.cardHead}><div className={int.titleRow}><Words as="h2" className={int.cardTitle}>Xero</Words><GhostChip label="Not connected" /></div><Words as="p" className={int.cardHelp}>The studio’s books pushed to Xero — clients and vendors as contacts, invoices sent, credit notes, the payments that count, supplier bills, approved expenses and payments out. Unapproved money is never pushed. Its connection is kept in Company › Integrations.</Words></div>
        <div className={int.row}><div className={int.emptyMail}><Words className={int.emptyTitle}>Xero is not connected</Words><Words className={int.hint}>Connect it and pick the organisation for each issuing entity; the accounts and tax codes are mapped for you.</Words></div><Slot kind="btn" w={149} /></div>
      </section>
      <Table title="Sync log" help="Every push, newest first. Disconnecting keeps it." heads={[40, 52, 24, 52, 56]} rows={5} first={170} />
    </>
  )
}
