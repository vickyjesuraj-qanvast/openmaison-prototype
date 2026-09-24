'use client'

import { Fragment, useRef, useState, type ReactNode } from 'react'
import { menuSideFor } from '@/components/leads/menu-side'
import { ColumnResizer, useColumnWidths } from '@/components/om/column-resize'
import { useColumnDrag } from '@/components/om/column-drag'
import { gridTemplateFor, useColumnLayout, type TableColumn, type TableColumnDef } from '@/components/om/table-columns'
import { useOverflowX } from '@/components/om/use-overflow-x'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { MetaChip } from '@/components/om/meta-chip'
import { useComingSoon } from '@/components/om/snackbar'
import { Tooltip } from '@/components/om/tooltip'
import { Avatar } from '@/components/om/avatar'
import { excerptOf, outlineOf } from '@/lib/contracts/tokens'
import { ago } from '@/lib/templates/ago'
import type { ContractTemplateRow } from '@/lib/contracts/queries'
import styles from './templates-table.module.css'
import own from './contract-templates-table.module.css'

/** The list's columns (REG-537): Template locked first; the user's order, visibility and pins come from Column settings (REG-454). */
export const CONTRACT_TEMPLATE_COLUMN_DEFS: readonly TableColumnDef[] = [
  { key: 'name', label: 'Template', track: 'minmax(318px, 1fr)', locked: true },
  { key: 'excerpt', label: 'Starts with', track: '320px' },
  { key: 'used', label: 'Used by', track: '140px' },
  { key: 'updated', label: 'Updated', track: '132px' },
  { key: 'by', label: 'Updated by', track: '200px' },
]
const SORTABLE: Record<string, boolean> = { excerpt: false, by: false }
const COL_CLASS: Record<string, string | undefined> = { name: styles.colName, excerpt: own.colExcerpt, used: styles.colUsed, updated: styles.colUpdated, by: styles.colBy }
export const CONTRACT_TEMPLATE_MENU_ROWS = 6

/**
 * Company › Templates › Contracts — list view (REG-537, owner 2026-09-18: "table and page title looks different from the
 * quotes template tab … fix the consistency"): the Quotes templates list (templates-table.tsx, its stylesheet reused) with
 * the library's facts as columns — Template (the paper at 26×36 + name + In use) · Starts with · Used by · Updated · Updated by
 * — on the listing's table model: head 56, rows 60, frozen first block, resizable and draggable heads, the shared Column
 * settings drawer, the row kebab on hover with its side measured.
 */
