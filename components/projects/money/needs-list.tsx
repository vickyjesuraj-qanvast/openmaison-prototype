'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'motion/react'
import { useSheetLayout } from '@/components/om/sheet'
import { Card } from '@/components/leads/detail/card'
import { duration, ease } from '@/lib/motion'
import { phoneDisplay } from '@/lib/format'
import { money2 } from '@/lib/quotes/math'
import { useSnackbar } from '@/components/om/snackbar'
import type { NeedRow } from '@/lib/projects/needs-you'
import type { MoneyData, useInvoices } from './use-invoices'
import type { usePayments } from './payments-section'
import type { useCreditNotes } from '@/components/finance/books/credit-notes'
import type { useProjectCosts } from '@/components/finance/project-costs'
import { Row, RowMore } from '../overview/row'
import ov from '../project-overview.module.css'
import styles from './money.module.css'

type Btn = { label: string; run: () => void; testId?: string; busy?: boolean }
type Drawn = { icon: string; testId: string; primary: Btn | null; secondary: Btn[]; attrs?: Record<string, string> }

/** How many rows show before "Show n more" — 3 at a desk, 2 on a phone (P3 §6.2 · §6.3). */
const SHOWN = 3
const SHOWN_PHONE = 2

/**
 * (simplify S-07, P3 §6.2 Region 2) **Needs you** on the Money tab: every money step waiting on THIS viewer — the server's rows
 * (lib/projects/money-needs.ts, merged into the page's Needs you by K-N and handed down by the frame's context) — drawn as the house banner rows
 * (money.module.css `.banner`, the tones they used), each fact once, worst first, three shown and "Show n more". Each row's buttons are this
 * tab's real controls, mapped by the row's `kind` and `ref` (Remind on WhatsApp · Record a payment · Confirm · Approve and send · Pay · Even
 * them out · Issue a credit note · Record the refund …), so a press here is the press it always was — same dialog, same sentence, same Undo.
 * A row whose record this tab no longer holds falls back to its own link. Nothing waits → nothing renders.
 * Each row keeps the test id of the band it replaces (`invoice-overdue`, `payment-to-confirm`, `invoice-approval-bar`, `costs-po-awaiting`…).
 */
