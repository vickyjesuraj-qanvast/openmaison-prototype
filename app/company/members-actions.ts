'use server'

import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { members } from '@/lib/db/schema'
import { isRole, type Role } from '@/lib/leads/enums'
import { fetchViewer } from '@/lib/leads/visibility'
import { runsStudio } from '@/lib/leads/assign-policy'

/* Company › Members (REG-601): roles and reporting lines. Owners and Admins change them; the last Owner cannot be demoted. */

const touch = () => { revalidatePath('/company/members'); revalidatePath('/leads', 'layout'); revalidatePath('/tasks'); revalidatePath('/settings') }

export async function setMemberRole(memberId: string, role: Role): Promise<void> {
  const viewer = await fetchViewer()
  if (!runsStudio(viewer.role)) throw new Error('owners and admins only')
  if (!isRole(role)) throw new Error('role')
  const team = await db.select({ id: members.id, role: members.role }).from(members)
  const cur = team.find((m) => m.id === memberId)
  if (!cur) throw new Error('member not found')
  if (cur.role === 'Owner' && role !== 'Owner' && team.filter((m) => m.role === 'Owner').length <= 1) throw new Error('the studio needs an owner')
  await db.update(members).set({ role }).where(eq(members.id, memberId))
  /* A member who stops being a Manager keeps no team; a member who stops being a Designer reports to nobody. */
  if (role !== 'Manager') await db.update(members).set({ managerId: null }).where(eq(members.managerId, memberId))
  if (role !== 'Designer') await db.update(members).set({ managerId: null }).where(eq(members.id, memberId))
  touch()
}

export async function setMemberManager(memberId: string, managerId: string | null): Promise<void> {
  const viewer = await fetchViewer()
  if (!runsStudio(viewer.role)) throw new Error('owners and admins only')
  if (managerId) {
    const [mgr] = await db.select({ role: members.role }).from(members).where(eq(members.id, managerId))
    if (!mgr || mgr.role !== 'Manager') throw new Error('not a manager')
    if (managerId === memberId) throw new Error('self')
  }
  await db.update(members).set({ managerId }).where(eq(members.id, memberId))
  touch()
}

/* (REG-612, parity Q-27) Open to new leads, the preferences and the specialty — Owners and Admins for anyone, a member for themself. */
const mayEdit = async (memberId: string) => { const v = await fetchViewer(); if (!runsStudio(v.role) && v.id !== memberId) throw new Error('not yours to change') }
export async function setMemberAccepting(memberId: string, on: boolean): Promise<void> {
  await mayEdit(memberId)
  await db.update(members).set({ acceptingLeads: on }).where(eq(members.id, memberId))
  touch()
}
export async function setMemberPreferences(memberId: string, input: { preferences: unknown; specialty: string }): Promise<void> {
  await mayEdit(memberId)
  const { parsePreferences } = await import('@/lib/company/preferences')
  const prefs = parsePreferences(JSON.stringify(input.preferences ?? {}))   // the vocabulary, not a client blob
  await db.update(members).set({ leadPreferences: Object.keys(prefs).length ? JSON.stringify(prefs) : null, specialty: input.specialty.trim().slice(0, 120) || null }).where(eq(members.id, memberId))
  touch()
}
