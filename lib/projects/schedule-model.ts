/**
 * (Projects round 2 — the Schedule; Q-09 · Q-10 · Q-11 · Q-13 · Q-15 · Q-16, the Project Schedule Proposal as drawn) The schedule's words and
 * rules, pure and client-safe — the page, the server actions and the repair read the same functions, so a move previewed under the pointer is
 * the move the server makes.
 *
 * - **Calendar days** (Q-11): a date is a DAY NUMBER (days since 1 Jan 1970 of the local calendar date), so arithmetic never trips on a clock
 *   change; weekends are only shaded.
 * - **Moves with** (layer 2): a milestone may follow another; its start sits `gap` days after that one's last day (negative = they overlap).
 *   Move one and everything after it keeps its gap and its length — the move carries what follows. A Done milestone keeps the dates it
 *   happened on; the chain carries on from it.
 * - **The client sees a snapshot** (Q-15): `clientRows` is what a share stores; `scheduleChanges` is what Share changes lists.
 */

export const DAY_MS = 86_400_000

/* ── Days ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────── */

/** The local calendar date as a day number. */
export const dayOf = (d: Date): number => Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY_MS)
/** (B-55) A STORED day (a milestone's start / end / plan date, written as local midnight by `dateOfDay`) back to its day number, whatever the
    reading server's time zone: local midnight anywhere within ±12 h of UTC rounds to its own calendar day. A real moment (done at, answered at)
    stays `dayOf`. */
export const dayOfStored = (d: Date): number => Math.round(d.getTime() / DAY_MS)
/** A day number back to local midnight. */
export const dateOfDay = (n: number): Date => { const u = new Date(n * DAY_MS); return new Date(u.getUTCFullYear(), u.getUTCMonth(), u.getUTCDate()) }
/** 0 = Sunday … 6 = Saturday. */
export const weekdayOf = (n: number): number => new Date(n * DAY_MS).getUTCDay()
export const isWeekend = (n: number): boolean => { const w = weekdayOf(n); return w === 0 || w === 6 }
/** The Monday on or before the day. */
export const mondayOf = (n: number): number => n - ((weekdayOf(n) + 6) % 7)
/** The next weekday after the day (a Friday's is the Monday). */
export const nextWeekday = (n: number): number => { let d = n + 1; while (isWeekend(d)) d++; return d }
/** 'yyyy-mm-dd' — how a snapshot stores a day. */
export const isoOfDay = (n: number): string => new Date(n * DAY_MS).toISOString().slice(0, 10)
export const dayOfIso = (s: string): number | null => (/^\d{4}-\d{2}-\d{2}$/.test(s) ? Math.round(Date.parse(`${s}T00:00:00Z`) / DAY_MS) : null)

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const parts = (n: number) => { const u = new Date(n * DAY_MS); return { d: u.getUTCDate(), m: u.getUTCMonth(), y: u.getUTCFullYear(), w: u.getUTCDay() } }
/** The canvas's day: "Fri 13 Nov". */
export const dayLabel = (n: number): string => { const p = parts(n); return `${WD[p.w]} ${p.d} ${MON[p.m]}` }
/** "13 Nov". */
export const dayMonth = (n: number): string => { const p = parts(n); return `${p.d} ${MON[p.m]}` }
/** "Mon 26 Oct 2026" — a date field's value in the panel. */
export const dayLabelYear = (n: number): string => `${dayLabel(n)} ${parts(n).y}`
/** The canvas's range: "21 – 28 Aug", "31 Aug – 18 Sep", "28 Dec 2026 – 4 Jan 2027". */
export function rangeLabel(a: number, b: number): string {
  const p = parts(a), q = parts(b)
  if (a === b) return `${p.d} ${MON[p.m]}`
  if (p.y !== q.y) return `${p.d} ${MON[p.m]} ${p.y} – ${q.d} ${MON[q.m]} ${q.y}`
  if (p.m === q.m) return `${p.d} – ${q.d} ${MON[q.m]}`
  return `${p.d} ${MON[p.m]} – ${q.d} ${MON[q.m]}`
}
/** "10 days", "1 day". */
export const daysWord = (n: number): string => `${n} ${Math.abs(n) === 1 ? 'day' : 'days'}`
/** A shift in the canvas's words: 7 → "1 week", 14 → "2 weeks", 3 → "3 days". */
export const spanWord = (n: number): string => { const a = Math.abs(n); return a >= 7 && a % 7 === 0 ? `${a / 7} ${a === 7 ? 'week' : 'weeks'}` : daysWord(a) }
/** The summary's: 7 → "one week", 14 → "two weeks". */
const NUM = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']
const spanWords = (n: number): string => { const a = Math.abs(n); if (a >= 7 && a % 7 === 0 && a / 7 <= 10) return `${NUM[a / 7]} ${a === 7 ? 'week' : 'weeks'}`; return a <= 10 ? `${NUM[a]} ${a === 1 ? 'day' : 'days'}` : daysWord(a) }

/* ── A milestone ────────────────────────────────────────────────────────────────────────────────────────────────────────────── */

export const MILESTONE_STATUSES = ['not_started', 'in_progress', 'blocked', 'done'] as const
export type MilestoneStatus = (typeof MILESTONE_STATUSES)[number]
export const STATUS_LABEL: Record<MilestoneStatus, string> = { not_started: 'Not started', in_progress: 'In progress', blocked: 'Blocked', done: 'Done' }
export const isMilestoneStatus = (v: unknown): v is MilestoneStatus => typeof v === 'string' && (MILESTONE_STATUSES as readonly string[]).includes(v)

export const WAITING_ON = ['client', 'member', 'supplier'] as const
export type WaitingOn = (typeof WAITING_ON)[number]
export type Waiting = { on: WaitingOn; memberId: string | null; name: string | null; note: string | null; since: number | null; until: number | null }
export type Confirm = { askedAt: number | null; answer: 'confirmed' | 'changes' | null; note: string | null; answeredAt: number | null }

