/**
 * (REG-914, Q-07 · Q-06) "Needs attention" in place of 1.0's health score: the row says why. A REGISTRY — every round adds the reasons
 * its records back (round 2: milestones overdue · a milestone due soon; round 3: no update for 14 days; round 6: payment overdue; the
 * portal: the client has not answered) by adding a `Facts` field its loader fills and an entry below. Round 1 has only what real data
 * backs today: tasks past their due date on the project's record, and a project still setting up a week after it began with things to
 * do. Pure and client-safe: the server computes the facts, the listing, the tiles, the rail badge and the Overview read the reasons.
 */
import type { ProjectStage } from './model'
import { calendarDaysBetween, dayWords } from '@/lib/format'
import { UPDATE_GAP_DAYS } from './updates-model'
import { COLLECTION_TRAIL_POINTS, READY_GRACE_DAYS, collectionTrail, readyDays } from './invoices-kinds'   // (gaps build B, item 8)

/** How long a project may sit in Setting up, with Getting started items open, before it is raised (invented threshold, REG-914). */
export const SETUP_GRACE_DAYS = 7

export type AttentionFacts = {
  stage: ProjectStage
  createdAt: number
  /** Open tasks on the project's record whose due date has passed. */
  overdueTasks: number
  /** Getting started items still open (lib/projects/getting-started.ts). */
  setupOpen: number
  /** (REG-956, round 3) Days since the client last heard: the newest published update, else the day work began; null before it began. */
  daysSinceUpdate?: number | null
  /** (Projects round 2) Unfinished milestones whose last day has passed, and the longest wait on someone (who · days). */
  milestonesLate?: number
  waiting?: { who: string; days: number } | null
  /** (Projects round 8) Choices shared with the client whose needed-by day has passed unanswered. */
  choicesOverdue?: number
  /** (Projects round 4b) The client said "Something is not right" on a finished stage, and nobody has asked them again yet. */
  clientConcerns?: { who: string; n: number } | null
  /** (Projects round 6, F-14) Sent invoices past their due day with something still owed (a client's proof waiting is not owed). */
  paymentsOverdue?: number
  /** (fix-A, A-07) The project's target end (ms) — a running project past it is raised when no late milestone already says so. */
  targetEnd?: number | null
  /** (gaps build, package A — M-01) On hold, and the day it should resume: its reasons pause (`HOLD_KEEPS`), and a resume day passed is one. */
  onHold?: { until: number | null } | null
  /** (gaps build, package C — 5 · 8) What waits on an Owner or an Admin in the schedule: more time asked (names), a Done to approve (names), a share. */
  scheduleAsks?: { more: string[]; done: string[]; share: boolean } | null
  /** (gaps build F1) POs a vendor answered with changes or a no — they wait on the team; only for whoever sees the project's money (F-17) */
  vendorAnswers?: { po: string; vendor: string; answer: 'changes' | 'declined' }[] | null
  /** (gaps build H, H-Q25) tickets escalated and not resolved; live tickets that have waited on the studio more than WAIT_DAYS */
  tickets?: { escalated: number; waiting: number } | null
}

