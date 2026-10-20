/**
 * (pending modules S23 — Meetings and the Meeting Co-Pilot; his "build all of them" 2026-10-11, REG-552's hold lifted for this card; survey keys
 * studio:meetings-copilot · held:meetings · api:copilot-objections-competitors) A meeting with a lead's client, and the co-pilot that sits beside
 * the studio in it — pure and client-safe: the words, the kinds, the record's working shapes. 1.0 ran a live transcript (Deepgram), a model pass
 * every 25 s and a model-written brief; here nothing listens or calls a model — the studio types what is said (or pastes a transcript, or its
 * notes after) and the co-pilot reads those words by rule (lib/meetings/engine.ts). A meeting held on a lead IS its Met log
 * (lib/leads/stage-data.ts `MeetingLog.meetingId`). Every word below is invented copy unless it names 1.0's.
 */

/* ── what the meeting is for — 1.0's six meeting objective types (objective-step.tsx), in plain words ── */
export const AIMS = [
  { key: 'first_consultation', label: 'First consultation', help: 'The first proper talk about the home' },
  { key: 'follow_up', label: 'Follow-up', help: 'Picking up from an earlier meeting' },
  { key: 'site_visit_debrief', label: 'Site visit', help: 'At the home — measuring and checking' },
  { key: 'quote_presentation', label: 'Quote walk-through', help: 'Going through the price and the scope' },
  { key: 'closing', label: 'Closing', help: 'Agreeing the price and the start' },
  { key: 'other', label: 'Other', help: 'Any other meeting' },
] as const
export type AimKey = (typeof AIMS)[number]['key']
export const isAim = (v: unknown): v is AimKey => typeof v === 'string' && AIMS.some((a) => a.key === v)
export const aimLabel = (k: string | null | undefined): string => AIMS.find((a) => a.key === k)?.label ?? 'Meeting'

/* ── where — the Met log's own three (components/leads/move-stage/panels.tsx), so a meeting's Where is the log's ── */
export const WHERE = ['In person', 'Video call', 'Showroom'] as const
export type WhereKind = (typeof WHERE)[number]
export const isWhere = (v: unknown): v is WhereKind => typeof v === 'string' && (WHERE as readonly string[]).includes(v)
/** "in person" · "on a video call" · "at the showroom" — the brief's and the invitation's words */
export const whereWords = (w: string | null | undefined): string => (w === 'Video call' ? 'on a video call' : w === 'Showroom' ? 'at the showroom' : 'in person')

/** A meeting's length when it is planned and nothing else is said (1.0's unmerged branch: one hour). */
export const DEFAULT_LENGTH_MIN = 60

export type MeetingStatus = 'planned' | 'live' | 'held' | 'cancelled'
export const MEETING_STATUSES: readonly MeetingStatus[] = ['planned', 'live', 'held', 'cancelled']

/**
 * What a list row says about where a meeting stands — one word in the Status column and, under it, what waits:
 *   Upcoming (planned, still ahead) · To write up (planned and its time has passed — nothing recorded) · Live · Held · Cancelled.
 * `waits` — the one thing a held meeting still asks of the studio: its brief to save to the lead.
 */
export type MeetingStanding = { word: 'Upcoming' | 'To write up' | 'Live' | 'Held' | 'Cancelled'; waits: 'save' | 'write' | null; late: boolean }
export function standingOf(m: { status: string; startsAt: number; endsAt?: number | null; briefAt: number | null; briefSavedAt: number | null; fromLog?: boolean }, now: number): MeetingStanding {
  if (m.status === 'cancelled') return { word: 'Cancelled', waits: null, late: false }
  if (m.status === 'live') return { word: 'Live', waits: null, late: false }
  /* a planned meeting is still ahead until its planned end — only then do its notes wait */
  if (m.status === 'planned') return now < (m.endsAt ?? m.startsAt + DEFAULT_LENGTH_MIN * 60_000) ? { word: 'Upcoming', waits: null, late: false } : { word: 'To write up', waits: 'write', late: true }
  return { word: 'Held', waits: m.briefAt && !m.briefSavedAt && !m.fromLog ? 'save' : null, late: false }
}

/* ── the co-pilot's parts — 1.0's nine session features (src/data/copilot-checklists.ts COPILOT_FEATURES), each a studio switch in
      Settings › Meetings. 1.0 kept four off by default in one browser's storage; here the studio's, and all on: a studio that never opens the
      setting loses nothing (the brief's "defaults need no set-up"). ── */
