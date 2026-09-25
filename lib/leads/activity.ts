import 'server-only'   // (REG-286) libSQL must never reach the browser bundle: every client import of this module is `import type`
import { asc, eq, inArray } from 'drizzle-orm'
import { db } from '@/lib/db'
import { contracts, fileComments, leadAssignees, leadEvents, leadFiles, leadNotes, leadReturns, leadTasks, leads, members, questions, quoteComparisons, quoteFiles, quoteItemComments, quoteItems, quotePayments, quoteVersions, quotes, stageLogs, taskComments, type Member } from '@/lib/db/schema'
import { presetLabel, presetOf } from '@/lib/quotes/payments'
import { SESSION_MEMBER_ID } from '@/lib/db/session'
import { isWizardPayload } from '@/lib/leads/stage-data'
import { displayDate, displayDateTimeDot, parseInputDateTime } from '@/lib/format'
import type { LeadEventDetail } from '@/lib/leads/events'

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
  const [team, logs, tasks, qs, cs, files, notes, qns, rets, assigned, cmps, events] = await Promise.all([
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
    db.select().from(quoteComparisons).where(eq(quoteComparisons.leadId, leadId)),   // (REG-529) Quote X-Ray
    db.select().from(leadEvents).where(eq(leadEvents.leadId, leadId)),   // (REG-613) the event log — what leaves no row
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
    /* (REG-607) The parking reason and its detail read back from the log — 1.0's activity names the close reason. */
    const park = (log.payload && typeof log.payload === 'object' ? log.payload : {}) as { reason?: string; competitor?: string; restartAt?: string }
    const why = park.reason ? ` (${park.reason})` : ''
    const extra = park.competitor ? ` — competitor: ${park.competitor}` : park.restartAt ? ` — restart expected ${displayDate(new Date(park.restartAt))}` : ''
    const text = log.fromStage === log.toStage ? (log.toStage === 'Contacted' ? 'You updated the contact log.' : `You updated the ${log.toStage} details.`)
      : log.toStage === 'On Hold' ? `You put the lead on hold${why}.`
      : log.toStage === 'Lost' ? `You marked the lead as lost${why}${extra}.`
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
  /* (REG-529) Quote X-Ray: a comparison is a reading of two quotes, kept on the lead. */
  for (const c of cmps) {
    const seeIt = { label: 'See comparison', href: `/quote-x-ray/${c.id}?from=${encodeURIComponent(`${base}/activity`)}` }
    push({ id: `xray-${c.id}`, at: c.createdAt, icon: 'scan', text: `${who(c.createdBy)} compared ${c.yourLabel} with ${c.otherStudio}'s quote in Quote X-Ray.`, link: seeIt, actor: who(c.createdBy) })
    /* (REG-640, X-Ray parity Q-16) what went to the client — the last send the reading keeps */
    if (c.sentAt) push({ id: `xray-sent-${c.id}`, at: c.sentAt, icon: 'send', text: c.sentVia === 'copy' ? `${who(c.sentBy ?? c.createdBy)} copied the comparison with ${c.otherStudio}'s quote to send to the client.` : `${who(c.sentBy ?? c.createdBy)} sent the comparison with ${c.otherStudio}'s quote to the client on WhatsApp.`, link: seeIt, actor: who(c.sentBy ?? c.createdBy) })
  }
  for (const r of rets) push({ id: `ret-${r.id}`, at: r.returnedAt, icon: 'undo', text: `${who(r.returnedById)} returned the lead to Qanvast${r.reason ? ` (${r.reason})` : ''}.`, link: { label: 'See Overview', href: base }, actor: who(r.returnedById) })
  /* (REG-613, parity Q-20) The event log — 1.0's activity rows for what leaves no record: removals, edits, deletions, an undone
     return, every portal invite and questionnaire ask (REG-609's link stamps keep only the latest of each). */
  for (const e of events) {
    const d = (e.detail && typeof e.detail === 'object' ? e.detail : {}) as LeadEventDetail
    const actor = who(e.actorId)
    const text = e.kind === 'member_removed' ? `${actor} removed ${d.memberId === ME ? 'yourself' : (d.name ?? 'a member')} from this lead.`
      : e.kind === 'field_edited' ? `${actor} edited the lead — ${(d.fields ?? []).map((f) => `${f.label}: ${f.from} → ${f.to}`).join('; ')}.`
      : e.kind === 'task_deleted' ? `${actor} deleted the task ${q(d.title ?? '')}.`
      : e.kind === 'note_deleted' ? (d.kind === 'contact' ? `${actor} deleted the contact log${d.when ? ` of ${displayDateTimeDot(new Date(d.when))}` : ''}.` : `${actor} deleted the note${d.title ? ` ${q(d.title)}` : ''}.`)
      : e.kind === 'file_trashed' ? `${actor} moved ${q(d.name ?? '')} to the trash.`
      : e.kind === 'file_deleted' ? `${actor} deleted ${q(d.name ?? '')} forever.`
      : e.kind === 'return_undone' ? `${actor} undid the return to Qanvast.`
      : e.kind === 'invite_sent' ? `${actor} invited ${lead.name} to the portal.`
      : e.kind === 'questionnaire_asked' ? `${actor} asked ${lead.name} to answer the questionnaire.`
      : e.kind === 'comparison_deleted' ? `${actor} deleted the Quote X-Ray comparison ${q(d.title ?? '')}.`   // (REG-641)
      : e.kind === 'contract_unsigned' ? `${actor} moved the contract ${q(d.title ?? '')} back to ${d.kind ?? 'Draft'} — its signature was cleared.`   // (REG-634)
      : e.kind === 'contract_archived' ? `${actor} archived the contract ${q(d.title ?? '')}.`
      : e.kind === 'contract_restored' ? `${actor} brought back the archived contract ${q(d.title ?? '')}.`
      : null
    if (!text) continue
    const icon = e.kind === 'member_removed' ? 'person' : e.kind === 'field_edited' ? 'edit' : e.kind === 'task_deleted' ? 'ballot' : e.kind === 'note_deleted' ? 'sticky_note_2' : e.kind === 'file_trashed' || e.kind === 'file_deleted' ? 'delete' : e.kind === 'return_undone' ? 'undo' : e.kind === 'invite_sent' ? 'send' : e.kind.startsWith('contract_') ? 'contract' : e.kind === 'comparison_deleted' ? 'scan' : 'help'
    const link = e.kind === 'questionnaire_asked' ? { label: 'See Questionnaire', href: `${base}/questionnaire` } : e.kind === 'task_deleted' ? { label: 'See Tasks', href: `${base}/tasks` } : e.kind === 'file_trashed' ? { label: 'See Files', href: `${base}/files` } : overview
    push({ id: `ev-${e.id}`, at: e.at, icon, text, link, actor })
  }

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
  /* (REG-627, parity Q-30) A comment on a quote's line — the line named while it is still on the quote. */
  for (const c of qComments) {
    const x = qs.find((qq) => qq.id === c.quoteId); if (!x) continue
    const line = qLines.find((l) => l.id === c.itemId)
    push({ id: `qc-${c.id}`, at: c.createdAt, icon: 'comment', text: `${who(c.authorId)} commented on ${line ? `“${line.name}” in ` : ''}the quote ${q(x.number)}.`, link: { label: 'Open Quote', href: `/quotes/${x.id}` }, actor: who(c.authorId) })
  }
  for (const c of tComments) { const t = tasks.find((x) => x.id === c.taskId); if (t) push({ id: `tc-${c.id}`, at: c.createdAt, icon: 'comment', text: `${who(c.authorId)} commented on the task ${q(t.title)}.`, link: { label: 'See Task', href: `${base}/tasks?open=${t.id}` }, actor: who(c.authorId) }) }

  // Quotes / contracts — created, then each stamped milestone.
  for (const x of qs) {
    const link = { label: 'See Quote', href: `${base}/quotes` }
    push({ id: `quote-${x.id}`, at: x.createdAt, icon: 'docs', text: `You created the quote ${q(x.number)}.`, link, actor: 'You' })
    /* (REG-624) Approval on the record: who sent it for approval, who asked for changes (the latest note), who approved it, when it went to
       the client. A quote from before the stamps keeps its one "sent" row. */
    if (x.submittedAt) push({ id: `quote-sub-${x.id}`, at: x.submittedAt, icon: 'docs', text: `${who(x.submittedBy)} sent the quote ${q(x.number)} for approval.`, link, actor: who(x.submittedBy) })
    if (x.reviewedAt && x.reviewNote) push({ id: `quote-rev-${x.id}`, at: x.reviewedAt, icon: 'docs', text: `${who(x.reviewedBy)} asked for changes on the quote ${q(x.number)}: “${x.reviewNote}”`, link, actor: who(x.reviewedBy) })
    if (x.clientSentAt) push({ id: `quote-s-${x.id}`, at: x.clientSentAt, icon: 'docs', text: `You sent the quote ${q(x.number)} to the client.`, link, actor: 'You' })
    else if (x.sentAt && !x.submittedAt) push({ id: `quote-s-${x.id}`, at: x.sentAt, icon: 'docs', text: `You sent the quote ${q(x.number)}.`, link, actor: 'You' })
    if (x.approvedAt) push({ id: `quote-a-${x.id}`, at: x.approvedAt, icon: 'docs', text: `${x.approvedBy ? who(x.approvedBy) : 'You'} approved the quote ${q(x.number)}.`, link, actor: x.approvedBy ? who(x.approvedBy) : 'You' })   // fixed copy: the status can move on after the stamp
    if (x.confirmedAt) push({ id: `quote-c-${x.id}`, at: x.confirmedAt, icon: 'docs', text: `${x.confirmedBy ?? 'The client'} confirmed the quote ${q(x.number)} on its link.`, link, actor: x.confirmedBy ?? 'Client' })   // (REG-587)
    /* (REG-626, parity Q-31) (REG-634, contracts parity E-128) who signed it: the name typed on its contract, else whoever marked that contract signed */
    if (x.signedAt) { const sc = cs.find((c) => c.fromQuoteId === x.id && c.status === 'Signed'); push({ id: `quote-g-${x.id}`, at: x.signedAt, icon: 'docs', text: sc?.signedBy ? `${sc.signedBy} signed the quote ${q(x.number)} with its contract.` : `The quote ${q(x.number)} was signed.`, link, actor: sc?.signedBy ?? (sc?.markedBy ? who(sc.markedBy) : sc ? 'You' : 'Client') }) }
    if (x.deletedAt) push({ id: `quote-d-${x.id}`, at: x.deletedAt, icon: 'docs', text: `You deleted the quote ${q(x.number)}.`, link, actor: 'You' })
    // The editor's own records (REG-343: a new record type gets its Activity branch): the lines written (REG-415) and the
    // payment schedule set (REG-418) — dated by the records themselves, linked to the editor.
    const editor = { label: 'Open Quote', href: `/quotes/${x.id}` }
    const lines = qLines.filter((i) => i.quoteId === x.id && i.kind === 'item')
    if (lines.length) push({ id: `quote-i-${x.id}`, at: new Date(Math.min(...lines.map((l) => l.createdAt.getTime()))), icon: 'docs', text: `You added ${lines.length} ${lines.length === 1 ? 'item' : 'items'} to the quote ${q(x.number)}.`, link: editor, actor: 'You' })
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
    push({ id: `contract-${x.id}`, at: x.createdAt, icon: 'contract', text: x.source === 'uploaded' ? `${by} uploaded the contract ${q(x.title)}${x.fileName ? ` (${x.fileName})` : ''}.` : `${by} created the contract ${q(x.title)}${x.templateId ? ' from a template' : ''}.`, link, actor: by })
    /* never sent, only marked signed: its sent date is the signing date and nobody sent it — no "sent" line */
    if (x.sentAt && (x.sentBy || !(x.signedAt && !x.signedBy && x.sentAt.getTime() === x.signedAt.getTime()))) push({ id: `contract-s-${x.id}`, at: x.sentAt, icon: 'contract', text: `${sentBy} sent the contract ${q(x.title)} to ${x.recipientName ?? 'the client'} for signature.`, link, actor: sentBy })
    /* (REG-633, contracts parity Q-17) the client's first open of the signing link */
    if (x.viewedAt) push({ id: `contract-v-${x.id}`, at: x.viewedAt, icon: 'contract', text: `${x.recipientName ?? 'The client'} opened the contract ${q(x.title)}.`, link, actor: x.recipientName ?? 'Client' })
    if (x.signedAt) push({ id: `contract-g-${x.id}`, at: x.signedAt, icon: 'contract', text: x.signedBy ? `${x.signedBy} signed the contract ${q(x.title)} online${x.signatureKind === 'draw' ? ', drawing the signature' : ''}.` : `${markedBy} marked the contract ${q(x.title)} as signed${x.signedCopy ? ` (${x.signedCopy})` : ''}.`, link, actor: x.signedBy ?? markedBy })
    if (x.deletedAt) push({ id: `contract-d-${x.id}`, at: x.deletedAt, icon: 'contract', text: `${deletedBy} deleted the contract ${q(x.title)}.`, link: { label: 'See Contracts', href: `${base}/contracts` }, actor: deletedBy })
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
