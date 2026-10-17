/**
 * (REG-601) Who may assign a lead to whom, and who sees which leads — Dyel's hierarchy (Tech sheet row 25): the owner assigns
 * anyone; a Manager assigns within their team (themselves and the Designers who report to them); a Designer keeps the leads
 * assigned to them and reassigns nobody. Pure: the pages compute a `Viewer` once and hand it to every picker.
 */
import type { Member } from '@/lib/db/schema'
import type { LeadVisibility } from '@/lib/settings/types'
import { onLeads, runsLeads, runsStudio, seesBooks } from '@/lib/settings/roles'

export type Viewer = { id: string; role: string; /** the Designers who report to a Manager */ teamIds: string[]; visibility: LeadVisibility
  /** (pending modules S41b-1) whether they see cost, mark-up and margin — `fetchViewer()` reads Settings › Roles & access › Who sees costs and
      margins; absent = the role's default (lib/settings/cost-visibility.ts `seesCost`) */ costs?: boolean }

/* (parity map, FB-114) The role predicates live in lib/settings/roles.ts — runsStudio is re-exported here, where every gate imports it. */
export { runsStudio }

/** (REG-646, settings parity Q-06) A deactivated member keeps their records and leaves every picker; one still on the record being
    edited (`keep`) stays listed, so they can be taken off. (parity map, FB-114) A member in Accounting is never put on a lead or a project
    — the pickers leave them out the same way. */
export const pickable = <T extends { id: string; isActive?: boolean | null; role?: string | null }>(team: T[], keep: readonly string[] = []): T[] =>
  team.filter((m) => (m.isActive !== false && onLeads(m.role)) || keep.includes(m.id))

/** The member ids `viewer` may put on a lead: everyone · the team and themselves · nobody — active members only (REG-646), never a member
    in Accounting (parity map, FB-114). */
export function assignableIds(viewer: Viewer, team: (Pick<Member, 'id' | 'isActive'> & { role?: string | null })[]): string[] {
  const live = team.filter((m) => m.isActive !== false && onLeads(m.role))
  if (runsLeads(viewer.role)) return live.map((m) => m.id)   // (S44O — C6) Marketing hands leads to anyone, as Owners and Admins do
  if (viewer.role === 'Manager') return live.filter((m) => m.id === viewer.id || viewer.teamIds.includes(m.id)).map((m) => m.id)
  return []
}

/** Why the Assign popover is read-only for `viewer` — null when they may assign. */
export function assignHint(viewer: Viewer): string | null {
  if (runsLeads(viewer.role) || viewer.role === 'Manager') return null
  return 'Designers keep the leads assigned to them. Ask your manager to reassign.'
}

/** Whether `viewer` sees a lead with these assignees under the studio's visibility rule. (parity map, FB-114) A member in Accounting sees
    every record the books reach — a project's money, its files — as Owners and Admins do; the doors they have are fewer (lib/settings/roles.ts
    `opensPath`: never the Leads pipeline, never a project's design or client pages). */
export function canSeeLead(viewer: Viewer, assigneeIds: string[]): boolean {
  if (viewer.visibility === 'everyone' || seesBooks(viewer.role) || runsLeads(viewer.role)) return true   // (S44O — C6) Marketing: the whole pipeline
  const mine = new Set([viewer.id, ...(viewer.role === 'Manager' ? viewer.teamIds : [])])
  return assigneeIds.some((id) => mine.has(id))
}
