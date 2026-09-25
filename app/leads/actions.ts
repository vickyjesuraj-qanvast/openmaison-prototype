'use server'

import { fetchLeadSources } from '@/lib/settings/queries'
import { fetchViewer } from '@/lib/leads/visibility'
import { diffFields, logLeadEvent } from '@/lib/leads/events'
import { notify } from '@/lib/notifications/emit'
import { leadMemberIds, studioRunnerIds } from '@/lib/notifications/queries'
import { assignHint, assignableIds, runsStudio } from '@/lib/leads/assign-policy'
import { and, eq, inArray, isNotNull, isNull, sql, gte, asc } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { randomUUID } from 'node:crypto'
import { db, type Db } from '@/lib/db'
import { leadAssignees, leadCustomFieldValues, leadCustomFields, leadFiles, leads, members, questions, studioScopeQuestions } from '@/lib/db/schema'
import { SESSION_MEMBER_ID } from '@/lib/db/session'
import { ALL_STAGES, DISTRICTS, TASK_KINDS } from '@/lib/leads/enums'
// (REG-287) The app's one phone rule and one strict d/m/yyyy parser — the CSV import used to carry private copies
// of both, and the date copy accepted impossible dates (32/13/2026) the UI refuses.
import { digitsOnly, parseInputDate, phoneDigits, titleCaseName } from '@/lib/format'
import { revalidateEveryLead, revalidateLead, revalidateLeadListings } from '@/lib/leads/queries'
import { recordWonUpload } from '@/lib/contracts/won'

const ME = SESSION_MEMBER_ID   // (REG-286) one stand-in for the signed-in member, shared by every module that stamps a write

/**
 * (REG-286) A server action is a public endpoint: its TypeScript parameter types are not runtime guarantees, and a
 * stage string lands in `leads.stage` and `stage_logs`, where every policy helper, filter and kanban column reads it
 * back. A value outside the mock's vocabulary makes a lead that no column shows and no policy can move. Reject it.
 * (Same shape as the `kind` guard REG-285 added to updateTask; the vocabulary itself stays in lib/leads/enums.ts.)
 */
const isStage = (s: unknown): s is string => typeof s === 'string' && (ALL_STAGES as readonly string[]).includes(s)
function assertStage(...stages: unknown[]): void {
  for (const s of stages) if (!isStage(s)) throw new Error(`Unknown stage: ${String(s)}`)
}

/** The transaction handle Drizzle hands a `db.transaction` callback. */
type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]

/**
 * Replaces a lead's assignees. One writer for both doors — the Assign popover and the Lead form's Assign member
 * field (REG-231) — and de-duplicated, because `lead_assignees` carries unique(leadId, memberId).
 */
async function writeAssignees(tx: Tx, leadId: string, memberIds: string[]): Promise<void> {
  // (REG-335) A diff, not a wipe: members who stay keep their assigned_at, newcomers are stamped now, the rest go.
  const ids = [...new Set(memberIds)]
  const have = (await tx.select({ memberId: leadAssignees.memberId }).from(leadAssignees).where(eq(leadAssignees.leadId, leadId))).map((r) => r.memberId)
  const gone = have.filter((m) => !ids.includes(m))
  const fresh = ids.filter((m) => !have.includes(m))
  if (gone.length) await tx.delete(leadAssignees).where(and(eq(leadAssignees.leadId, leadId), inArray(leadAssignees.memberId, gone)))
  if (fresh.length) await tx.insert(leadAssignees).values(fresh.map((m) => ({ id: randomUUID(), leadId, memberId: m, assignedAt: new Date() })))
}

export async function assignMembers(leadId: string, memberIds: string[]): Promise<void> {
  /* (REG-601) The role's reach, checked here as well as in the popover: a Designer reassigns nobody; a Manager changes only their team and themselves. */
  const [viewer, team, current] = await Promise.all([fetchViewer(), db.select().from(members), db.select({ memberId: leadAssignees.memberId }).from(leadAssignees).where(eq(leadAssignees.leadId, leadId))])
  if (assignHint(viewer)) throw new Error('not allowed to assign')
  const allowed = new Set(assignableIds(viewer, team))
  const before = new Set(current.map((c) => c.memberId)), after = new Set(memberIds)
  const changed = [...new Set([...before, ...after])].filter((id) => before.has(id) !== after.has(id))
  if (changed.some((id) => !allowed.has(id))) throw new Error('outside your team')
  await db.transaction((tx) => writeAssignees(tx, leadId, memberIds))   // atomic: no window with the rows deleted
  /* (REG-613, parity Q-20) A removal leaves no row — the event log keeps it for Activity. */
  for (const id of [...before].filter((x) => !after.has(x))) await logLeadEvent(db, leadId, 'member_removed', { memberId: id, name: team.find((m) => m.id === id)?.name ?? id })
  /* (REG-604) The members just added hear it. */
  const added = memberIds.filter((id) => !before.has(id))
  if (added.length) { const [l] = await db.select({ name: leads.name }).from(leads).where(eq(leads.id, leadId)); const who = team.find((m) => m.id === viewer.id)?.name ?? 'A member'; await notify('assigned', added, { title: `${titleCaseName(l?.name ?? 'A lead')} is now yours`, body: `Assigned by ${who}`, href: `/leads/${leadId}`, leadId }) }
  revalidateLead(leadId)
}

/**
 * (REG-610, parity Q-31 · I-14 · I-16) The listing's bulk Assign: ADDS the chosen members to every selected lead (the owner's call —
 * never a replace, so nobody loses a lead they hold). The role's reach applies as in `assignMembers`; the members added hear it
 * once (2.0 notifies where 1.0's bulk path stayed silent, E-44). Returns how many leads gained someone.
 */
