import { displayDate, displayDateLong } from '@/lib/format'
import { money2 } from '@/lib/quotes/math'
import type { InvoiceView, MoneySummary } from '@/lib/projects/money'
import type { IssuingEntity } from '@/lib/templates/model'
import { lineAmount } from '@/lib/projects/invoices-kinds'
import { DEFAULT_PAPER, extrasIn, paperAccent, paperExtrasOf, type InvoicePaperLayout, type PaperLetterhead } from '@/lib/projects/invoices-paper'
import { payShowsFrom } from '@/lib/projects/payment-methods'
import { PayNowQr } from './payments-qr'
import { PaperFoot, PaperHead, accentProps } from './paper-chrome'   // (parity map, FB-103 · MI-065) region P-D
import styles from './invoice-paper.module.css'

export type InvoicePaperData = {
  invoice: InvoiceView
  money: Pick<MoneySummary, 'contractMinor' | 'baseMinor' | 'variationsMinor' | 'gstRate' | 'source'>
  /** (parity map, FB-103) the letterhead may carry its entity's extras (tagline, contacts, footer line, accent) — `PaperLetterhead` */
  letterhead: PaperLetterhead
  entity: IssuingEntity | null
  studioPhone: string
  studioEmail: string
  client: { name: string; phone: string }
  property: string | null
  project: { name: string; number: string }
  quoteNumber: string | null
  /** What the paper says while it is a Draft: when it would be due if it went today. */
  draftDue: number
  now: number
  /** (gaps build B, item 14) the studio's invoice paper — its notes, terms block and switches (the entity's own, else the studio's) */
  layout?: InvoicePaperLayout | null
  /* region P-D — (parity map, FB-112) the ways the studio takes money today (Settings › Finance › Client payments, `fetchLiveMethodValues`):
     How to pay shows the bank only while Bank transfer is on and PayNow (its ID and QR) only while PayNow is on. Absent = every way. */
  methods?: string[] | null
  /* end P-D */
}

/**
 * (Projects round 5, F-12 · F-15) The invoice as a page — on the issuing entity's letterhead (the quote's own, `docLetterhead`'s rule: another
 * entity's name, logo and registration numbers, the studio's address when it has none) on the contract's paper: the number, the day it was
 * issued and its due day, who it is for and the project, the stage's line with its share of the contract value, the GST split out of the
 * amount (F-03), and how to pay — the entity's bank and PayNow, its QR when the studio added one, the invoice number as the reference.
 * Preview, the PDF (print) and — round 6 — the client's portal read this one page.
 */
