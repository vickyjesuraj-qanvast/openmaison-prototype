'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { PortalMenu } from '@/components/om/portal-menu'
import { Tooltip } from '@/components/om/tooltip'
import { ConfirmDialog } from '@/components/om/confirm-dialog'
import { useComingSoon, useSnackbar } from '@/components/om/snackbar'
import { TABLET_DOWN, useMediaQuery } from '@/lib/breakpoint'
import { DropdownDivider, DropdownItem } from '@/components/leads/dropdown'
import { DetailBulkBar } from '@/components/leads/tasks/detail-bulk-bar'
import { AttachFilesModal } from '@/components/leads/tasks/attach-files-modal'
import { NameDialog } from '@/components/leads/files/name-dialog'
import { useRun } from '@/components/leads/tasks/use-run'
import type { LeadFile, Member, PriceBookItem, QuoteItem } from '@/lib/db/schema'
import type { Studio } from '@/lib/settings/types'
import { DEFAULT_DENSITY, DENSITIES, DENSITY_LABEL, ITEM_VIEWS, ITEM_VIEW_LABEL, parseColumns, parseLabels, type ColumnKey, type ColumnSettings, type ItemLabels, type ItemsDensity, type ItemsView, type RowMenuAction } from '@/lib/quotes/items-model'
import { quoteTotals, type QuoteTotals } from '@/lib/quotes/math'
import { createQuoteItem, deleteQuoteItems, duplicateQuoteItem, groupQuoteItems, listQuoteItems, moveQuoteItem, replaceQuoteItems, reorderQuoteItems, saveItemToPriceBook, setQuoteItemParent, updateItemsPrefs, updateQuoteItem, updateQuotePricing, type ItemPatch } from '@/app/quotes/items-actions'
import { SectionCard } from '../section-card'
import { ItemsTable } from './items-table'
import { ItemsSummary, maxAdditional, type Pricing } from './items-summary'
import { ColumnSettingsDrawer } from './column-settings-drawer'
import { useLevelFocus } from './table-menus'
import styles from './items-section.module.css'

const AUTOSAVE_MS = 600

/** The Maison AI mark (1262:35630) in the button's leading-icon slot. */
function AiMark() {
  return (
    <span className={styles.aiMark}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/figma-assets/maison-ai-mark.svg" alt="" />
    </span>
  )
}

export type ItemsSeed = {
  quoteId: string
  items: QuoteItem[]
  priceBook: PriceBookItem[]
  studio: Studio
  files: LeadFile[]
  me: Member | null
  pricing: Pricing
  view: string
  density: string
  columnsJson: string | null
  labelsJson: string | null
}

const money = (minor: number) => new Intl.NumberFormat('en-SG', { style: 'currency', currency: 'SGD', currencyDisplay: 'code' }).format(minor / 100).replace('SGD', 'S$').replace(/\s/g, '')

/**
 * Items section (1260:31209 · 1271:40400 · the reference screenshots, owner 2026-09-11; spec 03/04 in
 * design-source/context/quote-editor/). Owns the section card: the toolbar in its head, the table, the Add Item row and
 * the totals block in its body. Edits are optimistic — cells write 600 ms after the last change, structural moves write at
 * once and reload the lines — and every write returns the quote's derived amount, which the header's "Saved" follows.
 * Undo / redo replay whole snapshots of the lines (replaceQuoteItems).
 *
 * Ordering (REG-417): a structural write settles every queued cell write first, so the reload never shows a stored row
 * that the edit has yet to reach; undo / redo drop the queue instead — the snapshot already carries the intended state.
 */
