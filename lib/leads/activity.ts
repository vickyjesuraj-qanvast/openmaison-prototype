import 'server-only'   // (REG-286) libSQL must never reach the browser bundle: every client import of this module is `import type`
import { and, asc, eq, inArray, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { projectUpdateFiles, projectUpdates, projects as projectRows } from '@/lib/db/schema'   // (fix-C, C-32)
import { questionAnswerHistory } from '@/lib/db/schema'   // (gaps build D, item 9)
import { conversationMessages, conversations, projectMessages } from '@/lib/db/schema'   // (gaps build H, H-Q24) the days of messages · (pending modules S26) the lead's Team conversation
import { projectTickets } from '@/lib/db/schema'   // (simplify round 2, S-22) the client asks' sources, for their lines
import { answerWords } from './question-model'
import { contracts, fileComments, leadAssignees, leadEvents, leadFileRenders, leadFiles, leadNotes, leadReturns, leadTasks, leads, members, projectRooms, questions, quoteComparisons, quoteFiles, quoteItemComments, quoteItems, quotePayments, quoteVersions, quotes, renderAnnotations, renderConsultationRequests, renderJobs, renderShareLinks, stageLogs, taskComments, type Member } from '@/lib/db/schema'
import { descriptor } from '@/lib/visualizer/model'
import { parseComments, parseSnapshot, parseVariants } from '@/lib/visualizer/queries'
import { SHARE_DAYS } from '@/lib/visualizer/policy'
import { presetLabel, presetOf } from '@/lib/quotes/payments'
import { SESSION_MEMBER_ID, withYou } from '@/lib/db/session'
import { isWizardPayload } from '@/lib/leads/stage-data'
import { displayDate, displayDateTimeDot, maskNric, parseInputDateTime, phoneLocal } from '@/lib/format'
import { titleCaseName } from '@/lib/format'   // (fix-B, B-40)
import { fieldWords, listWords } from '@/lib/projects/schedule-model'   // (fix-B, B-40) a milestone save's fields in the house voice
import { contractLine } from '@/lib/projects/choices-model'   // (REG-1068) a pick's change to the contract, GST included
import type { LeadEventDetail } from '@/lib/leads/events'
import { projectTabHref } from '@/lib/projects/tabs'
import { openPhrase } from '@/lib/projects/handover-model'   // (fix-E, E-03)
import { projects } from '@/lib/db/schema'   // (fix-E, E-06) the projects still on record, for the links
import { STARTER_FOLDERS, fileGlyph } from '@/lib/leads/file-model'   // (gaps build E, items 1 · 4)
import { hiddenMoneyFiles, isMoneyEventKind, seesLeadMoney } from '@/lib/projects/money-visibility'   // (fix-D, D-04)
import { fetchViewer as viewerForBooks } from '@/lib/leads/visibility'   // (gaps build F2 — F2-Q8)
import { runsStudio as runsBooks } from '@/lib/leads/assign-policy'   // (gaps build F2 — F2-Q8)

/** (REG-903, PDPA) An edit line shows the NRIC / FIN masked (•••••567A) — older lines in the log kept the full number. */
const shownField = (key: string, v: string) => ((key === 'icNumber' || key === 'client2Nric') && v !== '—' ? maskNric(v) : (key === 'phone' || key === 'client2Phone') && /^\d{8}$/.test(v) ? phoneLocal(v) : v)   // (pending modules S05) the second client's too · (S42 B-07) a phone grouped, older lines too

/** (UX audit 2026-09-30, T10) "Sarah assigned Kevin and Hui Min to the task “X”." — who joined, who left, in one sentence. */
function assignedLine(actor: string, d: LeadEventDetail): string {
  const names = (list: string[] | undefined) => { const l = list ?? []; return l.length <= 1 ? l.join('') : `${l.slice(0, -1).join(', ')} and ${l[l.length - 1]}` }
  const task = `“${d.title ?? ''}”`
  const on = names(d.names), off = names(d.removed)
  if (on && off) return `${actor} assigned ${on} to the task ${task} and took ${off} off it.`
  if (on) return `${actor} assigned ${on} to the task ${task}.`
  return `${actor} took ${off || 'a member'} off the task ${task}.`
}

/** (fix-A, A-36) A project's field changes in words: "set the start date to 23 Oct ’26", "cleared the target end date", "changed the agreed
    value from S$48,600.00 to S$60,000.00" — never "Start date: — → 23 Oct ’26". */
function projectEdits(fields: { label: string; from: string; to: string }[]): string {
  const one = (f: { label: string; from: string; to: string }) => {
    const what = `the ${f.label.charAt(0).toLowerCase()}${f.label.slice(1)}`
    return f.from === '—' ? `set ${what} to ${f.to}` : f.to === '—' ? `cleared ${what}` : `changed ${what} from ${f.from} to ${f.to}`
  }
  const parts = fields.map(one)
  return parts.length ? (parts.length === 1 ? parts[0]! : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`) : 'updated the project'
}

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
  /** (audit 2026-09-26, round 3) A record's creation — at the same second as something done to it (a quote and its first items), it reads as
      the older of the two, so the feed never says the items came before the quote. */
  origin?: boolean
  /** (UX audit 2026-09-30, T10) Which of the tab's chips keeps the line — the rest show under All only. */
  group?: ActivityGroup
  /** (Projects round 8) A small summary card under the line — the client's pick: the option's picture (or colour), what was chosen, its
      price against the quote and the note (1.0 filed a PDF "Selection Receipt" per answer, H-164). */
  card?: { src: string | null; hex: string | null; title: string; lines: string[] }
  /** (simplify round 2 — each fact once) a line another line already says under All: a task or a variation order made from a client's ask —
      the ask's own line names it there; this one keeps its chip (Tasks · Money) */
  twin?: boolean
}
/** (T10) The chips above the timeline: All · Tasks · Files · Notes · Stage. */
export type ActivityGroup = 'tasks' | 'files' | 'notes' | 'stage'
  | 'schedule' | 'updates' | 'money' | 'choices'   // (fix-A, A-16 · C-20) a project's own lines, for the project's chips
  | 'floorplan'   // (gaps build G) the floor plan's lines
  | 'tickets' | 'messages'   // (gaps build H, H-Q24) tickets' lines and the days of messages
  | 'compliance'   // (gaps build I) the compliance checklist's lines
  | 'layouts'   // (gaps build J, J-Q17) the 3D Space Planner's lines

export type LeadActivityData = { events: ActivityEvent[]; now: number }

/**
 * (REG-286) The signed-in member, defined once in lib/db/session.ts. It shapes the SENTENCES below, not just a
 * stamp: `who()` prints "You" for this id and the member's name for anyone else, so the read side and the five
 * action modules that write `creatorId` / `authorId` / `returnedById` have to agree on who "you" is.
 */

/**
 * `projectId` (REG-913, Projects round 1): the feed read on the project's page — the same lines (one record, two chapters), with every link to
 * a tab the project carries on (Overview · Tasks · Files · Activity, lib/projects/tabs.ts) pointed at the project's own address, so the reader
 * stays on the project; a link to a tab only the lead has (Quotes, Contracts, Notes, Questionnaire) still opens the lead's.
 */
export async function fetchLeadActivity(leadId: string, opts: { projectId?: string | null } = {}): Promise<LeadActivityData> {
  const [lead] = await db.select().from(leads).where(eq(leads.id, leadId))
  if (!lead) return { events: [], now: Date.now() }
  const [team, logs, tasks, qs, cs, files, notes, qns, rets, assigned, cmps, events] = await Promise.all([
    db.select().from(members).then(withYou),
    db.select().from(stageLogs).where(eq(stageLogs.leadId, leadId)).orderBy(asc(stageLogs.createdAt)),
    db.select().from(leadTasks).where(eq(leadTasks.leadId, leadId)),
    db.select().from(quotes).where(eq(quotes.leadId, leadId)),
    db.select().from(contracts).where(eq(contracts.leadId, leadId)),
    db.select().from(leadFiles).where(eq(leadFiles.leadId, leadId)),
    db.select().from(leadNotes).where(eq(leadNotes.leadId, leadId)),
    db.select().from(questions).where(eq(questions.leadId, leadId)),
    db.select().from(leadReturns).where(eq(leadReturns.leadId, leadId)),
    db.select().from(leadAssignees).where(eq(leadAssignees.leadId, leadId)),
    db.select().from(quoteComparisons).where(eq(quoteComparisons.leadId, leadId)),   // (REG-529) Quote X-Ray
    db.select().from(leadEvents).where(eq(leadEvents.leadId, leadId)),   // (REG-613) the event log — what leaves no row
  ])
  /* (fix-D, D-04 · G-01 — F-17) a viewer refused the project's money reads none of it here either: no payment, invoice or variation order line, and
     no line for a file in Files › Payments (the client's bank proof, the receipts) */
  const moneyHidden = await hiddenMoneyFiles(leadId)
  const seesMoney = moneyHidden.size === 0 && await seesLeadMoney(leadId)
  if (!seesMoney) {
    for (let i = events.length - 1; i >= 0; i--) if (isMoneyEventKind(events[i]!.kind)) events.splice(i, 1)
    for (let i = qs.length - 1; i >= 0; i--) if (qs[i]!.kind === 'variation') qs.splice(i, 1)
    for (let i = files.length - 1; i >= 0; i--) if (moneyHidden.has(files[i]!.id)) files.splice(i, 1)
  }
  /* (gaps build F2 — F2-Q8) commission is the member's own: anyone but an Owner or an Admin reads only the lines about themselves */
  if (events.some((x) => x.kind.startsWith('project_commission_'))) {
    const me = await viewerForBooks()
    if (!runsBooks(me.role)) for (let i = events.length - 1; i >= 0; i--) if (events[i]!.kind.startsWith('project_commission_') && (events[i]!.detail as { memberId?: string } | null)?.memberId !== me.id) events.splice(i, 1)
  }
  /* (simplify S-06, the owner's "build everything" 2026-10-09) A compliance item and its starter task are one record with one tick — whichever
     was ticked, the other follows in the same press (app/projects/compliance-actions.ts `syncTask` · lib/compliance/sync.ts). ONE line says it:
     the item's ("marked … done on the compliance checklist", which opens the checklist); the task's twin from that press — its logged
     completed / reopened line, or the line its row would give — is folded into it. A task ticked on its own, any other time, keeps its line. */
  const itemOfTask = new Map(tasks.filter((t) => !!t.complianceItem).map((t) => [t.id, t.complianceItem!]))
  const answeredAt = new Map<string, number[]>()
  for (const e of events) {
    if (e.kind !== 'project_compliance_done' && e.kind !== 'project_compliance_not_needed' && e.kind !== 'project_compliance_reopened') continue
    const item = (e.detail as { item?: string } | null)?.item
    if (item) answeredAt.set(item, [...(answeredAt.get(item) ?? []), e.at.getTime()])
  }
  const complianceTwin = (taskId: string | undefined, at: number, within: number) => {
    const item = taskId ? itemOfTask.get(taskId) : undefined
    return !!item && (answeredAt.get(item) ?? []).some((t) => Math.abs(t - at) <= within)
  }
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i]!
    if ((e.kind === 'task_completed' || e.kind === 'task_reopened') && complianceTwin((e.detail as { id?: string } | null)?.id, e.at.getTime(), 5_000)) events.splice(i, 1)
  }
  /* (REG-675, AI Visualizer Q-34) the lead's design: its rooms, renders, what went to the client and what came back */
  const [vRooms, vJobs, vShares] = await Promise.all([
    db.select().from(projectRooms).where(eq(projectRooms.leadId, leadId)),
    db.select().from(renderJobs).where(eq(renderJobs.leadId, leadId)).orderBy(asc(renderJobs.createdAt)),
    db.select().from(renderShareLinks).where(eq(renderShareLinks.leadId, leadId)),
  ])
  const [vAsks, vPins, vFiled] = await Promise.all([
    vShares.length ? db.select().from(renderConsultationRequests).where(inArray(renderConsultationRequests.shareLinkId, vShares.map((x) => x.id))) : Promise.resolve([]),
    vJobs.length ? db.select().from(renderAnnotations).where(and(inArray(renderAnnotations.jobId, vJobs.map((j) => j.id)), isNull(renderAnnotations.deletedAt))) : Promise.resolve([]),   // (audit 2026-09-26, F207) a removed pin has no line
    files.length ? db.select({ fileId: leadFileRenders.fileId }).from(leadFileRenders).where(inArray(leadFileRenders.fileId, files.map((f) => f.id))) : Promise.resolve([]),   // (F106) renders filed from the AI Visualizer
  ])
  const taskIds = tasks.map((t) => t.id), fileIds = files.map((f) => f.id), quoteIds = qs.map((x) => x.id)
  const [tComments, fComments, qLines, qPays, qFiles, qVersions, qComments] = await Promise.all([
    taskIds.length ? db.select().from(taskComments).where(inArray(taskComments.taskId, taskIds)) : Promise.resolve([]),
    fileIds.length ? db.select().from(fileComments).where(inArray(fileComments.fileId, fileIds)) : Promise.resolve([]),
    quoteIds.length ? db.select().from(quoteItems).where(inArray(quoteItems.quoteId, quoteIds)) : Promise.resolve([]),
    quoteIds.length ? db.select().from(quotePayments).where(inArray(quotePayments.quoteId, quoteIds)).orderBy(asc(quotePayments.position)) : Promise.resolve([]),
    quoteIds.length ? db.select().from(quoteFiles).where(inArray(quoteFiles.quoteId, quoteIds)) : Promise.resolve([]),
    quoteIds.length ? db.select().from(quoteVersions).where(inArray(quoteVersions.quoteId, quoteIds)) : Promise.resolve([]),   // (REG-565) Revise
    quoteIds.length ? db.select().from(quoteItemComments).where(inArray(quoteItemComments.quoteId, quoteIds)) : Promise.resolve([]),   // (REG-627) line comments
  ])
  const byMember = new Map(team.map((m) => [m.id, m]))
  const ME = team.find((m) => m.isYou)?.id ?? SESSION_MEMBER_ID   // (REG-667) "You" is whoever is signed in — View as moves it
  const who = (id: string | null | undefined): string => (!id ? 'System' : id === ME ? 'You' : byMember.get(id)?.name ?? 'System')
  const base = `/leads/${leadId}`
  const ev: ActivityEvent[] = []
  const push = (e: Omit<ActivityEvent, 'id'> & { id: string }) => ev.push(e)
  const q = (s: string) => `“${s}”`

  // Lead — Qanvast leads come from the system, the rest from you (the overview card's "Lead created from <source>"); an
  // imported lead keeps the sheet's own source (Facebook, Others, …), so it reads as yours too.
  /* (REG-913) A direct project's client never was a lead: its record begins with the project's own line (the `project_created` event). */
  if (!lead.direct) push({ id: `lead-${lead.id}`, at: lead.createdAt, icon: 'person', text: `Lead created from ${lead.source}.`, link: { label: 'See Overview', href: base }, actor: lead.source === 'Qanvast' ? 'System' : 'You' })
  /* (parity P-12) The record's word follows the date: "lead" until the project's Won stamp, "project" from it (a direct project's client was
     never a lead). The stamp is the Won move — or, for a lead won before projects existed, its first project's making. */
  const wonAt = await (async (): Promise<number | null> => {
    if (lead.direct) return 0
    const made = await db.select({ at: projectRows.createdAt }).from(projectRows).where(eq(projectRows.leadId, leadId))
    const stamps = [...logs.filter((l) => l.toStage === 'Won' && l.fromStage !== 'Won').map((l) => l.createdAt.getTime()), ...made.map((m) => m.at.getTime())]
    return stamps.length ? Math.min(...stamps) : null
  })()
  const recordAt = (at: Date): 'lead' | 'project' => (wonAt !== null && at.getTime() >= wonAt ? 'project' : 'lead')
  /* (parity P-14) one sentence shape for every kind: who · what · the reason in quotes · the date — "Dane put the lead on hold — “Budget
     review”; follow up 7 Nov ’26." (the project's own hold line, the model). A stored "Others: …" reads as the words typed. */
  const reasonWords = (r: string | null | undefined): string => (r ? ` — ${q(r.replace(/^Others:\s*/, '').replace(/[.!?]+$/, ''))}` : '')
  const overview = { label: 'See Overview', href: base }
  /* (gaps build H, H-Q24) the project's conversation — one line a day, never the words (they live in Messages) */
  {
    const msgs = await db.select({ at: projectMessages.createdAt, kind: projectMessages.authorKind, projectId: projectMessages.projectId, channel: projectMessages.channel }).from(projectMessages)
      .where(and(eq(projectMessages.leadId, leadId), isNull(projectMessages.deletedAt)))
    /* (parity map, UC-064) the client's conversation and the team's are counted apart — a team line is never "with {client}" */
    const days = new Map<string, { at: Date; n: number; client: number; projectId: string; team: boolean }>()
    for (const m of msgs) {
      const team = m.channel === 'team'
      const k = `${m.projectId}:${team ? 'team:' : ''}${m.at.toDateString()}`
      const x = days.get(k) ?? { at: m.at, n: 0, client: 0, projectId: m.projectId, team }
      x.n++; if (m.kind === 'client') x.client++; if (m.at > x.at) x.at = m.at
      days.set(k, x)
    }
    for (const [k, x] of days) push(x.team
      ? { id: `msgs-${k}`, at: x.at, icon: 'comment', text: `${x.n} ${x.n === 1 ? 'message' : 'messages'} in the team chat.`, link: { label: 'See Messages', href: `/projects/${x.projectId}/messages?channel=team` }, actor: 'System', group: 'messages' }   // (invented copy)
      : { id: `msgs-${k}`, at: x.at, icon: 'comment', text: `${x.n} ${x.n === 1 ? 'message' : 'messages'} with ${lead.name}${x.client ? ` — ${x.client} from their side` : ''}.`,
          link: { label: 'See Messages', href: `/projects/${x.projectId}/messages` }, actor: x.client ? lead.name : 'System', group: 'messages' })
  }
  /* (pending modules S26) the lead's own Team conversation before Won — one line a day, never the words (the client never sees it; once Won
     the project's Team conversation carries it on, so the link opens that) */
  {
    const team = await db.select({ at: conversationMessages.createdAt }).from(conversationMessages).innerJoin(conversations, eq(conversations.id, conversationMessages.conversationId))
      .where(and(eq(conversations.leadId, leadId), eq(conversations.kind, 'lead'), isNull(conversationMessages.deletedAt), isNull(conversationMessages.event)))
    const days = new Map<string, { at: Date; n: number }>()
    for (const m of team) { const k = m.at.toDateString(); const x = days.get(k) ?? { at: m.at, n: 0 }; x.n++; if (m.at > x.at) x.at = m.at; days.set(k, x) }
    const href = `/chat?open=${encodeURIComponent(`lead-team:${leadId}`)}`
    for (const [k, x] of days) push({ id: `lead-team-${k}`, at: x.at, icon: 'comment', text: `${x.n} ${x.n === 1 ? 'message' : 'messages'} in the team chat.`, link: { label: 'See Messages', href }, actor: 'System', group: 'messages' })   // (invented copy, the project's line's words)
  }
  // (REG-335, user 2026-09-04: "the activity include the member assigned") Every member on the lead, from the row's own stamp;
  // rows older than the column read as assigned when the lead was created. A removal leaves no row, so it cannot appear.
  /* (parity P-13) …named by whoever added them (`assigned_by`) — "Dane added Germaine to the lead", "Michelle joined the project"; a row from
     before the stamp names nobody: "Germaine was added to the lead" (it read "You assigned …" whoever did it) */
  for (const a of assigned) {
    const at = a.assignedAt ?? lead.createdAt
    const rec = recordAt(at)
    const by = a.assignedBy ? who(a.assignedBy) : null
    const name = a.memberId === ME ? 'you' : byMember.get(a.memberId)?.name ?? 'a member'
    const text = !by ? `${a.memberId === ME ? 'You were' : `${name.charAt(0).toUpperCase()}${name.slice(1)} was`} added to the ${rec}.`
      : a.assignedBy === a.memberId ? `${by} joined the ${rec}.`
      : `${by} added ${name} to the ${rec}.`
    push({ id: `assign-${a.id}`, at, icon: 'person_add', text, link: overview, actor: by ?? 'System' })
  }
  // The Lost move on a return is returnLead's own side effect, named by `leadReturns.stageLogId` (seeded returns carry only the
  // payload reason) — "You marked the lead as lost." claimed a move nobody made, next to the return row that already tells it.
  const returnLogIds = new Set(rets.map((r) => r.stageLogId).filter((id): id is string => !!id))
  const isReturnLog = (log: (typeof logs)[number]) =>
    returnLogIds.has(log.id) || (!!log.payload && typeof log.payload === 'object' && (log.payload as { reason?: unknown }).reason === 'Lead returned to Qanvast')
  for (const log of logs) {
    if (isReturnLog(log)) continue
    // fromStage === toStage is updateStageDetails recording a stage the lead reached before any log existed — a correction, not a move.
    /* (REG-607) The parking reason and its detail read back from the log — 1.0's activity names the close reason. */
    const park = (log.payload && typeof log.payload === 'object' ? log.payload : {}) as { reason?: string; competitor?: string; restartAt?: string; followUpAt?: string
      /** (S44R — UAT row 358, call C7) a signed agreement moved it to Won (Settings › Projects › When a project starts) */ agreementSigned?: { by: string | null; title: string } }
    /* (parity P-13 · P-14) who moved it (`moved_by`), the reason in quotes, then the day it comes back to: the follow-up of a hold, the
       competitor or the expected restart of a loss. A log from before the stamp names nobody — "The lead moved from Met to Quote Sent." */
    const mover = log.movedBy ? who(log.movedBy) : null
    const day = (iso: string | undefined) => { const d = iso ? new Date(iso) : null; return d && !Number.isNaN(d.getTime()) ? displayDate(d) : null }
    const followUp = day(park.followUpAt), restart = day(park.restartAt)
    const why = reasonWords(park.reason)
    const extra = `${park.competitor ? `; competitor: ${park.competitor}` : ''}${restart ? `; restart expected ${restart}` : ''}`
    const text = log.fromStage === log.toStage
      ? (log.toStage === 'Contacted' ? (mover ? `${mover} updated the contact log.` : 'The contact log was updated.') : mover ? `${mover} updated the ${log.toStage} details.` : `The ${log.toStage} details were updated.`)
      : log.toStage === 'On Hold' ? `${mover ? `${mover} put the lead on hold` : 'The lead was put on hold'}${why}${followUp ? `; follow up ${followUp}` : ''}.`
      : log.toStage === 'Lost' ? `${mover ? `${mover} marked the lead as lost` : 'The lead was marked as lost'}${why}${extra}.`
      /* a parked lead brought back — the project's "resumed the project", for a lead: where it resumed */
      : log.fromStage === 'On Hold' || log.fromStage === 'Lost' ? (mover ? `${mover} resumed the lead at ${log.toStage}.` : `The lead resumed at ${log.toStage}.`)
      : park.agreementSigned && !mover ? `The lead moved from ${log.fromStage} to ${log.toStage} when ${park.agreementSigned.by ?? 'the client'} signed “${park.agreementSigned.title}”.`   // (S44R, C7; invented copy)
      : mover ? `${mover} moved the lead from ${log.fromStage} to ${log.toStage}.` : `The lead moved from ${log.fromStage} to ${log.toStage}.`
    push({ id: `stage-${log.id}`, at: log.createdAt, icon: 'swap_horiz', text, link: overview, actor: mover ?? (park.agreementSigned ? park.agreementSigned.by ?? 'The client' : 'System'), group: 'stage' })
    // Add Log rewrites the stage's row in place (updateStageDetails), so later contact / meeting logs live only inside the payload:
    // every log past the first (the row above already stands for it) gets its own row, dated by the log's own "when".
    if (!isWizardPayload(log.payload)) continue
    /* (parity P-13) a log added later keeps no author — the line says what was added, never "You" to every reader */
    const entries: { when: string; text: string }[] = log.toStage === 'Contacted'
      ? log.payload.logs.slice(1).map((l) => ({ when: l.when, text: `A contact log was added${l.channel ? ` via ${l.channel}` : ''}.` }))
      : log.toStage === 'Met' && Array.isArray(log.payload.meetings) ? log.payload.meetings.slice(1).map((m) => ({ when: m.when, text: 'A meeting log was added.' }))
      : []
    entries.forEach((e, i) => push({ id: `stage-${log.id}-log-${i + 1}`, at: parseInputDateTime(e.when) ?? log.createdAt, icon: 'swap_horiz', text: e.text, link: overview, actor: 'System', group: 'stage' }))
  }
  /* (REG-529) Quote X-Ray: a comparison is a reading of two quotes, kept on the lead. */
  for (const c of cmps) {
    const seeIt = { label: 'See comparison', href: `/quote-x-ray/${c.id}?from=${encodeURIComponent(`${base}/activity`)}` }
    push({ id: `xray-${c.id}`, at: c.createdAt, icon: 'scan', text: `${who(c.createdBy)} compared ${c.yourLabel} with ${c.otherStudio}'s quote in Quote X-Ray.`, link: seeIt, actor: who(c.createdBy) })
    /* (REG-640, X-Ray parity Q-16) what went to the client — the last send the reading keeps */
    if (c.sentAt) push({ id: `xray-sent-${c.id}`, at: c.sentAt, icon: 'send', text: c.sentVia === 'copy' ? `${who(c.sentBy ?? c.createdBy)} copied the comparison with ${c.otherStudio}'s quote to send to the client.` : `${who(c.sentBy ?? c.createdBy)} sent the comparison with ${c.otherStudio}'s quote to the client on WhatsApp.`, link: seeIt, actor: who(c.sentBy ?? c.createdBy) })
  }
  /* (pending modules S23) Meetings: planned, held with the co-pilot or written up, its brief saved to the lead, its notes shared, the client's answer to
     the invitation, cancelled. A meeting the Met log holds also has the stage's own line — this one says what the meeting record adds. */
  {
    const { meetings: meetingRows } = await import('@/lib/db/schema')
    const { aimLabel: aimOf, parseBrief: briefOf, heldMinutes: heldOf } = await import('@/lib/meetings/model')
    const ms = await db.select().from(meetingRows).where(and(eq(meetingRows.leadId, leadId), isNull(meetingRows.deletedAt)))
    for (const m of ms) {
      const what = m.aim === 'other' ? 'a meeting' : `a ${aimOf(m.aim).toLowerCase()}`
      const open = { label: 'See meeting', href: `/meetings/${m.id}?from=${encodeURIComponent(`${base}/activity`)}` }
      const when = displayDateTimeDot(m.startsAt)
      push({ id: `meeting-${m.id}`, at: m.createdAt, icon: 'event', text: m.source && m.status === 'held' && !m.startedAt ? `${who(m.createdBy)} wrote up ${what} with ${lead.name} on ${when}${m.source === 'recording' ? ', from a recording' : ''}.` : `${who(m.createdBy)} planned ${what} with ${lead.name} for ${when}.`, link: open, actor: who(m.createdBy), origin: true })
      if (m.startedAt) push({ id: `meeting-start-${m.id}`, at: m.startedAt, icon: 'mic', text: `${who(m.startedBy)} started ${what} with the co-pilot — ${lead.name} was told about it.`, link: open, actor: who(m.startedBy) })
      if (m.endedAt) push({ id: `meeting-end-${m.id}`, at: m.endedAt, icon: 'event', text: `${who(m.startedBy)} held ${what} with ${lead.name}${m.blocks ? ` — the co-pilot on for ${heldOf({ startedAt: m.startedAt?.getTime() ?? null, endedAt: m.endedAt.getTime(), blocks: m.blocks })} minutes` : ''}; its brief is ready.`, link: open, actor: who(m.startedBy) })
      if (m.briefSavedAt) {
        const b = briefOf(m.briefJson)
        push({ id: `meeting-saved-${m.id}`, at: m.briefSavedAt, icon: 'task_alt', text: `${who(m.briefSavedBy)} saved the meeting’s brief to the ${recordAt(m.briefSavedAt)}${b?.actions[0] ? ` — next: ${q(b.actions[0])}` : ''}.`, link: open, actor: who(m.briefSavedBy) })
      }
      if (m.invitedAt) push({ id: `meeting-invite-${m.id}`, at: m.invitedAt, icon: 'send', text: `The invitation to ${what} went to ${lead.name}${m.invitedVia === 'email' ? ' by email' : m.invitedVia === 'whatsapp' ? ' on WhatsApp' : ''}.`, link: open, actor: 'System' })
      if (m.clientAnswerAt && m.clientAnswer) push({ id: `meeting-answer-${m.id}`, at: m.clientAnswerAt, icon: m.clientAnswer === 'yes' ? 'check_circle' : 'info', text: m.clientAnswer === 'yes' ? `${lead.name} said they’ll be at ${what.replace(/^a /, 'the ')}.` : `${lead.name} said the time of ${what.replace(/^a /, 'the ')} doesn’t suit${m.clientAnswerNote ? ` — ${q(m.clientAnswerNote)}` : ''}.`, link: open, actor: lead.name })
      if (m.sharedAt) push({ id: `meeting-share-${m.id}`, at: m.sharedAt, icon: 'link', text: `The notes from ${what.replace(/^a /, 'the ')} were shared with ${lead.name}${m.shareStoppedAt ? ' — no longer shared' : ''}.`, link: open, actor: 'System' })
      if (m.status === 'cancelled' && m.updatedAt) push({ id: `meeting-cancel-${m.id}`, at: m.updatedAt, icon: 'cancel', text: `${what.replace(/^a /, 'The ')} with ${lead.name} on ${when} was cancelled.`, link: open, actor: 'System' })
    }
  }
  /* (pending modules S27 — Hangouts) A chat booked with the studio at a Qanvast Hangout — on the studio's page or at its table — then held with
     its outcome, or cancelled. The held chat's notes are its meeting's (the Meetings branch above says that). */
  {
    const { hangoutRegistrations, hangoutMeetings, hangoutEvents } = await import('@/lib/db/schema')
    const { hangoutHref, outcomeLabel } = await import('@/lib/hangouts/model')
    const regs = await db.select({ id: hangoutRegistrations.id, eventId: hangoutRegistrations.eventId, via: hangoutRegistrations.via, createdBy: hangoutRegistrations.createdBy, createdAt: hangoutRegistrations.createdAt, name: hangoutEvents.name })
      .from(hangoutRegistrations).innerJoin(hangoutEvents, eq(hangoutEvents.id, hangoutRegistrations.eventId)).where(eq(hangoutRegistrations.leadId, leadId))
    const chats = regs.length ? await db.select().from(hangoutMeetings).where(eq(hangoutMeetings.leadId, leadId)) : []
    for (const r of regs) {
      const open = { label: 'See the Hangout', href: `${hangoutHref(r.eventId, 'meetings')}&from=${encodeURIComponent(`${base}/activity`)}` }
      push({ id: `hangout-reg-${r.id}`, at: r.createdAt, icon: 'group', text: r.via === 'desk' ? `${who(r.createdBy)} booked ${lead.name} a chat at ${q(r.name)}, at the studio’s table.` : `${lead.name} booked a chat at ${q(r.name)} on the studio’s page.`, link: open, actor: r.via === 'desk' ? who(r.createdBy) : lead.name, origin: true })
      for (const c of chats.filter((x) => x.registrationId === r.id)) {
        if (c.status === 'completed' && c.endedAt) push({ id: `hangout-held-${c.id}`, at: c.endedAt, icon: 'chat', text: `${who(c.memberId)} met ${lead.name} at ${q(r.name)}${c.tableNumber ? `, table ${c.tableNumber}` : ''} — ${(outcomeLabel(c.outcome) ?? 'held').toLowerCase()}${c.subStatus ? `: ${c.subStatus.toLowerCase()}` : ''}.`, link: open, actor: who(c.endedBy ?? c.memberId) })
        if (c.status === 'cancelled' && c.cancelledAt) push({ id: `hangout-cancel-${c.id}`, at: c.cancelledAt, icon: 'cancel', text: `${lead.name}’s chat at ${q(r.name)} was cancelled.`, link: open, actor: 'System' })
      }
    }
  }
  /* (REG-675, AI Visualizer Q-34) The AI Visualizer: rooms added, versions rendered, renders shared, and the client's answers. */
  const vizStops = new Set(events.filter((e) => e.kind === 'share_stopped').map((e) => (e.detail as LeadEventDetail | null)?.id).filter(Boolean))
  /* (audit 2026-09-26, F098) a line about a version opens the design on its room and version — on the pin itself for a pin */
  const viz = (roomId?: string | null, key?: string | null, pinId?: string | null) => {
    const r = roomId ? vRooms.find((x) => x.id === roomId && !x.deletedAt) : null
    const d = r?.designId ?? vRooms[0]?.designId
    if (!d) return overview
    const params = [r ? `room=${r.id}` : null, r && key ? `v=${encodeURIComponent(key)}` : null, r && key && pinId ? `pin=${pinId}` : null, `from=${encodeURIComponent(`${base}/activity`)}`].filter(Boolean).join('&')
    return { label: 'Open AI Visualizer', href: `/visualizer/${d}?${params}` }
  }
  {
    const vn = new Map<string, { n: number; room: string; roomId: string }>()
    for (const j of vJobs) { const room = vRooms.find((r) => r.id === j.roomId); for (const v of parseVariants(j.variantsJson)) vn.set(`${j.id}:${v.id}`, { n: v.n, room: room?.name ?? 'a room', roomId: j.roomId }) }
    const on = (key: string | null) => { const v = key ? vn.get(key) : null; return v ? `V${v.n} of ${q(v.room)}` : null }
    const at = (key: string | null, pinId?: string) => { const v = key ? vn.get(key) : null; return v ? viz(v.roomId, key, pinId) : viz(null) }
    for (const r of vRooms) push({ id: `viz-room-${r.id}`, at: r.createdAt, icon: 'add_photo_alternate', text: `${who(r.createdBy)} added the room ${q(r.name)} to the AI Visualizer.`, link: viz(r.id), actor: who(r.createdBy) })
    for (const j of vJobs) {
      const vs = parseVariants(j.variantsJson).filter((v) => !v.deletedAt)
      if (!vs.length) continue
      const room = vRooms.find((r) => r.id === j.roomId)?.name ?? 'a room'
      push({ id: `viz-job-${j.id}`, at: j.createdAt, icon: 'wand_shine', text: `${who(j.createdBy)} rendered ${vs.map((v) => `V${v.n}`).join(', ')} of ${q(room)} — ${descriptor(vs[0]!.applied)}.`, link: viz(j.roomId, `${j.id}:${vs[0]!.id}`), actor: who(j.createdBy) })
    }
    for (const sl of vShares) {
      /* (pending modules S02) a render shown to the client from Files is on their Designs through a link of its own — the file's "showed …"
         and "stopped showing …" lines say it; only the client's opening of it is the link's own line */
      if (sl.fileId) { if (sl.lastViewedAt) push({ id: `viz-view-${sl.id}`, at: sl.lastViewedAt, icon: 'visibility', text: `${lead.name} opened the shared renders${sl.viewCount > 1 ? ` (${sl.viewCount} times)` : ''}.`, link: viz(null), actor: lead.name }); continue }
      const n = parseSnapshot(sl.snapshot).versions.length
      push({ id: `viz-share-${sl.id}`, at: sl.createdAt, icon: 'send', text: `${who(sl.createdBy)} shared ${n} ${n === 1 ? 'render' : 'renders'} with ${lead.name}${sl.sentVia === 'whatsapp' ? ' on WhatsApp' : ''}.`, link: viz(null), actor: who(sl.createdBy) })
      if (sl.lastViewedAt) push({ id: `viz-view-${sl.id}`, at: sl.lastViewedAt, icon: 'visibility', text: `${lead.name} opened the shared renders${sl.viewCount > 1 ? ` (${sl.viewCount} times)` : ''}.`, link: viz(null), actor: lead.name })
      /* (F106 · F207) a stop names whoever stopped it — the event log's line below; a link stopped before the log keeps a line that names nobody */
      if (sl.revokedAt && !vizStops.has(sl.id)) push({ id: `viz-stop-${sl.id}`, at: sl.revokedAt, icon: 'link_off', text: 'The renders’ link was stopped.', link: viz(null), actor: 'System' })
    }
    for (const a of vAsks) {
      const v = on(a.versionKey)
      const name = a.clientName ?? lead.name
      const text = a.kind === 'favourite' ? `${name} picked ${v ?? 'a render'} as the favourite.`
        : a.kind === 'call_back' ? `${name} asked for a call back about the renders.`
        : a.kind === 'reply' ? `${name} answered ${lead.name}’s note on ${v ?? 'the renders'}: ${q(a.message ?? '')}`   // (UX audit V1) the studio's reply, `client_name` its writer
        : `${name} left a note on ${v ?? 'the renders'}: ${q(a.message ?? '')}`
      push({ id: `viz-ask-${a.id}`, at: a.createdAt, icon: a.kind === 'favourite' ? 'star' : a.kind === 'call_back' ? 'call' : 'comment', text, link: a.kind === 'call_back' && a.taskId ? { label: 'See Task', href: `${base}/tasks?open=${a.taskId}` } : at(a.versionKey), actor: name })
    }
    for (const p of vPins) {
      const key = `${p.jobId}:${p.variantId}`
      const actor = p.authorRole === 'client' ? p.authorName : who(p.authorMemberId)
      push({ id: `viz-pin-${p.id}`, at: p.createdAt, icon: 'push_pin', text: `${actor} pinned a note on ${on(key) ?? 'a render'}: ${q(p.body)}`, link: at(key, p.id), actor })
      /* (F106) every reply on the pin, the client's and the studio's */
      for (const c of parseComments(p.commentsJson)) {
        const by = c.authorRole === 'client' ? c.authorName : who((c as { authorMemberId?: string | null }).authorMemberId ?? null)
        push({ id: `viz-pin-${p.id}-${c.id}`, at: new Date(c.createdAt), icon: 'comment', text: `${by} replied on ${on(key) ?? 'a render'}: ${q(c.body)}`, link: at(key, p.id), actor: by })
      }
    }
  }
  for (const r of rets) push({ id: `ret-${r.id}`, at: r.returnedAt, icon: 'undo', text: r.appealOf ? `${who(r.returnedById)} appealed Qanvast’s rejection of the return${reasonWords(r.reason)}.` : `${who(r.returnedById)} returned the lead to Qanvast${reasonWords(r.reason)}.`, link: { label: 'See Overview', href: base }, actor: who(r.returnedById) })   // (parity P-14) the reason in quotes · (pending modules S05) an appeal says so
  /* (REG-613, parity Q-20) The event log — 1.0's activity rows for what leaves no record: removals, edits, deletions, an undone
     return, every portal invite and questionnaire ask (REG-609's link stamps keep only the latest of each). */
  /* (fix-C, C-32) An update's files: its first line names them ("with 4 photos, a video and 2 documents"), and the uploads its author made for
     it — in the two hours before it was first saved — fold into that line instead of one "uploaded the file" line each. */
  const updFiles = await db.select({ fileId: projectUpdateFiles.fileId, updateId: projectUpdateFiles.updateId, at: projectUpdates.createdAt, authorId: projectUpdates.authorId })
    .from(projectUpdateFiles).innerJoin(projectUpdates, eq(projectUpdates.id, projectUpdateFiles.updateId)).innerJoin(projectRows, eq(projectRows.id, projectUpdates.projectId))
    .where(eq(projectRows.leadId, leadId))
  const foldedFiles = new Set(updFiles.filter((r) => { const f = files.find((x) => x.id === r.fileId); return !!f && f.ownerId === r.authorId && f.createdAt.getTime() <= r.at.getTime() + 60_000 && r.at.getTime() - f.createdAt.getTime() <= 2 * 3_600_000 }).map((r) => r.fileId))
  const mediaWords = (updateId: string | undefined) => {
    if (!updateId) return ''
    const mine = updFiles.filter((r) => r.updateId === updateId).map((r) => files.find((x) => x.id === r.fileId)).filter((f): f is (typeof files)[number] => !!f && !f.deletedAt)
    const n = { photo: mine.filter((f) => f.kind === 'image').length, video: mine.filter((f) => f.kind === 'video').length, doc: mine.filter((f) => f.kind !== 'image' && f.kind !== 'video').length }
    const word = (k: number, one: string, many: string) => (k === 1 ? `${one === 'photo' ? 'a photo' : one === 'video' ? 'a video' : 'a document'}` : `${k} ${many}`)
    const parts = [n.photo ? word(n.photo, 'photo', 'photos') : null, n.video ? word(n.video, 'video', 'videos') : null, n.doc ? word(n.doc, 'document', 'documents') : null].filter((x): x is string => !!x)
    return parts.length ? ` with ${parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : parts[0]}` : ''
  }
  /* (simplify round 2, S-22 — her "fix all the pending things" 2026-10-09) The client asks: a task or a variation order made from a client's
     message or ticket. Its line names whose message, or which ticket — read off the message / ticket the press came from (the line keeps its
     `ref`). */
  /* (simplify round 2) a variation order raised from a client's ask: its ask line says it under All — the order's own line keeps the Money chip */
  const askVos = new Set(events.filter((x) => x.kind === 'project_ask_vo').map((x) => (x.detail as LeadEventDetail | null)?.id).filter((id): id is string => !!id))
  const askRefs = (k: 'message' | 'ticket') => [...new Set(events.filter((x) => x.kind === 'project_ask_task' || x.kind === 'project_ask_vo')
    .map((x) => x.detail as { source?: string; ref?: string } | null).filter((x) => x?.source === k && !!x.ref).map((x) => x!.ref!))]
  const [askMsgs, askTickets] = await Promise.all([
    askRefs('message').length ? db.select({ id: projectMessages.id, name: projectMessages.authorName }).from(projectMessages).where(inArray(projectMessages.id, askRefs('message'))) : Promise.resolve([]),
    askRefs('ticket').length ? db.select({ id: projectTickets.id, number: projectTickets.number, kind: projectTickets.raisedKind, name: projectTickets.raisedByName }).from(projectTickets).where(inArray(projectTickets.id, askRefs('ticket'))) : Promise.resolve([]),
  ])
  for (const e of events) {
    const d = (e.detail && typeof e.detail === 'object' ? e.detail : {}) as LeadEventDetail
    const actor = who(e.actorId)
    /* (REG-953, Projects round 3) An update's every step, with its actor — the line opens the update on the project's Updates tab. */
    if (e.kind.startsWith('project_update_')) {
      const ud = d as LeadEventDetail & { note?: string; again?: boolean; changes?: boolean }
      const t = q(ud.title ?? '')
      /* (fix-C, C-01) a change to a published update, held for review: its own words — the client kept the published ones meanwhile */
      const held = ud.changes ? (e.kind === 'project_update_submitted' ? `${actor} changed the update ${t} and sent the change for review.`
        : e.kind === 'project_update_approved' ? `${actor} approved the change to the update ${t} — the client reads the new words.`
        : e.kind === 'project_update_sent_back' ? `${actor} sent the change to the update ${t} back${ud.note ? ` — ${q(ud.note.replace(/[.!?]+$/, ''))}` : ''}.`
        : null) : null
      const w = ud.again ? '' : mediaWords(ud.id)   // (fix-C, C-32)
      const text = held ? held : e.kind === 'project_update_drafted' ? `${actor} started a draft update ${t}${w}.`
        : e.kind === 'project_update_posted' ? `${actor} ${ud.again ? 'published the update' : 'posted the update'} ${t}${w} — the client can see it.`
        : e.kind === 'project_update_submitted' ? `${actor} sent the update ${t}${w} ${ud.again ? 'for review again' : 'for review'}.`
        : e.kind === 'project_update_approved' ? `${actor} approved the update ${t} — the client can see it.`
        : e.kind === 'project_update_sent_back' ? `${actor} sent the update ${t} back${ud.note ? ` — ${q(ud.note.replace(/[.!?]+$/, ''))}` : ''}.`
        : e.kind === 'project_update_edited' ? `${actor} edited the update ${t}.`
        : e.kind === 'project_update_withdrawn' ? `${actor} withdrew the update ${t} — the client no longer sees it.`
        : e.kind === 'project_update_deleted' ? `${actor} deleted the update ${t}.`
        : null
      const href = e.projectId ? `/projects/${e.projectId}/updates${ud.id && e.kind !== 'project_update_deleted' ? `?open=${encodeURIComponent(ud.id)}` : ''}` : null
      if (text) push({ id: `ev-${e.id}`, at: e.at, icon: 'photo_camera', text, link: href ? { label: 'See Update', href } : overview, actor })
      continue
    }
    /* (Projects round 2) The schedule's lines — every milestone action and each share; the line opens the project's Schedule. */
    if (e.kind.startsWith('project_milestone_') || e.kind.startsWith('project_schedule_')) {
      const sd = d as LeadEventDetail & { from?: string; to?: string; note?: string | null; source?: string }
      const m = q(sd.title ?? '')
      const text = e.kind === 'project_schedule_created' ? `${actor} set up the schedule${sd.source ? ` ${sd.source}` : ''} — ${sd.n ?? 0} milestone${sd.n === 1 ? '' : 's'}.`
        : e.kind === 'project_milestone_added' ? `${actor} added the milestone ${m}.`
        : e.kind === 'project_milestone_renamed' ? `${actor} renamed the milestone ${q(sd.from ?? '')} to ${q(sd.to ?? '')}.`
        : e.kind === 'project_milestone_moved' ? `${actor} moved ${m} — ${sd.from ?? ''} → ${sd.to ?? ''}${sd.n ? `; ${sd.n} milestone${sd.n === 1 ? '' : 's'} followed` : ''}.`
        : e.kind === 'project_milestone_status' ? `${actor} marked ${m} ${(sd.to ?? '').toLowerCase()}.`
        /* (fix-B, B-40) the fields in the house voice, naming the stage and the client: "— showed it to Aisha, tied Deposit to it and asked Aisha to confirm it" */
        : e.kind === 'project_milestone_edited' ? `${actor} updated the milestone ${m} — ${listWords((sd.fields ?? []).map((f) => fieldWords(f, titleCaseName(lead.name).split(/\s+/)[0] ?? lead.name)))}.`
        : e.kind === 'project_milestone_deleted' ? `${actor} deleted the milestone ${m}.`
        : e.kind === 'project_milestone_restored' ? `${actor} brought back the milestone ${m}.`
        : e.kind === 'project_schedule_shared' ? `${actor} shared ${sd.n ? `${sd.n} change${sd.n === 1 ? '' : 's'} to the schedule` : 'the schedule'} with ${titleCaseName(lead.name).split(/\s+/)[0] ?? 'the client'}${sd.note ? `: ${q(sd.note)}` : '.'}`   /* (fix-B, B-40) the client by name */
        /* (Projects round 7) a task put into a milestone from the Tasks tab, or taken out of it */
        : e.kind === 'project_milestone_task' ? `${actor} ${(sd as { out?: boolean }).out ? `took the task ${q((sd as { task?: string }).task ?? '')} out of` : `put the task ${q((sd as { task?: string }).task ?? '')} in`} ${m}.`
        /* (gaps build, package C) the schedule rebuilt; more time asked and answered; a Done waiting and answered; a share waiting and answered */
        : e.kind === 'project_schedule_rebuilt' ? (() => { const x = sd as { kept?: number; added?: string[]; dropped?: string[] }; return `${actor} rebuilt the schedule${sd.source ? ` ${sd.source}` : ''} — ${listWords([`${x.kept ?? 0} milestone${x.kept === 1 ? '' : 's'} kept`, ...(x.added?.length ? [`${x.added.length} added`] : []), ...(x.dropped?.length ? [`${listWords(x.dropped.map(q))} taken off`] : [])])}.` })()
        : e.kind === 'project_milestone_more_asked' ? `${actor} asked for more time on ${m} — to ${sd.to ?? ''}${sd.reason ? `: ${q(sd.reason.replace(/[.!?]+$/, ''))}` : ''}.`
        : e.kind === 'project_milestone_more_approved' ? `${actor} approved more time on ${m}${(sd as { requester?: string }).requester ? ` for ${(sd as { requester?: string }).requester}` : ''} — it now ends ${sd.to ?? ''}${sd.n ? `; ${sd.n} milestone${sd.n === 1 ? '' : 's'} followed` : ''}.`
        : e.kind === 'project_milestone_more_declined' ? `${actor} declined more time on ${m}${(sd as { requester?: string }).requester ? ` for ${(sd as { requester?: string }).requester}` : ''}${sd.note ? `: ${q(sd.note.replace(/[.!?]+$/, ''))}` : ''}.`
        : e.kind === 'project_milestone_more_withdrawn' ? `${actor} took back the ask for more time on ${m}.`
        : e.kind === 'project_milestone_done_asked' ? `${actor} marked ${m} done — waiting for an Owner or an Admin to approve it.`
        : e.kind === 'project_milestone_done_approved' ? `${actor} approved ${m} as done${(sd as { requester?: string }).requester ? ` for ${(sd as { requester?: string }).requester}` : ''}.`
        : e.kind === 'project_milestone_done_sent_back' ? `${actor} sent ${m} back — not done yet${sd.note ? `: ${q(sd.note.replace(/[.!?]+$/, ''))}` : ''}.`
        : e.kind === 'project_milestone_done_withdrawn' ? `${actor} took back the ask to approve ${m} as done.`
        : e.kind === 'project_schedule_share_asked' ? `${actor} asked to share ${sd.n ?? 0} schedule change${sd.n === 1 ? '' : 's'} with ${titleCaseName(lead.name).split(/\s+/)[0] ?? 'the client'}${sd.note ? `: ${q(sd.note)}` : '.'}`
        : e.kind === 'project_schedule_share_sent_back' ? `${actor} sent the schedule changes back — not shared yet${sd.note ? `: ${q(sd.note.replace(/[.!?]+$/, ''))}` : ''}.`
        : e.kind === 'project_schedule_share_withdrawn' ? `${actor} took back the ask to share schedule changes.`
        : null
      const asks = /_(asked|approved|declined|sent_back|withdrawn)$/.test(e.kind)   // (gaps build, package C) an ask or its answer
      if (text) push({ id: `ev-${e.id}`, at: e.at, icon: e.kind === 'project_schedule_shared' || e.kind.startsWith('project_schedule_share_') ? 'share' : asks ? 'approval' : 'calendar_month', text, link: e.projectId ? { label: 'See Schedule', href: `/projects/${e.projectId}/schedule${asks && sd.id ? `?open=${encodeURIComponent(sd.id)}` : ''}` } : overview, actor })
      continue
    }
    /* (Projects round 8) A choice's every step; the client's pick (and a pick made with them) files its summary card under the line. */
    if (e.kind.startsWith('project_choice_')) {
      const cd = d as LeadEventDetail & { option?: string; by?: 'client' | 'studio'; price?: number | null; thumb?: string | null; hex?: string | null; note?: string | null; from?: string; person?: string; gst?: number; vo?: string; voDropped?: boolean; waitEnded?: string; again?: boolean }
      const t = q(cd.title ?? '')
      const o = q(cd.option ?? '')
      const client = ((e.kind === 'project_choice_chosen' || e.kind === 'project_choice_declined') && cd.by === 'client' && cd.person) || lead.name   // (Projects round 9) a household pick, by name
      const text = e.kind === 'project_choice_added' ? `${actor} added the choice ${t}.`
        : e.kind === 'project_choice_edited' ? `${actor} edited the choice ${t}.`
        : e.kind === 'project_choice_shared' ? `${actor} shared the choice ${t} with ${client}${cd.again ? ' again' : ''}.`
        /* (gaps build D, item 2 — M-07) the client's no on their portal, with their reason */
        : e.kind === 'project_choice_declined' ? `${client} ${cd.kind === 'reject' ? 'turned down the options' : 'asked for other options'} for ${t}${cd.note ? ` — ${q(cd.note.replace(/[.!?]+$/, ''))}` : ''}.`
        : e.kind === 'project_choice_unshared' ? `${actor} took the choice ${t} back — ${client} no longer sees it.`
        : e.kind === 'project_choice_chosen' ? (cd.by === 'client' ? `${client} chose ${o} for ${t}.` : `${actor} chose ${o} for ${t} with ${client}.`)
        : e.kind === 'project_choice_changed' ? `${actor} changed the pick for ${t}${cd.from ? ` from ${q(cd.from)}` : ''} to ${o}${cd.vo ? (cd.voDropped ? ` — ${cd.vo} was deleted, the pick changes nothing on the price` : ` — ${cd.vo} follows the new pick`) : ''}.`
        : e.kind === 'project_choice_deleted' ? `${actor} deleted the choice ${t}.`
        : e.kind === 'project_choice_option_added' ? `${actor} added ${o} to the choice ${t}.`
        : e.kind === 'project_choice_option_removed' ? `${actor} took ${o} off the choice ${t}.`
        : null
      const pick = e.kind === 'project_choice_chosen' || e.kind === 'project_choice_changed'
      const price = (typeof cd.price === 'number' ? contractLine(cd.price, typeof cd.gst === 'number' ? cd.gst : 0) : null) ?? 'No change to the price'   // (REG-1068) with the GST its variation order adds
      const card = pick && cd.option ? { src: cd.thumb ?? null, hex: cd.hex ?? null, title: `${cd.title ?? ''} · ${cd.option}`, lines: [price, ...(cd.note ? [`“${cd.note}”`] : []), ...(cd.waitEnded ? [`${cd.waitEnded} no longer waits on the client`] : [])] } : undefined   // (fix-C, C-04)
      const href = e.projectId ? `/projects/${e.projectId}/choices${cd.id && e.kind !== 'project_choice_deleted' ? `?open=${encodeURIComponent(cd.id)}` : ''}` : null
      if (text) push({ id: `ev-${e.id}`, at: e.at, icon: 'palette', text, link: href ? { label: 'See Choice', href } : overview, actor: (e.kind === 'project_choice_chosen' || e.kind === 'project_choice_declined') && cd.by === 'client' ? client : actor, ...(card ? { card } : {}) })
      continue
    }
    /* (Projects round 4b) The client's answer to a finished stage on their portal — their own line, by name — and the studio asking again
       after "Something is not right". The line opens the milestone on the project's Schedule. */
    if (e.kind.startsWith('project_stage_')) {
      const cd = d as LeadEventDetail & { note?: string | null }
      const m = q(cd.title ?? '')
      const client = cd.name ?? lead.name
      const text = e.kind === 'project_stage_confirmed' ? `${client} confirmed that ${m} is done.`
        : e.kind === 'project_stage_changes' ? `${client} said something is not right with ${m}${cd.note ? `: ${q(cd.note.replace(/[.!?]+$/, ''))}` : ''}.`
        : e.kind === 'project_stage_asked' ? `${actor} asked ${client} again to confirm ${m}.`
        /* (gaps build, package C — 9) the studio's answer to "not right": what was changed, in the words the client reads */
        : e.kind === 'project_stage_resolved' ? `${actor} marked ${m} resolved${cd.note ? `: ${q(cd.note.replace(/[.!?]+$/, ''))}` : ''}${(cd as { askedAgain?: boolean }).askedAgain ? ` — and asked ${client} to confirm it again` : ''}.`
        : null
      if (text) push({ id: `ev-${e.id}`, at: e.at, icon: e.kind === 'project_stage_changes' ? 'error' : 'check_circle', text,
                       link: e.projectId ? { label: 'See Schedule', href: `/projects/${e.projectId}/schedule${cd.id ? `?open=${encodeURIComponent(cd.id)}` : ''}` } : overview,
                       actor: e.kind === 'project_stage_asked' || e.kind === 'project_stage_resolved' ? actor : client })
      continue
    }
    /* (gaps build F1) Money out: a purchase order's every step (made, changed, submitted, sent back, sent, the vendor's answer — on its link, the
       vendor's own line — cancelled, closed short, a Draft removed), a supplier bill recorded / changed / removed, an expense logged / answered /
       removed, a payment out and its reversal. Each line opens the Money tab on its record; all of them are money lines (`isMoneyEventKind`). */
    if (/^project_(po|bill|expense|payout)_/.test(e.kind)) {
      const md = d as LeadEventDetail & { to?: string; from?: string; vendor?: string; answer?: string; via?: string; note?: string | null; due?: string; again?: boolean; requester?: string; po?: string | null; claim?: string | null; category?: string; method?: string
        /* (S44R, C8) why a bill waits for an Owner's or an Admin's OK */ waits?: string
        /* (pending modules S06) an expense's repeat: its rhythm as words, the day one the rule logged is for, a stop and why */ repeat?: string; day?: string; stopped?: boolean; why?: string }
      const t = md.title ? q(md.title) : ''
      const v = md.vendor ?? 'the vendor'
      const how = md.via && md.via !== 'link' ? ({ phone: 'on the phone', whatsapp: 'on WhatsApp', email: 'by email', in_person: 'in person' } as Record<string, string>)[md.via] ?? '' : ''
      const why = (x: string | null | undefined) => (x ? ` — ${q(x.replace(/[.!?]+$/, ''))}` : '')
      const vendorLine = e.kind === 'project_po_answered' && md.via === 'link'
      const paidBy = (due: string) => (/^\d/.test(due) ? `by ${due}` : due.toLowerCase())
      const text = e.kind === 'project_po_created' ? `${actor} made the purchase order ${t} to ${v}${md.to ? ` — ${md.to}` : ''}${md.from ? `, copying ${md.from}` : ''}.`
        : e.kind === 'project_po_edited' ? `${actor} changed the purchase order ${t}${md.from && md.to && md.from !== md.to ? ` from ${md.from} to ${md.to}` : ''}.`
        : e.kind === 'project_po_submitted' ? `${actor} submitted the purchase order ${t} to ${v} (${md.to ?? ''}) for approval.`
        : e.kind === 'project_po_withdrawn' ? `${actor} took the purchase order ${t} back from approval.`
        : e.kind === 'project_po_sent_back' ? `${actor} sent the purchase order ${t} back${why(md.note)}.`
        : e.kind === 'project_po_sent' ? `${actor} sent the purchase order ${t} to ${v}${md.again ? ' again' : ''} — ${md.to ?? ''}${md.due ? `, to be paid ${paidBy(md.due)}` : ''}${md.requester ? `, approving ${md.requester}’s submission` : ''}.`
        : e.kind === 'project_po_answered' ? (vendorLine
          ? `${v} ${md.answer === 'accepted' ? `accepted the purchase order ${t} on its link` : md.answer === 'changes' ? `asked for changes to the purchase order ${t}${why(md.note)}` : `declined the purchase order ${t}${why(md.note)}`}.`
          : `${actor} marked the purchase order ${t} accepted by ${v}${how ? ` ${how}` : ''}.`)
        : e.kind === 'project_po_cancelled' ? `${actor} cancelled the purchase order ${t} to ${v}${why(md.reason)}.`
        : e.kind === 'project_po_closed' ? `${actor} closed the purchase order ${t} short at ${md.to ?? ''}${why(md.note)}.`
        : e.kind === 'project_po_removed' ? `${actor} removed the purchase order ${t} (${md.to ?? ''}) while it was a Draft.`
        : e.kind === 'project_bill_recorded' ? `${actor} recorded ${v}’s bill ${t} — ${md.to ?? ''}${md.po ? `, on ${md.po}` : ''}${md.due ? `, due ${md.due}` : ''}${md.waits ? `. It waits for an Owner’s or an Admin’s OK — ${md.waits.charAt(0).toLowerCase()}${md.waits.slice(1)}` : ''}.`
        : e.kind === 'project_bill_edited' ? `${actor} changed ${v}’s bill ${t}${md.from && md.to && md.from !== md.to ? ` from ${md.from} to ${md.to}` : ''}${md.waits ? `. It waits for an Owner’s or an Admin’s OK — ${md.waits.charAt(0).toLowerCase()}${md.waits.slice(1)}` : ''}.`
        : e.kind === 'project_bill_approved' ? `${actor} approved ${v}’s bill ${t} (${md.to ?? ''}) — it can be paid.`   // (S44R, C8) invented copy
        : e.kind === 'project_bill_removed' ? `${actor} removed ${v}’s bill ${t} (${md.to ?? ''}).`
        /* (pending modules S06) one the repeat logged on its day (the system's line), and one logged with a repeat */
        : e.kind === 'project_expense_logged' && md.day ? `The repeating expense ${t} was logged for ${md.day} — ${md.to ?? ''}${md.claim ? `, paid by ${md.claim}, to be paid back` : ''}${md.repeat ? ` (${md.repeat})` : ''}.`
        : e.kind === 'project_expense_logged' ? `${actor} logged an expense ${t} — ${md.to ?? ''}${md.claim ? `, paid by ${md.claim}, to be paid back` : ''}${md.repeat ? `, repeating ${md.repeat}` : ''}.`
        : e.kind === 'project_expense_repeat' ? (md.stopped ? (md.why === 'completed' ? `The repeat of the expense ${t} stopped — the project was handed over.` : `${actor} stopped the repeat of the expense ${t}.`) : `${actor} set the expense ${t} to repeat ${md.repeat ?? ''}.`)
        : e.kind === 'project_expense_edited' ? `${actor} changed the expense ${t} — ${md.to ?? ''}.`
        : e.kind === 'project_expense_approved' ? `${actor} approved the expense ${t} (${md.to ?? ''}).`
        : e.kind === 'project_expense_sent_back' ? `${actor} sent the expense ${t} back${why(md.note)}.`
        : e.kind === 'project_expense_removed' ? `${actor} removed the expense ${t} (${md.to ?? ''}).`
        : e.kind === 'project_payout_recorded' ? (md.claim ? `${actor} paid ${md.claim} back ${md.to ?? ''} for ${md.title ?? 'a claim'}${md.method ? ` by ${md.method.toLowerCase()}` : ''}.` : `${actor} paid ${v} ${md.to ?? ''} for ${md.title ?? ''}${md.method ? ` by ${md.method.toLowerCase()}` : ''}${md.po ? ` — ${md.po} is paid in full and closed` : ''}.`)
        : e.kind === 'project_payout_reversed' ? `${actor} reversed a payment out of ${md.to ?? ''}${why(md.reason)}.`
        : null
      const icon = e.kind.startsWith('project_po_') ? (e.kind === 'project_po_removed' || e.kind === 'project_po_cancelled' ? 'delete' : 'local_shipping') : e.kind.startsWith('project_bill_') ? 'receipt_long' : e.kind.startsWith('project_expense_') ? 'shopping_cart' : 'payments'
      const href = e.projectId ? `/projects/${e.projectId}/money${md.id && !/_removed$/.test(e.kind) && !e.kind.startsWith('project_payout_') ? `?open=${encodeURIComponent(md.id)}` : ''}` : null
      if (text) push({ id: `ev-${e.id}`, at: e.at, icon, text: text.replace(/\s+/g, ' ').replace(' .', '.'), link: href ? { label: 'See Money', href } : overview, actor: vendorLine ? v : actor })
      continue
    }
    /* (gaps build F2 — F2-Q9) A credit note: issued against its invoice, void with a reason, its refund paid. Money lines (`isMoneyEventKind`);
       each opens the Money tab on the credit note. */
    if (e.kind.startsWith('project_credit_')) {
      const cd2 = d as LeadEventDetail & { number?: string; to?: string; note?: string | null; method?: string; overpayment?: boolean; paid?: string; owed?: string }
      const n = cd2.number ?? 'a credit note'
      const inv = cd2.title ? ` against ${q(cd2.title)}` : ''
      const why = (x: string | null | undefined) => (x ? ` — ${q(x.replace(/[.!?]+$/, ''))}` : '')
      /* (pending modules S07 — D-14) an overpayment held as the client's credit, and a credit used on a later invoice *(invented copy)* */
      const text = e.kind === 'project_credit_issued' && cd2.overpayment ? `${lead.name} paid ${cd2.paid ?? ''} when ${cd2.title ? q(cd2.title) : 'the invoice'} owed ${cd2.owed ?? ''} — the extra ${cd2.to ?? ''} is their credit, ${n}.`
        : e.kind === 'project_credit_used' ? `${actor} took ${cd2.to ?? ''} of ${lead.name}’s credit ${n} off ${cd2.title ? q(cd2.title) : 'an invoice'}.`
        : e.kind === 'project_credit_issued' ? `${actor} issued the credit note ${n}${inv} — ${cd2.to ?? ''}${why(cd2.reason)}.`
        : e.kind === 'project_credit_voided' ? `${actor} made the credit note ${n} void${why(cd2.reason)}.`
        : e.kind === 'project_credit_refunded' ? `${actor} recorded the refund of ${cd2.to ?? ''} on ${n}${cd2.method ? ` by ${cd2.method === 'PayNow' ? 'PayNow' : cd2.method.toLowerCase()}` : ''}.`
        : null
      const opens = e.kind === 'project_credit_used' ? (cd2 as { invoice?: string }).invoice ?? cd2.id : cd2.id   // (pending modules S07) a credit's use opens the invoice it went on
      const href = e.projectId ? `/projects/${e.projectId}/money${opens ? `?open=${encodeURIComponent(opens)}` : ''}` : null
      if (text) push({ id: `ev-${e.id}`, at: e.at, icon: e.kind === 'project_credit_voided' ? 'cancel' : 'receipt_long', text: text.replace(/\s+/g, ' ').replace(' .', '.'), link: href ? { label: 'See Money', href } : overview, actor })
      continue
    }
    /* (gaps build F2 — F2-Q6 · Q8) Commission paid to a member, or that payment reversed — a money line, and only the member's own besides
       Owners and Admins (filtered above). Opens Finance › Commissions. */
    if (e.kind === 'project_commission_paid' || e.kind === 'project_commission_reversed') {
      const cm = d as LeadEventDetail & { to?: string; method?: string }
      const who = cm.title ?? 'a member'
      const text = e.kind === 'project_commission_paid' ? `${actor} paid ${who} ${cm.to ?? ''} commission${cm.method ? ` by ${cm.method === 'PayNow' ? 'PayNow' : cm.method.toLowerCase()}` : ''}.`
        : `${actor} reversed the ${cm.to ?? ''} commission paid to ${who}${cm.reason ? ` — ${q(cm.reason.replace(/[.!?]+$/, ''))}` : ''}.`
      push({ id: `ev-${e.id}`, at: e.at, icon: e.kind === 'project_commission_paid' ? 'workspace_premium' : 'undo', text: text.replace(/\s+/g, ' '), link: { label: 'See commission', href: '/company/finance/commissions' }, actor })
      continue
    }
    /* (Projects round 6) Money in, part two: a payment's every step — recorded by the studio, sent by the client from their portal, confirmed,
       not received, reversed — and a reminder on WhatsApp; each line opens the Money tab on the payment (or the invoice reminded). */
    if (e.kind.startsWith('project_payment_') || e.kind === 'project_invoice_reminded') {
      const pd = d as LeadEventDetail & { invoice?: string; stage?: string; to?: string; method?: string; receipt?: string | null; trusted?: boolean; due?: string; reason?: string | null; person?: string }
      const client = lead.name
      /* (fix-F, F-04) a proof sent from the portal is said under the name of who sent it — someone from the household as the household lines say them */
      const sender = e.kind === 'project_payment_submitted' && pd.person && pd.person.toLowerCase() !== lead.name.toLowerCase() ? `${pd.person}, from ${lead.name}’s household,` : client
      const inv = `the ${pd.stage ?? ''} invoice${pd.title ? ` ${q(pd.title)}` : ''}`
      const how = pd.method ? ({ bank_transfer: 'by bank transfer', paynow: 'by PayNow', cheque: 'by cheque', cash: 'in cash' } as Record<string, string>)[pd.method] ?? '' : ''
      const why = pd.reason ? ` — ${q(pd.reason.replace(/[.!?]+$/, ''))}` : ''
      const text = e.kind === 'project_payment_recorded' ? `${actor} recorded ${client}’s payment of ${pd.to ?? ''} ${how} for ${inv}${pd.receipt ? ` — receipt ${q(pd.receipt)}` : ''}.`
        : e.kind === 'project_payment_submitted' ? `${sender} said they paid ${pd.to ?? ''} ${how} for ${inv} on their portal${pd.trusted ? ' — it counts at once while the studio checks it' : ''}.`
        : e.kind === 'project_payment_confirmed' ? `${actor} confirmed ${client}’s payment of ${pd.to ?? ''} for ${inv}${pd.receipt ? ` — receipt ${q(pd.receipt)}` : ''}.`
        : e.kind === 'project_payment_not_received' ? `${actor} marked ${client}’s payment of ${pd.to ?? ''} for ${inv} as not received${why}.`
        : e.kind === 'project_payment_reversed' ? `${actor} reversed the payment of ${pd.to ?? ''} for ${inv}${pd.receipt ? ` (receipt ${q(pd.receipt)})` : ''}${why}.`
        : `${actor} reminded ${client} on WhatsApp about ${inv} — ${pd.to ?? ''}${pd.due ? `, due ${pd.due}` : ''}.`
      const href = e.projectId ? `/projects/${e.projectId}/money${pd.id ? `?open=${encodeURIComponent(pd.id)}` : ''}` : null
      push({ id: `ev-${e.id}`, at: e.at, icon: e.kind === 'project_payment_not_received' || e.kind === 'project_payment_reversed' ? 'error' : e.kind === 'project_invoice_reminded' ? 'chat' : 'payments',
             text: text.replace(/\s+/g, ' ').replace(' .', '.'), link: href ? { label: 'See Money', href } : overview, actor: e.kind === 'project_payment_submitted' ? (pd.person ?? client) : actor })
      continue
    }
    /* (gaps build B) Money in, complete: a one-off or a variation order's own invoice made, a Draft of theirs removed, an invoice recorded from
       elsewhere, a Draft's description / note / due day changed, the approvers reminded, a project's own split set, and the void of an invoice
       that is not a stage's (no fresh Draft takes its share). Before round 5's branch, which takes every `project_invoice_…`. */
    if (e.kind === 'project_invoice_created' || e.kind === 'project_invoice_removed' || e.kind === 'project_invoice_recorded' || e.kind === 'project_invoice_details'
        || e.kind === 'project_invoice_approver_reminded' || e.kind === 'project_split_set' || (e.kind === 'project_invoice_voided' && !!d.kind && d.kind !== 'stage')) {
      const bd = d as LeadEventDetail & { stage?: string; to?: string; reason?: string | null; vo?: string; ref?: string | null; what?: string[]; due?: string; names?: string[] }
      const inv = bd.kind === 'variation' ? `${bd.vo ?? bd.stage ?? 'the variation order'}’s own invoice` : `the ${bd.stage ?? ''} invoice`
      const text = e.kind === 'project_invoice_created'
        ? (bd.kind === 'variation' ? `${actor} billed the variation order ${q(bd.vo ?? bd.stage ?? '')} on its own — a Draft for ${bd.to ?? ''}.` : `${actor} made a one-off invoice, ${q(bd.stage ?? '')} (${(bd.reason ?? 'one-off').toLowerCase()}) — a Draft for ${bd.to ?? ''}.`)
        : e.kind === 'project_invoice_removed' ? `${actor} removed ${inv} (${bd.to ?? ''}) while it was a Draft.`
        : e.kind === 'project_invoice_recorded' ? `${actor} recorded the invoice ${q(bd.ref ?? '')} made outside OpenMaison — ${bd.to ?? ''}${bd.stage ? ` for the ${bd.stage} stage` : ', outside the payment schedule'}.`
        : e.kind === 'project_invoice_details' ? `${actor} changed ${inv}’s ${(bd.what ?? ['details']).join(', ')}${bd.due ? ` — due ${bd.due === 'handover day' ? 'on handover day' : bd.due}` : ''}.`
        : e.kind === 'project_invoice_approver_reminded' ? `${actor} reminded the approvers about ${inv} (${bd.to ?? ''}).`
        : e.kind === 'project_split_set' ? `${actor} set the project’s payment split — ${(bd.names ?? []).join(' · ')}.`
        : `${actor} voided ${inv}${bd.title ? ` ${q(bd.title)}` : ''}${bd.reason ? ` — ${q(bd.reason.replace(/[.!?]+$/, ''))}` : ''}.`
      const href = e.projectId ? `/projects/${e.projectId}/money${bd.id && e.kind !== 'project_invoice_removed' && e.kind !== 'project_split_set' ? `?open=${encodeURIComponent(bd.id)}` : ''}` : null
      push({ id: `ev-${e.id}`, at: e.at, icon: e.kind === 'project_invoice_approver_reminded' ? 'notifications' : e.kind === 'project_invoice_removed' ? 'delete' : 'payments',
             text: text.replace(/\s+/g, ' ').replace(' .', '.'), link: href ? { label: 'See Money', href } : overview, actor })
      continue
    }
    /* (Projects round 5) Money in: a variation order made and approved, the rebalance that followed, an invoice's every step — each line
       opens the project's Money tab (an invoice's lands on it). */
    if (e.kind.startsWith('project_vo_') || e.kind.startsWith('project_invoice_') || e.kind === 'project_money_rebalanced') {
      const md = d as LeadEventDetail & { number?: string; from?: string; to?: string; via?: string; stage?: string; due?: string; note?: string; reason?: string | null }
      const how = md.via === 'link' ? 'on its confirmation link' : md.via === 'marked' ? '— marked by the studio' : md.via ? `— ${({ in_person: 'in person', whatsapp: 'on WhatsApp', email: 'by email', paper: 'on paper' } as Record<string, string>)[md.via] ?? md.via}, recorded by ${actor === 'You' ? 'you' : actor}` : ''   // (fix-D, D-42) "recorded by you" mid-sentence
      const stage = md.stage ? `the ${md.stage} invoice` : 'an invoice'
      const named = md.title && md.title !== md.number ? md.title : ''
      /* (simplify round 2) a client's priced pick on the portal drafts its order on the system path (no member) — the line names the pick, never "System" */
      const fromPick = e.kind === 'project_vo_created' && actor === 'System' && !!(md as { choice?: string }).choice
      const text = fromPick ? `The variation order ${md.number ? q(md.number) : ''} was drafted from ${lead.name}’s pick${named ? ` (${named})` : ''} — a draft until the studio sends it.`
        : e.kind === 'project_vo_created' ? `${actor} started the variation order ${md.number ? q(md.number) : ''}${named ? ` (${named})` : ''}.`
        : e.kind === 'project_vo_approved' ? `${md.name ?? lead.name} approved the variation order ${q(md.number ?? '')} ${how} — the contract went from ${md.from ?? ''} to ${md.to ?? ''}.`
        /* (fix-D, D-01) an approved order revised: its approval stops counting and the contract moves back */
        : e.kind === 'project_vo_reopened' ? `${actor} started a new version of the variation order ${q(md.number ?? '')} — its approval no longer counts until ${lead.name} approves it; the contract went from ${md.from ?? ''} back to ${md.to ?? ''}.`
        /* (gaps build D, item 2 — M-07) declined on its confirmation link, with the client's reason */
        : e.kind === 'project_vo_declined' ? `${(md as { person?: string }).person ?? lead.name} declined the variation order ${q(md.number ?? '')} on its confirmation link${md.note ? ` — ${q(md.note.replace(/[.!?]+$/, ''))}` : ''}.`
        : e.kind === 'project_money_rebalanced' ? `The unsent invoices were re-sized to the ${md.to ?? ''} contract — ${(md.names ?? []).join(', ') || `${md.n ?? 0} invoice${md.n === 1 ? '' : 's'}`}.`
        : e.kind === 'project_invoice_submitted' ? `${actor} submitted ${stage} (${md.to ?? ''}) for approval.`
        : e.kind === 'project_invoice_sent_back' ? `${actor} sent ${stage} back${md.note ? ` — ${q(md.note.replace(/[.!?]+$/, ''))}` : ''}.`
        : e.kind === 'project_invoice_sent' ? `${actor} sent ${stage} ${md.title ? q(md.title) : ''} to ${lead.name} — ${md.to ?? ''}, due ${md.due ?? ''}.`
        : e.kind === 'project_invoice_voided' ? `${actor} voided ${stage} ${md.title ? q(md.title) : ''}${md.reason ? ` — ${q(md.reason.replace(/[.!?]+$/, ''))}` : ''}; a fresh Draft took its share.`
        : e.kind === 'project_invoice_edited' ? `${actor} changed ${stage} from ${md.from ?? ''} to ${md.to ?? ''}${md.reason ? ` — ${q(md.reason.replace(/[.!?]+$/, ''))}` : ''}.`
        : null
      const href = e.projectId ? `/projects/${e.projectId}/money${e.kind.startsWith('project_invoice_') && md.id ? `?open=${encodeURIComponent(md.id)}` : ''}` : null
      if (text) push({ id: `ev-${e.id}`, at: e.at, icon: e.kind.startsWith('project_vo_') ? 'request_quote' : 'payments', text: text.replace(/\s+/g, ' ').replace(' .', '.'), link: href ? { label: 'See Money', href } : overview, actor: fromPick ? lead.name : e.kind === 'project_vo_approved' && md.via === 'link' ? (md.name ?? lead.name) : e.kind === 'project_vo_declined' ? ((md as { person?: string }).person ?? lead.name) : actor,
        ...(e.kind === 'project_vo_created' && md.id && askVos.has(md.id) ? { twin: true } : {}) })   // (simplify round 2) the ask's line says it under All
      continue
    }
    /* ── (parity map 2026-10-10) each package's own lines, in its own region — Edit inside yours only; every new `lead_events` kind here is
       `parity_<pkg>_…` so no other branch takes it. Before round 1's branch, which takes every `project_…`. ── */
    /* region P-A (money in) */
    /* end P-A */
    /* region P-B (money out) */
    /* (parity map, MO-038 · MO-094) a PO made elsewhere recorded (and that record removed), a PO marked delivered — money lines: a viewer
       refused the project's money reads none of them (`seesMoney` above; isMoneyEventKind does not know these kinds) */
    if (e.kind === 'parity_b_po_recorded' || e.kind === 'parity_b_po_unrecorded' || e.kind === 'parity_b_po_delivered') {
      if (!seesMoney) continue
      const bd = d as LeadEventDetail & { to?: string; vendor?: string; due?: string }
      const t = bd.title ? q(bd.title) : ''
      const v = bd.vendor ?? 'the vendor'
      const text = e.kind === 'parity_b_po_recorded' ? `${actor} recorded the purchase order ${t} to ${v}, made elsewhere — ${bd.to ?? ''}.`
        : e.kind === 'parity_b_po_unrecorded' ? `${actor} removed the record of the purchase order ${t} (${bd.to ?? ''}).`
        : `${actor} marked the purchase order ${t} delivered by ${v}${bd.due ? ` — it was expected ${bd.due}` : ''}.`
      const href = e.projectId ? `/projects/${e.projectId}/money${bd.id && e.kind !== 'parity_b_po_unrecorded' ? `?open=${encodeURIComponent(bd.id)}` : ''}` : null
      push({ id: `ev-${e.id}`, at: e.at, icon: e.kind === 'parity_b_po_unrecorded' ? 'delete' : 'local_shipping', text: text.replace(/\s+/g, ' ').replace(' .', '.'), link: href ? { label: 'See Money', href } : overview, actor })
      continue
    }
    /* end P-B */
    /* region P-C (books) */
    /* (parity map, FB-057 — 1.0 D-213 · D-214) Commission on the project: a rate set, changed or removed (the project's own, or a member's there),
       a member's ask for another rate, its answer and its withdrawal (lib/finance/books.ts `logCommissionEvent`). A line about one member reads
       for them and for Owners and Admins only (F2-Q8, as commission paid); the project's own rate for whoever sees its money. Each opens the
       project's Commission dialog. Invented copy. */
    if (e.kind.startsWith('parity_c_commission_')) {
      const cd = d as LeadEventDetail & { memberId?: string | null; title?: string | null; from?: string | null; to?: string | null; removed?: boolean; answer?: string; note?: string | null; reason?: string | null }
      const meId = ME, meRuns = runsBooks(byMember.get(meId)?.role)
      if (!seesMoney || (cd.memberId && !meRuns && cd.memberId !== meId)) continue
      const whom = cd.memberId ? (cd.memberId === meId ? 'you' : cd.title ?? 'a member') : null
      const why = (x: string | null | undefined) => (x ? ` — ${q(x.replace(/[.!?]+$/, ''))}` : '')
      const low = (x: string | null | undefined) => (x ? x.charAt(0).toLowerCase() + x.slice(1) : '')
      const text = e.kind === 'parity_c_commission_rule'
        ? (cd.removed
          ? (whom ? `${actor} removed ${whom === 'you' ? 'your' : `${whom}’s`} rate on the project (${low(cd.from)}) — the next rule up applies.` : `${actor} set the project back to the studio’s rule — it was ${low(cd.from)}.`)
          : (whom ? `${actor} set ${whom === 'you' ? 'your' : `${whom}’s`} commission on the project to ${low(cd.to)}${cd.from ? ` (was ${low(cd.from)})` : ''}.` : `${actor} set the project’s commission to ${low(cd.to)}${cd.from ? ` (was ${low(cd.from)})` : ''}.`))
        : e.kind === 'parity_c_commission_asked' ? `${actor} asked for ${low(cd.to)} on the project${why(cd.reason)}.`
        : e.kind === 'parity_c_commission_answered' ? `${actor} ${cd.answer === 'approved' ? 'approved' : 'declined'} ${whom === 'you' ? 'your' : `${whom ?? 'a member'}’s`} ask for ${low(cd.to)}${why(cd.note)}.`
        : e.kind === 'parity_c_commission_withdrawn' ? `${actor} took back the ask for ${low(cd.to)}.`
        : null
      if (text) push({ id: `ev-${e.id}`, at: e.at, icon: 'workspace_premium', text: text.replace(/\s+/g, ' '), link: e.projectId ? { label: 'See commission', href: `/projects/${e.projectId}?commission=1` } : overview, actor, group: 'money' })
      continue
    }
    /* end P-C */
    /* region P-E (the record & the schedule) */
    /* (parity map, PR-058 · SC-094 · SC-056 — P-E; invented copy) a project duplicated (on the copy: where it came from and what came with it; on
       the source: the copy it made), an approved variation order's days answered (the schedule moved, the days asked for, or Not now), and
       suggested tasks added (lib/projects/create.ts `logParityEvent`). Each opens where its record is. */
    if (e.kind.startsWith('parity_e_')) {
      const pd = d as LeadEventDetail & { fromId?: string; fromNumber?: string; fromName?: string; toId?: string; toNumber?: string; toName?: string; quote?: string | null
        number?: string; days?: number; answer?: string; milestoneId?: string; to?: string; source?: string }
      const days = (k: number | undefined) => `${k ?? 0} ${k === 1 ? 'day' : 'days'}`
      const plain = (k: number | undefined, one: string) => `${k ?? 0} ${k === 1 ? one : `${one}s`}`
      const came = [pd.n ? `its schedule (${plain(pd.n, 'milestone')}, re-dated)` : '', pd.quote ? `a draft of its signed quote, ${pd.quote}` : ''].filter(Boolean)
      const text = e.kind === 'parity_e_duplicated'
        ? `${actor} duplicated ${pd.fromNumber ? `${pd.fromNumber} ` : ''}${q(pd.fromName ?? '')} as this project${came.length ? ` — with ${came.join(' and ')}` : ''}.`
        : e.kind === 'parity_e_duplicated_to' ? `${actor} duplicated this project as ${pd.toNumber ? `${pd.toNumber} ` : ''}${q(pd.toName ?? '')}.`
        : e.kind === 'parity_e_vo_days'
          ? (pd.answer === 'moved' ? `${actor} moved the schedule for ${pd.number ?? 'a variation order'}: ${q(pd.title ?? '')} runs ${days(pd.days)} longer${pd.to ? ` — it ends ${pd.to}` : ''}${pd.n ? `, and ${plain(pd.n, 'milestone')} moved with it` : ''}.`
            : pd.answer === 'asked' ? `${actor} asked for ${days(pd.days)} more on ${q(pd.title ?? '')} for ${pd.number ?? 'a variation order'}.`
            : `${actor} kept the schedule as it was — ${pd.number ?? 'a variation order'} adds ${days(pd.days)}.`)
        : e.kind === 'parity_e_tasks_suggested' ? `${actor} added ${plain(pd.n, 'suggested task')}${pd.source === 'quote' ? ' from the signed quote' : pd.title ? ` to ${q(pd.title)}` : ''}.`
        : null
      const href = !e.projectId ? null
        : e.kind === 'parity_e_duplicated' && pd.fromId ? `/projects/${pd.fromId}`
        : e.kind === 'parity_e_duplicated_to' && pd.toId ? `/projects/${pd.toId}`
        : e.kind === 'parity_e_tasks_suggested' ? `/projects/${e.projectId}/${pd.source === 'quote' ? 'tasks' : `schedule${pd.id ? `?open=${encodeURIComponent(pd.id)}` : ''}`}`
        : `/projects/${e.projectId}/schedule${pd.milestoneId ? `?open=${encodeURIComponent(pd.milestoneId)}` : ''}`
      const label = e.kind === 'parity_e_duplicated' || e.kind === 'parity_e_duplicated_to' ? 'See Project' : e.kind === 'parity_e_tasks_suggested' && pd.source === 'quote' ? 'See Tasks' : 'See Schedule'
      if (text) push({ id: `ev-${e.id}`, at: e.at, icon: e.kind.startsWith('parity_e_duplicated') ? 'content_copy' : e.kind === 'parity_e_tasks_suggested' ? 'ballot' : 'calendar_month',
        text: text.replace(/\s+/g, ' ').replace(/“” ?/g, ''), link: href ? { label, href } : overview, actor,
        group: e.kind === 'parity_e_tasks_suggested' ? 'tasks' : e.kind.startsWith('parity_e_duplicated') ? 'stage' : 'schedule' })
      continue
    }
    /* end P-E */
    /* region P-F (the portal) */
    /* end P-F */
    /* region P-G (conversations) */
    /* end P-G */
    /* region P-H (tasks & design) */
    /* (parity map, TD-049 · UC-094) the studio asked the client for their floor plan, from the Floor plan's first run (app/projects/floor-plan-actions.ts) */
    if (String(e.kind) === 'parity_h_floor_plan_asked') {
      const again = (d as LeadEventDetail & { again?: boolean }).again
      push({ id: `ev-${e.id}`, at: e.at, icon: 'upload_file', text: `${actor} asked ${lead.name} for their floor plan${again ? ' again' : ''} — the ask waits on their page until a plan arrives.`,
             link: e.projectId ? { label: 'See Floor plan', href: `/projects/${e.projectId}/floor-plan` } : overview, actor, group: 'floorplan' })
      continue
    }
    /* end P-H */
    /* region P-J (the planner) */
    /* end P-J */
    /* region S45B (contractors on site — H-UHD-2, her "build everything and complete it" 2026-10-17; invented copy) a contractor put on the
       project, moved to another milestone or dates, marked planned / on site / done, Leader checked (and the check taken off), taken off it
       (app/projects/contractor-actions.ts). Each opens the project's Schedule with its Contractors open. */
    if (e.kind.startsWith('project_contractor_')) {
      const cd = d as LeadEventDetail & { vendor?: string; trade?: string; from?: string; to?: string; status?: string }
      const v = cd.vendor ?? 'A contractor'
      const tr = cd.trade ?? ''
      const on = cd.title ? q(cd.title) : 'the project'
      const text = e.kind === 'project_contractor_assigned' ? `${actor} put ${v} on ${on} for ${tr}${cd.to && cd.to !== 'No dates' ? ` — ${cd.to}` : ''}${cd.status === 'on_site' ? ', on site already' : ''}.`
        : e.kind === 'project_contractor_moved' ? `${actor} moved ${v} (${tr}) to ${cd.title ? q(cd.title) : 'dates of their own'} — ${cd.from ?? ''} → ${cd.to ?? ''}.`
        : e.kind === 'project_contractor_status' ? `${actor} marked ${v} ${(cd.to ?? '').toLowerCase()} for ${tr}${cd.title ? ` on ${q(cd.title)}` : ''}.`
        : e.kind === 'project_contractor_checked' ? `${actor} marked ${v}’s ${tr} work Leader checked.`
        : e.kind === 'project_contractor_unchecked' ? `${actor} took the Leader check off ${v}’s ${tr} work.`
        : e.kind === 'project_contractor_removed' ? `${actor} took ${v} off ${on} (${tr}).`
        : null
      if (text) push({ id: `ev-${e.id}`, at: e.at, icon: e.kind === 'project_contractor_removed' ? 'delete' : e.kind === 'project_contractor_checked' ? 'verified' : 'handyman', text: text.replace(/\s+/g, ' '),
                       link: e.projectId ? { label: 'See the schedule', href: `/projects/${e.projectId}/schedule?crew=1` } : overview, actor, group: 'schedule' })
      continue
    }
    /* end S45B */
    /* region S02 (client links — pending modules 2026-10-11) */
    /* (S02 — 1.0's live preview link) a quote's view-only link made and stopped (app/quotes/view-link-actions.ts); Stop's Undo takes its line
       away. Each opens the lead's Quotes. Invented copy. */
    if (String(e.kind) === 'parity_s02_quote_view_shared' || String(e.kind) === 'parity_s02_quote_view_stopped') {
      const made = String(e.kind) === 'parity_s02_quote_view_shared'
      push({ id: `ev-${e.id}`, at: e.at, icon: made ? 'link' : 'link_off', text: made ? `${actor} made a view-only link to the quote ${q(d.title ?? '')} for ${lead.name}.` : `${actor} stopped the view-only link to the quote ${q(d.title ?? '')}.`,
             link: { label: 'See Quote', href: `${base}/quotes` }, actor })
      continue
    }
    /* end S02 */
    /* region S03 (contracts leftovers — pending modules 2026-10-11) */
    /* (S03 — 1.0's resend-signature · cancel-signature) a signing link renewed by a reminder or Renew, and stopped (back to Draft, a new key);
       Stop's Undo takes its line away (app/contracts/actions.ts). Each opens the lead's Contracts. Invented copy. */
    if (String(e.kind) === 'parity_s03_contract_link_stopped' || String(e.kind) === 'parity_s03_contract_reminded' || String(e.kind) === 'parity_s03_contract_renewed') {
      const k = String(e.kind)
      const until = d.when && Number.isFinite(Number(d.when)) ? displayDate(new Date(Number(d.when))) : null
      const text = k === 'parity_s03_contract_link_stopped'
        ? `${actor} stopped the signing link for the contract ${q(d.title ?? '')}${(d.n ?? 1) > 1 ? ` and the ${d.n} documents sent with it` : ''} — it went back to Draft, and the old link no longer opens.`
        : k === 'parity_s03_contract_reminded'
          ? `${actor} sent ${d.name ?? 'the client'} a reminder to sign the contract ${q(d.title ?? '')}${until ? ` — the link is open until ${until}` : ''}.`
          : `${actor} opened the signing link for the contract ${q(d.title ?? '')} again${until ? `, until ${until}` : ''}.`
      push({ id: `ev-${e.id}`, at: e.at, icon: k === 'parity_s03_contract_link_stopped' ? 'link_off' : 'link', text, link: { label: 'See Contracts', href: `${base}/contracts` }, actor })
      continue
    }
    /* end S03 */
    /* (Projects round 7) The ending: a handover asked for review and sent back, completed (anyway, with the items left and the reason; or
       approving someone's request), reopened, deleted, restored, deleted forever. Before round 1's branch, which takes every `project_…`. */
    if (e.kind.startsWith('project_handover_') || e.kind === 'project_completed' || e.kind === 'project_reopened' || e.kind === 'project_deleted' || e.kind === 'project_restored' || e.kind === 'project_purged') {
      const ed = d as LeadEventDetail & { number?: string; note?: string | null; open?: string[]; requester?: string; deferred?: { item: string; reason: string }[] }
      const named = `${q(ed.name ?? '')}${ed.number ? ` (${ed.number})` : ''}`
      const why = (s: string | null | undefined) => (s ? ` — ${q(s.replace(/[.!?]+$/, ''))}` : '')
      /* (fix-E, E-03) the items as they stood open — a record written before the fix named them by the met state's words */
      const open = ed.open?.length ? ` with ${ed.open.length === 1 ? 'one item' : `${ed.open.length} items`} open (${ed.open.map(openPhrase).join('; ')})` : ''
      /* (gaps build, package A) the items deferred, each with its own reason */
      const deferredWords = ed.deferred?.length ? ` Deferred: ${ed.deferred.map((x) => `${x.item} — ${q(x.reason.replace(/[.!?]+$/, ''))}`).join('; ')}.` : ''
      /* (fix-E, E-23) whose handover went back: "Dane sent Sarah's handover back" */
      const whose = ed.memberId ? (who(ed.memberId) === 'You' ? 'your' : `${who(ed.memberId)}’s`) : 'the'
      const text = e.kind === 'project_handover_requested' ? `${actor} asked for the handover to be reviewed${open}${why(ed.note)}.${deferredWords}`
        : e.kind === 'project_handover_sent_back' ? `${actor} sent ${whose} handover back${why(ed.note)}.`
        /* (fix-E, E-24) the note reaches the record too — after the reason when there is one */
        : e.kind === 'project_completed' ? `${actor} ${ed.requester ? `approved ${ed.requester}’s handover` : 'completed the handover'} — the project is completed${open}${why(ed.reason)}.${deferredWords}${ed.note && !ed.requester ? ` Note: ${q(ed.note.replace(/[.!?]+$/, ''))}.` : ''}`
        : e.kind === 'project_reopened' ? `${actor} reopened the project${why(ed.reason)}.`
        : e.kind === 'project_deleted' ? `${actor} deleted the project ${named}.`
        : e.kind === 'project_restored' ? `${actor} restored the project ${named}.`
        : e.kind === 'project_purged' ? `${actor} deleted the project ${named} forever.`
        : null
      const gone = e.kind === 'project_deleted' || e.kind === 'project_purged'
      if (text) push({ id: `ev-${e.id}`, at: e.at, icon: e.kind === 'project_completed' ? 'task_alt' : gone ? 'delete' : e.kind === 'project_reopened' || e.kind === 'project_restored' ? 'undo' : 'approval', text,
                       link: e.projectId && !gone ? { label: 'See Project', href: `/projects/${e.projectId}` } : overview, actor, group: 'stage' })
      continue
    }
    /* (gaps build, package A — M-01) On hold and resumed, with the reason and the resume day; a direct project's client and property changed
       (the portal's sign-in moved with the phone). Before round 1's branch, which takes every `project_…`. */
    if (e.kind === 'project_put_on_hold' || e.kind === 'project_resumed' || e.kind === 'project_client_edited') {
      const hd = d as LeadEventDetail & { again?: boolean; late?: boolean }
      const text = e.kind === 'project_put_on_hold'
        ? `${actor} ${hd.again ? 'changed the hold on' : 'put'} the project${hd.again ? '' : ' on hold'}${hd.reason ? ` — ${q(hd.reason.replace(/[.!?]+$/, ''))}` : ''}${hd.when ? `; it resumes ${displayDate(new Date(hd.when))}` : ''}.`
        : e.kind === 'project_resumed' ? `${actor} resumed the project${hd.late ? ' — after the day it was to resume' : ''}.`
        : `${actor} changed the client’s details — ${(hd.fields ?? []).map((f) => `${f.label}: ${shownField(f.key, f.from)} → ${shownField(f.key, f.to)}`).join('; ')}.${hd.phone ? ` ${lead.name} now signs in to the portal with ${hd.phone}.` : ''}`
      push({ id: `ev-${e.id}`, at: e.at, icon: e.kind === 'project_put_on_hold' ? 'pending' : e.kind === 'project_resumed' ? 'restart_alt' : 'edit', text,
             link: e.projectId ? { label: 'See Project', href: `/projects/${e.projectId}` } : overview, actor, group: 'stage' })
      continue
    }
    /* (gaps build H, H-Q24) Tickets — raised (by the client on their portal, or the studio for them), given to someone, escalated, resolved,
       reopened, closed by the client. A reply's words live in the ticket's thread. Before round 1's branch, which takes every `project_…`. */
    if (e.kind.startsWith('project_ticket_')) {
      const td = d as LeadEventDetail & { by?: 'client' | 'studio'; person?: string; to?: string; note?: string; kind?: string }
      const client = td.person ?? lead.name
      const by = td.by === 'client' ? client : actor
      const what = `${td.kind ?? 'a ticket'}${td.title ? ` — ${q(td.title)}` : ''}`
      const text = e.kind === 'project_ticket_raised' ? (td.by === 'client' ? `${client} reported an issue on their portal: ${what}.` : `${actor} raised ${what} for ${lead.name}.`)
        : e.kind === 'project_ticket_assigned' ? (td.to ? `${actor} gave ${td.kind ?? 'a ticket'} to ${td.to}.` : `${actor} took ${td.kind ?? 'a ticket'} off whoever looked after it.`)
        : e.kind === 'project_ticket_escalated' ? `${actor} escalated ${what}${td.note ? ` — ${q(td.note.replace(/[.!?]+$/, ''))}` : ''}.`
        : e.kind === 'project_ticket_resolved' ? `${actor} marked ${what} resolved.`
        : e.kind === 'project_ticket_reopened' ? `${by} reopened ${what}.`
        : e.kind === 'project_ticket_closed' ? `${client} closed ${what} on their portal.`
        : null
      const icon = e.kind === 'project_ticket_resolved' ? 'check_circle' : e.kind === 'project_ticket_escalated' ? 'flag' : e.kind === 'project_ticket_assigned' ? 'person' : e.kind === 'project_ticket_closed' ? 'lock' : 'handyman'
      const href = e.projectId ? `/projects/${e.projectId}/tickets${td.id ? `?open=${encodeURIComponent(td.id)}` : ''}` : null
      if (text) push({ id: `ev-${e.id}`, at: e.at, icon, text, link: href ? { label: 'See Ticket', href } : overview,
                       actor: td.by === 'client' ? client : actor, group: 'tickets' })
      continue
    }
    /* (simplify round 2, S-22) The client asks — "Dane made a task from Benjamin Han’s message — “…”" · "Dane raised VO-3 from Mei Ling Han’s
       ticket T-2026-004 — “…”": under the Messages or Tickets chip (where the ask was), opening the task or the order while it is still there,
       else the message or ticket. The task's own line and the order's stay in their chips (the floor plan's mark does the same). An order's
       line is money: a viewer refused the project's money reads none of it. Before round 1's branch, which takes every `project_…`. */
    if (e.kind === 'project_ask_task' || e.kind === 'project_ask_vo') {
      const ad = d as LeadEventDetail & { source?: 'message' | 'ticket'; ref?: string; number?: string }
      if (!e.projectId || !ad.ref || (e.kind === 'project_ask_vo' && !seesMoney)) continue
      const tk = ad.source === 'ticket' ? askTickets.find((x) => x.id === ad.ref) : undefined
      const client = ad.source === 'ticket' ? (tk?.kind === 'client' ? tk.name : lead.name) : askMsgs.find((x) => x.id === ad.ref)?.name ?? lead.name
      const from = ad.source === 'ticket' ? `${client}’s ticket${tk?.number ? ` ${tk.number}` : ''}` : `${client}’s message`
      const said = ad.title ? ` — ${q(ad.title)}` : ''
      const vo = e.kind === 'project_ask_vo' ? qs.find((x) => x.id === ad.id) : undefined
      const text = e.kind === 'project_ask_task' ? `${actor} made a task from ${from}${said}.` : `${actor} raised ${vo?.number ?? ad.number ?? 'a variation order'} from ${from}${said}.`
      const source = ad.source === 'ticket' ? { label: 'See Ticket', href: `/projects/${e.projectId}/tickets?open=${encodeURIComponent(ad.ref)}` } : { label: 'See Messages', href: `/projects/${e.projectId}/messages` }
      const link = e.kind === 'project_ask_task'
        ? (ad.id && tasks.some((t) => t.id === ad.id) ? { label: 'See Task', href: `${base}/tasks?open=${ad.id}` } : source)
        : (vo && !vo.deletedAt ? { label: `Open ${vo.number}`, href: `/quotes/${vo.id}` } : source)   // (invented copy) the ask menu's "Open VO-n"
      push({ id: `ev-${e.id}`, at: e.at, icon: e.kind === 'project_ask_task' ? 'task' : 'request_quote', text, link, actor, group: ad.source === 'ticket' ? 'tickets' : 'messages' })
      continue
    }
    /* (gaps build J, J-Q17) The 3D Space Planner — a layout started for the project, shared with the client, its changes shared, sharing
       stopped, the client's first open, a personal layout linked to the project, a layout deleted and restored. Not every move of a sofa.
       Before round 1's branch, which takes every `project_…`. */
    if (e.kind.startsWith('project_layout_')) {
      const ld = d as LeadEventDetail & { by?: 'client' | 'studio'; person?: string; again?: boolean; carried?: boolean; photo?: string }
      const client = ld.person ?? lead.name
      const layout = q(ld.title ?? 'the layout')
      const text = e.kind === 'project_layout_created' ? `${actor} started the 3D layout ${layout}${ld.kind ? ` from the ${ld.kind} template` : ld.photo ? ` on the floor-plan photo ${q(ld.photo)}` : ''}.`   /* (pending modules S28) traced on a photo */
        : e.kind === 'project_layout_shared' ? `${actor} ${ld.again ? 'shared the 3D layout ' + layout + ' again' : 'shared the 3D layout ' + layout + ' with ' + lead.name}.`
        : e.kind === 'project_layout_share_updated' ? `${actor} shared the changes to the 3D layout ${layout}.`
        : e.kind === 'project_layout_unshared' ? `${actor} stopped sharing the 3D layout ${layout} — its link ended.`
        : e.kind === 'project_layout_viewed' ? `${client} opened the 3D layout ${layout}.`
        : e.kind === 'project_layout_linked' ? (ld.carried ? `The 3D layout ${layout}, started on the lead, is now the project’s.` : `${actor} linked the 3D layout ${layout} to the project.`)   // (pending modules S07) carried at Won
        : e.kind === 'project_layout_deleted' ? `${actor} deleted the 3D layout ${layout}.`
        : e.kind === 'project_layout_restored' ? `${actor} restored the 3D layout ${layout}.`
        : null
      const icon = e.kind === 'project_layout_viewed' ? 'visibility' : e.kind === 'project_layout_unshared' ? 'link_off' : e.kind.includes('shared') || e.kind === 'project_layout_share_updated' ? 'send' : e.kind === 'project_layout_deleted' ? 'delete' : 'view_in_ar'
      const gone = e.kind === 'project_layout_deleted'
      if (text) push({ id: `ev-${e.id}`, at: e.at, icon, text, link: ld.id && !gone ? { label: 'See Layout', href: `/planner/${encodeURIComponent(ld.id)}` } : overview,
                       actor: ld.by === 'client' ? client : actor, group: 'layouts' })
      continue
    }
    /* (gaps build G, G-Q18) The floor plan — a plan added (by the studio or the client), made the main plan, renamed, put away and back, its
       scale set; a mark resolved or reopened, a task or a variation order raised from one; the client's confirmation of a layout. Not every
       stroke: a mark's own words live on the plan. Before round 1's branch, which takes every `project_…`. */
    if (e.kind.startsWith('project_floor_plan_')) {
      const fd = d as LeadEventDetail & { by?: 'client' | 'studio'; person?: string; mark?: string; task?: string; vo?: string; scale?: string; from?: string; to?: string; note?: string | null; again?: boolean; carried?: boolean }
      const client = fd.person ?? lead.name
      const by = fd.by === 'client' ? client : actor
      const plan = q(fd.title ?? 'the plan')
      const text = e.kind === 'project_floor_plan_added' ? (fd.carried ? `The floor plan ${plan}, kept on the lead for its 3D layout, is now on the project’s Floor plan.` : `${by} added the floor plan ${plan}${fd.again ? ' and made it the main plan' : ''}.`)   /* (pending modules S28) carried at Won */
        : e.kind === 'project_floor_plan_main' ? `${actor} made ${plan} the main plan — the one ${lead.name} opens on.`
        : e.kind === 'project_floor_plan_renamed' ? `${actor} renamed the floor plan ${q(fd.from ?? '')} to ${q(fd.to ?? '')}.`
        : e.kind === 'project_floor_plan_put_away' ? `${actor} put the floor plan ${plan} away — its marks are kept.`
        : e.kind === 'project_floor_plan_restored' ? `${actor} put the floor plan ${plan} back.`
        : e.kind === 'project_floor_plan_scale' ? `${actor} set the scale of ${plan}${fd.scale ? ` from a length of ${fd.scale}` : ''}.`
        : e.kind === 'project_floor_plan_resolved' ? `${by} marked ${fd.mark ? q(fd.mark) : 'a mark'} on ${plan} resolved.`
        : e.kind === 'project_floor_plan_reopened' ? `${by} reopened ${fd.mark ? q(fd.mark) : 'a mark'} on ${plan}.`
        : e.kind === 'project_floor_plan_task' ? `${actor} made the task ${q(fd.task ?? '')} from ${fd.mark ? q(fd.mark) : 'a mark'} on ${plan}.`
        : e.kind === 'project_floor_plan_vo' ? `${actor} raised the variation order ${fd.vo ?? ''} from ${fd.mark ? q(fd.mark) : 'a mark'} on ${plan}.`
        : e.kind === 'project_floor_plan_confirmed' ? `${client} confirmed the layout ${plan} on their portal${fd.note ? ` — ${q(fd.note.replace(/[.!?]+$/, ''))}` : ''}.`
        : null
      const icon = e.kind === 'project_floor_plan_confirmed' ? 'verified' : e.kind === 'project_floor_plan_task' ? 'task' : e.kind === 'project_floor_plan_vo' ? 'request_quote' : e.kind === 'project_floor_plan_resolved' ? 'check_circle' : 'space_dashboard'
      const href = e.projectId ? `/projects/${e.projectId}/floor-plan${fd.id ? `?plan=${encodeURIComponent(fd.id)}` : ''}` : null
      if (text) push({ id: `ev-${e.id}`, at: e.at, icon, text, link: href ? { label: 'See Floor plan', href } : overview,
                       actor: fd.by === 'client' ? client : actor, group: 'floorplan' })
      continue
    }
    /* (gaps build I, I-Q10 · I-Q11) Compliance — an item answered Done or Not needed or put back to To do, and the starter tasks a new project was
       given. Before round 1's branch, which takes every `project_…`. */
    if (e.kind.startsWith('project_compliance_')) {
      const cd = d as LeadEventDetail & { item?: string; n?: number }
      const item = q(cd.title ?? 'an item')
      const text = e.kind === 'project_compliance_done' ? `${actor} marked ${item} done on the compliance checklist.`
        : e.kind === 'project_compliance_not_needed' ? `${actor} marked ${item} not needed on the compliance checklist.`
        : e.kind === 'project_compliance_reopened' ? `${actor} put ${item} back to do on the compliance checklist.`
        : `The project started with ${cd.n ?? 0} compliance task${cd.n === 1 ? '' : 's'} for ${cd.name ?? 'its kind of home'}.`
      const href = e.projectId ? `/projects/${e.projectId}/compliance${cd.item ? `?item=${encodeURIComponent(cd.item)}` : ''}` : null
      push({ id: `ev-${e.id}`, at: e.at, icon: e.kind === 'project_compliance_tasks' ? 'task' : e.kind === 'project_compliance_reopened' ? 'undo' : 'verified_user', text,
             link: href ? { label: 'See Compliance', href } : overview, actor: e.kind === 'project_compliance_tasks' ? 'System' : actor, group: 'compliance' })
      continue
    }
    /* (REG-912, Projects round 1) The project's own events — the lead's Activity carries the project on; the line opens the project. */
    if (e.kind.startsWith('project_')) {
      const pd = d as LeadEventDetail & { number?: string; from?: string; to?: string; direct?: boolean; remade?: boolean }
      const named = `${q(pd.name ?? '')}${pd.number ? ` (${pd.number})` : ''}`
      const text = e.kind === 'project_created' ? (pd.direct ? `${actor} created the project ${named}.` : pd.remade ? `${actor} made the project again — ${named}.` : `${actor} won the lead — the project ${named} was created.`)   // (fix-E, E-06)
        : e.kind === 'project_renamed' ? `${actor} renamed the project ${q(pd.from ?? '')} to ${q(pd.to ?? '')}.`
        : e.kind === 'project_started' ? `${actor} started the project${pd.when ? ` — work begins ${displayDate(new Date(pd.when))}` : ''}.`
        : e.kind === 'project_edited' ? `${actor} ${projectEdits(pd.fields ?? [])}.`   // (fix-A, A-36) "set the start date to 23 Oct ’26", not "— → 23 Oct ’26"
        : null
      /* the project follows the Won move that made it — the same second, read after it */
      if (text) push({ id: `ev-${e.id}`, at: e.kind === 'project_created' ? new Date(e.at.getTime() + 1000) : e.at, icon: 'business_center', text, link: e.projectId ? { label: 'See Project', href: `/projects/${e.projectId}` } : overview, actor, group: 'stage' })
      continue
    }
    /* (Projects round 9) The portal, part two: someone else from the household — added (and sent the link), sent it again, withdrawn, taken
       off the list, first opening it (their own line, by name) — and a reminder of what waits on the client, sent on WhatsApp. */
    if (e.kind.startsWith('household_') || e.kind === 'portal_reminded') {
      const hd = d as LeadEventDetail & { kind?: string; reason?: string | null }
      const person = hd.name ?? 'someone'
      const rel = hd.reason ? ` (${hd.reason})` : ''   // (fix-G, G-44) the phrase as the studio typed it
      const text = e.kind === 'household_added' ? (hd.kind === 'invited' ? `${actor} added ${person}${rel} from ${lead.name}’s household to the portal and sent them the link.` : `${actor} added ${person}${rel} from ${lead.name}’s household to the portal.`)
        : e.kind === 'household_invited' ? (hd.kind === 'again' ? `${actor} sent ${person} the portal’s link again.` : hd.kind === 'back' ? `${actor} gave ${person} access to the portal again.` : `${actor} invited ${person} to the portal.`)
        : e.kind === 'household_withdrawn' ? `${actor} withdrew ${person}’s access to the portal.`
        : e.kind === 'household_removed' ? `${actor} took ${person} off ${lead.name}’s household on the portal.`
        : e.kind === 'household_opened' ? `${hd.name ?? 'Someone'}, from ${lead.name}’s household, opened the portal for the first time.`
        : `${actor} reminded ${hd.name ?? lead.name} on WhatsApp: ${q(hd.title ?? '')}.`
      push({ id: `ev-${e.id}`, at: e.at, icon: e.kind === 'household_opened' ? 'home' : e.kind === 'household_withdrawn' || e.kind === 'household_removed' ? 'link_off' : e.kind === 'portal_reminded' ? 'send' : 'group',
             text, link: overview, actor: e.kind === 'household_opened' ? (hd.name ?? lead.name) : actor })
      continue
    }
    /* (pending modules S41b-3) What a visitor made in the website's free trial, brought into the studio when they started it: the lead itself
       (its "Lead created" line says when it landed; this one says where it came from), the quote they had read, the Quote X-Ray reading. */
    if (e.kind === 'trial_claimed') {
      const text = d.kind === 'quote' ? `${actor} brought in the quote read from ${q(d.name ?? 'a file')} in the free trial${d.title ? ` — ${d.title}` : ''}${d.n ? `, ${d.n} ${d.n === 1 ? 'line' : 'lines'}` : ''}.`
        : d.kind === 'reading' ? `${actor} brought in the Quote X-Ray reading ${q(d.title ?? '')} from the free trial.`
        : `${actor} brought the lead in from the free trial${d.when ? `, where it was added on ${displayDate(new Date(d.when))}` : ''}.`
      const link = d.kind === 'quote' && d.id ? { label: 'Open Quote', href: `/quotes/${d.id}` } : d.kind === 'reading' && d.id ? { label: 'See comparison', href: `/quote-x-ray/${d.id}?from=${encodeURIComponent(`${base}/activity`)}` } : overview
      push({ id: `ev-${e.id}`, at: e.at, icon: d.kind === 'quote' ? 'request_quote' : d.kind === 'reading' ? 'scan' : 'person_add', text, link, actor })
      continue
    }
    /* (Projects r4a) The client portal: the client's first sign-in (the client's own line), a withdrawal (its Undo takes the line away),
       a file shown to the client or no longer shown. */
    if (e.kind === 'portal_opened' || e.kind === 'portal_withdrawn' || e.kind === 'file_shown' || e.kind === 'file_hidden') {
      const what = (d.ids?.length ?? 0) > 1 ? `${d.ids!.length} files` : q(d.name ?? 'a file')
      const text = e.kind === 'portal_opened' ? `${lead.name} opened their portal for the first time.`
        : e.kind === 'portal_withdrawn' ? `${actor} withdrew ${lead.name}’s access to the portal.`
        : e.kind === 'file_shown' ? `${actor} showed ${what} to ${lead.name}.`
        : `${actor} stopped showing ${what} to ${lead.name}.`
      push({ id: `ev-${e.id}`, at: e.at, icon: e.kind === 'portal_opened' ? 'home' : e.kind === 'portal_withdrawn' ? 'link_off' : e.kind === 'file_shown' ? 'visibility' : 'visibility_off', text,
             link: e.kind.startsWith('file_') ? { label: 'See Files', href: `${base}/files` } : overview, actor: e.kind === 'portal_opened' ? lead.name : actor, group: e.kind.startsWith('file_') ? 'files' : undefined })
      continue
    }
    /* (parity P-12 · P-14) the record's word at the line's date; someone taking themselves off "left" it; an edit reads as the project's own
       ("changed the client’s details — …") once the work is a project, "changed the lead’s details — …" before */
    const text = e.kind === 'member_removed' ? (d.memberId && d.memberId === e.actorId ? `${actor} left the ${recordAt(e.at)}.` : `${actor} removed ${d.memberId === ME ? 'you' : (d.name ?? 'a member')} from the ${recordAt(e.at)}.`)
      : e.kind === 'field_edited' ? `${actor} changed the ${recordAt(e.at) === 'project' ? 'client’s' : 'lead’s'} details — ${(d.fields ?? []).map((f) => `${f.label}: ${shownField(f.key, f.from)} → ${shownField(f.key, f.to)}`).join('; ')}.${d.phone ? ` ${lead.name} now signs in to the portal with ${d.phone}.` : ''}`   /* (fix-G, G-02) the portal's sign-in moved with the phone */
      : e.kind === 'task_deleted' ? `${actor} deleted the task ${q(d.title ?? '')}.`
      : e.kind === 'note_deleted' ? (d.kind === 'contact' ? `${actor} deleted the contact log${d.when ? ` of ${displayDateTimeDot(new Date(d.when))}` : ''}.` : `${actor} deleted the note${d.title ? ` ${q(d.title)}` : ''}.`)
      : e.kind === 'file_trashed' ? `${actor} moved ${q(d.name ?? '')} to the trash.`
      : e.kind === 'file_deleted' ? `${actor} deleted ${q(d.name ?? '')} forever.`
      : e.kind === 'return_undone' ? (d.kind === 'appeal' ? `${actor} took back the appeal to Qanvast.` : `${actor} undid the return to Qanvast.`)   // (S42 B-08)
      : e.kind === 'return_evidence_removed' ? `${actor} took ${q(d.name ?? '')} off the return to Qanvast.`   // (pending modules S05)
      : e.kind === 'invite_sent' ? `${actor} invited ${lead.name} to the portal.`
      : e.kind === 'questionnaire_asked' ? (d.ids?.length ? `${actor} asked ${lead.name} to answer ${d.ids.length === 1 ? '1 question' : `${d.ids.length} questions`}.` : `${actor} asked ${lead.name} to answer the questionnaire.`)   // (T12) the ask names what it asked
      : e.kind === 'comparison_deleted' ? `${actor} deleted the Quote X-Ray comparison ${q(d.title ?? '')}.`   // (REG-641)
      : e.kind === 'meeting_deleted' ? `${actor} deleted the meeting ${q(d.title ?? 'Meeting')}${d.when ? ` of ${displayDate(new Date(d.when))}` : ''}.`   // (pending modules S23)
      : e.kind === 'contract_unsigned' ? `${actor} moved the contract ${q(d.title ?? '')} back to ${d.kind ?? 'Draft'} — its signature was cleared.`   // (REG-634)
      : e.kind === 'contract_archived' ? `${actor} archived the contract ${q(d.title ?? '')}.`
      : e.kind === 'contract_restored' ? `${actor} brought back the archived contract ${q(d.title ?? '')}.`
      /* (audit 2026-09-26, F093 · F106 · F207) the AI Visualizer's removals and its link's stops and renewals */
      : e.kind === 'design_deleted' ? `${actor} deleted the AI Visualizer design ${q(d.name ?? lead.name)}.`
      : e.kind === 'design_restored' ? `${actor} brought back the AI Visualizer design ${q(d.name ?? lead.name)}.`
      : e.kind === 'design_purged' ? `${actor} deleted the AI Visualizer design ${q(d.name ?? lead.name)} for good — the renders saved to Files stay.`
      : e.kind === 'room_deleted' ? `${actor} deleted the room ${q(d.room ?? '')} from the AI Visualizer.`
      : e.kind === 'room_restored' ? `${actor} brought back the room ${q(d.room ?? '')} in the AI Visualizer.`
      : e.kind === 'version_deleted' ? `${actor} deleted V${d.n ?? '?'} of ${q(d.room ?? '')} in the AI Visualizer.`
      : e.kind === 'version_restored' ? `${actor} brought back V${d.n ?? '?'} of ${q(d.room ?? '')} in the AI Visualizer.`
      : e.kind === 'share_stopped' ? `${actor} stopped sharing the renders’ link.`
      : e.kind === 'share_renewed' ? `${actor} renewed the renders’ link for ${d.n ?? SHARE_DAYS} days.`
      : e.kind === 'share_reopened' ? `${actor} reopened the renders’ link.`
      /* (UX audit 2026-09-30, T10) a task's changes, by whoever made them */
      : e.kind === 'task_completed' ? `${actor} completed the task ${q(d.title ?? '')}.`
      : e.kind === 'task_reopened' ? `${actor} reopened the task ${q(d.title ?? '')}.`
      : e.kind === 'task_edited' ? `${actor} updated the task ${q(d.title ?? '')} — ${(d.fields ?? []).map((f) => (f.key === 'description' ? 'the description' : `${f.label}: ${f.from} → ${f.to}`)).join('; ')}.`
      : e.kind === 'task_assigned' ? assignedLine(actor, d)
      /* (gaps build, package C — M-03) someone outside the studio on a task, and the task sent to them */
      : e.kind === 'task_outside' ? (d.name ? `${actor} put ${d.name}${d.kind ? ` (${d.kind === 'supplier' ? 'supplier' : 'subcontractor'})` : ''} on the task ${q(d.title ?? '')}${d.removed?.length ? ` in place of ${d.removed[0]}` : ''}.` : `${actor} took ${d.removed?.[0] ?? 'the outside person'} off the task ${q(d.title ?? '')}.`)
      : e.kind === 'task_sent_outside' ? `${actor} sent the task ${q(d.title ?? '')} to ${d.name ?? 'the outside person'} on WhatsApp.`
      : null
    if (!text) continue
    const icon = e.kind === 'member_removed' ? 'person' : e.kind === 'field_edited' ? 'edit' : e.kind === 'task_deleted' ? 'ballot' : e.kind === 'note_deleted' ? 'sticky_note_2' : e.kind === 'file_trashed' || e.kind === 'file_deleted' || e.kind === 'return_evidence_removed' ? 'delete' : e.kind === 'return_undone' ? 'undo' : e.kind === 'invite_sent' ? 'send' : e.kind.startsWith('contract_') ? 'contract' : e.kind === 'comparison_deleted' ? 'scan' : e.kind === 'meeting_deleted' ? 'event'
      : e.kind === 'design_deleted' || e.kind === 'design_purged' || e.kind === 'room_deleted' || e.kind === 'version_deleted' ? 'delete' : e.kind === 'design_restored' || e.kind === 'room_restored' || e.kind === 'version_restored' ? 'restore'
      : e.kind === 'share_stopped' ? 'link_off' : e.kind === 'share_renewed' ? 'schedule' : e.kind === 'share_reopened' ? 'link' : e.kind.startsWith('task_') ? 'ballot' : 'help'
    const vizLink = e.kind === 'design_purged' ? overview : e.kind.startsWith('room_') || e.kind.startsWith('version_') ? viz(d.roomId ?? null, e.kind.startsWith('version_') ? d.id ?? null : null) : viz(null)
    const liveTask = e.kind.startsWith('task_') && e.kind !== 'task_deleted' && d.id && tasks.some((t) => t.id === d.id)
    const link = e.kind === 'questionnaire_asked' ? { label: 'See Questionnaire', href: `${base}/questionnaire` } : liveTask ? { label: 'See Task', href: `${base}/tasks?open=${d.id}` } : e.kind.startsWith('task_') ? { label: 'See Tasks', href: `${base}/tasks` } : e.kind === 'file_trashed' ? { label: 'See Files', href: `${base}/files` }
      : e.kind.startsWith('design_') || e.kind.startsWith('room_') || e.kind.startsWith('version_') || e.kind.startsWith('share_') ? vizLink : overview
    const group: ActivityGroup | undefined = e.kind.startsWith('task_') ? 'tasks' : e.kind.startsWith('file_') ? 'files' : e.kind === 'note_deleted' ? 'notes' : undefined
    push({ id: `ev-${e.id}`, at: e.at, icon, text, link, actor, group })
  }

  // Tasks (the mock's "ballot" rows) — created by whoever the record names, then updated / completed when its dates say so.
  // The record keeps no history of what changed (updatedAt is bumped by every edit, assignment and tag change), so the update row
  // is the plain sentence unless the task is done — and it is yours: every write in the prototype is by the signed-in member.
  const askedFor = new Set(vAsks.map((a) => a.taskId).filter((id): id is string => !!id))   // (REG-676) a client's call back names its task in its own line
  /* (simplify round 2) a task made from a client's message or ticket: its ask line says it under All — the task's own line keeps the Tasks chip */
  const askTasks = new Set(events.filter((x) => x.kind === 'project_ask_task').map((x) => (x.detail as LeadEventDetail | null)?.id).filter((id): id is string => !!id))
  /* (UX audit 2026-09-30, T10) a task whose changes are on the event log reads them there, each with its own actor; only a task changed before
     the log began keeps the one line its row can give — and that line no longer claims "You" did it: the row keeps no author of a change */
  const logged = new Set(events.filter((e) => e.kind.startsWith('task_')).map((e) => (e.detail as LeadEventDetail | null)?.id).filter((id): id is string => !!id))
  for (const t of tasks) {
    const creator = who(t.creatorId)
    const link = { label: 'See Task', href: `${base}/tasks?open=${t.id}` }
    if (!askedFor.has(t.id)) push({ id: `task-${t.id}`, at: t.createdAt, icon: 'ballot', text: `${creator} created the task ${q(t.title)}.`, link, actor: creator, origin: true, group: 'tasks', ...(askTasks.has(t.id) ? { twin: true } : {}) })
    if (!logged.has(t.id) && t.updatedAt && t.updatedAt.getTime() - t.createdAt.getTime() > 60_000 && !complianceTwin(t.id, t.updatedAt.getTime(), 60_000)) {   // (simplify S-06) its item's line says it
      push({ id: `task-u-${t.id}`, at: t.updatedAt, icon: 'ballot', text: t.done ? `The task ${q(t.title)} was completed.` : `The task ${q(t.title)} was updated.`, link, actor: 'System', group: 'tasks' })
    }
  }
  /* (REG-627, parity Q-30) A comment on a quote's line — the line named while it is still on the quote. */
  for (const c of qComments) {
    const x = qs.find((qq) => qq.id === c.quoteId); if (!x) continue
    const line = qLines.find((l) => l.id === c.itemId)
    push({ id: `qc-${c.id}`, at: c.createdAt, icon: 'comment', text: `${who(c.authorId)} commented on ${line ? `“${line.name}” in ` : ''}the quote ${q(x.number)}.`, link: { label: 'Open Quote', href: `/quotes/${x.id}` }, actor: who(c.authorId) })
  }
  for (const c of tComments) { const t = tasks.find((x) => x.id === c.taskId); if (t) push({ id: `tc-${c.id}`, at: c.createdAt, icon: 'comment', text: `${who(c.authorId)} commented on the task ${q(t.title)}.`, link: { label: 'See Task', href: `${base}/tasks?open=${t.id}&panel=comments` }, actor: who(c.authorId), group: 'tasks' }) }

  // Quotes / contracts — created, then each stamped milestone.
  for (const x of qs) {
    /* (Projects round 5) A variation order's lines are the project's Money tab's: its creation and approval are events (the branch above);
       its send to the client is the quote's own stamp. */
    if (x.kind === 'variation') {
      /* (fix-D, D-42) who sent it isn't recorded — the line says what went, never "You" to every reader */
      if (x.clientSentAt) push({ id: `vo-s-${x.id}`, at: x.clientSentAt, icon: 'request_quote', text: `The variation order ${q(x.number)} went to ${lead.name} for approval.`, link: x.projectId ? { label: 'See Money', href: `/projects/${x.projectId}/money` } : { label: 'Open', href: `/quotes/${x.id}` }, actor: 'The studio' })
      if (x.clientLastViewedAt) push({ id: `vo-v-${x.id}`, at: x.clientLastViewedAt, icon: 'visibility', text: `${lead.name} opened the variation order ${q(x.number)}${x.clientViewCount > 1 ? ` (${x.clientViewCount} times)` : ''}.`, link: x.projectId ? { label: 'See Money', href: `/projects/${x.projectId}/money` } : { label: 'Open', href: `/quotes/${x.id}` }, actor: lead.name })   // (pending modules S04)
      continue
    }
    const link = { label: 'See Quote', href: `${base}/quotes` }
    push({ id: `quote-${x.id}`, at: x.createdAt, icon: 'docs', text: x.draftBrief ? `You drafted the quote ${q(x.number)} with Maison AI, from the brief “${x.draftBrief.length > 80 ? `${x.draftBrief.slice(0, 79).trimEnd()}…` : x.draftBrief}”.` : `You created the quote ${q(x.number)}.`, link, actor: 'You', origin: true })   // (pending modules S04) Draft with Maison AI
    /* (REG-624) Approval on the record: who sent it for approval, who asked for changes (the latest note), who approved it, when it went to
       the client. A quote from before the stamps keeps its one "sent" row. */
    if (x.submittedAt) push({ id: `quote-sub-${x.id}`, at: x.submittedAt, icon: 'docs', text: `${who(x.submittedBy)} sent the quote ${q(x.number)} for approval.`, link, actor: who(x.submittedBy) })
    if (x.reviewedAt && x.reviewNote) push({ id: `quote-rev-${x.id}`, at: x.reviewedAt, icon: 'docs', text: `${who(x.reviewedBy)} asked for changes on the quote ${q(x.number)}: “${x.reviewNote}”`, link, actor: who(x.reviewedBy) })
    if (x.clientSentAt) push({ id: `quote-s-${x.id}`, at: x.clientSentAt, icon: 'docs', text: `You sent the quote ${q(x.number)} to the client.`, link, actor: 'You' })
    else if (x.sentAt && !x.submittedAt) push({ id: `quote-s-${x.id}`, at: x.sentAt, icon: 'docs', text: `You sent the quote ${q(x.number)}.`, link, actor: 'You' })
    if (x.approvedAt) push({ id: `quote-a-${x.id}`, at: x.approvedAt, icon: 'docs', text: `${x.approvedBy ? who(x.approvedBy) : 'You'} approved the quote ${q(x.number)}.`, link, actor: x.approvedBy ? who(x.approvedBy) : 'You' })   // fixed copy: the status can move on after the stamp
    /* (pending modules S04 — 1.0's view count) the client opened it on its link: the last time, and how many times */
    if (x.clientLastViewedAt) push({ id: `quote-v-${x.id}`, at: x.clientLastViewedAt, icon: 'visibility', text: `${lead.name} opened the quote ${q(x.number)}${x.clientViewCount > 1 ? ` (${x.clientViewCount} times)` : ''}.`, link, actor: lead.name })
    if (x.confirmedAt) push(x.confirmedVia === 'marked'   // (S44F — NB-04) marked by hand: who marked it, as a variation order says
      ? { id: `quote-c-${x.id}`, at: x.confirmedAt, icon: 'docs', text: `${x.confirmedMarkedBy ? who(x.confirmedMarkedBy) : 'You'} marked the quote ${q(x.number)} as confirmed.`, link, actor: x.confirmedMarkedBy ? who(x.confirmedMarkedBy) : 'You' }
      : { id: `quote-c-${x.id}`, at: x.confirmedAt, icon: 'docs', text: `${x.confirmedBy ?? 'The client'} confirmed the quote ${q(x.number)} on its link.`, link, actor: x.confirmedBy ?? 'Client' })   // (REG-587)
    /* (REG-626, parity Q-31) (REG-634, contracts parity E-128) who signed it: the name typed on its contract, else whoever marked that contract signed */
    if (x.signedAt) { const sc = cs.find((c) => c.fromQuoteId === x.id && c.status === 'Signed'); push({ id: `quote-g-${x.id}`, at: x.signedAt, icon: 'docs', text: sc?.signedBy ? `${sc.signedBy} signed the quote ${q(x.number)} with its contract.` : `The quote ${q(x.number)} was signed.`, link, actor: sc?.signedBy ?? (sc?.markedBy ? who(sc.markedBy) : sc ? 'You' : 'Client') }) }
    if (x.deletedAt) push({ id: `quote-d-${x.id}`, at: x.deletedAt, icon: 'docs', text: `You deleted the quote ${q(x.number)}.`, link, actor: 'You' })
    // The editor's own records (REG-343: a new record type gets its Activity branch): the lines written (REG-415) and the
    // payment schedule set (REG-418) — dated by the records themselves, linked to the editor.
    const editor = { label: 'Open Quote', href: `/quotes/${x.id}` }
    const lines = qLines.filter((i) => i.quoteId === x.id && i.kind === 'item')
    /* (audit 2026-09-26, round 3) one row per sitting — lines added within five minutes of the one before — so a later Add to a quote gets
       its own row at its own time instead of folding into the first */
    const sittings: (typeof lines)[] = []
    for (const l of [...lines].sort((m, n) => m.createdAt.getTime() - n.createdAt.getTime())) {
      const cur = sittings[sittings.length - 1], prev = cur?.[cur.length - 1]
      if (cur && prev && l.createdAt.getTime() - prev.createdAt.getTime() <= 5 * 60_000) cur.push(l); else sittings.push([l])
    }
    sittings.forEach((g, k) => push({ id: `quote-i-${x.id}${k ? `-${k}` : ''}`, at: g[0]!.createdAt, icon: 'docs', text: `You added ${g.length} ${g.length === 1 ? 'item' : 'items'} to the quote ${q(x.number)}.`, link: editor, actor: 'You' }))
    const pays = qPays.filter((p) => p.quoteId === x.id)
    if (pays.length) push({ id: `quote-p-${x.id}`, at: new Date(Math.max(...pays.map((p) => (p.updatedAt ?? p.createdAt).getTime()))), icon: 'docs', text: `You set the payment schedule of the quote ${q(x.number)} to ${presetLabel(presetOf(pays)).replace('Default: ', '')}.`, link: editor, actor: 'You' })
    for (const v of qVersions.filter((v) => v.quoteId === x.id)) push({ id: `quote-v-${v.id}`, at: v.createdAt, icon: 'docs', text: `${who(v.createdBy)} revised the quote ${q(x.number)} — version ${v.version} kept, version ${v.version + 1} started.`, link: editor, actor: who(v.createdBy) })   // (REG-565)
    const attached = qFiles.filter((f) => f.quoteId === x.id)
    if (attached.length) push({ id: `quote-f-${x.id}`, at: new Date(Math.max(...attached.map((f) => f.createdAt.getTime()))), icon: 'docs', text: `You attached ${attached.length} ${attached.length === 1 ? 'file' : 'files'} to the quote ${q(x.number)}.`, link: editor, actor: 'You' })
  }
  for (const x of cs) {
    /* (REG-534) The editor's records: an uploaded PDF, the WhatsApp signing link, the client signing online. Rows open the editor. */
    /* (REG-634, contracts parity E-128) a deleted contract's rows open the tab (its editor is gone); each act names who did it */
    const link = x.deletedAt ? { label: 'See Contracts', href: `${base}/contracts` } : { label: 'Open Contract', href: `/contracts/${x.id}?from=${encodeURIComponent(`${base}/contracts`)}` }
    const by = x.createdBy ? who(x.createdBy) : 'You'
    const sentBy = x.sentBy ? who(x.sentBy) : by, markedBy = x.markedBy ? who(x.markedBy) : by, deletedBy = x.deletedBy ? who(x.deletedBy) : by
    push({ id: `contract-${x.id}`, at: x.createdAt, icon: 'contract', text: x.purpose === 'handover' ? `${by} made the completion letter ${q(x.title)} at the handover${x.defectsMonths ? `, with a ${x.defectsMonths}-month defects period` : ''}.`   /* (S44R, C9; invented copy) */
      : x.source === 'uploaded' ? `${by} uploaded the contract ${q(x.title)}${x.fileName ? ` (${x.fileName})` : ''}.` : `${by} created the contract ${q(x.title)}${x.templateId ? ' from a template' : ''}.`, link, actor: by, origin: true })
    /* never sent, only marked signed: its sent date is the signing date and nobody sent it — no "sent" line */
    if (x.sentAt && (x.sentBy || !(x.signedAt && !x.signedBy && x.sentAt.getTime() === x.signedAt.getTime()))) push({ id: `contract-s-${x.id}`, at: x.sentAt, icon: 'contract', text: x.toRead ? `${sentBy} sent ${q(x.title)} to ${x.recipientName ?? 'the client'} to read and keep.` : `${sentBy} sent the contract ${q(x.title)} to ${x.recipientName ?? 'the client'} for signature.`, link, actor: sentBy })   // (S44R, C9) a letter to keep
    /* (REG-633, contracts parity Q-17) the client's first open of the signing link */
    if (x.viewedAt) push({ id: `contract-v-${x.id}`, at: x.viewedAt, icon: 'contract', text: `${x.recipientName ?? 'The client'} opened the contract ${q(x.title)}.`, link, actor: x.recipientName ?? 'Client' })
    if (x.signedAt) push({ id: `contract-g-${x.id}`, at: x.signedAt, icon: 'contract', text: x.signedBy ? `${x.signedBy} signed the contract ${q(x.title)} online${x.signatureKind === 'draw' ? ', drawing the signature' : ''}.` : `${markedBy} marked the contract ${q(x.title)} as signed${x.signedCopy ? ` (${x.signedCopy})` : ''}.`, link, actor: x.signedBy ?? markedBy })
    if (x.deletedAt) push({ id: `contract-d-${x.id}`, at: x.deletedAt, icon: 'contract', text: `${deletedBy} deleted the contract ${q(x.title)}.`, link: { label: 'See Contracts', href: `${base}/contracts` }, actor: deletedBy })
  }

  // Files, notes, questions, file comments. A trashed file (or anything inside a trashed folder) has no viewer route — its rows
  // point at the Files tab like the trash row does.
  const fileLink = (f: (typeof files)[number]) => f.deletedAt ? { label: 'See Files', href: `${base}/files` }
    : f.kind === 'folder' ? { label: 'See Files', href: `${base}/files?folder=${f.id}` } : { label: 'See File', href: `${base}/files/${f.id}` }
  /* (audit 2026-09-26, F106 · F207) a render the AI Visualizer filed is not an upload — nor is the Renders folder it started */
  const filedRender = new Set(vFiled.map((r) => r.fileId))
  const firstChild = (id: string) => files.filter((c) => c.parentId === id).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0] ?? null
  /* (gaps build E, item 4) the starter folders a new project's Files opened with — made in the project's own moment — are one line, not five */
  const [started] = await db.select({ at: projectRows.createdAt }).from(projectRows).where(eq(projectRows.leadId, leadId)).limit(1)
  const starterNames = new Set(STARTER_FOLDERS.map((x) => x.name))
  const starters = started ? files.filter((f) => f.kind === 'folder' && !f.parentId && !f.deletedAt && starterNames.has(f.name) && Math.floor(f.createdAt.getTime() / 1000) === Math.floor(started.at.getTime() / 1000)) : []
  const starterIds = new Set(starters.map((f) => f.id))
  if (starters.length) {
    const actor = who(starters[0]!.ownerId)
    push({ id: `files-started-${leadId}`, at: starters[0]!.createdAt, icon: 'folder', text: `${actor} started the project’s Files with the folders ${starters.map((f) => f.name).join(' · ')}.`, link: { label: 'See Files', href: `${base}/files` }, actor, group: 'files' })   /* (invented copy) */
  }
  for (const f of files) {
    if (starterIds.has(f.id)) continue   // (gaps build E, item 4) named on the line above
    if (foldedFiles.has(f.id) && !f.deletedAt) continue   // (fix-C, C-32) named on its update's line
    const actor = who(f.ownerId)
    const render = filedRender.has(f.id)
    const rendersFolder = f.kind === 'folder' && filedRender.has(firstChild(f.id)?.id ?? '')
    // The glyph follows the record's kind (the mock's files were all images, so "image" was written in).
    push({ id: `file-${f.id}`, at: f.createdAt, icon: render ? 'wand_shine' : fileGlyph(f),   // (gaps build E, item 1) every kind its own glyph
      text: rendersFolder ? `${actor} created the folder ${q(f.name)} for renders from the AI Visualizer.` : f.kind === 'folder' ? `${actor} created the folder ${q(f.name)}.` : render ? `${actor} saved ${q(f.name)} from the AI Visualizer to Files.` : `${actor} uploaded the file ${q(f.name)}.`, link: fileLink(f), actor, group: 'files' })
    if (f.deletedAt) push({ id: `file-d-${f.id}`, at: f.deletedAt, icon: 'delete', text: `${actor} moved ${q(f.name)} to the Trash Folder.`, link: { label: 'See Files', href: `${base}/files` }, actor, group: 'files' })
  }
  for (const c of fComments) { const f = files.find((x) => x.id === c.fileId); if (f) push({ id: `fc-${c.id}`, at: c.createdAt, icon: 'comment', text: `${who(c.authorId)} commented on the file ${q(f.name)}.`, link: f.deletedAt || f.kind === 'folder' ? fileLink(f) : { label: 'See File', href: `${base}/files/${f.id}?panel=comments` }, actor: who(c.authorId), group: 'files' }) }
  for (const n of notes) {
    const actor = who(n.authorId)
    const link = { label: 'See Note', href: `${base}/notes` }
    push({ id: `note-${n.id}`, at: n.createdAt, icon: n.kind === 'contact' ? 'call_log' : 'sticky_note_2'   /* one mark for a contact log everywhere (REG-278) */, text: n.kind === 'contact' ? `${actor} logged a contact${n.channel ? ` via ${n.channel}` : ''}${n.outcome ? ` — ${n.outcome}` : ''}.` : `${actor} added the note ${q(n.title || 'New')}.`, link, actor, group: 'notes' })
  }
  /* (gaps build D, item 9) an answer changed after it was first given: its own line, from what to what — the latest change stands in for
     the "answered" line it would repeat */
  const changes = (await db.select().from(questionAnswerHistory).where(eq(questionAnswerHistory.leadId, leadId))).filter((h) => h.before !== null)
  for (const x of qns) {
    const link = { label: 'See Questionnaire', href: `${base}/questionnaire` }
    push({ id: `q-${x.id}`, at: x.createdAt, icon: 'help', text: `You added the question ${q(x.text)}.`, link, actor: 'You' })
    const mine = changes.filter((h) => h.questionId === x.id)
    for (const h of mine) {
      const actor = h.byKind === 'client' ? h.byName ?? lead.name : h.byMemberId ? who(h.byMemberId) : h.byName ?? 'You'
      push({ id: `q-h-${h.id}`, at: h.at, icon: 'history', text: `${actor} changed the answer to ${q(x.text)} from ${q(answerWords(h.before))} to ${q(answerWords(h.after))}.`, link, actor })
    }
    if (x.answeredAt && !mine.some((h) => Math.abs(h.at.getTime() - x.answeredAt!.getTime()) < 1000)) { const actor = x.answeredBy === 'client' ? lead.name : 'You'; push({ id: `q-a-${x.id}`, at: x.answeredAt, icon: 'help', text: `${actor} answered ${q(x.text)}.`, link, actor }) }
  }

  /* (fix-A, A-16 · C-20) a project's own lines keep their chip — the schedule, its updates, its money, its choices — read off where they open */
  for (const e of ev) {
    if (e.group || !e.link) continue
    const m = /^\/projects\/[^/?]+\/(schedule|updates|money|choices)(?:[/?]|$)/.exec(e.link.href)
    if (m) e.group = m[1] as ActivityGroup
  }
  ev.sort((a, b) => b.at.getTime() - a.at.getTime() || Number(!!a.origin) - Number(!!b.origin))
  /* (fix-E, E-06) A project deleted forever (or made again) keeps its lines — their words are the record — but a link into it would open the
     bare 404: those lines point at the lead's Overview instead. A project in Deleted Projects keeps its links (its address says where it is). */
  {
    const kept = new Set((await db.select({ id: projects.id }).from(projects).where(eq(projects.leadId, leadId))).map((p) => p.id))
    for (const e of ev) {
      const m = e.link ? /^\/projects\/([^/?#]+)/.exec(e.link.href) : null
      if (m && !kept.has(m[1]!)) e.link = overview
    }
  }
  /* (REG-913) On the project's page the links to the tabs it carries on stay on the project; a project line needs no "See Project" there. */
  if (opts.projectId) {
    const pid = opts.projectId
    /* (fix-A, A-16) where the reader is — every link that leaves the project brings them back to its Activity */
    const here = `/projects/${pid}/activity`
    const back = (href: string) => { const [path, query = ''] = href.split('?'); const params = new URLSearchParams(query); params.set('from', here); return `${path}?${params.toString()}` }
    const kindOf = new Map(events.map((x) => [`ev-${x.id}`, x.kind]))
    /* the lead's own history — how it came in, its stage moves, who was put on it, its edits — opens the lead's record, not the project's Overview */
    const LEAD_KINDS = new Set(['member_removed', 'field_edited', 'return_undone', 'return_evidence_removed', 'invite_sent', 'questionnaire_asked', 'comparison_deleted', 'contract_unsigned', 'contract_archived', 'contract_restored', 'meeting_deleted'])
    const leadHistory = (e: ActivityEvent) => /^(lead|assign|stage|ret)-/.test(e.id) || LEAD_KINDS.has(kindOf.get(e.id) ?? '')
    const quoteOf = (e: ActivityEvent) => (e.id.startsWith('quote-') ? qs.find((x) => e.id.endsWith(x.id)) ?? null : null)
    for (const e of ev) {
      if (!e.link) continue
      const rest = e.link.href.startsWith(base) ? e.link.href.slice(base.length) : null
      if (rest === null) {
        if (e.link.href === `/projects/${pid}`) e.link = undefined
        /* the quote and contract editors, X-Ray and the AI Visualizer: Back returns to this Activity, not the lead's tab */
        else if (/^\/(quotes|contracts|quote-x-ray|visualizer)\//.test(e.link.href)) e.link = { ...e.link, href: back(e.link.href) }
        continue
      }
      const seg = rest.replace(/^\//, '').split(/[/?]/)[0] ?? ''
      if (seg === '' && !lead.direct && leadHistory(e)) { e.link = { label: 'See Lead', href: back(e.link.href) }; continue }
      const mapped = projectTabHref(pid, seg)
      if (mapped) { e.link = { ...e.link, href: `${mapped}${rest.slice(seg ? seg.length + 1 : 0)}` }; continue }
      /* a tab only the lead has (Quotes, Contracts, Notes, Questionnaire): the lead's own, with the way back — a direct project's client has
         no lead page, so its quote opens in the editor and the rest stay plain lines */
      if (!lead.direct) { e.link = { ...e.link, href: back(e.link.href) }; continue }
      const qx = seg === 'quotes' ? quoteOf(e) : null
      e.link = qx ? { label: 'Open Quote', href: back(`/quotes/${qx.id}`) } : undefined
    }
  }
  return { events: ev, now: Date.now() }
}

export type { Member }
