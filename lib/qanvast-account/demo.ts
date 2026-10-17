import 'server-only'
import { and, asc, eq, inArray, isNotNull, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leadAssignees, leadReturns, leads, meetings, memberPortfolioPictures, memberPortfolioProjects, members, projects, settings, stageLogs } from '@/lib/db/schema'
import type { ApiBusinessStatistics, ApiContract, ApiFeedbackStatistics, ApiLeadsCreditsPeriod, ApiReview, ApiReviewListingResponse, ApiStatsWithDiff, ApiTransaction, QanvastLinks } from './api'
import type { QanvastAccountService } from './service'

/*
 * (pending modules S41b-5) THE STAND-IN FOR QANVAST'S ACCOUNT API — calls nothing; answers 1.0's shapes (./api.ts) from the demo's own records,
 * so every figure on Qanvast Ops › Lead credits and Reviews is one the studio's pages can back (REG-343):
 *   · credits taken = the studio's Qanvast leads (source Qanvast, with Qanvast's id — a soft-deleted one too: Qanvast charged it), 200 each
 *     (REG-193's figure, the Leads tab's own column); a refund = a return Qanvast approved AND credited (lead_returns); a return approved but not
 *     yet credited is "on the way" (the Overview reads it from the studio's own return, not from here);
 *   · the contract that bought them starts nine days before the first Qanvast lead (the day R145's listing is dated by) — its money, credits,
 *     budget band and entitlements are Qanvast's facts, so they are samples;
 *   · the months: leads received, their budgets, credits used, and the Qanvast leads Won (none in the demo, so no closures);
 *   · the reviews: each completed project's client (a review four days after handover, by the project's own members), each designer's
 *     published work (its place, its pictures, its designer — sample homeowners), and three older samples; a reply is kept in the demo's
 *     store (settings `qanvast_demo_replies`) — 1.0 kept none of its own, Qanvast did;
 *   · the rank's factors read those reviews and the designers' published work; the rank, page views, board pins and Singapore's averages are
 *     samples; the homeowners' feedback is read by rule from the studio's Qanvast leads (a homeowner answers Qanvast's check-in a week after
 *     the lead unless the studio returned them as unreachable; their answers are the lead's own contact log, stage and meetings).
 * The pages say so: "Simulated on this prototype — …" (lib/services/registry.ts SIMULATED_WORDS.qanvastAccount).
 */

const DAY = 86_400_000
/** REG-193: what one Qanvast lead costs the demo studio — the Leads tab's own figure, now read from here. */
export const DEMO_CREDITS_PER_LEAD = 200
const CONTRACT = { id: '20714', sum: 3000, credits: 3000, free: 400, min: 50_000, max: 0, photoshoots: 1, posts: 2 }
/** Qanvast-only figures the demo can't back with records — said to be samples. */
const SAMPLE = { rank: 27, firms: 1186, pins: 214, pinsYear: 96, views: { profile: [412, 8], projects: [1036, -3], reviews: [188, 12] } as const, sgContact: 72, sgMeeting: 41, sgExperience: 7.8 }
export const REPLIES_KEY = 'qanvast_demo_replies'

const iso = (ms: number) => new Date(ms).toISOString()
const at10 = (ms: number) => { const d = new Date(ms); return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 10).getTime() }

type QLead = { id: string; ref: string; name: string; phone: string; budget: number; at: number; stage: string; deleted: boolean }
async function qanvastLeads(): Promise<QLead[]> {
  const rows = await db.select({ id: leads.id, ref: leads.qanvastLeadId, name: leads.name, phone: leads.phone, budget: leads.budgetMinor, at: leads.createdAt, stage: leads.stage, deletedAt: leads.deletedAt })
    .from(leads).where(and(eq(leads.source, 'Qanvast'), isNotNull(leads.qanvastLeadId))).orderBy(asc(leads.createdAt))
  return rows.map((r) => ({ id: r.id, ref: r.ref!, name: r.name, phone: r.phone, budget: Math.round(r.budget / 100), at: r.at.getTime(), stage: r.stage, deleted: !!r.deletedAt }))
}

