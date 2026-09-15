'use client'

import { useRef, useState, type DragEvent, type FocusEvent } from 'react'
import { Checkbox } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import type { QuoteItem } from '@/lib/db/schema'
import { ITEM_KIND_ICON, ITEM_KIND_LABEL, isItemKind, isVisibility, type ColumnKey, type ColumnSettings, type ItemKind, type ItemsDensity, type RowMenuAction, type Visibility } from '@/lib/quotes/items-model'
import { groupTotals, lineTotalMinor, markupPct, money2, pct, unitPriceMinor } from '@/lib/quotes/math'
import type { ItemPatch } from '@/app/quotes/items-actions'
import { MoneyCell, NumberCell, TextCell } from './cell-input'
import { LabelMenu, RowMenu, ThumbMenu, UnitMenu, VisibilityMenu } from './table-menus'
import styles from './items-table.module.css'

export const COL_CLASS: Record<ColumnKey, string | undefined> = {
  qty: styles.colQty, unit: styles.colUnit, cost: styles.colCost, markup: styles.colMarkup, unitPrice: styles.colUnitPrice,
  discount: styles.colDiscount, gst: styles.colGst, room: styles.colRoom, category: styles.colCategory, section: styles.colCategory, type: styles.colType, margin: styles.colMargin,
  sku: styles.colType, msrp: styles.colCost, color: styles.colRoom, dimensions: styles.colRoom, materials: styles.colRoom, shipping: styles.colCost, shippingMarkup: styles.colMarkup, taxable: styles.colGst, vendor: styles.colRoom, website: styles.colRoom,
}

/** Per-column widths (px) — the user's drag, else the content fit (items-table.tsx); a column not in it keeps COL_CLASS's mocked width. */
export type ColWidths = Partial<Record<ColumnKey | 'item', number>>

export type RowHandlers = {
  onPatch: (id: string, patch: ItemPatch) => void
  onSelect: (id: string, on: boolean) => void
  onInsertBelow: (item: QuoteItem) => void
  onMenu: (item: QuoteItem, action: RowMenuAction) => void
  onChooseGroup: (item: QuoteItem, groupId: string | null) => void
  onUploadImage: (item: QuoteItem) => void
  /** Upload Logo (REG-415: coming soon) — the house snackbar, never a silent no-op. */
  onComingSoon: () => void
  onAddLabel: (kind: 'room' | 'category' | 'section') => void
  onDragStart: (id: string) => void
  onDragOver: (id: string, where: 'before' | 'after') => void
  onDrop: () => void
  onDragEnd: () => void
}

/**
 * One table row (1260:31253 item · 31357 group · 31395 child): the selection cell (handle · + · checkbox), the number, the
 * ITEM cell (thumb, name, description), then the columns the settings keep on, and TOTAL frozen on the right with the
 * hovered row's kebab. A group prints the sums of its children and folds them; a child wears the tinted cell, the 32px
 * inset and the client-visibility eye. Every cell edits in place and the row autosaves (items-section.tsx).
 * `details` (column settings › ITEM DETAILS) switches the description line, the thumbnail and the number off (REG-417).
 */
