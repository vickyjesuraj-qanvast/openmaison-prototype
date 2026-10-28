'use client'

import { useState, type ReactNode } from 'react'
import { Dialog } from '@/components/om/dialog'
import { Icon } from '@/components/om/icon'
import { displayDateLong } from '@/lib/format'
import type { DepositView } from '@/lib/contracts/deposit-model'
import { DepositPay } from './deposit-pay'
import { SigningRecord, type SigningRecordData } from './signing-record'
import ph from './sign-phone.module.css'

/**
 * (Contracts on the move, C3 — P-05 · A-24 · A-26) Where the phone lands after Sign — the card under the paper, beside the signature box:
 * ✓ Signed, who and when, then three rows: **Save a copy** (the share sheet — Q-06), **Pay the deposit** when the studio asked for it (the
 * PayNow box in its own sheet; paid, the row says so), **Signing record** (the record one tap away, in a sheet — not 3,800px down). A
 * signed link reopened lands here too. Hidden on the desk, which keeps the card and the record under the paper. *(invented copy: the rows)*
 */
export function SignedCard({ name, at, issuer, what, onSave, deposit, record, cardRef }: {
  name: string; at: Date; issuer: string
  /** "a copy" · "a copy of each" */ what: string
  onSave: () => void
  deposit: DepositView | null
  record: SigningRecordData | null
  cardRef?: (el: HTMLElement | null) => void
}) {
  const [open, setOpen] = useState<'deposit' | 'record' | null>(null)
  const row = (o: { icon: string; text: string; sub?: string | null; onPress?: () => void; done?: boolean; testId: string; trail?: ReactNode }) => (
    <button type="button" className={ph.row} onClick={o.onPress} disabled={!o.onPress} data-done={o.done || undefined} data-testid={o.testId}>
      <span className={ph.rowIcon} aria-hidden><Icon name={o.icon} size={24} /></span>
      <span className={ph.rowText}><span>{o.text}</span>{o.sub ? <span className={ph.rowSub}>{o.sub}</span> : null}</span>
      {o.onPress ? <span className={ph.rowChev} aria-hidden><Icon name="chevron_right" size={24} /></span> : null}
    </button>
  )
  return (
    <section ref={cardRef} className={ph.signedCard} aria-label="Signed" data-testid="signed-card">
      <h2 className={ph.signedHead}><span aria-hidden><Icon name="check_circle" size={28} /></span>Signed</h2>
      <p className={ph.signedText}>Signed by <strong>{name}</strong> on {displayDateLong(at)}. Both you and {issuer} keep {what}.</p>
      <div className={ph.rows}>
        {row({ icon: 'share', text: 'Download a copy', sub: 'This signed page, with its signing record', onPress: onSave, testId: 'save-copy' })}
        {deposit ? (deposit.paid
          ? row({ icon: 'check_circle', text: 'Deposit received — thank you', done: true, testId: 'deposit-row' })
          : row({ icon: 'payments', text: 'Pay the deposit', sub: `${deposit.stage} of quote ${deposit.quoteNumber}`, onPress: () => setOpen('deposit'), testId: 'deposit-row' })) : null}
        {record ? row({ icon: 'receipt_long', text: 'Signing record', sub: 'Who signed, how, and the text’s fingerprint', onPress: () => setOpen('record'), testId: 'signing-record-row' }) : null}
      </div>
      {deposit && !deposit.paid ? (
        <Dialog open={open === 'deposit'} onClose={() => setOpen(null)} title="Pay the deposit" size="form" width={400} portal>
          <DepositPay d={deposit} bare />
        </Dialog>
      ) : null}
      {record ? (
        <Dialog open={open === 'record'} onClose={() => setOpen(null)} title="Signing record" size="form" width={400} portal>
          <SigningRecord r={record} bare />
        </Dialog>
      ) : null}
    </section>
  )
}
