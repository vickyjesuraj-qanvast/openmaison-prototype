import type { BillingCycle } from './plans'

/*
 * (S46D — D4, his "fix everything" 2026-10-19; finding D4 · raw T-2 — plg's pricing → sign-up → `/upgrade?plan=` hand-off) The plan a visitor
 * picked on the website rides into the studio: the site's Pricing sends `/sign-up?plan=<key>&period=<monthly|yearly>`; sign-up lands the new
 * studio with the same query; and on any studio page (CreditsHost reads it — 1.0's `/upgrade?plan=` lands on Plan & billing with it too) Plans
 * opens on that plan, then the address is tidied. Free needs no Plans; Max opens Plans with Talk to us over it (Max is arranged with the team).
 * 1.0's own words for a plan are kept: `pro` (its nudges' "Switch to Pro") opens Plans on the plan that fits the team. Pure, client-safe.
 */

export type IntentPlan = 'pro_freelance' | 'pro_studio' | 'max' | 'pro'
export type PlanIntent = { plan: IntentPlan; cycle: BillingCycle | null; seats: number | null }

/** The query keys an intent travels in. */
export const PLAN_INTENT_KEYS = ['plan', 'period', 'seats'] as const

const PLANS: readonly string[] = ['pro_freelance', 'pro_studio', 'max', 'pro']

/** The intent an address carries, else null (`free`, an unknown plan or none). */
export function readPlanIntent(q: { get(key: string): string | null }): PlanIntent | null {
  const plan = (q.get('plan') ?? '').trim().toLowerCase()
  if (!PLANS.includes(plan)) return null
  const period = (q.get('period') ?? '').trim().toLowerCase()
  const cycle: BillingCycle | null = period === 'yearly' || period === 'annual' ? 'yearly' : period === 'monthly' ? 'monthly' : null
  const n = Number.parseInt(q.get('seats') ?? '', 10)
  return { plan: plan as IntentPlan, cycle, seats: Number.isFinite(n) && n >= 1 && n <= 200 ? n : null }
}

/** An address with the intent's query added (any landing — the front door, the leads a trial brought, the AI Visualizer). */
export function withPlanIntent(to: string, i: PlanIntent | null): string {
  if (!i) return to
  const [path, hash] = to.split('#') as [string, string | undefined]
  const q = new URLSearchParams()
  q.set('plan', i.plan)
  if (i.cycle) q.set('period', i.cycle)
  if (i.seats) q.set('seats', String(i.seats))
  return `${path}${path.includes('?') ? '&' : '?'}${q.toString()}${hash ? `#${hash}` : ''}`
}

/** The address with the intent taken out — what the page keeps once Plans has opened. */
export function withoutPlanIntent(path: string, search: string): string {
  const q = new URLSearchParams(search)
  for (const k of PLAN_INTENT_KEYS) q.delete(k)
  const rest = q.toString()
  return `${path}${rest ? `?${rest}` : ''}`
}

/** The plan's name as sign-up says it ("Plans opens on Pro — Studio"). */
export const intentPlanName = (p: IntentPlan): string => (p === 'pro_freelance' ? 'Pro — Freelance' : p === 'pro_studio' ? 'Pro — Studio' : p === 'max' ? 'Max' : 'Pro')
