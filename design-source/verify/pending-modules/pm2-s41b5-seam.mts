/*
 * (pending modules S41b-5) The seam, proved in one Node process — the half of verify-pm2-s41b5.cjs a running server can't show: Qanvast's
 * account API swapped for a stub that answers 1.0's own JSON (exactly as lib/services/install.ts would plug a real adapter in), the pages'
 * loaders read through the one mapper, the reply sent through it, a Qanvast that throws said as "Qanvast didn't answer", the Owner-only rule
 * (no call made for anyone else), and the stand-in put back. Run by the probe on a COPY of its scratch database:
 *   DATABASE_URL=file:<copy> npx tsx --conditions=react-server design-source/verify/pending-modules/pm2-s41b5-seam.mts
 * Prints one JSON line per check ({ ok, label }) and a last line { done, pass, fail }; exits 1 on any failure. Refuses local.db.
 */
const url = process.env.DATABASE_URL ?? ''
if (!url.startsWith('file:') || /(^|\/)local\.db$/.test(url.slice(5))) { console.log(JSON.stringify({ ok: false, label: 'refuses to run without a scratch DATABASE_URL (never local.db)' })); process.exit(1) }

let pass = 0, fail = 0
const ok = (cond: unknown, label: string, extra?: unknown) => { if (cond) pass++; else fail++; console.log(JSON.stringify({ ok: !!cond, label, ...(cond ? {} : { extra }) })) }
const step = async (label: string, fn: () => Promise<void>) => { try { await fn() } catch (e) { ok(false, `${label} — threw`, e instanceof Error ? e.stack?.split('\n').slice(0, 4).join(' | ') : String(e)) } }

const { client } = await import('@/lib/db')
const svc = await import('@/lib/qanvast-account/service')
const q = await import('@/lib/qanvast-account/queries')
const m = await import('@/lib/qanvast-account/model')
const policy = await import('@/lib/qanvast-account/policy')
const { creditsByQanvastLead } = q
const { fetchQanvastLeads } = await import('@/lib/leads/qanvast')
const slots = await import('@/lib/services/slots')
const { SERVICES } = await import('@/lib/services/registry')
const actions = await import('@/app/qanvast-ops/account-actions')
const as = (id: string) => client.execute({ sql: `UPDATE members SET is_you = (id = ?)`, args: [id] })
const NOW = Date.parse('2026-10-14T10:00:00+08:00')

/* ── 1. the pure mapper, 1.0's own rules ── */
await step('model', async () => {
  ok(m.periodKey('2026 2') === '2026-02' && m.periodKey('Feb 2026') === '2026-02' && m.periodKey('2 2026') === '2026-02' && m.periodKey('nonsense') === null, '1.0’s periods read both ways ("2026 2" · "Feb 2026"), a nonsense one left out')
  ok(m.budgetRange(50_000, 0) === 'S$50K and up' && m.budgetRange(30_000, 200_000) === 'S$30K to S$200K' && m.budgetRange(0, 0) === 'Any budget', 'a contract’s budget band in words')
  const opts = m.monthOptions('2026-07-14T02:00:00Z', new Date(NOW))
  ok(opts.length === 4 && opts[0] === '2026-10' && opts[3] === '2026-07', 'the months open: this one back to the first transaction’s, newest first', opts)
  ok(m.monthOptions(null, new Date(NOW)).length === 12, '…twelve when Qanvast doesn’t say (1.0)')
  const empty = m.statementOf([], '2026-10')
  ok(empty.rows.length === 0, 'no history: no statement rows')
  const quiet = m.statementOf([{ id: 'p', amount: -200, createdAt: '2026-08-20T02:00:00Z', newFreeBalance: 0, newPaidBalance: 2200 }], '2026-10')
  ok(quiet.rows.length === 3 && quiet.opening === 2200 && quiet.closing === 2200 && quiet.entries === 0, 'a month with only the previous one’s last transaction: brought forward → total → carried forward, nothing shown in between', quiet)
  ok(m.closuresOf([{ key: '2026-09', label: '', leads: 4, budget: 1, credits: 0, closures: 1, closedAmount: 52_000 }, { key: '2026-10', label: '', leads: 2, budget: 1, credits: 0, closures: 0, closedAmount: 0 }]).sum === 52_000, 'Value of contracts sums what the contracts closed for (1.0 summed the leads’ budgets)')
})

