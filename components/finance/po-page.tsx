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
import { Bone, GhostSheet } from '@/components/shell/skeleton'
import { Line, Slot } from '@/components/shell/ghost-kit'
import { PageReveal } from '@/components/shell/page-reveal'
import { money2 } from '@/lib/quotes/math'
import { PO_STATE_LABEL, PO_STATE_TONE, poState } from '@/lib/finance/model'
import type { PoDoc } from '@/lib/finance/queries'
import { PoPaper } from './po-paper'
import frame from '@/components/quotes/preview/quote-preview.module.css'
import paper from '@/components/projects/money/invoice-paper.module.css'
import fin from './finance.module.css'

/**
 * (gaps build F1 — F1-Q5) A purchase order's page in the studio — the invoice page's frame (the quote preview's bar and stage): the crumb back
 * to the project's Money, the PO's number and state, Back to Money and Download PDF (the browser's print of this page). The paper is the
 * vendor's copy — what their link opens. `?print=1` prints.
 */
export function PoPage({ d, from, print }: { d: PoDoc; from?: string; print: boolean }) {
  const router = useRouter()
  const tabHref = `/projects/${d.project.id}/money?open=${encodeURIComponent(d.po.id)}`   // (pending modules S07) the crumb's own tab, whatever the page was opened from
  const back = from ?? tabHref
  const projectsCrumb = useProjectsCrumb()   // (pending modules S07) Finance for Accounting, who opens no Projects listing
  useEffect(() => { if (print) { const t = setTimeout(() => printPaper(), 600); return () => clearTimeout(t) } }, [print])
  const state = poState(d.po, d.paidMinor)
  return (
    <PageReveal skeleton={<PoGhost />}>
      <div className={frame.page} data-print={print || undefined} data-testid="po-page">
        <header className={frame.bar}>
          <div className={frame.titleBlock}>
            <Crumbs className={frame.crumb} items={[projectsCrumb, { label: d.project.name, href: `/projects/${d.project.id}` }, { label: 'Money', href: tabHref }]} />
            <div className={`${frame.titleRow} ${fin.wrapRow}`}>
              <h1 className={frame.title}><span className={paper.nowrap}>{d.po.number}</span></h1>
              <span className={frame.chips}><MetaChip color={PO_STATE_TONE[state]}>{PO_STATE_LABEL[state]}</MetaChip><MetaChip>{d.vendor.name} · {money2(d.po.totalMinor)}</MetaChip></span>
            </div>
          </div>
          <div className={frame.actions}>
            <Button variant="secondary" appearance="outlined" onPress={() => router.push(back)}>{paperBackLabel(from, 'Money')}</Button>
            <Tooltip label="Download PDF"><IconButton icon="download" label="Download PDF" onClick={() => printPaper()} /></Tooltip>
          </div>
        </header>
        <div className={frame.body}><div className={frame.column}><div className={frame.stage}><PoPaper d={d} /></div></div></div>
      </div>
    </PageReveal>
  )
}

/** (REG-708) The PO page's ghost — the invoice page's: the bar over the paper (letterhead, title and facts, the two parties, the lines, the totals). */
export function PoGhost({ bar = true }: { bar?: boolean }) {
  return (
    <GhostSheet label="Loading the purchase order">
      <div className={frame.page} aria-hidden>
        {bar ? (
          <div className={frame.bar}>
            <div className={frame.titleBlock}>
              <Line w={200} lh={16} h={10} />
              <div className={frame.titleRow}><Line w={130} lh={32} h={20} /><span className={frame.chips}><Slot kind="chip" w={72} /><Slot kind="chip" w={190} /></span></div>
            </div>
            <div className={frame.actions}><Slot kind="btn" w={132} /><Slot kind="icon" /></div>
          </div>
        ) : null}
        <div className={frame.body}>
          <div className={frame.column}>
            <div className={frame.stage}>
              <div className={paper.paper}>
                <div className={paper.head}><Bone w={120} h={32} r={4} /><span className={paper.studio}><Line w={160} lh={22} h={14} /><Line w={320} lh={16} h={10} /></span></div>
                <div className={paper.body}>
                  <div className={paper.top}><Line w={220} lh={36} h={24} /><span className={paper.party}><Line w={160} lh={22} h={12} /><Line w={160} lh={22} h={12} /><Line w={160} lh={22} h={12} /></span></div>
                  <div className={paper.parties}>
                    <span className={paper.party}><Line w={32} lh={16} h={10} /><Line w={200} lh={24} h={14} /><Line w={120} lh={20} h={12} /></span>
                    <span className={paper.party}><Line w={64} lh={16} h={10} /><Line w={220} lh={24} h={14} /><Line w={160} lh={20} h={12} /></span>
                  </div>
                  <span className={paper.party}>{[0, 1, 2, 3].map((k) => <Line key={k} w={['92%', '70%', '84%', '62%'][k]!} lh={28} h={12} />)}</span>
                  <span className={paper.totals}><Line w={96} lh={22} h={12} /><Line w={84} lh={22} h={12} /><Line w={72} lh={22} h={12} /><Line w={84} lh={22} h={12} /><Line w={80} lh={28} h={14} /><Line w={96} lh={28} h={14} /></span>
                  <span className={paper.party}><Line w={64} lh={16} h={10} /><Line w="70%" lh={20} h={12} /></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </GhostSheet>
  )
}
