'use client'

import { useEffect, useRef, useState, type RefObject } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Icon } from '@/components/om/icon'
import { duration, spring } from '@/lib/motion'
import { ConfirmDialog } from '@/components/om/confirm-dialog'
import { resetPrototype } from '@/app/leads/actions'
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
  anchorRef,
}: {
  open: boolean
  suggestions: string[]
  onSelect: (s: string) => void
  onClose: () => void
  /** The FAB that opens it — a press there toggles instead of close-then-reopen (REG-153). */
  anchorRef?: RefObject<HTMLElement | null>
}) {
  const ref = useRef<HTMLDivElement>(null)
  // Prototype-only: put everything back to the base state (user 2026-08-29) — leads, imports, tasks, settings and browser prefs.
  const [confirmReset, setConfirmReset] = useState(false)
  const [resetting, setResetting] = useState(false)
  const doReset = async () => {
    setResetting(true)
    try {
      await resetPrototype()
      try { Object.keys(localStorage).filter((k) => k.startsWith('om.')).forEach((k) => localStorage.removeItem(k)) } catch {}
      window.location.replace('/leads')
    } catch { setResetting(false); setConfirmReset(false) }
  }
  useEffect(() => {
    if (!open || confirmReset) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (anchorRef?.current?.contains(t)) return   // the FAB's own press toggles (REG-153)
      if (ref.current && !ref.current.contains(t)) onClose()
    }
    document.addEventListener('keydown', onKey)
    const t = setTimeout(() => document.addEventListener('pointerdown', onDown, true), 0)   // capture: DS (React Aria) buttons stop pointerdown propagation (REG-153)
    return () => { document.removeEventListener('keydown', onKey); clearTimeout(t); document.removeEventListener('pointerdown', onDown, true) }
  }, [open, onClose, confirmReset, anchorRef])

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
          exit={{ opacity: 0, scale: 0.95, y: 6, transition: { duration: duration.toggle } }}
          style={{ transformOrigin: 'bottom right' }}
        >
          <div className={styles.head}>
            {/* The Maison AI mark — the FAB's own sparkle (REG-249), not a stock glyph. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <span className={styles.spark}><img src="/figma-assets/brief-sparkle.svg" width={16} height={16} alt="" /></span>
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
                animate={{ opacity: 1, y: 0, transition: { delay: 0.04 * i, duration: duration.menu } }}
              >
                {s}
              </motion.button>
            ))}
          </div>
          <div className={styles.foot}>
            <button type="button" className={styles.reset} onClick={() => setConfirmReset(true)}>
              <Icon name="restart_alt" size={18} />
              Reset prototype to base
            </button>
          </div>
        </motion.div>
      ) : null}
      <ConfirmDialog open={confirmReset} title="Reset the prototype?" tone="danger"
                     message="Leads, imports, tasks and settings go back to the base state. Anything you tried in this session is lost."
                     confirmLabel={resetting ? 'Resetting…' : 'Reset'} onCancel={() => { if (!resetting) setConfirmReset(false) }} onConfirm={() => { if (!resetting) void doReset() }} />
    </AnimatePresence>
  )
}
