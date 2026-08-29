'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { FloatingField } from '@/components/leads/move-stage/fields'
import { anchoredSurface, duration, ease } from '@/lib/motion'
import { displayDate, isDueToday, isOverdue } from '@/lib/format'
import { DatePicker, focusDatePicker } from '@/components/om/date-picker'
import { toDMY } from '@/lib/leads/filters'
import type { LeadRow } from '@/lib/leads/queries'
import type { LeadTask } from '@/lib/db/schema'
import styles from './tasks-popover.module.css'

function parseDMY(s: string): Date | null {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s.trim())
  if (!m) return null
  const dt = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]))
  return dt.getDate() === Number(m[1]) && dt.getMonth() === Number(m[2]) - 1 ? dt : null
}

export type TasksPos = { top: number; left: number; seq: number }

function TaskRow({
  task, now, completing, onComplete, onOpen, onSetDue,
}: {
  task: LeadTask
  now: number
  completing: boolean
  onComplete: (task: LeadTask) => void
  onOpen: () => void
  onSetDue: (task: LeadTask, due: Date) => Promise<boolean>
}) {
  const [editingDue, setEditingDue] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const dueRef = useRef<HTMLInputElement>(null)
  const [dueText, setDueText] = useState('')
  const [dueError, setDueError] = useState(false)
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
    setEditingDue(false)
    setPendingDue(d)
    const ok = await onSetDue(task, d)
    committing.current = false
    if (!ok) setPendingDue(null)
  }
  const commitDue = async () => {
    const d = parseDMY(dueText)
    if (!d) { setDueError(true); return }
    await commitDate(d)
  }

  return (
    <motion.div
      layout
      className={styles.row}
      data-overdue={overdue || undefined}
      initial={false}
      exit={{ opacity: 0, height: 0, transition: { duration: duration.step, ease: ease.standard } }}
    >
      <button type="button" className={styles.radio} data-done={completing || undefined}
              aria-label={`Complete "${task.title}"`} disabled={completing}
              onClick={() => onComplete(task)}>
        <Icon name={completing ? 'check_circle' : 'radio_button_unchecked'} size={20} weight={300} fill={completing} />
      </button>
      <span className={styles.rowMain}>
        <span className={styles.rowTitle}>{task.title}</span>
        {due ? (
          <span className={styles.rowMeta}>
            {task.kind}
            <span data-dot>·</span>
            {overdue ? (
              <><span data-red>{displayDate(due)}</span><span data-red>(Overdue)</span></>
            ) : dueToday ? (
              <span data-amber>Due today</span>
            ) : (
              <span>{displayDate(due)}</span>
            )}
          </span>
        ) : editingDue ? (
            <input
              ref={dueRef}
              className={styles.dueInput}
              data-error={dueError || undefined}
              aria-label="Due date (d/m/yyyy)"
              placeholder="d/m/yyyy"
              value={dueText}
              autoFocus
              onFocus={() => setPickerOpen(true)}
              onClick={() => setPickerOpen(true)}
              onChange={(e) => { setDueText(e.target.value); setDueError(false) }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); void commitDue() }
                if (e.key === 'ArrowDown' && pickerOpen) { e.preventDefault(); focusDatePicker() }   // keyboard: hand focus to the calendar
                if (e.key === 'Escape' && !e.defaultPrevented) { e.preventDefault(); e.stopPropagation(); setEditingDue(false) }   // the picker consumes its own Esc first
              }}
              onBlur={(e) => {
                if ((e.relatedTarget as HTMLElement | null)?.closest('#om-date-picker')) return   // focus moved into the calendar
                if (dueText.trim()) void commitDue(); else setEditingDue(false)
              }}
            />
        ) : (
          <button type="button" className={styles.setDue} onClick={() => { setDueText(''); setDueError(false); setEditingDue(true); setPickerOpen(true) }}>
            <Icon name="calendar_add_on" size={16} />
            Set Due Date
          </button>
        )}
        {/* Material date picker (789:84100) anchored to the due field; mounted once so open→closed animates. Picking a day commits it. */}
        <DatePicker open={editingDue && pickerOpen} anchorRef={dueRef} value={due} today={new Date(now)} label="Due date"
                    onSelect={(d) => { setDueText(toDMY(d)); void commitDate(d) }} onClose={() => setPickerOpen(false)} />
      </span>
      <button type="button" className={`${styles.chev} ${styles.chevBtn}`} aria-label={`Open "${task.title}"`} onClick={onOpen}>
        <Icon name="keyboard_arrow_right" size={20} />
      </button>
    </motion.div>
  )
}

export function TasksPopover({
  lead, pos, now, onClose, onAddTask, onCompleteTask, onSetDue, onOpenTask,
}: {
  lead: LeadRow | null
  pos: TasksPos | null
  now: number
  onClose: () => void
  /** Each mutation resolves true on success, false on failure (caller shows the snackbar). */
  onAddTask: (lead: LeadRow, title: string) => Promise<boolean>
  onCompleteTask: (lead: LeadRow, task: LeadTask) => Promise<boolean>
  onSetDue: (lead: LeadRow, task: LeadTask, due: Date) => Promise<boolean>
  onOpenTask: () => void
}) {
  const open = lead !== null && pos !== null
  const ref = useRef<HTMLDivElement>(null)
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [completing, setCompleting] = useState<Set<string>>(new Set())
  const [wasOpen, setWasOpen] = useState(false)
  const savingRef = useRef(false)

  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) { setAdding(false); setDraft(''); setSaving(false); setCompleting(new Set()) }
  }

  useEffect(() => {
    if (open) savingRef.current = false
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return
      e.preventDefault()
      // Layer policy: an open add-area is the topmost layer — Esc mirrors Cancel.
      if (adding) { setAdding(false); setDraft('') } else onClose()
    }
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    // Anchored at click-time coordinates: any scroll/resize detaches it, so close.
    const onScroll = (e: Event) => {
      if (ref.current && e.target instanceof Node && ref.current.contains(e.target)) return
      onClose()
    }
    document.addEventListener('keydown', onKey)
    const t = setTimeout(() => document.addEventListener('mousedown', onDown), 0)
    document.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onClose)
    return () => {
      document.removeEventListener('keydown', onKey)
      clearTimeout(t)
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onClose)
    }
  }, [open, adding, onClose])

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
          <div className={styles.head}>
            <span className={styles.title}>Tasks</span>
            <button type="button" className={styles.close} aria-label="Close" onClick={onClose}>
              <Icon name="close" size={24} family="outlined" />
            </button>
          </div>
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
          {adding ? (
            <div className={styles.addArea}
                 onKeyDown={(e) => { if (e.key === 'Enter' && !saving) { e.preventDefault(); void save() } }}>
              <FloatingField label="Describe your task" value={draft} onChange={setDraft} trailingIcon={null} />
              <div className={styles.addBtns}>
                <Button variant="secondary" onPress={() => { setAdding(false); setDraft('') }} isDisabled={saving}>Cancel</Button>
                <Button onPress={() => { void save() }} isDisabled={!draft.trim() || saving}>Save</Button>
              </div>
            </div>
          ) : (
            <div className={styles.foot}>
              <Button onPress={() => setAdding(true)}>Add Task</Button>
            </div>
          )}
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
