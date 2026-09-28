/**
 * (REG-699) What Plans shows under the cards — the website's own content (`src/app/(marketing)/pricing/pricing-data.ts` on 1.0,
 * captured 2026-09-28; C §1.4–1.6), read from one place so the app and the website never disagree (integration B-25). The one change
 * is the word: the website's "tokens" are 2.0's "AI credits" (Q-01), and FAQ answers name where things live in 2.0. Client-safe.
 */
import type { PlanId } from './plans'

/** The comparison (C §1.5). A cell is ✓ (true), — (false) or a word. Rows 1.0 derives from `feature_flags` keep their flag. */
export type CompareCell = boolean | string
export type CompareRow = { label: string; free: CompareCell; pro: CompareCell; max: CompareCell }
export const COMPARE: { group: string; rows: CompareRow[] }[] = [
  { group: 'Leads & CRM', rows: [
    { label: 'Manual lead uploads', free: true, pro: true, max: true },
    { label: 'Email lead syncing', free: true, pro: true, max: true },
    { label: 'Roles, access & permissions', free: true, pro: true, max: true },
    { label: 'WhatsApp notifications', free: false, pro: true, max: true },
    { label: 'Custom stage definitions', free: false, pro: true, max: true },
    { label: 'Webhooks, API & custom integrations', free: false, pro: false, max: true },
  ] },
  { group: 'Quotes', rows: [
    { label: 'Quote builder & margin calculator', free: true, pro: true, max: true },
    { label: 'Quote templates', free: true, pro: true, max: true },
    { label: 'Package creation', free: false, pro: true, max: true },
    { label: 'Template editor', free: false, pro: true, max: true },
    { label: 'Internal approvals', free: false, pro: true, max: true },
    { label: 'Quote X-Ray', free: false, pro: true, max: true },
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
    { label: 'Expense management', free: false, pro: true, max: true },
    { label: 'Purchase orders', free: false, pro: false, max: true },
    { label: 'Xero, MYOB & ZohoBooks', free: false, pro: false, max: true },
  ] },
  { group: 'AI tools', rows: [
    { label: 'AI Visualizer, renders & restyling', free: 'AI credits', pro: 'AI credits', max: 'AI credits' },
    { label: 'Reading quotes', free: 'AI credits', pro: 'AI credits', max: 'AI credits' },
    { label: 'Meeting Co-Pilot', free: '1 meeting', pro: 'AI credits', max: 'AI credits' },
    { label: 'Maison AI', free: 'AI credits', pro: 'AI credits', max: 'AI credits' },
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
  { q: 'What happens when we run out?', a: 'The AI tools pause; nothing else does. Leads, quotes and projects keep working, and viewing or sharing past renders never costs anything. Top up 1,000 AI credits for S$20, or move up a plan — top-ups never expire.' },
  { q: 'Why is Studio three seats?', a: 'Studio is priced for a team: it starts at three seats and shares their AI credits across everyone, so any designer can draw from the same month. Extra seats are S$35 each a month. If you work alone, Freelance is the same product at one seat.' },
  { q: 'Can we change plans later?', a: 'Anytime, in either direction. Upgrades start at once; downgrades and cancelling take effect at the end of the period you have paid for, and your top-ups stay. Change it from Company › Plan & AI credits.' },
]

/** The allowance table's rows (C §1.4), for the plans Plans shows. */
export const ALLOWANCE_ROWS: { id: PlanId | 'studio_seats'; label: string }[] = [
  { id: 'free', label: 'Free' }, { id: 'pro_freelance', label: 'Pro Freelance' }, { id: 'studio_seats', label: 'Pro Studio' }, { id: 'max', label: 'Max, per seat' },
]
