/**
 * (Projects round 4b — Q-15 · Q-16 · Q-37…Q-41; the Client Portal Proposal, boards 1 · 2 · 7) The portal's Schedule, pure and client-safe:
 * what the client reads about each stage, the stage waiting for their confirmation, what changed since they last looked, and the words.
 *
 * The rules (the server checks them again in app/portal/project-actions.ts — never only here):
 *   · The client reads the NEWEST SHARE's snapshot (round 2's `ScheduleSnapshot`), never the live milestones: a change not shared is absent.
 *   · A stage waits for their confirmation when it was shared as done, the studio still asks (`confirm_asked_at`), the milestone is still
 *     done and live, and nobody has answered. The ask is the studio's request and the answer the client's own, so both are read live.
 *   · An answered stage keeps its answer on the page (1.0 filtered it away — I-263); an answer is never changed from the portal.
 *   · "What changed since you last looked" compares the newest share with the one that stood when the client last opened the tab.
 */
import { CLIENT_CONFIRM_LABEL, CLIENT_STATE_LABEL, changeWords, dayLabel, dayMonth, dayOf, dayOfIso, rangeLabel, scheduleChanges, shortTitle, spanWord, type ClientRow, type ClientState, type ScheduleSnapshot } from '@/lib/projects/schedule-model'

/** The client's answer to a stage, as the portal and the studio read it. */
export type StageAnswerKind = 'confirmed' | 'changes'
export const isStageAnswer = (v: unknown): v is StageAnswerKind => v === 'confirmed' || v === 'changes'
export const NOTE_MAX = 500

/** A live milestone's confirmation facts — read beside the snapshot. Times are ms. */
export type LiveStage = {
  id: string
  status: string
  deleted: boolean
  askedAt: number | null
  answer: StageAnswerKind | null
  note: string | null
  answeredAt: number | null
  /** The answerer's first name (a homeowner of the lead). */
  answeredBy: string | null
  /** (fix-F, F-03) The answerer's homeowner id — the page says "You" only to them. */
  answeredById?: string | null
  doneAt: number | null
  /** (gaps build D, item 4 — C's `client_note`) what the client may read about a Blocked stage; empty = the reason stays with the team */
  clientNote?: string | null
  /** (gaps build D, item 5 — C's `resolved_note` · `resolved_at`) what the studio changed after the client said "not right" */
  resolved?: { note: string; at: number } | null
  /** (parity map, CP-064 — P-E's `resume_on`) the day a Blocked stage is expected to pick up again (ms, local midnight); null = not said */
  resumeOn?: number | null
}

/** (fix-F, F-26) `wasRange` — the dates it had, struck before its dates on the row (one statement of the move); `summary` — the side card's
    word for it ("1 week later", "New"), never the dates a third time. */
export type StageMark = { kind: 'new' | 'changed'; was?: string; now: string; wasRange?: string; summary?: string }
export type PortalStage = {
  id: string
  title: string
  /** Day numbers (calendar days, inclusive). */
  start: number
  end: number
  state: ClientState
  /** The studio asked and nobody has answered — the confirm card is shown for it. */
  toConfirm: boolean
  /** The day the studio marked it done (else its last day as shared) — "Your designer marked this stage done on 2 Oct". */
  finishedOn: number
  /** `mine` (fix-F, F-03): the reader gave it — the page says "You"; anyone else from the household is named (`by`). */
  answer: { kind: StageAnswerKind; note: string | null; at: number | null; by: string | null; mine: boolean } | null
  /** Changed since the client last looked. */
  mark: StageMark | null
  /** (gaps build D, item 4 — 1.0 I-254) the stage is paused (Blocked in the studio): with the words the studio wrote for the client, if any —
      (parity map, CP-064) and the day it should pick up again, when the studio gave one */
  paused?: { note: string | null; resumeOn?: number | null } | null
  /** (gaps build D, item 5) the studio's answer to "not right", while it is the latest word on the stage */
  resolved?: { note: string; at: number } | null
  /** (gaps build D, item 4 — 1.0 I-253) the payment points tied to this stage: its stage · amount · Paid / Due (only while Money is on) */
  payments?: StagePayment[]
  /** (gaps build D, item 4) the one "you are here" row — the stage under way (or paused), else the next to start */
  here?: boolean
}
/** (gaps build D, item 4) A payment point on the client's schedule. */
export type StagePayment = { name: string; amountMinor: number; pct: number; state: 'paid' | 'due' | 'to_confirm' | 'planned'; invoiceId: string | null; dueAt: number | null }

