'use client'

import { useRef, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { bottomSheet, duration, ease, overlayFade } from '@/lib/motion'
import { IconButton } from './icon-button'
import { Tooltip } from './tooltip'
import { useDialogFocus, useEscapeLayer } from './surface'
import { useSheetLayout } from './sheet'
import styles from './drawer.module.css'

/**
 * Right-anchored side panel (Task 902:27363 · Comments 902:28619): 400 wide, full viewport height, white, level-4 shadow;
 * head 64 (80 with a crumb + back arrow), scrolling body, sticky footer. Non-modal — the page behind stays live;
 * Esc and ✕ close it (Esc only while it is the topmost surface: a dialog / menu / picker opened from the panel owns Esc
 * first — components/om/surface.ts). Focus moves in on open and returns to the opener on close; Tab is not trapped
 * (non-modal). Spec: design-source/context/lead-tasks/03-panel-tags.txt · 04-comments-attach.txt.
 */
export function Drawer({
  open, title, crumb, onBack, actions, footer, onClose, children, width = 400, label, kbPanel = false,
}: {
  open: boolean
  title: string
  /** "Task / " above the title, with a back arrow (Comments panel). */
  crumb?: string
  onBack?: () => void
  /** 24px icon actions before the close (comment · attach_file · more_vert). */
  actions?: ReactNode
  footer?: ReactNode
  onClose: () => void
  children: ReactNode
  width?: number
  label?: string
  /** (REG-711) The ? panel: keys pressed inside it still reach the page, so they can be tried with the list open. */
  kbPanel?: boolean
}) {
  const panel = useRef<HTMLElement>(null)
  useEscapeLayer(open, panel, onClose)
  useDialogFocus(open, panel, { trap: false })
  /* (REG-353) ≤767 the canvas draws this panel as a bottom sheet (2c Task · 2d Task comments): it comes up off the
     bottom edge under a scrim instead of sliding in from a right edge the phone does not have, and wears the grabber. */
  const sheet = useSheetLayout()
  const slide = {
    initial: { x: width, opacity: 0.6 },
    animate: { x: 0, opacity: 1, transition: { duration: duration.modal, ease: ease.decelerate } },
    exit: { x: width, opacity: 0.6, transition: { duration: duration.modalExit, ease: ease.standard } },
  }

  return (
    <AnimatePresence>
      {open ? (
        <>
        {sheet ? (
          <motion.div className={styles.scrim} variants={overlayFade} initial="initial" animate="animate" exit="exit" onMouseDown={onClose} />
        ) : null}
        <motion.aside
          ref={panel}
          className={styles.drawer}
          style={sheet ? undefined : { width }}
          role="dialog"
          aria-label={label ?? title}
          data-kb-panel={kbPanel || undefined}
          tabIndex={-1}
          variants={sheet ? bottomSheet : slide}
          initial="initial" animate="animate" exit="exit"
        >
          {sheet ? <span className={styles.grabber} aria-hidden /> : null}
          <header className={styles.head} data-crumb={crumb ? '' : undefined}>
            {crumb && onBack ? (
              <Tooltip label="Back">
                <IconButton icon="arrow_back" label="Back" size={24} variant="bare" iconSize={24} iconWeight={300} className={styles.back} onClick={onBack} />
              </Tooltip>
            ) : null}
            <div className={styles.titles}>
              {crumb ? <span className={styles.crumb}>{crumb}</span> : null}
              <h2 className={styles.title}>{title}</h2>
            </div>
            <div className={styles.actions}>
              {actions}
              <Tooltip label="Close">
                <IconButton icon="close" label="Close" size={24} variant="bare" iconSize={24} onClick={onClose} />
              </Tooltip>
            </div>
          </header>
          <div className={styles.body}>{children}</div>
          {footer ? <footer className={styles.footer}>{footer}</footer> : null}
        </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  )
}

/** A 24px secondary icon action for the drawer head ("Link Icon" 24/Regular #666666). */
export function DrawerAction({ icon, label, onClick, expanded }: { icon: string; label: string; onClick: () => void; expanded?: boolean }) {
  return (
    <Tooltip label={label} disabled={expanded}>
      <IconButton icon={icon} label={label} size={24} variant="bare" iconSize={24}
                  aria-haspopup={expanded !== undefined ? 'menu' : undefined} aria-expanded={expanded} onClick={onClick} />
    </Tooltip>
  )
}

/** 1px rule between drawer sections (Horizontal 10%), spanning the 24px-padded body. */
export function DrawerRule() {
  return <div className={styles.rule} />
}
