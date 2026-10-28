'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Button, Checkbox, Tag } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { Sheet } from '@/components/om/sheet'
import { SurfaceFoot, SurfaceHead } from '@/components/om/dialog'
import { TextField } from '@/components/om/text-field'
import type { QuoteItem } from '@/lib/db/schema'
import { cleanLink, htmlToPlain, ITEM_KIND_LABEL, ITEM_KINDS, isItemKind, printAsWord, type ItemKind } from '@/lib/quotes/items-model'
import { belowCost, depthOf, descendantIds, groupTotals, lineCostMinor, lineTotalMinor, money2, sectionWordOf, unitPriceMinor } from '@/lib/quotes/math'
import type { ItemPatch } from '@/app/quotes/items-actions'
import type { FootAdd, RowHandlers, RowLabels } from './item-row'
import { kitHtml } from '@/lib/templates/kit-html'
import { sanitizeRichHtml } from '@/lib/rich-html'
import type { ColorKey } from '@/lib/templates/model'
import { DescriptionDialog } from './description-dialog'
import { RowMenu } from './table-menus'
import { changeTag, type LineChange, type LineChanges } from './line-change'
import styles from './item-cards.module.css'
import { useVariation } from './variation-context'

export type CardRow = { kind: 'row'; item: QuoteItem; number: string } | { kind: 'bucket'; key: string; name: string; number: string; lines: QuoteItem[] }
  /* (S44I, B3) an open section's adds after its last card · (S44T — C1) the caption over the sections priced after the contract */
  | { kind: 'foot'; section: QuoteItem; empty: boolean; top: boolean } | { kind: 'divider'; count: number }
type CardLabels = RowLabels
/** The line an add press just made (or the row ⋮ › Edit…): its sheet (a phone) or the pane (a tablet) opens on it, once per `n`. */
export type OpenLine = { id: string; n: number; focusName?: boolean }

/**
 * (REG-597 · Quotes on the move — P-03 · P-07, his "please go ahead" 2026-10-22) The Items section's lines as cards on a phone (≤767) and on a
 * tablet held upright (768–1024, items-layout.ts): one card per line — the name at 16 that wraps and never clips, "44 sqft × S$102 ·
 * Purchase" under it, the total bold at the right; a section is a tinted card that folds on a tap and holds (sticky) while its lines scroll,
 * depth drawn as a bar on the card's left edge, never a margin (C-12); "+ Add to {section}" after an open section's last line adds a line
 * there in one press. A tap on a line opens its fields — a bottom sheet on the phone, the 400 pane beside the list on the tablet
 * (`onOpenLine`); the ⋮ is the house 36 kebab with the phone's five-row menu (table-menus.tsx `compact`). Nothing the grid can do is lost:
 * it is one tap further, under More… or in the sheet's own More.
 */
