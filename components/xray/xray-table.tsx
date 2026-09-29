'use client'

import { useRef, useState } from 'react'
import { ColumnResizer, useColumnWidths } from '@/components/om/column-resize'
import { useColumnDrag } from '@/components/om/column-drag'
import { ACTIONS_TRAIL, gridTemplateFor, useColumnLayout, type TableColumn, type TableColumnDef } from '@/components/om/table-columns'
import { useOverflowX } from '@/components/om/use-overflow-x'
import { MetaChip } from '@/components/om/meta-chip'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { PortalMenu } from '@/components/om/portal-menu'
import { DropdownItem, MENU_WIDTH } from '@/components/leads/dropdown'
import { money } from '@/lib/xray/compare'
import type { XrayRow } from '@/lib/xray/compare'
import styles from './xray-table.module.css'

/** The item-by-item columns (REG-529): Item locked first; the rest through Column settings (REG-454). (Sweep S3) The other side's
    column is named for its studio everywhere — the head, the phone card, Column settings and the resize handle. */
export const xrayColumnDefs = (otherStudio: string): readonly TableColumnDef[] => [
  { key: 'item', label: 'Item', track: 'minmax(258px, 1fr)', locked: true },
  { key: 'trade', label: 'Trade', track: '128px' },
  { key: 'yours', label: 'Yours', track: '118px' },
  { key: 'theirs', label: otherStudio || 'Theirs', track: '118px' },
  { key: 'diff', label: 'Difference', track: '118px' },
  { key: 'status', label: 'Status', track: '150px' },
]
const COL_CLASS: Record<string, string | undefined> = { item: styles.colItem, trade: styles.colTrade, yours: styles.colYours, theirs: styles.colTheirs, diff: styles.colDiff, status: styles.colStatus }
const STATUS_WORD: Record<XrayRow['status'], string> = { matched: 'Matched', 'yours-only': 'Only in yours', 'theirs-only': 'Only in theirs', unpriced: 'No price given' }
/** (REG-640, parity Q-14) What a row offers: *Not the same item* on a pair, *Same item as…* on a lone line. */
export type RowAction = { label: string; onSelect: () => void }

/** The row's kebab, parked at the visible right edge as the listing parks its actions (REG-430; sweep S3): a zero-width sticky
    item over the row's tracks, shown on hover or focus and always on touch, its menu through the portal — so hiding Status in
    Column settings never takes the corrections with it, and a table scrolled sideways still shows them. */
function RowMenu({ name, actions }: { name: string; actions: RowAction[] }) {
  const [open, setOpen] = useState(false)
  const anchor = useRef<HTMLSpanElement>(null)
  return (
    <span className={styles.actions} data-open={open || undefined}>
      <span className={styles.actionsInner}>
        <span className={styles.float} ref={anchor}>
          {/* (REG-729) the parked row action is the house 36 primary kebab, as every table's (it was bare) */}
          <Tooltip label="More actions" disabled={open}><IconButton icon="more_vert" label={`More actions for ${name}`} size={36} variant="primary" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)} /></Tooltip>
        </span>
      </span>
      <PortalMenu open={open} anchor={anchor} onClose={() => setOpen(false)} align="right" width={MENU_WIDTH.standard} role="menu" sheetTitle={name}>
        {actions.map((a) => <DropdownItem key={a.label} onSelect={() => { setOpen(false); a.onSelect() }}>{a.label}</DropdownItem>)}
      </PortalMenu>
    </span>
  )
}

/**
 * Quote X-Ray › Item by item — the listing's table model (REG-427 / 430 / 454 / 462): head 56, rows 60, the frozen Item
 * column, resizable and draggable heads, sideways scroll once the tracks run past the card; a phone reads each row as a card.
 */
