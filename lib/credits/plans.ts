/**
 * (REG-699) The plans — 1.0's `plans` rows as they are (002 · 317 · 326; the live plans API adds the 14-day Pro trial), with the
 * pricing maths the website states: annual = 11 × monthly ("1 month free"), Pro — Studio covers three seats and each extra seat is
 * S$35 a month, a studio's month of AI credits = the plan's allowance × its seats (integration A-01). Prices are SGD cents.
 * Client-safe: Plans, the card and the Company page all price from here, so they never disagree (integration B-25).
 */

export type PlanId = 'free' | 'pro_freelance' | 'pro_studio' | 'max'
export type BillingCycle = 'monthly' | 'yearly'

export type FeatureKey = 'quote_xray' | 'template_editor' | 'package_creation' | 'custom_stages' | 'internal_approvals' | 'whatsapp_notifications' | 'expense_management'
  | 'po_support' | 'accounting_integrations' | 'remove_om_branding' | 'custom_pricebook'

export type PlanRow = {
  id: PlanId
  name: string
  monthlyPrice: number
  yearlyPrice: number
  maxMembers: number | null
  creditAllowance: number
  signupCreditGrant: number
  minSeats: number
  extraSeatPriceCents: number | null
  isContactSales: boolean
  trialPeriodDays: number
  isHighlighted: boolean
  featureFlags: Record<FeatureKey, boolean>
}

const PRO_FLAGS: FeatureKey[] = ['quote_xray', 'template_editor', 'package_creation', 'custom_stages', 'internal_approvals', 'whatsapp_notifications', 'expense_management']
const ALL_FLAGS: FeatureKey[] = [...PRO_FLAGS, 'po_support', 'accounting_integrations', 'remove_om_branding', 'custom_pricebook']
const flags = (on: FeatureKey[]): Record<FeatureKey, boolean> => Object.fromEntries(ALL_FLAGS.map((k) => [k, on.includes(k)])) as Record<FeatureKey, boolean>

/** 1.0's four live rows (the retired starter / pro / enterprise stay in 1.0). The flags are recorded but not enforced — Q-40, later. */
export const PLAN_ROWS: PlanRow[] = [
  { id: 'free', name: 'Free', monthlyPrice: 0, yearlyPrice: 0, maxMembers: null, creditAllowance: 30, signupCreditGrant: 150, minSeats: 1, extraSeatPriceCents: null, isContactSales: false, trialPeriodDays: 0, isHighlighted: false, featureFlags: flags([]) },
  { id: 'pro_freelance', name: 'Pro — Freelance', monthlyPrice: 3500, yearlyPrice: 38500, maxMembers: 1, creditAllowance: 1500, signupCreditGrant: 0, minSeats: 1, extraSeatPriceCents: null, isContactSales: false, trialPeriodDays: 14, isHighlighted: true, featureFlags: flags(PRO_FLAGS) },
  { id: 'pro_studio', name: 'Pro — Studio', monthlyPrice: 10000, yearlyPrice: 110000, maxMembers: null, creditAllowance: 1500, signupCreditGrant: 0, minSeats: 3, extraSeatPriceCents: 3500, isContactSales: false, trialPeriodDays: 14, isHighlighted: false, featureFlags: flags(PRO_FLAGS) },
  { id: 'max', name: 'Max', monthlyPrice: 7000, yearlyPrice: 77000, maxMembers: null, creditAllowance: 3000, signupCreditGrant: 0, minSeats: 1, extraSeatPriceCents: null, isContactSales: true, trialPeriodDays: 0, isHighlighted: false, featureFlags: flags(ALL_FLAGS) },
]
export const planRow = (id: string): PlanRow => PLAN_ROWS.find((p) => p.id === id) ?? PLAN_ROWS[0]!
export const isPaid = (id: string): boolean => id !== 'free'

/** The website's card words (C §1.3), kept as they are. */
export const PLAN_TAGLINE: Record<'free' | 'pro' | 'max', string> = {
  free: 'Everything you need to see if this fits.',
  pro: 'For a working studio that bills clients.',
  max: 'For firms that need it bent to their shape.',
}

/** Seats the plan is charged for: Free and Freelance are one seat; Studio at least its three; Max per seat (sales). */
export const seatsFor = (plan: PlanRow, seats: number): number => (plan.id === 'pro_studio' || plan.id === 'max' ? Math.max(plan.minSeats, Math.floor(seats) || plan.minSeats) : 1)

/** A studio's month of AI credits (1.0's `allowanceFor`: allowance × seats). */
export const allowanceFor = (plan: PlanRow, seats: number): number => plan.creditAllowance * seatsFor(plan, seats)

/** The price per month and per year, in cents (Studio: the base covers `minSeats`, each extra seat adds its price; annual = 11 months). */
export function priceFor(plan: PlanRow, seats: number, cycle: BillingCycle): number {
  const extra = Math.max(0, seatsFor(plan, seats) - plan.minSeats) * (plan.extraSeatPriceCents ?? 0)
  return cycle === 'yearly' ? plan.yearlyPrice + extra * 11 : plan.monthlyPrice + extra
}
/** Annual, said the way owners budget (enhancement E-19, Q-17): the monthly figure and what the free month saves. */
export const perMonthOnYearly = (plan: PlanRow, seats: number): number => Math.round(priceFor(plan, seats, 'yearly') / 12)
export const yearlySaving = (plan: PlanRow, seats: number): number => priceFor(plan, seats, 'monthly') * 12 - priceFor(plan, seats, 'yearly')

/** S$ as studios read it: "S$240" (whole dollars), "S$240.50" (cents only when there are any). */
export function sgd(cents: number): string {
  const whole = cents % 100 === 0
  return `S$${(cents / 100).toLocaleString('en-SG', { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 })}`
}
export const sgd2 = (cents: number): string => `S$${(cents / 100).toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

/** (Q-12) The plan that fits the team: one person → Freelance, a team → Studio (Max is arranged with the team). */
export const suggestedPlan = (activeMembers: number): PlanId => (activeMembers > 1 ? 'pro_studio' : 'pro_freelance')
/** (Q-12) Why a plan can't take this studio — said in the card, never a greyed button without a reason (principle 5). */
export function planBlock(plan: PlanRow, activeMembers: number): string | null {
  if (plan.maxMembers != null && activeMembers > plan.maxMembers) return `${plan.name.replace('Pro — ', '')} is for one person — you have ${activeMembers} members.`
  return null
}

/** The top-up: 1.0's one product, 1,000 AI credits for S$20 (integration B-05 — packs come when 1.0 sells quantities). */
export const TOPUP_CREDITS = 1000
export const TOPUP_PRICE = 2000
