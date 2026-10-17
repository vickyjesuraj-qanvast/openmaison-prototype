'use client'

import { useRef, useState, type ReactNode } from 'react'
import { Button, Switch } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { DateField } from '@/components/om/date-field'
import { TextField } from '@/components/om/text-field'
import { Chips } from '@/components/om/chips'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { displayDate, inputDate, parseInputDate } from '@/lib/format'
import { money2 } from '@/lib/quotes/math'
import { gstOf, type InvoiceLine, type InvoiceView } from '@/lib/projects/money'
import type { SplitEditor } from '@/lib/projects/money-queries'
import { DESCRIPTION_MAX, LINES_MAX, NOTE_MAX, ONE_OFF_REASONS, REF_MAX, TITLE_MAX, itemiseGap, itemiseWords, lineAmount, linesProblem, linesTotals, noteFromText, type DueMode } from '@/lib/projects/invoices-kinds'
import { ProofField, type PickedProof } from './payments-dialogs'
import styles from './money.module.css'
import own from './invoice-dialogs.module.css'
import textLink from '@/components/om/text-link.module.css'
import fin from '@/components/finance/finance.module.css'   // (parity map, MI-035) the bill dialog's read band, composed — the same look for the same job

/*
 * (gaps build B — M-04 and the report's 4-finance rows) Money in, complete: the dialogs of a one-off invoice, any Draft's own words and due
 * day, an invoice recorded from elsewhere and a project's own payment split — each on the house Dialog (form size, a bottom sheet on a phone),
 * its fields the house TextField / DateField / Chips, the money fields filtered as typed (REG-150), the errors after the first press (the
 * house rule). A dialog closes only once its save lands — the host closes it.
 */

const toMinor = (v: string) => Math.round(Number(v.replace(/,/g, '')) * 100)
const fromMinor = (m: number) => (m / 100).toFixed(2)
type DraftLine = { id: string; description: string; qty: string; unit: string }
let seq = 0
const blankLine = (): DraftLine => ({ id: `n${++seq}`, description: '', qty: '1', unit: '' })
const parsed = (l: DraftLine): InvoiceLine => ({ id: l.id, description: l.description.trim(), qty: Number(l.qty.replace(/,/g, '')) || 0, unitMinor: toMinor(l.unit || '0') || 0 })

/** (item 4) When the invoice falls due: the payment terms, a day picked, or the project's handover day — the Chips' radio group, the day under it. */
function DueField({ mode, date, onMode, onDate, termsDays, handoverDay, today, error, helper }: {
  mode: DueMode; date: string; onMode: (m: DueMode) => void; onDate: (d: string) => void; termsDays: number; handoverDay: number | null; today: Date; error?: string
  /** (parity map, MI-035) "Read from the file — check it" while the day is the PDF's */ helper?: string
}) {
  const options = [
    { value: 'terms', label: termsDays === 0 ? 'On receipt' : `${termsDays} day${termsDays === 1 ? '' : 's'} after it’s sent` },
    { value: 'date', label: 'On a day I pick' },
    ...(handoverDay ? [{ value: 'handover', label: `On handover day, ${displayDate(new Date(handoverDay))}` }] : []),
  ]
  return (
    <div>
      <span className={styles.fieldLabel}>When it’s due</span>
      <Chips label="When it’s due" options={options} value={mode} onChange={(v) => onMode(v as DueMode)} testId="invoice-due-mode" />
      {mode === 'date' ? <div className={own.under}><DateField label="Due on" value={date} onChange={onDate} today={today} min={today} required error={error} helper={helper} /></div> : null}
    </div>
  )
}
const dueOut = (mode: DueMode, date: string) => ({ dueMode: mode, dueOn: mode === 'date' ? parseInputDate(date)?.getTime() ?? null : null })

/* ── The line grid (gaps build B, items 2 · 3) — a one-off's lines and (parity map, MI-031) a stage invoice itemised share it ──────────── */

/** Description · Qty · Unit price · Amount · remove, one row per line; (parity map, MI-031 — 1.0's composer) Enter in the last row's price adds
    a row and puts the caret in it. `prefix` keeps each dialog's test ids (`oneoff-lines` · `itemise-lines`). */
