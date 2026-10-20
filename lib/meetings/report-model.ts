/**
 * (pending modules S23 — card studio:meetings-copilot, "for Owners and Admins Analytics with coaching and an Objections report"; his "build all of
 * them" 2026-10-11) Company › Reports › **Meetings** — 1.0's Meeting Insights › Analytics (its KPIs, ID Performance, coaching suggestions, deal
 * score calibration) and its Objections report, in one Reports tab, on the house Reports pattern (lib/leads/tat.ts, lib/projects/insights-model.ts):
 * the loader hands over each held meeting's facts once (lib/meetings/reports.ts) and every figure derives per range in the browser. Pure and
 * client-safe.
 *
 * What 1.0 got wrong, and 2.0 does instead: its weekly cron never saved a snapshot (a column-name bug), so Analytics was empty for every studio
 * and Admins were shut out of it; its "converted" was never filled, so every rate read "—". Here nothing is stored — every number is read from
 * the records as the page opens — and a meeting's **outcome is derived, never set by hand**:
 *   - **Went ahead** — its lead is Won, or has a project, or moved to Won in its stage log after the meeting;
 *   - **Not going ahead** — its lead is Lost;
 *   - **Open** — anything else (the lead is still in the pipeline or on hold).
 *
 * The figures (every % is rounded to a whole number; a share with nothing under it is the house "--"):
 *   - Meetings held — held meetings whose day (`started_at`, else `starts_at`) falls in the range, and (S42 audit C-02) every Met log no
 *     meeting holds, on its day — the lists' own rows (lib/meetings/queries.ts `meetingRows`).
 *   - Went ahead — those whose outcome is Went ahead ÷ meetings held.
 *   - Average deal score — the mean of the brief's score over the meetings held that carry one (with the co-pilot on, or written up after —
 *     the same rule over the same words; the meetings list shows the same score).
 *   - Average length — the mean of `ended_at − started_at` over the meetings held with the co-pilot on.
 *   - Tips acted on — tips pressed ÷ tips shown, summed over the meetings held (`state.acted` ÷ `state.seen ∪ state.acted`) — 1.0's "card act rate".
 *   - By team member — a meeting is its starter's (`started_by`, else `created_by`, else its first member): meetings · went ahead · average
 *     score · checklist covered (the mean of done ÷ total over the meetings with a checklist) · tips acted on; sorted by meetings.
 *   - Coaching — 1.0's rule kept: a member with 2 or more meetings whose went-ahead share is under 0.8 × the studio's → "Confirm the next step
 *     before you end the meeting" ("Yours: n% · studio: m% · best: k%", best = the highest share among members with 2 or more meetings). New by
 *     rule: the must-ask item a member most often leaves out (`brief.checklist.missed`), left out at least twice → "Ask about {item}".
 *   - Deal score check — 1.0's calibration: the meetings held that carry a score, each tier expected to turn out its way
 *     (Hot ≥ 80 → went ahead · Warm ≥ 60 → still open, the follow-up · Cool / Cold → not going ahead); the share that did, overall and per tier,
 *     shown from 3 such meetings. Under 60% it names 1.0's weight hints (a tier under 50% → Hot: Budget · Warm: Trust · Cool: Timeline ·
 *     Cold: Who decides).
 *   - Objections — `copilot_objection_log` rows of the meetings held in the range: total, the most common kind, how many of them went ahead.
 */
import { mean, RANGES, DEFAULT_RANGE, rangeLabel, type Range } from '@/lib/leads/tat'
import { BLANK } from '@/lib/leads/row-text'
import { displayDate, durationWords } from '@/lib/format'
import { DIMENSIONS, tierOf, type DimKey, type Tier } from './model'
import { OBJECTION_KINDS, kindLabel } from './objections'

export { RANGES, DEFAULT_RANGE, rangeLabel }
export type MeetingsRange = Range
const DAY = 86_400_000

