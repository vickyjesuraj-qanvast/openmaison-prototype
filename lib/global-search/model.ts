import { COMPANY_GROUPS, TEMPLATE_KINDS } from '@/lib/company/sections'
import { SETTINGS_MODULES, settingsHref } from '@/lib/settings/modules'

/**
 * (REG-709, owner 2026-09-28: "this search is a global prototype search … a popover window like what we have for company tab with a search
 * bar and the results shows within") The global search's model — pure and client-safe: what a result is, the scopes, how a record ranks
 * against what was typed (the house rule of REG-274 — it matches when the words appear in the text the result shows, a phone number digit
 * to digit — with every word of the query needing a match), the pieces of a line to mark, and the pages "Jump to" offers.
 */
export type SearchKind = 'lead' | 'quote' | 'xray' | 'contract' | 'task' | 'note' | 'file' | 'design' | 'template' | 'book' | 'material' | 'member' | 'page' | 'create'

/** One result: its line, the line under it, a chip (a stage, a status), where it opens, and how it is drawn. */
export type SearchHit = {
  kind: SearchKind
  id: string
  title: string
  sub: string
  chip?: string | null
  href: string
  icon: string
  /** a member: their initial on their colour (the house Avatar) */
  person?: { name: string; color?: string | null } | null
  rank: number
}
export type SearchGroup = { kind: SearchKind; label: string; total: number; hits: SearchHit[] }
export type SearchResult = { query: string; scope: SearchScope; groups: SearchGroup[] }

/** The scope chips, in the order they read; each names the kinds it holds. */
export const SCOPES = [
  { key: 'all', label: 'All', kinds: [] as SearchKind[] },
  { key: 'leads', label: 'Leads', kinds: ['lead'] as SearchKind[] },
  { key: 'quotes', label: 'Quotes', kinds: ['quote', 'xray'] as SearchKind[] },
  { key: 'contracts', label: 'Contracts', kinds: ['contract'] as SearchKind[] },
  { key: 'tasks', label: 'Tasks', kinds: ['task'] as SearchKind[] },
  { key: 'notes', label: 'Notes & Logs', kinds: ['note'] as SearchKind[] },
  { key: 'files', label: 'Files', kinds: ['file'] as SearchKind[] },
  { key: 'designs', label: 'Designs', kinds: ['design'] as SearchKind[] },
  { key: 'library', label: 'Templates & Price book', kinds: ['template', 'book', 'material'] as SearchKind[] },
  { key: 'people', label: 'People', kinds: ['member'] as SearchKind[] },
] as const
export type SearchScope = (typeof SCOPES)[number]['key']
export const isScope = (v: string): v is SearchScope => SCOPES.some((s) => s.key === v)
export const scopeOf = (kind: SearchKind): SearchScope => SCOPES.find((s) => (s.kinds as readonly SearchKind[]).includes(kind))?.key ?? 'all'

/** Each group's heading and the order the groups read in. */
export const KIND_LABEL: Record<SearchKind, string> = {
  lead: 'Leads', quote: 'Quotes', xray: 'Quote X-Ray', contract: 'Contracts', task: 'Tasks', note: 'Notes & Logs', file: 'Files',
  design: 'AI Visualizer', template: 'Templates', book: 'Price book', material: 'Materials', member: 'People', page: 'Go to', create: 'Create',
}
export const KIND_ORDER: SearchKind[] = ['lead', 'quote', 'contract', 'task', 'note', 'file', 'xray', 'design', 'template', 'book', 'material', 'member', 'page']

/** How many results a group shows under All before "Show all"; a scope shows up to `SCOPE_LIMIT`. */
export const ALL_LIMIT = 4
export const SCOPE_LIMIT = 40

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const digits = (s: string) => s.replace(/\D/g, '')
/**
 * (UX audit L11) A number typed as caller ID shows it — "+65 9123 4599", "65 9123 4599", "9123-4599" — is one number: the country code and
 * the spaces go, so it finds the lead's eight digits. A longer run of digits (an account number) is left as it is.
 */
export function phoneQuery(q: string): string {
  return q.replace(/(?<!\d)(?:\+?\s*65[\s-]*)?(\d(?:[\s-]*\d){7})(?!\d)/g, (_m, num: string) => ` ${digits(num)} `).replace(/\s+/g, ' ').trim()
}
export const termsOf = (q: string) => phoneQuery(q).toLowerCase().split(/\s+/).map((t) => t.trim()).filter(Boolean)
/** A term as it is looked for in a line: a long number also where it is written in groups ("9123 4599"). */
const termPattern = (t: string) => (/^\d{6,}$/.test(t) ? t.split('').join('[\\s-]?') : esc(t))

