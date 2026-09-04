'use client'

import type { ReactNode } from 'react'
import { Avatar } from '@/components/om/avatar'
import { Icon } from '@/components/om/icon'
import { MetaChip } from '@/components/om/meta-chip'
import type { LeadReturn, Member } from '@/lib/db/schema'
import { displayDateTimeTight, money } from '@/lib/format'
import { returnTags } from '@/lib/leads/return-tags'
import { Card } from './card'
import styles from './returned-card.module.css'

/**
 * LEAD RETURNED card (processing 858:25188 · rejected + appeal 858:24095 · approved 858:24144).
 * Spec: design-source/context/lead-overview/05-*.txt.
 */
export function LeadReturnedCard({ ret, returnedBy, onView, onAppeal, onOpenTab }: {
  ret: LeadReturn
  returnedBy: Member | null
  onView: () => void
  onAppeal: () => void
  onOpenTab: () => void
}) {
  const showAppeal = ret.status === 'rejected' && !!ret.appealDays
  const repliedOn = ret.repliedAt ? displayDateTimeTight(ret.repliedAt) : null

  // Qanvast's reply identity (858:24095): 20×20 r4 logo + "Qanvast - Business Team".
  const repliedBy = (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/figma-assets/qanvast-avatar.png" width={20} height={20} alt="" className={styles.logo} />
      <span className={styles.name}>{ret.repliedBy}</span>
    </>
  )
  /* The status tags follow the same `returnTags` mapping as the header chips and the Qanvast Ops status column (lib/leads/
     return-tags.ts): Return Processing (yellow) · Return Rejected (red) · Return Approved + Refund Processing (yellow) until the
     credit lands, then Refund Credited (green) — the board dump's "RETURN CREDITED" is the credited state only. The DS Tag
     uppercases the text itself. */
  const statusTags = (
    <span className={styles.chips}>
      {returnTags(ret).map((t) => <MetaChip key={t.label} color={t.color}>{t.label}</MetaChip>)}
    </span>
  )

  let rows: { key: string; value: ReactNode }[]
  if (ret.status === 'approved') {
    rows = [
      { key: 'Return status', value: statusTags },
      { key: 'Replied by', value: repliedBy },
      { key: 'Replied on', value: repliedOn },
      // Stored lowercase (`credited` / `processing`); printed the way the mock types it ("Credited").
      { key: 'Refund status', value: ret.refundStatus === 'credited' ? 'Credited' : 'Processing' },
      { key: 'Credit amount', value: ret.creditAmountMinor != null ? money(ret.creditAmountMinor) : null },
    ]
  } else if (ret.status === 'rejected') {
    rows = [
      { key: 'Return status', value: statusTags },
      { key: 'Replied by', value: repliedBy },
      { key: 'Replied on', value: repliedOn },
      { key: 'Status', value: ret.statusText },
      // The rejected mock (858:24095) prints Qanvast's reason from the reply; our own return reason stands in until they reply.
      { key: 'Reason', value: ret.replyReason ?? ret.reason },
    ]
  } else {
    rows = [
      { key: 'Return status', value: statusTags },
      { key: 'Returned by', value: returnedBy ? (
        <>
          {/* Avatar Generic 20 r4 (858:25188) — om/avatar size 20 */}
          <Avatar name={returnedBy.name} color={returnedBy.color} size={20} tooltip={false} />
          <span className={styles.name}>{returnedBy.name}</span>
        </>
      ) : null },
      { key: 'Returned on', value: displayDateTimeTight(ret.returnedAt) },
      { key: 'Reason', value: ret.reason },
    ]
  }

  return (
    <Card title="LEAD RETURNED" headGap={12} onOpen={onOpenTab} openLabel="Open lead return" testId="lead-returned">
      <div className={styles.body} data-banner={showAppeal || undefined}>
        {showAppeal ? (
          <button type="button" className={styles.banner} onClick={onAppeal}>
            <span className={styles.bannerText}>
              Submit an appeal within <b>{`${ret.appealDays} days`}</b> with more supporting documents/information here.
            </span>
            <span className={styles.bannerIcon}><Icon name="chevron_right" size={24} /></span>
          </button>
        ) : null}
        <dl className={styles.kv}>
          {rows.map((r) => (
            <div key={r.key} className={styles.row}>
              <dt className={styles.key}>{r.key}</dt>
              {/* Plain values keep the 36px row: one line, ENDING ellipsis (mock: "Homeowner did not shortlist ID to pro…"), full text on hover. */}
              <dd className={styles.val}>{typeof r.value === 'string' ? <span className={styles.name} title={r.value}>{r.value}</span> : r.value}</dd>
            </div>
          ))}
        </dl>
        <div className={styles.footer}>
          <button type="button" className={styles.view} onClick={onView}>
            View Details
            <Icon name="keyboard_arrow_right" size={20} />
          </button>
        </div>
      </div>
    </Card>
  )
}
