'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { and, asc, eq, gte, inArray, isNotNull, isNull, ne } from 'drizzle-orm'
import { db } from '@/lib/db'
import { contracts, leadAssignees, leadEvents, leadFiles, leadNotes, leads, members, paymentTemplates, projects, questions, studioScopeQuestions } from '@/lib/db/schema'
import { notifications } from '@/lib/db/schema'   // (parity P-37) a hold's Undo takes back the stage notice it raised
import { notify } from '@/lib/notifications/emit'   // (parity P-37)
import { leadMemberIds, studioRunnerIds } from '@/lib/notifications/queries'
import { canOpenLead, fetchViewer } from '@/lib/leads/visibility'
import { assignableIds } from '@/lib/leads/assign-policy'
import { revalidateLead } from '@/lib/leads/queries'
import { DISTRICTS, PROPERTY_TYPES, STYLE_OPTIONS } from '@/lib/leads/enums'
import { displayDate, isSgPhone, phoneDigits, phoneTyped, titleCaseName } from '@/lib/format'
import { EMAIL_RE } from '@/lib/forms'
import { parseSplitRows } from '@/lib/quotes/payments'
import { afterProjectRow, ensureProjectForLead, nextProjectNumber, writeProjectRow, type NewProjectRow } from '@/lib/projects/create'
import { logProjectEvent } from '@/lib/projects/events'
import { CHANGE_RULE, mayChangeProject, mayCreateProject, seesMoney } from '@/lib/projects/policy'
import { DUPLICATE_NAME, NAME_MAX, PROJECT_TYPES, TEAM_NEEDED, defaultProjectName, parseScope, sameName, scopeWords, type ProjectSplit } from '@/lib/projects/model'
import { STAGE_LABEL, isProjectStage } from '@/lib/projects/model'   // (parity P-37) the stage's words in the notice
import { HOLD_ENDED, HOLD_REASON_MAX, NOT_ON_HOLD, ON_HOLD_START, dayStart, holdOf } from '@/lib/projects/hold'   // (gaps build, package A — M-01)
import { sessionMemberId } from '@/lib/db/session'
import { completedBlock } from '@/lib/projects/handover-model'
import { applyRebalance, restoreAmounts, type AmountsUndo } from '@/lib/projects/invoices'   // (fix-D, A-03)
import { rebalanceSentence } from '@/lib/projects/money'
import { money2 } from '@/lib/quotes/math'
import { CONTRACT_FOLDERS } from '@/lib/leads/file-model'   // (gaps build E, item 4)
import { tellClientEvent } from '@/lib/portal/client-tells'   // (simplify Q-13) paused · running again
import { workspaceRefusal } from '@/lib/settings/desk'   // (S45C) the workspace's role rule
/* (simplify round 2, R2-C) the client's emails an Undo may take back wait out its window — held in the outbox, deleted by the Undo */
import { cancelHeldMessages, holdClientMail } from '@/lib/notifications/delivery'
import { UNDO_SNACKBAR_MS, type HeldMail } from '@/lib/notifications/held'
/* (simplify S-17 · P2 §6.8) the Start sheet runs today's own actions under their rules; the moments' shared server half */
import { clientTellFacts, invoiceBefore, invoiceRevertBlock, inviteBefore, openedSince, revertInvite, revertInvoice, type ClientTellFacts, type InviteBefore, type InvoiceRevert } from '@/lib/projects/schedule-moments'
import { fetchScheduleData, type ScheduleData } from '@/lib/projects/schedule'
import { dayMonth, dayOfStored } from '@/lib/projects/schedule-model'
import { createSchedule, type ScheduleSource } from './schedule-actions'
import { inviteClient } from '@/app/portal/studio-actions'
import { sendInvoice, submitInvoice } from './money-actions'
import { fetchInvoiceRules, moneySummaryOf } from '@/lib/projects/money-queries'
import { sendsAtOnce } from '@/lib/projects/invoices-model'
import { projectInvoices, projectMilestones } from '@/lib/db/schema'
import { quotes } from '@/lib/db/schema'   // (parity map, PR-058) the signed quote a duplicate copies as a draft
import { purgeLeads } from '@/lib/leads/purge'   // (parity map, PR-058) a duplicate's Undo takes its client record with it
import { orThrow } from '@/lib/company/template-rules'   // (S45C) a refused action's rule becomes the caller's "Couldn’t …"

/*
 * (REG-911…) Projects' server actions. Who sees a project is its lead's rule (`canOpenLead`); who changes one is `mayChangeProject` — the
 * project's team, Owners and Admins. A refusal answers `{ error: <the rule> }`, never a throw the page can't read (CONTRIBUTING §5).
 */
type Refusal = { error: string }
const NOT_FOUND = 'This project is not there any more'

/** The project with its lead and team, after the viewer's two checks — or the refusal to hand back. */
async function forChange(projectId: string): Promise<{ p: typeof projects.$inferSelect; leadId: string } | Refusal> {
  const [p] = await db.select().from(projects).where(and(eq(projects.id, projectId), isNull(projects.deletedAt))).limit(1)
  if (!p) return { error: NOT_FOUND }
  const viewer = await fetchViewer()
  if (!(await canOpenLead(viewer, p.leadId))) return { error: NOT_FOUND }
  const team = (await db.select({ memberId: leadAssignees.memberId }).from(leadAssignees).where(eq(leadAssignees.leadId, p.leadId))).map((r) => r.memberId)
  if (!mayChangeProject(viewer, team)) return { error: CHANGE_RULE }
  return { p, leadId: p.leadId }
}
function touch(projectId: string, leadId: string) {
  revalidatePath('/projects', 'layout')
  revalidatePath(`/projects/${projectId}`)
  revalidateLead(leadId)
}
/**
 * (parity P-37) A project's stage change is the lead's event — Settings › Notifications' "A lead’s or project’s stage changes": its start, a hold and
 * a resume reach the studio's Owners and Admins and the project's members, never whoever moved it (`notify` leaves the actor out). The title is
 * the lead's shape ("{project}: In progress → On hold"), the hold's reason its body; the message's {stage} is the project's own word.
 */
async function notifyProjectStage(p: { id: string; name: string }, leadId: string, from: string, to: string, body: string | null): Promise<void> {
  await notify('stage_changed', [...(await studioRunnerIds()), ...(await leadMemberIds(leadId))], { title: `${p.name}: ${from} → ${to}`, body, href: `/projects/${p.id}`, leadId, fields: { '{stage}': to } })
}
const stageWord = (stage: string): string => (isProjectStage(stage) ? STAGE_LABEL[stage] : stage)
const dayOf = (iso: string | null | undefined): Date | null => {
  if (!iso) return null
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/** (REG-911) A Won lead's page: its project, made now if the lead was won before projects existed (idempotent). */
export async function openLeadProject(leadId: string): Promise<{ id: string } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const viewer = await fetchViewer()
  if (!(await canOpenLead(viewer, leadId))) return { error: 'This lead is not there any more' }
  const [l] = await db.select({ stage: leads.stage }).from(leads).where(and(eq(leads.id, leadId), isNull(leads.deletedAt))).limit(1)
  if (!l) return { error: 'This lead is not there any more' }
  if (l.stage !== 'Won') return { error: 'Win the lead first — Won creates its project' }
  /* (Projects round 7, Q-26) a deleted project is not opened as if it were there: the lead page offers Make the project again */
  const [gone] = await db.select({ number: projects.number }).from(projects).where(and(eq(projects.leadId, leadId), isNotNull(projects.deletedAt))).limit(1)
  if (gone) return { error: `Its project ${gone.number} is in Deleted Projects — restore it, or make the project again` }
  /* (S42F) a project needs a member — a lead won before projects existed and held by nobody gets one first (the lead page's Assign) */
  const [someone] = await db.select({ id: leadAssignees.id }).from(leadAssignees).where(eq(leadAssignees.leadId, leadId)).limit(1)
  if (!someone && !(await db.select({ id: projects.id }).from(projects).where(eq(projects.leadId, leadId)).limit(1)).length) return { error: TEAM_NEEDED }
  const r = await ensureProjectForLead(leadId)
  if (r.created) touch(r.id, leadId)
  return { id: r.id }
}

