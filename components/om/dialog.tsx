'use client'

import { useRef, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { modalPanel, overlayFade } from '@/lib/motion'
import { IconButton } from './icon-button'
import { Tooltip } from './tooltip'
import { useScrollLock } from './use-scroll-lock'
import { useDialogFocus, useEscapeLayer } from './surface'
import styles from './dialog.module.css'

export type DialogSize = 'compact' | 'standard' | 'form' | 'modal'

/**
 * The app-wide dialog shell (On Hold / Lost, Auto Fill, Suggested tasks, every delete / export / rename / confirm dialog).
 * Scrim = the mock's overlay/60p (780:91936); `nested` = the lighter overlay/20p when it layers over an open modal
 * (the Move stage window's Auto Fill / Suggested tasks). Esc closes it when it is the topmost surface; focus moves in on
 * open, Tab stays inside, and returns to the opener on close (components/om/surface.ts).
 */
export function Dialog({
  open, onClose, title, subtitle, width = 400, children, footer, size = 'compact', nested = false,
}: {
  open: boolean; onClose: () => void; title: string; subtitle?: ReactNode
  width?: number; children: ReactNode; footer: ReactNode
  /** compact = delete-alert shell (779:24663); standard = 56px heading with divider, h3 title, 24px body (821:23969);
   *  form = one-field dialog (784:113420): 72px heading (24 padding, no divider), 12/24 body, 84px footer;
   *  modal = the modal header standard (779:26016 — Notes' Auto Fill 931:45344 / Add tasks 931:45360): 64px heading
   *  (p20/24, 20/Bold title, bare 24 close, bottom rule), body p24 g24, footer 68 (p16/24, top rule). */
  size?: DialogSize
  /** Second scrim over an open modal: overlay/20p instead of the page scrim's overlay/60p. */
  nested?: boolean
}) {
  useScrollLock(open)   // the page never scrolls behind this surface
  const panel = useRef<HTMLDivElement>(null)
  useEscapeLayer(open, panel, onClose)
  useDialogFocus(open, panel)
  return (
    <AnimatePresence>
      {open ? (
        <motion.div className={styles.overlay} data-nested={nested || undefined} variants={overlayFade} initial="initial" animate="animate" exit="exit"
                    onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
          <motion.div ref={panel} className={styles.dialog} style={{ width }} variants={modalPanel} data-size={size}
                      initial="initial" animate="animate" exit="exit"
                      role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}>
            <div className={styles.head}>
              <div className={styles.headText}>
                <span className={styles.title}>{title}</span>
                {subtitle}
              </div>
              <Tooltip label="Close">
                <IconButton icon="close" label="Close" size={24} variant="bare" iconSize={24} iconFamily="outlined" className={styles.close} onClick={onClose} />
              </Tooltip>
            </div>
            <div className={styles.body}>{children}</div>
            <div className={styles.foot}>{footer}</div>
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
