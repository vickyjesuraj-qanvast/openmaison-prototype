'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Tag } from '@/components/ds'
import { CostPanel, type PanelHistory, type PanelList } from '@/components/finance/cost-panel'
import { tagOf, type RowAction } from '@/components/finance/cost-tables'
import { displayDate } from '@/lib/format'
import { money2 } from '@/lib/quotes/math'
import { INVOICE_STATE_LABEL, INVOICE_STATE_TONE, type InvoiceView, type StageView } from '@/lib/projects/money'
import { CREDIT_METHOD, PAYMENT_STATUS_LABEL, PAYMENT_STATUS_TONE, methodLabel } from '@/lib/projects/payments-model'
import { methodInLine } from '@/lib/finance/model'
import { dueIn, dueModeWords, kindWords, lineAmount, remindedWords } from '@/lib/projects/invoices-kinds'
import { invoiceHistory } from '@/app/projects/money-actions'
import type { MoneyData, useInvoices } from './use-invoices'
import type { usePayments } from './payments-section'
import type { useCreditNotes } from '@/components/finance/books/credit-notes'
import styles from './money.module.css'

const day = (ms: number | null | undefined) => (ms ? displayDate(new Date(ms)) : '--')
const pctWords = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(1)}%`
export const invoiceTag = (s: InvoiceView['state']) => { const t = INVOICE_STATE_TONE[s]; return t === 'default' ? <Tag appearance="outlined">{INVOICE_STATE_LABEL[s]}</Tag> : <Tag appearance="outlined" color={t}>{INVOICE_STATE_LABEL[s]}</Tag> }

/** What opened the panel: the invoice, and the line a `?open=` named (a payment, a credit note), and the step a `&do=` asked for. */
export type InvoiceFocus = { id: string; line?: string | null; step?: 'remind' | 'confirm' | null }

/**
 * (simplify S-08, P3 §6.4) An invoice in the record panel POs and bills already use (`CostPanel` on the house Drawer — a bottom sheet on a phone):
 * its title and one word, the note (sent back · void · differs), its facts (stage and share, milestone, sent by and when, due and its age, how
 * often it was chased), its amounts (or a one-off's lines), its paper (Preview · Download PDF · Copy the no-login link), its payments and its
 * credit notes each with their own ⋮, its history (its Activity lines), and its one next step first — the rest in ⋮, a refusal said in its row.
 * Every step is `useInvoices`' / `usePayments`' / `useCreditNotes`' — the panel decides nothing.
 */
export function InvoicePanel({ focus, data, inv, payments, cn, onClose }: {
  focus: InvoiceFocus | null
  data: MoneyData
  inv: ReturnType<typeof useInvoices>
  payments: ReturnType<typeof usePayments>
  cn: ReturnType<typeof useCreditNotes>
  onClose: () => void
}) {
  const router = useRouter()
  const m = data.money
  const i = focus ? m.invoices.find((x) => x.id === focus.id) ?? null : null
  const stage: StageView | null = i ? m.stages.find((s) => s.ref === i.stageRef) ?? null : null
  /* its history — its Activity lines, read when it opens and again whenever it moves */
  const stamp = i ? `${i.id}|${i.status}|${i.state}|${i.paidMinor}|${i.creditedMinor ?? 0}|${i.remindedCount ?? 0}|${i.reviewedAt ?? 0}|${i.submittedAt ?? 0}` : ''
  const [history, setHistory] = useState<{ stamp: string; rows: PanelHistory[] } | null>(null)
  useEffect(() => {
    if (!stamp) return
    let live = true
    const id = stamp.split('|')[0]!
    void invoiceHistory(id).then((r) => { if (live && Array.isArray(r)) setHistory({ stamp, rows: r.map((h, k) => ({ key: `${k}`, at: h.at, text: h.text })) }) }, () => undefined)
    return () => { live = false }
  }, [stamp])
  if (!i) return <CostPanel open={false} title="" status={null} facts={[]} actions={[]} menu={[]} onClose={onClose} testId="invoice-panel" />

  const client = data.client
  const owed = Math.max(0, i.balanceMinor - i.toConfirmMinor)
  const sent = i.status !== 'draft'
  const outside = i.outside || i.kind === 'variation'
  const age = sent && i.status !== 'void' && owed > 0 ? dueIn(i.dueAt, data.now) : null
  const chased = remindedWords(i.remindedCount, i.lastRemindedAt)

  /* the note: the record's own words */
  const note = i.status === 'void' ? { text: <>Void — “{i.voidReason}”{i.voidedBy ? ` · ${inv.nameOf(i.voidedBy)}, ${day(i.voidedAt)}` : ''}</> }
    : i.status === 'draft' && !i.submittedAt && i.reviewNote && i.reviewedAt ? { text: <>Sent back by {inv.nameOf(i.reviewedBy)}: “{i.reviewNote}”</> }
      : i.differsMinor ? { text: <>Differs from the schedule by {money2(Math.abs(i.differsMinor))} — {i.varianceReason}</> } : null

  const facts: { label: string; value: ReactNode }[] = [
    { label: outside ? 'Kind' : 'Stage', value: outside ? kindWords(i) : i.fixedMinor != null ? `${i.stageName} · a fixed fee` : `${i.stageName} · ${pctWords(i.pct)} of ${i.basis.issued ? money2(i.basis.contractMinor) : `the ${money2(m.contractMinor)} contract`}` },
    ...(i.milestone ? [{ label: 'Milestone', value: `${i.milestone.title} · ${i.milestone.status === 'done' ? 'done' : i.milestone.status === 'not_started' ? 'not started' : i.milestone.status === 'blocked' ? 'blocked' : 'in progress'} — due at its ${i.milestone.due}` }]
      : !outside && stage?.onSigning ? [{ label: 'Milestone', value: 'Due on signing' }] : []),
    ...(i.state === 'awaiting' ? [{ label: 'Submitted', value: `${i.submittedBy === data.viewer.id ? 'You' : inv.nameOf(i.submittedBy)} · ${day(i.submittedAt)}` }] : []),
    ...(i.sentAt ? [{ label: 'Sent', value: `${day(i.sentAt)} by ${inv.nameOf(i.sentBy)}` }] : []),
    ...(sent && i.status !== 'void' ? [{ label: 'Due', value: <>{day(i.dueAt)}{age ? <span className={styles.sub} data-tone={age.late ? 'alert' : undefined}> · {age.words}</span> : null}</> }]
      : i.status === 'draft' ? [{ label: 'Falls due', value: dueModeWords(i, { termsDays: data.rules.termsDays, handoverDay: data.handoverDay ?? null }) }] : []),
    ...(chased && sent ? [{ label: 'Reminded', value: chased.replace(/^Reminded /, '') }] : []),
    ...(i.kind === 'external' && i.externalRef ? [{ label: 'Recorded from', value: i.externalRef }] : []),
    ...(stage?.voided.length && stage.invoice?.id === i.id ? [{ label: 'Replaces', value: stage.voided.map((v) => v.number).filter(Boolean).join(', ') }] : []),
  ]
  const amounts = i.lines?.length ? undefined : [
    { label: 'Amount', amount: i.amountMinor },
    ...(m.gstRate && i.gstMinor ? [{ label: 'incl. GST', amount: i.gstMinor }] : []),   // (simplify S-08) two short rows — the long label wrapped in the panel's narrow column
    ...(i.creditedMinor ? [{ label: 'Credited', amount: i.creditedMinor }] : []),
    ...(sent ? [{ label: 'Paid', amount: i.paidMinor }] : []),
    ...(i.toConfirmMinor ? [{ label: 'To confirm', amount: i.toConfirmMinor }] : []),
    ...(sent && i.status !== 'void' ? [{ label: 'To pay', amount: owed, grand: true }] : []),
  ]
  const lines = i.lines?.length ? i.lines.map((l) => ({ key: l.id, text: l.description, sub: `${l.qty} × ${money2(l.unitMinor)}`, amount: lineAmount(l) })) : undefined
  const totals = i.lines?.length ? [{ label: 'Subtotal', amount: i.subtotalMinor }, ...(i.gstMinor ? [{ label: 'GST', amount: i.gstMinor }] : []), { label: 'Total', amount: i.amountMinor, grand: true },
    ...(sent ? [{ label: 'Paid', amount: i.paidMinor }, { label: 'To pay', amount: owed }] : [])] : undefined

  /* the paper: Preview · Download PDF · Copy the no-login link */
  const page = inv.invoiceHref(i)
  const links = [
    { label: sent ? 'Open the invoice' : 'Preview', icon: 'visibility', run: () => router.push(page), testId: 'invoice-panel-preview' },
    { label: 'Download PDF', icon: 'download', run: () => router.push(`${page}&print=1`), testId: 'invoice-panel-download' },
    ...(sent && i.shareToken && i.kind !== 'external' ? [{ label: 'Copy the no-login link', icon: 'link', run: () => inv.copyLink(i), testId: 'invoice-panel-link' }] : []),
  ]

  /* its payments and its credit notes, each with its ⋮ */
  const pays = payments.list.filter((p) => p.invoiceId === i.id)
  const credits = cn.credits.filter((c) => c.invoiceId === i.id)
  const lists: PanelList[] = []
  if (sent) lists.push({
    title: 'Payments', testId: 'invoice-panel-payments', empty: i.status === 'void' ? 'None — it is void.' : `Nothing paid yet${data.payments?.viewer.records ? ' — record a payment when it comes in' : ''}.`,
    rows: pays.map((p) => {
      const t = PAYMENT_STATUS_TONE[p.status]
      return {
        id: p.id, amount: p.amountMinor, void: p.status === 'reversed' || p.status === 'not_received', lit: focus?.line === p.id, menu: payments.menuItems(p), menuTitle: p.receiptNumber ?? `${money2(p.amountMinor)} · ${p.stageName}`, menuLabel: `More actions for the payment of ${money2(p.amountMinor)}`,
        text: <>{p.receiptNumber ?? 'No receipt yet'} · paid {day(p.paidOn)}</>,
        /* (pending modules S07 — D-14) a payment taken from the client's credit says whose credit note paid it */
        sub: p.method === CREDIT_METHOD ? `From ${client.firstName}’s credit${p.reference ? ` ${p.reference}` : ''} · by ${p.by}` : `${methodLabel(p.method)}${p.reference ? ` · ${p.reference}` : ''} · ${p.source === 'client' ? `from ${client.firstName}’s portal` : `recorded by ${p.by}`}`,
        status: <>{t === 'default' ? <Tag appearance="outlined">{PAYMENT_STATUS_LABEL[p.status]}</Tag> : <Tag appearance="outlined" color={t}>{PAYMENT_STATUS_LABEL[p.status]}</Tag>}<span className={styles.sub}>{payments.statusLine(p)}</span></>,
        attrs: { 'data-payment': p.id, 'data-status': p.status }, testId: 'invoice-panel-payment',
      }
    }),
  })
  if (credits.length || cn.canIssue(i)) lists.push({
    title: 'Credit notes', testId: 'invoice-panel-credits', empty: 'None — Issue a credit note takes money off it.',
    rows: credits.map((c) => ({
      id: c.id, amount: c.amountMinor, void: c.status === 'void', lit: focus?.line === c.id, menu: cn.menuItems(c), menuTitle: c.number,
      /* (pending modules S07 — D-14) the overpayment held as the client's credit says what is left of it, what was used and refunded */
      text: <>{c.number} · {c.kind === 'overpayment' ? 'Overpayment' : c.reason}</>, sub: c.status === 'void' ? `Void — ${c.voidReason}` : c.kind === 'overpayment' ? cn.heldLine(c) : c.refundMinor ? `${money2(c.refundMinor)} refunded by ${methodInLine(c.refundMethod ?? '')}` : cn.refundDueOf(c) ? `${money2(cn.refundDueOf(c))} to refund` : `Issued ${day(c.issuedAt)}`,
      status: c.status === 'void' ? tagOf('Void', 'default') : c.kind === 'overpayment' && cn.heldOf(c) > 0 ? tagOf('Credit held', 'blue') : c.kind === 'overpayment' && !c.refundMinor ? tagOf('Used', 'green') : c.refundMinor ? tagOf('Refunded', 'green') : tagOf('Issued', 'blue'),
      attrs: { 'data-credit': c.id }, testId: 'invoice-panel-credit',
    })),
  })

  /* the one next step first; then Remind · Issue a credit note; the rest in ⋮ */
  const actions: { label: string; run: () => void; primary?: boolean; testId?: string; disabled?: boolean }[] = []
  const toConfirm = focus?.line ? pays.find((p) => p.id === focus.line && p.status === 'to_confirm') ?? null : null
  if (toConfirm && focus?.step === 'confirm' && payments.viewer.confirms) {
    actions.push({ label: 'Confirm', run: () => payments.confirm(toConfirm), primary: true, testId: 'panel-payment-confirm' }, { label: 'Not received', run: () => payments.openRefuse(toConfirm), testId: 'panel-payment-not-received' })
  }
  const canRemind = i.status === 'sent' && owed > 0 && payments.canRecord
  if (canRemind && focus?.step === 'remind') actions.push({ label: 'Remind on WhatsApp', run: () => payments.remind(i), primary: !actions.length, testId: 'panel-invoice-remind' })
  const next = inv.nextStep(i)
  if (next && next.testId !== 'invoice-open') actions.push({ label: next.label, run: next.run, primary: !actions.length, testId: `panel-${next.testId}` })
  if (canRemind && focus?.step !== 'remind') actions.push({ label: 'Remind on WhatsApp', run: () => payments.remind(i), testId: 'panel-invoice-remind' })
  if (cn.canIssue(i)) actions.push({ label: 'Issue a credit note', run: () => cn.openIssue(i), testId: 'panel-invoice-credit' })
  const shown = new Set(actions.map((a) => a.label))
  const menu: RowAction[] = inv.menuItems(i).filter((a) => !shown.has(a.label) && a.label !== 'Open the invoice' && a.label !== 'Preview the invoice' && a.label !== 'Copy the invoice link')

  return (
    <CostPanel open title={i.label ? `${i.label} · ${i.stageName}` : `${i.stageName} invoice`} testId="invoice-panel" onClose={onClose}
               status={<>{invoiceTag(i.state)}{outside ? <span className={styles.sub}>{i.outside ? 'Outside the contract' : 'In the contract'}</span> : null}</>}
               note={note} facts={facts} lines={lines} totals={totals} amounts={amounts} links={links} lists={lists}
               history={history && history.stamp === stamp ? history.rows : []}
               actions={actions} menu={menu} />
  )
}
