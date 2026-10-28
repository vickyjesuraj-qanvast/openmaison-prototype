'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { SegmentedButton, SegmentedButtonItem } from '@/components/ds'
import { ChipRail } from '@/components/om/chip-rail'
import { UNCOUNTED_VIEWS, groupOf } from '@/lib/projects/tabs'
import { useProjectContext } from './project-context'
import { opensProjectView } from '@/lib/settings/roles'
import styles from './project-views.module.css'

/** The views a viewer may open in a slug's group (Money only for whoever sees money, F-17; parity map, PR-022 — Accounting's Files alone). */
export function viewsFor(slug: string, money: boolean, role?: string | null) {
  return groupOf(slug).views.filter((v) => (v.slug !== 'money' || money) && opensProjectView(role, v.slug))
}

/**
 * (simplify S-03 · S-04 — the build's contract A) The view switch of a grouped tab — Tasks (All tasks · Compliance), Client (Updates · Messages ·
 * Tickets · Questionnaire), Design (Choices · Floor plan · Designs), Files & notes (Files · Notes & Logs · Activity): the house Chips (single), each
 * view with its own share of the strip's count ("Messages · 1"), Compliance with none (S-06). A press goes to the view's own address, keeping
 * `?from=` — every view keeps its address, so a link, the bell and Back still land on it. The body passes it as its title line (`views`), so the
 * body's own filter chips stay on the row below and no row is added. Outside a project (the lead's tabs) the bodies draw their own title.
 * (the calm UI build 2026-10-27, 3-08 · T-10) The views are a view switch, so they are the design system's SegmentedButton (the house's one look for
 * a view switch — Weeks · Months, Whose tasks), never chips: chips are what narrows a list, and on every grouped tab two rows of identical chips
 * stood one over the other. Each view keeps its own address, its count ("Messages · 1", T-07) and the radio semantics the key layer and the
 * probes read (role radio · aria-checked); the rail still scrolls on a short row.
 */
export function ProjectViews({ slug, note }: { slug: string; /** a grey line after the chips — Compliance's "n to do this phase" */ note?: ReactNode }) {
  const { href, counts, money, viewer } = useProjectContext()
  const router = useRouter()
  const group = groupOf(slug)
  const views = viewsFor(slug, money, viewer?.role)
  /* the press shows at once; the address follows (and a slug from the address wins once it lands) */
  const [picked, setPicked] = useState(slug)
  const [was, setWas] = useState(slug)
  if (was !== slug) { setWas(slug); setPicked(slug) }
  /* the sibling views are fetched while this one is read, as the strip's tabs are (om/tabs `prefetch`) — a press swaps a page already in hand */
  const siblings = views.filter((v) => v.slug !== slug).map((v) => href(v.slug)).join('|')
  useEffect(() => { for (const h of siblings.split('|')) if (h) router.prefetch(h) }, [siblings, router])
  /* (responsive audit 2026-10-23, W3-01) on a short row (a phone) the rail scrolls — the view you are on is brought to the middle of it,
     instead of hiding past its edge (at 320 Tickets, Messages, Floor plan and Designs opened with their own chip out of sight); again when
     the row's width settles (the tools beside it land, the phone turns). A rail with room (a desk) never moves. */
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const rail = root.current?.querySelector<HTMLElement>('[role="group"]')
    if (!rail) return
    const centre = () => {
      const chip = rail.querySelector<HTMLElement>('[role="radio"][aria-checked="true"]')
      if (!chip || rail.scrollWidth <= rail.clientWidth + 1) return
      const c = chip.getBoundingClientRect(), r = rail.getBoundingClientRect()
      rail.scrollTo({ left: rail.scrollLeft + (c.left + c.width / 2) - (r.left + r.width / 2), behavior: 'instant' })
    }
    centre()
    const ro = new ResizeObserver(centre); ro.observe(rail)
    if (rail.firstElementChild) ro.observe(rail.firstElementChild)   // the chips' own width (their face loads after the first paint)
    return () => ro.disconnect()
  }, [picked])
  const options = views.map((v) => {
    const n = UNCOUNTED_VIEWS.includes(v.slug) ? 0 : counts[v.slug] ?? 0
    return { value: v.slug, label: n > 0 ? `${v.label} · ${n}` : v.label }
  })
  if (views.length < 2) return null   // (parity map, PR-022) a group of one view (Accounting's Files) needs no switch
  return (
    <div ref={root} className={styles.views} data-testid="project-views">
      <ChipRail label={`${group.label} views`} className={styles.rail}>
        <SegmentedButton aria-label={`${group.label} views`} selectedKeys={[picked]} data-testid="project-view-chips"
                         onSelectionChange={(keys) => { const v = String([...keys][0] ?? ''); if (!v || v === picked) return; setPicked(v); router.push(href(v)) }}>
          {options.map((o) => <SegmentedButtonItem key={o.value} id={o.value}>{o.label}</SegmentedButtonItem>)}
        </SegmentedButton>
      </ChipRail>
      {note ? <span className={styles.note} data-testid="project-view-note">{note}</span> : null}
    </div>
  )
}
