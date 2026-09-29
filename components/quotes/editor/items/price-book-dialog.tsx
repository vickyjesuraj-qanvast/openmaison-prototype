'use client'

import { useMemo, useState, type MouseEvent } from 'react'
import { Button, Checkbox, SearchBar, SegmentedButton, SegmentedButtonItem } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { Icon } from '@/components/om/icon'
import { Chips } from '@/components/om/chips'
import { MetaChip } from '@/components/om/meta-chip'
import { TabSearchEmpty } from '@/components/leads/tasks/tab-search-empty'
import type { PriceBookItem, PriceBookSection } from '@/lib/db/schema'
import { ITEM_KINDS, ITEM_KIND_ICON, ITEM_KIND_LABEL, isItemKind, parseSavedSection, parseSectionTags, savedSectionCount, type ItemKind, type SavedLine } from '@/lib/quotes/items-model'
import { money2 } from '@/lib/quotes/math'
import { FolderCrumbs } from '@/components/om/folders/folder-crumbs'
import { FolderPickRow } from '@/components/om/folders/folder-pick-row'
import { useFolderBrowse } from '@/components/om/folders/use-folder-browse'
import type { FolderNode } from '@/lib/folders'
import styles from './price-book-dialog.module.css'

export type PriceBookTab = 'items' | 'sections'
/** Everything ticked, in the order it was ticked — across both tabs, so the quote gets it in that order. */
export type PriceBookPick = { tab: PriceBookTab; id: string }[]

const kindOf = (p: PriceBookItem): ItemKind => (isItemKind(p.kind) ? p.kind : 'purchase')
const lineTotal = (l: SavedLine) => Math.round(l.qty * (l.costMinor + l.markupMinor) * (1 - l.discountPct / 100))
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/**
 * (REG-662, owner 2026-09-25: "when I am in the quote editor the price book should open in a modal within the same window, like the
 * template modal") The price book inside the quote editor — the Templates modal's shell (xl 1200, the modal header standard): My Items ·
 * My Sections as on Company › Price book, a search, the kinds as the house chips (items) or the quote's property type (sections), a tick
 * per row, and Add for everything ticked in both tabs — each lands at the end of the quote, in the order ticked. The Create strip's
 * My Items and the Items table's *Price book* open it; typing in Add Item keeps its dropdown. Editing the book is Company's: the
 * toolbar's *Manage Price book* opens it (the Templates modal's *Manage Templates*), with the way back.
 */
