'use client'

import { useEffect, useRef, useState, type FocusEvent, type KeyboardEvent } from 'react'
import { Button, Checkbox, Link, Tag } from '@/components/ds'
import { Dropdown, DropdownItem } from '@/components/leads/dropdown'
import { menuSideFor } from '@/components/leads/menu-side'
import { Avatar } from '@/components/om/avatar'
import { ColumnResizer, flexVars, useColumnWidths } from '@/components/om/column-resize'
import { useColumnLayout, type TableColumn, type TableColumnDef } from '@/components/om/table-columns'
import { useMediaQuery } from '@/lib/breakpoint'
import { useColumnDrag } from '@/components/om/column-drag'
import { useOverflowX } from '@/components/om/use-overflow-x'
import { Icon } from '@/components/om/icon'
import NextLink from 'next/link'
import { withFrom } from '@/lib/nav'
import type { TaskLead } from '@/lib/leads/tasks'
import { IconButton } from '@/components/om/icon-button'
import { useComingSoon } from '@/components/om/snackbar'
import { Tooltip } from '@/components/om/tooltip'
import { displayDate, isOverdue } from '@/lib/format'
import type { TaskRow } from '@/lib/leads/tasks'
import styles from './tasks-table.module.css'

const NO_HOVER = '(hover: none)'
export type TaskRowAction = 'complete' | 'rename' | 'template' | 'duplicate' | 'delete'

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
  /** Row being renamed — the same field treatment on that row, pre-filled with the title. */
  renaming: string | null
  /** (REG-472) A click on the title text — the row starts editing in place. */
  onRenameStart: (task: TaskRow) => void
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
  /** Bottom bar "+ Add Task" (902:26450). */
  onAddClick?: () => void
}

/* Column order + head copy — sentence case, exactly as the mock types it (spec 01). Tags has no sort icon. */
/** The table's columns (902:26387): Title locked first; the user's order, visibility and pins come from Column settings (REG-454).
    `track` is the mock's px — the floor the rows never squeeze under (REG-430); the flex bases live in the CSS. */
export const TASK_COLUMN_DEFS: readonly TableColumnDef[] = [
  { key: 'title', label: 'Title', track: '320', locked: true },   /* floor 320 (was the mock's 420, owner 2026-09-17: Tags must show below 1440) */
  { key: 'assignees', label: 'Members', track: '160' },   /* REG-290 */
  { key: 'creator', label: 'Creator', track: '160' },
  { key: 'due', label: 'Due date', track: '137' },
  { key: 'status', label: 'Status', track: '118' },
  { key: 'tags', label: 'Tags', track: '191' },
]
/** The rail's Tasks page (REG-466): the same columns with the task's Lead after Title — free, not pinned (owner's call). */
export const STUDIO_TASK_COLUMN_DEFS: readonly TableColumnDef[] = [TASK_COLUMN_DEFS[0]!, { key: 'lead', label: 'Lead', track: '200' }, ...TASK_COLUMN_DEFS.slice(1)]
const COL_CLASS: Record<string, string | undefined> = { title: styles.colTitle, lead: styles.colLead, assignees: styles.colMember, creator: styles.colCreator, due: styles.colDue, status: styles.colStatus, tags: styles.colTags }
/* (REG-468) Only Due date and Status order a task list; Title, Lead, Members and Creator lost their glyph. */
const SORTABLE: Record<string, boolean> = { title: false, lead: false, assignees: false, creator: false, due: true, status: true, tags: false }

/**
 * Lead Details › Tasks table (902:26387) — specs 01-listing-table.txt + 02-rows-menus-bulk.txt.
 * Head 56 · rows 48 · bottom bar 53; columns 56 · 582 · 160 · 160 · 137 · 118 · 191 (Title fills).
 * The Creator column is not in the mock (REG-239, user 2026-09-01): the panel's Creator row as a column,
 * so who asked for a task is visible without opening it; Members keeps the avatars + person_add only.
 * Every icon-only control carries a Tooltip; sorting is inert (coming soon); menus toggle on their own trigger.
 */
