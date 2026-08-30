'use client'

import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Button, Checkbox, Radio, RadioGroup } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { Avatar } from '@/components/om/avatar'
import { DateField } from '@/components/om/date-field'
import { Tooltip } from '@/components/om/tooltip'
import { useScrollLock } from '@/components/om/use-scroll-lock'
import { modalPanel, overlayFade } from '@/lib/motion'
import { MSG } from '@/lib/forms'
import { parseInputDate } from '@/lib/format'
import { EMPTY_TASK_FILTERS, activeTaskGroups, type TaskFilters, type TaskSort, type TaskStatus } from '@/lib/leads/task-filters'
import type { Member, Tag } from '@/lib/db/schema'
import styles from './tasks-filters-modal.module.css'

/* Lead Details › Tasks › Filters (902:28963, panes 184–189) — the listing FiltersModal shell with the tasks' six groups. */

type Group = 'sort' | 'assignees' | 'creators' | 'status' | 'tags' | 'date'
const TABS: { key: Group; label: string }[] = [
  { key: 'sort', label: 'Sort' },
  { key: 'assignees', label: 'Assignees' },
  { key: 'creators', label: 'Creators' },
  { key: 'status', label: 'Status' },
  { key: 'tags', label: 'Tags' },
  { key: 'date', label: 'Date' },
]
const SORTS: { key: TaskSort; label: string }[] = [
  { key: 'due', label: 'Due date' },
  { key: 'newest', label: 'Newest at the top' },
  { key: 'oldest', label: 'Oldest at the top' },
]
const STATUSES: { key: TaskStatus; label: string }[] = [
  { key: 'open', label: 'Open' },
  { key: 'completed', label: 'Completed' },
]

export function TasksFiltersModal({
  open, team, tags, value, onApply, onClose, now,
}: {
  open: boolean
  team: Member[]
  tags: Tag[]
  value: TaskFilters
  onApply: (v: TaskFilters) => void
  onClose: () => void
  /** Day-granular clock for the pickers' "today" ring (falls back to the mount time — never Date.now() in render). */
  now?: number
}) {
  useScrollLock(open)   // the page never scrolls behind this surface
  const [tab, setTab] = useState<Group>('sort')
  const [draft, setDraft] = useState<TaskFilters>(value)
  const [wasOpen, setWasOpen] = useState(false)
  const [mountedAt] = useState(() => Date.now())

  // Render-phase adjust: every opening starts from the applied value on the Sort pane.
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) { setDraft(value); setTab('sort') }
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !e.defaultPrevented) onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const dots = activeTaskGroups(draft)
  const toggle = (key: 'assignees' | 'creators' | 'tags', v: string) =>
    setDraft((d) => ({ ...d, [key]: d[key].includes(v) ? d[key].filter((x) => x !== v) : [...d[key], v] }))
  const toggleStatus = (s: TaskStatus) =>
    setDraft((d) => ({ ...d, status: d.status.includes(s) ? d.status.filter((x) => x !== s) : [...d.status, s] }))
  const today = useMemo(() => new Date(now ?? mountedAt), [now, mountedAt])
  // DateField only ever holds a picker-chosen date, so the only rule left is the range order.
  const fromD = parseInputDate(draft.from), toD = parseInputDate(draft.to)
  const rangeBad = !!fromD && !!toD && fromD.getTime() > toD.getTime()

  const memberRows = (key: 'assignees' | 'creators') => (
    <div className={styles.list}>
      {team.map((m) => (
        <div key={m.id} className={styles.rowTwo} role="button" tabIndex={0} onClick={() => toggle(key, m.id)}
             onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(key, m.id) } }}>
          <Avatar name={m.name} color={m.color} size={40} />
          <span className={styles.rowText}>
            <span className={styles.rowName}>{m.name}</span>
            <span className={styles.rowRole}>{m.isYou ? `${m.role} (you)` : m.role}</span>
          </span>
          <span onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
            <Checkbox isSelected={draft[key].includes(m.id)} onChange={() => toggle(key, m.id)} aria-label={m.name} />
          </span>
        </div>
      ))}
    </div>
  )

  return (
    <AnimatePresence>
      {open ? (
        <motion.div className={styles.overlay} variants={overlayFade} initial="initial" animate="animate" exit="exit"
                    onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
          <motion.div className={styles.panel} variants={modalPanel} role="dialog" aria-modal aria-label="Filters">
            <div className={styles.heading}>
              <span className={styles.title}>Filters</span>
              <Tooltip label="Close">
                <button type="button" className={styles.close} aria-label="Close" onClick={onClose}>
                  <Icon name="close" size={24} family="outlined" />
                </button>
              </Tooltip>
            </div>
            <div className={styles.body}>
              <div className={styles.rail} role="tablist" aria-label="Filter groups">
                {TABS.map((t) => (
                  <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} className={styles.tab}
                          data-active={tab === t.key || undefined} onClick={() => setTab(t.key)}>
                    <span>{t.label}</span>
                    {dots[t.key] ? <span className={styles.tabDot} aria-label="Has selections" /> : null}
                  </button>
                ))}
              </div>
              <div className={styles.content} role="tabpanel">
                {tab === 'sort' ? (
                  <>
                    <span className={styles.sectionTitle}>Sort by</span>
                    <RadioGroup aria-label="Sort by" value={draft.sort} onChange={(v) => setDraft((d) => ({ ...d, sort: v as TaskSort }))}>
                      {SORTS.map((s) => (
                        <div key={s.key} className={styles.sortRow}><Radio value={s.key}>{s.label}</Radio></div>
                      ))}
                    </RadioGroup>
                  </>
                ) : tab === 'assignees' ? (
                  <>
                    <span className={styles.sectionTitle}>Assignees</span>
                    {memberRows('assignees')}
                  </>
                ) : tab === 'creators' ? (
                  <>
                    <span className={styles.sectionTitle}>Creators</span>
                    {memberRows('creators')}
                  </>
                ) : tab === 'status' ? (
                  <>
                    <span className={styles.sectionTitle}>Status</span>
                    <div className={styles.chips} role="group" aria-label="Status">
                      {STATUSES.map((s) => (
                        <button key={s.key} type="button" className={styles.chip} aria-pressed={draft.status.includes(s.key)}
                                data-selected={draft.status.includes(s.key) || undefined} onClick={() => toggleStatus(s.key)}>
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </>
                ) : tab === 'tags' ? (
                  <>
                    <span className={styles.sectionTitle}>Tags</span>
                    <div className={styles.list}>
                      {tags.map((g) => (
                        <div key={g.id} className={styles.row} role="button" tabIndex={0} onClick={() => toggle('tags', g.id)}
                             onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle('tags', g.id) } }}>
                          <span>{g.name}</span>
                          <span onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                            <Checkbox isSelected={draft.tags.includes(g.id)} onChange={() => toggle('tags', g.id)} aria-label={g.name} />
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <span className={styles.sectionTitle}>Dates</span>
                    <div className={styles.dateRow}>
                      <DateField label="From" value={draft.from} today={today} error={rangeBad || undefined}
                                 onChange={(v) => setDraft((d) => ({ ...d, from: v }))} />
                      <DateField label="To" value={draft.to} today={today} error={rangeBad ? MSG.dateRange : undefined}
                                 onChange={(v) => setDraft((d) => ({ ...d, to: v }))} />
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className={styles.footer}>
              <Button variant="secondary" appearance="outlined" onPress={() => setDraft(EMPTY_TASK_FILTERS)}>Clear All</Button>
              <Button onPress={() => { if (rangeBad) return; onApply(draft); onClose() }} isDisabled={rangeBad}>Apply</Button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
