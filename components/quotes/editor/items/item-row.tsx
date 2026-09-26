'use client'

import { useRef, useState, type CSSProperties, type FocusEvent, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { Checkbox, Tag } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import type { QuoteItem } from '@/lib/db/schema'
import { HIGHLIGHT_KIND, htmlToPlain, ITEM_KIND_ICON, ITEM_KIND_LABEL, isHighlight, isItemKind, isVisibility, printAsWord, type ColumnKey, type ColumnSettings, type Highlight, type ItemKind, type ItemsDensity, type PrintAs, type RowMenuAction, type Visibility } from '@/lib/quotes/items-model'
import { belowCost, depthOf, descendantIds, groupTotals, lineCostMinor, lineTotalMinor, markupPct, money2, pct, unitPriceMinor } from '@/lib/quotes/math'
import type { ItemPatch } from '@/app/quotes/items-actions'
import { LinkCell, MoneyCell, NumberCell, TextCell } from './cell-input'
import { DescriptionDialog } from './description-dialog'
import { LabelMenu, RowMenu, ThumbMenu, UnitMenu, VisibilityMenu } from './table-menus'
import styles from './items-table.module.css'

export const COL_CLASS: Record<ColumnKey, string | undefined> = {
  qty: styles.colQty, unit: styles.colUnit, cost: styles.colCost, markup: styles.colMarkup, unitPrice: styles.colUnitPrice,
  discount: styles.colDiscount, gst: styles.colGst, room: styles.colRoom, category: styles.colCategory, section: styles.colCategory, type: styles.colType, margin: styles.colMargin,
  sku: styles.colType, msrp: styles.colCost, color: styles.colRoom, dimensions: styles.colRoom, materials: styles.colRoom, shipping: styles.colCost, shippingMarkup: styles.colMarkup, taxable: styles.colGst, vendor: styles.colRoom, website: styles.colRoom,
  rebate: styles.colCost,   // (REG-596)
}

/** Per-column widths (px) — the user's drag, else the content fit (items-table.tsx); a column not in it keeps COL_CLASS's mocked width. */
export type ColWidths = Partial<Record<ColumnKey | 'item', number>>

export type RowHandlers = {
  onPatch: (id: string, patch: ItemPatch) => void
  /** A checkbox press; `range` (Shift held) selects the run from the last row touched, as the Tasks table does (REG-475). */
  onSelect: (id: string, on: boolean, range?: boolean) => void
  onSelectRun: (ids: string[]) => void
  /** Drag-fill released / Cmd+D (REG-477): the source cell's column value into every target line. */
  onFill: (col: string, sourceId: string, targetIds: string[]) => void
  onInsertBelow: (item: QuoteItem) => void
  onMenu: (item: QuoteItem, action: RowMenuAction) => void
  onChooseGroup: (item: QuoteItem, groupId: string | null) => void
  /** (REG-555 · REG-556) Print as and Highlight from the row menu. */
  onPrintAs: (item: QuoteItem, v: PrintAs | null) => void
  onHighlight: (item: QuoteItem, v: Highlight | null) => void
  onUploadImage: (item: QuoteItem) => void
  /** Upload Logo (REG-415: coming soon) — the house snackbar, never a silent no-op. */
  onComingSoon: () => void
  /** (sweep S1 · U-04) the line that asked: the new label lands on it */
  onAddLabel: (kind: 'room' | 'category' | 'section' | 'vendor', itemId?: string) => void
  /** (REG-623) A cell's word to the studio — a link that is not a web address. */
  onNote: (message: string) => void
  /** (REG-627, parity Q-30) The line's comments. */
  onComments: (item: QuoteItem) => void
  /** (REG-571) The handle pressed: the pointer drag starts (row-drag.ts). */
  onDragPointerDown: (id: string, e: ReactPointerEvent<HTMLButtonElement>) => void
}

/**
 * One table row (1260:31253 item · 31357 group · 31395 child): the selection cell (handle · + · checkbox), the number, the
 * ITEM cell (thumb, name, description), then the columns the settings keep on, and TOTAL frozen on the right with the
 * hovered row's kebab. A group prints the sums of its children and folds them; a child wears the tinted cell, the 32px
 * inset and the client-visibility eye. Every cell edits in place and the row autosaves (items-section.tsx).
 * `details` (column settings › ITEM DETAILS) switches the description line, the thumbnail and the number off (REG-417).
 */
export function ItemRow({ item, all, number, columns, colW, details, density, selected, groups, selectedCount, labels, dragging, shift, dropDepth, dragStyle, fresh, colStyle, showFull, fillCol, inFill, onFillStart, h, brandColors, comments = 0,
}: {
  /** (REG-627) How many comments the line's thread holds. */
  comments?: number
  item: QuoteItem
  all: QuoteItem[]
  /** The brand kit's colours by key: the Highlight bar and the menu's swatches follow the kit (REG-556). */
  brandColors: Record<string, string>
  number: string
  columns: ColumnKey[]
  colW: ColWidths
  details: ColumnSettings['details']
  density: ItemsDensity
  selected: boolean
  groups: QuoteItem[]
  selectedCount: number
  labels: { rooms: string[]; categories: string[]; sections: string[]; vendors: string[]; tradeNotes?: Record<string, string> }
  /** (REG-571) In the lifted block · slid aside by px · the lifted row's indent cue for the slot's depth · the slide's transform. */
  dragging: boolean
  shift: number
  dropDepth: number | null
  dragStyle?: CSSProperties
  /** (REG-573) The row just arrived — one pulse. */
  fresh: boolean
  /** (REG-572) The column drag's live transform, on this row's cell of each column. */
  colStyle?: (key: ColumnKey) => CSSProperties | undefined
  showFull: boolean
  /** The drag-fill in progress (REG-477): its column, and whether this row is inside the range it will fill. */
  fillCol: ColumnKey | null
  inFill: boolean
  onFillStart: (col: ColumnKey, id: string) => void
  h: RowHandlers
}) {
  const [menu, setMenu] = useState<'unit' | 'room' | 'category' | 'section' | 'vendor' | 'thumb' | 'vis' | 'row' | null>(null)
  const [descOpen, setDescOpen] = useState(false)
  /* The row is ACTIVE while an editable control holds the focus — a cell input, a select, the description — or one of its
     select menus is open; never because a button in it (the group's fold, the checkbox, the chip, the kebab) was pressed
     (owner 2026-09-15: "when i expand the description is getting active which shouldn't"). `data-edit` marks the controls. */
  const [editing, setEditing] = useState(false)
  const isEdit = (t: EventTarget | null) => t instanceof Element && t.hasAttribute('data-edit')
  const onFocusCapture = (e: FocusEvent<HTMLDivElement>) => { if (isEdit(e.target)) setEditing(true) }
  const onBlurCapture = (e: FocusEvent<HTMLDivElement>) => { const next = e.relatedTarget; if (!(next instanceof Element && e.currentTarget.contains(next) && isEdit(next))) setEditing(false) }
  const unitRef = useRef<HTMLButtonElement>(null)
  const roomRef = useRef<HTMLButtonElement>(null)
  const catRef = useRef<HTMLButtonElement>(null)
  const secRef = useRef<HTMLButtonElement>(null)
  const vendorRef = useRef<HTMLButtonElement>(null)
  const thumbRef = useRef<HTMLButtonElement>(null)
  const eyeRef = useRef<HTMLButtonElement>(null)
  const kebabRef = useRef<HTMLSpanElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const descRef = useRef<HTMLInputElement>(null)
  const isGroup = item.kind === 'group'
  const child = !!item.parentId
  const depth = child ? depthOf(all, item.id) : 0   // (REG-558) 1 in a section, 2 in a sub-section
  const sums = isGroup ? groupTotals(all, item.id) : null
  const childCount = isGroup ? [...descendantIds(all, [item.id])].filter((id) => id !== item.id && all.find((x) => x.id === id)?.kind === 'item').length : 0
  /* (REG-556) Highlight: an ink colours the words, a fill tints the row — both from the kit. (REG-555) Print as: the word the client reads. */
  const hl: Highlight | null = isHighlight(item.highlight) ? item.highlight : null
  const word = isGroup ? '' : printAsWord(item)
  const rich = !!item.descriptionHtml   // (REG-557) a formatted description edits in the dialog, never in the one-line box
  const vis: Visibility = isVisibility(item.visibility) ? item.visibility : 'visible'
  const kind: ItemKind | null = isItemKind(item.icon) ? item.icon : null
  const patch = (p: ItemPatch) => h.onPatch(item.id, p)
  const toggle = (m: typeof menu) => setMenu((cur) => (cur === m ? null : m))
  /* Backspace / Delete on a focused select clears it, as a spreadsheet clears the cell (REG-475); the rest of the keys are the grid's. */
  const clearKey = (has: boolean, clear: () => void) => (e: KeyboardEvent<HTMLButtonElement>) => { if (e.key === 'Backspace' || e.key === 'Delete') { e.preventDefault(); if (has) clear() } }
  const shiftHeld = useRef(false)

  /* Drag-fill (REG-477, the Excel benchmark's phase 3): the small square at a focused box's corner; every editable column cell can be
     a source or a target — a group's only where it has the cell (its labels). `data-fill` outlines the cells a drag is about to fill. */
  const FILLABLE: readonly ColumnKey[] = ['qty', 'unit', 'cost', 'markup', 'unitPrice', 'discount', 'gst', 'room', 'category', 'section', 'rebate', 'vendor', 'website']
  const fillable = (key: ColumnKey) => FILLABLE.includes(key) && (!isGroup || key === 'room' || key === 'category' || key === 'section')
  /* (REG-623, parity Q-13) A line selling under its cost wears a red tag — only while the Cost column is on: a screen shared with
     "Show only what the client sees" never says it. */
  const under = !isGroup && columns.includes('cost') && belowCost(item)
  const cell = (key: ColumnKey) => {
    const cls = `${styles.cell} ${COL_CLASS[key]}`
    const st: CSSProperties | undefined = colW[key] || colStyle ? { ...(colW[key] ? { width: colW[key] } : {}), ...colStyle?.(key) } : undefined
    const body = (() => {
      switch (key) {
        case 'qty':
          return isGroup ? null : <NumberCell value={item.qty} onCommit={(v) => patch({ qty: v })} ariaLabel={`Quantity of ${item.name}`} />
        case 'unit':
          return isGroup ? null : (
            <>
              <button ref={unitRef} type="button" className={styles.pick} data-edit="" data-empty={item.unit ? undefined : ''} aria-haspopup="menu" aria-expanded={menu === 'unit'} onClick={() => toggle('unit')} onKeyDown={clearKey(!!item.unit, () => patch({ unit: null }))}>
                <span>{item.unit ?? 'Unit · e.g. sqft'}</span><span className={styles.pickChev}><Icon name="expand_more" size={16} /></span>   {/* (REG-560) the tester's hint: the empty cell names what goes in it */}
              </button>
              <UnitMenu open={menu === 'unit'} anchor={unitRef} value={item.unit} onClose={() => setMenu(null)} onPick={(u) => patch({ unit: u })} />
            </>
          )
        case 'cost':
          return isGroup ? <span className={styles.sum}>{money2(sums!.costMinor)}</span> : <MoneyCell minor={item.costMinor} onCommit={(v) => patch({ costMinor: v, markupMinor: Math.max(-v, item.markupMinor) })} ariaLabel={`Cost of ${item.name}`} />
        case 'markup':
          return isGroup ? <><span className={styles.sum}>{money2(sums!.markupMinor)}</span><span className={styles.sub}>({pct(Number((sums!.costMinor > 0 ? (sums!.markupMinor / sums!.costMinor) * 100 : 0).toFixed(2)))})</span></> : (
            <>
              <MoneyCell fit signed minor={item.markupMinor} onCommit={(v) => patch({ markupMinor: Math.max(-item.costMinor, v) })} ariaLabel={`Markup of ${item.name}`} />
              <span className={styles.sub}>({pct(Number(markupPct(item).toFixed(2)))})</span>
            </>
          )
        case 'unitPrice':
          // Unit Price = Cost + Markup; the markup absorbs the change and never takes the price below zero (REG-417).
          return isGroup ? <span className={styles.sum}>{money2(sums!.unitPriceMinor)}</span> : <MoneyCell minor={unitPriceMinor(item)} onCommit={(v) => patch({ markupMinor: Math.max(-item.costMinor, v - item.costMinor) })} ariaLabel={`Unit price of ${item.name}`} />
        case 'discount':
          return isGroup ? null : <NumberCell value={item.discountPct} suffix="%" max={100} onCommit={(v) => patch({ discountPct: v })} ariaLabel={`Discount of ${item.name}`} />
        case 'gst':
          return isGroup ? null : <NumberCell value={item.gstPct} max={100} onCommit={(v) => patch({ gstPct: v })} ariaLabel={`GST of ${item.name}`} />
        case 'room': case 'category': case 'section': {
          const ref = key === 'room' ? roomRef : key === 'category' ? catRef : secRef
          const value = item[key]
          const options = key === 'room' ? labels.rooms : key === 'category' ? labels.categories : labels.sections
          const empty = key === 'room' ? 'Add Room' : key === 'category' ? 'Add Category' : 'Add label'   // (REG-574) the free label's column is "Section label"; the grid's sections took "Section"
          const title = key === 'room' ? 'Room' : key === 'category' ? 'Category' : 'Section label'
          return (
            <>
              <button ref={ref} type="button" className={styles.pick} data-edit="" data-empty={value ? undefined : ''} aria-haspopup="menu" aria-expanded={menu === key} onClick={() => toggle(key)} onKeyDown={clearKey(!!value, () => patch({ [key]: null } as ItemPatch))}>
                <span>{value ?? empty}</span><span className={styles.pickChev}><Icon name="expand_more" size={16} /></span>
              </button>
              <LabelMenu open={menu === key} anchor={ref} options={options} value={value} onClose={() => setMenu(null)} title={title}
                         onPick={(v) => patch({ [key]: v } as ItemPatch)} addLabel={empty} onAdd={() => h.onAddLabel(key, item.id)} />
            </>
          )
        }
        case 'vendor':   // (REG-623, parity Q-08) who supplies the line: My Items' vendors, the ones added on this quote, the ones in use
          return isGroup ? null : (
            <>
              <button ref={vendorRef} type="button" className={styles.pick} data-edit="" data-empty={item.vendor ? undefined : ''} aria-haspopup="menu" aria-expanded={menu === 'vendor'} aria-label={item.vendor ? `Vendor of ${item.name}: ${item.vendor}` : `Add a vendor to ${item.name}`} onClick={() => toggle('vendor')} onKeyDown={clearKey(!!item.vendor, () => patch({ vendor: null }))}>
                <span>{item.vendor ?? 'Add vendor'}</span><span className={styles.pickChev}><Icon name="expand_more" size={16} /></span>
              </button>
              <LabelMenu open={menu === 'vendor'} anchor={vendorRef} options={labels.vendors} value={item.vendor} onClose={() => setMenu(null)} title="Vendor/Sub"
                         onPick={(v) => patch({ vendor: v })} addLabel="Add vendor" onAdd={() => h.onAddLabel('vendor', item.id)} />
            </>
          )
        case 'website':   // (REG-623, parity Q-09) a product or spec page, never printed
          return isGroup ? null : <LinkCell value={item.link} placeholder="Add link" onCommit={(v) => patch({ link: v })} ariaLabel={`Link for ${item.name}`}
                                            onInvalid={() => h.onNote('Not a web address — a link starts with https://')} />
        case 'type':
          return isGroup ? null : <span className={kind ? undefined : styles.muted}>{kind ? ITEM_KIND_LABEL[kind] : '–'}</span>
        case 'rebate':   // (REG-596) Owners only — the table hides the column for everyone else
          return isGroup ? null : <MoneyCell minor={item.rebateMinor} onCommit={(v) => patch({ rebateMinor: v })} ariaLabel={`Rebate on ${item.name}`} />
        case 'margin': {
          const price = isGroup ? sums!.unitPriceMinor : unitPriceMinor(item)
          const cost = isGroup ? sums!.costMinor : item.costMinor
          return price > 0 ? pct(Number((((price - cost) / price) * 100).toFixed(1))) : '–'
        }
        default:
          return <span className={styles.muted}>–</span>
      }
    })()
    return (
      <div key={key} role="cell" className={cls} style={st} data-col={key} data-fill={(inFill && fillCol === key) || undefined}>
        {body}
        {fillable(key) ? <span className={styles.fillHandle} data-fill-handle aria-hidden onPointerDown={(e) => { if (e.button !== 0) return; e.preventDefault(); e.stopPropagation(); onFillStart(key, item.id) }} /> : null}
      </div>
    )
  }

  const total = isGroup ? sums!.totalMinor : lineTotalMinor(item)
  return (
    <div className={styles.row} role="row" data-item-id={item.id} data-density={density} data-group={item.kind === 'group' || undefined} data-child={child || undefined} data-depth={depth || undefined} data-selected={selected || undefined}
         data-highlight={hl ? HIGHLIGHT_KIND[hl] : undefined} style={hl || dragStyle ? ({ ...(hl ? { '--hl': brandColors[hl] } : {}), ...dragStyle } as CSSProperties) : undefined}
         data-active={editing || menu === 'unit' || menu === 'room' || menu === 'category' || menu === 'section' || menu === 'vendor' || undefined}
         data-dragging={dragging || undefined} data-drop-depth={dropDepth ?? undefined} data-shift={shift ? '' : undefined} data-fresh={fresh || undefined} data-full={showFull || undefined}
         onFocusCapture={onFocusCapture} onBlurCapture={onBlurCapture}
         onPointerMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); e.currentTarget.style.setProperty('--ix', `${Math.round(e.clientX - r.left)}px`) }}>
      {/* (REG-527, owner 2026-09-18) A + on the row's bottom edge that follows the pointer, so adding a line below never means
          travelling to the leading +. Bottom only (owner: "remove the top one"). Hover only — a finger keeps the leading + and the kebab. */}
      <Tooltip label="Add item below"><button type="button" className={styles.edgeAdd} data-edge="bottom" aria-label={`Add item below ${item.name}`} tabIndex={-1} onClick={() => h.onInsertBelow(item)}><Icon name="add" size={16} /></button></Tooltip>
      <span className={styles.edgeLine} data-edge="bottom" aria-hidden />
      <div role="cell" className={`${styles.cell} ${styles.colSel}`}>
        <Tooltip label="Drag to reorder">
          {/* (REG-571) The pointer drag starts here — a finger lifts a row too. */}
          <button type="button" className={styles.handle} aria-label={`Drag to reorder ${item.name}`} onPointerDown={(e) => h.onDragPointerDown(item.id, e)}>
            <Icon name="drag_indicator" size={20} weight={300} />
          </button>
        </Tooltip>
        <Tooltip label="Add item below">
          <button type="button" className={styles.plus} aria-label={`Add item below ${item.name}`} onClick={() => h.onInsertBelow(item)}>
            <Icon name="add" size={20} weight={300} />
          </button>
        </Tooltip>
        {/* The DS Checkbox reports the next state, not the event, so Shift is read off the press on its way in (the Tasks table's rule). */}
        <span className={styles.check} onClickCapture={(e) => { shiftHeld.current = e.shiftKey }} onKeyDownCapture={(e) => { shiftHeld.current = e.shiftKey }}>
          <Checkbox isSelected={selected} onChange={(on: boolean) => h.onSelect(item.id, on, shiftHeld.current)} aria-label={`Select ${item.name}`} />
        </span>
      </div>
      {details.autonumber ? <div role="cell" className={`${styles.cell} ${styles.colNum}`}>{item.noNumber && !isGroup ? <Tooltip label="No number — the numbering skips this line"><span className={styles.muted} aria-label="No number">–</span></Tooltip> : number}</div> : null}
      <div role="cell" className={`${styles.cell} ${styles.colItem}`} style={colW.item ? { width: colW.item } : undefined}>
        {isGroup || child ? <span className={styles.groupBar} aria-hidden /> : null}
        {details.images ? (
          <Tooltip label="Image" disabled={menu === 'thumb'}>
            <button ref={thumbRef} type="button" className={styles.thumbBtn} aria-haspopup="menu" aria-expanded={menu === 'thumb'} aria-label={`Image for ${item.name}`} onClick={() => toggle('thumb')}>
              <span className={styles.thumb} data-empty={item.thumb || kind ? undefined : ''}>
                {item.thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.thumb} alt="" />
                ) : kind ? <Icon name={ITEM_KIND_ICON[kind]} size={24} weight={300} /> : <Icon name="add_photo_alternate" size={20} weight={300} />}
              </span>
              {item.thumb && item.thumbCount > 1 ? <span className={styles.badge}>1/{item.thumbCount}</span> : null}
            </button>
          </Tooltip>
        ) : null}
        <ThumbMenu open={menu === 'thumb'} anchor={thumbRef} icon={kind} onClose={() => setMenu(null)}
                   onUpload={() => h.onUploadImage(item)} onIcon={(k) => patch({ icon: k, thumb: null, thumbCount: 0 })} onLogo={h.onComingSoon} />
        <div className={styles.itemText}>
          {/* The name is text-wide; a press on the row's remaining width still lands the caret in it. */}
          <div className={styles.nameRow} onClick={(e) => { if (e.target === e.currentTarget) nameRef.current?.focus() }}>
            <TextCell value={item.name} kind="name" inputRef={nameRef} placeholder={isGroup ? 'New section' : 'Type item name'} onCommit={(v) => patch({ name: v })} ariaLabel={isGroup ? 'Section name' : 'Item name'} />
            {isGroup ? <span className={styles.groupTag}><Tag appearance="outlined" color="blue">{depth ? 'Sub-section' : 'Section'}</Tag></span> : null}   {/* (REG-567) the mock's "Group" reads "Section", as the templates say */}
            {isGroup && item.printOneLine ? <span className={styles.groupTag}><Tooltip label="Prints for the client as one line — the section’s name and its total. The lines stay yours."><span><Tag appearance="outlined">One line</Tag></span></Tooltip></span> : null}   {/* (REG-585) */}
            {word ? <span className={styles.groupTag}><Tooltip label={item.printAs === 'behalf' ? 'Paid on the client’s behalf — counts, no GST' : `Prints “${word}” in place of the amount — not counted`}><span><Tag appearance="outlined">{word}</Tag></span></Tooltip></span> : null}   {/* (REG-555) */}
            {!isGroup && item.optional ? <span className={styles.groupTag}><Tag appearance="outlined">Optional</Tag></span> : null}   {/* (REG-492) */}
            {!isGroup && item.optional && item.clientChoice ? <span className={styles.groupTag} data-testid="client-choice"><Tooltip label={item.clientChoice === 'want' ? 'Ticked on the confirmation link — clear its Optional mark to add it to the totals' : 'Left unticked on the confirmation link'}><span><Tag appearance="outlined" color={item.clientChoice === 'want' ? 'green' : undefined}>{item.clientChoice === 'want' ? 'Client wants it' : 'Client said no'}</Tag></span></Tooltip></span> : null}   {/* (REG-626, parity Q-32) */}
            {under ? <span className={styles.groupTag} data-testid="below-cost"><Tooltip label={`Sells for ${money2(lineTotalMinor(item))}, costs ${money2(lineCostMinor(item))} — ${money2(lineCostMinor(item) - lineTotalMinor(item))} under its cost`}><span><Tag appearance="outlined" color="red">Below cost</Tag></span></Tooltip></span> : null}   {/* (REG-623) */}
            {!isGroup && comments > 0 ? <Tooltip label={`${comments} ${comments === 1 ? 'comment' : 'comments'} — open the thread`}><button type="button" className={styles.commentCount} data-testid="line-comment-count" aria-label={`${comments} ${comments === 1 ? 'comment' : 'comments'} on ${item.name}`} onClick={() => h.onComments(item)}><Icon name="comment" size={16} weight={300} />{comments}</button></Tooltip> : null}   {/* (REG-627) */}
            {isGroup && childCount > 0 ? <span className={styles.groupCount}>{childCount} {childCount === 1 ? 'item' : 'items'}</span> : null}   {/* (REG-463) only once the group holds something */}   {/* a word, not a glyph nobody could read (owner 2026-09-16, REG-445) */}
            {child || vis !== 'visible' ? (   /* (sweep S1) a top-level line that isn't fully shown keeps its eye too — its state and the way back */
              <>
                <Tooltip label="Client visibility" disabled={menu === 'vis'}>
                  <button ref={eyeRef} type="button" className={styles.eye} aria-haspopup="menu" aria-expanded={menu === 'vis'} aria-label={`Client visibility: ${vis}`} onClick={() => toggle('vis')}>
                    <Icon name={vis === 'hidden' ? 'visibility_off' : 'visibility'} size={20} weight={300} fill />
                  </button>
                </Tooltip>
                <VisibilityMenu open={menu === 'vis'} anchor={eyeRef} value={vis} onClose={() => setMenu(null)} onPick={(v) => patch({ visibility: v })} />
              </>
            ) : null}
            {isGroup ? (
              <Tooltip label={item.collapsed ? 'Expand section' : 'Collapse section'}>
                <button type="button" className={styles.fold} aria-label={item.collapsed ? `Expand ${item.name}` : `Collapse ${item.name}`} aria-expanded={!item.collapsed} onClick={() => patch({ collapsed: !item.collapsed })}>
                  <Icon name={item.collapsed ? 'keyboard_arrow_down' : 'keyboard_arrow_up'} size={20} />
                </button>
              </Tooltip>
            ) : null}
          </div>
          {!details.description ? null : showFull || rich ? (
            /* (REG-557) A formatted description shows its plain text (bullets kept) and opens the editor on a press — the one-line box cannot hold the formatting. */
            <button type="button" className={`${styles.desc} ${styles.descBtn}`} data-rich={rich || undefined} data-full={showFull || undefined} onClick={() => setDescOpen(true)}>{(rich ? htmlToPlain(item.descriptionHtml!) : item.description) || 'Add a description'}</button>
          ) : (
            <>
              {/* At rest the description is text clamped to the density's lines (1260:31372: the base state is two); while the
                  row is active it is the 24px field (1271:40867) — the stylesheet swaps the two on :focus-within. */}
              {/* A press on the text opens its field: the row goes active first (the field is hidden at rest), then takes the caret. */}
              <span className={styles.descText} data-placeholder={item.description ? undefined : ''} aria-hidden
                    onMouseDown={(e) => { e.preventDefault(); setEditing(true); requestAnimationFrame(() => descRef.current?.focus()) }}>
                {item.description || 'Add a description'}
              </span>
              <TextCell value={item.description ?? ''} kind="desc" inputRef={descRef} placeholder="Add a description" onCommit={(v) => patch({ description: v })} ariaLabel="Description" />
            </>
          )}
          {!isGroup && details.description ? (
            /* (owner 2026-09-17, REG-478) The icon alone, hanging under the description box's right end as the ✕ / ✓ pair does
               (REG-472) — the mock's chip carried the word (1271:40880). mousedown swallowed: the box keeps its focus, so the
               row stays active through the press (the button only shows on an active row). */
            <Tooltip label="Expand">
              <button type="button" className={styles.expand} data-expand aria-label="Expand description" onMouseDown={(e) => e.preventDefault()} onClick={() => setDescOpen(true)}>
                <Icon name="expand_content" size={20} className={styles.expandGlyph} />
              </button>
            </Tooltip>
          ) : null}
        </div>
        {/* Expand = the S 400 modal with a bigger box (REG-444) — the in-house rich editor since REG-557 (bullets · numbers · bold · underline);
            Save writes through the row's patch, so it autosaves and undoes like a cell. A section's dialog edits its note under the band. */}
        <DescriptionDialog open={descOpen} name={item.name} kind={isGroup ? 'section' : 'item'} value={item.description ?? ''} html={item.descriptionHtml} onClose={() => setDescOpen(false)} tradeNote={isGroup ? labels.tradeNotes?.[item.name.trim().toLowerCase()] : undefined}
                           onSave={(text, html) => { if (text !== (item.description ?? '') || html !== (item.descriptionHtml ?? null)) patch({ description: text, descriptionHtml: html }) }} />
      </div>
      {columns.map(cell)}
      <div role="cell" className={`${styles.cell} ${styles.colAdd}`} />
      <div role="cell" className={`${styles.cell} ${styles.colTotal}`}>
        {word && item.printAs !== 'behalf' ? (
          /* (REG-555) The word the client reads stands where the amount would; the line's own figure stays under it for the studio —
             struck through, as it leaves the totals (REG-623: "S$1,950.00 · not counted" needed 160 px of the cell's 100 and lost its
             start; the words moved to the tooltip). */
          <Tooltip label={`Prints “${word}” — ${money2(total)} not counted`}>
            <span className={styles.totalWord} tabIndex={0}><span className={styles.total}>{word}</span><span className={styles.totalUnder} data-struck="">{money2(total)}</span></span>
          </Tooltip>
        ) : isGroup && item.printAsText ? (
          /* (REG-576) The sub-total's label with its cue — a bare word read as a stray. */
          <span className={styles.totalWord}><span className={styles.total}>{money2(total)}</span><span className={styles.totalUnder}>prints “{item.printAsText}”</span></span>
        ) : item.printAs === 'behalf' ? (
          /* The name's tag already says On behalf; the cell keeps what differs — no GST on it. */
          <span className={styles.totalWord}><span className={styles.total}>{money2(total)}</span><span className={styles.totalUnder}>no GST</span></span>
        ) : <span className={styles.total}>{money2(total)}</span>}
        <span ref={kebabRef} className={styles.kebab} data-open={menu === 'row' || undefined}>
          <Tooltip label="More options" disabled={menu === 'row'}>
            <span className={styles.float}>
              <IconButton icon="more_vert" label={`More options for ${item.name}`} variant="primary" aria-haspopup="menu" aria-expanded={menu === 'row'} onClick={() => toggle('row')} />
            </span>
          </Tooltip>
        </span>
        <RowMenu open={menu === 'row'} anchor={kebabRef} item={item} groups={groups} all={all} selectedCount={selected ? selectedCount : 1} brandColors={brandColors}
                 onClose={() => setMenu(null)} onAction={(a) => h.onMenu(item, a)} onChooseGroup={(g) => h.onChooseGroup(item, g)}
                 onPrintAs={(v) => h.onPrintAs(item, v)} onHighlight={(v) => h.onHighlight(item, v)} />
      </div>
    </div>
  )
}
