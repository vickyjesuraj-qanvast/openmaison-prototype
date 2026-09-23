'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { TextField } from '@/components/om/text-field'

export type PickOption = { id: string; label: string; sub?: string }

/** (REG-538) "Start from a …": one record picked from a list loaded when the dialog opens (a contract, a quote) — the Pick-a-lead dialog's shape. */
export function PickOneDialog({ open, onClose, title, label, load, confirmLabel = 'Continue', onPick }: { open: boolean; onClose: () => void; title: string; label: string; load: () => Promise<PickOption[]>; confirmLabel?: string; onPick: (id: string) => void | Promise<void> }) {
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
  const options = (items ?? []).map((o) => (o.sub ? `${o.label} · ${o.sub}` : o.label))
  const picked = (items ?? [])[options.indexOf(value)] ?? null
  return (
    <Dialog open={open} onClose={onClose} title={title} size="form" width={400}
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button><Button isDisabled={!picked} onPress={() => { if (picked) void onPick(picked.id) }}>{confirmLabel}</Button></>}>
      <TextField label={label} required mode="select" value={value} options={options} onChange={setValue} placeholder={items === null ? 'Loading…' : items.length ? `Choose a ${label.toLowerCase()}` : `No ${label.toLowerCase()} yet`} disabled={items === null || items.length === 0} />
    </Dialog>
  )
}
