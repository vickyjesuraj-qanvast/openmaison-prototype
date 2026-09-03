'use client'

import { useEffect, type RefObject } from 'react'

/**
 * Rail search → the page's search field. The rail tile (and its "/" hint,
 * 780:75727) don't own a search UI of their own in the mocks; they hand focus
 * to whichever page-level search input registered with `useSearchTarget`.
 */
const EVENT = 'om:focus-search'

export function requestSearchFocus() {
  window.dispatchEvent(new CustomEvent(EVENT))
}

function isTyping(el: EventTarget | null) {
  if (!(el instanceof HTMLElement)) return false
  return el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)
}

/** Registers `ref` as the page's search input: focused by the rail tile, the mobile bar's search glyph and the "/" key.
 *  `onRequest` (REG-298) runs first, so a page whose box is hidden at mobile can reveal it before the focus lands. */
export function useSearchTarget(ref: RefObject<HTMLInputElement | null>, onRequest?: () => void) {
  useEffect(() => {
    const focus = () => { const el = ref.current; if (!el) return; el.focus(); el.select() }
    const request = () => { onRequest?.(); focus() }
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented || isTyping(e.target)) return
      if (document.querySelector('[aria-modal="true"]')) return   // a modal owns the keyboard
      e.preventDefault()
      request()
    }
    window.addEventListener(EVENT, request)
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener(EVENT, request); window.removeEventListener('keydown', onKey) }
  }, [ref, onRequest])
}
