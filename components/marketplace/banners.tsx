'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ScrollPagers } from '@/components/om/scroll-pagers'
import { withFrom } from '@/lib/nav'
import type { BannerView } from '@/lib/marketplace/model'
import styles from './marketplace.module.css'

/**
 * (pending modules S24 — 1.0's HeroBanner, "Banners at the top (fixed pictures)") The feed's banners as a strip of pictures with their words
 * over them: one a view on a desk (the house edge pagers step through them), the next one peeking on a phone so a thumb knows to swipe. Each
 * opens what it names — a brand's page (with the way back), a deal (its dialog, here), or the brand's own site in a new tab. Nothing moves on
 * its own (1.0 turned every 4 s): the viewer steps through them — motion with purpose, and a page that never shifts under a reading eye.
 */
export function Banners({ banners, here, onDeal }: { banners: BannerView[]; here: string; onDeal: (dealId: string) => void }) {
  const track = useRef<HTMLDivElement | null>(null)
  const [at, setAt] = useState(0)
  /* which banner is in view — the counter's "2 / 3" (a scroll on the track, never in render) */
  useEffect(() => {
    const el = track.current
    if (!el || banners.length < 2) return
    const read = () => { const w = el.firstElementChild instanceof HTMLElement ? el.firstElementChild.offsetWidth : el.clientWidth; setAt(Math.min(banners.length - 1, Math.max(0, Math.round(el.scrollLeft / Math.max(1, w))))) }
    el.addEventListener('scroll', read, { passive: true })
    return () => el.removeEventListener('scroll', read)
  }, [banners.length])
  return (
    <section className={styles.banners} aria-label="From the Marketplace’s partners" data-testid="market-banners">
      <div ref={track} className={styles.bannerTrack}>
        {banners.map((n, i) => {
          const inner = (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={n.picture} alt="" loading={i === 0 ? 'eager' : 'lazy'} decoding="async" />
              <span className={styles.bannerText}>
                <span className={styles.bannerTitle}>{n.title}</span>
                {n.line ? <span className={styles.bannerLine}>{n.line}</span> : null}
              </span>
            </>
          )
          const deal = /^\/marketplace\?(.+)$/.exec(n.href) ? new URLSearchParams(n.href.split('?')[1]).get('deal') : null
          if (deal) return <a key={n.id} href={n.href} className={styles.banner} data-testid="market-banner" onClick={(e) => { if (e.metaKey || e.ctrlKey || e.shiftKey) return; e.preventDefault(); onDeal(deal) }}>{inner}</a>
          if (n.external) return <a key={n.id} href={n.href} className={styles.banner} target="_blank" rel="noopener noreferrer" data-testid="market-banner">{inner}</a>
          return <Link key={n.id} href={withFrom(n.href, here)} className={styles.banner} data-testid="market-banner">{inner}</Link>
        })}
      </div>
      {banners.length > 1 ? <span className={styles.bannerCount} aria-hidden>{at + 1} / {banners.length}</span> : null}
      <ScrollPagers scrollRef={track} fades={false} step={(w) => w} labels={['Previous banner', 'Next banner']} />
    </section>
  )
}
