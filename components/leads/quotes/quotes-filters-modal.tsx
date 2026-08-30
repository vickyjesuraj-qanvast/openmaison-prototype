'use client'

import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Button, Checkbox, Radio, RadioGroup } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { DateField } from '@/components/om/date-field'
import { Tooltip } from '@/components/om/tooltip'
import { useScrollLock } from '@/components/om/use-scroll-lock'
import { modalPanel, overlayFade } from '@/lib/motion'
import { MSG } from '@/lib/forms'
import { parseInputDate } from '@/lib/format'
import {
  EMPTY_QUOTE_FILTERS, QUOTE_STATUSES, activeQuoteGroups,
  type QuoteDatePreset, type QuoteDue, type QuoteFilters, type QuoteSort, type QuoteStatus,
} from '@/lib/leads/quote-filters'
import styles from './quotes-filters-modal.module.css'

/**
 * Lead Details › Quotes › Filters (910:36338 "04 - Quotes filter", panes 910:36380 Sort · 910:36448 Date ·
 * 910:36518 Status · 910:36585 Due) — the listing FiltersModal shell (600×600, rail 160 + "Filter content" 440)
 * with the quotes' four groups. Copied from components/leads/tasks/tasks-filters-modal.tsx; the Date pane's
 * preset chips + Custom fields follow the listing modal's Date pane (components/leads/filters-modal.tsx).
 * Spec: design-source/context/lead-quotes/03-filters.txt.
 */

type Group = 'sort' | 'date' | 'status' | 'due'
const TABS: { key: Group; label: string }[] = [
  { key: 'sort', label: 'Sort' },
  { key: 'date', label: 'Date' },
  { key: 'status', label: 'Status' },
  { key: 'due', label: 'Due' },
]
const SORTS: { key: QuoteSort; label: string }[] = [
  { key: 'newest', label: 'Newest at the top' },
  { key: 'oldest', label: 'Oldest at the top' },
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
  open, value, onApply, onClose, now,
}: {
  open: boolean
  value: QuoteFilters
  onApply: (v: QuoteFilters) => void
  onClose: () => void
  /** Day-granular clock for the pickers' "today" ring (falls back to the mount time — never Date.now() in render). */
  now?: number
}) {
  useScrollLock(open)   // the page never scrolls behind this surface
  const [tab, setTab] = useState<Group>('sort')
  const [draft, setDraft] = useState<QuoteFilters>(value)
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

  const dots = activeQuoteGroups(draft)
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
                    <RadioGroup aria-label="Sort by" value={draft.sort} onChange={(v) => setDraft((d) => ({ ...d, sort: v as QuoteSort }))}>
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
                      <div className={styles.chips} role="group" aria-label="Dates">
                        {PRESETS.map((p) => (
                          <button key={p.key} type="button" className={styles.chip} aria-pressed={draft.date === p.key}
                                  data-selected={draft.date === p.key || undefined} onClick={() => pickPreset(p.key)}>
                            {p.label}
                          </button>
                        ))}
                      </div>
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
                      {QUOTE_STATUSES.map((s) => (
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
            <div className={styles.footer}>
              <Button variant="secondary" appearance="outlined" onPress={() => setDraft(EMPTY_QUOTE_FILTERS)}>Clear All</Button>
              <Button onPress={() => { if (rangeBad) return; onApply(draft); onClose() }} isDisabled={rangeBad}>Apply</Button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
