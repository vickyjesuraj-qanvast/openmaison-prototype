'use client'

import { useRef, useState, type CSSProperties } from 'react'
import { Checkbox } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { PortalMenu } from '@/components/om/portal-menu'
import { ColumnResizer, useColumnWidths } from '@/components/om/column-resize'
import { ACTIONS_TRAIL, gridTemplateFor, useColumnLayout, type TableColumn } from '@/components/om/table-columns'
import { useColumnDrag } from '@/components/om/column-drag'
import { useOverflowX } from '@/components/om/use-overflow-x'
import { highlightMatch } from '@/components/leads/highlight'
import type { ProjectRow } from '@/lib/projects/model'
import type { ProjectColumn } from './project-columns'
import { PROJECT_MENU_WIDTH, ProjectMenuItems, type ProjectMenuAction } from './project-menu'
import { holdWords } from './project-columns'
import { holdSummary } from '@/lib/projects/hold'   // (gaps build, package A — M-01)
import styles from './projects-table.module.css'

export type ProjectSort = { key: string; dir: 'asc' | 'desc' } | null
/** (fix-A, A-31) The line under the name carries what the name doesn't say: the property, and the client only when the name leaves them out. */
export const subLine = (r: Pick<ProjectRow, 'name' | 'client' | 'property'>) => (r.property && r.name.toLowerCase().includes(r.client.toLowerCase()) ? r.property : [r.client, r.property].filter(Boolean).join(' · '))
/** The selection cell's place on a GRID table: the layout hook gives it only its sticky `left` (the flex tables order it by DOM), so it is
    pinned to the first track and the row's line here — else the row's actions band (spanning every track) pushes it to the end. */
const SEL = (style: CSSProperties | undefined): CSSProperties => ({ ...style, gridColumn: 1, gridRow: 1 })

/**
 * (REG-924) The Projects listing — the Leads listing's table model on the table core (REG-430 · REG-727): the selection column always
 * visible (REG-614), the Project column locked and frozen, Column settings' order / visibility / pins (REG-454), heads that drag to
 * reorder with the whole column travelling, widths dragged in memory only, sideways scroll inside the card, the row's actions parked at
 * the visible edge (the row's kebab — the project page's own menu; the name opens the project). Sorting orders by a column's `sort`; a head without one is a label.
 * (parity P-22, B-06) The Quotes table's selection column — a 40 track, the box 16 in — so the name lands at 52 (REG-820); the whole Project
 * cell opens the project (REG-349's guard: a control inside keeps its own press). (parity P-17) The Members cell assigns from the row.
 */
