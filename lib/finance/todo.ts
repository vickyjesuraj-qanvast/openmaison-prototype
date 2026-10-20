/**
 * (simplify S-10 · Q-07, his "build everything" 2026-10-09; F1 §6.3) Company › Finance › **To do** — what the money needs from you, each with its
 * action on the row. Pure and client-safe: it READS the summaries the server already builds — `costsOf` (lib/finance/costs.ts) for money out,
 * `moneyOf` (lib/projects/money.ts) for money in, `commissionsOf` (lib/finance/commission.ts), the Xero pushes that failed — and adds no number of
 * its own. The screen (components/finance/todo/todo-workspace.tsx) and the tab's count (and the rail's money badge, S-16) read the same rows.
 *
 * Owners and Admins (they approve and pay — F1-Q3 · F2-Q8):
 *  - **To approve** — POs waiting for approval, expenses and claims waiting, client invoices waiting (owned by the project's Money — a door),
 *    commission asks. Each says who asked and when, and what to know (over the limit · an advance · what it leaves against the quote).
 *  - **To pay** — every unpaid supplier bill (a bill on a PO is the debt once: its row, and the PO's row only for what is not billed yet), a PO's
 *    advance and balance, claims to pay back, commission owed (a row per member). Sorted by the day it is due; red only when it is past its day —
 *    the one lateness that is ours to fix (S-05).
 *  - **To collect** (Q-07) — client invoices past their due day, a client's payment to confirm, a trusted proof to check, an invoice ready for over
 *    a week. Listed here, owned by the project's Money (its rows open there). The client's lateness is neutral (S-05).
 *  - **Stuck** — waiting on someone else: PO Drafts older than a week, vendors who asked for changes or declined, pushes to Xero that failed.
 * A Manager or a Designer: their own rows only — their Drafts, what was sent back to them, vendors who answered on their projects, their claims —
 * and no figure beyond their own records (Q-20).
 */
import { money2 } from '@/lib/quotes/math'
import { calendarDaysBetween, dayWords, displayDate } from '@/lib/format'
import type { InvoiceState } from '@/lib/projects/money'
import { binds, termsLabel, type VendorRecord } from './model'
import { costEntities, payable, type CostSummary } from './costs'
import { ruleWords, type CommissionAsk, type CommissionLine } from './commission'
import { billWaitWords, type CostRules } from './rules'
import type { XeroKind } from './xero'
import type { FinanceData } from './queries'

const DAY = 86_400_000
/** (F2's Stuck rule, kept) A Draft or a ready invoice untouched this long is stuck. */
export const STUCK_DAYS = 7

/* ── What the server hands in ──────────────────────────────────────────────────────────────────────────────────────────────────── */

/** A client invoice as To collect / To approve read it — the fields of `moneyOf`'s InvoiceView they need, nothing recomputed. */
export type TodoInvoice = {
  id: string; label: string | null; stageName: string; state: InvoiceState
  amountMinor: number; balanceMinor: number; overdueMinor: number; dueAt: number | null; readySince: number | null
  submittedBy: string | null; submittedAt: number | null; toConfirmMinor: number; uncheckedMinor: number; paidMinor: number
  remindedCount: number; lastRemindedAt: number | null
  /** (parity map, MO-079 · FB-105) the entity it is raised under (null = the project's / the studio's own) */ entity?: string | null
}
/** A client's payment waiting for the confirmer (or trusted and not yet checked). */
export type TodoPayment = { id: string; invoiceId: string; amountMinor: number; paidOn: number; trusted: boolean; by: string; reference: string | null }
/** One project's money in, for an Owner or an Admin. */
export type TodoMoney = {
  projectId: string; number: string; name: string; client: string; phone: string
  /** The client's portal page when they were invited (the reminder points there), else null. */ portalUrl: string | null
  invoices: TodoInvoice[]; pending: TodoPayment[]
  /** (parity map, MO-079) the entity its signed quote is issued under (null = the studio's own) */ entity?: string | null
}
export type TodoCommission = { asks: CommissionAsk[]; lines: CommissionLine[] }
export type TodoXero = { kind: XeroKind; id: string; label: string; amountMinor: number | null; error: string }
export type TodoInput = {
  costs: CostSummary
  vendors: VendorRecord[]
  people: { id: string; name: string }[]
  projects: { id: string; name: string; prepares: boolean; /** (parity map, MO-079) its signed quote's entity */ entity?: string | null }[]
  rules: CostRules
  viewer: { id: string; runs: boolean; pays: boolean; approvesPo: boolean; approvesExpense: boolean; seesFigures: boolean
    /** (parity map, MO-098) a client invoice's and a commission ask's approval — Owners and Admins; unset = as `approvesPo` */ approvesInvoices?: boolean; answersAsks?: boolean }
  money: TodoMoney[]
  commission: TodoCommission | null
  xero: TodoXero[]
  now: number
}

