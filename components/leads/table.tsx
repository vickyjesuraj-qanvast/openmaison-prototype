'use client'

import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { DropdownItem, MENU_WIDTH } from '@/components/leads/dropdown'
import { PortalMenu } from '@/components/om/portal-menu'
import { highlightMatch, highlightPhone } from '@/components/leads/highlight'
import { Button, Checkbox, Tag } from '@/components/ds'
import { useColumnDrag } from '@/components/om/column-drag'
import { ColumnResizer, useColumnWidths } from '@/components/om/column-resize'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { Avatar } from '@/components/om/avatar'
import { displayDate, displayDateLong, displayDateTimeDot, displayDue, displayTime, dueDistance, isOverdue, money, phoneLocal } from '@/lib/format'
import type { LeadRow } from '@/lib/leads/queries'
import { BLANK, daysInStage, stageAge, stageSinceText } from '@/lib/leads/row-text'
import { canReturnLead, projectHoldsDelete } from '@/lib/leads/stage-policy'
import { TOUCH_TABLET, useMediaQuery } from '@/lib/breakpoint'
import styles from './table.module.css'

export type ColumnKey =
  | 'name' | 'stage' | 'inStage' | 'tasks' | 'assignees' | 'source' | 'budget' | 'propertyType' | 'created' | 'address' | 'lastContact' | 'district' | 'nextFollowUp'

export type ColumnConfig = { key: ColumnKey; label: string; visible: boolean; pinned: boolean }

export const DEFAULT_COLUMNS: ColumnConfig[] = [
  { key: 'name', label: 'Lead Name', visible: true, pinned: true },
  { key: 'stage', label: 'Stage', visible: true, pinned: false },
  { key: 'inStage', label: 'In stage', visible: false, pinned: false },   /* (UX audit L3) how long in the stage — "5d in Met", off until switched on */
  { key: 'tasks', label: 'Tasks', visible: true, pinned: false },
  { key: 'assignees', label: 'Members', visible: true, pinned: false },   /* REG-290: the key stays `assignees` (data), the label is Members */
  { key: 'source', label: 'Source', visible: true, pinned: false },
  { key: 'budget', label: 'Budget (S$)', visible: true, pinned: false },
  { key: 'propertyType', label: 'Property Type', visible: true, pinned: false },
  { key: 'created', label: 'Created', visible: true, pinned: false },
  { key: 'address', label: 'Address', visible: false, pinned: false },
  { key: 'lastContact', label: 'Last contact', visible: false, pinned: false },   /* (REG-600) off until switched on — the mock's table keeps its columns */
  { key: 'district', label: 'District', visible: false, pinned: false },   /* (REG-607) 1.0's Area / District, off until switched on */
  { key: 'nextFollowUp', label: 'Next follow-up', visible: false, pinned: false },   /* (REG-608) the earliest dated open task, off until switched on */
]

/** (Leads on the move, L3 — P-06 · A-12, his marks 2026-10-23) A touch tablet's first screen: Name · Stage · Last contact · Next follow-up ·
 *  Members — who to call and when — the rest one switch away in Column settings, remembered for the tablet apart (`om.columns.leads.tablet`). */
/** (held calls 2026-10-24, K-12) A touch tablet's day and time in a narrow cell — "Mon 19 Oct · 10:00 AM", the year only when it is not this
    one (the phone's short day, `dayLabel`'s) — so Next follow-up stands whole beside the frozen Edit · ⋮ at 1024 (Last contact's own short form already fits). */
const TABLET_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const TABLET_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
function tabletWhen(d: Date, now: number): string {
  const year = d.getFullYear() === new Date(now).getFullYear() ? '' : ` ’${String(d.getFullYear()).slice(2)}`
  return `${TABLET_DAYS[d.getDay()]} ${d.getDate()} ${TABLET_MONTHS[d.getMonth()]}${year} · ${displayTime(d)}`
}
const TABLET_SET: readonly ColumnKey[] = ['name', 'stage', 'lastContact', 'nextFollowUp', 'assignees']
export const TABLET_COLUMNS: ColumnConfig[] = [
  ...TABLET_SET.map((k) => ({ ...DEFAULT_COLUMNS.find((c) => c.key === k)!, visible: true })),
  ...DEFAULT_COLUMNS.filter((c) => !TABLET_SET.includes(c.key)).map((c) => ({ ...c, visible: false })),
]

