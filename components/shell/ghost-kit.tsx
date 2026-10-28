import type { CSSProperties, ReactNode } from 'react'
import { Bone } from './skeleton'
import { tabBones } from '@/lib/company/sections'
import k from './ghost-kit.module.css'
import tf from '@/components/om/text-field.module.css'   // (pending modules S17) a helper's own line
import ch from '@/components/om/chips.module.css'   // (pending modules S17) the house chips' boxes

/**
 * (REG-708) The ghost kit. Every page's ghost is its own layout drawn with bones: the page's containers keep their own classes (the card, the
 * grid, the row), and these pieces stand in for what sits inside them — the header, the tab strip, a line of words, a control's box, a
 * table. One ghost per page, drawn by the route's `loading.tsx` AND handed to the page's `PageReveal`, so the hand-over between the two is
 * invisible and the reveal lands every word where its bone was. Server-safe: no hooks, no browser reads.
 */

type W = number | string

/** A line of words: a bone of `h` inside the line's own `lh` box, so stacked lines keep the page's rhythm. */
export function Line({ w, lh = 20, h = 12, className, style }: { w: W; lh?: number; h?: number; className?: string; style?: CSSProperties }) {
  return <span className={className ? `${k.line} ${className}` : k.line} style={{ height: lh, ...style }}><Bone w={w} h={h} /></span>
}

/**
 * The page's own words as bars: the sentence set in the page's own class (its font, line height and measure) with the letters hidden and
 * each line drawn as a bone — so a help text or a heading wraps in the ghost exactly as it wraps on the page, at every width. For copy the
 * page always shows (a card's title and help); data the ghost can't know takes a `Line`.
 */
export function Words({ children, className, as: Tag = 'span', style }: { children: string; className?: string; as?: 'span' | 'p' | 'h2' | 'h3' | 'div'; style?: CSSProperties }) {
  return <Tag className={className ? `${className} ${k.words}` : k.words} style={style} aria-hidden><span className={k.wordBars}>{children}</span></Tag>
}

/**
 * (pending modules S17) A DS text button, drawn to its own box: 36 tall, padded as the button pads (8 · 4 before an icon), the 20 icon box and
 * the label in the button's type as a bar — so a row of them (a module's *Kept in Company:* links, a member's Preferences · About page) wraps
 * in the ghost where it wraps on the page. Pass the page's own label.
 */
export function GhostTextButton({ label, icon = false, iconEnd = false, className }: { label: string; icon?: boolean; /** a trailing glyph (More details ▾) */ iconEnd?: boolean; className?: string }) {
  return (
    <span className={`${k.textBtn}${icon ? ` ${k.textBtnIcon}` : ''}${iconEnd ? ` ${k.textBtnIconEnd}` : ''}${className ? ` ${className}` : ''}`} aria-hidden>
      {icon ? <Bone w={18} h={18} r={4} /> : null}
      <span className={k.words}><span className={k.wordBars}>{label}</span></span>
      {iconEnd ? <Bone w={18} h={18} r={4} /> : null}
    </span>
  )
}

/** (pending modules S17) The house chips (components/om/chips) as a ghost: each chip its own box — the chip's padding, its stroke's width and
    its type, 44 tall with a finger — filled with the bone colour, so the row wraps where the page's does. Pass the page's own labels. */
export function GhostChips({ labels, widths, rail = false, className }: { labels?: readonly string[]; /** chips whose words are data (a count): their desk widths */ widths?: readonly number[]; /** one row, as a chip rail scrolls them */ rail?: boolean; className?: string }) {
  return (
    <span className={`${ch.chips}${rail ? ` ${k.chipRail}` : ''}${className ? ` ${className}` : ''}`} aria-hidden>
      {labels ? labels.map((l, i) => <span key={`${l}-${i}`} className={`${ch.chip} ${k.chipGhost}`}>{l}</span>)
        : (widths ?? []).map((w, i) => <span key={i} className={`${ch.chip} ${k.chipGhost}`} style={{ width: w }} />)}
    </span>
  )
}

/** (pending modules S17) A MetaChip (the DS Tag at 20) drawn as its own box — its padding, its caption-xs capitals — filled with the bone colour,
    so it is the chip's width exactly. Pass the page's own words. */
