'use client'

import { ConfirmDialog } from '@/components/om/confirm-dialog'

/**
 * Move to Trash Folder? (931:39207, frame 105) — 400×216: Heading 72 p24 (title 20/Bold + close 24), body p0/24
 * (message 14/Regular #1a1a1a, 3 lines = 60), bottom 84 p24 → "No" secondary outlined · "Yes" filled #db382a.
 * Spec: design-source/context/lead-files/04-dialogs-move-deleted.txt. Shell = the wizard Dialog `size="form"`
 * (the tasks / quotes Delete dialogs); its body pads 12/24, so the message cancels that 12 to land on p0/24.
 * Copy verbatim for one item (the item's name in quotes — file or folder alike); several items are not mocked →
 * "these n items" replaces the quoted name (invented, logged in the build plan).
 * (REG-725) Now the house confirm (ConfirmDialog): the one head and foot every dialog wears, the 14/20 message, and the answer
 * is the verb — "Cancel" · "Move to Trash" for the mock's "No" · "Yes" (REG-720's rule).
 */
export function TrashDialog({ open, names, onNo, onYes }: { open: boolean; names: string[]; onNo: () => void; onYes: () => void }) {
  const subject = names.length === 1 ? `"${names[0]}"` : `these ${names.length} items`
  return (
    <ConfirmDialog open={open} onCancel={onNo} onConfirm={onYes} title="Move to Trash Folder?" confirmLabel="Move to Trash"
                   message={`You sure you want to move ${subject} to the Trash Folder and remove all project attachments (chat messages, invoices, etc.)?`} />
  )
}
