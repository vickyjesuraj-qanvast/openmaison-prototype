'use client'

import { ProTag } from '@/components/credits/pro-tag'
import { usePlanLock } from '@/components/credits/credits-client'
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ClipboardEvent, type CSSProperties, type FocusEvent, type KeyboardEvent, type MouseEvent } from 'react'
import { Button, Checkbox } from '@/components/ds'
import { useColumnDrag } from '@/components/om/column-drag'
import { useStuck } from '@/components/om/use-stuck'
import { ColumnResizer, useColumnWidths } from '@/components/om/column-resize'
import { Icon } from '@/components/om/icon'
import { PortalMenu } from '@/components/om/portal-menu'
import { TextField } from '@/components/om/text-field'
import { Tooltip } from '@/components/om/tooltip'
import { useComingSoon } from '@/components/om/snackbar'
import { isBlock, sumLines } from '@/lib/quotes/clipboard'
import type { PriceBookItem, QuoteItem } from '@/lib/db/schema'
import { COLUMN_LABEL, ITEM_KIND_ICON, ITEM_KIND_LABEL, isItemKind, shortLink, UNLABELLED, type ColumnKey, type ColumnSettings, type ItemsDensity, type ItemsView } from '@/lib/quotes/items-model'
import { afterContractIds, ancestorIds, countedLines, depthOf, descendantIds, flattenItems, groupTotals, lineCostMinor, lineTotalMinor, markupPct, money2, numberItems, pct, unitPriceMinor } from '@/lib/quotes/math'
import type { PriceBookSection } from '@/lib/db/schema'
import { parseSavedSection, parseSectionTags, savedSectionCount } from '@/lib/quotes/items-model'
import { ItemRow, COL_CLASS, Guides, type ColWidths, type RowHandlers, type RowLabels } from './item-row'
import type { LineChanges } from './line-change'
import { atEdge, focusCell, nextAcross, nextDown, rowOf, type Target } from './grid-keys'
import { useRowDrag, type DragRow, type DropSlot } from './row-drag'
import { ItemCards } from './item-cards'
import { useSheetLayout } from '@/components/om/sheet'
import { SideScrollbar } from '@/components/om/side-scrollbar'   // (REG-570) moved to the house pieces — the Schedule's timeline scrolls on it too (fix-B, B-31)
import styles from './items-table.module.css'

/** The table's key in the user's stored column widths (lib/table-widths.ts). */
export const ITEMS_TABLE = 'quote-items'
/** A resized column never goes under this; ITEM keeps room for the thumb and a word. */
const MIN_COL = 56
const MIN_ITEM = 200

/* ── Content-fit (owner 2026-09-15: "columns width be content width (except the name and description)"): every column but
   ITEM is as wide as its widest text — the head's label or any row's value, measured in the cell's own font — plus the cell's
   32 of padding, so nothing wraps to a second line and the active row's boxes change nothing about the height. The strings
   are the ones the cells render (item-row.tsx), so the fit follows every edit. A width the user dragged wins over the fit. */
const fmtNum = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(2).replace(/\.?0+$/, ''))
let canvas: CanvasRenderingContext2D | null = null
function measure(text: string, font: string): number {
  if (!canvas) canvas = document.createElement('canvas').getContext('2d')
  if (!canvas) return text.length * 8
  canvas.font = font
  return canvas.measureText(text).width
}
/** The sum row's figure for a column (REG-477): quantities add up, the money columns sum the lines that price. */
function sumText(key: ColumnKey, sums: ReturnType<typeof sumLines>): string {
  return key === 'qty' ? fmtNum(sums.qty) : key === 'cost' ? money2(sums.costMinor) : key === 'markup' ? money2(sums.markupMinor) : key === 'unitPrice' ? money2(sums.unitPriceMinor) : ''
}
/** What a column shows on every display row, as [text, extra px] — the extra is a glyph / chevron / chip chrome beside the text. */
function columnTexts(key: ColumnKey, display: Display[], items: QuoteItem[]): [string, number][] {
  const out: [string, number][] = []
  const counted = new Set(countedLines(items).map((l) => l.id))
  for (const d of display) {
    if (d.kind === 'foot' || d.kind === 'divider') continue   // (S44I) a foot and the divider hold no figures
    if (d.kind === 'bucket') {
      const lines = d.lines.filter((l) => counted.has(l.id))
      const cost = lines.reduce((s, l) => s + lineCostMinor(l), 0), markup = lines.reduce((s, l) => s + Math.round(l.qty * l.markupMinor), 0), price = lines.reduce((s, l) => s + Math.round(l.qty * unitPriceMinor(l)), 0)
      if (key === 'cost') out.push([money2(cost), 0]); else if (key === 'markup') out.push([money2(markup), 0]); else if (key === 'unitPrice') out.push([money2(price), 0])
      continue
    }
    const i = d.item
    const isGroup = i.kind === 'group'
    const sums = isGroup ? groupTotals(items, i.id) : null
    switch (key) {
      case 'qty': if (!isGroup) out.push([fmtNum(i.qty), 0]); break
      case 'unit': if (!isGroup) out.push([i.unit ?? 'Unit · e.g. sqft', 24]); break   // + the select's chevron 16 and gap (REG-560: the empty cell's hint)
      case 'cost': out.push([money2(isGroup ? sums!.costMinor : i.costMinor), 0]); break
      case 'markup': {
        const m = isGroup ? sums!.markupMinor : i.markupMinor
        const p = isGroup ? (sums!.costMinor > 0 ? (sums!.markupMinor / sums!.costMinor) * 100 : 0) : markupPct(i)
        out.push([`${money2(m)} (${pct(Number(p.toFixed(2)))})`, 0]); break
      }
      case 'unitPrice': out.push([money2(isGroup ? sums!.unitPriceMinor : unitPriceMinor(i)), 0]); break
      case 'discount': if (!isGroup) out.push([`${fmtNum(i.discountPct)}%`, 0]); break
      case 'gst': if (!isGroup) out.push([fmtNum(i.gstPct), 0]); break
      case 'room': out.push([i.room ?? 'Add Room', 24]); break
      case 'category': out.push([i.category ?? 'Add Category', 24]); break
      case 'section': out.push([i.section ?? 'Add label', 24]); break
      case 'type': if (!isGroup) out.push([isItemKind(i.icon) ? ITEM_KIND_LABEL[i.icon] : '–', 0]); break
      case 'rebate': if (!isGroup) out.push([money2(i.rebateMinor), 0]); break   // (REG-596)
      case 'vendor': if (!isGroup) out.push([i.vendor ?? 'Add vendor', 24]); break   // (REG-623) + the select's chevron
      case 'website': if (!isGroup) out.push([i.link ? shortLink(i.link) : 'Add link', i.link ? 24 : 0]); break   // + the Open glyph
      case 'margin': { const price = isGroup ? sums!.unitPriceMinor : unitPriceMinor(i); const cost = isGroup ? sums!.costMinor : i.costMinor; out.push([price > 0 ? pct(Number((((price - cost) / price) * 100).toFixed(1))) : '–', 0]); break }
      default: out.push(['–', 0])
    }
  }
  return out
}
import sec from './items-section.module.css'

/** (S44I, B11 — the team's sections prototype, Branches) The tree a child row draws in its ITEM cell: per level above its own, whether that
    ancestor's branch runs on below the row; its own branch (a tee, or the last child's elbow); a section's stem under its open row. */
export type Tree = { guides: boolean[]; branch: 'tee' | 'elbow' | null; stem: boolean }
/** One display row: a line, or a view bucket's header (Category / Room / Section). (S44I, B3) An open section's foot after its last row —
    its adds — and (S44T — call C1, S44I) the divider above the sections priced after the contract. */
export type Display =
  | { kind: 'row'; item: QuoteItem; number: string; bucket: string | null; tree?: Tree }
  | { kind: 'bucket'; key: string; name: string; number: string; ids: string[]; lines: QuoteItem[] }
  | { kind: 'foot'; section: QuoteItem; depth: number; empty: boolean; top: boolean; bucket: string | null; tree?: Tree }
  | { kind: 'divider'; count: number }

