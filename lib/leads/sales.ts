/*
 * (pending modules S45A — H-UHD-1; 1.0's six sales reports, urbanhomedemo 479480a5e · 4da810229 `src/lib/leads/sales-reports.ts`, Urban Home
 * Design's B-requirements; his "build everything and complete it" 2026-10-17 — built as a feature every studio gets) **Sales** — the second
 * report of Company › Reports › Leads, beside Response time (lib/leads/tat.ts): who brings leads in and wins them, where leads stop, which
 * sources pay, how leads and wins move month to month, what is still in play and what is going quiet. Pure and client-safe: the server hands the
 * facts (lib/leads/sales-queries.ts), the page and the Dashboard's Sales tile work the figures out per range with these functions — one set of
 * numbers.
 *
 * 1.0's locked definitions, in 2.0's records:
 *   · CONVERSION — the lead reached Won (1.0: `signed_at`; 2.0's money moment is Won, the Won step that records the signed quote).
 *   · WON VALUE — what the lead was won for, before GST: its project's signed quote as signed, else the value agreed (lib/projects/money-queries.ts
 *     `signedNetBy`, the Projects listing's Value before GST); variation orders are changes to a contract, never the sale. Where a won lead has
 *     neither, the client's stated budget stands in and is counted apart, so the figure can be discounted honestly (1.0's fallback).
 *   · Every report reads one population: the leads ADDED in the range (the caption says so), as 1.0's did; a lead shared by two members counts
 *     for each of them, so member rows can add up to more than the studio's.
 * 2.0's words: Won (1.0's Signed), Quote sent, Met (a step 1.0's funnel had no word for), Going quiet (1.0's Aging & stalled — by the listing's
 * own Last contact rule, `lastContactOf`). No sample data: 1.0 swapped in a generated population when a studio's leads were thin; 2.0 shows the
 * studio's own records, however few, and says what each figure counts.
 * *(invented copy: every title, help line, caption and column head below — 1.0's words where 2.0 has the thing)*
 */
import { calendarDaysBetween, dayWords, durationWords } from '@/lib/format'
import { money2 } from '@/lib/quotes/math'
import type { ChartSpec } from '@/lib/market-insights/markdown'
import { countedMs, median, rangeLabel, type LeadFacts, type Range } from './tat'

const DAY = 86_400_000
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

/** (S45A) Company › Reports › Leads' two reports, as their chips read — Response time (REG-611) first, the tab's landing; `?report=sales` opens Sales. */
export type LeadReportKey = 'response' | 'sales'
export const LEAD_REPORTS: { key: LeadReportKey; label: string }[] = [{ key: 'response', label: 'Response time' }, { key: 'sales', label: 'Sales' }]
export const readLeadReport = (v: string | null | undefined): LeadReportKey => (v === 'sales' ? 'sales' : 'response')

/** The journey a lead walks (lib/leads/enums.ts STAGES' order up to Won) — `reached` is an index into it. */
export const JOURNEY = ['New', 'Contacted', 'Met', 'Quote Sent', 'Won'] as const
export const WON = 4
/** What a figure in money stands on: the signed quote, the agreed value, a live quote, or the client's stated budget. */
export type ValueFrom = 'quote' | 'agreed' | 'budget'
export type SalesMoney = { minor: number; from: ValueFrom }

/** One lead's facts — the Response time report's (`LeadFacts`) and what Sales reads beside them. */
export type SalesFacts = LeadFacts & {
  /** Settings › Lead sources' name, as the lead holds it ('' when none) */
  source: string
  /** The furthest step of the journey reached (0 New · 1 Contacted · 2 Met · 3 Quote sent · 4 Won): its moves, its stage, a contact logged,
      a quote sent to the client — so a later step always implies the earlier ones (1.0's monotonic funnel) */
  reached: number
  /** It was put On Hold at some point (the pipeline's On hold row reads its history) */
  everOnHold: boolean
  /** Won: what it was won for, before GST */
  won: SalesMoney | null
  /** Still open: its value before GST — its live quote, else the client's budget; null when it has neither */
  open: SalesMoney | null
  /** The listing's Last contact (`lastContactOf`), null when nobody has contacted them */
  lastContactAt: number | null
}
export type SalesMember = { id: string; name: string; role: string; color: string }
export type SalesData = { facts: SalesFacts[]; team: SalesMember[]; now: number }

