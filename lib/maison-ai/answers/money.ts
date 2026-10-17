import 'server-only'
import { and, asc, isNotNull, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { expenses } from '@/lib/db/schema'
import { displayDayMonth } from '@/lib/format'
import { seesMoney } from '@/lib/projects/policy'
import { moneyInputOf } from '@/lib/projects/money-queries'
import { moneyOf } from '@/lib/projects/money'
import { money2 } from '@/lib/quotes/math'
import { repeatLabel } from '@/lib/finance/repeats'
import type { MaisonAnswer, MaisonRow } from '@/lib/maison-ai'
import { MONEY_KIND_WORDS, type AskParams, type MoneyKind } from '../intents'
import { NOT_YOURS, askRow, go, plural, reportAnswer, row, seenProjects, type Ctx } from './common'
import { peopleNamed } from './work'

/*
 * (pending modules S10 — cards studio:maison-assistant "money questions answered as reports … changes by chat: invoices, expenses, POs, VOs;
 * record payments", api:maison-bot-assistant "generate the milestone invoices", the steps' notes from S06 ("what repeats" · "stop the rent")
 * and S07 ("use the credit on the next invoice")) The Ask box's money, by rule: Company › Reports › Finance's own reports for the books, and for
 * a change the house form that makes it — Record a payment, a variation order, a one-off invoice, a PO, a bill, an expense, the next stage
 * invoice — opened on its project with what the question gave filled in (`/projects/<id>/money?…`). Stopping a repeat is the one change
 * proposed here, behind its confirm. Who sees a project's money (`seesMoney`) and Accounting's rules (never a variation order) hold.
 * *(invented copy: every title and line here)*
 */

type Seen = Awaited<ReturnType<typeof seenProjects>>[number]

/** The projects the question is about, whose money this viewer sees: the client it names, else the page's project, else every running one. */
async function moneyProjects(c: Ctx, question: string): Promise<{ list: Seen[]; named: boolean }> {
  const all = (await seenProjects(c, { running: false })).filter((x) => c.books || seesMoney(c.viewer, x.team))
  const people = c.acct ? [] : await peopleNamed(c, question)
  const ids = new Set(people.flatMap((n) => (n.project ? [n.project.id] : [])))
  /* Accounting sees no lead — a client is matched by the project's own name */
  const q = ` ${question.toLowerCase().replace(/[^a-z0-9\s]/g, ' ')} `
  const byName = c.acct ? all.filter((x) => { const f = x.client.toLowerCase().split(/\s+/)[0] ?? ''; return f.length >= 3 && q.includes(` ${f} `) }) : []
  if (ids.size || byName.length) return { list: all.filter((x) => ids.has(x.p.id) || byName.includes(x)), named: true }
  if (c.projectId) return { list: all.filter((x) => x.p.id === c.projectId), named: true }
  return { list: all.filter((x) => x.p.stage !== 'completed'), named: false }
}
const which = (list: Seen[], ask: (x: Seen) => string): MaisonAnswer => ({ title: 'Which project?', text: 'Name the client — or pick one:', rows: list.slice(0, 8).map((x) => askRow(x.p.id, x.p.name, `${x.p.number} · ${x.client}`, ask(x))) })

/* ── record a payment (1.0's record_invoice_payment) ───────────────────────────────────────────────────────────────────────────── */

export async function recordPaymentAnswer(c: Ctx, question: string, p: AskParams): Promise<MaisonAnswer> {
  const { recordsPayments } = await import('@/lib/projects/payments-model')
  const found = await moneyProjects(c, question)
  /* the Money tab's own rule for Record a payment: the project's members, Owners, Admins and Accounting */
  const list = found.list.filter((x) => recordsPayments(c.viewer, x.team)), named = found.named
  if (!list.length) return { title: named && found.list.length ? 'Not yours to record' : named ? 'No project of theirs you can see' : 'No money you can see', text: found.list.length ? 'A client’s payment is recorded by the project’s members, Owners, Admins and Accounting.' : 'A project’s Money is for its members, their Managers, Owners, Admins and Accounting.' }
  const owing = (await Promise.all(list.map(async (x) => ({ x, m: moneyOf(await moneyInputOf(x.p), c.now) }))))
    .flatMap(({ x, m }) => m.invoices.filter((i) => i.balanceMinor > 0 && (i.state === 'sent' || i.state === 'overdue' || i.state === 'part_paid')).map((i) => ({ x, i })))
    .sort((a, b) => (a.i.sentAt ?? 0) - (b.i.sentAt ?? 0))
  if (!owing.length) return { title: 'Nothing is waiting to be paid', text: named ? `Every sent invoice on ${list[0]!.p.name} is paid.` : 'Every sent invoice on the projects you see is paid — a payment comes in against a sent invoice.' }
  const amount = p.amount ? Math.round(p.amount * 100) : null
  const href = (x: Seen, id: string) => `/projects/${x.p.id}/money?open=${encodeURIComponent(id)}&do=record${amount ? `&amount=${(amount / 100).toFixed(2)}` : ''}`
  const one = named && owing.length === 1 ? owing[0]! : null
  return {
    title: one ? `Record ${amount ? money2(amount) : 'a payment'} from ${one.x.client.split(' ')[0]}` : amount ? `Record ${money2(amount)} — on which invoice?` : 'Record a payment — on which invoice?',
    text: `Record a payment opens on the invoice${amount ? ' with the amount filled in' : ''} — check it, add the reference, then press Record payment. More than is owed becomes the client’s credit.`,
    rows: owing.slice(0, 8).map(({ x, i }) => row(c, i.id, `${i.number ?? i.stageName} · ${x.client}`, `${money2(i.balanceMinor)} owed${i.state === 'overdue' ? ' · overdue' : ''} · ${x.p.number}`, href(x, i.id))),
  }
}

/* ── start a money record (1.0's create_invoice · create_expense · create_purchase_order · create_variation_order · generate_milestone_invoices) ── */

export async function moneyNewAnswer(c: Ctx, question: string, p: AskParams): Promise<MaisonAnswer> {
  const kind: MoneyKind = p.moneyKind ?? 'stage'
  if (kind === 'vo' && c.acct) return { title: 'Not for Accounting', text: 'A variation order changes what was agreed with the client — its project’s members, their Managers, Owners and Admins raise one.' }
  const { list, named } = await moneyProjects(c, question)
  const words = MONEY_KIND_WORDS[kind]
  /* a studio expense — on no project — is Finance's Money out */
  const overhead = kind === 'expense' && c.books ? [row(c, 'overhead', 'A studio expense, on no project', 'Company › Finance › Money out › New expense', '/company/finance/money-out?kind=expenses&new=1')] : []
  const running = list.filter((x) => x.p.stage !== 'completed')
  if (!running.length) return overhead.length ? { title: 'Record an expense', text: 'No running project you can see — record it as the studio’s own.', rows: overhead } : { title: 'No running project you can see', text: 'A project’s Money is for its members, their Managers, Owners, Admins and Accounting.' }
  if (kind === 'stage') {
    const ready = (await Promise.all(running.map(async (x) => ({ x, m: moneyOf(await moneyInputOf(x.p), c.now) }))))
      .flatMap(({ x, m }) => {
        const st = m.stages.find((s) => s.invoice && s.invoice.status === 'draft' && s.invoice.amountMinor > 0 && (s.invoice.state === 'ready' || s.invoice.state === 'awaiting'))
          ?? m.stages.find((s) => !s.invoice || s.invoice.status === 'draft')
        return st ? [{ x, st }] : []
      })
    if (!ready.length) return { title: 'No stage invoice to send', text: named ? 'Every stage of that project is invoiced.' : 'Every running project’s stages are invoiced, or none has a payment schedule yet.' }
    return { title: named && ready.length === 1 ? `The ${ready[0]!.st.name} invoice` : 'The next stage invoices', text: 'A stage invoice is drafted from the payment schedule — it is ready to send once its milestone is begun or done. Open one to send it.',
      rows: ready.slice(0, 8).map(({ x, st }) => {
        const inv = st.invoice
        const isReady = !!inv && inv.amountMinor > 0 && (inv.state === 'ready' || inv.state === 'awaiting')
        const when = st.milestone ? `when ${st.milestone.title} is ${st.milestone.due === 'start' ? 'begun' : 'done'}` : 'by its schedule'
        return row(c, `${x.p.id}:${st.ref}`, `${isReady ? 'Send' : 'Not ready yet ·'} the ${st.name} invoice · ${x.client}`, `${money2(st.nominalMinor)} · ${isReady ? 'ready to send' : `due ${when}`} · ${x.p.number}`,
          `/projects/${x.p.id}/money${inv ? `?open=${encodeURIComponent(inv.id)}${isReady ? '&send=1' : ''}` : ''}`)
      }) }
  }
  if (!named && running.length > 1) return { ...which(running, (x) => `${question} — ${x.client}`), rows: [...overhead, ...which(running, (x) => `${question} — ${x.client}`).rows!] }
  /* a variation order starts as a Draft at once (Money's own New ▾) — so it is proposed, with one button, before it is made */
  if (kind === 'vo') {
    if (running.length > 1) return which(running, (x) => `Raise a variation order for ${x.p.name}`)
    const x = running[0]!
    return { title: `Start a variation order on ${x.p.name}`, text: `A Draft variation order for ${x.client.split(' ')[0]} — it opens in the quote editor to fill in, and reaches them only when you send it.`,
      plan: { title: `Start a variation order on ${x.p.name}`, text: `A Draft variation order for ${x.client.split(' ')[0]} — it opens in the quote editor to fill in, and reaches them only when you send it.`,
        lines: [`${x.p.number} · ${x.client}`, 'Numbered when it is made — delete the Draft if you change your mind'], confirm: 'Start the variation order', do: { kind: 'variation', projectId: x.p.id } } }
  }
  return { title: `Start ${words}`, text: `${words.charAt(0).toUpperCase()}${words.slice(1)} opens on the project’s Money — fill it in there and save; nothing is made until you do.`,
    rows: [...running.slice(0, 6).map((x) => row(c, x.p.id, `${words.charAt(0).toUpperCase()}${words.slice(1)} on ${x.p.name}`, `${x.p.number} · ${x.client}`, `/projects/${x.p.id}/money?new=${kind}`)), ...overhead] }
}

/* ── a client's credit (pending modules S07 — "use the credit on the next invoice") ──────────────────────────────────────────── */

export async function creditNotesAnswer(c: Ctx, question: string): Promise<MaisonAnswer> {
  const { list, named } = await moneyProjects(c, question)
  if (!list.length) return { title: 'No money you can see', text: 'A project’s Money is for its members, their Managers, Owners, Admins and Accounting.' }
  /* the money model's own held credits (lib/projects/money.ts `held`): used on later invoices, refunded, what is left */
  const left = (await Promise.all(list.map(async (x) => ({ x, m: moneyOf(await moneyInputOf(x.p), c.now) }))))
    .flatMap(({ x, m }) => (m.held ?? []).filter((h) => h.heldMinor > 0).map((h) => ({ id: h.id, number: h.number, projectId: x.p.id, left: h.heldMinor })))
  if (!left.length) return { title: 'No credit is waiting', text: named ? 'That client has no credit held from an overpayment.' : 'No client has a credit held from an overpayment.' }
  const proj = (id: string) => list.find((x) => x.p.id === id)!
  return { title: `${plural(left.length, 'credit')} to use`, text: 'Paid beyond what was owed and held as the client’s credit. Open one: it goes on the oldest invoice that owes, with Undo — or refund it from its row.',
    rows: left.map((h) => row(c, h.id, `Use ${money2(h.left)} credit · ${proj(h.projectId).client}`, `${h.number} · ${proj(h.projectId).p.number}`, `/projects/${h.projectId}/money?open=${encodeURIComponent(h.id)}&do=use`)) }
}

/* ── expenses that repeat (pending modules S06) ─────────────────────────────────────────────────────────────────────────────────── */

async function liveRepeats(c: Ctx) {
  const rows = await db.select({ id: expenses.id, projectId: expenses.projectId, description: expenses.description, amountMinor: expenses.amountMinor, every: expenses.repeatEvery, next: expenses.repeatNext, category: expenses.category })
    .from(expenses).where(and(isNull(expenses.deletedAt), isNull(expenses.repeatOf), isNotNull(expenses.repeatEvery), isNull(expenses.repeatStoppedAt))).orderBy(asc(expenses.description))
  const seen = new Set((await seenProjects(c)).filter((x) => c.books || seesMoney(c.viewer, x.team)).map((x) => x.p.id))
  return rows.filter((r) => (r.projectId ? seen.has(r.projectId) : c.books))
}
const expenseHref = (r: { id: string; projectId: string | null }) => (r.projectId ? `/projects/${r.projectId}/money?open=${encodeURIComponent(r.id)}` : `/company/finance/money-out?kind=expenses&open=${encodeURIComponent(r.id)}`)

export async function repeatsAnswer(c: Ctx): Promise<MaisonAnswer> {
  if (!c.books) return { title: 'Owners, Admins and Accounting only', text: NOT_YOURS }
  const rows = await liveRepeats(c)
  if (!rows.length) return { title: 'Nothing repeats', text: 'An expense set to repeat — rent, software, a retainer — is logged by itself on its day, and shows here.', link: { label: 'Open Money out', href: go(c, '/company/finance/money-out?kind=expenses') } }
  const monthly = rows.reduce((s, r) => s + (r.every === 'week' ? r.amountMinor * 52 / 12 : r.every === 'quarter' ? r.amountMinor / 3 : r.every === 'year' ? r.amountMinor / 12 : r.amountMinor), 0)
  return { title: `${plural(rows.length, 'expense')} repeat${rows.length === 1 ? 's' : ''}`, text: `About ${money2(Math.round(monthly))} a month between them. Open one to change it, or ask “Stop the …” to stop it.`,
    rows: rows.map((r) => row(c, r.id, r.description, `${money2(r.amountMinor)} · ${repeatLabel(r.every as never)}${r.next ? ` · next ${displayDayMonth(r.next)}` : ''}`, expenseHref(r))),
    link: { label: 'Open Money out', href: go(c, '/company/finance/money-out?kind=expenses') } }
}

export async function stopRepeatAnswer(c: Ctx, question: string): Promise<MaisonAnswer> {
  if (!c.books) return { title: 'Owners, Admins and Accounting only', text: NOT_YOURS }
  const rows = await liveRepeats(c)
  const STOP = new Set(['stop', 'cancel', 'end', 'pause', 'halt', 'the', 'repeat', 'repeating', 'recurring', 'monthly', 'weekly', 'yearly', 'expense', 'our', 'my', 'please'])
  const qw = question.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length >= 3 && !STOP.has(w))
  const hits = rows.filter((r) => { const d = ` ${`${r.description} ${r.category}`.toLowerCase().replace(/[^a-z0-9\s]/g, ' ')} `; return qw.some((w) => d.includes(` ${w}`)) })
  if (hits.length === 1) {
    const r = hits[0]!
    return { title: `Stop repeating ${r.description}`, text: 'Nothing more is logged from today; what was already logged stays. Undo starts it again.',
      plan: { title: `Stop repeating ${r.description}`, text: 'Nothing more is logged from today; what was already logged stays. Undo starts it again.', lines: [`${money2(r.amountMinor)} · ${repeatLabel(r.every as never)}`, r.next ? `The next was due ${displayDayMonth(r.next)}` : 'No next day set'], confirm: 'Stop repeating',
        do: { kind: 'stop_repeat', expenseId: r.id, title: r.description } } }
  }
  const pick = hits.length ? hits : rows
  if (!pick.length) return { title: 'Nothing repeats', text: 'No expense is set to repeat.' }
  return { title: hits.length ? `${hits.length} repeating expenses match` : 'No repeating expense matches', text: hits.length ? 'Which one?' : 'These repeat — pick the one to stop:', rows: pick.slice(0, 8).map((r) => askRow(r.id, r.description, `${money2(r.amountMinor)} · ${repeatLabel(r.every as never)}`, `Stop repeating ${r.description}`)) }
}

