'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Button, Tag } from '@/components/ds'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { duration, ease } from '@/lib/motion'
import { briefsFor, type BriefLead } from '@/lib/leads/briefs'
import styles from './ai-brief.module.css'

/**
 * Maison AI brief (858:24867) — the gradient card at the top of the Lead Overview's centre column:
 * head (sparkle · "MAISON AI BRIEF" · filled yellow tag) + body (2-line brief with bold runs · two outlined
 * primary buttons), then a pager row (dots + ‹ ›) that steps through `briefsFor(stage, lead)` with a 150ms
 * crossfade (`duration.toggle`) and wraps at both ends.
 * Spec: design-source/context/lead-overview/03-brief-grid.txt.
 */
const fade = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: duration.toggle, ease: ease.standard } },
  exit: { opacity: 0, transition: { duration: duration.toggle, ease: ease.standard } },
}

export function AiBrief({
  stage,
  lead,
  onAction,
}: {
  stage: string
  lead: BriefLead
  onAction: (label: string) => void
}) {
  const briefs = briefsFor(stage, lead)
  // Render-phase adjust: a stage change restarts the carousel at its first brief.
  const [cursor, setCursor] = useState({ stage, idx: 0 })
  if (cursor.stage !== stage) setCursor({ stage, idx: 0 })
  const idx = cursor.stage === stage ? Math.min(cursor.idx, briefs.length - 1) : 0
  const brief = briefs[idx] ?? briefs[0]
  const step = (d: 1 | -1) => setCursor({ stage, idx: (idx + d + briefs.length) % briefs.length })
  if (!brief) return null

  return (
    <div className={styles.block} data-brief={idx}>
      <section className={styles.card} aria-label="Maison AI brief">
        <div className={styles.head}>
          <div className={styles.eyebrow}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/figma-assets/brief-sparkle.svg" width={17} height={17} alt="" className={styles.sparkle} />
            <span className={styles.eyebrowText}>MAISON AI BRIEF</span>
          </div>
          <AnimatePresence initial={false} mode="popLayout">
            <motion.div key={idx} className={styles.tagWrap} {...fade}>
              <Tag appearance="filled" color="yellow" className={styles.tag}>{brief.tag}</Tag>
            </motion.div>
          </AnimatePresence>
        </div>
        <div className={styles.bodyWrap}>
          <AnimatePresence initial={false} mode="popLayout">
            <motion.div key={idx} className={styles.body} {...fade}>
              <p className={styles.text}>
                {brief.text.map((run, i) => (run.bold ? <strong key={i} className={styles.bold}>{run.t}</strong> : <span key={i}>{run.t}</span>))}
              </p>
              <div className={styles.actions}>
                {brief.actions.map((label) => (
                  <Button key={label} variant="primary" appearance="outlined" onPress={() => onAction(label)}>{label}</Button>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      <div className={styles.pager}>
        <div className={styles.dots} aria-hidden>
          {briefs.map((b, i) => (
            <span key={b.tag} className={styles.dot} data-active={i === idx || undefined} />
          ))}
        </div>
        <Tooltip label="Previous brief">
          <IconButton icon="keyboard_arrow_left" label="Previous brief" size={24} className={styles.pagerBtn} onClick={() => step(-1)} />
        </Tooltip>
        <Tooltip label="Next brief">
          <IconButton icon="keyboard_arrow_right" label="Next brief" size={24} className={styles.pagerBtn} onClick={() => step(1)} />
        </Tooltip>
      </div>
    </div>
  )
}
