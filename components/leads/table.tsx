'use client'

import { Fragment, useMemo, useState } from 'react'
import { Dropdown, DropdownItem } from '@/components/leads/dropdown'
import { highlightMatch } from '@/components/leads/highlight'
import { Checkbox, Tag } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { Avatar } from '@/components/om/avatar'
import { displayDate, isOverdue, money } from '@/lib/format'
import type { LeadRow } from '@/lib/leads/queries'
import styles from './table.module.css'

export type ColumnKey =
  | 'name' | 'stage' | 'tasks' | 'assignees' | 'source' | 'budget' | 'propertyType' | 'created' | 'address'

export type ColumnConfig = { key: ColumnKey; label: string; visible: boolean; pinned: boolean }

export const DEFAULT_COLUMNS: ColumnConfig[] = [
  { key: 'name', label: 'Lead Name', visible: true, pinned: true },
  { key: 'stage', label: 'Stage', visible: true, pinned: false },
  { key: 'tasks', label: 'Tasks', visible: true, pinned: false },
  { key: 'assignees', label: 'Assignees', visible: true, pinned: false },
  { key: 'source', label: 'Source', visible: true, pinned: false },
  { key: 'budget', label: 'Budget (S$)', visible: true, pinned: false },
  { key: 'propertyType', label: 'Property Type', visible: true, pinned: false },
  { key: 'created', label: 'Created', visible: true, pinned: false },
  { key: 'address', label: 'Address', visible: false, pinned: false },
]

const WIDTHS: Record<ColumnKey, number> = {
  name: 240, stage: 146, tasks: 321, assignees: 160,
  source: 132, budget: 138, propertyType: 158, created: 115, address: 240,
}
const SORTABLE: Record<ColumnKey, boolean> = {
  name: true, stage: true, tasks: false, assignees: true,
  source: true, budget: true, propertyType: true, created: true, address: false,
}

type Sort = { key: ColumnKey; dir: 'asc' | 'desc' } | null
const EMPTY_SELECTION = new Set<string>()

/** Fluid columns (user request 2026-08-27): mock width is the floor; spare container width is shared pro rata. */
const colStyle = (key: ColumnKey) => ({ flex: `${WIDTHS[key]} 0 ${WIDTHS[key]}px` })

function sortValue(row: LeadRow, key: ColumnKey): string | number {
  switch (key) {
    case 'name': return row.name.toLowerCase()
    case 'stage': return row.stage
    case 'assignees': return row.assignees.length
    case 'source': return row.source
    case 'budget': return row.budgetMinor
    case 'propertyType': return row.propertyType
    case 'created': return row.createdAt.getTime()
    default: return ''
  }
}

