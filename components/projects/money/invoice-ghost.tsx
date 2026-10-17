'use client'

import { useParams } from 'next/navigation'
import { Bone, GhostSheet } from '@/components/shell/skeleton'
import { useFirstRunShape } from '@/lib/ghost-shape'
import { Line, Slot } from '@/components/shell/ghost-kit'
import frame from '@/components/quotes/preview/quote-preview.module.css'
import paper from './invoice-paper.module.css'

/**
 * (REG-708, Projects round 5) The invoice page's ghost — its own layout on its own classes: the preview's bar (the crumb, the number and its two
 * chips, Back to Money · Download PDF · the next step) over the invoice's paper (letterhead, title and facts, the two parties, the line, the
 * totals, how to pay). The route's loader and the page's PageReveal draw this one.
 * (simplify round 2, R2-A — REG-708) The bar's buttons as the page draws them: Back to Money, the link icon (a sent invoice's no-login link), Download
 * PDF, the next step (a Draft's Send · Submit for approval · Approve and send) and Record a payment (a sent invoice with something owed, K-M's
 * S-08 step). The page tells its reveal (`shape`); the loader asks what this browser saw last (`invoiceGhostKeys`, written by the page).
 */
export type InvoiceGhostShape = { copy: boolean; next: boolean; record: boolean }
/** The three remembered flags of an invoice page's bar (per browser, `useRememberShape`). */
export const invoiceGhostKeys = (invoiceId: string) => ({ copy: `invoice.${invoiceId}.copy`, next: `invoice.${invoiceId}.next`, record: `invoice.${invoiceId}.record` })

export function InvoiceGhost({ shape }: { /** the reveal's knowledge — the loader reads the remembered flags */ shape?: InvoiceGhostShape }) {
  const { invoiceId } = useParams<{ invoiceId?: string }>() ?? {}
  const keys = invoiceId ? invoiceGhostKeys(invoiceId) : null
  const seen = { copy: useFirstRunShape(keys?.copy ?? null), next: useFirstRunShape(keys?.next ?? null), record: useFirstRunShape(keys?.record ?? null) }
  const s = shape ?? seen
  return (
    <GhostSheet label="Loading the invoice">
      <div className={frame.page} aria-hidden>
        <div className={frame.bar}>
          <div className={frame.titleBlock}>
            <Line w={200} lh={16} h={10} />
            <div className={frame.titleRow}><Line w={150} lh={32} h={20} /><span className={frame.chips}><Slot kind="chip" w={64} /><Slot kind="chip" w={150} /></span></div>
          </div>
          <div className={frame.actions}><Slot kind="btn" w={132} />{s.copy ? <Slot kind="icon" /> : null}<Slot kind="icon" />{s.next ? <Slot kind="btn" w={64} /> : null}{s.record ? <Slot kind="btn" w={148} /> : null}</div>
        </div>
        <div className={frame.body}>
          <div className={frame.column}>
            <div className={frame.stage}>
              <div className={paper.paper}>
                <div className={paper.head}><Bone w={120} h={32} r={4} /><span className={paper.studio}><Line w={160} lh={22} h={14} /><Line w={320} lh={16} h={10} /></span></div>
                <div className={paper.body}>
                  <div className={paper.top}><Line w={180} lh={36} h={24} /><span className={paper.party}><Line w={180} lh={22} h={12} /><Line w={180} lh={22} h={12} /><Line w={180} lh={22} h={12} /></span></div>
                  <div className={paper.parties}>
                    <span className={paper.party}><Line w={48} lh={16} h={10} /><Line w={140} lh={24} h={14} /><Line w={220} lh={20} h={12} /></span>
                    <span className={paper.party}><Line w={48} lh={16} h={10} /><Line w={200} lh={24} h={14} /><Line w={160} lh={20} h={12} /></span>
                  </div>
                  <span className={paper.party}><Line w="100%" lh={20} h={10} /><Line w="62%" lh={24} h={12} /><Line w="48%" lh={20} h={10} /></span>
                  <span className={paper.totals}><Line w={96} lh={22} h={12} /><Line w={84} lh={22} h={12} /><Line w={72} lh={22} h={12} /><Line w={84} lh={22} h={12} /><Line w={80} lh={28} h={14} /><Line w={96} lh={28} h={14} /></span>
                  <div className={paper.pay}><span className={paper.payText}><Line w={96} lh={24} h={14} />{[0, 1, 2, 3].map((k) => <Line key={k} w={[220, 180, 200, 160][k]!} lh={20} h={12} />)}</span><Bone w={120} h={120} r={4} /></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </GhostSheet>
  )
}
