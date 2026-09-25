'use client'

import { useState } from 'react'
import { Button } from '@/components/ds'
import { TextField } from '@/components/om/text-field'
import { Dialog } from '@/components/leads/move-stage/dialogs'

/**
 * Rename Folder (931:39181, frame 98) · Rename File (931:39437, frame 99) · Create Folder (931:39194, frame 103) —
 * ModalComponent 400×228, r12: Heading 72 (H g16 p24 — title 20/Bold + close 24), body p12/24 with one Text Field 48
 * (label "Name"), bottom 84 (p24, g8) → "Cancel" secondary outlined · "Save" primary filled.
 * Spec: design-source/context/lead-files/04-dialogs-move-deleted.txt. Shell = the wizard Dialog `size="form"`
 * (784:113420), the same one the tasks Save-as-Template / Delete dialogs use.
 * Save is disabled while the name is empty and Enter saves (not in the mock — the register's field rule).
 * (REG-664) `validate` checks a folder's name everywhere folders live (required · 60 characters · not a sibling's name — lib/folders.ts):
 * its message shows under the field after the first Save and clears as the name is fixed (the register's field rule).
 */
export function NameDialog({
  open, title, initial, onSave, onClose, validate,
}: {
  open: boolean
  /** Create Folder · Rename Folder · Rename File — and the quote editor's Add Category / Add Section / Rename Group (REG-415). */
  title: string
  initial: string
  onSave: (name: string) => void
  onClose: () => void
  /** Why the name can't be saved, else null. */
  validate?: (name: string) => string | null
}) {
  const [name, setName] = useState(initial)
  const [tried, setTried] = useState(false)
  const [wasOpen, setWasOpen] = useState(false)
  // Render-phase adjust: every opening starts from `initial` (the dialog stays mounted between uses).
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) { setName(initial); setTried(false) }
  }
  const trimmed = name.trim()
  const problem = validate?.(name) ?? null
  const save = () => { setTried(true); if (trimmed && !problem) onSave(trimmed) }

  return (
    <Dialog open={open} onClose={onClose} title={title} width={400} size="form"
            footer={<>
              <Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button>
              <Button onPress={save} isDisabled={!trimmed}>Save</Button>
            </>}>
      <TextField label="Name" required value={name} onChange={setName} autoFocus error={tried && problem ? problem : undefined}
                 onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); save() } }} />
    </Dialog>
  )
}
