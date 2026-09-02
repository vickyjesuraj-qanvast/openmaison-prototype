import 'server-only'   // (REG-286) libSQL must never reach the browser bundle: every client import of this module is `import type`
import { and, asc, desc, eq, inArray, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leadFiles, leadNotes, members, noteAttachments, stageLogs, type LeadFile, type LeadNote, type Member } from '@/lib/db/schema'
import { parseInputDateTime } from '@/lib/format'

/* Lead Details › Notes (931-44865) — one loader for the tab. */

/** `origin: 'stage'` = derived from the Contacted stage's own logs (REG-265) — shown read-only, never deletable here. */
export type NoteRow = LeadNote & { attachments: LeadFile[]; author: Member | null; origin?: 'stage' }
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
    db.select().from(members),
  ])
  const ids = rows.map((n) => n.id)
  const links = ids.length ? await db.select().from(noteAttachments).where(inArray(noteAttachments.noteId, ids)).orderBy(asc(noteAttachments.createdAt)) : []
  const byFile = new Map(files.map((f) => [f.id, f]))
  const byMember = new Map(team.map((m) => [m.id, m]))
  const notes: NoteRow[] = rows.map((n) => ({
    ...n,
    attachments: links.filter((l) => l.noteId === n.id).map((l) => byFile.get(l.fileId)).filter((f): f is LeadFile => !!f),
    author: n.authorId ? byMember.get(n.authorId) ?? null : null,
  }))

  /* The Contacted stage's own logs appear here too (REG-265, user 2026-09-01: "it was part of contact stage
     log and not user added under notes") — derived read-only from the LATEST Contacted stage_log's payload
     (each save carries the full list, so only the newest row counts; deriving every row would duplicate).
     Single source of truth stays the Move stage window: no dual write, nothing to drift. */
  const [stageRow] = await db.select().from(stageLogs)
    .where(and(eq(stageLogs.leadId, leadId), eq(stageLogs.toStage, 'Contacted')))
    .orderBy(desc(stageLogs.createdAt)).limit(1)
  type PayloadLog = { channel?: string | null; when?: string; outcome?: string; nextStepWhen?: string; nextStepMode?: string; notes?: string }
  const stageNotes: NoteRow[] = ((stageRow?.payload as { logs?: PayloadLog[] } | null)?.logs ?? []).map((l, i) => ({
    id: `stage-${stageRow!.id}-${i}`,
    leadId, kind: 'contact', title: '', body: l.notes ?? '',
    channel: l.channel ?? null,
    contactedAt: l.when ? parseInputDateTime(l.when) : null,
    outcome: l.outcome ?? null,
    nextStepAt: l.nextStepWhen ? parseInputDateTime(l.nextStepWhen) : null,
    nextStepMode: l.nextStepMode ?? null,
    authorId: null, createdAt: stageRow!.createdAt, updatedAt: null,
    attachments: [], author: null, origin: 'stage',
  }))

  const merged = [...notes, ...stageNotes].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  return { notes: merged, files, team, now: Date.now() }
}