/**
 * How well a record answers the query, or null when it does not: every word must appear in the title, in another line it shows, or (a word
 * carrying a digit) in a phone number digit to digit. A title that starts with the word ranks above one where a word starts with it, above
 * one that merely contains it, above a match elsewhere; the whole query as the whole title ranks first.
 */
export function rankOf(query: string, title: string, others: (string | null | undefined)[] = [], phones: (string | null | undefined)[] = []): number | null {
  const terms = termsOf(query)
  if (!terms.length) return null
  const t = title.toLowerCase()
  const rest = others.filter((o): o is string => !!o).map((o) => o.toLowerCase())
  const nums = phones.filter((p): p is string => !!p).map(digits)
  let score = 0, inTitle = 0
  for (const term of terms) {
    const d = digits(term)
    if (t.startsWith(term)) { score += 30; inTitle++ }
    else if (new RegExp(`(^|[^a-z0-9])${esc(term)}`).test(t)) { score += 22; inTitle++ }
    else if (t.includes(term)) { score += 14; inTitle++ }
    else if (rest.some((o) => o.includes(term))) score += 6
    else if (d.length > 0 && d.length === term.replace(/[\s+()-]/g, '').length && nums.some((n) => n.includes(d))) score += 10
    else return null
  }
  if (t === query.trim().toLowerCase()) score += 40
  /* (UX audit V9) titles before blurbs: a result whose own name holds every word outranks one found through the line under it */
  if (inTitle === terms.length) score += 100
  return score
}

/** A line cut where the query's words appear, for marking them. */
export function marks(text: string, query: string): { text: string; hit: boolean }[] {
  const terms = termsOf(query).filter((t) => t.length > 0).sort((a, b) => b.length - a.length)
  if (!terms.length || !text) return [{ text, hit: false }]
  const alt = terms.map(termPattern).join('|')
  const re = new RegExp(`(${alt})`, 'gi'), whole = new RegExp(`^(?:${alt})$`, 'i')
  return text.split(re).filter((p) => p !== '').map((p) => ({ text: p, hit: whole.test(p) }))
}

/** The pages "Go to" offers, from the places the app already names them (the rail, Tools, Company, Templates, Settings). `words` — what a
    studio calls the place when it isn't its name ("PayNow", "tax"); found, never shown. */
export type SearchPage = { id: string; title: string; sub: string; icon: string; href: string; words?: string
  /** A Create row whose page's Create opens a menu: the row to choose in it ("Create New Task"). */
  pick?: string }
/** (UX audit S3) Where things live: every Settings card and every Company card, by its own title, with a link to the card itself
    (`#<the card>` — the page's id or data-testid; `useArrival` in global-search.tsx brings it into view and marks it). */
