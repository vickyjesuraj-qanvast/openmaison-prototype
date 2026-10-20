import { allowanceFor, perMonthOnYearly, planRow, PLAN_TAGLINE, priceFor, sgd, topupPrice, TOPUP_CENTS_PER_CREDIT, TOPUP_MAX, TOPUP_MIN, TOPUP_PICKS, yearlySaving, type BillingCycle, type PlanId, type PlanRow } from '@/lib/credits/plans'
import { aboutRenders, CREDIT_SCHEDULE, type ActionKey } from '@/lib/credits/schedule'
import { buysFor, COMPARE, compareCells, copilotLabel, FAQ, type CompareCell } from '@/lib/credits/pricing-data'
import { PRICING_PATH, SIGN_UP } from './model'

/*
 * (S46D — D4, his "fix everything" 2026-10-19 after the findability audit, finding D4 · raw T-2; his open call taken as recommended: the 2.0 site
 * shows pricing) OpenMaison's public Pricing — 1.0's plg page (`(marketing)/pricing/page.tsx` + `pricing-data.ts`, live since 22 Sep: "what is on
 * screen is what checkout charges"), in its content shape: the three plans with what each includes, the billing period, what the AI credits pay
 * for and what a month buys, top-ups, the whole comparison and the questions. Every price, allowance, seat, trial day and per-action cost is
 * READ here from the app's one source — `lib/credits/plans.ts` (the plans), `lib/credits/schedule.ts` (the price list), `lib/credits/
 * pricing-data.ts` (the comparison and the answers Plans shows inside the app, B-25) — never typed again, so the site, Plans and checkout can't
 * disagree. Each card's list is derived from that comparison: what Pro adds is the rows Free doesn't have (the seven Pro locks of
 * `lib/credits/features.ts`), what Max adds is the team's service. 2.0's names and only what 2.0 does (S35's rule): AI credits (never tokens),
 * the Meeting Copilot, the client portal; no market beyond Singapore, no user count, no trial of Max. Pure.
 *
 * S35 recorded pricing as "kept hidden" — read from 1.0's qanvast line, where `/pricing` still redirects home. 1.0's plg line has shown it since
 * 22 Sep (a6a46941c); that is why it is here.
 */

export { PRICING_PATH }
const fmt = (n: number) => n.toLocaleString('en-SG')

/** Each plan's button: sign-up carries the pick, so the new studio opens Plans on it (app/sign-up, CreditsHost's `?plan=`). Free needs no Plans. */
export const signUpFor = (plan: PlanId, cycle: BillingCycle = 'monthly'): string => (plan === 'free' ? `${SIGN_UP}?plan=free` : `${SIGN_UP}?plan=${plan}&period=${cycle}`)

/** "Annual · 1 month free" — the months annual saves, from the plans' own prices (annual = 11 × monthly). */
export const MONTHS_FREE = Math.max(0, 12 - Math.round(planRow('pro_freelance').yearlyPrice / planRow('pro_freelance').monthlyPrice))
export const ANNUAL_LABEL = MONTHS_FREE > 0 ? `Annual · ${MONTHS_FREE} month${MONTHS_FREE === 1 ? '' : 's'} free` : 'Annual'

/** A comparison row Pro or Max adds — the cards' lists come from the table, so a list never promises what the table doesn't. */
const proAdds = (): string[] => COMPARE.flatMap((g) => g.rows).filter((r) => { const [free, pro] = compareCells(r); return free === false && pro === true }).map((r) => r.label)
const maxAdds = (): string[] => COMPARE.flatMap((g) => g.rows).filter((r) => { const [, pro, max] = compareCells(r); return pro === false && max === true }).map((r) => r.label)
const onboarding = (k: 'free' | 'pro' | 'max'): string | null => { const r = COMPARE.flatMap((g) => g.rows).find((x) => x.label === 'Onboarding'); const v = r ? r[k] : null; return typeof v === 'string' ? v : null }

export type PlanCard = {
  key: 'free' | 'pro' | 'max'
  /** the plan sign-up carries */
  plan: PlanId
  name: string
  tagline: string
  price: string
  per: string | null
  /** the seats line under the price */
  note: string
  /** what annual comes to, said the way owners budget */
  annual: string | null
  allowance: string
  buys: string
  cta: string
  /** the sign-up address, or null for Max (Talk to us opens Book a demo) */
  href: string | null
  fine: string | null
  list: string[]
  popular: boolean
}

