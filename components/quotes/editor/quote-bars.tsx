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
export function SentBanner({ status, version, at, confirmedBy, now, onRevise, validityEnded = null, onMove }: { status: 'Sent to Client' | 'Confirmed' | 'Signed'; version: number; at: number | null; confirmedBy: string | null; now: number; onRevise: () => void; /** (REG-625, parity Q-29) the Valid until that has passed, while the client still has it — said, never blocked */ validityEnded?: string | null
  /** (UX audit Q1) The lead is still before Quote Sent: its next stage, as the banner's own action (the Move stage window, this quote picked). */
  onMove?: (() => void) | null }) {
  const when = at ? ` ${ago(at, now)}` : ''
  const text = status === 'Sent to Client'
    ? <>Sent to the client{when} — they have version {version}. Edits here change what they see on their link; to change the quote and keep what they saw, revise it.</>
    : status === 'Confirmed'
      ? <><b>{confirmedBy ?? 'The client'}</b> confirmed version {version}{when}. To change it, revise — this version stays as they confirmed it.</>
      : <>Signed{when} — version {version} is the agreed quote. To change it, revise — this version stays as signed.</>
  return (
    <div className={styles.banner} role="status" data-testid="sent-banner" data-tone="sent">
      <span className={styles.bannerIcon}><Icon name={status === 'Signed' ? 'lock' : status === 'Confirmed' ? 'task_alt' : 'send'} size={20} weight={300} /></span>
      <span className={styles.bannerText}>{text}{validityEnded ? <> <b data-testid="validity-ended">Its validity ended on {validityEnded}</b> — extend Quote Valid Until if the price still stands.</> : null}</span>
      <span className={styles.bannerActions}>
        <Button variant="secondary" appearance="outlined" onPress={onRevise}>Revise — new version</Button>
        {onMove ? <Button onPress={onMove} data-testid="move-to-quote-sent">Move to Quote Sent</Button> : null}
      </span>
    </div>
  )
}
