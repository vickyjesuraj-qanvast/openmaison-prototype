'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { ChipRail } from '@/components/om/chip-rail'
import { Chips } from '@/components/om/chips'
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
  const options = views.map((v) => {
    const n = UNCOUNTED_VIEWS.includes(v.slug) ? 0 : counts[v.slug] ?? 0
    return { value: v.slug, label: n > 0 ? `${v.label} · ${n}` : v.label }
  })
  if (views.length < 2) return null   // (parity map, PR-022) a group of one view (Accounting's Files) needs no switch
  return (
    <div className={styles.views} data-testid="project-views">
      <ChipRail label={`${group.label} views`} className={styles.rail}>
        <Chips label={`${group.label} views`} options={options} value={picked} testId="project-view-chips"
               onChange={(v) => { if (v === picked) return; setPicked(v); router.push(href(v)) }} />
      </ChipRail>
      {note ? <span className={styles.note} data-testid="project-view-note">{note}</span> : null}
    </div>
  )
}
