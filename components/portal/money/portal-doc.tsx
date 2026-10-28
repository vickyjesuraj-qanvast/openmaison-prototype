'use client'

import Link from 'next/link'
import { printPaper } from '@/lib/paper-print'   // (pending modules S34) every paper's Download PDF, one call
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { PageReveal } from '@/components/shell/page-reveal'
import { InvoicePaper, type InvoicePaperData } from '@/components/projects/money/invoice-paper'
import { ReceiptPaper, type ReceiptPaperData } from '@/components/projects/money/payments-receipt'
import { portalPath, type NeedItem } from '@/lib/portal/model'
import type { PortalLook } from '@/lib/portal/queries'
import { PortalFrame } from '../portal-frame'
import { PortalDocGhost } from './money-ghosts'
import styles from './money.module.css'
import { CreditNotePaper } from '@/components/finance/books/credit-note-paper'   // (gaps build F2)
import type { CreditNotePaperData } from '@/lib/finance/credit-paper'

/**
 * (Projects round 6, F-12 · F-15) One of the client's money documents inside the portal's frame: an invoice (how to pay, the PayNow QR with
 * what is still owed) or a receipt (Reversed when it was) — the very paper the studio prints, under Back to Money.
 */
export function PortalDoc({ look, slug, visitor, paused, invoice, receipt, credit, needs }: {
  look: PortalLook; slug: string; visitor: { name: string; preview: boolean; memberName: string | null; frame?: boolean }; paused: boolean
  invoice?: InvoicePaperData; receipt?: ReceiptPaperData
  /** (gaps build F2 — F2-Q9) a credit note on one of their invoices */ credit?: CreditNotePaperData
  /** (REG-1050) what needs the client, for the phone bar's More */ needs?: readonly Pick<NeedItem, 'kind'>[]
}) {
  return (
    <PageReveal skeleton={<PortalDocGhost label={invoice ? 'Loading the invoice' : credit ? 'Loading the credit note' : 'Loading the receipt'} />}>
      <PortalFrame look={look} slug={slug} tab="money" visitor={visitor} paused={paused} needs={needs}>
        {/* (fix-F, F-12) the studio page's Download PDF — the browser's print of the paper alone (the portal's bars stay off the page) */}
        <div className={styles.docBar}>
          <Link className={styles.docBack} href={portalPath(slug, 'money')} prefetch={false} data-testid="portal-doc-back"><Icon name="arrow_back" size={20} />Back to Payments</Link>
          <Tooltip label="Download PDF"><IconButton icon="download" label="Download PDF" onClick={() => printPaper()} data-testid="portal-doc-download" /></Tooltip>
        </div>
        <div className={styles.docStage}>{invoice ? <InvoicePaper d={invoice} /> : receipt ? <ReceiptPaper d={receipt} /> : credit ? <CreditNotePaper d={credit} /> : null}</div>
      </PortalFrame>
    </PageReveal>
  )
}
