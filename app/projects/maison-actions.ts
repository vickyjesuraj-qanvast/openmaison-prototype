'use server'

import { and, asc, eq, inArray, isNull, ne } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leadAssignees, leads, members, projects } from '@/lib/db/schema'
import { canOpenLead, fetchViewer, visibleLeadIds } from '@/lib/leads/visibility'
import { titleCaseName } from '@/lib/format'
import { CHANGE_RULE, mayChangeProject } from '@/lib/projects/policy'
import { milestonesOf } from '@/lib/projects/schedule'
import { dayLabel, dayOf, isLate, lateBy, nextOpen, plural, rangeLabel, type Milestone } from '@/lib/projects/schedule-model'
import { complianceKindOf, itemsFor, phaseLabel, phaseOfStage } from '@/lib/compliance/model'
import { answersOf } from '@/lib/compliance/queries'
import { createTask } from '@/app/leads/tasks-actions'
import { workspaceRefusal, offWorkspace } from '@/lib/settings/desk'   // (S45C) the workspace's role rule

/*
 * (gaps build I, I-Q16 · I-Q17 — 1.0's mAIson bot acted on projects, J-228; its role rule J-159) What Maison AI reads and does on Projects —
 * every answer from the studio's own records, nothing metered (Q-30). Reads follow Who sees leads; the one write here (a task for the next
 * step) checks the project's change rule first and then goes through the Tasks tab's own `createTask`. A draft update goes through the
 * Updates tab's own `saveProjectUpdate` from the page (a draft, never published — the review rule stands). A refusal answers `{ error }`.
 */
type Refusal = { error: string }
const NOT_FOUND = 'This project is not there any more'

async function seen(projectId?: string) {
  const viewer = await fetchViewer()
  const rows = await db.select({ id: projects.id, name: projects.name, number: projects.number, stage: projects.stage, leadId: projects.leadId })
    .from(projects).innerJoin(leads, eq(leads.id, projects.leadId))
    .where(and(isNull(projects.deletedAt), isNull(leads.deletedAt), ...(projectId ? [eq(projects.id, projectId)] : [ne(projects.stage, 'completed')])))
  const visible = await visibleLeadIds(viewer)
  return { viewer, rows: rows.filter((r) => !visible || visible.has(r.leadId)) }
}

export type LateRow = { projectId: string; project: string; number: string; milestoneId: string; title: string; end: number; days: number }

/** Every running milestone past its last day — on one project, or on every running project the viewer sees; the latest first. */
export async function lateMilestones(projectId?: string): Promise<{ rows: LateRow[]; today: number } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const { rows } = await seen(typeof projectId === 'string' ? projectId : undefined)
  if (projectId && !rows.length) return { error: NOT_FOUND }
  const ms = await milestonesOf(rows.map((r) => r.id))
  const today = dayOf(new Date())
  const out: LateRow[] = []
  for (const p of rows) for (const m of ms.get(p.id) ?? []) if (isLate(m, today)) out.push({ projectId: p.id, project: p.name, number: p.number, milestoneId: m.id, title: m.title, end: m.end, days: lateBy(m, today) })
  out.sort((a, b) => b.days - a.days || a.project.localeCompare(b.project))
  return { rows: out.slice(0, 40), today }
}

/** The task the project's next step calls for — before the next milestone starts, or to catch up on the one running late. */
export async function nextStepTask(projectId: string): Promise<{ title: string; due: string | null; why: string; mayAdd: boolean } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const { viewer, rows } = await seen(projectId)
  const p = rows[0]
  if (!p) return { error: NOT_FOUND }
  const team = (await db.select({ id: leadAssignees.memberId }).from(leadAssignees).where(eq(leadAssignees.leadId, p.leadId))).map((r) => r.id)
  const list = (await milestonesOf([p.id])).get(p.id) ?? []
  const today = dayOf(new Date())
  const late = list.filter((m) => isLate(m, today)).sort((a, b) => a.end - b.end)[0] ?? null
  const next = nextOpen(list, 1)[0] ?? null
  const iso = (d: number) => new Date(d * 86_400_000).toISOString().slice(0, 10)
  const mayAdd = mayChangeProject(viewer, team)
  if (late) return { title: `Catch up on ${late.title}`, due: iso(Math.max(today + 1, late.end + 1)), why: `${late.title} ended ${dayLabel(late.end)} — ${plural(lateBy(late, today), 'day')} late.`, mayAdd }
  if (next && next.status === 'not_started') return { title: `Get ready for ${next.title}`, due: iso(Math.max(today, next.start - 2)), why: `${next.title} starts ${dayLabel(next.start)} — the people, the materials and the site ready two days before.`, mayAdd }
  if (next) return { title: `Check on ${next.title}`, due: iso(Math.max(today, Math.min(next.end, today + 2))), why: `${next.title} runs ${rangeLabel(next.start, next.end)}.`, mayAdd }
  return { title: 'Set up the schedule', due: null, why: 'This project has no milestones yet — the Schedule tab sets them up from the quote.', mayAdd }
}