/** What the To do screen is handed by the server (lib/finance/todo-server.ts). */
export type TodoData = {
  finance: FinanceData
  money: TodoMoney[]
  commission: TodoCommission | null
  xero: TodoXero[]
  now: number
  /** (parity map, MO-084 · FB-009) money in's latest records for Recently — invoices sent, client payments, variation orders, credit notes
      (Owners and Admins; empty otherwise). Money out's come from `finance.summary`. */
  recentIn?: RecentRow[]
  /** (pending modules S06) whether the viewer's ready invoice goes to the client at once (false: it waits for an Owner's or an Admin's approval —
      the row's button says Submit for approval) */
  sendsNow?: boolean
}
/** The builder's input from the screen's data — the server's count and the screen read the same rows. */
export const todoInputOf = (d: TodoData): TodoInput => ({
  costs: d.finance.summary, vendors: d.finance.vendors, people: d.finance.people, projects: d.finance.projects, rules: d.finance.rules,
  viewer: { id: d.finance.viewer.id, runs: d.finance.viewer.runs, pays: d.finance.viewer.pays, approvesPo: d.finance.viewer.approvesPo, approvesExpense: d.finance.viewer.approvesExpense, seesFigures: d.finance.viewer.seesFigures,
    approvesInvoices: d.finance.viewer.approvesInvoices, answersAsks: d.finance.viewer.answersAsks },
  money: d.money, commission: d.commission, xero: d.xero, now: d.now,
})

/* ── The rows ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────── */

export type TodoGroupKey = 'approve' | 'pay' | 'collect' | 'stuck' | 'drafts' | 'sent_back' | 'answered' | 'claims'
  /** (parity map, MO-098) what waits for an Owner's or an Admin's OK, for the books' keeper who approves nothing — each row says why */ | 'waiting'
export type TodoKind =
  | 'po' | 'bill' | 'po_balance' | 'expense' | 'claim'       // money out — the record's own steps (useCosts)
  | 'invoice'                                                 // a client invoice waiting for approval — the project's Money
  | 'confirm' | 'check' | 'remind' | 'send'                   // money in — the Money tab's own steps
  | 'ask' | 'commission'                                      // commission
  | 'xero'                                                    // a push that failed
export type TodoRow = {
  /** Unique on the page. */ key: string
  group: TodoGroupKey; kind: TodoKind
  /** The record the row stands for — what `?open=` names (a PO, a bill, an expense, an invoice, a payment, an ask, a member, a Xero item). */ ref: string
  /** The first column: what (To approve, Stuck, a member's) — who (To pay, To collect). */ title: string; sub: string | null
  /** To pay's For · To collect's Invoice. */ about: string | null
  projectId: string | null; project: string
  /** To approve: who asked and on which day (F1 §6.9.7 — "Asked", never "Since"). */ asker: string | null; askedAt: number | null
  /** To pay · To collect: the day it is due (or the day a client says they paid) and those words. */ due: number | null; dueWords: string | null
  /** Past its day and ours to fix — the only red (S-05). */ late: boolean
  /** Stuck and a member's groups: when it stopped moving, as words ("Started 28 Sep"). */ when: string | null
  amountMinor: number | null; amountSub: string | null
  /** What to know before acting. */ know: string | null
  /** The invoice a money-in row is on (its project's Money opens on it). */ invoiceId?: string
  /** To collect: the invoice is past its due day — said in the head's sum, never in red (the client's lateness, S-05). */ pastDue?: boolean
  /** Lower-cased words the search reads. */ hay: string
  /** (parity map, MO-079 · FB-105) the issuing entity the row's record is under (null = the studio's own) — the Issued by scope and chip */
  entity: string | null
}

export const RUNNER_GROUPS: TodoGroupKey[] = ['approve', 'pay', 'collect', 'stuck']
export const MEMBER_GROUPS: TodoGroupKey[] = ['drafts', 'sent_back', 'answered', 'claims']
/** (parity map, MO-098 · FR-040) Accounting's To do: what they do — pay, collect, unstick — then what waits for an Owner or an Admin. */
export const BOOKS_GROUPS: TodoGroupKey[] = ['pay', 'collect', 'stuck', 'waiting']
/** The groups a viewer's To do draws: a runner's (who approves), the books' keeper's (who approves nothing) or a member's. */
export const todoGroupsFor = (v: Pick<TodoInput['viewer'], 'runs' | 'approvesPo'>): TodoGroupKey[] => (!v.runs ? MEMBER_GROUPS : v.approvesPo ? RUNNER_GROUPS : BOOKS_GROUPS)
/** (parity map, MO-098) The row's words for what an Owner or an Admin approves — Accounting reads them where the button would be. */
export const WAITING_WHY = { po: 'An Owner or an Admin approves purchase orders', expense: 'An Owner or an Admin approves expenses', invoice: 'An Owner or an Admin approves invoices', ask: 'An Owner or an Admin answers commission asks',
  /* (S44R — UAT row 361, call C8) invented copy */ bill: 'An Owner or an Admin approves this bill before it is paid' } as const
