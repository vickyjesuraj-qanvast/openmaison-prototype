/**
 * (parity map 2026-10-10 — FB-013 · FB-016 · FB-012) Money in's words, pure and client-safe: each kind's statuses (the Status pill's rows, only the
 * ones present), what a row searches by, and the export's columns. The figures come from the server (lib/finance/money-in.ts, `moneyOf`); nothing
 * is worked out again here.
 */
import { displayDate } from '@/lib/format'
import { money2 } from '@/lib/quotes/math'
import { INVOICE_STATE_LABEL, INVOICE_STATE_TONE } from '@/lib/projects/money'
import { PAYMENT_STATUS_LABEL, PAYMENT_STATUS_TONE, methodLabel } from '@/lib/projects/payments-model'
import type { MoneyInCredit, MoneyInInvoice, MoneyInPayment, MoneyInProject, MoneyInStatus, MoneyInVariation } from '@/lib/finance/money-in'
import type { MoneyInKind } from '@/lib/finance/sections'

export type Tone = 'default' | 'green' | 'yellow' | 'red' | 'blue'
/** An invoice's status in the register — the Money tab's words, and *Sent back* for a Draft an approver returned. (invented copy: Sent back) */
export const INVOICE_STATUS: Record<MoneyInStatus, { label: string; tone: Tone }> = {
  ready: { label: INVOICE_STATE_LABEL.ready, tone: INVOICE_STATE_TONE.ready },
  awaiting: { label: INVOICE_STATE_LABEL.awaiting, tone: INVOICE_STATE_TONE.awaiting },
  sent_back: { label: 'Sent back', tone: 'default' },
  sent: { label: INVOICE_STATE_LABEL.sent, tone: INVOICE_STATE_TONE.sent },
  overdue: { label: INVOICE_STATE_LABEL.overdue, tone: INVOICE_STATE_TONE.overdue },
  part_paid: { label: INVOICE_STATE_LABEL.part_paid, tone: INVOICE_STATE_TONE.part_paid },
  to_confirm: { label: INVOICE_STATE_LABEL.to_confirm, tone: INVOICE_STATE_TONE.to_confirm },
  paid: { label: INVOICE_STATE_LABEL.paid, tone: INVOICE_STATE_TONE.paid },
  credited: { label: INVOICE_STATE_LABEL.credited, tone: INVOICE_STATE_TONE.credited },
  void: { label: INVOICE_STATE_LABEL.void, tone: INVOICE_STATE_TONE.void },
}
const INVOICE_ORDER: MoneyInStatus[] = ['ready', 'awaiting', 'sent_back', 'sent', 'overdue', 'part_paid', 'to_confirm', 'paid', 'credited', 'void']
export const PAYMENT_STATUS = Object.fromEntries((Object.keys(PAYMENT_STATUS_LABEL) as (keyof typeof PAYMENT_STATUS_LABEL)[]).map((k) => [k, { label: PAYMENT_STATUS_LABEL[k], tone: PAYMENT_STATUS_TONE[k] as Tone }])) as Record<MoneyInPayment['status'], { label: string; tone: Tone }>
const PAYMENT_ORDER: MoneyInPayment['status'][] = ['to_confirm', 'confirmed', 'not_received', 'reversed']
/** A variation order's status key — its Money word as the key, so the pill groups what the rows say. */
export const voKey = (v: Pick<MoneyInVariation, 'label'>) => v.label
export const CREDIT_STATUS = { issued: { label: 'Issued', tone: 'green' as Tone }, void: { label: 'Void', tone: 'default' as Tone } }

export type AnyRow = MoneyInInvoice | MoneyInPayment | MoneyInVariation | MoneyInCredit
/** A row's status key, by kind. */
export function statusOf(kind: MoneyInKind, r: AnyRow): string {
  if (kind === 'invoices') return (r as MoneyInInvoice).status
  if (kind === 'payments') return (r as MoneyInPayment).status
  if (kind === 'variations') return voKey(r as MoneyInVariation)
  return (r as MoneyInCredit).status
}
/** The Status pill's rows for a kind: the statuses present, in the money's order, with how many. */
export function statusOptions(kind: MoneyInKind, rows: AnyRow[]): { value: string; label: string; n: number }[] {
  const count = (v: string) => rows.filter((r) => statusOf(kind, r) === v).length
  if (kind === 'invoices') return INVOICE_ORDER.map((v) => ({ value: v, label: INVOICE_STATUS[v].label, n: count(v) })).filter((x) => x.n)
  if (kind === 'payments') return PAYMENT_ORDER.map((v) => ({ value: v, label: PAYMENT_STATUS[v].label, n: count(v) })).filter((x) => x.n)
  if (kind === 'credits') return (['issued', 'void'] as const).map((v) => ({ value: v, label: CREDIT_STATUS[v].label, n: count(v) })).filter((x) => x.n)
  const labels = [...new Set((rows as MoneyInVariation[]).map(voKey))]
  return labels.map((v) => ({ value: v, label: v, n: count(v) }))
}