/* ── the outcome — derived from the lead's records, never a field someone sets ── */
export type Outcome = 'ahead' | 'lost' | 'open'
/** (pending modules S23) (invented copy) the outcome's words — the tile's, the filter's, the table's */
export const OUTCOME_LABEL: Record<Outcome, string> = { ahead: 'Went ahead', lost: 'Not going ahead', open: 'Open' }
export const OUTCOMES: readonly Outcome[] = ['ahead', 'lost', 'open']
/** The outcome of a meeting held at `at` on a lead: Won now, a project, or a Won move after the meeting → went ahead; Lost now → not going ahead. */
export function outcomeOf(lead: { stage: string; hasProject: boolean; wonAt: readonly number[] }, at: number): Outcome {
  if (lead.stage === 'Won' || lead.hasProject || lead.wonAt.some((t) => t >= at)) return 'ahead'
  if (lead.stage === 'Lost') return 'lost'
  return 'open'
}

/* ── the facts the loader hands over ── */
export type MeetingFact = {
  id: string; leadId: string; leadName: string
  /** when it was held — the co-pilot's start, else the planned start (ms) */
  at: number
  /** whose meeting it is: who started it, else who made it, else its first member */
  memberId: string | null
  /** held with the co-pilot on (`source = live`) */
  live: boolean
  /** ended − started, for a meeting held with the co-pilot on */
  lengthMs: number | null
  /** the brief's deal score, for a meeting held that carries one (live or written up) */
  score: number | null
  /** the brief's must-ask checklist: ticked of all, null when the brief has none */
  checklist: { done: number; total: number } | null
  /** the must-ask items left out, as something to find out ("the budget range") */
  missed: string[]
  /** tips shown, and of them pressed */
  tipsSeen: number; tipsActed: number
  outcome: Outcome
}
export type ObjectionFact = {
  id: string; meetingId: string; leadId: string; leadName: string; at: number; memberId: string | null
  kind: string; said: string; competitor: string | null; answer: string | null; outcome: Outcome
}
export type ReportPerson = { id: string; name: string; role: string; color: string }

/* ── the report ── */
const share = (n: number, of: number): number | null => (of > 0 ? n / of : null)
/** A share as a whole percentage, or the house "--". */
export const pctText = (x: number | null): string => (x === null ? BLANK : `${Math.round(x * 100)}%`)
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

export type MemberMeetings = ReportPerson & {
  meetings: number; ahead: number; aheadShare: number | null
  score: number | null; scored: number
  checklist: number | null
  tipsActed: number; tipsSeen: number; tipsShare: number | null
}
export type CoachRow = { key: string; memberId: string; name: string; color: string; kind: 'next-step' | 'ask'; text: string; evidence: string }
export type TierCheck = { tier: Tier; meetings: number; matched: number; share: number }
export type ScoreCheck = { meetings: number; matched: number; share: number; good: boolean; tiers: TierCheck[]; weights: { key: DimKey; label: string }[] }
export type MeetingsReport = {
  range: MeetingsRange
  held: number; live: number
  ahead: number; lost: number; open: number; aheadShare: number | null
  score: number | null; scored: number
  lengthMs: number | null; timed: number
  tipsActed: number; tipsSeen: number; tipsShare: number | null
  members: MemberMeetings[]
  coaching: CoachRow[]
  /** null below 3 scored meetings; `scoredForCheck` says how many there are */
  check: ScoreCheck | null; scoredForCheck: number
  objections: { rows: ObjectionFact[]; total: number; top: { kind: string; label: string; count: number } | null; ahead: number; aheadShare: number | null; kinds: { kind: string; label: string; count: number }[] }
}

/** 1.0's calibration: what each tier is expected to turn into. */
export const TIER_EXPECTS: Record<Tier, Outcome> = { Hot: 'ahead', Warm: 'open', Cool: 'lost', Cold: 'lost' }
/** (pending modules S23) (invented copy) each tier's band and what it expects, in plain words */
export const TIER_WORDS: Record<Tier, { band: string; expects: string }> = {
  Hot: { band: '80 and over', expects: 'expected to go ahead' },
  Warm: { band: '60 to 79', expects: 'expected to need a follow-up' },
  Cool: { band: '40 to 59', expects: 'expected not to go ahead' },
  Cold: { band: 'under 40', expects: 'expected not to go ahead' },
}
/** 1.0's weight hint for a tier its scores miss (analytics-aggregator.ts `adjustmentMap`). */
const TIER_HINT: Record<Tier, DimKey> = { Hot: 'budget', Warm: 'trust', Cool: 'timeline', Cold: 'decision' }
const TIERS: readonly Tier[] = ['Hot', 'Warm', 'Cool', 'Cold']
/** Below this many scored meetings the check says it needs more (1.0 showed a gauge for any number, one meeting included). */
export const CHECK_MIN = 3
/** The share at which scores "match" (1.0's 0.6). */
export const CHECK_GOOD = 0.6

