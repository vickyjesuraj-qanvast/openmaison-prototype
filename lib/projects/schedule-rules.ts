/**
 * (gaps build, package C — the owner's "build everything", 2026-10-07; the report 26-… §3 · §5) Settings › Projects › Schedule: the two
 * approvals (both off by default — the studio turns them on) and the alerts' lead time. Pure and client-safe: the server actions, the
 * Settings card, the Schedule tab and the bell read the same words and functions.
 *
 * - **Milestone completion needs approval** (1.0's Workflow › "Milestone approval required", E-194 · E-198): a Designer's or a Manager's Done
 *   waits for an Owner or an Admin; theirs is done at once.
 * - **Schedule changes need approval before the client sees them**: a Designer's or a Manager's Share changes asks an Owner or an Admin, who
 *   shares it (or sends it back); theirs is shared at once.
 * - **Alerts lead time** (1.0's Proactive Alerts › Alert Lead Time, 1–30 days): how many days before a milestone's last day, and before a
 *   project task's due day, the team hears of it. 2.0 rang at a fixed three days; three stays the default.
 */
import { runsStudio } from '@/lib/leads/assign-policy'

export const SCHEDULE_RULES_KEY = 'project_schedule_rules'
export type ScheduleRules = { completionApproval: boolean; shareApproval: boolean; alertDays: number }
export const DEFAULT_SCHEDULE_RULES: ScheduleRules = { completionApproval: false, shareApproval: false, alertDays: 3 }
export const ALERT_DAYS_MIN = 1, ALERT_DAYS_MAX = 30

export function parseScheduleRules(v: unknown): ScheduleRules {
  const r = (v ?? {}) as Partial<Record<keyof ScheduleRules, unknown>>
  const days = typeof r.alertDays === 'number' && Number.isFinite(r.alertDays) ? Math.round(r.alertDays) : DEFAULT_SCHEDULE_RULES.alertDays
  return {
    completionApproval: r.completionApproval === true,
    shareApproval: r.shareApproval === true,
    alertDays: Math.min(ALERT_DAYS_MAX, Math.max(ALERT_DAYS_MIN, days)),
  }
}

/** Who answers the schedule's asks — more time, a Done waiting, a share waiting: Owners and Admins. */
export const answersSchedule = (role: string | null | undefined) => runsStudio(role)
/** A Done goes through at once — for an Owner or an Admin, or while the studio asks no approval. */
export const doneAtOnce = (role: string | null | undefined, rules: Pick<ScheduleRules, 'completionApproval'>) => !rules.completionApproval || answersSchedule(role)
/** A share reaches the client at once — for an Owner or an Admin, or while the studio asks no approval. */
export const sharesAtOnce = (role: string | null | undefined, rules: Pick<ScheduleRules, 'shareApproval'>) => !rules.shareApproval || answersSchedule(role)
/** (5) Who asks for more time instead of moving the date: a Designer or a Manager on a milestone that is under way, blocked or late. */
export const asksForTime = (role: string | null | undefined) => !answersSchedule(role)

/**
 * (simplify Q-18, the owner's pick 2026-10-09) The extension rule restrains for real: a Designer's or a Manager's move of a running milestone's
 * last day LATER — a drag on the timeline, a date in the panel — is the ask for more time, never a new date (Owners and Admins move it; the
 * ask is answered by them). An earlier end, a milestone not under way, and every move by an Owner or an Admin are unchanged.
 * `running` = in progress, blocked or late (the panel's own word for when *Ask for more time* is offered).
 */
export const asksPastEnd = (role: string | null | undefined, m: { status: string; end: number }, today: number, newEnd: number): boolean =>
  asksForTime(role) && newEnd > m.end && (m.status === 'in_progress' || m.status === 'blocked' || (m.status !== 'done' && m.end < today))
export const MORE_TIME_RULE = 'Its end moves later only with an Owner’s or an Admin’s yes — ask for more time instead'

export const ANSWER_RULE = 'Only Owners and Admins answer the schedule’s asks'
export const ASK_RULE = 'Only the project’s team asks for more time'

/** "3 days" — the lead time in the bell's words. */
export const leadWords = (days: number) => `${days} ${days === 1 ? 'day' : 'days'}`

/* ── (3) Where a schedule starts, per project type ───────────────────────────────────────────────────────────────────────────────────── */

/** Per project type (the Won step's three): 'auto' = the studio default (the studio-wide pick — since one-home N-11 the *Studio default* row of
    Settings › Projects › Schedule, where a type that follows it shows the default's answer; no "auto" option is offered), and with the signed
    quote named but none signed, the property type's ready-made schedule; 'quote' = the signed quote's stages; 'property' = the property type's
    ready-made schedule; else a template's id. */
export const TYPE_DEFAULTS_KEY = 'project_schedule_type_defaults'
export type TypeChoice = 'auto' | 'quote' | 'property' | string
export type TypeDefaults = Record<string, TypeChoice>
export function parseTypeDefaults(v: unknown): TypeDefaults {
  const r = (v && typeof v === 'object' && !Array.isArray(v) ? v : {}) as Record<string, unknown>
  const out: TypeDefaults = {}
  for (const [k, x] of Object.entries(r)) if (typeof x === 'string' && x && k.length <= 60) out[k] = x.slice(0, 80)
  return out
}

/** What Set up the schedule picks first — and why, in a line the Start card prints. Pure: the server hands it the facts. */
export type StartPick = { kind: 'quote' } | { kind: 'template'; id: string } | { kind: 'blank' }
export function startPick(f: { typeChoice: TypeChoice; studioTemplate: string | null; quoteId: string | null; presetTemplate: string | null; templates: string[] }): StartPick {
  const has = (id: string | null) => !!id && f.templates.includes(id)
  if (f.typeChoice === 'quote' && f.quoteId) return { kind: 'quote' }
  if (f.typeChoice === 'property' && has(f.presetTemplate)) return { kind: 'template', id: f.presetTemplate! }
  if (f.typeChoice !== 'auto' && f.typeChoice !== 'quote' && f.typeChoice !== 'property' && has(f.typeChoice)) return { kind: 'template', id: f.typeChoice }
  if (has(f.studioTemplate)) return { kind: 'template', id: f.studioTemplate! }
  if (f.quoteId) return { kind: 'quote' }
  if (has(f.presetTemplate)) return { kind: 'template', id: f.presetTemplate! }
  if (f.templates.length) return { kind: 'template', id: f.templates[0]! }
  return { kind: 'blank' }
}
