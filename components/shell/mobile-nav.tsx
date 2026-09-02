'use client'

import { useCallback, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Icon } from '@/components/om/icon'
import { useDialogFocus, useEscapeLayer } from '@/components/om/surface'
import { useScrollLock } from '@/components/om/use-scroll-lock'
import { AppRail } from './app-rail'
import { MOBILE, useMediaQuery } from '@/lib/breakpoint'
import { duration, ease } from '@/lib/motion'
import styles from './mobile-nav.module.css'

/**
 * Mobile chrome (REG-269, design-source/context/responsive.md): at ≤767px the rail leaves the flow and this
 * takes over — a 56px top bar (menu · lockup) and an off-canvas drawer hosting the SAME rail in its expanded
 * 216px form (one nav, two frames). Slide on the modal timing; scrim tap, Escape and any nav press close it.
 * Renders nothing ≥768 (CSS) so desktop and tablet are untouched.
 *
 * It claims `aria-modal`, so it owes the WAI-ARIA dialog contract (REG-286, a11y audit): focus moves into the
 * layer on open, Tab cycles inside it instead of walking into the page it has covered, and focus returns to the
 * menu button on close. Esc goes through the shared layer policy — a menu opened inside the nav owns it first.
 * The page behind it never scrolls either (REG-287) — the same `useScrollLock` every modal shell uses; without it
 * a drag on the scrim scrolled the page under the open drawer, which is exactly the touch the scrim is there to eat.
 */
export function MobileTopBar() {
  const [open, setOpen] = useState(false)
  const layer = useRef<HTMLDivElement>(null)
  const close = useCallback(() => setOpen(false), [])
  /* (REG-287) The drawer only exists ≤767 — CSS hides the layer at 768, but the STATE stayed open, so growing the
     window past the breakpoint used to leave an invisible layer holding the focus trap (and now the scroll lock).
     Render-phase adjust on the house breakpoint hook (lib/breakpoint.ts, the server snapshot is always desktop):
     leaving mobile closes the drawer. Renders nothing different at any width — the layer is display:none there. */
  const mobile = useMediaQuery(MOBILE)
  if (open && !mobile) setOpen(false)
  useScrollLock(open)   // the page never scrolls behind this surface (REG-287)
  useEscapeLayer(open, layer, close)
  useDialogFocus(open, layer)

  return (
    <>
      <header className={styles.bar}>
        <button type="button" className={styles.menuBtn} aria-label="Open navigation" aria-haspopup="dialog"
                aria-expanded={open} onClick={() => setOpen(true)}>
          <Icon name="menu" size={24} weight={300} />
        </button>
        <span className={styles.lockup} aria-hidden={open}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={styles.logo} src="/figma-assets/logo.svg" alt="" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={styles.wordmark} src="/figma-assets/logo-wordmark.svg" alt="OpenMaison" />
        </span>
      </header>
      <AnimatePresence>
        {open ? (
          /* (REG-287) `outline: none` on the focus-holding layer, as every other panel that takes focus on open
             (components/om/dialog.module.css) — inline because this surface's stylesheet is outside this pass. */
          <div ref={layer} className={styles.layer} style={{ outline: 'none' }}
               role="dialog" aria-modal="true" aria-label="Navigation" tabIndex={-1}>
            <motion.button
              type="button" className={styles.scrim} aria-label="Close navigation"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { duration: duration.modal, ease: ease.standard } }}
              exit={{ opacity: 0, transition: { duration: duration.modalExit, ease: ease.standard } }}
              onClick={close}
            />
            <motion.div
              className={styles.drawer}
              initial={{ x: -232 }}
              animate={{ x: 0, transition: { duration: duration.modal, ease: ease.decelerate } }}
              exit={{ x: -232, transition: { duration: duration.modalExit, ease: ease.standard } }}
            >
              <AppRail drawer onNavigate={close} />
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </>
  )
}
