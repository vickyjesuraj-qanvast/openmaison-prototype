import { Bone } from '@/components/shell/skeleton'
import { useSeedFlag } from '@/lib/ghost-shape'   // (pending modules S41b-1)
import { GhostTable, Line, Slot, Words, cycle, type Col, type PhoneRows } from '@/components/shell/ghost-kit'
import plan from '@/components/company/plan/plan.module.css'
import { StatTiles } from '@/components/om/stat-tile'
import tile from '@/components/om/stat-tile.module.css'
import styles from './money.module.css'

/** One list of the tab on the CreditsTable's own classes: its title and help over the table's head and rows (cards on a phone). */
function Section({ title, help, cols, rows, phone, tools = 1, list }: { title: string; help: string; cols: Col[]; rows: number; phone: PhoneRows; tools?: number; list: 'billing' | 'costs' }) {
  return (
    <section className={styles.list} data-list={list}>
      <section className={plan.section}>
        <div className={plan.sectionHead}>
          <div className={plan.sectionTitles}><Words as="h2" className={plan.sectionTitle}>{title}</Words><Words className={plan.sectionHelp}>{help}</Words></div>
          <div className={plan.sectionTools}>{tools > 1 ? <Slot kind="chip" w={cycle([44, 132, 64, 84], 0)} /> : null}<Slot kind="icon" desk /></div>
        </div>
        <GhostTable cols={cols} rows={rows} head={56} row={64} phone={phone} />
      </section>
    </section>
  )
}

const stack = (w: number[]) => (r: number) => [cycle(w, r), 60] as [number, number]

/**
 * (REG-708, Projects round 5) The Money tab's ghost — the tab's own layout, drawn through components/projects/project-ghost.tsx by the route's
 * loader and the page's PageReveal. (simplify S-07) Redrawn for the four regions: the head ("Money" · New ▾), Needs you (its heading and rows —
 * `band`, the remembered shape `lead.{id}.money`: the tab last opened with something waiting), the three tiles (To collect with its bar ·
 * To pay · Profit), the phone's Billing · Costs switch (≤767 only, as the real one), then Billing (Stage · Amount · Invoice · Paid · Next step)
 * and Costs (What · Kind · Amount · Paid · Status · Next step). At 768 the tiles stay one row (StatTiles' rule); at 390 the lists are cards.
 */
export function MoneyGhost({ band = false }: { /** (fix-D, D-39) the tab opens with Needs you rows — its heading and two rows are kept for them */ band?: boolean }) {
  /* (pending modules S41b-1) three tiles for whoever sees the books' profit (To collect · To pay · Profit), else two (To collect · To pay, or a
     Designer's Contract value) — the page's own count */
  const runs = useSeedFlag('role.runs', false), keeper = useSeedFlag('role.accounting', false)
  const books = runs || keeper
  const costs = useSeedFlag('role.costs', true)
  const tiles = books && costs ? [0, 1, 2] : [0, 1]
  return (
    <div className={styles.tab} aria-hidden>
      <div className={styles.bar}>
        <Words as="h2" className={styles.title}>Money</Words>
        <span className={styles.actions}><Slot kind="btnFold" w={96} /></span>
      </div>
      {band ? (
        <section className={styles.needs}>
          <div className={styles.needsHead}><Words as="h3" className={styles.needsTitle}>Needs you</Words></div>
          <div className={styles.banners}>{[0, 1].map((i) => <Bone key={i} w="100%" h={64} r={8} />)}</div>
        </section>
      ) : null}
      {/* (simplify round 2, R2-A) the tab's own row: at 390 To collect whole, the two others under it */}
      <StatTiles className={styles.moneyTiles}>
        {tiles.map((i) => (
          <div key={i} className={tile.tile}>
            <Line w={cycle([72, 56, 48], i)} lh={16} h={10} />
            <Line w={cycle([132, 120, 40], i)} lh={24} h={20} />
            {i === 0 ? <Bone w="100%" h={8} r="var(--om-radius-full)" /> : null}
            <Line w={cycle(['78%', '64%', '70%'], i)} lh={16} h={10} />
            {i === 0 ? <Line w="86%" lh={16} h={10} /> : null}
          </div>
        ))}
      </StatTiles>
      <div className={styles.listSwitch}><Slot kind="chip" w={72} /><Slot kind="chip" w={64} /></div>
      <div className={styles.lists} data-show="billing">
        <Section list="billing" title="Billing" help="From the signed quote’s payment schedule — each stage bills its share of the contract value, GST included." rows={4} tools={2} phone={{ card: 150, lines: 4 }} cols={[
          { basis: 170, grow: 220, head: 40, cell: stack([72, 96, 104, 84]) },
          { basis: 124, grow: 150, head: 52, cell: stack([84, 84, 84, 84]) },
          { basis: 190, grow: 260, head: 48, cell: (r) => ({ slot: 'chip', w: cycle([44, 44, 64, 44], r) }) },
          { basis: 124, grow: 170, head: 32, cell: stack([84, 84, 40, 40]) },
          { basis: 160, grow: 190, head: 64, cell: { slot: 'btn', w: 72 } },
        ]} />
        <Section list="costs" title="Costs" help="What the project costs the studio — purchase orders, bills and the team’s expenses." rows={3} tools={2} phone={{ card: 150, lines: 4 }} cols={[
          { basis: 220, grow: 260, head: 36, cell: stack([150, 170, 120]) },
          { basis: 96, grow: 100, head: 32, cell: 40 },
          { basis: 130, grow: 140, head: 52, cell: 84 },
          { basis: 130, grow: 150, head: 32, cell: 40 },
          { basis: 170, grow: 200, head: 44, cell: { slot: 'chip', w: 120 } },
          { basis: 160, grow: 170, head: 64, cell: { slot: 'btn', w: 64 } },
        ]} />
      </div>
    </div>
  )
}