function LinesGrid({ lines, onChange, prefix, onEdited, trail }: { lines: DraftLine[]; onChange: (next: DraftLine[]) => void; prefix: string; /** a line was typed in */ onEdited?: () => void
  /** what sits at the end of the grid's foot, beside Add a line (the one-off's GST switch, the itemise counter) */ trail?: ReactNode }) {
  const [focusId, setFocusId] = useState<string | null>(null)
  const setLine = (id: string, patch: Partial<DraftLine>) => { onEdited?.(); onChange(lines.map((l) => (l.id === id ? { ...l, ...patch } : l))) }
  const add = () => { if (lines.length >= LINES_MAX) return; const l = blankLine(); setFocusId(l.id); onChange([...lines, l]) }
  return (
    <>
      <div className={own.lines} role="list" aria-label="Lines" data-testid={`${prefix}-lines`}>
        {lines.map((l, i) => (
          <div key={l.id} className={own.line} role="listitem" data-testid={`${prefix}-line`}>
            <TextField className={own.lineDesc} label="Description" value={l.description} onChange={(v) => setLine(l.id, { description: v })} maxLength={DESCRIPTION_MAX} size="s" autoFocus={l.id === focusId} />
            <TextField className={own.lineQty} label="Qty" value={l.qty} numeric="decimal" onChange={(v) => setLine(l.id, { qty: v })} size="s" />
            <TextField className={own.lineUnit} label="Unit price (S$)" value={l.unit} numeric="money" onChange={(v) => setLine(l.id, { unit: v })} size="s"
                       onKeyDown={(e) => { if (e.key === 'Enter' && i === lines.length - 1 && !e.nativeEvent.isComposing) { e.preventDefault(); add() } }} />
            <span className={own.lineAmt} aria-label="Line amount">{money2(lineAmount(parsed(l)))}</span>
            <Tooltip label="Remove the line" disabled={lines.length === 1}>
              <IconButton icon="delete" label={`Remove line ${i + 1}`} disabled={lines.length === 1} onClick={() => { onEdited?.(); onChange(lines.filter((x) => x.id !== l.id)) }} />
            </Tooltip>
          </div>
        ))}
      </div>
      <div className={own.linesFoot}>
        <Button appearance="text" iconStart={<Icon name="add" size={20} />} onPress={add} isDisabled={lines.length >= LINES_MAX} data-testid={`${prefix}-add-line`}>Add a line</Button>
        {trail}
      </div>
    </>
  )
}

/* ── (parity map, MI-035) Fill from a PDF: the invoice's own text read in the browser (pdf.js), the bill reader's lines and due day, a note ─ */

type PdfRead = { file: string; lines: InvoiceLine[]; dueOn: number | null; note: string | null; gst: boolean } | { file: string; none: true }
async function readInvoicePdf(file: File): Promise<PdfRead> {
  if (file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) return { file: file.name, none: true }
  try {
    const [{ pdfLines }, { readBill }] = await Promise.all([import('@/lib/pdf-text'), import('@/lib/finance/bill-reader')])
    const text = await pdfLines(await file.arrayBuffer())
    if (!text.some((l) => l.trim())) return { file: file.name, none: true }
    const r = readBill(text, [])
    return { file: file.name, lines: r.lines.map((l, i) => ({ id: `p${i + 1}`, description: l.description, qty: l.qty, unitMinor: l.unitMinor })), dueOn: r.dueOn, note: noteFromText(text), gst: (r.gstMinor ?? 0) > 0 }
  } catch { return { file: file.name, none: true } }
}

/* ── Items 2 · 3 · 4 · A one-off invoice (M-04 · 1.0 G-269: reason, description, the line grid, totals, due, notes) ─────────────────── */

