'use client'

import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef } from 'react'
import { anchoredSurface } from '@/lib/motion'
import { STAGES, INACTIVE_STAGES, type Stage } from '@/lib/leads/enums'
import { Tooltip } from '@/components/om/tooltip'
import styles from './menus.module.css'
import ddStyles from './stage-dropdown.module.css'

export function StageDropdown({
  open, onClose, onSelect, position, blocked,
}: {
  open: boolean
  onClose: () => void
  onSelect: (stage: Stage) => void
  position: { top: number; left: number } | null
  /** Linear stage movement: returns why a stage can't be chosen yet (shown as a tooltip), or null when it can. */
  blocked?: (stage: Stage) => string | null
}) {
  // aria-disabled rather than `disabled`: disabled buttons swallow pointer events, and the tooltip explains the lock.
  const item = (s: Stage) => {
    const why = blocked?.(s) ?? null
    return (
      <Tooltip key={s} label={why ?? ''} side="right" disabled={!why}>
        <button type="button" role="menuitem" className={styles.item} aria-disabled={why ? true : undefined}
                onClick={why ? undefined : () => onSelect(s)}>{s}</button>
      </Tooltip>
    )
  }
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose() }
    document.addEventListener('keydown', onKey)
    const t = setTimeout(() => document.addEventListener('mousedown', onDown), 0)
    return () => { document.removeEventListener('keydown', onKey); clearTimeout(t); document.removeEventListener('mousedown', onDown) }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && position ? (
        <motion.div ref={ref} className={styles.menu} role="menu"
                    variants={anchoredSurface} initial="initial" animate="animate" exit="exit"
                    style={{ position: 'fixed', top: position.top, left: position.left, transformOrigin: 'top left', width: 200 }}>
          <div className={ddStyles.groupTitle} data-tone="green">
            <span className={ddStyles.dot} data-tone="green" />
            Active
          </div>
          {STAGES.map(item)}
          <div className={ddStyles.rule} role="separator" />
          <div className={ddStyles.groupTitle} data-tone="orange">
            <span className={ddStyles.dot} data-tone="orange" />
            Inactive
          </div>
          {INACTIVE_STAGES.map(item)}
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
