/**
 * (gaps build, package A — M-01, the owner's "build everything" of 2026-10-07) On hold: a MARK on a project that has not ended — never a stage
 * (Q-03 keeps Setting up · In progress · Completed, and a cancelled job ends through Complete anyway with its reason). It says since when, why
 * (the client reads the reason on their schedule — package D reads `holdOf`), and the day it should resume (optional). While a project is on
 * hold its attention reasons pause (lib/projects/attention.ts), its one filled action is Resume (lib/projects/next-step.ts), its schedule's
 * reminders stop, and the resume date passing raises a bell row (`project_hold_due`). Pure and client-safe.
 *
 * The columns (the contract between packages): `projects.on_hold_at` (timestamp ms, null = not on hold) · `on_hold_reason` (text, shown to
 * the client) · `on_hold_until` (a day's ms, may be null) · `on_hold_by` (member id).
 */
import { displayDate } from '@/lib/format'

export type Hold = { since: number; reason: string; until: number | null; by: string | null }
type HoldColumns = { onHoldAt: Date | number | null; onHoldReason: string | null; onHoldUntil: number | null; onHoldBy?: string | null }

/** The project's hold, or null when it runs. */
export function holdOf(p: HoldColumns): Hold | null {
  if (p.onHoldAt === null || p.onHoldAt === undefined) return null
  const since = typeof p.onHoldAt === 'number' ? p.onHoldAt : p.onHoldAt.getTime()
  if (!Number.isFinite(since)) return null
  return { since, reason: (p.onHoldReason ?? '').trim(), until: typeof p.onHoldUntil === 'number' && Number.isFinite(p.onHoldUntil) ? p.onHoldUntil : null, by: p.onHoldBy ?? null }
}

/** The reason's length — one line the client reads on their schedule. */
export const HOLD_REASON_MAX = 200
/** The resume presets (the lead's On Hold dialog's, REG-453) — and Custom, which alone reveals the date; "No date yet" keeps none. */
export const HOLD_PRESETS = ['1 month', '3 months', '6 months'] as const
export const HOLD_PRESET_DAYS: Record<(typeof HOLD_PRESETS)[number], number> = { '1 month': 30, '3 months': 90, '6 months': 180 }

const DAY = 86_400_000
/** Local midnight of a moment, in ms — the day a resume date names. */
export const dayStart = (t: number): number => { const d = new Date(t); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() }
/** Calendar days from `a` to `b` (midnight to midnight). */
const daysBetween = (a: number, b: number) => Math.round((dayStart(b) - dayStart(a)) / DAY)

/** The resume day has come round (today or before) — the bell row, the attention reason and the Status card's alert. */
export const resumeDue = (h: Hold | null, now: number): boolean => !!h && h.until !== null && dayStart(h.until) <= dayStart(now)

/** "On hold since 2 Oct ’26" — the Status card's row and the listing's tooltip. */
export const holdSince = (h: Hold): string => `On hold since ${displayDate(new Date(h.since))}`
/** "Resumes 16 Nov ’26" · "Was to resume 16 Nov ’26" · "No resume date yet". */
export function resumeLine(h: Hold, now: number): string {
  if (h.until === null) return 'No resume date yet'
  return resumeDue(h, now) && daysBetween(h.until, now) > 0 ? `Was to resume ${displayDate(new Date(h.until))}` : `Resumes ${displayDate(new Date(h.until))}`
}
/** The listing's tooltip and the menu's help: since when, why, and when it resumes. */
export const holdSummary = (h: Hold, now: number): string => `${holdSince(h)}${h.reason ? ` — ${h.reason.replace(/[.!?]+$/, '')}` : ''}. ${resumeLine(h, now)}.`

/** A refusal while on hold: what can't happen until it resumes. */
export const ON_HOLD_START = 'This project is on hold — resume it before it starts'
export const NOT_ON_HOLD = 'This project is not on hold'
export const HOLD_ENDED = 'This project is completed — a completed project can’t be put on hold'
