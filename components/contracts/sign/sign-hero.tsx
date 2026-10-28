'use client'

import type { ReactNode } from 'react'
import { Icon } from '@/components/om/icon'
import ph from './sign-phone.module.css'

/**
 * (Contracts on the move, C3 — P-05 · A-18) The phone's hero, three lines under the letterhead bar: the agreement's name · the quote it signs
 * with its total and "As cards" (the quote in place, A-16 · A-17) · one line to the client ("Hi Vivien, read it, then sign with a one-time
 * code"; signed: who and when). A set lists its documents as rows — the open one in bold, a read one ticked. Hidden on the desk
 * (sign-phone.module.css). *(invented copy: the greeting, "As cards")*
 */
export function SignHero({ title, quote, onQuote, children, fine = null, docs = null }: {
  title: string
  /** the quote it signs; `open` — "As cards" opens it in place; a deleted quote keeps its number, no press */
  quote: { number: string; total: string | null; open: boolean } | null
  onQuote: () => void
  /** the third line */ children: ReactNode
  /** one 14 line under it (the deposit that follows the signature) */ fine?: ReactNode | null
  /** a set's documents */ docs?: { id: string; title: string; read: boolean; on: boolean }[] | null
}) {
  return (
    <section className={ph.hero} aria-label="This contract" data-testid="sign-hero">
      <h2 className={ph.heroTitle}>{title}</h2>
      {docs ? (
        <ol className={ph.heroDocs} data-testid="sign-hero-docs">
          {docs.map((d, i) => (
            <li key={d.id} className={ph.heroDoc} data-on={d.on || undefined} data-read={d.read || undefined} aria-label={`${d.title}${d.read ? ', read' : ''}${d.on ? ', open' : ''}`}>
              <span className={ph.heroDocMark} aria-hidden>{d.read ? <Icon name="check_circle" size={20} /> : <span>{i + 1}</span>}</span>
              <span aria-hidden>{d.title}</span>
            </li>
          ))}
        </ol>
      ) : null}
      {quote ? (
        <button type="button" className={ph.heroRow} onClick={onQuote} disabled={!quote.open} data-testid="sign-quote-row">
          <span className={ph.heroRowIcon} aria-hidden><Icon name="request_quote" size={20} /></span>
          <span className={ph.heroRowText}>Quote {quote.number}{quote.total ? ` · ${quote.total}` : ''}</span>   {/* (the calm UI build 2026-10-27, 4-09 · W-331) "quote", as every other client page */}
          {quote.open ? <span className={ph.heroRowAct}>See the quote<Icon name="chevron_right" size={20} /></span> : null}   {/* (W-115) "As cards" meant nothing to a client */}
        </button>
      ) : null}
      <p className={ph.heroText} data-testid="sign-hero-line">{children}</p>
      {fine ? <p className={ph.heroFine} data-testid="deposit-ahead-phone">{fine}</p> : null}
    </section>
  )
}
