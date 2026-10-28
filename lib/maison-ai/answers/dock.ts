import 'server-only'
import { and, desc, eq, inArray, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leadAssignees, leadEvents, leads, quotes } from '@/lib/db/schema'
import { visibleLeadIds } from '@/lib/leads/visibility'
import { worksOn } from '@/lib/projects/policy'
import { money2 } from '@/lib/quotes/math'
import { displayDateLong, moneyCard, titleCaseName } from '@/lib/format'
import { fetchStudio } from '@/lib/settings/queries'
import { shortStudioName } from '@/lib/settings/types'
import type { MaisonAnswer, MaisonFigure } from '@/lib/maison-ai'
import { quoteReminderKey } from '../remind'
import { NOT_YOURS, ON_LEADS, askRow, go, phoneWords, plural, row, type Ctx } from './common'
import { peopleNamed, type Named } from './work'

/*
 * (the Dashboard redesigned 2026-10-26 — his marks P-01 · P-10 · Q-03 · lane D4) The answers the docked field's suggestions reach, each with its
 * cards (D-1.0-home-and-chat.md §4 ·2 — the best of 1.0's chat, on the house pieces, every value from the records by rule):
 *   · **How is cash this month?** — figures (coming in over 30 days, past due, going out over 30 days, in so far this month), the next four weeks
 *     as bars, doors to Money in, the cash flow report and who owes — Company › Reports › Finance's own cash flow and its own receivables, so the
 *     answer and its report never disagree (the four weeks add up to its "Next 30 days");
 *   · **Remind Ryan about VO-2** — the quote's own reminder, proposed with one button: it opens in WhatsApp, and is kept on the client's
 *     Activity (lib/maison-ai/remind-actions.ts) — the receipt carries its Undo;
 *   · **Kelvin’s budget vs similar leads** — a comparison: the lead beside the studio's leads for the same kind of home.
 * Who sees leads and the books' rule hold. *(invented copy: every title and line here)*
 */

const DAY = 86_400_000
/** "26 Oct" — on the clock every page reads its dates by (lib/format) */
const dm = (t: number) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(new Date(t))
const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length ? (s.length % 2 ? s[m]! : Math.round((s[m - 1]! + s[m]!) / 2)) : 0 }

/* ── How is cash this month? ───────────────────────────────────────────────────────────────────────────────────────────────────── */

