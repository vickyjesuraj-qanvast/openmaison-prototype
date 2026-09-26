'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DropdownDivider, DropdownItem } from '@/components/leads/dropdown'
import { useRun } from '@/components/leads/tasks/use-run'
import { useSnackbar } from '@/components/om/snackbar'
import { Icon } from '@/components/om/icon'
import { MetaChip } from '@/components/om/meta-chip'
import { PickLeadDialog } from '@/components/contracts/pick-lead-dialog'
import { templateKind } from '@/lib/company/sections'
import type { TaskTemplateRow, TaskTemplatesData } from '@/lib/company/task-templates'
import { addTaskTemplateToLead, createTaskTemplate, deleteTaskTemplate, deleteTaskTemplatesForever, duplicateTaskTemplate, emptyTaskTemplateTrash, renameTaskTemplate, restoreTaskTemplates } from '@/app/company/task-templates-actions'
import { LibraryGallery, newIdOf, reasonOf, settle, type LibraryItem } from './library-gallery'
import styles from './library-gallery.module.css'
import { templateChangeBlock, templatePurgeBlock, templateRestoreBlock } from '@/lib/company/template-rules'
import { folderBlock, type Folder } from '@/lib/company/folder-libraries'
import { useHere } from '@/components/om/use-here'

type Row = TaskTemplateRow & LibraryItem
const toRow = (t: TaskTemplateRow): Row => ({ ...t, title: t.name, updatedAt: t.updatedAt ?? t.createdAt })

/**
 * Company › Templates › Tasks (REG-538): the checklists the team saves from a lead's tasks — a card per template with its
 * first steps, "n steps · keeps members / description", "Added to n leads"; New template ▾ (Blank · From a lead's tasks…);
 * the kebab's "Add to a lead…". Open lands in the task template editor. Manage Templates in the Tasks tab comes here.
 */
