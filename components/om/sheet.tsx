'use client'

import { useCallback, useRef, useSyncExternalStore, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { bottomSheet, overlayFade } from '@/lib/motion'
import { SurfaceFoot, SurfaceHead } from './surface-parts'
import { useOverflow } from './use-overflow'
import { useScrollLock } from './use-scroll-lock'
import { useDialogFocus, useEscapeLayer } from './surface'
import styles from './sheet.module.css'

const QUERY = '(max-width: 767px)'

const subscribe = (cb: () => void) => {
  if (typeof window === 'undefined') return () => {}
  const mql = window.matchMedia(QUERY)
  mql.addEventListener('change', cb)
  return () => mql.removeEventListener('change', cb)
}

/**
 * True on the phone breakpoint (REG-353), where the mobile canvas replaces every anchored surface — menus,
 * the stage picker, the tasks / assign popovers, the task panel — with a bottom sheet. Read through
 * `useSyncExternalStore` so it is never a layout read in render and the server always renders the desktop
 * surface (the media query is re-evaluated on the client's first commit).
 */
export function useSheetLayout(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  )
}

/**
 * The mobile bottom sheet. Rendered through a body portal so an anchored surface's own scroll container (a
 * card, a modal body, the toolbar row it was absolutely positioned inside) cannot clip it, and layered above
 * the fixed dock. Esc closes it when it is the topmost surface, a press on the scrim closes it, focus moves
 * in on open and returns to the opener on close (components/om/surface.ts) — the same contract as Dialog.
 */
export function Sheet({
  open, onClose, title, subtitle, children, footer, headActions, role = 'dialog', label, bodyClassName,
}: {
  open: boolean
  onClose: () => void
  /** Heading line. Omit for a bare list sheet (the grabber and the rows only). */
  title?: string
  /** One secondary line under the title — the canvas' "9123 4567 · Current stage: Contacted". */
  subtitle?: ReactNode
  children: ReactNode
  /** Pinned under the scrolling body, above the home indicator — the sheet's own action row (canvas 1i "Add Task"). */
  footer?: ReactNode
  /** (REG-380) Controls that belong beside the title, before the close — the canvas' Auto Fill / Edit on 3e. */
  headActions?: ReactNode
  /** 'menu' when the sheet hosts menu items, so the rows keep their menu semantics. */
  role?: string
  /** Accessible name when there is no visible title. */
  label?: string
  bodyClassName?: string
}) {
  const panel = useRef<HTMLDivElement>(null)
  const [scrollRef, bodyScrolls] = useOverflow()   // (REG-725) the foot's shadow only while the body scrolls under it
  useScrollLock(open)   // the page never scrolls behind this surface
  useEscapeLayer(open, panel, onClose)
  useDialogFocus(open, panel)
  const onScrim = useCallback((e: React.MouseEvent) => { if (e.target === e.currentTarget) onClose() }, [onClose])
  if (typeof document === 'undefined') return null
  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div className={styles.scrim} variants={overlayFade} initial="initial" animate="animate" exit="exit" onMouseDown={onScrim}>
          <motion.div ref={panel} className={styles.sheet} variants={bottomSheet} initial="initial" animate="animate" exit="exit"
                      role={role} aria-modal="true" aria-label={label ?? title} tabIndex={-1}>
            <span className={styles.grabber} aria-hidden />
            {/* (REG-725) the house head and foot, on the sheet's own 12 / 16 padding (REG-308 · REG-372) */}
            {title ? <SurfaceHead title={title} subtitle={subtitle} actions={headActions} onClose={onClose} className={styles.head} /> : null}
            <div ref={scrollRef} className={`${styles.body} ${bodyClassName ?? ''}`}>{children}</div>
            {footer ? <SurfaceFoot shadow={bodyScrolls} className={styles.foot}>{footer}</SurfaceFoot> : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}

/** The sheet body class for a menu (full-width rows, no card chrome) — used by Dropdown. */
export const sheetMenuBody = styles.menuBody
