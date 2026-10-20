/**
 * (REG-699) What Plans shows under the cards — the website's own content (`src/app/(marketing)/pricing/pricing-data.ts` on 1.0,
 * captured 2026-09-28; C §1.4–1.6), read from one place so the app and the website never disagree (integration B-25). The one change
 * is the word: the website's "tokens" are 2.0's "AI credits" (Q-01), and FAQ answers name where things live in 2.0. Client-safe.
 */
import { planRow, sgd, topupPrice, TOPUP_MAX, TOPUP_MIN, type FeatureKey, type PlanId } from './plans'
import { CREDIT_SCHEDULE } from './schedule'

/** The comparison (C §1.5). A cell is ✓ (true), — (false) or a word. Rows 1.0 derives from `feature_flags` keep their flag. */
export type CompareCell = boolean | string
export type CompareRow = { label: string; free: CompareCell; pro: CompareCell; max: CompareCell
  /** (pending modules S19 — 1.0's rule for its pricing page: "every row that corresponds to a real gate carries its flag, its ticks are
      DERIVED from the live plan rows rather than typed") the plan lock the row describes — its cells come from the plans (`compareCells`) */
  flag?: FeatureKey }

/** A row's three cells — a gated row's from the plans' own flags (Free · Pro — Studio · Max), so the table and the locks never disagree. */
export const compareCells = (r: CompareRow): [CompareCell, CompareCell, CompareCell] =>
  r.flag ? [planRow('free').featureFlags[r.flag], planRow('pro_studio').featureFlags[r.flag], planRow('max').featureFlags[r.flag]] : [r.free, r.pro, r.max]
/* (S46D — D4, his "fix everything" 2026-10-19: the website shows pricing, from this one source) The table says only what 2.0 does, on the site
   and in Plans alike: a row that held something back 2.0 gives every plan now gives it to every plan — webhooks, turning off "Powered by
   OpenMaison", task templates, invoice paper, purchase orders and Xero are not locked on any plan (lib/credits/features.ts: the seven Pro
   features are the only locks); MYOB and Zoho Books are not 2.0's; Free has no seat limit (Company › Members never checks one); the names are
   2.0's (the client portal, the Meeting Copilot). What stays Max's is the team's service: the price book set up for you, and its onboarding. */
export const COMPARE: { group: string; rows: CompareRow[] }[] = [
  { group: 'Leads & CRM', rows: [
    { label: 'Manual lead uploads', free: true, pro: true, max: true },
    { label: 'Email lead syncing', free: true, pro: true, max: true },
    { label: 'Roles, access & permissions', free: true, pro: true, max: true },
    { label: 'WhatsApp notifications', free: false, pro: true, max: true, flag: 'whatsapp_notifications' },
    { label: 'Lead stage rules', free: false, pro: true, max: true, flag: 'custom_stages' },   // (pending modules S19) 1.0's "Custom stage definitions" — 2.0's stages are fixed; what each asks is the rule
    { label: 'Lead capture by webhook', free: true, pro: true, max: true },   // (S46D) was "Webhooks, API & custom integrations" on Max alone
  ] },
  { group: 'Quotes', rows: [
    { label: 'Quote builder & margin calculator', free: true, pro: true, max: true },
    /* (S42 D-09) one name per thing, and only what each plan keeps: Free prints every quote with the studio's default; making your own
       templates is the lock's own words (`FEATURE_WORDS.template_editor`) */
    { label: 'Quotes print with the studio’s default', free: true, pro: true, max: true },
    { label: 'My Sections (packages)', free: false, pro: true, max: true, flag: 'package_creation' },   // (pending modules S19) 2.0's name for 1.0's packages
    { label: 'Your own quote templates', free: false, pro: true, max: true, flag: 'template_editor' },
    { label: 'Internal approvals', free: false, pro: true, max: true, flag: 'internal_approvals' },
    { label: 'Quote X-Ray', free: false, pro: true, max: true, flag: 'quote_xray' },
    { label: 'Price book set up for you', free: false, pro: false, max: true },   // (S46D) 1.0's custom_pricebook — the team builds it from your catalogues; the Price book is every plan's
    { label: 'Turn off “Powered by OpenMaison”', free: true, pro: true, max: true },   // (S46D) was "Remove OpenMaison branding" on Max alone — the client view's switch
  ] },
  { group: 'Projects & tasks', rows: [
    { label: 'Project schedules & client portal', free: true, pro: true, max: true },   // (S46D) 2.0's names
    { label: 'Floor plan coordination', free: true, pro: true, max: true },
    { label: 'Task templates', free: true, pro: true, max: true },
    { label: 'Invoice paper in your brand', free: true, pro: true, max: true },   // (S46D) Settings › Finance › Invoice paper
  ] },
  { group: 'Finance', rows: [
    { label: 'Project & studio-level reporting', free: true, pro: true, max: true },
    { label: 'Expense management', free: false, pro: true, max: true, flag: 'expense_management' },
    { label: 'Purchase orders', free: true, pro: true, max: true },
    { label: 'Xero', free: true, pro: true, max: true },   // (S46D) 2.0's one accounting link (Company › Integrations)
  ] },
  { group: 'AI tools', rows: [
    { label: 'AI Visualizer, renders & restyling', free: 'AI credits', pro: 'AI credits', max: 'AI credits' },
    { label: 'Reading quotes', free: 'AI credits', pro: 'AI credits', max: 'AI credits' },
    { label: 'Meeting Copilot', free: '1 meeting', pro: 'AI credits', max: 'AI credits' },
    { label: 'Maison AI', free: true, pro: true, max: true },   // (S42 D-09, the same fault) a question to Maison AI costs nothing on any plan — 1.0 never metered chat, and 2.0's schedule has no price for it
  ] },
  { group: 'Team', rows: [
    { label: 'Seats', free: 'Any number', pro: '1, or 3+ on Studio', max: 'Per seat' },   // (S46D) Free asks no seat — its month is the studio's
    { label: 'Onboarding', free: 'Self-serve', pro: 'Guided', max: 'Small-group & on demand' },
  ] },
]