/* ── the ledger ── */
type Tx = ApiTransaction & { at: number }
async function ledger(): Promise<{ txs: Tx[]; contract: ApiContract | null; qleads: QLead[] }> {
  const qleads = await qanvastLeads()
  if (!qleads.length) return { txs: [], contract: null, qleads }
  const start = at10(qleads[0]!.at - 9 * DAY)
  const contract: ApiContract = {
    id: CONTRACT.id, contractStart: iso(start), contractSum: CONTRACT.sum, credits: CONTRACT.credits, freeCredits: CONTRACT.free,
    budgetFilterMin: CONTRACT.min, budgetFilterMax: CONTRACT.max, photoshoots: CONTRACT.photoshoots, socialMediaPostings: CONTRACT.posts,
    entitlements: [{ type: 'Social Media Posting', accomplishmentTitle: 'A post about the studio on Qanvast’s Instagram', accomplishmentDate: iso(start + 40 * DAY) }],
  }
  const refunds = await db.select({ id: leadReturns.id, leadId: leadReturns.leadId, status: leadReturns.status, refund: leadReturns.refundStatus, credit: leadReturns.creditAmountMinor, repliedAt: leadReturns.repliedAt, returnedAt: leadReturns.returnedAt })
    .from(leadReturns).where(and(eq(leadReturns.status, 'approved'), inArray(leadReturns.leadId, qleads.map((l) => l.id))))
  let free = 0, paid = 0
  const txs: Tx[] = []
  const push = (t: Omit<Tx, 'newFreeBalance' | 'newPaidBalance' | 'createdAt'>) => txs.push({ ...t, createdAt: iso(t.at), newFreeBalance: free, newPaidBalance: paid })
  const events: { at: number; run: () => void }[] = [
    { at: start, run: () => { paid += CONTRACT.credits; push({ id: `tx-c-${CONTRACT.id}`, at: start, amount: CONTRACT.credits, contractId: CONTRACT.id, summary: `Credits from contract #${CONTRACT.id}` }) } },
    { at: start + 1, run: () => { free += CONTRACT.free; push({ id: `tx-f-${CONTRACT.id}`, at: start + 1, amount: CONTRACT.free, contractId: CONTRACT.id, summary: `Free credits with contract #${CONTRACT.id}` }) } },
    ...qleads.map((l) => ({ at: l.at, run: () => {
      const fromFree = Math.min(free, DEMO_CREDITS_PER_LEAD); free -= fromFree; paid -= DEMO_CREDITS_PER_LEAD - fromFree
      push({ id: `tx-l-${l.ref}`, at: l.at, amount: -DEMO_CREDITS_PER_LEAD, contractId: CONTRACT.id, lead: { budget: l.budget, offlineUserName: l.name, contact: l.phone, referenceId: l.ref } })
    } })),
    ...refunds.filter((r) => r.refund === 'credited').map((r) => {
      const l = qleads.find((x) => x.id === r.leadId)!
      const when = (r.repliedAt ?? r.returnedAt).getTime()
      const amount = r.credit ? Math.round(r.credit / 100) : DEMO_CREDITS_PER_LEAD
      return { at: when, run: () => { paid += amount; push({ id: `tx-r-${r.id}`, at: when, amount, contractId: CONTRACT.id, summary: `Refund for ${l.name}’s returned lead` }) } }
    }),
  ]
  for (const e of events.sort((a, b) => a.at - b.at)) e.run()
  return { txs, contract, qleads }
}