export function TasksTable({
  tasks, now, selected, onSelect, unseen, descriptionMatches,
  adding, onAddSubmit, addKey, onAddCancel,
  renaming, onRenameStart, onRenameSubmit, onRenameCancel,
  onOpen, onOpenComments, onToggleDone, onAssign, onDue, onAddTags, onRowMenu, onEdit, onAddClick, columns, onReorder, leadPicker,
}: TasksTableProps) {
  const comingSoon = useComingSoon()
  const [menuRow, setMenuRow] = useState<string | null>(null)
  /* (REG-286) Measured on open, exactly as the Quotes / Contracts twins do — only one row menu is open at a time. */
  const [menuSide, setMenuSide] = useState<'up' | 'down'>('down')

  const allSelected = tasks.length > 0 && tasks.every((t) => selected.has(t.id))
  const toggleAll = () => onSelect(allSelected ? new Set() : new Set(tasks.map((t) => t.id)))
  /* Shift-click selects the run between the last row touched and this one, as a mail client does (user 2026-08-30):
     it only ever ADDS, so shift-clicking across a partly-ticked list fills the gaps instead of flipping them. The
     anchor is the last row clicked, with or without shift. */
  const lastTouched = useRef<number | null>(null)

  /* The Add Task bar is docked whenever the card's end sits below the fold; the 1px sentinel after it says so. */
  const cardEnd = useRef<HTMLDivElement>(null)
  const [floating, setFloating] = useState(false)
  useEffect(() => {
    const el = cardEnd.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([entry]) => setFloating(!entry?.isIntersecting), { rootMargin: '0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])
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
  const floor = 56 + columns.reduce((sum, c) => sum + (colWidths[c.key] ?? Number(c.track)), 0)
  const headRow = useRef<HTMLDivElement>(null)
  const L0 = useColumnLayout(columns, headRow, { leading: 56, flex: true })
  const D = useColumnDrag(columns, onReorder)   /* drag a head to reorder (REG-462) */
  const L = { ...L0, style: (key: string) => ({ ...L0.style(key), ...D.style(key) }) }   /* (REG-614) every cell rides the drag's transform, so the whole column travels — the Items grid's rule (REG-572) */
  const [frame, overflowing] = useOverflowX()
  return (
    <div className={styles.card} role="table" data-drag-root="" aria-label="Tasks" data-kb-list="task" data-cols="lead-tasks" style={{ ...(colVars ?? {}), '--table-min': `${floor}px` } as React.CSSProperties}>
    <div ref={frame} className={styles.scroller} data-overflow={overflowing || undefined}
         onScroll={(e) => e.currentTarget.toggleAttribute('data-scrolled', e.currentTarget.scrollLeft > 0)}>
    <div className={styles.table}>
      {/* Head row — selection head = a real select-all checkbox (check_box_outline_blank 24/Light in the mock). */}
      <div ref={headRow} className={styles.head} role="row">
        <div className={`${styles.hCell} ${styles.colSel} ${styles.pin}`} role="columnheader" data-col="sel" data-kb-select-all data-pin-edge={L.edge('sel') || undefined} style={L.style('sel')}>
          <Checkbox isSelected={allSelected} isIndeterminate={!allSelected && tasks.some((t) => selected.has(t.id))} isDisabled={tasks.length === 0} onChange={toggleAll} aria-label="Select all tasks" />
        </div>
        {columns.map((c) => (
          <div key={c.key} className={`${styles.hCell} ${COL_CLASS[c.key] ?? ''} ${c.pinned ? styles.pin : ''}`} role="columnheader" data-col={c.key} data-pin-edge={L.edge(c.key) || undefined} style={L.style(c.key)} {...D.head(c.key)}>
            {SORTABLE[c.key] ? (
              /* Sort is inert in this prototype — the head answers coming soon. */
              <button type="button" className={styles.hSort} onClick={comingSoon}>
                <span className={styles.hLabel}>{c.label}</span>
                <Icon name="unfold_more" size={16} />
              </button>
            ) : (
              <span className={styles.hLabel}>{c.label}</span>
            )}
            <ColumnResizer table="lead-tasks" column={c.key} label={c.label} min={c.key === 'title' ? 200 : 72} />
          </div>
        ))}
      </div>

      {adding ? (
        <AddRow key={`new-${addKey ?? 0}`} onSubmit={onAddSubmit} onCancel={onAddCancel} L={L} leadPicker={leadPicker} />
      ) : null}

      {tasks.map((task, idx) => (
        <TaskRowView L={L}
          onRenameStart={onRenameStart}
          key={task.id}
          task={task}
          now={now}
          unseen={unseen.has(task.id)}
          descriptionMatch={descriptionMatches?.has(task.id) ?? false}
          selected={selected.has(task.id)}
          onToggleSelect={(range) => toggleOne(task.id, idx, range)}
          renaming={renaming === task.id}
          onRenameSubmit={(title) => onRenameSubmit(task.id, title)}
          onRenameCancel={onRenameCancel}
          menuOpen={menuRow === task.id}
          onMenuToggle={(trigger) => {
            /* (REG-286) This table still counted rows: with three tasks the last two kebabs opened UPWARD, over the
               toolbar and the tab strip, with half a screen free below them. The side is now measured off the
               trigger and this menu's real height (components/leads/menu-side.ts) — five items, four once the task
               is done and "Mark as Completed" drops out. */
            if (menuRow !== task.id) setMenuSide(menuSideFor(trigger, task.done ? 4 : 5))
            setMenuRow((m) => (m === task.id ? null : task.id))
          }}
          onMenuClose={() => setMenuRow(null)}
          menuSide={menuSide}
          onOpen={onOpen} onOpenComments={onOpenComments} onToggleDone={onToggleDone} onAssign={onAssign} onDue={onDue} onAddTags={onAddTags}
          onRowMenu={onRowMenu} onEdit={onEdit}
        />
      ))}
    </div>
    </div>

      {/* Bottom bar 902:26450 — Link text Primary leading icon add "Add Task". Sticks to the viewport bottom while
          the card runs past it; `data-floating` adds the lift only while it is actually docked. */}
      <div className={styles.foot} data-floating={floating || undefined}>
        <Link variant="primary" iconStart={<Icon name="add" size={20} />} onPress={() => onAddClick?.()}>
          Add Task
        </Link>
      </div>
      <div className={styles.footEnd} ref={cardEnd} aria-hidden />
    </div>
  )
}

/* ---------------------------------------------------------------------------------------------- */

/** The title cell as the active field (frame 194): bare input + ✕ (secondary outlined 24) + ✓ (primary filled 24). */
function TitleField({ initial, onSubmit, onCancel, closeOnBlur = false }: { initial: string; onSubmit: (title: string) => void; onCancel: () => void; closeOnBlur?: boolean }) {
  const [value, setValue] = useState(initial)
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
          <button type="button" className={styles.cancelBtn} aria-label="Cancel" onMouseDown={(e) => e.preventDefault()} onClick={cancel}><Icon name="close" size={20} /></button>
        </Tooltip>
        <Tooltip label="Save">
          <button type="button" className={styles.okBtn} aria-label="Save" onMouseDown={(e) => e.preventDefault()} onClick={submit}><Icon name="done" size={20} /></button>
        </Tooltip>
      </span>
    </>
  )
}

function AddTagsLink({ inert = false }: { inert?: boolean }) {
  return (
    <span className={styles.link} data-inert={inert || undefined}>
      <Icon name="add" size={20} />
      Add Tags
    </span>
  )
}

/** Inline add row (frame 194 "Type=RW-New, State=Input"): band, disabled checkbox, the field, inert placeholders. */
export type LeadPicker = { leads: TaskLead[]; value: string | null; onChange: (id: string | null) => void }

/** The add row's Lead cell on the rail's Tasks page (REG-466): "Studio" until a lead is picked; the menu lists the live leads. */
function LeadPickerCell({ picker }: { picker: LeadPicker }) {
  const [open, setOpen] = useState(false)
  const current = picker.value ? picker.leads.find((l) => l.id === picker.value) : null
  return (
    <span className={styles.menuWrap}>
      <button type="button" className={styles.leadPick} aria-haspopup="menu" aria-expanded={open} aria-label={`Lead for the new task: ${current?.name ?? 'Studio'}`} onClick={() => setOpen((o) => !o)}>
        <span className={styles.leadPickName}>{current?.name ?? 'Studio'}</span>
        <Icon name="keyboard_arrow_down" size={20} />
      </button>
      <Dropdown open={open} onClose={() => setOpen(false)} align="left" width={280} sheetTitle="Lead">
        <DropdownItem role="menuitemradio" checked={!picker.value} onSelect={() => { setOpen(false); picker.onChange(null) }}>Studio (no lead)</DropdownItem>
        {picker.leads.map((l) => (
          <DropdownItem key={l.id} role="menuitemradio" checked={picker.value === l.id} onSelect={() => { setOpen(false); picker.onChange(l.id) }}>{l.name}</DropdownItem>
        ))}
      </Dropdown>
    </span>
  )
}

function AddRow({ onSubmit, onCancel, L, leadPicker }: { onSubmit: (title: string) => void; onCancel: () => void; L: ReturnType<typeof useColumnLayout>; leadPicker?: LeadPicker }) {
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
      <div className={`${styles.cell} ${styles.colMember} ${L.pinned('assignees') ? styles.pin : ''}`} role="cell" data-col="assignees" data-pin-edge={L.edge('assignees') || undefined} style={L.style('assignees')}>
        <span className={`${styles.assignLink} ${styles.inert}`}>
          <Icon name="person_add" size={20} />
          Assign
        </span>
      </div>
      {/* The creator is stamped on save; until then the cell reads as unset, the panel's own "—". */}
      <div className={`${styles.cell} ${styles.colCreator} ${L.pinned('creator') ? styles.pin : ''}`} role="cell" data-col="creator" data-pin-edge={L.edge('creator') || undefined} style={L.style('creator')}>
        <span className={styles.creatorName}>—</span>
      </div>
      <div className={`${styles.cell} ${styles.colDue} ${L.pinned('due') ? styles.pin : ''}`} role="cell" data-col="due" data-pin-edge={L.edge('due') || undefined} style={L.style('due')}>
        <IconButton icon="calendar_add_on" label="Set due date" size={24} variant="primary" className={styles.inert} tabIndex={-1} aria-disabled />
      </div>
      <div className={`${styles.cell} ${styles.colStatus} ${L.pinned('status') ? styles.pin : ''}`} role="cell" data-col="status" data-pin-edge={L.edge('status') || undefined} style={L.style('status')}>
        <Tag appearance="outlined" color="blue">OPEN</Tag>
      </div>
      <div className={`${styles.cell} ${styles.colTags} ${L.pinned('tags') ? styles.pin : ''}`} role="cell" data-col="tags" data-pin-edge={L.edge('tags') || undefined} style={L.style('tags')}>
        <AddTagsLink inert />
      </div>
    </div>
  )
}

function TaskRowView({
  task, now, unseen, descriptionMatch, selected, onToggleSelect,
  renaming, onRenameStart, onRenameSubmit, onRenameCancel,
  menuOpen, onMenuToggle, onMenuClose, menuSide,
  onOpen, onOpenComments, onToggleDone, onAssign, onDue, onAddTags, onRowMenu, onEdit, L,
}: {
  task: TaskRow
  onRenameStart: (task: TaskRow) => void
  L: ReturnType<typeof useColumnLayout>
  now: number
  unseen: boolean
  /** (REG-275) The live search found this row by its description alone — the title cell says so. */
  descriptionMatch: boolean
  selected: boolean
  onToggleSelect: (range: boolean) => void
  renaming: boolean
  onRenameSubmit: (title: string) => void
  onRenameCancel: () => void
  menuOpen: boolean
  /** (REG-286) Hands the kebab up so the parent can measure which way its menu fits (menu-side.ts). */
  onMenuToggle: (trigger: HTMLElement) => void
  onMenuClose: () => void
  menuSide: 'up' | 'down'
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
  const shiftHeld = useRef(false)
  const touch = useMediaQuery(NO_HOVER)   /* (REG-472) which of the two the title cell does */
  const inert = renaming ? '' : undefined
  const pick = (action: TaskRowAction) => () => { onMenuClose(); onRowMenu(task, action) }

  return (
    <div className={styles.row} role="row" data-kb-row data-kb-id={task.id} data-unseen={unseen ? '' : undefined} data-selected={selected ? '' : undefined}>
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
          <Tooltip label={task.done ? 'Reopen' : 'Mark as completed'}>
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
          {/* (REG-472, owner 2026-09-16) The title itself edits in place, as a cell of the quote editor does; the rest of the
              cell, the Edit pill and the comment chip still open the panel. */}
          <button type="button" className={styles.titleBtn} onClick={(e) => (touch ? onOpen(task, e.currentTarget.parentElement as HTMLElement) : onRenameStart(task))} aria-label={touch ? `Open ${task.title}` : `Rename ${task.title}`}>
            <span className={styles.title} data-unseen={unseen ? '' : undefined}>{task.title}</span>
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
          {/* (REG-472) The whole cell edits on a pointer that hovers; on touch the tap opens the panel (the mobile canvas, REG-354). */}
          <button type="button" className={styles.titleRest} tabIndex={-1} aria-hidden
                  onClick={(e) => (touch ? onOpen(task, e.currentTarget.parentElement as HTMLElement) : onRenameStart(task))} />
        </div>
      )}

      {/* Member cell: up to two Avatars 24 + person_add 24 primary outlined; unassigned = the leads listing's
          "Assign" link, no placeholder avatar (REG-240 — one vocabulary for "nobody yet" everywhere). */}
      {L.hidden('lead') ? null : (
      <div className={`${styles.cell} ${styles.colLead} ${L.pinned('lead') ? styles.pin : ''}`} role="cell" data-col="lead" data-pin-edge={L.edge('lead') || undefined} style={L.style('lead')}>
        {/* (REG-466) The rail's Tasks page: the lead as the listing names it — bold, primary on hover, no stage (owner 2026-09-16) — opening its Tasks tab and coming back here. */}
        {task.lead ? (
          <NextLink href={withFrom(`/leads/${task.lead.id}/tasks`, '/tasks')} className={styles.leadLink}>
            <span className={styles.leadName}>{task.lead.name}</span>
          </NextLink>
        ) : (
          <span className={styles.leadStudio}><Icon name="domain" size={16} weight={300} />Studio</span>
        )}
      </div>
      )}
      <div className={`${styles.cell} ${styles.colMember} ${L.pinned('assignees') ? styles.pin : ''}`} role="cell" data-col="assignees" data-pin-edge={L.edge('assignees') || undefined} style={L.style('assignees')} data-inert={inert}>
        {task.assignees.length === 0 ? (
          <button type="button" className={styles.assignLink} onClick={(e) => onAssign(task, e.currentTarget)}>
            <Icon name="person_add" size={20} />
            Assign
          </button>
        ) : (
          <>
            <span className={styles.memberStack}>
              {task.assignees.slice(0, 2).map((m) => <Avatar key={m.id} name={m.name} color={m.color} size={24} />)}
              {task.assignees.length > 2 ? <span className={styles.plusBox}>+{task.assignees.length - 2}</span> : null}
            </span>
            <Tooltip label="Assign members">
              <IconButton icon="person_add" label={`Assign members to ${task.title}`} size={24} variant="primary"
                          onClick={(e) => onAssign(task, e.currentTarget)} />
            </Tooltip>
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

      {/* Due cell: calendar_add_on 24 primary outlined when empty; the date (underlined, red when overdue) otherwise. */}
      <div className={`${styles.cell} ${styles.colDue} ${L.pinned('due') ? styles.pin : ''}`} role="cell" data-col="due" data-pin-edge={L.edge('due') || undefined} style={L.style('due')} data-inert={inert}>
        {task.dueAt ? (
          <button type="button" className={styles.dueBtn} data-overdue={overdue || undefined}
                  aria-label={`Due ${displayDate(task.dueAt)}${overdue ? ', overdue' : ''} — change due date`}
                  onClick={(e) => onDue(task, e.currentTarget)}>
            {displayDate(task.dueAt)}
          </button>
        ) : (
          <Tooltip label="Set due date">
            <IconButton icon="calendar_add_on" label={`Set due date for ${task.title}`} size={24} variant="primary"
                        onClick={(e) => onDue(task, e.currentTarget)} />
          </Tooltip>
        )}
      </div>

      {/* Status cell: Tag Outlined Blue "OPEN" · Green "COMPLETED". */}
      <div className={`${styles.cell} ${styles.colStatus} ${L.pinned('status') ? styles.pin : ''}`} role="cell" data-col="status" data-pin-edge={L.edge('status') || undefined} style={L.style('status')}>
        {task.done
          ? <Tag appearance="outlined" color="green">COMPLETED</Tag>
          : <Tag appearance="outlined" color="blue">OPEN</Tag>}
      </div>

      {/* Tags cell: two Tag Outlined Default + "+n", or the "+ Add Tags" link; the whole cell opens the picker. */}
      <div className={`${styles.cell} ${styles.colTags} ${L.pinned('tags') ? styles.pin : ''}`} role="cell" data-col="tags" data-pin-edge={L.edge('tags') || undefined} style={L.style('tags')} data-inert={inert}>
        <button type="button" className={styles.tagsBtn} aria-label={`Tags for ${task.title}`}
                onClick={(e) => onAddTags(task, e.currentTarget)}>
          {task.tags.length === 0 ? (
            <AddTagsLink />
          ) : (
            <>
              {/* The name sits in its own span so a long user-made tag ellipsises inside its chip instead of spilling the cell. */}
              {task.tags.slice(0, 2).map((g) => (
                <Tag key={g.id} appearance="outlined" className={styles.tagChip}><span className={styles.tagName}>{g.name}</span></Tag>
              ))}
              {task.tags.length > 2 ? <Tag appearance="outlined">{`+${task.tags.length - 2}`}</Tag> : null}
            </>
          )}
        </button>
      </div>

      {/* Row hover actions (frame 195 / 606:75167, REG-163): Edit + kebab, level-1 shadow, right 24. */}
      {renaming ? null : (
        <span className={styles.actions} data-open={menuOpen || undefined}>
          <span className={styles.actionsInner}>
          <span className={styles.float}>
            {/* rowEdit / rowKebab: the 36px controls take a ≥40 touch target below 768 (REG-273) — a transparent
                overlay, so the mock's pill is drawn exactly as it is on desktop. */}
            <Button variant="primary" appearance="outlined" className={styles.rowEdit} onPress={() => onEdit(task)} data-kb-open>Edit</Button>
          </span>
          <span className={styles.menuWrap}>
            <span className={styles.float}>
              <Tooltip label="More actions" disabled={menuOpen}>
                <IconButton icon="more_vert" label={`More actions for ${task.title}`} variant="primary" className={styles.rowKebab}
                            aria-haspopup="menu" aria-expanded={menuOpen} onClick={(e) => onMenuToggle(e.currentTarget)} />
              </Tooltip>
            </span>
            <Dropdown open={menuOpen} onClose={onMenuClose} align="right" side={menuSide} sheetTitle={task.title}>
              {/* "Mark as Completed" only — the mock has no reopen item, so it is hidden for completed tasks. */}
              {task.done ? null : <DropdownItem onSelect={pick('complete')}>Mark as Completed</DropdownItem>}
              <DropdownItem onSelect={pick('rename')}>Rename</DropdownItem>
              <DropdownItem onSelect={pick('template')}>Save as Template</DropdownItem>
              <DropdownItem onSelect={pick('duplicate')}>Duplicate</DropdownItem>
              <DropdownItem onSelect={pick('delete')}><span className={styles.danger}>Delete</span></DropdownItem>
            </Dropdown>
          </span>
          </span>
        </span>
      )}
    </div>
  )
}
