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
import { DateField } from '@/components/om/date-field'
import { Tooltip } from '@/components/om/tooltip'
import { decimalTyped, inputDate, parseInputDate } from '@/lib/format'
import { MSG } from '@/lib/forms'
import { useSnackbar } from '@/components/om/snackbar'
import { MOBILE, TABLET_DOWN, useMediaQuery } from '@/lib/breakpoint'
import { DropdownDivider, DropdownItem, DropdownLabel, MENU_WIDTH } from '@/components/leads/dropdown'
import { couldnt, useRun } from '@/components/leads/tasks/use-run'
import { Chips } from '@/components/om/chips'   // (parity map, MI-021) the first payment's % · S$ switch
import type { QuotePayment } from '@/lib/db/schema'
import { money2 } from '@/lib/quotes/math'
import { FEE_FIRST_ALONE, FEE_FIRST_STAYS, asFixedFirst, asSharesFirst, blankRow, dueLabel, findSplit, fixedFeeOf, isFixedRow, paymentAmounts, presetLabel, presetOf, presetRows, scheduleBalance, splitWord, toRows, type PaymentRow, type PaymentSplit, type ScheduleAnchors } from '@/lib/quotes/payments'
import { usePathname, useRouter } from 'next/navigation'
import { withFrom } from '@/lib/nav'
import { Dialog, FootStart } from '@/components/om/dialog'
import { TextField } from '@/components/om/text-field'
import { saveQuoteScheduleAsTemplate } from '@/app/company/payment-templates-actions'
import { createQuotePayment, deleteQuotePayment, readPaymentFeeFirst, reorderQuotePayments, replaceQuotePayments, updateQuotePayment, type PaymentPatch } from '@/app/quotes/payments-actions'
import { orThrow } from '@/lib/company/template-rules'   // (S44Z) an action's refusal into run()'s own failure line
import { SectionCard } from '../section-card'
import { useLevelFocus } from '../items/table-menus'
import styles from './payments-section.module.css'
import { MetaChip } from '@/components/om/meta-chip'
import { placeOf, type FolderNode } from '@/lib/folders'

export type PaymentsSeed = {
  quoteId: string
  rows: QuotePayment[]
  /** Where the estimates hang from (lib/quotes/payments.ts `scheduleAnchors`), as plain numbers for the client. */
  anchors: { start: number; weeks: number }
  /** (REG-538) The presets ▾: the studio's payment templates (Company › Templates › Payments), the four presets first. */
  splits: PaymentSplit[]
  /** (REG-664) Payments' folders — the presets ▾ lists each folder's splits under its name. */
  folders?: FolderNode[]
}

type Field = 'name' | 'description' | 'pct' | 'amount' | 'word'   // (S44T — row 310) `word`: a fixed fee's own word in the % cell
type Edit = { id: string; field: Field; draft: string }

/** The table's key in the user's stored column widths (REG-427) and its mocked tracks (payments-section.module.css). */
const PAY_TABLE = 'quote-payments'
const PAY_TRACKS = [{ key: 'sel', track: '40px' }, { key: 'name', track: '319px' }, { key: 'desc', track: 'minmax(120px, 1fr)' }, { key: 'pct', track: '140px' }, { key: 'amount', track: '140px' }, { key: 'due', track: '188px' }]
const PAY_HEADS: { key: string; label: string }[] = [{ key: 'name', label: 'Payment' }, { key: 'desc', label: 'When' }, { key: 'pct', label: 'Share' }, { key: 'amount', label: 'Amount' }, { key: 'due', label: 'Due' }]   // (the calm UI build 2026-10-27, W-307) shorter heads; the cells keep their full names for a screen reader
const fmtPct = (p: number) => `${Number.isInteger(p) ? p : Number(p.toFixed(2))}%`
/** Whole dollars ("S$10,000") — the over-balance message's figures (1271:38240). */
const money0 = (minor: number) => money2(Math.round(minor / 100) * 100).replace(/\.00$/, '')
/** Dollars as a money box types them ("4983.81"). */
const dollars = (minor: number) => (minor / 100).toFixed(2)

/**
 * Payment Schedule (1238:29290 · base 1271:37370 · edit 1271:37609 · over-balance 1271:38240 · hover 1271:38624 · banner
 * 1271:39003 / 39197; spec 06, REG-418 — "Add Payments with AI" and its schedule left on the owner's word, REG-436). The section's own card: the preset select in the section-top, the table (handle ·
 * name · description / trigger · % · amount · due), the over-balance error, "Add a Payment". Amounts are the quote's live
 * total × each row's share (REG-403); every edit writes at once and stamps the quote's "Saved …". Presets and a removed row
 * can be undone.
 * (quotes on the move 2026-10-22, B-01 · B-11 · B-22 · P-08) ≤1024 every row is a CARD — name over description, the amount over "10% ·
 * On Approval" — and the whole card opens the payment's own sheet (name · description · share and amount side by side · due · Remove ·
 * Done); the handle keeps the drag. The desktop's cells and inline boxes are untouched above 1024.
 */