export const inRange = (at: number, now: number, range: MeetingsRange) => range === null || at >= now - range * DAY

export function meetingsReport(facts: readonly MeetingFact[], objections: readonly ObjectionFact[], team: readonly ReportPerson[], now: number, range: MeetingsRange): MeetingsReport {
  const cur = facts.filter((f) => inRange(f.at, now, range))
  const held = cur.length
  const ahead = cur.filter((f) => f.outcome === 'ahead').length
  const lost = cur.filter((f) => f.outcome === 'lost').length
  const scoredRows = cur.filter((f) => f.score !== null)
  const timedRows = cur.filter((f) => f.live && f.lengthMs !== null)
  const tipsSeen = cur.reduce((n, f) => n + f.tipsSeen, 0), tipsActed = cur.reduce((n, f) => n + f.tipsActed, 0)
  const studioShare = share(ahead, held)

  /* By team member */
  const byId = new Map(team.map((p) => [p.id, p]))
  const ids = [...new Set(cur.map((f) => f.memberId).filter((id): id is string => !!id && byId.has(id)))]
  const members: MemberMeetings[] = ids.map((id) => {
    const p = byId.get(id)!
    const mine = cur.filter((f) => f.memberId === id)
    const scored = mine.filter((f) => f.score !== null)
    const lists = mine.filter((f) => f.checklist && f.checklist.total > 0)
    const seen = mine.reduce((n, f) => n + f.tipsSeen, 0), acted = mine.reduce((n, f) => n + f.tipsActed, 0)
    const went = mine.filter((f) => f.outcome === 'ahead').length
    return {
      ...p, meetings: mine.length, ahead: went, aheadShare: share(went, mine.length),
      score: mean(scored.map((f) => f.score!)), scored: scored.length,
      checklist: mean(lists.map((f) => f.checklist!.done / f.checklist!.total)),
      tipsActed: acted, tipsSeen: seen, tipsShare: share(acted, seen),
    }
  }).sort((a, b) => b.meetings - a.meetings || a.name.localeCompare(b.name))

  /* Coaching — 1.0's rule (0.8 × the studio's), then the item left out most */
  const eligible = members.filter((m) => m.meetings >= 2)
  const best = eligible.length ? Math.max(...eligible.map((m) => m.aheadShare ?? 0)) : null
  const coaching: CoachRow[] = []
  if (studioShare !== null && studioShare > 0) {
    for (const m of eligible.filter((x) => x.aheadShare !== null && x.aheadShare < 0.8 * studioShare).sort((a, b) => (a.aheadShare ?? 0) - (b.aheadShare ?? 0))) {
      /* (pending modules S23) (invented copy) 1.0's suggestion, plain: "Focus on confirming next steps before ending meetings" */
      coaching.push({ key: `next:${m.id}`, memberId: m.id, name: m.name, color: m.color, kind: 'next-step', text: 'Confirm the next step before you end the meeting',
        evidence: `Yours: ${pctText(m.aheadShare)} · studio: ${pctText(studioShare)} · best: ${pctText(best)}` })
    }
  }
  const asks: (CoachRow & { n: number })[] = []
  for (const m of members) {
    const mine = cur.filter((f) => f.memberId === m.id && f.checklist && f.checklist.total > 0)
    const count = new Map<string, number>()
    for (const f of mine) for (const item of new Set(f.missed)) count.set(item, (count.get(item) ?? 0) + 1)
    const top = [...count.entries()].sort((a, b) => b[1] - a[1])[0]
    if (top && top[1] >= 2) {
      /* (pending modules S23) (invented copy) the new rule's words */
      asks.push({ key: `ask:${m.id}`, memberId: m.id, name: m.name, color: m.color, kind: 'ask', text: `Ask about ${top[0]}`, evidence: `Left out in ${top[1]} of ${plural(mine.length, 'meeting')}`, n: top[1] })
    }
  }
  coaching.push(...asks.sort((a, b) => b.n - a.n || a.name.localeCompare(b.name)).map(({ n: _n, ...row }) => row))

  /* Deal score check — 1.0's calibration */
  let check: ScoreCheck | null = null
  if (scoredRows.length >= CHECK_MIN) {
    const tiers: TierCheck[] = TIERS.map((tier) => {
      const rows = scoredRows.filter((f) => tierOf(f.score!) === tier)
      const matched = rows.filter((f) => f.outcome === TIER_EXPECTS[tier]).length
      return { tier, meetings: rows.length, matched, share: rows.length ? matched / rows.length : 0 }
    }).filter((t) => t.meetings > 0)
    const matched = tiers.reduce((n, t) => n + t.matched, 0)
    const all = matched / scoredRows.length
    const good = all >= CHECK_GOOD
    const hints = good ? [] : [...new Set(tiers.filter((t) => t.share < 0.5).map((t) => TIER_HINT[t.tier]))]
    check = { meetings: scoredRows.length, matched, share: all, good, tiers, weights: hints.map((k) => ({ key: k, label: DIMENSIONS.find((d) => d.key === k)!.label })) }
  }

  /* Objections */
  const heldIds = new Set(cur.map((f) => f.id))
  const rows = objections.filter((o) => heldIds.has(o.meetingId)).slice().sort((a, b) => b.at - a.at || a.kind.localeCompare(b.kind))
  const order = (k: string) => { const i = OBJECTION_KINDS.findIndex((x) => x.key === k); return i < 0 ? 99 : i }
  const counts = new Map<string, number>()
  for (const o of rows) counts.set(o.kind, (counts.get(o.kind) ?? 0) + 1)
  const kinds = [...counts.entries()].map(([kind, count]) => ({ kind, label: kindLabel(kind), count })).sort((a, b) => b.count - a.count || order(a.kind) - order(b.kind))
  const okAhead = rows.filter((o) => o.outcome === 'ahead').length

  return {
    range, held, live: cur.filter((f) => f.live).length,
    ahead, lost, open: held - ahead - lost, aheadShare: studioShare,
    score: mean(scoredRows.map((f) => f.score!)), scored: scoredRows.length,
    lengthMs: mean(timedRows.map((f) => f.lengthMs!)), timed: timedRows.length,
    tipsActed, tipsSeen, tipsShare: share(tipsActed, tipsSeen),
    members, coaching, check, scoredForCheck: scoredRows.length,
    objections: { rows, total: rows.length, top: kinds[0] ?? null, ahead: okAhead, aheadShare: share(okAhead, rows.length), kinds },
  }
}

