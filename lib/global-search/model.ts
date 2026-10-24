import { COMPANY_GROUPS, TEMPLATE_KINDS } from '@/lib/company/sections'
import { SETTINGS_MODULES, settingsHref } from '@/lib/settings/modules'
import { opensPath } from '@/lib/settings/roles'

/**
 * (REG-709, owner 2026-09-28: "this search is a global prototype search … a popover window like what we have for company tab with a search
 * bar and the results shows within") The global search's model — pure and client-safe: what a result is, the scopes, how a record ranks
 * against what was typed (the house rule of REG-274 — it matches when the words appear in the text the result shows, a phone number digit
 * to digit — with every word of the query needing a match), the pieces of a line to mark, and the pages "Jump to" offers.
 */
export type SearchKind = 'lead' | 'project' | 'quote' | 'xray' | 'contract' | 'task' | 'note' | 'file' | 'design' | 'template' | 'book' | 'material' | 'member' | 'page' | 'create'
  | 'finance'   // (gaps build F1) vendors, purchase orders, supplier bills
  | 'ticket'   // (gaps build H, H-Q26) a project's tickets — the client's issues
  | 'layout'   // (gaps build J, J-Q17) the 3D Space Planner's layouts — under Designs
  | 'message'   // (parity map, UC-069) a message in a conversation — it opens the conversation at it
  | 'meeting'   // (pending modules S23) a meeting — it opens the meeting's page
  | 'brand'   // (pending modules S24) a Marketplace brand or deal — the brand's page, or the deal's dialog
  | 'article'   // (pending modules S25) a Market Insights article — its page

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
  { key: 'projects', label: 'Projects', kinds: ['project'] as SearchKind[] },   // (REG-922)
  { key: 'quotes', label: 'Quotes', kinds: ['quote', 'xray'] as SearchKind[] },
  { key: 'contracts', label: 'Contracts', kinds: ['contract'] as SearchKind[] },
  { key: 'tasks', label: 'Tasks', kinds: ['task'] as SearchKind[] },
  { key: 'notes', label: 'Notes & Logs', kinds: ['note'] as SearchKind[] },
  { key: 'meetings', label: 'Meetings', kinds: ['meeting'] as SearchKind[] },   // (pending modules S23)
  { key: 'files', label: 'Files', kinds: ['file'] as SearchKind[] },
  { key: 'designs', label: 'Designs', kinds: ['design', 'layout'] as SearchKind[] },   // (gaps build J) the 3D layouts beside the AI Visualizer's designs
  { key: 'library', label: 'Templates & Price book', kinds: ['template', 'book', 'material'] as SearchKind[] },
  { key: 'people', label: 'People', kinds: ['member'] as SearchKind[] },
  { key: 'finance', label: 'Finance', kinds: ['finance'] as SearchKind[] },   // (gaps build F1)
  { key: 'tickets', label: 'Tickets', kinds: ['ticket'] as SearchKind[] },   // (gaps build H)
  { key: 'messages', label: 'Messages', kinds: ['message'] as SearchKind[] },   // (parity map, UC-069) words in a conversation
] as const
export type SearchScope = (typeof SCOPES)[number]['key']
/** (parity map, FB-114) What an Accounting member's ⌘K finds — the books only: a project (opening on its Money), their own tasks, Finance's
    records; the scopes that hold them. The server reads the same list (lib/global-search/queries.ts), whatever scope is asked. */
export const ACCOUNTING_KINDS: readonly SearchKind[] = ['project', 'task', 'finance']
/** (S44O — call C6) …and a Marketing member's — the leads' own: a lead, its tasks, notes and logs, its files (never a quote, a contract, a project
    or Finance). */
export const MARKETING_KINDS: readonly SearchKind[] = ['lead', 'task', 'note', 'file']
export const scopesFor = (accounting: boolean, marketing = false) => (accounting ? SCOPES.filter((s) => s.key === 'all' || s.kinds.some((k) => ACCOUNTING_KINDS.includes(k)))
  : marketing ? SCOPES.filter((s) => s.key === 'all' || s.kinds.some((k) => MARKETING_KINDS.includes(k))) : SCOPES)
export const isScope = (v: string): v is SearchScope => SCOPES.some((s) => s.key === v)
export const scopeOf = (kind: SearchKind): SearchScope => SCOPES.find((s) => (s.kinds as readonly SearchKind[]).includes(kind))?.key ?? 'all'

/** Each group's heading and the order the groups read in. */
export const KIND_LABEL: Record<SearchKind, string> = {
  lead: 'Leads', project: 'Projects', quote: 'Quotes', xray: 'Quote X-Ray', contract: 'Contracts', task: 'Tasks', note: 'Notes & Logs', file: 'Files',
  design: 'AI Visualizer', template: 'Templates', book: 'Price book', material: 'Materials', member: 'People', page: 'Go to', create: 'Create',
  finance: 'Finance',   // (gaps build F1)
  ticket: 'Tickets',   // (gaps build H)
  layout: '3D Space Planner',   // (gaps build J)
  message: 'Messages',   // (parity map, UC-069)
  meeting: 'Meetings',   // (pending modules S23)
  brand: 'Marketplace',   // (pending modules S24)
  article: 'Market Insights',   // (pending modules S25)
}
export const KIND_ORDER: SearchKind[] = ['lead', 'project', 'quote', 'contract', 'task', 'note', 'file', 'xray', 'design', 'template', 'book', 'material', 'member', 'page']
/* (gaps build F1) money out's records, after the studio's people and before the pages — the order the groups read in */
KIND_ORDER.splice(KIND_ORDER.indexOf('page'), 0, 'finance')
/* (gaps build H) tickets read after the projects they belong to */
KIND_ORDER.splice(KIND_ORDER.indexOf('project') + 1, 0, 'ticket')
/* (gaps build J) layouts read after the AI Visualizer's designs */
KIND_ORDER.splice(KIND_ORDER.indexOf('design') + 1, 0, 'layout')
/* (parity map, UC-069) messages read after the tickets — both the client's words */
KIND_ORDER.splice(KIND_ORDER.indexOf('ticket') + 1, 0, 'message')
/* (pending modules S23) meetings read after the notes and logs — a meeting held is its Met log */
KIND_ORDER.splice(KIND_ORDER.indexOf('note') + 1, 0, 'meeting')
/* (pending modules S24) the Marketplace's brands and deals read after the studio's own libraries, before its people — found under All (no scope of their own) */
KIND_ORDER.splice(KIND_ORDER.indexOf('member'), 0, 'brand')
/* (pending modules S25) Market Insights' articles read after the Marketplace — found under All (no scope of their own), not by Accounting */
KIND_ORDER.splice(KIND_ORDER.indexOf('brand') + 1, 0, 'article')

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
/** (S46A — the findability audit's T-1, his "fix everything" 2026-10-19) What carries no meaning of its own in a query: a single letter
    ("upload a quote" — the "a" matched almost every line, so Your signature answered it), a bare mark ("reviews & rankings") and the joining
    words "and" · "the" ("usage and credits", where the page says "&"). Each is let go while another word is left — a lone "a" still searches. */
