'use client'

import { useState } from 'react'
import { Button } from '@/components/ds'
import { Dialog, DialogMessage } from '@/components/om/dialog'
import { TextField } from '@/components/om/text-field'

/**
 * (REG-565 → UX audit Q10) Revise — new version: the confirm it always was (what is kept, what the quote becomes), with an optional
 * "Client's request" — what the client asked to change. It is kept with the version it answers (`quote_versions.note`, which `reviseQuote`
 * always took), and Version History and the kept version's preview print it. The house Dialog at the confirm's 400.
 */
export function ReviseDialog({ open, version, number, message, onClose, onRevise }: { open: boolean; version: number; number: string; message: string; onClose: () => void; onRevise: (note: string) => void }) {
  const [note, setNote] = useState('')
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) { setWasOpen(open); if (open) setNote('') }
  return (
    <Dialog open={open} onClose={onClose} title={`Start version ${version + 1}?`} size="form" width={400} closeOnScrim={false}
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose}>Not now</Button><Button onPress={() => onRevise(note.trim())} data-testid="revise-confirm">Start version {version + 1}</Button></>}>
      <DialogMessage>{message}</DialogMessage>
      <TextField label="Client’s request (optional)" value={note} onChange={setNote} maxLength={200} autoFocus
                 helper={`What the client asked to change — kept with version ${version} of ${number} in Version History`}
                 onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onRevise(note.trim()) } }} />
    </Dialog>
  )
}