/**
 * (simplify S-25, his "build everything" 2026-10-09) A stage the client reads as **Paused**: Blocked in the studio, live (a block is never a
 * share), and not done on their copy. The one rule for every place the client's schedule shows — the Schedule page's rows, the home's "Where
 * the work stands" (`summaryOf`) and the studio's own look at it (the Schedule tab's client pane): the snapshot alone says "under way" for a
 * Blocked stage, which is why the home and the studio's pane said "Under way" while the client's Schedule said "Paused".
 */
export function isPausedStage(row: Pick<ClientRow, 'state'> | null | undefined, live: Pick<LiveStage, 'status' | 'deleted'> | null | undefined): boolean {
  return !!row && !!live && !live.deleted && live.status === 'blocked' && row.state !== 'done'
}

/** Whether a stage waits on the client — the one rule the page, What needs you, the access panel and the action share. */
export function waitsForClient(row: Pick<ClientRow, 'state'> | null | undefined, live: LiveStage | null | undefined): boolean {
  return !!row && row.state === 'done' && !!live && !live.deleted && live.status === 'done' && live.askedAt !== null && !live.answer
}
/** Why a confirmation is refused, in the words the client reads — or null when it may be given. (the calm UI build 2026-10-27, 3-04 · T-01) The
    client's word is "milestone", the studio's Schedule's — "stage" is a project's own (Setting up · In progress · Completed). */
export function confirmBlock(row: Pick<ClientRow, 'state'> | null | undefined, live: LiveStage | null | undefined, readerId?: string | null): string | null {
  if (!row || !live || live.deleted) return 'This milestone isn’t on your schedule any more'
  /* (fix-F, F-03) someone else from the household answered: say who, never "You" */
  if (live.answer) return live.answeredBy && live.answeredById && readerId && live.answeredById !== readerId ? `${live.answeredBy} has already answered for this milestone` : 'You have already answered for this milestone'
  if (live.askedAt === null) return 'Your designer hasn’t asked you to confirm this milestone'
  if (row.state !== 'done' || live.status !== 'done') return 'This milestone isn’t finished yet'
  return null
}

/**
 * The stages as the client reads them: the snapshot's rows in order, each with its live ask and answer, and — when the client looked
 * before and a newer share has come since — what changed (`seen` = the share that stood at their last look; undefined = never looked).
 */
export function portalStages(snap: ScheduleSnapshot, live: Map<string, LiveStage>, seen: ScheduleSnapshot | null | undefined, readerId?: string | null): { stages: PortalStage[]; removed: { id: string; title: string }[] } {
  const handoverId = snap.rows.reduce<ClientRow | null>((h, r) => (!h || r.end >= h.end ? r : h), null)?.id ?? null
  const changes = seen ? scheduleChanges(snap.rows, seen) : []
  const byId = new Map(changes.map((c) => [c.id, c]))
  const stages = snap.rows.map((r): PortalStage => {
    const l = live.get(r.id) ?? null
    const start = dayOfIso(r.start) ?? 0, end = dayOfIso(r.end) ?? start
    const c = byId.get(r.id)
    const words = c ? changeWords(c, handoverId) : null
    /* (gaps build D, items 4 · 5) a Blocked stage reads paused — told live, as the milestone panel promises ("their schedule says this stage is
       paused"), with the words written for the client; the studio's resolved note while it is the latest word */
    const paused = isPausedStage(r, l) ? { note: l!.clientNote?.trim() || null, resumeOn: l!.resumeOn ?? null } : null   // (parity map, CP-064) told live too
    const resolved = l && !l.deleted && l.resolved && (l.answeredAt === null || l.resolved.at >= l.answeredAt) ? l.resolved : null
    return {
      id: r.id, title: r.title, start, end, state: r.state, paused, resolved,
      toConfirm: waitsForClient(r, l),
      finishedOn: l?.doneAt ? dayOf(new Date(l.doneAt)) : end,
      answer: l && !l.deleted && l.answer ? { kind: l.answer, note: l.note, at: l.answeredAt, by: l.answeredBy, mine: !l.answeredById || !readerId || l.answeredById === readerId } : null,
      mark: c && words ? { kind: c.was ? 'changed' : 'new', ...words, ...moveOf(c) } : null,
    }
  })
  /* (gaps build D, item 4) "you are here" — (the calm UI build 2026-10-27, 3-52 · T-17) on the one milestone under way: never on a paused one
     while another runs, none when two run at once (no single place to be); with none under way, the first paused, else the first still to come */
  const running = stages.flatMap((s, i) => (s.state === 'in_progress' && !s.paused ? [i] : []))
  const here = running.length === 1 ? running[0]! : running.length > 1 ? -1
    : stages.findIndex((s) => s.paused) >= 0 ? stages.findIndex((s) => s.paused) : stages.findIndex((s) => s.state === 'coming_up')
  if (here >= 0) stages[here] = { ...stages[here]!, here: true }
  return { stages, removed: changes.filter((c) => !c.now).map((c) => ({ id: c.id, title: c.title })) }
}

