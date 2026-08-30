import { and, asc, eq, inArray, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leadFiles, leadNotes, members, noteAttachments, type LeadFile, type LeadNote, type Member } from '@/lib/db/schema'

/* Lead Details › Notes (931-44865) — one loader for the tab. */

export type NoteRow = LeadNote & { attachments: LeadFile[]; author: Member | null }
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
    db.select().from(leadNotes).where(eq(leadNotes.leadId, leadId)).orderBy(asc(leadNotes.createdAt)),
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
  return { notes, files, team, now: Date.now() }
}
