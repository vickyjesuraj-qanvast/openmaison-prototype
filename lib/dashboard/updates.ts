import 'server-only'
import { and, desc, eq, gte, inArray, isNull, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leadFiles, leads, members, projectUpdateFiles, projectUpdates, projects } from '@/lib/db/schema'
import { visibleLeadIds } from '@/lib/leads/visibility'
import type { Viewer } from '@/lib/leads/assign-policy'
import { UPDATES_SHOWN, UPDATES_WINDOW_DAYS } from './model'

export type SiteUpdate = { id: string; projectId: string; projectName: string; title: string; author: string | null; at: number; files: number }

/**
 * (pending modules S22 — 1.0's owner feed, recent-updates-feed.tsx: "Recent Updates" across every project) The site updates the studio
 * published in the last fortnight on the projects this member sees, newest first — what each project's Updates tab shows as published (its
 * client reads them). The Dashboard's card lists them; the app shell's seed asks whether there is one, so the page's ghost draws the card only
 * then (lib/ghost-shapes.server.ts).
 */
export async function recentSiteUpdates(viewer: Viewer, now: number, limit = UPDATES_SHOWN): Promise<SiteUpdate[]> {
  const since = new Date(now - UPDATES_WINDOW_DAYS * 86_400_000)
  const [seen, rows] = await Promise.all([visibleLeadIds(viewer), publishedSiteUpdateRows(since)])
  const list = rows.filter((r) => !seen || seen.has(r.leadId)).slice(0, limit)
  if (!list.length) return []
  const [names, files] = await Promise.all([
    db.select({ id: members.id, name: members.name }).from(members),
    db.select({ updateId: projectUpdateFiles.updateId, n: sql<number>`count(*)` }).from(projectUpdateFiles).innerJoin(leadFiles, eq(leadFiles.id, projectUpdateFiles.fileId))
      .where(and(inArray(projectUpdateFiles.updateId, list.map((u) => u.id)), isNull(leadFiles.deletedAt))).groupBy(projectUpdateFiles.updateId),
  ])
  const nameOf = new Map(names.map((m) => [m.id, m.name])), filesOf = new Map(files.map((f) => [f.updateId, Number(f.n)]))
  return list.map((u) => ({ id: u.id, projectId: u.projectId, projectName: u.projectName, title: u.title, author: u.authorId ? nameOf.get(u.authorId) ?? null : null, at: u.publishedAt?.getTime() ?? now, files: filesOf.get(u.id) ?? 0 }))
}

/** (pending modules S39) The studio's published site updates — what each project's Updates tab shows as published (its client reads them), on
    live projects and leads, newest first; since a moment, or all of them. The one rule the Dashboard's card and Company › Reports › Studio
    health count by. */
export function publishedSiteUpdateRows(since?: Date) {
  return db.select({ id: projectUpdates.id, projectId: projectUpdates.projectId, title: projectUpdates.title, authorId: projectUpdates.authorId, publishedAt: projectUpdates.publishedAt, projectName: projects.name, leadId: leads.id })
    .from(projectUpdates).innerJoin(projects, eq(projects.id, projectUpdates.projectId)).innerJoin(leads, eq(leads.id, projects.leadId))
    .where(and(eq(projectUpdates.status, 'published'), isNull(projectUpdates.deletedAt), isNull(projects.deletedAt), isNull(leads.deletedAt), ...(since ? [gte(projectUpdates.publishedAt, since)] : [])))
    .orderBy(desc(projectUpdates.publishedAt))
}