export type Milestone = {
  id: string
  title: string
  position: number
  /** Day numbers, both inclusive. */
  start: number
  end: number
  status: MilestoneStatus
  /** What it moves with, and its start's distance from that one's last day. */
  followsId: string | null
  gap: number
  /** (Q-13) A payment stage: a quote_payments id, or `split:<n>`. */
  paymentRef: string | null
  paymentDue: 'start' | 'end'
  clientVisible: boolean
  confirm: Confirm
  waiting: Waiting | null
  /** The dates the client was first shown (layer 7, plan against actual). */
  plan: { start: number; end: number } | null
  doneAt: number | null
  /** Its tasks (layer 3, work inside). */
  tasks: { total: number; done: number }
  /** (gaps build, package C — 6) The further milestones it waits on, beside `followsId` — each with its own gap after that one's last day. */
  after?: { id: string; gap: number }[]
  /** (gaps build, package C — 12) Its own words, and an optional colour for its bar (`MILESTONE_COLORS`' key). */
  description?: string | null
  color?: string | null
  /** (gaps build, package C — 10) The day it really started (the Started prompt logs it), a day number. */
  startedAt?: number | null
  /** (gaps build, package C — 9) The studio's answer to the client's "not right": what was changed, and the day. */
  resolved?: { note: string; at: number } | null
  /** (gaps build, package C — 8) A Designer's or a Manager's Done, waiting for an Owner or an Admin: who, and the day. */
  doneAsked?: { by: string | null; at: number } | null
  /** (gaps build, package C) What the client reads about a pause on a Blocked stage — optional; package D's portal reads it. */
  clientNote?: string | null
  /** (parity map, CP-064) A Blocked stage's expected restart, a day number — optional; the client reads "Resuming around …". */
  resumeOn?: number | null
}

export const TITLE_MAX = 80
export const length = (m: Pick<Milestone, 'start' | 'end'>) => m.end - m.start + 1

/** (B-38) The seeded stages' short names (lib/projects/schedule-phases.ts `PHASES`) — the canvas's "Carpentry moved 1 week later". A name the
    studio typed is never cut: "Site protection" stays "Site protection". */
