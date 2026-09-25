/**
 * (REG-601) Who may assign a lead to whom, and who sees which leads — Dyel's hierarchy (Tech sheet row 25): the owner assigns
 * anyone; a Manager assigns within their team (themselves and the Designers who report to them); a Designer keeps the leads
 * assigned to them and reassigns nobody. Pure: the pages compute a `Viewer` once and hand it to every picker.
 */
import type { Member } from '@/lib/db/schema'
import type { LeadVisibility } from '@/lib/settings/types'

export type Viewer = { id: string; role: string; /** the Designers who report to a Manager */ teamIds: string[]; visibility: LeadVisibility }

export const runsStudio = (role: string | null | undefined) => role === 'Owner' || role === 'Admin'

/** (REG-646, settings parity Q-06) A deactivated member keeps their records and leaves every picker; one still on the record being
    edited (`keep`) stays listed, so they can be taken off. */
export const pickable = <T extends { id: string; isActive?: boolean | null }>(team: T[], keep: readonly string[] = []): T[] =>
  team.filter((m) => m.isActive !== false || keep.includes(m.id))

/** The member ids `viewer` may put on a lead: everyone · the team and themselves · nobody — active members only (REG-646). */
export function assignableIds(viewer: Viewer, team: Pick<Member, 'id' | 'isActive'>[]): string[] {
  const live = team.filter((m) => m.isActive !== false)
  if (runsStudio(viewer.role)) return live.map((m) => m.id)
  if (viewer.role === 'Manager') return live.filter((m) => m.id === viewer.id || viewer.teamIds.includes(m.id)).map((m) => m.id)
  return []
}

/** Why the Assign popover is read-only for `viewer` — null when they may assign. */
export function assignHint(viewer: Viewer): string | null {
  if (runsStudio(viewer.role) || viewer.role === 'Manager') return null
  return 'Designers keep the leads assigned to them. Ask your manager to reassign.'
}

/** Whether `viewer` sees a lead with these assignees under the studio's visibility rule. */
export function canSeeLead(viewer: Viewer, assigneeIds: string[]): boolean {
  if (viewer.visibility === 'everyone' || runsStudio(viewer.role)) return true
  const mine = new Set([viewer.id, ...(viewer.role === 'Manager' ? viewer.teamIds : [])])
  return assigneeIds.some((id) => mine.has(id))
}
