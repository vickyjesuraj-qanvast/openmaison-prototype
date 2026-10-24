'use client'

import { useCallback, useEffect, useRef, useSyncExternalStore, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { bottomSheet, overlayFade } from '@/lib/motion'
import { SurfaceFoot, SurfaceHead } from './surface-parts'
import { IconButton } from './icon-button'
import { REFUSED_KEY, Tooltip } from './tooltip'
import { useSnackbarDismiss } from './snackbar'
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
 * (quotes on the move 2026-10-22, B-19) A sheet with a pinned foot lifts the snackbar above that foot while it is open: `--sheet-foot` on
 * the root = the foot's top measured from the screen's bottom, and the house snackbar rests at the higher of the dock's band and this
 * (snackbar.module.css). Off a level-1 page the dock is 0, so a snackbar raised from Version History landed over its Close. ≤767 only —
 * a Drawer slid in from the right and a centred dialog have no foot on the screen's edge. Written once the sheet has risen (its slide
 * moves the foot), kept in step by a ResizeObserver, and put back on close — the earlier value if another sheet wrote one.
 * (contracts on the move 2026-10-22, B-21) A sheet with no foot — a menu sheet (the ⋮, a status list) — lifts it above its own top edge
 * instead: a snackbar raised just before the sheet opened ("Sent to Olivia for signature") landed over the sheet's last rows (Archive ·
 * Delete), the one place a finger was about to press. The snackbar never lands on a sheet; it waits above it, on the scrim.
 */
export function useSheetFootLift(on: boolean, panel: RefObject<HTMLElement | null>, opts?: { query?: string; lowOnly?: number }) {
  /* (Leads on the move, B-14 — his marks 2026-10-23, a house rule) A sheet opening withdraws the refusal said just before it ("Assign a member
     first"): that snackbar would rest on the sheet's chips and foot, where the finger is about to press — the sheet is the next thing to do.
     A snackbar that carries an Undo stays, lifted above the foot as below. (responsive audit 2026-10-23, W6) A centred dialog's lift
     (`lowOnly`, below) is not a sheet opening: it withdraws nothing. */
  const dismiss = useSnackbarDismiss()
  const lowOnly = opts?.lowOnly
  const query = opts?.query ?? QUERY
  useEffect(() => { if (on && lowOnly === undefined) dismiss(REFUSED_KEY) }, [on, dismiss, lowOnly])
  useEffect(() => {
    if (!on || !window.matchMedia(query).matches) return
    const root = document.documentElement
    const before = root.style.getPropertyValue('--sheet-foot')
    const footOf = () => panel.current?.querySelector<HTMLElement>('[data-surface-foot]') ?? panel.current ?? null
    const write = () => {
      const foot = footOf()
      if (!foot) return
      const r = foot.getBoundingClientRect()
      const lift = Math.max(0, Math.round(window.innerHeight - r.top))
      /* (responsive audit 2026-10-23, W6 — W4-27) a centred dialog lifts the snackbar only when its foot reaches down into the snackbar's band
         (`lowOnly` = the band's height off the screen's foot) — a short dialog's foot is far above it, and lifting there would put the bar over
         the dialog's words */
      if (lowOnly !== undefined && window.innerHeight - r.bottom > lowOnly) { if (before) root.style.setProperty('--sheet-foot', before); else root.style.removeProperty('--sheet-foot'); return }
      root.style.setProperty('--sheet-foot', `${lift}px`)
    }
    write()
    const late = window.setTimeout(write, 450)   // after the sheet's slide (lib/motion bottomSheet)
    /* (responsive audit 2026-10-23, W6 — a bug fix, W5-34) …and every frame of the slide itself: measured only at the open and at 450, a snackbar
       raised with the sheet (Add section → "Section created") rested on the rising foot until then. The foot is followed frame by frame for
       the slide's length (a transform — no ResizeObserver sees it). */
    let frame = 0
    const t0 = performance.now()
    const follow = () => { write(); if (performance.now() - t0 < 700) frame = window.requestAnimationFrame(follow) }
    frame = window.requestAnimationFrame(follow)
    const ro = new ResizeObserver(write)
    const foot = footOf()
    if (foot) ro.observe(foot)
    return () => { window.clearTimeout(late); window.cancelAnimationFrame(frame); ro.disconnect(); if (before) root.style.setProperty('--sheet-foot', before); else root.style.removeProperty('--sheet-foot') }
  }, [on, panel, query, lowOnly])
}

/**
 * The mobile bottom sheet. Rendered through a body portal so an anchored surface's own scroll container (a
 * card, a modal body, the toolbar row it was absolutely positioned inside) cannot clip it, and layered above
 * the fixed dock. Esc closes it when it is the topmost surface, a press on the scrim closes it, focus moves
 * in on open and returns to the opener on close (components/om/surface.ts) — the same contract as Dialog.
 */
export function Sheet({
  open, onClose, onBack, title, subtitle, children, footer, headActions, role = 'dialog', label, bodyClassName,
}: {
  open: boolean
  onClose: () => void
  /** (REG-899, Dane UAT 12.04) A sheet opened from another sheet (More › Company · View as · AI credits) leads with the Drawer's back
   *  arrow: it closes this sheet and brings the one it came from back. Esc, the scrim and the close still close it outright. */
  onBack?: () => void
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
  useSheetFootLift(open, panel)   // (B-19) the snackbar clears the pinned foot · (B-21) with no foot, the sheet's own top edge
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
            {title ? <SurfaceHead title={title} subtitle={subtitle} actions={headActions} onClose={onClose} className={styles.head}
                                  leading={onBack ? (
                                    <Tooltip label="Back">
                                      <IconButton icon="arrow_back" label="Back" size={24} variant="bare" iconSize={24} iconWeight={300} className={styles.back} onClick={onBack} />
                                    </Tooltip>
                                  ) : undefined} /> : null}
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
