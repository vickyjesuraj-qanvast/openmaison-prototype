'use client'

import { useEffect, useState, type RefObject } from 'react'

/**
 * (Contracts on the move, C3 — P-05) How far the client is in the agreement: the paper's headings (h1 · h2 · h3 — what the Outline lists)
 * as they pass the upper part of the screen. `at` = the section the reader is in (1-based, 0 before the paper has headings), `total` =
 * the headings. Read on scroll in a frame, never in render; re-read whenever the paper grows (it renders after the first paint) and when
 * `key` changes (a bundle's next document). Off (`on` false) it costs nothing.
 */
export function useReadingProgress(ref: RefObject<HTMLElement | null>, on: boolean, key: string | number = 0): { at: number; total: number } {
  const [p, setP] = useState({ at: 0, total: 0 })
  useEffect(() => {
    if (!on) return
    const root = ref.current
    if (!root) return
    let heads: HTMLElement[] = []
    let raf = 0
    const read = () => {
      raf = 0
      const line = window.innerHeight * 0.6
      let n = 0
      for (const h of heads) if (h.getBoundingClientRect().top < line) n++
      const at = heads.length ? Math.max(1, n) : 0
      setP((q) => (q.at === at && q.total === heads.length ? q : { at, total: heads.length }))
    }
    const collect = () => { heads = Array.from(root.querySelectorAll<HTMLElement>('h1, h2, h3')); read() }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(read) }
    const ro = new ResizeObserver(collect)   // fires once as it starts, then whenever the paper's size changes
    ro.observe(root)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => { ro.disconnect(); window.removeEventListener('scroll', onScroll); if (raf) cancelAnimationFrame(raf) }
  }, [ref, on, key])
  return p
}
