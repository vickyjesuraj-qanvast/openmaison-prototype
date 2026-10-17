import type { ApiBusinessStatistics, ApiContract, ApiFeedbackStatistics, ApiLeadsCreditsPeriod, ApiReviewListingResponse, ApiStatsWithDiff, ApiTransaction } from './api'

/*
 * (pending modules S41b-5 — the S41b data sweep's M-04; 1.0's `deployment/qanvast` branch, src/app/(main)/qanvast-ops/{credits,reviews}/_api.ts)
 * THE ONE MAPPER from Qanvast's answers (./api.ts) to what Qanvast Ops › Lead credits and Reviews show — 1.0's own rules, kept: a period read
 * as "2026 2" or "Feb 2026", the month's statement with the balance brought forward from the previous month's last transaction (Qanvast sends
 * it first), the total and the balance carried forward; entitlements counted from what was accomplished; a review's stars, its photos at
 * Qanvast's two sizes, its reply; the rank and its four factors; the homeowners' feedback with its three bars and the reasons sorted by count,
 * shown only from two answers up. Pure and client-safe: the pages' loaders (./queries.ts) and the probe read the same functions.
 */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const pad = (n: number) => String(n).padStart(2, '0')

/** A month as the address carries it: "2026-08". */
export const monthKey = (year: number, month: number) => `${year}-${pad(month)}`
export const monthKeyOf = (at: Date) => monthKey(at.getFullYear(), at.getMonth() + 1)
export const isMonthKey = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(v)
export const parseMonthKey = (k: string): { year: number; month: number } => ({ year: Number(k.slice(0, 4)), month: Number(k.slice(5, 7)) })
/** "Aug 2026" · "August 2026" */
export const monthShort = (k: string) => { const { year, month } = parseMonthKey(k); return `${MONTHS[month - 1]} ${year}` }
export const monthLong = (k: string) => { const { year, month } = parseMonthKey(k); return `${MONTHS_FULL[month - 1]} ${year}` }
const shiftMonth = (k: string, by: number) => { const { year, month } = parseMonthKey(k); const d = new Date(year, month - 1 + by, 1); return monthKeyOf(d) }

/** Credits as the studio reads them: "2,200" — cents only when Qanvast sends them ("12,856.50"). */
export const creditsText = (n: number) => n.toLocaleString('en-SG', { maximumFractionDigits: 2 })
/** "1 credit" · "200 credits" */
export const creditsWords = (n: number) => `${creditsText(n)} ${Math.abs(n) === 1 ? 'credit' : 'credits'}`
/** A budget in dollars as 1.0 wrote it — "50K", "1.2M". */
export const budgetK = (n: number) => (n >= 1_000_000 ? `${Math.round(n / 100_000) / 10}M` : `${Math.round(n / 1000)}K`)

/* ── Lead credits › Overview: the months ─────────────────────────────────────────────────────────────────────────────────────── */

export type CreditMonth = { key: string; label: string; leads: number; budget: number; credits: number; closures: number; closedAmount: number }

/** 1.0's `formatPeriod`: "2026 2" (year first) or "Feb 2026" / "2 2026" (month first) → the month's key. Null when it can't be read. */
export function periodKey(period: string): string | null {
  const parts = period.trim().split(/[\s/-]+/)
  if (parts.length < 2) return null
  const yearFirst = /^\d{4}$/.test(parts[0]!)
  const yr = Number(yearFirst ? parts[0] : parts[1])
  const mon = (yearFirst ? parts[1] : parts[0])!
  let m = Number(mon)
  if (!Number.isInteger(m)) m = MONTHS.findIndex((x) => x.toLowerCase() === mon.slice(0, 3).toLowerCase()) + 1
  return Number.isInteger(yr) && yr > 1900 && m >= 1 && m <= 12 ? monthKey(yr, m) : null
}

/** The months Qanvast counted, oldest first (a period that can't be read is left out — never guessed). */
export function creditMonths(raw: readonly ApiLeadsCreditsPeriod[]): CreditMonth[] {
  return raw.flatMap((p) => {
    const key = p && periodKey(String(p.period ?? ''))
    if (!key) return []
    const num = (v: unknown) => Number(v) || 0
    return [{ key, label: monthShort(key), leads: num(p.leads), budget: num(p.budgets), credits: num(p.credits ?? p.creditsUsed), closures: num(p.contractsClosed), closedAmount: num(p.closedAmount) }]
  }).sort((a, b) => a.key.localeCompare(b.key))
}

