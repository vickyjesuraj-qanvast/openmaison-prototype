'use client'

import { useSyncExternalStore } from 'react'
import { Icon } from '@/components/om/icon'
import { Tooltip } from '@/components/om/tooltip'
import { TABLET_DOWN, useMediaQuery } from '@/lib/breakpoint'
import styles from './create-strip.module.css'

/**
 * The editor's Create strip (collapsed 1260:31160 · expanded 1271:40377): Maison AI · Price book · Templates
 * (Recent Quotes removed, owner 2026-09-18; Templates opens the template picker, REG-496; (pending modules S04 — card held:quotes, "the Create
 * strip's Brand Catalog tile — Coming soon · 1.0 had neither · revisit: drop or define") the mock's Brand Catalog tile is dropped: nothing in 1.0
 * or 2.0 holds a brands' catalogue to open — a supplier's products are My Items) — the Lead Overview's quick-links strip
 * (components/leads/detail/quick-links.tsx) with this page's three shortcuts. Remembered per browser in localStorage `om.quote.createStrip` (default collapsed), read through
 * useSyncExternalStore so a remembered "expanded" strip never hydrates against collapsed server markup.
 */
type StripState = 'expanded' | 'collapsed'
const KEY = 'om.quote.createStrip'
let cached: StripState | null = null
const listeners = new Set<() => void>()
const subscribe = (cb: () => void) => {
  listeners.add(cb)
  window.addEventListener('storage', cb)
  return () => { listeners.delete(cb); window.removeEventListener('storage', cb) }
}
const read = (): StripState => {
  if (cached) return cached
  try { return localStorage.getItem(KEY) === 'expanded' ? 'expanded' : 'collapsed' } catch { return 'collapsed' }
}
const write = (s: StripState) => {
  cached = s
  try { localStorage.setItem(KEY, s) } catch {}
  listeners.forEach((l) => l())
}
const serverSnapshot = (): StripState => 'collapsed'

export type StripLink = 'ai' | 'items' | 'templates'
const LINKS: { key: StripLink; icon: string | null; label: string }[] = [
  { key: 'ai', icon: null, label: 'Maison AI' },
  { key: 'items', icon: 'list_alt', label: 'Price book' },   /* (UX audit Q7) one name for the book on every way in (REG-662's pick) */
  { key: 'templates', icon: 'description', label: 'Templates' },
]

function Glyph({ icon }: { icon: string | null }) {
  if (icon) return <Icon name={icon} size={24} weight={300} />
  // eslint-disable-next-line @next/next/no-img-element
  return <span className={styles.mark}><img src="/figma-assets/maison-ai-mark.svg" alt="" /></span>
}

/** Whether the strip is drawn expanded (140) rather than collapsed (72) — the page centres its bulk bar on the column beside it. */
export function useStripExpanded() {
  const state = useSyncExternalStore(subscribe, read, serverSnapshot)
  const locked = useMediaQuery(TABLET_DOWN)
  return state === 'expanded' && !locked
}

export function CreateStrip({ onOpen }: { onOpen: (link: StripLink, label: string) => void }) {
  const state = useSyncExternalStore(subscribe, read, serverSnapshot)
  const animate = useSyncExternalStore(subscribe, () => cached !== null, () => false)
  const locked = useMediaQuery(TABLET_DOWN)   // ≤1024 collapsed-only; the remembered choice is ignored, not overwritten
  const expanded = state === 'expanded' && !locked
  const toggle = () => write(expanded ? 'collapsed' : 'expanded')
  return (
    <aside className={styles.aside} aria-label="Create" data-state={expanded ? 'expanded' : 'collapsed'} data-animate={animate || undefined}>
      {expanded ? (
        <>
          <div className={styles.head}>
            <span className={styles.title}>Create</span>
            <Tooltip label="Collapse" side="left">
              <button type="button" className={styles.toggle} aria-label="Collapse" aria-expanded onClick={toggle}>
                <Icon name="left_panel_open" size={20} weight={300} />
              </button>
            </Tooltip>
          </div>
          <div className={styles.tiles}>
            {LINKS.map((l) => (
              <button key={l.key} type="button" className={styles.tile} onClick={() => onOpen(l.key, l.label)}>
                <Glyph icon={l.icon} />
                <span className={styles.label}>{l.label}</span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <Tooltip label="Expand create links" side="left">
            <button type="button" className={styles.toggle} aria-label="Expand create links" aria-expanded={false} onClick={toggle}>
              <Icon name="left_panel_close" size={20} weight={300} />
            </button>
          </Tooltip>
          <div className={styles.divider} />
          <div className={styles.glyphs}>
            {LINKS.map((l) => (
              <Tooltip key={l.key} label={l.label} side="left">
                <button type="button" className={styles.glyph} aria-label={l.label} onClick={() => onOpen(l.key, l.label)}>
                  <Glyph icon={l.icon} />
                </button>
              </Tooltip>
            ))}
          </div>
        </>
      )}
    </aside>
  )
}
