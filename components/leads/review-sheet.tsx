'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Button, Switch } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { overlayFade, sheetRise } from '@/lib/motion'
import { displayDate, relativeTime } from '@/lib/format'
import type { ReviewRow } from '@/lib/leads/queries'
import styles from './review-sheet.module.css'
import { useScrollLock } from '@/components/om/use-scroll-lock'
import { ChipRail } from '@/components/om/chip-rail'

type Pick = 'existing' | 'new'
/** Rows of the merge / detail table, in mock order. */
const FIELDS: { label: string; key: string; leadKey: 'name' | 'phone' | 'email' | 'budgetMinor' | 'source' | 'propertyType' | 'propertyAddress'; radio: boolean }[] = [
  { label: 'Lead name', key: 'Lead Name', leadKey: 'name', radio: true },
  { label: 'Phone', key: 'Lead Phone Number', leadKey: 'phone', radio: true },
  { label: 'Email', key: 'Lead Email', leadKey: 'email', radio: true },
  { label: 'Budget (S$)', key: 'Estimated Budget (S$)', leadKey: 'budgetMinor', radio: true },
  { label: 'Source', key: 'Lead Source', leadKey: 'source', radio: false },
  { label: 'Property type', key: 'Property Type', leadKey: 'propertyType', radio: false },
  { label: 'Address', key: 'Property Address', leadKey: 'propertyAddress', radio: false },
]
const fmtBudget = (v: string) => { const d = v.replace(/\D/g, ''); return d ? Number(d).toLocaleString('en-SG') : '' }

