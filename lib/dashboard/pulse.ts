/*
 * (the Dashboard redesigned, 2026-10-26 — his marks P-03 · Q-04 · lane D1) **Pulse**: the studio's figures in one strip under the greeting —
 * each with its comparison, a direction and an 8-week trend, a grade where its report grades it, "Early" on a profit the costs haven't
 * reached yet; a press opens its report. Every figure is its module's own (Reports › Leads · Sales · Reports › Finance · Money in), never a
 * second count. Pure and client-safe; read by lib/dashboard/pulse-queries.ts. The contract: brief.md § Pulse.
 * (the calm pass 2026-10-26 — his "data looks fine … visually too busy", the Claude Design option he took: brief-calm.md § 1 Pulse) Four white
 * cards — a small capitals label, the value, ONE caption line and at most ONE quiet visual (a thin line, or Owed to you's age bar); the
 * comparison, the grade's word and "Early" moved into the figure's name and its breakdown, the caption saying what the eye needs.
 */
import { isAccounting, isMarketing, runsStudio } from '@/lib/settings/roles'
import { STUDIO_TZ } from './frame'

/** A comparison: its words ("▲ 3 vs last week"), which way the figure moved, and whether that way is good for the studio — null when it is
    neither (his § 2: green / red only when the direction is good / bad for the studio; a falling response time is good). */
export type PulseDelta = { text: string; dir: 'up' | 'down' | 'flat'; good: boolean | null
  /** The comparison in full when the strip writes it short ("▲ 1" → "▲ 1 vs the 90 days before") — its accessible name and tooltip. */
  title?: string }

/** One line of a figure taken apart (hover, a long press): its words, its value and where it opens. */
export type PulseBreak = { label: string; value: string; href?: string }

/** (the calm pass 2026-10-26) A part of a figure's one caption line, and its tone — red only for what is ours and late (a missed First-response
    mark, what the studio owes past due — S-05), amber for a client's lateness (Owed to you's over-60 part, his correction 2); else the
    secondary ink. */
export type PulseTone = 'late' | 'theirs'
export type PulsePart = { t: string; tone?: PulseTone }

export type PulseFigure = {
  /** The figure's key — `tile-<key>` is its test id (the S22 tiles' ids kept: leads · sales · response · owed · profit · owe · projects). */
  key: PulseKey
  label: string
  value: string
  /** The comparison with the period before (P-03) — (the calm pass) off the card's face: the breakdown's title and the figure's name say it. */
  delta?: PulseDelta
  /** (the calm pass 2026-10-26) The card's ONE caption line under the value, in parts ("3 of 30 leads · 10% win rate"; "S$ 22.1K over 60 days"
      amber, "· 3 invoices"). */
  caption: PulsePart[]
  /** Its report's grade (Response time: Fast · OK · Slow) — said in the figure's name; Slow colours the caption (ours and late). */
  grade?: { label: string; tone: 'good' | 'warn' | 'bad' }
  /** Eight weekly values, oldest first (Q-04: from the records' own dates) — the last is this week; a week with nothing to measure is null.
      `ahead` = the weeks to come instead (Coming in: the next four). (the calm pass) Drawn as ONE thin line — the card's one quiet visual. */
  trend?: (number | null)[]
  ahead?: boolean
  /** What one point is, for its accessible name ("Leads added each week, the last 8 weeks"). */
  trendWords?: string
  /** A mark across the line (First response: the report's Fast band, 8 hours). */
  target?: number
  /** Owed to you · You owe by age: each band's label, share of the whole and tone (≤30 · 31–60 · 60+ days) — the card's one quiet visual. */
  aging?: { label: string; share: number; value: string; tone?: PulseTone }[]
  /** "Early" and why ("Costs not in yet on 2 projects") — a profit shown before its costs are in (said in its caption and its name). */
  early?: string
  href: string
  aria: string
  /** The breakdown's door to the figure's home ("Open the Sales report", "Open them in Leads"). */
  openLabel?: string
  /** What hover (or a long press) shows: the figure taken apart — by source, by age, by project — and its title ("By source · this week"). */
  breakdown?: PulseBreak[]
  breakdownTitle?: string
}
export type PulseData = { figures: PulseFigure[] }

export type PulseKey = 'leads' | 'sales' | 'response' | 'owed' | 'coming' | 'profit' | 'owe' | 'gst' | 'projects' | 'commission'

/** (his P-11 · the Roles table; **the calm pass 2026-10-26** — the Claude Design option he took: an Owner's or Admin's four) Each role's figures,
    in the cards' order — the page and its ghost read the same list. Owner / Admin: Won · Owed to you · Profit · First response (Profit only for a
    member who sees costs and margins, `seesProfit`; Leads this week and Coming in left the strip — the Pipeline card and Since say the new
    leads, Reports › Finance › Cash flow the money due); Manager: the leads' three over their team (Won as a count — no money); Designer:
    their own leads, projects and commission; Accounting: the money's four; Marketing: the lead desk's two. */