/** (S44I, B3) Each open section (a sub-section too) ends with its foot row: right after the last row shown under it, before whatever follows. */
function withFeet(display: Display[], items: QuoteItem[]): Display[] {
  const byId = new Map(items.map((i) => [i.id, i]))
  const under = (sectionId: string, row: QuoteItem) => { let p = row.parentId; const seen = new Set<string>(); while (p && !seen.has(p)) { if (p === sectionId) return true; seen.add(p); p = byId.get(p)?.parentId ?? null } return false }
  const out: Display[] = []
  const open: { g: QuoteItem; bucket: string | null }[] = []
  const close = () => { const s = open.pop()!; out.push({ kind: 'foot', section: s.g, depth: depthOf(items, s.g.id) + 1, empty: !items.some((c) => c.parentId === s.g.id), top: !s.g.parentId, bucket: s.bucket }) }
  for (const d of display) {
    if (d.kind === 'row') { while (open.length && !under(open[open.length - 1]!.g.id, d.item)) close() } else while (open.length) close()
    out.push(d)
    if (d.kind === 'row' && d.item.kind === 'group' && !d.item.collapsed) open.push({ g: d.item, bucket: d.bucket })
  }
  while (open.length) close()
  return out
}
/** (S44I, B11) The guides each child row and foot draws, from the rows as shown (Find's filter included): a foot is its section's last child. */
export function withTree(display: Display[], items: QuoteItem[]): Display[] {
  const parentKey = (d: Display) => (d.kind === 'row' ? d.item.parentId ?? null : d.kind === 'foot' ? d.section.id : null)
  const last = new Map<string, number>()
  display.forEach((d, i) => { const p = parentKey(d); if (p) last.set(p, i) })
  return display.map((d, i) => {
    if (d.kind !== 'row' && d.kind !== 'foot') return d
    const stem = d.kind === 'row' && d.item.kind === 'group' && !d.item.collapsed && last.has(d.item.id)
    const p = parentKey(d)
    if (!p) return stem ? { ...d, tree: { guides: [], branch: null, stem } } : d
    const chain = d.kind === 'row' ? ancestorIds(items, d.item.id) : [d.section.id, ...ancestorIds(items, d.section.id)]   // nearest first
    const depth = chain.length
    const guides: boolean[] = []
    for (let k = 1; k < depth; k++) guides.push((last.get(chain[depth - k]!) ?? -1) > i)
    return { ...d, tree: { guides, branch: last.get(p) === i ? 'elbow' : 'tee', stem } }
  })
}

/** Group the quote's lines the way "View by" asks: every top-level line (and a group's children with it) under its label. */
export function buildDisplay(items: QuoteItem[], view: ItemsView, labels: string[], collapsedBuckets: Set<string>): Display[] {
  const flat = flattenItems(items)
  const folded = new Set(items.filter((i) => i.kind === 'group' && i.collapsed).map((i) => i.id))
  /* (REG-558) A folded section hides everything under it, sub-sections included; the numbers are the maths' (1 · 1.1 · 1.1.1, a
     "no number" line blank). */
  const hidden = descendantIds(items, folded)
  for (const id of folded) hidden.delete(id)
  if (view === 'none') {
    const num = numberItems(items)
    const rows = withFeet(flat.filter((i) => !hidden.has(i.id)).map((i): Display => ({ kind: 'row', item: i, number: num.get(i.id) ?? '', bucket: null })), items)
    /* (S44T — call C1, S44I) the sections priced after the contract stand last (flattenItems' order) under their divider */
    const at = rows.findIndex((d) => d.kind === 'row' && !d.item.parentId && !!d.item.pricedAfter)
    if (at >= 0) rows.splice(at, 0, { kind: 'divider', count: items.filter((i) => !i.parentId && i.pricedAfter).length })
    return rows
  }
  const field = view
  const labelOf = (i: QuoteItem): string => {
    let cur: QuoteItem | undefined = i
    while (cur) { const own = cur[field]; if (own) return own; cur = cur.parentId ? items.find((x) => x.id === cur!.parentId) : undefined }
    return UNLABELLED[field]
  }
  const top = flat.filter((i) => !i.parentId)
  const order: string[] = []
  for (const l of labels) if (!order.includes(l)) order.push(l)
  for (const i of top) { const l = labelOf(i); if (!order.includes(l)) order.push(l) }
  const un = UNLABELLED[field]
  if (order.includes(un)) { order.splice(order.indexOf(un), 1); order.push(un) }
  const out: Display[] = []
  order.forEach((label, bi) => {
    const rows = top.filter((i) => labelOf(i) === label)
    const lines: QuoteItem[] = []
    for (const r of rows) { if (r.kind === 'group') { const under = descendantIds(items, [r.id]); lines.push(...items.filter((c) => c.id !== r.id && under.has(c.id) && c.kind === 'item')) } else lines.push(r) }
    if (rows.length === 0 && !labels.includes(label)) return
    const bn = String(bi + 1)
    out.push({ kind: 'bucket', key: label, name: label, number: bn, ids: rows.map((r) => r.id), lines })
    if (collapsedBuckets.has(label)) return
    rows.forEach((r, ri) => {
      const rn = `${bn}.${ri + 1}`
      out.push({ kind: 'row', item: r, number: rn, bucket: label })
      if (r.kind !== 'group') return
      // The section's own numbering under the bucket's: its lines and sub-sections in row order, a folded one hiding its rows.
      const inner = numberItems(items, r.id, `${rn}.`)
      for (const c of flat.filter((x) => x.id !== r.id && descendantIds(items, [r.id]).has(x.id))) if (!hidden.has(c.id)) out.push({ kind: 'row', item: c, number: inner.get(c.id) ?? '', bucket: label })
    })
  })
  return withFeet(out, items)
}

