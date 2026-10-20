'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { and, eq, inArray, ne } from 'drizzle-orm'
import { db } from '@/lib/db'
import { hangoutDesigners, hangoutEvents, hangoutMeetings, hangoutParticipations, hangoutRegistrations, hangoutShifts, leadTasks, leads, meetings as leadMeetings, members, studioInvitations, type HangoutEvent, type HangoutMeeting } from '@/lib/db/schema'
import { fetchViewer, canOpenLead } from '@/lib/leads/visibility'
import { isAccounting, onLeads, runsStudio } from '@/lib/settings/roles'
import { notify } from '@/lib/notifications/emit'
import { revalidateLead } from '@/lib/leads/queries'
import { fetchStudio } from '@/lib/settings/queries'
import { shortStudioName } from '@/lib/settings/types'
import { isSgMobile, phoneDigits, titleCaseName } from '@/lib/format'
import { bookChat, newToken, sendOwnLink } from '@/lib/hangouts/capture'
import {
  followUpFor, hangoutHref, isEventDay, isOutcome, midnightOf, parseHomeownerPrefs, parseStudioPrefs, phaseOf, placesLeft, reasonsOf, weightTotal,
  type HomeownerPrefs, type OutcomeKey, type StudioPrefs,
} from '@/lib/hangouts/model'
import { workspaceRefusal, offWorkspace } from '@/lib/settings/desk'   // (S45C) the workspace's role rule

/*
 * (pending modules S27 — Hangouts; his "build all of them" 2026-10-11) The studio's side of Qanvast Hangouts — 1.0's studio page (Events ·
 * Plan · Dashboard · Your meetings, src/app/(main)/qanvast-ops/hangouts/page.tsx, removed from 1.0 on 2026-06-01 though its hooks and routes
 * stayed) in 2.0's shape. Who may: applying, the plan and the studio's page are an Owner's or an Admin's (1.0: the owner); on the day each
 * designer runs their own chats (start · end · take one nobody has), and Owners and Admins run any. Every refusal answers `{ error: <the rule> }`.
 */

type Err = { error: string }
const isErr = (x: unknown): x is Err => !!x && typeof x === 'object' && 'error' in x
const RUNNERS = 'Only Owners and Admins plan a Hangout'
const READS = 'Accounting reads the books — the studio’s team runs Hangouts'
const GONE = 'This Hangout isn’t in Qanvast’s list any more'
const now = () => new Date()
const ids = (v: string | null | undefined): string[] => { try { const a = v ? JSON.parse(v) : []; return Array.isArray(a) ? a.filter((x): x is string => typeof x === 'string') : [] } catch { return [] } }

function touch(eventId?: string) {
  revalidatePath('/qanvast-ops/hangouts')
  if (eventId) revalidatePath(`/qanvast-ops/hangouts/${eventId}`)
}
async function eventOf(eventId: unknown): Promise<HangoutEvent | Err> {
  const [e] = typeof eventId === 'string' ? await db.select().from(hangoutEvents).where(eq(hangoutEvents.id, eventId)).limit(1) : []
  return e ?? { error: GONE }
}
const factsOf = (e: HangoutEvent) => ({ startsOn: e.startsOn.getTime(), dayCount: e.dayCount, startTime: e.startTime, endTime: e.endTime, feedStatus: e.feedStatus })
async function runner(): Promise<Awaited<ReturnType<typeof fetchViewer>> | Err> {
  const v = await fetchViewer()
  if (isAccounting(v.role)) return { error: READS }
  return runsStudio(v.role) ? v : { error: RUNNERS }
}
async function confirmedOf(e: HangoutEvent) {
  const [p] = await db.select().from(hangoutParticipations).where(eq(hangoutParticipations.eventId, e.id)).limit(1)
  return p && p.status === 'confirmed' ? p : null
}

/* ── apply ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────── */

