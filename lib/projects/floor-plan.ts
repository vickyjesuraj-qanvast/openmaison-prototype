import 'server-only'
import { and, asc, desc, eq, inArray, isNull, or } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  floorPlanComments, floorPlanConfirmations, floorPlanMarks, floorPlanPictures, floorPlanSeen, homeownerLeadLinks, leadAssignees, leadFiles, leadTasks, leads, members, projectFloorPlans, projects, quotes,
  type FloorPlanComment, type FloorPlanMark, type ProjectFloorPlan,
} from '@/lib/db/schema'
import { canOpenLead, fetchViewer } from '@/lib/leads/visibility'
import { imageAddress, rawAddress } from '@/lib/leads/file-store'
import { titleCaseName } from '@/lib/format'
import { mayChangeProject, seesMoney } from '@/lib/projects/policy'
import { portalPath } from '@/lib/portal/model'
/** the portal's own file address (lib/portal/files.ts `portalFileHref`, which reads this module — not imported, so the two never loop) */
const portalFileHref = (slug: string, fileId: string) => portalPath(slug, `file/${fileId}`)
import type { PortalVisitor } from '@/lib/portal/session'
import { STARTER_FOLDERS } from '@/lib/leads/file-model'
import { isStudioOnly, type CommentView, type ConfirmView, type MarkShape, type MarkTool, type MarkView, type PlanView, type Side } from './floor-plan-model'

/*
 * (gaps build G — calls G-Q1…G-Q18, design-source/context/parity/projects-gaps-build/g-read.md) The floor plan's reads, both sides. Who sees:
 * the studio — the project's lead's rule (`canOpenLead`); the client — their portal link's lead, with **every mark on Studio only stripped
 * here, on the server** (1.0 F-231: a rule, never a filter in the browser), and only plans that are not put away.
 */

const ms = (d: Date | null | undefined) => (d ? d.getTime() : null)

/** The studio's address of a plan's picture, and the portal's. */
export const planPictureHref = (projectId: string, planId: string, at: number) => `/projects/${projectId}/plan-picture/${planId}?v=${at}`
export const portalPlanPictureHref = (slug: string, planId: string, at: number) => portalPath(slug, `floor-plan/picture/${planId}?v=${at}`)

export type FloorPlanFile = { id: string; name: string; kind: string }
export type FloorPlanData = {
  project: { id: string; name: string; number: string; leadId: string; completed: boolean }
  client: { name: string; first: string; portal: boolean
    /** (parity map, TD-049 · UC-094) the studio asked them for their floor plan — when, and who asked; null when nobody has */
    asked: { at: number; by: string | null } | null }
  viewer: { id: string; name: string; mayChange: boolean; money: boolean }
  plans: PlanView[]
  /** the plan on screen — the one asked for, else the main plan, else the newest */
  planId: string | null
  marks: MarkView[]
  /** the client's confirmations, newest first (any plan) */
  confirmations: ConfirmView[]
  putAway: { id: string; name: string; at: number }[]
  /** pictures and PDFs already in the project's Files that are not a plan yet — "Use a file from Files" */
  files: FloorPlanFile[]
  folderId: string | null
  now: number
}

async function memberNames(): Promise<Map<string, string>> {
  return new Map((await db.select({ id: members.id, name: members.name }).from(members)).map((m) => [m.id, m.name]))
}

/** A plan's row as both sides read it; `picture` is the side's own address. */
function planView(p: ProjectFloorPlan, picture: string, original: PlanView['original'], marks: number, names: Map<string, string>): PlanView {
  return {
    id: p.id, name: p.name, isMain: p.isMain, width: p.width, height: p.height, picture, original, scale: p.scaleMmPerPx ?? null,
    addedBy: p.addedByName ?? (p.addedBy ? names.get(p.addedBy) ?? null : null), addedSide: p.addedByKind === 'client' ? 'client' : 'studio', at: p.createdAt.getTime(), marks,
  }
}

