import type { CSSProperties, ReactNode } from 'react'
import { Bone } from './skeleton'
import { tabBones } from '@/lib/company/sections'
import k from './ghost-kit.module.css'

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

/** An outlined TextField (text-field.module.css): the 48 box — 36 at size s, 44 where a finger drives it — and, with a helper, its 16px line 4 below. */
export function GhostField({ helper, size, w }: { helper?: W | boolean; size?: 's'; w?: W }) {
  return (
    <span className={k.fieldCol} style={w !== undefined ? { width: w } : undefined}>
      <Slot kind={size === 's' ? 'fieldS' : 'field'} w="100%" />
      {helper ? <Line w={helper === true ? '64%' : helper} lh={16} h={10} /> : null}
    </span>
  )
}

/** One action in a header or a toolbar: a width is a button, 'icon' a 36 square, `{ fold }` a labelled button that folds into its glyph on a phone. */
export type Action = number | 'icon' | { fold: number }
const isAction = (a: unknown): a is Action => typeof a === 'number' || a === 'icon' || (typeof a === 'object' && a !== null && 'fold' in a)
const act = (a: Action, i: number) => (typeof a === 'object' ? <Slot key={i} kind="btnFold" w={a.fold} /> : <Slot key={i} kind={a === 'icon' ? 'icon' : 'btn'} w={a === 'icon' ? undefined : a} />)

/** The L1 page header (PageHeader): the title, the actions at the right; on a phone the actions wrap under the title when they do not fit. */
export function GhostHead({ title, actions = [] }: { title: number; actions?: Action[] }) {
  return (
    <div className={k.head}>
      <span className={k.headTitle}><Bone w={title} h={28} /></span>
      {actions.length ? <span className={k.headActions}>{actions.map(act)}</span> : null}
    </div>
  )
}

/** The L2 page header (PageHeaderL2): the back arrow, the crumb over the title, the actions. */
export function GhostHead2({ crumb = 96, title, chips = [], actions = [] }: { crumb?: number; title: number; chips?: number[]; actions?: Action[] }) {
  return (
    <div className={k.head2}>
      <Bone w={24} h={24} r={4} />
      <span className={k.head2Title}>
        <span className={k.crumb}><Line w={crumb} lh={16} h={10} /></span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Line w={title} lh={24} h={20} />{chips.map((c, i) => <Slot key={i} kind="chip" w={c} className={k.crumb} />)}</span>
      </span>
      {actions.length ? <span className={k.headActions}>{actions.map(act)}</span> : null}
    </div>
  )
}

/** The om Tabs strip: one bone per tab, as wide as its label reads. */
export function GhostTabs({ labels }: { labels: readonly string[] }) {
  return <div className={k.tabs} aria-hidden>{tabBones([...labels]).map((w, i) => <Bone key={i} w={w} h={14} />)}</div>
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
