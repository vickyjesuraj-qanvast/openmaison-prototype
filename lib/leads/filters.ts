import type { LeadRow } from '@/lib/leads/queries'
import { isOverdue, startOfDay } from '@/lib/format'

/** Filters modal model (780:94580) — Sort · Property type · Source · Assignees · Date. */
export type DatePreset = 'today' | '7d' | '30d' | 'month' | 'custom'   // (REG-610, parity L-27) 'month' = 1.0's "This month"
/** (REG-608, parity L-22) 1.0's quick filters, minus Hot (no temperature, Q-10) and Needs attention (no 2.0 meaning); every ticked one must hold. */
export type QuickFilter = 'overdue' | 'unassigned' | 'unseen'
export const QUICK_FILTERS: { key: QuickFilter; label: string; help: string }[] = [
  { key: 'overdue', label: 'Overdue follow-ups', help: 'An open task past its due date (not On Hold or Lost)' },
  { key: 'unassigned', label: 'Unassigned', help: 'No member yet' },
  { key: 'unseen', label: 'Unseen', help: 'Nobody has opened it' },
]

/**
 * (UX audit L3, supersedes the pane-only reach of REG-608) Morning triage where the eye is: the scope pill's menu carries these beside the
 * stages — "Mine", then the Needs attention group (the three quick filters with their counts). One of them, or a stage, scopes the listing;
 * the pill names it ("Overdue follow-ups (4)") and wears the applied dot.
 */
export type AttentionScope = QuickFilter | 'mine'
export const ATTENTION_LABEL: Record<AttentionScope, string> = { mine: 'Mine', overdue: 'Overdue follow-ups', unassigned: 'Unassigned', unseen: 'Unseen' }

/** (UX audit L3) ONE rule for an overdue lead — the pill's count, its list and the Filters modal's quick filter: an open task due before
 *  today (the red Overdue tag's own rule, `isOverdue`) on a lead still being worked. Parked (On Hold) and Lost leads are left out. */
export const isOverdueLead = (r: LeadRow, now: number): boolean =>
  r.stage !== 'On Hold' && r.stage !== 'Lost' && r.tasks.some((t) => isOverdue(t.dueAt, now))

/** Does the row belong to the attention scope? `unseen` is the caller's (the listing's band: nobody has opened it, here or on the server). */
export function inAttention(r: LeadRow, key: AttentionScope, ctx: { now: number; viewerId: string; unseen: (r: LeadRow) => boolean }): boolean {
  switch (key) {
    case 'mine': return r.assignees.some((m) => m.id === ctx.viewerId)
    case 'overdue': return isOverdueLead(r, ctx.now)
    case 'unassigned': return r.assignees.length === 0
    case 'unseen': return ctx.unseen(r)
  }
}
export type LeadFilters = {
  sort: 'newest' | 'oldest'
  quick: QuickFilter[]
  propertyTypes: string[]
  sources: string[]
  assignees: string[]      // member ids
  datePreset: DatePreset | null
  from: string             // d/m/yyyy (custom)
  to: string               // d/m/yyyy (custom)
}

export const EMPTY_FILTERS: LeadFilters = {
  sort: 'newest', quick: [], propertyTypes: [], sources: [], assignees: [], datePreset: null, from: '', to: '',
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
export function activeGroups(f: LeadFilters): { sort: boolean; quick: boolean; propertyTypes: boolean; sources: boolean; assignees: boolean; date: boolean } {
  return {
    sort: f.sort !== 'newest',
    quick: f.quick.length > 0,
    propertyTypes: f.propertyTypes.length > 0,
    sources: f.sources.length > 0,
    assignees: f.assignees.length > 0,
    date: f.datePreset === 'custom' ? !!(parseDMY(f.from) || parseDMY(f.to)) : f.datePreset !== null,
  }
}
export const activeFilterCount = (f: LeadFilters) => Object.values(activeGroups(f)).filter(Boolean).length

export function applyFilters(rows: LeadRow[], f: LeadFilters, now: number): LeadRow[] {
  let out = rows
  /* (REG-608) Quick filters AND together, as 1.0's do. */
  if (f.quick.includes('overdue')) out = out.filter((r) => isOverdueLead(r, now))   /* (UX audit L3) the one rule — parked and Lost leads out */
  if (f.quick.includes('unassigned')) out = out.filter((r) => r.assignees.length === 0)
  if (f.quick.includes('unseen')) out = out.filter((r) => r.seenAt === null)
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
    else if (f.datePreset === 'month') { const d = new Date(now); from = new Date(d.getFullYear(), d.getMonth(), 1).getTime(); to = today + day }   /* (REG-610) the 1st … today */
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
