'use client'

import { useState } from 'react'
import { Button } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { TextField } from '@/components/om/text-field'
import { ago } from '@/lib/templates/ago'
import styles from './review-bar.module.css'

/**
 * (REG-501) The approval bar under the top bar. Awaiting approval: who submitted it, when, and their note — an Owner or Admin
 * gets Request changes · Approve and publish; the designer sees that it waits. Changes requested: the owner's note, until
 * the designer submits again.
 */
export function ReviewBar({ submitted, reviewNote, canApprove, now, busy, onApprove, onRequestChanges, onDismissNote }: {
  submitted: { by: { name: string; color: string } | null; at: number; note: string } | null
  reviewNote: string | null
  canApprove: boolean
  now: number
  busy: boolean
  onApprove: () => void
  onRequestChanges: () => void
  onDismissNote: () => void
}) {
  if (submitted) {
    return (
      <div className={styles.bar} data-tone="await" role="status" data-testid="review-bar">
        <span className={styles.icon}><Icon name="approval" size={20} weight={300} /></span>
        <span className={styles.text}><b>{submitted.by?.name ?? 'A designer'}</b> submitted this for approval {ago(submitted.at, now)}{submitted.note ? <> — <span className={styles.note}>{submitted.note}</span></> : null}</span>
        {canApprove ? (
          <span className={styles.actions}>
            <Button appearance="text" onPress={onRequestChanges} isDisabled={busy}>Request changes</Button>
            <Button onPress={onApprove} isDisabled={busy}>Approve and publish</Button>
          </span>
        ) : <span className={styles.waiting}>Awaiting an Owner or Admin</span>}
      </div>
    )
  }
  if (reviewNote) {
    return (
      <div className={styles.bar} data-tone="changes" role="status" data-testid="review-bar">
        <span className={styles.icon}><Icon name="edit" size={20} weight={300} /></span>
        <span className={styles.text}><b>Changes requested</b> — <span className={styles.note}>{reviewNote}</span></span>
        <IconButton icon="close" label="Dismiss" size={24} variant="bare" iconSize={20} onClick={onDismissNote} />
      </div>
    )
  }
  return null
}

/** One note and one button — Submit for approval, Request changes. */
export function NoteDialog({ open, title, label, help, action, busy, onClose, onSubmit }: { open: boolean; title: string; label: string; help: string; action: string; busy: boolean; onClose: () => void; onSubmit: (note: string) => void }) {
  const [note, setNote] = useState('')
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) { setWasOpen(open); if (open) setNote('') }
  return (
    <Dialog open={open} onClose={onClose} title={title} size="form" width={400}
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose} isDisabled={busy}>Cancel</Button><Button onPress={() => onSubmit(note.trim())} isDisabled={busy}>{busy ? `${action}…` : action}</Button></>}>
      <TextField label={label} value={note} onChange={setNote} maxLength={200} helper={help} autoFocus onKeyDown={(e) => { if (e.key === 'Enter' && !busy) { e.preventDefault(); onSubmit(note.trim()) } }} />
    </Dialog>
  )
}