/* ── (gaps build D, item 4 — M-01 · 1.0 I-254) A pause, told honestly ─────────────────────────────────────────────────────────── */

/** The word for a paused stage on the client's row. */
export const PAUSED_LABEL = 'Paused'
/** 1.0's line for a project on hold: "Paused — waiting for the condo's renovation permit · resuming around 16 Nov". */
export function holdLine(h: { reason: string; until: number | null }, now: number): string {
  const day = h.until !== null ? (() => { const d = new Date(h.until); return new Date(now).getFullYear() === d.getFullYear() ? dayMonth(dayOf(d)) : `${dayMonth(dayOf(d))} ${d.getFullYear()}` })() : null
  return ['Paused', h.reason.trim() ? `— ${h.reason.trim().replace(/[.!?]+$/, '')}` : '', day ? `· resuming around ${day}` : ''].filter(Boolean).join(' ')
}
/** (parity map, CP-064 — 1.0 I-254) A paused stage's restart, in the client's words: "Resuming around 16 Nov" — or, once that day has gone by
    with the stage still paused, "Resume day passed" (1.0's "Resume date passed"); null when the studio gave no day. */
export function resumeWords(resumeOn: number | null | undefined, now: number): string | null {
  if (resumeOn === null || resumeOn === undefined) return null
  const d = new Date(resumeOn)
  if (dayOf(d) < dayOf(new Date(now))) return 'Resume day passed'
  return `Resuming around ${new Date(now).getFullYear() === d.getFullYear() ? dayMonth(dayOf(d)) : `${dayMonth(dayOf(d))} ${d.getFullYear()}`}`
}
/** (parity map, CP-064) A paused stage's line under its name: "Paused — waiting for the MCST's permit · Resuming around 16 Nov"; null when the
    studio wrote nothing for the client and gave no day (the row's state already says Paused). */
export function pausedLine(p: NonNullable<PortalStage['paused']>, now: number): string | null {
  const resume = resumeWords(p.resumeOn, now)
  if (!p.note && !resume) return null
  /* the studio's words as written when they stand alone (today's line); their full stop goes when the restart follows them */
  if (!resume) return `Paused — ${p.note}`
  return [p.note ? `Paused — ${p.note.replace(/[.!?]+$/, '')}` : 'Paused', resume].join(' · ')
}

/* ── (parity map, CP-062 · SC-087 — 1.0's timeline chips and rail, I-251 · I-256 · E-238) ─────────────────────────────────────── */

/** The chips over the stages — only past `FILTER_MIN_STAGES` stages (a short list reads at a glance). 1.0's All · Payments · In progress ·
    Blocked · Upcoming in the portal's own words: Under way · Paused · Coming up. */
export type StageFilter = 'all' | 'payments' | 'now' | 'paused' | 'next'
export const STAGE_FILTERS: readonly { key: StageFilter; label: string }[] = [
  { key: 'all', label: 'All' }, { key: 'payments', label: 'Payments' }, { key: 'now', label: 'Under way' }, { key: 'paused', label: 'Paused' }, { key: 'next', label: 'Coming up' },
]
export const FILTER_MIN_STAGES = 5
export const showStageFilters = (stages: readonly unknown[]) => stages.length > FILTER_MIN_STAGES
/** Whether a stage shows under a chip: Payments — a payment point rides on it; Under way — started and not paused; Paused — Blocked in the
    studio; Coming up — not started. Done stages show under All (and Payments, with their payment). */
export function stageMatches(s: Pick<PortalStage, 'state' | 'paused' | 'payments'>, f: StageFilter): boolean {
  if (f === 'all') return true
  if (f === 'payments') return !!s.payments?.length
  if (f === 'paused') return !!s.paused
  if (f === 'now') return s.state === 'in_progress' && !s.paused
  return s.state === 'coming_up' && !s.paused
}

