'use client'

import { Fragment, useRef, useState } from 'react'
import Link from 'next/link'
import { menuSideFor } from '@/components/leads/menu-side'
import { Avatar } from '@/components/om/avatar'
import { ColumnResizer, useColumnWidths } from '@/components/om/column-resize'
import { useColumnDrag } from '@/components/om/column-drag'
import { gridTemplateFor, useColumnLayout, type TableColumn, type TableColumnDef } from '@/components/om/table-columns'
import { useOverflowX } from '@/components/om/use-overflow-x'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { MetaChip } from '@/components/om/meta-chip'
import { useComingSoon } from '@/components/om/snackbar'
import { Tooltip } from '@/components/om/tooltip'
import { TemplateThumb } from '@/components/templates/render/document'
import type { BrandKit, TemplateSummary } from '@/lib/templates/model'
import type { DocData } from '@/lib/templates/data'
import { ago } from '@/lib/templates/ago'
import { TEMPLATE_MENU_ROWS, TemplateMenu, type TemplateAction } from './template-menu'
import styles from './templates-table.module.css'

/** The list's columns (REG-505): Template locked first; the user's order, visibility and pins come from Column settings (REG-454). */
/** The one stamp the card's status line and the row's Updated column share: a published template's publish time, a draft's edit time. */
export const updatedStamp = (t: TemplateSummary) => (t.status === 'published' && !t.hasDraft ? t.publishedAt ?? t.updatedAt : t.updatedAt)

export const TEMPLATE_COLUMN_DEFS: readonly TableColumnDef[] = [
  { key: 'name', label: 'Template', track: 'minmax(318px, 1fr)', locked: true },
  { key: 'status', label: 'Status', track: '236px' },
  { key: 'used', label: 'Used by', track: '140px' },
  { key: 'paper', label: 'Paper', track: '96px' },
  { key: 'updated', label: 'Updated', track: '132px' },
  { key: 'by', label: 'Updated by', track: '200px' },
]
/* (REG-468) No sort glyph where ordering means nothing. */
const SORTABLE: Record<string, boolean> = { paper: false, by: false }
const COL_CLASS: Record<string, string | undefined> = { name: styles.colName, status: styles.colStatus, used: styles.colUsed, paper: styles.colPaper, updated: styles.colUpdated, by: styles.colBy }

export type TemplatesTableProps = {
  rows: TemplateSummary[]
  brand: BrandKit
  sample: DocData
  now: number
  onOpen: (t: TemplateSummary) => void
  onRowMenu: (t: TemplateSummary, action: TemplateAction) => void
  columns: readonly TableColumn[]
  onReorder: (keys: string[]) => void
}

/**
 * Company › Templates › Quotes — list view (REG-505, owner 2026-09-18: "there is not table view for the quotes template
 * listing. can you create like we have it in the lead listing"). No mock: the Files tab's list (components/leads/files/
 * files-table.tsx) with the gallery card's facts as columns — Template (first page 26×36 + name + Default) · Status ·
 * Used by · Paper · Updated · Updated by — on the listing's table model (REG-427/430/454/462): head 56, rows 60, fixed
 * floors, sideways scroll once the tracks run past the card, the frozen first block, resizable and draggable heads,
 * the shared Column settings drawer, the row kebab on hover with its side measured. No selection column: templates
 * have no bulk action, so there is nothing for one to drive.
 */