/** Apply for a place at a Hangout (1.0's Apply Now) — Qanvast confirms it, and the tables it gives come back through its feed. */
export async function applyToHangout(eventId: string): Promise<{ ok: true } | Err> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const v = await runner(); if (isErr(v)) return v
  const e = await eventOf(eventId); if (isErr(e)) return e
  if (phaseOf(factsOf(e), Date.now()) !== 'ahead') return { error: 'This Hangout has started or ended — applications are closed' }
  if (placesLeft(e) <= 0) return { error: 'Every place at this Hangout is taken' }
  const [p] = await db.select().from(hangoutParticipations).where(eq(hangoutParticipations.eventId, e.id)).limit(1)
  if (p?.status === 'confirmed') return { error: 'You’re taking part already' }
  if (p?.status === 'applied') return { error: 'You’ve applied already — Qanvast confirms your place' }
  if (p?.status === 'declined') return { error: 'Qanvast didn’t confirm a place this time' }
  const t = now()
  if (p) await db.update(hangoutParticipations).set({ status: 'applied', appliedAt: t, appliedBy: v.id, withdrawnAt: null, updatedAt: t }).where(eq(hangoutParticipations.id, p.id))
  else await db.insert(hangoutParticipations).values({ id: randomUUID(), eventId: e.id, status: 'applied', tables: '[]', appliedAt: t, appliedBy: v.id, pageToken: newToken(), updatedAt: t })
  touch(e.id)
  return { ok: true }
}

/** Take an application back while Qanvast hasn't answered it (Apply's Undo). A confirmed place is Qanvast's to change — the studio asks them. */
export async function withdrawFromHangout(eventId: string): Promise<{ ok: true } | Err> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const v = await runner(); if (isErr(v)) return v
  const e = await eventOf(eventId); if (isErr(e)) return e
  const [p] = await db.select().from(hangoutParticipations).where(eq(hangoutParticipations.eventId, e.id)).limit(1)
  if (!p || p.status !== 'applied') return { error: p?.status === 'confirmed' ? 'Qanvast has confirmed your place — ask Qanvast to give it up' : 'There’s no application to take back' }
  const t = now()
  await db.update(hangoutParticipations).set({ status: 'withdrawn', withdrawnAt: t, updatedAt: t }).where(eq(hangoutParticipations.id, p.id))
  touch(e.id)
  return { ok: true }
}

/* ── the plan ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────── */

async function planEditable(eventId: string) {
  const v = await runner(); if (isErr(v)) return v
  const e = await eventOf(eventId); if (isErr(e)) return e
  if (phaseOf(factsOf(e), Date.now()) === 'ended') return { error: 'This Hangout is over — its plan stays as it was' }
  const p = await confirmedOf(e)
  if (!p) return { error: 'Plan once Qanvast confirms your place' }
  return { v, e, p }
}
const savedPlan = async (participationId: string) => db.update(hangoutParticipations).set({ planSavedAt: now(), updatedAt: now() }).where(eq(hangoutParticipations.id, participationId))

/** Put a member on a shift, or take them off it (1.0's ID assignment per shift). A shift holds as many designers as the studio's tables
    (1.0's tables per studio); someone with chats waiting on a shift stays until their chats are given to someone else. */
export async function setShiftDesigner(eventId: string, o: { memberId: string; shiftId: string; on: boolean }): Promise<{ shiftIds: string[] } | Err> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const got = await planEditable(eventId); if (isErr(got)) return got
  const { e, p } = got
  const [s] = await db.select().from(hangoutShifts).where(and(eq(hangoutShifts.id, o?.shiftId ?? ''), eq(hangoutShifts.eventId, e.id))).limit(1)
  if (!s) return { error: 'That shift isn’t part of this Hangout' }
  if (o.on && s.dayAt.getTime() < midnightOf(Date.now())) return { error: 'That shift is over' }
  const [m] = await db.select().from(members).where(eq(members.id, o.memberId ?? '')).limit(1)
  if (!m || !m.isActive || !onLeads(m.role)) return { error: 'Only the studio’s active team goes to a Hangout' }
  const plan = await db.select().from(hangoutDesigners).where(eq(hangoutDesigners.eventId, e.id))
  const row = plan.find((d) => d.memberId === m.id)
  const cur = row ? ids(row.shiftIds) : []
  if (o.on && cur.includes(s.id)) return { shiftIds: cur }
  if (!o.on && !cur.includes(s.id)) return { shiftIds: cur }
  if (o.on) {
    const onIt = plan.filter((d) => ids(d.shiftIds).includes(s.id)).length
    if (onIt >= e.tablesPerStudio) return { error: `${s.label} has ${e.tablesPerStudio} ${e.tablesPerStudio === 1 ? 'designer' : 'designers'} already — one for each of your tables` }
  } else {
    const waiting = await db.select({ id: hangoutMeetings.id }).from(hangoutMeetings).where(and(eq(hangoutMeetings.eventId, e.id), eq(hangoutMeetings.memberId, m.id), eq(hangoutMeetings.shiftId, s.id), inArray(hangoutMeetings.status, ['scheduled', 'in-progress'])))
    if (waiting.length) return { error: `${m.name} has ${waiting.length === 1 ? 'a chat' : `${waiting.length} chats`} on this shift — give ${waiting.length === 1 ? 'it' : 'them'} to someone else first` }
  }
  const next = o.on ? [...cur, s.id] : cur.filter((x) => x !== s.id)
  const t = now()
  if (row) await db.update(hangoutDesigners).set({ shiftIds: JSON.stringify(next), updatedAt: t }).where(eq(hangoutDesigners.id, row.id))
  else await db.insert(hangoutDesigners).values({ id: randomUUID(), eventId: e.id, memberId: m.id, shiftIds: JSON.stringify(next), createdAt: t, updatedAt: t })
  await savedPlan(p.id)
  touch(e.id)
  return { shiftIds: next }
}

