'use client'

import { useState } from 'react'
import { Button } from '@/components/ds'
import { Dialog, FootStart } from '@/components/om/dialog'
import { DateField } from '@/components/om/date-field'
import { TextField } from '@/components/om/text-field'
import { Chips } from '@/components/om/chips'
import { inputDate, parseInputDate } from '@/lib/format'
import { money2 } from '@/lib/quotes/math'
import { NOTE_MAX, PAY_OUT_METHODS } from '@/lib/finance/model'
import { COMMISSION_BASES, MAX_RATE_BP, ruleWords, splitOldestFirst, validRule, type CommissionBasis } from '@/lib/finance/commission'
import { useSnackbar } from '@/components/om/snackbar'
import { PayTo } from '../payout-dialog'   // (simplify round 2 · F1 §6.9.3) the member's PayNow, with its copy — the pay dialogs' one band
import money from '@/components/projects/money/money.module.css'
import b from './books.module.css'

/*
 * (gaps build F2 — F2-Q4…Q7) Commission's dialogs on the house Dialog and fields: Pay commission (what is owed, to start — never more), a rule
 * (how it is worked out · the rate or the amount), a member's ask for another rate (and the answer to it), and a project's shares between its team
 * (always 100%). Each host saves and closes it once the save lands.
 */

/* ── Pay commission (F2-Q6) ────────────────────────────────────────────────────────────────────────────────────────────────────── */
export type PayTarget = { memberId: string; member: string; projectId: string; project: string; owedMinor: number
  /** (simplify round 2) the member's PayNow (Company › Members), handed in only to whoever pays; null when none is on record */ payNow?: string | null }
/** (simplify round 2 · F1 §6.9.3) "Pay to {member} · PayNow 9123 4567 [copy]" above the amount, when they gave one. */
function MemberPayTo({ name, payNow }: { name: string; payNow: string | null | undefined }) {
  const snackbar = useSnackbar()
  if (!payNow) return null
  return <PayTo bank={{ name: name === 'You' ? 'yourself' : name, bankName: null, accountNo: null, payNow }} onCopied={(what) => snackbar({ message: `${what} copied` })} onFailed={() => snackbar({ message: 'Couldn’t copy it' })} />
}
export function PayCommissionDialog({ open, target, busy, onClose, onSave }: {
  open: boolean; target: PayTarget | null; busy: boolean; onClose: () => void
  onSave: (o: { amountMinor: number; paidOn: number; method: string; reference: string; note: string }) => void
}) {
  const [today] = useState(() => new Date())
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(inputDate(today))
  const [method, setMethod] = useState<string | null>('bank_transfer')
  const [reference, setReference] = useState('')
  const [note, setNote] = useState('')
  const [tried, setTried] = useState(false)
  const [wasOpen, setWasOpen] = useState(false)
  if (open !== wasOpen) { setWasOpen(open); if (open) { setAmount(((target?.owedMinor ?? 0) / 100).toFixed(2)); setDate(inputDate(today)); setMethod('bank_transfer'); setReference(''); setNote(''); setTried(false) } }
  const owed = target?.owedMinor ?? 0
  const minor = Math.round(Number(amount.replace(/,/g, '')) * 100)
  const amountWhy = amount.trim() === '' || !(minor > 0) ? 'Enter the amount paid' : minor > owed ? `No more than the ${money2(owed)} owed` : undefined
  const day = parseInputDate(date)
  const dayWhy = !day ? 'Pick the day it was paid' : day.getTime() > today.getTime() ? 'Today or before' : undefined
  const save = () => { setTried(true); if (amountWhy || dayWhy || !method || !day) return; onSave({ amountMinor: minor, paidOn: day.getTime(), method, reference: reference.trim(), note: note.trim() }) }
  return (
    <Dialog open={open} onClose={onClose} title="Pay commission" size="form" width={600}
            subtitle={target ? `${target.member} · ${target.project} — ${money2(owed)} owed.` : undefined}
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose} isDisabled={busy}>Cancel</Button><Button onPress={save} isDisabled={busy} data-testid="commission-pay-save">{busy ? 'Recording…' : 'Record the payment'}</Button></>}>
      <div className={money.fields} data-testid="commission-pay-dialog">
        <MemberPayTo name={target?.member ?? ''} payNow={target?.payNow} />
        <div className={money.pairs}>
          <TextField label="Amount paid (S$)" value={amount} numeric="money" onChange={setAmount} required autoFocus error={tried ? amountWhy : undefined} />
          <DateField label="Paid on" value={date} onChange={setDate} today={today} max={today} required error={tried ? dayWhy : undefined} />
        </div>
        <div>
          <span className={money.fieldLabel}>How it was paid</span>
          <Chips label="How it was paid" options={PAY_OUT_METHODS} value={method} onChange={(v) => setMethod(v)} testId="commission-pay-method" />
        </div>
        <TextField label="Reference" value={reference} onChange={setReference} maxLength={60} helper="The bank’s reference, so it can be matched later" />
        <TextField label="Note (optional)" value={note} onChange={setNote} maxLength={NOTE_MAX} helper={`${target?.member.split(' ')[0] ?? 'They'} read it with the payment`} />
      </div>
    </Dialog>
  )
}

