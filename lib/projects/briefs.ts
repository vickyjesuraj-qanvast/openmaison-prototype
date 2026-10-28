/**
 * (parity P-02 · A-02 · D-03) Maison AI briefs on a project's Overview — the lead Overview's MAISON AI BRIEF card (858:24867, `AiBrief`,
 * REG-237's Show more) written from the project's own records, one primary brief per stage:
 *   Setting up  → what is still missing (Getting started's open items, the first one named);
 *   In progress → the top reason it needs attention (the Project stages card's first red row) — else where the schedule stands;
 *   On hold     → since when, why and when it resumes;
 *   Completed   → the closing summary (contract against collected, days against the plan, milestones that finished late).
 * Behind Show more: what waits on the client, and where the schedule stands, when the primary did not already say it.
 *
 * Each brief's two buttons are the project's own Maison AI suggestions (components/projects/use-project-maison.ts, `BRIEF_ACTIONS` below) —
 * a press does exactly what the FAB's does: it answers in the sheet, proposes and runs the page's own action, or opens the record (Q-02).
 *
 * INVENTED COPY in the voice of lib/leads/briefs.ts (one situational sentence, one bold nudge, one consequence), every figure from the
 * records — no invented statistics: a project's brief reports, it does not forecast. Pure: no clock (`now` is handed in), no randomness.
 *
 * (simplify S-01 · P1-06, the owner's "build everything" 2026-10-09 — revises P-02's brief) The brief never describes the page: its tag names the
 * week, never a count ("This week"); its sentence says what the lists below don't — the week's movement and the next decision ("Carpentry
 * fabrication runs to 30 Oct. **Painting starts 2 Nov — it waits on Benjamin for paint colours.**"); its first button acts on the top Needs you
 * row (the header's own action, `top`). One card: the Schedule and Waiting briefs are gone (Needs you, With {client} and Coming up say them),
 * so Show more no longer appears.
 */
import type { Brief } from '@/lib/leads/briefs'
import { dayWords, displayDate, moneyCard } from '@/lib/format'
import type { ClosingSummary } from './handover-model'
import type { Hold } from './hold'
import { resumeLine } from './hold'
import type { ProjectStage } from './model'
import { dateOfDay, dayOf } from './schedule-model'

/** The suggestions a brief's buttons name — their labels ARE the suggestions' (the sheet resolves a press by its words). */
export const BRIEF_ACTIONS = {
  setup: 'What is still to set up?',
  attention: 'What needs attention?',
  overdue: 'What is overdue on this project?',   // (parity P-34) "overdue" for a milestone past its day now
  task: 'Add a task for the next step',
  update: 'Draft an update about this week',
  compliance: 'What compliance is still to do?',
  summary: 'Summarise the project',
  /** (pending modules S14 — 1.0's review request to "project clients") a finished home is the moment a client reviews the studio */
  review: 'Ask for a review',
} as const
export type BriefAction = (typeof BRIEF_ACTIONS)[keyof typeof BRIEF_ACTIONS]

/** What the briefs read — the Overview's own records (lib/projects/queries.ts `ProjectDetail`), nothing fetched for them. */
export type ProjectBriefFacts = {
  stage: ProjectStage
  hold: Hold | null
  /** The client's first name. */
  client: string
  direct: boolean
  /** Getting started, in its own order. */
  setup: { key: string; label: string; help: string; done: boolean }[]
  /** The Project stages card's red rows, heaviest first, and what waits on the client. */
  attention: { key: string; text: string; caption?: string }[]
  waiting: { key: string; text: string }[]
  /** The schedule: done of all, and the next open milestone (day numbers). */
  schedule: { done: number; total: number; next: { title: string; start: number; end: number; status: string } | null } | null
  /** A completed project's closing summary (money only for whoever sees it). */
  closing: ClosingSummary | null
  /** (simplify S-01) The top Needs you row's header words — the brief's first button acts on it; null when nothing waits on the viewer. */
  top?: string | null
  /** (the calm UI build 2026-10-27, 3-01 · 3-09) the top row's words lead the brief's buttons only where the page's header doesn't draw them (a phone) */
  topHere?: boolean
  /** (simplify S-01) The milestone running now, and the schedule's longest wait when it is on the client. (the calm UI build 2026-10-27, 3-30)
      `ask`: an ask for more time on it, waiting — who asked and the day they ask to finish (a day number). */
  running?: { title: string; end: number; ask?: { by: string | null; to: number } | null } | null
  wait?: { title: string; days: number; note: string | null } | null
  /** When it was won (a direct project: added) and completed — epoch ms. */
  wonAt: number
  completedAt: number | null
  now: number
}

