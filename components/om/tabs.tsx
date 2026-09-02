'use client'

import { useEffect, useRef, type KeyboardEvent } from 'react'
import Link from 'next/link'
import styles from './tabs.module.css'

/**
 * Tabs (858:24784) — the DS Tab Item row as routed links: the item whose `href` equals `activeHref` is selected
 * (primary + 4px ink bar), the rest enabled (secondary). Roving tabindex: Left / Right / Home / End move focus
 * between the tabs; Enter follows the link as usual.
 * Spec: design-source/context/lead-overview/01-header-tabs-quicklinks.txt.
 */
export function Tabs({
  items,
  activeHref,
  'aria-label': ariaLabel,
  className,
}: {
  items: { label: string; href: string }[]
  activeHref: string
  'aria-label'?: string
  className?: string
}) {
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return
    const tabs = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]'))
    if (tabs.length === 0) return
    const current = tabs.indexOf(document.activeElement as HTMLElement)
    let next: number
    if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = tabs.length - 1
    else if (e.key === 'ArrowLeft') next = current <= 0 ? tabs.length - 1 : current - 1
    else next = current >= tabs.length - 1 ? 0 : current + 1
    e.preventDefault()
    tabs[next]?.focus()
  }

  const hasActive = items.some((t) => t.href === activeHref)

  /* When the row scrolls (≤1199, REG-269) the active tab centres itself — otherwise a tab past the fold is
     selected invisibly. The row's OWN scrollLeft is set directly: `scrollIntoView` also scrolls ancestors,
     and on this sticky row that displaced the whole tab strip by its dock offset at desktop. No-op where the
     row does not overflow, so ≥1200 never moves. */
  const listRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const list = listRef.current
    if (!list || list.scrollWidth <= list.clientWidth) return
    const active = list.querySelector<HTMLElement>('[aria-selected="true"]')
    if (!active) return
    const target = active.offsetLeft - (list.clientWidth - active.offsetWidth) / 2
    list.scrollLeft = Math.max(0, Math.min(target, list.scrollWidth - list.clientWidth))
  }, [activeHref])

  return (
    <div ref={listRef} role="tablist" aria-label={ariaLabel} className={className ? `${styles.tabs} ${className}` : styles.tabs} onKeyDown={onKeyDown}>
      {items.map((t, i) => {
        const selected = t.href === activeHref
        return (
          <Link
            key={t.href}
            href={t.href}
            role="tab"
            aria-selected={selected}
            aria-current={selected ? 'page' : undefined}
            tabIndex={selected || (!hasActive && i === 0) ? 0 : -1}
            className={styles.tab}
            /* Every tab is fetched in full as soon as the row is on screen, so a click swaps content that is already
               in hand instead of starting a round trip and flashing the route's ghost (user 2026-08-30). The default
               prefetch only fetches the loading boundary — which is precisely the flash we are trying to remove. */
            prefetch
          >
            {t.label}
            {selected ? <span className={styles.ink} aria-hidden /> : null}
          </Link>
        )
      })}
    </div>
  )
}