/** Every live mark of these plans with its thread, task and variation order; `strip` drops Studio only (the client's read). */
async function marksOf(planIds: string[], o: { strip: boolean; me: { side: Side; id: string | null }; photo: (fileId: string) => string }): Promise<Map<string, MarkView[]>> {
  const out = new Map<string, MarkView[]>()
  if (!planIds.length) return out
  const rows = (await db.select().from(floorPlanMarks).where(and(inArray(floorPlanMarks.planId, planIds), isNull(floorPlanMarks.deletedAt))).orderBy(asc(floorPlanMarks.createdAt)))
    .filter((m) => !(o.strip && isStudioOnly(m.layer)))
  const ids = rows.map((m) => m.id)
  const comments = ids.length ? await db.select().from(floorPlanComments).where(and(inArray(floorPlanComments.markId, ids), isNull(floorPlanComments.deletedAt))).orderBy(asc(floorPlanComments.createdAt)) : []
  const taskIds = rows.map((m) => m.taskId).filter((x): x is string => !!x)
  const voIds = rows.map((m) => m.variationId).filter((x): x is string => !!x)
  const [tasks, vos] = await Promise.all([
    taskIds.length ? db.select({ id: leadTasks.id, title: leadTasks.title, done: leadTasks.done }).from(leadTasks).where(inArray(leadTasks.id, taskIds)) : [],
    voIds.length ? db.select({ id: quotes.id, number: quotes.number, status: quotes.status }).from(quotes).where(and(inArray(quotes.id, voIds), isNull(quotes.deletedAt))) : [],
  ])
  const byMark = new Map<string, FloorPlanComment[]>()
  for (const c of comments) byMark.set(c.markId, [...(byMark.get(c.markId) ?? []), c])
  for (const m of rows) {
    const list = out.get(m.planId) ?? []
    list.push(markView(m, byMark.get(m.id) ?? [], tasks.find((t) => t.id === m.taskId) ?? null, vos.find((v) => v.id === m.variationId) ?? null, o))
    out.set(m.planId, list)
  }
  return out
}
function markView(m: FloorPlanMark, comments: FloorPlanComment[], task: MarkView['task'], variation: MarkView['variation'], o: { strip: boolean; me: { side: Side; id: string | null }; photo: (fileId: string) => string }): MarkView {
  const shape = (m.shape ?? { points: [] }) as MarkShape
  const side: Side = m.authorKind === 'client' ? 'client' : 'studio'
  const photos = (shape.photos ?? []).map((id) => ({ id, src: o.photo(id) }))
  return {
    id: m.id, tool: m.tool as MarkTool, shape, layer: m.layer, side, author: m.authorName, mine: side === o.me.side && !!o.me.id && m.authorId === o.me.id,
    status: m.status === 'resolved' ? 'resolved' : 'open', resolvedAt: ms(m.resolvedAt), resolvedBy: m.resolvedBy ?? null, photos,
    task: o.strip ? null : task, variation: o.strip ? null : variation,
    comments: comments.map((c): CommentView => {
      const cs: Side = c.authorKind === 'client' ? 'client' : 'studio'
      return { id: c.id, body: c.body, photos: (Array.isArray(c.photos) ? (c.photos as string[]) : []).map((id) => ({ id, src: o.photo(id) })), side: cs, author: c.authorName, mine: cs === o.me.side && !!o.me.id && c.authorId === o.me.id, at: c.createdAt.getTime() }
    }),
    at: m.createdAt.getTime(), updatedAt: m.updatedAt.getTime(),
  }
}

/** The newest change to a plan's drawing — a mark of the studio's that draws the layout (not a pin, a photo or a conversation; nothing on
    Studio only), made since — what "Changed since {client} confirmed it" compares. A move or a comment never counts. */
export async function marksChangedAt(planId: string): Promise<number> {
  const rows = await db.select({ at: floorPlanMarks.createdAt, tool: floorPlanMarks.tool, layer: floorPlanMarks.layer }).from(floorPlanMarks)
    .where(and(eq(floorPlanMarks.planId, planId), eq(floorPlanMarks.authorKind, 'studio'), isNull(floorPlanMarks.deletedAt)))
  return rows.filter((m) => m.tool !== 'pin' && m.tool !== 'photo' && !isStudioOnly(m.layer)).reduce((n, m) => Math.max(n, m.at.getTime()), 0)
}
async function confirmationsOf(projectId: string): Promise<ConfirmView[]> {
  const rows = await db.select().from(floorPlanConfirmations).where(eq(floorPlanConfirmations.projectId, projectId)).orderBy(desc(floorPlanConfirmations.createdAt))
  const changed = new Map<string, number>()
  for (const r of rows) if (!changed.has(r.planId)) changed.set(r.planId, await marksChangedAt(r.planId))
  return rows.map((r) => ({ id: r.id, planId: r.planId, name: titleCaseName(r.name), at: r.createdAt.getTime(), note: r.note ?? null, changedSince: (changed.get(r.planId) ?? 0) > (r.marksAt?.getTime() ?? r.createdAt.getTime()) }))
}

