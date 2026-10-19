/**
 * (pending modules S41b-4 — the S41b data sweep's M-02; 1.0's `deployment/plg` upgrade nudges: `docs/rules/upgrade-nudges.md`, the spec
 * 2026-09-25 and `src/lib/nudges/{catalogue,decide,copy}.ts`; her "build all of them" 2026-10-11, her "nothing left behind" 2026-10-12)
 * **The Free plan's upgrade offers** — pure and client-safe: the catalogue, the decision and the words, so the server, the bell and the probe
 * read one set of rules.
 *
 * 1.0 has 17 moments (T1…T17). In 2.0 each is one of three things:
 *  · **an offer with its own record** (`nudge_state`, 1.0's table) — the scheduled ones: T2 · T3 · T4 · T9 · T10 · T11 · T12 (proactive, once
 *    ever, one a day) and T7 · T8 (the credits' lifecycle); 2.0 shows each as ONE quiet row in the Owner's bell with its one way on and Not now
 *    — never a dialog over the work (1.0's modal), never on a client page, only at a safe moment (components/credits/upgrade-offers.tsx);
 *  · **already answered by a 2.0 moment** — T6 · T17 (a Pro feature: S19's lock card, See plans or Ask the Owner), T13 · T14 · T15 · T16 (out
 *    of AI credits: the out-of-credits sheet, Buy and carry on or Ask the Owner), T5 (dropped by 1.0 itself: X-Ray became Pro — its press is
 *    T6 / T17), and T8 when it happens on a press (the sheet says it, once) — never two prompts for one moment; the Owner's blocking moments
 *    still restart the 10-minute gap (1.0's D4), so an offer never follows a lock or a refusal;
 *  · **kept** — T1 (five active minutes): counting a member's active minutes is the telemetry her Q-16 declined (S39: "nothing in 2.0 records
 *    what a member opens"); `nudge_state.active_seconds` is ported and stays 0.
 *
 * 1.0's rules, as they are (`docs/rules/upgrade-nudges.md`): only on Free (no live paid plan or trial — R1), only to who can buy (the Owner, 1.0's
 * `settings.editStudio`, S19's `mayChangePlan` — R2), spent when shown (R3), one proactive offer a day (R4), a safe moment (R5), one at a time
 * (R6), ten minutes between any two (R7), lifecycle before proactive and 1.0's priority order (R8), events after the studio's start (R9).
 */
import { FEATURE_WORDS } from './features'
import { planRow, priceFor, sgd, TOPUP_CREDITS, topupPrice } from './plans'
import { aboutRenders, CREDIT_SCHEDULE } from './schedule'

/* ── the catalogue (1.0's `catalogue.ts`; every threshold and timing lives here and nowhere else) ─────────────────────────────────── */

/** 1.0's seventeen moments, in its numbering. */
export const NUDGE_TRIGGERS = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12', 'T13', 'T14', 'T15', 'T16', 'T17'] as const
export type NudgeTrigger = (typeof NUDGE_TRIGGERS)[number]
export const isNudgeTrigger = (v: unknown): v is NudgeTrigger => typeof v === 'string' && (NUDGE_TRIGGERS as readonly string[]).includes(v)

/** The offers 2.0 makes in the bell — 1.0's proactive set less T1 (kept, Q-16), and its two lifecycle moments. */
export const PROACTIVE = ['T2', 'T3', 'T4', 'T9', 'T10', 'T11', 'T12'] as const
export const LIFECYCLE = ['T7', 'T8'] as const
export type ProactiveTrigger = (typeof PROACTIVE)[number]
export type LifecycleTrigger = (typeof LIFECYCLE)[number]
export type OfferTrigger = ProactiveTrigger | LifecycleTrigger
export const isOfferTrigger = (v: unknown): v is OfferTrigger => typeof v === 'string' && ([...PROACTIVE, ...LIFECYCLE] as readonly string[]).includes(v)

/** The Owner's blocking moments that 2.0's own dialogs answer — each restarts the 10-minute gap (1.0's `BLOCKING_CLAIM_TRIGGERS`, plan D4):
    a Pro feature's lock card (T6), the out-of-credits sheet (T13 empty · T14 short) and, once, the welcome credits running out on a press (T8). */
export const BLOCKING_MOMENTS = ['T6', 'T8', 'T13', 'T14'] as const
export type BlockingMoment = (typeof BLOCKING_MOMENTS)[number]
export const isBlockingMoment = (v: unknown): v is BlockingMoment => typeof v === 'string' && (BLOCKING_MOMENTS as readonly string[]).includes(v)