export function TaskTemplatesGallery({ data, from, folders = [] }: { data: TaskTemplatesData; from?: string; folders?: Folder[] }) {
  const { templates, deleted, leads, now } = data
  const router = useRouter()
  const snackbar = useSnackbar()
  const { run, fail } = useRun()
  const [addFor, setAddFor] = useState<string | null>(null)
  const [fromLead, setFromLead] = useState(false)
  const kind = templateKind('tasks')!
  const here = useHere('/company/templates/tasks')   // (round 3) the open folder and search ride along
  const open = useCallback((id: string) => router.push(`/templates/tasks/${id}?from=${encodeURIComponent(here)}`), [router, here])
  /* (wave E, E7) a refusal answers { error: the rule } — said after "Couldn’t …", never an editor opened on "[object Object]" */
  const create = async (fn: () => Promise<unknown>, what: string) => { try { open(await newIdOf(fn())) } catch (e) { fail(what, reasonOf(e)) } }
  const keeps = (t: TaskTemplateRow) => [t.keepMembers ? 'members' : null, t.keepDescription ? 'descriptions' : null].filter(Boolean).join(' · ')

  return (
    <LibraryGallery<Row> kind={kind} from={from} folders={{ library: 'tasks', list: folders, block: folderBlock(data.viewer) }} items={templates.map(toRow)} deleted={deleted.map(toRow)} now={now} ariaLabel="Task templates" mayChange={(t) => templateChangeBlock(data.viewer, t.createdBy)} tableKey="task-templates"
      newMenu={(close) => (<>
        <DropdownItem onSelect={() => { close(); void create(() => createTaskTemplate({ source: { kind: 'blank' } }), 'create the template') }}>Blank template</DropdownItem>
        <DropdownDivider />
        <DropdownItem onSelect={() => { close(); setFromLead(true) }}>From a lead’s tasks…</DropdownItem>
      </>)}
      filters={[{ key: 'used', label: 'In use', test: (t) => t.usedBy > 0 }, { key: 'unused', label: 'Not used yet', test: (t) => t.usedBy === 0 }]}
      searchText={(t) => t.tasks.map((s) => s.title).join(' ')}
      thumb={(t) => (
        <span className={styles.checklist}>
          {t.tasks.slice(0, 4).map((s) => <span key={s.id} className={styles.checkRow}><Icon name="check_box_outline_blank" size={16} weight={300} /><span className={styles.checkText}>{s.title}</span></span>)}
          {t.tasks.length > 4 ? <span className={styles.checkMore}>+{t.tasks.length - 4} more</span> : null}
          {t.tasks.length === 0 ? <span className={styles.checkMore}>No steps yet</span> : null}
        </span>
      )}
      glyph={(t) => <span className={styles.glyphChecks}>{Array.from({ length: Math.min(4, Math.max(1, t.tasks.length)) }).map((_, i) => <span key={i} className={styles.glyphCheck} />)}</span>}
      meta={(t) => `${t.tasks.length} ${t.tasks.length === 1 ? 'step' : 'steps'}${keeps(t) ? ` · keeps ${keeps(t)}` : ''}`}
      usage={(t) => (t.usedBy === 0 ? 'Not used yet' : `Added to ${t.usedBy} ${t.usedBy === 1 ? 'lead' : 'leads'}`)}
      usageWord={(t) => (t.usedBy === 0 ? '--' : `${t.usedBy} lead${t.usedBy === 1 ? '' : 's'}`)}
      chips={(t) => (t.tasks.some((s) => s.dueDays !== null) ? <MetaChip>Due dates</MetaChip> : null)}
      columns={[
        { key: 'steps', label: 'Steps', track: '110px', sortable: (t) => t.tasks.length, cell: (t) => <span>{t.tasks.length}</span> },
        { key: 'keeps', label: 'Keeps', track: '220px', cell: (t) => <span className={`${styles.oneLine} ${styles.muted}`}>{keeps(t) || '—'}</span> },
        { key: 'used', label: 'Used by', track: '140px', sortable: true, cell: (t) => (t.usedBy > 0 ? <span>{t.usedBy} lead{t.usedBy === 1 ? '' : 's'}</span> : <span className={styles.muted}>Not used yet</span>) },
      ]}
      onOpen={(t) => open(t.id)}
      kebab={(t) => [{ label: 'Add to a lead…', onSelect: () => setAddFor(t.id), disabled: t.tasks.length === 0, title: t.tasks.length === 0 ? 'Add a step first' : undefined }]}
      onDuplicate={(t) => create(() => duplicateTaskTemplate(t.id), 'duplicate the template')}
      onRename={(t, name) => renameTaskTemplate(t.id, name)}
      onDelete={(t) => deleteTaskTemplate(t.id)}
      deleteMessage={(t) => (t.usedBy ? `The tasks it already added to ${t.usedBy} ${t.usedBy === 1 ? 'lead stay' : 'leads stay'}. You can restore the template from Deleted Templates.` : 'You can restore it from Deleted Templates.')}
      onRestore={(ids) => restoreTaskTemplates(ids)} onDeleteForever={(ids) => deleteTaskTemplatesForever(ids)} onEmptyTrash={() => emptyTaskTemplateTrash()}
      /* (verify round 3) the Deleted sheet offers only what the server allows — Restore and Delete Forever on a template the viewer wrote (or
         any, for an Owner or an Admin), the rule said in the row with its author's name; Empty Trash counts only those */
      restoreBlock={(t) => templateRestoreBlock(data.viewer, t.createdBy, t.author)} purgeRule={(t) => templatePurgeBlock(data.viewer, t.createdBy, t.author)}
      deletedMeta={{ label: 'Steps', value: (t) => `${t.tasks.length} ${t.tasks.length === 1 ? 'step' : 'steps'}` }}
      empty={{ title: 'No task templates yet', help: 'Save a lead’s tasks as a template from its Tasks tab, or start a blank checklist here.' }}>
      <PickLeadDialog open={!!addFor} onClose={() => setAddFor(null)} leads={leads} allowStudio title="Add these tasks to which lead?" confirmLabel="Add tasks"
                      onPick={(leadId) => { const id = addFor; setAddFor(null); if (id) void run('add the tasks', async () => { const v = await settle(addTaskTemplateToLead(id, leadId)); const n = typeof v === 'number' ? v : 0; snackbar({ message: `${n} ${n === 1 ? 'task' : 'tasks'} added${leadId ? '' : ' to the studio’s tasks'}`, actionLabel: 'Open', onAction: () => router.push(leadId ? `/leads/${leadId}/tasks` : '/tasks') }) }) }} />
      <PickLeadDialog open={fromLead} onClose={() => setFromLead(false)} leads={leads} allowStudio title="Whose open tasks become the template?" confirmLabel="Create template"
                      onPick={(leadId) => { setFromLead(false); void create(() => createTaskTemplate({ source: { kind: 'lead', leadId } }), 'create the template') }} />
    </LibraryGallery>
  )
}