export function InvoicePaper({ d }: { d: InvoicePaperData }) {
  const { invoice: i, money: m, letterhead: h, entity: e } = d
  const L = d.layout ?? DEFAULT_PAPER   // (gaps build B, item 14)
  const kind = i.kind ?? 'stage'
  const itemised = kind === 'stage' && !!i.lines?.length   // region P-A (parity map, MI-031) a stage invoice's own lines
  const draft = i.status === 'draft'
  const voided = i.status === 'void'
  const taxInvoice = !!h.gstReg && i.gstMinor > 0
  /* region P-D — (parity map, FB-103 · FB-101 · FB-112) the entity's extras (the page's, else read off the entity it is raised under), the
     paper's accent, and which ways to pay it shows */
  const x = extrasIn(h) ?? (e ? paperExtrasOf(e, { phone: d.studioPhone, email: d.studioEmail, website: '', tagline: '' }, null, null) : null)
  const accent = paperAccent(L, x)
  const shows = payShowsFrom(d.methods)
  const bankOn = shows.bank && !!(e && (e.bankName || e.accountNo)), payNowOn = shows.payNow && !!e?.payNow
  const inPerson = !shows.bank && !shows.payNow ? (d.methods ?? []).filter((m) => m === 'cheque' || m === 'cash').join(' or ') : ''
  /* end P-D */
  const reference = i.number ?? 'the invoice number'
  const hasBank = L.showBank && (bankOn || payNowOn)   // (gaps build B, item 14) the paper may leave the bank out · (parity map, FB-112) and the ways switched off
  /* (fix-D, D-03) paid in full: a stamp says so (as Void and Draft do), the total is the total, and nothing asks to be paid */
  const paid = i.status === 'sent' && i.paidMinor > 0 && i.balanceMinor === 0
  /* (fix-D, D-02 · F-08) the contract it was raised on — stamped when it was sent; a Draft reads the contract as it stands today */
  const b = i.basis
  const exact = Math.abs(i.amountMinor - Math.round((b.contractMinor * i.pct) / 100)) <= 100
  return (
    <article className={styles.paper} data-testid="invoice-paper" {...accentProps(accent)}>
      <PaperHead h={h} extras={x} fallback={{ phone: d.studioPhone, email: d.studioEmail }} />   {/* region P-D (parity map, FB-103) */}
      <div className={styles.body}>
        <div className={styles.top}>
          <div>
            <h1 className={styles.docTitle}>{taxInvoice ? 'Tax invoice' : 'Invoice'}</h1>
            {kind === 'external' && !voided ? <span className={styles.stamp} data-testid="invoice-recorded-stamp">Recorded — made outside OpenMaison</span> : null}
            {voided ? <span className={styles.stamp} data-tone="void">Void — {i.voidReason}</span> : draft ? <span className={styles.stamp}>Draft — numbered when it is sent</span>
              : paid ? <span className={styles.stamp} data-tone="paid" data-testid="invoice-paid-stamp">Paid in full{i.paidOn ? ` on ${displayDate(new Date(i.paidOn))}` : ''} — thank you</span> : null}
          </div>
          <dl className={styles.facts}>
            <dt>Invoice no.</dt><dd data-testid="invoice-number" className={styles.nowrap}>{i.number ?? i.externalRef ?? '—'}</dd>
            <dt>Issued</dt><dd>{i.sentAt ? displayDate(new Date(i.sentAt)) : '—'}</dd>
            <dt>Due</dt><dd data-testid="invoice-due">{displayDate(new Date(i.dueAt ?? d.draftDue))}</dd>
          </dl>
        </div>
        <div className={styles.parties}>
          <div className={styles.party}>
            <span className={styles.eyebrow}>Bill to</span>
            <strong>{d.client.name}</strong>
            {d.property ? <span>{d.property}</span> : null}
          </div>
          <div className={styles.party}>
            <span className={styles.eyebrow}>Project</span>
            <strong>{d.project.name}</strong>
            <span>{d.project.number}{d.quoteNumber ? ` · signed quote ${d.quoteNumber}` : ''}</span>
          </div>
        </div>
        {/* (gaps build B, item 14) the studio's header note — a greeting, the scope */}
        {L.header ? <p className={styles.note} data-testid="invoice-header-note">{L.header}</p> : null}
        <table className={styles.lines}>
          <thead><tr><th>Description</th><th className={styles.amt}>Amount</th></tr></thead>
          <tbody>
            {kind === 'one_off' && i.lines?.length ? <>
              {/* (gaps build B, items 2 · 3) a one-off's own lines, priced before GST */}
              <tr><td colSpan={2} className={styles.lineHead}>{i.stageName}{i.description ? <span className={styles.lineSub}>{i.description}</span> : null}</td></tr>
              {i.lines.map((l) => (
                <tr key={l.id} data-testid="invoice-line">
                  <td>{l.description}<span className={styles.lineSub}>{l.qty} × {money2(l.unitMinor)}</span></td>
                  <td className={styles.amt}>{money2(lineAmount(l))}</td>
                </tr>
              ))}
            </> : (<>
              <tr>
                <td>
                  {kind === 'variation' ? `Variation order ${i.stageName}${i.description ? ` — ${i.description}` : ''}`
                    : kind === 'external' || i.outside ? i.stageName
                      : i.fixedMinor != null ? `${i.stageName} — a fixed fee`
                        : `${i.stageName} — ${exact ? `${Number.isInteger(i.pct) ? i.pct : i.pct.toFixed(1)}% of the contract value` : `the ${Number.isInteger(i.pct) ? i.pct : i.pct.toFixed(1)}% stage, its share of what the contract leaves`}`}
                  {kind !== 'variation' && i.description ? <span className={styles.lineSub} data-testid="invoice-description">{i.description}</span> : null}
                  {kind === 'variation' ? <span className={styles.lineSub}>Approved by the client — part of the contract value, billed on its own</span>
                    : i.outside ? <span className={styles.lineSub}>{kind === 'external' ? `Recorded from ${i.externalRef ?? 'elsewhere'}` : 'Outside the contract value'}</span> : (
                      <span className={styles.lineSub} data-testid="invoice-basis">
                        Contract value {money2(b.contractMinor)}{b.issued ? ' when issued' : ' as it stands today'}{b.variationsMinor ? ` (the ${m.source === 'quote' ? 'signed quote' : 'agreed value'} ${money2(b.baseMinor)} ${b.variationsMinor < 0 ? '−' : '+'} variation orders ${money2(Math.abs(b.variationsMinor))})` : ''}
                      </span>
                    )}
                  {/* (gaps build B, item 15) re-sized by a variation order: the share it was, and what moved it */}
                  {i.adjustedFrom ? <span className={styles.lineSub} data-testid="invoice-adjusted">Original {money2(i.adjustedFrom.minor)} → adjusted {money2(i.amountMinor)}{i.adjustedFrom.variations.length ? ` after ${i.adjustedFrom.variations.join(', ')}` : ''}</span> : null}
                </td>
                <td className={styles.amt}>{itemised ? null : money2(i.subtotalMinor)}</td>
              </tr>
              {/* region P-A — (parity map, MI-031) a stage invoice itemised: its lines, before GST, under the stage's line (which then carries no
                  amount of its own — the lines add up to it, the one-off's way) */}
              {itemised ? i.lines!.map((l) => (
                <tr key={l.id} data-testid="invoice-line" data-stage-line="">
                  <td>{l.description}<span className={styles.lineSub}>{l.qty} × {money2(l.unitMinor)}</span></td>
                  <td className={styles.amt}>{money2(lineAmount(l))}</td>
                </tr>
              )) : null}
              {/* end P-A */}
            </>)}
          </tbody>
        </table>
        <dl className={styles.totals} data-testid="invoice-totals">
          <dt>Subtotal</dt><dd>{money2(i.subtotalMinor)}</dd>
          {m.gstRate && !(kind === 'one_off' && !i.chargeGst) ? <><dt>GST ({m.gstRate}%)</dt><dd>{money2(i.gstMinor)}</dd></> : null}   {/* (gaps build B) a one-off charged no GST prints none */}
          <dt className={styles.grand}>{paid || voided ? 'Total' : 'Total due'}</dt><dd className={styles.grand} data-testid="invoice-total">{money2(i.amountMinor)}</dd>
          {/* (Projects round 6, G-301) once something is paid: what is paid and the balance */}
          {i.status === 'sent' && i.paidMinor > 0 && L.showBalance ? <><dt>Paid</dt><dd data-testid="invoice-paid">{money2(Math.min(i.paidMinor, i.amountMinor))}</dd><dt>Balance due</dt><dd data-testid="invoice-balance">{money2(i.balanceMinor)}</dd></> : null}
        </dl>
        {/* (gaps build B, item 3) a note to the client */}
        {i.clientNote ? <section className={styles.noteBlock} aria-label="Note" data-testid="invoice-client-note"><span className={styles.eyebrow}>Note</span><p className={styles.note}>{i.clientNote}</p></section> : null}
        {paid || voided ? null : <section className={styles.pay} aria-label="How to pay" data-testid="invoice-pay">
          <div className={styles.payText}>
            <span className={styles.payTitle}>How to pay</span>
            {hasBank ? (
              <dl className={styles.payFacts}>
                {bankOn && e!.bankName ? <><dt>Bank</dt><dd>{e!.bankName}</dd></> : null}
                {e!.accountName ? <><dt>Account name</dt><dd>{e!.accountName}</dd></> : null}
                {bankOn && e!.accountNo ? <><dt>Account no.</dt><dd>{e!.accountNo}</dd></> : null}
                {bankOn && e!.branch ? <><dt>Branch code</dt><dd data-testid="invoice-branch">{e!.branch}</dd></> : null}   {/* (parity map, FB-103) */}
                {bankOn && e!.swift ? <><dt>SWIFT</dt><dd>{e!.swift}</dd></> : null}
                {payNowOn ? <><dt>PayNow</dt><dd>{e!.payNow}</dd></> : null}
                <dt>Amount</dt><dd>{money2(i.status === 'sent' && i.paidMinor > 0 ? i.balanceMinor : i.amountMinor)}</dd>
                <dt>Reference</dt><dd>{reference}</dd>
              </dl>
            ) : L.showBank && inPerson ? <p className={styles.payNote} data-testid="invoice-pay-in-person">{`By ${inPerson} — ${h.name} records it when it arrives.`}</p>   /* (parity map, FB-112) only cheques or cash are taken */
              : L.showBank ? <p className={styles.payNote}>{h.name} will send its bank details with this invoice.</p> : null}
            <p className={styles.payNote}>Please pay by {displayDateLong(new Date(i.dueAt ?? d.draftDue))} and use {reference} as the reference, so {h.name} can match your payment.</p>
          </div>
          {/* (Projects round 6, F-15) the PayNow QR with the amount still owed and this invoice's number — once it is numbered and owed */}
          {i.number && i.status === 'sent' && i.balanceMinor > 0 && L.showBank && shows.payNow ? <PayNowQr className={styles.qr} payNow={e?.payNow} uploaded={e?.payNowQr} amountMinor={i.balanceMinor} reference={i.number} merchant={e?.accountName || h.name} /> : null}
        </section>}
        {/* (gaps build B, item 14) the studio's terms block and footer note */}
        {L.terms ? <section className={styles.noteBlock} aria-label={L.termsTitle} data-testid="invoice-terms"><span className={styles.eyebrow}>{L.termsTitle}</span><p className={styles.note}>{L.terms}</p></section> : null}
        {/* region P-D — (parity map, MI-065) the acceptance block: its heading, its words, lines for the client's name, signature and date */}
        {L.acceptance && !voided ? <section className={styles.accept} aria-label={L.acceptanceTitle} data-testid="invoice-acceptance">
          <span className={styles.eyebrow}>{L.acceptanceTitle}</span>
          <p className={styles.note}>{L.acceptanceText}</p>
          <div className={styles.acceptLines} aria-hidden><span className={styles.acceptLine}>Name</span><span className={styles.acceptLine}>Signature</span><span className={styles.acceptLine}>Date</span></div>
        </section> : null}
        {/* end P-D */}
        {L.footer ? <p className={styles.note} data-testid="invoice-footer-note">{L.footer}</p> : null}
      </div>
      <PaperFoot extras={x} />   {/* region P-D (parity map, FB-103) the entity's footer line */}
      {/* (fix-D, F-11 · REG-963) a client's document carries the studio's name alone — no OpenMaison mark (the portal's rule; the PDF goes to
          the client too) */}
    </article>
  )
}
