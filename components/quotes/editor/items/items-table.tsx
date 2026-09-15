'use client'

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type FocusEvent, type KeyboardEvent } from 'react'
import { Button, Checkbox } from '@/components/ds'
import { ColumnResizer, useColumnWidths } from '@/components/om/column-resize'
import { Icon } from '@/components/om/icon'
import { PortalMenu } from '@/components/om/portal-menu'
import { TextField } from '@/components/om/text-field'
import { Tooltip } from '@/components/om/tooltip'
import { useComingSoon } from '@/components/om/snackbar'
import type { PriceBookItem, QuoteItem } from '@/lib/db/schema'
import { COLUMN_LABEL, ITEM_KIND_ICON, ITEM_KIND_LABEL, isItemKind, isItemStatus, UNLABELLED, type ColumnKey, type ColumnSettings, type ItemsDensity, type ItemsView } from '@/lib/quotes/items-model'
import { countedLines, flattenItems, groupTotals, lineCostMinor, lineTotalMinor, markupPct, money2, pct, unitPriceMinor } from '@/lib/quotes/math'
import { ItemRow, COL_CLASS, type ColWidths, type RowHandlers } from './item-row'

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
/** What a column shows on every display row, as [text, extra px] — the extra is a glyph / chevron / chip chrome beside the text. */
function columnTexts(key: ColumnKey, display: Display[], items: QuoteItem[]): [string, number][] {
  const out: [string, number][] = []
  const counted = new Set(countedLines(items).map((l) => l.id))
  for (const d of display) {
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
      case 'status': if (!i.parentId) out.push([isItemStatus(i.status) ? i.status : 'Pending', 64]); break   // chip: glyph 16 + 4 · label · 8 + chevron 20, p8 ×2
      case 'qty': if (!isGroup) out.push([fmtNum(i.qty), 0]); break
      case 'unit': if (!isGroup) out.push([i.unit ?? 'Add Unit Type', 24]); break   // + the select's chevron 16 and gap
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
      case 'section': out.push([i.section ?? 'Add Section', 24]); break
      case 'type': if (!isGroup) out.push([isItemKind(i.icon) ? ITEM_KIND_LABEL[i.icon] : '–', 0]); break
      case 'margin': { const price = isGroup ? sums!.unitPriceMinor : unitPriceMinor(i); const cost = isGroup ? sums!.costMinor : i.costMinor; out.push([price > 0 ? pct(Number((((price - cost) / price) * 100).toFixed(1))) : '–', 0]); break }
      default: out.push(['–', 0])
    }
  }
  return out
}
import styles from './items-table.module.css'
import sec from './items-section.module.css'

/** One display row: a line, or a view bucket's header (Category / Room / Section). */
type Display =
  | { kind: 'row'; item: QuoteItem; number: string; bucket: string | null }
  | { kind: 'bucket'; key: string; name: string; number: string; ids: string[]; lines: QuoteItem[] }

/** Group the quote's lines the way "View by" asks: every top-level line (and a group's children with it) under its label. */
export function buildDisplay(items: QuoteItem[], view: ItemsView, labels: string[], collapsedBuckets: Set<string>): Display[] {
  const flat = flattenItems(items)
  const folded = new Set(items.filter((i) => i.kind === 'group' && i.collapsed).map((i) => i.id))
  if (view === 'none') {
    const out: Display[] = []
    const num = new Map<string, string>()
    let n = 0
    const childN = new Map<string, number>()
    for (const i of flat) {
      if (!i.parentId) { n += 1; num.set(i.id, String(n)) }
      else { const k = (childN.get(i.parentId) ?? 0) + 1; childN.set(i.parentId, k); num.set(i.id, `${num.get(i.parentId)}.${k}`) }
      if (i.parentId && folded.has(i.parentId)) continue
      out.push({ kind: 'row', item: i, number: num.get(i.id)!, bucket: null })
    }
    return out
  }
  const field = view
  const labelOf = (i: QuoteItem): string => {
    const own = i[field]
    if (own) return own
    if (i.parentId) { const p = items.find((x) => x.id === i.parentId); if (p?.[field]) return p[field]! }
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
    for (const r of rows) { if (r.kind === 'group') lines.push(...items.filter((c) => c.parentId === r.id)); else lines.push(r) }
    if (rows.length === 0 && !labels.includes(label)) return
    const bn = String(bi + 1)
    out.push({ kind: 'bucket', key: label, name: label, number: bn, ids: rows.map((r) => r.id), lines })
    if (collapsedBuckets.has(label)) return
    rows.forEach((r, ri) => {
      const rn = `${bn}.${ri + 1}`
      out.push({ kind: 'row', item: r, number: rn, bucket: label })
      if (r.kind === 'group' && !folded.has(r.id)) {
        items.filter((c) => c.parentId === r.id).sort((a, b) => a.position - b.position).forEach((c, ci) => out.push({ kind: 'row', item: c, number: `${rn}.${ci + 1}`, bucket: label }))
      }
    })
  })
  return out
}

