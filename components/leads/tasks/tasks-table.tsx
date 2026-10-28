'use client'

import { useEffect, useRef, useState, type FocusEvent, type KeyboardEvent, type ReactNode } from 'react'
import { Checkbox, Link, Tag } from '@/components/ds'
import { DropdownItem, DropdownLabel, MENU_WIDTH } from '@/components/leads/dropdown'
import { PortalMenu } from '@/components/om/portal-menu'
import { SelectTrigger } from '@/components/om/select-trigger'
import { Avatar } from '@/components/om/avatar'
import { ColumnResizer, flexVars, useColumnWidths } from '@/components/om/column-resize'
import { useColumnLayout, type TableColumn, type TableColumnDef } from '@/components/om/table-columns'
import { TOUCH_TABLET, useMediaQuery } from '@/lib/breakpoint'
import { useSheetLayout } from '@/components/om/sheet'
import { TaskCard } from './task-card'
import cardStyles from './task-card.module.css'
import { dueChip } from './task-card-words'
import { useColumnDrag } from '@/components/om/column-drag'
import { useOverflowX } from '@/components/om/use-overflow-x'
import { Icon } from '@/components/om/icon'
import NextLink from 'next/link'
import { withFrom } from '@/lib/nav'
import type { TaskLead } from '@/lib/leads/tasks'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { displayDue, isOverdue } from '@/lib/format'
import type { TaskRow } from '@/lib/leads/tasks'
import { isTaskSortKey, taskHeadWords, type TaskHeadSort, type TaskSortKey } from '@/lib/leads/task-filters'
import type { Member } from '@/lib/db/schema'
import { OutsideBadge } from './outside-person'   // (gaps build, package C — M-03)
import { outsideOf } from '@/lib/leads/outside'
import styles from './tasks-table.module.css'

const NO_HOVER = '(hover: none)'
export type TaskRowAction = 'complete' | 'rename' | 'template' | 'duplicate' | 'delete' | 'send-outside'   // (gaps build, package C — M-03)

export type TasksTableProps = {
  /** The visible columns in the user's order (useTableColumns, REG-454). */
  columns: readonly TableColumn[]
  /** The rail's Tasks page (REG-466): the add row's Lead cell is a picker — Studio (no lead) or one of the live leads. */
  leadPicker?: LeadPicker
  /** A head dropped in a new place — the visible keys in their new order (useTableColumns.reorder). */
  onReorder: (keys: string[]) => void
  tasks: TaskRow[]
  /** Clock captured by the caller (purity rule) — overdue = open + due before today. */
  now: number
  selected: Set<string>
  onSelect: (ids: Set<string>) => void
  /** Tasks nobody has opened yet (`seenAt === null`, REG-131 for tasks): primary band + bold title. */
  unseen: Set<string>
  /**
   * (REG-275) Tasks the live search found by their DESCRIPTION alone — the title cell prints an "In description"
   * chip for them so the hit is explainable (the description is not in the row). Empty while the box is empty.
   */
  descriptionMatches?: Set<string>
  /** Inline add row (frame 194) at the top of the table. */
  adding: boolean
  onAddSubmit: (title: string) => void
  /** Changes per inline save: remounts the add row empty + focused so entry chains (REG-257). */
  addKey?: number
  onAddCancel: () => void
  /** Row being renamed — the same field treatment on that row, pre-filled with the title (the row menu's Rename, REG-472). */
  renaming: string | null
  /** (UX audit 2026-09-30, T6) A double-click on the title — the panel opens with its Task name selected, to rename there. */
  onRenameInPanel?: (task: TaskRow) => void
  /** (T4) The members the new task will carry — the lead's, until changed — and the add row's person_add that changes them. */
  addMembers?: Member[]
  onAddAssign?: (anchor: HTMLElement) => void
  onRenameSubmit: (id: string, title: string) => void
  onRenameCancel: () => void
  onOpen: (task: TaskRow, anchor: HTMLElement) => void
  /** The title cell's comment chip opens the comments panel straight away (user 2026-08-30). */
  onOpenComments: (task: TaskRow) => void
  onToggleDone: (task: TaskRow) => void
  onAssign: (task: TaskRow, anchor: HTMLElement) => void
  onDue: (task: TaskRow, anchor: HTMLElement) => void
  onAddTags: (task: TaskRow, anchor: HTMLElement) => void
  onRowMenu: (task: TaskRow, action: TaskRowAction) => void
  onEdit: (task: TaskRow) => void
  /** Bottom bar "+ Add Task" (902:26450) — (the calm UI build 2026-10-27, 1-11 · 2-13 · 2-19) only where nothing else adds: a phone with no
      quick add. The desk's second add under the table went; New task ▾ in the toolbar (or the page header) is the one way in. */
  onAddClick?: () => void
  /** (Dane UAT 11.02) The task the add row just created — brought into view and pulsed once; `n` changes per add. */
  pulse?: { id: string; n: number } | null
  /** (Projects round 2) A project's milestones: the Milestone cell names the one a task sits in and picks another. */
  milestonePicker?: MilestonePicker
  /** (gaps build, package C — 16) The rail's Tasks page grouped by project: each task's group; a header row opens each run of them. */
  groupOf?: (t: TaskRow) => TaskGroup
  /** (pending modules S05) The head's own order (Due date · Status), held by the orchestrator — one sort with Filters'. */
  sort?: TaskHeadSort
  onSort?: (key: TaskSortKey) => void
  /** (Leads on the move, L4 — P-10 · C-06) A phone's or a touch tablet's add: the quick add, docked where the "Add Task" bar stands — the
      inline add row (frame 194) stays the desk's. */
  composer?: ReactNode
  /** The rail's Tasks page: a phone card names whose task it is. */
  studio?: boolean
}
export type TaskGroup = { key: string; label: string; href?: string | null }
export type MilestonePicker = { options: { id: string; title: string }[]; onPick: (task: TaskRow, milestoneId: string | null) => void }

/* Column order + head copy — sentence case, exactly as the mock types it (spec 01). Tags has no sort icon. */
/** The table's columns (902:26387): Title locked first; the user's order, visibility and pins come from Column settings (REG-454).
    `track` is the mock's px — the floor the rows never squeeze under (REG-430); the flex bases live in the CSS. */
