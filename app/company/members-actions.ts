'use server'

import { randomUUID } from 'node:crypto'
import { and, eq, inArray, isNull } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { members, settings, studioMemberCreditCaps } from '@/lib/db/schema'
import { isRole, type Role } from '@/lib/leads/enums'
import { fetchViewer } from '@/lib/leads/visibility'
import { runsStudio } from '@/lib/leads/assign-policy'
import { addBlock, deactivateBlock, nextTint, reactivateBlock, roleChangeBlock } from '@/lib/company/member-rules'
import { isSgPhone, phoneDigits } from '@/lib/format'
import { fetchQuoteRules, QUOTE_RULES_KEY } from '@/lib/settings/queries'

/* Company › Members (REG-601): roles and reporting lines. (REG-646, settings parity Q-06) Owners and Admins add, deactivate and
   reactivate members and set roles under the Owner rules (lib/company/member-rules.ts); a refusal answers with the rule's own words. */

const touch = () => { revalidatePath('/company/members'); revalidatePath('/leads', 'layout'); revalidatePath('/tasks'); revalidatePath('/settings'); revalidatePath('/quotes', 'layout'); revalidatePath('/company', 'layout') }
export type MemberResult = { ok: true } | { error: string }
/** (sweep S4 #6) What a deactivation let go — the Designers who reported to them, the backup approver's seat — so Undo gives it back. */
export type Released = { team: string[]; backup: boolean }
const activeOwners = (team: { role: string; isActive: boolean }[]) => team.filter((m) => m.role === 'Owner' && m.isActive).length

export async function setMemberRole(memberId: string, role: Role): Promise<MemberResult> {
  const viewer = await fetchViewer()
  if (!isRole(role)) return { error: 'Pick a role' }
  const team = await db.select({ id: members.id, role: members.role, isActive: members.isActive }).from(members)
  const cur = team.find((m) => m.id === memberId)
  if (!cur) return { error: 'Member not found' }
  const block = roleChangeBlock(viewer, cur, role, activeOwners(team))   // (REG-646) only an Owner makes an Owner; nobody changes their own role
  if (block) return { error: block }
  await db.update(members).set({ role }).where(eq(members.id, memberId))
  /* A member who stops being a Manager keeps no team; a member who stops being a Designer reports to nobody. */
  if (role !== 'Manager') await db.update(members).set({ managerId: null }).where(eq(members.managerId, memberId))
  if (role !== 'Designer') await db.update(members).set({ managerId: null }).where(eq(members.id, memberId))
  touch()
  return { ok: true }
}

