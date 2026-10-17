import { cache } from 'react'
import 'server-only'
import { countPendingTemplates } from '@/lib/templates/queries'   // (REG-286) libSQL must never reach the browser bundle: every client import of this module is `import type`
import { and, asc, eq, inArray, isNotNull, isNull, sql } from 'drizzle-orm'
import { unstable_rethrow } from 'next/navigation'
import { db } from '@/lib/db'
import { fetchViewer, visibleLeadIds } from '@/lib/leads/visibility'
import { isAccounting, isMarketing } from '@/lib/settings/roles'
import { unreadCount } from '@/lib/notifications/queries'
import { isOverdue } from '@/lib/format'
import { leadAssignees, leadFiles, leadTasks, members, tags, taskAssignees, taskAttachments, taskComments, taskTags, taskTemplates, templateTasks, type LeadFile, type LeadTask, type Member, type Tag, type TaskComment, type TaskTemplate, leads } from '@/lib/db/schema'
import { withYou } from '@/lib/db/session'   // (pending modules S43A) "you" = this request's member
import { projects } from '@/lib/db/schema'   // (fix-A, A-20) a lead's project, for the Tasks page
import { fetchFolders } from '@/lib/company/folders'
import { fetchStudio } from '@/lib/settings/queries'   // (gaps build, package C — M-03)

/* Lead Details › Tasks (902-36216) — one loader for the tab; joins resolved in memory (a lead has a handful of tasks). */

/** A task's lead as the rail's Tasks page names it (REG-466); null = a studio task. */
export type TaskLead = { id: string; name: string; stage: string
  /** (fix-A, A-20) The project its work carries on as (a Won lead's, or a direct client's) — the Tasks page names it and opens its Tasks. */
  project?: { id: string; number: string; name: string } | null
  /** (gaps build, package C — M-03) The site's address — an outside person's WhatsApp says where the job is. */
  address?: string | null }
export type TaskRow = LeadTask & {
  lead: TaskLead | null
  assignees: Member[]
  tags: Tag[]
  creator: Member | null
  comments: (TaskComment & { author: Member | null })[]
  attachments: LeadFile[]
}
export type TemplateRow = TaskTemplate & { tasks: { id: string; title: string; description: string | null; kind: string }[] }
export type LeadTasksData = {
  tasks: TaskRow[]
  tags: Tag[]
  files: LeadFile[]
  templates: TemplateRow[]
  /** (REG-664) Templates › Tasks' folders — Choose Template browses them. */
  templateFolders: { id: string; name: string; parentId: string | null }[]
  team: Member[]
  now: number
  /** (UX audit 2026-09-30, T4) Each lead's members, by lead id — a new task starts with its lead's members on it (removable), the rule a
      log's reminder already follows (REG-608). */
  leadMembers: Record<string, string[]>
  /** (Projects round 2) The lead's project's milestones — the Milestone column and filter; empty for a lead with no project (the tab stays as it was). */
  milestones?: { id: string; title: string }[]
  /** (gaps build, package C — M-03) The studio's name — an outside person's WhatsApp says who the job is from. */
  studio?: string
}
export type StudioTasksData = LeadTasksData & { leads: TaskLead[]
  /** (fix-A, A-20) The projects whose tasks the page lists — the Filters' Project pane (number · name). */
  projects?: { id: string; number: string; name: string }[]
  /** (fix-G, G-15) direct projects (no lead), named as the project — the Tasks hub's filter knows them; the add row's Lead picker keeps leads (REG-911) */ projectLeads?: TaskLead[] }

/**
 * One loader for both surfaces (REG-466): a lead's Tasks tab (`{ leadId }`) and the rail's Tasks page (`'studio'` — every
 * lead's tasks plus the studio's own, the ones with no lead). Each row carries its lead (id · name · stage) for the page's
 * Lead column; the file library is the lead's, or every lead's for the studio page (attachments resolve through it).
 */