export type NewProjectInput = {
  client: string; phone: string; email: string
  propertyType: string; propertyAddress: string; district: string
  projectType: string
  /** Grouped dollars as typed ("68,500.00"). */
  value: string
  splitId: string | null
  team: string[]
  /** (gaps build, package A) The project's name ('' = "{property type} — {client}", Q-05) — never one another project has (1.0 B-187). */
  name?: string
  /** (gaps build, package A — 1.0 B-65 · B-67) floor area (sq ft, digits), style, the scope's rooms, and a first note for the record. */
  areaSqft?: string
  style?: string
  scope?: string[]
  note?: string
}

/** (gaps build, package A — 10) Another live project with this name, if any (deleted ones don't count — a restore says so itself). */
async function nameTaken(name: string, exceptId?: string): Promise<boolean> {
  const rows = await db.select({ id: projects.id, name: projects.name }).from(projects).where(isNull(projects.deletedAt))
  return rows.some((r) => r.id !== exceptId && sameName(r.name, name))
}
const cleanArea = (v: string | undefined | null): number | null => { const d = (v ?? '').replace(/[^\d]/g, '').slice(0, 6); const n = Number(d); return d && n > 0 ? n : null }
const cleanStyle = (v: string | undefined | null): string | null => (v && (STYLE_OPTIONS as readonly string[]).includes(v) ? v : null)
const cleanScope = (v: unknown): string[] => parseScope(Array.isArray(v) ? v : [])

/**
 * (REG-911, Q-04 — the owner: "it can exist on it's own. Because Studios might get direct projects as well.") New project: the client's
 * details in a lead row marked `direct` (kept out of the Leads pipeline, so quotes, contracts, tasks and files work unchanged), and its
 * project with the agreed value and split. The team follows the lead form's reach: a Designer's project is theirs, a Manager's keeps to
 * their team. The form's checks are made again here.
 */
export async function createDirectProject(input: NewProjectInput): Promise<{ id: string; number: string } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const stampBy = await sessionMemberId()   // (pending modules S43A) who writes — this browser's member, read before any write
  const client = titleCaseName(input.client.trim()).slice(0, 80)
  const phone = phoneDigits(input.phone)
  const email = input.email.trim()
  if (!client) return { error: 'Enter the client’s name' }
  if (!isSgPhone(phone)) return { error: 'Enter a valid 8-digit Singapore number' }
  if (email && !EMAIL_RE.test(email)) return { error: 'Enter a valid email address' }
  if (!(PROPERTY_TYPES as readonly string[]).includes(input.propertyType)) return { error: 'Choose the property type' }
  if (!(PROJECT_TYPES as readonly string[]).includes(input.projectType)) return { error: 'Choose the project type' }
  const value = Math.round(Number(input.value.replace(/,/g, '')) * 100)
  if (!Number.isFinite(value) || value <= 0) return { error: 'Enter the agreed value' }
  const [viewer, team] = await Promise.all([fetchViewer(), db.select({ id: members.id, isActive: members.isActive, role: members.role }).from(members)])   // (parity map, FB-114) the role — Accounting is never on a project
  if (!mayCreateProject(viewer)) return { error: 'Only members of the studio add projects' }   // (Projects round 7) the Who may do what row reads this rule
  const reach = new Set(assignableIds(viewer, team))
  const assignees = viewer.role === 'Designer' ? [viewer.id] : [...new Set(input.team)].filter((m) => reach.has(m))
  /* (S42F) a project needs a member, as a lead past New does — the dialog asks first; a pick that left the viewer's reach meanwhile lands here */
  if (!assignees.length) return { error: TEAM_NEEDED }
  let split: ProjectSplit | null = null
  if (input.splitId) {
    const [t] = await db.select({ id: paymentTemplates.id, rowsJson: paymentTemplates.rowsJson }).from(paymentTemplates).where(and(eq(paymentTemplates.id, input.splitId), isNull(paymentTemplates.deletedAt))).limit(1)
    if (t) split = { template: t.id, rows: parseSplitRows(t.rowsJson).map((r) => ({ name: r.name, pct: r.pct })) }
  }
  /* (gaps build, package A — 10) the name: as typed, else Q-05's default — refused when another project already has it */
  const name = (input.name ?? '').trim().replace(/\s+/g, ' ').slice(0, NAME_MAX) || defaultProjectName(input.propertyType, client)
  if (await nameTaken(name)) return { error: DUPLICATE_NAME }
  const note = (input.note ?? '').trim().slice(0, 2000)
  const now = new Date()
  const leadId = randomUUID()
  /* (gaps build, package A — 13) ONE transaction: the client's record, the team, the questionnaire, the first note and the project row with its
     number and its line land together, or none of them does (the 1.0 fault B-168: a hidden client record with no project). Reads first —
     the number and the studio's question bank — so nothing inside waits on `db`. The Drafts and the bell follow the commit. */
  const number = await nextProjectNumber(now)
  const bank = await db.select().from(studioScopeQuestions).where(eq(studioScopeQuestions.isEnabled, true)).orderBy(asc(studioScopeQuestions.sortOrder))
  const { isBankType, leadOptions, parseBankOptions, toLeadType } = await import('@/lib/company/question-bank')
  const row: NewProjectRow = { leadId, at: now, name, projectType: input.projectType, quoteId: null, contractId: null, agreedValueMinor: value, split, direct: true, client, notify: true, scope: cleanScope(input.scope) }
  let id: string | null = null
  try {
    await db.transaction(async (tx) => {
      await tx.insert(leads).values({
        id: leadId, name: client, phone, email: email || null, source: 'Others', propertyType: input.propertyType,
        propertyAddress: input.propertyAddress.trim() || null, area: (DISTRICTS as readonly string[]).includes(input.district) ? input.district : null,
        areaSqft: cleanArea(input.areaSqft), style: cleanStyle(input.style),
        budgetMinor: value, stage: 'Won', direct: true, seenAt: now, createdAt: now, updatedAt: now,
      })
      if (assignees.length) await tx.insert(leadAssignees).values(assignees.map((memberId) => ({ id: randomUUID(), leadId, memberId, assignedAt: now, assignedBy: stampBy })))   // (parity P-13) who put them on it
      /* (M-02) a direct project starts with the studio's enabled questions, as a new lead does (createLead) */
      if (bank.length) await tx.insert(questions).values(bank.map((q, i) => { const t = isBankType(q.questionType) ? q.questionType : 'text'; const opts = leadOptions(t, parseBankOptions(q.options)); return { id: randomUUID(), leadId, text: q.question, type: toLeadType(t), options: opts.length ? JSON.stringify(opts) : null, sortOrder: i, createdAt: now, required: q.isRequired } }))
      /* (M-02, 1.0 B-84) New project's first note lands in the project's Notes & Logs */
      if (note) await tx.insert(leadNotes).values({ id: randomUUID(), leadId, kind: 'note', title: '', body: note, authorId: stampBy, createdAt: now, updatedAt: now })
      id = await writeProjectRow(tx, row, number, stampBy)
      if (!id) throw new Error('project not written')
    })
  } catch {
    return { error: 'Couldn’t create the project — nothing was saved, please try again' }
  }
  const made = id as string | null
  if (!made) return { error: 'Couldn’t create the project — nothing was saved, please try again' }
  await afterProjectRow(row, made, number)
  touch(made, leadId)
  return { id: made, number }
}

/** (Q-05) A project's name, at any stage. */
export async function renameProject(projectId: string, name: string): Promise<{ name: string } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const next = name.trim().replace(/\s+/g, ' ').slice(0, NAME_MAX)
  if (!next) return { error: 'Give the project a name' }
  const g = await forChange(projectId)
  if ('error' in g) return g
  if (next === g.p.name) return { name: next }
  if (await nameTaken(next, projectId)) return { error: DUPLICATE_NAME }   // (gaps build, package A — 10)
  await db.update(projects).set({ name: next, updatedAt: new Date() }).where(eq(projects.id, projectId))
  await logProjectEvent(db, g.leadId, projectId, 'project_renamed', { from: g.p.name, to: next, number: g.p.number })
  touch(projectId, g.leadId)
  return { name: next }
}

