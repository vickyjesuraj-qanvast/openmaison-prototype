'use client'

import { GhostTable, HelpLines, Line, Slot, Words } from '@/components/shell/ghost-kit'
import { GhostHowCounted, GhostPill } from '@/components/company/reports/report-pill'   // (the calm UI build 2026-10-27, R-B3-1) the page's bar
import ins from '@/components/leads/insights/insights-view.module.css'
import { StatTiles } from '@/components/om/stat-tile'
import { MEMBER_GHOST_CELL } from '@/components/leads/insights/insights-ghost'
import { useFlagPref } from '@/lib/prefs'
import tile from '@/components/om/stat-tile.module.css'
import styles from './insights.module.css'

const TILES = ['Projects started', 'Completed', 'Project length', 'Late milestones', 'Days to get paid'] as const   // (the calm UI build 2026-10-27, 5-09) the page's tile words

/**
 * (REG-708, gaps build I) Projects › Insights' own ghost — the page's layout on its own classes: the L2 header (Projects / Insights), the
 * range chips and the scope line, the tiles in their own words (Collection days for whoever saw money here last), By team member and its
 * table, the footnote. The route's `loading.tsx` and the page's PageReveal draw this same one.
 * (REG-1361) Company › Reports › Projects: the body only — the Reports ghost draws Company's frame round it.
 * (parity P-30 · P-31 · P-32 · P-35 · Q-20) the house tile row, the caption and Export at the bar's right, the waiting chip (for whoever saw one
 * here last), and the lead ghost's Member cell — avatar, name, role (it drew the avatar alone).
 */
export function ProjectInsightsGhost({ money }: { money?: boolean }) {
  const [seen] = useFlagPref('om.shape.project-insights.money', true)
  const [waiting] = useFlagPref('om.shape.project-insights.waiting', true)
  const withMoney = money ?? seen
  const tiles = withMoney ? TILES : TILES.slice(0, 4)
  return (
      <>
        {/* (the calm UI build 2026-10-27, R-B3-1) Reports' one bar: "Period: Last 90 days ▾" and Export at its end */}
        <div className={ins.pickBar}>
          <span className={ins.picks}><GhostPill name="Period" value="Last 90 days" /></span>
          <span className={ins.pickEnd}><Slot kind="btn" w={104} /></span>
        </div>
        <StatTiles className={styles.tiles}>
          {tiles.map((l, i) => (
            <div key={l} className={tile.tile}>
              <Words className={tile.label}>{l}</Words>
              <Line w={i < 2 || i === 3 ? 14 : 56} lh={24} h={20} />
              <HelpLines w={i < 2 ? 110 : 150} w2={i < 2 ? 56 : 72} />   {/* (pending modules S17) the tile's line wraps in a phone's half width */}
            </div>
          ))}
        </StatTiles>
        {waiting ? <div className={styles.awaiting}><Slot kind="chip" w={150} /></div> : null}
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <div><Words className={styles.sectionTitle}>By member</Words><Words className={styles.sectionHelp}>A project counts for everyone on its team · Running is against each person’s capacity</Words></div>
            <Slot kind="icon" desk />
          </div>
          <GhostTable head={56} row={64} rows={4} phone={{ card: 210, lines: 5 }}   /* (pending modules S39) 210: the card as it stands since the row rule left the cards */ cols={[
            { basis: 220, grow: 220, head: 52, cell: MEMBER_GHOST_CELL },
            { basis: 176, grow: 176, head: 52, cell: [36, 96] },
            { basis: 104, grow: 104, head: 48, cell: 10 },
            { basis: 120, grow: 120, head: 64, cell: 10 },
            { basis: 176, grow: 176, head: 112, cell: [48, 96] },
            { basis: 160, grow: 160, head: 100, cell: 16 },
          ]} />
        </section>
        <GhostHowCounted />   {/* (the calm UI build 2026-10-27, R-B3-1) the method behind "How these are counted" */}
      </>
  )
}
