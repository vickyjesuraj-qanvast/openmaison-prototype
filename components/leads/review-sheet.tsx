'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Button, Switch, Tag } from '@/components/ds'
import { Chips } from '@/components/om/chips'
import { Icon } from '@/components/om/icon'
import { useOverflow } from '@/components/om/use-overflow'
import { overlayFade, modalPanel } from '@/lib/motion'
import { displayDate, phoneLocal } from '@/lib/format'
import { whenWords } from '@/lib/leads/row-text'
import type { ReviewRow } from '@/lib/leads/queries'
import { readAmount } from '@/lib/leads/import-values'
import styles from './review-sheet.module.css'
import { useScrollLock } from '@/components/om/use-scroll-lock'
import { useDialogFocus, useEscapeLayer } from '@/components/om/surface'
import { ChipRail } from '@/components/om/chip-rail'
import { Tooltip } from '@/components/om/tooltip'
import { FootStart, SurfaceFoot, SurfaceHead, surfaceClasses } from '@/components/om/dialog'
import { TABLET_DOWN, useMediaQuery } from '@/lib/breakpoint'

type Pick = 'existing' | 'new'
/** Rows of the merge / detail table, in mock order. */
/* (REG-609, parity I-04) Every mapped field, not the mock's seven: 1.0's merge fills whatever the original lacks. `radio` = the
   field takes a radio when BOTH sides carry a value (the owner's call); a field only the new side has fills in by itself, and
   Remarks are appended rather than swapped. mergeImportRow (app/leads/actions.ts) applies the same rule. */
