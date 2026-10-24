'use client'

import { Bone, GhostSheet } from '@/components/shell/skeleton'
import { Line, Slot } from '@/components/shell/ghost-kit'
import frame from '@/components/quotes/preview/quote-preview.module.css'
import paper from './invoice-paper.module.css'

/**
 * (REG-708, Projects round 6) The receipt page's ghost — the invoice page's frame (the preview's bar: the crumb, the number and its two chips,
 * Back to Money · Download PDF) over the receipt's paper (letterhead, title and facts, the two parties, the payment's line, the figures, the
 * thank-you line). The route's loader and the page's PageReveal draw this one; `bare` draws the paper alone (the portal's receipt).
 */
export function ReceiptPaperGhost() {
  return (
    <div className={paper.paper}>
      <div className={paper.head}><Bone w={120} h={32} r={4} /><span className={paper.studio}><Line w={160} lh={22} h={14} /><Line w={320} lh={16} h={10} /></span></div>
      <div className={paper.body}>
        <div className={paper.top}><Line w={140} lh={36} h={24} /><span className={paper.party}><Line w={180} lh={22} h={12} /><Line w={180} lh={22} h={12} /><Line w={180} lh={22} h={12} /></span></div>
        <div className={paper.parties}>
          <span className={paper.party}><Line w={90} lh={16} h={10} /><Line w={140} lh={24} h={14} /><Line w={220} lh={20} h={12} /></span>
          <span className={paper.party}><Line w={48} lh={16} h={10} /><Line w={200} lh={24} h={14} /><Line w={100} lh={20} h={12} /></span>
        </div>
        <span className={paper.party}><Line w="100%" lh={20} h={10} /><Line w="58%" lh={24} h={12} /><Line w="44%" lh={20} h={10} /></span>
        <span className={paper.totals}><Line w={96} lh={22} h={12} /><Line w={84} lh={22} h={12} /><Line w={84} lh={22} h={12} /><Line w={84} lh={22} h={12} /><Line w={72} lh={28} h={14} /><Line w={84} lh={28} h={14} /></span>
        <Line w={260} lh={20} h={12} />
      </div>
    </div>
  )
}

export function ReceiptGhost() {
  return (
    <GhostSheet label="Loading the receipt">
      <div className={frame.page} aria-hidden>
        <div className={frame.bar}>
          <div className={frame.titleBlock}>
            <Line w={200} lh={16} h={10} />
            <div className={`${frame.titleRow} ${paper.headWrap}`}><Line w={150} lh={32} h={20} /><span className={frame.chips}><Slot kind="chip" w={84} /><Slot kind="chip" w={170} /></span></div>
          </div>
          <div className={frame.actions}><Slot kind="btn" w={132} /><Slot kind="icon" /></div>
        </div>
        <div className={frame.body}>
          <div className={frame.column}>
            <div className={frame.stage}><ReceiptPaperGhost /></div>
          </div>
        </div>
      </div>
    </GhostSheet>
  )
}
