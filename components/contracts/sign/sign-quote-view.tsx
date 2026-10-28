'use client'

import { useCallback, useMemo, useState } from 'react'
import Link from 'next/link'
import { Icon } from '@/components/om/icon'
import { fallbackDesignClient } from '@/lib/templates/presets'
import { docTotals } from '@/lib/templates/data'
import type { ClientQuote } from '@/lib/quotes/client-quote'
import type { LinkState } from '@/lib/contracts/policy'
import { QuoteStage } from '@/components/quotes/confirm/quote-stage'
import { LinkNotice } from './link-notice'
import { QuoteTotalCard } from './quote-total-card'
import styles from './signing-page.module.css'
import ph from './sign-phone.module.css'

/**
 * (REG-633, contracts parity Q-20) The quote an agreement signs, as the client view prints it — the confirmation page's document
 * (REG-587) without its card: the letterhead bar, "Back to the contract", the quote fitted to the page. Nothing here changes anything.
 *
 * (Contracts on the move, C3 — A-16 · A-17) On the phone model (a phone, a tablet held upright — the confirmation page's `QuoteStage`) the
 * quote reads as the total card and the reading cards, "View as printed" opening the house paper viewer — never an A4 zoomed to 4px type;
 * a tablet held sideways and the desk keep the paper at 1:1. The bar's link reads "← Contract" on a phone. On a phone the signing page
 * itself opens the quote in place (quote-layer.tsx); this page is the direct link's and the desk's.
 */
export function SignQuoteView({ token, issuer, logo, data, state, phone = null }: { /** (pending modules S03) the agreement's link token */ token: string; issuer: string; logo: string | null; /** (pending modules S04) the quote as the print reads it */ data: ClientQuote | null; state: LinkState
  /** (C3 — A-25) the studio's number on record, for a dead link's "Message {studio}" */ phone?: string | null }) {
  const [fallback] = useState(fallbackDesignClient)
  const design = data?.design ?? fallback
  const [printed, setPrinted] = useState(false)
  const onPrinted = useCallback((v: boolean) => setPrinted(v), [])
  const totalMinor = useMemo(() => (data ? docTotals(data.data).totalMinor : 0), [data])
  return (
    <div className={styles.page} data-testid="sign-quote-view">
      <header className={styles.top}>
        <span className={styles.brand}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {logo ? <img className={styles.logo} src={logo} alt="" /> : null}
          <span className={styles.studio}>{issuer}</span>
        </span>
        <Link href={`/sign/${token}`} className={styles.quoteLink} data-testid="sign-quote-back"><Icon name="arrow_back" size={20} /><span className={ph.backLong}>Back to the contract</span><span className={ph.backShort}>Contract</span></Link>
      </header>
      {data && (state === 'open' || state === 'signed') ? (
        <div className={`${styles.body} ${ph.quoteBody}`}>
          <QuoteTotalCard data={data} onPrinted={() => setPrinted(true)} />
          <QuoteStage design={design} brand={data.brand} data={data.data} view={data.view} totalMinor={totalMinor} show printed={printed} onPrinted={onPrinted} viewerTitle={`As printed · ${data.quote.number}`} />
        </div>
      ) : <LinkNotice state={state === 'not-sent' || state === 'expired' || state === 'quote-updating' ? state : 'inactive'} studio={issuer} contact={phone ? { phone } : null} />}   {/* (S42 B-01) never the draft of a revision · (C3 — A-25) */}
    </div>
  )
}
