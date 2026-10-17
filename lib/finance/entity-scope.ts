/**
 * (parity map, MO-079 · FB-105) ONE "Issued by" scope for every money list and report — Money in, Money out, To do, Reports › Finance.
 * 1.0 put an entity picker on top of Finance › Operations and its reports and an entity chip on each row (entity-picker.tsx · entity-chip.tsx);
 * 2.0 shows them **only when the studio has two or more issuing entities** (Company › Profile) — a studio with one never sees either.
 * Pure and client-safe.
 *
 * Records name their entity by its NAME (`quotes.issuing_entity`, `purchase_orders.issuing_entity`, `expenses.issuing_entity`,
 * `project_invoices.issuing_entity` …); null or blank = the studio's own — the first entity. So an option carries every name that means it,
 * and `matchesEntity` reads a row's stored name against the picked option.
 *
 * How a list uses it:
 *   const options = entityOptions(brand.details.entities)      // [] with fewer than two → render no pill, no chips
 *   const scope = entityOf(options, searchParams.get(ENTITY_PARAM))  // null = every entity
 *   rows.filter((r) => matchesEntity(r.entity, scope))          // a name, or { entity } / { issuingEntity }
 *   chip: entityChip(r.entity, options)                         // null while there is one entity
 *   pill: <ScopePill label={entityPillLabel(scope)} scoped={!!scope} … /> with a PortalMenu of `entityMenu(options)`
 */
import type { IssuingEntity } from '@/lib/templates/model'

/** The address's key for the scope (`?entity=<key>`); absent = every entity. */
export const ENTITY_PARAM = 'entity'
/** The pill's head word (invented copy, parity map MO-079 — 1.0's picker read the entity's name alone). */
export const ENTITY_SCOPE_WORD = 'Issued by'

export type EntityOption = {
  /** the entity's own id — stable across a rename ('studio' for the first) */
  key: string
  /** its name as Company › Profile spells it */
  label: string
  /** the studio's own (the first) — a record with no entity is this one's */
  first: boolean
  retired: boolean
  /** every stored name that means it: its name, and '' for the first (a record that names none) */
  names: string[]
}

type EntityLike = Pick<IssuingEntity, 'name'> & Partial<Pick<IssuingEntity, 'id' | 'retired'>>
const clean = (s: string | null | undefined) => (s ?? '').trim()
const fold = (s: string | null | undefined) => clean(s).toLowerCase()

/** The options of the scope, in Company › Profile's order — EMPTY when the studio has fewer than two entities (then nothing shows). Retired
    entities stay: their records still print under them. */
export function entityOptions(entities: readonly EntityLike[] | null | undefined): EntityOption[] {
  const list = (entities ?? []).filter((e) => clean(e.name))
  if (list.length < 2) return []
  return list.map((e, i) => ({
    key: clean(e.id) || (i === 0 ? 'studio' : `e${i}`), label: clean(e.name), first: i === 0, retired: !!e.retired,
    names: i === 0 ? ['', fold(e.name)] : [fold(e.name)],
  }))
}

/** The option the address names (by key, or by name for an old link), else null = every entity. */
export function entityOf(options: readonly EntityOption[], key: string | null | undefined): EntityOption | null {
  const k = clean(key)
  if (!k || k === 'all' || !options.length) return null
  return options.find((o) => o.key === k) ?? options.find((o) => o.names.includes(k.toLowerCase())) ?? null
}

type RowLike = string | null | undefined | { entity?: string | null; issuingEntity?: string | null }
const nameOfRow = (row: RowLike): string => (row && typeof row === 'object' ? fold(row.entity ?? row.issuingEntity) : fold(row))

/** Whether a row belongs to the picked entity: every row while nothing is picked (or the studio has one entity). `scope` is the option
    (`entityOf`), or its key with the options alongside. Pass the options too so a name no entity carries any more (an entity renamed before its
    records followed) counts as the studio's own — never lost from every scope. */
export function matchesEntity(row: RowLike, scope: EntityOption | string | null | undefined, options?: readonly EntityOption[]): boolean {
  if (!scope) return true
  const picked = typeof scope === 'string' ? (options ? entityOf(options, scope) : null) : scope
  if (!picked) return true
  const n = nameOfRow(row)
  if (picked.names.includes(n)) return true
  /* an unknown name belongs to the first, so it is always found somewhere */
  return picked.first && !!options && !options.some((o) => o.names.includes(n))
}

/** The option a row's stored name means (null while there is one entity). */
export function entityOfRow(row: RowLike, options: readonly EntityOption[]): EntityOption | null {
  if (!options.length) return null
  const n = nameOfRow(row)
  return options.find((o) => o.names.includes(n)) ?? options.find((o) => o.first) ?? null
}

/** The row's chip — the entity's name — only while the studio has two or more (null otherwise: no chip). */
export const entityChip = (row: RowLike, options: readonly EntityOption[]): string | null => entityOfRow(row, options)?.label ?? null

/** The pill's words: "Issued by: All" / "Issued by: Demo Studio Pte Ltd". */
export const entityPillLabel = (scope: EntityOption | null) => `${ENTITY_SCOPE_WORD}: ${scope ? scope.label : 'All'}`

/** The pill's menu rows: All first, then each entity (a retired one says so). */
export function entityMenu(options: readonly EntityOption[]): { key: string; label: string; meta?: string }[] {
  return options.length ? [{ key: 'all', label: 'All entities' }, ...options.map((o) => ({ key: o.key, label: o.label, meta: o.retired ? 'Retired' : undefined }))] : []
}

/** The address with the scope set (or dropped for All), keeping every other parameter. */
export function withEntity(href: string, key: string | null): string {
  const [path, query = ''] = href.split('?')
  const q = new URLSearchParams(query)
  if (!key || key === 'all') q.delete(ENTITY_PARAM); else q.set(ENTITY_PARAM, key)
  const s = q.toString()
  return s ? `${path}?${s}` : (path ?? href)
}
