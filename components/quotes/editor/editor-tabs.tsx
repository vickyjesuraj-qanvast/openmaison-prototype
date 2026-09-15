'use client'

import { useEffect, useRef, type KeyboardEvent } from 'react'
import tabs from '@/components/om/tabs.module.css'
import styles from './editor-tabs.module.css'

export type EditorTab = { key: string; label: string }

/**
 * Quote editor tabs (Page Tabs 1261:35438): General Info · Items (n) · Payment Schedule · Files · Terms and Conditions ·
 * Additional Notes · Signature · Activity. Anchor tabs — selecting one scrolls its section under the sticky block and
 * the selected item follows the scroll (quote-editor.tsx owns that). Same DS Tab Item as components/om/tabs.tsx, with
 * its roving tabindex; buttons rather than links because nothing routes.
 */
export function EditorTabs({ items, active, onSelect, className }: {
  items: EditorTab[]
  active: string
  onSelect: (key: string) => void
  className?: string
}) {
  const listRef = useRef<HTMLDivElement>(null)
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return
    const els = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]'))
    if (els.length === 0) return
    const current = els.indexOf(document.activeElement as HTMLElement)
    let next: number
    if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = els.length - 1
    else if (e.key === 'ArrowLeft') next = current <= 0 ? els.length - 1 : current - 1
    else next = current >= els.length - 1 ? 0 : current + 1
    e.preventDefault()
    els[next]?.focus()
  }
  /* ≤1024 the row scrolls (REG-269): the active tab centres itself, as om/tabs does. No-op where nothing overflows. */
  useEffect(() => {
    const list = listRef.current
    if (!list || list.scrollWidth <= list.clientWidth) return
    const el = list.querySelector<HTMLElement>('[aria-selected="true"]')
    if (!el) return
    const target = el.offsetLeft - (list.clientWidth - el.offsetWidth) / 2
    list.scrollLeft = Math.max(0, Math.min(target, list.scrollWidth - list.clientWidth))
  }, [active])
  return (
    <div ref={listRef} role="tablist" aria-label="Quote sections" className={className ? `${tabs.tabs} ${className}` : tabs.tabs} onKeyDown={onKeyDown}>
      {items.map((t) => {
        const selected = t.key === active
        return (
          <button key={t.key} type="button" role="tab" aria-selected={selected} tabIndex={selected ? 0 : -1}
                  className={`${tabs.tab} ${styles.btn}`} onClick={() => onSelect(t.key)}>
            {t.label}
            {selected ? <span className={tabs.ink} aria-hidden /> : null}
          </button>
        )
      })}
    </div>
  )
}