export function MoneyNeeds({ rows, data, inv, payments, cn, costs, onOpenInvoice }: {
  rows: NeedRow[]
  data: MoneyData
  inv: ReturnType<typeof useInvoices>
  payments: ReturnType<typeof usePayments>
  cn: ReturnType<typeof useCreditNotes>
  costs: ReturnType<typeof useProjectCosts> | null
  onOpenInvoice: (id: string, step?: 'remind' | 'confirm' | null, line?: string | null) => void
}) {
  const router = useRouter()
  const phone = useSheetLayout()
  const snackbar = useSnackbar()
  /* (parity map, MI-068) Call {client}: on a touch device the number dials; at a desk it is copied, to dial from a phone */
  const call = (href: string) => {
    const touch = typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches
    if (touch) { window.location.assign(href); return }
    const number = phoneDisplay(href.replace(/^tel:\+65/, ''))
    void (navigator.clipboard ? navigator.clipboard.writeText(number) : Promise.reject(new Error('no clipboard'))).then(() => snackbar({ message: `${data.client.firstName}’s number, ${number}, is copied — call from your phone` }), () => snackbar({ message: `Call ${data.client.firstName} on ${number}` }))   // (invented copy)
  }
  const [open, setOpen] = useState(false)
  if (!rows.length) return null
  const m = data.money
  const invoice = (id?: string) => m.invoices.find((i) => i.id === id) ?? null
  const link = (r: NeedRow): Btn | null => (r.action.href ? { label: r.action.label, run: () => go(r.action.href!) } : null)
  /** A link that stays on this tab scrolls to its place (`#costs` · `#billing` · `#changes`) or opens its record; else it navigates. */
  const go = (href: string) => {
    const here = `/projects/${data.project.id}/money`
    if (href.startsWith(`${here}#`)) { document.getElementById(href.slice(here.length + 1))?.scrollIntoView({ block: 'start', behavior: 'smooth' }); return }
    const open = /^[^?]*\/money\?open=([^&#]+)/.exec(href)
    if (open && href.startsWith(here)) {
      const id = decodeURIComponent(open[1]!)
      if (invoice(id)) { onOpenInvoice(id); return }
      const s = costs?.summary
      if (s?.pos.some((p) => p.id === id) || s?.bills.some((b) => b.id === id) || s?.expenses.some((e) => e.id === id)) { costs!.c.setFocus(id); costs!.c.requestOpen(id); return }
    }
    router.push(href)
  }

  const draw = (r: NeedRow): Drawn => {
    const c = costs?.c ?? null
    const s = costs?.summary ?? null
    switch (r.kind) {
      case 'money-approve': {
        const i = invoice(r.ref)
        return { icon: 'approval', testId: 'invoice-approval-bar', secondary: i ? [{ label: 'Send back', run: () => inv.openSendBack(i), busy: inv.busy === i.id }] : [],
          primary: i ? { label: 'Approve and send', run: () => inv.openSend(i), testId: 'banner-approve', busy: inv.busy === i.id } : link(r) }
      }
      case 'cost-po-approve': {
        const p = s?.pos.find((x) => x.id === r.ref)
        const next = p && c ? c.poNext(p) : null
        const back = p && c ? c.poMenu(p).find((a) => a.label === 'Send back') : undefined
        return { icon: 'approval', testId: 'costs-po-awaiting', secondary: back ? [{ label: 'Send back', run: back.run }] : [],
          primary: next ? { label: next.label, run: next.run, testId: 'costs-approve-po' } : link(r) }
      }
      case 'cost-expense-approve': {
        const e = s?.expenses.find((x) => x.id === r.ref)
        const next = e && c ? c.expenseNext(e) : null
        const back = e && c ? c.expenseMenu(e).find((a) => a.label === 'Send back') : undefined
        return { icon: 'approval', testId: 'costs-expense-awaiting', secondary: back ? [{ label: 'Send back', run: back.run }] : [],
          primary: next ? { label: next.label, run: next.run, testId: 'costs-approve-expense' } : link(r) }
      }
      case 'cost-bill-approve': {   // (S44R, C8) the bill's OK, in the row
        const b = s?.bills.find((x) => x.id === r.ref)
        const next = b && c ? c.billNext(b) : null
        return { icon: 'approval', testId: 'costs-bill-awaiting', secondary: b && c ? [{ label: 'Open', run: () => c.openBill(b) }] : [],
          primary: next ? { label: next.label, run: next.run, testId: 'costs-approve-bill' } : link(r) }
      }
      case 'cost-bill-overdue': {
        const b = s?.bills.find((x) => x.id === r.ref)
        const next = b && c ? c.billNext(b) : null
        return { icon: 'warning', testId: 'costs-bill-overdue', secondary: b && c ? [{ label: 'Open', run: () => c.openBill(b) }] : [],
          primary: next ? { label: next.label, run: next.run, testId: 'costs-pay-bill' } : link(r) }
      }
      case 'cost-po-overdue': {
        const p = s?.pos.find((x) => x.id === r.ref)
        const next = p && c ? c.poNext(p) : null
        return { icon: 'warning', testId: 'costs-po-overdue', secondary: p && c ? [{ label: 'Open', run: () => c.openPo(p) }] : [],
          primary: next ? { label: next.label, run: next.run } : link(r) }
      }
      case 'money-confirm': {
        const p = payments.list.find((x) => x.id === r.ref)
        const proof = p ? payments.proofHref(p) : null
        return { icon: 'payments', testId: 'payment-to-confirm', attrs: p ? { 'data-payment-banner': p.id } : undefined,
          secondary: p ? [...(proof ? [{ label: 'See the bank’s confirmation', run: () => router.push(proof), testId: 'payment-proof-link' }] : []), { label: 'Not received', run: () => payments.openRefuse(p), testId: 'payment-not-received', busy: payments.busy === p.id }] : [],
          primary: p ? { label: 'Confirm', run: () => payments.confirm(p), testId: 'payment-confirm', busy: payments.busy === p.id } : link(r) }
      }
      case 'money-overdue': {
        const i = invoice(r.ref)
        /* (parity map, MI-068) reminded three times: the second button calls the client — a phone dials, a desk copies the number */
        const tel = r.secondary?.href?.startsWith('tel:') ? r.secondary : null
        return { icon: 'schedule', testId: 'invoice-overdue', attrs: tel ? { 'data-call': '' } : undefined,
          secondary: tel ? [{ label: tel.label, run: () => call(tel.href!), testId: 'invoice-call' }] : i ? [{ label: 'Remind on WhatsApp', run: () => payments.remind(i), testId: 'invoice-remind', busy: payments.busy === i.id }] : [],
          primary: i ? { label: 'Record a payment', run: () => payments.recordFor(i), testId: 'banner-record', busy: payments.busy === `rec-${i.id}` } : link(r) }
      }
      case 'money-due-today': {   // (simplify round 3) due today and no reminder goes by itself — the WhatsApp is the step, Record beside it
        const i = invoice(r.ref)
        return { icon: 'today', testId: 'invoice-due-today', secondary: i ? [{ label: 'Record a payment', run: () => payments.recordFor(i), busy: payments.busy === `rec-${i.id}` }] : [],
          primary: i ? { label: 'Remind on WhatsApp', run: () => payments.remind(i), testId: 'invoice-remind-today', busy: payments.busy === i.id } : link(r) }
      }
      case 'money-sent-back': {
        const i = invoice(r.ref)
        return { icon: 'edit', testId: 'invoice-sent-back', secondary: i && i.kind !== 'one_off' && i.kind !== 'variation' ? [{ label: 'Change the amount', run: () => inv.openAmount(i) }] : [],
          primary: i ? (data.viewer.sendsAtOnce ? { label: 'Send', run: () => inv.openSend(i), busy: inv.busy === i.id } : { label: 'Submit again', run: () => inv.submit(i), busy: inv.busy === i.id }) : link(r) }
      }
      case 'money-ready': {
        const i = invoice(r.ref)
        const next = i ? inv.nextStep(i) : null
        return { icon: 'schedule', testId: 'money-ready-days', secondary: [], primary: next && i ? { label: next.label, run: next.run, testId: `needs-${next.testId}`, busy: inv.busy === i.id } : link(r) }
      }
      case 'money-trailing': {
        const i = invoice(r.ref)
        return { icon: 'trending_up', testId: 'money-collection-trailing', secondary: [], primary: i ? { label: 'Remind on WhatsApp', run: () => payments.remind(i), busy: payments.busy === i.id } : link(r) }
      }
      case 'money-bill-vo': {
        const v = m.variations.find((x) => x.id === r.ref)
        return { icon: 'request_quote', testId: 'money-unbilled-vo', secondary: [], primary: v ? { label: `Bill ${v.number}`, run: () => inv.billVo(v), testId: 'banner-bill-vo', busy: inv.busy === v.id } : link(r) }
      }
      case 'money-send-vo':
        return { icon: 'request_quote', testId: 'money-send-vo', secondary: [], primary: link(r) }
      case 'money-out-of-step':
        return { icon: 'swap_vert', testId: 'money-out-of-step', secondary: [], primary: { label: 'Even them out', run: inv.rebalance, testId: 'money-rebalance', busy: inv.busy === 'rebalance' } }
      case 'money-to-credit':
        return { icon: 'receipt_long', testId: 'money-to-credit', secondary: [], primary: cn.openOffer ? { label: 'Issue a credit note', run: cn.openOffer, testId: 'money-issue-credit' } : link(r) }
      case 'money-to-refund': {
        const k = cn.credits.find((x) => x.id === r.ref)
        return { icon: 'payments', testId: 'money-to-refund', secondary: [], primary: k ? { label: 'Record', run: () => cn.openRefund(k), testId: 'money-record-refund' } : link(r) }   // (the calm UI build 2026-10-27, W-602) the title says the refund
      }
      /* (pending modules S07 — D-14) a client's credit held: Use on the next invoice that owes — else Record the refund */
      case 'money-credit-held': {
        const k = cn.credits.find((x) => x.id === r.ref)
        const to = k ? cn.usableFor(k)[0] ?? null : null
        return { icon: 'account_balance_wallet', testId: 'money-credit-held', attrs: k ? { 'data-credit-held': k.id } : undefined,
          secondary: k && to && cn.issues ? [{ label: 'Record the refund', run: () => cn.openRefund(k), testId: 'money-credit-refund' }] : [],
          primary: k && to ? { label: `Use on ${to.label ?? 'the invoice'}`, run: () => cn.applyOn(k, to), testId: 'money-credit-use', busy: cn.busy === `use-${k.id}` }
            : k && cn.issues ? { label: 'Record the refund', run: () => cn.openRefund(k), testId: 'money-credit-refund' } : link(r) }
      }
      case 'cost-answered': {
        const p = s?.pos.find((x) => x.id === r.ref)
        const next = p && c ? c.poNext(p) : null
        return { icon: 'local_shipping', testId: 'costs-answered', secondary: p && c ? [{ label: 'Open', run: () => c.openPo(p) }] : [], primary: next ? { label: next.label, run: next.run } : link(r) }
      }
      case 'money-insight':
        return { icon: 'info', testId: 'money-insight', secondary: [], primary: link(r), attrs: { 'data-insight': r.key.replace(/^money:insight:/, '') } }
      /* region P-B (parity map 2026-10-10 — the controls of money out's new rows) */
      case 'cost-po-late': {   // (parity map, MO-094 · PR-089) a late delivery: Mark delivered · Message {vendor} on WhatsApp (opened on the press)
        const p = s?.pos.find((x) => x.id === r.ref?.replace(/^po-late:/, ''))
        const vendor = p && c ? c.vendorOf(p.vendorId) : null
        return { icon: 'local_shipping', testId: 'costs-po-late', attrs: p ? { 'data-po-late': p.id } : undefined,
          secondary: p && c && vendor?.phone ? [{ label: `Message ${vendor.name}`, run: () => c.messageVendor(p), testId: 'po-late-message' }] : p && c ? [{ label: 'Open', run: () => c.openPo(p) }] : [],
          primary: p && c && c.deliverable(p) ? { label: 'Mark delivered', run: () => c.markDelivered(p), testId: 'po-late-delivered', busy: c.busy === p.id } : link(r) }
      }
      /* end P-B */
      default:
        return { icon: 'info', testId: 'money-need', secondary: [], primary: link(r) }
    }
  }

  const limit = phone ? SHOWN_PHONE : SHOWN
  const first = rows.slice(0, limit)
  const rest = rows.slice(limit)
  /* (the calm UI build 2026-10-27, 3-07) red is for the one row most past its day and ours */
  const redKey = rows.find((r) => r.tone === 'late')?.key ?? null
  /* (the calm UI build 2026-10-27, 3-05 · 3-22 · 5-13 · T-02 · T-03) the Overview's own Needs your attention row, filtered to money: the icon,
     the title and its caption, the amount, ONE verb (the house Row's text button — never a filled one: the page's one filled button is the
     header's), and every other step in the row's ⋮ with the mark it had. The row keeps its band's mark (`invoice-overdue`, `payment-to-confirm`…). */
  const row = (r: NeedRow) => {
    const d = draw(r)
    /* an approval's verb reads "Approve" — the one that also sends opens its send, which says so */
    const verb = d.primary ? { label: r.tone === 'approve' && /^Approve/.test(d.primary.label) ? 'Approve' : d.primary.label, onPress: () => d.primary!.run(), busy: d.primary.busy, testId: d.primary.testId } : null
    return (
      <Row key={r.key} two icon={d.icon} name={r.title} caption={r.meta} meta={r.amountMinor ? money2(r.amountMinor) : undefined}   /* a money page keeps the cents its tables print (T-12) */
           state={r.key === redKey ? 'alert' : undefined} tone={r.tone === 'approve' ? 'approve' : undefined}
           actions={verb ? [verb] : []} testId={d.testId} attrs={{ 'data-need': r.kind, ...(d.attrs ?? {}) }}
           menu={d.secondary.length ? <RowMore items={d.secondary.map((b) => ({ label: b.label, onPress: b.run, disabled: b.busy, testId: b.testId }))} label={`More for ${r.title}`} title={r.title} testId={`${d.testId}-more`} /> : undefined} />
    )
  }
  return (
    <div className={styles.needs} data-testid="money-needs">
      {/* (the calm UI build 2026-10-27, 3-07 · W-001 · W-561 · T-01 · T-07) "Needs your attention · n", the Overview's card */}
      <Card title="Needs your attention" headGap={8} meta={`· ${rows.length}`} testId="money-needs">
        <div className={ov.body}>
          <div className={ov.group}>
            {first.map(row)}
            <AnimatePresence initial={false}>
              {open && rest.length ? (
                <motion.div key="rest" className={styles.needsRest} initial={{ height: 0, opacity: 0, overflow: 'hidden' }} animate={{ height: 'auto', opacity: 1, transitionEnd: { overflow: 'visible' } }}
                            exit={{ height: 0, opacity: 0, overflow: 'hidden' }} transition={{ duration: duration.step, ease: ease.standard }}>
                  {rest.map(row)}
                </motion.div>
              ) : null}
            </AnimatePresence>
            {rest.length ? (
              <Row icon={open ? 'keyboard_arrow_up' : 'expand_more'} name={open ? 'Show less' : `Show ${rest.length} more`} onPress={() => setOpen((o) => !o)} testId="money-needs-more" toggle attrs={{ 'aria-expanded': open ? 'true' : 'false' }} />
            ) : null}
          </div>
        </div>
      </Card>
    </div>
  )
}
