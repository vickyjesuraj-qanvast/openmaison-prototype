'use client'

import { openPlanLock, useCredits } from '@/components/credits/credits-client'
import { ProTag } from '@/components/credits/pro-tag'
import type { ProFeature } from '@/lib/credits/features'
import { useSyncExternalStore } from 'react'
import { Icon } from '@/components/om/icon'
import { Tooltip } from '@/components/om/tooltip'
import { DropdownDivider, DropdownItem, DropdownLabel } from '@/components/leads/dropdown'
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

type Link = { icon: string; label: string; kind: 'task' | 'quote' | 'callLog' | 'note' | 'other'
  /** (pending modules S19 — 1.0's plan gating) the Pro feature the link starts: on Free it wears the Pro tag and its press opens the lock card */
  pro?: ProFeature }
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
  { icon: 'call_log', label: 'Contact log', kind: 'callLog' },   /* REG-279: the record it creates is a Contact log everywhere else (REG-278) */
  /* (pending modules S23 — REG-552's hold lifted for this card) Meeting, where the mock drew it (`event`): plan one on the Meetings tab */
  { icon: 'event', label: 'Meeting', kind: 'other' },
  { icon: 'wand_shine', label: 'AI Visualizer', kind: 'other' },   /* (REG-673, Q-01) one spelling everywhere — the product's name */
  { icon: 'scan', label: 'Quote X-Ray', kind: 'other', pro: 'quote_xray' },
  /* (one-home N-04) live: the lead's way into the 3D Space Planner — the Tools tile's name and glyph (components/shell/tools-popover.tsx) */
  { icon: 'space_dashboard', label: '3D Space Planner', kind: 'other' },
]
/**
 * (parity P-03 · A-03 · D-02, the owner's pick 2026-10-08 — Q-21) A project's set: what a project makes day to day — Task · Note · Contact Log
 * (the lead's own three, on the project's tabs since one-home N-10) · Update (the Updates tab's composer) · Variation order (Money's) · AI
 * Visualizer · 3D Space Planner. Quote and Contract stay the lead's sales record; Quote X-Ray belongs to a quote. Glyphs: the lead's for the
 * shared links; an update's and a variation order's are the ones their Activity lines wear (lib/leads/activity.ts).
 */
const PROJECT_LINKS: Link[] = [
  { icon: 'task_alt', label: 'Task', kind: 'task' },
  { icon: 'sticky_note_2', label: 'Note', kind: 'note' },
  { icon: 'call_log', label: 'Contact log', kind: 'callLog' },
  { icon: 'event', label: 'Meeting', kind: 'other' },   // (pending modules S23) a site meeting, on Client › Meetings
  { icon: 'photo_camera', label: 'Update', kind: 'other' },
  { icon: 'request_quote', label: 'Variation order', kind: 'other' },
  { icon: 'wand_shine', label: 'AI Visualizer', kind: 'other' },
  { icon: 'space_dashboard', label: '3D Space Planner', kind: 'other' },
]

/** The strip's handlers — one shape for the strip and for its menu group (`QuickLinkItems`). */
export type QuickLinksHandlers = {
  /** (parity P-03) Whose links: a lead's nine (the default; Meeting back, S23) or a project's eight. The strip, its state key and its rules are one.
      (S44O — call C6) `desk`: a lead's, as Marketing works it — Task · Note · Contact Log (never a quote, a contract or a design tool). */
  set?: 'lead' | 'project' | 'desk'
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
}
/** (S44O — call C6) Marketing's lead links: the lead's own records, in the strip's order. */
const DESK_LINKS: Link[] = LINKS.filter((l) => l.kind === 'task' || l.kind === 'note' || l.kind === 'callLog')
const linksOf = (set: 'lead' | 'project' | 'desk') => (set === 'project' ? PROJECT_LINKS : set === 'desk' ? DESK_LINKS : LINKS)
/** (S44O — C6) How many glyphs the strip draws for a set — its ghost reads it. */
export const quickLinkCount = (set: 'lead' | 'project' | 'desk' = 'lead') => linksOf(set).length
/** A link pressed — the strip's tile or glyph, or its row in the ⋮ sheet: the same handler either way. */
function fireLink(link: Link, h: QuickLinksHandlers, locked: readonly string[] = []) {
  if (link.label === h.busy) return
  if (link.pro && locked.includes(link.pro)) { openPlanLock(link.pro); return }
  if (link.kind === 'task') h.onTask()
  else if (link.kind === 'quote') { if (h.onQuote) h.onQuote(); else h.onOther(link.label) }
  else if (link.kind === 'callLog') h.onCallLog()
  else if (link.kind === 'note') { if (h.onNote) h.onNote(); else h.onOther(link.label) }
  else h.onOther(link.label)
}

