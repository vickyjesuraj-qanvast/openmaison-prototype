'use client'

import { useRef, useState, type ReactNode } from 'react'
import { Button, Tag } from '@/components/ds'
import { IconButton } from '@/components/om/icon-button'
import { PortalMenu } from '@/components/om/portal-menu'
import { Tooltip } from '@/components/om/tooltip'
import { MetaChip } from '@/components/om/meta-chip'
import { DropdownItem, MENU_WIDTH } from '@/components/leads/dropdown'
import { CreditsTable } from '@/components/company/plan/credits-table'
import type { TableColumnDef } from '@/components/om/table-columns'
import { displayDate, phoneLocal } from '@/lib/format'
import { money2 } from '@/lib/quotes/math'
import {
  BILL_STATE_LABEL, BILL_STATE_TONE, EXPENSE_STATE_LABEL, EXPENSE_STATE_TONE, EXTERNAL_PO_WORDS, PO_STATE_LABEL, PO_STATE_TONE, lateDeliveryWords, methodLabel, viaWords, type PayoutRecord, type Tone, type VendorRecord,
} from '@/lib/finance/model'
import type { BillView, ExpenseView, PoView } from '@/lib/finance/costs'
import { repeatLabel } from '@/lib/finance/repeats'
import money from '@/components/projects/money/money.module.css'

/*
 * (gaps build F1 — money out) The lists of money out — POs, supplier bills, expenses, payments out, vendors — each on the house table (CreditsTable,
 * the listing's model: the first column frozen, heads resizable and draggable, Column settings, a card per row on a phone), each row with its one
 * word, the next step as its button and the rest in its ⋮ (the house PortalMenu). The Money tab's Costs half and Finance's pages draw the same
 * tables; Finance adds the Project column.
 */
const day = (ms: number | null | undefined) => (ms ? displayDate(new Date(ms)) : '--')
export const tagOf = (label: string, tone: Tone) => (tone === 'default' ? <Tag appearance="outlined">{label}</Tag> : <Tag appearance="outlined" color={tone}>{label}</Tag>)
/** `act` names what the step does (pay · approve · edit · accept · bill · send · submit) — the record's panel keeps its ⋮ from repeating its primary
    (simplify S-10 · F1 §6.9.2). */
export type RowAction = { label: string; run: () => void; tone?: 'danger'; help?: string; disabled?: boolean; testId?: string; act?: string }
export type Next = { label: string; run: () => void; testId?: string; act?: string } | null

/** A row's ⋮ — the house PortalMenu anchored to its button, a sheet on a phone. */
export function RowMenu({ label, title, items }: { label: string; title: string; items: RowAction[] }) {
  const anchor = useRef<HTMLSpanElement>(null)
  const [open, setOpen] = useState(false)
  if (!items.length) return null
  return (
    <span ref={anchor}>
      <Tooltip label="More actions" disabled={open}><IconButton icon="more_vert" label={label} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)} /></Tooltip>
      <PortalMenu open={open} anchor={anchor} onClose={() => setOpen(false)} align="right" width={MENU_WIDTH.wide} role="menu" sheetTitle={title}>
        {items.map((a) => <DropdownItem key={a.label} onSelect={() => { setOpen(false); a.run() }} tone={a.tone} help={a.help} disabled={a.disabled} title={a.disabled ? a.help : undefined}>{a.label}</DropdownItem>)}
      </PortalMenu>
    </span>
  )
}
/** (parity map, MO-079 · FB-105) The "Issued by" column — only on a studio with two or more issuing entities (the host passes `entityOf` then). */
export const ENTITY_COL: TableColumnDef = { key: 'entity', label: 'Issued by', track: 'minmax(170px, 170fr)' }
export const entityCell = (name: string | null | undefined) => (name ? <MetaChip>{name}</MetaChip> : <span className={money.none}>--</span>)
/** (parity map, MO-038 · MO-094) A PO's status sub-line: a PO made elsewhere says so; a late delivery says how late (neutral — the vendor's). */
export function poStatusWords(p: PoView, day: (ms: number | null | undefined) => string): string | null {
  if (p.deliveryLateDays > 0) return lateDeliveryWords(p.deliveryLateDays)
  if (p.external && (p.state === 'accepted' || p.state === 'part_paid')) return EXTERNAL_PO_WORDS
  if (p.state === 'awaiting') return 'An Owner or an Admin approves it'
  if (p.state === 'sent_back') return p.reviewNote ? `“${p.reviewNote}”` : null
  if (p.state === 'changes' || p.state === 'declined') return p.vendorAnswerNote ? `“${p.vendorAnswerNote}”` : null
  if (p.state === 'accepted') return `Accepted ${viaWords(p.answerVia)}${p.vendorAnsweredAt ? ` · ${day(p.vendorAnsweredAt)}` : ''}`
  if (p.state === 'sent') return p.vendorViewedAt ? `Viewed ${day(p.vendorViewedAt)}` : `Sent ${day(p.sentAt)}`
  if (p.state === 'cancelled') return p.cancelReason ? `“${p.cancelReason}”` : null
  if (p.state === 'closed') return p.closeNote ? `Closed short — “${p.closeNote}”` : 'Paid in full'
  return null
}
const nextCell = (next: Next, menu: ReactNode) => (
  <span className={money.rowActions}>
    {next ? <Button appearance="text" onPress={next.run} data-testid={next.testId}>{next.label}</Button> : null}
    {menu}
  </span>
)