export function ItemsTable({
  items, priceBook, priceBookSections, brandColors, view, density, columns, onReorder, details, labels, selected, collapsedBuckets, showFull, nextNumber, h, onDropRow, fresh,
  onSelectAll, onToggleBucket, onToggleAllBuckets, onCreate, onPickPriceBook, onPickSection, onViewPriceBook, onExport, addInputRef, addOpenTick, matchCount = 0, onMatch,
  query, onPasteBlock, clientColumns, onAddColumn, propertyType = null, commentCounts = {}, changes, onAddToBucket, onMoveBucket, onDropMany, sectionsFold = null, chainId = null,
}: {
  /** (Dane UAT, Figma 1549:34 pt 1) View by › Category: the "+" on a bucket's row adds a line in that category. */
  onAddToBucket?: (key: string) => void
  /** (Dane UAT, Figma 1549:34 pt 4) View by › Category: a bucket dragged by its handle lands before another, or after one's lines. */
  onMoveBucket?: (key: string, anchorKey: string, where: 'before' | 'after') => void
  /** (REG-627, parity Q-30) Each line's comment count, by id. */
  commentCounts?: Record<string, number>
  /** (UX audit Q10) On a revision: the lines new or changed since the kept version. */
  changes?: LineChanges
  /** (REG-619, parity Q-27) The quote's property type — the Add Item popover's My Sections filter. */
  propertyType?: string | null
  /** The head's + opens the Column settings drawer (its catalogue is where a column is added). */
  onAddColumn?: () => void
  items: QuoteItem[]
  priceBook: PriceBookItem[]
  /** (REG-566) The studio's saved sections — the popover's "My Sections". */
  priceBookSections: PriceBookSection[]
  onPickSection: (id: string) => void
  /** (REG-556) The brand kit's colours by key, for the Highlight bar and swatches. */
  brandColors: Record<string, string>
  view: ItemsView
  density: ItemsDensity
  columns: ColumnKey[]
  /** (REG-497) The columns the quote's template prints for the client: an eye on their heads, "internal" on the others' tooltips. */
  clientColumns?: Set<string> | null
  /** A head dragged to a new place (REG-462): the visible keys in their new order. */
  onReorder: (keys: ColumnKey[]) => void
  details: ColumnSettings['details']
  labels: RowLabels
  selected: Set<string>
  collapsedBuckets: Set<string>
  showFull: Set<string>
  nextNumber: number
  h: Omit<RowHandlers, 'onDragPointerDown'>
  /** (REG-571) A row dropped by the pointer drag: where it goes (row-drag.ts). */
  onDropRow: (id: string, slot: DropSlot) => void
  /** (REG-573) Rows that just arrived — they pulse once. */
  fresh: Set<string>
  onSelectAll: (on: boolean) => void
  onToggleBucket: (key: string) => void
  onToggleAllBuckets: () => void
  onCreate: (name: string) => void
  onPickPriceBook: (id: string) => void
  onViewPriceBook: () => void
  /** (pending modules S12) how many lines match an item in My Items, and the review that matches them — the link shows only with a count */
  matchCount?: number
  onMatch?: () => void
  /** Export As → the house Export dialog (REG-478). */
  onExport: () => void
  addInputRef: React.RefObject<HTMLInputElement | null>
  /** Bumped by Create › From My Items: the popover opens without a keystroke. */
  addOpenTick: number
  /** Find (REG-477): only the rows whose name or description carry this text. */
  query: string
  /** A block copied from a spreadsheet was pasted (REG-476): the text and the row it landed on. */
  onPasteBlock: (text: string, anchorId: string | null) => void
  /** (S44I, B4) Several ticked rows dropped together: every id (the pressed row first), and where. */
  onDropMany?: (ids: string[], slot: DropSlot) => void
  /** (S44I, B2) View by: None with sections — the head's one toggle folds every top section, or opens every section. */
  sectionsFold?: { anyOpen: boolean; onToggle: () => void } | null
  /** (S44I, B10) The line an add press just made, its name holding the caret (Enter adds another there). */
  chainId?: string | null
}) {
  const comingSoon = useComingSoon()
  const phone = useSheetLayout()   /* (REG-597) ≤767 the lines are cards with a sheet each; the grid stays for every wider screen */
  const wrap = useRef<HTMLDivElement>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const headBar = useRef<HTMLDivElement>(null)
  const sentinel = useRef<HTMLDivElement>(null)
  const headRef = useRef<HTMLDivElement>(null)
  const headStuck = useStuck(headBar, sentinel)   // (REG-570) the held head casts its rule + shadow
  const [more, setMore] = useState(true)
  const [scrolled, setScrolled] = useState(false)
  const stored = useColumnWidths(ITEMS_TABLE)   // the widths the user dragged (REG-427)
  const [fit, setFit] = useState<Partial<Record<ColumnKey, number>>>({})
  // The fit is measured in the cells' font: once the webfont has landed the measure runs again (first paint can be the fallback face).
  const [fontsReady, setFontsReady] = useState(false)
  useEffect(() => { let on = true; document.fonts?.ready.then(() => { if (on) setFontsReady(true) }); return () => { on = false } }, [])
  // The frozen TOTAL's sideways shadow shows only while columns are still hidden under it (the frozen-column rule, mirrored);
  // the frozen ITEM block (≤1024) casts its own only once the table has been panned.
  useEffect(() => {
    const el = scroller.current
    if (!el) return
    const update = () => { setMore(el.scrollLeft + el.clientWidth < el.scrollWidth - 1); setScrolled(el.scrollLeft > 0) }
    update()
    el.addEventListener('scroll', update, { passive: true })
    const ro = new ResizeObserver(update); ro.observe(el)
    return () => { el.removeEventListener('scroll', update); ro.disconnect() }
  }, [items.length, columns.length])
  /* (REG-570) The head bar and the body scroll sideways as one: each follows the other's scrollLeft. A value one side set on the other
     comes back as that side's own scroll event a frame later — that echo is recognised and dropped, otherwise it would write a stale
     offset back into a body that is mid-way through a smooth pan and stop it. */
  useEffect(() => {
    const body = scroller.current, head = headBar.current
    if (!body || !head) return
    let setHead = -1, setBody = -1
    const fromBody = () => {
      if (body.scrollLeft === setBody) { setBody = -1; return }
      if (head.scrollLeft !== body.scrollLeft) { setHead = body.scrollLeft; head.scrollLeft = body.scrollLeft }
    }
    const fromHead = () => {
      if (head.scrollLeft === setHead) { setHead = -1; return }
      if (body.scrollLeft !== head.scrollLeft) { setBody = head.scrollLeft; body.scrollLeft = head.scrollLeft }
    }
    body.addEventListener('scroll', fromBody, { passive: true }); head.addEventListener('scroll', fromHead, { passive: true })
    fromBody()
    return () => { body.removeEventListener('scroll', fromBody); head.removeEventListener('scroll', fromHead) }
  }, [])

  const viewLabels = useMemo(() => (view === 'room' ? labels.rooms : view === 'category' ? labels.categories : view === 'section' ? labels.sections : []), [view, labels])
  const display = useMemo(() => buildDisplay(items, view, viewLabels, collapsedBuckets), [items, view, viewLabels, collapsedBuckets])
  /* The fit is measured over EVERY line — groups unfolded, no bucket collapsed — so folding anything never changes a column's
     width (owner 2026-09-16: "expanded and collapsed width looks different because of this there is jerk", REG-447). */
  const fullDisplay = useMemo(() => buildDisplay(items.map((i) => (i.kind === 'group' && i.collapsed ? { ...i, collapsed: false } : i)), view, viewLabels, new Set()), [items, view, viewLabels])
  /* Find (REG-477): the rows whose name or description carry the text, each under its group (the band its number needs) and its bucket. */
  const q = query.trim().toLowerCase()
  const found = useMemo(() => {
    if (!q) return null
    const hit = (i: QuoteItem) => i.name.toLowerCase().includes(q) || (i.description ?? '').toLowerCase().includes(q)
    const keep = new Set<string>()
    for (const i of items) if (hit(i)) { keep.add(i.id); if (i.parentId) keep.add(i.parentId) }
    return keep
  }, [items, q])
  const shown = useMemo(() => {
    if (!found) return withTree(display, items)
    /* while Find is on there are no feet and no divider — only what matches, under its section and its bucket */
    const buckets = new Set(display.flatMap((d) => (d.kind === 'row' && found.has(d.item.id) ? [d.bucket] : [])))
    return withTree(display.filter((d) => (d.kind === 'row' ? found.has(d.item.id) : d.kind === 'bucket' ? buckets.has(d.key) : false)), items)
  }, [display, found, items])
  /* (sweep S1) while Find is on, the Sum row adds up what it shows — never every line beside two rows */
  const sums = useMemo(() => sumLines(found ? items.filter((i) => found.has(i.id)) : items), [items, found])
  /* (wave E, desktop-6) "priced" means a line with a price: a counted line still at S$0 (a finish the Price book couldn't price, a floor
     waiting for its measured quantity) is counted but not priced — the row said "2 priced items" over a S$0.00 total. */
  const priced = useMemo(() => { const lines = countedLines(found ? items.filter((i) => found.has(i.id)) : items); return { n: lines.filter((l) => lineTotalMinor(l) !== 0).length, of: lines.length } }, [items, found])
  // Content-fit, measured after layout in the cells' own fonts (the head's caption, the body's 14/400) — see columnTexts.
  useLayoutEffect(() => {
    const head = headRef.current
    if (!head) return
    const headCell = head.querySelector<HTMLElement>('[role="columnheader"]:last-child')
    const bodyCell = scroller.current?.querySelector<HTMLElement>('[role="row"][data-item-id] [role="cell"]') ?? null
    const fontOf = (el: HTMLElement | null, fallback: string) => { if (!el) return fallback; const cs = getComputedStyle(el); return `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}` }
    const headFont = fontOf(headCell, '500 12px Inter'), bodyFont = fontOf(bodyCell, '400 14px Inter')
    const next: Partial<Record<ColumnKey, number>> = {}
    for (const c of columns) {
      let w = measure(COLUMN_LABEL[c].toUpperCase(), headFont)
      for (const [text, extra] of columnTexts(c, fullDisplay, items)) w = Math.max(w, measure(text, bodyFont) + extra)
      w = Math.max(w, measure(sumText(c, sums), bodyFont))   // the sum row's figure (REG-477)
      next[c] = Math.max(MIN_COL, Math.ceil(w) + 36)   // the cell's 32 of padding + the input's 2 of border + 2 of slack (the box rounds up past the canvas measure)
    }
    setFit((cur) => (columns.every((c) => cur[c] === next[c]) && Object.keys(cur).length === columns.length ? cur : next))
  }, [columns, fullDisplay, items, sums, fontsReady])
  // What every row lays its cells to: the user's width, else the fit, else the stylesheet's mocked width (item-row.tsx COL_CLASS).
  const colW: ColWidths = useMemo(() => {
    const w: ColWidths = {}
    for (const c of columns) { const px = stored[c] ?? fit[c]; if (px) w[c] = px }
    if (stored.item) w.item = stored.item
    return w
  }, [columns, stored, fit])
  const itemStyle: CSSProperties | undefined = colW.item ? { width: colW.item } : undefined
  const groups = items.filter((i) => i.kind === 'group')
  const D = useColumnDrag(columns.map((key) => ({ key })), (keys) => onReorder(keys as ColumnKey[]))   /* drag a head to reorder (REG-462); the frozen blocks and Total are not in the list */
  const allIds = items.map((i) => i.id)
  const allOn = allIds.length > 0 && allIds.every((id) => selected.has(id))
  /* (REG-571) The pointer drag over the rows as shown — what the slot rules need per row, refreshed after every render. */
  const dragRows = useRef<DragRow[]>([])
  /* (Dane UAT, Figma 1549:34 pts 3 · 4) View by › Category takes its bucket rows into the drag: a line may land in another category, and a
     bucket moves with its lines. Room and Section label keep a line in its own bucket, as before. */
  const byCategory = view === 'category'
  /* (S44T — call C1, S44I) the rows that belong to a section priced after the contract */
  const afterIds = useMemo(() => afterContractIds(items), [items])
  useEffect(() => {
    dragRows.current = shown.flatMap((d): DragRow[] => (d.kind === 'row' ? [{ id: d.item.id, parentId: d.item.parentId ?? null, kind: d.item.kind === 'group' ? 'group' as const : 'item' as const, bucket: d.bucket, open: d.item.kind === 'group' && !d.item.collapsed, hasSubs: d.item.kind === 'group' && items.some((x) => x.parentId === d.item.id && x.kind === 'group'), after: afterIds.has(d.item.id) }]
      : d.kind === 'foot' ? [{ id: `foot:${d.section.id}`, parentId: d.section.id, kind: 'foot' as const, bucket: d.bucket, open: false, hasSubs: false, after: afterIds.has(d.section.id) }]   // (S44I, B4) a drop on a foot = the end of its section
      : d.kind === 'bucket' && byCategory ? [{ id: `bucket:${d.key}`, parentId: null, kind: 'bucket' as const, bucket: d.key, open: !collapsedBuckets.has(d.key), hasSubs: false, fixed: d.key === UNLABELLED.category }] : []))
  })
  const R = useRowDrag({ root: wrap, rowsRef: dragRows, crossBucket: byCategory, onDrop: (id, slot, carriedIds) => {
    if (id.startsWith('bucket:')) { if (slot.anchorId?.startsWith('bucket:')) onMoveBucket?.(id.slice(7), slot.anchorId.slice(7), slot.where === 'after' ? 'after' : 'before'); return }
    if (carriedIds.length && onDropMany) { onDropMany([id, ...carriedIds], slot); return }
    onDropRow(id, slot)
  } })
  const lastTouched = useRef<string | null>(null)
  const rowH: RowHandlers = {
    ...h,
    /* Shift-click selects the run between the last row touched and this one over the rows as shown (a folded group's children
       are not in it); it only ever adds, so a run across a partly-ticked list fills the gaps (REG-475, the Tasks table's rule). */
    onSelect: (id, on, range) => {
      const ids = shown.flatMap((d) => (d.kind === 'row' ? [d.item.id] : []))
      const a = lastTouched.current ? ids.indexOf(lastTouched.current) : -1, b = ids.indexOf(id)
      if (range && a >= 0 && b >= 0) h.onSelectRun(ids.slice(Math.min(a, b), Math.max(a, b) + 1)); else h.onSelect(id, on)
      lastTouched.current = id
    },
    /* (S44I, B4 — the team's sections prototype) a ticked row drags every ticked row with it (View by: None; one write, one ⌘Z) */
    onDragPointerDown: (id, e) => R.start(id, e, view === 'none' && !found && selected.has(id) && selected.size > 1 ? [...selected].filter((x) => x !== id) : []),
  }
  const bucketNames = display.flatMap((d) => (d.kind === 'bucket' ? [d.key] : []))
  const foldedAll = view !== 'none' ? bucketNames.length > 0 && bucketNames.every((k) => collapsedBuckets.has(k)) : !!sectionsFold && !sectionsFold.anyOpen

  /* Drag-fill (REG-477): from the handle's press to the pointer's release the rows under the pointer join the range; on release the
     source cell's value goes into every row in it (the section applies it under one snapshot). A group joins only for a label column. */
  const fillRows = useMemo(() => {
    const lines = shown.flatMap((d) => (d.kind === 'row' && d.item.kind === 'item' ? [d.item.id] : []))
    const all = shown.flatMap((d) => (d.kind === 'row' ? [d.item.id] : []))
    return (col: string) => (col === 'room' || col === 'category' || col === 'section' ? all : lines)
  }, [shown])
  /* (S45C — S43D's NB-07 (c); as recommended — her ask 2026-10-17) A RUN: cells selected down one column — Shift+click a cell of the column
     the focus is in, or Shift+↓ / Shift+↑ from it (Excel's own two ways). The run wears the selected tint; its corner square sits on its last
     cell, and dragging it continues the run's series (numbers by their step, anything else in turn — lib/quotes/fill-series.ts); one cell
     still copies. ⌘D fills the run's first cell into the rest, as Excel's Ctrl+D does. Any other press, key or a move out of the table lets
     the run go. The phone's cards keep their own way (no run there). */
  const [run, setRun] = useState<{ col: ColumnKey; anchor: string; end: string } | null>(null)
  const runIds = useMemo(() => {
    if (!run) return [] as string[]
    const ids = fillRows(run.col)
    const a = ids.indexOf(run.anchor), b = ids.indexOf(run.end)
    if (a < 0 || b < 0 || a === b) return [] as string[]
    return ids.slice(Math.min(a, b), Math.max(a, b) + 1)
  }, [run, fillRows])
  const runSet = useMemo(() => new Set(runIds), [runIds])
  const runLast = runIds[runIds.length - 1] ?? null
  const [fill, setFill] = useState<{ col: ColumnKey; from: string; to: string | null; run?: string[] } | null>(null)
  const fillIds = useMemo(() => {
    if (!fill || !fill.to || fill.to === fill.from) return new Set<string>()
    const ids = fillRows(fill.col)
    const b = ids.indexOf(fill.to)
    if (b < 0) return new Set<string>()
    if (fill.run && fill.run.length >= 2) {   // (S45C) from a run: the rows past it, below or above — never the run itself
      const top = ids.indexOf(fill.run[0]!), bottom = ids.indexOf(fill.run[fill.run.length - 1]!)
      if (top < 0 || bottom < 0) return new Set<string>()
      return new Set(b > bottom ? ids.slice(bottom + 1, b + 1) : b < top ? ids.slice(b, top) : [])
    }
    const a = ids.indexOf(fill.from)
    if (a < 0) return new Set<string>()
    return new Set(ids.slice(Math.min(a, b), Math.max(a, b) + 1).filter((id) => id !== fill.from))
  }, [fill, fillRows])
  const fillRef = useRef({ fill, fillIds, h, fillRows })
  useEffect(() => { fillRef.current = { fill, fillIds, h, fillRows } })
  const filling = fill !== null
  useEffect(() => {
    if (!filling) return
    const prev = document.body.style.userSelect
    document.body.style.userSelect = 'none'
    const move = (e: PointerEvent) => {
      const row = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>('[role="row"][data-item-id]')
      const id = row?.dataset.itemId
      if (id) setFill((f) => (f && f.to !== id ? { ...f, to: id } : f))
    }
    const up = () => {
      const { fill: f, fillIds: ids, h: handlers, fillRows: rowsOf } = fillRef.current
      if (f && ids.size && f.run && f.run.length >= 2) {
        /* (S45C) a run's series: the rows reached below it top-down, above it nearest first — in the order the table shows them */
        const order = rowsOf(f.col), top = order.indexOf(f.run[0]!)
        const reached = order.filter((id) => ids.has(id))
        handlers.onFill(f.col, f.from, reached, { run: f.run, below: reached.filter((id) => order.indexOf(id) > top), above: reached.filter((id) => order.indexOf(id) < top).reverse() })
        setRun(null)
      } else if (f && ids.size) handlers.onFill(f.col, f.from, [...ids])
      setFill(null)
    }
    document.addEventListener('pointermove', move); document.addEventListener('pointerup', up); document.addEventListener('pointercancel', up)
    return () => { document.body.style.userSelect = prev; document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', up); document.removeEventListener('pointercancel', up) }
  }, [filling])
  /* (S45C) the corner square of a run's last cell drags the run's series; any other square copies its own cell, as before */
  const startFill = (col: ColumnKey, id: string) => setFill({ col, from: id, to: null, ...(run && run.col === col && runLast === id && runIds.length >= 2 ? { run: runIds } : {}) })
  /* (S45C) Shift+click: a cell of the column the focus is in (or the run is in) becomes the run's other end; the focus stays where it was */
  const swallowClick = useRef(false)
  const onRunPress = (e: MouseEvent<HTMLDivElement>) => {
    const t = e.target instanceof Element ? e.target : null
    if (e.button !== 0 || !e.shiftKey || !t || t.closest('[data-fill-handle]')) return
    const cell = t.closest<HTMLElement>('[role="row"][data-item-id] [data-col]')
    const col = cell?.dataset.col as ColumnKey | undefined
    const id = cell ? rowOf(cell)?.dataset.itemId : undefined
    if (!cell || !col || !id || !cell.querySelector('[data-fill-handle]')) return
    const focus = document.activeElement
    const fromFocus = focus instanceof HTMLElement && focus.hasAttribute('data-edit') && wrap.current?.contains(focus) && focus.closest<HTMLElement>('[data-col]')?.dataset.col === col ? rowOf(focus)?.dataset.itemId ?? null : null
    const anchor = run && run.col === col ? run.anchor : fromFocus
    if (!anchor) return
    e.preventDefault()
    swallowClick.current = true
    setRun(anchor === id ? null : { col, anchor, end: id })
  }
  const onRunClick = (e: MouseEvent<HTMLDivElement>) => { if (!swallowClick.current) return; swallowClick.current = false; e.preventDefault(); e.stopPropagation() }
  /* (S45C) the run lets go on a press anywhere else (Shift held keeps it; its corner square uses it) and when the focus leaves the table */
  const hasRun = runIds.length > 0
  useEffect(() => {
    if (!hasRun) return
    const w = wrap.current
    const down = (e: PointerEvent) => { const t = e.target instanceof Element ? e.target : null; if (e.shiftKey || t?.closest('[data-fill-handle]')) return; setRun(null) }
    const out = (e: globalThis.FocusEvent) => { const to = e.relatedTarget; if (!(to instanceof Node) || !w?.contains(to)) setRun(null) }
    document.addEventListener('pointerdown', down, true)
    w?.addEventListener('focusout', out)
    return () => { document.removeEventListener('pointerdown', down, true); w?.removeEventListener('focusout', out) }
  }, [hasRun])
  /** (S45C) Shift+↓ / Shift+↑ from a box: the run grows (or shrinks) by one cell that way, and the cell it reaches scrolls into view. */
  const stepRun = (t: HTMLElement, dir: 1 | -1): boolean => {
    const cell = t.closest<HTMLElement>('[data-col]')
    const col = cell?.dataset.col as ColumnKey | undefined
    const id = rowOf(t)?.dataset.itemId
    if (!cell || !col || !id || !cell.querySelector('[data-fill-handle]')) return false
    const ids = fillRows(col)
    const same = run && run.col === col && runIds.length > 0
    const anchor = same ? run.anchor : id, end = same ? run.end : id
    const next = ids[ids.indexOf(end) + dir]
    if (!next) return true
    setRun(next === anchor ? null : { col, anchor, end: next })
    requestAnimationFrame(() => wrap.current?.querySelector<HTMLElement>(`[role="row"][data-item-id="${next}"] [data-col="${col}"]`)?.scrollIntoView({ block: 'nearest' }))
    return true
  }

  /* Paste (REG-476): a block from a spreadsheet — tabs between cells, a line per row — goes to the mapping dialog instead of one box;
     the Add Item field also takes a plain list of names. A single value pastes into its box as ever. */
  const onPaste = (e: ClipboardEvent<HTMLDivElement>) => {
    const text = e.clipboardData.getData('text/plain')
    const t = e.target instanceof HTMLElement ? e.target : null
    if (!isBlock(text, t?.closest('[data-add-item]') ? 'add' : 'cell')) return
    e.preventDefault()
    onPasteBlock(text, t ? rowOf(t)?.dataset.itemId ?? null : null)
  }

  /* The keyboard grid (REG-475, grid-keys.ts): Tab / Shift+Tab step across the cells, Enter / Shift+Enter and ↑ ↓ walk the column,
     ← → leave a box from its edge, F2 drops the caret at the end of a selected value; past the last row is the Add Item field.
     An open select menu keeps its own keys, and so does anything that is not a cell control. */
  const onGridKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const t = e.target
    /* (S45C) a run's keys: ⌘D fills its first cell into the rest (Excel's Ctrl+D over a selection), Shift+↓ / Shift+↑ grow it; any other
       key lets it go (typing edits the box the focus is in, as before) */
    if (hasRun && run && t instanceof HTMLElement && t.hasAttribute('data-edit')) {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'd') { e.preventDefault(); h.onFill(run.col, runIds[0]!, runIds.slice(1)); setRun(null); return }
      if (!(e.shiftKey && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) && !['Shift', 'Meta', 'Control', 'Alt', 'CapsLock'].includes(e.key)) setRun(null)
    }
    if (t instanceof HTMLElement && t.hasAttribute('data-edit') && t.getAttribute('aria-expanded') !== 'true' && e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      if (stepRun(t, e.key === 'ArrowDown' ? 1 : -1)) { e.preventDefault(); return }
    }
    if (!(t instanceof HTMLElement) || !t.hasAttribute('data-edit') || t.getAttribute('aria-expanded') === 'true' || e.metaKey || e.ctrlKey || e.altKey) return
    const table = e.currentTarget
    const input = t instanceof HTMLInputElement ? t : null
    const go = (n: Target) => { if (n === 'add') addInputRef.current?.focus(); else if (n) focusCell(n, scroller.current); else t.blur() }
    /* (S44I, B10 — call C4) Enter in the name of the line an add press just made adds another (items-section.tsx); everywhere else it walks */
    if (e.key === 'Enter' && !e.shiftKey && chainId && input?.hasAttribute('data-name')) {
      const row = rowOf(t)
      const it = row?.dataset.itemId === chainId ? items.find((i) => i.id === chainId) : undefined
      if (it) { e.preventDefault(); h.onChainKey(it, 'enter', input.value); return }
    }
    switch (e.key) {
      case 'Tab': { const n = nextAcross(table, t, e.shiftKey ? -1 : 1); if (!n) return; e.preventDefault(); go(n); return }
      case 'Enter': e.preventDefault(); go(nextDown(table, t, e.shiftKey ? -1 : 1)); return
      case 'ArrowDown': case 'ArrowUp': { const n = nextDown(table, t, e.key === 'ArrowDown' ? 1 : -1); if (!n) return; e.preventDefault(); go(n); return }
      case 'ArrowLeft': case 'ArrowRight': { const dir = e.key === 'ArrowRight' ? 1 : -1; if (input && !atEdge(input, dir)) return; const n = nextAcross(table, t, dir); if (!n) return; e.preventDefault(); go(n); return }
      case 'F2': if (input) { e.preventDefault(); const L = input.value.length; input.setSelectionRange(L, L) } return
    }
  }

  if (phone) {
    return (
      <div ref={wrap} className={styles.cardsWrap} data-testid="items-cards" onPaste={onPaste}>
        <ItemCards rows={shown.map((d) => (d.kind === 'row' ? { kind: 'row' as const, item: d.item, number: details.autonumber ? d.number : '' } : d.kind === 'bucket' ? { kind: 'bucket' as const, key: d.key, name: d.name, number: d.number, lines: d.lines }
          : d.kind === 'foot' ? { kind: 'foot' as const, section: d.section, empty: d.empty, top: d.top } : { kind: 'divider' as const, count: d.count }))}
                   items={items} selected={selected} groups={groups} labels={labels} brandColors={brandColors} h={h} collapsedBuckets={collapsedBuckets} onToggleBucket={onToggleBucket} showDescription={details.description} showCost={columns.includes('cost')} showMarkup={columns.includes('markup')} commentCounts={commentCounts} changes={changes} />
        {/* (wave E, phone-4) no "#n" before the field on a phone — the cards carry their own numbers, and a lone "2" floated at the edge */}
        <AddItemRow number={nextNumber} autonumber={false} priceBook={priceBook} sections={priceBookSections} propertyType={propertyType} onCreate={onCreate} onPick={onPickPriceBook} onPickSection={onPickSection} onViewPriceBook={onViewPriceBook} onExport={onExport} inputRef={addInputRef} openTick={addOpenTick} matchCount={matchCount} onMatch={onMatch} />
      </div>
    )
  }
  return (
    <div ref={wrap} className={styles.wrap} role="table" aria-label="Quote items" data-kb-own data-nonum={details.autonumber ? undefined : ''} data-cols={ITEMS_TABLE} data-drag-root=""
         data-more={more || undefined} data-scrolled={scrolled || undefined} onKeyDown={onGridKey} onPaste={onPaste} onMouseDownCapture={onRunPress} onClickCapture={onRunClick}>
      <div ref={sentinel} className={styles.sentinel} aria-hidden />
      {/* (REG-570) The column heads: a sticky bar above the body's scroller, scrolled sideways in step with it. */}
      <div ref={headBar} className={styles.headBar} role="rowgroup" data-head-bar="" data-stuck={headStuck || undefined}>
          <div ref={headRef} className={styles.head} role="row">
            <div role="columnheader" className={`${styles.cell} ${styles.colSel}`}>
              {/* (S44I, B2 — the team's sections prototype) one toggle whose words and glyph follow the state: Collapse all while anything is
                  open, Expand all once everything is folded — the View-by buckets, or (View by: None) the quote's sections */}
              {view !== 'none' || sectionsFold ? (
                <Tooltip label={foldedAll ? 'Expand all' : 'Collapse all'}>
                  <button type="button" className={styles.foldAll} aria-label={foldedAll ? 'Expand all' : 'Collapse all'} data-testid="fold-all" onClick={view !== 'none' ? onToggleAllBuckets : sectionsFold?.onToggle}>
                    <Icon name={foldedAll ? 'expand_all' : 'collapse_all'} size={20} weight={300} />
                  </button>
                </Tooltip>
              ) : null}
              <span className={styles.check}><Checkbox isSelected={allOn} isIndeterminate={!allOn && allIds.some((id) => selected.has(id))} isDisabled={allIds.length === 0} onChange={(on: boolean) => onSelectAll(on)} aria-label="Select all items" /></span>
            </div>
            {details.autonumber ? <div role="columnheader" className={`${styles.cell} ${styles.colNum}`}>#</div> : null}
            <div role="columnheader" className={`${styles.cell} ${styles.colItem}`} style={itemStyle}>Item{clientColumns ? <ClientEye /> : null}<ColumnResizer table={ITEMS_TABLE} column="item" label="Item" min={MIN_ITEM} /></div>
            {columns.map((c) => (
              <div key={c} role="columnheader" className={`${styles.cell} ${COL_CLASS[c]}`} data-col={c} data-client={clientColumns ? (clientColumns.has(c) ? 'yes' : 'no') : undefined} title={clientColumns && !clientColumns.has(c) ? 'Internal — never printed for the client' : undefined} style={{ ...(colW[c] ? { width: colW[c] } : {}), ...D.style(c) }} {...D.head(c)}>
                {COLUMN_LABEL[c]}{clientColumns?.has(c) ? <ClientEye /> : null}<ColumnResizer table={ITEMS_TABLE} column={c} label={COLUMN_LABEL[c]} min={MIN_COL} />
              </div>
            ))}
            <div role="columnheader" className={`${styles.cell} ${styles.colAdd}`}>
              <Tooltip label="Add column">
                <button type="button" className={styles.foldAll} aria-label="Add column" onClick={onAddColumn ?? comingSoon}><Icon name="add_box" size={20} weight={300} /></button>
              </Tooltip>
            </div>
            <div role="columnheader" className={`${styles.cell} ${styles.colTotal}`}>Total{clientColumns ? <ClientEye /> : null}</div>
          </div>
      </div>
      <div ref={scroller} className={styles.scroller}>
        <div className={styles.table} role="rowgroup">
          {shown.map((d) => d.kind === 'bucket' ? (
            <BucketRow key={`b-${d.key}`} d={d} all={items} columns={columns} colW={colW} colStyle={D.style} autonumber={details.autonumber} folded={collapsedBuckets.has(d.key)} onToggle={() => onToggleBucket(d.key)}
                       fresh={fresh.has(`bucket:${d.key}`)} drag={byCategory ? R.rowProps(`bucket:${d.key}`) : undefined}
                       onAdd={byCategory && onAddToBucket ? () => onAddToBucket(d.key) : undefined}
                       onDragPointerDown={byCategory && onMoveBucket && d.key !== UNLABELLED.category && !found ? (e) => R.start(`bucket:${d.key}`, e) : undefined} />
          ) : d.kind === 'foot' ? (
            <SectionFoot key={`f-${d.section.id}`} d={d} columns={columns} colW={colW} colStyle={D.style} autonumber={details.autonumber} itemStyle={itemStyle} onFoot={h.onFoot} drag={R.rowProps(`foot:${d.section.id}`)} />
          ) : d.kind === 'divider' ? (
            <DividerRow key="priced-after" count={d.count} columns={columns} colW={colW} colStyle={D.style} autonumber={details.autonumber} itemStyle={itemStyle} />
          ) : (
            <ItemRow key={d.item.id} item={d.item} all={items} number={d.number} columns={columns} colW={colW} colStyle={D.style} details={details} density={density}
                     selected={selected.has(d.item.id)} groups={groups} selectedCount={selected.size} labels={labels} tree={d.tree} chained={chainId === d.item.id}
                     {...R.rowProps(d.item.id)} fresh={fresh.has(d.item.id)}
                     showFull={showFull.has(d.item.id)} fillCol={fill?.col ?? null} inFill={fillIds.has(d.item.id)} onFillStart={startFill} h={rowH}
                     runCol={run && runSet.has(d.item.id) ? run.col : null} runEnd={runLast === d.item.id} brandColors={brandColors} comments={commentCounts[d.item.id] ?? 0} change={changes?.get(d.item.id) ?? null} />
          ))}
          {found && !shown.some((d) => d.kind === 'row') ? <div className={styles.findEmpty} role="row" data-testid="find-empty"><span role="cell">No items match “{query.trim()}”</span></div> : null}   {/* (sweep S1) */}
          <SumRow sums={sums} priced={priced} columns={columns} colW={colW} colStyle={D.style} autonumber={details.autonumber} itemStyle={itemStyle} />
          <AddItemRow number={nextNumber} autonumber={details.autonumber} priceBook={priceBook} sections={priceBookSections} propertyType={propertyType} onCreate={onCreate} onPick={onPickPriceBook} onPickSection={onPickSection} onViewPriceBook={onViewPriceBook} onExport={onExport} inputRef={addInputRef} openTick={addOpenTick} matchCount={matchCount} onMatch={onMatch} />
        </div>
      </div>
      <SideScrollbar scroller={scroller} />
    </div>
  )
}

