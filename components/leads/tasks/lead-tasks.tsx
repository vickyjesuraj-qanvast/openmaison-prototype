'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { AssignPopover } from '@/components/leads/assign-popover'
import { DatePicker } from '@/components/om/date-picker'
import { useComingSoon, useSnackbar } from '@/components/om/snackbar'
import { ExportDialog } from '@/components/leads/export-dialog'
import { TasksTable } from './tasks-table'
import { TasksToolbar } from './tasks-toolbar'
import { TasksEmpty } from './tasks-empty'
import { TabSearchEmpty } from './tab-search-empty'
import { DetailBulkBar } from './detail-bulk-bar'
import { TaskPanel } from './task-panel'
import { TagPicker } from './tag-picker'
import { ManageTagsDialog } from './manage-tags-dialog'
import { CommentsPanel } from './comments-panel'
import { AttachFilesModal } from './attach-files-modal'
import { TasksFiltersModal } from './tasks-filters-modal'
import { ChooseTemplateDialog, SaveTemplateDialog } from './template-dialogs'
import { DeleteTasksDialog } from './delete-dialog'
import { useRun } from './use-run'
import { CREATE_EVENTS, useCreateIntent } from './use-create-intent'
import { EMPTY_TASK_FILTERS, activeTaskFilterCount, applyTaskFilters, type TaskFilters } from '@/lib/leads/task-filters'
import type { LeadTasksData, TaskRow } from '@/lib/leads/tasks'
import {
  addComment, applyTemplate, attachFiles, createTag, createTask, deleteComment, deleteTag, deleteTasks, detachFile, duplicateTasks,
  editComment, markTaskSeen, renameTag, saveTemplate, setTaskAssignees, setTaskTags, updateTask,
} from '@/app/leads/tasks-actions'
import { downloadTasks } from '@/lib/leads/export'
import styles from './lead-tasks.module.css'

type Anchored = { el: HTMLElement; top: number; left: number } | null
const anchorRect = (el: HTMLElement) => { const r = el.getBoundingClientRect(); return { el, top: Math.min(r.bottom + 4, window.innerHeight - 460), left: Math.min(r.left, window.innerWidth - 420) } }
const offscreen = (el: HTMLElement) => { const r = el.getBoundingClientRect(); return r.bottom < 0 || r.top > window.innerHeight }

/** tasks-actions that only `revalidatePath('/leads')` (tags, templates) — the tab must refresh itself after them (use-run.ts). */
const REFRESH = { refresh: true } as const

/**
 * Lead Details › Tasks (902-36216): the tab's state — table, inline add / rename, selection + bulk bar, the task / comments
 * panels, tags, attachments, filters, templates, export and delete. Every rule the listing settled applies (menus toggle,
 * tooltips, coming-soon on inert affordances, picker-only dates, unseen band). Specs: design-source/context/lead-tasks/.
 */