/* ── Purchase orders ─────────────────────────────────────────────────────────────────────────────────────────────────────────── */

export function PoTable({ pos, vendors, projectName, studio, open, next, menu, focus, empty, actions, title = 'Purchase orders', help, table, billRef, entityOf }: {
  pos: PoView[]; vendors: VendorRecord[]; projectName?: (id: string) => string; studio: boolean
  open: (po: PoView) => void; next: (po: PoView) => Next; menu: (po: PoView) => RowAction[]
  focus: string | null; empty: ReactNode; actions?: ReactNode; title?: string; help?: ReactNode; table: string
  /** (simplify S-10 · F1 §6.9.8) a bill's reference by its id — a PO whose bill carries the overdue debt points at the bill instead of being
      flagged overdue a second time. Without it the cell still says "Billed — see its bill". */
  billRef?: (id: string) => string | undefined
  /** (parity map, MO-079) the row's issuing entity — given only with two or more (adds the Issued by column) */ entityOf?: (po: PoView) => string | null
}) {
  const defs: TableColumnDef[] = [
    { key: 'po', label: 'Purchase order', track: 'minmax(220px, 220fr)', locked: true },
    ...(studio ? [{ key: 'project', label: 'Project', track: 'minmax(200px, 200fr)' }] : []),
    ...(entityOf ? [ENTITY_COL] : []),
    { key: 'vendor', label: 'Vendor', track: 'minmax(190px, 190fr)' },
    { key: 'amount', label: 'Amount', track: 'minmax(130px, 130fr)' },
    { key: 'paid', label: 'Paid', track: 'minmax(150px, 150fr)' },
    { key: 'status', label: 'Status', track: 'minmax(210px, 210fr)' },
    { key: 'next', label: 'Next step', track: 'minmax(170px, 170fr)' },
  ]
  const vendor = (id: string) => vendors.find((v) => v.id === id)?.name ?? 'Vendor'
  const statusSub = (p: PoView) => poStatusWords(p, day)
  /* (simplify S-10 · F1 §6.9.8) one debt, one overdue flag: the bill on the PO carries it (its own row says overdue) — the PO says where */
  const billedWords = (p: PoView) => { const refs = p.billIds.map((id) => billRef?.(id)).filter(Boolean); return `Billed — see ${refs.length ? refs.join(', ') : p.billIds.length === 1 ? 'its bill' : 'its bills'}` }
  const owedSub = (p: PoView) => (p.overdueMinor && p.billIds.length ? <span className={money.sub}>{billedWords(p)}</span>
    : <span className={money.sub} data-tone={p.overdueMinor ? 'alert' : undefined}>{p.overdueMinor ? `${money2(p.overdueMinor)} overdue` : p.balanceMinor ? `${money2(p.balanceMinor)} to pay` : 'Nothing to pay'}</span>)
  const cell = (p: PoView, key: string): ReactNode => {
    switch (key) {
      case 'po': return <span className={money.stack}><button type="button" className={money.nameLink} onClick={() => open(p)} data-testid="po-open">{p.number}</button>{p.title ? <span className={money.sub} title={p.title}>{p.title}</span> : null}</span>
      case 'project': return <span className={money.text}>{projectName?.(p.projectId) ?? ''}</span>
      case 'entity': return entityCell(entityOf?.(p))
      case 'vendor': return <span className={money.text}>{vendor(p.vendorId)}</span>
      case 'amount': return <span className={money.stack}><span className={money.num}>{money2(p.totalMinor)}</span>{p.advanceMinor ? <span className={money.sub}>{money2(p.advanceMinor)} advance</span> : p.gstMinor ? <span className={money.sub}>incl. {money2(p.gstMinor)} GST</span> : null}</span>
      case 'paid': return p.paidMinor ? <span className={money.stack}><span className={money.num}>{money2(p.paidMinor)}</span>{owedSub(p)}</span>
        : p.overdueMinor ? <span className={money.stack}><span className={money.none}>--</span>{owedSub(p)}</span> : <span className={money.none}>--</span>
      case 'status': { const s = statusSub(p); return <span className={money.tagStack}>{tagOf(PO_STATE_LABEL[p.state], PO_STATE_TONE[p.state])}{s ? <span className={money.sub} data-tone={p.state === 'declined' ? 'alert' : undefined} title={s}>{s}</span> : null}</span> }
      case 'next': return nextCell(next(p), <RowMenu label={`More actions for ${p.number}`} title={p.number} items={menu(p)} />)
      default: return null
    }
  }
  return <CreditsTable table={table} title={title} testId="costs-pos" defs={defs} rows={pos} rowKey={(p) => p.id} cell={cell} actions={actions} help={help} empty={empty}
                       rowAttrs={(p) => ({ 'data-po': p.id, 'data-focus': focus === p.id ? '' : undefined })} />
}