/* ── 2. the stub: 1.0's JSON, field for field ── */
type Call = [string, unknown]
const calls: Call[] = []
const tx = (id: string, at: string, amount: number, free: number, paid: number, extra: object = {}) => ({ id, amount, createdAt: at, newFreeBalance: free, newPaidBalance: paid, ...extra })
const STUB = {
  name: 'probe-qanvast',
  creditStatistics: async () => { calls.push(['stats', null]); return [{ period: '2026 9', leads: 4, budgets: 260_000, credits: 760, contractsClosed: 1, closedAmount: 52_000 }, { period: 'Oct 2026', leads: 2, budgets: 90_000, credits: 380, contractsClosed: 0, closedAmount: 0 }, { period: '??', leads: 9, contractsClosed: 0, closedAmount: 0 }] },
  contracts: async () => { calls.push(['contracts', null]); return [{ id: '991', contractStart: '2026-01-05T02:00:00Z', contractSum: 8000, credits: 15_000, freeCredits: 500, budgetFilterMin: 30_000, budgetFilterMax: 200_000, photoshoots: 2, socialMediaPostings: 4, entitlements: [{ type: 'Photoshoot' as const }, { type: 'Social Media Posting' as const }, { type: 'Social Media Posting' as const }] }] },
  transactions: async (o: { month: number; year: number }) => {
    calls.push(['tx', o])
    if (o.month === 10 && o.year === 2026) return [tx('prev', '2026-09-28T02:00:00Z', -190, 0, 4000), tx('a', '2026-10-02T02:00:00Z', -280, 0, 3720, { lead: { budget: 65_000, offlineUserName: 'Probe Homeowner', contact: '91110000' }, contractId: '991' }), tx('b', '2026-10-05T02:00:00Z', 1000, 0, 4720, { summary: 'Top-up' }), null]
    return []
  },
  earliestTransaction: async () => [tx('first', '2025-12-01T02:00:00Z', 15_000, 0, 15_000)],
  leadCredits: async (refs: string[]) => { calls.push(['leadCredits', refs]); return Object.fromEntries(refs.map((r) => [r, 350])) },
  reviews: async (o: { page: number; perPage: number }) => {
    calls.push(['reviews', o])
    const mk = (i: number) => ({ id: 5000 + i, title: `Review ${i}`, content: 'Good work.', averageRating: String(i % 2 ? 5 : 4), createdAt: `2026-0${(i % 9) + 1}-10T02:00:00Z`, projectCompletionDate: '2026-01-15T02:00:00Z', designerName: 'Kai', reviewer: { name: `Owner ${i}` }, projectImages: i === 0 ? [{ baseUrl: 'https://img.qanvast.example/p/abc' }] : [], revieweeResponse: i === 1 ? 'Thanks!' : null })
    const all = Array.from({ length: 14 }, (_, i) => mk(i))
    return { data: all.slice((o.page - 1) * o.perPage, o.page * o.perPage), itemCount: 14, overallAvgRating: 4.57, separateItemCount: { overallItemCount: 14, '1-star': 0, '2-star': 0, '3-star': 0, '4-star': 7, '5-star': 7 } }
  },
  reply: async (o: { reviewId: string; text: string }) => { calls.push(['reply', o]); return o.text.includes('refuse') ? { error: 'Qanvast refused the reply (probe)' } : { ok: true as const } },
  businessStatistics: async () => ({ rank: 5, totalCompanies: 900, reviews: { last12MonthsCount: 11, last12MonthsAverage: 4.62, currentYearCount: 8, currentYearAverage: 4.71 }, totalProjects: 22, currentYearProjects: 6, totalBoardPins: '1234', currentYearBoardPins: 300, profileViews: { count: 100, change: -12 }, projectViews: { count: 40, change: 0 }, reviewViews: { count: 9, change: 50 } }),
  feedbackStatistics: async (i: 1 | 2 | 3) => { calls.push(['feedback', i]); return { responseCount: { current: { count: i === 1 ? 1 : 5 } }, leadCount: { current: { count: 9 } }, firstContactWithin7Days: { current: { count: 4, pct: 80 } }, firstContactLessThan3Days: { current: { count: 3, pct: 60 } }, firstContactWithinAWeek: { current: { count: 1, pct: 20 } }, firstContactMoreThanAWeek: { current: { count: 1, pct: 20 } }, met: { current: { count: 2, pct: 40 } }, notMet: { current: { count: 3, pct: 60 } }, averageMeetingRating: { current: { count: 8.25 } }, haveYetToSetUpAMeetingDate: { current: { count: 2, pct: 40 } }, lackOfGoodReviews: { current: { count: 1, pct: 20 } }, professional: { current: { count: 2, pct: 40 } }, avgContactRating: 72, avgResponseRating: 41, avgExperienceScore: 7.8 } },
  links: () => ({ writeReview: 'https://qanvast.example/sg/reviews/new?company=991', allReviews: 'https://qanvast.example/sg/reviews/company/991', listing: 'https://www.qanvast.com/sg/interior-designers-architects', supertrust: null }),
}

