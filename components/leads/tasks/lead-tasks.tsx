'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AssignPopover } from '@/components/leads/assign-popover'
import { DatePicker } from '@/components/om/date-picker'
import { useSnackbar } from '@/components/om/snackbar'
import { withFrom } from '@/lib/nav'
import { ExportDialog } from '@/components/leads/export-dialog'
import { STUDIO_TASK_COLUMN_DEFS, TasksTable } from './tasks-table'
import { AddTaskButton, TasksMoreButton, TasksToolbar, type TasksMenuAction } from './tasks-toolbar'
import { TasksEmpty } from './tasks-empty'
import { TabSearchEmpty } from './tab-search-empty'
import { DetailBulkBar } from './detail-bulk-bar'
import { TaskPanel } from './task-panel'
import { TagPicker } from './tag-picker'
import { ManageTagsDialog } from './manage-tags-dialog'
import { CommentsPanel } from './comments-panel'
import { ConfirmDialog } from '@/components/om/confirm-dialog'
import { AttachFilesModal } from './attach-files-modal'
import { TasksFiltersModal } from './tasks-filters-modal'
import { ChooseTemplateDialog, SaveTemplateDialog } from './template-dialogs'
import { DeleteTasksDialog } from './delete-dialog'
import { useRun } from './use-run'
import { CREATE_EVENTS, useCreateIntent } from './use-create-intent'
import { EMPTY_TASK_FILTERS, activeTaskFilterCount, applyTaskFilters, type TaskFilters, type TaskScope } from '@/lib/leads/task-filters'
import { filterByQuery, matchesQuery } from '@/lib/search'
import { displayDate } from '@/lib/format'
import type { LeadTasksData, TaskRow, TaskLead } from '@/lib/leads/tasks'
import {
  addComment, applyTemplate, attachFiles, createTag, createTask, deleteComment, deleteTag, deleteTasks, detachFile, duplicateTasks,
  editComment, markTaskSeen, renameTag, saveTemplate, setTaskAssignees, setTaskTags, updateTask,
} from '@/app/leads/tasks-actions'
import { downloadTasks } from '@/lib/leads/export'
import { ColumnSettingsDrawer } from '@/components/om/column-settings'
import { useTableColumns } from '@/components/om/table-columns'
import { MOBILE, useMediaQuery } from '@/lib/breakpoint'
import { TASK_COLUMN_DEFS } from './tasks-table'
import styles from './lead-tasks.module.css'

type Anchored = { el: HTMLElement; top: number; left: number } | null
/* Anchored popovers are fixed-position: the clamp keeps the surface on screen, so it must reserve THAT popover's own
   footprint (+20 margin) — not one size for both. 400×440 gives back the listing's 420/460 (assign-popover.module.css
   .card); the tag picker is 352 and only as tall as its rows, so it no longer floats up to 200px off its cell on a
   short window. */
const anchorRect = (el: HTMLElement, w: number, h: number) => { const r = el.getBoundingClientRect(); return { el, top: Math.min(r.bottom + 4, window.innerHeight - h - 20), left: Math.min(r.left, window.innerWidth - w - 20) } }
const assignPos = (el: HTMLElement) => anchorRect(el, 400, 440)
/** Tag picker (tag-picker.module.css): 352 wide · 48 field + the list (8/8 padding, 36 per row capped at 288) + 1 rule + 44 foot. */
const tagsPos = (el: HTMLElement, tagCount: number) => anchorRect(el, 352, 48 + 16 + Math.min(tagCount * 36, 288) + 1 + 44)
const offscreen = (el: HTMLElement) => { const r = el.getBoundingClientRect(); return r.bottom < 0 || r.top > window.innerHeight }

/** tasks-actions that only `revalidatePath('/leads')` (tags, templates) — the tab must refresh itself after them (use-run.ts). */
const REFRESH = { refresh: true } as const

/**
 * Every piece of text the task ROW prints (REG-274): title · assignee names · creator (the REG-239 column) · the due
 * date exactly as the cell prints it (displayDate, never the raw timestamp) · the status label · tag names.
 * It is also the yardstick for "matched on the description alone" (REG-275) — see `descriptionOnly` below.
 */
const rowText = (t: TaskRow): (string | null | undefined)[] => [
  t.title,
  t.lead?.name,
  ...t.assignees.map((m) => m.name),
  t.creator?.name,
  t.dueAt ? displayDate(t.dueAt) : null,
  t.done ? 'Completed' : 'Open',
  ...t.tags.map((g) => g.name),
]