export function TemplatesTable({ rows, brand, sample, now, onOpen, onRowMenu, columns, onReorder }: TemplatesTableProps) {
  const comingSoon = useComingSoon()
  const [menuRow, setMenuRow] = useState<string | null>(null)
  const [menuSide, setMenuSide] = useState<'up' | 'down'>('down')
  const colWidths = useColumnWidths('quote-templates')
  const tracks = gridTemplateFor(columns, colWidths)
  const headRow = useRef<HTMLDivElement>(null)
  const L = useColumnLayout(columns, headRow)
  const D = useColumnDrag(columns, onReorder)
  const [frame, overflowing] = useOverflowX()

  const status = (t: TemplateSummary) => {
    if (t.submitted) return { word: 'Awaiting approval', tone: 'await' as const, note: `${t.submitted.by?.name ?? 'a designer'} · ${ago(t.submitted.at, now)}${t.status === 'published' ? ` · v${t.version} still prints` : ''}` }
    if (t.status === 'draft') return { word: 'Draft', tone: 'draft' as const, note: null }
    return { word: `Published v${t.version}`, tone: 'published' as const, note: t.hasDraft ? `edited since v${t.version}` : null }   /* (REG-577) */
  }

  return (
    <div ref={frame} className={styles.card} role="table" aria-label="Quote templates" data-cols="quote-templates" data-overflow={overflowing || undefined}
         style={{ '--tracks': tracks } as React.CSSProperties}
         onScroll={(e) => e.currentTarget.toggleAttribute('data-scrolled', e.currentTarget.scrollLeft > 0)}>
      <div ref={headRow} className={styles.head} role="row">
        {columns.map((c) => (
          <div key={c.key} className={`${styles.hCell} ${COL_CLASS[c.key] ?? ''} ${c.pinned ? styles.pin : ''}`} role="columnheader" data-col={c.key} data-pin-edge={L.edge(c.key) || undefined} style={{ ...L.style(c.key), ...D.style(c.key) }} {...D.head(c.key)}>
            {SORTABLE[c.key] === false ? (
              <span className={styles.hLabel}>{c.label}</span>
            ) : (
              <button type="button" className={styles.hSort} onClick={comingSoon}>
                <span className={styles.hLabel}>{c.label}</span>
                <Icon name="unfold_more" size={16} />
              </button>
            )}
            <ColumnResizer table="quote-templates" column={c.key} label={c.label} min={c.key === 'name' ? 160 : 72} />
          </div>
        ))}
      </div>

      {rows.map((t) => {
        const s = status(t)
        const open = menuRow === t.id
        const cell = (key: string, cls: string | undefined, children: React.ReactNode) => (
          <div className={`${styles.cell} ${cls ?? ''} ${L.pinned(key) ? styles.pin : ''}`} role="cell" data-col={key} data-pin-edge={L.edge(key) || undefined} style={L.style(key)}>{children}</div>
        )
        const cells: Record<string, () => React.ReactNode> = {
          name: () => cell('name', styles.colName, (
            <>
              <span className={styles.thumb} aria-hidden><TemplateThumb design={t.design} brand={brand} data={sample} width={26} /></span>
              <button type="button" className={styles.name} onClick={() => onOpen(t)}>{t.name}</button>
              {t.isDefault ? <MetaChip>Default</MetaChip> : null}
            </>
          )),
          status: () => cell('status', styles.colStatus, (
            <span className={styles.status}>
              <span className={styles.statusWord} data-tone={s.tone}>{s.word}</span>
              {s.note ? <span className={styles.statusNote}>{s.note}</span> : null}
            </span>
          )),
          used: () => cell('used', styles.colUsed, t.usedBy > 0
            ? <Link href={`/quotes?template=${t.id}`} className={styles.usedLink} aria-label={`Quotes on ${t.name}`}>{t.usedBy} quote{t.usedBy === 1 ? '' : 's'}</Link>
            : <span className={styles.muted}>Not used yet</span>),
          paper: () => cell('paper', styles.colPaper, t.paper),
          updated: () => cell('updated', styles.colUpdated, ago(updatedStamp(t), now)),
          by: () => cell('by', styles.colBy, t.updatedBy ? (
            <>
              <Avatar name={t.updatedBy.name} color={t.updatedBy.color} size={24} tooltip={false} />
              <span className={styles.oneLine}>{t.updatedBy.name}</span>
            </>
          ) : '--'),
        }
        return (
          <div key={t.id} className={styles.row} role="row" data-testid="template-row">
            {columns.map((c) => <Fragment key={c.key}>{cells[c.key]?.()}</Fragment>)}
            <span className={styles.actions} data-open={open || undefined}>
              <span className={styles.actionsInner}>
                <span className={styles.menuWrap}>
                  <span className={styles.float}>
                    <Tooltip label="More options" disabled={open}>
                      <IconButton icon="more_vert" label={`More options for ${t.name}`} variant="primary" className={styles.touchBtn}
                                  aria-haspopup="menu" aria-expanded={open}
                                  onClick={(e) => { if (!open) setMenuSide(menuSideFor(e.currentTarget, TEMPLATE_MENU_ROWS)); setMenuRow((m) => (m === t.id ? null : t.id)) }} />
                    </Tooltip>
                  </span>
                  <TemplateMenu t={t} open={open} side={menuSide} onClose={() => setMenuRow(null)} onPick={(a) => onRowMenu(t, a)} />
                </span>
              </span>
            </span>
          </div>
        )
      })}
    </div>
  )
}