/** A moment on the schedule's rail beside the stages (1.0's "Project Created" and its sent invoices): the project started, an invoice sent. */
export type ScheduleEvent = { key: string; kind: 'started' | 'invoice'; day: number; title: string; line: string; invoiceId?: string | null }
/** The rail in order: the stages as the studio ordered them, each moment placed before the first stage that starts after it — the project's
    start before a stage starting that same day, an invoice after the stages already begun when it was sent. */
export type RailItem = { kind: 'stage'; stage: PortalStage } | { kind: 'event'; event: ScheduleEvent }
export function railOf(stages: readonly PortalStage[], events: readonly ScheduleEvent[]): RailItem[] {
  const out: RailItem[] = []
  const queue = [...events].sort((a, b) => a.day - b.day || (a.kind === 'started' ? -1 : b.kind === 'started' ? 1 : 0))
  const after = (e: ScheduleEvent, s: PortalStage) => (e.kind === 'started' ? s.start >= e.day : s.start > e.day)
  for (const s of stages) {
    while (queue.length && after(queue[0]!, s)) out.push({ kind: 'event', event: queue.shift()! })
    out.push({ kind: 'stage', stage: s })
  }
  for (const e of queue) out.push({ kind: 'event', event: e })
  return out
}

/** A payment point's words: "Mid-project payment · S$20,784.94 · Paid" (30% when it is a share). */
export const paymentState: Record<StagePayment['state'], string> = { paid: 'Paid', due: 'Due', to_confirm: 'Paid · being confirmed', planned: 'Not invoiced yet' }

/** (fix-F, F-26) A moved stage: the range it had, and the move in a few words — "1 week later" · "Starts 3 days earlier" · "New". */
function moveOf(c: { was: ClientRow | null; now: ClientRow | null }): Pick<StageMark, 'wasRange' | 'summary'> {
  if (!c.now) return {}
  if (!c.was) return { summary: 'New' }
  const ws = dayOfIso(c.was.start) ?? 0, we = dayOfIso(c.was.end) ?? ws, ns = dayOfIso(c.now.start) ?? 0, ne = dayOfIso(c.now.end) ?? ns
  if (ws === ns && we === ne) return {}
  const d = ne - we, a = ns - ws
  const summary = d ? `${spanWord(d)} ${d > 0 ? 'later' : 'earlier'}` : `Starts ${spanWord(a)} ${a > 0 ? 'later' : 'earlier'}`
  return { wasRange: rangeLabel(ws, we), summary }
}

/* ── The words (the canvas's) ────────────────────────────────────────────────────────────────────────────────────────────────── */

/** "Electrical & plumbing" → "electrical and plumbing" — a stage's name inside a sentence. */
export const stageWords = (title: string) => title.replace(/\s*&\s*/g, ' and ').replace(/^./, (c) => c.toLowerCase())
/** The sentence's subject: "Electrical and plumbing". */
const subject = (title: string) => stageWords(title).replace(/^./, (c) => c.toUpperCase())
/** Board 1: "Confirm that electrical and plumbing is done". */
export const confirmTitle = (title: string) => `Confirm that ${stageWords(title)} is done`
/** Board 2: "Electrical and plumbing is finished". */
export const finishedTitle = (title: string) => `${subject(title)} is finished`
/** Board 1's line: "Finished 2 Oct · have a look and confirm". */
export const confirmLine = (finishedOn: number) => `Finished ${dayMonth(finishedOn)} · have a look and confirm`
/** Where the client goes to look: an HDB or a condo is "the flat", a landed home "the house" (board 2: "when you are next at the flat"). */
export function placeWord(propertyType: string | null | undefined): string {
  const t = propertyType ?? ''
  if (/^landed/i.test(t)) return 'at the house'
  if (/hdb|bto|condo|executive|studio|flat|apartment/i.test(t)) return 'at the flat'
  return 'there'
}
/** Board 2: "Your designer marked this stage done on 2 Oct. Have a look when you are next at the flat, then tell us." */
export const confirmAsk = (finishedOn: number, propertyType: string | null | undefined) =>
  `Your designer marked this milestone done on ${dayMonth(finishedOn)}. Have a look when you are next ${placeWord(propertyType)}, then tell us.`   // (the calm UI build 2026-10-27, 3-04)