/**
 * Lead Details › Tasks (902-36216): the tab's state — table, inline add / rename, selection + bulk bar, the task / comments
 * panels, tags, attachments, filters, templates, export and delete. Every rule the listing settled applies (menus toggle,
 * tooltips, coming-soon on inert affordances, picker-only dates, unseen band). Specs: design-source/context/lead-tasks/.
 */
/** `leadId` null = the rail's Tasks page (REG-466): every lead's tasks and the studio's own, with a Lead column, a scope chip and Lead / Stage filters. */
export function LeadTasks({ leadId, data, header }: { leadId: string | null; data: LeadTasksData & { leads?: TaskLead[] }; /** (REG-466) The rail page's L1 header, given Add Task and the kebab to carry as the Leads header carries Add Lead. */ header?: (controls: { add: ReactNode; more: ReactNode }) => ReactNode }) {
  const studio = leadId === null
  const router = useRouter()
  /* (REG-538) Manage Templates lands on Company › Templates › Tasks, which comes back here. */
  const manageTemplates = () => router.push(withFrom('/company/templates/tasks', studio ? '/tasks' : `/leads/${leadId}/tasks`))
  const { tasks, tags, files, templates, team, now } = data
  const snackbar = useSnackbar()
  const { run } = useRun()
  const me = team.find((m) => m.isYou) ?? team[0]!

  /* ── list state ── */
  const [query, setQuery] = useState('')
  const [scope, setScope] = useState<TaskScope>('all')   // (REG-466) the rail page's chip; 'all' on a lead's tab
  const [addLead, setAddLead] = useState<string | null>(null)   // (REG-466) the add row's lead on the rail page — null = Studio
  const [filters, setFilters] = useState<TaskFilters>(EMPTY_TASK_FILTERS)
  const [filtersOpen, setFiltersOpen] = useState(false)
  /* Column settings (REG-454): order · visibility · up to three pinned, kept per browser; the phone cards ignore them. */
  const [columnsOpen, setColumnsOpen] = useState(false)
  const phone = useMediaQuery(MOBILE)
  const columnPrefs = useTableColumns(studio ? 'studio-tasks' : 'lead-tasks', studio ? STUDIO_TASK_COLUMN_DEFS : TASK_COLUMN_DEFS, phone)
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [adding, setAdding] = useState(false)
  /** Bumped per inline save: remounts the add row empty and focused, so tasks chain without re-opening (REG-257). */
  const [addRun, setAddRun] = useState(0)
  const [renaming, setRenaming] = useState<string | null>(null)
  const [seenLocally, setSeenLocally] = useState<Set<string>>(() => new Set())
  const unseen = useMemo(() => new Set(tasks.filter((t) => t.seenAt === null && !seenLocally.has(t.id)).map((t) => t.id)), [tasks, seenLocally])
  const filterCount = activeTaskFilterCount(filters)
  /* (REG-466) The rail page's scope comes before the filters: mine = assigned to me, unassigned = nobody's, studio = no lead. */
  const inScope = useMemo(() => scope === 'all' ? tasks : tasks.filter((t) => scope === 'mine' ? t.assignees.some((m) => m.id === me.id) : scope === 'unassigned' ? t.assignees.length === 0 : t.leadId === null), [tasks, scope, me.id])
  const openCount = useMemo(() => inScope.filter((t) => !t.done).length, [inScope])
  const visible = useMemo(() => {
    const sorted = applyTaskFilters(inScope, filters, now)
    /* (REG-466) On the studio page the due-date sort keeps the open tasks ahead of the completed ones — a morning list, not an archive. */
    const base = studio && filters.sort === 'due' ? [...sorted.filter((t) => !t.done), ...sorted.filter((t) => t.done)] : sorted
    /* Search is the last step, after the filters, and matches every piece of text the ROW shows (REG-274, one rule
       for every list) — `rowText` above — plus the DESCRIPTION (REG-275, user: "fix all of them"). The description
       lives in the task panel, not the row, so a hit on it alone used to read as a bug; the row now says why it is
       there (the "In description" chip beside the title), which is what unlocked matching it. */
    return filterByQuery(base, query, (t) => ({ fields: [...rowText(t), t.description] }))
  }, [inScope, filters, query, now, studio])
  /* (REG-275) The tasks whose ONLY hit is the description — the chip's trigger. Quiet by construction: empty while
     the box is empty, and empty for a task the reader can already see the query in. */
  const descriptionOnly = useMemo(() => {
    if (!query.trim()) return new Set<string>()
    return new Set(visible.filter((t) => !matchesQuery(query, rowText(t))).map((t) => t.id))
  }, [visible, query])
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
  /* Every destructive action confirms (REG-264): comment and tag deletes were the two paths that ran straight through. */
  const [deletingComment, setDeletingComment] = useState<string | null>(null)
  const [deletingTag, setDeletingTag] = useState<string | null>(null)
  const [attachFor, setAttachFor] = useState<string | null>(null)
  const [chooseTemplate, setChooseTemplate] = useState(false)
  const [saveTemplateFor, setSaveTemplateFor] = useState<string[] | null>(null)
  const [deleting, setDeleting] = useState<{ ids: string[]; all: boolean } | null>(null)
  const [exportOpen, setExportOpen] = useState(false)

  const startAdd = () => { setRenaming(null); setAdding(true) }
  // Create quick links › Task (858:26317) starts the inline add row: in place on this tab, or on landing from
  // another tab with `?new=1` (the landing the Quotes / Notes / Questionnaire tabs already accept).
  useCreateIntent({ event: CREATE_EVENTS.tasks, landing: { href: studio ? '/tasks' : `/leads/${leadId}/tasks` }, onIntent: startAdd })
  // Anchored popovers follow their trigger while the page scrolls and close once it leaves the viewport (REG-129).
  const anyAnchored = !!(assign || tagsFor)
  useEffect(() => {
    if (!anyAnchored) return
    const follow = () => {
      setAssign((s) => (s ? (offscreen(s.el) ? null : { ...s, ...assignPos(s.el) }) : s))
      setTagsFor((s) => (s ? (offscreen(s.el) ? null : { ...s, ...tagsPos(s.el, tags.length) }) : s))
    }
    document.addEventListener('scroll', follow, true)
    window.addEventListener('resize', follow)
    return () => { document.removeEventListener('scroll', follow, true); window.removeEventListener('resize', follow) }
  }, [anyAnchored, tags.length])

  const open = (task: TaskRow) => {
    if (unseen.has(task.id)) { setSeenLocally((s) => new Set(s).add(task.id)); void markTaskSeen(task.id) }
    setPanelView('task'); setOpenId(task.id)
  }
  // One flip per task at a time — a double click cannot toggle it twice (RACE-05).
  const toggleDone = (task: TaskRow) => run(task.done ? 'reopen the task' : 'complete the task', () => updateTask(task.id, { done: !task.done }), task.done ? undefined : 'Task completed', { guard: `done:${task.id}` })
  const openAssign = (task: TaskRow, anchor: HTMLElement) => setAssign((a) => (a?.el === anchor ? null : { taskId: task.id, ...assignPos(anchor) }))
  const openTags = (task: TaskRow, anchor: HTMLElement) => setTagsFor((a) => (a?.el === anchor ? null : { taskId: task.id, ...tagsPos(anchor, tags.length) }))
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
  // Bulk bar (902:26567 / frames 192 · 159): everything selected → the single "Delete All" action. "Everything" is the
  // lead's whole task list — the same `tasks` the toolbar's Delete all uses; measured against `visible` it also fired
  // inside a search or filter, where ticking the one matching row promised a project-wide delete that never happened.
  const allTasks = selectedIds.length === tasks.length
  const bulkActions = allTasks
    ? [{ label: 'Delete All', tone: 'danger' as const, onClick: () => setDeleting({ ids: selectedIds, all: allTasks }) }]
    : [
        { label: 'Save as Template', onClick: () => setSaveTemplateFor(selectedIds) },
        // The noun follows the count, as the attach snackbar below already does — one ticked row read "1 tasks duplicated".
        { label: 'Duplicate', onClick: () => { setSelected(new Set()); void run('duplicate the tasks', () => duplicateTasks(selectedIds), `${selectedIds.length === 1 ? '1 task' : `${selectedIds.length} tasks`} duplicated`) } },
        { label: 'Delete', tone: 'danger' as const, onClick: () => setDeleting({ ids: selectedIds, all: false }) },
      ]

  const menuAction = (action: TasksMenuAction) => {
    if (action === 'saveAll') setSaveTemplateFor(tasks.map((t) => t.id))
    if (action === 'manage') manageTemplates()
    if (action === 'export') setExportOpen(true)
    if (action === 'deleteAll') setDeleting({ ids: tasks.map((t) => t.id), all: true })
  }
  return (
    <>
    {/* (REG-735) with no task yet the header's Add Task steps back too — the empty card carries both ways in */}
    {header ? header({ add: tasks.length === 0 && !adding ? null : <AddTaskButton header onAdd={(kind) => (kind === 'new' ? startAdd() : setChooseTemplate(true))} />, more: <TasksMoreButton onMenu={menuAction} /> }) : null}
    <div className={styles.tab} data-open={openId ? '' : undefined} data-studio={studio || undefined}>
      <TasksToolbar onColumns={phone ? undefined : () => setColumnsOpen(true)}
        scope={studio ? { value: scope, onChange: setScope, count: openCount } : undefined}
        searchPlaceholder={studio ? 'Search title, lead, member, tag…' : undefined}
        query={query} onQuery={setQuery}
        onAdd={(kind) => (kind === 'new' ? startAdd() : setChooseTemplate(true))}
        onFilter={() => setFiltersOpen(true)} filterCount={filterCount}
        onMenu={menuAction} inHeader={!!header} bare={tasks.length === 0 && !adding}
      />
      {tasks.length === 0 && !adding ? (
        /* No tasks yet → the sibling tabs' empty card (T9); the inline add row takes over as soon as one starts. */
        <TasksEmpty onCreate={startAdd} onTemplate={() => setChooseTemplate(true)} />
      ) : nothingMatches && !adding ? (
        <TabSearchEmpty noun="tasks" searching={query.trim() !== ''} onClearAll={() => { setQuery(''); setFilters(EMPTY_TASK_FILTERS) }} />
      ) : (
        <TasksTable columns={columnPrefs.columns} onReorder={columnPrefs.reorder}
          leadPicker={studio ? { leads: data.leads ?? [], value: addLead, onChange: setAddLead } : undefined}
          tasks={visible} now={now}
          selected={selected} onSelect={setSelected}
          unseen={unseen}
          descriptionMatches={descriptionOnly}   /* (REG-275) rows the search found by their description alone */
          adding={adding}
          /* Saving keeps the row open, empty and focused for the next task — entry chains until Esc / Cancel
             (user 2026-09-01, REG-257: "user can just keep adding tasks one after the other"). */
          onAddSubmit={(title) => { if (title.trim()) { void run('add the task', () => createTask(studio ? addLead : leadId, title.trim()), 'Task added'); setAddRun((n) => n + 1) } else setAdding(false) }}
          addKey={addRun}
          onAddCancel={() => setAdding(false)}
          onAddClick={startAdd}
          renaming={renaming}
          onRenameStart={(task) => { setAdding(false); setRenaming(task.id) }}   /* (REG-472) the title edits in place */
          onRenameSubmit={(id, title) => { setRenaming(null); if (title.trim()) void run('rename the task', () => updateTask(id, { title: title.trim() }), 'Task updated') }}   /* (REG-329) the inline rename confirms as the panel does (REG-326) */
          onRenameCancel={() => setRenaming(null)}
          onOpen={(task) => open(task)}
          onOpenComments={(task) => { setOpenId(task.id); setPanelView('comments') }}
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
          lead={studio ? (openTask?.lead ?? null) : undefined}
          task={openTask} team={team} tags={tags} now={now}
          onClose={() => setOpenId(null)}
          onComments={() => setPanelView('comments')}
          onAttach={() => setAttachFor(openTask.id)}
          onMenu={(action) => (action === 'template' ? setSaveTemplateFor([openTask.id]) : setDeleting({ ids: [openTask.id], all: false }))}
          onChange={(patch) => { void run('save the task', () => updateTask(openTask.id, patch), 'Task updated') }}   /* (REG-326) the blur-saved fields confirm, as Members do */
          onAssign={(anchor) => openAssign(openTask, anchor)}
          onTags={(tagIds) => { void run('update the tags', () => setTaskTags(openTask.id, tagIds), 'Tags updated') }}
          onCreateTag={(name) => { void createAndTag(openTask, name) }}
          onManageTags={() => setManageTags(true)}
          onToggleDone={() => { void toggleDone(openTask) }}
          onDetach={(fileId) => { void run('remove the file', () => detachFile(openTask.id, fileId), 'File removed') }}
        />
      ) : null}
      {openTask && panelView === 'comments' ? (
        <CommentsPanel
          task={openTask} me={me} now={now}
          onBack={() => setPanelView('task')}
          onClose={() => { setOpenId(null); setPanelView('task') }}
          onAdd={(body) => { void run('post the comment', () => addComment(openTask.id, body)) }}
          onEdit={(id, body) => { void run('save the comment', () => editComment(id, body)) }}
          onDelete={setDeletingComment}
        />
      ) : null}
      <ConfirmDialog
        open={!!deletingComment} title="Delete Comment" confirmLabel="Yes" cancelLabel="No"
        message="Are you sure you want to delete this comment? This action cannot be undone."
        onCancel={() => setDeletingComment(null)}
        onConfirm={() => { const id = deletingComment; setDeletingComment(null); if (id) void run('delete the comment', () => deleteComment(id), 'Comment deleted') }}
      />

      {/* Fixed popovers sit at the z-scale's 70; while the panel (Drawer, 100) is open they are raised above it — a popover
          opened from the panel's person_add, or from a table cell beside it, must never paint under the panel (T1). */}
      <div className={styles.popovers} data-raised={openId ? '' : undefined}>
        <AssignPopover
          open={!!assign}
          team={team}
          value={assignTask?.assignees.map((m) => m.id) ?? []}
          anchor={assign?.el}
          onClose={() => setAssign(null)}
          onApply={(memberIds) => { const t = assignTask; setAssign(null); if (t) void run('update the members', () => setTaskAssignees(t.id, memberIds), 'Members updated') }}
          position={assign}
        />
        <TagPicker
          open={!!tagsFor}
          tags={tags}
          value={tagsTask?.tags.map((g) => g.id) ?? []}
          onChange={(ids) => { const t = tagsTask; if (t) void run('update the tags', () => setTaskTags(t.id, ids), 'Tags updated') }}
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
        onSelect={(date) => { const t = dueTask; setDueFor(null); if (t) void run('set the due date', () => updateTask(t.id, { dueAt: date }), 'Due date updated') }}
        onClose={() => setDueFor(null)}
      />
      <ManageTagsDialog
        open={manageTags} tags={tags}
        onClose={() => setManageTags(false)}
        onRename={(id, name) => { void run('rename the tag', () => renameTag(id, name), undefined, REFRESH) }}
        onDelete={setDeletingTag}
        onCreate={(name) => { void run('add the tag', () => createTag(name), undefined, REFRESH) }}
      />
      <ConfirmDialog
        open={!!deletingTag} title="Delete Tag" confirmLabel="Yes" cancelLabel="No"
        message="Are you sure you want to delete this tag? It will be removed from every task. This action cannot be undone."
        onCancel={() => setDeletingTag(null)}
        onConfirm={() => { const id = deletingTag; setDeletingTag(null); if (id) void run('delete the tag', () => deleteTag(id), 'Tag deleted', REFRESH) }}
      />
      <AttachFilesModal
        open={!!attachTask}
        files={studio ? files.filter((f) => !!attachTask?.leadId && f.leadId === attachTask.leadId) : files}   /* (REG-466) on the rail page, the task's own lead's library; a studio task has none */
        attached={attachTask?.attachments.map((f) => f.id) ?? []}
        onClose={() => setAttachFor(null)}
        onAttach={(fileIds) => { const t = attachTask; setAttachFor(null); if (t) void run('attach the files', () => attachFiles(t.id, fileIds), `${fileIds.length === 1 ? '1 file' : `${fileIds.length} files`} attached`) }}
        onUploadPicked={() => { /* REG-149: the picked file becomes the mock's file — the modal shows the upload toast and lists it in "Your files" */ }}
      />
      <ColumnSettingsDrawer open={columnsOpen} onClose={() => setColumnsOpen(false)} pinning={{ max: 3 }} columns={columnPrefs.all} onSave={columnPrefs.save} onReset={columnPrefs.reset} />
      <TasksFiltersModal
        leads={studio ? data.leads : undefined}
        open={filtersOpen} team={team} tags={tags} value={filters} now={now}
        onApply={setFilters}   /* (REG-464) live — the modal closes on Done */
        onClose={() => setFiltersOpen(false)}
      />
      <ChooseTemplateDialog
        open={chooseTemplate} templates={templates} folders={data.templateFolders}
        onSelect={(id) => { setChooseTemplate(false); void run('apply the template', async () => { const n = await applyTemplate(studio ? null : leadId, id); snackbar({ message: `${n} ${n === 1 ? 'task' : 'tasks'} added from the template` }) }) }}
        onManage={() => { setChooseTemplate(false); manageTemplates() }}
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
    </>
  )
}
