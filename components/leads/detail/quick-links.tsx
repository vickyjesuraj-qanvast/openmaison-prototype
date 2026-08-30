'use client'

import { useSyncExternalStore } from 'react'
import { Icon } from '@/components/om/icon'
import { Tooltip } from '@/components/om/tooltip'
import styles from './quick-links.module.css'

/**
 * Create quick links — the strip on the right of the Lead Overview.
 *   collapsed (858:25094): 72 wide, eight 24px Light glyphs 24 apart under a left_panel_close toggle + divider
 *   expanded  (858:26317): 140 wide, "Create" head + eight 92-wide tiles (icon + 12/500 label)
 * The state is remembered per browser in localStorage `om.detail.quickLinks` (default collapsed).
 *
 * Persistence goes through `useSyncExternalStore` (the house pattern, `lib/leads/view-pref.ts`) rather than a
 * lazy `useState` initialiser: the page is server-rendered, and reading localStorage in the initialiser would
 * hydrate an "expanded" browser against collapsed server markup (React hydration error). The server snapshot
 * is always collapsed; the stored value takes over right after hydration, without a width transition
 * (`data-animate` only turns the transition on after the first toggle).
 *
 * Spec: design-source/context/lead-overview/01-header-tabs-quicklinks.txt.
 */
export type QuickLinksState = 'expanded' | 'collapsed'

const KEY = 'om.detail.quickLinks'
let cached: QuickLinksState | null = null
const listeners = new Set<() => void>()
const subscribe = (cb: () => void) => {
  listeners.add(cb)
  window.addEventListener('storage', cb)
  return () => { listeners.delete(cb); window.removeEventListener('storage', cb) }
}
const read = (): QuickLinksState => {
  if (cached) return cached
  try { return localStorage.getItem(KEY) === 'expanded' ? 'expanded' : 'collapsed' } catch { return 'collapsed' }
}
const write = (s: QuickLinksState) => {
  cached = s
  try { localStorage.setItem(KEY, s) } catch {}
  listeners.forEach((l) => l())
}
const serverSnapshot = (): QuickLinksState => 'collapsed'

type Link = { icon: string; label: string; kind: 'task' | 'quote' | 'callLog' | 'note' | 'meeting' | 'other' }
/** Order and glyphs as the mock lists them (top → bottom). */
const LINKS: Link[] = [
  { icon: 'task_alt', label: 'Task', kind: 'task' },
  { icon: 'docs', label: 'Quote', kind: 'quote' },
  { icon: 'call_log', label: 'Call Log', kind: 'callLog' },
  { icon: 'sticky_note_2', label: 'Note', kind: 'note' },
  { icon: 'event', label: 'Meeting', kind: 'meeting' },
  { icon: 'wand_shine', label: 'AI Visualiser', kind: 'other' },
  { icon: 'scan', label: 'Quote X-Ray', kind: 'other' },
  { icon: 'deployed_code', label: '3D Space Planner', kind: 'other' },
]

export function QuickLinks({
  onTask,
  onQuote,
  onCallLog,
  onNote,
  onMeeting,
  onOther,
}: {
  onTask: () => void
  /** "Quote" → the Quotes tab's new-quote path; absent, the link answers like the other inert ones (onOther). */
  onQuote?: () => void
  onCallLog: () => void
  /** "Note" → the Notes tab's new-note path (931-44865); absent, the link answers like the other inert ones (onOther). */
  onNote?: () => void
  onMeeting: () => void
  onOther: (label: string) => void
}) {
  const state = useSyncExternalStore(subscribe, read, serverSnapshot)
  // Animate the width only once the viewer has toggled — never on load / hydration.
  const animate = useSyncExternalStore(subscribe, () => cached !== null, () => false)
  const expanded = state === 'expanded'
  const toggle = () => write(expanded ? 'collapsed' : 'expanded')

  const fire = (link: Link) => {
    if (link.kind === 'task') onTask()
    else if (link.kind === 'quote') { if (onQuote) onQuote(); else onOther(link.label) }
    else if (link.kind === 'callLog') onCallLog()
    else if (link.kind === 'note') { if (onNote) onNote(); else onOther(link.label) }
    else if (link.kind === 'meeting') onMeeting()
    else onOther(link.label)
  }

  return (
    <aside className={styles.aside} aria-label="Create" data-state={state} data-animate={animate || undefined}>
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
            {LINKS.map((link) => (
              <button key={link.label} type="button" className={styles.tile} onClick={() => fire(link)}>
                <Icon name={link.icon} size={24} weight={300} />
                <span className={styles.label}>{link.label}</span>
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
            {LINKS.map((link) => (
              <Tooltip key={link.label} label={link.label} side="left">
                <button type="button" className={styles.glyph} aria-label={link.label} onClick={() => fire(link)}>
                  <Icon name={link.icon} size={24} weight={300} />
                </button>
              </Tooltip>
            ))}
          </div>
        </>
      )}
    </aside>
  )
}