export function GhostChip({ label }: { label: string }) {
  return <span className={k.chipBox} aria-hidden>{label}</span>
}

/**
 * (pending modules S17) A cell the page's stylesheet labels on a phone — the card tables' stacked rows print their column's name before the
 * value (`::before { content: attr(data-label) }`, Settings' event tables, the Lead stages' count). Spread onto the ghost's cell with the
 * page's own class: the name takes its room as a bar, its letters hidden, exactly where the page prints it; a desk, which prints no name,
 * draws nothing.
 */
/** (pending modules S17) A `Line` a phone draws and a desk doesn't — a name's second line where a phone's narrow column wraps it. */
export const phoneOnly = k.phoneOnly
/** (pending modules S17) A piece a desk draws and a phone doesn't (`Slot desk`'s rule, for any piece). */
export const deskOnly = k.desk

export const labelled = (className: string | undefined, label: string) => ({ className: `${className ?? ''} ${k.labelled}`, 'data-label': label })

/** (pending modules S17) A tile's or a row's help line that wraps to a second line in a phone's narrow column — one block, the lines' own
    16 apart (no gap between them), the second drawn on a phone only. */
export function HelpLines({ w, w2 }: { w: W; w2: W }) {
  return <span style={{ display: 'flex', flexDirection: 'column' }}><Line w={w} lh={16} h={10} /><Line w={w2} lh={16} h={10} className={k.phoneOnly} /></span>
}

/** Several lines of a paragraph, the last one short. */
export function Para({ lines = 2, w = '92%', last = '58%', lh = 16, h = 10, className }: { lines?: number; w?: W; last?: W; lh?: number; h?: number; className?: string }) {
  return <>{Array.from({ length: lines }, (_, i) => <Line key={i} w={i === lines - 1 && lines > 1 ? last : w} lh={lh} h={h} className={className} />)}</>
}

export type SlotKind = 'field' | 'fieldS' | 'btn' | 'icon' | 'chip' | 'check' | 'avatar' | 'avatar40' | 'switch' | 'tile' | 'pill'
  /** the house toolbar search: the 280 box at a desk, its 36 glyph at ≤1024 (toolbar-search.module.css) */
  | 'search'
  /** a labelled button that folds into its 36 glyph on a phone (the tabs' Add Task ▾ · New ▾) */
  | 'btnFold'
  /** an icon button drawn 44 on a phone (the Files toolbar's touch buttons) */
  | 'iconTouch'

/** A control's box. Its size is the stylesheet's, per width and pointer, as the control's own stylesheet sets it; `w` is the desk width. */
export function Slot({ kind, w, className, style, desk, fill }: { kind: SlotKind; w?: W; className?: string; style?: CSSProperties; /** a desk-only tool (Column settings, the view toggle): gone on a phone, as the real one is */ desk?: boolean; /** spans its row on a phone (an editor's Send · Done) */ fill?: boolean }) {
  const r = kind === 'avatar' || kind === 'avatar40' || kind === 'switch' ? 'var(--om-radius-full)' : undefined
  const width = w === undefined ? undefined : typeof w === 'number' ? `${w}px` : w
  return (
    <span className={`${k.slot} ${k[kind]}${desk ? ` ${k.desk}` : ''}${fill ? ` ${k.fill}` : ''}${className ? ` ${className}` : ''}`} style={width !== undefined ? { ['--slot-w' as string]: width, ...style } : style}>
      <Bone w="100%" r={r} style={{ height: '100%' }} />
    </span>
  )
}

/** An outlined TextField (text-field.module.css): the 48 box — 36 at size s, 44 where a finger drives it — and, with a helper, its 16px line 4 below.
    (pending modules S17) `say` = the helper's own words, set in the field's support line, so a helper that wraps on the page wraps here. */
export function GhostField({ helper, say, size, w }: { helper?: W | boolean; say?: string; size?: 's'; w?: W }) {
  return (
    <span className={k.fieldCol} style={w !== undefined ? { width: w } : undefined}>
      <Slot kind={size === 's' ? 'fieldS' : 'field'} w="100%" />
      {say ? <span className={tf.support}><span className={k.words}><span className={k.wordBars}>{say}</span></span></span> : helper ? <Line w={helper === true ? '64%' : helper} lh={16} h={10} /> : null}
    </span>
  )
}

