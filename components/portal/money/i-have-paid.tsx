'use client'

import { useState } from 'react'
import { Button } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { DateField } from '@/components/om/date-field'
import { TextField } from '@/components/om/text-field'
import { Chips } from '@/components/om/chips'
import { ProofField, type PickedProof } from '@/components/projects/money/payments-dialogs'
import { inputDate, parseInputDate } from '@/lib/format'
import { useMediaQuery } from '@/lib/breakpoint'
import { money2 } from '@/lib/quotes/math'
import { CLIENT_METHODS, NOTE_MAX, REFERENCE_MAX, amountProblem, paidOnProblem } from '@/lib/projects/payments-model'
import type { PortalPayStage } from '@/lib/projects/payments-portal'
import styles from '@/components/projects/money/money.module.css'

/**
 * (Projects round 6 — board 4's "I have paid", Q-48; 1.0's Submit payment, I-299, its two "I paid" actions made one, I-315) The client says they
 * paid: how much (what is due, to start), the day, how (bank transfer or PayNow), the reference from their bank, the bank's confirmation (a
 * screenshot or a PDF — needed, so the studio can match it) and a note if they want. The house form sheet on a phone; it closes once the
 * studio has it.
 */
/** (parity map, FB-112 — P-D's `clientMethods`, from the live values a page hands over) The two ways a client pays from home that the studio
    takes today — absent values = both. May be empty: then the client pays in person and the studio records it. */
export const clientMethodsFrom = (live: readonly string[] | null | undefined) => (live ? CLIENT_METHODS.filter((m) => live.includes(m.value)) : [...CLIENT_METHODS])

export function IHavePaidDialog({ open, stage, studio, busy, today, methods, onClose, onSend }: {
  open: boolean
  stage: PortalPayStage | null
  studio: string
  busy: boolean
  today: Date
  /** (parity map, FB-112) the ways the studio takes today — the chips offer the live ones of Bank transfer · PayNow */
  methods?: string[]
  onClose: () => void
  onSend: (o: { amountMinor: number; paidOn: number; method: string; reference: string; note: string; proof: PickedProof }) => void
}) {
  const owed = stage?.owedMinor ?? 0
  const touch = useMediaQuery('(hover: none)')   // (fix-F, F-35) nothing is dropped on a touch screen
  const [amount, setAmount] = useState((owed / 100).toFixed(2))
  const [date, setDate] = useState(inputDate(today))
  const ways = clientMethodsFrom(methods)
  const first = ways[0]?.value ?? null
  const [method, setMethod] = useState<string | null>(first)
  const [reference, setReference] = useState('')
  const [note, setNote] = useState('')
  const [proof, setProof] = useState<PickedProof | null>(null)
  const [tried, setTried] = useState(false)
  const [seen, setSeen] = useState<string | null>(null)
  const id = open ? stage?.key ?? null : null
  if (id !== seen) { setSeen(id); if (id) { setAmount((owed / 100).toFixed(2)); setDate(inputDate(today)); setMethod(first); setReference(''); setNote(''); setProof(null); setTried(false) } }
  const minor = Math.round(Number(amount.replace(/,/g, '')) * 100)
  const amountWhy = amount.trim() === '' ? 'Enter the amount you paid' : amountProblem(minor, owed)
  const day = parseInputDate(date)
  const dayWhy = paidOnProblem(day, { sentAt: stage?.sentAt ?? null, now: today.getTime() })   // (fix-F, F-35) the server's own rule, shown before Send
  const send = () => {
    setTried(true)
    if (amountWhy || dayWhy || !day || !method || !proof) return
    onSend({ amountMinor: minor, paidOn: day.getTime(), method, reference: reference.trim(), note: note.trim(), proof })
  }
  return (
    <Dialog open={open} onClose={onClose} title="I have paid" size="form" width={600} closeOnScrim={false}
            subtitle={stage ? `Tell ${studio} about your payment for the ${stage.name.toLowerCase()} invoice${stage.number ? ` (${stage.number})` : ''} — ${money2(owed)} is due. They confirm it once it is in their bank, and you get a receipt.` : undefined}
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose} isDisabled={busy}>Cancel</Button><Button onPress={send} isDisabled={busy} data-testid="portal-paid-send">{busy ? 'Sending…' : 'Send'}</Button></>}>
      <div className={styles.fields} data-testid="portal-i-have-paid-form">
        <div className={styles.pairs}>
          <TextField label="Amount paid (S$)" value={amount} numeric="money" onChange={setAmount} required error={tried && amountWhy ? amountWhy : undefined} />
          <DateField label="Paid on" value={date} onChange={setDate} today={today} required error={tried && dayWhy ? dayWhy : undefined} />
        </div>
        <div>
          <span className={styles.fieldLabel}>How you paid</span>
          <Chips label="How you paid" options={ways.map((m) => ({ value: m.value, label: m.label }))} value={method} onChange={(v) => setMethod(v)} testId="portal-paid-method" />
        </div>
        <TextField label="Reference (optional)" value={reference} onChange={setReference} maxLength={REFERENCE_MAX} helper="From your bank’s confirmation" />
        <ProofField required proof={proof} onProof={setProof} error={tried && !proof ? 'Add your bank’s confirmation so the studio can match it' : undefined}
                    title={touch ? <>Add a screenshot or PDF</> : undefined}
                    helper="A screenshot of the transfer or the PayNow receipt — a picture or a PDF, under 6 MB" />
        <TextField label={`Note to ${studio} (optional)`} value={note} onChange={setNote} maxLength={NOTE_MAX} />
      </div>
    </Dialog>
  )
}