async function loadTasks(scope: { leadId: string } | 'studio'): Promise<LeadTasksData & { leads: TaskLead[]; projectLeads: TaskLead[] }> {
  const leadId = scope === 'studio' ? null : scope.leadId
  const [rows, team, allTags, files, tpls, leadRows] = await Promise.all([
    (leadId ? db.select().from(leadTasks).where(eq(leadTasks.leadId, leadId)) : db.select().from(leadTasks)).orderBy(asc(leadTasks.createdAt)),
    db.select().from(members).then(withYou),
    db.select().from(tags).orderBy(asc(tags.createdAt)),
    db.select().from(leadFiles).where(leadId ? and(eq(leadFiles.leadId, leadId), isNull(leadFiles.deletedAt)) : isNull(leadFiles.deletedAt)).orderBy(asc(leadFiles.createdAt)),   // trashed files leave the library (Files tab)
    db.select().from(taskTemplates).where(isNull(taskTemplates.deletedAt)).orderBy(asc(taskTemplates.createdAt)),   // (REG-538) deleted templates leave the chooser
    db.select({ id: leads.id, name: leads.name, stage: leads.stage, direct: leads.direct, address: leads.propertyAddress }).from(leads).where(leadId ? eq(leads.id, leadId) : isNull(leads.deletedAt)).orderBy(asc(leads.name)),
  ])
  const studio = (await fetchStudio()).name   // (gaps build, package C — M-03)
  /* (T4) the leads' members, oldest assignment first — the add row's pre-filled members */
  const onLeads = await (leadId ? db.select().from(leadAssignees).where(eq(leadAssignees.leadId, leadId)) : db.select().from(leadAssignees))
  const leadMembers: Record<string, string[]> = {}
  for (const a of onLeads) (leadMembers[a.leadId] ??= []).push(a.memberId)
  const ids = rows.map((t) => t.id)
  const [links, tagLinks, comments, attachments, tplTasks] = ids.length
    ? await Promise.all([
        db.select().from(taskAssignees).where(inArray(taskAssignees.taskId, ids)),
        db.select().from(taskTags).where(inArray(taskTags.taskId, ids)),
        db.select().from(taskComments).where(inArray(taskComments.taskId, ids)).orderBy(asc(taskComments.createdAt)),
        db.select().from(taskAttachments).where(inArray(taskAttachments.taskId, ids)).orderBy(asc(taskAttachments.createdAt)),
        db.select().from(templateTasks).orderBy(asc(templateTasks.sortOrder)),
      ])
    : [[], [], [], [], await db.select().from(templateTasks).orderBy(asc(templateTasks.sortOrder))]
  const byMember = new Map(team.map((m) => [m.id, m]))
  const byTag = new Map(allTags.map((t) => [t.id, t]))
  const byFile = new Map(files.map((f) => [f.id, f]))
  /* (fix-A, A-20) a lead whose work carries on as a project names it — the rail's Tasks page reads it */
  const projectRowsOf = leadRows.length ? await db.select({ id: projects.id, leadId: projects.leadId, number: projects.number, name: projects.name }).from(projects).where(and(inArray(projects.leadId, leadRows.map((l) => l.id)), isNull(projects.deletedAt))) : []
  const projectOf = new Map(projectRowsOf.map((p) => [p.leadId, { id: p.id, number: p.number, name: p.name }]))
  const byLead = new Map(leadRows.map((l) => [l.id, { ...l, project: projectOf.get(l.id) ?? null }]))
  const tasks: TaskRow[] = rows.map((t) => ({
    ...t,
    lead: t.leadId ? byLead.get(t.leadId) ?? null : null,
    assignees: links.filter((l) => l.taskId === t.id).map((l) => byMember.get(l.memberId)).filter((m): m is Member => !!m),
    tags: tagLinks.filter((l) => l.taskId === t.id).map((l) => byTag.get(l.tagId)).filter((g): g is Tag => !!g),
    creator: t.creatorId ? byMember.get(t.creatorId) ?? null : null,
    comments: comments.filter((c) => c.taskId === t.id).map((c) => ({ ...c, author: byMember.get(c.authorId) ?? null })),
    attachments: attachments.filter((a) => a.taskId === t.id).map((a) => byFile.get(a.fileId)).filter((f): f is LeadFile => !!f),
  }))
  // Newest first, as the listing mock reads (the new task sits on top).
  tasks.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  const templates: TemplateRow[] = tpls.map((tp) => ({ ...tp, tasks: tplTasks.filter((x) => x.templateId === tp.id).map((x) => ({ id: x.id, title: x.title, description: x.description, kind: x.kind })) }))
  const templateFolders = (await fetchFolders('tasks')).map((f) => ({ id: f.id, name: f.name, parentId: f.parentId }))   // (REG-664)
  /* (REG-911) A direct project's client is no lead: its tasks keep their row (the Lead column names them), but the Lead picker and filter list leads only. */
  return { tasks, tags: allTags, files, templates, templateFolders, team, now: Date.now(), studio, leads: leadRows.filter((l) => !l.direct).map(({ direct: _d, ...l }) => l), leadMembers,
    /* (parity map, TD-027) each carries its project, so the add row's picker lists it under Projects with its number (stage 'Project' marks it) */
    projectLeads: leadRows.filter((l) => l.direct && projectOf.has(l.id)).map((l) => ({ id: l.id, name: projectOf.get(l.id)!.name, stage: 'Project', projectId: projectOf.get(l.id)!.id, project: projectOf.get(l.id)! })) }
}