/* ── the reviews ── */
type DemoReview = ApiReview & { at: number; completedAt: number | null }
/** The designers' published work, as its homeowner reviewed it on Qanvast — sample homeowners, keyed by the work's title (repair R144). *(invented copy)* */
const WORK_REVIEWS: Record<string, { reviewer: string; rating: string; title: string; completed: string; at: string; text: string; reply?: { text: string; at: string } }> = {
  'A warm Scandinavian condo': { reviewer: 'Joanne Lim', rating: '5', title: 'Calm, warm and exactly us', completed: '2026-03-14', at: '2026-04-02',
    text: 'Michelle listened more than she talked at our first meeting, and it shows — the reading corner by the window is where we spend every evening now. The carpentry is tidy, the quote never moved, and nothing was rushed.',
    reply: { text: 'Thank you, Joanne — it was a joy to design a home around that window. Enjoy the reading corner!', at: '2026-04-03' } },
  'A calm 5-room in Tampines': { reviewer: 'Rizwan Hamid', rating: '5', title: 'A family of five with room to breathe', completed: '2026-06-20', at: '2026-07-06',
    text: 'We asked for less, not more, and Dane took that seriously. One long kitchen run, plaster walls and storage everywhere you don’t see it. The site was kept clean and we got an update with photos every week.',
    reply: { text: 'Thank you, Rizwan and Aliyah. Less was the brief, and you held us to it — enjoy the space.', at: '2026-07-07' } },
  'A penthouse kitchen that hides everything': { reviewer: 'Daniel Chua', rating: '4', title: 'Beautiful kitchen, a few weeks late', completed: '2025-11-28', at: '2025-12-15',
    text: 'The marble and brass storage is stunning and everything has its place. Handover slipped by three weeks while we waited for the stone, but Germaine told us why at every step and the finish was worth it.',
    reply: { text: 'Thank you for your patience while the stone came in, Daniel. We now order stone before demolition starts, so the wait is behind the scenes.', at: '2025-12-16' } },
  'A bright BTO for a young family': { reviewer: 'Melissa Tan', rating: '5', title: 'Practical and full of colour', completed: '2026-02-12', at: '2026-03-01',
    text: 'Sarah found storage in places we didn’t know we had, and the children’s room is their favourite place in the flat. Clear quote, clear schedule, no surprises.',
    reply: { text: 'Thank you, Melissa — say hi to the little ones for us!', at: '2026-03-02' } },
}
/** Older reviews from before the studio's records — samples. *(invented copy)* */
const OLDER_REVIEWS: { id: string; reviewer: string; rating: string; title: string; designer: string; completed: string; at: string; text: string; reply?: { text: string; at: string } }[] = [
  { id: 'rv-s-1', reviewer: 'Sean and Wen Hui', rating: '5', title: 'We would do it all again', designer: 'Michelle', completed: '2025-10-04', at: '2025-10-20',
    text: 'From the first site visit to the last touch-up, the team was honest about cost and time. Our resale flat feels new and it still feels like ours.',
    reply: { text: 'Thank you both — it was a pleasure. Do send us a photo when the plants grow in!', at: '2025-10-21' } },
  { id: 'rv-s-2', reviewer: 'Kenneth Ong', rating: '4', title: 'Good work, slow replies at times', designer: 'James', completed: '2025-08-10', at: '2025-09-02',
    text: 'The workmanship is good and the design came out as drawn. Replies were slow in the middle of the project, so we chased more than we should have — the last few weeks were much better.' },
  { id: 'rv-s-3', reviewer: 'Priyanka Rao', rating: '3', title: 'Lovely result, a rocky start', designer: 'Alex', completed: '2025-05-22', at: '2025-06-10',
    text: 'The finished flat is lovely. The start was rocky — the first schedule slipped and we had to ask twice for the revised quote. Once a site supervisor was on it, things moved.',
    reply: { text: 'Thank you for telling us, Priyanka. We now name a site supervisor at the first meeting, so nobody has to chase.', at: '2025-06-12' } },
]

type Replies = Record<string, { text: string; at: string }>
async function storedReplies(): Promise<Replies> {
  const [row] = await db.select().from(settings).where(eq(settings.key, REPLIES_KEY)).limit(1)
  if (!row) return {}
  try { const v = JSON.parse(row.value) as unknown; return v && typeof v === 'object' ? (v as Replies) : {} } catch { return {} }
}