const FILLER = /^(?:[a-z]|[^\p{L}\p{N}]+|and|the)$/u
export const termsOf = (q: string) => {
  /* (S46 closing regression, REG-1841) 1.0's hyphenated spelling of the 3D Space Planner is read as 2.0's "3D": a number joined to one letter
     by a hyphen is one word, so no page needs the hyphenated spelling among its words */
  const all = phoneQuery(q).toLowerCase().split(/\s+/).map((t) => t.trim().replace(/^(\d+)-(\p{L})$/u, '$1$2')).filter(Boolean)
  const kept = all.filter((t) => !FILLER.test(t))
  return kept.length ? kept : all
}
/** A term as it is looked for in a line: a long number also where it is written in groups ("9123 4599"). */
const termPattern = (t: string) => (/^\d{6,}$/.test(t) ? t.split('').join('[\\s-]?') : esc(t))

/**
 * How well a record answers the query, or null when it does not: every word must appear in the title, in another line it shows, or (a word
 * carrying a digit) in a phone number digit to digit. A title that starts with the word ranks above one where a word starts with it, above
 * one that merely contains it, above a match elsewhere; the whole query as the whole title ranks first. (S46A — the audit's P-2) A match in
 * the other lines is graded the same way: the word itself ("pos", "invoices") above a word that starts with it, above one that holds it
 * ("deposit") — so the place a studio calls by that word answers before the lines that merely contain its letters.
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
    const starts = new RegExp(`(^|[^a-z0-9])${esc(term)}`)
    if (t.startsWith(term)) { score += 30; inTitle++ }
    else if (starts.test(t)) { score += 22; inTitle++ }
    else if (t.includes(term)) { score += 14; inTitle++ }
    else if (rest.some((o) => o.includes(term))) {
      const whole = new RegExp(`(^|[^a-z0-9])${esc(term)}($|[^a-z0-9])`)
      score += rest.some((o) => whole.test(o)) ? 8 : rest.some((o) => starts.test(o)) ? 7 : 6
    }
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
  const terms = termsOf(query).filter((t) => t.length > 0).sort((a, b) => b.length - a.length)   // (S46A) the words looked for — never a lone "a" in "upload a quote"
  if (!terms.length || !text) return [{ text, hit: false }]
  const alt = terms.map(termPattern).join('|')
  const re = new RegExp(`(${alt})`, 'gi'), whole = new RegExp(`^(?:${alt})$`, 'i')
  return text.split(re).filter((p) => p !== '').map((p) => ({ text: p, hit: whole.test(p) }))
}

/** The pages "Go to" offers, from the places the app already names them (the rail, Tools, Company, Templates, Settings). `words` — what a
    studio calls the place when it isn't its name ("PayNow", "tax"); found, never shown. */
export type SearchPage = { id: string; title: string; sub: string; icon: string; href: string; words?: string
  /** A Create row whose page's Create opens a menu: the row to choose in it ("Create New Task"). */
  pick?: string
  /** (gaps build F1) a Create row offered only once something is typed — the empty search keeps its own rows */ onlyTyped?: boolean
  /** (simplify S-14 · F1 §6.9.6) …except for a Manager or a Designer, whose weekly job on site it is: their empty search offers it too */ forMembers?: boolean
  /** (pending modules S08) a page only Owners and Admins have — a Manager's or a Designer's search leaves it out */ runners?: boolean
  /** (pending modules S41b-5) a page only the studio's Owner opens (1.0's rule for Qanvast Ops' Credits and Reviews) — everyone else's search leaves it out */ owners?: boolean }
/* (S46A — the findability audit's S1 · N-4 · L-5 · P-3 · T-7, his "fix everything" 2026-10-19) 1.0's own names for the places a 1.0 user
   still looks for, on the rows the Company panel, the Templates strip and the Settings modules give — found, never shown. */
const COMPANY_WORDS: Record<string, string> = {
  profile: 'company details studio profile',
  members: 'team members team staff people roles accounts lead preferences preferences',
  questionnaire: 'questions scope',
  templates: 'document templates documents quote templates letterhead',
  'price-book': 'packages package assemblies catalogue catalog quote rules starter quote rates price list my items my sections',
  materials: 'material catalog material catalogue finishes swatches',
  plan: 'usage credits ai credits usage credits balance top up subscription upgrade pro free trial',
  portal: 'homeowner portal homeowner client portal',
  finance: 'operations finance operations money in money out to do',
  reports: 'insights analytics',
  integrations: 'accounting integration lead capture',
}
const TEMPLATE_WORDS: Record<string, string> = {
  brand: 'branding studio branding logo',
  contracts: 'signing documents signing document agreement agreements',
  tasks: 'checklist checklists',
  terms: 'terms conditions t&cs clauses',
  payments: 'project & payments payments milestones split',
  schedules: 'timeline templates timeline milestones milestone templates gantt',
}
const MODULE_WORDS: Record<string, string> = {
  studio: 'accounts setup account setup accounts roles & permissions permissions access',
  leads: 'lead settings',
  meetings: 'copilot settings co-pilot',
  projects: 'project types project settings',
  quotes: 'quote settings',
  finance: 'money settings',
  notifications: 'alerts',
}
/** (UX audit S3) Where things live: every Settings card and every Company card, by its own title, with a link to the card itself
    (`#<the card>` — the page's id or data-testid; `useArrival` in global-search.tsx brings it into view and marks it). */