/** Each designer's share of the chats (1.0's capacity distribution) — whole percents adding up to 100, or none at all (an even share). */
export async function setDesignerShares(eventId: string, shares: Record<string, number> | null): Promise<{ ok: true } | Err> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const got = await planEditable(eventId); if (isErr(got)) return got
  const { e, p } = got
  const plan = (await db.select().from(hangoutDesigners).where(eq(hangoutDesigners.eventId, e.id))).filter((d) => ids(d.shiftIds).length)
  if (shares) {
    const vals = plan.map((d) => Math.round(Number(shares[d.memberId] ?? 0)))
    if (vals.some((n) => !Number.isFinite(n) || n < 0 || n > 100)) return { error: 'Each share is a whole percent from 0 to 100' }
    if (vals.reduce((a, b) => a + b, 0) !== 100) return { error: 'The shares add up to 100%' }
  }
  const t = now()
  for (const d of plan) await db.update(hangoutDesigners).set({ sharePct: shares ? Math.round(Number(shares[d.memberId] ?? 0)) : null, updatedAt: t }).where(eq(hangoutDesigners.id, d.id))
  await savedPlan(p.id)
  touch(e.id)
  return { ok: true }
}

/** Who the studio would like to meet, and how much each thing weighs (1.0's preferred customer profile and its weights, which add to 100). */
export async function setHangoutPreferences(eventId: string, prefs: StudioPrefs): Promise<{ prefs: StudioPrefs } | Err> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const got = await planEditable(eventId); if (isErr(got)) return got
  const clean = parseStudioPrefs(prefs)
  if (weightTotal(clean.weights) !== 100) return { error: 'The weights add up to 100%' }
  await db.update(hangoutParticipations).set({ preferencesJson: JSON.stringify(clean), planSavedAt: now(), updatedAt: now() }).where(eq(hangoutParticipations.id, got.p.id))
  touch(got.e.id)
  return { prefs: clean }
}

/** Send the plan to Qanvast (1.0's Save & Submit — its matching reads it from here). It needs someone at the tables. */
export async function sendHangoutPlan(eventId: string): Promise<{ sentAt: number } | Err> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const got = await planEditable(eventId); if (isErr(got)) return got
  const plan = await db.select().from(hangoutDesigners).where(eq(hangoutDesigners.eventId, got.e.id))
  if (!plan.some((d) => ids(d.shiftIds).length)) return { error: 'Put someone on a shift first' }
  const prefs = parseStudioPrefs(got.p.preferencesJson)
  if (weightTotal(prefs.weights) !== 100) return { error: 'The weights add up to 100%' }
  const t = now()
  await db.update(hangoutParticipations).set({ planSentAt: t, planSentBy: got.v.id, updatedAt: t }).where(eq(hangoutParticipations.id, got.p.id))
  touch(got.e.id)
  return { sentAt: t.getTime() }
}

/** Stop or start taking bookings on the studio's page for the event (chats already booked stay). */
export async function setHangoutPageOpen(eventId: string, open: boolean): Promise<{ ok: true } | Err> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const got = await planEditable(eventId); if (isErr(got)) return got
  await db.update(hangoutParticipations).set({ pageClosedAt: open ? null : now(), updatedAt: now() }).where(eq(hangoutParticipations.id, got.p.id))
  touch(got.e.id)
  return { ok: true }
}