/** Adds the next step's task for the project's team — its rule first, then the Tasks tab's own action. */
export async function addNextStepTask(projectId: string, input: { title: string; due: string | null }): Promise<{ id: string; leadId: string } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const { viewer, rows } = await seen(projectId)
  const p = rows[0]
  if (!p || !(await canOpenLead(viewer, p.leadId))) return { error: NOT_FOUND }
  const team = (await db.select({ id: leadAssignees.memberId }).from(leadAssignees).where(eq(leadAssignees.leadId, p.leadId))).map((r) => r.id)
  if (!mayChangeProject(viewer, team)) return { error: CHANGE_RULE }
  const title = (input?.title ?? '').replace(/\s+/g, ' ').trim().slice(0, 200)
  if (!title) return { error: 'Give the task a title' }
  const due = typeof input.due === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input.due) ? new Date(`${input.due}T10:00:00`) : null
  const id = await createTask(p.leadId, title, { dueAt: due, assignLeadMembers: true, description: 'Added by Maison AI from the schedule.' })
  return { id, leadId: p.leadId }
}

/** A draft of this week's update — what was done in the last seven days, what is under way, what comes next — in the studio's words. */
export async function draftWeekUpdate(projectId: string): Promise<{ title: string; html: string; lines: string[]; milestoneId: string | null } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const { rows } = await seen(projectId)
  const p = rows[0]
  if (!p) return { error: NOT_FOUND }
  const [lead] = await db.select({ name: leads.name }).from(leads).where(eq(leads.id, p.leadId)).limit(1)
  const first = titleCaseName(lead?.name ?? '').split(/\s+/)[0] || 'there'
  const list: Milestone[] = (await milestonesOf([p.id])).get(p.id) ?? []
  const today = dayOf(new Date())
  const done = list.filter((m) => m.status === 'done' && m.doneAt !== null && m.doneAt >= today - 7)
  const now = list.filter((m) => m.status === 'in_progress' || m.status === 'blocked')
  const next = nextOpen(list, 2).filter((m) => m.status === 'not_started')
  const lines = [
    done.length ? `Done this week: ${done.map((m) => m.title).join(', ')}.` : null,
    now.length ? `Under way: ${now.map((m) => `${m.title} (until ${dayLabel(m.end)})`).join(', ')}.` : null,
    next.length ? `Coming next: ${next.map((m) => `${m.title} from ${dayLabel(m.start)}`).join(', ')}.` : null,
  ].filter((x): x is string => !!x)
  if (!lines.length) lines.push('The schedule is being set up — the dates follow soon.')
  const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const html = [`<p>Hi ${esc(first)}, here is where your renovation stands this week.</p>`, ...lines.map((l) => `<p>${esc(l)}</p>`), '<p>Any questions, just reply here.</p>'].join('')
  return { title: `This week at your home — ${dayLabel(today)}`, html, lines, milestoneId: (now[0] ?? done[done.length - 1] ?? null)?.id ?? null }
}

/** The mandatory compliance items still to do in the phase the project is in. */
export async function complianceToDo(projectId: string): Promise<{ phase: string; rows: { id: string; title: string; authority: string }[] } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const { rows } = await seen(projectId)
  const p = rows[0]
  if (!p) return { error: NOT_FOUND }
  const [lead] = await db.select({ propertyType: leads.propertyType }).from(leads).where(eq(leads.id, p.leadId)).limit(1)
  const phase = phaseOfStage(p.stage)
  const answers = (await answersOf([p.id])).get(p.id) ?? {}
  const items = itemsFor(complianceKindOf(lead?.propertyType)).filter((i) => i.phase === phase && i.level === 'mandatory' && !answers[i.id])
  return { phase: phaseLabel(phase), rows: items.map((i) => ({ id: i.id, title: i.title, authority: i.authority })) }
}

/** The member names a page's proposal mentions (the team the task goes to). */
export async function teamNames(projectId: string): Promise<string[]> {
  if (await offWorkspace()) return []   // (S45C) the workspace's role rule: Marketing reads nothing here
  const { rows } = await seen(projectId)
  const p = rows[0]
  if (!p) return []
  const ids = (await db.select({ id: leadAssignees.memberId }).from(leadAssignees).where(eq(leadAssignees.leadId, p.leadId))).map((r) => r.id)
  if (!ids.length) return []
  return (await db.select({ name: members.name }).from(members).where(inArray(members.id, ids)).orderBy(asc(members.name))).map((m) => m.name)
}
