/**
 * (simplify S-01 · S-02 · S-04 · S-05 · S-20 · Q-03 · Q-09 · Q-14, the owner's "build everything" 2026-10-09 — the build's contract B) The
 * studio's **Needs you**: ONE ranked list of what waits on the person looking at a project, each row with its one button — the twin of the
 * client's What needs you (lib/portal/needs.ts `NEED_PRODUCERS`). A REGISTRY: one producer per kind of thing that can wait, each reading the
 * facts `fetchProjectDetail` already loads (`NeedFacts`); the money rows come from K-M's `fetchMoneyNeeds` (lib/projects/money-needs.ts) and are
 * merged by group. Pure and client-safe.
 *
 * - **The order (Q-03):** a hold's Resume and Setting up's Start ride first; then *Needs your OK* (approvals, the handover review) → the client's
 *   money → Complete handover when it is due → the client waiting on us (a message, a ticket, a mark, a "no", a concern) → late work → telling
 *   the client (changes to share, the weekly update) → set-up leftovers. Overdue TASKS are never rows: they stay in MY TASKS.
 * - **The header's one filled action is the top row's action (S-02, `primaryOf`)** — the list and the button can no longer disagree.
 * - **Red only for "past its day, and ours to fix" (S-05):** a milestone past its end, a target end passed, a ticket left waiting, a weekly update
 *   gone 14 days. The client's lateness, a vendor's answer and a client's "no" are neutral rows (Remind / Open); the client's own waits live in
 *   the Overview's With {client} card, not here.
 * - **Each row opens where its fact is fixed (A-10)** — contract C's deep links (`?open=` · `?done=` · `?share=1` · `?compose=1` · `&mark=`).
 *
 * INVENTED COPY (the words below, logged REG-K-N): the row titles and captions, *Needs you* · *Needs your OK* · *Before work starts* · *Mark {m}
 * done* · *Tell {client} about this week* · *Draft it* · *Paused while on hold* · *Nothing waits on you*.
 */
import type { ProjectStage } from './model'
import type { Hold } from './hold'
import { holdSince, resumeLine, resumeDue } from './hold'
import type { PrimaryAction, PrimaryRun } from './next-step'
import type { SetupRow } from './getting-started'
import { dayLabel, dayOf, extensionWords, plural, shortTitle } from './schedule-model'
import { UPDATE_GAP_DAYS } from './updates-model'
import { dayWords } from '@/lib/format'

/* ── contract B (fixed) ─────────────────────────────────────────────────────────────────────────────────────────────────────── */

export type NeedGroup = 'stage' | 'ok' | 'money' | 'client' | 'late' | 'tell' | 'setup'
export type NeedTone = 'late' | 'approve' | 'neutral'            // red ONLY for 'late' (past its day and ours)
export type NeedAction = { label: string; run?: PrimaryRun; target?: string; href?: string }
export type NeedInline = 'approve-update' | 'approve-po' | 'approve-expense' | 'approve-invoice' | 'approve-done' | 'approve-more-time' | 'review-handover'
  | 'approve-bill'   // (S44R — UAT row 361, call C8) a supplier bill's OK, in the row (no Send back: whoever recorded it changes or removes it)
export type NeedRow = { key: string; kind: string; group: NeedGroup; tab: string /* the view slug where it is fixed */; tone: NeedTone
  title: string; meta?: string; amountMinor?: number; ref?: string /* the record's id */; action: NeedAction; secondary?: NeedAction; inline?: NeedInline
  /** (the calm UI build 2026-10-27, 3-01 · 3-07 — additive) a row that says two facts about one milestone carries the other row's step here (the
      row's ⋮) — `needsOf` merges them, so one milestone is one row */
  also?: NeedAction[]
  /** (simplify round 2 — additive to contract B) an approval answered in place: who asked, what it is about, and (more time) the day it ends
      now — the Send back / Decline dialogs' own words, as the tab says them */
  ask?: NeedAsk }
export type NeedAsk = { who: string | null; title: string; end?: number; /** (simplify round 2) an update's held change: Change approved, as the tab says */ change?: boolean
  /** (the calm UI build 2026-10-27, 3-30 — additive) more time: the day they ask to finish (a day number), for the brief's one line */
  asked?: number; milestoneId?: string }

/* ── the facts the producers read ───────────────────────────────────────────────────────────────────────────────────────────── */

/** What `fetchProjectDetail` hands the registry — every list already scoped to THIS viewer (an approval list is empty for whoever does not
    approve it; the team's rows need `mayChange`). Days are day numbers (lib/projects/schedule-model.ts `dayOf`); moments are epoch ms. */
