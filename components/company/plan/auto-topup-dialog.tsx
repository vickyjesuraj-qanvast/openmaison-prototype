'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { Icon } from '@/components/om/icon'
import { TextField } from '@/components/om/text-field'
import { setAutoTopUp } from '@/app/credits/actions'
import { AUTO_BELOW, AUTO_TIMES, autoLine, autoTimes, type AutoTopUp } from '@/lib/credits/auto-topup'
import { fmtCredits } from '@/lib/credits/model'
import { sgd, TOPUP_PICKS, topupPrice } from '@/lib/credits/plans'
import styles from '@/components/credits/credit-dialogs.module.css'

const belowWords = (n: number) => `${fmtCredits(n)} AI credits`
const addWords = (n: number) => `${fmtCredits(n)} AI credits · ${sgd(topupPrice(n))}`
const timesWords = (times: number, credits: number) => `${times === 1 ? 'Once' : times === 2 ? 'Twice' : `${times} times`} a month · up to ${sgd(times * topupPrice(credits))}`

/**
 * (pending modules S19 — card held:ai-credits "Auto top-up with a monthly ceiling", Q-36 as recommended) The Owner's auto top-up, set in
 * three plain choices — when (the line), how many each time (the top-up's own amounts), and how often a month at most (the ceiling, said in
 * S$). The sentence under them is what will happen, live. Turning it on is this dialog's one press; it closes once the setting lands. It
 * says plainly what the prototype does: the top-up goes through the demo checkout, so no card is charged.
 */
export function AutoTopUpDialog({ open, value, balance, onClose, onSaved }: {
  open: boolean
  value: AutoTopUp
  /** The studio's AI credits now — said when it is already under the line. */
  balance: number
  onClose: () => void
  onSaved: (next: AutoTopUp, previous: AutoTopUp) => void
}) {
  const [draft, setDraft] = useState<AutoTopUp>({ ...value, on: true })
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) { setWasOpen(open); if (open) { setDraft({ ...value, on: true }); setError(null) } }
  const times = autoTimes(draft)
  const save = () => start(async () => {
    setError(null)
    const r = await setAutoTopUp(draft)
    if ('error' in r) { setError(r.error); return }
    onSaved(draft, r.previous)
  })
  const credits = [...TOPUP_PICKS] as number[]
  return (
    <Dialog open={open} onClose={onClose} title={value.on ? 'Change auto top-up' : 'Turn on auto top-up'} size="modal" width={440}
            footer={<div className={styles.foot}><Button variant="secondary" appearance="outlined" onPress={onClose} isDisabled={pending}>Cancel</Button><Button onPress={save} isDisabled={pending} data-testid="auto-topup-save">{pending ? 'Saving…' : value.on ? 'Save' : 'Turn on auto top-up'}</Button></div>}>
      <div className={styles.form} data-testid="auto-topup-dialog">
        <TextField label="When AI credits fall under" mode="select" value={belowWords(draft.below)} options={AUTO_BELOW.map(belowWords)}
                   onChange={(v) => { const n = AUTO_BELOW.find((b) => belowWords(b) === v); if (n) setDraft({ ...draft, below: n }) }} />
        <TextField label="Add each time" mode="select" value={addWords(draft.credits)} options={credits.map(addWords)}
                   onChange={(v) => { const n = credits.find((c) => addWords(c) === v); if (n) setDraft({ ...draft, credits: n, ceiling: times * topupPrice(n) }) }} />
        <TextField label="At most" mode="select" value={timesWords(times, draft.credits)} options={AUTO_TIMES.map((t) => timesWords(t, draft.credits))}
                   onChange={(v) => { const t = AUTO_TIMES.find((x) => timesWords(x, draft.credits) === v); if (t) setDraft({ ...draft, ceiling: t * topupPrice(draft.credits) }) }} />
        <p className={styles.p} data-testid="auto-topup-line">{autoLine(draft)}.</p>
        {balance < draft.below ? <p className={styles.meta}>The studio has {fmtCredits(balance)} now — under the line, so the first top-up comes with the next AI charge.</p> : null}
        <p className={styles.meta}>Each top-up leaves a tax invoice and a receipt in your bell. Top-ups never expire.</p>
        <p className={styles.demo}><Icon name="info" size={18} weight={300} /><span>This is the prototype, so no card is charged — each top-up goes through the demo checkout. In the live app the card on file pays for it.</span></p>
        {error ? <p className={styles.error} role="alert">{error}</p> : null}
      </div>
    </Dialog>
  )
}
