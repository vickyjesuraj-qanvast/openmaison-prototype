/*
 * (the Dashboard redesigned, 2026-10-26 — his mark P-02 · lane D1) **Since you were last here**: what clients and the team did since the
 * member's last sitting, as chips under the greeting — each opens exactly that. Pure and client-safe; read by lib/dashboard/since-queries.ts.
 * The contract: design-source/context/dashboard-redesign-2026-10-26/brief.md § Since.
 *
 * The mark is the member's own, kept on their record (`members.dashboard_seen_at` · `dashboard_since_at`): a SITTING is the run of visits with
 * no gap longer than `SITTING_GAP`. The chips count from the view before this sitting began, so a reload, a Back from a record or a second tab
 * keeps the same row until the member leaves for a while. A first visit has no mark: the chips say what is new this week.
 */
import { STUDIO_TZ } from './frame'

/** A new sitting starts when the latest view is older than this — the chips then count from the view before it (members.dashboard_since_at). */
export const SITTING_GAP = 2 * 60 * 60_000
/** A first visit's window: what is new this week (the last seven days). */
export const FIRST_VISIT_MS = 7 * 86_400_000
/** How many records a chip's list names before its "See all" door (the house menu's length). */
export const SINCE_LIST = 6

/** One record behind a chip that stands for several — the chip's list names each, and each opens exactly that. */
export type SinceItem = { key: string; label: string; sub?: string; href: string; at: number }

/** One chip: its glyph, its words (bold parts are the figure and the name), the thing it opens and when it happened. `fresh` = new since the
    mark and not yet opened anywhere (tinted); one whose records the member has already opened elsewhere (a lead they clicked) is not. */
export type SinceChip = {
  key: string
  kind: SinceKind
  icon: string
  words: { t: string; bold?: boolean }[]
  /** The chip's accessible name — its words as one sentence, and where it goes. */
  aria: string
  href: string
  at: number
  fresh: boolean
  /** (brief § 4, shared marks) The Needs you row the same thing waits in (`data-inbox-row`): pressed, the chip scrolls to that row and pulses it
      instead of leaving the page — when the row is on the page; else it opens `href`. */
  rowKey?: string
  /** A chip that stands for several records lists them (each opens exactly that); `all` opens their list in its own home. */
  items?: SinceItem[]
  all?: { label: string; href: string }
  /** (the calm pass 2026-10-26) How many records it stands for — 3 new leads count 3 — for the greeting's "4 new since Friday". */
  count?: number
}
export type SinceKind = 'leads' | 'quote-confirmed' | 'quote-opened' | 'contract-signed' | 'payment-said' | 'site-update' | 'client-message' | 'ticket' | 'article'

export type SinceData = {
  /** The mark the chips count from — null on a first visit (then the chips say what is new this week). */
  since: number | null
  chips: SinceChip[]
  /** How many things are new since the mark, in all — the greeting's "3 new since Friday" (each record once: 3 leads + 1 article = 4). */
  fresh: number
  /** "since Friday" · "since yesterday" · "since 9:12 AM" · "since 19 Oct" · "this week" (a first visit) — the greeting's words for the mark. */
  sinceWords: string | null
}

/** The mark a page load counts from: a first visit has none; a latest view older than a sitting starts a new one (count from it); else the
    sitting's own mark. The same rule moves the record after the page has drawn (app/dashboard/frame-actions.ts `markDashboardVisit`). */
export function markOf(seenAt: number | null, sinceAt: number | null, now: number): number | null {
  if (seenAt === null) return null
  if (now - seenAt > SITTING_GAP) return seenAt
  return sinceAt ?? seenAt
}
/** Where the chips count from: the mark, never more than a week back (a first visit, or a member away for longer, reads this week's news). */
export const sinceFrom = (mark: number | null, now: number): number => Math.max(mark ?? 0, now - FIRST_VISIT_MS)
/** What a visit writes: the latest view is now; the sitting's mark moves to the view before it when a new sitting starts, and a first visit's
    sitting counts from a week back (so its reloads keep the same chips). */
export function visitOf(seenAt: number | null, sinceAt: number | null, now: number): { seenAt: number; sinceAt: number } {
  if (seenAt === null) return { seenAt: now, sinceAt: now - FIRST_VISIT_MS }
  if (now - seenAt > SITTING_GAP) return { seenAt: now, sinceAt: seenAt }
  return { seenAt: now, sinceAt: sinceAt ?? seenAt }
}

