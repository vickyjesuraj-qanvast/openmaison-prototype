'use client'

import Link from 'next/link'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { withFrom } from '@/lib/nav'
import { askedShort, dealWhen, dealsWord, endsSoon, realLogo, type BrandCardView, type DealView } from '@/lib/marketplace/model'
import gallery from '@/components/company/templates/quote-templates-gallery.module.css'
import styles from './marketplace.module.css'

/**
 * (pending modules S24 — 1.0's BrandCard) A brand on the house gallery card: its photo at 3:2 (its logo on the seam, when the brand has one of
 * its own), its deals' count over the photo (a press of its own: one deal opens it, several open the brand's page, where they are), its name and
 * ONE meta line — its categories, or "In your vendors" when it is one — and the card's ⋮ (Open · WhatsApp · Add to my vendors). The whole card
 * opens the brand's page, carrying where it came from. 1.0's two buttons in the card (WhatsApp, View Profile) are the card itself and its ⋮.
 * (the calm UI build 2026-10-27, 6-01 · 6-21) The card used to carry Featured AND the first deal's words over its photo (the deal cut mid-
 * sentence), a monogram standing in for a logo, and a second line of reviews and deals: Featured stays on the brand's page (a featured brand
 * still sorts first), the reviews are the brand page's About line, the deal's words are its own card in Deals and on the brand's page.
 */
export function BrandCard({ b, here, menuOpen, onMenu, onDeal, onDeals }: {
  b: BrandCardView
  here: string
  menuOpen: boolean
  onMenu: (b: BrandCardView, el: HTMLElement) => void
  onDeal: (d: DealView) => void
  /** several deals: the brand's page, where they are */
  onDeals: (b: BrandCardView) => void
}) {
  const deal = b.deals[0] ?? null
  const logo = realLogo(b.logo)
  const several = b.deals.length > 1
  return (
    <div className={gallery.card} role="listitem" data-kb-row data-kb-id={b.id} data-testid="market-brand" data-brand={b.id}>
      <Link href={withFrom(`/marketplace/${b.id}`, here)} className={gallery.open} aria-label={`Open ${b.name}`} data-kb-open>
        <span className={styles.coverWrap}>
          <span className={`${gallery.thumb} ${styles.cover}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {b.cover ? <img src={b.cover} alt="" loading="lazy" decoding="async" /> : <span className={styles.coverEmpty}><Icon name="storefront" size={40} weight={300} /></span>}
          </span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {logo ? <span className={styles.logo}><img src={logo} alt="" /></span> : null}
        </span>
        <span className={`${gallery.body} ${styles.brandBody}`} data-logo={logo ? '' : undefined}>
          <span className={`${gallery.nameRow} ${styles.nameRow}`}><Tooltip label={b.name} whenCut><span className={`${gallery.name} ${styles.twoLines}`}>{b.name}</span></Tooltip></span>
          {b.vendor ? (
            <span className={`${gallery.meta} ${styles.metaLine}`} data-testid="brand-in-vendors"><span className={styles.footIcon}><Icon name="check_circle" size={14} weight={300} /></span><span>In your vendors</span></span>
          ) : <span className={`${gallery.meta} ${styles.twoLines}`}>{b.categories.join(' · ') || ' '}</span>}
        </span>
      </Link>
      {deal ? (
        <span className={styles.ribbons}>
          {/* one badge on the photo: how many deals — one opens it, several open the brand's page (its Deals card lists them) */}
          <button type="button" className={`${styles.flag} ${styles.dealRibbon}`} data-tone="edits" onClick={() => (several ? onDeals(b) : onDeal(deal))}
                  aria-label={several ? `See ${b.name}’s ${dealsWord(b.deals.length)}` : `See the deal: ${deal.title}`} data-testid="brand-deal">{dealsWord(b.deals.length)}</button>
        </span>
      ) : null}
      <span className={`${gallery.kebab} ${styles.brandKebab}`}>
        <Tooltip label="More options" disabled={menuOpen}>
          <IconButton icon="more_vert" label={`More options for ${b.name}`} size={24} variant="bare" iconSize={24} iconWeight={300} aria-haspopup="menu" aria-expanded={menuOpen}
                      onClick={(e) => onMenu(b, e.currentTarget)} />
        </Tooltip>
      </span>
    </div>
  )
}

/** (1.0's DealCard) A deal: its picture, the brand above its words, the deal in full (the calm UI build 2026-10-27, 6-21: it wraps — never cut),
    when it ends — the soonest in the attention ink — and, once someone in the studio asked for it, who and when. The card opens the deal. On a
    brand's own page the brand line steps aside (6-11: the page is the brand). */
export function DealCard({ d, now, viewerId, onOpen, brand = true }: { d: DealView; now: number; viewerId: string; onOpen: (d: DealView) => void; brand?: boolean }) {
  const when = dealWhen(d, now)
  return (
    <div className={gallery.card} role="listitem" data-kb-row data-kb-id={d.id} data-testid="market-deal" data-deal={d.id}>
      <button type="button" className={gallery.open} onClick={() => onOpen(d)} aria-label={`Open the deal ${d.title}`} data-kb-open>
        <span className={`${gallery.thumb} ${styles.cover}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {d.picture ? <img src={d.picture} alt="" loading="lazy" decoding="async" /> : <span className={styles.coverEmpty}><Icon name="sell" size={40} weight={300} /></span>}
        </span>
        <span className={`${gallery.body} ${styles.dealBody}`}>
          {brand ? <span className={styles.dealBrand}>{d.brandName}</span> : null}
          <span className={styles.dealTitle}>{d.title}</span>
          {when ? <span className={`${gallery.meta}${endsSoon(d, now) ? ` ${styles.soon}` : ''}`}>{when}</span> : null}
        </span>
      </button>
      {d.flash ? <span className={styles.ribbons}><span className={styles.flag} data-testid="deal-flash">Flash deal</span></span> : null}
      <span className={gallery.usage}>{d.asked ? <span className={styles.wrapLine}>{askedShort(d.asked, viewerId)}</span> : ' '}</span>   {/* (T-12) who asked and when wraps on a phone, never cut */}
    </div>
  )
}
