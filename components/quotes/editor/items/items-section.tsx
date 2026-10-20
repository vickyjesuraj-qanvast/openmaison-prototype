'use client'

import { usePlanLock } from '@/components/credits/credits-client'
import { useVariation } from './variation-context'
import { OmitDialog } from './omit-dialog'   // (gaps build B, item 7)
import { contractLinesFor, omitFromContract, type ContractLine } from '@/app/projects/money-actions'
import { useRouter } from 'next/navigation'
import { flagOn, markUsed, SINGLE_KEYS, useShortcutsHere } from '@/lib/keys/store'
import { copyText } from '@/lib/clipboard'
import { GRID_KEYS } from '@/lib/keys/registry'
import { withFrom } from '@/lib/nav'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button, SearchBar } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { PortalMenu } from '@/components/om/portal-menu'
import { Tooltip } from '@/components/om/tooltip'
import { ConfirmDialog } from '@/components/om/confirm-dialog'
import { useSnackbar } from '@/components/om/snackbar'
import { TABLET_DOWN, useMediaQuery } from '@/lib/breakpoint'
import { DropdownDivider, DropdownItem, DropdownLabel, MENU_WIDTH } from '@/components/leads/dropdown'
import { DetailBulkBar } from '@/components/leads/tasks/detail-bulk-bar'
import { AttachFilesModal } from '@/components/leads/tasks/attach-files-modal'
import { PriceBookDialog, type PriceBookPick, type PriceBookTab } from './price-book-dialog'
import { NameDialog } from '@/components/leads/files/name-dialog'
import { couldnt, refusalOf, useRun } from '@/components/leads/tasks/use-run'
import type { LeadFile, Member, PriceBookItem, PriceBookSection, QuoteItem } from '@/lib/db/schema'
import { uploadPicked } from '@/components/leads/files/upload-picture'   // (pending modules S04) a line's picture keeps its bytes
import type { Studio } from '@/lib/settings/types'
import { DEFAULT_DENSITY, DENSITIES, DENSITY_LABEL, HIGHLIGHT_LABEL, HIGHLIGHTS, isHighlight, UNITS, inSavedOrder, ITEM_VIEWS, ITEM_VIEW_LABEL, parseColumns, parseLabels, PRINT_AS_LABEL, sectionForTrade, tradeOfSection, UNLABELLED, type ColumnKey, type ColumnSettings, type Highlight, type ItemLabels, type ItemsDensity, type ItemsView, type PrintAs, type RowMenuAction } from '@/lib/quotes/items-model'
import { carried as carriedOf, categoryShares, counts, depthOf, descendantIds, flattenItems, groupLevel, lineTotalMinor, money2, moveTargets, pct, quoteTotals, unitPriceMinor, type QuoteTotals } from '@/lib/quotes/math'
import { scrollParentOf } from '@/components/om/use-stuck'
import { EXPORT_HEAD, EXPORT_MONEY_COLS, exportCells, exportRows, toTsv, type PasteLine } from '@/lib/quotes/clipboard'
import { COST_COLUMNS } from '@/lib/quotes/items-model'   // (pending modules S41b-1)
import { ExportDialog } from '@/components/leads/export-dialog'
import { buildTable, downloadBlob, type ExportFormat } from '@/lib/leads/export'
import { addQuoteItem, addQuoteItems, moveQuoteItems, type MoveTarget, type ItemsPlace, createQuoteItem, deleteQuoteItems, duplicateQuoteItem, groupQuoteItems, insertPriceBookSection, listQuoteItems, moveQuoteItem, replaceQuoteItems, reorderQuoteItems, saveItemToPriceBook, saveSectionToPriceBook, setQuoteItemParent, setSectionPricedAfter, undoSaveToPriceBook, ungroupQuoteItem, updateItemsPrefs, updateQuoteItem, updateQuotePricing, matchQuoteLinesToBook, undoBookAdds, type ItemPatch, type SavedToBook } from '@/app/quotes/items-actions'
import { PrintAsDialog } from './print-as-dialog'
import { SectionCard } from '../section-card'
import { ItemsTable, ITEMS_TABLE } from './items-table'
import { PasteItemsDialog, type PlaceControl } from './paste-items-dialog'
import { SetValueDialog, type SetField } from './set-value-dialog'
import { RoundPricesDialog, type RoundChange } from './round-prices-dialog'
import { MatchBookDialog, planBookMatches } from './match-book-dialog'
import { WritingBookContext } from './description-dialog'
import { rowOf } from './grid-keys'
import type { DropSlot } from './row-drag'
import { clearColumnWidths } from '@/lib/table-widths'
import { ItemsSummary, maxAdditional, type Pricing } from './items-summary'
import { ColumnSettingsDrawer } from './column-settings-drawer'
import { BookRuleContext, SelectedContext, useLevelFocus } from './table-menus'
import type { FillSeries, FootAdd } from './item-row'
import { VendorDirectoryContext } from './vendor-menu'   // (one-home N-16)
import { useVendorDirectory } from '@/components/finance/use-vendor-directory'
import { findVendor } from '@/lib/finance/model'
import styles from './items-section.module.css'
import { roundToStep, type RoundStep } from '@/lib/settings/types'
import type { FolderNode } from '@/lib/folders'
import { isRefusal, orThrow, type Refusal } from '@/lib/company/template-rules'   // (S44Z) orThrow: an action's refusal into the caller's own failure line
import type { LineChanges } from './line-change'
import { seriesFill, type FillValue } from '@/lib/quotes/fill-series'   // (S45C — NB-07 (c)) drag-fill continues a series

const AUTOSAVE_MS = 600

/* (Dane UAT 6.15, g-expanded) Expand survives Preview and the way back: the press on Preview leaves this tab a note (per tab, half an hour),
   and the Items card that mounts for the same quote opens expanded again and forgets it. A per-viewer convenience — sessionStorage, guarded. */
