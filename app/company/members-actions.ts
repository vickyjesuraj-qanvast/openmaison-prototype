'use server'

import { randomUUID } from 'node:crypto'
import { and, eq, inArray, isNull, ne, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { leadAssignees, leads, members, settings, studioMemberCreditCaps } from '@/lib/db/schema'
import { isRole, type Role } from '@/lib/leads/enums'
import { fetchViewer } from '@/lib/leads/visibility'
import { runsStudio } from '@/lib/leads/assign-policy'
import { addBlock, deactivateBlock, detailsBlock, detailsClash, nextTint, payNowBlock, reactivateBlock, roleChangeBlock } from '@/lib/company/member-rules'
import { lookUnder } from '@/lib/company/member-photo'   // (pending modules S01)
import { currentPhotoId, isOwnPicture, photoColumns, storeMemberPhoto } from '@/lib/company/member-photo-store'
import { isSgPhone, phoneDigits, titleCaseName } from '@/lib/format'
import { fetchQuoteRules, QUOTE_RULES_KEY } from '@/lib/settings/queries'
import { clampCapacity, setsCapacity } from '@/lib/projects/workload'   // (one-home N-17)
import { isMarketing, onLeads } from '@/lib/settings/roles'   // (pending modules S16)
import { PAYNOW_MAX, PAYNOW_MSG, cleanPayNow } from '@/lib/finance/model'   // (simplify round 2)
import { CAME_IN, INVITE_RULE, OWNER_INVITE_RULE, nowhereToSend, channelsFor, type InviteChannel } from '@/lib/company/invitations'   // (pending modules S09)
import { cancelPendingInvitation, hasComeIn, inviteMember, latestInvitation, restoreInvitation, sendInvitation } from '@/lib/company/invitations-server'
import { CODE_LENGTH, KEEP_A_KEY, SIGN_IN, codeWentTo, keyToConfirm, landlineOnlyKey, losesEverySignInKey } from '@/lib/auth/model'   // (pending modules S30)
import { takeTry } from '@/lib/auth/limit'
import { INVITE_TOO_MANY, inviteTry, visitorTry } from '@/lib/auth/visitor'   // (pending modules S34)
import { signInProvider } from '@/lib/auth/provider'
import { endSessionsOf } from '@/lib/auth/session'
import { workspaceRefusal } from '@/lib/settings/desk'   // (S45C) the workspace's role rule
import type { Refusal } from '@/lib/company/template-rules'

/* Company › Members (REG-601): roles and reporting lines. (REG-646, settings parity Q-06) Owners and Admins add, deactivate and
   reactivate members and set roles under the Owner rules (lib/company/member-rules.ts); a refusal answers with the rule's own words. */

const touch = () => { revalidatePath('/company/members'); revalidatePath('/leads', 'layout'); revalidatePath('/tasks'); revalidatePath('/settings'); revalidatePath('/quotes', 'layout'); revalidatePath('/company', 'layout') }
export type MemberResult = { ok: true } | { error: string }
/** (sweep S4 #6) What a deactivation let go — the Designers who reported to them, the backup approver's seat — so Undo gives it back. */
export type Released = { team: string[]; backup: boolean; /** (pending modules S09) the invitation the deactivation closed — Undo opens it again */ invitation?: string | null }
const activeOwners = (team: { role: string; isActive: boolean }[]) => team.filter((m) => m.role === 'Owner' && m.isActive).length

export async function setMemberRole(memberId: string, role: Role): Promise<MemberResult> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const viewer = await fetchViewer()
  if (!isRole(role)) return { error: 'Pick a role' }
  const team = await db.select({ id: members.id, role: members.role, isActive: members.isActive }).from(members)
  const cur = team.find((m) => m.id === memberId)
  if (!cur) return { error: 'Member not found' }
  const block = roleChangeBlock(viewer, cur, role, activeOwners(team))   // (REG-646) only an Owner makes an Owner; nobody changes their own role
  if (block) return { error: block }
  /* (parity map, FB-114) Accounting is never on a lead or a project — a member still on one is taken off it first (their records stay theirs) */
  if (role === 'Accounting' || role === 'Marketing') {   // (S44O — C6) nor is Marketing: they hand leads to the members who work them
    const [on] = await db.select({ n: sql<number>`count(*)` }).from(leadAssignees).innerJoin(leads, eq(leads.id, leadAssignees.leadId))
      .where(and(eq(leadAssignees.memberId, memberId), isNull(leads.deletedAt), ne(leads.stage, 'Lost')))
    const n = Number(on?.n ?? 0)
    if (n) return { error: `They’re on ${n} ${n === 1 ? 'lead or project' : 'leads and projects'} — take them off first. ${role} is never on a lead.` }   // invented copy
  }
  await db.update(members).set({ role }).where(eq(members.id, memberId))
  /* A member who stops being a Manager keeps no team; a member who stops being a Designer reports to nobody. */
  if (role !== 'Manager') await db.update(members).set({ managerId: null }).where(eq(members.managerId, memberId))
  if (role !== 'Designer') await db.update(members).set({ managerId: null }).where(eq(members.id, memberId))
  touch()
  return { ok: true }
}