export async function addLeadMembers(leadIds: string[], memberIds: string[]): Promise<{ assigned: number }> {
  const ids = [...new Set(leadIds)].filter(Boolean).slice(0, 2000)   // 1.0's cap
  const adds = [...new Set(memberIds)].filter(Boolean)
  if (!ids.length || !adds.length) return { assigned: 0 }
  const [viewer, team] = await Promise.all([fetchViewer(), db.select().from(members)])
  if (assignHint(viewer)) throw new Error('not allowed to assign')
  const allowed = new Set(assignableIds(viewer, team))
  if (adds.some((id) => !allowed.has(id))) throw new Error('outside your team')
  const live = await db.select({ id: leads.id, name: leads.name }).from(leads).where(and(inArray(leads.id, ids), isNull(leads.deletedAt)))
  const have = await db.select({ leadId: leadAssignees.leadId, memberId: leadAssignees.memberId }).from(leadAssignees).where(inArray(leadAssignees.leadId, live.map((l) => l.id)))
  const now = new Date()
  const fresh: { id: string; leadId: string; memberId: string; assignedAt: Date }[] = []
  for (const l of live) for (const m of adds) if (!have.some((h) => h.leadId === l.id && h.memberId === m)) fresh.push({ id: randomUUID(), leadId: l.id, memberId: m, assignedAt: now })
  if (fresh.length) await db.insert(leadAssignees).values(fresh)
  const touched = [...new Set(fresh.map((f) => f.leadId))]
  const who = team.find((m) => m.id === viewer.id)?.name ?? 'A member'
  for (const m of adds) {
    const mine = fresh.filter((f) => f.memberId === m)
    if (!mine.length) continue
    const one = mine.length === 1 ? live.find((l) => l.id === mine[0]!.leadId) : null
    await notify('assigned', [m], one
      ? { title: `${titleCaseName(one.name)} is now yours`, body: `Assigned by ${who}`, href: `/leads/${one.id}`, leadId: one.id }
      : { title: `${mine.length} leads are now yours`, body: `Assigned from the listing by ${who}`, href: '/leads' })
  }
  for (const id of touched) revalidateLead(id)
  revalidateLeadListings()
  return { assigned: touched.length }
}

/** (REG-608) A task the Move stage window raises with the move: a plain title (General, undated) or the Contacted reminder — a dated Follow-up for the lead's members. */
export type MoveTask = string | { title: string; kind?: string; dueAt?: string | null; assignLeadMembers?: boolean }

export async function moveStage(input: {
  leadId: string
  fromStage: string
  toStage: string
  payload: unknown
  tasks: MoveTask[]
  followUpAt?: string | null
}): Promise<{ logId: string }> {
  assertStage(input.fromStage, input.toStage)   // (REG-286)
  const { leads, stageLogs, leadTasks } = await import('@/lib/db/schema')
  const { randomUUID: uuid } = await import('node:crypto')
  const now = new Date()
  const logId = uuid()   // (REG-607, parity Q-33) handed back so the On Hold / Lost snackbars can Undo the move, as a quick move's can
  const assigned: { id: string; title: string; memberIds: string[] }[] = []   // (REG-608) the reminder's members, notified after the write
  // (REG-286) One transaction: the lead's new stage, the log that records the move and the suggested tasks are one
  // fact. Unwrapped, a failure after the update left a lead sitting in a stage its journey has no log for — which is
  // what `resumeStage`, the stage timeline and Activity all read.
  await db.transaction(async (tx) => {
    await tx.update(leads)
      .set({ stage: input.toStage, updatedAt: now })
      .where(eq(leads.id, input.leadId))
    await tx.insert(stageLogs).values({
      id: logId, leadId: input.leadId,
      fromStage: input.fromStage, toStage: input.toStage,
      payload: input.payload as object, createdAt: now,
    })
    // Suggested tasks are raised by the signed-in member, like every task createTask() writes. Unstamped they read
    // "System created the task" in Activity, left the drawer's Creator row blank and hid under Filters › Creators › Dane.
    // (REG-608) The Contacted reminder arrives as a dated Follow-up for the lead's members — 1.0's follow-up task.
    for (const x of input.tasks) {
      const t = typeof x === 'string' ? { title: x } : x
      const kind = t.kind && (TASK_KINDS as readonly string[]).includes(t.kind) ? t.kind : 'General'
      const due = t.dueAt ? new Date(t.dueAt) : null
      const id = uuid()
      await tx.insert(leadTasks).values({
        id, leadId: input.leadId, title: t.title, kind,
        dueAt: due && !Number.isNaN(due.getTime()) ? due : null, done: false, createdAt: now, creatorId: ME, updatedAt: now,
      })
      if (t.assignLeadMembers) {
        const { taskAssignees } = await import('@/lib/db/schema')
        const memberIds = (await tx.select({ memberId: leadAssignees.memberId }).from(leadAssignees).where(eq(leadAssignees.leadId, input.leadId))).map((r) => r.memberId)
        if (memberIds.length) { await tx.insert(taskAssignees).values(memberIds.map((memberId) => ({ taskId: id, memberId }))); assigned.push({ id, title: t.title, memberIds }) }
      }
    }
  })
  if (input.toStage === 'Won') await recordWonUpload(input.leadId, input.payload, now)   // (REG-632, contracts parity Q-14) the uploaded signed contract is a contract
  /* (REG-608, parity Q-23) The lead's stage changed — Owners, Admins and the lead's members hear it (never the actor); the reminder's members hear their new task. */
  await notifyStageChange(input.leadId, input.fromStage, input.toStage, input.payload)
  for (const a of assigned) await notify('task_assigned', a.memberIds, { title: `New task: ${a.title}`, body: `On ${await leadName(input.leadId)}`, href: `/leads/${input.leadId}/tasks?open=${a.id}`, leadId: input.leadId })
  revalidateLead(input.leadId)
  return { logId }
}

const leadName = async (leadId: string): Promise<string> => { const [l] = await db.select({ name: leads.name }).from(leads).where(eq(leads.id, leadId)); return l ? titleCaseName(l.name) : 'A lead' }

/** (REG-608) The stage-changed event: "{lead}: {from} → {to}", the parking reason as the body. */
async function notifyStageChange(leadId: string, from: string, to: string, payload: unknown): Promise<void> {
  const p = (payload && typeof payload === 'object' ? payload : {}) as { reason?: string }
  const body = to === 'On Hold' || to === 'Lost' ? `${to === 'On Hold' ? 'On hold' : 'Lost'}${p.reason ? ` · ${p.reason}` : ''}` : null
  await notify('stage_changed', [...(await studioRunnerIds()), ...(await leadMemberIds(leadId))], { title: `${await leadName(leadId)}: ${from} → ${to}`, body, href: `/leads/${leadId}`, leadId })
}

