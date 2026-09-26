'use client'

import { useCallback, useEffect, useRef, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { anchoredSurface } from '@/lib/motion'
import { useMenuKeyboard } from './surface'
import { Sheet, sheetMenuBody, useSheetLayout } from './sheet'
import { PHONE_SIDEWAYS, useMediaQuery } from '@/lib/breakpoint'
import menuStyles from '@/components/leads/menus.module.css'

/** Anchored menu rendered through a body portal so scroll containers (modal
 *  bodies, wizard panels) cannot clip it. Flips upward when the viewport has
 *  no room below. Esc is CONSUMED (preventDefault) so overlay hosts that
 *  check e.defaultPrevented leave their surface open.
 *
 *  Keyboard (REG-286): focus moves onto the current row on open, arrows / Home / End walk the rows, Tab and Esc
 *  hand focus back to the trigger — the portal renders after the whole page, so without this an open menu could
 *  only be reached by tabbing through everything behind it (components/om/surface.ts). A menu opened from a text
 *  box (the Assign member search) keeps focus in the field, so typing still filters.
 *
 *  Phone (REG-353): a caller that names a `sheetTitle` gets the mobile canvas' bottom sheet at ≤767 instead of a card
 *  anchored to a cell that can sit anywhere — the same branch Dropdown has. Callers that pass none (a select's own
 *  option list, a combobox's results under its field) keep the anchored surface. */
export function PortalMenu({
  open, anchor, onClose, align = 'left', width, children, role = 'listbox', sheetTitle, id, className, autoFocus = true,
}: {
  open: boolean
  anchor: RefObject<HTMLElement | null>
  onClose: () => void
  align?: 'left' | 'right'
  width?: number
  children: ReactNode
  role?: string
  /** ≤767 the menu becomes a bottom sheet with this heading (REG-353). Omit to stay anchored on the phone. */
  sheetTitle?: string
  /** The surface's element id — a combobox names it through aria-controls. */
  id?: string
  /** Extra class on the surface (a popover that rounds to r8, 1271:40932). */
  className?: string
  /** (sweep S5 #12) A combobox's list keeps focus in its field (aria-activedescendant walks it) — the menu must not take focus on open. */
  autoFocus?: boolean
}) {
  const menuRef = useRef<HTMLDivElement | null>(null)
  /* (audit 2026-09-26, phone-12) a phone held sideways is a phone too: a 290px card cut its rows in half on a 375-tall screen */
  const phone = useSheetLayout(), sideways = useMediaQuery(PHONE_SIDEWAYS)
  const sheet = (phone || sideways) && sheetTitle !== undefined
  useMenuKeyboard(open && !sheet, menuRef, onClose, { autoFocus })   // (REG-286) keyboard reach — see the note above

  // Position via callback ref (runs before paint) — measured-DOM styling
  // without a state round-trip.
  const place = useCallback((el: HTMLDivElement | null) => {
    menuRef.current = el
    if (!el || !anchor.current) return
    const r = anchor.current.getBoundingClientRect()
    /* Width and x clamp to the viewport (REG-269): the menu measured its anchor and trusted it, so on a
       narrow screen an anchor near the right edge (or one wider than the screen) put the menu off-screen
       with nothing to scroll it back. EDGE keeps it off the very edge, as the date picker already does. */
    const EDGE = 8
    const w = Math.min(width ?? r.width, window.innerWidth - EDGE * 2)
    const preferred = align === 'right' ? r.right - w : r.left
    const left = Math.min(Math.max(EDGE, preferred), window.innerWidth - w - EDGE)
    const spaceBelow = window.innerHeight - r.bottom
    el.style.left = `${left}px`
    el.style.width = `${w}px`
    /* The menu is as tall as its rows up to the room the viewport leaves on the side it opens (audit 2026-09-15): a fixed
       320 cap clipped the row menu's ninth row ("Remove") and the Add Item list's third match behind an inner scroll with
       no cue. Below when it fits (or there is more room below than above), else above. */
    if (spaceBelow < 340 && r.top > spaceBelow) {
      el.style.bottom = `${window.innerHeight - r.top + 4}px`
      el.style.top = 'auto'
      el.style.maxHeight = `${Math.max(120, r.top - 4 - EDGE)}px`
      el.style.transformOrigin = 'bottom left'
    } else {
      el.style.top = `${r.bottom + 4}px`
      el.style.bottom = 'auto'
      el.style.maxHeight = `${Math.max(120, spaceBelow - 4 - EDGE)}px`
      el.style.transformOrigin = 'top left'
    }
  }, [anchor, align, width])

  useEffect(() => {
    if (!open || sheet) return   // the sheet owns Esc and its own scrim press (components/om/sheet.tsx)
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (anchor.current?.contains(t) || menuRef.current?.contains(t)) return
      onClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose() }
    }
    /* (REG-416) A menu that opens off a control the browser is still scrolling into view — Tab onto a select below the
       fold, a pointer press that nudges the page — saw that very scroll and closed itself at once. Scrolls in the first
       250 ms after opening are the opener's, not the user's; after that any scroll closes the menu as before. */
    const openedAt = performance.now()
    const onScroll = (e: Event) => {
      if (menuRef.current && e.target instanceof Node && menuRef.current.contains(e.target)) return
      if (performance.now() - openedAt < 250) return
      onClose()
    }
    const t = setTimeout(() => document.addEventListener('pointerdown', onDown), 0)
    document.addEventListener('keydown', onKey, true)   // capture: an open menu owns Esc before any dialog / picker host
    document.addEventListener('scroll', onScroll, true)
    /* A mobile browser hiding / showing its URL bar fires `resize` with the width unchanged; closing on that
       dismissed portalled pickers mid-use (REG-269). Only a WIDTH change can invalidate the placement. */
    let lastW = window.innerWidth
    const onResize = () => { if (window.innerWidth !== lastW) { lastW = window.innerWidth; onClose() } }
    window.addEventListener('resize', onResize)
    return () => {
      clearTimeout(t)
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey, true)
      document.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onResize)
    }
  }, [open, onClose, anchor, sheet])

  if (typeof document === 'undefined') return null
  if (sheet) {
    return (
      <Sheet open={open} onClose={onClose} title={sheetTitle} label={sheetTitle} role={role} bodyClassName={sheetMenuBody}>
        {children}
      </Sheet>
    )
  }
  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          ref={place}
          className={className ? `${menuStyles.menu} ${className}` : menuStyles.menu}
          role={role}
          id={id}
          data-om-menu
          variants={anchoredSurface} initial="initial" animate="animate" exit="exit"
          style={{ position: 'fixed', zIndex: 130, overflowY: 'auto' }}
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}