export async function setMemberManager(memberId: string, managerId: string | null): Promise<void | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
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
export async function setMemberAccepting(memberId: string, on: boolean): Promise<void | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  await mayEdit(memberId)
  await db.update(members).set({ acceptingLeads: on }).where(eq(members.id, memberId))
  touch()
}
/** (pending modules S16 — 1.0's top bar "Open / Closed to new leads", one press for the member themself) the studio block's menu and the phone's
    You sheet: always the signed-in member's own row — the menu never sends an id (Your profile's rule, S01). Answers what it was, for Undo. The
    same record Company › Members' switch writes (REG-612); Accounting is on no lead, so there is nothing to open or close. */
export async function setMyAccepting(on: unknown): Promise<{ ok: true; before: boolean } | { error: string }> {
  if (typeof on !== 'boolean') return { error: 'Pick open or closed' }
  const viewer = await fetchViewer()
  if (!onLeads(viewer.role)) return { error: isMarketing(viewer.role) ? 'Marketing takes no leads' : 'Accounting takes no leads' }   // (S45C) the role's own words — Marketing hands leads out (invented copy)
  const [m] = await db.select({ on: members.acceptingLeads }).from(members).where(eq(members.id, viewer.id))
  if (!m) return { error: 'Member not found' }
  if (m.on !== on) { await db.update(members).set({ acceptingLeads: on }).where(eq(members.id, viewer.id)); touch() }
  return { ok: true, before: m.on }
}
export async function setMemberPreferences(memberId: string, input: { preferences: unknown; specialty: string }): Promise<void | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  await mayEdit(memberId)
  const { parsePreferences } = await import('@/lib/company/preferences')
  const prefs = parsePreferences(JSON.stringify(input.preferences ?? {}))   // the vocabulary, not a client blob
  await db.update(members).set({ leadPreferences: Object.keys(prefs).length ? JSON.stringify(prefs) : null, specialty: input.specialty.trim().slice(0, 120) || null }).where(eq(members.id, memberId))
  touch()
}

/** (one-home N-17) A member's project capacity — how many running projects they can carry at once (`members.project_capacity`; null = the
    studio's default, Settings › Projects › Workload). The field lives here, on Company › Members, beside the role and the preferences; the
    Workload view's Set capacity writes the same column. Owners and Admins set it (I-Q3) — the refusal is Workload's own words. Answers what it
    was, for Undo. */
export async function setMemberCapacity(memberId: string, n: number | null): Promise<{ ok: true; before: number | null } | { error: string }> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const viewer = await fetchViewer()
  if (!setsCapacity(viewer.role)) return { error: 'Only Owners and Admins set how many projects someone can run' }
  const next = n === null ? null : clampCapacity(n)
  if (n !== null && next === null) return { error: 'Pick a number from 1 to 20' }
  const [m] = await db.select({ cap: members.projectCapacity }).from(members).where(eq(members.id, typeof memberId === 'string' ? memberId : ''))
  if (!m) return { error: 'Member not found' }
  await db.update(members).set({ projectCapacity: next }).where(eq(members.id, memberId))
  touch()
  revalidatePath('/projects', 'layout')   // the Workload view measures each person against it
  return { ok: true, before: m.cap ?? null }
}

