import 'server-only'
import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leads, meetings, members } from '@/lib/db/schema'
import { fetchViewer, visibleLeadIds } from '@/lib/leads/visibility'
import type { Viewer } from '@/lib/leads/assign-policy'
import { isMarketing, opensWorkspace, runsStudio, seesBooks } from '@/lib/settings/roles'
import { studioDay } from './since'
import { fetchProjectDetail, fetchProjectRows, type ProjectDetail } from '@/lib/projects/queries'
import { fetchLeadRows } from '@/lib/leads/queries'
import { fetchFinanceTodo } from '@/lib/finance/todo-server'
import { railBadges } from '@/lib/leads/tasks'
import { idsOf } from '@/lib/meetings/model'
import { withFrom } from '@/lib/nav'
import { callName } from '@/lib/studio-setup/model'
import { DASHBOARD } from './model'
import { parsePrefs, scopeFor, type DashPrefs, type DashScope } from './frame'
import { myOpenTasks } from './tasks-queries'

/*
 * (the Dashboard redesigned, 2026-10-26 — the contract between the build's lanes, design-source/context/dashboard-redesign-2026-10-26/brief.md)
 * **What every card reads, read once.** The page's parts (lib/dashboard/*-queries.ts) each take this context and ask it for the studio's
 * records — the Leads listing's rows, the projects and each one's detail, Finance › To do, the rail's counts, the viewer's tasks and meetings —
 * and each read runs at most once per page, however many parts ask (`once`). A part never reads a module's records another way: the house rule
 * "never a number computed differently" (S22), and the page answers sooner (P-14: it read every project in full before it said anything).
 *
 * A read that fails resolves to its empty value (null · []) — a card that can't be read is left out, never a failed page (the rail's rule).
 */

export type DashCtx = {
  viewer: Viewer
  role: string
  /** The member's first name as the studio wrote it (the welcome's rule, S42 A-05) — "there" when none. */
  first: string
  now: number
  /** Today's day number by the studio's clock (lib/dashboard/since.ts `studioDay` — the same scale as lib/projects/schedule-model.ts `dayOf`, a
      calendar day's number, so a stored day compares with it as before). */
  today: number
  /** Studio or Mine (his Q-07): an Owner's or Admin's switch; every other role reads their own reach and is always 'studio' here. */
  scope: DashScope
  prefs: DashPrefs
  /** (P-02) The member's visits to the page — their latest view and their sitting's mark (lib/dashboard/since.ts `markOf`), as stored. */
  visit: { seenAt: number | null; sinceAt: number | null }
  /** The leads this member sees (Who sees leads) — null = every lead. */
  seen: Set<string> | null
  /** What this role opens (lib/settings/roles.ts). */
  workspace: boolean
  books: boolean
  runs: boolean
  desk: boolean
  /** An address with the way back to the Dashboard (REG-465). */
  from: (to: string) => string
  /** Whether a lead / a project's members include this member — Mine's rule, and a Designer's own. */
  isMine: (memberIds: readonly string[]) => boolean
  read: {
    badges: () => Promise<Record<string, number>>
    projects: () => Promise<Awaited<ReturnType<typeof fetchProjectRows>> | null>
    /** Each project's detail (its Needs you, Coming up, money …) for the projects this member opens — one read per project, shared. */
    details: () => Promise<ProjectDetail[]>
    leads: () => Promise<Awaited<ReturnType<typeof fetchLeadRows>> | null>
    /** The Leads listing's rows this member sees (Who sees leads applied). */
    visibleLeads: () => Promise<Awaited<ReturnType<typeof fetchLeadRows>>['rows']>
    todo: () => Promise<Awaited<ReturnType<typeof fetchFinanceTodo>> | null>
    tasks: () => Promise<Awaited<ReturnType<typeof myOpenTasks>>>
    meetings: () => Promise<{ m: typeof meetings.$inferSelect; leadName: string }[]>
    members: () => Promise<(typeof members.$inferSelect)[]>
  }
}

/** A read made at most once: the first call starts it, every later call shares its answer; a failure answers `fallback`. */
function once<T>(load: () => Promise<T>, fallback: T): () => Promise<T> {
  let p: Promise<T> | null = null
  return () => (p ??= load().catch(() => fallback))
}

/** The context for the signed-in member. `scopeParam` = the address's `?scope=` (Studio / Mine), else their remembered one. */
export async function dashboardContext(scopeParam?: string | null): Promise<DashCtx> {
  const viewer = await fetchViewer()
  const role = viewer.role
  const now = Date.now()
  /* (P-14) the member's own row and the leads they see, side by side */
  const [[me], seen] = await Promise.all([
    db.select({ name: members.name, prefs: members.dashboardPrefs, seenAt: members.dashboardSeenAt, sinceAt: members.dashboardSinceAt }).from(members).where(eq(members.id, viewer.id)).limit(1),
    visibleLeadIds(viewer),
  ])
  const prefs = parsePrefs(me?.prefs ?? null)
  const runs = runsStudio(role)
  const scope = scopeFor(role, scopeParam ?? null, prefs)
  const workspace = opensWorkspace(role), books = seesBooks(role), desk = isMarketing(role)
  const isMine = (ids: readonly string[]) => ids.includes(viewer.id)

  const projects = once(() => (workspace ? fetchProjectRows() : Promise.resolve(null)), null)
  const leadsRead = once(() => (workspace || desk ? fetchLeadRows() : Promise.resolve(null)), null)
  const ctx: DashCtx = {
    /* (the calm pass 2026-10-26 — one clock) the page's today is the studio's day (Asia/Singapore, `studioDay`), as its greeting and the dock's
       "today" read it — the server's own day said Monday under a greeting that said Tuesday after midnight on a server elsewhere */
    viewer, role, first: callName(me?.name) || 'there', now, today: studioDay(now), scope, prefs, seen, workspace, books, runs, desk,
    visit: { seenAt: me?.seenAt?.getTime() ?? null, sinceAt: me?.sinceAt?.getTime() ?? null },
    from: (to) => withFrom(to, DASHBOARD), isMine,
    read: {
      badges: once(() => railBadges(), {} as Record<string, number>),
      projects,
      details: once(async () => {
        const rows = (await projects())?.rows ?? []
        return (await Promise.all(rows.map((r) => fetchProjectDetail(r.id).catch(() => null)))).filter((d): d is ProjectDetail => !!d)
      }, []),
      leads: leadsRead,
      visibleLeads: once(async () => { const d = await leadsRead(); return d ? (seen ? d.rows.filter((r) => seen.has(r.id)) : d.rows) : [] }, []),
      todo: once(() => (books ? fetchFinanceTodo() : Promise.resolve(null)), null),
      tasks: once(() => myOpenTasks(viewer.id, seen), []),
      meetings: once(async () => {
        if (!workspace) return []
        const rows = await db.select({ m: meetings, leadName: leads.name }).from(meetings).innerJoin(leads, eq(leads.id, meetings.leadId))
          .where(and(isNull(meetings.deletedAt), isNull(leads.deletedAt)))
        return rows.filter((r) => (!seen || seen.has(r.m.leadId)) && (idsOf(r.m.memberIds).includes(viewer.id) || r.m.createdBy === viewer.id))
      }, []),
      members: once(() => db.select().from(members), []),
    },
  }
  return ctx
}