/** Each group's words (invented copy, simplify Q-12): its title, its chip and what its head says with nothing in it. */
export const TODO_GROUP: Record<TodoGroupKey, { title: string; chip: string; empty: string }> = {
  approve: { title: 'To approve', chip: 'To approve', empty: 'Nothing to approve' },
  pay: { title: 'To pay', chip: 'To pay', empty: 'Nothing to pay' },
  collect: { title: 'To collect', chip: 'To collect', empty: 'Nothing to collect' },
  stuck: { title: 'Stuck', chip: 'Stuck', empty: 'Nothing is stuck' },
  drafts: { title: 'Your drafts', chip: 'Your drafts', empty: 'No drafts' },
  sent_back: { title: 'Sent back to you', chip: 'Sent back', empty: 'Nothing sent back' },
  answered: { title: 'Vendors who answered', chip: 'Vendors answered', empty: 'No vendor is waiting on a change' },
  claims: { title: 'Your claims', chip: 'Your claims', empty: 'No claims waiting' },
  waiting: { title: 'Waiting for approval', chip: 'Waiting for approval', empty: 'Nothing is waiting for approval' },   // (parity map, MO-098) invented copy
}

const short = (ms: number) => displayDate(new Date(ms)).replace(/ ’\d\d$/, '')
/** "30 Sep · 9 days late" · "Today" · "9 Oct · in 2 days" · "12 Nov". A day is late from the day after it (costsOf's and moneyOf's rule). */
export function dueWordsOf(due: number, now: number): { words: string; late: boolean } {
  const days = calendarDaysBetween(due, now)
  if (days >= 1) return { words: `${short(due)} · ${dayWords(days)} late`, late: true }
  if (days === 0) return { words: 'Today', late: false }
  return { words: -days <= 7 ? `${short(due)} · in ${dayWords(-days)}` : short(due), late: false }
}

