'use client'

import { useState } from 'react'
import { Card } from '@/components/leads/detail/card'
import { useSheetLayout } from '@/components/om/sheet'
import { dayLabel } from '@/lib/projects/schedule-model'
import { COMING_UP_SHOWN_PHONE } from '@/lib/projects/needs-you'
import type { ComingUpItem } from '@/lib/projects/queries'
import { Row } from './row'
import styles from '../project-overview.module.css'

/**
 * (simplify S-01 · P2 §6.11) COMING UP — what happens this week and next, each row opening its record: a milestone starting or ending, a task
 * with someone from outside (the carpenter, the stone supplier), and the next invoice with the milestone it waits on; when the fortnight is
 * quiet, the next three dates. ↗ the Schedule. Words invented (Q-12): *Coming up*.
 * (simplify round 2, P1 §6.4) On a phone the first three, the rest under "Show n more" — Needs you's fold, so nothing leaves the card.
 */
export function ComingUpCard({ items, link, onOpen, desk, empty, two }: { items: ComingUpItem[]; link: (to: string) => string; onOpen?: () => void
  /** (pending modules S22) the Dashboard's rows name their project under the title — the Needs you row's two lines, so a long title wraps */
  two?: boolean
  /** (pending modules S22) the Dashboard's: how many rows a desk shows before the same "Show n more" (a project's card shows them all) */
  desk?: number
  /** (pending modules S22) the quiet line — the Dashboard's fortnight is more than one schedule */
  empty?: string }) {
  const phone = useSheetLayout()
  const [more, setMore] = useState(false)
  const cap = phone ? COMING_UP_SHOWN_PHONE : desk
  const shown = cap !== undefined && !more ? items.slice(0, cap) : items
  const hidden = items.length - shown.length
  return (
    <div data-card="coming-up">
      <Card title="Coming up" headGap={8} onOpen={onOpen} openLabel={onOpen ? 'Open the schedule' : undefined} testId="coming-up">
        <div className={styles.body}>
          {items.length ? (
            <div className={styles.group}>
              {shown.map((x) => (
                <Row key={x.key} icon={x.icon} name={x.title} caption={x.caption} meta={x.day !== null ? dayLabel(x.day) : undefined} href={link(x.href)} testId="coming-up-row" two={two} wrap={!two} />
              ))}
              {cap !== undefined && (hidden > 0 || more) ? (
                <Row icon={more ? 'keyboard_arrow_up' : 'expand_more'} name={more ? 'Show less' : `Show ${hidden} more`} onPress={() => setMore((m) => !m)} testId="coming-up-more" toggle />
              ) : null}
            </div>
          ) : <p className={styles.line} data-testid="coming-up-empty">{empty ?? 'Nothing on the schedule this week or next'}</p>}
        </div>
      </Card>
    </div>
  )
}
