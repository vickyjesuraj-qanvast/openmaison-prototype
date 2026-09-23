'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Reorder, useDragControls } from 'motion/react'
import { Button, Switch } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { Avatar } from '@/components/om/avatar'
import { MetaChip } from '@/components/om/meta-chip'
import { TextField } from '@/components/om/text-field'
import { Tooltip } from '@/components/om/tooltip'
import { ConfirmDialog } from '@/components/om/confirm-dialog'
import { useComingSoon, useSnackbar } from '@/components/om/snackbar'
import { PageReveal } from '@/components/shell/page-reveal'
import { EditorSkeleton } from '@/components/quotes/editor/editor-skeleton'
import { MaisonFab } from '@/components/shell/maison-fab'
import { AiSheet } from '@/components/leads/ai-sheet'
import { AssignPopover } from '@/components/leads/assign-popover'
import { TagPicker } from '@/components/leads/tasks/tag-picker'
import { PickLeadDialog } from '@/components/contracts/pick-lead-dialog'
import { DropdownDivider, DropdownItem } from '@/components/leads/dropdown'
import { savedLabel } from '@/lib/contracts/model'
import type { Member, Tag } from '@/lib/db/schema'
import type { TaskTemplateEditorData, TaskTemplateStep } from '@/lib/company/task-templates'
import { addTaskTemplateToLead, deleteTaskTemplate, duplicateTaskTemplate, saveTaskTemplate } from '@/app/company/task-templates-actions'
import { LibraryHeader } from '../library-header'
import page from '@/components/contracts/editor/contract-editor.module.css'
import styles from './library-editor.module.css'

