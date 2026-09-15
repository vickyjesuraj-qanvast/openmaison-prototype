'use client'

import { useEffect, useRef, useState, type RefObject } from 'react'

/**
 * Whether a table's frame has more columns than it can show (REG-430): the frame stays `overflow: visible` while its rows fit —
 * a short table's row menu must be able to hang below it — and becomes a sideways scroller only once the tracks run past it
 * (a narrower page, or a column the user widened). Watches the frame and its head row, which spans every track.
 */
export function useOverflowX(): [RefObject<HTMLDivElement | null>, boolean] {
  const ref = useRef<HTMLDivElement>(null)
  const [over, setOver] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => setOver(el.scrollWidth > el.clientWidth + 1)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    const head = el.querySelector('[role="row"]')
    if (head) ro.observe(head)
    return () => ro.disconnect()
  }, [])
  return [ref, over]
}