export function PaymentsCard({ seed, open, onToggle, onHandlePointerDown, totalMinor, today, onSaved, onRows, locked = false }: {
  seed: PaymentsSeed
  open: boolean
  onToggle: () => void
  onHandlePointerDown: (e: PointerEvent<HTMLButtonElement>) => void
  totalMinor: number
  today: Date
  onSaved: (updatedAt: number) => void
  /** The schedule as shown — Write with AI (REG-420) reads it. */
  onRows?: (rows: QuotePayment[]) => void
  /** (REG-589) The studio keeps the schedule to Owners and Admins: this member reads it, nothing edits. */
  locked?: boolean
}) {
  const snackbar = useSnackbar()
  const { run } = useRun()
  const { quoteId } = seed
  const router = useRouter(); const pathname = usePathname()
  const [splits, setSplits] = useState<PaymentSplit[]>(seed.splits)   // (REG-538) grows when this quote's split is saved as a template
  const [saveSplit, setSaveSplit] = useState<string | null>(null)   // the Save-as dialog's name (null = closed)
  const anchors: ScheduleAnchors = { start: new Date(seed.anchors.start), weeks: seed.anchors.weeks }
  const phone = useMediaQuery(MOBILE)
  const compact = useMediaQuery(TABLET_DOWN)   // (quotes on the move, B-11) ≤1024 the rows are cards that open the payment's sheet
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
  /* (B-11) the card's sheet: the row it opened on is kept for the sheet's exit, open and closed apart */
  const [sheetRow, setSheetRow] = useState<QuotePayment | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  /* (parity map, MI-021 — 1.0's fee first, behind the studio's switch) Settings › Finance › Invoices › *May open with a fixed fee*: read once, so the
     first payment's `% · S$` switch shows only when the studio allows it (or the row already is a fee — it can always go back to a share) */
  const [feeFirst, setFeeFirst] = useState(false)
  useEffect(() => { if (locked) return; let alive = true; void readPaymentFeeFirst().then((r) => { if (alive) setFeeFirst(r.feeFirst) }, () => {}); return () => { alive = false } }, [locked])

  /* ── the schedule as the table shows it: a % / amount being typed previews at once (the Total row and the error follow) ── */
  /* (MI-021) a fixed fee first: it bills its own amount, and an amount typed on any other row is a share of what it leaves */
  const fee = fixedFeeOf(rows)
  const shareBase = Math.max(0, totalMinor - fee)
  const isFee = (r: QuotePayment, i: number) => i === 0 && fee > 0 && r.fixedMinor != null
  const live = rows.map((r, i) => {
    if (!edit || edit.id !== r.id) return r
    if (edit.field === 'pct') { const n = Number(edit.draft); return Number.isFinite(n) && n >= 0 ? { ...r, pct: n } : r }
    if (edit.field === 'amount' && isFee(r, i)) { const n = Math.round(Number(edit.draft.replace(/[^0-9.]/g, '')) * 100); return Number.isFinite(n) && n > 0 ? { ...r, fixedMinor: n } : r }
    if (edit.field === 'amount' && shareBase > 0) { const n = Math.round(Number(edit.draft.replace(/[^0-9.]/g, '')) * 100); return Number.isFinite(n) && n >= 0 ? { ...r, pct: (n / shareBase) * 100 } : r }
    return r
  })
  const amounts = paymentAmounts(live, totalMinor)
  const balance = scheduleBalance(live, totalMinor)
  const preset = presetOf(rows, splits)
  const custom = !findSplit(preset, splits)

  /* ── writes ── */
  const replace = async (next: PaymentRow[]) => {
    const r = await replaceQuotePayments(quoteId, next)
    if ('error' in r) return r   // (parity map, MI-021) a refusal reads its rule in the snackbar (run says it)
    setRows(r.rows); onSaved(r.updatedAt)
    return r
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
      id = await orThrow(saveQuoteScheduleAsTemplate(quoteId, name))
      setSplits((s) => [...s, { id, name, rows: rowsRef.current.filter((r, i) => !isFixedRow(r, i)).map((r) => ({ name: r.name, description: r.description, pct: r.pct })), isPreset: false }])   // (S44O — row 297) the shares, as the server keeps them
    }, { message: fixedFeeOf(rowsRef.current) ? `${name} saved as a payment template — the shares after the fixed fee` : `${name} saved as a payment template`, actionLabel: 'Open', onAction: () => router.push(withFrom(`/templates/payments/${id}`, pathname)) })   // (S44O, invented copy)
  }
  /* (sweep S1 #10) Every optimistic write puts the row back when the server refuses — the failure snackbar never sits beside a value that was not kept. */
  const patchRow = (id: string, patch: PaymentPatch) => {
    const before = rowsRef.current.find((r) => r.id === id)
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch, dueAt: patch.dueAt !== undefined ? (patch.dueAt ? new Date(patch.dueAt) : null) : r.dueAt } as QuotePayment : r)))
    void run('save the payment', async () => { const r = await updateQuotePayment(id, patch); if ('error' in r) return r; onSaved(r.updatedAt); return r })
      .then((ok) => { if (!ok && before) setRows((rs) => rs.map((r) => (r.id === id ? before : r))) })
  }
  /* (parity map, MI-021) The first payment's `% · S$` switch: a fee of what it bills now (the others' shares made 100% of what it leaves), or a
     share again (its fee's share of the total) — nothing moves on the page; one sentence and Undo, as a preset is. */
  const setFirstFee = (on: boolean) => {
    const cur = rowsRef.current
    const first = cur[0]
    if (!first || on === (first.fixedMinor != null)) return
    if (totalMinor <= 0) { snackbar({ message: 'Amounts follow the quote total — add items first' }); return }
    if (on && cur.length < 2) { snackbar({ message: couldnt('make it a fixed fee', FEE_FIRST_ALONE) }); return }
    previous.current = toRows(cur)
    const next = on ? asFixedFirst(toRows(cur), totalMinor) : asSharesFirst(toRows(cur), totalMinor)
    const head = next[0]!
    void run(on ? 'make it a fixed fee' : 'make it a share', () => replace(next), {
      message: on ? `${first.name} is a fixed fee of ${money2(head.fixedMinor ?? 0)} — the other payments share what it leaves` : `${first.name} is a share again — ${fmtPct(head.pct)} of the quote`,   // (invented copy)
      actionLabel: 'Undo', onAction: () => restore('undo it'),
    })
  }
  const addRow = () => {
    void run('add the payment', async () => {
      const r = await orThrow(createQuotePayment(quoteId, blankRow(anchors)))
      setRows((rs) => [...rs, r.row]); onSaved(r.updatedAt)
      if (compact) { setSheetRow(r.row); setSheetOpen(true) }   // (B-11) a new payment opens its sheet, as the desktop opens its name box
      else setEdit({ id: r.row.id, field: 'name', draft: r.row.name })
    })
  }
  const removeRow = (row: QuotePayment) => {
    previous.current = toRows(rowsRef.current)
    const at = rowsRef.current.findIndex((r) => r.id === row.id)
    setRows((rs) => rs.filter((r) => r.id !== row.id))
    void run('remove the payment', async () => { const r = await orThrow(deleteQuotePayment(row.id)); onSaved(r.updatedAt) }, { message: `${row.name} removed`, actionLabel: 'Undo', onAction: () => restore('restore the payment') })
      .then((ok) => { if (!ok) { previous.current = null; setRows((rs) => (rs.some((r) => r.id === row.id) ? rs : [...rs.slice(0, at), row, ...rs.slice(at)])) } })
  }
  const reorder = (ids: string[]) => setRows((rs) => ids.map((id) => rs.find((r) => r.id === id)!).filter(Boolean))
  const orderBefore = useRef<string[] | null>(null)   // the order a drag started from — put back if the drop is not kept
  const persistOrder = () => {
    const before = orderBefore.current
    orderBefore.current = null
    /* (parity map, MI-021) the fixed fee is the first payment — a drop that moves it is put back, its rule said */
    const fixedId = before ? rowsRef.current.find((x) => x.fixedMinor != null)?.id : null
    if (before && fixedId && rowsRef.current[0]?.id !== fixedId) { reorder(before); snackbar({ message: couldnt('reorder the payments', FEE_FIRST_STAYS) }); return }
    void run('reorder the payments', async () => { const r = await reorderQuotePayments(quoteId, rowsRef.current.map((x) => x.id)); if ('error' in r) return r; onSaved(r.updatedAt); return r })
      .then((ok) => { if (!ok && before) reorder(before) })
  }

  /* ── inline edit (1271:37609): the cell becomes the 2px primary box with ✕ / ✓ under it; Enter and ✓ commit, Esc and ✕ discard ── */
  const startEdit = (row: QuotePayment, field: Field, i: number) => {
    if (locked) return   /* (REG-589) */
    if (field === 'amount' && totalMinor <= 0) { snackbar({ message: 'Amounts follow the quote total — add items first' }); return }
    if (field === 'pct' && isFee(row, i)) return   // (MI-021) a fixed fee has no share — its amount is the cell to change
    // The amount opens as the figure the cell showed ("S$10,000.00", 1271:37797); what is typed is read as a number.
    const draft = field === 'name' ? row.name : field === 'description' ? (row.description ?? '') : field === 'word' ? (row.fixedLabel ?? 'Fixed fee') : field === 'pct' ? String(Number(row.pct.toFixed(2))) : money2(amounts[i] ?? 0)
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
    else if (e.field === 'word') { const v = e.draft.replace(/\s+/g, ' ').trim().slice(0, 30); const next = v && v.toLowerCase() !== 'fixed fee' ? v : null; if (next !== (row.fixedLabel ?? null)) patch = { fixedLabel: next } }   // (S44T — row 310) empty = "Fixed fee"
    else if (e.field === 'pct') { const n = Number(e.draft); if (Number.isFinite(n) && n >= 0 && Math.abs(n - row.pct) > 0.004) patch = { pct: Number(n.toFixed(2)) } }
    else if (e.field === 'amount' && isFee(row, rowsRef.current.indexOf(row))) { const n = Math.round(Number(e.draft.replace(/[^0-9.]/g, '')) * 100); if (Number.isFinite(n) && n > 0 && n !== row.fixedMinor) patch = { fixedMinor: n } }   // (MI-021) the fee itself
    else if (e.field === 'amount' && shareBase > 0) { const n = Math.round(Number(e.draft.replace(/[^0-9.]/g, '')) * 100); if (Number.isFinite(n) && n >= 0) { const pct = Number(((n / shareBase) * 100).toFixed(2)); if (Math.abs(pct - row.pct) > 0.004) patch = { pct } } }   // (MI-021) a share of what the fee leaves
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
               aria-label={`${field === 'pct' ? 'Percentage' : field === 'amount' ? 'Amount' : field === 'name' ? 'Payment name' : field === 'word' ? 'The word printed for the fixed fee' : 'Description'} of ${row.name}`} maxLength={field === 'word' ? 30 : undefined}
               onChange={(e) => setEdit((cur) => (cur ? { ...cur, draft: numeric ? (field === 'pct' ? decimalTyped(e.target.value, 2) : e.target.value.replace(/[^0-9.,S$]/g, '')) : e.target.value } : cur))}   /* (sweep S1) a percentage takes digits and one point — never "S", "$" or "," */
               onKeyDown={onEditKey} onBlur={onEditBlur} />
        {/* (REG-729) The ✕ / ✓ pair as the house icon buttons (24; ✓ the filled one), raised over the next row. */}
        <span className={styles.confirm}>
          <Tooltip label="Discard"><IconButton icon="close" label="Discard" size={24} className={styles.cancelBtn} onMouseDown={(e) => e.preventDefault()} onClick={() => { cancelled.current = false; setEdit(null) }} /></Tooltip>
          <Tooltip label="Save"><IconButton icon="done" label="Save" size={24} variant="filled" className={styles.okBtn} onMouseDown={(e) => e.preventDefault()} onClick={commitEdit} /></Tooltip>
        </span>
        <span className={styles.editGhost} aria-hidden>{field === 'amount' ? money2(amounts[i] ?? 0) : field === 'pct' ? fmtPct(row.pct) : field === 'name' ? row.name : field === 'word' ? (row.fixedLabel ?? 'Fixed fee') : row.description}</span>
      </>
    )
  }

  /* ── the payment's sheet (≤1024, B-11): one press on the card; Done writes the fields that changed as one patch; Remove with its Undo ── */
  const openSheet = (row: QuotePayment) => { if (locked) return; setSheetRow(row); setSheetOpen(true) }
  const saveSheet = (patch: PaymentPatch) => { if (sheetRow && Object.keys(patch).length) patchRow(sheetRow.id, patch); setSheetOpen(false) }
  const removeFromSheet = () => { if (sheetRow) removeRow(sheetRow); setSheetOpen(false) }

  /* ── toolbar (1271:37377) ── */
  /* (REG-664) The splits as Templates › Payments files them: the ones at the top first, then each folder's under its name. */
  const splitFolders = seed.folders ?? []
  const folderOfSplit = (p: PaymentSplit) => (p.folderId && splitFolders.some((f) => f.id === p.folderId) ? p.folderId : null)
  /* (REG-728) "current" is the row's meta — the status list's mark — so the row takes no Selected fill. */
  const splitRow = (p: PaymentSplit) => (
    <DropdownItem key={p.id} role="menuitemradio" checked={p.id === preset} selected={false} onSelect={() => applyPreset(p.id)} meta={p.id === preset ? 'current' : undefined}>
      {p.name}
    </DropdownItem>
  )
  const splitGroups = splitFolders.map((f) => ({ f, list: splits.filter((p) => folderOfSplit(p) === f.id) })).filter((g) => g.list.length)
  const presetRowsUi = (
    <>
      {splits.filter((p) => !folderOfSplit(p)).map(splitRow)}
      {/* (REG-728) Each folder under the house group title (the group names itself; the title is read once). */}
      {splitGroups.map(({ f, list }) => (
        <div key={f.id} role="group" aria-label={placeOf(splitFolders, f.id)} data-testid="split-group">
          <div aria-hidden><DropdownLabel><Icon name="folder" size={16} weight={300} />{placeOf(splitFolders, f.id)}</DropdownLabel></div>
          {list.map(splitRow)}
        </div>
      ))}
      {custom ? (
        <DropdownItem role="menuitemradio" checked selected={false} onSelect={() => { setMenu(null); setMoreSub(null) }} meta="current">
          {`Custom · ${splitWord(live)}`}
        </DropdownItem>
      ) : null}
      <DropdownDivider />
      {/* (REG-538) The library behind the menu: save what this quote settled on, or manage the templates. */}
      {custom ? <DropdownItem disabled={fee > 0} help={fee > 0 ? 'A template holds shares only — the fixed fee stays on this quote' : undefined} onSelect={() => { setMenu(null); setMoreSub(null); setSaveSplit('') }}><span className={styles.menuIcon}><Icon name="library_add" size={20} /></span>Save this split as a template</DropdownItem> : null}
      <DropdownItem onSelect={() => { setMenu(null); setMoreSub(null); router.push(withFrom('/company/templates/payments', pathname)) }}><span className={styles.menuIcon}><Icon name="style" size={20} /></span>Manage payment schedules</DropdownItem>
    </>
  )
  const toolbar = locked ? (
    /* (REG-589) Locked: the split's name as a chip, no menu — the owner set it. */
    <div className={styles.tools}><MetaChip>Set by the studio · {presetLabel(preset, splits).replace('Default: ', '')}</MetaChip></div>
  ) : phone ? (
    <div className={styles.tools}>
      <span ref={moreRef} className={styles.anchor}>
        <Tooltip label="More options" disabled={menu === 'more'}>
          <IconButton icon="more_vert" label="More options for Payment Schedule" aria-haspopup="menu" aria-expanded={menu === 'more'} onClick={() => { setMoreSub(null); setMenu((m) => (m === 'more' ? null : 'more')) }} />
        </Tooltip>
        <PortalMenu open={menu === 'more'} anchor={moreRef} onClose={() => { setMenu(null); setMoreSub(null) }} role="menu" width={MENU_WIDTH.wide} align="right" sheetTitle="Payment Schedule">
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
                <DropdownItem onSelect={() => { setMenu(null); addRow() }}><span className={styles.menuIcon}><Icon name="add" size={20} /></span>Add a payment</DropdownItem>
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
        {/* (REG-728) a list with a current mark: 240, as the kebab's level that shows the same rows */}
        <PortalMenu open={menu === 'preset'} anchor={presetRef} onClose={() => setMenu(null)} role="menu" width={MENU_WIDTH.wide} align="right">
          {presetRowsUi}
        </PortalMenu>
      </span>
    </div>
  )

  /* (parity map, MI-021) the first payment: a share of the quote, or a fixed fee — the house Chips */
  const feeSwitch = (row: QuotePayment, i: number) => (
    <Chips className={styles.feeSwitch} label={`Bill ${row.name} as`} testId="payment-fee-switch" value={isFee(row, i) ? 'fixed' : 'pct'} onChange={(v) => setFirstFee(v === 'fixed')}
           options={[{ value: 'pct', label: '%' }, { value: 'fixed', label: 'S$', disabled: !feeFirst && !isFee(row, i) }]} />
  )
  const offersFee = (row: QuotePayment, i: number) => i === 0 && !locked && (feeFirst || isFee(row, i)) && rows.length > 1

  const dueRow = dueFor ? rows.find((r) => r.id === dueFor) ?? null : null
  return (
    <SectionCard id="section-payment" title="Payment schedule" open={open} onToggle={onToggle} actions={toolbar} onHandlePointerDown={onHandlePointerDown}>
      {/* (REG-538) Save this split as a template. */}
      <Dialog open={saveSplit !== null} onClose={() => setSaveSplit(null)} title="Save split as a template" size="form" width={400} portal
              footer={<><Button variant="secondary" appearance="outlined" onPress={() => setSaveSplit(null)}>Cancel</Button><Button onPress={doSaveSplit} isDisabled={!(saveSplit ?? '').trim()}>Save template</Button></>}>
        <TextField label="Template name" required value={saveSplit ?? ''} onChange={setSaveSplit} autoFocus helper={`${splitWord(live)} — saved under Company › Templates › Payment schedules and offered on every quote.`}
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
                <PaymentRowView key={row.id} row={row} amount={amounts[i] ?? 0} onDragStart={() => { orderBefore.current ??= rowsRef.current.map((x) => x.id) }} onDragEnd={persistOrder} locked={locked}>
                  {compact ? (
                    /* (quotes on the move, B-11 · P-08) the card: name 16 over the description 14; the amount 20 tabular over "10% · On Approval" 14 */
                    <div role="cell" className={styles.cardCell}>
                      {locked ? (
                        <div className={styles.cardBtn} data-locked="" data-testid="payment-card">
                          <span className={styles.cardName}>{row.name}</span>
                          <span className={styles.cardDesc}>{row.description ?? ''}</span>
                          <span className={styles.cardAmount}>{money2(amounts[i] ?? 0)}</span>
                          <span className={styles.cardShare}>{isFee(row, i) ? (row.fixedLabel ?? 'Fixed fee') : fmtPct(live[i]!.pct)} · {dueLabel(row)}</span>
                        </div>
                      ) : (
                        <button type="button" className={styles.cardBtn} data-testid="payment-card" aria-haspopup="dialog" aria-expanded={sheetOpen && sheetRow?.id === row.id} onClick={() => openSheet(row)}>
                          <span className={styles.cardName}>{row.name}</span>
                          <span className={styles.cardDesc} data-empty={row.description ? undefined : ''}>{row.description ?? 'Add a description'}</span>
                          <span className={styles.cardAmount}>{money2(amounts[i] ?? 0)}</span>
                          <span className={styles.cardShare}>{isFee(row, i) ? (row.fixedLabel ?? 'Fixed fee') : fmtPct(live[i]!.pct)} · {dueLabel(row)}</span>
                        </button>
                      )}
                      {offersFee(row, i) ? <span className={styles.cardFee}>Bill as{feeSwitch(row, i)}</span> : null}
                    </div>
                  ) : (
                  <>
                  <div role="cell" className={`${styles.cell} ${styles.cName}`} data-editing={editing(row.id, 'name') || undefined}>
                    {editing(row.id, 'name') ? editBox(row, 'name', i) : offersFee(row, i) ? (
                      /* (parity map, MI-021) the first payment: a share of the quote, or a fixed fee — the house Chips beside its name */
                      <span className={styles.nameRow}>
                        <button type="button" className={styles.cellBtn} onClick={() => startEdit(row, 'name', i)}>{row.name}</button>
                        {feeSwitch(row, i)}
                      </span>
                    ) : <button type="button" className={styles.cellBtn} disabled={locked} onClick={() => startEdit(row, 'name', i)}>{row.name}</button>}
                  </div>
                  <div role="cell" className={`${styles.cell} ${styles.cDesc}`} data-editing={editing(row.id, 'description') || undefined}>
                    {editing(row.id, 'description') ? editBox(row, 'description', i) : <button type="button" className={styles.cellBtn} data-empty={row.description ? undefined : ''} disabled={locked} onClick={() => startEdit(row, 'description', i)}>{row.description ?? (locked ? '' : 'Add a description')}</button>}
                  </div>
                  <div role="cell" className={`${styles.cell} ${styles.cPct}`} data-editing={editing(row.id, 'pct') || editing(row.id, 'word') || undefined}>
                    {editing(row.id, 'pct') ? editBox(row, 'pct', i, true) : editing(row.id, 'word') ? editBox(row, 'word', i)
                      /* (MI-021) a fixed fee has no share — (S44T, UAT row 310) its word stands there, the studio's own ("Design Fee"), printed where a share prints its % */
                      : isFee(row, i) ? <Tooltip label="The word printed in the % place — press to change it"><button type="button" className={`${styles.cellBtn} ${styles.feeWord}`} data-testid="payment-fixed-fee" disabled={locked} onClick={() => startEdit(row, 'word', i)}>{row.fixedLabel ?? 'Fixed fee'}</button></Tooltip>
                      : <button type="button" className={styles.cellBtn} disabled={locked} onClick={() => startEdit(row, 'pct', i)}>{fmtPct(live[i]!.pct)}</button>}
                  </div>
                  <div role="cell" className={`${styles.cell} ${styles.cAmount}`} data-editing={editing(row.id, 'amount') || undefined}>
                    {editing(row.id, 'amount') ? editBox(row, 'amount', i, true) : <button type="button" className={styles.cellBtn} disabled={locked} onClick={() => startEdit(row, 'amount', i)}>{money2(amounts[i] ?? 0)}</button>}
                  </div>
                  <div role="cell" className={`${styles.cell} ${styles.cDue}`}>
                    <button type="button" className={styles.cellBtn} aria-haspopup="dialog" aria-expanded={dueFor === row.id} disabled={locked}
                            onClick={(e) => { dueAnchor.current = e.currentTarget; setDueFor((d) => (d === row.id ? null : row.id)) }}>
                      {dueLabel(row)}
                    </button>
                  </div>
                  {locked ? null : (
                  <Tooltip label="Remove">
                    <IconButton icon="delete" label={`Remove ${row.name}`} iconSize={20} className={styles.del} onClick={() => removeRow(row)} />
                  </Tooltip>
                  )}
                  </>
                  )}
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
        {locked ? null : (
        <div className={styles.foot}>
          <Button variant="primary" appearance="outlined" onPress={addRow}>Add a payment</Button>
        </div>
        )}
      </div>
      <DatePicker open={!!dueRow} anchorRef={dueAnchor} anchorKey={dueFor ?? ''} value={dueRow?.dueAt ?? null} today={today} label="Due date"
                  onSelect={(d) => { if (dueFor) patchRow(dueFor, { dueKind: 'fixed', dueAt: d }); setDueFor(null) }} onClose={() => setDueFor(null)} />
      {compact ? (
        <PaymentSheet open={sheetOpen} row={sheetRow} fee={!!sheetRow && isFee(sheetRow, rows.indexOf(sheetRow))} amountMinor={sheetRow ? amounts[rows.indexOf(sheetRow)] ?? 0 : 0}
                      shareBase={shareBase} totalMinor={totalMinor} feeOnQuote={fee > 0} today={today} locked={locked} onClose={() => setSheetOpen(false)} onSave={saveSheet} onRemove={removeFromSheet} />
      ) : null}
    </SectionCard>
  )
}

