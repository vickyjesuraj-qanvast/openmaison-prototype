/**
 * Quote editor sections (page 1260:31139): the eight cards in the mock's order. Three are fixed — General Info first,
 * Items second and Activity last carry no drag handle (1271:39681 · 1260:31210 · 1260:32316) — the five between them
 * reorder and the order is remembered per quote (owner 2026-09-11). Default state: General Info and Items expanded,
 * everything else collapsed (owner 2026-09-11). Client-safe: no server imports.
 */
export const SECTION_KEYS = ['general', 'items', 'payment', 'files', 'terms', 'notes', 'signature', 'activity'] as const
export type SectionKey = (typeof SECTION_KEYS)[number]
export type QuoteSectionState = { key: SectionKey; collapsed: boolean }

export const SECTION_LABELS: Record<SectionKey, string> = {
  general: 'General info',   // (the calm UI build 2026-10-27, W-200 · T-13) sentence case, as the phone's section list
  items: 'Items',
  payment: 'Payment schedule',
  files: 'Files',
  terms: 'Terms and conditions',
  notes: 'Additional notes',
  signature: 'Signature',
  activity: 'Activity',
}

/** Sections drawn WITHOUT a drag handle: they keep their place. */
export const FIXED_SECTIONS: readonly SectionKey[] = ['general', 'items', 'activity']
export const isFixedSection = (k: SectionKey) => FIXED_SECTIONS.includes(k)

export const DEFAULT_SECTIONS: readonly QuoteSectionState[] = [
  { key: 'general', collapsed: false },
  { key: 'items', collapsed: false },
  { key: 'payment', collapsed: true },
  { key: 'files', collapsed: true },
  { key: 'terms', collapsed: true },
  { key: 'notes', collapsed: true },
  { key: 'signature', collapsed: true },
  { key: 'activity', collapsed: true },
]

const isKey = (k: unknown): k is SectionKey => typeof k === 'string' && (SECTION_KEYS as readonly string[]).includes(k)

/**
 * Parse the stored JSON defensively (a public server action writes it): unknown keys drop, missing keys are appended in
 * default order, duplicates collapse to the first, and the fixed sections are pinned to their places whatever was stored.
 */
export function parseSections(json: string | null | undefined): QuoteSectionState[] {
  let raw: unknown = null
  if (json) { try { raw = JSON.parse(json) } catch { raw = null } }
  const seen = new Set<SectionKey>()
  const list: QuoteSectionState[] = []
  if (Array.isArray(raw)) {
    for (const item of raw) {
      const key = (item as { key?: unknown } | null)?.key
      if (!isKey(key) || seen.has(key)) continue
      seen.add(key)
      list.push({ key, collapsed: !!(item as { collapsed?: unknown }).collapsed })
    }
  }
  for (const d of DEFAULT_SECTIONS) if (!seen.has(d.key)) list.push({ ...d })
  return pinFixed(list)
}

/** General first, Items second, Activity last; the movable five keep their relative order. */
export function pinFixed(list: QuoteSectionState[]): QuoteSectionState[] {
  const by = (k: SectionKey) => list.find((s) => s.key === k) ?? { key: k, collapsed: DEFAULT_SECTIONS.find((d) => d.key === k)?.collapsed ?? true }
  const movable = list.filter((s) => !isFixedSection(s.key))
  return [by('general'), by('items'), ...movable, by('activity')]
}

export const serializeSections = (list: readonly QuoteSectionState[]) => JSON.stringify(list.map((s) => ({ key: s.key, collapsed: s.collapsed })))
