'use client'

import type { MouseEvent, ReactNode } from 'react'
import Link from 'next/link'
import { Button, Tag } from '@/components/ds'
import { Chips } from '@/components/om/chips'
import { Tooltip } from '@/components/om/tooltip'
import { MetaChip } from '@/components/om/meta-chip'
import { CreditsTable } from '@/components/company/plan/credits-table'
import { RowMenu } from '@/components/finance/cost-tables'
import textLink from '@/components/om/text-link.module.css'
import type { TableColumnDef } from '@/components/om/table-columns'
import { withFrom } from '@/lib/nav'
import { displayDate } from '@/lib/format'
import { money2 } from '@/lib/quotes/math'
import { ago } from '@/lib/templates/ago'
import { signedMoney, variationLabel, variationTone, viaLabel, type InvoiceView, type StageView, type VariationView } from '@/lib/projects/money'
import { dueIn, dueModeWords, itemiseGap, itemiseWords, kindWords, remindedWords, sentAgo } from '@/lib/projects/invoices-kinds'
import type { MoneyData, useInvoices } from './use-invoices'
import type { usePayments } from './payments-section'
import type { useCreditNotes } from '@/components/finance/books/credit-notes'
import { invoiceTag } from './invoice-panel'
import { isAccounting } from '@/lib/settings/roles'   // (parity map, MI-007) a VO or a quote opens read-only for Accounting
import styles from './money.module.css'

/** (Q-05) The admin's views of Billing: the stages (All) · every invoice sent · the payments · the credit notes — one table, four views. */
export type BillingView = 'all' | 'invoices' | 'payments' | 'credits'
const VIEWS: { value: BillingView; label: string }[] = [{ value: 'all', label: 'All' }, { value: 'invoices', label: 'Invoices' }, { value: 'payments', label: 'Payments' }, { value: 'credits', label: 'Credit notes' }]

/* (S-07) Stage · Amount · Invoice · Paid · Next step — the milestone and the GST are sub-lines, so at 768 the step stays inside the width */
const BILL_DEFS: readonly TableColumnDef[] = [
  { key: 'stage', label: 'Stage', track: 'minmax(170px, 190fr)', locked: true },
  { key: 'amount', label: 'Amount', track: 'minmax(124px, 190fr)' },   // its GST sub-line reads whole at 1440
  { key: 'invoice', label: 'Invoice', track: 'minmax(190px, 330fr)' },   // "INV-… · sent … · due … · n days overdue"
  { key: 'paid', label: 'Paid', track: 'minmax(124px, 200fr)' },
  { key: 'next', label: 'Next step', track: 'minmax(160px, 150fr)' },
]
/* (Q-05) the Invoices view keeps today's *Invoices sent* columns */
const INVOICE_DEFS: readonly TableColumnDef[] = [
  { key: 'invoice', label: 'Invoice', track: 'minmax(170px, 170fr)', locked: true },
  { key: 'stage', label: 'Stage', track: 'minmax(150px, 150fr)' },
  { key: 'amount', label: 'Amount', track: 'minmax(140px, 140fr)' },
  { key: 'gst', label: 'GST', track: 'minmax(110px, 110fr)' },
  { key: 'sent', label: 'Sent', track: 'minmax(120px, 120fr)' },
  { key: 'due', label: 'Due', track: 'minmax(120px, 120fr)' },
  { key: 'status', label: 'Status', track: 'minmax(150px, 150fr)' },
  { key: 'next', label: 'Next step', track: 'minmax(110px, 110fr)' },
]
const VO_DEFS: readonly TableColumnDef[] = [
  { key: 'vo', label: 'Variation order', track: 'minmax(220px, 260fr)', locked: true },
  { key: 'change', label: 'Change', track: 'minmax(130px, 150fr)' },
  { key: 'status', label: 'Status', track: 'minmax(200px, 260fr)' },
  { key: 'next', label: 'Next step', track: 'minmax(150px, 170fr)' },
]

type Row =
  | { kind: 'stage'; key: string; s: StageView; i: InvoiceView | null }
  | { kind: 'void'; key: string; i: InvoiceView }
  | { kind: 'group'; key: string }
  | { kind: 'extra'; key: string; i: InvoiceView }

