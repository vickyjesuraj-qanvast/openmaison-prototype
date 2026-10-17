import 'server-only'   // (REG-286) libSQL must never reach the browser bundle: every client import of this module is `import type`
import { and, asc, desc, eq, inArray, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leadFiles, leadNotes, members, noteAttachments, stageLogs, type LeadFile, type LeadNote, type Member } from '@/lib/db/schema'
import { withYou } from '@/lib/db/session'   // (pending modules S43A) "you" = this request's member
import { parseInputDateTime } from '@/lib/format'
import { isWizardPayload } from '@/lib/leads/stage-data'

/* Lead Details › Notes (931-44865) — one loader for the tab. */

/** `origin: 'stage'` = derived from the Contacted stage's own logs (REG-265) — shown read-only, never deletable here.
    `stageKind` (UX audit 2026-09-30, T3): which stage's log it is — 'Met' marks a meeting log (Where · Date & Time · Remarks). */
export type NoteRow = LeadNote & { attachments: LeadFile[]; author: Member | null; origin?: 'stage'; stageKind?: 'Contacted' | 'Met' }
export type LeadNotesData = {
  /** Creation order — the note sits above the newer contact log (frames 162/165). */
  notes: NoteRow[]
  /** The lead's untrashed files — the Attach files library. */
  files: LeadFile[]
  team: Member[]
  now: number
}

export async function fetchLeadNotes(leadId: string): Promise<LeadNotesData> {
  const [rows, files, team] = await Promise.all([
    /* Newest first (REG-262, user 2026-09-01) — the mock's frames drew creation order (162/165). */
    db.select().from(leadNotes).where(eq(leadNotes.leadId, leadId)).orderBy(desc(leadNotes.createdAt)),
    db.select().from(leadFiles).where(and(eq(leadFiles.leadId, leadId), isNull(leadFiles.deletedAt))).orderBy(asc(leadFiles.createdAt)),
    db.select().from(members).then(withYou),
  ])
  const ids = rows.map((n) => n.id)
  const links = ids.length ? await db.select().from(noteAttachments).where(inArray(noteAttachments.noteId, ids)).orderBy(asc(noteAttachments.createdAt)) : []
  const byFile = new Map(files.map((f) => [f.id, f]))
  const byMember = new Map(team.map((m) => [m.id, m]))
  /** (pending modules S05) a stage log's files, by the ids it keeps — gone ones (trashed) drop out */
  const attachedOf = (ids: unknown): LeadFile[] => (Array.isArray(ids) ? ids.filter((x): x is string => typeof x === 'string').map((id) => byFile.get(id)).filter((f): f is LeadFile => !!f) : [])
  const notes: NoteRow[] = rows.map((n) => ({
    ...n,
    attachments: links.filter((l) => l.noteId === n.id).map((l) => byFile.get(l.fileId)).filter((f): f is LeadFile => !!f),
    author: n.authorId ? byMember.get(n.authorId) ?? null : null,
  }))

  /* The Contacted stage's own logs appear here too (REG-265, user 2026-09-01: "it was part of contact stage
     log and not user added under notes") — derived read-only from the LATEST Contacted stage_log WRITTEN BY THE
     WIZARD (each save carries the full list, so only the newest such row counts; deriving every row would duplicate).
     (REG-339) Not merely the latest row into Contacted: a "Resume at Contacted?" from On Hold / Lost writes a
     `{quick:true}` row with no logs, and taking that one hid every contact log the wizard's row still holds.
     Single source of truth stays the Move stage window: no dual write, nothing to drift. */
  const contactedRows = await db.select().from(stageLogs)
    .where(and(eq(stageLogs.leadId, leadId), eq(stageLogs.toStage, 'Contacted')))
    .orderBy(desc(stageLogs.createdAt))
  const stageRow = contactedRows.find((r) => isWizardPayload(r.payload))
  type PayloadLog = { channel?: string | null; when?: string; outcome?: string; nextStepWhen?: string; nextStepMode?: string; notes?: string; noteId?: string; /** (pending modules S05) */ fileIds?: string[] }
  /* (UX audit 2026-09-30, L2) A contact log saved here and then carried into the Contacted step (`?move=contacted&log=<id>`) is the
     same contact: it stays listed once, as the note it is, not again as a stage row. */
  const noteIds = new Set(rows.map((n) => n.id))
  const stageNotes: NoteRow[] = ((stageRow?.payload as { logs?: PayloadLog[] } | null)?.logs ?? []).flatMap((l, i) => l.noteId && noteIds.has(l.noteId) ? [] : [{
    id: `stage-${stageRow!.id}-${i}`,
    leadId, kind: 'contact', title: '', body: l.notes ?? '',
    channel: l.channel ?? null,
    contactedAt: l.when ? parseInputDateTime(l.when) : null,
    outcome: l.outcome ?? null,
    nextStepAt: l.nextStepWhen ? parseInputDateTime(l.nextStepWhen) : null,
    nextStepMode: l.nextStepMode ?? null,
    authorId: null, createdAt: stageRow!.createdAt, updatedAt: null,
    attachments: attachedOf(l.fileIds), author: null, origin: 'stage' as const, stageKind: 'Contacted' as const,   // (pending modules S05) the log's own files
  }])

  /* (UX audit 2026-09-30, T3 — extends REG-265) The Met stage's meeting logs appear beside Contacted's, read-only the same way: the
     latest Met row the wizard wrote holds the full list. A site visit now has a home under All Notes & Logs. */
  const metRows = await db.select().from(stageLogs)
    .where(and(eq(stageLogs.leadId, leadId), eq(stageLogs.toStage, 'Met')))
    .orderBy(desc(stageLogs.createdAt))
  const metRow = metRows.find((r) => isWizardPayload(r.payload) && Array.isArray((r.payload as { meetings?: unknown }).meetings))
  type PayloadMeeting = { where?: string; when?: string; notes?: string; /** (pending modules S05) */ fileIds?: string[] }
  const meetingNotes: NoteRow[] = ((metRow?.payload as { meetings?: PayloadMeeting[] } | null)?.meetings ?? []).filter((m) => m.where || m.when).map((m, i) => ({
    id: `stage-${metRow!.id}-m${i}`,
    leadId, kind: 'contact', title: '', body: m.notes ?? '',
    channel: m.where ?? null,
    contactedAt: m.when ? parseInputDateTime(m.when) : null,
    outcome: null, nextStepAt: null, nextStepMode: null,
    authorId: null, createdAt: metRow!.createdAt, updatedAt: null,
    attachments: attachedOf(m.fileIds), author: null, origin: 'stage' as const, stageKind: 'Met' as const,
  }))

  const merged = [...notes, ...stageNotes, ...meetingNotes].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  return { notes: merged, files, team, now: Date.now() }
}