/* ── Supplier bills ──────────────────────────────────────────────────────────────────────────────────────────────────────────── */

export function BillTable({ bills, vendors, pos, projectName, studio, open, next, menu, focus, empty, actions, title = 'Supplier bills', help, table, entityOf }: {
  bills: BillView[]; vendors: VendorRecord[]; pos: PoView[]; projectName?: (id: string | null) => string; studio: boolean
  open: (b: BillView) => void; next: (b: BillView) => Next; menu: (b: BillView) => RowAction[]
  focus: string | null; empty: ReactNode; actions?: ReactNode; title?: string; help?: ReactNode; table: string
  /** (parity map, MO-079) the row's issuing entity — given only with two or more */ entityOf?: (b: BillView) => string | null
}) {
  const defs: TableColumnDef[] = [
    { key: 'bill', label: 'Bill', track: 'minmax(220px, 220fr)', locked: true },
    ...(studio ? [{ key: 'project', label: 'Project', track: 'minmax(190px, 190fr)' }] : []),
    ...(entityOf ? [ENTITY_COL] : []),
    { key: 'po', label: 'PO', track: 'minmax(120px, 120fr)' },
    { key: 'issued', label: 'Issued', track: 'minmax(110px, 110fr)' },
    { key: 'due', label: 'Due', track: 'minmax(120px, 120fr)' },
    { key: 'amount', label: 'Amount', track: 'minmax(130px, 130fr)' },
    { key: 'status', label: 'Status', track: 'minmax(150px, 150fr)' },
    { key: 'next', label: 'Next step', track: 'minmax(150px, 150fr)' },
  ]
  const vendor = (id: string) => vendors.find((v) => v.id === id)?.name ?? 'Vendor'
  const cell = (b: BillView, key: string): ReactNode => {
    switch (key) {
      case 'bill': return <span className={money.stack}><button type="button" className={money.nameLink} onClick={() => open(b)} data-testid="bill-open">{vendor(b.vendorId)}</button><span className={money.sub}>{b.reference}{b.docId ? ' · with its file' : ''}</span></span>
      case 'project': return <span className={money.text}>{projectName?.(b.projectId) ?? ''}</span>
      case 'entity': return entityCell(entityOf?.(b))
      case 'po': return b.poId ? <span className={money.text}>{pos.find((p) => p.id === b.poId)?.number ?? '--'}</span> : <span className={money.none}>On its own</span>
      case 'issued': return <span className={money.num}>{day(b.issuedOn)}</span>
      case 'due': return <span className={money.stack}><span className={money.num}>{day(b.dueOn)}</span>{b.overdueMinor ? <span className={money.sub} data-tone="alert">{money2(b.overdueMinor)} overdue</span> : null}</span>
      case 'amount': return <span className={money.stack}><span className={money.num}>{money2(b.totalMinor)}</span>{b.paidMinor && b.balanceMinor ? <span className={money.sub}>{money2(b.balanceMinor)} to pay</span> : null}</span>
      case 'status': return tagOf(BILL_STATE_LABEL[b.state], BILL_STATE_TONE[b.state])
      case 'next': return nextCell(next(b), <RowMenu label={`More actions for bill ${b.reference}`} title={`Bill ${b.reference}`} items={menu(b)} />)
      default: return null
    }
  }
  return <CreditsTable table={table} title={title} testId="costs-bills" defs={defs} rows={bills} rowKey={(b) => b.id} cell={cell} actions={actions} help={help} empty={empty}
                       rowAttrs={(b) => ({ 'data-bill': b.id, 'data-focus': focus === b.id ? '' : undefined })} />
}