/* ── the report's shape: tiles and tables the page, its ghost and the export read ───────────────────────────────────────────── */

export type SalesTile = { key: 'leads' | 'quoted' | 'won' | 'value'; label: string; value: string; help: string }
export type MemberSales = { id: string; name: string; role: string; color: string; leads: number; quoted: number; won: number; conversion: number | null; valueMinor: number; averageMinor: number | null; daysToWon: number | null }
export type FunnelStep = { id: string; key: string; label: string; leads: number; ofAll: number | null; ofPrevious: number | null; dropped: number; biggest: boolean }
export type SourceSales = { id: string; source: string; leads: number; won: number; conversion: number | null; valueMinor: number; averageMinor: number | null }
export type FlowRow = { id: string; label: string; short: string; start: number; added: number; wonFromThem: number; conversion: number | null; wonInPeriod: number; valueMinor: number }
export type PipelineRow = { id: string; stage: string; leads: number; valueMinor: number; onQuote: number; onBudget: number; noValue: number; closed: number; wonClosed: number; rate: number | null; likelyMinor: number | null; total?: boolean }
export type QuietBand = { id: string; label: string; leads: number; valueMinor: number }
export type QuietMember = { id: string; name: string; role: string; color: string; open: number; quiet: number; longest: number | null; longestLead: string | null }
export type QuietLead = { id: string; name: string; stage: string; days: number; contacted: boolean; members: string[] }
export type Granularity = 'week' | 'month'

export type SalesReport = {
  range: Range
  inRange: number
  tiles: SalesTile[]
  members: MemberSales[]
  funnel: FunnelStep[]
  /** The step with the biggest drop before it — named in the funnel's help */
  leak: FunnelStep | null
  sources: SourceSales[]
  flow: FlowRow[]
  granularity: Granularity
  chart: ChartSpec | null
  pipeline: PipelineRow[]
  pipelineTotal: PipelineRow | null
  quietBands: QuietBand[]
  quietMembers: QuietMember[]
  quietest: QuietLead[]
  open: number
  quiet: number
  neverContacted: number
  /** won leads whose value is the client's budget (no signed quote, no agreed value) */
  budgetWon: number
}

/** A rate, one decimal — "6.9%"; null when there is nothing to divide by. */
export const pct = (n: number, d: number): number | null => (d > 0 ? Math.round((n / d) * 1000) / 10 : null)
export const pctWords = (v: number | null) => (v === null ? '--' : `${Number.isInteger(v) ? v : v.toFixed(1)}%`)
export const isClosed = (f: Pick<SalesFacts, 'stage'>) => f.stage === 'Won' || f.stage === 'Lost'
export const isWon = (f: Pick<SalesFacts, 'reached'>) => f.reached >= WON
const isOpen = (f: Pick<SalesFacts, 'stage'>) => !isClosed(f)
/** Given a member at some point — its members now, its first assignment, or a step only a lead with a member can take (REG-334) */
const assigned = (f: SalesFacts) => f.reached >= 1 || f.assignedAt !== null || f.assigneeIds.length > 0
const quoted = (f: SalesFacts) => f.reached >= 3
/** The leads ADDED in the range — Response time's window (`insightsReport`), so both reports read one population. */
export const inRangeOf = <T extends { createdAt: number }>(all: T[], now: number, days: Range): T[] => (days === null ? all : all.filter((f) => f.createdAt >= now - days * DAY))

