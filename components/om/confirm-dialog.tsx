'use client'

import { Button } from '@/components/ds'
import { DangerButton, Dialog } from '@/components/leads/move-stage/dialogs'
import styles from '@/components/leads/move-stage/wizard.module.css'

/**
 * Generic confirmation alert — same shell and tone as the delete alerts (779:24663):
 * compact 400px dialog, message in the helper style, Cancel + one committing action.
 * Use it for any "are you sure?" moment (closing a flow mid-way, discarding edits…).
 * Esc / outside click / X cancel; the dialog consumes Esc so the surface under it stays put.
 */
export function ConfirmDialog({
  open, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', tone = 'danger', onConfirm, onCancel,
}: {
  open: boolean
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  /** danger = red committing button (destructive / lossy); primary = the DS primary button. */
  tone?: 'danger' | 'primary'
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <Dialog open={open} onClose={onCancel} title={title} width={400}
            footer={<>
              <Button variant="secondary" appearance="outlined" onPress={onCancel}>{cancelLabel}</Button>
              {tone === 'danger' ? <DangerButton onClick={onConfirm}>{confirmLabel}</DangerButton> : <Button onPress={onConfirm}>{confirmLabel}</Button>}
            </>}>
      {message ? <span className={styles.helper}>{message}</span> : null}
    </Dialog>
  )
}