/* ── Expenses ────────────────────────────────────────────────────────────────────────────────────────────────────────────────── */

export function ExpenseTable({ expenses, people, projectName, studio, open, next, menu, focus, empty, actions, title = 'Expenses', help, table, entityOf }: {
  expenses: ExpenseView[]; people: { id: string; name: string }[]; projectName?: (id: string | null) => string; studio: boolean
  open: (e: ExpenseView) => void; next: (e: ExpenseView) => Next; menu: (e: ExpenseView) => RowAction[]
  focus: string | null; empty: ReactNode; actions?: ReactNode; title?: string; help?: ReactNode; table: string
  /** (parity map, MO-079 · MO-058) the row's issuing entity — given only with two or more */ entityOf?: (e: ExpenseView) => string | null
}) {
  const defs: TableColumnDef[] = [
    { key: 'expense', label: 'Expense', track: 'minmax(240px, 240fr)', locked: true },
    ...(studio ? [{ key: 'project', label: 'Project', track: 'minmax(190px, 190fr)' }] : []),
    ...(entityOf ? [ENTITY_COL] : []),
    { key: 'paidOn', label: 'Paid on', track: 'minmax(110px, 110fr)' },
    { key: 'amount', label: 'Amount', track: 'minmax(130px, 130fr)' },
    { key: 'who', label: 'Who paid', track: 'minmax(170px, 170fr)' },
    { key: 'status', label: 'Status', track: 'minmax(200px, 200fr)' },
    { key: 'next', label: 'Next step', track: 'minmax(150px, 150fr)' },
  ]
  const name = (id: string | null) => (id ? people.find((p) => p.id === id)?.name ?? 'Someone' : 'Someone')
  const cell = (e: ExpenseView, key: string): ReactNode => {
    switch (key) {
      /* (pending modules S06) an expense of a live repeat says how often — the first one and every one it logged */
      case 'expense': return <span className={money.stack}><button type="button" className={money.nameLink} onClick={() => open(e)} data-testid="expense-open" title={e.description}>{e.description}</button><span className={money.sub}>{e.category}{e.series?.live && e.series.every ? <span data-testid="expense-repeat-words">{` · ${repeatLabel(e.series.every)}`}</span> : null}{e.receipts.length ? ` · ${e.receipts.length} receipt${e.receipts.length === 1 ? '' : 's'}` : ''}</span></span>
      case 'project': return <span className={money.text}>{projectName?.(e.projectId) ?? ''}</span>
      case 'entity': return entityCell(entityOf?.(e))
      case 'paidOn': return <span className={money.num}>{day(e.spentOn)}</span>
      case 'amount': return <span className={money.stack}><span className={money.num}>{money2(e.amountMinor)}</span>{e.gstMinor ? <span className={money.sub}>incl. {money2(e.gstMinor)} GST</span> : null}</span>
      case 'who': return <span className={money.stack}><span className={money.text}>{e.paidBy === 'member' ? name(e.claimantId) : 'The studio'}</span><span className={money.sub}>{e.paidBy === 'member' ? 'A claim' : e.repeatOf ? 'Logged by its repeat' : `Logged by ${name(e.createdBy)}`}</span></span>
      case 'status': { const s = e.state === 'sent_back' && e.reviewNote ? `“${e.reviewNote}”` : e.state === 'pending' ? 'An Owner or an Admin approves it' : null
        return <span className={money.tagStack}>{tagOf(EXPENSE_STATE_LABEL[e.state], EXPENSE_STATE_TONE[e.state])}{s ? <span className={money.sub} title={s}>{s}</span> : null}</span> }
      case 'next': return nextCell(next(e), <RowMenu label={`More actions for ${e.description}`} title={e.description} items={menu(e)} />)
      default: return null
    }
  }
  return <CreditsTable table={table} title={title} testId="costs-expenses" defs={defs} rows={expenses} rowKey={(e) => e.id} cell={cell} actions={actions} help={help} empty={empty}
                       rowAttrs={(e) => ({ 'data-expense': e.id, 'data-focus': focus === e.id ? '' : undefined })} />
}

