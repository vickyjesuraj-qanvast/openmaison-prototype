'use client'

import Link from 'next/link'
import { useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { DateField } from '@/components/om/date-field'
import { TextField } from '@/components/om/text-field'
import { Chips } from '@/components/om/chips'
import { useSnackbar } from '@/components/om/snackbar'
import { CreditsTable } from '@/components/company/plan/credits-table'
import { NoteDialog } from '@/components/templates/editor/review-bar'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import type { TableColumnDef } from '@/components/om/table-columns'
import { displayDate, inputDate, parseInputDate } from '@/lib/format'
import { money2 } from '@/lib/quotes/math'
import { PAY_OUT_METHODS, methodInLine } from '@/lib/finance/model'
import { CREDIT_REASONS, CREDIT_REASON_MAX, creditGstOf, creditableOf, heldNow, usableOn } from '@/lib/finance/credit-model'
import type { CreditNoteView, ProjectBooks } from '@/lib/finance/books'
import { isOutsideContract, type InvoiceView, type MoneySummary } from '@/lib/projects/money'
import { issueCreditNote, recordCreditRefund, undoCreditRefund, undoIssueCreditNote, undoVoidCreditNote, voidCreditNote } from '@/app/finance/books-actions'
import { undoApplyCredit, applyCredit } from '@/app/projects/payment-actions'   // (pending modules S07 — D-14) a client's credit used on a later invoice
import { RowMenu, tagOf, type RowAction } from '../cost-tables'
import money from '@/components/projects/money/money.module.css'
import b from './books.module.css'

/**
 * (gaps build F2 — F2-Q9; 1.0 G-194 · G-335 · G-336) Credit notes on the project's Money tab, with their invoice: the list (number · invoice ·
 * reason · amount and GST · issued · status), Issue a credit note (from an invoice's ⋮ and from the "S$x to credit" band, filled in), Void with a
 * reason, Record the refund (paid beyond what the invoice is left owing). Owners and Admins issue, void and refund (`issues`, the server's rule);
 * the team reads the list. Each step answers with Undo.
 * (simplify S-07 · S-08 · Q-05) The list is the admin's *Credit notes* view of Billing; each credit note also rides on its invoice's row and in
 * its panel (`menuItems` — Open · Record the refund · Void); the "S$x to credit" and "S$x to refund" bands are Needs you rows that call
 * `openOffer` and `openRefund` (the refund row has its button now, P3 §5 item 14).
 */
const DEFS: readonly TableColumnDef[] = [
  { key: 'cn', label: 'Credit note', track: 'minmax(170px, 170fr)', locked: true },
  { key: 'invoice', label: 'Invoice', track: 'minmax(170px, 170fr)' },
  { key: 'reason', label: 'Reason', track: 'minmax(220px, 220fr)' },
  { key: 'amount', label: 'Amount', track: 'minmax(130px, 130fr)' },
  { key: 'gst', label: 'GST', track: 'minmax(110px, 110fr)' },
  { key: 'issued', label: 'Issued', track: 'minmax(120px, 120fr)' },
  { key: 'status', label: 'Status', track: 'minmax(170px, 170fr)' },
  { key: 'next', label: 'Next step', track: 'minmax(150px, 150fr)' },
]
type Issue = { invoiceId: string | null; amountMinor: number | null; reason: string }

export function useCreditNotes({ projectId, books, m, people, focus, records = false, client = 'the client' }: { projectId: string; books: ProjectBooks | null | undefined; m: MoneySummary | null; people: { id: string; name: string }[]; focus: string | null
  /** (pending modules S07) this viewer records payments — and so takes a client's credit off an invoice */ records?: boolean; /** the client's first name */ client?: string }) {
  const router = useRouter()
  const snackbar = useSnackbar()
  const [issuing, setIssuing] = useState<Issue | null>(null)
  const [voiding, setVoiding] = useState<CreditNoteView | null>(null)
  const [refunding, setRefunding] = useState<CreditNoteView | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const issues = !!books?.issues
  const credits = books?.credits ?? []
  const sent = (m?.invoices ?? []).filter((i) => i.status === 'sent')
  const creditable = sent.filter((i) => creditableOf(i) > 0)
  const nameOf = (id: string | null) => people.find((p) => p.id === id)?.name ?? 'Someone'
  const step = async <R extends object>(key: string, what: string, fn: () => Promise<R | { error: string }>, done: (r: R) => { message: string; actionLabel?: string; onAction?: () => void }, after?: () => void) => {
    setBusy(key)
    try {
      const r = await fn()
      if ('error' in r && typeof (r as { error: unknown }).error === 'string') { snackbar({ message: couldnt(what, refusalOf((r as { error: string }).error)) }); return }
      after?.()
      snackbar(done(r as R))
      router.refresh()
    } catch (e) { snackbar({ message: couldnt(what, refusalOf(e)) }) } finally { setBusy(null) }
  }
  const back = (what: string, fn: () => Promise<unknown>, line: string) => async () => {
    try { const r = await fn(); if (r && typeof r === 'object' && 'error' in r) { snackbar({ message: couldnt(what, refusalOf((r as { error: string }).error)) }); return } snackbar({ message: line }); router.refresh() }
    catch (e) { snackbar({ message: couldnt(what, refusalOf(e)) }) }
  }
  /** The band's offer (F2-Q9): the newest sent contract invoice that can take it, the amount it can take, "Contract adjustment — VO-n". */
  const offer = (): Issue => {
    const toCredit = m?.toCreditMinor ?? 0
    const inv = [...creditable].filter((i) => !isOutsideContract(i)).sort((a, z) => (z.sentAt ?? 0) - (a.sentAt ?? 0))[0] ?? null
    const vo = [...(m?.variations ?? [])].filter((v) => v.approved && v.amountMinor < 0).sort((a, z) => (z.confirmedAt ?? z.createdAt) - (a.confirmedAt ?? a.createdAt))[0]
    return { invoiceId: inv?.id ?? null, amountMinor: inv ? Math.min(toCredit, creditableOf(inv)) : toCredit, reason: vo ? `Contract adjustment — ${vo.number}` : 'Contract adjustment' }
  }
  const openIssue = (i?: InvoiceView) => setIssuing(i ? { invoiceId: i.id, amountMinor: null, reason: '' } : { invoiceId: creditable[0]?.id ?? null, amountMinor: null, reason: '' })

  /* ── (pending modules S07 — the projects card's D-14, as recommended) an overpayment held as the client's credit ── */
  const isHeld = (c: CreditNoteView) => c.kind === 'overpayment'
  const heldOf = (c: CreditNoteView) => (isHeld(c) && c.status !== 'void' ? heldNow(m ?? {}, c.id) : 0)
  const usedOf = (c: CreditNoteView) => m?.held?.find((h) => h.id === c.id)?.usedMinor ?? 0
  /** The sent invoices still owing something, oldest first — where a credit goes. */
  const owing = sent.filter((i) => i.balanceMinor - i.toConfirmMinor > 0).sort((a, z) => (a.sentAt ?? 0) - (z.sentAt ?? 0))
  /** Where this credit can go, the oldest first (it never goes back on the invoice it came from — that one is paid). */
  const usableFor = (c: CreditNoteView) => (records && heldOf(c) > 0 ? owing.filter((i) => i.id !== c.invoiceId) : [])
  const applyOn = (c: CreditNoteView, i?: InvoiceView | null) => {
    const to = i ?? usableFor(c)[0]
    if (!to) return
    const amount = usableOn(heldOf(c), to.balanceMinor - to.toConfirmMinor)
    void step(`use-${c.id}`, 'use the credit', () => applyCredit(c.id, to.id), (r) => ({
      message: `${money2(r.amountMinor)} of ${c.number} taken off ${to.label ?? 'the invoice'}${r.leftMinor > 0 ? ` — ${money2(r.leftMinor)} of ${client}’s credit is left` : ''}${r.receipt ? `; receipt ${r.receipt}` : ''}`,
      actionLabel: 'Undo', onAction: back('put it back', () => undoApplyCredit(r.paymentId), `${money2(amount)} is ${client}’s credit again`),
    }))
  }

  const cell = (c: CreditNoteView, key: string): ReactNode => {
    const gone = c.status === 'void'
    if (key === 'cn') return <span className={b.stack}><Link href={pageHref(c)} className={b.nameLink}>{c.number}</Link><span className={b.sub}>{nameOf(c.issuedBy)}</span></span>
    if (key === 'invoice') return <span className={b.stack}><span>{c.invoiceLabel}</span><span className={b.sub}>{c.stageName}</span></span>
    if (key === 'reason') return <span className={b.stack}><span>{c.reason}</span>{gone ? <span className={b.sub}>Void — {c.voidReason}</span> : isHeld(c) ? <span className={b.sub}>{heldLine(c)}</span> : null}</span>
    if (key === 'amount') return <span className={`${b.num}${gone ? ` ${b.void}` : ''}`}>{money2(c.amountMinor)}</span>
    if (key === 'gst') return <span className={b.num}>{c.gstMinor ? money2(c.gstMinor) : '--'}</span>
    if (key === 'issued') return <span className={b.num}>{displayDate(new Date(c.issuedAt))}</span>
    if (key === 'status') return <span className={b.stack}>{gone ? tagOf('Void', 'default') : isHeld(c) && heldOf(c) > 0 ? tagOf('Credit held', 'blue') : isHeld(c) && !c.refundMinor ? tagOf('Used', 'green') : c.refundMinor ? tagOf('Refunded', 'green') : tagOf('Issued', 'blue')}{c.refundMinor ? <span className={b.sub}>{money2(c.refundMinor)} by {methodInLine(c.refundMethod ?? '')}</span> : null}</span>
    if (key === 'next') {
      const due = refundDueOf(c) > 0
      /* (pending modules S07) a held credit's one filled step is the next invoice it goes on; the refund rides the ⋮ then */
      const to = usableFor(c)[0]
      return <span className={b.rowActions}>{to ? <Button appearance="text" onPress={() => applyOn(c, to)} isDisabled={busy === `use-${c.id}`} data-testid="credit-use">{`Use on ${to.label ?? 'the invoice'}`}</Button>
        : issues && due ? <Button appearance="text" onPress={() => setRefunding(c)} data-testid="credit-refund">Record the refund</Button> : null}<RowMenu label={`More for ${c.number}`} title={c.number} items={menuItems(c)} /></span>
    }
    return null
  }
  /** (pending modules S07) A held credit in words: what is left, what was used, what was refunded. *(invented copy)* */
  const heldLine = (c: CreditNoteView) => {
    const left = heldOf(c), used = usedOf(c)
    return [left > 0 ? `${money2(left)} held for ${client}` : null, used > 0 ? `${money2(used)} used` : null, c.refundMinor ? `${money2(c.refundMinor)} refunded` : null].filter(Boolean).join(' · ') || 'Overpayment'
  }
  /** What is still to refund on this credit note (0 when nothing is, or it is void or refunded). */
  const refundDueOf = (c: CreditNoteView) => (c.status === 'void' || c.refundMinor ? 0 : isHeld(c) ? heldOf(c) : Math.min(m?.invoices.find((i) => i.id === c.invoiceId)?.refundDueMinor ?? 0, c.amountMinor))   // (pending modules S07) a held credit refunds what is left of it
  /* (gaps build F2 — the '?from=' back) a credit note's page returns to its invoice's panel on it (simplify S-08) */
  const pageHref = (c: CreditNoteView) => `/projects/${projectId}/credit-notes/${c.id}?from=${encodeURIComponent(`/projects/${projectId}/money?open=${c.id}`)}`
  /** A credit note's steps — its row's ⋮ in the Credit notes view and its line's ⋮ in the invoice's panel (S-08). */
  const menuItems = (c: CreditNoteView): RowAction[] => {
    const gone = c.status === 'void'
    const due = refundDueOf(c)
    /* (pending modules S07) a held credit: Use on each invoice that owes (the oldest first), the refund — never Void (it is the client's money) */
    if (isHeld(c)) return [
      { label: 'Open the credit note', run: () => router.push(pageHref(c)) },
      ...usableFor(c).slice(0, 3).map((i) => ({ label: `Use on ${i.label ?? 'the invoice'}`, run: () => applyOn(c, i), help: `Takes ${money2(usableOn(heldOf(c), i.balanceMinor - i.toConfirmMinor))} off what it owes` })),
      ...(issues && due > 0 ? [{ label: 'Record the refund', run: () => setRefunding(c), help: `${money2(due)} of ${client}’s money is held` }] : []),
    ]
    return [
      { label: 'Open the credit note', run: () => router.push(pageHref(c)) },
      ...(issues && due > 0 ? [{ label: 'Record the refund', run: () => setRefunding(c), help: `${money2(due)} was paid beyond what ${c.invoiceLabel} owes` }] : []),
      ...(issues && !gone ? [{ label: 'Void the credit note', tone: 'danger' as const, run: () => setVoiding(c), disabled: !!c.refundMinor, help: c.refundMinor ? 'A refund is recorded on it' : 'It stays on the record with your reason' }] : []),
    ]
  }
  /** (Q-05) the admin's Credit notes view — `actions` carries Billing's view chips into its head */
  const table = (actions?: ReactNode) => (
    <CreditsTable table="project-money-credits" title="Credit notes" testId="money-credits" defs={DEFS} rows={credits} rowKey={(c) => c.id} cell={cell} actions={actions}
                  rowAttrs={(c) => ({ 'data-credit': c.id, 'data-focus': focus === c.id ? '' : undefined })}
                  help="A credit note takes money off its invoice, its GST at the invoice’s rate; an overpayment’s holds the client’s money for a later invoice or a refund. The client sees each on their portal."
                  empty="No credit notes on this project." />
  )
  const refundDue = refunding ? refundDueOf(refunding) : 0
  const dialogs = (
    <>
      <IssueCreditDialog open={!!issuing} initial={issuing} invoices={creditable} busy={busy === 'issue'} onClose={() => setIssuing(null)}
                         onSave={(o) => { void step('issue', 'issue the credit note', () => issueCreditNote(o), (r) => ({ message: r.sentence, actionLabel: 'Undo', onAction: back('take it back', () => undoIssueCreditNote(r.undo), `${r.number} taken back`) }), () => setIssuing(null)) }} />
      <NoteDialog open={!!voiding} title={`Void ${voiding?.number ?? 'the credit note'}`} label="Why is it void?" action="Void" required maxLength={CREDIT_REASON_MAX} busy={busy === 'void'}
                  help="It stays on the record with this reason; the invoice is owed its amount again, and the client sees it is void." onClose={() => setVoiding(null)}
                  onSubmit={(reason) => { const c = voiding; if (!c) return; void step('void', 'void it', () => voidCreditNote(c.id, { reason }), (r) => ({ message: r.sentence, actionLabel: 'Undo', onAction: back('undo it', () => undoVoidCreditNote(r.undo), `${c.number} counts again`) }), () => setVoiding(null)) }} />
      <RefundDialog open={!!refunding} number={refunding?.number ?? ''} dueMinor={refundDue} busy={busy === 'refund'} onClose={() => setRefunding(null)}
                    onSave={(o) => { const c = refunding; if (!c) return; void step('refund', 'record the refund', () => recordCreditRefund({ id: c.id, ...o }), (r) => ({ message: r.sentence, actionLabel: 'Undo', onAction: back('take it back', () => undoCreditRefund(r.undo), 'Refund taken back') }), () => setRefunding(null)) }} />
    </>
  )
  /** The "S$x to credit" row's step (F2-Q9): Issue a credit note, filled in — null when this viewer may not or nothing can take it. */
  const openOffer = issues && (m?.toCreditMinor ?? 0) > 0 && creditable.length ? () => setIssuing(offer()) : null
  /** An invoice's ⋮ row (Owners and Admins, on a sent invoice with something left to credit). */
  const canIssue = (i: InvoiceView) => issues && i.status === 'sent' && creditableOf(i) > 0
  const refundDueMinor = m?.refundDueMinor ?? 0
  return { table, dialogs, openOffer, canIssue, openIssue, openRefund: (c: CreditNoteView) => setRefunding(c), menuItems, refundDueOf, pageHref, issues, refundDueMinor, credits, busy,
    /* (pending modules S07) */ applyOn, usableFor, heldOf, heldLine }
}

/* ── Issue a credit note ─────────────────────────────────────────────────────────────────────────────────────────────────────── */
function IssueCreditDialog({ open, initial, invoices, busy, onClose, onSave }: {
  open: boolean; initial: Issue | null; invoices: InvoiceView[]; busy: boolean; onClose: () => void
  onSave: (o: { invoiceId: string; amountMinor: number; reason: string }) => void
}) {
  const label = (i: InvoiceView) => `${i.label ?? i.stageName} · ${i.stageName}`
  const [invoiceId, setInvoiceId] = useState<string | null>(null)
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [chip, setChip] = useState<string | null>(null)
  const [tried, setTried] = useState(false)
  const [wasOpen, setWasOpen] = useState(false)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      const inv = invoices.find((i) => i.id === initial?.invoiceId) ?? invoices[0] ?? null
      setInvoiceId(inv?.id ?? null); setAmount(initial?.amountMinor ? (initial.amountMinor / 100).toFixed(2) : ''); setReason(initial?.reason ?? ''); setChip(null); setTried(false)
    }
  }
  const inv = invoices.find((i) => i.id === invoiceId) ?? null
  const left = inv ? creditableOf(inv) : 0
  const minor = Math.round(Number(amount.replace(/,/g, '')) * 100)
  const amountWhy = !inv ? 'Pick the invoice' : amount.trim() === '' || !(minor > 0) ? 'Enter the amount to credit' : minor > left ? `No more than the ${money2(left)} it has left` : undefined
  const reasonWhy = !reason.trim() ? 'Say why it is credited' : undefined
  const gst = inv && minor > 0 ? creditGstOf(minor, inv) : 0
  const save = () => { setTried(true); if (amountWhy || reasonWhy || !inv) return; onSave({ invoiceId: inv.id, amountMinor: minor, reason: reason.trim() }) }
  return (
    <Dialog open={open} onClose={onClose} title="Issue a credit note" size="form" width={600}
            subtitle="It takes money off the invoice, its GST at the invoice’s own rate, and is numbered when issued. The client sees it on their portal."
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose} isDisabled={busy}>Cancel</Button><Button onPress={save} isDisabled={busy} data-testid="credit-issue-save">{busy ? 'Issuing…' : 'Issue the credit note'}</Button></>}>
      <div className={money.fields} data-testid="credit-issue-dialog">
        <TextField label="Against the invoice" mode="select" options={invoices.map(label)} value={inv ? label(inv) : ''} onChange={(v) => setInvoiceId(invoices.find((i) => label(i) === v)?.id ?? null)} required error={tried && !inv ? 'Pick the invoice' : undefined} />
        <TextField label="Amount to credit, GST included (S$)" value={amount} numeric="money" onChange={setAmount} required autoFocus error={tried ? amountWhy : undefined}
                   helper={inv ? `${money2(left)} left to credit${gst ? ` · GST inside it ${money2(gst)}` : ''}` : undefined} />
        <div>
          <span className={money.fieldLabel}>Reason</span>
          <Chips label="Reason" options={CREDIT_REASONS.map((r) => ({ value: r, label: r }))} value={chip} onChange={(v) => { setChip(v); setReason(v ?? '') }} testId="credit-reasons" />
        </div>
        <TextField label="Reason, as the client reads it" value={reason} onChange={(v) => { setReason(v); setChip(null) }} maxLength={CREDIT_REASON_MAX} required error={tried ? reasonWhy : undefined} multiline={2} />
      </div>
    </Dialog>
  )
}

