'use client'

import Link from 'next/link'
import { printPaper } from '@/lib/paper-print'   // (pending modules S34) every paper's Download PDF, one call
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { Line } from '@/components/shell/ghost-kit'
import { Bone } from '@/components/shell/skeleton'
import { PageReveal } from '@/components/shell/page-reveal'
import { SelectionReceiptGhost, SelectionReceiptPaper } from '@/components/projects/choices/selection-receipt'
import { portalPath, type NeedItem } from '@/lib/portal/model'
import type { PortalLook } from '@/lib/portal/queries'
import type { SelectionReceiptData } from '@/lib/projects/choice-receipt-model'
import { PortalFrame } from '../portal-frame'
import { Frame } from '../portal-ghosts'
import money from '../money/money.module.css'

/**
 * (gaps build D, item 7 — 1.0 I-287) A pick's selection receipt inside the portal's frame — the very paper the studio prints, under Back to
 * Choices and Download PDF (the browser's print of the paper alone), as the portal's money documents are (portal-doc.tsx).
 */
export function PortalChoiceReceipt({ look, slug, visitor, paused, receipt, needs, back }: {
  look: PortalLook; slug: string; visitor: { name: string; preview: boolean; memberName: string | null; frame?: boolean }; paused: boolean
  receipt: SelectionReceiptData; needs?: readonly Pick<NeedItem, 'kind'>[]
  /** where Back goes — the client's Choices, or Files when the receipt was opened from their documents */ back: 'choices' | 'files'
}) {
  return (
    <PageReveal skeleton={<PortalChoiceReceiptGhost />}>
      <PortalFrame look={look} slug={slug} tab={back} visitor={visitor} paused={paused} needs={needs}>
        <div className={money.docBar}>
          <Link className={money.docBack} href={portalPath(slug, back === 'files' ? 'files' : `choices?open=${encodeURIComponent(receipt.choice.id)}`)} prefetch={false} data-testid="portal-doc-back"><Icon name="arrow_back" size={20} />{back === 'files' ? 'Back to Files' : 'Back to Choices'}</Link>
          <Tooltip label="Download PDF"><IconButton icon="download" label="Download PDF" onClick={() => printPaper()} data-testid="portal-doc-download" /></Tooltip>
        </div>
        <div className={money.docStage}><SelectionReceiptPaper d={receipt} /></div>
      </PortalFrame>
    </PageReveal>
  )
}

/** (REG-708) Its ghost — the portal's frame, the bar (Back · Download) and the receipt's paper. */
export function PortalChoiceReceiptGhost() {
  return (
    <Frame label="Loading the selection receipt">
      <div className={money.docBar}><Line w={150} lh={44} /><Bone w={40} h={40} r={20} /></div>
      <div className={money.docStage}><SelectionReceiptGhost /></div>
    </Frame>
  )
}
