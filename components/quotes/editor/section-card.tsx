'use client'

import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { duration, ease } from '@/lib/motion'
import { Icon } from '@/components/om/icon'
import { Tooltip } from '@/components/om/tooltip'
import { useStuck } from '@/components/om/use-stuck'
import styles from './section-card.module.css'

/**
 * One editor section (section-top 1271:39681 / 1260:31210 / 1260:31999 …): the title group is the collapse toggle
 * (keyboard_arrow_up open, keyboard_arrow_down collapsed), the movable sections carry the drag handle the mock draws
 * before the title (drag_indicator 24 Light, on-surface-disabled), and each section's own controls sit in `actions`.
 * `onHandlePointerDown` starts the reorder drag (motion's drag controls, quote-editor.tsx) — absent, no handle is drawn.
 * The body opens and closes as a 200 ms height animation (owner 2026-09-15: the sections' interaction "is not smooth … lot of
 * UI jerks"): it is clipped only while it moves, so a table's floating Expand, the row kebabs and the frozen Total's shadow
 * are free once it has settled; `prefers-reduced-motion` collapses the animation to a cut. `sticky` (REG-570) holds the top
 * under the editor's header + tab strip while the body scrolls, and lets go at the card's end.
 */
export function SectionCard({ id, title, open, onToggle, actions, onHandlePointerDown, fill, sticky, children }: {
  id: string
  title: string
  open: boolean
  onToggle: () => void
  actions?: ReactNode
  onHandlePointerDown?: (e: PointerEvent<HTMLButtonElement>) => void
  /** The card fills its container and its body scrolls (the Items section's full-page Expand, REG-434). */
  fill?: boolean
  /** The top holds under the sticky header + tab strip while the body scrolls (REG-570); its height is written to `--section-top-h`. */
  sticky?: boolean
  children?: ReactNode
}) {
  const bodyId = `${id}-body`
  const reduced = useReducedMotion()
  const [moving, setMoving] = useState(false)
  const card = useRef<HTMLElement>(null)
  const top = useRef<HTMLDivElement>(null)
  const stuck = useStuck(top, card, 'top', !!sticky)
  useEffect(() => {
    if (!sticky) return
    const el = top.current, host = card.current
    if (!el || !host) return
    const ro = new ResizeObserver(() => host.style.setProperty('--section-top-h', `${Math.round(el.getBoundingClientRect().height)}px`))
    ro.observe(el)
    return () => { ro.disconnect(); host.style.removeProperty('--section-top-h') }
  }, [sticky])
  return (
    <section ref={card} id={id} className={styles.card} data-open={open || undefined} data-fill={fill || undefined} aria-labelledby={`${id}-title`}>
      <div ref={top} className={styles.top} data-sticky={sticky || undefined} data-stuck={stuck || undefined}>
        <div className={styles.label}>
          {onHandlePointerDown ? (
            <Tooltip label="Drag to reorder">
              <button type="button" className={styles.handle} aria-label={`Drag to reorder ${title}`} onPointerDown={onHandlePointerDown}>
                <Icon name="drag_indicator" size={24} weight={300} />
              </button>
            </Tooltip>
          ) : null}
          <button type="button" className={styles.toggle} aria-expanded={open} aria-controls={bodyId} onClick={onToggle}>
            <span id={`${id}-title`} className={styles.title}>{title}</span>
            <span className={styles.chev} aria-hidden><Icon name="keyboard_arrow_up" size={20} /></span>
          </button>
        </div>
        {actions ? <div className={styles.actions}>{actions}</div> : null}
      </div>
      {fill ? (
        <div id={bodyId} className={`${styles.body} ${styles.fill}`}>{children}</div>
      ) : (
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div key="body" id={bodyId} className={styles.body} style={{ overflow: moving ? 'hidden' : 'visible' }}
                      initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      transition={reduced ? { duration: 0 } : { height: { duration: duration.step, ease: ease.standard }, opacity: { duration: duration.toggle } }}
                      onAnimationStart={() => setMoving(true)} onAnimationComplete={() => setMoving(false)}>
            {children}
          </motion.div>
        ) : null}
      </AnimatePresence>
      )}
    </section>
  )
}
