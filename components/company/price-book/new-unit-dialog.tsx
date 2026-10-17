'use client'

import { useState } from 'react'
import { Button } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { TextField } from '@/components/om/text-field'
import { useSnackbar } from '@/components/om/snackbar'
import { couldnt } from '@/components/leads/tasks/use-run'
import { MSG } from '@/lib/forms'
import { listedAs } from '@/lib/settings/trades'
import { UNITS_FULL, UNITS_MAX } from '@/lib/settings/units'
import { addUnit } from '@/app/settings/actions'

/**
 * (S44I — M9, UAT rows 350 · 325; S44P's "New category…" as the pattern — `new-category-dialog.tsx`) "New unit…" at the foot of the Price
 * book item dialog's Unit list: a name, and it joins the studio's units (Settings › Quotes & pricing › Units) — the one list every unit
 * picker reads — then lands on the item. The house form dialog over the open one (nested, through a portal); a name already in the list
 * says which entry it matches as it is typed and Add waits; a full list says so; it closes only once the unit is saved, a refusal said on
 * the field.
 */
export function NewUnitDialog({ open, units, onClose, onAdded }: {
  open: boolean; units: readonly string[]; onClose: () => void
  /** the saved name, as the list spells it, and the studio's units now */
  onAdded: (name: string, units: string[]) => void
}) {
  const snackbar = useSnackbar()
  const [name, setName] = useState('')
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)
  const [refused, setRefused] = useState<string | null>(null)
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) { setWasOpen(open); if (open) { setName(''); setTried(false); setRefused(null) } }   // every opening starts empty
  const empty = !name.trim()
  const taken = listedAs(units, name)
  const full = units.length >= UNITS_MAX
  const error = tried && empty ? MSG.required : taken ?? refused ?? (full ? UNITS_FULL : undefined)
  const save = async () => {
    setTried(true)
    if (empty || taken || full || busy) return
    setBusy(true)
    try {
      const r = await addUnit(name)
      if ('error' in r) { setRefused(r.error); return }
      onAdded(r.name, r.units)
      snackbar({ message: `${r.name} added to the units` })   // Settings › Units' own words for an add
    } catch { snackbar({ message: couldnt('add the unit') }) }
    finally { setBusy(false) }
  }
  return (
    <Dialog open={open} onClose={onClose} title="New unit" size="form" width={400} nested portal closeOnScrim={false}
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button><Button isDisabled={busy || !!taken || full} onPress={() => { void save() }}>{busy ? 'Adding…' : 'Add'}</Button></>}>
      <div data-testid="new-unit">
        <TextField label="Name" required value={name} autoFocus maxLength={40} error={error}
                   onChange={(v) => { setName(v); setRefused(null) }}
                   helper="It joins the studio’s units — every quote’s Unit list offers it too"
                   onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void save() } }} />
      </div>
    </Dialog>
  )
}
