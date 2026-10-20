/**
 * "What your client sees" (REG-490, the Houzz preview panel done our way): the client-facing switches a quote can turn
 * per quote, seeded from its template. Cost and markup are never among them. Client-safe.
 */
import { ITEM_COLUMN_KEYS, type ItemsBlock, type ItemsColumnKey, type TemplateDesign } from './model'

export type ClientView = {
  columns: Record<ItemsColumnKey, boolean>
  descriptions: boolean
  photos: boolean
  hiddenItems: 'omit' | 'no-price'
  optionalWorks: boolean
  subtotalBreakdown: boolean
  paymentSchedule: boolean
  terms: boolean
  notes: boolean
  signature: boolean
  approvePerLine: boolean
  branding: boolean
  /** (REG-585) What the client sees priced: every line · one amount per section (the template's lump sum) · the total only. */
  amounts: 'lines' | 'sections' | 'total'
  /** (REG-595) On a revision: the removed lines struck through, the new and changed ones marked. */
  changes: boolean
  /** (S44F — NB-01) Which changes: since the last version (REG-595, as always) · every version since the first, each in its own colour with a key.
      Unset on a view stored before = the last version's. */
  changesSince: 'last' | 'all'
}
export const AMOUNTS_LABEL: Record<ClientView['amounts'], string> = { lines: 'A price on every line', sections: 'One amount per section', total: 'The total only' }

/** The template's own client view — what its blocks print. */
export function clientViewFromDesign(design: TemplateDesign): ClientView {
  const items = design.blocks.find((b): b is ItemsBlock => b.kind === 'items')
  const columns = Object.fromEntries((ITEM_COLUMN_KEYS as readonly ItemsColumnKey[]).map((k) => [k, items?.columns.find((c) => c.key === k)?.on ?? false])) as ClientView['columns']
  const has = (kind: string) => design.blocks.some((b) => b.kind === kind && !b.hidden)
  const totals = design.blocks.find((b) => b.kind === 'totals')
  return {
    columns, descriptions: (items?.descriptions ?? 'none') !== 'none', photos: items?.photos ?? false, hiddenItems: items?.hiddenItems ?? 'omit', optionalWorks: items?.optionalSection ?? true,
    subtotalBreakdown: totals?.kind === 'totals' ? totals.lines.some((l) => l.on && l.key !== 'total') : true, paymentSchedule: has('payments'), terms: has('terms'), notes: has('notes'), signature: has('signature') || design.blocks.some((b) => (b.kind === 'footer' || b.kind === 'header') && !b.hidden && b.elements.some((e) => e.kind === 'signature')),
    approvePerLine: false, branding: true,
    amounts: items?.lumpSum ? 'sections' : 'lines',
    changes: true,
    changesSince: 'last',   // (S44F — NB-01) today's default
  }
}

export function parseClientView(json: string | null | undefined, base: ClientView): ClientView {
  if (!json) return base
  try { const raw = JSON.parse(json) as Partial<ClientView>; return { ...base, ...raw, columns: { ...base.columns, ...(raw.columns ?? {}) } } } catch { return base }
}
/** Which keys differ from the template's — the panel's "changed" marks and Reset. */
export function clientViewDiff(view: ClientView, base: ClientView): string[] {
  const out: string[] = []
  for (const k of Object.keys(base) as (keyof ClientView)[]) {
    if (k === 'columns') { for (const c of Object.keys(base.columns) as ItemsColumnKey[]) if (view.columns[c] !== base.columns[c]) out.push(`columns.${c}`) }
    else if (view[k] !== base[k]) out.push(k)
  }
  return out
}

/* ── (S44Q — row 352, his UAT ask 2026-10-15) One quote's view is kept ─────────────────────────────────────────────────────────────────────
   A quote stored its whole view, so a later change to its template never reached the switches it hadn't touched — and re-picking or changing
   the template wiped its choices (Spaces Studio: "removed the Unit price column … came back after reopening"). A quote now keeps only what IT
   changed, and carries those choices to another template or version wherever they still apply. Terms and Notes are the quote's own switches
   (the editor's "Show in client view") — never part of the stored view. */

/** A stored value is one the switch can hold (a save is a public endpoint). */
const fits = (k: keyof ClientView, v: unknown) => (k === 'hiddenItems' ? v === 'omit' || v === 'no-price' : k === 'amounts' ? v === 'lines' || v === 'sections' || v === 'total' : k === 'changesSince' ? v === 'last' || v === 'all' : typeof v === 'boolean')

/** The keys this quote changed from its template's view — what it stores; null = it follows its template. */
export function clientViewChoices(view: ClientView, base: ClientView): Partial<ClientView> | null {
  const out: Partial<Record<keyof ClientView, unknown>> = {}
  for (const k of Object.keys(base) as (keyof ClientView)[]) {
    if (k === 'terms' || k === 'notes') continue
    if (k === 'columns') {
      const cols: Partial<Record<ItemsColumnKey, boolean>> = {}
      for (const c of Object.keys(base.columns) as ItemsColumnKey[]) if (typeof view.columns[c] === 'boolean' && view.columns[c] !== base.columns[c]) cols[c] = view.columns[c]
      if (Object.keys(cols).length) out.columns = cols
    } else if (view[k] !== undefined && view[k] !== base[k] && fits(k, view[k])) out[k] = view[k]
  }
  return Object.keys(out).length ? (out as Partial<ClientView>) : null
}

/** A quote's stored view carried from the design it printed through to another one (re-picked or changed template, a version moved): its own
    choices that still differ from the new design's view and still apply — a column the new design's Items block has no place for is dropped. */
export function carryClientView(json: string | null | undefined, from: TemplateDesign, to: TemplateDesign): string | null {
  if (!json) return null
  const oldBase = clientViewFromDesign(from)
  const own = clientViewChoices(parseClientView(json, oldBase), oldBase)
  if (!own) return null
  const newBase = clientViewFromDesign(to)
  const items = to.blocks.find((b): b is ItemsBlock => b.kind === 'items')
  const has = new Set<string>(items?.columns.map((c) => c.key) ?? [])
  const cols = Object.fromEntries(Object.entries(own.columns ?? {}).filter(([k]) => has.has(k)))
  const next: ClientView = { ...newBase, ...own, columns: { ...newBase.columns, ...cols } }
  const kept = clientViewChoices(next, newBase)
  return kept ? JSON.stringify(kept) : null
}