export const TASK_COLUMN_DEFS: readonly TableColumnDef[] = [
  { key: 'title', label: 'Title', track: '320', locked: true },   /* floor 320 (was the mock's 420, owner 2026-09-17: Tags must show below 1440) */
  { key: 'assignees', label: 'Members', track: '160' },   /* REG-290 */
  /* (Leads on the move, L4 — P-10 · C-07) `tabletHidden`: a touch tablet opens with Title · Members · Due date · Status and the ⋮ frozen at the
     right (the Quotes / Contracts tables' way); Creator and Tags wait in Column settings, remembered per breakpoint */
  { key: 'creator', label: 'Creator', track: '160', tabletHidden: true },
  { key: 'due', label: 'Due date', track: '240' },   /* (Dane UAT 5.13 · 5.05) the mock's 137 held "17 Jul ’26"; the widest "Wed, 28 May ’26 · 10:00 PM" needs 234 — the table grows, never cuts (REG-430) */
  /* (the calm UI build 2026-10-27, 1-07 · 2-19 · W-295) Status rests in Column settings: on an open list every row said "OPEN", the list's own
     filter, and a done row's filled ring already says it. Shown again from Column settings (or sorted by), it reads as it did. */
  { key: 'status', label: 'Status', track: '118', hidden: true },
  { key: 'tags', label: 'Tags', track: '191', tabletHidden: true },
]
/** The rail's Tasks page (REG-466): the same columns with the task's Lead after Title — free, not pinned (owner's call).
    (parity P-27, Q-10) The head reads "For": the column holds leads, projects and the studio's own (the key stays `lead`, saved settings).
    (the calm UI build 2026-10-27, 1-07) It opens on Title · For · Members · Due date, which fit a 1440 screen without cutting the last column
    ("+ Ad"); Creator, Status and Tags wait in Column settings, as a tablet's already did (L4, C-07). */
export const STUDIO_TASK_COLUMN_DEFS: readonly TableColumnDef[] = [TASK_COLUMN_DEFS[0]!, { key: 'lead', label: 'For', track: '200' }, ...TASK_COLUMN_DEFS.slice(1).map((d) => (d.key === 'status' || d.key === 'creator' || d.key === 'tags' ? { ...d, hidden: true } : d))]
/** (Projects round 2) A project's tasks (a lead that has one): the milestone each sits in, after Title. */
export const PROJECT_TASK_COLUMN_DEFS: readonly TableColumnDef[] = [TASK_COLUMN_DEFS[0]!, { key: 'milestone', label: 'Milestone', track: '200' }, ...TASK_COLUMN_DEFS.slice(1)]
/** (Leads on the move, L4 — C-07) A touch tablet's floors: Title from 200, the due day in its short words ("Mon 26 Oct · 10:00 AM"), the names
    and the tag chips narrower — Title · Members · Due date · Status and the frozen ⋮ fit a 736 frame's first screen. A dragged width wins. */
const TABLET_TRACK: Record<string, number> = { title: 200, lead: 160, milestone: 160, assignees: 104, creator: 140, due: 176, status: 116, tags: 160 }
const COL_CLASS: Record<string, string | undefined> = { title: styles.colTitle, lead: styles.colLead, milestone: styles.colMilestone, assignees: styles.colMember, creator: styles.colCreator, due: styles.colDue, status: styles.colStatus, tags: styles.colTags }
/* (REG-468) Only Due date and Status order a task list; Title, Lead, Members and Creator lost their glyph. */
const SORTABLE: Record<string, boolean> = { title: false, lead: false, milestone: false, assignees: false, creator: false, due: true, status: true, tags: false }

/**
 * Lead Details › Tasks table (902:26387) — specs 01-listing-table.txt + 02-rows-menus-bulk.txt.
 * Head 56 · rows 48 · bottom bar 53; columns 56 · 582 · 160 · 160 · 137 · 118 · 191 (Title fills).
 * The Creator column is not in the mock (REG-239, user 2026-09-01): the panel's Creator row as a column,
 * so who asked for a task is visible without opening it; Members keeps the avatars + person_add only.
 * Every icon-only control carries a Tooltip; Due date and Status sort (pending modules S05); menus toggle on their own trigger.
 */