export function ItemsTable({
  items, priceBook, view, density, columns, details, labels, selected, collapsedBuckets, showFull, nextNumber, h,
  onSelectAll, onToggleBucket, onToggleAllBuckets, onCreate, onPickPriceBook, onViewPriceBook, onExport, addInputRef, addOpenTick,
}: {
  items: QuoteItem[]
  priceBook: PriceBookItem[]
  view: ItemsView
  density: ItemsDensity
  columns: ColumnKey[]
  details: ColumnSettings['details']
  labels: { rooms: string[]; categories: string[]; sections: string[] }
  selected: Set<string>
  collapsedBuckets: Set<string>
  showFull: Set<string>
  nextNumber: number
  h: RowHandlers
  onSelectAll: (on: boolean) => void
  onToggleBucket: (key: string) => void
  onToggleAllBuckets: () => void
  onCreate: (name: string) => void
  onPickPriceBook: (id: string) => void
  onViewPriceBook: () => void
  onExport: () => void
  addInputRef: React.RefObject<HTMLInputElement | null>
  /** Bumped by Create › From My Items: the popover opens without a keystroke. */
  addOpenTick: number
}) {
  const comingSoon = useComingSoon()
  const scroller = useRef<HTMLDivElement>(null)
  const headRef = useRef<HTMLDivElement>(null)
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

  const display = useMemo(() => {
    const viewLabels = view === 'room' ? labels.rooms : view === 'category' ? labels.categories : view === 'section' ? labels.sections : []
    return buildDisplay(items, view, viewLabels, collapsedBuckets)
  }, [items, view, labels, collapsedBuckets])
  // Content-fit, measured after layout in the cells' own fonts (the head's caption, the body's 14/400) — see columnTexts.
  useLayoutEffect(() => {
    const head = headRef.current
    if (!head) return
    const headCell = head.querySelector<HTMLElement>('[role="columnheader"]:last-child')
    const bodyCell = head.parentElement?.querySelector<HTMLElement>('[role="row"][data-item-id] [role="cell"]') ?? null
    const fontOf = (el: HTMLElement | null, fallback: string) => { if (!el) return fallback; const cs = getComputedStyle(el); return `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}` }
    const headFont = fontOf(headCell, '500 12px Inter'), bodyFont = fontOf(bodyCell, '400 14px Inter')
    const next: Partial<Record<ColumnKey, number>> = {}
    for (const c of columns) {
      let w = measure(COLUMN_LABEL[c].toUpperCase(), headFont)
      for (const [text, extra] of columnTexts(c, display, items)) w = Math.max(w, measure(text, bodyFont) + extra)
      next[c] = Math.max(MIN_COL, Math.ceil(w) + 36)   // the cell's 32 of padding + the input's 2 of border + 2 of slack (the box rounds up past the canvas measure)
    }
    setFit((cur) => (columns.every((c) => cur[c] === next[c]) && Object.keys(cur).length === columns.length ? cur : next))
  }, [columns, display, items, fontsReady])
  // What every row lays its cells to: the user's width, else the fit, else the stylesheet's mocked width (item-row.tsx COL_CLASS).
  const colW: ColWidths = useMemo(() => {
    const w: ColWidths = {}
    for (const c of columns) { const px = stored[c] ?? fit[c]; if (px) w[c] = px }
    if (stored.item) w.item = stored.item
    return w
  }, [columns, stored, fit])
  const itemStyle: CSSProperties | undefined = colW.item ? { width: colW.item } : undefined
  const groups = items.filter((i) => i.kind === 'group')
  const allIds = items.map((i) => i.id)
  const allOn = allIds.length > 0 && allIds.every((id) => selected.has(id))
  const [drag, setDrag] = useState<{ id: string; over: string | null; where: 'before' | 'after' | null } | null>(null)
  const rowH: RowHandlers = {
    ...h,
    onDragStart: (id) => { setDrag({ id, over: null, where: null }); h.onDragStart(id) },
    onDragOver: (id, where) => { setDrag((d) => (d ? { ...d, over: id, where } : d)); h.onDragOver(id, where) },
    onDrop: () => { setDrag(null); h.onDrop() },
    onDragEnd: () => { setDrag(null); h.onDragEnd() },
  }
  const anyFolded = collapsedBuckets.size > 0

  return (
    <div className={styles.wrap}>
      <div ref={scroller} className={styles.scroller} data-more={more || undefined} data-scrolled={scrolled || undefined}>
        <div className={styles.table} role="table" aria-label="Quote items" data-nonum={details.autonumber ? undefined : ''} data-cols={ITEMS_TABLE}>
          <div ref={headRef} className={styles.head} role="row">
            <div role="columnheader" className={`${styles.cell} ${styles.colSel}`}>
              {view !== 'none' ? (
                <Tooltip label={anyFolded ? 'Expand all' : 'Collapse all'}>
                  <button type="button" className={styles.foldAll} aria-label={anyFolded ? 'Expand all' : 'Collapse all'} onClick={onToggleAllBuckets}>
                    <Icon name={anyFolded ? 'expand_all' : 'collapse_all'} size={20} weight={300} />
                  </button>
                </Tooltip>
              ) : null}
              <span className={styles.check}><Checkbox isSelected={allOn} isDisabled={allIds.length === 0} onChange={(on: boolean) => onSelectAll(on)} aria-label="Select all items" /></span>
            </div>
            {details.autonumber ? <div role="columnheader" className={`${styles.cell} ${styles.colNum}`}>#</div> : null}
            <div role="columnheader" className={`${styles.cell} ${styles.colItem}`} style={itemStyle}>Item<ColumnResizer table={ITEMS_TABLE} column="item" label="Item" min={MIN_ITEM} /></div>
            {columns.map((c) => (
              <div key={c} role="columnheader" className={`${styles.cell} ${COL_CLASS[c]}`} style={colW[c] ? { width: colW[c] } : undefined}>
                {COLUMN_LABEL[c]}<ColumnResizer table={ITEMS_TABLE} column={c} label={COLUMN_LABEL[c]} min={MIN_COL} />
              </div>
            ))}
            <div role="columnheader" className={`${styles.cell} ${styles.colAdd}`}>
              <Tooltip label="Add column">
                <button type="button" className={styles.foldAll} aria-label="Add column" onClick={comingSoon}><Icon name="add_box" size={20} weight={300} /></button>
              </Tooltip>
            </div>
            <div role="columnheader" className={`${styles.cell} ${styles.colTotal}`}>Total</div>
          </div>
          {display.map((d) => d.kind === 'bucket' ? (
            <BucketRow key={`b-${d.key}`} d={d} all={items} columns={columns} colW={colW} autonumber={details.autonumber} folded={collapsedBuckets.has(d.key)} onToggle={() => onToggleBucket(d.key)} />
          ) : (
            <ItemRow key={d.item.id} item={d.item} all={items} number={d.number} columns={columns} colW={colW} details={details} density={density}
                     selected={selected.has(d.item.id)} groups={groups} selectedCount={selected.size} labels={labels}
                     dragOver={drag && drag.over === d.item.id && drag.id !== d.item.id ? drag.where : null} dragging={drag?.id === d.item.id}
                     showFull={showFull.has(d.item.id)} h={rowH} />
          ))}
          <AddItemRow number={nextNumber} autonumber={details.autonumber} priceBook={priceBook} onCreate={onCreate} onPick={onPickPriceBook} onViewPriceBook={onViewPriceBook} onExport={onExport} inputRef={addInputRef} openTick={addOpenTick} />
        </div>
      </div>
    </div>
  )
}

/** A view bucket's header row (reference "1 · Design Time"): name, fold chevron and the sums of its lines. */
function BucketRow({ d, all, columns, colW, autonumber, folded, onToggle }: { d: Extract<Display, { kind: 'bucket' }>; all: QuoteItem[]; columns: ColumnKey[]; colW: ColWidths; autonumber: boolean; folded: boolean; onToggle: () => void }) {
  const counted = new Set(countedLines(all).map((l) => l.id))
  const lines = d.lines.filter((l) => counted.has(l.id))
  const cost = lines.reduce((s, l) => s + lineCostMinor(l), 0)
  const markup = lines.reduce((s, l) => s + Math.round(l.qty * l.markupMinor), 0)
  const price = lines.reduce((s, l) => s + Math.round(l.qty * unitPriceMinor(l)), 0)
  const total = lines.reduce((s, l) => s + lineTotalMinor(l), 0)
  const sum = (key: ColumnKey) => (key === 'cost' ? money2(cost) : key === 'markup' ? money2(markup) : key === 'unitPrice' ? money2(price) : '')
  return (
    <div className={styles.bucket} role="row">
      <div role="cell" className={`${styles.cell} ${styles.colSel}`} />
      {autonumber ? <div role="cell" className={`${styles.cell} ${styles.colNum}`}>{d.number}</div> : null}
      <div role="cell" className={`${styles.cell} ${styles.colItem}`} style={colW.item ? { width: colW.item } : undefined}>
        <span className={styles.bucketName}>{d.name}</span>
        <Tooltip label={folded ? 'Expand' : 'Collapse'}>
          <button type="button" className={styles.fold} aria-label={folded ? `Expand ${d.name}` : `Collapse ${d.name}`} aria-expanded={!folded} onClick={onToggle}>
            <Icon name={folded ? 'keyboard_arrow_down' : 'keyboard_arrow_up'} size={20} />
          </button>
        </Tooltip>
      </div>
      {columns.map((c) => <div key={c} role="cell" className={`${styles.cell} ${COL_CLASS[c]}`} style={colW[c] ? { width: colW[c] } : undefined}><span className={styles.sum}>{sum(c)}</span></div>)}
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
function AddItemRow({ number, autonumber, priceBook, onCreate, onPick, onViewPriceBook, onExport, inputRef, openTick }: {
  number: number; autonumber: boolean; priceBook: PriceBookItem[]; onCreate: (name: string) => void; onPick: (id: string) => void; onViewPriceBook: () => void; onExport: () => void
  inputRef: React.RefObject<HTMLInputElement | null>
  openTick: number
}) {
  const listId = useId()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [seenTick, setSeenTick] = useState(openTick)
  if (openTick !== seenTick) { setSeenTick(openTick); setOpen(true) }   // Create › From My Items opens it outright (render-phase adjust)
  const anchor = useRef<HTMLDivElement>(null)
  const matches = useMemo(() => {
    const s = q.trim().toLowerCase()
    return (s ? priceBook.filter((p) => p.name.toLowerCase().includes(s) || (p.description ?? '').toLowerCase().includes(s)) : priceBook).slice(0, 8)
  }, [q, priceBook])
  const create = () => { onCreate(q.trim()); setQ(''); setActive(-1); setOpen(false) }
  const pick = (id: string) => { onPick(id); setQ(''); setActive(-1); setOpen(false) }
  const onKey = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); if (!open) setOpen(true); setActive((a) => (matches.length ? (a + 1) % matches.length : -1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); if (!open) setOpen(true); setActive((a) => (matches.length ? (a <= 0 ? matches.length - 1 : a - 1) : -1)) }
    else if (e.key === 'Enter') { e.preventDefault(); const m = active >= 0 ? matches[active] : undefined; if (m) pick(m.id); else create() }
    else if (e.key === 'Escape') { setOpen(false); setActive(-1); (e.target as HTMLInputElement).blur() }
  }
  // Focus leaving the field closes the popover — unless it went INTO the popover (a row or Create New Item press).
  const onBlur = (e: FocusEvent<HTMLInputElement>) => { const t = e.relatedTarget; if (!(t instanceof Element && t.closest('[data-om-menu]'))) { setOpen(false); setActive(-1) } }
  const optId = (i: number) => `${listId}-opt-${i}`
  return (
    <div className={styles.addRow} role="row">
      <div className={styles.addInner} role="cell">
        {autonumber ? <span className={styles.addNum}>{number}</span> : null}
        <div ref={anchor} className={styles.addField}>
          <TextField label="Add Item" value={q} size="s" inputRef={inputRef} onChange={(v) => { setQ(v); setActive(-1); if (!open) setOpen(true) }} onKeyDown={onKey}
                     inputProps={{ role: 'combobox', 'aria-expanded': open, 'aria-controls': open ? listId : undefined, 'aria-autocomplete': 'list', 'aria-activedescendant': open && active >= 0 ? optId(active) : undefined, autoComplete: 'off', onBlur }} />
          <PortalMenu open={open} anchor={anchor} onClose={() => { setOpen(false); setActive(-1) }} role="listbox" width={360} id={listId} className={sec.popoverMenu}>
            <div className={sec.popover}>
              <div className={sec.popCreate}><Button variant="primary" appearance="outlined" onPress={create}>Create New Item</Button></div>
              <div className={sec.popHead}>My Items ({matches.length})</div>
              {matches.length === 0 ? <div className={sec.popEmpty}>No items match “{q.trim()}”</div> : matches.map((p, i) => (
                <button key={p.id} id={optId(i)} type="button" role="option" aria-selected={i === active} data-active={i === active || undefined} className={sec.popRow} onClick={() => pick(p.id)}>
                  <span className={sec.popThumb}>
                    {p.thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.thumb} alt="" />
                    ) : <Icon name={ITEM_KIND_ICON[isItemKind(p.kind) ? p.kind : 'purchase']} size={24} weight={300} />}
                  </span>
                  <span className={sec.popText}>
                    <span className={sec.popName}>{p.name}</span>
                    <span className={sec.popMeta}>{money2(p.costMinor + p.markupMinor)} / {p.unit}</span>
                  </span>
                </button>
              ))}
            </div>
          </PortalMenu>
        </div>
        <button type="button" className={styles.link} onClick={onViewPriceBook}>View Price Book</button>
        <button type="button" className={styles.link} onClick={onExport}>Export As</button>
      </div>
    </div>
  )
}
