import { displayDate } from '@/lib/format'
import { money2 } from '@/lib/quotes/math'
import { EXTERNAL_PO_WORDS, termsLabel } from '@/lib/finance/model'
import type { PoDoc } from '@/lib/finance/queries'
import styles from '@/components/projects/money/invoice-paper.module.css'
import own from './po-paper.module.css'
import { PaperFoot, PaperHead, accentProps } from '@/components/projects/money/paper-chrome'

/**
 * (gaps build F1 — F1-Q5 · Q9) A purchase order as a page — the invoice's paper (its stylesheet, the contract's A4, composed): the issuing
 * entity's letterhead, the PO's number and days, the vendor and where to deliver, the lines priced before GST, the totals and the advance,
 * the payment terms and the studio's note. The studio's page, its PDF (print) and the vendor's no-login link read this one page.
 * (parity map, FB-097 · MO-011 · MO-038) Settings › Finance › Costs › The purchase order paper adds what the studio writes: a header note under
 * the title, a terms block, an acceptance block for the vendor to sign (filled in once they accepted) and the issuing entity's bank (off by
 * default); "Invoice to" prints under the vendor when the PO names its own; a PO made elsewhere is stamped Recorded.
 */
export function PoPaper({ d }: { d: PoDoc }) {
  const { po, vendor: v, studio: h } = d
  const draft = po.status === 'draft'
  const L = d.paper
  const accepted = po.vendorAnswer === 'accepted' && po.vendorAnsweredAt && !po.external
  return (
    <article className={styles.paper} data-testid="po-paper" {...accentProps(h.extras?.accent)}>
      {/* (parity map, FB-103 — P-D's one head and foot for the money papers) the entity's letterhead, tagline, contacts and website */}
      <PaperHead h={h} extras={h.extras} fallback={{ phone: h.phone, email: h.email }} />
      <div className={styles.body}>
        <div className={styles.top}>
          <div>
            <h1 className={styles.docTitle}>Purchase order</h1>
            {po.status === 'cancelled' ? <span className={styles.stamp} data-tone="void">Cancelled — {po.cancelReason}</span>
              : po.external ? <span className={styles.stamp} data-testid="po-recorded-stamp">{EXTERNAL_PO_WORDS}</span>
              : draft ? <span className={styles.stamp}>Draft — not sent yet</span>
                : po.status === 'closed' ? <span className={styles.stamp} data-tone="paid">Closed{po.closeNote ? '' : ' — paid in full'}</span>
                  : po.vendorAnswer === 'accepted' ? <span className={styles.stamp} data-tone="paid">Accepted{po.vendorAnsweredAt ? ` on ${displayDate(new Date(po.vendorAnsweredAt))}` : ''}</span> : null}
          </div>
          <dl className={styles.facts}>
            <dt>PO no.</dt><dd className={styles.nowrap} data-testid="po-number">{po.number}</dd>
            <dt>Issued</dt><dd>{po.sentAt ? displayDate(new Date(po.sentAt)) : '—'}</dd>
            {po.expectedOn ? <><dt>Delivery</dt><dd>{displayDate(new Date(po.expectedOn))}</dd></> : null}
            {po.dueOn ? <><dt>Payment by</dt><dd>{displayDate(new Date(po.dueOn))}</dd></> : null}
          </dl>
        </div>
        {/* (parity map, FB-097) the studio's header note — under the title, before the parties */}
        {L.header ? <p className={styles.note} data-testid="po-header-note">{L.header}</p> : null}
        <div className={styles.parties}>
          <div className={styles.party}>
            <span className={styles.eyebrow}>To</span>
            <strong>{v.name}</strong>
            {v.contactName ? <span>Attn: {v.contactName}</span> : null}
            {v.uen ? <span>UEN {v.uen}</span> : null}
            {/* (parity map, MO-011 — 1.0's "Invoice to") where the vendor sends its invoice, when the PO names its own */}
            {po.billTo ? <span className={own.billTo} data-testid="po-paper-bill-to"><span className={styles.eyebrow}>Invoice to</span><span className={own.billToText}>{po.billTo}</span></span> : null}
          </div>
          <div className={styles.party}>
            <span className={styles.eyebrow}>Deliver to</span>
            <strong>{d.project.address ?? d.project.name}</strong>
            <span>{d.project.number}{po.title ? ` · ${po.title}` : ''}</span>
          </div>
        </div>
        <table className={styles.lines}>
          <thead><tr><th>Description</th><th className={styles.amt}>Amount</th></tr></thead>
          <tbody>
            {po.lines.map((l) => (
              <tr key={l.id} data-testid="po-paper-line">
                <td>{l.description}<span className={styles.lineSub}>{l.qty}{l.unit ? ` ${l.unit}` : ''} × {money2(l.unitMinor)}{l.category ? ` · ${l.category}` : ''}</span></td>
                <td className={styles.amt}>{money2(l.amountMinor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <dl className={styles.totals} data-testid="po-paper-totals">
          <dt>Subtotal</dt><dd>{money2(po.subtotalMinor)}</dd>
          {po.gstMinor ? <><dt>GST ({po.gstRate}%)</dt><dd>{money2(po.gstMinor)}</dd></> : null}
          <dt className={styles.grand}>Total</dt><dd className={styles.grand}>{money2(po.totalMinor)}</dd>
          {po.advanceMinor ? <><dt>Advance, paid first</dt><dd>{money2(po.advanceMinor)}</dd></> : null}
          {d.paidMinor ? <><dt>Paid so far</dt><dd>{money2(d.paidMinor)}</dd></> : null}
        </dl>
        <section className={styles.noteBlock} aria-label="Payment">
          <span className={styles.eyebrow}>Payment</span>
          <p className={styles.note}>{termsLabel(po.terms, po.termsText)}{po.dueOn ? ` — by ${displayDate(new Date(po.dueOn))}` : ''}. Please quote {po.number} on your invoice.</p>
        </section>
        {po.vendorNote ? <section className={styles.noteBlock} aria-label="Note" data-testid="po-paper-note"><span className={styles.eyebrow}>Note</span><p className={styles.note}>{po.vendorNote}</p></section> : null}
        {/* (parity map, FB-097) the issuing entity's bank — off by default (vendors bill the studio, 1.0's default) */}
        {d.bank ? (
          <section className={styles.noteBlock} aria-label="Bank details" data-testid="po-paper-bank">
            <span className={styles.eyebrow}>Bank details</span>
            <dl className={own.bank}>
              <dt>Account name</dt><dd>{d.bank.name}</dd>
              {d.bank.bankName ? <><dt>Bank</dt><dd>{d.bank.bankName}</dd></> : null}
              {d.bank.accountNo ? <><dt>Account no.</dt><dd>{d.bank.accountNo}</dd></> : null}
              {d.bank.branch ? <><dt>Branch code</dt><dd>{d.bank.branch}</dd></> : null}
              {d.bank.swift ? <><dt>SWIFT</dt><dd>{d.bank.swift}</dd></> : null}
              {d.bank.payNow ? <><dt>PayNow</dt><dd>{d.bank.payNow}</dd></> : null}
            </dl>
          </section>
        ) : null}
        {/* (FB-097) the studio's terms block */}
        {L.terms ? <section className={styles.noteBlock} aria-label="Terms" data-testid="po-paper-terms"><span className={styles.eyebrow}>Terms</span><p className={styles.note}>{L.terms}</p></section> : null}
        {/* (FB-097 — 1.0's "acceptance terms", on POs by its default) the vendor's acceptance: signed on paper, or filled in once they accepted */}
        {L.acceptance && !po.external ? (
          <section className={own.accept} aria-label="Acceptance" data-testid="po-paper-acceptance">
            <span className={styles.eyebrow}>Accepted by {v.name}</span>
            <p className={own.acceptText}>{accepted ? `Accepted ${po.answerVia === 'link' || !po.answerVia ? 'on its link' : 'and recorded by the studio'} on ${displayDate(new Date(po.vendorAnsweredAt!))}.` : `We accept purchase order ${po.number} and its terms.`}</p>
            {accepted ? null : (
              <div className={own.signs}>
                <span className={own.sign}><span className={own.line} /><span className={own.signLabel}>Name</span></span>
                <span className={own.sign}><span className={own.line} /><span className={own.signLabel}>Signature</span></span>
                <span className={own.sign}><span className={own.line} /><span className={own.signLabel}>Date</span></span>
              </div>
            )}
          </section>
        ) : null}
      </div>
      <PaperFoot extras={h.extras} />
    </article>
  )
}