export type NeedFacts = {
  /** The project's own address (`projectHref(id)`) — every row's deep link starts here. */
  base: string
  /** The client's first name. */
  client: string
  stage: ProjectStage
  hold: Hold | null
  now: number
  today: number
  /** On the project's team (or runs the studio): its own work, its client, its schedule (lib/projects/policy.ts `mayChangeProject`). */
  mayChange: boolean
  /** The signed quote's page, for Getting started's "Open quote". */
  quoteHref: string | null
  /* Needs your OK — what this viewer approves */
  reviews: { id: string; title: string; author: string | null; at: number; /** (simplify round 2) a change held on a published update, not a first post */ change?: boolean }[]
  handoverAsk: { by: string; at: number } | null
  doneAsks: { id: string; title: string; by: string | null; at: number | null }[]
  moreTime: { id: string; milestoneId: string; title: string; by: string; fromEnd: number; toEnd: number; at: number }[]
  shareAsk: { by: string; at: number; n: number } | null
  /* the client waiting on us */
  unread: { n: number; text: string | null; at: number } | null
  tickets: { id: string; number: string; subject: string; escalated: boolean; waitingDays: number; studioTurn: boolean }[]
  /** The ticket's own wait threshold (lib/projects/tickets-model.ts `WAIT_DAYS`): past it, a ticket on the studio's turn is late. */
  ticketWaitDays: number
  marks: { n: number; planId: string; markId: string } | null
  declined: { id: string; title: string; who: string | null }[]
  concerns: { id: string; title: string }[]
  /* the work */
  milestones: { id: string; title: string; start: number; end: number; status: string; waitingOn: 'client' | 'member' | 'supplier' | null; waitingWho: string | null; waitingSince: number | null }[]
  /** The project's target end (ms), when set. */
  targetEnd: number | null
  /** The milestones done, of all — the handover row's caption. */
  progress: { done: number; total: number }
  /* telling the client */
  schedule: { unshared: number; shared: boolean; /** this viewer shares at once (else asks) */ sharesAtOnce: boolean; /** a share ask already waits */ asked: boolean }
  /** The newest published update (ms), and the day the works began (ms) — the weekly update's clock. */
  lastToldAt: number | null
  startedAt: number | null
  /* set-up */
  setup: SetupRow[]
  ending: { near: boolean; mayHandover: boolean }
  /** (parity map, SC-094 — P-E) the approved variation orders whose extra days nobody has answered yet (lib/projects/schedule.ts `voDaysOf` ›
      `open`); optional — a loader that doesn't fill it shows no such row */
  voDays?: { id: string; number: string; title: string; days: number }[]
  /** (S45B · H-UHD-2) work starting within the week (or under way) of a trade the studio's contractors do, with nobody of it on it
      (lib/projects/contractors-model.ts `unstaffedOf`); optional — a loader that doesn't fill it shows no such row */
  crewGaps?: { milestoneId: string; title: string; trade: string; start: number; /** "It starts in 3 days" · "It was to start 13 Oct" */ when: string }[]
}

/** (Q-09) How long after the last published update the weekly update is offered — before the 14-day attention reason (`UPDATE_GAP_DAYS`). */
export const WEEK_UPDATE_DAYS = 6
/** How many rows the card shows before "Show n more" — (the calm UI build 2026-10-27, 3-07 · T-14) three, at every width. */
export const NEEDS_SHOWN = 3
/** (simplify round 2, P1 §6.4) …and on a phone, where Needs you sits under the brief and the rest of the page follows it (the Money tab shows
    two of its own). */
export const NEEDS_SHOWN_PHONE = 3
/** (simplify round 2, P1 §6.4) Coming up's rows on a phone before its own "Show n more" — the Schedule (↗) has every date. */
export const COMING_UP_SHOWN_PHONE = 3

const lowerFirst = (s: string) => s.replace(/^./, (c) => c.toLowerCase())
const stop = (s: string) => s.replace(/[.!?]+$/, '')
const snippet = (s: string, max = 80) => { const t = s.replace(/\s+/g, ' ').trim(); return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t }
/** "today" · "yesterday" · "4 days ago" — the house "n days" (parity P-29), from two moments. */
function agoWords(at: number | null, now: number): string {
  if (at === null) return ''
  const d = Math.max(0, Math.floor((startOfDay(now) - startOfDay(at)) / 86_400_000))
  return d === 0 ? 'today' : d === 1 ? 'yesterday' : `${dayWords(d)} ago`
}
const startOfDay = (t: number) => { const d = new Date(t); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() }
const tab = (f: NeedFacts, slug: string, query?: string) => `${f.base}/${slug}${query ? `?${query}` : ''}`
const enc = encodeURIComponent

/** One producer per kind of thing that can wait on the studio — later rounds append, never reorder (the order inside a group is theirs). */
export type NeedProducer = (f: NeedFacts) => NeedRow[]

