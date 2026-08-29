'use client'

import { useCallback, useEffect, useRef, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { anchoredSurface } from '@/lib/motion'
import menuStyles from '@/components/leads/menus.module.css'

/** Anchored menu rendered through a body portal so scroll containers (modal
 *  bodies, wizard panels) cannot clip it. Flips upward when the viewport has
 *  no room below. Esc is CONSUMED (preventDefault) so overlay hosts that
 *  check e.defaultPrevented leave their surface open. */
export function PortalMenu({
  open, anchor, onClose, align = 'left', width, children, role = 'listbox',
}: {
  open: boolean
  anchor: RefObject<HTMLElement | null>
  onClose: () => void
  align?: 'left' | 'right'
  width?: number
  children: ReactNode
  role?: string
}) {
  const menuRef = useRef<HTMLDivElement | null>(null)

  // Position via callback ref (runs before paint) — measured-DOM styling
  // without a state round-trip.
  const place = useCallback((el: HTMLDivElement | null) => {
    menuRef.current = el
    if (!el || !anchor.current) return
    const r = anchor.current.getBoundingClientRect()
    const w = width ?? r.width
    const left = align === 'right' ? r.right - w : r.left
    const spaceBelow = window.innerHeight - r.bottom
    el.style.left = `${left}px`
    el.style.width = `${w}px`
    if (spaceBelow < 340 && r.top > spaceBelow) {
      el.style.bottom = `${window.innerHeight - r.top + 4}px`
      el.style.top = 'auto'
      el.style.transformOrigin = 'bottom left'
    } else {
      el.style.top = `${r.bottom + 4}px`
      el.style.bottom = 'auto'
      el.style.transformOrigin = 'top left'
    }
  }, [anchor, align, width])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (anchor.current?.contains(t) || menuRef.current?.contains(t)) return
      onClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose() }
    }
    const onScroll = (e: Event) => {
      if (menuRef.current && e.target instanceof Node && menuRef.current.contains(e.target)) return
      onClose()
    }
    const t = setTimeout(() => document.addEventListener('pointerdown', onDown), 0)
    document.addEventListener('keydown', onKey, true)   // capture: an open menu owns Esc before any dialog / picker host
    document.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onClose)
    return () => {
      clearTimeout(t)
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey, true)
      document.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onClose)
    }
  }, [open, onClose, anchor])

  if (typeof document === 'undefined') return null
  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          ref={place}
          className={menuStyles.menu}
          role={role}
          data-om-menu
          variants={anchoredSurface} initial="initial" animate="animate" exit="exit"
          style={{ position: 'fixed', zIndex: 130, maxHeight: 320, overflowY: 'auto' }}
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}

