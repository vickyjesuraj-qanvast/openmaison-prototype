'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DropdownDivider, DropdownItem } from '@/components/leads/dropdown'
import { useRun } from '@/components/leads/tasks/use-run'
import { useSnackbar } from '@/components/om/snackbar'
import { Icon } from '@/components/om/icon'
import { money2 } from '@/lib/quotes/math'
import { ITEM_KINDS, ITEM_KIND_ICON, ITEM_KIND_LABEL, isItemKind, type ItemKind } from '@/lib/quotes/items-model'
import { PRICE_BOOK_KINDS, PRICE_BOOK_TABS } from '@/lib/company/sections'
import type { PriceBookData, PriceBookItemRow } from '@/lib/company/price-book'
import { createPriceBookItem, deletePriceBookItems, deletePriceBookItemsForever, duplicatePriceBookItem, emptyPriceBookItemTrash, importPriceBookItems, renamePriceBookItem, restorePriceBookItems, updatePriceBookItem, type PriceBookItemInput } from '@/app/company/price-book-actions'
import { LibraryGallery, type LibraryItem } from '@/components/company/templates/library-gallery'
import { ItemDialog } from './item-dialog'
import { ImportItemsDialog } from './import-items-dialog'
import styles from './price-book.module.css'

type Row = PriceBookItemRow & LibraryItem
const toRow = (i: PriceBookItemRow): Row => ({ ...i, title: i.name, updatedAt: i.updatedAt ?? i.createdAt })
const kindOf = (i: PriceBookItemRow): ItemKind => (isItemKind(i.kind) ? i.kind : 'purchase')
const unitPrice = (i: PriceBookItemRow) => i.costMinor + i.markupMinor
const SHELL = { title: 'Price book', tabs: [...PRICE_BOOK_TABS] }

/**
 * Company › Price book › My Items (REG-594; Mavid / Urban Home: "a price book page", "import our item list", "the same item
 * from different vendors"): the studio's items on the libraries' gallery (REG-538) — a card per item with its kind, unit price
 * and vendor, or the listing-model table with Kind · Unit · Cost · Markup · Unit price · Category · Vendor · Used by; New ▾
 * (New item · Import from a spreadsheet…), the kind segments, search that reads vendors too, Edit / Duplicate / Rename / Delete,
 * Deleted Items. The quote editor's "View Price Book" lands here with the way back.
 */
