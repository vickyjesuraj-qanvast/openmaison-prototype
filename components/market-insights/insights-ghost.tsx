'use client'

import { useSearchParams } from 'next/navigation'
import { GhostSheet, Bone } from '@/components/shell/skeleton'
import { GhostChips, GhostHead, Line, Slot, Words, cycle } from '@/components/shell/ghost-kit'
import { useFirstRunShape, useSeedFlag } from '@/lib/ghost-shape'
import { SAMPLES_NOTE, SOURCE_LINE } from '@/lib/market-insights/model'
import gallery from '@/components/company/templates/quote-templates-gallery.module.css'
import es from '@/components/om/empty-state.module.css'
import styles from './market-insights.module.css'

/** The categories' words as the chips draw them (their counts are the data the ghost can't know — a figure each). */
const CATS = ['All · 6', 'Trends · 2', 'Reports · 2', 'Case Studies · 1', 'Industry News · 1']

/** A line whose box is the page's line height at every width (the class sets it). */
const Ln = ({ w, h, className }: { w: number | string; h: number; className?: string }) => <Line w={w} h={h} className={className} style={{ height: undefined }} />

/** A card of the list as a ghost — the cover, the eyebrow, two lines of title, two of first lines (desk), the meta line. */
function CardGhost({ i }: { i: number }) {
  return (
    <div className={gallery.card}>
      <span className={`${gallery.open} ${styles.open}`}>
        <span className={`${gallery.thumb} ${styles.cover}`}><Bone w="100%" h={180} r={0} style={{ height: '100%' }} /></span>
        <span className={styles.cardBody}>
          <Line w={cycle([72, 96, 120, 64], i)} lh={16} h={10} />
          <span className={styles.cardTitle}><span className={styles.ghostLines}><Line w={cycle(['88%', '80%', '92%', '76%'], i)} lh={20} h={14} /><Line w={cycle(['56%', '44%', '62%', '38%'], i)} lh={20} h={14} /></span></span>
          <span className={styles.cardExcerpt}><span className={styles.ghostLines}><Line w="94%" lh={16} h={10} /><Line w={cycle(['70%', '58%', '76%', '64%'], i)} lh={16} h={10} /></span></span>
          <span className={styles.cardMeta}><Line w={124} lh={16} h={10} /></span>
        </span>
      </span>
    </div>
  )
}

/**
 * (pending modules S25 · REG-708) Market Insights' ghost — the page's own layout on its own classes: the L1 header, the bar (the categories'
 * chips · the search, folded at ≤1024), the sample note while the demo's articles are samples, the featured article's wide card on All with
 * no search (the shell's seed says one is featured), and the cards — or, the feed being empty, the empty card. It reads `?category=` and
 * `?q=` as the page does. Its loading.tsx and the page's PageReveal draw it.
 */
export function InsightsGhost() {
  const params = useSearchParams()
  const first = useFirstRunShape('market-insights')
  const samples = useSeedFlag('market-insights.samples', true)
  const filtered = !!params.get('category') || !!params.get('q')
  const featured = useSeedFlag('market-insights.featured', true) && !filtered
  return (
    <GhostSheet label="Loading Market Insights" l1>
      <GhostHead title={164} />
      <div className={styles.content} aria-hidden>
        {first ? (
          <section className={es.empty} data-tone="plain">
            <span className={es.glyph}><Bone w={40} h={40} r={4} /></span>
            <Words as="h3" className={es.title}>No articles yet</Words>
            <Words as="p" className={es.help}>Trends, reports, case studies and industry news from OpenMaison’s editors show here once they publish them.</Words>
          </section>
        ) : (
          <>
            <div className={styles.bar}>
              <div className={styles.views}><div className={styles.rail}><GhostChips rail labels={CATS} /></div></div>
              <div className={styles.tools}><Slot kind="search" w={280} /></div>
            </div>
            {samples ? <p className={styles.note}><Bone w={20} h={20} r={4} /><Words>{SAMPLES_NOTE}</Words></p> : null}
            {featured ? (
              <div className={styles.featured}>
                <span className={styles.featuredPic}><Bone w="100%" h={320} r={0} style={{ position: 'absolute', inset: 0, height: '100%' }} /></span>
                <span className={styles.featuredText}>
                  <Line w={84} lh={16} h={10} />
                  <span className={`${styles.featuredTitle} ${styles.ghostLines}`}><Ln w="90%" h={20} className={styles.ghostFeatTitle} /><Ln w="64%" h={20} className={styles.ghostFeatTitle} /></span>
                  <span className={styles.featuredExcerpt}><span className={styles.ghostLines}><Ln w="96%" h={12} className={styles.ghostFeatText} /><Ln w="92%" h={12} className={styles.ghostFeatText} /><Ln w="54%" h={12} className={styles.ghostFeatText} /></span></span>
                  <span className={styles.tags}>{[68, 40, 56, 72].map((w, k) => <Bone key={k} w={w} h={20} r={4} />)}</span>
                  <span className={styles.byline}><Bone w={36} h={36} r={4} /><span className={styles.bylineText}><Line w={128} lh={20} h={12} /><Line w={124} lh={16} h={10} /></span></span>
                </span>
              </div>
            ) : null}
            {/* All draws the list's two rows; a category or a search lists what the ghost can't know — one row, and the list's foot below it */}
            <div className={styles.grid}>{Array.from({ length: filtered ? 4 : featured ? 5 : 6 }, (_, i) => <CardGhost key={i} i={i} />)}</div>
            {filtered ? null : <p className={styles.source}><Words>{SOURCE_LINE}</Words></p>}
          </>
        )}
      </div>
    </GhostSheet>
  )
}