export function ProjectsTable({ rows, columns, registry, sort, onSort, onReorder, selected, onToggle, onToggleAll, onOpen, onMenu, onAssign, query, now, reason }: {
  rows: ProjectRow[]
  columns: readonly TableColumn[]
  registry: ProjectColumn[]
  sort: ProjectSort
  onSort: (key: string) => void
  onReorder: (keys: string[]) => void
  selected: Set<string>
  onToggle: (id: string) => void
  onToggleAll: () => void
  onOpen: (r: ProjectRow) => void
  onMenu: (r: ProjectRow, action: ProjectMenuAction) => void
  /** (parity P-17) The Members cell's person_add / Assign — the workspace anchors the Assign popover on it. */
  onAssign?: (r: ProjectRow, anchor: HTMLElement) => void
  query: string
  now: number
  /** (fix-E, E-21) The row's reason line in a scope that names its own (Needs my review); else the first attention reason. */
  reason?: (r: ProjectRow) => string | null
}) {
  const byKey = new Map(registry.map((c) => [c.key, c]))
  const widths = useColumnWidths('projects')
  const tracks = gridTemplateFor(columns, widths, '40px', ACTIONS_TRAIL.kebab)   // the name opens the row (REG-450); the kebab is the row's one action — (parity P-22) the selection track is the Quotes table's 40
  const headRow = useRef<HTMLDivElement>(null)
  const L0 = useColumnLayout(columns, headRow, { leading: 40 })
  const D = useColumnDrag(columns, onReorder)
  const L = { ...L0, style: (key: string) => ({ ...L0.style(key), ...D.style(key) }) }   /* (REG-614) the whole column travels */
  const [frame, overflowing] = useOverflowX()
  const [menuRow, setMenuRow] = useState<string | null>(null)
  const all = rows.length > 0 && rows.every((r) => selected.has(r.id))
  const some = !all && rows.some((r) => selected.has(r.id))
  const q = query.trim()
  const hit = (t: string) => (q ? highlightMatch(t, q) : t)
  const pin = (key: string) => (L.pinned(key) ? styles.pin : '')

  return (
    <div ref={frame} className={styles.card} role="table" aria-label="Projects" data-drag-root="" data-kb-list="project" data-cols="projects" data-overflow={overflowing || undefined}
         style={{ '--tracks': tracks } as CSSProperties}
         onScroll={(e) => e.currentTarget.toggleAttribute('data-scrolled', e.currentTarget.scrollLeft > 0)}>
      <div ref={headRow} className={styles.head} role="row">
        <div className={`${styles.hCell} ${styles.colSel} ${styles.pin}`} role="columnheader" data-col="sel" data-kb-select-all data-pin-edge={L.edge('sel') || undefined} style={SEL(L.style('sel'))}>
          <Checkbox isSelected={all} isIndeterminate={some} isDisabled={rows.length === 0} onChange={onToggleAll} aria-label="Select all projects" />
        </div>
        {columns.map((c) => {
          const def = byKey.get(c.key)
          const sorted = sort?.key === c.key
          return (
            <div key={c.key} className={`${styles.hCell} ${pin(c.key)}`} role="columnheader" data-col={c.key} data-pin-edge={L.edge(c.key) || undefined} style={L.style(c.key)} {...D.head(c.key)}
                 aria-sort={sorted ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}>
              {def?.sort ? (
                <button type="button" className={styles.hSort} data-sorted={sorted || undefined} onClick={() => onSort(c.key)}>
                  <span className={styles.hLabel}>{c.label}</span>
                  <Icon name={sorted ? (sort.dir === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'} size={16} />
                </button>
              ) : <span className={styles.hLabel}>{c.label}</span>}
              <ColumnResizer table="projects" column={c.key} label={c.label} min={c.key === 'project' ? 200 : 72} />
            </div>
          )
        })}
      </div>

      {rows.map((r) => {
        const isSel = selected.has(r.id)
        return (
          <div key={r.id} className={styles.row} role="row" data-selected={isSel || undefined} data-kb-row data-kb-id={r.id} data-attention={r.attention.length ? '' : undefined}>
            <div className={`${styles.cell} ${styles.colSel} ${styles.pin}`} role="cell" data-col="sel" data-pin-edge={L.edge('sel') || undefined} style={SEL(L.style('sel'))} data-kb-select>
              <Checkbox isSelected={isSel} onChange={() => onToggle(r.id)} aria-label={`Select ${r.name}`} />
            </div>
            {columns.map((c) => (
              <div key={c.key} className={`${styles.cell} ${pin(c.key)}${c.key === 'project' ? ` ${styles.identityCell}` : ''}`} role="cell" data-col={c.key} data-pin-edge={L.edge(c.key) || undefined} style={L.style(c.key)}
                   /* (parity P-22, REG-349) the whole cell opens the project — the reason and client · property line were dead; a control inside keeps its own press */
                   onClick={c.key === 'project' ? (e) => { if ((e.target as HTMLElement).closest('button, a, input, [role="checkbox"]')) return; onOpen(r) } : undefined}>
                {c.key === 'project' ? (
                  <span className={styles.identity}>
                    <Tooltip label={r.name} whenCut>
                      <button type="button" className={styles.name} onClick={() => onOpen(r)} data-kb-open>{hit(r.name)}</button>
                    </Tooltip>
                    <span className={styles.sub}>
                      {((w) => (w ? <span className={styles.why} data-testid="row-attention">{w}</span> : null))(reason ? reason(r) : r.attention[0] ?? null)}
                      {r.hold ? <span className={styles.held} data-testid="row-hold">{holdWords(r.hold)}</span> : null}{/* (gaps build, package A — M-01) */}
                      {hit(subLine(r))}
                    </span>
                  </span>
                ) : byKey.get(c.key)?.cell(r, { now, onAssign }) ?? null}
              </div>
            ))}
            <span className={styles.actions} data-open={menuRow === r.id || undefined}>
              <span className={styles.actionsInner}>
                <RowMenu row={r} open={menuRow === r.id} onToggle={() => setMenuRow((m) => (m === r.id ? null : r.id))} onClose={() => setMenuRow(null)} onPick={(a) => { setMenuRow(null); onMenu(r, a) }} now={now} />
              </span>
            </span>
          </div>
        )
      })}
    </div>
  )
}

function RowMenu({ row, open, onToggle, onClose, onPick, now }: { row: ProjectRow; open: boolean; onToggle: () => void; onClose: () => void; onPick: (a: ProjectMenuAction) => void; now: number }) {
  const anchor = useRef<HTMLSpanElement>(null)
  return (
    <span className={styles.menuWrap} ref={anchor}>
      <span className={styles.float}>
        <Tooltip label="More actions" disabled={open}>
          <IconButton icon="more_vert" label={`More actions for ${row.name}`} variant="primary" aria-haspopup="menu" aria-expanded={open} onClick={onToggle} />
        </Tooltip>
      </span>
      <PortalMenu open={open} anchor={anchor} onClose={onClose} align="right" width={PROJECT_MENU_WIDTH} role="menu" sheetTitle={row.name}>   {/* (parity P-11) the project menu's one width, K-A2's */}
        <ProjectMenuItems project={{ direct: row.direct, quoteId: row.quoteId, contractId: row.contractId, stage: row.stage, hold: row.hold ? holdSummary(row.hold, now) : null }} ends={row.ends} canRename={row.ends?.mayHandover ?? true} edit onPick={onPick} />
      </PortalMenu>
    </span>
  )
}