export const FEATURES = [
  { key: 'coaching', label: 'Tips as you talk', help: 'A card when the client raises the price, another studio, a deadline or a doubt — with your studio’s answer.' },
  { key: 'checklist', label: 'Meeting checklist', help: 'What to ask in this kind of meeting, ticked as it’s said.' },
  { key: 'deal_scoring', label: 'Deal score', help: 'How warm the client is, from budget, timeline, style, trust, who decides and scope.' },
  { key: 'live_quote', label: 'Rough estimate', help: 'The works you hear, priced from typical Singapore rates — never a quote.' },
  { key: 'recommended_addons', label: 'Add-ons to suggest', help: 'Items often added to the works in scope.' },
  { key: 'moodboard', label: 'Mood boards', help: 'A board of materials for the style the client describes.' },
  { key: 'portfolio_search', label: 'Your past projects', help: 'Your projects closest to the client’s style and home.' },
  { key: 'competitor_analysis', label: 'Their quote', help: 'Read another studio’s quote with Quote X-Ray.' },
  { key: 'floor_plan_notes', label: 'Photos and floor plan', help: 'Pictures and the floor plan, kept with the meeting.' },
] as const
export type FeatureKey = (typeof FEATURES)[number]['key']
export type Features = Record<FeatureKey, boolean>
export const ALL_ON: Features = Object.fromEntries(FEATURES.map((f) => [f.key, true])) as Features

/* ── the deal score — 1.0's six dimensions and default weights (deal-scoring.ts; Copilot Tuning saved them as whole percentages, which 1.0's
      score then read as fractions — scores ~100× too high; here the percentages are read as percentages) ── */
export const DIMENSIONS = [
  { key: 'budget', label: 'Budget', high: 'Budget fits the scope', low: 'Budget not confirmed' },
  { key: 'timeline', label: 'Timeline', high: 'Clear timeline', low: 'No timeline yet' },
  { key: 'style', label: 'Style', high: 'Style direction clear', low: 'Style undecided' },
  { key: 'trust', label: 'Trust', high: 'Good rapport', low: 'Trust still building' },
  { key: 'decision', label: 'Who decides', high: 'The decision maker is in it', low: 'The decision maker is unclear' },
  { key: 'scope', label: 'Scope', high: 'Scope well defined', low: 'Scope unclear' },
] as const
export type DimKey = (typeof DIMENSIONS)[number]['key']
export type Dims = Record<DimKey, number>   // 0…1
export type Weights = Record<DimKey, number>   // whole percentages, summing to 100
export const DEFAULT_WEIGHTS: Weights = { budget: 25, timeline: 15, style: 10, trust: 20, decision: 20, scope: 10 }
export const START_DIMS: Dims = { budget: 0.5, timeline: 0.5, style: 0.5, trust: 0.5, decision: 0.5, scope: 0.5 }
export const weightsTotal = (w: Weights) => DIMENSIONS.reduce((n, d) => n + (w[d.key] ?? 0), 0)
export function scoreOf(d: Dims, w: Weights): number {
  const total = weightsTotal(w) || 100
  return Math.round(DIMENSIONS.reduce((n, k) => n + Math.max(0, Math.min(1, d[k.key])) * (w[k.key] ?? 0), 0) * (100 / total))
}
/** 1.0's tiers and the prep card's lines (prep-card.tsx). */
export type Tier = 'Hot' | 'Warm' | 'Cool' | 'Cold'
export const tierOf = (score: number): Tier => (score >= 80 ? 'Hot' : score >= 60 ? 'Warm' : score >= 40 ? 'Cool' : 'Cold')
export const TIER_LINES: Record<Tier, string> = {
  Hot: 'Ready to go ahead — ask for the commitment',
  Warm: 'Keen, with doubts to settle',
  Cool: 'Still exploring — build trust',
  Cold: 'Early days — learn what they need',
}

