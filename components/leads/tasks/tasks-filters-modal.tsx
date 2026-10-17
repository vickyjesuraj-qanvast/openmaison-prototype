'use client'

import { useMemo, useRef, useState } from 'react'
import { useLiveApply } from '@/components/om/use-live-apply'
import { AnimatePresence, motion } from 'motion/react'
import { Button, Checkbox, Radio, RadioGroup, SearchBar } from '@/components/ds'
import { useOverflow } from '@/components/om/use-overflow'
import { Avatar } from '@/components/om/avatar'
import { DateField } from '@/components/om/date-field'
import { SurfaceFoot, SurfaceHead, surfaceClasses } from '@/components/om/dialog'
import { Chips } from '@/components/om/chips'
import { useScrollLock } from '@/components/om/use-scroll-lock'
import { useDialogFocus, useEscapeLayer } from '@/components/om/surface'
import { bottomSheet, modalPanel, overlayFade } from '@/lib/motion'
import { useSheetLayout } from '@/components/om/sheet'
import { MSG } from '@/lib/forms'
import { parseInputDate } from '@/lib/format'
import { EMPTY_TASK_FILTERS, activeTaskGroups, type TaskFilters, type TaskSort, type TaskStatus } from '@/lib/leads/task-filters'
import type { Member, Tag } from '@/lib/db/schema'
import type { TaskLead } from '@/lib/leads/tasks'
import { STAGES } from '@/lib/leads/enums'
import styles from './tasks-filters-modal.module.css'

/* Lead Details › Tasks › Filters (902:28963, panes 184–189) — the listing FiltersModal shell with the tasks' six groups. */