export function ItemCards({ rows, items, selected, groups, labels, brandColors, h, collapsedBuckets, onToggleBucket, showCost = true, showMarkup = true, commentCounts = {}, changes, openLine = null, openId = null, onOpenLine }: {
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
  /** (REG-623) The Cost column is on — a line under its cost says so; off (a screen shown to the client) it never does. */
  showCost?: boolean
  /** (Dane UAT 12.08, x-phonetabs) The Markup column is on — the line's sheet shows Cost and Markup only as the table's columns do. */
  showMarkup?: boolean
  /** The line to open now (an add press, Edit…): the phone's card opens its sheet; with `onOpenLine` the host opens its pane instead. */
  openLine?: OpenLine | null
  /** (P-07) The line the tablet's pane holds — its card wears the open ring. */
  openId?: string | null
  /** (P-07) A tablet: a tap on a line hands it to the pane beside the list instead of a sheet. */
  onOpenLine?: (item: QuoteItem) => void
}) {
  return (
    <div className={styles.list} role="list" aria-label="Quote items" data-testid="item-cards">
      {rows.map((d) => d.kind === 'foot' ? (
        <SectionAdd key={`f-${d.section.id}`} section={d.section} empty={d.empty} top={d.top} depth={depthOf(items, d.section.id) + 1} onFoot={h.onFoot} />
      ) : d.kind === 'divider' ? (
        <div key="priced-after" className={styles.divider} role="listitem" data-testid="priced-after-divider"><span className={styles.dividerName}>Priced after the contract</span><span className={styles.dividerHelp}>{d.count === 1 ? 'An estimate' : `${d.count} estimates`} — out of the total and the payment split</span></div>
      ) : d.kind === 'bucket' ? (
        <div key={`b-${d.key}`} className={styles.bucket} role="listitem" data-bucket={d.key}>
          <button type="button" className={styles.bucketBtn} aria-expanded={!collapsedBuckets.has(d.key)} onClick={() => onToggleBucket(d.key)}>
            <span className={styles.bucketName}>{d.number ? `${d.number}  ` : ''}{d.name}</span>
            <span className={styles.bucketMeta}>{d.lines.length} {d.lines.length === 1 ? 'item' : 'items'} · {money2(d.lines.reduce((s, l) => s + lineTotalMinor(l), 0))}</span>
            <Icon name={collapsedBuckets.has(d.key) ? 'keyboard_arrow_down' : 'keyboard_arrow_up'} size={20} />
          </button>
        </div>
      ) : (
        <ItemCard key={d.item.id} item={d.item} number={d.number} all={items} selected={selected.has(d.item.id)} groups={groups} labels={labels} brandColors={brandColors} h={h} selectedCount={selected.size} showCost={showCost} showMarkup={showMarkup} comments={commentCounts[d.item.id] ?? 0} change={changes?.get(d.item.id) ?? null}
                  openLine={openLine && openLine.id === d.item.id ? openLine : null} open={openId === d.item.id} onOpenLine={onOpenLine} />
      ))}
    </div>
  )
}

/** (S44I, B3 · P-03) After an open section's last card: one press adds a line at the section's end (its sheet opens to name it); a sub-section,
    the Price book and pasted lines are the section's ⋮ › More… › Add Item (nothing lost, one tap further). The empty section says so first. */
function SectionAdd({ section, empty, top, depth, onFoot }: { section: QuoteItem; empty: boolean; top: boolean; depth: number; onFoot: (s: QuoteItem, what: FootAdd) => void }) {
  const name = section.name.trim() || (top ? 'New section' : 'New sub-section')
  return (
    <div className={styles.sectionAdd} role="listitem" data-section-foot={section.id} data-depth={depth}>
      {empty ? <span className={styles.sectionAddEmpty}>Nothing in {name} yet</span> : null}
      <button type="button" className={styles.sectionAddBtn} onClick={() => onFoot(section, 'item')} data-testid="section-add" aria-label={`Add item to the end of ${name}`}><Icon name="add" size={20} />{`Add to ${name}`}</button>
    </div>
  )
}

/* (sweep S1) The boxes take dollars and cents and decimals (money · decimal, REG-651) and read them whole — "1,500" is 1500,
   never the "1" `parseFloat` stops at, and "1.5" is one and a half (the whole-dollar `amount` filter dropped the point). */
const toMinor = (s: string) => { const n = Number(s.replace(/,/g, '')); return Number.isFinite(n) ? Math.round(n * 100) : 0 }
const toNum = (s: string, max?: number) => { const n = Number(s.replace(/,/g, '')); const v = Number.isFinite(n) && n >= 0 ? n : 0; return max === undefined ? v : Math.min(max, v) }
/** (Projects round 5) A variation order's quantity: a minus omits the line from the contract. */
const toSigned = (s: string) => { const n = Number(s.replace(/[−–]/g, '-').replace(/[^0-9.-]/g, '')); return Number.isFinite(n) ? Math.max(-1_000_000, Math.min(1_000_000, n)) : 0 }

