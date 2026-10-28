'use client'

import Link from 'next/link'
import { Avatar } from '@/components/om/avatar'
import { StatTile, StatTiles } from '@/components/om/stat-tile'
import { useHere } from '@/components/om/use-here'
import { Card } from '@/components/leads/detail/card'
import { withFrom } from '@/lib/nav'
import type { HangoutView } from '@/lib/hangouts/queries'
import { LEADS_LINK, leadsLine, resultTiles } from './results-words'
import styles from './hangouts.module.css'

/**
 * (pending modules S27) How a Hangout went — 1.0's owner Dashboard (OwnerDashboardTab): the number tiles (chats held of those promised,
 * converted and its rate, follow-ups, dropped) and each designer's chats as the card table (1.0's ID Performance). Everyone who booked is a
 * lead — the line under the tiles opens them in Leads (the words: results-words.ts).
 */
export function ResultsView({ data }: { data: HangoutView }) {
  const here = useHere(`/qanvast-ops/hangouts/${data.event.id}`)
  const r = data.results
  return (
    <div className={styles.section} data-testid="hangout-results">
      <StatTiles testId="hangout-tiles">
        {resultTiles(r).map((t) => <StatTile key={t.key} label={t.label} value={t.value} help={t.help} testId={`tile-${t.key}`} />)}
      </StatTiles>
      <p className={styles.help} data-testid="hangout-leads-line">{leadsLine(r)}<Link className={styles.whoLink} href={withFrom('/leads?source=Hangout', here)}>{LEADS_LINK}</Link></p>
      {/* (the calm UI build 2026-10-27, 2-14 · W-491) the studio's people are Members — the card's and the head's word */}
      <Card title="By member" testId="hangout-by-designer">
        <div className={styles.cardBody}>
          <div className={styles.byTable} role="table" aria-label="Chats by member" data-card-table="">
            <div className={styles.byHead} role="row"><span role="columnheader">Member</span><span role="columnheader" className={styles.num}>Chats</span><span role="columnheader" className={styles.num}>Converted</span><span role="columnheader" className={styles.num}>Follow-up</span><span role="columnheader" className={styles.num}>Dropped</span></div>
            {r.byDesigner.map((d) => (
              <div key={d.memberId} className={styles.byRow} role="row" data-testid="by-designer-row">
                <span role="cell" className={styles.who}><Avatar name={d.name} color={d.color} size={24} tooltip={false} /><span className={styles.whoName}>{d.name}</span></span>
                <span role="cell" className={styles.num}>{d.meetings}</span><span role="cell" className={styles.num}>{d.converted}</span><span role="cell" className={styles.num}>{d.followUp}</span><span role="cell" className={styles.num}>{d.dropped}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  )
}