export function todoRows(i: TodoInput): TodoRow[] {
  const out: TodoRow[] = []
  const s = i.costs
  const vname = (id: string | null) => i.vendors.find((v) => v.id === id)?.name ?? 'A vendor'
  const person = (id: string | null) => (id ? i.people.find((p) => p.id === id)?.name ?? 'Someone' : 'Someone')
  const first = (id: string | null) => person(id).split(/\s+/)[0] ?? person(id)
  const pname = (id: string | null) => (id ? i.projects.find((p) => p.id === id)?.name ?? i.money.find((m) => m.projectId === id)?.name ?? 'A project' : 'Studio overhead')
  const prepares = (id: string) => i.projects.find((p) => p.id === id)?.prepares ?? false
  type Draft = Omit<TodoRow, 'hay' | 'about' | 'asker' | 'askedAt' | 'due' | 'dueWords' | 'late' | 'when' | 'amountSub' | 'know' | 'entity'> & Partial<TodoRow>
  /* (parity map, MO-079) each row's issuing entity: a cost record's own (costEntities), an invoice's, else its project's */
  const projectEntity = (id: string | null) => (id ? i.projects.find((p) => p.id === id)?.entity ?? i.money.find((m) => m.projectId === id)?.entity ?? null : null)
  const ent = costEntities(s, projectEntity)
  const entityOfRow = (r: Draft): string | null => {
    if (r.kind === 'po' || r.kind === 'po_balance') { const p = s.pos.find((x) => x.id === r.ref); return p ? ent.po(p) : projectEntity(r.projectId) }
    if (r.kind === 'bill') { const b = s.bills.find((x) => x.id === r.ref); return b ? ent.bill(b) : projectEntity(r.projectId) }
    if (r.kind === 'expense' || r.kind === 'claim') { const e = s.expenses.find((x) => x.id === r.ref); return e ? ent.expense(e) : projectEntity(r.projectId) }
    if (r.invoiceId) { const inv = i.money.find((m) => m.projectId === r.projectId)?.invoices.find((v) => v.id === r.invoiceId); return inv?.entity ?? projectEntity(r.projectId) }
    return projectEntity(r.projectId)
  }
  const push = (r: Draft, into: TodoRow[] = out) => {
    const row: TodoRow = { about: null, asker: null, askedAt: null, due: null, dueWords: null, late: false, when: null, amountSub: null, know: null, entity: entityOfRow(r), ...r, hay: '' }
    row.hay = [row.title, row.sub, row.about, row.project, row.asker, row.know, row.amountMinor === null ? '' : money2(row.amountMinor)].filter(Boolean).join(' ').toLowerCase()
    into.push(row)
  }
  const me = i.viewer
  const old = (at: number | null) => !!at && i.now - at >= STUCK_DAYS * DAY

  if (me.runs) {
    /* ── To approve ── (parity map, MO-098) a runner who approves nothing — Accounting — reads the same rows under Waiting for approval, the
       rule where the button would be */
    const approves = { po: me.approvesPo, expense: me.approvesExpense, invoice: me.approvesInvoices ?? me.approvesPo, ask: me.answersAsks ?? me.approvesPo, bill: me.approvesPo }
    const waitingRow = (kind: keyof typeof WAITING_WHY, r: Draft): Draft => (approves[kind] ? r : { ...r, key: `wait-${r.key}`, group: 'waiting', know: [WAITING_WHY[kind], r.know].filter(Boolean).join(' · ') })
    for (const po of s.pos) {
      if (po.state !== 'awaiting') continue
      const know = [
        i.rules.poApproval && po.totalMinor > i.rules.poLimitMinor ? `Over ${money2(i.rules.poLimitMinor)}` : null,
        po.advanceMinor > 0 ? `Asks for a ${money2(po.advanceMinor)} advance` : null,
        po.againstQuote ? (po.againstQuote.leftMinor >= 0 ? `Leaves ${po.againstQuote.pct}% against the quote` : `${money2(-po.againstQuote.leftMinor)} over what the client pays for its lines`) : null,
      ].filter(Boolean).join(' · ')
      push(waitingRow('po', { key: `po-${po.id}`, group: 'approve', kind: 'po', ref: po.id, title: `${po.number} to ${vname(po.vendorId)}`, sub: po.title, projectId: po.projectId, project: pname(po.projectId),
        asker: first(po.submittedBy ?? po.createdBy), askedAt: po.submittedAt ?? po.createdAt, amountMinor: po.totalMinor, know: know || null }))
    }
    for (const e of s.expenses) {
      if (e.state !== 'pending') continue
      const receipts = e.receipts.length ? (e.receipts.length === 1 ? 'Receipt attached' : `${e.receipts.length} receipts attached`) : 'No receipt'
      push(waitingRow('expense', { key: `exp-${e.id}`, group: 'approve', kind: 'expense', ref: e.id, title: `“${e.description}”`, sub: e.paidBy === 'member' ? `Claim · ${e.category.toLowerCase()}` : e.category,
        projectId: e.projectId, project: pname(e.projectId), asker: first(e.createdBy), askedAt: e.createdAt, amountMinor: e.amountMinor,
        know: e.paidBy === 'member' ? `${receipts} · ${first(e.claimantId)} is paid back once approved` : receipts }))
    }
    /* (S44R — UAT row 361, call C8, as recommended; REVERSES F1-Q10) a supplier bill over the limit with no PO, or more than its PO by over the
       tolerance, waits here for its OK before anyone pays it — Accounting reads it under Waiting for approval */
    for (const b of s.bills) {
      if (!b.waits) continue
      const po = b.poId ? s.pos.find((x) => x.id === b.poId) ?? null : null
      const know = billWaitWords(b.approvalWhy ?? 'limit', { limitMinor: i.rules.poLimitMinor, po: po ? { number: po.number, totalMinor: po.totalMinor, billedMinor: po.billedMinor } : null }, money2)
      push(waitingRow('bill', { key: `billok-${b.id}`, group: 'approve', kind: 'bill', ref: b.id, title: `${vname(b.vendorId)}’s bill ${b.reference}`, sub: po ? `On ${po.number}` : null,
        projectId: b.projectId, project: pname(b.projectId), asker: first(b.createdBy), askedAt: b.createdAt, amountMinor: b.totalMinor, know }))
    }
    for (const m of i.money) for (const v of m.invoices) {
      if (v.state !== 'awaiting') continue
      const row: Draft = { key: `inv-${v.id}`, group: 'approve', kind: 'invoice', ref: v.id, invoiceId: v.id, title: `The ${v.stageName} invoice to ${m.client.split(/\s+/)[0]}`, sub: 'A client invoice — approved on the project’s Money',
        projectId: m.projectId, project: m.name, asker: v.submittedBy ? first(v.submittedBy) : null, askedAt: v.submittedAt, amountMinor: v.amountMinor }
      push(approves.invoice ? { ...row, know: 'Waiting for your approval before it goes to the client' } : waitingRow('invoice', row))
    }
    for (const a of i.commission?.asks ?? []) {
      if (a.status !== 'open') continue
      const line = i.commission?.lines.find((l) => l.projectId === a.projectId && l.memberId === a.memberId)
      push(waitingRow('ask', { key: `ask-${a.id}`, group: 'approve', kind: 'ask', ref: a.id, title: `${first(a.memberId)} asks for ${ruleWords(a)}`, sub: `“${a.reason}”`, projectId: a.projectId, project: pname(a.projectId),
        asker: first(a.memberId), askedAt: a.createdAt, amountMinor: null, know: line ? `Today: ${line.words}` : null }))
    }

    /* ── To pay ── (the debt once: a bill on a PO carries what it billed; the PO's row only what is not billed yet) */
    if (me.pays) {
      const pay: TodoRow[] = []
      const into = (r: Draft) => push(r, pay)
      const billOf = (id: string) => s.bills.find((b) => b.id === id)
      for (const po of s.pos) {
        if (!binds(po.state) || po.state === 'closed' || po.balanceMinor <= 0) continue
        const onIt = po.billIds.map(billOf).filter((b): b is NonNullable<typeof b> => !!b && b.balanceMinor > 0)
        const unpaid = onIt.filter((b) => !b.waits)   // (S44R, C8) a bill waiting for its OK is To approve's, never To pay's
        const held = onIt.filter((b) => b.waits).reduce((x, b) => x + b.balanceMinor, 0)
        for (const b of unpaid) {
          const d = b.dueOn ? dueWordsOf(b.dueOn, i.now) : null
          into({ key: `bill-${b.id}`, group: 'pay', kind: 'bill', ref: b.id, title: vname(b.vendorId), sub: null, about: `Bill ${b.reference} · ${po.number}`, projectId: b.projectId, project: pname(b.projectId),
            due: b.dueOn, dueWords: d?.words ?? null, late: !!d?.late && b.overdueMinor > 0, amountMinor: b.balanceMinor })
        }
        const rest = Math.max(0, po.balanceMinor - unpaid.reduce((x, b) => x + b.balanceMinor, 0) - held)
        if (!rest) continue
        const owed = payable({ po, bills: s.bills })
        const advance = owed.advanceDueMinor > 0
        const d = !unpaid.length && !po.billIds.length && po.dueOn ? dueWordsOf(po.dueOn, i.now) : null
        into({ key: `pob-${po.id}`, group: 'pay', kind: 'po_balance', ref: po.id, title: vname(po.vendorId), sub: null,
          about: `${po.number} ${advance ? 'advance' : po.billIds.length ? 'not billed yet' : 'balance'}`, projectId: po.projectId, project: pname(po.projectId),
          due: advance ? po.sentAt : po.billIds.length ? null : po.dueOn, dueWords: advance ? 'On sending' : po.billIds.length ? 'On its next bill' : d?.words ?? termsLabel(po.terms, po.termsText),
          late: !!d?.late && po.overdueMinor > 0, amountMinor: rest, amountSub: advance ? `${money2(owed.advanceDueMinor)} advance first` : null })
      }
      for (const b of s.bills) {
        if (b.poId || b.balanceMinor <= 0 || b.waits) continue   // (S44R, C8) waiting for its OK — To approve's
        const d = b.dueOn ? dueWordsOf(b.dueOn, i.now) : null
        into({ key: `bill-${b.id}`, group: 'pay', kind: 'bill', ref: b.id, title: vname(b.vendorId), sub: null, about: `Bill ${b.reference}`, projectId: b.projectId, project: pname(b.projectId),
          due: b.dueOn, dueWords: d?.words ?? null, late: !!d?.late && b.overdueMinor > 0, amountMinor: b.balanceMinor })
      }
      for (const e of s.expenses) {
        if (e.state !== 'to_pay_back' || e.owedMinor <= 0) continue
        into({ key: `claim-${e.id}`, group: 'pay', kind: 'claim', ref: e.id, title: person(e.claimantId), sub: null, about: `“${e.description}” claim`, projectId: e.projectId, project: pname(e.projectId),
          dueWords: e.reviewedAt ? `Approved ${short(e.reviewedAt)}` : null, amountMinor: e.owedMinor })
      }
      /* commission owed: one row per member — Pay {member} pays their lines oldest first (S-12) */
      const owedBy = new Map<string, CommissionLine[]>()
      for (const l of i.commission?.lines ?? []) if (l.owedMinor > 0) owedBy.set(l.memberId, [...(owedBy.get(l.memberId) ?? []), l])
      for (const [memberId, lines] of owedBy) {
        const n = lines.length
        into({ key: `com-${memberId}`, group: 'pay', kind: 'commission', ref: memberId, title: person(memberId), sub: null, about: 'Commission owed',
          projectId: n === 1 ? lines[0]!.projectId : null, project: n === 1 ? pname(lines[0]!.projectId) : `${n} projects`, amountMinor: lines.reduce((x, l) => x + l.owedMinor, 0) })
      }
      pay.sort((a, b) => (a.due ?? Infinity) - (b.due ?? Infinity))
      out.push(...pay)
    }

    /* ── To collect (Q-07) ── listed here, owned by the project's Money */
    for (const m of i.money) {
      const firstName = m.client.split(/\s+/)[0] ?? m.client
      for (const v of m.invoices) {
        const label = v.label ?? `${v.stageName} invoice`
        const pastDue = !!v.dueAt && i.now >= v.dueAt + DAY
        for (const p of m.pending.filter((x) => x.invoiceId === v.id)) {
          push({ key: `pay-${p.id}`, group: 'collect', kind: p.trusted ? 'check' : 'confirm', ref: p.id, invoiceId: v.id, title: m.client, sub: null,
            about: p.trusted ? `${label} · a proof to check` : `${label} · ${p.by === m.client ? `${firstName} says they paid` : `${p.by} says it was paid`}`,
            projectId: m.projectId, project: m.name, due: p.paidOn, dueWords: `Paid ${short(p.paidOn)}, they say`, amountMinor: p.amountMinor,
            amountSub: p.reference ? `Ref. ${p.reference}` : null, know: p.trusted ? 'It counts already — you trust the client’s proof' : null, pastDue })
        }
        if (v.overdueMinor > 0) {
          const d = v.dueAt ? dueWordsOf(v.dueAt, i.now) : null
          push({ key: `late-${v.id}`, group: 'collect', kind: 'remind', ref: v.id, invoiceId: v.id, title: m.client, sub: v.remindedCount ? `Reminded ${v.remindedCount === 1 ? 'once' : `${v.remindedCount} times`}${v.lastRemindedAt ? `, last ${short(v.lastRemindedAt)}` : ''}` : null,
            about: `${label} · ${v.stageName}`, projectId: m.projectId, project: m.name, due: v.dueAt, dueWords: d?.words ?? null, late: false, amountMinor: v.overdueMinor, pastDue: true })
        }
        if (v.state === 'ready' && v.amountMinor > 0 && old(v.readySince)) {
          push({ key: `ready-${v.id}`, group: 'collect', kind: 'send', ref: v.id, invoiceId: v.id, title: m.client, sub: null, about: `${v.stageName} invoice · ready to send`,
            projectId: m.projectId, project: m.name, due: v.readySince, dueWords: v.readySince ? `Ready since ${short(v.readySince)}` : null, amountMinor: v.amountMinor })
        }
      }
    }

    /* ── Stuck ── waiting on someone else */
    for (const po of s.pos) {
      if (po.state === 'draft' && old(po.createdAt)) {
        push({ key: `draft-${po.id}`, group: 'stuck', kind: 'po', ref: po.id, title: `${po.number} to ${vname(po.vendorId)}`, sub: po.title, projectId: po.projectId, project: pname(po.projectId),
          when: `Started ${short(po.createdAt)}`, amountMinor: po.totalMinor, know: `Still a Draft${po.createdBy ? ` — ${first(po.createdBy)}’s` : ''}` })
      } else if (po.state === 'changes' || po.state === 'declined') {
        push({ key: `ans-${po.id}`, group: 'stuck', kind: 'po', ref: po.id, title: `${vname(po.vendorId)} ${po.state === 'changes' ? 'asked for changes to' : 'declined'} ${po.number}`,
          sub: po.vendorAnswerNote ? `“${po.vendorAnswerNote}”` : null, projectId: po.projectId, project: pname(po.projectId),
          when: po.vendorAnsweredAt ? `Answered ${short(po.vendorAnsweredAt)}` : null, amountMinor: po.totalMinor, know: 'Change it and send it again' })
      }
    }
    for (const x of i.xero) {
      push({ key: `xero-${x.kind}-${x.id}`, group: 'stuck', kind: 'xero', ref: `${x.kind}:${x.id}`, title: `${x.label} didn’t reach Xero`, sub: x.error, projectId: null, project: '--',
        amountMinor: x.amountMinor, know: 'Fix what it says, then Retry' })
    }
    return out
  }

  /* ── A Manager's or a Designer's own ── */
  const mine = (id: string | null) => id === me.id
  for (const po of s.pos) {
    if (po.state === 'draft' && mine(po.createdBy)) {
      push({ key: `draft-${po.id}`, group: 'drafts', kind: 'po', ref: po.id, title: `${po.number} to ${vname(po.vendorId)}`, sub: po.title, projectId: po.projectId, project: pname(po.projectId),
        when: `Started ${short(po.createdAt)}`, amountMinor: po.totalMinor, know: old(po.createdAt) ? `Untouched for over ${dayWords(STUCK_DAYS)}` : null })
    } else if (po.state === 'sent_back' && (mine(po.createdBy) || mine(po.submittedBy))) {
      push({ key: `back-${po.id}`, group: 'sent_back', kind: 'po', ref: po.id, title: `${po.number} to ${vname(po.vendorId)}`, sub: po.reviewNote ? `“${po.reviewNote}”` : null, projectId: po.projectId, project: pname(po.projectId),
        when: po.reviewedAt ? `Sent back ${short(po.reviewedAt)}${po.reviewedBy ? ` by ${first(po.reviewedBy)}` : ''}` : null, amountMinor: po.totalMinor, know: 'Change it and submit it again' })
    } else if ((po.state === 'changes' || po.state === 'declined') && prepares(po.projectId)) {
      push({ key: `ans-${po.id}`, group: 'answered', kind: 'po', ref: po.id, title: `${vname(po.vendorId)} ${po.state === 'changes' ? 'asked for changes to' : 'declined'} ${po.number}`,
        sub: po.vendorAnswerNote ? `“${po.vendorAnswerNote}”` : null, projectId: po.projectId, project: pname(po.projectId),
        when: po.vendorAnsweredAt ? `Answered ${short(po.vendorAnsweredAt)}` : null, amountMinor: po.totalMinor, know: 'Change it and send it again' })
    }
  }
  for (const e of s.expenses) {
    if (e.state === 'sent_back' && mine(e.createdBy)) {
      push({ key: `back-${e.id}`, group: 'sent_back', kind: 'expense', ref: e.id, title: `“${e.description}”`, sub: e.reviewNote ? `“${e.reviewNote}”` : null, projectId: e.projectId, project: pname(e.projectId),
        when: e.reviewedAt ? `Sent back ${short(e.reviewedAt)}${e.reviewedBy ? ` by ${first(e.reviewedBy)}` : ''}` : null, amountMinor: e.amountMinor, know: 'Change it — it waits for approval again' })
    } else if ((e.state === 'pending' || e.state === 'to_pay_back') && (mine(e.createdBy) || mine(e.claimantId))) {
      push({ key: `claim-${e.id}`, group: 'claims', kind: 'claim', ref: e.id, title: `“${e.description}”`, sub: e.paidBy === 'member' ? `Claim · ${e.category.toLowerCase()}` : e.category, projectId: e.projectId, project: pname(e.projectId),
        when: `Logged ${short(e.createdAt)}`, amountMinor: e.amountMinor, know: e.state === 'pending' ? 'Waiting for an Owner or an Admin' : 'Approved — to be paid back' })
    }
  }
  return out
}

