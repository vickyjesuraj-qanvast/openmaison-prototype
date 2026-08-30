'use client'

import { useState, type KeyboardEvent } from 'react'
import { Button, Checkbox, Link, Tag } from '@/components/ds'
import { Dropdown, DropdownItem } from '@/components/leads/dropdown'
import { Avatar } from '@/components/om/avatar'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { useComingSoon } from '@/components/om/snackbar'
import { Tooltip } from '@/components/om/tooltip'
import { displayDate, isOverdue } from '@/lib/format'
import type { TaskRow } from '@/lib/leads/tasks'
import styles from './tasks-table.module.css'

export type TaskRowAction = 'complete' | 'rename' | 'template' | 'duplicate' | 'delete'

export type TasksTableProps = {
  tasks: TaskRow[]
  /** Clock captured by the caller (purity rule) — overdue = open + due before today. */
  now: number
  selected: Set<string>
  onSelect: (ids: Set<string>) => void
  /** Tasks nobody has opened yet (`seenAt === null`, REG-131 for tasks): primary band + bold title. */
  unseen: Set<string>
  /** Inline add row (frame 194) at the top of the table. */
  adding: boolean
  onAddSubmit: (title: string) => void
  onAddCancel: () => void
  /** Row being renamed — the same field treatment on that row, pre-filled with the title. */
  renaming: string | null
  onRenameSubmit: (id: string, title: string) => void
  onRenameCancel: () => void
  onOpen: (task: TaskRow, anchor: HTMLElement) => void
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
const HEADS: { key: string; label: string; col: string | undefined; sortable: boolean }[] = [
  { key: 'title', label: 'Title', col: styles.colTitle, sortable: true },
  { key: 'assignees', label: 'Assignees', col: styles.colMember, sortable: true },
  { key: 'due', label: 'Due date', col: styles.colDue, sortable: true },
  { key: 'status', label: 'Status', col: styles.colStatus, sortable: true },
  { key: 'tags', label: 'Tags', col: styles.colTags, sortable: false },
]

/**
 * Lead Details › Tasks table (902:26387) — specs 01-listing-table.txt + 02-rows-menus-bulk.txt.
 * Head 56 · rows 48 · bottom bar 53; columns 56 · 582 · 160 · 137 · 118 · 191 (Title fills).
 * Every icon-only control carries a Tooltip; sorting is inert (coming soon); menus toggle on their own trigger.
 */
export function TasksTable({
  tasks, now, selected, onSelect, unseen,
  adding, onAddSubmit, onAddCancel,
  renaming, onRenameSubmit, onRenameCancel,
  onOpen, onToggleDone, onAssign, onDue, onAddTags, onRowMenu, onEdit, onAddClick,
}: TasksTableProps) {
  const comingSoon = useComingSoon()
  const [menuRow, setMenuRow] = useState<string | null>(null)

  const allSelected = tasks.length > 0 && tasks.every((t) => selected.has(t.id))
  const toggleAll = () => onSelect(allSelected ? new Set() : new Set(tasks.map((t) => t.id)))
  const toggleOne = (id: string) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id); else next.add(id)
    onSelect(next)
  }

  return (
    <div className={styles.card} role="table" aria-label="Tasks">
      {/* Head row — selection head = a real select-all checkbox (check_box_outline_blank 24/Light in the mock). */}
      <div className={styles.head} role="row">
        <div className={`${styles.hCell} ${styles.colSel}`} role="columnheader">
          <Checkbox isSelected={allSelected} isDisabled={tasks.length === 0} onChange={toggleAll} aria-label="Select all tasks" />
        </div>
        {HEADS.map((h) => (
          <div key={h.key} className={`${styles.hCell} ${h.col ?? ""}`} role="columnheader">
            {h.sortable ? (
              /* Sort is inert in this prototype — the head answers coming soon. */
              <button type="button" className={styles.hSort} onClick={comingSoon}>
                <span className={styles.hLabel}>{h.label}</span>
                <Icon name="unfold_more" size={16} />
              </button>
            ) : (
              <span className={styles.hLabel}>{h.label}</span>
            )}
          </div>
        ))}
      </div>

      {adding ? (
        <AddRow key="new" onSubmit={onAddSubmit} onCancel={onAddCancel} />
      ) : null}

      {tasks.map((task, idx) => (
        <TaskRowView
          key={task.id}
          task={task}
          now={now}
          unseen={unseen.has(task.id)}
          selected={selected.has(task.id)}
          onToggleSelect={() => toggleOne(task.id)}
          renaming={renaming === task.id}
          onRenameSubmit={(title) => onRenameSubmit(task.id, title)}
          onRenameCancel={onRenameCancel}
          menuOpen={menuRow === task.id}
          onMenuToggle={() => setMenuRow((m) => (m === task.id ? null : task.id))}
          onMenuClose={() => setMenuRow(null)}
          /* Kebab flips up on the last two rows of a 3+ row table — the leads table's rule. */
          menuSide={tasks.length >= 3 && idx >= tasks.length - 2 ? 'up' : 'down'}
          onOpen={onOpen} onToggleDone={onToggleDone} onAssign={onAssign} onDue={onDue} onAddTags={onAddTags}
          onRowMenu={onRowMenu} onEdit={onEdit}
        />
      ))}

      {/* Bottom bar 902:26450 — Link text Primary leading icon add "Add Task". */}
      <div className={styles.foot}>
        <Link variant="primary" iconStart={<Icon name="add" size={20} />} onPress={() => onAddClick?.()}>
          Add Task
        </Link>
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------------------------------------- */

/** The title cell as the active field (frame 194): bare input + ✕ (secondary outlined 24) + ✓ (primary filled 24). */
function TitleField({ initial, onSubmit, onCancel }: { initial: string; onSubmit: (title: string) => void; onCancel: () => void }) {
  const [value, setValue] = useState(initial)
  const submit = () => {
    const title = value.trim()
    if (!title) onCancel(); else onSubmit(title)   // empty title = cancel
  }
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); submit() }
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onCancel() }
  }
  return (
    <>
      <input
        className={styles.editInput}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        autoFocus
        aria-label="Task title"
      />
      <span className={styles.editActions}>
        <Tooltip label="Cancel">
          <IconButton icon="close" label="Cancel" size={24} onClick={onCancel} />
        </Tooltip>
        <Tooltip label="Save">
          <IconButton icon="done" label="Save" size={24} variant="primary" className={styles.doneFilled} onClick={submit} />
        </Tooltip>
      </span>
    </>
  )
}

