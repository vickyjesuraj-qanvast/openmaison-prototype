'use client'

import { useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Button, Checkbox } from '@/components/ds'
import { Avatar } from '@/components/om/avatar'
import { Chips } from '@/components/om/chips'
import { SurfaceFoot, SurfaceHead, surfaceClasses } from '@/components/om/dialog'
import { useLiveApply } from '@/components/om/use-live-apply'
import { useOverflow } from '@/components/om/use-overflow'
import { useScrollLock } from '@/components/om/use-scroll-lock'
import { useDialogFocus, useEscapeLayer } from '@/components/om/surface'
import { useSheetLayout } from '@/components/om/sheet'
import { bottomSheet, modalPanel, overlayFade } from '@/lib/motion'
import { EMPTY_TICKET_FILTERS, NOBODY, PRIORITY_WORDS, STATUS_WORDS, TICKET_STATUSES, activeTicketGroups, sameTicketFilters, type TicketFilters, type TicketPriority, type TicketStatus } from '@/lib/projects/tickets-model'
/* The Tasks filters modal's own sheet — the shared shell (components/om/filters-modal.module.css) through it, nothing of this modal's own. */
import styles from '@/components/leads/tasks/tasks-filters-modal.module.css'

type Group = 'priority' | 'status' | 'owners'
const TABS: { key: Group; label: string }[] = [
  { key: 'priority', label: 'Priority' },
  { key: 'status', label: 'Status' },
  { key: 'owners', label: 'Looks after' },
]
export type TicketPerson = { id: string; name: string; color: string; role?: string }

/**
 * (parity map 2026-10-10, UC-047 — 1.0's Escalations › Filter: Priority, Status, Assigned To, Clear All Filters) Tickets › Filters, on the
 * house filter pattern (the Files filters modal: the Tasks modal's shell, a rail of groups with dots, Clear All · Done): Priority (Normal ·
 * Urgent), Status (the four states — a pick widens the Open / Resolved and closed / All chips to All, so the two never disagree) and Looks
 * after (the members on the tickets, and "Nobody yet"). Every change reaches the list at once (REG-464): Done only closes. ≤767 a bottom sheet.
 */
export function TicketsFiltersModal({ open, people, value, onApply, onClose }: {
  open: boolean
  people: TicketPerson[]
  value: TicketFilters
  onApply: (v: TicketFilters) => void
  onClose: () => void
}) {
  useScrollLock(open)
  const [tab, setTab] = useState<Group>('priority')
  const [draft, setDraft] = useState<TicketFilters>(value)
  const [wasOpen, setWasOpen] = useState(false)
  const panel = useRef<HTMLDivElement>(null)
  const sheet = useSheetLayout()   // (REG-353) ≤767 the bottom sheet
  useEscapeLayer(open, panel, onClose)
  useDialogFocus(open, panel)
  const [scrollRef, bodyScrolls] = useOverflow()
  // Render-phase adjust: every opening starts from the applied value on the first pane.
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) { setDraft(value); setTab('priority') }
  }
  const dots = activeTicketGroups(draft)
  useLiveApply(open, draft, value, true, onApply, sameTicketFilters)   // (REG-464)
  const toggleOwner = (id: string) => setDraft((d) => ({ ...d, owners: d.owners.includes(id) ? d.owners.filter((x) => x !== id) : [...d.owners, id] }))
  const rows: TicketPerson[] = [...people, { id: NOBODY, name: 'Nobody yet', color: 'var(--om-color-on-surface-border)', role: 'Not taken on' }]
  return (
    <AnimatePresence>
      {open ? (
        <motion.div className={styles.overlay} variants={overlayFade} initial="initial" animate="animate" exit="exit"
                    onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
          <motion.div ref={panel} className={`${surfaceClasses.panel} ${styles.panel}`} variants={sheet ? bottomSheet : modalPanel}
                      role="dialog" aria-modal aria-label="Filters" tabIndex={-1} data-testid="tickets-filters">
            {sheet ? <span className={surfaceClasses.grabber} aria-hidden /> : null}
            <SurfaceHead title="Filters" onClose={onClose} />
            <div className={styles.body}>
              <div className={styles.rail} role="tablist" aria-label="Filter groups">
                {TABS.map((t) => (
                  <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} className={styles.tab}
                          data-active={tab === t.key || undefined} onClick={() => setTab(t.key)} data-testid={`tickets-filter-tab-${t.key}`}>
                    <span>{t.label}</span>
                    {dots[t.key] ? <span className={styles.tabDot} aria-label="Has selections" /> : null}
                  </button>
                ))}
              </div>
              <div ref={scrollRef} className={styles.content} role="tabpanel">
                {tab === 'priority' ? (
                  <>
                    <span className={styles.sectionTitle}>Priority</span>
                    <Chips multiple label="Priority" testId="tickets-filter-priority" options={(['normal', 'urgent'] as TicketPriority[]).map((p) => ({ value: p, label: PRIORITY_WORDS[p] }))}
                           value={draft.priority} onChange={(v) => setDraft((d) => ({ ...d, priority: v as TicketPriority[] }))} />
                  </>
                ) : tab === 'status' ? (
                  <>
                    <span className={styles.sectionTitle}>Status</span>
                    <Chips multiple label="Status" testId="tickets-filter-status" options={TICKET_STATUSES.map((s) => ({ value: s, label: STATUS_WORDS[s] }))}
                           value={draft.status} onChange={(v) => setDraft((d) => ({ ...d, status: v as TicketStatus[] }))} />
                  </>
                ) : (
                  <>
                    <span className={styles.sectionTitle}>Looks after</span>
                    <div className={styles.list} data-testid="tickets-filter-owners">
                      {rows.map((m) => (
                        <div key={m.id} className={styles.rowTwo} role="button" tabIndex={0} onClick={() => toggleOwner(m.id)}
                             onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggleOwner(m.id) } }}>
                          <Avatar name={m.name} color={m.color} size={40} tooltip={false} />
                          <span className={styles.rowText}>
                            <span className={styles.rowName}>{m.name}</span>
                            {m.role ? <span className={styles.rowRole}>{m.role}</span> : null}
                          </span>
                          <span onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                            <Checkbox isSelected={draft.owners.includes(m.id)} onChange={() => toggleOwner(m.id)} aria-label={m.name} />
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
            <SurfaceFoot shadow={bodyScrolls}>
              <Button variant="secondary" appearance="outlined" onPress={() => setDraft(EMPTY_TICKET_FILTERS)}>Clear All</Button>
              {/* (REG-464) The draft is already applied — Done only closes. */}
              <Button onPress={onClose} data-testid="tickets-filters-done">Done</Button>
            </SurfaceFoot>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