export function TasksTable({
  tasks, now, selected, onSelect, unseen, descriptionMatches,
  adding, onAddSubmit, addKey, onAddCancel, addMembers, onAddAssign,
  renaming, onRenameInPanel, onRenameSubmit, onRenameCancel,
  onOpen, onOpenComments, onToggleDone, onAssign, onDue, onAddTags, onRowMenu, onEdit, onAddClick, columns, onReorder, leadPicker, pulse = null, milestonePicker, groupOf, sort = null, onSort,
  composer, studio = false,
}: TasksTableProps) {
  const [menuRow, setMenuRow] = useState<string | null>(null)
  /* (Leads on the move, L4 — P-10 · C-03 · C-05 · C-07) ≤767 the tasks are cards (task-card.tsx: whole names, the due chip, a hold selects);
     a touch tablet keeps the table with its tablet set, the due day's short words and the ⋮ frozen at the right. The server renders the desk. */
  const phone = useSheetLayout()
  const touchTablet = useMediaQuery(TOUCH_TABLET) && !phone

  /* (Dane UAT 11.02) The quote editor's attention after an add (REG-573, items-section.tsx `attention`): once the new row exists — a frame or
     two after the save's refresh — it is centred when it sits off the screen or under the docked Add Task bar, and pulses once
     (`data-fresh`). The caret stays in the add row, so the next task can follow (REG-257). */
  const [flash, setFlash] = useState<string | null>(null)
  const tableEl = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!pulse) return
    let tries = 0, raf = 0, timer = 0
    const tick = () => {
      const row = tableEl.current?.querySelector<HTMLElement>(`[data-kb-row][data-kb-id="${CSS.escape(pulse.id)}"]`) ?? null
      if (!row) { if (++tries < 60) raf = requestAnimationFrame(tick); return }
      const r = row.getBoundingClientRect()
      if (r.top < 0 || r.bottom > window.innerHeight - 64) row.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
      setFlash(pulse.id)
      timer = window.setTimeout(() => setFlash((f) => (f === pulse.id ? null : f)), 1500)
    }
    raf = requestAnimationFrame(() => { raf = requestAnimationFrame(tick) })
    return () => { cancelAnimationFrame(raf); window.clearTimeout(timer) }
  }, [pulse])

  const allSelected = tasks.length > 0 && tasks.every((t) => selected.has(t.id))
  const toggleAll = () => onSelect(allSelected ? new Set() : new Set(tasks.map((t) => t.id)))
  /* Shift-click selects the run between the last row touched and this one, as a mail client does (user 2026-08-30):
     it only ever ADDS, so shift-clicking across a partly-ticked list fills the gaps instead of flipping them. The
     anchor is the last row clicked, with or without shift. */
  const lastTouched = useRef<number | null>(null)

  const toggleOne = (id: string, index: number, range: boolean) => {
    const next = new Set(selected)
    const from = lastTouched.current
    if (range && from !== null) {
      for (let i = Math.min(from, index); i <= Math.max(from, index); i++) {
        const t = tasks[i]
        if (t) next.add(t.id)
      }
    } else if (next.has(id)) next.delete(id)
    else next.add(id)
    lastTouched.current = index
    onSelect(next)
  }

  const colWidths = useColumnWidths('lead-tasks')
  const colVars = flexVars(colWidths)   // REG-427: `--cw-<key>` per dragged column, read by tasks-table.module.css
  /* The rows' floor (REG-430, the listing's inline min-width): the mock's 1244 = 56 + Title 422 + 160 + 160 + 137 + 118 + 191,
     each column at its dragged width instead where the user changed it — the card scrolls sideways past that, never squeezes. */
  const floor = 56 + columns.reduce((sum, c) => sum + (colWidths[c.key] ?? (touchTablet ? TABLET_TRACK[c.key] ?? Number(c.track) : Number(c.track))), 0)
  const headRow = useRef<HTMLDivElement>(null)
  const L0 = useColumnLayout(columns, headRow, { leading: 56, flex: true })
  const D = useColumnDrag(columns, onReorder)   /* drag a head to reorder (REG-462) */
  const L = { ...L0, style: (key: string) => ({ ...L0.style(key), ...D.style(key) }) }   /* (REG-614) every cell rides the drag's transform, so the whole column travels — the Items grid's rule (REG-572) */
  const [frame, overflowing] = useOverflowX()
  if (phone) {
    /* (L4 — P-10) the phone's cards: one list, the group headers of the rail page between them, the quick add at the foot */
    const selectMode = selected.size > 0
    const milestoneOf = (t: TaskRow) => (milestonePicker && t.milestoneId ? milestonePicker.options.find((m) => m.id === t.milestoneId)?.title ?? null : null)
    return (
      <div className={styles.phoneList} ref={tableEl} data-kb-list="task" data-testid="task-cards" data-select-mode={selectMode || undefined}>
        <div className={cardStyles.list} role="list" aria-label="Tasks">
          {tasks.map((task, idx) => {
            const head = groupOf && (idx === 0 || groupOf(tasks[idx - 1]!).key !== groupOf(task).key) ? { ...groupOf(task), n: tasks.filter((t) => groupOf(t).key === groupOf(task).key).length } : null
            return (
              <TaskRowFrag key={task.id} head={head}>
                <TaskCard task={task} now={now} unseen={unseen.has(task.id)} fresh={flash === task.id} selected={selected.has(task.id)} selectMode={selectMode}
                  descriptionMatch={descriptionMatches?.has(task.id) ?? false} studio={studio} milestone={milestoneOf(task)}
                  menuOpen={menuRow === task.id} onMenuToggle={() => setMenuRow((m) => (m === task.id ? null : task.id))} onMenuClose={() => setMenuRow(null)}
                  onToggleSelect={() => toggleOne(task.id, idx, false)} onOpen={(t) => onOpen(t, tableEl.current ?? document.body)} onOpenComments={onOpenComments}
                  onToggleDone={onToggleDone} onAssign={onAssign} onRowMenu={onRowMenu} />
              </TaskRowFrag>
            )
          })}
        </div>
        {composer ?? (
          <div className={styles.foot}>
            <Link variant="primary" iconStart={<Icon name="add" size={20} />} onPress={() => onAddClick?.()}>New task</Link>
          </div>
        )}
      </div>
    )
  }
  return (
    <div className={styles.card} role="table" data-drag-root="" aria-label="Tasks" data-kb-list="task" data-cols="lead-tasks" data-touch-tablet={touchTablet || undefined} style={{ ...(colVars ?? {}), '--table-min': `${floor}px` } as React.CSSProperties}>
    <div ref={frame} className={styles.scroller} data-overflow={overflowing || undefined}
         onScroll={(e) => { const el = e.currentTarget; el.toggleAttribute('data-scrolled', el.scrollLeft > 0); el.toggleAttribute('data-at-end', el.scrollLeft + el.clientWidth >= el.scrollWidth - 1) }}>
    <div className={styles.table} ref={tableEl}>
      {/* Head row — selection head = a real select-all checkbox (check_box_outline_blank 24/Light in the mock). */}
      <div ref={headRow} className={styles.head} role="row">
        <div className={`${styles.hCell} ${styles.colSel} ${styles.pin}`} role="columnheader" data-col="sel" data-kb-select-all data-pin-edge={L.edge('sel') || undefined} style={L.style('sel')}>
          <Checkbox isSelected={allSelected} isIndeterminate={!allSelected && tasks.some((t) => selected.has(t.id))} isDisabled={tasks.length === 0} onChange={toggleAll} aria-label="Select all tasks" />
        </div>
        {columns.map((c) => {
          const sorted = sort?.key === c.key ? sort : null
          return (
          <div key={c.key} className={`${styles.hCell} ${COL_CLASS[c.key] ?? ''} ${c.pinned ? styles.pin : ''}`} role="columnheader" data-col={c.key} data-pin-edge={L.edge(c.key) || undefined} style={L.style(c.key)} {...D.head(c.key)}
               aria-sort={sorted ? (sorted.dir === 'asc' ? 'ascending' : 'descending') : undefined}>
            {SORTABLE[c.key] && isTaskSortKey(c.key) && onSort ? (
              /* (pending modules S05) the head sorts its column — A→Z, Z→A, off (the Contracts / Quotes heads' model) */
              <button type="button" className={styles.hSort} data-sorted={sorted ? 'true' : undefined} onClick={() => onSort(c.key as TaskSortKey)}
                      aria-label={sorted ? `${c.label} — sorted ${taskHeadWords(sorted.key, sorted.dir)}; press to ${sorted.dir === 'asc' ? 'reverse' : 'stop sorting'}` : `Sort by ${c.label}`}>
                <span className={styles.hLabel}>{c.label}</span>
                <Icon name={sorted ? (sorted.dir === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'} size={16} />
              </button>
            ) : (
              <span className={styles.hLabel}>{c.label}</span>
            )}
            <ColumnResizer table="lead-tasks" column={c.key} label={c.label} min={c.key === 'title' ? 200 : 72} />
          </div>
          )
        })}
        {/* (L4, C-07) the ⋮ column's head on a touch tablet — frozen right with the rows' cell, so the column reads as one */}
        {touchTablet ? <div className={`${styles.hCell} ${styles.hActions}`} role="columnheader" aria-label="Actions" data-col="actions" data-testid="tasks-actions-head" /> : null}
      </div>

      {adding && !composer ? (
        <AddRow key={`new-${addKey ?? 0}`} onSubmit={onAddSubmit} onCancel={onAddCancel} L={L} leadPicker={leadPicker} members={addMembers} onAssign={onAddAssign} milestones={!!milestonePicker} />
      ) : null}

      {tasks.map((task, idx) => (
        <TaskRowFrag key={task.id} head={groupOf && (idx === 0 || groupOf(tasks[idx - 1]!).key !== groupOf(task).key) ? { ...groupOf(task), n: tasks.filter((t) => groupOf(t).key === groupOf(task).key).length } : null}>
        <TaskRowView L={L}
          onRenameInPanel={onRenameInPanel}
          key={task.id}
          task={task}
          now={now}
          unseen={unseen.has(task.id)}
          fresh={flash === task.id}
          descriptionMatch={descriptionMatches?.has(task.id) ?? false}
          selected={selected.has(task.id)}
          onToggleSelect={(range) => toggleOne(task.id, idx, range)}
          renaming={renaming === task.id}
          onRenameSubmit={(title) => onRenameSubmit(task.id, title)}
          onRenameCancel={onRenameCancel}
          menuOpen={menuRow === task.id}
          onMenuToggle={() => setMenuRow((m) => (m === task.id ? null : task.id))}
          onMenuClose={() => setMenuRow(null)}
          onOpen={onOpen} onOpenComments={onOpenComments} onToggleDone={onToggleDone} onAssign={onAssign} onDue={onDue} onAddTags={onAddTags}
          onRowMenu={onRowMenu} onEdit={onEdit} milestonePicker={milestonePicker}
        />
        </TaskRowFrag>
      ))}
    </div>
    </div>

      {/* (the calm UI build 2026-10-27, 1-11 · 2-13 · 2-19) The desk's bottom bar "+ Add Task" (902:26450) went — the toolbar's (or the header's)
          New task ▾ is the one add; its Blank task opens this table's own add row at the top. (L4 — P-10) A touch tablet docks the quick add here. */}
      {composer ?? null}
    </div>
  )
}

/* ---------------------------------------------------------------------------------------------- */

/** (gaps build, package C — 16) A group's header before its first task: the project (its number and name) and how many tasks are listed, with
    Go to project — or Leads · Studio for the tasks with no project. Its words stay at the card's left edge while the table scrolls sideways. */
function TaskRowFrag({ head, children }: { head: (TaskGroup & { n: number }) | null; children: React.ReactNode }) {
  return (
    <>
      {head ? (
        <div className={styles.groupRow} role="row" data-testid="task-group">
          <span className={styles.groupInner} role="cell">
            <span className={styles.groupLabel}>{head.label}</span>
            <span className={styles.groupCount}>{`${head.n} ${head.n === 1 ? 'task' : 'tasks'}`}</span>
            {head.href ? <NextLink href={head.href} className={styles.groupLink} data-testid="task-group-link">Go to project</NextLink> : null}
          </span>
        </div>
      ) : null}
      {children}
    </>
  )
}

/** The title cell as the active field (frame 194): bare input + ✕ (secondary outlined 24) + ✓ (primary filled 24) — (REG-729) the house IconButton. */
function TitleField({ initial, onSubmit, onCancel, closeOnBlur = false }: { initial: string; onSubmit: (title: string) => void; onCancel: () => void; closeOnBlur?: boolean }) {
  const [value, setValue] = useState(initial)
  /* (UX audit 2026-09-30, T4) The caret lands in the field on mount — also when the row arrives already open (`?add=1` from a saved log):
     React leaves `autoFocus` alone on server-rendered markup, and the page is `inert` under its ghost until PageReveal lets it go (REG-708),
     so the typing went to the page's shortcuts instead. It tries again each frame for ~2 s, and stops the moment focus is anywhere else. */
  const field = useRef<HTMLInputElement>(null)
  useEffect(() => {
    let tries = 0, raf = 0
    const land = () => {
      const el = field.current
      if (!el || document.activeElement === el) return
      if (document.activeElement?.matches('input, textarea, select, [contenteditable="true"]')) return   // the person is typing somewhere else
      el.focus()
      if (document.activeElement !== el && tries++ < 120) raf = requestAnimationFrame(land)
    }
    land()
    return () => cancelAnimationFrame(raf)
  }, [])
  /* Settled once — Enter, Escape or a button ends the edit, and the blur the unmount then fires must not act again. */
  const settled = useRef(false)
  const submit = () => {
    if (settled.current) return
    settled.current = true
    const title = value.trim()
    if (!title) onCancel(); else onSubmit(title)   // empty title = cancel
  }
  const cancel = () => { if (settled.current) return; settled.current = true; onCancel() }
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); submit() }
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cancel() }
  }
  /* (REG-472, owner 2026-09-17: "when I clicked in, I can't click out") A click away ends the edit the way the quote editor's
     cells do: a changed title is saved, an unchanged or empty one is dropped. The add row also closes, so its remount cannot
     take the focus back from wherever the click went. The ✕ / ✓ swallow mousedown, so they never blur the field first. */
  const onBlur = (e: FocusEvent<HTMLInputElement>) => {
    if (settled.current) return
    /* Focus moving within the same row — the add row's Lead picker, the ✕ / ✓ — is not a click away: the edit stays open. */
    const row = e.currentTarget.closest('[role="row"]')
    if (e.relatedTarget instanceof Node && row?.contains(e.relatedTarget)) return
    const title = value.trim()
    if (title && title !== initial) { submit(); if (closeOnBlur) onCancel() } else cancel()
  }
  return (
    <>
      <input
        ref={field}
        className={styles.editInput}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
        autoFocus
        aria-label="Task title"
      />
      {/* (REG-472) The pair floats just under the box's right end, outside it, as the Payment Schedule cell draws it (owner 2026-09-16:
          "the cross and save small buttons we moved outside … is the correct behavior, update this across"). mousedown is
          swallowed so the field keeps focus until the click lands. */}
      <span className={styles.confirm}>
        <Tooltip label="Cancel">
          <IconButton icon="close" label="Cancel" size={24} className={styles.confirmBtn} onMouseDown={(e) => e.preventDefault()} onClick={cancel} />
        </Tooltip>
        <Tooltip label="Save">
          <IconButton icon="done" label="Save" size={24} variant="filled" className={styles.confirmBtn} onMouseDown={(e) => e.preventDefault()} onClick={submit} />
        </Tooltip>
      </span>
    </>
  )
}