const WIDTHS: Record<ColumnKey, number> = {
  name: 240, stage: 146, inStage: 180, tasks: 321, assignees: 160,
  source: 132, budget: 138, propertyType: 158, created: 115, address: 240, lastContact: 200, district: 120, nextFollowUp: 240,   /* (Dane UAT 5.13) the widest "Wed, 28 May ’26 · 10:00 PM" uncut — was 200 */
}
/* (REG-468, sort audit 2026-09-16: "Remove the 17") A glyph only where ordering answers a question: names, stage, budget, dates.
   Members (several per cell), Source and Property Type (categories the filter serves) lost theirs. */
const SORTABLE: Record<ColumnKey, boolean> = {
  name: true, stage: true, inStage: true, tasks: false, assignees: false,
  source: false, budget: true, propertyType: false, created: true, address: false, lastContact: true, district: false, nextFollowUp: true,
}

type Sort = { key: ColumnKey; dir: 'asc' | 'desc' } | null
/** (parity P-18) The head sort, held by the listing so its address can keep it (lib/leads/listing-url.ts). */
export type LeadSort = Sort
/** (parity P-18) Does this head sort? — what the address's `col` is read against. */
export const isSortableColumn = (k: string): k is ColumnKey => Object.prototype.hasOwnProperty.call(SORTABLE, k) && SORTABLE[k as ColumnKey]
const EMPTY_SELECTION = new Set<string>()

/** Fluid columns (user request 2026-08-27): mock width is the floor; spare container width is shared pro rata — unless the
    user dragged the column (REG-427), which fixes it at that width. */
/** (REG-733) The mouse's actions band: 16 inset + Edit 64 + 12 + kebab 36 + 12 clear − the last cell's own 24 padding. */
const ACTIONS_BAND = 116

/** (Leads on the move, P-06) A touch tablet's floors — 12 inside each cell (table.module.css), so Name · Stage · Last contact stand on a 768 frame's
 *  first screen beside the frozen Edit and ⋮, and all five on a 1024 one. */
/*  (responsive audit 2026-10-23, W2-03) Members 144: two avatars, the +n box and the Assign glyph are 120 inside the cell's 12 + 12 — at 128 a lead
 *  with three members had its Assign cut ("D +1" and half the glyph). The tablet ghost's Members column says the same (components/shell/skeleton.tsx). */
/*  (held calls 2026-10-24, K-12 — his "fix all of it"; the call as decided) …and all five DO stand beside the frozen Edit · ⋮ on a 1024 held sideways
 *  (they were 56 past it, Members under the band): 8 inside each cell (table.module.css) and each of the five at its content's own width — Name
 *  to its "On hold · Till …" line, Stage to "Quote Sent ▾", Last contact to its day and time, Members to two avatars, +n and Assign — with Next
 *  follow-up taking the rest (its longest day-and-time still loses its last letters, as it did at 184; less than before). Nothing that read whole
 *  is cut. The tablet ghost's columns say the same (components/shell/skeleton.tsx). */
const TABLET_WIDTHS: Record<ColumnKey, number> = {
  name: 173, stage: 114, inStage: 150, tasks: 260, assignees: 136,
  source: 120, budget: 120, propertyType: 140, created: 108, address: 200, lastContact: 162, district: 112, nextFollowUp: 178,
}
const colStyle = (key: ColumnKey, dragged: number | undefined, widths: Record<ColumnKey, number> = WIDTHS) => (dragged ? { flex: `0 0 ${dragged}px` } : { flex: `${widths[key]} 0 ${widths[key]}px` })

/** (REG-608) The earliest dated open task — the listing's tasks are already ordered by due date, nulls last. */
const nextDue = (row: LeadRow) => row.tasks.find((t) => t.dueAt) ?? null