export function pulseKeysFor(role: string | null | undefined, o: { profit: boolean }): PulseKey[] {
  if (isAccounting(role)) return ['owed', 'coming', 'owe', 'gst']
  if (isMarketing(role)) return ['leads', 'response']
  if (runsStudio(role)) return o.profit ? ['sales', 'owed', 'profit', 'response'] : ['sales', 'owed', 'response']
  if (role === 'Manager') return ['leads', 'sales', 'response']
  return ['leads', 'projects', 'commission']
}
/** Each figure's name (invented copy) — the cards and their ghost read the same words; a Designer's Leads figure is their own ("My leads");
    Profit names its month (`profitLabel`). */
/* (the calm UI build 2026-10-27 — the audit's 1-17 · 3-03 · T-01 · T-09) sentences a studio owner says, in sentence case: "Won in the last 90
   days" (was "Won · 90 days"), "To collect" (was "Owed to you" — the one word for what a client still owes), "To pay" (was "You owe"), "First
   reply to new leads" (was "First response"), "Coming in the next 30 days", "Profit in October". The keys and the `tile-<key>` ids stay. */
export const PULSE_LABEL: Record<PulseKey, string> = {
  leads: 'Leads this week', sales: 'Won in the last 90 days', response: 'First reply to new leads', owed: 'To collect', coming: 'Coming in the next 30 days', profit: 'Profit this month',
  owe: 'To pay', gst: 'GST this quarter', projects: 'My projects', commission: 'Your commission to be paid',
}
/** "Profit in October" — the month by the studio's clock (was "Profit · October"). */
export const profitLabel = (now: number, tz = STUDIO_TZ) => `Profit in ${new Intl.DateTimeFormat('en-GB', { month: 'long', timeZone: tz }).format(new Date(now))}`
export const pulseLabel = (key: PulseKey, role: string | null | undefined): string => (key === 'leads' && pulseKeysFor(role, { profit: false }).includes('projects') ? 'My leads' : PULSE_LABEL[key])
/** What the card draws under its value — its ONE quiet visual (the calm pass): a thin line, an age bar, or nothing but its words. */
export const PULSE_SHAPE: Record<PulseKey, 'spark' | 'aging' | 'words'> = {
  leads: 'spark', sales: 'spark', response: 'spark', owed: 'aging', coming: 'spark', profit: 'words', owe: 'aging', gst: 'words', projects: 'words', commission: 'words',
}
/** …on a role's page: a Designer's My leads is the count of their own leads, with no weeks under it (`fetchPulse`) — the ghost draws what the page will. */
export const pulseShapeOf = (k: PulseKey, role: string | null | undefined): 'spark' | 'aging' | 'words' => (k === 'leads' && role === 'Designer' ? 'words' : PULSE_SHAPE[k])

/** First response's mark: the report's Fast band (lib/leads/tat.ts `tatGrade` — within 8 hours). */
export const RESPONSE_TARGET_MS = 8 * 3_600_000

/** A figure's caption as one sentence (its accessible name, the ghost's words). */
export const captionText = (parts: PulsePart[]) => parts.map((p) => p.t).join('')

/** The comparison's words over two counts (invented copy): "▲ 3 vs last week" · "▼ 2 vs last week" · "Same as last week" — none when both are
    nothing (a quiet studio's strip says its own line, not "Same as before"). */
export function countDelta(cur: number, prior: number, against: string, upIsGood: boolean | null = true): PulseDelta | undefined {
  if (!cur && !prior) return undefined
  const d = cur - prior
  if (d === 0) return { text: `Same as ${against}`, dir: 'flat', good: null }
  return { text: `${d > 0 ? '▲' : '▼'} ${Math.abs(d)} vs ${against}`, dir: d > 0 ? 'up' : 'down', good: upIsGood === null ? null : d > 0 === upIsGood }
}

/** The grade's words on First response (invented copy) — the report's own grade (lib/leads/tat.ts `tatGrade`: within 8 hours · a day · more). */
export const GRADE_WORDS = { good: 'Fast', warn: 'OK', bad: 'Slow' } as const

/** A sum as the strip writes it: "S$ 121.1K", the house compact money (lib/format.ts `moneyCompact`), a loss with the house minus. */
export function moneyShort(minor: number, compact: (m: number) => string): string {
  return minor < 0 ? `−${compact(-minor)}` : compact(minor)
}
/** A report tile's sum back as minor units — the report's own figure ("S$12,345.67" · "−S$40.00"), so the strip prints exactly what the
    report computed and never counts it again. */
export function minorOf(money2: string): number {
  const neg = /^[−-]/.test(money2.trim())
  const n = Number(money2.replace(/[^0-9.]/g, ''))
  return Number.isFinite(n) ? (neg ? -1 : 1) * Math.round(n * 100) : 0
}
