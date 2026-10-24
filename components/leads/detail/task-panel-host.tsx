'use client'

import { useEffect, useState } from 'react'
import { AssignPopover } from '@/components/leads/assign-popover'
import { ConfirmDialog } from '@/components/om/confirm-dialog'
import { useSnackbar } from '@/components/om/snackbar'
import { TaskPanel } from '@/components/leads/tasks/task-panel'
import { CommentsPanel } from '@/components/leads/tasks/comments-panel'
import { ManageTagsDialog } from '@/components/leads/tasks/manage-tags-dialog'
import { AttachFilesModal } from '@/components/leads/tasks/attach-files-modal'
import { SaveTemplateDialog } from '@/components/leads/tasks/template-dialogs'
import { DeleteTasksDialog } from '@/components/leads/tasks/delete-dialog'
import { useRun } from '@/components/leads/tasks/use-run'
import { uploadPicked } from '@/components/leads/files/upload-picture'
import {
  addComment, attachFiles, createTag, deleteComment, deleteTag, deleteTasks, detachFile, editComment, markTaskSeen, renameTag, saveTemplate,
  setTaskAssignees, setTaskTags, setTasksDone, undoTasksDone, updateTask,
} from '@/app/leads/tasks-actions'
import type { LeadTasksData } from '@/lib/leads/tasks'
import { useSheetLayout } from '@/components/om/sheet'
import { TOUCH_TABLET, useMediaQuery } from '@/lib/breakpoint'
import styles from './task-panel-host.module.css'

/** tasks-actions that only `revalidatePath('/leads')` (tags, templates) — refresh after them, as the Tasks tab does (use-run.ts). */
const REFRESH = { refresh: true } as const
/** The Assign popover's spot under the panel's person_add — the Tasks tab's own footprint (400 × 440, 20 off the edges). */
/* (responsive audit 2026-10-23, W2-12) floored at 16 (REG-269's clamp): a 390-tall screen put the card's top at −70 */
const assignPos = (el: HTMLElement) => { const r = el.getBoundingClientRect(); return { el, top: Math.max(16, Math.min(r.bottom + 4, window.innerHeight - 440 - 20)), left: Math.max(16, Math.min(r.left, window.innerWidth - 400 - 20)) } }

/**
 * (Dane's UAT 5.05, 2026-10-01) A task pressed on the Overview opens HERE — the Tasks tab's own panel (`TaskPanel` · `CommentsPanel`) with
 * the tab's own actions (tasks-actions) and words, mounted over the Overview: closing it leaves the reader on the Overview, and its
 * Open in Tasks (the head's arrow) goes to the full tab with the task open. Nothing here is drawn anew — the panel, its popovers and its
 * dialogs are the tab's; only where they are mounted changed. The data is the tab's loader (`fetchLeadTasks`), read by the Overview's page.
 */
