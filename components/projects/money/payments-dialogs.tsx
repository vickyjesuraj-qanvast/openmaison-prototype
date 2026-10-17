'use client'

import { useState, type ReactNode } from 'react'
import { Button } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { DateField } from '@/components/om/date-field'
import { TextField } from '@/components/om/text-field'
import { Chips } from '@/components/om/chips'
import { useSnackbar } from '@/components/om/snackbar'
import { Dropzone, FileTile } from '@/components/leads/move-stage/fields'
import { uploadablePicture } from '@/components/leads/files/upload-picture'
import { inputDate, parseInputDate } from '@/lib/format'
import { money2 } from '@/lib/quotes/math'
import { NOTE_MAX, PAYMENT_METHODS, PROOF_CAP, PROOF_TYPES, REFERENCE_MAX, amountProblem, overpaidBy, overpaidLine, paidBeforeSent, paidOnProblem, type PaymentMethod } from '@/lib/projects/payments-model'
import styles from './money.module.css'

export type PickedProof = { name: string; dataUrl: string; image: boolean }

/** A PDF read whole (a bank's confirmation is often one); a picture sized to land, as every upload (F205). Null when it can't be read. */
async function readProof(file: File): Promise<PickedProof | null> {
  if (file.type.startsWith('image/')) {
    const img = await uploadablePicture(file)
    return img ? { name: file.name, dataUrl: img, image: true } : null
  }
  if (file.type !== 'application/pdf') return null
  const url = await new Promise<string | null>((resolve) => { const r = new FileReader(); r.onload = () => resolve(typeof r.result === 'string' ? r.result : null); r.onerror = () => resolve(null); r.readAsDataURL(file) })
  return url && url.length <= PROOF_CAP ? { name: file.name, dataUrl: url, image: false } : null
}

/**
 * (Projects round 6) The bank's confirmation — the house dropzone (the Move stage window's, REG-149) and, once picked, the house file row with
 * its remove. A picture or a PDF; read in the browser and carried inside the action's one object argument. The studio's Record a payment and
 * the client's I have paid share it.
 */
export function ProofField({ proof, onProof, required = false, error, helper, title }: { proof: PickedProof | null; onProof: (p: PickedProof | null) => void; required?: boolean; error?: string; helper?: string
  /** (fix-F, F-35) the box's words — the portal says "Add a screenshot or PDF" on a touch screen, where nothing is dropped */ title?: ReactNode }) {
  const snack = useSnackbar()
  const [reading, setReading] = useState(false)
  const pick = async (file?: File) => {
    if (!file) return
    setReading(true)
    try {
      const p = await readProof(file)
      if (!p) { snack({ message: file.type.startsWith('image/') || file.type === 'application/pdf' ? 'This file didn’t read — under 6 MB, please' : 'Pick a picture or a PDF of the confirmation' }); return }
      onProof(p)
    } finally { setReading(false) }
  }
  return (
    <div data-testid="proof-field">
      <span className={styles.fieldLabel}>{required ? 'The bank’s confirmation *' : 'The bank’s confirmation (optional)'}</span>
      {proof ? <FileTile name={proof.name} thumb={proof.image ? proof.dataUrl : '/figma-assets/file-pdf.svg'} kind={proof.image ? 'image' : 'pdf'} onDelete={() => onProof(null)} />
        : <Dropzone title={title ?? <>Drop the screenshot or PDF here or <b>browse</b></>} helper={helper ?? 'A screenshot of the transfer, or the PayNow receipt'} accept={PROOF_TYPES} label="Add the bank’s confirmation" onPick={(f) => { void pick(f) }} uploading={reading} />}
      {error ? <span className={styles.sub} data-tone="alert">{error}</span> : null}
    </div>
  )
}

/**
 * (Projects round 6, F-10 · F-11 — 1.0's Record Payment, G-311, as one dialog, never a drawer as well, G-247) Record a payment against a sent
 * invoice: the amount (what is still owed, to start), the day it was paid, how, its reference and, if there is one, the bank's confirmation.
 * The studio's own record is confirmed as it is saved and gets its receipt. The dialog closes only once the save lands.
 */
