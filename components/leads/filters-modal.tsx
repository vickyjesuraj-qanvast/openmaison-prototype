'use client'

import { useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Button, Checkbox, Radio, RadioGroup } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { Avatar } from '@/components/om/avatar'
import { modalPanel, overlayFade } from '@/lib/motion'
import { PROPERTY_TYPE_GROUPS, SOURCES } from '@/lib/leads/enums'
import { EMPTY_FILTERS, activeGroups, parseDMY, type DatePreset, type LeadFilters } from '@/lib/leads/filters'
import { DateField } from '@/components/om/date-field'
import type { Member } from '@/lib/db/schema'
import styles from './filters-modal.module.css'
import { useScrollLock } from '@/components/om/use-scroll-lock'
import { useDialogFocus, useEscapeLayer } from '@/components/om/surface'
import { MSG } from '@/lib/forms'
import { Tooltip } from '@/components/om/tooltip'

type Tab = 'sort' | 'propertyTypes' | 'sources' | 'assignees' | 'date'
const TABS: { key: Tab; label: string }[] = [
  { key: 'sort', label: 'Sort' },
  { key: 'propertyTypes', label: 'Property type' },
  { key: 'sources', label: 'Source' },
  { key: 'assignees', label: 'Members' },   /* REG-290 */
  { key: 'date', label: 'Date' },
]
const PRESETS: { key: DatePreset; label: string }[] = [
  { key: 'today', label: 'Today' }, { key: '7d', label: 'Last 7 days' }, { key: '30d', label: 'Last 30 days' }, { key: 'custom', label: 'Custom' },
]