/** (the calm UI build 2026-10-27, 1-07 · W-071) A task with no tag says nothing at rest — the cell was a purple "+ Add Tags" on every row, cut to
    "+ Ad" at the table's edge. On a mouse the empty cell offers a quiet "Add tags" while the row is pointed at or in focus; the row's ⋮ and the
    task panel carry "Add tags" at every width. */
function AddTagsHint() {
  return <span className={styles.hint}>Add tags</span>
}

/** Inline add row (frame 194 "Type=RW-New, State=Input"): band, disabled checkbox, the field, inert placeholders. */
export type LeadPicker = { leads: TaskLead[]; value: string | null; onChange: (id: string | null) => void }

/** The add row's Lead cell on the rail's Tasks page (REG-466): "Studio" until a lead is picked; the menu lists the live leads.
 *  (REG-729) The house compact select at its cell size (28), the chevron turning while open; (REG-728) its list through the portal,
 *  so the table's sideways scroller can't clip it, at the standard 200 (the trigger hugs its value, too narrow to set the width). */
export function LeadPickerCell({ picker }: { picker: LeadPicker }) {
  const [open, setOpen] = useState(false)
  const anchor = useRef<HTMLSpanElement>(null)
  const current = picker.value ? picker.leads.find((l) => l.id === picker.value) : null
  /* (parity map, TD-027 — 1.0's "Link to Project") the projects made with New project ride the list marked 'Project': a Projects group, with
     its number, after the leads — the groups' titles only when there are projects to tell apart */
  const leadsOnly = picker.leads.filter((l) => l.stage !== 'Project')
  const projectsOnly = picker.leads.filter((l) => l.stage === 'Project')
  const row = (l: TaskLead) => (
    <DropdownItem key={l.id} role="menuitemradio" checked={picker.value === l.id} meta={l.stage === 'Project' ? l.project?.number : undefined} onSelect={() => { setOpen(false); picker.onChange(l.id) }}>{l.name}</DropdownItem>
  )
  return (
    <span className={styles.menuWrap} ref={anchor} data-testid="task-add-lead">
      {/* (the calm UI build 2026-10-27, 1-16) "General" — a task on no lead or project, the scope pill's General tasks (was "Studio") */}
      <SelectTrigger size="s" label="Lead for the new task" value={current?.name ?? 'General'} open={open} onClick={() => setOpen((o) => !o)} />
      <PortalMenu open={open} anchor={anchor} onClose={() => setOpen(false)} align="left" width={projectsOnly.length ? MENU_WIDTH.wide : MENU_WIDTH.standard} role="menu" sheetTitle={projectsOnly.length ? 'Lead or project' : 'Lead'}>
        <DropdownItem role="menuitemradio" checked={!picker.value} onSelect={() => { setOpen(false); picker.onChange(null) }}>General (no lead)</DropdownItem>
        {projectsOnly.length && leadsOnly.length ? <DropdownLabel>Leads</DropdownLabel> : null}
        {leadsOnly.map(row)}
        {projectsOnly.length ? <DropdownLabel>Projects</DropdownLabel> : null}
        {projectsOnly.map(row)}
      </PortalMenu>
    </span>
  )
}

