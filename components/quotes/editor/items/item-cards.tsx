'use client'

import { useRef, useState, type ReactNode } from 'react'
import { Button, Checkbox, Tag } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { Sheet } from '@/components/om/sheet'
import { TextField } from '@/components/om/text-field'
import type { QuoteItem } from '@/lib/db/schema'
import { cleanLink, htmlToPlain, ITEM_KIND_ICON, ITEM_KIND_LABEL, ITEM_KINDS, isItemKind, printAsWord, UNITS, type ItemKind } from '@/lib/quotes/items-model'
import { belowCost, depthOf, descendantIds, groupTotals, lineCostMinor, lineTotalMinor, money2, unitPriceMinor } from '@/lib/quotes/math'
import type { ItemPatch } from '@/app/quotes/items-actions'
import type { RowHandlers } from './item-row'
import { DescriptionDialog } from './description-dialog'
import { RowMenu } from './table-menus'
import { changeTag, type LineChange, type LineChanges } from './line-change'
import styles from './item-cards.module.css'

export type CardRow = { kind: 'row'; item: QuoteItem; number: string } | { kind: 'bucket'; key: string; name: string; number: string; lines: QuoteItem[] }
type CardLabels = { rooms: string[]; categories: string[]; sections: string[]; vendors: string[]; tradeNotes?: Record<string, string> }

/**
 * (REG-597) The Items table on a phone: the Quotes tab's card of REG-377 for every line (thumb · name · qty × unit price · total ·
 * kebab), a section as a tinted card with its count and its fold, its lines indented under it, a "View by" bucket as a caption row.
 * A press on a card opens a bottom sheet with the line's fields — every column the grid edits in place, as the DS field, saved
 * on blur through the same patch — so nothing the desktop grid does is lost; the kebab is the row menu, itself a sheet here.
 * Rendered only at ≤767 (items-table.tsx); the desktop and the tablet keep the grid.
 */
export function ItemCards({ rows, items, selected, groups, labels, brandColors, h, collapsedBuckets, onToggleBucket, showDescription, showCost = true, showMarkup = true, commentCounts = {}, changes }: {
  commentCounts?: Record<string, number>
  /** (UX audit Q10) On a revision: the lines new or changed since the kept version. */
  changes?: LineChanges
  rows: CardRow[]
  items: QuoteItem[]
  selected: Set<string>
  groups: QuoteItem[]
  labels: CardLabels
  brandColors: Record<string, string>
  h: Omit<RowHandlers, 'onDragPointerDown'>
  collapsedBuckets: Set<string>
  onToggleBucket: (key: string) => void
  showDescription: boolean
  /** (REG-623) The Cost column is on — a line under its cost says so; off (a screen shown to the client) it never does. */
  showCost?: boolean
  /** (Dane UAT 12.08, x-phonetabs) The Markup column is on — the line's sheet shows Cost and Markup only as the table's columns do. */
  showMarkup?: boolean
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
        <ItemCard key={d.item.id} item={d.item} number={d.number} all={items} selected={selected.has(d.item.id)} groups={groups} labels={labels} brandColors={brandColors} h={h} selectedCount={selected.size} showDescription={showDescription} showCost={showCost} showMarkup={showMarkup} comments={commentCounts[d.item.id] ?? 0} change={changes?.get(d.item.id) ?? null} />
      ))}
    </div>
  )
}

/* (sweep S1) The boxes take dollars and cents and decimals (money · decimal, REG-651) and read them whole — "1,500" is 1500,
   never the "1" `parseFloat` stops at, and "1.5" is one and a half (the whole-dollar `amount` filter dropped the point). */
const toMinor = (s: string) => { const n = Number(s.replace(/,/g, '')); return Number.isFinite(n) ? Math.round(n * 100) : 0 }
const toNum = (s: string, max?: number) => { const n = Number(s.replace(/,/g, '')); const v = Number.isFinite(n) && n >= 0 ? n : 0; return max === undefined ? v : Math.min(max, v) }

