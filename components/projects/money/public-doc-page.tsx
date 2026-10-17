'use client'

import { useEffect } from 'react'
import { printPaper } from '@/lib/paper-print'   // (pending modules S34) every paper's Download PDF, one call
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { MetaChip } from '@/components/om/meta-chip'
import { PageReveal } from '@/components/shell/page-reveal'
import { Bone, GhostSheet } from '@/components/shell/skeleton'
import { Line, Slot } from '@/components/shell/ghost-kit'
import { money2 } from '@/lib/quotes/math'
import { INVOICE_STATE_LABEL, INVOICE_STATE_TONE, type InvoiceState } from '@/lib/projects/money'
import type { PublicInvoice, PublicReceipt } from '@/lib/projects/payments-public'
import { InvoicePaper } from './invoice-paper'
import { ReceiptPaper } from './payments-receipt'
import styles from '@/components/quotes/preview/quote-preview.module.css'
import paper from './invoice-paper.module.css'

/**
 * (gaps build B, item 6 — 1.0 G-494 · G-495) An invoice or a receipt as the client opens it from its link, without signing in: the quote
 * preview's frame (its bar and stage) with the studio's name over the document's number and its state, and Download PDF (the browser's print of
 * the same page — the studio's own pages print this way). The paper is the one the studio's page, the portal and the PDF print, How to pay and
 * the PayNow code included while something is owed. `?print=1` prints.
 */
export function PublicDocPage({ invoice, receipt, print }: { invoice?: PublicInvoice; receipt?: PublicReceipt; print: boolean }) {
  useEffect(() => { if (print) { const t = setTimeout(() => printPaper(), 600); return () => clearTimeout(t) } }, [print])
  const studio = invoice?.studio ?? receipt?.studio ?? ''
  const state = invoice ? (invoice.state as InvoiceState) : null
  /* the client's words for the state: a Draft never reaches here; Ready / Waiting are the studio's */
  const chip = invoice && state ? (INVOICE_STATE_TONE[state] === 'default' ? <MetaChip>{INVOICE_STATE_LABEL[state]}</MetaChip> : <MetaChip color={INVOICE_STATE_TONE[state]}>{INVOICE_STATE_LABEL[state]}</MetaChip>)
    : receipt ? (receipt.paper.payment.reversed ? <MetaChip>Reversed</MetaChip> : <MetaChip color="green">Paid {money2(receipt.paper.payment.amountMinor)}</MetaChip>) : null
  return (
    <PageReveal skeleton={<PublicDocGhost />}>
      <div className={styles.page} data-print={print || undefined} data-testid={invoice ? 'public-invoice' : 'public-receipt'}>
        <header className={styles.bar}>
          <div className={styles.titleBlock}>
            <span className={styles.crumb}>{studio}</span>
            <div className={styles.titleRow}>
              <h1 className={styles.title}><span className={paper.nowrap}>{invoice ? `Invoice ${invoice.label}` : `Receipt ${receipt?.paper.payment.number ?? ''}`}</span></h1>
              <span className={styles.chips}>{chip}</span>
            </div>
          </div>
          <div className={styles.actions}>
            <Button variant="secondary" appearance="outlined" iconStart={<Icon name="download" size={20} />} onPress={() => printPaper()} data-testid="public-download">Download PDF</Button>
          </div>
        </header>
        <div className={styles.body}>
          <div className={styles.column}>
            <div className={styles.stage}>{invoice ? <InvoicePaper d={invoice.paper} /> : receipt ? <ReceiptPaper d={receipt.paper} /> : null}</div>
          </div>
        </div>
      </div>
    </PageReveal>
  )
}

/** (REG-708) The link's ghost — the page's own frame: the studio's line, the number and its chip, Download PDF; the paper's shape under it. */
export function PublicDocGhost() {
  return (
    <GhostSheet label="Loading">
      <div className={styles.page} aria-hidden>
        <div className={styles.bar}>
          <div className={styles.titleBlock}>
            <Line w={140} lh={16} h={10} />
            <div className={styles.titleRow}><Line w={220} lh={32} h={20} /><span className={styles.chips}><Slot kind="chip" w={72} /></span></div>
          </div>
          <div className={styles.actions}><Slot kind="btn" w={150} /></div>
        </div>
        <div className={styles.body}>
          <div className={styles.column}>
            <div className={styles.stage}>
              <div className={paper.paper}>
                <div className={paper.head}><Bone w={120} h={32} r={4} /><span className={paper.studio}><Line w={160} lh={22} h={14} /><Line w={320} lh={16} h={10} /></span></div>
                <div className={paper.body}>
                  <div className={paper.top}><Line w={180} lh={36} h={24} /><span className={paper.party}><Line w={180} lh={22} h={12} /><Line w={180} lh={22} h={12} /><Line w={180} lh={22} h={12} /></span></div>
                  <div className={paper.parties}>
                    <span className={paper.party}><Line w={48} lh={16} h={10} /><Line w={140} lh={24} h={14} /><Line w={220} lh={20} h={12} /></span>
                    <span className={paper.party}><Line w={48} lh={16} h={10} /><Line w={200} lh={24} h={14} /><Line w={160} lh={20} h={12} /></span>
                  </div>
                  <span className={paper.party}><Line w="100%" lh={20} h={10} /><Line w="62%" lh={24} h={12} /></span>
                  <span className={paper.totals}><Line w={96} lh={22} h={12} /><Line w={84} lh={22} h={12} /><Line w={80} lh={28} h={14} /><Line w={96} lh={28} h={14} /></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </GhostSheet>
  )
}