/** (S09's note — 1.0's hangout invitation, `hangout_event_id`) Invite someone new for this Hangout: they join the studio as a Designer (Company
    › Members' Add member, its rules and its invitation) and the plan lists them, ready for a shift. */
export async function inviteForHangout(eventId: string, input: { name: string; phone: string; email: string }): Promise<{ id: string; invited: string[] | null } | Err> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const got = await planEditable(eventId); if (isErr(got)) return got
  const { addMember } = await import('@/app/company/members-actions')
  const r = await addMember({ name: input?.name ?? '', phone: input?.phone ?? '', email: input?.email ?? '', role: 'Designer' })
  if ('error' in r) return { error: r.error }
  if (!r.id) return { error: 'Couldn’t add them' }
  const t = now()
  const [inv] = await db.select({ id: studioInvitations.id }).from(studioInvitations).where(and(eq(studioInvitations.memberId, r.id), eq(studioInvitations.status, 'pending'))).limit(1)
  if (inv) await db.update(studioInvitations).set({ hangoutEventId: got.e.id }).where(eq(studioInvitations.id, inv.id))
  await db.insert(hangoutDesigners).values({ id: randomUUID(), eventId: got.e.id, memberId: r.id, shiftIds: '[]', inviteId: inv?.id ?? null, createdAt: t, updatedAt: t }).onConflictDoNothing()
  touch(got.e.id)
  revalidatePath('/company/members')
  return { id: r.id, invited: r.invited ?? null }
}

/* ── the day ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────── */

type Ctx = { v: Awaited<ReturnType<typeof fetchViewer>>; m: HangoutMeeting; e: HangoutEvent }
async function meetingCtx(id: unknown): Promise<Ctx | Err> {
  const v = await fetchViewer()
  if (isAccounting(v.role)) return { error: READS }
  const [m] = typeof id === 'string' ? await db.select().from(hangoutMeetings).where(eq(hangoutMeetings.id, id)).limit(1) : []
  if (!m) return { error: 'This chat is gone' }
  const e = await eventOf(m.eventId); if (isErr(e)) return e
  if (!runsStudio(v.role) && m.memberId !== v.id && !(await canOpenLead(v, m.leadId))) return { error: 'This chat isn’t one you can open' }
  return { v, m, e }
}
const mayRun = (c: Ctx) => runsStudio(c.v.role) || c.m.memberId === c.v.id
const leadName = async (leadId: string) => (await db.select({ name: leads.name }).from(leads).where(eq(leads.id, leadId)).limit(1))[0]?.name ?? 'The homeowner'

/** Give a chat to a designer on its shift (Owners and Admins; 1.0's Assign ID). They hear it on the bell. */
export async function assignHangoutMeeting(id: string, memberId: string): Promise<{ ok: true; previous: string | null } | Err> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await meetingCtx(id); if (isErr(c)) return c
  if (!runsStudio(c.v.role)) return { error: 'Only Owners and Admins give a chat to someone' }
  if (c.m.status === 'cancelled') return { error: 'This chat was cancelled' }
  if (c.m.status === 'in-progress') return { error: 'This chat is on — it stays with who started it' }
  const [d] = await db.select().from(hangoutDesigners).where(and(eq(hangoutDesigners.eventId, c.e.id), eq(hangoutDesigners.memberId, memberId ?? ''))).limit(1)
  if (!d || (c.m.shiftId && !ids(d.shiftIds).includes(c.m.shiftId))) return { error: 'Give it to someone on that shift' }
  if (c.m.memberId === memberId) return { ok: true, previous: memberId }
  await db.update(hangoutMeetings).set({ memberId, assignedBy: c.v.id, assignedAt: now(), updatedAt: now() }).where(eq(hangoutMeetings.id, c.m.id))
  const name = await leadName(c.m.leadId)
  await notify('hangout_meeting_assigned', [memberId], { title: `${name}’s chat at ${c.e.name} is yours`, body: c.m.tableNumber ? `Table ${c.m.tableNumber}` : null, href: hangoutHref(c.e.id, 'meetings'), leadId: c.m.leadId, actorId: c.v.id })
  touch(c.e.id)
  return { ok: true, previous: c.m.memberId }
}

