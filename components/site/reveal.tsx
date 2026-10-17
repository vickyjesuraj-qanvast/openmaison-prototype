'use client'

import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import s from './site.module.css'

/**
 * (pending modules S35 — 1.0's `Reveal`) A block fades in and rises 24px the first time it scrolls into view. Nothing is ever hidden that a
 * visitor could already see: a block on screen when the page opens, a browser with reduced motion, or one with no IntersectionObserver keeps
 * it as it is — the script arms the hide only for what is still below the fold (1.0 hid everything until it was seen, so a slow script left a
 * blank page).
 */
export function Reveal({ children, delay = 0, className }: { children: ReactNode; /** ms after it enters (1.0's stagger) */ delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (el.getBoundingClientRect().top < window.innerHeight - 40) return
    el.dataset.reveal = 'armed'
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return
      el.dataset.reveal = 'shown'
      io.disconnect()
    }, { rootMargin: '0px 0px -80px 0px' })
    io.observe(el)
    return () => { io.disconnect(); if (el.dataset.reveal === 'armed') el.dataset.reveal = 'shown' }
  }, [])
  return <div ref={ref} className={className ? `${s.reveal} ${className}` : s.reveal} style={delay ? ({ '--reveal-delay': `${delay}ms` } as CSSProperties) : undefined}>{children}</div>
}
