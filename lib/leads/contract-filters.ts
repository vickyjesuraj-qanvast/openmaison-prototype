import type { Contract } from '@/lib/db/schema'
import { parseInputDate, startOfDay } from '@/lib/format'

/* Lead Details › Contracts (931-38609) — pure model shared by the table, the status menu and the Filters modal.
   The mock shows "Draft" only; the statuses, filters and search are the Quotes tab's model trimmed to the Contracts columns (REG-178). */

export const CONTRACT_STATUSES = ['Draft', 'Sent to Client', 'Signed'] as const
export type ContractStatus = (typeof CONTRACT_STATUSES)[number]

export type ContractSort = 'newest' | 'oldest'
export type ContractDatePreset = '' | 'today' | 'last7' | 'last30' | 'custom'
export type ContractFilters = {
  sort: ContractSort
  date: ContractDatePreset
  from: string             // d/m/yyyy (DateField value — never typed, REG-119); only read when date === 'custom'
  to: string
  status: ContractStatus[]
}
export const EMPTY_CONTRACT_FILTERS: ContractFilters = { sort: 'newest', date: '', from: '', to: '', status: [] }

export function activeContractGroups(f: ContractFilters): { sort: boolean; date: boolean; status: boolean } {
  return {
    sort: f.sort !== 'newest',
    date: f.date === 'custom' ? !!(parseInputDate(f.from) || parseInputDate(f.to)) : f.date !== '',
    status: f.status.length > 0,
  }
}
export const activeContractFilterCount = (f: ContractFilters) => Object.values(activeContractGroups(f)).filter(Boolean).length

/** Filter + sort — the Date pane bounds Created (the first date column), presets are day-granular windows ending today. */
export function applyContractFilters(rows: Contract[], f: ContractFilters, now: number): Contract[] {
  let out = rows
  const day = 86_400_000
  const today = startOfDay(new Date(now))
  if (f.date && f.date !== 'custom') {
    const from = f.date === 'today' ? today : f.date === 'last7' ? today - 6 * day : today - 29 * day
    out = out.filter((c) => c.createdAt.getTime() >= from && c.createdAt.getTime() < today + day)
  } else if (f.date === 'custom') {
    const a = parseInputDate(f.from), b = parseInputDate(f.to)
    if (a || b) {
      const from = a ? a.getTime() : null
      const to = b ? b.getTime() + day : null
      out = out.filter((c) => { const t = c.createdAt.getTime(); return (from === null || t >= from) && (to === null || t < to) })
    }
  }
  if (f.status.length) out = out.filter((c) => (f.status as readonly string[]).includes(c.status))
  const sorted = [...out]
  if (f.sort === 'newest') sorted.sort((x, y) => y.createdAt.getTime() - x.createdAt.getTime())
  else sorted.sort((x, y) => x.createdAt.getTime() - y.createdAt.getTime())
  return sorted
}

/** Search matches the title. */
export function searchContracts(rows: Contract[], query: string): Contract[] {
  const q = query.trim().toLowerCase()
  return q ? rows.filter((c) => c.title.toLowerCase().includes(q)) : rows
}
