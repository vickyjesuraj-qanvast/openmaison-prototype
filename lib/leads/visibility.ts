import 'server-only'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leadAssignees, members } from '@/lib/db/schema'
import { sessionMemberId } from '@/lib/db/session'
import { fetchCostVisibility, fetchLeadVisibility } from '@/lib/settings/queries'
import { seesCostsAs } from '@/lib/settings/cost-visibility'   // (pending modules S41b-1)
import { canSeeLead, type Viewer } from '@/lib/leads/assign-policy'
import { isAccounting, opensPath, runsLeads, seesBooks } from '@/lib/settings/roles'

/** (REG-601) The signed-in member as a `Viewer`: their role, their team (the Designers reporting to them) and the studio's rule.
    (pending modules S41b-1) And whether they see costs and margins — Settings › Roles & access › Who sees costs and margins, read on every
    request (1.0: "the server checks on every request"), so every loader and action that asks `seesCost(viewer)` follows a switch at once.
    (pending modules S43A) The signed-in member is THIS browser's (lib/db/session.ts): a Designer signed in by a code sees her leads on her
    browser while the Owner's open window sees them all. */
export async function fetchViewer(): Promise<Viewer> {
  const [team, visibility, costSight, id] = await Promise.all([db.select({ id: members.id, role: members.role, managerId: members.managerId }).from(members), fetchLeadVisibility(), fetchCostVisibility(), sessionMemberId()])
  const me = team.find((m) => m.id === id) ?? null
  const role = me?.role ?? 'Owner'
  return { id, role, teamIds: me ? team.filter((m) => m.managerId === me.id).map((m) => m.id) : [], visibility, costs: seesCostsAs(role, costSight) }
}

/** The ids of the leads `viewer` may see (null = every lead). (parity map, FB-114) Accounting reaches every record the books do — through
    Finance's rows and a project's Money, never the Leads pipeline (the pages' gate, `refusesWorkspace`). */
export async function visibleLeadIds(viewer: Viewer): Promise<Set<string> | null> {
  if (viewer.visibility === 'everyone' || seesBooks(viewer.role) || runsLeads(viewer.role)) return null   // (S44O — C6) Marketing: the whole pipeline
  const links = await db.select({ leadId: leadAssignees.leadId, memberId: leadAssignees.memberId }).from(leadAssignees)
  const byLead = new Map<string, string[]>()
  for (const l of links) { const a = byLead.get(l.leadId); if (a) a.push(l.memberId); else byLead.set(l.leadId, [l.memberId]) }
  return new Set([...byLead.entries()].filter(([, ids]) => canSeeLead(viewer, ids)).map(([id]) => id))
}

/** Whether `viewer` may open this lead. */
export async function canOpenLead(viewer: Viewer, leadId: string): Promise<boolean> {
  if (viewer.visibility === 'everyone' || seesBooks(viewer.role) || runsLeads(viewer.role)) return true   // (S44O — C6)
  const links = await db.select({ memberId: leadAssignees.memberId }).from(leadAssignees).where(eq(leadAssignees.leadId, leadId))
  return canSeeLead(viewer, links.map((l) => l.memberId))
}

/** (parity map, PR-022 · FR-040) Whether the signed-in member is in Accounting — the studio's workspace (the Leads pipeline, Projects, a
    project's other views) answers them with the house gate (components/shell/access-gate.tsx) and their home is Company › Finance. */
export async function refusesWorkspace(viewer?: Viewer): Promise<boolean> {
  return isAccounting((viewer ?? await fetchViewer()).role)
}
/** (S44O — call C6) Whether the signed-in member's role does not open this address — the pages' server gate before any record is read, the
    same list the shell's net reads (lib/settings/roles.ts `opensPath`): Accounting's books, Marketing's leads. A page passes its own address. */
export async function refusesPath(path: string, viewer?: Viewer): Promise<boolean> {
  return !opensPath((viewer ?? await fetchViewer()).role, path)
}
