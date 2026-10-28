'use client'

import { useRef, useState, type ReactNode } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button, SearchBar, Tag } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { Chips } from '@/components/om/chips'
import { ChipRail } from '@/components/om/chip-rail'
import { MetaChip } from '@/components/om/meta-chip'
import { PortalMenu } from '@/components/om/portal-menu'
import { ScopePill } from '@/components/om/scope-pill'
import { Tooltip } from '@/components/om/tooltip'
import { useSheetLayout } from '@/components/om/sheet'
import { useSnackbar } from '@/components/om/snackbar'
import { DropdownItem, MENU_WIDTH } from '@/components/leads/dropdown'
import { ExportDialog } from '@/components/leads/export-dialog'
import { TabSearchEmpty } from '@/components/leads/tasks/tab-search-empty'
import { CreditsTable } from '@/components/company/plan/credits-table'
import { MOBILE, useMediaQuery } from '@/lib/breakpoint'
import type { TableColumnDef } from '@/components/om/table-columns'
import { withFrom } from '@/lib/nav'
import { displayDate } from '@/lib/format'
import { money2 } from '@/lib/quotes/math'
import { buildTable, downloadBlob, type ExportFormat } from '@/lib/leads/export'
import { MONEY_IN_KINDS, moneyInHref, moneyInKindOf, type MoneyInKind } from '@/lib/finance/sections'
import { ENTITY_PARAM, entityChip, entityMenu, entityOf, entityPillLabel, matchesEntity } from '@/lib/finance/entity-scope'
import { signedMoney } from '@/lib/projects/money'
import { dueIn } from '@/lib/projects/invoices-kinds'
import { methodLabel } from '@/lib/projects/payments-model'
import type { MoneyInCredit, MoneyInData, MoneyInInvoice, MoneyInPayment, MoneyInVariation } from '@/lib/finance/money-in'
import { CREDIT_STATUS, INVOICE_STATUS, PAYMENT_STATUS, exportSheet, rowWords, statusOf, statusOptions, type AnyRow, type Tone } from './money-in-model'
import { FinanceFrame } from '../finance-frame'
import { ProjectCell, RowMenu, projectLines, recordLink, type Next, type RowAction } from '../cost-tables'
import { FinanceCards, cardLine, type FinanceCard } from '../finance-cards'
import fin from '../finance.module.css'
import money from '@/components/projects/money/money.module.css'

/**
 * (parity map 2026-10-10 — FB-013 · FB-016 · FB-012; his "build everything that's in 1.0 to 2.0 … best user experience, cognitive load") Company ›
 * Finance › **Money in** — Money out's twin, so 1.0's three studio-wide registers (Finance › Operations › Invoices · Receipts · Variation orders)
 * have their one home again: the same toolbar (search · the kind switch · one Status pill, only the statuses present · *Issued by* only with two or
 * more entities · Export), the kind's table on the listing's model (`CreditsTable`, as Money out's are). **Invoices** (number, project, status incl.
 * Waiting for approval / Sent back, total, paid, owed, due) · **Payments** (each client payment with its receipt and its state, View receipt) ·
 * **Variation orders** (status, the change, Open) · **Credit notes**. A row opens its project's Money on it (`?open=` with `?from=` back here) —
 * every step stays where it is done; To do is still where what waits on you lives. Read-only: nothing here changes a record.
 * (the calm UI build 2026-10-27 — 5-06 · 5-11 · 5-12 · 5-26 · 5-10 · W-277 · W-302 · W-518) the tab reads **Client payments**; a row's record number in
 * the page's ink opens it; *Next step* names a real step only — Send (a ready Draft), Confirm (a payment to confirm), Remind (an invoice past its
 * day) — each a door to the project's Money on that step, and only for whoever runs the books; "Open" and "View receipt" moved into the row's ⋮
 * (with their testids); "To collect", never "Owed"; one Project cell; one sentence of help with the rule behind *How this works*; a phone's cards.
 */
const day = (ms: number | null | undefined) => (ms ? displayDate(new Date(ms)) : '—')
const shortDay = (ms: number | null | undefined) => (ms ? displayDate(new Date(ms)).replace(/ ’\d\d$/, '') : '—')

