import type { LeadRow } from '@/lib/leads/queries'
import { startOfDay } from '@/lib/format'

/** Filters modal model (780:94580) — Sort · Property type · Source · Assignees · Date. */
export type DatePreset = 'today' | '7d' | '30d' | 'custom'
export type LeadFilters = {
  sort: 'newest' | 'oldest'
  propertyTypes: string[]
  sources: string[]
  assignees: string[]      // member ids
  datePreset: DatePreset | null
  from: string             // d/m/yyyy (custom)
  to: string               // d/m/yyyy (custom)
}

export const EMPTY_FILTERS: LeadFilters = {
  sort: 'newest', propertyTypes: [], sources: [], assignees: [], datePreset: null, from: '', to: '',
}

/** Inverse of parseDMY — the d/m/yyyy the date fields accept. */
export function toDMY(d: Date): string {
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`
}

export function parseDMY(s: string): Date | null {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s.trim())
  if (!m) return null
  const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]))
  return d.getDate() === Number(m[1]) && d.getMonth() === Number(m[2]) - 1 ? d : null
}

/** Which filter groups carry a selection (drives the rail dots and the toolbar badge). */
export function activeGroups(f: LeadFilters): { sort: boolean; propertyTypes: boolean; sources: boolean; assignees: boolean; date: boolean } {
  return {
    sort: f.sort !== 'newest',
    propertyTypes: f.propertyTypes.length > 0,
    sources: f.sources.length > 0,
    assignees: f.assignees.length > 0,
    date: f.datePreset === 'custom' ? !!(parseDMY(f.from) || parseDMY(f.to)) : f.datePreset !== null,
  }
}
export const activeFilterCount = (f: LeadFilters) => Object.values(activeGroups(f)).filter(Boolean).length

export function applyFilters(rows: LeadRow[], f: LeadFilters, now: number): LeadRow[] {
  let out = rows
  if (f.propertyTypes.length) out = out.filter((r) => f.propertyTypes.includes(r.propertyType))
  if (f.sources.length) out = out.filter((r) => f.sources.includes(r.source))
  if (f.assignees.length) out = out.filter((r) => r.assignees.some((m) => f.assignees.includes(m.id)))
  if (f.datePreset) {
    const day = 86_400_000
    const today = startOfDay(new Date(now))
    let from: number | null = null, to: number | null = null
    if (f.datePreset === 'today') { from = today; to = today + day }
    else if (f.datePreset === '7d') { from = today - 6 * day; to = today + day }
    else if (f.datePreset === '30d') { from = today - 29 * day; to = today + day }
    else {
      const a = parseDMY(f.from), b = parseDMY(f.to)
      from = a ? a.getTime() : null
      to = b ? b.getTime() + day : null
    }
    out = out.filter((r) => {
      const t = r.createdAt.getTime()
      return (from === null || t >= from) && (to === null || t < to)
    })
  }
  if (f.sort === 'oldest') out = [...out].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
  return out
}