export async function fetchLeadTasks(leadId: string): Promise<LeadTasksData> {
  const { milestoneOptionsOfLead } = await import('@/lib/projects/schedule')   // (Projects round 2)
  const [data, milestones] = await Promise.all([loadTasks({ leadId }), milestoneOptionsOfLead(leadId)])
  /* (fix-B, B-25) a task of a deleted milestone is in no milestone everywhere — its link is kept (the delete's Undo puts it back), read as none */
  const live = new Set(milestones.map((m) => m.id))
  return { ...data, tasks: data.tasks.map((t) => (t.milestoneId && !live.has(t.milestoneId) ? { ...t, milestoneId: null } : t)), milestones }
}

/** The rail's Tasks page (REG-466): every lead's tasks and the studio's own, with the live leads for the Lead picker and filter. */
export async function fetchStudioTasks(): Promise<StudioTasksData> {
  const viewer = await fetchViewer()
  const [all, visible] = await Promise.all([loadTasks('studio'), visibleLeadIds(viewer)])
  /* (fix-A, A-20) the Project pane: the projects of the tasks listed, by number */
  const projectsOf = (rows: TaskRow[]) => [...new Map(rows.flatMap((t) => (t.lead?.project ? [[t.lead.project.id, t.lead.project] as const] : []))).values()].sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }))
  /* (parity map, PR-022 · FB-114) Accounting's Tasks: their own — a task given to them, or the studio's they made — never a lead's or a project's
     team work; they add the studio's own (no lead to pick: none is theirs) */
  if (isAccounting(viewer.role)) {
    const mine = all.tasks.filter((t) => t.assignees.some((m) => m.id === viewer.id) || (!t.leadId && t.creatorId === viewer.id))
    return { ...all, tasks: mine, leads: [], projects: projectsOf(mine), projectLeads: [] }
  }
  /* (S44O — call C6) Marketing's Tasks: the studio's own and every lead's while it is a lead — a Won lead's tasks are its project's, never theirs */
  if (isMarketing(viewer.role)) {
    const tasks = all.tasks.filter((t) => !t.leadId || !t.lead?.project)
    return { ...all, tasks, leads: all.leads, projects: [], projectLeads: [] }
  }
  if (!visible) return { ...all, projects: projectsOf(all.tasks) }
  /* (REG-601) A Manager's or a Designer's page keeps the studio's own tasks and the tasks of the leads they see. */
  const data = { ...all, tasks: all.tasks.filter((t) => !t.leadId || visible.has(t.leadId)), leads: all.leads.filter((l) => visible.has(l.id)) }
  return { ...data, projects: projectsOf(data.tasks), projectLeads: (all.projectLeads ?? []).filter((l) => visible.has(l.id)) }
}

