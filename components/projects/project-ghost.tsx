'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Bone, GhostSheet } from '@/components/shell/skeleton'
import { GhostTabs, Line, Slot } from '@/components/shell/ghost-kit'
import hdr from '@/components/shell/page-header-l2.module.css'
import lead from '@/components/shell/detail-skeleton.module.css'
import { InfoColumnGhost, QuickLinksGhost } from '@/components/shell/detail-skeleton'   // (parity P-07) one ghost family with the lead's
import { tabGhost } from '@/components/leads/detail/tab-ghosts'
import { useFirstRunShape, useViewerShape } from '@/lib/ghost-shape'
import { opensProjectView } from '@/lib/settings/roles'
import { setFlagPref, useFlagPref } from '@/lib/prefs'
import { PROJECT_TAB_GROUPS, groupOf } from '@/lib/projects/tabs'
import { ProjectViewsGhost } from './project-views-ghost'   // (simplify S-03) a grouped view's title line
import { DesignsGhost } from './designs/designs-ghost'   // (simplify S-03) Design › Designs
import { UpdatesGhost } from './updates/updates-ghost'
import { ScheduleGhost } from './schedule/schedule-ghost'
import { ChoicesGhost } from './choices/choices-ghost'
import { MoneyGhost } from './money/money-ghost'
import { FloorPlanGhost } from './floor-plan/floor-plan-ghost'   // (gaps build G)
import { MessagesGhost, TicketsGhost } from './tickets/thread-ghosts'   // (gaps build H)
import { ComplianceGhost } from './compliance/compliance-ghost'   // (gaps build I)
import frame from './project-frame.module.css'
import { OverviewGhost } from './overview/overview-ghost'   // (simplify S-01) the Overview body's ghost

/** (parity P-01 · P-07) The project's info column sections for the lead's column ghost — Collaborators (Owner · Members), Project info (number,
    stage, project type, scope, start, target end), Property info, Other info, and Custom fields when the studio has them; widths as K-B1's. */
const PROJECT_SECTIONS: { title: number; rows: [number, number | string][] }[] = [
  { title: 96, rows: [[44, 60], [64, 112]] },
  { title: 84, rows: [[56, 96], [40, 80], [84, 132], [40, '80%'], [64, 88], [72, 88]] },
  { title: 92, rows: [[36, 96], [52, 64], [64, 72], [36, 80], [104, 48], [92, 72], [108, '80%']] },
  { title: 72, rows: [[56, '70%']] },
]
const CUSTOM_SECTION = { title: 96, rows: [[72, 96], [88, 64]] as [number, number | string][] }
/** The project's Create strip: Task · Note · Contact Log · Update · Variation order · AI Visualizer · 3D Space Planner (Q-21). */
const STRIP_LINKS = 7

/** (fix-A, A-22) What the project's page draws, for its ghost: Getting started while it is set up, the Schedule and Money cards when they
    show, the Money tab for whoever sees money, the project-type chip. The reveal is told; the loader reads what this browser saw last.
    (parity P-07) …and the brief's Show more, and the info column's Custom fields. */
export type ProjectShape = { setup: boolean; schedule: boolean; money: boolean; typeChip: boolean; /** (gaps build, package A) a completed project's Closing summary */ closing?: boolean
  /** (parity P-02) the brief has more than its first card */ briefMore?: boolean; /** (parity P-01) the studio has custom fields */ customFields?: boolean
  /** (Contracts on the move, C4 — P-11 · C-23) the Overview's Documents card (≤1024) */ documents?: boolean }
const SHAPE_KEYS = ['setup', 'schedule', 'money', 'typeChip', 'closing', 'briefMore', 'customFields', 'documents'] as const
/** A project never seen here draws a running project's page — the common shape (simplify S-01: Needs you · My tasks · With {client} · Coming up |
    Progress · Money · Recent activity). */
const RUNNING: ProjectShape = { setup: false, schedule: true, money: true, typeChip: true }
const shapeKeyOf = (projectId: string, k: keyof ProjectShape) => `om.shape.project.${projectId}.${k}`