const settingCard = (section: string, id: string, title: string, sub: string, anchor: string | null, words: string): SearchPage =>
  ({ id: `set-${id}`, title, sub: `Settings › ${sub}`, icon: 'settings', href: `${settingsHref(section)}${anchor ? `#${anchor}` : ''}`, words })
const companyCard = (id: string, title: string, sub: string, icon: string, href: string, words: string): SearchPage => ({ id: `co-${id}`, title, sub: `Company › ${sub}`, icon, href, words })
export const SETTING_PAGES: SearchPage[] = [
  /* (one-home N-06) Settings › Studio's Team and Issuing entities cards were read-only copies of Company's — the Team row opens Company › Members,
     and "Issuing entities" is Profile's own row below (its words carry the old row's) */
  companyCard('team', 'Team', 'Members · the members, by role', 'group', '/company/members#members', 'members people staff roles'),
  /* (pending modules S08) the set-up list: its one home is Settings › Studio (S14: Roles & access); `setup=1` shows it as it stands even once hidden or finished */
  { id: 'set-setup', title: 'Set up your studio', sub: 'Settings › Roles & access · what your quotes, invoices and contracts need, and where each is kept', icon: 'settings', href: '/settings?section=studio&setup=1#studio-setup', words: 'setup set up getting started onboarding checklist first steps new studio logo bank details company details welcome', runners: true },
  settingCard('studio', 'roles', 'Who may do what', 'Roles & access · what each role may do', 'studio-roles', 'permissions access owner admin designer manager rights roles roles & permissions'),   // (S46A) 1.0's Accounts › Roles & Permissions   // (pending modules S14) the module's name
  /* (pending modules S14) Who sees leads' one home is Roles & access, above Who may do what */
  settingCard('studio', 'visibility', 'Who sees leads', 'Roles & access · who sees and assigns which leads, and their projects', 'lead-visibility', 'visibility access managers assign see leads projects'),
  /* (pending modules S41b-1 — 1.0's Cost & Margin Visibility) its one home, beside Who sees leads */
  settingCard('studio', 'cost-visibility', 'Who sees costs and margins', 'Roles & access · hide cost, mark-up and margin from a role', 'cost-visibility', 'cost costs margin margins markup mark-up profit hide visibility confidential designers accounting admins'),
  settingCard('leads', 'stages', 'Lead stages', 'Lead management · what each stage keeps, and how leads move', 'lead-stages', 'stages pipeline linear flexible move stage movement manage stages funnel lead funnel pipeline stages next call follow-up signed contract won contacted'),   // (S42 B-13) the card S05 made of Stage movement
  settingCard('leads', 'sources', 'Lead sources', 'Lead management · where a lead can come from', 'lead-sources', 'source website instagram facebook referral qanvast'),
  settingCard('leads', 'reasons', 'Lost and On Hold reasons', 'Lead management · Reasons', 'lead-reasons', 'lost reason reasons hold on hold why'),
  settingCard('leads', 'fields', 'Custom fields', 'Lead management · your own fields on every lead', 'custom-fields', 'field fields lead form extra'),
  /* (S46A — the findability audit's L-5, REG-812's rule: every Settings card by its own title) the eight cards ⌘K couldn't find by name */
  settingCard('leads', 'untouched', 'Untouched leads', 'Lead management · when a New lead with no contact logged is raised as untouched', 'untouched-leads', 'untouched delay reminder new lead no contact 30 minutes'),
  /* (pending modules S23) Settings › Meetings — the co-pilot's playbook, each card by its own title (1.0's Accounts › AI & Copilot words among the words) */
  settingCard('meetings', 'meeting-parts', 'During a meeting', 'Meetings · the co-pilot’s parts, each on or off', 'meetings-features', 'copilot co-pilot assistant ai tips coaching features switches session estimate add-ons mood boards portfolio past projects photos floor plan'),
  settingCard('meetings', 'deal-score', 'Deal score', 'Meetings · how much budget, timeline, trust and the rest count', 'meetings-score', 'deal score scoring weights weight tuning copilot tuning hot warm cool cold distribute evenly'),
  settingCard('meetings', 'meeting-checklists', 'Meeting checklists', 'Meetings · what to cover in each kind of meeting', 'meetings-checklists', 'checklist checklists questions ask cover first consultation follow-up site visit quote walk-through closing'),
  settingCard('meetings', 'objections', 'Objection answers', 'Meetings · what to say when a client pushes back', 'meetings-answers', 'objection objections objection responses responses answers pushback push back too expensive discount price'),
  settingCard('meetings', 'competitors', 'Competitors', 'Meetings · the studios you compete with', 'meetings-competitors', 'competitor competitors competitor list rival rivals other studios firms lost to'),
  companyCard('capture', 'Lead capture', 'Integrations · the website form’s address', 'link', '/company/integrations#email', 'website form email intake enquiry enquiries webhook'),   // (one-home N-03) Integrations is lead capture's one home
  settingCard('quotes', 'approval', 'Quote approval', 'Quotes & pricing · review before a quote goes out', null, 'approve approval review rules quote approval rules'),   // (S46A) 1.0's Accounts › Quote Approval Rules
  settingCard('quotes', 'tpl-approval', 'Template approval', 'Quotes & pricing · who publishes templates', null, 'approve approval templates publish'),
  settingCard('quotes', 'numbers', 'Quote numbers', 'Quotes & pricing · the pattern new quotes are numbered with', 'numbering', 'number numbering prefix sequence running om-'),
  settingCard('quotes', 'trades', 'Trades', 'Quotes & pricing · the categories every quote offers', 'trades', 'trade category categories carpentry'),
  settingCard('quotes', 'units', 'Units', 'Quotes & pricing · the units every line is priced by', 'units', 'unit units sqft lot pieces measure uom'),   // (S44I — M9)
  settingCard('quotes', 'gst', 'GST', 'Quotes & pricing · the rate', 'gst', 'tax gst rate 9% 9'),   // (one-home N-13) whether the studio is registered is its entity's, on Company › Profile
  settingCard('quotes', 'rounding', 'Selling prices', 'Quotes & pricing · round prices to a step', 'rounding', 'rounding round price prices markup'),
  settingCard('quotes', 'payments', 'Payment schedule', 'Quotes & pricing · who may change a quote’s milestones', 'payment-lock', 'payment payments schedule milestones lock deposit who may change the payment schedule'),   // (S46A, REG-812) the card's own title
  settingCard('quotes', 'contracts', 'Contracts · signing links', 'Quotes & pricing · how long a signing link stays open', 'contracts', 'contract contracts signing link links expiry expire days sign'),   // (pending modules S03)
  settingCard('quotes', 'backup', 'Backup approver', 'Quotes & pricing · approves when an Owner is away', 'backup-approver', 'approver backup away'),
  settingCard('quotes', 'prepared', 'Prepared by', 'Quotes & pricing · the name a quote prints', 'prepared-by', 'prepared name print designer'),
  settingCard('quotes', 'new-quotes', 'New quotes start with', 'Quotes & pricing · what every new quote takes from the default template', 'new-quote-defaults', 'new quote defaults default template validity terms split gst starting sections'),   // (S46A, L-5)
  settingCard('quotes', 'optional-picks', 'Optional works on the confirmation link', 'Quotes & pricing · whether the client may pick them', 'optional-picks', 'optional optional works optional items pick picks tick add-on confirm confirmation link client'),   // (S44Q, row 357)
  settingCard('notifications', 'channels', 'Events and channels', 'Notifications · what reaches whom, by email or WhatsApp', 'notification-channels', 'notifications alerts email whatsapp in app bell'),
  settingCard('notifications', 'followups', 'Follow-ups', 'Notifications · the untouched-lead delay', 'notification-followups', 'untouched delay reminder follow-up follow up 30 minutes'),
  settingCard('notifications', 'messages', 'Message wording', 'Notifications · the words every email and WhatsApp sends', 'notification-messages', 'message messages wording email whatsapp text'),   // (one-home N-08) "Messages" is the client conversations' word
  settingCard('notifications', 'client-messages', 'Messages to clients', 'Notifications · what reaches a client by itself, by email or WhatsApp', 'client-messages', 'client clients homeowner automatic automatic messages tells email whatsapp portal customer'),   // (S46A, L-5)
  settingCard('notifications', 'sent-messages', 'Sent messages', 'Notifications · every email and WhatsApp message the rules sent', 'sent-messages', 'sent outbox log history delivered failed email whatsapp'),   // (S46A, L-5)
  companyCard('details', 'Company details', 'Profile · name, UEN, address and contacts', 'store', '/company/profile#details', 'uen address phone email socials instagram website name'),
  /* (pending modules S14 — 1.0's Review Link) where clients review the studio; Ask for a review sends it */
  companyCard('reviews', 'Review link', 'Profile · the page where clients review you — Ask for a review sends it', 'store', '/company/profile#reviews', 'review reviews google rating ratings rate testimonial testimonials ask for a review feedback qanvast'),
  companyCard('bank', 'Issuing entities & bank details', 'Profile · bank, account and PayNow QR', 'account_balance', '/company/profile#entities', 'bank paynow qr account swift entity entities issued company uen letterhead gst registered legal entities legal entity'),   // (S46A) 1.0's Accounts › Legal Entities   // (one-home N-06 · N-13)
  /* (one-home N-07) CaseTrust and the studio's other registrations are recorded once, on Company › Profile (its card's own title) */
  companyCard('registrations', 'Registrations & accreditations', 'Profile · CaseTrust, HDB, bizSAFE, BCA and ACRA, recorded once', 'store', '/company/profile#registrations', 'casetrust case trust accreditation accredited registration registrations licence license hdb bca bizsafe acra feature flags flag'),   // (S46A) 1.0's Feature Flags — CaseTrust was the one left
  /* (pending modules S37) the studio's listing on Qanvast — 1.0's /verify, one home on Company › Profile */
  companyCard('qanvast', 'Listed on Qanvast', 'Profile · apply to be listed, or keep your listing up to date', 'store', '/company/profile#qanvast', 'qanvast listing listed list verify verified verification apply application homeowners directory marketplace profile'),
  companyCard('marks', 'Logo and marks', 'Templates › Brand kit · logo, stamp and badges', 'palette', '/company/templates/brand#marks', 'logo stamp badge badges brand accreditations accreditation'),
  companyCard('colours', 'Colours', 'Templates › Brand kit · the six named colours', 'palette', '/company/templates/brand#colours', 'colour colours color colors accent brand'),
  companyCard('fonts', 'Fonts', 'Templates › Brand kit · the four type roles', 'palette', '/company/templates/brand#type', 'font fonts type typography brand'),
  /* (pending modules S01) your own signature's one home: Your profile › Your signature */
  /* (pending modules S14 — the steps' note after S01) your own PayNow, for every member — Accounting too, who don't open Members */
  { id: 'setting-my-paynow', title: 'Your PayNow', sub: 'Your profile · where the studio pays your claims and commission', icon: 'account_circle', href: '/profile#paynow', words: 'paynow pay me payment claim claims commission reimburse reimbursement my bank mobile uen' },
  { id: 'setting-my-signature', title: 'Your signature', sub: 'Your profile · drawn, typed or a picture — it prints on the quotes you prepare', icon: 'signature', href: '/profile#signature', words: 'signature sign my signature draw typed upload' },
  /* (pending modules S18) your own mute and daily summary's one home: Your profile › Your notifications */
  { id: 'setting-my-notifications', title: 'Your notifications', sub: 'Your profile · mute a notice, or get one summary email a day', icon: 'notifications', href: '/profile#notifications', words: 'notifications notification notices mute muted unmute digest daily summary email emails quiet bell alerts' },
  companyCard('signature', 'Designers’ signatures', 'Members · each is drawn or typed in a quote’s Signature Settings', 'group', '/company/members#members', 'signature signatures sign'),
  companyCard('validity', 'Quote validity', 'Templates › a quote template’s New quotes tab', 'request_quote', '/company/templates/quotes', 'validity valid days expiry expire new quotes defaults t&cs terms starting sections'),
  companyCard('webhooks', 'Webhooks', 'Integrations · leads from other systems', 'link', '/company/integrations#webhooks', 'webhook api integration zapier'),
  companyCard('meta', 'Meta Lead Ads', 'Integrations · leads from Facebook and Instagram ads', 'link', '/company/integrations#meta', 'facebook instagram meta ads'),
  companyCard('gmail', 'Email lead sources', 'Integrations · leads from a Gmail inbox', 'link', '/company/integrations#gmail', 'gmail email inbox'),
  companyCard('xero', 'Xero', 'Integrations · connect or disconnect the studio’s books', 'link', '/company/integrations#xero', 'xero accounting books connect disconnect bookkeeper accounting integration'),   // (one-home N-09) the connection's one home; Accounting keeps the mapping and the sync log
  companyCard('billing', 'Plan & billing', 'Plan & AI credits · the plan, the card and invoices', 'diamond', '/company/plan/billing', 'plan billing invoice invoices card subscription upgrade'),
  /* (S46A — N-4 · L-3) (invented copy) the plan's other tab by its own title: plg's Usage & credits page (/settings/usage, in every credit alert it sent) */
  companyCard('usage', 'Usage', 'Plan & AI credits · the AI credits left, and who used them on what', 'diamond', '/company/plan', 'usage credits ai credits usage & credits balance spent top up history ledger'),
  /* (Projects r4a) the client portal's set-up and its clients */
  companyCard('portal-address', 'Client portal address', 'Client portal · the address clients sign in at, Live or Paused', 'home', '/company/portal', 'portal homeowner client address url link live paused pause sign in login test'),
  companyCard('portal-clients', 'Clients with portal access', 'Client portal · who is invited, who opened it, withdraw', 'home', '/company/portal/clients', 'portal homeowner client clients invite invited access withdraw opened preview as homeowner preview see it as view as client view'),   // (S46A — P-6) each client's ⋮ holds See it as
  /* (pending modules S13) the studio's privacy notice, terms and contact page — the links at the foot of every portal page */
  companyCard('portal-links', 'Privacy and terms', 'Client portal · your privacy notice, terms and contact page at the foot of every page', 'home', '/company/portal#portal-links', 'privacy policy notice pdpa personal data terms conditions contact footer foot legal links portal homeowner client'),
]
export const PAGES: SearchPage[] = [
  /* (pending modules S22) the rail's first item — what needs you, what's next, where the studio stands */
  { id: 'dashboard', title: 'Dashboard', sub: 'What needs you, what’s next and where the studio stands', icon: 'dashboard', href: '/dashboard', words: 'home today overview summary needs you what needs me studio pulse start front approve approvals approval waiting for me' },   // (S46A — L-2) 1.0's Tasks › Approvals gather here
  { id: 'leads', title: 'Leads', sub: 'Every lead in the studio', icon: 'people_alt', href: '/leads', words: 'kanban board table list' },   // (S46A) 1.0's two views
  { id: 'projects', title: 'Projects', sub: 'Every project in the studio', icon: 'business_center', href: '/projects', words: 'project jobs work site handover' },   // (REG-922)
  { id: 'tasks', title: 'Tasks', sub: 'Every task, a lead’s or the studio’s', icon: 'task_alt', href: '/tasks', words: 'overdue due today my tasks' },
  /* (one-home N-08) the rail's Messages — every conversation with a client (the `/chat` address); "messages" finds it before Message wording */
  { id: 'messages', title: 'Messages', sub: 'Every conversation — clients, the team, groups', icon: 'chat', href: '/chat', words: 'chat chats conversation conversations inbox client clients reply unread team group groups direct member members everyone' },   // (pending modules S26) the studio's own conversations joined it
  { id: 'insights', title: 'Lead reports', sub: 'Company › Reports · turnaround by team member', icon: 'trending_up', href: '/company/reports/leads', words: 'insights report turnaround response outreach performance response time tat' },   // (REG-1361) was Leads › Insights
  /* (pending modules S45A — H-UHD-1) Reports › Leads' second report — Owners and Admins, as the report */
  { id: 'sales-report', title: 'Sales report', sub: 'Company › Reports › Leads · wins by member, source and month, the pipeline, leads going quiet', icon: 'trending_up', href: '/company/reports/leads?report=sales', words: 'sales report conversion won value revenue funnel source sources pipeline forecast quiet stalled aging scorecard', runners: true },
  /* (pending modules S01) your own name, email, phone, photo and signature — the rail's studio block and the phone's avatar open it too */
  { id: 'profile', title: 'Your profile', sub: 'Your name, photo, email, phone and signature', icon: 'account_circle', href: '/profile', words: 'profile account me my name photo picture avatar email phone number details signature settings my settings personal settings own settings preferences lead preferences' },   // (S46A — N-3 · L-6) 1.0's avatar › Settings was this page
  { id: 'imports', title: 'Lead Import History', sub: 'Leads · every import', icon: 'upload_file', href: '/leads/imports' },
  { id: 'qanvast', title: 'Qanvast Ops', sub: 'Qanvast leads and returns', icon: 'account_balance', href: '/qanvast-ops' },
  /* (pending modules S27) (invented copy) Qanvast Ops › Hangouts, and a member's own public card */
  { id: 'hangouts', title: 'Hangouts', sub: 'Qanvast Ops · meet-the-designer events — apply, plan, the chats, how it went', icon: 'group', href: '/qanvast-ops/hangouts', words: 'hangout hangouts event events qanvast homeowners meet designers tables booking page walk-in walk-ins' },
  /* (pending modules S41b-5) (invented copy) 1.0's Qanvast line's Credits and Reviews & Rankings — the Owner's alone; (S42E, call E·2) Reviews are an Admin's too */
  { id: 'qanvast-credits', title: 'Lead credits', sub: 'Qanvast Ops · credits left, the month’s statement and your contracts with Qanvast', icon: 'credit_card', href: '/qanvast-ops/credits', words: 'credits credit qanvast lead leads balance top up topup contract contracts statement transactions refund refunds photoshoot social media bd', owners: true },
  { id: 'qanvast-reviews', title: 'Reviews', sub: 'Qanvast Ops · your Qanvast reviews, replies, ranking and homeowners’ feedback', icon: 'star', href: '/qanvast-ops/reviews', words: 'review reviews rating ratings stars reply respond rank ranking rankings feedback supertrust request reviews qanvast', runners: true },   // (S42E, call E·2) Owners and Admins
  { id: 'qanvast-request-reviews', title: 'Request reviews', sub: 'Qanvast Ops › Reviews · ask finished projects’ clients for a review on WhatsApp', icon: 'send', href: '/qanvast-ops/reviews?request=1', words: 'ask for a review request review reviews whatsapp homeowners clients qanvast', runners: true },
  { id: 'public-profile', title: 'Your public profile', sub: 'Your card and your work — what clients read about you', icon: 'badge', href: '/profile#public', words: 'public profile portfolio work card bio years experience specialisation specialisations about team photos' },
  { id: 'quotes', title: 'Quotes', sub: 'Tools · every quote in the studio', icon: 'request_quote', href: '/quotes', words: 'quotation quotations upload import existing pdf excel spreadsheet archived quotes deleted quotes' },   // (S46A — T-1) where Upload a quote lives, and Tools › Quotes' ⋮ — "digitizer" itself is Create › Upload a quote's, so the tool answers first
  { id: 'xray', title: 'Quote X-Ray', sub: 'Tools · compare a quote with another studio’s', icon: 'scan', href: '/quote-x-ray', words: 'xray x-ray compare comparison competitor beat this quote' },   // (S46A — T-7)
  { id: 'contracts', title: 'Contracts', sub: 'Tools · every contract in the studio', icon: 'contract', href: '/contracts', words: 'agreement agreements sign signing archived contracts deleted contracts' },
  /* (pending modules S23) (invented copy) */
  { id: 'meetings', title: 'Meetings', sub: 'Tools · Meeting Copilot — every meeting, and the co-pilot in each', icon: 'event', href: '/meetings', words: 'meeting copilot co-pilot brief consultation site visit meeting copilot start meeting new meeting live recording' },
  { id: 'meetings-reports', title: 'Meeting reports', sub: 'Company › Reports · meetings, coaching and objections', icon: 'bar_chart', href: '/company/reports/meetings', words: 'meeting reports analytics coaching objections deal score insights meeting insights copilot analytics history' },   // (S46A — T-4) 1.0's Meeting Insights
  /* (pending modules S39) (invented copy) 1.0's Studio Health — Owners and Admins (the tab's gate for anyone else, so it is offered to them only) */
  { id: 'studio-health', title: 'Studio health', sub: 'Company › Reports · how the team and its clients use OpenMaison', icon: 'bar_chart', href: '/company/reports/health', words: 'usage activity active members sign-ins logins sessions ai runs engagement adoption analytics team health portal', runners: true },
  { id: 'visualizer', title: 'AI Visualizer', sub: 'Tools · every design', icon: 'wand_shine', href: '/visualizer', words: 'visualiser visualise visualize renders render photo renders design designs room photo' },   // (S46A — T-7 · P-3) the site's spelling, a project's Photo Renders
  /* (pending modules S24) (invented copy) the rail's Marketplace */
  { id: 'marketplace', title: 'Marketplace', sub: 'Brands and deals from Qanvast’s partners', icon: 'storefront', href: '/marketplace', words: 'brands brand deals deal suppliers supplier partners furniture lighting flooring kitchen bathroom paint curtains blinds smart home promotions offers' },
  /* (pending modules S25) (invented copy) Tools › Market Insights */
  { id: 'market-insights', title: 'Market Insights', sub: 'Tools · articles from OpenMaison’s editors', icon: 'trending_up', href: '/market-insights', words: 'articles article trends reports case studies industry news insights market reading' },
  { id: 'floorplan-3d', title: 'Floorplan to 3D Isometric', sub: 'Tools · a 3D view from a floor-plan photo', icon: 'view_in_ar', href: '/floorplan-3d', words: 'floorplan floor plan 3d isometric dollhouse top-down top down render 3d floor plan photo beta' },   // (REG-2800) 1.0's module, its own page again
  { id: 'planner', title: '3D Space Planner', sub: 'Tools · every 3D layout', icon: 'space_dashboard', href: '/planner', words: '3d layout floor plan furniture room planner space 3d space planner isometric floorplan' },   // (gaps build J) · (S46A — N-4) 1.0's hyphenated "3D Space Planner" (read as 3d by `termsOf`)
  /* (S46A — the findability audit's N-1 · M1, his "fix everything" 2026-10-19) (invented copy) 1.0's Escalations: Projects › Tickets, every
     ticket on the projects you see — (S46 — REG-2524) a rail place of its own, /tickets, as Tasks is; here it is found by every word 1.0 called it */
  { id: 'tickets', title: 'Tickets', sub: 'Every ticket on the projects you see — defects and the clients’ issues', icon: 'handyman', href: '/tickets', words: 'escalations escalation escalate issues issue defects defect complaints complaint support support ticket tickets snag snags raise' },
  /* (S46A — L-1 · P-3) (invented copy) where 1.0's archived and deleted records are: a lead that ended (1.0's archived leads came in as Lost),
     a project handed over (1.0's archived projects are Completed), and the two Deleted sheets in the listings' ⋮ */
  { id: 'lost-leads', title: 'Lost leads', sub: 'Leads · every lead that ended, with its reason — resume one from its stage', icon: 'people_alt', href: '/leads?scope=lost', words: 'lost archived archive archived leads revive closed dead dropped' },
  { id: 'deleted-leads', title: 'Deleted Leads', sub: 'Leads › ⋮ · restore a deleted lead', icon: 'delete', href: '/leads', words: 'deleted delete trash bin restore removed' },
  { id: 'completed-projects', title: 'Completed projects', sub: 'Projects · every project handed over', icon: 'business_center', href: '/projects?scope=completed', words: 'completed complete finished done handed over closed archived archive archived projects past' },
  { id: 'deleted-projects', title: 'Deleted Projects', sub: 'Projects › ⋮ · restore a deleted project', icon: 'delete', href: '/projects', words: 'deleted delete trash bin restore removed' },
  /* (S46A — P-3 · P-5) (invented copy) a project's own steps, found by 1.0's words and said where they are: Close project (Complete handover, in a
     project's ⋮ and Stage ▾) and Materials / Selections (Design › Choices) */
  { id: 'project-handover', title: 'Complete handover', sub: 'Projects · a project’s ⋮, or Stage ▾ › Completed — once its checklist is met', icon: 'task_alt', href: '/projects', words: 'close project closure close complete finish wrap up end handover hand over completion letter' },
  { id: 'project-choices', title: 'Choices', sub: 'Projects · a project’s Design › Choices — what the client picks', icon: 'palette', href: '/projects', words: 'selections selection materials material board finishes picks options client choices' },
  /* (S46A — the audit's P-2: "invoices" never reached Money in) the books' pages read before the Company panel's rows, the Settings cards and Plan
     & billing — on a tie the place that holds the records answers before the rules and the plan about them. */
  /* (gaps build F1 — F-01) Finance's tabs · (simplify S-11) Purchase orders · Bills · Expenses · Payments out are Money out's kinds now */
  /* (parity map, FB-013 · FB-016 · FB-012 — P-A's) Money in, the twin of Money out */
  { id: 'finance-money-in', title: 'Money in', sub: 'Company › Finance · every invoice, client payment, variation order and credit note', icon: 'payments', href: '/company/finance/money-in', words: 'money in invoices invoice receipts receipt payments client payments variation orders vo vos contract/vo variations credit notes register record payment record a payment received' },   // (S46A — P-2 · P-3) 1.0's Operations › Invoices · Receipts · Contract/VO, and its Record Payment
  { id: 'finance-pos', title: 'Purchase orders', sub: 'Company › Finance › Money out · every PO to a vendor', icon: 'local_shipping', href: '/company/finance/money-out?kind=purchase-orders', words: 'po pos purchase order vendor supplier subcontractor money out costs purchases' },
  { id: 'finance-bills', title: 'Supplier bills', sub: 'Company › Finance › Money out · bills from vendors, to pay', icon: 'receipt_long', href: '/company/finance/money-out?kind=bills', words: 'bill invoice supplier vendor pay owe money out' },
  { id: 'finance-expenses', title: 'Expenses', sub: 'Company › Finance › Money out · expenses and claims', icon: 'shopping_cart', href: '/company/finance/money-out?kind=expenses', words: 'expense claim reimbursement receipt overhead' },
  { id: 'finance-payments', title: 'Payments out', sub: 'Company › Finance › Money out · what the studio paid', icon: 'payments', href: '/company/finance/money-out?kind=paid', words: 'paid payment vendor money out' },
  { id: 'finance-vendors', title: 'Vendors', sub: 'Company › Finance · sub-contractors and suppliers', icon: 'storefront', href: '/company/finance/vendors', words: 'vendor supplier subcontractor contractor directory' },
  /* (gaps build F2 — F2-Q15) the books' pages */
  /* (simplify S-10) Finance's Overview became To do — what to approve, pay and collect, and what is stuck; "who owes us" is found here (Q-07) */
  { id: 'finance-overview', title: 'Finance · To do', sub: 'Company › Finance · what to approve, pay and collect', icon: 'task', href: '/company/finance/todo', words: 'to do todo approve pay collect owes owed overdue verify stuck waiting overview who owes us' },
  { id: 'finance-profitability', title: 'Profitability', sub: 'Company › Reports › Finance · profit and margin by project, by type and by designer', icon: 'bar_chart', href: '/company/reports/finance?report=profitability', words: 'pipeline projects contract margin profit invoiced collected committed report quote-to-cash quote to cash comparative' },   // (S46A — P-3) 1.0's Pipeline › Quote-to-Cash, its Comparative report
  { id: 'finance-commissions', title: 'Commission', sub: 'Company › Finance · what the team earns, is paid and is owed', icon: 'workspace_premium', href: '/company/finance/commissions', words: 'commission commissions my commission payout payouts earned owed rate designer ask' },
  { id: 'finance-reports', title: 'Finance reports', sub: 'Company › Reports · profit and loss, aging, profitability, cash flow', icon: 'bar_chart', href: '/company/reports/finance', words: 'report reports profit loss p&l aging ar ap cash flow vendor spend statement export revenue income gst yoy comparative' },   // (S46A — P-3) 1.0's Revenue (in Cash flow now) and GST reports
  { id: 'finance-accounting', title: 'Xero', sub: 'Company › Finance · the books pushed to Xero', icon: 'account_balance', href: '/company/finance/accounting', words: 'xero accounting sync books bookkeeper mapping tax code' },
  ...COMPANY_GROUPS.flatMap((g) => g.items.filter((s) => s.href).map((s) => ({ id: `company-${s.key}`, title: s.label, sub: `Company · ${s.help}`, icon: s.icon, href: s.href!, words: COMPANY_WORDS[s.key] }))),
  /* Templates' own tabs (Quotes is Company's Templates row above) */
  ...TEMPLATE_KINDS.filter((k) => k.key !== 'quotes').map((k) => ({ id: `templates-${k.key}`, title: k.title, sub: `Company › Templates · ${k.help}`, icon: k.icon, href: k.href, words: `${k.label} ${TEMPLATE_WORDS[k.key] ?? ''}`.trim() })),   // (one-home N-14) found by its tab's name too: "payment schedules"
  ...SETTINGS_MODULES.filter((m) => m.live).map((m) => ({ id: `settings-${m.key}`, title: m.label, sub: 'Settings', icon: 'settings', href: settingsHref(m.key), words: MODULE_WORDS[m.key] })),
  /* (REG-715, Q-03) not a page: the ? panel, opened over the page you are on (`#shortcuts`, global-search.tsx) */
  { id: 'shortcuts', title: 'Keyboard shortcuts', sub: 'Keys for this page and every other', icon: 'keyboard', href: '#shortcuts' },
  /* (S42 audit A-08) the people steps' presses, found by what a studio calls them: Sign out (not a page — the studio menu's own leave, run
     here: `#sign-out`, global-search.tsx) and your own Open to new leads (your row on Members) */
  { id: 'sign-out', title: 'Sign out', sub: 'Leave OpenMaison on this browser — sign-in opens', icon: 'logout', href: '#sign-out', words: 'sign out signout log out logout log off leave exit quit' },
  { id: 'open-to-leads', title: 'Open to new leads', sub: 'Company › Members · your row — whether new leads can be suggested for you', icon: 'group', href: '/company/members?open=me', words: 'accepting leads open closed to new leads take leads available away busy leave holiday suggestions assign me lead preferences preferences specialty styles' },   // (S46A — E2) 1.0's Settings › Lead Preferences
  ...SETTING_PAGES,
  /* (simplify round 2 · S-15 · S-20) the two cards round 1 made: one Document numbers card on Settings › Finance, and the approvals gathered at the
     top of Settings › Projects — each lands on its card (`#document-numbers` · `#owner-approvals`) */
  settingCard('finance', 'numbers', 'Document numbers', 'Finance · how invoices, receipts, credit notes and POs are numbered', 'document-numbers', 'invoice invoices receipt receipts credit note notes po purchase order number numbers numbering prefix sequence running inv rct cn'),
  /* (S42 audit C-11) every other Settings › Finance card by its own title (the UX audit's S3 rule) — "expense categories" and "purchase order
     paper" found nothing; the Money in and Commission cards with them */
  settingCard('finance', 'invoices', 'Invoices', 'Finance · when an invoice goes out, and how a payment schedule splits', 'invoice-settings', 'invoice invoices send schedule split splits fee first deposit due days'),
  settingCard('finance', 'invoice-paper', 'Invoice paper', 'Finance · what invoices, receipts and variation orders print besides their figures', 'invoice-paper', 'invoice paper print colour color notes terms bank details balance receipt variation order vo letterhead'),
  settingCard('finance', 'client-payments', 'Client payments', 'Finance · who confirms a client’s payment, and the ways clients may pay', 'payment-settings', 'payment payments confirm proof paynow bank transfer cheque cash methods client'),
  settingCard('finance', 'credit-notes', 'Credit notes', 'Finance · how a credit note takes money off a sent invoice', 'credit-settings', 'credit note notes refund cn'),
  settingCard('finance', 'costs', 'Costs', 'Finance · who approves purchase orders, expenses and supplier bills, and when vendors are paid', 'cost-settings', 'cost costs purchase order po approval approve limit expense expenses vendor vendors terms advance bill bills supplier tolerance'),   // (S44R, C8) bills too
  settingCard('finance', 'expense-categories', 'Expense categories', 'Finance · what an expense is logged under', 'expense-categories', 'expense expenses category categories claim claims xero account accounts'),
  settingCard('finance', 'po-paper', 'The purchase order paper', 'Finance · what every PO prints — your note, terms and the vendor’s signature', 'po-paper', 'purchase order paper po print terms header note acceptance sign signature vendor bank details'),
  settingCard('finance', 'commission', 'Commission', 'Finance · what the team earns on its projects, and the rate', 'commission-settings', 'commission commissions rate rule earn share designer'),
  settingCard('projects', 'project-start', 'When a project starts', 'Projects · the quote is signed, or the agreement is signed', 'project-start', 'start starts won project agreement letter appointment signed signature quote deposit'),   // (S44R, C7)
  settingCard('projects', 'approvals', 'What waits for an Owner or an Admin', 'Projects · the approvals a project can wait for', 'owner-approvals', 'approval approvals approve review reviewer reviewers owner admin updates invoice invoices done share handover purchase order expense workflow workflow rules'),   // (S46A) 1.0's Accounts › Workflow Rules
  /* (S46A — L-5, REG-812) Settings › Projects' cards by their own titles; 1.0's Accounts words among theirs */
  settingCard('projects', 'project-numbers', 'Project numbers', 'Projects · the pattern new projects are numbered with', 'project-numbering', 'project number numbers numbering prefix sequence running p-'),
  settingCard('projects', 'handover', 'Stages and handover', 'Projects · Setting up, In progress and Completed — and what ends a project', 'handover-settings', 'stages handover hand over complete completed setting up in progress reopen'),
  settingCard('projects', 'schedule', 'Schedule', 'Projects · who approves a schedule’s changes, the alerts’ lead time, where a schedule starts', 'schedule-settings', 'schedule alerts alert lead time alerts lead time proactive alerts reminders milestones'),
  settingCard('projects', 'ticket-categories', 'Ticket categories', 'Projects · what a client picks when they report an issue', 'ticket-categories', 'ticket tickets category categories escalation escalations escalation categories issue issues defect'),
  /* (gaps build I) the Workload view, Projects › Insights, the Compliance Navigator and the two settings cards */
  { id: 'projects-workload', title: 'Workload', sub: 'Projects · who runs how many, against their capacity', icon: 'group', href: '/projects?view=workload', words: 'workload capacity load busy free room designer team' },
  /* (S45B · H-UHD-2 — 1.0's /contractors page, its 2.0 home) the Workload view's Contractors */
  { id: 'projects-contractors', title: 'Contractors', sub: 'Projects › Workload · who is free, who is over capacity, the work with no contractor', icon: 'handyman', href: '/projects?view=workload&of=contractors', words: 'contractor contractors crew site sites idle free capacity trade trades hacker carpenter tiler electrician plumber painter workload' },
  { id: 'projects-insights', title: 'Project reports', sub: 'Company › Reports · started, completed, duration, late milestones, collection', icon: 'bar_chart', href: '/company/reports/projects', words: 'insights report duration late milestones collection days numbers' },
  { id: 'compliance', title: 'Compliance Navigator', sub: 'Tools · the studio’s registrations and Singapore’s rules by home', icon: 'verified_user', href: '/compliance', words: 'compliance hdb drc casetrust bizsafe bca acra permit rules regulations mcst ura lew' },
  settingCard('projects', 'workload', 'Workload', 'Projects · projects one person can run at once', 'workload-settings', 'capacity workload default'),
  { id: 'members-capacity', title: 'Projects at once', sub: 'Company › Members · how many projects each person can run', icon: 'group', href: '/company/members', words: 'capacity workload projects at once member' },   // (one-home N-17) a member's capacity lives on Members
  settingCard('projects', 'compliance', 'Compliance tasks', 'Projects · start each project with its compliance tasks', 'compliance-settings', 'compliance starter tasks permit'),
]
/** The pages shown before anything is typed. */
export const JUMP_TO = ['leads', 'projects', 'tasks', 'quotes', 'contracts', 'visualizer', 'company-templates', 'settings-studio', 'shortcuts']
/** (parity map, FB-114) …and Accounting's — their work, in the order they reach for it. */
export const ACCOUNTING_JUMP_TO = ['finance-overview', 'finance-money-in', 'finance-reports', 'tasks', 'settings-finance', 'shortcuts']
/** (S44O — call C6) …and Marketing's — the lead desk's. */
export const MARKETING_JUMP_TO = ['dashboard', 'leads', 'tasks', 'insights', 'settings-leads', 'shortcuts']
/** (S44O — C6) A page a Marketing member opens (lib/settings/roles.ts `opensPath`) — of Settings, Lead management alone. */
export const marketingPage = (href: string) => href.startsWith('#') || (href.startsWith('/settings') ? href.includes('section=leads') : opensPath('Marketing', href))
/** (parity map, FB-114) A page an Accounting member opens (lib/settings/roles.ts `opensPath`) — of Settings, Finance's module alone; of
    Reports, Finance's tab. */
export const accountingPage = (href: string) => href.startsWith('#') || (href.startsWith('/settings') ? href.includes('section=finance')
  : href.startsWith('/company/reports') ? /^\/company\/reports(\/finance)?(\?|#|$)/.test(href) : opensPath('Accounting', href))

/** Pages that answer the query (matched in the browser — they are the app's own words). */
export function pageHits(query: string, o: { accounting?: boolean; /** (S44O — C6) a Marketing member */ marketing?: boolean; /** (pending modules S08) a Manager or a Designer */ member?: boolean; /** (pending modules S41b-5) the studio's Owner */ owner?: boolean } = {}): SearchHit[] {
  return PAGES.filter((p) => (!o.accounting || accountingPage(p.href)) && (!o.marketing || marketingPage(p.href)) && !((o.member || o.accounting) && p.runners) && (!p.owners || !!o.owner)).flatMap((p) => {
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
  { id: 'create-project', title: 'New project', sub: 'Projects · a project with no lead before it', icon: 'business_center', href: '/projects?new=1', words: 'add create project job direct' },   // (REG-922)
  { id: 'create-quote', title: 'Create quote', sub: 'Tools › Quotes · for any lead, blank or from a template', icon: 'request_quote', href: '/quotes', words: 'new add quote quotation estimate' },
  { id: 'create-task', title: 'New task', sub: 'Tasks · for a lead or the studio', icon: 'task_alt', href: '/tasks', pick: 'Create New Task', words: 'add create task todo to-do reminder follow-up' },
  /* (S46A — the findability audit's T-1 · M4) (invented copy) 1.0's Quote Digitizer: Create Quote, opened on Upload a quote (`?upload=1`) */
  { id: 'create-upload-quote', onlyTyped: true, title: 'Upload a quote', sub: 'Tools › Quotes · an existing quote’s lines, read from a spreadsheet or a PDF', icon: 'upload_file', href: '/quotes?upload=1', words: 'upload import digitize digitise digitizer digitiser quote digitizer existing quote pdf excel xlsx spreadsheet contractor' },
  /* (S46A — N-1 · M1) (invented copy) 1.0's New Ticket / Log Ticket: Tickets' New ticket (`?new=1`, S46B's; at /tickets since REG-2524) */
  { id: 'create-ticket', onlyTyped: true, title: 'New ticket', sub: 'Tickets · a defect or a client’s issue, on one of your projects', icon: 'handyman', href: '/tickets?new=1', words: 'add create new log raise ticket escalation escalate issue defect complaint support snag' },
  /* (S46A — T-4 · M5) (invented copy) 1.0's Start Meeting Copilot: Tools › Meeting Copilot's New Meeting ▾ › Start a meeting now, pressed on arrival */
  { id: 'create-meeting', onlyTyped: true, title: 'Start a meeting', sub: 'Tools › Meeting Copilot · the co-pilot opens now', icon: 'event', href: '/meetings', pick: 'Start a meeting now', words: 'new start meeting copilot co-pilot live session consultation now' },
  /* (S42 audit A-08) inviting your team (S09): Add member opens on Members, empty (`?new=1`) — Owners and Admins only, who may add */
  { id: 'create-member', onlyTyped: true, runners: true, title: 'Add a member', sub: 'Company › Members · they get an invitation to join', icon: 'person_add', href: '/company/members?new=1', words: 'add invite invitation team member colleague designer staff person join new hire' },
  { id: 'create-design', title: 'New design', sub: 'AI Visualizer · start from a room photo', icon: 'wand_shine', href: '/visualizer?new=1', words: 'add create design render visualise visualize room' },
  { id: 'create-message', onlyTyped: true, title: 'New message', sub: 'Messages · to a member, a new group or a client', icon: 'chat', href: '/chat', words: 'add create start write message chat group team direct conversation' },   // (pending modules S26) New message ▾ opens on arrival
  { id: 'create-layout', onlyTyped: true, title: 'New 3D layout', sub: '3D Space Planner · from an HDB, condo or landed flat', icon: 'space_dashboard', href: '/planner?new=1', words: 'add create 3d layout floor plan furniture planner space hdb condo' },   // (gaps build J)
  { id: 'create-picture', onlyTyped: true, title: 'Make a 3D picture', sub: '3D Space Planner · from a floor-plan photo', icon: 'view_in_ar', href: '/planner?view=iso&photo=1', words: 'add create make 3d picture floor plan photo isometric dollhouse top down floorplan' },   // (pending modules S28)
  /* (gaps build F1) money out */
  /* (simplify S-14 · F1 §6.9.6) a member's empty search offers them too — Log an expense first, their weekly job on site */
  { id: 'create-expense', onlyTyped: true, forMembers: true, title: 'Log an expense', sub: 'Company › Finance · a project’s cost, the overhead, a claim', icon: 'shopping_cart', href: '/company/finance/money-out?kind=expenses&new=1', words: 'add create log expense claim reimbursement receipt' },
  { id: 'create-po', onlyTyped: true, forMembers: true, title: 'New purchase order', sub: 'Company › Finance · to a vendor, for a project', icon: 'local_shipping', href: '/company/finance/money-out?kind=purchase-orders&new=1', words: 'add create po purchase order vendor supplier' },
  { id: 'create-bill', onlyTyped: true, forMembers: true, title: 'Record a supplier bill', sub: 'Company › Finance · drop its PDF and it is read for you', icon: 'receipt_long', href: '/company/finance/money-out?kind=bills&new=1', words: 'add create record bill supplier invoice vendor' },
]
/** A query that starts by asking to make something ("new lead", "add a task", "create quote") puts Create first. */
const CREATE_VERB = /^(new|add|create|make|start)\b/i
/** (parity map, FB-114) Accounting's Create rows: a task, an expense, a supplier bill — never a lead, a project, a quote or a PO. */
const ACCOUNTING_CREATE = ['create-task', 'create-expense', 'create-bill']
/** The Create rows a query matches — all four when nothing is typed. */
export function createHits(query: string, o: { member?: boolean; accounting?: boolean; /** (S44O — C6) a new lead and a task only */ marketing?: boolean } = {}): SearchHit[] {
  const asks = CREATE_VERB.test(query.trim())
  return CREATE.filter((p) => (!o.accounting || ACCOUNTING_CREATE.includes(p.id)) && (!o.marketing || p.id === 'create-lead' || p.id === 'create-task') && !(o.member && p.runners)).flatMap((p) => {   // (S42 audit A-08) a runners' Create row too
    if (p.onlyTyped && !query.trim() && !((o.member || o.accounting) && p.forMembers)) return []   // (gaps build F1) · (simplify S-14) a member's own Create rows
    const found = query.trim() ? rankOf(query, p.title, [p.sub, p.words]) : 0
    const rank = found !== null && asks ? found + 200 : found
    return rank === null ? [] : [{ kind: 'create' as const, id: p.id, title: p.title, sub: p.sub, href: p.href, icon: p.icon, rank }]
  }).sort((a, b) => b.rank - a.rank)
}