const settingCard = (section: string, id: string, title: string, sub: string, anchor: string | null, words: string): SearchPage =>
  ({ id: `set-${id}`, title, sub: `Settings › ${sub}`, icon: 'settings', href: `${settingsHref(section)}${anchor ? `#${anchor}` : ''}`, words })
const companyCard = (id: string, title: string, sub: string, icon: string, href: string, words: string): SearchPage => ({ id: `co-${id}`, title, sub: `Company › ${sub}`, icon, href, words })
export const SETTING_PAGES: SearchPage[] = [
  settingCard('studio', 'team', 'Team', 'Studio · the members, by role', 'studio-team', 'members people staff roles'),
  settingCard('studio', 'entities', 'Issuing entities', 'Studio · the companies a quote is issued under', 'studio-entities', 'company uen entity entities'),
  settingCard('studio', 'roles', 'Who may do what', 'Studio · what each role may do', 'studio-roles', 'permissions access owner admin designer manager rights'),
  settingCard('leads', 'stages', 'Stage movement', 'Lead management · one stage at a time, or any', null, 'stages pipeline linear flexible move'),
  settingCard('leads', 'sources', 'Lead sources', 'Lead management · where a lead can come from', 'lead-sources', 'source website instagram facebook referral qanvast'),
  settingCard('leads', 'reasons', 'Lost and On Hold reasons', 'Lead management · Reasons', 'lead-reasons', 'lost reason reasons hold on hold why'),
  settingCard('leads', 'fields', 'Custom fields', 'Lead management · your own fields on every lead', 'custom-fields', 'field fields lead form extra'),
  settingCard('leads', 'capture', 'Lead capture', 'Lead management · the website form’s address', 'lead-capture', 'website form email intake enquiry enquiries webhook'),
  settingCard('leads', 'visibility', 'Who sees leads', 'Lead management · who sees and assigns which leads', 'lead-visibility', 'visibility access managers assign see leads'),
  settingCard('quotes', 'approval', 'Quote approval', 'Quotes & pricing · review before a quote goes out', null, 'approve approval review'),
  settingCard('quotes', 'tpl-approval', 'Template approval', 'Quotes & pricing · who publishes templates', null, 'approve approval templates publish'),
  settingCard('quotes', 'numbers', 'Quote numbers', 'Quotes & pricing · the pattern new quotes are numbered with', 'numbering', 'number numbering prefix sequence running om-'),
  settingCard('quotes', 'trades', 'Trades', 'Quotes & pricing · the categories every quote offers', 'trades', 'trade category categories carpentry'),
  settingCard('quotes', 'gst', 'GST', 'Quotes & pricing · whether the studio charges it, and the rate', 'gst', 'tax gst rate 9% 9'),
  settingCard('quotes', 'rounding', 'Selling prices', 'Quotes & pricing · round prices to a step', 'rounding', 'rounding round price prices markup'),
  settingCard('quotes', 'payments', 'Payment schedule', 'Quotes & pricing · who may change a quote’s milestones', 'payment-lock', 'payment payments schedule milestones lock deposit'),
  settingCard('quotes', 'backup', 'Backup approver', 'Quotes & pricing · approves when an Owner is away', 'backup-approver', 'approver backup away'),
  settingCard('quotes', 'prepared', 'Prepared by', 'Quotes & pricing · the name a quote prints', 'prepared-by', 'prepared name print designer'),
  settingCard('notifications', 'channels', 'Events and channels', 'Notifications · what reaches whom, by email or WhatsApp', 'notification-channels', 'notifications alerts email whatsapp in app bell'),
  settingCard('notifications', 'followups', 'Follow-ups', 'Notifications · the untouched-lead delay', 'notification-followups', 'untouched delay reminder follow-up follow up 30 minutes'),
  settingCard('notifications', 'messages', 'Messages', 'Notifications · the words every email and WhatsApp sends', 'notification-messages', 'message messages wording email whatsapp text'),
  companyCard('details', 'Company details', 'Profile · name, UEN, address and contacts', 'store', '/company/profile#details', 'uen address phone email socials instagram website name'),
  companyCard('bank', 'Issuing entities & bank details', 'Profile · bank, account and PayNow QR', 'account_balance', '/company/profile#entities', 'bank paynow qr account swift entity letterhead gst registered'),
  companyCard('marks', 'Logo and marks', 'Templates › Brand kit · logo, stamp and badges', 'palette', '/company/templates/brand#marks', 'logo stamp badge badges brand'),
  companyCard('colours', 'Colours', 'Templates › Brand kit · the six named colours', 'palette', '/company/templates/brand#colours', 'colour colours color colors accent brand'),
  companyCard('fonts', 'Fonts', 'Templates › Brand kit · the four type roles', 'palette', '/company/templates/brand#type', 'font fonts type typography brand'),
  companyCard('signature', 'Designers’ signatures', 'Members · each is drawn or typed in a quote’s Signature Settings', 'group', '/company/members#members', 'signature signatures sign'),
  companyCard('validity', 'Quote validity', 'Templates › a quote template’s New quotes tab', 'request_quote', '/company/templates/quotes', 'validity valid days expiry expire new quotes defaults t&cs terms starting sections'),
  companyCard('webhooks', 'Webhooks', 'Integrations · leads from other systems', 'link', '/company/integrations#webhooks', 'webhook api integration zapier'),
  companyCard('meta', 'Meta Lead Ads', 'Integrations · leads from Facebook and Instagram ads', 'link', '/company/integrations#meta', 'facebook instagram meta ads'),
  companyCard('gmail', 'Email lead sources', 'Integrations · leads from a Gmail inbox', 'link', '/company/integrations#gmail', 'gmail email inbox'),
  companyCard('billing', 'Plan & billing', 'Plan & AI credits · the plan, the card and invoices', 'diamond', '/company/plan/billing', 'plan billing invoice invoices card subscription upgrade'),
]
export const PAGES: SearchPage[] = [
  { id: 'leads', title: 'Leads', sub: 'Every lead in the studio', icon: 'people_alt', href: '/leads' },
  { id: 'tasks', title: 'Tasks', sub: 'Every task, a lead’s or the studio’s', icon: 'task_alt', href: '/tasks', words: 'overdue due today my tasks' },
  { id: 'insights', title: 'Insights', sub: 'Leads · turnaround by team member', icon: 'trending_up', href: '/leads/insights' },
  { id: 'imports', title: 'Lead Import History', sub: 'Leads · every import', icon: 'upload_file', href: '/leads/imports' },
  { id: 'qanvast', title: 'Qanvast Ops', sub: 'Qanvast leads and returns', icon: 'account_balance', href: '/qanvast-ops' },
  { id: 'quotes', title: 'Quotes', sub: 'Tools · every quote in the studio', icon: 'request_quote', href: '/quotes' },
  { id: 'xray', title: 'Quote X-Ray', sub: 'Tools · compare a quote with another studio’s', icon: 'scan', href: '/quote-x-ray' },
  { id: 'contracts', title: 'Contracts', sub: 'Tools · every contract in the studio', icon: 'contract', href: '/contracts' },
  { id: 'visualizer', title: 'AI Visualizer', sub: 'Tools · every design', icon: 'wand_shine', href: '/visualizer' },
  ...COMPANY_GROUPS.flatMap((g) => g.items.filter((s) => s.href).map((s) => ({ id: `company-${s.key}`, title: s.label, sub: `Company · ${s.help}`, icon: s.icon, href: s.href! }))),
  /* Templates' own tabs (Quotes is Company's Templates row above) */
  ...TEMPLATE_KINDS.filter((k) => k.key !== 'quotes').map((k) => ({ id: `templates-${k.key}`, title: k.title, sub: `Company › Templates · ${k.help}`, icon: k.icon, href: k.href })),
  ...SETTINGS_MODULES.filter((m) => m.live).map((m) => ({ id: `settings-${m.key}`, title: m.label, sub: 'Settings', icon: 'settings', href: settingsHref(m.key) })),
  /* (REG-715, Q-03) not a page: the ? panel, opened over the page you are on (`#shortcuts`, global-search.tsx) */
  { id: 'shortcuts', title: 'Keyboard shortcuts', sub: 'Keys for this page and every other', icon: 'keyboard', href: '#shortcuts' },
  ...SETTING_PAGES,
]
/** The pages shown before anything is typed. */
export const JUMP_TO = ['leads', 'tasks', 'quotes', 'contracts', 'visualizer', 'company-templates', 'settings-studio', 'shortcuts']

/** Pages that answer the query (matched in the browser — they are the app's own words). */
export function pageHits(query: string): SearchHit[] {
  return PAGES.flatMap((p) => {
    const rank = rankOf(query, p.title, [p.sub, p.words])
    return rank === null ? [] : [{ kind: 'page' as const, id: p.id, title: p.title, sub: p.sub, href: p.href, icon: p.icon, rank }]
  }).sort((a, b) => b.rank - a.rank)
}

/**
 * (UX audit V9) Create, under Go to: what the pages' own C key creates (`create` in lib/keys/registry.ts), from anywhere. A page that takes a
 * landing (`?new=1`) opens on it; the others are pressed on arrival (global-search.tsx) — the page's own control (and its menu's row), with its
 * own checks and refusals.
 */
export const CREATE: SearchPage[] = [
  { id: 'create-lead', title: 'New lead', sub: 'Leads · add a lead by hand', icon: 'person_add', href: '/leads', words: 'add create lead enquiry client' },
  { id: 'create-quote', title: 'Create quote', sub: 'Tools › Quotes · for any lead, blank or from a template', icon: 'request_quote', href: '/quotes', words: 'new add quote quotation estimate' },
  { id: 'create-task', title: 'New task', sub: 'Tasks · for a lead or the studio', icon: 'task_alt', href: '/tasks', pick: 'Create New Task', words: 'add create task todo to-do reminder follow-up' },
  { id: 'create-design', title: 'New design', sub: 'AI Visualizer · start from a room photo', icon: 'wand_shine', href: '/visualizer?new=1', words: 'add create design render visualise visualize room' },
]
/** A query that starts by asking to make something ("new lead", "add a task", "create quote") puts Create first. */
const CREATE_VERB = /^(new|add|create|make|start)\b/i
/** The Create rows a query matches — all four when nothing is typed. */
export function createHits(query: string): SearchHit[] {
  const asks = CREATE_VERB.test(query.trim())
  return CREATE.flatMap((p) => {
    const found = query.trim() ? rankOf(query, p.title, [p.sub, p.words]) : 0
    const rank = found !== null && asks ? found + 200 : found
    return rank === null ? [] : [{ kind: 'create' as const, id: p.id, title: p.title, sub: p.sub, href: p.href, icon: p.icon, rank }]
  }).sort((a, b) => b.rank - a.rank)
}