/** A group's head line — its sum, said once (the title carries the money, F1 §6.3). */
export function groupLine(key: TodoGroupKey, rows: TodoRow[]): string {
  const n = rows.length
  if (!n) return TODO_GROUP[key].empty
  const total = rows.reduce((x, r) => x + (r.amountMinor ?? 0), 0)
  if (key === 'approve') return `${n} waiting for you${total ? ` · ${money2(total)}` : ''}`
  if (key === 'waiting') return `${n} for an Owner or an Admin${total ? ` · ${money2(total)}` : ''}`   // (parity map, MO-098) invented copy
  if (key === 'pay') { const late = rows.filter((r) => r.late).reduce((x, r) => x + (r.amountMinor ?? 0), 0); return `${money2(total)} to pay${late ? ` · ${money2(late)} overdue` : ''}` }
  if (key === 'collect') {
    const invoices = new Set(rows.map((r) => r.invoiceId ?? r.ref)).size
    const past = rows.filter((r) => r.pastDue).reduce((x, r) => x + (r.amountMinor ?? 0), 0)
    return `${money2(total)} owed on ${invoices} invoice${invoices === 1 ? '' : 's'}${past ? ` · ${money2(past)} overdue` : ''}`
  }
  if (key === 'stuck') return `${n} waiting on someone else`
  if (key === 'claims') return `${n} · ${money2(total)}`
  return `${n} to change${key === 'drafts' ? ' or send' : ''}`
}

