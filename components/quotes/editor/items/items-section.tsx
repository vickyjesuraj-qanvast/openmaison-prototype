'use client'

import { useRouter } from 'next/navigation'
import { withFrom } from '@/lib/nav'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button, SearchBar } from '@/components/ds'
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
import type { LeadFile, Member, PriceBookItem, PriceBookSection, QuoteItem } from '@/lib/db/schema'
import type { Studio } from '@/lib/settings/types'
import { DEFAULT_DENSITY, DENSITIES, DENSITY_LABEL, HIGHLIGHT_LABEL, ITEM_VIEWS, ITEM_VIEW_LABEL, parseColumns, parseLabels, PRINT_AS_LABEL, UNLABELLED, type ColumnKey, type ColumnSettings, type Highlight, type ItemLabels, type ItemsDensity, type ItemsView, type PrintAs, type RowMenuAction } from '@/lib/quotes/items-model'
import { categoryShares, counts, descendantIds, lineTotalMinor, quoteTotals, unitPriceMinor, type QuoteTotals } from '@/lib/quotes/math'
import { scrollParentOf } from '@/components/om/use-stuck'
import { EXPORT_HEAD, EXPORT_MONEY_COLS, exportRows, toTsv, type PasteLine } from '@/lib/quotes/clipboard'
import { ExportDialog } from '@/components/leads/export-dialog'
import { buildTable, downloadBlob, type ExportFormat } from '@/lib/leads/export'
import { createQuoteItem, createQuoteItems, deleteQuoteItems, duplicateQuoteItem, groupQuoteItems, insertPriceBookSection, listQuoteItems, moveQuoteItem, replaceQuoteItems, reorderQuoteItems, saveItemToPriceBook, saveSectionToPriceBook, setQuoteItemParent, ungroupQuoteItem, updateItemsPrefs, updateQuoteItem, updateQuotePricing, type ItemPatch } from '@/app/quotes/items-actions'
import { PrintAsDialog } from './print-as-dialog'
import { SectionCard } from '../section-card'
import { ItemsTable, ITEMS_TABLE } from './items-table'
import { PasteItemsDialog } from './paste-items-dialog'
import { SetValueDialog, type SetField } from './set-value-dialog'
import { RoundPricesDialog, type RoundChange } from './round-prices-dialog'
import { rowOf } from './grid-keys'
import type { DropSlot } from './row-drag'
import { clearColumnWidths } from '@/lib/table-widths'
import { ItemsSummary, maxAdditional, type Pricing } from './items-summary'
import { ColumnSettingsDrawer } from './column-settings-drawer'
import { useLevelFocus } from './table-menus'
import styles from './items-section.module.css'
import { roundToStep, type RoundStep } from '@/lib/settings/types'

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
  /** The quote's number, for the export's file name (REG-476). */
  number?: string
  items: QuoteItem[]
  priceBook: PriceBookItem[]
  /** (REG-566) The studio's saved sections (My Sections). */
  priceBookSections: PriceBookSection[]
  /** (REG-561) The studio's trades (Settings › Quotes): the Category menu's base list. */
  trades: string[]
  /** (REG-556) The brand kit's colours by key — the Highlight bar and swatches. */
  brandColors: Record<string, string>
  /** (REG-562 · REG-593) The issuing entities from Company › Profile, each with its GST registration. */
  entities: { name: string; gstRegistered: boolean }[]
  /** (REG-584) The studio's rounding step for selling prices (0 = none). */
  roundStep: RoundStep
  studio: Studio
  files: LeadFile[]
  me: Member | null
  pricing: Pricing
  view: string
  density: string
  columnsJson: string | null
  labelsJson: string | null
}

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
export function ItemsCard({ seed, open, onToggle, onSaved, onOpenAi, onCount, onTotal, onLines, onPricing, clientColumns, forceView, addTick = 0, exportTick = 0 }: {
  seed: ItemsSeed
  open: boolean
  onToggle: () => void
  onSaved: (updatedAt: number, amountMinor: number) => void
  onOpenAi: () => void
  onCount: (n: number) => void
  /** The live total and lines, as the table shows them (the Payment Schedule's amounts and AI schedule follow, REG-418). */
  onTotal?: (totalMinor: number) => void
  /** The GST / discount settings as they change — the editor's text context prints "inclusive of GST" only when it is on. */
  onPricing?: (pricing: Pricing) => void
  /** (REG-522) The Create strip's My Items: bumped by the editor, it opens the Add Item popover like Create ▾ › From My Items. */
  addTick?: number
  onLines?: (items: QuoteItem[]) => void
  /** (REG-497) The columns the quote's template prints for the client — an eye on their heads; null = no template known. */
  clientColumns?: Set<string> | null
  /** (REG-497) A View by pushed from outside (the regroup prompt after a template change): a new nonce applies it once. */
  forceView?: { key: ItemsView; nonce: number } | null
  /** (REG-538) The header kebab's Export: a new tick opens the Items export dialog. */
  exportTick?: number
}) {
  const snackbar = useSnackbar()
  const comingSoon = useComingSoon()
  const router = useRouter()
  const { run, fail } = useRun()
  const { quoteId } = seed
  /* ≤1024 the toolbar is one row (REG-354 / REG-384): the AI mark, Create as its icon and a kebab that folds the rest. */
  const compact = useMediaQuery(TABLET_DOWN)

  /* ── state ── */
  const [items, setItems] = useState<QuoteItem[]>(seed.items)
  const [priceBook, setPriceBook] = useState<PriceBookItem[]>(seed.priceBook)
  const [priceBookSections, setPriceBookSections] = useState<PriceBookSection[]>(seed.priceBookSections)
  const [printAsOpen, setPrintAsOpen] = useState(false)   /* (REG-555) the bulk bar's Print as */
  const [labelling, setLabelling] = useState<QuoteItem | null>(null)   /* (REG-555) a section's sub-total label */
  const [pricing, setPricing] = useState<Pricing>(seed.pricing)
  const [view, setView] = useState<ItemsView>(ITEM_VIEWS.includes(seed.view as ItemsView) ? (seed.view as ItemsView) : 'none')
  const [density, setDensity] = useState<ItemsDensity>(DENSITIES.includes(seed.density as ItemsDensity) ? (seed.density as ItemsDensity) : DEFAULT_DENSITY)
  const [columns, setColumns] = useState<ColumnSettings>(() => parseColumns(seed.columnsJson))
  const [labels, setLabels] = useState<ItemLabels>(() => parseLabels(seed.labelsJson))
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [collapsedBuckets, setCollapsedBuckets] = useState<Set<string>>(() => new Set())
  const [seenForce, setSeenForce] = useState<number | null>(null)
  if (forceView && forceView.nonce !== seenForce) { setSeenForce(forceView.nonce); setView(forceView.key); setCollapsedBuckets(new Set()) }   // (REG-497) render-phase adjust
  const [showFull, setShowFull] = useState<Set<string>>(() => new Set())
  const [fresh, setFresh] = useState<Set<string>>(() => new Set())   /* (REG-573) the rows that just arrived — one pulse each */
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
  const removingSection = removing && removing.length === 1 && items.find((i) => i.id === removing[0])?.kind === 'group' ? items.filter((i) => i.parentId === removing[0] || (i.parentId && items.find((p) => p.id === i.parentId)?.parentId === removing[0])).filter((i) => i.kind === 'item').length : 0   /* (REG-558) a section's confirm names its lines */
  const [naming, setNaming] = useState<{ kind: 'room' | 'category' | 'section' } | null>(null)
  const [imageFor, setImageFor] = useState<QuoteItem | null>(null)
  const [addOpenTick, setAddOpenTick] = useState(0)
  /* The Excel benchmark's phases 2 · 3 (REG-476 / REG-477): a pasted block waiting in the mapping dialog, the Set value dialog, the
     Export dialog and the Find text (sort by head was built and removed the same day, REG-483). */
  const [pasting, setPasting] = useState<{ text: string; anchorId: string | null } | null>(null)
  const [setValueOpen, setSetValueOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [seenExport, setSeenExport] = useState(exportTick)   // seeded with the current tick: a remount (Apply defaults reseeds the card) must not replay an old Export
  if (exportTick !== seenExport) { setSeenExport(exportTick); setExportOpen(true) }   // render-phase adjust (REG-538)
  const [query, setQuery] = useState('')
  const viewRef = useRef<HTMLSpanElement>(null)
  const densityRef = useRef<HTMLSpanElement>(null)
  const createRef = useRef<HTMLSpanElement>(null)
  const moreRef = useRef<HTMLSpanElement>(null)
  const addInputRef = useRef<HTMLInputElement>(null)
  const itemsRef = useRef(items)
  useEffect(() => { itemsRef.current = items })
  const lineCount = items.filter((i) => i.kind === 'item').length
  useEffect(() => { onCount(lineCount) }, [lineCount, onCount])
  /* "GST 9%" only while every line carries 9 — the per-line GST column is editable, so a mixed table reads plain "GST". */
  const gstLabel = useMemo(() => { if (!pricing.gstEnabled) return 'GST'; const pcts = [...new Set(items.filter((it) => it.kind === 'item').map((it) => it.gstPct))]; return pcts.length === 1 ? `GST ${pcts[0]}%` : 'GST' }, [items, pricing.gstEnabled])   // (REG-583) no rate beside an off switch
  const totals: QuoteTotals = useMemo(() => quoteTotals(items, pricing), [items, pricing])
  const shares = useMemo(() => categoryShares(items, UNLABELLED.category), [items])   // (REG-532) By category under the table
  const bodyRef = useRef<HTMLDivElement>(null)
  useEffect(() => { onTotal?.(totals.totalMinor) }, [totals.totalMinor, onTotal])
  useEffect(() => { onPricing?.(pricing) }, [pricing, onPricing])
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
  const reloadRef = useRef<() => Promise<void>>(async () => {})   // `reload` is declared with the structural edits below; undo / redo reach it here
  const snapshot = () => setHistory((h) => ({ past: [...h.past.slice(-29), itemsRef.current.map((i) => ({ ...i }))], future: [] }))
  const restore = async (next: QuoteItem[], undo: boolean) => {
    discard()
    const cur = itemsRef.current
    setItems(next)
    setHistory((h) => (undo ? { past: h.past.slice(0, -1), future: [cur, ...h.future] } : { past: [...h.past, cur], future: h.future.slice(1) }))
    try { const r = await replaceQuoteItems(quoteId, next); onSaved(r.updatedAt, r.amountMinor); await reloadRef.current() } catch { fail(undo ? 'undo' : 'redo') }
  }
  const undo = () => { const prev = history.past.at(-1); if (prev) void restore(prev, true) }
  const redo = () => { const next = history.future[0]; if (next) void restore(next, false) }

  const patchItem = (id: string, patch: ItemPatch, opts: { snapshot?: boolean } = {}) => {
    /* (REG-584) The studio's rounding rule: a selling price typed or filled lands on the step — the markup absorbs it, Round Prices' own rule. */
    if (seed.roundStep && (patch.costMinor !== undefined || patch.markupMinor !== undefined)) { const cur = itemsRef.current.find((i) => i.id === id); if (cur && cur.kind === 'item') { const cost = patch.costMinor ?? cur.costMinor; patch = { ...patch, markupMinor: roundToStep(cost, patch.markupMinor ?? cur.markupMinor, seed.roundStep) } } }
    if (opts.snapshot !== false && !pending.current.size) snapshot()
    // A group's answer is its children's (spec 03: a child's STATUS cell is empty) — the server cascades it, the screen at once.
    setItems((cur) => cur.map((i) => (i.id === id ? { ...i, ...patch } as QuoteItem : patch.status !== undefined && i.parentId === id ? { ...i, status: patch.status } : i)))
    const cur = pending.current.get(id)
    if (cur) clearTimeout(cur.timer)
    pending.current.set(id, { patch: { ...(cur?.patch ?? {}), ...patch }, timer: setTimeout(() => { void flushRef.current(id) }, AUTOSAVE_MS) })
  }

  /* ── structural edits: settle the queue, write, then reload the lines as stored ── */
  /* A reload lands a beat after its write: the cell writes queued in that beat are merged over the stored rows so a value just typed
     never shows stale, and a reload another reload has overtaken is dropped (REG-477). */
  const reloadSeq = useRef(0)
  const reload = async () => {
    const seq = ++reloadSeq.current
    const fresh = await listQuoteItems(quoteId)
    if (seq !== reloadSeq.current) return
    setItems(fresh.map((i) => { const p = pending.current.get(i.id); return p ? { ...i, ...p.patch } as QuoteItem : i }))
  }
  useEffect(() => { reloadRef.current = reload })
  const structural = async <T,>(what: string, fn: () => Promise<T>, done?: string, drop?: Set<string>): Promise<{ ok: true; value: T } | { ok: false }> => {
    snapshot()
    let value: T | undefined
    const ok = await run(what, async () => { await settle(drop); value = await fn(); await reload() }, done)
    return ok ? { ok: true, value: value as T } : { ok: false }
  }
  /* (REG-573, owner 2026-09-23: "when I add a new section it adds at the bottom and there is no auto scroll") Every row that just
     arrived is brought into view (centred when it sits under the sticky heads or off the screen), pulses once (`data-fresh`), and —
     for a new line or section — takes the caret in its name with the words selected, so typing replaces "New section". Runs two
     frames after the reload, once the rows exist. `which` is the ids, or the set of ids from BEFORE: then every row not in it. */
  const attention = (which: string[] | Set<string>, opts: { focus?: boolean } = {}) => {
    let tries = 0
    const tick = () => {
      const ids = Array.isArray(which) ? which : itemsRef.current.filter((i) => !which.has(i.id)).map((i) => i.id)
      const first = ids[0]
      const row = first ? bodyRef.current?.querySelector<HTMLElement>(`[data-item-id="${CSS.escape(first)}"]`) ?? null : null
      if (!row) { if (++tries < 60) requestAnimationFrame(tick); return }   // the reload's render lands a frame or two later on a busy thread — wait up to a second
      const r = row.getBoundingClientRect()
      const sc = scrollParentOf(row)
      const bar = bodyRef.current?.querySelector<HTMLElement>('[data-head-bar]')
      const top = Math.max(sc ? sc.getBoundingClientRect().top : 0, bar ? bar.getBoundingClientRect().bottom : 0)
      const bottom = sc ? sc.getBoundingClientRect().bottom : window.innerHeight
      if (r.top < top || r.bottom > bottom) row.scrollIntoView({ block: 'center', behavior: 'smooth' })
      if (opts.focus) { const input = row.querySelector<HTMLInputElement>('input[data-name]'); if (input) { input.focus({ preventScroll: true }); input.select() } }
      setFresh(new Set(ids))
      window.setTimeout(() => setFresh((f) => (ids.some((id) => f.has(id)) ? new Set([...f].filter((id) => !ids.includes(id))) : f)), 1500)
    }
    requestAnimationFrame(() => requestAnimationFrame(tick))
  }
  const create = async (input: Parameters<typeof createQuoteItem>[1], focusName = false) => {
    const r = await structural('add the item', () => createQuoteItem(quoteId, input))
    if (r.ok) attention([r.value.id], { focus: focusName })
  }
  const removeItems = (list: string[]) => {
    const gone = new Set(list)
    for (const i of itemsRef.current) if (i.parentId && gone.has(i.parentId)) gone.add(i.id)
    return structural('remove', async () => { const r = await deleteQuoteItems(list); if (r) onSaved(r.updatedAt, r.amountMinor) }, list.length === 1 ? 'Item removed' : `${list.length} items removed`, gone)
  }

  /* ── the clipboard (REG-476, the Excel benchmark's phase 2) ── */
  const pasteAnchor = pasting?.anchorId ? items.find((i) => i.id === pasting.anchorId) ?? null : null
  /** The mapped lines land after the row the paste hit — inside a group when that row is one — or at the end. */
  const addPasted = (lines: PasteLine[], place: 'after' | 'end') => {
    const a = place === 'after' ? pasteAnchor : null
    setPasting(null)
    const before = new Set(itemsRef.current.map((i) => i.id))
    void structural('add the items', () => createQuoteItems(quoteId, lines, a ? (a.kind === 'group' ? { parentId: a.id } : { parentId: a.parentId ?? null, afterId: a.id }) : {}), `${lines.length} ${lines.length === 1 ? 'item' : 'items'} added`).then((r) => { if (r.ok) attention(before) })
  }
  /** Bulk Copy · Cmd+C: the ticked rows as a sheet's rows (a header, tab-separated), so they paste straight into Excel. */
  const copyRows = (ids: string[]) => {
    const rows = exportRows(itemsRef.current, new Set(ids))
    if (!rows.length) return
    void navigator.clipboard?.writeText(toTsv([[...EXPORT_HEAD], ...rows])).then(() => snackbar({ message: `${rows.length} ${rows.length === 1 ? 'row' : 'rows'} copied — paste them into a sheet` }), () => fail('copy the rows'))
  }
  /** Export As → the house Export dialog (the leads' and the tasks' one, REG-478): every line in table order with the groups' sums,
      as CSV · XLS · XLSX · PDF from the one writer (lib/leads/export.ts). Money prints with its two decimals. */
  const downloadItems = (format: ExportFormat) => {
    const body = exportRows(itemsRef.current).map((r) => r.map((c, i) => (c === null ? '' : typeof c === 'number' ? (EXPORT_MONEY_COLS.includes(i) ? c.toFixed(2) : String(c)) : c)))
    return downloadBlob(buildTable('OpenMaison — Items', [...EXPORT_HEAD], body, format), `${seed.number ?? 'quote'}-items.${format.toLowerCase()}`)
  }

  /* ── fill, set, sort (REG-477, the Excel benchmark's phase 3) ── */
  /** What a target line takes from the source's column: a cost keeps the target's markup in bounds, a unit price becomes the target's
      own markup, a label lands on groups too. */
  const fillPatch = (col: string, src: QuoteItem, t: QuoteItem): ItemPatch | null => {
    const line = t.kind === 'item'
    switch (col) {
      case 'qty': return line ? { qty: src.qty } : null
      case 'unit': return line ? { unit: src.unit } : null
      case 'cost': return line ? { costMinor: src.costMinor, markupMinor: Math.max(-src.costMinor, t.markupMinor) } : null
      case 'markup': return line ? { markupMinor: Math.max(-t.costMinor, src.markupMinor) } : null
      case 'unitPrice': return line ? { markupMinor: Math.max(-t.costMinor, unitPriceMinor(src) - t.costMinor) } : null
      case 'discount': return line ? { discountPct: src.discountPct } : null
      case 'gst': return line ? { gstPct: src.gstPct } : null
      case 'room': return { room: src.room }
      case 'category': return { category: src.category }
      case 'section': return { section: src.section }
      case 'rebate': return line ? { rebateMinor: src.rebateMinor } : null   // (REG-596)
      case 'name': return { name: src.name }
      case 'desc': return { description: src.description }
      default: return null
    }
  }
  /** Drag-fill released / Cmd+D: one snapshot, then every target patched (and autosaved) like a cell edit. */
  const fillDown = (col: string, sourceId: string, targetIds: string[]) => {
    const cur = itemsRef.current
    const src = cur.find((i) => i.id === sourceId)
    if (!src) return
    const patches = targetIds.flatMap((id) => { const t = cur.find((i) => i.id === id); const p = t ? fillPatch(col, src, t) : null; return p ? [[id, p] as const] : [] })
    if (!patches.length) return
    snapshot()
    for (const [id, p] of patches) patchItem(id, p, { snapshot: false })
    snackbar({ message: `${patches.length} ${patches.length === 1 ? 'cell' : 'cells'} filled` })
  }
  /** Set value (the bulk bar): one field, one value, every ticked line — a markup as a share of each line's cost. */
  const applySet = (field: SetField, value: string | number) => {
    const cur = itemsRef.current
    const label = field === 'room' || field === 'category' || field === 'section'
    const targets = cur.filter((i) => selected.has(i.id) && (i.kind === 'item' || label))
    setSetValueOpen(false)
    if (!targets.length) return
    const n = typeof value === 'number' ? value : 0
    const str = typeof value === 'string' ? value.trim() || null : null
    snapshot()
    for (const t of targets) {
      const p: ItemPatch | null =
        field === 'qty' ? { qty: n } : field === 'unit' ? { unit: str } : field === 'cost' ? { costMinor: Math.round(n * 100), markupMinor: Math.max(-Math.round(n * 100), t.markupMinor) }
        : field === 'markupPct' ? { markupMinor: Math.round(t.costMinor * n / 100) } : field === 'unitPrice' ? { markupMinor: Math.max(-t.costMinor, Math.round(n * 100) - t.costMinor) }
        : field === 'discount' ? { discountPct: n } : field === 'gst' ? { gstPct: n } : field === 'room' ? { room: str } : field === 'category' ? { category: str } : field === 'section' ? { section: str } : null
      if (p) patchItem(t.id, p, { snapshot: false })
    }
    snackbar({ message: `${targets.length} ${targets.length === 1 ? 'item' : 'items'} updated` })
    setSelected(new Set())
  }
  /* Cmd+Z / Cmd+Shift+Z (Ctrl+Z / Ctrl+Y as well) undo and redo the lines from the page's body or anywhere in this card (REG-475) — but
     not from a box with typing in it, where the browser's own undo takes the keystrokes back, nor from another dialog or a menu.
     Cmd+C with rows ticked (and no box focused) copies them as a sheet's rows; Cmd+D fills the focused cell's value down into the
     ticked rows, or — none ticked — the cell above into it, as Excel's Fill Down does (REG-476 / REG-477). */
  const keys = useRef({ undo, redo, live: open || expanded, selected, copyRows, fillDown })
  useEffect(() => { keys.current = { undo, redo, live: open || expanded, selected, copyRows, fillDown } })
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey || !keys.current.live) return
      const k = e.key.toLowerCase()
      if (k !== 'z' && k !== 'y' && k !== 'c' && k !== 'd') return
      const t = e.target instanceof HTMLElement ? e.target : null
      if (t && t !== document.body && !t.closest('[id^="section-items"], [data-items-expanded]')) return
      if (t?.closest('[role="dialog"]:not([data-items-expanded]), [role="menu"], [role="listbox"]') || document.querySelector('[role="dialog"]:not([data-items-expanded])')) return
      const typing = !!t?.matches('input, textarea, [contenteditable="true"]')
      if (k === 'z' || k === 'y') {
        if (typing && (!t!.hasAttribute('data-edit') || t!.hasAttribute('data-dirty'))) return
        e.preventDefault()
        if (t?.hasAttribute('data-edit')) t.blur()
        if (k === 'y' || e.shiftKey) keys.current.redo(); else keys.current.undo()
      } else if (k === 'c') {
        if (typing || e.shiftKey || !keys.current.selected.size) return
        e.preventDefault()
        keys.current.copyRows([...keys.current.selected])
      } else if (k === 'd') {
        if (!t?.hasAttribute('data-edit') || e.shiftKey) return
        const col = t.closest<HTMLElement>('[data-col]')?.dataset.col, row = rowOf(t)
        const id = row?.dataset.itemId
        if (!col || !row || !id) return
        e.preventDefault()
        const ticked = [...keys.current.selected].filter((x) => x !== id)
        if (ticked.length) { keys.current.fillDown(col, id, ticked); return }
        const above = row.previousElementSibling instanceof HTMLElement ? row.previousElementSibling.dataset.itemId : undefined
        if (above) { t.blur(); keys.current.fillDown(col, above, [id]); requestAnimationFrame(() => t.focus()) }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

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
      case 'saveSection': void run('save the section to My Items', async () => { const p = await saveSectionToPriceBook(item.id); setPriceBookSections((b) => [...b, p].sort((a, c) => a.name.localeCompare(c.name))) }, 'Section saved to My Items — find it under My Sections in the Add Item box'); break   /* REG-566 */
      case 'noNumber': patchItem(item.id, { noNumber: !item.noNumber }); snackbar({ message: item.noNumber ? 'The line is numbered again' : 'The line prints without a number' }); break   /* REG-558 */
      case 'ungroup': void structural('ungroup the section', async () => { const r = await ungroupQuoteItem(item.id); onSaved(r.updatedAt, r.amountMinor) }, 'Section removed — its lines stay. Undo with ⌘Z'); break   /* REG-558 */
      case 'subtotalLabel': setLabelling(item); break   /* REG-555 (T-3) */
      case 'oneLine': patchItem(item.id, { printOneLine: !item.printOneLine }); snackbar({ message: item.printOneLine ? 'The section prints every line again' : 'The section prints as one line — its name and its total; the lines stay yours' }); break   /* REG-585 */
      case 'description': break
      case 'duplicate': void structural('duplicate the item', () => duplicateQuoteItem(item.id), 'Item duplicated').then((r) => { if (r.ok) attention([r.value.id]) }); break
      case 'copyName': void navigator.clipboard?.writeText(item.name).then(() => snackbar({ message: 'Name copied' }), () => fail('copy the name')); break
      case 'group': { const list = selected.has(item.id) && selected.size > 1 ? [...selected] : [item.id]; void structural('put the items in a section', () => groupQuoteItems(quoteId, list), 'Section created').then((r) => { if (r.ok) attention([r.value.id], { focus: true }) }); setSelected(new Set()); break }
      case 'showFull': setShowFull((s) => { const n = new Set(s); if (n.has(item.id)) n.delete(item.id); else n.add(item.id); return n }); break
      case 'optional': patchItem(item.id, { optional: !item.optional }); snackbar({ message: item.optional ? 'Optional mark cleared' : 'Marked as optional — printed in its own section, out of the totals' }); break   /* REG-492 */
      case 'addAbove': void create({ parentId: item.parentId ?? null, beforeId: item.id }, true); break
      case 'addBelow': insertBelow(item); break
      case 'moveUp': void structural('move the item', () => moveQuoteItem(item.id, 'up')).then((r) => { if (r.ok) attention([item.id]) }); break
      case 'moveDown': void structural('move the item', () => moveQuoteItem(item.id, 'down')).then((r) => { if (r.ok) attention([item.id]) }); break
      case 'remove': setRemoving([item.id]); break
    }
  }

  /* ── the pointer drag's drop (REG-571, row-drag.ts): the slot follows the row under the pointer — before / after it among ITS
     siblings, or first inside an open section — so a line can leave one section for another by drag (the owner's call, 2026-09-23;
     Move to section stays in the row menu for the keyboard and a finger). The order shown is the order stored: the lines move at
     once, the parent change (if any) and the new sibling order are written after, and a failed write reloads the lines. */
  const commitDrag = (id: string, slot: DropSlot) => {
    const cur = itemsRef.current
    const a = cur.find((i) => i.id === id)
    if (!a) return
    const target = slot.parentId
    const sibs = cur.filter((i) => (i.parentId ?? null) === target && i.id !== id).sort((x, y) => x.position - y.position).map((i) => i.id)
    let at = 0
    if (slot.where !== 'inside') { const k = sibs.indexOf(slot.anchorId ?? ''); if (k < 0) return; at = k + (slot.where === 'after' ? 1 : 0) }
    sibs.splice(at, 0, id)
    const from = a.parentId ?? null
    const moved = from !== target
    const host = target ? cur.find((i) => i.id === target) ?? null : null
    const status = moved && host ? host.status : a.status   // a line joining a section carries its answer (setQuoteItemParent's rule)
    const under = moved ? descendantIds(cur, [id]) : new Set<string>()
    const fromSibs = cur.filter((i) => (i.parentId ?? null) === from && i.id !== id).sort((x, y) => x.position - y.position).map((i) => i.id)
    snapshot()
    setItems((c) => c.map((i) => {
      if (i.id === id) return { ...i, parentId: target, position: sibs.indexOf(id), status }
      if ((i.parentId ?? null) === target) return { ...i, position: sibs.indexOf(i.id) }
      if (moved && (i.parentId ?? null) === from) return { ...i, position: fromSibs.indexOf(i.id) }
      if (moved && under.has(i.id)) return { ...i, status }
      return i
    }).sort((x, y) => x.position - y.position))   // the array stays in position order, as the store hands it out
    attention([id])
    void run('move the line', async () => {
      await settle()
      try {
        if (moved) await setQuoteItemParent(id, target)
        const r = await reorderQuoteItems(quoteId, target, sibs)
        onSaved(r.updatedAt, r.amountMinor)
      } catch (e) { await reload(); throw e }
    }, moved ? (host ? `Moved into “${host.name}”` : 'Moved out of the section') : undefined)
  }

  /* ── quote-level ── */
  const changePricing = (patch: Partial<Pricing>) => {
    /* (REG-593) An entity that is not GST-registered turns GST off with it — said, never silent. */
    if (patch.issuingEntity !== undefined && patch.gstEnabled !== undefined && patch.gstEnabled !== pricing.gstEnabled) snackbar({ message: `GST ${patch.gstEnabled ? 'on' : 'off'} — ${patch.issuingEntity ?? seed.studio.name} is ${patch.gstEnabled ? '' : 'not '}GST-registered` })
    const next = { ...pricing, ...patch }
    // The value shown is the value applied: % ≤ 100, S$ ≤ the subtotal (REG-417) — the server holds the same bound.
    const max = maxAdditional(next.additionalDiscountMode, totals.subtotalMinor)
    if (next.additionalDiscountValue > max) { next.additionalDiscountValue = Number(max.toFixed(2)); patch = { ...patch, additionalDiscountValue: next.additionalDiscountValue } }
    setPricing(next)
    void run('save the totals', async () => { const r = await updateQuotePricing(quoteId, patch); onSaved(r.updatedAt, r.amountMinor) })
  }
  /* Round Prices (REG-479, the owner's reference): the Round selling prices dialog rounds each line's unit price to a step — the markup
     absorbs the difference, the cost never moves — under one snapshot, so one Cmd+Z takes the whole rounding back. */
  const [roundOpen, setRoundOpen] = useState(false)
  const applyRound = (changes: RoundChange[]) => {
    setRoundOpen(false)
    if (!changes.length) return
    const cur = itemsRef.current
    snapshot()
    for (const c of changes) { const t = cur.find((i) => i.id === c.id); if (t) patchItem(t.id, { markupMinor: Math.max(-t.costMinor, c.toMinor - t.costMinor) }, { snapshot: false }) }
    snackbar({ message: `${changes.length} ${changes.length === 1 ? 'price' : 'prices'} rounded` })
  }
  const savePrefs = (patch: Parameters<typeof updateItemsPrefs>[1]) => { void run('save the view', () => updateItemsPrefs(quoteId, patch)) }
  const closeMenus = () => { setMenu(null); setMoreSub(null) }
  const chooseView = (v: ItemsView) => { closeMenus(); setView(v); setCollapsedBuckets(new Set()); savePrefs({ itemsView: v }) }
  const chooseDensity = (d: ItemsDensity) => { closeMenus(); setDensity(d); savePrefs({ itemsDensity: d }) }
  /* (REG-464) The drawer applies live — a drag inside it streams reorders — so the table follows at once and the quote is written
     once the stream settles. */
  const persistColumns = useRef<number | null>(null)
  const pendingColumns = useRef<ColumnSettings | null>(null)
  const saveColumns = (c: ColumnSettings) => {
    setColumns(c)
    pendingColumns.current = c
    if (persistColumns.current) window.clearTimeout(persistColumns.current)
    persistColumns.current = window.setTimeout(() => { persistColumns.current = null; pendingColumns.current = null; savePrefs({ itemsColumns: c }) }, 400)
  }
  /* Leaving the editor inside the 400 ms window still writes the change (the cell queue and General Info flush the same way). */
  const savePrefsRef = useRef(savePrefs); useEffect(() => { savePrefsRef.current = savePrefs })
  useEffect(() => () => { if (persistColumns.current) { window.clearTimeout(persistColumns.current); persistColumns.current = null }; if (pendingColumns.current) { savePrefsRef.current({ itemsColumns: pendingColumns.current }); pendingColumns.current = null } }, [])
  const addLabel = (kind: 'room' | 'category' | 'section', name: string) => {
    const key = kind === 'room' ? 'rooms' : kind === 'category' ? 'categories' : 'sections'
    const next = { ...labels, [key]: labels[key].includes(name) ? labels[key] : [...labels[key], name] }
    setLabels(next); savePrefs({ itemsLabels: next })
  }
  const usedLabels = useMemo(() => ({
    rooms: [...new Set([...labels.rooms, ...items.map((i) => i.room).filter((x): x is string => !!x)])],
    categories: [...new Set([...seed.trades, ...labels.categories, ...items.map((i) => i.category).filter((x): x is string => !!x)])],   // (REG-561) the studio's trades first
    sections: [...new Set([...labels.sections, ...items.map((i) => i.section).filter((x): x is string => !!x)])],
  }), [items, labels, seed.trades])
  const bucketKeys = useMemo(() => {
    if (view === 'none') return []
    const list = view === 'room' ? usedLabels.rooms : view === 'category' ? usedLabels.categories : usedLabels.sections
    return [...new Set([...list, view === 'category' ? 'Uncategorized' : 'Unassigned'])]
  }, [view, usedLabels])
  /* (REG-532) A By-category row: View by → Category. The shares count every priced line by its own category, while the view buckets
     top-level rows (a group stays whole under its own label, else Uncategorized — `buildDisplay`), so a share's bucket can be empty:
     the picked bucket is opened alone and scrolled to only when it holds priced lines; otherwise the view simply switches, every bucket open. */
  const pickCategory = (name: string) => {
    chooseView('category')
    const tops = items.filter((i) => !i.parentId && (i.category || UNLABELLED.category) === name)
    const priced = tops.some((t) => (t.kind === 'item' ? counts(t) && lineTotalMinor(t) > 0 : items.some((c) => c.parentId === t.id && counts(c) && lineTotalMinor(c) > 0)))
    if (!priced) return
    setCollapsedBuckets(new Set([...usedLabels.categories, UNLABELLED.category].filter((k) => k !== name)))
    window.setTimeout(() => bodyRef.current?.querySelector(`[data-bucket="${CSS.escape(name)}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 60)
  }

  /* (REG-583) The GST (%) column rests while the quote's GST is off — a "9" down the table beside an off switch read as a contradiction;
     the lines keep their rate and the column returns with the switch. */
  const isOwner = seed.me?.role === 'Owner'
  /* (REG-596) The Rebate column exists for Owners alone: a designer never sees it, in the table or in Column settings. */
  const visibleColumns = columns.columns.filter((c) => c.on && (c.key !== 'gst' || pricing.gstEnabled) && (c.key !== 'rebate' || isOwner)).map((c) => c.key) as ColumnKey[]
  const selectedList = [...selected]
  const nextNumber = items.filter((i) => !i.parentId).length + 1
  const owner = seed.me?.role === 'Owner'
  const createGroup = (ids: string[] = selectedList) => { void structural('create the section', () => groupQuoteItems(quoteId, ids, 'New section'), 'Section created').then((r) => { if (r.ok) attention([r.value.id], { focus: true }) }); setSelected(new Set()) }   /* (REG-573) the new section is brought into view and named at once */
  /* (REG-555 · REG-556) Print as and Highlight from the row menu and the bulk bar: cell-like patches, one snapshot for a run. */
  const setPrintAs = (ids: string[], v: PrintAs | null, text: string | null = null) => {
    const targets = itemsRef.current.filter((i) => ids.includes(i.id) && i.kind === 'item')
    if (!targets.length) return
    snapshot()
    for (const t of targets) patchItem(t.id, { printAs: v, printAsText: v === 'custom' ? text ?? t.printAsText : null }, { snapshot: false })
    snackbar({ message: v ? `${targets.length === 1 ? 'The line prints' : `${targets.length} lines print`} as ${v === 'custom' ? `“${text ?? ''}”` : PRINT_AS_LABEL[v]}${v === 'behalf' ? ' — counted, no GST' : ' — not counted'}` : `${targets.length === 1 ? 'The line prints' : `${targets.length} lines print`} the price again` })
  }
  const setHighlight = (ids: string[], v: Highlight | null) => {
    const targets = itemsRef.current.filter((i) => ids.includes(i.id))
    if (!targets.length) return
    snapshot()
    for (const t of targets) patchItem(t.id, { highlight: v }, { snapshot: false })
    snackbar({ message: v ? `Highlighted — ${HIGHLIGHT_LABEL[v]}` : 'Highlight removed' })
  }
  const fromMyItems = () => { closeMenus(); setAddOpenTick((t) => t + 1); addInputRef.current?.focus() }

  /* Find (REG-477): a search glyph that opens the DS SearchBar and folds back when left empty (Escape clears it). The tab toolbars' box
     (components/om/toolbar-search.tsx) stands open on desktop; the mock's Items toolbar has no room for a standing box. */
  const [findOpen, setFindOpen] = useState(false)
  const findRef = useRef<HTMLSpanElement>(null)
  useEffect(() => { if (findOpen) findRef.current?.querySelector('input')?.focus() }, [findOpen])
  const find = findOpen || query !== '' ? (
    <span ref={findRef} className={styles.find}
          onBlurCapture={(e) => { if (query === '' && !e.currentTarget.contains(e.relatedTarget as Node | null)) setFindOpen(false) }}
          onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); setQuery(''); setFindOpen(false) } }}>
      <SearchBar appearance="outlined" size="md" placeholder="Find items" aria-label="Find items" value={query} onChange={setQuery} />
    </span>
  ) : (
    <Tooltip label="Find items"><IconButton icon="search" label="Find items" onClick={() => setFindOpen(true)} /></Tooltip>
  )

  /* The radio rows View by / density share one rendering between the wide toolbar's menus and the folded kebab's levels. */
  const densityRows = DENSITIES.map((d) => <DropdownItem key={d} role="menuitemradio" checked={d === density} onSelect={() => chooseDensity(d)}><span className={styles.menuIcon} data-on={d === density || undefined}><Icon name={d === density ? 'radio_button_checked' : 'radio_button_unchecked'} size={20} /></span>{DENSITY_LABEL[d]}</DropdownItem>)
  const viewRows = ITEM_VIEWS.map((v) => <DropdownItem key={v} role="menuitemradio" checked={v === view} onSelect={() => chooseView(v)}><span className={styles.menuIcon} data-on={v === view || undefined}><Icon name={v === view ? 'radio_button_checked' : 'radio_button_unchecked'} size={20} /></span>{ITEM_VIEW_LABEL[v]}</DropdownItem>)
  const createMenu = (
    <PortalMenu open={menu === 'create'} anchor={createRef} onClose={closeMenus} role="menu" width={200} align="right" sheetTitle="Create">
      <DropdownItem onSelect={() => { closeMenus(); void create({}, true) }}>New Item</DropdownItem>
      <DropdownItem onSelect={() => { closeMenus(); createGroup([]) }}>New section</DropdownItem>
      <DropdownDivider />
      <DropdownItem onSelect={fromMyItems}>From My Items</DropdownItem>
    </PortalMenu>
  )

  /* ── toolbar (section-top actions, 1260:31216) ── */
  const toolbar = compact ? (
    <div className={styles.tools} data-compact="">
      {find}
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
                {view === 'section' ? <DropdownItem onSelect={() => { closeMenus(); setNaming({ kind: 'section' }) }}>Add Section label</DropdownItem> : null}
                <DropdownItem onSelect={() => { closeMenus(); createGroup(selectedList) }}><span className={styles.menuIcon}><Icon name="create_new_folder" size={20} /></span>New section</DropdownItem>
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
      {find}
      {view === 'category' ? <Button variant="secondary" appearance="text" onPress={() => setNaming({ kind: 'category' })}>Add Category</Button> : null}
      {view === 'section' ? <Button variant="secondary" appearance="text" onPress={() => setNaming({ kind: 'section' })}>Add Section label</Button> : null}
      <Button variant="secondary" appearance="outlined" iconStart={<Icon name="create_new_folder" size={20} />} onPress={() => createGroup(selectedList)}>New section</Button>   {/* (REG-567) the mock's "Create Group" */}
      <span className={styles.seg}>
        <Tooltip label="Undo"><IconButton icon="undo" label="Undo" disabled={history.past.length === 0} onClick={undo} /></Tooltip>
        <Tooltip label="Redo"><IconButton icon="redo" label="Redo" disabled={history.future.length === 0} onClick={redo} /></Tooltip>
      </span>
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
      {/* (owner 2026-09-16, REG-458) Expand / Collapse is the row's last control, after Create — the mock (1271:41169) had it among the icon buttons. */}
      <Tooltip label={expanded ? 'Collapse' : 'Expand'}><IconButton icon={expanded ? 'collapse_content' : 'expand_content'} label={expanded ? 'Collapse' : 'Expand'} onClick={() => setExpanded((x) => !x)} /></Tooltip>
    </div>
  )

  const title = `Items (${lineCount})`
  const body = (
        <div ref={bodyRef} className={styles.body}>
          <ItemsTable
            onAddColumn={() => setSettingsOpen(true)}
            onReorder={(keys) => saveColumns({ ...columns, columns: [...keys.map((k) => columns.columns.find((c) => c.key === k)!), ...columns.columns.filter((c) => !c.on)] })}
            items={items} priceBook={priceBook} priceBookSections={priceBookSections} brandColors={seed.brandColors} view={view} density={density} columns={visibleColumns} details={columns.details} labels={usedLabels} clientColumns={clientColumns ?? null}
            selected={selected} collapsedBuckets={collapsedBuckets} showFull={showFull} nextNumber={nextNumber}
            query={query} onPasteBlock={(text, anchorId) => setPasting({ text, anchorId })}
            h={{
              onPatch: patchItem,
              onFill: fillDown,
              onSelect: (id, on) => setSelected((s) => { const n = new Set(s); if (on) n.add(id); else n.delete(id); return n }),
              onSelectRun: (ids) => setSelected((s) => new Set([...s, ...ids])),
              onInsertBelow: insertBelow,
              onMenu,
              onChooseGroup: (item, gid) => { void structural('move the item', () => setQuoteItemParent(item.id, gid), gid ? 'Moved into the section' : 'Moved out of the section').then((r) => { if (r.ok) attention([item.id]) }) },
              onPrintAs: (item, v) => { if (v === 'custom') { setSelected(new Set([item.id])); setPrintAsOpen(true) } else setPrintAs([item.id], v) },
              onHighlight: (item, v) => setHighlight([item.id], v),
              onUploadImage: (item) => setImageFor(item),
              onComingSoon: comingSoon,
              onAddLabel: (kind) => setNaming({ kind }),
            }}
            onDropRow={commitDrag}
            fresh={fresh}
            onSelectAll={(on) => setSelected(on ? new Set(items.map((i) => i.id)) : new Set())}
            onToggleBucket={(k) => setCollapsedBuckets((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n })}
            onToggleAllBuckets={() => setCollapsedBuckets((s) => (s.size ? new Set() : new Set(bucketKeys)))}
            onCreate={(name) => { void create({ name }, !name) }}
            onPickPriceBook={(id) => { void create({ priceBookItemId: id }) }}
            onPickSection={(id) => { void structural('insert the section', () => insertPriceBookSection(quoteId, id), 'Section added from My Items').then((r) => { if (r.ok) attention([r.value.id]) }) }}
            onViewPriceBook={() => router.push(withFrom('/company/price-book', `/quotes/${quoteId}`))}   /* (REG-594) Company › Price book, with the way back */
            onExport={() => setExportOpen(true)}
            addInputRef={addInputRef}
            addOpenTick={addOpenTick + addTick}
          />
          <ItemsSummary totals={totals} pricing={pricing} studio={seed.studio} entities={seed.entities} owner={owner} gstLabel={gstLabel} shares={shares} onPickCategory={pickCategory} onPricing={changePricing} onRound={() => setRoundOpen(true)} />
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
        /* (REG-570) `sticky`: the top holds while the table scrolls. */
        <SectionCard id="section-items" title={title} open={open} onToggle={onToggle} actions={toolbar} sticky>{body}</SectionCard>
      )}
      <DetailBulkBar
        count={selected.size}
        actions={[
          { label: 'Copy', onClick: () => copyRows(selectedList) },
          { label: 'Set value', onClick: () => setSetValueOpen(true) },
          { label: 'Section', onClick: () => createGroup(selectedList) },
          { label: 'Print as', onClick: () => setPrintAsOpen(true) },
          { label: 'Hide from client', onClick: () => { snapshot(); for (const id of selectedList) patchItem(id, { visibility: 'hidden' }, { snapshot: false }); snackbar({ message: `${selectedList.length} hidden from the client` }); setSelected(new Set()) } },
          { label: 'Delete', tone: 'danger', onClick: () => setRemoving(selectedList) },
        ]}
        onClear={() => setSelected(new Set())}
      />
      <ConfirmDialog open={!!removing} title={removing && removing.length > 1 ? `Remove ${removing.length} items?` : removingSection ? 'Remove this section?' : 'Remove this item?'}
                     message={removing && removing.length > 1 ? `The ${removing.length} lines leave the quote and its totals.` : removingSection ? `The section and its ${removingSection} ${removingSection === 1 ? 'line leave' : 'lines leave'} the quote and its totals. To keep the lines, use Ungroup instead.` : 'The line leaves the quote and its totals.'} confirmLabel="Remove"
                     onConfirm={() => { const list = removing ?? []; setRemoving(null); setSelected(new Set()); void removeItems(list) }} onCancel={() => setRemoving(null)} />
      <NameDialog open={!!naming} title={naming?.kind === 'room' ? 'Add Room' : naming?.kind === 'section' ? 'Add Section label' : 'Add Category'} initial=""
                  onSave={(name) => { if (naming) addLabel(naming.kind, name.trim()); setNaming(null) }} onClose={() => setNaming(null)} />
      {/* (REG-555, T-3) A word beside the section's sub-total — "Approximate", "Estimate" — through the house name dialog. */}
      <NameDialog open={!!labelling} title="Label the sub-total" initial={labelling?.printAsText ?? ''}
                  onSave={(name) => { if (labelling) { patchItem(labelling.id, { printAsText: name.trim() || null }); snackbar({ message: name.trim() ? `The sub-total prints “${name.trim()}”` : 'Sub-total label removed' }) } setLabelling(null) }} onClose={() => setLabelling(null)} />
      <PrintAsDialog open={printAsOpen} count={selected.size} onClose={() => setPrintAsOpen(false)} onApply={(v, text) => { setPrintAsOpen(false); setPrintAs(selectedList, v, text); setSelected(new Set()) }} />
      <AttachFilesModal open={!!imageFor} mode="image" chrome="quote" files={seed.files} attached={[]} onClose={() => setImageFor(null)}
                        onAttach={(fileIds) => { const f = seed.files.find((x) => x.id === fileIds[0]); if (imageFor && f) patchItem(imageFor.id, { thumb: f.thumb ?? null, thumbCount: f.thumb ? 1 : 0, icon: null }); setImageFor(null) }}
                        onUploadPicked={() => { if (imageFor) patchItem(imageFor.id, { thumb: '/figma-assets/file-thumb-1.png', thumbCount: 1, icon: null }); setImageFor(null) }} />
      <PasteItemsDialog open={!!pasting} text={pasting?.text ?? ''} anchor={pasteAnchor ? { id: pasteAnchor.id, name: pasteAnchor.name } : null} onClose={() => setPasting(null)} onAdd={addPasted} />
      <RoundPricesDialog open={roundOpen} items={items} onClose={() => setRoundOpen(false)} onApply={applyRound} />
      <ExportDialog open={exportOpen} title="Export Items" download={downloadItems} onClose={() => setExportOpen(false)}
                    onDone={(name, format) => snackbar({ message: `Exported ${lineCount} ${lineCount === 1 ? 'item' : 'items'} as ${format} · ${name}` })} />
      <SetValueDialog open={setValueOpen} count={selected.size} labels={usedLabels} onClose={() => setSetValueOpen(false)} onApply={applySet} />
      <ColumnSettingsDrawer open={settingsOpen} value={columns} onClose={() => setSettingsOpen(false)} onSave={saveColumns} onReset={() => clearColumnWidths(ITEMS_TABLE)} clientColumns={clientColumns ?? null} hidden={owner ? [] : ['rebate']} />
    </>
  )
}
