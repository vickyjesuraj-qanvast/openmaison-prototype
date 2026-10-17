'use client'

import { useState } from 'react'
import { TextField } from '@/components/om/text-field'
import { useSnackbar } from '@/components/om/snackbar'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import { createVendor } from '@/app/finance/vendor-actions'
import type { VendorRecord } from '@/lib/finance/model'
import textLink from '@/components/om/text-link.module.css'
import money from '@/components/projects/money/money.module.css'
import { VendorDialog } from './vendor-dialog'
import fin from './finance.module.css'

/**
 * (gaps build F1 — F1-Q4) Pick a vendor from the studio's directory — the house select with its search (a studio's list is long) — or add one
 * in place, 1.0's way, without leaving the PO or the bill: *Add a new vendor* opens the vendor's dialog over it, and the new one is picked.
 * Deactivated and merged vendors leave the list (one already on the record stays shown).
 */
export function VendorField({ vendors, value, onChange, onAdded, trades, bank, label = 'Vendor', required = true, error, helper, seed, testId = 'vendor-field' }: {
  vendors: VendorRecord[]
  value: string | null
  onChange: (id: string) => void
  onAdded: (v: VendorRecord) => void
  trades: string[]
  bank: boolean
  label?: string
  required?: boolean
  error?: string
  helper?: string
  /** a name read off a bill — *Add {name} as a vendor* starts from it */ seed?: string | null
  testId?: string
}) {
  const snackbar = useSnackbar()
  const [adding, setAdding] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const list = vendors.filter((v) => (v.isActive && !v.mergedInto) || v.id === value)
  const current = vendors.find((v) => v.id === value) ?? null
  const label_ = (v: VendorRecord) => (v.trade ? `${v.name} · ${v.trade}` : v.name)
  const add = async (input: Parameters<typeof createVendor>[0]) => {
    setBusy(true)
    try {
      const r = await createVendor(input)
      if ('error' in r) { snackbar({ message: couldnt('add the vendor', refusalOf(r.error)) }); return }
      setAdding(null); onAdded(r.vendor); onChange(r.vendor.id)
      snackbar({ message: `${r.vendor.name} is in the directory` })
    } catch (e) { snackbar({ message: couldnt('add the vendor', refusalOf(e)) }) } finally { setBusy(false) }
  }
  return (
    <div data-testid={testId}>
      <TextField label={label} mode="select" searchable required={required} options={list.map(label_)} value={current ? label_(current) : ''}
                 onChange={(v) => { const hit = list.find((x) => label_(x) === v); if (hit) onChange(hit.id) }} error={error} helper={helper} />
      <button type="button" className={`${textLink.link} ${money.inlineLink} ${fin.below}`} onClick={() => setAdding(seed ?? '')} data-testid={`${testId}-add`}>
        {seed && !current ? `Add ${seed} as a vendor` : 'Add a new vendor'}
      </button>
      <VendorDialog open={adding !== null} initial={null} name={adding ?? ''} trades={trades} bank={bank} busy={busy} nested onClose={() => setAdding(null)} onSave={(i) => { void add(i) }} />
    </div>
  )
}
