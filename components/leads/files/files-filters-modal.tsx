'use client'

import { useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Button, Checkbox } from '@/components/ds'
import { useLiveApply } from '@/components/om/use-live-apply'
import { useOverflow } from '@/components/om/use-overflow'
import { Avatar } from '@/components/om/avatar'
import { DateField } from '@/components/om/date-field'
import { SurfaceFoot, SurfaceHead, surfaceClasses } from '@/components/om/dialog'
import { Chips } from '@/components/om/chips'
import { useScrollLock } from '@/components/om/use-scroll-lock'
import { useDialogFocus, useEscapeLayer } from '@/components/om/surface'
import { useSheetLayout } from '@/components/om/sheet'
import { bottomSheet, modalPanel, overlayFade } from '@/lib/motion'
import { MSG } from '@/lib/forms'
import { parseInputDate } from '@/lib/format'
import { EMPTY_FILE_FILTERS, activeFileGroups, type FileFilters } from '@/lib/leads/file-model'
import type { Member } from '@/lib/db/schema'
/* The Tasks filters modal's own sheet — the shared shell (components/om/filters-modal.module.css) through it, nothing of this modal's own. */
import styles from '@/components/leads/tasks/tasks-filters-modal.module.css'

type Group = 'types' | 'owners' | 'updated'
const TABS: { key: Group; label: string }[] = [
  { key: 'types', label: 'Type' },
  { key: 'owners', label: 'Owner' },
  { key: 'updated', label: 'Updated' },
]

/**
 * (UX audit 2026-09-30, T9 — REG-183's "Coming soon" Filters made real) Lead Details › Files › Filters: the Tasks filters modal (902:28963)
 * with the Files' three groups — Type (the File type column's words, the types this lead's files carry), Owner (the members, the Tasks
 * Members pane's rows) and Updated (the day of the last change, from and to, picked never typed). Every change reaches the grid or list at
 * once (REG-464): Done only closes, Clear All empties the draft. No mock — the house panes, logged.
 */
export function FilesFiltersModal({ open, team, types, value, onApply, onClose, now }: {
  open: boolean
  team: Member[]
  /** The type labels present in the lead's files (`fileTypesIn`). */
  types: string[]
  value: FileFilters
  onApply: (v: FileFilters) => void
  onClose: () => void
  /** Day-granular clock for the pickers' "today" ring (never Date.now() in render). */
  now?: number
}) {
  useScrollLock(open)
  const [tab, setTab] = useState<Group>('types')
  const [draft, setDraft] = useState<FileFilters>(value)
  const [wasOpen, setWasOpen] = useState(false)
  const [mountedAt] = useState(() => Date.now())
  const panel = useRef<HTMLDivElement>(null)
  const sheet = useSheetLayout()   // (REG-353) ≤767 the bottom sheet
  useEscapeLayer(open, panel, onClose)
  useDialogFocus(open, panel)
  const [scrollRef, bodyScrolls] = useOverflow()

  // Render-phase adjust: every opening starts from the applied value on the first pane.
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) { setDraft(value); setTab('types') }
  }
  const dots = activeFileGroups(draft)
  const today = useMemo(() => new Date(now ?? mountedAt), [now, mountedAt])
  const fromD = parseInputDate(draft.from), toD = parseInputDate(draft.to)
  const rangeBad = !!fromD && !!toD && fromD.getTime() > toD.getTime()
  useLiveApply(open, draft, value, !rangeBad, onApply)   // (REG-464) an inverted range waits until it is fixed
  const toggleOwner = (id: string) => setDraft((d) => ({ ...d, owners: d.owners.includes(id) ? d.owners.filter((x) => x !== id) : [...d.owners, id] }))

  return (
    <AnimatePresence>
      {open ? (
        <motion.div className={styles.overlay} variants={overlayFade} initial="initial" animate="animate" exit="exit"
                    onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
          <motion.div ref={panel} className={`${surfaceClasses.panel} ${styles.panel}`} variants={sheet ? bottomSheet : modalPanel}
                      role="dialog" aria-modal aria-label="Filters" tabIndex={-1} data-testid="files-filters">
            {sheet ? <span className={surfaceClasses.grabber} aria-hidden /> : null}
            <SurfaceHead title="Filters" onClose={onClose} />
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
                {tab === 'types' ? (
                  <>
                    <span className={styles.sectionTitle}>Type</span>
                    <Chips multiple label="Type" options={types} value={draft.types} onChange={(v) => setDraft((d) => ({ ...d, types: v }))} />
                  </>
                ) : tab === 'owners' ? (
                  <>
                    <span className={styles.sectionTitle}>Owner</span>
                    <div className={styles.list}>
                      {team.map((m) => (
                        <div key={m.id} className={styles.rowTwo} role="button" tabIndex={0} onClick={() => toggleOwner(m.id)}
                             onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggleOwner(m.id) } }}>
                          <Avatar name={m.name} color={m.color} size={40} tooltip={false} />
                          <span className={styles.rowText}>
                            <span className={styles.rowName}>{m.name}</span>
                            <span className={styles.rowRole}>{m.isYou ? `${m.role} (you)` : m.role}</span>
                          </span>
                          <span onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                            <Checkbox isSelected={draft.owners.includes(m.id)} onChange={() => toggleOwner(m.id)} aria-label={m.name} />
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <span className={styles.sectionTitle}>Updated</span>
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
              <Button variant="secondary" appearance="outlined" onPress={() => setDraft(EMPTY_FILE_FILTERS)}>Clear</Button>   {/* (the calm UI build 2026-10-27 — W-010) sentence case, the Filters modals' one word */}
              {/* (REG-464) The draft is already applied — Done only closes. */}
              <Button onPress={onClose}>Done</Button>
            </SurfaceFoot>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
