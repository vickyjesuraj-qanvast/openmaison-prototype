'use client'

import { useEffect } from 'react'
import { MOBILE } from '@/lib/breakpoint'

/**
 * (REG-401, user 2026-09-08: "in mobile I want the global and page header and bottom nav in the leads listing
 * page to move out while I scroll … so that we have more viewport to see the leads listing")
 *
 * Renders nothing. While it is mounted at ≤767 it watches the page's scroll direction and flags the document:
 * `body[data-om-chrome-hidden]`. The stylesheets do the rest — the top bar, the page header, the bottom dock,
 * the FAB and the review banner all translate off their own edge (mobile-nav / page-header / maison-fab /
 * review-banner .module.css). Transforms, not layout: nothing reflows, so the list never jumps under the finger
 * and a lead's anchored popover keeps tracking its own cell.
 *
 * Scrolling DOWN the list — the content moving up under the finger — hides the chrome and gives its 130px back
 * to the rows; scrolling back up returns it immediately, which is the convention every mobile list uses and the
 * one thing that makes hidden chrome findable again.
 *
 * Mounted by the LISTING alone (app/leads/workspace.tsx). The other level-1 pages keep their chrome fixed: this
 * is opt-in per surface, so it cannot surprise a screen nobody asked for it on.
 */
export function AutoHideChrome() {
  useEffect(() => {
    const mql = window.matchMedia(MOBILE)
    const body = document.body
    let last = window.scrollY
    let ticking = false

    /** Below this the chrome is always shown: the top of a list should never open with its header half-gone. */
    const ARM_AT = 72
    /** Ignore the sub-pixel noise a finger produces while it rests on the screen. */
    const DEADZONE = 6

    const apply = () => {
      ticking = false
      const y = window.scrollY
      const delta = y - last
      if (Math.abs(delta) < DEADZONE) return
      last = y
      /* Overscroll at either end reports movement that is not a scroll — ignore both, or a rubber-band at the
         bottom of the list flickers the dock back in. */
      const max = document.documentElement.scrollHeight - window.innerHeight
      if (y <= ARM_AT || y >= max - 1) { body.removeAttribute('data-om-chrome-hidden'); return }
      if (delta > 0) body.setAttribute('data-om-chrome-hidden', '')
      else body.removeAttribute('data-om-chrome-hidden')
    }

    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(apply)
    }

    const enable = () => {
      last = window.scrollY
      window.addEventListener('scroll', onScroll, { passive: true })
    }
    const disable = () => {
      window.removeEventListener('scroll', onScroll)
      body.removeAttribute('data-om-chrome-hidden')
    }

    /* ≤767 only, and it follows a resize across the breakpoint: a tablet that rotates into phone width picks the
       behaviour up, and one that rotates out of it gets its chrome back rather than keeping it translated away. */
    if (mql.matches) enable()
    const onChange = (e: MediaQueryListEvent) => (e.matches ? enable() : disable())
    mql.addEventListener('change', onChange)

    return () => {
      mql.removeEventListener('change', onChange)
      disable()
    }
  }, [])

  return null
}