/** The state at the row's right — board 2's words, and the answer once given. */
export function stateLabel(s: PortalStage): string {
  if (s.toConfirm) return CLIENT_CONFIRM_LABEL.asked   // (REG-1051) the one list of the client's words, shared with the studio's preview
  if (s.paused) return PAUSED_LABEL   // (gaps build D, item 4)
  if (s.answer?.kind === 'confirmed') return CLIENT_CONFIRM_LABEL.confirmed
  if (s.answer?.kind === 'changes') return CLIENT_CONFIRM_LABEL.changes
  return CLIENT_STATE_LABEL[s.state]
}
export const stateTone = (s: PortalStage): 'ask' | 'changes' | 'done' | 'now' | 'next' | 'paused' =>
  s.toConfirm ? 'ask' : s.paused ? 'paused' : s.answer?.kind === 'changes' && !s.resolved ? 'changes' : s.state === 'done' ? 'done' : s.state === 'in_progress' ? 'now' : 'next'

/** The row's grey line: its dates, as board 2 prints them. */
export const datesOf = (s: Pick<PortalStage, 'start' | 'end'>) => rangeLabel(s.start, s.end)

/** "Handover is planned for Fri 13 Nov. Last updated 2 Oct." — board 2's lede. */
export function scheduleLede(o: { handover: number | null; sharedAt: number | null; allDone: boolean }): string {
  const head = o.allDone ? 'Every milestone is done.' : o.handover !== null ? `Handover is planned for ${dayLabel(o.handover)}.` : ''
  const tail = o.sharedAt ? `Last updated ${dayMonth(dayOf(new Date(o.sharedAt)))}.` : ''
  return [head, tail].filter(Boolean).join(' ')
}

/** Where the work stands (boards 1 · 7): done of how many, the stage under way (else the next), the handover. */
export type ScheduleSummary = {
  done: number
  total: number
  /** The stage under way — the earliest running one; else the next to start; null when all are done. (simplify S-25) `paused`: Blocked live —
      (the calm UI build 2026-10-27, 3-10) with the day the studio said it picks up again, so the home's line says what its card says */
  now: { title: string; state: ClientState; start: number; paused?: boolean; resumeOn?: number | null } | null
  handover: number | null
  /** Each stage's dot (board 7's list) and its segment (board 1's bar). (simplify S-25) `paused`: Blocked live — the Schedule page's word. */
  stages: { id: string; title: string; start: number; end: number; state: ClientState; paused?: boolean }[]
  sharedAt: number
}
/** (simplify S-25) `live` — the milestones as they stand: a Blocked one reads paused here as on the Schedule page (`isPausedStage`). */
export function summaryOf(snap: ScheduleSnapshot, sharedAt: number, live?: Map<string, Pick<LiveStage, 'status' | 'deleted' | 'resumeOn'>>): ScheduleSummary {
  const stages = snap.rows.map((r) => ({ id: r.id, title: r.title, start: dayOfIso(r.start) ?? 0, end: dayOfIso(r.end) ?? 0, state: r.state, paused: isPausedStage(r, live?.get(r.id)) }))
  const running = stages.filter((s) => s.state === 'in_progress').sort((a, b) => a.start - b.start)[0]
  const next = stages.filter((s) => s.state === 'coming_up').sort((a, b) => a.start - b.start)[0]
  const n = running ?? next ?? null
  return {
    done: stages.filter((s) => s.state === 'done').length, total: stages.length,
    now: n ? { title: n.title, state: n.state, start: n.start, paused: n.paused, resumeOn: n.paused ? live?.get(n.id)?.resumeOn ?? null : null } : null,
    handover: snap.handover ? dayOfIso(snap.handover) : null,
    stages, sharedAt,
  }
}
/** Board 1's card title: "Carpentry is under way" · "Painting starts Mon 26 Oct" · "Every stage is done" — (simplify S-25) "Electrical &
    plumbing is paused" for a Blocked stage, as the Schedule page's row says Paused. */
export function standsTitle(s: ScheduleSummary): string {
  if (!s.now) return 'Every milestone is done'
  if (s.now.paused) return `${shortTitle(s.now.title)} is paused`   // (invented copy)
  return s.now.state === 'in_progress' ? `${shortTitle(s.now.title)} is under way` : `${shortTitle(s.now.title)} starts ${dayLabel(s.now.start)}`
}
/** Board 1's line: "3 of 7 milestones done. Handover is planned for Fri 13 Nov." — (the calm UI build 2026-10-27, 3-04 · W-030) milestones, the
    studio's Schedule's word ("2 of 7 milestones"). */
export const doneWords = (s: Pick<ScheduleSummary, 'done' | 'total'>) => `${s.done} of ${s.total} ${s.total === 1 ? 'milestone' : 'milestones'} done`
export function standsLine(s: ScheduleSummary): string {
  return [`${doneWords(s)}.`, s.handover !== null && s.done < s.total ? `Handover is planned for ${dayLabel(s.handover)}.` : ''].filter(Boolean).join(' ')
}
