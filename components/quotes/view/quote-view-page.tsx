'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { printPaper } from '@/lib/paper-print'   // (pending modules S34) every paper's Download PDF, one call
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { MetaChip } from '@/components/om/meta-chip'
import { MOBILE, useMediaQuery } from '@/lib/breakpoint'
import { displayDateLong } from '@/lib/format'
import { docTotals } from '@/lib/templates/data'
import { money2 } from '@/lib/quotes/math'
import { agoText } from '@/lib/portal/model'
import { VIEW_POLL_MS, notReadyWords, viewCardWords } from '@/lib/quotes/view-link'
import type { QuoteViewData } from '@/lib/quotes/view-link-queries'
import { readQuoteViewStamp } from '@/app/quotes/view-link-actions'
import { stampQuoteSeen } from '@/app/quotes/seen-actions'
import { QuoteStage } from '@/components/quotes/confirm/quote-stage'
import shell from '@/components/contracts/sign/signing-page.module.css'
import confirm from '@/components/quotes/confirm/confirm-page.module.css'

const first = (name: string) => name.trim().split(/\s+/)[0] ?? name

/**
 * (pending modules S02 — 1.0's `/quote-preview/[token]`) The quote's view-only link, as the client opens it from WhatsApp: the confirmation
 * page's shell — the studio's letterhead bar, the quote exactly as Preview prints it (the reading cards on a phone), and a card that says
 * what this is: a look, live, with nothing to confirm or sign. 1.0 polled every 5 s and re-drew everything; this asks every 10 s, only while
 * the page is in front, whether the quote changed — and only then re-reads it. A link stopped meanwhile turns into the house notice on the
 * next ask. "Message {designer}" opens WhatsApp on the press; "Download a copy" prints the A4.
 */
export function QuoteViewPage({ data }: { data: QuoteViewData }) {
  const router = useRouter()
  const phone = useMediaQuery(MOBILE)
  const totals = useMemo(() => docTotals(data.data), [data.data])
  const [printed, setPrinted] = useState(false)
  const [pages, setPages] = useState(0)
  const [now, setNow] = useState(() => data.now)
  const stampRef = useRef(data.stamp)
  useEffect(() => { stampRef.current = data.stamp }, [data.stamp])
  useEffect(() => {
    const t = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return
      setNow(Date.now())
      void readQuoteViewStamp(data.token).then((r) => { if ('gone' in r || r.stamp !== stampRef.current) router.refresh() }, () => {})
    }, VIEW_POLL_MS)
    return () => window.clearInterval(t)
  }, [data.token, router])
  /* (pending modules S04 — S02's note: "Viewed on the view link belongs in the page's first ask, never a chat fetch") the page's first ask from a
     browser that ran it says the client opened the quote; a chat app drawing the link's card runs no script. Only while the quote shows. */
  useEffect(() => { if (data.ready) void stampQuoteSeen({ token: data.token, via: 'view' }).catch(() => {}) }, [data.token, data.ready])

  const q = data.quote
  const clientFirst = first(data.clientName)
  const designerFirst = data.designer.member ? first(data.designer.name) : data.designer.name   // a quote nobody prepared: the studio answers
  const digits = data.designer.phone.replace(/\D/g, '')
  const to = digits.length === 8 ? `65${digits}` : digits
  const message = () => window.open(`https://wa.me/${to}?text=${encodeURIComponent(`Hi ${designerFirst}, it’s ${clientFirst} about quote ${q.number}. `)}`, '_blank', 'noopener')
  const download = () => { if (phone && !printed) { setPrinted(true); window.setTimeout(() => printPaper(), 600) } else printPaper() }
  return (
    <div className={shell.page} data-testid="quote-view-page">
      <header className={shell.top}>
        <span className={shell.brand}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {data.brand.logo ? <img className={shell.logo} src={data.brand.logo} alt="" /> : null}
          <span className={shell.studio}>{data.studio}</span>
        </span>
        <MetaChip icon="visibility">View only</MetaChip>
      </header>
      <div className={shell.body}>
        {/* (S02) while the quote waits for the studio's approval (a revision on its way) the stage stays empty and the card says so */}
        <QuoteStage design={data.design} brand={data.brand} data={data.data} view={data.view} totalMinor={totals.totalMinor} show={data.ready} printed={printed} onPrinted={setPrinted} onPages={setPages} />
        <aside className={shell.card} aria-label="About this quote" data-testid="quote-view-card">
          <span className={shell.eyebrow}>{q.number} · Version {q.version}{data.ready && pages > 1 ? ` · ${pages} pages` : ''}</span>
          {data.ready ? (
            <>
              <h2 className={shell.cardTitle}>{q.title || `Quote ${q.number}`}</h2>
              <p className={shell.cardText} data-testid="quote-view-words">{viewCardWords({ status: q.status, clientFirst, studio: data.studio, designerFirst, confirmedBy: q.confirmedBy, confirmedOn: q.confirmedAt ? displayDateLong(new Date(q.confirmedAt)) : null })}</p>
              <div className={confirm.total}><span>Total</span><strong data-testid="quote-view-total">{money2(totals.totalMinor)}</strong></div>
              <p className={shell.fine} data-testid="quote-view-changed">Last changed {agoText(data.changedAt, Math.max(now, data.now))}</p>
            </>
          ) : (
            <>
              <h2 className={shell.cardTitle} data-testid="quote-view-not-ready">Not ready yet</h2>
              <p className={shell.cardText} data-testid="quote-view-words">{notReadyWords({ clientFirst, studio: data.studio })}</p>
            </>
          )}
          {to ? <Button variant="secondary" appearance="outlined" iconStart={<Icon name="chat" size={20} />} onPress={message} data-testid="quote-view-message">Message {designerFirst}</Button> : null}
          {data.ready ? <Button variant="secondary" appearance="outlined" iconStart={<Icon name="download" size={20} />} onPress={download} data-testid="quote-view-download">Download a copy</Button> : null}
        </aside>
      </div>
    </div>
  )
}
