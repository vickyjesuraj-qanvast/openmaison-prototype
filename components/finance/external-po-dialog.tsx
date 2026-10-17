'use client'

import { useState } from 'react'
import { Button, Switch } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { DateField } from '@/components/om/date-field'
import { TextField } from '@/components/om/text-field'
import { useSnackbar } from '@/components/om/snackbar'
import { Dropzone, FileTile } from '@/components/leads/move-stage/fields'
import { inputDate, parseInputDate } from '@/lib/format'
import { money2 } from '@/lib/quotes/math'
import { REF_MAX, gstInside, type VendorRecord } from '@/lib/finance/model'
import type { CostProject } from '@/lib/finance/queries'
import type { ExternalPoInput } from '@/app/finance/po-actions'
import { readDoc, type PickedFile } from './pick-doc'
import { VendorField } from './vendor-field'
import money from '@/components/projects/money/money.module.css'
import own from '@/components/projects/money/invoice-dialogs.module.css'

/*
 * (parity map, MO-038 — 1.0's "Upload PO", UploadExternalDocDialog) Record a purchase order made elsewhere — in the studio's accounting system,
 * a spreadsheet or a paper book: the project (in Finance; fixed on a project's Money), the vendor, its own number, what it comes to (GST in it
 * or not), the day it was made and its file. It becomes a PO marked Recorded that counts in the costs and takes bills and payments like any
 * other; it never goes to the vendor's link. The record-an-invoice-made-elsewhere dialog's grammar (the house Dialog, fields, the bill's
 * Dropzone); errors after the first press; the host saves and closes it once the save lands.
 */
const toMinor = (v: string) => (v.trim() === '' ? NaN : Math.round(Number(v.replace(/,/g, '')) * 100))