function ItemCard({ item, number, all, selected, groups, labels, brandColors, h, selectedCount, showCost, showMarkup, comments, change, openLine, open: held, onOpenLine }: {
  item: QuoteItem; number: string; all: QuoteItem[]; selected: boolean; groups: QuoteItem[]; labels: CardLabels
  brandColors: Record<string, string>; h: Omit<RowHandlers, 'onDragPointerDown'>; selectedCount: number; showCost: boolean; showMarkup: boolean; comments: number; change: LineChange | null
  openLine: OpenLine | null; open: boolean; onOpenLine?: (item: QuoteItem) => void
}) {
  const [menu, setMenu] = useState(false)
  const [sheet, setSheet] = useState<{ open: boolean; focusName: boolean }>({ open: false, focusName: false })
  const [words, setWords] = useState(false)   // (S44I — C2 · §12.6) ⋮ › Words on this line… / Section note…
  /* the line an add press just made opens its sheet, once per press (render-phase adjust); a tablet's host opens its pane instead */
  const [seen, setSeen] = useState<number | null>(null)
  if (openLine && openLine.n !== seen) { setSeen(openLine.n); if (!onOpenLine) setSheet({ open: true, focusName: !!openLine.focusName }) }
  const kebabRef = useRef<HTMLSpanElement>(null)
  const isGroup = item.kind === 'group'
  const depth = item.parentId ? depthOf(all, item.id) : 0
  const sums = isGroup ? groupTotals(all, item.id) : null
  const childCount = isGroup ? [...descendantIds(all, [item.id])].filter((id) => id !== item.id && all.find((x) => x.id === id)?.kind === 'item').length : 0
  const kind: ItemKind | null = isItemKind(item.icon) ? item.icon : null
  const word = printAsWord(item)   // (S44I — M17) a section's word too
  const fromSection = isGroup ? null : sectionWordOf(all, item)
  const total = isGroup ? sums!.totalMinor : lineTotalMinor(item)
  const nameRich = !isGroup && item.nameHtml ? kitHtml(sanitizeRichHtml(item.nameHtml), { colors: brandColors as Record<ColorKey, string> }) : ''   // (S44I — call C2)
  const patch = (p: ItemPatch) => h.onPatch(item.id, p)
  const name = item.name || (isGroup ? (depth ? 'New sub-section' : 'New section') : 'Type item name')
  const openFields = (focusName = false) => { if (onOpenLine) onOpenLine(item); else setSheet({ open: true, focusName }) }
  /* "44 sqft × S$102 · Purchase" — the kind on the line (C-13 · P-03); an optional line leads with its word (the mock's dim line) */
  const figure = isGroup ? `${childCount} ${childCount === 1 ? 'item' : 'items'}`
    : [item.optional ? 'Optional' : null, `${item.qty} ${item.unit ?? ''}`.trim() + ` × ${money2(unitPriceMinor(item))}`, kind ? ITEM_KIND_LABEL[kind] : null, item.discountPct ? `−${item.discountPct}%` : null].filter(Boolean).join(' · ')
  return (
    <div className={styles.card} role="listitem" data-testid="item-card" data-item-id={item.id} data-change={!isGroup && change ? change.kind : undefined} data-group={isGroup || undefined} data-depth={depth || undefined} data-selected={selected || undefined}
         data-open={held || undefined} data-optional={(!isGroup && item.optional) || undefined} data-status={item.status !== 'Pending' ? item.status : undefined}>
      <span className={styles.check}><Checkbox isSelected={selected} onChange={(on: boolean) => h.onSelect(item.id, on)} aria-label={`Select ${item.name || 'item'}`} /></span>
      {/* a section folds on the tap (C-04); a line opens its fields */}
      <button type="button" className={styles.open} aria-expanded={isGroup ? !item.collapsed : undefined}
              aria-label={isGroup ? `${item.collapsed ? 'Expand' : 'Collapse'} ${name}` : `Edit ${name}`}
              onClick={() => { if (isGroup) patch({ collapsed: !item.collapsed }); else openFields() }}>
        {!isGroup && item.thumb ? (
          <span className={styles.thumb}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.thumb} alt="" />
          </span>
        ) : null}
        <span className={styles.text}>
          <span className={styles.nameRow}>
            {number ? <span className={styles.num}>{number}</span> : null}
            {nameRich ? <span className={styles.name} data-rich="" dangerouslySetInnerHTML={{ __html: nameRich }} /> : <span className={styles.name} data-empty={item.name ? undefined : ''}>{name}</span>}
          </span>
          <span className={styles.figures} data-below={(!isGroup && showCost && belowCost(item)) || undefined}>   {/* (Dane UAT 6.15) under its cost: the price and the total in the error red, as the grid's */}
            <span className={styles.sub}>{figure}</span>
            <span className={styles.total}>{fromSection ? printAsWord(fromSection) : word && item.printAs !== 'behalf' ? word : money2(total)}</span>
          </span>
          <span className={styles.tags}>
            {isGroup && item.pricedAfter ? <span data-testid="priced-after" aria-label="Priced after the contract — out of the quote’s total and its payment split; printed after the items as an estimate"><Tag appearance="outlined" color="yellow">Priced after</Tag></span> : null}   {/* (S44T — call C1) · (S44Z) said to a screen reader as the card's other tags are */}
            {!isGroup && change ? <span data-testid="line-change" aria-label={changeTag(change).help}><Tag appearance="outlined" color="yellow">{changeTag(change).label}</Tag></span> : null}   {/* (UX audit Q10) */}
            {!isGroup && comments > 0 ? <span data-testid="line-comment-count"><Tag appearance="outlined">{comments} {comments === 1 ? 'comment' : 'comments'}</Tag></span> : null}   {/* (REG-627) the kebab's Comment opens them */}
            {!isGroup && item.optional && item.clientChoice ? <span data-testid="client-choice"><Tag appearance="outlined" color={item.clientChoice === 'want' ? 'green' : undefined}>{item.clientChoice === 'want' ? 'Client wants it' : 'Client said no'}</Tag></span> : null}   {/* (REG-626) */}
            {word ? <Tag appearance="outlined">{word}</Tag> : null}
            {!isGroup && showCost && belowCost(item) ? <span data-testid="below-cost" aria-label={`Below cost — sells for ${money2(lineTotalMinor(item))}, costs ${money2(lineCostMinor(item))}`}><Tag appearance="outlined" color="red">Below cost</Tag></span> : null}   {/* (REG-623) */}
          </span>
        </span>
        {isGroup ? <span className={styles.chev} aria-hidden><Icon name={item.collapsed ? 'keyboard_arrow_down' : 'keyboard_arrow_up'} size={20} /></span> : null}
      </button>
      <span ref={kebabRef} className={styles.kebab}>
        {/* (C-03 · C-04) the house 36 kebab — its 44 box is the IconButton's own, centred (REG-344); no module override moves it */}
        <Tooltip label="More options" disabled={menu}><IconButton icon="more_vert" label={`More options for ${item.name || 'item'}`} variant="bare" iconSize={24} aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu((m) => !m)} /></Tooltip>
      </span>
      <RowMenu open={menu} anchor={kebabRef} item={item} groups={groups} all={all} selectedCount={selected ? selectedCount : 1} brandColors={brandColors} compact
               onClose={() => setMenu(false)} onAction={(a) => { if (a === 'description') setWords(true); else if (a === 'edit') openFields(); else h.onMenu(item, a) }} onChooseGroup={(g) => h.onChooseGroup(item, g)}
               onPrintAs={(v) => h.onPrintAs(item, v)} onHighlight={(v) => h.onHighlight(item, v)} onAddSeveral={(n, where) => h.onAddSeveral(item, n, where)} />
      {onOpenLine ? null : (
        <LineSheet open={sheet.open} focusName={sheet.focusName} item={item} labels={labels} onClose={() => setSheet({ open: false, focusName: false })} onDelete={() => { setSheet({ open: false, focusName: false }); h.onMenu(item, 'remove') }}
                   onPatch={patch} onAddLabel={h.onAddLabel} onNote={h.onNote} onUploadImage={() => h.onUploadImage(item)} total={total} showCost={showCost} showMarkup={showMarkup} brandColors={brandColors} />
      )}
      <DescriptionDialog open={words} name={item.name} nameHtml={item.nameHtml} kind={isGroup ? 'section' : 'item'} value={item.description ?? ''} html={item.descriptionHtml} onClose={() => setWords(false)} tradeNote={isGroup ? labels.tradeNotes?.[item.name.trim().toLowerCase()] : undefined} line={{ priceBookItemId: item.priceBookItemId, category: item.category }} brandColors={brandColors}
                         onSave={(p) => patch(p)} />
    </div>
  )
}

