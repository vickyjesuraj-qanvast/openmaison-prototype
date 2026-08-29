'use client'

import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Icon } from '@/components/om/icon'
import { spring } from '@/lib/motion'
import styles from './ai-sheet.module.css'

/**
 * A4 (approved decision): scripted, display-only Maison AI suggestion sheet.
 * Styling follows the "Maison AI Brief" pattern from the Lead Details mocks
 * (outlined purple suggestion buttons under a ✨ header). Springs from the
 * FAB's corner. REG: content is canned; clicking a suggestion → coming-soon.
 */
export function AiSheet({
  open,
  suggestions,
  onSelect,
  onClose,
}: {
  open: boolean
  suggestions: string[]
  onSelect: (s: string) => void
  onClose: () => void
}) {
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
      {open ? (
        <motion.div
          ref={ref}
          className={styles.sheet}
          role="dialog"
          aria-label="Maison AI suggestions"
          initial={{ opacity: 0, scale: 0.9, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0, transition: spring.settle }}
          exit={{ opacity: 0, scale: 0.95, y: 6, transition: { duration: 0.15 } }}
          style={{ transformOrigin: 'bottom right' }}
        >
          <div className={styles.head}>
            <span className={styles.spark}><Icon name="auto_awesome" size={16} fill /></span>
            Maison AI
          </div>
          <div className={styles.body}>
            {suggestions.map((s, i) => (
              <motion.button
                key={s}
                type="button"
                className={styles.suggestion}
                onClick={() => onSelect(s)}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0, transition: { delay: 0.04 * i, duration: 0.18 } }}
              >
                {s}
              </motion.button>
            ))}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
