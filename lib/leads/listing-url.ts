import { ALL_STAGES, type Stage } from './enums'
import { EMPTY_FILTERS, QUICK_FILTERS, type AttentionScope, type DatePreset, type LeadFilters, type QuickFilter } from './filters'

/**
 * (parity P-18, B-01) The Leads listing's view lives in its address, as the Projects listing's does (REG-926): the pill's scope (a stage or
 * Mine / a to-do), the search, the Filters groups and the head sort are read from the address once and written back as they change, and every
 * lead the listing opens carries `?from=<this address>` — so Back from a lead lands on the listing exactly as it was. Pure: the server page,
 * the workspace and the probes read the same words.
 *
 *   /leads?scope=contacted&q=Farah&type=Condo&type=HDB+5-Room&member=dane&date=custom&start=1%2F9%2F2026&col=created&dir=desc
 *
 * Several values ride as repeated keys (a source or a property type may hold a comma). The custom period's two ends are `start` / `end` —
 * `from` is the address's way back (lib/nav.ts) and is never the listing's. Keys the listing does not own (`view`, the remembered table or
 * kanban — lib/leads/view-pref.ts) are left as they are.
 */
export type ListingSort<K extends string = string> = { key: K; dir: 'asc' | 'desc' } | null
export type ListingState<K extends string = string> = { stage: Stage | null; attention: AttentionScope | null; query: string; filters: LeadFilters; sort: ListingSort<K> }

/** What reads an address: `URLSearchParams`, or Next's read-only one from `useSearchParams()`. */
type Params = { get: (k: string) => string | null; getAll: (k: string) => string[] }

const ATTENTION: readonly AttentionScope[] = ['mine', 'overdue', 'unassigned', 'unseen', 'today']   // (leads on the move, P-05) the phone's "to call today" chip keeps its scope in the address
const DATE_PRESETS: readonly DatePreset[] = ['today', '7d', '30d', 'month', 'custom']
/** "Quote Sent" → "quote-sent": a stage as the address spells it. */
export const stageSlug = (s: Stage) => s.toLowerCase().replace(/\s+/g, '-')
const STAGE_BY_SLUG = new Map<string, Stage>(ALL_STAGES.map((s) => [stageSlug(s), s]))

/** Every key the listing writes — the writer clears these and nothing else. */
export const LISTING_KEYS = ['scope', 'q', 'sort', 'quick', 'type', 'source', 'member', 'date', 'start', 'end', 'col', 'dir'] as const

const many = (p: Params, k: string) => [...new Set(p.getAll(k).map((v) => v.trim()).filter(Boolean))]

/** The listing's view from its address. `isSortKey` says which heads sort (the table's own rule); an unknown value reads as the default. */
export function readListing<K extends string>(p: Params, isSortKey: (k: string) => k is K): ListingState<K> {
  const scope = (p.get('scope') ?? '').trim().toLowerCase()
  const stage = STAGE_BY_SLUG.get(scope) ?? null
  const attention = !stage && (ATTENTION as readonly string[]).includes(scope) ? (scope as AttentionScope) : null
  const quickKeys = QUICK_FILTERS.map((q) => q.key) as string[]
  const date = p.get('date')
  const datePreset = date && (DATE_PRESETS as readonly string[]).includes(date) ? (date as DatePreset) : null
  const filters: LeadFilters = {
    ...EMPTY_FILTERS,
    sort: p.get('sort') === 'oldest' ? 'oldest' : 'newest',
    quick: many(p, 'quick').filter((k): k is QuickFilter => quickKeys.includes(k)),
    propertyTypes: many(p, 'type'),
    sources: many(p, 'source'),
    assignees: many(p, 'member'),
    datePreset,
    from: datePreset === 'custom' ? (p.get('start') ?? '') : '',
    to: datePreset === 'custom' ? (p.get('end') ?? '') : '',
  }
  const col = p.get('col')
  const sort: ListingSort<K> = col && isSortKey(col) ? { key: col, dir: p.get('dir') === 'desc' ? 'desc' : 'asc' } : null
  return { stage, attention, query: p.get('q') ?? '', filters, sort }
}

/** The address's query for this view: `base` (the address as it stands) keeps every key the listing doesn't own; defaults are left out. */
export function writeListing(s: ListingState, base: URLSearchParams | string = ''): string {
  const out = new URLSearchParams(base)
  for (const k of LISTING_KEYS) out.delete(k)
  const scope = s.stage ? stageSlug(s.stage) : s.attention
  if (scope) out.set('scope', scope)
  if (s.query.trim()) out.set('q', s.query.trim())
  const f = s.filters
  if (f.sort !== 'newest') out.set('sort', f.sort)
  for (const k of f.quick) out.append('quick', k)
  for (const t of f.propertyTypes) out.append('type', t)
  for (const src of f.sources) out.append('source', src)
  for (const m of f.assignees) out.append('member', m)
  if (f.datePreset) {
    out.set('date', f.datePreset)
    if (f.datePreset === 'custom') { if (f.from) out.set('start', f.from); if (f.to) out.set('end', f.to) }
  }
  if (s.sort) { out.set('col', s.sort.key); out.set('dir', s.sort.dir) }
  return out.toString()
}