/** (REG-917) Setting up → In progress: Start the project asks for the start date; the project runs from then. */
export async function startProject(projectId: string, input: { startDate: string }): Promise<{ ok: true } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const start = dayOf(input.startDate)
  if (!start) return { error: 'Choose the start date' }
  const g = await forChange(projectId)
  if ('error' in g) return g
  if (g.p.stage !== 'setting_up') return { error: 'This project has already started' }
  if (g.p.onHoldAt) return { error: ON_HOLD_START }   // (gaps build, package A — M-01) Resume first: the header's one action says so
  if (g.p.targetEndDate && g.p.targetEndDate < start) return { error: 'The start date is after the target end date' }
  const now = new Date()
  await db.update(projects).set({ stage: 'in_progress', startDate: start, startedAt: now, updatedAt: now }).where(eq(projects.id, projectId))
  await logProjectEvent(db, g.leadId, projectId, 'project_started', { name: g.p.name, number: g.p.number, when: start.toISOString() })
  await notifyProjectStage(g.p, g.leadId, stageWord('setting_up'), stageWord('in_progress'), null)   // (parity P-37)
  touch(projectId, g.leadId)
  return { ok: true }
}

/* ── (simplify S-17, the owner's "build everything", 2026-10-09; P2 §6.2) The Start sheet ─────────────────────────────────────────────────
   Start the project in one press: the day works start (asked once), the schedule (the Start card's picker and preview — or Not now), ☑ invite
   the client to their page, ☑ send (or submit) the Deposit invoice. Each tick runs today's own action under today's rule — `startProject` ·
   `createSchedule` · `inviteClient` · `sendInvoice` / `submitInvoice`; one sentence, one Undo (refused once the client opened their page or
   paid), and the browser opens ONE WhatsApp draft with the invite and the deposit. */

export type StartSheetRead = {
  project: { id: string; name: string; stage: string; held: boolean; startDate: number | null; targetEnd: number | null }
  client: ClientTellFacts
  /** No schedule yet: the Start card's data — the sheet's picker and its preview read it (null once a schedule exists). */
  schedule: ScheduleData | null
  /** A schedule already there: its milestones and its handover day (a day number). */
  existing: { n: number; handover: number | null } | null
  /** The Deposit (the stage due on signing) still to send — only for whoever sees money (F-17). */
  deposit: { id: string; stage: string; amountMinor: number; pct: number; mode: 'send' | 'submit' | 'awaiting'; due: string } | null
  now: number
}
/** The sheet's facts — the project's team (and their Managers), Owners and Admins, while it is Setting up. */
export async function readStartSheet(projectId: string): Promise<StartSheetRead | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const g = await forChange(projectId)
  if ('error' in g) return g
  if (g.p.stage !== 'setting_up') return { error: 'This project has already started' }
  const viewer = await fetchViewer()
  const team = (await db.select({ memberId: leadAssignees.memberId }).from(leadAssignees).where(eq(leadAssignees.leadId, g.leadId))).map((r) => r.memberId)
  const [client, schedule] = await Promise.all([clientTellFacts(g.leadId), fetchScheduleData(projectId)])
  if (!client) return { error: NOT_FOUND }
  const list = schedule?.milestones ?? []
  let deposit: StartSheetRead['deposit'] = null
  if (seesMoney(viewer, team)) {
    const [summary, rules] = await Promise.all([moneySummaryOf(g.p), fetchInvoiceRules()])
    const stage = summary.stages.find((s) => s.onSigning && s.invoice && (s.invoice.state === 'draft' || s.invoice.state === 'ready' || s.invoice.state === 'awaiting'))
    const i = stage?.invoice
    if (stage && i && i.amountMinor > 0) {
      const due = i.dueMode === 'date' && i.dueOn ? `due ${displayDate(new Date(i.dueOn))}` : i.dueMode === 'handover' ? 'due at the handover' : rules.termsDays ? `due ${rules.termsDays} ${rules.termsDays === 1 ? 'day' : 'days'} after it’s sent` : 'due on receipt'
      deposit = { id: i.id, stage: stage.name, amountMinor: i.amountMinor, pct: stage.pct, mode: i.state === 'awaiting' ? 'awaiting' : sendsAtOnce(viewer.role, rules) ? 'send' : 'submit', due }
    }
  }
  const h = list.length ? Math.max(...list.map((m) => m.end)) : null
  return {
    project: { id: g.p.id, name: g.p.name, stage: g.p.stage, held: !!g.p.onHoldAt, startDate: g.p.startDate?.getTime() ?? null, targetEnd: g.p.targetEndDate?.getTime() ?? null },
    client, schedule: list.length || !schedule ? null : schedule, existing: list.length ? { n: list.length, handover: h } : null, deposit, now: Date.now(),
  }
}

