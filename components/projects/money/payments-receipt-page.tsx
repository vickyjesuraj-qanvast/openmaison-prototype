'use client'

import { useEffect } from 'react'
import { printPaper } from '@/lib/paper-print'   // (pending modules S34) every paper's Download PDF, one call
import { useSnackbar } from '@/components/om/snackbar'
import { couldnt } from '@/components/leads/tasks/use-run'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ds'
import { IconButton } from '@/components/om/icon-button'
import { MetaChip } from '@/components/om/meta-chip'
import { Tooltip } from '@/components/om/tooltip'
import { Crumbs } from '@/components/om/crumbs'
import { useProjectsCrumb } from '@/components/shell/access-gate'
import { paperBackLabel } from '@/lib/nav'
import { PageReveal } from '@/components/shell/page-reveal'
import { money2 } from '@/lib/quotes/math'
import { PAYMENT_STATUS_LABEL, PAYMENT_STATUS_TONE } from '@/lib/projects/payments-model'
import type { ReceiptDocData } from '@/lib/projects/payments'
import { ReceiptPaper } from './payments-receipt'
import { ReceiptGhost } from './payments-receipt-ghost'
import styles from '@/components/quotes/preview/quote-preview.module.css'

/**
 * (Projects round 6, F-12) A payment's receipt as a page — the invoice page's frame (the quote preview's bar and stage): the crumb back to the
 * project's Money tab, the receipt's number with its state and amount, Back to Money and Download PDF (the browser's print of the same page).
 * A reversed one reads Reversed. `?print=1` prints.
 */
export function ReceiptPage({ d, from, print }: { d: ReceiptDocData; from?: string; print: boolean }) {
  const router = useRouter()
  const tabHref = `/projects/${d.project.id}/money?open=${encodeURIComponent(d.payment.id)}`   // (pending modules S07) the crumb's own tab, whatever the page was opened from
  const back = from ?? tabHref   // (simplify S-08) back to its invoice's panel, on this payment
  const projectsCrumb = useProjectsCrumb()   // (pending modules S07) Finance for Accounting, who opens no Projects listing
  const reversed = !!d.paper.payment.reversed
  const snackbar = useSnackbar()
  /* (gaps build B, item 6) its no-login link */
  const copyLink = () => { if (!d.payment.shareToken) return; void navigator.clipboard?.writeText(`${window.location.origin}/receipt/${d.payment.shareToken}`).then(() => snackbar({ message: `Link to ${d.paper.payment.number} copied — it opens without signing in` }), () => snackbar({ message: couldnt('copy the link') })) }
  useEffect(() => { if (print) { const t = setTimeout(() => printPaper(), 600); return () => clearTimeout(t) } }, [print])
  return (
    <PageReveal skeleton={<ReceiptGhost />}>
      <div className={styles.page} data-print={print || undefined} data-testid="receipt-page">
        <header className={styles.bar}>
          <div className={styles.titleBlock}>
            <Crumbs className={styles.crumb} items={[projectsCrumb, { label: d.project.name, href: `/projects/${d.project.id}` }, { label: 'Money', href: tabHref }]} />
            <div className={styles.titleRow}>
              <h1 className={styles.title}>{d.paper.payment.number}</h1>
              <span className={styles.chips}>
                {/* (fix-D, D-41) the Payments table's word and tone for the payment's state: Confirmed green, Reversed plain */}
                {reversed ? <MetaChip>{PAYMENT_STATUS_LABEL.reversed}</MetaChip> : <MetaChip color={PAYMENT_STATUS_TONE.confirmed}>{PAYMENT_STATUS_LABEL.confirmed}</MetaChip>}
                <MetaChip>{d.paper.invoice.stageName} · {money2(d.paper.payment.amountMinor)}</MetaChip>
              </span>
            </div>
          </div>
          <div className={styles.actions}>
            <Button variant="secondary" appearance="outlined" onPress={() => router.push(back)}>{paperBackLabel(from, 'Money')}</Button>
            {d.payment.shareToken ? <Tooltip label="Copy the receipt link"><IconButton icon="link" label="Copy the receipt link" onClick={copyLink} data-testid="receipt-copy-link" /></Tooltip> : null}
            <Tooltip label="Download PDF"><IconButton icon="download" label="Download PDF" onClick={() => printPaper()} /></Tooltip>
          </div>
        </header>
        <div className={styles.body}>
          <div className={styles.column}>
            <div className={styles.stage}><ReceiptPaper d={d.paper} /></div>
          </div>
        </div>
      </div>
    </PageReveal>
  )
}
