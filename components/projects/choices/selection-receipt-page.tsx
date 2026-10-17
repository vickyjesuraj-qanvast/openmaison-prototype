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
import { GhostSheet } from '@/components/shell/skeleton'
import { Line, Slot } from '@/components/shell/ghost-kit'
import { PageReveal } from '@/components/shell/page-reveal'
import { receiptStateLabel, type SelectionReceiptData } from '@/lib/projects/choice-receipt-model'
import { SelectionReceiptGhost, SelectionReceiptPaper } from './selection-receipt'
import styles from '@/components/quotes/preview/quote-preview.module.css'

/**
 * (gaps build D, item 7) A confirmed pick's selection receipt as a page — the payment receipt's frame (the quote preview's bar and stage): the
 * crumb back to the project's Choices, "Selection receipt" with the choice and the pick, Back to Choices and Download PDF (the browser's print
 * of the same page). Its entry in Files › Choices opens here. `?print=1` prints.
 */
export function SelectionReceiptPage({ d, from, print }: { d: SelectionReceiptData & { projectId: string }; from?: string; print: boolean }) {
  const router = useRouter()
  const tabHref = `/projects/${d.projectId}/choices?open=${encodeURIComponent(d.choice.id)}`   // (pending modules S07) the crumb's own tab, whatever the page was opened from
  const back = from ?? tabHref
  const projectsCrumb = useProjectsCrumb()   // (pending modules S07) Finance for Accounting, who opens no Projects listing
  const picked = d.options.find((o) => o.picked)
  useEffect(() => { if (print) { const t = setTimeout(() => printPaper(), 600); return () => clearTimeout(t) } }, [print])
  return (
    <PageReveal skeleton={<SelectionReceiptPageGhost />}>
      <div className={styles.page} data-print={print || undefined} data-testid="selection-receipt-page">
        <header className={styles.bar}>
          <div className={styles.titleBlock}>
            <Crumbs className={styles.crumb} items={[projectsCrumb, { label: d.project.name, href: `/projects/${d.projectId}` }, { label: 'Choices', href: tabHref }]} />
            <div className={styles.titleRow}>
              <h1 className={styles.title}>Selection receipt</h1>
              <span className={styles.chips}>
                {/* (parity map, TD-044) a no's receipt says which answer it records */}
                <MetaChip color={d.answer ? 'default' : 'green'}>{receiptStateLabel(d)}</MetaChip>
                <MetaChip>{`${d.choice.title}${picked ? ` · ${picked.name}` : ''}`}</MetaChip>
              </span>
            </div>
          </div>
          <div className={styles.actions}>
            <Button variant="secondary" appearance="outlined" onPress={() => router.push(back)}>{paperBackLabel(from, 'Choices')}</Button>
            <Tooltip label="Download PDF"><IconButton icon="download" label="Download PDF" onClick={() => printPaper()} data-testid="selection-receipt-download" /></Tooltip>
          </div>
        </header>
        <div className={styles.body}>
          <div className={styles.column}>
            <div className={styles.stage}><SelectionReceiptPaper d={d} /></div>
          </div>
        </div>
      </div>
    </PageReveal>
  )
}

/** (REG-708) The page's ghost — the receipt frame's bar (crumb, title and its two chips, Back to Choices · Download PDF) over the paper. */
export function SelectionReceiptPageGhost() {
  return (
    <GhostSheet label="Loading the selection receipt">
      <div className={styles.page} aria-hidden>
        <div className={styles.bar}>
          <div className={styles.titleBlock}>
            <Line w={220} lh={16} h={10} />
            <div className={styles.titleRow}><Line w={200} lh={32} h={20} /><span className={styles.chips}><Slot kind="chip" w={76} /><Slot kind="chip" w={190} /></span></div>
          </div>
          <div className={styles.actions}><Slot kind="btn" w={140} /><Slot kind="icon" /></div>
        </div>
        <div className={styles.body}>
          <div className={styles.column}>
            <div className={styles.stage}><SelectionReceiptGhost /></div>
          </div>
        </div>
      </div>
    </GhostSheet>
  )
}
