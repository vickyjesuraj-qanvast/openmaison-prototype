import 'server-only'
import { durationWords, moneyCard, moneyCompact, startOfDay } from '@/lib/format'
import { seesProfit } from '@/lib/settings/cost-visibility'   // (pending modules S41b-1) the Profit figure is the books' and the cost switch's
import { isMarketing, runsStudio } from '@/lib/settings/roles'
import { fetchInsights } from '@/lib/leads/insights'
import { fetchSales } from '@/lib/leads/sales-queries'
import { DEFAULT_RANGE, insightsReport, legMs, median, rangeParam, tatGrade, type LeadFacts } from '@/lib/leads/tat'
import { inRangeOf, isWon } from '@/lib/leads/sales'
import { stageSlug } from '@/lib/leads/listing-url'
import type { Stage } from '@/lib/leads/enums'
import { plural } from '@/lib/projects/schedule-model'
import { buildReport, type ReportInput, type ReportTable, type ReportTile } from '@/lib/finance/reports'
import { addedInLast7Days } from '@/lib/leads/filters'
import { entityOptions } from '@/lib/finance/entity-scope'
import { profitGrade } from '@/lib/finance/profit'
import { FINANCE_BASE } from '@/lib/finance/sections'
import { GRADE_WORDS, PULSE_LABEL, RESPONSE_TARGET_MS, countDelta, minorOf, moneyShort, profitLabel, pulseKeysFor, pulseLabel, type PulseDelta, type PulseFigure, type PulseKey, type PulsePart } from './pulse'
import type { DashCtx } from './context'
import type { PulseData } from './pulse'

/*
 * (the Dashboard redesigned, 2026-10-26 — his marks P-03 · Q-04 · lane D1 owns this file) **Pulse**, read through each figure's own report —
 * the Leads listing's "Last 7 days" (`applyFilters`' window), Reports › Leads' Sales and Response time (`salesReport`'s won leads, `insightsReport`'s
 * first-contact leg and its grade), Reports › Finance's Owed to you · You owe · Cash flow's next 30 days · the P&L · GST — never a second count.
 * Each comparison is the same rule over the period before; each trend the same rule week by week from the records' own dates (Q-04: no
 * snapshot table). The figures are the role's (`pulseKeysFor`, his P-11) and, for an Owner's or Admin's Mine (Q-07), their own leads and
 * projects. A figure its role can't read is left out; a figure whose report the role doesn't open presses to its breakdown instead.
 */

const DAY = 86_400_000
const HOUR = 3_600_000
const short = (minor: number) => moneyShort(minor, moneyCompact)
/** A no-break space: a caption's last words kept together when it wraps ("7% win rate", "median, 90 days", "2 projects"). */
const NB = '\u00a0'
const keep = (words: string) => words.replace(/ /g, NB)
/** The Leads listing's "Last 7 days" (lib/leads/filters.ts `addedInLast7Days`: today and the six days before, by the calendar), `k` weeks back —
    this week itself is read through `addedInLast7Days` (D5's one rule); the weeks before and the bars shift the same window. */
const weekOf = (now: number, k: number) => { const today = startOfDay(new Date(now)); return { from: today - 6 * DAY - 7 * k * DAY, to: today + DAY - 7 * k * DAY } }
const inWeek = (t: number, w: { from: number; to: number }) => t >= w.from && t < w.to
const WEEKS = 8
/** First response compares with the 90 days before only when each side has this many first contacts. */
const MIN_LEGS = 3
const weeksOf = (now: number) => <T,>(fn: (w: { from: number; to: number }) => T): T[] => Array.from({ length: WEEKS }, (_, i) => fn(weekOf(now, WEEKS - 1 - i)))
/** A sum on a figure's breakdown, as a record card writes it ("S$ 77,900"), a loss with the house minus. */
const card = (minor: number) => (minor < 0 ? `−${moneyCard(-minor)}` : moneyCard(minor))
/** A report tile's own figure — its `minor` (lib/finance/reports.ts, D5's P-13), the money words read back only for a tile that has none yet. */
const figureOf = (t: ReportTile | undefined) => (t ? t.minor ?? minorOf(t.value) : 0)