/** The project's Files › Floor plans folder (a starter folder, or the name a studio already used), when it has one. */
export async function floorPlansFolderOf(leadId: string): Promise<string | null> {
  const names = [STARTER_FOLDERS.find((f) => f.name === 'Floor plans')!.name, ...(STARTER_FOLDERS.find((f) => f.name === 'Floor plans')!.also ?? [])].map((n) => n.toLowerCase())
  const folders = await db.select({ id: leadFiles.id, name: leadFiles.name, parentId: leadFiles.parentId }).from(leadFiles)
    .where(and(eq(leadFiles.leadId, leadId), eq(leadFiles.kind, 'folder'), isNull(leadFiles.deletedAt)))
  return folders.find((f) => !f.parentId && names.includes(f.name.toLowerCase()))?.id ?? folders.find((f) => names.includes(f.name.toLowerCase()))?.id ?? null
}

/**
 * The Floor plan tab's read (studio). Null when the project is gone or the viewer may not see its lead (the tab answers not found).
 */
export async function fetchFloorPlanData(projectId: string, planId?: string | null): Promise<FloorPlanData | null> {
  const [row] = await db.select({ p: projects, lead: { id: leads.id, name: leads.name } }).from(projects).innerJoin(leads, eq(leads.id, projects.leadId))
    .where(and(eq(projects.id, projectId), isNull(projects.deletedAt))).limit(1)
  if (!row) return null
  const viewer = await fetchViewer()
  if (!(await canOpenLead(viewer, row.p.leadId))) return null
  const [team, names, plansAll, files, folderId, portalLink] = await Promise.all([
    db.select({ memberId: leadAssignees.memberId }).from(leadAssignees).where(eq(leadAssignees.leadId, row.p.leadId)),
    memberNames(),
    db.select().from(projectFloorPlans).where(eq(projectFloorPlans.projectId, projectId)).orderBy(asc(projectFloorPlans.createdAt)),
    db.select({ id: leadFiles.id, name: leadFiles.name, kind: leadFiles.kind, mime: leadFiles.mime }).from(leadFiles)
      .where(and(eq(leadFiles.leadId, row.p.leadId), isNull(leadFiles.deletedAt), or(eq(leadFiles.kind, 'image'), eq(leadFiles.kind, 'pdf')))).orderBy(desc(leadFiles.createdAt)),
    floorPlansFolderOf(row.p.leadId),
    db.select({ id: homeownerLeadLinks.id, invitedAt: homeownerLeadLinks.invitedAt, withdrawnAt: homeownerLeadLinks.withdrawnAt }).from(homeownerLeadLinks).where(eq(homeownerLeadLinks.leadId, row.p.leadId)).limit(1),
  ])
  const teamIds = team.map((t) => t.memberId)
  const live = plansAll.filter((p) => !p.putAwayAt)
  const current = live.find((p) => p.id === planId) ?? live.find((p) => p.isMain) ?? live[live.length - 1] ?? null
  const me = { side: 'studio' as Side, id: viewer.id }
  const marks = await marksOf(live.map((p) => p.id), { strip: false, me, photo: (id) => imageAddress(id) })
  const fileById = new Map(files.map((f) => [f.id, f]))
  const plans = live.map((p) => {
    const f = p.fileId ? fileById.get(p.fileId) : undefined
    return planView(p, planPictureHref(projectId, p.id, p.updatedAt.getTime()), f ? { href: rawAddress(f.id), kind: f.kind, name: f.name } : null, marks.get(p.id)?.length ?? 0, names)
  })
  const used = new Set(plansAll.map((p) => p.fileId).filter(Boolean))
  /* photos on marks are kept in Files › Floor plans too — the import list leaves out what is already on a plan */
  const onMarks = new Set([...marks.values()].flat().flatMap((m) => [...m.photos.map((x) => x.id), ...m.comments.flatMap((c) => c.photos.map((x) => x.id))]))
  const first = titleCaseName(row.lead.name).split(' ')[0] ?? row.lead.name
  const link = portalLink[0]
  return {
    project: { id: row.p.id, name: row.p.name, number: row.p.number, leadId: row.p.leadId, completed: row.p.stage === 'completed' },
    client: { name: titleCaseName(row.lead.name), first, portal: !!link?.invitedAt && !link.withdrawnAt,
      asked: row.p.floorPlanAskedAt ? { at: row.p.floorPlanAskedAt.getTime(), by: row.p.floorPlanAskedBy ? names.get(row.p.floorPlanAskedBy) ?? null : null } : null },
    viewer: { id: viewer.id, name: names.get(viewer.id) ?? 'You', mayChange: mayChangeProject(viewer, teamIds) && row.p.stage !== 'completed', money: seesMoney(viewer, teamIds) },
    plans, planId: current?.id ?? null, marks: current ? marks.get(current.id) ?? [] : [],
    confirmations: await confirmationsOf(projectId),
    putAway: plansAll.filter((p) => p.putAwayAt).map((p) => ({ id: p.id, name: p.name, at: p.putAwayAt!.getTime() })),
    files: files.filter((f) => !used.has(f.id) && !onMarks.has(f.id) && (f.kind === 'pdf' || (f.mime ?? '').match(/^image\/(jpeg|png|webp)$/))).map((f) => ({ id: f.id, name: f.name, kind: f.kind })),
    folderId, now: Date.now(),
  }
}

