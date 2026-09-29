'use client'

import { ConfirmDialog } from '@/components/om/confirm-dialog'
import type { NoteKind } from '@/lib/leads/note-model'

/**
 * Delete Note / Delete Contact Log — not mocked in section 931:44865; a copy of the Tasks delete dialog
 * (components/leads/tasks/delete-dialog.tsx, Delete Task 902:27738: 400×196, Heading 72 p24, body p0/24 with the
 * 14/Regular message, bottom 84 p24 → "No" secondary outlined · "Yes" filled red) with the note vocabulary.
 * Copy is invented (build plan design-source/context/lead-notes/00-build-plan.md, logged in REGISTER.md):
 * "Are you sure you want to delete this note (contact log) from this project? This action cannot be undone."
 * (REG-725) Now the house confirm (ConfirmDialog): the one head and foot every dialog wears, the 14/20 message, and the answer
 * is the verb — "Cancel" · "Delete" for the mock's "No" · "Yes" (REG-720's rule).
 */
export function DeleteNoteDialog({ open, kind, onNo, onYes }: { open: boolean; kind: NoteKind; onNo: () => void; onYes: () => void }) {
  const log = kind === 'contact'
  return (
    <ConfirmDialog open={open} onCancel={onNo} onConfirm={onYes} title={log ? 'Delete Contact Log' : 'Delete Note'} confirmLabel="Delete"
                   message={log
                     ? 'Are you sure you want to delete this contact log from this project? This action cannot be undone.'
                     : 'Are you sure you want to delete this note from this project? This action cannot be undone.'} />
  )
}
