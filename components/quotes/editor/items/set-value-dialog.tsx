'use client'

import { useState } from 'react'
import { Button } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { TextField } from '@/components/om/text-field'
import { UNITS } from '@/lib/quotes/items-model'
import { filterNumeric, readNumber } from '@/lib/quotes/arith'

export type SetField = 'qty' | 'unit' | 'cost' | 'markupPct' | 'unitPrice' | 'discount' | 'gst' | 'room' | 'category' | 'section'
const FIELDS: { key: SetField; label: string; kind: 'number' | 'money' | 'pct' | 'unit' | 'label' }[] = [
  { key: 'qty', label: 'Qty', kind: 'number' },
  { key: 'unit', label: 'Unit', kind: 'unit' },
  { key: 'cost', label: 'Cost (S$)', kind: 'money' },
  { key: 'markupPct', label: 'Markup (%)', kind: 'pct' },
  { key: 'unitPrice', label: 'Unit Price (S$)', kind: 'money' },
  { key: 'discount', label: 'Discount (%)', kind: 'pct' },
  { key: 'gst', label: 'GST (%)', kind: 'pct' },
  { key: 'room', label: 'Room', kind: 'label' },
  { key: 'category', label: 'Category', kind: 'label' },
  { key: 'section', label: 'Section label', kind: 'label' },
]

/**
 * Set a value for the selected lines (REG-477, no mock — the Excel benchmark's phase 3, "bulk edit of a column"): one field, one
 * value, every ticked line takes it — a markup as a share of each line's own cost, a unit price as that line's new cost + markup.
 * A number box takes a sum ("=1200/4"). The form dialog shell (784:113420), as Add Category / Rename Group.
 */
export function SetValueDialog({ open, count, labels, onClose, onApply }: {
  open: boolean
  count: number
  labels: { rooms: string[]; categories: string[]; sections: string[] }
  onClose: () => void
  onApply: (field: SetField, value: string | number) => void
}) {
  const [field, setField] = useState<SetField>('markupPct')
  const [value, setValue] = useState('')
  const [wasOpen, setWasOpen] = useState(false)
  if (open !== wasOpen) { setWasOpen(open); if (open) setValue('') }   // render-phase adjust: every opening starts empty
  const def = FIELDS.find((f) => f.key === field)!
  const options = def.kind === 'unit' ? UNITS : def.kind === 'label' ? (field === 'room' ? labels.rooms : field === 'category' ? labels.categories : labels.sections) : null
  const numeric = def.kind === 'number' || def.kind === 'money' || def.kind === 'pct'
  const n = numeric ? readNumber(value.trim()) : NaN
  const valid = numeric ? value.trim() !== '' && Number.isFinite(n) && n >= 0 && (def.kind !== 'pct' || field === 'markupPct' || n <= 100) : value.trim() !== ''
  const apply = () => { if (valid) onApply(field, numeric ? n : value.trim()) }
  const pick = (label: string) => { const f = FIELDS.find((x) => x.label === label); if (f) { setField(f.key); setValue('') } }

  return (
    <Dialog open={open} onClose={onClose} title={`Set a value for ${count} ${count === 1 ? 'item' : 'items'}`} width={400} size="form"
            footer={<>
              <Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button>
              <Button onPress={apply} isDisabled={!valid}>Apply</Button>
            </>}>
      <TextField label="Field" mode="select" options={FIELDS.map((f) => f.label)} value={def.label} onChange={pick} />
      {options && options.length ? (
        <TextField label={def.label} mode="select" options={options} value={value} onChange={setValue} />
      ) : (
        <TextField label={def.label} value={value} autoFocus inputMode={numeric ? 'decimal' : 'text'}
                   placeholder={numeric ? 'A number, or a sum like =1200/4' : undefined}
                   onChange={(v) => setValue(numeric ? filterNumeric(v, ',') : v)}
                   onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); apply() } }}
                   helper={numeric && value.trim() !== '' && !valid ? (def.kind === 'pct' && field !== 'markupPct' ? 'Enter 0 to 100' : 'Enter a number') : undefined}
                   error={numeric && value.trim() !== '' && !valid} />
      )}
    </Dialog>
  )
}