export type Closures = { contracts: number; leads: number; rate: number; sum: number; months: number }
/** "Closures in the last 6 months" — 1.0's three figures over the last six months Qanvast sent. The sum is the contracts' value (`closedAmount`);
    1.0 summed the leads' budgets under that name — fixed here, said in the outcome. */
export function closuresOf(months: readonly CreditMonth[]): Closures {
  const last = months.slice(-6)
  const contracts = last.reduce((s, m) => s + m.closures, 0)
  const leads = last.reduce((s, m) => s + m.leads, 0)
  return { contracts, leads, rate: leads ? Math.round((contracts / leads) * 1000) / 10 : 0, sum: last.reduce((s, m) => s + m.closedAmount, 0), months: last.length }
}

/* ── Lead credits › Transactions: one month's statement ───────────────────────────────────────────────────────────────────────── */

export type StatementLead = { name: string; contact: string; budget: number; ref: string | null }
export type StatementRow =
  | { kind: 'brought'; id: 'brought'; label: string; balance: number }
  | { kind: 'entry'; id: string; at: string; what: string; lead: StatementLead | null; contractId: string | null; minus: number | null; plus: number | null; balance: number }
  | { kind: 'total'; id: 'total'; label: string; minus: number; plus: number }
  | { kind: 'carried'; id: 'carried'; label: string; balance: number }
export type Statement = { month: string; rows: StatementRow[]; opening: number; closing: number; minus: number; plus: number; entries: number }

const balanceOfTx = (t: ApiTransaction) => (Number(t.newFreeBalance) || 0) + (Number(t.newPaidBalance) || 0)

/**
 * 1.0's `fetchTransactions`: Qanvast puts the previous month's last transaction first — its balance is the one brought forward, and it is not
 * shown; a month with nothing but that row reads as brought forward → carried forward. Debits are a lead's credits (or an adjustment),
 * credits a contract, free credits or a refund. Empty (no history at all) = no rows.
 */
export function statementOf(raw: readonly (ApiTransaction | null)[], key: string): Statement {
  const all = raw.filter((t): t is ApiTransaction => !!t && typeof t.createdAt === 'string')
  const empty: Statement = { month: key, rows: [], opening: 0, closing: 0, minus: 0, plus: 0, entries: 0 }
  if (!all.length) return empty
  const first = new Date(all[0]!.createdAt)
  const before = monthKeyOf(first) !== key
  const opening = before ? balanceOfTx(all[0]!) : 0
  const txs = before ? all.slice(1) : all
  let minus = 0, plus = 0
  const entries: StatementRow[] = txs.map((t) => {
    const amount = Number(t.amount) || 0
    const debit = amount < 0 ? Math.abs(amount) : null
    const credit = amount > 0 ? amount : null
    if (debit) minus += debit
    if (credit) plus += credit
    const lead: StatementLead | null = t.lead ? { name: String(t.lead.offlineUserName ?? '').trim() || 'A homeowner', contact: String(t.lead.contact ?? ''), budget: Number(t.lead.budget) || 0, ref: t.lead.referenceId ? String(t.lead.referenceId) : null } : null
    return { kind: 'entry', id: String(t.id), at: t.createdAt, what: lead ? 'New lead' : (t.summary?.trim() || (credit ? 'Credits added' : 'Credits taken')), lead, contractId: t.contractId ? String(t.contractId) : null, minus: debit, plus: credit, balance: balanceOfTx(t) }
  })
  const closing = txs.length ? balanceOfTx(txs[txs.length - 1]!) : opening
  const rows: StatementRow[] = [
    { kind: 'brought', id: 'brought', label: `Balance brought forward from ${monthLong(shiftMonth(key, -1))}`, balance: opening },
    ...entries,
    { kind: 'total', id: 'total', label: `Total for ${monthLong(key)}`, minus, plus },
    { kind: 'carried', id: 'carried', label: `Balance carried forward to ${monthLong(shiftMonth(key, 1))}`, balance: closing },
  ]
  return { month: key, rows, opening, closing, minus, plus, entries: entries.length }
}