/** R8 — the proactive offers, most important first (1.0's order, T1 out). */
export const PROACTIVE_PRIORITY: readonly ProactiveTrigger[] = ['T9', 'T2', 'T10', 'T11', 'T12', 'T4', 'T3']
/** R8 — T8 before T7; both before any proactive offer. */
export const LIFECYCLE_PRIORITY: readonly LifecycleTrigger[] = ['T8', 'T7']
/** R3 — offered once, ever (spent when shown). T6, T7 and T13–T17 repeat. */
export const ONCE_EVER: ReadonlySet<NudgeTrigger> = new Set<NudgeTrigger>(['T1', 'T2', 'T3', 'T4', 'T8', 'T9', 'T10', 'T11', 'T12'])

/** "More than 50" — 50 itself does not. */
export const T2_NET_SPEND = 50
/** The second render, not the first. */
export const T3_RENDERS = 2
/** Below 20 after a spend that started at 20 or more; re-arms once back at 20. */
export const T7_LOW_BALANCE = 20

/** R7 — between any two offers or blocking moments. */
export const MIN_GAP_MS = 10 * 60_000
/** R4 — one proactive offer per rolling 24 hours. */
export const DAILY_CAP_MS = 24 * 60 * 60_000
/** R5 — the page has been quiet this long (nothing open, nothing in flight, nothing being typed) before the studio looks for an offer. */
export const RESULT_QUIET_MS = 10_000
/** How often a quiet page looks again (1.0's heartbeat was every 60 active seconds). */
export const CHECK_EVERY_MS = 60_000
/** R5 — a press held this long with no pointer movement counts as lost (1.0's `POINTER_HELD_STALE_MS`). */
export const POINTER_HELD_STALE_MS = 30_000
/** D3 — the watermark is saved this far back, so an event at the edge is seen at the next look rather than lost. */
export const WATERMARK_OVERLAP_MS = 5_000
/** R5 — never over the purchase flow's own pages (1.0's `/upgrade`, `/billing`, `/settings/usage`, `/company/plan` — 2.0's is the last). */
export const PURCHASE_PATHS = ['/company/plan'] as const
export const onPurchasePage = (path: string): boolean => PURCHASE_PATHS.some((p) => path === p || path.startsWith(`${p}/`) || path.startsWith(`${p}?`))

/* ── the tools a success counts in (1.0: a spend with no refund, by its action key) ──────────────────────────────────────────────── */

export type NudgeTool = 'visualizer' | 'reader' | 'copilot'
/** 2.0's names for 1.0's AI Visualizer · Quote Digitizer · Meeting Copilot. */
export const TOOL_WORDS: Record<NudgeTool, string> = { visualizer: 'the AI Visualizer', reader: 'reading quotes', copilot: 'the Meeting Copilot' }
/** `render_repair` is the automatic repair of a render already kept — never a new success (1.0's D17). */
export function toolFor(actionKey: string): NudgeTool | null {
  if (actionKey === 'render_repair') return null
  if (actionKey.startsWith('render_')) return 'visualizer'
  if (actionKey === 'quote_digitize') return 'reader'
  if (actionKey === 'copilot_block') return 'copilot'
  return null
}

/* ── the decision (1.0's `decide.ts`, pure) ──────────────────────────────────────────────────────────────────────────────────────── */

/** What the decision reads — "since" = after this member's last look (the watermark), conditions from the studio's start (R9). */
export type NudgeFacts = {
  now: number
  /** T2 — anyone in the studio spent since; the studio's net spend since its start (spends less their refunds). */
  studioSpendSince: boolean
  studioNetSpend: number
  /** The studio's AI credits now (this month's and top-ups). */
  balance: number
  /** T3 — the member's own render since; their renders kept since the start. */
  ownRenderSince: boolean
  ownRenders: number
  /** T4 — a quote the member had read since (a read that found no line is given back, so it never counts). */
  ownReadSince: boolean
  /** T9 — someone who uses the AI tools joined since (an invitation accepted); the members who do. */
  memberJoinedSince: boolean
  activeMembers: number
  /** T10 / T11 — tools with an own success since (newest first), and each tool's distinct days with one. */
  ownToolsSince: NudgeTool[]
  ownToolDays: Partial<Record<NudgeTool, number>>
  /** T12 — the first look of a new day, and the member did something on two earlier days. */
  newLocalDay: boolean
  activeDaysAtLeast3: boolean
  /** T7 — a spend took the studio from 20 or more to under 20 after "Only n left" last showed. */
  lowBalanceCrossing: boolean
  /** T8 — the welcome AI credits are used up (never bought into: the top-ups' bucket is the welcome's, B-08). */
  welcomeEnded: boolean
}

