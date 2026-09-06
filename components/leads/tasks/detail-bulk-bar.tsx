'use client'

import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Icon } from '@/components/om/icon'
import { Tooltip } from '@/components/om/tooltip'
import { snackbarRise } from '@/lib/motion'
import styles from './detail-bulk-bar.module.css'

export type DetailBulkBarProps = {
  count: number
  /** Link-text actions left to right; `tone: 'danger'` paints the label red (Delete / Delete All). */
  actions: { label: string; onClick: () => void; tone?: 'danger' }[]
  onClear: () => void
  /** Render inside a modal panel (absolute, bottom 24) instead of fixed to the viewport — the Deleted Files sheet. */
  inset?: boolean
}

/**
 * Lead Details bulk bar (902:26567 / frames 192 · 159; the Files bar 931:39568 measures the same geometry) — floating
 * bottom-centre: count box · link actions 24 apart · 1×24 rule · ✕. One component for every selection inside Lead
 * Details (Tasks · Quotes · Files · Deleted Files — audit 2026-08-30, UI-15); the listing keeps its own bar
 * (components/leads/bulk-bar.tsx, REG-46). Stays mounted at count 0 so the `snackbarRise` exit plays (T8).
 */
export function DetailBulkBar({ count, actions, onClear, inset = false }: DetailBulkBarProps) {
  /* (REG-358, user 2026-09-06: "when this is revealed push the fab button top") The bar and the Maison AI FAB share
     the bottom of a phone screen, and the bar covered it. It publishes its height and its presence on the document
     while it is up; the FAB's own stylesheet steps over that (components/shell/maison-fab.module.css). Layout is
     read in an effect, after paint — never during render. */
  const bar = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = bar.current
    if (count <= 0 || !el || inset) return
    document.documentElement.style.setProperty('--app-bulk-bar-height', `${Math.round(el.getBoundingClientRect().height)}px`)
    document.body.setAttribute('data-om-bulk-bar', '')
    return () => {
      document.body.removeAttribute('data-om-bulk-bar')
      document.documentElement.style.removeProperty('--app-bulk-bar-height')
    }
  }, [count, inset])

  return (
    <AnimatePresence>
      {count > 0 ? (
        <motion.div
          ref={bar}
          className={styles.bar}
          data-inset={inset || undefined}
          role="toolbar" aria-label={`${count} selected`}
          variants={snackbarRise}
          initial="initial" animate="animate" exit="exit"
          style={{ x: '-50%' }}
        >
          <span className={styles.count}>{count}</span>
          {actions.map((a) => (
            <button key={a.label} type="button" className={styles.link} data-danger={a.tone === 'danger' || undefined} onClick={a.onClick}>
              {a.label}
            </button>
          ))}
          <span className={styles.rule} aria-hidden />
          <Tooltip label="Clear selection" side="top">
            <button type="button" className={styles.close} aria-label="Clear selection" onClick={onClear}>
              <Icon name="close" size={24} />
            </button>
          </Tooltip>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
