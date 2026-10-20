/**
 * (pending modules S27 — Hangouts; his "build all of them" 2026-10-11; survey key public:hangouts) Qanvast Hangouts are Qanvast's in-person
 * events where homeowners meet interior designers at tables in one venue. This is the studio's side of them, pure and client-safe: the words,
 * the preferences both sides give, 1.0's 0–100 match score (src/lib/hangouts/match-score.ts, kept as it was), who takes a new chat, where an
 * event stands, what a meeting's outcome asks next. Every word below is invented copy unless it names 1.0's (1.0's vocabulary:
 * src/data/mock-hangouts.ts — the outcomes and their reasons, the budget bands; the property, status, key and region lists are the house's own,
 * which already carry 1.0's Singapore lists, lib/leads/enums.ts).
 */
import { CONDITION_OPTIONS, DISTRICTS, KEY_COLLECTION_OPTIONS, PROPERTY_TYPE_GROUPS, STYLE_OPTIONS } from '@/lib/leads/enums'

export const DAY_MS = 86_400_000

/* ── the preferences ─────────────────────────────────────────────────────────────────────────────────────────────────────────────── */

/** The kinds of home a studio says it wants to meet — the house's property groups, by their first word (1.0: HDB · Condo · Landed). */
export const HOME_KINDS = ['HDB', 'BTO', 'Condo', 'Landed', 'Commercial'] as const
export type HomeKind = (typeof HOME_KINDS)[number]
/** The kind of home a property type is — "HDB 4-Room" → HDB, "Executive Condo" / "Penthouse" → Condo, "Landed — Terrace" → Landed. */
export function homeKindOf(propertyType: string | null | undefined): HomeKind | null {
  const t = (propertyType ?? '').trim()
  if (!t) return null
  const group = PROPERTY_TYPE_GROUPS.findIndex((g) => g.includes(t))
  const byGroup: (HomeKind | null)[] = ['HDB', 'BTO', 'Condo', 'Landed', 'Commercial', null]
  if (group >= 0) return byGroup[group] ?? null
  return /^hdb/i.test(t) ? 'HDB' : /^bto/i.test(t) ? 'BTO' : /condo|penthouse/i.test(t) ? 'Condo' : /^landed/i.test(t) ? 'Landed' : /^commercial/i.test(t) ? 'Commercial' : null
}
/** 1.0's budget bands (mock-hangouts.ts BUDGET_RANGES), with the lead's budget each one stands for (the band's middle; "100k+" its floor). */
export const BUDGET_BANDS = [
  { key: '20k-40k', label: 'S$20k–40k', minor: 3_000_000 },
  { key: '40k-60k', label: 'S$40k–60k', minor: 5_000_000 },
  { key: '60k-80k', label: 'S$60k–80k', minor: 7_000_000 },
  { key: '80k-100k', label: 'S$80k–100k', minor: 9_000_000 },
  { key: '100k+', label: 'S$100k and more', minor: 10_000_000 },
] as const
export const budgetLabel = (k: string | null | undefined) => BUDGET_BANDS.find((b) => b.key === k)?.label ?? null
/** The band a budget falls in — a lead's budget read back as the studio's words. */
export function bandOf(minor: number | null | undefined): string | null {
  if (!minor || minor <= 0) return null
  return minor < 4_000_000 ? '20k-40k' : minor < 6_000_000 ? '40k-60k' : minor < 8_000_000 ? '60k-80k' : minor < 10_000_000 ? '80k-100k' : '100k+'
}
export const HOME_STATUSES = CONDITION_OPTIONS   // New · Resale · Renovated (1.0's Existing reads Renovated, REG-607)
export const KEY_TIMES = KEY_COLLECTION_OPTIONS
/** "Collected" · "Keys in 3 months" · "Later" — a key time as a chip says it */
export const keyLabel = (k: string) => (k === 'Collected' || k === 'Later' ? k : `Keys ${k}`)
export const AREAS = DISTRICTS
/** Styles a homeowner can name — the house list without its catch-alls ("Others"). */
export const STYLES = STYLE_OPTIONS.filter((s) => s !== 'Others')

/** What a homeowner tells the studio when they book (1.0's hangout_homeowners.preferences, one answer each but styles). */
export type HomeownerPrefs = { propertyType: string | null; status: string | null; budget: string | null; keys: string | null; area: string | null; styles: string[] }
export const EMPTY_HOMEOWNER: HomeownerPrefs = { propertyType: null, status: null, budget: null, keys: null, area: null, styles: [] }