/** (REG-728) The row kebab opens through the body portal, as every row menu does (components/leads/quotes/quotes-table.tsx): the
 *  table's sideways scroller can no longer clip it, and PortalMenu flips on the viewport itself — the menu-side.ts measure retired
 *  here. Each row owns its anchor, so the menu hangs from its own kebab. Items, tones and the phone sheet are the inline menu's. */
function RowMenu({ row, open, canDelete, onToggle, onClose, onDelete, onReturn, onOpenProject }: {
  row: LeadRow; open: boolean; canDelete: boolean
  onToggle: () => void; onClose: () => void; onDelete: (row: LeadRow) => void; onReturn: (row: LeadRow) => void
  /** (fix-E, A-09) A lead with a live project: Open project, and Delete refused in the row (Q-27). */
  onOpenProject?: (row: LeadRow) => void
}) {
  const anchor = useRef<HTMLSpanElement>(null)
  return (
    <span className={styles.menuWrap} ref={anchor}>
      <span className={styles.float}>
        <Tooltip label="More actions" disabled={open}>
          <IconButton icon="more_vert" label={`More actions for ${row.name}`} variant="primary"
                      aria-haspopup="menu" aria-expanded={open} onClick={onToggle} />
        </Tooltip>
      </span>
      <PortalMenu open={open} anchor={anchor} onClose={onClose} align="right" width={MENU_WIDTH.standard} role="menu" sheetTitle={row.name}>
        {row.project && onOpenProject ? <DropdownItem onSelect={() => { onClose(); onOpenProject(row) }} help={row.project.number}>Open project</DropdownItem> : null}
        {canDelete ? <DropdownItem tone="danger" disabled={!!row.project} title={row.project ? projectHoldsDelete(row.project.number) : undefined} onSelect={() => { onClose(); onDelete(row) }}>Delete</DropdownItem> : null}
        {canReturnLead(row) ? (
          /* Return Lead only for Qanvast-sourced leads (user 2026-08-29) with no return processing / approved — the overview kebab's rule (lib/leads/stage-policy.ts) */
          <DropdownItem onSelect={() => { onClose(); onReturn(row) }}>{row.returnStatus === 'rejected' ? 'Appeal the return' : 'Return Lead'}</DropdownItem>   /* (pending modules S05) a rejected return is appealed */
        ) : null}
      </PortalMenu>
    </span>
  )
}

