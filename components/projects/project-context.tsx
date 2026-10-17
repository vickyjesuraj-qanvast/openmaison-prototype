'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { Viewer } from '@/lib/leads/assign-policy'
import type { NeedRow } from '@/lib/projects/needs-you'
import type { PrimaryRun } from '@/lib/projects/next-step'

/**
 * (simplify S-01 · S-02 · S-03, the build's contract B) What a project's page knows, for every tab's body: the ranked Needs you rows
 * (`ProjectDetail.needs`, lib/projects/needs-you.ts — K-N's), the counts per view (`ProjectDetail.tabCounts`, S-04's one rule), who is looking,
 * and the frame's doors — `run` presses a row's action exactly as the header's filled button does (one handler, so the button and the list
 * never disagree), `openVisualizer` / `openPlanner` are the Create strip's own two. The frame (components/projects/project-frame.tsx) wraps every
 * tab's body in it; a body outside a project (the lead's own tabs) reads the empty value.
 */
/** An action the page's one door opens — the header's `PrimaryAction` and a Needs you row's `NeedAction` are both one. */
export type ProjectAction = { run?: PrimaryRun; target?: string; href?: string }
export type ProjectContextValue = {
  projectId: string | null
  /** where the project was opened from — every link it builds keeps `?from=` (REG-465) */
  origin?: string
  needs: NeedRow[]
  counts: Readonly<Record<string, number>>
  viewer: Viewer | null
  /** the viewer sees the project's money (F-17) */
  money: boolean
  /** A view's address on this project, `?from=` kept: `href('messages', 'compose=1')`. */
  href: (slug: string, query?: string) => string
  /** Press an action: a `run` opens the page's own flow (the header's), an `href` navigates keeping `?from=`. `el` anchors a popover (Assign). */
  run: (a: ProjectAction, el?: HTMLElement | null) => void
  openVisualizer: () => void
  openPlanner: () => void
}

const EMPTY: ProjectContextValue = {
  projectId: null, needs: [], counts: {}, viewer: null, money: false,
  href: (slug) => slug, run: () => {}, openVisualizer: () => {}, openPlanner: () => {},
}
const Ctx = createContext<ProjectContextValue>(EMPTY)

export function ProjectContextProvider({ value, children }: { value: ProjectContextValue; children: ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

/** The whole value — the view switch, the Designs view and the site bar read it. */
export const useProjectContext = (): ProjectContextValue => useContext(Ctx)
/** The project's Needs you rows in Q-03's order — a tab draws its own: `useProjectNeeds().filter((r) => r.tab === 'money')`. */
export const useProjectNeeds = (): NeedRow[] => useContext(Ctx).needs
/** What waits on the viewer, per view slug (S-04). */
export const useProjectCounts = (): Readonly<Record<string, number>> => useContext(Ctx).counts
/** The frame's one door for an action (the header's filled button, a Needs you row's button). */
export const useProjectRun = (): ProjectContextValue['run'] => useContext(Ctx).run
