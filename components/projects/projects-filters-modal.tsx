'use client'

import { useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Button, Checkbox, Radio, RadioGroup } from '@/components/ds'
import { useLiveApply } from '@/components/om/use-live-apply'
import { useOverflow } from '@/components/om/use-overflow'
import { SurfaceFoot, SurfaceHead, surfaceClasses } from '@/components/om/dialog'
import { useScrollLock } from '@/components/om/use-scroll-lock'
import { useDialogFocus, useEscapeLayer } from '@/components/om/surface'
import { useSheetLayout } from '@/components/om/sheet'
import { bottomSheet, modalPanel, overlayFade } from '@/lib/motion'
import { PROJECT_TYPES } from '@/lib/projects/model'
import { MembersPane } from '@/components/leads/filters-modal'   // (parity P-17, B-14) the Leads Filters' Members pane, one for both
import type { Member } from '@/lib/db/schema'
import { EMPTY_PROJECT_FILTERS, PROJECT_SORTS, activeProjectGroups, type ProjectFilters, type ProjectSortKey } from './filters'
import styles from './projects-filters-modal.module.css'

type Group = 'sort' | 'type' | 'team'
/* (parity P-17) "Members" (REG-290) — the key stays `team`, the address' `?team=` */
const TABS: { key: Group; label: string }[] = [{ key: 'sort', label: 'Sort' }, { key: 'type', label: 'Project type' }, { key: 'team', label: 'Members' }]

/**
 * (REG-926) Projects › Filters — the house Filters shell (components/om/filters-modal.module.css, the four lists' one modal: 600×600, the
 * rail 160 and the content 440, a bottom sheet on a phone) with Sort · Project type · Members. Every change filters the list behind it as it
 * happens (REG-464); Clear All empties at once, Done only closes. (parity P-17, B-14) The Members pane is the Leads Filters' own
 * (`MembersPane`: 40 avatars, "(you)"), and the sort rows and lists take its rules (the 234 radios, the lists flush under their title).
 */
export function ProjectsFiltersModal({ open, value, team, onApply, onClose, headSort = null, onClearHead }: {
  open: boolean
  value: ProjectFilters
  team: readonly Pick<Member, 'id' | 'name' | 'color' | 'role' | 'isYou'>[]
  onApply: (v: ProjectFilters) => void
  onClose: () => void
  /** (fix-A, A-24) ONE sort: a column the list is sorted by from its heading — Sort says so, and an order picked here (or Clear All) replaces it. */
  headSort?: string | null
  onClearHead?: () => void
}) {
  useScrollLock(open)
  const [tab, setTab] = useState<Group>('sort')
  const [draft, setDraft] = useState<ProjectFilters>(value)
  const [wasOpen, setWasOpen] = useState(false)
  if (open !== wasOpen) { setWasOpen(open); if (open) { setDraft(value); setTab('sort') } }
  const panel = useRef<HTMLDivElement>(null)
  const sheet = useSheetLayout()
  useEscapeLayer(open, panel, onClose)
  useDialogFocus(open, panel)
  const [scrollRef, bodyScrolls] = useOverflow()
  useLiveApply(open, draft, value, true, onApply, (a, b) => JSON.stringify(a) === JSON.stringify(b))
  const dots = { ...activeProjectGroups(draft), sort: activeProjectGroups(draft).sort || !!headSort }
  const toggle = (k: 'types' | 'team', v: string) => setDraft((d) => ({ ...d, [k]: d[k].includes(v) ? d[k].filter((x) => x !== v) : [...d[k], v] }))
  const row = (key: string, label: string, on: boolean, flip: () => void) => (
    <div key={key} className={styles.row} role="button" tabIndex={0} onClick={flip}
         onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flip() } }}>
      <span>{label}</span>
      <span onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}><Checkbox isSelected={on} onChange={flip} aria-label={label} /></span>
    </div>
  )
  return (
    <AnimatePresence>
      {open ? (
        <motion.div className={styles.overlay} variants={overlayFade} initial="initial" animate="animate" exit="exit"
                    onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
          <motion.div ref={panel} className={`${surfaceClasses.panel} ${styles.panel}`} variants={sheet ? bottomSheet : modalPanel} role="dialog" aria-modal aria-label="Filters" tabIndex={-1}>
            {sheet ? <span className={surfaceClasses.grabber} aria-hidden /> : null}
            <SurfaceHead title="Filters" onClose={onClose} />
            <div className={styles.body}>
              <div className={styles.rail} role="tablist" aria-label="Filter groups">
                {TABS.map((t) => (
                  <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} className={styles.tab} data-active={tab === t.key || undefined} onClick={() => setTab(t.key)}>
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
                    <RadioGroup aria-label="Sort by" value={headSort ? '' : draft.sort} onChange={(v) => { onClearHead?.(); setDraft((d) => ({ ...d, sort: v as ProjectSortKey })) }}>
                      {PROJECT_SORTS.map((s) => <div key={s.key} className={styles.sortRow}><Radio value={s.key}>{s.label}</Radio></div>)}
                    </RadioGroup>
                  </>
                ) : tab === 'type' ? (
                  <>
                    <span className={styles.sectionTitle}>Project type</span>
                    <div className={styles.list}>{PROJECT_TYPES.map((t) => row(t, t, draft.types.includes(t), () => toggle('types', t)))}</div>
                  </>
                ) : (
                  <MembersPane team={team} value={draft.team} onToggle={(id) => toggle('team', id)} />
                )}
              </div>
            </div>
            <SurfaceFoot shadow={bodyScrolls}>
              <Button variant="secondary" appearance="outlined" onPress={() => { onClearHead?.(); setDraft(EMPTY_PROJECT_FILTERS) }}>Clear All</Button>
              <Button onPress={onClose}>Done</Button>
            </SurfaceFoot>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