export function ItemRow({ item, all, number, columns, colW, details, density, selected, groups, selectedCount, labels, dragOver, dragging, showFull, h }: {
  item: QuoteItem
  all: QuoteItem[]
  number: string
  columns: ColumnKey[]
  colW: ColWidths
  details: ColumnSettings['details']
  density: ItemsDensity
  selected: boolean
  groups: QuoteItem[]
  selectedCount: number
  labels: { rooms: string[]; categories: string[]; sections: string[] }
  dragOver: 'before' | 'after' | null
  dragging: boolean
  showFull: boolean
  h: RowHandlers
}) {
  const [menu, setMenu] = useState<'unit' | 'room' | 'category' | 'section' | 'thumb' | 'vis' | 'row' | null>(null)
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
  const thumbRef = useRef<HTMLButtonElement>(null)
  const eyeRef = useRef<HTMLButtonElement>(null)
  const kebabRef = useRef<HTMLSpanElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const descRef = useRef<HTMLInputElement>(null)
  const isGroup = item.kind === 'group'
  const child = !!item.parentId
  const sums = isGroup ? groupTotals(all, item.id) : null
  const vis: Visibility = isVisibility(item.visibility) ? item.visibility : 'visible'
  const kind: ItemKind | null = isItemKind(item.icon) ? item.icon : null
  const patch = (p: ItemPatch) => h.onPatch(item.id, p)
  const toggle = (m: typeof menu) => setMenu((cur) => (cur === m ? null : m))

  const onRowDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const r = e.currentTarget.getBoundingClientRect()
    h.onDragOver(item.id, e.clientY < r.top + r.height / 2 ? 'before' : 'after')
  }

  const cell = (key: ColumnKey) => {
    const cls = `${styles.cell} ${COL_CLASS[key]}`
    const st = colW[key] ? { width: colW[key] } : undefined
    switch (key) {
      case 'qty':
        return <div key={key} role="cell" className={cls} style={st}>{isGroup ? null : <NumberCell value={item.qty} onCommit={(v) => patch({ qty: v })} ariaLabel={`Quantity of ${item.name}`} />}</div>
      case 'unit':
        return (
          <div key={key} role="cell" className={cls} style={st}>
            {isGroup ? null : (
              <>
                <button ref={unitRef} type="button" className={styles.pick} data-edit="" data-empty={item.unit ? undefined : ''} aria-haspopup="menu" aria-expanded={menu === 'unit'} onClick={() => toggle('unit')}>
                  <span>{item.unit ?? 'Add Unit Type'}</span><span className={styles.pickChev}><Icon name="expand_more" size={16} /></span>
                </button>
                <UnitMenu open={menu === 'unit'} anchor={unitRef} value={item.unit} onClose={() => setMenu(null)} onPick={(u) => patch({ unit: u })} />
              </>
            )}
          </div>
        )
      case 'cost':
        return <div key={key} role="cell" className={cls} style={st}>{isGroup ? <span className={styles.sum}>{money2(sums!.costMinor)}</span> : <MoneyCell minor={item.costMinor} onCommit={(v) => patch({ costMinor: v, markupMinor: Math.max(-v, item.markupMinor) })} ariaLabel={`Cost of ${item.name}`} />}</div>
      case 'markup':
        return (
          <div key={key} role="cell" className={cls} style={st}>
            {isGroup ? <><span className={styles.sum}>{money2(sums!.markupMinor)}</span><span className={styles.sub}>({pct(Number((sums!.costMinor > 0 ? (sums!.markupMinor / sums!.costMinor) * 100 : 0).toFixed(2)))})</span></> : (
              <>
                <MoneyCell fit minor={item.markupMinor} onCommit={(v) => patch({ markupMinor: v })} ariaLabel={`Markup of ${item.name}`} />
                <span className={styles.sub}>({pct(Number(markupPct(item).toFixed(2)))})</span>
              </>
            )}
          </div>
        )
      case 'unitPrice':
        // Unit Price = Cost + Markup; the markup absorbs the change and never takes the price below zero (REG-417).
        return <div key={key} role="cell" className={cls} style={st}>{isGroup ? <span className={styles.sum}>{money2(sums!.unitPriceMinor)}</span> : <MoneyCell minor={unitPriceMinor(item)} onCommit={(v) => patch({ markupMinor: Math.max(-item.costMinor, v - item.costMinor) })} ariaLabel={`Unit price of ${item.name}`} />}</div>
      case 'discount':
        return <div key={key} role="cell" className={cls} style={st}>{isGroup ? null : <NumberCell value={item.discountPct} suffix="%" max={100} onCommit={(v) => patch({ discountPct: v })} ariaLabel={`Discount of ${item.name}`} />}</div>
      case 'gst':
        return <div key={key} role="cell" className={cls} style={st}>{isGroup ? null : <NumberCell value={item.gstPct} max={100} onCommit={(v) => patch({ gstPct: v })} ariaLabel={`GST of ${item.name}`} />}</div>
      case 'room': case 'category': case 'section': {
        const ref = key === 'room' ? roomRef : key === 'category' ? catRef : secRef
        const value = item[key]
        const options = key === 'room' ? labels.rooms : key === 'category' ? labels.categories : labels.sections
        const empty = key === 'room' ? 'Add Room' : key === 'category' ? 'Add Category' : 'Add Section'
        const title = key === 'room' ? 'Room' : key === 'category' ? 'Category' : 'Section'
        return (
          <div key={key} role="cell" className={cls} style={st}>
            <button ref={ref} type="button" className={styles.pick} data-edit="" data-empty={value ? undefined : ''} aria-haspopup="menu" aria-expanded={menu === key} onClick={() => toggle(key)}>
              <span>{value ?? empty}</span><span className={styles.pickChev}><Icon name="expand_more" size={16} /></span>
            </button>
            <LabelMenu open={menu === key} anchor={ref} options={options} value={value} onClose={() => setMenu(null)} title={title}
                       onPick={(v) => patch({ [key]: v } as ItemPatch)} addLabel={empty} onAdd={() => h.onAddLabel(key)} />
          </div>
        )
      }
      case 'type':
        return <div key={key} role="cell" className={cls} style={st}>{isGroup ? null : <span className={kind ? undefined : styles.muted}>{kind ? ITEM_KIND_LABEL[kind] : '–'}</span>}</div>
      case 'margin': {
        const price = isGroup ? sums!.unitPriceMinor : unitPriceMinor(item)
        const cost = isGroup ? sums!.costMinor : item.costMinor
        return <div key={key} role="cell" className={cls} style={st}>{price > 0 ? pct(Number((((price - cost) / price) * 100).toFixed(1))) : '–'}</div>
      }
      default:
        return <div key={key} role="cell" className={cls} style={st}><span className={styles.muted}>–</span></div>
    }
  }

  const total = isGroup ? sums!.totalMinor : lineTotalMinor(item)
  return (
    <div className={styles.row} role="row" data-item-id={item.id} data-density={density} data-child={child || undefined} data-selected={selected || undefined}
         data-active={editing || menu === 'unit' || menu === 'room' || menu === 'category' || menu === 'section' || undefined}
         data-dragover={dragOver ?? undefined} data-dragging={dragging || undefined} data-full={showFull || undefined}
         onFocusCapture={onFocusCapture} onBlurCapture={onBlurCapture}
         onDragOver={onRowDragOver} onDrop={(e) => { e.preventDefault(); h.onDrop() }}>
      <div role="cell" className={`${styles.cell} ${styles.colSel}`}>
        <Tooltip label="Drag to reorder">
          <button type="button" className={styles.handle} aria-label={`Drag to reorder ${item.name}`} draggable
                  onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', item.id); h.onDragStart(item.id) }}
                  onDragEnd={h.onDragEnd}>
            <Icon name="drag_indicator" size={20} weight={300} />
          </button>
        </Tooltip>
        <Tooltip label="Add item below">
          <button type="button" className={styles.plus} aria-label={`Add item below ${item.name}`} onClick={() => h.onInsertBelow(item)}>
            <Icon name="add" size={20} weight={300} />
          </button>
        </Tooltip>
        <span className={styles.check}><Checkbox isSelected={selected} onChange={(on: boolean) => h.onSelect(item.id, on)} aria-label={`Select ${item.name}`} /></span>
      </div>
      {details.autonumber ? <div role="cell" className={`${styles.cell} ${styles.colNum}`}>{number}</div> : null}
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
            <TextCell value={item.name} kind="name" inputRef={nameRef} placeholder={isGroup ? 'New Group' : 'Type item name'} onCommit={(v) => patch({ name: v })} ariaLabel={isGroup ? 'Group name' : 'Item name'} />
            {isGroup ? <span className={styles.groupGlyph} aria-hidden><Icon name="cards" size={20} weight={300} fill /></span> : null}
            {child ? (
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
              <Tooltip label={item.collapsed ? 'Expand group' : 'Collapse group'}>
                <button type="button" className={styles.fold} aria-label={item.collapsed ? `Expand ${item.name}` : `Collapse ${item.name}`} aria-expanded={!item.collapsed} onClick={() => patch({ collapsed: !item.collapsed })}>
                  <Icon name={item.collapsed ? 'keyboard_arrow_down' : 'keyboard_arrow_up'} size={20} />
                </button>
              </Tooltip>
            ) : null}
          </div>
          {!details.description ? null : descOpen ? (
            <textarea className={styles.descArea} data-edit="" defaultValue={item.description ?? ''} autoFocus aria-label="Description" rows={3}
                      onBlur={(e) => { const v = e.target.value; setDescOpen(false); if (v !== (item.description ?? '')) patch({ description: v }) }} />
          ) : showFull ? (
            <span className={styles.desc} onClick={() => setDescOpen(true)}>{item.description || 'Add a description'}</span>
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
        </div>
        {!isGroup && !descOpen && details.description ? (
          <button type="button" className={styles.expand} data-expand onClick={() => setDescOpen(true)}>
            <Icon name="expand_content" size={20} />Expand
          </button>
        ) : null}
      </div>
      {columns.map(cell)}
      <div role="cell" className={`${styles.cell} ${styles.colAdd}`} />
      <div role="cell" className={`${styles.cell} ${styles.colTotal}`}>
        <span className={styles.total}>{money2(total)}</span>
        <span ref={kebabRef} className={styles.kebab} data-open={menu === 'row' || undefined}>
          <Tooltip label="More options" disabled={menu === 'row'}>
            <IconButton icon="more_vert" label={`More options for ${item.name}`} size={24} variant="bare" iconSize={24} aria-haspopup="menu" aria-expanded={menu === 'row'} onClick={() => toggle('row')} />
          </Tooltip>
        </span>
        <RowMenu open={menu === 'row'} anchor={kebabRef} item={item} groups={groups} selectedCount={selected ? selectedCount : 1}
                 onClose={() => setMenu(null)} onAction={(a) => h.onMenu(item, a)} onChooseGroup={(g) => h.onChooseGroup(item, g)} />
      </div>
    </div>
  )
}