export function ItemsCard({ seed, open, onToggle, onSaved, onOpenAi, onCount, onTotal, onLines }: {
  seed: ItemsSeed
  open: boolean
  onToggle: () => void
  onSaved: (updatedAt: number, amountMinor: number) => void
  onOpenAi: () => void
  onCount: (n: number) => void
  /** The live total and lines, as the table shows them (the Payment Schedule's amounts and AI schedule follow, REG-418). */
  onTotal?: (totalMinor: number) => void
  onLines?: (items: QuoteItem[]) => void
}) {
  const snackbar = useSnackbar()
  const comingSoon = useComingSoon()
  const { run, fail } = useRun()
  const { quoteId } = seed
  /* ≤1024 the toolbar is one row (REG-354 / REG-384): the AI mark, Create as its icon and a kebab that folds the rest. */
  const compact = useMediaQuery(TABLET_DOWN)

  /* ── state ── */
  const [items, setItems] = useState<QuoteItem[]>(seed.items)
  const [priceBook, setPriceBook] = useState<PriceBookItem[]>(seed.priceBook)
  const [pricing, setPricing] = useState<Pricing>(seed.pricing)
  const [view, setView] = useState<ItemsView>(ITEM_VIEWS.includes(seed.view as ItemsView) ? (seed.view as ItemsView) : 'none')
  const [density, setDensity] = useState<ItemsDensity>(DENSITIES.includes(seed.density as ItemsDensity) ? (seed.density as ItemsDensity) : DEFAULT_DENSITY)
  const [columns, setColumns] = useState<ColumnSettings>(() => parseColumns(seed.columnsJson))
  const [labels, setLabels] = useState<ItemLabels>(() => parseLabels(seed.labelsJson))
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [collapsedBuckets, setCollapsedBuckets] = useState<Set<string>>(() => new Set())
  const [showFull, setShowFull] = useState<Set<string>>(() => new Set())
  const [history, setHistory] = useState<{ past: QuoteItem[][]; future: QuoteItem[][] }>({ past: [], future: [] })
  const [menu, setMenu] = useState<'view' | 'density' | 'create' | 'more' | null>(null)
  /* Expand (REG-434): the whole card as a full-page layer over the editor; Escape (with no menu or dialog up) and the toolbar's
     Collapse bring it back. The page keeps a collapsed stand-in in the section's slot so nothing below it moves. */
  const [expanded, setExpanded] = useState(false)
  useEffect(() => {
    if (!expanded) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    requestAnimationFrame(() => (document.querySelector('[data-items-expanded] [aria-label="Collapse"]') as HTMLElement | null)?.focus())
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return
      if (document.querySelector('[role="menu"], [role="listbox"]') || document.querySelectorAll('[role="dialog"]').length > 1) return
      setExpanded(false)
    }
    document.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = prev; document.removeEventListener('keydown', onKey) }
  }, [expanded])
  const [moreSub, setMoreSub] = useState<'view' | 'density' | null>(null)
  const moreLevel = useLevelFocus(moreSub)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [removing, setRemoving] = useState<string[] | null>(null)
  const [naming, setNaming] = useState<{ kind: 'room' | 'category' | 'section' } | null>(null)
  const [imageFor, setImageFor] = useState<QuoteItem | null>(null)
  const [addOpenTick, setAddOpenTick] = useState(0)
  const viewRef = useRef<HTMLSpanElement>(null)
  const densityRef = useRef<HTMLSpanElement>(null)
  const createRef = useRef<HTMLSpanElement>(null)
  const moreRef = useRef<HTMLSpanElement>(null)
  const addInputRef = useRef<HTMLInputElement>(null)
  const itemsRef = useRef(items)
  useEffect(() => { itemsRef.current = items })
  const lineCount = items.filter((i) => i.kind === 'item').length
  useEffect(() => { onCount(lineCount) }, [lineCount, onCount])
  const totals: QuoteTotals = useMemo(() => quoteTotals(items, pricing), [items, pricing])
  useEffect(() => { onTotal?.(totals.totalMinor) }, [totals.totalMinor, onTotal])
  useEffect(() => { onLines?.(items) }, [items, onLines])
  // Selection follows the lines that exist (render-phase adjust).
  const ids = useMemo(() => new Set(items.map((i) => i.id)), [items])
  if ([...selected].some((id) => !ids.has(id))) setSelected(new Set([...selected].filter((id) => ids.has(id))))

  /* ── cell edits: optimistic, one pending patch per line, written 600 ms after the last change ── */
  const pending = useRef<Map<string, { patch: ItemPatch; timer: ReturnType<typeof setTimeout> }>>(new Map())
  const flush = async (id: string) => {
    const p = pending.current.get(id)
    if (!p) return
    pending.current.delete(id)
    try { const r = await updateQuoteItem(id, p.patch); onSaved(r.updatedAt, r.amountMinor) } catch { fail('save the item') }
  }
  const flushRef = useRef(flush); useEffect(() => { flushRef.current = flush })
  useEffect(() => () => { for (const [id, p] of pending.current) { clearTimeout(p.timer); void flushRef.current(id) } }, [])
  /** Every queued write lands now (those for lines in `drop` are forgotten — the lines are going). */
  const settle = async (drop: Set<string> = new Set()) => {
    const queued = [...pending.current.keys()]
    for (const id of queued) { const p = pending.current.get(id); if (p) clearTimeout(p.timer); if (drop.has(id)) pending.current.delete(id) }
    await Promise.all(queued.filter((id) => !drop.has(id)).map((id) => flushRef.current(id)))
  }
  /** The queue is forgotten whole — an undo / redo snapshot already says what the lines should be. */
  const discard = () => { for (const p of pending.current.values()) clearTimeout(p.timer); pending.current.clear() }

  /* ── history ── */
  const snapshot = () => setHistory((h) => ({ past: [...h.past.slice(-29), itemsRef.current.map((i) => ({ ...i }))], future: [] }))
  const restore = async (next: QuoteItem[], undo: boolean) => {
    discard()
    const cur = itemsRef.current
    setItems(next)
    setHistory((h) => (undo ? { past: h.past.slice(0, -1), future: [cur, ...h.future] } : { past: [...h.past, cur], future: h.future.slice(1) }))
    try { const r = await replaceQuoteItems(quoteId, next); onSaved(r.updatedAt, r.amountMinor); setItems(await listQuoteItems(quoteId)) } catch { fail(undo ? 'undo' : 'redo') }
  }
  const undo = () => { const prev = history.past.at(-1); if (prev) void restore(prev, true) }
  const redo = () => { const next = history.future[0]; if (next) void restore(next, false) }

  const patchItem = (id: string, patch: ItemPatch, opts: { snapshot?: boolean } = {}) => {
    if (opts.snapshot !== false && !pending.current.size) snapshot()
    // A group's answer is its children's (spec 03: a child's STATUS cell is empty) — the server cascades it, the screen at once.
    setItems((cur) => cur.map((i) => (i.id === id ? { ...i, ...patch } as QuoteItem : patch.status !== undefined && i.parentId === id ? { ...i, status: patch.status } : i)))
    const cur = pending.current.get(id)
    if (cur) clearTimeout(cur.timer)
    pending.current.set(id, { patch: { ...(cur?.patch ?? {}), ...patch }, timer: setTimeout(() => { void flushRef.current(id) }, AUTOSAVE_MS) })
  }

  /* ── structural edits: settle the queue, write, then reload the lines as stored ── */
  const reload = async () => setItems(await listQuoteItems(quoteId))
  const structural = async (what: string, fn: () => Promise<unknown>, done?: string, drop?: Set<string>) => {
    snapshot()
    await run(what, async () => { await settle(drop); await fn(); await reload() }, done)
  }
  const create = (input: Parameters<typeof createQuoteItem>[1], focusName = false) => structural('add the item', async () => {
    const row = await createQuoteItem(quoteId, input)
    if (focusName) setTimeout(() => document.querySelector<HTMLInputElement>(`[data-item-id="${row.id}"] input[data-name]`)?.focus(), 50)
  })
  const removeItems = (list: string[]) => {
    const gone = new Set(list)
    for (const i of itemsRef.current) if (i.parentId && gone.has(i.parentId)) gone.add(i.id)
    return structural('remove', async () => { const r = await deleteQuoteItems(list); if (r) onSaved(r.updatedAt, r.amountMinor) }, list.length === 1 ? 'Item removed' : `${list.length} items removed`, gone)
  }

  /* ── row menu ── */
  /* "+" on a group row (owner 2026-09-16, REG-441): the new line goes INTO the group, directly under its row — first among its
     children — and a folded group opens so the line is seen; on any other row it stays a sibling right below. */
  const insertBelow = (item: QuoteItem) => {
    if (item.kind === 'group') {
      const first = itemsRef.current.filter((i) => i.parentId === item.id).sort((a, b) => a.position - b.position)[0]
      if (item.collapsed) patchItem(item.id, { collapsed: false })
      void create(first ? { parentId: item.id, beforeId: first.id } : { parentId: item.id }, true)
    } else void create({ parentId: item.parentId ?? null, afterId: item.id }, true)
  }
  const onMenu = (item: QuoteItem, action: RowMenuAction) => {
    switch (action) {
      case 'library': void run('save to My Items', async () => { const p = await saveItemToPriceBook(item.id); setPriceBook((b) => [...b, p].sort((a, c) => a.name.localeCompare(c.name))) }, 'Saved to My Items'); break
      case 'duplicate': void structural('duplicate the item', () => duplicateQuoteItem(item.id), 'Item duplicated'); break
      case 'copyName': void navigator.clipboard?.writeText(item.name).then(() => snackbar({ message: 'Name copied' }), () => fail('copy the name')); break
      case 'group': { const list = selected.has(item.id) && selected.size > 1 ? [...selected] : [item.id]; void structural('group the items', () => groupQuoteItems(quoteId, list), 'Group created'); setSelected(new Set()); break }
      case 'showFull': setShowFull((s) => { const n = new Set(s); if (n.has(item.id)) n.delete(item.id); else n.add(item.id); return n }); break
      case 'addAbove': void create({ parentId: item.parentId ?? null, beforeId: item.id }, true); break
      case 'addBelow': insertBelow(item); break
      case 'moveUp': void structural('move the item', () => moveQuoteItem(item.id, 'up')); break
      case 'moveDown': void structural('move the item', () => moveQuoteItem(item.id, 'down')); break
      case 'remove': setRemoving([item.id]); break
    }
  }

  /* ── drag reorder (the handle): drop before / after a sibling of the same parent ── */
  const drag = useRef<{ id: string; over: string | null; where: 'before' | 'after' | null } | null>(null)
  const onDrop = () => {
    const d = drag.current; drag.current = null
    if (!d || !d.over || d.over === d.id) return
    const cur = itemsRef.current
    const a = cur.find((i) => i.id === d.id); const b = cur.find((i) => i.id === d.over)
    if (!a || !b || (a.parentId ?? null) !== (b.parentId ?? null)) { snackbar({ message: 'Drop a line beside its own siblings — use Choose New Group to move it into a group' }); return }
    const parent = a.parentId ?? null
    const sibs = cur.filter((i) => (i.parentId ?? null) === parent).sort((x, y) => x.position - y.position).map((i) => i.id).filter((id) => id !== a.id)
    const at = sibs.indexOf(b.id) + (d.where === 'after' ? 1 : 0)
    sibs.splice(at, 0, a.id)
    snapshot()
    setItems((c) => c.map((i) => ((i.parentId ?? null) === parent ? { ...i, position: sibs.indexOf(i.id) } : i)))
    // The order shown is the order stored: the write stamps the quote like every other, and a failed write reloads the lines.
    void run('reorder', async () => {
      await settle()
      try { const r = await reorderQuoteItems(quoteId, parent, sibs); onSaved(r.updatedAt, r.amountMinor) } catch (e) { await reload(); throw e }
    })
  }

  /* ── quote-level ── */
  const changePricing = (patch: Partial<Pricing>) => {
    const next = { ...pricing, ...patch }
    // The value shown is the value applied: % ≤ 100, S$ ≤ the subtotal (REG-417) — the server holds the same bound.
    const max = maxAdditional(next.additionalDiscountMode, totals.subtotalMinor)
    if (next.additionalDiscountValue > max) { next.additionalDiscountValue = Number(max.toFixed(2)); patch = { ...patch, additionalDiscountValue: next.additionalDiscountValue } }
    setPricing(next)
    void run('save the totals', async () => { const r = await updateQuotePricing(quoteId, patch); onSaved(r.updatedAt, r.amountMinor) })
  }
  /* Round Prices: an S$ additional discount that lands the total on the hundred below it (REG-415, invented behaviour). */
  const round = () => {
    const t = totals
    if (t.subtotalMinor === 0) { snackbar({ message: 'Add items to round' }); return }
    const target = Math.floor(t.totalMinor / 10000) * 10000
    if (target === t.totalMinor) { snackbar({ message: 'Total is already round' }); return }
    if (target <= 0) { snackbar({ message: 'Total is under S$100 — nothing to round' }); return }   // (REG-417) never discount the whole quote to "S$0.00"
    const net = t.totalMinor - t.gstMinor
    const rate = net > 0 ? t.gstMinor / net : 0
    // GST is rounded per line, so the closed form can land a cent off: nudge the discount until the total sits on the hundred.
    let additional = Math.max(0, t.subtotalMinor - Math.round(target / (1 + rate))) / 100
    for (let i = 0; i < 4; i++) {
      const probe = quoteTotals(itemsRef.current, { ...pricing, additionalDiscountMode: 'amount', additionalDiscountValue: additional })
      const off = probe.totalMinor - target
      if (off === 0) break
      additional = Math.max(0, additional + off / 100 / (1 + rate))
      additional = Number(additional.toFixed(2))
    }
    changePricing({ additionalDiscountMode: 'amount', additionalDiscountValue: additional })
    snackbar({ message: pricing.additionalDiscountMode === 'pct' && pricing.additionalDiscountValue > 0 ? `Rounded to ${money(target)} — the additional discount is now in S$` : `Rounded to ${money(target)}` })
  }
  const savePrefs = (patch: Parameters<typeof updateItemsPrefs>[1]) => { void run('save the view', () => updateItemsPrefs(quoteId, patch)) }
  const closeMenus = () => { setMenu(null); setMoreSub(null) }
  const chooseView = (v: ItemsView) => { closeMenus(); setView(v); setCollapsedBuckets(new Set()); savePrefs({ itemsView: v }) }
  const chooseDensity = (d: ItemsDensity) => { closeMenus(); setDensity(d); savePrefs({ itemsDensity: d }) }
  const saveColumns = (c: ColumnSettings) => { setColumns(c); savePrefs({ itemsColumns: c }) }
  const addLabel = (kind: 'room' | 'category' | 'section', name: string) => {
    const key = kind === 'room' ? 'rooms' : kind === 'category' ? 'categories' : 'sections'
    const next = { ...labels, [key]: labels[key].includes(name) ? labels[key] : [...labels[key], name] }
    setLabels(next); savePrefs({ itemsLabels: next })
  }
  const usedLabels = useMemo(() => ({
    rooms: [...new Set([...labels.rooms, ...items.map((i) => i.room).filter((x): x is string => !!x)])],
    categories: [...new Set([...labels.categories, ...items.map((i) => i.category).filter((x): x is string => !!x)])],
    sections: [...new Set([...labels.sections, ...items.map((i) => i.section).filter((x): x is string => !!x)])],
  }), [items, labels])
  const bucketKeys = useMemo(() => {
    if (view === 'none') return []
    const list = view === 'room' ? usedLabels.rooms : view === 'category' ? usedLabels.categories : usedLabels.sections
    return [...new Set([...list, view === 'category' ? 'Uncategorized' : 'Unassigned'])]
  }, [view, usedLabels])

  const visibleColumns = columns.columns.filter((c) => c.on).map((c) => c.key) as ColumnKey[]
  const selectedList = [...selected]
  const nextNumber = items.filter((i) => !i.parentId).length + 1
  const owner = seed.me?.role === 'Owner'
  const createGroup = () => { void structural('create the group', () => groupQuoteItems(quoteId, selectedList, 'New Group'), 'Group created'); setSelected(new Set()) }
  const fromMyItems = () => { closeMenus(); setAddOpenTick((t) => t + 1); addInputRef.current?.focus() }

  /* The radio rows View by / density share one rendering between the wide toolbar's menus and the folded kebab's levels. */
  const densityRows = DENSITIES.map((d) => <DropdownItem key={d} role="menuitemradio" checked={d === density} onSelect={() => chooseDensity(d)}><span className={styles.menuIcon} data-on={d === density || undefined}><Icon name={d === density ? 'radio_button_checked' : 'radio_button_unchecked'} size={20} /></span>{DENSITY_LABEL[d]}</DropdownItem>)
  const viewRows = ITEM_VIEWS.map((v) => <DropdownItem key={v} role="menuitemradio" checked={v === view} onSelect={() => chooseView(v)}><span className={styles.menuIcon} data-on={v === view || undefined}><Icon name={v === view ? 'radio_button_checked' : 'radio_button_unchecked'} size={20} /></span>{ITEM_VIEW_LABEL[v]}</DropdownItem>)
  const createMenu = (
    <PortalMenu open={menu === 'create'} anchor={createRef} onClose={closeMenus} role="menu" width={200} align="right" sheetTitle="Create">
      <DropdownItem onSelect={() => { closeMenus(); void create({}, true) }}>New Item</DropdownItem>
      <DropdownItem onSelect={() => { closeMenus(); void structural('create the group', () => groupQuoteItems(quoteId, [], 'New Group'), 'Group created') }}>New Group</DropdownItem>
      <DropdownDivider />
      <DropdownItem onSelect={fromMyItems}>From My Items</DropdownItem>
    </PortalMenu>
  )

  /* ── toolbar (section-top actions, 1260:31216) ── */
  const toolbar = compact ? (
    <div className={styles.tools} data-compact="">
      <Tooltip label="Maison AI"><IconButton icon="auto_awesome" glyph={<AiMark />} label="Maison AI" variant="primary" onClick={onOpenAi} /></Tooltip>
      <span ref={createRef} className={styles.anchor}>
        <Tooltip label="Create" disabled={menu === 'create'}>
          <IconButton icon="add" label="Create" variant="primary" aria-haspopup="menu" aria-expanded={menu === 'create'} onClick={() => setMenu((m) => (m === 'create' ? null : 'create'))} />
        </Tooltip>
        {createMenu}
      </span>
      <span ref={moreRef} className={styles.anchor}>
        <Tooltip label="More options" disabled={menu === 'more'}>
          <IconButton icon="more_vert" label="More options for Items" aria-haspopup="menu" aria-expanded={menu === 'more'} onClick={() => { setMoreSub(null); setMenu((m) => (m === 'more' ? null : 'more')) }} />
        </Tooltip>
        <PortalMenu open={menu === 'more'} anchor={moreRef} onClose={closeMenus} role="menu" width={240} align="right" sheetTitle="Items">
          <div ref={moreLevel}>
            {moreSub === 'density' ? (
              <>
                <DropdownItem onSelect={() => setMoreSub(null)}><span className={styles.menuIcon}><Icon name="chevron_left" size={20} /></span>Row density</DropdownItem>
                {densityRows}
              </>
            ) : moreSub === 'view' ? (
              <>
                <DropdownItem onSelect={() => setMoreSub(null)}><span className={styles.menuIcon}><Icon name="chevron_left" size={20} /></span>View by</DropdownItem>
                {viewRows}
              </>
            ) : (
              <>
                {view === 'category' ? <DropdownItem onSelect={() => { closeMenus(); setNaming({ kind: 'category' }) }}>Add Category</DropdownItem> : null}
                {view === 'section' ? <DropdownItem onSelect={() => { closeMenus(); setNaming({ kind: 'section' }) }}>Add Section</DropdownItem> : null}
                <DropdownItem onSelect={() => { closeMenus(); createGroup() }}><span className={styles.menuIcon}><Icon name="create_new_folder" size={20} /></span>Create Group</DropdownItem>
                <DropdownItem disabled={history.past.length === 0} onSelect={() => { closeMenus(); undo() }}><span className={styles.menuIcon}><Icon name="undo" size={20} /></span>Undo</DropdownItem>
                <DropdownItem disabled={history.future.length === 0} onSelect={() => { closeMenus(); redo() }}><span className={styles.menuIcon}><Icon name="redo" size={20} /></span>Redo</DropdownItem>
                <DropdownDivider />
                <DropdownItem onSelect={() => { closeMenus(); setExpanded((x) => !x) }}><span className={styles.menuIcon}><Icon name={expanded ? 'collapse_content' : 'expand_content'} size={20} /></span>{expanded ? 'Collapse' : 'Expand'}</DropdownItem>
                <DropdownItem onSelect={() => { closeMenus(); setSettingsOpen(true) }}><span className={styles.menuIcon}><Icon name="tune" size={20} /></span>Column settings</DropdownItem>
                <DropdownItem submenu onSelect={() => setMoreSub('density')}><span className={styles.menuIcon}><Icon name="format_line_spacing" size={20} /></span>Row density: {DENSITY_LABEL[density]}<span className={styles.menuTrail}><Icon name="chevron_right" size={20} /></span></DropdownItem>
                <DropdownItem submenu onSelect={() => setMoreSub('view')}>View by: {ITEM_VIEW_LABEL[view]}<span className={styles.menuTrail}><Icon name="chevron_right" size={20} /></span></DropdownItem>
                {view !== 'none' ? <DropdownItem onSelect={() => { closeMenus(); setCollapsedBuckets(new Set(bucketKeys)) }}>Collapse All</DropdownItem> : null}
              </>
            )}
          </div>
        </PortalMenu>
      </span>
    </div>
  ) : (
    <div className={styles.tools}>
      {view === 'category' ? <Button variant="secondary" appearance="text" onPress={() => setNaming({ kind: 'category' })}>Add Category</Button> : null}
      {view === 'section' ? <Button variant="secondary" appearance="text" onPress={() => setNaming({ kind: 'section' })}>Add Section</Button> : null}
      <Button variant="secondary" appearance="outlined" iconStart={<Icon name="create_new_folder" size={20} />} onPress={createGroup}>Create Group</Button>
      <span className={styles.seg}>
        <Tooltip label="Undo"><IconButton icon="undo" label="Undo" disabled={history.past.length === 0} onClick={undo} /></Tooltip>
        <Tooltip label="Redo"><IconButton icon="redo" label="Redo" disabled={history.future.length === 0} onClick={redo} /></Tooltip>
      </span>
      <Tooltip label={expanded ? 'Collapse' : 'Expand'}><IconButton icon={expanded ? 'collapse_content' : 'expand_content'} label={expanded ? 'Collapse' : 'Expand'} onClick={() => setExpanded((x) => !x)} /></Tooltip>
      <Tooltip label="Column settings"><IconButton icon="tune" label="Column settings" onClick={() => setSettingsOpen(true)} /></Tooltip>
      <span ref={densityRef} className={styles.anchor}>
        <Tooltip label="Row density" disabled={menu === 'density'}>
          <IconButton icon="format_line_spacing" label="Row density" aria-haspopup="menu" aria-expanded={menu === 'density'} onClick={() => setMenu((m) => (m === 'density' ? null : 'density'))} />
        </Tooltip>
        <PortalMenu open={menu === 'density'} anchor={densityRef} onClose={closeMenus} role="menu" width={200} align="right">
          {densityRows}
        </PortalMenu>
      </span>
      {view !== 'none' ? <Button variant="secondary" appearance="outlined" onPress={() => setCollapsedBuckets(new Set(bucketKeys))}>Collapse All</Button> : null}
      <span ref={viewRef} className={styles.anchor}>
        <Button variant="secondary" appearance="outlined" aria-haspopup="menu" aria-expanded={menu === 'view'}
                iconEnd={<span className={styles.chev} data-open={menu === 'view' || undefined}><Icon name="keyboard_arrow_down" size={20} /></span>}
                onPress={() => setMenu((m) => (m === 'view' ? null : 'view'))}>
          View by: {ITEM_VIEW_LABEL[view]}
        </Button>
        <PortalMenu open={menu === 'view'} anchor={viewRef} onClose={closeMenus} role="menu" width={200} align="right">
          {viewRows}
        </PortalMenu>
      </span>
      <Button variant="primary" appearance="outlined" iconStart={<AiMark />} onPress={onOpenAi}>Maison AI</Button>
      <span ref={createRef} className={styles.anchor}>
        <Button variant="primary" appearance="outlined" aria-haspopup="menu" aria-expanded={menu === 'create'}
                iconEnd={<span className={styles.chev} data-open={menu === 'create' || undefined}><Icon name="keyboard_arrow_down" size={20} /></span>}
                onPress={() => setMenu((m) => (m === 'create' ? null : 'create'))}>
          Create
        </Button>
        {createMenu}
      </span>
    </div>
  )

  const title = `Items (${lineCount})`
  const body = (
        <div className={styles.body}>
          <ItemsTable
            items={items} priceBook={priceBook} view={view} density={density} columns={visibleColumns} details={columns.details} labels={usedLabels}
            selected={selected} collapsedBuckets={collapsedBuckets} showFull={showFull} nextNumber={nextNumber}
            h={{
              onPatch: patchItem,
              onSelect: (id, on) => setSelected((s) => { const n = new Set(s); if (on) n.add(id); else n.delete(id); return n }),
              onInsertBelow: insertBelow,
              onMenu,
              onChooseGroup: (item, gid) => { void structural('move the item', () => setQuoteItemParent(item.id, gid), gid ? 'Moved into the group' : 'Moved out of the group') },
              onUploadImage: (item) => setImageFor(item),
              onComingSoon: comingSoon,
              onAddLabel: (kind) => setNaming({ kind }),
              onDragStart: (id) => { drag.current = { id, over: null, where: null } },
              onDragOver: (id, where) => { if (drag.current) drag.current = { ...drag.current, over: id, where } },
              onDrop,
              onDragEnd: () => { drag.current = null },
            }}
            onSelectAll={(on) => setSelected(on ? new Set(items.map((i) => i.id)) : new Set())}
            onToggleBucket={(k) => setCollapsedBuckets((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n })}
            onToggleAllBuckets={() => setCollapsedBuckets((s) => (s.size ? new Set() : new Set(bucketKeys)))}
            onCreate={(name) => { void create({ name }, !name) }}
            onPickPriceBook={(id) => { void create({ priceBookItemId: id }) }}
            onViewPriceBook={comingSoon}
            onExport={comingSoon}
            addInputRef={addInputRef}
            addOpenTick={addOpenTick}
          />
          <ItemsSummary totals={totals} pricing={pricing} studio={seed.studio} owner={owner} onPricing={changePricing} onRound={round} />
        </div>
  )
  return (
    <>
      {expanded ? (
        <>
          <SectionCard id="section-items" title={title} open={false} onToggle={() => setExpanded(false)} />
          {createPortal(
            <div className={styles.fullPage} role="dialog" aria-modal="true" aria-label={title} data-items-expanded="">
              <SectionCard id="section-items-expanded" title={title} open onToggle={() => setExpanded(false)} actions={toolbar} fill>{body}</SectionCard>
            </div>,
            document.body,
          )}
        </>
      ) : (
        <SectionCard id="section-items" title={title} open={open} onToggle={onToggle} actions={toolbar}>{body}</SectionCard>
      )}
      <DetailBulkBar
        count={selected.size}
        actions={[
          { label: 'Group', onClick: () => { void structural('group the items', () => groupQuoteItems(quoteId, selectedList), 'Group created'); setSelected(new Set()) } },
          { label: 'Hide from client', onClick: () => { snapshot(); for (const id of selectedList) patchItem(id, { visibility: 'hidden' }, { snapshot: false }); snackbar({ message: `${selectedList.length} hidden from the client` }); setSelected(new Set()) } },
          { label: 'Delete', tone: 'danger', onClick: () => setRemoving(selectedList) },
        ]}
        onClear={() => setSelected(new Set())}
      />
      <ConfirmDialog open={!!removing} title={removing && removing.length > 1 ? `Remove ${removing.length} items?` : 'Remove this item?'}
                     message="The line leaves the quote and its totals." confirmLabel="Remove"
                     onConfirm={() => { const list = removing ?? []; setRemoving(null); setSelected(new Set()); void removeItems(list) }} onCancel={() => setRemoving(null)} />
      <NameDialog open={!!naming} title={naming?.kind === 'room' ? 'Add Room' : naming?.kind === 'section' ? 'Add Section' : 'Add Category'} initial=""
                  onSave={(name) => { if (naming) addLabel(naming.kind, name.trim()); setNaming(null) }} onClose={() => setNaming(null)} />
      <AttachFilesModal open={!!imageFor} mode="image" chrome="quote" files={seed.files} attached={[]} onClose={() => setImageFor(null)}
                        onAttach={(fileIds) => { const f = seed.files.find((x) => x.id === fileIds[0]); if (imageFor && f) patchItem(imageFor.id, { thumb: f.thumb ?? null, thumbCount: f.thumb ? 1 : 0, icon: null }); setImageFor(null) }}
                        onUploadPicked={() => { if (imageFor) patchItem(imageFor.id, { thumb: '/figma-assets/file-thumb-1.png', thumbCount: 1, icon: null }); setImageFor(null) }} />
      <ColumnSettingsDrawer open={settingsOpen} value={columns} onClose={() => setSettingsOpen(false)} onSave={saveColumns} />
    </>
  )
}