/* ── Pay {member} (simplify S-12) ──────────────────────────────────────────────────────────────────────────────────────────────── */
/** A member and what they are owed on each project, oldest first (`owedOldestFirst`). */
export type PayMemberTarget = { memberId: string; member: string; lines: { projectId: string; project: string; owedMinor: number }[]
  /** (simplify round 2) the member's PayNow, as PayTarget's */ payNow?: string | null }
/**
 * (simplify S-12, his "build everything" 2026-10-09) Pay a member everything they are owed — or part of it — in one dialog: the amount (all of
 * it, to start) pays their projects oldest first, one payment per project, and the dialog says which before it is recorded. Pay commission's
 * fields (the day, how, the reference, a note) — the same dialog grammar. Invented copy.
 */
export function PayMemberDialog({ open, target, busy, onClose, onSave }: {
  open: boolean; target: PayMemberTarget | null; busy: boolean; onClose: () => void
  onSave: (o: { amountMinor: number; paidOn: number; method: string; reference: string; note: string }) => void
}) {
  const [today] = useState(() => new Date())
  const owed = (target?.lines ?? []).reduce((x, l) => x + l.owedMinor, 0)
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(inputDate(today))
  const [method, setMethod] = useState<string | null>('bank_transfer')
  const [reference, setReference] = useState('')
  const [note, setNote] = useState('')
  const [tried, setTried] = useState(false)
  const [wasOpen, setWasOpen] = useState(false)
  if (open !== wasOpen) { setWasOpen(open); if (open) { setAmount((owed / 100).toFixed(2)); setDate(inputDate(today)); setMethod('bank_transfer'); setReference(''); setNote(''); setTried(false) } }
  const minor = Math.round(Number(amount.replace(/,/g, '')) * 100)
  const amountWhy = amount.trim() === '' || !(minor > 0) ? 'Enter the amount paid' : minor > owed ? `No more than the ${money2(owed)} owed` : undefined
  const day = parseInputDate(date)
  const dayWhy = !day ? 'Pick the day it was paid' : day.getTime() > today.getTime() ? 'Today or before' : undefined
  const parts = splitOldestFirst(target?.lines ?? [], amountWhy ? 0 : minor)
  const firstName = target?.member.split(' ')[0] ?? 'They'
  const save = () => { setTried(true); if (amountWhy || dayWhy || !method || !day) return; onSave({ amountMinor: minor, paidOn: day.getTime(), method, reference: reference.trim(), note: note.trim() }) }
  return (
    <Dialog open={open} onClose={onClose} title={`Pay ${firstName}`} size="form" width={600}
            subtitle={target ? `${target.member} is owed ${money2(owed)} on ${target.lines.length} project${target.lines.length === 1 ? '' : 's'} — it is paid oldest first, one payment per project.` : undefined}
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose} isDisabled={busy}>Cancel</Button><Button onPress={save} isDisabled={busy} data-testid="commission-pay-member-save">{busy ? 'Recording…' : 'Record the payment'}</Button></>}>
      <div className={money.fields} data-testid="commission-pay-member-dialog">
        <MemberPayTo name={target?.member ?? ''} payNow={target?.payNow} />
        <div className={money.pairs}>
          <TextField label="Amount paid (S$)" value={amount} numeric="money" onChange={setAmount} required autoFocus error={tried ? amountWhy : undefined} />
          <DateField label="Paid on" value={date} onChange={setDate} today={today} max={today} required error={tried ? dayWhy : undefined} />
        </div>
        {parts.length ? (
          <ul className={b.payParts} data-testid="commission-pay-member-parts">
            {parts.map((x) => <li key={x.line.projectId}><span>{x.line.project}</span><span className={b.num}>{money2(x.amountMinor)}{x.amountMinor < x.line.owedMinor ? ` of ${money2(x.line.owedMinor)}` : ''}</span></li>)}
          </ul>
        ) : null}
        <div>
          <span className={money.fieldLabel}>How it was paid</span>
          <Chips label="How it was paid" options={PAY_OUT_METHODS} value={method} onChange={(v) => setMethod(v)} testId="commission-pay-member-method" />
        </div>
        <TextField label="Reference" value={reference} onChange={setReference} maxLength={60} helper="The bank’s reference, so it can be matched later" />
        <TextField label="Note (optional)" value={note} onChange={setNote} maxLength={NOTE_MAX} helper={`${firstName} reads it with the payment`} />
      </div>
    </Dialog>
  )
}

