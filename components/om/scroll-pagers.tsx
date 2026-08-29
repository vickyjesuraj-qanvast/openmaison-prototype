'use client'

import { useEffect, useState, type RefObject } from 'react'
import { Icon } from './icon'
import { Tooltip } from './tooltip'
import styles from './scroll-pagers.module.css'

/**
 * Edge pagers for any horizontal scroller (chip rails, boards): a round chevron appears at
 * whichever edge has more content and pages the scroller by `step` (default 70% of the
 * visible width). Optional surface-colour fades. Mount it as a sibling of the scroller inside a
 * `position: relative` wrapper and pass the scroller's ref.
 */
export function ScrollPagers({ scrollRef, step, fades = true, labels = ['Scroll left', 'Scroll right'] }: {
  scrollRef: RefObject<HTMLElement | null>
  /** px per page, or a function of the visible width. */
  step?: number | ((clientWidth: number) => number)
  fades?: boolean
  labels?: [string, string]
}) {
  const [edges, setEdges] = useState({ left: false, right: false })

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const measure = () => {
      const left = el.scrollLeft > 1
      const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 1
      setEdges((e) => (e.left === left && e.right === right ? e : { left, right }))
    }
    const ro = new ResizeObserver(measure)   // fires once on observe → initial state without an effect setState
    ro.observe(el)
    for (const child of Array.from(el.children)) ro.observe(child)
    el.addEventListener('scroll', measure, { passive: true })
    return () => { ro.disconnect(); el.removeEventListener('scroll', measure) }
  }, [scrollRef])

  const page = (dir: -1 | 1) => {
    const el = scrollRef.current
    if (!el) return
    const by = typeof step === 'function' ? step(el.clientWidth) : step ?? Math.round(el.clientWidth * 0.7)
    el.scrollBy({ left: dir * by, behavior: 'smooth' })
  }

  return (
    <>
      {fades ? <><span className={`${styles.fade} ${styles.fadeLeft}`} data-on={edges.left || undefined} aria-hidden /><span className={`${styles.fade} ${styles.fadeRight}`} data-on={edges.right || undefined} aria-hidden /></> : null}
      {edges.left ? (
        <Tooltip label={labels[0]}>
          <button type="button" className={`${styles.arrow} ${styles.arrowLeft}`} aria-label={labels[0]} onClick={() => page(-1)}>
            <Icon name="chevron_left" size={18} />
          </button>
        </Tooltip>
      ) : null}
      {edges.right ? (
        <Tooltip label={labels[1]}>
          <button type="button" className={`${styles.arrow} ${styles.arrowRight}`} aria-label={labels[1]} onClick={() => page(1)}>
            <Icon name="chevron_right" size={18} />
          </button>
        </Tooltip>
      ) : null}
    </>
  )
}
