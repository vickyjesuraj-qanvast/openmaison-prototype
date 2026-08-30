'use client'

import { useEffect, type RefObject } from 'react'

/**
 * Layered surfaces — one Esc policy and one focus policy for every dialog, drawer, menu and picker (REG-4 R3:
 * "Esc closes the topmost layer"; audit 2026-08-30).
 *
 * Who is topmost is read from the DOM, not from listener order: portals append to <body> and nested dialogs render
 * inside their host, so a surface that FOLLOWS mine in document order (and is not my ancestor) sits above me.
 * The topmost surface claims Esc in the capture phase with preventDefault; every parent — this hook or a legacy
 * `!e.defaultPrevented` listener — then leaves its own surface open.
 */
const SURFACE = '[data-om-surface], [role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"], [aria-modal="true"]'

export function isTopmostSurface(el: Element | null): boolean {
  if (!el) return false
  for (const other of Array.from(document.querySelectorAll(SURFACE))) {
    if (other === el || other.contains(el)) continue
    if (el.compareDocumentPosition(other) & Node.DOCUMENT_POSITION_FOLLOWING) return false
  }
  return true
}

/** Esc closes this surface when it is the topmost one. `ref` = the surface element (the panel with role="dialog"). */
export function useEscapeLayer(open: boolean, ref: RefObject<HTMLElement | null>, onClose: () => void) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return
      if (!isTopmostSurface(ref.current)) return   // a menu / picker / nested dialog above owns Esc
      e.preventDefault()
      onClose()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [open, ref, onClose])
}

const TABBABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
const tabbables = (root: HTMLElement) =>
  Array.from(root.querySelectorAll<HTMLElement>(TABBABLE)).filter((el) => el.getClientRects().length > 0 && el.getAttribute('aria-hidden') !== 'true')

/**
 * WAI-ARIA dialog focus: focus moves into the surface on open (the panel itself, unless a field already auto-focused),
 * Tab cycles inside it while it is topmost (`trap`; off for non-modal drawers), and focus returns to the opener on close.
 * The panel needs `tabIndex={-1}`.
 */
export function useDialogFocus(open: boolean, ref: RefObject<HTMLElement | null>, { trap = true }: { trap?: boolean } = {}) {
  useEffect(() => {
    if (!open) return
    const panel = ref.current
    if (!panel) return
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    if (!panel.contains(document.activeElement)) panel.focus({ preventScroll: true })
    const onKey = (e: KeyboardEvent) => {
      if (!trap || e.key !== 'Tab' || e.defaultPrevented) return
      if (!isTopmostSurface(panel)) return
      const active = document.activeElement
      // Focus inside a portaled menu / picker above the panel keeps its own tab order.
      if (active instanceof Element && !panel.contains(active) && active.closest(SURFACE) && active.closest(SURFACE) !== panel) return
      const items = tabbables(panel)
      const first = items[0], last = items[items.length - 1]
      if (!first || !last) { e.preventDefault(); panel.focus(); return }
      const inside = panel.contains(active)
      if (e.shiftKey && (!inside || active === first || active === panel)) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && (!inside || active === last)) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      const active = document.activeElement
      if (previous && previous.isConnected && (!active || active === document.body || panel.contains(active))) previous.focus({ preventScroll: true })
    }
  }, [open, ref, trap])
}
