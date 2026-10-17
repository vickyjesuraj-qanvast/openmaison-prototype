'use client'

import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { ago } from '@/lib/templates/ago'
import styles from './template-bar.module.css'

/**
 * (REG-624, quote editor parity Q-22) The approval bar under the tabs — template approval's bar (REG-501) in the quote editor's own banner.
 * Waiting: who sent it for approval and when; an approver gets Request changes · Approve, anyone else reads that it waits.
 * Sent back: the approver's note with who and when, until the quote is sent again (or dismissed for this visit).
 */
export function ApprovalBar({ waiting, changes, canApprove, now, busy, onApprove, onRequestChanges, onDismiss }: {
  waiting: { by: string | null; at: number | null } | null
  changes: { by: string | null; at: number; note: string } | null
  canApprove: boolean
  now: number
  busy: boolean
  onApprove: () => void
  onRequestChanges: () => void
  onDismiss: () => void
}) {
  if (waiting) {
    return (
      <div className={styles.banner} role="status" data-testid="approval-bar" data-tone="await">
        <span className={styles.bannerIcon}><Icon name="approval" size={20} weight={300} /></span>
        <span className={styles.bannerText}><b>{waiting.by ?? 'A designer'}</b> sent this quote for approval{waiting.at ? ` ${ago(waiting.at, now)}` : ''}.</span>
        {canApprove ? (
          <span className={styles.bannerActions}>
            <Button appearance="text" onPress={onRequestChanges} isDisabled={busy}>Request changes</Button>
            <Button onPress={onApprove} isDisabled={busy}>Approve</Button>
          </span>
        ) : <span className={styles.bannerWait}>Waiting for an Owner, an Admin or the backup approver</span>}
      </div>
    )
  }
  if (changes) {
    return (
      <div className={styles.banner} role="status" data-testid="approval-bar" data-tone="changes">
        <span className={styles.bannerIcon}><Icon name="edit" size={20} weight={300} /></span>
        <span className={styles.bannerText}><b>Changes requested</b>{changes.by ? ` by ${changes.by}` : ''} {ago(changes.at, now)} — <i>{changes.note}</i> <span className={styles.bannerHint}>Send it again when it’s ready.</span></span>
        <Tooltip label="Dismiss"><IconButton icon="close" label="Dismiss" size={24} variant="bare" iconSize={20} onClick={onDismiss} /></Tooltip>
      </div>
    )
  }
  return null
}

/**
 * (REG-624, parity Q-04) No hard lock: a quote the client has — sent, confirmed or signed — still edits, and says so. The banner names what
 * the client has and offers Revise, which keeps that version whole and starts the next one.
 */
export function SentBanner({ status, version, at, confirmedBy, now, onRevise, validityEnded = null, onMove, variation = false, signedTotal = null, opened = null, markedBy = null }: { status: 'Sent to Client' | 'Confirmed' | 'Signed'; version: number; at: number | null; confirmedBy: string | null; now: number; onRevise: () => void; /** (REG-625, parity Q-29) the Valid until that has passed, while the client still has it — said, never blocked */ validityEnded?: string | null
  /** (fix-D, D-24 · REG-1055) a variation order is named as one, and approved (its Confirmed) */
  variation?: boolean
  /** (UX audit Q1) The lead is still before Quote Sent: its next stage, as the banner's own action (the Move stage window, this quote picked). */
  onMove?: (() => void) | null
  /** (pending modules S03 — 1.0 froze the contract value at signing) the total as signed, when an edit since has moved today's away from it */
  signedTotal?: string | null
  /** (pending modules S04 — 1.0's view count) the client opened it on their link since it went out: the last time, and how many times */
  opened?: { at: number; count: number } | null
  /** (S44F — NB-04) Confirmed by hand from a status menu: the member who marked it, as a variation order's record says */
  markedBy?: string | null }) {
  /* (fix-G, G-13) a date reads "on 9 Sep ’26" — never "version 1 9 Sep" */
  const said = at ? ago(at, now) : ''
  const when = at ? (/ago$|^just now$/.test(said) ? ` ${said}` : ` on ${said}`) : ''
  const noun = variation ? 'variation order' : 'quote'
  /* (pending modules S04) "they opened it" — the follow-up cue, as the contract's banner says it (REG-633) */
  const seen = opened ? <>, <b data-testid="quote-opened">opened {ago(opened.at, now)}{opened.count > 1 ? ` (${opened.count} times)` : ''}</b></> : null
  const text = status === 'Sent to Client'
    ? <>Sent to the client{when}{seen} — they have version {version}. Edits here change what they see on their link; to change the {noun} and keep what they saw, revise it.</>
    : status === 'Confirmed' && markedBy
      ? <>Marked {variation ? 'approved' : 'confirmed'} by <b data-testid="marked-by">{markedBy}</b>{when} — version {version}. To change it, revise — this version stays as it was {variation ? 'approved' : 'confirmed'}.</>
    : status === 'Confirmed'
      ? <><b>{confirmedBy ?? 'The client'}</b> {variation ? 'approved' : 'confirmed'} version {version}{when}. To change it, revise — this version stays as they {variation ? 'approved' : 'confirmed'} it.</>
      : <>Signed{when} — version {version} is the agreed quote. To change it, revise — this version stays as signed.</>
  return (
    <div className={styles.banner} role="status" data-testid="sent-banner" data-tone="sent">
      <span className={styles.bannerIcon}><Icon name={status === 'Signed' ? 'lock' : status === 'Confirmed' ? 'task_alt' : 'send'} size={20} weight={300} /></span>
      <span className={styles.bannerText}>{text}{validityEnded ? <> <b data-testid="validity-ended">Its validity ended on {validityEnded}</b> — extend {variation ? 'Valid until' : 'Quote Valid Until'} if the price still stands.</> : null}
        {signedTotal ? <> <b data-testid="signed-total">The client signed for {signedTotal}</b> — edits here don’t change the contract; a change after signing is a variation order.</> : null}</span>
      <span className={styles.bannerActions}>
        <Button variant="secondary" appearance="outlined" onPress={onRevise}>Revise — new version</Button>
        {onMove ? <Button onPress={onMove} data-testid="move-to-quote-sent">Move to Quote Sent</Button> : null}
      </span>
    </div>
  )
}