/** The funnel's steps — each counts the leads that reached at least that far. */
export const FUNNEL = [
  { key: 'added', label: 'Added', test: () => true },
  { key: 'assigned', label: 'Assigned', test: assigned },
  { key: 'contacted', label: 'Contacted', test: (f: SalesFacts) => f.reached >= 1 },
  { key: 'met', label: 'Met', test: (f: SalesFacts) => f.reached >= 2 },
  { key: 'quoted', label: 'Quote sent', test: quoted },
  { key: 'won', label: 'Won', test: isWon },
] as const
/** The pipeline's rows: the open stages in the journey's order, then On hold. */
export const PIPELINE_STAGES = ['New', 'Contacted', 'Met', 'Quote Sent', 'On Hold'] as const
export const PIPELINE_LABEL: Record<(typeof PIPELINE_STAGES)[number], string> = { New: 'New', Contacted: 'Contacted', Met: 'Met', 'Quote Sent': 'Quote sent', 'On Hold': 'On hold' }
/** Going quiet's bands — days since the last contact (1.0's Aging bands, on the calendar). */
export const QUIET_BANDS = [
  { id: '0-7', label: 'Up to 7 days', lo: 0, hi: 7 },
  { id: '8-30', label: '8 to 30 days', lo: 8, hi: 30 },
  { id: '31-90', label: '31 to 90 days', lo: 31, hi: 90 },
  { id: '90+', label: 'Over 90 days', lo: 91, hi: Infinity },
] as const
/** A stage's chance of winning is read from at least this many of the studio's closed leads that were once at it — fewer tell nothing (1.0
    weighted by fixed platform guesses; 2.0 reads the studio's own record, and says when it is too thin to). */
export const MIN_CLOSED = 5
/** Past this many days with no contact a lead is going quiet (1.0's "stale"). */
export const QUIET_DAYS = 30

/** Days since a lead was last contacted — or, never contacted, since it was added (the listing's Last contact rule). */
export const quietDays = (f: Pick<SalesFacts, 'lastContactAt' | 'createdAt'>, now: number) => Math.max(0, calendarDaysBetween(f.lastContactAt ?? f.createdAt, now))

/** Flow's default by range: weeks for a month's range, months for anything longer. */
export const defaultGranularity = (days: Range): Granularity => (days === 30 ? 'week' : 'month')

/** The start of the week (Monday, local) or month a moment falls in. */
function periodStart(t: number, g: Granularity): number {
  const d = new Date(t); d.setHours(0, 0, 0, 0)
  if (g === 'month') d.setDate(1)
  else d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d.getTime()
}
const nextPeriod = (t: number, g: Granularity) => { const d = new Date(t); if (g === 'month') d.setMonth(d.getMonth() + 1); else d.setDate(d.getDate() + 7); return d.getTime() }
const periodLabel = (t: number, g: Granularity) => { const d = new Date(t); return g === 'month' ? `${MONTHS[d.getMonth()]} ’${String(d.getFullYear()).slice(2)}` : `${d.getDate()} ${MONTHS[d.getMonth()]} ’${String(d.getFullYear()).slice(2)}` }
const periodShort = (t: number, g: Granularity) => { const d = new Date(t); return g === 'month' ? `${MONTHS[d.getMonth()]} ’${String(d.getFullYear()).slice(2)}` : `${d.getDate()} ${MONTHS[d.getMonth()]}` }

