'use client'

import { useCallback, useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { duration, ease } from '@/lib/motion'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { useStuck } from '@/components/om/use-stuck'
import { useEscapeLayer } from '@/components/om/surface'
import { ScreenBar } from '@/components/quotes/screen/screen-bar'
import { useSectionScreen } from '@/components/quotes/screen/screen-context'
import styles from './section-card.module.css'

const noop = () => {}

/**
 * One editor section (section-top 1271:39681 / 1260:31210 / 1260:31999 …): the title group is the collapse toggle
 * (keyboard_arrow_up open, keyboard_arrow_down collapsed), the movable sections carry the drag handle the mock draws
 * before the title (drag_indicator 24 Light, on-surface-disabled), and each section's own controls sit in `actions`.
 * `onHandlePointerDown` starts the reorder drag (motion's drag controls, quote-editor.tsx) — absent, no handle is drawn.
 * The body opens and closes as a 200 ms height animation (owner 2026-09-15: the sections' interaction "is not smooth … lot of
 * UI jerks"): it is clipped only while it moves, so a table's floating Expand, the row kebabs and the frozen Total's shadow
 * are free once it has settled; `prefers-reduced-motion` collapses the animation to a cut. `sticky` (REG-570) holds the top
 * under the editor's header + tab strip while the body scrolls, and lets go at the card's end.
 * (Quotes on the move, P-02 — 2026-10-22) **Screen mode**: inside a section screen (≤1024, `SectionScreenContext` from the editor's host)
 * the card is the screen — its title and `actions` become the 56px bar with ← back to the section list, no fold, no handle, and its body
 * is the screen's scroller (the `fill` body), fixed over the list from the top of the viewport. The section's own content renders
 * unchanged. Esc goes back while the screen is the topmost surface. The Items table's full-page Expand keeps its own frame (`fill`).
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
  const screenCtx = useSectionScreen()
  const screen = fill ? null : screenCtx   // the Items table's Expand keeps its own full-page frame
  const isScreen = !!screen   // the context's object follows the editor's live state (the bar's "16 lines · S$…"); only the fact of being the screen drives the effects
  const stuck = useStuck(top, card, 'top', !!sticky && !isScreen)
  useEffect(() => {
    if (!sticky || isScreen) return
    const el = top.current, host = card.current
    if (!el || !host) return
    const ro = new ResizeObserver(() => host.style.setProperty('--section-top-h', `${Math.round(el.getBoundingClientRect().height)}px`))
    ro.observe(el)
    return () => { ro.disconnect(); host.style.removeProperty('--section-top-h') }
  }, [sticky, isScreen])
  /* (P-02) the screen takes focus once, as it opens (a keyboard tablet tabs from its bar) — never again while its bar's words change under a
     typing finger; Esc is its back while it is the topmost surface */
  const onBack = screen?.onBack
  useEffect(() => { if (isScreen) card.current?.focus({ preventScroll: true }) }, [isScreen])
  /* (quotes on the move, landing fix 2026-10-22 — REG-2584) an Esc typed inside a field, a text editor or the Items grid cancels THAT edit:
     the control blurs and the screen takes the focus back, so the next Esc is the one that leaves. The house layer listens in capture, ahead
     of the grid's own Esc (items-table.tsx), so without this the first Esc in a cell left the whole section (found by the rq-k2 probe). */
  const back = useCallback(() => {
    const a = document.activeElement
    const root = card.current
    if (a instanceof HTMLElement && root && a !== root && root.contains(a) && (a.matches('input, textarea, select, [contenteditable="true"], [contenteditable=""]') || a.closest('[data-kb-own]'))) {
      a.blur(); root.focus({ preventScroll: true }); return
    }
    (onBack ?? noop)()
  }, [onBack])
  useEscapeLayer(isScreen, card, back)
  if (screen) {
    return (
      <section ref={card} id={id} className={styles.screen} data-open="" data-screen="" aria-labelledby={`${id}-title`} tabIndex={-1} data-om-surface="" data-testid="section-screen">
        <ScreenBar className={styles.screenBar} titleId={`${id}-title`} title={screen.title ?? title} subtitle={screen.subtitle} trailing={actions}
                   leading={<Tooltip label="Back to the sections"><IconButton icon="arrow_back" label="Back" variant="bare" iconSize={24} iconWeight={300} onClick={onBack} data-kb="back" data-testid="section-back" /></Tooltip>} />
        <div id={bodyId} className={`${styles.body} ${styles.fill} ${styles.screenBody}`}>{children}</div>
      </section>
    )
  }
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