/** The page, once it has drawn: its shape remembered for the loader's next time (per browser). */
export function useRememberProjectShape(projectId: string, s: ProjectShape) {
  const { setup, schedule, money, typeChip, closing = false, briefMore = true, customFields = false, documents = true } = s
  useEffect(() => {
    const v: ProjectShape = { setup, schedule, money, typeChip, closing, briefMore, customFields, documents }
    for (const k of SHAPE_KEYS) setFlagPref(shapeKeyOf(projectId, k), !!v[k])
  }, [projectId, setup, schedule, money, typeChip, closing, briefMore, customFields, documents])
}
function useRememberedShape(projectId: string): ProjectShape {
  const [setup] = useFlagPref(shapeKeyOf(projectId || '_', 'setup'), RUNNING.setup)
  const [schedule] = useFlagPref(shapeKeyOf(projectId || '_', 'schedule'), RUNNING.schedule)
  const [money] = useFlagPref(shapeKeyOf(projectId || '_', 'money'), RUNNING.money)
  const [typeChip] = useFlagPref(shapeKeyOf(projectId || '_', 'typeChip'), RUNNING.typeChip)
  const [closing] = useFlagPref(shapeKeyOf(projectId || '_', 'closing'), false)   // (gaps build, package A)
  const [briefMore] = useFlagPref(shapeKeyOf(projectId || '_', 'briefMore'), true)   // (parity P-07)
  const [customFields] = useFlagPref(shapeKeyOf(projectId || '_', 'customFields'), false)
  const [documents] = useFlagPref(shapeKeyOf(projectId || '_', 'documents'), true)   // (Contracts on the move, C4 — C-23) a running project has its documents
  return { setup, schedule, money, typeChip, closing, briefMore, customFields, documents }
}

/**
 * (REG-708 · REG-929) A project page's ghost — its own layout: the L2 header (the crumb, the name with its chips, the one filled action and ⋮),
 * the tab strip, then the tab's own body: the Overview's two stacks of cards in their own words, or the lead tab it carries on (Tasks ·
 * Files · Activity — their ghosts, in the shape the tab opens on, REG-817). The route's `loading.tsx` reads the tab from the address; the page's
 * PageReveal is handed the same one. (fix-A, A-22) The Overview's cards and the tabs follow the project's own shape (REG-817).
 * (parity P-07 · A-12) The lead page's layout, as the page has it now: the info column on the Overview's left (its own ghost, folded to the strip
 * when this browser folded it), the Create strip on every tab's right, the brief and the lead's own cards; the header's Stage ▾ in the action
 * row, and on a phone ⋮ on the title's line with the one filled action filling the row under it (REG-359).
 */
/* (simplify Q-04) The phone's site bar, while the work runs — the frame says whether it draws (`siteBar`), the loader reads what this browser saw */
const siteBarKey = (projectId: string) => `om.shape.project.${projectId || '_'}.siteBar`
export function useRememberSiteBar(projectId: string, on: boolean) {
  useEffect(() => { setFlagPref(siteBarKey(projectId), on) }, [projectId, on])
}
/** The site bar's ghost: the dock frame's four columns — drawn ≤767 only, as the bar is (project-frame.module.css). */
function SiteBarGhost() {
  return (
    <div className={frame.siteBar} aria-hidden>
      {[40, 36, 32, 52].map((w, i) => <span key={i} className={frame.siteItem}><span className={frame.siteIcon}><Bone w={24} h={24} r={4} /></span><Line w={w} lh={16} h={10} /></span>)}
    </div>
  )
}

