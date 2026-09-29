'use client'

import { useMemo, useRef, useState } from 'react'
import { useLiveApply } from '@/components/om/use-live-apply'
import { AnimatePresence, motion } from 'motion/react'
import { Button, Checkbox, Radio, RadioGroup, SearchBar } from '@/components/ds'
import { Chips } from '@/components/om/chips'
import { useOverflow } from '@/components/om/use-overflow'
import { Avatar } from '@/components/om/avatar'
import { bottomSheet, modalPanel, overlayFade } from '@/lib/motion'
import { PROPERTY_TYPE_GROUPS, SOURCES } from '@/lib/leads/enums'
import { EMPTY_FILTERS, QUICK_FILTERS, activeGroups, parseDMY, type DatePreset, type LeadFilters, type QuickFilter } from '@/lib/leads/filters'
import { DateField } from '@/components/om/date-field'
import type { Member } from '@/lib/db/schema'
import styles from './filters-modal.module.css'
import { useScrollLock } from '@/components/om/use-scroll-lock'
import { useDialogFocus, useEscapeLayer } from '@/components/om/surface'
import { useSheetLayout } from '@/components/om/sheet'
import { MSG } from '@/lib/forms'
import { SurfaceFoot, SurfaceHead, surfaceClasses } from '@/components/om/dialog'

type Tab = 'sort' | 'quick' | 'propertyTypes' | 'sources' | 'assignees' | 'date'
const TABS: { key: Tab; label: string }[] = [
  { key: 'sort', label: 'Sort' },
  { key: 'quick', label: 'Quick filters' },   /* (REG-608) 1.0's smart views */
  { key: 'propertyTypes', label: 'Property type' },
  { key: 'sources', label: 'Source' },
  { key: 'assignees', label: 'Members' },   /* REG-290 */
  { key: 'date', label: 'Date' },
]
const PRESETS: { key: DatePreset; label: string }[] = [
  { key: 'today', label: 'Today' }, { key: '7d', label: 'Last 7 days' }, { key: '30d', label: 'Last 30 days' }, { key: 'month', label: 'This month' }, { key: 'custom', label: 'Custom' },   /* (REG-610, parity L-27) */
]

