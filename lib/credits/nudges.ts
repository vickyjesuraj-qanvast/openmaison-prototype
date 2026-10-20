import 'server-only'
import { randomUUID } from 'node:crypto'
import { and, asc, desc, eq, gte, inArray, isNotNull, isNull, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { creditLedger, members, notifications, nudgeState, studioCreditBalances, studioInvitations, subscriptions, type NudgeStateRow } from '@/lib/db/schema'
import { ACT_SOURCES, stampsSql } from '@/lib/studio-health/sources'
import { opensWorkspace } from '@/lib/settings/roles'
import { ownerRole } from './policy'
import {
  decideNudge, isOfferTrigger, lifecycleHolds, offerWords, ONCE_EVER, parseJson, PROACTIVE, spentOf, toolFor, T7_LOW_BALANCE, WATERMARK_OVERLAP_MS,
  type BlockingMoment, type KeptOffer, type NudgeFacts, type NudgeTool, type OfferAnswer, type OfferPrimary, type OfferTrigger,
} from './nudge-model'

/**
 * (pending modules S41b-4 — the S41b data sweep's M-02; 1.0's `deployment/plg` `src/lib/nudges/{eligibility,facts,state,service}.ts` and its
 * two routes, `POST /api/nudges/evaluate` · `/claim`) The Free plan's upgrade offers on the server — read from records 2.0 already keeps, never
 * from a new success hook (1.0's rule): the AI credits ledger (a spend with no refund is a success, by its action key), the balance, the
 * invitations accepted, and the doer's own records for the days they worked (Studio health's `ACT_SOURCES`, S39 — 2.0 has no page views, his
 * Q-16). One look = 1.0's evaluate and claim in one compare-and-set write: the browser asks only at a safe moment
 * (components/credits/upgrade-offers.tsx), so the offer it earns is written there and then, as one quiet row in the Owner's bell.
 *
 * Fails closed (1.0's R1): a read that fails offers nothing and keeps the watermark, so nothing that happened is lost; a paying studio never
 * sees an offer. Kill switch: `UPGRADE_NUDGES_DISABLED=1`; the studio's own off switch is the event's In app (Settings › Notifications), a
 * member's is their mute (Your profile › Your notifications).
 */

/** 1.0's D13 kill switch — no offer, no blocking stamp, the sheet's welcome line off. */
export const nudgesDisabled = (): boolean => process.env.UPGRADE_NUDGES_DISABLED === '1'

const ms = (d: Date | null | undefined): number | null => (d instanceof Date ? d.getTime() : null)
const OFFER_KIND = 'upgrade_offer'
const BALANCE_ID = 'studio'
const dayKey = (t: number) => { const d = new Date(t); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}` }
const startOfDay = (t: number) => { const d = new Date(t); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() }
const isProactive = (t: OfferTrigger) => (PROACTIVE as readonly string[]).includes(t)

/** The studio's plan now — the newest subscription not replaced (the credits' own rule; read here so the ledger can call this file). */
async function currentPlan(): Promise<{ planId: string } | null> {
  const [s] = await db.select({ planId: subscriptions.planId }).from(subscriptions).where(isNull(subscriptions.cancelledAt)).orderBy(desc(subscriptions.createdAt)).limit(1)
  return s ?? null
}
/** R9's floor — the studio's start: its first plan (a new studio's Free, S31; the demo's Free of August). */
async function studioStart(now: number): Promise<number> {
  const [s] = await db.select({ at: subscriptions.createdAt }).from(subscriptions).orderBy(asc(subscriptions.createdAt)).limit(1)
  return ms(s?.at) ?? now
}
/** Whether the studio can still take its one 14-day Pro trial (S19's rule) — the offer names it while it can. */
async function trialOpen(): Promise<boolean> {
  return (await db.select({ id: subscriptions.id }).from(subscriptions).where(isNotNull(subscriptions.trialEndsAt)).limit(1)).length === 0
}

type Audience = { ok: true; trialOpen: boolean } | { ok: false; why: 'off' | 'role' | 'plan' | 'quiet' }
/** R1 · R2 — who may be offered anything: the Owner (1.0's purchaser, S19's `mayChangePlan`) of a studio on Free, with the offers' notice on
    for the studio and not muted by them. Anything that can't be read answers no. */
async function audience(memberId: string): Promise<Audience> {
  if (nudgesDisabled()) return { ok: false, why: 'off' }
  try {
    const [m] = await db.select({ role: members.role, active: members.isActive }).from(members).where(eq(members.id, memberId))
    if (!m || !m.active || !ownerRole(m.role)) return { ok: false, why: 'role' }
    const plan = await currentPlan()
    if (plan?.planId !== 'free') return { ok: false, why: 'plan' }
    const { fetchNotificationRules } = await import('@/lib/notifications/queries')
    const { noticePrefsOf } = await import('@/lib/notifications/prefs-server')
    const [rules, prefs] = await Promise.all([fetchNotificationRules(), noticePrefsOf([memberId])])
    if (!rules.channels[OFFER_KIND]?.in_app || prefs.get(memberId)?.muted.has(OFFER_KIND)) return { ok: false, why: 'quiet' }
    return { ok: true, trialOpen: await trialOpen() }
  } catch (e) { console.error('[nudges] who may be offered could not be read — offering nothing', e); return { ok: false, why: 'off' } }
}

/** The member's record, made on first use (1.0's `readNudgeState`). */
async function readState(memberId: string, now: number): Promise<NudgeStateRow> {
  const [r] = await db.select().from(nudgeState).where(eq(nudgeState.memberId, memberId))
  if (r) return r
  await db.insert(nudgeState).values({ memberId, createdAt: new Date(now), updatedAt: new Date(now) }).onConflictDoNothing()
  const [made] = await db.select().from(nudgeState).where(eq(nudgeState.memberId, memberId))
  return made!
}

/** T8 — the welcome AI credits are used up: the studio had them (the grant), never bought a top-up (bought AI credits aren't welcome ones —
    1.0: never offered to a studio holding bought credits), and the top-ups' bucket — where 2.0 keeps the welcome ones, B-08 — is empty. They
    never expire in 2.0, so 1.0's "reset at the first monthly refresh" can't happen; only spending them ends them. */
async function welcomeEnded(): Promise<boolean> {
  const [bal] = await db.select().from(studioCreditBalances).where(eq(studioCreditBalances.id, BALANCE_ID))
  if (!bal || bal.topupCredits > 0) return false
  const [grant] = await db.select({ n: sql<number>`count(*)` }).from(creditLedger).where(and(eq(creditLedger.reason, 'grant'), eq(creditLedger.actionKey, 'welcome')))
  const [bought] = await db.select({ n: sql<number>`count(*)` }).from(creditLedger).where(eq(creditLedger.reason, 'topup'))
  return Number(grant?.n ?? 0) > 0 && Number(bought?.n ?? 0) === 0
}

/** Everything the decision needs (1.0's `loadNudgeFacts`) — null on any read error (offer nothing, keep the watermark). */
async function loadFacts(memberId: string, o: { watermark: number | null; t7Anchor: number | null; floor: number; now: number }): Promise<NudgeFacts | null> {
  try {
    const since = o.watermark ?? o.floor
    const [bal] = await db.select().from(studioCreditBalances).where(eq(studioCreditBalances.id, BALANCE_ID))
    const balance = bal ? bal.planCredits + bal.topupCredits : 0
    /* every spend and refund since the studio's start, newest first (1.0 read its newest 1,000 — every condition saturates far below it) */
    const rows = await db.select({ memberId: creditLedger.memberId, actionKey: creditLedger.actionKey, credits: creditLedger.credits, balanceAfter: creditLedger.balanceAfter, reason: creditLedger.reason, refId: creditLedger.refId, at: creditLedger.createdAt })
      .from(creditLedger).where(and(gte(creditLedger.createdAt, new Date(o.floor)), inArray(creditLedger.reason, ['spend', 'refund']))).orderBy(desc(creditLedger.createdAt)).limit(1000)
    const at = (r: (typeof rows)[number]) => r.at.getTime()
    const studioSpendSince = rows.some((r) => r.reason === 'spend' && at(r) > since)
    const t7Since = o.t7Anchor ?? o.floor
    /* T7 (1.0's D8): a spend that took the studio from 20 or more to under 20 after "Only n left" last showed — before = after − credits */
    const lowBalanceCrossing = rows.some((r) => r.reason === 'spend' && at(r) > t7Since && r.balanceAfter < T7_LOW_BALANCE && r.balanceAfter - r.credits >= T7_LOW_BALANCE)
    const studioNetSpend = Math.max(0, -rows.reduce((s, r) => s + r.credits, 0))
    /* a success = the member's own spend with no `<ref>:refund` (a render that failed, a quote with no line, came back) */
    const refunded = new Set(rows.filter((r) => r.reason === 'refund' && r.refId?.endsWith(':refund')).map((r) => r.refId!.slice(0, -':refund'.length)))
    let ownRenders = 0, ownRenderSince = false, ownReadSince = false
    const ownToolsSince: NudgeTool[] = []
    const days: Partial<Record<NudgeTool, Set<string>>> = {}
    for (const r of rows) {
      if (r.reason !== 'spend' || r.memberId !== memberId || (r.refId && refunded.has(r.refId))) continue
      const tool = toolFor(r.actionKey)
      if (!tool) continue
      const fresh = at(r) > since
      if (tool === 'visualizer') { ownRenders++; if (fresh) ownRenderSince = true }
      if (tool === 'reader' && fresh) ownReadSince = true
      if (fresh && !ownToolsSince.includes(tool)) ownToolsSince.push(tool)
      ;(days[tool] ??= new Set()).add(dayKey(at(r)))
    }
    const ownToolDays: Partial<Record<NudgeTool, number>> = {}
    for (const [tool, set] of Object.entries(days)) ownToolDays[tool as NudgeTool] = set.size
    /* T9 (1.0's D7): a member who uses the AI tools came in through an invitation since (a re-activated member is not counted) */
    const team = await db.select({ id: members.id, role: members.role, active: members.isActive }).from(members)
    const seats = new Set(team.filter((m) => m.active && opensWorkspace(m.role)).map((m) => m.id))
    const joined = await db.select({ memberId: studioInvitations.memberId, at: studioInvitations.acceptedAt }).from(studioInvitations).where(isNotNull(studioInvitations.acceptedAt))
    const memberJoinedSince = joined.some((j) => seats.has(j.memberId) && (ms(j.at) ?? 0) > since)
    /* T12 (1.0's D6, from records — 2.0 keeps no page views): the first look of a new day, and the member did something on two earlier days */
    const newLocalDay = o.watermark == null || dayKey(o.watermark) !== dayKey(o.now)
    let activeDaysAtLeast3 = false
    if (newLocalDay) {
      const [row] = await db.all<{ n: number }>(sql`SELECT COUNT(DISTINCT date(at / 1000, 'unixepoch', 'localtime')) AS n FROM (${sql.raw(stampsSql(ACT_SOURCES))}) WHERE m = ${memberId} AND at >= ${o.floor} AND at < ${startOfDay(o.now)}`)
      activeDaysAtLeast3 = Number(row?.n ?? 0) >= 2
    }
    return {
      now: o.now, studioSpendSince, studioNetSpend, balance, ownRenderSince, ownRenders, ownReadSince,
      memberJoinedSince, activeMembers: seats.size, ownToolsSince, ownToolDays, newLocalDay, activeDaysAtLeast3,
      lowBalanceCrossing, welcomeEnded: await welcomeEnded(),
    }
  } catch (e) { console.error('[nudges] the facts could not be read — offering nothing', e); return null }
}

const keptOf = (st: Pick<NudgeStateRow, 'offerJson'>): KeptOffer | null => { const k = parseJson<KeptOffer | null>(st.offerJson, null); return k && isOfferTrigger(k.trigger) && typeof k.id === 'string' ? k : null }
const answersOf = (st: Pick<NudgeStateRow, 'answersJson'>) => parseJson<Record<string, { answer: OfferAnswer; at: number }>>(st.answersJson, {})
/** 1.0's M3: a key another build wrote survives a write that adds one. */
const withSpent = (raw: string, t: string, now: number) => JSON.stringify({ ...parseJson<Record<string, unknown>>(raw, {}), [t]: now })

/**
 * One look (1.0's evaluate + claim, atomic): R1/R2, the facts, the decision; the watermark moves on (5 s early); an offer is spent, stamped
 * and written as ONE row in the member's bell — the older offer still waiting leaves it (one at a time, R6) — and a lifecycle offer whose
 * moment has passed is taken out. Answers the offer it made, or null.
 */
export async function offerNow(memberId: string, now = Date.now()): Promise<{ offered: OfferTrigger | null }> {
  const a = await audience(memberId)
  if (!a.ok) { if (a.why === 'plan') await withdrawStaleOffers(now).catch(() => {}); return { offered: null } }
  const floor = await studioStart(now)
  for (let attempt = 0; attempt < 3; attempt++) {
    const st = await readState(memberId, now)
    const facts = await loadFacts(memberId, { watermark: ms(st.lastEvaluatedAt), t7Anchor: ms(st.t7LastShownAt), floor, now })
    if (!facts) return { offered: null }
    const offer = decideNudge(facts, { spent: spentOf(st.spent), lastModalAt: ms(st.lastModalAt), lastProactiveAt: ms(st.lastProactiveAt) })
    const live = st.offerId ? keptOf(st) : null
    const stale = !!live && (live.trigger === 'T7' || live.trigger === 'T8') && !lifecycleHolds(live.trigger, facts)
    const answers = answersOf(st)
    const patch: Partial<typeof nudgeState.$inferInsert> = { lastEvaluatedAt: new Date(now - WATERMARK_OVERLAP_MS), version: st.version + 1, updatedAt: new Date(now) }
    let row: typeof notifications.$inferInsert | null = null
    if (offer) {
      const words = offerWords(offer, { trialOpen: a.trialOpen })
      const id = randomUUID()
      const kept: KeptOffer = { ...offer, id, at: now, title: words.title, body: words.body, primary: words.primary }
      patch.lastModalAt = new Date(now)
      if (ONCE_EVER.has(offer.trigger)) patch.spent = withSpent(st.spent, offer.trigger, now)
      if (isProactive(offer.trigger)) patch.lastProactiveAt = new Date(now)
      if (offer.trigger === 'T7') patch.t7LastShownAt = new Date(now)
      patch.offerId = id
      patch.offerJson = JSON.stringify(kept)
      if (live) answers[live.trigger] = { answer: 'withdrawn', at: now }
      row = { id, memberId, kind: OFFER_KIND, title: words.title, body: words.body, href: null, leadId: null, quoteId: null, channels: 'in_app', actorId: null, createdAt: new Date(now), readAt: null }
    } else if (stale && live) {
      patch.offerId = null
      answers[live.trigger] = { answer: 'withdrawn', at: now }
    }
    patch.answersJson = JSON.stringify(answers)
    const done = await db.transaction(async (tx) => {
      const claim = await tx.update(nudgeState).set(patch).where(and(eq(nudgeState.memberId, memberId), eq(nudgeState.version, st.version)))
      if (!claim.rowsAffected) return false
      if ((row || stale) && st.offerId) await tx.delete(notifications).where(and(eq(notifications.id, st.offerId), eq(notifications.memberId, memberId)))
      if (row) await tx.insert(notifications).values(row)
      return true
    })
    if (done) return { offered: offer?.trigger ?? null }
  }
  console.error('[nudges] every look lost its race — offering nothing')
  return { offered: null }
}

/** The member's live offer as the bell shows it — its row, its one way on — or null (none, or the studio is no longer on Free). */
export async function liveOffer(memberId: string): Promise<{ id: string; trigger: OfferTrigger; primary: OfferPrimary; label: string } | null> {
  const [st] = await db.select().from(nudgeState).where(eq(nudgeState.memberId, memberId))
  const kept = st?.offerId ? keptOf(st) : null
  if (!st || !kept || kept.id !== st.offerId) return null
  if ((await currentPlan())?.planId !== 'free') return null
  return { id: kept.id, trigger: kept.trigger, primary: kept.primary, label: kept.primary === 'topup' ? 'Buy AI credits' : 'See plans' }
}

/** The Owner answers an offer — See plans, Buy AI credits or Not now (1.0: the modal closed either way). The row leaves the bell; the record
    keeps how it was answered. An offer already gone answers so (its row, if left behind, is cleared). */
export async function answerOffer(memberId: string, id: string, answer: Exclude<OfferAnswer, 'withdrawn'>, now = Date.now()): Promise<{ ok: true; trigger: OfferTrigger } | { error: string }> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const [st] = await db.select().from(nudgeState).where(eq(nudgeState.memberId, memberId))
    const kept = st ? keptOf(st) : null
    if (!st || !kept || st.offerId !== id) {
      await db.delete(notifications).where(and(eq(notifications.id, id), eq(notifications.memberId, memberId), eq(notifications.kind, OFFER_KIND)))
      return { error: 'That offer has already gone.' }
    }
    const answers = answersOf(st)
    answers[kept.trigger] = { answer, at: now }
    const done = await db.transaction(async (tx) => {
      const claim = await tx.update(nudgeState).set({ offerId: null, answersJson: JSON.stringify(answers), version: st.version + 1, updatedAt: new Date(now) })
        .where(and(eq(nudgeState.memberId, memberId), eq(nudgeState.version, st.version)))
      if (!claim.rowsAffected) return false
      await tx.delete(notifications).where(and(eq(notifications.id, id), eq(notifications.memberId, memberId)))
      return true
    })
    if (done) return { ok: true, trigger: kept.trigger }
  }
  return { error: 'That offer was busy — please try again.' }
}

/** Undo after Not now: the same offer back in the bell, as it was — while the studio is still on Free and nothing newer took its place. */
export async function restoreOffer(memberId: string, id: string, read: boolean, now = Date.now()): Promise<{ ok: true } | { error: string }> {
  const [st] = await db.select().from(nudgeState).where(eq(nudgeState.memberId, memberId))
  const kept = st ? keptOf(st) : null
  if (!st || !kept || kept.id !== id || st.offerId) return { error: 'That offer can’t come back now.' }
  const answers = answersOf(st)
  if (answers[kept.trigger]?.answer !== 'not_now') return { error: 'That offer can’t come back now.' }
  if ((await currentPlan())?.planId !== 'free') return { error: 'The studio isn’t on Free any more.' }
  delete answers[kept.trigger]
  const done = await db.transaction(async (tx) => {
    const claim = await tx.update(nudgeState).set({ offerId: id, answersJson: JSON.stringify(answers), version: st.version + 1, updatedAt: new Date(now) })
      .where(and(eq(nudgeState.memberId, memberId), eq(nudgeState.version, st.version)))
    if (!claim.rowsAffected) return false
    await tx.insert(notifications).values({ id, memberId, kind: OFFER_KIND, title: kept.title, body: kept.body, href: null, leadId: null, quoteId: null, channels: 'in_app', actorId: null, createdAt: new Date(kept.at), readAt: read ? new Date(now) : null }).onConflictDoNothing()
    return true
  })
  return done ? { ok: true } : { error: 'That offer was busy — please try again.' }
}

/**
 * The Owner met one of 2.0's own blocking moments on Free — a Pro feature's lock card (T6), the out-of-credits sheet (T13 · T14), the welcome
 * credits running out on a press (T8): it restarts the 10-minute gap (1.0's D4), so no offer follows it; T8 is spent there, once — the bell
 * never says it again (never two prompts for one moment).
 */
export async function noteMoment(memberId: string, trigger: BlockingMoment, now = Date.now()): Promise<void> {
  const a = await audience(memberId)
  if (!a.ok) return
  for (let attempt = 0; attempt < 3; attempt++) {
    const st = await readState(memberId, now)
    const patch: Partial<typeof nudgeState.$inferInsert> = { lastModalAt: new Date(now), version: st.version + 1, updatedAt: new Date(now) }
    if (trigger === 'T8' && !spentOf(st.spent).T8) patch.spent = withSpent(st.spent, 'T8', now)
    const claim = await db.update(nudgeState).set(patch).where(and(eq(nudgeState.memberId, memberId), eq(nudgeState.version, st.version)))
    if (claim.rowsAffected) return
  }
}

/** T8 is still the Owner's to hear: on Free, unspent, and the welcome AI credits are used up (the out-of-credits sheet says it in its place). */
export async function welcomeEndsNow(memberId: string): Promise<boolean> {
  const a = await audience(memberId)
  if (!a.ok) return false
  const [st] = await db.select({ spent: nudgeState.spent }).from(nudgeState).where(eq(nudgeState.memberId, memberId))
  if (st && spentOf(st.spent).T8) return false
  return welcomeEnded()
}

/**
 * Every live offer whose moment has passed leaves the bell (R1: an upgrade stops every offer; "Only n left" ends with a top-up; welcome credits
 * replaced by bought ones). Called when the plan changes and when AI credits are added (lib/credits/ledger.ts), and by every look. Never throws
 * into a purchase.
 */
export async function withdrawStaleOffers(now = Date.now()): Promise<number> {
  const live = await db.select().from(nudgeState).where(isNotNull(nudgeState.offerId))
  if (!live.length) return 0
  const free = (await currentPlan())?.planId === 'free'
  const [bal] = await db.select().from(studioCreditBalances).where(eq(studioCreditBalances.id, BALANCE_ID))
  const facts = { balance: bal ? bal.planCredits + bal.topupCredits : 0, welcomeEnded: free ? await welcomeEnded() : false }
  let n = 0
  for (const st of live) {
    const kept = keptOf(st)
    const stale = !free || !kept || ((kept.trigger === 'T7' || kept.trigger === 'T8') && !lifecycleHolds(kept.trigger, facts))
    if (!stale) continue
    const answers = answersOf(st)
    if (kept) answers[kept.trigger] = { answer: 'withdrawn', at: now }
    await db.transaction(async (tx) => {
      const claim = await tx.update(nudgeState).set({ offerId: null, answersJson: JSON.stringify(answers), version: st.version + 1, updatedAt: new Date(now) })
        .where(and(eq(nudgeState.memberId, st.memberId), eq(nudgeState.version, st.version)))
      if (!claim.rowsAffected) return
      await tx.delete(notifications).where(and(eq(notifications.id, st.offerId!), eq(notifications.memberId, st.memberId)))
      n++
    })
  }
  return n
}

/** The kind an offer's bell row carries (lib/notifications/model.ts `upgrade_offer`). */
export { OFFER_KIND }
