import 'server-only'   // libSQL never reaches the browser: every client import of this module is `import type`
import { planAllowsNow } from '@/lib/credits/plan-gate'
import { and, asc, desc, eq, inArray, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { homeownerLeadLinks, leadAssignees, leadEvents, leadTasks, leads, members, projectMilestones, projectScheduleShares, projects, quoteItems, quotes, scheduleTemplateItems, scheduleTemplates, type Member, type Project, type ProjectMilestone } from '@/lib/db/schema'
import { projectMilestoneExtensions, projectMilestoneLinks, projectShareRequests, settings, taskAssignees } from '@/lib/db/schema'   // (gaps build, package C)
import { canOpenLead, fetchViewer } from '@/lib/leads/visibility'
import type { Viewer } from '@/lib/leads/assign-policy'
import { fetchStudio } from '@/lib/settings/queries'
import { titleCaseName } from '@/lib/format'
import { mayChangeProject, seesMoney } from './policy'
import { moneySummaryOf } from './money-queries'
import { currentPortalSlug } from '@/lib/portal/queries'
import { portalPath } from '@/lib/portal/model'
import {
  changeWords, clientRows, dayOf, dayOfIso, dayOfStored, deciderOf, isLate, isResolved, nextOpen, parseSnapshot, progressOf, rangeLabel, scheduleChanges,
  type ExtensionAsk, type Milestone, type PaymentOption, type ScheduleChange, type ScheduleFacts, type ScheduleSnapshot, type ShareAsk, type WaitingOn,
} from './schedule-model'
import { parseFollows, type TemplateItem } from './schedule-phases'
import type { ScheduleTemplateItem } from '@/lib/db/schema'
import { DEFAULT_SCHEDULE_RULES, SCHEDULE_RULES_KEY, TYPE_DEFAULTS_KEY, answersSchedule, parseScheduleRules, parseTypeDefaults, startPick, type ScheduleRules, type StartPick, type TypeDefaults } from './schedule-rules'
import { PRESETS_SEEDED_KEY, SCHEDULE_PRESETS, presetForProperty } from './schedule-presets'
import { INVOICE_STATE_LABEL, isApprovedVariation } from './money'
import { parseScope } from './model'   // (gaps build I)

/*
 * (Projects round 2 — the Schedule) The schedule on the server: a project's milestones as the model's `Milestone`, the last share (what the
 * client sees), the payment stages a milestone can be tied to, and the facts the listing, the Overview, attention and the bell read. Who sees a
 * schedule is its project's lead's rule (`canOpenLead`); payments follow `seesMoney` (F-17).
 */

const stamp = (d: Date | null | undefined) => (d ? dayOf(d) : null)
export function toMilestone(r: ProjectMilestone, tasks: { total: number; done: number } = { total: 0, done: 0 }, after: { id: string; gap: number }[] = []): Milestone {
  const status = r.status === 'in_progress' || r.status === 'blocked' || r.status === 'done' ? r.status : 'not_started'
  const on = r.waitingOn === 'client' || r.waitingOn === 'member' || r.waitingOn === 'supplier' ? (r.waitingOn as WaitingOn) : null
  return {
    id: r.id, title: r.title, position: r.position, start: dayOfStored(r.startDate), end: dayOfStored(r.endDate), status,   // (B-55) stored days, any server zone
    followsId: r.followsId, gap: r.gapDays, paymentRef: r.paymentRef, paymentDue: r.paymentDue === 'start' ? 'start' : 'end',
    clientVisible: r.clientVisible,
    confirm: { askedAt: stamp(r.confirmAskedAt), answer: r.confirmAnswer === 'confirmed' || r.confirmAnswer === 'changes' ? r.confirmAnswer : null, note: r.confirmNote, answeredAt: stamp(r.confirmAnsweredAt) },
    waiting: on ? { on, memberId: r.waitingMemberId, name: r.waitingName, note: r.waitingNote, since: stamp(r.waitingSince), until: stamp(r.waitingUntil) } : null,
    plan: r.planStartDate && r.planEndDate ? { start: dayOfStored(r.planStartDate), end: dayOfStored(r.planEndDate) } : null,
    doneAt: stamp(r.doneAt), tasks,
    /* (gaps build, package C) the further links, its words and colour, the real start, the answer to "not right", a Done waiting, a pause's line */
    after, description: r.description ?? null, color: r.color ?? null, startedAt: stamp(r.startedAt),
    resolved: r.resolvedNote && r.resolvedAt ? { note: r.resolvedNote, at: dayOf(r.resolvedAt) } : null,
    doneAsked: r.doneAskedAt ? { by: r.doneAskedBy, at: dayOf(r.doneAskedAt) } : null,
    clientNote: r.clientNote ?? null,
    resumeOn: r.resumeOn ? dayOfStored(r.resumeOn) : null,   // (parity map, CP-064) a stored day, as start / end are
  }
}

/** Every live milestone of these projects, in list order, with their tasks counted — (gaps build, package C — 6) and the further milestones
    each waits on (links to a deleted milestone are left out: it waits on what is still there). */
export async function milestonesOf(projectIds: string[]): Promise<Map<string, Milestone[]>> {
  const out = new Map<string, Milestone[]>()
  if (!projectIds.length) return out
  const rows = await db.select().from(projectMilestones).where(and(inArray(projectMilestones.projectId, projectIds), isNull(projectMilestones.deletedAt))).orderBy(asc(projectMilestones.position), asc(projectMilestones.createdAt))
  const ids = rows.map((r) => r.id)
  const [ts, links] = ids.length ? await Promise.all([
    db.select({ milestoneId: leadTasks.milestoneId, done: leadTasks.done }).from(leadTasks).where(inArray(leadTasks.milestoneId, ids)),
    db.select().from(projectMilestoneLinks).where(inArray(projectMilestoneLinks.milestoneId, ids)).orderBy(asc(projectMilestoneLinks.createdAt)),
  ]) : [[], []]
  const live = new Set(ids)
  for (const r of rows) {
    const mine = ts.filter((t) => t.milestoneId === r.id)
    const after = links.filter((l) => l.milestoneId === r.id && live.has(l.afterId) && l.afterId !== r.followsId).map((l) => ({ id: l.afterId, gap: l.gapDays }))
    const list = out.get(r.projectId) ?? []
    list.push(toMilestone(r, { total: mine.length, done: mine.filter((t) => t.done).length }, after))
    out.set(r.projectId, list)
  }
  return out
}

export type ShareRecord = { id: string; at: Date; by: string | null; note: string | null; snapshot: ScheduleSnapshot; changes: number }
/** The newest share of each project — what its client sees. */
export async function latestShares(projectIds: string[]): Promise<Map<string, ShareRecord>> {
  const out = new Map<string, ShareRecord>()
  if (!projectIds.length) return out
  const rows = await db.select().from(projectScheduleShares).where(inArray(projectScheduleShares.projectId, projectIds)).orderBy(desc(projectScheduleShares.sharedAt))
  for (const r of rows) {
    if (out.has(r.projectId)) continue
    const snapshot = parseSnapshot(r.snapshot)
    if (snapshot) out.set(r.projectId, { id: r.id, at: r.sharedAt, by: r.sharedBy, note: r.note, snapshot, changes: Array.isArray(r.changes) ? r.changes.length : 0 })
  }
  return out
}

/** Who a wait is on, in the words a row prints: the client's first name, the member's, the supplier's. */
export function waitingWho(m: Milestone, clientFirst: string, team: Pick<Member, 'id' | 'name'>[]): string | null {
  if (!m.waiting) return null
  if (m.waiting.on === 'client') return clientFirst
  if (m.waiting.on === 'member') return team.find((x) => x.id === m.waiting!.memberId)?.name.split(' ')[0] ?? 'a member'
  return m.waiting.name?.trim() || 'a supplier'
}
export const firstName = (name: string) => titleCaseName(name).split(/\s+/)[0] ?? name

/** The facts the listing, the Overview, attention and the bell read, per project. (gaps build, package C) `asks` = what waits on an Owner
    or an Admin: more time asked, a Done waiting, a share waiting. */
export function factsOf(list: Milestone[], share: ShareRecord | null, today: number, clientFirst: string, team: Pick<Member, 'id' | 'name'>[], asks: { more: string[]; share: boolean } = { more: [], share: false }): ScheduleFacts {
  const next = nextOpen(list, 1)[0] ?? null
  const waits = list.filter((m) => m.status !== 'done' && m.waiting).map((m) => ({ m, days: m.waiting!.since !== null ? Math.max(0, today - m.waiting!.since) : 0 }))
    .sort((a, b) => b.days - a.days)
  const w = waits[0]
  return {
    milestones: list.length,
    progress: progressOf(list),
    next: next ? { id: next.id, title: next.title, start: next.start, end: next.end, status: next.status, late: isLate(next, today), days: Math.abs(next.end - today) } : null,
    late: list.filter((m) => isLate(m, today)).length,
    waiting: w ? { who: waitingWho(w.m, clientFirst, team) ?? 'someone', days: w.days, onClient: w.m.waiting!.on === 'client', title: w.m.title, note: w.m.waiting!.note } : null,
    unshared: list.length ? scheduleChanges(clientRows(list), share?.snapshot ?? null).length : 0,
    shared: !!share,
    /* (Projects round 4b) the client's "something is not right", until the studio asks again, stops asking — (gaps build, package C — 9) or
       marks it resolved with a note to the client */
    concerns: (() => { const n = list.filter((m) => m.confirm.answer === 'changes' && !isResolved(m)).length; return n ? { who: clientFirst, n } : null })(),
    asks: (() => { const done = list.filter((m) => m.doneAsked && m.status !== 'done').map((m) => m.title); return asks.more.length || done.length || asks.share ? { more: asks.more, done, share: asks.share } : null })(),
  }
}

/** (gaps build, package C — 5 · 8) The open asks per project: the milestones more time is asked for (by name), and whether a share waits. */
export async function openAsksFor(projectIds: string[]): Promise<Map<string, { more: string[]; share: boolean }>> {
  const out = new Map<string, { more: string[]; share: boolean }>()
  if (!projectIds.length) return out
  const [ext, shr] = await Promise.all([
    db.select({ projectId: projectMilestoneExtensions.projectId, title: projectMilestones.title }).from(projectMilestoneExtensions).innerJoin(projectMilestones, eq(projectMilestones.id, projectMilestoneExtensions.milestoneId))
      .where(and(inArray(projectMilestoneExtensions.projectId, projectIds), eq(projectMilestoneExtensions.status, 'pending'), isNull(projectMilestones.deletedAt))),
    db.select({ projectId: projectShareRequests.projectId }).from(projectShareRequests).where(and(inArray(projectShareRequests.projectId, projectIds), eq(projectShareRequests.status, 'pending'))),
  ])
  for (const id of projectIds) out.set(id, { more: ext.filter((x) => x.projectId === id).map((x) => x.title), share: shr.some((x) => x.projectId === id) })
  return out
}

/** Schedule facts for many projects at once — the listing's loader and the Overview's. */
export async function scheduleFactsFor(rows: { projectId: string; clientName: string }[], now = Date.now()): Promise<Map<string, ScheduleFacts>> {
  const ids = rows.map((r) => r.projectId)
  const [ms, shares, team, asks] = await Promise.all([milestonesOf(ids), latestShares(ids), db.select({ id: members.id, name: members.name }).from(members), openAsksFor(ids)])
  const today = dayOf(new Date(now))
  return new Map(rows.map((r) => [r.projectId, factsOf(ms.get(r.projectId) ?? [], shares.get(r.projectId) ?? null, today, firstName(r.clientName), team, asks.get(r.projectId))]))
}

/** (Q-13) The payment stages a milestone can be tied to: the signed quote's Payment Schedule rows, else the direct project's agreed split.
    (B-08 · B-20 · B-23) Read through Money's one set of numbers (`moneySummaryOf`, lib/projects/money.ts): each stage's amount is its live
    invoice's, else its share of today's contract value (approved variation orders in); its invoice's state; whether it is due on signing. */
export async function paymentOptionsOf(p: Project): Promise<PaymentOption[]> {
  const m = await moneySummaryOf(p)
  return m.stages.map((s) => ({
    ref: s.ref, name: s.name, pct: s.pct, onSigning: s.onSigning, fixedMinor: s.fixedMinor ?? null,   // (S44O — row 297) a fixed fee first keeps its amount
    amountMinor: s.invoice ? s.invoice.amountMinor : m.baseMinor !== null ? s.nominalMinor : null,
    invoice: s.invoice && s.invoice.state !== 'draft' && s.invoice.state !== 'ready' && s.invoice.state !== 'awaiting'
      ? { state: s.invoice.state, dueDay: s.invoice.dueAt !== null ? dayOf(new Date(s.invoice.dueAt)) : null, toConfirmMinor: s.invoice.toConfirmMinor }   // (the calm UI build 2026-10-27, 3-23) the sum that waits — Money's own figure
      : null,
  }))
}

/* ── The Schedule tab ───────────────────────────────────────────────────────────────────────────────────────────────────────── */

export type ScheduleTask = { id: string; title: string; done: boolean; milestoneId: string | null
  /** (gaps build, package C — 11) what the milestone's panel edits in place: the due (ms), the description, the members, the outside person */
  dueAt?: number | null; description?: string | null; assignees?: string[]
  external?: { name: string; phone: string | null; kind: string | null; sentAt: number | null } | null }
export type ScheduleTemplateOption = { id: string; name: string; items: TemplateItem[]; /** (gaps build, package C — 3) a ready-made one */ presetKey?: string | null }
/** (gaps build, package C — 4) A quote a schedule can start from: the lead's quotes, signed first, then the newest — its stages of work
    (trades) and its sections, read here so the Start card draws what Create makes. */
export type QuoteSource = { id: string; number: string; title: string; status: string; lines: number; trades: string[]; sections: string[]; signed: boolean
  /** (gaps build I, I-Q13) each line's trade, name and section — what Maison AI's draft reads */ items?: { trade: string | null; name: string; section: string | null }[] }
/** (gaps build, package C — 14) A milestone's invoice, as Money names it. */
export type MilestoneInvoice = { id: string; number: string | null; stage: string; state: string; label: string; amountMinor: number; dueDay: number | null }
export type ScheduleData = {
  projectId: string
  leadId: string
  clientName: string
  clientFirst: string
  studioName: string
  stage: string
  mayChange: boolean
  /** (B-27) Save as a template only reads the schedule: the team, Owners and Admins may, a completed project's too (REG-1022). */
  mayTemplate: boolean
  /** (B-01) Whether the client can open the portal at all — invited and not withdrawn. A share without it reaches nobody yet. */
  portal: { live: boolean; withdrawn: boolean
    /** (B-53) For "Tell {client} on WhatsApp" after a share: their phone and the portal's address (a path; the page adds its origin). */
    phone: string | null; path: string | null }
  /** (B-12) For each milestone, the day (ms) of the first share that carried it as done — the day the client was first shown it finished. */
  doneShared: Record<string, number>
  /** null when the viewer may not see money (F-17): no payment chips, diamonds or stages. */
  payments: PaymentOption[] | null
  milestones: Milestone[]
  share: ShareRecord | null
  firstSharedAt: Date | null
  changes: ScheduleChange[]
  tasks: ScheduleTask[]
  team: Pick<Member, 'id' | 'name' | 'color' | 'role'>[]
  /** For Start (a project with no milestones yet): where the milestones can come from. */
  start: { quote: { id: string; number: string; trades: string[] } | null; templates: ScheduleTemplateOption[]; startDate: Date | null; payments: { name: string; pct: number; /** (S44O — row 297) a fixed fee first */ fixedMinor?: number | null }[]
    /** (Projects round 7) Settings › Projects › Schedule defaults: the template a new schedule starts from; null = the signed quote's stages */
    defaultTemplate?: string | null }
  decider: string | null
  now: number
  viewer: Viewer
  /* ── (gaps build, package C) ── */
  /** Settings › Projects › Schedule: the two approvals and the alerts' lead time. */
  rules?: ScheduleRules
  /** The viewer answers the schedule's asks (an Owner or an Admin). */
  answers?: boolean
  /** (5) Open asks for more time. */
  extensions?: ExtensionAsk[]
  /** (8) The open ask to share changes, when one waits. */
  shareAsk?: ShareAsk | null
  /** (14) Each milestone's invoices, by milestone id — empty for a viewer who may not see money (F-17). */
  invoices?: Record<string, MilestoneInvoice[]>
  /** (12) Each milestone's last three shares that changed it for the client: the day (ms) and the words Share changes printed. */
  shareHistory?: Record<string, { at: number; was?: string; now: string }[]>
  /** (4) The lead's quotes a schedule can start from — signed first, then the newest. */
  quotes?: QuoteSource[]
  /** (3) What Set up the schedule picks first, and why (the Start card's line): the project type's default, the studio's, the signed quote,
      the ready-made one for its property type, the first template. */
  preselect?: { pick: StartPick; reason: 'type' | 'studio' | 'property' | 'quote' | 'first' | 'blank' } | null
  /** (3) The project's property type and project type, for the Start card's line. */
  kind?: { propertyType: string | null; projectType: string | null }
  /** (gaps build I, I-Q13) the scope's rooms — Maison AI's draft reads them */
  scope?: string[]
  /** (simplify S-21, K-C's) the milestones whose wait a choice's share started — the choice's name, for the panel's "Set by sharing …" */
  shareWaits?: Record<string, string>
  /** (parity map, SC-094) the approved variation orders' days — the toolbar's "+n days from changes", the Move the schedule dialog */
  voDays?: VoDays
  /** (parity map, SC-056 · TD-022) the project's property type — the suggested tasks' rules read it (an HDB permit, an MCST's approval) */
  propertyType?: string | null
}

/** (Projects round 7) The default schedule template from Settings › Projects, when it is still in the library. */
async function defaultScheduleTemplate(templates: ScheduleTemplateOption[]): Promise<string | null> {
  const { fetchScheduleDefaults } = await import('./handover')
  const id = (await fetchScheduleDefaults()).templateId
  return id && templates.some((t) => t.id === id) ? id : null
}

export async function templateOptions(): Promise<ScheduleTemplateOption[]> {
  await ensureReadyMadeSchedules()   // (gaps build, package C — 3) every studio's library starts with them
  const [ts, items] = await Promise.all([
    db.select().from(scheduleTemplates).where(isNull(scheduleTemplates.deletedAt)).orderBy(asc(scheduleTemplates.createdAt)),
    db.select().from(scheduleTemplateItems).orderBy(asc(scheduleTemplateItems.position)),
  ])
  return ts.map((t) => ({ id: t.id, name: t.name, presetKey: t.presetKey ?? null, items: items.filter((i) => i.templateId === t.id).map(templateItemOf) }))
}
/** (parity map, SC-016) A stored template item as the schedule reads it — its words, its colour and its links by position too. */
export function templateItemOf(i: Pick<ScheduleTemplateItem, 'title' | 'days' | 'gapDays' | 'askConfirm' | 'description' | 'color' | 'followsJson'>): TemplateItem {
  const follows = parseFollows(i.followsJson)
  return { title: i.title, days: i.days, gap: i.gapDays, askConfirm: i.askConfirm, ...(i.description ? { description: i.description } : {}), ...(i.color ? { color: i.color } : {}), ...(follows ? { follows } : {}) }
}

/** (gaps build, package C — 3) The ready-made schedules (lib/projects/schedule-presets.ts), given to the studio's library once — fixed ids, so
    the demo's repair (R80) and a fresh studio write the same rows; the flag keeps one the studio deleted from coming back. */
export const presetTemplateId = (key: string) => `schedule-preset-${key}`
export async function ensureReadyMadeSchedules(): Promise<void> {
  const [flag] = await db.select({ key: settings.key }).from(settings).where(eq(settings.key, PRESETS_SEEDED_KEY)).limit(1)
  if (flag) return
  const now = new Date()
  for (const [i, p] of SCHEDULE_PRESETS.entries()) {
    const id = presetTemplateId(p.key)
    const at = new Date(now.getTime() + i)
    const made = await db.insert(scheduleTemplates).values({ id, name: p.name, presetKey: p.key, createdBy: null, updatedBy: null, createdAt: at, updatedAt: at }).onConflictDoNothing().returning({ id: scheduleTemplates.id })
    if (made.length) await db.insert(scheduleTemplateItems).values(p.items.map((it, k) => ({ id: `${id}-${k}`, templateId: id, position: k, title: it.title, days: it.days, gapDays: it.gap, askConfirm: it.askConfirm }))).onConflictDoNothing()
  }
  await db.insert(settings).values({ key: PRESETS_SEEDED_KEY, value: JSON.stringify({ at: now.getTime() }), updatedAt: now }).onConflictDoNothing()
}

/** The quote's trades, in the order its lines run — "From the signed quote" reads them (lib/projects/schedule-phases.ts). */
export async function quoteTrades(quoteId: string): Promise<string[]> {
  const rows = await db.select({ category: quoteItems.category, kind: quoteItems.kind }).from(quoteItems).where(eq(quoteItems.quoteId, quoteId)).orderBy(asc(quoteItems.position))
  return rows.filter((r) => r.kind !== 'group').map((r) => r.category ?? '').filter(Boolean)
}

/** (gaps build, package C — 4) The lead's quotes a schedule can start from (never a variation order — REG-1000): the signed one first, then the
    newest; each with its line count, its trades in line order and its top-level sections. */
export async function quoteSourcesOf(leadId: string, signedId: string | null): Promise<QuoteSource[]> {
  const qs = await db.select({ id: quotes.id, number: quotes.number, title: quotes.title, status: quotes.status, createdAt: quotes.createdAt }).from(quotes)
    .where(and(eq(quotes.leadId, leadId), eq(quotes.kind, 'quote'), isNull(quotes.deletedAt)))
  if (!qs.length) return []
  const items = await db.select({ id: quoteItems.id, quoteId: quoteItems.quoteId, kind: quoteItems.kind, name: quoteItems.name, category: quoteItems.category, parentId: quoteItems.parentId })
    .from(quoteItems).where(inArray(quoteItems.quoteId, qs.map((q) => q.id))).orderBy(asc(quoteItems.position))
  const signed = (q: { id: string; status: string }) => q.id === signedId || q.status === 'Signed'
  return qs.map((q) => {
    const mine = items.filter((i) => i.quoteId === q.id)
    const lines = mine.filter((i) => i.kind !== 'group')
    const groupName = new Map(mine.filter((i) => i.kind === 'group').map((i) => [i.id, i.name]))   // (gaps build I) a line's section, for Maison AI's draft
    return { id: q.id, number: q.number, title: q.title, status: q.status, lines: lines.length, signed: signed(q),
      trades: lines.map((i) => i.category ?? '').filter(Boolean), sections: mine.filter((i) => i.kind === 'group' && !i.parentId).map((i) => i.name).filter(Boolean),
      items: lines.slice(0, 400).map((i) => ({ trade: i.category ?? null, name: (i.name ?? '').slice(0, 120), section: i.parentId ? groupName.get(i.parentId) ?? null : null })),
      at: q.createdAt.getTime() }
  }).sort((a, b) => (a.id === signedId ? -1 : b.id === signedId ? 1 : 0) || Number(b.signed) - Number(a.signed) || b.at - a.at).map(({ at: _a, ...q }) => q)
}

/** (gaps build, package C — 8 · 15) Settings › Projects › Schedule. */
export async function fetchScheduleRules(): Promise<ScheduleRules> {
  const rules = await fetchScheduleRulesStored()   // (pending modules S19) a milestone's Done and a share wait for nobody on Free
  return (rules.completionApproval || rules.shareApproval) && !(await planAllowsNow('internal_approvals')) ? { ...rules, completionApproval: false, shareApproval: false } : rules
}
export async function fetchScheduleRulesStored(): Promise<ScheduleRules> {
  const [row] = await db.select().from(settings).where(eq(settings.key, SCHEDULE_RULES_KEY)).limit(1)
  if (!row) return DEFAULT_SCHEDULE_RULES
  try { return parseScheduleRules(JSON.parse(row.value)) } catch { return DEFAULT_SCHEDULE_RULES }
}
/** (gaps build, package C — 3) Settings › Projects › Schedule defaults, per project type. */
export async function fetchTypeDefaults(): Promise<TypeDefaults> {
  const [row] = await db.select().from(settings).where(eq(settings.key, TYPE_DEFAULTS_KEY)).limit(1)
  if (!row) return {}
  try { return parseTypeDefaults(JSON.parse(row.value)) } catch { return {} }
}

/** (gaps build, package C — 3) What Set up the schedule picks first, and why: the project type's default, the studio's, the signed quote, the
    ready-made schedule for the property type, the first template — `startPick`'s order. */
export async function preselectFor(p: Pick<Project, 'quoteId' | 'projectType'>, propertyType: string | null, templates: ScheduleTemplateOption[]): Promise<{ pick: StartPick; reason: 'type' | 'studio' | 'property' | 'quote' | 'first' | 'blank' }> {
  const { fetchScheduleDefaults } = await import('./handover')
  const [studio, byType] = await Promise.all([fetchScheduleDefaults(), fetchTypeDefaults()])
  const key = presetForProperty(propertyType, p.projectType)
  const presetTemplate = key ? templates.find((t) => t.presetKey === key)?.id ?? null : null
  const typeChoice = (p.projectType && byType[p.projectType]) || 'auto'
  const pick = startPick({ typeChoice, studioTemplate: studio.templateId, quoteId: p.quoteId, presetTemplate, templates: templates.map((t) => t.id) })
  const reason = pick.kind === 'blank' ? 'blank' : pick.kind === 'quote' ? 'quote'
    : typeChoice !== 'auto' && (pick.id === typeChoice || (typeChoice === 'property' && pick.id === presetTemplate)) ? 'type'
      : pick.id === studio.templateId ? 'studio' : pick.id === presetTemplate ? 'property' : 'first'
  return { pick, reason }
}

/** (gaps build, package C — 14) Each milestone's invoices, from Money's one set of numbers: an invoice is the milestone's when its payment stage
    is the one tied to the milestone. */
export function invoicesByMilestone(list: Milestone[], invoices: { id: string; number: string | null; stageRef: string; stageName: string; state: string; amountMinor: number; dueAt: number | null }[]): Record<string, MilestoneInvoice[]> {
  const out: Record<string, MilestoneInvoice[]> = {}
  for (const m of list) {
    if (!m.paymentRef) continue
    const mine = invoices.filter((i) => i.stageRef === m.paymentRef)
    if (mine.length) out[m.id] = mine.map((i) => ({ id: i.id, number: i.number, stage: i.stageName, state: i.state, label: (INVOICE_STATE_LABEL as Record<string, string>)[i.state] ?? i.state, amountMinor: i.amountMinor, dueDay: i.dueAt !== null ? dayOf(new Date(i.dueAt)) : null }))
  }
  return out
}

export async function fetchScheduleData(projectId: string): Promise<ScheduleData | null> {
  const viewer = await fetchViewer()
  const [row] = await db.select({ p: projects, l: leads }).from(projects).innerJoin(leads, eq(leads.id, projects.leadId))
    .where(and(eq(projects.id, projectId), isNull(projects.deletedAt), isNull(leads.deletedAt))).limit(1)
  if (!row) return null
  const { p, l } = row
  if (!(await canOpenLead(viewer, l.id))) return null
  const [teamIds, team, ms, shares, allShares, tasks, studio, templates, q, link] = await Promise.all([
    db.select({ memberId: leadAssignees.memberId }).from(leadAssignees).where(eq(leadAssignees.leadId, l.id)).then((r) => r.map((x) => x.memberId)),
    db.select({ id: members.id, name: members.name, color: members.color, role: members.role, isActive: members.isActive }).from(members),
    milestonesOf([p.id]),
    latestShares([p.id]),
    db.select({ at: projectScheduleShares.sharedAt, snapshot: projectScheduleShares.snapshot, changes: projectScheduleShares.changes }).from(projectScheduleShares).where(eq(projectScheduleShares.projectId, p.id)).orderBy(asc(projectScheduleShares.sharedAt)),
    db.select({ id: leadTasks.id, title: leadTasks.title, done: leadTasks.done, milestoneId: leadTasks.milestoneId, dueAt: leadTasks.dueAt, description: leadTasks.description,
      externalName: leadTasks.externalName, externalPhone: leadTasks.externalPhone, externalKind: leadTasks.externalKind, externalSentAt: leadTasks.externalSentAt }).from(leadTasks).where(eq(leadTasks.leadId, l.id)).orderBy(asc(leadTasks.createdAt)),
    fetchStudio(),
    templateOptions(),
    p.quoteId ? db.select({ id: quotes.id, number: quotes.number }).from(quotes).where(and(eq(quotes.id, p.quoteId), isNull(quotes.deletedAt))).limit(1) : Promise.resolve([]),
    db.select({ invitedAt: homeownerLeadLinks.invitedAt, withdrawnAt: homeownerLeadLinks.withdrawnAt }).from(homeownerLeadLinks).where(eq(homeownerLeadLinks.leadId, l.id)).limit(1),
  ])
  const list = ms.get(p.id) ?? []
  const share = shares.get(p.id) ?? null
  const money = seesMoney(viewer, teamIds)
  const summary = money ? await moneySummaryOf(p) : null   // (B-48) no money read for a viewer who may not see it
  const payments = money ? await paymentOptionsOf(p) : []
  const quote = q[0] ? { id: q[0].id, number: q[0].number, trades: await quoteTrades(q[0].id) } : null
  /* (B-12) the first share that carried each milestone as done */
  const doneShared: Record<string, number> = {}
  for (const s of allShares) for (const r of parseSnapshot(s.snapshot)?.rows ?? []) if (r.state === 'done' && doneShared[r.id] === undefined) doneShared[r.id] = s.at.getTime()
  /* ── (gaps build, package C) ── */
  const milestoneTaskIds = tasks.filter((t) => !!t.milestoneId).map((t) => t.id)
  const [rules, extRows, askRows, onTasks, quoteList] = await Promise.all([
    fetchScheduleRules(),
    db.select().from(projectMilestoneExtensions).where(and(eq(projectMilestoneExtensions.projectId, p.id), eq(projectMilestoneExtensions.status, 'pending'))).orderBy(asc(projectMilestoneExtensions.requestedAt)),
    db.select().from(projectShareRequests).where(and(eq(projectShareRequests.projectId, p.id), eq(projectShareRequests.status, 'pending'))).orderBy(desc(projectShareRequests.requestedAt)).limit(1),
    milestoneTaskIds.length ? db.select().from(taskAssignees).where(inArray(taskAssignees.taskId, milestoneTaskIds)) : Promise.resolve([]),
    quoteSourcesOf(l.id, p.quoteId),
  ])
  const nameOf = (id: string | null) => (id ? team.find((x) => x.id === id)?.name ?? 'A member' : 'A member')
  const liveIds = new Set(list.map((m) => m.id))
  const extensions: ExtensionAsk[] = extRows.filter((x) => liveIds.has(x.milestoneId)).map((x) => ({ id: x.id, milestoneId: x.milestoneId, fromEnd: dayOfStored(x.fromEnd), toEnd: dayOfStored(x.toEnd), reason: x.reason, by: x.requestedBy, byName: nameOf(x.requestedBy), at: x.requestedAt.getTime() }))
  const ask = askRows[0]
  const shareAsk: ShareAsk | null = ask ? { id: ask.id, milestoneIds: Array.isArray(ask.milestoneIds) ? (ask.milestoneIds as unknown[]).filter((x): x is string => typeof x === 'string') : [], note: ask.note, by: ask.requestedBy, byName: nameOf(ask.requestedBy), at: ask.requestedAt.getTime() } : null
  /* (12) the last three shares that changed each milestone for the client, newest first */
  const shareHistory: Record<string, { at: number; was?: string; now: string }[]> = {}
  for (const s of [...allShares].reverse()) {
    for (const c of (Array.isArray(s.changes) ? s.changes : []) as ScheduleChange[]) {
      if (!c || typeof c.id !== 'string') continue
      const h = (shareHistory[c.id] ??= [])
      if (h.length < 3) h.push({ at: s.at.getTime(), ...historyWords(c) })
    }
  }
  const preselect = await preselectFor(p, l.propertyType ?? null, templates)
  const { shareWaitsOf } = await import('./choices')   // (simplify S-21) K-C's rule for a wait a share started
  const shareWaits = await shareWaitsOf(p.id).catch(() => ({}))
  return {
    projectId: p.id, leadId: l.id, clientName: titleCaseName(l.name), clientFirst: firstName(l.name), studioName: studio.name,
    stage: p.stage, mayChange: mayChangeProject(viewer, teamIds) && p.stage !== 'completed',   // (Projects round 7, Q-24) a completed project's schedule reads only
    mayTemplate: mayChangeProject(viewer, teamIds),
    portal: { live: !!link[0]?.invitedAt && !link[0]?.withdrawnAt, withdrawn: !!link[0]?.withdrawnAt, phone: l.phone || null, path: portalPath(await currentPortalSlug(), 'schedule') },
    doneShared,
    payments: money ? payments : null,
    milestones: list, share, firstSharedAt: allShares[0]?.at ?? null,
    changes: list.length ? scheduleChanges(clientRows(list), share?.snapshot ?? null) : [],
    tasks: tasks.filter((t) => !!t.milestoneId).map((t) => ({
      id: t.id, title: t.title, done: t.done, milestoneId: t.milestoneId, dueAt: t.dueAt?.getTime() ?? null, description: t.description ?? null,
      assignees: onTasks.filter((a) => a.taskId === t.id).map((a) => a.memberId),
      external: t.externalName ? { name: t.externalName, phone: t.externalPhone ?? null, kind: t.externalKind ?? null, sentAt: t.externalSentAt?.getTime() ?? null } : null,
    })),
    team: team.filter((m) => m.isActive !== false).map(({ isActive: _a, ...m }) => m),
    /* (B-48) the Start card's payment line is money: only for a viewer who may see it (F-17) */
    start: { quote, templates, startDate: p.startDate, payments: payments.map((x) => ({ name: x.name, pct: x.pct, fixedMinor: x.fixedMinor ?? null })), defaultTemplate: await defaultScheduleTemplate(templates) },
    decider: deciderOf(list)?.id ?? null,
    now: Date.now(), viewer,
    rules, answers: answersSchedule(viewer.role), extensions, shareAsk,
    invoices: summary ? invoicesByMilestone(list, summary.invoices.map((i) => ({ id: i.id, number: i.number, stageRef: i.stageRef, stageName: i.stageName, state: i.state, amountMinor: i.amountMinor, dueAt: i.dueAt ?? null }))) : {},
    shareHistory, quotes: quoteList, preselect,
    kind: { propertyType: l.propertyType ?? null, projectType: p.projectType ?? null },
    scope: parseScope(p.scope),   // (gaps build I)
    shareWaits,
    voDays: (await voDaysOf([p.id])).get(p.id),   // (parity map, SC-094)
    propertyType: l.propertyType ?? null,   // (parity map, SC-056)
  }
}

/** (gaps build, package C — 12) A share's change to one milestone, as its history says it: "First shared · 21 – 28 Aug", the dates struck and
    new, "Taken off the schedule". */
function historyWords(c: ScheduleChange): { was?: string; now: string } {
  if (c.now && !c.was) { const s = dayOfIso(c.now.start), e = dayOfIso(c.now.end); return { now: s !== null && e !== null ? `First shared · ${rangeLabel(s, e)}` : 'First shared' } }
  return changeWords(c, null)
}

/* ── (parity map, SC-094 — 1.0's VO chips on the Gantt, "+S$1,200 (+3d)", E-253) A variation order's extra days ─────────────────────────────
   An order carries the days it adds (`quotes.timeline_days`, set in its General info); once the client approves it, the days count on the
   Schedule ("+3 days from changes") and, until someone moves the schedule for them or says Not now, the order waits as a Needs you row. The
   answer is a `parity_e_vo_days` line (moved · asked · not now) — never a flag on the order — so Activity keeps it and Undo takes it back. */
export type VoDayAsk = { id: string; number: string; title: string; days: number }
export type VoDays = {
  /** The approved orders' days, added up. */
  total: number
  /** Each approved order with days: its answer when one was given. */
  vos: (VoDayAsk & { answer: 'moved' | 'asked' | 'not_now' | null })[]
  /** The approved ones nobody has answered yet — the Needs you row, the Schedule's Move the schedule. */
  open: VoDayAsk[]
}
export const VO_DAYS_EVENT = 'parity_e_vo_days'
export async function voDaysOf(projectIds: string[]): Promise<Map<string, VoDays>> {
  const out = new Map<string, VoDays>()
  if (!projectIds.length) return out
  const [vos, answers] = await Promise.all([
    db.select({ id: quotes.id, projectId: quotes.projectId, number: quotes.number, title: quotes.title, status: quotes.status, days: quotes.timelineDays }).from(quotes)
      .where(and(inArray(quotes.projectId, projectIds), eq(quotes.kind, 'variation'), isNull(quotes.deletedAt))),
    db.select({ projectId: leadEvents.projectId, detail: leadEvents.detail, at: leadEvents.at }).from(leadEvents).where(and(inArray(leadEvents.projectId, projectIds), eq(leadEvents.kind, VO_DAYS_EVENT))).orderBy(asc(leadEvents.at)),
  ])
  const answered = new Map<string, 'moved' | 'asked' | 'not_now'>()
  for (const a of answers) {
    const d = (a.detail ?? {}) as { id?: unknown; answer?: unknown }
    if (typeof d.id === 'string' && (d.answer === 'moved' || d.answer === 'asked' || d.answer === 'not_now')) answered.set(d.id, d.answer)
  }
  for (const id of projectIds) {
    const mine = vos.filter((v) => v.projectId === id && isApprovedVariation(v.status) && (v.days ?? 0) > 0)
      .map((v) => ({ id: v.id, number: v.number, title: v.title, days: v.days!, answer: answered.get(v.id) ?? null }))
    out.set(id, { total: mine.reduce((s, v) => s + v.days, 0), vos: mine, open: mine.filter((v) => !v.answer).map(({ answer: _a, ...v }) => v) })
  }
  return out
}

/** A project's milestones for its Tasks tab (the Milestone column and filter) — none for a lead with no project. */
export async function milestoneOptionsOfLead(leadId: string): Promise<{ id: string; title: string }[]> {
  const [p] = await db.select({ id: projects.id }).from(projects).where(and(eq(projects.leadId, leadId), isNull(projects.deletedAt))).limit(1)
  if (!p) return []
  return (await milestonesOf([p.id])).get(p.id)?.map((m) => ({ id: m.id, title: m.title })) ?? []
}