export type OneOffSave = { title: string; reason: string; lines: InvoiceLine[]; chargeGst: boolean; clientNote: string; dueMode: DueMode; dueOn: number | null }
export function OneOffDialog({ open, initial, gstRate, termsDays, handoverDay, today, busy, onClose, onSave }: {
  open: boolean; initial: InvoiceView | null; gstRate: number; termsDays: number; handoverDay: number | null; today: Date; busy: boolean
  onClose: () => void; onSave: (o: OneOffSave) => void
}) {
  const fresh = () => ({
    reason: initial?.reason ?? 'out_of_scope', title: initial?.stageName ?? '', note: initial?.clientNote ?? '', gst: initial ? !!initial.chargeGst : gstRate > 0,
    lines: initial?.lines?.length ? initial.lines.map((l) => ({ id: l.id, description: l.description, qty: String(l.qty), unit: fromMinor(l.unitMinor) })) : [blankLine()],
    mode: (initial?.dueMode ?? 'terms') as DueMode, date: initial?.dueOn ? inputDate(new Date(initial.dueOn)) : inputDate(today),
  })
  const [f, setF] = useState(fresh)
  const [tried, setTried] = useState(false)
  const [wasOpen, setWasOpen] = useState(open)
  /* (parity map, MI-035) what the PDF filled — each field says so until it is changed, as the bill dialog's do */
  const [read, setRead] = useState<{ file: string; fields: string[]; none?: boolean } | null>(null)
  const [reading, setReading] = useState(false)
  const pdfInput = useRef<HTMLInputElement>(null)
  if (open !== wasOpen) { setWasOpen(open); if (open) { setF(fresh()); setTried(false); setRead(null) } }
  const lines = f.lines.map(parsed)
  const t = linesTotals(lines, gstRate, f.gst && gstRate > 0)
  const linesWhy = linesProblem(lines.filter((l) => l.description || l.unitMinor))
  const dueWhy = f.mode === 'date' && !parseInputDate(f.date) ? 'Pick the day it is due' : undefined
  const set = (patch: Partial<typeof f>) => setF((x) => ({ ...x, ...patch }))
  const unmark = (field: string) => setRead((r) => (r && r.fields.includes(field) ? { ...r, fields: r.fields.filter((k) => k !== field) } : r))
  const mark = (field: string) => (read?.fields.includes(field) ? 'Read from the file — check it' : undefined)
  const fill = async (file?: File) => {
    if (!file) return
    setReading(true)
    const r = await readInvoicePdf(file)
    setReading(false)
    if ('none' in r || (!r.lines.length && !r.dueOn && !r.note)) { setRead({ file: r.file, fields: [], none: true }); return }
    const due = r.dueOn && r.dueOn >= new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime() ? r.dueOn : null   // a day already gone stays the studio's to pick
    setF((x) => ({
      ...x,
      ...(r.lines.length ? { lines: r.lines.slice(0, LINES_MAX).map((l) => ({ id: `n${++seq}`, description: l.description, qty: String(l.qty), unit: fromMinor(l.unitMinor) })), gst: gstRate > 0 && (r.gst || x.gst) } : {}),
      ...(due ? { mode: 'date' as DueMode, date: inputDate(new Date(due)) } : {}),
      ...(r.note ? { note: r.note } : {}),
    }))
    setRead({ file: r.file, fields: [...(r.lines.length ? ['lines'] : []), ...(due ? ['due'] : []), ...(r.note ? ['note'] : [])] })
  }
  const readWords = (r: NonNullable<typeof read>) => {
    if (r.none) return 'This file has no text to read — type the lines in'   // (invented copy, the brief's words) a scan or a photo
    const n = f.lines.length
    const what = [r.fields.includes('lines') ? `${n} line${n === 1 ? '' : 's'}` : '', r.fields.includes('due') ? 'the due day' : '', r.fields.includes('note') ? 'a note' : ''].filter(Boolean)
    return what.length ? `Read from ${r.file} — ${what.length > 1 ? `${what.slice(0, -1).join(', ')} and ${what[what.length - 1]}` : what[0]} filled. Check them against the invoice before you save.` : null
  }
  const save = () => {
    setTried(true)
    if (!f.title.trim() || linesWhy || dueWhy) return
    onSave({ title: f.title.trim(), reason: f.reason, lines: lines.filter((l) => l.description || l.unitMinor), chargeGst: f.gst && gstRate > 0, clientNote: f.note.trim(), ...dueOut(f.mode, f.date) })
  }
  return (
    <Dialog open={open} onClose={onClose} title={initial ? `Edit ${initial.stageName}` : 'New one-off invoice'} size="form" width={800} closeOnScrim={false}
            subtitle="Billed outside the payment stages — counted in Invoiced and Collected, never in the contract value. It goes as a Draft, then the stage invoices’ way: approval, send, payment, receipt."
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose} isDisabled={busy}>Cancel</Button><Button onPress={save} isDisabled={busy} data-testid="oneoff-save">{busy ? 'Saving…' : initial ? 'Save' : 'Save as Draft'}</Button></>}>
      <div className={styles.fields} data-testid="oneoff-dialog">
        <div>
          <span className={styles.fieldLabel}>Reason</span>
          <Chips label="Reason" options={ONE_OFF_REASONS} value={f.reason} onChange={(v) => set({ reason: v })} testId="oneoff-reason" />
        </div>
        <TextField label="What it’s for" value={f.title} onChange={(v) => set({ title: v })} maxLength={TITLE_MAX} required autoFocus={!initial}
                   helper="The invoice’s heading — “Permit and lift padding fees”" error={tried && !f.title.trim() ? 'Say what the invoice is for' : undefined} />
        <div>
          {/* (parity map, MI-035) a quiet "Fill from a PDF" beside the lines' label — the bill dialog's reader on the invoice's own text */}
          <div className={own.linesHead}>
            <span className={styles.fieldLabel}>Lines — priced before GST</span>
            <button type="button" className={textLink.link} onClick={() => pdfInput.current?.click()} disabled={reading} data-testid="oneoff-fill-pdf">{reading ? 'Reading the PDF…' : 'Fill from a PDF'}</button>
            <input ref={pdfInput} type="file" accept="application/pdf" hidden data-testid="oneoff-pdf-input" onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ''; void fill(file) }} />
          </div>
          {read && readWords(read) ? <p className={fin.readBand} data-tone={read.none ? 'alert' : undefined} data-testid="oneoff-read" role="status"><Icon name={read.none ? 'warning' : 'description'} size={20} weight={300} /><span>{readWords(read)}</span></p> : null}
          <LinesGrid lines={f.lines} onChange={(next) => set({ lines: next })} prefix="oneoff" onEdited={() => unmark('lines')}
                     trail={gstRate > 0 ? <label className={own.switchRow}><Switch size="sm" isSelected={f.gst} onChange={(v: boolean) => set({ gst: v })} aria-label={`Add GST (${gstRate}%)`} /><span>Add GST ({gstRate}%)</span></label> : null} />
          {tried && linesWhy ? <span className={styles.sub} data-tone="alert">{linesWhy}</span> : null}
          <dl className={own.totals} data-testid="oneoff-totals">
            <dt>Subtotal</dt><dd>{money2(t.subtotalMinor)}</dd>
            {f.gst && gstRate > 0 ? <><dt>GST ({gstRate}%)</dt><dd>{money2(t.gstMinor)}</dd></> : null}
            <dt className={own.grand}>Total</dt><dd className={own.grand}>{money2(t.totalMinor)}</dd>
          </dl>
        </div>
        <DueField mode={f.mode} date={f.date} onMode={(m) => { unmark('due'); set({ mode: m }) }} onDate={(d) => { unmark('due'); set({ date: d }) }} termsDays={termsDays} handoverDay={handoverDay} today={today} error={tried ? dueWhy : undefined} helper={mark('due')} />
        <TextField label="Note to the client (optional)" value={f.note} onChange={(v) => { unmark('note'); set({ note: v }) }} maxLength={NOTE_MAX} multiline={3} helper={mark('note') ?? 'Printed at the foot of the invoice — anything they should know about it'} />
      </div>
    </Dialog>
  )
}

