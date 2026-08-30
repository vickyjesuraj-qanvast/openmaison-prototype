'use client'

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
  actions: { label: string; onClick: () => void; tone?: 'danger' }[]
  onClear: () => void
  /** Render inside a modal panel (absolute, bottom 24) instead of fixed to the viewport. */
  inset?: boolean
}) {
  return (
    <AnimatePresence>
      {count > 0 ? (
        <motion.div
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