/** (simplify round 2 · F1 §6.9.3) A member's PayNow — the mobile number or UEN the studio pays a claim or commission to; Finance's pay dialogs
    show it with its copy. Owners and Admins set anyone's, a member their own (the preferences' rule, as a refusal). Checked as the PayNow QR
    reads an ID (`cleanPayNow`); blank takes it off. Answers what it was, for Undo. */
export async function setMemberPayNow(memberId: string, input: { paynow: string }): Promise<{ ok: true; before: string | null; paynow: string | null } | { error: string }> {
  const viewer = await fetchViewer()
  const id = typeof memberId === 'string' ? memberId : ''
  const block = payNowBlock(viewer, id)   // (pending modules S14) the rule Who may do what reads too
  if (block) return { error: block }
  const next = cleanPayNow(typeof input?.paynow === 'string' ? input.paynow.slice(0, PAYNOW_MAX * 2) : '')
  if (next === null) return { error: PAYNOW_MSG }
  const [m] = await db.select({ paynow: members.paynow }).from(members).where(eq(members.id, id))
  if (!m) return { error: 'Member not found' }
  await db.update(members).set({ paynow: next || null }).where(eq(members.id, id))
  touch()
  revalidatePath('/company/finance', 'layout')   // To do · Commission · Money out's pay dialogs
  revalidatePath('/projects', 'layout')          // a project's Money › Costs (a claim's Pay back)
  return { ok: true, before: m.paynow ?? null, paynow: next || null }
}

/* ── (pending modules S01 — his "build all of them" 2026-10-11; 1.0's Settings › Your Profile and PATCH /api/identity/profile) A member's name,
   email, phone and photo: their own on Your profile, anyone's (an Owner's by an Owner) on Company › Members › Edit details ─────────────── */

/** What a details save carries — one object, so a picture travels inside it. `photo`: absent keeps it · `null` takes it off · a data URL is a
    new one. `photoId`: an earlier picture of theirs put back (Undo). */
export type MemberDetailsInput = { name: string; email: string; phone: string; photo?: string | null; photoId?: string | null }
/** The details as they were before a save — what its Undo saves back. */
export type MemberDetails = { name: string; email: string; phone: string; photoId: string | null }
export type DetailsResult = { ok: true; before: MemberDetails; after: MemberDetails } | { error: string }

/** Saves a member's details by the rules — the same checks as Add member, and (1.0) nobody else may have the name, the email or the phone. */
export async function saveMemberDetails(memberId: string, input: MemberDetailsInput & { code?: string }): Promise<DetailsResult> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const viewer = await fetchViewer()
  const id = typeof memberId === 'string' ? memberId : ''
  const team = await db.select({ id: members.id, name: members.name, email: members.email, phone: members.phone, role: members.role, color: members.color, portalPhotoId: members.portalPhotoId }).from(members)
  const m = team.find((x) => x.id === id)
  if (!m) return { error: 'That member isn’t in the studio any more' }
  const block = detailsBlock(viewer, m)
  if (block) return { error: block }
  const name = titleCaseName(typeof input?.name === 'string' ? input.name : '').slice(0, 60)   // saved title-cased, as Add member saves it
  if (!name) return { error: 'Give the member a name' }
  const phone = phoneDigits(typeof input?.phone === 'string' ? input.phone : '')
  if (phone && !isSgPhone(phone)) return { error: 'A Singapore number has 8 digits and starts with 6, 8 or 9' }
  const email = (typeof input?.email === 'string' ? input.email : '').trim().toLowerCase().slice(0, 120)
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'That email doesn’t look right' }
  { const landline = landlineOnlyKey({ phone, email }); if (landline) return { error: landline } }   // (S44O — row 344) the only key is a mobile
  const clash = detailsClash({ name, email, phone }, team.filter((x) => x.id !== m.id))
  if (clash) return { error: clash }
  /* (pending modules S30) your own: a new mobile number (else a new email) is confirmed by the code sent to it before it saves — you sign in with
     it, and a typo would lock you out (`sendMyContactCode` sent it); nor may a save leave you nothing to sign in with. Another member's details
     need no code — they confirm their number when they sign in. */
  if (viewer.id === m.id) {
    if (losesEverySignInKey(m, { phone, email })) return { error: KEEP_A_KEY }
    const key = keyToConfirm(m, { phone, email })
    if (key) {
      const code = typeof input?.code === 'string' ? input.code.replace(/\D/g, '') : ''
      if (code.length !== CODE_LENGTH) return { error: key.kind === 'phone' ? 'Confirm the new number with its code first' : 'Confirm the new email with its code first' }
      if (!takeTry(`profile-check:${viewer.id}`) || !(await visitorTry('check'))) return { error: SIGN_IN.tooMany }   // (pending modules S34) and per visitor, with a real provider
      if (!(await signInProvider().checkCode(key, code))) return { error: SIGN_IN.codeWrong }
    }
  }
  const before: MemberDetails = { name: m.name, email: m.email ?? '', phone: m.phone ?? '', photoId: currentPhotoId(m) }
  let photoId = before.photoId
  if (input?.photo === null) photoId = null
  else if (typeof input?.photo === 'string') {
    const kept = await storeMemberPhoto(m.id, input.photo)
    if ('error' in kept) return kept
    photoId = kept.id
  } else if (input && 'photoId' in input) {
    photoId = typeof input.photoId === 'string' && await isOwnPicture(m.id, input.photoId) ? input.photoId : null
  }
  await db.update(members).set({ name, email: email || null, phone: phone || null, ...photoColumns(m.color, photoId) }).where(eq(members.id, m.id))
  revalidatePath('/', 'layout')   // a name and a photo show wherever the member does
  return { ok: true, before, after: { name, email, phone, photoId } }
}