function ItemCard({ item, number, all, selected, groups, labels, brandColors, h, selectedCount, showDescription, showCost, showMarkup, comments, change }: {
  item: QuoteItem; number: string; all: QuoteItem[]; selected: boolean; groups: QuoteItem[]; labels: CardLabels
  brandColors: Record<string, string>; h: Omit<RowHandlers, 'onDragPointerDown'>; selectedCount: number; showDescription: boolean; showCost: boolean; showMarkup: boolean; comments: number; change: LineChange | null
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
    <div className={styles.card} role="listitem" data-testid="item-card" data-item-id={item.id} data-change={!isGroup && change ? change.kind : undefined} data-group={isGroup || undefined} data-depth={depth || undefined} data-selected={selected || undefined} data-status={item.status !== 'Pending' ? item.status : undefined}>
      <span className={styles.check}><Checkbox isSelected={selected} onChange={(on: boolean) => h.onSelect(item.id, on)} aria-label={`Select ${item.name || 'item'}`} /></span>
      <button type="button" className={styles.open} aria-label={`Edit ${item.name || (isGroup ? 'section' : 'item')}`} onClick={() => setOpen(true)}>
        <span className={styles.thumb} data-group={isGroup || undefined}>
          {isGroup ? <Icon name={item.collapsed ? 'folder' : 'folder_open'} size={20} weight={300} /> : item.thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.thumb} alt="" />
          ) : <Icon name={kind ? ITEM_KIND_ICON[kind] : 'category'} size={20} weight={300} />}
        </span>
        <span className={styles.text}>
          <span className={styles.nameRow}>
            {number ? <span className={styles.num}>{number}</span> : null}
            <span className={styles.name} data-empty={item.name ? undefined : ''}>{item.name || (isGroup ? 'New section' : 'Type item name')}</span>
          </span>
          <span className={styles.figures} data-below={(!isGroup && showCost && belowCost(item)) || undefined}>   {/* (Dane UAT 6.15) under its cost: the price and the total in the error red, as the grid's */}
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
            {!isGroup && change ? <span data-testid="line-change" aria-label={changeTag(change).help}><Tag appearance="outlined" color="yellow">{changeTag(change).label}</Tag></span> : null}   {/* (UX audit Q10) */}
            {!isGroup && comments > 0 ? <span data-testid="line-comment-count"><Tag appearance="outlined">{comments} {comments === 1 ? 'comment' : 'comments'}</Tag></span> : null}   {/* (REG-627) the kebab's Comment opens them */}
            {!isGroup && item.optional && item.clientChoice ? <span data-testid="client-choice"><Tag appearance="outlined" color={item.clientChoice === 'want' ? 'green' : undefined}>{item.clientChoice === 'want' ? 'Client wants it' : 'Client said no'}</Tag></span> : null}   {/* (REG-626) */}
            {word ? <Tag appearance="outlined">{word}</Tag> : null}
            {!isGroup && showCost && belowCost(item) ? <span data-testid="below-cost" aria-label={`Below cost — sells for ${money2(lineTotalMinor(item))}, costs ${money2(lineCostMinor(item))}`}><Tag appearance="outlined" color="red">Below cost</Tag></span> : null}   {/* (REG-623) */}
          </span>
        </span>
      </button>
      <span className={styles.tools}>
        {isGroup ? <Tooltip label={item.collapsed ? 'Expand section' : 'Collapse section'}><IconButton icon={item.collapsed ? 'keyboard_arrow_down' : 'keyboard_arrow_up'} label={item.collapsed ? `Expand ${item.name}` : `Collapse ${item.name}`} size={24} variant="bare" iconSize={22} aria-expanded={!item.collapsed} onClick={() => patch({ collapsed: !item.collapsed })} /></Tooltip> : null}
        <span ref={kebabRef} className={styles.kebab}>
          <Tooltip label="More options" disabled={menu}><IconButton icon="more_vert" label={`More options for ${item.name || 'item'}`} size={24} variant="bare" iconSize={24} aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu((m) => !m)} /></Tooltip>   {/* (REG-729) the house 24 kebab: a 24 glyph */}
        </span>
        <RowMenu open={menu} anchor={kebabRef} item={item} groups={groups} all={all} selectedCount={selected ? selectedCount : 1} brandColors={brandColors}
                 onClose={() => setMenu(false)} onAction={(a) => h.onMenu(item, a)} onChooseGroup={(g) => h.onChooseGroup(item, g)}
                 onPrintAs={(v) => h.onPrintAs(item, v)} onHighlight={(v) => h.onHighlight(item, v)} />
      </span>
      <LineSheet open={open} item={item} labels={labels} onClose={() => setOpen(false)} onPatch={patch} onAddLabel={h.onAddLabel} onNote={h.onNote} onUploadImage={() => h.onUploadImage(item)} total={total} showCost={showCost} showMarkup={showMarkup} />
    </div>
  )
}

