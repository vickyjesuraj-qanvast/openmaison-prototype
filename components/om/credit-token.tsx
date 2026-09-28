'use client'

import { useId, type CSSProperties } from 'react'
import styles from './credit-token.module.css'

/**
 * (REG-701 · REG-706 · REG-710) The AI credit's glyph: Maison AI's spark — the mark every AI surface in 2.0 wears (the Maison AI button,
 * Draft with Maison AI, the quote editor's AI rows) — always in full colour, and the level as a thin ring round it (owner 2026-09-28,
 * option B of the Credit Spark page: "I'm okay with the ai icon and the container. But the way icon color representation is bad"). The
 * spark is the unit, like a currency sign: it never drains or changes colour; the ring does. The ring starts at 12 o'clock and runs
 * clockwise to what is left, in the spark's own gradient · amber when low · a red track when the studio is out · an amber track when a
 * member's monthly amount is used. `current` (a solid spark in the text colour) sits inside filled buttons and cost chips, ringless.
 * Decorative — every place it sits names the number in words.
 *
 * (REG-706, owner: "I like the diamond's size") Alone, the spark sits in the box at the Free gem's size: Material Symbols' diamond fills
 * about 19 × 17 of its 24px box, the mark file fills all of its own, so the spark is drawn at `SPARK` of the box. (REG-718, owner: "make the
 * circle and the icon little smaller … it looks bigger compared to other icons in the sidebar") With its ring, the whole mark is an icon's
 * size: the ring lies inside the box, 1px in, as a glyph's ink does (a 22 ring in the rail's 24 box, stroke 2), and the spark inside it is
 * `SPARK_IN_RING` of the box (12 in the rail). Below 24px the ring is left off — the number beside the spark carries the level (the
 * chip, Plans' lines).
 */
export type TokenTone = 'healthy' | 'low' | 'empty' | 'capped' | 'current'

const MARK = '/figma-assets/maison-ai-mark.svg'
/** The spark's share of the icon box when it stands alone — the Free gem's visual size (18px in a 24 box). */
export const SPARK = 0.75
/** …and inside its ring (REG-718): half the box, 12px in the rail's 24. */
export const SPARK_IN_RING = 0.5
/** 0…1 as a percentage of the ring, one decimal. */
export const levelPct = (level: number): number => Math.round(Math.max(0, Math.min(1, Number.isFinite(level) ? level : 1)) * 1000) / 10

/** The ring's geometry for a box (REG-718): inside it, 1px in, as a glyph's ink is — stroke 2 and a 22 ring in the rail's 24 box, 3px
 *  clear of the spark; stroke 3 from a 36 box. `d` is the drawing's side: the box itself. */
export function ringOf(size: number) {
  const w = Math.min(3, Math.max(2, Math.round(size / 12)))
  const r = (size - 2) / 2 - w / 2
  return { w, r, d: size }
}

/** The upgrade moment and Plans' Done step: the ring's arc grows from empty to its level on the sheet timing. Returns its cleanup. */
export function fillFromEmpty(el: SVGCircleElement | null, ms = 900): () => void {
  if (!el || typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {}
  const to = el.getAttribute('stroke-dasharray') ?? '0 100'
  el.style.transition = 'none'
  el.style.strokeDasharray = '0 100'
  void el.getBoundingClientRect()
  el.style.transition = `stroke-dasharray ${ms}ms cubic-bezier(0, 0, 0.2, 1)`
  const id = requestAnimationFrame(() => { el.style.strokeDasharray = to })
  const done = setTimeout(() => { el.style.transition = ''; el.style.strokeDasharray = '' }, ms + 60)
  return () => { cancelAnimationFrame(id); clearTimeout(done) }
}

export function CreditToken({ size = 24, level = 1, tone = 'healthy', ring, className, style, fillRef, sparkClassName }: {
  size?: number
  /** How much is left, 0…1 — the ring's length. */
  level?: number
  tone?: TokenTone
  /** The level's ring. On at 24 and above; off below (the number beside the spark carries it) and for `current`. */
  ring?: boolean
  className?: string
  style?: CSSProperties
  /** The ring's arc — the upgrade moment and the Done step grow it from empty (`fillFromEmpty`). */
  fillRef?: (el: SVGCircleElement | null) => void
  /** A class on the spark alone — the paid row's 8-second turn (REG-706). The ring never turns with it. */
  sparkClassName?: string
}) {
  const gid = `ct${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const showRing = (ring ?? size >= 24) && tone !== 'current'
  const inner = Math.round(size * (showRing ? SPARK_IN_RING : SPARK) * 10) / 10
  const box: CSSProperties = { width: size, height: size, ...style }
  const spark: CSSProperties = { width: inner, height: inner }
  if (tone === 'current') {
    return (
      <span className={`${styles.token} ${className ?? ''}`} data-tone={tone} style={box} aria-hidden>
        <span className={styles.solid} style={{ ...spark, WebkitMaskImage: `url(${MARK})`, maskImage: `url(${MARK})` }} />
      </span>
    )
  }
  const { w, r, d } = ringOf(size)
  const c = d / 2
  const pct = tone === 'empty' || tone === 'capped' ? 0 : levelPct(level)
  return (
    <span className={`${styles.token} ${className ?? ''}`} data-tone={tone} style={box} aria-hidden>
      <span className={`${styles.sparkBox} ${sparkClassName ?? ''}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={styles.spark} src={MARK} alt="" draggable={false} style={spark} />
      </span>
      {showRing ? (
        <svg className={styles.ring} width={d} height={d} viewBox={`0 0 ${d} ${d}`} style={{ left: (size - d) / 2, top: (size - d) / 2 }} focusable="false">
          <defs>
            {/* the spark's own stops (the mark file's gradient), across the ring's box */}
            <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#AB2576" /><stop offset="0.447" stopColor="#DF4D2A" /><stop offset="1" stopColor="#EE8E2B" /></linearGradient>
          </defs>
          <circle className={styles.track} cx={c} cy={c} r={r} strokeWidth={w} fill="none" />
          {pct > 0 ? (
            <circle ref={fillRef} className={styles.arc} cx={c} cy={c} r={r} strokeWidth={w} fill="none" stroke={`url(#${gid})`} strokeLinecap="round"
                    pathLength={100} strokeDasharray={`${pct} 100`} transform={`rotate(-90 ${c} ${c})`} />
          ) : null}
        </svg>
      ) : null}
    </span>
  )
}
