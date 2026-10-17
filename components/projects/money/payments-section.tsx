'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button, Tag } from '@/components/ds'
import { Tooltip } from '@/components/om/tooltip'
import { useSnackbar } from '@/components/om/snackbar'
import { couldnt, refusalOf, useRun } from '@/components/leads/tasks/use-run'
import { NoteDialog } from '@/components/templates/editor/review-bar'
import { CreditsTable } from '@/components/company/plan/credits-table'
import { RowMenu, type RowAction } from '@/components/finance/cost-tables'
import type { TableColumnDef } from '@/components/om/table-columns'
import { withFrom } from '@/lib/nav'
import { displayDate } from '@/lib/format'
import { money2 } from '@/lib/quotes/math'
import { ago } from '@/lib/templates/ago'
import { waLink } from '@/lib/portal/model'
import type { InvoiceView } from '@/lib/projects/money'
import type { ProjectMoneyData } from '@/lib/projects/money-queries'
import type { PaymentView } from '@/lib/projects/payments'
import { PAYMENT_STATUS_LABEL, PAYMENT_STATUS_TONE, REASON_MAX, REVERSE_RULE, methodLabel, reminderMessage } from '@/lib/projects/payments-model'   // (parity map, MI-007) REVERSE_RULE — the server's words
import { CALL_AFTER_REMINDERS } from '@/lib/projects/invoices-kinds'   // (parity map, MI-068)
import {
  confirmPayment, markNotReceived, recordPayment, remindInvoice, reversePayment, undoConfirmPayment, undoNotReceived, undoRecordPayment, undoReversePayment,
} from '@/app/projects/payment-actions'
import { RecordPaymentDialog } from './payments-dialogs'
import styles from './money.module.css'

const DEFS: readonly TableColumnDef[] = [
  { key: 'receipt', label: 'Receipt', track: 'minmax(170px, 170fr)', locked: true },
  { key: 'invoice', label: 'Invoice', track: 'minmax(170px, 170fr)' },
  { key: 'amount', label: 'Amount', track: 'minmax(130px, 130fr)' },
  { key: 'paid', label: 'Paid on', track: 'minmax(150px, 150fr)' },
  { key: 'from', label: 'From', track: 'minmax(180px, 180fr)' },
  { key: 'status', label: 'Status', track: 'minmax(220px, 220fr)' },
  { key: 'next', label: 'Next step', track: 'minmax(150px, 150fr)' },
]
const day = (ms: number | null) => (ms ? displayDate(new Date(ms)) : '--')

/**
 * (Projects round 6 — F-10 · F-11 · F-12 · F-14 · F-18 · Q-48) The Money tab's payments, as one hook its tab places. (simplify S-07 · S-08 · Q-05)
 * The banners it drew (a client's payment to confirm, an invoice past its due day) are Needs you rows now (lib/projects/money-needs.ts →
 * components/projects/money/needs-list.tsx, which calls `confirm` · `openRefuse` · `remind` · `recordFor` here); each payment lives on its
 * invoice's row and in the invoice's panel (`menuItems` — Open the receipt · Copy the receipt link · See the bank’s confirmation · Confirm · Not
 * received · Reverse, each refusal said in its row); the Payments table stays as the admin's *Payments* view of Billing (today's columns). The
 * Record a payment dialog, the reasons' dialogs and the reminder that opens WhatsApp on the press (REG-534) are unchanged. Every answer takes
 * the house snackbar, with Undo where something can be taken back. `?open=<payment>` is the tab's (it opens the invoice's panel on the line).
 */
