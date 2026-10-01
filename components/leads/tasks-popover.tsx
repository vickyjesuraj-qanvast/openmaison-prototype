'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { Tooltip } from '@/components/om/tooltip'
import { TextField } from '@/components/om/text-field'
import { anchoredSurface, duration, ease } from '@/lib/motion'
import { displayDue, displayTime, hasTime, isDueToday, isOverdue, phoneLocal } from '@/lib/format'
import { DatePicker, focusDatePicker } from '@/components/om/date-picker'
import { Sheet, useSheetLayout } from '@/components/om/sheet'
import { FootStart, SurfaceFoot, SurfaceHead } from '@/components/om/dialog'
import type { LeadRow } from '@/lib/leads/queries'
import type { LeadTask } from '@/lib/db/schema'
import styles from './tasks-popover.module.css'

export type TasksPos = { top: number; left: number; seq: number }

function TaskRow({
  task, now, completing, onComplete, onOpen, onSetDue,
}: {
  task: LeadTask
  now: number
  completing: boolean
  onComplete: (task: LeadTask) => void
  onOpen: (task: LeadTask) => void
  onSetDue: (task: LeadTask, due: Date) => Promise<boolean>
}) {
  // Dates are never typed (REG-119): the "Set Due Date" link is the read-only trigger for the Material picker.
  const [pickerOpen, setPickerOpen] = useState(false)
  const dueRef = useRef<HTMLButtonElement>(null)
  // Optimistic due date: shown immediately, replaced by the server value.
  const [pendingDue, setPendingDue] = useState<Date | null>(null)
  const committing = useRef(false)

  const due = task.dueAt ?? pendingDue
  const overdue = isOverdue(due, now)
  const dueToday = isDueToday(due, now)

  const commitDate = async (d: Date) => {
    if (committing.current) return
    committing.current = true
    setPickerOpen(false)
    setPendingDue(d)
    const ok = await onSetDue(task, d)
    committing.current = false
    if (!ok) setPendingDue(null)
  }

  return (
    <motion.div
      layout
      className={styles.row}
      data-overdue={overdue || undefined}
      /* (REG-328) The card itself opens the task; a press on one of its own controls — the radio, Set Due Date, the chevron —
         or inside the date picker is theirs. Keyboard users keep the chevron button, so the card takes no tab stop of its own. */
      onClick={(e) => { const t = e.target as HTMLElement; if (t.closest('button, a') || !e.currentTarget.contains(t)) return; onOpen(task) }}   /* the date picker is portalled: its presses reach here through React but sit outside the card */
      initial={false}
      exit={{ opacity: 0, height: 0, transition: { duration: duration.step, ease: ease.standard } }}
    >
      <Tooltip label={`Complete "${task.title}"`} disabled={completing}>
        <button type="button" className={styles.radio} data-done={completing || undefined}
                aria-label={`Complete "${task.title}"`} disabled={completing}
                onClick={() => onComplete(task)}>
          <Icon name={completing ? 'check_circle' : 'radio_button_unchecked'} size={20} weight={300} fill={completing} />
        </button>
      </Tooltip>
      <span className={styles.rowMain}>
        <span className={styles.rowTitle}>{task.title}</span>
        {due ? (
          <span className={styles.rowMeta}>
            {task.kind}
            <span data-dot>·</span>
            {/* (Dane UAT 5.13 · 5.05) the due's day, and its time when it has one — as the Tasks tab prints it */}
            {overdue ? (
              <><span data-red>{displayDue(due)}</span><span data-red>(Overdue)</span></>
            ) : dueToday ? (
              <span data-amber>{hasTime(due) ? `Due today · ${displayTime(due)}` : 'Due today'}</span>
            ) : (
              <span>{displayDue(due)}</span>
            )}
          </span>
        ) : (
          <button ref={dueRef} type="button" className={styles.setDue}
                  aria-haspopup="dialog" aria-expanded={pickerOpen}
                  onClick={() => setPickerOpen((o) => !o)}
                  onKeyDown={(e) => { if (e.key === 'ArrowDown' && pickerOpen) { e.preventDefault(); focusDatePicker() } /* keyboard: hand focus to the calendar */ }}>
            <Icon name="calendar_add_on" size={16} />
            Set Due Date
          </button>
        )}
        {/* Material date picker (789:84100) anchored to the link; mounted once so open→closed animates. Picking a day is the only way to set a date — it commits at once. */}
        <DatePicker open={pickerOpen} anchorRef={dueRef} value={due} today={new Date(now)} label="Due date"
                    onSelect={(d) => { void commitDate(d) }} onClose={() => setPickerOpen(false)} />
      </span>
      <Tooltip label={`Open "${task.title}"`}>
        <button type="button" className={`${styles.chev} ${styles.chevBtn}`} aria-label={`Open "${task.title}"`} onClick={() => onOpen(task)}>
          <Icon name="keyboard_arrow_right" size={20} />
        </button>
      </Tooltip>
    </motion.div>
  )
}