/** The Sales report for one range (and the flow's granularity). */
export function salesReport(data: SalesData, days: Range, granularity: Granularity = defaultGranularity(days)): SalesReport {
  const { now } = data
  const cur = inRangeOf(data.facts, now, days)
  const won = cur.filter(isWon)
  const valued = won.filter((f) => f.won)
  const valueMinor = valued.reduce((s, f) => s + f.won!.minor, 0)
  const budgetWon = won.filter((f) => f.won?.from === 'budget').length
  const daysToWon = won.map((f) => (f.wonAt === null ? null : countedMs(f.createdAt, f.wonAt))).filter((x): x is number => x !== null)
  const q = cur.filter(quoted).length
  const lost = cur.filter((f) => f.stage === 'Lost').length
  const openN = cur.filter(isOpen).length
  const conv = pct(won.length, cur.length)

  const tiles: SalesTile[] = [
    { key: 'leads', label: 'Leads', value: String(cur.length), help: cur.length ? `${openN} open · ${won.length} won · ${lost} lost` : 'None added in this range' },
    { key: 'quoted', label: 'Quote sent', value: String(q), help: cur.length ? `${pctWords(pct(q, cur.length))} of leads` : 'No leads to quote' },
    { key: 'won', label: 'Won', value: String(won.length), help: won.length ? `${pctWords(conv)} of leads · median ${durationWords(median(daysToWon))} to Won` : 'None won yet' },
    { key: 'value', label: 'Won value', value: money2(valueMinor), help: `Before GST${valued.length ? ` · ${money2(Math.round(valueMinor / valued.length))} a lead won` : ''}${budgetWon ? ` · ${budgetWon} at the client’s budget` : ''}` },
  ]

  /* By team member — every member on a lead counts it (1.0's rule); the studio's figures are the tiles, never a sum of these rows */
  const members: MemberSales[] = data.team.map((m) => {
    const mine = cur.filter((f) => f.assigneeIds.includes(m.id))
    const w = mine.filter(isWon), v = w.filter((f) => f.won)
    const sum = v.reduce((s, f) => s + f.won!.minor, 0)
    const d = w.map((f) => (f.wonAt === null ? null : countedMs(f.createdAt, f.wonAt))).filter((x): x is number => x !== null)
    return { id: m.id, name: m.name, role: m.role, color: m.color, leads: mine.length, quoted: mine.filter(quoted).length, won: w.length, conversion: pct(w.length, mine.length), valueMinor: sum, averageMinor: v.length ? Math.round(sum / v.length) : null, daysToWon: median(d) }
  }).filter((r) => r.leads > 0).sort((a, b) => b.valueMinor - a.valueMinor || b.won - a.won || b.leads - a.leads || a.name.localeCompare(b.name))

  /* the funnel — monotonic by construction (a later step implies the earlier ones), the biggest drop named */
  let prev: number | null = null
  const funnel: FunnelStep[] = FUNNEL.map((s) => {
    const leads = cur.filter((f) => s.test(f)).length
    const step: FunnelStep = { id: s.key, key: s.key, label: s.label, leads, ofAll: pct(leads, cur.length), ofPrevious: prev === null ? null : pct(leads, prev), dropped: prev === null ? 0 : Math.max(0, prev - leads), biggest: false }
    prev = leads
    return step
  })
  const leak = cur.length ? funnel.slice(1).reduce<FunnelStep | null>((best, s) => (s.dropped > 0 && (!best || s.dropped > best.dropped) ? s : best), null) : null
  if (leak) leak.biggest = true

  /* by source — Settings › Lead sources' names, as the leads hold them (2.0 keeps one list, so nothing is normalised) */
  const bySource = new Map<string, SalesFacts[]>()
  for (const f of cur) { const k = f.source.trim() || 'No source'; bySource.set(k, [...(bySource.get(k) ?? []), f]) }
  const sources: SourceSales[] = [...bySource.entries()].map(([source, list]) => {
    const w = list.filter(isWon), v = w.filter((f) => f.won)
    const sum = v.reduce((s, f) => s + f.won!.minor, 0)
    return { id: source, source, leads: list.length, won: w.length, conversion: pct(w.length, list.length), valueMinor: sum, averageMinor: v.length ? Math.round(sum / v.length) : null }
  }).sort((a, b) => b.valueMinor - a.valueMinor || b.won - a.won || b.leads - a.leads || a.source.localeCompare(b.source))

  /* lead flow — each period's leads added and how many of THEM were won (the cohort), and the wins that fell in it with their value */
  const flow: FlowRow[] = []
  if (cur.length) {
    const from = days === null ? Math.min(...cur.map((f) => f.createdAt)) : now - days * DAY
    for (let t = periodStart(from, granularity); t <= now; t = nextPeriod(t, granularity)) {
      const hi = nextPeriod(t, granularity)
      const added = cur.filter((f) => f.createdAt >= t && f.createdAt < hi)
      const wonHere = cur.filter((f) => isWon(f) && f.wonAt !== null && f.wonAt >= t && f.wonAt < hi)
      const cohort = added.filter(isWon).length
      flow.push({ id: String(t), label: periodLabel(t, granularity), short: periodShort(t, granularity), start: t, added: added.length, wonFromThem: cohort, conversion: pct(cohort, added.length), wonInPeriod: wonHere.length, valueMinor: wonHere.reduce((s, f) => s + (f.won?.minor ?? 0), 0) })
    }
  }
  const chart: ChartSpec | null = flow.length > 1 ? {
    kind: 'line', title: 'Leads added and won', subtitle: `${granularity === 'week' ? 'Each week, from Monday' : 'Each month'} — the leads added then, and how many of them were won`,
    source: null, sourceUrl: null, prefix: '', suffix: '', labels: flow.map((r) => r.short),
    series: [{ key: 'added', label: 'Leads added', values: flow.map((r) => r.added) }, { key: 'won', label: 'Won from them', values: flow.map((r) => r.wonFromThem) }],
  } : null

  /* the open pipeline — by stage, valued before GST, weighted by how often the studio's own closed leads were won from that stage */
  const open = cur.filter(isOpen)
  const closed = cur.filter(isClosed)
  const wasAt = (f: SalesFacts, stage: string) => (stage === 'On Hold' ? f.everOnHold : f.reached >= JOURNEY.indexOf(stage as (typeof JOURNEY)[number]))
  const pipeline: PipelineRow[] = PIPELINE_STAGES.map((stage) => {
    const here = open.filter((f) => f.stage === stage)
    const base = closed.filter((f) => wasAt(f, stage))
    const wonClosed = base.filter(isWon).length
    const rate = base.length >= MIN_CLOSED ? wonClosed / base.length : null   // too few closed leads tell nothing — never a 100% from two
    const value = here.reduce((s, f) => s + (f.open?.minor ?? 0), 0)
    return { id: stage, stage: PIPELINE_LABEL[stage], leads: here.length, valueMinor: value, onQuote: here.filter((f) => f.open?.from === 'quote').length, onBudget: here.filter((f) => f.open?.from === 'budget').length,
      noValue: here.filter((f) => !f.open).length, closed: base.length, wonClosed, rate, likelyMinor: rate === null ? null : Math.round(value * rate) }
  }).filter((r) => r.leads > 0)
  const pipelineTotal: PipelineRow | null = pipeline.length ? {
    id: 'total', stage: 'All open leads', leads: open.length, valueMinor: pipeline.reduce((s, r) => s + r.valueMinor, 0), onQuote: pipeline.reduce((s, r) => s + r.onQuote, 0), onBudget: pipeline.reduce((s, r) => s + r.onBudget, 0),
    noValue: pipeline.reduce((s, r) => s + r.noValue, 0), closed: closed.length, wonClosed: closed.filter(isWon).length, rate: null,
    likelyMinor: pipeline.some((r) => r.likelyMinor !== null) ? pipeline.reduce((s, r) => s + (r.likelyMinor ?? 0), 0) : null, total: true,
  } : null

  /* going quiet — the open leads still being worked (On hold waits for its follow-up day), by days since the last contact */
  const working = open.filter((f) => f.stage !== 'On Hold')
  const aged = working.map((f) => ({ f, days: quietDays(f, now) }))
  const quietBands: QuietBand[] = working.length ? QUIET_BANDS.map((b) => {
    const list = aged.filter((a) => a.days >= b.lo && a.days <= b.hi)
    return { id: b.id, label: b.label, leads: list.length, valueMinor: list.reduce((s, a) => s + (a.f.open?.minor ?? 0), 0) }
  }) : []
  const quietMembers: QuietMember[] = data.team.map((m) => {
    const mine = aged.filter((a) => a.f.assigneeIds.includes(m.id))
    const oldest = mine.reduce<(typeof mine)[number] | null>((o, a) => (!o || a.days > o.days ? a : o), null)
    return { id: m.id, name: m.name, role: m.role, color: m.color, open: mine.length, quiet: mine.filter((a) => a.days > QUIET_DAYS).length, longest: oldest?.days ?? null, longestLead: oldest?.f.name ?? null }
  }).filter((r) => r.open > 0).sort((a, b) => b.quiet - a.quiet || (b.longest ?? 0) - (a.longest ?? 0) || a.name.localeCompare(b.name))
  const names = new Map(data.team.map((m) => [m.id, m.name]))
  const quietest: QuietLead[] = [...aged].sort((a, b) => b.days - a.days || a.f.name.localeCompare(b.f.name))
    .map((a) => ({ id: a.f.id, name: a.f.name, stage: a.f.stage, days: a.days, contacted: a.f.lastContactAt !== null, members: a.f.assigneeIds.map((id) => names.get(id)).filter((x): x is string => !!x) }))

  return {
    range: days, inRange: cur.length, tiles, members, funnel: cur.length ? funnel : [], leak, sources, flow, granularity, chart, pipeline, pipelineTotal,
    quietBands, quietMembers, quietest, open: working.length, quiet: aged.filter((a) => a.days > QUIET_DAYS).length,
    neverContacted: working.filter((f) => f.lastContactAt === null && f.assigneeIds.length > 0).length, budgetWon,
  }
}