/** The six things a match weighs — 1.0's dimensions, in 1.0's order, in plain words. */
export const DIMENSIONS = [
  { key: 'propertyType', label: 'Kind of home' },
  { key: 'propertyStatus', label: 'New, resale or renovated' },
  { key: 'budgetRange', label: 'Budget' },
  { key: 'keyCollection', label: 'Key collection' },
  { key: 'region', label: 'Area' },
  { key: 'designStyle', label: 'Style' },
] as const
export type DimensionKey = (typeof DIMENSIONS)[number]['key']
export type Weights = Record<DimensionKey, number>
/** 1.0's default weights (OwnerPlanTab: 20 · 15 · 25 · 15 · 15 · 10 — budget first). */
export const DEFAULT_WEIGHTS: Weights = { propertyType: 20, propertyStatus: 15, budgetRange: 25, keyCollection: 15, region: 15, designStyle: 10 }
/** Who the studio would like to meet (1.0's hangout_studio_preferences.preferences): kinds of home, statuses, budget bands, one key time,
    areas, styles — and how much each weighs. An empty dimension is not weighed at all (1.0's rule). */
export type StudioPrefs = { propertyType: string[]; propertyStatus: string[]; budgetRange: string[]; keyCollection: string | null; region: string[]; designStyle: string[]; weights: Weights }
export const EMPTY_STUDIO: StudioPrefs = { propertyType: [], propertyStatus: [], budgetRange: [], keyCollection: null, region: [], designStyle: [], weights: { ...DEFAULT_WEIGHTS } }

const strs = (v: unknown, allowed?: readonly string[]): string[] => (Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === 'string' && (!allowed || allowed.includes(x))))] : [])
const one = (v: unknown, allowed?: readonly string[]): string | null => (typeof v === 'string' && v.trim() && (!allowed || allowed.includes(v)) ? v.trim().slice(0, 80) : null)
const ALL_TYPES = PROPERTY_TYPE_GROUPS.flat()

export function parseHomeownerPrefs(v: unknown): HomeownerPrefs {
  let o: Record<string, unknown> = {}
  try { o = (typeof v === 'string' ? JSON.parse(v) : v ?? {}) as Record<string, unknown> } catch { o = {} }
  return {
    propertyType: one(o.propertyType, ALL_TYPES), status: one(o.status, HOME_STATUSES), budget: one(o.budget, BUDGET_BANDS.map((b) => b.key)),
    keys: one(o.keys, KEY_TIMES), area: one(o.area, AREAS), styles: strs(o.styles, STYLES).slice(0, 6),
  }
}
export function parseStudioPrefs(v: unknown): StudioPrefs {
  let o: Record<string, unknown> = {}
  try { o = (typeof v === 'string' ? JSON.parse(v) : v ?? {}) as Record<string, unknown> } catch { o = {} }
  const w = (o.weights ?? {}) as Record<string, unknown>
  const weights = Object.fromEntries(DIMENSIONS.map((d) => { const n = Number(w[d.key]); return [d.key, Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : DEFAULT_WEIGHTS[d.key]] })) as Weights
  return {
    propertyType: strs(o.propertyType, HOME_KINDS), propertyStatus: strs(o.propertyStatus, HOME_STATUSES), budgetRange: strs(o.budgetRange, BUDGET_BANDS.map((b) => b.key)),
    keyCollection: one(o.keyCollection, KEY_TIMES), region: strs(o.region, AREAS), designStyle: strs(o.designStyle, STYLES), weights,
  }
}
export const weightTotal = (w: Weights) => DIMENSIONS.reduce((s, d) => s + (w[d.key] ?? 0), 0)
/** Whether the studio has said anything about who it would like to meet. */
export const hasStudioPrefs = (p: StudioPrefs) => p.propertyType.length + p.propertyStatus.length + p.budgetRange.length + p.region.length + p.designStyle.length > 0 || !!p.keyCollection

/** Even shares that add up to 100 — 1.0's "Distribute evenly" (the first ones take the remainder). */
export function evenSplit<K extends string>(keys: readonly K[]): Record<K, number> {
  const n = Math.max(keys.length, 1), base = Math.floor(100 / n), rest = 100 - base * n
  return Object.fromEntries(keys.map((k, i) => [k, base + (i < rest ? 1 : 0)])) as Record<K, number>
}

/* ── 1.0's match score, unchanged (src/lib/hangouts/match-score.ts) ───────────────────────────────────────────────────────────────── */

