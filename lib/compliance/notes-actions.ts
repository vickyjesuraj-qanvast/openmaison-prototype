'use server'

import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { settings } from '@/lib/db/schema'
import { fetchViewer } from '@/lib/leads/visibility'
import { runsStudio } from '@/lib/leads/assign-policy'
import { STUDIO_ACTIONS } from './studio-actions'
import { NOTE_MAX, REGISTRATION_NOTES_KEY, cleanNote, parseRegistrationNotes, type RegistrationNote } from './notes'

/*
 * (parity map 2026-10-10, TD-110) A note on one of the studio's registrations, from the Compliance Navigator's card. Owners and Admins — the rule
 * that records the registrations themselves; a refusal answers `{ error }`. An empty note removes it. Answers what was there, for the snackbar's
 * Undo (`restoreRegistrationNote`).
 */
type Refusal = { error: string }
const RULE = 'Only Owners and Admins write the studio’s compliance notes'
const GONE = 'That step is not on the list any more'

async function readNotes(): Promise<Record<string, RegistrationNote>> {
  const [r] = await db.select({ value: settings.value }).from(settings).where(eq(settings.key, REGISTRATION_NOTES_KEY)).limit(1)
  return parseRegistrationNotes(r?.value)
}
async function writeNotes(all: Record<string, RegistrationNote>) {
  const value = JSON.stringify(all)
  await db.insert(settings).values({ key: REGISTRATION_NOTES_KEY, value, updatedAt: new Date() }).onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } })
  revalidatePath('/compliance')
}

export async function setRegistrationNote(actionId: string, input: { text: string }): Promise<{ before: RegistrationNote | null; note: RegistrationNote | null } | Refusal> {
  const viewer = await fetchViewer()
  if (!runsStudio(viewer.role)) return { error: RULE }
  const a = STUDIO_ACTIONS.find((x) => x.id === actionId)
  if (!a) return { error: GONE }
  if (typeof input?.text === 'string' && input.text.trim().length > NOTE_MAX) return { error: `Keep the note to ${NOTE_MAX} characters` }
  const text = cleanNote(input?.text)
  const all = await readNotes()
  const before = all[a.id] ?? null
  if ((before?.text ?? '') === text) return { before, note: before }
  const next = { ...all }
  const note = text ? { text, by: viewer.id, at: Date.now() } : null
  if (note) next[a.id] = note; else delete next[a.id]
  await writeNotes(next)
  return { before, note }
}

/** The Undo: the note as it was (none = removed). */
export async function restoreRegistrationNote(actionId: string, before: RegistrationNote | null): Promise<{ ok: true } | Refusal> {
  const viewer = await fetchViewer()
  if (!runsStudio(viewer.role)) return { error: RULE }
  const a = STUDIO_ACTIONS.find((x) => x.id === actionId)
  if (!a) return { error: GONE }
  const all = await readNotes()
  const next = { ...all }
  const text = cleanNote(before?.text)
  if (before && text && typeof before.at === 'number') next[a.id] = { text, by: typeof before.by === 'string' ? before.by.slice(0, 64) : null, at: before.at }
  else delete next[a.id]
  await writeNotes(next)
  return { ok: true }
}