/** Avatar Generic 24 placeholder (#cccccc) — om/avatar has no placeholder mode, so it is drawn here. */
function GhostAvatar() {
  return (
    <span className={styles.ghostAvatar} aria-hidden>
      <Icon name="person" size={16} fill />
    </span>
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
function AddRow({ onSubmit, onCancel }: { onSubmit: (title: string) => void; onCancel: () => void }) {
  return (
    <div className={styles.row} role="row" data-unseen="">
      <div className={`${styles.cell} ${styles.colSel}`} role="cell">
        <Checkbox isSelected={false} isDisabled aria-label="Select new task" />
      </div>
      <div className={`${styles.cell} ${styles.colTitle}`} role="cell" data-editing="">
        <TitleField initial="" onSubmit={onSubmit} onCancel={onCancel} />
      </div>
      <div className={`${styles.cell} ${styles.colMember}`} role="cell">
        <GhostAvatar />
        <IconButton icon="person_add" label="Assign members" size={24} variant="primary" className={styles.inert} tabIndex={-1} aria-disabled />
      </div>
      <div className={`${styles.cell} ${styles.colDue}`} role="cell">
        <IconButton icon="calendar_add_on" label="Set due date" size={24} variant="primary" className={styles.inert} tabIndex={-1} aria-disabled />
      </div>
      <div className={`${styles.cell} ${styles.colStatus}`} role="cell">
        <Tag appearance="outlined" color="blue">OPEN</Tag>
      </div>
      <div className={`${styles.cell} ${styles.colTags}`} role="cell">
        <AddTagsLink inert />
      </div>
    </div>
  )
}

function TaskRowView({
  task, now, unseen, selected, onToggleSelect,
  renaming, onRenameSubmit, onRenameCancel,
  menuOpen, onMenuToggle, onMenuClose, menuSide,
  onOpen, onToggleDone, onAssign, onDue, onAddTags, onRowMenu, onEdit,
}: {
  task: TaskRow
  now: number
  unseen: boolean
  selected: boolean
  onToggleSelect: () => void
  renaming: boolean
  onRenameSubmit: (title: string) => void
  onRenameCancel: () => void
  menuOpen: boolean
  onMenuToggle: () => void
  onMenuClose: () => void
  menuSide: 'up' | 'down'
  onOpen: (task: TaskRow, anchor: HTMLElement) => void
  onToggleDone: (task: TaskRow) => void
  onAssign: (task: TaskRow, anchor: HTMLElement) => void
  onDue: (task: TaskRow, anchor: HTMLElement) => void
  onAddTags: (task: TaskRow, anchor: HTMLElement) => void
  onRowMenu: (task: TaskRow, action: TaskRowAction) => void
  onEdit: (task: TaskRow) => void
}) {
  const overdue = !task.done && isOverdue(task.dueAt, now)
  const inert = renaming ? '' : undefined
  const pick = (action: TaskRowAction) => () => { onMenuClose(); onRowMenu(task, action) }

  return (
    <div className={styles.row} role="row" data-unseen={unseen ? '' : undefined} data-selected={selected ? '' : undefined}>
      {/* Selection cell: checkbox 24/Light secondary → check_box 24 primary when selected. */}
      <div className={`${styles.cell} ${styles.colSel}`} role="cell">
        <Checkbox isSelected={selected} onChange={onToggleSelect} aria-label={`Select ${task.title}`} />
      </div>

      {/* Title cell — status glyph · title (bold when unseen) · count chips; the rest of the cell opens the task. */}
      {renaming ? (
        <div className={`${styles.cell} ${styles.colTitle}`} role="cell" data-editing="">
          <TitleField initial={task.title} onSubmit={onRenameSubmit} onCancel={onRenameCancel} />
        </div>
      ) : (
        <div className={`${styles.cell} ${styles.colTitle}`} role="cell">
          <Tooltip label={task.done ? 'Reopen' : 'Mark as completed'}>
            <button
              type="button" className={styles.glyph} data-done={task.done || undefined}
              aria-label={task.done ? `Reopen ${task.title}` : `Mark ${task.title} as completed`}
              aria-pressed={task.done}
              onClick={() => onToggleDone(task)}
            >
              <Icon name={task.done ? 'check_circle' : 'radio_button_unchecked'} size={24} weight={300} />
            </button>
          </Tooltip>
          {/* Nested buttons aren't allowed, so the glyph sits beside this button; the anchor handed up is the cell itself. */}
          <button type="button" className={styles.titleBtn} onClick={(e) => onOpen(task, e.currentTarget.parentElement as HTMLElement)}>
            <span className={styles.title} data-unseen={unseen ? '' : undefined}>{task.title}</span>
            {task.comments.length > 0 || task.attachments.length > 0 ? (
              <span className={styles.chips}>
                {task.comments.length > 0 ? (
                  <span className={styles.chip} aria-label={`${task.comments.length} comments`}>
                    <Icon name="comment" size={16} weight={300} />
                    {task.comments.length}
                  </span>
                ) : null}
                {task.attachments.length > 0 ? (
                  <span className={styles.chip} aria-label={`${task.attachments.length} attachments`}>
                    <Icon name="attach_file" size={16} weight={300} />
                    {task.attachments.length}
                  </span>
                ) : null}
              </span>
            ) : null}
          </button>
        </div>
      )}

      {/* Member cell: up to two Avatars 24 (placeholder when unassigned) + person_add 24 primary outlined. */}
      <div className={`${styles.cell} ${styles.colMember}`} role="cell" data-inert={inert}>
        {task.assignees.length === 0 ? (
          <GhostAvatar />
        ) : (
          <span className={styles.memberStack}>
            {task.assignees.slice(0, 2).map((m) => <Avatar key={m.id} name={m.name} color={m.color} size={24} />)}
            {task.assignees.length > 2 ? <span className={styles.plusBox}>+{task.assignees.length - 2}</span> : null}
          </span>
        )}
        <Tooltip label="Assign members">
          <IconButton icon="person_add" label={`Assign members to ${task.title}`} size={24} variant="primary"
                      onClick={(e) => onAssign(task, e.currentTarget)} />
        </Tooltip>
      </div>

      {/* Due cell: calendar_add_on 24 primary outlined when empty; the date (underlined, red when overdue) otherwise. */}
      <div className={`${styles.cell} ${styles.colDue}`} role="cell" data-inert={inert}>
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
      <div className={`${styles.cell} ${styles.colStatus}`} role="cell">
        {task.done
          ? <Tag appearance="outlined" color="green">COMPLETED</Tag>
          : <Tag appearance="outlined" color="blue">OPEN</Tag>}
      </div>

      {/* Tags cell: two Tag Outlined Default + "+n", or the "+ Add Tags" link; the whole cell opens the picker. */}
      <div className={`${styles.cell} ${styles.colTags}`} role="cell" data-inert={inert}>
        <button type="button" className={styles.tagsBtn} aria-label={`Tags for ${task.title}`}
                onClick={(e) => onAddTags(task, e.currentTarget)}>
          {task.tags.length === 0 ? (
            <AddTagsLink />
          ) : (
            <>
              {task.tags.slice(0, 2).map((g) => <Tag key={g.id} appearance="outlined">{g.name}</Tag>)}
              {task.tags.length > 2 ? <Tag appearance="outlined">{`+${task.tags.length - 2}`}</Tag> : null}
            </>
          )}
        </button>
      </div>

      {/* Row hover actions (frame 195 / 606:75167, REG-163): Edit + kebab, level-1 shadow, right 24. */}
      {renaming ? null : (
        <span className={styles.actions} data-open={menuOpen || undefined}>
          <span className={styles.float}>
            <Button variant="primary" appearance="outlined" onPress={() => onEdit(task)}>Edit</Button>
          </span>
          <span className={styles.menuWrap}>
            <span className={styles.float}>
              <Tooltip label="More actions" disabled={menuOpen}>
                <IconButton icon="more_vert" label={`More actions for ${task.title}`} variant="primary"
                            aria-haspopup="menu" aria-expanded={menuOpen} onClick={onMenuToggle} />
              </Tooltip>
            </span>
            <Dropdown open={menuOpen} onClose={onMenuClose} align="right" side={menuSide}>
              {/* "Mark as Completed" only — the mock has no reopen item, so it is hidden for completed tasks. */}
              {task.done ? null : <DropdownItem onSelect={pick('complete')}>Mark as Completed</DropdownItem>}
              <DropdownItem onSelect={pick('rename')}>Rename</DropdownItem>
              <DropdownItem onSelect={pick('template')}>Save as Template</DropdownItem>
              <DropdownItem onSelect={pick('duplicate')}>Duplicate</DropdownItem>
              <DropdownItem onSelect={pick('delete')}><span className={styles.danger}>Delete</span></DropdownItem>
            </Dropdown>
          </span>
        </span>
      )}
    </div>
  )
}