const parts = (t: number, tz: string) => {
  const f = new Intl.DateTimeFormat('en-GB', { timeZone: tz, year: 'numeric', month: 'numeric', day: 'numeric', weekday: 'long', hour: 'numeric', minute: '2-digit', hourCycle: 'h12' })
  const p = Object.fromEntries(f.formatToParts(new Date(t)).map((x) => [x.type, x.value]))
  return { y: Number(p.year), m: Number(p.month), d: Number(p.day), weekday: p.weekday ?? '', hour: Number(p.hour), minute: p.minute ?? '00', period: (p.dayPeriod ?? '').toUpperCase() }
}
/** The calendar day a moment falls on in the studio's zone, as a whole number (differences are whole days). */
export const studioDay = (t: number, tz = STUDIO_TZ): number => { const p = parts(t, tz); return Math.round(Date.UTC(p.y, p.m - 1, p.d) / 86_400_000) }
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
/** "9:12 AM" in the studio's zone. */
export const studioTime = (t: number, tz = STUDIO_TZ): string => { const p = parts(t, tz); return `${p.hour}:${p.minute} ${p.period === 'PM' || p.period === 'P.M.' ? 'PM' : 'AM'}` }

/** The greeting's words for the mark, by the studio's clock (invented copy): the same day "since 9:12 AM", the day before "since yesterday",
    within the week its weekday "since Friday"; none (a first visit), or a week or more away, "this week" — the row never reaches further back
    than a week (`sinceFrom`). */
export function sinceWordsOf(mark: number | null, now: number, tz = STUDIO_TZ): string {
  if (mark === null || now - mark >= FIRST_VISIT_MS - 60_000) return 'this week'
  const gap = studioDay(now, tz) - studioDay(mark, tz)
  if (gap <= 0) return `since ${studioTime(mark, tz)}`
  if (gap === 1) return 'since yesterday'
  if (gap < 7) return `since ${parts(mark, tz).weekday}`
  const p = parts(mark, tz)
  return `since ${p.d} ${MON[p.m - 1]}`
}
/** When one record happened, for its line in a chip's list (invented copy): "9:12 AM" today, "Yesterday 6:30 PM", "Sat 9:05 AM", "19 Oct". */
export function whenWords(at: number, now: number, tz = STUDIO_TZ): string {
  const gap = studioDay(now, tz) - studioDay(at, tz)
  if (gap <= 0) return studioTime(at, tz)
  if (gap === 1) return `Yesterday ${studioTime(at, tz)}`
  if (gap < 7) return `${parts(at, tz).weekday.slice(0, 3)} ${studioTime(at, tz)}`
  const p = parts(at, tz)
  return `${p.d} ${MON[p.m - 1]}`
}

/** A chip's words as one sentence (its accessible name and its menu's title). */
export const chipSentence = (words: SinceChip['words']) => words.map((w) => w.t).join('').replace(/\s+/g, ' ').trim()

/** A chip's place in the row: what a client did first (they wait on the studio), then the team's, then new leads, then the editors' article;
    inside a kind, the newest first. */
const ORDER: Record<SinceKind, number> = { 'payment-said': 0, 'quote-confirmed': 1, 'contract-signed': 2, 'ticket': 3, 'client-message': 4, 'quote-opened': 5, 'leads': 6, 'site-update': 7, 'article': 8 }
export const orderChips = (chips: SinceChip[]): SinceChip[] => [...chips].sort((a, b) => ORDER[a.kind] - ORDER[b.kind] || b.at - a.at)

/** A pressed chip leaves the row for this browser until something newer happens (its key names its newest record). */
export const pressedKey = (chip: Pick<SinceChip, 'key'>) => `om.dash.since.${chip.key}`

/**
 * (the calm pass 2026-10-26 — his "too busy … simplify", the Claude Design option he took, his correction 4) **The greeting's one link** in
 * place of the row of chips: nothing new — no link; one piece of news — its own sentence, opening that thing (a chip that stands for several,
 * "3 new leads · all from Hangout", opens its list); more — "4 new since Friday", opening the list of all of it (invented copy). `chips` are
 * the ones this browser hasn't pressed yet; the count is the records they stand for (each once).
 */
export type SinceLink = { kind: 'one'; chip: SinceChip; words: string } | { kind: 'many'; chips: SinceChip[]; count: number; words: string }
export const chipCount = (c: Pick<SinceChip, 'count' | 'items'>): number => c.count ?? c.items?.length ?? 1
export function sinceLinkOf(chips: SinceChip[], sinceWords: string | null): SinceLink | null {
  if (!chips.length) return null
  if (chips.length === 1) return { kind: 'one', chip: chips[0]!, words: chipSentence(chips[0]!.words) }
  const count = chips.reduce((s, c) => s + chipCount(c), 0)
  return { kind: 'many', chips, count, words: `${count} new ${sinceWords ?? 'this week'}` }
}