export type AttentionReason = {
  key: string
  /** Higher = worse: the row lists its reasons worst first, and the Overview's line leads with the worst. */
  weight: number
  /** The reason as the row prints it, or null when it does not apply. */
  reason: (f: AttentionFacts, now: number) => string | null
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

/** (Projects round 2) How long a milestone may wait on someone before the project is raised (invented threshold, as SETUP_GRACE_DAYS). */
export const WAIT_GRACE_DAYS = 3

export const ATTENTION_REASONS: AttentionReason[] = [
  { key: 'tasks_overdue', weight: 30, reason: (f) => (f.overdueTasks > 0 ? `${plural(f.overdueTasks, 'task')} overdue` : null) },
  {
    key: 'setup_stalled', weight: 20,
    reason: (f, now) => {
      const days = calendarDays(f.createdAt, now)   // (parity P-29 · Q-14) calendar days, as every "n days" counts
      return f.stage === 'setting_up' && f.setupOpen > 0 && days >= SETUP_GRACE_DAYS ? `Setting up for ${dayWords(days)}` : null
    },
  },
  /* (REG-956, round 3 — Q-07's own words) a running project whose client has heard nothing for two weeks */
  {
    key: 'update_gap', weight: 15,
    reason: (f) => (f.stage === 'in_progress' && f.daysSinceUpdate != null && f.daysSinceUpdate >= UPDATE_GAP_DAYS ? `No update for ${f.daysSinceUpdate} days` : null),
  },
  /* (Projects round 2) the schedule's reasons — (parity P-34) "overdue" for a milestone open past its last day, the lead's word for anything past
     its day now (the reports' "finished late" is for one that ended after it; "n days late" stays a date's measure) */
  { key: 'milestones_late', weight: 40, reason: (f) => (f.milestonesLate ? `${plural(f.milestonesLate, 'milestone')} overdue` : null) },
  { key: 'waiting', weight: 25, reason: (f) => (f.waiting && f.waiting.days >= WAIT_GRACE_DAYS ? `Waiting on ${f.waiting.who} for ${f.waiting.days} days` : null) },
  /* (Projects round 8) a choice whose needed-by day passed with no answer — "Choice overdue" (the brief's words); more than one counts */
  { key: 'choice_overdue', weight: 22, reason: (f) => (f.choicesOverdue ? (f.choicesOverdue === 1 ? 'Choice overdue' : `${f.choicesOverdue} choices overdue`) : null) },
  /* (Projects round 4b, Q-16) the client's answer on their portal — raised until the studio looks at it with them and asks again */
  { key: 'client_concern', weight: 35, reason: (f) => (f.clientConcerns?.n ? `${f.clientConcerns.who} says something is not right${f.clientConcerns.n > 1 ? ` with ${f.clientConcerns.n} stages` : ''}` : null) },
  /* (Projects round 6, Q-07's own words · F-14) money the client owes past its due day */
  { key: 'payment_overdue', weight: 32, reason: (f) => (f.paymentsOverdue ? (f.paymentsOverdue === 1 ? 'Payment overdue' : `${f.paymentsOverdue} payments overdue`) : null) },
]

/** A completed project needs nothing — (fix-D, D-11 · E-02) but money it is still owed: its "Payment overdue" stays until it is paid; else every
    reason that applies, worst first. */
export function attentionReasons(f: AttentionFacts, now: number): string[] {
  if (f.stage === 'completed') { const owed = ATTENTION_REASONS.find((r) => r.key === 'payment_overdue')?.reason(f, now); return [...(owed ? [owed] : []), ...afterHandover(f, now)] }   // (gaps build H) + a client's problem after handover
  return ATTENTION_REASONS.filter((r) => !f.onHold || HOLD_KEEPS.has(r.key)).map((r) => ({ w: r.weight, text: r.reason(f, now) }))   // (gaps build, package A) paused while on hold
    .filter((x): x is { w: number; text: string } => !!x.text)
    .sort((a, b) => b.w - a.w)
    .map((x) => x.text)
}

/** (fix-A, A-07) Calendar days from `a` to `b` (both ms) — midnight to midnight, the Schedule's own count (B-21): negative once `b` has passed.
    (parity P-29) The house count, `calendarDaysBetween` (lib/format.ts) — one rule for every record, listing and report. */
export const calendarDays = (a: number, b: number): number => calendarDaysBetween(a, b)

/* (fix-A, A-07) a running project whose target end has passed — unless the schedule's late milestone already says it */
ATTENTION_REASONS.push({
  key: 'target_passed', weight: 28,
  reason: (f, now) => {
    if (!f.targetEnd || f.milestonesLate) return null
    const past = calendarDays(f.targetEnd, now)
    return past > 0 ? `${plural(past, 'day')} past the target end` : null
  },
})

/** (fix-A, A-10 · C-17) The reasons with their keys, worst first — the Overview's Status card presses each where it is fixed. The same
    reasons as `attentionReasons` prints (matched by their words), so a rule a round adds there reaches here by itself. */
export function attentionItems(f: AttentionFacts, now: number): { key: string; text: string }[] {
  const keyOf = new Map(ATTENTION_REASONS.map((r) => [r.reason(f, now), r.key]))
  return attentionReasons(f, now).map((text) => ({ key: keyOf.get(text) ?? text, text }))
}

/* (gaps build, package A — M-01) A project on hold is paused: the reasons that measure the work moving (no update, late milestones, a wait, a
   stalled set-up, the target end, a choice overdue, a client's concern) rest until it resumes. What still needs someone keeps its line — a
   task the team set for itself, money the client owes — and the resume day itself, once it has come round. */
/* (simplify Q-14, the owner's "build everything" 2026-10-09 — a rule change) A defect is not paused: an escalated ticket, and one left waiting on the
   studio, keep their line through a hold (P2-11: they dropped out of Needs attention while the client waited). */
export const HOLD_KEEPS: ReadonlySet<string> = new Set(['tasks_overdue', 'payment_overdue', 'hold_resume', 'ticket_escalated', 'ticket_waiting'])
ATTENTION_REASONS.push({
  key: 'hold_resume', weight: 26,
  reason: (f, now) => {
    const until = f.onHold?.until ?? null
    if (until === null) return null
    const late = calendarDays(until, now)
    return late > 0 ? `On hold — was to resume ${plural(late, 'day')} ago` : late === 0 ? 'On hold — resumes today' : null
  },
})
/* ── (gaps build B, item 8 — 1.0 G-441 · G-442) Money's warnings: collection trailing the work, a stage's invoice left ready ─────────── */
/** The money facts a viewer who sees the project's money adds (none for anyone else — F-17). */
export type MoneyAttentionFacts = {
  /** work done by the schedule (its milestones done, %), and what is collected of the contract */
  collection?: { progressPct: number; collectedMinor: number; contractMinor: number } | null
  /** the oldest payment stage's invoice ready to send, and for how many days */
  readyInvoice?: { stage: string; days: number } | null
}
/** The facts from the loaders' records: the payments' facts (`sees`, `contractCollectedMinor`, `ready`), the contract value, the schedule's progress. */
export function moneyAttention(pf: { sees?: boolean; contractCollectedMinor?: number; ready?: { stage: string; since: number }[] } | null | undefined, contractMinor: number | null, progressPct: number | null, now: number): MoneyAttentionFacts {
  if (!pf?.sees) return {}
  const first = pf.ready?.[0]
  return {
    collection: contractMinor && progressPct != null ? { progressPct, collectedMinor: pf.contractCollectedMinor ?? 0, contractMinor } : null,
    readyInvoice: first ? { stage: first.stage, days: readyDays(first.since, now) } : null,
  }
}
ATTENTION_REASONS.push(
  {
    key: 'collection_trailing', weight: 26,
    reason: (f) => {
      const m = f as AttentionFacts & MoneyAttentionFacts
      if (f.stage !== 'in_progress' || !m.collection) return null
      const gap = collectionTrail(m.collection)
      return gap !== null && gap >= COLLECTION_TRAIL_POINTS ? `Collection is trailing progress by ${gap}%` : null
    },
  },
  {
    key: 'invoice_ready', weight: 24,
    reason: (f) => {
      const m = f as AttentionFacts & MoneyAttentionFacts
      if (f.stage === 'completed' || !m.readyInvoice || m.readyInvoice.days < READY_GRACE_DAYS) return null
      return m.readyInvoice.days >= 1 ? `${m.readyInvoice.stage} invoice ready for ${dayWords(m.readyInvoice.days)}` : `${m.readyInvoice.stage} invoice ready to send`   // (simplify P3 §6.8) from day one
    },
  },
)

/* (gaps build, package C — 5 · 8) The schedule's asks wait on an Owner or an Admin: more time asked on a milestone, a Done to approve, changes
   to share with the client — one reason, the first thing waiting named ("More time asked on Painting", "Painting waits to be approved as done",
   "Schedule changes wait to be shared"); they rest while the project is on hold. */
ATTENTION_REASONS.push({
  key: 'schedule_asks', weight: 24,
  reason: (f) => {
    const a = f.scheduleAsks
    if (!a) return null
    if (a.more.length) return a.more.length === 1 ? `More time asked on ${a.more[0]}` : `More time asked on ${a.more.length} milestones`
    if (a.done.length) return a.done.length === 1 ? `${a.done[0]} waits to be approved as done` : `${a.done.length} milestones wait to be approved as done`
    return a.share ? 'Schedule changes wait to be shared' : null
  },
})

/* (gaps build D, item 2 — M-07) The client said no to a choice on their portal (turned the options down, or asked for other options): it is back
   with the studio — one reason, the choice named ("Benjamin said no to Paint colours"). It rests while the project is on hold. */
export type ChoiceNoFacts = { choicesDeclined?: { id: string; title: string; who: string | null }[] }
ATTENTION_REASONS.push({
  key: 'choice_declined', weight: 23,
  reason: (f) => {
    const d = (f as AttentionFacts & ChoiceNoFacts).choicesDeclined
    if (!d?.length || f.stage === 'completed') return null
    return d.length === 1 ? `${d[0]!.who ?? 'The client'} said no to ${d[0]!.title}` : `The client said no to ${d.length} choices`
  },
})
/* (gaps build F1 — F1-Q15) A vendor answered a PO with changes or a no on its link: the team changes it and sends it again (or cancels it). It is
   money's (the viewer must see the project's money — the loaders leave the fact out otherwise) and it keeps its line while the project is on hold
   only if the hold says so (it does not: the work is paused). */
ATTENTION_REASONS.push({
  key: 'vendor_answer', weight: 23,
  reason: (f) => {
    const a = f.vendorAnswers
    if (!a?.length) return null
    const first = a[0]!
    if (a.length > 1) return `${a.length} purchase orders wait on the team`
    return first.answer === 'changes' ? `${first.vendor} asked for changes to ${first.po}` : `${first.vendor} declined ${first.po}`
  },
})

/* ── (gaps build H, H-Q25) The client's problems: a ticket escalated and not yet resolved; a live ticket the studio hasn't answered for more
   than two days. Both stay after handover — a defect reported once the work is done is what tickets are for. (invented copy) */
const TICKET_REASONS: AttentionReason[] = [
  { key: 'ticket_escalated', weight: 38, reason: (f) => (f.tickets?.escalated ? (f.tickets.escalated === 1 ? 'Issue flagged to the Owner' : `${f.tickets.escalated} issues flagged to the Owner`)   /* (the calm UI build 2026-10-27, 3-37 · 1-10) */ : null) },
  { key: 'ticket_waiting', weight: 24, reason: (f) => (f.tickets?.waiting ? `${plural(f.tickets.waiting, 'ticket')} waiting on the studio` : null) },
]
ATTENTION_REASONS.push(...TICKET_REASONS)
/** The reasons a completed project still has — the client's problems after handover, worst first. */
function afterHandover(f: AttentionFacts, now: number): string[] {
  return TICKET_REASONS.map((r) => ({ w: r.weight, text: r.reason(f, now) })).filter((x): x is { w: number; text: string } => !!x.text).sort((a, b) => b.w - a.w).map((x) => x.text)
}