/* ── Items 3 · 4 · Any Draft's description, note to the client and due day (1.0 G-227 · G-263) ──────────────────────────────────── */

export type DetailsSave = { description: string; clientNote: string; dueMode: DueMode; dueOn: number | null; /** (parity map, MI-031) the lines; null = one line again; absent = unchanged */ lines?: InvoiceLine[] | null }
export function InvoiceDetailsDialog({ open, invoice, termsDays, handoverDay, today, busy, onClose, onSave, gstRate = 0 }: {
  open: boolean; invoice: InvoiceView | null; termsDays: number; handoverDay: number | null; today: Date; busy: boolean
  onClose: () => void; onSave: (o: DetailsSave) => void
  /** (parity map, MI-031) the project's GST rate — an itemised stage's lines add up to it before GST; (S43D, F2-04) the contract's own share */ gstRate?: number
}) {
  /* (parity map, MI-031 — 1.0's line grid on a stage invoice) a payment stage's Draft may be itemised: its lines, before GST, add up to its share;
     the grid starts as 1.0's did — one line, "{stage} ({pct}%)", for the whole of it — so it adds up from the first moment and is split from there */
  const stage = !!invoice && (invoice.kind ?? 'stage') === 'stage'
  const target = invoice ? invoice.amountMinor - gstOf(invoice.amountMinor, gstRate) : 0   // the paper's line: the amount before GST (F-03)
  const pctWord = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(1)}%`
  const startLines = (): DraftLine[] => (invoice?.lines?.length
    ? invoice.lines.map((l) => ({ id: l.id, description: l.description, qty: String(l.qty), unit: fromMinor(l.unitMinor) }))
    : [{ id: `n${++seq}`, description: invoice ? `${invoice.stageName}${invoice.fixedMinor != null ? '' : ` (${pctWord(invoice.pct)})`}` : '', qty: '1', unit: fromMinor(Math.max(0, target)) }])
  const fresh = () => ({ description: invoice?.description ?? '', note: invoice?.clientNote ?? '', mode: (invoice?.dueMode ?? 'terms') as DueMode, date: invoice?.dueOn ? inputDate(new Date(invoice.dueOn)) : inputDate(today),
    itemise: !!invoice?.lines?.length, lines: startLines() })
  const [f, setF] = useState(fresh)
  const [tried, setTried] = useState(false)
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) { setWasOpen(open); if (open) { setF(fresh()); setTried(false) } }
  const dueWhy = f.mode === 'date' && !parseInputDate(f.date) ? 'Pick the day it is due' : undefined
  const lines = f.lines.map(parsed).filter((l) => l.description || l.unitMinor)
  const gap = invoice ? itemiseGap(lines, invoice.amountMinor, gstRate) : 0
  const linesWhy = f.itemise ? linesProblem(lines) ?? (gap ? `The lines don’t add up to the invoice: ${itemiseWords(gap)}` : null) : null
  const save = () => {
    setTried(true)
    if (dueWhy || linesWhy) return
    onSave({ description: f.description.trim(), clientNote: f.note.trim(), ...dueOut(f.mode, f.date), ...(f.itemise ? { lines } : invoice?.lines?.length ? { lines: null } : {}) })
  }
  const left = itemiseWords(gap)
  return (
    <Dialog open={open} onClose={onClose} title={`The ${invoice?.stageName ?? ''} invoice’s details`} size="form" width={stage ? 800 : 600} closeOnScrim={false}
            subtitle="What the client reads on it besides the amount, and when it falls due. Fixed once it is sent."
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose} isDisabled={busy}>Cancel</Button><Button onPress={save} isDisabled={busy} data-testid="details-save">{busy ? 'Saving…' : 'Save'}</Button></>}>
      <div className={styles.fields} data-testid="invoice-details-dialog">
        <TextField label="Description (optional)" value={f.description} onChange={(v) => setF((x) => ({ ...x, description: v }))} maxLength={DESCRIPTION_MAX}
                   helper="Printed under the invoice’s line — “Carpentry and electrical works, first half”" />
        {stage ? (
          <div data-testid="invoice-itemise">
            <label className={own.switchRow}><Switch size="sm" isSelected={f.itemise} onChange={(v: boolean) => setF((x) => ({ ...x, itemise: v, lines: v && !x.itemise && !invoice?.lines?.length ? startLines() : x.lines }))} aria-label="Itemise this invoice" /><span>Itemise this invoice <span className={styles.sub}>· its lines print under the stage’s line</span></span></label>
            {f.itemise ? (
              <div className={own.itemise}>
                <span className={styles.fieldLabel}>{gstRate > 0 ? `Lines — priced before GST, adding up to ${money2(target)} (${money2(invoice?.amountMinor ?? 0)} with GST)` : `Lines — adding up to the invoice’s ${money2(target)}`}</span>
                <LinesGrid lines={f.lines} onChange={(next) => setF((x) => ({ ...x, lines: next }))} prefix="itemise"
                           trail={<span className={own.total} data-tone={left && tried ? 'alert' : undefined} data-testid="itemise-left">{left ?? 'The lines add up to the invoice'}</span>} />
                {tried && linesWhy ? <span className={styles.sub} data-tone="alert" data-testid="itemise-error">{linesWhy}</span> : null}
              </div>
            ) : null}
          </div>
        ) : null}
        <DueField mode={f.mode} date={f.date} onMode={(m) => setF((x) => ({ ...x, mode: m }))} onDate={(d) => setF((x) => ({ ...x, date: d }))} termsDays={termsDays} handoverDay={handoverDay} today={today} error={tried ? dueWhy : undefined} />
        <TextField label="Note to the client (optional)" value={f.note} onChange={(v) => setF((x) => ({ ...x, note: v }))} maxLength={NOTE_MAX} multiline={3} helper="Printed at the foot of the invoice" />
      </div>
    </Dialog>
  )
}

/* ── Item 9 · Record an invoice made outside OpenMaison (1.0 G-229 "Upload External Invoice") ───────────────────────────────────── */

export type ExternalSave = { reference: string; amountMinor: number; issuedOn: number; dueOn: number | null; stageRef: string | null; note: string; file: PickedProof | null }
const OUTSIDE = 'Outside the payment schedule'
export function RecordExternalDialog({ open, stages, today, busy, onClose, onSave }: {
  open: boolean; stages: { ref: string; name: string; amountMinor: number }[]; today: Date; busy: boolean
  onClose: () => void; onSave: (o: ExternalSave) => void
}) {
  const fresh = () => ({ reference: '', amount: '', issued: inputDate(today), due: '', stage: OUTSIDE, note: '', file: null as PickedProof | null })
  const [f, setF] = useState(fresh)
  const [tried, setTried] = useState(false)
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) { setWasOpen(open); if (open) { setF(fresh()); setTried(false) } }
  const labelOf = (s: { name: string; amountMinor: number }) => `${s.name} — its Draft is ${money2(s.amountMinor)}`
  const picked = stages.find((s) => labelOf(s) === f.stage) ?? null
  const minor = toMinor(f.amount || '0')
  const issued = parseInputDate(f.issued), due = f.due ? parseInputDate(f.due) : null
  const why = { reference: !f.reference.trim() ? 'Enter the invoice’s own number' : undefined, amount: !(minor > 0) ? 'Enter its amount' : undefined,
    issued: !issued ? 'Pick the day it was issued' : undefined, due: due && issued && due < issued ? 'It is due on or after the day it was issued' : undefined }
  const save = () => {
    setTried(true)
    if (why.reference || why.amount || why.issued || why.due || !issued) return
    onSave({ reference: f.reference.trim(), amountMinor: minor, issuedOn: issued.getTime(), dueOn: due ? due.getTime() : null, stageRef: picked?.ref ?? null, note: f.note.trim(), file: f.file })
  }
  return (
    <Dialog open={open} onClose={onClose} title="Record an invoice made elsewhere" size="form" width={600} closeOnScrim={false}
            subtitle="An invoice raised outside OpenMaison — in your accounting system or a paper book. It counts in the figures, marked Recorded, and takes payments like any sent invoice."
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose} isDisabled={busy}>Cancel</Button><Button onPress={save} isDisabled={busy} data-testid="external-save">{busy ? 'Recording…' : 'Record invoice'}</Button></>}>
      <div className={styles.fields} data-testid="external-dialog">
        <div className={styles.pairs}>
          <TextField label="Its invoice number" value={f.reference} onChange={(v) => setF((x) => ({ ...x, reference: v }))} maxLength={REF_MAX} required autoFocus error={tried ? why.reference : undefined} helper="As the other system numbered it" />
          <TextField label="Amount, GST included (S$)" value={f.amount} numeric="money" onChange={(v) => setF((x) => ({ ...x, amount: v }))} required error={tried ? why.amount : undefined} />
        </div>
        <div className={styles.pairs}>
          <DateField label="Issued on" value={f.issued} onChange={(v) => setF((x) => ({ ...x, issued: v }))} today={today} max={today} required error={tried ? why.issued : undefined} />
          <DateField label="Due on (optional)" value={f.due} onChange={(v) => setF((x) => ({ ...x, due: v }))} today={today} error={tried ? why.due : undefined} helper="Blank — due the day it was issued" />
        </div>
        <TextField label="What it bills" mode="select" value={f.stage} options={[OUTSIDE, ...stages.map(labelOf)]} onChange={(v) => setF((x) => ({ ...x, stage: v }))}
                   helper={picked ? `It stands for the ${picked.name} stage: that stage’s unsent Draft gives way to it.` : 'Not part of the contract value — like a one-off invoice'} />
        <TextField label="What it’s for (optional)" value={f.note} onChange={(v) => setF((x) => ({ ...x, note: v }))} maxLength={DESCRIPTION_MAX} helper="Shown on Money beside its number" />
        <div>
          <ProofField proof={f.file} onProof={(p) => setF((x) => ({ ...x, file: p }))} title={<>Drop the invoice’s PDF or picture here or <b>browse</b></>} helper="Filed in Files › Payments" />
        </div>
      </div>
    </Dialog>
  )
}

/* ── Item 13 · A project's own payment split (1.0 G-177 · G-182; fee first behind Settings › Finance › Invoices) ───────────────────────── */

export type SplitSave = { rows: { name: string; pct: number; fixedMinor: number | null; milestoneId: string | null }[]; template: string | null }
type SplitDraft = { id: string; name: string; pct: string; fixed: string; milestone: string }
const NO_MILESTONE = 'No milestone — billed when you choose'
export function SplitDialog({ open, split, valueMinor, busy, onClose, onSave }: {
  open: boolean; split: SplitEditor | null; valueMinor: number | null; busy: boolean
  onClose: () => void; onSave: (o: SplitSave) => void
}) {
  const msLabel = (id: string | null) => (id ? split?.milestones.find((m) => m.id === id)?.title ?? NO_MILESTONE : NO_MILESTONE)
  const fromRows = (rows: SplitEditor['rows']): SplitDraft[] => rows.map((r) => ({ id: `s${++seq}`, name: r.name, pct: r.fixedMinor ? '' : String(r.pct), fixed: r.fixedMinor ? fromMinor(r.fixedMinor) : '', milestone: msLabel(r.milestoneId) }))
  const fresh = () => ({ rows: split?.rows.length ? fromRows(split.rows) : fromRows([{ name: 'Deposit', pct: 10, fixedMinor: null, milestoneId: null }, { name: 'Commencement', pct: 40, fixedMinor: null, milestoneId: null }, { name: 'Completion', pct: 50, fixedMinor: null, milestoneId: null }]),
    template: split?.template ?? null, feeFirst: !!split?.rows[0]?.fixedMinor })
  const [f, setF] = useState(fresh)
  const [tried, setTried] = useState(false)
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) { setWasOpen(open); if (open) { setF(fresh()); setTried(false) } }
  const rows = f.rows.map((r, i) => ({ name: r.name.trim(), pct: f.feeFirst && i === 0 ? 0 : Number(r.pct) || 0, fixedMinor: f.feeFirst && i === 0 ? toMinor(r.fixed || '0') : null, milestoneId: split?.milestones.find((m) => m.title === r.milestone)?.id ?? null }))
  const total = Math.round(rows.filter((r) => r.fixedMinor == null).reduce((s, r) => s + r.pct, 0) * 100) / 100
  const used = rows.map((r) => r.milestoneId).filter(Boolean)
  const why = !rows.length ? 'Add a payment stage'
    : rows.some((r) => !r.name) ? 'Name every stage'
      : f.feeFirst && !(rows[0]!.fixedMinor! > 0) ? 'Enter the fixed first stage’s amount'
        : f.feeFirst && valueMinor && rows[0]!.fixedMinor! >= valueMinor ? 'The fixed first stage is the whole agreed value or more — make it less'
          : rows.some((r) => r.fixedMinor == null && r.pct <= 0) ? 'Give every stage a share above 0%'
            : total !== 100 ? `The shares add up to ${total}% — make them 100%`
              : new Set(used).size !== used.length ? 'A milestone triggers one stage — pick another for each' : null
  const setRow = (id: string, patch: Partial<SplitDraft>) => setF((x) => ({ ...x, rows: x.rows.map((r) => (r.id === id ? { ...r, ...patch } : r)) }))
  const useTemplate = (name: string) => {
    const t = split?.templates.find((x) => x.name === name)
    if (t) setF((x) => ({ ...x, template: t.id, feeFirst: false, rows: t.rows.map((r) => ({ id: `s${++seq}`, name: r.name, pct: String(r.pct), fixed: '', milestone: NO_MILESTONE })) }))
  }
  const save = () => { setTried(true); if (why) return; onSave({ rows, template: f.template }) }
  const msOptions = [NO_MILESTONE, ...(split?.milestones ?? []).map((m) => m.title)]
  return (
    <Dialog open={open} onClose={onClose} title="Payment split" size="form" width={800} closeOnScrim={false}
            subtitle={`The stages this project is billed in — each a share of the ${valueMinor ? money2(valueMinor) : 'agreed'} value, billed when its milestone is done. Saving makes the stages’ invoices again; once one is sent the split stays.`}
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose} isDisabled={busy}>Cancel</Button><Button onPress={save} isDisabled={busy || !!split?.block} data-testid="split-save">{busy ? 'Saving…' : 'Save the split'}</Button></>}>
      <div className={styles.fields} data-testid="split-dialog">
        {split?.block ? <p className={styles.differs}><Icon name="lock" size={20} weight={300} />{split.block}</p> : null}
        {split?.templates.length ? (
          <TextField label="Start from a split" mode="select" value={split.templates.find((t) => t.id === f.template)?.name ?? ''} options={split.templates.map((t) => t.name)} onChange={useTemplate}
                     helper="Company › Templates › Payment schedules — pick one, then change it here" />
        ) : null}
        {/* (simplify round 2, R2-A — P3 §6.7) the project's fixed-fee-first switch always shows: while the studio's rule (Settings › Finance ›
            Invoices › May open with a fixed fee) is off it rests, its help naming where it is switched on — a split that already opens with a
            fixed fee can still be turned back to shares. The rule itself is unchanged (setProjectSplit refuses a fixed fee while it is off). */}
        <label className={own.switchRow} data-testid="split-fee-first" data-off={split?.feeFirst ? undefined : ''}>
          <Switch size="sm" isSelected={f.feeFirst} isDisabled={!split?.feeFirst && !f.feeFirst} onChange={(v: boolean) => setF((x) => ({ ...x, feeFirst: v }))} aria-label="The first stage is a fixed amount" />
          <span>The first stage is a fixed amount <span className={styles.sub}>{split?.feeFirst ? '· a design fee — the shares split what it leaves' : '· off for the studio — an Owner or an Admin switches it on in Settings › Finance › Invoices'}</span></span></label>
        <div className={own.lines} role="list" aria-label="Payment stages" data-testid="split-rows">
          {f.rows.map((r, i) => (
            <div key={r.id} className={own.splitRow} role="listitem" data-testid="split-row">
              <TextField className={own.lineDesc} label="Stage" value={r.name} onChange={(v) => setRow(r.id, { name: v })} maxLength={60} size="s" />
              {f.feeFirst && i === 0
                ? <TextField className={own.lineUnit} label="Amount (S$)" value={r.fixed} numeric="money" onChange={(v) => setRow(r.id, { fixed: v })} size="s" />
                : <TextField className={own.lineQty} label="Share (%)" value={r.pct} numeric="decimal" onChange={(v) => setRow(r.id, { pct: v })} size="s" />}
              <TextField className={own.lineMs} label="Billed when this is done" mode="select" value={r.milestone} options={msOptions} onChange={(v) => setRow(r.id, { milestone: v })} size="s" />
              <Tooltip label="Remove the stage" disabled={f.rows.length === 1}>
                <IconButton icon="delete" label={`Remove ${r.name || `stage ${i + 1}`}`} disabled={f.rows.length === 1} onClick={() => setF((x) => ({ ...x, rows: x.rows.filter((y) => y.id !== r.id) }))} />
              </Tooltip>
            </div>
          ))}
        </div>
        <div className={own.linesFoot}>
          <Button appearance="text" iconStart={<Icon name="add" size={20} />} onPress={() => setF((x) => ({ ...x, rows: [...x.rows, { id: `s${++seq}`, name: '', pct: '', fixed: '', milestone: NO_MILESTONE }] }))} isDisabled={f.rows.length >= 12} data-testid="split-add">Add a stage</Button>
          <span className={own.total} data-tone={total === 100 ? undefined : 'alert'} data-testid="split-total">Shares: {total}%</span>
        </div>
        {tried && why ? <span className={styles.sub} data-tone="alert" data-testid="split-error">{why}</span> : null}
        {!split?.milestones.length ? <span className={styles.sub}>No schedule yet — set it up on Schedule to tie each stage to a milestone.</span> : null}
      </div>
    </Dialog>
  )
}