/** Your profile › Save changes: the signed-in member's own details — always theirs, never an id the page sends (1.0's rule).
    (pending modules S30) A save that adds a sign-in key carries the code sent to it — `saveMemberDetails` asks it of anyone saving their own. */
export async function saveMyDetails(input: MemberDetailsInput & { code?: string }): Promise<DetailsResult> {
  const viewer = await fetchViewer()
  return saveMemberDetails(viewer.id, input)
}

/** (pending modules S30) Your profile, before a save that adds a sign-in key: the same checks the save makes (the format, nobody else's name,
    email or number), then a code to the new number or email. `{ none: true }` = nothing new to confirm — save straight away. */
export async function sendMyContactCode(input: { name: string; email: string; phone: string }): Promise<{ to: string } | { none: true } | { error: string }> {
  const viewer = await fetchViewer()
  const team = await db.select({ id: members.id, name: members.name, email: members.email, phone: members.phone }).from(members)
  const m = team.find((x) => x.id === viewer.id)
  if (!m) return { error: 'That member isn’t in the studio any more' }
  const name = titleCaseName(typeof input?.name === 'string' ? input.name : '').slice(0, 60)
  if (!name) return { error: 'Give the member a name' }
  const phone = phoneDigits(typeof input?.phone === 'string' ? input.phone : '')
  if (phone && !isSgPhone(phone)) return { error: 'A Singapore number has 8 digits and starts with 6, 8 or 9' }
  const email = (typeof input?.email === 'string' ? input.email : '').trim().toLowerCase().slice(0, 120)
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'That email doesn’t look right' }
  { const landline = landlineOnlyKey({ phone, email }); if (landline) return { error: landline } }   // (S44O — row 344)
  const clash = detailsClash({ name, email, phone }, team.filter((x) => x.id !== m.id))
  if (clash) return { error: clash }
  if (losesEverySignInKey(m, { phone, email })) return { error: KEEP_A_KEY }
  const key = keyToConfirm(m, { phone, email })
  if (!key) return { none: true }
  if (!takeTry(`profile-send:${viewer.id}`) || !(await visitorTry('send'))) return { error: SIGN_IN.tooMany }
  const sent = await signInProvider().sendCode(key)
  if ('error' in sent) return { error: SIGN_IN.couldntSend }
  return { to: codeWentTo(key) }
}

/* ── (REG-646, settings parity Q-06) Adding a member, deactivating one, bringing one back ─────────────────────────────── */

/** Company › Members › Add member: name, phone, email and a role — 1.0's *Invite Member* asked OpenMaison staff to do this (A-12).
    (UX audit S6) A Designer may be added with the Manager they report to — an active Manager, or nobody. */