/** The sum row (REG-477): the number columns' totals over the lines that price — a spreadsheet's SUM line under the table. */
function SumRow({ sums, priced, columns, colW, colStyle, autonumber, itemStyle }: { sums: ReturnType<typeof sumLines>; priced: { n: number; of: number }; columns: ColumnKey[]; colW: ColWidths; colStyle: (key: ColumnKey) => CSSProperties | undefined; autonumber: boolean; itemStyle?: CSSProperties }) {
  return (
    <div className={styles.sumRow} role="row" aria-label="Sum">
      <div role="cell" className={`${styles.cell} ${styles.colSel}`} />
      {autonumber ? <div role="cell" className={`${styles.cell} ${styles.colNum}`} /> : null}
      <div role="cell" className={`${styles.cell} ${styles.colItem}`} style={itemStyle} data-testid="sum-label">Sum · {priced.n === priced.of ? `${priced.n} priced ${priced.n === 1 ? 'item' : 'items'}` : `${priced.n} of ${priced.of} priced`}</div>   {/* (REG-576) "priced": the title's count is every line; this one is the lines that carry a price — (wave E, desktop-6) "0 of 2 priced" while lines wait at S$0 */}
      {columns.map((c) => <div key={c} role="cell" className={`${styles.cell} ${COL_CLASS[c]}`} style={{ ...(colW[c] ? { width: colW[c] } : {}), ...colStyle(c) }}><span className={styles.sum}>{sumText(c, sums)}</span></div>)}
      <div role="cell" className={`${styles.cell} ${styles.colAdd}`} />
      <div role="cell" className={`${styles.cell} ${styles.colTotal}`}><span className={styles.sum}>{money2(sums.totalMinor)}</span></div>
    </div>
  )
}

