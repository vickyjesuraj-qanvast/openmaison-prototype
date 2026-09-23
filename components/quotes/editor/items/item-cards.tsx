'use client'

import { useRef, useState, type ReactNode } from 'react'
import { Button, Checkbox, Tag } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { Sheet } from '@/components/om/sheet'
import { TextField } from '@/components/om/text-field'
import type { QuoteItem } from '@/lib/db/schema'
import { htmlToPlain, ITEM_KIND_ICON, ITEM_KIND_LABEL, ITEM_KINDS, isItemKind, printAsWord, UNITS, type ItemKind } from '@/lib/quotes/items-model'
import { depthOf, descendantIds, groupTotals, lineTotalMinor, money2, unitPriceMinor } from '@/lib/quotes/math'
import type { ItemPatch } from '@/app/quotes/items-actions'
import type { RowHandlers } from './item-row'
import { DescriptionDialog } from './description-dialog'
import { RowMenu } from './table-menus'
import styles from './item-cards.module.css'

export type CardRow = { kind: 'row'; item: QuoteItem; number: string } | { kind: 'bucket'; key: string; name: string; number: string; lines: QuoteItem[] }

/**
 * (REG-597) The Items table on a phone: the Quotes tab's card of REG-377 for every line (thumb · name · qty × unit price · total ·
 * kebab), a section as a tinted card with its count and its fold, its lines indented under it, a "View by" bucket as a caption row.
 * A press on a card opens a bottom sheet with the line's fields — every column the grid edits in place, as the DS field, saved
 * on blur through the same patch — so nothing the desktop grid does is lost; the kebab is the row menu, itself a sheet here.
 * Rendered only at ≤767 (items-table.tsx); the desktop and the tablet keep the grid.
 */
export function ItemCards({ rows, items, selected, groups, labels, brandColors, h, collapsedBuckets, onToggleBucket, showDescription }: {
  rows: CardRow[]
  items: QuoteItem[]
  selected: Set<string>
  groups: QuoteItem[]
  labels: { rooms: string[]; categories: string[]; sections: string[] }
  brandColors: Record<string, string>
  h: Omit<RowHandlers, 'onDragPointerDown'>
  collapsedBuckets: Set<string>
  onToggleBucket: (key: string) => void
  showDescription: boolean
}) {
  return (
    <div className={styles.list} role="list" aria-label="Quote items" data-testid="item-cards">
      {rows.map((d) => d.kind === 'bucket' ? (
        <div key={`b-${d.key}`} className={styles.bucket} role="listitem" data-bucket={d.key}>
          <button type="button" className={styles.bucketBtn} aria-expanded={!collapsedBuckets.has(d.key)} onClick={() => onToggleBucket(d.key)}>
            <span className={styles.bucketName}>{d.number ? `${d.number}  ` : ''}{d.name}</span>
            <span className={styles.bucketMeta}>{d.lines.length} {d.lines.length === 1 ? 'item' : 'items'} · {money2(d.lines.reduce((s, l) => s + lineTotalMinor(l), 0))}</span>
            <Icon name={collapsedBuckets.has(d.key) ? 'keyboard_arrow_down' : 'keyboard_arrow_up'} size={20} />
          </button>
        </div>
      ) : (
        <ItemCard key={d.item.id} item={d.item} number={d.number} all={items} selected={selected.has(d.item.id)} groups={groups} labels={labels} brandColors={brandColors} h={h} selectedCount={selected.size} showDescription={showDescription} />
      ))}
    </div>
  )
}

const toMinor = (s: string) => { const n = Number.parseFloat(s); return Number.isFinite(n) ? Math.round(n * 100) : 0 }
const toNum = (s: string, max?: number) => { const n = Number.parseFloat(s); const v = Number.isFinite(n) && n >= 0 ? n : 0; return max === undefined ? v : Math.min(max, v) }

