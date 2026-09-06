'use client'

import { Button } from '@/components/ds'
import { DangerButton, Dialog } from '@/components/leads/move-stage/dialogs'
import type { NoteKind } from '@/lib/leads/note-model'

/**
 * Delete Note / Delete Contact Log — not mocked in section 931:44865; a copy of the Tasks delete dialog
 * (components/leads/tasks/delete-dialog.tsx, Delete Task 902:27738: 400×196, Heading 72 p24, body p0/24 with the
 * 14/Regular message, bottom 84 p24 → "No" secondary outlined · "Yes" filled red) with the note vocabulary.
 * Copy is invented (build plan design-source/context/lead-notes/00-build-plan.md, logged in REGISTER.md):
 * "Are you sure you want to delete this note (contact log) from this project? This action cannot be undone."
 */
export function DeleteNoteDialog({ open, kind, onNo, onYes }: { open: boolean; kind: NoteKind; onNo: () => void; onYes: () => void }) {
  const log = kind === 'contact'
  return (
    <Dialog open={open} onClose={onNo} title={log ? 'Delete Contact Log' : 'Delete Note'} width={400} size="form" alert
            footer={<>
              <Button variant="secondary" appearance="outlined" onPress={onNo}>No</Button>
              <DangerButton onClick={onYes}>Yes</DangerButton>
            </>}>
      {/* The form shell's body pads 12/24 (784:113420); the message cancels that 12 to land on the mock's p0/24 (tasks twin). */}
      <span style={{ margin: '-12px 0', font: 'var(--om-type-body-m)', color: 'var(--om-color-on-surface-default)' }}>
        {log
          ? 'Are you sure you want to delete this contact log from this project? This action cannot be undone.'
          : 'Are you sure you want to delete this note from this project? This action cannot be undone.'}
      </span>
    </Dialog>
  )
}
