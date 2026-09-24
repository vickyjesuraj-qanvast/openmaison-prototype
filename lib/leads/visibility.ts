import 'server-only'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leadAssignees, members } from '@/lib/db/schema'
import { SESSION_MEMBER_ID } from '@/lib/db/session'
import { fetchLeadVisibility } from '@/lib/settings/queries'
import { canSeeLead, type Viewer } from '@/lib/leads/assign-policy'

/** (REG-601) The signed-in member as a `Viewer`: their role, their team (the Designers reporting to them) and the studio's rule. */
export async function fetchViewer(): Promise<Viewer> {
  const [team, visibility] = await Promise.all([db.select({ id: members.id, role: members.role, managerId: members.managerId, isYou: members.isYou }).from(members), fetchLeadVisibility()])
  const me = team.find((m) => m.isYou) ?? team.find((m) => m.id === SESSION_MEMBER_ID) ?? null
  return { id: me?.id ?? SESSION_MEMBER_ID, role: me?.role ?? 'Owner', teamIds: me ? team.filter((m) => m.managerId === me.id).map((m) => m.id) : [], visibility }
}

/** The ids of the leads `viewer` may see (null = every lead). */
export async function visibleLeadIds(viewer: Viewer): Promise<Set<string> | null> {
  if (viewer.visibility === 'everyone' || viewer.role === 'Owner' || viewer.role === 'Admin') return null
  const links = await db.select({ leadId: leadAssignees.leadId, memberId: leadAssignees.memberId }).from(leadAssignees)
  const byLead = new Map<string, string[]>()
  for (const l of links) { const a = byLead.get(l.leadId); if (a) a.push(l.memberId); else byLead.set(l.leadId, [l.memberId]) }
  return new Set([...byLead.entries()].filter(([, ids]) => canSeeLead(viewer, ids)).map(([id]) => id))
}

/** Whether `viewer` may open this lead. */
export async function canOpenLead(viewer: Viewer, leadId: string): Promise<boolean> {
  if (viewer.visibility === 'everyone' || viewer.role === 'Owner' || viewer.role === 'Admin') return true
  const links = await db.select({ memberId: leadAssignees.memberId }).from(leadAssignees).where(eq(leadAssignees.leadId, leadId))
  return canSeeLead(viewer, links.map((l) => l.memberId))
}