/* ── the page's words, one place for the page and its ghost ─────────────────────────────────────────────────────────────────── */

export const SALES_TITLE = 'Sales'
export const SALES_HELP = 'Who brings leads in and wins them, where leads stop, which sources pay, and what is still in play.'
export const SECTIONS = {
  members: { title: 'By team member', help: 'Every member on a lead counts it, so these rows can add up to more than the studio’s.' },
  funnel: { title: 'Where leads stop', help: 'Each step counts the leads that reached at least that far.' },
  sources: { title: 'By source', help: 'Your lead sources, as Settings › Lead sources names them.' },
  pipeline: { title: 'Open pipeline', help: 'Leads not yet won or lost, valued before GST.' },
  flow: { title: 'Over time', help: 'Leads added in each period, how many of them were won, and the wins that fell in it.' },
  quiet: { title: 'Going quiet', help: 'Open leads by days since the last contact — On hold leads wait for their follow-up day.' },
  quietMembers: { title: 'Going quiet, by team member', help: 'Each member’s open leads, and the one longest without a contact.' },
} as const
export const MEMBERS_EMPTY = 'No leads in this range.'
export const FUNNEL_EMPTY = 'No leads in this range.'
export const SOURCES_EMPTY = 'No leads in this range.'
export const PIPELINE_EMPTY = 'No open leads in this range.'
export const FLOW_EMPTY = 'No leads in this range.'
export const QUIET_EMPTY = 'No open leads being worked in this range.'
export const SALES_FOOT = 'Conversion counts the leads that reached Won. Won value is the signed quote as signed, or the value agreed, before GST — variation orders are changes to a contract, never the sale; where a won lead has neither, the client’s budget stands in and the Won value tile says how many. Chance of winning is how often the studio’s own closed leads were won from that stage, once at least five closed leads were there.'