export const NEED_PRODUCERS: NeedProducer[] = [
  /* ── stage moves (S-02): a hold's Resume, Setting up's Start, Complete handover once the work is near its end ── */
  (f) => {
    if (!f.hold || f.stage === 'completed' || !f.mayChange) return []
    const h = f.hold
    return [{ key: 'hold', kind: 'hold', group: 'stage', tab: '', tone: resumeDue(h, f.now) && h.until !== null && startOfDay(h.until) < startOfDay(f.now) ? 'late' : 'neutral',
      title: holdSince(h), meta: `${resumeLine(h, f.now)}${h.reason ? ` — “${stop(h.reason)}”` : ''}`,
      action: { label: 'Resume', run: 'resume' }, secondary: { label: 'Change' } }]   // the Overview opens the hold dialog for kind 'hold'
  },
  (f) => (f.stage === 'setting_up' && !f.hold && f.mayChange
    ? [{ key: 'start', kind: 'start', group: 'stage', tab: '', tone: 'neutral', title: 'Start the project', meta: 'When work begins on site', action: { label: 'Start', run: 'start' } }]
    : []),
  (f) => (f.stage === 'in_progress' && !f.hold && f.ending.near && f.ending.mayHandover && !f.handoverAsk
    ? [{ key: 'handover', kind: 'handover', group: 'stage', tab: '', tone: 'neutral', title: 'Complete handover',
        meta: f.progress.total ? `${f.progress.done} of ${plural(f.progress.total, 'milestone')} done` : 'The work is near its end',
        action: { label: 'Hand over', run: 'handover' } }]
    : []),

  /* ── Needs your OK (S-20): every approval waiting on this viewer, approve in the row ── */
  (f) => (f.handoverAsk
    ? [{ key: 'review-handover', kind: 'review-handover', group: 'ok', tab: '', tone: 'approve', title: 'The handover', meta: `${f.handoverAsk.by} asked for your review ${agoWords(f.handoverAsk.at, f.now)}`,
        action: { label: 'Review', run: 'review' }, inline: 'review-handover' }]
    : []),
  (f) => f.reviews.map((u): NeedRow => ({
    key: `review-update:${u.id}`, kind: 'review-update', group: 'ok', tab: 'updates', tone: 'approve', ref: u.id, title: `“${stop(u.title)}”`,
    meta: `${u.author ?? 'The team'} sent it for review ${agoWords(u.at, f.now)} — ${f.client} sees it once you approve`,
    action: { label: 'Review', href: tab(f, 'updates', `open=${enc(u.id)}`) }, secondary: { label: 'Send back', href: tab(f, 'updates', `open=${enc(u.id)}`) }, inline: 'approve-update',
    ask: { who: u.author, title: u.title, change: !!u.change },   // (simplify round 2) the Overview's Send back and Approve say the tab's sentence
  })),
  (f) => f.doneAsks.map((m): NeedRow => ({
    key: `approve-done:${m.id}`, kind: 'approve-done', group: 'ok', tab: 'schedule', tone: 'approve', ref: m.id, title: `${m.title} — done`,
    meta: `${m.by ?? 'The team'} marked it done${m.at !== null ? ` ${agoWords(m.at, f.now)}` : ''} — waiting for your approval`,
    action: { label: 'Review', href: tab(f, 'schedule', `open=${enc(m.id)}`) }, secondary: { label: 'Send back', href: tab(f, 'schedule', `open=${enc(m.id)}`) }, inline: 'approve-done',
    ask: { who: m.by, title: m.title },
  })),
  (f) => f.moreTime.map((x): NeedRow => ({
    key: `approve-more-time:${x.id}`, kind: 'approve-more-time', group: 'ok', tab: 'schedule', tone: 'approve', ref: x.id,
    /* (the calm UI build 2026-10-27, 1-08 · W-048) the person and the ask first: "Michelle asks for 1 week more on Carpentry fabrication" */
    title: x.toEnd >= x.fromEnd ? `${x.by} asks for ${extensionWords(x).replace(/ later$/, ' more')} on ${x.title}` : `${x.by} asks to finish ${x.title} ${extensionWords(x)}`,
    meta: `To end it ${dayLabel(x.toEnd)}`,
    action: { label: 'Review', href: tab(f, 'schedule', `open=${enc(x.milestoneId)}`) }, secondary: { label: 'Decline', href: tab(f, 'schedule', `open=${enc(x.milestoneId)}`) }, inline: 'approve-more-time',
    ask: { who: x.by, title: x.title, end: f.milestones.find((m) => m.id === x.milestoneId)?.end ?? x.fromEnd, asked: x.toEnd, milestoneId: x.milestoneId },   // the day it ends now
  })),
  (f) => (f.shareAsk
    ? [{ key: 'share-ask', kind: 'share-ask', group: 'ok', tab: 'schedule', tone: 'approve', title: `Share ${plural(f.shareAsk.n, 'schedule change')}`, meta: `${f.shareAsk.by} asked ${agoWords(f.shareAsk.at, f.now)} — ${f.client} sees them once you share`,
        action: { label: 'Review', href: tab(f, 'schedule', 'share=1') } }]
    : []),

  /* ── the client waiting on us ── */
  (f) => (f.unread && f.unread.n > 0 && f.mayChange
    ? [{ key: 'message', kind: 'message', group: 'client', tab: 'messages', tone: 'neutral',
        title: f.unread.n === 1 && f.unread.text ? `${f.client}: “${snippet(f.unread.text)}”` : `${plural(f.unread.n, 'new message')} from ${f.client}`,
        meta: `Message · ${agoWords(f.unread.at, f.now)}`, action: { label: 'Reply', href: tab(f, 'messages', 'compose=1') } }]
    : []),
  (f) => (f.mayChange ? f.tickets : []).filter((t) => t.studioTurn || t.escalated).sort((a, b) => Number(b.escalated) - Number(a.escalated) || b.waitingDays - a.waitingDays).map((t): NeedRow => ({
    key: `ticket:${t.id}`, kind: 'ticket', group: 'client', tab: 'tickets', ref: t.id,
    tone: t.escalated || (t.studioTurn && t.waitingDays > f.ticketWaitDays) ? 'late' : 'neutral',   // (S-05) a defect left waiting is ours, and late
    /* (the calm UI build 2026-10-27, 3-37 · 1-10 · T-01) the issue card's own words: "Flagged to the Owner" · "Your turn for 3 days" */
    title: `${t.number} · ${t.subject}`, meta: [t.escalated ? 'Flagged to the Owner' : null, t.studioTurn ? (t.waitingDays > 0 ? `your turn for ${dayWords(t.waitingDays)}` : 'your turn') : null].filter(Boolean).join(' · ').replace(/^./, (c) => c.toUpperCase()),
    action: { label: t.studioTurn ? 'Reply' : 'Open', href: tab(f, 'tickets', `open=${enc(t.id)}`) },
  })),
  (f) => (f.marks && f.marks.n > 0 && f.mayChange
    ? [{ key: 'marks', kind: 'mark', group: 'client', tab: 'floor-plan', tone: 'neutral', ref: f.marks.markId,
        title: f.marks.n === 1 ? '1 mark on the floor plan to answer' : `${f.marks.n} marks on the floor plan to answer`, meta: `From ${f.client}`,
        action: { label: 'Open', href: tab(f, 'floor-plan', `plan=${enc(f.marks.planId)}&mark=${enc(f.marks.markId)}`) } }]
    : []),
  (f) => (f.mayChange && f.stage !== 'completed' ? f.concerns : []).map((m): NeedRow => ({
    key: `concern:${m.id}`, kind: 'concern', group: 'client', tab: 'schedule', tone: 'neutral', ref: m.id,
    title: `${f.client} says something is not right with ${m.title}`, meta: 'Look at it with them, then ask again',
    action: { label: 'Open', href: tab(f, 'schedule', `open=${enc(m.id)}`) },
  })),
  (f) => (f.mayChange && f.stage !== 'completed' ? f.declined : []).map((c): NeedRow => ({
    key: `declined:${c.id}`, kind: 'choice-declined', group: 'client', tab: 'choices', tone: 'neutral', ref: c.id,   // (S-05) a client's "no" is neutral
    title: `${c.who ?? f.client} said no to ${c.title}`, meta: 'A choice to share again', action: { label: 'Open', href: tab(f, 'choices', `open=${enc(c.id)}`) },
  })),

  /* ── late work (ours): a milestone past its day, a start that passed, the target end; a wait on someone else is neutral ── */
  (f) => {
    if (f.stage !== 'in_progress' || !f.mayChange) return []
    const out: NeedRow[] = []
    for (const m of [...f.milestones].sort((a, b) => a.end - b.end || a.start - b.start)) {
      if (m.status === 'done') continue
      if (m.waitingOn === 'client') continue   // the client's — With {client} reminds them (S-05)
      if (m.waitingOn && m.end < f.today) {
        out.push({ key: `waits:${m.id}`, kind: 'milestone-waiting', group: 'late', tab: 'schedule', tone: 'neutral', ref: m.id,
          title: `${m.title} waits on ${m.waitingWho ?? (m.waitingOn === 'supplier' ? 'a supplier' : 'the team')}`,
          meta: `${m.waitingSince !== null ? `Since ${dayLabel(m.waitingSince)} · ` : ''}was due ${dayLabel(m.end)}`, action: { label: 'Open', href: tab(f, 'schedule', `open=${enc(m.id)}`) } })
        continue
      }
      /* (P2 §6.11) the start and done prompts are rows read from records — a reload or a phone keeps them */
      if (m.status === 'not_started' && m.start < f.today) {
        out.push({ key: `start:${m.id}`, kind: 'milestone-start', group: 'late', tab: 'schedule', tone: m.end < f.today ? 'late' : 'neutral', ref: m.id,
          title: m.title, meta: m.end < f.today ? `Was due ${dayLabel(m.end)} · ${dayWords(f.today - m.end)} late` : `Was to start ${dayLabel(m.start)}`,
          action: { label: 'Start', href: tab(f, 'schedule', `open=${enc(m.id)}`) } })
        continue
      }
      if (m.end < f.today) {
        out.push({ key: `done:${m.id}`, kind: 'milestone-done', group: 'late', tab: 'schedule', tone: 'late', ref: m.id,
          title: m.title, meta: `Was due ${dayLabel(m.end)} · ${dayWords(f.today - m.end)} late`,
          action: { label: 'Mark done', href: tab(f, 'schedule', `done=${enc(m.id)}`) } })   // contract C: the Mark done sheet
      }
    }
    return out
  },
  (f) => {
    if (f.stage !== 'in_progress' || !f.mayChange || !f.targetEnd || f.milestones.some((m) => m.status !== 'done' && m.end < f.today)) return []
    const past = Math.floor((startOfDay(f.now) - startOfDay(f.targetEnd)) / 86_400_000)
    if (past <= 0) return []
    return [{ key: 'target', kind: 'target-passed', group: 'late', tab: 'schedule', tone: 'late', title: `${dayWords(past)} past the target end`, meta: `Target end ${dayLabel(dayOf(new Date(f.targetEnd)))}`,
      action: f.milestones.length ? { label: 'Open', href: tab(f, 'schedule') } : { label: 'Change', run: 'dates:end' } }]
  },

  /* ── telling the client ── */
  (f) => {
    if (f.stage !== 'in_progress' || !f.mayChange || f.schedule.unshared <= 0 || (f.schedule.asked && !f.schedule.sharesAtOnce)) return []
    const n = f.schedule.unshared
    return [{ key: 'share', kind: 'share', group: 'tell', tab: 'schedule', tone: 'neutral',
      title: f.schedule.shared ? `Share ${plural(n, 'schedule change')} with ${f.client}` : `${f.client} hasn’t seen the schedule yet`,   // (the calm UI build 2026-10-27, 1-08)
      meta: f.schedule.sharesAtOnce ? `${f.client} sees the dates on their page once you share` : 'An Owner or an Admin shares them',
      action: { label: f.schedule.sharesAtOnce ? 'Share' : 'Ask to share', href: tab(f, 'schedule', 'share=1') } }]
  },
  /* (Q-09) the weekly update: offered as a draft from the week's records (no credits) once the last published update is 6+ days old — red at 14 */
  (f) => {
    if (f.stage !== 'in_progress' || f.hold || !f.mayChange) return []
    const since = f.lastToldAt ?? f.startedAt
    if (since === null) return []
    const days = Math.floor((startOfDay(f.now) - startOfDay(since)) / 86_400_000)
    if (days < WEEK_UPDATE_DAYS) return []
    return [{ key: 'week-update', kind: 'week-update', group: 'tell', tab: 'updates', tone: days >= UPDATE_GAP_DAYS ? 'late' : 'neutral',
      title: `Send ${f.client} this week’s update`, /* (the calm UI build 2026-10-27, W-398 · W-622) */ meta: f.lastToldAt !== null ? `Last update ${dayWords(days)} ago` : `No update since work began ${dayWords(days)} ago`,
      /* (simplify round 2) one door for every press — the row, the header, the brief, Maison AI: Updates drafts the week (Maison AI's weekly
         draft, no credits), saves it as a draft and opens it in the composer (`?draft=week`); nothing is sent without Post */
      action: { label: 'Write', href: tab(f, 'updates', 'draft=week') } }]
  },

  /* ── set-up leftovers — while Setting up, only what the Start step does not ask (S-17); after Start, every open item ── */
  (f) => {
    if (f.stage === 'completed' || !f.mayChange) return []
    const sheet = new Set<string>(SHEET_ITEMS)
    const open = f.setup.filter((s) => !s.done)
    const noSchedule = open.some((s) => s.key === 'schedule')
    /* after Start: the schedule first (it sets the target end too — so no separate end row while it is missing), then the registry's order */
    const after = [...open.filter((s) => s.key === 'schedule'), ...open.filter((s) => s.key !== 'schedule' && s.key !== 'start' && !(noSchedule && s.key === 'end'))]
    return (f.stage === 'setting_up' ? open.filter((s) => !sheet.has(s.key)) : after).map((s): NeedRow => ({
      key: `setup:${s.key}`, kind: `setup-${s.key}`, group: 'setup', tab: s.action.run === 'schedule' ? 'schedule' : '', tone: 'neutral', title: s.label, meta: s.help,
      action: { label: s.action.label, ...setupTarget(f, s.action.run) },
    }))
  },
  /* (parity map, SC-094 — P-E; invented copy) an approved variation order's extra days: "VO-3 adds 3 days — move what follows?" — the Schedule's
     dialog picks the milestone (the running one first) and moves what follows, or Not now. Neutral: the client's change, our schedule to keep. */
  (f) => (f.stage === 'in_progress' && !f.hold && f.mayChange ? (f.voDays ?? []) : []).map((v): NeedRow => ({
    key: `vo-days:${v.id}`, kind: 'vo-days', group: 'late', tab: 'schedule', tone: 'neutral', ref: v.id,
    title: `${v.number} adds ${dayWords(v.days)} — update the schedule?`,   // (the calm UI build 2026-10-27, W-426) meta: `${v.title} · approved by ${f.client}`,
    action: { label: 'Update schedule', href: tab(f, 'schedule', `vo=${enc(v.id)}`) },   // (the calm UI build 2026-10-27, W-557)
  })),
  /* (S45B · H-UHD-2 — 1.0's "unstaffed workscopes starting ≤7 days", the number its spec says the studio will watch; invented copy) work starting
     this week with no contractor of its trade on it: neutral (not past its day), after the late work; Add a contractor opens the Schedule's
     dialog on that milestone and trade (`?assign=` · `&trade=`) */
  (f) => (f.stage === 'in_progress' && !f.hold && f.mayChange ? (f.crewGaps ?? []) : []).map((g): NeedRow => ({
    key: `crew:${g.milestoneId}:${g.trade.toLowerCase()}`, kind: 'crew-gap', group: 'late', tab: 'schedule', tone: 'neutral', ref: g.milestoneId,
    title: g.trade.toLowerCase() === g.title.toLowerCase() ? `No contractor booked for ${g.title}` : `No ${g.trade} contractor booked for ${g.title}`, meta: g.when,   // (the calm UI build 2026-10-27, W-278)
    action: { label: 'Add a contractor', href: tab(f, 'schedule', `assign=${enc(g.milestoneId)}&trade=${enc(g.trade)}`) },
  })),
]