type Group = 'sort' | 'assignees' | 'creators' | 'status' | 'tags' | 'date' | 'leads' | 'stages' | 'milestones' | 'projects'
const TABS: { key: Group; label: string }[] = [
  { key: 'sort', label: 'Sort' },
  { key: 'assignees', label: 'Members' },   /* REG-290 */
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
  open, team, tags, value, onApply, onClose, now, leads, milestones, projects, outside = [], headSort = null, onClearHead,
}: {
  /** (pending modules S05) a column head's own order, while one is on — the Contracts / Quotes Filters' words; choosing an order here takes it off */
  headSort?: string | null
  onClearHead?: () => void
  /** (gaps build, package C — M-03) The outside people on the tasks — the Members pane lists them after the studio's members. */
  outside?: { key: string; name: string; line: string }[]
  /** (fix-A, A-20) The rail's Tasks page hands the projects its tasks belong to: one more pane, Project (number · name). */
  projects?: { id: string; number: string; name: string }[]
  /** (Projects round 2) A project's lead hands its milestones: one more pane, Milestone. */
  milestones?: { id: string; title: string }[]
  /** The rail's Tasks page (REG-466) hands the live leads: two more panes, Lead and Stage. */
  leads?: TaskLead[]
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
  const tabs = [...(leads ? [...TABS, { key: 'leads' as Group, label: 'Lead' }, { key: 'stages' as Group, label: 'Stage' }] : TABS), ...(projects?.length ? [{ key: 'projects' as Group, label: 'Project' }] : []), ...(milestones?.length ? [{ key: 'milestones' as Group, label: 'Milestone' }] : [])]
  const [draft, setDraft] = useState<TaskFilters>(value)
  /* (Dane UAT 11.03) The Lead pane's search — the listing's Property types / Sources panes (components/leads/filters-modal.tsx): the house
     filled box at the pane's top, a "No leads match" line; it empties on a new pane and on every opening. */
  const [q, setQ] = useState('')
  const [wasOpen, setWasOpen] = useState(false)
  const [mountedAt] = useState(() => Date.now())
  /* (REG-287) `aria-modal` promised assistive tech the page behind is inert, but the panel only locked scrolling:
     Tab from Apply walked straight back out into the table. The app's surface policy does all three
     (components/om/surface.ts, as in components/om/dialog.tsx): Esc closes the TOPMOST surface only — so the Date
     pane's picker keeps its own Esc — focus moves onto the panel on open, Tab cycles inside it, and focus returns
     to the Filters button on close. */
  const panel = useRef<HTMLDivElement>(null)
  /* (REG-353) ≤767 this modal is the canvas' bottom sheet: it rises off the bottom edge and wears the grabber. */
  const sheet = useSheetLayout()
  useEscapeLayer(open, panel, onClose)
  useDialogFocus(open, panel)
  const [scrollRef, bodyScrolls] = useOverflow()   // the footer's shadow follows the body's scroll (REG-322)

  // Render-phase adjust: every opening starts from the applied value on the Sort pane.
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) { setDraft(value); setTab('sort'); setQ('') }
  }

  const dots = { ...activeTaskGroups(draft), sort: activeTaskGroups(draft).sort || !!headSort }
  const toggle = (key: 'assignees' | 'creators' | 'tags' | 'leads', v: string) =>
    setDraft((d) => ({ ...d, [key]: d[key].includes(v) ? d[key].filter((x) => x !== v) : [...d[key], v] }))
  const today = useMemo(() => new Date(now ?? mountedAt), [now, mountedAt])
  const needle = q.trim().toLowerCase()
  const leadRows = [{ id: 'studio', name: 'Studio', stage: 'No lead' }, ...(leads ?? [])].filter((l) => !needle || l.name.toLowerCase().includes(needle) || l.stage.toLowerCase().includes(needle))
  // DateField only ever holds a picker-chosen date, so the only rule left is the range order.
  const fromD = parseInputDate(draft.from), toD = parseInputDate(draft.to)
  const rangeBad = !!fromD && !!toD && fromD.getTime() > toD.getTime()
  /* (REG-464) Every change filters the list behind the modal as it happens; an inverted date range waits until it is fixed. */
  useLiveApply(open, draft, value, !rangeBad, onApply)

  const memberRows = (key: 'assignees' | 'creators') => (
    <div className={styles.list}>
      {team.map((m) => (
        <div key={m.id} className={styles.rowTwo} role="button" tabIndex={0} onClick={() => toggle(key, m.id)}
             onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(key, m.id) } }}>
          <Avatar name={m.name} color={m.color} size={40} tooltip={false} />
          <span className={styles.rowText}>
            <span className={styles.rowName}>{m.name}</span>
            <span className={styles.rowRole}>{m.isYou ? `${m.role} (you)` : m.role}</span>
          </span>
          <span onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
            <Checkbox isSelected={draft[key].includes(m.id)} onChange={() => toggle(key, m.id)} aria-label={m.name} />
          </span>
        </div>
      ))}
      {/* (gaps build, package C — M-03) the subcontractors and suppliers on the tasks, after the members — the badge, their name and kind */}
      {key === 'assignees' && outside.length ? (
        <>
          <span className={styles.sectionTitle}>Outside the studio</span>
          {outside.map((o) => (
            <div key={o.key} className={styles.rowTwo} role="button" tabIndex={0} onClick={() => toggle('assignees', o.key)} data-testid="filter-outside"
                 onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle('assignees', o.key) } }}>
              <span className={styles.rowText}>
                <span className={styles.rowName}>{o.name}</span>
                <span className={styles.rowRole}>{o.line.split(' · ').slice(1).join(' · ')}</span>
              </span>
              <span onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                <Checkbox isSelected={draft.assignees.includes(o.key)} onChange={() => toggle('assignees', o.key)} aria-label={o.name} />
              </span>
            </div>
          ))}
        </>
      ) : null}
    </div>
  )

  return (
    <AnimatePresence>
      {open ? (
        <motion.div className={styles.overlay} variants={overlayFade} initial="initial" animate="animate" exit="exit"
                    onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
          {/* (REG-287) tabIndex={-1} so the panel can hold focus; the shared panel's `outline: none` (surfaceClasses.panel)
              leaves the ring to the panel's own controls. */}
          <motion.div ref={panel} className={`${surfaceClasses.panel} ${styles.panel}`} variants={sheet ? bottomSheet : modalPanel}
                      role="dialog" aria-modal aria-label="Filters" tabIndex={-1}>
            {sheet ? <span className={surfaceClasses.grabber} aria-hidden /> : null}
            {/* (REG-725) the house head and foot */}
            <SurfaceHead title="Filters" onClose={onClose} />
            <div className={styles.body}>
              <div className={styles.rail} role="tablist" aria-label="Filter groups">
                {tabs.map((t) => (
                  <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} className={styles.tab}
                          data-active={tab === t.key || undefined} onClick={() => { setTab(t.key); setQ('') }}>
                    <span>{t.label}</span>
                    {dots[t.key] ? <span className={styles.tabDot} aria-label="Has selections" /> : null}
                  </button>
                ))}
              </div>
              <div ref={scrollRef} className={styles.content} role="tabpanel">
                {tab === 'sort' ? (
                  <>
                    <span className={styles.sectionTitle}>Sort by</span>
                    {headSort ? <span className={styles.rowRole} data-testid="filters-head-sort">Sorted by the {headSort} column. Choose an order below to sort by it instead.</span> : null}
                    <RadioGroup aria-label="Sort by" value={headSort ? '' : draft.sort} onChange={(v) => { onClearHead?.(); setDraft((d) => ({ ...d, sort: v as TaskSort })) }}>
                      {SORTS.map((s) => (
                        <div key={s.key} className={styles.sortRow}><Radio value={s.key}>{s.label}</Radio></div>
                      ))}
                    </RadioGroup>
                  </>
                ) : tab === 'assignees' ? (
                  <>
                    <span className={styles.sectionTitle}>Members</span>
                    {memberRows('assignees')}
                  </>
                ) : tab === 'creators' ? (
                  <>
                    <span className={styles.sectionTitle}>Creators</span>
                    {memberRows('creators')}
                  </>
                ) : tab === 'leads' ? (
                  <>
                    <SearchBar size="md" appearance="filled" placeholder="Search" aria-label="Search leads" value={q} onChange={setQ} className={styles.search} />
                    <span className={styles.sectionTitle}>Lead</span>
                    <div className={styles.list}>
                      {/* (REG-274) a row is found by what it shows — the lead's name and its stage line */}
                      {leadRows.map((l) => (
                        <div key={l.id} className={styles.rowTwo} role="button" tabIndex={0} onClick={() => toggle('leads', l.id)}
                             onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle('leads', l.id) } }}>
                          <span className={styles.rowText}>
                            <span className={styles.rowName}>{l.name}</span>
                            <span className={styles.rowRole}>{l.stage}</span>
                          </span>
                          <span onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                            <Checkbox isSelected={draft.leads.includes(l.id)} onChange={() => toggle('leads', l.id)} aria-label={l.name} />
                          </span>
                        </div>
                      ))}
                      {leadRows.length === 0 ? <span className={styles.noMatch}>No leads match “{q}”.</span> : null}
                    </div>
                  </>
                ) : tab === 'stages' ? (
                  <>
                    <span className={styles.sectionTitle}>Stage</span>
                    {/* (REG-729) the house chip group (REG-614), several at once */}
                    <Chips multiple label="Stage" options={STAGES} value={draft.stages} onChange={(v) => setDraft((d) => ({ ...d, stages: v }))} />
                  </>
                ) : tab === 'projects' ? (
                  <>
                    <span className={styles.sectionTitle}>Project</span>
                    {/* (fix-A, A-20) the house chip group, several at once — a direct project's tasks have no lead to filter by */}
                    <Chips multiple label="Project" options={(projects ?? []).map((p) => ({ value: p.id, label: `${p.number} · ${p.name}` }))} value={draft.projects ?? []} onChange={(v) => setDraft((d) => ({ ...d, projects: v }))} />
                  </>
                ) : tab === 'milestones' ? (
                  <>
                    <span className={styles.sectionTitle}>Milestone</span>
                    {/* (Projects round 2) the house chip group, several at once — and the tasks that sit in none */}
                    <Chips multiple label="Milestone" options={[...(milestones ?? []).map((m) => ({ value: m.id, label: m.title })), { value: 'none', label: 'In no milestone' }]} value={draft.milestones ?? []} onChange={(v) => setDraft((d) => ({ ...d, milestones: v }))} />
                  </>
                ) : tab === 'status' ? (
                  <>
                    <span className={styles.sectionTitle}>Status</span>
                    <Chips multiple label="Status" options={STATUSES.map((s) => ({ value: s.key, label: s.label }))} value={draft.status}
                           onChange={(v) => setDraft((d) => ({ ...d, status: v as TaskStatus[] }))} />
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
            <SurfaceFoot shadow={bodyScrolls}>
              <Button variant="secondary" appearance="outlined" onPress={() => setDraft(EMPTY_TASK_FILTERS)}>Clear All</Button>
              {/* (REG-464) The draft is already applied — Done only closes. */}
              <Button onPress={onClose}>Done</Button>
            </SurfaceFoot>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
