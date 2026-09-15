'use client'

import { useRef, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { bottomSheet, modalPanel, overlayFade } from '@/lib/motion'
import { IconButton } from './icon-button'
import { Tooltip } from './tooltip'
import { useScrollLock } from './use-scroll-lock'
import { useDialogFocus, useEscapeLayer } from './surface'
import { useOverflow } from './use-overflow'
import { useSheetLayout } from './sheet'
import styles from './dialog.module.css'

export type DialogSize = 'compact' | 'standard' | 'form' | 'modal'

/**
 * The app-wide dialog shell (On Hold / Lost, Auto Fill, Suggested tasks, every delete / export / rename / confirm dialog).
 * Scrim = the mock's overlay/60p (780:91936); `nested` = the lighter overlay/20p when it layers over an open modal
 * (the Move stage window's Auto Fill / Suggested tasks). Esc closes it when it is the topmost surface; focus moves in on
 * open, Tab stays inside, and returns to the opener on close (components/om/surface.ts).
 */
export function Dialog({
  open, onClose, title, subtitle, width = 400, children, footer, size = 'compact', nested = false, alert = false,
  eyebrow, leading, headRule = true, height,
}: {
  open: boolean; onClose: () => void; title: string; subtitle?: ReactNode
  /** A footer is optional: a modal drawn without one (the templates library, 1238:33258) ends on its body. */
  width?: number; children: ReactNode; footer?: ReactNode
  /** compact = delete-alert shell (779:24663); standard = 56px heading with divider, h3 title, 24px body (821:23969);
   *  form = one-field dialog (784:113420): 72px heading (24 padding, no divider), 12/24 body, 84px footer;
   *  modal = the modal header standard (779:26016 — Notes' Auto Fill 931:45344 / Add tasks 931:45360): 64px heading
   *  (p20/24, 20/Bold title, bare 24 close, bottom rule), body p24 g24, footer 68 (p16/24, top rule). */
  size?: DialogSize
  /** Second scrim over an open modal: overlay/20p instead of the page scrim's overlay/60p. */
  nested?: boolean
  /** (REG-376) A confirmation, not a form. It borrows the `form` / `modal` chrome for its 72/84 shell but stays a
   *  CENTRED CARD at ≤767 — the canvas draws every alert that way (2e Delete Task) and REG-353 says so. */
  alert?: boolean
  /** A 12/400 line ABOVE the title (the New Template head's "Terms and Conditions Templates /" crumb, 1238:33173). */
  eyebrow?: ReactNode
  /** A control before the title block (the New Template head's arrow_back). */
  leading?: ReactNode
  /** `modal` heads draw the standard's bottom rule; the templates modals (1238:33084 · 33173) draw none. */
  headRule?: boolean
  /** A fixed panel height (the templates modal's 600); the body scrolls inside it. Viewport-capped like every dialog. */
  height?: number
}) {
  useScrollLock(open)   // the page never scrolls behind this surface
  const panel = useRef<HTMLDivElement>(null)
  useEscapeLayer(open, panel, onClose)
  useDialogFocus(open, panel)
  const [scrollRef, bodyScrolls] = useOverflow()   // the footer's shadow follows the body's scroll (REG-322)
  /* (REG-353) ≤767 the canvas draws the form / modal sizes as bottom sheets (1e Create New Lead, 1g Filters,
     2i…2m, 3e, 3g): they rise off the bottom edge instead of scaling in the middle, and wear the grabber.
     The compact / standard alerts stay centred cards there (canvas 2e Delete Task). */
  const asSheet = useSheetLayout() && !alert && (size === 'form' || size === 'modal')
  return (
    <AnimatePresence>
      {open ? (
        <motion.div className={styles.overlay} data-nested={nested || undefined} variants={overlayFade} initial="initial" animate="animate" exit="exit"
                    onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
          <motion.div ref={panel} className={styles.dialog} style={{ width, height }} variants={asSheet ? bottomSheet : modalPanel} data-size={size}
                      initial="initial" animate="animate" exit="exit"
                      data-alert={alert || undefined} data-norule={headRule ? undefined : ''}
                      role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}>
            {asSheet ? <span className={styles.grabber} aria-hidden /> : null}
            <div className={styles.head}>
              {leading}
              <div className={styles.headText}>
                {eyebrow ? <span className={styles.eyebrow}>{eyebrow}</span> : null}
                <span className={styles.title}>{title}</span>
                {subtitle}
              </div>
              <Tooltip label="Close">
                <IconButton icon="close" label="Close" size={24} variant="bare" iconSize={24} iconFamily="outlined" className={styles.close} onClick={onClose} />
              </Tooltip>
            </div>
            <div ref={scrollRef} className={styles.body}>{children}</div>
            {footer !== undefined ? <div className={styles.foot} data-shadow={bodyScrolls || undefined}>{footer}</div> : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

/** Body copy for one-line confirmations (helper style: 12/16 secondary). */
export function DialogMessage({ children }: { children: ReactNode }) {
  return <span className={styles.message}>{children}</span>
}

/** Destructive primary for confirmation dialogs (Delete / Delete Forever / Empty Trash). */
export function DangerButton({ children, onClick, disabled }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" className={styles.dangerButton} onClick={onClick} disabled={disabled}>{children}</button>
  )
}