/** (S-17) Getting started's items the Start step asks for itself — the date, the schedule (and the target end it sets), the invite. They leave
    Before work starts while the project is set up; after Start, one still open comes back as a set-up row. */
export const SHEET_ITEMS = ['start', 'end', 'schedule', 'portal'] as const

/** Getting started's runs as a row's action: an address where there is one, else the page's own dialog. */
function setupTarget(f: NeedFacts, run: SetupRow['action']['run']): Pick<NeedAction, 'run' | 'href'> {
  if (run === 'schedule') return { run: 'schedule' }   // the frame opens the Schedule's Start card (and keeps the header's filled button off it, B-16)
  if (run === 'quote') return f.quoteHref ? { href: f.quoteHref } : { run: 'value' }
  return { run }
}

/** Q-03's order: the rank of a row's place (a hold's Resume and Start first; Complete handover after approvals and the client's money). */
function rankOf(r: NeedRow): number {
  if (r.group === 'stage') return r.kind === 'handover' ? 3 : 0
  return { ok: 1, money: 2, client: 4, late: 5, tell: 6, setup: 7 }[r.group]
}

/** The rows a completed project still has: approvals, money, and the client's messages and tickets — after handover, nothing else waits. */
const AFTER_HANDOVER = new Set(['message', 'ticket'])

