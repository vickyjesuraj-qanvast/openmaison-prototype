'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Button, Tag as TagChip, TextArea } from '@/components/ds'
import { Avatar } from '@/components/om/avatar'
import { DateTimeField } from '@/components/om/date-field'
import { TextField } from '@/components/om/text-field'
import { Drawer, DrawerAction, DrawerRule } from '@/components/om/drawer'
import { Icon } from '@/components/om/icon'
import NextLink from 'next/link'
import { withFrom } from '@/lib/nav'
import type { TaskLead } from '@/lib/leads/tasks'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { Dropdown, DropdownItem, MENU_WIDTH } from '@/components/leads/dropdown'
import { FileTile } from '@/components/leads/move-stage/fields'
import { displayDate, displayDue, formatInputDateTime, parseInputDateTime } from '@/lib/format'
import type { Member, Tag } from '@/lib/db/schema'
import type { TaskRow } from '@/lib/leads/tasks'
import { TagPicker } from './tag-picker'
import { DuePresetChips } from './due-presets'
import { OutsideBadge, OutsideSection } from './outside-person'   // (gaps build, package C — M-03)
import { outsideOf } from '@/lib/leads/outside'
import { taskLinkOf } from '@/lib/leads/task-links'   // (parity map, TD-019)
import styles from './task-panel.module.css'

/** (fix-A, A-17) The panel's Milestone select's first row — the table's cell says the same. */
const NO_MILESTONE = 'In no milestone'

export type TaskPatch = { title?: string; description?: string; dueAt?: Date | null }
export type TaskPanelMenuAction = 'template' | 'delete'

/**
 * Task side panel (902:27363 — frames 53 · 54 · 59 · 63 · 160 · 190): a Drawer titled "Task" with comment · attach_file ·
 * more_vert head actions, the creator block, the three fields, then Members (REG-290) · Tags · Attachments between rules and a
 * sticky "Mark as Completed" footer. Spec: design-source/context/lead-tasks/03-panel-tags.txt.
 * Edits commit on blur (fields) or at once (date, tags, assignees) through the callbacks — the panel keeps no server state.
 */