const lowerFirst = (s: string) => s.replace(/^./, (c) => c.toLowerCase())
const stop = (s: string) => s.replace(/[.!?]+$/, '')

/** (the calm UI build 2026-10-27, 3-01 · 3-09) The brief never repeats the header's filled button: the top Needs you row's words (`top`) lead its
    buttons only where the header does not draw them — a phone (`topHere`, the page hides its header button there) — else the brief offers only
    the other help. */
function briefPair(f: ProjectBriefFacts, ...xs: (string | null | undefined)[]): [string, string] {
  return pair(...(f.topHere ? [f.top] : []), ...xs)
}

/** Two different buttons: the first that applies, then the next one not already taken. */
function pair(...xs: (string | null | undefined)[]): [string, string] {
  const out = [...new Set(xs.filter((x): x is string => !!x))]
  return [out[0] ?? BRIEF_ACTIONS.task, out[1] ?? (out[0] === BRIEF_ACTIONS.task ? BRIEF_ACTIONS.update : BRIEF_ACTIONS.task)]
}

/** (simplify S-01) "This week": the week's movement, then the next decision in bold — every word from the schedule's records. */
function weekBrief(f: ProjectBriefFacts, today: number): Brief {
  const s = f.schedule
  const next = s?.next && s.next.status === 'not_started' ? s.next : null
  const wait = f.wait ?? null
  /* (the calm UI build 2026-10-27, 3-30 · W-037) a running milestone past its end says it is late — and, when one waits, who asks for how long —
     never "runs to" a day already gone; and the brief never names the same milestone twice */
  const late = f.running && f.running.end < today ? today - f.running.end : 0
  const lateLine = f.running && late > 0
    ? `${f.running.title} is ${dayWords(late)} late${f.running.ask ? ` — ${f.running.ask.by ?? 'the team'} asks to finish ${displayDate(dateOfDay(f.running.ask.to))}` : ''}` : null
  const moving = f.running && !lateLine ? `${f.running.title} runs to ${displayDate(dateOfDay(f.running.end))}. ` : ''
  const waits = wait ? ` — it waits on ${f.client}${wait.note ? ` for ${lowerFirst(stop(wait.note))}` : ''}${wait.days ? `, ${dayWords(wait.days)} so far` : ''}` : ''
  const decision = !s || !s.total ? 'Set up the schedule' + ` — ${f.client} sees the milestones and their dates on their page`
    : wait && next && wait.title === next.title ? `${next.title} starts ${displayDate(dateOfDay(next.start))}${waits}`
    : wait ? `${wait.title}${waits}`
    : next ? `${next.title} starts ${displayDate(dateOfDay(next.start))}`
    : s.done === s.total ? 'Every milestone is done — the handover is next'
    : lateLine ?? (f.running ? 'It is the last milestone running' : `${s.done} of ${s.total} milestones are done`)
  /* a late milestone is the week's news; the next decision follows it when there is another one */
  const text = lateLine && decision !== lateLine ? [{ t: `${lateLine}. ` }, { t: `${decision}.`, bold: true }] : [...(moving ? [{ t: moving }] : []), { t: `${decision}.`, bold: true }]
  return {
    tag: '',   // (the calm UI build 2026-10-27, 3-30 · W-629) no "This week" tag — the brief's sentence says the week (the lead's AiBrief draws nothing for an empty tag)
    text,
    actions: briefPair(f, BRIEF_ACTIONS.update, BRIEF_ACTIONS.task),
  }
}