/**
 * The project's Needs you, in Q-03's order — the registry's rows and the money rows (K-M's), each kept once (by its key), worst first inside its
 * group as its producer listed them.
 */
export function needsOf(f: NeedFacts, money: NeedRow[]): NeedRow[] {
  const all = [...NEED_PRODUCERS.flatMap((p) => p(f)), ...money]
  const seen = new Set<string>()
  const rows = all.filter((r) => { if (seen.has(r.key)) return false; seen.add(r.key); return true })
    .filter((r) => f.stage !== 'completed' || r.group === 'ok' || r.group === 'money' || AFTER_HANDOVER.has(r.kind))
  return oneRowAMilestone(rows, f).map((r, i) => ({ r, i })).sort((a, b) => rankOf(a.r) - rankOf(b.r) || a.i - b.i).map(({ r }) => r)
}

/**
 * (the calm UI build 2026-10-27, 3-01 · 3-07 · T-04) One milestone, one row: an ask for more time on a milestone that is also late, or work with
 * no contractor booked on a milestone that should have started, are said as one row — the ask's (or the gap's) verb, the other row's step in
 * its ⋮ (`also`), its lateness in the caption. Nothing is dropped: the merged step is one press away, and the milestone's own panel has both.
 */
function oneRowAMilestone(rows: NeedRow[], f: NeedFacts): NeedRow[] {
  const late = new Map(rows.filter((r) => (r.kind === 'milestone-done' || r.kind === 'milestone-start') && r.ref).map((r) => [r.ref!, r]))
  const taken = new Set<string>()
  const out = rows.map((r) => {
    if (r.kind === 'approve-more-time' && r.ask?.milestoneId) {
      const l = late.get(r.ask.milestoneId)
      if (!l) return r
      taken.add(l.key)
      const m = f.milestones.find((x) => x.id === r.ask!.milestoneId)
      const lateWords = m && m.end < f.today ? `${dayWords(f.today - m.end)} late — ` : ''
      return { ...r, meta: `${lateWords}${r.meta ?? ''}`.replace(/— To end/, '— to end'), also: [...(r.also ?? []), l.action] }
    }
    if (r.kind === 'crew-gap' && r.ref) {
      const l = late.get(r.ref)
      if (!l || l.kind !== 'milestone-start') return r
      taken.add(l.key)
      const m = f.milestones.find((x) => x.id === r.ref)
      return { ...r, title: m ? `${m.title} should have started ${dayLabel(m.start)}` : r.title, meta: `No contractor booked yet${l.tone === 'late' && l.meta ? ` · ${l.meta}` : ''}`,
        tone: l.tone === 'late' ? 'late' : r.tone, also: [...(r.also ?? []), l.action] }
    }
    return r
  })
  return out.filter((r) => !taken.has(r.key))
}

