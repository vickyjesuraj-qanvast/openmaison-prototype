'use client'

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
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
import type { QuotePayment } from '@/lib/db/schema'
import { money2 } from '@/lib/quotes/math'
import { blankRow, dueLabel, findSplit, paymentAmounts, presetLabel, presetOf, presetRows, scheduleBalance, splitWord, toRows, type PaymentRow, type PaymentSplit, type ScheduleAnchors } from '@/lib/quotes/payments'
import { usePathname, useRouter } from 'next/navigation'
import { withFrom } from '@/lib/nav'
import { Dialog } from '@/components/om/dialog'
import { TextField } from '@/components/om/text-field'
import { saveQuoteScheduleAsTemplate } from '@/app/company/payment-templates-actions'
import { createQuotePayment, deleteQuotePayment, reorderQuotePayments, replaceQuotePayments, updateQuotePayment, type PaymentPatch } from '@/app/quotes/payments-actions'
import { SectionCard } from '../section-card'
import { useLevelFocus } from '../items/table-menus'
import styles from './payments-section.module.css'

export type PaymentsSeed = {
  quoteId: string
  rows: QuotePayment[]
  /** Where the estimates hang from (lib/quotes/payments.ts `scheduleAnchors`), as plain numbers for the client. */
  anchors: { start: number; weeks: number }
  /** (REG-538) The presets ▾: the studio's payment templates (Company › Templates › Payments), the four presets first. */
  splits: PaymentSplit[]
}

type Field = 'name' | 'description' | 'pct' | 'amount'
type Edit = { id: string; field: Field; draft: string }

/** The table's key in the user's stored column widths (REG-427) and its mocked tracks (payments-section.module.css). */
const PAY_TABLE = 'quote-payments'
const PAY_TRACKS = [{ key: 'sel', track: '40px' }, { key: 'name', track: '319px' }, { key: 'desc', track: 'minmax(120px, 1fr)' }, { key: 'pct', track: '140px' }, { key: 'amount', track: '140px' }, { key: 'due', track: '188px' }]
const PAY_HEADS: { key: string; label: string }[] = [{ key: 'name', label: 'Payment name' }, { key: 'desc', label: 'Description / Trigger' }, { key: 'pct', label: 'Percentage (%)' }, { key: 'amount', label: 'Amount (S$)' }, { key: 'due', label: 'Due' }]
const fmtPct = (p: number) => `${Number.isInteger(p) ? p : Number(p.toFixed(2))}%`
/** Whole dollars ("S$10,000") — the over-balance message's figures (1271:38240). */
const money0 = (minor: number) => money2(Math.round(minor / 100) * 100).replace(/\.00$/, '')

/**
 * Payment Schedule (1238:29290 · base 1271:37370 · edit 1271:37609 · over-balance 1271:38240 · hover 1271:38624 · banner
 * 1271:39003 / 39197; spec 06, REG-418 — "Add Payments with AI" and its schedule left on the owner's word, REG-436). The section's own card: the preset select in the section-top, the table (handle ·
 * name · description / trigger · % · amount · due), the over-balance error, "Add a Payment". Amounts are the quote's live
 * total × each row's share (REG-403); every edit writes at once and stamps the quote's "Saved …". Presets and a removed row
 * can be undone.
 */
