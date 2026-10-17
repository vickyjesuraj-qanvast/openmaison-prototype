import 'server-only'
import { and, desc, eq, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { members, subscriptions } from '@/lib/db/schema'
import { lockRule, planAllows, type ProFeature } from './features'

/**
 * (pending modules S19 — 1.0's server plan gate, `src/lib/plan/gate.ts`: `planAllows` · `requirePlanFeature` · the kill switch) The lock
 * every Pro action asks first. 1.0's rules as they are:
 *  · the studio's plan is the live subscription's (a trial is Pro — its plan id is the paid plan's; a lapse or a cancel that reached its date
 *    is Free, as `ensurePeriod` writes it);
 *  · fail open: a plan that can't be read allows the action and says so in the log (an outage never locks a paying studio);
 *  · `PLAN_GATING_DISABLED=1` opens everything (server and screens alike — the summary reports nothing locked);
 *  · one read per request is enough — callers that check several features read `studioPlanId()` once and use `planAllows` (pure).
 * No credits are read or spent here: plan gating is not credit metering (1.0's `guardCredits` lets plan refusals through in shadow mode).
 * Reads the subscription itself (not lib/credits/ledger.ts) so the notification delivery layer can ask it without an import cycle.
 */

export const gatingOff = (): boolean => process.env.PLAN_GATING_DISABLED === '1'

/** The studio's plan id now, or null when it can't be read (fail open). */
export async function studioPlanId(): Promise<string | null> {
  try {
    const [s] = await db.select({ planId: subscriptions.planId }).from(subscriptions).where(isNull(subscriptions.cancelledAt)).orderBy(desc(subscriptions.createdAt)).limit(1)
    return s?.planId ?? 'free'   // a studio with no plan yet is on Free (1.0: a missing plan counts as Free)
  } catch (e) { console.error('[plan-gate] the plan could not be read — allowing', e); return null }
}

/** Whether the studio may use a Pro feature right now. */
export async function planAllowsNow(f: ProFeature): Promise<boolean> {
  if (gatingOff()) return true
  const id = await studioPlanId()
  return id == null || planAllows(id, f)
}

/** The Owner's name, for a refusal's way on ("Dane can move the studio to Pro in Plans"). */
async function ownerName(): Promise<string | null> {
  try {
    const [o] = await db.select({ name: members.name }).from(members).where(and(eq(members.role, 'Owner'), eq(members.isActive, true))).limit(1)
    return o?.name ?? null
  } catch { return null }
}

/** 1.0's `requirePlanFeature`: null when the action may go on, else its refusal `{ error: <the rule> }` (the house refusal shape). */
export async function requirePlan(f: ProFeature): Promise<{ error: string } | null> {
  if (await planAllowsNow(f)) return null
  return { error: lockRule(f, await ownerName()) }
}