/** The balance now — 1.0's `fetchCreditBalance`: the last balance this month's answer carries (the brought-forward row when the month is
    still empty), 0 with no history. */
export function balanceOf(raw: readonly (ApiTransaction | null)[]): number {
  const all = raw.filter((t): t is ApiTransaction => !!t)
  return all.length ? balanceOfTx(all[all.length - 1]!) : 0
}

/** The months a studio can open, newest first: this month back to the earliest transaction's (1.0: twelve when Qanvast doesn't say). */
export function monthOptions(earliest: string | null, now: Date): string[] {
  const end = monthKeyOf(now)
  const startDate = earliest ? new Date(earliest) : new Date(now.getFullYear(), now.getMonth() - 11, 1)
  const start = Number.isNaN(startDate.getTime()) ? shiftMonth(end, -11) : monthKeyOf(startDate)
  const out: string[] = []
  for (let k = end; k >= start && out.length < 120; k = shiftMonth(k, -1)) out.push(k)
  return out.length ? out : [end]
}

/* ── Lead credits › Contracts ─────────────────────────────────────────────────────────────────────────────────────────────────── */

export type Entitlement = { used: number; total: number }
export type ContractDone = { type: 'Photoshoot' | 'Social Media Posting'; title: string | null; at: string | null; link: string | null }
export type ContractRow = { id: string; number: string; start: string; amount: number; credits: number; freeCredits: number; budget: string; photoshoots: Entitlement; posts: Entitlement; done: ContractDone[] }

/** 1.0's "50K to 200K" — "S$50K and up" with no ceiling (1.0 wrote just "50K"). */
export function budgetRange(min: number, max: number): string {
  if (!min && !max) return 'Any budget'
  if (!max || max <= min) return `S$${budgetK(min)} and up`
  return `S$${budgetK(min)} to S$${budgetK(max)}`
}

/** 1.0's `fetchContracts`, newest first: each contract's money, credits, the leads' budget it buys and its entitlements — used = how many
    Qanvast recorded as done. */