/** One schedule row (44): the drag handle (pointer drag through motion, so a finger can reorder too), then the cells. */
function PaymentRowView({ row, amount, onDragStart, onDragEnd, locked, children }: { row: QuotePayment; amount: number; onDragStart: () => void; onDragEnd: () => void; locked?: boolean; children: React.ReactNode }) {
  const controls = useDragControls()
  const [dragging, setDragging] = useState(false)
  return (
    <Reorder.Item as="div" value={row.id} dragListener={false} dragControls={controls} className={styles.row} role="row" data-dragging={dragging || undefined}
                  data-amount={amount} onDragStart={() => { setDragging(true); onDragStart() }} onDragEnd={() => { setDragging(false); onDragEnd() }}>
      <div role="cell" className={`${styles.cell} ${styles.cSel}`}>
        {locked ? null : (   /* (REG-589) no handle while the studio keeps the schedule */
        <Tooltip label="Drag to reorder">
          <button type="button" className={styles.handle} aria-label={`Drag to reorder ${row.name}`} onPointerDown={(e) => controls.start(e)}>
            <Icon name="drag_indicator" size={24} weight={300} />
          </button>
        </Tooltip>
        )}
      </div>
      {children}
    </Reorder.Item>
  )
}

/** What the payment's sheet edits — the fields as typed; `dueTouched` says the day was picked here (an estimate left alone stays one). */
type SheetDraft = { name: string; description: string; pct: string; amount: string; word: string; due: 'approval' | 'date'; dueAt: string; dueTouched: boolean }
const draftOf = (r: QuotePayment, fee: boolean, amountMinor: number): SheetDraft => ({
  name: r.name, description: r.description ?? '', pct: String(Number(r.pct.toFixed(2))), amount: dollars(fee ? (r.fixedMinor ?? 0) : amountMinor), word: r.fixedLabel ?? '',
  due: r.dueKind === 'approval' ? 'approval' : 'date', dueAt: r.dueAt ? inputDate(new Date(r.dueAt)) : '', dueTouched: false,
})