export function LeadsTable({
  openStageId = null,
  rows,
  columns,
  unseenIds,
  onRowSeen,
  selectable = false,
  selected = EMPTY_SELECTION,
  onToggleSelect = () => {},
  onToggleSelectAll = () => {},
  onNameClick,
  onStageClick,
  onTaskClick,
  onAssignClick,
  onTuneClick,
  onEditRow,
  onDeleteRow,
  onReturnRow,
  onCopyPhone,
  now,
  query = '',
  filterSort = 'newest',
}: {
  /** Row whose stage menu is open — its stage cell shows the 2px primary outline (780:86452). */
  openStageId?: string | null
  rows: LeadRow[]
  columns: ColumnConfig[]
  /** Leads nobody has opened or clicked yet — they carry the primary band + bold name (user 2026-08-29). */
  unseenIds?: Set<string>
  onRowSeen?: (row: LeadRow) => void
  /** Row multi-select — off for the listing (user 2026-08-27: no bulk use case there). */
  selectable?: boolean
  selected?: Set<string>
  onToggleSelect?: (id: string) => void
  onToggleSelectAll?: () => void
  onNameClick: (row: LeadRow) => void
  onStageClick: (row: LeadRow, anchor: HTMLElement) => void
  onTaskClick: (row: LeadRow, anchor: HTMLElement) => void
  onAssignClick: (row: LeadRow, anchor: HTMLElement) => void
  onTuneClick: (anchor: HTMLElement) => void
  onEditRow: (row: LeadRow) => void
  onDeleteRow: (row: LeadRow) => void
  onReturnRow: (row: LeadRow) => void
  onCopyPhone: (row: LeadRow) => void
  /** Clock captured by the caller in an event handler / on mount (purity rule). */
  now: number
  /** Live search text — the matched substring of the name is emphasised (C2). */
  query?: string
  /** Filters modal sort — resets/sets the column sort so the two never fight. */
  filterSort?: 'newest' | 'oldest'
}) {
  const [sort, setSort] = useState<Sort>(null)
  const [menuRow, setMenuRow] = useState<string | null>(null)
  // Render-phase adjust: a Filters-modal sort change owns the column sort.
  const [seenFilterSort, setSeenFilterSort] = useState(filterSort)
  if (seenFilterSort !== filterSort) {
    setSeenFilterSort(filterSort)
    setSort(filterSort === 'oldest' ? { key: 'created', dir: 'asc' } : null)
  }

  const visible = columns.filter((c) => c.visible)
  const minWidth = visible.reduce((w, c) => w + WIDTHS[c.key], 0)
  // Pinned columns stack from the left; only the LAST one carries the 2px divider + shadow (user rule 2026-08-27).
  const pinOffset: Partial<Record<ColumnKey, number>> = {}
  let pinAcc = 0
  for (const c of visible) if (c.pinned) { pinOffset[c.key] = pinAcc; pinAcc += WIDTHS[c.key] }
  const pinEdge = [...visible].reverse().find((c) => c.pinned)?.key
  const cellProps = (col: ColumnConfig, base: string | undefined) => ({
    className: col.pinned ? `${base} ${styles.pin}` : base,
    style: col.pinned ? { ...colStyle(col.key), left: `calc(${pinOffset[col.key] ?? 0}px * var(--col-scale, 1))` } : colStyle(col.key),
    'data-pin-edge': col.pinned && col.key === pinEdge ? true : undefined,
  })
  // Fluid columns grow pro rata, so sticky offsets scale by (rendered width ÷ floor). DOM write only.
  const tableRef = (el: HTMLDivElement | null) => {
    if (!el) return
    const apply = () => el.style.setProperty('--col-scale', String(Math.max(1, el.clientWidth / minWidth)))
    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(el)
    return () => ro.disconnect()
  }
  const sorted = useMemo(() => {
    if (!sort) return rows
    const out = [...rows].sort((a, b) => {
      const av = sortValue(a, sort.key); const bv = sortValue(b, sort.key)
      const c = av < bv ? -1 : av > bv ? 1 : 0
      return sort.dir === 'asc' ? c : -c
    })
    return out
  }, [rows, sort])

  const cycle = (key: ColumnKey) => {
    setSort((s) => (s?.key !== key ? { key, dir: 'asc' } : s.dir === 'asc' ? { key, dir: 'desc' } : null))
  }
  const sortIcon = (key: ColumnKey) =>
    sort?.key === key ? (sort.dir === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'

  const renderCell = (row: LeadRow, col: ColumnConfig) => {
    switch (col.key) {
      case 'name':
        return (
          <div key={col.key} {...cellProps(col, `${styles.cell} ${styles.nameCell}`)}>
            {/* Accent bar + selection checkbox are children of the pinned cell so they stay put on horizontal scroll. */}
            <span className={styles.accent} />
            {selectable ? (
              <span className={styles.selBox}>
                <Checkbox
                  isSelected={selected.has(row.id)}
                  onChange={() => onToggleSelect(row.id)}
                  aria-label={`Select ${row.name}`}
                />
              </span>
            ) : null}
            <span
              className={styles.name}
              role="link"
              tabIndex={0}
              onClick={() => onNameClick(row)}
              onKeyDown={(e) => e.key === 'Enter' && onNameClick(row)}
            >
              {highlightMatch(row.name, query)}
            </span>
            <span className={styles.phoneRow}>
              <span className={styles.phone}>
                {row.phone}
                {/* On Hold leads say till when, in the card's dot format (user 2026-08-29) */}
                {row.stage === 'On Hold' && row.onHoldFollowUp ? ` · On hold till: ${displayDate(new Date(row.onHoldFollowUp))}` : null}
              </span>
              <Tooltip label="Copy phone number">
                <button type="button" className={styles.copyBtn} aria-label={`Copy ${row.name}'s phone number`}
                        onClick={() => onCopyPhone(row)}>
                  <Icon name="content_copy" size={14} weight={300} />
                </button>
              </Tooltip>
            </span>
          </div>
        )
      case 'stage':
        return (
          <div key={col.key} {...cellProps(col, styles.cell)} data-open={row.id === openStageId || undefined}>
            <button type="button" className={styles.stageBtn}
                    title={row.onHoldFollowUp ? `Next follow up: ${displayDate(new Date(row.onHoldFollowUp))}` : undefined}
                    onClick={(e) => onStageClick(row, e.currentTarget.parentElement as HTMLElement) /* anchor = the cell (780:86452) */}>
              {row.stage}
              <span className={styles.chev}><Icon name="keyboard_arrow_down" size={20} /></span>
            </button>
          </div>
        )
      case 'tasks': {
        const first = row.tasks[0]
        const overdue = row.tasks.some((t) => isOverdue(t.dueAt, now))
        const extra = row.tasks.length - 1
        return (
          <div key={col.key} {...cellProps(col, styles.cell)}>
            {first ? (
              <button type="button" className={styles.taskBox} onClick={(e) => onTaskClick(row, e.currentTarget)}>
                <span className={styles.taskText}>{first.title}</span>
                {overdue ? <Tag color="red" appearance="outlined">Overdue</Tag> : null}
                {extra > 0 ? <Tag appearance="outlined">{`+${extra}`}</Tag> : null}
              </button>
            ) : (
              /* No mocked affordance for a task-less lead — a visible link in the
                 Assign-link pattern opens the same popover (REG-44 → REG-90). */
              <button type="button" className={styles.assignLink}
                      aria-label={`Add a task for ${row.name}`}
                      onClick={(e) => onTaskClick(row, e.currentTarget)}>
                <Icon name="add" size={20} />
                Add task
              </button>
            )}
          </div>
        )
      }
      case 'assignees':
        return (
          <div key={col.key} {...cellProps(col, styles.cell)}>
            {row.assignees.length === 0 ? (
              <button type="button" className={styles.assignLink} onClick={(e) => onAssignClick(row, e.currentTarget)}>
                <Icon name="person_add" size={20} />
                Assign
              </button>
            ) : (
              <span className={styles.memberStack}>
                {row.assignees.slice(0, 2).map((m) => (
                  <Avatar key={m.id} name={m.name} color={m.color} size={24} />
                ))}
                {row.assignees.length > 2 ? <span className={styles.plusBox}>+{row.assignees.length - 2}</span> : null}
                <Tooltip label="Assign members">
                  <IconButton
                    icon="person_add" label={`Assign members to ${row.name}`}
                    size={24} variant="primary"
                    onClick={(e) => onAssignClick(row, e.currentTarget)}
                  />
                </Tooltip>
              </span>
            )}
          </div>
        )
      case 'source':
        return <div key={col.key} {...cellProps(col, styles.cell)}><span className={styles.plain}>{row.source}</span></div>
      case 'budget':
        return <div key={col.key} {...cellProps(col, styles.cell)}><span className={styles.plain}>{money(row.budgetMinor)}</span></div>
      case 'propertyType':
        return <div key={col.key} {...cellProps(col, styles.cell)}><span className={styles.plain}>{row.propertyType}</span></div>
      case 'created':
        return <div key={col.key} {...cellProps(col, styles.cell)}><span className={styles.plain}>{displayDate(row.createdAt)}</span></div>
      case 'address':
        return <div key={col.key} {...cellProps(col, styles.cell)}><span className={styles.plain}>{row.propertyAddress ?? '—'}</span></div>
    }
  }

  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id))

  return (
    <div className={styles.card}>
      <div className={styles.scroller} onScroll={(e) => e.currentTarget.toggleAttribute('data-scrolled', e.currentTarget.scrollLeft > 0)}>
        <div ref={tableRef} className={styles.table} role="table" aria-label="Leads" data-selectable={selectable || undefined} data-selecting={selected.size > 0 || undefined}
             style={{ minWidth }}>
          <div className={styles.headRow} role="row">
            {visible.map((col, i) => (
              <div
                key={col.key}
                {...cellProps(col, styles.hCell)}
                role="columnheader"
              >
                {i === 0 && selectable ? (
                  <span className={styles.headSelBox}>
                    <Checkbox isSelected={allSelected} onChange={onToggleSelectAll} aria-label="Select all leads" />
                  </span>
                ) : null}
                {SORTABLE[col.key] ? (
                  <button type="button" className={styles.hSort} data-sorted={sort?.key === col.key || undefined} onClick={() => cycle(col.key)}>
                    <span className={styles.hLabel}>{col.label}</span>
                    <Icon name={sortIcon(col.key)} size={16} />
                  </button>
                ) : (
                  <span className={styles.hLabel}>{col.label}</span>
                )}
                {i === 0 ? (
                  <span className={styles.hTools}>
                    <Tooltip label="Customise your view">
                      <button type="button" className={styles.hTune} aria-label="Customise your view" onClick={(e) => onTuneClick(e.currentTarget)}>
                        <Icon name="tune" size={16} />
                      </button>
                    </Tooltip>
                  </span>
                ) : null}
              </div>
            ))}
          </div>
          {sorted.map((row, rowIdx) => (
            <div
              key={row.id}
              className={styles.row}
              role="row"
              data-highlight={unseenIds?.has(row.id) || undefined}
              data-selected={selected.has(row.id) || undefined}
              onPointerDownCapture={unseenIds?.has(row.id) ? () => onRowSeen?.(row) : undefined}
            >
              {visible.map((col) => (
                <Fragment key={col.key}>{renderCell(row, col)}</Fragment>
              ))}
              <span className={styles.rowActions} data-open={menuRow === row.id || undefined}>
                <span className={styles.rowActionsInner}>
                  <button type="button" className={styles.rowEdit} onClick={() => onEditRow(row)}>Edit</button>
                  <span style={{ position: 'relative', display: 'inline-flex' }}>
                    <Tooltip label="More actions" disabled={menuRow === row.id}>
                      <button type="button" className={styles.rowKebab} aria-label={`More actions for ${row.name}`}
                              aria-haspopup="menu" aria-expanded={menuRow === row.id}
                              onClick={() => setMenuRow((m) => (m === row.id ? null : row.id))}>
                        <Icon name="more_vert" size={20} weight={300} />
                      </button>
                    </Tooltip>
                    <Dropdown open={menuRow === row.id} onClose={() => setMenuRow(null)} align="right"
                              side={sorted.length >= 3 && rowIdx >= sorted.length - 2 ? 'up' : 'down'}>
                      <DropdownItem onSelect={() => { setMenuRow(null); onDeleteRow(row) }}>
                        <span style={{ color: 'var(--om-color-tertiary-red-default)' }}>Delete</span>
                      </DropdownItem>
                      {row.source === 'Qanvast' ? (
                        /* Return Lead exists only for Qanvast-sourced leads (user 2026-08-29); its own return flow comes later */
                        <DropdownItem onSelect={() => { setMenuRow(null); onReturnRow(row) }}>Return Lead</DropdownItem>
                      ) : null}
                    </Dropdown>
                  </span>
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