const pctWords = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(1)}%`
const day = (ms: number | null) => (ms ? displayDate(new Date(ms)) : '--')
const shortDay = (ms: number | null) => (ms ? displayDate(new Date(ms)).replace(/ ’\d\d$/, '') : '--')

/**
 * (simplify S-07 · Q-05, P3 §6.2 Region 4) **Billing** — one table on the listing's model in place of five: the payment stages in order (the
 * spine), each stage's voided invoices as faint sub-rows ("INV-… · Void — reason"), then *Outside the stages* (a VO billed on its own, one-offs,
 * invoices recorded from elsewhere). Each row folds in what used to sit in *Invoices sent*, *Payments* and *Credit notes*: the Invoice cell's
 * sub-line is its number · sent · due · how late · how often chased; the Paid cell's its receipts and what was credited. Pressing a row (or its
 * name) opens the invoice's panel (S-08); the ⋮ is today's menu. Under it, **Changes to the contract** — the variation orders as a short
 * sub-list (hidden with none and none deleted). For Owners and Admins who reconcile, the head's chips switch the one table to today's
 * Invoices · Payments · Credit notes columns (Q-05), so those lists stay as views, never as separate tables.
 */
export function BillingSection({ data, inv, payments, cn, view, onView, admin, focus, onOpen }: {
  data: MoneyData
  inv: ReturnType<typeof useInvoices>
  payments: ReturnType<typeof usePayments>
  cn: ReturnType<typeof useCreditNotes>
  view: BillingView
  onView: (v: BillingView) => void
  admin: boolean
  focus: string | null
  onOpen: (id: string) => void
}) {
  const { money: m, client, viewer, rules, now } = data
  const nameOf = inv.nameOf
  const chips = admin ? <Chips label="Billing view" options={VIEWS} value={view} onChange={(v) => onView(v as BillingView)} testId="money-billing-view" /> : null
  const split = data.split && inv.splitEditable ? <button type="button" className={textLink.link} onClick={inv.openSplit} data-testid="money-change-split">Change the split</button> : null
  const tools = split || chips ? <>{split}{chips}</> : undefined
  const source = m.source === 'quote' && data.quote ? `From ${data.quote.number}’s payment schedule` : 'The split agreed when the project began'
  const sub = `${source} — each stage bills its share of the contract value${m.stages.some((st) => st.fixedMinor != null) ? ' (a fixed fee first)' : ''}, GST included.`

  /* ── the cells ── */
  const step = (i: InvoiceView) => {
    const s = inv.nextStep(i, (x) => onOpen(x.id))
    return (
      <span className={styles.rowActions}>
        {s ? <Button appearance="text" onPress={s.run} isDisabled={inv.busy === i.id} data-testid={s.testId}>{s.label}</Button> : null}
        <RowMenu label={`More actions for the ${i.stageName} invoice`} title={i.number ?? `${i.stageName} invoice`} items={inv.menuItems(i)} />
      </span>
    )
  }
  const amountCell = (amount: number, gst: number, i: InvoiceView | null, share: string | null) => (
    <span className={styles.stack}>
      <span className={styles.amountLine}>
        <span className={styles.num}>{money2(amount)}</span>
        {/* (fix-D, D-34) an edit someone made, with its reason — a Draft off the schedule without a reason is out of step (Needs you), never "Differs" */}
        {i?.differsMinor ? <Tooltip label={`Differs from the schedule by ${money2(Math.abs(i.differsMinor))} — ${i.varianceReason ?? ''}`}><span data-testid="invoice-differs" tabIndex={0}><MetaChip>Differs</MetaChip></span></Tooltip> : null}
      </span>
      <span className={styles.sub}>{[share, m.gstRate ? (gst ? `GST ${money2(gst)} inside` : null) : 'No GST'].filter(Boolean).join(' · ')}</span>
    </span>
  )
  /** The merged facts of *Invoices sent*: "INV-2026-006 · sent 25 Sep · due 2 Oct · 7 days overdue · reminded 2×". */
  const invoiceCell = (i: InvoiceView | null, s: StageView | null) => {
    if (!i) return <span className={styles.none}>--</span>
    const voided = i.status === 'void'
    const owes = !voided && i.balanceMinor - i.toConfirmMinor > 0
    const age = owes && i.status === 'sent' ? dueIn(i.dueAt, now) : null
    const chased = !voided && !i.paidOn && i.status === 'sent' ? remindedWords(i.remindedCount, i.lastRemindedAt) : null
    const parts: ReactNode[] = []
    if (i.status === 'sent') {
      if (i.label) parts.push(<span key="n" className={styles.nowrap}>{i.label}</span>)
      if (i.sentAt) parts.push(<Tooltip key="s" label={`${nameOf(i.sentBy)}${owes ? ` · ${sentAgo(i.sentAt, now)}` : ''}`} whenCut><span data-testid="invoice-sent-age">sent {shortDay(i.sentAt)}</span></Tooltip>)
      if (i.paidOn) parts.push(<span key="p">paid {shortDay(i.paidOn)}</span>)
      else if (i.dueAt) parts.push(<span key="d">due {shortDay(i.dueAt)}</span>)
      if (age) parts.push(<span key="a" data-testid="invoice-age" data-tone={age.late ? 'alert' : undefined}>{age.words}</span>)
      if (chased) parts.push(<span key="r" data-testid="invoice-reminded">{chased.replace(/^Reminded/, 'reminded')}</span>)
    } else if (i.state === 'awaiting') parts.push(<span key="w">{i.submittedBy === viewer.id ? 'You' : nameOf(i.submittedBy)} · {ago(i.submittedAt, now)}</span>)
    else if (i.status === 'draft' && i.reviewNote && i.reviewedAt) parts.push(<span key="b">Sent back by {nameOf(i.reviewedBy)}</span>)
    /* (parity map, MI-031) an itemised Draft whose amount moved since: its lines no longer add up — said here, before Send is pressed */
    else if (i.status === 'draft' && (i.kind ?? 'stage') === 'stage' && i.lines?.length && itemiseGap(i.lines, i.amountMinor, m.contractGstRate)) parts.push(<span key="l" data-testid="invoice-itemise-gap">{itemiseWords(itemiseGap(i.lines, i.amountMinor, m.contractGstRate))}</span>)   /* (S43D, F2-04) the contract's own GST share */
    else if (i.status === 'draft' && s?.voided.length) parts.push(<span key="v">Replaces {s.voided[0]!.number}</span>)
    else if (i.status === 'draft') parts.push(<span key="f">{i.milestone && i.state !== 'ready' ? `Sent when ${i.milestone.title} is ${i.milestone.due === 'start' ? 'under way' : 'done'}` : dueModeWords(i, { termsDays: rules.termsDays, handoverDay: data.handoverDay ?? null })}</span>)
    return (
      <span className={styles.tagStack}>
        {invoiceTag(i.state)}
        {parts.length ? <span className={`${styles.sub} ${styles.dots}`} data-tone={i.state === 'overdue' ? 'alert' : undefined}>{parts}</span> : null}
      </span>
    )
  }
  /** The merged facts of *Payments* and *Credit notes*: what was paid, its receipts, what was credited. */
  const paidCell = (i: InvoiceView | null) => {
    if (!i || i.status === 'draft') return <span className={styles.none}>--</span>
    const receipts = payments.list.filter((p) => p.invoiceId === i.id && p.receiptNumber && p.status === 'confirmed').map((p) => p.receiptNumber!)
    /* (pending modules S07 — D-14) what came beyond it, held as the client's credit, is said on the invoice it came with */
    const extra = (m.held ?? []).filter((h) => h.invoiceId === i.id).reduce((s, h) => s + h.amountMinor, 0)
    const bits = [...receipts, ...(i.creditedMinor ? [`${money2(i.creditedMinor)} credited`] : []), ...(extra ? [`${money2(extra)} kept as credit`] : []), ...(i.toConfirmMinor ? [`${money2(i.toConfirmMinor)} to confirm`] : [])]
    return (
      <span className={styles.stack}>
        {i.paidMinor ? <span className={styles.num}>{money2(i.paidMinor)}</span> : <span className={styles.none}>--</span>}
        {/* (pending modules S07) a cut line shows whole on hover — the house rule for a cut sub-line (REG-820) */}
        {bits.length ? <Tooltip label={bits.join(' · ')} whenCut><span className={styles.sub} data-testid={i.creditedMinor ? 'invoice-credited' : undefined}>{bits.join(' · ')}</span></Tooltip> : null}
      </span>
    )
  }
  const nameButton = (label: string, i: InvoiceView | null, sub: ReactNode, faint = false) => (
    <span className={styles.stack}>
      {i ? <button type="button" className={`${styles.nameLink}${faint ? ` ${styles.void}` : ''}`} onClick={() => onOpen(i.id)} data-testid="invoice-row-open">{label}</button> : <span className={styles.name}>{label}</span>}
      {sub ? <span className={styles.sub}>{sub}</span> : null}
    </span>
  )
  const milestoneWords = (s: StageView) => (s.milestone
    ? `${s.milestone.title} · ${s.milestone.status === 'done' ? 'done' : s.milestone.status === 'not_started' ? 'not started' : s.milestone.status === 'blocked' ? 'blocked' : 'in progress'}`
    : s.onSigning ? 'On signing' : s.due)
  const cell = (r: Row, key: string): ReactNode => {
    if (r.kind === 'group') return key === 'stage' ? <span className={styles.groupLabel} data-testid="money-extras">Outside the stages</span> : null
    if (r.kind === 'void') {
      const i = r.i
      if (key === 'stage') return nameButton(`${i.label ?? 'Invoice'} · Void`, i, i.voidReason ?? null, true)
      if (key === 'amount') return <span className={`${styles.num} ${styles.void}`}>{money2(i.amountMinor)}</span>
      if (key === 'invoice') return <span className={styles.sub}>{nameOf(i.voidedBy)} · {day(i.voidedAt)}</span>
      if (key === 'paid') return <span className={styles.none}>--</span>
      if (key === 'next') return <span className={styles.rowActions}><RowMenu label={`More actions for ${i.label ?? 'the void invoice'}`} title={i.label ?? 'Void invoice'} items={inv.menuItems(i)} /></span>
      return null
    }
    if (r.kind === 'extra') {
      const i = r.i
      if (key === 'stage') return nameButton(i.stageName, i, `${kindWords(i)}${i.kind === 'one_off' && i.lines?.length ? ` · ${i.lines.length} line${i.lines.length === 1 ? '' : 's'}` : ''}`)
      if (key === 'amount') return amountCell(i.amountMinor, i.gstMinor, i, i.outside ? 'Outside the contract' : 'In the contract')
      if (key === 'invoice') return invoiceCell(i, null)
      if (key === 'paid') return paidCell(i)
      if (key === 'next') return step(i)
      return null
    }
    const { s, i } = r
    if (key === 'stage') return nameButton(s.name, i, [milestoneWords(s), i?.lines?.length ? `${i.lines.length} line${i.lines.length === 1 ? '' : 's'}` : null].filter(Boolean).join(' · '))   // (parity map, MI-031) itemised
    if (key === 'amount') return amountCell(i ? i.amountMinor : s.nominalMinor, i ? i.gstMinor : s.gstMinor, i, s.fixedMinor != null ? 'A fixed fee' : pctWords(s.pct))
    if (key === 'invoice') return invoiceCell(i, s)
    if (key === 'paid') return paidCell(i)
    if (key === 'next') return i ? step(i) : <span className={styles.none}>--</span>
    return null
  }

  /* ── the rows: the stages in order (their voided ones under them), then everything outside them ── */
  const rows: Row[] = []
  for (const s of m.stages) {
    rows.push({ kind: 'stage', key: `stage:${s.ref}`, s, i: s.invoice })
    for (const v of s.voided) rows.push({ kind: 'void', key: `void:${v.id}`, i: v })
  }
  const outside = [...m.extras, ...m.invoices.filter((i) => i.status === 'void' && (i.outside || i.kind === 'variation'))]
  if (outside.length) {
    rows.push({ kind: 'group', key: 'group:outside' })
    for (const i of outside) rows.push(i.status === 'void' ? { kind: 'void', key: `void:${i.id}`, i } : { kind: 'extra', key: `extra:${i.id}`, i })
  }
  const rowAttrs = (r: Row): Record<string, string | undefined> => {
    const i = r.kind === 'group' ? null : r.i
    return {
      'data-invoice': i?.id, 'data-stage': r.kind === 'stage' ? r.s.ref : undefined, 'data-kind': r.kind === 'stage' ? undefined : r.kind,
      'data-open-invoice': i?.id, 'data-focus': i && focus === i.id ? '' : undefined,
    }
  }
  /* a press anywhere on a row opens its panel; its own buttons, links and menus keep theirs */
  const onRow = (e: MouseEvent<HTMLDivElement>) => {
    const t = e.target as HTMLElement
    if (t.closest('button, a, input, label, [role="menu"], [role="menuitem"], [role="dialog"]')) return
    const id = t.closest<HTMLElement>('[data-open-invoice]')?.dataset.openInvoice
    if (id) onOpen(id)
  }

  /* ── the variation orders: Changes to the contract ── */
  const voCell = (v: VariationView, key: string): ReactNode => {
    if (key === 'vo') return <span className={styles.stack}><Link href={withFrom(`/quotes/${v.id}${isAccounting(viewer.role) ? '/preview' : ''}`, inv.here)} className={styles.nameLink}>{v.number}</Link><span className={styles.sub}>{v.title}</span></span>
    if (key === 'change') return <span className={`${styles.num}${v.amountMinor < 0 ? ` ${styles.neg}` : ''}`}>{signedMoney(v.amountMinor)}</span>
    if (key === 'status') {
      const t = variationTone(v)
      /* (fix-D, D-33) the client asked for a change; (gaps build B, item 1) billed on its own; (gaps build D, item 2) declined — who and when, their words on hover */
      const line = v.approved && v.billedBy ? `Billed · ${v.billedBy.label ?? 'its own invoice, a Draft'}` : v.approved ? `${v.confirmedBy ?? client.name} · ${day(v.confirmedAt)} · ${viaLabel(v.confirmedVia)}` : v.declined && v.declinedAt ? `Declined · ${ago(v.declinedAt, now)}` : v.changeAsked && v.changeAskedAt ? `Change asked · ${ago(v.changeAskedAt, now)}` : v.withClient && v.clientSentAt ? `Sent ${ago(v.clientSentAt, now)}` : `Started ${day(v.createdAt)}`
      const hover = v.declined ? `${v.declinedBy ?? client.firstName} declined it${v.declinedNote ? `: “${v.declinedNote}”` : ''}` : v.changeAsked ? `${client.firstName} asked for a change${v.changeAskedNote ? `: “${v.changeAskedNote}”` : ' — they will say what on WhatsApp'}` : line
      return <span className={styles.tagStack}>{t === 'default' ? <Tag appearance="outlined">{variationLabel(v)}</Tag> : <Tag appearance="outlined" color={t}>{variationLabel(v)}</Tag>}<Tooltip label={hover} whenCut={!v.changeAsked && !v.declined}><span className={styles.sub} data-testid={v.declined ? 'vo-declined' : v.changeAsked ? 'vo-change-asked' : undefined}>{line}</span></Tooltip></span>
    }
    if (key === 'next') {
      const s = inv.voNext(v)
      return <span className={styles.rowActions}><Button appearance="text" onPress={s.run} isDisabled={inv.busy === v.id} data-testid={s.testId}>{s.label}</Button><RowMenu label={`More actions for ${v.number}`} title={v.number} items={inv.voMenu(v)} /></span>
    }
    return null
  }
  const showVos = m.variations.length > 0 || (data.deletedVariations ?? 0) > 0

  return (
    <section id="billing" className={styles.list} aria-label="Billing" data-list="billing">
      {view === 'payments' ? payments.table(tools)
        : view === 'credits' ? cn.table(tools)
          : view === 'invoices' ? (
            <CreditsTable table="project-money-invoices" title="Invoices" testId="money-invoices" defs={INVOICE_DEFS} rows={m.invoices.filter((i) => i.label && i.status !== 'draft')} rowKey={(i) => i.id}
                          cell={(i, key) => sentCell(i, key)} actions={tools}
                          rowAttrs={(i) => ({ 'data-invoice': i.id, 'data-focus': focus === i.id ? '' : undefined })}
                          help={`Every invoice sent — numbered when sent, due ${rules.termsDays === 0 ? 'on receipt' : `${rules.termsDays} day${rules.termsDays === 1 ? '' : 's'} after`}.`}
                          empty="Nothing sent yet — each stage’s invoice is sent from All." />
          ) : (
            <div onClick={onRow} className={styles.billing}>
              <CreditsTable table="project-money-billing" title="Billing" testId="money-stages" defs={BILL_DEFS} rows={rows} rowKey={(r) => r.key} cell={cell} actions={tools} rowAttrs={rowAttrs}
                            help={sub} empty="No payment stages." />
            </div>
          )}
      {view === 'all' && showVos ? (
        <div id="changes">
          <CreditsTable table="project-money-variations" title="Changes to the contract" testId="money-variations" defs={VO_DEFS} rows={m.variations} rowKey={(v) => v.id} cell={voCell}
                        rowAttrs={(v) => ({ 'data-vo': v.number, 'data-vo-id': v.id, 'data-focus': focus === v.id ? '' : undefined })}
                        help={`Variation orders — ${client.firstName} approves each on its link; once approved, the contract moves and the unsent invoices follow.`}
                        empty={inv.locked ? 'No variation orders were made on this project.' : 'No variation orders now — New ▾ starts one.'}
                        actions={<button type="button" className={textLink.link} onClick={inv.openDeletedVos} data-testid="money-deleted-vos">Deleted variation orders</button>} />
        </div>
      ) : null}
    </section>
  )

  /* today's *Invoices sent* row, for the Invoices view */
  function sentCell(i: InvoiceView, key: string): ReactNode {
    const voided = i.status === 'void'
    if (key === 'invoice') return <span className={styles.stack}><button type="button" className={`${styles.nameLink}${voided ? ` ${styles.void}` : ''}`} onClick={() => onOpen(i.id)}>{i.label}</button>{voided ? <span className={styles.sub}>{i.voidReason}</span> : i.kind === 'external' ? <span className={styles.sub}>Recorded</span> : null}</span>
    if (key === 'stage') return <span className={styles.stack}><span>{i.stageName}</span><span className={styles.sub}>{i.outside || i.kind === 'variation' ? kindWords(i) : i.fixedMinor != null ? 'A fixed fee' : `${pctWords(i.pct)} of ${i.basis.issued ? money2(i.basis.contractMinor) : 'the contract'}`}</span></span>
    if (key === 'amount') return <span className={`${styles.num}${voided ? ` ${styles.void}` : ''}`}>{money2(i.amountMinor)}</span>
    if (key === 'gst') return <span className={styles.num}>{i.gstMinor ? money2(i.gstMinor) : '--'}</span>
    if (key === 'sent') return <span className={styles.stack}><span className={styles.num}>{day(i.sentAt)}</span><span className={styles.sub}>{nameOf(i.sentBy)}</span></span>
    if (key === 'due') { const age = !voided && i.balanceMinor - i.toConfirmMinor > 0 ? dueIn(i.dueAt, now) : null; return <span className={styles.stack}><span className={styles.num}>{voided ? '--' : day(i.dueAt)}</span>{age ? <span className={styles.sub} data-tone={age.late ? 'alert' : undefined}>{age.words}</span> : null}</span> }
    if (key === 'status') return <span className={styles.tagStack}>{invoiceTag(i.state)}{i.paidOn ? <span className={styles.sub}>Paid {day(i.paidOn)}</span> : null}{!voided && i.creditedMinor ? <span className={styles.sub}>{money2(i.creditedMinor)} credited</span> : null}</span>
    if (key === 'next') return step(i)
    return null
  }
}
