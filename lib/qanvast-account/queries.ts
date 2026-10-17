import 'server-only'
import { and, desc, eq, inArray, isNotNull, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leadReturns, leads, projects } from '@/lib/db/schema'
import { fetchViewer, visibleLeadIds } from '@/lib/leads/visibility'
import { fetchStudio } from '@/lib/settings/queries'
import { shortStudioName } from '@/lib/settings/types'
import { displayDate, phoneDigits } from '@/lib/format'
import type { QanvastLinks } from './api'
import { askQanvast, qanvastAccountIsStandIn, type QanvastFailure } from './service'
import { seesQanvastCredits, seesQanvastReviews } from './policy'
import {
  balanceOf, closuresOf, contractRows, creditMonths, feedbackOf, intervalOf, isMonthKey, monthKeyOf, monthOptions, parseMonthKey, rankingOf, reviewedOn, reviewsOf, statementOf,
  type Closures, type ContractRow, type CreditMonth, type Feedback, type FeedbackDays, type Ranking, type ReviewsList, type Statement, type StatementRow,
} from './model'

/*
 * (pending modules S41b-5) Qanvast Ops › Lead credits and Reviews — each page's one read: the Owner's (1.0's rule, ./policy.ts) or the tabs' gate,
 * never a call to Qanvast for anyone else; Qanvast's answer through the seam (./service.ts) and the one mapper (./model.ts); the studio's own
 * records only where they are the studio's (a row's lead, a return Qanvast approved and hasn't credited yet, who to ask for a review).
 */

export type Gate = { gate: true }
export type Failed = { gate: false; error: string; standIn: boolean
  /** Qanvast answered 401 — the studio signs in to Qanvast again (1.0's rule) */ expired?: boolean }
const failed = (f: QanvastFailure): Failed => ({ gate: false, error: f.error, standIn: qanvastAccountIsStandIn(), ...(f.expired ? { expired: true } : {}) })

/* ── Lead credits ─────────────────────────────────────────────────────────────────────────────────────────────────────────────── */

export type OnTheWay = { credits: number; names: string[] }
export type CreditsOverview = { gate: false; view: 'overview'; standIn: boolean; now: number
  balance: number; months: CreditMonth[]; closures: Closures; thisMonth: string; onTheWay: OnTheWay; contracts: number }
/** A statement row with the studio's own lead it names, when this viewer may open it. */
export type StatementView = Omit<Statement, 'rows'> & { rows: (StatementRow & { leadId?: string | null })[] }
export type CreditsTransactions = { gate: false; view: 'transactions'; standIn: boolean; now: number; month: string; options: string[]; statement: StatementView
  /** the latest month that had any entry, when this one has none — the empty month's one door */ lastActive: string | null }
export type CreditsContracts = { gate: false; view: 'contracts'; standIn: boolean; now: number; contracts: ContractRow[] }
export type CreditsView = 'overview' | 'transactions' | 'contracts'
export type CreditsData = Gate | Failed | CreditsOverview | CreditsTransactions | CreditsContracts

/** Approved returns Qanvast hasn't credited yet — the studio's own record (lead_returns), said beside the balance. */
async function refundsOnTheWay(): Promise<OnTheWay> {
  const rows = await db.select({ name: leads.name, credit: leadReturns.creditAmountMinor, refund: leadReturns.refundStatus })
    .from(leadReturns).innerJoin(leads, eq(leads.id, leadReturns.leadId))
    .where(and(eq(leadReturns.status, 'approved'), eq(leads.source, 'Qanvast')))
  const waiting = rows.filter((r) => r.refund !== 'credited')
  return { credits: waiting.reduce((s, r) => s + (r.credit ? Math.round(r.credit / 100) : 0), 0), names: waiting.map((r) => r.name) }
}