/** What a month of AI credits comes to (C §1.4) — (S46D) read off the one price list, never a second table of prices: Fast renders, quotes read,
    hours of the Meeting Copilot (six ten-minute blocks); `highRenders` and `rooms` for the website's own figures. */
export const buysFor = (credits: number) => ({
  renders: Math.floor(credits / CREDIT_SCHEDULE.render_fast.credits),
  quotes: Math.floor(credits / CREDIT_SCHEDULE.quote_digitize.credits),
  copilotHours: credits / (CREDIT_SCHEDULE.copilot_block.credits * 6),
  highRenders: Math.floor(credits / CREDIT_SCHEDULE.render_pro.credits),
  rooms: Math.floor(credits / CREDIT_SCHEDULE.render_defurnish.credits),
})
export const copilotLabel = (hours: number): string => (hours >= 1 ? `${Number.isInteger(hours) ? hours : hours.toFixed(1)} h` : `${Math.round(hours * 60)} min`)

/* (S46D) the prices an answer names are read off the one price list and the plans, never typed — the website shows these answers too */
const credit = (k: keyof typeof CREDIT_SCHEDULE) => fmt(CREDIT_SCHEDULE[k].credits)
const fmt = (n: number) => n.toLocaleString('en-SG')
const TRIAL_DAYS = planRow('pro_studio').trialPeriodDays
const STUDIO = planRow('pro_studio')
const count = (n: number) => ['one', 'two', 'three', 'four', 'five', 'six'][n - 1] ?? fmt(n)

/** The FAQ a signed-in owner needs (Q-11: the website's 1 · 3 · 4 · 5 · 6). */
export const FAQ: { q: string; a: string }[] = [
  { q: 'What is an AI credit?', a: `A unit of AI. A Fast render is ${credit('render_fast')}, a High-quality render is ${credit('render_pro')}, reading a quote is ${credit('quote_digitize')}, and ten minutes of the Meeting Copilot is ${credit('copilot_block')}. Every button shows its cost before you press it, so nothing is spent by surprise. Everything that is not AI — leads, quotes, contracts, projects — is not counted on any plan.` },
  { q: 'Is there a free trial of Pro?', a: `Yes — ${TRIAL_DAYS} days on monthly Pro, Freelance or Studio. The card is taken up front and charged only after the trial ends; cancel before then and you pay nothing. You get Pro’s full AI credits during the trial. One trial per studio; annual plans don’t include one.` },
  { q: 'What happens when we run out?', a: `The AI tools pause; nothing else does. Leads, quotes and projects keep working, and viewing or sharing past renders never costs anything. Top up any amount from ${fmt(TOPUP_MIN)} to ${fmt(TOPUP_MAX)} AI credits at ${sgd(topupPrice(100))} per 100, or move up a plan — top-ups never expire. The Owner can also turn on auto top-up in Company › Plan & AI credits.` },
  { q: `Why is Studio ${count(STUDIO.minSeats)} seats?`, a: `Studio is priced for a team: it starts at ${count(STUDIO.minSeats)} seats and shares their AI credits across everyone, so any designer can draw from the same month. Extra seats are ${sgd(STUDIO.extraSeatPriceCents ?? 0)} each a month. If you work alone, Freelance is the same product at one seat.` },
  { q: 'Can we change plans later?', a: 'Anytime, in either direction. Upgrades start at once; downgrades and cancelling take effect at the end of the period you have paid for, and your top-ups stay. Change it from Company › Plan & AI credits.' },
]

/** The allowance table's rows (C §1.4), for the plans Plans shows. */
export const ALLOWANCE_ROWS: { id: PlanId | 'studio_seats'; label: string }[] = [
  { id: 'free', label: 'Free' }, { id: 'pro_freelance', label: 'Pro Freelance' }, { id: 'studio_seats', label: 'Pro Studio' }, { id: 'max', label: 'Max, per seat' },
]
