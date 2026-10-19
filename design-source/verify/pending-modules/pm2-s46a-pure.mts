// S46A · the pure parts (no server, no database): ⌘K's own pageHits / createHits run on 1.0's labels — every word the findability audit's four
// raw reports name (design-source/context/parity/31-findability-audit-2026-10-19/raw/1…4) — per role; the filler words; the other lines' grading;
// the old addresses' rules (plg's / UHD's fixed rows, plg's personal ?section=, the three open tools by who opens them); G I · G E as quiet aliases.
// Run: npx tsx design-source/verify/pending-modules/pm2-s46a-pure.mts   (verify-pm2-s46a.cjs runs it and counts its checks)
import { CREATE, PAGES, createHits, pageHits, rankOf, termsOf } from '../../../lib/global-search/model.ts'
import { OLD_ACCOUNTS_TABS, OLD_ADDRESSES, OLD_REDIRECTS, oldQueryTarget, oldToolTarget } from '../../../lib/links/old-addresses.ts'
import { GO, GO_ALIASES, KEYS, goFor } from '../../../lib/keys/registry.ts'

let pass = 0, fail = 0
const ok = (cond: boolean, name: string) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }

type Role = 'owner' | 'admin' | 'designer' | 'accounting' | 'marketing'
const FLAGS: Record<Role, { owner?: boolean; member?: boolean; accounting?: boolean; marketing?: boolean }> = {
  owner: { owner: true }, admin: {}, designer: { member: true }, accounting: { accounting: true }, marketing: { marketing: true },
}
/** What ⌘K shows for `q` under All: the four Go to rows (global-search.tsx's cap) and the Create rows. */
const shown = (q: string, r: Role) => [...pageHits(q, FLAGS[r]).slice(0, 4).map((h) => h.id), ...createHits(q, FLAGS[r]).map((h) => h.id)]
const title = (id: string) => [...PAGES, ...CREATE].find((p) => p.id === id)?.title ?? id

