/**
 * (REG-916, Q-20 · Q-23 · F-17) Who may do what on a project — pure rule functions the server actions call and the pages read, so a
 * refusal on screen and on the server is one sentence. Who SEES a project is its lead's rule (`canOpenLead` / `visibleLeadIds`, Settings ›
 * Who sees leads); these decide what the viewer may do once they see it. Round 7 adds Delete / Restore / Complete and their *Who may do
 * what* rows (`lib/settings/permissions.ts`) on the same shape.
 */
import { runsStudio, type Viewer } from '@/lib/leads/assign-policy'
import { isAccounting, isMarketing, seesBooks } from '@/lib/settings/roles'

type Who = Pick<Viewer, 'id' | 'role' | 'teamIds'>

/** On the project's team: one of the lead's members, or the Manager of one. Owners and Admins run every project. (parity map, FB-114) A
    member in Accounting is on no team — even one still listed on a lead from before their role changed — so nothing that follows the team
    (changing the project, its schedule, its client pages) reaches them. */
export function worksOn(viewer: Who, teamIds: readonly string[]): boolean {
  if (runsStudio(viewer.role)) return true
  if (isAccounting(viewer.role) || isMarketing(viewer.role)) return false   // (S44O — call C6) nor Marketing: never a project
  if (teamIds.includes(viewer.id)) return true
  return viewer.role === 'Manager' && teamIds.some((id) => viewer.teamIds.includes(id))
}

/** (F-17) Contract value and the payment schedule: the project's team, Owners and Admins — (parity map, MI-007) and Accounting, who keeps
    every project's books. */
export const seesMoney = (viewer: Who, teamIds: readonly string[]) => seesBooks(viewer.role) || worksOn(viewer, teamIds)
/** (Q-06) The listing's money — the Contract value column and the total — is the Owners' and Admins' (parity map, MI-007: and Accounting's). */
export const seesStudioMoney = (viewer: Pick<Viewer, 'role'>) => seesBooks(viewer.role)

export const CHANGE_RULE = 'Only the project’s team, their Managers, Owners and Admins change a project'   // (fix-B, B-47) Managers named, as worksOn lets them (REG-1059's way)
/** Rename, set its dates and value, start it. */
export const mayChangeProject = (viewer: Who, teamIds: readonly string[]) => worksOn(viewer, teamIds)
/** (Q-04) Any member may add a direct project; a Designer's is theirs (the lead form's rule, REG-609). (parity map, PR-022) Accounting never
    does — the Projects listing is not theirs, and they are on no project. */
export const mayCreateProject = (viewer: Pick<Viewer, 'role'>) => !isAccounting(viewer.role) && !isMarketing(viewer.role)   // (S44O — C6) nor Marketing
