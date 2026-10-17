'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { DateField } from '@/components/om/date-field'
import { TextField } from '@/components/om/text-field'
import { Icon } from '@/components/om/icon'
import { useSnackbar } from '@/components/om/snackbar'
import { Dropzone, FileTile } from '@/components/leads/move-stage/fields'
import { inputDate, parseInputDate } from '@/lib/format'
import { money2 } from '@/lib/quotes/math'
import { readWords, type BillRead } from '@/lib/finance/bill-reader'
import { NOTE_MAX, REF_MAX, type BillLine, type BillRecord, type VendorRecord } from '@/lib/finance/model'
import type { PoView } from '@/lib/finance/costs'
import type { CostProject } from '@/lib/finance/queries'
import type { BillInput } from '@/app/finance/cost-actions'
import { VendorField } from './vendor-field'
import { readBillFile, readDoc, type PickedFile } from './pick-doc'
import money from '@/components/projects/money/money.module.css'
import own from '@/components/projects/money/invoice-dialogs.module.css'
import fin from './finance.module.css'

/*
 * (gaps build F1 — F1-Q10) Record a supplier's bill: drop its PDF (or a photo) and the curated reader fills what it can read — who it is from, its
 * number, its days, its amounts, its lines — each field saying so until it is changed; or enter it by hand. Then the vendor (the read name finds
 * the directory's, else *Add {name} as a vendor*), the project or the studio's overhead, the PO it is on, and the file kept with it. The house
 * Dialog, Dropzone, fields; errors after the first press; the host saves (a likely duplicate asks first) and closes it once the save lands.
 */
const OVERHEAD = 'Studio overhead — not a project'
const toMinor = (v: string) => (v.trim() === '' ? NaN : Math.round(Number(v.replace(/,/g, '')) * 100))
const fromMinor = (m: number | null | undefined) => (m === null || m === undefined ? '' : (m / 100).toFixed(2))

