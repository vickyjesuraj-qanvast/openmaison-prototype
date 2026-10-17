import type { ProjectRow } from '@/lib/projects/model'

/**
 * (REG-926) The Projects listing's Filters — Sort · Project type · Team — applied live (REG-464), kept in the address with the scope and the
 * search (`?sort=` `?type=` `?team=`). Pure and client-safe.
 */
export type ProjectSortKey = 'newest' | 'oldest' | 'end' | 'name'
export type ProjectFilters = { sort: ProjectSortKey; types: string[]; team: string[] }
export const EMPTY_PROJECT_FILTERS: ProjectFilters = { sort: 'newest', types: [], team: [] }
export const PROJECT_SORTS: { key: ProjectSortKey; label: string }[] = [
  { key: 'newest', label: 'Newest at the top' },
  { key: 'oldest', label: 'Oldest at the top' },
  { key: 'end', label: 'Target end, soonest first' },
  { key: 'name', label: 'Name, A to Z' },
]
export const isSortKey = (v: string | null | undefined): v is ProjectSortKey => !!v && PROJECT_SORTS.some((s) => s.key === v)
export const activeProjectGroups = (f: ProjectFilters) => ({ sort: f.sort !== 'newest', type: f.types.length > 0, team: f.team.length > 0 })
export const activeProjectFilterCount = (f: ProjectFilters) => Object.values(activeProjectGroups(f)).filter(Boolean).length

export function applyProjectFilters(rows: ProjectRow[], f: ProjectFilters): ProjectRow[] {
  const out = rows.filter((r) => (!f.types.length || (r.projectType !== null && f.types.includes(r.projectType)))
    && (!f.team.length || r.team.some((m) => f.team.includes(m.id))))
  const t = (d: Date | null) => d?.getTime() ?? Number.POSITIVE_INFINITY
  if (f.sort === 'oldest') return out.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
  if (f.sort === 'end') return out.sort((a, b) => t(a.targetEndDate) - t(b.targetEndDate))
  if (f.sort === 'name') return out.sort((a, b) => a.name.localeCompare(b.name))
  return out.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}