/**
 * The rail badge (REG-466; UX audit 2026-09-30, T5): the signed-in member's OWN open tasks whose due date has passed — it counted the
 * studio's, whoever looked, and led to a list that showed something else. A press lands on My Tasks with Overdue on (the rail's link).
 * Tasks on a lead the viewer may not see (REG-601) are not theirs to act on, so they don't count.
 */
export async function countOverdueTasks(): Promise<number> {
  const viewer = await fetchViewer()
  const rows = await db.select({ dueAt: leadTasks.dueAt, leadId: leadTasks.leadId }).from(leadTasks)
    .innerJoin(taskAssignees, eq(taskAssignees.taskId, leadTasks.id))
    .where(and(eq(leadTasks.done, false), isNotNull(leadTasks.dueAt), eq(taskAssignees.memberId, viewer.id)))
  const visible = await visibleLeadIds(viewer)
  const now = Date.now()
  return rows.filter((r) => isOverdue(r.dueAt, now) && (!r.leadId || !visible || visible.has(r.leadId))).length
}

/** What the rail draws on its items (REG-466): the Tasks item's overdue count, keyed by href; nothing when there is nothing to say. */
/** (pending modules S22) Read once per request: the shell's layout and the Dashboard ask for the same counts — one read, one set of numbers. */
export const railBadges = cache(railBadgesUncached)
async function railBadgesUncached(): Promise<Record<string, number>> {
  /* (parity map 2026-10-10) a count is a hint: one that can't be read shows no badge, never a failed shell — every module's count reaches far
     (the Projects item reads the client's portal facts), so one broken read must not take every page's rail down with it */
  /* (S42 audit A-13) …but a count that fails says so in the server's log, so a missing badge is never a silent mystery */
  /* (pending modules S43A) …and Next's own signals pass through: a count now asks this browser's session (its cookie), which a build's
     prerender answers by bailing out to a dynamic page — never a failed count */
  const soft = (p: Promise<number>): Promise<number> => p.catch((e: unknown) => { unstable_rethrow(e); console.error('[rail] a badge count could not be read —', e instanceof Error ? e.message : e); return 0 })
  const [overdue, pending, unread, proposed, asks] = await Promise.all([soft(countOverdueTasks()), soft(countPendingTemplates()), soft(unreadCount()), soft(countProposalsToReview()), soft(countCreditAsks())])   // (REG-501) Company: templates awaiting approval · (REG-604) the bell · (REG-652) proposed items · (REG-703) asks for AI credits
  const toApprove = await soft(countQuotesToApprove())   // (UX audit Q4) quotes waiting for this approver — the Tools item
  const attention = await soft(import('@/lib/projects/queries').then((m) => m.countProjectsNeedingAttention()))   // (REG-919) the Projects item: projects that need attention
  const chats = await soft(import('@/lib/projects/messages').then((m) => m.countUnreadChats()))   // (gaps build H, H-Q11) the Chat item: conversations with a client's unread message
  const money = await soft(import('@/lib/finance/todo-server').then((m) => m.countFinanceToApprove()))   // (simplify S-16) Finance › To do's To approve — an Owner's or an Admin's queue
  /* (parity map, PR-022) Accounting's Company panel lists Finance and Reports alone: no count for templates, the Price book or AI credits they
     can't open (their Finance count is the approvers' queue — 0 for them) */
  const role = (await fetchViewer()).role
  if (isAccounting(role)) return {
    ...(overdue > 0 ? { '/tasks': overdue } : {}), ...(unread > 0 ? { notifications: unread } : {}),
    ...(money > 0 ? { '/company': money, 'company:finance': money } : {}),
  }
  /* (S44O — call C6) Marketing's rail is Tasks, Leads, Company (Integrations · Reports) and the bell — no count for what they can't open */
  if (isMarketing(role)) return { ...(overdue > 0 ? { '/tasks': overdue } : {}), ...(unread > 0 ? { notifications: unread } : {}) }
  return {
    ...(toApprove > 0 ? { tools: toApprove } : {}),
    ...(attention > 0 ? { '/projects': attention } : {}),
    ...(chats > 0 ? { '/chat': chats } : {}),   // (gaps build H)
    ...(overdue > 0 ? { '/tasks': overdue } : {}), ...(pending + proposed + asks + money > 0 ? { '/company': pending + proposed + asks + money } : {}), ...(unread > 0 ? { notifications: unread } : {}),
    ...(pending > 0 ? { 'company:templates': pending } : {}), ...(proposed > 0 ? { 'company:price-book': proposed } : {}), ...(asks > 0 ? { 'company:plan': asks } : {}),   // the Company panel's rows
    ...(money > 0 ? { 'company:finance': money } : {}),   // (simplify S-16) "n to approve" on the panel's Finance row
  }
}
/** (UX audit Q4) Quotes waiting at Sent for Approval on the leads this member sees — an approver's queue only (an Owner, an Admin or the
    backup approver, REG-590), and only while the studio asks for approval. The Tools item counts them; Tools › Quotes' chip lists them. */
