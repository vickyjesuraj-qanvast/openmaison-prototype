'use client'

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type RefObject } from 'react'
import { Reorder, useDragControls } from 'motion/react'
import { Button } from '@/components/ds'
import { ColumnResizer, gridTracks, useColumnWidths } from '@/components/om/column-resize'
import { useOverflowX } from '@/components/om/use-overflow-x'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { PortalMenu } from '@/components/om/portal-menu'
import { DatePicker } from '@/components/om/date-picker'
import { Tooltip } from '@/components/om/tooltip'
import { useSnackbar } from '@/components/om/snackbar'
import { MOBILE, useMediaQuery } from '@/lib/breakpoint'
import { DropdownDivider, DropdownItem } from '@/components/leads/dropdown'
import { useRun } from '@/components/leads/tasks/use-run'
import type { QuoteItem, QuotePayment } from '@/lib/db/schema'
import { money2 } from '@/lib/quotes/math'
import { aiSchedule, blankRow, dueLabel, paymentAmounts, presetLabel, presetOf, presetRows, scheduleBalance, toRows, PRESETS, type PaymentRow, type ScheduleAnchors } from '@/lib/quotes/payments'
import { createQuotePayment, deleteQuotePayment, reorderQuotePayments, replaceQuotePayments, updateQuotePayment, type PaymentPatch } from '@/app/quotes/payments-actions'
import { SectionCard } from '../section-card'
import { useLevelFocus } from '../items/table-menus'
import styles from './payments-section.module.css'

export type PaymentsSeed = {
  quoteId: string
  rows: QuotePayment[]
  /** Where the estimates hang from (lib/quotes/payments.ts `scheduleAnchors`), as plain numbers for the client. */
  anchors: { start: number; weeks: number }
}

type Field = 'name' | 'description' | 'pct' | 'amount'
type Edit = { id: string; field: Field; draft: string }

const LOADING = ['Gathering information', 'Making some AI magic', 'Adding final touches']
/** The table's key in the user's stored column widths (REG-427) and its mocked tracks (payments-section.module.css). */
const PAY_TABLE = 'quote-payments'
const PAY_TRACKS = [{ key: 'sel', track: '40px' }, { key: 'name', track: '319px' }, { key: 'desc', track: 'minmax(120px, 1fr)' }, { key: 'pct', track: '140px' }, { key: 'amount', track: '140px' }, { key: 'due', track: '140px' }]
const PAY_HEADS: { key: string; label: string }[] = [{ key: 'name', label: 'Payment name' }, { key: 'desc', label: 'Description / Trigger' }, { key: 'pct', label: 'Percentage (%)' }, { key: 'amount', label: 'Amount (S$)' }, { key: 'due', label: 'Due' }]
const fmtPct = (p: number) => `${Number.isInteger(p) ? p : Number(p.toFixed(2))}%`
/** Whole dollars ("S$10,000") — the over-balance message's figures (1271:38240). */
const money0 = (minor: number) => money2(Math.round(minor / 100) * 100).replace(/\.00$/, '')