type FieldsProps = {
  item: QuoteItem; labels: CardLabels; onPatch: (p: ItemPatch) => void
  onAddLabel: (kind: 'room' | 'category' | 'section' | 'vendor', itemId?: string) => void; onNote: (message: string) => void; onUploadImage: () => void; total: number
  /** (Dane UAT 12.08) The Cost and Markup boxes show only while the table's columns do — a phone turned to the client never shows them. */
  showCost: boolean; showMarkup: boolean
  brandColors: Record<string, string>
}

/**
 * (P-04) A line's fields in two layers: what changes at a client's home first — the name, Quantity × Unit, Unit price beside the live Total,
 * Kind — then one row, More, that opens the rest (the description, cost and markup, discount, GST, room, category, section label, vendor,
 * link, image). Every box is the DS field, saved on blur through the same patch the grid's cells use; the quantity and the price open the
 * number keypad. `mode="rest"` is the tablet grid's pane: Qty, Unit and the price are edited in place there, so the pane leads with the
 * words and the cost. A section's sheet is its name, its note and its labels.
 */
export function LineFields({ item, labels, onPatch, onAddLabel, onNote, onUploadImage, total, showCost, showMarkup, brandColors, mode = 'all', nested = false, focusName = false }: FieldsProps & {
  mode?: 'all' | 'rest'
  /** The description dialog stacks over a sheet or a drawer (z 120). */
  nested?: boolean
  /** The name box takes the caret — a line just made. */
  focusName?: boolean
}) {
  const isGroup = item.kind === 'group'
  const [descOpen, setDescOpen] = useState(false)
  const [more, setMore] = useState(false)
  const kind: ItemKind | null = isItemKind(item.icon) ? item.icon : null
  const variation = useVariation()
  const nameRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (!focusName) return
    /* after the sheet's own focus lands on its panel (components/om/surface.ts) and its rise has settled */
    const t = window.setTimeout(() => { const el = nameRef.current; if (el) { el.focus({ preventScroll: true }); el.select() } }, 320)
    return () => window.clearTimeout(t)
  }, [focusName])
  const field = (label: string, value: string, commit: (v: string) => void, opts: { numeric?: 'digits' | 'amount' | 'money' | 'decimal'; helper?: string } = {}): ReactNode => (
    <Draft key={label} label={label} value={value} numeric={opts.numeric} helper={opts.helper} onCommit={commit} />
  )
  const ADD = 'Add new…'
  const select = (label: string, value: string | null, options: readonly string[], commit: (v: string | null) => void, add?: () => void, searchable = false): ReactNode => (
    <TextField key={label} label={label} mode="select" searchable={searchable} options={[...(value && !options.includes(value) ? [value] : []), ...options, ...(add ? [ADD] : [])]} value={value ?? ''}
               onChange={(v) => { if (v === ADD) { add?.(); return } commit(v || null) }} />
  )
  /* (S44I — call C2) a formatted name edits with its description in Words on this line, never in a plain box */
  const nameField = item.nameHtml && !isGroup ? (
    <button key="name" type="button" className={styles.descRow} onClick={() => setDescOpen(true)}>
      <span className={styles.descLabel}>Item name</span>
      <span className={styles.descText}>{item.name}</span>
      <Icon name="chevron_right" size={20} />
    </button>
  ) : <Draft key="name" label={isGroup ? 'Section name' : 'Item name'} value={item.name} inputRef={nameRef} onCommit={(v) => onPatch({ name: v })} />
  const descRow = (
    <button key="desc" type="button" className={styles.descRow} onClick={() => setDescOpen(true)}>
      <span className={styles.descLabel}>{isGroup ? 'Section note' : 'Description'}</span>
      <span className={styles.descText} data-empty={item.description || item.descriptionHtml ? undefined : ''}>{item.descriptionHtml ? htmlToPlain(item.descriptionHtml) : item.description || (isGroup ? 'Add a note' : 'Add a description')}</span>
      <Icon name="chevron_right" size={20} />
    </button>
  )
  const qtyUnit = (
    <div key="qty" className={styles.pair}>
      {variation ? field('Quantity', String(item.qty), (v) => onPatch({ qty: toSigned(v) }), { helper: 'A minus omits it from the contract' }) : field('Quantity', String(item.qty), (v) => onPatch({ qty: toNum(v) }), { numeric: 'decimal' })}
      {select('Unit', item.unit, labels.units, (v) => onPatch({ unit: v }), undefined, true)}   {/* (S44I — M9) the studio's units, type-ahead */}
    </div>
  )
  const priceTotal = (
    <div key="price" className={styles.pair}>
      {field('Unit price (S$)', (unitPriceMinor(item) / 100).toFixed(2), (v) => onPatch({ markupMinor: Math.max(-item.costMinor, toMinor(v) - item.costMinor) }), { numeric: 'money', helper: showCost && showMarkup ? 'Cost + markup' : undefined })}
      <div className={styles.totalBox} data-testid="line-total" aria-live="polite"><span className={styles.totalLabel}>Total</span><span className={styles.totalValue}>{money2(total)}</span></div>
    </div>
  )
  const kindSel = select('Kind', kind ? ITEM_KIND_LABEL[kind] : null, ITEM_KINDS.map((k) => ITEM_KIND_LABEL[k]), (v) => onPatch({ icon: ITEM_KINDS.find((k) => ITEM_KIND_LABEL[k] === v) ?? null, thumb: null, thumbCount: 0 }))
  const costMarkup = showCost || showMarkup ? (
    <div key="cost" className={styles.pair}>
      {showCost ? field('Cost (S$)', (item.costMinor / 100).toFixed(2), (v) => { const c = toMinor(v); onPatch({ costMinor: c, markupMinor: Math.max(-c, item.markupMinor) }) }, { numeric: 'money' }) : null}
      {showMarkup ? field('Markup (S$)', (item.markupMinor / 100).toFixed(2), (v) => onPatch({ markupMinor: Math.max(-item.costMinor, toMinor(v)) }), { numeric: 'money' }) : null}
    </div>
  ) : null
  const discGst = (
    <div key="disc" className={styles.pair}>
      {field('Discount (%)', String(item.discountPct), (v) => onPatch({ discountPct: toNum(v, 100) }), { numeric: 'decimal' })}
      {field('GST (%)', String(item.gstPct), (v) => onPatch({ gstPct: toNum(v, 100) }), { numeric: 'decimal', helper: labels.gstPct !== undefined && item.gstPct !== labels.gstPct ? `Own rate — the studio’s is ${labels.gstPct}%` : undefined })}   {/* (S44I — NB-07 (b)) */}
    </div>
  )
  const room = select('Room', item.room, labels.rooms, (v) => onPatch({ room: v }), () => onAddLabel('room', item.id))
  const category = select('Trade', item.category, labels.categories, (v) => onPatch({ category: v }), () => onAddLabel('category', item.id))
  const sectionLabel = select('Print group', item.section, labels.sections, (v) => onPatch({ section: v }), () => onAddLabel('section', item.id))
  /* (REG-623, parity Q-08 · Q-09) who supplies the line, and its product or spec page — never printed · (one-home N-16) Company › Finance › Vendors, type-ahead */
  const vendor = select('Vendor', item.vendor, labels.vendors, (v) => onPatch({ vendor: v }), () => onAddLabel('vendor', item.id), true)
  const link = field('Website Link', item.link ?? '', (v) => { const u = cleanLink(v); if (u === undefined) onNote('Not a web address — a link starts with https://'); else onPatch({ link: u }) }, { helper: 'A product or spec page — never printed' })
  const image = <Button key="image" variant="secondary" appearance="outlined" iconStart={<Icon name="add_photo_alternate" size={20} />} onPress={onUploadImage}>{item.thumb ? 'Change image' : 'Add an image'}</Button>
  /* the two layers, by what the screen is for */
  const first: ReactNode[] = isGroup ? [nameField, descRow] : mode === 'rest' ? [nameField, descRow, costMarkup, kindSel, room, category] : [nameField, qtyUnit, priceTotal, kindSel]
  const rest: { node: ReactNode; words: string }[] = isGroup ? [{ node: room, words: 'room' }, { node: category, words: 'trade' }, { node: sectionLabel, words: 'print group' }]
    : mode === 'rest' ? [{ node: discGst, words: 'discount and GST' }, { node: sectionLabel, words: 'print group' }, { node: vendor, words: 'vendor' }, { node: link, words: 'link' }, { node: image, words: 'image' }]
    : [{ node: descRow, words: 'description' }, ...(costMarkup ? [{ node: costMarkup, words: 'cost and markup' }] : []), { node: discGst, words: 'discount and GST' }, { node: room, words: 'room' }, { node: category, words: 'trade' }, { node: sectionLabel, words: 'print group' }, { node: vendor, words: 'vendor' }, { node: link, words: 'link' }, { node: image, words: 'image' }]
  const moreWords = rest.map((r) => r.words).slice(0, 4).join(', ') + (rest.length > 4 ? '…' : '')
  return (
    <div className={styles.fields} data-testid="line-fields" data-mode={mode}>
      {first}
      <button type="button" className={styles.moreRow} aria-expanded={more} data-testid="line-more" onClick={() => setMore((m) => !m)}>
        <span className={styles.moreText}>{more ? 'Less' : `More: ${moreWords}`}</span>
        <Icon name={more ? 'expand_less' : 'expand_more'} size={20} />
      </button>
      {more ? rest.map((r) => r.node) : null}
      <DescriptionDialog open={descOpen} name={item.name} nameHtml={item.nameHtml} kind={isGroup ? 'section' : 'item'} value={item.description ?? ''} html={item.descriptionHtml} onClose={() => setDescOpen(false)} tradeNote={isGroup ? labels.tradeNotes?.[item.name.trim().toLowerCase()] : undefined} line={{ priceBookItemId: item.priceBookItemId, category: item.category }} nested={nested} brandColors={brandColors}
                         onSave={(p) => onPatch(p)} />
    </div>
  )
}