export function TasksPopover({
  lead, pos, anchor = null, now, onClose, onAddTask, onCompleteTask, onSetDue, onOpenTask,
}: {
  lead: LeadRow | null
  pos: TasksPos | null
  now: number
  /** The task box / Add task link that opened it — a press there toggles instead of close-then-reopen (REG-136). */
  anchor?: HTMLElement | null
  onClose: () => void
  /** Each mutation resolves true on success, false on failure (caller shows the snackbar). */
  onAddTask: (lead: LeadRow, title: string) => Promise<boolean>
  onCompleteTask: (lead: LeadRow, task: LeadTask) => Promise<boolean>
  onSetDue: (lead: LeadRow, task: LeadTask, due: Date) => Promise<boolean>
  onOpenTask: (task: LeadTask) => void
}) {
  const open = lead !== null && pos !== null
  const sheet = useSheetLayout()
  const ref = useRef<HTMLDivElement>(null)
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [completing, setCompleting] = useState<Set<string>>(new Set())
  const [wasOpen, setWasOpen] = useState(false)
  const savingRef = useRef(false)

  if (open !== wasOpen) {
    setWasOpen(open)
    // A lead with no tasks shows "+ Add task" in the cell, so opening the popover IS the add intent — start composing
    // instead of making the user press Add Task again inside it (user 2026-08-31). With tasks, the list comes first.
    if (open) { setAdding(lead !== null && lead.tasks.length === 0); setDraft(''); setSaving(false); setCompleting(new Set()) }
  }

  useEffect(() => {
    if (open) savingRef.current = false
  }, [open])

  useEffect(() => {
    if (!open || sheet) return   // ≤767 the Sheet owns Esc and its own scrim press (REG-353)
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return
      e.preventDefault()
      // Layer policy: an open add-area is the topmost layer — Esc mirrors Cancel.
      if (adding) { setAdding(false); setDraft('') } else onClose()
    }
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (anchor && anchor.contains(t)) return          // the trigger's own click toggles (REG-136)
      if (t instanceof Element && t.closest('#om-date-picker')) return   // the due-date picker portals to body — a press inside it is not outside
      if (ref.current && !ref.current.contains(t)) onClose()
    }
    // Scrolling does not close it: the workspace follow effect keeps it on its cell (REG-129).
    document.addEventListener('keydown', onKey)
    const t = setTimeout(() => document.addEventListener('pointerdown', onDown, true), 0)   // capture: DS (React Aria) buttons stop pointerdown propagation (REG-153)
    return () => {
      document.removeEventListener('keydown', onKey)
      clearTimeout(t)
      document.removeEventListener('pointerdown', onDown, true)
    }
  }, [open, adding, onClose, anchor, sheet])

  const save = async () => {
    if (!lead || !draft.trim() || savingRef.current) return
    savingRef.current = true
    setSaving(true)
    const ok = await onAddTask(lead, draft.trim())
    setSaving(false)
    savingRef.current = false
    // Failure keeps the draft in place for a retry.
    if (ok) { setAdding(false); setDraft('') }
  }

  const complete = async (task: LeadTask) => {
    if (!lead || completing.has(task.id)) return
    setCompleting((s) => new Set(s).add(task.id))
    const ok = await onCompleteTask(lead, task)
    if (!ok) setCompleting((s) => { const n = new Set(s); n.delete(task.id); return n })
  }

  const openCount = lead ? lead.tasks.filter((t) => !completing.has(t.id)).length : 0

  const inner = lead ? (
    <div className={styles.body}>
      <span className={styles.sectionLabel}>Open Tasks <span data-dot>·</span> <span>{openCount}</span></span>
      <div className={styles.list}>
        <AnimatePresence initial={false}>
          {lead.tasks.map((t) => (
            <TaskRow key={t.id} task={t} now={now} completing={completing.has(t.id)}
                     onComplete={(task) => { void complete(task) }}
                     onOpen={onOpenTask}
                     onSetDue={(task, d) => onSetDue(lead, task, d)} />
          ))}
        </AnimatePresence>
        {lead.tasks.length === 0 ? (
          <span className={styles.empty}>No open tasks yet.</span>
        ) : null}
      </div>
    </div>
  ) : null

  /* (REG-353) ≤767 this is the canvas' "Open tasks" bottom sheet (1i): the lead names the heading, the rows and the
     composer are unchanged, and Add Task is the sheet's pinned action row. */
  if (sheet) {
    return (
      <Sheet open={open} onClose={onClose} title={lead?.name} subtitle={lead ? `${phoneLocal(lead.phone)} · Current stage: ${lead.stage}` : undefined}
             footer={adding ? null : <Button onPress={() => setAdding(true)}>Add Task</Button>}>
        {inner}
        {adding ? (
          <div className={styles.addArea}
               onKeyDown={(e) => { if (e.key === 'Enter' && !saving) { e.preventDefault(); void save() } }}>
            <TextField label="Describe your task" required value={draft} onChange={setDraft} trailingIcon={null} autoFocus />
            <div className={styles.addBtns}>
              <Button variant="secondary" onPress={() => { setAdding(false); setDraft('') }} isDisabled={saving}>Cancel</Button>
              <Button onPress={() => { void save() }} isDisabled={!draft.trim() || saving}>Save</Button>
            </div>
          </div>
        ) : null}
      </Sheet>
    )
  }

  return (
    <AnimatePresence>
      {open && lead && pos ? (
        <motion.div
          key={pos.seq}
          ref={ref}
          className={styles.pop}
          style={{ top: pos.top, left: pos.left, transformOrigin: 'top left' }}
          variants={anchoredSurface} initial="initial" animate="animate" exit="exit"
          role="dialog" aria-label={`Tasks for ${lead.name}`}
        >
          {/* (REG-725) the house head and foot (components/om/dialog.tsx): the 64 head with its rule inside and the outlined close; the
              foot's top rule, Add Task on its left as the mock draws it (779:24722). The composer below keeps its own row. */}
          <SurfaceHead title="Tasks" onClose={onClose} />
          {inner}
          {adding ? (
            <div className={styles.addArea}
                 onKeyDown={(e) => { if (e.key === 'Enter' && !saving) { e.preventDefault(); void save() } }}>
              {/* The composer always opens focused — it only exists because the user asked to write something. */}
              <TextField label="Describe your task" required value={draft} onChange={setDraft} trailingIcon={null} autoFocus />
              <div className={styles.addBtns}>
                <Button variant="secondary" onPress={() => { setAdding(false); setDraft('') }} isDisabled={saving}>Cancel</Button>
                <Button onPress={() => { void save() }} isDisabled={!draft.trim() || saving}>Save</Button>
              </div>
            </div>
          ) : (
            <SurfaceFoot>
              <FootStart><Button onPress={() => setAdding(true)}>Add Task</Button></FootStart>
            </SurfaceFoot>
          )}
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
