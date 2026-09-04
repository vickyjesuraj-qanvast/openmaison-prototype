'use client'

import { useId, useState, type ReactNode } from 'react'
import { Button, Tag as TagChip } from '@/components/ds'
import { Avatar } from '@/components/om/avatar'
import { DateField } from '@/components/om/date-field'
import { Drawer, DrawerAction, DrawerRule } from '@/components/om/drawer'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { Dropdown, DropdownItem } from '@/components/leads/dropdown'
import { FileTile } from '@/components/leads/move-stage/fields'
import { displayDate, inputDate, parseInputDate } from '@/lib/format'
import type { Member, Tag } from '@/lib/db/schema'
import type { TaskRow } from '@/lib/leads/tasks'
import { TagPicker } from './tag-picker'
import styles from './task-panel.module.css'

export type TaskPatch = { title?: string; description?: string; dueAt?: Date | null }
export type TaskPanelMenuAction = 'template' | 'delete'

/**
 * DS Text Area (64 / 112) with the Material label: rests inside while empty, floats to the top border on focus / value
 * (components/om/text-field behaviour on a textarea). Commits on blur — the panel has no Save button (902:27363).
 */
function AreaField({
  label, value, onChange, onCommit, height, resizable,
}: { label: string; value: string; onChange: (v: string) => void; onCommit: () => void; height: number; resizable?: boolean }) {
  const id = useId()
  const [focused, setFocused] = useState(false)
  const floated = focused || value !== ''
  return (
    <div className={styles.area} data-floated={floated || undefined} data-active={focused || undefined}>
      <textarea
        id={id} className={styles.areaControl} style={{ height, minHeight: height }} data-resize={resizable || undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => { setFocused(false); onCommit() }}
      />
      <label htmlFor={id} className={styles.areaLabel}>{label}</label>
    </div>
  )
}

/**
 * Task side panel (902:27363 — frames 53 · 54 · 59 · 63 · 160 · 190): a Drawer titled "Task" with comment · attach_file ·
 * more_vert head actions, the creator block, the three fields, then Members (REG-290) · Tags · Attachments between rules and a
 * sticky "Mark as Completed" footer. Spec: design-source/context/lead-tasks/03-panel-tags.txt.
 * Edits commit on blur (fields) or at once (date, tags, assignees) through the callbacks — the panel keeps no server state.
 */