/* ── the reports (1.0's get_pl_report · get_cash_flow_forecast · get_expense_report · get_soa_report) ──────────────────────────── */

const periodOf = (q: string): string => {
  const s = q.toLowerCase()
  if (/\blast month\b/.test(s)) return 'last_month'
  if (/\bthis month\b|\bmonth\b/.test(s)) return 'this_month'
  if (/\blast quarter\b/.test(s)) return 'last_quarter'
  if (/\bquarter\b/.test(s)) return 'this_quarter'
  if (/\blast year\b/.test(s)) return 'last_year'
  if (/\ball time\b|\bever\b/.test(s)) return 'all'
  return 'this_year'
}
export const pnlAnswer = (c: Ctx, question: string) => reportAnswer(c, 'pl', periodOf(question), { table: 'costs', label: ['line'], meta: ['amount'], rows: 5, bars: 'amount' })
export const cashflowAnswer = (c: Ctx) => reportAnswer(c, 'cashflow', 'this_year', { table: 'ahead', label: ['when'], meta: ['in', 'out', 'net'], rows: 5, bars: 'in', named: true, title: 'Cash flow — the next 90 days' })
export const expensesAnswer = (c: Ctx, question: string) => reportAnswer(c, 'expenses', periodOf(question), { table: 'categories', label: ['category'], meta: ['total', 'count'], rows: 6, bars: 'total' })
export const ageingAnswer = (c: Ctx) => reportAnswer(c, 'ar', 'all', { title: 'Owed to the studio, by how late', table: 'buckets', label: ['bucket'], meta: ['amount', 'count'], rows: 5, bars: 'amount', named: true })

