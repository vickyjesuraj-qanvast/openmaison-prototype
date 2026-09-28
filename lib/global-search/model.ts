import { COMPANY_GROUPS, TEMPLATE_KINDS } from '@/lib/company/sections'
import { SETTINGS_MODULES, settingsHref } from '@/lib/settings/modules'

/**
 * (REG-709, owner 2026-09-28: "this search is a global prototype search … a popover window like what we have for company tab with a search
 * bar and the results shows within") The global search's model — pure and client-safe: what a result is, the scopes, how a record ranks
 * against what was typed (the house rule of REG-274 — it matches when the words appear in the text the result shows, a phone number digit
 * to digit — with every word of the query needing a match), the pieces of a line to mark, and the pages "Jump to" offers.
 */
export type SearchKind = 'lead' | 'quote' | 'xray' | 'contract' | 'task' | 'note' | 'file' | 'design' | 'template' | 'book' | 'material' | 'member' | 'page'

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
  design: 'AI Visualizer', template: 'Templates', book: 'Price book', material: 'Materials', member: 'People', page: 'Go to',
}
export const KIND_ORDER: SearchKind[] = ['lead', 'quote', 'contract', 'task', 'note', 'file', 'xray', 'design', 'template', 'book', 'material', 'member', 'page']

/** How many results a group shows under All before "Show all"; a scope shows up to `SCOPE_LIMIT`. */
export const ALL_LIMIT = 4
export const SCOPE_LIMIT = 40

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const digits = (s: string) => s.replace(/\D/g, '')
export const termsOf = (q: string) => q.toLowerCase().split(/\s+/).map((t) => t.trim()).filter(Boolean)

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
  let score = 0
  for (const term of terms) {
    const d = digits(term)
    if (t.startsWith(term)) score += 30
    else if (new RegExp(`(^|[^a-z0-9])${esc(term)}`).test(t)) score += 22
    else if (t.includes(term)) score += 14
    else if (rest.some((o) => o.includes(term))) score += 6
    else if (d.length > 0 && d.length === term.replace(/[\s+()-]/g, '').length && nums.some((n) => n.includes(d))) score += 10
    else return null
  }
  if (t === query.trim().toLowerCase()) score += 40
  return score
}

/** A line cut where the query's words appear, for marking them. */
export function marks(text: string, query: string): { text: string; hit: boolean }[] {
  const terms = termsOf(query).filter((t) => t.length > 0).sort((a, b) => b.length - a.length)
  if (!terms.length || !text) return [{ text, hit: false }]
  const re = new RegExp(`(${terms.map(esc).join('|')})`, 'gi')
  return text.split(re).filter((p) => p !== '').map((p) => ({ text: p, hit: terms.includes(p.toLowerCase()) }))
}

/** The pages "Go to" offers, from the places the app already names them (the rail, Tools, Company, Templates, Settings). */
export type SearchPage = { id: string; title: string; sub: string; icon: string; href: string }
export const PAGES: SearchPage[] = [
  { id: 'leads', title: 'Leads', sub: 'Every lead in the studio', icon: 'people_alt', href: '/leads' },
  { id: 'tasks', title: 'Tasks', sub: 'Every task, a lead’s or the studio’s', icon: 'task_alt', href: '/tasks' },
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
]
/** The pages shown before anything is typed. */
export const JUMP_TO = ['leads', 'tasks', 'quotes', 'contracts', 'visualizer', 'company-templates', 'settings-studio', 'shortcuts']

/** Pages that answer the query (matched in the browser — they are the app's own words). */
export function pageHits(query: string): SearchHit[] {
  return PAGES.flatMap((p) => {
    const rank = rankOf(query, p.title, [p.sub])
    return rank === null ? [] : [{ kind: 'page' as const, id: p.id, title: p.title, sub: p.sub, href: p.href, icon: p.icon, rank }]
  }).sort((a, b) => b.rank - a.rank)
}