export function FiltersModal({
  open, value, team, onClose, onApply, now,}: {
  open: boolean
  value: LeadFilters
  team: Member[]
  onClose: () => void
  onApply: (f: LeadFilters) => void
  /** Day-granular clock for the pickers' "today" ring. */
  now: number
}) {
  useScrollLock(open)   // the page never scrolls behind this surface
  /* (REG-287) aria-modal told assistive tech the page behind was inert while nothing held focus in: Tab walked
     straight out of the panel. Same policy as Dialog / the Move stage window (components/om/surface.ts) — Esc
     closes this surface only while it is the topmost one (an open date picker owns Esc first), focus moves into
     the panel on open, Tab cycles inside it, and the opener gets focus back on close. */
  const panelRef = useRef<HTMLDivElement>(null)
  useEscapeLayer(open, panelRef, onClose)
  useDialogFocus(open, panelRef)
  const [tab, setTab] = useState<Tab>('sort')
  const [draft, setDraft] = useState<LeadFilters>(value)
  const [q, setQ] = useState('')
  const [wasOpen, setWasOpen] = useState(false)

  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) { setDraft(value); setTab('sort'); setQ('') }
  }

  const dots = activeGroups(draft)
  const toggle = (key: 'propertyTypes' | 'sources' | 'assignees', v: string) =>
    setDraft((d) => ({ ...d, [key]: d[key].includes(v) ? d[key].filter((x) => x !== v) : [...d[key], v] }))
  const matches = (s: string) => !q.trim() || s.toLowerCase().includes(q.trim().toLowerCase())
  const custom = draft.datePreset === 'custom'
  const today = useMemo(() => new Date(now), [now])
  // DateField only ever holds a picker-chosen date, so the only rule left is the range order.
  const fromD = parseDMY(draft.from), toD = parseDMY(draft.to)
  const rangeBad = custom && !!fromD && !!toD && fromD.getTime() > toD.getTime()
  const dateInvalid = rangeBad
  const rangeError = rangeBad ? MSG.dateRange : undefined

  const searchBox = (
    <label className={styles.search}>
      <Icon name="search" size={20} family="outlined" />
      <input className={styles.searchInput} placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search options" />
    </label>
  )

  return (
    <AnimatePresence>
      {open ? (
        <motion.div className={styles.overlay} variants={overlayFade} initial="initial" animate="animate" exit="exit"
                    onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
          {/* (REG-287) `outline: none`: focus lands on the panel on open (surface.ts) and the ring belongs to its
              controls — the same rule Dialog and the Move stage window carry in their stylesheets. */}
          <motion.div ref={panelRef} className={styles.panel} variants={modalPanel} role="dialog" aria-modal aria-label="Filters"
                      tabIndex={-1} style={{ outline: 'none' }}>
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
                          data-active={tab === t.key || undefined} onClick={() => { setTab(t.key); setQ('') }}>
                    <span>{t.label}</span>
                    {dots[t.key] ? <span className={styles.tabDot} aria-label="Has selections" /> : null}
                  </button>
                ))}
              </div>
              <div className={styles.content} role="tabpanel">
                {tab === 'sort' ? (
                  <>
                    <span className={styles.sectionTitle}>Sort by</span>
                    <RadioGroup aria-label="Sort by" value={draft.sort} onChange={(v) => setDraft((d) => ({ ...d, sort: v as LeadFilters['sort'] }))}>
                      <div className={styles.sortRow}><Radio value="newest">Newest at the top</Radio></div>
                      <div className={styles.sortRow}><Radio value="oldest">Oldest at the top</Radio></div>
                    </RadioGroup>
                  </>
                ) : tab === 'propertyTypes' ? (
                  <>
                    {searchBox}
                    <span className={styles.sectionTitle}>Property types</span>
                    <div className={styles.list}>
                      {PROPERTY_TYPE_GROUPS.map((group, gi) => {
                        const items = group.filter(matches)
                        if (items.length === 0) return null
                        return (
                          <div key={gi}>
                            {gi > 0 && PROPERTY_TYPE_GROUPS.slice(0, gi).some((g) => g.some(matches)) ? <div className={styles.groupRule} /> : null}
                            {items.map((p) => (
                              <div key={p} className={styles.row} role="button" tabIndex={0} onClick={() => toggle('propertyTypes', p)}
                                   onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle('propertyTypes', p) } }}>
                                <span>{p}</span>
                                <span onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                                  <Checkbox isSelected={draft.propertyTypes.includes(p)} onChange={() => toggle('propertyTypes', p)} aria-label={p} />
                                </span>
                              </div>
                            ))}
                          </div>
                        )
                      })}
                      {!PROPERTY_TYPE_GROUPS.flat().some(matches) ? <span className={styles.noMatch}>No property types match “{q}”.</span> : null}
                    </div>
                  </>
                ) : tab === 'sources' ? (
                  <>
                    {searchBox}
                    <span className={styles.sectionTitle}>Sources</span>
                    <div className={styles.list}>
                      {SOURCES.filter(matches).map((s) => (
                        <div key={s} className={styles.row} role="button" tabIndex={0} onClick={() => toggle('sources', s)}
                             onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle('sources', s) } }}>
                          <span>{s}</span>
                          <span onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                            <Checkbox isSelected={draft.sources.includes(s)} onChange={() => toggle('sources', s)} aria-label={s} />
                          </span>
                        </div>
                      ))}
                      {!SOURCES.some(matches) ? <span className={styles.noMatch}>No sources match “{q}”.</span> : null}
                    </div>
                  </>
                ) : tab === 'assignees' ? (
                  <>
                    <span className={styles.sectionTitle}>Members</span>
                    <div className={styles.list}>
                      {team.map((m) => (
                        <div key={m.id} className={styles.rowTwo} role="button" tabIndex={0} onClick={() => toggle('assignees', m.id)}
                             onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle('assignees', m.id) } }}>
                          <Avatar name={m.name} color={m.color} size={40} />
                          <span className={styles.rowText}>
                            <span className={styles.rowName}>{m.name}</span>
                            <span className={styles.rowRole}>{m.isYou ? `${m.role} (you)` : m.role}</span>
                          </span>
                          <span onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                            <Checkbox isSelected={draft.assignees.includes(m.id)} onChange={() => toggle('assignees', m.id)} aria-label={m.name} />
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <span className={styles.sectionTitle}>Dates</span>
                    <div className={styles.chips}>
                      {PRESETS.map((p) => (
                        <button key={p.key} type="button" className={styles.chip} data-selected={draft.datePreset === p.key || undefined}
                                onClick={() => setDraft((d) => {
                                  const next = d.datePreset === p.key ? null : p.key
                                  return { ...d, datePreset: next, ...(next === 'custom' ? {} : { from: '', to: '' }) }
                                })}>
                          {p.label}
                        </button>
                      ))}
                    </div>
                    <div className={styles.dateRow}>
                      <DateField label="From date" value={draft.from} today={today} error={rangeBad || undefined}
                                 onChange={(v) => setDraft((d) => ({ ...d, from: v, datePreset: 'custom' }))} />
                      <DateField label="To date" value={draft.to} today={today} error={rangeError}
                                 onChange={(v) => setDraft((d) => ({ ...d, to: v, datePreset: 'custom' }))} />
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className={styles.footer}>
              <Button variant="secondary" appearance="outlined" onPress={() => setDraft(EMPTY_FILTERS)}>Clear All</Button>
              <Button onPress={() => { if (dateInvalid) return; onApply(draft); onClose() }} isDisabled={dateInvalid}>Apply</Button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
