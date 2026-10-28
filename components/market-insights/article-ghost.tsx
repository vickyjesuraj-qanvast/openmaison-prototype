'use client'

import { usePathname } from 'next/navigation'
import { GhostSheet, Bone } from '@/components/shell/skeleton'
import { GhostHead2, Line, Words, phoneOnly } from '@/components/shell/ghost-kit'
import { useSeedFlag } from '@/lib/ghost-shape'
import { SAMPLE_NOTE } from '@/lib/market-insights/model'
import { peekFor } from './peek'
import mi from './market-insights.module.css'
import styles from './article.module.css'

/** A fallback line whose box is the page's line height at every width (the class sets it, not a fixed number). */
const Ln = ({ w, h, className, phone = false }: { w: number | string; h: number; className?: string; phone?: boolean }) => <Line w={w} h={h} className={phone ? `${className ?? ""} ${phoneOnly}` : className} style={{ height: undefined }} />

/**
 * (pending modules S25 · REG-708) An article as a ghost — its own layout on its own classes: the L2 header (the crumb and the title), the
 * reading column (the category, the headline, the first lines, the byline over its rule, the sample note while the demo's articles are
 * samples, the cover, a section's heading and its first lines) — the rest of the body and More from Market Insights come after the article's
 * own length, so the ghost leaves them to the page. Opened from a card, it knows the article's own
 * words (components/market-insights/peek.ts) and sets them as bars, so every line lands where the page puts it; a hard load draws the usual
 * shape — a headline of two lines (three on a phone) and three lines of first words (five). Its loading.tsx and the page's PageReveal draw it.
 */
export function ArticleGhost() {
  const id = usePathname().split('/')[2]
  const peek = peekFor(id)
  const seeded = useSeedFlag('market-insights.samples', true)   // the shell's seed: the demo's sample articles are there
  const samples = peek ? peek.sample : seeded
  return (
    <GhostSheet label="Loading the article">
      <GhostHead2 crumb={112} />   {/* (the calm UI build 2026-10-27, 6-34) the page's crumb-only header */}
      <div className={styles.content} aria-hidden>
        <div className={styles.article}>
          <div className={styles.head}>
            {peek ? <Words className={styles.eyebrow}>{peek.eyebrow}</Words> : <span className={styles.eyebrow}><Line w={96} lh={16} h={10} /></span>}
            {peek ? <Words as="p" className={styles.headline}>{peek.title}</Words> : (
              <span className={`${styles.headline} ${mi.ghostLines}`}>
                <Ln w="94%" h={24} className={styles.ghostHead} /><Ln w="62%" h={24} className={styles.ghostHead} /><Ln w="40%" h={20} className={styles.ghostHead} phone />
              </span>
            )}
            {peek ? (peek.excerpt ? <Words as="p" className={styles.standfirst}>{peek.excerpt}</Words> : null) : (
              <span className={`${styles.standfirst} ${mi.ghostLines}`}>
                <Ln w="98%" h={14} className={styles.ghostStand} /><Ln w="96%" h={14} className={styles.ghostStand} /><Ln w="94%" h={14} className={styles.ghostStand} phone /><Ln w="92%" h={14} className={styles.ghostStand} phone /><Ln w="48%" h={14} className={styles.ghostStand} />
              </span>
            )}
            <div className={styles.byline}>
              <Bone w={36} h={36} r={4} />
              <span className={styles.bylineText}>
                <Line w={136} lh={20} h={12} />
                {peek ? <Words className={styles.when}>{peek.when}</Words> : <Line w={180} lh={16} h={10} />}
              </span>
            </div>
          </div>
          {samples ? <p className={styles.note}><Bone w={20} h={20} r={4} /><Words>{SAMPLE_NOTE}</Words></p> : null}
          {!peek || peek.cover ? <Bone w="100%" h={405} r={8} className={styles.hero} style={{ height: 'auto' }} /> : null}
          <div className={styles.body}>
            <span className={`${styles.h2} ${mi.ghostLines}`}><Line w="46%" lh={24} h={18} /></span>
            {/* the body is the article's own words — its first lines only (what follows is the article) */}
            <span className={`${styles.p} ${mi.ghostLines}`}><Ln w="96%" h={12} className={styles.ghostBody} /><Ln w="92%" h={12} className={styles.ghostBody} /><Ln w="64%" h={12} className={styles.ghostBody} /></span>
          </div>
        </div>
      </div>
    </GhostSheet>
  )
}