/** (S44I, B3 — the team's sections prototype) An open section's foot: the adds at its end — a line, a sub-section (a top section only), the
    Price book and pasted lines, each landing LAST in the section — and, while the section is empty, the words that say so. On the sum row's
    cell skeleton, so the frozen block and the columns stay where they are; the keyboard grid passes over it (no `data-item-id`). Each button's
    spoken name starts with its words and names its section (several feet stand in one table). */
function SectionFoot({ d, columns, colW, colStyle, autonumber, itemStyle, onFoot, drag }: { d: Extract<Display, { kind: 'foot' }>; columns: ColumnKey[]; colW: ColWidths; colStyle: (key: ColumnKey) => CSSProperties | undefined; autonumber: boolean; itemStyle?: CSSProperties
  onFoot: RowHandlers['onFoot']; drag?: { dragStyle?: CSSProperties } }) {
  const name = d.section.name.trim() || (d.top ? 'New section' : 'New sub-section')
  return (
    <div className={styles.footRow} role="row" aria-label={`The end of ${name}`} data-section-foot={d.section.id} data-drag-id={`foot:${d.section.id}`} data-depth={d.depth} style={drag?.dragStyle}>
      <div role="cell" className={`${styles.cell} ${styles.colSel}`} />
      {autonumber ? <div role="cell" className={`${styles.cell} ${styles.colNum}`} /> : null}
      <div role="cell" className={`${styles.cell} ${styles.colItem}`} style={itemStyle}>
        {d.tree ? <Guides tree={d.tree} /> : null}
        <span className={styles.footBody}>
          {d.empty ? <span className={styles.footEmpty} data-testid="foot-empty">Nothing in {name} yet —</span> : null}
          <button type="button" className={styles.footLink} onClick={() => onFoot(d.section, 'item')} aria-label={`Add item to the end of ${name}`} data-testid="foot-add-item"><Icon name="add" size={16} />Add item</button>
          {d.top ? <button type="button" className={styles.footLink} onClick={() => onFoot(d.section, 'sub')} aria-label={`Add sub-section to ${name}`} data-testid="foot-add-sub"><Icon name="add" size={16} />Add sub-section</button> : null}
          <button type="button" className={styles.footLink} onClick={() => onFoot(d.section, 'book')} aria-label={`Price book — add to the end of ${name}`} data-testid="foot-book">Price book</button>
          <button type="button" className={styles.footLink} onClick={() => onFoot(d.section, 'paste')} aria-label={`Paste lines at the end of ${name}`} data-testid="foot-paste">Paste lines</button>
        </span>
      </div>
      {columns.map((c) => <div key={c} role="cell" className={`${styles.cell} ${COL_CLASS[c]}`} style={{ ...(colW[c] ? { width: colW[c] } : {}), ...colStyle(c) }} />)}
      <div role="cell" className={`${styles.cell} ${styles.colAdd}`} />
      <div role="cell" className={`${styles.cell} ${styles.colTotal}`} />
    </div>
  )
}