export async function cashAnswer(c: Ctx): Promise<MaisonAnswer> {
  if (!c.books) return { title: 'Owners, Admins and Accounting only', text: NOT_YOURS }
  const { fetchBooks } = await import('@/lib/finance/books')
  const { buildReport } = await import('@/lib/finance/reports')
  const b = await fetchBooks()
  if (!b) return { title: 'Owners, Admins and Accounting only', text: NOT_YOURS }
  const input = { projects: b.projects, overhead: b.overhead, vendors: b.vendors, people: b.people, commission: b.commission, now: b.now }
  const flow = buildReport('cashflow', input, 'this_month')
  const ahead = flow.tables.find((t) => t.key === 'ahead')?.rows ?? []
  const cell = (label: string, k: 'in' | 'out') => Number(ahead.find((r) => r.id === label)?.cells[k] ?? 0)
  const comingIn = cell('Next 30 days', 'in'), goingOut = cell('Next 30 days', 'out'), pastDue = cell('Overdue now', 'in')
  const monthIn = flow.tiles.find((t) => t.label === 'Money in' || t.label === 'Collected' || t.label === 'Client payments')   // (the calm UI build 2026-10-27) the report's tile by its old or its new name (T-01)
  /* the four weeks inside the report's "Next 30 days" — its own invoices (sent, a balance still owed), by their due days */
  const now = b.now
  const due = b.projects.flatMap((p) => p.money.invoices.filter((v) => v.status === 'sent' && v.balanceMinor > 0).map((v) => ({ day: v.dueAt ?? now, amount: v.balanceMinor })))
  const weeks = [[0, 7], [7, 14], [14, 21], [21, 30]].map(([a, z], i) => {
    const from = now + a! * DAY, to = now + z! * DAY
    const list = due.filter((x) => x.day >= from && x.day < to)
    return { key: `w${i}`, label: `${dm(from)}–${dm(to - DAY)}`, amount: list.reduce((s, x) => s + x.amount, 0), n: list.length }
  })
  const top = Math.max(0, ...weeks.map((w) => w.amount))
  const lateCount = due.filter((x) => x.day < now).length
  const soonCount = weeks.reduce((s, w) => s + w.n, 0)
  const figures: MaisonFigure[] = [
    { key: 'in30', label: 'Coming in the next 30 days', value: money2(comingIn), help: soonCount ? `${plural(soonCount, 'invoice')} due` : 'No invoice falls due', href: go(c, '/company/reports/finance?report=cashflow&period=this_month') },
    /* a client's lateness stays neutral — red is ours and late only (S-05, his § 2) */
    { key: 'late', label: 'Overdue', value: money2(pastDue), help: lateCount ? `${plural(lateCount, 'invoice')} past their day` : 'Nothing overdue',   /* (the calm UI build 2026-10-27, 1-05 · 1-17) the house word is overdue */ href: go(c, '/company/reports/finance?report=ar') },
    { key: 'out30', label: 'Going out in the next 30 days', value: money2(goingOut), help: 'POs and bills due', href: go(c, '/company/reports/finance?report=ap') },
    ...(monthIn ? [{ key: 'month', label: 'In so far this month', value: monthIn.value, help: 'Client payments', href: go(c, '/company/reports/finance?report=cashflow&period=this_month') }] : []),
  ]
  const words = comingIn
    ? `${money2(comingIn)} is due to come in over the next 30 days${pastDue ? `, and ${money2(pastDue)} is already overdue` : ''}. ${money2(goingOut)} is due to go out.`
    : pastDue ? `Nothing more falls due in the next 30 days — ${money2(pastDue)} is overdue.` : 'Nothing is due to come in over the next 30 days, and nothing is overdue.'
  /* the past-due invoices' reminders — each its project's Money with Remind open (`?do=remind`, Money's own step and rule); several fold into
     "Remind · n ▾" (1.0's grouped doors) */
  const late = b.projects.flatMap((p) => p.money.invoices.filter((v) => v.status === 'sent' && v.balanceMinor > 0 && (v.dueAt ?? now) < now).map((v) => ({ p, v })))
    .sort((x, y) => y.v.balanceMinor - x.v.balanceMinor).slice(0, 8)
  return {
    title: 'Cash this month', text: words, figures,
    ...(top > 0 ? { chart: { label: 'Due to come in, a week at a time from today', bars: weeks.map((w) => ({ key: w.key, label: w.label, value: money2(w.amount), share: w.amount / top })) } } : {}),
    doors: [
      { label: 'Open Money in', href: go(c, '/company/finance/money-in'), testId: 'door-money-in' },
      ...late.map(({ p, v }) => ({ label: `Remind ${p.client.split(' ')[0] ?? p.client} · ${v.label ?? v.stageName} · ${money2(v.balanceMinor)}`, href: go(c, `/projects/${p.id}/money?open=${encodeURIComponent(v.id)}&do=remind`), group: 'Remind' })),
      { label: 'Open Cash flow', href: go(c, '/company/reports/finance?report=cashflow&period=this_month') },
    ],
  }
}

/* ── Remind {client} about {quote} ─────────────────────────────────────────────────────────────────────────────────────────────── */

type Waiting = { id: string; leadId: string; number: string; kind: string; sentAt: number | null; viewCount: number; validUntil: number | null; token: string; name: string; phone: string; remindedAt: number | null; remindedBy: string | null }