/** A plan's picture, for whoever may see the project's lead (the route checks); null when gone. */
export async function planPictureFor(projectId: string, planId: string): Promise<{ data: string; name: string; leadId: string } | null> {
  const [p] = await db.select({ name: projectFloorPlans.name, leadId: projectFloorPlans.leadId, data: floorPlanPictures.data }).from(projectFloorPlans)
    .innerJoin(floorPlanPictures, eq(floorPlanPictures.planId, projectFloorPlans.id))
    .where(and(eq(projectFloorPlans.id, planId), eq(projectFloorPlans.projectId, projectId))).limit(1)
  return p ?? null
}

/* ── The client's side ─────────────────────────────────────────────────────────────────────────────────────────────────────── */

export type PortalFloorPlanHome = {
  homeId: string; leadId: string; projectId: string; title: string
  plans: PlanView[]; planId: string | null; marks: MarkView[]
  /** the newest confirmation of each plan, by plan id */
  confirmed: Record<string, ConfirmView>
}
export type PortalFloorPlanData = { homes: PortalFloorPlanHome[]; me: { id: string; name: string; preview: boolean } }

/**
 * The portal's Floor plan: each of the visitor's homes with a project — its plans that are not put away (the main one first on arrival),
 * the open plan's marks **without Studio only** (stripped here — a client never receives them), each plan's newest confirmation.
 */
export async function fetchPortalFloorPlan(visitor: PortalVisitor, slug: string, planId?: string | null): Promise<PortalFloorPlanData> {
  const leadIds = visitor.links.map((l) => l.leadId)
  const homes: PortalFloorPlanHome[] = []
  if (!leadIds.length) return { homes, me: { id: visitor.homeownerId, name: visitor.name, preview: visitor.preview } }
  const projs = await db.select({ id: projects.id, leadId: projects.leadId, name: projects.name }).from(projects).where(and(inArray(projects.leadId, leadIds), isNull(projects.deletedAt)))
  const names = await memberNames()
  for (const link of visitor.links) {
    const proj = projs.find((p) => p.leadId === link.leadId)
    if (!proj) continue
    const live = await db.select().from(projectFloorPlans).where(and(eq(projectFloorPlans.projectId, proj.id), isNull(projectFloorPlans.putAwayAt))).orderBy(asc(projectFloorPlans.createdAt))
    const current = live.find((p) => p.id === planId) ?? live.find((p) => p.isMain) ?? live[live.length - 1] ?? null
    const marks = await marksOf(live.map((p) => p.id), { strip: true, me: { side: 'client', id: visitor.homeownerId }, photo: (id) => portalFileHref(slug, id) })
    const confirms = await confirmationsOf(proj.id)
    const confirmed: Record<string, ConfirmView> = {}
    for (const c of confirms) if (!confirmed[c.planId]) confirmed[c.planId] = c
    homes.push({
      homeId: link.linkId, leadId: link.leadId, projectId: proj.id, title: proj.name,
      plans: live.map((p) => planView(p, portalPlanPictureHref(slug, p.id, p.updatedAt.getTime()), p.fileId ? { href: portalFileHref(slug, p.fileId), kind: 'file', name: p.name } : null, marks.get(p.id)?.length ?? 0, names)),
      planId: current?.id ?? null, marks: current ? marks.get(current.id) ?? [] : [], confirmed,
    })
  }
  return { homes, me: { id: visitor.homeownerId, name: visitor.name, preview: visitor.preview } }
}

