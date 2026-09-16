/**
 * Canonical vocabulary — extracted VERBATIM from the Figma mocks.
 * Sources:   "Filter - all sources"        (781:54190)
 * Property:  "Filter - all property types" (781:53980)
 * Stages:    stage dropdown (780:86452) + Move Stage wizard rail
 * Team:      "Filter - all assignees"      (781:54363)
 * Do NOT add values here that do not exist in the mocks (data rule, build plan §0P).
 */

export const STAGES = ['New', 'Contacted', 'Met', 'Quote Sent', 'Won'] as const
export const INACTIVE_STAGES = ['On Hold', 'Lost'] as const
export const ALL_STAGES = [...STAGES, ...INACTIVE_STAGES] as const
export type Stage = (typeof ALL_STAGES)[number]

export const SOURCES = [
  'Qanvast', 'Instagram', 'Referral', 'Walk-in', 'Facebook', 'Organic',
  'Hangout', 'Website', 'Email', 'Google Ads', 'Meta Ads', 'Others',
] as const
export type LeadSource = (typeof SOURCES)[number]

export const PROPERTY_TYPE_GROUPS: ReadonlyArray<readonly string[]> = [
  ['HDB 2-Room', 'HDB 3-Room', 'HDB 4-Room', 'HDB 5-Room', 'HDB Executive'],
  ['BTO 2-Room', 'BTO 3-Room', 'BTO 4-Room', 'BTO 5-Room'],
  ['Executive Condo', 'Condo Studio / 1-bedder', 'Condo 2-bedder', 'Condo 3-bedder',
   'Condo 4-bedder', 'Condo 5-bedder', 'Penthouse'],
  ['Landed — Terrace', 'Landed — Semi-D', 'Landed — Bungalow'],
  ['Commercial — Office', 'Commercial — Retail'],
  ['Others'],
]
export const PROPERTY_TYPES = PROPERTY_TYPE_GROUPS.flat()
export type PropertyType = string

/** Canonical team — "Filter - all assignees" after the designer's dedupe. */
export const TEAM = [
  { id: 'dane',     name: 'Dane',     role: 'Owner',    color: '#5B7FD7', isYou: true },
  { id: 'james',    name: 'James',    role: 'Designer', color: 'photo' },
  { id: 'sarah',    name: 'Sarah',    role: 'Designer', color: '#3E9B63' },
  { id: 'michelle', name: 'Michelle', role: 'Designer', color: '#E8A33D' },
  { id: 'germaine', name: 'Germaine', role: 'Designer', color: '#B07B2E' },
  { id: 'alex',     name: 'Alex',     role: 'Designer', color: '#2F3B8F' },
] as const

/** Contact channels — Move Stage "Contacted via" chips (781:58292). */
/** Task kinds (lib/db/schema.ts lead_tasks.kind, "General | Call (mock vocab)") — named here so a server
    action can validate against the vocabulary instead of trusting a client string (REG-285). */
export const TASK_KINDS = ['General', 'Call'] as const
export type TaskKind = (typeof TASK_KINDS)[number]

export const CONTACT_CHANNELS = ['WhatsApp', 'Email', 'SMS', 'Call', 'Others'] as const
/** Contact-log outcomes and the next step each one asks for (Move stage window 780:9xxxx · Notes 931:45231 "Connected → Schedule a meeting", 931:45383 "Callback requested"). */
export const OUTCOMES = ['Connected', 'Callback requested', 'Meeting scheduled', 'No response'] as const
/** (REG-319, mock 781:58313) The optional schedule block under a contact log — one heading for every outcome, the helper
 *  saying what filling it does. Replaces the outcome-keyed "Next step: …" headings (NEXT_STEP_BY_OUTCOME). */
export const SCHEDULE = {
  heading: 'Schedule a call/meeting (optional)',
  helper: 'If you wish to be reminded, a task will be created.',
} as const
/** The reminder task the helper promises, from the schedule's own fields (invented copy, REG-319). */
export const reminderTaskTitle = (when: string, mode: string): string =>
  mode === 'In person' ? `Meet the client on ${when}` : mode ? `Follow up with the client via ${mode} on ${when}` : `Follow up with the client on ${when}`
/** "Preferred mode" options — the channels plus "In person" (Notes 931:45231). */
export const CONTACT_MODES = [...CONTACT_CHANNELS, 'In person'] as const

/**
 * On Hold: how long the lead is parked, and the follow-up date each duration promises.
 *
 * ONE rule (REG-286, audit finding "the On Hold duration → follow-up-date rule is computed in four places and
 * in neither the dialog that owns the options nor on the server"): the dialog's Duration options, the date its
 * helper line promises and the `followUpAt` written on the stage log all come from here, measured from the same
 * instant — so what the dialog says and what the listing shows can no longer drift apart (they did when the
 * dialog was left open across midnight: the label counted from when it opened, the save from Date.now()).
 * `Record<HoldDuration, number>` keeps the map exhaustive: a new option cannot be added without its days.
 */
export const HOLD_DURATIONS = ['1 month', '3 months', '6 months'] as const
export type HoldDuration = (typeof HOLD_DURATIONS)[number]
export const HOLD_DURATION_DAYS: Record<HoldDuration, number> = { '1 month': 30, '3 months': 90, '6 months': 180 }
/** What the dialog's "Follow up on" date opens on (REG-453: one month ahead, the presets a tap away). */
export const DEFAULT_HOLD_DURATION: HoldDuration = '1 month'

/** Next follow-up = `from` + the duration's days. Text outside the vocabulary falls back to the default duration. */
export function holdFollowUpAt(duration: string, from: number): Date {
  const days = HOLD_DURATION_DAYS[duration as HoldDuration] ?? HOLD_DURATION_DAYS[DEFAULT_HOLD_DURATION]
  return new Date(from + days * 86_400_000)
}

/** The preset a follow-up date matches ("3 months"), else "Until 15 Dec ’26" — what the stage log's `duration` records (REG-453). */
export function holdDurationLabel(followUpAt: Date, from: number): string {
  const day = (d: Date) => Math.round(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 86_400_000)
  const days = day(followUpAt) - day(new Date(from))
  const preset = HOLD_DURATIONS.find((d) => HOLD_DURATION_DAYS[d] === days)
  return preset ?? `Until ${followUpAt.toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: '2-digit' }).replace(/(\d{2})$/, '’$1')}`
}

/** Only style/condition/key-collection values visible anywhere in the mocks. */
export const STYLES_SEEN = ['Contemporary'] as const
export const CONDITIONS_SEEN = ['New'] as const
export const KEY_COLLECTION_SEEN = ['Collected'] as const