export async function fetchLeadCredits(view: CreditsView, o: { month?: string | null; now?: number } = {}): Promise<CreditsData> {
  const viewer = await fetchViewer()
  if (!seesQanvastCredits(viewer.role)) return { gate: true }
  const now = o.now ?? Date.now()
  const standIn = qanvastAccountIsStandIn()
  const today = new Date(now)
  const here = monthKeyOf(today)
  if (view === 'contracts') {
    const r = await askQanvast('contracts', (s) => s.contracts())
    return 'error' in r ? failed(r) : { gate: false, view, standIn, now, contracts: contractRows(r.ok) }
  }
  if (view === 'transactions') {
    const first = await askQanvast('earliest transaction', (s) => s.earliestTransaction())
    if ('error' in first) return failed(first)
    const options = monthOptions(first.ok?.[0]?.createdAt ?? null, today)
    const month = o.month && isMonthKey(o.month) && options.includes(o.month) ? o.month : here
    const { year, month: m } = parseMonthKey(month)
    const r = await askQanvast('transactions', (s) => s.transactions({ month: m, year }))
    if ('error' in r) return failed(r)
    const statement = statementOf(r.ok, month)
    /* the empty month's door: the latest month Qanvast counted credits in (its statistics), when this one has none */
    let lastActive: string | null = null
    if (!statement.entries) {
      const stats = await askQanvast('statistics', (s) => s.creditStatistics())
      if (!('error' in stats)) lastActive = [...creditMonths(stats.ok)].reverse().find((x) => x.key !== month && x.key < month && (x.credits > 0 || x.leads > 0))?.key ?? null
    }
    return { gate: false, view, standIn, now, month, options, statement: await withLeads(statement, viewer), lastActive }
  }
  const [stats, balance, waiting, contracts] = await Promise.all([
    askQanvast('statistics', (s) => s.creditStatistics()),
    askQanvast('balance', (s) => s.transactions({ month: today.getMonth() + 1, year: today.getFullYear() })),
    refundsOnTheWay(),
    askQanvast('contracts', (s) => s.contracts()),
  ])
  if ('error' in stats) return failed(stats)
  if ('error' in balance) return failed(balance)
  const months = creditMonths(stats.ok)
  return { gate: false, view: 'overview', standIn, now, balance: balanceOf(balance.ok), months, closures: closuresOf(months), thisMonth: here, onTheWay: waiting, contracts: 'error' in contracts ? 0 : contracts.ok.length }
}

/** Each lead row names the studio's own lead — by Qanvast's id, else the client's phone — when this viewer may open it (Who sees leads). */
async function withLeads(st: Statement, viewer: Awaited<ReturnType<typeof fetchViewer>>): Promise<StatementView> {
  const named = st.rows.filter((r): r is Extract<StatementRow, { kind: 'entry' }> => r.kind === 'entry' && !!r.lead)
  if (!named.length) return st
  const refs = named.map((r) => r.lead!.ref).filter((x): x is string => !!x)
  const phones = named.map((r) => phoneDigits(r.lead!.contact)).filter((x) => x.length >= 8)
  const [byRef, byPhone, visible] = await Promise.all([
    refs.length ? db.select({ id: leads.id, ref: leads.qanvastLeadId }).from(leads).where(and(inArray(leads.qanvastLeadId, refs), isNull(leads.deletedAt))) : [],
    phones.length ? db.select({ id: leads.id, phone: leads.phone }).from(leads).where(and(eq(leads.source, 'Qanvast'), isNull(leads.deletedAt))) : [],
    visibleLeadIds(viewer),
  ])
  const may = (id: string | undefined) => (id && (!visible || visible.has(id)) ? id : null)
  return { ...st, rows: st.rows.map((r) => {
    if (r.kind !== 'entry' || !r.lead) return r
    const id = (r.lead.ref ? byRef.find((x) => x.ref === r.lead!.ref)?.id : undefined) ?? byPhone.find((x) => phoneDigits(x.phone).slice(-8) === phoneDigits(r.lead!.contact).slice(-8))?.id
    return { ...r, leadId: may(id) }
  }) }
}

/** (pending modules S41b-5) The credits on each Qanvast lead, by Qanvast's id — Qanvast Ops › Leads' Credits column reads the same answer the
    statement does. Null when Qanvast didn't answer (the column says "—"). Read for anyone who opens that tab, as its column always was. */
export async function creditsByQanvastLead(refs: string[]): Promise<Record<string, number> | null> {
  if (!refs.length) return {}
  const r = await askQanvast('lead credits', (s) => s.leadCredits(refs))
  return 'error' in r ? null : r.ok
}

/* ── Reviews ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────── */

/** Someone the studio can ask for a review: a finished project's client, or a lead — and (S42E, E-06) when they reviewed the studio, if they have. */
export type AskPerson = { id: string; name: string; phone: string | null; sub: string; reviewedAt: string | null }
export type ReviewsBase = { gate: false; standIn: boolean; now: number; links: QanvastLinks; waiting: number }
export type ReviewsPage = ReviewsBase & { view: 'reviews'; list: ReviewsList; studio: string; finished: AskPerson[]; leads: AskPerson[] }
export type RankingPage = ReviewsBase & { view: 'ranking'; ranking: Ranking; year: number }
export type FeedbackPage = ReviewsBase & { view: 'feedback'; feedback: Feedback }
export type ReviewsView = 'reviews' | 'ranking' | 'feedback'
export type ReviewsData = Gate | Failed | ReviewsPage | RankingPage | FeedbackPage