export function ProjectGhost({ tab, shape, siteBar }: { tab?: string; shape?: ProjectShape; /** (simplify Q-04) the phone's site bar is up */ siteBar?: boolean }) {
  const path = usePathname()?.split('/') ?? []
  const slug = tab ?? path[3] ?? ''
  const projectId = path[2] ?? ''
  const first = useFirstRunShape(slug && projectId ? `lead.${projectId}.${slug}` : null)
  const remembered = useRememberedShape(projectId)
  const s = shape ?? remembered
  /* (parity map, PR-022) Accounting's project: the strip Money · Files, no Stage, no filled button, no ⋮, no Create strip; its address opens on
     Money; a view they don't open keeps the frame with nothing in it but its gate's notice (drawn bare) */
  const books = useViewerShape('role.accounting')
  /* (simplify S-03) a view inside a group of more than one draws the group's view switch in its title's place, as the page does */
  const title = slug && !books && groupOf(slug).views.length > 1 ? <ProjectViewsGhost slug={slug} /> : undefined
  const booksBody = books ? (slug === '' || slug === 'money' ? <MoneyGhost band={first} /> : opensProjectView('Accounting', slug) ? null : <span />) : null
  const body = booksBody ?? (slug === 'updates' ? <UpdatesGhost first={first} title={title} /> : slug === 'schedule' ? <ScheduleGhost first={first} /> : slug === 'money' ? <MoneyGhost band={first} /> : slug === 'choices' ? <ChoicesGhost first={first} title={title} /> : slug === 'floor-plan' ? <FloorPlanGhost first={first} title={title} /> : slug === 'messages' ? <MessagesGhost title={title} /> : slug === 'tickets' ? <TicketsGhost first={first} title={title} /> : slug === 'compliance' ? <ComplianceGhost title={title} /> : slug === 'designs' ? <DesignsGhost first={first} title={title} /> : slug ? tabGhost(slug, first, title) : null)   // (REG-951 · Projects rounds 2 · 8) the project's own Updates, Schedule and Choices
  const [rememberedBar] = useFlagPref(siteBarKey(projectId), false)
  const bar = (siteBar ?? rememberedBar) && tab !== 'schedule' && !books   // the Schedule keeps its own dock (the frame's rule) · (parity map, PR-022) never Accounting's
  return (
    <GhostSheet label="Loading project">
      {/* the L2 header on its own classes (page-header-l2.module.css), as the lead's ghost draws it: the crumb over the name and its chips (the
          number and the project type — the stage left them for Stage ▾, P-08) · Stage ▾ · the one filled action · ⋮ — on a phone the name and ⋮
          share the first line and Stage ▾ and the action fill the second (REG-359) */}
      <div className={`${hdr.header} ${lead.head}`}>
        <span className={hdr.back}><Bone w={24} h={24} r={4} /></span>
        <div className={hdr.titleBlock}>
          <span className={hdr.crumb}><Line w={56} lh={16} h={10} /></span>
          <div className={hdr.titleRow}>
            <span className={hdr.title}><Line w={220} lh={24} h={20} /></span>
          </div>
        </div>
        {books ? null : <>
        <div className={hdr.actions}>
          <span className={frame.anchor}><Slot kind="btn" w={176} /></span>
          <span className={`${frame.anchor} ${frame.primary}`} data-on-overview={slug === '' || undefined}><Slot kind="btn" w={132} fill /></span>   {/* (the calm UI build 2026-10-27, 3-09 · 3-31) as the header: no chips, no button on a phone's Overview */}
        </div>
        <div className={hdr.titleActions}><Slot kind="icon" /></div>
        </>}
      </div>
      {/* (simplify S-03) the strip's seven groups — Money only for whoever sees money */}
      {/* (S43E, F3-03 W3-04) the open tab’s place, so the strip never jumps sideways at the hand-over (S42 A-10’s rule, here too) */}
      <GhostTabs labels={books ? ['Payments', 'Files'] : PROJECT_TAB_GROUPS.filter((g) => g.key !== 'money' || s.money).map((g) => g.label)}
                 active={books ? (slug === 'files' ? 1 : 0) : Math.max(0, PROJECT_TAB_GROUPS.filter((g) => g.key !== 'money' || s.money).findIndex((g) => g.key === groupOf(slug).key))} />
      <div className={frame.row} aria-hidden>
        {body ? null : <InfoColumnGhost sections={s.customFields ? [...PROJECT_SECTIONS, CUSTOM_SECTION] : PROJECT_SECTIONS} />}
        <div className={frame.centre}>
          {/* (simplify S-01) the Overview's body from its own layout: the brief, then act (Needs you · My tasks · With {client} · Coming up)
              and glance (Progress · Money · Recent activity) — components/projects/overview/overview-ghost.tsx */}
          {body ?? <OverviewGhost shape={s} />}
        </div>
        {books ? null : <QuickLinksGhost count={STRIP_LINKS} />}
      </div>
      {bar ? <SiteBarGhost /> : null}
    </GhostSheet>
  )
}