/** The Maison AI mark (1271:37381 / 1271:39197). */
function AiMark({ size = 17 }: { size?: number }) {
  return (
    <span className={styles.aiMark} style={{ width: size + 3, height: size + 3 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/figma-assets/maison-ai-mark.svg" alt="" style={{ width: size, height: size }} />
    </span>
  )
}

/**
 * Payment Schedule (1238:29290 · base 1271:37370 · edit 1271:37609 · over-balance 1271:38240 · hover 1271:38624 · banner
 * 1271:39003 / 39197 · loading 1238:29277…; spec 06, REG-418). The section's own card: the preset select and "Add Payments with AI" in the section-top, the table (handle ·
 * name · description / trigger · % · amount · due), the over-balance error, "Add a Payment". Amounts are the quote's live
 * total × each row's share (REG-403); every edit writes at once and stamps the quote's "Saved …". Presets, the AI schedule
 * and a removed row can be undone.
 */
export function PaymentsCard({ seed, open, onToggle, onHandlePointerDown, totalMinor, linesRef, today, onSaved, onRows }: {
  seed: PaymentsSeed
  open: boolean
  onToggle: () => void
  onHandlePointerDown: (e: PointerEvent<HTMLButtonElement>) => void
  totalMinor: number
  /** The Items section's current lines — what "Add Payments with AI" derives the schedule from. */
  linesRef: RefObject<QuoteItem[]>
  today: Date
  onSaved: (updatedAt: number) => void
  /** The schedule as shown — Write with AI (REG-420) reads it. */
  onRows?: (rows: QuotePayment[]) => void
}) {
  const snackbar = useSnackbar()
  const { run } = useRun()
  const { quoteId } = seed
  const anchors: ScheduleAnchors = { start: new Date(seed.anchors.start), weeks: seed.anchors.weeks }
  const phone = useMediaQuery(MOBILE)
  const colWidths = useColumnWidths(PAY_TABLE)
  const tracks = gridTracks(PAY_TRACKS, colWidths)
  // The rows' floor (REG-430): the mock's 40 + 319 + 120 + 140 × 3, each column at its dragged width instead — the table scrolls sideways past it.
  const payFloor = 40 + (colWidths.name ?? 319) + (colWidths.desc ?? 120) + (colWidths.pct ?? 140) + (colWidths.amount ?? 140) + (colWidths.due ?? 140)
  const [payFrame, payOverflowing] = useOverflowX()

  const [rows, setRows] = useState<QuotePayment[]>(seed.rows)
  const rowsRef = useRef(rows); useEffect(() => { rowsRef.current = rows })
  useEffect(() => { onRows?.(rows) }, [rows, onRows])
  const [edit, setEdit] = useState<Edit | null>(null)
  const cancelled = useRef(false)
  const [dueFor, setDueFor] = useState<string | null>(null)
  const dueAnchor = useRef<HTMLElement | null>(null)
  const [menu, setMenu] = useState<'preset' | 'more' | null>(null)
  const [moreSub, setMoreSub] = useState<'preset' | null>(null)
  const moreLevel = useLevelFocus(moreSub)
  const presetRef = useRef<HTMLSpanElement>(null)
  const moreRef = useRef<HTMLSpanElement>(null)
  const [generating, setGenerating] = useState(false)
  const [banner, setBanner] = useState(false)
  const previous = useRef<PaymentRow[] | null>(null)

  /* ── the schedule as the table shows it: a % / amount being typed previews at once (the Total row and the error follow) ── */
  const live = rows.map((r) => {
    if (!edit || edit.id !== r.id) return r
    if (edit.field === 'pct') { const n = Number(edit.draft); return Number.isFinite(n) && n >= 0 ? { ...r, pct: n } : r }
    if (edit.field === 'amount' && totalMinor > 0) { const n = Math.round(Number(edit.draft.replace(/[^0-9.]/g, '')) * 100); return Number.isFinite(n) && n >= 0 ? { ...r, pct: (n / totalMinor) * 100 } : r }
    return r
  })
  const amounts = paymentAmounts(live, totalMinor)
  const balance = scheduleBalance(live, totalMinor)
  const preset = presetOf(rows)

  /* ── writes ── */
  const replace = async (next: PaymentRow[]) => {
    const r = await replaceQuotePayments(quoteId, next)
    setRows(r.rows); onSaved(r.updatedAt)
  }
  const restore = (what: string) => {
    const prev = previous.current
    if (!prev) return
    previous.current = null
    void run(what, () => replace(prev))
  }
  const applyPreset = (key: string) => {
    setMenu(null); setMoreSub(null)
    if (key === preset) return
    previous.current = toRows(rowsRef.current)
    void run('apply the preset', () => replace(presetRows(key, anchors)), { message: `Schedule set to ${presetLabel(key).replace('Default: ', '')}`, actionLabel: 'Undo', onAction: () => restore('undo the preset') })
  }
  const patchRow = (id: string, patch: PaymentPatch) => {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch, dueAt: patch.dueAt !== undefined ? (patch.dueAt ? new Date(patch.dueAt) : null) : r.dueAt } as QuotePayment : r)))
    void run('save the payment', async () => { const r = await updateQuotePayment(id, patch); onSaved(r.updatedAt) })
  }
  const addRow = () => {
    void run('add the payment', async () => {
      const r = await createQuotePayment(quoteId, blankRow(anchors))
      setRows((rs) => [...rs, r.row]); onSaved(r.updatedAt)
      setEdit({ id: r.row.id, field: 'name', draft: r.row.name })
    })
  }
  const removeRow = (row: QuotePayment) => {
    previous.current = toRows(rowsRef.current)
    setRows((rs) => rs.filter((r) => r.id !== row.id))
    void run('remove the payment', async () => { const r = await deleteQuotePayment(row.id); onSaved(r.updatedAt) }, { message: `${row.name} removed`, actionLabel: 'Undo', onAction: () => restore('restore the payment') })
  }
  const reorder = (ids: string[]) => setRows((rs) => ids.map((id) => rs.find((r) => r.id === id)!).filter(Boolean))
  const persistOrder = () => { void run('reorder the payments', async () => { const r = await reorderQuotePayments(quoteId, rowsRef.current.map((x) => x.id)); onSaved(r.updatedAt) }) }

  /* ── Add Payments with AI: the three loading cards, then the schedule derived from the quote's lines, with Undo ── */
  const generate = () => {
    if (generating) return
    previous.current = toRows(rowsRef.current)
    setGenerating(true); setBanner(false)
    const schedule = aiSchedule(linesRef.current ?? [], anchors)
    void run('generate the schedule', async () => {
      await new Promise((res) => setTimeout(res, 2100))   // the three cards (1238:29277 / 29281 / 29285), 700 ms each — invented pacing
      await replace(schedule)
      setBanner(true)
    }).finally(() => setGenerating(false))
  }

  /* ── inline edit (1271:37609): the cell becomes the 2px primary box with ✕ / ✓ under it; Enter and ✓ commit, Esc and ✕ discard ── */
  const startEdit = (row: QuotePayment, field: Field, i: number) => {
    if (field === 'amount' && totalMinor <= 0) { snackbar({ message: 'Amounts follow the quote total — add items first' }); return }
    // The amount opens as the figure the cell showed ("S$10,000.00", 1271:37797); what is typed is read as a number.
    const draft = field === 'name' ? row.name : field === 'description' ? (row.description ?? '') : field === 'pct' ? String(Number(row.pct.toFixed(2))) : money2(amounts[i] ?? 0)
    setEdit({ id: row.id, field, draft })
  }
  const commitEdit = () => {
    const e = edit
    setEdit(null)
    if (!e) return
    const row = rowsRef.current.find((r) => r.id === e.id)
    if (!row) return
    let patch: PaymentPatch | null = null
    if (e.field === 'name') { const v = e.draft.trim(); if (v && v !== row.name) patch = { name: v } }
    else if (e.field === 'description') { const v = e.draft.trim() || null; if (v !== (row.description ?? null)) patch = { description: v } }
    else if (e.field === 'pct') { const n = Number(e.draft); if (Number.isFinite(n) && n >= 0 && Math.abs(n - row.pct) > 0.004) patch = { pct: Number(n.toFixed(2)) } }
    else if (e.field === 'amount' && totalMinor > 0) { const n = Math.round(Number(e.draft.replace(/[^0-9.]/g, '')) * 100); if (Number.isFinite(n) && n >= 0) { const pct = Number(((n / totalMinor) * 100).toFixed(2)); if (Math.abs(pct - row.pct) > 0.004) patch = { pct } } }
    if (patch) patchRow(row.id, patch)
  }
  const onEditBlur = () => { if (cancelled.current) { cancelled.current = false; setEdit(null); return } commitEdit() }
  const onEditKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur() }
    if (e.key === 'Escape') { e.preventDefault(); cancelled.current = true; e.currentTarget.blur() }
  }
  const editing = (id: string, field: Field) => edit?.id === id && edit.field === field
  const editBox = (row: QuotePayment, field: Field, i: number, numeric = false) => {
    const over = (field === 'pct' || field === 'amount') && balance.over
    return (
      <>
        <input className={styles.editInput} data-error={over || undefined} value={edit?.draft ?? ''} autoFocus inputMode={numeric ? 'decimal' : undefined}
               aria-label={`${field === 'pct' ? 'Percentage' : field === 'amount' ? 'Amount' : field === 'name' ? 'Payment name' : 'Description'} of ${row.name}`}
               onChange={(e) => setEdit((cur) => (cur ? { ...cur, draft: numeric ? e.target.value.replace(/[^0-9.,S$]/g, '') : e.target.value } : cur))}
               onKeyDown={onEditKey} onBlur={onEditBlur} />
        <span className={styles.confirm}>
          <button type="button" className={styles.cancelBtn} aria-label="Discard" onMouseDown={(e) => e.preventDefault()} onClick={() => { cancelled.current = false; setEdit(null) }}><Icon name="close" size={20} /></button>
          <button type="button" className={styles.okBtn} aria-label="Save" onMouseDown={(e) => e.preventDefault()} onClick={commitEdit}><Icon name="done" size={20} /></button>
        </span>
        <span className={styles.editGhost} aria-hidden>{field === 'amount' ? money2(amounts[i] ?? 0) : field === 'pct' ? fmtPct(row.pct) : field === 'name' ? row.name : row.description}</span>
      </>
    )
  }

  /* ── toolbar (1271:37377) ── */
  const presetRowsUi = PRESETS.map((p) => (
    <DropdownItem key={p.key} role="menuitemradio" checked={p.key === preset} onSelect={() => applyPreset(p.key)}>
      <span className={styles.menuText}>{p.label}</span>{p.key === preset ? <span className={styles.menuCurrent}>current</span> : null}
    </DropdownItem>
  ))
  const aiDisabled = generating || banner
  const toolbar = phone ? (
    <div className={styles.tools}>
      <Tooltip label="Add Payments with AI" disabled={aiDisabled}><IconButton icon="auto_awesome" glyph={<AiMark />} label="Add Payments with AI" variant="primary" disabled={aiDisabled} onClick={generate} /></Tooltip>
      <span ref={moreRef} className={styles.anchor}>
        <Tooltip label="More options" disabled={menu === 'more'}>
          <IconButton icon="more_vert" label="More options for Payment Schedule" aria-haspopup="menu" aria-expanded={menu === 'more'} onClick={() => { setMoreSub(null); setMenu((m) => (m === 'more' ? null : 'more')) }} />
        </Tooltip>
        <PortalMenu open={menu === 'more'} anchor={moreRef} onClose={() => { setMenu(null); setMoreSub(null) }} role="menu" width={240} align="right" sheetTitle="Payment Schedule">
          <div ref={moreLevel}>
            {moreSub === 'preset' ? (
              <>
                <DropdownItem onSelect={() => setMoreSub(null)}><span className={styles.menuIcon}><Icon name="chevron_left" size={20} /></span>Preset</DropdownItem>
                {presetRowsUi}
              </>
            ) : (
              <>
                <DropdownItem submenu onSelect={() => setMoreSub('preset')}>Preset: {presetLabel(preset).replace('Default: ', '')}<span className={styles.menuTrail}><Icon name="chevron_right" size={20} /></span></DropdownItem>
                <DropdownDivider />
                <DropdownItem onSelect={() => { setMenu(null); addRow() }}><span className={styles.menuIcon}><Icon name="add" size={20} /></span>Add a Payment</DropdownItem>
              </>
            )}
          </div>
        </PortalMenu>
      </span>
    </div>
  ) : (
    <div className={styles.tools}>
      <span ref={presetRef} className={styles.anchor}>
        <Button variant="secondary" appearance="outlined" aria-haspopup="menu" aria-expanded={menu === 'preset'}
                iconEnd={<span className={styles.chev} data-open={menu === 'preset' || undefined}><Icon name="keyboard_arrow_down" size={20} /></span>}
                onPress={() => setMenu((m) => (m === 'preset' ? null : 'preset'))}>
          {presetLabel(preset)}
        </Button>
        <PortalMenu open={menu === 'preset'} anchor={presetRef} onClose={() => setMenu(null)} role="menu" width={220} align="right">
          {presetRowsUi}
        </PortalMenu>
      </span>
      <Button variant="primary" appearance="outlined" iconStart={<AiMark />} isDisabled={aiDisabled} onPress={generate}>Add Payments with AI</Button>
    </div>
  )

  const dueRow = dueFor ? rows.find((r) => r.id === dueFor) ?? null : null
  return (
    <SectionCard id="section-payment" title="Payment Schedule" open={open} onToggle={onToggle} actions={toolbar} onHandlePointerDown={onHandlePointerDown}>
      <div className={styles.body}>
        {banner ? (
          <div className={styles.banner} role="status">
            <AiMark size={17} />
            <span className={styles.bannerText}>Here’s a Maison AI generated payment schedule</span>
            <Button variant="primary" appearance="outlined" onPress={() => { setBanner(false); restore('undo the schedule') }}>Undo</Button>
            <Tooltip label="Dismiss">
              <button type="button" className={styles.bannerClose} aria-label="Dismiss" onClick={() => setBanner(false)}><Icon name="close" size={20} /></button>
            </Tooltip>
          </div>
        ) : null}
        {generating ? (
          <div className={styles.loading} role="status" aria-label="Generating the payment schedule">
            {LOADING.map((label) => (
              <div key={label} className={styles.card}>
                <AiMark size={24} />
                <span>{label}</span>
              </div>
            ))}
          </div>
        ) : (
          <div ref={payFrame} className={styles.table} role="table" aria-label="Payment schedule" data-cols={PAY_TABLE} data-overflow={payOverflowing || undefined}
               style={{ ...(tracks ? { '--pay-tracks': tracks } : {}), '--pay-min': `${payFloor}px` } as React.CSSProperties}
               onScroll={(e) => e.currentTarget.toggleAttribute('data-scrolled', e.currentTarget.scrollLeft > 0)}>
            <div className={styles.head} role="row">
              <div role="columnheader" className={`${styles.cell} ${styles.cSel}`} />
              {PAY_HEADS.map((h) => (
                <div key={h.key} role="columnheader" className={`${styles.cell} ${styles[`c${h.key[0]!.toUpperCase()}${h.key.slice(1)}`]}`}>
                  {h.label}<ColumnResizer table={PAY_TABLE} column={h.key} label={h.label} min={72} />
                </div>
              ))}
            </div>
            <Reorder.Group as="div" axis="y" values={rows.map((r) => r.id)} onReorder={reorder} className={styles.rows}>
              {rows.map((row, i) => (
                <PaymentRowView key={row.id} row={row} amount={amounts[i] ?? 0} onDragEnd={persistOrder}>
                  <div role="cell" className={`${styles.cell} ${styles.cName}`} data-editing={editing(row.id, 'name') || undefined}>
                    {editing(row.id, 'name') ? editBox(row, 'name', i) : <button type="button" className={styles.cellBtn} onClick={() => startEdit(row, 'name', i)}>{row.name}</button>}
                  </div>
                  <div role="cell" className={`${styles.cell} ${styles.cDesc}`} data-editing={editing(row.id, 'description') || undefined}>
                    {editing(row.id, 'description') ? editBox(row, 'description', i) : <button type="button" className={styles.cellBtn} data-empty={row.description ? undefined : ''} onClick={() => startEdit(row, 'description', i)}>{row.description ?? 'Add a description'}</button>}
                  </div>
                  <div role="cell" className={`${styles.cell} ${styles.cPct}`} data-editing={editing(row.id, 'pct') || undefined}>
                    {editing(row.id, 'pct') ? editBox(row, 'pct', i, true) : <button type="button" className={styles.cellBtn} onClick={() => startEdit(row, 'pct', i)}>{fmtPct(live[i]!.pct)}</button>}
                  </div>
                  <div role="cell" className={`${styles.cell} ${styles.cAmount}`} data-editing={editing(row.id, 'amount') || undefined}>
                    {editing(row.id, 'amount') ? editBox(row, 'amount', i, true) : <button type="button" className={styles.cellBtn} onClick={() => startEdit(row, 'amount', i)}>{money2(amounts[i] ?? 0)}</button>}
                  </div>
                  <div role="cell" className={`${styles.cell} ${styles.cDue}`}>
                    <button type="button" className={styles.cellBtn} aria-haspopup="dialog" aria-expanded={dueFor === row.id}
                            onClick={(e) => { dueAnchor.current = e.currentTarget; setDueFor((d) => (d === row.id ? null : row.id)) }}>
                      {dueLabel(row)}
                    </button>
                  </div>
                  <Tooltip label="Remove">
                    <IconButton icon="delete" label={`Remove ${row.name}`} iconSize={20} className={styles.del} onClick={() => removeRow(row)} />
                  </Tooltip>
                </PaymentRowView>
              ))}
            </Reorder.Group>
            <div className={styles.totalRow} role="row" data-error={balance.over || undefined}>
              <div role="cell" className={`${styles.cell} ${styles.cSel}`} />
              <div role="cell" className={`${styles.cell} ${styles.cName}`}>Total</div>
              <div role="cell" className={`${styles.cell} ${styles.cDesc}`} />
              <div role="cell" className={`${styles.cell} ${styles.cPct}`}>{fmtPct(balance.pctTotal)}</div>
              <div role="cell" className={`${styles.cell} ${styles.cAmount}`}>{money2(balance.amountTotal)}</div>
              <div role="cell" className={`${styles.cell} ${styles.cDue}`} />
            </div>
          </div>
        )}
        {balance.over && !generating ? (
          <p className={styles.error} role="alert">Your upcoming scheduled payments are {money0(balance.overMinor)} above the proposal’s balance of {money0(totalMinor)}</p>
        ) : null}
        <div className={styles.foot}>
          <Button variant="primary" appearance="outlined" onPress={addRow} isDisabled={generating}>Add a Payment</Button>
        </div>
      </div>
      <DatePicker open={!!dueRow} anchorRef={dueAnchor} anchorKey={dueFor ?? ''} value={dueRow?.dueAt ?? null} today={today} label="Due date"
                  onSelect={(d) => { if (dueFor) patchRow(dueFor, { dueKind: 'fixed', dueAt: d }); setDueFor(null) }} onClose={() => setDueFor(null)} />
    </SectionCard>
  )
}

/** One schedule row (44): the drag handle (pointer drag through motion, so a finger can reorder too), then the cells. */
function PaymentRowView({ row, amount, onDragEnd, children }: { row: QuotePayment; amount: number; onDragEnd: () => void; children: React.ReactNode }) {
  const controls = useDragControls()
  const [dragging, setDragging] = useState(false)
  return (
    <Reorder.Item as="div" value={row.id} dragListener={false} dragControls={controls} className={styles.row} role="row" data-dragging={dragging || undefined}
                  data-amount={amount} onDragStart={() => setDragging(true)} onDragEnd={() => { setDragging(false); onDragEnd() }}>
      <div role="cell" className={`${styles.cell} ${styles.cSel}`}>
        <Tooltip label="Drag to reorder">
          <button type="button" className={styles.handle} aria-label={`Drag to reorder ${row.name}`} onPointerDown={(e) => controls.start(e)}>
            <Icon name="drag_indicator" size={24} weight={300} />
          </button>
        </Tooltip>
      </div>
      {children}
    </Reorder.Item>
  )
}
