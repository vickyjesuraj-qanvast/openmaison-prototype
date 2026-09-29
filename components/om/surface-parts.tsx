'use client'

import type { ReactNode } from 'react'
import { IconButton } from './icon-button'
import { Tooltip } from './tooltip'
import styles from './dialog.module.css'

/**
 * (REG-725, owner 2026-09-29: "there are modals with bottom border and there are without … fix all of this once for all") ONE head
 * and ONE foot for every overlay — this dialog in every size, the confirm, the side drawer and the hand-rolled wizards and sheets
 * all render `SurfaceHead` and `SurfaceFoot`, and nothing else draws a dialog's head or foot. The measures are the modal standard
 * (779:26016): head 64 (p20/24), the 20/24 bold title, an optional 12/16 eyebrow above it and subtitle under it, head actions
 * before the bare 24 close, and the 1px rule inside the head's bottom edge — ALWAYS (the owner's pick of three: always · only
 * while scrolling · never); body p24; foot 68 (p16/24, gap 12) right-aligned, a `FootStart` on its left, the top rule always and
 * its shadow only while the body scrolls under it (REG-322). `data-surface-head` / `data-surface-foot` let the anatomy check find
 * every one of them.
 */
export function SurfaceHead({ title, chips, eyebrow, subtitle, leading, actions, onClose, closeLabel = 'Close', closeDisabled = false, className, titleId }: {
  title: ReactNode
  /** Tags right after the title, on its line — as the L2 page header's meta chips (Return details' status tags). */
  chips?: ReactNode
  /** A 12/16 secondary line ABOVE the title — a crumb ("Terms and Conditions Templates /", "Task /", "Company / Leads"). */
  eyebrow?: ReactNode
  /** One 12/16 secondary line under the title (REG-511). */
  subtitle?: ReactNode
  /** A control before the title block — a back arrow. */
  leading?: ReactNode
  /** Controls before the close: 24px icon actions, a chip, one outlined button. */
  actions?: ReactNode
  /** The close; left out, the head has none (a step that must be finished or cancelled from the foot). */
  onClose?: () => void
  closeLabel?: string
  /** While work runs that closing would cut short (an import, a merge): the close reads disabled and does nothing. */
  closeDisabled?: boolean
  className?: string
  titleId?: string
}) {
  return (
    <div className={`${styles.head}${className ? ` ${className}` : ''}`} data-surface-head="">
      {leading}
      <div className={styles.headText}>
        {eyebrow ? <span className={styles.eyebrow}>{eyebrow}</span> : null}
        {chips ? (
          <div className={styles.titleRow}><h2 className={styles.title} id={titleId}>{title}</h2><span className={styles.chips}>{chips}</span></div>
        ) : <h2 className={styles.title} id={titleId}>{title}</h2>}
        {/* (REG-511) The subtitle is the house 12/16 secondary line, whatever the caller passes. */}
        {subtitle ? <span className={styles.subtitle}>{subtitle}</span> : null}
      </div>
      {actions || onClose ? (
        <div className={styles.headEnd}>
          {actions}
          {onClose ? (
            <Tooltip label={closeLabel} disabled={closeDisabled}>
              <IconButton icon="close" label={closeLabel} size={24} variant="bare" iconSize={24} iconFamily="outlined" className={styles.close} onClick={onClose} disabled={closeDisabled} />
            </Tooltip>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

/** (REG-725) The one foot: p16/24, gap 12, right-aligned, the top rule always, the shadow only while the body scrolls (REG-322). */
export function SurfaceFoot({ children, shadow = false, className }: { children: ReactNode; shadow?: boolean; className?: string }) {
  return (
    <div className={`${styles.foot}${className ? ` ${className}` : ''}`} data-shadow={shadow || undefined} data-dialog-foot="" data-surface-foot="">
      {children}
    </div>
  )
}

/** (REG-725) What a foot holds on its LEFT — a link (Manage Templates), a note, an error, a secondary action (New Folder). */
export function FootStart({ children }: { children: ReactNode }) {
  return <div className={styles.footStart}>{children}</div>
}

/** (REG-725) The shell's look for a panel that keeps its own layout (a wizard with a rail, the review sheet): the scrim and its
 *  layer, the panel's radius and elevation, and the phone sheet's grabber — the same classes the dialog itself wears. */
export const surfaceClasses = { overlay: styles.overlay, panel: styles.panel, grabber: styles.grabber } as const
