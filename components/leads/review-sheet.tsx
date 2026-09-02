'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Button, Switch } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { overlayFade, modalPanel } from '@/lib/motion'
import { displayDate, relativeTime } from '@/lib/format'
import type { ReviewRow } from '@/lib/leads/queries'
import styles from './review-sheet.module.css'
import { useScrollLock } from '@/components/om/use-scroll-lock'
import { useDialogFocus, useEscapeLayer } from '@/components/om/surface'
import { ChipRail } from '@/components/om/chip-rail'
import { Tooltip } from '@/components/om/tooltip'

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

  /* (REG-287) aria-modal told assistive tech the page behind was inert while nothing held focus in: Tab walked
     straight out of the panel. Same policy as Dialog / the Move stage window (components/om/surface.ts) — Esc
     closes this surface only while it is the topmost one, focus moves into the panel on open, Tab cycles inside
     it, and the opener gets focus back on close. Esc keeps its own gate: an approve / reject / merge in flight
     is never interrupted (the ref is read in the handler, never in render). */
  const panelRef = useRef<HTMLDivElement>(null)
  const escClose = useCallback(() => { if (!busyRef.current) onClose() }, [onClose])
  useEscapeLayer(open, panelRef, escClose)
  useDialogFocus(open, panelRef)

  const duplicates = rows.filter((r) => r.row.status === 'duplicate')
  const clean = rows.filter((r) => r.row.status === 'pending')
  const effectiveDupOnly = dupOnly && duplicates.length > 0
  // Chip counts describe what the list shows: with "only duplicates" on they count duplicates only (user 2026-08-29).
  const countable = effectiveDupOnly ? duplicates : rows
  const sources = useMemo(() => {
    const m = new Map<string, number>()
    for (const r of countable) { const s = r.data['Lead Source'] || 'Others'; m.set(s, (m.get(s) ?? 0) + 1) }
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [countable])
  // Filters are derived from the live queue so a chip/toggle can't go stale after a refresh.
  const activeSource = source !== null && sources.some(([s]) => s === source) ? source : null
  const visible = rows.filter((r) => (!activeSource || (r.data['Lead Source'] || 'Others') === activeSource) && (!effectiveDupOnly || r.row.status === 'duplicate'))
  const selected = visible.find((r) => r.row.id === selectedId) ?? visible[0] ?? null
  // The queue-duplicate comparison's two column headings, lifted out of the head row so the ≤767 stacked
  // layout can repeat them inside the cells (REG-269) — same copy, one source.
  const twin = selected?.twin ?? null
  const twinHead = twin
    ? `${twin.sameFile ? 'In this file' : 'Queued earlier'} · ${twin.status === 'approved' ? 'already added' : twin.status === 'pending' ? 'awaiting review' : twin.status}`
    : ''
  const thisRowHead = selected ? `This row · ${displayDate(selected.receivedAt)}` : ''

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
  // Frozen-column shadows only while the table is scrolled (user 2026-08-29).
  const markScroll = (e: React.UIEvent<HTMLDivElement>) => e.currentTarget.toggleAttribute('data-scrolled', e.currentTarget.scrollLeft > 0)
  const matchedLabel = (r: ReviewRow) => (r.row.matchedOn === 'email' ? 'Email' : r.row.matchedOn === 'phone' ? 'Phone' : null)

  return (
    <AnimatePresence>
      {open ? (
        <motion.div className={styles.overlay} variants={overlayFade} initial="initial" animate="animate" exit="exit">
          {/* (REG-287) `outline: none`: focus lands on the panel on open (surface.ts) and the ring belongs to its
              controls — the same rule Dialog and the Move stage window carry in their stylesheets. */}
          <motion.div ref={panelRef} className={styles.panel} variants={modalPanel} role="dialog" aria-modal aria-label="Review imported leads"
                      tabIndex={-1} style={{ outline: 'none' }}>
            <div className={styles.heading}>
              <div className={styles.titleGroup}>
                <span className={styles.title}>Review imported leads ({rows.length})</span>
              </div>
              <Tooltip label="Close review" disabled={busy}>
                <button type="button" className={styles.closeBtn} aria-label="Close review" onClick={onClose} disabled={busy}>
                  <Icon name="close" size={24} family="outlined" />
                </button>
              </Tooltip>
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
              <Button className={styles.toneGreen} isDisabled={clean.length === 0 || busy}
                      onPress={() => { void run(() => onApprove(clean.map((r) => r.row.id))) }}>
                Approve All Clean ({clean.length})
              </Button>
            </div>

            {/* Responsive (REG-269): below 1200 the queue and the detail are two screens — data-pane says
                which one is showing. At desktop both panes render side by side exactly as the mock draws them. */}
            <div className={styles.body} data-pane={selectedId ? 'detail' : 'list'}>
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
                      <div className={styles.cardData}>
                        <div className={styles.cardHead}>
                          <span className={styles.cardName}>{r.data['Lead Name']}</span>
                          <span className={styles.cardAgo}>{relativeTime(r.receivedAt, new Date(now))}</span>
                        </div>
                        <span className={styles.cardMeta}>
                          {[r.data['Lead Phone Number'], r.data['Estimated Budget (S$)'] ? `S$${fmtBudget(r.data['Estimated Budget (S$)'] ?? '')}` : '', r.data['Lead Source']].filter(Boolean).join(' · ')}
                        </span>
                      </div>
                      {isDup ? <span className={styles.matchBox}>Matches: {r.existing ? r.existing.name : r.twin ? `${r.twin.data['Lead Name'] || 'a row'} (${r.twin.sameFile ? 'in this file' : 'in the queue'})` : 'another lead in this file'}</span> : null}
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
                {/* ≤1199 only (display:none above): returns the queue to the screen. */}
                <button type="button" className={styles.backBar} onClick={() => setSelectedId(null)}>
                  <Icon name="arrow_back" size={20} weight={300} />Back to queue
                </button>
                {!selected ? (
                  <div className={styles.emptyDetail}>Select a lead to review it.</div>
                ) : selected.row.status === 'duplicate' && selected.existing ? (
                  <>
                    <div className={styles.detailBody}>
                      <span className={styles.detailTitle}>Merge with existing lead</span>
                      <div className={styles.table} role="table" onScroll={markScroll} aria-label="Merge fields">
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
                          // Merged result mirrors mergeImportRow (app/leads/actions.ts): only the radio fields are sent
                          // as picks, so Source / Property type / Address always keep the existing value. `ex || nw`
                          // promised the imported one whenever the lead had none — an address the merge never writes.
                          const merged = f.radio ? (pick === 'new' ? nw : ex) : ex
                          const showAlt = f.label === 'Phone' && ex && nw && ex !== nw
                          return (
                            <div key={f.label} className={styles.tr} role="row" data-matched={matched || undefined}>
                              <div className={`${styles.td} ${styles.cLabel}`} data-warn={matched || undefined}>
                                {f.label}{matched ? <span data-warn><Icon name="warning" size={16} /></span> : null}
                              </div>
                              <div className={`${styles.td} ${styles.cCol}`}>
                                {f.radio ? (
                                  <Tooltip label={`Keep existing ${f.label}`}>
                                    <button type="button" className={styles.radioBtn} data-on={pick === 'existing' || undefined} aria-label={`Keep existing ${f.label}`} onClick={() => setPick(f.label, 'existing')}>
                                      <Icon name={pick === 'existing' ? 'radio_button_checked' : 'radio_button_unchecked'} size={20} />
                                    </button>
                                  </Tooltip>
                                ) : null}
                                <span className={styles.cValue}>{ex || '—'}</span>
                              </div>
                              <div className={`${styles.td} ${styles.cCol}`}>
                                {matched ? (
                                  <span className={`${styles.cValue} ${styles.matchedNote}`}>identical - matched on this</span>
                                ) : (
                                  <>
                                    {f.radio && nw ? (
                                      <Tooltip label={`Use new ${f.label}`}>
                                        <button type="button" className={styles.radioBtn} data-on={pick === 'new' || undefined} aria-label={`Use new ${f.label}`} onClick={() => setPick(f.label, 'new')}>
                                          <Icon name={pick === 'new' ? 'radio_button_checked' : 'radio_button_unchecked'} size={20} />
                                        </button>
                                      </Tooltip>
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
                      <Button variant="secondary" appearance="outlined" className={styles.toneRed} isDisabled={busy} onPress={() => { void run(() => onReject([selected.row.id])) }}>Reject New</Button>
                      <Button variant="secondary" appearance="outlined" isDisabled={busy} onPress={() => { void run(() => onApprove([selected.row.id])) }}>Keep Both</Button>
                      <Button isDisabled={busy}
                              onPress={() => {
                                const p: Record<string, Pick> = {}
                                for (const f of FIELDS) if (f.radio) p[f.label] = newValue(selected, f) ? pickOf(f.label) : 'existing'
                                void run(() => onMerge(selected.row.id, p))
                              }}>Merge into Existing</Button>
                    </div>
                  </>
                ) : selected.row.status === 'duplicate' && selected.twin ? (
                  <>
                    {/* In-file duplicate (user 2026-08-29: the match was never shown): the row it collided with, side by side. */}
                    <div className={styles.detailBody}>
                      <span className={styles.detailTitle}>{selected.twin.sameFile ? 'Duplicate of another row in this file' : 'Duplicate of a row already in the queue'}</span>
                      <span className={styles.note}>{selected.twin.sameFile ? 'Both rows came in the same file' : `The same lead was imported earlier (${selected.twin.fileName})`} — there is no existing lead to merge into. Keep both as separate leads, or reject this one.</span>
                      {/* data-stack: at ≤767 this comparison stacks its two records one above the other (REG-269) —
                          the merge table next door keeps its frozen edges instead. */}
                      <div className={styles.table} data-stack role="table" onScroll={markScroll} aria-label="Duplicate rows">
                        <div className={styles.tr} role="row">
                          <div className={`${styles.th} ${styles.cLabel}`} />
                          <div className={`${styles.th} ${styles.cCol}`}>{twinHead}</div>
                          <div className={`${styles.th} ${styles.cCol}`}>{thisRowHead}</div>
                        </div>
                        {FIELDS.map((f) => {
                          const tw = newValue({ ...selected, data: selected.twin!.data }, f)
                          const nw = newValue(selected, f)
                          const matched = matchedLabel(selected) === f.label
                          return (
                            <div key={f.label} className={styles.tr} role="row" data-matched={matched || undefined}>
                              <div className={`${styles.td} ${styles.cLabel}`} data-warn={matched || undefined}>
                                {f.label}{matched ? <span data-warn><Icon name="warning" size={16} /></span> : null}
                              </div>
                              <div className={`${styles.td} ${styles.cCol}`}>
                                <span className={styles.stackLabel}>{twinHead}</span>
                                <span className={styles.cValue}>{tw || '—'}</span>
                              </div>
                              <div className={`${styles.td} ${styles.cCol}`}>
                                <span className={styles.stackLabel}>{thisRowHead}</span>
                                {matched ? <span className={`${styles.cValue} ${styles.matchedNote}`}>identical - matched on this</span> : <span className={styles.cValue}>{nw || '—'}</span>}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                    <div className={styles.footer}>
                      <span className={styles.spacer} />
                      <Button variant="secondary" appearance="outlined" className={styles.toneRed} isDisabled={busy} onPress={() => { void run(() => onReject([selected.row.id])) }}>Reject</Button>
                      <Button isDisabled={busy} onPress={() => { void run(() => onApprove([selected.row.id])) }}>Keep Both</Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className={styles.detailBody}>
                      <span className={styles.detailTitle}>{selected.row.status === 'duplicate' ? 'Duplicate of an earlier row in this file' : 'New lead'}</span>
                      {selected.row.status === 'duplicate' ? <span className={styles.note}>No existing lead to merge with — approve to keep it as a separate lead, or reject it.</span> : null}
                      <div className={styles.table} role="table" onScroll={markScroll} aria-label="New lead details">
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
                      <Button variant="secondary" appearance="outlined" className={styles.toneRed} isDisabled={busy} onPress={() => { void run(() => onReject([selected.row.id])) }}>Reject</Button>
                      <Button className={styles.toneGreen} isDisabled={busy} onPress={() => { void run(() => onApprove([selected.row.id])) }}>Approve</Button>
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
