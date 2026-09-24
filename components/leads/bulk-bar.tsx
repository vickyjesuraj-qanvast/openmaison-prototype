'use client'

import { useEffect, useRef, type MouseEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Icon } from '@/components/om/icon'
import { Tooltip } from '@/components/om/tooltip'
import { snackbarRise } from '@/lib/motion'
import styles from './bulk-bar.module.css'

/**
 * B1 bulk-action bar — visual pattern lifted from the Deleted Leads sheet's
 * floating selection bar (count chip · actions · divider · close).
 */
export function BulkBar({
  count,
  actions,
  onClear,
  inset = false,
}: {
  count: number
  /** (REG-610) The press carries its event: the listing's Assign anchors a popover to the button. */
  actions: { label: string; onClick: (e: MouseEvent<HTMLButtonElement>) => void; tone?: 'danger' }[]
  onClear: () => void
  /** Render inside a modal panel (absolute, bottom 24) instead of fixed to the viewport. */
  inset?: boolean
}) {
  /* (REG-358, user 2026-09-06: "when this is revealed push the fab button top") The bar and the Maison AI FAB
     both live on the bottom-right of a phone screen, and the bar covered it. It publishes its own height and
     its presence on the document while it is up; the FAB's stylesheet lifts itself over that (maison-fab.module.css).
     Layout is read in an effect, after paint — never during render. */
  const bar = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = bar.current
    if (count <= 0 || !el) return
    document.documentElement.style.setProperty('--app-bulk-bar-height', `${Math.round(el.getBoundingClientRect().height)}px`)
    document.body.setAttribute('data-om-bulk-bar', '')
    return () => {
      document.body.removeAttribute('data-om-bulk-bar')
      document.documentElement.style.removeProperty('--app-bulk-bar-height')
    }
  }, [count])

  return (
    <AnimatePresence>
      {count > 0 ? (
        <motion.div
          ref={bar}
          className={styles.bar}
          data-inset={inset || undefined}
          variants={snackbarRise}
          initial="initial" animate="animate" exit="exit"
          style={{ x: '-50%' }}
        >
          <span className={styles.count}>{count}</span>
          {actions.map((a, i) => (
            <span key={a.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 16 }}>
              {i > 0 ? <span className={styles.divider} /> : null}
              <button type="button" className={styles.link} data-danger={a.tone === 'danger' || undefined} onClick={a.onClick}>{a.label}</button>
            </span>
          ))}
          <span className={styles.divider} />
          <Tooltip label="Clear selection">
            <button type="button" className={styles.close} aria-label="Clear selection" onClick={onClear}>
              <Icon name="close" size={20} />
            </button>
          </Tooltip>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
