/*
 * (gaps build J, J-Q12) Who may change a layout — pure and client-safe, so a refusal on screen and on the server is one sentence.
 * Who SEES a project's layout is its lead's rule (Settings › Who sees leads); a personal layout is every member's to see (the AI
 * Visualizer's personal designs). Changing it: its maker, an Owner or an Admin always; for a project's layout also the project's team and
 * their Managers (`worksOn`). A completed project's layouts are read-only (the Schedule's rule) — Duplicate makes a personal copy.
 */
import { worksOn } from '@/lib/projects/policy'
import type { Viewer } from '@/lib/leads/assign-policy'

type Who = Pick<Viewer, 'id' | 'role' | 'teamIds'>
const who = (name: string | null | undefined) => name?.trim() || 'whoever made it'
const runs = (v: Pick<Viewer, 'role'>) => v.role === 'Owner' || v.role === 'Admin'

export const personalRule = (maker?: string | null) => `Only ${who(maker)}, an Owner or an Admin can change, rename or delete this layout`
export const projectRule = (maker?: string | null) => `Only ${who(maker)}, the project’s team, their Managers, Owners and Admins can change this layout`
/** (pending modules S07) a lead's layout, before it is won — the lead's members in the project's team's place. *(invented copy)* */
export const leadRule = (maker?: string | null) => `Only ${who(maker)}, the lead’s members, their Managers, Owners and Admins can change this layout`
export const COMPLETED_RULE = 'The project is completed, so its layouts are read-only — duplicate one to work on a copy'
export const LAYOUTS_DELETE_RULE = 'Only whoever made a layout, its project’s team, Owners and Admins can delete it'

/** Why this viewer may not change the layout, or null. `project` — the layout's project (its team and stage), when it has one. */
export function layoutChangeBlock(v: Who, l: { createdBy: string | null; makerName?: string | null }, project: { teamIds: readonly string[]; stage: string; /** (pending modules S07) a lead's, not yet a project's */ lead?: boolean } | null): string | null {
  if (project?.stage === 'completed') return COMPLETED_RULE
  if (runs(v) || (!!v.id && v.id === l.createdBy)) return null
  if (project) return worksOn(v, project.teamIds) ? null : project.lead ? leadRule(l.makerName) : projectRule(l.makerName)
  return personalRule(l.makerName)
}
/** Sharing with the client follows the same rule. */
export const layoutShareBlock = layoutChangeBlock

/** (J-Q14) The message a WhatsApp share drafts — the client's first name, the layout, the link. */
export const shareDraft = (client: string | null, layout: string, url: string, sender: string | null) =>
  `Hi${client ? ` ${client.split(/\s+/)[0]}` : ''}, here is the 3D layout ${layout ? `“${layout}” ` : ''}for you to walk through — turn it, walk inside it and look at each room: ${url}${sender ? `\n\n— ${sender.split(/\s+/)[0]}` : ''}`
