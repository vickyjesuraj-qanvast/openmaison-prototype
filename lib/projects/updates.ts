import 'server-only'
import { planAllowsNow } from '@/lib/credits/plan-gate'
import { randomUUID } from 'node:crypto'
import { and, asc, desc, eq, inArray, isNotNull, isNull, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { homeownerLeadLinks, leadAssignees, leadFiles, leads, members, projectUpdateFiles, projectUpdates, projects, settings, type ProjectUpdate } from '@/lib/db/schema'
import { canOpenLead, fetchViewer } from '@/lib/leads/visibility'
import { titleCaseName } from '@/lib/format'
import { fetchPortalSections } from '@/lib/portal/sections-queries'
import { portalPeopleOf, portalWho } from '@/lib/portal/household'
import { mayChangeProject } from './policy'
import {
  SITE_UPDATES_FOLDER, UPDATE_REVIEW_KEY, firstName, isUpdateStatus, mayReviewUpdate, mediaKindOf, parsePending, parseUpdateReview, parseUpdateReviewers,
  type LatestUpdate, type ProjectUpdatesData, type UpdateMedia, type UpdatePendingView, type UpdatePerson, type UpdateView,
} from './updates-model'

/*
 * (REG-948…, Projects round 3) Updates on the server: the tab's feed, the Overview's three newest, the listing's facts, the review rule and
 * the "Site updates" folder the uploads file themselves in. Who sees: the project's lead's rule (`canOpenLead`) — a project the viewer may not
 * open answers not found. Every member who may see the project sees its drafts and its reviews: the team works on them together.
 */

/** (gaps build D, item 10) The members named as update reviewers (Settings › Projects › Updates). */
export async function fetchUpdateReviewers(): Promise<string[]> {
  const [row] = await db.select({ value: settings.value }).from(settings).where(eq(settings.key, UPDATE_REVIEW_KEY)).limit(1)
  return row ? parseUpdateReviewers(row.value) : []
}
/** (pending modules S19 — 1.0's plan gating) the review rule, off on Free (an approval); `fetchUpdateReviewStored` is the studio's own. */
export async function fetchUpdateReview(): Promise<boolean> {
  return (await planAllowsNow('internal_approvals')) ? fetchUpdateReviewStored() : false
}
export async function fetchUpdateReviewStored(): Promise<boolean> {
  const [row] = await db.select({ value: settings.value }).from(settings).where(eq(settings.key, UPDATE_REVIEW_KEY)).limit(1)
  return row ? parseUpdateReview(row.value) : true
}

/** (the build record §3) Round 2's milestones, read without importing its schema: none until its table exists in the loaded data.
    (simplify S-23) Each says whether it is under way — the phone's post starts on the running one. */
export async function fetchUpdateMilestones(projectId: string): Promise<{ id: string; name: string; running: boolean }[]> {
  try {
    const r = await db.all<{ id: string; name: string; status: string | null }>(sql`SELECT id, title AS name, status FROM project_milestones WHERE project_id = ${projectId} AND deleted_at IS NULL ORDER BY position`)
    return r.filter((m) => typeof m.id === 'string' && typeof m.name === 'string').map((m) => ({ id: m.id, name: m.name, running: m.status === 'in_progress' }))
  } catch { return [] }   // no such table (yet): the composer's picker stays hidden
}

/** The lead's "Site updates" folder at the top of its Files — made the first time an update uploads; a trashed one is left and a new one made. */
export async function siteUpdatesFolder(leadId: string, ownerId: string): Promise<string> {
  const [have] = await db.select({ id: leadFiles.id }).from(leadFiles)
    .where(and(eq(leadFiles.leadId, leadId), eq(leadFiles.kind, 'folder'), eq(leadFiles.name, SITE_UPDATES_FOLDER), isNull(leadFiles.parentId), isNull(leadFiles.deletedAt))).limit(1)
  if (have) return have.id
  const id = randomUUID(), now = new Date()
  await db.insert(leadFiles).values({ id, leadId, kind: 'folder', name: SITE_UPDATES_FOLDER, thumb: null, createdAt: now, parentId: null, ownerId, updatedAt: now })
  return id
}

/** A file as an update carries it — its kind from its mime, its bytes at the project's media address when the upload kept them. */
export function mediaOf(projectId: string, f: { id: string; name: string; kind: string; thumb: string | null; mime: string | null; sizeBytes: number | null }, kept: boolean): UpdateMedia {
  const kind = f.kind === 'video' ? 'video' : f.kind === 'pdf' || f.kind === 'doc' ? 'doc' : mediaKindOf(f.name, f.mime) ?? 'photo'
  return { fileId: f.id, name: f.name, kind, thumb: kind === 'doc' ? null : f.thumb, src: kept && kind !== 'photo' ? `/projects/${projectId}/media/${f.id}` : null, mime: f.mime, sizeBytes: f.sizeBytes }
}

const person = (byId: Map<string, { id: string; name: string; color: string }>, id: string | null): UpdatePerson => (id ? byId.get(id) ?? null : null)
const ms = (d: Date | null | undefined) => (d ? d.getTime() : null)

async function mediaFor(projectId: string, updateIds: string[]): Promise<Map<string, UpdateMedia[]>> {
  const out = new Map<string, UpdateMedia[]>()
  if (!updateIds.length) return out
  const rows = await db.select({ updateId: projectUpdateFiles.updateId, f: leadFiles, kept: sql<number>`exists (select 1 from lead_file_images i where i.file_id = ${leadFiles.id})` })
    .from(projectUpdateFiles).innerJoin(leadFiles, eq(leadFiles.id, projectUpdateFiles.fileId))
    .where(and(inArray(projectUpdateFiles.updateId, updateIds), isNull(leadFiles.deletedAt))).orderBy(asc(projectUpdateFiles.position), asc(projectUpdateFiles.createdAt))
  for (const r of rows) {
    const list = out.get(r.updateId) ?? []
    list.push(mediaOf(projectId, r.f, !!Number(r.kept)))
    out.set(r.updateId, list)
  }
  return out
}

/** (fix-C, C-01) The files a held change carries, by id in its order — live files only (a file trashed since drops out, as the feed's do). */
async function pendingMedia(projectId: string, fileIds: string[]): Promise<Map<string, UpdateMedia>> {
  const out = new Map<string, UpdateMedia>()
  const ids = [...new Set(fileIds)]
  if (!ids.length) return out
  const rows = await db.select({ f: leadFiles, kept: sql<number>`exists (select 1 from lead_file_images i where i.file_id = ${leadFiles.id})` })
    .from(leadFiles).where(and(inArray(leadFiles.id, ids), isNull(leadFiles.deletedAt)))
  for (const r of rows) out.set(r.f.id, mediaOf(projectId, r.f, !!Number(r.kept)))
  return out
}

function pendingOf(u: ProjectUpdate, byId: Map<string, { id: string; name: string; color: string }>, media: Map<string, UpdateMedia>, milestones: { id: string; name: string }[]): UpdatePendingView | null {
  const p = parsePending(u.pending)
  if (!p) return null
  return {
    title: p.title, html: p.body ?? '', milestoneId: p.milestoneId, milestoneName: p.milestoneId ? milestones.find((m) => m.id === p.milestoneId)?.name ?? null : null,
    media: p.fileIds.map((id) => media.get(id)).filter((m): m is UpdateMedia => !!m), by: person(byId, p.by), at: p.at,
    sentBack: p.note ? { by: person(byId, p.reviewedBy ?? null), at: p.reviewedAt ?? null, note: p.note } : null,
  }
}

function viewOf(u: ProjectUpdate, byId: Map<string, { id: string; name: string; color: string }>, media: UpdateMedia[], milestones: { id: string; name: string }[], held: Map<string, UpdateMedia> = new Map(), openedBy?: (id: string | null) => string | null): UpdateView {
  return {
    id: u.id, title: u.title, html: u.body ?? '', status: isUpdateStatus(u.status) ? u.status : 'draft',
    milestoneId: u.milestoneId, milestoneName: u.milestoneId ? milestones.find((m) => m.id === u.milestoneId)?.name ?? null : null,
    author: person(byId, u.authorId), createdAt: u.createdAt.getTime(), updatedAt: u.updatedAt.getTime(),
    editedAt: ms(u.editedAt), editedBy: person(byId, u.editedBy),
    submittedAt: ms(u.submittedAt), submittedBy: person(byId, u.submittedBy),
    reviewedAt: ms(u.reviewedAt), reviewedBy: person(byId, u.reviewedBy), reviewNote: u.reviewNote,
    publishedAt: ms(u.publishedAt), publishedBy: person(byId, u.publishedBy),
    withdrawnAt: ms(u.withdrawnAt), withdrawnBy: person(byId, u.withdrawnBy),
    clientOpenedAt: ms(u.clientOpenedAt), clientOpenedBy: u.clientOpenedAt && openedBy ? openedBy(u.clientOpenedBy) : null, media, pending: pendingOf(u, byId, held, milestones),
  }
}

/** The Updates tab: every live update of the project, newest first; null when the viewer may not see the project. */
export async function fetchProjectUpdates(projectId: string): Promise<ProjectUpdatesData | null> {
  const viewer = await fetchViewer()
  const [row] = await db.select({ p: projects, l: leads }).from(projects).innerJoin(leads, eq(leads.id, projects.leadId))
    .where(and(eq(projects.id, projectId), isNull(projects.deletedAt), isNull(leads.deletedAt))).limit(1)
  if (!row) return null
  const { p, l } = row
  if (!(await canOpenLead(viewer, l.id))) return null
  const [list, team, studio, reviewOn, milestones, link, sections, reviewers] = await Promise.all([
    db.select().from(projectUpdates).where(and(eq(projectUpdates.projectId, projectId), isNull(projectUpdates.deletedAt))).orderBy(desc(projectUpdates.createdAt)),
    db.select({ memberId: leadAssignees.memberId }).from(leadAssignees).where(eq(leadAssignees.leadId, l.id)),
    db.select({ id: members.id, name: members.name, color: members.color }).from(members),
    fetchUpdateReview(),
    fetchUpdateMilestones(projectId),
    /* (fix-C, C-08) the client holds the portal — Choices' read (lib/projects/choices.ts `fetchProjectChoices`) */
    db.select({ id: homeownerLeadLinks.id }).from(homeownerLeadLinks).where(and(eq(homeownerLeadLinks.leadId, l.id), isNotNull(homeownerLeadLinks.invitedAt), isNull(homeownerLeadLinks.withdrawnAt))).limit(1),
    fetchPortalSections(),
    fetchUpdateReviewers(),   // (gaps build D, item 10)
  ])
  const byId = new Map(studio.map((m) => [m.id, m]))
  const media = await mediaFor(projectId, list.map((u) => u.id))
  const held = await pendingMedia(projectId, list.flatMap((u) => parsePending(u.pending)?.fileIds ?? []))
  const client = titleCaseName(l.name)
  /* (fix-F, C-07) "Seen by Mei Ling" — the person who opened it (an older stamp names nobody: it was the client's own) */
  const people = (await portalPeopleOf([l.id])).get(l.id)
  const openedBy = (id: string | null) => portalWho(people, id, null).name
  return {
    project: { id: p.id, name: p.name, number: p.number, stage: p.stage, leadId: l.id },
    client: { name: client, firstName: firstName(client), invited: link.length > 0, section: sections.updates !== false },
    updates: list.map((u) => viewOf(u, byId, media.get(u.id) ?? [], milestones, held, openedBy)),
    milestones,
    viewer: { id: viewer.id, name: byId.get(viewer.id)?.name ?? 'You', role: viewer.role, mayPost: mayChangeProject(viewer, team.map((t) => t.memberId)), mayReview: mayReviewUpdate(viewer.role, { id: viewer.id, reviewers }) },
    reviewOn, reviewers,
    now: Date.now(),
  }
}

const pendingWaitsRow = (u: ProjectUpdate) => { const p = parsePending(u.pending); return !!p && !p.note }

/** The Overview's Latest updates card: the three newest live updates (any state — the team works on them). */
export async function fetchLatestUpdates(projectId: string, limit = 3): Promise<{ items: LatestUpdate[]; count: number; waiting: number }> {
  const list = await db.select().from(projectUpdates).where(and(eq(projectUpdates.projectId, projectId), isNull(projectUpdates.deletedAt))).orderBy(desc(sql`coalesce(${projectUpdates.publishedAt}, ${projectUpdates.submittedAt}, ${projectUpdates.createdAt})`))
  const top = list.slice(0, limit)
  const names = new Map((await db.select({ id: members.id, name: members.name }).from(members)).map((m) => [m.id, m.name]))
  const media = await mediaFor(projectId, top.map((u) => u.id))
  return {
    items: top.map((u) => {
      const photos = (media.get(u.id) ?? []).filter((m) => m.kind === 'photo')
      return { id: u.id, title: u.title, status: isUpdateStatus(u.status) ? u.status : 'draft', at: (u.publishedAt ?? u.submittedAt ?? u.createdAt).getTime(), author: u.authorId ? names.get(u.authorId) ?? null : null, photos: photos.length, thumb: photos[0]?.thumb ?? null }
    }),
    count: list.length,
    waiting: list.filter((u) => u.status === 'in_review' || (u.status === 'published' && pendingWaitsRow(u))).length,   // (fix-C, C-01) a held change waits too
  }
}

/** The listing's facts, per project: the newest publish (the Last update column, "No update for n days") and the updates waiting In review. */
export type UpdateFacts = { lastPublishedAt: Date | null; inReview: number }
export async function fetchUpdateFacts(projectIds: string[]): Promise<Map<string, UpdateFacts>> {
  const out = new Map<string, UpdateFacts>()
  if (!projectIds.length) return out
  const rows = await db.select({
    projectId: projectUpdates.projectId,
    last: sql<number | null>`max(case when ${projectUpdates.status} = 'published' then ${projectUpdates.publishedAt} end)`,
    /* (fix-C, C-01) a published update's held change waits for review too (its Send back's reason unset) */
    inReview: sql<number>`sum(case when ${projectUpdates.status} = 'in_review' or (${projectUpdates.status} = 'published' and ${projectUpdates.pending} is not null and json_extract(${projectUpdates.pending}, '$.note') is null) then 1 else 0 end)`,
  }).from(projectUpdates).where(and(inArray(projectUpdates.projectId, projectIds), isNull(projectUpdates.deletedAt))).groupBy(projectUpdates.projectId)
  for (const r of rows) out.set(r.projectId, { lastPublishedAt: r.last ? new Date(Number(r.last) * 1000) : null, inReview: Number(r.inReview ?? 0) })
  return out
}

/** Days since the project last told its client anything — its newest publish, else the day work began; null when it has not begun. */
export function daysSinceUpdate(f: UpdateFacts | undefined, startedAt: Date | null, now: number): number | null {
  const from = Math.max(f?.lastPublishedAt?.getTime() ?? 0, startedAt?.getTime() ?? 0)
  return from ? Math.floor((now - from) / 86_400_000) : null
}