export function PriceBookDialog({ open, tab, onTab, items, sections, propertyType, onClose, onAdd, onManage, itemFolders = [], sectionFolders = [] }: {
  open: boolean
  tab: PriceBookTab
  onTab: (tab: PriceBookTab) => void
  /** What this member may put on a quote (live items, and their own proposals). */
  items: PriceBookItem[]
  sections: PriceBookSection[]
  /** The quote's property type — My Sections made for it show first; the others wait under *All property types*. */
  propertyType: string | null
  onClose: () => void
  /** Adds what was ticked; resolves true once it is on the quote (the dialog closes then). */
  onAdd: (pick: PriceBookPick) => Promise<boolean>
  onManage: () => void
  /** (REG-664) The folders of My Items and My Sections, browsed as Company › Price book files them. */
  itemFolders?: FolderNode[]
  sectionFolders?: FolderNode[]
}) {
  const [picked, setPicked] = useState<PriceBookPick>([])
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState<string>('all')
  const [allTypes, setAllTypes] = useState(false)
  const [busy, setBusy] = useState(false)
  const q = query.trim().toLowerCase()
  /* (REG-664) Browse the folders while nothing is being found; a search (or a kind) looks in every folder and says where. */
  const itemBrowse = useFolderBrowse(itemFolders, items, { query: q || (kind !== 'all' ? kind : '') })
  const sectionBrowse = useFolderBrowse(sectionFolders, sections, { query: q })
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) { setWasOpen(open); if (open) { setPicked([]); setQuery(''); setKind('all'); setAllTypes(false); itemBrowse.go(null); sectionBrowse.go(null) } }

  const kinds = useMemo(() => ITEM_KINDS.filter((k) => items.some((p) => kindOf(p) === k)), [items])
  const shownItems = itemBrowse.hereEntries.filter((p) => (kind === 'all' || kindOf(p) === kind)
    && (!q || [p.name, p.description ?? '', p.vendor ?? '', p.category ?? '', ITEM_KIND_LABEL[kindOf(p)]].some((f) => f.toLowerCase().includes(q))))
  const fits = (s: PriceBookSection) => !propertyType || !s.propertyType || s.propertyType === propertyType
  const otherTypes = sections.filter((s) => !fits(s)).length
  const sectionRows = useMemo(() => sections.map((s) => {
    const body = parseSavedSection(s.linesJson)
    return { s, tags: parseSectionTags(s.tags), count: body ? savedSectionCount(body) : 0, total: body ? [...body.lines, ...body.subs.flatMap((g) => g.lines)].reduce((n, l) => n + lineTotal(l), 0) : 0 }
  }), [sections])
  const inView = new Set(sectionBrowse.hereEntries.map((s) => s.id))
  const shownSections = sectionRows.filter(({ s, tags }) => inView.has(s.id) && (allTypes || fits(s)) && (!q || s.name.toLowerCase().includes(q) || tags.some((t) => t.toLowerCase().includes(q))))

  const isOn = (which: PriceBookTab, id: string) => picked.some((x) => x.tab === which && x.id === id)
  const toggle = (which: PriceBookTab, id: string) => setPicked((p) => (p.some((x) => x.tab === which && x.id === id) ? p.filter((x) => !(x.tab === which && x.id === id)) : [...p, { tab: which, id }]))
  /* A press anywhere on a row ticks it; the box itself answers on its own. */
  const onRow = (which: PriceBookTab, id: string) => (e: MouseEvent) => { if ((e.target as HTMLElement).closest('label, input, button, a')) return; toggle(which, id) }
  const n = picked.filter((x) => x.tab === 'items').length, m = picked.length - n
  const addLabel = n && m ? `Add ${plural(n, 'item', 'items')} and ${plural(m, 'section', 'sections')}` : n ? `Add ${plural(n, 'item', 'items')}` : m ? `Add ${plural(m, 'section', 'sections')}` : 'Add'
  const add = async () => { if (!n && !m) return; setBusy(true); try { await onAdd(picked) } finally { setBusy(false) } }
  const clear = () => { setQuery(''); setKind('all') }

  return (
    <Dialog open={open} onClose={onClose} title="Price book" size="modal" width={1200} height={680} portal
            subtitle="Tick what this quote needs — it goes in at the end, in the order you tick it."
            footer={<>
              <Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button>
              <Button onPress={() => { void add() }} isDisabled={busy || (!n && !m)}>{busy ? 'Adding…' : addLabel}</Button>
            </>}>
      <div className={styles.body} data-testid="price-book-dialog">
        <div className={styles.toolbar}>
          <SegmentedButton aria-label="Price book" selectedKeys={[tab]} onSelectionChange={(keys) => { const k = [...keys][0]; if (k === 'items' || k === 'sections') onTab(k) }}>
            <SegmentedButtonItem id="items">My Items · {items.length}{n ? ` (${n} ticked)` : ''}</SegmentedButtonItem>
            <SegmentedButtonItem id="sections">My Sections · {sections.length}{m ? ` (${m} ticked)` : ''}</SegmentedButtonItem>
          </SegmentedButton>
          {/* The Templates modal's way (REG-528): Manage … opens the Company page, with this quote as the way back (REG-465). */}
          <Button appearance="text" iconStart={<Icon name="list_alt" size={20} weight={300} />} onPress={onManage}>Manage Price book</Button>
          <span className={styles.search}><SearchBar appearance="outlined" size="md" placeholder={tab === 'items' ? 'Search items, vendors, categories' : 'Search sections and tags'} aria-label={tab === 'items' ? 'Search My Items' : 'Search My Sections'} value={query} onChange={setQuery} /></span>
        </div>
        {tab === 'items' && kinds.length > 1 ? (
          <Chips label="Kind" options={[{ value: 'all', label: 'All' }, ...kinds.map((k) => ({ value: k, label: ITEM_KIND_LABEL[k] }))]} value={kind} onChange={(v) => setKind(v)} />
        ) : null}
        {tab === 'sections' && propertyType && otherTypes ? (
          <Chips label="Property type" options={[{ value: 'fits', label: `For ${propertyType}` }, { value: 'all', label: `All property types · ${otherTypes} more` }]} value={allTypes ? 'all' : 'fits'} onChange={(v) => setAllTypes(v === 'all')} />
        ) : null}

        {tab === 'items' ? (
          items.length === 0 ? (
            <div className={styles.empty} role="status"><span className={styles.emptyGlyph} aria-hidden><Icon name="list_alt" size={40} weight={300} /></span><span className={styles.emptyTitle}>Nothing in My Items yet</span><span className={styles.emptyHelp}>Add items under Company › Price book, or save a line from a quote’s Items table (⋯ › Save to My Items).</span></div>
          ) : shownItems.length === 0 && itemBrowse.hereFolders.length === 0 && itemBrowse.finding ? <TabSearchEmpty noun="items" searching={q !== ''} onClearAll={clear} /> : (
            <>
            {!itemBrowse.finding && itemBrowse.openAt ? <FolderCrumbs root="My Items" trail={itemBrowse.trail} onGo={itemBrowse.go} /> : null}
            <div className={styles.list} role="list" aria-label="My Items">
              {itemBrowse.hereFolders.map((f) => <div key={f.id} role="listitem" className={styles.folderItem}><FolderPickRow name={f.name} holds={itemBrowse.holds(f, 'item', 'items')} onOpen={() => itemBrowse.go(f.id)} /></div>)}
              {shownItems.map((p) => {
                const on = isOn('items', p.id)
                return (
                  <div key={p.id} className={styles.row} role="listitem" data-selected={on || undefined} data-testid="book-item" onClick={onRow('items', p.id)}>
                    <Checkbox isSelected={on} onChange={() => toggle('items', p.id)} aria-label={`Add ${p.name}`} />
                    <span className={styles.thumb} aria-hidden>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {p.thumb ? <img src={p.thumb} alt="" /> : <Icon name={ITEM_KIND_ICON[kindOf(p)]} size={20} weight={300} />}
                    </span>
                    <span className={styles.text}>
                      <span className={styles.name}>{p.name}{p.status === 'proposed' ? <MetaChip color="yellow">Proposed</MetaChip> : null}</span>
                      <span className={styles.meta}>{[itemBrowse.where(p) || null, ITEM_KIND_LABEL[kindOf(p)], p.vendor ? `by ${p.vendor}` : null, p.category].filter(Boolean).join(' · ')}</span>
                    </span>
                    <span className={styles.price}>{money2(p.costMinor + p.markupMinor)}<span className={styles.unit}> / {p.unit}</span></span>
                  </div>
                )
              })}
            </div>
            </>
          )
        ) : sections.length === 0 ? (
          <div className={styles.empty} role="status"><span className={styles.emptyGlyph} aria-hidden><Icon name="format_list_bulleted" size={40} weight={300} /></span><span className={styles.emptyTitle}>No saved sections yet</span><span className={styles.emptyHelp}>In a quote’s Items table, a section’s ⋯ › Save section to My Sections keeps it here for the next quote.</span></div>
        ) : shownSections.length === 0 && sectionBrowse.hereFolders.length === 0 && (q !== '' || !allTypes) ? <TabSearchEmpty noun="sections" searching={q !== ''} onClearAll={() => { setQuery(''); setAllTypes(true) }} /> : (
          <>
          {!sectionBrowse.finding && sectionBrowse.openAt ? <FolderCrumbs root="My Sections" trail={sectionBrowse.trail} onGo={sectionBrowse.go} /> : null}
          <div className={styles.list} role="list" aria-label="My Sections">
            {sectionBrowse.hereFolders.map((f) => <div key={f.id} role="listitem" className={styles.folderItem}><FolderPickRow name={f.name} holds={sectionBrowse.holds(f, 'section', 'sections')} onOpen={() => sectionBrowse.go(f.id)} /></div>)}
            {shownSections.map(({ s, tags, count, total }) => {
              const on = isOn('sections', s.id)
              return (
                <div key={s.id} className={styles.row} role="listitem" data-selected={on || undefined} data-testid="book-section" onClick={onRow('sections', s.id)}>
                  <Checkbox isSelected={on} onChange={() => toggle('sections', s.id)} aria-label={`Add ${s.name}`} />
                  <span className={styles.thumb} aria-hidden><Icon name="format_list_bulleted" size={20} weight={300} /></span>
                  <span className={styles.text}>
                    <span className={styles.name}>{s.name}</span>
                    <span className={styles.meta}>{[sectionBrowse.where(s) || null, plural(count, 'item', 'items'), s.propertyType, tags.length ? tags.join(', ') : null].filter(Boolean).join(' · ')}</span>
                  </span>
                  <span className={styles.price}>{money2(total)}</span>
                </div>
              )
            })}
          </div>
          </>
        )}
      </div>
    </Dialog>
  )
}