export async function statementAnswer(c: Ctx, question: string): Promise<MaisonAnswer> {
  if (!c.books) return { title: 'Owners, Admins and Accounting only', text: NOT_YOURS }
  const { list, named } = await moneyProjects(c, question)
  if (!named) return which(list, (x) => `Statement for ${x.client}`)
  if (list.length > 1) return which(list, (x) => `Statement for ${x.p.name}`)
  if (!list.length) return { title: 'No project of theirs you can see', text: 'A statement is drawn from one project’s invoices, payments and credit notes.' }
  const x = list[0]!
  return reportAnswer(c, 'statement', 'all', { projectId: x.p.id, title: `Statement · ${x.p.name}`, table: 'lines', label: ['what', 'ref'], meta: ['charge', 'credit', 'balance'], rows: 8, named: true })
}

/* ── AI credits and the plan (1.0's credits — no chat question was ever metered) ─────────────────────────────────────────────── */

export async function creditsAnswer(c: Ctx, question: string): Promise<MaisonAnswer> {
  const { fetchCreditSummary } = await import('@/lib/credits/queries')
  const { fmtCredits, runOutAt } = await import('@/lib/credits/model')
  const s = await fetchCreditSummary(c.now)
  const q = question.toLowerCase()
  const link = c.acct ? undefined : { label: 'Open Plan & AI credits', href: go(c, '/company/plan') }
  const refresh = new Date(s.periodEnd).toLocaleDateString('en-SG', { day: 'numeric', month: 'long' })
  if (/\bwho\b[^.?!]{0,20}\b(used|uses|spent|most)\b/.test(q)) {
    /* (S42 D-13) "AI credits" — the house word, every time */
    if (s.balance === null) return { title: 'Owners and Admins see who used what', text: `You have used ${fmtCredits(s.memberUsed)} AI credits this month${s.memberCap != null ? ` of your ${fmtCredits(s.memberCap)}` : ''}.`, link }
    const { fetchUsage } = await import('@/lib/credits/queries')
    const u = await fetchUsage('this', c.now)
    const used = u.members.filter((m) => m.used > 0).sort((a, b) => b.used - a.used)
    const top = used[0]?.used ?? 0
    return { title: used.length ? `${used[0]!.name.split(' ')[0]} used the most this month` : 'Nobody has used AI credits this month', text: 'This month’s AI credits, by member — renders and quote reads.',
      rows: used.slice(0, 8).map((m) => ({ ...row(c, m.id, m.name, `${fmtCredits(m.used)} AI credits · ${[m.renders ? plural(m.renders, 'render') : null, m.quotes ? plural(m.quotes, 'quote read') : null].filter(Boolean).join(' · ') || 'nothing yet'}`, '/company/plan'), share: top ? m.used / top : 0 })), link }
  }
  if (/\b(refresh|refreshes|reset|resets|renew|renews|top up again)\b/.test(q)) return { title: `They refresh on ${refresh}`, text: s.balance === null
      ? `The studio’s month of AI credits starts again then — ${s.owner.name} manages them. You have used ${fmtCredits(s.memberUsed)} AI credits this month.`
      : `${fmtCredits(s.balance)} left now. On ${refresh} the plan’s ${fmtCredits(s.allowance ?? 0)} for the month arrive; top-ups never run out.`, link }
  if (s.balance === null) return { title: `You have used ${fmtCredits(s.memberUsed)} AI credits this month`, text: `${s.memberCapRemaining != null ? `${fmtCredits(s.memberCapRemaining)} left of your monthly amount. ` : ''}The studio’s AI credits refresh on ${refresh} — ${s.owner.name} manages them.`, link }
  const out = runOutAt({ used: s.usedThisPeriod ?? 0, balance: s.balance, periodStart: s.periodStart, periodEnd: s.periodEnd, now: c.now })
  const rows: MaisonRow[] = [
    row(c, 'plan', `${fmtCredits(s.planCredits ?? 0)} from the plan · ${fmtCredits(s.topupCredits ?? 0)} top-up`, `Top-ups never run out`, null),
    row(c, 'used', `${fmtCredits(s.usedThisPeriod ?? 0)} used this month`, `Of ${fmtCredits(s.allowance ?? 0)} on ${s.planName}`, null),
  ]
  return { title: `${fmtCredits(s.balance)} AI credits left`, text: out ? `At this month’s pace they run out around ${new Date(out).toLocaleDateString('en-SG', { day: 'numeric', month: 'long' })} — before they refresh on ${refresh}.` : `At this month’s pace they last until they refresh on ${refresh}.`, rows, link }
}