/**
 * (simplify S-14 · Q-04, the owner's "build everything" 2026-10-09) The Create strip as a menu group — ≤767 the strip is hidden (REG-269), so the
 * ⋮ sheet opens with a **Create** group: the strip's own links from the same list (a project's eight, a lead's nine — Meeting back, S23), the strip's own handlers,
 * then a rule and the record rows. A link still working (`busy`) reads disabled in its row. `onPicked` closes the sheet before the link runs.
 */
export function QuickLinkItems({ onPicked, ...h }: QuickLinksHandlers & { onPicked?: () => void }) {
  const locked = useCredits(null)?.locked ?? []
  return (
    <>
      <DropdownLabel>Create</DropdownLabel>
      {linksOf(h.set ?? 'lead').map((link) => (
        <DropdownItem key={link.label} disabled={link.label === h.busy} meta={link.pro && locked.includes(link.pro) ? <ProTag /> : undefined} onSelect={() => { onPicked?.(); fireLink(link, h, locked) }}>{link.label}</DropdownItem>
      ))}
      <DropdownDivider />
    </>
  )
}

export function QuickLinks(h: QuickLinksHandlers) {
  const { busy = null, set = 'lead' } = h
  const state = useSyncExternalStore(subscribe, read, serverSnapshot)
  // Animate the width only once the viewer has toggled — never on load / hydration.
  const animate = useSyncExternalStore(subscribe, () => cached !== null, () => false)
  /* (REG-269) Below 1200 the strip is collapsed-only (responsive.md): 140px of shortcuts there would leave the
     centre column narrower than any card. The remembered choice is NOT overwritten — it is only ignored at this
     width, so a viewer who pinned the strip open on their desktop still finds it open there. */
  const locked = useMediaQuery(TABLET_DOWN)
  const expanded = state === 'expanded' && !locked
  const toggle = () => write(expanded ? 'collapsed' : 'expanded')
  const links = linksOf(set)
  const lockedOn = useCredits(null)?.locked ?? []
  const isLocked = (link: Link) => !!link.pro && lockedOn.includes(link.pro)

  const fire = (link: Link) => fireLink(link, h, lockedOn)

  return (
    // data-state reports the state the strip is actually IN, so the locked tablet strip never carries the
    // expanded state's white plate or width (identical to `state` at every desktop width).
    <aside className={styles.aside} aria-label="Create" data-state={expanded ? 'expanded' : 'collapsed'} data-animate={animate || undefined} data-set={set}>
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
            {links.map((link) => (
              <button key={link.label} type="button" className={styles.tile} onClick={() => fire(link)}
                      aria-busy={link.label === busy || undefined} aria-disabled={link.label === busy || undefined}>
                <Glyph link={link} busy={link.label === busy} />
                <span className={styles.label}>{link.label}</span>
                {isLocked(link) ? <ProTag className={styles.pro} /> : null}
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
            {links.map((link) => (
              <Tooltip key={link.label} label={isLocked(link) ? `${link.label} · Pro` : link.label} side="left">
                <button type="button" className={styles.glyph} aria-label={isLocked(link) ? `${link.label}, Pro feature` : link.label} onClick={() => fire(link)}
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