/** Take a chat nobody has — a waiting one, or (1.0's Tag Myself) a held one nobody was put on — when you're on its shift. */
export async function takeHangoutMeeting(id: string): Promise<{ ok: true } | Err> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await meetingCtx(id); if (isErr(c)) return c
  if (c.m.memberId) return { error: 'Someone has this chat already' }
  if (c.m.status === 'cancelled') return { error: 'This chat was cancelled' }
  const [d] = await db.select().from(hangoutDesigners).where(and(eq(hangoutDesigners.eventId, c.e.id), eq(hangoutDesigners.memberId, c.v.id))).limit(1)
  if (!d || (c.m.shiftId && !ids(d.shiftIds).includes(c.m.shiftId))) return { error: 'You’re not on that shift' }
  await db.update(hangoutMeetings).set({ memberId: c.v.id, assignedBy: c.v.id, assignedAt: now(), updatedAt: now() }).where(eq(hangoutMeetings.id, c.m.id))
  touch(c.e.id)
  return { ok: true }
}

/** Start a chat at the table (1.0's Start) — on the event's day, one at a time for the homeowner and for the designer. */
export async function startHangoutMeeting(id: string): Promise<{ startedAt: number } | Err> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await meetingCtx(id); if (isErr(c)) return c
  if (!mayRun(c)) return { error: 'Only the designer on this chat, an Owner or an Admin starts it' }
  if (c.m.status !== 'scheduled') return { error: c.m.status === 'in-progress' ? 'This chat is on already' : 'This chat isn’t waiting' }
  if (!isEventDay(factsOf(c.e), Date.now())) return { error: 'Chats start on the day of the Hangout' }
  if (!c.m.memberId) return { error: 'Give the chat to a designer first' }
  const busy = await db.select({ id: hangoutMeetings.id, memberId: hangoutMeetings.memberId, registrationId: hangoutMeetings.registrationId }).from(hangoutMeetings)
    .where(and(eq(hangoutMeetings.eventId, c.e.id), eq(hangoutMeetings.status, 'in-progress')))
  if (busy.some((b) => b.registrationId === c.m.registrationId)) return { error: 'They’re in another chat right now' }
  if (busy.some((b) => b.memberId === c.m.memberId)) return { error: 'Their designer is in another chat — end it first' }
  const t = now()
  await db.update(hangoutMeetings).set({ status: 'in-progress', startedAt: t, startedBy: c.v.id, updatedAt: t }).where(and(eq(hangoutMeetings.id, c.m.id), eq(hangoutMeetings.status, 'scheduled')))
  touch(c.e.id)
  return { startedAt: t.getTime() }
}

export type EndInput = { outcome: OutcomeKey; reason: string; scope?: string; notes?: string }
function endInput(o: EndInput): { outcome: OutcomeKey; reason: string; scope: string | null; notes: string | null } | Err {
  if (!o || !isOutcome(o.outcome)) return { error: 'Pick how the chat went' }
  const reasons = reasonsOf(o.outcome)
  const reason = typeof o.reason === 'string' && reasons.includes(o.reason) ? o.reason : reasons.length === 1 ? reasons[0]! : ''
  if (!reason) return { error: 'Pick the reason' }
  const scope = typeof o.scope === 'string' ? o.scope.replace(/\s+/g, ' ').trim().slice(0, 160) || null : null
  const notes = typeof o.notes === 'string' ? o.notes.trim().slice(0, 20_000) || null : null
  return { outcome: o.outcome, reason, scope, notes }
}

/**
 * End a chat (1.0's End with its outcome): held, its outcome and reason kept, and — one home for what was said — written up as the lead's own
 * meeting (Meetings, lib/meetings: its notes, a brief by rule when there are notes, a recording added later), the lead given to its designer
 * when nobody holds it, and the next step a follow-up task for them (2.0's follow-ups are tasks). A dropped chat makes no task — the lead can
 * be marked lost from its page. Answers what it made, for the page to say.
 */