/**
 * (Q-14 · `HOLD_KEEPS`, lib/projects/attention.ts) On hold, the work is paused: the hold row, what only you can unblock, the money and the
 * client's messages and tickets keep their place (a defect is not paused), and so does the set-up still open (P1 §6.3: "Invite Aisha to her
 * portal"); everything else — late work, telling the client, a mark, a "no" — rests under one quiet "Paused while on hold · n".
 */
export function holdSplit(rows: NeedRow[], hold: Hold | null): { kept: NeedRow[]; paused: NeedRow[] } {
  if (!hold) return { kept: rows, paused: [] }
  const keeps = (r: NeedRow) => r.kind === 'hold' || r.group === 'ok' || r.group === 'money' || r.group === 'setup' || AFTER_HANDOVER.has(r.kind)
  return { kept: rows.filter(keeps), paused: rows.filter((r) => !keeps(r)) }
}

/* ── the header's one filled action (S-02) ──────────────────────────────────────────────────────────────────────────────────── */

/** The header button's words for a row — the row's own button is short ("Review", "Pay"); the header names what it acts on. */
const HEADER: Record<string, (r: NeedRow, client: string) => string> = {
  hold: () => 'Resume',
  start: () => 'Start the project',
  handover: () => 'Complete handover',
  'review-handover': () => 'Review the handover',
  'review-update': () => 'Review the update',
  'approve-done': (r) => `Review ${shortTitle(r.title.replace(/ — done$/, ''))} as done`,
  'approve-more-time': () => 'Review the ask for more time',
  'share-ask': () => 'Review the share',
  message: (_r, client) => `Reply to ${client}`,
  ticket: (r) => `${r.action.label} ${r.title.split(' · ')[0] ?? 'the issue'}`,   // (the calm UI build 2026-10-27, 3-37)
  mark: () => 'Answer the floor plan',
  concern: (r) => `Open ${r.title.replace(/^.* not right with /, '')}`,
  'choice-declined': (r) => `Open ${r.title.replace(/^.* said no to /, '')}`,
  'milestone-done': (r) => `Mark ${shortTitle(r.title)} done`,
  'milestone-start': (r) => `Start ${shortTitle(r.title)}`,
  'milestone-waiting': (r) => `Open ${shortTitle(r.title.replace(/ waits on .*$/, ''))}`,
  'target-passed': (r) => (r.action.run ? 'Change the target end' : 'Open the schedule'),
  share: (r) => (r.action.label === 'Ask to share' ? 'Ask to share' : r.title.endsWith('the schedule yet') ? 'Share the schedule' : 'Share changes'),
  'week-update': (_r, client) => `Send ${client} this week’s update`,   // (the calm UI build 2026-10-27, W-398)
  /* K-M's money rows (lib/projects/money-needs.ts `MONEY_NEED_KINDS`) — their own buttons are short too */
  'money-approve': (r) => `Approve ${lowerFirst(r.title)}`,
  'cost-po-approve': (r) => `Approve ${r.title.split(' ')[0] ?? 'the PO'}`,
  'cost-expense-approve': () => 'Approve the expense',
  'cost-bill-approve': (r) => `Approve ${lowerFirst(r.title.replace(/ from .*$/, ''))}`,   // (S44R, C8; invented copy) · (the calm UI build 2026-10-27, 1-31) "Approve bill AF-7781"
  'cost-bill-overdue': () => 'Pay the overdue bill',
  'cost-po-overdue': (r) => `Pay ${r.title.split(' ')[0] ?? 'the PO'}`,
  'money-confirm': () => 'Confirm the payment',
  'money-due-today': (_r, client) => `Remind ${client} of today’s payment`,   // (simplify round 3; invented copy)
  'money-to-refund': () => 'Record the refund',   // (the calm UI build 2026-10-27, W-602) the row's verb is "Record"; the header keeps its own words
  'money-ready': (r) => { const stage = /^The (.+?) invoice/.exec(r.title)?.[1]; return stage ? `${r.action.label === 'Send' ? 'Send' : 'Submit'} the ${stage} invoice` : r.action.label },
  'money-sent-back': (r) => (r.action.label === 'Send' ? 'Send the invoice' : 'Submit the invoice again'),
  /* region parity-map header words (parity map 2026-10-10) — P-A · P-B · P-E add their new kinds' words here, one line each */
  'vo-days': (r) => `Update the schedule for ${r.title.split(' ')[0] ?? 'the order'}`,   // (P-E, SC-094) · (the calm UI build 2026-10-27, W-557)
  'cost-po-late': (r) => `Mark ${r.title.split(' ')[0] ?? 'the PO'} delivered`,   // (P-B, MO-094; invented copy)
  /* end parity-map header words */
}