/** What the decision reads of the member's record. */
export type NudgeStateView = { spent: Partial<Record<NudgeTrigger, number>>; lastModalAt: number | null; lastProactiveAt: number | null }

export type OfferVars = { used?: number; balance?: number; tool?: NudgeTool }
export type NudgeOffer = { trigger: OfferTrigger; vars: OfferVars }

const t10Tool = (f: NudgeFacts): NudgeTool | null => f.ownToolsSince.find((t) => (f.ownToolDays[t] ?? 0) >= 2) ?? null

/** The proactive offers whose moment happened since the last look and whose condition holds now. */
export function qualifyingProactive(f: NudgeFacts): ProactiveTrigger[] {
  const out: ProactiveTrigger[] = []
  if (f.studioSpendSince && f.studioNetSpend > T2_NET_SPEND) out.push('T2')
  if (f.ownRenderSince && f.ownRenders >= T3_RENDERS) out.push('T3')
  if (f.ownReadSince) out.push('T4')
  if (f.memberJoinedSince && f.activeMembers >= 2) out.push('T9')
  if (t10Tool(f)) out.push('T10')
  const toolsUsed = Object.values(f.ownToolDays).filter((d) => (d ?? 0) >= 1).length
  if (f.ownToolsSince.length > 0 && toolsUsed >= 2) out.push('T11')
  if (f.newLocalDay && f.activeDaysAtLeast3) out.push('T12')
  return out
}

/** Whether a lifecycle offer's moment still holds — an "Only n left" that a top-up answered, or welcome credits a purchase replaced, is gone. */
export function lifecycleHolds(t: LifecycleTrigger, f: Pick<NudgeFacts, 'balance' | 'welcomeEnded'>): boolean {
  return t === 'T7' ? f.balance < T7_LOW_BALANCE : f.welcomeEnded
}

function offerFor(trigger: OfferTrigger, f: NudgeFacts): NudgeOffer {
  if (trigger === 'T2') return { trigger, vars: { used: f.studioNetSpend } }
  if (trigger === 'T7') return { trigger, vars: { balance: f.balance } }
  if (trigger === 'T10') return { trigger, vars: { tool: t10Tool(f) ?? undefined } }
  return { trigger, vars: {} }
}

/** R4 · R7 · R8 — at most one offer: a lifecycle one only waits for the gap; a proactive one needs the gap and the day's cap, and only the
    most important unspent one shows (the others are discarded — each can come back only at its own next moment). */
export function decideNudge(f: NudgeFacts, s: NudgeStateView): NudgeOffer | null {
  const since = (at: number | null) => (at == null ? Number.POSITIVE_INFINITY : f.now - at)
  const gapOk = since(s.lastModalAt) >= MIN_GAP_MS
  const capOk = since(s.lastProactiveAt) >= DAILY_CAP_MS
  const lifecycle: LifecycleTrigger[] = []
  if (f.welcomeEnded && !s.spent.T8) lifecycle.push('T8')
  if (f.lowBalanceCrossing && f.balance < T7_LOW_BALANCE) lifecycle.push('T7')
  if (lifecycle.length) return gapOk ? offerFor(lifecycle[0]!, f) : null
  if (!gapOk || !capOk) return null
  const open = new Set(qualifyingProactive(f).filter((t) => !s.spent[t]))
  const top = PROACTIVE_PRIORITY.find((t) => open.has(t))
  return top ? offerFor(top, f) : null
}

/* ── the words (1.0's `copy.ts`, in 2.0's words — invented copy, REG-S41b4.*) ─────────────────────────────────────────────────────── */

export type OfferPrimary = 'plans' | 'topup'
export type OfferWords = { title: string; body: string; primary: OfferPrimary; label: string }