/* ── Record the refund ───────────────────────────────────────────────────────────────────────────────────────────────────────── */
function RefundDialog({ open, number, dueMinor, busy, onClose, onSave }: {
  open: boolean; number: string; dueMinor: number; busy: boolean; onClose: () => void
  onSave: (o: { amountMinor: number; paidOn: number; method: string; reference: string | null }) => void
}) {
  const [today] = useState(() => new Date())
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(inputDate(today))
  const [method, setMethod] = useState<string | null>('bank_transfer')
  const [reference, setReference] = useState('')
  const [tried, setTried] = useState(false)
  const [wasOpen, setWasOpen] = useState(false)
  if (open !== wasOpen) { setWasOpen(open); if (open) { setAmount((dueMinor / 100).toFixed(2)); setDate(inputDate(today)); setMethod('bank_transfer'); setReference(''); setTried(false) } }
  const minor = Math.round(Number(amount.replace(/,/g, '')) * 100)
  const amountWhy = amount.trim() === '' || !(minor > 0) ? 'Enter the amount refunded' : minor > dueMinor ? `No more than the ${money2(dueMinor)} owed back` : undefined
  const day = parseInputDate(date)
  const dayWhy = !day ? 'Pick the day it was refunded' : day.getTime() > today.getTime() ? 'Today or before' : undefined
  const save = () => { setTried(true); if (amountWhy || dayWhy || !method || !day) return; onSave({ amountMinor: minor, paidOn: day.getTime(), method, reference: reference.trim() || null }) }
  return (
    <Dialog open={open} onClose={onClose} title="Record the refund" subtitle={`${number} — ${money2(dueMinor)} was paid beyond what the invoice owes.`} size="form" width={600}
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose} isDisabled={busy}>Cancel</Button><Button onPress={save} isDisabled={busy} data-testid="credit-refund-save">{busy ? 'Recording…' : 'Record the refund'}</Button></>}>
      <div className={money.fields} data-testid="credit-refund-dialog">
        <div className={money.pairs}>
          <TextField label="Amount refunded (S$)" value={amount} numeric="money" onChange={setAmount} required autoFocus error={tried ? amountWhy : undefined} />
          <DateField label="Refunded on" value={date} onChange={setDate} today={today} max={today} required error={tried ? dayWhy : undefined} />
        </div>
        <div>
          <span className={money.fieldLabel}>How it was refunded</span>
          <Chips label="How it was refunded" options={PAY_OUT_METHODS} value={method} onChange={(v) => setMethod(v)} testId="credit-refund-method" />
        </div>
        <TextField label="Reference" value={reference} onChange={setReference} maxLength={60} helper="The bank’s reference, so it can be matched later" />
      </div>
    </Dialog>
  )
}