/* ── A rule: how commission is worked out (F2-Q4), and a member's ask (F2-Q7) ──────────────────────────────────────────────────── */
export type RuleDraft = { basis: CommissionBasis; rateBp: number; fixedMinor: number }
const pctText = (bp: number) => (bp ? String(bp / 100) : '')
export function RuleDialog({ open, title, subtitle, initial, allowNone, ask, approve, busy, onClose, onSave, saveLabel, testId = 'commission-rule-dialog', subject, subjectWhy }: {
  open: boolean; title: string; subtitle?: string; initial: RuleDraft | null; allowNone: boolean
  /** A member's ask: the reason is required (the Owner reads it). */ ask?: boolean
  /** Answering an ask: the note is optional, the rate may change. */ approve?: boolean
  busy: boolean; onClose: () => void; onSave: (o: RuleDraft & { reason: string }) => void; saveLabel: string; testId?: string
  /** Settings' Add a rate: who or what it is for (a house select), above the rule; `subjectWhy` holds the save until it is picked. */ subject?: React.ReactNode; subjectWhy?: string | null
}) {
  const [basis, setBasis] = useState<CommissionBasis>('payments')
  const [rate, setRate] = useState('')
  const [fixed, setFixed] = useState('')
  const [reason, setReason] = useState('')
  const [tried, setTried] = useState(false)
  const [wasOpen, setWasOpen] = useState(false)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) { const i = initial ?? { basis: allowNone ? 'none' : 'payments', rateBp: 0, fixedMinor: 0 }; setBasis(i.basis); setRate(pctText(i.rateBp)); setFixed(i.fixedMinor ? (i.fixedMinor / 100).toFixed(2) : ''); setReason(''); setTried(false) }
  }
  const rateBp = Math.round(Number(rate.replace(/,/g, '')) * 100)
  const fixedMinor = Math.round(Number(fixed.replace(/,/g, '')) * 100)
  const draft: RuleDraft = { basis, rateBp: Number.isFinite(rateBp) ? rateBp : 0, fixedMinor: Number.isFinite(fixedMinor) ? fixedMinor : 0 }
  const why = validRule(draft)
  const reasonWhy = ask && !reason.trim() ? 'Say why — the Owner reads it' : undefined
  const options = COMMISSION_BASES.filter((x) => allowNone || x.value !== 'none').map((x) => ({ value: x.value, label: x.label }))
  const save = () => { setTried(true); if (why || reasonWhy || subjectWhy) return; onSave({ ...draft, reason: reason.trim() }) }
  return (
    <Dialog open={open} onClose={onClose} title={title} subtitle={subtitle} size="form" width={600}
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose} isDisabled={busy}>Cancel</Button><Button onPress={save} isDisabled={busy} data-testid="commission-rule-save">{busy ? 'Saving…' : saveLabel}</Button></>}>
      <div className={money.fields} data-testid={testId}>
        {subject}
        <div>
          <span className={money.fieldLabel}>How it is worked out</span>
          <Chips label="How it is worked out" options={options} value={basis} onChange={(v) => setBasis(v as CommissionBasis)} testId="commission-basis" />
          <span className={money.sub}>{COMMISSION_BASES.find((x) => x.value === basis)?.help}</span>
        </div>
        {basis === 'payments' || basis === 'profit' ? (
          <TextField label="Rate (%)" value={rate} numeric="decimal" onChange={setRate} required autoFocus error={tried ? why ?? undefined : undefined} helper={`Up to ${MAX_RATE_BP / 100}% — before GST`} />
        ) : basis === 'fixed' ? (
          <TextField label="Amount per project (S$)" value={fixed} numeric="money" onChange={setFixed} required autoFocus error={tried ? why ?? undefined : undefined} helper="Earned once, with the project’s first payment" />
        ) : null}
        {ask || approve ? (
          <TextField label={ask ? 'Why' : 'Note (optional)'} value={reason} onChange={setReason} maxLength={300} required={!!ask} error={tried ? reasonWhy : undefined}
                     helper={ask ? 'An Owner or an Admin reads it with your ask' : 'They read it with the answer'} multiline={3} />
        ) : null}
        {basis !== 'none' && !why ? <span className={b.calm}>{ruleWords(draft)}{ask ? '' : ' — from today; earlier payments keep the rate they earned.'}</span> : null}
      </div>
    </Dialog>
  )
}

