'use client'

import { useState } from 'react'
import { Button } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { TextField } from '@/components/om/text-field'
import { useSnackbar } from '@/components/om/snackbar'
import { couldnt } from '@/components/leads/tasks/use-run'
import { MSG } from '@/lib/forms'
import { TRADES_FULL, TRADES_MAX, listedAs } from '@/lib/settings/trades'
import { addTrade } from '@/app/settings/trades-actions'

/**
 * (S44P — her UAT ask 2026-10-15, row 319) "New category…" at the foot of a Price book category list: a name, and it joins the studio's
 * trades (Settings › Quotes & pricing › Trades) — the one list every category picker reads (REG-651) — then lands on what asked for it.
 * The house form dialog over the open one (nested, through a portal); a name already in the list says which entry it matches as it is
 * typed and Add waits (sweep S4 #23 · row 264); it closes only once the trade is saved, and a refusal is said on the field.
 */
export function NewCategoryDialog({ open, trades, onClose, onAdded }: {
  open: boolean; trades: readonly string[]; onClose: () => void
  /** the saved name, as the list spells it, and the studio's trades now */
  onAdded: (name: string, trades: string[]) => void
}) {
  const snackbar = useSnackbar()
  const [name, setName] = useState('')
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)
  const [refused, setRefused] = useState<string | null>(null)
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) { setWasOpen(open); if (open) { setName(''); setTried(false); setRefused(null) } }   // every opening starts empty
  const empty = !name.trim()
  const taken = listedAs(trades, name)
  const full = trades.length >= TRADES_MAX
  const error = tried && empty ? MSG.required : taken ?? refused ?? (full ? TRADES_FULL : undefined)
  const save = async () => {
    setTried(true)
    if (empty || taken || full || busy) return
    setBusy(true)
    try {
      const r = await addTrade(name)
      if ('error' in r) { setRefused(r.error); return }
      onAdded(r.name, r.trades)
      snackbar({ message: `${r.name} added to the trades` })   // Settings › Trades' own words for an add
    } catch { snackbar({ message: couldnt('add the category') }) }
    finally { setBusy(false) }
  }
  return (
    <Dialog open={open} onClose={onClose} title="New category" size="form" width={400} nested portal closeOnScrim={false}
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button><Button isDisabled={busy || !!taken || full} onPress={() => { void save() }}>{busy ? 'Adding…' : 'Add'}</Button></>}>
      <div data-testid="new-category">
        <TextField label="Name" required value={name} autoFocus maxLength={40} error={error}
                   onChange={(v) => { setName(v); setRefused(null) }}
                   helper="It joins the studio’s trades — every quote’s Category list offers it too"
                   onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void save() } }} />
      </div>
    </Dialog>
  )
}