/** (REG-608, parity Q-03) Set a follow-up from the Overview: one dated Follow-up task on the lead, assigned to its members (you, when it has none). */
export async function setFollowUp(leadId: string, input: { title: string; dueAt: string }): Promise<string> {
  const { leadTasks, taskAssignees } = await import('@/lib/db/schema')
  const due = new Date(input.dueAt)
  if (Number.isNaN(due.getTime())) throw new Error('bad date')
  const title = input.title.trim().slice(0, 120) || `Follow up with ${await leadName(leadId)}`
  const members = await leadMemberIds(leadId)
  const assignees = members.length ? members : [ME]
  const id = randomUUID(); const now = new Date()
  await db.transaction(async (tx) => {
    await tx.insert(leadTasks).values({ id, leadId, title, kind: 'Follow-up', dueAt: due, done: false, createdAt: now, creatorId: ME, seenAt: null, updatedAt: now })
    await tx.insert(taskAssignees).values(assignees.map((memberId) => ({ taskId: id, memberId })))
  })
  await notify('task_assigned', assignees, { title: `New task: ${title}`, body: `On ${await leadName(leadId)}`, href: `/leads/${leadId}/tasks?open=${id}`, leadId })
  revalidateLead(leadId); revalidatePath('/tasks')
  return id
}

/** (REG-607, parity Q-41) Only Owners and Admins delete leads — 1.0's default for `leads.delete`; the menus hide the item, the server refuses it. */
async function assertCanDelete(): Promise<void> {
  const viewer = await fetchViewer()
  if (!runsStudio(viewer.role)) throw new Error('Only Owners and Admins can delete leads')
}

/** (REG-607, parity Q-04) What Delete warns about, as 1.0's archive did: contracts of these leads whose signing link is still live with the client. */
export async function countLiveSigningLinks(leadIds: string[]): Promise<number> {
  if (leadIds.length === 0) return 0
  const { contracts, contractBundles } = await import('@/lib/db/schema')
  const [cs, bs] = await Promise.all([
    db.select({ n: sql<number>`count(*)` }).from(contracts).where(and(inArray(contracts.leadId, leadIds), eq(contracts.status, 'Sent to Client'), isNull(contracts.deletedAt))),
    db.select({ n: sql<number>`count(*)` }).from(contractBundles).where(and(inArray(contractBundles.leadId, leadIds), isNotNull(contractBundles.sentAt), isNull(contractBundles.signedAt))),
  ])
  return Number(cs[0]?.n ?? 0) + Number(bs[0]?.n ?? 0)
}

export async function deleteLead(leadId: string, reason: string): Promise<void> {
  await assertCanDelete()   // (REG-607)
  const { leads } = await import('@/lib/db/schema')
  const [lead] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1)
  if (!lead) return
  await db.update(leads)
    .set({ deletedAt: new Date(), deleteReason: reason, stageBeforeDelete: lead.stage })
    .where(eq(leads.id, leadId))
  revalidateLead(leadId)
}

type LeadFormInput = {
  name: string
  phone: string
  source: string
  propertyType: string
  propertyAddress: string
  email: string
  leadAddress: string
  budget: string        // grouped digits, e.g. "70,000"
  startDate: string     // d/m/yyyy
  style: string
  keyCollection: string
  condition: string
  areaSize: string
  areaUnit: string
  notes: string
  /** (REG-607) 1.0's Area / District (one of DISTRICTS), the client's IC / NRIC and the studio's customer reference. */
  district: string
  nric: string
  customerId: string
  /** Member ids from the form's Assign member field (REG-231). Replaces the lead's assignees wholesale. */
  assignees: string[]
  /** (REG-609, parity C-08) Files attached on the Create New Lead form — their names; each becomes the simulated upload's lead_files row. */
  files?: string[]
  /** (REG-612, parity Q-25) The studio's custom fields, by field id — a string, or a string[] for a multi select. */
  customValues?: Record<string, string | string[]>
}

function leadColumns(input: LeadFormInput) {
  // (REG-287) One phone rule (`phoneDigits`) and one date parser (`parseInputDate`, strict) — the hand-written
  // `digits(input.phone)` and the lax inline d/m/yyyy regex that stood here were two more copies of both.
  return {
    name: titleCaseName(input.name),   // (REG-329) typed in any case, saved as "Farah Ahmad"
    phone: phoneDigits(input.phone),
    source: input.source || 'Others',
    propertyType: input.propertyType || 'Others',
    propertyAddress: input.propertyAddress.trim() || null,
    email: input.email.trim() || null,
    leadAddress: input.leadAddress.trim() || null,
    budgetMinor: Number(digitsOnly(input.budget) || 0) * 100,
    estimatedStartDate: parseInputDate(input.startDate),
    style: input.style || null,
    keyCollection: input.keyCollection || null,
    condition: input.condition || null,
    areaSqft: (() => {
      const n = Number(digitsOnly(input.areaSize))
      if (!n) return null
      return input.areaUnit === 'sq m' ? Math.round(n * 10.7639) : n
    })(),
    notes: input.notes.trim() || null,
    area: (DISTRICTS as readonly string[]).includes(input.district) ? input.district : null,   // (REG-607) the vocabulary, or nothing
    icNumber: input.nric.replace(/\s+/g, '').toUpperCase() || null,   // (REG-607) kept the way the signing page checks it (isNric)
    customerId: input.customerId.trim() || null,
  }
}

/**
 * (REG-609, parity Q-18 · C-13) The duplicate pre-check behind Create New Lead: a live lead with the same phone (the bare
 * eight digits — 1.0's raw-or-E.164 exact match) else the same email, case-insensitive. Deleted leads are in the trash for
 * thirty days and never match (1.0 counted archived rows with a note; 2.0 has no archive). The form turns a hit into
 * "A lead with this phone already exists" — Open existing lead · Create anyway. No studio switch (the owner's call).
 */
