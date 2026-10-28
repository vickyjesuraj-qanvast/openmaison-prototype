'use client'

import { useCallback, useEffect, useRef, type RefObject } from 'react'
import { useMenuKeyboard } from '@/components/om/surface'

/**
 * (REG-728) The rail's popovers — Tools, Company, View as, the AI credits card — open the same way, from ONE hook instead of four
 * copies: 8 right of the rail's edge (not the item's), level with the item's top and lifted to end at the viewport's foot when it
 * would run past it (`top`), or level with the item's bottom for the items at the rail's foot (`bottom`), or under the anchor at its
 * right edge for a header button (`below`). A press outside, Esc or a change of the window's width closes it; the arrows walk its
 * items (REG-286). On a phone these are bottom sheets and the hook stands aside.
 */
export type RailAlign = 'top' | 'bottom' | 'below'

export function useRailPopover({ open, anchor, onClose, sheet, align = 'top' }: {
  open: boolean
  anchor: RefObject<HTMLElement | null> | null
  onClose: () => void
  sheet: boolean
  align?: RailAlign
}) {
  const menuRef = useRef<HTMLDivElement | null>(null)
  const anchorRef = useRef(anchor); useEffect(() => { anchorRef.current = anchor })
  useMenuKeyboard(open && !sheet, menuRef, onClose)

  const place = useCallback((el: HTMLDivElement | null) => {
    menuRef.current = el
    const a = anchorRef.current?.current
    if (!el || !a) return
    const r = a.getBoundingClientRect(), EDGE = 8
    if (align === 'below') {
      el.style.left = `${Math.max(EDGE, Math.min(r.right - el.offsetWidth, window.innerWidth - el.offsetWidth - EDGE))}px`
      el.style.top = `${Math.min(r.bottom + 8, window.innerHeight - el.offsetHeight - EDGE)}px`
      el.style.transformOrigin = 'top right'
      return
    }
    const rail = a.closest('nav') ?? a
    el.style.left = `${rail.getBoundingClientRect().right + 8}px`
    if (align === 'bottom') {
      el.style.top = `${Math.max(EDGE, Math.min(r.bottom, window.innerHeight - EDGE) - el.offsetHeight)}px`
      el.style.transformOrigin = 'bottom left'
      return
    }
    const h = el.offsetHeight
    const top = r.top + h > window.innerHeight - EDGE ? Math.max(EDGE, r.bottom - h) : r.top
    el.style.top = `${top}px`
    el.style.transformOrigin = top < r.top ? 'bottom left' : 'top left'
  }, [align])

  /* (the calm UI build 2026-10-27) a popover that changes its height while open (View as's Demo fold opening) is placed again, so it never
     runs past the viewport's foot — the placement read its height once, at mount */
  useEffect(() => {
    if (!open || sheet || typeof ResizeObserver === 'undefined') return
    const el = menuRef.current
    if (!el) return
    const ro = new ResizeObserver(() => place(menuRef.current))
    ro.observe(el)
    return () => ro.disconnect()
  }, [open, sheet, place])

  useEffect(() => {
    if (!open || sheet) return
    const onDown =(e: MouseEvent) => { const t = e.target as Node; if (anchor?.current?.contains(t) || menuRef.current?.contains(t)) return; onClose() }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose() } }
    let lastW = window.innerWidth
    const onResize = () => { if (window.innerWidth !== lastW) { lastW = window.innerWidth; onClose() } }
    const t = setTimeout(() => document.addEventListener('pointerdown', onDown), 0)
    document.addEventListener('keydown', onKey, true)
    window.addEventListener('resize', onResize)
    return () => { clearTimeout(t); document.removeEventListener('pointerdown', onDown); document.removeEventListener('keydown', onKey, true); window.removeEventListener('resize', onResize) }
  }, [open, onClose, anchor, sheet])

  return { place, menuRef }
}
