'use server'

import { randomUUID } from 'node:crypto'
import { logLeadEvent } from '@/lib/leads/events'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leadNotes, noteAttachments } from '@/lib/db/schema'
import { sessionMemberSql } from '@/lib/db/session'
import { parseInputDateTime } from '@/lib/format'
import { CONTACT_CHANNELS, CONTACT_MODES, OUTCOMES } from '@/lib/leads/enums'
import type { NoteDraft } from '@/lib/leads/note-model'
import { revalidateLead } from '@/lib/leads/queries'

/* Lead Details › Notes (931-44865). Every action revalidates the lead's pages; the client calls router.refresh() as well. */

const ME = sessionMemberSql   // (REG-286 · REG-667) the signed-in member, resolved inside each write (lib/db/session.ts)
/** (REG-286) One shared eviction for every detail tab — the hand-listed paths here never named Activity, which prints every contact log. */
const touch = (leadId: string) => revalidateLead(leadId)
const leadOf = async (noteId: string) => (await db.select({ leadId: leadNotes.leadId }).from(leadNotes).where(eq(leadNotes.id, noteId)))[0]?.leadId ?? null

/**
 * (REG-286) The draft arrives from a public endpoint, and its enum fields are not strings the app invented at the
 * keyboard: `channel`, `outcome` and `nextStepMode` are the mock's chips and selects (lib/leads/enums.ts), and the
 * same three columns feed the Notes list, the Activity sentence ("logged a contact via WhatsApp — Connected") and
 * `NEXT_STEP_BY_OUTCOME`. Anything outside the vocabulary is dropped to null rather than persisted: the note is
 * still the user's text, it just never carries a channel no chip can show. `kind` decides the whole shape, so a
 * bad one is rejected outright.
 */
const oneOf = (v: string | null | undefined, list: readonly string[]): string | null => (v && list.includes(v) ? v : null)

const columns = (d: NoteDraft) => {
  if (d.kind !== 'note' && d.kind !== 'contact') throw new Error(`Unknown note kind: ${String(d.kind)}`)
  const contact = d.kind === 'contact'
  return {
    kind: d.kind, title: d.title.trim(), body: d.body,
    channel: contact ? oneOf(d.channel, CONTACT_CHANNELS) : null,
    contactedAt: contact ? parseInputDateTime(d.when) : null,
    outcome: contact ? oneOf(d.outcome, OUTCOMES) : null,
    nextStepAt: contact ? parseInputDateTime(d.nextStepWhen) : null,
    nextStepMode: contact ? oneOf(d.nextStepMode, CONTACT_MODES) : null,
  }
}

/** New › Note / Contact Log → Save (frames 80 / 165). Returns the new id. `fileIds` = the draft's attachments. */
export async function createNote(leadId: string, draft: NoteDraft, fileIds: string[] = []): Promise<string> {
  const id = randomUUID(); const now = new Date()
  const cols = columns(draft)
  // (REG-286) One transaction: a note saved without the attachments it was saved with is the wrong record.
  await db.transaction(async (tx) => {
    await tx.insert(leadNotes).values({ id, leadId, ...cols, authorId: ME, createdAt: now, updatedAt: now })
    if (fileIds.length) await tx.insert(noteAttachments).values(fileIds.map((fileId) => ({ noteId: id, fileId, createdAt: now })))
  })
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
  const [n] = await db.select({ kind: leadNotes.kind, title: leadNotes.title, contactedAt: leadNotes.contactedAt }).from(leadNotes).where(eq(leadNotes.id, noteId)).limit(1)
  await db.delete(leadNotes).where(eq(leadNotes.id, noteId))
  if (n) await logLeadEvent(db, leadId, 'note_deleted', { kind: n.kind, title: n.title || undefined, when: n.contactedAt ? n.contactedAt.toISOString() : null })   /* (REG-613) */
  touch(leadId)
}

/** Attachments column (931:45548): replace the note's attachment set. */
export async function setNoteAttachments(noteId: string, fileIds: string[]): Promise<void> {
  const leadId = await leadOf(noteId); if (!leadId) return
  // (REG-286) Delete-then-reinsert is a replacement: unwrapped, a failure between them strips the note of every
  // attachment it had, including the ones the user was keeping.
  await db.transaction(async (tx) => {
    await tx.delete(noteAttachments).where(eq(noteAttachments.noteId, noteId))
    if (fileIds.length) { const now = new Date(); await tx.insert(noteAttachments).values(fileIds.map((fileId) => ({ noteId, fileId, createdAt: now }))) }
  })
  touch(leadId)
}