const STAGE_SHORT: Record<string, string> = {
  'hacking & demolition': 'Hacking', 'masonry & tiling': 'Masonry', 'electrical & plumbing': 'Electrical', 'carpentry fabrication': 'Carpentry',
  installation: 'Installation', painting: 'Painting', 'cleaning & touch-up': 'Cleaning', 'handover & defect check': 'Handover',
}
/** The name a sentence starts with: "Carpentry fabrication" → "Carpentry"; any other name in full. */
export function shortTitle(t: string): string {
  return STAGE_SHORT[t.trim().toLowerCase()] ?? t.trim()
}
/** The name inside a sentence: a seeded stage's short name in lower case ("painting, cleaning and handover"), any other name as typed. */
export function midTitle(t: string): string {
  const s = STAGE_SHORT[t.trim().toLowerCase()]
  return s ? s.toLowerCase() : t.trim()
}
const lower = (t: string) => t.replace(/^./, (c) => c.toLowerCase())
/** (B-39) The milestone that ends last is the handover (`handoverOf`); the words call it that only when its name says so — else "the finish". */
export const namedHandover = (m: Pick<Milestone, 'title'> | null | undefined): boolean => !!m && /hand\s*-?over/i.test(m.title)
/** "Painting, cleaning and handover". */
export const listWords = (xs: string[]): string => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`)
export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

/* ── Moves with ─────────────────────────────────────────────────────────────────────────────────────────────────────────────── */

/** (gaps build, package C — 6) Everything a milestone waits on: the one it moves with first (`followsId`, its `gap`), then each further link. */
export function predsOf(m: Pick<Milestone, 'followsId' | 'gap' | 'after'>): { id: string; gap: number }[] {
  const out = m.followsId ? [{ id: m.followsId, gap: m.gap }] : []
  for (const a of m.after ?? []) if (a.id !== m.followsId && !out.some((o) => o.id === a.id)) out.push({ id: a.id, gap: a.gap })
  return out
}
type Linked = Pick<Milestone, 'id' | 'followsId'> & { after?: { id: string; gap: number }[] }
const predIds = (m: Linked) => [...(m.followsId ? [m.followsId] : []), ...(m.after ?? []).map((a) => a.id)]

/** Would `id` waiting on `followsId` make it wait on itself — through any of the milestones it waits on (6: every link, not only the first)? */
export function wouldCycle(list: Linked[], id: string, followsId: string | null): boolean {
  if (!followsId) return false
  const by = new Map(list.map((m) => [m.id, m]))
  const seen = new Set<string>()
  const stack = [followsId]
  while (stack.length) {
    const cur = stack.pop()!
    if (cur === id) return true
    if (seen.has(cur)) continue
    seen.add(cur)
    const m = by.get(cur)
    if (m) stack.push(...predIds(m))
  }
  return false
}

/** Everything that moves with `id`, in the order a move reaches it — (6) through every link: a milestone comes after every one it waits on
    that the move reaches (a topological order), so one waiting on two moved milestones is placed once, after both. */
export function followersOf(list: Linked[], id: string): string[] {
  const reach = new Set<string>()
  const queue = [id]
  while (queue.length) {
    const cur = queue.shift()!
    for (const m of list) if (!reach.has(m.id) && m.id !== id && predIds(m).includes(cur)) { reach.add(m.id); queue.push(m.id) }
  }
  /* order the reached ones so each comes after every reached one it waits on */
  const out: string[] = []
  const placed = new Set<string>([id])
  const left = list.filter((m) => reach.has(m.id))
  for (let guard = 0; left.length && guard <= list.length + 1; guard++) {
    for (let i = 0; i < left.length; i++) {
      const m = left[i]!
      if (predIds(m).every((p) => !reach.has(p) || placed.has(p))) { out.push(m.id); placed.add(m.id); left.splice(i, 1); i-- }
    }
  }
  return [...out, ...left.map((m) => m.id)]   // a loop the data should never hold still lists its milestones once
}

/**
 * New dates for one milestone, and the move carried to what follows it: the moved one's own gaps are re-read against what it waits on; every
 * follower keeps its gaps and its length and starts once EVERY milestone it waits on allows it (the latest of their ends plus each gap — 6); a
 * Done follower keeps the dates it happened on (its gaps are re-read) and the chain carries on from it.
 * Returns the list as it will be and the followers that moved.
 */
export function moveWith<M extends Milestone>(list: M[], id: string, start: number, end: number): { list: M[]; followed: string[] } {
  const by = new Map(list.map((m) => [m.id, { ...m, after: m.after?.map((a) => ({ ...a })) }]))
  const me = by.get(id)
  if (!me) return { list, followed: [] }
  me.start = start
  me.end = Math.max(start, end)
  const lead = me.followsId ? by.get(me.followsId) : undefined
  if (lead) me.gap = me.start - lead.end
  for (const a of me.after ?? []) { const p = by.get(a.id); if (p) a.gap = me.start - p.end }
  const followed: string[] = []
  for (const fid of followersOf(list, id)) {
    const f = by.get(fid)!
    const preds = predsOf(f).map((p) => ({ ...p, m: by.get(p.id) })).filter((p): p is { id: string; gap: number; m: NonNullable<typeof p.m> } => !!p.m)
    if (!preds.length) continue
    if (f.status === 'done') {
      /* it happened on its own dates: its gaps are read again */
      const prev = f.followsId ? by.get(f.followsId) : undefined
      if (prev) f.gap = f.start - prev.end
      for (const a of f.after ?? []) { const p = by.get(a.id); if (p) a.gap = f.start - p.end }
      continue
    }
    const ns = Math.max(...preds.map((p) => p.m.end + p.gap))
    if (ns !== f.start) { const len = f.end - f.start; f.start = ns; f.end = ns + len; followed.push(f.id) }
  }
  return { list: list.map((m) => by.get(m.id)! as M), followed }
}

/** (gaps build, package C — 6) Every link the timeline draws: from the milestone waited on to the one waiting. A link is broken when the one
    waiting starts before the link allows (a done milestone kept the dates it happened on while the one it waits on moved later). */
export type LinkLine = { from: string; to: string; gap: number; broken: boolean; first: boolean }
export function linkLines(list: Milestone[]): LinkLine[] {
  const by = new Map(list.map((m) => [m.id, m]))
  return list.flatMap((m) => predsOf(m).flatMap((p) => {
    const a = by.get(p.id)
    return a ? [{ from: a.id, to: m.id, gap: p.gap, broken: m.start < a.end + p.gap, first: p.id === m.followsId }] : []
  }))
}

/** The one-sentence answer to a move (the canvas's snackbar): "Carpentry moved 1 week later. 3 milestones followed." */
export function moveSentence(title: string, from: { start: number; end: number }, to: { start: number; end: number }, followed: number): string {
  const t = shortTitle(title)
  const ds = to.start - from.start, de = to.end - from.end
  const head = ds === de
    ? `${t} moved ${spanWord(ds)} ${ds > 0 ? 'later' : 'earlier'}.`
    : ds === 0
      ? `${t} now ends ${dayLabel(to.end)}, ${spanWord(de)} ${de > 0 ? 'later' : 'earlier'}.`
      : de === 0
        ? `${t} now starts ${dayLabel(to.start)}, ${spanWord(ds)} ${ds > 0 ? 'later' : 'earlier'}.`
        : `${t} now runs ${rangeLabel(to.start, to.end)}.`
  return followed ? `${head} ${plural(followed, 'milestone')} followed.` : head
}

/* ── What a schedule says about itself ──────────────────────────────────────────────────────────────────────────────────────── */

export const isLate = (m: Pick<Milestone, 'status' | 'end'>, today: number) => m.status !== 'done' && m.end < today
export const lateBy = (m: Pick<Milestone, 'end'>, today: number) => today - m.end
const byPos = <M extends Pick<Milestone, 'position'>>(a: M, b: M) => a.position - b.position

/** The handover: the milestone that ends last (on a tie, the lower one in the list). */
export function handoverOf<M extends Pick<Milestone, 'end' | 'position'>>(list: M[]): M | null {
  return list.reduce<M | null>((h, m) => (!h || m.end > h.end || (m.end === h.end && m.position > h.position) ? m : h), null)
}

/** (Layer 8, "What decides handover") The milestone the handover date hangs on today: the earliest unfinished one on the chain the handover
    moves with. Null when there is no chain to speak of (a handover that follows nothing and is itself done). */
export function deciderOf(list: Milestone[]): Milestone | null {
  const h = handoverOf(list)
  if (!h) return null
  const by = new Map(list.map((m) => [m.id, m]))
  const chain: Milestone[] = []
  /* (gaps build, package C — 6) with several, the chain runs back through the one that holds it latest (its end plus the gap) */
  const binding = (m: Milestone): Milestone | undefined => predsOf(m).map((p) => ({ m: by.get(p.id), at: (by.get(p.id)?.end ?? -Infinity) + p.gap })).filter((x) => !!x.m).sort((a, b) => b.at - a.at)[0]?.m
  for (let cur: Milestone | undefined = h, i = 0; cur && i <= list.length; cur = binding(cur), i++) chain.unshift(cur)
  return chain.find((m) => m.status !== 'done') ?? null
}

/** (Q-06 · the listing's Progress) Done, of how many. (B-59) The bar fills with the done ones only, so it says what its "3 of 7 done" says —
    1.0's half for a running milestone drew 50% beside "3 of 7". */
export function progressOf(list: Pick<Milestone, 'status'>[]): { done: number; total: number; pct: number } {
  const total = list.length
  const done = list.filter((m) => m.status === 'done').length
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 }
}

/** The milestones that come next: what is running, then what starts soonest — unfinished ones only, by their end. */
export function nextOpen<M extends Milestone>(list: M[], n = 2): M[] {
  return list.filter((m) => m.status !== 'done').sort((a, b) => a.end - b.end || a.start - b.start || a.position - b.position).slice(0, n)
}

/** (Projects round 4b, Depth.dc.html layer 6 "The client") What the client has of a milestone: shared as done in the newest share (the
    day it was shared), so they can confirm it — the row's line then speaks of their answer. */
export type ClientLayer = { first: string; sharedDay: number }
/** Layer 6's line: "Shared 2 Oct · Benjamin confirmed it 3 Oct" · "Benjamin says something is not right" · "Shared 2 Oct · waiting for Benjamin
    to confirm" — or null when the client has nothing to answer on it. */
export function clientLayerLine(m: Pick<Milestone, 'status' | 'confirm' | 'resolved'>, c: ClientLayer | null | undefined): { text: string; alert: boolean } | null {
  if (!c || m.status !== 'done' || m.confirm.askedAt === null) return null
  if (m.confirm.answer === 'confirmed') return { text: `Shared ${dayMonth(c.sharedDay)} · ${c.first} confirmed it${m.confirm.answeredAt !== null ? ` ${dayMonth(m.confirm.answeredAt)}` : ''}`, alert: false }
  /* (gaps build, package C — 9) answered: the studio said what it changed, and the line says so instead of the alarm */
  if (m.confirm.answer === 'changes' && isResolved(m)) return { text: `${c.first} said something was not right · resolved ${dayMonth(m.resolved!.at)}`, alert: false }
  if (m.confirm.answer === 'changes') return { text: `${c.first} says something is not right${m.confirm.note ? ` · “${m.confirm.note}”` : ''}`, alert: true }
  return { text: `Shared ${dayMonth(c.sharedDay)} · waiting for ${c.first} to confirm`, alert: false }
}

/** A row's grey line, as the canvas words it. `was` = the dates the client last saw, when they differ; `client` = layer 6 (round 4b).
    (B-04 · B-06 · B-22) The line carries every state the row has, in one order — its status word (Blocked), who it waits on, then its date
    clause — so status is never colour alone: "Blocked · waiting on the plumber for the sign-off · was due Fri 18 Sep, 18 days late". An
    unfinished milestone past its end "was due" (it never "ended"); a not-started one past its start "should have started" (`warn`, amber). */
export function rowLine(m: Milestone, today: number, o: { was?: { start: number; end: number } | null; waitingWho?: string | null; client?: ClientLayer | null; /** (gaps build, package C — 5) the last day more time is asked for */ moreTo?: number | null
  /** (S45B · H-UHD-2) who works on it — "Woodcraft Carpentry on site" — or its gap, "No Electrical contractor yet" (`warn`); said last, a name kept as written */
  crew?: { text: string; warn: boolean } | null } = {}): { text: string; alert: boolean; warn?: boolean } {
  const layer = clientLayerLine(m, o.client)
  if (layer) return layer
  if (m.status === 'done') return { text: `Done · ${rangeLabel(m.start, m.end)}${m.confirm.answer === 'confirmed' ? ' · confirmed' : ''}`, alert: false }
  const late = isLate(m, today)
  const was = o.was
  const parts: string[] = []
  /* (gaps build, package C — 8 · 5) what waits on an Owner or an Admin comes first: a Done to approve, more time asked */
  if (m.doneAsked) parts.push('Done — waiting for approval')
  if (o.moreTo != null) parts.push(`More time asked, to ${dayLabel(o.moreTo)}`)
  if (m.status === 'blocked') parts.push('Blocked')
  if (m.waiting && o.waitingWho) {
    const days = !late && m.waiting.since !== null ? Math.max(0, today - m.waiting.since) : null
    parts.push(`Waiting on ${o.waitingWho}${m.waiting.note ? ` for ${lower(m.waiting.note)}` : ''}${days !== null ? ` · ${daysWord(days)}` : ''}`)
  }
  let warn = false
  if (late) parts.push(`Was due ${dayLabel(m.end)}, ${plural(lateBy(m, today), 'day')} late`)
  else if (m.status === 'in_progress' || m.status === 'blocked') {
    parts.push(`Ends ${dayLabel(m.end)}${was && was.end !== m.end ? ` · was ${dayLabel(was.end)}` : ''}`)
    if (m.tasks.total) parts.push(`${m.tasks.done} of ${plural(m.tasks.total, 'task')} done`)
  } else if (m.start < today) { parts.push(`Should have started ${dayLabel(m.start)}`); warn = true }
  else parts.push(was && was.start !== m.start ? `Starts ${dayLabel(m.start)} · was ${dayLabel(was.start)}` : `Starts ${dayLabel(m.start)} · ${daysWord(length(m))}`)
  const text = parts.map((p, i) => (i ? lower(p) : p)).join(' · ')
  if (o.crew) { if (o.crew.warn) warn = true; return { text: `${text} · ${o.crew.text}`, alert: late, ...(warn ? { warn } : {}) } }   // (S45B)
  return { text, alert: late, ...(warn ? { warn } : {}) }
}

/* ── The client's copy (Q-15) ───────────────────────────────────────────────────────────────────────────────────────────────── */

/** What the client reads for a status: Blocked is the studio's word — the client sees the work as under way.
    (REG-1051) One word per state: the portal's ("Under way"), so the studio's preview of the client's page and the portal's own change lines
    ("Now under way") say what the portal's rows say. */
export type ClientState = 'done' | 'in_progress' | 'coming_up'
export const CLIENT_STATE_LABEL: Record<ClientState, string> = { done: 'Done', in_progress: 'Under way', coming_up: 'Coming up' }
/** (REG-1051) A stage the client is asked about, in the portal's words (board 2) — the portal's rows and the studio's preview of them. */
export const CLIENT_CONFIRM_LABEL = { asked: 'Please confirm', confirmed: 'Confirmed', changes: 'With your designer' } as const
/** The word at a client row's right, and its tone (the portal's `.state[data-tone]` / `.dot[data-tone]`). */
/* an ask waits on the client only once the stage is done — the portal's rule (`waitsForClient`) */
const clientConfirm = (r: Pick<ClientRow, 'state' | 'confirm'>) => (r.confirm === 'asked' && r.state !== 'done' ? null : r.confirm)
export const clientRowLabel = (r: Pick<ClientRow, 'state' | 'confirm'>): string => { const c = clientConfirm(r); return c ? CLIENT_CONFIRM_LABEL[c] : CLIENT_STATE_LABEL[r.state] }
export const clientRowTone = (r: Pick<ClientRow, 'state' | 'confirm'>): 'ask' | 'changes' | 'done' | 'now' | 'next' => {
  const c = clientConfirm(r)
  return c === 'asked' ? 'ask' : c === 'changes' ? 'changes' : r.state === 'done' ? 'done' : r.state === 'in_progress' ? 'now' : 'next'
}
const clientStateOf = (s: MilestoneStatus): ClientState => (s === 'done' ? 'done' : s === 'not_started' ? 'coming_up' : 'in_progress')

/** One row as the portal draws it — only what the client is shown: the name, the dates, whether it is done, and a confirmation asked.
    (parity map, CP-064) `resume`: a paused (Blocked) stage's expected restart ('yyyy-mm-dd'), carried for the portal — never a change to share. */
export type ClientRow = { id: string; title: string; start: string; end: string; state: ClientState; confirm: 'asked' | 'confirmed' | 'changes' | null; resume?: string | null }
/** A share's stored copy — the portal (round 4b) reads the newest one, never the live rows. */
export type ScheduleSnapshot = { v: 1; rows: ClientRow[]; handover: string | null }

export function clientRows(list: Milestone[]): ClientRow[] {
  return list.filter((m) => m.clientVisible).sort(byPos).map((m) => ({
    id: m.id, title: m.title, start: isoOfDay(m.start), end: isoOfDay(m.end), state: clientStateOf(m.status),
    confirm: m.confirm.answer ?? (m.confirm.askedAt !== null ? 'asked' : null),
    ...(m.status === 'blocked' && m.resumeOn != null ? { resume: isoOfDay(m.resumeOn) } : {}),   // (parity map, CP-064)
  }))
}
export function snapshotOf(list: Milestone[]): ScheduleSnapshot {
  const rows = clientRows(list)
  const h = handoverOf(list.filter((m) => m.clientVisible))
  return { v: 1, rows, handover: h ? isoOfDay(h.end) : null }
}
export function parseSnapshot(v: unknown): ScheduleSnapshot | null {
  const raw = typeof v === 'string' ? (() => { try { return JSON.parse(v) as unknown } catch { return null } })() : v
  if (!raw || typeof raw !== 'object') return null
  const r = raw as { rows?: unknown; handover?: unknown }
  if (!Array.isArray(r.rows)) return null
  const rows = r.rows.flatMap((x): ClientRow[] => {
    const o = (x ?? {}) as Partial<ClientRow>
    if (typeof o.id !== 'string' || typeof o.title !== 'string' || typeof o.start !== 'string' || typeof o.end !== 'string') return []
    const state: ClientState = o.state === 'done' || o.state === 'in_progress' ? o.state : 'coming_up'
    const confirm = o.confirm === 'asked' || o.confirm === 'confirmed' || o.confirm === 'changes' ? o.confirm : null
    const resume = typeof o.resume === 'string' && dayOfIso(o.resume) !== null ? o.resume : null   // (parity map, CP-064)
    return [{ id: o.id, title: o.title, start: o.start, end: o.end, state, confirm, ...(resume ? { resume } : {}) }]
  })
  return { v: 1, rows, handover: typeof r.handover === 'string' ? r.handover : null }
}

/** One milestone that reads differently for the client than it did at the last share. */
export type ScheduleChange = { id: string; title: string; was: ClientRow | null; now: ClientRow | null }
export function scheduleChanges(live: ClientRow[], snap: ScheduleSnapshot | null): ScheduleChange[] {
  const was = new Map((snap?.rows ?? []).map((r) => [r.id, r]))
  const out: ScheduleChange[] = []
  for (const r of live) {
    const w = was.get(r.id) ?? null
    if (!w || w.title !== r.title || w.start !== r.start || w.end !== r.end || w.state !== r.state) out.push({ id: r.id, title: r.title, was: w, now: r })
    was.delete(r.id)
  }
  for (const w of was.values()) out.push({ id: w.id, title: w.title, was: w, now: null })
  return out
}
/** A change as Share changes lists it: what it was (struck through) and what it is, or a sentence. */
export function changeWords(c: ScheduleChange, handoverId: string | null): { was?: string; now: string } {
  if (!c.now) return { now: 'Taken off the schedule' }
  const ns = dayOfIso(c.now.start)!, ne = dayOfIso(c.now.end)!
  if (!c.was) return { now: `New · ${rangeLabel(ns, ne)}` }
  const ws = dayOfIso(c.was.start)!, we = dayOfIso(c.was.end)!
  /* (B-19) every difference the client will read, joined — the dates (struck, then new), a new name, a new state */
  let head: { was?: string; now: string } | null = null
  if (ws !== ns || we !== ne) {
    head = c.id === handoverId && we !== ne ? { was: dayLabel(we), now: dayLabel(ne) }
      : ws === ns ? { was: `Ends ${dayLabel(we)}`, now: dayLabel(ne) }
        : we === ne ? { was: `Starts ${dayLabel(ws)}`, now: dayLabel(ns) }
          : { was: rangeLabel(ws, we), now: rangeLabel(ns, ne) }
  }
  const renamed = c.was.title !== c.now.title
  if (!head && renamed) head = { was: c.was.title, now: c.now.title }
  const more = [
    head && renamed && head.was !== c.was.title ? `Renamed from “${c.was.title}”` : '',
    c.was.state !== c.now.state ? `Now ${lower(CLIENT_STATE_LABEL[c.now.state])}` : '',
  ].filter(Boolean)
  if (!head) return { now: more.join(' · ') || c.now.title }
  return { ...(head.was ? { was: head.was } : {}), now: [head.now, ...more].join(' · ') }
}

/* ── The summary card (Where the job stands) ────────────────────────────────────────────────────────────────────────────────── */

export function summaryOf(list: Milestone[], snap: ScheduleSnapshot | null, today: number, o: { waitingWho?: (m: Milestone) => string | null } = {}): { headline: string; line: string } {
  const live = [...list].sort(byPos)
  const h = handoverOf(live)
  if (!h) return { headline: 'No milestones yet.', line: '' }
  /* (B-39) "handover" only when the last milestone is named so; else the schedule's finish */
  const named = namedHandover(h)
  if (live.every((m) => m.status === 'done')) return { headline: named ? `Handed over on ${dayLabel(h.end)}.` : `Finished on ${dayLabel(h.end)}.`, line: `Every milestone is done.` }
  /* the handover moved since the client last saw it — what moved, and what moved with it */
  const sharedH = snap?.handover ? dayOfIso(snap.handover) : null
  if (sharedH !== null && sharedH !== h.end) {
    const d = h.end - sharedH
    const changed = scheduleChanges(clientRows(live), snap).filter((c) => c.now && c.was)
    const first = changed[0] ? live.find((m) => m.id === changed[0]!.id) : undefined
    let line = ''
    if (first) {
      const after = new Set(followersOf(live, first.id))
      const rest = changed.slice(1).filter((c) => after.has(c.id)).map((c) => midTitle(c.title))
      const firstWas = changed[0]!.was!
      line = `${shortTitle(first.title)} now ${dayOfIso(firstWas.end) !== first.end ? `ends ${dayLabel(first.end)}` : `starts ${dayLabel(first.start)}`}.${rest.length ? ` ${listWords(rest).replace(/^./, (c) => c.toUpperCase())} moved with it.` : ''}`
    }
    const span = `${spanWords(d)} ${d > 0 ? 'later' : 'earlier'}`
    return { headline: named ? `Handover moves to ${dayLabel(h.end)}, ${span}.` : `The schedule now ends ${dayLabel(h.end)}, ${span}.`, line }
  }
  const late = live.filter((m) => isLate(m, today))
  /* (B-05) a blocked milestone is not under way: it has its own clause, with what it waits on */
  const running = live.filter((m) => m.status === 'in_progress')
  const blocked = live.filter((m) => m.status === 'blocked')
  /* (B-06) a milestone that should have started and has not says so before what comes next */
  const overdue = live.filter((m) => m.status === 'not_started' && m.start < today && m.end >= today).sort((a, b) => a.start - b.start)[0]
  const coming = live.filter((m) => m.status === 'not_started' && m.start >= today).sort((a, b) => a.start - b.start)[0]
  const line = [
    ...blocked.map((m) => {
      const who = m.waiting ? o.waitingWho?.(m) : null
      return `${shortTitle(m.title)} is blocked${who ? ` — waiting on ${who}${m.waiting!.note ? ` for ${lower(m.waiting!.note)}` : ''}` : ''}.`
    }),
    running.length ? `${listWords(running.map((m, i) => (i ? midTitle(m.title) : shortTitle(m.title))))} ${running.length === 1 ? 'is' : 'are'} under way.` : '',
    overdue ? `${shortTitle(overdue.title)} should have started ${dayLabel(overdue.start)}.` : '',
    coming ? `${shortTitle(coming.title)} starts ${dayLabel(coming.start)}.` : '',
  ].filter(Boolean).join(' ')
  const set = named ? `Handover is set for ${dayLabel(h.end)}.` : `The schedule ends ${dayLabel(h.end)}.`
  if (late.length) return { headline: `${late.length === 1 ? `${shortTitle(late[0]!.title)} is ${plural(lateBy(late[0]!, today), 'day')} late` : `${late.length} milestones are late`}. ${set}`, line }
  return { headline: named ? `On track for handover on ${dayLabel(h.end)}.` : `On track to finish on ${dayLabel(h.end)}.`, line }
}

/* ── Payments (Q-13) ────────────────────────────────────────────────────────────────────────────────────────────────────────── */

/** A payment stage a milestone can be tied to: a row of the signed quote's Payment Schedule, or a share of a direct project's split. */
export type PaymentOption = { ref: string; name: string; pct: number
  /** (B-08) The stage's amount as Money prints it — its live invoice's amount, else its share of today's contract value (approved variation
      orders in): `moneySummaryOf`'s, never recomputed here. */
  amountMinor: number | null
  /** (B-23) Due on signing (the deposit): paid before the work, so a milestone is never tied to it. */
  onSigning?: boolean
  /** (B-20) Where the stage's invoice stands, as Money reads it (`invoiceState`), and its due day — null when no invoice is out. */
  invoice?: { state: string; dueDay: number | null } | null
  /** (S44O — UAT row 297) a fixed fee first (a quote's MI-021 or a split's fee first): it bills this amount, never a share */
  fixedMinor?: number | null
}
export const pctWord = (pct: number) => `${Number.isInteger(pct) ? pct : pct.toFixed(1)}%`
/** (S44O — UAT row 297, her UAT ask 2026-10-15) What a payment stage is worth in a line of words: its share — or, for a fixed fee first, its
    amount ("S$3,000"), never "0%". The Start sheet, the timeline's chip, the phone's row, the milestone's payment picker and the next payment. */
export const payShareWord = (p: { pct: number; fixedMinor?: number | null }) =>
  typeof p.fixedMinor === 'number' && p.fixedMinor > 0 ? `S$${Math.round(p.fixedMinor / 100).toLocaleString('en-SG')}` : pctWord(p.pct)
/** The day a tied payment falls due: the milestone's start or its last day. */
export const paymentDay = (m: Pick<Milestone, 'start' | 'end' | 'paymentDue'>) => (m.paymentDue === 'start' ? m.start : m.end)
const settled = (p: PaymentOption) => p.invoice?.state === 'paid' || p.invoice?.state === 'void'
const isOut = (p: PaymentOption) => !!p.invoice && ['sent', 'overdue', 'part_paid', 'to_confirm'].includes(p.invoice.state)
/** (B-20) The stage still to collect: the earliest tied stage not yet paid — an invoice that is out falls due on its own due day; one past
    that day is `overdue` (Money's word); a stage whose planned day has passed unpaid is `passed`. Null when every tied stage is paid. */
export function nextPayment(list: Milestone[], payments: PaymentOption[], today: number): { milestone: Milestone; payment: PaymentOption; day: number; overdue: boolean; passed: boolean } | null {
  const by = new Map(payments.map((p) => [p.ref, p]))
  const tied = list.flatMap((m) => {
    const p = m.paymentRef ? by.get(m.paymentRef) : undefined
    if (!p || settled(p)) return []
    const day = isOut(p) && p.invoice!.dueDay !== null ? p.invoice!.dueDay : paymentDay(m)
    /* a client's proof waiting for the studio is never late meanwhile (Money's rule, `invoiceState`) */
    return [{ milestone: m, payment: p, day, overdue: p.invoice?.state === 'overdue', passed: day < today && p.invoice?.state !== 'to_confirm' }]
  })
  return tied.sort((a, b) => a.day - b.day)[0] ?? null
}
/** (B-20) The Next payment figure in Money's words: "30% overdue since 2 Oct" · "30% · payment to confirm" · "30% part paid · due 9 Oct" ·
    "30% due 18 Sep" · "30% on 20 Nov". */
export function nextPaymentWords(n: { payment: PaymentOption; day: number; overdue: boolean; passed: boolean }): string {
  const pct = payShareWord(n.payment), state = n.payment.invoice?.state   // (S44O — row 297) a fixed fee says its amount
  if (n.overdue) return `${pct} overdue since ${dayMonth(n.day)}`
  if (state === 'to_confirm') return `${pct} · payment to confirm`
  if (state === 'part_paid') return `${pct} part paid · due ${dayMonth(n.day)}`
  return `${pct} ${state === 'sent' || n.passed ? 'due' : 'on'} ${dayMonth(n.day)}`
}
/** (B-29) Every tied stage paid — a finished job's Next payment reads "Paid in full". */
export const paidInFull = (list: Milestone[], payments: PaymentOption[]): boolean => {
  const tied = payments.filter((p) => list.some((m) => m.paymentRef === p.ref))
  return tied.length > 0 && tied.every((p) => p.invoice?.state === 'paid')
}

/** (B-53, Q-41) "Tell {client} on WhatsApp" after a share — the draft opened on the press, the portal's address in it. Never "OpenMaison":
    the portal wears the studio's name alone (`inviteMessage`'s rule). */
export function scheduleNewsMessage(o: { client: string; studio: string; url: string; handover: string | null; n: number; first: boolean }): string {
  return o.first
    ? `Hi ${o.client}, ${o.studio} has shared your renovation schedule${o.handover ? ` — handover is planned for ${o.handover}` : ''}. It’s on your page: ${o.url}`
    : `Hi ${o.client}, ${o.studio} has updated your renovation schedule (${plural(o.n, 'change')})${o.handover ? ` — handover is now ${o.handover}` : ''}. See what changed on your page: ${o.url}`
}

/* ── A save in words (B-02 · B-40) ──────────────────────────────────────────────────────────────────────────────────────────── */

/** One field a milestone panel's Save changed — kept on its Activity line. `from` / `to` are words (a stage's name, who it waits on). */
export type FieldChange = { key: string; label: string; from: string; to: string }
/** The field in the house voice, for the save's sentence and its Activity line: "showed it to Aisha", "tied Mid-Project to it". Older lines
    stored 'tied' / 'client' / 'member' for words; they still read. */
export function fieldWords(f: Pick<FieldChange, 'key' | 'from' | 'to' | 'label'>, client: string): string {
  const who = (w: string) => (w === 'client' ? client : w === 'member' ? 'a member' : w === 'supplier' ? 'a supplier' : w)
  switch (f.key) {
    case 'title': return `renamed it from “${f.from}”`
    case 'status': return `marked it ${f.to.toLowerCase()}`
    case 'follows': return f.to === 'nothing' ? 'set it to keep its own dates' : `set it to move with ${f.to}`
    case 'shown': return f.to === 'yes' ? `showed it to ${client}` : `hid it from ${client}`
    case 'waiting': return f.to === 'nobody' ? 'ended its wait' : `marked it waiting on ${who(f.to)}`
    case 'payment': return f.to === 'none' ? (f.from && f.from !== 'tied' ? `untied ${f.from} from it` : 'untied its payment') : f.to === 'tied' ? 'tied a payment to it' : `tied ${f.to} to it`
    case 'confirm': return f.to === 'asked' ? `asked ${client} to confirm it` : `stopped asking ${client} to confirm it`
    /* (gaps build, package C) */
    case 'after': return f.to === 'nothing' ? 'set it to wait on nothing more' : `set it to wait on ${f.to} too`
    case 'description': return 'changed its description'
    case 'color': return f.to === 'none' ? 'took its colour off' : `coloured its bar ${f.to.toLowerCase()}`
    case 'client_note': return f.to ? `wrote what ${client} reads about the pause` : `took off what ${client} reads about the pause`
    case 'done_asked': return 'asked an Owner or an Admin to approve it as done'
    /* (parity map, CP-064) (invented copy) */
    case 'resume': return f.to === 'no day' ? 'took off the day it resumes' : `set it to resume around ${f.to}`
    default: return `changed its ${f.label.toLowerCase()}`
  }
}
/** "Painting saved — you showed it to Aisha and tied Mid-Project to it." · with a move: "Painting moved 1 week later. You also marked it done." */
export function saveSentence(title: string, fields: Pick<FieldChange, 'key' | 'from' | 'to' | 'label'>[], client: string, move: string): string {
  const words = listWords(fields.map((f) => fieldWords(f, client)))
  if (move) return words ? `${move} You also ${words}.` : move
  return words ? `${shortTitle(title)} saved — you ${words}.` : `${shortTitle(title)} saved`
}

/* ── Facts other surfaces read (the listing, the Overview, attention, the bell) ─────────────────────────────────────────────── */

export type ScheduleFacts = {
  milestones: number
  progress: { done: number; total: number; pct: number }
  /** The next unfinished milestone by its end, with the day count the listing prints. */
  next: { id: string; title: string; start: number; end: number; status: MilestoneStatus; days: number; late: boolean } | null
  late: number
  /** The longest wait on someone, by who. */
  waiting: { who: string; days: number; onClient: boolean; title: string; note: string | null } | null
  /** Milestones the client would read differently than at the last share (0 when nothing was ever shared and the schedule is empty). */
  unshared: number
  /** Whether a share was ever made. */
  shared: boolean
  /** (Projects round 4b) Stages the client answered "Something is not right" on, still standing — who (their first name) and how many. */
  concerns?: { who: string; n: number } | null
  /** (gaps build, package C — 5 · 8) What waits on an Owner or an Admin: more time asked (milestone names), a Done to approve, a share. */
  asks?: { more: string[]; done: string[]; share: boolean } | null
}

/** "in 18 days", "today", "3 days late" — the listing's and the Overview's day count, to the milestone's last day. */
export function dueWords(days: number, late: boolean): string {
  if (late) return `${plural(days, 'day')} late`
  if (days === 0) return 'ends today'
  return `in ${plural(days, 'day')}`
}

/* ── Gaps build, package C (the owner's "build everything", 2026-10-07) ─────────────────────────────────────────────────────────── */

/** (12) The eight swatches a bar may wear — the studio's member tints (Company › Members, `MEMBER_TINTS`), so one palette paints people and
    work. Null = the bar takes its status's colour, as before. */
export const MILESTONE_COLORS: readonly { key: string; label: string; hex: string }[] = [
  { key: 'blue', label: 'Blue', hex: '#5B7FD7' }, { key: 'green', label: 'Green', hex: '#3E9B63' }, { key: 'amber', label: 'Amber', hex: '#E8A33D' },
  { key: 'brown', label: 'Brown', hex: '#B07B2E' }, { key: 'navy', label: 'Navy', hex: '#2F3B8F' }, { key: 'pink', label: 'Pink', hex: '#C2549A' },
  { key: 'teal', label: 'Teal', hex: '#2B8A8A' }, { key: 'purple', label: 'Purple', hex: '#8A5CD1' },
]
export const colorOf = (key: string | null | undefined) => (key ? MILESTONE_COLORS.find((c) => c.key === key) ?? null : null)
export const DESCRIPTION_MAX = 1000
export const RESOLVE_MAX = 500
export const CLIENT_NOTE_MAX = 160

/** (9) The client's "not right" has its answer: the studio marked it resolved on or after the day the client said it. */
export const isResolved = (m: Pick<Milestone, 'resolved' | 'confirm'>): boolean => !!m.resolved && (m.confirm.answeredAt === null || m.resolved.at >= m.confirm.answeredAt)

/** (7) What a share stores when only some changes go: the last snapshot with the ticked changes applied — a ticked milestone reads as it is
    now (or leaves, when it was taken off); an unticked one stays as the client last saw it (or stays away, when it is new). Rows keep the live
    order; one the client still sees but the studio took off keeps its old place. The handover is the latest last day the rows show. */
export function snapshotFor(list: Milestone[], last: ScheduleSnapshot | null, ticked: ReadonlySet<string> | null): ScheduleSnapshot {
  if (!last || !ticked) return snapshotOf(list)
  const live = clientRows(list)
  const was = new Map(last.rows.map((r) => [r.id, r]))
  const rows: ClientRow[] = []
  for (const r of live) {
    if (ticked.has(r.id)) rows.push(r)
    else { const w = was.get(r.id); if (w) rows.push(w) }
  }
  /* a row the client still has that is no longer live (taken off, or hidden): kept unless its leaving was ticked */
  last.rows.forEach((w, i) => {
    if (live.some((r) => r.id === w.id) || ticked.has(w.id)) return
    const before = last.rows.slice(0, i).reverse().find((x) => rows.some((r) => r.id === x.id))
    const at = before ? rows.findIndex((r) => r.id === before.id) + 1 : 0
    rows.splice(at, 0, w)
  })
  const ends = rows.map((r) => dayOfIso(r.end)).filter((n): n is number => n !== null)
  return { v: 1, rows, handover: ends.length ? isoOfDay(Math.max(...ends)) : null }
}

/** (5) An open ask for more time on a milestone. Days are day numbers; `at` is when it was asked (ms). */
export type ExtensionAsk = { id: string; milestoneId: string; fromEnd: number; toEnd: number; reason: string; by: string | null; byName: string; at: number }
/** "4 days later" — what an ask adds to the last day. */
export const extensionWords = (x: Pick<ExtensionAsk, 'fromEnd' | 'toEnd'>) => `${spanWord(x.toEnd - x.fromEnd)} ${x.toEnd >= x.fromEnd ? 'later' : 'earlier'}`
/** (8) An open ask to share schedule changes, from a Designer or a Manager. */
export type ShareAsk = { id: string; milestoneIds: string[]; note: string | null; by: string | null; byName: string; at: number }

/** (2) A rebuild's plan: the new list's drafts, each kept on a milestone of the same name (its id, dates, status and links stay) or new; the
    milestones no draft names go. Names match without case or extra spaces; each milestone answers one draft (the first of its name). */
export type RebuildPlan<D> = { rows: { draft: D; keep: string | null }[]; drop: string[] }
export const nameKey = (t: string) => t.trim().replace(/\s+/g, ' ').toLowerCase()
export function rebuildPlan<D extends { title: string }>(list: Pick<Milestone, 'id' | 'title' | 'position'>[], drafts: D[]): RebuildPlan<D> {
  const free = [...list].sort((a, b) => a.position - b.position)
  const rows = drafts.map((draft) => {
    const i = free.findIndex((m) => nameKey(m.title) === nameKey(draft.title))
    const keep = i >= 0 ? free.splice(i, 1)[0]!.id : null
    return { draft, keep }
  })
  return { rows, drop: free.map((m) => m.id) }
}

/** (10) "Started Mon 5 Oct, 2 days late" · "Started Mon 5 Oct" — the actual start beside the plan. */
export function startedWords(m: Pick<Milestone, 'startedAt' | 'start' | 'plan'>): string | null {
  if (m.startedAt == null) return null
  const planned = m.plan?.start ?? null
  const d = planned !== null ? m.startedAt - planned : 0
  return `Started ${dayLabel(m.startedAt)}${planned !== null && d ? `, ${plural(Math.abs(d), 'day')} ${d > 0 ? 'late' : 'early'}` : ''}`
}

/** (5 · 8) What waits on an Owner or an Admin in a schedule — the attention line and the band read it. */
export type ScheduleAsks = { more: string[]; done: string[]; share: boolean }