function arrayOverlap(ho: string[], st: string[]): number {
  if (ho.length === 0 || st.length === 0) return 0
  return ho.filter((v) => st.includes(v)).length / ho.length
}
/**
 * How well a homeowner fits who the studio would like to meet, 0–100: each dimension's overlap (the share of the homeowner's answers the
 * studio wants; one answer each but styles) times its weight, over the weights of the dimensions the studio filled in — a dimension it left
 * empty is not counted at all, so a perfect fit on everything it cares about scores 100. Null when the studio said nothing.
 */
export function computeMatchScore(ho: HomeownerPrefs, st: StudioPrefs): { score: number; breakdown: Partial<Record<DimensionKey, number>> } | null {
  const kind = homeKindOf(ho.propertyType)
  const sides: Record<DimensionKey, [string[], string[]]> = {
    propertyType: [kind ? [kind] : [], st.propertyType],
    propertyStatus: [ho.status ? [ho.status] : [], st.propertyStatus],
    budgetRange: [ho.budget ? [ho.budget] : [], st.budgetRange],
    keyCollection: [ho.keys ? [ho.keys] : [], st.keyCollection ? [st.keyCollection] : []],
    region: [ho.area ? [ho.area] : [], st.region],
    designStyle: [ho.styles, st.designStyle],
  }
  let total = 0, sum = 0
  const breakdown: Partial<Record<DimensionKey, number>> = {}
  for (const d of DIMENSIONS) {
    const [h, s] = sides[d.key]
    if (s.length === 0) continue
    const v = d.key === 'keyCollection' ? (h[0] && s[0] && h[0].toLowerCase() === s[0].toLowerCase() ? 1 : 0) : arrayOverlap(h, s)
    breakdown[d.key] = v
    sum += v * (st.weights[d.key] ?? 0)
    total += st.weights[d.key] ?? 0
  }
  if (total <= 0) return null
  return { score: Math.round((sum / total) * 100), breakdown }
}

/* ── where an event stands ────────────────────────────────────────────────────────────────────────────────────────────────────────── */

export type EventFacts = { startsOn: number; dayCount: number; startTime: string; endTime: string; feedStatus: string }
/** The event's days, each at local midnight. */
export const eventDays = (e: Pick<EventFacts, 'startsOn' | 'dayCount'>): number[] => Array.from({ length: Math.max(1, e.dayCount) }, (_, i) => dayAfter(e.startsOn, i))
/** Local midnight `n` days after `day` (a DST day still lands on midnight). */
export function dayAfter(day: number, n: number): number { const d = new Date(day); return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n).getTime() }
export const midnightOf = (at: number): number => { const d = new Date(at); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() }
/** ahead · today (one of its days) · ended · cancelled — from Qanvast's word and the days. */
export type Phase = 'ahead' | 'today' | 'ended' | 'cancelled'
export function phaseOf(e: EventFacts, now: number): Phase {
  if (e.feedStatus === 'cancelled') return 'cancelled'
  const today = midnightOf(now)
  const days = eventDays(e)
  if (days.includes(today)) return 'today'
  if (e.feedStatus === 'closed' || today > days[days.length - 1]!) return 'ended'
  return 'ahead'
}
/** Whether `at` is one of the event's days. */
export const isEventDay = (e: Pick<EventFacts, 'startsOn' | 'dayCount'>, at: number) => eventDays(e).includes(midnightOf(at))

export type Participation = 'none' | 'applied' | 'confirmed' | 'declined' | 'withdrawn'
/** The one status a Hangout card wears — open to apply, applied, taking part, today, ended — and its chip colour. */
export function standingOf(phase: Phase, p: Participation): { word: string; tone: 'default' | 'green' | 'yellow' | 'red' | 'blue' } {
  if (phase === 'cancelled') return { word: 'Cancelled by Qanvast', tone: 'default' }
  const taking = p === 'confirmed'
  if (phase === 'ended') return { word: taking ? 'Ended' : 'Ended', tone: 'default' }
  if (phase === 'today' && taking) return { word: 'Today', tone: 'green' }
  if (taking) return { word: 'Taking part', tone: 'green' }
  if (p === 'applied') return { word: 'Applied', tone: 'yellow' }
  if (p === 'declined') return { word: 'Not this time', tone: 'default' }
  return { word: 'Open to apply', tone: 'blue' }
}
/** Places still open for studios: the tables over the tables each studio takes, less the studios Qanvast has confirmed (1.0's SpotsRemaining). */
export function placesLeft(e: { totalTables: number; tablesPerStudio: number; studiosTaking: number }): number {
  const max = e.tablesPerStudio > 0 ? Math.floor(e.totalTables / e.tablesPerStudio) : 0
  return Math.max(0, max - e.studiosTaking)
}