const PROJECT_COL: TableColumnDef = { key: 'project', label: 'Project', track: 'minmax(200px, 240fr)' }
const ENTITY_COL: TableColumnDef = { key: 'entity', label: 'Issued by', track: 'minmax(150px, 170fr)' }
const NEXT_COL: TableColumnDef = { key: 'next', label: 'Next step', track: 'minmax(120px, 130fr)' }
const DEFS: Record<MoneyInKind, readonly TableColumnDef[]> = {
  invoices: [
    { key: 'invoice', label: 'Invoice', track: 'minmax(180px, 200fr)', locked: true }, PROJECT_COL,
    { key: 'status', label: 'Status', track: 'minmax(180px, 210fr)' },
    { key: 'total', label: 'Total', track: 'minmax(120px, 130fr)' }, { key: 'paid', label: 'Paid', track: 'minmax(120px, 130fr)' }, { key: 'owed', label: 'To collect', track: 'minmax(120px, 130fr)' },
    { key: 'due', label: 'Due', track: 'minmax(130px, 140fr)' },
  ],
  payments: [
    { key: 'receipt', label: 'Receipt', track: 'minmax(160px, 170fr)', locked: true }, { key: 'invoice', label: 'Invoice', track: 'minmax(160px, 180fr)' }, PROJECT_COL,
    { key: 'amount', label: 'Amount', track: 'minmax(120px, 130fr)' }, { key: 'paid', label: 'Paid on', track: 'minmax(150px, 160fr)' },
    { key: 'status', label: 'Status', track: 'minmax(170px, 200fr)' },
  ],
  variations: [
    { key: 'vo', label: 'Variation order', track: 'minmax(220px, 260fr)', locked: true }, PROJECT_COL,
    { key: 'change', label: 'Change', track: 'minmax(130px, 140fr)' }, { key: 'status', label: 'Status', track: 'minmax(200px, 240fr)' },
  ],
  credits: [
    { key: 'credit', label: 'Credit note', track: 'minmax(200px, 240fr)', locked: true }, { key: 'invoice', label: 'Invoice', track: 'minmax(150px, 160fr)' }, PROJECT_COL,
    { key: 'amount', label: 'Amount', track: 'minmax(120px, 130fr)' }, { key: 'issued', label: 'Issued', track: 'minmax(120px, 130fr)' }, { key: 'status', label: 'Status', track: 'minmax(150px, 170fr)' },
  ],
}
/* (the calm UI build 2026-10-27 — W-518 · T-05) each list says what it is in one sentence; the longer rule waits behind *How this works* */
const HELP: Record<MoneyInKind, string> = {
  invoices: 'Sent invoices and Drafts ready to send.',
  payments: 'Every client payment — confirmed with its receipt, or sent from the portal and waiting to be confirmed.',
  variations: 'Every variation order on the projects.',
  credits: 'Every credit note and the refunds recorded on them.',
}
const HOW: Record<MoneyInKind, string> = {
  invoices: 'Every invoice sent, and the Drafts that are ready to send, waiting for approval or sent back — a stage’s Draft joins once its milestone is reached.',
  payments: 'A client’s payment is confirmed on its project’s Money tab; a confirmed one carries its receipt.',
  variations: 'The client approves each variation order on its link; once approved, it is part of the contract.',
  credits: 'A credit note takes money off a sent invoice, or holds a client’s overpayment as their credit; refunds are recorded on it.',
}
const EMPTY: Record<MoneyInKind, string> = {
  invoices: 'No invoices yet — each project’s are made on its Money tab, one per payment stage.',
  payments: 'No client payments yet — they are recorded against a sent invoice, or the client says they paid from the portal.',
  variations: 'No variation orders yet — a project’s team starts one from its Money tab.',
  credits: 'No credit notes yet — an Owner or an Admin issues one from a sent invoice.',
}
const NOUN: Record<MoneyInKind, string> = { invoices: 'invoices', payments: 'payments', variations: 'variation orders', credits: 'credit notes' }

const tag = (label: string, tone: Tone) => (tone === 'default' ? <Tag appearance="outlined">{label}</Tag> : <Tag appearance="outlined" color={tone}>{label}</Tag>)

