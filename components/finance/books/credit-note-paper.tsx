import { Fragment } from 'react'
import { displayDate } from '@/lib/format'
import { money2 } from '@/lib/quotes/math'
import { methodInLine } from '@/lib/finance/model'
import type { CreditNotePaperData } from '@/lib/finance/credit-paper'
import { extrasIn } from '@/lib/projects/invoices-paper'
import { PaperFoot, PaperHead, accentProps } from '@/components/projects/money/paper-chrome'   // (parity map, FB-103 · FB-101) the papers' one head and foot
import styles from '@/components/projects/money/invoice-paper.module.css'

/**
 * (gaps build F2 — F2-Q9; 1.0 G-335) A credit note as a page, on the invoice's own paper (as the receipt is): the issuing entity's letterhead, its
 * number and the day it was issued, the client and the project, the invoice it credits, the reason, the amount before GST, the GST at the
 * invoice's rate and the total; a void one keeps its number and says Void, with why; a refund recorded on it is its last line. The studio's
 * page, its PDF (print) and the client's portal read this one paper.
 */
export function CreditNotePaper({ d }: { d: CreditNotePaperData }) {
  const { letterhead: h, credit: c, invoice: i } = d
  const held = c.kind === 'overpayment'   // (pending modules S07)
  const x = extrasIn(h)   // (parity map, FB-103 · FB-101) the entity's tagline, contacts, footer line and accent, when the page hands them over
  return (
    <article className={styles.paper} data-testid="credit-note-paper" {...accentProps(x?.accent)}>
      <PaperHead h={h} extras={x} fallback={{ phone: d.studioPhone, email: d.studioEmail }} />
      <div className={styles.body}>
        <div className={styles.top}>
          <div>
            <h1 className={styles.docTitle}>Credit note</h1>
            {c.voided ? <span className={styles.stamp} data-tone="void" data-testid="credit-void">Void — {c.voided.reason}</span> : null}
          </div>
          <dl className={styles.facts}>
            <dt>Credit note no.</dt><dd data-testid="credit-number">{c.number}</dd>
            <dt>Issued</dt><dd>{displayDate(new Date(c.issuedAt))}</dd>
            <dt>Invoice no.</dt><dd>{i.number ?? '—'}</dd>
          </dl>
        </div>
        <div className={styles.parties}>
          <div className={styles.party}>
            <span className={styles.eyebrow}>Credited to</span>
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
          <thead><tr><th>Credit</th><th className={styles.amt}>Amount</th></tr></thead>
          <tbody>
            {held ? (
              /* (pending modules S07 — D-14) an overpayment: the client's money, held — no GST, it lowers no invoice */
              <tr data-testid="credit-overpayment">
                <td>
                  Overpayment — {c.reason.replace(/^./, (x) => x.toLowerCase())}
                  <span className={styles.lineSub}>Your money, held as credit — it comes off a later invoice, or is refunded</span>
                </td>
                <td className={styles.amt}>{money2(c.amountMinor)}</td>
              </tr>
            ) : (
              <tr>
                <td>
                  {c.reason}
                  <span className={styles.lineSub}>Against {i.number ?? 'the invoice'} · {i.stageName} ({money2(i.amountMinor)})</span>
                </td>
                <td className={styles.amt}>{money2(c.amountMinor - c.gstMinor)}</td>
              </tr>
            )}
          </tbody>
        </table>
        {held ? (
          <dl className={styles.totals} data-testid="credit-totals">
            <dt>Credit</dt><dd data-testid="credit-amount">{money2(c.amountMinor)}</dd>
            {(c.used ?? []).map((u) => <Fragment key={`${u.label}-${u.on}`}><dt>Used on {u.label}</dt><dd>−{money2(u.amountMinor)}</dd></Fragment>)}
            {c.refund ? <><dt>Refunded</dt><dd data-testid="credit-refund">−{money2(c.refund.amountMinor)}</dd></> : null}
            <dt className={styles.grand}>Left</dt><dd className={styles.grand} data-testid="credit-left">{money2(c.leftMinor ?? 0)}</dd>
          </dl>
        ) : <dl className={styles.totals} data-testid="credit-totals">
          <dt>Before GST</dt><dd>{money2(c.amountMinor - c.gstMinor)}</dd>
          {c.gstMinor ? <><dt>GST</dt><dd>{money2(c.gstMinor)}</dd></> : null}
          <dt className={styles.grand}>Credited</dt><dd className={styles.grand} data-testid="credit-amount">{money2(c.amountMinor)}</dd>
          {c.refund ? <><dt>Refunded</dt><dd data-testid="credit-refund">{money2(c.refund.amountMinor)}</dd></> : null}
        </dl>}
        <p className={styles.payNote}>
          {c.voided ? `This credit note was made void${c.voided.at ? ` on ${displayDate(new Date(c.voided.at))}` : ''} and no longer counts toward the invoice.`
            : held ? heldNote(c)
            : c.refund ? `${money2(c.refund.amountMinor)} was refunded${c.refund.on ? ` on ${displayDate(new Date(c.refund.on))}` : ''}${c.refund.method ? ` by ${methodInLine(c.refund.method)}` : ''}${c.refund.reference ? ` · reference ${c.refund.reference}` : ''}.`
              : `${money2(c.amountMinor)} comes off ${i.number ?? 'the invoice'}.`}
        </p>
      </div>
      <PaperFoot extras={x} />
    </article>
  )
}

/** (pending modules S07 — D-14) An overpayment's last line: what is left, where it went, its refund. *(invented copy)* */
function heldNote(c: CreditNotePaperData['credit']): string {
  const used = (c.used ?? []).map((u) => `${money2(u.amountMinor)} came off ${u.label}`)
  const refund = c.refund ? `${money2(c.refund.amountMinor)} was refunded${c.refund.on ? ` on ${displayDate(new Date(c.refund.on))}` : ''}${c.refund.method ? ` by ${methodInLine(c.refund.method)}` : ''}` : null
  const done = [...used, ...(refund ? [refund] : [])]
  const left = c.leftMinor ?? 0
  return left > 0 ? `${done.length ? `${done.join('; ')}. ` : ''}${money2(left)} of your credit is left — it comes off a later invoice, or is refunded.` : `${done.join('; ')}.`
}
