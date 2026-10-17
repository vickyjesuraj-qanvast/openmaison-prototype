'use client'

import { useState } from 'react'
import { Button } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { DateField } from '@/components/om/date-field'
import { TextField } from '@/components/om/text-field'
import { Chips } from '@/components/om/chips'
import { Icon } from '@/components/om/icon'
import { inputDate, parseInputDate } from '@/lib/format'
import { money2 } from '@/lib/quotes/math'
import { APPROVAL_VIA, VARIANCE_TOLERANCE_MINOR } from '@/lib/projects/money'
import styles from './money.module.css'

/**
 * (Projects round 5, F-07) Mark as approved by the client — the contracts' Mark as signed (components/contracts/editor/dialogs.tsx) for a
 * variation order the client approved outside its link: when, and how. The contract value moves and the unsent invoices follow.
 */
export function MarkApprovedDialog({ open, number, client, contractAfter, today, busy, onClose, onSave }: {
  open: boolean; number: string; client: string; contractAfter: number; today: Date; busy: boolean
  onClose: () => void; onSave: (o: { on: number; via: string }) => void
}) {
  const [date, setDate] = useState(inputDate(today))
  const [via, setVia] = useState<string | null>(null)
  const [tried, setTried] = useState(false)
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) { setWasOpen(open); if (open) { setDate(inputDate(today)); setVia(null); setTried(false) } }
  const d = parseInputDate(date)
  const save = () => { setTried(true); if (d && via) onSave({ on: d.getTime() + 12 * 3_600_000, via }) }
  return (
    <Dialog open={open} onClose={onClose} title="Mark as approved by the client" size="form" width={600}
            subtitle={`${client} approved ${number} in person or elsewhere? Record when and how — the contract becomes ${money2(contractAfter)} and the unsent invoices are re-sized.`}
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose} isDisabled={busy}>Cancel</Button><Button onPress={save} isDisabled={busy}>{busy ? 'Marking…' : 'Mark as approved'}</Button></>}>
      <div className={styles.fields} data-testid="mark-approved">
        <DateField label="Approved on" value={date} onChange={setDate} today={today} required error={tried && !d ? 'Pick the day' : undefined} />
        <div>
          <span className={styles.fieldLabel}>How they approved it</span>
          <Chips label="How they approved it" options={APPROVAL_VIA} value={via} onChange={(v) => setVia(v)} testId="approved-via" />
          {tried && !via ? <span className={styles.sub} data-tone="alert">Pick how they approved it</span> : null}
        </div>
      </div>
    </Dialog>
  )
}

/**
 * (F-09) Change a Draft's amount: the schedule's amount beside it; more than S$1 off asks why ("Differs from the schedule by S$x"); the
 * schedule's amount puts it back. (REG-1067) Saving re-sizes the other unsent invoices in the same press — the line says which take the
 * difference (`others`), or that none is left to.
 */
export function AmountDialog({ open, stage, amount, expected, reason, others, busy, onClose, onSave }: {
  open: boolean; stage: string; amount: number; expected: number | null; reason: string | null
  /** The other unsent invoices that follow the schedule — the ones a save re-sizes. */
  others: string[]
  busy: boolean
  onClose: () => void; onSave: (o: { amountMinor: number; reason: string | null }) => void
}) {
  const [value, setValue] = useState((amount / 100).toFixed(2))
  const [why, setWhy] = useState(reason ?? '')
  const [tried, setTried] = useState(false)
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) { setWasOpen(open); if (open) { setValue((amount / 100).toFixed(2)); setWhy(reason ?? ''); setTried(false) } }
  const minor = Math.round(Number(value.replace(/,/g, '')) * 100)
  const valid = value.trim() !== '' && Number.isFinite(minor) && minor >= 0
  const off = valid && expected !== null && Math.abs(minor - expected) > VARIANCE_TOLERANCE_MINOR
  const save = () => { setTried(true); if (!valid || (off && !why.trim())) return; onSave({ amountMinor: minor, reason: off ? why.trim() : null }) }
  return (
    <Dialog open={open} onClose={onClose} title={`Change the ${stage} invoice`} size="form" width={600}   /* (fix-D, D-22) the m size: three foot buttons and the title on one line */
            subtitle={expected !== null ? `By the schedule it bills ${money2(expected)}.` : undefined}
            footer={<>
              {expected !== null && minor !== expected ? <Button appearance="text" onPress={() => setValue((expected / 100).toFixed(2))} isDisabled={busy}>Use the schedule’s amount</Button> : null}
              <Button variant="secondary" appearance="outlined" onPress={onClose} isDisabled={busy}>Cancel</Button>
              <Button onPress={save} isDisabled={busy}>{busy ? 'Saving…' : 'Save'}</Button>
            </>}>
      <div className={styles.fields} data-testid="amount-dialog">
        <TextField label="Amount, GST included (S$)" value={value} numeric="money" onChange={setValue} required autoFocus error={tried && !valid ? 'Enter an amount' : undefined} />
        {off ? (
          <>
            <p className={styles.differs} data-testid="differs"><Icon name="info" size={20} weight={300} />Differs from the schedule by {money2(Math.abs(minor - (expected ?? 0)))}{minor > (expected ?? 0) ? ' more' : ' less'}. {others.length ? `Saving re-sizes ${others.length > 2 ? `${others.slice(0, -1).join(', ')} and ${others[others.length - 1]}` : others.join(' and ')} to take the difference.` : 'No other unsent invoice is left to take the difference.'}</p>
            <TextField label="Why it differs" value={why} onChange={setWhy} maxLength={300} required error={tried && !why.trim() ? 'Say why it differs' : undefined} helper="Kept on the invoice for the team — the client never sees it" />
          </>
        ) : null}
      </div>
    </Dialog>
  )
}