await step('registry', async () => {
  ok(slots.SLOT_KEYS.includes('qanvast-account') && SERVICES.some((s) => s.key === 'qanvast-account' && s.slot === 'qanvast-account' && s.swap.symbol === 'setQanvastAccountService'), 'the slot and its registry entry (the one call that swaps it)')
  ok(svc.qanvastAccountIsStandIn() && svc.qanvastAccountName() === 'stand-in', 'a fresh process answers with the stand-in')
})

await step('the stub through the loaders', async () => {
  await as('dane')
  svc.setQanvastAccountService(STUB)
  ok(!svc.qanvastAccountIsStandIn() && slots.isPlugged('qanvast-account') && slots.pluggedName('qanvast-account') === 'probe-qanvast', 'setQanvastAccountService plugs it in (the ops report names it)')
  const ov = await q.fetchLeadCredits('overview', { now: NOW })
  ok(!ov.gate && 'view' in ov && ov.view === 'overview' && !ov.standIn, 'Overview reads the plugged service (no stand-in line)')
  if (!ov.gate && 'view' in ov && ov.view === 'overview') {
    ok(ov.months.length === 2 && ov.months[0]!.key === '2026-09' && ov.months[1]!.label === 'Oct 2026', 'months read from both period shapes, the unreadable one left out, oldest first', ov.months)
    ok(ov.balance === 4720, 'the balance is the month’s last transaction’s free + paid (1.0’s rule)', ov.balance)
    ok(ov.closures.contracts === 1 && ov.closures.leads === 6 && ov.closures.rate === 16.7 && ov.closures.sum === 52_000, 'closures over the months sent: 1 of 6 = 16.7%, worth what they closed for', ov.closures)
    ok(ov.contracts === 1, 'the contracts counted')
  }
  const tr = await q.fetchLeadCredits('transactions', { month: '2026-10', now: NOW })
  if (!tr.gate && 'view' in tr && tr.view === 'transactions') {
    const st = tr.statement
    ok(st.opening === 4000 && st.entries === 2 && st.minus === 280 && st.plus === 1000 && st.closing === 4720, 'the statement: the previous month’s last balance brought forward (its row not shown), −280 · +1,000, carried forward 4,720', { o: st.opening, e: st.entries, mi: st.minus, pl: st.plus, c: st.closing })
    ok(st.rows[0]!.kind === 'brought' && st.rows.at(-2)!.kind === 'total' && st.rows.at(-1)!.kind === 'carried', 'brought forward · entries · total · carried forward, in 1.0’s order')
    const lead = st.rows.find((r) => r.kind === 'entry' && r.lead)
    ok(lead && lead.kind === 'entry' && lead.what === 'New lead' && lead.lead?.name === 'Probe Homeowner' && lead.leadId === null, 'a lead row names its homeowner (a lead the studio doesn’t hold opens nothing)', lead)
    ok(tr.options[0] === '2026-10' && tr.options.at(-1) === '2025-12' && tr.options.length === 11, 'the months to open run back to the earliest transaction', tr.options)
  } else ok(false, 'Transactions read', tr)
  const ct = await q.fetchLeadCredits('contracts', { now: NOW })
  if (!ct.gate && 'view' in ct && ct.view === 'contracts') {
    const c = ct.contracts[0]!
    ok(c.number === '#991' && c.amount === 8000 && c.credits === 15_000 && c.freeCredits === 500 && c.budget === 'S$30K to S$200K' && c.photoshoots.used === 1 && c.photoshoots.total === 2 && c.posts.used === 2 && c.posts.total === 4, 'a contract: money, credits, free credits, the budget band, entitlements counted from what was done', c)
    ok(m.entitlementLines(c).join(' | ') === '1 of 2 photoshoots done | 2 of 4 social media posts done', 'entitlements in words')
  } else ok(false, 'Contracts read', ct)
  const credits = await creditsByQanvastLead(['234144', '884184'])
  ok(credits && credits['234144'] === 350 && credits['884184'] === 350, 'a Qanvast lead’s credits come from the same service', credits)
  const leadsTab = await fetchQanvastLeads(null)
  ok(leadsTab.rows.length > 0 && leadsTab.rows.every((r) => (r.qanvastLeadId ? r.credits === 350 : r.credits === null)), 'Qanvast Ops › Leads’ Credits column reads it too (a lead without Qanvast’s id: none)', leadsTab.rows.map((r) => [r.name, r.credits]))
})

