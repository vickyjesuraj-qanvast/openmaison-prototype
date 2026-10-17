'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Icon } from '@/components/om/icon'
import { mm, PAPER_MM } from '@/lib/templates/model'
import { fallbackDesignClient } from '@/lib/templates/presets'
import type { ClientQuote } from '@/lib/quotes/client-quote'
import type { LinkState } from '@/lib/contracts/policy'
import { TemplateDocument } from '@/components/templates/render/document'
import { LinkNotice } from './link-notice'
import styles from './signing-page.module.css'

/**
 * (REG-633, contracts parity Q-20) The quote an agreement signs, as the client view prints it — the confirmation page's document
 * (REG-587) without its card: the letterhead bar, "Back to the agreement", the quote fitted to the page. Nothing here changes anything.
 */
export function SignQuoteView({ token, issuer, logo, data, state }: { /** (pending modules S03) the agreement's link token */ token: string; issuer: string; logo: string | null; /** (pending modules S04) the quote as the print reads it */ data: ClientQuote | null; state: LinkState }) {
  const [fallback] = useState(fallbackDesignClient)
  const design = data?.design ?? fallback
  const areaRef = useRef<HTMLDivElement>(null)
  const [areaW, setAreaW] = useState(0)
  useEffect(() => {
    const el = areaRef.current
    if (!el) return
    const ro = new ResizeObserver((es) => { for (const e of es) setAreaW(e.contentRect.width) })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const zoom = areaW ? Math.min(1, Math.max(0.3, areaW / mm(PAPER_MM[design.page.paper].w))) : 0.9
  const onPaginated = useCallback(() => {}, [])
  return (
    <div className={styles.page} data-testid="sign-quote-view">
      <header className={styles.top}>
        <span className={styles.brand}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {logo ? <img className={styles.logo} src={logo} alt="" /> : null}
          <span className={styles.studio}>{issuer}</span>
        </span>
        <Link href={`/sign/${token}`} className={styles.quoteLink}><Icon name="arrow_back" size={20} />Back to the agreement</Link>
      </header>
      {data && (state === 'open' || state === 'signed') ? (
        <div className={styles.body}>
          <div className={`${styles.stage} ${styles.column}`} ref={areaRef}>
            <TemplateDocument design={design} brand={data.brand} data={data.data} view={data.view} zoom={zoom} onPaginated={onPaginated} />
          </div>
        </div>
      ) : <LinkNotice state={state === 'not-sent' || state === 'expired' || state === 'quote-updating' ? state : 'inactive'} studio={issuer} />}   {/* (S42 B-01) never the draft of a revision */}
    </div>
  )
}