export function OverviewTaskPanel({ leadId, data, openId, onClose, onOpenInTasks }: {
  leadId: string
  data: LeadTasksData
  openId: string | null
  onClose: () => void
  onOpenInTasks: (taskId: string) => void
}) {
  const { tasks, tags, files, templates, team, now } = data
  const snackbar = useSnackbar()
  const { run, fail } = useRun()
  const me = team.find((m) => m.isYou) ?? team[0]
  const task = openId ? tasks.find((t) => t.id === openId) ?? null : null
  /* (Leads on the move, L4 — C-24) a finger's panel opens on the task (name, When with its presets, Who), as the Tasks tab's does */
  const phone = useSheetLayout()
  const compact = useMediaQuery(TOUCH_TABLET) || phone

  const [view, setView] = useState<'task' | 'comments'>('task')
  const [shownId, setShownId] = useState(openId)
  if (shownId !== openId) { setShownId(openId); setView('task') }   // each task opens on its own panel, never on the last one's comments
  const [assign, setAssign] = useState<{ el: HTMLElement; top: number; left: number } | null>(null)
  const [manageTags, setManageTags] = useState(false)
  const [deletingComment, setDeletingComment] = useState<string | null>(null)
  const [deletingTag, setDeletingTag] = useState<string | null>(null)
  const [attaching, setAttaching] = useState(false)
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [deleting, setDeleting] = useState(false)

  /* The unseen band clears on the first open, as the tab's row press does. */
  const unseenId = task && task.seenAt === null ? task.id : null
  useEffect(() => { if (unseenId) void markTaskSeen(unseenId) }, [unseenId])
  /* The Assign popover follows its trigger while the panel's body scrolls, and closes once it leaves the viewport (REG-129). */
  useEffect(() => {
    if (!assign) return
    const follow = () => setAssign((a) => { if (!a) return a; const r = a.el.getBoundingClientRect(); return r.bottom < 0 || r.top > window.innerHeight ? null : assignPos(a.el) })
    document.addEventListener('scroll', follow, true)
    window.addEventListener('resize', follow)
    return () => { document.removeEventListener('scroll', follow, true); window.removeEventListener('resize', follow) }
  }, [assign])

  /* The tab's completing rule (UX audit T7): what happened, with Undo; one flip at a time (RACE-05). */
  const toggleDone = async () => {
    if (!task) return
    const done = !task.done
    let res: Awaited<ReturnType<typeof setTasksDone>> = { changed: [], eventIds: [], stamps: [] }
    const ok = await run(done ? 'complete the task' : 'reopen the task', async () => { res = await setTasksDone([task.id], done) }, undefined, { guard: `done:${task.id}` })
    if (!ok) return
    if (!res.changed.length) { snackbar({ message: done ? 'The task is already completed' : 'The task is already open' }); return }
    const back = res
    const words = (d: boolean) => `Task ${d ? 'completed' : 'reopened'}`
    snackbar({ message: words(done), actionLabel: 'Undo', onAction: () => { void run(done ? 'reopen the task' : 'complete the task', () => undoTasksDone({ taskIds: back.changed, done, eventIds: back.eventIds, stamps: back.stamps }), words(!done)) } })
  }
  const createAndTag = (name: string) =>
    run('add the tag', async () => { const id = await createTag(name); if (task) await setTaskTags(task.id, [...task.tags.map((g) => g.id), id]) }, undefined, REFRESH)

  return (
    <>
      {task && view === 'task' ? (
        <TaskPanel
          task={task} team={team} tags={tags} now={now} compact={compact}
          onClose={onClose}
          onOpenInTasks={() => onOpenInTasks(task.id)}
          onComments={() => setView('comments')}
          onAttach={() => setAttaching(true)}
          onMenu={(action) => (action === 'template' ? setSavingTemplate(true) : setDeleting(true))}
          onChange={(patch) => { void run('save the task', () => updateTask(task.id, patch), 'Task updated') }}
          onAssign={(anchor) => setAssign((a) => (a?.el === anchor ? null : assignPos(anchor)))}
          onTags={(tagIds) => { void run('update the tags', () => setTaskTags(task.id, tagIds), 'Tags updated') }}
          onCreateTag={(name) => { void createAndTag(name) }}
          onManageTags={() => setManageTags(true)}
          onToggleDone={() => { void toggleDone() }}
          onDetach={(fileId) => { void run('remove the file', () => detachFile(task.id, fileId), 'File removed') }}
        />
      ) : null}
      {task && view === 'comments' && me ? (
        <CommentsPanel
          task={task} me={me} now={now}
          onBack={() => setView('task')}
          onClose={onClose}
          onAdd={(body) => { void run('post the comment', () => addComment(task.id, body)) }}
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
      {/* Raised above the panel (Drawer, z 100) while it is open — the Tasks tab's popover host (T1). */}
      <div className={styles.popovers} data-raised={task ? '' : undefined}>
        <AssignPopover
          open={!!assign && !!task}
          team={team}
          value={task?.assignees.map((m) => m.id) ?? []}
          anchor={assign?.el}
          onClose={() => setAssign(null)}
          onApply={(memberIds) => { const t = task; setAssign(null); if (t) void run('update the members', () => setTaskAssignees(t.id, memberIds), 'Members updated') }}
          position={assign}
        />
      </div>
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
        open={attaching && !!task}
        files={files}
        attached={task?.attachments.map((f) => f.id) ?? []}
        onClose={() => setAttaching(false)}
        onAttach={(fileIds) => { const t = task; setAttaching(false); if (t) void run('attach the files', () => attachFiles(t.id, fileIds), `${fileIds.length === 1 ? '1 file' : `${fileIds.length} files`} attached`) }}
        onUploadPicked={(file) => (file ? uploadPicked(leadId, file).then((r) => { if (r && 'error' in r) fail(`upload ${file.name}`, r.error); return r }, (e: unknown) => { fail(`upload ${file.name}`); throw e }) : undefined)}
      />
      <SaveTemplateDialog
        open={savingTemplate && !!task} templates={templates}
        onSave={(input) => { const t = task; setSavingTemplate(false); if (t) void run('save the template', () => saveTemplate({ taskIds: [t.id], ...input }), 'Template saved', REFRESH) }}
        onClose={() => setSavingTemplate(false)}
      />
      <DeleteTasksDialog
        open={deleting && !!task} all={false} count={1}
        onNo={() => setDeleting(false)}
        onYes={() => { const t = task; setDeleting(false); if (!t) return; onClose(); void run('delete', () => deleteTasks([t.id]), 'Task deleted') }}
      />
    </>
  )
}