/** [1.0's word, the rows any one of which must be shown, roles] */
type Case = [string, string[], Role[]?]
const T: Case[] = [
  /* raw 1 · the shell (N-1 · N-3 · N-4) */
  ['escalations', ['tickets']], ['escalation', ['tickets']], ['tickets', ['tickets']], ['issues', ['tickets']], ['defects', ['tickets']], ['complaints', ['tickets']],
  ['new ticket', ['create-ticket']], ['log ticket', ['create-ticket']], ['raise a ticket', ['create-ticket']], ['support ticket', ['tickets']],
  ['chats', ['messages']], ['inbox', ['messages']], ['operations', ['company-finance']], ['finance operations', ['company-finance']], ['pipeline', ['finance-profitability']],
  ['commissions', ['finance-commissions']], ['vendors', ['finance-vendors']], ['quote digitizer', ['create-upload-quote']], ['digitizer', ['create-upload-quote']],
  ['digitize', ['create-upload-quote']], ['upload a quote', ['create-upload-quote']], ['xray', ['xray']], ['x-ray', ['xray']], ['visualiser', ['visualizer']],
  ['isometric', ['create-picture', 'planner']], ['3-d space planner', ['planner']], ['3-d', ['planner']], ['homeowner portal', ['company-portal']], ['homeowner', ['company-portal']],
  ['qanvast leads', ['qanvast']], ['reviews & rankings', ['qanvast-reviews']], ['reviews and rankings', ['qanvast-reviews']], ['contractors', ['projects-contractors']],
  ['accounts setup', ['settings-studio']], ['accounts', ['settings-studio']], ['settings', ['profile']], ['my settings', ['profile']], ['personal settings', ['profile']],
  ['usage', ['co-usage']], ['usage & credits', ['co-usage']], ['usage and credits', ['co-usage']], ['preferences', ['open-to-leads']], ['lead preferences', ['open-to-leads']],
  ['approvals', ['dashboard']], ['approve', ['dashboard']], ['start meeting', ['create-meeting']], ['new meeting', ['create-meeting']], ['start a meeting', ['create-meeting']],
  /* raw 2 · leads, settings, accounts (L-5 · REG-812's eight cards) */
  ['response time', ['insights']], ['archived leads', ['lost-leads']], ['deleted leads', ['deleted-leads']], ['kanban', ['leads']], ['legal entities', ['co-bank']],
  ['roles & permissions', ['set-roles', 'settings-studio']], ['cost & margin visibility', ['set-cost-visibility']], ['document templates', ['company-templates']],
  ['signing documents', ['templates-contracts']], ['packages', ['company-price-book']], ['quote approval rules', ['set-approval']], ['workflow rules', ['set-approvals']],
  ['feature flags', ['co-registrations']], ['proactive alerts', ['set-schedule']], ['alerts lead time', ['set-schedule']], ['project types', ['settings-projects']],
  ['timeline templates', ['templates-schedules']], ['timeline', ['templates-schedules']], ['pipeline stages', ['set-stages']], ['material catalog', ['company-materials']],
  ['escalation categories', ['set-ticket-categories']], ['project & payments', ['templates-payments']], ['commission & payouts', ['finance-commissions']], ['payouts', ['finance-commissions']],
  ['po settings', ['set-costs', 'set-po-paper']], ['studio branding', ['templates-brand']], ['branding', ['templates-brand']], ['accreditations', ['co-registrations']],
  ['ticket categories', ['set-ticket-categories']], ['stages and handover', ['set-handover']], ['schedule', ['set-schedule']], ['alerts', ['set-schedule']],
  ['project numbers', ['set-project-numbers']], ['new quotes start with', ['set-new-quotes']], ['messages to clients', ['set-client-messages']], ['sent messages', ['set-sent-messages']],
  ['untouched leads', ['set-untouched']], ['who may change the payment schedule', ['set-payments']],
  /* raw 3 · projects, finance, portal (P-2 · P-3) */
  ['invoices', ['finance-money-in']], ['invoice', ['finance-money-in']], ['vos', ['finance-money-in']], ['contract/vo', ['finance-money-in']], ['record payment', ['finance-money-in']],
  ['pos', ['finance-pos']], ['quote-to-cash', ['finance-profitability']], ['comparative', ['finance-profitability']], ['my commission', ['finance-commissions']],
  ['revenue', ['finance-reports']], ['gst report', ['finance-reports']], ['deleted projects', ['deleted-projects']], ['archived projects', ['completed-projects']],
  ['renders', ['visualizer']], ['photo renders', ['visualizer']], ['preview as homeowner', ['co-portal-clients']], ['close project', ['project-handover']], ['closure', ['project-handover']],
  ['selections', ['project-choices']], ['choices', ['project-choices']],
  /* raw 4 · tools (T-1 · T-4 · T-7) */
  ['copilot analytics', ['meetings-reports']], ['meeting insights', ['meetings-reports']], ['quote rules', ['company-price-book']],
  /* every role sees its own pages only */
  ['invoices', ['finance-money-in'], ['admin', 'accounting']], ['tickets', ['tickets'], ['admin', 'designer']], ['upload a quote', ['create-upload-quote'], ['admin', 'designer']],
  ['start a meeting', ['create-meeting'], ['designer']], ['new ticket', ['create-ticket'], ['designer']], ['approvals', ['dashboard'], ['designer', 'marketing']], ['settings', ['profile'], ['designer', 'accounting', 'marketing']],
]
console.log('⌘K finds 1.0’s words (pageHits / createHits — Go to’s four rows and Create)')
for (const [q, want, roles = ['owner']] of T) for (const r of roles) { const ids = shown(q, r); ok(want.some((w) => ids.includes(w)), `[${r}] “${q}” → ${want.map(title).join(' or ')}${ids.length ? '' : ' (nothing shown)'}`) }