/** The quotes and variation orders sent to clients this viewer sees, with when each was last reminded. */
export async function waitingQuotes(c: Pick<Ctx, 'viewer'>, leadIds?: string[] | null): Promise<Waiting[]> {
  const visible = await visibleLeadIds(c.viewer)
  const rows = (await db.select({ q: quotes, name: leads.name, phone: leads.phone }).from(quotes).innerJoin(leads, eq(leads.id, quotes.leadId))
    .where(and(eq(quotes.status, 'Sent to Client'), inArray(quotes.kind, ['quote', 'variation']), isNull(quotes.deletedAt), isNull(quotes.archivedAt), isNull(leads.deletedAt),
      ...(leadIds ? [inArray(quotes.leadId, leadIds.length ? leadIds : ['-'])] : []))))
    .filter((r) => !visible || visible.has(r.q.leadId))
  const ids = [...new Set(rows.map((r) => r.q.leadId))]
  const kept = ids.length ? await db.select({ leadId: leadEvents.leadId, at: leadEvents.at, actorId: leadEvents.actorId, detail: leadEvents.detail }).from(leadEvents)
    .where(and(inArray(leadEvents.leadId, ids), eq(leadEvents.kind, 'portal_reminded'))).orderBy(desc(leadEvents.at)) : []
  return rows.map(({ q, name, phone }) => {
    const last = kept.find((k) => (k.detail as { id?: string } | null)?.id === quoteReminderKey(q.id))
    return { id: q.id, leadId: q.leadId, number: q.number, kind: q.kind, sentAt: (q.clientSentAt ?? q.sentAt)?.getTime() ?? null, viewCount: q.clientViewCount ?? 0,
      validUntil: q.validUntil?.getTime() ?? null, token: q.confirmToken || q.id, name: titleCaseName(name), phone, remindedAt: last?.at.getTime() ?? null, remindedBy: last?.actorId ?? null }
  })
}

const firstOf = (name: string) => name.split(' ')[0] ?? name
const sinceWords = (t: number | null, now: number) => { if (t === null) return 'sent'; const d = Math.floor((now - t) / DAY); return d <= 0 ? 'sent today' : d === 1 ? 'sent yesterday' : `sent ${d} days ago` }
const openedWords = (n: number) => (n <= 0 ? 'not opened yet' : n === 1 ? 'opened once' : n === 2 ? 'opened twice' : `opened ${n} times`)