/* ── Payments out (Finance) ──────────────────────────────────────────────────────────────────────────────────────────────────── */

export function PayoutTable({ payouts, label, to, projectName, menu, focus, empty, help, table, entityOf }: {
  payouts: PayoutRecord[]; label: (p: PayoutRecord) => string; to: (p: PayoutRecord) => string; projectName: (id: string | null) => string
  menu: (p: PayoutRecord) => RowAction[]; focus: string | null; empty: ReactNode; help?: ReactNode; table: string
  /** (parity map, MO-079) the row's issuing entity — given only with two or more */ entityOf?: (p: PayoutRecord) => string | null
}) {
  const defs: TableColumnDef[] = [
    { key: 'to', label: 'Paid to', track: 'minmax(220px, 220fr)', locked: true },
    { key: 'for', label: 'For', track: 'minmax(200px, 200fr)' },
    { key: 'project', label: 'Project', track: 'minmax(190px, 190fr)' },
    ...(entityOf ? [ENTITY_COL] : []),
    { key: 'paidOn', label: 'Paid on', track: 'minmax(110px, 110fr)' },
    { key: 'amount', label: 'Amount', track: 'minmax(130px, 130fr)' },
    { key: 'how', label: 'How', track: 'minmax(170px, 170fr)' },
    { key: 'next', label: '', track: 'minmax(72px, 72fr)' },
  ]
  const cell = (p: PayoutRecord, key: string): ReactNode => {
    switch (key) {
      case 'to': return <span className={money.stack}><span className={money.name}>{to(p)}</span><span className={money.sub}>{p.kind === 'claim' ? 'A claim paid back' : p.advance ? 'The advance' : 'A vendor'}</span></span>
      case 'for': return <span className={money.text}>{label(p)}</span>
      case 'project': return <span className={money.text}>{projectName(p.projectId)}</span>
      case 'entity': return entityCell(entityOf?.(p))
      case 'paidOn': return <span className={money.num}>{day(p.paidOn)}</span>
      case 'amount': return <span className={money.stack}><span className={`${money.num}${p.reversedAt ? ` ${money.void}` : ''}`}>{money2(p.amountMinor)}</span>{p.reversedAt ? <span className={money.sub} data-tone="alert" title={p.reverseReason ?? undefined}>Reversed{p.reverseReason ? ` — “${p.reverseReason}”` : ''}</span> : null}</span>
      case 'how': return <span className={money.stack}><span className={money.text}>{methodLabel(p.method)}</span>{p.reference ? <span className={money.sub}>{p.reference}</span> : null}</span>
      case 'next': return <span className={money.rowActions}><RowMenu label={`More actions for the payment to ${to(p)}`} title="Payment" items={menu(p)} /></span>
      default: return null
    }
  }
  return <CreditsTable table={table} title="Payments out" testId="costs-payouts" defs={defs} rows={payouts} rowKey={(p) => p.id} cell={cell} help={help} empty={empty}
                       rowAttrs={(p) => ({ 'data-payout': p.id, 'data-focus': focus === p.id ? '' : undefined })} />
}

