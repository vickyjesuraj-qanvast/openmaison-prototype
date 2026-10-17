import 'server-only'
import { and, asc, desc, eq, gte, inArray, isNotNull, lt, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { billingCheckoutSessions, creditLedger, creditRequests, invoices, leads, meetings, members, notifications, projectRooms, projects, quotes, renderJobs, settings, studioCreditBalances, studioMemberCreditCaps, subscriptions } from '@/lib/db/schema'
import { aimLabel, meetingHref } from '@/lib/meetings/model'
import { AUTO_TOPUP_KEY, parseAutoTopUp, type AutoTopUp } from './auto-topup'
import { lockedOn } from './features'
import { gatingOff } from './plan-gate'
import { sessionMemberId } from '@/lib/db/session'
import { addMonths, BALANCE_ID, currentSubscription, ensurePeriod, usedSince } from './ledger'
import { allowanceFor, planRow, topupPrice, type BillingCycle, type PlanId } from './plans'
import { ledgerWords, poolStateOf, type CreditSummary, type SubscriptionStatus } from './model'
import { isActionKey, CREDIT_SCHEDULE, makesRenders } from './schedule'

import { ownerRole, trustedRole } from './policy'
import { opensWorkspace } from '@/lib/settings/roles'
export { ownerRole, trustedRole }

async function viewerRow() {
  const id = await sessionMemberId()
  const [m] = await db.select({ id: members.id, name: members.name, role: members.role }).from(members).where(eq(members.id, id))
  return m ?? { id, name: 'Dane', role: 'Owner' }
}

/** (S42 D-07) Where an upgrade ask points the Owner — and how its bell row is told from an ask for AI credits (`/company/plan?member=…`). */
export const UPGRADE_ASK_HREF = '/company/plan/billing'
/** (S42 D-07) When this member last asked the Owner to upgrade, while the studio is still on the plan it was asked from (the ask's record is
    its bell row; a plan change since answers it). */
export async function upgradeAskOf(memberId: string): Promise<number | null> {
  const sub = await currentSubscription()
  const [r] = await db.select({ at: notifications.createdAt }).from(notifications)
    .where(and(eq(notifications.kind, 'credit_request'), eq(notifications.actorId, memberId), eq(notifications.href, UPGRADE_ASK_HREF), gte(notifications.createdAt, sub?.createdAt ?? new Date(0))))
    .orderBy(desc(notifications.createdAt)).limit(1)
  return r ? r.at.getTime() : null
}

/** The one read every screen starts from — the rail, the card, Plans, the moments, the Company page (lib/credits/model.ts). */
export async function fetchCreditSummary(now = Date.now()): Promise<CreditSummary> {
  await ensurePeriod(now)
  const [me, sub, [bal], team] = await Promise.all([
    viewerRow(),
    currentSubscription(),
    db.select().from(studioCreditBalances).where(eq(studioCreditBalances.id, BALANCE_ID)),
    db.select({ id: members.id, name: members.name, role: members.role, isActive: members.isActive }).from(members),
  ])
  const trusted = trustedRole(me.role), owner = team.find((m) => m.role === 'Owner' && m.isActive !== false) ?? { id: 'dane', name: 'Dane' }
  const planId = (sub?.planId ?? 'free') as PlanId
  const plan = planRow(planId)
  const seats = sub?.seats ?? 1
  const allowance = allowanceFor(plan, seats)
  const periodStart = bal?.periodStart.getTime() ?? now
  const periodEnd = bal?.periodEnd.getTime() ?? addMonths(now, 1)
  const [memberUsed, studioUsed, [cap], asks, [mine], [autoRow], upgradeAsk] = await Promise.all([
    usedSince(periodStart, me.id),
    usedSince(periodStart),
    db.select().from(studioMemberCreditCaps).where(eq(studioMemberCreditCaps.memberId, me.id)),
    ownerRole(me.role) ? db.select({ n: sql<number>`count(*)` }).from(creditRequests).where(eq(creditRequests.status, 'open')).then((r) => Number(r[0]?.n ?? 0)) : Promise.resolve(0),
    db.select().from(creditRequests).where(and(eq(creditRequests.memberId, me.id), eq(creditRequests.status, 'open'))).orderBy(desc(creditRequests.createdAt)).limit(1),
    trusted ? db.select().from(settings).where(eq(settings.key, AUTO_TOPUP_KEY)) : Promise.resolve([]),
    ownerRole(me.role) ? Promise.resolve(null) : upgradeAskOf(me.id),
  ])
  const trialTaken = (await db.select({ id: subscriptions.id }).from(subscriptions).where(isNotNull(subscriptions.trialEndsAt)).limit(1)).length > 0
  const auto = parseAutoTopUp(autoRow?.value ?? null)
  const balance = bal ? bal.planCredits + bal.topupCredits : 0
  const memberCap = cap?.monthlyCap ?? null
  return {
    now,
    provisioned: !!bal,
    counting: bal ? bal.enforcementEnabled : false,
    countingFrom: bal?.enforcementStartsAt?.getTime() ?? null,
    planId,
    planName: plan.name,
    status: (sub?.status ?? 'active') as SubscriptionStatus,
    billingCycle: (sub?.billingCycle ?? 'monthly') as BillingCycle,
    seats,
    periodStart,
    periodEnd,
    trialEndsAt: sub?.status === 'trialing' ? sub.trialEndsAt?.getTime() ?? null : null,
    cancelAtPeriodEnd: !!sub?.cancelAtPeriodEnd,
    scheduledSeats: sub?.scheduledSeats ?? null,
    billingFrom: sub?.currentPeriodStart.getTime() ?? periodStart,
    billingTo: sub?.currentPeriodEnd.getTime() ?? periodEnd,
    autoTopUp: trusted && auto.on ? { below: auto.below, credits: auto.credits } : null,
    locked: gatingOff() ? [] : lockedOn(planId),
    trialOpen: !trialTaken,
    viewer: { id: me.id, name: me.name, role: me.role, trusted, canBuy: ownerRole(me.role), canSetAmounts: ownerRole(me.role), canChangePlan: ownerRole(me.role) },
    owner: { id: owner.id, name: owner.name },
    /* (parity map, FB-114) a seat is a member who uses the AI tools — Accounting keeps the books and has none, so takes no seat */
    activeMembers: team.filter((m) => m.isActive !== false && opensWorkspace(m.role)).length,
    balance: trusted ? balance : null,
    planCredits: trusted ? bal?.planCredits ?? 0 : null,
    topupCredits: trusted ? bal?.topupCredits ?? 0 : null,
    allowance: trusted ? allowance : null,
    usedThisPeriod: trusted ? studioUsed : null,
    graceUntil: trusted ? sub?.graceUntil?.getTime() ?? null : null,
    asks,
    poolState: bal ? poolStateOf({ balance, allowance, used: studioUsed, periodStart, periodEnd, now }) : 'ok',
    memberUsed,
    memberCap,
    memberCapRemaining: memberCap == null ? null : Math.max(0, memberCap - memberUsed),
    openAsk: mine ? { id: mine.id, kind: mine.kind as 'pool' | 'monthly', at: mine.createdAt.getTime() } : null,
    upgradeAsk: upgradeAsk ? { at: upgradeAsk } : null,
  }
}

/* ── Company › Plan & AI credits › Usage (REG-704) ─────────────────────────────────────────────────────────────────────────────── */

export type UsageRange = 'this' | 'last' | '3m' | '6m'
export const USAGE_RANGES: { key: UsageRange; label: string }[] = [{ key: 'this', label: 'This month' }, { key: 'last', label: 'Last month' }, { key: '3m', label: 'Last 3 months' }, { key: '6m', label: 'Last 6 months' }]
export const parseRange = (v: string | undefined): UsageRange => (v === 'last' || v === '3m' || v === '6m' ? v : 'this')

export type UsageMember = { id: string; name: string; role: string; color: string; used: number; renders: number; quotes: number; copilot: number; cap: number | null }
export type UsageTool = { key: string; label: string; times: number; credits: number }
export type UsageLead = { id: string; name: string; stage: string; renders: number; quotes: number; copilot: number; credits: number }
export type UsageRow = { id: string; at: number; words: string; reason: string; actionKey: string; forLabel: string | null; forHref: string | null; who: string | null; credits: number; balanceAfter: number }
export type Usage = { range: UsageRange; from: number; to: number; members: UsageMember[]; tools: UsageTool[]; leads: UsageLead[]; rows: UsageRow[]; refunded: number; wonWithRenders: number; leadsWithRenders: number; defaultAmount: number | null
  /** What the month before used, for "vs last month" — a one-month range only (this month · last month). */
  previous: number | null }

/** The window a range reads: the credit month (anchored on the plan's date, one date — B-09), the one before, or the last 3 / 6. */
export function rangeWindow(range: UsageRange, periodStart: number, periodEnd: number): { from: number; to: number } {
  if (range === 'last') return { from: addMonths(periodStart, -1), to: periodStart }
  if (range === '3m') return { from: addMonths(periodStart, -2), to: periodEnd }
  if (range === '6m') return { from: addMonths(periodStart, -5), to: periodEnd }
  return { from: periodStart, to: periodEnd }
}

/** Who a charge was for: a render's lead and room, a quote read's lead and number (integration B-27 — read through the ref, no lead column). */
async function refTargets(refs: string[]): Promise<Map<string, { leadId: string | null; label: string; href: string | null }>> {
  const out = new Map<string, { leadId: string | null; label: string; href: string | null }>()
  const jobIds = [...new Set(refs.filter((r) => r.startsWith('render:')).map((r) => r.slice(7).replace(/:refund$/, '')))]
  /* (pending modules S20) a drift repair, `repair:<job>:<n>`, is for the same job — its lead and room, opening its design */
  const repairRefs = refs.filter((r) => r.startsWith('repair:')).map((r) => r.replace(/:refund$/, ''))
  for (const r of repairRefs) { const j = r.split(':')[1]; if (j && !jobIds.includes(j)) jobIds.push(j) }
  const quoteIds = [...new Set(refs.filter((r) => r.startsWith('quote:')).map((r) => r.slice(6).replace(/:refund$/, '')))]
  if (jobIds.length) {
    const rows = await db.select({ id: renderJobs.id, leadId: renderJobs.leadId, room: projectRooms.name, designId: projectRooms.designId, lead: leads.name })
      .from(renderJobs).innerJoin(projectRooms, eq(projectRooms.id, renderJobs.roomId)).leftJoin(leads, eq(leads.id, renderJobs.leadId)).where(inArray(renderJobs.id, jobIds))
    for (const r of rows) {
      const t = { leadId: r.leadId, label: [r.lead, r.room].filter(Boolean).join(' · '), href: `/visualizer/${r.designId}` }
      out.set(`render:${r.id}`, t)
      for (const ref of repairRefs.filter((x) => x.startsWith(`repair:${r.id}:`))) out.set(ref, t)
    }
  }
  if (quoteIds.length) {
    const rows = await db.select({ id: quotes.id, number: quotes.number, leadId: quotes.leadId, lead: leads.name }).from(quotes).leftJoin(leads, eq(leads.id, quotes.leadId)).where(inArray(quotes.id, quoteIds))
    for (const r of rows) out.set(`quote:${r.id}`, { leadId: r.leadId, label: [r.lead, r.number].filter(Boolean).join(' · '), href: `/quotes/${r.id}` })
  }
  /* (pending modules S19 — one price for every quote read) a quote read into a project's schedule: `schedule:<project>:<read>` */
  const scheduleRefs = refs.filter((r) => r.startsWith('schedule:')).map((r) => r.replace(/:refund$/, ''))
  const projectIds = [...new Set(scheduleRefs.map((r) => r.split(':')[1] ?? '').filter(Boolean))]
  if (projectIds.length) {
    const rows = await db.select({ id: projects.id, number: projects.number, leadId: projects.leadId, lead: leads.name }).from(projects).leftJoin(leads, eq(leads.id, projects.leadId)).where(inArray(projects.id, projectIds))
    for (const r of rows) for (const ref of scheduleRefs.filter((x) => x.startsWith(`schedule:${r.id}:`))) out.set(ref, { leadId: r.leadId, label: [r.lead, r.number, 'Schedule'].filter(Boolean).join(' · '), href: `/projects/${r.id}/schedule` })
  }
  /* (pending modules S23 · S19, joined at the lanes' merge) a meeting's co-pilot time: `meeting:<meeting>:<block>` — the lead, the meeting's aim
     and its day, opening the meeting */
  const meetingRefs = refs.filter((r) => r.startsWith('meeting:')).map((r) => r.replace(/:refund$/, ''))
  const meetingIds = [...new Set(meetingRefs.map((r) => r.split(':')[1] ?? '').filter(Boolean))]
  if (meetingIds.length) {
    const rows = await db.select({ id: meetings.id, leadId: meetings.leadId, aim: meetings.aim, lead: leads.name }).from(meetings).leftJoin(leads, eq(leads.id, meetings.leadId)).where(inArray(meetings.id, meetingIds))
    for (const r of rows) for (const ref of meetingRefs.filter((x) => x.startsWith(`meeting:${r.id}:`))) out.set(ref, { leadId: r.leadId, label: [r.lead, aimLabel(r.aim)].filter(Boolean).join(' · '), href: meetingHref(r.id) })
  }
  return out
}

export async function fetchUsage(range: UsageRange, now = Date.now()): Promise<Usage> {
  await ensurePeriod(now)
  const me = await viewerRow()
  const trusted = trustedRole(me.role)
  const [bal] = await db.select().from(studioCreditBalances).where(eq(studioCreditBalances.id, BALANCE_ID))
  const ps = bal?.periodStart.getTime() ?? now, pe = bal?.periodEnd.getTime() ?? addMonths(now, 1)
  const { from, to } = rangeWindow(range, ps, pe)
  const where = and(gte(creditLedger.createdAt, new Date(from)), lt(creditLedger.createdAt, new Date(to)), ...(trusted ? [] : [eq(creditLedger.memberId, me.id)]))
  const [ledger, team, caps, [defaults]] = await Promise.all([
    db.select().from(creditLedger).where(where).orderBy(desc(creditLedger.createdAt), desc(creditLedger.balanceAfter)),
    db.select({ id: members.id, name: members.name, role: members.role, color: members.color, isActive: members.isActive }).from(members).orderBy(asc(members.name)),
    db.select().from(studioMemberCreditCaps),
    db.select().from(settings).where(eq(settings.key, 'credit_defaults')),
  ])
  const counted = ledger.filter((r) => r.reason === 'spend' || r.reason === 'refund')
  const targets = await refTargets(counted.map((r) => (r.refId ?? '').replace(/:refund$/, '')).filter(Boolean))
  const unit = (k: string) => (isActionKey(k) ? CREDIT_SCHEDULE[k].credits : 1)
  const versions = (r: { actionKey: string; credits: number }) => Math.max(1, Math.round(Math.abs(r.credits) / Math.max(1, unit(r.actionKey))))

  const byMember = new Map<string, UsageMember>()
  const rank: Record<string, number> = { Owner: 0, Admin: 1, Manager: 2, Designer: 3 }
  for (const m of team.filter((t) => t.isActive !== false || counted.some((r) => r.memberId === t.id))) {
    if (!trusted && m.id !== me.id) continue
    byMember.set(m.id, { id: m.id, name: m.name, role: m.role, color: m.color, used: 0, renders: 0, quotes: 0, copilot: 0, cap: caps.find((c) => c.memberId === m.id)?.monthlyCap ?? null })
  }
  const byTool = new Map<string, UsageTool>()
  const byLead = new Map<string, UsageLead>()
  let refunded = 0
  for (const r of counted) {
    const sign = r.reason === 'refund' ? -1 : 1
    const n = versions(r)
    const m = r.memberId ? byMember.get(r.memberId) : undefined
    if (m) { m.used += -r.credits; if (makesRenders(r.actionKey)) m.renders += sign * n; if (r.actionKey === 'quote_digitize') m.quotes += sign; if (r.actionKey === 'copilot_block') m.copilot += sign }   // (S23 · S19, joined at merge) a co-pilot block = 10 minutes
    const t = byTool.get(r.actionKey) ?? { key: r.actionKey, label: CREDIT_SCHEDULE[r.actionKey as keyof typeof CREDIT_SCHEDULE]?.label ?? r.actionKey, times: 0, credits: 0 }
    t.credits += -r.credits; if (r.reason === 'spend') t.times += 1; else refunded += r.credits
    byTool.set(r.actionKey, t)
    const tg = targets.get((r.refId ?? '').replace(/:refund$/, ''))
    if (trusted && tg?.leadId) {
      const l = byLead.get(tg.leadId) ?? { id: tg.leadId, name: '', stage: '', renders: 0, quotes: 0, copilot: 0, credits: 0 }
      l.credits += -r.credits; if (makesRenders(r.actionKey)) l.renders += sign * n; if (r.actionKey === 'quote_digitize') l.quotes += sign; if (r.actionKey === 'copilot_block') l.copilot += sign
      byLead.set(tg.leadId, l)
    }
  }
  if (byLead.size) {
    const ls = await db.select({ id: leads.id, name: leads.name, stage: leads.stage }).from(leads).where(inArray(leads.id, [...byLead.keys()]))
    for (const l of ls) { const x = byLead.get(l.id); if (x) { x.name = l.name; x.stage = l.stage } }
  }
  const leadList = [...byLead.values()].filter((l) => l.name).sort((a, b) => b.credits - a.credits)
  /* (E-15) the pay-off: how many of the leads with renders were won */
  const renderLeads = leadList.filter((l) => l.renders > 0)
  const whoName = new Map(team.map((m) => [m.id, m.name]))
  const rows: UsageRow[] = ledger.filter((r) => r.reason !== 'shadow_spend').map((r) => {
    const tg = targets.get((r.refId ?? '').replace(/:refund$/, ''))
    return { id: r.id, at: r.createdAt.getTime(), words: ledgerWords({ reason: r.reason, actionKey: r.actionKey, credits: r.credits, createdAt: r.createdAt.getTime() }), reason: r.reason, actionKey: r.actionKey, forLabel: tg?.label ?? null, forHref: tg?.href ?? null, who: r.memberId ? whoName.get(r.memberId) ?? 'Former member' : null, credits: r.credits, balanceAfter: r.balanceAfter }
  })
  const def = defaults ? (JSON.parse(defaults.value) as { monthlyAmount?: number | null }).monthlyAmount ?? null : null
  const previous = range === 'this' || range === 'last'
    ? await (async () => {
        const [p] = await db.select({ total: sql<number>`coalesce(sum(${creditLedger.credits}), 0)` }).from(creditLedger)
          .where(and(gte(creditLedger.createdAt, new Date(addMonths(from, -1))), lt(creditLedger.createdAt, new Date(from)), inArray(creditLedger.reason, ['spend', 'refund']), ...(trusted ? [] : [eq(creditLedger.memberId, me.id)])))
        return Math.max(0, -Number(p?.total ?? 0))
      })()
    : null
  return {
    previous,
    range, from, to,
    members: [...byMember.values()].sort((a, b) => (rank[a.role] ?? 9) - (rank[b.role] ?? 9) || a.name.localeCompare(b.name)),
    tools: [...byTool.values()].filter((t) => t.credits > 0 || t.times > 0).sort((a, b) => b.credits - a.credits),
    leads: leadList,
    rows,
    refunded,
    wonWithRenders: renderLeads.filter((l) => l.stage === 'Won').length,
    leadsWithRenders: renderLeads.length,
    defaultAmount: def,
  }
}

/* ── Company › Plan & AI credits › Plan & billing (REG-704) ──────────────────────────────────────────────────────────────────────── */

export type InvoiceRow = { id: string; number: string; forWhat: string; amount: number; issuedAt: number; periodStart: number; periodEnd: number; status: string }
export async function fetchInvoices(): Promise<InvoiceRow[]> {
  const me = await viewerRow()
  if (!trustedRole(me.role)) return []
  const rows = await db.select().from(invoices).orderBy(desc(invoices.issuedAt), desc(invoices.invoiceNumber))
  return rows.map((r) => ({ id: r.id, number: r.invoiceNumber, forWhat: r.planName, amount: r.amount, issuedAt: r.issuedAt.getTime(), periodStart: r.billingPeriodStart.getTime(), periodEnd: r.billingPeriodEnd.getTime(), status: r.status }))
}

/** (pending modules S19) The studio's auto top-up and what it has done this month — Plan & billing's card. Owners and Admins only. */
export async function fetchAutoTopUp(): Promise<{ setting: AutoTopUp; thisMonth: { times: number; credits: number; cents: number } } | null> {
  const me = await viewerRow()
  if (!trustedRole(me.role)) return null
  const [[row], [bal]] = await Promise.all([db.select().from(settings).where(eq(settings.key, AUTO_TOPUP_KEY)), db.select().from(studioCreditBalances).where(eq(studioCreditBalances.id, BALANCE_ID))])
  const done = bal ? await db.select({ credits: billingCheckoutSessions.creditsGranted }).from(billingCheckoutSessions)
    .where(and(eq(billingCheckoutSessions.kind, 'auto_topup'), eq(billingCheckoutSessions.status, 'completed'), gte(billingCheckoutSessions.createdAt, bal.periodStart))) : []
  const credits = done.reduce((n, d) => n + (d.credits ?? 0), 0)
  return { setting: parseAutoTopUp(row?.value ?? null), thisMonth: { times: done.length, credits, cents: topupPrice(credits) } }
}

/** The Owner's open asks (the bell's rows and the page's "n asks"). */
export async function fetchOpenAsks(): Promise<{ id: string; memberId: string; name: string; kind: 'pool' | 'monthly'; needed: number; at: number }[]> {
  const rows = await db.select({ id: creditRequests.id, memberId: creditRequests.memberId, name: members.name, kind: creditRequests.kind, needed: creditRequests.needed, at: creditRequests.createdAt })
    .from(creditRequests).innerJoin(members, eq(members.id, creditRequests.memberId)).where(eq(creditRequests.status, 'open')).orderBy(desc(creditRequests.createdAt))
  return rows.map((r) => ({ ...r, kind: r.kind as 'pool' | 'monthly', at: r.at.getTime() }))
}

/** What the shadow months would have used (Q-46's notice): the last full month of shadow rows. */
export async function shadowUsage(periodStart: number): Promise<number> {
  const [r] = await db.select({ total: sql<number>`coalesce(sum(${creditLedger.credits}), 0)` }).from(creditLedger)
    .where(and(eq(creditLedger.reason, 'shadow_spend'), gte(creditLedger.createdAt, new Date(addMonths(periodStart, -1)))))
  return Math.max(0, -Number(r?.total ?? 0))
}