/**
 * (quotes on the move 2026-10-22, B-11 · B-01) The payment's sheet — a bottom sheet on a phone, a 400 dialog on a tablet: the name, the
 * description, the share and the amount side by side (typing one gives the other, of what the quote — or what the fixed fee leaves —
 * is worth), the fee's own amount and printed word in their place, Due as "On approval · On a date" with the day, Remove at the foot's
 * start with the schedule's Undo, Done the one filled button. Nothing writes until Done; an estimate left alone stays an estimate.
 */
function PaymentSheet({ open, row, fee, amountMinor, shareBase, totalMinor, feeOnQuote, today, locked, onClose, onSave, onRemove }: {
  open: boolean; row: QuotePayment | null; fee: boolean; amountMinor: number; shareBase: number; totalMinor: number; feeOnQuote: boolean; today: Date; locked: boolean
  onClose: () => void; onSave: (patch: PaymentPatch) => void; onRemove: () => void
}) {
  const [draft, setDraft] = useState<SheetDraft>(() => (row ? draftOf(row, fee, amountMinor) : { name: '', description: '', pct: '', amount: '', word: '', due: 'approval', dueAt: '', dueTouched: false }))
  const [touched, setTouched] = useState(false)
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) { setWasOpen(open); if (open && row) { setDraft(draftOf(row, fee, amountMinor)); setTouched(false) } }   // every opening starts from the row as it stands (render-phase adjust)
  const set = (p: Partial<SheetDraft>) => setDraft((d) => ({ ...d, ...p }))
  /* the share and the amount are one number seen two ways: of what the quote (or what the fee leaves) is worth */
  const setPct = (v: string) => { const n = Number(v); setDraft((d) => ({ ...d, pct: v, amount: Number.isFinite(n) && shareBase > 0 ? dollars(Math.round((shareBase * n) / 100)) : d.amount })) }
  const setAmount = (v: string) => { const n = Number(v); setDraft((d) => ({ ...d, amount: v, pct: fee ? d.pct : Number.isFinite(n) && shareBase > 0 ? String(Number(((n * 100) / shareBase * 100).toFixed(2))) : d.pct })) }
  const nameOk = draft.name.trim().length > 0
  const feeOk = !fee || Number(draft.amount) > 0
  const dateOk = draft.due === 'approval' || !!parseInputDate(draft.dueAt)
  const done = () => {
    if (!row) return
    if (!nameOk || !feeOk || !dateOk) { setTouched(true); return }
    const patch: PaymentPatch = {}
    const name = draft.name.trim(); if (name !== row.name) patch.name = name
    const desc = draft.description.trim() || null; if (desc !== (row.description ?? null)) patch.description = desc
    if (fee) {
      const minor = Math.round(Number(draft.amount) * 100); if (Number.isFinite(minor) && minor > 0 && minor !== row.fixedMinor) patch.fixedMinor = minor
      const w = draft.word.replace(/\s+/g, ' ').trim().slice(0, 30); const next = w && w.toLowerCase() !== 'fixed fee' ? w : null; if (next !== (row.fixedLabel ?? null)) patch.fixedLabel = next   // (S44T — row 310) empty = "Fixed fee"
    } else {
      const n = Number(draft.pct); if (Number.isFinite(n) && n >= 0 && Math.abs(n - row.pct) > 0.004) patch.pct = Number(n.toFixed(2))
    }
    if (draft.due === 'approval') { if (row.dueKind !== 'approval') { patch.dueKind = 'approval'; patch.dueAt = null } }
    else if (draft.dueTouched || row.dueKind === 'approval') { const d = parseInputDate(draft.dueAt)!; if (row.dueKind !== 'fixed' || !row.dueAt || inputDate(new Date(row.dueAt)) !== inputDate(d)) { patch.dueKind = 'fixed'; patch.dueAt = d } }
    onSave(patch)
  }
  return (
    <Dialog open={open} onClose={onClose} title={row?.name || 'Payment'} size="form" width={400} portal closeOnScrim={false}
            footer={<>
              {locked ? null : <FootStart><Button variant="secondary" appearance="text" className={styles.removeBtn} onPress={onRemove} data-testid="payment-sheet-remove">Remove</Button></FootStart>}
              <Button onPress={done} data-testid="payment-sheet-done">Done</Button>
            </>}>
      <div className={styles.sheet} data-testid="payment-sheet">
        <TextField label="Payment name" required value={draft.name} onChange={(v) => set({ name: v })} error={touched && !nameOk ? MSG.required : undefined} />
        <TextField label="Description / trigger" value={draft.description} onChange={(v) => set({ description: v })} />
        {fee ? (
          <div className={styles.pair}>
            <TextField label="Amount (S$)" required numeric="money" value={draft.amount} onChange={setAmount} error={touched && !feeOk ? MSG.amount : undefined} />
            {/* (S44T — row 310) the word printed where a share prints its %, the studio's own — empty prints "Fixed fee" */}
            <TextField label="Printed as" value={draft.word} onChange={(v) => set({ word: v })} maxLength={30} placeholder="Fixed fee" />
          </div>
        ) : (
          <div className={styles.pair}>
            <TextField label="Share (%)" required numeric="decimal" value={draft.pct} onChange={setPct} />
            <TextField label="Amount (S$)" numeric="money" value={draft.amount} onChange={setAmount} disabled={shareBase <= 0} />
          </div>
        )}
        {fee ? null : <p className={styles.sheetHint}>{shareBase > 0 ? (feeOnQuote ? `Of ${money2(shareBase)} — what the fixed fee leaves` : `Of the quote total, ${money2(totalMinor)}`) : 'Amounts follow the quote total — add items first'}</p>}
        <Chips label="Due" testId="payment-due-chips" value={draft.due} onChange={(v) => set({ due: v === 'date' ? 'date' : 'approval' })} options={[{ value: 'approval', label: 'On signing' }, { value: 'date', label: 'On a date' }]} />
        {draft.due === 'date' ? (
          <DateField label="Due date" required value={draft.dueAt} onChange={(v) => set({ dueAt: v, dueTouched: true })} today={today} error={touched && !dateOk ? MSG.date : undefined}
                     helper={row?.dueKind === 'estimate' && !draft.dueTouched ? 'An estimate from the start date — pick a day to fix it' : undefined} />
        ) : null}
      </div>
    </Dialog>
  )
}
