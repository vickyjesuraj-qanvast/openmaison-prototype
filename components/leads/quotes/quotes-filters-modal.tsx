'use client'

import { quoteStatusLabel } from '@/lib/quotes/status-words'
import { useMemo, useRef, useState } from 'react'
import { useLiveApply } from '@/components/om/use-live-apply'
import { AnimatePresence, motion } from 'motion/react'
import { Button, Checkbox, Radio, RadioGroup } from '@/components/ds'
import { useOverflow } from '@/components/om/use-overflow'
import { DateField } from '@/components/om/date-field'
import { SurfaceFoot, SurfaceHead, surfaceClasses } from '@/components/om/dialog'
import { Chips } from '@/components/om/chips'
import { useScrollLock } from '@/components/om/use-scroll-lock'
import { useDialogFocus, useEscapeLayer } from '@/components/om/surface'
import { bottomSheet, modalPanel, overlayFade } from '@/lib/motion'
import { useSheetLayout } from '@/components/om/sheet'
import { MSG } from '@/lib/forms'
import { parseInputDate } from '@/lib/format'
import {
  EMPTY_QUOTE_FILTERS, activeQuoteGroups, quoteStatuses,
  type QuoteDatePreset, type QuoteDue, type QuoteFilters, type QuoteSort, type QuoteStatus, type QuoteValid,
} from '@/lib/leads/quote-filters'
import type { QuoteApproval } from '@/lib/settings/types'
import styles from './quotes-filters-modal.module.css'

/**
 * Lead Details › Quotes › Filters (910:36338 "04 - Quotes filter", panes 910:36380 Sort · 910:36448 Date ·
 * 910:36518 Status · 910:36585 Due) — the listing FiltersModal shell (600×600, rail 160 + "Filter content" 440)
 * with the quotes' four groups. Copied from components/leads/tasks/tasks-filters-modal.tsx; the Date pane's
 * preset chips + Custom fields follow the listing modal's Date pane (components/leads/filters-modal.tsx).
 * Spec: design-source/context/lead-quotes/03-filters.txt.
 */

type Group = 'sort' | 'date' | 'status' | 'due' | 'valid'
const TABS: { key: Group; label: string }[] = [
  { key: 'sort', label: 'Sort' },
  { key: 'date', label: 'Date' },
  { key: 'status', label: 'Status' },
  { key: 'due', label: 'Follow up' },   /* (the calm UI build 2026-10-27, 4-13) the list's column is Follow up; the key stays */
  { key: 'valid', label: 'Valid until' },   /* (UX audit Q5) */
]
const SORTS: { key: QuoteSort; label: string }[] = [
  { key: 'newest', label: 'Newest at the top' },
  { key: 'oldest', label: 'Oldest at the top' },
  { key: 'valid', label: 'Valid until — soonest first' },   /* (UX audit Q5) the Valid until head's own order */
]
/** (UX audit Q5) The quote's Valid until: this week (today and the six days after) · already passed. */
const VALIDS: { key: QuoteValid; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'week', label: 'This week' },
  { key: 'passed', label: 'Passed' },
]
/** "Choice" chips (910:36448), left → right. */
const PRESETS: { key: Exclude<QuoteDatePreset, ''>; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'last7', label: 'Last 7 days' },
  { key: 'last30', label: 'Last 30 days' },
  { key: 'custom', label: 'Custom' },
]
const DUES: { key: QuoteDue; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'upcoming', label: 'Upcoming' },
]

