import { DISTRICTS, PROPERTY_TYPES, STYLE_OPTIONS } from '@/lib/leads/enums'

/*
 * (REG-612, parity Q-27) A member's lead preferences — 1.0's `studio_members.lead_preferences` on 2.0's vocabulary: four
 * dimensions (property type · budget bracket · design style · area), each a set of values with a priority — Must match (weight 3)
 * or Nice to have (weight 1); a dimension left alone is "Don't care". 1.0's fifth dimension, Scope, has no value on a 2.0 lead
 * before the Won step and is left out. Pure and client-safe.
 */
export type Priority = 'must' | 'nice'
export type Dimension = 'propertyType' | 'budget' | 'style' | 'area'
export type Preference = { values: string[]; priority: Priority }
export type LeadPreferences = Partial<Record<Dimension, Preference>>

export const BUDGET_BRACKETS = [
  { key: 'lt40', label: 'Under S$40k', min: 0, max: 40_000 },
  { key: '40-60', label: 'S$40k–60k', min: 40_000, max: 60_000 },
  { key: '60-100', label: 'S$60k–100k', min: 60_000, max: 100_000 },
  { key: '100-150', label: 'S$100k–150k', min: 100_000, max: 150_000 },
  { key: '150+', label: 'S$150k+', min: 150_000, max: Infinity },
] as const
/** The bracket a lead's budget falls in — null when the lead has none. */
export const bracketOf = (budgetMinor: number): string | null => { const b = budgetMinor / 100; return b > 0 ? BUDGET_BRACKETS.find((x) => b >= x.min && b < x.max)?.key ?? null : null }

export const DIMENSIONS: { key: Dimension; label: string; options: readonly string[]; labelOf: (v: string) => string }[] = [
  { key: 'propertyType', label: 'Property type', options: PROPERTY_TYPES, labelOf: (v) => v },
  { key: 'budget', label: 'Budget', options: BUDGET_BRACKETS.map((b) => b.key), labelOf: (v) => BUDGET_BRACKETS.find((b) => b.key === v)?.label ?? v },
  { key: 'style', label: 'Design style', options: STYLE_OPTIONS.filter((s) => s !== 'No preference' && s !== 'Others'), labelOf: (v) => v },
  { key: 'area', label: 'Area / district', options: DISTRICTS, labelOf: (v) => v },
]
export const PRIORITIES: { key: Priority; label: string }[] = [{ key: 'must', label: 'Must match' }, { key: 'nice', label: 'Nice to have' }]
export const DONT_CARE = 'Don’t care'
export const WEIGHT: Record<Priority, number> = { must: 3, nice: 1 }

export function parsePreferences(v: string | null | undefined): LeadPreferences {
  if (!v) return {}
  try {
    const o = JSON.parse(v) as Record<string, { values?: unknown; priority?: unknown }>
    const out: LeadPreferences = {}
    for (const d of DIMENSIONS) {
      const p = o?.[d.key]
      if (!p || typeof p !== 'object') continue
      const values = Array.isArray(p.values) ? p.values.filter((x): x is string => typeof x === 'string' && (d.options as readonly string[]).includes(x)) : []
      const priority: Priority = p.priority === 'must' ? 'must' : 'nice'
      if (values.length) out[d.key] = { values, priority }
    }
    return out
  } catch { return {} }
}
export const preferenceCount = (p: LeadPreferences): number => DIMENSIONS.filter((d) => (p[d.key]?.values.length ?? 0) > 0).length
/** "HDB 4-Room, Condo 3-bedder (must) · S$60k–100k (nice) · East" — the Members row's one line; empty when nothing is set. */
export function summarisePreferences(p: LeadPreferences): string {
  return DIMENSIONS.filter((d) => p[d.key]?.values.length).map((d) => { const pref = p[d.key]!; return `${pref.values.map(d.labelOf).join(', ')} (${pref.priority === 'must' ? 'must' : 'nice'})` }).join(' · ')
}