export function ExternalPoDialog({ open, fixedProject, projects, vendors, onVendorAdded, trades, bank, gstRate, busy, onClose, onSave }: {
  open: boolean
  /** the project's Money: its project */ fixedProject: CostProject | null
  /** Finance: the projects this viewer records POs on */ projects: CostProject[]
  vendors: VendorRecord[]
  onVendorAdded: (v: VendorRecord) => void
  trades: string[]
  bank: boolean
  gstRate: number
  busy: boolean
  onClose: () => void
  onSave: (i: ExternalPoInput) => void
}) {
  const snackbar = useSnackbar()
  const [today] = useState(() => new Date())
  const fresh = () => ({ projectId: fixedProject?.id ?? null as string | null, vendorId: null as string | null, reference: '', amount: '', gst: gstRate > 0, day: inputDate(today), title: '', file: null as PickedFile | null })
  const [f, setF] = useState(fresh)
  const [tried, setTried] = useState(false)
  const [reading, setReading] = useState(false)
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) { setWasOpen(open); if (open) { setF(fresh()); setTried(false) } }
  const set = (patch: Partial<typeof f>) => setF((x) => ({ ...x, ...patch }))
  const amount = toMinor(f.amount)
  const label = (p: CostProject) => `${p.number} · ${p.name}`
  const why = {
    project: !f.projectId ? 'Pick the project it is for' : undefined,
    vendor: !f.vendorId ? 'Pick the vendor' : undefined,
    reference: !f.reference.trim() ? 'Enter the PO’s own number' : undefined,
    amount: !Number.isFinite(amount) || amount <= 0 ? 'Enter what it comes to' : undefined,
    day: !parseInputDate(f.day) ? 'Pick the day it was made' : undefined,
    file: !f.file ? 'Add the PO’s file' : undefined,
  }
  const pick = async (file?: File) => {
    if (!file) return
    setReading(true)
    try { const r = await readDoc(file); if ('why' in r) snackbar({ message: r.why }); else set({ file: r.doc }) }
    catch { snackbar({ message: `${file.name} didn’t read — pick it again` }) } finally { setReading(false) }
  }
  const save = () => {
    setTried(true)
    if (Object.values(why).some(Boolean) || !f.projectId || !f.vendorId || !f.file) return
    onSave({ projectId: f.projectId, vendorId: f.vendorId, reference: f.reference.trim(), amountMinor: amount, includesGst: f.gst && gstRate > 0, madeOn: parseInputDate(f.day)!.getTime(),
      title: f.title.trim() || null, file: { name: f.file.name, dataUrl: f.file.dataUrl, thumb: f.file.thumb } })
  }
  return (
    <Dialog open={open} onClose={onClose} title="Record a PO made elsewhere" size="form" width={600} closeOnScrim={false}
            subtitle="A purchase order made outside OpenMaison — in your accounting system or on paper. It counts in the costs, marked Recorded, and takes bills and payments like any PO; it never goes to the vendor’s link."
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose} isDisabled={busy}>Cancel</Button><Button onPress={save} isDisabled={busy || reading} data-testid="external-po-save">{busy ? 'Recording…' : 'Record the PO'}</Button></>}>
      <div className={money.fields} data-testid="external-po-dialog">
        {!fixedProject ? (
          <TextField label="Project" mode="select" searchable required options={projects.map(label)} value={(() => { const p = projects.find((x) => x.id === f.projectId); return p ? label(p) : '' })()}
                     onChange={(v) => { const p = projects.find((x) => label(x) === v); if (p) set({ projectId: p.id }) }} error={tried ? why.project : undefined} />
        ) : null}
        <VendorField vendors={vendors} value={f.vendorId} onChange={(id) => { const v = vendors.find((x) => x.id === id); set({ vendorId: id, gst: !!v?.chargesGst && gstRate > 0 }) }}
                     onAdded={(v) => { onVendorAdded(v); set({ vendorId: v.id, gst: v.chargesGst && gstRate > 0 }) }} trades={trades} bank={bank}
                     error={tried ? why.vendor : undefined} testId="external-po-vendor" />
        <div className={money.pairs}>
          <TextField label="Its PO number" value={f.reference} onChange={(v) => set({ reference: v })} maxLength={REF_MAX} required error={tried ? why.reference : undefined} helper="As the other system numbered it" />
          <TextField label="What it comes to (S$)" value={f.amount} numeric="money" onChange={(v) => set({ amount: v })} required error={tried ? why.amount : undefined}
                     helper={f.gst && gstRate > 0 && Number.isFinite(amount) && amount > 0 ? `Includes ${money2(gstInside(amount, gstRate))} GST` : 'What the vendor is owed in all'} />
        </div>
        {gstRate > 0 ? <label className={own.switchRow}><Switch size="sm" isSelected={f.gst} onChange={(v: boolean) => set({ gst: v })} aria-label={`Includes GST (${gstRate}%)`} /><span>Includes GST ({gstRate}%)</span></label> : null}
        <div className={money.pairs}>
          <DateField label="Made on" value={f.day} onChange={(v) => set({ day: v })} today={today} max={today} required error={tried ? why.day : undefined} />
          <TextField label="What it’s for (optional)" value={f.title} onChange={(v) => set({ title: v })} maxLength={120} helper="“Kitchen carpentry”" />
        </div>
        <div>
          <span className={money.fieldLabel}>Its file</span>
          {f.file ? <FileTile name={f.file.name} thumb={f.file.thumb} kind={f.file.image ? 'image' : 'pdf'} onDelete={() => set({ file: null })} />
            : <Dropzone variant="compact" title={reading ? 'Reading…' : <>Drop the PO’s PDF or a photo here or <b>browse</b></>} accept="application/pdf,image/jpeg,image/png,image/webp" label="Add the PO’s file" uploading={reading}
                        onPick={(file) => { void pick(file) }} />}
          {tried && why.file ? <span className={money.sub} data-tone="alert">{why.file}</span> : null}
        </div>
      </div>
    </Dialog>
  )
}