export function QuotesFiltersModal({
  open, value, onApply, onClose, now, approval, headSort = null, onClearHead,
}: {
  open: boolean
  /** (pending modules S04) the column a head sorts by, while it does — the Sort pane says so; picking an order here takes it off */
  headSort?: string | null
  onClearHead?: () => void
  value: QuoteFilters
  onApply: (v: QuoteFilters) => void
  onClose: () => void
  /** Settings › Leads › Quote approval — the Status tab lists the studio's lifecycle, not the full five. */
  approval: QuoteApproval
  /** Day-granular clock for the pickers' "today" ring (falls back to the mount time — never Date.now() in render). */
  now?: number
}) {
  useScrollLock(open)   // the page never scrolls behind this surface
  const [tab, setTab] = useState<Group>('sort')
  const [draft, setDraft] = useState<QuoteFilters>(value)
  const [wasOpen, setWasOpen] = useState(false)
  const [mountedAt] = useState(() => Date.now())
  /* (REG-287) `aria-modal` promised assistive tech the page behind is inert, but the panel only locked scrolling:
     Tab from Apply walked straight back out into the table. The app's surface policy does all three
     (components/om/surface.ts, as in components/om/dialog.tsx): Esc closes the TOPMOST surface only — so the Date
     pane's Custom picker keeps its own Esc — focus moves onto the panel on open, Tab cycles inside it, and focus
     returns to the Filters button on close. */
  const panel = useRef<HTMLDivElement>(null)
  /* (REG-353) ≤767 this modal is the canvas' bottom sheet: it rises off the bottom edge and wears the grabber. */
  const sheet = useSheetLayout()
  useEscapeLayer(open, panel, onClose)
  useDialogFocus(open, panel)
  const [scrollRef, bodyScrolls] = useOverflow()   // the footer's shadow follows the body's scroll (REG-322)

  // Render-phase adjust: every opening starts from the applied value on the Sort pane.
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) { setDraft(value); setTab('sort') }
  }

  const dots = { ...activeQuoteGroups(draft), sort: activeQuoteGroups(draft).sort || !!headSort }
  const toggleStatus = (s: QuoteStatus) =>
    setDraft((d) => ({ ...d, status: d.status.includes(s) ? d.status.filter((x) => x !== s) : [...d.status, s] }))
  // Single-select chips: the selected chip clears itself; leaving Custom drops the typed range (the listing's rule).
  const pickPreset = (p: Exclude<QuoteDatePreset, ''>) =>
    setDraft((d) => {
      const next: QuoteDatePreset = d.date === p ? '' : p
      return { ...d, date: next, ...(next === 'custom' ? {} : { from: '', to: '' }) }
    })
  const custom = draft.date === 'custom'
  const today = useMemo(() => new Date(now ?? mountedAt), [now, mountedAt])
  // DateField only ever holds a picker-chosen date, so the only rule left is the range order (tasks modal).
  const fromD = parseInputDate(draft.from), toD = parseInputDate(draft.to)
  const rangeBad = custom && !!fromD && !!toD && fromD.getTime() > toD.getTime()
  /* (REG-464) Every change filters the list behind the modal as it happens; an inverted date range waits until it is fixed. */
  useLiveApply(open, draft, value, !rangeBad, onApply)

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
            {sheet ? (
              /* (Quotes on the move, K4 — A-21) On a phone: ONE scrolling sheet, every group a row of the house Chips — Sort · Dates · Status · Due ·
                 Valid until — instead of the desk's two panes (five tabs, each a press, inside a 390 screen). The same draft, applied live (REG-464). */
              <div ref={scrollRef} className={styles.sheetBody} data-testid="quote-filters-sheet">
                <section className={styles.sheetGroup} aria-label="Sort by">
                  <span className={styles.sectionTitle}>Sort by</span>
                  {headSort ? <span className={styles.headSort} data-testid="filters-head-sort">Sorted by the {headSort} column. Choose an order below to sort by it instead.</span> : null}
                  <Chips label="Sort by" options={SORTS.map((s) => ({ value: s.key, label: s.label }))} value={headSort ? null : draft.sort} onChange={(v) => { onClearHead?.(); setDraft((d) => ({ ...d, sort: v as QuoteSort })) }} />
                </section>
                <section className={styles.sheetGroup} aria-label="Dates">
                  <span className={styles.sectionTitle}>Dates</span>
                  <Chips label="Dates" options={PRESETS.map((p) => ({ value: p.key, label: p.label }))} value={draft.date || null} onChange={(k) => pickPreset(k as Exclude<QuoteDatePreset, ''>)} />
                  {custom ? (
                    <div className={styles.dateRow}>
                      <DateField label="From date" value={draft.from} today={today} error={rangeBad || undefined} onChange={(v) => setDraft((d) => ({ ...d, from: v }))} />
                      <DateField label="To date" value={draft.to} today={today} error={rangeBad ? MSG.dateRange : undefined} onChange={(v) => setDraft((d) => ({ ...d, to: v }))} />
                    </div>
                  ) : null}
                </section>
                <section className={styles.sheetGroup} aria-label="Status">
                  <span className={styles.sectionTitle}>Status</span>
                  <Chips multiple label="Status" options={quoteStatuses(approval).map((s) => ({ value: s, label: quoteStatusLabel(s) }))} value={draft.status} onChange={(v) => setDraft((d) => ({ ...d, status: v as QuoteStatus[] }))} />
                </section>
                <section className={styles.sheetGroup} aria-label="Follow up">
                  <span className={styles.sectionTitle}>Follow up</span>
                  <Chips label="Follow up" options={DUES.map((s) => ({ value: s.key, label: s.label }))} value={draft.due} onChange={(v) => setDraft((d) => ({ ...d, due: v as QuoteDue }))} />
                </section>
                <section className={styles.sheetGroup} aria-label="Valid until">
                  <span className={styles.sectionTitle}>Valid until</span>
                  <Chips label="Valid until" options={VALIDS.map((s) => ({ value: s.key, label: s.label }))} value={draft.valid} onChange={(v) => setDraft((d) => ({ ...d, valid: v as QuoteValid }))} />
                </section>
              </div>
            ) : (
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
              <div ref={scrollRef} className={styles.content} role="tabpanel">
                {tab === 'sort' ? (
                  <>
                    <span className={styles.sectionTitle}>Sort by</span>
                    {headSort ? <span className={styles.headSort} data-testid="filters-head-sort">Sorted by the {headSort} column. Choose an order below to sort by it instead.</span> : null}
                    <RadioGroup aria-label="Sort by" value={headSort ? '' : draft.sort} onChange={(v) => { onClearHead?.(); setDraft((d) => ({ ...d, sort: v as QuoteSort })) }}>
                      {SORTS.map((s) => (
                        <div key={s.key} className={styles.sortRow}><Radio value={s.key}>{s.label}</Radio></div>
                      ))}
                    </RadioGroup>
                  </>
                ) : tab === 'date' ? (
                  <>
                    {/* the mock types "Dates " with a trailing space — rendered trimmed */}
                    <span className={styles.sectionTitle}>Dates</span>
                    <div className={styles.dateGroup}>
                      {/* (sweep S1) the house chip group (REG-614), single — pressing the chosen chip again clears it, as before */}
                      <Chips label="Dates" options={PRESETS.map((p) => ({ value: p.key, label: p.label }))} value={draft.date || null} onChange={(k) => pickPreset(k as Exclude<QuoteDatePreset, ''>)} />
                      {custom ? (
                        <div className={styles.dateRow}>
                          <DateField label="From date" value={draft.from} today={today} error={rangeBad || undefined}
                                     onChange={(v) => setDraft((d) => ({ ...d, from: v }))} />
                          <DateField label="To date" value={draft.to} today={today} error={rangeBad ? MSG.dateRange : undefined}
                                     onChange={(v) => setDraft((d) => ({ ...d, to: v }))} />
                        </div>
                      ) : null}
                    </div>
                  </>
                ) : tab === 'status' ? (
                  <>
                    <span className={styles.sectionTitle}>Status</span>
                    <div className={styles.list}>
                      {quoteStatuses(approval).map((s) => (
                        <div key={s} className={styles.row} role="button" tabIndex={0} onClick={() => toggleStatus(s)}
                             onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggleStatus(s) } }}>
                          <span>{s}</span>
                          <span onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                            <Checkbox isSelected={draft.status.includes(s)} onChange={() => toggleStatus(s)} aria-label={s} />
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : tab === 'valid' ? (
                  <>
                    <span className={styles.sectionTitle}>Valid until</span>
                    <RadioGroup aria-label="Valid until" value={draft.valid} onChange={(v) => setDraft((d) => ({ ...d, valid: v as QuoteValid }))}>
                      {VALIDS.map((s) => (
                        <div key={s.key} className={styles.sortRow}><Radio value={s.key}>{s.label}</Radio></div>
                      ))}
                    </RadioGroup>
                  </>
                ) : (
                  <>
                    <span className={styles.sectionTitle}>Due</span>
                    <RadioGroup aria-label="Due" value={draft.due} onChange={(v) => setDraft((d) => ({ ...d, due: v as QuoteDue }))}>
                      {DUES.map((s) => (
                        <div key={s.key} className={styles.sortRow}><Radio value={s.key}>{s.label}</Radio></div>
                      ))}
                    </RadioGroup>
                  </>
                )}
              </div>
            </div>
            )}
            <SurfaceFoot shadow={bodyScrolls} className={styles.foot}>
              <Button variant="secondary" appearance="outlined" onPress={() => setDraft(EMPTY_QUOTE_FILTERS)}>Clear all</Button>
              {/* (REG-464) The draft is already applied — Done only closes. */}
              <Button onPress={onClose}>Done</Button>
            </SurfaceFoot>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
