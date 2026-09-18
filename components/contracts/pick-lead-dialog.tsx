'use client'

import { useState } from 'react'
import { Button } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { TextField } from '@/components/om/text-field'

/** Which lead the contract belongs to — asked where no lead is in context (Tools › Contracts, the templates gallery). The Create Quote modal's Client field, alone (REG-422). */
export function PickLeadDialog({ open, onClose, leads, title = 'Which lead is this contract for?', onPick }: { open: boolean; onClose: () => void; leads: { id: string; name: string }[]; title?: string; onPick: (leadId: string) => void | Promise<void> }) {
  const [name, setName] = useState('')
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) { setWasOpen(open); if (open) setName('') }
  const lead = leads.find((l) => l.name === name) ?? null
  return (
    <Dialog open={open} onClose={onClose} title={title} size="form" width={400}
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button><Button isDisabled={!lead} onPress={() => { if (lead) void onPick(lead.id) }}>Continue</Button></>}>
      <TextField label="Lead" required mode="select" value={name} options={leads.map((l) => l.name)} onChange={setName} placeholder="Choose a lead" />
    </Dialog>
  )
}