await step('reviews, ranking and feedback through the stub', async () => {
  calls.length = 0
  const rv = await q.fetchQanvastReviews('reviews', { now: NOW })
  if (!rv.gate && 'view' in rv && rv.view === 'reviews') {
    ok(calls.filter((c) => c[0] === 'reviews').length === 2 && rv.list.reviews.length === 14 && rv.list.total === 14, 'every page of reviews read (12 + 2), so a filter finds every one', calls.filter((c) => c[0] === 'reviews'))
    ok(rv.list.average === 4.6 && rv.list.stars[5] === 7 && rv.list.stars[4] === 7, 'the average and the stars’ spread are Qanvast’s own counts', rv.list)
    const p = rv.list.reviews.find((r) => r.photos.length)!.photos[0]!
    ok(p.thumb === 'https://img.qanvast.example/p/abc/Thumbnail' && p.full === 'https://img.qanvast.example/p/abc/Standard', 'a photo at Qanvast’s two sizes', p)
    ok(rv.waiting === 13 && rv.links.writeReview.includes('company=991'), 'the waiting count and Qanvast’s own review link', { w: rv.waiting })
    ok(rv.finished.every((x) => x.id.startsWith('p:')) && rv.leads.every((x) => x.id.startsWith('l:')), 'Request reviews offers finished projects’ clients and leads')
  } else ok(false, 'Reviews read', rv)
  const rk = await q.fetchQanvastReviews('ranking', { now: NOW })
  if (!rk.gate && 'view' in rk && rk.view === 'ranking') {
    ok(rk.ranking.rank === 5 && rk.ranking.firms === 900 && rk.ranking.pins.count === 1234 && rk.ranking.rating.average === 4.6 && rk.ranking.views.profile.change === -12, 'the rank, the factors (a pin count sent as text read as a number), the views’ change', rk.ranking)
    ok(calls.some((c) => c[0] === 'feedback' && c[1] === 1) && rk.ranking.feedback.responses === 1 && rk.ranking.feedback.contactRate === 80, 'the 30-day feedback (interval 1) beside the rank')
  } else ok(false, 'Ranking read', rk)
  const fb = await q.fetchQanvastReviews('feedback', { days: 60, now: NOW })
  if (!fb.gate && 'view' in fb && fb.view === 'feedback') {
    const f = fb.feedback
    ok(calls.some((c) => c[0] === 'feedback' && c[1] === 2), '60 days asks interval 2')
    ok(f.enough && f.responses === 5 && f.leads === 9 && f.contact.value === 80 && f.meeting.value === 40 && f.experience.value === 8.3, 'the three figures', f)
    ok(f.meeting.reasons[0]!.key === 'noDate' && f.meeting.reasons[0]!.count === 2 && f.experience.reasons[0]!.key === 'professional', 'the reasons sorted by how many gave them')
  } else ok(false, 'Feedback read', fb)
})

await step('the reply and the rule', async () => {
  calls.length = 0
  let res: Awaited<ReturnType<typeof actions.replyToQanvastReview>> | null = null
  try { res = await actions.replyToQanvastReview({ reviewId: '5002', text: '  Thank you, we loved it.  ' }) } catch { /* revalidatePath needs a request — the service was already called */ }
  const sent = calls.find((c) => c[0] === 'reply')
  ok(sent && (sent[1] as { reviewId: string; text: string }).text === 'Thank you, we loved it.' && (!res || ('ok' in res && res.posted)), 'the Owner’s reply goes through the service, trimmed (posted: a real service)', { sent, res })
  const refused = await actions.replyToQanvastReview({ reviewId: '5002', text: 'please refuse' })
  ok('error' in refused && refused.error === 'Qanvast refused the reply (probe)', 'Qanvast’s refusal comes back in its words', refused)
  ok('error' in (await actions.replyToQanvastReview({ reviewId: '5002', text: '   ' })), 'an empty reply is refused')
  ok('error' in (await actions.replyToQanvastReview({ reviewId: '5002', text: 'x'.repeat(m.REPLY_MAX + 1) })), 'a reply over 5,000 letters is refused')
  /* (S42E, call E·2 — a deliberate change of this rule) Lead credits stay the Owner's; Reviews are an Admin's too (read, reply, Request reviews) */
  {
    await as('huimin')
    calls.length = 0
    const g = await q.fetchLeadCredits('overview', { now: NOW }), r = await q.fetchQanvastReviews('reviews', { now: NOW })
    ok(g.gate && !r.gate && !calls.some((c) => c[0] === 'stats' || c[0] === 'tx' || c[0] === 'contracts'), 'huimin (Admin): Lead credits’ gate (nothing asked of Qanvast for it) — Reviews read', { g: g.gate, r: r.gate, calls: calls.map((c) => c[0]) })
    let a: Awaited<ReturnType<typeof actions.replyToQanvastReview>> | null = null
    try { a = await actions.replyToQanvastReview({ reviewId: '5002', text: 'hello' }) } catch { /* revalidatePath needs a request — the service was already called */ }
    ok(calls.some((c) => c[0] === 'reply') && (!a || !('error' in a)), 'huimin (Admin): a reply goes through', { a })
  }
  for (const who of ['james', 'germaine', 'priya']) {
    await as(who)
    calls.length = 0
    const g = await q.fetchLeadCredits('overview', { now: NOW }), r = await q.fetchQanvastReviews('reviews', { now: NOW })
    const a = await actions.replyToQanvastReview({ reviewId: '5002', text: 'hello' })
    ok(g.gate && r.gate && 'error' in a && a.error === policy.QANVAST_ACCOUNT_REFUSAL.reply && calls.length === 0, `${who}: the tabs’ gate, the reply refused with the rule — and nothing asked of Qanvast`, { g, r, a, calls })
  }
  await as('dane')
})