const fmt = (n: number) => n.toLocaleString('en-SG')
const PRO = planRow('pro_studio')
/** "1,500 AI credits a seat every month" — Pro's allowance (both Pro plans give the same a seat). */
const perSeat = `${fmt(PRO.creditAllowance)} AI credits a seat every month`
/** Three of the Pro features, by their 2.0 names (S19's `FEATURE_WORDS`). */
const features = `${FEATURE_WORDS.quote_xray.name}, ${FEATURE_WORDS.template_editor.name.toLowerCase()} and ${FEATURE_WORDS.internal_approvals.name.toLowerCase()}`
const reads = Math.floor(PRO.creditAllowance / CREDIT_SCHEDULE.quote_digitize.credits)

/** What an offer says — its title, one or two plain sentences, and its one way on (See plans, or Buy AI credits for "Only n left"). The
    trial is named while the studio can still take it. */
export function offerWords(o: NudgeOffer, ctx: { trialOpen: boolean }): OfferWords {
  const trial = ctx.trialOpen ? ' Pro starts with 14 days free.' : ''
  const plans = (title: string, body: string): OfferWords => ({ title, body: `${body}${trial}`, primary: 'plans', label: 'See plans' })
  switch (o.trigger) {
    case 'T2': return plans('You’re a pro at this', `The studio has used ${fmt(o.vars.used ?? 0)} AI credits. Pro gives ${perSeat}.`)
    case 'T3': return plans('Enjoying the AI Visualizer?', `Pro gives ${perSeat} — about ${fmt(aboutRenders(PRO.creditAllowance))} renders each.`)
    case 'T4': return plans('One quote read. More to come?', `Pro gives ${perSeat} — enough to read about ${fmt(reads)} quotes.`)
    case 'T7': return { title: `Only ${fmt(o.vars.balance ?? 0)} AI credits left`, body: `Top up to keep going — ${fmt(TOPUP_CREDITS)} AI credits are ${sgd(topupPrice(TOPUP_CREDITS))} and never expire.`, primary: 'topup', label: 'Buy AI credits' }
    case 'T8': return plans('Welcome AI credits used up', `Free gives the studio ${fmt(planRow('free').creditAllowance)} AI credits a month. Pro gives ${fmt(PRO.creditAllowance)} a seat.`)
    case 'T9': return plans(`${PRO.name} is made for teams`, `${perSeat} — ${PRO.minSeats} seats from ${sgd(priceFor(PRO, PRO.minSeats, 'monthly'))} a month.`)
    case 'T10': return plans(`Making the most of ${o.vars.tool ? TOOL_WORDS[o.vars.tool] : 'your AI tools'}?`, `Pro gives ${perSeat}, with ${features}.`)
    case 'T11': return plans('Get more with Pro', `${perSeat.charAt(0).toUpperCase()}${perSeat.slice(1)}, with ${features}.`)
    case 'T12': return plans('Enjoying OpenMaison?', `Pro gives ${perSeat}, with ${features}.`)
  }
}

/** The one line the out-of-credits sheet adds when the welcome AI credits run out on a press (T8 in place of T13, once — 1.0's R8). */
/** (one line in the 400 sheet's head — the house head is one line) */
export const WELCOME_ENDED_TITLE = 'Welcome AI credits used up'
export const welcomeEndedLine = (): string => `Free gives the studio ${fmt(planRow('free').creditAllowance)} AI credits a month. Pro gives ${fmt(PRO.creditAllowance)} a seat.`

/** What Not now's snackbar says — the offer is put away, and where plans always are. */
export const PUT_AWAY = 'Put away — Plans are always one press away in Upgrade'

/** An offer as the record keeps it (`nudge_state.offer_json`). */
export type KeptOffer = NudgeOffer & { id: string; at: number; title: string; body: string; primary: OfferPrimary }
export type OfferAnswer = 'plans' | 'topup' | 'not_now' | 'withdrawn'
export const parseJson = <T>(v: string | null | undefined, fallback: T): T => { if (!v) return fallback; try { const x = JSON.parse(v) as unknown; return (x && typeof x === 'object' ? x : fallback) as T } catch { return fallback } }
/** The once-ever offers a record has spent, known keys only (a key from another build survives the write — 1.0's M3 — but is not read). */
export function spentOf(raw: string | null | undefined): Partial<Record<NudgeTrigger, number>> {
  const o = parseJson<Record<string, unknown>>(raw, {})
  const out: Partial<Record<NudgeTrigger, number>> = {}
  for (const [k, v] of Object.entries(o)) if (isNudgeTrigger(k) && typeof v === 'number' && Number.isFinite(v)) out[k] = v
  return out
}