/** What went to the client with the start — the browser drafts the one WhatsApp from it (lib/projects/tell-client.ts `start`). */
export type StartTold = { invited: boolean; invoice: { stage: string; amountMinor: number; number: string | null; dueAt: number | null; link: string | null } | null }
/** The start's way back: the project as it was, the milestones it made, the invite's stamps, the deposit's send — and when it ran. */
export type StartUndo = {
  projectId: string; at: number
  before: { startDate: number | null; startedAt: number | null; targetEnd: number | null }
  milestones: string[]
  invite: InviteBefore | null
  deposit: InvoiceRevert | null
  /** (simplify round 2, R2-C) the client's emails the start raised (the deposit's), held for the snackbar's Undo — the outbox rows */
  held?: string[]
}
export type StartInput = { startDate: string; source: ScheduleSource | null; invite: boolean; depositId: string | null }
export async function startProjectSheet(projectId: string, input: StartInput): Promise<{ sentence: string; undo: StartUndo; told: StartTold } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  /* (simplify round 2, R2-C) what the client hears of by themselves (the deposit invoice's email) waits out the snackbar's Undo */
  const { result, held } = await holdClientMail(UNDO_SNACKBAR_MS, () => runStartSheet(projectId, input))
  return 'error' in result ? result : { ...result, undo: { ...result.undo, held: held.ids } }
}
async function runStartSheet(projectId: string, input: StartInput): Promise<{ sentence: string; undo: StartUndo; told: StartTold } | Refusal> {
  const g = await forChange(projectId)
  if ('error' in g) return g
  const at = Date.now()
  const before = { startDate: g.p.startDate?.getTime() ?? null, startedAt: g.p.startedAt?.getTime() ?? null, targetEnd: g.p.targetEndDate?.getTime() ?? null }
  /* 1 · the start — refused here, nothing else runs (the sheet says why under the date) */
  const s = await startProject(projectId, { startDate: input?.startDate })
  if ('error' in s) return s
  const start = dayOf(input.startDate)!
  const undo: StartUndo = { projectId, at, before, milestones: [], invite: null, deposit: null }
  const told: StartTold = { invited: false, invoice: null }
  const parts: string[] = [], refused: string[] = []
  const say = (what: string, why: string) => refused.push(`Couldn’t ${what} — ${why.replace(/[.]+$/, '')}.`)
  /* 2 · the schedule — the Start card's own action; Not now leaves the card on the Schedule tab */
  if (input.source && input.source !== 'blank') {
    const iso = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`
    const r = await createSchedule(projectId, { start: iso, source: input.source })
    if ('error' in r) say('set up the schedule', r.error)
    else if (r.n) {
      const made = await db.select({ id: projectMilestones.id, endDate: projectMilestones.endDate }).from(projectMilestones).where(and(eq(projectMilestones.projectId, projectId), isNull(projectMilestones.deletedAt), gte(projectMilestones.createdAt, new Date(at - 2000))))
      undo.milestones = made.map((m) => m.id)
      const last = made.reduce<Date | null>((b, m) => (!b || m.endDate > b ? m.endDate : b), null)
      parts.push(`${r.n} ${r.n === 1 ? 'milestone' : 'milestones'}${last ? ` to ${dayMonth(dayOfStored(last))}` : ''}`)
    }
  }
  const [lead] = await db.select({ name: leads.name }).from(leads).where(eq(leads.id, g.leadId)).limit(1)
  const first = titleCaseName(lead?.name ?? 'The client').split(/\s+/)[0] ?? 'the client'
  /* 3 · the invite — Invite to Portal's own action (a mobile number only) */
  if (input.invite) {
    const b = await inviteBefore(g.leadId)
    const r = await inviteClient(g.leadId)
    if ('error' in r) say(`invite ${first}`, r.error)
    else { undo.invite = b; told.invited = true; parts.push(`${first} is invited`) }
  }
  /* 4 · the deposit — sent, or submitted for approval (money's own rule) */
  if (input.depositId) {
    const [i] = await db.select().from(projectInvoices).where(and(eq(projectInvoices.id, input.depositId), eq(projectInvoices.projectId, projectId))).limit(1)
    if (!i || i.status !== 'draft') say('send the deposit invoice', 'it isn’t a Draft any more')
    else {
      const b = await invoiceBefore(i.id)
      if (sendsAtOnce((await fetchViewer()).role, await fetchInvoiceRules())) {
        const r = await sendInvoice(i.id)
        if ('error' in r) say(`send the ${i.stageName} invoice`, r.error)
        else {
          if (b) undo.deposit = { invoiceId: i.id, projectId, kind: 'sent', at, before: b }
          const [sent] = await db.select({ shareToken: projectInvoices.shareToken }).from(projectInvoices).where(eq(projectInvoices.id, i.id)).limit(1)
          told.invoice = { stage: i.stageName, amountMinor: i.amountMinor, number: r.number, dueAt: r.dueAt, link: sent?.shareToken ? `/invoice/${sent.shareToken}` : null }
          parts.push(`${r.number} sent`)
        }
      } else if (i.submittedAt) parts.push(`the ${i.stageName} invoice already waits for approval`)
      else {
        const r = await submitInvoice(i.id)
        if ('error' in r) say(`submit the ${i.stageName} invoice`, r.error)
        else { if (b) undo.deposit = { invoiceId: i.id, projectId, kind: 'submitted', at, before: b }; parts.push(`the ${i.stageName} invoice submitted for approval`) }
      }
    }
  }
  touch(projectId, g.leadId)
  return { sentence: `${g.p.name} is in progress${parts.length ? ` — ${parts.join('; ')}` : ''}.${refused.length ? ` ${refused.join(' ')}` : ''}`, undo, told }
}

/** The start's Undo: the deposit back to its Draft, the invite's stamps as they were, the milestones it made gone, the project Setting up
    again with its dates — and the lines and the bell rows they wrote. Refused once the client opened their page or paid since. */
export async function undoStartProjectSheet(u: StartUndo): Promise<{ ok: true; /** (simplify round 2) the held emails it kept from going */ unsent: HeldMail } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const g = await forChange(typeof u?.projectId === 'string' ? u.projectId : '')
  if ('error' in g) return g
  if (g.p.stage !== 'in_progress') return { error: 'It has moved on since — it stays as it is' }
  const at = typeof u.at === 'number' && Number.isFinite(u.at) ? u.at : Date.now()
  const [lead] = await db.select({ name: leads.name }).from(leads).where(eq(leads.id, g.leadId)).limit(1)
  const first = titleCaseName(lead?.name ?? 'The client').split(/\s+/)[0] ?? 'The client'
  if (u.invite && await openedSince(g.leadId, at)) return { error: `${first} has opened their page since — the start stays` }
  if (u.deposit && typeof u.deposit.invoiceId === 'string') {
    const block = await invoiceRevertBlock({ invoiceId: u.deposit.invoiceId, projectId: g.p.id }, first)
    if (block) return { error: block }
  }
  const unsent = await cancelHeldMessages(u.held, g.leadId)   // (simplify round 2, R2-C) the deposit's email, still held, never goes
  if (u.deposit && u.deposit.projectId === g.p.id) await revertInvoice(u.deposit)
  if (u.invite) await revertInvite(g.leadId, u.invite, at)
  const ids = (Array.isArray(u.milestones) ? u.milestones : []).filter((x): x is string => typeof x === 'string')
  const now = new Date()
  if (ids.length) await db.update(projectMilestones).set({ deletedAt: now, updatedAt: now }).where(and(eq(projectMilestones.projectId, g.p.id), inArray(projectMilestones.id, ids)))
  const b = u.before ?? { startDate: null, startedAt: null, targetEnd: null }
  const day = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? new Date(x) : null)
  await db.update(projects).set({ stage: 'setting_up', startDate: day(b.startDate), startedAt: day(b.startedAt), targetEndDate: day(b.targetEnd), updatedAt: now }).where(eq(projects.id, g.p.id))
  const since = new Date(at - 2000)
  await db.delete(leadEvents).where(and(eq(leadEvents.projectId, g.p.id), inArray(leadEvents.kind, ['project_started', 'project_schedule_created']), gte(leadEvents.at, since)))
  await db.delete(notifications).where(and(eq(notifications.kind, 'stage_changed'), eq(notifications.leadId, g.leadId), eq(notifications.href, `/projects/${g.p.id}`), gte(notifications.createdAt, since)))
  touch(g.p.id, g.leadId)
  revalidatePath(`/projects/${g.p.id}/schedule`)
  revalidatePath(`/projects/${g.p.id}/money`)
  return { ok: true, unsent }
}

/** The project's dates — Getting started's Start date and Target end date, and their Change. Undo sends the earlier values back. */
export async function setProjectDates(projectId: string, input: { startDate?: string | null; targetEndDate?: string | null }): Promise<{ ok: true } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const g = await forChange(projectId)
  if ('error' in g) return g
  const shut = completedBlock(g.p.stage, 'value'); if (shut) return { error: shut }   // (Projects round 7, Q-24) a completed project is read-only
  const start = input.startDate === undefined ? g.p.startDate : dayOf(input.startDate)
  const end = input.targetEndDate === undefined ? g.p.targetEndDate : dayOf(input.targetEndDate)
  if (start && end && end < start) return { error: 'The target end date is before the start date' }
  const fields = [
    ...(input.startDate !== undefined && (start?.getTime() ?? null) !== (g.p.startDate?.getTime() ?? null) ? [{ key: 'startDate', label: 'Start date', from: g.p.startDate ? displayDate(g.p.startDate) : '—', to: start ? displayDate(start) : '—' }] : []),
    ...(input.targetEndDate !== undefined && (end?.getTime() ?? null) !== (g.p.targetEndDate?.getTime() ?? null) ? [{ key: 'targetEndDate', label: 'Target end date', from: g.p.targetEndDate ? displayDate(g.p.targetEndDate) : '—', to: end ? displayDate(end) : '—' }] : []),
  ]
  if (!fields.length) return { ok: true }
  await db.update(projects).set({ startDate: start, targetEndDate: end, updatedAt: new Date() }).where(eq(projects.id, projectId))
  await logProjectEvent(db, g.leadId, projectId, 'project_edited', { name: g.p.name, number: g.p.number, fields })
  touch(projectId, g.leadId)
  return { ok: true }
}

/** Getting started › Contract value: the value agreed outside a system quote (a direct project's, or a Won lead's whose quote went). */
/** (fix-D, A-03) A value change's way back: the agreed value as it was, the Drafts it re-sized and the lines it wrote. */
export type ValueUndo = { projectId: string; valueMinor: number | null; amounts: AmountsUndo; eventIds: string[] }
export async function setProjectValue(projectId: string, input: { value: string }): Promise<{ ok: true; sentence: string; undo: ValueUndo } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const value = Math.round(Number(input.value.replace(/,/g, '')) * 100)
  if (!Number.isFinite(value) || value <= 0) return { error: 'Enter the agreed value' }
  const g = await forChange(projectId)
  if ('error' in g) return g
  const shut = completedBlock(g.p.stage, 'value'); if (shut) return { error: shut }   // (Projects round 7, Q-24)
  const money =(m: number | null) => (m ? `S$${(m / 100).toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—')
  const now = new Date()
  await db.update(projects).set({ agreedValueMinor: value, updatedAt: now }).where(eq(projects.id, projectId))
  const eventIds = [await logProjectEvent(db, g.leadId, projectId, 'project_edited', { name: g.p.name, number: g.p.number, fields: [{ key: 'agreedValueMinor', label: 'Agreed value', from: money(g.p.agreedValueMinor), to: money(value) }] }, { at: now })]
  /* (fix-D, A-03 · F-08 · REG-1067) the agreed value is a direct project's contract: its unsent Drafts are re-sized in the same press by money's
     own rebalance — one sentence, and an Undo that puts the value and the Drafts back */
  const r = await applyRebalance(projectId)
  if (r.changes.length) eventIds.push(await logProjectEvent(db, g.leadId, projectId, 'project_money_rebalanced', { name: g.p.name, number: g.p.number, n: r.changes.length, names: r.changes.map((c) => c.stageName), to: money2(r.contractMinor) }, { at: new Date(now.getTime() + 1000) }))
  touch(projectId, g.leadId)
  revalidatePath(`/projects/${projectId}/money`)
  return { ok: true, sentence: g.p.quoteId ? 'Agreed value saved' : rebalanceSentence(r.changes, r.contractMinor, { moved: true, drafts: r.drafts }), undo: { projectId, valueMinor: g.p.agreedValueMinor, amounts: r.undo, eventIds } }
}
/** (fix-D, A-03) The value change's Undo: the agreed value back, the Drafts back to their amounts (a Draft sent since keeps what it went at), its lines gone. */
export async function undoProjectValue(undo: ValueUndo): Promise<{ ok: true } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const g = await forChange(typeof undo?.projectId === 'string' ? undo.projectId : '')
  if ('error' in g) return g
  const shut = completedBlock(g.p.stage, 'value'); if (shut) return { error: shut }
  const v = typeof undo.valueMinor === 'number' && Number.isFinite(undo.valueMinor) && undo.valueMinor > 0 ? Math.round(undo.valueMinor) : null
  await db.update(projects).set({ agreedValueMinor: v, updatedAt: new Date() }).where(eq(projects.id, g.p.id))
  await restoreAmounts(g.p.id, Array.isArray(undo.amounts) ? undo.amounts : [])
  const ids = (Array.isArray(undo.eventIds) ? undo.eventIds : []).filter((x) => typeof x === 'string').slice(0, 5)
  if (ids.length) await db.delete(leadEvents).where(and(eq(leadEvents.projectId, g.p.id), inArray(leadEvents.id, ids)))
  touch(g.p.id, g.leadId)
  revalidatePath(`/projects/${g.p.id}/money`)
  return { ok: true }
}

/* ── (gaps build, package A — M-01) On hold ────────────────────────────────────────────────────────────────────────────────────────── */

/** What a hold change's Undo puts back: the four columns as they were, and the line it wrote. */
export type HoldUndo = { projectId: string; before: { at: number | null; reason: string | null; until: number | null; by: string | null }; eventId: string
  /** (simplify round 2, R2-C) the client's "paused" / "running again" email, held for the snackbar's Undo — the outbox rows */
  held?: string[] }
const holdBefore = (p: typeof projects.$inferSelect): HoldUndo['before'] => ({ at: p.onHoldAt?.getTime() ?? null, reason: p.onHoldReason, until: p.onHoldUntil, by: p.onHoldBy })

/**
 * Put on hold (or change the hold): why — the client reads it on their schedule — and, when known, the day it resumes. The project's team,
 * their Managers, Owners and Admins (`mayChangeProject`, the Who may do what row "Put a project on hold and resume it"). A completed project
 * can't be put on hold. Undo puts the project back as it was.
 */
export async function putProjectOnHold(projectId: string, input: { reason: string; until?: string | null }): Promise<{ ok: true; undo: HoldUndo } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const stampBy = await sessionMemberId()   // (pending modules S43A) who writes — this browser's member, read before any write
  const reason = (input?.reason ?? '').replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, HOLD_REASON_MAX)
  if (!reason) return { error: 'Say why the project is on hold' }
  const untilDay = input?.until ? dayOf(input.until) : null
  if (input?.until && !untilDay) return { error: 'Choose the resume date' }
  const g = await forChange(projectId)
  if ('error' in g) return g
  if (g.p.stage === 'completed') return { error: HOLD_ENDED }
  const now = new Date()
  if (untilDay && dayStart(untilDay.getTime()) <= dayStart(now.getTime())) return { error: 'Choose a resume date after today' }
  const again = !!g.p.onHoldAt
  await db.update(projects).set({ onHoldAt: again ? g.p.onHoldAt : now, onHoldReason: reason, onHoldUntil: untilDay ? untilDay.getTime() : null, onHoldBy: again ? g.p.onHoldBy : stampBy, updatedAt: now }).where(eq(projects.id, projectId))
  const eventId = await logProjectEvent(db, g.leadId, projectId, 'project_put_on_hold', { name: g.p.name, number: g.p.number, reason, when: untilDay ? untilDay.toISOString() : null, ...(again ? { again: true } : {}) }, { at: now })
  if (!again) await notifyProjectStage(g.p, g.leadId, stageWord(g.p.stage), 'On hold', `On hold · ${reason}`)   // (parity P-37) a changed hold is no stage change
  /* (simplify Q-13) the client hears it by their switches — once per hold (its start is the key); (simplify round 2, R2-C) held for the Undo */
  const { held } = await holdClientMail(UNDO_SNACKBAR_MS, () => tellClientEvent('paused', { projectId }))
  touch(projectId, g.leadId)
  return { ok: true, undo: { projectId, before: holdBefore(g.p), eventId, held: held.ids } }
}

