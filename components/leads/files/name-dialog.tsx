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
 */
export function NameDialog({
  open, title, initial, onSave, onClose,
}: {
  open: boolean
  title: 'Create Folder' | 'Rename Folder' | 'Rename File'
  initial: string
  onSave: (name: string) => void
  onClose: () => void
}) {
  const [name, setName] = useState(initial)
  const [wasOpen, setWasOpen] = useState(false)
  // Render-phase adjust: every opening starts from `initial` (the dialog stays mounted between uses).
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) setName(initial)
  }
  const trimmed = name.trim()
  const save = () => { if (trimmed) onSave(trimmed) }

  return (
    <Dialog open={open} onClose={onClose} title={title} width={400} size="form"
            footer={<>
              <Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button>
              <Button onPress={save} isDisabled={!trimmed}>Save</Button>
            </>}>
      <TextField label="Name" value={name} onChange={setName} autoFocus
                 onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); save() } }} />
    </Dialog>
  )
}