/** A plan's picture for a portal visitor: on one of their homes, not put away. */
export async function portalPlanPictureFor(visitor: PortalVisitor, planId: string): Promise<{ data: string; name: string } | null> {
  const leadIds = visitor.links.map((l) => l.leadId)
  if (!leadIds.length) return null
  const [p] = await db.select({ name: projectFloorPlans.name, data: floorPlanPictures.data }).from(projectFloorPlans)
    .innerJoin(floorPlanPictures, eq(floorPlanPictures.planId, projectFloorPlans.id))
    .innerJoin(projects, eq(projects.id, projectFloorPlans.projectId))
    .where(and(eq(projectFloorPlans.id, planId), inArray(projectFloorPlans.leadId, leadIds), isNull(projectFloorPlans.putAwayAt), isNull(projects.deletedAt))).limit(1)
  return p ?? null
}

/**
 * (PORTAL_FILE_RULES, the Floor plan switch) A lead file the client may open from the floor plan: a live plan's original, or a photo on a
 * live mark (or its thread) that is not on Studio only.
 */
export async function isClientFloorPlanFile(fileId: string, leadId: string): Promise<boolean> {
  const [plan] = await db.select({ id: projectFloorPlans.id }).from(projectFloorPlans).where(and(eq(projectFloorPlans.fileId, fileId), eq(projectFloorPlans.leadId, leadId), isNull(projectFloorPlans.putAwayAt))).limit(1)
  if (plan) return true
  const marks = await db.select({ id: floorPlanMarks.id, shape: floorPlanMarks.shape, layer: floorPlanMarks.layer }).from(floorPlanMarks)
    .innerJoin(projectFloorPlans, eq(projectFloorPlans.id, floorPlanMarks.planId))
    .where(and(eq(projectFloorPlans.leadId, leadId), isNull(floorPlanMarks.deletedAt), isNull(projectFloorPlans.putAwayAt)))
  const visible = marks.filter((m) => !isStudioOnly(m.layer))
  if (visible.some((m) => ((m.shape as MarkShape | null)?.photos ?? []).includes(fileId))) return true
  if (!visible.length) return false
  const comments = await db.select({ photos: floorPlanComments.photos }).from(floorPlanComments).where(and(inArray(floorPlanComments.markId, visible.map((m) => m.id)), isNull(floorPlanComments.deletedAt)))
  return comments.some((c) => Array.isArray(c.photos) && (c.photos as string[]).includes(fileId))
}

/** (the portal's bell) What reached each home from the studio on the floor plan: a plan added, a studio reply on a client's mark, a studio mark —
    with when the person last opened the floor plan. Studio only is never counted. */
export type BellPlanFacts = { plans: { id: string; name: string; at: number }[]; replies: { id: string; markId: string; at: number; author: string; plan: string }[]; seenAt: number | null }
export async function floorPlanBellFacts(leadId: string, linkId: string): Promise<BellPlanFacts> {
  const plans = await db.select().from(projectFloorPlans).where(and(eq(projectFloorPlans.leadId, leadId), isNull(projectFloorPlans.putAwayAt)))
  const [seen] = await db.select({ at: floorPlanSeen.seenAt }).from(floorPlanSeen).where(eq(floorPlanSeen.linkId, linkId)).limit(1)
  const facts: BellPlanFacts = { plans: plans.filter((p) => p.addedByKind === 'studio').map((p) => ({ id: p.id, name: p.name, at: p.createdAt.getTime() })), replies: [], seenAt: seen ? seen.at.getTime() : null }
  if (!plans.length) return facts
  const marks = (await db.select().from(floorPlanMarks).where(and(inArray(floorPlanMarks.planId, plans.map((p) => p.id)), isNull(floorPlanMarks.deletedAt)))).filter((m) => !isStudioOnly(m.layer))
  const clientMarks = marks.filter((m) => m.authorKind === 'client').map((m) => m.id)
  if (clientMarks.length) {
    const replies = await db.select().from(floorPlanComments).where(and(inArray(floorPlanComments.markId, clientMarks), eq(floorPlanComments.authorKind, 'studio'), isNull(floorPlanComments.deletedAt)))
    for (const c of replies) { const m = marks.find((x) => x.id === c.markId)!; facts.replies.push({ id: c.id, markId: c.markId, at: c.createdAt.getTime(), author: c.authorName, plan: plans.find((p) => p.id === m.planId)?.name ?? 'the plan' }) }
  }
  return facts
}
/** The person opened the floor plan: their bell's floor-plan rows before now read as read. Never in a studio's preview. */
export async function stampFloorPlanSeen(visitor: PortalVisitor): Promise<void> {
  if (visitor.preview) return
  const now = new Date()
  for (const l of visitor.links) await db.insert(floorPlanSeen).values({ linkId: l.linkId, seenAt: now }).onConflictDoUpdate({ target: floorPlanSeen.linkId, set: { seenAt: now } })
}

