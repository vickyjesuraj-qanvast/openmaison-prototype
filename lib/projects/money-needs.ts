import 'server-only'
import type { Viewer } from '@/lib/leads/assign-policy'
import { displayDate, dayWords, phoneDisplay } from '@/lib/format'
import { dayLabel, dayOf } from './schedule-model'
import { money2 } from '@/lib/quotes/math'
import { ago } from '@/lib/templates/ago'
import { fetchProjectCosts } from '@/lib/finance/queries'
import { fetchProjectBooks } from '@/lib/finance/books'
import { creditableOf } from '@/lib/finance/credit-model'
import type { NeedRow } from './needs-you'
import { fetchProjectMoney } from './money-queries'
import { fetchPickVariations } from './pick-variation'   // (simplify S-21) K-C's list of the VOs a client's pick drafted
import { isOutsideContract, signedMoney, type InvoiceView } from './money'
import { CALL_AFTER_REMINDERS, collectionTrail, readyDays, remindedWords, telHref } from './invoices-kinds'
import { daysOverdue } from './payments-model'
import { whyClientWontHear } from '@/lib/portal/client-messages-send'

/*
 * (simplify S-07 · S-05 · S-04 — the build's contract B) Every money step on a project that waits on THIS viewer, as Needs you rows: money in
 * (a client's payment to confirm, an invoice overdue, an invoice waiting for approval or sent back, a stage invoice ready — from the day it is
 * ready, P3 §6.8's one readiness rule —, an approved variation order no unsent stage carries, a VO the client's priced pick drafted, unsent
 * invoices out of step, money to credit or to refund, collection trailing) and money out (a vendor's answer on a PO, a PO or an expense waiting
 * for approval, a bill overdue), then the Owners' non-duplicate insights from *What the numbers say*. Each fact once (de-duplicated by the
 * record it is about), worst first, scoped to who may act — the server already hands each role different data (`fetchProjectMoney`'s viewer,
 * the payments' confirmers, `fetchProjectCosts`' CostViewer, `fetchProjectBooks` for Owners and Admins) — so a row never offers a step the
 * server would refuse. K-N's engine (lib/projects/needs-you.ts) merges them into `ProjectDetail.needs`; the Money tab draws its own rows with its
 * real controls (mapped by `kind` / `ref`), the Overview opens them through contract C's deep links (`?open=<id>&do=…`).
 *
 * Tone (S-05): red ('late') only for what is past its day AND ours to fix — a vendor's bill overdue. The client's lateness (an invoice overdue)
 * is 'neutral' with Remind; approvals are 'approve'. Nothing here recomputes money: `moneyOf`, `costsOf` and `profitOf` give every figure.
 */

/** The kinds the Money tab maps to its own controls (components/projects/money/needs-list.tsx). */
export const MONEY_NEED_KINDS = [
  'money-approve', 'cost-po-approve', 'cost-expense-approve', 'cost-bill-approve', 'cost-bill-overdue', 'cost-po-overdue', 'cost-po-late',   // (parity map, MO-094) a PO's delivery late — P-B · (S44R, C8) a bill's OK
  'money-confirm', 'money-overdue', 'money-due-today', 'money-sent-back', 'money-ready', 'money-bill-vo', 'money-send-vo', 'money-out-of-step',
  'money-to-credit', 'money-to-refund', 'money-credit-held', 'money-trailing', 'cost-answered', 'money-insight',   // (pending modules S07) a client's credit held
] as const
export type MoneyNeedKind = (typeof MONEY_NEED_KINDS)[number]
/** Worst first: approvals (Q-03), ours and late, then the client's money, then the rest. */
const RANK: Record<MoneyNeedKind, number> = Object.fromEntries(MONEY_NEED_KINDS.map((k, i) => [k, i])) as Record<MoneyNeedKind, number>

/** Contract C's Money deep link: `?open=<record>` lights its row and opens its panel; `&do=` opens the step itself ((simplify round 2, R2-A)
    `&do=sendback` — an invoice, a PO or an expense waiting for approval: its Send back note). */
export const moneyHref = (projectId: string, open?: string | null, step?: 'remind' | 'record' | 'confirm' | 'pay' | 'approve' | 'sendback' | 'send' | 'use' | null, hash?: string) =>
  `/projects/${projectId}/money${open ? `?open=${encodeURIComponent(open)}${step ? (step === 'send' ? '&send=1' : `&do=${step}`) : ''}` : ''}${hash ? `#${hash}` : ''}`

