'use client'

import { useCallback, useRef, useState } from 'react'

/**
 * Does a scroll container hold more than it shows? Drives the modal footer shadow (REG-322): a footer keeps its
 * top rule always and takes the shadow only while the body above it actually scrolls — content that runs on
 * under the footer is what the shadow announces. Attach the returned ref to the scrolling element; it watches
 * the element and its direct children with a ResizeObserver (a section expanding, a row added, the viewport
 * shrinking all flip the flag without a React commit) and re-collects the children when they change.
 *
 * The ref is a callback so a step body that remounts under AnimatePresence re-attaches by itself: a plain
 * element detaches through the cleanup React 19 lets the callback return; a `motion` element reports its
 * unmount as ref(null) instead and ignores that cleanup, so the null path stops the watch once the DOM has
 * settled — unless a newer element already took it over (popLayout mounts the next step before the last leaves).
 */
export function useOverflow(): readonly [(el: HTMLElement | null) => void | (() => void), boolean] {
  const [overflows, setOverflows] = useState(false)
  const watch = useRef<{ el: HTMLElement; stop: () => void } | null>(null)
  const ref = useCallback((el: HTMLElement | null) => {
    if (!el) {
      queueMicrotask(() => {
        const w = watch.current
        if (w && !w.el.isConnected) { w.stop(); watch.current = null; setOverflows(false) }
      })
      return
    }
    watch.current?.stop()
    const measure = () => setOverflows(el.scrollHeight - el.clientHeight > 1)   // 1px: rounding never counts as a scroll
    const ro = new ResizeObserver(measure)
    const observe = () => { ro.disconnect(); ro.observe(el); for (const child of el.children) ro.observe(child) }
    const mo = new MutationObserver(() => { observe(); measure() })
    observe()   // observe() delivers the initial size on its own — the first measure needs no extra call
    mo.observe(el, { childList: true })
    const stop = () => { ro.disconnect(); mo.disconnect() }
    watch.current = { el, stop }
    return () => {
      stop()
      if (watch.current?.el === el) { watch.current = null; setOverflows(false) }
    }
  }, [])
  return [ref, overflows] as const
}
