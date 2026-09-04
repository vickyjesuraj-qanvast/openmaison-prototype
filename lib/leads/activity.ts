import 'server-only'   // (REG-286) libSQL must never reach the browser bundle: every client import of this module is `import type`
import { asc, eq, inArray } from 'drizzle-orm'
import { db } from '@/lib/db'
import { contracts, fileComments, leadAssignees, leadFiles, leadNotes, leadReturns, leadTasks, leads, members, questions, quotes, stageLogs, taskComments, type Member } from '@/lib/db/schema'
import { SESSION_MEMBER_ID } from '@/lib/db/session'
import { isWizardPayload } from '@/lib/leads/stage-data'
import { parseInputDateTime } from '@/lib/format'

/* Lead Details › Activity (931-47975) — the feed is derived from every table that carries a timestamp for the lead.
   There is no event log: each row is what the record's own dates say happened (created / updated / completed / answered), so the
   sentences are the prototype's (REG-191) — the mock shows one task sentence with actors "James" and "System". */

export type ActivityEvent = {
  id: string
  at: Date
  /** Material icon for the row glyph (the mock draws "ballot" for task events; the others follow the tab icons). */
  icon: string
  text: string
  /** Trailing link ("See Task" in the mock) — label + href; absent when nothing to open. */
  link?: { label: string; href: string }
  /** "You" · a member's name · "System". */
  actor: string
}

export type LeadActivityData = { events: ActivityEvent[]; now: number }

/**
 * (REG-286) The signed-in member, defined once in lib/db/session.ts. It shapes the SENTENCES below, not just a
 * stamp: `who()` prints "You" for this id and the member's name for anyone else, so the read side and the five
 * action modules that write `creatorId` / `authorId` / `returnedById` have to agree on who "you" is.
 */
const ME = SESSION_MEMBER_ID