function AddRow({ onSubmit, onCancel, L, leadPicker, members, onAssign, milestones = false }: { onSubmit: (title: string) => void; onCancel: () => void; L: ReturnType<typeof useColumnLayout>; leadPicker?: LeadPicker
  /** (Projects round 2) a project's table: the Milestone cell, unset until the task exists */
  milestones?: boolean
  /** (UX audit 2026-09-30, T4) the new task's members (the lead's, removable) and their person_add */
  members?: Member[]; onAssign?: (anchor: HTMLElement) => void }) {
  return (
    /* `data-add` marks the row a task is being CREATED in — a rename puts the same field on a real row, whose
       cells hold real values. The phone's stylesheet needs to tell the two apart (REG-403). */
    <div className={styles.row} role="row" data-unseen="" data-add="">
      <div className={`${styles.cell} ${styles.colSel} ${styles.pin}`} role="cell" data-col="sel" data-pin-edge={L.edge('sel') || undefined} style={L.style('sel')}>
        <Checkbox isSelected={false} isDisabled aria-label="Select new task" />
      </div>
      <div className={`${styles.cell} ${styles.colTitle} ${L.pinned('title') ? styles.pin : ''}`} role="cell" data-col="title" data-pin-edge={L.edge('title') || undefined} style={L.style('title')} data-editing="">
        <TitleField initial="" onSubmit={onSubmit} onCancel={onCancel} closeOnBlur />
      </div>
      {leadPicker ? (
        <div className={`${styles.cell} ${styles.colLead} ${L.pinned('lead') ? styles.pin : ''}`} role="cell" data-col="lead" data-pin-edge={L.edge('lead') || undefined} style={L.style('lead')}>
          <LeadPickerCell picker={leadPicker} />
        </div>
      ) : null}
      {milestones && !L.hidden('milestone') ? (
        <div className={`${styles.cell} ${styles.colMilestone} ${L.pinned('milestone') ? styles.pin : ''}`} role="cell" data-col="milestone" data-pin-edge={L.edge('milestone') || undefined} style={L.style('milestone')}>
          <span className={styles.creatorName}>—</span>
        </div>
      ) : null}
      {/* (UX audit 2026-09-30, T4) A new task starts with its lead's members — the log reminder's rule (REG-608) — shown as the row will show
          them; the person_add changes them before the save. With nobody on the lead, the person_add alone picks them — (the calm UI build
          2026-10-27, 1-07) the members' own grey glyph, where a purple "Assign" link stood. */}
      <div className={`${styles.cell} ${styles.colMember} ${L.pinned('assignees') ? styles.pin : ''}`} role="cell" data-col="assignees" data-pin-edge={L.edge('assignees') || undefined} style={L.style('assignees')} data-testid="add-row-members">
        {onAssign && members?.length ? (
          <>
            <span className={styles.memberStack}>
              {members.slice(0, 2).map((m) => <Avatar key={m.id} name={m.name} color={m.color} size={24} />)}
              {members.length > 2 ? <span className={styles.plusBox}>+{members.length - 2}</span> : null}
            </span>
            <Tooltip label="Assign members">
              <IconButton icon="person_add" label="Members of the new task" size={24} onClick={(e) => onAssign(e.currentTarget)} />
            </Tooltip>
          </>
        ) : onAssign ? (
          <Tooltip label="Assign members">
            <IconButton icon="person_add" label="Members of the new task" size={24} onClick={(e) => onAssign(e.currentTarget)} />
          </Tooltip>
        ) : (
          <IconButton icon="person_add" label="Members of the new task" size={24} className={styles.inert} tabIndex={-1} aria-disabled />
        )}
      </div>
      {/* The creator is stamped on save; until then the cell reads as unset, the panel's own "—". */}
      <div className={`${styles.cell} ${styles.colCreator} ${L.pinned('creator') ? styles.pin : ''}`} role="cell" data-col="creator" data-pin-edge={L.edge('creator') || undefined} style={L.style('creator')}>
        <span className={styles.creatorName}>—</span>
      </div>
      {/* (the calm UI build 2026-10-27, 1-07) the row a task is typed into says nothing it can't do yet: the due, the status and the tags come with
          the saved task (its panel, its row) — the inert calendar, "OPEN" and "+ Add Tags" placeholders went */}
      <div className={`${styles.cell} ${styles.colDue} ${L.pinned('due') ? styles.pin : ''}`} role="cell" data-col="due" data-pin-edge={L.edge('due') || undefined} style={L.style('due')} />
      <div className={`${styles.cell} ${styles.colStatus} ${L.pinned('status') ? styles.pin : ''}`} role="cell" data-col="status" data-pin-edge={L.edge('status') || undefined} style={L.style('status')} />
      <div className={`${styles.cell} ${styles.colTags} ${L.pinned('tags') ? styles.pin : ''}`} role="cell" data-col="tags" data-pin-edge={L.edge('tags') || undefined} style={L.style('tags')} />
    </div>
  )
}

