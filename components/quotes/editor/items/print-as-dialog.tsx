'use client'

import { useState } from 'react'
import { Button } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { TextField } from '@/components/om/text-field'
import { PRINT_AS, PRINT_AS_HELP, PRINT_AS_LABEL, type PrintAs } from '@/lib/quotes/items-model'

const OPTIONS: { key: PrintAs | 'price'; label: string; help: string }[] = [
  { key: 'price', label: 'The price', help: 'The amount prints and counts' },
  ...PRINT_AS.map((k) => ({ key: k, label: PRINT_AS_LABEL[k], help: PRINT_AS_HELP[k] })),
]

/**
 * (REG-555) Print as for the ticked lines — the bulk bar's way to mark a whole run FOC, Inclusive, KIV, On behalf, Packaged or a
 * word of the studio's own. The form dialog shell (784:113420), as Set value.
 */
export function PrintAsDialog({ open, count, onClose, onApply, initial }: { open: boolean; count: number; onClose: () => void; onApply: (v: PrintAs | null, text: string | null) => void; /** (sweep S1) a row's Print as › Custom word opens on the word, with the line's own */ initial?: { key: PrintAs | 'price'; text?: string | null } }) {
  const [key, setKey] = useState<PrintAs | 'price'>('foc')
  const [text, setText] = useState('')
  const [wasOpen, setWasOpen] = useState(false)
  if (open !== wasOpen) { setWasOpen(open); if (open) { setKey(initial?.key ?? 'foc'); setText(initial?.text ?? '') } }   // render-phase adjust: every opening starts where it was asked (the bulk bar: FOC)
  const def = OPTIONS.find((o) => o.key === key)!
  const valid = key !== 'custom' || text.trim() !== ''
  return (
    <Dialog open={open} onClose={onClose} title={`Print as — ${count} ${count === 1 ? 'item' : 'items'}`} width={400} size="form"
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button><Button onPress={() => { if (valid) onApply(key === 'price' ? null : key, key === 'custom' ? text.trim() : null) }} isDisabled={!valid}>Apply</Button></>}>
      <TextField label="In place of the amount" mode="select" options={OPTIONS.map((o) => o.label)} value={def.label} onChange={(l) => { const o = OPTIONS.find((x) => x.label === l); if (o) setKey(o.key) }} helper={def.help} />
      {key === 'custom' ? <TextField label="Your word" required value={text} onChange={setText} autoFocus maxLength={40} placeholder="e.g. Waived, By owner" /> : null}
    </Dialog>
  )
}
