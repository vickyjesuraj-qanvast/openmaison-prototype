'use client'

import { Button } from '@/components/ds'
import { DangerButton, Dialog, DialogMessage } from './dialog'

/**
 * Generic confirmation alert — every delete and every "are you sure?" in the app (REG-725: the six Lead Details deletes moved
 * onto it): the house head and foot (components/om/dialog.tsx SurfaceHead / SurfaceFoot), 400 wide, the 14/20 message,
 * Cancel + one committing action named by its verb.
 * Use it for any "are you sure?" moment (closing a flow mid-way, discarding edits…).
 * Esc / outside click / X cancel; the dialog consumes Esc so the surface under it stays put.
 */
export function ConfirmDialog({
  open, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', tone = 'danger', onConfirm, onCancel, nested = false,
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
  /** (REG-625) Asked from inside an open modal (a Deleted sheet): the lighter second scrim at z 120, through a portal on <body> so it
      lands after the modal and above it — at the same layer it opened UNDER the sheet and its button could not be pressed. */
  nested?: boolean
}) {
  return (
    <Dialog open={open} onClose={onCancel} title={title} width={400} nested={nested} portal={nested}
            footer={<>
              <Button variant="secondary" appearance="outlined" onPress={onCancel}>{cancelLabel}</Button>
              {tone === 'danger' ? <DangerButton onClick={onConfirm}>{confirmLabel}</DangerButton> : <Button onPress={onConfirm}>{confirmLabel}</Button>}
            </>}>
      {message ? <DialogMessage>{message}</DialogMessage> : null}
    </Dialog>
  )
}