/** Resume: the project runs again — its attention reasons, its reminders and its next step come back. Undo puts the hold back. */
export async function resumeProject(projectId: string): Promise<{ ok: true; undo: HoldUndo } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const g = await forChange(projectId)
  if ('error' in g) return g
  const h = holdOf(g.p)
  if (!h) return { error: NOT_ON_HOLD }
  const now = new Date()
  await db.update(projects).set({ onHoldAt: null, onHoldReason: null, onHoldUntil: null, onHoldBy: null, updatedAt: now }).where(eq(projects.id, projectId))
  const eventId = await logProjectEvent(db, g.leadId, projectId, 'project_resumed', { name: g.p.name, number: g.p.number, reason: h.reason || null, ...(h.until !== null && dayStart(h.until) < dayStart(now.getTime()) ? { late: true } : {}) }, { at: now })
  await notifyProjectStage(g.p, g.leadId, 'On hold', stageWord(g.p.stage), null)   // (parity P-37)
  const { held } = await holdClientMail(UNDO_SNACKBAR_MS, () => tellClientEvent('resumed', { projectId }))   // (simplify Q-13 · round 2, R2-C)
  touch(projectId, g.leadId)
  return { ok: true, undo: { projectId, before: holdBefore(g.p), eventId, held: held.ids } }
}

/** A hold change's Undo: the four columns as they were, its line gone (the undoStageMove way) — (simplify round 2, R2-C) and the client's
    email it held, so it never goes. */
export async function undoHoldChange(undo: HoldUndo): Promise<{ ok: true; unsent: HeldMail } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const g = await forChange(typeof undo?.projectId === 'string' ? undo.projectId : '')
  if ('error' in g) return g
  if (g.p.stage === 'completed') return { error: HOLD_ENDED }
  const b = undo.before ?? { at: null, reason: null, until: null, by: null }
  const at = typeof b.at === 'number' && Number.isFinite(b.at) ? new Date(b.at) : null
  await db.update(projects).set({ onHoldAt: at, onHoldReason: at ? (typeof b.reason === 'string' ? b.reason.slice(0, HOLD_REASON_MAX) : null) : null, onHoldUntil: at && typeof b.until === 'number' && Number.isFinite(b.until) ? b.until : null, onHoldBy: at && typeof b.by === 'string' ? b.by : null, updatedAt: new Date() }).where(eq(projects.id, g.p.id))
  if (typeof undo.eventId === 'string' && undo.eventId) {
    /* (parity P-37) the undone hold or resume never happened: the stage notice it raised goes with its line, as undoStageMove's does (REG-608) */
    const [line] = await db.select({ at: leadEvents.at }).from(leadEvents).where(and(eq(leadEvents.projectId, g.p.id), eq(leadEvents.id, undo.eventId))).limit(1)
    if (line) await db.delete(notifications).where(and(eq(notifications.kind, 'stage_changed'), eq(notifications.leadId, g.leadId), eq(notifications.href, `/projects/${g.p.id}`), gte(notifications.createdAt, line.at)))
    await db.delete(leadEvents).where(and(eq(leadEvents.projectId, g.p.id), eq(leadEvents.id, undo.eventId)))
  }
  const unsent = await cancelHeldMessages(undo.held, g.leadId)   // (simplify round 2, R2-C) "paused" / "running again", still held, never goes
  touch(g.p.id, g.leadId)
  return { ok: true, unsent }
}

/* ── (gaps build, package A — 1 · 7) The client and the property, the project type and the scope ─────────────────────────────────────── */

