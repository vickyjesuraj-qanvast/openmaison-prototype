'use client'

import { useMemo, useRef, useState } from 'react'
import { useLiveApply } from '@/components/om/use-live-apply'
import { AnimatePresence, motion } from 'motion/react'
import { Button, Checkbox, Radio, RadioGroup } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { useOverflow } from '@/components/om/use-overflow'
import { DateField } from '@/components/om/date-field'
import { Tooltip } from '@/components/om/tooltip'
import { useScrollLock } from '@/components/om/use-scroll-lock'
import { useDialogFocus, useEscapeLayer } from '@/components/om/surface'
import { bottomSheet, modalPanel, overlayFade } from '@/lib/motion'
import { useSheetLayout } from '@/components/om/sheet'
import { MSG } from '@/lib/forms'
import { parseInputDate } from '@/lib/format'
import {
  CONTRACT_STATUSES, EMPTY_CONTRACT_FILTERS, activeContractGroups,
  type ContractDatePreset, type ContractFilters, type ContractSort, type ContractStatus,
} from '@/lib/leads/contract-filters'
import styles from './contracts-filters-modal.module.css'

/**
 * Lead Details › Contracts › Filters — no Contracts filter mock (section 931-38609 has only the empty state 931:38610
 * and the listing 931:38666), so this is the Quotes filters modal (910:36338, components/leads/quotes/quotes-filters-modal.tsx)
 * with the rail trimmed to Sort · Date · Status (the Contracts table has no Due column → no Due pane) over
 * `ContractFilters` (lib/leads/contract-filters.ts). Shell: 600×600, rail 160 + "Filter content" 440.
 * Spec: design-source/context/lead-contracts/00-build-plan.md (REG-178).
 */

type Group = 'sort' | 'date' | 'status'
const TABS: { key: Group; label: string }[] = [
  { key: 'sort', label: 'Sort' },
  { key: 'date', label: 'Date' },
  { key: 'status', label: 'Status' },
]
const SORTS: { key: ContractSort; label: string }[] = [
  { key: 'newest', label: 'Newest at the top' },
  { key: 'oldest', label: 'Oldest at the top' },
]
/** "Choice" chips (quotes 910:36448), left → right. */
const PRESETS: { key: Exclude<ContractDatePreset, ''>; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'last7', label: 'Last 7 days' },
  { key: 'last30', label: 'Last 30 days' },
  { key: 'custom', label: 'Custom' },
]

export function ContractsFiltersModal({
  open, value, onApply, onClose, now,
}: {
  open: boolean
  value: ContractFilters
  onApply: (v: ContractFilters) => void
  onClose: () => void
  /** Day-granular clock for the pickers' "today" ring (falls back to the mount time — never Date.now() in render). */
  now?: number
}) {
  useScrollLock(open)   // the page never scrolls behind this surface
  const [tab, setTab] = useState<Group>('sort')
  const [draft, setDraft] = useState<ContractFilters>(value)
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

  const dots = activeContractGroups(draft)
  const toggleStatus = (s: ContractStatus) =>
    setDraft((d) => ({ ...d, status: d.status.includes(s) ? d.status.filter((x) => x !== s) : [...d.status, s] }))
  // Single-select chips: the selected chip clears itself; leaving Custom drops the typed range (the listing's rule).
  const pickPreset = (p: Exclude<ContractDatePreset, ''>) =>
    setDraft((d) => {
      const next: ContractDatePreset = d.date === p ? '' : p
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
          {/* (REG-287) tabIndex={-1} so the panel can hold focus; `outline: none` matches every other panel that takes
              focus on open (components/om/dialog.module.css, move-stage/wizard.module.css) — inline because this
              surface's stylesheet is outside this pass. The ring belongs to the panel's own controls. */}
          <motion.div ref={panel} className={styles.panel} style={{ outline: 'none' }} variants={sheet ? bottomSheet : modalPanel}
                      role="dialog" aria-modal aria-label="Filters" tabIndex={-1}>
            {sheet ? <span className={styles.grabber} aria-hidden /> : null}
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
              <div ref={scrollRef} className={styles.content} role="tabpanel">
                {tab === 'sort' ? (
                  <>
                    <span className={styles.sectionTitle}>Sort by</span>
                    <RadioGroup aria-label="Sort by" value={draft.sort} onChange={(v) => setDraft((d) => ({ ...d, sort: v as ContractSort }))}>
                      {SORTS.map((s) => (
                        <div key={s.key} className={styles.sortRow}><Radio value={s.key}>{s.label}</Radio></div>
                      ))}
                    </RadioGroup>
                  </>
                ) : tab === 'date' ? (
                  <>
                    {/* the quotes mock types "Dates " with a trailing space — rendered trimmed */}
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
                ) : (
                  <>
                    <span className={styles.sectionTitle}>Status</span>
                    <div className={styles.list}>
                      {CONTRACT_STATUSES.map((s) => (
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
                )}
              </div>
            </div>
            <div className={styles.footer} data-shadow={bodyScrolls || undefined}>
              <Button variant="secondary" appearance="outlined" onPress={() => setDraft(EMPTY_CONTRACT_FILTERS)}>Clear All</Button>
              {/* (REG-464) The draft is already applied — Done only closes. */}
              <Button onPress={onClose}>Done</Button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
