'use client'

import { useState } from 'react'
import { Button } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { TextField } from '@/components/om/text-field'

/**
 * (The calm UI build 2026-10-27, the UI audit's 4-18) ⋮ › Rename… — the contract's title, the quote editor's Rename quote (its dialog's
 * model, components/quotes/editor/rename-dialog.tsx): the meta row's second copy of the title left, so the header, the paper's heading and the
 * Outline say it once each. Saved through the editor's autosave; a signed contract's row is greyed with its rule.
 */
export function RenameContractDialog({ open, title, onClose, onSave, heading = 'Rename contract', label = 'Contract title' }: { open: boolean; title: string; onClose: () => void; onSave: (title: string) => void
  /** The contract template editor's: "Rename template" over "Template name" */ heading?: string; label?: string }) {
  const [name, setName] = useState(title)
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) { setWasOpen(open); if (open) setName(title) }   // render-phase adjust: the field opens on the current title
  const save = () => { const t = name.trim(); if (!t) return; onSave(t.slice(0, 120)); onClose() }
  return (
    <Dialog open={open} onClose={onClose} title={heading} size="form" width={400}
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button><Button onPress={save} isDisabled={!name.trim()}>Rename</Button></>}>
      <TextField label={label} required value={name} onChange={setName} autoFocus maxLength={120} onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) { e.preventDefault(); save() } }} />
    </Dialog>
  )
}