function ItemCard({ item, number, all, selected, groups, labels, brandColors, h, selectedCount, showDescription }: {
  item: QuoteItem; number: string; all: QuoteItem[]; selected: boolean; groups: QuoteItem[]; labels: { rooms: string[]; categories: string[]; sections: string[] }
  brandColors: Record<string, string>; h: Omit<RowHandlers, 'onDragPointerDown'>; selectedCount: number; showDescription: boolean
}) {
  const [menu, setMenu] = useState(false)
  const [open, setOpen] = useState(false)
  const kebabRef = useRef<HTMLSpanElement>(null)
  const isGroup = item.kind === 'group'
  const depth = item.parentId ? depthOf(all, item.id) : 0
  const sums = isGroup ? groupTotals(all, item.id) : null
  const childCount = isGroup ? [...descendantIds(all, [item.id])].filter((id) => id !== item.id && all.find((x) => x.id === id)?.kind === 'item').length : 0
  const kind: ItemKind | null = isItemKind(item.icon) ? item.icon : null
  const word = isGroup ? '' : printAsWord(item)
  const total = isGroup ? sums!.totalMinor : lineTotalMinor(item)
  const patch = (p: ItemPatch) => h.onPatch(item.id, p)
  const desc = item.descriptionHtml ? htmlToPlain(item.descriptionHtml) : item.description ?? ''
  return (
    <div className={styles.card} role="listitem" data-testid="item-card" data-item-id={item.id} data-group={isGroup || undefined} data-depth={depth || undefined} data-selected={selected || undefined} data-status={item.status !== 'Pending' ? item.status : undefined}>
      <span className={styles.check}><Checkbox isSelected={selected} onChange={(on: boolean) => h.onSelect(item.id, on)} aria-label={`Select ${item.name || 'item'}`} /></span>
      <button type="button" className={styles.open} aria-label={`Edit ${item.name || (isGroup ? 'section' : 'item')}`} onClick={() => setOpen(true)}>
        <span className={styles.thumb} data-group={isGroup || undefined}>
          {isGroup ? <Icon name={item.collapsed ? 'folder' : 'folder_open'} size={22} weight={300} /> : item.thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.thumb} alt="" />
          ) : <Icon name={kind ? ITEM_KIND_ICON[kind] : 'category'} size={22} weight={300} />}
        </span>
        <span className={styles.text}>
          <span className={styles.nameRow}>
            {number ? <span className={styles.num}>{number}</span> : null}
            <span className={styles.name} data-empty={item.name ? undefined : ''}>{item.name || (isGroup ? 'New section' : 'Type item name')}</span>
          </span>
          <span className={styles.figures}>
            <span className={styles.sub}>
              {isGroup ? `${childCount} ${childCount === 1 ? 'item' : 'items'}` : `${item.qty} ${item.unit ?? ''} × ${money2(unitPriceMinor(item))}`.replace('  ', ' ')}
              {!isGroup && item.discountPct ? ` · −${item.discountPct}%` : ''}
            </span>
            <span className={styles.total}>{word && item.printAs !== 'behalf' ? word : money2(total)}</span>
          </span>
          {showDescription && desc ? <span className={styles.desc}>{desc}</span> : null}
          <span className={styles.tags}>
            {isGroup ? <Tag appearance="outlined" color="blue">{depth ? 'Sub-section' : 'Section'}</Tag> : null}
            {item.status !== 'Pending' ? <Tag appearance="outlined" color={item.status === 'Approved' ? 'green' : 'red'}>{item.status}</Tag> : null}
            {!isGroup && item.optional ? <Tag appearance="outlined">Optional</Tag> : null}
            {word ? <Tag appearance="outlined">{word}</Tag> : null}
          </span>
        </span>
      </button>
      <span className={styles.tools}>
        {isGroup ? <IconButton icon={item.collapsed ? 'keyboard_arrow_down' : 'keyboard_arrow_up'} label={item.collapsed ? `Expand ${item.name}` : `Collapse ${item.name}`} size={24} variant="bare" iconSize={22} aria-expanded={!item.collapsed} onClick={() => patch({ collapsed: !item.collapsed })} /> : null}
        <span ref={kebabRef} className={styles.kebab}>
          <IconButton icon="more_vert" label={`More options for ${item.name || 'item'}`} size={24} variant="bare" iconSize={22} aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu((m) => !m)} />
        </span>
        <RowMenu open={menu} anchor={kebabRef} item={item} groups={groups} all={all} selectedCount={selected ? selectedCount : 1} brandColors={brandColors}
                 onClose={() => setMenu(false)} onAction={(a) => h.onMenu(item, a)} onChooseGroup={(g) => h.onChooseGroup(item, g)}
                 onPrintAs={(v) => h.onPrintAs(item, v)} onHighlight={(v) => h.onHighlight(item, v)} />
      </span>
      <LineSheet open={open} item={item} labels={labels} onClose={() => setOpen(false)} onPatch={patch} onAddLabel={h.onAddLabel} onUploadImage={() => h.onUploadImage(item)} total={total} />
    </div>
  )
}