/** One action in a header or a toolbar: a width is a button, 'icon' a 36 square, `{ fold }` a labelled button that folds into its glyph on a phone,
    `{ desk }` (the calm UI build 2026-10-27, additive) a labelled button a phone doesn't draw there (Tools › Quotes' New quote — the toolbar's
    glyph on a phone). */
export type Action = number | 'icon' | { fold: number } | { desk: number }
const isAction = (a: unknown): a is Action => typeof a === 'number' || a === 'icon' || (typeof a === 'object' && a !== null && ('fold' in a || 'desk' in a))
const act = (a: Action, i: number) => (typeof a === 'object' ? ('fold' in a ? <Slot key={i} kind="btnFold" w={a.fold} /> : <Slot key={i} kind="btn" w={a.desk} desk />) : <Slot key={i} kind={a === 'icon' ? 'icon' : 'btn'} w={a === 'icon' ? undefined : a} />)

/** The L1 page header (PageHeader): the title, the actions at the right; on a phone the actions wrap under the title when they do not fit.
    `after` (the calm UI build 2026-10-27, additive) — PageHeader's `after`: what sits beside the title (a status, an info glyph). */
export function GhostHead({ title, actions = [], after = [] }: { title: number; actions?: Action[]; after?: Action[] }) {
  return (
    <div className={k.head}>
      <span className={k.headTitle}><Bone w={title} h={28} />{after.length ? <span className={k.headAfter}>{after.map(act)}</span> : null}</span>
      {actions.length ? <span className={k.headActions}>{actions.map(act)}</span> : null}
    </div>
  )
}

/** The L2 page header (PageHeaderL2): the back arrow, the crumb over the title, the actions. */
export function GhostHead2({ crumb = 96, title, chips = [], actions = [] }: { crumb?: number; /** (the calm UI build 2026-10-27, 6-34) none: PageHeaderL2's crumb-only form */ title?: number; chips?: number[]; actions?: Action[] }) {
  return (
    <div className={k.head2}>
      <Bone w={24} h={24} r={4} />
      <span className={k.head2Title}>
        <span className={k.crumb}><Line w={crumb} lh={16} h={10} /></span>
        {title !== undefined || chips.length ? <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{title !== undefined ? <Line w={title} lh={24} h={20} /> : null}{chips.map((c, i) => <Slot key={i} kind="chip" w={c} className={k.crumb} />)}</span> : null}
      </span>
      {actions.length ? <span className={k.headActions}>{actions.map(act)}</span> : null}
    </div>
  )
}

/** The om Tabs strip: one bone per tab, as wide as its label reads. */
export function GhostTabs({ labels, active = 0 }: { labels: readonly string[]
  /** (S42 audit A-10) the open tab's place — where the strip scrolls ≤1024 (the live strip centres it, components/om/tabs.tsx), so the hand-over
      never jumps sideways. Drawn in CSS from the bones' own geometry (the strip's width read as `cqw`), so even the server's loader stands there. */
  active?: number }) {
  const widths = tabBones([...labels])
  if (active <= 0 || active >= widths.length) return <div className={k.tabs} aria-hidden>{widths.map((w, i) => <Bone key={i} w={w} h={14} />)}</div>
  /* ≤1024 the row's own padding 16 and gap 20 (the live strip's); a tab on touch is at least 44 wide (REG-273) — the centre of the open one and
     the row's whole width, as the live strip measures them */
  const box = widths.map((w) => Math.max(44, w))
  const centre = 16 + box.slice(0, active).reduce((s, w) => s + w + 20, 0) + box[active]! / 2
  const total = 16 + box.reduce((s, w) => s + w, 0) + 20 * (box.length - 1) + 16
  return (
    <div className={`${k.tabs} ${k.tabsScroll}`} aria-hidden>
      <div className={k.tabsRow} data-active="" style={{ '--ghost-tab-centre': `${centre}px`, '--ghost-tab-total': `${total}px` } as CSSProperties}>
        {widths.map((w, i) => <span key={i} className={k.tabBone}><Bone w={w} h={14} /></span>)}
      </div>
    </div>
  )
}

