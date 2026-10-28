'use client'

import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { ago } from '@/lib/templates/ago'
import { displayDate } from '@/lib/format'
import { linkLife } from '@/lib/contracts/link'
import styles from '@/components/quotes/editor/template-bar.module.css'

/**
 * (REG-631, contracts parity Q-04 · Q-05 · Q-06) The contract editor's banner under the meta row — the quote's sent banner (REG-624) in
 * the contract's words. Out for signature: the document still edits, and says what an edit does to the client's open page. Signed: this
 * is the copy kept at signing; a client's online signature stays, a studio-marked one can be moved back by an Owner or an Admin.
 */
export function ContractBanner({ status, recipient, sentAt, signedAt, signedBy, now, viewedAt = null, onRecord, leadStage, onMoveWon, expiresAt = null, onResend, onSignedCopy, toRead = false }: {
  status: string; recipient: string; sentAt: number | null; signedAt: number | null; signedBy: string | null; now: number
  /** (REG-633, parity Q-17) the client's first open of the link */ viewedAt?: number | null
  /** (REG-633, parity Q-19) opens the signing record */ onRecord?: () => void
  /** (UX audit C1) the lead's stage, and the move on to Won while the lead isn't there — the Move stage window at Won, this contract picked */
  leadStage?: string; onMoveWon?: () => void
  /** (pending modules S03) when the link stops opening, and the send that opens it again (the editor's Send dialog) */
  expiresAt?: number | null; onResend?: () => void
  /** (pending modules S03) the signed copy attached on Mark as signed (or the signed PDF), opened in Files */
  onSignedCopy?: () => void
  /** (S44R — UAT row 359, call C9) a letter sent to read and keep — nothing to sign */ toRead?: boolean
}) {
  if (status === 'Sent to Client' && toRead) {
    return (
      <div className={styles.banner} role="status" data-testid="contract-banner" data-tone="sent" data-life="letter">
        <span className={styles.bannerIcon}><Icon name="send" size={20} weight={300} /></span>
        <span className={styles.bannerText}>Sent to <b>{recipient}</b> to read and keep{sentAt ? `, ${ago(sentAt, now)}` : ''}{viewedAt ? ` — opened ${ago(viewedAt, now)}` : ' — not opened yet'}. There is nothing for them to sign; edits reach their page when it next opens.</span>
      </div>
    )
  }
  if (status === 'Sent to Client') {
    const life = linkLife({ status, signExpiresAt: expiresAt ? new Date(expiresAt) : null }, now)
    const expired = life?.state === 'expired'
    return (
      <div className={styles.banner} role="status" data-testid="contract-banner" data-tone={expired ? 'changes' : 'sent'} data-life={life?.state}>
        <span className={styles.bannerIcon}><Icon name={expired ? 'schedule' : 'send'} size={20} weight={300} /></span>
        <span className={styles.bannerText}>With <b>{recipient}</b> for signature{sentAt ? `, sent ${ago(sentAt, now)}` : ''}{viewedAt ? ` — opened ${ago(viewedAt, now)}` : ' — not opened yet'}.{' '}
          {expired ? <><b data-testid="contract-link-life">{life.text}</b> — the client can’t sign until you send it again.</>
            : <>{life ? <span data-testid="contract-link-life">{life.text}. </span> : null}Edits reach their page when it next opens; if it is open, they are asked to read the new text before they can sign.</>}</span>
        {expired && onResend ? <span className={styles.bannerActions}><Button variant="secondary" appearance="outlined" onPress={onResend} data-testid="contract-resend">Send again</Button></span> : null}   {/* (the calm UI build 2026-10-27, T-03) the header's Send is the one filled press */}
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
            /* (the calm UI build 2026-10-27, 4-51 · W-254) says how and who: the status menu, an Owner or Admin */
            : <>Signed{on} — this copy is locked. An Owner or Admin can undo the signing from the status menu.</>}
          {onMoveWon && leadStage ? <> <b data-testid="contract-banner-stage">The lead is still in {leadStage}.</b></> : null}
        </span>
        {onRecord || onMoveWon || onSignedCopy ? (
          <span className={styles.bannerActions}>
            {onSignedCopy ? <Button variant="secondary" appearance="outlined" onPress={onSignedCopy} data-testid="contract-open-signed-copy">Signed copy</Button> : null}
            {onRecord ? <Button variant="secondary" appearance="outlined" onPress={onRecord}>Signing record</Button> : null}
            {onMoveWon ? <Button variant="secondary" appearance="outlined" onPress={onMoveWon} data-testid="contract-move-won">Move to Won</Button> : null}   {/* (T-03) the header's one filled press stays the signed copy */}
          </span>
        ) : null}
      </div>
    )
  }
  return null
}