export type ProjectDetailsInput = {
  projectType: string
  scope: string[]
  /** A direct project's client and property — its client has no lead page; a Won project's are changed on its lead (one edit per record). */
  client?: { name: string; phone: string; email: string; propertyType: string; propertyAddress: string; district: string; areaSqft: string; style: string }
}
const CLIENT_LABELS: Record<string, string> = { name: 'Client name', phone: 'Phone', email: 'Email', propertyType: 'Property type', propertyAddress: 'Property address', area: 'District', areaSqft: 'Floor area (sq ft)', style: 'Style' }
const shown = (k: string, v: unknown): string => (v === null || v === undefined || v === '' ? '—' : k === 'phone' ? phoneTyped(String(v)) : k === 'areaSqft' ? Number(v).toLocaleString('en-SG') : String(v))

/**
 * Edit the project's details: its project type and scope (any project), and a direct project's client and property — name, phone, email,
 * address, district, property type, floor area, style — with the lead form's checks, and `updateLead`'s server logic: the changed fields go to
 * the record's log, and the client's portal sign-in moves with the phone (G-02). A Won project's client is edited on its lead.
 */
export async function editProjectDetails(projectId: string, input: ProjectDetailsInput): Promise<{ ok: true; changed: number } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const g = await forChange(projectId)
  if ('error' in g) return g
  if (!(PROJECT_TYPES as readonly string[]).includes(input?.projectType)) return { error: 'Choose the project type' }
  const scope = cleanScope(input?.scope)
  const [lead] = await db.select().from(leads).where(eq(leads.id, g.leadId)).limit(1)
  if (!lead) return { error: NOT_FOUND }
  let cols: Partial<typeof leads.$inferInsert> | null = null
  if (input.client) {
    if (!lead.direct) return { error: 'A won lead’s client is changed on its lead — open the lead’s record' }
    const c = input.client
    const name = titleCaseName((c.name ?? '').trim()).slice(0, 80)
    const phone = phoneDigits(c.phone ?? '')
    const email = (c.email ?? '').trim()
    if (!name) return { error: 'Enter the client’s name' }
    if (!isSgPhone(phone)) return { error: 'Enter a valid 8-digit Singapore number' }
    if (email && !EMAIL_RE.test(email)) return { error: 'Enter a valid email address' }
    if (!(PROPERTY_TYPES as readonly string[]).includes(c.propertyType)) return { error: 'Choose the property type' }
    cols = { name, phone, email: email || null, propertyType: c.propertyType, propertyAddress: (c.propertyAddress ?? '').trim().slice(0, 200) || null,
      area: (DISTRICTS as readonly string[]).includes(c.district) ? c.district : null, areaSqft: cleanArea(c.areaSqft), style: cleanStyle(c.style) }
  }
  const was = lead as unknown as Record<string, unknown>
  const clientFields = cols ? Object.keys(CLIENT_LABELS).filter((k) => k in cols! && String(was[k] ?? '') !== String((cols as Record<string, unknown>)[k] ?? ''))
    .map((k) => ({ key: k, label: CLIENT_LABELS[k]!, from: shown(k, was[k]), to: shown(k, (cols as Record<string, unknown>)[k]) })) : []
  const oldScope = parseScope(g.p.scope)
  const projectFields = [
    ...(input.projectType !== (g.p.projectType ?? '') ? [{ key: 'projectType', label: 'Project type', from: g.p.projectType ?? '—', to: input.projectType }] : []),
    ...(scope.join('|') !== oldScope.join('|') ? [{ key: 'scope', label: 'Scope', from: oldScope.length ? scopeWords(oldScope) : '—', to: scope.length ? scopeWords(scope) : '—' }] : []),
  ]
  /* the name follows a default name (Q-05) when the client or the property type changes — never a name someone typed */
  const nextDefault = cols ? defaultProjectName(cols.propertyType ?? lead.propertyType, cols.name ?? lead.name) : null
  const rename = cols && g.p.name === defaultProjectName(lead.propertyType, titleCaseName(lead.name)) && nextDefault && nextDefault !== g.p.name && !(await nameTaken(nextDefault, projectId)) ? nextDefault : null
  if (!clientFields.length && !projectFields.length) return { ok: true, changed: 0 }
  const now = new Date()
  await db.transaction(async (tx) => {
    if (cols && clientFields.length) await tx.update(leads).set({ ...cols, updatedAt: now }).where(eq(leads.id, g.leadId))
    if (projectFields.length || rename) await tx.update(projects).set({ projectType: input.projectType, scope: scope.length ? scope : null, ...(rename ? { name: rename } : {}), updatedAt: now }).where(eq(projects.id, projectId))
  })
  const { movePortalSignIn } = await import('@/lib/portal/sign-in')
  const moved = cols && clientFields.some((f) => f.key === 'phone') ? await movePortalSignIn(g.leadId, lead.phone, cols.phone) : null
  if (clientFields.length) await logProjectEvent(db, g.leadId, projectId, 'project_client_edited', { name: g.p.name, number: g.p.number, fields: clientFields, ...(moved ? { phone: phoneTyped(moved) } : {}) })
  if (projectFields.length) await logProjectEvent(db, g.leadId, projectId, 'project_edited', { name: g.p.name, number: g.p.number, fields: projectFields })
  if (rename) await logProjectEvent(db, g.leadId, projectId, 'project_renamed', { from: g.p.name, to: rename, number: g.p.number })
  touch(projectId, g.leadId)
  return { ok: true, changed: clientFields.length + projectFields.length }
}

/* ── (gaps build, package A — 6) Getting started › Contract ────────────────────────────────────────────────────────────────────────── */

export type ProjectContracts = { leadId: string; linkedId: string | null; contracts: { id: string; title: string; status: string; signedAt: number | null }[]; files: { id: string; name: string }[]; folderId: string | null; /** (gaps build E, item 4) the folder's own name */ folderName?: string }
const CONTRACT_FOLDER = CONTRACT_FOLDERS[0]   // (gaps build E, item 4) the starter folder "Contract & VOs" — an older "Contract" still counts
/** The Contract dialog: the client's contracts (the linked one marked), and what is filed in Files › Contract. */
export async function readProjectContracts(projectId: string): Promise<ProjectContracts | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const g = await forChange(projectId)
  if ('error' in g) return g
  const [cs, folder] = await Promise.all([
    db.select({ id: contracts.id, title: contracts.title, status: contracts.status, signedAt: contracts.signedAt }).from(contracts).where(and(eq(contracts.leadId, g.leadId), isNull(contracts.deletedAt), isNull(contracts.archivedAt))),
    db.select({ id: leadFiles.id, name: leadFiles.name }).from(leadFiles).where(and(eq(leadFiles.leadId, g.leadId), eq(leadFiles.kind, 'folder'), inArray(leadFiles.name, [...CONTRACT_FOLDERS]), isNull(leadFiles.parentId), isNull(leadFiles.deletedAt))),
  ])
  const pick = CONTRACT_FOLDERS.map((n) => folder.find((f) => f.name === n)).find(Boolean)   // (gaps build E, item 4)
  const folderId = pick?.id ?? null
  const files = folderId ? await db.select({ id: leadFiles.id, name: leadFiles.name }).from(leadFiles).where(and(eq(leadFiles.leadId, g.leadId), eq(leadFiles.parentId, folderId), ne(leadFiles.kind, 'folder'), isNull(leadFiles.deletedAt))) : []
  return { leadId: g.leadId, linkedId: g.p.contractId, contracts: cs.map((c) => ({ id: c.id, title: c.title, status: c.status, signedAt: c.signedAt?.getTime() ?? null })), files, folderId, folderName: pick?.name ?? CONTRACT_FOLDER }
}
/** Files › Contract — found, or made at the root for the upload (the Files tab's own folder; a studio may rename or move it later). */
export async function contractFolderFor(projectId: string): Promise<{ leadId: string; folderId: string; folderName: string } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const r = await readProjectContracts(projectId)
  if ('error' in r) return r
  if (r.folderId) return { leadId: r.leadId, folderId: r.folderId, folderName: r.folderName ?? CONTRACT_FOLDER }
  const { createFolder } = await import('@/app/leads/files-actions')
  const made = await createFolder(r.leadId, CONTRACT_FOLDER, null).catch(() => null)
  const folderId = typeof made === 'string' ? made : null   // (gaps build E, item 2) createFolder answers a refusal as `{ error }`
  return folderId ? { leadId: r.leadId, folderId, folderName: CONTRACT_FOLDER } : { error: `Couldn’t make the ${CONTRACT_FOLDER} folder in Files` }
}
/** Link the client's signed contract as the project's — Key documents opens it, Getting started is done. */
export async function linkProjectContract(projectId: string, contractId: string): Promise<{ ok: true } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const g = await forChange(projectId)
  if ('error' in g) return g
  const [c] = await db.select({ id: contracts.id, title: contracts.title, status: contracts.status }).from(contracts).where(and(eq(contracts.id, contractId), eq(contracts.leadId, g.leadId), isNull(contracts.deletedAt))).limit(1)
  if (!c) return { error: 'That contract is not there any more' }
  if (c.status !== 'Signed') return { error: `${c.title} isn’t signed yet — link it once it is` }
  if (g.p.contractId === c.id) return { ok: true }
  await db.update(projects).set({ contractId: c.id, updatedAt: new Date() }).where(eq(projects.id, projectId))
  await logProjectEvent(db, g.leadId, projectId, 'project_edited', { name: g.p.name, number: g.p.number, fields: [{ key: 'contractId', label: 'Contract', from: '—', to: c.title }] })
  touch(projectId, g.leadId)
  return { ok: true }
}

