'use client'

import { createPortal } from 'react-dom'

import { useRef, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { bottomSheet, modalPanel, overlayFade } from '@/lib/motion'
import { useScrollLock } from './use-scroll-lock'
import { useDialogFocus, useEscapeLayer } from './surface'
import { useOverflow } from './use-overflow'
import { useSheetFootLift, useSheetLayout } from './sheet'
import { SurfaceFoot, SurfaceHead } from './surface-parts'
import styles from './dialog.module.css'

export type DialogSize = 'compact' | 'standard' | 'form' | 'modal'

export { SurfaceHead, SurfaceFoot, FootStart, surfaceClasses } from './surface-parts'

/**
 * The app-wide dialog shell (On Hold / Lost, Auto Fill, Suggested tasks, every delete / export / rename / confirm dialog).
 * Scrim = the mock's overlay/60p (780:91936); `nested` = the lighter overlay/20p when it layers over an open modal
 * (the Move stage window's Auto Fill / Suggested tasks). Esc closes it when it is the topmost surface; focus moves in on
 * open, Tab stays inside, and returns to the opener on close (components/om/surface.ts).
 */
export function Dialog({
  open, onClose, title, subtitle, width = 400, children, footer, size = 'compact', nested = false, alert = false,
  eyebrow, leading, actions, height, minHeight, portal = false, fluid = false, flush = false, closeOnScrim = true, phoneFull = false,
}: {
  open: boolean; onClose: () => void; title: string; subtitle?: ReactNode
  /** A footer is optional: a modal drawn without one (the templates library, 1238:33258) ends on its body. */
  width?: number; children: ReactNode; footer?: ReactNode
  /** (REG-725) Every size wears the same head and foot; the size says how wide the body's gaps are (modal 24, else 16) and how a
   *  phone shows it — form / modal rise as bottom sheets (REG-353), compact / standard stay centred cards. */
  size?: DialogSize
  /** Second scrim over an open modal: overlay/20p instead of the page scrim's overlay/60p. */
  nested?: boolean
  /** (REG-376) A confirmation, not a form: it stays a CENTRED CARD at ≤767 whatever its size — the canvas draws every alert that
   *  way (2e Delete Task) and REG-353 says so. */
  alert?: boolean
  /** A 12/400 line ABOVE the title (the New Template head's "Terms and Conditions Templates /" crumb, 1238:33173). */
  eyebrow?: ReactNode
  /** A control before the title block (the New Template head's arrow_back). */
  leading?: ReactNode
  /** (REG-725) Controls in the head before the close (Empty Trash, a step count, a status chip). */
  actions?: ReactNode
  /** A fixed panel height (the templates modal's 600); the body scrolls inside it. Viewport-capped like every dialog. (pending modules S17)
   *  `'xl'` = the tall xl dialog's one height, `--om-modal-xl-height` (928, the viewport less 96 on a shorter window). */
  height?: number | 'xl'
  /** (REG-725) A floor for a panel whose content comes and goes (the Deleted sheets' 480). */
  minHeight?: number
  /** Render through a portal on <body> (REG-444): a dialog opened from inside a sideways scroller with sticky cells is otherwise
   *  composited under the cells that follow it — the Items table's frozen block showed through the scrim. */
  portal?: boolean
  /** (REG-511) The xxl modal: fluid, 48px margin on every side (`--om-modal-xxl-margin`); `width` / `height` are ignored. */
  fluid?: boolean
  /** (REG-725) A body with no padding — a layout that runs to the panel's edges (a filters rail, a wizard's steps). */
  flush?: boolean
  /** (REG-321) A press on the scrim leaves a form open: what was typed is never lost to a stray press. */
  closeOnScrim?: boolean
  /** (REG-727) ≤767 the whole screen, not a bottom sheet — the xl lists (the Deleted / Archived sheets) as the canvas draws them
   *  (1l · 3a · 3h): a table has no room in 88dvh with a grabber. */
  phoneFull?: boolean
}) {
  useScrollLock(open)   // the page never scrolls behind this surface
  const panel = useRef<HTMLDivElement>(null)
  useEscapeLayer(open, panel, onClose)
  useDialogFocus(open, panel)
  const [scrollRef, bodyScrolls] = useOverflow()   // the footer's shadow follows the body's scroll (REG-322)
  /* (REG-353) ≤767 the canvas draws the form / modal sizes as bottom sheets (1e Create New Lead, 1g Filters,
     2i…2m, 3e, 3g): they rise off the bottom edge instead of scaling in the middle, and wear the grabber.
     The compact / standard alerts stay centred cards (canvas 2e Delete Task). */
  const phone = useSheetLayout()
  const asSheet = phone && !alert && !phoneFull && (size === 'form' || size === 'modal')
  useSheetFootLift(open && footer !== undefined && (asSheet || (phone && phoneFull)), panel)   // (quotes on the move, B-19) a sheet's foot lifts the snackbar
  const node = (
    <AnimatePresence>
      {open ? (
        <motion.div className={styles.overlay} data-nested={nested || undefined} variants={overlayFade} initial="initial" animate="animate" exit="exit"
                    onMouseDown={(e) => { if (closeOnScrim && e.target === e.currentTarget) onClose() }}>
          <motion.div ref={panel} className={`${styles.panel} ${styles.dialog}`} style={fluid ? undefined : { width, height: height === 'xl' ? undefined : height, minHeight }} variants={asSheet ? bottomSheet : modalPanel} data-size={size} data-fluid={fluid || undefined} data-height={height === 'xl' ? 'xl' : undefined}
                      initial="initial" animate="animate" exit="exit"
                      data-alert={alert || undefined} data-phone-full={phoneFull || undefined}
                      role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}>
            {asSheet ? <span className={styles.grabber} aria-hidden /> : null}
            <SurfaceHead title={title} eyebrow={eyebrow} subtitle={subtitle} leading={leading} actions={actions} onClose={onClose} />
            <div ref={scrollRef} className={styles.body} data-flush={flush || undefined}>{children}</div>
            {footer !== undefined ? <SurfaceFoot shadow={bodyScrolls}>{footer}</SurfaceFoot> : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
  if (portal) { if (typeof document === 'undefined') return null; return createPortal(node, document.body) }
  return node
}

/** A confirm's message (REG-725: 14/20 in the text's ink, one for every confirm). */
export function DialogMessage({ children }: { children: ReactNode }) {
  return <span className={styles.message}>{children}</span>
}

/** Destructive primary for confirmation dialogs (Delete / Delete Forever / Empty Trash). */
export function DangerButton({ children, onClick, disabled }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" className={styles.dangerButton} onClick={onClick} disabled={disabled}>{children}</button>
  )
}