export function PriceBookItems({ data, from }: { data: PriceBookData; from?: string }) {
  const { items, deletedItems, now } = data
  const router = useRouter()
  const snackbar = useSnackbar()
  const { run } = useRun()
  const [edit, setEdit] = useState<{ open: boolean; item: PriceBookItemRow | null }>({ open: false, item: null })
  const [importOpen, setImportOpen] = useState(false)
  const kindsPresent = useMemo(() => ITEM_KINDS.filter((k) => items.some((i) => kindOf(i) === k)), [items])

  const save = (input: PriceBookItemInput) => {
    const cur = edit.item
    setEdit({ open: false, item: null })
    void run(cur ? 'save the item' : 'add the item', async () => { if (cur) await updatePriceBookItem(cur.id, input); else await createPriceBookItem(input); router.refresh() }, cur ? 'Item saved' : `${input.name} added to My Items`)
  }
  return (
    <LibraryGallery<Row> kind={PRICE_BOOK_KINDS.items} shell={SHELL} noun={{ one: 'item', many: 'items' }} nameLabel="Item" deletedLabel="Deleted Items" openLabel="Edit"
      from={from} items={items.map(toRow)} deleted={deletedItems.map(toRow)} now={now} ariaLabel="My Items" tableKey="price-book-items"
      newMenu={(close) => (<>
        <DropdownItem onSelect={() => { close(); setEdit({ open: true, item: null }) }}>New item</DropdownItem>
        <DropdownDivider />
        <DropdownItem onSelect={() => { close(); setImportOpen(true) }}>Import from a spreadsheet…</DropdownItem>
      </>)}
      filters={kindsPresent.map((k) => ({ key: k, label: ITEM_KIND_LABEL[k], test: (t) => kindOf(t) === k }))}
      searchText={(t) => [t.description, t.category, t.vendor, ITEM_KIND_LABEL[kindOf(t)]].filter(Boolean).join(' ')}
      thumb={(t) => (
        <span className={styles.itemThumb} data-kind={kindOf(t)}>
          <Icon name={ITEM_KIND_ICON[kindOf(t)]} size={40} weight={300} />
          <span className={styles.itemPrice}>{money2(unitPrice(t))}</span>
          <span className={styles.itemUnit}>per {t.unit}</span>
        </span>
      )}
      glyph={(t) => <span className={styles.glyph}><Icon name={ITEM_KIND_ICON[kindOf(t)]} size={18} weight={300} /></span>}
      meta={(t) => [t.vendor ? `by ${t.vendor}` : ITEM_KIND_LABEL[kindOf(t)], `${money2(unitPrice(t))} / ${t.unit}`, t.category].filter(Boolean).join(' · ')}   /* the vendor leads: the same tile from two suppliers must read apart at a glance */
      usage={(t) => (t.usedBy === 0 ? 'Not on a quote yet' : `On ${t.usedBy} ${t.usedBy === 1 ? 'quote' : 'quotes'}`)}
      usageWord={(t) => (t.usedBy === 0 ? '--' : `${t.usedBy} quote${t.usedBy === 1 ? '' : 's'}`)}
      columns={[
        { key: 'kind', label: 'Kind', track: '110px', cell: (t) => <span>{ITEM_KIND_LABEL[kindOf(t)]}</span> },
        { key: 'unit', label: 'Unit', track: '96px', cell: (t) => <span className={styles.oneLine}>{t.unit}</span> },
        { key: 'cost', label: 'Cost', track: '120px', sortable: true, cell: (t) => <span className={styles.num}>{money2(t.costMinor)}</span> },
        { key: 'markup', label: 'Markup', track: '120px', cell: (t) => <span className={styles.num}>{money2(t.markupMinor)}</span> },
        { key: 'price', label: 'Unit price', track: '130px', sortable: true, cell: (t) => <span className={styles.num}>{money2(unitPrice(t))}</span> },
        { key: 'category', label: 'Category', track: '150px', cell: (t) => <span className={`${styles.oneLine} ${t.category ? '' : styles.muted}`}>{t.category ?? '—'}</span> },
        { key: 'vendor', label: 'Vendor', track: '160px', cell: (t) => <span className={`${styles.oneLine} ${t.vendor ? '' : styles.muted}`}>{t.vendor ?? '—'}</span> },
        { key: 'used', label: 'Used by', track: '120px', sortable: true, cell: (t) => (t.usedBy > 0 ? <span>{t.usedBy} quote{t.usedBy === 1 ? '' : 's'}</span> : <span className={styles.muted}>Not used yet</span>) },
      ]}
      onOpen={(t) => setEdit({ open: true, item: t })}
      onDuplicate={async (t) => { await duplicatePriceBookItem(t.id); snackbar({ message: `${t.name} duplicated` }); router.refresh() }}
      onRename={(t, name) => renamePriceBookItem(t.id, name)}
      onDelete={(t) => deletePriceBookItems([t.id])}
      deleteMessage={(t) => (t.usedBy ? `The ${t.usedBy === 1 ? 'quote' : `${t.usedBy} quotes`} already carrying it ${t.usedBy === 1 ? 'keeps' : 'keep'} the line. You can restore the item from Deleted Items.` : 'You can restore it from Deleted Items.')}
      onRestore={(ids) => restorePriceBookItems(ids)} onDeleteForever={(ids) => deletePriceBookItemsForever(ids)} onEmptyTrash={() => emptyPriceBookItemTrash()}
      deletedMeta={{ label: 'Unit price', value: (t) => `${money2(unitPrice(t))} / ${t.unit}` }}
      empty={{ title: 'Nothing in My Items yet', help: 'Add an item, import your list from a spreadsheet, or save a line from a quote’s Items table (⋯ › Save to Your Library).' }}>
      <ItemDialog open={edit.open} item={edit.item} onClose={() => setEdit({ open: false, item: null })} onSave={save} />
      <ImportItemsDialog open={importOpen} onClose={() => setImportOpen(false)}
                         onImport={(lines, vendor) => { setImportOpen(false); void run('import the items', async () => { const n = await importPriceBookItems(lines, vendor); router.refresh(); snackbar({ message: `${n} ${n === 1 ? 'item' : 'items'} imported${vendor ? ` from ${vendor}` : ''}` }) }) }} />
    </LibraryGallery>
  )
}
