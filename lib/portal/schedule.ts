import 'server-only'   // libSQL never reaches the browser: every client import of this module is `import type`
import { and, desc, eq, inArray, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { homeownerProfiles, leads, projectMilestones, projectScheduleShares, projects } from '@/lib/db/schema'
import { dayLabel, dayOf, dayOfIso, parseSnapshot, type ScheduleSnapshot } from '@/lib/projects/schedule-model'
import { money2 } from '@/lib/quotes/math'
import { clientStageName, givenName } from './model'
import { isStageAnswer, paymentState, portalStages, summaryOf, waitsForClient, type LiveStage, type PortalStage, type ScheduleEvent, type ScheduleSummary, type StagePayment } from './schedule-model'
import { holdOf } from '@/lib/projects/hold'
import { fetchPortalMoney } from '@/lib/projects/payments-portal'
import { placeOf } from './queries'
import { scheduleSeenOf } from './household'
import type { PortalVisitor } from './session'

/*
 * (Projects round 4b) The portal's Schedule on the server. Only what the client may read leaves here: the newest share's snapshot (round 2
 * stores it on Share changes — never the live rows, so a change not shared is absent), the studio's ask and the client's own answer for
 * the stages in it, and the share's note. No task, no payment, no waiting-on, no member's name.
 */

type Share = { id: string; at: number; note: string | null; snapshot: ScheduleSnapshot }

/** Every share of these projects, newest first. */
async function sharesOf(projectIds: string[]): Promise<Map<string, Share[]>> {
  const out = new Map<string, Share[]>()
  if (!projectIds.length) return out
  const rows = await db.select().from(projectScheduleShares).where(inArray(projectScheduleShares.projectId, projectIds)).orderBy(desc(projectScheduleShares.sharedAt))
  for (const r of rows) {
    const snapshot = parseSnapshot(r.snapshot)
    if (!snapshot) continue
    out.set(r.projectId, [...(out.get(r.projectId) ?? []), { id: r.id, at: r.sharedAt.getTime(), note: r.note, snapshot }])
  }
  return out
}

/** The live milestones' confirmation facts, by id — deleted ones too (a stage the studio took off still sits in an older snapshot). */
async function liveStagesOf(projectIds: string[]): Promise<{ byId: Map<string, LiveStage & { projectId: string }>; counts: Map<string, number> }> {
  const byId = new Map<string, LiveStage & { projectId: string }>()
  const counts = new Map<string, number>()
  if (!projectIds.length) return { byId, counts }
  const rows = await db.select({
    id: projectMilestones.id, projectId: projectMilestones.projectId, status: projectMilestones.status, deletedAt: projectMilestones.deletedAt,
    askedAt: projectMilestones.confirmAskedAt, answer: projectMilestones.confirmAnswer, note: projectMilestones.confirmNote,
    answeredAt: projectMilestones.confirmAnsweredAt, answeredBy: projectMilestones.confirmAnsweredBy, doneAt: projectMilestones.doneAt,
    clientNote: projectMilestones.clientNote, resolvedNote: projectMilestones.resolvedNote, resolvedAt: projectMilestones.resolvedAt,   // (gaps build D, items 4 · 5)
    resumeOn: projectMilestones.resumeOn,   // (parity map, CP-064) P-E's "Expected to resume" on a Blocked stage — told live, as the pause is
  }).from(projectMilestones).where(inArray(projectMilestones.projectId, projectIds))
  const who = [...new Set(rows.map((r) => r.answeredBy).filter((x): x is string => !!x))]
  const names = who.length ? new Map((await db.select({ id: homeownerProfiles.id, name: homeownerProfiles.name }).from(homeownerProfiles).where(inArray(homeownerProfiles.id, who))).map((h) => [h.id, h.name])) : new Map<string, string>()
  /* (REG-1054) who answered, by their given name — someone from the household without the family name they share with the client */
  const clients = who.length ? new Map((await db.select({ id: projects.id, name: leads.name }).from(projects).innerJoin(leads, eq(leads.id, projects.leadId)).where(inArray(projects.id, projectIds))).map((p) => [p.id, p.name])) : new Map<string, string>()
  for (const r of rows) {
    if (!r.deletedAt) counts.set(r.projectId, (counts.get(r.projectId) ?? 0) + 1)
    byId.set(r.id, {
      id: r.id, projectId: r.projectId, status: r.status, deleted: !!r.deletedAt,
      askedAt: r.askedAt?.getTime() ?? null,
      answer: isStageAnswer(r.answer) ? r.answer : null, note: r.note, answeredAt: r.answeredAt?.getTime() ?? null,
      answeredBy: r.answeredBy && names.has(r.answeredBy) ? givenName(names.get(r.answeredBy)!, clients.get(r.projectId)) : null, answeredById: r.answeredBy, doneAt: r.doneAt?.getTime() ?? null,
      clientNote: r.clientNote, resolved: r.resolvedNote && r.resolvedAt ? { note: r.resolvedNote, at: r.resolvedAt.getTime() } : null,
      resumeOn: r.resumeOn?.getTime() ?? null,
    })
  }
  return { byId, counts }
}

/* ── What the home, What needs you, the access panel and the waiting lines read (lib/portal/needs.ts `HomeFacts.schedule`) ──────── */

/** A stage waiting for the client's confirmation. */
export type HomeStageAsk = { id: string; projectId: string; title: string; finishedOn: number; askedAt: number }
export type HomeSchedule = {
  projectId: string
  /** The project has milestones (shared or not) — the home then never prints the project's own target end, which follows them live. */
  hasMilestones: boolean
  /** Where the work stands, from the newest share — null until the studio shares. */
  summary: ScheduleSummary | null
  toConfirm: HomeStageAsk[]
  /** Stages the client has answered "something is not right" on, still standing. */
  concerns: number
}

/** The schedule facts of each lead's live project, by lead id (a lead with no project has none). */
export async function loadScheduleFacts(leadIds: string[]): Promise<Map<string, HomeSchedule>> {
  const out = new Map<string, HomeSchedule>()
  if (!leadIds.length) return out
  const ps = await db.select({ id: projects.id, leadId: projects.leadId }).from(projects).where(and(inArray(projects.leadId, leadIds), isNull(projects.deletedAt)))
  if (!ps.length) return out
  const ids = ps.map((p) => p.id)
  const [shares, live] = await Promise.all([sharesOf(ids), liveStagesOf(ids)])
  for (const p of ps) {
    const newest = shares.get(p.id)?.[0] ?? null
    const rows = newest?.snapshot.rows ?? []
    const toConfirm: HomeStageAsk[] = []
    let concerns = 0
    for (const r of rows) {
      const l = live.byId.get(r.id)
      if (l && waitsForClient(r, l)) toConfirm.push({ id: r.id, projectId: p.id, title: r.title, finishedOn: l.doneAt ? dayOf(new Date(l.doneAt)) : dayOfIso(r.end) ?? 0, askedAt: l.askedAt ?? newest!.at })
      if (l && !l.deleted && l.answer === 'changes') concerns++
    }
    out.set(p.leadId, { projectId: p.id, hasMilestones: (live.counts.get(p.id) ?? 0) > 0, summary: newest ? summaryOf(newest.snapshot, newest.at, live.byId) : null, toConfirm, concerns })   // (simplify S-25) a Blocked stage reads paused on the home too
  }
  return out
}

/* ── The Schedule tab ────────────────────────────────────────────────────────────────────────────────────────────────────────── */

export type PortalScheduleHome = {
  homeId: string
  leadId: string
  projectId: string | null
  /** (gaps build D, item 4 — M-01) the project is on hold: the reason the studio gave the client, and the day it should resume */
  hold?: { reason: string; until: number | null } | null
  /** "Your home at SkyOasis @ Dawson" — the block's head when the client has more than one home. */
  title: string
  propertyType: string
  share: {
    at: number
    note: string | null
    /** The handover, as shared, and the one before it (the news line's "Handover is now …"). */
    handover: number | null
    handoverWas: number | null
    stages: PortalStage[]
    removed: { id: string; title: string }[]
    /** When the client last opened this tab (null = the first time) — the marks are what changed since. */
    lookedAt: number | null
  } | null
  /** (parity map, CP-062 · SC-087 — 1.0's rail) the moments beside the stages: the project started, each invoice sent (while Money is on) */
  events?: ScheduleEvent[]
}

const dayOfIsoOrNull = (s: string | null | undefined) => (s ? dayOfIso(s) : null)

/** Each of the visitor's homes with its schedule as last shared — a home with no project, or one not shared yet, says so. (gaps build D, item 4)
    `money`: the Money section is on for this visitor — the payment points ride on their stages. */
export async function fetchPortalSchedules(visitor: PortalVisitor, o: { money?: boolean } = {}): Promise<PortalScheduleHome[]> {
  const linkIds = visitor.links.map((l) => l.linkId)
  const leadIds = visitor.links.map((l) => l.leadId)
  if (!leadIds.length) return []
  const [linkRows, leadRows, ps] = await Promise.all([
    scheduleSeenOf(linkIds),   // (Projects round 9) the client's own link, or a household person's
    db.select({ id: leads.id, propertyType: leads.propertyType, propertyAddress: leads.propertyAddress, leadAddress: leads.leadAddress }).from(leads).where(inArray(leads.id, leadIds)),
    db.select({ id: projects.id, leadId: projects.leadId, name: projects.name, onHoldAt: projects.onHoldAt, onHoldReason: projects.onHoldReason, onHoldUntil: projects.onHoldUntil, stage: projects.stage, startedAt: projects.startedAt }).from(projects).where(and(inArray(projects.leadId, leadIds), isNull(projects.deletedAt))),
  ])
  const pids = ps.map((p) => p.id)
  const [shares, live, money, ties] = await Promise.all([
    sharesOf(pids), liveStagesOf(pids),
    /* (gaps build D, item 4 — 1.0 I-253) the payment points: each stage the client has on Money, on the milestone it is tied to */
    o.money && pids.length ? fetchPortalMoney(visitor.links.map((l) => ({ linkId: l.linkId, leadId: l.leadId })), Date.now(), visitor.homeownerId) : Promise.resolve([]),
    o.money && pids.length ? db.select({ id: projectMilestones.id, projectId: projectMilestones.projectId, paymentRef: projectMilestones.paymentRef }).from(projectMilestones).where(and(inArray(projectMilestones.projectId, pids), isNull(projectMilestones.deletedAt))) : Promise.resolve([]),
  ])
  const paysOf = (projectId: string): Map<string, StagePayment[]> => {
    const out = new Map<string, StagePayment[]>()
    const m = money.find((x) => x.projectId === projectId)
    if (!m) return out
    for (const st of m.stages) {
      const ms = ties.find((t) => t.projectId === projectId && t.paymentRef === st.key)
      if (!ms) continue
      out.set(ms.id, [...(out.get(ms.id) ?? []), { name: st.name, amountMinor: st.amountMinor, pct: st.pct, state: st.state, invoiceId: st.invoiceId, dueAt: st.dueAt }])
    }
    return out
  }
  /* (parity map, CP-062 · SC-087 — 1.0 E-238) the rail's moments: the day the project started, and each invoice sent (only while Money is on —
     the money list is empty otherwise), with its stage, amount and where it stands */
  const eventsOf = (p: { id: string; startedAt: Date | null }): ScheduleEvent[] => {
    const out: ScheduleEvent[] = []
    if (p.startedAt) out.push({ key: `started:${p.id}`, kind: 'started', day: dayOf(p.startedAt), title: 'Project started', line: dayLabel(dayOf(p.startedAt)) })
    for (const st of money.find((x) => x.projectId === p.id)?.stages ?? []) {
      if (!st.invoiceId || !st.sentAt || st.state === 'planned') continue
      const day = dayOf(new Date(st.sentAt))
      out.push({ key: `invoice:${st.invoiceId}`, kind: 'invoice', day, invoiceId: st.invoiceId, title: `Invoice ${st.number ?? clientStageName(st.name)} sent`,
        line: [dayLabel(day), clientStageName(st.name), money2(st.amountMinor), paymentState[st.state]].join(' · ') })
    }
    return out
  }
  return visitor.links.map((link): PortalScheduleHome => {
    const l = leadRows.find((x) => x.id === link.leadId)
    const p = ps.find((x) => x.leadId === link.leadId) ?? null
    const place = placeOf(l?.propertyAddress ?? l?.leadAddress)
    const title = place ? `Your home at ${place}` : p?.name ?? l?.propertyType ?? 'Your home'
    const list = p ? shares.get(p.id) ?? [] : []
    const newest = list[0] ?? null
    const h = p && p.stage !== 'completed' ? holdOf(p) : null
    const hold = h ? { reason: h.reason, until: h.until } : null   // (gaps build D, item 4)
    if (!p || !newest) return { homeId: link.linkId, leadId: link.leadId, projectId: p?.id ?? null, title, propertyType: l?.propertyType ?? '', share: null, hold }
    const seenAt = linkRows.find((x) => x.id === link.linkId)?.seenAt?.getTime() ?? null
    /* the share that stood when the client last looked: undefined = never looked (nothing is marked on a first look) */
    const seen = seenAt === null ? undefined : list.find((s) => s.at <= seenAt)?.snapshot ?? null
    const { stages: staged, removed } = portalStages(newest.snapshot, live.byId, seen, visitor.homeownerId)   // (fix-F, F-03) "You" only for the reader's own answer
    const pays = paysOf(p.id)
    const stages = staged.map((s) => (pays.has(s.id) ? { ...s, payments: pays.get(s.id) } : s))   // (gaps build D, item 4)
    return {
      homeId: link.linkId, leadId: link.leadId, projectId: p.id, title, propertyType: l?.propertyType ?? '', hold, events: eventsOf(p),
      share: { at: newest.at, note: newest.note, handover: dayOfIsoOrNull(newest.snapshot.handover), handoverWas: dayOfIsoOrNull(list[1]?.snapshot.handover), stages, removed, lookedAt: seenAt },
    }
  })
}

/** The stage a confirmation names, read for the action's checks: the visitor's own project, the newest share's row, the live milestone. */
export async function stageForAnswer(visitor: PortalVisitor, milestoneId: string) {
  const [m] = await db.select({ m: projectMilestones, leadId: projects.leadId, projectName: projects.name, projectDeleted: projects.deletedAt })
    .from(projectMilestones).innerJoin(projects, eq(projects.id, projectMilestones.projectId)).where(eq(projectMilestones.id, milestoneId)).limit(1)
  if (!m || m.projectDeleted) return null
  const home = visitor.links.find((l) => l.leadId === m.leadId)
  if (!home) return null   // another client's stage answers as not there — never why
  const newest = (await sharesOf([m.m.projectId])).get(m.m.projectId)?.[0] ?? null
  const row = newest?.snapshot.rows.find((r) => r.id === milestoneId) ?? null
  /* (fix-F, F-03) who answered, so a second press from someone else of the household is told by name */
  const by = m.m.confirmAnsweredBy ? (await liveStagesOf([m.m.projectId])).byId.get(m.m.id)?.answeredBy ?? null : null
  const live: LiveStage = {
    id: m.m.id, status: m.m.status, deleted: !!m.m.deletedAt, askedAt: m.m.confirmAskedAt?.getTime() ?? null,
    answer: isStageAnswer(m.m.confirmAnswer) ? m.m.confirmAnswer : null, note: m.m.confirmNote, answeredAt: m.m.confirmAnsweredAt?.getTime() ?? null,
    answeredBy: by, answeredById: m.m.confirmAnsweredBy, doneAt: m.m.doneAt?.getTime() ?? null,
  }
  return { milestone: m.m, leadId: m.leadId, projectName: m.projectName, home, row, live }
}