/** The deal score as the tiles and the table write it: the whole number, "--" when there is none. */
export const scoreText = (s: number | null): string => (s === null ? BLANK : String(Math.round(s)))

/* ── (pending modules S23) (invented copy) the page's fixed words — the page and its ghost read the same ones ── */
export const TILE_LABELS = ['Meetings held', 'Went ahead', 'Average deal score', 'Average length', 'Tips acted on'] as const
export const OBJECTION_TILE_LABELS = ['Total objections', 'Most common', 'Went ahead after'] as const
export const MEMBERS_HELP = 'A meeting counts for whoever started or logged it · went ahead when its lead was won after it'   // (S42 C-02) a Met log is whoever logged it
export const OBJECTIONS_TITLE = 'Objections'
export const OBJECTIONS_HELP = 'What clients pushed back on in the meetings, your studio’s answer, and what happened after'
/* (S42 audit C-02, call C·1) every meeting held counts — with a brief, or logged at Met — and the figures that need a brief say how many have one */
export const FOOT_NOTE = 'Every meeting held counts — one with a brief, and one logged at Met. A meeting went ahead when its lead was won after it, and is not going ahead when its lead is lost; any other meeting is still open. Scores come from the meetings with a brief; lengths and tips from those held with the co-pilot on.'
export const COACHING_TITLE = 'Coaching'
export const CHECK_TITLE = 'Deal score check'
/* the page's empty lines — the page and its ghost read the same words */
export const MEMBERS_EMPTY = 'No meetings held in this period'
export const COACHING_EMPTY = 'Nothing to suggest for this period'
export const OBJECTIONS_EMPTY = 'No objections recorded in this period'
/** (REG-708 · REG-817) what the page drew on its default range last time, per browser — the ghost draws the same blocks (a table or its line) */
export const SHAPE = {
  members: 'om.shape.meeting-reports.members',
  coaching: 'om.shape.meeting-reports.coaching',
  check: 'om.shape.meeting-reports.check',
  objections: 'om.shape.meeting-reports.objections',
} as const

