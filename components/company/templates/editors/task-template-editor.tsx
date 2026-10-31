'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Reorder, useDragControls } from 'motion/react'
import { Button, Switch } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { Avatar } from '@/components/om/avatar'
import { TextField } from '@/components/om/text-field'
import { Tooltip } from '@/components/om/tooltip'
import { SelectTrigger } from '@/components/om/select-trigger'
import { ConfirmDialog } from '@/components/om/confirm-dialog'
import { useSnackbar } from '@/components/om/snackbar'
import { PageReveal } from '@/components/shell/page-reveal'
import { LibraryEditorGhost } from './library-editor-ghost'
import { MaisonFab } from '@/components/shell/maison-fab'
import { MaisonAiSheet } from '@/components/shell/maison-ai'
import type { MaisonSuggestion } from '@/lib/maison-ai'
import { AssignPopover } from '@/components/leads/assign-popover'
import { TagPicker } from '@/components/leads/tasks/tag-picker'
import { ManageTagsDialog } from '@/components/leads/tasks/manage-tags-dialog'
import { createTag, deleteTag, renameTag } from '@/app/leads/tasks-actions'
import { PickLeadDialog } from '@/components/contracts/pick-lead-dialog'
import { DropdownDivider, DropdownItem } from '@/components/leads/dropdown'
import { savedLabel } from '@/lib/contracts/model'
import type { Member, Tag } from '@/lib/db/schema'
import type { TaskTemplateEditorData, TaskTemplateStep } from '@/lib/company/task-templates'
import { addTaskTemplateToLead, deleteTaskTemplate, duplicateTaskTemplate, saveTaskTemplate } from '@/app/company/task-templates-actions'
import { LibraryHeader } from '../library-header'
import { isRefusal } from '@/lib/company/template-rules'
import { couldnt, refusalOf, useRun } from '@/components/leads/tasks/use-run'
import page from '@/components/contracts/editor/contract-editor.module.css'
import styles from './library-editor.module.css'

