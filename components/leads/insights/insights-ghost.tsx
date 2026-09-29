import { GhostSheet, Bone } from '@/components/shell/skeleton'
import { GhostHead2, GhostTable, Line, Slot, Words } from '@/components/shell/ghost-kit'
import { LEGS, RANGES } from '@/lib/leads/tat'
import pageStyles from '@/app/leads/leads.module.css'
import chips from '@/components/om/chips.module.css'
import tile from '@/components/om/stat-tile.module.css'
import styles from './insights-view.module.css'

/**
 * (REG-708) Leads › Insights' own ghost — it drew the Leads listing's: the L2 header (Leads / Insights), the range chips and the range line,
 * the three turnaround tiles in their own words, the awaiting chip, By team member and its table, the footnote. The route's `loading.tsx`
 * and the page's PageReveal draw this same one.
 */
export function InsightsGhost() {
  return (
    <GhostSheet label="Loading insights">
      <GhostHead2 crumb={40} title={80} />
      <div className={pageStyles.content} aria-hidden>
        <div className={styles.bar}>
          <span className={chips.chips}>{RANGES.map((r) => <Slot key={r.label} kind="pill" w={r.label.length * 6.4 + 26} />)}</span>
          <Line w={250} lh={16} h={10} />
        </div>
        <div className={styles.tiles}>
          {LEGS.map((l, i) => (
            <div key={l.key} className={tile.tile}>
              <Words className={tile.label}>{l.label}</Words>
              <Line w={i === 0 ? 40 : 14} lh={24} h={20} />
              <Line w={i === 0 ? 120 : 170} lh={16} h={10} />
            </div>
          ))}
        </div>
        <div className={styles.awaiting}><Slot kind="chip" w={250} /></div>
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <div><Words className={styles.sectionTitle}>By team member</Words><Words className={styles.sectionHelp}>Outreach &amp; conversion attributed to whoever logged the first outreach</Words></div>
            <Slot kind="icon" desk />
          </div>
          {/* (REG-727) a phone gets the member cards the real table turns into, 222 tall: the member (36), then five lines — each turnaround two */}
          <GhostTable head={56} row={64} rows={3} phone={{ card: 222, lines: 5 }} cols={[
            { basis: 220, grow: 220, head: 52, cell: { node: <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}><Slot kind="avatar" /><span style={{ display: 'flex', flexDirection: 'column' }}><Line w={40} lh={20} h={12} /><Line w={36} lh={16} h={10} /></span></span> } },
            { basis: 96, grow: 96, head: 36, cell: 10 },
            { basis: 220, grow: 220, head: 140, cell: [16, 72] },
            { basis: 200, grow: 200, head: 124, cell: [16, 24] },
            { basis: 88, grow: 88, head: 28, cell: 10 },
            { basis: 180, grow: 180, head: 112, cell: { node: <Bone w={16} h={16} r={4} /> } },
          ]} />
        </section>
        <Words as="p" className={styles.foot}>Medians shown as headline (robust to outliers). Leads with no outreach yet are excluded from elapsed-time math and counted in “Awaiting outreach”.</Words>
      </div>
    </GhostSheet>
  )
}
