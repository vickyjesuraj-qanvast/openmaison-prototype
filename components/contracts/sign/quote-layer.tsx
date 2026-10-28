'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { SurfaceHead } from '@/components/om/dialog'
import { useScrollLock } from '@/components/om/use-scroll-lock'
import { useDialogFocus, useEscapeLayer } from '@/components/om/surface'
import { Bone } from '@/components/shell/skeleton'
import { Line } from '@/components/shell/ghost-kit'
import { QuoteStage } from '@/components/quotes/confirm/quote-stage'
import { docTotals } from '@/lib/templates/data'
import type { ClientQuote } from '@/lib/quotes/client-quote'
import type { LinkState } from '@/lib/contracts/policy'
import { fetchSignQuoteDoc } from '@/app/sign/quote-actions'
import { QuoteTotalCard } from './quote-total-card'
import shell from './signing-page.module.css'
import cp from '@/components/quotes/confirm/confirm-page.module.css'
import rc from '@/components/quotes/confirm/reading-cards.module.css'
import cs from '@/components/contracts/editor/contract-skeleton.module.css'
import ph from './sign-phone.module.css'

type Doc = { token: string; state: LinkState; quote: ClientQuote | null }

/**
 * (Contracts on the move, C3 — P-05 · A-16 · A-17) The quote an agreement signs, IN PLACE: "As cards" on the hero opens this layer over the
 * agreement — the confirmation page's total card and reading cards (never an A4 zoomed to 4px type), "View as printed" opening the house
 * paper viewer (fit to width, pinch); on a tablet held sideways the paper at 1:1. Never a new tab (the phone ended with two agreement
 * tabs). It reads the quote only when it opens (`fetchSignQuoteDoc`) and keeps it for the next open. One history entry while it is open,
 * so the phone's own Back closes it and the agreement stays where the client was; ← does the same. Esc, the focus and the page's scroll are
 * the house surface's (the paper viewer's pattern).
 */
export function QuoteLayer({ open, onClose, token, number, issuer }: { open: boolean; onClose: () => void; token: string; number: string; issuer: string }) {
  const panel = useRef<HTMLDivElement>(null)
  useScrollLock(open)
  useEscapeLayer(open, panel, onClose)
  useDialogFocus(open, panel)
  const [doc, setDoc] = useState<Doc | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    if (!open || (doc && doc.token === token)) return
    let live = true
    fetchSignQuoteDoc(token).then((r) => { if (live) setDoc({ token, ...r }) }, () => { if (live) setFailed(true) })
    return () => { live = false }
  }, [open, token, doc])
  /* the phone's Back closes the layer: one entry pushed as it opens, popped as it closes */
  const closeRef = useRef(onClose)
  useEffect(() => { closeRef.current = onClose }, [onClose])
  useEffect(() => {
    if (!open) return
    let popped = false
    try { window.history.pushState({ ...(window.history.state ?? {}), omSignQuote: true }, '') } catch { /* a browser that refuses: ← still closes */ }
    const onPop = () => { popped = true; closeRef.current() }
    window.addEventListener('popstate', onPop)
    return () => {
      window.removeEventListener('popstate', onPop)
      if (!popped && window.history.state?.omSignQuote) { try { window.history.back() } catch { /* nothing to pop */ } }
    }
  }, [open])
  const [printed, setPrinted] = useState(false)
  const onPrinted = useCallback((v: boolean) => setPrinted(v), [])
  const quote = doc && doc.token === token && (doc.state === 'open' || doc.state === 'signed') ? doc.quote : null
  const totalMinor = useMemo(() => (quote ? docTotals(quote.data).totalMinor : 0), [quote])
  if (!open || typeof document === 'undefined') return null
  const settled = (doc && doc.token === token) || failed
  return createPortal(
    <div ref={panel} className={ph.layer} role="dialog" aria-modal="true" aria-label={`Quote ${number}`} tabIndex={-1} data-testid="sign-quote-layer">
      <SurfaceHead className={ph.layerBar} title={`Quote ${number}`} subtitle={issuer}
                   leading={<Tooltip label="Back to the contract"><IconButton icon="arrow_back" label="Back to the contract" size={24} variant="bare" iconSize={24} iconWeight={300} onClick={onClose} data-testid="sign-quote-layer-back" /></Tooltip>} />
      <div className={ph.layerBody}>
        {quote ? (
          <>
            <QuoteTotalCard data={quote} onPrinted={() => setPrinted(true)} />
            <QuoteStage design={quote.design} brand={quote.brand} data={quote.data} view={quote.view} totalMinor={totalMinor} show printed={printed} onPrinted={onPrinted} viewerTitle={`As printed · ${number}`} />
          </>
        ) : settled ? (
          <p className={ph.layerNote} role="status">{failed ? 'Couldn’t load the quote — go back and try again' : `${issuer} is updating this quote. It’ll be back here once it’s ready.`}</p>
        ) : (
          /* the ghost: the confirmation page's (a phone, a tablet held upright — the total card and the cards; sideways — the paper) */
          <div className={`${shell.stage} ${cp.ghostBody}`} aria-busy="true" aria-label="Loading the quote">
            <div className={cp.ghostTotal}><Line w={72} lh={16} h={10} /><Line w={120} lh={24} h={14} /><Bone w={150} h={32} /><Line w="70%" lh={24} h={12} /><Bone w="100%" h={48} r={4} /></div>
            <div className={cp.ghostPaper}><div className={`${cs.paper} ${cp.ghostA4}`}><Bone w="55%" h={24} />{[0, 1, 2, 3, 4, 5].map((i) => <Bone key={i} w={i % 3 === 2 ? '70%' : '100%'} h={14} />)}</div></div>
            <div className={cp.ghostCards}>
              <Line w={120} lh={16} h={10} />
              <ul className={rc.cards}>{[0, 1, 2, 3].map((i) => <li key={i} className={rc.card}><span className={cp.ghostCardText}><Bone w={[170, 140, 190, 120][i]!} h={14} /><Bone w="90%" h={10} /><Bone w={96} h={10} /></span><Bone w={72} h={16} /></li>)}</ul>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