export async function endHangoutMeeting(id: string, input: EndInput): Promise<{ meetingId: string | null; taskId: string | null; leadId: string; task: string | null } | Err> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await meetingCtx(id); if (isErr(c)) return c
  if (!mayRun(c)) return { error: 'Only the designer on this chat, an Owner or an Admin ends it' }
  if (c.m.status !== 'in-progress') return { error: 'This chat isn’t on' }
  const got = endInput(input); if (isErr(got)) return got
  const t = now()
  const minutes = c.m.startedAt ? Math.max(1, Math.round((t.getTime() - c.m.startedAt.getTime()) / 60_000)) : null
  const done = await db.update(hangoutMeetings).set({ status: 'completed', outcome: got.outcome, subStatus: got.reason, scope: got.scope, notes: got.notes, endedAt: t, endedBy: c.v.id, durationMin: minutes, updatedAt: t })
    .where(and(eq(hangoutMeetings.id, c.m.id), eq(hangoutMeetings.status, 'in-progress')))
  if (!done.rowsAffected) return { error: 'This chat isn’t on' }
  const designer = c.m.memberId ?? c.v.id
  const after = await afterHeld({ ...c, m: { ...c.m, memberId: designer, startedAt: c.m.startedAt ?? t, endedAt: t } }, got, t)
  touch(c.e.id)
  return after
}

/** Change a held chat's outcome — its reason, scope and notes (a mis-tap at the table); the follow-up task follows while it is open. */
export async function setHangoutOutcome(id: string, input: EndInput): Promise<{ ok: true } | Err> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await meetingCtx(id); if (isErr(c)) return c
  if (!mayRun(c)) return { error: 'Only the designer on this chat, an Owner or an Admin changes it' }
  if (c.m.status !== 'completed') return { error: 'This chat isn’t over' }
  const got = endInput(input); if (isErr(got)) return got
  await db.update(hangoutMeetings).set({ outcome: got.outcome, subStatus: got.reason, scope: got.scope, notes: got.notes, updatedAt: now() }).where(eq(hangoutMeetings.id, c.m.id))
  const name = await leadName(c.m.leadId)
  const title = followUpFor(got.outcome, got.reason, name)
  if (c.m.taskId) {
    if (title) await db.update(leadTasks).set({ title, updatedAt: now() }).where(and(eq(leadTasks.id, c.m.taskId), eq(leadTasks.done, false)))
    else { await db.delete(leadTasks).where(and(eq(leadTasks.id, c.m.taskId), eq(leadTasks.done, false))); await db.update(hangoutMeetings).set({ taskId: null }).where(eq(hangoutMeetings.id, c.m.id)) }
  } else if (title) {
    const { createTask } = await import('@/app/leads/tasks-actions')
    const taskId = await createTask(c.m.leadId, title, { kind: 'Follow-up', dueAt: dueFor(new Date()), assignees: [c.m.memberId ?? c.v.id] })
    await db.update(hangoutMeetings).set({ taskId }).where(eq(hangoutMeetings.id, c.m.id))
  }
  if (c.m.meetingId) await db.update(leadMeetings).set({ notes: [got.scope ? `Scope: ${got.scope}` : '', got.notes ?? ''].filter(Boolean).join('\n\n'), updatedAt: now() }).where(and(eq(leadMeetings.id, c.m.meetingId), eq(leadMeetings.source, 'notes')))
  revalidateLead(c.m.leadId)
  touch(c.e.id)
  return { ok: true }
}
/** A follow-up's due: the next day at 10 AM (the house's default hour for a picked day). */
const dueFor = (t: Date) => new Date(t.getFullYear(), t.getMonth(), t.getDate() + 1, 10, 0)