export async function addMember(input: { name: string; phone: string; email: string; role: Role; managerId?: string | null }): Promise<MemberResult & { id?: string; /** (S09) the channels the invitation went by — [] nowhere to send it, null not written */ invited?: InviteChannel[] | null }> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const viewer = await fetchViewer()
  const role = isRole(input.role) ? input.role : 'Designer'
  const block = addBlock(viewer, role)
  if (block) return { error: block }
  const name = titleCaseName(input.name).slice(0, 60)   // (Dane UAT 2.07) names are saved title-cased, as a lead's are (REG-329)
  if (!name) return { error: 'Give the member a name' }
  const phone = phoneDigits(input.phone)
  if (phone && !isSgPhone(phone)) return { error: 'A Singapore number has 8 digits and starts with 6, 8 or 9' }
  const email = input.email.trim().toLowerCase().slice(0, 120)
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'That email doesn’t look right' }
  { const landline = landlineOnlyKey({ phone, email }); if (landline) return { error: landline } }   // (S44O — row 344) the code goes to a mobile
  const team = await db.select({ id: members.id, name: members.name, email: members.email, phone: members.phone, color: members.color, role: members.role, isActive: members.isActive }).from(members)
  const clash = detailsClash({ name, email, phone }, team)   // (pending modules S01) the phone too, as 1.0 checked it
  if (clash) return { error: clash }
  const manager = role === 'Designer' && input.managerId ? team.find((m) => m.id === input.managerId && m.role === 'Manager' && m.isActive) ?? null : null
  if (role === 'Designer' && input.managerId && !manager) return { error: 'A Designer reports to an active Manager' }
  if (!(await inviteTry())) return { error: INVITE_TOO_MANY }   // (pending modules S34) the invitation it sends — 1.0's ten a minute, with a real provider
  const id = randomUUID()
  /* (pending modules S08) a new member is owed the first-visit welcome — the app shell shows it on their first visit (View as in the demo) */
  await db.insert(members).values({ id, name, role, color: nextTint(team.map((m) => lookUnder(m.color))), standingYou: false, email: email || null, phone: phone || null, isActive: true, managerId: manager?.id ?? null, welcomeDue: true })
  /* (REG-704, AI credits Q-25 · integration B-16) the studio's monthly amount for new members, when the Owner set one — a cap row as 1.0 writes it */
  const [defaults] = await db.select({ value: settings.value }).from(settings).where(eq(settings.key, 'credit_defaults'))
  const amount = defaults ? (JSON.parse(defaults.value) as { monthlyAmount?: number | null }).monthlyAmount ?? null : null
  if (amount != null && amount > 0) await db.insert(studioMemberCreditCaps).values({ memberId: id, monthlyCap: Math.round(amount), updatedBy: viewer.id, updatedAt: new Date() }).onConflictDoNothing()
  /* (pending modules S09 — 1.0's /api/invitations/send) and they are invited: a link of their own, by WhatsApp and email through the house
     outbox. The member is in the studio either way — an invitation that couldn't be written leaves the row's Send invitation to try again. */
  let invited: InviteChannel[] | null = null
  try { invited = (await inviteMember({ id, name, role, phone: phone || null, email: email || null }, viewer.id)).channels } catch (e) { console.error('[members] the invitation wasn’t written:', e instanceof Error ? e.message : e) }
  touch()
  return { ok: true, id, invited }
}

/** Deactivate: out of every picker, every suggestion and every notice; their leads, quotes, tasks and notes stay theirs, and their own
    settings (open to new leads, who they report to) stay as they were, so Reactivate — or Undo — brings them back exactly. A deactivated
    Manager's Designers report to nobody; a backup approver stops being one. */
export async function deactivateMember(memberId: string): Promise<{ ok: true; released: Released } | { error: string }> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
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
  const invitation = await cancelPendingInvitation(memberId, viewer.id)   // (pending modules S09) the link stops opening; Undo opens it again
  await endSessionsOf(memberId)   // (pending modules S30) signed out wherever they were signed in; after an Undo they sign in again
  touch()
  return { ok: true, released: { team: team2, backup, invitation } }
}
const writeBackup = async (rules: Awaited<ReturnType<typeof fetchQuoteRules>>, backupApproverId: string | null) => {
  const value = JSON.stringify({ ...rules, backupApproverId })
  await db.insert(settings).values({ key: QUOTE_RULES_KEY, value, updatedAt: new Date() }).onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } })
}