export async function setMemberManager(memberId: string, managerId: string | null): Promise<void> {
  const viewer = await fetchViewer()
  if (!runsStudio(viewer.role)) throw new Error('owners and admins only')
  if (managerId) {
    const [mgr] = await db.select({ role: members.role, isActive: members.isActive }).from(members).where(eq(members.id, managerId))
    if (!mgr || mgr.role !== 'Manager' || !mgr.isActive) throw new Error('not a manager')
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

/* ── (REG-646, settings parity Q-06) Adding a member, deactivating one, bringing one back ─────────────────────────────── */

/** Company › Members › Add member: name, phone, email and a role — 1.0's *Invite Member* asked OpenMaison staff to do this (A-12).
    (UX audit S6) A Designer may be added with the Manager they report to — an active Manager, or nobody. */
export async function addMember(input: { name: string; phone: string; email: string; role: Role; managerId?: string | null }): Promise<MemberResult & { id?: string }> {
  const viewer = await fetchViewer()
  const role = isRole(input.role) ? input.role : 'Designer'
  const block = addBlock(viewer, role)
  if (block) return { error: block }
  const name = input.name.trim().replace(/\s+/g, ' ').slice(0, 60)
  if (!name) return { error: 'Give the member a name' }
  const phone = phoneDigits(input.phone)
  if (phone && !isSgPhone(phone)) return { error: 'A Singapore number has 8 digits and starts with 6, 8 or 9' }
  const email = input.email.trim().toLowerCase().slice(0, 120)
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'That email doesn’t look right' }
  const team = await db.select({ id: members.id, name: members.name, email: members.email, color: members.color, role: members.role, isActive: members.isActive }).from(members)
  if (team.some((m) => m.name.toLowerCase() === name.toLowerCase())) return { error: `${name} is already a member` }
  if (email && team.some((m) => (m.email ?? '').toLowerCase() === email)) return { error: 'Another member has that email' }
  const manager = role === 'Designer' && input.managerId ? team.find((m) => m.id === input.managerId && m.role === 'Manager' && m.isActive) ?? null : null
  if (role === 'Designer' && input.managerId && !manager) return { error: 'A Designer reports to an active Manager' }
  const id = randomUUID()
  await db.insert(members).values({ id, name, role, color: nextTint(team.map((m) => m.color)), isYou: false, email: email || null, phone: phone || null, isActive: true, managerId: manager?.id ?? null })
  /* (REG-704, AI credits Q-25 · integration B-16) the studio's monthly amount for new members, when the Owner set one — a cap row as 1.0 writes it */
  const [defaults] = await db.select({ value: settings.value }).from(settings).where(eq(settings.key, 'credit_defaults'))
  const amount = defaults ? (JSON.parse(defaults.value) as { monthlyAmount?: number | null }).monthlyAmount ?? null : null
  if (amount != null && amount > 0) await db.insert(studioMemberCreditCaps).values({ memberId: id, monthlyCap: Math.round(amount), updatedBy: viewer.id, updatedAt: new Date() }).onConflictDoNothing()
  touch()
  return { ok: true, id }
}

/** Deactivate: out of every picker, every suggestion and every notice; their leads, quotes, tasks and notes stay theirs, and their own
    settings (open to new leads, who they report to) stay as they were, so Reactivate — or Undo — brings them back exactly. A deactivated
    Manager's Designers report to nobody; a backup approver stops being one. */
export async function deactivateMember(memberId: string): Promise<{ ok: true; released: Released } | { error: string }> {
  const viewer = await fetchViewer()
  const team = await db.select({ id: members.id, role: members.role, isActive: members.isActive }).from(members)
  const target = team.find((m) => m.id === memberId)
  if (!target) return { error: 'Member not found' }
  const block = deactivateBlock(viewer, target, activeOwners(team))
  if (block) return { error: block }
  const team2 = (await db.select({ id: members.id }).from(members).where(eq(members.managerId, memberId))).map((m) => m.id)
  await db.transaction(async (tx) => {
    await tx.update(members).set({ isActive: false, deactivatedAt: new Date() }).where(eq(members.id, memberId))
    await tx.update(members).set({ managerId: null }).where(eq(members.managerId, memberId))
  })
  const rules = await fetchQuoteRules()
  const backup = rules.backupApproverId === memberId
  if (backup) await writeBackup(rules, null)
  touch()
  return { ok: true, released: { team: team2, backup } }
}
const writeBackup = async (rules: Awaited<ReturnType<typeof fetchQuoteRules>>, backupApproverId: string | null) => {
  const value = JSON.stringify({ ...rules, backupApproverId })
  await db.insert(settings).values({ key: QUOTE_RULES_KEY, value, updatedAt: new Date() }).onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } })
}

/** Reactivate: back in the pickers with the role they had; open to new leads again only when switched on. */
export async function reactivateMember(memberId: string, restore?: Released): Promise<MemberResult> {
  const viewer = await fetchViewer()
  const [target] = await db.select({ id: members.id, role: members.role, isActive: members.isActive }).from(members).where(eq(members.id, memberId))
  if (!target) return { error: 'Member not found' }
  const block = reactivateBlock(viewer, target)
  if (block) return { error: block }
  await db.update(members).set({ isActive: true, deactivatedAt: null }).where(eq(members.id, memberId))
  /* (sweep S4 #6) Undo gives back what the deactivation let go — each Designer still reporting to nobody, and the backup seat while it is empty. */
  if (restore && target.role === 'Manager' && restore.team.length) {
    await db.update(members).set({ managerId: memberId }).where(and(inArray(members.id, restore.team), eq(members.role, 'Designer'), eq(members.isActive, true), isNull(members.managerId)))
  }
  if (restore?.backup) { const rules = await fetchQuoteRules(); if (!rules.backupApproverId) await writeBackup(rules, memberId) }
  touch()
  return { ok: true }
}
