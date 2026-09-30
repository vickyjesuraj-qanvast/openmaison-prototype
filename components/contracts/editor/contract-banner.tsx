'use client'

import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { ago } from '@/lib/templates/ago'
import { displayDate } from '@/lib/format'
import styles from '@/components/quotes/editor/template-bar.module.css'

/**
 * (REG-631, contracts parity Q-04 · Q-05 · Q-06) The contract editor's banner under the meta row — the quote's sent banner (REG-624) in
 * the contract's words. Out for signature: the document still edits, and says what an edit does to the client's open page. Signed: this
 * is the copy kept at signing; a client's online signature stays, a studio-marked one can be moved back by an Owner or an Admin.
 */
export function ContractBanner({ status, recipient, sentAt, signedAt, signedBy, now, viewedAt = null, onRecord, leadStage, onMoveWon }: {
  status: string; recipient: string; sentAt: number | null; signedAt: number | null; signedBy: string | null; now: number
  /** (REG-633, parity Q-17) the client's first open of the link */ viewedAt?: number | null
  /** (REG-633, parity Q-19) opens the signing record */ onRecord?: () => void
  /** (UX audit C1) the lead's stage, and the move on to Won while the lead isn't there — the Move stage window at Won, this contract picked */
  leadStage?: string; onMoveWon?: () => void
}) {
  if (status === 'Sent to Client') {
    return (
      <div className={styles.banner} role="status" data-testid="contract-banner" data-tone="sent">
        <span className={styles.bannerIcon}><Icon name="send" size={20} weight={300} /></span>
        <span className={styles.bannerText}>With <b>{recipient}</b> for signature{sentAt ? `, sent ${ago(sentAt, now)}` : ''}{viewedAt ? ` — opened ${ago(viewedAt, now)}` : ' — not opened yet'}. Edits reach their page when it next opens; if it is open, they are asked to read the new text before they can sign.</span>
      </div>
    )
  }
  if (status === 'Signed') {
    const on = signedAt ? ` on ${displayDate(new Date(signedAt))}` : ''
    return (
      <div className={styles.banner} role="status" data-testid="contract-banner" data-tone="sent">
        <span className={styles.bannerIcon}><Icon name="lock" size={20} weight={300} /></span>
        <span className={styles.bannerText}>
          {signedBy
            ? <><b>{signedBy}</b> signed online{on}. This is the copy they signed, kept as it was — it stays signed; duplicate it to change the terms.</>
            : <>Marked signed{on}. This is the copy kept at that moment; an Owner or an Admin can move it back from the status.</>}
          {onMoveWon && leadStage ? <> <b data-testid="contract-banner-stage">The lead is still in {leadStage}.</b></> : null}
        </span>
        {onRecord || onMoveWon ? (
          <span className={styles.bannerActions}>
            {onRecord ? <Button variant="secondary" appearance="outlined" onPress={onRecord}>Signing record</Button> : null}
            {onMoveWon ? <Button onPress={onMoveWon} data-testid="contract-move-won">Move to Won</Button> : null}
          </span>
        ) : null}
      </div>
    )
  }
  return null
}
