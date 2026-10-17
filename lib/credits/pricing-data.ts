/**
 * (REG-699) What Plans shows under the cards — the website's own content (`src/app/(marketing)/pricing/pricing-data.ts` on 1.0,
 * captured 2026-09-28; C §1.4–1.6), read from one place so the app and the website never disagree (integration B-25). The one change
 * is the word: the website's "tokens" are 2.0's "AI credits" (Q-01), and FAQ answers name where things live in 2.0. Client-safe.
 */
import { planRow, type FeatureKey, type PlanId } from './plans'

/** The comparison (C §1.5). A cell is ✓ (true), — (false) or a word. Rows 1.0 derives from `feature_flags` keep their flag. */
export type CompareCell = boolean | string
export type CompareRow = { label: string; free: CompareCell; pro: CompareCell; max: CompareCell
  /** (pending modules S19 — 1.0's rule for its pricing page: "every row that corresponds to a real gate carries its flag, its ticks are
      DERIVED from the live plan rows rather than typed") the plan lock the row describes — its cells come from the plans (`compareCells`) */
  flag?: FeatureKey }

/** A row's three cells — a gated row's from the plans' own flags (Free · Pro — Studio · Max), so the table and the locks never disagree. */
export const compareCells = (r: CompareRow): [CompareCell, CompareCell, CompareCell] =>
  r.flag ? [planRow('free').featureFlags[r.flag], planRow('pro_studio').featureFlags[r.flag], planRow('max').featureFlags[r.flag]] : [r.free, r.pro, r.max]
export const COMPARE: { group: string; rows: CompareRow[] }[] = [
  { group: 'Leads & CRM', rows: [
    { label: 'Manual lead uploads', free: true, pro: true, max: true },
    { label: 'Email lead syncing', free: true, pro: true, max: true },
    { label: 'Roles, access & permissions', free: true, pro: true, max: true },
    { label: 'WhatsApp notifications', free: false, pro: true, max: true, flag: 'whatsapp_notifications' },
    { label: 'Lead stage rules', free: false, pro: true, max: true, flag: 'custom_stages' },   // (pending modules S19) 1.0's "Custom stage definitions" — 2.0's stages are fixed; what each asks is the rule
    { label: 'Webhooks, API & custom integrations', free: false, pro: false, max: true },
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
    { label: 'Custom price book & catalogue', free: false, pro: false, max: true },
    { label: 'Remove OpenMaison branding', free: false, pro: false, max: true },
  ] },
  { group: 'Projects & tasks', rows: [
    { label: 'Gantt tracking & homeowner portal', free: true, pro: true, max: true },
    { label: 'Floor plan coordination', free: true, pro: true, max: true },
    { label: 'Task templates', free: false, pro: true, max: true },
    { label: 'Custom invoice templates', free: false, pro: true, max: true },
  ] },
  { group: 'Finance', rows: [
    { label: 'Project & studio-level reporting', free: true, pro: true, max: true },
    { label: 'Expense management', free: false, pro: true, max: true, flag: 'expense_management' },
    { label: 'Purchase orders', free: false, pro: false, max: true },
    { label: 'Xero, MYOB & ZohoBooks', free: false, pro: false, max: true },
  ] },
  { group: 'AI tools', rows: [
    { label: 'AI Visualizer, renders & restyling', free: 'AI credits', pro: 'AI credits', max: 'AI credits' },
    { label: 'Reading quotes', free: 'AI credits', pro: 'AI credits', max: 'AI credits' },
    { label: 'Meeting Co-Pilot', free: '1 meeting', pro: 'AI credits', max: 'AI credits' },
    { label: 'Maison AI', free: true, pro: true, max: true },   // (S42 D-09, the same fault) a question to Maison AI costs nothing on any plan — 1.0 never metered chat, and 2.0's schedule has no price for it
  ] },
  { group: 'Team', rows: [
    { label: 'Seats', free: '1', pro: '1, or 3+ on Studio', max: 'Per seat' },
    { label: 'Onboarding', free: 'Self-serve', pro: 'Guided', max: 'Small-group & on demand' },
  ] },
]

/** What a month of AI credits comes to (C §1.4): renders = ÷10, quotes read = ÷5, Co-Pilot hours = ÷150. */
export const buysFor = (credits: number) => ({ renders: Math.floor(credits / 10), quotes: Math.floor(credits / 5), copilotHours: credits / 150 })
export const copilotLabel = (hours: number): string => (hours >= 1 ? `${Number.isInteger(hours) ? hours : hours.toFixed(1)} h` : `${Math.round(hours * 60)} min`)

/** The FAQ a signed-in owner needs (Q-11: the website's 1 · 3 · 4 · 5 · 6). */
export const FAQ: { q: string; a: string }[] = [
  { q: 'What is an AI credit?', a: 'A unit of AI. A Fast render is 10, a High-quality render is 20, reading a quote is 5, and ten minutes of Meeting Co-Pilot is 25. Every button shows its cost before you press it, so nothing is spent by surprise. Everything that is not AI — leads, quotes, contracts, projects — is not counted on any plan.' },
  { q: 'Is there a free trial of Pro?', a: 'Yes — 14 days on monthly Pro, Freelance or Studio. The card is taken up front and charged only after the trial ends; cancel before then and you pay nothing. You get Pro’s full AI credits during the trial. One trial per studio; annual plans don’t include one.' },
  { q: 'What happens when we run out?', a: 'The AI tools pause; nothing else does. Leads, quotes and projects keep working, and viewing or sharing past renders never costs anything. Top up any amount from 100 to 5,000 AI credits at S$2 per 100, or move up a plan — top-ups never expire. The Owner can also turn on auto top-up in Company › Plan & AI credits.' },
  { q: 'Why is Studio three seats?', a: 'Studio is priced for a team: it starts at three seats and shares their AI credits across everyone, so any designer can draw from the same month. Extra seats are S$35 each a month. If you work alone, Freelance is the same product at one seat.' },
  { q: 'Can we change plans later?', a: 'Anytime, in either direction. Upgrades start at once; downgrades and cancelling take effect at the end of the period you have paid for, and your top-ups stay. Change it from Company › Plan & AI credits.' },
]

/** The allowance table's rows (C §1.4), for the plans Plans shows. */
export const ALLOWANCE_ROWS: { id: PlanId | 'studio_seats'; label: string }[] = [
  { id: 'free', label: 'Free' }, { id: 'pro_freelance', label: 'Pro Freelance' }, { id: 'studio_seats', label: 'Pro Studio' }, { id: 'max', label: 'Max, per seat' },
]