/** The tiles' figures, as the page and the export say them. */
export function tileFigures(r: MeetingsReport): { label: string; value: string; help: string }[] {
  const span = r.range === null ? 'Every meeting held' : 'Held in this range'
  return [
    /* (pending modules S23) (invented copy) the tiles' help lines */
    /* (S42 C-02, call C·1) "n of m with the co-pilot" — a Met log counts as held, without the co-pilot */
    { label: TILE_LABELS[0], value: String(r.held), help: r.held ? (r.live === r.held ? 'All with the co-pilot on' : `${r.live} of ${r.held} with the co-pilot on`) : span },
    { label: TILE_LABELS[1], value: pctText(r.aheadShare), help: r.held ? `${r.ahead} of ${r.held} · ${r.open} still open` : 'No meeting held in this range' },
    { label: TILE_LABELS[2], value: scoreText(r.score), help: r.scored ? `${tierOf(r.score!)} · ${r.scored} of ${plural(r.held, 'meeting')} scored` : 'No meeting scored in this range' },
    { label: TILE_LABELS[3], value: durationWords(r.lengthMs), help: r.timed ? `${plural(r.timed, 'meeting')} with the co-pilot on` : 'No meeting with the co-pilot on' },
    { label: TILE_LABELS[4], value: pctText(r.tipsShare), help: r.tipsSeen ? `${r.tipsActed} of ${plural(r.tipsSeen, 'tip')} shown` : 'No tips shown in this range' },
  ]
}

/** (parity Q-20, the house Export) The page as one sheet — its own words and figures. */
export function meetingsSheet(r: MeetingsReport, nameOf: (id: string | null) => string): { head: string[]; body: string[][] } {
  const body: string[][] = [['Meetings'], ['Figure', 'Value', 'Detail']]
  for (const t of tileFigures(r)) body.push([t.label, t.value, t.help])
  body.push([], ['By team member'], ['Member', 'Role', 'Meetings', 'Went ahead', 'Average deal score', 'Checklist covered', 'Tips acted on'])
  for (const m of r.members) body.push([m.name, m.role, String(m.meetings), `${pctText(m.aheadShare)} · ${m.ahead} of ${m.meetings}`, scoreText(m.score), pctText(m.checklist), m.tipsSeen ? `${pctText(m.tipsShare)} · ${m.tipsActed} of ${m.tipsSeen}` : BLANK])
  body.push([], [COACHING_TITLE], ['Member', 'Suggestion', 'Evidence'])
  for (const c of r.coaching) body.push([c.name, c.text, c.evidence])
  body.push([], [CHECK_TITLE])
  if (r.check) {
    body.push(['Tier', 'Meetings', 'Turned out as scored', 'Share'], ['All', String(r.check.meetings), String(r.check.matched), pctText(r.check.share)])
    for (const t of r.check.tiers) body.push([`${t.tier} · ${TIER_WORDS[t.tier].band}`, String(t.meetings), String(t.matched), pctText(t.share)])
  } else body.push([checkWaitLine(r.scoredForCheck)])
  body.push([], [OBJECTIONS_TITLE], ['Date', 'Lead', 'Member', 'Kind', 'What they said', 'Competitor', 'Your answer', 'Outcome'])
  for (const o of r.objections.rows) body.push([displayDate(new Date(o.at)), o.leadName, nameOf(o.memberId), kindLabel(o.kind), o.said, o.competitor ?? BLANK, o.answer ?? BLANK, OUTCOME_LABEL[o.outcome]])
  return { head: [`Meetings · ${rangeLabel(r.range)} · ${plural(r.held, 'meeting')} held`], body }
}

/** (pending modules S23) (invented copy) the check's line while it waits for more meetings */
export const checkWaitLine = (n: number): string => `The check needs a few more meetings with a deal score — ${n} so far in this range`