/** (the tab's count, `ProjectDetail.tabCounts`) The client's open marks nobody at the studio has answered yet — what is still to do there. */
export async function floorPlanToAnswer(projectId: string): Promise<number> {
  const open = await db.select({ id: floorPlanMarks.id }).from(floorPlanMarks).innerJoin(projectFloorPlans, eq(projectFloorPlans.id, floorPlanMarks.planId))
    .where(and(eq(floorPlanMarks.projectId, projectId), eq(floorPlanMarks.authorKind, 'client'), eq(floorPlanMarks.status, 'open'), isNull(floorPlanMarks.deletedAt), isNull(projectFloorPlans.putAwayAt)))
  if (!open.length) return 0
  const answered = new Set((await db.select({ markId: floorPlanComments.markId }).from(floorPlanComments)
    .where(and(inArray(floorPlanComments.markId, open.map((m) => m.id)), eq(floorPlanComments.authorKind, 'studio'), isNull(floorPlanComments.deletedAt)))).map((c) => c.markId))
  return open.filter((m) => !answered.has(m.id)).length
}

/** (the Client access panel's Floor plan row) The project's plans, the client's open marks, the newest confirmation. */
export async function floorPlanAccessOf(projectId: string): Promise<{ plans: number; open: number; confirmedAt: number | null }> {
  const [plans, open, [c]] = await Promise.all([
    db.select({ id: projectFloorPlans.id }).from(projectFloorPlans).where(and(eq(projectFloorPlans.projectId, projectId), isNull(projectFloorPlans.putAwayAt))),
    db.select({ id: floorPlanMarks.id }).from(floorPlanMarks).where(and(eq(floorPlanMarks.projectId, projectId), eq(floorPlanMarks.authorKind, 'client'), eq(floorPlanMarks.status, 'open'), isNull(floorPlanMarks.deletedAt))),
    db.select({ at: floorPlanConfirmations.createdAt }).from(floorPlanConfirmations).where(eq(floorPlanConfirmations.projectId, projectId)).orderBy(desc(floorPlanConfirmations.createdAt)).limit(1),
  ])
  return { plans: plans.length, open: open.length, confirmedAt: c ? c.at.getTime() : null }
}

/**
 * (parity map 2026-10-10, TD-049 · UC-094 — 1.0's "Ask your homeowner to send it") Each home's ask for its floor plan, for the client's What needs
 * you (lib/portal/needs.ts, the floor-plan row): the studio asked (`projects.floor_plan_asked_at`), the project is running or setting up, no plan
 * is on it yet (one the client sent ends the ask by itself — no write), and the portal's Floor plan section is on. Fills `facts.floorPlanAsk`
 * in place — lib/portal/home.ts `loadHomeFacts` calls it beside `attachHomeChoices`.
 */
export async function attachHomeFloorPlanAsks(facts: Map<string, import('@/lib/portal/needs').HomeFacts>): Promise<void> {
  const leadIds = [...facts.keys()]
  if (!leadIds.length) return
  const { fetchPortalSections } = await import('@/lib/portal/sections-queries')
  if (!(await fetchPortalSections())['floor-plan']) return
  const asked = (await db.select({ id: projects.id, leadId: projects.leadId, at: projects.floorPlanAskedAt, stage: projects.stage }).from(projects)
    .where(and(inArray(projects.leadId, leadIds), isNull(projects.deletedAt)))).filter((p) => p.at && p.stage !== 'completed')
  if (!asked.length) return
  const withPlan = new Set((await db.select({ projectId: projectFloorPlans.projectId }).from(projectFloorPlans)
    .where(and(inArray(projectFloorPlans.projectId, asked.map((p) => p.id)), isNull(projectFloorPlans.putAwayAt)))).map((r) => r.projectId))
  for (const p of asked) {
    const f = facts.get(p.leadId)
    if (f && !withPlan.has(p.id)) f.floorPlanAsk = { projectId: p.id, at: p.at!.getTime() }
  }
}
