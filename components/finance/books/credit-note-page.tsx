'use client'

import { useEffect } from 'react'
import { printPaper } from '@/lib/paper-print'   // (pending modules S34) every paper's Download PDF, one call
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ds'
import { IconButton } from '@/components/om/icon-button'
import { MetaChip } from '@/components/om/meta-chip'
import { Tooltip } from '@/components/om/tooltip'
import { Crumbs } from '@/components/om/crumbs'
import { useProjectsCrumb } from '@/components/shell/access-gate'
import { paperBackLabel } from '@/lib/nav'
import { PageReveal } from '@/components/shell/page-reveal'
import { ReceiptGhost } from '@/components/projects/money/payments-receipt-ghost'
import { money2 } from '@/lib/quotes/math'
import type { CreditDocData } from '@/lib/finance/credit-paper'
import { CreditNotePaper } from './credit-note-paper'
import styles from '@/components/quotes/preview/quote-preview.module.css'

/**
 * (gaps build F2 — F2-Q9) A credit note as a page — the receipt page's frame (the quote preview's bar and stage): the crumb back to the project's
 * Money tab, its number with Issued or Void and its amount, Back to Money and Download PDF (the browser's print). `?print=1` prints.
 */
export function CreditNotePage({ d, from, print }: { d: CreditDocData; from?: string; print: boolean }) {
  const router = useRouter()
  const tabHref = `/projects/${d.project.id}/money?open=${encodeURIComponent(d.id)}`   // (pending modules S07) the crumb's own tab, whatever the page was opened from
  const back = from ?? tabHref
  const projectsCrumb = useProjectsCrumb()   // (pending modules S07) Finance for Accounting, who opens no Projects listing
  useEffect(() => { if (print) { const t = setTimeout(() => printPaper(), 600); return () => clearTimeout(t) } }, [print])
  return (
    <PageReveal skeleton={<ReceiptGhost />}>
      <div className={styles.page} data-print={print || undefined} data-testid="credit-note-page">
        <header className={styles.bar}>
          <div className={styles.titleBlock}>
            <Crumbs className={styles.crumb} items={[projectsCrumb, { label: d.project.name, href: `/projects/${d.project.id}` }, { label: 'Money', href: tabHref }]} />
            <div className={styles.titleRow}>
              <h1 className={styles.title}>{d.paper.credit.number}</h1>
              <span className={styles.chips}>
                {/* (pending modules S07) an overpayment's word is the list's: Credit held while some is left, then Used or Refunded */}
                {d.status === 'void' ? <MetaChip>Void</MetaChip> : d.paper.credit.kind === 'overpayment'
                  ? ((d.paper.credit.leftMinor ?? 0) > 0 ? <MetaChip color="blue">Credit held</MetaChip> : <MetaChip color="green">{d.paper.credit.refund ? 'Refunded' : 'Used'}</MetaChip>)
                  : <MetaChip color="green">Issued</MetaChip>}
                <MetaChip>{d.paper.invoice.number ?? d.paper.invoice.stageName} · {money2(d.paper.credit.amountMinor)}</MetaChip>
              </span>
            </div>
          </div>
          <div className={styles.actions}>
            <Button variant="secondary" appearance="outlined" onPress={() => router.push(back)}>{paperBackLabel(from, 'Money')}</Button>
            <Tooltip label="Download PDF"><IconButton icon="download" label="Download PDF" onClick={() => printPaper()} /></Tooltip>
          </div>
        </header>
        <div className={styles.body}>
          <div className={styles.column}>
            <div className={styles.stage}><CreditNotePaper d={d.paper} /></div>
          </div>
        </div>
      </div>
    </PageReveal>
  )
}
