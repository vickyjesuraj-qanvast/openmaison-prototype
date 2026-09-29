'use client'

import { ConfirmDialog } from '@/components/om/confirm-dialog'

/**
 * Delete Quote / Delete Quotes — no quotes dialog mock (910-36240 has none), so this is the Tasks tab's Delete Task
 * dialog (902:27738, components/leads/tasks/delete-dialog.tsx) with "quote" substituted for "task" in the title
 * and the message. Shell: 400×196 — Heading 72 p24 (title 20/Bold + close 24), body p0/24 (message 14/Regular),
 * bottom 84 p24 → "No" secondary outlined · "Yes" filled red. The wizard Dialog `size="form"` body pads 12/24,
 * so the message cancels that 12 to land on p0/24.
 * (REG-725) Now the house confirm (ConfirmDialog): the one head and foot every dialog wears, the 14/20 message, and the answer
 * is the verb — "Cancel" · "Delete" for the mock's "No" · "Yes" (REG-720's rule).
 */
export function DeleteQuotesDialog({ open, count, onNo, onYes }: { open: boolean; count: number; onNo: () => void; onYes: () => void }) {
  const many = count > 1
  return (
    /* (sweep S1 · U-05) quotes delete softly (REG-625) — the words say where they go, not that it can't be undone */
    <ConfirmDialog open={open} onCancel={onNo} onConfirm={onYes} title={many ? 'Delete Quotes' : 'Delete Quote'} confirmLabel="Delete"
                   message={many
                     ? 'Are you sure you want to delete these quotes? They move to Deleted Quotes, where you can restore them.'
                     : 'Are you sure you want to delete this quote? It moves to Deleted Quotes, where you can restore it.'} />
  )
}