export async function findDuplicateLead(input: { phone: string; email: string; excludeId?: string | null }): Promise<{ id: string; name: string; phone: string; email: string | null; stage: string; matchedOn: 'phone' | 'email' } | null> {
  const phone = phoneDigits(input.phone)
  const email = input.email.trim().toLowerCase()
  if (!phone && !email) return null
  const live = (await db.select({ id: leads.id, name: leads.name, phone: leads.phone, email: leads.email, stage: leads.stage }).from(leads).where(isNull(leads.deletedAt)))
    .filter((l) => l.id !== input.excludeId)
  const byPhone = phone.length >= 6 ? live.find((l) => l.phone === phone) : undefined
  if (byPhone) return { ...byPhone, matchedOn: 'phone' }
  const byEmail = email ? live.find((l) => (l.email ?? '').trim().toLowerCase() === email) : undefined
  return byEmail ? { ...byEmail, matchedOn: 'email' } : null
}

/* (REG-612, parity Q-25) The lead's custom values, written whole: only active fields, only shapes the field takes; an empty value clears the row. */
async function writeCustomValues(tx: Tx, leadId: string, values: Record<string, string | string[]> | undefined): Promise<void> {
  if (!values) return
  const defs = await tx.select({ id: leadCustomFields.id, fieldType: leadCustomFields.fieldType }).from(leadCustomFields).where(eq(leadCustomFields.isActive, true))
  /* (REG-647, settings parity Q-13 · E-91) Only the active fields' values are rewritten — an inactive field keeps its value, as the card promises. */
  if (defs.length) await tx.delete(leadCustomFieldValues).where(and(eq(leadCustomFieldValues.leadId, leadId), inArray(leadCustomFieldValues.fieldId, defs.map((d) => d.id))))
  const rows = defs.flatMap((d) => {
    const v = values[d.id]
    if (v === undefined) return []
    if (d.fieldType === 'multi_select') { const list = Array.isArray(v) ? v.map(String).filter(Boolean) : []; return list.length ? [{ id: randomUUID(), leadId, fieldId: d.id, value: JSON.stringify(list.slice(0, 20)) }] : [] }
    const str = Array.isArray(v) ? v[0] ?? '' : String(v)
    return str.trim() ? [{ id: randomUUID(), leadId, fieldId: d.id, value: JSON.stringify(str.trim().slice(0, 300)) }] : []
  })
  if (rows.length) await tx.insert(leadCustomFieldValues).values(rows)
}

export async function createLead(input: LeadFormInput): Promise<string> {
  const now = new Date()
  const id = randomUUID()
  /* (REG-609, parity C-07) A Designer's new lead is their own — the server twin of the form's locked Assign member field. (sweep S4 · U-11)
     The signed-in member decides it (`fetchViewer`, the house way — the fixed session id checked everyone as Dane), and a Manager's pick
     keeps to their reach, as the Assign popover's does (`assignableIds`). */
  const [viewer, team] = await Promise.all([fetchViewer(), db.select({ id: members.id, isActive: members.isActive }).from(members)])
  const reach = new Set(assignableIds(viewer, team))
  const assignees = viewer.role === 'Designer' ? [viewer.id] : input.assignees.filter((m) => reach.has(m))
  const files = (input.files ?? []).map((n) => n.trim()).filter(Boolean).slice(0, 20)
  // One transaction: a lead is never visible without the owners it was created with, so a retry cannot leave two.
  await db.transaction(async (tx) => {
    await tx.insert(leads).values({ id, ...leadColumns(input), stage: 'New', createdAt: now, updatedAt: now })   // every new lead carries the band until someone clicks it (user 2026-08-29)
    await writeAssignees(tx, id, assignees)
    await writeCustomValues(tx, id, input.customValues)   /* (REG-612) */
    /* (REG-612, parity Q-21) A new lead starts with the studio's enabled questions — 1.0 shows the bank on every lead. */
    const bank = await tx.select().from(studioScopeQuestions).where(eq(studioScopeQuestions.isEnabled, true)).orderBy(asc(studioScopeQuestions.sortOrder))
    if (bank.length) {
      const { isBankType, leadOptions, parseBankOptions, toLeadType } = await import('@/lib/company/question-bank')
      await tx.insert(questions).values(bank.map((q, i) => { const t = isBankType(q.questionType) ? q.questionType : 'text'; const opts = leadOptions(t, parseBankOptions(q.options)); return { id: randomUUID(), leadId: id, text: q.question, type: toLeadType(t), options: opts.length ? JSON.stringify(opts) : null, sortOrder: i, createdAt: now, required: q.isRequired } }))   // (REG-647) the bank's Required rides along
    }
    /* (REG-609, parity C-08) Documents attached at creation land in the Files tab — the row files-actions' uploadFile writes, in the same act. */
    if (files.length) await tx.insert(leadFiles).values(files.map((name) => {
      const pdf = /\.pdf$/i.test(name)
      return { id: randomUUID(), leadId: id, kind: pdf ? 'pdf' : 'image', name, thumb: pdf ? null : '/figma-assets/file-thumb-1.png', createdAt: now, parentId: null, ownerId: ME, sizeBytes: 728064, mime: pdf ? 'application/pdf' : 'image/jpeg', updatedAt: now }
    }))
  })
  /* (REG-604) Owners and Admins hear of every new lead; the members it was created with hear it is theirs. */
  await notify('new_lead', await studioRunnerIds(), { title: `New lead: ${titleCaseName(input.name)}`, body: `${input.source} · ${input.propertyType}`, href: `/leads/${id}`, leadId: id })
  if (assignees.length) await notify('assigned', assignees, { title: `${titleCaseName(input.name)} is now yours`, body: 'Assigned when the lead was created', href: `/leads/${id}`, leadId: id })
  revalidateLead(id)
  return id
}

