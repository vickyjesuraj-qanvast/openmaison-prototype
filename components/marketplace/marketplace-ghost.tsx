'use client'

import { useSearchParams } from 'next/navigation'
import { GhostSheet, Bone } from '@/components/shell/skeleton'
import { GhostHead, GhostTabs, Line, Slot, Words, cycle } from '@/components/shell/ghost-kit'
import { useFirstRunShape, useSeedFlag } from '@/lib/ghost-shape'
import gallery from '@/components/company/templates/quote-templates-gallery.module.css'
import es from '@/components/om/empty-state.module.css'
import styles from './marketplace.module.css'

/**
 * (pending modules S24 · REG-708) The Marketplace's ghost — the page's own layout on its own classes: the L1 header (its info glyph), the
 * Brands | Deals strip, the banners' strip (when the feed has banners — the shell's seed says), the bar (the Category pill on Brands · the
 * search, folded at ≤1024 · the sort pill on Brands) and two rows of gallery cards — or, the feed being empty, the empty card. It reads
 * `?view=` as the page does. Its loading.tsx and the page's PageReveal draw it.
 * (the calm UI build 2026-10-27, 6-01) the views as the house strip, the categories one pill, the banners 120, a brand's card its name and one
 * meta line (no drawn logo, no foot line) — as the page now draws them.
 */
export function MarketplaceGhost() {
  const view = useSearchParams().get('view') === 'deals' ? 'deals' : 'brands'
  const first = useFirstRunShape('marketplace')
  const banners = useSeedFlag('marketplace.banners', true)
  return (
    <GhostSheet label="Loading the Marketplace" l1>
      <GhostHead title={128} after={first ? [] : ['icon']} />   {/* (the calm UI build 2026-10-27, W-125) the info glyph beside the title, as the page's */}
      {first ? null : <GhostTabs labels={['Brands', 'Deals']} active={view === 'deals' ? 1 : 0} />}
      <div className={styles.content} aria-hidden>
        {banners ? <div className={styles.banners}><div className={styles.bannerTrack}>{[0, 1].map((i) => <span key={i} className={styles.banner}><Bone w="100%" h={120} r={0} style={{ height: '100%' }} /></span>)}</div></div> : null}
        {first ? (
          <section className={es.empty} data-tone="plain">
            <span className={es.glyph}><Bone w={40} h={40} r={4} /></span>
            <Words as="h3" className={es.title}>No brands on the Marketplace yet</Words>
            <Words as="p" className={es.help}>Qanvast’s partner brands and their deals show here once Qanvast shares them with your studio.</Words>
          </section>
        ) : (
          <>
            <div className={styles.filters}>
              <div className={styles.bar}>
                <div className={styles.views}>{view === 'brands' ? <Slot kind="btn" w={150} className={styles.ghostCat} /> : null}</div>
                <div className={styles.tools}><Slot kind="search" w={280} />{view === 'brands' ? <Slot kind="btn" w={184} className={styles.ghostPill} /> : null}</div>
              </div>
            </div>
            <div className={gallery.grid}>
              {Array.from({ length: 8 }, (_, i) => (
                <div key={i} className={gallery.card}>
                  <span className={styles.coverWrap}>
                    <span className={`${gallery.thumb} ${styles.cover}`}><Bone w="100%" h={160} r={0} style={{ height: '100%' }} /></span>
                  </span>
                  <span className={`${gallery.body} ${view === 'brands' ? styles.brandBody : styles.dealBody}`}>
                    {view === 'deals' ? (
                      <>
                        <Line w={cycle([72, 96, 64, 88], i)} lh={16} h={10} />
                        <span style={{ display: 'flex', flexDirection: 'column' }}><Line w={cycle(['82%', '76%', '88%', '70%'], i)} lh={20} h={14} /><Line w={cycle(['48%', '36%', '52%', '40%'], i)} lh={20} h={14} /></span>
                      </>
                    ) : <Line w={cycle(['62%', '48%', '70%', '54%'], i)} lh={20} h={14} />}
                    <Line w={cycle(['40%', '56%', '34%', '46%'], i)} lh={16} h={10} />
                  </span>
                  {view === 'deals' ? <span className={gallery.usage}><Line w={cycle(['52%', '38%', '60%', '44%'], i)} lh={16} h={10} /></span> : null}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </GhostSheet>
  )
}
