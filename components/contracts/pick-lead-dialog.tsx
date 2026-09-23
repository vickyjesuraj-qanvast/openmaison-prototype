'use client'

import { useState } from 'react'
import { Button } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { TextField } from '@/components/om/text-field'

const STUDIO = 'Studio tasks (no lead)'

/** Which lead a record belongs to — asked where no lead is in context (Tools › Contracts, the templates galleries). The Create Quote modal's Client field, alone (REG-422). `allowStudio` (REG-538) adds the rail's studio tasks as a target. */
export function PickLeadDialog({ open, onClose, leads, title = 'Which lead is this contract for?', confirmLabel = 'Continue', allowStudio = false, onPick }: { open: boolean; onClose: () => void; leads: { id: string; name: string }[]; title?: string; confirmLabel?: string; allowStudio?: boolean; onPick: (leadId: string | null) => void | Promise<void> }) {
  const [name, setName] = useState('')
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) { setWasOpen(open); if (open) setName('') }
  const lead = leads.find((l) => l.name === name) ?? null
  const ok = !!lead || (allowStudio && name === STUDIO)
  return (
    <Dialog open={open} onClose={onClose} title={title} size="form" width={400}
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button><Button isDisabled={!ok} onPress={() => { if (ok) void onPick(lead?.id ?? null) }}>{confirmLabel}</Button></>}>
      <TextField label="Lead" required mode="select" value={name} options={[...(allowStudio ? [STUDIO] : []), ...leads.map((l) => l.name)]} onChange={setName} placeholder="Choose a lead" />
    </Dialog>
  )
}