const PER_PAGE = 12
/** Every page of the studio's reviews (1.0 loaded twelve at a time with Load more and filtered what was loaded — 2.0 reads them all, so a
    filter finds every review; capped at 500). */
async function allReviews(): Promise<{ ok: ReviewsList } | QanvastFailure> {
  let list: ReviewsList | null = null
  for (let page = 1; page <= 42; page++) {
    const r = await askQanvast('reviews', (s) => s.reviews({ page, perPage: PER_PAGE }))
    if ('error' in r) return r
    const got = reviewsOf(r.ok)
    list = list ? { ...got, reviews: [...list.reviews, ...got.reviews] } : got
    if (!r.ok.data?.length || list.reviews.length >= got.total) break
  }
  return { ok: list! }
}

/** Who Request reviews offers: each finished project's client (1.0's "All Closed Projects", ticked) and every lead the viewer sees (1.0's
    "Select Leads"); a phone that can't take a WhatsApp is null, and the dialog says so. */
async function askPeople(viewer: Awaited<ReturnType<typeof fetchViewer>>, reviews: ReviewsList['reviews']): Promise<{ finished: AskPerson[]; leads: AskPerson[] }> {
  const [done, all, visible] = await Promise.all([
    db.select({ id: projects.id, number: projects.number, name: projects.name, client: leads.name, phone: leads.phone, at: projects.completedAt })
      .from(projects).innerJoin(leads, eq(leads.id, projects.leadId)).where(and(isNotNull(projects.completedAt), isNull(projects.deletedAt), isNull(leads.deletedAt))).orderBy(desc(projects.completedAt)),
    db.select({ id: leads.id, name: leads.name, phone: leads.phone, stage: leads.stage, type: leads.propertyType }).from(leads).where(and(isNull(leads.deletedAt), eq(leads.direct, false))).orderBy(desc(leads.createdAt)),
    visibleLeadIds(viewer),
  ])
  const phone = (p: string | null) => { const d = phoneDigits(p); return d.length >= 8 ? d : null }
  return {
    finished: done.map((p) => ({ id: `p:${p.id}`, name: p.client, phone: phone(p.phone), sub: `${p.number} · handed over ${displayDate(p.at!)}`, reviewedAt: reviewedOn(reviews, p.client) })),
    leads: all.filter((l) => !visible || visible.has(l.id)).map((l) => ({ id: `l:${l.id}`, name: l.name, phone: phone(l.phone), sub: `${l.stage} · ${l.type}`, reviewedAt: reviewedOn(reviews, l.name) })),
  }
}

export async function fetchQanvastReviews(view: ReviewsView, o: { days?: FeedbackDays; now?: number } = {}): Promise<ReviewsData> {
  const viewer = await fetchViewer()
  if (!seesQanvastReviews(viewer.role)) return { gate: true }   // (S42E, call E·2) Owners and Admins
  const now = o.now ?? Date.now()
  const standIn = qanvastAccountIsStandIn()
  const links = await askQanvast('links', async (s) => s.links())
  if ('error' in links) return failed(links)
  /* how many wait for a reply — read on every view (the Reviews view's *Waiting for a reply · n* counts it; S42E E-16 took it off the view chip) */
  const list = await allReviews()
  if ('error' in list) return failed(list)
  const base: ReviewsBase = { gate: false, standIn, now, links: links.ok, waiting: list.ok.reviews.filter((r) => !r.response).length }
  if (view === 'ranking') {
    const [biz, fb] = await Promise.all([askQanvast('business statistics', (s) => s.businessStatistics()), askQanvast('feedback', (s) => s.feedbackStatistics(1))])
    if ('error' in biz) return failed(biz)
    if ('error' in fb) return failed(fb)
    return { ...base, view, ranking: rankingOf(biz.ok, fb.ok), year: new Date(now).getFullYear() }
  }
  if (view === 'feedback') {
    const days = o.days ?? 30
    const fb = await askQanvast('feedback', (s) => s.feedbackStatistics(intervalOf(days)))
    return 'error' in fb ? failed(fb) : { ...base, view, feedback: feedbackOf(fb.ok, days) }
  }
  const [people, studio] = await Promise.all([askPeople(viewer, list.ok.reviews), fetchStudio()])
  return { ...base, view: 'reviews', list: list.ok, studio: shortStudioName(studio.name || '') || 'our studio', ...people }
}