export async function updateLead(leadId: string, input: LeadFormInput): Promise<void> {
  const [before] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1)
  /* (sweep S4 · U-11) The form's members change under the same reach as the Assign popover (assignMembers): only who may be assigned by this member moves. */
  const [viewer, team, current] = await Promise.all([fetchViewer(), db.select({ id: members.id, isActive: members.isActive }).from(members), db.select({ memberId: leadAssignees.memberId }).from(leadAssignees).where(eq(leadAssignees.leadId, leadId))])
  const was = new Set(current.map((c) => c.memberId)), now = new Set(input.assignees)
  const moved = [...new Set([...was, ...now])].filter((id) => was.has(id) !== now.has(id))
  if (moved.length) { const reach = new Set(assignableIds(viewer, team)); if (assignHint(viewer) || moved.some((id) => !reach.has(id))) throw new Error('outside your team') }
  const cols = leadColumns(input)
  await db.transaction(async (tx) => {
    await tx.update(leads).set({ ...cols, updatedAt: new Date() }).where(eq(leads.id, leadId))
    await writeAssignees(tx, leadId, input.assignees)
    await writeCustomValues(tx, leadId, input.customValues)   /* (REG-612) */
  })
  /* (REG-613, parity Q-20) An edit leaves no row of its own — the changed fields go to the event log, in the form's words. */
  const changes = before ? diffFields(before as unknown as Record<string, unknown>, cols as unknown as Record<string, unknown>) : []
  if (changes.length) await logLeadEvent(db, leadId, 'field_edited', { fields: changes })
  revalidateLead(leadId)
}

export async function addTask(leadId: string, title: string): Promise<void> {
  const { leadTasks } = await import('@/lib/db/schema')
  const now = new Date()
  // Stamped like createTask(): without a creator the same task read as 'System' in Activity and '—' in the drawer.
  await db.insert(leadTasks).values({
    id: randomUUID(), leadId, title, kind: 'General', createdAt: now, creatorId: ME, updatedAt: now,
  })
  revalidateLead(leadId)
}

/** The task's own lead, so the Tasks and Activity tabs are evicted too (REG-286) — the listing popover knows only the task id. */
async function leadOfTask(taskId: string): Promise<string | null> {
  const { leadTasks } = await import('@/lib/db/schema')
  const [t] = await db.select({ leadId: leadTasks.leadId }).from(leadTasks).where(eq(leadTasks.id, taskId)).limit(1)
  return t?.leadId ?? null
}

/* (REG-339) Both popover writes stamp `updated_at`, as the Tasks tab's updateTask does on every edit: the Activity
   feed reads "You completed the task …" / "You updated the task …" only when updated_at sits more than a minute past
   created_at, so a completion or a due date set from the listing's Tasks popover or the Overview's My Tasks card used
   to leave no trace there. */
export async function completeTask(taskId: string): Promise<void> {
  const { leadTasks } = await import('@/lib/db/schema')
  await db.update(leadTasks).set({ done: true, updatedAt: new Date() }).where(eq(leadTasks.id, taskId))
  const leadId = await leadOfTask(taskId)
  if (leadId) revalidateLead(leadId); else revalidateLeadListings()
}

export async function setTaskDue(taskId: string, due: Date): Promise<void> {
  const { leadTasks } = await import('@/lib/db/schema')
  await db.update(leadTasks).set({ dueAt: due, updatedAt: new Date() }).where(eq(leadTasks.id, taskId))
  const leadId = await leadOfTask(taskId)
  if (leadId) revalidateLead(leadId); else revalidateLeadListings()
}

/** Bulk soft delete — one statement; SQLite evaluates SET against the pre-update row. */
export async function deleteLeads(leadIds: string[], reason: string): Promise<void> {
  await assertCanDelete()   // (REG-607)
  if (leadIds.length === 0) return
  await db.update(leads)
    .set({ deletedAt: new Date(), deleteReason: reason, stageBeforeDelete: sql`stage` })
    .where(and(inArray(leads.id, leadIds), isNull(leads.deletedAt)))
  revalidateEveryLead()   // (REG-286) a bulk op touches many leads: one layout revalidate beats a path per lead per tab
}

/** Bulk restore — returns how many leads were actually still in the trash. */
export async function restoreLeads(leadIds: string[]): Promise<number> {
  if (leadIds.length === 0) return 0
  const res = await db.update(leads)
    .set({ deletedAt: null, deleteReason: null, stage: sql`coalesce(stage_before_delete, stage)`, stageBeforeDelete: null })
    .where(and(inArray(leads.id, leadIds), isNotNull(leads.deletedAt)))
  revalidateEveryLead()   // (REG-286)
  return res.rowsAffected
}

/** Permanent removal (Deleted Leads → Delete Forever / Empty Trash).
 *  Resolves the target set SERVER-SIDE to leads still in the trash, so a stale
 *  client snapshot (Undo/Restore raced, another tab) can never purge a live lead. */
export async function deleteForever(leadIds: string[]): Promise<void> {
  await assertCanDelete()   // (REG-607)
  if (leadIds.length === 0) return
  const { leadTasks, leadAssignees: la, stageLogs, quoteComparisons } = await import('@/lib/db/schema')
  await db.transaction(async (tx) => {
    const gone = await tx.select({ id: leads.id }).from(leads)
      .where(and(inArray(leads.id, leadIds), isNotNull(leads.deletedAt)))
    const ids = gone.map((g) => g.id)
    if (ids.length === 0) return
    await tx.delete(leadTasks).where(inArray(leadTasks.leadId, ids))
    await tx.delete(la).where(inArray(la.leadId, ids))
    await tx.delete(stageLogs).where(inArray(stageLogs.leadId, ids))
    await tx.delete(quoteComparisons).where(inArray(quoteComparisons.leadId, ids))   // (REG-641, X-Ray parity Q-21) a lead gone for good takes its readings
    await tx.delete(leads).where(inArray(leads.id, ids))
  })
  revalidateEveryLead()   // (REG-286)
}

export async function emptyTrash(): Promise<void> {
  await assertCanDelete()   // (REG-607)
  const gone = await db.select({ id: leads.id }).from(leads).where(isNotNull(leads.deletedAt))
  await deleteForever(gone.map((g) => g.id))
}

export type ImportDestination = 'listing' | 'review'
type ImportPayloadInput = { fileName: string; headers: string[]; mapping: (string | null)[]; rows: string[][]; destination?: ImportDestination }