const day = (ms: number | null | undefined) => (ms ? displayDate(new Date(ms)).replace(/ ’\d\d$/, '') : '')
/** (the Dashboard redesigned, 2026-10-26 — P-13 "dates one way") A day the money is due by — the Needs you list's own planning day, "Fri 2 Oct"
    (`dayLabel`, as its milestone rows' "was due Fri 2 Oct" and every date people plan by, Dane UAT 5.13); a day that looks back (spent, paid)
    keeps `day`. The list reached the Dashboard's inbox reading "due 2 Oct" beside "was due Fri 2 Oct". */
const dueDay = (ms: number | null | undefined) => (ms ? dayLabel(dayOf(new Date(ms))) : '')
const firstName = (name: string) => name.split(/\s+/)[0] ?? name

export async function fetchMoneyNeeds(projectId: string, viewer: Viewer, now: number): Promise<NeedRow[]> {
  const data = await fetchProjectMoney(projectId)
  const m = data?.money
  if (!data || !m) return []   // F-17: not the viewer's money — nothing waits on them here
  void viewer   // the fetchers read the signed-in member themselves (the same viewer K-N hands in); its role shaped what they return
  const [costs, books, pickVos] = await Promise.all([
    fetchProjectCosts(projectId).catch(() => null),
    fetchProjectBooks(projectId).catch(() => null),
    fetchPickVariations([projectId]).then((list) => list.filter((x) => x.status === 'Draft' && x.by === 'client')).catch(() => []),
  ])
  const v = data.viewer
  const locked = !!v.locked
  const client = data.client
  const pay = data.payments ?? null
  const nameOf = (id: string | null) => (id === v.id ? 'You' : id ? data.people.find((p) => p.id === id)?.name ?? 'Someone' : 'Someone')
  const out: (NeedRow & { kind: MoneyNeedKind })[] = []
  const seen = new Set<string>()
  const push = (r: NeedRow & { kind: MoneyNeedKind }) => { const rec = r.ref ?? r.key; if (seen.has(rec)) return; seen.add(rec); out.push(r) }
  const href = (open?: string | null, step?: Parameters<typeof moneyHref>[2], hash?: string) => moneyHref(projectId, open, step, hash)
  const label = (i: InvoiceView) => i.label ?? `${i.stageName} invoice`

  /* (the calm UI build 2026-10-27, 1-08 · 1-31 · 1-32 · W-022 · W-203 · W-239) the rows read as a studio owner says them: the record and its
     vendor ("Bill AF-7781 from AquaFlow Plumbing Works"), "Germaine’s expense: …", "margin left on this work", "Refund S$ … to Benjamin" —
     words only; every row, its kind, key, amount and step are as they were */
  /* ── approvals (Q-03: first) ── */
  if (v.approves && !locked) {
    for (const i of m.invoices.filter((x) => x.state === 'awaiting' && x.amountMinor > 0)) {
      push({ key: `money:approve:${i.id}`, kind: 'money-approve', group: 'ok', tab: 'money', tone: 'approve', ref: i.id, amountMinor: i.amountMinor,
        title: `The ${i.stageName} invoice`, meta: `${nameOf(i.submittedBy)} submitted it ${ago(i.submittedAt, now)} — waiting for your approval`,
        action: { label: 'Approve and send', href: href(i.id, 'approve') }, secondary: { label: 'Send back', href: href(i.id, 'sendback') }, inline: 'approve-invoice' })
    }
  }
  const cs = costs?.summary ?? null
  const cv = costs?.viewer ?? null
  const vendorName = (id: string | null) => (id ? costs?.vendors.find((x) => x.id === id)?.name ?? 'The vendor' : 'The vendor')
  if (cs && cv) {
    if (cv.approvesPo) for (const p of cs.pos.filter((x) => x.state === 'awaiting')) {
      push({ key: `money:po-approve:${p.id}`, kind: 'cost-po-approve', group: 'ok', tab: 'money', tone: 'approve', ref: p.id, amountMinor: p.totalMinor,
        title: `${p.number} to ${vendorName(p.vendorId)}`, meta: `${nameOf(p.submittedBy)} submitted it ${ago(p.submittedAt ?? p.createdAt, now)}${p.againstQuote ? ` · margin left on this work: ${p.againstQuote.pct}%` : ''}`,
        action: { label: 'Approve and send', href: href(p.id, 'approve') }, secondary: { label: 'Send back', href: href(p.id, 'sendback') }, inline: 'approve-po' })   // (R2-A) the tab's own row's second button
    }
    if (cv.approvesExpense) for (const e of cs.expenses.filter((x) => x.state === 'pending')) {
      push({ key: `money:expense-approve:${e.id}`, kind: 'cost-expense-approve', group: 'ok', tab: 'money', tone: 'approve', ref: e.id, amountMinor: e.amountMinor,
        title: `${e.paidBy === 'member' ? `${firstName(nameOf(e.claimantId))}’s expense` : 'Expense'}: ${e.description}`, meta: `${e.category} · ${day(e.spentOn)} · logged by ${nameOf(e.createdBy)}`,
        action: { label: 'Approve', href: href(e.id, 'approve') }, secondary: { label: 'Send back', href: href(e.id, 'sendback') }, inline: 'approve-expense' })   // (R2-A) the tab's own row's second button
    }
    /* (S44R — UAT row 361, call C8, as recommended; REVERSES F1-Q10) a bill over the limit with no PO, or more than its PO by over the tolerance,
       waits for an Owner's or an Admin's OK before anyone pays it — approved in the row */
    if (cv.approvesPo) for (const b of cs.bills.filter((x) => x.waits)) {
      push({ key: `money:bill-approve:${b.id}`, kind: 'cost-bill-approve', group: 'ok', tab: 'money', tone: 'approve', ref: b.id, amountMinor: b.totalMinor,
        title: `Bill ${b.reference} from ${vendorName(b.vendorId)}`, meta: `${b.approvalWhy === 'differs' ? `More than ${cs.pos.find((p) => p.id === b.poId)?.number ?? 'its PO'}` : 'Over the approval limit, on no PO'} · recorded by ${nameOf(b.createdBy)} ${ago(b.createdAt, now)} — waiting for your approval before it is paid`,
        action: { label: 'Approve', href: href(b.id, 'approve') }, inline: 'approve-bill' })
    }
    /* ── ours, and late (S-05: the one red) — in the money group, so a hold or a completed project keeps them (needs-you.ts `holdSplit`) ── */
    if (cv.pays) {
      for (const b of cs.bills.filter((x) => x.overdueMinor > 0 && !x.waits)) {   // (S44R, C8) a waiting bill is its approval row's, never Pay's
        const late = daysOverdue(b.dueOn, now)
        push({ key: `money:bill-overdue:${b.id}`, kind: 'cost-bill-overdue', group: 'money', tab: 'money', tone: 'late', ref: b.id, amountMinor: b.overdueMinor,
          title: `Bill ${b.reference} from ${vendorName(b.vendorId)}`, meta: `Due ${dueDay(b.dueOn)}${late > 0 ? ` · ${dayWords(late)} overdue` : ''}${b.poId ? ` · on ${cs.pos.find((p) => p.id === b.poId)?.number ?? 'its PO'}` : ''}`,
          action: { label: 'Pay', href: href(b.id, 'pay') } })
      }
      for (const p of cs.pos.filter((x) => x.overdueMinor > 0 && !x.billIds.length)) {
        const late = daysOverdue(p.dueOn, now)
        push({ key: `money:po-overdue:${p.id}`, kind: 'cost-po-overdue', group: 'money', tab: 'money', tone: 'late', ref: p.id, amountMinor: p.overdueMinor,
          title: `${p.number} to ${vendorName(p.vendorId)}`, meta: `To be paid by ${dueDay(p.dueOn)}${late > 0 ? ` · ${dayWords(late)} overdue` : ''}`,
          action: { label: 'Pay', href: href(p.id, 'pay') } })
      }
    }
  }

  /* region P-B (parity map 2026-10-10 — money out's new rows: a PO's delivery late, MO-094) */
  /* (parity map, MO-094 · PR-089 — 1.0's `overdue-po` issue) A PO past its expected delivery day and not marked delivered — for whoever prepares the
     project's POs (its team, their Managers, Owners and Admins). The vendor's lateness: neutral (S-05), never red. The Money tab draws its own
     controls (Mark delivered · Message {vendor} on WhatsApp — needs-list.tsx region P-B); elsewhere the row opens the PO, whose panel has both. */
  const lateDeliveries = cs && (costs?.viewer.records ?? costs?.viewer.prepares) && !costs.project.locked ? cs.pos.filter((x) => x.deliveryLateDays > 0) : []   // (parity map, MO-098) and Accounting, who records a delivery
  const { lateDeliveryTitle } = lateDeliveries.length ? await import('@/lib/finance/model') : { lateDeliveryTitle: (n: string) => n }
  for (const p of lateDeliveries) {
    /* group 'late' (the work), not 'money': a vendor's delivery waits behind approvals and the client's money in Q-03's order, and on hold it
       rests under "Paused while on hold" as the rest of the work does (needs-you.ts `holdSplit`) */
    push({ key: `money:po-late:${p.id}`, kind: 'cost-po-late', group: 'late', tab: 'money', tone: 'neutral', ref: `po-late:${p.id}`,
      title: lateDeliveryTitle(p.number, p.deliveryLateDays), meta: `${vendorName(p.vendorId)} · expected ${dueDay(p.expectedOn)}${p.title ? ` · ${p.title}` : ''}`,
      action: { label: 'Mark delivered', href: href(p.id) } })
  }
  /* end P-B */
  /* region P-A (parity map 2026-10-10 — money in's new rows: an invoice still unpaid after three reminders, MI-068) */
  /* (parity map, MI-068) reminded three times and still owed: the overdue row says so — "reminded 3× · last 6 Oct — call Benjamin on +65 9773
     1968" — and its second button is the call (a fourth WhatsApp is not the step; Remind stays in the invoice's ⋮). Same key, kind and record as
     the overdue row below, so it stands in for it (each fact once). No ticket: 2.0's tickets are the client's. */
  if (pay?.viewer.records) for (const i of m.invoices.filter((x) => x.overdueMinor > 0 && (x.remindedCount ?? 0) >= CALL_AFTER_REMINDERS)) {
    const late = daysOverdue(i.dueAt, now)
    const chased = remindedWords(i.remindedCount, i.lastRemindedAt)
    const tel = telHref(client.phone)
    push({ key: `money:overdue:${i.id}`, kind: 'money-overdue', group: 'money', tab: 'money', tone: 'neutral', ref: i.id, amountMinor: i.overdueMinor,
      title: `${label(i)} · ${i.stageName}`,
      meta: `${late <= 1 ? 'A day' : dayWords(late)} overdue · due ${dueDay(i.dueAt)}${chased ? ` · ${chased.charAt(0).toLowerCase()}${chased.slice(1)}` : ''} — call ${client.firstName}${tel ? ` on ${phoneDisplay(client.phone)}` : ''}${m.toCreditMinor ? ` · ${money2(m.toCreditMinor)} to credit against it` : ''}`,   // (invented copy)
      action: { label: 'Record a payment', href: href(i.id, 'record') },
      secondary: tel ? { label: `Call ${client.firstName}`, href: tel } : { label: 'Remind on WhatsApp', href: href(i.id, 'remind') } })
  }
  /* end P-A */
  /* ── the client's money ── */
  if (pay?.viewer.confirms) for (const p of pay.list.filter((x) => x.status === 'to_confirm')) {
    const inv = m.invoices.find((i) => i.id === p.invoiceId)
    push({ key: `money:confirm:${p.id}`, kind: 'money-confirm', group: 'money', tab: 'money', tone: 'neutral', ref: p.id, amountMinor: p.amountMinor,
      title: `${p.source === 'client' ? client.firstName : p.by} says they paid ${p.invoiceNumber ?? `the ${p.stageName} invoice`}`,
      meta: `${p.stageName} · paid ${day(p.paidOn)}${p.reference ? ` · reference ${p.reference}` : ''}${p.trusted ? ' · it counts already — check it arrived' : ''}`,
      action: { label: 'Confirm', href: href(p.id, 'confirm') },
      ...(p.proof ? { secondary: { label: 'See the bank’s confirmation', href: href(p.id, 'confirm') } } : inv ? { secondary: { label: 'Open the invoice', href: href(inv.id) } } : {}) })
  }
  if (pay?.viewer.records) for (const i of m.invoices.filter((x) => x.overdueMinor > 0)) {
    const late = daysOverdue(i.dueAt, now)
    const chased = remindedWords(i.remindedCount, i.lastRemindedAt)
    push({ key: `money:overdue:${i.id}`, kind: 'money-overdue', group: 'money', tab: 'money', tone: 'neutral', ref: i.id, amountMinor: i.overdueMinor,
      title: `${label(i)} · ${i.stageName}`, meta: `${late <= 1 ? 'A day' : dayWords(late)} overdue · due ${dueDay(i.dueAt)}${chased ? ` · ${chased.charAt(0).toLowerCase()}${chased.slice(1)}` : ''}${m.toCreditMinor ? ` · ${money2(m.toCreditMinor)} to credit against it` : ''}`,
      action: { label: 'Record a payment', href: href(i.id, 'record') }, secondary: { label: 'Remind on WhatsApp', href: href(i.id, 'remind') } })
  }
  /* (simplify round 3, the owner's "you decide" 2026-10-10) Due today and nobody will remind the client by themselves — the due-day message is
     off, the portal is paused or hides Money, or the client isn't on the portal (lib/portal/payment-due.ts reaches only who the invoice email
     reaches): the studio hears it here on the day, with Remind on WhatsApp. Not for an invoice sent today (it just said it), nor once reminded today. */
  if (pay?.viewer.records) {
    const d = new Date(now)
    const from = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(), to = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime()
    const dueToday = m.invoices.filter((x) => x.status === 'sent' && x.dueAt != null && x.dueAt >= from && x.dueAt < to && x.overdueMinor === 0
      && x.balanceMinor - x.toConfirmMinor > 0 && !(x.sentAt && x.sentAt >= from) && !(x.lastRemindedAt && x.lastRemindedAt >= from))
    const why = dueToday.length ? await whyClientWontHear(data.project.leadId, 'client_payment_due').catch(() => null) : null
    const words = why === 'off' ? 'the automatic reminder is off' : why === 'paused' ? 'the portal is paused, so no reminder goes by itself'
      : why === 'section' ? 'Money is hidden on the portal, so no reminder goes by itself' : `${client.firstName} isn’t on the portal, so no reminder goes by itself`
    if (why) for (const i of dueToday) {
      const chased = remindedWords(i.remindedCount, i.lastRemindedAt)
      push({ key: `money:due-today:${i.id}`, kind: 'money-due-today', group: 'money', tab: 'money', tone: 'neutral', ref: i.id, amountMinor: i.balanceMinor - i.toConfirmMinor,
        title: `${label(i)} · ${i.stageName}`, meta: `Due today · ${words}${chased ? ` · ${chased.charAt(0).toLowerCase()}${chased.slice(1)}` : ''}`,   // (invented copy)
        action: { label: 'Remind on WhatsApp', href: href(i.id, 'remind') }, secondary: { label: 'Record a payment', href: href(i.id, 'record') } })
    }
  }
  if (v.prepares && !locked) {
    for (const i of m.invoices.filter((x) => x.status === 'draft' && !x.submittedAt && x.reviewNote && x.reviewedAt)) {
      push({ key: `money:sent-back:${i.id}`, kind: 'money-sent-back', group: 'money', tab: 'money', tone: 'neutral', ref: i.id, amountMinor: i.amountMinor,
        title: `The ${i.stageName} invoice was sent back`, meta: `by ${nameOf(i.reviewedBy)} ${ago(i.reviewedAt, now)} — “${i.reviewNote}”`,
        action: { label: v.sendsAtOnce ? 'Send' : 'Submit again', href: href(i.id, v.sendsAtOnce ? 'send' : null) }, secondary: { label: 'Change the amount', href: href(i.id) } })
    }
    /* P3 §6.8 — one readiness rule: a ready invoice is a row from the day it is ready (no 3-day grace, no 7-day insight) */
    const trail = data.progressPct != null && data.project.stage === 'in_progress' ? collectionTrail({ progressPct: data.progressPct, collectedMinor: m.collectedContractMinor, contractMinor: m.contractMinor }) : null
    const ready = m.stages.map((s) => s.invoice).filter((i): i is InvoiceView => !!i && i.state === 'ready' && i.amountMinor > 0)
    ready.forEach((i, k) => {
      const days = readyDays(i.readySince, now)
      const why = i.milestone ? `${i.milestone.title} is ${i.milestone.due === 'start' ? 'under way' : 'done'}` : 'Due on signing'
      push({ key: `money:ready:${i.id}`, kind: 'money-ready', group: 'money', tab: 'money', tone: 'neutral', ref: i.id, amountMinor: i.amountMinor,
        title: `The ${i.stageName} invoice is ready to ${v.sendsAtOnce ? 'send' : 'submit'}`,
        meta: `${why}${days > 0 ? ` · ready ${dayWords(days)}` : ' · ready today'}${k === 0 && trail !== null ? ` · collection is trailing the work by ${trail}%` : ''}`,
        action: { label: v.sendsAtOnce ? 'Send' : 'Submit for approval', href: href(i.id, v.sendsAtOnce ? 'send' : null) } })
    })
    /* collection trailing with nothing ready to send: the oldest unpaid invoice is the step (Remind) — else there is nothing to do here */
    if (trail !== null && !ready.length && pay?.viewer.records) {
      const unpaid = m.invoices.filter((i) => i.status === 'sent' && i.balanceMinor - i.toConfirmMinor > 0).sort((a, z) => (a.sentAt ?? 0) - (z.sentAt ?? 0))[0]
      if (unpaid) push({ key: `money:trailing:${unpaid.id}`, kind: 'money-trailing', group: 'money', tab: 'money', tone: 'neutral', ref: unpaid.id, amountMinor: unpaid.balanceMinor,
        title: `Collection is trailing the work by ${trail}%`, meta: `The schedule is ${data.progressPct}% done and ${Math.round((m.collectedMinor / Math.max(1, m.contractMinor)) * 100)}% of the contract is collected — ${label(unpaid)} is unpaid`,
        action: { label: 'Remind on WhatsApp', href: href(unpaid.id, 'remind') } })
    }
    if (!m.stageDraftsLeft) for (const vo of m.billable) {
      push({ key: `money:bill-vo:${vo.id}`, kind: 'money-bill-vo', group: 'money', tab: 'money', tone: 'neutral', ref: vo.id, amountMinor: vo.amountMinor,
        title: `${vo.number} is approved with no unsent invoice to carry it`, meta: `${vo.title} · ${signedMoney(vo.amountMinor)} — bill it now, not with the next stage`,
        action: { label: `Bill ${vo.number}`, href: href(vo.id) } })
    }
    if (m.outOfStep.length) {
      push({ key: `money:out-of-step:${projectId}`, kind: 'money-out-of-step', group: 'money', tab: 'money', tone: 'neutral', ref: `out-of-step:${projectId}`,
        title: `The unsent invoices don’t add up to the ${money2(m.contractMinor)} contract`, meta: m.outOfStep.map((c) => `${c.stageName} ${money2(c.fromMinor)} → ${money2(c.toMinor)}`).join(' · '),
        action: { label: 'Even them out', href: href() } })
    }
  }
  /* (simplify S-21) a VO the client's priced pick drafted — nothing reaches the client without a press: Send it from its editor */
  if (v.prepares && !locked) for (const vo of pickVos) {
    const who = vo.person ?? client.firstName
    push({ key: `money:send-vo:${vo.quoteId}`, kind: 'money-send-vo', group: 'money', tab: 'money', tone: 'neutral', ref: vo.quoteId, amountMinor: vo.amountMinor,
      title: `${who} chose ${vo.option ?? vo.choice}`, meta: `${vo.choice} · ${signedMoney(vo.amountMinor)} — ${vo.number} is drafted; ${who} approves it on its link once it is sent`,
      /* (simplify round 2, R2-A) one press: the editor opens with its Send ▾ › Send for confirmation already open (`?send=confirm`) */
      action: { label: `Send ${vo.number}`, href: `/quotes/${vo.quoteId}?send=confirm&from=${encodeURIComponent(`/projects/${projectId}/money`)}` } })
  }
  /* credit notes — Owners and Admins (F-18's rule, `books.issues`) */
  if (books?.issues) {
    const creditable = m.invoices.filter((i) => i.status === 'sent' && creditableOf(i) > 0 && !isOutsideContract(i))
    if (m.toCreditMinor > 0 && creditable.length) {
      push({ key: `money:to-credit:${projectId}`, kind: 'money-to-credit', group: 'money', tab: 'money', tone: 'neutral', ref: `to-credit:${projectId}`, amountMinor: m.toCreditMinor,
        title: `${money2(m.toCreditMinor)} billed above the contract`, meta: `The invoices sent come to more than the ${money2(m.contractMinor)} contract — give it back with a credit note`,
        action: { label: 'Issue a credit note', href: href() } })
    }
    for (const c of books.credits.filter((x) => x.status !== 'void' && !x.refundMinor && x.kind !== 'overpayment')) {   // (pending modules S07) a held credit has its own row below
      const due = Math.min(m.invoices.find((i) => i.id === c.invoiceId)?.refundDueMinor ?? 0, c.amountMinor)
      if (due <= 0) continue
      push({ key: `money:to-refund:${c.id}`, kind: 'money-to-refund', group: 'money', tab: 'money', tone: 'neutral', ref: c.id, amountMinor: due,
        title: `Refund ${money2(due)} to ${client.firstName} (${c.number})`, meta: `${client.firstName} paid more than ${c.invoiceLabel} owes after the credit note`,
        action: { label: 'Record', href: href(c.id) } })   // (the calm UI build 2026-10-27, W-602) the title says the refund
    }
  }
  /* (pending modules S07 — the projects card's D-14, as recommended) a client's overpayment held as their credit: the next invoice that owes
     takes it (whoever records payments — the one filled button), else its refund (Owners, Admins, Accounting); said once per credit note */
  const records = !!pay?.viewer.records && !locked
  const owingNow = m.invoices.filter((i) => i.status === 'sent' && i.balanceMinor - i.toConfirmMinor > 0).sort((a, z) => (a.sentAt ?? 0) - (z.sentAt ?? 0))
  for (const h of (m.held ?? []).filter((x) => x.heldMinor > 0)) {
    const from = m.invoices.find((i) => i.id === h.invoiceId)
    const to = records ? owingNow.find((i) => i.id !== h.invoiceId) ?? null : null
    if (!to && !books?.issues) continue
    push({ key: `money:credit-held:${h.id}`, kind: 'money-credit-held', group: 'money', tab: 'money', tone: 'neutral', ref: h.id, amountMinor: h.heldMinor,
      title: `${client.firstName}’s credit, ${h.number}`,
      meta: `Paid beyond what ${from ? label(from) : 'the invoice'} owed — ${to ? `take it off ${label(to)}, or refund it` : records ? 'it comes off the next invoice once one is sent, or refund it' : 'refund it, or the team takes it off the next invoice'}`,   // (invented copy)
      action: to ? { label: `Use on ${label(to)}`, href: href(h.id, 'use') } : { label: 'Record the refund', href: href(h.id) } })
  }
  /* a vendor's answer on a PO — whoever prepares its POs changes it */
  if (cs && costs?.viewer.prepares && !costs.project.locked) for (const p of cs.pos.filter((x) => x.state === 'changes' || x.state === 'declined')) {
    push({ key: `money:answered:${p.id}`, kind: 'cost-answered', group: 'money', tab: 'money', tone: 'neutral', ref: p.id,
      title: `${vendorName(p.vendorId)} ${p.state === 'changes' ? 'asked for changes to' : 'declined'} ${p.number}`, meta: p.vendorAnswerNote ? `“${p.vendorAnswerNote}”` : p.title ?? undefined,
      action: { label: 'Change it', href: href(p.id) } })
  }
  /* the Owners' insights that are not told above (P3 §6.2: never "Open Money" — they open the record or the list) */
  for (const i of books?.insights ?? []) {
    const keep = i.key === 'loss' || i.key === 'at_risk' || i.key === 'tight' || i.key === 'funded' || i.key === 'vos' || i.key.startsWith('po-over-')
    if (!keep) continue
    const poId = i.key.startsWith('po-over-') ? i.key.slice('po-over-'.length) : null
    push({ key: `money:insight:${i.key}`, kind: 'money-insight', group: 'money', tab: 'money', tone: 'neutral', ref: poId ?? `insight:${i.key}`,   // a PO waiting for approval already says what it leaves against the quote — one fact, once
      title: i.title, meta: i.message,
      action: poId ? { label: 'Open the PO', href: href(poId) } : i.key === 'funded' ? { label: 'See what’s to collect', href: href(null, null, 'billing') } : i.key === 'vos' ? { label: 'Open the variation orders', href: href(null, null, 'changes') } : { label: 'Open the costs', href: href(null, null, 'costs') } })
  }

  return out.map((r, n) => ({ r, n })).sort((a, z) => RANK[a.r.kind] - RANK[z.r.kind] || a.n - z.n).map(({ r }) => r)
}
