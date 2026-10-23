'use client'

import { useState } from 'react'
import { Checkbox } from '@/components/ds'
import { useSnackbar } from '@/components/om/snackbar'
import { setContractDeposit } from '@/app/contracts/actions'
import { depositWhy, type DepositOption } from '@/lib/contracts/deposit-model'
import { firstName } from '@/lib/contracts/model'
import { money2 } from '@/lib/quotes/math'
import tick from '@/components/projects/schedule/moment.module.css'

/**
 * (S44R — UAT row 358, call C7, as recommended — his UAT ask 2026-10-15) Send for digital signature's *Ask for the deposit* — one row for the
 * editor's Send and Preview's: the house tick (the Hand over sheet's Tell row), what the client will be asked for under it — or why it can't be
 * asked for, in the row (never a silent greyed tick). Saved as it is ticked; a refusal puts it back and says why. (invented copy)
 */
export function DepositAsk({ contractId, option, on, onChange, recipient, beforeSave, helpClassName }: {
  contractId: string
  /** the named quote's deposit, or null when no quote is named */ option: DepositOption | null
  on: boolean; onChange: (on: boolean) => void
  recipient: string
  /** the editor's pending autosave goes first (the quote it names may have just changed) */ beforeSave?: () => Promise<void>
  /** (contracts on the move, B-17) the host's class on the help line — the send sheet reads it at 14 on a phone */ helpClassName?: string
}) {
  const snackbar = useSnackbar()
  const [busy, setBusy] = useState(false)
  const why = !option ? depositWhy.noQuote : option.why
  const toggle = (next: boolean) => {
    if (busy) return
    onChange(next); setBusy(true)
    void (beforeSave ? beforeSave() : Promise.resolve()).then(() => setContractDeposit(contractId, { on: next })).then((r) => {
      if ('error' in r) { onChange(!next); snackbar({ message: `Couldn’t change the deposit — ${r.error.charAt(0).toLowerCase()}${r.error.slice(1)}` }) }
    }, () => { onChange(!next); snackbar({ message: 'Couldn’t change the deposit — please try again' }) }).finally(() => setBusy(false))
  }
  return (
    <div className={tick.tick} data-testid="send-deposit">
      <Checkbox isSelected={on && !why} isDisabled={!!why || busy} onChange={toggle}>Ask for the deposit</Checkbox>
      <span className={helpClassName ? `${tick.help} ${helpClassName}` : tick.help} data-testid="send-deposit-help">{why ?? `Once ${firstName(recipient)} signs, the page asks for ${money2(option!.amountMinor)} — ${option!.stage} of ${option!.quoteNumber} — by PayNow to ${option!.entity}.`}</span>
    </div>
  )
}
