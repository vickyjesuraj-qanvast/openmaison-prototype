'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { TextField } from '@/components/om/text-field'

/** `blocked` (UX audit V2) — why this one can't be picked; it stays in the list with its reason, and choosing it says so instead of going on. */
export type PickOption = { id: string; label: string; sub?: string; blocked?: string }

/** (REG-538) "Start from a …": one record picked from a list loaded when the dialog opens (a contract, a quote) — the Pick-a-lead dialog's shape.
    (Sweep S3) Picked by id: two options that read the same get "(2)", so the second can never pick the first; the empty and prompt
    lines can be the caller's own words — a lower-cased label ("Choose a your line") never is. */
export function PickOneDialog({ open, onClose, title, label, load, confirmLabel = 'Continue', onPick, placeholder, empty }: { open: boolean; onClose: () => void; title: string; label: string; load: () => Promise<PickOption[]>; confirmLabel?: string; onPick: (id: string) => void | Promise<void>; placeholder?: string; empty?: string }) {
  const [items, setItems] = useState<PickOption[] | null>(null)
  const [value, setValue] = useState('')
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) { setWasOpen(open); if (open) { setValue(''); setItems(null) } }
  useEffect(() => {
    if (!open) return
    let live = true
    void load().then((r) => { if (live) setItems(r) }, () => { if (live) setItems([]) })
    return () => { live = false }
  }, [open, load])
  const options = (() => { const seen = new Map<string, number>(); return (items ?? []).map((o) => { const base = o.sub ? `${o.label} · ${o.sub}` : o.label; const n = (seen.get(base) ?? 0) + 1; seen.set(base, n); return n === 1 ? base : `${base} (${n})` }) })()
  const picked = (items ?? [])[options.indexOf(value)] ?? null
  return (
    <Dialog open={open} onClose={onClose} title={title} size="form" width={400}
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button><Button isDisabled={!picked || !!picked.blocked} onPress={() => { if (picked && !picked.blocked) void onPick(picked.id) }}>{confirmLabel}</Button></>}>
      <TextField label={label} required mode="select" value={value} options={options} onChange={setValue} placeholder={items === null ? 'Loading…' : items.length ? placeholder ?? `Choose a ${label.toLowerCase()}` : empty ?? `No ${label.toLowerCase()} yet`} disabled={items === null || items.length === 0}
                 error={picked?.blocked ? `${picked.label} can’t be picked — ${picked.blocked.charAt(0).toLowerCase()}${picked.blocked.slice(1)}` : undefined} />
    </Dialog>
  )
}