/* ── Vendors (Finance) ───────────────────────────────────────────────────────────────────────────────────────────────────────── */

export function VendorTable({ vendors, counts, figures, open, menu, focus, empty, help, table, actions }: {
  vendors: VendorRecord[]; counts: (id: string) => { pos: number; committed: number; owed: number; overdue: number } | null; figures: boolean
  open: (v: VendorRecord) => void; menu: (v: VendorRecord) => RowAction[]; focus: string | null; empty: ReactNode; help?: ReactNode; table: string; actions?: ReactNode
}) {
  const defs: TableColumnDef[] = [
    { key: 'vendor', label: 'Vendor', track: 'minmax(240px, 240fr)', locked: true },
    { key: 'contact', label: 'Contact', track: 'minmax(190px, 190fr)' },
    { key: 'gst', label: 'GST', track: 'minmax(110px, 110fr)' },
    { key: 'pos', label: 'POs', track: 'minmax(80px, 80fr)' },
    ...(figures ? [{ key: 'committed', label: 'Committed', track: 'minmax(130px, 130fr)' }, { key: 'owed', label: 'Owed', track: 'minmax(130px, 130fr)' }] : []),
    { key: 'status', label: 'Status', track: 'minmax(130px, 130fr)' },
    { key: 'next', label: '', track: 'minmax(72px, 72fr)' },
  ]
  const cell = (v: VendorRecord, key: string): ReactNode => {
    const c = counts(v.id)
    switch (key) {
      case 'vendor': return <span className={money.stack}><button type="button" className={money.nameLink} onClick={() => open(v)} data-testid="vendor-open">{v.name}</button><span className={money.sub}>{v.contractor ? `${v.contractor.trades.join(' · ') || 'No trade set'} · works on site${v.contractor.code ? ` · ${v.contractor.code}` : ''}` : v.trade ?? 'No trade set'}</span></span>
      case 'contact': return <span className={money.stack}><span className={money.text}>{v.contactName ?? '--'}</span>{v.phone ? <span className={money.sub}>{phoneLocal(v.phone)}</span> : null}</span>
      case 'gst': return <span className={money.text}>{v.chargesGst ? 'Charges GST' : 'No GST'}</span>
      case 'pos': return <span className={money.num}>{c?.pos ?? 0}</span>
      case 'committed': return <span className={money.num}>{c?.committed ? money2(c.committed) : '--'}</span>
      case 'owed': return c?.owed ? <span className={money.stack}><span className={money.num}>{money2(c.owed)}</span>{c.overdue ? <span className={money.sub} data-tone="alert">{money2(c.overdue)} overdue</span> : null}</span> : <span className={money.none}>--</span>
      case 'status': return v.mergedInto ? tagOf('Merged', 'default') : v.isActive ? tagOf('Active', 'green') : tagOf('Inactive', 'default')
      case 'next': return <span className={money.rowActions}><RowMenu label={`More actions for ${v.name}`} title={v.name} items={menu(v)} /></span>
      default: return null
    }
  }
  return <CreditsTable table={table} title="Vendors" testId="costs-vendors" defs={defs} rows={vendors} rowKey={(v) => v.id} cell={cell} help={help} empty={empty} actions={actions}
                       rowAttrs={(v) => ({ 'data-vendor': v.id, 'data-focus': focus === v.id ? '' : undefined })} />
}