export function RecordPaymentDialog({ open, invoice, today, busy, onClose, onSave, methods, client, amountMinor }: {
  open: boolean
  /** (pending modules S10) the amount to start with — what Maison AI's question named; else what is owed */ amountMinor?: number | null
  /** (pending modules S07) the client's first name — more than is owed is kept as their credit */ client?: string
  /** (parity map, FB-112 — P-D's Settings › Finance › Client payments) the ways the studio takes money today; absent = every way */ methods?: readonly string[] | null
  invoice: { number: string | null; stageName: string; owedMinor: number; sentAt: number | null } | null
  today: Date
  busy: boolean
  onClose: () => void
  onSave: (o: { amountMinor: number; paidOn: number; method: PaymentMethod; reference: string; note: string; proof: PickedProof | null }) => void
}) {
  const owed = invoice?.owedMinor ?? 0
  const start = amountMinor != null && amountMinor > 0 ? amountMinor : owed
  const [amount, setAmount] = useState((start / 100).toFixed(2))
  const [date, setDate] = useState(inputDate(today))
  /* (parity map, FB-112) only the ways switched on are offered — the first of them to start */
  const offered = methods?.length ? PAYMENT_METHODS.filter((m) => methods.includes(m.value)) : PAYMENT_METHODS
  const first = (offered[0]?.value ?? 'bank_transfer') as PaymentMethod
  const [method, setMethod] = useState<PaymentMethod | null>(first)
  const [reference, setReference] = useState('')
  const [note, setNote] = useState('')   // (fix-D, D-14) the house's place for what the figure doesn't say (an extra paid, a bank charge)
  const [proof, setProof] = useState<PickedProof | null>(null)
  const [tried, setTried] = useState(false)
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) { setWasOpen(open); if (open) { setAmount((start / 100).toFixed(2)); setDate(inputDate(today)); setMethod(first); setReference(''); setNote(''); setProof(null); setTried(false) } }
  const minor = Math.round(Number(amount.replace(/,/g, '')) * 100)
  const amountWhy = amount.trim() === '' ? 'Enter the amount paid' : amountProblem(minor, owed, { studio: true })
  /* (pending modules S07 — D-14, as recommended) more than is owed is recorded as it arrived: the extra becomes the client's credit note */
  const extra = amountWhy ? 0 : overpaidBy(minor, owed)
  const day = parseInputDate(date)
  const dayWhy = paidOnProblem(day, { now: today.getTime() })
  const early = !dayWhy && paidBeforeSent(day, invoice?.sentAt ?? null)   // (fix-D, D-32) paid before the invoice went out — it settles it all the same
  const save = () => { setTried(true); if (amountWhy || dayWhy || !method || !day) return; onSave({ amountMinor: minor, paidOn: day.getTime(), method, reference: reference.trim(), note: note.trim(), proof }) }
  return (
    <Dialog open={open} onClose={onClose} title="Record a payment" size="form" width={600}
            subtitle={invoice ? `${invoice.number ?? 'The invoice'} · ${invoice.stageName} — ${money2(owed)} still owed. A payment you record is confirmed and gets its receipt.` : undefined}
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose} isDisabled={busy}>Cancel</Button><Button onPress={save} isDisabled={busy} data-testid="record-save">{busy ? 'Recording…' : 'Record payment'}</Button></>}>
      <div className={styles.fields} data-testid="record-payment">
        <div className={styles.pairs}>
          <TextField label="Amount paid (S$)" value={amount} numeric="money" onChange={setAmount} required autoFocus error={tried && amountWhy ? amountWhy : undefined}
                     helper={extra ? overpaidLine({ extraMinor: extra, client: client ?? 'the client' }) : undefined} />
          <DateField label="Paid on" value={date} onChange={setDate} today={today} max={today} required error={tried && dayWhy ? dayWhy : undefined}
                     helper={early ? 'Before the invoice was sent — it settles it all the same' : undefined} />
        </div>
        <div>
          <span className={styles.fieldLabel}>How it was paid</span>
          <Chips label="How it was paid" options={offered.map((m) => ({ value: m.value, label: m.label }))} value={method} onChange={(v) => setMethod(v as PaymentMethod)} testId="record-method" />
          {tried && !method ? <span className={styles.sub} data-tone="alert">Say how it was paid</span> : null}
        </div>
        <TextField label="Reference" value={reference} onChange={setReference} maxLength={REFERENCE_MAX} helper="The bank’s or the cheque’s reference, so it can be matched later" />
        <TextField label="Note (optional)" value={note} onChange={setNote} maxLength={NOTE_MAX} helper="For the team — a bank charge, who paid" />
        <ProofField proof={proof} onProof={setProof} />
      </div>
    </Dialog>
  )
}
