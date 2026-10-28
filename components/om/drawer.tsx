'use client'

import { useRef, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { bottomSheet, duration, ease, overlayFade } from '@/lib/motion'
import { IconButton } from './icon-button'
import { Tooltip } from './tooltip'
import { useDialogFocus, useEscapeLayer } from './surface'
import { useSheetFootLift, useSheetLayout } from './sheet'
import { useOverflow } from './use-overflow'
import { SurfaceFoot, SurfaceHead } from './surface-parts'
import styles from './drawer.module.css'

/**
 * (pending modules S17 — consistency leftovers, card held:consistency-leftovers, as recommended) The side panels' width scale, as menus have
 * theirs (REG-728's MENU_WIDTH): seven widths had grown one panel at a time (320 · 360 · 400 · 420 · 440 · 480 · 560). Four now, by what
 * a panel holds — **narrow** 360, a tool's pane beside its canvas (an editor's panes, a contract's Outline, the keyboard list) ·
 * **standard** 400, the mock's (Task 902:27363 · Comments 902:28619): a record's details, its comments or history, what the client sees,
 * Column settings, the bell · **wide** 480, a panel that draws or carries its own form (a cost's lines, a ticket's thread, a wall's
 * elevation, a layout's versions) · **widest** 560, as the canvases draw them (a milestone — Milestone.dc.html — and Invite to Portal).
 * A panel names its step; a number is refused by the type, so a width cannot drift again.
 */
export const PANEL_WIDTH = { narrow: 360, standard: 400, wide: 480, widest: 560 } as const
export type PanelWidth = keyof typeof PANEL_WIDTH

/**
 * Right-anchored side panel (Task 902:27363 · Comments 902:28619): 400 wide, full viewport height, white, level-4 shadow;
 * head 64 (80 with a crumb + back arrow), scrolling body, sticky footer. Non-modal — the page behind stays live;
 * Esc and ✕ close it (Esc only while it is the topmost surface: a dialog / menu / picker opened from the panel owns Esc
 * first — components/om/surface.ts). Focus moves in on open and returns to the opener on close; Tab is not trapped
 * (non-modal). Spec: design-source/context/lead-tasks/03-panel-tags.txt · 04-comments-attach.txt.
 */
export function Drawer({
  open, title, crumb, onBack, actions, footer, onClose, children, width = 'standard', label, kbPanel = false, footShadowUntilEnd = false,
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
  /** (pending modules S17) a step of PANEL_WIDTH — the mock's 400 unless the panel holds more */
  width?: PanelWidth
  label?: string
  /** (REG-711) The ? panel: keys pressed inside it still reach the page, so they can be tried with the list open. */
  kbPanel?: boolean
  /** (Dane's Tickets review, 2026-10-26 — opt-in, the ticket's thread) the foot's shadow leaves once the body is scrolled to its end. */
  footShadowUntilEnd?: boolean
}) {
  const panel = useRef<HTMLElement>(null)
  const [scrollRef, bodyScrolls] = useOverflow({ untilEnd: footShadowUntilEnd })   // (REG-725) the foot's shadow only while the body scrolls under it, as every dialog's
  useEscapeLayer(open, panel, onClose)
  useDialogFocus(open, panel, { trap: false })
  /* (REG-353) ≤767 the canvas draws this panel as a bottom sheet (2c Task · 2d Task comments): it comes up off the
     bottom edge under a scrim instead of sliding in from a right edge the phone does not have, and wears the grabber. */
  const sheet = useSheetLayout()
  useSheetFootLift(sheet && open && !!footer, panel)   // (quotes on the move, B-19) as a sheet, its foot lifts the snackbar
  const px = PANEL_WIDTH[width]
  const slide = {
    initial: { x: px, opacity: 0.6 },
    animate: { x: 0, opacity: 1, transition: { duration: duration.modal, ease: ease.decelerate } },
    exit: { x: px, opacity: 0.6, transition: { duration: duration.modalExit, ease: ease.standard } },
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
          style={sheet ? undefined : { width: px }}
          role="dialog"
          aria-label={label ?? title}
          data-kb-panel={kbPanel || undefined}
          tabIndex={-1}
          variants={sheet ? bottomSheet : slide}
          initial="initial" animate="animate" exit="exit"
        >
          {sheet ? <span className={styles.grabber} aria-hidden /> : null}
          {/* (REG-725) The one head and foot every overlay wears (components/om/dialog.tsx) — the drawer's own 65 head with a border and
              a level-1 shadow, its rounded close and its always-on footer shadow are gone. */}
          <SurfaceHead title={title} eyebrow={crumb} className={styles.head} actions={actions} onClose={onClose}
                       leading={crumb && onBack ? (
                         <Tooltip label="Back">
                           <IconButton icon="arrow_back" label="Back" size={24} variant="bare" iconSize={24} iconWeight={300} className={styles.back} onClick={onBack} />
                         </Tooltip>
                       ) : undefined} />
          <div ref={scrollRef} className={styles.body}>{children}</div>
          {footer ? <SurfaceFoot shadow={bodyScrolls} className={styles.footer}>{footer}</SurfaceFoot> : null}
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