const AUTOSAVE_MS = 600
type Step = TaskTemplateStep & { key: string }
const newStep = (): Step => ({ id: '', key: `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, title: '', description: null, kind: 'General', memberIds: [], tagIds: [], dueDays: null, sortOrder: 0 })

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
  const comingSoon = useComingSoon()
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

  const dirty = useRef(false)
  const latest = useRef({ name, keepMembers, keepDescription, steps }); useEffect(() => { latest.current = { name, keepMembers, keepDescription, steps } })
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const flush = useCallback(async () => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null }
    if (!dirty.current) return
    dirty.current = false
    const l = latest.current
    try { setUpdatedAt(await saveTaskTemplate(template.id, { name: l.name, keepMembers: l.keepMembers, keepDescription: l.keepDescription, steps: l.steps.map((s) => ({ id: s.id || undefined, title: s.title, description: s.description, kind: s.kind, memberIds: s.memberIds, tagIds: s.tagIds, dueDays: s.dueDays })) })) }
    catch { snackbar({ message: 'Couldn’t save the template — please try again' }) }
  }, [template.id, snackbar])
  const flushRef = useRef(flush); useEffect(() => { flushRef.current = flush })
  const queue = useCallback(() => { dirty.current = true; if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => { void flushRef.current() }, AUTOSAVE_MS) }, [])
  useEffect(() => () => { void flushRef.current() }, [])
  const patch = (key: string, p: Partial<Step>) => { setSteps((ss) => ss.map((s) => (s.key === key ? { ...s, ...p } : s))); queue() }
  const remove = (key: string) => { setSteps((ss) => ss.filter((s) => s.key !== key)); queue() }
  const add = () => { setSteps((ss) => [...ss, newStep()]); queue() }
  const backHref = from ?? '/company/templates/tasks'
  const close = () => { void flushRef.current(); router.push(backHref) }
  const usedBy = template.usedBy

  return (
    <PageReveal skeleton={<EditorSkeleton />}>
      <div className={page.page} data-testid="task-template-editor">
        <LibraryHeader crumbs={[{ label: 'Company', href: '/company/profile' }, { label: 'Templates', href: '/company/templates/quotes' }, { label: 'Tasks', href: '/company/templates/tasks' }]} title={name.trim() || 'Untitled template'}
                       chips={<><MetaChip>{steps.length} {steps.length === 1 ? 'step' : 'steps'}</MetaChip><MetaChip>{usedBy === 0 ? 'Not used yet' : `Added to ${usedBy} ${usedBy === 1 ? 'lead' : 'leads'}`}</MetaChip></>}
                       savedLabel={savedLabel(updatedAt, clock)} primary={{ label: 'Done', onPress: close }}
                       menu={<>
                         <DropdownItem onSelect={() => setAddOpen(true)} disabled={steps.length === 0} title={steps.length === 0 ? 'Add a step first' : undefined}>Add to a lead…</DropdownItem>
                         <DropdownDivider />
                         <DropdownItem onSelect={() => { void flushRef.current().then(() => duplicateTaskTemplate(template.id)).then((id) => { snackbar({ message: 'Template duplicated' }); router.push(`/templates/tasks/${id}${from ? `?from=${encodeURIComponent(from)}` : ''}`) }, () => snackbar({ message: 'Couldn’t duplicate the template — please try again' })) }}>Duplicate</DropdownItem>
                         <DropdownDivider />
                         <DropdownItem tone="danger" onSelect={() => setDeleteOpen(true)}>Delete</DropdownItem>
                       </>} onClose={close} />
        <div className={page.meta} data-testid="library-meta">
          <input className={page.titleInput} value={name} placeholder="Template name" aria-label="Template name" maxLength={120} onChange={(e) => { setName(e.target.value); queue() }} onBlur={() => { void flushRef.current() }} />
          <div className={`${page.metaEnd} ${styles.switches}`}>
            <label className={styles.switchRow}>Keep team members <Switch size="sm" isSelected={keepMembers} onChange={(v: boolean) => { setKeepMembers(v); queue() }} aria-label="Keep team members" /></label>
            <label className={styles.switchRow}>Keep descriptions <Switch size="sm" isSelected={keepDescription} onChange={(v: boolean) => { setKeepDescription(v); queue() }} aria-label="Keep descriptions" /></label>
          </div>
        </div>
        <div className={styles.body}>
          <div className={styles.card}>
            <div className={styles.cardHead}><span className={styles.cardTitle}>Steps</span><span className={styles.cardHelp}>Use Template adds these to a lead as open tasks, in this order.</span></div>
            <div className={styles.cardBody}>
              {steps.length === 0 ? <div className={styles.stepsEmpty}>No steps yet. Add the first one.</div> : (
                <Reorder.Group as="ol" axis="y" values={steps} onReorder={(next: Step[]) => { setSteps(next); queue() }} className={styles.steps}>
                  {steps.map((s, i) => <StepRow key={s.key} step={s} index={i} team={team} tags={tags} keepMembers={keepMembers} keepDescription={keepDescription} onPatch={(p) => patch(s.key, p)} onRemove={() => remove(s.key)} onDrop={() => queue()} />)}
                </Reorder.Group>
              )}
              <Button variant="secondary" appearance="outlined" className={styles.addRow} iconStart={<Icon name="add" size={20} />} onPress={add}>Add a step</Button>
            </div>
          </div>
        </div>
        <PickLeadDialog open={addOpen} onClose={() => setAddOpen(false)} leads={leads} allowStudio title="Add these tasks to which lead?" confirmLabel="Add tasks"
                        onPick={(leadId) => { setAddOpen(false); void flushRef.current().then(() => addTaskTemplateToLead(template.id, leadId)).then((n) => snackbar({ message: `${n} ${n === 1 ? 'task' : 'tasks'} added`, actionLabel: 'Open', onAction: () => router.push(leadId ? `/leads/${leadId}/tasks` : '/tasks') }), () => snackbar({ message: 'Couldn’t add the tasks — please try again' })) }} />
        <ConfirmDialog open={deleteOpen} title={`Delete ${name.trim() || 'this template'}?`} confirmLabel="Delete" tone="danger"
                       message={usedBy ? `The tasks it already added to ${usedBy} ${usedBy === 1 ? 'lead stay' : 'leads stay'}. You can restore the template from Deleted Templates.` : 'You can restore it from Deleted Templates.'}
                       onCancel={() => setDeleteOpen(false)} onConfirm={() => { setDeleteOpen(false); void deleteTaskTemplate(template.id).then(() => { snackbar({ message: 'Template deleted' }); router.push('/company/templates/tasks') }, () => snackbar({ message: 'Couldn’t delete the template — please try again' })) }} />
        <AiSheet open={aiOpen} suggestions={[]} onSelect={() => { setAiOpen(false); comingSoon() }} onClose={() => setAiOpen(false)} />
        <MaisonFab onPress={() => setAiOpen((o) => !o)} />
      </div>
    </PageReveal>
  )
}

/** One step: the drag handle, its number, title over description, "Due in n days", the members and tags pickers, remove. */
function StepRow({ step, index, team, tags, keepMembers, keepDescription, onPatch, onRemove, onDrop }: { step: Step; index: number; team: Member[]; tags: Tag[]; keepMembers: boolean; keepDescription: boolean; onPatch: (p: Partial<Step>) => void; onRemove: () => void; onDrop: () => void }) {
  const controls = useDragControls()
  const [dragging, setDragging] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const [assignPos, setAssignPos] = useState<{ top: number; left: number } | null>(null)
  const [tagOpen, setTagOpen] = useState(false)
  const [tagEl, setTagEl] = useState<HTMLElement | null>(null)
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
          <button type="button" className={styles.chipBtn} data-on={members.length ? '' : undefined} aria-haspopup="dialog" aria-expanded={assignOpen} disabled={!keepMembers}
                  onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); setAssignPos({ top: r.bottom + 4, left: r.left }); setAssignOpen((o) => !o) }}>
            {members.length ? <span className={styles.avatars}>{members.slice(0, 3).map((m) => <Avatar key={m.id} name={m.name} color={m.color} size={24} tooltip={false} />)}</span> : <Icon name="person_add" size={20} weight={300} />}
            {members.length ? (members.length > 3 ? `+${members.length - 3}` : '') : 'Members'}
          </button>
        </Tooltip>
        <AssignPopover open={assignOpen} team={team} value={step.memberIds} position={assignPos} onClose={() => setAssignOpen(false)} onApply={(ids) => { onPatch({ memberIds: ids }); setAssignOpen(false) }} />
      </span>
      <span className={styles.stepPick}>
        <Tooltip label="Tags">
          <button ref={setTagEl} type="button" className={styles.chipBtn} data-on={stepTags.length ? '' : undefined} aria-haspopup="dialog" aria-expanded={tagOpen} onClick={() => setTagOpen((o) => !o)}>
            <Icon name="sell" size={20} weight={300} />{stepTags.length ? stepTags.map((t) => t.name).join(', ') : 'Tags'}
          </button>
        </Tooltip>
        <TagPicker open={tagOpen} tags={tags} value={step.tagIds} anchor={tagEl} onChange={(ids) => onPatch({ tagIds: ids })} onManage={() => setTagOpen(false)} onClose={() => setTagOpen(false)} />
      </span>
      <Tooltip label="Remove step"><IconButton icon="delete" label={`Remove step ${index + 1}`} onClick={onRemove} /></Tooltip>
    </Reorder.Item>
  )
}