async function afterHeld(c: Ctx & { m: HangoutMeeting & { memberId: string; startedAt: Date; endedAt: Date } }, got: { outcome: OutcomeKey; reason: string; scope: string | null; notes: string | null }, t: Date) {
  const name = await leadName(c.m.leadId)
  /* the lead's meeting — its notes, the brief by rule (when anything was written), the place and the hour */
  const said = [got.scope ? `Scope: ${got.scope}` : '', got.notes ?? ''].filter(Boolean).join('\n\n')
  const place = `${c.e.name}, ${c.e.venue}${c.m.tableNumber ? ` · Table ${c.m.tableNumber}` : ''}`
  let meetingId: string | null = null
  if (said) {
    const { writeUpMeeting } = await import('@/app/meetings/actions')
    const r = await writeUpMeeting({ leadId: c.m.leadId, notes: said, aim: 'first_consultation', whereKind: 'In person', startsAt: c.m.startedAt.getTime(), memberIds: [c.m.memberId] })
    if (!isErr(r)) meetingId = r.id
  }
  if (!meetingId) {
    meetingId = randomUUID()
    await db.insert(leadMeetings).values({ id: meetingId, leadId: c.m.leadId, aim: 'first_consultation', whereKind: 'In person', place, startsAt: c.m.startedAt, endsAt: c.m.endedAt, status: 'held', memberIds: JSON.stringify([c.m.memberId]), notes: '', createdBy: c.v.id, createdAt: t, updatedAt: t })
  } else {
    await db.update(leadMeetings).set({ place, endsAt: c.m.endedAt }).where(eq(leadMeetings.id, meetingId))
  }
  /* the lead is theirs when nobody holds it yet */
  const { leadAssignees } = await import('@/lib/db/schema')
  const holders = await db.select({ memberId: leadAssignees.memberId }).from(leadAssignees).where(eq(leadAssignees.leadId, c.m.leadId))
  if (!holders.length) await db.insert(leadAssignees).values({ id: randomUUID(), leadId: c.m.leadId, memberId: c.m.memberId, assignedAt: t, assignedBy: c.v.id }).onConflictDoNothing()
  /* the next step, as a follow-up task for the designer */
  const title = followUpFor(got.outcome, got.reason, name)
  let taskId: string | null = null
  if (title) {
    const { createTask } = await import('@/app/leads/tasks-actions')
    taskId = await createTask(c.m.leadId, title, { kind: 'Follow-up', dueAt: dueFor(t), assignees: [c.m.memberId] })
  }
  await db.update(hangoutMeetings).set({ meetingId, taskId }).where(eq(hangoutMeetings.id, c.m.id))
  revalidateLead(c.m.leadId)
  return { meetingId, taskId, leadId: c.m.leadId, task: title }
}

/** Cancel a waiting chat (they didn't come, or asked not to) — Undo brings it back. */
export async function cancelHangoutMeeting(id: string): Promise<{ ok: true } | Err> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await meetingCtx(id); if (isErr(c)) return c
  if (!mayRun(c)) return { error: 'Only the designer on this chat, an Owner or an Admin cancels it' }
  if (c.m.status !== 'scheduled') return { error: c.m.status === 'in-progress' ? 'This chat is on — end it instead' : 'This chat isn’t waiting' }
  await db.update(hangoutMeetings).set({ status: 'cancelled', cancelledAt: now(), updatedAt: now() }).where(eq(hangoutMeetings.id, c.m.id))
  touch(c.e.id)
  return { ok: true }
}
export async function restoreHangoutMeeting(id: string): Promise<{ ok: true } | Err> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await meetingCtx(id); if (isErr(c)) return c
  if (!mayRun(c)) return { error: 'Only the designer on this chat, an Owner or an Admin puts it back' }
  if (c.m.status !== 'cancelled') return { ok: true }
  if (phaseOf(factsOf(c.e), Date.now()) === 'ended') return { error: 'This Hangout is over' }
  await db.update(hangoutMeetings).set({ status: 'scheduled', cancelledAt: null, updatedAt: now() }).where(eq(hangoutMeetings.id, c.m.id))
  touch(c.e.id)
  return { ok: true }
}

/** On a break (1.0's status On Break): no new chat is given to you meanwhile; your waiting chats stay yours. */
export async function setOnBreak(eventId: string, on: boolean): Promise<{ ok: true } | Err> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const v = await fetchViewer()
  const e = await eventOf(eventId); if (isErr(e)) return e
  if (!isEventDay(factsOf(e), Date.now())) return { error: 'Breaks are for the day of the Hangout' }
  const [d] = await db.select().from(hangoutDesigners).where(and(eq(hangoutDesigners.eventId, e.id), eq(hangoutDesigners.memberId, v.id))).limit(1)
  if (!d || !ids(d.shiftIds).length) return { error: 'You’re not on this Hangout’s plan' }
  if (on) {
    const busy = await db.select({ id: hangoutMeetings.id }).from(hangoutMeetings).where(and(eq(hangoutMeetings.eventId, e.id), eq(hangoutMeetings.memberId, v.id), eq(hangoutMeetings.status, 'in-progress')))
    if (busy.length) return { error: 'End your chat first' }
  }
  await db.update(hangoutDesigners).set({ onBreakAt: on ? now() : null, updatedAt: now() }).where(eq(hangoutDesigners.id, d.id))
  touch(e.id)
  return { ok: true }
}