async function demoReviews(now: number): Promise<DemoReview[]> {
  const [done, work, team, replies] = await Promise.all([
    db.select({ id: projects.id, leadId: projects.leadId, completedAt: projects.completedAt, client: leads.name, type: leads.propertyType })
      .from(projects).innerJoin(leads, eq(leads.id, projects.leadId)).where(and(isNotNull(projects.completedAt), isNull(projects.deletedAt), isNull(leads.deletedAt))),
    db.select({ id: memberPortfolioProjects.id, memberId: memberPortfolioProjects.memberId, title: memberPortfolioProjects.title, projectId: memberPortfolioProjects.projectId })
      .from(memberPortfolioProjects).where(isNull(memberPortfolioProjects.deletedAt)),
    db.select({ id: members.id, name: members.name }).from(members),
    storedReplies(),
  ])
  const nameOf = (id: string) => team.find((m) => m.id === id)?.name ?? null
  const out: DemoReview[] = []
  /* a completed project's client reviewed it four days after handover — by its own members (the review shows once that day has come) */
  const who = done.length ? await db.select({ leadId: leadAssignees.leadId, memberId: leadAssignees.memberId }).from(leadAssignees).where(inArray(leadAssignees.leadId, done.map((p) => p.leadId))) : []
  for (const p of done) {
    const when = at10(p.completedAt!.getTime() + 4 * DAY)
    if (when > now) continue
    const names = who.filter((w) => w.leadId === p.leadId).map((w) => nameOf(w.memberId)).filter((n): n is string => !!n)
    const designer = names.length ? names.join(' and ') : null
    out.push({ id: `rv-p-${p.id}`, title: `Our ${p.type} is finally home`, averageRating: '5', createdAt: iso(when), at: when, completedAt: p.completedAt!.getTime(), projectCompletionDate: iso(p.completedAt!.getTime()),
      designerName: designer ?? undefined, reviewer: { name: p.client },
      content: `${designer ? `${designer} and the team` : 'The team'} took us from the first visit to handover without fuss. Every change was explained before it was made, the site was kept clean, and the updates on the portal meant we never had to chase. We love coming home to it.` })
  }
  /* each designer's published work (not one that shows a project — that project's own client spoke above) */
  const pics = work.length ? await db.select({ id: memberPortfolioPictures.id, portfolioId: memberPortfolioPictures.portfolioId, caption: memberPortfolioPictures.caption, position: memberPortfolioPictures.position })
    .from(memberPortfolioPictures).where(and(inArray(memberPortfolioPictures.portfolioId, work.map((w) => w.id)), isNull(memberPortfolioPictures.deletedAt))).orderBy(asc(memberPortfolioPictures.position)) : []
  for (const w of work) {
    const r = WORK_REVIEWS[w.title]
    if (!r || w.projectId) continue
    const when = Date.parse(`${r.at}T10:00:00`)
    out.push({ id: `rv-w-${w.id}`, title: r.title, averageRating: r.rating, createdAt: iso(when), at: when, completedAt: Date.parse(`${r.completed}T10:00:00`), projectCompletionDate: iso(Date.parse(`${r.completed}T10:00:00`)),
      designerName: nameOf(w.memberId) ?? undefined, reviewer: { name: r.reviewer }, content: r.text,
      projectImages: pics.filter((p) => p.portfolioId === w.id).map((p) => ({ baseUrl: `/company/work/${p.id}`, caption: p.caption ?? undefined })),
      revieweeResponse: r.reply?.text ?? null, revieweeResponseCreatedAt: r.reply ? iso(Date.parse(`${r.reply.at}T10:00:00`)) : undefined })
  }
  for (const r of OLDER_REVIEWS) {
    const when = Date.parse(`${r.at}T10:00:00`)
    out.push({ id: r.id, title: r.title, averageRating: r.rating, createdAt: iso(when), at: when, completedAt: Date.parse(`${r.completed}T10:00:00`), projectCompletionDate: iso(Date.parse(`${r.completed}T10:00:00`)),
      designerName: r.designer, reviewer: { name: r.reviewer }, content: r.text, revieweeResponse: r.reply?.text ?? null, revieweeResponseCreatedAt: r.reply ? iso(Date.parse(`${r.reply.at}T10:00:00`)) : undefined })
  }
  /* the studio's replies the demo kept (posted here, not to Qanvast) */
  for (const r of out) { const kept = replies[String(r.id)]; if (kept) { r.revieweeResponse = kept.text; r.revieweeResponseCreatedAt = kept.at } }
  return out.sort((a, b) => b.at - a.at)
}