export function TaskPanel({
  task, tags, onClose, onComments, onAttach, onMenu, onChange, onAssign, onTags, onManageTags, onToggleDone, onDetach,
  open = true, now, onCreateTag,
}: {
  task: TaskRow
  /** The studio's members (the assign popover is the host's; the panel shows task.assignees). */
  team: Member[]
  tags: Tag[]
  onClose: () => void
  onComments: () => void
  onAttach: () => void
  onMenu: (action: TaskPanelMenuAction) => void
  onChange: (patch: TaskPatch) => void
  onAssign: (anchor: HTMLElement) => void
  onTags: (tagIds: string[]) => void
  onManageTags: () => void
  onToggleDone: () => void
  onDetach: (fileId: string) => void
  /** Optional extras: mount state for the Drawer's slide (default open), the host's day-granular "now" for the date
   *  picker (never Date.now() in render), and the Add Tag field's "hit enter to add". */
  open?: boolean
  now?: number
  onCreateTag?: (name: string) => void
}) {
  // Day-granular "today" for the Material picker: the host's `now`, else one lazy read at mount (no Date.now() in render).
  const [mountedAt] = useState(() => new Date())
  const today = now !== undefined ? new Date(now) : mountedAt

  // Local drafts for the blur-committed fields, re-seeded whenever the task (or its saved text) changes — render-phase adjust pattern.
  const desc = task.description ?? ''
  const [seed, setSeed] = useState({ id: task.id, title: task.title, desc })
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(desc)
  if (seed.id !== task.id || seed.title !== task.title || seed.desc !== desc) {
    setSeed({ id: task.id, title: task.title, desc })
    setTitle(task.title)
    setDescription(desc)
  }
  const commitTitle = () => {
    const t = title.trim()
    if (!t) { setTitle(task.title); return }   // a task keeps its name — an emptied field falls back to the saved title
    if (t !== task.title) onChange({ title: t })
  }
  const commitDescription = () => {
    if (description !== desc) onChange({ description })
  }

  const [menuOpen, setMenuOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [addTagEl, setAddTagEl] = useState<HTMLElement | null>(null)   // the "+ Add Tag" trigger, exempt from the picker's outside-press (REG-153)

  const actions: ReactNode = (
    <>
      <DrawerAction icon="comment" label="Comments" onClick={onComments} />
      <DrawerAction icon="attach_file" label="Attach files" onClick={onAttach} />
      <span className={styles.menuHost}>
        <DrawerAction icon="more_vert" label="More" expanded={menuOpen} onClick={() => setMenuOpen((o) => !o)} />
        {/* Panel kebab (frame 160): 200-wide menu → "Save as Template" · "Delete" (red). One phrase everywhere (build plan). */}
        <Dropdown open={menuOpen} onClose={() => setMenuOpen(false)} align="right" width={200}>
          <DropdownItem onSelect={() => { setMenuOpen(false); onMenu('template') }}>Save as Template</DropdownItem>
          <DropdownItem onSelect={() => { setMenuOpen(false); onMenu('delete') }}><span className={styles.danger}>Delete</span></DropdownItem>
        </Dropdown>
      </span>
    </>
  )

  // Footer (956,68): Buttons Primary/36/Filled leading icon radio_button_unchecked "Mark as Completed", full width. The mock has no
  // done-state footer — the same button reads "Completed" with check_circle and pressing it reopens the task.
  const footer = (
    <Button className={styles.fullWidth}
            iconStart={<Icon name={task.done ? 'check_circle' : 'radio_button_unchecked'} size={20} fill={task.done} />}
            onPress={onToggleDone}>
      {task.done ? 'Completed' : 'Mark as Completed'}
    </Button>
  )

  return (
    <Drawer open={open} title="Task" actions={actions} footer={footer} onClose={onClose}>
      {/* KV block: Creator · Created on */}
      <dl className={styles.kv}>
        <dt className={styles.key}>Creator</dt>
        <dd className={styles.value}>
          {task.creator ? (
            <>
              {/* (REG-287) om/avatar ships 20 — the mock's "Generic 20" is the component's own size, not a resized 24. */}
              <Avatar name={task.creator.name} color={task.creator.color} size={20} tooltip={false} />
              <span>{task.creator.name}</span>
            </>
          ) : '—'}
        </dd>
        <dt className={styles.key}>Created on</dt>
        <dd className={styles.value}>{displayDate(task.createdAt)}</dd>
      </dl>

      {/* Fields: Task name (Text Area 64) · Due date (DateField, picker only — REG-119) · Description (Text Area 112) */}
      <div className={styles.fields}>
        <AreaField label="Task name" value={title} onChange={setTitle} onCommit={commitTitle} height={64} />
        <DateField label="Due date" today={today} value={task.dueAt ? inputDate(task.dueAt) : ''}
                   onChange={(v) => { const d = parseInputDate(v); if (d) onChange({ dueAt: d }) }} />
        <AreaField label="Description" value={description} onChange={setDescription} onCommit={commitDescription} height={112} resizable />
      </div>

      <DrawerRule />

      {/* Members (mock: Assignees): Avatar 36 per member + Icon Buttons Primary/36/Outlined person_add */}
      <section className={styles.section} aria-label="Members">
        <h3 className={styles.sectionTitle}>Members</h3>
        <div className={styles.avatarRow}>
          {task.assignees.map((m) => (
            /* (REG-287) om/avatar ships 36 — the mock's "Generic 36" is the component's own size, not a resized 40. */
            <Avatar key={m.id} name={m.name} color={m.color} size={36} />
          ))}
          {/* touchTarget: the 36px button takes a ≥40 target below 768 (REG-273), drawn unchanged. */}
          <Tooltip label="Assign members">
            <IconButton icon="person_add" label="Assign members" size={36} variant="primary" aria-haspopup="dialog"
                        className={styles.touchTarget} onClick={(e) => onAssign(e.currentTarget)} />
          </Tooltip>
        </div>
      </section>

      <DrawerRule />

      {/* Tags: head ("Tags" fills · "+ Add Tag" link) · chips box when set (frame 190) · the Add Tag dropdown under the head (frame 65) */}
      <section className={styles.section} aria-label="Tags">
        <div className={styles.head}>
          <h3 className={styles.sectionTitle}>Tags</h3>
          <button ref={setAddTagEl} type="button" className={styles.link} aria-haspopup="dialog" aria-expanded={pickerOpen}
                  onClick={() => setPickerOpen((o) => !o)}>
            <Icon name="add" size={20} />
            Add Tag
          </button>
          <TagPicker open={pickerOpen} tags={tags} value={task.tags.map((t) => t.id)} anchor={addTagEl}
                     onChange={onTags} onCreate={onCreateTag}
                     onManage={() => { setPickerOpen(false); onManageTags() }}
                     onClose={() => setPickerOpen(false)} />
        </div>
        {task.tags.length ? (
          <div className={styles.tagBox}>
            {task.tags.map((t) => <TagChip key={t.id} appearance="outlined">{t.name}</TagChip>)}
          </div>
        ) : null}
      </section>

      <DrawerRule />

      {/* Attachments: FileTile tiles (frame 59 / 190; tile size from 781:58405 — the spec is silent, REG-151) + Buttons Secondary/36/Outlined "Attach Files" */}
      <section className={styles.section} aria-label="Attachments">
        <h3 className={styles.sectionTitle}>Attachments</h3>
        {task.attachments.length ? (
          <div className={styles.tiles}>
            {/* These are real lead_files rows picked in the Attach files modal, so each tile shows that file's own
                thumbnail and kind — an image named Q-101 must not be drawn as the PDF the modal never showed. */}
            {task.attachments.map((f) => <FileTile key={f.id} name={f.name} thumb={f.thumb} kind={f.kind} onDelete={() => onDetach(f.id)} />)}
          </div>
        ) : null}
        <Button className={styles.fullWidth} variant="secondary" appearance="outlined" iconStart={<Icon name="attach_file" size={20} />} onPress={onAttach}>
          Attach Files
        </Button>
      </section>
    </Drawer>
  )
}