/** Import wizard step 3 → 4: persists the batch + every row into the review
 *  queue (M8). Rows without a Lead Name are skipped; phone/email matches
 *  against live leads (or earlier rows in the file) are flagged as duplicates. */
export async function importLeads(input: ImportPayloadInput): Promise<{
  importId: string; total: number; imported: number; skipped: number; duplicates: number
  destination: ImportDestination; approved: number; flagged: number
}> {
  const { imports, importRows } = await import('@/lib/db/schema')
  const existing = await db.select({ id: leads.id, phone: leads.phone, email: leads.email }).from(leads).where(isNull(leads.deletedAt))
  const byPhone = new Map<string, string>()
  const byEmail = new Map<string, string>()
  for (const l of existing) {
    if (l.phone) byPhone.set(phoneDigits(l.phone), l.id)
    if (l.email) byEmail.set(l.email.trim().toLowerCase(), l.id)
  }
  const importId = randomUUID()
  const now = new Date()
  const rowsOut: { id: string; importId: string; data: Record<string, string>; status: string; duplicateOfLeadId: string | null; matchedOn: string | null }[] = []
  let skipped = 0, duplicates = 0
  const seenPhone = new Set<string>(), seenEmail = new Set<string>()
  // Rows already waiting for review count as seen, so a re-import is flagged instead of queued twice.
  const queued = await db.select({ data: importRows.data }).from(importRows).where(inArray(importRows.status, ['pending', 'duplicate']))
  for (const qd of queued) {
    const d = qd.data as Record<string, string>
    const p = phoneDigits(d['Lead Phone Number'] ?? ''); if (p) seenPhone.add(p)
    const e = (d['Lead Email'] ?? '').trim().toLowerCase(); if (e) seenEmail.add(e)
  }
  for (const raw of input.rows) {
    const rec: Record<string, string> = {}
    input.mapping.forEach((f, i) => { if (f && f !== 'Ignore') rec[f] = (raw[i] ?? '').trim() })
    const name = rec['Lead Name'] ?? ''
    if (!name) {
      skipped++
      rowsOut.push({ id: randomUUID(), importId, data: { ...rec, __reason: 'Missing Lead Name' }, status: 'skipped', duplicateOfLeadId: null, matchedOn: null })
      continue
    }
    const phone = phoneDigits(rec['Lead Phone Number'] ?? '')
    if (rec['Lead Phone Number'] !== undefined) rec['Lead Phone Number'] = phone
    const email = (rec['Lead Email'] ?? '').toLowerCase()
    let dupOf: string | null = null, matchedOn: string | null = null
    if (phone && (byPhone.has(phone) || seenPhone.has(phone))) { dupOf = byPhone.get(phone) ?? null; matchedOn = 'phone' }
    else if (email && (byEmail.has(email) || seenEmail.has(email))) { dupOf = byEmail.get(email) ?? null; matchedOn = 'email' }
    if (phone) seenPhone.add(phone)
    if (email) seenEmail.add(email)
    if (matchedOn) duplicates++
    rowsOut.push({ id: randomUUID(), importId, data: rec, status: matchedOn ? 'duplicate' : 'pending', duplicateOfLeadId: dupOf, matchedOn })
  }
  const total = input.rows.length
  const imported = total - skipped
  // One transaction, chunked rows (500 × 6 params ≪ SQLite's 32,766 cap): no orphan batch on failure.
  await db.transaction(async (tx) => {
    await tx.insert(imports).values({
      id: importId, fileName: input.fileName, totalRows: total, importedRows: imported, skippedRows: skipped,
      errorNote: skipped ? `${skipped} error${skipped === 1 ? '' : 's'} detected across ${skipped} skipped lead${skipped === 1 ? '' : 's'}` : null,
      createdAt: now,
    })
    const CHUNK = 500
    for (let i = 0; i < rowsOut.length; i += CHUNK) {
      await tx.insert(importRows).values(rowsOut.slice(i, i + CHUNK))
    }
  })
  // "Add to my lead listing": clean rows go straight in as leads; duplicates stay in the review queue.
  const destination: ImportDestination = input.destination ?? 'review'
  let approved = 0, flagged = 0
  if (destination === 'listing') {
    const pending = await db.select({ id: importRows.id }).from(importRows).where(and(eq(importRows.importId, importId), eq(importRows.status, 'pending')))
    const res = await approveImportRows(pending.map((r) => r.id))
    approved = res.approved; flagged = res.flagged
  }
  revalidateLeadListings()   // (REG-286) Qanvast Ops lists imported Qanvast leads too
  revalidatePath('/leads/imports')
  return { importId, total, imported, skipped, duplicates, destination, approved, flagged }
}

/* ---------- Review imported leads (M8) ---------- */

/** Imported row → lead columns; enum values outside the mock vocab fall back to 'Others' / 'New'. */
async function leadFromImport(data: Record<string, string>) {
  const { PROPERTY_TYPES, ALL_STAGES, KEY_COLLECTION_OPTIONS } = await import('@/lib/leads/enums')
  const pick = (v: string | undefined, list: readonly string[], fallback: string) => {
    const hit = list.find((x) => x.toLowerCase() === (v ?? '').trim().toLowerCase())
    return hit ?? fallback
  }
  const now = new Date()
  return {
    name: titleCaseName(data['Lead Name'] ?? ''),   // (REG-329) imported in any case, saved as "Farah Ahmad"
    phone: phoneDigits(data['Lead Phone Number'] ?? ''),
    email: (data['Lead Email'] ?? '').trim() || null,
    source: pick(data['Lead Source'], (await fetchLeadSources()).sources.map((s) => s.name), 'Others'),   // (REG-599) the studio's list, retired names included so an old export still maps
    stage: pick(data['Lead Stage'], ALL_STAGES, 'New'),   // the full vocabulary: STAGES is active-only, so an imported 'On Hold' / 'Lost' row landed silently in New
    propertyType: pick(data['Property Type'], PROPERTY_TYPES, 'Others'),
    propertyAddress: (data['Property Address'] ?? '').trim() || null,
    leadAddress: (data['Lead Address'] ?? '').trim() || null,
    budgetMinor: Number(digitsOnly(data['Estimated Budget (S$)'] ?? '') || 0) * 100,
    // (REG-287) The STRICT shared parser. The `parseDMY` copy that stood here accepted 32/13/2026 and rolled it into
    // a real Date, so a CSV could put a date on a lead that no field in the UI would ever have taken.
    estimatedStartDate: parseInputDate(data['Estimated Start Date']),
    style: (data['Style'] ?? '').trim() || null,
    // (REG-607) The key-collection vocabulary is 1.0's five since the parity round; an old sheet's "Not yet collected" reads as "Later".
    keyCollection: (() => { const raw = (data['Key Collection'] ?? '').trim(); if (!raw) return null; if (/^not yet/i.test(raw)) return 'Later'; return KEY_COLLECTION_OPTIONS.find((k) => k.toLowerCase() === raw.toLowerCase()) ?? raw })(),
    condition: (data['Condition'] ?? '').trim() || null,
    areaSqft: Number(digitsOnly(data['Area Size'] ?? '')) || null,
    notes: (data['Remarks'] ?? '').trim() || null,   // the import vocabulary's Remarks (REG-266); the DB column stays `notes`
    area: pick(data['District'], DISTRICTS, '') || null,   // (REG-607) 1.0's Area / District
    createdAt: now, updatedAt: now,
  }
}

