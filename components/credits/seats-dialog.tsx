'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { Icon } from '@/components/om/icon'
import { useSnackbar } from '@/components/om/snackbar'
import { changeSeats } from '@/app/credits/actions'
import { dayMonth, fmtCredits, type CreditSummary } from '@/lib/credits/model'
import { allowanceFor, daysLeftIn, planRow, priceFor, proratedByDays, sgd, sgd2, type BillingCycle } from '@/lib/credits/plans'
import { CountStepper } from './count-stepper'
import { refreshCredits } from './credits-client'
import styles from './credit-dialogs.module.css'


/**
 * (pending modules S19 — 1.0's Add-a-seat dialog and POST /api/billing/seats, 2026-10-01) Change seats on Pro — Studio, the Owner's: the
 * stepper starts on the seats the plan has and never goes under the members who use the AI tools (Accounting takes none, REG-1669) or the
 * plan's three. More seats start today and are billed for what is left of the period — the amount is said before the press; fewer wait
 * for the billing date and nothing is refunded. The month's AI credits stay as they are; the next month's follow the seats. The press
 * closes the dialog once the change lands; a change for the billing date can be taken back (Undo). In the prototype no card is charged.
 */
export function SeatsDialog({ open, onClose, summary, nested = false }: { open: boolean; onClose: () => void; summary: CreditSummary; /** opened over another dialog (Add member) */ nested?: boolean }) {
  const router = useRouter()
  const snackbar = useSnackbar()
  const s = summary
  const plan = planRow(s.planId)
  const current = s.seats
  const floor = Math.max(plan.minSeats, s.activeMembers)
  const [seats, setSeats] = useState(current)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) { setWasOpen(open); if (open) { setSeats(Math.max(floor, s.scheduledSeats ?? current)); setError(null) } }
  const cycle = s.billingCycle as BillingCycle
  const price = priceFor(plan, seats, cycle)
  const per = cycle === 'yearly' ? 'a year' : 'a month'
  const more = seats - current
  const today = more > 0 ? proratedByDays(price - priceFor(plan, current, cycle), s.billingFrom, s.billingTo, s.now) : 0
  const daysLeft = daysLeftIn(s.billingTo, s.now)
  const waiting = s.scheduledSeats != null && s.scheduledSeats !== current
  const save = () => start(async () => {
    setError(null)
    const r = await changeSeats({ seats })
    if ('error' in r) { setError(r.error); return }
    void refreshCredits(); router.refresh(); onClose()
    if (r.effective === 'now') snackbar({ message: `${r.seats - current} ${r.seats - current === 1 ? 'seat' : 'seats'} added — ${r.seats} seats on ${plan.name}` })
    else if (r.effective === 'renewal') snackbar({ message: `From ${dayMonth(r.on)} the studio has ${r.seats} seats`, actionLabel: 'Undo', onAction: () => { void changeSeats({ seats: current }).then((u) => { if ('error' in u) snackbar({ message: u.error }); else { void refreshCredits(); router.refresh(); snackbar({ message: `The studio keeps its ${current} seats` }) } }) } })
    else snackbar({ message: `The studio keeps its ${current} seats` })
  })
  const label = more > 0 ? `Pay ${sgd2(today)} and add ${more === 1 ? 'a seat' : `${more} seats`}` : more < 0 ? `Change to ${seats} seats from ${dayMonth(s.billingTo)}` : waiting ? `Keep ${current} seats` : 'Done'
  return (
    <Dialog open={open} onClose={onClose} title="Change seats" size="modal" width={440} nested={nested} portal={nested}
            footer={<div className={styles.foot}><Button variant="secondary" appearance="outlined" onPress={onClose} isDisabled={pending}>Cancel</Button><Button onPress={more === 0 && !waiting ? onClose : save} isDisabled={pending} data-testid="seats-save">{pending ? 'Saving…' : label}</Button></div>}>
      <div className={styles.block} data-testid="seats-dialog">
        <p className={styles.p}>{plan.name} · <b>{current} seats</b> now · {s.activeMembers} {s.activeMembers === 1 ? 'member uses' : 'members use'} the AI tools</p>
        <div className={styles.amountRow}>
          <CountStepper value={seats} min={floor} max={200} onChange={(n) => { setSeats(n); setError(null) }} less="Fewer seats" more="More seats" testId="seats-count" />
          <span className={styles.muted}>{sgd(price)} {per} · S$100 covers 3, then S$35 a seat</span>
        </div>
        {more > 0 ? (
          <p className={styles.meta} data-testid="seats-line">Today {sgd2(today)} for the {daysLeft} {daysLeft === 1 ? 'day' : 'days'} left of this period, then {sgd(price)} {per} from {dayMonth(s.billingTo)}. This month’s AI credits stay as they are; from {dayMonth(s.periodEnd)} the month is {fmtCredits(allowanceFor(plan, seats))}.</p>
        ) : more < 0 ? (
          <p className={styles.meta} data-testid="seats-line">{seats} seats from {dayMonth(s.billingTo)}, the billing date — {sgd(price)} {per}. Until then nothing changes, and nothing is refunded.</p>
        ) : waiting ? (
          <p className={styles.meta} data-testid="seats-line">{s.scheduledSeats} seats are set for {dayMonth(s.billingTo)}. Keep {current} to call that off.</p>
        ) : (
          <p className={styles.meta} data-testid="seats-line">These are the seats you have. Every member who uses the AI tools needs one; Accounting takes none.</p>
        )}
        {seats === floor && floor > plan.minSeats ? <p className={styles.meta}>No fewer than {floor} — one for each member who uses the AI tools.</p> : null}
        <p className={styles.demo}><Icon name="info" size={18} weight={300} /><span>This is the prototype, so no card is charged. In the live app the card on file pays for added seats.</span></p>
        {error ? <p className={styles.error} role="alert">{error}</p> : null}
      </div>
    </Dialog>
  )
}