/** A toolbar: at the left a title (a number: its width) or any node; at the right the tools (a width = a button, 'icon' = a 36 square). */
export function GhostToolbar({ start, end = [], className }: { start?: number | ReactNode; end?: (Action | ReactNode)[]; className?: string }) {
  return (
    <div className={className ? `${k.toolbar} ${className}` : k.toolbar}>
      <span className={k.toolbarStart}>{typeof start === 'number' ? <Line w={start} lh={24} h={16} /> : start}</span>
      {end.length ? <span className={k.toolbarEnd}>{end.map((a, i) => (isAction(a) ? act(a, i) : <span key={i} style={{ display: 'contents' }}>{a}</span>))}</span> : null}
    </div>
  )
}

/** What a table cell holds: a line of `w`, two stacked lines, or a control. */
export type Cell = W | [W, W] | { slot: SlotKind; w?: W } | { node: ReactNode } | null
export type Col = { basis: number; grow?: number; head?: W | null; cell: Cell | ((row: number) => Cell); stick?: boolean }

const cellNode = (c: Cell) => {
  if (c === null) return null
  if (Array.isArray(c)) return <><Line w={c[0]} lh={20} h={12} /><Line w={c[1]} lh={16} h={10} /></>
  if (typeof c === 'object') return 'node' in c ? c.node : <Slot kind={c.slot} w={c.w} />
  return <Line w={c} lh={20} h={12} />
}

/** A table's phone form (≤767): its rows as cards — one framed list (`framed`) or cards apart — `card` tall, a title and `lines` meta lines each. */
export type PhoneRows = { card: number; framed?: boolean; lines?: number }

/** A table on the listing's model: the frame, the head, `rows` rows (and the Add row under them, `foot`); the tracks hold below the desk and the
    box scrolls, as the real ones do — or, with `phone`, a phone gets the rows as the cards the real table turns into. */
export function GhostTable({ cols, rows = 8, head = 56, row = 64, foot, phone, className }: { cols: Col[]; rows?: number; head?: number; row?: number; foot?: number; phone?: PhoneRows; className?: string }) {
  const style = (c: Col): CSSProperties => ({ flex: `${c.grow ?? 0} 0 ${c.basis}px` })
  return (
    <>
    {phone ? (
      <div className={k.pList} data-framed={phone.framed || undefined} aria-hidden>
        {Array.from({ length: Math.min(rows, 5) }, (_, r) => (
          <div key={r} className={k.pCard} style={{ height: phone.card }}>
            <Line w={cycle(['62%', '48%', '70%', '54%', '58%'], r)} lh={20} h={14} />
            {Array.from({ length: phone.lines ?? 2 }, (_, j) => <Line key={j} w={cycle(['40%', '56%', '34%'], r + j)} lh={16} h={10} />)}
          </div>
        ))}
        {foot ? <div className={k.pFoot} style={{ height: foot }}><Line w={87} lh={20} h={12} /></div> : null}
      </div>
    ) : null}
    <div className={`${k.table}${phone ? ` ${k.hasPhone}` : ''}${className ? ` ${className}` : ''}`} aria-hidden>
      <div className={k.tHead} style={{ height: head }}>
        {cols.map((c, i) => <span key={i} className={k.tCell} style={style(c)}>{c.head === null ? null : <Bone w={c.head ?? 48} h={10} />}</span>)}
      </div>
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className={k.tRow} style={{ height: row }}>
          {cols.map((c, i) => {
            const cell = typeof c.cell === 'function' ? c.cell(r) : c.cell
            return <span key={i} className={Array.isArray(cell) ? `${k.tCell} ${k.tStack}` : k.tCell} style={style(c)}>{cellNode(cell)}</span>
          })}
        </div>
      ))}
      {foot ? <div className={k.tFoot} style={{ height: foot }}><Line w={87} lh={20} h={12} /></div> : null}
    </div>
    </>
  )
}

/** Deterministic widths so rows read as data, not a grid. */
export const cycle = <T,>(list: readonly T[], i: number): T => list[i % list.length]!
