'use client'

import { useState } from 'react'
import { Button } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { DateField } from '@/components/om/date-field'
import { TextField } from '@/components/om/text-field'
import { Chips } from '@/components/om/chips'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { useSnackbar } from '@/components/om/snackbar'
import { copyText } from '@/lib/clipboard'
import { inputDate, parseInputDate } from '@/lib/format'
import { money2 } from '@/lib/quotes/math'
import { NOTE_MAX, PAY_OUT_METHODS, payNowShown } from '@/lib/finance/model'
import { ProofField, type PickedProof } from '@/components/projects/money/payments-dialogs'
import money from '@/components/projects/money/money.module.css'
import fin from './finance.module.css'

/*
 * (gaps build F1 — F1-Q12) Pay a vendor (a PO, a bill) or a member's claim — the money-in Record a payment's dialog, the other way: the amount (what
 * is owed, to start — the PO's advance first), the day, how (F-10's four), the reference, a note, the transfer's screenshot. Never more than is
 * owed. The house Dialog and fields; the host saves and closes it once the save lands.
 */
export type PayoutTarget = { kind: 'po' | 'bill' | 'claim'; id: string; label: string; to: string; owedMinor: number; advanceDueMinor: number
  /** (simplify S-10 · F1 §6.9.3) whom to pay — the vendor's bank and PayNow, for whoever sees them; for a claim (simplify round 2) the member's own
      PayNow (Company › Members); null when none is on record */
  bank?: { name: string; bankName: string | null; accountNo: string | null; payNow: string | null } | null }
export function PayoutDialog({ open, target, busy, onClose, onSave }: {
  open: boolean
  target: PayoutTarget | null
  busy: boolean
  onClose: () => void
  onSave: (o: { amountMinor: number; paidOn: number; method: string; reference: string; note: string; proof: PickedProof | null }) => void
}) {
  const [today] = useState(() => new Date())
  const snackbar = useSnackbar()
  const start = (t: PayoutTarget | null) => ((t?.advanceDueMinor || t?.owedMinor || 0) / 100).toFixed(2)
  const [amount, setAmount] = useState(start(target))
  const [date, setDate] = useState(inputDate(today))
  const [method, setMethod] = useState<string | null>('bank_transfer')
  const [reference, setReference] = useState('')
  const [note, setNote] = useState('')
  const [proof, setProof] = useState<PickedProof | null>(null)
  const [tried, setTried] = useState(false)
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) { setWasOpen(open); if (open) { setAmount(start(target)); setDate(inputDate(today)); setMethod('bank_transfer'); setReference(''); setNote(''); setProof(null); setTried(false) } }
  const owed = target?.owedMinor ?? 0
  const minor = Math.round(Number(amount.replace(/,/g, '')) * 100)
  const amountWhy = amount.trim() === '' || !(minor > 0) ? 'Enter the amount paid' : minor > owed ? `No more than the ${money2(owed)} owed` : undefined
  const day = parseInputDate(date)
  const dayWhy = !day ? 'Pick the day it was paid' : day.getTime() > today.getTime() ? 'Today or before' : undefined
  const save = () => { setTried(true); if (amountWhy || dayWhy || !method || !day) return; onSave({ amountMinor: minor, paidOn: day.getTime(), method, reference: reference.trim(), note: note.trim(), proof }) }
  const title = target?.kind === 'claim' ? 'Pay back a claim' : 'Pay the vendor'
  return (
    <Dialog open={open} onClose={onClose} title={title} size="form" width={600}
            subtitle={target ? `${target.label} · ${target.to} — ${money2(owed)} owed${target.advanceDueMinor ? `, the ${money2(target.advanceDueMinor)} advance first` : ''}.` : undefined}
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose} isDisabled={busy}>Cancel</Button><Button onPress={save} isDisabled={busy} data-testid="payout-save">{busy ? 'Recording…' : 'Record the payment'}</Button></>}>
      <div className={money.fields} data-testid="payout-dialog">
        {target?.bank ? <PayTo bank={target.bank} onCopied={(what) => snackbar({ message: `${what} copied` })} onFailed={() => snackbar({ message: 'Couldn’t copy it' })} /> : null}
        <div className={money.pairs}>
          <TextField label="Amount paid (S$)" value={amount} numeric="money" onChange={setAmount} required autoFocus error={tried ? amountWhy : undefined} helper={target?.advanceDueMinor && minor === target.advanceDueMinor ? 'The advance' : undefined} />
          <DateField label="Paid on" value={date} onChange={setDate} today={today} max={today} required error={tried ? dayWhy : undefined} />
        </div>
        <div>
          <span className={money.fieldLabel}>How it was paid</span>
          <Chips label="How it was paid" options={PAY_OUT_METHODS} value={method} onChange={(v) => setMethod(v)} testId="payout-method" />
          {tried && !method ? <span className={money.sub} data-tone="alert">Say how it was paid</span> : null}
        </div>
        <TextField label="Reference" value={reference} onChange={setReference} maxLength={60} helper="The bank’s or the cheque’s reference, so it can be matched later" />
        <TextField label="Note (optional)" value={note} onChange={setNote} maxLength={NOTE_MAX} helper="For the team" />
        <ProofField proof={proof} onProof={setProof} helper="A screenshot of the transfer, or the PayNow receipt" />
      </div>
    </Dialog>
  )
}

/** (simplify S-10 · F1 §6.9.3) The payee's details, read-only, each with its copy — so paying is one dialog, not a trip to Vendors and back. The
    read file's band in the bill dialog (`fin.readBand`), composed. Invented copy. (simplify round 2) Also a member's PayNow — a claim's Pay back
    here, and Pay {member} / Pay commission (books/commission-dialogs.tsx) — so every place the studio pays someone says where to. */
export function PayTo({ bank, onCopied, onFailed }: { bank: NonNullable<PayoutTarget['bank']>; onCopied: (what: string) => void; onFailed: () => void }) {
  const copy = (text: string, what: string) => { void copyText(text).then(() => onCopied(what), onFailed) }
  return (
    <div className={fin.readBand} data-testid="payout-bank">
      <Icon name="account_balance" size={20} weight={300} />
      <span className={fin.payTo}>
        <b>Pay to {bank.name}</b>
        {bank.accountNo ? (
          <span className={fin.payLine}>{[bank.bankName, bank.accountNo].filter(Boolean).join(' · ')}
            <Tooltip label="Copy the account number"><IconButton icon="content_copy" size={24} variant="bare" label="Copy the account number" onClick={() => copy(bank.accountNo!, 'Account number')} data-testid="payout-copy-account" /></Tooltip>
          </span>
        ) : null}
        {bank.payNow ? (
          <span className={fin.payLine}>PayNow {payNowShown(bank.payNow)}
            <Tooltip label="Copy the PayNow number"><IconButton icon="content_copy" size={24} variant="bare" label="Copy the PayNow number" onClick={() => copy(bank.payNow!, 'PayNow number')} data-testid="payout-copy-paynow" /></Tooltip>
          </span>
        ) : null}
      </span>
    </div>
  )
}