/** (S-16) What waits for an Owner's or an Admin's OK — the rail's money badge and the Company panel's "n to approve". */
export const toApproveCount = (rows: TodoRow[]) => rows.filter((r) => r.group === 'approve').length

/* ── (parity map, MO-084 · FB-009) Recently — the studio's newest money records, 1.0's Operations › Overview › Recent activity ─────────────────
   The ten newest records of money in and out — invoices sent, client payments, variation orders, credit notes (money in, Owners and Admins: the
   server hands them in as `recentIn`) and POs, bills, expenses, payments out (money out, from the summary the viewer already reads — a member
   sees their projects' only) — chipped by kind, each opening its record. No number of its own: each row says its record's own amount. */

export type RecentKind = 'invoice' | 'payment' | 'vo' | 'credit' | 'po' | 'bill' | 'expense' | 'paid'
export const RECENT_KIND: Record<RecentKind, string> = { invoice: 'Invoice', payment: 'Payment', vo: 'VO', credit: 'Credit note', po: 'PO', bill: 'Bill', expense: 'Expense', paid: 'Paid out' }
export type RecentRow = {
  key: string; kind: RecentKind
  /** the record a press opens — a PO, a bill, an expense (its panel), an invoice, a payment, a VO, a credit note (the project's Money) */ ref: string
  /** for a payment out: the record its panel opens (its PO, bill or claim) */ opens?: string | null
  title: string; projectId: string | null; project: string; at: number; amountMinor: number | null; entity: string | null
}
export const RECENT_MAX = 10
export const RECENT_SHOWN = 5