/** The line's fields as a bottom sheet (the canvas' rule for every form on a phone, REG-353): Delete and Done pinned in its foot at 48. */
function LineSheet({ open, focusName, item, onClose, onDelete, ...fields }: FieldsProps & { open: boolean; focusName: boolean; onClose: () => void; onDelete: () => void }) {
  const isGroup = item.kind === 'group'
  return (
    <Sheet open={open} onClose={onClose} title={item.name || (isGroup ? 'Section' : 'Item')} subtitle={`${isGroup ? 'Section total' : 'Line total'} ${money2(fields.total)}`} label={`Edit ${item.name || 'item'}`}
           footer={<div className={styles.sheetFoot}><Button variant="secondary" appearance="outlined" size="lg" onPress={onDelete} data-testid="line-delete">{isGroup ? 'Remove' : 'Delete'}</Button><Button size="lg" onPress={onClose}>Done</Button></div>}>
      <div className={styles.sheetBody} data-testid="line-sheet">
        {open ? <LineFields item={item} {...fields} nested focusName={focusName} /> : null}
      </div>
    </Sheet>
  )
}

/**
 * (P-07) The 400 pane beside the tablet's cards: the same fields, Quantity and Unit price first, on the house head and foot — the list stays in
 * view and live while a line is edited; another card's tap simply moves the pane to that line.
 */