/** Approve → real leads (also used by 'Keep Both', which approves a 'duplicate' row deliberately).
 *  Pending rows are RE-MATCHED against live leads at approval time: a lead created since the
 *  import (or by an earlier row in this batch) turns the row into a duplicate instead of a twin. */
export async function approveImportRows(rowIds: string[]): Promise<{ approved: number; flagged: number }> {
  if (rowIds.length === 0) return { approved: 0, flagged: 0 }
  const arrivals: { id: string; name: string; source: string }[] = []   /* (REG-604) */
  const { importRows } = await import('@/lib/db/schema')
  let approved = 0, flagged = 0
  await db.transaction(async (tx) => {
    const rows = await tx.select().from(importRows)
      .where(and(inArray(importRows.id, rowIds), inArray(importRows.status, ['pending', 'duplicate'])))
    const live = await tx.select({ id: leads.id, phone: leads.phone, email: leads.email }).from(leads).where(isNull(leads.deletedAt))
    const byPhone = new Map<string, string>(), byEmail = new Map<string, string>()
    for (const l of live) {
      if (l.phone) byPhone.set(phoneDigits(l.phone), l.id)
      if (l.email) byEmail.set(l.email.trim().toLowerCase(), l.id)
    }
    for (const r of rows) {
      const cols = await leadFromImport(r.data as Record<string, string>)
      if (!cols.name) continue
      if (r.status === 'pending') {
        const hitPhone = cols.phone ? byPhone.get(cols.phone) : undefined
        const hitEmail = cols.email ? byEmail.get(cols.email.toLowerCase()) : undefined
        if (hitPhone || hitEmail) {
          await tx.update(importRows)
            .set({ status: 'duplicate', duplicateOfLeadId: hitPhone ?? hitEmail ?? null, matchedOn: hitPhone ? 'phone' : 'email' })
            .where(eq(importRows.id, r.id))
          flagged++
          continue
        }
      }
      const id = randomUUID()
      await tx.insert(leads).values({ id, ...cols })
      arrivals.push({ id, name: cols.name, source: cols.source })
      if (cols.phone) byPhone.set(cols.phone, id)
      if (cols.email) byEmail.set(cols.email.toLowerCase(), id)
      await tx.update(importRows).set({ status: 'approved' }).where(eq(importRows.id, r.id))
      approved++
    }
  })
  /* (REG-604) Every lead that just arrived through an import or the capture reaches the Owners and Admins. */
  if (arrivals.length) { const runners = await studioRunnerIds(); for (const a of arrivals.slice(0, 20)) await notify('new_lead', runners, { title: `New lead: ${titleCaseName(a.name)}`, body: a.source, href: `/leads/${a.id}`, leadId: a.id, actorId: null }) }
  revalidateLeadListings()   // (REG-286)
  return { approved, flagged }
}

export async function rejectImportRows(rowIds: string[]): Promise<number> {
  if (rowIds.length === 0) return 0
  const { importRows } = await import('@/lib/db/schema')
  const res = await db.update(importRows).set({ status: 'rejected' })
    .where(and(inArray(importRows.id, rowIds), inArray(importRows.status, ['pending', 'duplicate'])))
  revalidateLeadListings()   // (REG-286)
  return res.rowsAffected
}

