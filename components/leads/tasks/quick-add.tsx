'use client'

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { Button } from '@/components/ds'
import { Avatar } from '@/components/om/avatar'
import { Icon } from '@/components/om/icon'
import type { Member } from '@/lib/db/schema'
import { DuePresetChips } from './due-presets'
import styles from './quick-add.module.css'

/** The pill's words for the new task's members: "Dane", "Dane +1", or "Assign" while nobody is on it. */
export function whoWords(members: Member[]): string {
  if (!members.length) return 'Assign'
  const first = members[0]!.name.split(/\s+/)[0] ?? members[0]!.name
  return members.length > 1 ? `${first} +${members.length - 1}` : first
}

/**
 * (Leads on the move, L4 — P-10 · C-06 · C-20 · C-08) Add a task on a phone or a touch tablet: one docked row — "Add a task…" at 16 — and, once
 * it is in use, the due presets (Tomorrow 10:00 · In 3 days · Next week · Pick a day) and who it is for, in the same row of chips. Enter or Add
 * saves it with its day and its members and keeps the field for the next one (REG-257's chain); Esc lets it go. "Call back tomorrow at 10" is
 * a title and one tap. The desk keeps its inline add row (frame 194). The members start as the lead's (T4); the pill opens the Assign sheet.
 * On the rail's Tasks page the lead's pill rides in the same row (`lead`). The right end of the row stays clear for the Maison AI button
 * when it rests there (C-08), so neither covers the other.
 */
export function QuickAddTask({ now, members, onAssign, onSubmit, lead, focusKey = 0, onIdle }: {
  now: number
  members: Member[]
  onAssign: (anchor: HTMLElement) => void
  onSubmit: (title: string, dueAt: Date | null) => void
  /** (REG-466) The rail page's Lead pill — Studio, or a lead / project. */
  lead?: ReactNode
  /** Bumped by the toolbar's Create New Task (and Create › Task): the caret lands in the field. */
  focusKey?: number
  /** The row was let go (Esc) — the host's "adding" ends. */
  onIdle?: () => void
}) {
  const [title, setTitle] = useState('')
  const [due, setDue] = useState<Date | null>(null)
  const [active, setActive] = useState(false)
  const field = useRef<HTMLInputElement>(null)
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!focusKey) return
    /* the page may still be `inert` under its ghost (REG-708): try each frame for a moment, as the desk's add row does */
    let tries = 0, raf = 0
    const land = () => {
      const el = field.current
      if (!el) return
      el.focus()
      if (document.activeElement === el) { el.scrollIntoView({ block: 'nearest' }); return }
      if (tries++ < 120) raf = requestAnimationFrame(land)
    }
    land()
    return () => cancelAnimationFrame(raf)
  }, [focusKey])
  const open = active || title.trim() !== '' || due !== null
  const submit = () => {
    const t = title.trim()
    if (!t) return
    onSubmit(t, due)
    setTitle(''); setDue(null)
    field.current?.focus()
  }
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); submit() }
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setTitle(''); setDue(null); setActive(false); field.current?.blur(); onIdle?.() }
  }
  return (
    <div ref={box} className={styles.quick} data-open={open || undefined} data-testid="task-quick-add"
         onFocus={() => setActive(true)}
         onBlur={(e) => {
           if (e.relatedTarget instanceof Node && box.current?.contains(e.relatedTarget)) return
           setActive(false)
         }}>
      <div className={styles.line}>
        <Icon name="add" size={24} className={styles.lead} />
        <input ref={field} className={styles.input} value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={onKeyDown}
               placeholder="Add a task…" aria-label="New task" enterKeyHint="done" autoComplete="off" data-testid="task-quick-input" />
        {title.trim() ? <Button className={styles.add} onPress={submit} data-testid="task-quick-save">Add</Button> : null}
      </div>
      <div className={styles.opts} data-testid="task-quick-opts">
        <DuePresetChips value={due} onChange={(d) => { setDue(d); field.current?.focus() }} now={now} scroll testId="task-quick-due" />
        <button type="button" className={styles.who} onClick={(e) => onAssign(e.currentTarget)} aria-haspopup="dialog"
                aria-label={members.length ? `Members of the new task: ${members.map((m) => m.name).join(', ')} — change` : 'Assign the new task'} data-testid="task-quick-who">
          {members.length ? <Avatar name={members[0]!.name} color={members[0]!.color} size={24} tooltip={false} /> : <Icon name="person_add" size={20} />}
          <span>{whoWords(members)}</span>
          <Icon name="keyboard_arrow_down" size={20} />
        </button>
        {lead}
      </div>
    </div>
  )
}