/** Getting started's leftovers in the header: what the step does, in words that read alone. */
const SETUP_HEADER: Record<string, (client: string, r: NeedRow) => string> = {
  start: () => 'Set the start date', end: () => 'Set the target end date', team: () => 'Assign members',
  value: (_c, r) => (r.action.href ? 'Open the signed quote' : 'Add the contract value'), contract: () => 'Add the contract',
  schedule: () => 'Set up the schedule', portal: (client) => `Invite ${client}`,
}
/** A row's header words: its kind's own, else its button when that reads alone ("Record a payment"), else the button and what it acts on. */
export function headerLabel(r: NeedRow, client: string): string {
  const own = HEADER[r.kind] ?? (r.kind.startsWith('setup-') ? () => SETUP_HEADER[r.kind.slice('setup-'.length)]?.(client, r) ?? r.action.label : null)
  if (own) return own(r, client)
  return r.action.label.includes(' ') ? r.action.label : `${r.action.label} — ${lowerFirst(r.title)}`
}

/**
 * (S-02) The header's one filled action: the top row's — what it does is the row's own action; an approval opens the record it is about (the
 * row approves in place; the header never approves unread). Null when nothing waits: the caller falls back to the stage's registry
 * (lib/projects/next-step.ts, REG-917's one filled action).
 */
