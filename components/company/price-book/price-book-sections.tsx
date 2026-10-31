'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { DropdownItem } from '@/components/leads/dropdown'
import { useRun } from '@/components/leads/tasks/use-run'
import { useSnackbar } from '@/components/om/snackbar'
import { Icon } from '@/components/om/icon'
import { MetaChip } from '@/components/om/meta-chip'
import { money2 } from '@/lib/quotes/math'
import { PRICE_BOOK_KINDS, PRICE_BOOK_TABS } from '@/lib/company/sections'
import { SECTION_RULE } from '@/lib/company/price-book-rules'
import type { PriceBookData, PriceBookSectionRow } from '@/lib/company/price-book'
import type { SavedLine } from '@/lib/quotes/items-model'
import { createPriceBookSection, deletePriceBookSections, deletePriceBookSectionsForever, duplicatePriceBookSection, emptyPriceBookSectionTrash, renamePriceBookSection, restorePriceBookSections, updatePriceBookSection } from '@/app/company/price-book-actions'
import { LibraryGallery, settle, type LibraryItem } from '@/components/company/templates/library-gallery'
import gallery from '@/components/company/templates/library-gallery.module.css'
import { SectionDialog } from './section-dialog'
import styles from './price-book.module.css'
import { LIBRARY_ROOT, folderBlock, type Folder } from '@/lib/company/folder-libraries'
import { PriceBookSectionsGhost } from './price-book-ghost'

type Row = PriceBookSectionRow & LibraryItem
const toRow = (s: PriceBookSectionRow): Row => ({ ...s, title: s.name, updatedAt: s.updatedAt ?? s.createdAt })
const toDeletedRow = (s: PriceBookSectionRow): Row => ({ ...toRow(s), author: s.maker ?? null, authorColor: s.makerColor ?? null })   // (REG-653) Made by = who saved it
const inUseReason = (t: PriceBookSectionRow) => (t.usedBy > 0 ? `On ${t.usedBy} ${t.usedBy === 1 ? 'quote' : 'quotes'} — restore it instead` : null)   // (REG-653, Q-11)
const lineTotal = (l: SavedLine) => Math.round(l.qty * (l.costMinor + l.markupMinor) * (1 - l.discountPct / 100))
const total = (s: PriceBookSectionRow) => (s.body ? s.body.lines.reduce((n, l) => n + lineTotal(l), 0) + s.body.subs.reduce((n, g) => n + g.lines.reduce((x, l) => x + lineTotal(l), 0), 0) : 0)
const names = (s: PriceBookSectionRow) => (s.body ? [...s.body.lines.map((l) => l.name), ...s.body.subs.flatMap((g) => g.lines.map((l) => l.name))] : [])
const SHELL = { title: 'Price book', tabs: [...PRICE_BOOK_TABS], skeleton: <PriceBookSectionsGhost /> }   /* (REG-708) the ghost its loading.tsx draws */

/**
 * Company › Price book › My Sections (REG-594 on REG-566): the whole sections saved from quotes ("Save section to My Sections"),
 * as a library — a card per section with its first lines, "n items · S$total", "On n quotes"; New section starts a blank one;
 * Edit opens the section's own editor (name, lines, sub-sections); Duplicate / Rename / Delete, Deleted Sections.
 * (REG-652, price book parity Q-03) My Sections are the Owners' and Admins' to change: anyone else opens a section read-only, and every
 * changing row says why.
 */