export function TaskPanel({
  task, tags, onClose, onComments, onAttach, onMenu, onChange, onAssign, onTags, onManageTags, onToggleDone, onDetach,
  open = true, now, onCreateTag, lead, focusName = 0,
  onOpenInTasks, milestones, outside, compact = false,
}: {
  task: TaskRow
  /** The studio's members (the assign popover is the host's; the panel shows task.assignees). */
  team: Member[]
  tags: Tag[]
  onClose: () => void
  /** The rail's Tasks page (REG-466): the task's lead as the first row — a link to its Tasks tab, or "Studio"; omitted on a lead's own tab. */
  lead?: TaskLead | null
  onComments: () => void
  onAttach: () => void
  onMenu: (action: TaskPanelMenuAction) => void
  /** A save; it may answer whether it landed (`run`'s boolean) — a refused due date then goes back to the saved one. */
  onChange: (patch: TaskPatch) => void | Promise<boolean>
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
  /** (UX audit 2026-09-30, T6) Bumped by a double-click on the row's title: the Task name takes the caret with its text selected — rename here. */
  focusName?: number
  /** (Dane's UAT 5.05) Opened over the lead's Overview: the head's arrow goes to the full Tasks tab with this task open. */
  onOpenInTasks?: () => void
  /** (fix-A, A-17) A project's task: the milestone it sits in, picked here as in the table's cell (the only way on a phone). */
  milestones?: { options: { id: string; title: string }[]; onPick: (milestoneId: string | null) => void }
  /** (gaps build, package C — M-03) Someone outside the studio on it: add, edit, take off, send on WhatsApp — the host's dialog and actions. */
  outside?: { onAdd: () => void; onEdit: () => void; onSend: () => void; onRemove: () => void }
  /** (Leads on the move, L4 — P-10 · C-24) A phone or a touch tablet: the panel opens on the task — its name at 16, When with the due presets
      (one date, no second line), Who — then the description, the outside person, tags and attachments; who made it and when is one line at
      the end. The desk keeps the mock's order (902:27363). */
  compact?: boolean
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

  /* (Dane UAT 5.05) Due is a date AND a time — the field "Set a follow-up" writes (REG-608), so a follow-up at 10:00 AM can be moved
     here without losing its hour: the picker keeps the time when only the day changes, and the time row changes it. Each pick saves at
     once, as the date did; the field shows the pick until the saved task catches up (a quick hour-then-minute must not read a stale
     day), and a refused save puts the saved value back. The weekday form under it is how every list prints the due (UAT 5.13). */
  const savedDue = task.dueAt ? formatInputDateTime(task.dueAt) : ''
  const [dueDraft, setDueDraft] = useState<{ id: string; value: string } | null>(null)
  if (dueDraft && (dueDraft.id !== task.id || dueDraft.value === savedDue)) setDueDraft(null)   // another task, or the save landed
  const dueValue = dueDraft && dueDraft.id === task.id ? dueDraft.value : savedDue
  const dueShown = parseInputDateTime(dueValue)
  const changeDue = (v: string) => {
    const d = parseInputDateTime(v)
    if (!d || v === dueValue) return
    setDueDraft({ id: task.id, value: v })
    const saved = onChange({ dueAt: d })
    if (saved) void saved.then((ok) => { if (!ok) setDueDraft((cur) => (cur && cur.value === v ? null : cur)) })
  }

  const nameBox = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!focusName) return
    const el = nameBox.current?.querySelector('textarea')
    if (el) { el.focus(); el.select() }
  }, [focusName])

  const [menuOpen, setMenuOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [addTagEl, setAddTagEl] = useState<HTMLElement | null>(null)   // the "+ Add Tag" trigger, exempt from the picker's outside-press (REG-153)

  const actions: ReactNode = (
    <>
      {onOpenInTasks ? <DrawerAction icon="arrow_outward" label="Open in Tasks" onClick={onOpenInTasks} /> : null}
      {/* (UX audit 2026-09-30, T8) the comment icon carries its count, as the row's comment chip does */}
      <span className={styles.countHost}>
        <DrawerAction icon="comment" label={task.comments.length ? `Comments (${task.comments.length})` : 'Comments'} onClick={onComments} />
        {task.comments.length ? <span className={styles.count} aria-hidden data-testid="panel-comment-count">{task.comments.length}</span> : null}
      </span>
      <DrawerAction icon="attach_file" label="Attach files" onClick={onAttach} />
      <span className={styles.menuHost}>
        <DrawerAction icon="more_vert" label="More" expanded={menuOpen} onClick={() => setMenuOpen((o) => !o)} />
        {/* Panel kebab (frame 160): 200-wide menu → "Save as Template" · "Delete" (red). One phrase everywhere (build plan). */}
        <Dropdown open={menuOpen} onClose={() => setMenuOpen(false)} align="right" width={MENU_WIDTH.standard} sheetTitle="Task">
          <DropdownItem onSelect={() => { setMenuOpen(false); onMenu('template') }}>Save as Template</DropdownItem>
          <DropdownItem tone="danger" onSelect={() => { setMenuOpen(false); onMenu('delete') }}>Delete</DropdownItem>   {/* (REG-728) the row's own tone */}
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

  /* ── the panel's blocks, shared by the desk's order and the touch order (L4 — C-24) ── */
  const kv = (
      <dl className={styles.kv}>
        {lead !== undefined ? (
          <>
            <dt className={styles.key}>Lead</dt>
            <dd className={styles.value}>{lead ? <NextLink href={withFrom(lead.project ? `/projects/${lead.project.id}/tasks` : `/leads/${lead.id}/tasks`, '/tasks')} className={styles.leadLink}>{lead.project ? `${lead.name} · ${lead.project.number}` : lead.name}</NextLink> : 'Studio'}</dd>   {/* (fix-A, A-20) */}
          </>
        ) : null}
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
  )
  const nameField = <div ref={nameBox}><TextArea label="Task name" value={title} onChange={setTitle} onBlur={commitTitle} className={styles.nameArea} /></div>
  const milestoneField = milestones ? (
          /* (fix-A, A-17) the house select: "In no milestone" first, then the project's milestones in their order */
          <div data-testid="panel-milestone">
            <TextField label="Milestone" mode="select" value={milestones.options.find((m) => m.id === task.milestoneId)?.title ?? NO_MILESTONE}
                       options={[NO_MILESTONE, ...milestones.options.map((m) => m.title)]}
                       onChange={(v) => { const id = milestones.options.find((m) => m.title === v)?.id ?? null; if (id !== (task.milestoneId ?? null)) milestones.onPick(id) }} />
          </div>
        ) : null
  const descriptionField = <TextArea label="Description" value={description} onChange={setDescription} onBlur={commitDescription} />
  /* (parity map, TD-019) a task that leads somewhere — the ask to add someone opens Members' Add member, filled */
  const taskLink = (() => { const to = taskLinkOf({ title: task.title, leadId: task.leadId ?? null, description: task.description ?? null }); return to ? <NextLink href={to.href} className={styles.leadLink} data-testid="task-link">{to.label}</NextLink> : null })()
  /* Members (mock: Assignees): Avatar 36 per member + Icon Buttons Primary/36/Outlined person_add */
  const membersBlock = (
      <section className={styles.section} aria-label="Members">
        <h3 className={styles.sectionTitle}>Members</h3>
        <div className={styles.avatarRow}>
          {task.assignees.map((m) => (
            /* (REG-287) om/avatar ships 36 — the mock's "Generic 36" is the component's own size, not a resized 40. */
            <Avatar key={m.id} name={m.name} color={m.color} size={36} />
          ))}
          {/* (gaps build, package C — M-03) the outside person stands with the members, their section below says who */}
          {outsideOf(task) ? <OutsideBadge o={outsideOf(task)!} size={36} /> : null}
          {/* (Leads on the move, L4 — C-02) on a finger the house IconButton's own centred 44 box is the target — the overlay that sat here
              moved it 22px up and left */}
          <Tooltip label="Assign members">
            <IconButton icon="person_add" label="Assign members" size={36} variant="primary" aria-haspopup="dialog"
                        onClick={(e) => onAssign(e.currentTarget)} />
          </Tooltip>
        </div>
      </section>
  )
  const outsideBlock = outside ? (
        <>
          <DrawerRule />
          <OutsideSection o={outsideOf(task)} onAdd={outside.onAdd} onEdit={outside.onEdit} onSend={outside.onSend} onRemove={outside.onRemove} />
        </>
      ) : null
  /* Tags: head ("Tags" fills · "+ Add Tag" link) · chips box when set (frame 190) · the Add Tag dropdown under the head (frame 65) */
  const tagsBlock = (
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
  )
  /* Attachments: FileTile tiles (frame 59 / 190; tile size from 781:58405 — the spec is silent, REG-151) + Buttons Secondary/36/Outlined "Attach Files" */
  const attachmentsBlock = (
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
  )

  if (compact) {
    /* (Leads on the move, L4 — C-24) the touch order: the task first — name, When with its presets, Who — then the rest; who made it last */
    return (
      <Drawer open={open} title="Task" actions={actions} footer={footer} onClose={onClose}>
        {lead !== undefined ? (
          <p className={styles.forLine} data-testid="panel-for">{lead ? <NextLink href={withFrom(lead.project ? `/projects/${lead.project.id}/tasks` : `/leads/${lead.id}/tasks`, '/tasks')} className={styles.leadLink}>{lead.project ? `${lead.name} · ${lead.project.number}` : lead.name}</NextLink> : 'Studio task'}</p>
        ) : null}
        <div className={styles.fields} data-compact="">
          {nameField}
          <div className={styles.when} data-testid="panel-when">
            <DateTimeField label="Due date" today={today} value={dueValue} onChange={changeDue} />
            <DuePresetChips value={dueShown} now={today.getTime()} label="Due date presets" testId="panel-due-presets"
                            onChange={(d) => { if (d) changeDue(formatInputDateTime(d)); else if (task.dueAt) void onChange({ dueAt: null }) }} />
          </div>
          {membersBlock}
          {descriptionField}
          {milestoneField}
          {taskLink}
        </div>
        {outsideBlock}
        <DrawerRule />
        {tagsBlock}
        <DrawerRule />
        {attachmentsBlock}
        <p className={styles.madeBy} data-testid="panel-made-by">{task.creator ? `Created by ${task.creator.name} · ${displayDate(task.createdAt)}` : `Created ${displayDate(task.createdAt)}`}</p>
      </Drawer>
    )
  }
  return (
    <Drawer open={open} title="Task" actions={actions} footer={footer} onClose={onClose}>
      {/* KV block: Creator · Created on */}
      {kv}

      {/* Fields: Task name (Text Area 64) · Due date (DateTimeField, picker only — REG-119; a time since Dane UAT 5.05) · Description (Text Area 112).
          (REG-729) The DS TextArea with its own label — rests inside while empty, floats to the top border on focus or a value — where a
          local copy of that behaviour stood. Commits on blur: the panel has no Save button (902:27363). */}
      <div className={styles.fields}>
        {nameField}
        <DateTimeField label="Due date" today={today} value={dueValue} onChange={changeDue} helper={dueShown ? displayDue(dueShown) : undefined} />
        {milestoneField}
        {descriptionField}
        {taskLink}
      </div>

      <DrawerRule />

      {membersBlock}

      {outsideBlock}

      <DrawerRule />

      {tagsBlock}

      <DrawerRule />

      {attachmentsBlock}
    </Drawer>
  )
}
