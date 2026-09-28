'use client'

import { useEffect, type RefObject } from 'react'
import { flagOn, markUsed, SINGLE_KEYS } from '@/lib/keys/store'

/**
 * The page's search field. "/" (and the phone bar's search glyph, REG-298) hand focus to whichever page-level
 * search input registered with `useSearchTarget`; the rail's tile opens the studio-wide search since REG-709.
 */
const EVENT = 'om:focus-search'

/** (REG-711) How many search boxes are on screen — the ? panel lists "/" only where there is one. */
let targets = 0
export const hasSearchTarget = () => targets > 0

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
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented || isTyping(e.target) || e.isComposing) return
      if (document.querySelector('[aria-modal="true"]')) return   // a modal owns the keyboard
      if (!flagOn(SINGLE_KEYS)) return   // (REG-716) single-character keys switched off in the ? panel (WCAG 2.1.4)
      e.preventDefault()
      markUsed('find')
      request()
    }
    targets += 1
    window.addEventListener(EVENT, request)
    window.addEventListener('keydown', onKey)
    return () => { targets -= 1; window.removeEventListener(EVENT, request); window.removeEventListener('keydown', onKey) }
  }, [ref, onRequest])
}