export async function remindClientAnswer(c: Ctx, question: string): Promise<MaisonAnswer> {
  if (c.acct) return { title: 'Not for Accounting', text: ON_LEADS }
  const num = /\b(om|vo)-?\s?(\d+)\b/i.exec(question)
  const wanted = num ? `${num[1]!.toUpperCase()}-${num[2]}` : null
  const named: Named[] = await peopleNamed(c, question)
  const all = await waitingQuotes(c)
  let hits = all
  if (wanted) hits = hits.filter((q) => q.number.toUpperCase() === wanted)
  if (named.length) hits = hits.filter((q) => named.some((n) => n.id === q.leadId))
  if (!hits.length) {
    /* the quote it names isn't waiting on the client: say where it stands, and open it */
    if (wanted || named.length) {
      const visible = await visibleLeadIds(c.viewer)
      const any = (await db.select({ id: quotes.id, number: quotes.number, status: quotes.status, leadId: quotes.leadId, name: leads.name }).from(quotes).innerJoin(leads, eq(leads.id, quotes.leadId))
        .where(and(isNull(quotes.deletedAt), isNull(leads.deletedAt), inArray(quotes.kind, ['quote', 'variation']))).orderBy(desc(quotes.createdAt)))
        .filter((q) => (!visible || visible.has(q.leadId)) && (!wanted || q.number.toUpperCase() === wanted) && (!named.length || named.some((n) => n.id === q.leadId)))
      const one = any[0]
      if (one) {
        const who = firstOf(titleCaseName(one.name))
        const state = one.status === 'Signed' ? `${who} signed it` : one.status === 'Confirmed' ? `${who} confirmed it` : one.status === 'Draft' ? 'it is still a draft — send it first' : one.status === 'Sent for Approval' ? 'it waits for approval before it goes' : one.status === 'Approved' ? 'it is approved but not sent yet' : `it is ${one.status.toLowerCase()}`
        return { title: `Nothing to remind ${who} about`, text: `${one.number}: ${state}.`, doors: [{ label: `Open ${one.number}`, href: go(c, `/quotes/${one.id}`) }] }
      }
    }
    if (!all.length) return { title: 'No quote waits on a client', text: 'Every quote and variation order you sent has its answer.' }
    return { title: 'Who is it for?', text: 'These wait on the client — pick one:',
      rows: all.sort((a, b) => (a.sentAt ?? 0) - (b.sentAt ?? 0)).slice(0, 8).map((q) => askRow(q.id, `${q.name} · ${q.number}`, `${sinceWords(q.sentAt, c.now)} · ${openedWords(q.viewCount)}`, `Remind ${firstOf(q.name)} about ${q.number}`)) }
  }
  if (hits.length > 1) return { title: `${hits.length} quotes match`, text: 'Which one?', rows: hits.slice(0, 8).map((q) => askRow(q.id, `${q.name} · ${q.number}`, sinceWords(q.sentAt, c.now), `Remind ${q.name} about ${q.number}`)) }
  const q = hits[0]!
  const first = firstOf(q.name)
  const open = { label: `Open ${q.number}`, href: go(c, `/quotes/${q.id}`) }
  const team = await db.select({ id: leadAssignees.memberId }).from(leadAssignees).where(eq(leadAssignees.leadId, q.leadId))
  if (!worksOn(c.viewer, team.map((t) => t.id))) return { title: `${first}’s team reminds them`, text: 'Only the lead’s members, their Manager, Owners and Admins remind the client.', doors: [open] }
  if (q.validUntil !== null && q.validUntil < c.now) return { title: `${q.number} ran out on ${displayDateLong(new Date(q.validUntil))}`, text: `Revise it before reminding ${first} — or extend Valid until if the price still stands.`, doors: [open] }
  if (!q.phone.replace(/\D/g, '')) return { title: `No number for ${first}`, text: `${q.name}’s record has no mobile number — add one on the lead first.`, rows: [row(c, q.leadId, `Open ${q.name}`, undefined, `/leads/${q.leadId}`)] }
  const studio = await fetchStudio().catch(() => null)
  const variation = q.kind === 'variation'
  const lines = [
    `On WhatsApp to ${phoneWords(q.phone)} — change anything before you send it`,
    `${variation ? 'Variation order' : 'Quote'} ${q.number} · ${sinceWords(q.sentAt, c.now)} · ${openedWords(q.viewCount)}`,
    ...(q.remindedAt !== null ? [`Last reminded ${dm(q.remindedAt)}`] : []),
    `It goes on ${first}’s Activity, so the team sees who reminded them`,
  ]
  const text = `A gentle reminder on ${variation ? 'variation order' : 'quote'} ${q.number}, with the link ${first} already has.`
  return {
    title: `Remind ${first} about ${q.number}`, text,
    plan: { title: `Remind ${first} about ${q.number}`, text, lines, confirm: 'Open WhatsApp',
      do: { kind: 'remind_quote', quoteId: q.id, phone: q.phone, number: q.number, client: q.name, first, studio: shortStudioName(studio?.name ?? 'the studio'), token: q.token, variation,
        validUntil: q.validUntil !== null ? displayDateLong(new Date(q.validUntil)) : null } },
  }
}

/* ── {Lead}’s budget vs similar leads ──────────────────────────────────────────────────────────────────────────────────────────── */