/** (S44T — call C1, S44I) The divider over the sections priced after the contract, gathered at the table's end: their work is estimated now,
    out of the quote's total and its payment split. */
function DividerRow({ count, columns, colW, colStyle, autonumber, itemStyle }: { count: number; columns: ColumnKey[]; colW: ColWidths; colStyle: (key: ColumnKey) => CSSProperties | undefined; autonumber: boolean; itemStyle?: CSSProperties }) {
  return (
    <div className={styles.dividerRow} role="row" data-testid="priced-after-divider">
      <div role="cell" className={`${styles.cell} ${styles.colSel}`} />
      {autonumber ? <div role="cell" className={`${styles.cell} ${styles.colNum}`} /> : null}
      <div role="cell" className={`${styles.cell} ${styles.colItem}`} style={itemStyle}>
        <span className={styles.dividerText}><span className={styles.dividerName}>Priced after the contract</span><span className={styles.dividerHelp}>{count === 1 ? 'An estimate' : `${count} estimates`} — out of the total and the payment split</span></span>
      </div>
      {columns.map((c) => <div key={c} role="cell" className={`${styles.cell} ${COL_CLASS[c]}`} style={{ ...(colW[c] ? { width: colW[c] } : {}), ...colStyle(c) }} />)}
      <div role="cell" className={`${styles.cell} ${styles.colAdd}`} />
      <div role="cell" className={`${styles.cell} ${styles.colTotal}`} />
    </div>
  )
}