/** The funnel's note under its help: where most leads stop ("The biggest drop is between Contacted and Met: 14 of 23 leads haven’t reached Met"). */
export const funnelNote = (r: Pick<SalesReport, 'leak' | 'funnel'>): string | null => {
  const before = r.leak ? r.funnel[r.funnel.indexOf(r.leak) - 1] : undefined
  return r.leak && before ? `The biggest drop is between ${before.label} and ${r.leak.label}: ${r.leak.dropped} of ${before.leads} leads haven’t reached ${r.leak.label}.` : null
}
/** The pipeline's note: what is likely to be won, or why it can't be told yet. */
export const pipelineNote = (r: Pick<SalesReport, 'pipelineTotal'>): string | null =>
  !r.pipelineTotal ? null : r.pipelineTotal.likelyMinor != null
    ? `About ${money2(r.pipelineTotal.likelyMinor)} of it is likely to be won, by the studio’s own record — a stage with fewer than ${MIN_CLOSED} closed leads isn’t counted.`
    : `No stage has ${MIN_CLOSED} closed leads yet to tell what is likely to be won.`
/** Going quiet's note: the counts that need a call. */
export const quietNote = (r: Pick<SalesReport, 'open' | 'quiet' | 'neverContacted'>): string | null =>
  r.open ? `${plural(r.quiet, 'lead')} with no contact for over ${QUIET_DAYS} days · ${r.neverContacted} given a member and never contacted.` : null
/** A pipeline row's second line: what its value stands on. */
export const valuedWords = (r: Pick<PipelineRow, 'onQuote' | 'onBudget' | 'noValue'>) =>
  [r.onQuote ? `${r.onQuote} on a quote` : null, r.onBudget ? `${r.onBudget} on the client’s budget` : null, r.noValue ? `${r.noValue} with no value` : null].filter(Boolean).join(' · ')
/** A pipeline row's chance of winning: "67% · 2 of 3 closed", "--" with no closed lead to read it from. */
export const chanceWords = (r: Pick<PipelineRow, 'rate' | 'wonClosed' | 'closed'>) =>
  r.rate !== null ? `${pctWords(Math.round(r.rate * 1000) / 10)} · ${r.wonClosed} of ${r.closed} closed` : r.closed ? `Too few to tell · ${r.wonClosed} of ${r.closed} closed` : 'No closed lead yet'

