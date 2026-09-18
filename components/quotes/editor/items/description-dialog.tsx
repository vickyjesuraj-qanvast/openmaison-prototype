'use client'

import { useState } from 'react'
import { Button, TextArea } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import styles from './items-section.module.css'

/**
 * Expand on an active line (owner 2026-09-16, REG-444: "expand definition was to open in a modal and write the description in a
 * bigger window, maybe our 400 modal window"): the S 400 form dialog titled Description over the line's name, the DS TextArea
 * eight lines tall, Cancel · Save. Save writes the description through the row's own patch (autosave, undo); Cancel and Escape
 * drop the draft. No mock — the owner's brief; the chip itself is 1271:40867.
 */
export function DescriptionDialog({ open, name, value, onClose, onSave }: {
  open: boolean
  name: string
  value: string
  onClose: () => void
  onSave: (description: string) => void
}) {
  const [draft, setDraft] = useState(value)
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) { setWasOpen(open); if (open) setDraft(value) }   // every opening starts from what the line holds
  return (
    <Dialog open={open} onClose={onClose} title="Description" subtitle={name || 'New item'} size="form" width={400} portal
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button><Button onPress={() => { onSave(draft); onClose() }}>Save</Button></>}>
      <TextArea aria-label="Description" placeholder="Add a description" value={draft} onChange={(v: string) => setDraft(v)} autoFocus className={styles.descDialogArea} />
    </Dialog>
  )
}