export async function compareLeadAnswer(c: Ctx, question: string): Promise<MaisonAnswer> {
  if (c.acct) return { title: 'Not for Accounting', text: ON_LEADS }
  const named = (await peopleNamed(c, question)).filter((n) => !n.direct)
  if (!named.length) return { title: 'Which lead?', text: 'Name the lead — like “Kelvin Goh’s budget vs similar leads”.' }
  if (named.length > 1) return { title: `${named.length} leads with that name`, text: 'Which one?', rows: named.map((n) => askRow(n.id, n.name, n.stage, `${n.name}’s budget vs similar leads`)) }
  const n = named[0]!
  const { fetchLeadRows } = await import('@/lib/leads/queries')
  const visible = await visibleLeadIds(c.viewer)
  const rows = (await fetchLeadRows()).rows.filter((r) => !r.direct && (!visible || visible.has(r.id)))
  const me = rows.find((r) => r.id === n.id)
  if (!me) return { title: 'Nothing to compare', text: `${n.name}’s lead isn’t one you can open.` }
  const like = rows.filter((r) => r.id !== me.id && r.propertyType === me.propertyType)
  const first = firstOf(n.name)
  const kind = me.propertyType || 'this kind of home'
  if (!like.length) return { title: `No other ${kind} leads yet`, text: `${first} is the studio’s first lead for ${kind} — there is nothing to compare with.`, doors: [{ label: `Open ${first}’s lead`, href: go(c, `/leads/${me.id}`) }] }
  const budgets = like.map((r) => r.budgetMinor).filter((v) => v > 0)
  const mid = median(budgets)
  const won = like.filter((r) => r.stage === 'Won')
  const signed = like.length ? await db.select({ leadId: quotes.leadId, amount: quotes.amountMinor, signedAmount: quotes.signedAmountMinor }).from(quotes)
    .where(and(inArray(quotes.leadId, like.map((r) => r.id)), eq(quotes.status, 'Signed'), eq(quotes.kind, 'quote'), isNull(quotes.deletedAt))) : []
  const signedMid = median(signed.map((s) => s.signedAmount ?? s.amount).filter((v) => v > 0))
  const [mine] = await db.select({ amount: quotes.amountMinor, number: quotes.number }).from(quotes).where(and(eq(quotes.leadId, me.id), eq(quotes.kind, 'quote'), isNull(quotes.deletedAt))).orderBy(desc(quotes.createdAt)).limit(1)
  const diff = me.budgetMinor > 0 && mid > 0 ? me.budgetMinor - mid : null
  const text = diff === null ? `${first}’s lead has no budget yet — beside ${plural(like.length, `other ${kind} lead`)}.`
    : diff === 0 ? `${first}’s budget is the median of ${plural(like.length, `other ${kind} lead`)}.`
    : `${first}’s budget is ${moneyCard(Math.abs(diff))} ${diff > 0 ? 'above' : 'below'} the median of ${plural(budgets.length, `other ${kind} lead`)}.`
  return {
    title: `${first} beside similar leads`, text,
    compare: {
      left: first, right: `${plural(like.length, `${kind} lead`)}`,
      rows: [
        { label: 'Budget', left: me.budgetMinor > 0 ? moneyCard(me.budgetMinor) : '--', right: mid > 0 ? `${moneyCard(mid)} median` : '--' },
        { label: 'Stage', left: me.stage, right: `${won.length} of ${like.length} won` },
        { label: 'Quote', left: mine ? moneyCard(mine.amount) : 'None yet', right: signedMid > 0 ? `${moneyCard(signedMid)} median signed` : 'None signed yet' },
        { label: 'Source', left: me.source || '--', right: (() => { const same = like.filter((r) => r.source === me.source).length; return me.source ? `${same} from ${me.source}` : '--' })() },
      ],
      note: 'Every lead you can open for the same kind of home, the studio’s whole record.',
    },
    doors: [{ label: `Open ${first}’s lead`, href: go(c, `/leads/${me.id}`) }],
  }
}