export function XrayTable({ rows, otherStudio, columns, onReorder, rowActions }: { rows: XrayRow[]; otherStudio: string; columns: readonly TableColumn[]; onReorder: (keys: string[]) => void; rowActions?: (row: XrayRow) => RowAction[] }) {
  const colWidths = useColumnWidths('xray-items')
  const tracks = gridTemplateFor(columns, colWidths, undefined, ACTIONS_TRAIL.kebab)
  const headRow = useRef<HTMLDivElement>(null)
  const L0 = useColumnLayout(columns, headRow)
  const D = useColumnDrag(columns, onReorder)
  const L = { ...L0, style: (key: string) => ({ ...L0.style(key), ...D.style(key) }) }   /* (REG-614) every cell rides the drag's transform, so the whole column travels — the Items grid's rule (REG-572) */
  const [frame, overflowing] = useOverflowX()
  /* (REG-638) yours − theirs, as the Real difference tile reads it: "−" = ours less. A line printing a word has no price to set against theirs. */
  const diffOf = (r: XrayRow) => (r.yoursMinor !== null && r.theirsMinor !== null && r.status === 'matched' && !r.yourWord ? r.yoursMinor - r.theirsMinor : null)
  const qtyOf = (n: number, unit: string) => `${Number.isInteger(n) ? n : Number(n.toFixed(2))} ${unit}`
  return (
    <div ref={frame} className={styles.card} role="table" data-drag-root="" aria-label="Item by item" data-cols="xray-items" data-overflow={overflowing || undefined} data-actions={rowActions ? '' : undefined}
         style={{ '--tracks': tracks } as React.CSSProperties}
         onScroll={(e) => e.currentTarget.toggleAttribute('data-scrolled', e.currentTarget.scrollLeft > 0)}>
      <div ref={headRow} className={styles.head} role="row">
        {columns.map((c) => (
          <div key={c.key} className={`${styles.hCell} ${COL_CLASS[c.key] ?? ''} ${c.pinned ? styles.pin : ''}`} role="columnheader" data-col={c.key} data-pin-edge={L.edge(c.key) || undefined} style={L.style(c.key)} {...D.head(c.key)}>
            <span className={styles.hLabel}>{c.key === 'theirs' ? otherStudio : c.label}</span>
            <ColumnResizer table="xray-items" column={c.key} label={c.key === 'theirs' ? otherStudio : c.label} min={c.key === 'item' ? 160 : 72} />
          </div>
        ))}
      </div>
      {rows.map((r) => {
        const diff = diffOf(r)
        const cell = (key: string, cls: string | undefined, children: React.ReactNode) => (
          <div key={key} className={`${styles.cell} ${cls ?? ''} ${L.pinned(key) ? styles.pin : ''}`} role="cell" data-col={key} data-pin-edge={L.edge(key) || undefined} style={L.style(key)}
               data-label={key === 'theirs' ? otherStudio : undefined}>{children}</div>
        )
        const cells: Record<string, () => React.ReactNode> = {
          item: () => cell('item', styles.colItem, (
            <span className={styles.itemText}>
              <span className={styles.name}>{r.name}</span>
              {r.theirName && r.theirName !== r.name ? <span className={styles.theirName}>{otherStudio}: {r.theirName}</span> : r.room ? <span className={styles.theirName}>{r.room}</span> : null}
            </span>
          )),
          trade: () => cell('trade', styles.colTrade, <span className={styles.oneLine}>{r.trade}</span>),
          yours: () => cell('yours', styles.colYours, r.yoursMinor === null ? <span className={styles.muted}>--</span> : r.yourWord ? <span className={styles.muted}>{r.yourWord}</span> : (
            <span className={styles.figure}><span className={styles.num}>{money(r.yoursMinor)}</span>{r.qty ? <span className={styles.qty}>{qtyOf(r.qty.yours, r.qty.unit)}</span> : null}</span>
          )),
          theirs: () => cell('theirs', styles.colTheirs, r.theirsMinor === null ? <span className={styles.muted}>--</span> : r.theirsMinor === 0 ? <span className={styles.muted}>No price given</span> : (   /* (sweep S3) one name for a line with no price: the Status chip's and the legend's */
            <span className={styles.figure}><span className={styles.num}>{money(r.theirsMinor)}</span>{r.qty ? <span className={styles.qty}>{qtyOf(r.qty.theirs, r.qty.unit)}</span> : null}</span>
          )),
          diff: () => cell('diff', styles.colDiff, diff === null ? <span className={styles.muted}>--</span> : <span className={styles.num} data-sign={diff < 0 ? 'less' : diff > 0 ? 'more' : 'same'}>{diff === 0 ? 'same' : `${diff < 0 ? '−' : '+'}${money(Math.abs(diff))}`}</span>),
          status: () => cell('status', styles.colStatus, <MetaChip>{r.by === 'you' ? 'Paired by you' : STATUS_WORD[r.status]}</MetaChip>),
        }
        const acts = rowActions?.(r) ?? []
        return (
          <div key={r.key} className={styles.row} role="row" data-status={r.status} data-testid="xray-row">
            {columns.map((c) => cells[c.key]?.())}
            {acts.length ? <RowMenu name={r.name} actions={acts} /> : null}
          </div>
        )
      })}
    </div>
  )
}
