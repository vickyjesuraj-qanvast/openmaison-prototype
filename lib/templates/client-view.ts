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