function sortValue(row: LeadRow, key: ColumnKey): string | number {
  switch (key) {
    case 'name': return row.name.toLowerCase()
    case 'stage': return row.stage
    case 'assignees': return row.assignees.length
    case 'source': return row.source
    case 'budget': return row.budgetMinor
    case 'propertyType': return row.propertyType
    case 'created': return row.createdAt.getTime()
    case 'lastContact': return row.lastContact?.at.getTime() ?? 0
    case 'nextFollowUp': return nextDue(row)?.dueAt?.getTime() ?? Number.MAX_SAFE_INTEGER   /* (REG-608) undated last */
    case 'inStage': return -row.stageSince.getTime()   /* (UX audit L3) ascending = the fewest days in the stage first */
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
  onReorder,
  onToggleSelectAll = () => {},
  onNameClick,
  onStageClick,
  onTaskClick,
  onAssignClick,
  onEditRow,
  onDeleteRow,
  onReturnRow,
  onOpenProject,
  onCopyPhone,
  now,
  query = '',
  filterSort = 'newest',
  sort: heldSort,
  onSortChange,
  canDelete = true,
  touchTablet = false,
}: {
  /** (Leads on the move, L3 — P-06 · A-12 · A-13) A touch tablet: its own floors, Edit and ⋮ frozen at the right edge of every row. */
  touchTablet?: boolean
  /** Row whose stage menu is open — its stage cell shows the 2px primary outline (780:86452). */
  openStageId?: string | null
  rows: LeadRow[]
  columns: ColumnConfig[]
  /** A head dragged to a new place (REG-462): the visible keys in their new order. */
  onReorder?: (keys: string[]) => void
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
  onEditRow: (row: LeadRow) => void
  onDeleteRow: (row: LeadRow) => void
  onReturnRow: (row: LeadRow) => void
  /** (fix-E, A-09) The row menu's Open project, for a lead with a live project. */
  onOpenProject?: (row: LeadRow) => void
  onCopyPhone: (row: LeadRow) => void
  /** (REG-607, parity Q-41) Only Owners and Admins delete: the row menu drops the item for everyone else. */
  canDelete?: boolean
  /** Clock captured by the caller in an event handler / on mount (purity rule). */
  now: number
  /** Live search text — the matched substring is emphasised in every cell it can land in (C2, REG-275). */
  query?: string
  /** Filters modal sort — resets/sets the column sort so the two never fight. */
  filterSort?: 'newest' | 'oldest'
  /** (parity P-18, B-01) The head sort held by the caller — the listing keeps it in its address; the caller then owns the Filters sort's
      reset too. Left out, the table holds its own. */
  sort?: LeadSort
  onSortChange?: (s: LeadSort) => void
}) {
  const [ownSort, setOwnSort] = useState<Sort>(null)
  const held = onSortChange !== undefined
  const sort = held ? heldSort ?? null : ownSort
  const setSort = (next: Sort) => { if (held) onSortChange(next); else setOwnSort(next) }
  const [menuRow, setMenuRow] = useState<string | null>(null)
  const closeMenu = useCallback(() => setMenuRow(null), [])   // (REG-728) stable, so the open PortalMenu keeps its listeners across renders
  // Render-phase adjust: a Filters-modal sort change owns the column sort.
  const [seenFilterSort, setSeenFilterSort] = useState(filterSort)
  if (seenFilterSort !== filterSort) {
    setSeenFilterSort(filterSort)
    if (!held) setOwnSort(filterSort === 'oldest' ? { key: 'created', dir: 'asc' } : null)
  }

  const visible = columns.filter((c) => c.visible)
  const D = useColumnDrag(visible.map((c) => ({ key: c.key, pinned: c.pinned, locked: c.key === 'name' })), (keys) => onReorder?.(keys))   /* drag a head to reorder (REG-462) */
  const dragged = useColumnWidths('leads')   // REG-427
  const widths = touchTablet ? TABLET_WIDTHS : WIDTHS
  const widthOf = (key: ColumnKey) => dragged[key] ?? widths[key]
  const minWidth = visible.reduce((w, c) => w + widthOf(c.key), 0)
  /* (REG-310) On a touch tablet the hover actions are an in-flow last cell (table.module.css, `hover: none`), 134 wide:
     the table's floor grows by that band so every row — and the head's spacer — has room for it, and the column scale
     below is still measured off the columns alone. Server snapshot = no band, as the mock. */
  /* (REG-733, owner 2026-09-29: "the buttons are hovering over the cell data … i like the way you have done in the quote editor > items
     table total") With a mouse the row ends on a band as wide as the hover pair needs (Edit + kebab, 16 in, 12 clear of the data), so
     at rest and scrolled to the end the pair floats over that band, never over the last column's value; nothing moves on hover. */
  const band = useMediaQuery(TOUCH_TABLET) ? 134 : ACTIONS_BAND
  // Pinned columns stack from the left; only the LAST one carries the 2px divider + shadow (user rule 2026-08-27).
  const pinOffset: Partial<Record<ColumnKey, number>> = {}
  let pinAcc = 0
  for (const c of visible) if (c.pinned) { pinOffset[c.key] = pinAcc; pinAcc += widthOf(c.key) }
  const pinEdge = [...visible].reverse().find((c) => c.pinned)?.key
  /* (REG-286) ARIA grid roles: the data cells carried no role at all, so a screen reader saw a role="table" whose
     rows held generic children and dropped out of table mode entirely — no column announcements, no cell
     navigation. Every cell is built here, so the role is added here; the head spreads this same object and
     overrides it with role="columnheader" (a later JSX attribute wins over the spread). */
  const cellProps = (col: ColumnConfig, base: string | undefined) => ({
    role: 'cell',
    className: col.pinned ? `${base} ${styles.pin}` : base,
    /* (REG-614) The drag's transform rides every cell, head and body, so the whole column travels — the Items grid's rule (REG-572). */
    style: { ...(col.pinned ? { ...colStyle(col.key, dragged[col.key], widths), left: `calc(${pinOffset[col.key] ?? 0}px * var(--col-scale, 1))` } : colStyle(col.key, dragged[col.key], widths)), ...D.style(col.key) },
    'data-pin-edge': col.pinned && col.key === pinEdge ? true : undefined,
  })
  /* Fluid columns grow pro rata, so sticky offsets scale by (rendered width ÷ floor). DOM write only.
     (REG-286) Was an inline ref callback: a fresh function identity every render, so React 19 ran its cleanup and
     re-ran it on EVERY render — a ResizeObserver torn down and rebuilt per keystroke of the search box — and its
     `el.clientWidth` read landed straight after commit, forcing a synchronous layout of the whole table. The
     observer now lives in an effect keyed on the only input that can change the scale, and the width comes off the
     observer's own entry, so nothing reads layout on the commit path. */
  const tableEl = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = tableEl.current
    if (!el) return
    const apply = (w: number) => {
      el.style.setProperty('--col-scale', String(Math.max(1, (w - band) / minWidth)))
      /* (leads on the move, P-06) a touch tablet's frozen ⋮ casts its shadow only while more table lies to its left */
      const box = el.parentElement
      if (touchTablet && box) requestAnimationFrame(() => box.toggleAttribute('data-at-end', box.scrollLeft + box.clientWidth >= box.scrollWidth - 2))
    }
    if (typeof ResizeObserver === 'undefined') { apply(el.clientWidth); return }
    // The first notification carries the initial size and is delivered before paint, so the scale is never a frame late.
    const ro = new ResizeObserver(([entry]) => {
      const w = entry?.contentRect.width ?? 0
      if (w > 0) apply(w)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [minWidth, band, touchTablet])
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
    setSort(sort?.key !== key ? { key, dir: 'asc' } : sort.dir === 'asc' ? { key, dir: 'desc' } : null)
  }
  const sortIcon = (key: ColumnKey) =>
    sort?.key === key ? (sort.dir === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'

  /* (REG-275) A row now matches on everything it SHOWS (REG-274), so the hit is emphasised wherever it landed —
     a lead found by its phone, source or task title used to arrive with nothing marked and no way to see why it
     was in the list. Guarded on a non-empty query: with the box empty every cell renders the same plain string
     it always did (highlightMatch walks the whole string, and there is nothing to find). */
  const q = query.trim()
  const hit = (text: string): ReactNode => (q ? highlightMatch(text, q) : text)
  /** Phones match digits-to-digits, so they need the digit-aware pass. */
  const hitPhone = (text: string): ReactNode => (q ? highlightPhone(text, q) : text)

  const renderCell = (row: LeadRow, col: ColumnConfig) => {
    switch (col.key) {
      case 'name':
        return (
          /* (REG-349, user 2026-09-05) The whole cell opens the lead, not just the name — the phone line and the space
             beside it were dead. Its own controls (the checkbox, Copy phone number) keep their actions: their click
             bubbles here, so the guard below lets them through. */
          <div key={col.key} {...cellProps(col, `${styles.cell} ${styles.nameCell}`)}
               onClick={(e) => { if ((e.target as HTMLElement).closest('button, a, input, [role="checkbox"]')) return; onNameClick(row) }}>
            {/* Accent bar + selection checkbox are children of the pinned cell so they stay put on horizontal scroll. */}
            <span className={styles.accent} />
            {selectable ? (
              <span className={styles.selBox} data-kb-select>
                <Checkbox
                  isSelected={selected.has(row.id)}
                  onChange={() => onToggleSelect(row.id)}
                  aria-label={`Select ${row.name}`}
                />
              </span>
            ) : null}
            <span
              className={styles.name}
              data-kb-open
              role="link"
              tabIndex={0}
              onClick={() => onNameClick(row)}
              onKeyDown={(e) => e.key === 'Enter' && onNameClick(row)}
            >
              {hit(row.name)}
            </span>
            <span className={styles.phoneRow}>
              <span className={styles.phone}>
                {hitPhone(phoneLocal(row.phone))}
              </span>
              <Tooltip label="Copy phone number">
                <button type="button" className={styles.copyBtn} aria-label={`Copy ${row.name}'s phone number`}
                        onClick={() => onCopyPhone(row)}>
                  <Icon name="content_copy" size={14} weight={300} />
                </button>
              </Tooltip>
            </span>
            {/* On Hold leads say till when (user 2026-08-29) — (Dane UAT 5.13) with its day. (pending modules S05 — REG-891's open call: the phone
                line's "· On hold till: Sat, 24 Oct ’26" never fitted the column's 240 floor and read "On hold till…") Its own line under the
                phone — the Stage cell beside it says On Hold — so the day reads whole and the column keeps its floor. */}
            {row.stage === 'On Hold' && row.onHoldFollowUp ? (
              <span className={styles.holdLine} data-testid="hold-line"><span className="visually-hidden">On hold </span>Till {hit(displayDateLong(new Date(row.onHoldFollowUp)))}</span>
            ) : null}
          </div>
        )
      case 'stage':
        // (REG-332, user 2026-09-04) The whole cell opens the stage menu, and the cell is the menu's anchor (780:86452).
        // The button inside stays for the keyboard — its click bubbles up to the cell, so nothing fires twice.
        return (
          <div key={col.key} {...cellProps(col, `${styles.cell} ${styles.stageCell}`)} data-kb="move-stage" data-open={row.id === openStageId || undefined}
               data-stage-anchor={row.id === openStageId || undefined}
               onClick={(e) => onStageClick(row, e.currentTarget)}>
            {/* (REG-329) An On Hold row names its follow-up in the DS tooltip; it used to be the browser's own title bubble. */}
            <Tooltip label={row.onHoldFollowUp ? `Next follow up: ${displayDateLong(new Date(row.onHoldFollowUp))}` : ''}
                     disabled={!row.onHoldFollowUp || row.id === openStageId}>
            <button type="button" className={styles.stageBtn} aria-haspopup="menu" aria-expanded={row.id === openStageId}>
              {hit(row.stage)}
              <span className={styles.chev}><Icon name="keyboard_arrow_down" size={20} /></span>
            </button>
            </Tooltip>
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
                <span className={styles.taskText}>{hit(first.title)}</span>
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
          <div key={col.key} {...cellProps(col, styles.cell)} data-kb="assign">
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
        return <div key={col.key} {...cellProps(col, styles.cell)}><span className={styles.plain}>{hit(row.source)}</span></div>
      case 'budget':
        /* (UX audit L8) a budget nobody gave is "--", not 0 */
        return <div key={col.key} {...cellProps(col, styles.cell)}><span className={styles.plain}>{row.budgetMinor > 0 ? hit(money(row.budgetMinor)) : BLANK}</span></div>
      case 'propertyType':
        return <div key={col.key} {...cellProps(col, styles.cell)}><span className={styles.plain}>{hit(row.propertyType)}</span></div>
      case 'created':
        // The DISPLAYED date, through the column's own formatter — exactly the string search matches (REG-274).
        return <div key={col.key} {...cellProps(col, styles.cell)}><span className={styles.plain}>{hit(displayDate(row.createdAt))}</span></div>
      case 'address':
        return <div key={col.key} {...cellProps(col, styles.cell)}><span className={styles.plain}>{row.propertyAddress ? hit(row.propertyAddress) : BLANK}</span></div>
      case 'district':   /* (REG-607) */
        return <div key={col.key} {...cellProps(col, styles.cell)}><span className={styles.plain}>{row.area ? hit(row.area) : BLANK}</span></div>
      case 'nextFollowUp': {   /* (REG-608) the earliest dated open task — (Dane UAT 4.22) its WHEN: the day and time, then how far off; the Tasks column already names it */
        const t = nextDue(row)
        const late = !!t?.dueAt && isOverdue(t.dueAt, now)
        return (
          <div key={col.key} {...cellProps(col, styles.cell)}>
            {t?.dueAt ? (
              <span className={styles.twoLine}>
                <span className={styles.plain} style={late ? { color: 'var(--om-color-tertiary-red-default)' } : undefined}>{hit(touchTablet ? tabletWhen(t.dueAt, now) : displayDue(t.dueAt))}</span>
                <span className={styles.sub} style={late ? { color: 'var(--om-color-tertiary-red-default)' } : undefined}>{dueDistance(t.dueAt, now)}</span>
              </span>
            ) : <span className={styles.plain}>{BLANK}</span>}
          </div>
        )
      }
      case 'inStage':   /* (UX audit L3) how long the lead has sat in its stage, then since when */
        return (
          <div key={col.key} {...cellProps(col, styles.cell)} data-days={daysInStage(row, now)}>
            <span className={styles.twoLine}>
              <span className={styles.plain}>{stageAge(row, now)}</span>
              <span className={styles.sub}>{stageSinceText(row)}</span>
            </span>
          </div>
        )
      case 'lastContact':   /* (REG-600) the latest contact log: when, then how and what came of it */
        return (
          <div key={col.key} {...cellProps(col, styles.cell)}>
            {row.lastContact ? (
              <span className={styles.twoLine}>
                <span className={styles.plain}>{hit(displayDateTimeDot(row.lastContact.at))}</span>
                <span className={styles.sub}>{[row.lastContact.channel, row.lastContact.outcome].filter(Boolean).join(' · ') || BLANK}</span>
              </span>
            ) : <span className={styles.muted}>No contact yet</span>}
          </div>
        )
    }
  }

  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id))

  return (
    <div className={styles.card}>
      <div className={styles.scroller} data-scroll-box onScroll={(e) => { const el = e.currentTarget; el.toggleAttribute('data-scrolled', el.scrollLeft > 0); if (touchTablet) el.toggleAttribute('data-at-end', el.scrollLeft + el.clientWidth >= el.scrollWidth - 2) }}>
        <div ref={tableEl} className={styles.table} role="table" data-drag-root="" aria-label="Leads" data-kb-list="lead" data-selectable={selectable || undefined} data-selecting={selected.size > 0 || undefined} data-tablet={touchTablet || undefined}
             style={{ minWidth: minWidth + band }}>
          <div className={styles.headRow} role="row">
            {visible.map((col, i) => (
              <div
                key={col.key}
                {...cellProps(col, styles.hCell)}
                role="columnheader"
                data-col={col.key}
                {...D.head(col.key)}
                style={{ ...cellProps(col, styles.hCell).style, ...D.style(col.key) }}
              >
                {i === 0 && selectable ? (
                  <span className={styles.headSelBox} data-kb-select-all>
                    <Checkbox isSelected={allSelected} isIndeterminate={!allSelected && rows.some((r) => selected.has(r.id))} onChange={onToggleSelectAll} aria-label="Select all leads" />
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
                <ColumnResizer table="leads" column={col.key} label={col.label} min={col.key === 'name' ? 160 : 72} />
              </div>
            ))}
          </div>
          {sorted.map((row) => (
            <div
              key={row.id}
              className={styles.row}
              role="row"
              data-kb-row data-kb-id={row.id} data-kb-href={`/leads/${row.id}`}
              data-highlight={unseenIds?.has(row.id) || undefined}
              data-selected={selected.has(row.id) || undefined}
              onPointerDownCapture={unseenIds?.has(row.id) ? () => onRowSeen?.(row) : undefined}
            >
              {visible.map((col) => (
                <Fragment key={col.key}>{renderCell(row, col)}</Fragment>
              ))}
              <span className={styles.rowActions} data-open={menuRow === row.id || undefined}>
                <span className={styles.rowActionsInner}>
                  {/* 606:75167 / REG-163: the DS primary outlined Button + om primary IconButton, as the Lead Details tables build them. */}
                  <span className={styles.float}>
                    <Button variant="primary" appearance="outlined" onPress={() => onEditRow(row)}>Edit</Button>
                  </span>
                  <RowMenu row={row} open={menuRow === row.id} canDelete={canDelete}
                           onToggle={() => setMenuRow((m) => (m === row.id ? null : row.id))} onClose={closeMenu}
                           onDelete={onDeleteRow} onReturn={onReturnRow} onOpenProject={onOpenProject} />
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
