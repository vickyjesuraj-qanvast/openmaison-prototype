import { displayDate } from '@/lib/format'
import { money2 } from '@/lib/quotes/math'
import { CREDIT_METHOD, methodLabel } from '@/lib/projects/payments-model'
import { DEFAULT_PAPER, extrasIn, paperAccent, type InvoicePaperLayout, type PaperLetterhead } from '@/lib/projects/invoices-paper'
import { PaperFoot, PaperHead, accentProps } from './paper-chrome'   // (parity map, FB-103 · FB-101) region P-D
import styles from './invoice-paper.module.css'

export type ReceiptPaperData = {
  /** (parity map, FB-103) may carry the entity's extras — `PaperLetterhead` */
  letterhead: PaperLetterhead
  studioPhone: string
  studioEmail: string
  client: { name: string; phone: string }
  property: string | null
  project: { name: string; number: string }
  invoice: { number: string | null; stageName: string; pct: number
    /** (gaps build B) an invoice outside the stages (a one-off, a VO billed on its own, a recorded one) reads by its own name, never "n% of the contract" */
    kind?: string; outside?: boolean; fixed?: boolean }
  payment: { number: string; amountMinor: number; paidOn: number; method: string; reference: string | null; issuedAt: number; reversed: { reason: string; at: number | null } | null }
  /** As the receipt was issued: the invoice's total, what was paid of it to date (this payment included) and what was still owed. */
  figures: { invoiceTotal: number; paidToDate: number; outstanding: number }
  /** (gaps build B, item 14) the studio's paper — its notes, and whether the balance prints */
  layout?: InvoicePaperLayout | null
  /** (pending modules S07 — D-14) more came than the invoice owed: the extra, kept as the client's credit note */
  extra?: { number: string; amountMinor: number } | null
}

/**
 * (Projects round 6, F-12 — G-320's facts, on the invoice's own paper) A payment's receipt as a page: the issuing entity's letterhead (the
 * invoice's), the receipt's number and the day it was issued, who paid and for which project, the payment against its invoice — the amount,
 * how and when it was paid, its reference — then the invoice's total, paid to date and what is still owed (never below zero). A reversed
 * payment's receipt keeps its number and says Reversed, with why (F-18). The studio's page, its PDF (print) and the client's portal read this
 * one paper.
 */
export function ReceiptPaper({ d }: { d: ReceiptPaperData }) {
  const { letterhead: h, payment: p, invoice: i, figures: f } = d
  const L = d.layout ?? DEFAULT_PAPER   // (gaps build B, item 14)
  const x = extrasIn(h)   // (parity map, FB-103 · FB-101) region P-D — the entity's tagline, contacts, footer line and accent, when handed over
  return (
    <article className={styles.paper} data-testid="receipt-paper" {...accentProps(paperAccent(L, x))}>
      <PaperHead h={h} extras={x} fallback={{ phone: d.studioPhone, email: d.studioEmail }} />
      <div className={styles.body}>
        <div className={styles.top}>
          <div>
            <h1 className={styles.docTitle}>Receipt</h1>
            {p.reversed ? <span className={styles.stamp} data-tone="void" data-testid="receipt-reversed">Reversed — {p.reversed.reason}</span> : null}
          </div>
          <dl className={styles.facts}>
            <dt>Receipt no.</dt><dd data-testid="receipt-number">{p.number}</dd>
            <dt>Issued</dt><dd>{displayDate(new Date(p.issuedAt))}</dd>
            <dt>Invoice no.</dt><dd>{i.number ?? '—'}</dd>
          </dl>
        </div>
        <div className={styles.parties}>
          <div className={styles.party}>
            <span className={styles.eyebrow}>Received from</span>
            <strong>{d.client.name}</strong>
            {d.property ? <span>{d.property}</span> : null}
          </div>
          <div className={styles.party}>
            <span className={styles.eyebrow}>Project</span>
            <strong>{d.project.name}</strong>
            <span>{d.project.number}</span>
          </div>
        </div>
        <table className={styles.lines}>
          <thead><tr><th>Payment</th><th className={styles.amt}>Amount</th></tr></thead>
          <tbody>
            <tr>
              <td>
                {i.kind === 'variation' ? `Variation order ${i.stageName}` : i.outside || i.kind === 'one_off' || i.kind === 'external' ? i.stageName : i.fixed ? `${i.stageName} — a fixed fee` : `${i.stageName} — ${Number.isInteger(i.pct) ? i.pct : i.pct.toFixed(1)}% of the contract`}{i.number ? `, invoice ${i.number}` : ''}
                <span className={styles.lineSub}>
                  {/* (pending modules S07 — D-14) a payment taken from the client's credit names its credit note */}
                  {p.method === CREDIT_METHOD ? `Taken from your credit${p.reference ? ` — credit note ${p.reference}` : ''}, ${displayDate(new Date(p.paidOn))}`
                    : <>Paid {displayDate(new Date(p.paidOn))} by {methodLabel(p.method).toLowerCase()}{p.reference ? ` · reference ${p.reference}` : ''}</>}
                </span>
              </td>
              <td className={styles.amt} data-testid="receipt-amount">{money2(p.amountMinor)}</td>
            </tr>
            {d.extra ? (
              <tr data-testid="receipt-extra">
                <td>
                  Kept as your credit — credit note {d.extra.number}
                  <span className={styles.lineSub}>Paid beyond what {i.number ?? 'the invoice'} owed — it comes off a later invoice, or is refunded</span>
                </td>
                <td className={styles.amt}>{money2(d.extra.amountMinor)}</td>
              </tr>
            ) : null}
          </tbody>
        </table>
        {L.header ? <p className={styles.note} data-testid="receipt-header-note">{L.header}</p> : null}
        <dl className={styles.totals} data-testid="receipt-totals">
          <dt>Invoice total</dt><dd>{money2(f.invoiceTotal)}</dd>
          {L.showBalance ? <><dt>Paid to date</dt><dd>{money2(f.paidToDate)}</dd>
          <dt className={styles.grand}>Balance due</dt>   {/* (the calm UI build 2026-10-27, 3-03 · W-385) the client's word, as the invoice */}<dd className={styles.grand}>{money2(f.outstanding)}</dd></> : null}
        </dl>
        {L.footer ? <p className={styles.note} data-testid="receipt-footer-note">{L.footer}</p> : null}
        <p className={styles.payNote}>{p.reversed ? `This payment was reversed${p.reversed.at ? ` on ${displayDate(new Date(p.reversed.at))}` : ''} and no longer counts toward the invoice.` : d.extra ? `Thank you — ${h.name} received ${money2(p.amountMinor + d.extra.amountMinor)}.` : `Thank you — ${h.name} received this payment.`}</p>
      </div>
      <PaperFoot extras={x} />   {/* region P-D (parity map, FB-103) */}
      {/* (fix-D, F-11 · REG-963) a client's document carries the studio's name alone — no OpenMaison mark (the portal's rule; the PDF goes to
          the client too) */}
    </article>
  )
}