export function ContractTemplatesTable({ rows, now, onOpen, menu, columns, onReorder }: {
  rows: ContractTemplateRow[]
  now: number
  onOpen: (t: ContractTemplateRow) => void
  /** The row's kebab menu, rendered by the gallery (open state and side supplied). */
  menu: (t: ContractTemplateRow, open: boolean, side: 'up' | 'down', onClose: () => void) => ReactNode
  columns: readonly TableColumn[]
  onReorder: (keys: string[]) => void
}) {
  const comingSoon = useComingSoon()
  const [menuRow, setMenuRow] = useState<string | null>(null)
  const [menuSide, setMenuSide] = useState<'up' | 'down'>('down')
  const colWidths = useColumnWidths('contract-templates')
  const tracks = gridTemplateFor(columns, colWidths)
  const headRow = useRef<HTMLDivElement>(null)
  const L0 = useColumnLayout(columns, headRow)
  const D = useColumnDrag(columns, onReorder)
  const L = { ...L0, style: (key: string) => ({ ...L0.style(key), ...D.style(key) }) }   /* (REG-614) every cell rides the drag's transform, so the whole column travels — the Items grid's rule (REG-572) */
  const [frame, overflowing] = useOverflowX()

  return (
    <div ref={frame} className={styles.card} role="table" data-drag-root="" aria-label="Contract templates" data-cols="contract-templates" data-overflow={overflowing || undefined} data-testid="contract-templates-table"
         style={{ '--tracks': tracks } as React.CSSProperties}
         onScroll={(e) => e.currentTarget.toggleAttribute('data-scrolled', e.currentTarget.scrollLeft > 0)}>
      <div ref={headRow} className={styles.head} role="row">
        {columns.map((c) => (
          <div key={c.key} className={`${styles.hCell} ${COL_CLASS[c.key] ?? ''} ${c.pinned ? styles.pin : ''}`} role="columnheader" data-col={c.key} data-pin-edge={L.edge(c.key) || undefined} style={L.style(c.key)} {...D.head(c.key)}>
            {SORTABLE[c.key] === false ? (
              <span className={styles.hLabel}>{c.label}</span>
            ) : (
              <button type="button" className={styles.hSort} onClick={comingSoon}>
                <span className={styles.hLabel}>{c.label}</span>
                <Icon name="unfold_more" size={16} />
              </button>
            )}
            <ColumnResizer table="contract-templates" column={c.key} label={c.label} min={c.key === 'name' ? 160 : 72} />
          </div>
        ))}
      </div>

      {rows.map((t) => {
        const open = menuRow === t.id
        const cell = (key: string, cls: string | undefined, children: ReactNode) => (
          <div className={`${styles.cell} ${cls ?? ''} ${L.pinned(key) ? styles.pin : ''}`} role="cell" data-col={key} data-pin-edge={L.edge(key) || undefined} style={L.style(key)}>{children}</div>
        )
        const cells: Record<string, () => ReactNode> = {
          name: () => cell('name', styles.colName, (
            <>
              <span className={`${styles.thumb} ${own.thumb}`} aria-hidden data-lines={Math.min(6, Math.max(2, outlineOf(t.body).length))}><span className={own.thumbTitle} /><span className={own.thumbLines} /></span>
              <button type="button" className={styles.name} onClick={() => onOpen(t)}>{t.title}</button>
              {t.usedBy > 0 ? <MetaChip>In use</MetaChip> : null}
            </>
          )),
          excerpt: () => cell('excerpt', own.colExcerpt, <span className={`${styles.oneLine} ${styles.muted}`}>{excerptOf(t.body, 120) || '—'}</span>),
          used: () => cell('used', styles.colUsed, t.usedBy > 0 ? <span>{t.usedBy} contract{t.usedBy === 1 ? '' : 's'}</span> : <span className={styles.muted}>Not used yet</span>),
          updated: () => cell('updated', styles.colUpdated, ago(t.updatedAt.getTime(), now)),
          by: () => cell('by', styles.colBy, t.author ? (<><Avatar name={t.author} color={t.authorColor ?? '#666666'} size={24} tooltip={false} /><span className={styles.oneLine}>{t.author}</span></>) : '--'),
        }
        return (
          <div key={t.id} className={styles.row} role="row" data-testid="contract-template-row">
            {columns.map((c) => <Fragment key={c.key}>{cells[c.key]?.()}</Fragment>)}
            <span className={styles.actions} data-open={open || undefined}>
              <span className={styles.actionsInner}>
                <span className={styles.menuWrap}>
                  <span className={styles.float}>
                    <Tooltip label="More options" disabled={open}>
                      <IconButton icon="more_vert" label={`More options for ${t.title}`} variant="primary" className={styles.touchBtn}
                                  aria-haspopup="menu" aria-expanded={open}
                                  onClick={(e) => { if (!open) setMenuSide(menuSideFor(e.currentTarget, CONTRACT_TEMPLATE_MENU_ROWS)); setMenuRow((m) => (m === t.id ? null : t.id)) }} />
                    </Tooltip>
                  </span>
                  {menu(t, open, menuSide, () => setMenuRow(null))}
                </span>
              </span>
            </span>
          </div>
        )
      })}
    </div>
  )
}