/* ── (parity map, PR-058 — her "build everything that's in 1.0" 2026-10-10; 1.0's CloneProjectDialog, B-292…B-302) Duplicate a project ──── */

export type DuplicateRead = {
  name: string; number: string; client: string
  /** The source's milestones (the schedule to copy) and the day its first one starts ('yyyy-mm-dd'). */
  milestones: number; firstStart: string | null
  /** The signed quote that can be copied as a draft. */
  quote: { number: string } | null
  /** Another client's record to start from — every lead the viewer sees but the source's own, by name (a name two leads share reads with the phone). */
  leads: { id: string; label: string }[]
  /** Today, 'yyyy-mm-dd' — the copied schedule's works start, to begin with. */
  today: string
}
const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
/** The dialog's facts: the source, its schedule and signed quote, and the clients it can be for. Any member who sees the project. */
export async function readDuplicateProject(projectId: string): Promise<DuplicateRead | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const [row] = await db.select({ p: projects, l: leads }).from(projects).innerJoin(leads, eq(leads.id, projects.leadId)).where(and(eq(projects.id, projectId), isNull(projects.deletedAt))).limit(1)
  if (!row) return { error: NOT_FOUND }
  const viewer = await fetchViewer()
  if (!(await canOpenLead(viewer, row.l.id))) return { error: NOT_FOUND }
  if (!mayCreateProject(viewer)) return { error: 'Only members of the studio add projects' }
  const [ms, q, visible, all] = await Promise.all([
    db.select({ start: projectMilestones.startDate }).from(projectMilestones).where(and(eq(projectMilestones.projectId, projectId), isNull(projectMilestones.deletedAt))),
    row.p.quoteId ? db.select({ number: quotes.number }).from(quotes).where(and(eq(quotes.id, row.p.quoteId), isNull(quotes.deletedAt))).limit(1) : Promise.resolve([]),
    (await import('@/lib/leads/visibility')).visibleLeadIds(viewer),
    db.select({ id: leads.id, name: leads.name, phone: leads.phone }).from(leads).where(isNull(leads.deletedAt)),
  ])
  /* (F-17) the signed quote is money: offered to copy only to whoever sees the source's money */
  const team = (await db.select({ memberId: leadAssignees.memberId }).from(leadAssignees).where(eq(leadAssignees.leadId, row.l.id))).map((t) => t.memberId)
  const sees = seesMoney(viewer, team)
  const pool = all.filter((x) => x.id !== row.l.id && (!visible || visible.has(x.id)) && x.name.trim())
  const names = pool.map((x) => titleCaseName(x.name))
  const label = (x: { name: string; phone: string | null }) => { const n = titleCaseName(x.name); return names.filter((m) => m === n).length > 1 && x.phone ? `${n} · ${phoneTyped(x.phone)}` : n }
  const first = ms.length ? new Date(Math.min(...ms.map((m) => m.start.getTime()))) : null
  return {
    name: row.p.name, number: row.p.number, client: titleCaseName(row.l.name), milestones: ms.length, firstStart: first ? isoDay(first) : null,
    quote: q[0] && sees ? { number: q[0].number } : null,
    leads: pool.map((x) => ({ id: x.id, label: label(x) })).sort((a, b) => a.label.localeCompare(b.label)).slice(0, 500),
    today: isoDay(new Date()),
  }
}

export type DuplicateInput = {
  /** Who the new project is for: the source's client · another client's record (`leadId`) · a new client (`name` + `phone`). */
  client: 'same' | 'lead' | 'new'
  leadId?: string | null; name?: string; phone?: string
  /** Copy the schedule, re-dated so its first milestone starts on `start` ('yyyy-mm-dd'). */
  schedule: boolean; start?: string | null
  /** Copy the signed quote as a new draft on the new project. */
  quote: boolean
}
/** A duplicate's way back, for the snackbar's life: the copy (with its client record) goes, and the source's line. */
export type DuplicateUndo = { projectId: string; leadId: string; sourceId: string; sourceEventId: string; at: number }
const DUPLICATE_UNDO_MINUTES = 10
/** "Kitchen — Benjamin Han (copy)", "… (copy 2)" — a name no live project has (B-187). */
async function freeName(base: string, suffix: (n: number) => string): Promise<string> {
  const clip = (s: string) => s.slice(0, NAME_MAX)
  for (let n = 1; n < 50; n++) { const name = clip(`${base}${suffix(n)}`); if (!(await nameTaken(name))) return name }
  return clip(`${base} ${Date.now().toString().slice(-4)}`)
}
/**
 * Duplicate project: a new project, Setting up, on its own client record (a `direct` lead — 2.0's one-lead-per-project rule): the source's client,
 * another client's record (their details copied) or a new client (a name and a Singapore mobile). Its type, scope, team (within the viewer's
 * reach: a Designer's is theirs), value and payment split come from the source; with the ticks, its schedule re-dated from the day picked and a
 * draft of its signed quote. Answers the new project and its Undo.
 */