export type CopilotSettings = { features: Features; weights: Weights }
export const COPILOT_SETTINGS_KEY = 'meeting_copilot'
export const DEFAULT_COPILOT: CopilotSettings = { features: ALL_ON, weights: DEFAULT_WEIGHTS }
export function parseCopilotSettings(v: unknown): CopilotSettings {
  const o = (v && typeof v === 'object' ? v : {}) as { features?: Record<string, unknown>; weights?: Record<string, unknown> }
  const features = Object.fromEntries(FEATURES.map((f) => [f.key, typeof o.features?.[f.key] === 'boolean' ? (o.features[f.key] as boolean) : true])) as Features
  const raw = Object.fromEntries(DIMENSIONS.map((d) => [d.key, Number.isFinite(Number(o.weights?.[d.key])) ? Math.max(0, Math.min(50, Math.round(Number(o.weights?.[d.key])))) : DEFAULT_WEIGHTS[d.key]])) as Weights
  return { features, weights: weightsTotal(raw) === 100 ? raw : DEFAULT_WEIGHTS }
}

/* ── consent — 1.0's Recording Reminder (consent-dialog.tsx) and its upload dialog's permission ── */
export const DISCLOSURE = 'I’m using an assistant in our meeting to help me give you the best ideas. It follows what we discuss and suggests things to me. What we say stays with our studio — it’s only used for this meeting and never shared with anyone else.'
export const consentLabel = (client: string) => `I’ve told ${client} about the co-pilot`
export const RECORDING_CONSENT = 'Everyone in the meeting agreed to it being recorded and read'
/** The prototype's honest line where 1.0 listened (Deepgram) — shown in the meeting, never hidden. */
export const LISTENING_STAND_IN = 'Listening isn’t connected in this prototype — type what’s said, or paste a transcript. The co-pilot reads it as you go.'
export const TRANSCRIBE_STAND_IN = 'Turning a recording into words isn’t connected in this prototype. The recording is kept in Files — paste its transcript or your notes to make the brief.'
/** (pending modules S34) A build whose server has a transcriber plugged in (lib/meetings/transcribe.ts) — the write-up dialog then takes a
    recording without notes and drops the stand-in's line. Inlined at build time; off on the prototype. */
export const TRANSCRIBES = process.env.NEXT_PUBLIC_TRANSCRIPTION === '1'

/* ── AI credits — the credits audit's Q-45 (his answer, "as recommended"): 25 for each 10 minutes of the live co-pilot, a check-in at each
      block, the block running out finishing, a receipt; Free's one 30-minute meeting (1.0's plg branch: three free blocks, never refreshed).
      Writing a meeting up from notes or a recording is not metered. ── */
export const BLOCK_MS = 10 * 60_000
export const FREE_BLOCKS = 3
/** How long the co-pilot keeps reading after a block ends while the check-in waits for an answer. */
export const CHECK_IN_GRACE_MS = 2 * 60_000
export const blockRef = (meetingId: string, n: number) => `meeting:${meetingId}:${n}`

/* ── the co-pilot's working state, kept on the meeting (`state_json`) ── */
export type MeetingState = {
  /** checklist items ticked or unticked by hand: id → true / false (an auto tick the member unticks stays unticked) */
  hand: Record<string, boolean>
  /** when each checklist item was first ticked (ms) — the timeline */
  tickedAt: Record<string, number>
  /** tips the member closed, and those whose button they pressed */
  dismissed: string[]
  acted: string[]
  /** when each tip first showed (ms) — the timeline and Reports' "tips acted on" */
  seen: Record<string, number>
  /** tags the member added and those they removed (an auto tag removed is never added again — 1.0's dismissed_tags) */
  tags: string[]
  removedTags: string[]
  /** the mood boards made, by style */
  boards: string[]
  /** the deal score as it moved: each change of tier, with its time */
  scores: { at: number; score: number }[]
}
export const EMPTY_STATE: MeetingState = { hand: {}, tickedAt: {}, dismissed: [], acted: [], seen: {}, tags: [], removedTags: [], boards: [], scores: [] }
const strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, 200) : [])
const nums = (v: unknown): Record<string, number> => (v && typeof v === 'object' ? Object.fromEntries(Object.entries(v as Record<string, unknown>).filter(([, n]) => typeof n === 'number' && Number.isFinite(n)).slice(0, 300)) as Record<string, number> : {})
export function parseState(v: unknown): MeetingState {
  let o: Record<string, unknown> = {}
  try { o = (typeof v === 'string' ? JSON.parse(v) : v) as Record<string, unknown> ?? {} } catch { o = {} }
  if (!o || typeof o !== 'object') o = {}
  const hand = o.hand && typeof o.hand === 'object' ? Object.fromEntries(Object.entries(o.hand as Record<string, unknown>).filter(([, b]) => typeof b === 'boolean').slice(0, 200)) as Record<string, boolean> : {}
  const scores = Array.isArray(o.scores) ? (o.scores as unknown[]).flatMap((x) => (x && typeof x === 'object' && typeof (x as { at?: unknown }).at === 'number' && typeof (x as { score?: unknown }).score === 'number' ? [{ at: (x as { at: number }).at, score: (x as { score: number }).score }] : [])).slice(-200) : []
  return { hand, tickedAt: nums(o.tickedAt), dismissed: strs(o.dismissed), acted: strs(o.acted), seen: nums(o.seen), tags: strs(o.tags).slice(0, 20), removedTags: strs(o.removedTags), boards: strs(o.boards).slice(0, 12), scores }
}