/** A view bucket's header row (reference "1 · Design Time"): name, fold chevron and the sums of its lines. (Dane UAT, Figma 1549:34) In
 *  View by › Category its selection cell holds the drag handle (Uncategorized stays last, so it has none) and the "+" that adds a line in it. */
function BucketRow({ d, all, columns, colW, colStyle, autonumber, folded, onToggle, onAdd, onDragPointerDown, drag, fresh = false }: { d: Extract<Display, { kind: 'bucket' }>; all: QuoteItem[]; columns: ColumnKey[]; colW: ColWidths; colStyle: (key: ColumnKey) => CSSProperties | undefined; autonumber: boolean; folded: boolean; onToggle: () => void
  onAdd?: () => void; onDragPointerDown?: (e: React.PointerEvent<HTMLButtonElement>) => void; drag?: { dragging: boolean; dragStyle?: CSSProperties }; fresh?: boolean }) {
  const counted = new Set(countedLines(all).map((l) => l.id))
  const lines = d.lines.filter((l) => counted.has(l.id))
  const cost = lines.reduce((s, l) => s + lineCostMinor(l), 0)
  const markup = lines.reduce((s, l) => s + Math.round(l.qty * l.markupMinor), 0)
  const price = lines.reduce((s, l) => s + Math.round(l.qty * unitPriceMinor(l)), 0)
  const total = lines.reduce((s, l) => s + lineTotalMinor(l), 0)
  const sum = (key: ColumnKey) => (key === 'cost' ? money2(cost) : key === 'markup' ? money2(markup) : key === 'unitPrice' ? money2(price) : '')
  return (
    <div className={styles.bucket} role="row" data-bucket={d.key} data-drag-id={`bucket:${d.key}`} data-dragging={drag?.dragging || undefined} data-fresh={fresh || undefined} style={drag?.dragStyle}>
      <div role="cell" className={`${styles.cell} ${styles.colSel}`}>
        {onDragPointerDown ? (
          <Tooltip label="Drag to reorder">
            <button type="button" className={styles.handle} aria-label={`Drag to reorder ${d.name}`} onPointerDown={onDragPointerDown}><Icon name="drag_indicator" size={20} weight={300} /></button>
          </Tooltip>
        ) : onAdd ? <span className={styles.handleGap} aria-hidden /> : null}
        {onAdd ? (
          <Tooltip label="Add item">
            <button type="button" className={styles.bucketAdd} aria-label={`Add item to ${d.name}`} onClick={onAdd}><Icon name="add" size={20} weight={300} /></button>
          </Tooltip>
        ) : null}
      </div>
      {autonumber ? <div role="cell" className={`${styles.cell} ${styles.colNum}`}>{d.number}</div> : null}
      <div role="cell" className={`${styles.cell} ${styles.colItem}`} style={colW.item ? { width: colW.item } : undefined}>
        <span className={styles.bucketName}>{d.name}</span>
        <Tooltip label={folded ? 'Expand' : 'Collapse'}>
          <button type="button" className={styles.fold} aria-label={folded ? `Expand ${d.name}` : `Collapse ${d.name}`} aria-expanded={!folded} onClick={onToggle}>
            <Icon name={folded ? 'keyboard_arrow_down' : 'keyboard_arrow_up'} size={20} />
          </button>
        </Tooltip>
      </div>
      {columns.map((c) => <div key={c} role="cell" className={`${styles.cell} ${COL_CLASS[c]}`} style={{ ...(colW[c] ? { width: colW[c] } : {}), ...colStyle(c) }}><span className={styles.sum}>{sum(c)}</span></div>)}
      <div role="cell" className={`${styles.cell} ${styles.colAdd}`} />
      <div role="cell" className={`${styles.cell} ${styles.colTotal}`}><span className={styles.sum}>{money2(total)}</span></div>
    </div>
  )
}

/**
 * The Add Item row (1262:35728) with the My Items popover (1271:40932): a 36px TextField that is a combobox — typing opens
 * the popover and filters the studio's price book (spec 03: "Typing opens the Add item popover"); ArrowUp / Down walk the
 * matches, Enter adds the active one — or, with nothing active, a blank line named as typed ("Item" when nothing is typed,
 * like Create ▾ › New Item). "Create New Item" is always live (spec 04 draws it enabled). The field keeps focus for the next line.
 */
