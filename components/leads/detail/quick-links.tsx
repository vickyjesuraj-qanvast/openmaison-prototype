'use client'

import { useSyncExternalStore } from 'react'
import { Icon } from '@/components/om/icon'
import { Tooltip } from '@/components/om/tooltip'
import { TABLET_DOWN, useMediaQuery } from '@/lib/breakpoint'
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

type Link = { icon: string; label: string; kind: 'task' | 'quote' | 'callLog' | 'note' | 'other' }
/**
 * Glyphs as the mock lists them, and its order top → bottom — except that Note sits ABOVE Contact Log
 * (REG-289, owner 2026-09-02; the mock draws Contact Log first). One list drives both the expanded tiles
 * and the collapsed glyph strip, so the two can never disagree.
 */
const LINKS: Link[] = [
  { icon: 'task_alt', label: 'Task', kind: 'task' },
  { icon: 'docs', label: 'Quote', kind: 'quote' },
  { icon: 'contract', label: 'Contract', kind: 'other' },   /* (REG-534) a new contract on this lead, straight into the editor */
  { icon: 'sticky_note_2', label: 'Note', kind: 'note' },
  { icon: 'call_log', label: 'Contact Log', kind: 'callLog' },   /* REG-279: the record it creates is a Contact log everywhere else (REG-278) */
  /* (REG-552) Meeting (icon `event`) is hidden with the Meetings tab until its mocks land. */
  { icon: 'wand_shine', label: 'AI Visualizer', kind: 'other' },   /* (REG-673, Q-01) one spelling everywhere — the product's name */
  { icon: 'scan', label: 'Quote X-Ray', kind: 'other' },
  { icon: 'deployed_code', label: '3D Space Planner', kind: 'other' },
]

export function QuickLinks({
  onTask,
  onQuote,
  onCallLog,
  onNote,
  onOther,
  busy = null,
}: {
  /** (wave E, tablet-11) The link whose work is still running — "AI Visualizer" while the lead's design is made / found before the editor
   *  opens (~1 s): its glyph turns into the house spinner, it reads aria-busy and a second press does nothing. */
  busy?: string | null
  onTask: () => void
  /** "Quote" → the Quotes tab's new-quote path; absent, the link answers like the other inert ones (onOther). */
  onQuote?: () => void
  onCallLog: () => void
  /** "Note" → the Notes tab's new-note path (931-44865); absent, the link answers like the other inert ones (onOther). */
  onNote?: () => void
  onOther: (label: string) => void
}) {
  const state = useSyncExternalStore(subscribe, read, serverSnapshot)
  // Animate the width only once the viewer has toggled — never on load / hydration.
  const animate = useSyncExternalStore(subscribe, () => cached !== null, () => false)
  /* (REG-269) Below 1200 the strip is collapsed-only (responsive.md): 140px of shortcuts there would leave the
     centre column narrower than any card. The remembered choice is NOT overwritten — it is only ignored at this
     width, so a viewer who pinned the strip open on their desktop still finds it open there. */
  const locked = useMediaQuery(TABLET_DOWN)
  const expanded = state === 'expanded' && !locked
  const toggle = () => write(expanded ? 'collapsed' : 'expanded')

  const fire = (link: Link) => {
    if (link.label === busy) return
    if (link.kind === 'task') onTask()
    else if (link.kind === 'quote') { if (onQuote) onQuote(); else onOther(link.label) }
    else if (link.kind === 'callLog') onCallLog()
    else if (link.kind === 'note') { if (onNote) onNote(); else onOther(link.label) }
    else onOther(link.label)
  }

  return (
    // data-state reports the state the strip is actually IN, so the locked tablet strip never carries the
    // expanded state's white plate or width (identical to `state` at every desktop width).
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
            {LINKS.map((link) => (
              <button key={link.label} type="button" className={styles.tile} onClick={() => fire(link)}
                      aria-busy={link.label === busy || undefined} aria-disabled={link.label === busy || undefined}>
                <Glyph link={link} busy={link.label === busy} />
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
                <button type="button" className={styles.glyph} aria-label={link.label} onClick={() => fire(link)}
                        aria-busy={link.label === busy || undefined} aria-disabled={link.label === busy || undefined}>
                  <Glyph link={link} busy={link.label === busy} />
                </button>
              </Tooltip>
            ))}
          </div>
        </>
      )}
    </aside>
  )
}

/** A link's 24px Light glyph, or — while its work runs — the house spinner (`progress_activity`, the upload toast's) in the same box. */
function Glyph({ link, busy }: { link: Link; busy: boolean }) {
  return busy
    ? <span className={styles.spin} data-testid="quick-link-busy"><Icon name="progress_activity" size={24} weight={300} /></span>
    : <Icon name={link.icon} size={24} weight={300} />
}