type MergeKey = 'name' | 'phone' | 'email' | 'budgetMinor' | 'source' | 'propertyType' | 'propertyAddress' | 'area' | 'leadAddress' | 'condition' | 'style' | 'areaSqft' | 'keyCollection' | 'estimatedStartDate' | 'notes'
const FIELDS: { label: string; key: string; leadKey: MergeKey; radio: boolean }[] = [
  { label: 'Lead name', key: 'Lead Name', leadKey: 'name', radio: true },
  { label: 'Phone', key: 'Lead Phone Number', leadKey: 'phone', radio: true },
  { label: 'Email', key: 'Lead Email', leadKey: 'email', radio: true },
  { label: 'Budget (S$)', key: 'Estimated Budget (S$)', leadKey: 'budgetMinor', radio: true },
  { label: 'Source', key: 'Lead Source', leadKey: 'source', radio: true },
  { label: 'Property type', key: 'Property Type', leadKey: 'propertyType', radio: true },
  { label: 'Property address', key: 'Property Address', leadKey: 'propertyAddress', radio: true },   /* (the calm UI build — 2-16) named apart from the lead's own address, as the form names them */
  { label: 'District', key: 'District', leadKey: 'area', radio: true },
  { label: 'Lead address', key: 'Lead Address', leadKey: 'leadAddress', radio: true },
  { label: 'Condition', key: 'Condition', leadKey: 'condition', radio: true },
  { label: 'Style', key: 'Style', leadKey: 'style', radio: true },
  { label: 'Area size', key: 'Area Size', leadKey: 'areaSqft', radio: true },
  { label: 'Key collection', key: 'Key Collection', leadKey: 'keyCollection', radio: true },
  { label: 'Start date', key: 'Estimated Start Date', leadKey: 'estimatedStartDate', radio: true },
  { label: 'Remarks', key: 'Remarks', leadKey: 'notes', radio: false },
]
/* (UX audit L4) The import's one reader: a row queued before it existed ("S$80k") shows the 80,000 the lead will get, not "80". */
const fmtBudget = (v: string) => { const n = readAmount(v).value; return n && n > 0 ? n.toLocaleString('en-SG') : '' }
/** The "All" chip's value — no source is ever called this. */
const ALL_SOURCES = '__all__'

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
  /* (Leads on the move, L3 — P-09 · A-24) ≤1024 the merge shows only what differs (and the field it matched on), the rest under "n the same ·
     Show all" — one differing phone was 8.7 screens of Existing / New / Merged rows. The desk keeps the mock's full table. */
  const touch = useMediaQuery(TABLET_DOWN)
  const [showAll, setShowAll] = useState(false)

  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) { setSource(null); setDupOnly(false); setSelectedId(null); setPicks({}); setBusy(false) }
  }
  useEffect(() => { if (open) busyRef.current = false }, [open])

  /* (REG-287) aria-modal told assistive tech the page behind was inert while nothing held focus in: Tab walked
     straight out of the panel. Same policy as Dialog / the Move stage window (components/om/surface.ts) — Esc
     closes this surface only while it is the topmost one, focus moves into the panel on open, Tab cycles inside
     it, and the opener gets focus back on close. Esc and the head's close share one gate: an approve / reject /
     merge in flight is never interrupted (the ref is read in the handler, never in render). */
  const panelRef = useRef<HTMLDivElement>(null)
  const close = useCallback(() => { if (!busyRef.current) onClose() }, [onClose])
  useEscapeLayer(open, panelRef, close)
  useDialogFocus(open, panelRef)
  const [scrollRef, bodyScrolls] = useOverflow()   // the footer's shadow follows the body's scroll (REG-322)

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
  /* every lead opens on what differs (render-phase adjust: the shown lead changed) */
  const [seenMerge, setSeenMerge] = useState<string | null>(null)
  if ((selected?.row.id ?? null) !== seenMerge) { setSeenMerge(selected?.row.id ?? null); setShowAll(false) }
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
    if (f.leadKey === 'budgetMinor') return l.budgetMinor ? Math.round(l.budgetMinor / 100).toLocaleString('en-SG') : ''
    if (f.leadKey === 'phone') return l.phone ? phoneLocal(l.phone) : ''   // (leads on the move, A-16 · REG-456) both sides grouped — "9123 4567" beside "91234567" read as two numbers
    const v: unknown = l[f.leadKey]
    if (v instanceof Date) return displayDate(v)
    if (typeof v === 'number') return v ? String(v) : ''
    return (v as string | null) ?? ''
  }
  const newValue = (r: ReviewRow, f: (typeof FIELDS)[number]) => {
    const v = r.data[f.key] ?? ''
    return f.leadKey === 'budgetMinor' ? fmtBudget(v) : f.leadKey === 'phone' ? phoneLocal(v) : v
  }
  // Frozen-column shadows only while the table is scrolled (user 2026-08-29).
  const markScroll = (e: React.UIEvent<HTMLDivElement>) => e.currentTarget.toggleAttribute('data-scrolled', e.currentTarget.scrollLeft > 0)
  const matchedLabel = (r: ReviewRow) => (r.row.matchedOn === 'email' ? 'Email' : r.row.matchedOn === 'phone' ? 'Phone' : null)

  return (
    <AnimatePresence>
      {open ? (
        <motion.div className={styles.overlay} variants={overlayFade} initial="initial" animate="animate" exit="exit">
          <motion.div ref={panelRef} className={`${surfaceClasses.panel} ${styles.panel}`} variants={modalPanel} role="dialog" aria-modal aria-label="Review imported leads"
                      tabIndex={-1}>
            {/* (REG-725) the house head and foot (components/om/dialog.tsx), on the house panel; the close takes Esc's gate */}
            <SurfaceHead title={`Review imported leads · ${rows.length}`} onClose={close} closeLabel="Close review" closeDisabled={busy} className={styles.heading} />

            <div className={styles.toolbar}>
              <ChipRail label="Filter by source">
                {/* (REG-729) The house chips (components/om/chips.tsx): one pick, arrow keys between them; pressing the picked source
                    again lets go of it, back to All, as it always did. */}
                <Chips label="Filter by source" value={activeSource ?? ALL_SOURCES}
                       options={[{ value: ALL_SOURCES, label: 'All' }, ...sources.map(([s, n]) => ({ value: s, label: `${s} · ${n}` }))]}
                       onChange={(v) => setSource(v === ALL_SOURCES || v === source ? null : v)} />
              </ChipRail>
              <span className={styles.vdivider} />
              <Switch size="sm" isSelected={effectiveDupOnly} onChange={setDupOnly} aria-label="Show only duplicates" />
              <span className={styles.toggleLabel}>Show only duplicates · {duplicates.length}</span>
              {/* (the calm UI build 2026-10-27 — audit 2-16, W-481) the house primary, in words: the green filled "Approve All Clean (13)" was off the palette */}
              <Button isDisabled={clean.length === 0 || busy} data-testid="review-approve-clean"
                      onPress={() => { void run(() => onApprove(clean.map((r) => r.row.id))) }}>
                {`Approve ${clean.length} (no duplicates)`}
              </Button>
            </div>

            {/* Responsive (REG-269): below 1025 the queue and the detail are two screens — data-pane says
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
                          <span className={styles.cardAgo}>{whenWords(r.receivedAt, now)}</span>   {/* (the calm UI build — 2-16 · T-11) one date format */}
                        </div>
                        <span className={styles.cardMeta}>
                          {[r.data['Lead Phone Number'] ? phoneLocal(r.data['Lead Phone Number']) : '', r.data['Estimated Budget (S$)'] ? `S$${fmtBudget(r.data['Estimated Budget (S$)'] ?? '')}` : '', r.data['Lead Source']].filter(Boolean).join(' · ')}   {/* (leads on the move, A-16 · REG-456) the number grouped, as everywhere */}
                        </span>
                      </div>
                      {isDup ? <span className={styles.matchBox}>Matches: {r.existing ? r.existing.name : r.twin ? `${r.twin.data['Lead Name'] || 'a row'} (${r.twin.sameFile ? 'in this file' : 'in the queue'})` : 'another lead in this file'}</span> : null}
                      {/* (the calm UI build 2026-10-27 — audit 2-16, W-585 · W-639 · T-02) No tag for the default state (every card was PENDING) — only a
                          duplicate says so; no verbs on the cards: a card press opens it, and its Approve / Reject / Merge live once, in the detail's foot */}
                      {isDup ? (
                        <div className={styles.cardFoot}>
                          <Tag appearance="outlined" color="yellow">Duplicate</Tag>
                          {canMerge ? <span className={styles.cardActions}><span className={styles.cardHint}>Compare to merge</span></span> : null}
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>

              <div className={styles.detail}>
                {/* ≤1024 only (display:none above): returns the queue to the screen. */}
                <button type="button" className={styles.backBar} onClick={() => setSelectedId(null)}>
                  <Icon name="arrow_back" size={20} weight={300} />Back to queue
                </button>
                {!selected ? (
                  <div className={styles.emptyDetail}>Select a lead to review it.</div>
                ) : selected.row.status === 'duplicate' && selected.existing ? (
                  <>
                    <div ref={scrollRef} className={styles.detailBody}>
                      <span className={styles.detailTitle}>Merge with existing lead</span>
                      <div className={styles.table} role="table" onScroll={markScroll} aria-label="Merge fields">
                        <div className={styles.tr} role="row">
                          <div className={`${styles.th} ${styles.cLabel}`} />
                          <div className={`${styles.th} ${styles.cCol}`}>Existing · {displayDate(selected.existing.createdAt)}</div>
                          <div className={`${styles.th} ${styles.cCol}`}>New · {selected.data['Lead Source'] || 'Import'} · {whenWords(selected.receivedAt, now)}</div>
                          <div className={`${styles.th} ${styles.cMerged}`}>Merged result</div>
                        </div>
                        {/* (REG-397) The stacked table at ≤767 hides the head row, so each value cell repeats its
                            own heading — the twin table's `.stackLabel` move. Without them the merge read as two
                            unlabelled copies of the same name with a third below: nothing said which was which. */}
                        {FIELDS.filter((f) => showAll || !touch || matchedLabel(selected) === f.label || (!!newValue(selected, f) && newValue(selected, f) !== existingValue(selected, f))).map((f) => {
                          const ex = existingValue(selected, f)
                          const nw = newValue(selected, f)
                          const matched = matchedLabel(selected) === f.label
                          const pick: Pick = nw ? pickOf(f.label) : 'existing'
                          // (REG-609) Merged result mirrors mergeImportRow (app/leads/actions.ts): a pick wins, else the existing
                          // value, else the new one fills the gap; Remarks are appended. A radio appears only where both sides have a value.
                          const both = !!ex && !!nw
                          const merged = f.radio ? (pick === 'new' ? nw : ex || nw) : (ex && nw && nw !== ex ? `${ex} · ${nw}` : ex || nw)
                          const showAlt = f.label === 'Phone' && ex && nw && ex !== nw
                          return (
                            <div key={f.label} className={styles.tr} role="row" data-matched={matched || undefined}>
                              <div className={`${styles.td} ${styles.cLabel}`} data-warn={matched || undefined}>
                                {f.label}{matched ? <span data-warn><Icon name="warning" size={16} /></span> : null}
                              </div>
                              <div className={`${styles.td} ${styles.cCol}`}>
                                <span className={styles.stackLabel}>Existing{selected.existing ? ` · ${displayDate(selected.existing.createdAt)}` : ''}</span>
                                {f.radio && both ? (
                                  <Tooltip label={`Keep existing ${f.label}`}>
                                    <button type="button" className={styles.radioBtn} data-on={pick === 'existing' || undefined} aria-label={`Keep existing ${f.label}`} onClick={() => setPick(f.label, 'existing')}>
                                      <Icon name={pick === 'existing' ? 'radio_button_checked' : 'radio_button_unchecked'} size={20} />
                                    </button>
                                  </Tooltip>
                                ) : null}
                                <span className={styles.cValue}>{ex || '—'}</span>
                              </div>
                              <div className={`${styles.td} ${styles.cCol}`}>
                                <span className={styles.stackLabel}>New · {selected.data['Lead Source'] || 'Import'} · {whenWords(selected.receivedAt, now)}</span>
                                {matched ? (
                                  <span className={`${styles.cValue} ${styles.matchedNote}`}>identical - matched on this</span>
                                ) : (
                                  <>
                                    {f.radio && both ? (
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
                                <span className={styles.stackLabel}>Merged result</span>
                                <span>{merged || '—'}{showAlt ? <span className={styles.altNote}> ({pick === 'new' ? ex : nw} kept as alt)</span> : null}</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      {(() => {
                        /* (A-24) what is the same, folded under one press */
                        if (!touch) return null
                        const same = FIELDS.filter((f) => !(matchedLabel(selected) === f.label || (!!newValue(selected, f) && newValue(selected, f) !== existingValue(selected, f)))).length
                        if (!same) return null
                        return (
                          <Button appearance="text" onPress={() => setShowAll((v) => !v)} data-testid="merge-show-all">
                            {showAll ? 'Show only what differs' : `${same} the same · Show all ${FIELDS.length}`}
                          </Button>
                        )
                      })()}
                    </div>
                    {/* (REG-725) the house foot, kept in the detail pane: the note on its left, the three answers on its right */}
                    <SurfaceFoot shadow={bodyScrolls} className={styles.footer}>
                      <FootStart><span className={styles.note}>Notes, tasks and activity from both leads are kept. Merge can be undone for 30 days.</span></FootStart>
                      <Button variant="secondary" appearance="outlined" className={styles.toneRed} isDisabled={busy} onPress={() => { void run(() => onReject([selected.row.id])) }}>Discard new</Button>
                      <Button variant="secondary" appearance="outlined" isDisabled={busy} onPress={() => { void run(() => onApprove([selected.row.id])) }}>Keep both</Button>
                      <Button isDisabled={busy}
                              onPress={() => {
                                const p: Record<string, Pick> = {}
                                for (const f of FIELDS) if (f.radio) p[f.label] = newValue(selected, f) ? pickOf(f.label) : 'existing'
                                void run(() => onMerge(selected.row.id, p))
                              }}>Merge</Button>
                    </SurfaceFoot>
                  </>
                ) : selected.row.status === 'duplicate' && selected.twin ? (
                  <>
                    {/* In-file duplicate (user 2026-08-29: the match was never shown): the row it collided with, side by side. */}
                    <div ref={scrollRef} className={styles.detailBody}>
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
                    <SurfaceFoot shadow={bodyScrolls} className={styles.footer}>
                      <Button variant="secondary" appearance="outlined" className={styles.toneRed} isDisabled={busy} onPress={() => { void run(() => onReject([selected.row.id])) }}>Reject</Button>
                      <Button isDisabled={busy} onPress={() => { void run(() => onApprove([selected.row.id])) }}>Keep both</Button>
                    </SurfaceFoot>
                  </>
                ) : (
                  <>
                    <div ref={scrollRef} className={styles.detailBody}>
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
                    <SurfaceFoot shadow={bodyScrolls} className={styles.footer}>
                      <Button variant="secondary" appearance="outlined" className={styles.toneRed} isDisabled={busy} onPress={() => { void run(() => onReject([selected.row.id])) }}>Reject</Button>
                      <Button isDisabled={busy} onPress={() => { void run(() => onApprove([selected.row.id])) }}>Approve</Button>   {/* (2-16) the house primary, not green */}
                    </SurfaceFoot>
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