/** The line's fields as a bottom sheet (the canvas' rule for every form on a phone, REG-353): saved on blur, the way a cell saves on leaving it. */
function LineSheet({ open, item, labels, onClose, onPatch, onAddLabel, onUploadImage, total }: {
  open: boolean; item: QuoteItem; labels: { rooms: string[]; categories: string[]; sections: string[] }; onClose: () => void; onPatch: (p: ItemPatch) => void
  onAddLabel: (kind: 'room' | 'category' | 'section') => void; onUploadImage: () => void; total: number
}) {
  const isGroup = item.kind === 'group'
  const [descOpen, setDescOpen] = useState(false)
  const kind: ItemKind | null = isItemKind(item.icon) ? item.icon : null
  const field = (label: string, value: string, commit: (v: string) => void, opts: { numeric?: 'digits' | 'amount'; helper?: string; max?: number } = {}): ReactNode => (
    <Draft key={label} label={label} value={value} numeric={opts.numeric} helper={opts.helper} onCommit={commit} />
  )
  const ADD = 'Add new…'
  const select = (label: string, value: string | null, options: readonly string[], commit: (v: string | null) => void, add?: () => void): ReactNode => (
    <TextField key={label} label={label} mode="select" options={[...(value && !options.includes(value) ? [value] : []), ...options, ...(add ? [ADD] : [])]} value={value ?? ''}
               onChange={(v) => { if (v === ADD) { add?.(); return } commit(v || null) }} />
  )
  return (
    <>
      <Sheet open={open} onClose={onClose} title={item.name || (isGroup ? 'Section' : 'Item')} subtitle={`${isGroup ? 'Section total' : 'Line total'} ${money2(total)}`} label={`Edit ${item.name || 'item'}`}
             footer={<Button onPress={onClose}>Done</Button>}>
        <div className={styles.sheetBody} data-testid="line-sheet">
          {field(isGroup ? 'Section name' : 'Item name', item.name, (v) => onPatch({ name: v }))}
          <button type="button" className={styles.descRow} onClick={() => setDescOpen(true)}>
            <span className={styles.descLabel}>Description</span>
            <span className={styles.descText} data-empty={item.description || item.descriptionHtml ? undefined : ''}>{item.descriptionHtml ? htmlToPlain(item.descriptionHtml) : item.description || 'Add a description'}</span>
            <Icon name="chevron_right" size={20} />
          </button>
          {isGroup ? null : (
            <>
              <div className={styles.pair}>
                {field('Qty', String(item.qty), (v) => onPatch({ qty: toNum(v) }), { numeric: 'amount' })}
                {select('Unit', item.unit, UNITS, (v) => onPatch({ unit: v }))}
              </div>
              <div className={styles.pair}>
                {field('Cost (S$)', (item.costMinor / 100).toFixed(2), (v) => { const c = toMinor(v); onPatch({ costMinor: c, markupMinor: Math.max(-c, item.markupMinor) }) }, { numeric: 'amount' })}
                {field('Markup (S$)', (item.markupMinor / 100).toFixed(2), (v) => onPatch({ markupMinor: Math.max(-item.costMinor, toMinor(v)) }), { numeric: 'amount' })}
              </div>
              <div className={styles.pair}>
                {field('Unit price (S$)', (unitPriceMinor(item) / 100).toFixed(2), (v) => onPatch({ markupMinor: Math.max(-item.costMinor, toMinor(v) - item.costMinor) }), { numeric: 'amount', helper: 'Cost + markup' })}
                {field('Discount (%)', String(item.discountPct), (v) => onPatch({ discountPct: toNum(v, 100) }), { numeric: 'amount' })}
              </div>
              <div className={styles.pair}>
                {field('GST (%)', String(item.gstPct), (v) => onPatch({ gstPct: toNum(v, 100) }), { numeric: 'amount' })}
                {select('Kind', kind ? ITEM_KIND_LABEL[kind] : null, ITEM_KINDS.map((k) => ITEM_KIND_LABEL[k]), (v) => onPatch({ icon: ITEM_KINDS.find((k) => ITEM_KIND_LABEL[k] === v) ?? null, thumb: null, thumbCount: 0 }))}
              </div>
            </>
          )}
          {select('Room', item.room, labels.rooms, (v) => onPatch({ room: v }), () => onAddLabel('room'))}
          {select('Category', item.category, labels.categories, (v) => onPatch({ category: v }), () => onAddLabel('category'))}
          {select('Section label', item.section, labels.sections, (v) => onPatch({ section: v }), () => onAddLabel('section'))}
          {isGroup ? null : <Button variant="secondary" appearance="outlined" iconStart={<Icon name="add_photo_alternate" size={20} />} onPress={onUploadImage}>{item.thumb ? 'Change image' : 'Add an image'}</Button>}
        </div>
      </Sheet>
      <DescriptionDialog open={descOpen} name={item.name} kind={isGroup ? 'section' : 'item'} value={item.description ?? ''} html={item.descriptionHtml} onClose={() => setDescOpen(false)}
                         onSave={(text, html) => { if (text !== (item.description ?? '') || html !== (item.descriptionHtml ?? null)) onPatch({ description: text, descriptionHtml: html }) }} />
    </>
  )
}

/** A field that keeps its draft while focused and commits on blur (Enter commits too), the cell's contract. */
function Draft({ label, value, numeric, helper, onCommit }: { label: string; value: string; numeric?: 'digits' | 'amount'; helper?: string; onCommit: (v: string) => void }) {
  const [draft, setDraft] = useState<string | null>(null)
  const commit = () => { if (draft !== null && draft !== value) onCommit(draft); setDraft(null) }
  return (
    <TextField label={label} value={draft ?? value} numeric={numeric} helper={helper} onChange={setDraft} onBlur={commit}
               onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLInputElement).blur() } }} />
  )
}