export async function duplicateProject(projectId: string, input: DuplicateInput): Promise<{ id: string; number: string; undo: DuplicateUndo } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const stampBy = await sessionMemberId()   // (pending modules S43A) who writes — this browser's member, read before any write
  const [row] = await db.select({ p: projects, l: leads }).from(projects).innerJoin(leads, eq(leads.id, projects.leadId)).where(and(eq(projects.id, projectId), isNull(projects.deletedAt))).limit(1)
  if (!row) return { error: NOT_FOUND }
  const { p: src, l: srcLead } = row
  const viewer = await fetchViewer()
  if (!(await canOpenLead(viewer, srcLead.id))) return { error: NOT_FOUND }
  if (!mayCreateProject(viewer)) return { error: 'Only members of the studio add projects' }
  /* the client: as the source's, as another record's, or new */
  const kind = input?.client === 'lead' || input?.client === 'new' ? input.client : 'same'
  let from: typeof srcLead = srcLead
  if (kind === 'lead') {
    const id = typeof input.leadId === 'string' ? input.leadId : ''
    const [l] = id ? await db.select().from(leads).where(and(eq(leads.id, id), isNull(leads.deletedAt))).limit(1) : []
    if (!l || !(await canOpenLead(viewer, l.id))) return { error: 'Choose the client' }
    from = l
  }
  const typedName = titleCaseName((input?.name ?? '').trim()).slice(0, 80)
  const typedPhone = phoneDigits(input?.phone ?? '')
  if (kind === 'new' && !typedName) return { error: 'Enter the client’s name' }
  if (kind === 'new' && !isSgPhone(typedPhone)) return { error: 'Enter a valid 8-digit Singapore number' }
  const client = kind === 'new' ? typedName : titleCaseName(from.name)
  const propertyType = from.propertyType || srcLead.propertyType || 'Others'
  /* the schedule's day, checked before anything is written */
  const startDay = input?.schedule && typeof input.start === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input.start) ? Math.round(Date.parse(`${input.start}T00:00:00Z`) / 86_400_000) : null
  if (input?.schedule && startDay === null) return { error: 'Choose the day works start' }
  /* the name: a copy of the source's for the same client, else the default for the new client — never one another project has */
  const name = kind === 'same' ? await freeName(src.name, (n) => (n === 1 ? ' (copy)' : ` (copy ${n})`)) : await freeName(defaultProjectName(propertyType, client), (n) => (n === 1 ? '' : ` (${n})`))
  /* the team: the source's, within the viewer's reach (the New project rule) */
  const [team, everyone] = await Promise.all([db.select({ memberId: leadAssignees.memberId }).from(leadAssignees).where(eq(leadAssignees.leadId, srcLead.id)), db.select({ id: members.id, isActive: members.isActive, role: members.role }).from(members)])   // (parity map, FB-114) the role
  const reach = new Set(assignableIds(viewer, everyone))
  const carried = viewer.role === 'Designer' ? [viewer.id] : team.map((t) => t.memberId).filter((m) => reach.has(m))
  /* (S42F) a project needs a member: when nobody on the source's team comes along (none left, or none in the viewer's reach), the one who
     duplicates it is on the copy — never a project with nobody on it */
  const assignees = carried.length ? carried : reach.has(viewer.id) ? [viewer.id] : []
  if (!assignees.length) return { error: TEAM_NEEDED }
  /* the value and the split as the source agreed them: its signed quote's total and Payment Schedule, else its agreed value and split — only
     for whoever may see the source's money (F-17); anyone else's copy starts with none, to be added on the new project */
  const sees = seesMoney(viewer, team.map((t) => t.memberId))
  const money = sees ? await moneySummaryOf(src) : null
  const value = money ? money.baseMinor ?? src.agreedValueMinor ?? null : null
  /* (S44O — UAT row 297, her UAT ask 2026-10-15) a fixed design fee first comes along at its amount — it read as a 0% stage on the copy */
  const split: ProjectSplit | null = money?.stages.length ? { template: null, rows: money.stages.map((st) => ({ name: st.name, pct: st.pct, ...(st.fixedMinor != null && st.fixedMinor > 0 ? { fixedMinor: st.fixedMinor } : {}) })) } : null
  const refs = (await import('@/lib/projects/create')).stageRefMap((money?.stages ?? []).map((st) => st.ref))
  const now = new Date()
  const leadId = randomUUID()
  const number = await nextProjectNumber(now)
  const bank = await db.select().from(studioScopeQuestions).where(eq(studioScopeQuestions.isEnabled, true)).orderBy(asc(studioScopeQuestions.sortOrder))
  const { isBankType, leadOptions, parseBankOptions, toLeadType } = await import('@/lib/company/question-bank')
  const rowIn: NewProjectRow = { leadId, at: now, name, projectType: src.projectType, quoteId: null, contractId: null, agreedValueMinor: value, split, direct: true, client, notify: true, scope: cleanScope(src.scope) }
  let id: string | null = null
  try {
    await db.transaction(async (tx) => {
      await tx.insert(leads).values({
        id: leadId, name: client, phone: kind === 'new' ? typedPhone : from.phone, email: kind === 'new' ? null : from.email, source: 'Others', propertyType,
        propertyAddress: kind === 'new' ? null : from.propertyAddress, area: kind === 'new' ? null : from.area, areaSqft: kind === 'new' ? null : from.areaSqft, style: kind === 'new' ? null : from.style,
        budgetMinor: value ?? 0, stage: 'Won', direct: true, seenAt: now, createdAt: now, updatedAt: now,
      })
      if (assignees.length) await tx.insert(leadAssignees).values(assignees.map((memberId) => ({ id: randomUUID(), leadId, memberId, assignedAt: now, assignedBy: stampBy })))
      if (bank.length) await tx.insert(questions).values(bank.map((q, i) => { const t = isBankType(q.questionType) ? q.questionType : 'text'; const opts = leadOptions(t, parseBankOptions(q.options)); return { id: randomUUID(), leadId, text: q.question, type: toLeadType(t), options: opts.length ? JSON.stringify(opts) : null, sortOrder: i, createdAt: now, required: q.isRequired } }))
      id = await writeProjectRow(tx, rowIn, number, stampBy)
      if (!id) throw new Error('project not written')
    })
  } catch {
    return { error: 'Couldn’t duplicate the project — nothing was saved, please try again' }
  }
  const made = id as string | null
  if (!made) return { error: 'Couldn’t duplicate the project — nothing was saved, please try again' }
  /* the schedule before the Drafts and the compliance tasks, so a milestone's payment stage is the copy's from the start */
  const { copyScheduleTo, logParityEvent } = await import('@/lib/projects/create')
  const copied = startDay !== null ? await copyScheduleTo(src.id, made, startDay, refs, now) : 0
  await afterProjectRow(rowIn, made, number)
  /* a draft of the signed quote, on the new project's client record — the house copy (its lines, payment schedule and files), then moved */
  let quoteNumber: string | null = null
  if (input?.quote && src.quoteId && sees) {
    const { duplicateQuote } = await import('@/app/leads/quotes-actions')
    try {
      const qid = await orThrow(duplicateQuote(src.quoteId))
      const [lead] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1)
      await db.update(quotes).set({ leadId, projectId: null, ...(kind === 'same' ? {} : { title: client, nric: null, customerId: null, client2Name: null, client2Nric: null, siteAddress: lead?.propertyAddress ?? null, propertyType }), updatedAt: new Date() }).where(eq(quotes.id, qid))
      quoteNumber = (await db.select({ number: quotes.number }).from(quotes).where(eq(quotes.id, qid)).limit(1))[0]?.number ?? null
    } catch { /* the project stands without its draft — the dialog's sentence says only what was made */ }
  }
  await logParityEvent(db, leadId, made, 'parity_e_duplicated', { fromId: src.id, fromNumber: src.number, fromName: src.name, n: copied, quote: quoteNumber, number, name })
  const sourceEventId = await logParityEvent(db, srcLead.id, src.id, 'parity_e_duplicated_to', { toId: made, toNumber: number, toName: name })
  touch(made, leadId)
  touch(src.id, srcLead.id)
  return { id: made, number, undo: { projectId: made, leadId, sourceId: src.id, sourceEventId, at: now.getTime() } }
}
/** The duplicate's Undo, for the snackbar's life: the copy goes for good (its client record, schedule, draft quote and Drafts with it) — only by
    whoever made it, within its minutes, and never once money is recorded on it. */
export async function undoDuplicateProject(u: DuplicateUndo): Promise<{ sourceId: string } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const pid = typeof u?.projectId === 'string' ? u.projectId : ''
  const [row] = await db.select({ p: projects, l: leads }).from(projects).innerJoin(leads, eq(leads.id, projects.leadId)).where(eq(projects.id, pid)).limit(1)
  if (!row || row.l.id !== u.leadId || !row.l.direct) return { error: NOT_FOUND }
  const viewer = await fetchViewer()
  const madeBy = (await db.select({ actorId: leadEvents.actorId }).from(leadEvents).where(and(eq(leadEvents.projectId, pid), eq(leadEvents.kind, 'parity_e_duplicated'))).limit(1))[0]?.actorId ?? null
  if (madeBy !== viewer.id || Date.now() - row.p.createdAt.getTime() > DUPLICATE_UNDO_MINUTES * 60_000) return { error: 'It’s past its Undo — delete the project instead' }
  const { deleteBlock } = await import('@/lib/projects/handover-model')
  const { moneyRecordedOn } = await import('@/lib/projects/handover')
  const block = deleteBlock(await moneyRecordedOn(row.p))
  if (block) return { error: block }
  const now = new Date()
  const { sql } = await import('drizzle-orm')
  await db.delete(notifications).where(sql`${notifications.href} = ${`/projects/${pid}`} OR ${notifications.href} LIKE ${`/projects/${pid}/%`} OR ${notifications.href} LIKE ${`/projects/${pid}?%`}`)
  await db.delete(projects).where(eq(projects.id, pid))
  await db.update(leads).set({ deletedAt: now, deleteReason: 'Its duplicate was undone' }).where(eq(leads.id, row.l.id))
  await purgeLeads([row.l.id])
  if (typeof u.sourceEventId === 'string') await db.delete(leadEvents).where(and(eq(leadEvents.id, u.sourceEventId), eq(leadEvents.kind, 'parity_e_duplicated_to')))
  revalidatePath('/projects', 'layout')
  const [s] = await db.select({ id: projects.id, leadId: projects.leadId }).from(projects).where(eq(projects.id, typeof u.sourceId === 'string' ? u.sourceId : '')).limit(1)
  if (s) touch(s.id, s.leadId)
  return { sourceId: s?.id ?? '' }
}