export function recentRows(d: TodoData): RecentRow[] {
  const f = d.finance, s = f.summary
  const vname = (id: string | null) => f.vendors.find((v) => v.id === id)?.name ?? 'a vendor'
  const person = (id: string | null) => (id ? f.people.find((p) => p.id === id)?.name ?? 'Someone' : 'Someone')
  const first = (id: string | null) => person(id).split(/\s+/)[0] ?? person(id)
  const pname = (id: string | null) => (id ? f.projects.find((p) => p.id === id)?.name ?? 'A project' : 'Studio overhead')
  const projectEntity = (id: string | null) => (id ? f.projects.find((p) => p.id === id)?.entity ?? null : null)
  const ent = costEntities(s, projectEntity)
  const out: RecentRow[] = [...(d.recentIn ?? [])]
  /* invented copy (parity map, MO-084): one short sentence per record */
  for (const p of s.pos) {
    const at = p.sentAt && !p.external ? Math.max(p.sentAt, p.createdAt) : p.createdAt
    const title = p.external ? `${p.number} recorded — made elsewhere, to ${vname(p.vendorId)}` : p.sentAt ? `${p.number} sent to ${vname(p.vendorId)}` : `${p.number} drafted for ${vname(p.vendorId)}`
    out.push({ key: `po-${p.id}`, kind: 'po', ref: p.id, title, projectId: p.projectId, project: pname(p.projectId), at, amountMinor: p.totalMinor, entity: ent.po(p) })
  }
  for (const b of s.bills) out.push({ key: `bill-${b.id}`, kind: 'bill', ref: b.id, title: `${vname(b.vendorId)}’s bill ${b.reference} recorded`, projectId: b.projectId, project: pname(b.projectId), at: b.createdAt, amountMinor: b.totalMinor, entity: ent.bill(b) })
  for (const e of s.expenses) out.push({ key: `exp-${e.id}`, kind: 'expense', ref: e.id, title: `“${e.description}” logged by ${first(e.createdBy)}`, projectId: e.projectId, project: pname(e.projectId), at: e.createdAt, amountMinor: e.amountMinor, entity: ent.expense(e) })
  for (const p of s.payouts) {
    if (p.reversedAt) continue
    const to = p.kind === 'claim' ? `${first(p.memberId)} paid back` : `Paid ${vname(p.vendorId)}`
    const what = p.kind === 'claim' ? s.expenses.find((x) => x.id === p.expenseId)?.description : p.billId ? `bill ${s.bills.find((x) => x.id === p.billId)?.reference ?? ''}` : s.pos.find((x) => x.id === p.poId)?.number
    out.push({ key: `paid-${p.id}`, kind: 'paid', ref: p.id, opens: p.billId ?? p.poId ?? p.expenseId, title: `${to}${what ? ` for ${p.kind === 'claim' ? `“${what}”` : what}` : ''}`, projectId: p.projectId, project: pname(p.projectId), at: p.createdAt, amountMinor: p.amountMinor, entity: ent.payout(p) })
  }
  return out.sort((a, b) => b.at - a.at).slice(0, RECENT_MAX)
}
