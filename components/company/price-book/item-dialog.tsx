'use client'

import { useState } from 'react'
import { Button, TextArea } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { TextField } from '@/components/om/text-field'
import { money2 } from '@/lib/quotes/math'
import { ITEM_KINDS, ITEM_KIND_LABEL, UNITS, isItemKind } from '@/lib/quotes/items-model'
import type { PriceBookItem } from '@/lib/db/schema'
import type { PriceBookItemInput } from '@/app/company/price-book-actions'
import styles from './price-book.module.css'

type Draft = { name: string; description: string; kind: string; unit: string; cost: string; markup: string; category: string; vendor: string }
const toDraft = (i: PriceBookItem | null): Draft => ({ name: i?.name ?? '', description: i?.description ?? '', kind: ITEM_KIND_LABEL[isItemKind(i?.kind) ? i.kind : 'purchase'], unit: i?.unit ?? 'Pieces', cost: i ? (i.costMinor / 100).toFixed(2) : '', markup: i ? (i.markupMinor / 100).toFixed(2) : '', category: i?.category ?? '', vendor: i?.vendor ?? '' })
const toMinor = (s: string) => { const n = Number.parseFloat(s); return Number.isFinite(n) ? Math.round(n * 100) : 0 }
const kindOf = (label: string) => ITEM_KINDS.find((k) => ITEM_KIND_LABEL[k] === label) ?? 'purchase'

/**
 * (REG-594) One item of My Items, new or edited: what the Add Item popover and a picked line copy — name, description, kind,
 * unit, cost and markup (the unit price follows), category and vendor. The M 600 modal shell; amounts filter as typed (REG-150).
 */
export function ItemDialog({ open, item, onClose, onSave }: { open: boolean; item: PriceBookItem | null; onClose: () => void; onSave: (input: PriceBookItemInput) => void | Promise<void> }) {
  const [d, setD] = useState<Draft>(() => toDraft(item))
  const [touched, setTouched] = useState(false)
  const [wasOpen, setWasOpen] = useState(open)
  const [seen, setSeen] = useState(item?.id ?? null)
  if (open !== wasOpen || (item?.id ?? null) !== seen) { setWasOpen(open); setSeen(item?.id ?? null); if (open) { setD(toDraft(item)); setTouched(false) } }
  const set = (k: keyof Draft) => (v: string) => setD((x) => ({ ...x, [k]: v }))
  const nameOk = d.name.trim().length > 0
  const unitPrice = toMinor(d.cost) + toMinor(d.markup)
  const units = UNITS.includes(d.unit as (typeof UNITS)[number]) ? [...UNITS] : [d.unit, ...UNITS]
  const save = () => { setTouched(true); if (!nameOk) return; void onSave({ name: d.name.trim(), description: d.description.trim() || null, kind: kindOf(d.kind), unit: d.unit, costMinor: toMinor(d.cost), markupMinor: toMinor(d.markup), category: d.category.trim() || null, vendor: d.vendor.trim() || null }) }
  return (
    <Dialog open={open} onClose={onClose} title={item ? 'Edit item' : 'New item'} size="modal" width={600}
            subtitle={item ? 'Lines already on a quote keep what they copied; new picks take these values.' : 'What a quote line starts with when this item is picked.'}
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button><Button isDisabled={!nameOk && touched} onPress={save}>{item ? 'Save' : 'Add to My Items'}</Button></>}>
      <div className={styles.fields} data-testid="item-dialog">
        <TextField label="Item name" required value={d.name} onChange={set('name')} maxLength={200} autoFocus error={touched && !nameOk ? 'Give the item a name' : undefined} />
        <TextArea label="Description" value={d.description} onChange={(v: string) => set('description')(v)} maxLength={2000} />
        <div className={styles.pair}>
          <TextField label="Kind" mode="select" options={ITEM_KINDS.map((k) => ITEM_KIND_LABEL[k])} value={d.kind} onChange={set('kind')} />
          <TextField label="Unit" mode="select" options={units} value={d.unit} onChange={set('unit')} />
        </div>
        <div className={styles.pair}>
          <TextField label="Cost (S$)" numeric="amount" value={d.cost} onChange={set('cost')} />
          <TextField label="Markup (S$)" numeric="amount" value={d.markup} onChange={set('markup')} helper={`Unit price ${money2(unitPrice)}`} />
        </div>
        <div className={styles.pair}>
          <TextField label="Category" value={d.category} onChange={set('category')} maxLength={60} helper="Tiling, Carpentry, Electrical…" />
          <TextField label="Vendor" value={d.vendor} onChange={set('vendor')} maxLength={80} helper="Who supplies it — the same product from two vendors is two items" />
        </div>
      </div>
    </Dialog>
  )
}