function TaskRowView({
  task, now, unseen, fresh = false, descriptionMatch, selected, onToggleSelect,
  renaming, onRenameInPanel, onRenameSubmit, onRenameCancel,
  menuOpen, onMenuToggle, onMenuClose,
  onOpen, onOpenComments, onToggleDone, onAssign, onDue, onAddTags, onRowMenu, onEdit, L, milestonePicker,
}: {
  milestonePicker?: MilestonePicker
  task: TaskRow
  onRenameInPanel?: (task: TaskRow) => void
  L: ReturnType<typeof useColumnLayout>
  now: number
  unseen: boolean
  /** (Dane UAT 11.02) The task the add row just created: one pulse. */
  fresh?: boolean
  /** (REG-275) The live search found this row by its description alone — the title cell says so. */
  descriptionMatch: boolean
  selected: boolean
  onToggleSelect: (range: boolean) => void
  renaming: boolean
  onRenameSubmit: (title: string) => void
  onRenameCancel: () => void
  menuOpen: boolean
  onMenuToggle: () => void
  onMenuClose: () => void
  onOpen: (task: TaskRow, anchor: HTMLElement) => void
  onOpenComments: (task: TaskRow) => void
  onToggleDone: (task: TaskRow) => void
  onAssign: (task: TaskRow, anchor: HTMLElement) => void
  onDue: (task: TaskRow, anchor: HTMLElement) => void
  onAddTags: (task: TaskRow, anchor: HTMLElement) => void
  onRowMenu: (task: TaskRow, action: TaskRowAction) => void
  onEdit: (task: TaskRow) => void
}) {
  const overdue = !task.done && isOverdue(task.dueAt, now)
  const outside = outsideOf(task)   // (gaps build, package C — M-03)
  const shiftHeld = useRef(false)
  const touch = useMediaQuery(NO_HOVER)   /* a double-click is a mouse's gesture: on touch the tap alone opens the panel */
  const inert = renaming ? '' : undefined
  const pick = (action: TaskRowAction) => () => { onMenuClose(); onRowMenu(task, action) }
  /* (REG-728) The row menu opens through the body portal, as the Quotes / Contracts twins' (REG-639): an inline menu inside the card's
     sideways scroller was clipped, and the side it opened on had to be measured (REG-286) — the portal flips on the viewport itself. */
  const kebab = useRef<HTMLSpanElement>(null)
  const tagsCell = useRef<HTMLButtonElement>(null)   // (the calm UI build 2026-10-27) the ⋮'s Add tags anchors the picker on the row's own cell

  return (
    <div className={styles.row} role="row" data-kb-row data-kb-id={task.id} data-unseen={unseen ? '' : undefined} data-selected={selected ? '' : undefined} data-fresh={fresh || undefined}>
      {/* Selection cell: checkbox 24/Light secondary → check_box 24 primary when selected.
          The DS Checkbox reports the next checked state, not the event, so Shift is read off the click on its way
          down (capture runs before the input's own change) and handed to the range selector. */}
      <div className={`${styles.cell} ${styles.colSel} ${styles.pin}`} role="cell" data-col="sel" data-pin-edge={L.edge('sel') || undefined} style={L.style('sel')}
           data-kb-select
           onClickCapture={(e) => { shiftHeld.current = e.shiftKey }}
           onKeyDownCapture={(e) => { shiftHeld.current = e.shiftKey }}>
        <Checkbox isSelected={selected} onChange={() => onToggleSelect(shiftHeld.current)} aria-label={`Select ${task.title}`} />
      </div>

      {/* Title cell — status glyph · title (bold when unseen) · count chips; the rest of the cell opens the task. */}
      {renaming ? (
        <div className={`${styles.cell} ${styles.colTitle} ${L.pinned('title') ? styles.pin : ''}`} role="cell" data-col="title" data-pin-edge={L.edge('title') || undefined} style={L.style('title')} data-editing="">
          <TitleField initial={task.title} onSubmit={onRenameSubmit} onCancel={onRenameCancel} />
        </div>
      ) : (
        <div className={`${styles.cell} ${styles.colTitle} ${L.pinned('title') ? styles.pin : ''}`} role="cell" data-col="title" data-pin-edge={L.edge('title') || undefined} style={L.style('title')}>
          <Tooltip label={task.done ? 'Reopen' : 'Mark as done'}>
            <button
              type="button" className={styles.glyph} data-done={task.done || undefined}
              aria-label={task.done ? `Reopen ${task.title}` : `Mark ${task.title} as completed`}
              aria-pressed={task.done}
              onClick={() => onToggleDone(task)}
            >
              {/* Completed = the FILLED check_circle, as the mock draws it; open = the outlined ring (user 2026-08-30). */}
              <Icon name={task.done ? 'check_circle' : 'radio_button_unchecked'} size={24} weight={300} fill={task.done} />
            </button>
          </Tooltip>
          {/* Nested buttons aren't allowed, so the glyph sits beside this button; the anchor handed up is the cell itself. */}
          {/* (UX audit 2026-09-30, T6 — supersedes REG-472's click-to-rename) A click on the title opens the task's panel, as the rest of the
              cell, the Edit pill and the comment chip do: a designer who wanted the details landed in a text field. A double-click opens the
              panel with its Task name selected — rename there; the row menu's Rename still edits in place. */}
          {/* (the calm UI build 2026-10-27) `data-kb-open` — Enter on the row — rides on the title now that the Edit pill is in the ⋮ */}
          <button type="button" className={styles.titleBtn} onClick={(e) => onOpen(task, e.currentTarget.parentElement as HTMLElement)} data-kb-open
                  onDoubleClick={touch || !onRenameInPanel ? undefined : () => onRenameInPanel(task)} aria-label={`Open ${task.title}`}>
            {/* (Dane UAT 8.16) A cut title says itself in full on hover — REG-820's `whenCut`, as the libraries' names do. */}
            <Tooltip label={task.title} whenCut><span className={styles.title} data-unseen={unseen ? '' : undefined}>{task.title}</span></Tooltip>
          </button>
          {/* The chips sit BESIDE the title button, not inside it: the comment chip is a control of its own now
              (opens the comments panel straight away, user 2026-08-30) and buttons cannot nest — the same reason
              the status glyph sits outside. The attachment chip stays a plain count. */}
          {task.comments.length > 0 || task.attachments.length > 0 || descriptionMatch ? (
            <span className={styles.chips}>
              {task.comments.length > 0 ? (
                <Tooltip label="Open comments">
                  <button type="button" className={styles.chip} data-action=""
                          aria-label={`Open ${task.comments.length} comments`}
                          onClick={() => onOpenComments(task)}>
                    <Icon name="comment" size={16} weight={300} />
                    {task.comments.length}
                  </button>
                </Tooltip>
              ) : null}
              {task.attachments.length > 0 ? (
                <span className={styles.chip} aria-label={`${task.attachments.length} attachments`}>
                  <Icon name="attach_file" size={16} weight={300} />
                  {task.attachments.length}
                </span>
              ) : null}
              {/* (REG-275) The search matches the description now, and the description is not in the row — so when it
                  is the ONLY hit the cell says where the match is. The count chips' own box, no new element; it shows
                  while a search is running and never otherwise. Its own words rather than a tooltip: tooltips never
                  fire on touch (responsive.md). */}
              {descriptionMatch ? (
                <span className={styles.chip} aria-label="Matched in the description">
                  <Icon name="description" size={16} weight={300} />
                  In description
                </span>
              ) : null}
            </span>
          ) : null}
          {/* (T6) The rest of the cell opens the panel too — one gesture for the whole title cell. */}
          <button type="button" className={styles.titleRest} tabIndex={-1} aria-hidden
                  onClick={(e) => onOpen(task, e.currentTarget.parentElement as HTMLElement)}
                  onDoubleClick={touch || !onRenameInPanel ? undefined : () => onRenameInPanel(task)} />
        </div>
      )}

      {/* Member cell: up to two Avatars 24 + person_add 24 primary outlined; unassigned = the leads listing's
          "Assign" link, no placeholder avatar (REG-240 — one vocabulary for "nobody yet" everywhere). */}
      {L.hidden('lead') ? null : (
      <div className={`${styles.cell} ${styles.colLead} ${L.pinned('lead') ? styles.pin : ''}`} role="cell" data-col="lead" data-pin-edge={L.edge('lead') || undefined} style={L.style('lead')}>
        {/* (REG-466) The rail's Tasks page: the lead as the listing names it — bold, primary on hover, no stage (owner 2026-09-16) — opening its Tasks tab and coming back here. */}
        {/* (fix-A, A-20) a task of a project opens the project's Tasks, the project's number beside the client */}
        {task.lead ? (
          <NextLink href={withFrom(task.lead.project ? `/projects/${task.lead.project.id}/tasks` : `/leads/${task.lead.id}/tasks`, '/tasks')} className={styles.leadLink}>
            {/* (parity P-27, B-18) a project's task names the project as the Projects listing and the group header do — its name, the
                number under it — where it read "{client} · P-20…", cut on the number */}
            {task.lead.project ? (
              <span className={styles.leadTwo} data-testid="task-for-project">
                <span className={styles.leadName}>{task.lead.project.name}</span>
                <span className={styles.leadSub}>{task.lead.project.number}</span>
              </span>
            ) : <span className={styles.leadName}>{task.lead.name}</span>}
          </NextLink>
        ) : (
          /* (the calm UI build 2026-10-27, 1-16) a task on no lead and no project is a general task — the scope pill's word; "Studio" also
             names the whole studio on the Dashboard and the all-hands chat */
          <span className={styles.leadStudio}><Icon name="domain" size={16} weight={300} />General</span>
        )}
      </div>
      )}
      {milestonePicker && !L.hidden('milestone') ? (
        <div className={`${styles.cell} ${styles.colMilestone} ${L.pinned('milestone') ? styles.pin : ''}`} role="cell" data-col="milestone" data-pin-edge={L.edge('milestone') || undefined} style={L.style('milestone')} data-inert={inert}>
          <MilestoneCell task={task} picker={milestonePicker} />
        </div>
      ) : null}
      {/* (the calm UI build 2026-10-27, 1-07 · 2-19 · T-02) Nobody on it: the members' own grey person_add — one quiet glyph where a purple
          "Assign" link stood on every unassigned row. Someone on it: their faces, and the person_add on a mouse only while the row is pointed
          at or in focus (a finger keeps it); the Unassigned chip finds the rest. */}
      <div className={`${styles.cell} ${styles.colMember} ${L.pinned('assignees') ? styles.pin : ''}`} role="cell" data-col="assignees" data-pin-edge={L.edge('assignees') || undefined} style={L.style('assignees')} data-inert={inert}>
        {task.assignees.length === 0 && !outside ? (
          <Tooltip label="Assign members">
            <IconButton icon="person_add" label={`Assign members to ${task.title}`} size={24} onClick={(e) => onAssign(task, e.currentTarget)} data-testid="task-row-assign" />
          </Tooltip>
        ) : (
          <>
            {/* (gaps build, package C — M-03) the outside person stands in the stack with the members: two at most, then +n */}
            <span className={styles.memberStack}>
              {task.assignees.slice(0, outside ? 1 : 2).map((m) => <Avatar key={m.id} name={m.name} color={m.color} size={24} />)}
              {outside ? <OutsideBadge o={outside} /> : null}
              {task.assignees.length > (outside ? 1 : 2) ? <span className={styles.plusBox}>+{task.assignees.length - (outside ? 1 : 2)}</span> : null}
            </span>
            <span className={styles.onHover}>
              <Tooltip label="Assign members">
                <IconButton icon="person_add" label={`Assign members to ${task.title}`} size={24}
                            onClick={(e) => onAssign(task, e.currentTarget)} />
              </Tooltip>
            </span>
          </>
        )}
      </div>

      {/* Creator cell (REG-239, not in the mock): the panel's Creator row as a column — Avatar 24 + name, — when absent. */}
      <div className={`${styles.cell} ${styles.colCreator} ${L.pinned('creator') ? styles.pin : ''}`} role="cell" data-col="creator" data-pin-edge={L.edge('creator') || undefined} style={L.style('creator')}>
        {task.creator ? (
          <>
            <Avatar name={task.creator.name} color={task.creator.color} size={24} tooltip={false} />
            <span className={styles.creatorName}>{task.creator.name}</span>
          </>
        ) : (
          <span className={styles.creatorName}>—</span>
        )}
      </div>

      {/* Due cell: the date (red when overdue) — (Dane UAT 5.13 · 5.05) with its day and, when the task has one, its time: "Sat, 3 Oct ’26 ·
          10:00 AM". (the calm UI build 2026-10-27, 1-07 · 2-19) Plain text, no underline at rest; an undated task's calendar_add_on is the grey
          glyph, on a mouse only while the row is pointed at or in focus — a finger keeps it. */}
      <div className={`${styles.cell} ${styles.colDue} ${L.pinned('due') ? styles.pin : ''}`} role="cell" data-col="due" data-pin-edge={L.edge('due') || undefined} style={L.style('due')} data-inert={inert}>
        {task.dueAt ? (
          <button type="button" className={styles.dueBtn} data-overdue={overdue || undefined}
                  aria-label={`Due ${displayDue(task.dueAt)}${overdue ? ', overdue' : ''} — change due date`}
                  onClick={(e) => onDue(task, e.currentTarget)}>
            {/* (L4, C-07) a touch tablet's Due cell says the day in its short words ("Mon 26 Oct · 10:00 AM", "Today · 10:00 AM") — the desk's as it was */}
            <span className={styles.dueLong}>{displayDue(task.dueAt)}</span>
            <span className={styles.dueShort}>{dueChip(task.dueAt, task.done, now)?.text}</span>
          </button>
        ) : (
          <span className={styles.onHover}>
            <Tooltip label="Set due date">
              <IconButton icon="calendar_add_on" label={`Set due date for ${task.title}`} size={24}
                          onClick={(e) => onDue(task, e.currentTarget)} />
            </Tooltip>
          </span>
        )}
      </div>

      {/* Status cell: Tag Outlined Blue "OPEN" · Green "COMPLETED". */}
      <div className={`${styles.cell} ${styles.colStatus} ${L.pinned('status') ? styles.pin : ''}`} role="cell" data-col="status" data-pin-edge={L.edge('status') || undefined} style={L.style('status')}>
        {task.done
          ? <Tag appearance="outlined" color="green">COMPLETED</Tag>
          : <Tag appearance="outlined" color="blue">OPEN</Tag>}
      </div>

      {/* Tags cell: the whole cell opens the picker. (the calm UI build 2026-10-27, 1-07 · 2-19 · T-06) The tags in the words the studio typed —
          secondary text, "Generic, Focus +2", not capital chips (capitals are for a status); none = nothing at rest (AddTagsHint). */}
      <div className={`${styles.cell} ${styles.colTags} ${L.pinned('tags') ? styles.pin : ''}`} role="cell" data-col="tags" data-pin-edge={L.edge('tags') || undefined} style={L.style('tags')} data-inert={inert}>
        <button ref={tagsCell} type="button" className={styles.tagsBtn} aria-label={`Tags for ${task.title}`}
                onClick={(e) => onAddTags(task, e.currentTarget)}>
          {task.tags.length === 0 ? (
            <AddTagsHint />
          ) : (
            <span className={styles.tagWords}>
              <span className={styles.tagName}>{task.tags.slice(0, 2).map((g) => g.name).join(', ')}</span>
              {task.tags.length > 2 ? <span className={styles.tagMore}>{`+${task.tags.length - 2}`}</span> : null}
            </span>
          )}
        </button>
      </div>

      {/* Row hover actions (frame 195 / 606:75167, REG-163): the kebab, level-1 shadow, right 24. (the calm UI build 2026-10-27, 1-07 · T-02) The
          floating Edit pill went — it sat over the due date ("Thu, 10 Sep ’26 [Edit] ⋮" hid the time) and the row already opens on its title;
          Edit is the ⋮'s first row, with Add tags beside it. The ⋮ is the grey house glyph, not a purple one on every row. */}
      {renaming ? null : (
        <span className={styles.actions} data-open={menuOpen || undefined}>
          <span className={styles.actionsInner}>
          <span className={styles.menuWrap} ref={kebab}>
            <span className={styles.float}>
              <Tooltip label="More actions" disabled={menuOpen}>
                <IconButton icon="more_vert" label={`More actions for ${task.title}`} className={styles.rowKebab}
                            aria-haspopup="menu" aria-expanded={menuOpen} onClick={onMenuToggle} />
              </Tooltip>
            </span>
            <PortalMenu open={menuOpen} anchor={kebab} onClose={onMenuClose} align="right" width={MENU_WIDTH.standard} role="menu" sheetTitle={task.title}>
              <DropdownItem onSelect={() => { onMenuClose(); onEdit(task) }} testId="task-row-edit">Edit</DropdownItem>
              {/* "Mark as done" only — the mock has no reopen item, so it is hidden for completed tasks (the row's ring reopens). */}
              {task.done ? null : <DropdownItem onSelect={pick('complete')}>Mark as done</DropdownItem>}
              <DropdownItem onSelect={pick('rename')}>Rename</DropdownItem>
              {/* (the calm UI build 2026-10-27, 1-07) the tags picker from the row, wherever the Tags column stands — or rests in Column settings */}
              <DropdownItem onSelect={() => { onMenuClose(); const el = tagsCell.current; if (el && el.getClientRects().length) onAddTags(task, el); else onEdit(task) }} testId="task-row-tags">{task.tags.length ? 'Edit tags' : 'Add tags'}</DropdownItem>
              {/* (gaps build, package C — M-03) the task to its outside person, drafted on WhatsApp */}
              {outside?.phone ? <DropdownItem onSelect={pick('send-outside')} help={`Opens WhatsApp with the task for ${outside.name}`}>Send on WhatsApp</DropdownItem> : null}
              <DropdownItem onSelect={pick('template')}>Save as a template</DropdownItem>
              <DropdownItem onSelect={pick('duplicate')}>Duplicate</DropdownItem>
              <DropdownItem tone="danger" onSelect={pick('delete')}>Delete</DropdownItem>
            </PortalMenu>
          </span>
          </span>
        </span>
      )}
    </div>
  )
}

