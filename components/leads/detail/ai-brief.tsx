'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Button, Tag } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { duration, ease } from '@/lib/motion'
import { briefsFor, type Brief, type BriefLead } from '@/lib/leads/briefs'
import styles from './ai-brief.module.css'

/**
 * Maison AI brief (858:24867) — the gradient card at the top of the Lead Overview's centre column:
 * head (sparkle · "MAISON AI BRIEF" · filled yellow tag) + body (2-line brief with bold runs · two outlined
 * primary buttons). The mock's pager row (dots + ‹ ›) is replaced by a Show more expander (REG-237,
 * user 2026-09-01): the remaining briefs from `briefsFor(stage, lead)` stack below the first card instead of
 * hiding behind a carousel, in the lead form's "Additional info" expander voice.
 * Spec: design-source/context/lead-overview/03-brief-grid.txt.
 */
function BriefCard({ brief, onAction }: { brief: Brief; onAction: (label: string) => void }) {
  return (
    <div className={styles.card}>
      <div className={styles.head}>
        <div className={styles.eyebrow}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/figma-assets/brief-sparkle.svg" width={17} height={17} alt="" className={styles.sparkle} />
          <span className={styles.eyebrowText}>MAISON AI BRIEF</span>
        </div>
        <Tag appearance="filled" color="yellow" className={styles.tag}>{brief.tag}</Tag>
      </div>
      <div className={styles.body}>
        <p className={styles.text}>
          {brief.text.map((run, i) => (run.bold ? <strong key={i} className={styles.bold}>{run.t}</strong> : <span key={i}>{run.t}</span>))}
        </p>
        <div className={styles.actions}>
          {brief.actions.map((label) => (
            <Button key={label} variant="primary" appearance="outlined" onPress={() => onAction(label)}>{label}</Button>
          ))}
        </div>
      </div>
    </div>
  )
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
  // Render-phase adjust: a stage change re-collapses the stack to the new stage's primary brief.
  const [state, setState] = useState({ stage, open: false })
  if (state.stage !== stage) setState({ stage, open: false })
  const open = state.stage === stage && state.open
  const first = briefs[0]
  const rest = briefs.slice(1)
  if (!first) return null

  return (
    <section className={styles.block} aria-label="Maison AI brief" data-expanded={open || undefined}>
      <BriefCard brief={first} onAction={onAction} />
      <AnimatePresence initial={false}>
        {open && rest.length > 0 ? (
          <motion.div
            key="rest"
            className={styles.rest}
            initial={{ height: 0, opacity: 0, overflow: 'hidden' }}
            animate={{ height: 'auto', opacity: 1, transitionEnd: { overflow: 'visible' } }}
            exit={{ height: 0, opacity: 0, overflow: 'hidden' }}
            transition={{ duration: duration.step, ease: ease.standard }}
          >
            <div className={styles.restInner}>
              {rest.map((b) => <BriefCard key={b.tag} brief={b} onAction={onAction} />)}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      {rest.length > 0 ? (
        <div className={styles.toggleRow}>
          <button type="button" className={styles.toggle} aria-expanded={open}
                  onClick={() => setState({ stage, open: !open })}>
            {open ? 'Show less' : 'Show more'}
            <span data-chev><Icon name={open ? 'keyboard_arrow_up' : 'expand_more'} size={20} /></span>
          </button>
        </div>
      ) : null}
    </section>
  )
}