/** Free's card. */
export function freeCard(): PlanCard {
  const p = planRow('free')
  return {
    key: 'free', plan: 'free', name: p.name, tagline: PLAN_TAGLINE.free, price: sgd(0), per: 'forever', note: 'Any number of members', annual: null,
    allowance: `${fmt(p.signupCreditGrant)} AI credits to start, then ${fmt(p.creditAllowance)} a month`, buys: `about ${fmt(aboutRenders(p.creditAllowance))} renders a month, shared by the studio`,
    cta: 'Start for free', href: signUpFor('free'), fine: 'No card needed', popular: false,
    list: ['Leads, quotes, contracts and projects', 'The client portal and Finance', 'Maison AI, and the AI tools on AI credits', ...(onboarding('free') ? [`Onboarding: ${onboarding('free')!.toLowerCase()}`] : [])],
  }
}

/** Pro's card, Freelance or Studio, monthly or annual (Studio priced at its least seats; more are said beside). */
export function proCard(kind: 'pro_freelance' | 'pro_studio', cycle: BillingCycle): PlanCard {
  const p: PlanRow = planRow(kind)
  const seats = p.minSeats
  const credits = allowanceFor(p, seats)
  const studio = kind === 'pro_studio'
  const trial = cycle === 'monthly' && p.trialPeriodDays > 0
  return {
    key: 'pro', plan: kind, name: 'Pro', tagline: PLAN_TAGLINE.pro, price: sgd(priceFor(p, seats, cycle)), per: cycle === 'yearly' ? '/year' : '/month',
    note: studio ? `${seats} seats · ${sgd(p.monthlyPrice)} a month covers ${seats}, then ${sgd(p.extraSeatPriceCents ?? 0)} each` : '1 seat — for one person',
    annual: cycle === 'yearly' ? `${sgd(perMonthOnYearly(p, seats))} a month, saves ${sgd(yearlySaving(p, seats))}` : null,
    allowance: `${fmt(credits)} AI credits a month${studio ? ', shared by the seats' : ''}`, buys: `about ${fmt(aboutRenders(credits))} renders`,
    cta: trial ? `Start ${p.trialPeriodDays}-day free trial` : `Choose ${studio ? 'Studio' : 'Freelance'}`, href: signUpFor(kind, cycle),
    fine: trial ? `Card up front · nothing charged for ${p.trialPeriodDays} days` : 'The free trial is for monthly plans',   // Plans' own words
    popular: planRow('pro_freelance').isHighlighted || planRow('pro_studio').isHighlighted,
    list: ['Everything in Free', ...proAdds(), ...(studio ? [`More members add seats at ${sgd(p.extraSeatPriceCents ?? 0)} a month each`] : []), ...(onboarding('pro') ? [`Onboarding: ${onboarding('pro')!.toLowerCase()}`] : [])],
  }
}

/** Max's card — priced per seat with the team, so its button talks to them (Book a demo). */
export function maxCard(): PlanCard {
  const p = planRow('max')
  return {
    key: 'max', plan: 'max', name: p.name, tagline: PLAN_TAGLINE.max, price: 'Let’s talk', per: null, note: 'Priced per seat, against a signed agreement.', annual: null,
    allowance: `${fmt(p.creditAllowance)} AI credits a month, per seat`, buys: `about ${fmt(aboutRenders(p.creditAllowance))} renders`,
    cta: 'Talk to us', href: null, fine: null, popular: false,
    list: ['Everything in Pro', ...maxAdds(), ...(onboarding('max') ? [`Onboarding: ${onboarding('max')!.toLowerCase()}`] : [])],
  }
}

/** What each AI action costs — the price list's own numbers, in the words the website and the FAQ use (the Usage page keeps its labels). */
const ACTION_WORDS: { key: ActionKey; name: string; unit: string }[] = [
  { key: 'render_fast', name: 'Fast render', unit: 'a render' },
  { key: 'render_pro', name: 'High-quality render', unit: 'a render' },
  { key: 'render_defurnish', name: 'Empty a room', unit: 'a room' },
  { key: 'quote_digitize', name: 'Read a quote', unit: 'a quote' },
  { key: 'copilot_block', name: 'Meeting Copilot', unit: '10 minutes' },
]
export const ACTIONS = ACTION_WORDS.map((a) => ({ ...a, credits: CREDIT_SCHEDULE[a.key].credits }))