export async function planAnswer(c: Ctx, question: string): Promise<MaisonAnswer> {
  const { fetchCreditSummary } = await import('@/lib/credits/queries')
  const { planRow, priceFor, sgd, suggestedPlan, yearlySaving, planBlock } = await import('@/lib/credits/plans')
  const s = await fetchCreditSummary(c.now)
  const now = planRow(s.planId)
  const link = c.acct ? undefined : { label: 'Open Plan & billing', href: go(c, '/company/plan/billing') }
  if (/\bannual(ly)?\b|\byearly\b|\bper year\b/.test(question.toLowerCase())) {
    if (now.id === 'free') return { title: 'Free has nothing to save', text: 'Annual saves a month’s price on Pro — one month free a year.', link }
    const save = yearlySaving(now, s.seats)
    return { title: `Annual would save ${sgd(save)} a year`, text: `${now.name} at ${s.seats} ${s.seats === 1 ? 'seat' : 'seats'}: ${sgd(priceFor(now, s.seats, 'monthly'))} a month, or ${sgd(priceFor(now, s.seats, 'yearly'))} a year — one month free.${s.billingCycle === 'yearly' ? ' You already pay yearly.' : ''}`, link }
  }
  const fit = planRow(suggestedPlan(s.activeMembers))
  const block = planBlock(now, s.activeMembers)
  return { title: fit.id === now.id ? `${now.name} fits you` : `${fit.name} fits ${s.activeMembers === 1 ? 'one person' : `${s.activeMembers} members`}`,
    text: `${block ? `${block} ` : ''}You are on ${now.name}. For ${s.activeMembers === 1 ? 'one person' : 'a team'}, ${fit.name} — ${fit.creditAllowance.toLocaleString('en-SG')} AI credits a seat each month. Max is arranged through Talk to us.`, link }
}