/** Book someone at the table (1.0's registration at the venue's desk): their lead (the number's, else a new one, source Hangout), their chat on
    the shift — with you when you're on it, else whoever the rule picks — and their own link by WhatsApp and email. */
export async function addWalkIn(eventId: string, input: { name: string; phone: string; email?: string; shiftId: string; prefs: HomeownerPrefs }): Promise<{ meetingId: string; leadId: string; fresh: boolean; sent: boolean } | Err> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const v = await fetchViewer()
  if (isAccounting(v.role)) return { error: READS }
  const e = await eventOf(eventId); if (isErr(e)) return e
  const p = await confirmedOf(e)
  if (!p) return { error: 'You’re not taking part in this Hangout' }
  if (!isEventDay(factsOf(e), Date.now())) return { error: 'Walk-ins are booked on the day' }
  const plan = await db.select().from(hangoutDesigners).where(eq(hangoutDesigners.eventId, e.id))
  const mine = plan.find((d) => d.memberId === v.id)
  if (!runsStudio(v.role) && !(mine && ids(mine.shiftIds).length)) return { error: 'Only the people at the tables, Owners and Admins book a walk-in' }
  const name = titleCaseName(input?.name ?? '').slice(0, 80)
  if (!name) return { error: 'Give their name' }
  const phone = phoneDigits(input?.phone ?? '')
  if (!isSgMobile(phone)) return { error: 'Enter a Singapore mobile number — 8 or 9 first' }
  const email = (input?.email ?? '').trim().toLowerCase().slice(0, 120) || null
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'That email doesn’t look right' }
  const [s] = await db.select().from(hangoutShifts).where(and(eq(hangoutShifts.id, input?.shiftId ?? ''), eq(hangoutShifts.eventId, e.id))).limit(1)
  if (!s || s.dayAt.getTime() !== midnightOf(Date.now())) return { error: 'Pick one of today’s shifts' }
  if (!plan.some((d) => ids(d.shiftIds).includes(s.id))) return { error: 'Nobody from the studio is on that shift' }
  const onIt = mine && ids(mine.shiftIds).includes(s.id) ? v.id : null
  const b = await bookChat(e, { name, phone, email, prefs: parseHomeownerPrefs(input?.prefs), shift: s, via: 'desk', by: v.id, designer: onIt })
  if (isErr(b)) return b
  const [m] = b.memberId ? await db.select({ name: members.name }).from(members).where(eq(members.id, b.memberId)).limit(1) : []
  const studio = shortStudioName((await fetchStudio()).name)
  const sent = b.fresh && p.pageToken ? await sendOwnLink({ regId: b.regId, pageToken: p.pageToken, token: b.token, leadId: b.leadId, name, phone, email, studio, eventName: e.name, venue: e.venue, shift: s, designer: m?.name ?? null, dayCount: e.dayCount }) : false
  if (b.fresh && b.memberId && b.memberId !== v.id) await notify('hangout_meeting_assigned', [b.memberId], { title: `${name}’s chat at ${e.name} is yours`, body: b.table ? `A walk-in · Table ${b.table}` : 'A walk-in', href: hangoutHref(e.id, 'meetings'), leadId: b.leadId, actorId: v.id })
  touch(e.id)
  return { meetingId: b.meetingId, leadId: b.leadId, fresh: b.fresh, sent }
}

/** The chats a page is still waiting on — a list the day view refreshes against, so a homeowner's "I'm at the table" shows. */
export async function hangoutPulse(eventId: string): Promise<string> {
  if (await offWorkspace()) return ''   // (S45C) the workspace's role rule: Marketing reads nothing here
  const v = await fetchViewer()
  if (isAccounting(v.role)) return ''
  const rows = await db.select({ id: hangoutMeetings.id, status: hangoutMeetings.status, memberId: hangoutMeetings.memberId, updatedAt: hangoutMeetings.updatedAt }).from(hangoutMeetings).where(and(eq(hangoutMeetings.eventId, typeof eventId === 'string' ? eventId : ''), ne(hangoutMeetings.status, 'cancelled')))
  const regs = await db.select({ id: hangoutRegistrations.id }).from(hangoutRegistrations).where(eq(hangoutRegistrations.eventId, typeof eventId === 'string' ? eventId : ''))
  return `${regs.length}:${rows.map((r) => `${r.id}.${r.status}.${r.memberId ?? ''}.${r.updatedAt.getTime()}`).sort().join('|')}`
}