/** What a row is found by: its numbers, its project, its client, its stage or title. */
export function rowWords(kind: MoneyInKind, r: AnyRow, p: MoneyInProject | undefined): string[] {
  const base = [p?.number, p?.name, p?.client]
  if (kind === 'invoices') { const x = r as MoneyInInvoice; return [...base, x.label, x.stageName, x.kindWords].filter((s): s is string => !!s) }
  if (kind === 'payments') { const x = r as MoneyInPayment; return [...base, x.receiptNumber, x.invoiceLabel, x.stageName, x.reference, methodLabel(x.method)].filter((s): s is string => !!s) }
  if (kind === 'variations') { const x = r as MoneyInVariation; return [...base, x.number, x.title].filter((s): s is string => !!s) }
  const x = r as MoneyInCredit; return [...base, x.number, x.invoiceLabel, x.reason].filter((s): s is string => !!s)
}

const day = (ms: number | null | undefined) => (ms ? displayDate(new Date(ms)) : '')
/** The export's head and body for a kind — the list's columns, as text (the house `buildTable` writes CSV · XLS · XLSX · PDF). */
export function exportSheet(kind: MoneyInKind, rows: AnyRow[], projectOf: (id: string) => MoneyInProject | undefined, withEntity: boolean): { title: string; head: string[]; body: string[][] } {
  const proj = (id: string) => { const p = projectOf(id); return p ? `${p.number} · ${p.name}` : '' }
  const ent = (e: string | null) => (withEntity ? [e ?? ''] : [])
  const entHead = withEntity ? ['Issued by'] : []
  if (kind === 'invoices') return { title: 'Invoices', head: ['Invoice', 'Stage', 'Project', 'Client', 'Status', 'Total', 'Paid', 'Owed', 'Sent', 'Due', ...entHead],
    body: (rows as MoneyInInvoice[]).map((x) => [x.label ?? 'Draft', x.stageName, proj(x.projectId), projectOf(x.projectId)?.client ?? '', INVOICE_STATUS[x.status].label, money2(x.amountMinor), money2(x.paidMinor), money2(x.owedMinor), day(x.sentAt), day(x.dueAt), ...ent(x.entity)]) }
  if (kind === 'payments') return { title: 'Client payments', head: ['Receipt', 'Invoice', 'Project', 'Amount', 'Paid on', 'Method', 'Reference', 'Status', ...entHead],
    body: (rows as MoneyInPayment[]).map((x) => [x.receiptNumber ?? '', x.invoiceLabel ?? x.stageName, proj(x.projectId), money2(x.amountMinor), day(x.paidOn), methodLabel(x.method), x.reference ?? '', PAYMENT_STATUS[x.status].label, ...ent(x.entity)]) }
  if (kind === 'variations') return { title: 'Variation orders', head: ['Variation order', 'Title', 'Project', 'Change', 'Status', 'Billed', ...entHead],
    body: (rows as MoneyInVariation[]).map((x) => [x.number, x.title, proj(x.projectId), money2(x.amountMinor), x.label, x.billed ?? '', ...ent(x.entity)]) }
  return { title: 'Credit notes', head: ['Credit note', 'Invoice', 'Project', 'Reason', 'Amount', 'Issued', 'Status', 'Refunded', ...entHead],
    body: (rows as MoneyInCredit[]).map((x) => [x.number, x.invoiceLabel ?? '', proj(x.projectId), x.reason, money2(x.amountMinor), day(x.issuedAt), CREDIT_STATUS[x.status].label, x.refundedMinor ? money2(x.refundedMinor) : '', ...ent(x.entity)]) }
}
