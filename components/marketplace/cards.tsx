'use client'

import Link from 'next/link'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { withFrom } from '@/lib/nav'
import { askedShort, dealWhen, dealsWord, endsSoon, reviewsWord, type BrandCardView, type DealView } from '@/lib/marketplace/model'
import gallery from '@/components/company/templates/quote-templates-gallery.module.css'
import styles from './marketplace.module.css'

/**
 * (pending modules S24 — 1.0's BrandCard) A brand on the house gallery card: its photo at 3:2, its logo on the seam, Featured and its first
 * deal over the photo (the deal is a press of its own — it opens the deal), its name and categories, its reviews · deals · "In your vendors",
 * and the card's ⋮ (Open · WhatsApp · Add to my vendors). The whole card opens the brand's page, carrying where it came from. 1.0's two
 * buttons in the card (WhatsApp, View Profile) are the card itself and its ⋮.
 */
export function BrandCard({ b, here, menuOpen, onMenu, onDeal }: {
  b: BrandCardView
  here: string
  menuOpen: boolean
  onMenu: (b: BrandCardView, el: HTMLElement) => void
  onDeal: (d: DealView) => void
}) {
  const deal = b.deals[0] ?? null
  const foot = [b.reviews ? reviewsWord(b.reviews) : null, b.deals.length ? dealsWord(b.deals.length) : null].filter(Boolean).join(' · ')
  return (
    <div className={gallery.card} role="listitem" data-kb-row data-kb-id={b.id} data-testid="market-brand" data-brand={b.id}>
      <Link href={withFrom(`/marketplace/${b.id}`, here)} className={gallery.open} aria-label={`Open ${b.name}`} data-kb-open>
        <span className={styles.coverWrap}>
          <span className={`${gallery.thumb} ${styles.cover}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {b.cover ? <img src={b.cover} alt="" loading="lazy" decoding="async" /> : <span className={styles.coverEmpty}><Icon name="storefront" size={40} weight={300} /></span>}
          </span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {b.logo ? <span className={styles.logo}><img src={b.logo} alt="" /></span> : null}
        </span>
        <span className={`${gallery.body} ${styles.brandBody}`}>
          <span className={`${gallery.nameRow} ${styles.nameRow}`}><Tooltip label={b.name} whenCut><span className={`${gallery.name} ${styles.twoLines}`}>{b.name}</span></Tooltip></span>
          <span className={`${gallery.meta} ${styles.twoLines}`}>{b.categories.join(' · ')}</span>
        </span>
      </Link>
      {b.featuredRank != null || deal ? (
        <span className={styles.ribbons}>
          {b.featuredRank != null ? <span className={styles.flag} data-tone="await" data-testid="brand-featured">Featured</span> : null}
          {/* (REG-820's rule) a deal's words cut by the ribbon say themselves in full on hover */}
          {deal ? <Tooltip label={deal.title} whenCut><button type="button" className={`${styles.flag} ${styles.dealRibbon}`} data-tone="edits" onClick={() => onDeal(deal)} aria-label={`See the deal: ${deal.title}`} data-testid="brand-deal">{deal.title}</button></Tooltip> : null}
        </span>
      ) : null}
      {/* one line at every width: on a phone a vendor's card says just that (its reviews and deals are on its page) */}
      <span className={`${gallery.usage} ${styles.foot}`} data-vendor={b.vendor ? '' : undefined}>
        {b.vendor ? <><span className={styles.footIcon}><Icon name="check_circle" size={14} weight={300} /></span><span>In your vendors</span>{foot ? <span className={styles.footFacts} aria-hidden>·</span> : null}</> : null}
        <span className={b.vendor ? styles.footFacts : undefined}>{foot || (b.vendor ? '' : b.tagline ?? '\u00a0')}</span>
      </span>
      <span className={`${gallery.kebab} ${styles.brandKebab}`}>
        <Tooltip label="More options" disabled={menuOpen}>
          <IconButton icon="more_vert" label={`More options for ${b.name}`} size={24} variant="bare" iconSize={24} iconWeight={300} aria-haspopup="menu" aria-expanded={menuOpen}
                      onClick={(e) => onMenu(b, e.currentTarget)} />
        </Tooltip>
      </span>
    </div>
  )
}

/** (1.0's DealCard) A deal: its picture, the brand above its words, the deal in two lines, when it ends — the soonest in the attention ink — and,
    once someone in the studio asked for it, who and when. The card opens the deal. */
export function DealCard({ d, now, viewerId, onOpen }: { d: DealView; now: number; viewerId: string; onOpen: (d: DealView) => void }) {
  const when = dealWhen(d, now)
  return (
    <div className={gallery.card} role="listitem" data-kb-row data-kb-id={d.id} data-testid="market-deal" data-deal={d.id}>
      <button type="button" className={gallery.open} onClick={() => onOpen(d)} aria-label={`Open the deal ${d.title}`} data-kb-open>
        <span className={`${gallery.thumb} ${styles.cover}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {d.picture ? <img src={d.picture} alt="" loading="lazy" decoding="async" /> : <span className={styles.coverEmpty}><Icon name="sell" size={40} weight={300} /></span>}
        </span>
        <span className={`${gallery.body} ${styles.dealBody}`}>
          <span className={styles.dealBrand}>{d.brandName}</span>
          <span className={styles.dealTitle}>{d.title}</span>
          {when ? <span className={`${gallery.meta}${endsSoon(d, now) ? ` ${styles.soon}` : ''}`}>{when}</span> : null}
        </span>
      </button>
      {d.flash ? <span className={styles.ribbons}><span className={styles.flag} data-testid="deal-flash">Flash deal</span></span> : null}
      <span className={gallery.usage}>{d.asked ? askedShort(d.asked, viewerId) : '\u00a0'}</span>
    </div>
  )
}