/* ── the homeowners' feedback, by rule from the studio's Qanvast leads ── */
async function demoFeedback(interval: 1 | 2 | 3, now: number): Promise<ApiFeedbackStatistics> {
  const days = interval === 3 ? 90 : interval === 2 ? 60 : 30
  const qleads = (await qanvastLeads()).filter((l) => !l.deleted && l.at >= now - days * DAY)
  const ids = qleads.map((l) => l.id)
  const [logs, rets, held] = ids.length ? await Promise.all([
    db.select({ leadId: stageLogs.leadId, from: stageLogs.fromStage, to: stageLogs.toStage, at: stageLogs.createdAt }).from(stageLogs).where(inArray(stageLogs.leadId, ids)).orderBy(asc(stageLogs.createdAt)),
    db.select({ leadId: leadReturns.leadId, status: leadReturns.status, reason: leadReturns.reason, at: leadReturns.returnedAt }).from(leadReturns).where(inArray(leadReturns.leadId, ids)).orderBy(asc(leadReturns.returnedAt)),
    db.select({ leadId: meetings.leadId }).from(meetings).where(and(inArray(meetings.leadId, ids), eq(meetings.status, 'held'))),
  ]) : [[], [], []]
  /* a homeowner answers Qanvast's check-in a week after the lead — unless the studio returned them as unreachable (a return still with Qanvast, or
     one Qanvast agreed with: Qanvast couldn't reach them either) */
  const unreachable = (id: string) => { const last = rets.filter((r) => r.leadId === id).pop(); return !!last && last.status !== 'rejected' && /no response|not contactable|unreachable/i.test(last.reason) }
  const answered = qleads.filter((l) => now - l.at >= 7 * DAY && !unreachable(l.id))
  const n = answered.length
  const part = (count: number): ApiStatsWithDiff => ({ current: { count, pct: n ? Math.round((count / n) * 100) : 0 } })
  let lt3 = 0, week = 0, later = 0, met = 0, noContact = 0, noDate = 0, partner = 0, portfolio = 0
  for (const l of answered) {
    const own = logs.filter((g) => g.leadId === l.id)
    const contact = own.find((g) => g.from === 'New')
    const d = contact ? (contact.at.getTime() - l.at) / DAY : Infinity
    if (d < 3) lt3++; else if (d <= 7) week++; else later++
    if (own.some((g) => ['Met', 'Quote Sent', 'Won'].includes(g.to)) || held.some((h) => h.leadId === l.id)) { met++; continue }
    /* why they haven't met, as the lead's own record says it: never contacted · on hold · lost · still talking (no date yet). "The designer
       didn't follow up" needs the homeowner's word — the records can't say it, so the stand-in never does */
    if (!contact) noContact++
    else if (l.stage === 'On Hold') partner++
    else if (l.stage === 'Lost') portfolio++
    else noDate++
  }
  return {
    responseCount: { current: { count: n } }, leadCount: { current: { count: qleads.length } },
    firstContactWithin7Days: part(lt3 + week), firstContactLessThan3Days: part(lt3), firstContactWithinAWeek: part(week), firstContactMoreThanAWeek: part(later),
    met: part(met), notMet: part(n - met),
    /* how the meeting went — a met homeowner rated it 8 (the demo has none met: shown as "-") */
    averageMeetingRating: met ? { current: { count: 8 } } : undefined, good: part(met), average: part(0), notGood: part(0),
    IDHasntContactedMe: part(noContact), IDDidNotFollowUp: part(0), haveYetToSetUpAMeetingDate: part(noDate), notKeenOnTheirPortfolio: part(portfolio),
    stillDiscussingWithMyPartner: part(partner), lackOfGoodReviews: part(0),
    professional: part(met), punctual: part(0), proposedGoodIdeas: part(met), slowResponse: part(0), lateForMeetings: part(0), lackOfGoodDesignIdeas: part(0),
    inexperiencedDesigner: part(0), poorAttitude: part(0), noShow: part(0),
    avgContactRating: SAMPLE.sgContact, avgResponseRating: SAMPLE.sgMeeting, avgExperienceScore: SAMPLE.sgExperience,
  }
}

const monthOf = (ms: number) => { const d = new Date(ms); return { y: d.getFullYear(), m: d.getMonth() + 1 } }
const sameMonth = (ms: number, y: number, m: number) => { const o = monthOf(ms); return o.y === y && o.m === m }

