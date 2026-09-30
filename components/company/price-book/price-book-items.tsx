'use client'

import { useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { DropdownDivider, DropdownItem } from '@/components/leads/dropdown'
import { useRun } from '@/components/leads/tasks/use-run'
import { useSnackbar } from '@/components/om/snackbar'
import { Icon } from '@/components/om/icon'
import { MetaChip } from '@/components/om/meta-chip'
import { NoteDialog } from '@/components/templates/editor/review-bar'
import { money2 } from '@/lib/quotes/math'
import { BOOK_RULE, itemChangeBlock } from '@/lib/company/price-book-rules'
import { ITEM_KINDS, ITEM_KIND_ICON, ITEM_KIND_LABEL, isItemKind, type ItemKind } from '@/lib/quotes/items-model'
import { PRICE_BOOK_KINDS, PRICE_BOOK_TABS } from '@/lib/company/sections'
import type { PriceBookData, PriceBookItemRow } from '@/lib/company/price-book'
import { approvePriceBookItem, bulkUpdatePriceBookItems, undoBulkPriceBook, createPriceBookItem, deletePriceBookItems, deletePriceBookItemsForever, duplicatePriceBookItem, emptyPriceBookItemTrash, importPriceBookItems, renamePriceBookItem, restorePriceBookItems, sendBackPriceBookItem, undoPriceBookImport, updatePriceBookItem, type ImportBatch, type PriceBookItemInput } from '@/app/company/price-book-actions'
import { ConfirmDialog } from '@/components/om/confirm-dialog'
import { BulkEditDialog, type BulkEdit } from './bulk-edit-dialog'
import { LibraryGallery, settle, type LibraryItem } from '@/components/company/templates/library-gallery'
import { ItemDialog } from './item-dialog'
import { ImportItemsDialog } from './import-items-dialog'
import { ExportDialog } from '@/components/leads/export-dialog'
import { buildTable, downloadBlob, type ExportFormat } from '@/lib/leads/export'
import styles from './price-book.module.css'
import table from '@/components/company/templates/templates-table.module.css'
import { folderBlock, type Folder } from '@/lib/company/folder-libraries'
import { PriceBookItemsGhost } from './price-book-ghost'

type Row = PriceBookItemRow & LibraryItem
const toRow = (i: PriceBookItemRow): Row => ({ ...i, title: i.name, updatedAt: i.updatedAt ?? i.createdAt })
/** (REG-653) In the Deleted sheet, *Made by* is who added the item — its last change there is the delete. */
const toDeletedRow = (i: PriceBookItemRow): Row => ({ ...toRow(i), author: i.maker, authorColor: i.makerColor })
/** (REG-653, price book parity Q-11) An item a live quote came from waits in the trash — the libraries' rule. */
const inUseReason = (t: PriceBookItemRow) => (t.usedBy > 0 ? `On ${t.usedBy} ${t.usedBy === 1 ? 'quote' : 'quotes'} — restore it instead` : null)
const kindOf = (i: PriceBookItemRow): ItemKind => (isItemKind(i.kind) ? i.kind : 'purchase')
const unitPrice = (i: PriceBookItemRow) => i.costMinor + i.markupMinor
const SHELL = { title: 'Price book', tabs: [...PRICE_BOOK_TABS], skeleton: <PriceBookItemsGhost /> }   /* (REG-708) the ghost its loading.tsx draws — (UX audit S8) the list, or the member's own grid */

/**
 * Company › Price book › My Items (REG-594; Mavid / Urban Home: "a price book page", "import our item list", "the same item
 * from different vendors"): the studio's items on the libraries' gallery (REG-538) — a card per item with its kind, unit price
 * and vendor, or the listing-model table with Kind · Unit · Cost · Markup · Unit price · Category · Vendor · Used by; New ▾
 * (New item · Import from a spreadsheet… · Export My Items… — REG-627), the kind segments, search that reads vendors too, Edit / Duplicate / Rename / Delete,
 * Deleted Items. The quote editor's Price book modal › Manage Price book (REG-662) lands here with the way back.
 * (REG-652, price book parity Q-03…Q-05) Owners and Admins change the book; anyone else reads it — items open read-only, the changing
 * rows say why — and proposes an item; a proposal carries its chip, the Proposed segment gathers them, an Owner or an Admin approves
 * one or sends it back with a note (the kebab and the dialog's bar); every item keeps its History; the list names who changed each.
 */
export function PriceBookItems({ data, from, folders = [] }: { data: PriceBookData; from?: string; folders?: Folder[] }) {
  const { items, deletedItems, now, viewer, runsBook } = data
  const router = useRouter()
  const snackbar = useSnackbar()
  const { run } = useRun()
  /* (REG-709) `?open=<id>` — an item the global search found — opens its dialog on arrival */
  const opening = useSearchParams().get('open')
  const [edit, setEdit] = useState<{ open: boolean; item: PriceBookItemRow | null }>(() => { const it = opening ? items.find((i) => i.id === opening) ?? null : null; return { open: !!it, item: it } })
  /* (UX audit V11) a bell notice pressed while this page is already open changes only `?open=` — the item it names opens then too */
  const [seenOpening, setSeenOpening] = useState(opening)
  if (opening !== seenOpening) { setSeenOpening(opening); const it = opening ? items.find((i) => i.id === opening) ?? null : null; if (it) setEdit({ open: true, item: it }) }
  /* (UX audit S7) What the last import touched — added and updated — as the list's "just imported" to-do: the list narrows to them when the
     import lands (the "Show them"), a press on the chip gives the whole book back; the snackbar's Undo takes the import back. */
  const [imported, setImported] = useState<Set<string> | null>(null)
  const [focus, setFocus] = useState<{ key: string } | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [exportShown, setExportShown] = useState<PriceBookItemRow[] | null>(null)
  /* (REG-627, parity Q-18) The export's sheet: the list's own columns plus the description, money with its two decimals.
     (REG-653, price book parity Q-14) Every item or what the list shows; Kind and Link come back on an import (the columns map by name). */
  const downloadItems = (format: ExportFormat, scope: 'all' | 'shown' = 'all') => {
    const head = ['Item', 'Kind', 'Description', 'Unit', 'Cost', 'Markup', 'Unit price', 'Category', 'Vendor', 'Website link', 'Used by']   // (sweep S5 #29) the dialog's names; the import reads them back
    const d2 = (m: number) => (m / 100).toFixed(2)
    const list = scope === 'shown' && exportShown ? exportShown : items
    const body = list.map((i) => [i.name, ITEM_KIND_LABEL[kindOf(i)], i.description ?? '', i.unit, d2(i.costMinor), d2(i.markupMinor), d2(unitPrice(i)), i.category ?? '', i.vendor ?? '', i.link ?? '', String(i.usedBy)])
    return downloadBlob(buildTable('OpenMaison — My Items', head, body, format), `my-items.${format.toLowerCase()}`)
  }
  /* (REG-653, price book parity Q-15) The list's bulk changes: Set category · Set vendor · Set markup · Delete — the Owners' and Admins'. */
  const [bulkEdit, setBulkEdit] = useState<{ kind: BulkEdit; ids: string[]; clear: () => void } | null>(null)
  const [bulkDelete, setBulkDelete] = useState<{ ids: string[]; clear: () => void } | null>(null)
  const categories = useMemo(() => [...new Set([...data.trades, ...items.map((i) => i.category).filter((c): c is string => !!c)])].sort((a, b) => a.localeCompare(b)), [data.trades, items])
  const kindsPresent = useMemo(() => ITEM_KINDS.filter((k) => items.some((i) => kindOf(i) === k)), [items])
  const proposedCount = items.filter((i) => i.status === 'proposed').length
  const block = (t: PriceBookItemRow) => itemChangeBlock(viewer, t)
  const [sendBack, setSendBack] = useState<PriceBookItemRow | null>(null)

  /* (sweep S5 #3) The dialog stays until the server has the item — a failure keeps everything typed; (#1) an Owner's edits to a proposal
     are saved before it is approved (Approve threw them away). */
  const save = async (input: PriceBookItemInput) => {
    const cur = edit.item
    const ok = await run(cur ? 'save the item' : runsBook ? 'add the item' : 'propose the item', async () => { if (cur) await settle(updatePriceBookItem(cur.id, input)); else await settle(createPriceBookItem(input)); router.refresh() },   /* (wave E, E7) a refusal is said, the dialog stays */
      cur ? 'Item saved' : runsBook ? `${input.name} added to My Items` : `${input.name} proposed — it’s on your quotes now; an Owner or an Admin approves it for the studio`)
    if (ok) setEdit({ open: false, item: null })
  }
  const approve = async (t: PriceBookItemRow, edited: PriceBookItemInput | null = null) => {
    const ok = await run('approve the item', async () => { if (edited) await settle(updatePriceBookItem(t.id, edited)); await settle(approvePriceBookItem(t.id)); router.refresh() }, `${edited?.name ?? t.name} ${edited ? 'saved and approved' : 'approved'} — it’s in My Items for the studio`)
    if (ok) setEdit({ open: false, item: null })
  }
  const askSendBack = (t: PriceBookItemRow) => { setEdit({ open: false, item: null }); setSendBack(t) }
  return (
    <LibraryGallery<Row> kind={PRICE_BOOK_KINDS.items} shell={SHELL} noun={{ one: 'item', many: 'items' }} nameLabel="Item" deletedLabel="Deleted Items"
      from={from} folders={{ library: 'book-items', list: folders, block: folderBlock(data.viewer) }} items={items.map(toRow)} deleted={deletedItems.map(toDeletedRow)} keepReason={inUseReason} now={now} ariaLabel="My Items" tableKey="price-book-items"
      newMenu={(close) => (<>
        <DropdownItem onSelect={() => { close(); setEdit({ open: true, item: null }) }}>{runsBook ? 'New item' : 'Propose an item'}</DropdownItem>
        <DropdownDivider />
        <DropdownItem onSelect={() => { close(); setImportOpen(true) }} disabled={!runsBook} help={runsBook ? undefined : BOOK_RULE}>Import from a spreadsheet…</DropdownItem>   {/* (REG-728) the reason in the row, not a native title */}
      </>)}
      pageMenu={(shown) => [{ label: 'Export My Items…', onSelect: () => setExportShown(shown) }]}   /* (REG-653, Q-14 · E-73) export sits in the page kebab, as on the Leads listing and the Tasks tab */
      facets={[
        { key: 'category', label: 'Category', options: categories.filter((c) => items.some((i) => (i.category ?? '').toLowerCase() === c.toLowerCase())), test: (t, v) => (t.category ?? '').toLowerCase() === v.toLowerCase() },
        { key: 'vendor', label: 'Vendor', options: data.vendors, test: (t, v) => t.vendor === v },
      ]}
      bulk={runsBook ? (ids, clear) => [
        { label: 'Set category', onClick: () => setBulkEdit({ kind: 'category', ids, clear }) },
        { label: 'Set vendor', onClick: () => setBulkEdit({ kind: 'vendor', ids, clear }) },
        { label: 'Set markup', onClick: () => setBulkEdit({ kind: 'markup', ids, clear }) },
        { label: 'Delete', tone: 'danger', onClick: () => setBulkDelete({ ids, clear }) },
      ] : undefined}
      filters={[...(imported && imported.size ? [{ key: 'imported', label: 'Just imported', test: (t: Row) => imported.has(t.id), attention: (n: number) => `${n} just imported`, icon: 'upload_file' }] : []), ...(proposedCount ? [{ key: 'proposed', label: 'Proposed', test: (t: Row) => t.status === 'proposed', attention: (n: number) => `${n} proposed` }] : []), ...kindsPresent.map((k) => ({ key: k, label: ITEM_KIND_LABEL[k], test: (t: Row) => t.status !== 'proposed' && kindOf(t) === k }))]}
      focusFilter={focus} defaultView="list"   /* (UX audit S8) a member who never picked a view gets the list — the listing's table model */
      filterLabel="Kind"   /* (REG-666) a proposal counts once — under Proposed, the to-do — so the kinds add up to All */
      chips={(t) => (t.status === 'proposed' ? <MetaChip color="yellow">Proposed</MetaChip> : null)}
      listChips={() => null}   /* (REG-820) the list says it in its Status column — the chip in the name cell cut "Skirting, PVC 80 mm" to "Skirting, PVC 8…" */
      byColumn openLabel={(t) => (block(t) ? 'Open' : 'Edit')} mayChange={block} duplicateBlock={() => (runsBook ? null : BOOK_RULE)}
      restoreBlock={block} purgeBlock={runsBook ? null : BOOK_RULE}
      kebab={(t) => (runsBook && t.status === 'proposed' ? [{ label: 'Approve', onSelect: () => { void approve(t) } }, { label: 'Send back…', onSelect: () => askSendBack(t) }] : [])}
      searchText={(t) => [t.description, t.category, t.vendor, ITEM_KIND_LABEL[kindOf(t)]].filter(Boolean).join(' ')}
      thumb={(t) => (
        <span className={styles.itemThumb} data-kind={kindOf(t)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {t.thumb ? <img className={styles.itemPhoto} src={t.thumb} alt="" /> : <Icon name={ITEM_KIND_ICON[kindOf(t)]} size={40} weight={300} />}   {/* (REG-653, Q-08 · E-77) the photo it carries */}
          <span className={styles.itemPrice}>{money2(unitPrice(t))}</span>
          <span className={styles.itemUnit}>per {t.unit}</span>
        </span>
      )}
      // eslint-disable-next-line @next/next/no-img-element
      glyph={(t) => <span className={styles.glyph}>{t.thumb ? <img src={t.thumb} alt="" /> : <Icon name={ITEM_KIND_ICON[kindOf(t)]} size={20} weight={300} />}</span>}
      meta={(t) => [t.vendor ? `by ${t.vendor}` : ITEM_KIND_LABEL[kindOf(t)], `${money2(unitPrice(t))} / ${t.unit}`, t.category].filter(Boolean).join(' · ')}   /* the vendor leads: the same tile from two suppliers must read apart at a glance */
      usage={(t) => (t.usedBy === 0 ? 'Not on a quote yet' : `On ${t.usedBy} ${t.usedBy === 1 ? 'quote' : 'quotes'}`)}
      usageWord={(t) => (t.usedBy === 0 ? 'Not on a quote yet' : `${t.usedBy} quote${t.usedBy === 1 ? '' : 's'}`)}   /* (REG-653, Q-18) zero use, said one way */
      columns={[
        /* (REG-820) Status, as Templates › Quotes lists it (the status word and its note): 1.0's words — an item is Approved unless it waits */
        { key: 'status', label: 'Status', track: '150px', sortable: (t) => (t.status === 'proposed' ? 0 : 1),
          cell: (t) => <span className={table.status}><span className={table.statusWord} data-tone={t.status === 'proposed' ? 'await' : undefined}>{t.status === 'proposed' ? 'Proposed' : 'Approved'}</span>{t.status === 'proposed' && t.proposer ? <span className={table.statusNote}>by {t.proposer}</span> : null}</span> },
        { key: 'kind', label: 'Kind', track: '110px', cell: (t) => <span>{ITEM_KIND_LABEL[kindOf(t)]}</span> },
        { key: 'unit', label: 'Unit', track: '96px', cell: (t) => <span className={styles.oneLine}>{t.unit}</span> },
        { key: 'cost', label: 'Cost', track: '120px', sortable: (t) => t.costMinor, cell: (t) => <span className={styles.num}>{money2(t.costMinor)}</span> },
        { key: 'markup', label: 'Markup', track: '120px', sortable: (t) => t.markupMinor, cell: (t) => <span className={styles.num}>{money2(t.markupMinor)}</span> },
        { key: 'price', label: 'Unit price', track: '130px', sortable: (t) => unitPrice(t), cell: (t) => <span className={styles.num}>{money2(unitPrice(t))}</span> },
        { key: 'category', label: 'Category', track: '150px', sortable: (t) => (t.category ?? '\uffff').toLowerCase(), cell: (t) => <span className={`${styles.oneLine} ${t.category ? '' : styles.muted}`}>{t.category ?? '--'}</span> },   /* (sweep S5 #33) an empty cell reads "--" (REG-228) */
        { key: 'vendor', label: 'Vendor', track: '160px', sortable: (t) => (t.vendor ?? '\uffff').toLowerCase(), cell: (t) => <span className={`${styles.oneLine} ${t.vendor ? '' : styles.muted}`}>{t.vendor ?? '--'}</span> },
        { key: 'used', label: 'Used by', track: '160px', sortable: true, cell: (t) => (t.usedBy > 0 ? <span className={styles.oneLine}>{t.usedBy} quote{t.usedBy === 1 ? '' : 's'}</span> : <span className={`${styles.oneLine} ${styles.muted}`}>Not on a quote yet</span>) },   /* (sweep S5 #9) one line, never cut */
      ]}
      onOpen={(t) => setEdit({ open: true, item: t })}
      onDuplicate={async (t) => { await settle(duplicatePriceBookItem(t.id)); snackbar({ message: `${t.name} duplicated` }); router.refresh() }}   /* (wave E, E7) a refusal throws its rule for the gallery to say */
      onRename={(t, name) => renamePriceBookItem(t.id, name)}
      onDelete={(t) => deletePriceBookItems([t.id])}
      deleteMessage={(t) => (t.usedBy ? `The ${t.usedBy === 1 ? 'quote' : `${t.usedBy} quotes`} already carrying it ${t.usedBy === 1 ? 'keeps' : 'keep'} the line. You can restore the item from Deleted Items.` : 'You can restore it from Deleted Items.')}
      onRestore={(ids) => restorePriceBookItems(ids)} onDeleteForever={(ids) => deletePriceBookItemsForever(ids)} onEmptyTrash={() => emptyPriceBookItemTrash()}
      deletedMeta={{ label: 'Unit price', value: (t) => `${money2(unitPrice(t))} / ${t.unit}` }}
      empty={{ title: 'Nothing in My Items yet', help: runsBook ? 'Add an item, import your list from a spreadsheet, or save a line from a quote’s Items table (⋯ › Save to My Items).' : 'Propose an item — an Owner or an Admin approves it for the studio.',
        /* (REG-735) the first run carries New ▾'s rows: a studio moving in has its list already, so Import leads; a Designer proposes */
        start: () => (runsBook
          ? { primary: { label: 'Import from a spreadsheet', icon: 'upload_file', onPress: () => setImportOpen(true) }, secondary: { label: 'New item', icon: 'add', onPress: () => setEdit({ open: true, item: null }) } }
          : { primary: { label: 'Propose an item', icon: 'add', onPress: () => setEdit({ open: true, item: null }) } }) }}>   {/* (sweep S5 #22) the help offers what this member can do */}
      <ItemDialog open={edit.open} item={edit.item} onClose={() => setEdit({ open: false, item: null })} onSave={save} trades={data.trades} now={now}
                  proposing={!runsBook} readOnly={edit.item ? block(edit.item) : null}
                  proposal={edit.item && edit.item.status === 'proposed' ? { by: edit.item.proposer, at: edit.item.createdAt.getTime(), canReview: runsBook, onApprove: (edited) => { if (edit.item) return approve(edit.item, edited) }, onSendBack: () => { if (edit.item) askSendBack(edit.item) } } : null} />
      {/* (REG-652, price book parity Q-04) Sending a proposal back needs its reason — it reaches the proposer in the bell and stays in the item's History. */}
      <NoteDialog open={!!sendBack} title="Send back" label="What should change?" action="Send back" busy={false} required maxLength={300}
                  help={`Goes to ${sendBack?.proposer ?? 'whoever proposed it'} in the bell. The item leaves My Items; lines already on their quotes keep their figures.`}
                  onClose={() => setSendBack(null)} onSubmit={(note) => { const t = sendBack; setSendBack(null); if (t) void run('send the item back', async () => { await settle(sendBackPriceBookItem(t.id, note)); router.refresh() }, `${t.name} sent back to ${t.proposer ?? 'its proposer'}`) }} />
      {/* (REG-627, parity Q-18) Export My Items — 1.0's CSV export, on the house Export dialog: every live item with the columns the list shows. */}
      <ExportDialog open={!!exportShown} title="Export My Items" download={downloadItems} onClose={() => setExportShown(null)} scope={exportShown ? { all: items.length, shown: exportShown.length, noun: 'items' } : undefined}
                    onDone={(name, format, count) => snackbar({ message: `Exported ${count ?? items.length} ${(count ?? items.length) === 1 ? 'item' : 'items'} as ${format} · ${name}` })} />
      <ImportItemsDialog open={importOpen} onClose={() => setImportOpen(false)} book={items.filter((i) => i.status === 'live')} trades={data.trades}
                         onImport={(lines, vendor, match, kind) => { setImportOpen(false); void run('import the items', async () => {
                           const r = (await settle(importPriceBookItems(lines, vendor, match, kind))) as { added: number; updated: number; skipped: number; batch: ImportBatch; touched: string[] }; router.refresh()
                           const said = [r.added ? `${r.added} ${r.added === 1 ? 'item' : 'items'} added` : null, r.updated ? `${r.updated} updated` : null, r.skipped ? `${r.skipped} skipped` : null].filter(Boolean).join(' · ') || 'Nothing imported'
                           /* (UX audit S7) the list shows what came in (the "just imported" chip), and Undo takes the import back — added rows go,
                              updated rows take their old values from History */
                           if (r.touched.length) { setImported(new Set(r.touched)); setFocus({ key: 'imported' }) }
                           const undoable = r.batch.added.length + r.batch.changes.length > 0
                           snackbar({ key: 'price-book-import', message: said, ...(undoable ? { actionLabel: 'Undo', onAction: () => { void run('undo the import', async () => {
                             const u = (await settle(undoPriceBookImport(r.batch))) as { removed: number; restored: number }; setImported(null); router.refresh()
                             snackbar({ key: 'price-book-import', message: `Import undone${[u.removed ? ` — ${u.removed} ${u.removed === 1 ? 'item' : 'items'} removed` : '', u.restored ? `${u.removed ? ',' : ' —'} ${u.restored} put back as ${u.restored === 1 ? 'it was' : 'they were'}` : ''].join('')}` })
                           }) } } : {}) })
                         }) }} />
      <BulkEditDialog open={!!bulkEdit} kind={bulkEdit?.kind ?? 'category'} count={bulkEdit?.ids.length ?? 0} categories={data.trades} vendors={data.vendors} onClose={() => setBulkEdit(null)}
                      onApply={(change) => {
                        const b = bulkEdit; setBulkEdit(null); if (!b) return
                        /* (sweep S5 #11) the page's Undo: the one field changed, put back on each item as it was */
                        const prev = items.filter((i) => b.ids.includes(i.id)).map((i) => ({ id: i.id, ...(change.category !== undefined ? { category: i.category ?? null } : {}), ...(change.vendor !== undefined ? { vendor: i.vendor ?? null } : {}), ...(change.markupPct !== undefined ? { markupMinor: i.markupMinor } : {}) }))
                        void run('change the items', async () => { const v = await settle(bulkUpdatePriceBookItems(b.ids, change)); const n = typeof v === 'number' ? v : b.ids.length; b.clear(); router.refresh()
                          snackbar({ message: `${n} ${n === 1 ? 'item' : 'items'} changed`, actionLabel: 'Undo', onAction: () => { void run('undo the change', async () => { await settle(undoBulkPriceBook(prev)); router.refresh() }, 'Change undone') } }) })
                      }} />
      <ConfirmDialog open={!!bulkDelete} title={`Delete ${bulkDelete?.ids.length ?? 0} ${bulkDelete?.ids.length === 1 ? 'item' : 'items'}?`} confirmLabel="Delete"
                     message="Quotes already carrying them keep their lines. You can restore them from Deleted Items."
                     onCancel={() => setBulkDelete(null)} onConfirm={() => { const b = bulkDelete; setBulkDelete(null); if (b) void run('delete the items', async () => { await settle(deletePriceBookItems(b.ids)); b.clear(); router.refresh() }, { message: `${b.ids.length} ${b.ids.length === 1 ? 'item' : 'items'} deleted`, actionLabel: 'Undo', onAction: () => { void run('restore the items', async () => { await settle(restorePriceBookItems(b.ids)); router.refresh() }, 'Items restored') } }) }} />
    </LibraryGallery>
  )
}