export function LeadTasks({ leadId, data }: { leadId: string; data: LeadTasksData }) {
  const { tasks, tags, files, templates, team, now } = data
  const snackbar = useSnackbar()
  const comingSoon = useComingSoon()
  const { run } = useRun()
  const me = team.find((m) => m.isYou) ?? team[0]!

  /* ── list state ── */
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<TaskFilters>(EMPTY_TASK_FILTERS)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [adding, setAdding] = useState(false)
  const [renaming, setRenaming] = useState<string | null>(null)
  const [seenLocally, setSeenLocally] = useState<Set<string>>(() => new Set())
  const unseen = useMemo(() => new Set(tasks.filter((t) => t.seenAt === null && !seenLocally.has(t.id)).map((t) => t.id)), [tasks, seenLocally])
  const filterCount = activeTaskFilterCount(filters)
  const visible = useMemo(() => {
    const base = applyTaskFilters(tasks, filters, now)
    const q = query.trim().toLowerCase()
    return q ? base.filter((t) => t.title.toLowerCase().includes(q) || t.tags.some((g) => g.name.toLowerCase().includes(q))) : base
  }, [tasks, filters, query, now])
  // Search / filters that match nothing → the listing's "No results found" card (T6); the bare head never shows.
  const nothingMatches = tasks.length > 0 && visible.length === 0 && (query.trim() !== '' || filterCount > 0)
  // Selection follows the visible set (render-phase adjust).
  const visibleIds = useMemo(() => new Set(visible.map((t) => t.id)), [visible])
  if ([...selected].some((id) => !visibleIds.has(id))) setSelected(new Set([...selected].filter((id) => visibleIds.has(id))))

  /* ── panels + overlays ── */
  const params = useSearchParams()
  const [openId, setOpenId] = useState<string | null>(() => params.get('open'))   // Overview › My work chevron lands on the task panel
  const [panelView, setPanelView] = useState<'task' | 'comments'>('task')
  const openTask = tasks.find((t) => t.id === openId) ?? null
  if (openId && !openTask) setOpenId(null)   // deleted under an open panel
  const [assign, setAssign] = useState<(Anchored & { taskId: string }) | null>(null)
  const [tagsFor, setTagsFor] = useState<(Anchored & { taskId: string }) | null>(null)
  const [dueFor, setDueFor] = useState<{ taskId: string; el: HTMLElement } | null>(null)
  const dueAnchor = useRef<HTMLElement | null>(null)
  const [manageTags, setManageTags] = useState(false)
  const [attachFor, setAttachFor] = useState<string | null>(null)
  const [chooseTemplate, setChooseTemplate] = useState(false)
  const [saveTemplateFor, setSaveTemplateFor] = useState<string[] | null>(null)
  const [deleting, setDeleting] = useState<{ ids: string[]; all: boolean } | null>(null)
  const [exportOpen, setExportOpen] = useState(false)

  const startAdd = () => { setRenaming(null); setAdding(true) }
  // Create quick links › Task (858:26317) starts the inline add row on this tab.
  useCreateIntent({ event: CREATE_EVENTS.tasks, onIntent: startAdd })
  // Anchored popovers follow their trigger while the page scrolls and close once it leaves the viewport (REG-129).
  const anyAnchored = !!(assign || tagsFor)
  useEffect(() => {
    if (!anyAnchored) return
    const follow = () => {
      setAssign((s) => (s ? (offscreen(s.el) ? null : { ...s, ...anchorRect(s.el) }) : s))
      setTagsFor((s) => (s ? (offscreen(s.el) ? null : { ...s, ...anchorRect(s.el) }) : s))
    }
    document.addEventListener('scroll', follow, true)
    window.addEventListener('resize', follow)
    return () => { document.removeEventListener('scroll', follow, true); window.removeEventListener('resize', follow) }
  }, [anyAnchored])

  const open = (task: TaskRow) => {
    if (unseen.has(task.id)) { setSeenLocally((s) => new Set(s).add(task.id)); void markTaskSeen(task.id) }
    setPanelView('task'); setOpenId(task.id)
  }
  // One flip per task at a time — a double click cannot toggle it twice (RACE-05).
  const toggleDone = (task: TaskRow) => run(task.done ? 'reopen the task' : 'complete the task', () => updateTask(task.id, { done: !task.done }), task.done ? undefined : 'Task completed', { guard: `done:${task.id}` })
  const openAssign = (task: TaskRow, anchor: HTMLElement) => setAssign((a) => (a?.el === anchor ? null : { taskId: task.id, ...anchorRect(anchor) }))
  const openTags = (task: TaskRow, anchor: HTMLElement) => setTagsFor((a) => (a?.el === anchor ? null : { taskId: task.id, ...anchorRect(anchor) }))
  const openDue = (task: TaskRow, anchor: HTMLElement) => { dueAnchor.current = anchor; setDueFor((d) => (d?.el === anchor ? null : { taskId: task.id, el: anchor })) }
  const rowMenu = (task: TaskRow, action: 'complete' | 'rename' | 'template' | 'duplicate' | 'delete') => {
    if (action === 'complete') void toggleDone(task)
    if (action === 'rename') setRenaming(task.id)
    if (action === 'template') setSaveTemplateFor([task.id])
    if (action === 'duplicate') void run('duplicate the task', () => duplicateTasks([task.id]), 'Task duplicated')
    if (action === 'delete') setDeleting({ ids: [task.id], all: false })
  }
  /** Enter in a tag picker: create the tag, then tick it on the task (both entry points — the table cell and the panel, T5). */
  const createAndTag = (task: TaskRow | null, name: string) =>
    run('add the tag', async () => { const id = await createTag(name); if (task) await setTaskTags(task.id, [...task.tags.map((g) => g.id), id]) }, undefined, REFRESH)
  const selectedIds = [...selected]
  const assignTask = assign ? tasks.find((t) => t.id === assign.taskId) : null
  const tagsTask = tagsFor ? tasks.find((t) => t.id === tagsFor.taskId) : null
  const dueTask = dueFor ? tasks.find((t) => t.id === dueFor.taskId) : null
  const attachTask = attachFor ? tasks.find((t) => t.id === attachFor) : null
  // Bulk bar (902:26567 / frames 192 · 159): everything selected → the single "Delete All" action.
  const bulkActions = selected.size === visible.length
    ? [{ label: 'Delete All', tone: 'danger' as const, onClick: () => setDeleting({ ids: selectedIds, all: true }) }]
    : [
        { label: 'Save as Template', onClick: () => setSaveTemplateFor(selectedIds) },
        { label: 'Duplicate', onClick: () => { setSelected(new Set()); void run('duplicate the tasks', () => duplicateTasks(selectedIds), `${selectedIds.length} tasks duplicated`) } },
        { label: 'Delete', tone: 'danger' as const, onClick: () => setDeleting({ ids: selectedIds, all: false }) },
      ]

  return (
    <div className={styles.tab} data-open={openId ? '' : undefined}>
      <TasksToolbar
        query={query} onQuery={setQuery}
        onAdd={(kind) => (kind === 'new' ? startAdd() : setChooseTemplate(true))}
        onFilter={() => setFiltersOpen(true)} filterCount={filterCount}
        onMenu={(action) => {
          if (action === 'saveAll') setSaveTemplateFor(tasks.map((t) => t.id))
          if (action === 'manage') comingSoon()
          if (action === 'export') setExportOpen(true)
          if (action === 'deleteAll') setDeleting({ ids: tasks.map((t) => t.id), all: true })
        }}
      />
      {tasks.length === 0 && !adding ? (
        /* No tasks yet → the sibling tabs' empty card (T9); the inline add row takes over as soon as one starts. */
        <TasksEmpty onCreate={startAdd} onTemplate={() => setChooseTemplate(true)} />
      ) : nothingMatches && !adding ? (
        <TabSearchEmpty noun="tasks" searching={query.trim() !== ''} onClearAll={() => { setQuery(''); setFilters(EMPTY_TASK_FILTERS) }} />
      ) : (
        <TasksTable
          tasks={visible} now={now}
          selected={selected} onSelect={setSelected}
          unseen={unseen}
          adding={adding}
          onAddSubmit={(title) => { setAdding(false); if (title.trim()) void run('add the task', () => createTask(leadId, title.trim()), 'Task added') }}
          onAddCancel={() => setAdding(false)}
          onAddClick={startAdd}
          renaming={renaming}
          onRenameSubmit={(id, title) => { setRenaming(null); if (title.trim()) void run('rename the task', () => updateTask(id, { title: title.trim() })) }}
          onRenameCancel={() => setRenaming(null)}
          onOpen={(task) => open(task)}
          onToggleDone={(task) => { void toggleDone(task) }}
          onAssign={openAssign}
          onDue={openDue}
          onAddTags={openTags}
          onRowMenu={rowMenu}
          onEdit={(task) => open(task)}
        />
      )}
      {/* Always mounted: the bar animates its own exit (T8). */}
      <DetailBulkBar count={selected.size} actions={bulkActions} onClear={() => setSelected(new Set())} />

      {openTask && panelView === 'task' ? (
        <TaskPanel
          task={openTask} team={team} tags={tags} now={now}
          onClose={() => setOpenId(null)}
          onComments={() => setPanelView('comments')}
          onAttach={() => setAttachFor(openTask.id)}
          onMenu={(action) => (action === 'template' ? setSaveTemplateFor([openTask.id]) : setDeleting({ ids: [openTask.id], all: false }))}
          onChange={(patch) => { void run('save the task', () => updateTask(openTask.id, patch)) }}
          onAssign={(anchor) => openAssign(openTask, anchor)}
          onTags={(tagIds) => { void run('update the tags', () => setTaskTags(openTask.id, tagIds)) }}
          onCreateTag={(name) => { void createAndTag(openTask, name) }}
          onManageTags={() => setManageTags(true)}
          onToggleDone={() => { void toggleDone(openTask) }}
          onDetach={(fileId) => { void run('remove the file', () => detachFile(openTask.id, fileId)) }}
        />
      ) : null}
      {openTask && panelView === 'comments' ? (
        <CommentsPanel
          task={openTask} me={me} now={now}
          onBack={() => setPanelView('task')}
          onClose={() => { setOpenId(null); setPanelView('task') }}
          onAdd={(body) => { void run('post the comment', () => addComment(openTask.id, body)) }}
          onEdit={(id, body) => { void run('save the comment', () => editComment(id, body)) }}
          onDelete={(id) => { void run('delete the comment', () => deleteComment(id), 'Comment deleted') }}
        />
      ) : null}

      {/* Fixed popovers sit at the z-scale's 70; while the panel (Drawer, 100) is open they are raised above it — a popover
          opened from the panel's person_add, or from a table cell beside it, must never paint under the panel (T1). */}
      <div className={styles.popovers} data-raised={openId ? '' : undefined}>
        <AssignPopover
          open={!!assign}
          team={team}
          value={assignTask?.assignees.map((m) => m.id) ?? []}
          anchor={assign?.el}
          onClose={() => setAssign(null)}
          onApply={(memberIds) => { const t = assignTask; setAssign(null); if (t) void run('update the assignees', () => setTaskAssignees(t.id, memberIds), 'Assignees updated') }}
          position={assign}
        />
        <TagPicker
          open={!!tagsFor}
          tags={tags}
          value={tagsTask?.tags.map((g) => g.id) ?? []}
          onChange={(ids) => { const t = tagsTask; if (t) void run('update the tags', () => setTaskTags(t.id, ids)) }}
          onCreate={(name) => { void createAndTag(tagsTask ?? null, name) }}
          onManage={() => { setTagsFor(null); setManageTags(true) }}
          onClose={() => setTagsFor(null)}
          anchor={tagsFor?.el ?? null}
          position={tagsFor}
        />
      </div>
      <DatePicker
        open={!!dueFor}
        anchorRef={dueAnchor}
        anchorKey={dueFor?.taskId ?? ''}
        value={dueTask?.dueAt ?? null}
        today={new Date(now)}
        label="Due date"
        onSelect={(date) => { const t = dueTask; setDueFor(null); if (t) void run('set the due date', () => updateTask(t.id, { dueAt: date })) }}
        onClose={() => setDueFor(null)}
      />
      <ManageTagsDialog
        open={manageTags} tags={tags}
        onClose={() => setManageTags(false)}
        onRename={(id, name) => { void run('rename the tag', () => renameTag(id, name), undefined, REFRESH) }}
        onDelete={(id) => { void run('delete the tag', () => deleteTag(id), 'Tag deleted', REFRESH) }}
        onCreate={(name) => { void run('add the tag', () => createTag(name), undefined, REFRESH) }}
      />
      <AttachFilesModal
        open={!!attachTask}
        files={files}
        attached={attachTask?.attachments.map((f) => f.id) ?? []}
        onClose={() => setAttachFor(null)}
        onAttach={(fileIds) => { const t = attachTask; setAttachFor(null); if (t) void run('attach the files', () => attachFiles(t.id, fileIds), `${fileIds.length === 1 ? '1 file' : `${fileIds.length} files`} attached`) }}
        onUploadPicked={() => { /* REG-149: the picked file becomes the mock's file — the modal shows the upload toast and lists it in "Your files" */ }}
      />
      <TasksFiltersModal
        open={filtersOpen} team={team} tags={tags} value={filters} now={now}
        onApply={(v) => { setFilters(v); setFiltersOpen(false) }}
        onClose={() => setFiltersOpen(false)}
      />
      <ChooseTemplateDialog
        open={chooseTemplate} templates={templates}
        onSelect={(id) => { setChooseTemplate(false); void run('apply the template', async () => { const n = await applyTemplate(leadId, id); snackbar({ message: `${n} ${n === 1 ? 'task' : 'tasks'} added from the template` }) }) }}
        onManage={comingSoon}
        onClose={() => setChooseTemplate(false)}
      />
      <SaveTemplateDialog
        open={!!saveTemplateFor} templates={templates}
        onSave={(input) => { const ids = saveTemplateFor ?? []; setSaveTemplateFor(null); void run('save the template', () => saveTemplate({ taskIds: ids, ...input }), 'Template saved', REFRESH) }}
        onClose={() => setSaveTemplateFor(null)}
      />
      <DeleteTasksDialog
        open={!!deleting} all={!!deleting?.all} count={deleting?.ids.length ?? 1}
        onNo={() => setDeleting(null)}
        onYes={() => { const d = deleting; setDeleting(null); if (!d) return; setSelected(new Set()); if (d.ids.includes(openId ?? '')) setOpenId(null); void run('delete', () => deleteTasks(d.ids), d.ids.length === 1 ? 'Task deleted' : `${d.ids.length} tasks deleted`) }}
      />
      <ExportDialog
        open={exportOpen} now={now} title="Export Tasks"
        download={(format) => downloadTasks(tasks, format, new Date(now))}
        onClose={() => setExportOpen(false)}
        onDone={(name, format) => snackbar({ message: `Exported ${tasks.length} tasks as ${format} · ${name}` })}
      />
    </div>
  )
}