await step('a Qanvast that fails', async () => {
  const boom = async () => { throw new Error('upstream 502') }
  svc.setQanvastAccountService({ ...STUB, name: 'broken', creditStatistics: boom, transactions: boom, contracts: boom, earliestTransaction: boom, leadCredits: boom, reviews: boom, businessStatistics: boom, feedbackStatistics: boom })
  const ov = await q.fetchLeadCredits('overview', { now: NOW })
  ok(!ov.gate && 'error' in ov && ov.error === svc.NO_ANSWER, 'Overview says Qanvast didn’t answer — never a made-up figure', ov)
  ok(await creditsByQanvastLead(['234144']) === null, 'the Leads tab’s column reads “—”')
  const rv = await q.fetchQanvastReviews('reviews', { now: NOW })
  ok(!rv.gate && 'error' in rv, 'Reviews says so too')
  /* 1.0's 401: the studio's Qanvast sign-in expired — the pages offer Sign in again (S30's reason 'qanvast') */
  const expired = async () => { throw new svc.QanvastSessionExpired() }
  svc.setQanvastAccountService({ ...STUB, name: 'expired', creditStatistics: expired, transactions: expired, contracts: expired, reviews: expired })
  const ex = await q.fetchLeadCredits('overview', { now: NOW })
  ok(!ex.gate && 'error' in ex && ex.expired === true && ex.error === svc.SESSION_EXPIRED, 'a 401 from Qanvast reads as its session expired (Sign in again), not as a failure', ex)
  const exr = await q.fetchQanvastReviews('reviews', { now: NOW })
  ok(!exr.gate && 'error' in exr && exr.expired === true, '…on Reviews too')
})

await step('the stand-in again', async () => {
  svc.resetQanvastAccountService()
  ok(svc.qanvastAccountIsStandIn(), 'reset puts the stand-in back')
  const ov = await q.fetchLeadCredits('overview')
  ok(!ov.gate && 'view' in ov && ov.standIn, 'the pages say they read the stand-in')
  const all = await q.fetchQanvastReviews('reviews')
  if (!all.gate && 'view' in all && all.view === 'reviews') {
    const id = all.list.reviews.find((r) => !r.response)!.id
    const r = await svc.askQanvast('reply', (s) => s.reply({ reviewId: id, text: 'Kept by the stand-in' }))
    const row = await client.execute({ sql: `SELECT value FROM settings WHERE key = 'qanvast_demo_replies'`, args: [] })
    ok('ok' in r && String(row.rows[0]?.value ?? '').includes('Kept by the stand-in'), 'the stand-in keeps a reply in the demo’s store')
    const again = await q.fetchQanvastReviews('reviews')
    ok(!again.gate && 'view' in again && again.view === 'reviews' && again.list.reviews.find((x) => x.id === id)?.response === 'Kept by the stand-in', '…and the review shows it')
    const no = await svc.askQanvast('reply', (s) => s.reply({ reviewId: 'not-a-review', text: 'x' }))
    ok('ok' in no && 'error' in no.ok, 'a review the stand-in doesn’t hold is refused')
  }
})

console.log(JSON.stringify({ done: true, pass, fail }))
process.exit(fail ? 1 : 0)