/** The stand-in itself — one object, every call reading the records at that moment. */
export const demoQanvastAccount: QanvastAccountService = {
  name: 'stand-in',
  async creditStatistics(): Promise<ApiLeadsCreditsPeriod[]> {
    const now = new Date()
    const { txs, qleads } = await ledger()
    const won = qleads.filter((l) => l.stage === 'Won')
    const wonLogs = won.length ? await db.select({ leadId: stageLogs.leadId, at: stageLogs.createdAt }).from(stageLogs).where(and(inArray(stageLogs.leadId, won.map((l) => l.id)), eq(stageLogs.toStage, 'Won'))) : []
    const values = won.length ? await db.select({ leadId: projects.leadId, value: projects.agreedValueMinor }).from(projects).where(inArray(projects.leadId, won.map((l) => l.id))) : []
    /* the last six months, this one included (1.0's chart showed six) */
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
      const y = d.getFullYear(), m = d.getMonth() + 1
      const got = qleads.filter((l) => sameMonth(l.at, y, m))
      const closed = wonLogs.filter((g) => sameMonth(g.at.getTime(), y, m))
      return {
        period: `${y} ${m}`, leads: got.length, budgets: got.reduce((s, l) => s + l.budget, 0),
        credits: txs.filter((t) => t.amount < 0 && t.lead && sameMonth(t.at, y, m)).reduce((s, t) => s - t.amount, 0),
        contractsClosed: closed.length, closedAmount: closed.reduce((s, g) => s + Math.round((values.find((v) => v.leadId === g.leadId)?.value ?? 0) / 100), 0),
      }
    })
  },
  async contracts() { const { contract } = await ledger(); return contract ? [contract] : [] },
  async transactions({ month, year }) {
    const { txs } = await ledger()
    const start = new Date(year, month - 1, 1).getTime()
    const prev = txs.filter((t) => t.at < start).pop()
    const within = txs.filter((t) => sameMonth(t.at, year, month))
    return (prev ? [prev, ...within] : within).map(({ at: _at, ...t }) => t)
  },
  async earliestTransaction() { const { txs } = await ledger(); return txs.slice(0, 1).map(({ at: _at, ...t }) => t) },
  async leadCredits(refs) {
    const { txs } = await ledger()
    const out: Record<string, number> = {}
    for (const t of txs) if (t.lead?.referenceId && refs.includes(t.lead.referenceId)) out[t.lead.referenceId] = (out[t.lead.referenceId] ?? 0) - t.amount
    return out
  },
  async reviews({ page, perPage }): Promise<ApiReviewListingResponse> {
    const all = await demoReviews(Date.now())
    const count = (s: number) => all.filter((r) => Math.round(Number(r.averageRating)) === s).length
    return {
      data: all.slice((page - 1) * perPage, page * perPage).map(({ at: _at, completedAt: _c, ...r }) => r), itemCount: all.length,
      overallAvgRating: all.length ? all.reduce((s, r) => s + Number(r.averageRating), 0) / all.length : 0,
      separateItemCount: { overallItemCount: all.length, '1-star': count(1), '2-star': count(2), '3-star': count(3), '4-star': count(4), '5-star': count(5) },
    }
  },
  async reply({ reviewId, text }) {
    const all = await demoReviews(Date.now())
    if (!all.some((r) => String(r.id) === reviewId)) return { error: 'That review isn’t on Qanvast any more' }
    const kept = await storedReplies()
    kept[reviewId] = { text, at: new Date().toISOString() }
    const value = JSON.stringify(kept)
    const updatedAt = new Date()
    await db.insert(settings).values({ key: REPLIES_KEY, value, updatedAt }).onConflictDoUpdate({ target: settings.key, set: { value, updatedAt } })
    return { ok: true }
  },
  async businessStatistics(): Promise<ApiBusinessStatistics> {
    const now = Date.now()
    const year = new Date(now).getFullYear()
    const [all, work] = await Promise.all([demoReviews(now), db.select({ createdAt: memberPortfolioProjects.createdAt }).from(memberPortfolioProjects).where(isNull(memberPortfolioProjects.deletedAt))])
    const recent = all.filter((r) => r.at >= now - 365 * DAY)
    const thisYear = all.filter((r) => r.completedAt !== null && new Date(r.completedAt).getFullYear() === year)
    const avg = (list: DemoReview[]) => (list.length ? list.reduce((s, r) => s + Number(r.averageRating), 0) / list.length : 0)
    return {
      rank: SAMPLE.rank, totalCompanies: SAMPLE.firms,
      reviews: { last12MonthsCount: recent.length, last12MonthsAverage: avg(recent), currentYearCount: thisYear.length, currentYearAverage: avg(thisYear) },
      totalProjects: work.length, currentYearProjects: work.filter((w) => w.createdAt.getFullYear() === year).length,
      totalBoardPins: SAMPLE.pins, currentYearBoardPins: SAMPLE.pinsYear,
      profileViews: { count: SAMPLE.views.profile[0], change: SAMPLE.views.profile[1] }, projectViews: { count: SAMPLE.views.projects[0], change: SAMPLE.views.projects[1] },
      reviewViews: { count: SAMPLE.views.reviews[0], change: SAMPLE.views.reviews[1] },
    }
  },
  async feedbackStatistics(interval) { return demoFeedback(interval, Date.now()) },
  links(): QanvastLinks {
    /* the demo studio has no Qanvast id: its own two addresses are on the reserved `.example` domain (REG-1910 — demo addresses say so) */
    return {
      writeReview: 'https://qanvast.example/sg/reviews/new?company=demo-studio',
      allReviews: 'https://qanvast.example/sg/reviews/company/demo-studio',
      listing: 'https://www.qanvast.com/sg/interior-designers-architects',
      supertrust: 'https://mailchi.mp/qanvast/supertrust-2026-announcement',
    }
  },
}