/* ── words ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────── */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
/** "Sat 24 Oct" */
export const dayWord = (at: number) => { const d = new Date(at); return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}` }
/** "Saturday 24 Oct" */
export const dayLong = (at: number) => { const d = new Date(at); return `${LONG[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}` }
/** The event's days: "Sat 24 Oct" · "Sat 24 – Sun 25 Oct" · "Fri 31 Oct – Sat 1 Nov". */
export function daysLine(e: Pick<EventFacts, 'startsOn' | 'dayCount'>): string {
  const days = eventDays(e)
  const a = new Date(days[0]!), b = new Date(days[days.length - 1]!)
  if (days.length === 1) return dayWord(days[0]!)
  return a.getMonth() === b.getMonth() ? `${DAYS[a.getDay()]} ${a.getDate()} – ${DAYS[b.getDay()]} ${b.getDate()} ${MONTHS[b.getMonth()]}` : `${dayWord(days[0]!)} – ${dayWord(days[days.length - 1]!)}`
}
/** "11:00" → "11:00 AM" · "15:30" → "3:30 PM" (the house's clock, displayTime). */
export function clockWords(hhmm: string): string {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim())
  if (!m) return hhmm
  const h = Number(m[1]), am = h < 12 ? 'AM' : 'PM'
  return `${h % 12 || 12}:${m[2]} ${am}`
}
export const hoursLine = (from: string, to: string) => `${clockWords(from)} – ${clockWords(to)}`
export type ShiftFacts = { id: string; label: string; dayAt: number; startTime: string; endTime: string }
/** "Sat 24 Oct · Morning, 11:00 AM – 3:00 PM" */
export const shiftLine = (s: ShiftFacts, withDay = true) => `${withDay ? `${dayWord(s.dayAt)} · ` : ''}${s.label}, ${hoursLine(s.startTime, s.endTime)}`
/** The time `hhmm` on `day` (local). */
export function atClock(day: number, hhmm: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim())
  const d = new Date(day)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), m ? Number(m[1]) : 0, m ? Number(m[2]) : 0).getTime()
}
/** "Table 12" · "Tables 11 and 12" · "Tables 3, 4 and 5" */
export function tablesWords(tables: readonly number[]): string | null {
  if (!tables.length) return null
  if (tables.length === 1) return `Table ${tables[0]}`
  return `Tables ${tables.slice(0, -1).join(', ')} and ${tables[tables.length - 1]}`
}
export const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name

/* ── meetings ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────── */

export type MeetingStatus = 'scheduled' | 'in-progress' | 'completed' | 'cancelled'
/** 1.0's three outcomes and the reasons it offered under each (mock-hangouts.ts MEETING_SUB_STATUSES). */
export const OUTCOMES = [
  { key: 'converted', label: 'Converted', reasons: ['Signed'] },
  { key: 'follow-up', label: 'Follow-up', reasons: ['Needs second meeting', 'Awaiting quote', 'Site visit needed'] },
  { key: 'dropped', label: 'Dropped', reasons: ['Budget mismatch', 'Not a fit', 'Not proceeding', 'Style mismatch'] },
] as const
export type OutcomeKey = (typeof OUTCOMES)[number]['key']
export const isOutcome = (v: unknown): v is OutcomeKey => typeof v === 'string' && OUTCOMES.some((o) => o.key === v)
export const outcomeLabel = (k: string | null | undefined) => OUTCOMES.find((o) => o.key === k)?.label ?? null
export const reasonsOf = (k: string | null | undefined): readonly string[] => OUTCOMES.find((o) => o.key === k)?.reasons ?? []
/** (S42E, call E·3) A dropped chat's reason as the Lost dialog's (the studio's default Lost reasons, REG-607): the same words where they are the
    same, the nearest otherwise — the Overview picks it only while the studio's own list still has it. */
const LOST_FOR_DROP: Record<string, string> = { 'Budget mismatch': 'Budget mismatch', 'Not a fit': 'Not a fit', 'Style mismatch': 'Not a fit', 'Not proceeding': 'Cancelled by client' }
export const lostReasonFor = (reason: string | null | undefined): string | null => (reason ? LOST_FOR_DROP[reason] ?? null : null)

/** The one word a meeting's row wears. */
export function meetingWord(m: { status: string; outcome: string | null }): string {
  if (m.status === 'in-progress') return 'In progress'
  if (m.status === 'scheduled') return 'Waiting'
  if (m.status === 'cancelled') return 'Cancelled'
  return outcomeLabel(m.outcome) ?? 'Done'
}
/** 1.0's 45-minute chat (IDMeetingView's countdown). */
export const MEETING_MINUTES = 45

/**
 * What a held chat's outcome asks of the studio next — the follow-up task it raises for the designer (2.0's follow-ups are tasks, REG-608);
 * none for a dropped one (the lead can be marked lost from its own page).
 */
export function followUpFor(outcome: OutcomeKey | null, reason: string | null, client: string): string | null {
  const n = firstName(client)
  if (outcome === 'converted') return `Start ${n}’s quote`
  if (outcome !== 'follow-up') return null
  if (reason === 'Awaiting quote') return `Send ${n} a quote`
  if (reason === 'Site visit needed') return `Arrange a site visit with ${n}`
  return `Book a second meeting with ${n}`
}
/** What the homeowner's page says comes next, once the chat is over — by rule from the outcome, never a model's words. */
export function clientNextLine(outcome: string | null, reason: string | null, designer: string | null, studio: string): string {
  const who = designer ? firstName(designer) : studio
  if (outcome === 'converted') return `${who} will be in touch about your quote.`
  if (outcome === 'follow-up') {
    if (reason === 'Awaiting quote') return `${who} is preparing your quote and will send it to you.`
    if (reason === 'Site visit needed') return `${who} will message you to arrange a visit to your home.`
    return `${who} will message you to book a second meeting.`
  }
  return `Thank you for meeting ${studio}.`
}

/**
 * Who takes a new chat on a shift (1.0's matching, kept to the studio's own table): the designers on that shift who are not on a break, the one
 * furthest below their share of the meetings (1.0's capacity_percent — an even share when none is set), then the one with fewer chats, then by
 * name. Null when nobody is on the shift.
 */
export function pickDesigner(cands: { memberId: string; name: string; sharePct: number | null; onBreak: boolean; chats: number }[]): string | null {
  const pool = cands.filter((c) => !c.onBreak)
  if (!pool.length) return null
  const total = pool.reduce((s, c) => s + c.chats, 0) + 1
  const even = 100 / pool.length
  const want = (c: (typeof pool)[number]) => Math.max(1, c.sharePct ?? even)
  return [...pool].sort((a, b) => (a.chats / total) / want(a) - (b.chats / total) / want(b) || a.chats - b.chats || a.name.localeCompare(b.name))[0]!.memberId
}

/** The table a chat is at: the studio's tables (Qanvast's) shared out among the designers on its shift in a fixed order — each keeps one table
    through the shift where there are enough; nobody yet, the first table. Null when Qanvast has given no tables. */
export function tableFor(tables: readonly number[], onShift: readonly string[], memberId: string | null): number | null {
  if (!tables.length) return null
  const order = [...new Set(onShift)].sort()
  const i = memberId ? order.indexOf(memberId) : -1
  return tables[(i < 0 ? 0 : i) % tables.length]!
}

/** A public page's token (the studio's page, a homeowner's own page) — 18 random bytes, URL-safe. Made on the server only. */
export const TOKEN_RE = /^[A-Za-z0-9_-]{16,64}$/
export const isToken = (t: unknown): t is string => typeof t === 'string' && TOKEN_RE.test(t)

/** The studio's page for an event, and a homeowner's own page on it. */
export const hangoutPagePath = (token: string) => `/hangout/${token}`
export const hangoutOwnPath = (token: string, reg: string) => `/hangout/${token}/${reg}`
/** The studio's page for the event — the Hangouts list's and the event's own address. */
export const HANGOUTS_HREF = '/qanvast-ops/hangouts'
export const hangoutHref = (eventId: string, view?: 'plan' | 'meetings' | 'results') => `${HANGOUTS_HREF}/${encodeURIComponent(eventId)}${view ? `?view=${view}` : ''}`
export const VIEWS = ['plan', 'meetings', 'results'] as const
export type HangoutView = (typeof VIEWS)[number]
export const isView = (v: unknown): v is HangoutView => typeof v === 'string' && (VIEWS as readonly string[]).includes(v)
/** The view an event opens on when the address names none: before the day its plan, on the day its meetings, after it the results. */
export const defaultView = (phase: Phase, taking: boolean): HangoutView => (!taking ? 'plan' : phase === 'today' ? 'meetings' : phase === 'ended' ? 'results' : 'plan')