/** The line's fields as a bottom sheet (the canvas' rule for every form on a phone, REG-353): saved on blur, the way a cell saves on leaving it. */
function LineSheet({ open, item, labels, onClose, onPatch, onAddLabel, onNote, onUploadImage, total, showCost, showMarkup }: {
  open: boolean; item: QuoteItem; labels: CardLabels; onClose: () => void; onPatch: (p: ItemPatch) => void
  onAddLabel: (kind: 'room' | 'category' | 'section' | 'vendor', itemId?: string) => void; onNote: (message: string) => void; onUploadImage: () => void; total: number
  /** (Dane UAT 12.08) The Cost and Markup columns: the sheet shows those two boxes only while the table does — a phone turned to the client never shows them. */
  showCost: boolean; showMarkup: boolean
}) {
  const isGroup = item.kind === 'group'
  const [descOpen, setDescOpen] = useState(false)
  const kind: ItemKind | null = isItemKind(item.icon) ? item.icon : null
  const field = (label: string, value: string, commit: (v: string) => void, opts: { numeric?: 'digits' | 'amount' | 'money' | 'decimal'; helper?: string; max?: number } = {}): ReactNode => (
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
                {field('Qty', String(item.qty), (v) => onPatch({ qty: toNum(v) }), { numeric: 'decimal' })}
                {select('Unit', item.unit, UNITS, (v) => onPatch({ unit: v }))}
              </div>
              {showCost || showMarkup ? (
                <div className={styles.pair}>
                  {showCost ? field('Cost (S$)', (item.costMinor / 100).toFixed(2), (v) => { const c = toMinor(v); onPatch({ costMinor: c, markupMinor: Math.max(-c, item.markupMinor) }) }, { numeric: 'money' }) : null}
                  {showMarkup ? field('Markup (S$)', (item.markupMinor / 100).toFixed(2), (v) => onPatch({ markupMinor: Math.max(-item.costMinor, toMinor(v)) }), { numeric: 'money' }) : null}
                </div>
              ) : null}
              <div className={styles.pair}>
                {field('Unit price (S$)', (unitPriceMinor(item) / 100).toFixed(2), (v) => onPatch({ markupMinor: Math.max(-item.costMinor, toMinor(v) - item.costMinor) }), { numeric: 'money', helper: showCost && showMarkup ? 'Cost + markup' : undefined })}
                {field('Discount (%)', String(item.discountPct), (v) => onPatch({ discountPct: toNum(v, 100) }), { numeric: 'decimal' })}
              </div>
              <div className={styles.pair}>
                {field('GST (%)', String(item.gstPct), (v) => onPatch({ gstPct: toNum(v, 100) }), { numeric: 'decimal' })}
                {select('Kind', kind ? ITEM_KIND_LABEL[kind] : null, ITEM_KINDS.map((k) => ITEM_KIND_LABEL[k]), (v) => onPatch({ icon: ITEM_KINDS.find((k) => ITEM_KIND_LABEL[k] === v) ?? null, thumb: null, thumbCount: 0 }))}
              </div>
            </>
          )}
          {select('Room', item.room, labels.rooms, (v) => onPatch({ room: v }), () => onAddLabel('room', item.id))}
          {select('Category', item.category, labels.categories, (v) => onPatch({ category: v }), () => onAddLabel('category', item.id))}
          {select('Section label', item.section, labels.sections, (v) => onPatch({ section: v }), () => onAddLabel('section', item.id))}
          {isGroup ? null : (
            <>
              {/* (REG-623, parity Q-08 · Q-09) who supplies the line, and its product or spec page — never printed */}
              {select('Vendor/Sub', item.vendor, labels.vendors, (v) => onPatch({ vendor: v }), () => onAddLabel('vendor', item.id))}
              {field('Website Link', item.link ?? '', (v) => { const u = cleanLink(v); if (u === undefined) onNote('Not a web address — a link starts with https://'); else onPatch({ link: u }) }, { helper: 'A product or spec page — never printed' })}
            </>
          )}
          {isGroup ? null : <Button variant="secondary" appearance="outlined" iconStart={<Icon name="add_photo_alternate" size={20} />} onPress={onUploadImage}>{item.thumb ? 'Change image' : 'Add an image'}</Button>}
        </div>
      </Sheet>
      <DescriptionDialog open={descOpen} name={item.name} kind={isGroup ? 'section' : 'item'} value={item.description ?? ''} html={item.descriptionHtml} onClose={() => setDescOpen(false)} tradeNote={isGroup ? labels.tradeNotes?.[item.name.trim().toLowerCase()] : undefined} nested
                         onSave={(text, html) => { if (text !== (item.description ?? '') || html !== (item.descriptionHtml ?? null)) onPatch({ description: text, descriptionHtml: html }) }} />
    </>
  )
}

/** A field that keeps its draft while focused and commits on blur (Enter commits too), the cell's contract. */
function Draft({ label, value, numeric, helper, onCommit }: { label: string; value: string; numeric?: 'digits' | 'amount' | 'money' | 'decimal'; helper?: string; onCommit: (v: string) => void }) {
  const [draft, setDraft] = useState<string | null>(null)
  const commit = () => { if (draft !== null && draft !== value) onCommit(draft); setDraft(null) }
  return (
    <TextField label={label} value={draft ?? value} numeric={numeric} helper={helper} onChange={setDraft} onBlur={commit}
               onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLInputElement).blur() } }} />
  )
}