async function countQuotesToApprove(): Promise<number> {
  const { fetchQuoteApproval, isApprover } = await import('@/lib/settings/queries')
  const { quotes } = await import('@/lib/db/schema')
  const viewer = await fetchViewer()
  if ((await fetchQuoteApproval()) !== 'required' || !(await isApprover(viewer.id, viewer.role))) return 0
  const rows = await db.select({ leadId: quotes.leadId }).from(quotes).innerJoin(leads, eq(leads.id, quotes.leadId))
    .where(and(eq(quotes.status, 'Sent for Approval'), eq(quotes.kind, 'quote'), isNull(quotes.archivedAt), isNull(quotes.deletedAt), isNull(leads.deletedAt)))   // (fix-G, G-41) Tools › Quotes lists quotes only
  const seen = await visibleLeadIds(viewer)
  return seen ? rows.filter((r) => seen.has(r.leadId)).length : rows.length
}
/** (REG-703, AI credits Q-34) Members waiting on the Owner for AI credits — the Owner's queue only (1.0: only the Owner buys or raises). */
async function countCreditAsks(): Promise<number> {
  const { fetchViewer } = await import('@/lib/leads/visibility')
  const { ownerRole } = await import('@/lib/credits/policy')
  const { creditRequests } = await import('@/lib/db/schema')
  if (!ownerRole((await fetchViewer()).role)) return 0
  const [row] = await db.select({ n: sql<number>`count(*)` }).from(creditRequests).where(sql`${creditRequests.status} = 'open'`)
  return Number(row?.n ?? 0)
}
/** (REG-652, price book parity Q-04) Proposed items an Owner or an Admin has to answer — nobody else's queue. */
async function countProposalsToReview(): Promise<number> {
  const { fetchViewer } = await import('@/lib/leads/visibility')
  const { runsBook } = await import('@/lib/company/price-book-rules')
  const { priceBookItems } = await import('@/lib/db/schema')
  if (!runsBook(await fetchViewer())) return 0
  const [row] = await db.select({ n: sql<number>`count(*)` }).from(priceBookItems).where(sql`${priceBookItems.status} = 'proposed' AND ${priceBookItems.deletedAt} IS NULL`)
  return Number(row?.n ?? 0)
}
