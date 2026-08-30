'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leadNotes, noteAttachments } from '@/lib/db/schema'
import { parseInputDateTime } from '@/lib/format'
import type { NoteDraft } from '@/lib/leads/note-model'

/* Lead Details › Notes (931-44865). Every action revalidates the lead's pages; the client calls router.refresh() as well. */

const ME = 'dane'   // the signed-in member (members.is_you)
const touch = (leadId: string) => { revalidatePath(`/leads/${leadId}`); revalidatePath(`/leads/${leadId}/notes`); revalidatePath('/leads') }
const leadOf = async (noteId: string) => (await db.select({ leadId: leadNotes.leadId }).from(leadNotes).where(eq(leadNotes.id, noteId)))[0]?.leadId ?? null

const columns = (d: NoteDraft) => ({
  kind: d.kind, title: d.title.trim(), body: d.body,
  channel: d.kind === 'contact' ? d.channel : null,
  contactedAt: d.kind === 'contact' ? parseInputDateTime(d.when) : null,
  outcome: d.kind === 'contact' ? d.outcome || null : null,
  nextStepAt: d.kind === 'contact' ? parseInputDateTime(d.nextStepWhen) : null,
  nextStepMode: d.kind === 'contact' ? d.nextStepMode || null : null,
})

/** New › Note / Contact Log → Save (frames 80 / 165). Returns the new id. `fileIds` = the draft's attachments. */
export async function createNote(leadId: string, draft: NoteDraft, fileIds: string[] = []): Promise<string> {
  const id = randomUUID(); const now = new Date()
  await db.insert(leadNotes).values({ id, leadId, ...columns(draft), authorId: ME, createdAt: now, updatedAt: now })
  if (fileIds.length) await db.insert(noteAttachments).values(fileIds.map((fileId) => ({ noteId: id, fileId, createdAt: now })))
  touch(leadId); return id
}

export async function updateNote(noteId: string, draft: NoteDraft): Promise<void> {
  const leadId = await leadOf(noteId); if (!leadId) return
  await db.update(leadNotes).set({ ...columns(draft), updatedAt: new Date() }).where(eq(leadNotes.id, noteId))
  touch(leadId)
}

/** List item kebab › Delete (931:45488). */
export async function deleteNote(noteId: string): Promise<void> {
  const leadId = await leadOf(noteId); if (!leadId) return
  await db.delete(leadNotes).where(eq(leadNotes.id, noteId))
  touch(leadId)
}

/** Attachments column (931:45548): replace the note's attachment set. */
export async function setNoteAttachments(noteId: string, fileIds: string[]): Promise<void> {
  const leadId = await leadOf(noteId); if (!leadId) return
  await db.delete(noteAttachments).where(eq(noteAttachments.noteId, noteId))
  if (fileIds.length) { const now = new Date(); await db.insert(noteAttachments).values(fileIds.map((fileId) => ({ noteId, fileId, createdAt: now }))) }
  touch(leadId)
}