export function usePayments(data: ProjectMoneyData, focus: string | null = null) {
  const { project, client, money: m, now } = data
  const pay = data.payments ?? null
  const router = useRouter()
  const snackbar = useSnackbar()
  const { run } = useRun()
  const [busy, setBusy] = useState<string | null>(null)
  const [recording, setRecording] = useState<InvoiceView | null>(null)
  const [prefill, setPrefill] = useState<number | null>(null)   // (pending modules S10) Record a payment's amount, from Maison AI
  const [refusing, setRefusing] = useState<PaymentView | null>(null)
  const [reversing, setReversing] = useState<PaymentView | null>(null)
  const [origin] = useState(() => (typeof window === 'undefined' ? '' : window.location.origin))
  const [justMade, setJustMade] = useState<string | null>(null)
  const today = new Date(now)
  const here = `/projects/${project.id}/money`
  /* (simplify S-08) the receipt and the proof come back to the invoice's panel on this payment (`?open=`) */
  const receiptHref = (p: PaymentView) => withFrom(`/projects/${project.id}/receipts/${p.id}`, `${here}?open=${encodeURIComponent(p.id)}`)
  const proofHref = (p: PaymentView) => (p.proof ? withFrom(`/projects/${project.id}/files/${p.proof.id}`, `${here}?open=${encodeURIComponent(p.id)}`) : null)
  const confirmerNames = (pay?.confirmers ?? []).map((c) => c.name.split(/\s+/)[0]).join(' or ')

  if (!m || !pay) {
    const none = (() => {}) as (x: InvoiceView | PaymentView, amountMinor?: number | null) => void
    return { recordFor: none, remind: none, confirm: none, openRefuse: none, menuItems: (() => []) as (p: PaymentView) => RowAction[], statusLine: (() => '') as (p: PaymentView) => string,
      receiptHref, proofHref, list: [] as PaymentView[], viewer: { records: false, confirms: false, reverses: false }, confirmerNames, trust: false, canRecord: false, busy, justMade, table: (() => null) as (actions?: ReactNode) => ReactNode, dialogs: null }
  }

  const act = async (id: string, what: string, fn: () => Promise<unknown>, done?: Parameters<typeof run>[2]) => {
    setBusy(id)
    try { return await run(what, fn, done) } finally { setBusy(null) }
  }

  /* ── the answers ── */
  /* (pending modules S10) `amountMinor` — what Maison AI's "Benjamin paid 5,000" named: the dialog opens with it filled in, to check */
  const recordFor = (i: InvoiceView, amountMinor: number | null = null) => { setPrefill(amountMinor); setRecording(i) }
  const record = (i: InvoiceView, o: Parameters<Parameters<typeof RecordPaymentDialog>[0]['onSave']>[0]) => {
    setBusy(`rec-${i.id}`)
    void recordPayment(i.id, { amountMinor: o.amountMinor, paidOn: o.paidOn, method: o.method, reference: o.reference, note: o.note || null, proof: o.proof ? { name: o.proof.name, dataUrl: o.proof.dataUrl } : null }).then((r) => {
      setBusy(null)
      if ('error' in r) { snackbar({ message: couldnt('record the payment', refusalOf(r.error)) }); return }
      setRecording(null)
      setJustMade(r.paymentId)
      const state = r.state === 'paid' ? `${i.number} is paid` : `${money2(r.balanceMinor)} still owed on ${i.number}`
      /* (pending modules S07 — D-14) the extra is said with its credit note's number */
      const extra = r.credit ? ` — the extra ${money2(r.credit.amountMinor)} is ${client.firstName}’s credit, ${r.credit.number}` : ''
      snackbar({ message: `Payment recorded — ${r.receipt ? `receipt ${r.receipt}; ` : ''}${state}${extra}`, actionLabel: 'Undo', onAction: () => { void run('take the payment back', () => undoRecordPayment(r.paymentId), 'The payment is taken back') } })
    }, () => { setBusy(null); snackbar({ message: couldnt('record the payment') }) })
  }
  const remind = (i: InvoiceView) => {
    const owed = Math.max(0, i.amountMinor - i.paidMinor - i.toConfirmMinor)
    const text = reminderMessage({ client: client.name, studio: data.studioName, stage: i.stageName, number: i.number ?? '', amount: money2(owed), due: i.dueAt ? displayDate(new Date(i.dueAt)) : '', url: data.portalAccess ? `${origin}${data.portalUrl}` : null, late: i.dueAt !== null && now >= i.dueAt + 86_400_000 })   // (fix-D, D-25) "is due" until the day has passed
    window.open(waLink(client.phone, text), '_blank', 'noopener')   // on the press, before the round trip (REG-534)
    /* (parity map, MI-068) the third: the next step is a call — Owners and Admins are told (the server's `invoice_reminded`) */
    const third = (i.remindedCount ?? 0) + 1 === CALL_AFTER_REMINDERS && i.overdueMinor > 0
    void act(i.id, 'record the reminder', () => remindInvoice(i.id), third ? `Third reminder drafted on WhatsApp for ${client.firstName} — next, a call; Owners and Admins are told` : `Reminder drafted on WhatsApp for ${client.firstName} — it’s on the project’s Activity`)   // (invented copy)
  }
  const confirm = (p: PaymentView) => {
    setBusy(p.id)
    void confirmPayment(p.id).then((r) => {
      setBusy(null)
      if ('error' in r) { snackbar({ message: couldnt('confirm the payment', refusalOf(r.error)) }); return }
      snackbar({ message: `Confirmed — ${money2(p.amountMinor)} from ${client.firstName}${r.receipt ? `, receipt ${r.receipt}` : ''}${r.credit ? `; the extra ${money2(r.credit.amountMinor)} is their credit, ${r.credit.number}` : ''}`, actionLabel: 'Undo', onAction: () => { void run('take the confirmation back', () => undoConfirmPayment(p.id), 'Back to To confirm') } })
    }, () => { setBusy(null); snackbar({ message: couldnt('confirm the payment') }) })
  }
  const refuse = (p: PaymentView, reason: string) => {
    void act(p.id, 'mark it not received', async () => { const r = await markNotReceived(p.id, { reason }); if (!('error' in r)) setRefusing(null); return r },
      { message: `Marked not received — ${client.firstName} reads why on their page`, actionLabel: 'Undo', onAction: () => { void run('take it back', () => undoNotReceived(p.id), 'Back to To confirm') } })
  }
  const reverse = (p: PaymentView, reason: string) => {
    void act(p.id, 'reverse the payment', async () => { const r = await reversePayment(p.id, { reason }); if (!('error' in r)) setReversing(null); return r },
      { message: `${p.receiptNumber ?? 'The payment'} reversed — it no longer counts toward ${p.invoiceNumber ?? 'the invoice'}`, actionLabel: 'Undo', onAction: () => { void run('undo the reversal', () => undoReversePayment(p.id), 'The payment counts again') } })
  }
  const copyReceipt = (p: PaymentView) => {
    const url = `${origin}/receipt/${p.shareToken}`
    void navigator.clipboard?.writeText(url).then(() => snackbar({ message: `Link to ${p.receiptNumber} copied — it opens without signing in` }), () => snackbar({ message: couldnt('copy the link') }))
  }

  /** A payment's steps — the row's ⋮ in the Payments view and the line's ⋮ in its invoice's panel (S-08); a refusal says why in its row. */
  const menuItems = (p: PaymentView): RowAction[] => {
    const out: RowAction[] = []
    if (p.receiptNumber) out.push({ label: 'Open the receipt', run: () => router.push(receiptHref(p)) })
    /* (gaps build B, item 6) the receipt's no-login link — for a client not on the portal */
    if (p.receiptNumber && p.shareToken) out.push({ label: 'Copy the receipt link', run: () => copyReceipt(p), help: 'Opens without signing in — for a client not on the portal' })
    if (p.proof) out.push({ label: 'See the bank’s confirmation', run: () => router.push(proofHref(p)!) })
    if (p.status === 'to_confirm') out.push({ label: 'Confirm', run: () => confirm(p), disabled: !pay.viewer.confirms, help: pay.viewer.confirms ? undefined : `${confirmerNames || 'The studio'} confirms it` })
    if (p.status === 'to_confirm') out.push({ label: 'Not received', run: () => setRefusing(p), disabled: !pay.viewer.confirms, help: pay.viewer.confirms ? `${client.firstName} reads why` : `${confirmerNames || 'The studio'} answers it` })
    if (p.status === 'confirmed') out.push({ label: 'Reverse', run: () => setReversing(p), tone: 'danger', disabled: !pay.viewer.reverses, help: pay.viewer.reverses ? undefined : REVERSE_RULE })
    return out
  }

  /* ── the Payments view (Q-05: the admin's chip; today's columns) ── */
  const cell = (p: PaymentView, key: string): ReactNode => {
    if (key === 'receipt') return p.receiptNumber
      ? <span className={styles.stack}><Link href={receiptHref(p)} className={`${styles.nameLink}${p.status === 'reversed' ? ` ${styles.void}` : ''}`}>{p.receiptNumber}</Link><span className={styles.sub}>{`Issued ${day(p.confirmedAt)}`}</span></span>
      : <span className={styles.stack}><span className={styles.none}>--</span><span className={styles.sub}>{p.status === 'to_confirm' ? 'Once confirmed' : 'None'}</span></span>
    if (key === 'invoice') return <span className={styles.stack}><span>{p.invoiceNumber ?? '--'}</span><span className={styles.sub}>{p.stageName}</span></span>
    if (key === 'amount') return <span className={`${styles.num}${p.status === 'reversed' || p.status === 'not_received' ? ` ${styles.void}` : ''}`}>{money2(p.amountMinor)}</span>
    /* (fix-D, D-46) a cut method · reference shows whole on hover */
    if (key === 'paid') { const how = `${methodLabel(p.method)}${p.reference ? ` · ${p.reference}` : ''}`; return <span className={styles.stack}><span className={styles.num}>{day(p.paidOn)}</span><Tooltip label={how} whenCut><span className={styles.sub}>{how}</span></Tooltip></span> }
    /* (fix-D, D-30) From = who paid — the client, always; who recorded it is the line under */
    if (key === 'from') return <span className={styles.stack}><span className={styles.text}>{client.name}</span><span className={styles.sub}>{p.source === 'client' ? 'Sent from their portal' : `Recorded by ${p.by}`}</span></span>
    if (key === 'status') {
      const t = PAYMENT_STATUS_TONE[p.status]
      const sub = statusLine(p)
      return <span className={styles.tagStack}>{t === 'default' ? <Tag appearance="outlined">{PAYMENT_STATUS_LABEL[p.status]}</Tag> : <Tag appearance="outlined" color={t}>{PAYMENT_STATUS_LABEL[p.status]}</Tag>}<Tooltip label={sub} whenCut><span className={styles.sub}>{sub}</span></Tooltip></span>
    }
    if (key === 'next') {
      const step = p.status === 'to_confirm' && pay.viewer.confirms ? <Button appearance="text" onPress={() => confirm(p)} isDisabled={busy === p.id} data-testid="payment-row-confirm">Confirm</Button>
        : p.receiptNumber ? <Button appearance="text" onPress={() => router.push(receiptHref(p))} data-testid="payment-open-receipt">Open</Button> : null
      return <span className={styles.rowActions}>{step}<RowMenu label={`More actions for the payment of ${money2(p.amountMinor)}`} title={p.receiptNumber ?? `${money2(p.amountMinor)} · ${p.stageName}`} items={menuItems(p)} /></span>
    }
    return null
  }
  const statusLine = (p: PaymentView) => (p.status === 'confirmed' ? `${p.confirmedBy ?? 'Someone'} · ${ago(p.confirmedAt, now)}`
    : p.status === 'to_confirm' ? (p.trusted ? 'Counts already · check it arrived' : `Sent ${ago(p.createdAt, now)}`)
      : p.status === 'not_received' ? `${p.rejectedBy ?? 'Someone'}: ${p.rejectReason ?? ''}`
        : `${p.reversedBy ?? 'Someone'}: ${p.reverseReason ?? ''}`)
  /** (Q-05) the admin's Payments view — `actions` carries Billing's view chips into its head */
  const table = (actions?: ReactNode) => (
    <CreditsTable table="project-money-payments" title="Payments" testId="money-payments" defs={DEFS} rows={pay.list} rowKey={(p) => p.id} cell={cell} actions={actions}
                  rowAttrs={(p) => ({ 'data-payment': p.id, 'data-status': p.status, 'data-focus': focus === p.id || justMade === p.id ? '' : undefined })}
                  help={`What ${client.firstName} has paid — confirmed with its receipt, or sent from the portal for ${confirmerNames || 'the studio'} to confirm.`}
                  empty={`No payments yet — record one against a sent invoice, or ${client.firstName} says they paid from the portal.`} />
  )

  const dialogs = (
    <>
      {/* (pending modules S07) what is still owed is the invoice's balance — less its credit notes too, as the server reads it */}
      <RecordPaymentDialog open={!!recording} today={today} busy={!!recording && busy === `rec-${recording.id}`} methods={pay.methods ?? null} client={client.firstName} amountMinor={prefill}
                           invoice={recording ? { number: recording.number, stageName: recording.stageName, owedMinor: Math.max(0, recording.balanceMinor - recording.toConfirmMinor), sentAt: recording.sentAt } : null}
                           onClose={() => setRecording(null)} onSave={(o) => { if (recording) record(recording, o) }} />
      <NoteDialog open={!!refusing} title="Not received" label="Why — what didn’t match?" action="Mark not received" required maxLength={REASON_MAX} busy={!!refusing && busy === refusing.id}
                  help={`${client.firstName} reads this on their page and can send the payment again.`}
                  onClose={() => setRefusing(null)} onSubmit={(reason) => { if (refusing) refuse(refusing, reason) }} />
      <NoteDialog open={!!reversing} title={`Reverse ${reversing?.receiptNumber ?? 'the payment'}`} label="Why is it reversed?" action="Reverse" required maxLength={REASON_MAX} busy={!!reversing && busy === reversing.id}
                  help="It stays on the record with this reason; its receipt reads Reversed and the invoice is owed again."
                  onClose={() => setReversing(null)} onSubmit={(reason) => { if (reversing) reverse(reversing, reason) }} />
    </>
  )
  return {
    recordFor, remind, confirm, openRefuse: (p: PaymentView) => setRefusing(p), menuItems, receiptHref, proofHref, statusLine,
    list: pay.list, viewer: pay.viewer, confirmerNames, trust: pay.rules.trust, canRecord: pay.viewer.records, busy, justMade, table, dialogs,
  }
}
