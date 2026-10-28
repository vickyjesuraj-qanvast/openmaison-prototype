'use client'

import { ConfirmDialog } from '@/components/om/confirm-dialog'

/**
 * Delete Contract / Delete Contracts — no Contracts dialog mock (931-38609 has only the empty state and the listing),
 * so this is the Quotes tab's delete dialog (components/leads/quotes/delete-dialog.tsx, itself the Tasks Delete Task
 * dialog 902:27738) with "contract" substituted for "quote" in the title and the message (REG-178).
 * Shell: 400×196 — Heading 72 p24 (title 20/Bold + close 24), body p0/24 (message 14/Regular),
 * bottom 84 p24 → "No" secondary outlined · "Yes" filled red. The wizard Dialog `size="form"` body pads 12/24,
 * so the message cancels that 12 to land on p0/24.
 * (REG-725) Now the house confirm (ConfirmDialog): the one head and foot every dialog wears, the 14/20 message, and the answer
 * is the verb — "Cancel" · "Delete" for the mock's "No" · "Yes" (REG-720's rule).
 */
export function DeleteContractsDialog({ open, count, onNo, onYes }: { open: boolean; count: number; onNo: () => void; onYes: () => void }) {
  const many = count > 1
  return (
    /* (REG-631, contracts parity E-115) Deleting is soft: the editor's dialog and this one say the same thing. */
    <ConfirmDialog open={open} onCancel={onNo} onConfirm={onYes} title={many ? 'Delete contracts' : 'Delete contract'} confirmLabel="Delete"
                   message={many
                     ? 'Are you sure you want to delete these contracts? You can restore them from Deleted contracts.'
                     : 'Are you sure you want to delete this contract? You can restore it from Deleted contracts.'} />
  )
}
