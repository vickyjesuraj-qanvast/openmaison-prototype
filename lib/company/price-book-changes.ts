/** (REG-652, price book parity Q-05) The fields an item's history follows, and how its lines read. Pure, client-safe. */
import { money2 } from '@/lib/quotes/math'
import { ITEM_KIND_LABEL, isItemKind } from '@/lib/quotes/items-model'

export type BookChangeKind = 'created' | 'imported' | 'edited' | 'approved' | 'sent_back' | 'deleted' | 'restored'
export type ItemChange = { id: string; kind: BookChangeKind; changes: Record<string, [unknown, unknown]>; note: string | null; by: string | null; at: number }

export const BOOK_FIELDS = [
  { key: 'name', label: 'Name' }, { key: 'description', label: 'Description' }, { key: 'kind', label: 'Kind' }, { key: 'unit', label: 'Unit' },
  { key: 'costMinor', label: 'Cost' }, { key: 'markupMinor', label: 'Markup' }, { key: 'category', label: 'Category' }, { key: 'vendor', label: 'Vendor' },
  /* (REG-653, price book parity Q-08) */ { key: 'link', label: 'Link' }, { key: 'thumb', label: 'Photo' },
] as const
export const CHANGE_WORD: Record<BookChangeKind, string> = { created: 'Added', imported: 'Imported', edited: 'Changed', approved: 'Approved', sent_back: 'Sent back', deleted: 'Deleted', restored: 'Restored' }

/** One field's change as a person reads it: "Cost S$12.00 → S$13.50"; a photo is added, replaced or removed, never spelled out. */
export function changeLine(field: string, [before, after]: [unknown, unknown]): string {
  if (field === 'thumb') return !before ? 'Photo added' : !after ? 'Photo removed' : 'Photo replaced'
  const f = BOOK_FIELDS.find((x) => x.key === field)
  const show = (v: unknown) => (v === null || v === undefined || v === '' ? '—' : field === 'costMinor' || field === 'markupMinor' ? money2(Number(v)) : field === 'kind' ? (isItemKind(String(v)) ? ITEM_KIND_LABEL[String(v) as keyof typeof ITEM_KIND_LABEL] : String(v)) : field === 'description' ? `“${String(v).slice(0, 60)}${String(v).length > 60 ? '…' : ''}”` : String(v))
  return `${f?.label ?? field} ${show(before)} → ${show(after)}`
}
