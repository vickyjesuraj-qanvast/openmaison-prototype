/**
 * (parity map 2026-10-10, TD-110 — 1.0's Compliance Navigator kept an "Internal notes" box on each studio action: "Applied on 12 Jan — waiting for
 * HDB to respond.") A note on each of the studio's registrations — pure and client-safe. Kept with the studio's compliance record, under its own
 * key beside it (`compliance_studio_notes`, next to `compliance_studio`): recording a registration done or to do on Company › Profile rewrites
 * that record whole, and a note must never be lost by it. Owners and Admins write it (the record's own rule); everyone reads it.
 */
import { STUDIO_ACTIONS } from './studio-actions'

export const REGISTRATION_NOTES_KEY = 'compliance_studio_notes'
export const NOTE_MAX = 500
export type RegistrationNote = { text: string; by: string | null; at: number }

/** The words as kept: control characters out, runs of spaces folded, at most three blank lines in a row, `NOTE_MAX` characters. */
export const cleanNote = (v: unknown): string => (typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000b-\u001f]/g, ' ').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, NOTE_MAX) : '')

export function parseRegistrationNotes(v: unknown): Record<string, RegistrationNote> {
  const raw = typeof v === 'string' ? (() => { try { return JSON.parse(v) as unknown } catch { return null } })() : v
  if (!raw || typeof raw !== 'object') return {}
  const out: Record<string, RegistrationNote> = {}
  for (const a of STUDIO_ACTIONS) {
    const n = (raw as Record<string, unknown>)[a.id] as { text?: unknown; by?: unknown; at?: unknown } | undefined
    const text = cleanNote(n?.text)
    if (n && text && typeof n.at === 'number') out[a.id] = { text, by: typeof n.by === 'string' ? n.by : null, at: n.at }
  }
  return out
}