const AUTOSAVE_MS = 600
type Step = TaskTemplateStep & { key: string }
const newStep = (): Step => ({ id: '', key: `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, title: '', description: null, kind: 'General', memberIds: [], tagIds: [], dueDays: null, sortOrder: 0 })
/** (Dane UAT 3.20) The Tags picker opens fixed at its own 352 under its button, as the Tasks tab's tags cell places it (lead-tasks.tsx
    `tagsPos`): the field, the list (8 rows before it scrolls) and Manage Tags, kept inside the window. */
const tagsPlace = (el: HTMLElement, tagCount: number) => {
  /* (responsive audit 2026-10-23, W4-24) a finger's rows are the picker's 44, not the mouse's 36 — counted at 36, the picker kept 32px too
     little room and ran past the bottom of a phone held sideways */
  const row = window.matchMedia('(hover: none)').matches ? 44 : 36
  const r = el.getBoundingClientRect(), h = 48 + 16 + Math.min(tagCount * row, 8 * row) + 1 + 44
  return { top: Math.max(8, Math.min(r.bottom + 4, window.innerHeight - h - 20)), left: Math.max(8, Math.min(r.left, window.innerWidth - 352 - 20)) }
}
/** (responsive audit 2026-10-23, W4-24) The Assign Member card (400 wide, up to 440 tall) opens under its button, kept inside the window as the Tags
    picker is — at 768 and 1024 it opened 92px past the right edge. (A window under 456 tall still needs the card's own height capped — its
    stylesheet, components/leads/assign-popover.module.css.) */
const assignPlace = (el: HTMLElement) => {
  const r = el.getBoundingClientRect(), h = Math.min(440, window.innerHeight - 16)
  return { top: Math.max(8, Math.min(r.bottom + 4, window.innerHeight - h - 8)), left: Math.max(8, Math.min(r.left, window.innerWidth - 400 - 8)) }
}

/**
 * The task template editor (REG-538): the checklist's steps in order — title · description · due in n days · members · tags —
 * with a drag handle each, Add a step, and the two switches the Save-as-Template dialog offers (Keep team members · Keep
 * descriptions), now real: Use Template writes the members, tags and due dates the steps carry. Header: "Company / Templates /
 * Tasks" · n steps · Added to n leads · Saved · Done · kebab (Add to a lead… · Duplicate · Delete).
 */
export function TaskTemplateEditor({ data, from }: { data: TaskTemplateEditorData; from?: string }) {
  const { template, team, tags, leads, now } = data
  const router = useRouter()
  const snackbar = useSnackbar()
  const [name, setName] = useState(template.name)
  const [keepMembers, setKeepMembers] = useState(template.keepMembers)
  const [keepDescription, setKeepDescription] = useState(template.keepDescription)
  const [steps, setSteps] = useState<Step[]>(() => template.tasks.map((t) => ({ ...t, key: t.id })))
  const [updatedAt, setUpdatedAt] = useState((template.updatedAt ?? template.createdAt).getTime())
  const [clock, setClock] = useState(now)
  useEffect(() => { const t = setInterval(() => setClock(Date.now()), 30_000); return () => clearInterval(t) }, [])
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)
  /* (Dane UAT 3.20) The studio's tags, kept here as the Tasks tab keeps them: Enter on a new name in a step's picker makes the tag and ticks
     it; Manage Tags opens the same Manage Tags dialog. The tag actions refresh the lead pages only, so this page refreshes itself (use-run). */
  const { run } = useRun()
  const [manageTags, setManageTags] = useState(false)
  const [deletingTag, setDeletingTag] = useState<string | null>(null)

  const dirty = useRef(false)
  const latest = useRef({ name, keepMembers, keepDescription, steps }); useEffect(() => { latest.current = { name, keepMembers, keepDescription, steps } })
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const flush = useCallback(async () => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null }
    if (!dirty.current) return
    dirty.current = false
    const l = latest.current
    try { const r = await saveTaskTemplate(template.id, { name: l.name, keepMembers: l.keepMembers, keepDescription: l.keepDescription, steps: l.steps.map((s) => ({ id: s.id || undefined, title: s.title, description: s.description, kind: s.kind, memberIds: s.memberIds, tagIds: s.tagIds, dueDays: s.dueDays })) }); if (isRefusal(r)) snackbar({ message: r.error }); else setUpdatedAt(r) }   /* (fix-G) the library's rule refuses a member who may not change it */
    catch { snackbar({ message: 'Couldn’t save the template — please try again' }) }
  }, [template.id, snackbar])
  const flushRef = useRef(flush); useEffect(() => { flushRef.current = flush })
  const queue = useCallback(() => { dirty.current = true; if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => { void flushRef.current() }, AUTOSAVE_MS) }, [])
  useEffect(() => () => { void flushRef.current() }, [])
  const patch = (key: string, p: Partial<Step>) => { setSteps((ss) => ss.map((s) => (s.key === key ? { ...s, ...p } : s))); queue() }
  const remove = (key: string) => { setSteps((ss) => ss.filter((s) => s.key !== key)); queue() }
  const add = () => { setSteps((ss) => [...ss, newStep()]); queue() }
  const createAndTick = (key: string, name: string) =>
    run('add the tag', async () => { const id = await createTag(name); setSteps((ss) => ss.map((s) => (s.key === key && !s.tagIds.includes(id) ? { ...s, tagIds: [...s.tagIds, id] } : s))); queue() }, undefined, { refresh: true })
  /* A deleted tag leaves every step here at once — the template never keeps a tag the studio no longer has. */
  const dropTag = (id: string) => run('delete the tag', async () => { await deleteTag(id); setSteps((ss) => ss.map((s) => (s.tagIds.includes(id) ? { ...s, tagIds: s.tagIds.filter((t) => t !== id) } : s))); queue() }, 'Tag deleted', { refresh: true })
  const backHref = from ?? '/company/templates/tasks'
  const close = () => { void flushRef.current(); router.push(backHref) }
  const usedBy = template.usedBy

  /* (pending modules S10 — card held:maison-ai, "eight editors open an empty Maison AI sheet") The checklist's Maison AI, by rule from the page:
     what it adds to a lead (the steps in order, with the day each falls due and who has it), what is missing (a step with no title, no due day,
     no one on it while members are kept), and Add to a lead — the kebab's own dialog. *(invented copy: the answers' titles and lines)* */
  const aiFabRef = useRef<HTMLSpanElement>(null)
  const who = (ids: string[]) => (keepMembers && ids.length ? ids.map((id) => team.find((m) => m.id === id)?.name.split(' ')[0] ?? 'A member').join(', ') : keepMembers ? 'No one yet' : 'The lead’s members')
  const dueWords = (d: number | null) => (d == null ? 'No due day' : d === 0 ? 'Due the day it is added' : `Due ${d === 1 ? '1 day' : `${d} days`} after it is added`)
  const missing = steps.flatMap((st, i) => {
    if (!st.title.trim()) return [{ id: st.key, label: `Step ${i + 1} has no title`, meta: 'It would add as an empty task' }]
    const gaps = [...(st.dueDays == null ? ['no due day'] : []), ...(keepMembers && !st.memberIds.length ? ['no one on it — the lead’s members get it'] : [])]
    return gaps.length ? [{ id: st.key, label: st.title, meta: `${gaps.join(' · ').replace(/^./, (c) => c.toUpperCase())}` }] : []
  })
  const maison: MaisonSuggestion[] = [
    { label: 'What will it add to a lead?', answer: () => Promise.resolve(steps.length
      ? { title: `${steps.length === 1 ? '1 task' : `${steps.length} tasks`}, in this order`, text: `${keepMembers ? 'Each goes to the members named on it.' : 'Each goes to the lead’s members.'} ${keepDescription ? 'Descriptions go with them.' : 'Descriptions stay behind.'}`,
          rows: steps.map((st, i) => ({ id: st.key, label: st.title.trim() || `Step ${i + 1}`, meta: `${dueWords(st.dueDays)} · ${who(st.memberIds)}` })) }
      : { title: 'No steps yet', text: 'Add a step — each becomes a task on the lead it is added to.' }) },
    { label: 'Is anything missing?', answer: () => Promise.resolve(missing.length
      ? { title: `${missing.length === 1 ? '1 step' : `${missing.length} steps`} to look at`, text: 'Each adds as it is — fill them in here first.', rows: missing }
      : { title: 'Nothing is missing', text: steps.length ? 'Every step has a title and a due day.' : 'Add a step to begin.' }) },
    steps.length
      ? { label: 'Add it to a lead', run: () => setAddOpen(true) }
      : { label: 'Add it to a lead', answer: { title: 'Add a step first', text: 'A checklist with no steps adds nothing to a lead.' } },
  ]

  return (
    <PageReveal skeleton={<LibraryEditorGhost kind="tasks" />}>
      <div className={page.page} data-testid="task-template-editor">
        <LibraryHeader crumbs={[{ label: 'Company', href: '/company/profile' }, { label: 'Templates', href: '/company/templates/quotes' }, { label: 'Tasks', href: '/company/templates/tasks' }]} title={name.trim() || 'Untitled template'}
                       /* (the close-out round 2026-10-31, C-123 · 4-17) the name once, renamed in the header — the second row that repeated it is gone */
                       titleEdit={{ value: name, label: 'Template name', placeholder: 'Template name', maxLength: 120, onChange: (v) => { setName(v); queue() }, onDone: () => { void flushRef.current() } }}
                       chips={null}   /* (the calm UI build 2026-10-27, the UI audit's 4-11) no tags: the steps are the card below, the usage is the gallery card's */
                       savedLabel={savedLabel(updatedAt, clock)} primary={{ label: 'Done', onPress: close }}
                       menu={<>
                         <DropdownItem onSelect={() => setAddOpen(true)} disabled={steps.length === 0} help={steps.length === 0 ? 'Add a step first' : undefined}>Add to a lead…</DropdownItem>   {/* (REG-728) the reason in the row */}
                         <DropdownDivider />
                         <DropdownItem onSelect={() => { void flushRef.current().then(() => duplicateTaskTemplate(template.id)).then((id) => { snackbar({ message: 'Template duplicated' }); router.push(`/templates/tasks/${id}${from ? `?from=${encodeURIComponent(from)}` : ''}`) }, () => snackbar({ message: 'Couldn’t duplicate the template — please try again' })) }}>Duplicate</DropdownItem>
                         <DropdownDivider />
                         <DropdownItem tone="danger" onSelect={() => setDeleteOpen(true)}>Delete</DropdownItem>
                       </>} onClose={close} />
        <div className={styles.body}>
          <div className={styles.card}>
            <div className={styles.cardHead}><span className={styles.cardTitle}>Steps</span><span className={styles.cardHelp}>Use Template adds these to a lead as open tasks, in this order.</span></div>
            <div className={styles.cardBody}>
              {/* (the close-out round 2026-10-31, C-123 · 4-17) the two Keep switches lead the steps they shape (each step's members, its
                  description) — they sat on the name row, which is gone now the name is the header's */}
              <div className={styles.switches} data-testid="task-template-keeps">
                <label className={styles.switchRow}>Keep team members <Switch size="sm" isSelected={keepMembers} onChange={(v: boolean) => { setKeepMembers(v); queue() }} aria-label="Keep team members" /></label>
                <label className={styles.switchRow}>Keep descriptions <Switch size="sm" isSelected={keepDescription} onChange={(v: boolean) => { setKeepDescription(v); queue() }} aria-label="Keep descriptions" /></label>
              </div>
              {steps.length === 0 ? <div className={styles.stepsEmpty}>No steps yet. Add the first one.</div> : (
                <Reorder.Group as="ol" axis="y" values={steps} onReorder={(next: Step[]) => { setSteps(next); queue() }} className={styles.steps}>
                  {steps.map((s, i) => <StepRow key={s.key} step={s} index={i} team={team} tags={tags} keepMembers={keepMembers} keepDescription={keepDescription} onPatch={(p) => patch(s.key, p)} onRemove={() => remove(s.key)} onDrop={() => queue()}
                                                onCreateTag={(name) => { void createAndTick(s.key, name) }} onManageTags={() => setManageTags(true)} />)}
                </Reorder.Group>
              )}
              <Button variant="secondary" appearance="outlined" className={styles.addRow} iconStart={<Icon name="add" size={20} />} onPress={add}>Add a step</Button>
            </div>
          </div>
        </div>
        <PickLeadDialog open={addOpen} onClose={() => setAddOpen(false)} leads={leads} allowStudio title="Add these tasks to which lead?" confirmLabel="Add tasks"
                        onPick={(leadId) => { setAddOpen(false); void flushRef.current().then(() => addTaskTemplateToLead(template.id, leadId)).then((n) => snackbar({ message: `${n} ${n === 1 ? 'task' : 'tasks'} added`, actionLabel: 'Open', onAction: () => router.push(leadId ? `/leads/${leadId}/tasks` : '/tasks') }), () => snackbar({ message: 'Couldn’t add the tasks — please try again' })) }} />
        <ConfirmDialog open={deleteOpen} title={`Delete ${name.trim() || 'this template'}?`} confirmLabel="Delete" tone="danger"
                       message={usedBy ? `The tasks it already added to ${usedBy} ${usedBy === 1 ? 'lead stay' : 'leads stay'}. You can restore the template from Deleted templates.` : 'You can restore it from Deleted templates.'}
                       onCancel={() => setDeleteOpen(false)} onConfirm={() => { setDeleteOpen(false); void deleteTaskTemplate(template.id).then((r) => { if (isRefusal(r)) { snackbar({ message: couldnt('delete the template', refusalOf(r.error)) }); return } snackbar({ message: 'Template deleted' }); router.push('/company/templates/tasks') }, () => snackbar({ message: 'Couldn’t delete the template — please try again' })) }} />
        {/* (Dane UAT 3.20) The Tasks tab's Manage Tags and its delete confirm, as they are there (902:27709). */}
        <ManageTagsDialog open={manageTags} tags={tags} onClose={() => setManageTags(false)}
                          onRename={(id, name) => { void run('rename the tag', () => renameTag(id, name), undefined, { refresh: true }) }}
                          onDelete={setDeletingTag}
                          onCreate={(name) => { void run('add the tag', () => createTag(name), undefined, { refresh: true }) }} />
        <ConfirmDialog open={!!deletingTag} title="Delete Tag" confirmLabel="Yes" cancelLabel="No" nested
                       message="Are you sure you want to delete this tag? It will be removed from every task. This action cannot be undone."
                       onCancel={() => setDeletingTag(null)} onConfirm={() => { const id = deletingTag; setDeletingTag(null); if (id) void dropTag(id) }} />
        <MaisonAiSheet open={aiOpen} suggestions={maison} onClose={() => setAiOpen(false)} anchorRef={aiFabRef} />   {/* (pending modules S10) the shell's one sheet; the FAB's own press toggles it (REG-153) */}
        <span ref={aiFabRef} style={{ display: 'contents' }}><MaisonFab onPress={() => setAiOpen((o) => !o)} /></span>
      </div>
    </PageReveal>
  )
}

/** One step: the drag handle, its number, title over description, "Due in n days", the members and tags pickers, remove. */
function StepRow({ step, index, team, tags, keepMembers, keepDescription, onPatch, onRemove, onDrop, onCreateTag, onManageTags }: { step: Step; index: number; team: Member[]; tags: Tag[]; keepMembers: boolean; keepDescription: boolean; onPatch: (p: Partial<Step>) => void; onRemove: () => void; onDrop: () => void; onCreateTag: (name: string) => void; onManageTags: () => void }) {
  const controls = useDragControls()
  const [dragging, setDragging] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const [assignPos, setAssignPos] = useState<{ top: number; left: number } | null>(null)
  const [tagOpen, setTagOpen] = useState(false)
  const [tagEl, setTagEl] = useState<HTMLElement | null>(null)
  const [tagPos, setTagPos] = useState<{ top: number; left: number } | null>(null)
  /* (Dane UAT 3.20) While open, the picker follows its button as the page scrolls, and closes once the button leaves the window (the
     listing's anchored popovers, checklist › Fields). */
  const tagCount = tags.length
  useEffect(() => {
    if (!tagOpen || !tagEl) return
    const follow = () => {
      const r = tagEl.getBoundingClientRect()
      if (r.bottom < 0 || r.top > window.innerHeight) { setTagOpen(false); return }
      setTagPos(tagsPlace(tagEl, tagCount))
    }
    document.addEventListener('scroll', follow, true)
    window.addEventListener('resize', follow)
    return () => { document.removeEventListener('scroll', follow, true); window.removeEventListener('resize', follow) }
  }, [tagOpen, tagEl, tagCount])
  const [dueText, setDueText] = useState<string | null>(null)
  const members = step.memberIds.map((id) => team.find((m) => m.id === id)).filter((m): m is Member => !!m)
  const stepTags = step.tagIds.map((id) => tags.find((t) => t.id === id)).filter((t): t is Tag => !!t)
  return (
    <Reorder.Item as="li" value={step} dragListener={false} dragControls={controls} className={styles.step} data-dragging={dragging || undefined} data-testid="template-step"
                  onDragStart={() => setDragging(true)} onDragEnd={() => { setDragging(false); onDrop() }}>
      <button type="button" className={styles.handle} aria-label={`Reorder step ${index + 1}`} onPointerDown={(e) => controls.start(e)}><Icon name="drag_indicator" size={20} weight={300} /></button>
      <span className={styles.stepNo}>{index + 1}</span>
      <span className={styles.stepFields}>
        <TextField label="Task" required size="s" value={step.title} onChange={(v) => onPatch({ title: v })} />
        <TextField label={keepDescription ? 'Description' : 'Description (not kept — switch it on above)'} size="s" value={step.description ?? ''} onChange={(v) => onPatch({ description: v || null })} disabled={!keepDescription} />
      </span>
      <TextField label="Due in (days)" size="s" numeric="digits" maxLength={3} value={dueText ?? (step.dueDays === null ? '' : String(step.dueDays))}
                 onChange={(v) => { setDueText(v); onPatch({ dueDays: v.trim() === '' ? null : Math.max(0, Math.min(365, Number(v))) }) }} onBlur={() => setDueText(null)} placeholder="No due date" />
      <span className={styles.stepPick}>
        <Tooltip label={keepMembers ? 'Team members' : 'Members are not kept — switch it on above'}>
          {/* (REG-729) the house compact select trigger — one of the seven hand-rolled ones it replaced */}
          <SelectTrigger label="Team members" placeholder="Members" open={assignOpen} disabled={!keepMembers}
                         value={members.length ? <span className={styles.pickValue}><span className={styles.avatars}>{members.slice(0, 3).map((m) => <Avatar key={m.id} name={m.name} color={m.color} size={24} tooltip={false} />)}</span>{members.length > 3 ? `+${members.length - 3}` : null}</span> : ''}
                         onClick={(e) => { setAssignPos(assignPlace(e.currentTarget)); setAssignOpen((o) => !o) }} />
        </Tooltip>
        <AssignPopover open={assignOpen} team={team} value={step.memberIds} position={assignPos} onClose={() => setAssignOpen(false)} onApply={(ids) => { onPatch({ memberIds: ids }); setAssignOpen(false) }} />
      </span>
      <span className={styles.stepPick}>
        <Tooltip label="Tags">
          <SelectTrigger ref={setTagEl} label="Tags" placeholder="Tags" open={tagOpen} value={stepTags.length ? stepTags.map((t) => t.name).join(', ') : ''} onClick={(e) => { setTagPos(tagsPlace(e.currentTarget, tags.length)); setTagOpen((o) => !o) }} />
        </Tooltip>
        <TagPicker open={tagOpen} tags={tags} value={step.tagIds} anchor={tagEl} position={tagPos} onChange={(ids) => onPatch({ tagIds: ids })} onCreate={onCreateTag}
                   onManage={() => { setTagOpen(false); onManageTags() }} onClose={() => setTagOpen(false)} />
      </span>
      <Tooltip label="Remove step"><IconButton icon="delete" label={`Remove step ${index + 1}`} onClick={onRemove} /></Tooltip>
    </Reorder.Item>
  )
}