const EXPANDED_KEY = 'om.items.expanded'
function rememberExpanded(quoteId: string) { try { sessionStorage.setItem(EXPANDED_KEY, JSON.stringify({ quoteId, at: Date.now() })) } catch { /* a private window simply forgets */ } }
function takeExpanded(quoteId: string): boolean {
  try {
    const raw = sessionStorage.getItem(EXPANDED_KEY)
    if (!raw) return false
    const v = JSON.parse(raw) as { quoteId?: string; at?: number }
    if (v.quoteId !== quoteId) return false
    sessionStorage.removeItem(EXPANDED_KEY)
    return typeof v.at === 'number' && Date.now() - v.at < 30 * 60_000
  } catch { return false }
}
/** (S44I — M14) A list with each name once whatever its case — the first spelling stays ("Carpentry" before "carpentry"). */
const oneCase = (list: string[]) => { const seen = new Set<string>(); return list.filter((x) => { const k = x.trim().toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true }) }
/** (Dane UAT 6.11) What a template's View by is called in the note: "prints lines by trade". */
const PRINTS_BY: Record<Exclude<ItemsView, 'none'>, string> = { category: 'trade', room: 'room', section: 'section label' }

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
  /** (pending modules S04) the lead — a line's uploaded picture is kept in its Files, as every upload is */
  leadId?: string
  /** The quote's number, for the export's file name (REG-476). */
  number?: string
  items: QuoteItem[]
  priceBook: PriceBookItem[]
  /** (REG-566) The studio's saved sections (My Sections). */
  priceBookSections: PriceBookSection[]
  /** (REG-664) The folders of My Items and My Sections — the Price book modal browses them. */
  bookFolders?: { items: FolderNode[]; sections: FolderNode[] }
  /** (REG-652, price book parity Q-03) Whether the viewer changes the price book (saves sections to My Sections). */
  runsBook?: boolean
  /** (REG-561) The studio's trades (Settings › Quotes): the Category menu's base list. */
  trades: string[]
  /** (S44I — M9) The studio's own units (Settings › Quotes & pricing › Units) — every unit picker's base list. */
  units?: string[]
  /** (REG-617, parity Q-08) The trades' notes, by the trade's name in lower case — the Section note dialog says which one a section prints. */
  tradeNotes?: Record<string, string>
  /** (REG-556) The brand kit's colours by key — the Highlight bar and swatches. */
  brandColors: Record<string, string>
  /** (REG-562 · REG-593) The issuing entities from Company › Profile, each with its GST registration. */
  entities: { name: string; gstRegistered: boolean }[]
  /** (S44I — NB-06) The project this quote is the base of: its issuing entity stays (the project's invoices are issued from it). */
  billsProject?: { number: string; from: string } | null
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
  /** (pending modules S41b-1 — 1.0's Cost & Margin Visibility) Whether this member sees cost, mark-up and margin. When not, the lines and the
      book came with their cost folded into their price (lib/quotes/cost-sight.ts), and the Cost · Markup · Margin columns, Set a value's
      cost and markup, the export's Cost and Markup columns and Match lines' costs are left out — never shown as a 0. */
  costs?: boolean
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
export function ItemsCard({ seed, open, onToggle, onSaved, onOpenAi, onCount, onTotal, onLines, onPricing, clientColumns, forceView, addTick = 0, bookTick = 0, exportTick = 0, propertyType = null, commentCounts = {}, onOpenComments, changes, printsBy = null, onChangeTemplate, onPreview, command = null }: {
  /** (Dane UAT 6.11, g-sections-trade) The quote's template groups its lines by a label (REG-488 / REG-497): its name and how — the quote's
   *  own sections then never print, and the card says so in one line. Null = it prints the quote's own sections. */
  printsBy?: { template: string; view: Exclude<ItemsView, 'none'> } | null
  /** The note's Change template: the editor's template picker. */
  onChangeTemplate?: () => void
  /** (Dane UAT 6.15) Preview from the expanded card (and P there); Expand comes back with the way back. */
  onPreview?: () => void
  /** (UX audit Q10) On a revision: the lines new or changed since the kept version — tinted and tagged in the table. */
  changes?: LineChanges
  /** (REG-627, parity Q-30) Each line's comment count, and the thread's opener (the editor owns the drawer). */
  commentCounts?: Record<string, number>
  onOpenComments?: (itemId: string) => void
  seed: ItemsSeed
  /** (REG-619, parity Q-27) The quote's property type as General Info holds it — My Sections for it come first in the Add Item popover. */
  propertyType?: string | null
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
  /** (REG-662) The Create strip's My Items: bumped by the editor, it opens the Price book modal on My Items. */
  bookTick?: number
  onLines?: (items: QuoteItem[]) => void
  /** (REG-497) The columns the quote's template prints for the client — an eye on their heads; null = no template known. */
  clientColumns?: Set<string> | null
  /** (REG-497) A View by pushed from outside (the regroup prompt after a template change): a new nonce applies it once. */
  forceView?: { key: ItemsView; nonce: number } | null
  /** (REG-538) The header kebab's Export: a new tick opens the Items export dialog. */
  exportTick?: number
  /** (pending modules S04) Maison AI's hints: a new `n` takes the grid to its lines (`focus`) or ticks them and opens Set a value on Markup (%). */
  command?: { kind: 'focus' | 'setMarkup' | 'match'; ids: string[]; n: number } | null
}) {
  const snackbar = useSnackbar()
  /* (pending modules S19 — 1.0's plan gating: Packages are Pro — "Save as package", "Add package", "Pick a package") My Sections are Pro: on
     Free saving one, picking one or adding one from the Price book opens the lock card; the sections already on a quote are its own lines */
  const sectionsLock = usePlanLock('package_creation')
  const router = useRouter()
  const { run, fail } = useRun()
  const { quoteId } = seed
  const costs = seed.costs !== false   // (pending modules S41b-1)
  /* ≤1024 the toolbar is one row (REG-354 / REG-384): the AI mark, Create as its icon and a kebab that folds the rest. */
  const compact = useMediaQuery(TABLET_DOWN)
  const variation = useVariation()   // (fix-G, G-13) a variation order's note names it; (gaps build B, item 7) its omissions

  /* ── state ── */
  const [items, setItems] = useState<QuoteItem[]>(seed.items)
  const [priceBook, setPriceBook] = useState<PriceBookItem[]>(seed.priceBook)
  const [priceBookSections, setPriceBookSections] = useState<PriceBookSection[]>(seed.priceBookSections)
  /* (REG-662, owner 2026-09-25) The price book opens as a modal over the editor — the Templates modal's way — from the strip's My Items and
     the table's *Price book*; the page itself is Company's, reached from the modal's footer. */
  const [bookOpen, setBookOpen] = useState<PriceBookTab | null>(null)
  const [seenBookTick, setSeenBookTick] = useState(bookTick)
  if (bookTick !== seenBookTick) { setSeenBookTick(bookTick); setBookOpen('items') }
  const [printAsOpen, setPrintAsOpen] = useState(false)   /* (REG-555) the bulk bar's Print as */
  /* (gaps build B, item 7 — 1.0 G-151) a variation order's *Omit from the contract*: the signed quote's lines, read when it opens */
  const [omit, setOmit] = useState<{ contract: string | null; lines: ContractLine[]; loading: boolean; busy: boolean } | null>(null)
  /* (sweep S1) a row's Print as › Custom word: the dialog opens on the word for that line — the selection is left alone */
  const [printAsFor, setPrintAsFor] = useState<{ ids: string[]; text: string | null; /** (S44I — M17) a section's own word */ section?: boolean } | null>(null)
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
  /* (Dane UAT 6.15) Back from a Preview opened while expanded: expanded again (read after mount — the server renders it collapsed). */
  useEffect(() => { const r = requestAnimationFrame(() => { if (takeExpanded(quoteId)) setExpanded(true) }); return () => cancelAnimationFrame(r) }, [quoteId])
  const previewNow = () => { if (!onPreview) return; if (expanded) rememberExpanded(quoteId); onPreview() }
  /* P in the expanded layer: the key layer stands down under any modal layer (the expanded card is one), so the card answers its own P
     — the same checks the layer makes: not while typing, not in a widget that owns its letters, not under a menu or another dialog, and
     never with the single-letter keys switched off (REG-711…717). */
  useEffect(() => {
    if (!expanded || !onPreview) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'p' || e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented || e.isComposing) return
      const t = e.target instanceof HTMLElement ? e.target : null
      if (t && (t.isContentEditable || t.matches('input:not([type="checkbox"]):not([type="radio"]):not([type="button"]), textarea, select') || t.closest('[data-kb-own]'))) return
      if (document.querySelector('[role="menu"], [role="listbox"]') || document.querySelectorAll('[role="dialog"]').length > 1 || !flagOn(SINGLE_KEYS)) return
      e.preventDefault(); markUsed('preview'); rememberExpanded(quoteId); onPreview()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [expanded, onPreview, quoteId])
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
  const [naming, setNaming] = useState<{ kind: 'room' | 'category' | 'section' | 'vendor'; itemId?: string } | null>(null)
  const [imageFor, setImageFor] = useState<QuoteItem | null>(null)
  const uploadedPictures = useRef<LeadFile[]>([])   // (pending modules S04) the pictures uploaded from Add Image, until the page reads the lead's Files again
  /* The Excel benchmark's phases 2 · 3 (REG-476 / REG-477): a pasted block waiting in the mapping dialog, the Set value dialog, the
     Export dialog and the Find text (sort by head was built and removed the same day, REG-483). */
  const [pasting, setPasting] = useState<{ text: string; anchorId: string | null; /** (S44I, B7) opened from a row or a foot: a box to type into, landing at `at` */ typed?: boolean; at?: { anchorId: string; value: 'before' | 'after' | 'start' } | { sectionId: string } } | null>(null)
  /* (pending modules S12) Match lines: the review of the lines not taken from My Items (match-book-dialog.tsx) */
  const [matchOpen, setMatchOpen] = useState(false)
  const [matchBusy, setMatchBusy] = useState(false)
  const [setValueOpen, setSetValueOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [seenExport, setSeenExport] = useState(exportTick)   // seeded with the current tick: a remount (Apply defaults reseeds the card) must not replay an old Export
  if (exportTick !== seenExport) { setSeenExport(exportTick); setExportOpen(true) }   // render-phase adjust (REG-538)
  /* (pending modules S04) Maison AI's command, once per `n` (render-phase adjust): the markup ticks its lines and opens Set a value; a line to see
     is scrolled to and pulsed once the table has drawn it (the effect below, which only scrolls) */
  const [seenCommand, setSeenCommand] = useState(command?.n ?? 0)
  const [goTo, setGoTo] = useState<{ ids: string[]; n: number } | null>(null)
  if (command && command.n !== seenCommand) {
    setSeenCommand(command.n)
    const known = command.ids.filter((id) => items.some((i) => i.id === id))
    if (command.kind === 'setMarkup') { if (known.length) { setSelected(new Set(known)); setSetValueOpen(true) } }
    else if (command.kind === 'match') setMatchOpen(true)   // (pending modules S12) Maison AI's "lines match items in My Items"
    else if (known.length) setGoTo({ ids: known, n: command.n })
  }
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
    try { const r = await orThrow(updateQuoteItem(id, p.patch)); onSaved(r.updatedAt, r.amountMinor) } catch { fail('save the item') }
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
  /* (S44I — S43D's NB-05, 1.0's 1fb5852ad) A snackbar's Undo takes back its own action only: snackbars stay (REG-898), and restoring the whole
     table as it was would silently drop an edit made since. Every edit counts here (a fold doesn't); an Undo pressed after another edit says
     so and leaves the table — ⌘Z still steps back through the history. */
  const editSeq = useRef(0)
  const ownUndo = (before: QuoteItem[]) => { const seq = editSeq.current; return () => { if (editSeq.current !== seq) { snackbar({ message: 'Couldn’t undo — the table changed since' }); return } void restore(before, true) } }
  const restore = async (next: QuoteItem[], undo: boolean) => {
    editSeq.current++
    discard()
    const cur = itemsRef.current
    setItems(next)
    setHistory((h) => (undo ? { past: h.past.slice(0, -1), future: [cur, ...h.future] } : { past: [...h.past, cur], future: h.future.slice(1) }))
    try { const r = await orThrow(replaceQuoteItems(quoteId, next)); onSaved(r.updatedAt, r.amountMinor); await reloadRef.current() } catch { fail(undo ? 'undo' : 'redo') }
  }
  const undo = () => { const prev = history.past.at(-1); if (prev) void restore(prev, true) }
  const redo = () => { const next = history.future[0]; if (next) void restore(next, false) }

  /* (REG-651, price book parity Q-02) The Add Item popover shows the price a pick lands at — the studio's step applied as the server applies it. */
  const shownBook = useMemo(() => (seed.roundStep ? priceBook.map((p) => ({ ...p, markupMinor: roundToStep(p.costMinor, p.markupMinor, seed.roundStep, p.unit) })) : priceBook), [priceBook, seed.roundStep])
  const patchItem = (id: string, patch: ItemPatch, opts: { snapshot?: boolean } = {}) => {
    /* (REG-584) The studio's rounding rule: a selling price typed or filled lands on the step — the markup absorbs it, Round Prices' own rule. */
    if (seed.roundStep && (patch.costMinor !== undefined || patch.markupMinor !== undefined)) { const cur = itemsRef.current.find((i) => i.id === id); if (cur && cur.kind === 'item') { const cost = patch.costMinor ?? cur.costMinor; patch = { ...patch, markupMinor: roundToStep(cost, patch.markupMinor ?? cur.markupMinor, seed.roundStep, patch.unit ?? cur.unit) } } }   // (REG-651) a rate stays as typed
    if (opts.snapshot !== false && !pending.current.size) snapshot()
    if (Object.keys(patch).some((k) => k !== 'collapsed')) editSeq.current++   // (NB-05) a fold is not an edit
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
  /* (S44I — row 335) A refused write (`{ error }` in words: the section gone, the item out of the book, a rule) reaches the snackbar with its
     reason and leaves no Undo step behind; a write that fails while the browser is offline says so. */
  const structural = async <T,>(what: string, fn: () => Promise<T>, done?: Parameters<typeof run>[2], drop?: Set<string>): Promise<{ ok: true; value: Exclude<T, Refusal> } | { ok: false }> => {
    snapshot()
    editSeq.current++
    let value: T | undefined
    let refused = false
    const ok = await run(what, async () => {
      try {
        await settle(drop); value = await fn()
        if (isRefusal(value)) { refused = true; await reload(); return value }   // the table catches up with what changed meanwhile
        await reload()
      } catch (e) { if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new Error('You’re offline right now'); throw e }
    }, done)
    if (refused) setHistory((h) => ({ ...h, past: h.past.slice(0, -1) }))
    return ok ? { ok: true, value: value as Exclude<T, Refusal> } : { ok: false }
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
      /* (Dane UAT, Jump to) a View-by bucket's title row is `bucket:<name>` */
      const row = first ? bodyRef.current?.querySelector<HTMLElement>(first.startsWith('bucket:') ? `[data-bucket="${CSS.escape(first.slice(7))}"]` : `[data-item-id="${CSS.escape(first)}"]`) ?? null : null
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
  /* (pending modules S04) Maison AI's row: every section folded over the line opens first (Jump to's rule), then the grid takes it to the line */
  const goToLines = (ids: string[]) => {
    const cur = itemsRef.current
    for (const id of ids) {
      let p = cur.find((i) => i.id === id)?.parentId ?? null
      const seen = new Set<string>()
      while (p && !seen.has(p)) { seen.add(p); const g = cur.find((i) => i.id === p); if (g?.collapsed) patchItem(g.id, { collapsed: false }, { snapshot: false }); p = g?.parentId ?? null }
    }
    if (collapsedBuckets.size) setCollapsedBuckets(new Set())
    attention(ids)
  }
  const goToRef = useRef(goToLines)
  useEffect(() => { goToRef.current = goToLines })
  useEffect(() => { if (goTo) goToRef.current(goTo.ids) }, [goTo])
  const openOmit = () => {
    closeMenus()
    setOmit({ contract: null, lines: [], loading: true, busy: false })
    void contractLinesFor(quoteId).then((r) => {
      if ('error' in r) { setOmit(null); snackbar({ message: couldnt('read the contract', refusalOf(r.error)) }); return }
      setOmit({ contract: r.contract, lines: r.lines, loading: false, busy: false })
    }, () => { setOmit(null); snackbar({ message: couldnt('read the contract') }) })
  }
  const addOmissions = async (ids: string[]) => {
    setOmit((o) => (o ? { ...o, busy: true } : o))
    const r = await structural('add the omissions', async () => { const x = await omitFromContract(quoteId, { ids }); if ('error' in x) throw new Error(x.error); onSaved(Date.now(), x.amountMinor); return x.ids }, `${ids.length} ${ids.length === 1 ? 'line' : 'lines'} omitted from the contract — each a credit you can still change`)
    if (r.ok) { setOmit(null); attention(r.value) } else setOmit((o) => (o ? { ...o, busy: false } : o))
  }
  /* (gaps build B, item 7 — 1.0 G-152) the bulk bar's Omit / Restore: a ticked line becomes a credit (a minus quantity) or an addition again */
  const signLines = (ids: string[], omitIt: boolean) => {
    const lines = itemsRef.current.filter((i) => ids.includes(i.id) && i.kind === 'item' && (omitIt ? i.qty > 0 : i.qty < 0))
    if (!lines.length) { snackbar({ message: omitIt ? 'The ticked lines are omissions already' : 'None of the ticked lines is an omission' }); return }
    const before = lines.map((i) => [i.id, i.qty] as const)
    snapshot()
    for (const i of lines) patchItem(i.id, { qty: omitIt ? -Math.abs(i.qty) : Math.abs(i.qty) }, { snapshot: false })
    setSelected(new Set())
    snackbar({ message: omitIt ? `${lines.length} ${lines.length === 1 ? 'line is' : 'lines are'} omitted — credits on the order` : `${lines.length} ${lines.length === 1 ? 'line is' : 'lines are'} additions again`, actionLabel: 'Undo', onAction: () => { for (const [id, qty] of before) patchItem(id, { qty }, { snapshot: false }) } })
  }
  /* (S44I, B10 — the team's sections prototype; call C4 as recommended) The line an add press just made, while its name holds the caret: Enter
     there keeps the name and opens the next line below it (the line's Category, Unit and Room carried), Enter or Esc on an untouched one
     takes it away and stops; everywhere else Enter walks the column (REG-475) and Esc drops the typing (REG-417). Focus leaving the name ends it. */
  const [chain, setChain] = useState<string | null>(null)
  const chainHandoff = useRef(false)
  useEffect(() => {
    if (!chain) return
    const onFocus = (e: FocusEvent) => {
      if (chainHandoff.current) return
      const t = e.target instanceof HTMLElement ? e.target : null
      if (t?.matches('input[data-name]') && t.closest(`[data-item-id="${CSS.escape(chain)}"]`)) return
      setChain(null)
    }
    document.addEventListener('focusin', onFocus)
    return () => document.removeEventListener('focusin', onFocus)
  }, [chain])
  const create = async (input: Parameters<typeof createQuoteItem>[1], focusName = false, opts: { chain?: boolean } = {}) => {
    chainHandoff.current = !!opts.chain
    const r = await structural('add the item', () => addQuoteItem(quoteId, input))
    if (r.ok) {
      attention([r.value.id], { focus: focusName })
      if (opts.chain && r.value.kind === 'item') { setChain(r.value.id); window.setTimeout(() => { chainHandoff.current = false }, 400) } else chainHandoff.current = false
    } else chainHandoff.current = false
  }
  const onChainKey = (item: QuoteItem, key: 'enter' | 'escape', value: string) => {
    if (chain !== item.id) return
    const typed = value.trim()
    const untouched = !typed || (typed === 'Item' && item.name === 'Item')
    if (untouched) {
      /* an untouched line goes, with no confirm (Undo still has it) — the caret goes back to the line above's name */
      setChain(null)
      const shown = flattenItems(itemsRef.current)
      const k = shown.findIndex((i) => i.id === item.id)
      const above = shown.slice(0, Math.max(0, k)).reverse().find((i) => i.kind === 'item')
      void structural('take the empty line away', async () => { const r = await orThrow(deleteQuoteItems([item.id])); if (r) onSaved(r.updatedAt, r.amountMinor) }, undefined, new Set([item.id])).then(() => {
        if (above) requestAnimationFrame(() => { const el = bodyRef.current?.querySelector<HTMLInputElement>(`[data-item-id="${CSS.escape(above.id)}"] input[data-name]`); if (el) { el.focus({ preventScroll: true }); const L = el.value.length; el.setSelectionRange(L, L) } })
      })
      return
    }
    if (key === 'escape') { setChain(null); (document.activeElement as HTMLElement | null)?.blur(); return }   // the name is kept (the blur commits it)
    chainHandoff.current = true
    ;(document.activeElement as HTMLElement | null)?.blur()   // commits the typed name
    void create({ parentId: item.parentId ?? null, afterId: item.id, category: item.category, unit: item.unit, room: item.room }, true, { chain: true })
  }

  /* ── (S44I, B6 · B7) where a row asked for new lines: before / after a line, at the top of a section, or (a foot) at the end of one ── */
  type RowPlace = { anchorId: string; value: 'before' | 'after' | 'start' } | { sectionId: string }
  const placeInput = (p: RowPlace | null): ItemsPlace => {
    if (!p) return {}
    if ('sectionId' in p) return { parentId: p.sectionId, at: 'end' }
    const a = itemsRef.current.find((i) => i.id === p.anchorId)
    if (!a) return {}
    if (p.value === 'start') return { parentId: a.id, at: 'start' }
    return p.value === 'before' ? { parentId: a.parentId ?? null, beforeId: a.id } : { parentId: a.parentId ?? null, afterId: a.id }
  }
  const placeWords = (p: RowPlace | null): string => {
    if (!p) return ''
    if ('sectionId' in p) return `at the end of “${items.find((i) => i.id === p.sectionId)?.name ?? 'the section'}”`
    const a = items.find((i) => i.id === p.anchorId)
    return p.value === 'start' ? `at the top of “${a?.name ?? 'the section'}”` : `${p.value === 'before' ? 'above' : 'below'} “${a?.name ?? 'the line'}”`
  }
  /** The place's own chips: Above · Below on a line, Above · At the top of the section on a section; a foot's place is fixed. */
  const placeControl = (p: RowPlace | null, set: (p: RowPlace) => void): PlaceControl | undefined => {
    if (!p) return undefined
    if ('sectionId' in p) return { kind: 'fixed', label: `Adds to the end of ${items.find((i) => i.id === p.sectionId)?.name ?? 'the section'}` }
    const a = items.find((i) => i.id === p.anchorId)
    const options = a?.kind === 'group' ? [{ value: 'before', label: 'Above' }, { value: 'start', label: 'At the top of the section' }] : [{ value: 'before', label: 'Above' }, { value: 'after', label: 'Below' }]
    return { kind: 'chips', options, value: p.value, onChange: (v) => set({ anchorId: p.anchorId, value: v as 'before' | 'after' | 'start' }) }
  }
  /** The top section a place sits in — a saved section lands right after it (REG-653 / sweep S5 #13). */
  const topOfPlace = (p: RowPlace | null): string | null => {
    if (!p) return null
    const id = 'sectionId' in p ? p.sectionId : p.anchorId
    let c = itemsRef.current.find((i) => i.id === id)
    for (let k = 0; c?.parentId && k < 4; k++) c = itemsRef.current.find((i) => i.id === c!.parentId)
    return c?.id ?? null
  }
  const [bookAt, setBookAt] = useState<RowPlace | null>(null)
  /* (REG-662) Everything ticked in the Price book modal, in the order ticked: items, then sections — one step for Undo (⌘Z, and the
     snackbar's Undo), every new row brought into view and pulsed. (UX audit Q7, extends REG-662) An item lands at the end of the quote's
     section for its trade — its Category against the section's name, "Carpentry" in "Carpentry Works" — else at the end of the quote; a
     saved section lands at the end. (S44I, B6) Opened from a row or a foot, everything lands at that place instead, in the order ticked —
     each after the one before — and a saved section right after the place's top section. */
  const addFromBook = async (pick: PriceBookPick): Promise<boolean> => {
    if (sectionsLock.locked && pick.some((x) => x.tab === 'sections')) { sectionsLock.open(); return false }
    const before = itemsRef.current.map((i) => ({ ...i }))
    const beforeIds = new Set(before.map((i) => i.id))
    const tops = before.filter((i) => i.kind === 'group' && !i.parentId)
    const at = bookAt
    const placed = pick.map((x) => {
      if (x.tab !== 'items' || at) return { x, parentId: null as string | null }
      const cat = priceBook.find((b) => b.id === x.id)?.category ?? null
      return { x, parentId: sectionForTrade(tops, cat)?.id ?? null }
    })
    const n = pick.filter((x) => x.tab === 'items').length, m = pick.length - n
    const into = [...new Set(placed.filter((p) => p.parentId).map((p) => tops.find((t) => t.id === p.parentId)?.name ?? ''))].filter(Boolean)
    const atEnd = placed.filter((p) => p.x.tab === 'items' && !p.parentId).length
    const what = n && m ? `${n} ${n === 1 ? 'item' : 'items'} and ${m} ${m === 1 ? 'section' : 'sections'}` : n ? `${n} ${n === 1 ? 'item' : 'items'}` : `${m} ${m === 1 ? 'section' : 'sections'}`
    const where = at ? ` — ${placeWords(at)}` : into.length ? ` — into ${into.length > 2 ? `${into.slice(0, 2).join(', ')} and ${into.length - 2} more` : into.join(' and ')}${atEnd ? `, ${atEnd} at the end` : ''}` : ''
    const r = await structural('add from the price book', async () => {
      let place: ItemsPlace = placeInput(at)
      for (const p of placed) {   // in the order ticked, across both tabs
        if (p.x.tab === 'items') {
          const made = await addQuoteItem(quoteId, at ? { priceBookItemId: p.x.id, parentId: place.parentId ?? null, ...(place.at ? { at: place.at } : {}), ...(place.beforeId ? { beforeId: place.beforeId } : {}), ...(place.afterId ? { afterId: place.afterId } : {}) } : { priceBookItemId: p.x.id, ...(p.parentId ? { parentId: p.parentId } : {}) })
          if (isRefusal(made)) throw new Error(made.error)
          if (at) place = { parentId: made.parentId ?? null, afterId: made.id }   // the next lands after this one
        } else await orThrow(insertPriceBookSection(quoteId, p.x.id, at ? { afterId: topOfPlace(at) } : {}))
      }
      /* a folded section that took a pick opens, so the new line is seen where it landed */
      const opened = at ? [placeInput(at).parentId].filter((x): x is string => !!x) : placed.map((p) => p.parentId).filter((x): x is string => !!x)
      for (const g of before.filter((t) => t.kind === 'group' && t.collapsed && opened.includes(t.id))) await orThrow(updateQuoteItem(g.id, { collapsed: false }))
    })
    if (r.ok) {
      setBookOpen(null); setBookAt(null); attention(beforeIds)
      snackbar({ message: `${what} added from the price book${where}`, actionLabel: 'Undo', onAction: ownUndo(before) })
    }
    return r.ok
  }
  /* (S44I, B5) ⋮ › Add Item › Several…: n blank lines in one write, the first ready to name, all pulsing, one ⌘Z */
  const addSeveral = (item: QuoteItem, n: number, where: 'above' | 'below') => {
    const place: ItemsPlace = where === 'above' ? { parentId: item.parentId ?? null, beforeId: item.id } : item.kind === 'group' ? { parentId: item.id, at: 'start' } : { parentId: item.parentId ?? null, afterId: item.id }
    if (item.kind === 'group' && where === 'below' && item.collapsed) patchItem(item.id, { collapsed: false }, { snapshot: false })
    const count = Math.max(2, Math.min(50, Math.round(n)))
    void structural('add the lines', () => addQuoteItems(quoteId, Array.from({ length: count }, () => ({ name: 'Item' })), place), `${count} lines added — name each one`).then((r) => { if (r.ok) attention(r.value.ids, { focus: true }) })
  }
  /* (S44I) A line made in a section that stands for a trade is filed under it — the rule a line moved in follows (Dane UAT 6.11, tradeOfSection) */
  const tradeIn = (section: QuoteItem): { category?: string } => { const t = tradeOfSection(section, seed.trades); return t ? { category: t } : {} }
  /* (S44I, B3) A section's foot: a line (it starts a chain, B10), a sub-section, the Price book or pasted lines — each last in the section */
  const onFoot = (section: QuoteItem, what: FootAdd) => {
    if (what === 'item') void create({ parentId: section.id, ...tradeIn(section) }, true, { chain: true })
    else if (what === 'sub') void structural('add the sub-section', () => addQuoteItem(quoteId, { kind: 'group', parentId: section.id })).then((r) => { if (r.ok) attention([r.value.id], { focus: true }) })
    else if (what === 'book') { setBookAt({ sectionId: section.id }); setBookOpen('items') }
    else { setPasting({ text: '', anchorId: null, typed: true, at: { sectionId: section.id } }) }
  }
  const removeItems = (list: string[]) => {
    const gone = new Set(list)
    for (const i of itemsRef.current) if (i.parentId && gone.has(i.parentId)) gone.add(i.id)
    return structural('remove', async () => { const r = await orThrow(deleteQuoteItems(list)); if (r) onSaved(r.updatedAt, r.amountMinor) }, list.length === 1 ? 'Item removed' : `${list.length} items removed`, gone)
  }

  /* ── the clipboard (REG-476, the Excel benchmark's phase 2) ── */
  const pasteAnchor = pasting?.anchorId ? items.find((i) => i.id === pasting.anchorId) ?? null : null
  /** The mapped lines land after the row the paste hit — inside a group when that row is one — or at the end. (S44I, B7) Opened from a
      row's ⋮ or a foot (`typed`: a box to type or paste into), they land at the place chosen there. */
  const addPasted = (lines: PasteLine[], place: 'after' | 'end') => {
    const a = place === 'after' ? pasteAnchor : null
    const at = pasting?.at ?? null
    setPasting(null)
    const before = new Set(itemsRef.current.map((i) => i.id))
    const where: ItemsPlace = at ? placeInput(at) : a ? (a.kind === 'group' ? { parentId: a.id } : { parentId: a.parentId ?? null, afterId: a.id }) : {}
    void structural('add the items', () => addQuoteItems(quoteId, lines, where), `${lines.length} ${lines.length === 1 ? 'item' : 'items'} added${at ? ` ${placeWords(at)}` : ''}`).then((r) => { if (r.ok) attention(r.value.ids.length ? r.value.ids : before) })
  }
  /** Bulk Copy · Cmd+C: the ticked rows as a sheet's rows (a header, tab-separated), so they paste straight into Excel. */
  const copyRows = (ids: string[]) => {
    const rows = exportRows(itemsRef.current, new Set(ids)).map((r) => exportCells(r, costs))   // (pending modules S41b-1) no Cost · Markup for a member who doesn't see costs
    if (!rows.length) return
    void copyText(toTsv([exportCells([...EXPORT_HEAD], costs), ...rows])).then(() => snackbar({ message: `${rows.length} ${rows.length === 1 ? 'row' : 'rows'} copied — paste them into a sheet` }), () => fail('copy the rows'))
  }
  /** Export As → the house Export dialog (the leads' and the tasks' one, REG-478): every line in table order with the groups' sums,
      as CSV · XLS · XLSX · PDF from the one writer (lib/leads/export.ts). Money prints with its two decimals. */
  const downloadItems = (format: ExportFormat) => {
    const body = exportRows(itemsRef.current).map((r) => exportCells(r.map((c, i) => (c === null ? '' : typeof c === 'number' ? (EXPORT_MONEY_COLS.includes(i) ? c.toFixed(2) : String(c)) : c)), costs))   // (pending modules S41b-1)
    return downloadBlob(buildTable('OpenMaison — Items', exportCells([...EXPORT_HEAD], costs), body, format), `${seed.number ?? 'quote'}-items.${format.toLowerCase()}`)
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
      case 'vendor': return line ? { vendor: src.vendor } : null   // (REG-623)
      case 'website': return line ? { link: src.link } : null
      case 'name': return { name: src.name, nameHtml: src.nameHtml }   // (S44I — C2) a formatted name fills with its formatting
      case 'desc': return { description: src.description }
      default: return null
    }
  }
  /* (S45C — S43D's NB-07 (c); as recommended — his ask 2026-10-17) A run of two or more cells continues as Excel's fill handle does: numbers
     go on by their step (1, 2 → 3, 4 …; above the run, back the other way), anything else repeats in turn (lib/quotes/fill-series.ts). Each
     column reads and writes in its own unit and keeps its own bounds — what typing in the cell allows. */
  const runValue = (col: string, i: QuoteItem): FillValue => {
    const line = i.kind === 'item'
    switch (col) {
      case 'qty': return line ? i.qty : null
      case 'cost': return line ? i.costMinor : null
      case 'markup': return line ? i.markupMinor : null
      case 'unitPrice': return line ? unitPriceMinor(i) : null
      case 'discount': return line ? i.discountPct : null
      case 'gst': return line ? i.gstPct : null
      case 'rebate': return line ? i.rebateMinor : null
      case 'unit': return line ? i.unit : null
      case 'room': return i.room
      case 'category': return i.category
      case 'section': return i.section
      case 'vendor': return line ? i.vendor : null
      case 'website': return line ? i.link : null
      default: return null
    }
  }
  const seriesPatch = (col: string, v: FillValue, t: QuoteItem): ItemPatch | null => {
    const line = t.kind === 'item'
    const n = typeof v === 'number' ? v : null
    const s = typeof v === 'string' ? v : null
    const minor = n === null ? null : Math.round(n)
    switch (col) {
      case 'qty': return line && n !== null ? { qty: variation ? Math.max(-1_000_000, Math.min(1_000_000, n)) : Math.max(0, Math.min(1_000_000, n)) } : null   // a variation order's omission keeps its minus
      case 'cost': return line && minor !== null ? { costMinor: Math.max(0, minor), markupMinor: Math.max(-Math.max(0, minor), t.markupMinor) } : null
      case 'markup': return line && minor !== null ? { markupMinor: Math.max(-t.costMinor, minor) } : null
      case 'unitPrice': return line && minor !== null ? { markupMinor: Math.max(-t.costMinor, Math.max(0, minor) - t.costMinor) } : null
      case 'discount': return line && n !== null ? { discountPct: Math.max(0, Math.min(100, n)) } : null
      case 'gst': return line && n !== null ? { gstPct: Math.max(0, Math.min(100, n)) } : null
      case 'rebate': return line && minor !== null ? { rebateMinor: Math.max(0, minor) } : null
      case 'unit': return line ? { unit: s } : null
      case 'room': return { room: s }
      case 'category': return { category: s }
      case 'section': return { section: s }
      case 'vendor': return line ? { vendor: s } : null
      case 'website': return line ? { link: s } : null
      default: return null
    }
  }
  /** How a series' step reads in its snackbar: money as money, a percentage with its sign, a quantity as it is. */
  const stepWords = (col: string, step: number): string => {
    const a = Math.abs(step)
    return col === 'cost' || col === 'markup' || col === 'unitPrice' || col === 'rebate' ? money2(a) : col === 'discount' || col === 'gst' ? pct(a) : String(a)
  }
  /** Drag-fill released / Cmd+D: one snapshot, then every target patched (and autosaved) like a cell edit. With `series` — the cells selected
      down the column (`run`, top to bottom, as the table shows them) and the rows the drag reached below and above it, nearest first — the
      targets continue the run's series (S45C). */
  const fillDown = (col: string, sourceId: string, targetIds: string[], series?: FillSeries) => {
    const cur = itemsRef.current
    const byId = new Map(cur.map((i) => [i.id, i]))
    let patches: (readonly [string, ItemPatch])[]
    let step: number | null = null
    const seeds = (series?.run ?? []).map((id) => byId.get(id)).filter((i): i is QuoteItem => !!i)
    if (series && seeds.length >= 2) {
      const { below, above } = series
      const fill = seriesFill(seeds.map((i) => runValue(col, i)), below.length, above.length)
      step = fill.step
      patches = [...below.map((id, k) => [id, fill.below[k] ?? null] as const), ...above.map((id, k) => [id, fill.above[k] ?? null] as const)]
        .flatMap(([id, v]) => { const t = byId.get(id); const p = t ? seriesPatch(col, v, t) : null; return p ? [[id, p] as const] : [] })
    } else {
      const src = byId.get(sourceId)
      if (!src) return
      patches = targetIds.flatMap((id) => { const t = byId.get(id); const p = t ? fillPatch(col, src, t) : null; return p ? [[id, p] as const] : [] })
    }
    if (!patches.length) return
    snapshot()
    for (const [id, p] of patches) patchItem(id, p, { snapshot: false })
    const cells = `${patches.length} ${patches.length === 1 ? 'cell' : 'cells'} filled`
    snackbar({ message: step ? `${cells} — counting ${step > 0 ? 'up' : 'down'} by ${stepWords(col, step)}` : cells })   // (S45C) the step said (invented copy)
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
        : field === 'discount' ? { discountPct: n } : field === 'gst' ? { gstPct: n } : field === 'room' ? { room: str } : field === 'category' ? { category: str } : field === 'section' ? { section: str }
        : field === 'vendor' ? (t.kind === 'item' ? { vendor: str } : null) : null
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
        if (e.defaultPrevented || !t?.hasAttribute('data-edit') || e.shiftKey) return   // (S45C) a run's ⌘D was the table's (items-table.tsx)
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
      void create(first ? { parentId: item.id, beforeId: first.id, ...tradeIn(item) } : { parentId: item.id, ...tradeIn(item) }, true, { chain: true })
    } else void create({ parentId: item.parentId ?? null, afterId: item.id }, true, { chain: true })   // (S44I, B10) an add press starts a chain
  }
  /* (REG-653, price book parity Q-09) Save to My Items: a new entry (a Designer's is proposed) or, on a line from an item, that item updated from
     the line — named in the menu, never a silent copy — each with Undo on its snackbar. The line points at what it was saved as. */
  const linkLine = (id: string, bookId: string | null) => setItems((cur) => cur.map((i) => (i.id === id ? { ...i, priceBookItemId: bookId } : i)))
  const saveToBook = async (item: QuoteItem, mode: 'new' | 'update') => {
    const box: { r: SavedToBook | null } = { r: null }
    /* (wave E, E7) a refusal answered as `{ error }` — the rule ("only an Owner or an Admin changes the price book") reaches the snackbar */
    if (!(await run(mode === 'update' ? 'update the item' : 'save to My Items', async () => { const a = await saveItemToPriceBook(item.id, mode); if (isRefusal(a)) return a; box.r = a })) || !box.r) return
    const r = box.r
    setPriceBook((b) => [...b.filter((p) => p.id !== r.item.id), r.item].sort((a, c) => a.name.localeCompare(c.name)))
    linkLine(item.id, r.item.id)
    const undo = () => { void run('undo the save', async () => {
      const u = await undoSaveToPriceBook(item.id, { mode: r.mode, itemId: r.item.id, prevLink: r.prevLink, previous: r.previous }); if (isRefusal(u)) return u
      if (r.mode === 'update' && r.previous) { const prev = r.previous; setPriceBook((b) => b.map((p) => (p.id === prev.id ? prev : p))) }
      else { setPriceBook((b) => b.filter((p) => p.id !== r.item.id)); linkLine(item.id, r.prevLink) }
    }, r.mode === 'update' ? `${r.item.name} is back as it was` : 'Taken back out of My Items') }
    snackbar({ message: r.mode === 'update' ? `${r.item.name} updated in My Items — new picks take this line’s figures` : r.item.status === 'proposed' ? 'Proposed to My Items — an Owner or an Admin approves it before the studio uses it' : 'Saved to My Items as a new item', actionLabel: 'Undo', onAction: undo })
  }
  /* (S44I, B6 — REG-653's rule, REG-662's surface) ⋮ › Add Item › From Price book… opens the Price book modal with this row's place: Below a
     line (Above beside it), At the top of a section (Above beside it); a pick lands there. */
  const askFromBook = (item: QuoteItem) => {
    if (item.kind === 'group' && item.collapsed) patchItem(item.id, { collapsed: false })
    setBookAt({ anchorId: item.id, value: item.kind === 'group' ? 'start' : 'after' }); setBookOpen('items')
  }
  /* (S44I, B7) ⋮ › Add Item › Paste lines…: the box to type or paste into, landing below this line (Above beside it) / at the top of a section */
  const askPaste = (item: QuoteItem) => setPasting({ text: '', anchorId: null, typed: true, at: { anchorId: item.id, value: item.kind === 'group' ? 'start' : 'after' } })
  const onMenu = (item: QuoteItem, action: RowMenuAction) => {
    switch (action) {
      /* (REG-652, price book parity Q-04) A Designer's save is a proposal: on their quotes at once, approved by an Owner or an Admin. */
      case 'library': void saveToBook(item, 'new'); break
      case 'libraryUpdate': void saveToBook(item, 'update'); break
      case 'addFromBook': case 'addFromBookHere': askFromBook(item); break
      case 'pasteHere': askPaste(item); break
      case 'addSub': if (item.collapsed) patchItem(item.id, { collapsed: false }); void structural('add the sub-section', () => addQuoteItem(quoteId, { kind: 'group', parentId: item.id }), 'Sub-section added').then((r) => { if (r.ok) attention([r.value.id], { focus: true }) }); break   /* (S44I, B3) */
      case 'saveSection': if (sectionsLock.locked) { sectionsLock.open(); break } void run('save the section to My Sections', async () => { const p = await saveSectionToPriceBook(item.id); if (isRefusal(p)) return p; setPriceBookSections((b) => [...b, p].sort((a, c) => a.name.localeCompare(c.name))) }, 'Section saved to My Sections — find it in the Add Item box'); break   /* REG-566 · (REG-653, Q-18) the book's own names */
      case 'noNumber': patchItem(item.id, { noNumber: !item.noNumber }); snackbar({ message: item.noNumber ? 'The line is numbered again' : 'The line prints without a number' }); break   /* REG-558 */
      case 'ungroup': void structural('ungroup the section', async () => { const r = await orThrow(ungroupQuoteItem(item.id)); onSaved(r.updatedAt, r.amountMinor) }, 'Section removed — its lines stay. Undo with ⌘Z'); break   /* REG-558 */
      case 'subtotalLabel': setLabelling(item); break   /* REG-555 (T-3) */
      case 'subtotalClear': { const was = item.printAsText; patchItem(item.id, { printAsText: null }); snackbar({ message: 'Sub-total label removed', actionLabel: 'Undo', onAction: () => patchItem(item.id, { printAsText: was }) }); break }
      case 'oneLine': patchItem(item.id, { printOneLine: !item.printOneLine }); snackbar({ message: item.printOneLine ? 'The section prints every line again' : 'The section prints as one line — its name and its total; the lines stay yours' }); break   /* REG-585 */
      /* (S44T — call C1) a top section's work priced after the contract: out of the total and the split, gathered at the end of the table */
      case 'pricedAfter': { const on = !item.pricedAfter; void structural(on ? 'price the section after the contract' : 'price the section with the contract', async () => { const r = await setSectionPricedAfter(item.id, on); if ('error' in r) throw new Error(r.error); onSaved(r.updatedAt, r.amountMinor) }, on ? `${item.name} is priced after the contract — out of the total, printed after the items` : `${item.name} is priced with the contract again`).then((r) => { if (r.ok) attention([item.id]) }); break }
      case 'description': break   /* the row opens its own dialog (item-row.tsx) */
      case 'comment': onOpenComments?.(item.id); break   /* (REG-627) */
      case 'duplicate': void structural('duplicate the item', () => duplicateQuoteItem(item.id), 'Item duplicated').then((r) => { if (r.ok) attention([r.value.id]) }); break
      case 'copyName': void copyText(item.name).then(() => snackbar({ message: 'Name copied' }), () => fail('copy the name')); break
      case 'group': { const list = selected.has(item.id) && selected.size > 1 ? [...selected] : [item.id]; createGroup(list); break }
      case 'showFull': setShowFull((s) => { const n = new Set(s); if (n.has(item.id)) n.delete(item.id); else n.add(item.id); return n }); break
      case 'optional': patchItem(item.id, { optional: !item.optional }); snackbar({ message: item.optional ? 'Optional mark cleared' : 'Marked as optional — printed in its own section, out of the totals' }); break   /* REG-492 */
      case 'addAbove': void create({ parentId: item.parentId ?? null, beforeId: item.id }, true, { chain: true }); break
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
    const before = cur.map((i) => ({ ...i }))
    const target = slot.parentId
    const sibs = cur.filter((i) => (i.parentId ?? null) === target && i.id !== id).sort((x, y) => x.position - y.position).map((i) => i.id)
    let at = 0
    if (slot.anchorId?.startsWith('bucket:')) {
      /* (Dane UAT) dropped on a View-by › Category title: the bucket's first place — before its first top-level row, else at the end */
      const key = slot.anchorId.slice(7)
      const firstIn = cur.filter((i) => !i.parentId && i.id !== id && (i.category || UNLABELLED.category) === key).sort((x, y) => x.position - y.position)[0]
      at = firstIn ? Math.max(0, sibs.indexOf(firstIn.id)) : sibs.length
    } else if (slot.where === 'end') at = sibs.length   // (S44I, B4) dropped on a section's foot: its last place
    else if (slot.where !== 'inside') { const k = sibs.indexOf(slot.anchorId ?? ''); if (k < 0) return; at = k + (slot.where === 'after' ? 1 : 0) }
    sibs.splice(at, 0, id)
    const from = a.parentId ?? null
    const moved = from !== target
    const host = target ? cur.find((i) => i.id === target) ?? null : null
    const status = moved && host ? host.status : a.status   // a line joining a section carries its answer (setQuoteItemParent's rule)
    const under = moved ? descendantIds(cur, [id]) : new Set<string>()
    const fromSibs = cur.filter((i) => (i.parentId ?? null) === from && i.id !== id).sort((x, y) => x.position - y.position).map((i) => i.id)
    /* (Dane UAT 6.11 · Figma 1549:34 pt 3) A line's category follows where it lands: into a section that stands for a trade (its own Category,
       or a studio trade by name — tradeOfSection) it takes that trade, so a template that prints by trade files it there; dropped at the top
       of another View-by › Category bucket it takes that bucket's. Said with Undo, which takes the whole move back, as ⌘Z does. */
    const trade = moved && host && a.kind === 'item' ? tradeOfSection(host, seed.trades) : null
    const recat: { category: string | null } | null = trade && trade !== a.category ? { category: trade }
      : !host && a.kind === 'item' && slot.bucket !== undefined && view === 'category' ? { category: slot.bucket === UNLABELLED.category ? null : slot.bucket ?? null } : null
    const recatChanged = !!recat && recat.category !== a.category
    snapshot()
    setItems((c) => c.map((i) => {
      if (i.id === id) return { ...i, parentId: target, position: sibs.indexOf(id), status, ...(recatChanged ? recat : {}) }
      if ((i.parentId ?? null) === target) return { ...i, position: sibs.indexOf(i.id) }
      if (moved && (i.parentId ?? null) === from) return { ...i, position: fromSibs.indexOf(i.id) }
      if (moved && under.has(i.id)) return { ...i, status }
      return i
    }).sort((x, y) => x.position - y.position))   // the array stays in position order, as the store hands it out
    attention([id])
    editSeq.current++
    const said = (): Parameters<typeof snackbar>[0] | null => { const undo = { actionLabel: 'Undo', onAction: ownUndo(before) }; return recatChanged && recat
      ? (host ? { message: `Moved into “${host.name}” — its category is now ${recat.category}`, ...undo } : { message: `Moved to ${recat.category ?? UNLABELLED.category}`, ...undo })
      : moved ? { message: host ? `Moved into “${host.name}”` : 'Moved out of the section' } : null }
    void run('move the line', async () => {
      await settle()
      try {
        if (moved) await orThrow(setQuoteItemParent(id, target))
        if (recatChanged && recat) { const c = await orThrow(updateQuoteItem(id, recat)); onSaved(c.updatedAt, c.amountMinor) }
        const r = await orThrow(reorderQuoteItems(quoteId, target, sibs))
        onSaved(r.updatedAt, r.amountMinor)
      } catch (e) { await reload(); throw e }
    }).then((done) => { const m = done ? said() : null; if (m) snackbar(m) })   // (NB-05) the Undo is armed once the move has landed
  }
  /* (S44I, B4 — the team's sections prototype) A ticked line dragged with the others ticked: every one moves in one write, in the table's order,
     to the slot (one ⌘Z, and the snackbar's Undo, put them all back). */
  const commitDragMany = (ids: string[], slot: DropSlot) => {
    const cur = itemsRef.current
    const before = cur.map((i) => ({ ...i }))
    const host = slot.parentId ? cur.find((i) => i.id === slot.parentId) ?? null : null
    const to: MoveTarget = slot.where === 'end' ? { parentId: slot.parentId, at: 'end' } : slot.where === 'inside' ? { parentId: slot.parentId, at: 'start' }
      : slot.where === 'before' ? { parentId: slot.parentId, beforeId: slot.anchorId } : { parentId: slot.parentId, afterId: slot.anchorId }
    const n = carriedOf(cur, ids).length
    void structural('move the lines', async () => { const r = await moveQuoteItems(quoteId, ids, to); if (isRefusal(r)) return r; onSaved(r.updatedAt, r.amountMinor) })
      .then((r) => { if (!r.ok) return; attention(ids); snackbar({ message: host ? `${n} ${n === 1 ? 'line' : 'lines'} moved into “${host.name}”` : `${n} ${n === 1 ? 'line' : 'lines'} moved`, actionLabel: 'Undo', onAction: ownUndo(before) }) })
  }
  /* (S44I, B8) The bulk bar's Move to section: the ticked rows join a section (last in it), or each steps out just after its own section. */
  const moveTicked = (to: { sectionId: string } | 'out') => {
    const cur = itemsRef.current
    const ids = carriedOf(cur, [...selected])
    const before = cur.map((i) => ({ ...i }))
    const host = to === 'out' ? null : cur.find((i) => i.id === to.sectionId) ?? null
    const n = ids.length
    void structural('move the lines', async () => { const r = await moveQuoteItems(quoteId, ids, to === 'out' ? 'out' : { parentId: to.sectionId, at: 'end' }); if (isRefusal(r)) return r; onSaved(r.updatedAt, r.amountMinor) })
      .then((r) => {
        if (!r.ok) return
        setSelected(new Set()); if (host?.collapsed) patchItem(host.id, { collapsed: false }, { snapshot: false }); attention(ids)
        snackbar({ message: host ? `${n} ${n === 1 ? 'line' : 'lines'} moved into “${host.name}”` : `${n} ${n === 1 ? 'line' : 'lines'} moved out of their sections`, actionLabel: 'Undo', onAction: ownUndo(before) })
      })
  }
  /* (Dane UAT, Figma 1549:34 pt 1) The "+" on a View-by › Category title: a new line in that category, first in the bucket — as a section's
     "+" puts it first in the section — with its name ready to type (REG-573). A folded bucket opens. */
  const addToBucket = (key: string) => {
    setCollapsedBuckets((cb) => { if (!cb.has(key)) return cb; const n = new Set(cb); n.delete(key); return n })
    const first = itemsRef.current.filter((i) => !i.parentId && (i.category || UNLABELLED.category) === key).sort((x, y) => x.position - y.position)[0]
    void create({ parentId: null, category: key === UNLABELLED.category ? null : key, ...(first ? { beforeId: first.id } : {}) }, true, { chain: true })   // (S44I, B10) an add press
  }

  /* ── quote-level ── */
  const changePricing = (patch: Partial<Pricing>) => {
    /* (REG-593) An entity that is not GST-registered turns GST off with it — said, never silent. */
    if (patch.issuingEntity !== undefined && patch.gstEnabled !== undefined && patch.gstEnabled !== pricing.gstEnabled) snackbar({ message: `GST ${patch.gstEnabled ? 'on' : 'off'} — ${patch.issuingEntity ?? seed.studio.name} is ${patch.gstEnabled ? '' : 'not '}GST-registered` })
    const next = { ...pricing, ...patch }
    // The value shown is the value applied: % ≤ 100, S$ ≤ the subtotal (REG-417) — the server holds the same bound.
    const max = maxAdditional(next.additionalDiscountMode, totals.subtotalMinor)
    if (next.additionalDiscountValue > max) { next.additionalDiscountValue = Number(max.toFixed(2)); patch = { ...patch, additionalDiscountValue: next.additionalDiscountValue } }
    const prev = pricing
    setPricing(next)
    /* (S44I — NB-06) a refused change (the entity a project bills from) puts the value back and says why — the house rule for an optimistic write */
    void run('save the totals', async () => { const r = await updateQuotePricing(quoteId, patch); if (isRefusal(r)) { setPricing(prev); return r } onSaved(r.updatedAt, r.amountMinor) })
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
  /* (pending modules S12 — card held:price-book, 1.0's auto-match) Match lines: the lines not taken from My Items, read against the book the member
     may pick (lib/company/price-book-match.ts). The link beside *Price book* shows only while some line matches an item; Maison AI opens the
     review too (and for lines no item matches). Apply writes the ticked matches and the new entries in one go — one step for ⌘Z — and its
     snackbar's Undo puts the lines back and takes the new entries out of My Items again. */
  const bookPlan = useMemo(() => planBookMatches(items, priceBook), [items, priceBook])
  const applyMatch = async (o: { matches: { lineId: string; itemId: string }[]; add: string[] }) => {
    if (matchBusy) return
    setMatchBusy(true)
    const before = itemsRef.current.map((i) => ({ ...i }))
    const box: { r: Awaited<ReturnType<typeof matchQuoteLinesToBook>> | null } = { r: null }
    const res = await structural(o.add.length && !o.matches.length ? 'add the lines to My Items' : 'match the lines', async () => { const r = await matchQuoteLinesToBook(quoteId, o); box.r = r; if (isRefusal(r)) throw new Error(r.error); onSaved(r.updatedAt, r.amountMinor) })
    setMatchBusy(false)
    const r = box.r
    if (!res.ok || !r || isRefusal(r)) return
    setMatchOpen(false)
    const added = r.added
    if (added.length) setPriceBook((b) => [...b.filter((p) => !added.some((a) => a.id === p.id)), ...added].sort((a, c) => a.name.localeCompare(c.name)))
    const proposed = added.some((a) => a.status === 'proposed')
    const said = [r.matched ? `${r.matched} ${r.matched === 1 ? 'line took its' : 'lines took their'} cost from My Items` : null,
      added.length ? `${added.length} ${proposed ? 'proposed for' : 'added to'} My Items` : null].filter(Boolean).join(' · ')
    const matchSeq = editSeq.current   // (NB-05) the Undo takes back the match only while nothing changed since
    snackbar({ key: 'match-lines', message: said, actionLabel: 'Undo', onAction: () => { if (editSeq.current !== matchSeq) { snackbar({ key: 'match-lines', message: 'Couldn’t undo — the table changed since' }); return } void (async () => {
      await restore(before, true)
      let stayed: string[] = []
      if (added.length) { const ok = await run('take the new items back out', async () => { const u = await undoBookAdds({ added: added.map((a) => a.id) }); if (isRefusal(u)) return u; stayed = u.keptIds }); if (ok) setPriceBook((b) => b.filter((p) => stayed.includes(p.id) || !added.some((a) => a.id === p.id))) }
      /* an entry another quote line took meanwhile stays in My Items — said, never silently */
      snackbar({ key: 'match-lines', message: stayed.length ? `Match undone — ${stayed.length} ${stayed.length === 1 ? 'entry stays' : 'entries stay'} in My Items, another line takes from ${stayed.length === 1 ? 'it' : 'them'}` : 'Match undone' })
    })() } })
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
  /* (one-home N-16) The vendor directory (Company › Finance › Vendors): the Vendor/Sub cell, the phone's sheet and Set value pick from it. A name
     it doesn't hold goes into it (F1-Q4: anyone adds a vendor) and onto the line; refused, the line keeps it as typed and the snackbar says why. */
  const vendorDir = useVendorDirectory(true)
  const addVendor = async (typed: string, itemId?: string) => {
    const name = typed.trim()
    if (!name) return
    const known = findVendor(vendorDir.list ?? [], name)
    if (known) { if (itemId) patchItem(itemId, { vendor: known.name }); return }
    if (itemId) patchItem(itemId, { vendor: name })   // the line takes it at once, as typed
    try {
      const r = await vendorDir.add(name)
      if ('error' in r) { snackbar({ message: couldnt('add the vendor', refusalOf(r.error)) }); return }
      if (itemId && r.vendor.name !== name) patchItem(itemId, { vendor: r.vendor.name }, { snapshot: false })
      snackbar({ message: `${r.vendor.name} is in the directory` })
    } catch (e) { snackbar({ message: couldnt('add the vendor', refusalOf(e)) }) }
  }
  const usedLabels = useMemo(() => ({
    rooms: oneCase([...labels.rooms, ...items.map((i) => i.room).filter((x): x is string => !!x)]),
    categories: inSavedOrder(oneCase([...seed.trades, ...labels.categories, ...items.map((i) => i.category).filter((x): x is string => !!x)]), labels.categoryOrder),   // (REG-561) the studio's trades first · (Dane UAT) the quote's own order once its buckets were dragged
    sections: oneCase([...labels.sections, ...items.map((i) => i.section).filter((x): x is string => !!x)]),
    /* (S44I — M9) the studio's units first, then the units this quote's lines carry; (row 290) the trades a section's name offers */
    units: oneCase([...(seed.units?.length ? seed.units : UNITS), ...items.map((i) => i.unit).filter((x): x is string => !!x)]),
    trades: seed.trades,
    gstPct: seed.studio.gstPct,   // (NB-07 (b))
    /* (REG-623, parity Q-08) (one-home N-16) Company › Finance › Vendors first — the one vendor list — then the names this quote's lines
       carry that the directory doesn't hold (kept as typed); My Items' and the quote's own vendor lists are gone. */
    vendors: [...new Set([...(vendorDir.list ?? []).map((v) => v.name), ...items.map((i) => i.vendor).filter((x): x is string => !!x && !findVendor(vendorDir.list ?? [], x))])],
    tradeNotes: seed.tradeNotes,
  }), [items, labels, seed.trades, seed.tradeNotes, seed.units, seed.studio.gstPct, vendorDir.list])
  /* (S44I — M14, UAT rows 249 · 264 · 340 · 341; as recommended, his ask 2026-10-15) One name per label on a quote: a label added that matches
     one already here (the studio's trades included) in any case is that one — "carpentry" picks "Carpentry" — and the menus list each once.
     Returns the spelling the line takes. */
  const addLabel = (kind: 'room' | 'category' | 'section' | 'vendor', name: string): string => {
    const key = kind === 'room' ? 'rooms' : kind === 'category' ? 'categories' : kind === 'vendor' ? 'vendors' : 'sections'
    const known = (kind === 'vendor' ? labels.vendors : usedLabels[key]).find((x) => x.trim().toLowerCase() === name.trim().toLowerCase())
    if (known) { if (known !== name) snackbar({ message: `Already on this quote as “${known}” — the line takes it` }); return known }
    const next = { ...labels, [key]: [...labels[key], name] }
    setLabels(next); savePrefs({ itemsLabels: next })
    return name
  }
  const bucketKeys = useMemo(() => {
    if (view === 'none') return []
    const list = view === 'room' ? usedLabels.rooms : view === 'category' ? usedLabels.categories : usedLabels.sections
    return [...new Set([...list, view === 'category' ? 'Uncategorized' : 'Unassigned'])]
  }, [view, usedLabels])
  /* (Dane UAT, Figma 1549:34 pt 4) A bucket dragged by its handle: the quote keeps the new order (its Items labels, as the sections keep
     theirs); Uncategorized stays last. */
  const moveBucket = (key: string, anchor: string, where: 'before' | 'after') => {
    const order = bucketKeys.filter((k) => k !== UNLABELLED.category && k !== key)
    const k = order.indexOf(anchor)
    if (anchor === UNLABELLED.category) order.push(key)
    else if (k >= 0) order.splice(k + (where === 'after' ? 1 : 0), 0, key)
    else return
    const next = { ...labels, categoryOrder: order }
    setLabels(next); savePrefs({ itemsLabels: next })
    attention([`bucket:${key}`])
  }
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
  /* (REG-596) The Rebate column exists for Owners alone: a designer never sees it, in the table or in Column settings.
     (pending modules S41b-1) Cost, Markup and Margin exist only for a member who sees costs — the member's own column choice is kept. */
  const visibleColumns = columns.columns.filter((c) => c.on && (c.key !== 'gst' || pricing.gstEnabled) && (c.key !== 'rebate' || isOwner) && (costs || !COST_COLUMNS.includes(c.key))).map((c) => c.key) as ColumnKey[]
  const selectedList = [...selected]
  /* (S44I, B8) what the bulk bar's Group into makes, where Move to section may go, and whether Out of the section applies */
  const [bulkMenu, setBulkMenu] = useState<'move' | 'highlight' | null>(null)
  const bulkAnchor = useRef<HTMLElement | null>(null)
  const bulkLevel = groupLevel(items, selectedList)
  const bulkTargets = useMemo(() => moveTargets(items, selected), [items, selected])
  const bulkAllInside = selected.size > 0 && carriedOf(items, selected).every((id) => !!items.find((i) => i.id === id)?.parentId)
  const nextNumber = items.filter((i) => !i.parentId).length + 1
  const owner = seed.me?.role === 'Owner'
  /* (REG-573) the new section is brought into view and named at once. (S44I, B8) Lines that share a section make a sub-section there; lines
     that share a sub-section are refused with the rule (said, nothing moves); the snackbar names what was made. */
  const createGroup = (ids: string[] = selectedList) => {
    const lvl = groupLevel(itemsRef.current, ids)
    if (typeof lvl === 'object') { snackbar({ message: couldnt('put the lines in a section', lvl.refused) }); return }
    void structural('create the section', () => groupQuoteItems(quoteId, ids), lvl === 'sub-section' ? 'Sub-section created' : 'Section created').then((r) => { if (r.ok) attention([r.value.id], { focus: true }) })
    setSelected(new Set())
  }
  /* (REG-555 · REG-556) Print as and Highlight from the row menu and the bulk bar: cell-like patches, one snapshot for a run. */
  const setPrintAs = (ids: string[], v: PrintAs | null, text: string | null = null, withSections = false) => {
    /* (S44I — M17, UAT row 323) a section prints a word in place of its amount too (its lines print none, and leave the totals); a section's
       word sits where its sub-total's label did, so the label it had comes back with Undo */
    const all = itemsRef.current.filter((i) => ids.includes(i.id))
    const sections = withSections ? all.filter((i) => i.kind === 'group' && v !== 'behalf') : []   // a section's word comes from its own row — the bulk bar's Print as stays the lines'
    const targets = [...all.filter((i) => i.kind === 'item'), ...sections]
    if (!targets.length) return
    const before = targets.map((t) => [t.id, { printAs: t.printAs, printAsText: t.printAsText }] as const)
    snapshot()
    for (const t of targets) patchItem(t.id, t.kind === 'group' ? { printAs: v, printAsText: v === 'custom' ? text ?? (t.printAs === 'custom' ? t.printAsText : null) : t.printAs === 'custom' ? null : t.printAsText } : { printAs: v, printAsText: v === 'custom' ? text ?? t.printAsText : null }, { snapshot: false })
    const one = targets.length === 1, sec = one && targets[0]!.kind === 'group'
    const who = sec ? `${targets[0]!.name} prints` : one ? 'The line prints' : `${targets.length} rows print`
    snackbar({ message: v ? `${who} as ${v === 'custom' ? `“${text ?? ''}”` : PRINT_AS_LABEL[v]}${v === 'behalf' ? ' — counted, no GST' : sec ? ' — its lines print no amounts and aren’t counted' : ' — not counted'}` : `${who} the price again`,
      actionLabel: 'Undo', onAction: () => { for (const [id, p] of before) patchItem(id, p, { snapshot: false }) } })
  }
  const setHighlight = (ids: string[], v: Highlight | null) => {
    const targets = itemsRef.current.filter((i) => ids.includes(i.id))
    if (!targets.length) return
    const before = targets.map((t) => [t.id, t.highlight] as const)
    snapshot()
    for (const t of targets) patchItem(t.id, { highlight: v }, { snapshot: false })
    snackbar({ message: v ? `${targets.length > 1 ? `${targets.length} rows highlighted` : 'Highlighted'} — ${HIGHLIGHT_LABEL[v]}` : 'Highlight removed', actionLabel: 'Undo', onAction: () => { for (const [id, h] of before) patchItem(id, { highlight: isHighlight(h) ? h : null }, { snapshot: false }) } })   // (S44I — the triage's §12.14) the bulk bar's Highlight, with Undo
  }
  /* (UX audit Q7, extends REG-662) Create ▾ › From Price book opens the Price book modal, as the strip's tile and the table's link do. */
  const fromPriceBook = () => { closeMenus(); setBookOpen('items') }

  /* (S44I, B2 — the team's sections prototype) Collapse All · Expand All, one toggle whose words and glyph follow the state: View by: None folds
     every top section (or opens every section and sub-section once all are folded) — one snapshot, so one ⌘Z; a View-by view folds its buckets. */
  const topSections = items.filter((i) => i.kind === 'group' && !i.parentId)
  const anySectionOpen = topSections.some((t) => !t.collapsed)
  const toggleAllSections = () => {
    const groups = itemsRef.current.filter((i) => i.kind === 'group')
    const tops = groups.filter((g) => !g.parentId)
    const collapse = tops.some((t) => !t.collapsed)
    const change = collapse ? tops.filter((t) => !t.collapsed) : groups.filter((g) => g.collapsed)
    if (!change.length) return
    snapshot()
    for (const g of change) patchItem(g.id, { collapsed: collapse }, { snapshot: false })
  }
  const allBucketsFolded = bucketKeys.length > 0 && bucketKeys.every((k) => collapsedBuckets.has(k))
  const toggleAllBuckets = () => setCollapsedBuckets(allBucketsFolded ? new Set() : new Set(bucketKeys))
  const foldShown = view !== 'none' || topSections.length > 0
  const foldExpand = view !== 'none' ? allBucketsFolded : !anySectionOpen
  const toggleFold = () => { closeMenus(); if (view !== 'none') toggleAllBuckets(); else toggleAllSections() }

  /* Find (REG-477): a search glyph that opens the DS SearchBar and folds back when left empty (Escape clears it). The tab toolbars' box
     (components/om/toolbar-search.tsx) stands open on desktop; the mock's Items toolbar has no room for a standing box. */
  const [findOpen, setFindOpen] = useState(false)
  /* (REG-714) ⌘F (Ctrl+F) in the quote opens this Find — the lines', not the browser's — while the Items card is open; a modal keeps its own */
  useEffect(() => {
    if (!(open || expanded)) return
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey || e.shiftKey || e.key.toLowerCase() !== 'f' || document.querySelector('[aria-modal="true"]')) return
      e.preventDefault(); markUsed('grid.find'); setFindOpen(true)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, expanded])
  useShortcutsHere(GRID_KEYS)
  const findRef = useRef<HTMLSpanElement>(null)
  useEffect(() => { if (findOpen) findRef.current?.querySelector('input')?.focus() }, [findOpen])
  /* (Dane UAT, Figma Fix 1 1490:5395 — g-jumpto) While Find is open and empty, a "Jump to" list under it: the quote's sections (View by:
     None) or the view's buckets (a category, a room, a label); a pick scrolls to that row and pulses it (attention, REG-573) — a section
     folded inside another opens first. Typing hides the list and Find filters as before. */
  const [jumpOpen, setJumpOpen] = useState(false)
  const jumpTargets = useMemo(() => {
    if (view !== 'none') return bucketKeys.filter((k) => k === UNLABELLED.category || k === UNLABELLED.room || k === UNLABELLED.section ? items.some((i) => !i.parentId && !(i[view] ?? null)) : true).map((k) => ({ id: `bucket:${k}`, name: k, within: null as string | null }))
    return flattenItems(items).filter((i) => i.kind === 'group').map((g) => ({ id: g.id, name: g.name || 'New section', within: depthOf(items, g.id) ? items.find((p) => p.id === g.parentId)?.name ?? null : null }))
  }, [view, bucketKeys, items])
  const jumpTo = (id: string) => {
    setJumpOpen(false); setFindOpen(false)
    if (!id.startsWith('bucket:')) { const g = itemsRef.current.find((i) => i.id === id); const parent = g?.parentId ? itemsRef.current.find((i) => i.id === g.parentId) : null; if (parent?.collapsed) patchItem(parent.id, { collapsed: false }) }
    attention([id])
  }
  const find = findOpen || query !== '' ? (
    <span ref={findRef} className={styles.find}
          onFocusCapture={() => setJumpOpen(true)}
          onBlurCapture={(e) => {
            const to = e.relatedTarget instanceof Element ? e.relatedTarget : null
            if (to && (e.currentTarget.contains(to) || to.closest('[data-om-menu]'))) return   // into its own Jump to list
            setJumpOpen(false)
            if (query === '') setFindOpen(false)
          }}
          onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); setQuery(''); setFindOpen(false); setJumpOpen(false) } }}>
      <SearchBar appearance="outlined" size="md" placeholder="Find items" aria-label="Find items" value={query} onChange={setQuery}
                 onKeyDown={(e) => { if (e.key === 'ArrowDown' && jumpOpen && query === '' && jumpTargets.length) { e.preventDefault(); document.querySelector<HTMLElement>('[data-testid="jump-to"] [role="menuitem"]')?.focus() } }} />   {/* ↓ into the list; every other key as the box always had it (Escape: clears, then closes) */}
      <PortalMenu open={jumpOpen && query === '' && jumpTargets.length > 0} anchor={findRef} onClose={() => setJumpOpen(false)} role="menu" width={MENU_WIDTH.wide} autoFocus={false}>
        <div data-testid="jump-to">
          <DropdownLabel>Jump to</DropdownLabel>
          {jumpTargets.map((t) => <DropdownItem key={t.id} help={t.within ? `in ${t.within}` : undefined} onSelect={() => jumpTo(t.id)}>{t.name}</DropdownItem>)}
        </div>
      </PortalMenu>
    </span>
  ) : (
    <Tooltip label="Find items" keys="mod+f"><IconButton icon="search" label="Find items" onClick={() => setFindOpen(true)} /></Tooltip>
  )

  /* The radio rows View by / density share one rendering between the wide toolbar's menus and the folded kebab's levels. */
  const densityRows = DENSITIES.map((d) => <DropdownItem key={d} role="menuitemradio" checked={d === density} onSelect={() => chooseDensity(d)}><span className={styles.menuIcon} data-on={d === density || undefined}><Icon name={d === density ? 'radio_button_checked' : 'radio_button_unchecked'} size={20} /></span>{DENSITY_LABEL[d]}</DropdownItem>)
  const viewRows = ITEM_VIEWS.map((v) => <DropdownItem key={v} role="menuitemradio" checked={v === view} onSelect={() => chooseView(v)}><span className={styles.menuIcon} data-on={v === view || undefined}><Icon name={v === view ? 'radio_button_checked' : 'radio_button_unchecked'} size={20} /></span>{ITEM_VIEW_LABEL[v]}</DropdownItem>)
  const createMenu = (
    <PortalMenu open={menu === 'create'} anchor={createRef} onClose={closeMenus} role="menu" width={MENU_WIDTH.standard} align="right" sheetTitle="Create">
      <DropdownItem onSelect={() => { closeMenus(); void create({}, true, { chain: true }) }}>New Item</DropdownItem>
      <DropdownItem onSelect={() => { closeMenus(); createGroup([]) }}>New section</DropdownItem>
      <DropdownDivider />
      <DropdownItem onSelect={fromPriceBook}>From Price book</DropdownItem>
      {variation ? <><DropdownDivider /><DropdownItem onSelect={openOmit} help="Lines of the signed quote, each a credit on this order">Omit from the contract</DropdownItem></> : null}
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
        {/* (REG-728) 240: rows with a key hint (Undo · Redo) */}
        <PortalMenu open={menu === 'more'} anchor={moreRef} onClose={closeMenus} role="menu" width={MENU_WIDTH.wide} align="right" sheetTitle="Items">
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
                <DropdownItem disabled={history.past.length === 0} keys="mod+z" onSelect={() => { closeMenus(); undo() }}><span className={styles.menuIcon}><Icon name="undo" size={20} /></span>Undo</DropdownItem>
                <DropdownItem disabled={history.future.length === 0} keys="mod+shift+z" onSelect={() => { closeMenus(); redo() }}><span className={styles.menuIcon}><Icon name="redo" size={20} /></span>Redo</DropdownItem>
                <DropdownDivider />
                {expanded && onPreview ? <DropdownItem shortcut="preview" onSelect={() => { closeMenus(); previewNow() }}><span className={styles.menuIcon}><Icon name="visibility" size={20} /></span>Preview</DropdownItem> : null}   {/* (Dane UAT 6.15) */}
                <DropdownItem onSelect={() => { closeMenus(); setExpanded((x) => !x) }}><span className={styles.menuIcon}><Icon name={expanded ? 'collapse_content' : 'expand_content'} size={20} /></span>{expanded ? 'Collapse' : 'Expand'}</DropdownItem>
                <DropdownItem onSelect={() => { closeMenus(); setSettingsOpen(true) }}><span className={styles.menuIcon}><Icon name="tune" size={20} /></span>Column settings</DropdownItem>
                <DropdownItem submenu onSelect={() => setMoreSub('density')}><span className={styles.menuIcon}><Icon name="format_line_spacing" size={20} /></span>Row density: {DENSITY_LABEL[density]}<span className={styles.menuTrail}><Icon name="chevron_right" size={20} /></span></DropdownItem>
                <DropdownItem submenu onSelect={() => setMoreSub('view')}>View by: {ITEM_VIEW_LABEL[view]}<span className={styles.menuTrail}><Icon name="chevron_right" size={20} /></span></DropdownItem>
                {foldShown ? <DropdownItem onSelect={toggleFold}><span className={styles.menuIcon}><Icon name={foldExpand ? 'expand_all' : 'collapse_all'} size={20} /></span>{foldExpand ? 'Expand All' : 'Collapse All'}</DropdownItem> : null}
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
        <Tooltip label="Undo" keys="mod+z"><IconButton icon="undo" label="Undo" disabled={history.past.length === 0} onClick={undo} /></Tooltip>
        <Tooltip label="Redo" keys="mod+shift+z"><IconButton icon="redo" label="Redo" disabled={history.future.length === 0} onClick={redo} /></Tooltip>
      </span>
      <Tooltip label="Column settings"><IconButton icon="tune" label="Column settings" onClick={() => setSettingsOpen(true)} /></Tooltip>
      <span ref={densityRef} className={styles.anchor}>
        <Tooltip label="Row density" disabled={menu === 'density'}>
          <IconButton icon="format_line_spacing" label="Row density" aria-haspopup="menu" aria-expanded={menu === 'density'} onClick={() => setMenu((m) => (m === 'density' ? null : 'density'))} />
        </Tooltip>
        <PortalMenu open={menu === 'density'} anchor={densityRef} onClose={closeMenus} role="menu" width={MENU_WIDTH.standard} align="right">
          {densityRows}
        </PortalMenu>
      </span>
      {foldShown ? <Button variant="secondary" appearance="outlined" iconStart={<Icon name={foldExpand ? 'expand_all' : 'collapse_all'} size={20} />} onPress={toggleFold} data-testid="toolbar-fold">{foldExpand ? 'Expand All' : 'Collapse All'}</Button> : null}
      <span ref={viewRef} className={styles.anchor}>
        <Button variant="secondary" appearance="outlined" aria-haspopup="menu" aria-expanded={menu === 'view'}
                iconEnd={<span className={styles.chev} data-open={menu === 'view' || undefined}><Icon name="keyboard_arrow_down" size={20} /></span>}
                onPress={() => setMenu((m) => (m === 'view' ? null : 'view'))}>
          View by: {ITEM_VIEW_LABEL[view]}
        </Button>
        <PortalMenu open={menu === 'view'} anchor={viewRef} onClose={closeMenus} role="menu" width={MENU_WIDTH.standard} align="right">
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
      {/* (Dane UAT 6.15, g-expanded) The expanded card is a layer over the editor and its header's Preview: it carries its own (P too), and
          Back from Preview returns to it expanded. */}
      {expanded && onPreview ? <Tooltip label="Preview" shortcut="preview"><Button variant="secondary" appearance="outlined" onPress={previewNow} data-kb="preview">Preview</Button></Tooltip> : null}
      {/* (owner 2026-09-16, REG-458) Expand / Collapse is the row's last control, after Create — the mock (1271:41169) had it among the icon buttons. */}
      <Tooltip label={expanded ? 'Collapse' : 'Expand'}><IconButton icon={expanded ? 'collapse_content' : 'expand_content'} label={expanded ? 'Collapse' : 'Expand'} onClick={() => setExpanded((x) => !x)} /></Tooltip>
    </div>
  )

  const title = `Items (${lineCount})`
  const body = (
        <div ref={bodyRef} className={styles.body}>
          {/* (Dane UAT 6.11, g-sections-trade) The template decides how the lines print (REG-488 / REG-497): when it files them by a label,
              the quote's own sections never reach the paper — said once, above the table, with the way to a template that prints them. */}
          {printsBy && items.some((i) => i.kind === 'group') ? (
            <p className={styles.printNote} role="note" data-testid="print-note">
              <Icon name="info" size={20} weight={300} />
              <span>{printsBy.template} prints lines by {PRINTS_BY[printsBy.view]}, so these sections don’t show on the printed {variation ? 'variation order' : 'quote'}.</span>
              {onChangeTemplate ? <button type="button" className={styles.printNoteLink} onClick={onChangeTemplate}>Change template</button> : null}
            </p>
          ) : null}
          <ItemsTable
            onAddColumn={() => setSettingsOpen(true)}
            onReorder={(keys) => saveColumns({ ...columns, columns: [...keys.map((k) => columns.columns.find((c) => c.key === k)!), ...columns.columns.filter((c) => !c.on)] })}
            items={items} priceBook={shownBook} priceBookSections={priceBookSections} brandColors={seed.brandColors} view={view} density={density} columns={visibleColumns} details={columns.details} labels={usedLabels} clientColumns={clientColumns ?? null} propertyType={propertyType}
            selected={selected} collapsedBuckets={collapsedBuckets} showFull={showFull} nextNumber={nextNumber}
            query={query} onPasteBlock={(text, anchorId) => setPasting({ text, anchorId })} commentCounts={commentCounts} changes={changes}
            h={{
              onPatch: patchItem,
              onFill: fillDown,
              onSelect: (id, on) => setSelected((s) => { const n = new Set(s); if (on) n.add(id); else n.delete(id); return n }),
              onSelectRun: (ids) => setSelected((s) => new Set([...s, ...ids])),
              onInsertBelow: insertBelow,
              onMenu,
              onChooseGroup: (item, gid) => {
                /* (Dane UAT 6.11) Move to section › a section that stands for a trade gives the line that trade, with Undo — as the drag does */
                const host = gid ? itemsRef.current.find((i) => i.id === gid) ?? null : null
                const trade = host && item.kind === 'item' ? tradeOfSection(host, seed.trades) : null
                const recat = trade && trade !== item.category ? trade : null
                const before = itemsRef.current.map((i) => ({ ...i }))
                void structural('move the item', async () => { await orThrow(setQuoteItemParent(item.id, gid)); if (recat) await orThrow(updateQuoteItem(item.id, { category: recat })) })
                  .then((r) => { if (!r.ok) return; attention([item.id]); snackbar(recat && host ? { message: `Moved into “${host.name}” — its category is now ${recat}`, actionLabel: 'Undo', onAction: ownUndo(before) } : { message: gid ? 'Moved into the section' : 'Moved out of the section' }) })   // (NB-05) the Undo armed once it has landed
              },
              onPrintAs: (item, v) => { if (v === 'custom') { setPrintAsFor({ ids: [item.id], text: item.printAs === 'custom' ? item.printAsText : null, section: item.kind === 'group' }); setPrintAsOpen(true) } else setPrintAs([item.id], v, null, item.kind === 'group') },
              onHighlight: (item, v) => setHighlight([item.id], v),
              onUploadImage: (item) => setImageFor(item),
              onAddLabel: (kind, itemId, name) => { if (kind === 'vendor' && name) void addVendor(name, itemId); else setNaming({ kind, itemId }) },   // (one-home N-16)
              onNote: (message) => snackbar({ message }),
              onComments: (item) => onOpenComments?.(item.id),
              onFoot, onAddSeveral: addSeveral, onChainKey,
              /* (S44I — row 290) a trade picked for a section's name: named after it, and its lines file under it (the print's trade grouping and
                 a line moved in read the section's Category, tradeOfSection) — one patch, one ⌘Z */
              onTradePick: (item, trade) => { patchItem(item.id, { name: trade, category: trade }); snackbar({ message: `${trade} — its lines file under that trade` }) },
            }}
            onDropRow={commitDrag} onDropMany={commitDragMany} sectionsFold={view === 'none' && topSections.length ? { anyOpen: anySectionOpen, onToggle: toggleAllSections } : null}
            chainId={chain}
            fresh={fresh}
            onSelectAll={(on) => setSelected(on ? new Set(items.map((i) => i.id)) : new Set())}
            onToggleBucket={(k) => setCollapsedBuckets((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n })}
            onToggleAllBuckets={toggleAllBuckets}
            onCreate={(name) => { void create({ name }, !name) }}
            onPickPriceBook={(id) => { void create({ priceBookItemId: id }) }}
            onPickSection={(id) => { if (sectionsLock.locked) { sectionsLock.open(); return } void structural('insert the section', () => insertPriceBookSection(quoteId, id, {}), 'Section added from My Sections').then((r) => { if (r.ok) attention([r.value.id]) }) }}
            onViewPriceBook={() => setBookOpen('items')}   /* (REG-662) the Price book modal, over the editor */
            matchCount={bookPlan.matches.length} onMatch={() => setMatchOpen(true)}   /* (pending modules S12) Match lines */
            onExport={() => setExportOpen(true)}
            onAddToBucket={addToBucket} onMoveBucket={moveBucket}
            addInputRef={addInputRef}
            addOpenTick={addTick}   /* (S44I, B6) only the Create strip's tick opens the Add Item box now — a row asks the Price book modal */
          />
          <ItemsSummary totals={totals} pricing={pricing} studio={seed.studio} entities={seed.entities} billsProject={seed.billsProject ?? null} owner={owner} gstLabel={gstLabel} shares={shares} onPickCategory={pickCategory} onPricing={changePricing} onRound={() => setRoundOpen(true)} />
        </div>
  )
  return (
    <VendorDirectoryContext.Provider value={vendorDir.list}>
    <BookRuleContext.Provider value={{ runsBook: seed.runsBook !== false, bookItem: (id) => (id ? priceBook.find((p) => p.id === id && p.status === 'live') ?? null : null) }}>   {/* (REG-652) the row menu's saves read it · (REG-653) and a line's source */}
    <SelectedContext.Provider value={selected}>   {/* (S44I, B8) the row menu's Section with n items reads the ticked rows */}
    <WritingBookContext.Provider value={priceBook}>   {/* (pending modules S29) the Description dialog's writing help reads My Items' words */}
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
          /* (S44I, B8 — the team's sections prototype) the level it makes, said; Move to section › and Out of the section; (§12.14) Highlight › */
          { label: bulkLevel === 'sub-section' ? 'Group into sub-section' : 'Group into section', onClick: () => createGroup(selectedList) },
          { label: 'Move to section', onClick: (e) => { bulkAnchor.current = e?.currentTarget ?? null; setBulkMenu('move') } },
          { label: 'Print as', onClick: () => setPrintAsOpen(true) },
          { label: 'Highlight', onClick: (e) => { bulkAnchor.current = e?.currentTarget ?? null; setBulkMenu('highlight') } },
          /* (sweep S1) Undo on the snackbar puts each line back as it was (its own visibility), as ⌘Z would */
          /* (gaps build B, item 7 — 1.0 G-152) a variation order's Omit and Restore */
          ...(variation ? [{ label: 'Omit', tone: 'danger' as const, onClick: () => signLines(selectedList, true) }, { label: 'Restore', onClick: () => signLines(selectedList, false) }] : []),
          { label: 'Hide from client', onClick: () => { const before = itemsRef.current.filter((i) => selectedList.includes(i.id)).map((i) => [i.id, i.visibility] as const); snapshot(); for (const id of selectedList) patchItem(id, { visibility: 'hidden' }, { snapshot: false }); snackbar({ message: `${selectedList.length} hidden from the client`, actionLabel: 'Undo', onAction: () => { for (const [id, v] of before) patchItem(id, { visibility: v as QuoteItem['visibility'] }, { snapshot: false }) } }); setSelected(new Set()) } },
          { label: 'Delete', tone: 'danger', onClick: () => setRemoving(selectedList) },
        ]}
        onClear={() => setSelected(new Set())}
      />
      <PortalMenu open={bulkMenu === 'move' && selected.size > 0} anchor={bulkAnchor} onClose={() => setBulkMenu(null)} role="menu" width={MENU_WIDTH.wide} sheetTitle="Move to section">
        <div data-testid="bulk-move-menu">
          {bulkTargets.map((g) => <DropdownItem key={g.id} help={g.parentId ? `in ${items.find((p) => p.id === g.parentId)?.name ?? ''}` : undefined} onSelect={() => { setBulkMenu(null); moveTicked({ sectionId: g.id }) }}><span className={styles.menuIcon} data-sub={g.parentId ? '' : undefined}><Icon name="folder" size={20} weight={g.parentId ? 300 : 400} /></span>{g.name || 'New section'}</DropdownItem>)}
          {bulkTargets.length === 0 ? <div className={styles.menuHead}>No other sections yet</div> : null}
          {bulkAllInside ? <><DropdownDivider /><DropdownItem onSelect={() => { setBulkMenu(null); moveTicked('out') }} help="Each lands just after its own section">Out of the section</DropdownItem></> : null}
        </div>
      </PortalMenu>
      <PortalMenu open={bulkMenu === 'highlight' && selected.size > 0} anchor={bulkAnchor} onClose={() => setBulkMenu(null)} role="menu" width={MENU_WIDTH.wide} sheetTitle="Highlight">
        <DropdownItem onSelect={() => { setBulkMenu(null); setHighlight(selectedList, null); setSelected(new Set()) }}><span className={styles.menuIcon}><span className={styles.swatch} data-none="" /></span>None</DropdownItem>
        {HIGHLIGHTS.map((k) => <DropdownItem key={k} onSelect={() => { setBulkMenu(null); setHighlight(selectedList, k); setSelected(new Set()) }}><span className={styles.menuIcon}><span className={`${styles.swatch} ${styles.swatchKit}`} style={{ ['--sw' as string]: seed.brandColors[k] }} /></span>{HIGHLIGHT_LABEL[k]}</DropdownItem>)}
      </PortalMenu>
      <ConfirmDialog open={!!removing} title={removing && removing.length > 1 ? `Remove ${removing.length} items?` : removingSection ? 'Remove this section?' : 'Remove this item?'}
                     message={removing && removing.length > 1 ? `The ${removing.length} lines leave the quote and its totals.` : removingSection ? `The section and its ${removingSection} ${removingSection === 1 ? 'line leave' : 'lines leave'} the quote and its totals. To keep the lines, use Ungroup instead.` : 'The line leaves the quote and its totals.'} confirmLabel="Remove"
                     onConfirm={() => { const list = removing ?? []; setRemoving(null); setSelected(new Set()); void removeItems(list) }} onCancel={() => setRemoving(null)} />
      <NameDialog open={!!naming} title={naming?.kind === 'room' ? 'Add Room' : naming?.kind === 'section' ? 'Add Section label' : naming?.kind === 'vendor' ? 'Add vendor' : 'Add Category'} initial=""
                  onSave={(name) => { if (naming?.kind === 'vendor') void addVendor(name, naming.itemId); else if (naming) { const took = addLabel(naming.kind, name.trim()); if (naming.itemId) patchItem(naming.itemId, { [naming.kind]: took } as ItemPatch) } setNaming(null) }} onClose={() => setNaming(null)} />   {/* (sweep S1 · U-04) the new label lands on the line that asked · (one-home N-16) a vendor goes to the directory */}
      {/* (REG-555, T-3) A word beside the section's sub-total — "Approximate", "Estimate" — through the house name dialog. */}
      <OmitDialog open={!!omit} contract={omit?.contract ?? null} lines={omit?.lines ?? []} loading={!!omit?.loading} busy={!!omit?.busy} onClose={() => setOmit(null)} onOmit={(ids) => { void addOmissions(ids) }} />
      <PriceBookDialog itemFolders={seed.bookFolders?.items} sectionFolders={seed.bookFolders?.sections} open={!!bookOpen} tab={bookOpen ?? 'items'} onTab={(t) => setBookOpen(t)} items={priceBook} sections={priceBookSections} propertyType={propertyType}
                       place={placeControl(bookAt, setBookAt)} placeText={bookAt ? placeWords(bookAt) : undefined}
                       onClose={() => { setBookOpen(null); setBookAt(null) }} onAdd={addFromBook} onManage={() => { setBookOpen(null); router.push(withFrom('/company/price-book', `/quotes/${quoteId}`)) }} />
      <NameDialog open={!!labelling} title="Label the sub-total" initial={labelling?.printAsText ?? ''}
                  onSave={(name) => { if (labelling) { patchItem(labelling.id, { printAsText: name.trim() || null }); snackbar({ message: name.trim() ? `The sub-total prints “${name.trim()}”` : 'Sub-total label removed' }) } setLabelling(null) }} onClose={() => setLabelling(null)} />
      <PrintAsDialog open={printAsOpen} count={printAsFor ? printAsFor.ids.length : selected.size} initial={printAsFor ? { key: 'custom', text: printAsFor.text } : undefined}
                     onClose={() => { setPrintAsOpen(false); setPrintAsFor(null) }}
                     onApply={(v, text) => { setPrintAsOpen(false); if (printAsFor) { setPrintAs(printAsFor.ids, v, text, !!printAsFor.section); setPrintAsFor(null) } else { setPrintAs(selectedList, v, text); setSelected(new Set()) } }} />
      {/* (pending modules S04 — card held:quotes, "a photo upload still stamps a canned thumbnail (REG-415)") a picked picture goes up with its bytes to the
          lead's Files (the Files tab's own upload, as the quote's Files section does) and is ticked in the modal; Add puts it on the line */}
      <AttachFilesModal open={!!imageFor} mode="image" chrome="quote" files={seed.files} attached={[]} onClose={() => setImageFor(null)}
                        onAttach={(fileIds) => { const f = [...uploadedPictures.current, ...seed.files].find((x) => x.id === fileIds[0]); if (imageFor && f) patchItem(imageFor.id, { thumb: f.thumb ?? null, thumbCount: f.thumb ? 1 : 0, icon: null }); setImageFor(null) }}
                        onUploadPicked={(file) => {
                          if (!file || !seed.leadId) return Promise.resolve({ error: 'This picture didn’t read — pick it again' })
                          if (!file.type.startsWith('image/')) return Promise.resolve({ error: 'Choose a picture — a line shows a photo' })
                          return uploadPicked(seed.leadId, file).then((r) => { if (r && !('error' in r)) uploadedPictures.current = [r, ...uploadedPictures.current]; else fail(`upload ${file.name}`, r && 'error' in r ? r.error : undefined); return r }, (e: unknown) => { fail(`upload ${file.name}`); throw e })
                        }} />
      <PasteItemsDialog open={!!pasting} text={pasting?.text ?? ''} anchor={pasteAnchor ? { id: pasteAnchor.id, name: pasteAnchor.name } : null} onClose={() => setPasting(null)} onAdd={addPasted} costs={costs}
                        typed={!!pasting?.typed} units={usedLabels.units} place={pasting?.at ? placeControl(pasting.at, (p) => setPasting((cur) => (cur ? { ...cur, at: p } : cur))) : undefined} />
      <RoundPricesDialog open={roundOpen} items={items} onClose={() => setRoundOpen(false)} onApply={applyRound} />
      <MatchBookDialog open={matchOpen} items={items} book={priceBook} runsBook={seed.runsBook !== false} costs={costs} busy={matchBusy} onClose={() => { if (!matchBusy) setMatchOpen(false) }} onApply={(o) => { void applyMatch(o) }} />
      <ExportDialog open={exportOpen} title="Export Items" download={downloadItems} onClose={() => setExportOpen(false)}
                    onDone={(name, format) => snackbar({ message: `Exported ${lineCount} ${lineCount === 1 ? 'item' : 'items'} as ${format} · ${name}` })} />
      <SetValueDialog open={setValueOpen} count={selected.size} labels={usedLabels} units={usedLabels.units} onClose={() => setSetValueOpen(false)} onApply={applySet} initialField={costs && command?.kind === 'setMarkup' && command.n === seenCommand ? 'markupPct' : undefined} costs={costs} />
      <ColumnSettingsDrawer open={settingsOpen} value={columns} previewHref={`/quotes/${quoteId}/preview?panel=client`} onClose={() => setSettingsOpen(false)} onSave={saveColumns} onReset={() => clearColumnWidths(ITEMS_TABLE)} clientColumns={clientColumns ?? null} hidden={[...(owner ? [] : ['rebate' as const]), ...(costs ? [] : COST_COLUMNS)]} />
    </WritingBookContext.Provider>
    </SelectedContext.Provider>
    </BookRuleContext.Provider>
    </VendorDirectoryContext.Provider>
  )
}