export function MoneyInWorkspace({ data, todoCount }: { data: MoneyInData; todoCount: number }) {
  const params = useSearchParams()
  const router = useRouter()
  const snackbar = useSnackbar()
  const phone = useSheetLayout()
  const cards = useMediaQuery(MOBILE)   // (the calm UI build, 5-10) a phone's Leads-model cards
  const runs = data.viewer.runs
  /* the kind and the entity ride the address, as Money out's kind does (the render-phase adjust when a link changes them) */
  const asked = params.get('kind')
  const [kind, setKind] = useState<MoneyInKind>(() => moneyInKindOf(asked))
  const [wasAsked, setWasAsked] = useState(asked)
  if (asked !== wasAsked) { setWasAsked(asked); if (asked) setKind(moneyInKindOf(asked)) }
  const [entityKey, setEntityKey] = useState<string | null>(() => params.get(ENTITY_PARAM))
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [wasKind, setWasKind] = useState(kind)
  if (kind !== wasKind) { setWasKind(kind); setStatus('all'); setQuery('') }
  const statusAnchor = useRef<HTMLSpanElement>(null)
  const entityAnchor = useRef<HTMLSpanElement>(null)
  const [statusOpen, setStatusOpen] = useState(false)
  const [entityOpen, setEntityOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const setParam = (k: string, v: string | null) => {
    try { const u = new URL(window.location.href); if (v) u.searchParams.set(k, v); else u.searchParams.delete(k); window.history.replaceState(null, '', u.toString()) } catch { /* the address is a convenience */ }
  }
  const pickKind = (k: MoneyInKind) => { setKind(k); setParam('kind', k === 'invoices' ? null : k) }
  const pickEntity = (key: string | null) => { setEntityOpen(false); setEntityKey(key === 'all' ? null : key); setParam(ENTITY_PARAM, key === 'all' ? null : key) }

  const projectOf = (id: string) => data.projects.find((p) => p.id === id)
  /* (parity map, MO-079 · FB-105) one Issued by scope, only with two or more entities — P-B's lib/finance/entity-scope.ts */
  const options = data.entities
  const scope = entityOf(options, entityKey)
  const withEntity = options.length > 0
  const all: AnyRow[] = kind === 'invoices' ? data.invoices : kind === 'payments' ? data.payments : kind === 'variations' ? data.variations : data.credits
  const scoped = all.filter((r) => matchesEntity(r.entity, scope, options))
  const q = query.trim().toLowerCase()
  const searched = q ? scoped.filter((r) => rowWords(kind, r, projectOf(r.projectId)).some((w) => w.toLowerCase().includes(q))) : scoped
  const statuses = statusOptions(kind, searched)
  const shown = status === 'all' ? searched : searched.filter((r) => statusOf(kind, r) === status)
  const statusLabel = status === 'all' ? 'All' : statuses.find((x) => x.value === status)?.label ?? 'All'

  /* where a row opens: its project's Money on it, with the way back here (kind and entity kept) */
  const here = (() => { const u = new URLSearchParams(); if (kind !== 'invoices') u.set('kind', kind); if (scope) u.set(ENTITY_PARAM, scope.key); const s = u.toString(); return `${moneyInHref('invoices')}${s ? `?${s}` : ''}` })()
  const openOnMoney = (projectId: string, id: string) => router.push(withFrom(`/projects/${projectId}/money?open=${encodeURIComponent(id)}`, here))
  const openReceipt = (projectId: string, id: string) => router.push(withFrom(`/projects/${projectId}/receipts/${id}`, here))
  /* (the calm UI build, 5-11) a real next step is a door to the project's Money on that step — the step itself, with its checks, is the Money tab's */
  const onMoney = (projectId: string, id: string, step: string) => router.push(withFrom(`/projects/${projectId}/money?open=${encodeURIComponent(id)}${step}`, here))

  /* ── the cells ── */
  /* (the calm UI build 2026-10-27, 5-26) one Project cell — the client, then the number and the project's words */
  const projectCell = (id: string) => { const p = projectOf(id); return p ? <ProjectCell project={p} /> : <span className={money.none}>—</span> }
  const entityCell = (e: string | null) => { const chip = entityChip(e, options); return chip ? <MetaChip>{chip}</MetaChip> : <span className={money.none}>—</span> }
  const nameLink = (label: string, run: () => void, testId: string, sub?: ReactNode, faint = false) => (
    <span className={money.stack}>
      <button type="button" className={`${recordLink}${faint ? ` ${money.void}` : ''}`} onClick={run} data-testid={testId}>{label}</button>
      {sub ? <span className={`${money.sub} ${fin.wrapLine}`}>{sub}</span> : null}
    </span>
  )
  /* the row's one verb (only a real step) and its ⋮ — always there, with Open (and View receipt) in it */
  const nextCell = (verb: Next, items: RowAction[], title: string) => <span className={money.rowActions}>{verb ? <Button appearance="text" onPress={verb.run} data-testid={verb.testId}>{verb.label}</Button> : null}<RowMenu label={`More for ${title}`} title={title} items={items} /></span>
  const amount = (minor: number, faint = false) => (minor ? <span className={`${money.num}${faint ? ` ${money.void}` : ''}`}>{money2(minor)}</span> : <span className={money.none}>—</span>)
  const openItem = (projectId: string, id: string): RowAction => ({ label: 'Open on the project’s Money', run: () => openOnMoney(projectId, id), testId: 'money-in-open' })
  /* ── each kind's one verb (5-11): only a step that waits, for whoever runs the books — the Money tab says why when it can't be done ── */
  const invoiceVerb = (x: MoneyInInvoice): Next => {
    if (!runs) return null
    if (x.status === 'ready') return { label: 'Send', run: () => onMoney(x.projectId, x.id, '&send=1'), testId: 'money-in-send' }
    if (x.status === 'to_confirm') return { label: 'Confirm', run: () => onMoney(x.projectId, x.id, '&do=confirm'), testId: 'money-in-confirm' }
    if (x.overdueMinor > 0) return { label: 'Remind', run: () => onMoney(x.projectId, x.id, '&do=remind'), testId: 'money-in-remind' }
    return null
  }
  const paymentVerb = (x: MoneyInPayment): Next => (runs && x.status === 'to_confirm' ? { label: 'Confirm', run: () => onMoney(x.projectId, x.id, '&do=confirm'), testId: 'money-in-confirm' } : null)
  const paymentItems = (x: MoneyInPayment): RowAction[] => [...(x.receiptNumber ? [{ label: 'View receipt', run: () => openReceipt(x.projectId, x.id), testId: 'money-in-view-receipt' }] : []), openItem(x.projectId, x.id)]

  const invoiceCell = (x: MoneyInInvoice, key: string): ReactNode => {
    const open = () => openOnMoney(x.projectId, x.id)
    if (key === 'invoice') return nameLink(x.label ?? 'Draft', open, 'money-in-open-invoice', x.kind === 'stage' ? x.stageName : `${x.stageName} · ${x.kindWords}`, x.status === 'void')
    if (key === 'project') return projectCell(x.projectId)
    if (key === 'status') {
      const s = INVOICE_STATUS[x.status]
      const age = x.owedMinor - x.toConfirmMinor > 0 ? dueIn(x.dueAt, data.now) : null
      const sub = x.status === 'sent_back' ? (x.reviewNote ? `“${x.reviewNote}”` : null) : x.status === 'awaiting' ? 'For an Owner or an Admin' : x.status === 'to_confirm' ? `${money2(x.toConfirmMinor)} to confirm`
        : x.creditedMinor && x.status !== 'void' ? `${money2(x.creditedMinor)} credited` : age ? age.words : null
      return <span className={money.tagStack}>{tag(s.label, s.tone)}{sub ? <span className={`${money.sub} ${fin.wrapLine}`} data-tone={age?.late ? 'alert' : undefined}>{sub}</span> : null}</span>
    }
    if (key === 'total') return amount(x.amountMinor, x.status === 'void')
    if (key === 'paid') return amount(x.paidMinor)
    if (key === 'owed') return amount(x.owedMinor)
    if (key === 'due') return <span className={money.stack}><span className={money.num}>{x.status === 'void' ? '—' : x.dueAt ? day(x.dueAt) : '—'}</span>{x.sentAt ? <span className={money.sub}>sent {shortDay(x.sentAt)}</span> : null}</span>
    if (key === 'entity') return entityCell(x.entity)
    if (key === 'next') return nextCell(invoiceVerb(x), [openItem(x.projectId, x.id)], x.label ?? 'Draft')
    return null
  }
  const paymentCell = (x: MoneyInPayment, key: string): ReactNode => {
    const faint = x.status === 'reversed' || x.status === 'not_received'
    if (key === 'receipt') return x.receiptNumber ? nameLink(x.receiptNumber, () => openReceipt(x.projectId, x.id), 'money-in-open-receipt', x.source === 'client' ? 'Sent from their portal' : `Recorded by ${x.by}`, faint)
      : <span className={money.stack}><span className={money.none}>—</span><span className={money.sub}>{x.status === 'to_confirm' ? 'Once confirmed' : 'None'}</span></span>
    if (key === 'invoice') return <span className={money.stack}><span className={money.text}>{x.invoiceLabel ?? '—'}</span><span className={money.sub}>{x.stageName}</span></span>
    if (key === 'project') return projectCell(x.projectId)
    if (key === 'amount') return amount(x.amountMinor, faint)
    if (key === 'paid') { const how = `${methodLabel(x.method)}${x.reference ? ` · ${x.reference}` : ''}`; return <span className={money.stack}><span className={money.num}>{day(x.paidOn)}</span><span className={`${money.sub} ${fin.wrapLine}`}>{how}</span></span> }
    if (key === 'status') { const s = PAYMENT_STATUS[x.status]; return <span className={money.tagStack}>{tag(s.label, s.tone)}{x.status === 'to_confirm' && x.trusted ? <span className={money.sub}>Counts already · check it arrived</span> : null}</span> }
    if (key === 'entity') return entityCell(x.entity)
    if (key === 'next') return nextCell(paymentVerb(x), paymentItems(x), x.receiptNumber ?? x.invoiceLabel ?? 'Payment')
    return null
  }
  const voCell = (x: MoneyInVariation, key: string): ReactNode => {
    const open = () => openOnMoney(x.projectId, x.id)
    if (key === 'vo') return nameLink(x.number, open, 'money-in-open-vo', x.title)
    if (key === 'project') return projectCell(x.projectId)
    if (key === 'change') return <span className={`${money.num}${x.amountMinor < 0 ? ` ${money.neg}` : ''}`}>{signedMoney(x.amountMinor)}</span>
    if (key === 'status') return <span className={money.tagStack}>{tag(x.label, x.tone)}{x.billed ? <span className={money.sub}>Billed · {x.billed}</span> : null}</span>
    if (key === 'entity') return entityCell(x.entity)
    if (key === 'next') return nextCell(null, [openItem(x.projectId, x.id)], x.number)
    return null
  }
  const creditCell = (x: MoneyInCredit, key: string): ReactNode => {
    const open = () => openOnMoney(x.projectId, x.id)
    if (key === 'credit') return nameLink(x.number, open, 'money-in-open-credit', x.kind === 'overpayment' ? `Overpayment — ${x.reason.replace(/^./, (c) => c.toLowerCase())}` : x.reason, x.status === 'void')   // (pending modules S07)
    if (key === 'invoice') return <span className={money.text}>{x.invoiceLabel ?? '—'}</span>
    if (key === 'project') return projectCell(x.projectId)
    if (key === 'amount') return amount(x.amountMinor, x.status === 'void')
    if (key === 'issued') return <span className={money.num}>{day(x.issuedAt)}</span>
    if (key === 'status') {
      /* (pending modules S07 — D-14) an overpayment held as the client's credit says what is left of it */
      if (x.kind === 'overpayment' && x.status !== 'void') return <span className={money.tagStack}>{x.heldMinor > 0 ? tag('Credit held', 'blue') : tag(x.refundedMinor ? 'Refunded' : 'Used', 'green')}<span className={money.sub}>{x.heldMinor > 0 ? `${money2(x.heldMinor)} left` : x.refundedMinor ? `${money2(x.refundedMinor)} refunded` : 'Taken off a later invoice'}</span></span>
      const s = CREDIT_STATUS[x.status]; return <span className={money.tagStack}>{tag(s.label, s.tone)}{x.refundedMinor ? <span className={money.sub}>{money2(x.refundedMinor)} refunded</span> : null}</span>
    }
    if (key === 'entity') return entityCell(x.entity)
    if (key === 'next') return nextCell(null, [openItem(x.projectId, x.id)], x.number)
    return null
  }
  /* ── a phone's card for each kind (5-10): the name and its amount, the client · when, the status, the one verb and the ⋮ ── */
  const who = (id: string) => projectLines(projectOf(id) ?? null).first
  const cardOf = (r: AnyRow): FinanceCard => {
    if (kind === 'invoices') {
      const x = r as MoneyInInvoice, st = INVOICE_STATUS[x.status], age = x.owedMinor - x.toConfirmMinor > 0 ? dueIn(x.dueAt, data.now) : null
      return { title: x.label ?? 'Draft', open: () => openOnMoney(x.projectId, x.id), openTestId: 'money-in-open-invoice', sub: x.kind === 'stage' ? x.stageName : `${x.stageName} · ${x.kindWords}`, amount: money2(x.amountMinor), faint: x.status === 'void',
        line: cardLine(who(x.projectId), entityChip(x.entity, options), x.owedMinor ? `${money2(x.owedMinor)} to collect` : null, x.dueAt && x.status !== 'void' ? `due ${shortDay(x.dueAt)}` : null, age ? <span key="a" className={age.late ? fin.late : undefined}>{age.words}</span> : null),
        status: tag(st.label, st.tone), next: invoiceVerb(x), menu: <RowMenu label={`More for ${x.label ?? 'Draft'}`} title={x.label ?? 'Draft'} items={[openItem(x.projectId, x.id)]} /> }
    }
    if (kind === 'payments') {
      const x = r as MoneyInPayment, st = PAYMENT_STATUS[x.status]
      return { title: x.receiptNumber ?? x.invoiceLabel ?? x.stageName, open: x.receiptNumber ? () => openReceipt(x.projectId, x.id) : () => openOnMoney(x.projectId, x.id), openTestId: x.receiptNumber ? 'money-in-open-receipt' : undefined,
        sub: `${x.invoiceLabel ?? x.stageName} · ${x.source === 'client' ? 'Sent from their portal' : `Recorded by ${x.by}`}`, amount: money2(x.amountMinor), faint: x.status === 'reversed' || x.status === 'not_received',
        line: cardLine(who(x.projectId), entityChip(x.entity, options), `paid ${day(x.paidOn)}`, `${methodLabel(x.method)}${x.reference ? ` · ${x.reference}` : ''}`),
        status: <>{tag(st.label, st.tone)}{x.status === 'to_confirm' && x.trusted ? <span>Counts already · check it arrived</span> : null}</>, next: paymentVerb(x),
        menu: <RowMenu label={`More for ${x.receiptNumber ?? 'this payment'}`} title={x.receiptNumber ?? 'Payment'} items={paymentItems(x)} /> }
    }
    if (kind === 'variations') {
      const x = r as MoneyInVariation
      return { title: x.number, open: () => openOnMoney(x.projectId, x.id), openTestId: 'money-in-open-vo', sub: x.title, amount: <span className={x.amountMinor < 0 ? money.neg : undefined}>{signedMoney(x.amountMinor)}</span>,
        line: cardLine(who(x.projectId), entityChip(x.entity, options), x.billed ? `Billed · ${x.billed}` : null), status: tag(x.label, x.tone),
        menu: <RowMenu label={`More for ${x.number}`} title={x.number} items={[openItem(x.projectId, x.id)]} /> }
    }
    const x = r as MoneyInCredit
    const held = x.kind === 'overpayment' && x.status !== 'void'
    return { title: x.number, open: () => openOnMoney(x.projectId, x.id), openTestId: 'money-in-open-credit', sub: x.kind === 'overpayment' ? `Overpayment — ${x.reason.replace(/^./, (c) => c.toLowerCase())}` : x.reason, amount: money2(x.amountMinor), faint: x.status === 'void',
      line: cardLine(who(x.projectId), x.invoiceLabel, entityChip(x.entity, options), `issued ${day(x.issuedAt)}`),
      status: held ? <>{x.heldMinor > 0 ? tag('Credit held', 'blue') : tag(x.refundedMinor ? 'Refunded' : 'Used', 'green')}<span>{x.heldMinor > 0 ? `${money2(x.heldMinor)} left` : x.refundedMinor ? `${money2(x.refundedMinor)} refunded` : 'Taken off a later invoice'}</span></>
        : <>{tag(CREDIT_STATUS[x.status].label, CREDIT_STATUS[x.status].tone)}{x.refundedMinor ? <span>{money2(x.refundedMinor)} refunded</span> : null}</>,
      menu: <RowMenu label={`More for ${x.number}`} title={x.number} items={[openItem(x.projectId, x.id)]} /> }
  }
  const cell = (r: AnyRow, key: string): ReactNode => (kind === 'invoices' ? invoiceCell(r as MoneyInInvoice, key) : kind === 'payments' ? paymentCell(r as MoneyInPayment, key) : kind === 'variations' ? voCell(r as MoneyInVariation, key) : creditCell(r as MoneyInCredit, key))
  const defs = [...DEFS[kind], ...(withEntity ? [ENTITY_COL] : []), NEXT_COL]

  /* the table's one line: what the kind adds up to, as shown (Owners and Admins and the team read the same figures the Money tab gives them) */
  const help = (() => {
    if (kind === 'invoices') { const xs = shown as MoneyInInvoice[]; const owed = xs.reduce((s, x) => s + x.owedMinor, 0), late = xs.reduce((s, x) => s + x.overdueMinor, 0); return owed ? `${money2(owed)} to collect on ${xs.filter((x) => x.owedMinor > 0).length} invoice${xs.filter((x) => x.owedMinor > 0).length === 1 ? '' : 's'}${late ? ` · ${money2(late)} overdue` : ''}. ${HELP.invoices}` : HELP.invoices }
    if (kind === 'payments') { const xs = (shown as MoneyInPayment[]).filter((x) => x.status === 'confirmed'); const sum = xs.reduce((s, x) => s + x.amountMinor, 0); return sum ? `${money2(sum)} confirmed. ${HELP.payments}` : HELP.payments }
    return HELP[kind]
  })()
  /* (T-05) the rule behind a text link, its words in the house tooltip */
  const helpLine = <>{help} <Tooltip label={HOW[kind]}><button type="button" className={fin.how} data-testid="money-in-how">How this works</button></Tooltip></>

  const download = (format: ExportFormat, which: 'all' | 'shown') => {
    const sheet = exportSheet(kind, which === 'all' ? all : shown, projectOf, withEntity)
    const stamp = new Date(data.now).toISOString().slice(0, 10)
    return downloadBlob(buildTable(`OpenMaison — ${sheet.title}`, sheet.head, sheet.body, format), `openmaison-${sheet.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${stamp}.${format.toLowerCase()}`)
  }

  const placeholder = kind === 'invoices' ? 'Search invoices, projects, clients' : kind === 'payments' ? 'Search receipts, invoices, projects' : kind === 'variations' ? 'Search variation orders, projects' : 'Search credit notes, invoices, projects'
  const search = <SearchBar appearance="outlined" size="md" placeholder={placeholder} aria-label={placeholder} value={query} onChange={setQuery} />
  const kindChips = <Chips label="Kind" options={MONEY_IN_KINDS.map((k) => ({ value: k.key, label: k.label }))} value={kind} onChange={(v) => pickKind(v as MoneyInKind)} testId="money-in-kinds" />
  /* (the calm UI build 2026-10-27, 5-10) the pill keeps its name on a phone — "Status: All ▾", never a bare "All ▾" */
  const statusPill = (
    <>
      <span ref={statusAnchor} data-testid="money-in-status"><ScopePill label={`Status: ${statusLabel}`} open={statusOpen} scoped={status !== 'all'} onClick={() => setStatusOpen((o) => !o)} /></span>
      <PortalMenu open={statusOpen} anchor={statusAnchor} onClose={() => setStatusOpen(false)} align="left" width={MENU_WIDTH.wide} role="menu" sheetTitle="Status">
        <DropdownItem role="menuitemradio" checked={status === 'all'} onSelect={() => { setStatusOpen(false); setStatus('all') }}>All · {searched.length}</DropdownItem>
        {statuses.map((x) => <DropdownItem key={x.value} role="menuitemradio" checked={status === x.value} onSelect={() => { setStatusOpen(false); setStatus(x.value) }}>{x.label} · {x.n}</DropdownItem>)}
      </PortalMenu>
    </>
  )
  /* (parity map, MO-079) Issued by — only with two or more entities */
  const entityPill = withEntity ? (
    <>
      <span ref={entityAnchor} data-testid="money-in-entity"><ScopePill label={entityPillLabel(scope)} short={scope ? scope.label : 'All'} open={entityOpen} scoped={!!scope} onClick={() => setEntityOpen((o) => !o)} /></span>
      <PortalMenu open={entityOpen} anchor={entityAnchor} onClose={() => setEntityOpen(false)} align="left" width={MENU_WIDTH.wide} role="menu" sheetTitle="Issued by">
        {entityMenu(options).map((x) => <DropdownItem key={x.key} role="menuitemradio" checked={(scope?.key ?? 'all') === x.key} meta={x.meta} onSelect={() => pickEntity(x.key)}>{x.label}</DropdownItem>)}
      </PortalMenu>
    </>
  ) : null
  const exportBtn = phone
    ? <Tooltip label="Export"><IconButton icon="download" label="Export" onClick={() => setExporting(true)} data-testid="money-in-export" /></Tooltip>
    : <span className={fin.toolEnd}><Button variant="secondary" appearance="outlined" iconStart={<Icon name="download" size={20} />} onPress={() => setExporting(true)} data-testid="money-in-export">Export</Button></span>
  const nothing = !data.projects.length
  const title = MONEY_IN_KINDS.find((k) => k.key === kind)!.label

  return (
    <FinanceFrame tab="money-in" runs={runs} todoCount={todoCount}>
      <div className={fin.page} data-testid="finance-money-in" data-kind={kind}>
        {phone ? (
          <div className={fin.phoneTools}>
            <div className={fin.phoneBar}><span className={fin.phoneSearch}>{search}</span>{exportBtn}</div>
            <ChipRail label="Kind" className={fin.kindRail}>{kindChips}</ChipRail>
            <span className={fin.inlineRow}>{statusPill}{entityPill}</span>
          </div>
        ) : (
          <div className={fin.toolbar}>
            <span className={fin.search}>{search}</span>
            {kindChips}
            {statusPill}
            {entityPill}
            {exportBtn}
          </div>
        )}
        <div className={`${fin.kindBody} ${fin.grows}`} data-testid={`money-in-${kind}`}>
          {(() => {
            const tableHelp = nothing ? (runs ? 'No projects yet.' : 'The projects you work on — no project’s money is yours to see yet.') : helpLine
            const tableEmpty = nothing ? (runs ? 'No projects yet — Client payments lists every project’s invoices, payments, variation orders and credit notes.' : 'No project’s money is yours to see — Client payments lists the projects you work on.') : EMPTY[kind]
            const noResults = all.length && (q || status !== 'all' || scope) ? <TabSearchEmpty noun={NOUN[kind]} searching={!!q} onClearAll={() => { setQuery(''); setStatus('all'); pickEntity('all') }} /> : undefined
            const attrs = (r: AnyRow) => ({ 'data-row': r.id, 'data-project': r.projectId, 'data-status': statusOf(kind, r) })
            return cards
              ? <FinanceCards title={title} testId={`money-in-table-${kind}`} rows={shown} rowKey={(r) => r.id} card={cardOf} rowAttrs={attrs} help={tableHelp} empty={tableEmpty} noResults={noResults} />
              : <CreditsTable table={`finance-money-in-${kind}`} title={title} testId={`money-in-table-${kind}`} defs={defs} rows={shown} rowKey={(r) => r.id} cell={cell} rowAttrs={attrs} help={tableHelp} empty={tableEmpty} noResults={noResults} />
          })()}
        </div>
      </div>
      <ExportDialog open={exporting} title={`Export ${title}`} scope={{ all: all.length, shown: shown.length, noun: NOUN[kind] }} onClose={() => setExporting(false)} download={(format, which) => download(format, which)}
                    onDone={(name, format) => snackbar({ message: `Exported ${title} as ${format} · ${name}` })} />
    </FinanceFrame>
  )
}
