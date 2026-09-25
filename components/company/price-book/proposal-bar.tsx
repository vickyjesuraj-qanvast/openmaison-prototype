'use client'

import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { ago } from '@/lib/templates/ago'
import styles from './price-book.module.css'

/**
 * (REG-652, price book parity Q-04) A proposed item says so at the top of its dialog — the quote editor's approval bar (REG-624) in the
 * item's own words: who proposed it and when; an Owner or an Admin gets Send back… · Approve, the proposer reads that it waits.
 */
export function ProposalBar({ by, at, now, canReview, busy = false, onApprove, onSendBack }: {
  by: string | null; at: number; now: number; canReview: boolean; busy?: boolean; onApprove: () => void; onSendBack: () => void
}) {
  return (
    <div className={styles.banner} role="status" data-testid="proposal-bar">
      <span className={styles.bannerIcon}><Icon name="approval" size={20} weight={300} /></span>
      <span className={styles.bannerText}><b>{by ?? 'A designer'}</b> proposed this item {ago(at, now)}. Until it’s approved, only their quotes use it.</span>
      {canReview ? (
        <span className={styles.bannerActions}>
          <Button appearance="text" onPress={onSendBack} isDisabled={busy}>Send back…</Button>
          <Button onPress={onApprove} isDisabled={busy}>Approve</Button>
        </span>
      ) : <span className={styles.bannerWait}>Waiting for an Owner or an Admin</span>}
    </div>
  )
}
