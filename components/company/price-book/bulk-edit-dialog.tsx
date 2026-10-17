'use client'

import { useState } from 'react'
import { Button, Checkbox } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { TextField } from '@/components/om/text-field'
import { VendorNameField } from '@/components/finance/vendor-name-field'
import { useVendorDirectory } from '@/components/finance/use-vendor-directory'
import { spellVendor } from '@/lib/finance/model'
import { NewCategoryDialog } from './new-category-dialog'

export type BulkEdit = 'category' | 'vendor' | 'markup'
const NO_CATEGORY = 'No category'
const TITLE: Record<BulkEdit, string> = { category: 'Set category', vendor: 'Set vendor', markup: 'Set markup' }

/**
 * (REG-653, price book parity Q-15) The list's bulk changes, one field each on the house form dialog: a category from the studio's trades,
 * a vendor, or a markup as a share of each item's cost — the items are re-priced (1.0's vendor markup, which stored a figure nothing read).
 * Lines already on quotes keep their figures; History keeps each change. (sweep S5 #11) Nothing is applied until something is chosen: the
 * category starts unpicked ("No category" is a choice, not the start), clearing the vendor is its own tick, and a markup over the ceiling
 * says so on the field. The page's snackbar carries Undo.
 * (pending modules S12 — card held:price-book, "Bulk Set vendor … free text, not Finance › Vendors · revisit (one vendor list, N-16)") Set vendor
 * picks from Company › Finance › Vendors, as the item dialog's Vendor does — type-ahead over the directory, *Add {name} as a vendor* for a new
 * one — and the vendor lands as the directory spells it.
 */
export function BulkEditDialog({ open, kind, count, categories, vendors: inBook, onClose, onApply }: {
  open: boolean; kind: BulkEdit; count: number; categories: string[]; vendors: string[]; onClose: () => void
  onApply: (change: { category?: string | null; vendor?: string | null; markupPct?: number }) => void
}) {
  const [value, setValue] = useState('')
  const [clearVendor, setClearVendor] = useState(false)
  const [wasOpen, setWasOpen] = useState(open)
  /* (S44P, row 319 — its sibling) "New category…" at the list's foot, as the item dialog's: the trade joins the list and is the pick */
  const [added, setAdded] = useState<string[]>([])
  const [naming, setNaming] = useState(false)
  const vendors = useVendorDirectory(open && kind === 'vendor')   // (pending modules S12, one-home N-16)
  if (open !== wasOpen) { setWasOpen(open); if (open) { setValue(''); setClearVendor(false); setAdded([]); setNaming(false) } }
  const trades = [...categories, ...added.filter((a) => !categories.some((c) => c.toLowerCase() === a.toLowerCase()))]
  const pct = Number(value)
  const over = kind === 'markup' && value.trim() !== '' && Number.isFinite(pct) && pct > 1000
  const ready = kind === 'markup' ? value.trim() !== '' && Number.isFinite(pct) && pct >= 0 && pct <= 1000 : kind === 'vendor' ? clearVendor || value.trim() !== '' : value !== ''
  const apply = () => {
    if (!ready) return
    if (kind === 'category') onApply({ category: value === NO_CATEGORY ? null : value })
    else if (kind === 'vendor') onApply({ vendor: clearVendor ? null : spellVendor(vendors.list ?? [], value) })
    else onApply({ markupPct: pct })
  }
  const items = `${count} ${count === 1 ? 'item' : 'items'}`
  return (
    <Dialog open={open} onClose={onClose} title={TITLE[kind]} subtitle={items} size="form" width={400}
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button><Button isDisabled={!ready} onPress={apply}>{kind === 'vendor' && clearVendor ? `Clear on ${items}` : `Apply to ${items}`}</Button></>}>
      {kind === 'category' ? <TextField label="Category" mode="select" placeholder="Choose a category" options={[NO_CATEGORY, ...trades]} value={value} onChange={setValue} helper="The studio’s trades — Settings › Quotes & pricing. No category clears it."
                                        action={{ label: 'New category…', onSelect: () => setNaming(true), testId: 'new-category-row' }} />
        : kind === 'vendor' ? (
          <>
            <VendorNameField label="Vendor" value={clearVendor ? '' : value} onChange={setValue} directory={vendors.list} onAdd={vendors.add} maxLength={80} autoFocus disabled={clearVendor} testId="bulk-vendor"
                             helper={inBook.length ? `In the book: ${inBook.slice(0, 4).join(', ')}${inBook.length > 4 ? '…' : ''}` : 'From Company › Finance › Vendors'} />
            <Checkbox isSelected={clearVendor} onChange={(on: boolean) => setClearVendor(on)}>Clear the vendor instead</Checkbox>
          </>
        ) : <TextField label="Markup (% of cost)" numeric="decimal" value={value} onChange={setValue} autoFocus error={over ? 'Up to 1,000% of the cost' : undefined} helper="Re-prices each item: markup = cost × this share. Lines already on quotes keep theirs." />}
      {kind === 'category' ? <NewCategoryDialog open={naming} trades={trades} onClose={() => setNaming(false)} onAdded={(name) => { setAdded((xs) => [...xs, name]); setValue(name); setNaming(false) }} /> : null}
    </Dialog>
  )
}
