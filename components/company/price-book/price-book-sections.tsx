'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DropdownItem } from '@/components/leads/dropdown'
import { useRun } from '@/components/leads/tasks/use-run'
import { useSnackbar } from '@/components/om/snackbar'
import { Icon } from '@/components/om/icon'
import { MetaChip } from '@/components/om/meta-chip'
import { money2 } from '@/lib/quotes/math'
import { PRICE_BOOK_KINDS, PRICE_BOOK_TABS } from '@/lib/company/sections'
import type { PriceBookData, PriceBookSectionRow } from '@/lib/company/price-book'
import type { SavedLine } from '@/lib/quotes/items-model'
import { createPriceBookSection, deletePriceBookSections, deletePriceBookSectionsForever, duplicatePriceBookSection, emptyPriceBookSectionTrash, renamePriceBookSection, restorePriceBookSections, updatePriceBookSection } from '@/app/company/price-book-actions'
import { LibraryGallery, type LibraryItem } from '@/components/company/templates/library-gallery'
import gallery from '@/components/company/templates/library-gallery.module.css'
import { SectionDialog } from './section-dialog'
import styles from './price-book.module.css'

type Row = PriceBookSectionRow & LibraryItem
const toRow = (s: PriceBookSectionRow): Row => ({ ...s, title: s.name, updatedAt: s.updatedAt ?? s.createdAt })
const lineTotal = (l: SavedLine) => Math.round(l.qty * (l.costMinor + l.markupMinor) * (1 - l.discountPct / 100))
const total = (s: PriceBookSectionRow) => (s.body ? s.body.lines.reduce((n, l) => n + lineTotal(l), 0) + s.body.subs.reduce((n, g) => n + g.lines.reduce((x, l) => x + lineTotal(l), 0), 0) : 0)
const names = (s: PriceBookSectionRow) => (s.body ? [...s.body.lines.map((l) => l.name), ...s.body.subs.flatMap((g) => g.lines.map((l) => l.name))] : [])
const SHELL = { title: 'Price book', tabs: [...PRICE_BOOK_TABS] }

/**
 * Company › Price book › My Sections (REG-594 on REG-566): the whole sections saved from quotes ("Save section to My Items"),
 * as a library — a card per section with its first lines, "n items · S$total", "On n quotes"; New section starts a blank one;
 * Edit opens the section's own editor (name, lines, sub-sections); Duplicate / Rename / Delete, Deleted Sections.
 */
export function PriceBookSections({ data, from }: { data: PriceBookData; from?: string }) {
  const { sections, deletedSections, now } = data
  const router = useRouter()
  const snackbar = useSnackbar()
  const { run } = useRun()
  const [edit, setEdit] = useState<{ open: boolean; section: PriceBookSectionRow | null }>({ open: false, section: null })
  return (
    <LibraryGallery<Row> kind={PRICE_BOOK_KINDS.sections} shell={SHELL} noun={{ one: 'section', many: 'sections' }} nameLabel="Section" deletedLabel="Deleted Sections" openLabel="Edit"
      from={from} items={sections.map(toRow)} deleted={deletedSections.map(toRow)} now={now} ariaLabel="My Sections" tableKey="price-book-sections"
      newMenu={(close) => (<DropdownItem onSelect={() => { close(); void run('start the section', async () => { const id = await createPriceBookSection('New section'); router.refresh(); snackbar({ message: 'Section started — add its lines' }); setEdit({ open: true, section: { id, name: 'New section', description: null, linesJson: '{}', createdAt: new Date(), updatedAt: new Date(), lastUsedAt: null, deletedAt: null, body: { name: 'New section', description: null, descriptionHtml: null, lines: [], subs: [] }, lineCount: 0, usedBy: 0, author: null, authorColor: null } }) }) }}>New section</DropdownItem>)}
      searchText={(t) => names(t).join(' ')}
      thumb={(t) => (
        <span className={gallery.checklist}>
          {names(t).slice(0, 4).map((n, i) => <span key={i} className={gallery.checkRow}><Icon name="subject" size={16} weight={300} /><span className={gallery.checkText}>{n}</span></span>)}
          {names(t).length > 4 ? <span className={gallery.checkMore}>+{names(t).length - 4} more</span> : null}
          {names(t).length === 0 ? <span className={gallery.checkMore}>No lines yet</span> : null}
        </span>
      )}
      glyph={() => <span className={styles.glyph}><Icon name="folder" size={18} weight={300} /></span>}
      meta={(t) => `${t.lineCount} ${t.lineCount === 1 ? 'item' : 'items'} · ${money2(total(t))}${t.body?.subs.length ? ` · ${t.body.subs.length} sub-section${t.body.subs.length === 1 ? '' : 's'}` : ''}`}
      usage={(t) => (t.usedBy === 0 ? 'Not on a quote yet' : `On ${t.usedBy} ${t.usedBy === 1 ? 'quote' : 'quotes'}`)}
      usageWord={(t) => (t.usedBy === 0 ? '--' : `${t.usedBy} quote${t.usedBy === 1 ? '' : 's'}`)}
      chips={(t) => (t.body?.subs.length ? <MetaChip>Sub-sections</MetaChip> : null)}
      columns={[
        { key: 'items', label: 'Items', track: '100px', sortable: true, cell: (t) => <span>{t.lineCount}</span> },
        { key: 'total', label: 'Total', track: '140px', sortable: true, cell: (t) => <span className={styles.num}>{money2(total(t))}</span> },
        { key: 'used', label: 'Used by', track: '120px', sortable: true, cell: (t) => (t.usedBy > 0 ? <span>{t.usedBy} quote{t.usedBy === 1 ? '' : 's'}</span> : <span className={styles.muted}>Not used yet</span>) },
      ]}
      onOpen={(t) => setEdit({ open: true, section: t })}
      onDuplicate={async (t) => { await duplicatePriceBookSection(t.id); snackbar({ message: `${t.name} duplicated` }); router.refresh() }}
      onRename={(t, name) => renamePriceBookSection(t.id, name)}
      onDelete={(t) => deletePriceBookSections([t.id])}
      deleteMessage={(t) => (t.usedBy ? `The ${t.usedBy === 1 ? 'quote' : `${t.usedBy} quotes`} already carrying it ${t.usedBy === 1 ? 'keeps' : 'keep'} the lines. You can restore the section from Deleted Sections.` : 'You can restore it from Deleted Sections.')}
      onRestore={(ids) => restorePriceBookSections(ids)} onDeleteForever={(ids) => deletePriceBookSectionsForever(ids)} onEmptyTrash={() => emptyPriceBookSectionTrash()}
      deletedMeta={{ label: 'Items', value: (t) => `${t.lineCount} ${t.lineCount === 1 ? 'item' : 'items'}` }}
      empty={{ title: 'No saved sections yet', help: 'In a quote’s Items table, a section’s ⋯ › Save section to My Items keeps it here for the next quote — or start one from New.' }}>
      <SectionDialog open={edit.open} section={edit.section} onClose={() => setEdit({ open: false, section: null })}
                     onSave={(input) => { const cur = edit.section; setEdit({ open: false, section: null }); if (cur) void run('save the section', async () => { await updatePriceBookSection(cur.id, input); router.refresh() }, 'Section saved') }} />
    </LibraryGallery>
  )
}