console.log('…and never past a role’s own pages')
for (const r of ['accounting', 'marketing'] as Role[]) {
  for (const q of ['escalations', 'tickets', 'new ticket', 'upload a quote', 'start a meeting', 'close project', 'choices', 'deleted projects']) {
    const ids = shown(q, r)
    ok(!ids.some((i) => ['tickets', 'create-ticket', 'create-upload-quote', 'create-meeting', 'project-handover', 'project-choices', 'deleted-projects', 'completed-projects'].includes(i)), `[${r}] “${q}” offers none of the studio’s project or quote rows`)
  }
}
ok(pageHits('usage', FLAGS.owner)[0]?.id === 'co-usage', '“usage” → Plan & AI credits › Usage first (plg’s Usage & credits), Studio health after it')
ok(pageHits('invoices', FLAGS.owner).slice(0, 2).some((h) => h.id === 'finance-money-in'), '“invoices” → Money in second to the Invoices card, before Plan and the Settings that mention invoices (P-2)')
ok(pageHits('approvals', FLAGS.owner)[0]?.id === 'dashboard', '“approvals” → the Dashboard first, where they gather (L-2)')
ok(pageHits('tickets', FLAGS.owner)[0]?.id === 'tickets', '“tickets” → Projects › Tickets first')
ok(createHits('', FLAGS.owner).length === 5 && !createHits('', FLAGS.owner).some((h) => ['create-upload-quote', 'create-ticket', 'create-meeting'].includes(h.id)), 'the empty search’s Create keeps its five rows — the new three wait for a typed word')
ok(createHits('upload a quote', FLAGS.owner)[0]?.id === 'create-upload-quote' && CREATE.find((c) => c.id === 'create-upload-quote')?.href === '/quotes?upload=1', 'Create › Upload a quote leads, opening Tools › Quotes on Upload a quote (?upload=1)')
/* (S46 — REG-2524, a deliberate change of this rule: Tickets is a rail place at /tickets, as Tasks is — her ask 2026-10-19) */
ok(CREATE.find((c) => c.id === 'create-ticket')?.href === '/tickets?new=1', 'Create › New ticket opens Tickets’ New ticket (?new=1)')
ok(CREATE.find((c) => c.id === 'create-meeting')?.pick === 'Start a meeting now' && CREATE.find((c) => c.id === 'create-meeting')?.href === '/meetings', 'Create › Start a meeting presses New Meeting ▾ › Start a meeting now on Meetings')

console.log('The words that are no word (T-1), and the other lines’ grading (P-2)')
ok(termsOf('upload a quote').join(' ') === 'upload quote', '“upload a quote” looks for “upload” and “quote” — never “a”')
ok(termsOf('reviews & rankings').join(' ') === 'reviews rankings' && termsOf('usage and credits').join(' ') === 'usage credits', 'a bare “&” and the joining “and” are let go')
ok(termsOf('a').join(' ') === 'a' && termsOf('&').join(' ') === '&', '…but a lone one still searches')
/* (S46 closing regression, REG-1841 — a deliberate change of this rule) a number joined to one letter by a hyphen is read as one word: "3-d" → "3d" */
ok(termsOf('p&l').join(' ') === 'p&l' && termsOf('3-d').join(' ') === '3d' && termsOf('blk 9').join(' ') === 'blk 9', 'a word with a mark in it stays, 1.0’s hyphenated 3D reads as 3d, and a lone digit stays')
ok(rankOf('upload a quote', 'Your signature', ['Your profile · drawn, typed or a picture — it prints on the quotes you prepare', 'signature sign my signature draw typed upload']) !== null
  && (rankOf('upload a quote', 'Upload a quote', []) ?? 0) > (rankOf('upload a quote', 'Your signature', ['it prints on the quotes you prepare', 'upload']) ?? 0), 'Upload a quote outranks Your signature for “upload a quote”')
const whole = rankOf('pos', 'X', ['po pos purchase order']) ?? 0, part = rankOf('pos', 'Y', ['deposit']) ?? 0, start = rankOf('pos', 'Z', ['position']) ?? 0
ok(whole > start && start > part && part > 0, `in the other lines: the word itself (${whole}) > a word starting with it (${start}) > a word holding it (${part})`)