export async function fetchPulse(ctx: DashCtx): Promise<PulseData | null> {
  const { viewer, role, now } = ctx
  const profitOk = seesProfit(viewer)
  const keys = pulseKeysFor(role, { profit: profitOk })
  if (!keys.length) return null
  const has = (k: PulseKey) => keys.includes(k)
  const mine = ctx.scope === 'mine'
  const runs = runsStudio(role)
  const team = !runs && role === 'Manager'   // a Manager's figures are their team's (Who sees leads)
  const own = (ids: readonly string[]) => !mine || ids.includes(viewer.id)
  const seen = ctx.seen
  const weeks = weeksOf(now)

  const needLeads = has('leads') || has('projects')
  const needFacts = has('sales') || has('response')
  const [visible, insights, list, todo] = await Promise.all([
    needLeads ? ctx.read.visibleLeads() : Promise.resolve([]),
    needFacts ? fetchInsights().catch(() => null) : Promise.resolve(null),
    has('projects') ? ctx.read.projects() : Promise.resolve(null),
    has('owed') || has('coming') || has('profit') || has('owe') || has('gst') ? ctx.read.todo() : Promise.resolve(null),
  ])
  const facts: LeadFacts[] = (insights?.facts ?? []).filter((f) => (!seen || seen.has(f.id)) && own(f.assigneeIds))
  const sales = has('sales') && runs && insights ? await fetchSales({ insights, rows: (await ctx.read.leads())?.rows }).catch(() => null) : null
  const out: PulseFigure[] = []

  /* ── Leads this week — the listing's own "Last 7 days" (a Designer's: their own leads, the listing's Mine) ── */
  if (has('leads')) {
    const designer = !runs && role !== 'Manager' && !isMarketing(role)
    const base = visible.filter((r) => (designer || mine ? r.assignees.some((m) => m.id === viewer.id) : true))
    const at = (r: (typeof base)[number]) => r.createdAt.getTime()
    const mineQ = designer || mine ? 'scope=mine&' : ''
    if (designer) {
      const added = addedInLast7Days(base, now).length
      out.push({ key: 'leads', label: pulseLabel('leads', role), openLabel: 'Open your leads', value: String(base.length), caption: [{ t: added ? `${added} added this week` : 'None added this week' }], href: '/leads?scope=mine',
        aria: `My leads: ${base.length} — open your leads`, breakdownTitle: 'By stage', breakdown: byCount(base.map((r) => r.stage)).map(([stage, n]) => ({ label: stage, value: String(n), href: `/leads?scope=${stageSlug(stage as Stage)}&member=${encodeURIComponent(viewer.id)}` })) })
    } else {
      const cur = addedInLast7Days(base, now)
      const prior = base.filter((r) => inWeek(at(r), weekOf(now, 1))).length
      const sources = byCount(cur.map((r) => r.source.trim() || 'No source'))
      const delta = countDelta(cur.length, prior, 'last week')
      /* (the calm pass) the caption is where they came from — the comparison is the figure's name and its breakdown's title */
      out.push({
        key: 'leads', label: PULSE_LABEL.leads, openLabel: 'Open them in Leads', value: String(cur.length), delta,
        caption: [{ t: sources.length ? sources.slice(0, 2).map(([s, n]) => `${n} from ${s}`).join(' · ') : 'None added this week' }],
        trend: weeks((w) => base.filter((r) => inWeek(at(r), w)).length), trendWords: 'leads added each week, the last 8 weeks',
        href: `/leads?${mineQ}date=7d`, aria: `Leads this week: ${cur.length}${delta ? `, ${delta.text}` : ''} — open them in Leads`,
        breakdownTitle: 'By source · this week', breakdown: sources.map(([s, n]) => ({ label: s, value: String(n), href: `/leads?${mineQ}date=7d&source=${encodeURIComponent(s)}` })),
      })
    }
  }

  /* ── Won · 90 days — Reports › Leads › Sales' won leads (a Manager's as a count: no money on their page) ── */
  if (has('sales')) {
    const pool = sales ? sales.facts.filter((f) => own(f.assigneeIds)) : null
    const wonOf = (f: LeadFacts) => (pool ? isWon(pool.find((x) => x.id === f.id) ?? { reached: 0 }) : f.stage === 'Won' || f.wonAt !== null)
    const cur = inRangeOf(facts, now, DEFAULT_RANGE)
    const won = cur.filter(wonOf)
    const priorAll = facts.filter((f) => f.createdAt >= now - 2 * 90 * DAY && f.createdAt < now - 90 * DAY)
    const priorWon = priorAll.filter(wonOf).length
    const value = (id: string) => pool?.find((x) => x.id === id)?.won?.minor ?? 0
    const money = !!pool && !team
    const valueMinor = won.reduce((s, f) => s + value(f.id), 0)
    const shown = money ? short(valueMinor) : String(won.length)
    const href = runs ? ctx.from(`/company/reports/leads?report=sales&range=${rangeParam(DEFAULT_RANGE)}`) : '/leads?scope=won'
    const delta = countDelta(won.length, priorWon, 'the 90 days before')
    /* (the calm pass) the option's "3 of 30 leads · 10% win rate"; a count's own value says the 3 ("of 30 leads · 10% win rate") */
    /* a no-break space keeps a caption's last words together when it wraps ("win rate", "90 days", "2 projects") */
    const rate = cur.length ? ` · ${Math.round((won.length / cur.length) * 100)}%${NB}win${NB}rate` : ''
    const caption: PulsePart[] = [{ t: !cur.length ? 'No leads added' : money ? `${won.length} of ${plural(cur.length, 'lead')}${rate}` : `of ${plural(cur.length, 'lead')}${rate}` }]
    out.push({
      key: 'sales', label: PULSE_LABEL.sales, openLabel: runs ? 'Open the Sales report' : 'Open the won leads', value: shown, caption,
      delta: !delta ? undefined : delta.dir === 'flat' ? { ...delta, text: 'Same as the 90 days before', title: delta.text } : delta,
      trend: weeks((w) => facts.filter((f) => wonOf(f) && f.wonAt !== null && inWeek(f.wonAt, w)).reduce((s, f) => s + (money ? value(f.id) : 1), 0)),
      trendWords: money ? 'value won each week, the last 8 weeks' : 'leads won each week, the last 8 weeks', href,
      aria: `Won in the last 90 days: ${money ? `${moneyCard(valueMinor)}, ` : ''}${won.length} of ${plural(cur.length, 'lead')}${delta ? `, ${delta.text}` : ''} — open the ${runs ? 'Sales report' : 'won leads'}`,
      breakdownTitle: 'Won · last 90 days', breakdown: [...won].sort((a, b) => value(b.id) - value(a.id)).slice(0, 5).map((f) => ({ label: f.name, value: money ? moneyCard(value(f.id)) : 'Won', href: ctx.from(`/leads/${f.id}`) })),
    })
  }

  /* ── First response — Reports › Leads' Assignment → First outreach leg: the median and its grade (a Manager's: their team's, no report) ── */
  if (has('response') && insights) {
    const rep = insightsReport(facts, insights.team, insights.now, DEFAULT_RANGE)
    const leg = rep.legs.outreach
    const priorXs = facts.filter((f) => f.createdAt >= now - 2 * 90 * DAY && f.createdAt < now - 90 * DAY).map((f) => legMs(f, 'outreach')).filter((x): x is number => x !== null)
    const prior = median(priorXs)
    const g = tatGrade(leg.median)
    let delta: PulseDelta | undefined
    /* a comparison needs a few first contacts on each side — against one lead it says nothing (Sales' own caution, MIN_CLOSED) */
    if (leg.median !== null && prior !== null && leg.count >= MIN_LEGS && priorXs.length >= MIN_LEGS) {
      const d = leg.median - prior
      delta = Math.abs(d) < 0.05 * HOUR ? { text: 'Same as before', dir: 'flat', good: null } : { text: `${d > 0 ? '▲' : '▼'} ${durationWords(Math.abs(d))} ${d > 0 ? 'slower' : 'faster'}`, dir: d > 0 ? 'up' : 'down', good: d < 0 }
    }
    const opens = runs || isMarketing(role)
    const value = durationWords(leg.median)
    /* (the calm pass — the option's "Target 4h · median, 90 days", his correction 2) the mark is the report's own Fast band (8 hours); the
       caption is red only when the report grades the median Slow — ours, and late */
    const target = durationWords(RESPONSE_TARGET_MS)
    out.push({
      key: 'response', label: PULSE_LABEL.response, openLabel: 'Open Response time', value, grade: g ? { label: GRADE_WORDS[g], tone: g } : undefined, delta,
      /* (the calm UI build 2026-10-27 — the audit's 1-17, W-056) "Usually 26 hours · aim for 8 hours" (was "Target 8h · median, 90 days") */
      caption: leg.count ? [{ t: `Usually ${value} · aim for ${target}`, tone: g === 'bad' ? 'late' : undefined }] : [{ t: `No first contact logged · 90${NB}days` }],
      trend: weeks((w) => median(facts.filter((f) => inWeek(f.createdAt, w)).map((f) => legMs(f, 'outreach')).filter((x): x is number => x !== null))),
      trendWords: 'the median each week, the last 8 weeks', target: RESPONSE_TARGET_MS,
      href: opens ? ctx.from(`/company/reports/leads?range=${rangeParam(DEFAULT_RANGE)}`) : '',
      aria: `First response: ${value} median${g ? `, ${GRADE_WORDS[g].toLowerCase()}` : ''}, the target ${target}${delta ? `, ${delta.text}` : ''} — ${opens ? 'open the Response time report' : 'see it by member'}`,
      breakdownTitle: 'By member · median', breakdown: rep.members.filter((m) => m.outreachMedian !== null).sort((a, b) => (a.outreachMedian ?? 0) - (b.outreachMedian ?? 0)).slice(0, 6).map((m) => ({ label: m.name, value: durationWords(m.outreachMedian), href: `/leads?member=${encodeURIComponent(m.id)}` })),
    })
  }

  /* ── the books: Reports › Finance (Owners, Admins, Accounting — `todo.books`) ── */
  const books = todo?.books ?? null
  if (books) {
    const ownP = (p: { team: { id: string }[] }) => !mine || p.team.some((m) => m.id === viewer.id)
    const projectsIn = books.projects.filter(ownP)
    const empty = { ...books.overhead, pos: [], bills: [], expenses: [], payouts: [] }
    const input: ReportInput = {
      projects: projectsIn, overhead: mine ? empty : books.overhead, vendors: books.vendors, people: books.people, now: books.now, entities: entityOptions(books.entities),
      commission: mine ? { ...books.commission, summary: { ...books.commission.summary, lines: books.commission.summary.lines.filter((l) => projectsIn.some((p) => p.id === l.projectId)) } } : books.commission,
    }
    const reports = (key: 'ar' | 'ap' | 'cashflow' | 'pl' | 'gst', period: 'this_month' | 'this_quarter' | 'last_quarter' = 'this_month') => buildReport(key, input, period)
    /* (the calm pass) the oldest band takes its tone: a client's lateness amber (Owed to you — theirs, his correction 2), the studio's own red
       (You owe — ours and late, S-05) */
    const bands = (t: ReportTable | undefined, oldest: 'theirs' | 'late') => {
      const amt = (ids: string[]) => (t?.rows ?? []).filter((r) => ids.includes(r.id)).reduce((s, r) => s + (Number(r.cells.amount) || 0), 0)
      const parts: { label: string; minor: number; tone?: 'theirs' | 'late' }[] = [{ label: '≤30 days', minor: amt(['b0', 'b1']) }, { label: '31–60 days', minor: amt(['b2']) }, { label: '60+ days', minor: amt(['b3', 'b4']), tone: oldest }]
      const total = parts.reduce((s, p) => s + p.minor, 0)
      return total ? parts.map((p) => ({ label: p.label, share: p.minor / total, value: moneyCard(p.minor), tone: p.tone })) : undefined
    }
    /* AGING (lib/finance/reports.ts): Current · 1–30 · 31–60 · 61–90 · Over 90 days — "over 60 days" is the last two */
    const OVER_60 = ['61–90 days', 'Over 90 days']
    const reportHref = (r: string, period?: string) => ctx.from(`/company/reports/finance?report=${r}${period ? `&period=${period}` : ''}`)
    if (has('owed')) {
      const ar = reports('ar')
      const owed = figureOf(ar.tiles[0])
      const rows = ar.tables.find((t) => t.key === 'invoices')?.rows ?? []
      const lateRows = rows.filter((r) => r.cells.late !== 'Current')
      const late = lateRows.reduce((s, r) => s + (Number(r.cells.amount) || 0), 0)
      const oldRows = rows.filter((r) => OVER_60.includes(String(r.cells.late)))
      const old = oldRows.reduce((s, r) => s + (Number(r.cells.amount) || 0), 0)
      /* (the calm pass — the option's "S$22.1K over 60 days · 3 invoices", in amber: a client's lateness is theirs) */
      /* (the calm UI build 2026-10-27 — the audit's 1-05 · 1-17, W-050) one count for one fact — the invoices still to collect, then what of it is
         late: "3 invoices · S$ 34.2K overdue" (was "S$ 34.2K past due · 2 invoices", against Maison AI's "3 invoices not paid in full"); the
         house word is "overdue" */
      const caption: PulsePart[] = !rows.length ? [{ t: 'Every sent invoice is paid' }]
        : old ? [{ t: `${keep(plural(rows.length, 'invoice'))} · ` }, { t: `${short(old)} over 60${NB}days`, tone: 'theirs' }]
        : late ? [{ t: `${plural(rows.length, 'invoice')} · ${short(late)} overdue` }]
        : [{ t: `${plural(rows.length, 'invoice')} · nothing overdue` }]
      out.push({
        key: 'owed', label: PULSE_LABEL.owed, openLabel: 'Open the report', value: short(owed), caption,
        aging: bands(ar.tables.find((t) => t.key === 'buckets'), 'theirs'), href: reportHref('ar'),
        aria: `To collect: ${moneyCard(owed)}${late ? `, ${moneyCard(late)} overdue` : ''}${old ? `, ${moneyCard(old)} of it over 60 days` : ''} — open the report`,
        breakdownTitle: 'By how late', breakdown: (ar.tables.find((t) => t.key === 'buckets')?.rows ?? []).filter((r) => Number(r.cells.amount)).map((r) => ({ label: String(r.cells.bucket), value: card(Number(r.cells.amount)), href: reportHref('ar') })),
      })
    }
    if (has('coming')) {
      /* Cash flow's "The next 90 days" — sent invoices' balances by their due days; its "Next 30 days" is the figure, its weeks the bars */
      const due = projectsIn.flatMap((p) => p.money.invoices.filter((v) => v.status === 'sent' && v.balanceMinor > 0).map((v) => ({ day: v.dueAt ?? books.now, amount: v.balanceMinor, label: `${p.client} · ${v.label ?? v.stageName}` })))
      const t0 = books.now
      const windows = [{ from: t0, to: t0 + 7 * DAY, label: 'This week' }, { from: t0 + 7 * DAY, to: t0 + 14 * DAY, label: 'Next week' }, { from: t0 + 14 * DAY, to: t0 + 21 * DAY, label: 'In 3 weeks' }, { from: t0 + 21 * DAY, to: t0 + 30 * DAY, label: 'In 4 weeks' }]
      const within = due.filter((x) => x.day >= t0 && x.day < t0 + 30 * DAY)
      const sum = within.reduce((s, x) => s + x.amount, 0)
      const week = within.filter((x) => x.day < t0 + 7 * DAY).length
      out.push({
        key: 'coming', label: PULSE_LABEL.coming, openLabel: 'Open Cash flow', value: short(sum),
        caption: [{ t: within.length ? `${plural(within.length, 'invoice')} due${week ? ` · ${week} this week` : ''}` : 'Nothing due in the next 30 days' }],
        trend: windows.map((w) => due.filter((x) => x.day >= w.from && x.day < w.to).reduce((s, x) => s + x.amount, 0)), ahead: true, trendWords: 'due each week, the next 4 weeks',
        href: reportHref('cashflow'), aria: `Coming in over the next 30 days: ${moneyCard(sum)} — open Cash flow`,
        breakdownTitle: 'Due · the next 30 days', breakdown: windows.map((w) => ({ label: w.label, value: moneyCard(due.filter((x) => x.day >= w.from && x.day < w.to).reduce((s, x) => s + x.amount, 0)), href: reportHref('cashflow') })),
      })
    }
    if (has('owe')) {
      const ap = reports('ap')
      const owe = figureOf(ap.tiles[0]), late = figureOf(ap.tiles[1])
      /* (the calm pass) what the studio owes past its day is ours and late — red (S-05); the rest of the line is the report's own words */
      const words = ap.tiles[0]!.help ?? ''
      const caption: PulsePart[] = !owe ? [{ t: 'Nothing to pay' }] : late ? [{ t: `${short(late)} overdue`, tone: 'late' }, ...(words ? [{ t: ` · ${words}` }] : [])] : [{ t: words }]
      out.push({
        key: 'owe', label: PULSE_LABEL.owe, openLabel: 'Open the report', value: short(owe), caption,
        aging: bands(ap.tables.find((t) => t.key === 'buckets'), 'late'), href: reportHref('ap'), aria: `To pay: ${moneyCard(owe)}${late ? `, ${moneyCard(late)} overdue` : ''} — open the report`,
        breakdownTitle: 'By how late', breakdown: (ap.tables.find((t) => t.key === 'buckets')?.rows ?? []).filter((r) => Number(r.cells.amount)).map((r) => ({ label: String(r.cells.bucket), value: moneyCard(Number(r.cells.amount)), href: reportHref('ap') })),
      })
    }
    if (has('gst')) {
      const cur = reports('gst', 'this_quarter'), prev = reports('gst', 'last_quarter')
      const signed = (r: typeof cur) => (r.tiles[2]!.label.includes('claim') ? -1 : 1) * figureOf(r.tiles[2])
      const net = signed(cur), before = signed(prev)
      const d = net - before
      out.push({
        key: 'gst', label: PULSE_LABEL.gst, openLabel: 'Open the GST report', value: short(Math.abs(net)), caption: [{ t: net >= 0 ? 'To pay' : 'To claim back' }],
        delta: !net && !before ? undefined : d === 0 ? { text: 'Same as last quarter', dir: 'flat', good: null } : { text: `${d > 0 ? '▲' : '▼'} ${short(Math.abs(d))} vs last quarter`, dir: d > 0 ? 'up' : 'down', good: null },
        href: reportHref('gst', 'this_quarter'), aria: `GST this quarter: ${moneyCard(Math.abs(net))} ${net >= 0 ? 'to pay' : 'to claim back'} — open the GST report`,
        breakdownTitle: 'This quarter', breakdown: cur.tiles.map((t) => ({ label: t.label, value: card(figureOf(t)), href: reportHref('gst', 'this_quarter') })),
      })
    }
    if (has('profit') && profitOk) {
      const pl = reports('pl')
      const revenue = figureOf(pl.tiles[0]), profit = figureOf(pl.tiles[2])
      const from = new Date(new Date(books.now).getFullYear(), new Date(books.now).getMonth(), 1).getTime()
      /* (P-03 · profitGrade) a month's profit is early while a project it invoiced has costs under a tenth of its contract */
      const invoiced = projectsIn.filter((p) => p.money.invoices.some((v) => v.status === 'sent' && (v.sentAt ?? 0) >= from))
      const thin = invoiced.filter((p) => profitGrade(p.profit) !== 'graded').length
      /* (S43B's rule, kept) a month whose credit notes outweigh its invoices names them — never "on −S$… invoiced"; (the calm pass) "Early"
         left the card's face — its words close the caption ("costs not in yet on 2 projects") */
      /* (the calm UI build 2026-10-27 — the audit's 1-17, W-043) "on S$ 50.8K billed · 2 projects still missing costs" (was "… invoiced · costs not
         in yet on 2 projects") */
      const said = revenue > 0 ? `on ${short(revenue)} billed` : revenue < 0 ? `Credit notes ${short(-revenue)} more than billed` : profit < 0 ? 'Costs this month — nothing billed yet' : 'Nothing billed this month'
      out.push({
        key: 'profit', label: profitLabel(books.now), openLabel: 'Open the profit and loss', value: short(profit),
        caption: [{ t: thin ? `${said} · ${keep(plural(thin, 'project'))} still missing costs` : said }],
        early: thin ? `${plural(thin, 'project')} still missing costs` : undefined, href: reportHref('pl', 'this_month'),
        aria: `Profit this month: ${moneyCard(profit)}${thin ? ', early — costs are not in yet on some projects' : ''} — open the profit and loss`,
        breakdownTitle: 'This month', breakdown: pl.tiles.map((t) => ({ label: t.label, value: t.minor !== undefined || /S\$/.test(t.value) ? card(figureOf(t)) : t.value, href: reportHref('pl', 'this_month') })),
      })
    }
  }

  /* ── a Designer's own: their projects, and the commission owed to them ── */
  if (has('projects') && list) {
    const set = list.rows.filter((r) => r.team.some((m) => m.id === viewer.id) && r.stage !== 'completed')
    const attention = set.filter((r) => r.attention.length > 0).length
    out.push({ key: 'projects', label: PULSE_LABEL.projects, openLabel: 'Open your projects', value: String(set.length), caption: [{ t: attention ? `${attention} ${attention === 1 ? 'needs' : 'need'} your attention` : 'You’re all caught up' }], href: '/projects?scope=mine',
      aria: `My projects: ${set.length} — open your projects`, breakdownTitle: 'Your projects', breakdown: set.slice(0, 6).map((r) => ({ label: r.name, value: r.attention[0] ?? 'On track', href: ctx.from(`/projects/${r.id}`) })) })
  }
  if (has('commission')) {
    const c = await import('@/lib/finance/books').then((m) => m.fetchCommissions()).catch(() => null)
    if (c) {
      const owed = c.summary.owedMinor
      const lines = c.summary.lines.filter((l) => l.owedMinor > 0)
      out.push({ key: 'commission', label: PULSE_LABEL.commission, openLabel: 'Open My commission', value: short(owed), caption: [{ t: lines.length ? `on ${plural(lines.length, 'project')}` : 'Nothing owed right now' }],
        href: ctx.from(`${FINANCE_BASE}/commissions`), aria: `Your commission to be paid: ${moneyCard(owed)} — open My commission`,
        breakdownTitle: 'By project', breakdown: lines.slice(0, 6).map((l) => ({ label: c.projects.find((p) => p.id === l.projectId)?.name ?? 'A project', value: moneyCard(l.owedMinor), href: ctx.from(`${FINANCE_BASE}/commissions`) })) })
    }
  }

  const order = new Map(keys.map((k, i) => [k, i]))
  const figures = out.sort((a, b) => (order.get(a.key) ?? 0) - (order.get(b.key) ?? 0))
  return figures.length ? { figures } : null
}

/** Values counted, the most first (then by name). */
function byCount(values: string[]): [string, number][] {
  const m = new Map<string, number>()
  for (const v of values) m.set(v, (m.get(v) ?? 0) + 1)
  return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
}