export function PriceBookSections({ data, from, folders = [] }: { data: PriceBookData; from?: string; folders?: Folder[] }) {
  const { sections, deletedSections, now, runsBook } = data
  const block = () => (runsBook ? null : SECTION_RULE)
  const router = useRouter()
  const snackbar = useSnackbar()
  const { run } = useRun()
  /* (REG-709) `?open=<id>` — a section the global search found — opens its dialog on arrival */
  const opening = useSearchParams().get('open')
  /* (Dane UAT 3.03) `folderId` = the folder open when New section was pressed — the new section is filed there */
  const [edit, setEdit] = useState<{ open: boolean; section: PriceBookSectionRow | null; folderId?: string | null }>(() => { const it = opening ? sections.find((x) => x.id === opening) ?? null : null; return { open: !!it, section: it } })
  const save = async (input: Parameters<typeof updatePriceBookSection>[1] & { name: string }) => {
    const cur = edit.section
    const asked = cur ? null : edit.folderId ?? null
    const landed: { folderId: string | null; refused: string | null } = { folderId: null, refused: null }
    const ok = await run('save the section', async () => {
      if (cur) await settle(updatePriceBookSection(cur.id, input))
      else { const r = (await settle(createPriceBookSection({ ...input, folderId: asked }))) as { folderId: string | null; refused: string | null }; landed.folderId = r.folderId; landed.refused = r.refused }
      router.refresh()
    }, cur ? 'Section saved' : undefined)
    if (!ok) return   /* (sweep S5 #3) closed once saved — a failure keeps what was typed */
    if (!cur) {
      /* (Dane UAT 3.03) the snackbar names where it went — and why, when it went to the top instead (the folder gone meanwhile) */
      const place = (landed.folderId ? folders.find((f) => f.id === landed.folderId)?.name : null) ?? LIBRARY_ROOT['book-sections']
      const why = landed.refused ?? 'That folder is gone'
      snackbar({ message: `${input.name} added to ${place}${asked && !landed.folderId ? ` — ${why.charAt(0).toLowerCase()}${why.slice(1).replace(/\.$/, '')}` : ''}` })
    }
    setEdit({ open: false, section: null })
  }
  return (
    <LibraryGallery<Row> kind={PRICE_BOOK_KINDS.sections} shell={SHELL} noun={{ one: 'section', many: 'sections' }} nameLabel="Section" deletedLabel="Deleted sections" openLabel={runsBook ? 'Edit' : 'Open'} defaultView="list"
      byColumn mayChange={block} duplicateBlock={block} restoreBlock={block} purgeBlock={block()}
      from={from} folders={{ library: 'book-sections', list: folders, block: folderBlock(data.viewer) }} items={sections.map(toRow)} deleted={deletedSections.map(toDeletedRow)} keepReason={inUseReason} now={now} ariaLabel="Sections" tableKey="price-book-sections"
      newMenu={(close, place) => (<DropdownItem onSelect={() => { close(); setEdit({ open: true, section: null, folderId: place.folderId }) }}>New section</DropdownItem>)} newBlock={runsBook ? null : block()}   /* (REG-653, Q-10 · E-70) written on Save — Cancel leaves nothing behind */
      searchText={(t) => [...names(t), ...t.tagList, t.propertyType ?? ''].join(' ')}   // (REG-619) a tag or the property type finds it
      thumb={(t) => (
        <span className={gallery.checklist}>
          {names(t).slice(0, 4).map((n, i) => <span key={i} className={gallery.checkRow}><Icon name="subject" size={16} weight={300} /><span className={gallery.checkText}>{n}</span></span>)}
          {names(t).length > 4 ? <span className={gallery.checkMore}>+{names(t).length - 4} more</span> : null}
          {names(t).length === 0 ? <span className={gallery.checkMore}>No items yet</span> : null}   {/* (sweep S5 #31) "items", as the card's count says */}
        </span>
      )}
      glyph={() => <span className={styles.glyph}><Icon name="format_list_bulleted" size={20} weight={300} /></span>}   /* (REG-664) a section is a set of lines — the folder glyph now means a folder */
      meta={(t) => `${t.lineCount} ${t.lineCount === 1 ? 'item' : 'items'} · ${money2(total(t))}${t.body?.subs.length ? ` · ${t.body.subs.length} sub-section${t.body.subs.length === 1 ? '' : 's'}` : ''}${t.propertyType ? ` · ${t.propertyType}` : ''}`}
      usage={(t) => (t.usedBy === 0 ? 'Not on a quote yet' : `On ${t.usedBy} ${t.usedBy === 1 ? 'quote' : 'quotes'}`)}
      usageWord={(t) => (t.usedBy === 0 ? 'Not on a quote yet' : `${t.usedBy} quote${t.usedBy === 1 ? '' : 's'}`)}   /* (REG-653, Q-18) */
      chips={(t) => (t.body?.subs.length ? <MetaChip>Sub-sections</MetaChip> : null)}   // (REG-619) tags stay off the title line — two chips squeezed the name to "Bat…"; the list view's Tags column and the search carry them
      columns={[
        { key: 'items', label: 'Items', track: '100px', sortable: (t) => t.lineCount, cell: (t) => <span>{t.lineCount}</span> },
        { key: 'property', label: 'Property type', track: '170px', cell: (t) => (t.propertyType ? <span>{t.propertyType}</span> : <span className={styles.muted}>Any</span>) },   // (REG-619)
        { key: 'tags', label: 'Tags', track: '180px', cell: (t) => (t.tagList.length ? <span>{t.tagList.join(', ')}</span> : null) },
        { key: 'total', label: 'Total', track: '140px', sortable: (t) => total(t), cell: (t) => <span className={styles.num}>{money2(total(t))}</span> },
        { key: 'used', label: 'Used by', track: '160px', sortable: true, cell: (t) => (t.usedBy > 0 ? <span>{t.usedBy} quote{t.usedBy === 1 ? '' : 's'}</span> : <span className={styles.muted}>Not on a quote yet</span>) },
      ]}
      onOpen={(t) => setEdit({ open: true, section: t })}
      onDuplicate={async (t) => { await settle(duplicatePriceBookSection(t.id)); snackbar({ message: `${t.name} duplicated` }); router.refresh() }}   /* (wave E, E7) a refusal throws its rule for the gallery to say */
      onRename={(t, name) => renamePriceBookSection(t.id, name)}
      onDelete={(t) => deletePriceBookSections([t.id])}
      deleteMessage={(t) => (t.usedBy ? `The ${t.usedBy === 1 ? 'quote' : `${t.usedBy} quotes`} already carrying it ${t.usedBy === 1 ? 'keeps' : 'keep'} the lines. You can restore the section from Deleted sections.` : 'You can restore it from Deleted sections.')}
      onRestore={(ids) => restorePriceBookSections(ids)} onDeleteForever={(ids) => deletePriceBookSectionsForever(ids)} onEmptyTrash={() => emptyPriceBookSectionTrash()}
      deletedMeta={{ label: 'Items', value: (t) => `${t.lineCount} ${t.lineCount === 1 ? 'item' : 'items'}` }}
      empty={{ title: 'No saved sections yet', help: runsBook ? 'In a quote’s Items table, a section’s ⋯ › Save to Price book keeps it here for the next quote — or start one here.' : 'An Owner or an Admin saves sections here; you add them to your quotes from the Add Item box.',
        /* (REG-735) the first run carries New ▾'s row for whoever runs the book; anyone else reads who does */
        start: (place) => (runsBook ? { primary: { label: 'New section', icon: 'add', onPress: () => setEdit({ open: true, section: null, folderId: place.folderId }) } } : {}) }}>   {/* (sweep S5 #22) */}
      <SectionDialog open={edit.open} section={edit.section} onClose={() => setEdit({ open: false, section: null })} readOnly={block()} units={data.units}
                     onSave={save} />
    </LibraryGallery>
  )
}
