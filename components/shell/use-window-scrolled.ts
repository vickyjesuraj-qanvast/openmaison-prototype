'use client'

import { useSyncExternalStore } from 'react'

const subscribe = (notify: () => void) => {
  window.addEventListener('scroll', notify, { passive: true })
  window.addEventListener('resize', notify)
  return () => { window.removeEventListener('scroll', notify); window.removeEventListener('resize', notify) }
}

/**
 * (REG-331) Has the page scrolled at all? The sticky page headers take their shadow only while content is passing
 * under them — at the top, and on a page that fits, they keep the hairline alone (user 2026-09-04: "where is the
 * shadow on scroll", after the rail's logo row got the same rule). Server snapshot is false, so the first paint
 * carries no shadow.
 */
export function useWindowScrolled(): boolean {
  return useSyncExternalStore(subscribe, () => window.scrollY > 0, () => false)
}