export function BillDialog({ open, initial, fixedProject, forPo = null, projects, overhead, vendors, onVendorAdded, pos, trades, bank, busy, onClose, onSave, file = null, waitWords }: {
  open: boolean
  /** (simplify round 2, for R2-A's drop on Money) a file dropped on the page: the dialog opens reading it, through its own reader — as a file
      picked in its dropzone would be — instead of the page handing it to the dropzone's input */
  file?: File | null
  initial: BillRecord | null
  /** opened on a project's Money tab: the bill is that project's */ fixedProject: CostProject | null
  /** opened from a PO ("Record a bill on it"): its vendor and the PO to start */ forPo?: { id: string; vendorId: string } | null
  /** Finance: the projects this viewer records bills on */ projects: CostProject[]
  /** whether this viewer records the studio's overhead bills (Owners and Admins) */ overhead: boolean
  vendors: VendorRecord[]
  onVendorAdded: (v: VendorRecord) => void
  /** the POs a bill may go on (bound ones, by project and vendor) */ pos: PoView[]
  trades: string[]
  bank: boolean
  busy: boolean
  onClose: () => void
  onSave: (i: BillInput) => void
  /** (S44R — UAT row 361, call C8) why this bill would wait for an Owner's or an Admin's OK before it is paid — said before it is recorded; null = it won't */
  waitWords?: (totalMinor: number, poId: string | null) => string | null
}) {
  const snackbar = useSnackbar()
  const [today] = useState(() => new Date())
  const fresh = () => ({
    stage: (initial ? 'form' : file ? 'reading' : 'pick') as 'pick' | 'reading' | 'form',
    projectId: initial ? initial.projectId : fixedProject?.id ?? null as string | null,
    vendorId: initial?.vendorId ?? forPo?.vendorId ?? null as string | null, poId: initial?.poId ?? forPo?.id ?? null as string | null,
    reference: initial?.reference ?? '', issued: initial ? inputDate(new Date(initial.issuedOn)) : inputDate(today), due: initial?.dueOn ? inputDate(new Date(initial.dueOn)) : '',
    subtotal: fromMinor(initial?.subtotalMinor), gst: fromMinor(initial?.gstMinor), total: fromMinor(initial?.totalMinor),
    lines: initial?.lines ?? [] as BillLine[], note: initial?.note ?? '', file: null as PickedFile | null, read: null as BillRead | null, readFrom: initial?.readFrom ?? null as string | null,
    readFields: initial?.readFields ?? [] as string[], seed: null as string | null, isOverhead: !!initial && !initial.projectId,
  })
  const [f, setF] = useState(fresh)
  const [tried, setTried] = useState(false)
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) { setWasOpen(open); if (open) { setF(fresh()); setTried(false) } }
  const set = (patch: Partial<typeof f>) => setF((x) => ({ ...x, ...patch }))
  /** a field changed by hand is no longer the reader's */
  const touch = (field: string, patch: Partial<typeof f>) => setF((x) => ({ ...x, ...patch, readFields: x.readFields.filter((k) => k !== field) }))
  const read = (k: string) => (f.readFields.includes(k) ? 'Read from the file — check it' : undefined)

  /** Reads a picked (or dropped) file into the form: its PDF read for the fields, the file kept with the bill. */
  const readInto = async (file: File) => {
    const [doc, r] = await Promise.all([readDoc(file), readBillFile(file, vendors.filter((v) => !v.mergedInto).map((v) => ({ id: v.id, name: v.name, uen: v.uen })))])
    if ('why' in doc) { snackbar({ message: doc.why }); set({ stage: 'pick' }); return }
    setF((x) => ({
      ...x, stage: 'form', file: doc.doc, read: r, readFrom: file.name, readFields: r.fields,
      vendorId: r.vendorId ?? x.vendorId, seed: r.vendorId ? null : r.supplier, reference: r.reference ?? x.reference,
      issued: r.issuedOn ? inputDate(new Date(r.issuedOn)) : x.issued, due: r.dueOn ? inputDate(new Date(r.dueOn)) : x.due,
      subtotal: r.subtotalMinor !== null ? fromMinor(r.subtotalMinor) : x.subtotal, gst: r.gstMinor !== null ? fromMinor(r.gstMinor) : x.gst, total: r.totalMinor !== null ? fromMinor(r.totalMinor) : x.total,
      lines: r.lines.length ? r.lines : x.lines,
      /* the PO: the one of this vendor on this project, when there is only one */
      poId: (() => { const vid = r.vendorId ?? x.vendorId; const mine = pos.filter((p) => p.vendorId === vid && p.projectId === x.projectId); return mine.length === 1 ? mine[0]!.id : x.poId })(),
    }))
  }
  const pick = async (file?: File) => {
    if (!file) return
    set({ stage: 'reading' })
    await readInto(file)
  }
  /* (simplify round 2) a dropped file: read once as the dialog opens (it opened on "Reading the bill…", `fresh`); the same file is never read twice */
  const readFor = useRef<File | null>(null)
  const reader = useRef(readInto)
  useEffect(() => { reader.current = readInto })
  useEffect(() => {
    if (!open) { readFor.current = null; return }
    if (!file || initial || readFor.current === file) return
    readFor.current = file
    void reader.current(file)
  }, [open, file, initial])
  const projectOptions = [...projects.map((p) => `${p.number} · ${p.name}`), ...(overhead ? [OVERHEAD] : [])]
  const projectLabel = f.isOverhead ? OVERHEAD : f.projectId ? (() => { const p = projects.find((x) => x.id === f.projectId) ?? (fixedProject?.id === f.projectId ? fixedProject : null); return p ? `${p.number} · ${p.name}` : '' })() : ''
  const vendorPos = pos.filter((p) => p.vendorId === f.vendorId && p.projectId === f.projectId && (p.state === 'sent' || p.state === 'accepted' || p.state === 'part_paid' || p.state === 'closed' || p.id === f.poId))
  const NO_PO = 'None — a bill on its own'
  const poLabel = (p: PoView) => `${p.number}${p.title ? ` · ${p.title}` : ''} · ${money2(p.totalMinor)}`
  const sub = toMinor(f.subtotal), gst = f.gst.trim() === '' ? 0 : toMinor(f.gst), total = toMinor(f.total)
  const sumWhy = Number.isFinite(sub) && Number.isFinite(total) && Math.abs(sub + gst - total) > 1 ? `The subtotal and the GST come to ${money2(sub + gst)}` : undefined
  const why = {
    project: !fixedProject && !initial && f.projectId === null && !f.isOverhead ? (overhead ? 'Pick the project, or the studio’s overhead' : 'Pick the project') : undefined,
    vendor: !f.vendorId ? 'Pick the vendor' : undefined,
    reference: !f.reference.trim() ? 'Enter the bill’s own number' : undefined,
    issued: !parseInputDate(f.issued) ? 'Pick the day it was issued' : undefined,
    total: !Number.isFinite(total) || total <= 0 ? 'Enter the total' : sumWhy,
    due: f.due && parseInputDate(f.due) && parseInputDate(f.issued) && parseInputDate(f.due)!.getTime() < parseInputDate(f.issued)!.getTime() ? 'It can’t be due before it was issued' : undefined,
  }
  const save = () => {
    setTried(true)
    if (Object.values(why).some(Boolean)) return
    onSave({
      id: initial?.id ?? null, projectId: fixedProject?.id ?? f.projectId, vendorId: f.vendorId!, poId: f.poId, reference: f.reference, issuedOn: parseInputDate(f.issued)!.getTime(),
      dueOn: f.due ? parseInputDate(f.due)?.getTime() ?? null : null, subtotalMinor: Number.isFinite(sub) ? sub : total - gst, gstMinor: gst, totalMinor: total, lines: f.lines, note: f.note,
      readFrom: f.readFrom, readFields: f.readFields, file: f.file ? { name: f.file.name, dataUrl: f.file.dataUrl, thumb: f.file.thumb } : null,
    })
  }
  return (
    <Dialog open={open} onClose={onClose} title={initial ? `Edit bill ${initial.reference}` : 'Record a supplier bill'} size="form" width={800} closeOnScrim={false}
            subtitle={f.stage === 'pick' ? 'Drop the bill your supplier sent — its PDF is read for you — or enter it by hand. It counts as a cost once recorded.' : undefined}   /* (S44R, C8 — a deliberate change: "No approval" was F1-Q10's, reversed) */
            footer={f.stage === 'form' ? <><Button variant="secondary" appearance="outlined" onPress={onClose} isDisabled={busy}>Cancel</Button><Button onPress={save} isDisabled={busy} data-testid="bill-save">{busy ? 'Recording…' : initial ? 'Save' : 'Record the bill'}</Button></>
              : <><Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button><Button variant="secondary" appearance="outlined" onPress={() => set({ stage: 'form' })} isDisabled={f.stage === 'reading'} data-testid="bill-by-hand">Enter it by hand</Button></>}>
      {f.stage !== 'form' ? (
        <div className={money.fields} data-testid="bill-pick">
          <Dropzone title={f.stage === 'reading' ? 'Reading the bill…' : <>Drop the bill here or <b>browse</b></>} helper="A PDF is read for you; a photo is kept with the bill — up to 8 MB"
                    accept="application/pdf,image/jpeg,image/png,image/webp" label="Add the supplier’s bill" onPick={(file) => { void pick(file) }} uploading={f.stage === 'reading'} />
        </div>
      ) : (
        <div className={money.fields} data-testid="bill-dialog">
          {f.readFrom && f.read ? (
            <p className={fin.readBand} data-tone={f.read.fields.length ? undefined : 'alert'} data-testid="bill-read"><Icon name={f.read.fields.length ? 'description' : 'warning'} size={20} weight={300} /><span>{readWords(f.read, f.readFrom)}</span></p>
          ) : null}
          {!fixedProject && !initial ? (
            <TextField label="Project" mode="select" searchable required options={projectOptions} value={projectLabel}
                       onChange={(v) => { if (v === OVERHEAD) set({ projectId: null, poId: null, isOverhead: true }); else { const p = projects.find((x) => `${x.number} · ${x.name}` === v); if (p) set({ projectId: p.id, poId: null, isOverhead: false }) } }}
                       error={tried ? why.project : undefined} helper={overhead ? 'A project’s cost, or the studio’s own (rent, printing, software)' : undefined} />
          ) : null}
          <VendorField vendors={vendors} value={f.vendorId} onChange={(id) => touch('supplier', { vendorId: id, poId: null })} onAdded={(v) => { onVendorAdded(v); touch('supplier', { vendorId: v.id, seed: null }) }}
                       trades={trades} bank={bank} seed={f.seed} error={tried ? why.vendor : undefined} helper={read('supplier')} testId="bill-vendor" />
          {f.vendorId && (f.projectId || fixedProject) && vendorPos.length ? (
            <TextField label="On the PO" mode="select" options={[NO_PO, ...vendorPos.map(poLabel)]} value={f.poId ? (vendorPos.find((p) => p.id === f.poId) ? poLabel(vendorPos.find((p) => p.id === f.poId)!) : '') : NO_PO}
                       onChange={(v) => set({ poId: vendorPos.find((p) => poLabel(p) === v)?.id ?? null })} helper="A bill on a PO is the PO’s money — paying it pays the PO" />
          ) : null}
          <div className={money.pairs}>
            <TextField label="Their invoice number" value={f.reference} onChange={(v) => touch('reference', { reference: v })} maxLength={REF_MAX} required error={tried ? why.reference : undefined} helper={read('reference')} />
            <DateField label="Issued on" value={f.issued} onChange={(v) => touch('issuedOn', { issued: v })} today={today} max={today} required error={tried ? why.issued : undefined} helper={read('issuedOn')} />
          </div>
          <div className={money.pairs}>
            <DateField label="Due on (optional)" value={f.due} onChange={(v) => touch('dueOn', { due: v })} today={today} error={tried ? why.due : undefined} helper={read('dueOn') ?? 'When the supplier wants it paid'} />
            <TextField label="Subtotal (S$)" value={f.subtotal} numeric="money" onChange={(v) => touch('subtotal', { subtotal: v })} helper={read('subtotal') ?? 'Before GST'} />
          </div>
          <div className={money.pairs}>
            <TextField label="GST (S$)" value={f.gst} numeric="money" onChange={(v) => touch('gst', { gst: v })} helper={read('gst') ?? 'As the bill prints it — never worked out again'} />
            <TextField label="Total (S$)" value={f.total} numeric="money" onChange={(v) => touch('total', { total: v })} required error={tried ? why.total : undefined} helper={read('total')} />
          </div>
          {f.lines.length ? (
            <div>
              <span className={money.fieldLabel}>Lines{f.readFields.includes('lines') ? ' — read from the file' : ''}</span>
              <ul className={fin.panelLines} data-testid="bill-lines">
                {f.lines.map((l) => <li key={l.id} className={fin.panelLine}><span>{l.description}<span className={money.sub}> · {l.qty} × {money2(l.unitMinor)}</span></span><span className={money.num}>{money2(Math.round(l.qty * l.unitMinor))}</span></li>)}
              </ul>
            </div>
          ) : null}
          {f.file ? <FileTile name={f.file.name} thumb={f.file.thumb} kind={f.file.image ? 'image' : 'pdf'} onDelete={() => set({ file: null })} />
            : !initial ? <Dropzone variant="compact" title={<>Add the bill’s file or <b>browse</b></>} accept="application/pdf,image/jpeg,image/png,image/webp" label="Add the bill’s file" onPick={(file) => { void pick(file) }} /> : null}
          <TextField label="Note (optional)" value={f.note} onChange={(v) => set({ note: v })} maxLength={NOTE_MAX} multiline={2} helper="For the team — what it is for, what to check" />
          {/* (S44R, C8) a bill that will wait for its OK says so before it is recorded — and why */}
          <span className={own.total} data-testid="bill-total-line">{Number.isFinite(total) && total > 0 ? (() => { const w = waitWords?.(total, f.poId) ?? null; const why = w ? `${w.charAt(0).toLowerCase()}${w.slice(1)}` : ''
            /* (S44R, C8) on no PO a waiting bill counts once approved (costsOf's rule); on a PO it counts through the PO and waits to be paid */
            return !w ? `${money2(total)} — counted as a cost once recorded` : f.poId ? `${money2(total)} — counted as a cost once recorded; it waits for an Owner’s or an Admin’s OK before it is paid: ${why}` : `${money2(total)} — it waits for an Owner’s or an Admin’s OK before it counts as a cost or is paid: ${why}` })() : ''}</span>
        </div>
      )}
    </Dialog>
  )
}