export function contractRows(raw: readonly (ApiContract | null)[]): ContractRow[] {
  return raw.filter((c): c is ApiContract => !!c).map((c) => {
    const ents = c.entitlements ?? []
    return {
      id: String(c.id), number: `#${c.id}`, start: c.contractStart ?? '', amount: Number(c.contractSum) || 0, credits: Number(c.credits) || 0, freeCredits: Number(c.freeCredits) || 0,
      budget: budgetRange(Number(c.budgetFilterMin) || 0, Number(c.budgetFilterMax) || 0),
      photoshoots: { total: Number(c.photoshoots) || 0, used: ents.filter((e) => e.type === 'Photoshoot').length },
      posts: { total: Number(c.socialMediaPostings) || 0, used: ents.filter((e) => e.type === 'Social Media Posting').length },
      done: ents.map((e) => ({ type: e.type, title: e.accomplishmentTitle?.trim() || null, at: e.accomplishmentDate ?? null, link: e.accomplishmentLink && /^https?:\/\//.test(e.accomplishmentLink) ? e.accomplishmentLink : null })),
    }
  }).sort((a, b) => b.start.localeCompare(a.start))
}
/** "1 of 2 photoshoots" · "0 of 4 social media posts" — what a contract gives, as words; empty when it gives none. */
export function entitlementLines(c: Pick<ContractRow, 'photoshoots' | 'posts'>): string[] {
  const out: string[] = []
  if (c.photoshoots.total > 0) out.push(`${c.photoshoots.used} of ${c.photoshoots.total} ${c.photoshoots.total === 1 ? 'photoshoot' : 'photoshoots'} done`)
  if (c.posts.total > 0) out.push(`${c.posts.used} of ${c.posts.total} social media ${c.posts.total === 1 ? 'post' : 'posts'} done`)
  return out
}

/* ── Reviews ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────── */

export type ReviewPhoto = { thumb: string; full: string; caption: string | null }
export type Review = { id: string; title: string; rating: number; text: string; reviewer: string; at: string; completed: string | null; designer: string | null; photos: ReviewPhoto[]; response: string | null; respondedAt: string | null }
export type ReviewsList = { reviews: Review[]; total: number; average: number; stars: Record<1 | 2 | 3 | 4 | 5, number> }
export const STARS = [5, 4, 3, 2, 1] as const

const monthYear = (iso: string | undefined) => { if (!iso) return null; const d = new Date(iso); return Number.isNaN(d.getTime()) ? null : `${MONTHS[d.getMonth()]} ${d.getFullYear()}` }
/** Qanvast's pictures hang their sizes off the base address (`/Thumbnail`, `/Standard`); an address of the app's own is the picture itself. */
const sized = (base: string, size: 'Thumbnail' | 'Standard') => (base.startsWith('/') ? base : `${base.replace(/\/+$/, '')}/${size}`)

/** 1.0's `fetchReviews`: each review's words, stars, who wrote it, when the project was finished, the designer, its photos and the studio's reply;
    the stars' spread from Qanvast's own counts (counted from the page when it sends none). */
export function reviewsOf(raw: ApiReviewListingResponse): ReviewsList {
  const reviews: Review[] = (raw.data ?? []).map((r) => ({
    id: String(r.id),
    title: r.title?.trim() || 'Untitled review',
    rating: Math.max(0, Math.min(5, parseFloat(r.averageRating ?? '0') || 0)),
    text: r.content?.trim() || '',
    reviewer: r.reviewer?.name?.trim() || 'Anonymous',
    at: r.createdAt ?? '',
    completed: monthYear(r.projectCompletionDate),
    designer: r.designerName?.trim() || null,
    photos: (r.projectImages ?? []).filter((p) => !!p.baseUrl).map((p) => ({ thumb: sized(p.baseUrl!, 'Thumbnail'), full: sized(p.baseUrl!, 'Standard'), caption: p.caption ?? null })),
    response: r.revieweeResponse?.trim() || null,
    respondedAt: r.revieweeResponseCreatedAt ?? null,
  }))
  const stars = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  const s = raw.separateItemCount
  if (s) { stars[1] = s['1-star'] ?? 0; stars[2] = s['2-star'] ?? 0; stars[3] = s['3-star'] ?? 0; stars[4] = s['4-star'] ?? 0; stars[5] = s['5-star'] ?? 0 }
  else for (const r of reviews) { const n = Math.round(r.rating) as 1 | 2 | 3 | 4 | 5; if (n >= 1 && n <= 5) stars[n]++ }
  const total = raw.itemCount ?? reviews.length
  const average = raw.overallAvgRating ?? (reviews.length ? reviews.reduce((a, r) => a + r.rating, 0) / reviews.length : 0)
  return { reviews, total, average: Math.round(average * 10) / 10, stars }
}

/** (S42E, E-06) A person's name as Qanvast prints a reviewer's — case, spaces and punctuation aside — so "Shalini Menon" on a finished project
    meets "shalini  menon" on her review. */
export const reviewerKey = (name: string | null | undefined) => (name ?? '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, ' ').trim()
/** (S42E, E-06) When this person last reviewed the studio on Qanvast (the newest review under their name), or null — Request reviews says so in
    their row and leaves them unticked: nobody is asked twice by default. */
export function reviewedOn(reviews: readonly Pick<Review, 'reviewer' | 'at'>[], name: string): string | null {
  const k = reviewerKey(name)
  if (!k) return null
  const at = reviews.filter((r) => reviewerKey(r.reviewer) === k).map((r) => r.at).filter(Boolean).sort().at(-1)
  return at ?? null
}

export type ReviewSort = 'recent' | 'oldest' | 'highest' | 'lowest'
export type ReviewShow = 'all' | 'waiting' | 'answered'
/** 1.0's filters: one star count (whole stars, as its menu) and a sort; its "Responded / Unresponded" sorts are the Show chips here. */
export function shownReviews(list: readonly Review[], o: { stars: number | null; show: ReviewShow; sort: ReviewSort }): Review[] {
  const out = list.filter((r) => (o.stars === null || Math.floor(r.rating) === o.stars) && (o.show === 'all' || (o.show === 'waiting' ? !r.response : !!r.response)))
  const t = (r: Review) => new Date(r.at).getTime() || 0
  return out.sort((a, b) => o.sort === 'oldest' ? t(a) - t(b) : o.sort === 'highest' ? b.rating - a.rating || t(b) - t(a) : o.sort === 'lowest' ? a.rating - b.rating || t(b) - t(a) : t(b) - t(a))
}
/** A reply as long as 1.0 allowed. */
export const REPLY_MAX = 5000

/* ── Reviews › Ranking ────────────────────────────────────────────────────────────────────────────────────────────────────────── */

export type Factor = { count: number; year: number }
export type Ranking = {
  rank: number; firms: number
  reviews: Factor; rating: { average: number; year: number }; projects: Factor; pins: Factor
  views: { profile: { count: number; change: number }; projects: { count: number; change: number }; reviews: { count: number; change: number } }
  feedback: { responses: number; contactRate: number; meetingRate: number; experience: number | null }
}
const round1 = (v: number) => Math.round(v * 10) / 10
/** 1.0's `fetchRanking`: the rank among Qanvast's firms, the four factors over twelve months (and this year, by the project's completion), the
    week's page views with their change, and the homeowners' 30-day feedback (shown from two answers up). */
export function rankingOf(biz: ApiBusinessStatistics, fb: ApiFeedbackStatistics): Ranking {
  const n = (v: unknown) => Math.round(Number(v) || 0)
  return {
    rank: n(biz.rank), firms: n(biz.totalCompanies),
    reviews: { count: n(biz.reviews?.last12MonthsCount), year: n(biz.reviews?.currentYearCount) },
    rating: { average: round1(Number(biz.reviews?.last12MonthsAverage) || 0), year: round1(Number(biz.reviews?.currentYearAverage) || 0) },
    projects: { count: n(biz.totalProjects), year: n(biz.currentYearProjects) },
    pins: { count: n(biz.totalBoardPins), year: n(biz.currentYearBoardPins) },
    views: {
      profile: { count: n(biz.profileViews?.count), change: n(biz.profileViews?.change) },
      projects: { count: n(biz.projectViews?.count), change: n(biz.projectViews?.change) },
      reviews: { count: n(biz.reviewViews?.count), change: n(biz.reviewViews?.change) },
    },
    feedback: {
      responses: n(fb.responseCount?.current?.count),
      contactRate: n(fb.firstContactWithin7Days?.current?.pct),
      meetingRate: n(fb.met?.current?.pct),
      experience: fb.averageMeetingRating?.current?.count != null ? round1(Number(fb.averageMeetingRating.current.count)) : null,
    },
  }
}

/* ── Reviews › Feedback ───────────────────────────────────────────────────────────────────────────────────────────────────────── */

export const FEEDBACK_DAYS = [30, 60, 90] as const
export type FeedbackDays = (typeof FEEDBACK_DAYS)[number]
/** 1.0's `interval`: 1 · 2 · 3 = the last 30 · 60 · 90 days. */
export const intervalOf = (days: FeedbackDays): 1 | 2 | 3 => (days === 90 ? 3 : days === 60 ? 2 : 1)
export const isFeedbackDays = (v: unknown): v is FeedbackDays => FEEDBACK_DAYS.includes(Number(v) as FeedbackDays)
/** Below two answers 1.0 showed dashes — too few to say anything. */
export const ENOUGH_ANSWERS = 2

export type Tone = 'good' | 'warn' | 'bad'
export type FeedbackMetric = { key: string; label: string; count: number; pct: number; tone?: Tone }
export type Feedback = {
  days: FeedbackDays; responses: number; leads: number; enough: boolean
  contact: { value: number; average: number | null; parts: FeedbackMetric[] }
  meeting: { value: number; average: number | null; parts: FeedbackMetric[]; reasons: FeedbackMetric[] }
  experience: { value: number | null; average: number | null; parts: FeedbackMetric[]; reasons: FeedbackMetric[] }
}
const stat = (s: ApiStatsWithDiff | undefined) => ({ count: Math.round(Number(s?.current?.count) || 0), pct: Math.round(Number(s?.current?.pct) || 0) })
const byCount = (a: FeedbackMetric, b: FeedbackMetric) => b.count - a.count

/** 1.0's `fetchFeedbackInsights` — the three cards (contact within a week, met the designer, how the meeting went), each a bar of its parts and
    Qanvast's average in Singapore; the reasons sorted by how many gave them (a homeowner may give several). */
export function feedbackOf(raw: ApiFeedbackStatistics, days: FeedbackDays): Feedback {
  const responses = Math.round(Number(raw.responseCount?.current?.count) || 0)
  const nOrNull = (v: unknown) => (v == null || !Number.isFinite(Number(v)) ? null : Number(v))
  return {
    days, responses, leads: Math.round(Number(raw.leadCount?.current?.count) || 0), enough: responses >= ENOUGH_ANSWERS,
    contact: {
      value: Math.round(Number(raw.firstContactWithin7Days?.current?.pct) || 0), average: nOrNull(raw.avgContactRating),
      parts: [
        { key: 'lt3', label: 'In less than 3 days', ...stat(raw.firstContactLessThan3Days), tone: 'good' },
        { key: 'week', label: 'Within a week', ...stat(raw.firstContactWithinAWeek), tone: 'warn' },
        { key: 'later', label: 'After more than a week', ...stat(raw.firstContactMoreThanAWeek), tone: 'bad' },
      ],
    },
    meeting: {
      value: Math.round(Number(raw.met?.current?.pct) || 0), average: nOrNull(raw.avgResponseRating),
      parts: [
        { key: 'met', label: 'Met the designer', ...stat(raw.met), tone: 'good' },
        { key: 'notMet', label: 'Haven’t met yet', ...stat(raw.notMet), tone: 'bad' },
      ],
      reasons: [
        { key: 'noContact', label: 'The designer hasn’t contacted me', ...stat(raw.IDHasntContactedMe) },
        { key: 'noFollowUp', label: 'The designer didn’t follow up', ...stat(raw.IDDidNotFollowUp) },
        { key: 'noDate', label: 'We haven’t set a meeting date yet', ...stat(raw.haveYetToSetUpAMeetingDate) },
        { key: 'portfolio', label: 'Not keen on their portfolio', ...stat(raw.notKeenOnTheirPortfolio) },
        { key: 'partner', label: 'Still discussing with my partner', ...stat(raw.stillDiscussingWithMyPartner) },
        { key: 'reviews', label: 'Not enough good reviews', ...stat(raw.lackOfGoodReviews) },
      ].sort(byCount),
    },
    experience: {
      value: raw.averageMeetingRating?.current?.count != null ? round1(Number(raw.averageMeetingRating.current.count)) : null, average: nOrNull(raw.avgExperienceScore),
      parts: [
        { key: 'good', label: '8 to 10 — good', ...stat(raw.good), tone: 'good' },
        { key: 'average', label: '5 to 7 — average', ...stat(raw.average), tone: 'warn' },
        { key: 'notGood', label: '1 to 4 — not good', ...stat(raw.notGood), tone: 'bad' },
      ],
      reasons: ([
        { key: 'professional', label: 'Professional', ...stat(raw.professional), tone: 'good' },
        { key: 'punctual', label: 'Punctual', ...stat(raw.punctual), tone: 'good' },
        { key: 'ideas', label: 'Proposed good ideas', ...stat(raw.proposedGoodIdeas), tone: 'good' },
        { key: 'slow', label: 'Slow to respond', ...stat(raw.slowResponse), tone: 'bad' },
        { key: 'late', label: 'Late for meetings', ...stat(raw.lateForMeetings), tone: 'bad' },
        { key: 'noIdeas', label: 'Short of good design ideas', ...stat(raw.lackOfGoodDesignIdeas), tone: 'bad' },
        { key: 'inexperienced', label: 'Inexperienced designer', ...stat(raw.inexperiencedDesigner), tone: 'bad' },
        { key: 'attitude', label: 'Poor attitude', ...stat(raw.poorAttitude), tone: 'bad' },
        { key: 'noShow', label: 'Didn’t show up', ...stat(raw.noShow), tone: 'bad' },
      ] as FeedbackMetric[]).sort(byCount),
    },
  }
}