/** A month of AI credits, plan by plan, and what it buys (Plans' own table: Free · Pro Freelance · Pro Studio at its seats · Max per seat). */
export const MONTHS = (() => {
  const studio = planRow('pro_studio')
  return [
    { label: 'Free', credits: planRow('free').creditAllowance },
    { label: 'Pro Freelance', credits: planRow('pro_freelance').creditAllowance },
    { label: `Pro Studio, ${studio.minSeats} seats`, credits: allowanceFor(studio, studio.minSeats) },
    { label: 'Max, per seat', credits: planRow('max').creditAllowance },
  ].map((m) => { const b = buysFor(m.credits); return { ...m, renders: b.renders, quotes: b.quotes, copilot: copilotLabel(b.copilotHours) } })
})()

/** Top-ups: any amount on the grid, at one price per credit — the quick amounts priced. */
export const TOPUP = {
  line: `Top up any amount from ${fmt(TOPUP_MIN)} to ${fmt(TOPUP_MAX)} AI credits, at ${sgd(TOPUP_CENTS_PER_CREDIT * 100)} per 100. Top-ups never expire, on any plan.`,
  picks: TOPUP_PICKS.map((n) => ({ credits: fmt(n), price: sgd(topupPrice(n)) })),
}

/** The comparison as the website draws it: each cell ✓ (true), — (false) or its words. */
export const COMPARISON: { group: string; rows: { label: string; cells: [CompareCell, CompareCell, CompareCell] }[] }[] = COMPARE.map((g) => ({ group: g.group, rows: g.rows.map((r) => ({ label: r.label, cells: compareCells(r) })) }))

/** The questions: Plans' own five (one source), then the ones a visitor without a studio asks first — 1.0's pricing page's, said for 2.0. */
export const QUESTIONS: { q: string; a: string }[] = (() => {
  const free = planRow('free'), studio = planRow('pro_studio')
  const visitor = [
    { q: 'Do I need a card to start?', a: `No. Free needs no card. Pro’s ${studio.trialPeriodDays}-day free trial takes one up front and charges it only once the trial ends.` },
    { q: 'Can the whole team use Free?', a: `Yes — Free asks no seat. Its ${fmt(free.signupCreditGrant)} AI credits to start, then ${fmt(free.creditAllowance)} a month, are the studio’s, shared by everyone in it. Pro — Studio gives every seat its own month of credits, pooled for the team.` },
    { q: 'What happens to AI credits we don’t use?', a: 'A month’s credits refresh on the same day each month, and unused ones don’t carry over. Top-ups never expire — this month’s credits are used first.' },
    { q: 'Is annual cheaper?', a: `Annual is ${12 - MONTHS_FREE} months’ price for 12 — ${MONTHS_FREE === 1 ? 'one month' : `${MONTHS_FREE} months`} free.` },
  ]
  return [FAQ[0]!, visitor[0]!, FAQ[1]!, visitor[1]!, FAQ[2]!, visitor[2]!, FAQ[3]!, visitor[3]!, FAQ[4]!].filter(Boolean)
})()

/** The page's words *(invented copy — 1.0's plg page's lines, in 2.0's names; listed in steps/reg-S46D.md)*. */
export const PRICING_WORDS = {
  title: 'Everything your studio needs. Starting free.',
  lede: 'Leads, quotes, projects, the AI tools and your finances — in one place.',
  taxLine: 'Prices in S$, before GST · Cancel anytime',
  compareLink: 'Compare every feature',
  toolsTitle: 'Every tool, from day one.',
  toolsLede: 'Every plan opens every module. Pro adds the features below and a bigger month of AI credits.',
  creditsTitle: 'How AI credits work',
  creditsLede: 'AI credits pay for AI work, and nothing else. Leads, quotes, contracts and projects are never counted, on any plan — and every button shows its cost before you press it.',
  actionsTitle: 'AI credits per action',
  monthTitle: 'What a month of AI credits buys',
  topupTitle: 'Need a few more?',
  compareTitle: 'Compare plans and features',
  faqTitle: 'Questions',
  closingTitle: 'Start free. Upgrade when you’re ready.',
  closingLede: 'Try OpenMaison with your own leads and quotes, then move up when the studio needs more.',
} as const
