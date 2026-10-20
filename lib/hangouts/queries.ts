import 'server-only'
import { and, asc, eq, inArray, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { hangoutDesigners, hangoutEvents, hangoutMeetings, hangoutParticipations, hangoutRegistrations, hangoutShifts, leadAssignees, leads, meetings as leadMeetings, members, projects, stageLogs, studioInvitations, type HangoutEvent, type HangoutShift } from '@/lib/db/schema'
import { fetchStageMovement } from '@/lib/settings/queries'
import { heldMeetingStep, stageIntent } from '@/lib/leads/stage-policy'
import { STAGES, type Stage } from '@/lib/leads/enums'
import { fetchViewer, visibleLeadIds } from '@/lib/leads/visibility'
import { onLeads, runsStudio } from '@/lib/settings/roles'
import { currentPhotoId } from '@/lib/company/member-photo-store'
import { studioPictureHref } from '@/lib/portal/about'
import { fetchBrand } from '@/lib/templates/queries'
import { shortStudioName } from '@/lib/settings/types'
import { isSgPhone, phoneDigits } from '@/lib/format'
import { keptReviewLink } from '@/lib/company/review-link'
import { clientMeetingPath } from '@/lib/meetings/model'
import { publicCards } from '@/lib/portfolio/queries'
import type { PublicCard } from '@/lib/portfolio/model'
import {
  budgetLabel, clientNextLine, daysLine, eventDays, hangoutPagePath, hasStudioPrefs, hoursLine, isEventDay, meetingWord, midnightOf, parseHomeownerPrefs,
  parseStudioPrefs, phaseOf, placesLeft, shiftLine, standingOf, tablesWords, type HomeownerPrefs, type Participation, type Phase, type StudioPrefs,
} from './model'

/*
 * (pending modules S27 — Hangouts) What the studio's Hangouts pages read, and what the public pages may show. The studio's side honours Who
 * sees leads (a chat whose lead the viewer may not open is left out, unless it is theirs); the public pages carry only the studio's own words —
 * its name, its people's public cards, the event's facts — never another homeowner's.
 */

const json = <T,>(v: string | null | undefined, fallback: T): T => { try { return v ? (JSON.parse(v) as T) : fallback } catch { return fallback } }
const ids = (v: string | null | undefined): string[] => json<unknown[]>(v, []).filter((x): x is string => typeof x === 'string')
const nums = (v: string | null | undefined): number[] => json<unknown[]>(v, []).map(Number).filter((n) => Number.isInteger(n) && n > 0)
const facts = (e: HangoutEvent) => ({ startsOn: e.startsOn.getTime(), dayCount: e.dayCount, startTime: e.startTime, endTime: e.endTime, feedStatus: e.feedStatus })
const shiftOf = (s: HangoutShift) => ({ id: s.id, label: s.label, dayAt: s.dayAt.getTime(), startTime: s.startTime, endTime: s.endTime })
const mapsHref = (q: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`

/* ── Qanvast Ops › Hangouts ─────────────────────────────────────────────────────────────────────────────────────────────────────── */

export type HangoutListItem = {
  id: string; name: string; venue: string; daysLine: string; hoursLine: string; startsOn: number; phase: Phase; participation: Participation
  standing: { word: string; tone: 'default' | 'green' | 'yellow' | 'red' | 'blue' }; placesLeft: number; pricePerTableMinor: number; tablesPerStudio: number
  customerProfile: string | null; tables: number[]; designers: number; booked: number; held: number; sample: boolean; appliedBy: string | null; appliedAt: number | null
}
export type HangoutsData = { events: HangoutListItem[]; runs: boolean; now: number; sample: boolean }

export async function fetchHangouts(now = Date.now()): Promise<HangoutsData> {
  const [viewer, events, parts, designers, regs, held, team] = await Promise.all([
    fetchViewer(), db.select().from(hangoutEvents).orderBy(asc(hangoutEvents.startsOn)), db.select().from(hangoutParticipations),
    db.select({ eventId: hangoutDesigners.eventId, shiftIds: hangoutDesigners.shiftIds }).from(hangoutDesigners),
    db.select({ eventId: hangoutRegistrations.eventId }).from(hangoutRegistrations),
    db.select({ eventId: hangoutMeetings.eventId, status: hangoutMeetings.status }).from(hangoutMeetings),
    db.select({ id: members.id, name: members.name }).from(members),
  ])
  const nameOf = (id: string | null) => team.find((m) => m.id === id)?.name ?? null
  const list = events.map((e): HangoutListItem => {
    const p = parts.find((x) => x.eventId === e.id)
    const participation = (p?.status ?? 'none') as Participation
    const phase = phaseOf(facts(e), now)
    return {
      id: e.id, name: e.name, venue: e.venue, daysLine: daysLine(facts(e)), hoursLine: hoursLine(e.startTime, e.endTime), startsOn: e.startsOn.getTime(), phase, participation,
      standing: standingOf(phase, participation), placesLeft: placesLeft(e), pricePerTableMinor: e.pricePerTableMinor, tablesPerStudio: e.tablesPerStudio,
      customerProfile: e.customerProfile, tables: p?.status === 'confirmed' ? nums(p.tables) : [],
      designers: designers.filter((d) => d.eventId === e.id && ids(d.shiftIds).length > 0).length, booked: regs.filter((r) => r.eventId === e.id).length,
      held: held.filter((m) => m.eventId === e.id && m.status === 'completed').length, sample: e.sample,
      appliedBy: p?.status === 'applied' ? nameOf(p.appliedBy) : null, appliedAt: p?.appliedAt?.getTime() ?? null,
    }
  })
  /* today's first, then what is ahead (soonest first), then what has ended (latest first); a cancelled one last */
  const rank = (x: HangoutListItem) => (x.phase === 'today' ? 0 : x.phase === 'ahead' ? 1 : x.phase === 'ended' ? 2 : 3)
  list.sort((a, b) => rank(a) - rank(b) || (rank(a) === 2 ? b.startsOn - a.startsOn : a.startsOn - b.startsOn))
  return { events: list, runs: runsStudio(viewer.role), now, sample: events.some((e) => e.sample) }
}

/* ── one event ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────── */

export type ShiftView = { id: string; label: string; dayAt: number; startTime: string; endTime: string; line: string; short: string }
export type PlanDesigner = { memberId: string; name: string; role: string; color: string; photo: string | null; shiftIds: string[]; sharePct: number | null; onBreak: boolean; cardEmpty: boolean; workCount: number }
export type TeamPick = { id: string; name: string; role: string; color: string; photo: string | null }
export type HangoutMeetingRow = {
  id: string; leadId: string; leadName: string; phone: string; canOpen: boolean; memberId: string | null; memberName: string | null; memberColor: string | null; memberPhoto: string | null
  shiftId: string | null; shiftLine: string | null; tableNumber: number | null; status: string; word: string; outcome: string | null; reason: string | null; scope: string | null; notes: string | null
  matchScore: number | null; startedAt: number | null; endedAt: number | null; durationMin: number | null; meetingId: string | null; taskId: string | null; via: string; registeredAt: number
  prefs: HomeownerPrefs; prefsLine: string; regId: string; notesShared: boolean
  /** (S42E, call E·3) what End offers the lead, by the studio's stage rule: the next stage a kept-going chat takes it to (`heldMeetingStep`), and
      whether a dropped one may mark it lost */
  next: 'Contacted' | 'Met' | null; lostable: boolean
  /** (S43B · F1-06) the lead is on hold — `next` resumes it there (the house's "Resume at Met?" confirm asks first) */
  resume: boolean
}
export type HangoutResults = { held: number; promised: number; converted: number; followUp: number; dropped: number; inProgress: number; waiting: number; rate: number | null
  byDesigner: { memberId: string; name: string; color: string; photo: string | null; meetings: number; converted: number; followUp: number; dropped: number }[]; leads: number }
export type HangoutView = {
  event: { id: string; name: string; venue: string; address: string | null; mapsHref: string; daysLine: string; hoursLine: string; startsOn: number; dayCount: number; phase: Phase; feedStatus: string
    pricePerTableMinor: number; tablesPerStudio: number; totalTables: number; placesLeft: number; promisedMeetings: number; customerProfile: string | null; studioExpectations: string | null; description: string | null; sample: boolean }
  shifts: ShiftView[]
  participation: { status: Participation; tables: number[]; tablesLine: string | null; appliedAt: number | null; appliedBy: string | null; confirmedAt: number | null; planSentAt: number | null; planSentBy: string | null; planSavedAt: number | null; pagePath: string | null; pageOpen: boolean } | null
  prefs: StudioPrefs; prefsSet: boolean
  designers: PlanDesigner[]
  team: TeamPick[]
  invited: { id: string; memberId: string; name: string; status: string }[]
  meetings: HangoutMeetingRow[]
  results: HangoutResults
  viewer: { id: string; role: string; runs: boolean; onPlan: boolean; shiftsToday: string[]; onBreak: boolean }
  now: number
}

/** `{homeKind} · {budget} · {style}` — what a homeowner told the studio, in one line. */
export function prefsLine(p: HomeownerPrefs): string {
  return [p.propertyType, p.status, budgetLabel(p.budget), p.keys ? (p.keys === 'Collected' ? 'Keys collected' : p.keys === 'Later' ? 'Keys later' : `Keys ${p.keys}`) : null, p.area, p.styles.slice(0, 2).join(', ') || null].filter(Boolean).join(' · ')
}

export async function fetchHangout(eventId: string, now = Date.now()): Promise<HangoutView | null> {
  const [e] = await db.select().from(hangoutEvents).where(eq(hangoutEvents.id, eventId)).limit(1)
  if (!e) return null
  const viewer = await fetchViewer()
  const [shifts, [p], plan, team, regs, rows, invites] = await Promise.all([
    db.select().from(hangoutShifts).where(eq(hangoutShifts.eventId, e.id)).orderBy(asc(hangoutShifts.dayAt), asc(hangoutShifts.position)),
    db.select().from(hangoutParticipations).where(eq(hangoutParticipations.eventId, e.id)).limit(1),
    db.select().from(hangoutDesigners).where(eq(hangoutDesigners.eventId, e.id)),
    db.select().from(members),
    db.select().from(hangoutRegistrations).where(eq(hangoutRegistrations.eventId, e.id)),
    db.select().from(hangoutMeetings).where(eq(hangoutMeetings.eventId, e.id)),
    db.select({ id: studioInvitations.id, memberId: studioInvitations.memberId, name: studioInvitations.fullName, status: studioInvitations.status }).from(studioInvitations).where(eq(studioInvitations.hangoutEventId, e.id)),
  ])
  const phase = phaseOf(facts(e), now)
  const sv: ShiftView[] = shifts.map((s) => ({ ...shiftOf(s), line: shiftLine(shiftOf(s)), short: shiftLine(shiftOf(s), e.dayCount > 1) }))
  const photoOf = (m: (typeof team)[number]) => { const id = currentPhotoId(m); return id ? studioPictureHref(id) : null }
  const memberOf = (id: string | null) => (id ? team.find((m) => m.id === id) ?? null : null)
  /* whose card has nothing on it yet — the plan says so beside them (a homeowner reads it on the studio's page) */
  const cards = await publicCards(team.filter((m) => plan.some((d) => d.memberId === m.id)), { photo: studioPictureHref, picture: (id) => `/company/work/${id}` })
  const designers: PlanDesigner[] = plan.flatMap((d) => {
    const m = memberOf(d.memberId)
    if (!m) return []
    const c = cards.find((x) => x.id === m.id)
    return [{ memberId: m.id, name: m.name, role: m.role, color: m.color, photo: photoOf(m), shiftIds: ids(d.shiftIds), sharePct: d.sharePct, onBreak: !!d.onBreakAt, workCount: c?.work.length ?? 0,
      cardEmpty: !c || (!c.photo && !m.portalTitle?.trim() && !c.bio && !c.years && !c.work.length) }]
  }).sort((a, b) => a.name.localeCompare(b.name))
  const visible = await visibleLeadIds(viewer)
  const leadIds = [...new Set(regs.map((r) => r.leadId))]
  const [leadRows, liveProjects, movement, links, logs] = await Promise.all([
    leadIds.length ? db.select({ id: leads.id, name: leads.name, phone: leads.phone, stage: leads.stage }).from(leads).where(inArray(leads.id, leadIds)) : Promise.resolve([]),
    leadIds.length ? db.select({ id: projects.id, number: projects.number, leadId: projects.leadId }).from(projects).where(and(inArray(projects.leadId, leadIds), isNull(projects.deletedAt))) : Promise.resolve([]),
    fetchStageMovement(),
    /* (S43B · F1-06) the stage rule needs each chat's lead as the meeting page reads it (`meetingStepFor`): its members and, when parked, where it left */
    leadIds.length ? db.select({ leadId: leadAssignees.leadId, memberId: leadAssignees.memberId }).from(leadAssignees).where(inArray(leadAssignees.leadId, leadIds)) : Promise.resolve([]),
    leadIds.length ? db.select({ leadId: stageLogs.leadId, fromStage: stageLogs.fromStage, toStage: stageLogs.toStage }).from(stageLogs).where(inArray(stageLogs.leadId, leadIds)).orderBy(asc(stageLogs.createdAt)) : Promise.resolve([]),
  ])
  /* (S42E, call E·3) the stage rule's answer for each chat's lead. (S43B · F1-06 — his "fix all the pending things" 2026-10-15, as recommended)
     It asks with the lead's own members and, for a parked lead, the stage it left — so a lead on hold is offered "Resume at Met" here exactly as
     its meeting page offers it (S42G, `heldMeetingStep`); it used to be asked with no members and no resume stage, and End offered nothing. */
  const stepFor = (l: { id: string; stage: string }) => {
    const p = liveProjects.find((x) => x.leadId === l.id)
    const active = (STAGES as readonly string[]).includes(l.stage)
    const left = active ? null : logs.filter((g) => g.leadId === l.id && g.toStage === l.stage).at(-1)?.fromStage ?? null   // lib/leads/queries.ts `resumeStageOf`
    const lead = { stage: l.stage as Stage, resumeStage: left && (STAGES as readonly string[]).includes(left) ? left : null, assignees: links.filter((a) => a.leadId === l.id), project: p ? { id: p.id, number: p.number } : null } as unknown as Parameters<typeof heldMeetingStep>[0]
    const next = heldMeetingStep(lead, movement)
    return { next, resume: !!next && !active, lostable: stageIntent(lead, 'Lost', movement).kind === 'lost' }
  }
  const s23 = rows.some((r) => r.meetingId) ? await db.select({ id: leadMeetings.id, sharedAt: leadMeetings.sharedAt, shareStoppedAt: leadMeetings.shareStoppedAt }).from(leadMeetings).where(inArray(leadMeetings.id, rows.map((r) => r.meetingId).filter((x): x is string => !!x))) : []
  const meetingRows: HangoutMeetingRow[] = rows.filter((r) => r.status !== 'cancelled' || r.cancelledAt).flatMap((r) => {
    const reg = regs.find((x) => x.id === r.registrationId)
    const lead = leadRows.find((l) => l.id === r.leadId)
    if (!reg || !lead) return []
    const canOpen = visible === null || visible.has(r.leadId)
    if (!canOpen && r.memberId !== viewer.id) return []
    const m = memberOf(r.memberId)
    const s = sv.find((x) => x.id === r.shiftId) ?? null
    const prefs = parseHomeownerPrefs(reg.preferencesJson)
    const lm = s23.find((x) => x.id === r.meetingId)
    return [{
      id: r.id, leadId: r.leadId, leadName: lead.name, phone: lead.phone, canOpen, memberId: r.memberId, memberName: m?.name ?? null, memberColor: m ? m.color : null, memberPhoto: m ? photoOf(m) : null,
      shiftId: r.shiftId, shiftLine: s ? s.short : null, tableNumber: r.tableNumber, status: r.status, word: meetingWord(r), outcome: r.outcome, reason: r.subStatus, scope: r.scope, notes: r.notes,
      matchScore: r.matchScore, startedAt: r.startedAt?.getTime() ?? null, endedAt: r.endedAt?.getTime() ?? null, durationMin: r.durationMin, meetingId: r.meetingId, taskId: r.taskId,
      via: reg.via, registeredAt: reg.createdAt.getTime(), prefs, prefsLine: prefsLine(prefs), regId: reg.id, notesShared: !!lm?.sharedAt && !lm.shareStoppedAt,
      ...stepFor(lead),
    }]
  })
  /* the day's order: on now, then waiting (by shift), then done (latest first), then cancelled */
  const order = (r: HangoutMeetingRow) => (r.status === 'in-progress' ? 0 : r.status === 'scheduled' ? 1 : r.status === 'completed' ? 2 : 3)
  const shiftRank = (id: string | null) => { const i = sv.findIndex((s) => s.id === id); return i < 0 ? 99 : i }
  meetingRows.sort((a, b) => order(a) - order(b) || (order(a) === 2 ? (b.endedAt ?? 0) - (a.endedAt ?? 0) : shiftRank(a.shiftId) - shiftRank(b.shiftId) || a.registeredAt - b.registeredAt))
  const done = rows.filter((r) => r.status === 'completed')
  const count = (o: string, list = done) => list.filter((r) => r.outcome === o).length
  const results: HangoutResults = {
    held: done.length, promised: e.promisedMeetings, converted: count('converted'), followUp: count('follow-up'), dropped: count('dropped'),
    inProgress: rows.filter((r) => r.status === 'in-progress').length, waiting: rows.filter((r) => r.status === 'scheduled').length,
    rate: done.length ? Math.round((count('converted') / done.length) * 100) : null,
    byDesigner: designers.map((d) => { const mine = done.filter((r) => r.memberId === d.memberId); return { memberId: d.memberId, name: d.name, color: d.color, photo: d.photo, meetings: mine.length, converted: count('converted', mine), followUp: count('follow-up', mine), dropped: count('dropped', mine) } })
      .sort((a, b) => b.meetings - a.meetings || a.name.localeCompare(b.name)),
    leads: new Set(regs.map((r) => r.leadId)).size,
  }
  const today = midnightOf(now)
  const mine = plan.find((d) => d.memberId === viewer.id)
  const prefs = parseStudioPrefs(p?.preferencesJson)
  return {
    event: { id: e.id, name: e.name, venue: e.venue, address: e.address, mapsHref: mapsHref(e.address ? `${e.venue}, ${e.address}` : e.venue), daysLine: daysLine(facts(e)), hoursLine: hoursLine(e.startTime, e.endTime),
      startsOn: e.startsOn.getTime(), dayCount: e.dayCount, phase, feedStatus: e.feedStatus, pricePerTableMinor: e.pricePerTableMinor, tablesPerStudio: e.tablesPerStudio, totalTables: e.totalTables,
      placesLeft: placesLeft(e), promisedMeetings: e.promisedMeetings, customerProfile: e.customerProfile, studioExpectations: e.studioExpectations, description: e.description, sample: e.sample },
    shifts: sv,
    participation: p && p.status !== 'withdrawn' ? {
      status: p.status as Participation, tables: nums(p.tables), tablesLine: tablesWords(nums(p.tables)), appliedAt: p.appliedAt?.getTime() ?? null, appliedBy: memberOf(p.appliedBy)?.name ?? null,
      confirmedAt: p.confirmedAt?.getTime() ?? null, planSentAt: p.planSentAt?.getTime() ?? null, planSentBy: memberOf(p.planSentBy)?.name ?? null, planSavedAt: p.planSavedAt?.getTime() ?? null,
      pagePath: p.status === 'confirmed' && p.pageToken ? hangoutPagePath(p.pageToken) : null, pageOpen: !p.pageClosedAt,
    } : null,
    prefs, prefsSet: hasStudioPrefs(prefs),
    designers,
    team: team.filter((m) => m.isActive && onLeads(m.role)).map((m) => ({ id: m.id, name: m.name, role: m.role, color: m.color, photo: photoOf(m) })).sort((a, b) => a.name.localeCompare(b.name)),
    invited: invites.filter((i) => i.status === 'pending'),
    meetings: meetingRows,
    results,
    viewer: { id: viewer.id, role: viewer.role, runs: runsStudio(viewer.role), onPlan: !!mine && ids(mine.shiftIds).length > 0,
      shiftsToday: mine ? ids(mine.shiftIds).filter((sid) => sv.some((s) => s.id === sid && s.dayAt === today)) : [], onBreak: !!mine?.onBreakAt },
    now,
  }
}

/* ── the public pages ───────────────────────────────────────────────────────────────────────────────────────────────────────────── */

export type PublicStudio = { name: string; logo: string | null; whatsapp: string | null; reviewLink: string | null }
async function publicStudio(): Promise<PublicStudio> {
  const brand = await fetchBrand()
  const d = brand.details
  const phone = phoneDigits(d.phone ?? '')
  const wa = phoneDigits(d.socials?.whatsapp ?? '') || (isSgPhone(phone) && /^[89]/.test(phone) ? phone : '')
  return { name: shortStudioName(d.name || 'Your studio'), logo: brand.kit.logo ?? null, whatsapp: wa || null, reviewLink: keptReviewLink(d.reviewLink) || null }
}
export type PublicShift = { id: string; label: string; dayAt: number; line: string; designers: number }
export type PublicDesigner = PublicCard & { when: string }
export type HangoutPublicPage =
  | { state: 'gone'; studio: PublicStudio }
  | { state: 'open' | 'closed' | 'ended'; token: string; studio: PublicStudio
      event: { name: string; venue: string; address: string | null; mapsHref: string; daysLine: string; hoursLine: string; tablesLine: string | null; description: string | null; today: boolean }
      shifts: PublicShift[]; designers: PublicDesigner[] }

/** A public page's event: the studio's own, confirmed, its token — else nothing. */
async function pageEvent(token: string) {
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) return null
  const [p] = await db.select().from(hangoutParticipations).where(eq(hangoutParticipations.pageToken, token)).limit(1)
  if (!p || p.status !== 'confirmed') return null
  const [e] = await db.select().from(hangoutEvents).where(eq(hangoutEvents.id, p.eventId)).limit(1)
  return e ? { e, p } : null
}
/** The members on an event's plan (on at least one shift), active, with the shifts they are on. */
async function planOf(eventId: string) {
  const plan = await db.select().from(hangoutDesigners).where(eq(hangoutDesigners.eventId, eventId))
  const on = plan.filter((d) => ids(d.shiftIds).length > 0)
  const people = on.length ? await db.select().from(members).where(and(inArray(members.id, on.map((d) => d.memberId)), eq(members.isActive, true))) : []
  return on.flatMap((d) => { const m = people.find((x) => x.id === d.memberId); return m ? [{ d, m, shiftIds: ids(d.shiftIds) }] : [] })
}
export const hangoutFaceHref = (token: string, id: string) => `/hangout/${token}/face/${id}`
export const hangoutWorkHref = (token: string, id: string) => `/hangout/${token}/work/${id}`

/** The studio's page for a Hangout, as a homeowner opens it: the event, the shifts they can book, the studio's people who will be there. */
export async function fetchHangoutPublic(token: string, now = Date.now()): Promise<HangoutPublicPage> {
  const studio = await publicStudio()
  const got = await pageEvent(token)
  if (!got) return { state: 'gone', studio }
  const { e, p } = got
  const phase = phaseOf(facts(e), now)
  if (phase === 'cancelled') return { state: 'gone', studio }
  const [shifts, plan] = await Promise.all([db.select().from(hangoutShifts).where(eq(hangoutShifts.eventId, e.id)).orderBy(asc(hangoutShifts.dayAt), asc(hangoutShifts.position)), planOf(e.id)])
  const today = midnightOf(now)
  const staffed = shifts.filter((s) => plan.some((x) => x.shiftIds.includes(s.id)))
  const bookable = staffed.filter((s) => s.dayAt.getTime() >= today)
  const cards = await publicCards(plan.map((x) => x.m), { photo: (id) => hangoutFaceHref(token, id), picture: (id) => hangoutWorkHref(token, id) })
  const designers: PublicDesigner[] = cards.map((c) => {
    const mine = staffed.filter((s) => plan.find((x) => x.m.id === c.id)?.shiftIds.includes(s.id))
    return { ...c, when: mine.map((s) => shiftLine(shiftOf(s), e.dayCount > 1)).join(' · ') }
  }).sort((a, b) => a.name.localeCompare(b.name))
  const state = phase === 'ended' ? 'ended' : p.pageClosedAt || !bookable.length ? 'closed' : 'open'
  return {
    state, token, studio,
    event: { name: e.name, venue: e.venue, address: e.address, mapsHref: mapsHref(e.address ? `${e.venue}, ${e.address}` : e.venue), daysLine: daysLine(facts(e)), hoursLine: hoursLine(e.startTime, e.endTime),
      tablesLine: tablesWords(nums(p.tables)), description: e.description, today: phase === 'today' },
    shifts: bookable.map((s) => ({ id: s.id, label: s.label, dayAt: s.dayAt.getTime(), line: shiftLine(shiftOf(s), e.dayCount > 1 || s.dayAt.getTime() !== today), designers: plan.filter((x) => x.shiftIds.includes(s.id)).length })),
    designers,
  }
}

export type OwnMeeting = { id: string; status: string; word: string; designer: PublicCard | null; shiftLine: string | null; table: number | null; canStart: boolean; next: string | null; notesHref: string | null; startedAt: number | null }
export type HangoutOwnPage =
  | { state: 'gone'; studio: PublicStudio }
  | { state: 'ok'; token: string; reg: string; studio: PublicStudio; client: string
      event: { name: string; venue: string; address: string | null; mapsHref: string; daysLine: string; hoursLine: string; today: boolean; ended: boolean }
      meetings: OwnMeeting[] }

/** A homeowner's own page on the studio's Hangout page: their chats — who, when, which table — "I'm at the table" on the day, and once a chat
    is over, what comes next (by rule) and the notes the studio shared. The token pair is the permission; nothing of anyone else is read. */
export async function fetchHangoutOwn(token: string, reg: string, now = Date.now()): Promise<HangoutOwnPage> {
  const studio = await publicStudio()
  const got = await pageEvent(token)
  if (!got || !/^[A-Za-z0-9_-]{16,64}$/.test(reg)) return { state: 'gone', studio }
  const { e } = got
  const [r] = await db.select().from(hangoutRegistrations).where(and(eq(hangoutRegistrations.token, reg), eq(hangoutRegistrations.eventId, e.id))).limit(1)
  if (!r) return { state: 'gone', studio }
  const [rows, shifts] = await Promise.all([
    db.select().from(hangoutMeetings).where(and(eq(hangoutMeetings.registrationId, r.id), isNull(hangoutMeetings.cancelledAt))),
    db.select().from(hangoutShifts).where(eq(hangoutShifts.eventId, e.id)),
  ])
  const people = rows.some((m) => m.memberId) ? await db.select().from(members).where(inArray(members.id, rows.map((m) => m.memberId).filter((x): x is string => !!x))) : []
  const cards = await publicCards(people, { photo: (id) => hangoutFaceHref(token, id), picture: (id) => hangoutWorkHref(token, id) })
  const s23 = rows.some((m) => m.meetingId) ? await db.select({ id: leadMeetings.id, token: leadMeetings.clientToken, sharedAt: leadMeetings.sharedAt, stopped: leadMeetings.shareStoppedAt }).from(leadMeetings).where(inArray(leadMeetings.id, rows.map((m) => m.meetingId).filter((x): x is string => !!x))) : []
  const phase = phaseOf(facts(e), now)
  const busy = rows.some((m) => m.status === 'in-progress')
  const today = isEventDay(facts(e), now)
  const meetings: OwnMeeting[] = rows.filter((m) => m.status !== 'cancelled').map((m) => {
    const s = shifts.find((x) => x.id === m.shiftId)
    const card = cards.find((c) => c.id === m.memberId) ?? null
    const lm = s23.find((x) => x.id === m.meetingId)
    const shiftToday = s ? s.dayAt.getTime() === midnightOf(now) : today
    return {
      id: m.id, status: m.status, word: m.status === 'scheduled' ? 'Booked' : m.status === 'in-progress' ? 'On now' : 'Done', designer: card,
      shiftLine: s ? shiftLine(shiftOf(s), e.dayCount > 1 || !shiftToday) : null, table: m.tableNumber,
      canStart: m.status === 'scheduled' && phase === 'today' && shiftToday && !busy && !!m.memberId,
      next: m.status === 'completed' ? clientNextLine(m.outcome, m.subStatus, card?.name ?? null, studio.name) : null,
      notesHref: lm?.token && lm.sharedAt && !lm.stopped ? clientMeetingPath(lm.token) : null, startedAt: m.startedAt?.getTime() ?? null,
    }
  })
  const days = eventDays(facts(e))
  return {
    state: 'ok', token, reg, studio, client: r.name.trim().split(/\s+/)[0] ?? r.name,
    event: { name: e.name, venue: e.venue, address: e.address, mapsHref: mapsHref(e.address ? `${e.venue}, ${e.address}` : e.venue), daysLine: daysLine(facts(e)), hoursLine: hoursLine(e.startTime, e.endTime),
      today: phase === 'today', ended: phase === 'ended' || midnightOf(now) > days[days.length - 1]! },
    meetings,
  }
}

/** Whether a picture may be drawn on this public page: a portrait or a piece of work of someone on the event's plan. */
export async function onPagePlan(token: string, memberId: string): Promise<boolean> {
  const got = await pageEvent(token)
  if (!got) return false
  return (await planOf(got.e.id)).some((x) => x.m.id === memberId)
}

/** 1.0's `/hangouts/<eventId>` (Qanvast's id for the event): the studio's page for it when the studio takes part, else nothing. */
export async function pageForFeedEvent(feedRef: string): Promise<string | null> {
  const [e] = await db.select({ id: hangoutEvents.id }).from(hangoutEvents).where(eq(hangoutEvents.feedRef, feedRef)).limit(1)
  if (!e) return null
  const [p] = await db.select({ token: hangoutParticipations.pageToken, status: hangoutParticipations.status }).from(hangoutParticipations).where(eq(hangoutParticipations.eventId, e.id)).limit(1)
  return p?.status === 'confirmed' && p.token ? hangoutPagePath(p.token) : null
}
