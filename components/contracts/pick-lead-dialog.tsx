'use client'

import { useState } from 'react'
import { Button } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { TextField } from '@/components/om/text-field'
import { useSheetLayout } from '@/components/om/sheet'
import { LeadWhoList } from './new-contract-sheet'

const STUDIO = 'Studio tasks (no lead)'

/** Which lead a record belongs to — asked where no lead is in context (Tools › Contracts, the templates galleries). The Create Quote modal's Client field, alone (REG-422). `allowStudio` (REG-538) adds the rail's studio tasks as a target.
 *  (Dane UAT 8.02, REG-659) `busy`: the record is being made — the confirm reads `busyLabel` and waits; the host closes the dialog once it exists. */
export function PickLeadDialog({ open, onClose, leads, title = 'Which lead is this contract for?', confirmLabel = 'Continue', allowStudio = false, busy = false, busyLabel = 'Creating…', onPick, label = 'Lead', placeholder = 'Choose a lead', whoList }: { open: boolean; onClose: () => void; leads: { id: string; name: string }[]; title?: string; confirmLabel?: string; allowStudio?: boolean; busy?: boolean; busyLabel?: string; onPick: (leadId: string | null) => void | Promise<void>
  /** (pending modules S26) the field's words where it picks a client — Messages' Message a client */ label?: string; placeholder?: string
  /** (Contracts on the move, C4 — P-09 · A-10) Opt-in, a phone only: the question as the Create Quote phone step's list — recent leads first, a
      search, a tap picks (no select, no Continue). The contract hosts pass it; every other caller keeps the form. */
  whoList?: { recent?: string[] } }) {
  const phone = useSheetLayout()
  const [name, setName] = useState('')
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) { setWasOpen(open); if (open) setName('') }
  const lead = leads.find((l) => l.name === name) ?? null
  const ok = !!lead || (allowStudio && name === STUDIO)
  if (whoList && phone && !allowStudio) return (
    <Dialog open={open} onClose={onClose} title={busy ? busyLabel : title} size="form" width={400} portal>
      <LeadWhoList leads={leads} recent={whoList.recent} disabled={busy} onPick={(id) => { if (!busy) void onPick(id) }} />
    </Dialog>
  )
  return (
    <Dialog open={open} onClose={onClose} title={title} size="form" width={400}
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button><Button isDisabled={!ok || busy} onPress={() => { if (ok && !busy) void onPick(lead?.id ?? null) }} data-testid="pick-lead-confirm">{busy ? busyLabel : confirmLabel}</Button></>}>
      <TextField label={label} required mode="select" value={name} options={[...(allowStudio ? [STUDIO] : []), ...leads.map((l) => l.name)]} onChange={setName} placeholder={placeholder} disabled={busy} />
    </Dialog>
  )
}