export function FiltersModal({
  open, value, team, onClose, onApply, now, sources = SOURCES,}: {
  /** (REG-599) The sources to offer: the studio's live list plus any retired source still on a lead (the caller computes it). */
  sources?: readonly string[]
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
  const [scrollRef, bodyScrolls] = useOverflow()   // the footer's shadow follows the body's scroll (REG-322)
  /* (REG-353) ≤767 this is the canvas' Filters bottom sheet (1g, 2o): it rises off the bottom edge and the
     160px category rail lies down as a scrolling tab strip over the options. */
  const sheet = useSheetLayout()
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
  const toggleQuick = (k: QuickFilter) => setDraft((d) => ({ ...d, quick: d.quick.includes(k) ? d.quick.filter((x) => x !== k) : [...d.quick, k] }))   /* (REG-608) */
  const matches = (s: string) => !q.trim() || s.toLowerCase().includes(q.trim().toLowerCase())
  const custom = draft.datePreset === 'custom'
  const today = useMemo(() => new Date(now), [now])
  // DateField only ever holds a picker-chosen date, so the only rule left is the range order.
  const fromD = parseDMY(draft.from), toD = parseDMY(draft.to)
  const rangeBad = custom && !!fromD && !!toD && fromD.getTime() > toD.getTime()
  const dateInvalid = rangeBad
  /* (REG-464) Every change filters the list behind the modal as it happens; an inverted date range waits until it is fixed. */
  useLiveApply(open, draft, value, !dateInvalid, onApply)
  const rangeError = rangeBad ? MSG.dateRange : undefined

  /* (REG-729) The DS SearchBar, filled — the hand-rolled box drew no focus ring (outline: 0). */
  const searchBox = (
    <SearchBar size="md" appearance="filled" placeholder="Search" aria-label="Search options" value={q} onChange={setQ} className={styles.search} />
  )

  return (
    <AnimatePresence>
      {open ? (
        <motion.div className={styles.overlay} variants={overlayFade} initial="initial" animate="animate" exit="exit"
                    onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
          {/* (REG-287) focus lands on the panel on open (surface.ts) and the ring belongs to its controls — the shared
              panel's `outline: none` (surfaceClasses.panel), the rule Dialog and the Move stage window carry. */}
          <motion.div ref={panelRef} className={`${surfaceClasses.panel} ${styles.panel}`} variants={sheet ? bottomSheet : modalPanel} role="dialog" aria-modal aria-label="Filters"
                      tabIndex={-1}>
            {sheet ? <span className={surfaceClasses.grabber} aria-hidden /> : null}
            {/* (REG-725) the house head and foot */}
            <SurfaceHead title="Filters" onClose={onClose} />
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
              <div ref={scrollRef} className={styles.content} role="tabpanel">
                {tab === 'sort' ? (
                  <>
                    <span className={styles.sectionTitle}>Sort by</span>
                    <RadioGroup aria-label="Sort by" value={draft.sort} onChange={(v) => setDraft((d) => ({ ...d, sort: v as LeadFilters['sort'] }))}>
                      <div className={styles.sortRow}><Radio value="newest">Newest at the top</Radio></div>
                      <div className={styles.sortRow}><Radio value="oldest">Oldest at the top</Radio></div>
                    </RadioGroup>
                  </>
                ) : tab === 'quick' ? (
                  <>
                    <span className={styles.sectionTitle}>Quick filters</span>
                    <div className={styles.list}>
                      {QUICK_FILTERS.map((f) => (
                        <div key={f.key} className={styles.row} role="button" tabIndex={0} onClick={() => toggleQuick(f.key)}
                             onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggleQuick(f.key) } }} data-testid={`quick-${f.key}`}>
                          <span>{f.label}<span className={styles.rowHelp}> · {f.help}</span></span>
                          <span onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                            <Checkbox isSelected={draft.quick.includes(f.key)} onChange={() => toggleQuick(f.key)} aria-label={f.label} />
                          </span>
                        </div>
                      ))}
                    </div>
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
                      {sources.filter(matches).map((s) => (
                        <div key={s} className={styles.row} role="button" tabIndex={0} onClick={() => toggle('sources', s)}
                             onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle('sources', s) } }}>
                          <span>{s}</span>
                          <span onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                            <Checkbox isSelected={draft.sources.includes(s)} onChange={() => toggle('sources', s)} aria-label={s} />
                          </span>
                        </div>
                      ))}
                      {!sources.some(matches) ? <span className={styles.noMatch}>No sources match “{q}”.</span> : null}
                    </div>
                  </>
                ) : tab === 'assignees' ? (
                  <>
                    <span className={styles.sectionTitle}>Members</span>
                    <div className={styles.list}>
                      {team.map((m) => (
                        <div key={m.id} className={styles.rowTwo} role="button" tabIndex={0} onClick={() => toggle('assignees', m.id)}
                             onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle('assignees', m.id) } }}>
                          <Avatar name={m.name} color={m.color} size={40} tooltip={false} />
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
                    {/* (REG-729) the house chip group (REG-614), single — pressing the chosen chip again clears it, as before */}
                    <Chips label="Dates" options={PRESETS.map((p) => ({ value: p.key, label: p.label }))} value={draft.datePreset}
                           onChange={(k) => setDraft((d) => {
                             const next = d.datePreset === k ? null : (k as DatePreset)
                             return { ...d, datePreset: next, ...(next === 'custom' ? {} : { from: '', to: '' }) }
                           })} />
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
            <SurfaceFoot shadow={bodyScrolls}>
              <Button variant="secondary" appearance="outlined" onPress={() => setDraft(EMPTY_FILTERS)}>Clear All</Button>
              {/* (REG-464) The draft is already applied — Done only closes. */}
              <Button onPress={onClose}>Done</Button>
            </SurfaceFoot>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