/** (Projects round 2) The Milestone cell of a project's task: the milestone it sits in, pressed to put it in another or take it out — the house
    menu through the portal (REG-728), its rows radio rows. */
function MilestoneCell({ task, picker }: { task: TaskRow; picker: MilestonePicker }) {
  const [open, setOpen] = useState(false)
  const anchor = useRef<HTMLSpanElement>(null)
  const current = picker.options.find((m) => m.id === task.milestoneId) ?? null
  return (
    <span className={styles.menuWrap} ref={anchor}>
      <button type="button" className={styles.milestoneBtn} data-none={current ? undefined : ''} aria-haspopup="menu" aria-expanded={open}
              aria-label={current ? `Milestone: ${current.title} — change` : `Put ${task.title} in a milestone`} onClick={() => setOpen((o) => !o)} data-testid="task-milestone">
        <span>{current?.title ?? '--'}</span>
      </button>
      <PortalMenu open={open} anchor={anchor} onClose={() => setOpen(false)} align="left" width={MENU_WIDTH.wide} role="menu" sheetTitle="Milestone">
        {picker.options.map((m) => <DropdownItem key={m.id} role="menuitemradio" checked={task.milestoneId === m.id} onSelect={() => { setOpen(false); picker.onPick(task, m.id) }}>{m.title}</DropdownItem>)}
        <DropdownItem role="menuitemradio" checked={!current} onSelect={() => { setOpen(false); picker.onPick(task, null) }}>In no milestone</DropdownItem>
      </PortalMenu>
    </span>
  )
}
