import type { Contract } from '@/lib/db/schema'
import { displayDate, parseInputDate, startOfDay } from '@/lib/format'
import { filterByQuery } from '@/lib/search'

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
export function applyContractFilters<T extends Contract>(rows: T[], f: ContractFilters, now: number): T[] {
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

/**
 * Search matches every column the Contracts row prints (REG-274, user 2026-09-01 "look at the other pages"):
 * title · status label · Created · Signed Copy (the file name in the cell) · Sent · Updated. Dates are matched as
 * `displayDate` renders them ("17 Jul ’26"), never as raw timestamps; an empty cell (the row's "-") contributes
 * nothing. Title alone was searchable before, so a contract could not be found by its status, its dates or the
 * signed copy sitting in plain sight in its row.
 */
/** (REG-634, contracts parity E-125) `extra` adds a row's own words — Tools › Contracts searches the lead's name too. */
export function searchContracts<T extends Contract>(rows: T[], query: string, extra?: (c: T) => string | null): T[] {
  return filterByQuery(rows, query, (c) => ({
    fields: [
      extra?.(c) ?? null,
      c.title,
      c.status,
      displayDate(c.createdAt),
      c.signedCopy,
      c.sentAt ? displayDate(c.sentAt) : null,
      displayDate(c.updatedAt ?? c.createdAt),
    ],
  }))
}

/* ── (pending modules S03 — REG-178's inert heads, "sort on the table heads") a column's own order ─────────────────────────────────────
   The projects table's model (fix-A, A-24): a head cycles A→Z (oldest first) → Z→A (newest first) → off, and ONE sort holds at a time —
   a head's sort sets Filters' Sort back to its default, an order picked in Filters takes the head's off. Status reads the journey's order. */
export type ContractHeadSort = { key: ContractSortKey; dir: 'asc' | 'desc' } | null
export const CONTRACT_SORT_KEYS = ['status', 'created', 'sent', 'updated'] as const
export type ContractSortKey = (typeof CONTRACT_SORT_KEYS)[number]
export const isContractSortKey = (k: string): k is ContractSortKey => (CONTRACT_SORT_KEYS as readonly string[]).includes(k)
const statusRank = (s: string) => { const i = (CONTRACT_STATUSES as readonly string[]).indexOf(s); return i < 0 ? CONTRACT_STATUSES.length : i }
const valueOf = (c: Contract, key: ContractSortKey): number | null =>
  key === 'status' ? statusRank(c.status) : key === 'created' ? c.createdAt.getTime() : key === 'sent' ? c.sentAt?.getTime() ?? null : (c.updatedAt ?? c.createdAt).getTime()
/** Rows in the head's order; an empty cell (no Sent date) always last; ties keep the order they came in. */
export function sortByHead<T extends Contract>(rows: T[], sort: ContractHeadSort): T[] {
  if (!sort) return rows
  const sign = sort.dir === 'asc' ? 1 : -1
  return rows.map((r, i) => ({ r, i, v: valueOf(r, sort.key) }))
    .sort((a, b) => (a.v === null && b.v === null ? a.i - b.i : a.v === null ? 1 : b.v === null ? -1 : (a.v - b.v) * sign || a.i - b.i))
    .map((x) => x.r)
}
export const nextHeadSort = (s: ContractHeadSort, key: ContractSortKey): ContractHeadSort => (s?.key !== key ? { key, dir: 'asc' } : s.dir === 'asc' ? { key, dir: 'desc' } : null)