console.log('Old addresses (D1 · D3)')
const fixed = new Map(OLD_REDIRECTS.map((r) => [r.source, r.destination]))
for (const [from, to] of [['/settings/usage', '/company/plan'], ['/tools/quotes', '/quotes'], ['/company/settings', '/settings?section=studio'], ['/company/settings/quotes', '/settings?section=quotes'],
  ['/leads/settings', '/settings?section=leads'], ['/company/profile/brand-kit', '/company/templates/brand'], ['/company/templates/tasks/:id', '/templates/tasks/:id'],
  ['/visualizer/materials', '/company/materials'], ['/billing/return', '/company/plan/billing'], ['/contractors', '/projects?view=workload&of=contractors'], ['/escalations/new', '/tickets?new=1'], ['/projects/tickets', '/tickets'], ['/escalations', '/tickets']] as const) {
  ok(fixed.get(from) === to, `${from} → ${to}`)
}
ok(OLD_ADDRESSES.some((a) => a.from === '/sign/document/:token' && a.by === 'route'), '/sign/document/:token is a route of its own (S46D’s notice) — never a fixed redirect')
ok(!['/tools/ai-visualizer', '/tools/quote-xray', '/tools/quote-digitizer'].some((f) => fixed.has(f)) && ['/tools/ai-visualizer', '/tools/quote-xray', '/tools/quote-digitizer'].every((f) => OLD_ADDRESSES.find((a) => a.from === f)?.by === 'proxy'), 'plg’s three open tools are the proxy’s — they depend on who opens them')
ok(OLD_ACCOUNTS_TABS['cost-visibility'] === '/settings?section=studio#cost-visibility', '/accounts?tab=cost-visibility → its card on Roles & access')
const q = (s: string) => new URLSearchParams(s)
for (const [sec, to] of [['email', '/company/integrations#gmail'], ['profile', '/profile#details'], ['my-signature', '/profile#signature'], ['usage-credits', '/company/plan'], ['lead-preferences', '/profile'], ['interface', '/profile'], ['guided-tours', '/profile']] as const) {
  ok(oldQueryTarget('/settings', q(`section=${sec}`)) === to, `plg’s /settings?section=${sec} → ${to}`)
}
ok(['studio', 'leads', 'meetings', 'projects', 'quotes', 'finance', 'notifications', ''].every((m) => oldQueryTarget('/settings', q(m ? `section=${m}` : '')) === null), '2.0’s own Settings modules (and plg’s “notifications”, the same name) are left as they are')
const on = { visualizer: true, tools: true }, off = { visualizer: false, tools: false }
ok(oldToolTarget('/tools/ai-visualizer', true, on) === '/site/try' && oldToolTarget('/tools/quote-xray', true, on) === '/site/try/quote-x-ray' && oldToolTarget('/tools/quote-digitizer', true, on) === '/site/try/upload-a-quote', 'a visitor lands on the website’s free try of each tool')
ok(oldToolTarget('/tools/ai-visualizer', false, on) === '/visualizer' && oldToolTarget('/tools/quote-xray', false, on) === '/quote-x-ray' && oldToolTarget('/tools/quote-digitizer', false, on) === '/quotes', 'a member lands on the tool')
ok(oldToolTarget('/tools/ai-visualizer', true, off) === '/visualizer' && oldToolTarget('/tools/quote-digitizer', true, { visualizer: true, tools: false }) === '/quotes', 'a trial switched off sends the visitor where a member goes (its page asks them to sign in)')
ok(oldToolTarget('/tools/ai-visualizer/', true, on) === '/site/try' && oldToolTarget('/tools/floor-plan', true, on) === null && oldToolTarget('/leads', true, on) === null, 'a trailing slash is the same address; the other tools and /leads are not this rule’s')

/* (S46 — REG-2524, a deliberate change of this rule: Tickets is a rail place at /tickets, as Tasks is — her ask 2026-10-19): G then E is a listed key now; G then I stays the one quiet alias */
console.log('Keys (H1): G then I quiet, G then E listed')
ok(goFor('i')?.href === '/chat' && goFor('e')?.href === '/tickets', 'G then I → Messages; G then E → Tickets')
ok(!GO.some((g) => g.key === 'i') && !KEYS.some((k) => k.keys === 'g i') && GO.some((g) => g.key === 'e' && g.href === '/tickets') && KEYS.some((k) => k.keys === 'g e' && k.id === 'go.tickets'), '…G then I is listed neither in the G hint nor in the ? panel; G then E is in both')
ok(goFor('m')?.href === '/chat' && goFor('d')?.href === '/dashboard' && GO_ALIASES.length === 1, 'the other listed keys are unchanged')

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