export async function fetchLeadActivity(leadId: string): Promise<LeadActivityData> {
  const [lead] = await db.select().from(leads).where(eq(leads.id, leadId))
  if (!lead) return { events: [], now: Date.now() }
  const [team, logs, tasks, qs, cs, files, notes, qns, rets, assigned] = await Promise.all([
    db.select().from(members),
    db.select().from(stageLogs).where(eq(stageLogs.leadId, leadId)).orderBy(asc(stageLogs.createdAt)),
    db.select().from(leadTasks).where(eq(leadTasks.leadId, leadId)),
    db.select().from(quotes).where(eq(quotes.leadId, leadId)),
    db.select().from(contracts).where(eq(contracts.leadId, leadId)),
    db.select().from(leadFiles).where(eq(leadFiles.leadId, leadId)),
    db.select().from(leadNotes).where(eq(leadNotes.leadId, leadId)),
    db.select().from(questions).where(eq(questions.leadId, leadId)),
    db.select().from(leadReturns).where(eq(leadReturns.leadId, leadId)),
    db.select().from(leadAssignees).where(eq(leadAssignees.leadId, leadId)),
  ])
  const taskIds = tasks.map((t) => t.id), fileIds = files.map((f) => f.id)
  const [tComments, fComments] = await Promise.all([
    taskIds.length ? db.select().from(taskComments).where(inArray(taskComments.taskId, taskIds)) : Promise.resolve([]),
    fileIds.length ? db.select().from(fileComments).where(inArray(fileComments.fileId, fileIds)) : Promise.resolve([]),
  ])
  const byMember = new Map(team.map((m) => [m.id, m]))
  const who = (id: string | null | undefined): string => (!id ? 'System' : id === ME ? 'You' : byMember.get(id)?.name ?? 'System')
  const base = `/leads/${leadId}`
  const ev: ActivityEvent[] = []
  const push = (e: Omit<ActivityEvent, 'id'> & { id: string }) => ev.push(e)
  const q = (s: string) => `“${s}”`

  // Lead — Qanvast leads come from the system, the rest from you (the overview card's "Lead created from <source>"); an
  // imported lead keeps the sheet's own source (Facebook, Others, …), so it reads as yours too.
  push({ id: `lead-${lead.id}`, at: lead.createdAt, icon: 'person', text: `Lead created from ${lead.source}.`, link: { label: 'See Overview', href: base }, actor: lead.source === 'Qanvast' ? 'System' : 'You' })
  const overview = { label: 'See Overview', href: base }
  // (REG-335, user 2026-09-04: "the activity include the member assigned") Every member on the lead, from the row's own stamp;
  // rows older than the column read as assigned when the lead was created. A removal leaves no row, so it cannot appear.
  for (const a of assigned) push({ id: `assign-${a.id}`, at: a.assignedAt ?? lead.createdAt, icon: 'person_add', text: `You assigned ${a.memberId === ME ? 'yourself' : who(a.memberId)} to this lead.`, link: overview, actor: 'You' })
  // The Lost move on a return is returnLead's own side effect, named by `leadReturns.stageLogId` (seeded returns carry only the
  // payload reason) — "You marked the lead as lost." claimed a move nobody made, next to the return row that already tells it.
  const returnLogIds = new Set(rets.map((r) => r.stageLogId).filter((id): id is string => !!id))
  const isReturnLog = (log: (typeof logs)[number]) =>
    returnLogIds.has(log.id) || (!!log.payload && typeof log.payload === 'object' && (log.payload as { reason?: unknown }).reason === 'Lead returned to Qanvast')
  for (const log of logs) {
    if (isReturnLog(log)) continue
    // fromStage === toStage is updateStageDetails recording a stage the lead reached before any log existed — a correction, not a move.
    const text = log.fromStage === log.toStage ? (log.toStage === 'Contacted' ? 'You updated the contact log.' : `You updated the ${log.toStage} details.`)
      : log.toStage === 'On Hold' ? 'You put the lead on hold.'
      : log.toStage === 'Lost' ? 'You marked the lead as lost.'
      : `You moved the lead from ${log.fromStage} to ${log.toStage}.`
    push({ id: `stage-${log.id}`, at: log.createdAt, icon: 'swap_horiz', text, link: overview, actor: 'You' })
    // Add Log rewrites the stage's row in place (updateStageDetails), so later contact / meeting logs live only inside the payload:
    // every log past the first (the row above already stands for it) gets its own row, dated by the log's own "when".
    if (!isWizardPayload(log.payload)) continue
    const entries: { when: string; text: string }[] = log.toStage === 'Contacted'
      ? log.payload.logs.slice(1).map((l) => ({ when: l.when, text: `You added a contact log${l.channel ? ` via ${l.channel}` : ''}.` }))
      : log.toStage === 'Met' && Array.isArray(log.payload.meetings) ? log.payload.meetings.slice(1).map((m) => ({ when: m.when, text: 'You added a meeting log.' }))
      : []
    entries.forEach((e, i) => push({ id: `stage-${log.id}-log-${i + 1}`, at: parseInputDateTime(e.when) ?? log.createdAt, icon: 'swap_horiz', text: e.text, link: overview, actor: 'You' }))
  }
  for (const r of rets) push({ id: `ret-${r.id}`, at: r.returnedAt, icon: 'undo', text: `${who(r.returnedById)} returned the lead to Qanvast${r.reason ? ` (${r.reason})` : ''}.`, link: { label: 'See Overview', href: base }, actor: who(r.returnedById) })

  // Tasks (the mock's "ballot" rows) — created by whoever the record names, then updated / completed when its dates say so.
  // The record keeps no history of what changed (updatedAt is bumped by every edit, assignment and tag change), so the update row
  // is the plain sentence unless the task is done — and it is yours: every write in the prototype is by the signed-in member.
  for (const t of tasks) {
    const creator = who(t.creatorId)
    const link = { label: 'See Task', href: `${base}/tasks?open=${t.id}` }
    push({ id: `task-${t.id}`, at: t.createdAt, icon: 'ballot', text: `${creator} created the task ${q(t.title)}.`, link, actor: creator })
    if (t.updatedAt && t.updatedAt.getTime() - t.createdAt.getTime() > 60_000) {
      push({ id: `task-u-${t.id}`, at: t.updatedAt, icon: 'ballot', text: t.done ? `You completed the task ${q(t.title)}.` : `You updated the task ${q(t.title)}.`, link, actor: 'You' })
    }
  }
  for (const c of tComments) { const t = tasks.find((x) => x.id === c.taskId); if (t) push({ id: `tc-${c.id}`, at: c.createdAt, icon: 'comment', text: `${who(c.authorId)} commented on the task ${q(t.title)}.`, link: { label: 'See Task', href: `${base}/tasks?open=${t.id}` }, actor: who(c.authorId) }) }

  // Quotes / contracts — created, then each stamped milestone.
  for (const x of qs) {
    const link = { label: 'See Quote', href: `${base}/quotes` }
    push({ id: `quote-${x.id}`, at: x.createdAt, icon: 'docs', text: `You created the quote ${q(x.number)}.`, link, actor: 'You' })
    if (x.sentAt) push({ id: `quote-s-${x.id}`, at: x.sentAt, icon: 'docs', text: `You sent the quote ${q(x.number)}.`, link, actor: 'You' })
    if (x.approvedAt) push({ id: `quote-a-${x.id}`, at: x.approvedAt, icon: 'docs', text: `You approved the quote ${q(x.number)}.`, link, actor: 'You' })   // fixed copy: the status can move on after the stamp
    if (x.deletedAt) push({ id: `quote-d-${x.id}`, at: x.deletedAt, icon: 'docs', text: `You deleted the quote ${q(x.number)}.`, link, actor: 'You' })
  }
  for (const x of cs) {
    const link = { label: 'See Contract', href: `${base}/contracts` }
    push({ id: `contract-${x.id}`, at: x.createdAt, icon: 'description', text: `You created the contract ${q(x.title)}.`, link, actor: 'You' })
    if (x.sentAt) push({ id: `contract-s-${x.id}`, at: x.sentAt, icon: 'description', text: `You sent the contract ${q(x.title)} to the client.`, link, actor: 'You' })
    if (x.signedAt) push({ id: `contract-g-${x.id}`, at: x.signedAt, icon: 'description', text: `You marked the contract ${q(x.title)} as signed.`, link, actor: 'You' })
  }

  // Files, notes, questions, file comments. A trashed file (or anything inside a trashed folder) has no viewer route — its rows
  // point at the Files tab like the trash row does.
  const fileLink = (f: (typeof files)[number]) => f.deletedAt ? { label: 'See Files', href: `${base}/files` }
    : f.kind === 'folder' ? { label: 'See Files', href: `${base}/files?folder=${f.id}` } : { label: 'See File', href: `${base}/files/${f.id}` }
  for (const f of files) {
    const actor = who(f.ownerId)
    // The glyph follows the record's kind (the mock's files were all images, so "image" was written in).
    push({ id: `file-${f.id}`, at: f.createdAt, icon: f.kind === 'folder' ? 'folder' : f.kind === 'pdf' || f.mime === 'application/pdf' ? 'picture_as_pdf' : 'image', text: f.kind === 'folder' ? `${actor} created the folder ${q(f.name)}.` : `${actor} uploaded the file ${q(f.name)}.`, link: fileLink(f), actor })
    if (f.deletedAt) push({ id: `file-d-${f.id}`, at: f.deletedAt, icon: 'delete', text: `${actor} moved ${q(f.name)} to the Trash Folder.`, link: { label: 'See Files', href: `${base}/files` }, actor })
  }
  for (const c of fComments) { const f = files.find((x) => x.id === c.fileId); if (f) push({ id: `fc-${c.id}`, at: c.createdAt, icon: 'comment', text: `${who(c.authorId)} commented on the file ${q(f.name)}.`, link: fileLink(f), actor: who(c.authorId) }) }
  for (const n of notes) {
    const actor = who(n.authorId)
    const link = { label: 'See Note', href: `${base}/notes` }
    push({ id: `note-${n.id}`, at: n.createdAt, icon: n.kind === 'contact' ? 'call_log' : 'sticky_note_2'   /* one mark for a contact log everywhere (REG-278) */, text: n.kind === 'contact' ? `${actor} logged a contact${n.channel ? ` via ${n.channel}` : ''}${n.outcome ? ` — ${n.outcome}` : ''}.` : `${actor} added the note ${q(n.title || 'New')}.`, link, actor })
  }
  for (const x of qns) {
    const link = { label: 'See Questionnaire', href: `${base}/questionnaire` }
    push({ id: `q-${x.id}`, at: x.createdAt, icon: 'help', text: `You added the question ${q(x.text)}.`, link, actor: 'You' })
    if (x.answeredAt) { const actor = x.answeredBy === 'client' ? lead.name : 'You'; push({ id: `q-a-${x.id}`, at: x.answeredAt, icon: 'help', text: `${actor} answered ${q(x.text)}.`, link, actor }) }
  }

  ev.sort((a, b) => b.at.getTime() - a.at.getTime())
  return { events: ev, now: Date.now() }
}

export type { Member }