/** Reactivate: back in the pickers with the role they had; open to new leads again only when switched on. */
export async function reactivateMember(memberId: string, restore?: Released): Promise<MemberResult> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
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
  if (typeof restore?.invitation === 'string') await restoreInvitation(memberId, restore.invitation)   // (pending modules S09) the same link, the same window
  touch()
  return { ok: true }
}

/* ── (pending modules S09 — the card `onboarding:team-invitations`, his "build all of them" 2026-10-11; 1.0's `/api/invitations/[token]`
   PATCH (resend) and DELETE (cancel)) A member still to come in: send their invitation again, cancel it, invite them again ──────────────── */

type InviteResult = { ok: true; channels: InviteChannel[] } | { error: string }
const memberRow = async (id: string) => (await db.select({ id: members.id, name: members.name, role: members.role, phone: members.phone, email: members.email, isActive: members.isActive, welcomedAt: members.welcomedAt }).from(members).where(eq(members.id, typeof id === 'string' ? id : '')).limit(1))[0] ?? null
const inviteBlock = (viewer: { role: string }, m: { role: string }) => (!runsStudio(viewer.role) ? INVITE_RULE : m.role === 'Owner' && viewer.role !== 'Owner' ? OWNER_INVITE_RULE : null)

/** Send again (1.0's Resend): the waiting invitation goes again to the member's mobile and address as they are now — the window re-opened
    for 30 days, the same link. A member who never had one (added before invitations existed) is sent their first. */
export async function sendMemberInvitation(memberId: string): Promise<InviteResult> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const viewer = await fetchViewer()
  const m = await memberRow(memberId)
  if (!m) return { error: 'That member isn’t in the studio any more' }
  const block = inviteBlock(viewer, m)
  if (block) return { error: block }
  if (!m.isActive) return { error: 'Reactivate the member first' }
  if (await hasComeIn(m)) return { error: CAME_IN }
  if (!channelsFor(m).length) return { error: nowhereToSend(m.name) }
  if (!(await inviteTry())) return { error: INVITE_TOO_MANY }   // (pending modules S34) 1.0's ten a minute, with a real provider
  const inv = await latestInvitation(m.id)
  const channels = inv?.status === 'pending' ? await sendInvitation(inv.id) : (await inviteMember(m, viewer.id)).channels
  await db.update(members).set({ welcomeDue: true }).where(and(eq(members.id, m.id), isNull(members.welcomedAt)))   // their first visit is owed its welcome
  touch()
  return channels.length ? { ok: true, channels } : { error: nowhereToSend(m.name) }
}

/** Cancel the invitation (1.0's DELETE): the member leaves the team as a deactivation does — out of every picker, their seat free, their records
    kept — and the link stops opening. Answers what it let go, for Undo (`reactivateMember(id, released)` — the same link back). */
export async function cancelMemberInvitation(memberId: string): Promise<{ ok: true; released: Released } | { error: string }> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const viewer = await fetchViewer()
  const m = await memberRow(memberId)
  if (!m) return { error: 'That member isn’t in the studio any more' }
  const block = inviteBlock(viewer, m)
  if (block) return { error: block }
  const inv = await latestInvitation(m.id)
  if (inv?.status !== 'pending' || await hasComeIn(m)) return { error: 'There’s no invitation waiting for them' }
  return deactivateMember(m.id)
}

/** Invite again — a member whose invitation was cancelled before they ever came in: back in the team with a new link (the old one stays dead). */
export async function inviteMemberAgain(memberId: string): Promise<InviteResult> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const viewer = await fetchViewer()
  const m = await memberRow(memberId)
  if (!m) return { error: 'That member isn’t in the studio any more' }
  const block = inviteBlock(viewer, m) ?? reactivateBlock(viewer, m)
  if (block) return { error: block }
  if (await hasComeIn(m)) return { error: 'They’ve come in before — Reactivate brings them back' }
  if (!(await inviteTry())) return { error: INVITE_TOO_MANY }   // (pending modules S34)
  await db.update(members).set({ isActive: true, deactivatedAt: null, welcomeDue: true }).where(eq(members.id, m.id))
  const { channels } = await inviteMember(m, viewer.id)
  touch()
  return { ok: true, channels }
}