export function PaymentsCard({ seed, open, onToggle, onHandlePointerDown, totalMinor, today, onSaved, onRows }: {
  seed: PaymentsSeed
  open: boolean
  onToggle: () => void
  onHandlePointerDown: (e: PointerEvent<HTMLButtonElement>) => void
  totalMinor: number
  today: Date
  onSaved: (updatedAt: number) => void
  /** The schedule as shown — Write with AI (REG-420) reads it. */
  onRows?: (rows: QuotePayment[]) => void
}) {
  const snackbar = useSnackbar()
  const { run } = useRun()
  const { quoteId } = seed
  const router = useRouter(); const pathname = usePathname()
  const [splits, setSplits] = useState<PaymentSplit[]>(seed.splits)   // (REG-538) grows when this quote's split is saved as a template
  const [saveSplit, setSaveSplit] = useState<string | null>(null)   // the Save-as dialog's name (null = closed)
  const anchors: ScheduleAnchors = { start: new Date(seed.anchors.start), weeks: seed.anchors.weeks }
  const phone = useMediaQuery(MOBILE)
  const colWidths = useColumnWidths(PAY_TABLE)
  const tracks = gridTracks(PAY_TRACKS, colWidths)
  // The rows' floor (REG-430): the mock's 40 + 319 + 120 + 140 × 3, each column at its dragged width instead — the table scrolls sideways past it.
  const payFloor = 40 + (colWidths.name ?? 319) + (colWidths.desc ?? 120) + (colWidths.pct ?? 140) + (colWidths.amount ?? 140) + (colWidths.due ?? 188)
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
  const preset = presetOf(rows, splits)
  const custom = !findSplit(preset, splits)

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
    void run('apply the preset', () => replace(presetRows(key, anchors, splits)), { message: `Schedule set to ${presetLabel(key, splits).replace('Default: ', '')}`, actionLabel: 'Undo', onAction: () => restore('undo the preset') })
  }
  /* (REG-538) Save this split as a template: the rows as they stand, named, into the Payments library — and straight into this menu. */
  const doSaveSplit = () => {
    const name = (saveSplit ?? '').trim()
    setSaveSplit(null)
    if (!name) return
    let id = ''
    void run('save the template', async () => {
      id = await saveQuoteScheduleAsTemplate(quoteId, name)
      setSplits((s) => [...s, { id, name, rows: rowsRef.current.map((r) => ({ name: r.name, description: r.description, pct: r.pct })), isPreset: false }])
    }, { message: `${name} saved as a payment template`, actionLabel: 'Open', onAction: () => router.push(withFrom(`/templates/payments/${id}`, pathname)) })
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
  const presetRowsUi = (
    <>
      {splits.map((p) => (
        <DropdownItem key={p.id} role="menuitemradio" checked={p.id === preset} onSelect={() => applyPreset(p.id)}>
          <span className={styles.menuText}>{p.name}</span>{p.id === preset ? <span className={styles.menuCurrent}>current</span> : null}
        </DropdownItem>
      ))}
      {custom ? (
        <DropdownItem role="menuitemradio" checked onSelect={() => { setMenu(null); setMoreSub(null) }}>
          <span className={styles.menuText}>Custom · {splitWord(live)}</span><span className={styles.menuCurrent}>current</span>
        </DropdownItem>
      ) : null}
      <DropdownDivider />
      {/* (REG-538) The library behind the menu: save what this quote settled on, or manage the templates. */}
      {custom ? <DropdownItem onSelect={() => { setMenu(null); setMoreSub(null); setSaveSplit('') }}><span className={styles.menuIcon}><Icon name="library_add" size={20} /></span>Save this split as a template</DropdownItem> : null}
      <DropdownItem onSelect={() => { setMenu(null); setMoreSub(null); router.push(withFrom('/company/templates/payments', pathname)) }}><span className={styles.menuIcon}><Icon name="style" size={20} /></span>Manage payment templates</DropdownItem>
    </>
  )
  const toolbar = phone ? (
    <div className={styles.tools}>
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
                <DropdownItem submenu onSelect={() => setMoreSub('preset')}>Preset: {presetLabel(preset, splits).replace('Default: ', '')}<span className={styles.menuTrail}><Icon name="chevron_right" size={20} /></span></DropdownItem>
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
          {presetLabel(preset, splits)}
        </Button>
        <PortalMenu open={menu === 'preset'} anchor={presetRef} onClose={() => setMenu(null)} role="menu" width={220} align="right">
          {presetRowsUi}
        </PortalMenu>
      </span>
    </div>
  )

  const dueRow = dueFor ? rows.find((r) => r.id === dueFor) ?? null : null
  return (
    <SectionCard id="section-payment" title="Payment Schedule" open={open} onToggle={onToggle} actions={toolbar} onHandlePointerDown={onHandlePointerDown}>
      {/* (REG-538) Save this split as a template. */}
      <Dialog open={saveSplit !== null} onClose={() => setSaveSplit(null)} title="Save split as a template" size="form" width={400} portal
              footer={<><Button variant="secondary" appearance="outlined" onPress={() => setSaveSplit(null)}>Cancel</Button><Button onPress={doSaveSplit} isDisabled={!(saveSplit ?? '').trim()}>Save template</Button></>}>
        <TextField label="Template name" required value={saveSplit ?? ''} onChange={setSaveSplit} autoFocus helper={`${splitWord(live)} — saved under Company › Templates › Payments and offered on every quote.`}
                   onKeyDown={(e) => { if (e.key === 'Enter' && (saveSplit ?? '').trim()) { e.preventDefault(); doSaveSplit() } }} />
      </Dialog>
      <div className={styles.body}>
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
        {balance.over ? (
          <p className={styles.error} role="alert">Your upcoming scheduled payments are {money0(balance.overMinor)} above the proposal’s balance of {money0(totalMinor)}</p>
        ) : null}
        <div className={styles.foot}>
          <Button variant="primary" appearance="outlined" onPress={addRow}>Add a Payment</Button>
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