/** The project's brief — `AiBrief`'s `briefs`: one card (simplify S-01 — Show more only when another brief would add something not on the page,
    and none does today). */
export function projectBriefs(f: ProjectBriefFacts): Brief[] {
  const today = dayOf(new Date(f.now))

  if (f.stage === 'completed') {
    const c = f.closing
    const money = c?.money
    const moneyLine = money
      ? money.outstandingMinor > 0 ? `${moneyCard(money.outstandingMinor)} of ${moneyCard(money.contractMinor)} is still to collect.`
        : money.refundMinor > 0 ? `${moneyCard(money.refundMinor)} was collected beyond the contract — it is owed back to ${f.client}.`
        : money.contractMinor > 0 ? `All of the ${moneyCard(money.contractMinor)} contract is collected.` : null
      : null
    const late = c && c.milestones.total ? `${c.milestones.late} of ${c.milestones.done} ${c.milestones.done === 1 ? 'milestone' : 'milestones'} finished late` : null
    const days = c?.days.actual != null && c.days.planned != null ? (c.days.actual === c.days.planned ? 'as planned' : c.days.actual > c.days.planned ? `${dayWords(c.days.actual - c.days.planned)} more than planned` : `${dayWords(c.days.planned - c.days.actual)} fewer than planned`) : null
    return [{
      /* (the calm UI build 2026-10-27, 3-16 · W-151) one length, the closing summary's own: the days on site */
      tag: c?.days.actual != null ? `Completed · ${dayWords(c.days.actual)} on site` : 'Completed',
      text: [
        { t: `Handed over${f.completedAt !== null ? ` on ${displayDate(new Date(f.completedAt))}` : ''}${days ? `, ${days}` : ''}. ` },
        ...(moneyLine ? [{ t: moneyLine, bold: true }] : late ? [{ t: `${late[0]!.toUpperCase()}${late.slice(1)}.`, bold: true }] : [{ t: 'The closing summary has the figures.', bold: true }]),
        ...(moneyLine && late ? [{ t: ` ${late[0]!.toUpperCase()}${late.slice(1)}.` }] : []),
      ],
      /* (P1 §6.3) Summarise the project + one that applies — never compliance on a finished job · (pending modules S14) the review ask when
         nothing waits on the viewer (a top row, money to collect, still comes first) */
      actions: pair(BRIEF_ACTIONS.summary, ...(f.topHere ? [f.top] : []), BRIEF_ACTIONS.review),
    }]
  }

  if (f.hold) {
    const h = f.hold
    return [{
      tag: 'On hold',
      text: [
        /* (the calm UI build 2026-10-27, 3-31) the hold's day and reason are said once, on its Needs your attention row — the brief says when it resumes */
        { t: `${resumeLine(h, f.now)}.`, bold: true },
        { t: ` ${f.client} reads the reason on their schedule.` },
      ],
      actions: briefPair(f, BRIEF_ACTIONS.task, BRIEF_ACTIONS.update),
    }]
  }

  if (f.stage === 'setting_up') {
    const days = Math.max(0, dayOf(new Date(f.now)) - dayOf(new Date(f.wonAt)))
    return [{
      tag: 'Setting up',
      text: [
        { t: `${f.client}’s project has been setting up for ${dayWords(days)}. ` },
        { t: 'Start it when work begins on site', bold: true },
        { t: ' — its schedule, updates and invoices run from that day.' },
      ],
      actions: briefPair(f, BRIEF_ACTIONS.setup, BRIEF_ACTIONS.task),
    }]
  }

  /* In progress: this week */
  return [weekBrief(f, today)]
}