/** Merge a duplicate into its existing lead: fields where the reviewer picked 'new' overwrite the existing lead. */
export async function mergeImportRow(rowId: string, picks: Record<string, 'existing' | 'new'>): Promise<boolean> {
  const { importRows } = await import('@/lib/db/schema')
  const [row] = await db.select().from(importRows).where(eq(importRows.id, rowId)).limit(1)
  if (!row || !row.duplicateOfLeadId || !['pending', 'duplicate'].includes(row.status)) return false
  // Server-side re-validation: never merge into a trashed lead (client snapshot may be stale).
  const [existing] = await db.select().from(leads).where(and(eq(leads.id, row.duplicateOfLeadId), isNull(leads.deletedAt))).limit(1)
  if (!existing) return false
  const incoming = await leadFromImport(row.data as Record<string, string>)
  const patch: Record<string, unknown> = {}
  const map: Record<string, keyof typeof incoming> = {
    'Lead name': 'name', Phone: 'phone', Email: 'email', 'Budget (S$)': 'budgetMinor',
    Source: 'source', 'Property type': 'propertyType', Address: 'propertyAddress',
    /* (REG-609, parity I-04) the rest of the mapped fields — the review sheet's merge table lists them all */
    District: 'area', 'Lead address': 'leadAddress', Condition: 'condition', Style: 'style', 'Area size': 'areaSqft',
    'Key collection': 'keyCollection', 'Start date': 'estimatedStartDate', Remarks: 'notes',
  }
  const empty = (v: unknown) => v === '' || v === null || v === undefined || v === 0
  for (const [label, choice] of Object.entries(picks)) {
    const key = map[label]
    if (!key || choice !== 'new' || key === 'notes') continue   // Remarks are appended below, never swapped
    const v = incoming[key]
    // An empty incoming value never overwrites a real one.
    if (empty(v)) continue
    patch[key] = v
  }
  /* (REG-609, parity I-04) 1.0's merge fills every field the original lacks from the duplicate; the radios only settle the
     ones both sides carry. The sheet's Merged result column shows the same rule (existing, else new). */
  for (const key of Object.values(map)) {
    if (key === 'notes' || key in patch) continue
    const v = incoming[key]
    if (empty(v) || !empty((existing as Record<string, unknown>)[key])) continue
    patch[key] = v
  }
  // The mock promises the other phone is "kept as alt": keep it (and any import notes) in Notes.
  const keptPhone = picks.Phone === 'new' && incoming.phone ? incoming.phone : existing.phone
  const altPhone = keptPhone === existing.phone ? incoming.phone : existing.phone
  const noteBits: string[] = []
  if (altPhone && keptPhone && altPhone !== keptPhone) noteBits.push(`Alt phone: ${altPhone}`)
  if (incoming.notes && incoming.notes !== existing.notes) noteBits.push(incoming.notes)
  if (noteBits.length) patch.notes = [existing.notes, ...noteBits].filter(Boolean).join('\n')
  await db.transaction(async (tx) => {
    if (Object.keys(patch).length) await tx.update(leads).set({ ...patch, updatedAt: new Date() }).where(eq(leads.id, existing.id))
    await tx.update(importRows).set({ status: 'merged' }).where(eq(importRows.id, rowId))
  })
  revalidateLead(existing.id)
  return true
}

/** Flexible stage movement (and linear moves backwards / out of On Hold): the lead moves at once; no details are captured. */
export async function quickMoveStage(input: { leadId: string; fromStage: string; toStage: string }): Promise<{ logId: string }> {
  assertStage(input.fromStage, input.toStage)   // (REG-286)
  const { leads, stageLogs } = await import('@/lib/db/schema')
  const { randomUUID: uuid } = await import('node:crypto')
  const now = new Date()
  const logId = uuid()
  // (REG-286) Atomic, like moveStage: the stage and the log that lets Undo take it back are one fact — half of it
  // is a lead that moved with no way home.
  await db.transaction(async (tx) => {
    await tx.update(leads).set({ stage: input.toStage, updatedAt: now }).where(eq(leads.id, input.leadId))
    await tx.insert(stageLogs).values({
      id: logId, leadId: input.leadId, fromStage: input.fromStage, toStage: input.toStage,
      payload: { quick: true }, createdAt: now,
    })
  })
  await notifyStageChange(input.leadId, input.fromStage, input.toStage, null)   /* (REG-608) */
  revalidateLead(input.leadId)
  return { logId }
}

/** Snackbar Undo for a quick move: the lead returns to where it was and the move leaves no trace in its journey. */
export async function undoStageMove(input: { leadId: string; logId: string; toStage: string }): Promise<void> {
  assertStage(input.toStage)   // (REG-286)
  const { leads, stageLogs, notifications } = await import('@/lib/db/schema')
  await db.transaction(async (tx) => {   // (REG-286) both halves of the undo, or neither
    const [log] = await tx.select({ createdAt: stageLogs.createdAt }).from(stageLogs).where(eq(stageLogs.id, input.logId)).limit(1)
    await tx.update(leads).set({ stage: input.toStage, updatedAt: new Date() }).where(eq(leads.id, input.leadId))
    await tx.delete(stageLogs).where(eq(stageLogs.id, input.logId))
    /* (REG-608) The move's "stage changed" rows go with its log — an undone move never happened, so nobody should read that it did. */
    if (log) await tx.delete(notifications).where(and(eq(notifications.kind, 'stage_changed'), eq(notifications.leadId, input.leadId), gte(notifications.createdAt, log.createdAt)))
  })
  revalidateLead(input.leadId)
}

/** Corrections to a completed stage (Move stage window, linear movement): the stage's latest log takes the new details. */
export async function updateStageDetails(input: { leadId: string; stage: string; data: unknown }): Promise<void> {
  assertStage(input.stage)   // (REG-286)
  const { stageLogs } = await import('@/lib/db/schema')
  const { randomUUID: uuid } = await import('node:crypto')
  const { desc } = await import('drizzle-orm')
  const [latest] = await db.select({ id: stageLogs.id }).from(stageLogs)
    .where(and(eq(stageLogs.leadId, input.leadId), eq(stageLogs.toStage, input.stage)))
    .orderBy(desc(stageLogs.createdAt)).limit(1)
  if (input.stage === 'Won') await recordWonUpload(input.leadId, input.data, new Date())   // (REG-632, contracts parity Q-14)
  if (latest) {
    await db.update(stageLogs).set({ payload: input.data as object }).where(eq(stageLogs.id, latest.id))
  } else {
    // A stage the lead reached before any log existed (seeded data): record the details against it.
    await db.insert(stageLogs).values({
      id: uuid(), leadId: input.leadId, fromStage: input.stage, toStage: input.stage,
      payload: input.data as object, createdAt: new Date(),
    })
  }
  revalidateLead(input.leadId)
}

/** The left band marks a lead nobody has opened or clicked yet (user 2026-08-29); the first interaction clears it. */
export async function markLeadSeen(leadId: string): Promise<void> {
  const { leads } = await import('@/lib/db/schema')
  await db.update(leads).set({ seenAt: new Date() }).where(and(eq(leads.id, leadId), isNull(leads.seenAt)))
  revalidatePath('/leads')
}

/** Maison AI › "Reset prototype": every table back to fixtures/baseline.json (user 2026-08-29). */
export async function resetPrototype(): Promise<{ rows: number }> {
  const { restoreBaseline } = await import('@/lib/db/baseline')
  const r = await restoreBaseline()
  // (REG-286) Every table changed, so every cached page is wrong — including the lead detail routes, which the old
  // three paths never named and `staleTimes.dynamic = 300` then served for five minutes after a reset.
  revalidatePath('/', 'layout')
  return { rows: r.rows }
}