/** The flow's granularity chips' words. */
export const GRANULARITY: { value: Granularity; label: string }[] = [{ value: 'week', label: 'By week' }, { value: 'month', label: 'By month' }]

/** (REG-708 · REG-817) What the ghost draws next time: whether the report held leads on the range it opens on. */
export const SALES_SHAPE = { rows: 'om.shape.sales.rows', open: 'om.shape.sales.open', chart: 'om.shape.sales.chart', leak: 'om.shape.sales.leak', quietMembers: 'om.shape.sales.quietMembers' } as const
/** …and how many rows each table drew (a ghost's table is as long as its page's) */
export const SALES_COUNTS = { members: 'om.count.sales.members', sources: 'om.count.sales.sources', pipeline: 'om.count.sales.pipeline', flow: 'om.count.sales.flow', quietMembers: 'om.count.sales.quietMembers' } as const

/* ── the house Export: the page's numbers as one sheet, the screen's own words and figures ─────────────────────────────────── */
const m2 = (v: number | null) => (v === null ? '--' : money2(v))
export function salesSheet(r: SalesReport): { head: string[]; body: string[][] } {
  const body: string[][] = [[SALES_TITLE]]
  for (const t of r.tiles) body.push([t.label, t.value, t.help])
  body.push([], [SECTIONS.members.title], ['Member', 'Role', 'Leads', 'Quote sent', 'Won', 'Conversion', 'Won value', 'Average won', 'Days to Won'])
  for (const m of r.members) body.push([m.name, m.role, String(m.leads), String(m.quoted), String(m.won), pctWords(m.conversion), money2(m.valueMinor), m2(m.averageMinor), durationWords(m.daysToWon)])
  body.push([], [SECTIONS.funnel.title], ['Step', 'Leads', 'Of all leads', 'From the step before', 'Stopped before it'])
  for (const s of r.funnel) body.push([s.label, String(s.leads), pctWords(s.ofAll), pctWords(s.ofPrevious), s.dropped ? String(s.dropped) : '--'])
  body.push([], [SECTIONS.sources.title], ['Source', 'Leads', 'Won', 'Conversion', 'Won value', 'Average won'])
  for (const s of r.sources) body.push([s.source, String(s.leads), String(s.won), pctWords(s.conversion), money2(s.valueMinor), m2(s.averageMinor)])
  body.push([], [SECTIONS.pipeline.title], ['Stage', 'Open leads', 'Value', 'Chance of winning', 'Likely value'])
  for (const p of [...r.pipeline, ...(r.pipelineTotal ? [r.pipelineTotal] : [])]) body.push([p.stage, String(p.leads), money2(p.valueMinor), chanceWords(p), m2(p.likelyMinor)])
  body.push([], [SECTIONS.flow.title], ['Period', 'Leads added', 'Won from them', 'Conversion', 'Won in the period', 'Won value'])
  for (const f of r.flow) body.push([f.label, String(f.added), String(f.wonFromThem), pctWords(f.conversion), String(f.wonInPeriod), money2(f.valueMinor)])
  body.push([], [SECTIONS.quiet.title], ['Since the last contact', 'Open leads', 'Value'])
  for (const b of r.quietBands) body.push([b.label, String(b.leads), money2(b.valueMinor)])
  body.push([], ['Member', 'Open leads', `Quiet over ${QUIET_DAYS} days`, 'Longest quiet'])
  for (const m of r.quietMembers) body.push([m.name, String(m.open), String(m.quiet), m.longest === null ? '--' : `${dayWords(m.longest)}${m.longestLead ? ` · ${m.longestLead}` : ''}`])
  return { head: [`Sales · ${rangeLabel(r.range)} · ${plural(r.inRange, 'lead')} in range`], body }
}

/** (S45A — H-UHD-3, 1.0's Sales Reports widget) The Dashboard's Sales tile: the report's own Won value and Won count on its range. */
export function salesTile(r: SalesReport): { value: string; help: string } {
  const won = r.tiles.find((t) => t.key === 'won')!, value = r.tiles.find((t) => t.key === 'value')!
  return { value: value.value, help: r.inRange ? `${won.value} of ${plural(r.inRange, 'lead')} won · ${rangeLabel(r.range).toLowerCase()}, before GST` : `No leads added · ${rangeLabel(r.range).toLowerCase()}` }
}