function AddItemRow({ number, autonumber, priceBook, sections, propertyType, onCreate, onPick, onPickSection, onViewPriceBook, onExport, inputRef, openTick, matchCount = 0, onMatch }: {
  number: number; autonumber: boolean; priceBook: PriceBookItem[]; sections: PriceBookSection[]; propertyType: string | null; onCreate: (name: string) => void; onPick: (id: string) => void; onPickSection: (id: string) => void; onViewPriceBook: () => void; onExport: () => void
  matchCount?: number; onMatch?: () => void
  inputRef: React.RefObject<HTMLInputElement | null>
  openTick: number
}) {
  /* (S44I, B6) A row's ⋮ › Add Item › From Price book… opens the Price book modal with its place now (REG-662's surface, REG-653's rule): this
     box's type-ahead adds at the end, as it always did, and no longer carries a place line. */
  const listId = useId()
  const sectionsLocked = usePlanLock('package_creation').locked   // (pending modules S19) My Sections are Pro — a pick opens the lock
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [seenTick, setSeenTick] = useState(openTick)
  if (openTick !== seenTick) { setSeenTick(openTick); setOpen(true) }   // Create › From My Items opens it outright (render-phase adjust)
  /* (sweep S5 #12) …and the field keeps the focus: the row menu, closing, handed it back to its kebab after the press had put it here. */
  const mountTick = useRef(openTick)   // a remount (the section expanded again) is not a press
  useEffect(() => { if (seenTick !== mountTick.current) { const r = requestAnimationFrame(() => inputRef.current?.focus()); return () => cancelAnimationFrame(r) } }, [seenTick, inputRef])
  const anchor = useRef<HTMLDivElement>(null)
  /* (REG-653, price book parity Q-12 · E-74) Every item that matches — the list scrolls and counts them all — found by its name, description,
     vendor, category or kind, as the Company page's search finds them. */
  const matches = useMemo(() => {
    const s = q.trim().toLowerCase()
    return s ? priceBook.filter((p) => [p.name, p.description ?? '', p.vendor ?? '', p.category ?? '', ITEM_KIND_LABEL[isItemKind(p.kind) ? p.kind : 'purchase']].some((f) => f.toLowerCase().includes(s))) : priceBook
  }, [q, priceBook])
  /* (REG-566) The saved sections that match, with their line counts; a pick inserts the whole section at the end of the table.
     (REG-619, parity Q-27) A section made for another property type waits under "Show all" — 1.0's "the lead's type, or none" — and a tag finds it. */
  const [allTypes, setAllTypes] = useState(false)
  const { sectionMatches, otherTypes } = useMemo(() => {
    const s = q.trim().toLowerCase()
    const found = sections.map((x) => ({ x, tags: parseSectionTags(x.tags) }))
      .filter(({ x, tags }) => !s || x.name.toLowerCase().includes(s) || tags.some((t) => t.toLowerCase().includes(s)))
    const fits = (x: PriceBookSection) => !propertyType || !x.propertyType || x.propertyType === propertyType
    const shown = allTypes ? found : found.filter(({ x }) => fits(x))
    return {
      otherTypes: found.length - found.filter(({ x }) => fits(x)).length,
      sectionMatches: shown.map(({ x, tags }) => { const body = parseSavedSection(x.linesJson); return { id: x.id, name: x.name, count: body ? savedSectionCount(body) : 0, propertyType: x.propertyType, tags } }),
    }
  }, [q, sections, propertyType, allTypes])
  /* (REG-653, Q-12) One keyboard walk over the items and then the sections. (sweep S5 #12) "Show all" is in the walk too. */
  const typeToggle = !!(otherTypes && propertyType)
  const options = useMemo(() => [
    ...matches.map((m) => ({ kind: 'item' as const, id: m.id })),
    ...(typeToggle ? [{ kind: 'allTypes' as const, id: 'all-types' }] : []),
    ...sectionMatches.map((x) => ({ kind: 'section' as const, id: x.id })),
  ], [matches, typeToggle, sectionMatches])
  const idx = (kind: string, id: string) => options.findIndex((o) => o.kind === kind && o.id === id)
  const close = () => { setOpen(false); setActive(-1) }
  const shut = () => { setOpen(false); setActive(-1) }
  const create = () => { onCreate(q.trim()); setQ(''); setActive(-1); setOpen(false) }
  const pick = (id: string) => { onPick(id); setQ(''); setActive(-1); setOpen(false) }
  const pickSection = (id: string) => { onPickSection(id); setQ(''); setActive(-1); setOpen(false) }
  const optId = (i: number) => `${listId}-opt-${i}`
  const walk = (dir: 1 | -1) => setActive((a) => {
    const n = options.length ? (a < 0 ? (dir === 1 ? 0 : options.length - 1) : (a + dir + options.length) % options.length) : -1
    if (n >= 0) requestAnimationFrame(() => document.getElementById(optId(n))?.scrollIntoView({ block: 'nearest' }))
    return n
  })
  const onKey = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); if (!open) setOpen(true); walk(1) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); if (!open) setOpen(true); walk(-1) }
    else if (e.key === 'Enter') { e.preventDefault(); const o = active >= 0 ? options[active] : undefined; if (o?.kind === 'item') pick(o.id); else if (o?.kind === 'section') pickSection(o.id); else if (o?.kind === 'allTypes') { setAllTypes((v) => !v); setActive(-1) } else create() }
    else if (e.key === 'Escape') { close(); (e.target as HTMLInputElement).blur() }
  }
  // Focus leaving the field closes the popover — unless it went INTO the popover (a row or Create New Item press).
  const onBlur = (e: FocusEvent<HTMLInputElement>) => { const t = e.relatedTarget; if (!(t instanceof Element && t.closest('[data-om-menu]'))) shut() }
  return (
    <div className={styles.addRow} role="row" data-add-item="">
      <div className={styles.addInner} role="cell">
        {autonumber ? <span className={styles.addNum}>{number}</span> : null}
        <div ref={anchor} className={styles.addField}>
          <TextField label="Add Item" value={q} size="s" inputRef={inputRef} onChange={(v) => { setQ(v); setActive(-1); if (!open) setOpen(true) }} onKeyDown={onKey}
                     inputProps={{ role: 'combobox', 'aria-expanded': open, 'aria-controls': open ? listId : undefined, 'aria-autocomplete': 'list', 'aria-activedescendant': open && active >= 0 ? optId(active) : undefined, autoComplete: 'off', onBlur }} />
          <PortalMenu open={open} anchor={anchor} onClose={close} role="listbox" width={360} id={listId} className={sec.popoverMenu} autoFocus={false}>
            <div className={sec.popover}>
              <div className={sec.popCreate}><Button variant="primary" appearance="outlined" onPress={create}>Create New Item</Button></div>
              <div className={sec.popList} data-testid="add-item-list">
                <div className={sec.popHead}>My Items ({matches.length})</div>
                {matches.length === 0 ? <div className={sec.popEmpty}>{q.trim() ? `No items match “${q.trim()}”` : 'Nothing in My Items yet'}</div> : matches.map((p) => { const i = idx('item', p.id); return (
                  <button key={p.id} id={optId(i)} type="button" role="option" aria-selected={i === active} data-active={i === active || undefined} className={sec.popRow} onClick={() => pick(p.id)}>
                    <span className={sec.popThumb}>
                      {p.thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.thumb} alt="" />
                      ) : <Icon name={ITEM_KIND_ICON[isItemKind(p.kind) ? p.kind : 'purchase']} size={24} weight={300} />}
                    </span>
                    <span className={sec.popText}>
                      <span className={sec.popName}>{p.name}</span>
                      <span className={sec.popMeta}>{money2(p.costMinor + p.markupMinor)} / {p.unit}{p.vendor ? ` · by ${p.vendor}` : ''}{p.status === 'proposed' ? ' · Proposed' : ''}</span>   {/* (REG-594; REG-652 a proposal of your own says so) */}
                    </span>
                  </button>
                ) })}
                {sectionMatches.length || otherTypes ? (
                  <>
                    <div className={sec.popHead}>
                      <span>My Sections ({sectionMatches.length}){sectionsLocked ? <> <ProTag /></> : null}</span>
                      {typeToggle ? <button type="button" id={optId(idx('allTypes', 'all-types'))} role="option" aria-selected={active === idx('allTypes', 'all-types')} data-active={active === idx('allTypes', 'all-types') || undefined} className={sec.popToggle} data-testid="sections-all-types" onMouseDown={(e) => e.preventDefault()} onClick={() => setAllTypes((v) => !v)}>{allTypes ? `For ${propertyType} only` : `Show all · ${otherTypes} more`}</button> : null}
                    </div>
                    {sectionMatches.map((x) => {
                      const i = idx('section', x.id)
                      return (
                        <button key={x.id} id={optId(i)} type="button" role="option" aria-selected={i === active} data-active={i === active || undefined} className={sec.popRow} data-testid="my-section" onClick={() => pickSection(x.id)}>
                          <span className={sec.popThumb}><Icon name="format_list_bulleted" size={24} weight={300} /></span>
                          <span className={sec.popText}>
                            <span className={sec.popName}>{x.name}</span>
                            <span className={sec.popMeta}>Section · {x.count} {x.count === 1 ? 'item' : 'items'}{x.propertyType ? ` · ${x.propertyType}` : ''}{x.tags.length ? ` · ${x.tags.join(', ')}` : ''}</span>
                          </span>
                        </button>
                      )
                    })}
                  </>
                ) : null}
              </div>
            </div>
          </PortalMenu>
        </div>
        <button type="button" className={styles.link} onClick={onViewPriceBook}>Price book</button>   {/* (REG-662, owner 2026-09-25) one name — the modal, Company's page and this link */}
        {/* (pending modules S12) shown only while a line not taken from My Items reads like an item in it — the review fills their costs */}
        {matchCount > 0 && onMatch ? <button type="button" className={styles.link} onClick={onMatch} data-testid="match-link" aria-label={`Match ${matchCount} ${matchCount === 1 ? 'line' : 'lines'} to the Price book`}>{`Match ${matchCount} ${matchCount === 1 ? 'line' : 'lines'}`}</button> : null}
        <button type="button" className={styles.link} onClick={onExport}>Export As</button>
      </div>
    </div>
  )
}

/** (REG-497) The small eye on a head whose column prints for the client under the quote's template. */
function ClientEye() {
  return (
    <Tooltip label="Prints for the client">
      <span className={styles.clientEye} aria-label="Prints for the client" role="img"><Icon name="visibility" size={14} weight={300} /></span>
    </Tooltip>
  )
}