export function ReviewSheet({
  open, rows, now, onClose, onApprove, onReject, onMerge,
}: {
  open: boolean
  rows: ReviewRow[]
  now: number
  onClose: () => void
  onApprove: (ids: string[]) => Promise<boolean>
  onReject: (ids: string[]) => Promise<boolean>
  onMerge: (rowId: string, picks: Record<string, Pick>) => Promise<boolean>
}) {
  useScrollLock(open)   // the page never scrolls behind this surface
  const [source, setSource] = useState<string | null>(null)
  const [dupOnly, setDupOnly] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [picks, setPicks] = useState<Record<string, Pick>>({})
  const [busy, setBusy] = useState(false)
  const [wasOpen, setWasOpen] = useState(false)
  const busyRef = useRef(false)

  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) { setSource(null); setDupOnly(false); setSelectedId(null); setPicks({}); setBusy(false) }
  }
  useEffect(() => { if (open) busyRef.current = false }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !e.defaultPrevented && !busyRef.current) onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const sources = useMemo(() => {
    const m = new Map<string, number>()
    for (const r of rows) { const s = r.data['Lead Source'] || 'Others'; m.set(s, (m.get(s) ?? 0) + 1) }
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [rows])
  const duplicates = rows.filter((r) => r.row.status === 'duplicate')
  const clean = rows.filter((r) => r.row.status === 'pending')
  // Filters are derived from the live queue so a chip/toggle can't go stale after a refresh.
  const activeSource = source !== null && sources.some(([s]) => s === source) ? source : null
  const effectiveDupOnly = dupOnly && duplicates.length > 0
  const visible = rows.filter((r) => (!activeSource || (r.data['Lead Source'] || 'Others') === activeSource) && (!effectiveDupOnly || r.row.status === 'duplicate'))
  const selected = visible.find((r) => r.row.id === selectedId) ?? visible[0] ?? null

  // Radios default to the existing value (mock); picks are keyed by row id + label.
  const pickOf = (label: string): Pick => picks[`${selected?.row.id}:${label}`] ?? 'existing'
  const setPick = (label: string, v: Pick) => { if (selected) setPicks((p) => ({ ...p, [`${selected.row.id}:${label}`]: v })) }

  const run = async (fn: () => Promise<boolean>) => {
    if (busyRef.current) return
    busyRef.current = true; setBusy(true)
    try { await fn() } finally { busyRef.current = false; setBusy(false) }
  }

  const existingValue = (r: ReviewRow, f: (typeof FIELDS)[number]) => {
    const l = r.existing
    if (!l) return ''
    if (f.leadKey === 'budgetMinor') return Math.round(l.budgetMinor / 100).toLocaleString('en-SG')
    return (l[f.leadKey] as string | null) ?? ''
  }
  const newValue = (r: ReviewRow, f: (typeof FIELDS)[number]) => {
    const v = r.data[f.key] ?? ''
    return f.leadKey === 'budgetMinor' ? fmtBudget(v) : v
  }
  const matchedLabel = (r: ReviewRow) => (r.row.matchedOn === 'email' ? 'Email' : r.row.matchedOn === 'phone' ? 'Phone' : null)

  return (
    <AnimatePresence>
      {open ? (
        <motion.div className={styles.overlay} variants={overlayFade} initial="initial" animate="animate" exit="exit">
          <motion.div className={styles.panel} variants={sheetRise} role="dialog" aria-modal aria-label="Review imported leads">
            <div className={styles.heading}>
              <div className={styles.titleGroup}>
                <span className={styles.title}>Review imported leads ({rows.length})</span>
              </div>
              <button type="button" className={styles.closeBtn} aria-label="Close review" onClick={onClose} disabled={busy}>
                <Icon name="close" size={20} family="outlined" />
              </button>
            </div>

            <div className={styles.toolbar}>
              <ChipRail label="Filter by source">
                <button type="button" className={styles.chip} data-selected={activeSource === null || undefined} onClick={() => setSource(null)}>All</button>
                {sources.map(([s, n]) => (
                  <button key={s} type="button" className={styles.chip} data-selected={activeSource === s || undefined} onClick={() => setSource(source === s ? null : s)}>
                    {s} ({n})
                  </button>
                ))}
              </ChipRail>
              <span className={styles.vdivider} />
              <Switch size="sm" isSelected={effectiveDupOnly} onChange={setDupOnly} aria-label="Show only duplicates" />
              <span className={styles.toggleLabel}>Show only duplicates ({duplicates.length})</span>
              <button type="button" className={styles.greenBtn} disabled={clean.length === 0 || busy}
                      onClick={() => { void run(() => onApprove(clean.map((r) => r.row.id))) }}>
                Approve All Clean ({clean.length})
              </button>
            </div>

            <div className={styles.body}>
              <div className={styles.list} role="list">
                {visible.length === 0 ? <div className={styles.emptyList}>{rows.length === 0 ? 'Nothing left to review.' : 'No leads match this filter.'}</div> : null}
                {visible.map((r) => {
                  const isDup = r.row.status === 'duplicate'
                  const canMerge = isDup && !!r.existing
                  const sel = selected?.row.id === r.row.id
                  return (
                    <div key={r.row.id} role="listitem" className={styles.card} data-selected={sel || undefined}
                         onClick={() => setSelectedId(r.row.id)} tabIndex={0}
                         onKeyDown={(e) => { if (e.key === 'Enter') setSelectedId(r.row.id) }}>
                      <div className={styles.cardHead}>
                        <span className={styles.cardName}>{r.data['Lead Name']}</span>
                        <span className={styles.cardAgo}>{relativeTime(r.receivedAt, new Date(now))}</span>
                      </div>
                      <span className={styles.cardMeta}>
                        {[r.data['Lead Phone Number'], r.data['Estimated Budget (S$)'] ? `S$${fmtBudget(r.data['Estimated Budget (S$)'] ?? '')}` : '', r.data['Lead Source']].filter(Boolean).join(' · ')}
                      </span>
                      {isDup ? <span className={styles.matchBox}>Matches: {r.existing ? r.existing.name : 'another lead in this file'}</span> : null}
                      <div className={styles.cardFoot}>
                        <span className={styles.tag} data-tone={isDup ? 'duplicate' : 'pending'}>{isDup ? 'Duplicate' : 'Pending'}</span>
                        <span className={styles.cardActions}>
                          {canMerge ? (
                            <button type="button" className={styles.link} data-tone="primary" onClick={(e) => { e.stopPropagation(); setSelectedId(r.row.id) }}>View &amp; Merge</button>
                          ) : (
                            <>
                              <button type="button" className={styles.link} data-tone="red" disabled={busy}
                                      onClick={(e) => { e.stopPropagation(); void run(() => onReject([r.row.id])) }}>Reject</button>
                              <button type="button" className={styles.link} data-tone="green" disabled={busy}
                                      onClick={(e) => { e.stopPropagation(); void run(() => onApprove([r.row.id])) }}>Approve</button>
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className={styles.detail}>
                {!selected ? (
                  <div className={styles.emptyDetail}>Select a lead to review it.</div>
                ) : selected.row.status === 'duplicate' && selected.existing ? (
                  <>
                    <div className={styles.detailBody}>
                      <span className={styles.detailTitle}>Merge with existing lead</span>
                      <div className={styles.table} role="table" aria-label="Merge fields">
                        <div className={styles.tr} role="row">
                          <div className={`${styles.th} ${styles.cLabel}`} />
                          <div className={`${styles.th} ${styles.cCol}`}>Existing · {displayDate(selected.existing.createdAt)}</div>
                          <div className={`${styles.th} ${styles.cCol}`}>New · {selected.data['Lead Source'] || 'Import'} · {relativeTime(selected.receivedAt, new Date(now))}</div>
                          <div className={`${styles.th} ${styles.cMerged}`}>Merged result</div>
                        </div>
                        {FIELDS.map((f) => {
                          const ex = existingValue(selected, f)
                          const nw = newValue(selected, f)
                          const matched = matchedLabel(selected) === f.label
                          const pick: Pick = nw ? pickOf(f.label) : 'existing'
                          const merged = f.radio ? (pick === 'new' ? nw : ex) : (ex || nw)
                          const showAlt = f.label === 'Phone' && ex && nw && ex !== nw
                          return (
                            <div key={f.label} className={styles.tr} role="row" data-matched={matched || undefined}>
                              <div className={`${styles.td} ${styles.cLabel}`} data-warn={matched || undefined}>
                                {f.label}{matched ? <span data-warn><Icon name="warning" size={16} /></span> : null}
                              </div>
                              <div className={`${styles.td} ${styles.cCol}`}>
                                {f.radio ? (
                                  <button type="button" className={styles.radioBtn} data-on={pick === 'existing' || undefined} aria-label={`Keep existing ${f.label}`} onClick={() => setPick(f.label, 'existing')}>
                                    <Icon name={pick === 'existing' ? 'radio_button_checked' : 'radio_button_unchecked'} size={20} />
                                  </button>
                                ) : null}
                                <span className={styles.cValue}>{ex || '—'}</span>
                              </div>
                              <div className={`${styles.td} ${styles.cCol}`}>
                                {matched ? (
                                  <span className={`${styles.cValue} ${styles.matchedNote}`}>identical - matched on this</span>
                                ) : (
                                  <>
                                    {f.radio && nw ? (
                                      <button type="button" className={styles.radioBtn} data-on={pick === 'new' || undefined} aria-label={`Use new ${f.label}`} onClick={() => setPick(f.label, 'new')}>
                                        <Icon name={pick === 'new' ? 'radio_button_checked' : 'radio_button_unchecked'} size={20} />
                                      </button>
                                    ) : null}
                                    <span className={styles.cValue} style={!f.radio ? { color: 'var(--om-color-on-surface-secondary)' } : undefined}>{nw || '—'}</span>
                                  </>
                                )}
                              </div>
                              <div className={`${styles.td} ${styles.cMerged}`}>
                                <span>{merged || '—'}{showAlt ? <span className={styles.altNote}> ({pick === 'new' ? ex : nw} kept as alt)</span> : null}</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                    <div className={styles.footer}>
                      <span className={styles.note}>Notes, tasks and activity from both leads are kept. Merge can be undone for 30 days.</span>
                      <span className={styles.spacer} />
                      <button type="button" className={styles.outlineBtn} data-tone="red" disabled={busy} onClick={() => { void run(() => onReject([selected.row.id])) }}>Reject New</button>
                      <Button variant="secondary" appearance="outlined" isDisabled={busy} onPress={() => { void run(() => onApprove([selected.row.id])) }}>Keep Both</Button>
                      <Button isDisabled={busy}
                              onPress={() => {
                                const p: Record<string, Pick> = {}
                                for (const f of FIELDS) if (f.radio) p[f.label] = newValue(selected, f) ? pickOf(f.label) : 'existing'
                                void run(() => onMerge(selected.row.id, p))
                              }}>Merge into Existing</Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className={styles.detailBody}>
                      <span className={styles.detailTitle}>{selected.row.status === 'duplicate' ? 'Duplicate of an earlier row in this file' : 'New lead'}</span>
                      {selected.row.status === 'duplicate' ? <span className={styles.note}>No existing lead to merge with — approve to keep it as a separate lead, or reject it.</span> : null}
                      <div className={styles.table} role="table" aria-label="New lead details">
                        <div className={styles.tr} role="row">
                          <div className={`${styles.th} ${styles.cLabel}`} />
                          <div className={styles.th} style={{ flex: 1 }}>New · {displayDate(selected.receivedAt)}</div>
                        </div>
                        {FIELDS.map((f) => (
                          <div key={f.label} className={styles.tr} role="row">
                            <div className={`${styles.td} ${styles.cLabel}`}>{f.label}</div>
                            <div className={styles.td} style={{ flex: 1 }}><span className={styles.cValue}>{newValue(selected, f) || '—'}</span></div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className={styles.footer}>
                      <span className={styles.spacer} />
                      <button type="button" className={styles.outlineBtn} data-tone="red" disabled={busy} onClick={() => { void run(() => onReject([selected.row.id])) }}>Reject</button>
                      <button type="button" className={styles.greenBtn} disabled={busy} onClick={() => { void run(() => onApprove([selected.row.id])) }}>Approve</button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