export function LinePane({ item, onClose, onDelete, focusName = false, ...fields }: FieldsProps & { onClose: () => void; onDelete: () => void; focusName?: boolean }) {
  const isGroup = item.kind === 'group'
  return (
    <aside className={styles.pane} aria-label={`Edit ${item.name || 'item'}`} data-testid="line-pane">
      <SurfaceHead title={item.name || (isGroup ? 'Section' : 'Item')} subtitle={`${isGroup ? 'Section total' : 'Line total'} ${money2(fields.total)}`} onClose={onClose} />
      <div className={styles.paneBody}>
        <LineFields key={item.id} item={item} {...fields} focusName={focusName} />
      </div>
      <SurfaceFoot><Button variant="secondary" appearance="outlined" onPress={onDelete} data-testid="line-delete">{isGroup ? 'Remove' : 'Delete'}</Button><Button onPress={onClose}>Done</Button></SurfaceFoot>
    </aside>
  )
}

/** A field that keeps its draft while focused and commits on blur (Enter commits too), the cell's contract. */
function Draft({ label, value, numeric, helper, inputRef, onCommit }: { label: string; value: string; numeric?: 'digits' | 'amount' | 'money' | 'decimal'; helper?: string; inputRef?: React.RefObject<HTMLInputElement | null>; onCommit: (v: string) => void }) {
  const [draft, setDraft] = useState<string | null>(null)
  const commit = () => { if (draft !== null && draft !== value) onCommit(draft); setDraft(null) }
  return (
    <TextField label={label} value={draft ?? value} numeric={numeric} helper={helper} inputRef={inputRef} onChange={setDraft} onBlur={commit}
               onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLInputElement).blur() } }} />
  )
}