/* ── A project's shares between its team (F2-Q4) ──────────────────────────────────────────────────────────────────────────────── */
export function SharesDialog({ open, project, team, initial, busy, onClose, onSave }: {
  open: boolean; project: string; team: { id: string; name: string }[]; initial: Record<string, number>; busy: boolean; onClose: () => void
  onSave: (shares: { memberId: string; shareBp: number }[]) => void
}) {
  const [vals, setVals] = useState<Record<string, string>>({})
  const [tried, setTried] = useState(false)
  const [wasOpen, setWasOpen] = useState(false)
  if (open !== wasOpen) { setWasOpen(open); if (open) { setVals(Object.fromEntries(team.map((m) => [m.id, String((initial[m.id] ?? 0) / 100)]))); setTried(false) } }
  const bp = (id: string) => Math.round(Number((vals[id] ?? '').replace(/,/g, '')) * 100) || 0
  const total = team.reduce((s, m) => s + bp(m.id), 0)
  const why = total !== 10_000 ? `They add up to ${total / 100}% — make it 100%` : undefined
  const equal = () => { const each = Math.floor(10_000 / Math.max(1, team.length)); setVals(Object.fromEntries(team.map((m, i) => [m.id, String((i === team.length - 1 ? 10_000 - each * (team.length - 1) : each) / 100)]))) }
  const save = () => { setTried(true); if (why) return; onSave(team.map((m) => ({ memberId: m.id, shareBp: bp(m.id) }))) }
  return (
    <Dialog open={open} onClose={onClose} title="Commission shares" subtitle={`${project} — how the team splits all the commission the project earns.`} size="form" width={600}
            footer={<><FootStart><Button variant="secondary" appearance="text" onPress={equal} isDisabled={busy}>Equal shares</Button></FootStart><Button variant="secondary" appearance="outlined" onPress={onClose} isDisabled={busy}>Cancel</Button><Button onPress={save} isDisabled={busy} data-testid="commission-shares-save">{busy ? 'Saving…' : 'Save the shares'}</Button></>}>
      <div className={money.fields} data-testid="commission-shares-dialog">
        {team.map((m) => (
          <div key={m.id} className={b.share}>
            <span>{m.name}</span>
            <TextField label="Share (%)" value={vals[m.id] ?? ''} numeric="decimal" onChange={(v) => setVals((x) => ({ ...x, [m.id]: v }))} />
          </div>
        ))}
        <span className={money.sub} data-tone={tried && why ? 'alert' : undefined}>{why ?? 'They add up to 100%.'}</span>
      </div>
    </Dialog>
  )
}
