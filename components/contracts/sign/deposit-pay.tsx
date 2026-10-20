'use client'

import { Icon } from '@/components/om/icon'
import { PayBox } from '@/components/portal/money/pay-box'
import { money2 } from '@/lib/quotes/math'
import type { DepositView } from '@/lib/contracts/deposit-model'
import styles from './signing-page.module.css'

/**
 * (S44R — UAT row 358, call C7, as recommended — his UAT ask 2026-10-15) The signing page ends on "Pay the deposit" when the studio asked for
 * it on Send: the named quote's first payment stage, to the issuing entity — the money papers' own pay box (the PayNow QR with the amount and
 * the reference in it, Copy on each value, the bank). Paid in full on the project's invoice, it says so instead. (invented copy)
 */
export function DepositPay({ d }: { d: DepositView }) {
  if (d.paid) {
    return (
      <section className={styles.deposit} aria-label="The deposit" data-testid="deposit-paid">
        <p className={styles.gate} data-done=""><Icon name="check_circle" size={20} />Deposit received — thank you</p>
      </section>
    )
  }
  return (
    <section className={styles.deposit} aria-labelledby="deposit-title" data-testid="deposit-pay">
      <h3 id="deposit-title" className={styles.depositTitle}>Pay the deposit</h3>
      <p className={styles.cardText}>{d.stage} of quotation {d.quoteNumber}: <strong>{money2(d.amountMinor)}</strong>. {d.pay ? 'Scan the QR in your banking app, or pay to the details below.' : `${d.entity} will send you the payment details.`}</p>
      {d.pay ? <PayBox pay={d.pay} stage={{ number: d.reference, owedMinor: d.amountMinor }} /> : null}
      <p className={styles.fine}>{d.entity} confirms it once it arrives.</p>
    </section>
  )
}

/** The review step's one line: what comes after the signature, said before it. */
export const depositAhead = (d: DepositView) => `Once you sign, you’ll pay the ${money2(d.amountMinor)} deposit by PayNow.`