export function primaryOf(rows: NeedRow[], client: string): PrimaryAction | null {
  const top = rows[0]
  if (!top) return null
  return { key: top.key, label: headerLabel(top, client), ...(top.action.run ? { run: top.action.run } : {}), ...(top.action.href ? { href: top.action.href } : {}), ...(top.action.target ? { target: top.action.target } : {}) }
}

/* ── the tab counts (S-04): what waits on YOU there, one number per view ───────────────────────────────────────────────────── */

export type CountFacts = {
  /** Open tasks overdue or due today on the project's record. */
  tasksDue: number
  /** The schedule's asks this viewer approves, and whether this viewer has changes to share (counted as one). */
  scheduleAsks: number
  toShare: boolean
  /** Updates waiting for this viewer's review. */
  reviews: number
  unread: number
  ticketsToAnswer: number
  declined: number
  marks: number
  /** (pending modules S23) the lead's meetings waiting: briefs to save, notes to write up */
  meetings?: number
}
/** (S-04, P1 §6.2's table) Each view's count; the strip's group badge is the sum of its views (K-F). Compliance stops counting on the strip. */
export function tabCountsOf(c: CountFacts, rows: NeedRow[]): Record<string, number> {
  return {
    '': 0,
    tasks: c.tasksDue,
    compliance: 0,
    schedule: c.scheduleAsks + (c.toShare ? 1 : 0) + rows.filter((r) => r.kind === 'vo-days').length,   // (parity map, SC-094) an order's days to answer
    updates: c.reviews,
    messages: c.unread,
    tickets: c.ticketsToAnswer,
    meetings: c.meetings ?? 0,   // (pending modules S23)
    questionnaire: 0,
    choices: c.declined,
    'floor-plan': c.marks,
    designs: 0,
    money: rows.filter((r) => r.tab === 'money').length,
    files: 0, notes: 0, activity: 0,
  }
}
