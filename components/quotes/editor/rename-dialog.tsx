'use client'

import { useState } from 'react'
import { Button } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { TextField } from '@/components/om/text-field'

/** ⋯ › Rename Quote (REG-538): the title the header and the lists print; saved through General Info's autosave. */
export function RenameQuoteDialog({ open, title, onClose, onSave }: { open: boolean; title: string; onClose: () => void; onSave: (title: string) => void }) {
  const [name, setName] = useState(title)
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) { setWasOpen(open); if (open) setName(title) }   // render-phase adjust: the field opens on the current title
  const save = () => { const t = name.trim(); if (!t) return; onSave(t); onClose() }
  return (
    <Dialog open={open} onClose={onClose} title="Rename quote" size="form" width={400}
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button><Button onPress={save} isDisabled={!name.trim()}>Rename</Button></>}>
      <TextField label="Quote title" required value={name} onChange={setName} autoFocus onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) { e.preventDefault(); save() } }} />
    </Dialog>
  )
}