/* ── the brief — 1.0's meeting_briefs (summary · customer profile · suggested actions · follow-up draft · upsells · deal score · estimate),
      made by rule from what was said (lib/meetings/brief.ts), every line editable ── */
export type Profile = {
  propertyType: string | null
  areaSqft: number | null
  budgetMinor: { min: number; max: number } | null
  styles: string[]
  timeline: string | null
  keyCollection: string | null
  decisionMakers: string | null
  household: string[]
  rooms: string[]
  concerns: string[]
  competitors: string[]
}
export type EstimateLine = { key: string; name: string; category: string; qty: number; lowMinor: number; highMinor: number; typicalMinor: number }
export type Estimate = { lines: EstimateLine[]; lowMinor: number; highMinor: number; typicalMinor: number }
export type Upsell = { key: string; description: string; category: string; valueMinor: number }
export type BriefObjection = { kind: string; said: string; answer: string | null; answerTitle: string | null; competitor: string | null }
export type MeetingBrief = {
  summary: string
  profile: Profile
  actions: string[]
  followUp: string
  upsells: Upsell[]
  objections: BriefObjection[]
  estimate: Estimate
  score: number | null
  dims: Dims | null
  checklist: { done: number; total: number; missed: string[] }
  tags: string[]
  madeFrom: 'live' | 'notes' | 'recording'
  /** which parts the studio edited by hand — a remake keeps them */
  edited: ('summary' | 'actions' | 'followUp')[]
}
export function parseBrief(v: unknown): MeetingBrief | null {
  let o: unknown = v
  try { if (typeof v === 'string') o = JSON.parse(v) } catch { return null }
  if (!o || typeof o !== 'object' || typeof (o as { summary?: unknown }).summary !== 'string') return null
  return o as MeetingBrief
}

/** What the shared notes show the client (`share_json`): the summary and next steps always; the rough estimate and the mood boards when ticked. */
export type ShareOptions = { estimate: boolean; boards: boolean }
export const DEFAULT_SHARE: ShareOptions = { estimate: false, boards: true }
export function parseShare(v: unknown): ShareOptions {
  let o: Record<string, unknown> = {}
  try { o = (typeof v === 'string' ? JSON.parse(v) : v) as Record<string, unknown> ?? {} } catch { o = {} }
  return { estimate: o?.estimate === true, boards: o?.boards !== false }
}
/** The client's link stays open this many days after its meeting (1.0's share links lasted 24 hours; contracts' windows are 7 · 14 · 30). */
export const LINK_DAYS = 30

/** How long a meeting held with the co-pilot ran, in whole minutes (at least one) — the receipt's figure, the brief's and Activity's; its blocks
    when it has no end on record. */
export const heldMinutes = (m: { startedAt: number | null; endedAt: number | null; blocks: number }): number =>
  m.startedAt !== null && m.endedAt !== null && m.endedAt > m.startedAt ? Math.max(1, Math.round((m.endedAt - m.startedAt) / 60_000)) : m.blocks * 10

export const meetingHref = (id: string) => `/meetings/${id}`
export const clientMeetingPath = (token: string) => `/meeting/${token}`

/** The ids a JSON list column holds. */
export const idsOf = (v: unknown): string[] => { try { const a = typeof v === 'string' ? JSON.parse(v) : v; return Array.isArray(a) ? a.filter((x): x is string => typeof x === 'string') : [] } catch { return [] } }

/** The first name a message speaks to. */
export const firstOf = (name: string) => name.trim().split(/\s+/)[0] ?? name
