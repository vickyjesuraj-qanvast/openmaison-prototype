'use client'

import { useRef, useState, type ReactNode } from 'react'
import { Button, Tag } from '@/components/ds'
import { IconButton } from '@/components/om/icon-button'
import { PortalMenu } from '@/components/om/portal-menu'
import { Tooltip } from '@/components/om/tooltip'
import { MetaChip } from '@/components/om/meta-chip'
import { DropdownItem, MENU_WIDTH } from '@/components/leads/dropdown'
import { CreditsTable } from '@/components/company/plan/credits-table'
import { MOBILE, useMediaQuery } from '@/lib/breakpoint'
import type { TableColumnDef } from '@/components/om/table-columns'
import { displayDate, phoneLocal } from '@/lib/format'
import { money2 } from '@/lib/quotes/math'
import {
  BILL_STATE_LABEL, BILL_STATE_TONE, EXPENSE_STATE_LABEL, EXPENSE_STATE_TONE, EXTERNAL_PO_WORDS, PO_STATE_LABEL, PO_STATE_TONE, lateDeliveryWords, methodLabel, viaWords, type PayoutRecord, type Tone, type VendorRecord,
} from '@/lib/finance/model'
import type { BillView, ExpenseView, PoView } from '@/lib/finance/costs'
import { repeatLabel, repeatWords } from '@/lib/finance/repeats'
import { FinanceCards, cardLine } from './finance-cards'
import money from '@/components/projects/money/money.module.css'
import fin from './finance.module.css'

/*
 * (gaps build F1 — money out) The lists of money out — POs, supplier bills, expenses, payments out, vendors — each on the house table (CreditsTable,
 * the listing's model: the first column frozen, heads resizable and draggable, Column settings, a card per row on a phone), each row with its one
 * word, the next step as its button and the rest in its ⋮ (the house PortalMenu). The Money tab's Costs half and Finance's pages draw the same
 * tables; Finance adds the Project column.
 * (the calm UI build 2026-10-27 — 5-12 · 5-25 · 5-26 · 5-10 · 5-43 · T-08) one grammar for every Finance list: the record's name in the page's ink
 * (the row opens it), at most ONE text verb when a next step exists, the ⋮ always; the facts a row is about wrap to a second line instead of "…";
 * one Project cell (the client, then "P-2025-001 · BTO 4-Room"); a phone draws each row as a card (finance-cards.tsx); an empty cell is "—".
 */
const day = (ms: number | null | undefined) => (ms ? displayDate(new Date(ms)) : '—')
export const tagOf = (label: string, tone: Tone) => (tone === 'default' ? <Tag appearance="outlined">{label}</Tag> : <Tag appearance="outlined" color={tone}>{label}</Tag>)
/** `act` names what the step does (pay · approve · edit · accept · bill · send · submit) — the record's panel keeps its ⋮ from repeating its primary
    (simplify S-10 · F1 §6.9.2). */
export type RowAction = { label: string; run: () => void; tone?: 'danger'; help?: string; disabled?: boolean; testId?: string; act?: string }
export type Next = { label: string; run: () => void; testId?: string; act?: string } | null

/** A row's ⋮ — the house PortalMenu anchored to its button, a sheet on a phone. (the calm UI build 2026-10-27) A row that carries a testid keeps it
    on its menu row — a control moved into the ⋮ keeps its handle. */
export function RowMenu({ label, title, items }: { label: string; title: string; items: RowAction[] }) {
  const anchor = useRef<HTMLSpanElement>(null)
  const [open, setOpen] = useState(false)
  if (!items.length) return null
  return (
    <span ref={anchor}>
      <Tooltip label="More actions" disabled={open}><IconButton icon="more_vert" label={label} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)} /></Tooltip>
      <PortalMenu open={open} anchor={anchor} onClose={() => setOpen(false)} align="right" width={MENU_WIDTH.wide} role="menu" sheetTitle={title}>
        {items.map((a) => {
          const item = <DropdownItem key={a.label} onSelect={() => { setOpen(false); a.run() }} tone={a.tone} help={a.help} disabled={a.disabled} title={a.disabled ? a.help : undefined}>{a.label}</DropdownItem>
          return a.testId ? <span key={a.label} className={fin.menuRow} data-testid={a.testId}>{item}</span> : item
        })}
      </PortalMenu>
    </span>
  )
}
/** (parity map, MO-079 · FB-105) The "Issued by" column — only on a studio with two or more issuing entities (the host passes `entityOf` then). */
export const ENTITY_COL: TableColumnDef = { key: 'entity', label: 'Issued by', track: 'minmax(170px, 170fr)' }
export const entityCell = (name: string | null | undefined) => (name ? <MetaChip>{name}</MetaChip> : <span className={money.none}>—</span>)

/** (the calm UI build 2026-10-27 — 5-26) What one Project cell shows: the client (the part people recognise), then the number and the project's
    own words — "Shalini Menon" over "P-2025-001 · BTO 4-Room". A project named some other way keeps its whole name on the second line. */
export type ProjectFacts = { number: string; name: string; client: string | null }
export function projectLines(p: ProjectFacts | null | undefined): { first: string; second: string | null } {
  if (!p) return { first: 'Studio overhead', second: null }
  const client = (p.client ?? '').trim()
  const tail = client ? ` — ${client}` : ''
  const kind = tail && p.name.toLowerCase().endsWith(tail.toLowerCase()) ? p.name.slice(0, -tail.length).trim() : p.name
  return client ? { first: client, second: [p.number, kind].filter(Boolean).join(' · ') } : { first: p.name, second: p.number || null }
}
/** One Project cell everywhere in Finance (5-26) — Money in, Money out, Commission. */
export function ProjectCell({ project }: { project: ProjectFacts | null | undefined }) {
  const l = projectLines(project)
  return <span className={money.stack}><span className={`${money.text} ${fin.wrapLine}`}>{l.first}</span>{l.second ? <span className={`${money.sub} ${fin.wrapLine}`}>{l.second}</span> : null}</span>
}
/** The record's name in the page's ink (the listing's rule — primary on the row's hover), opening it (5-12). */
export const recordLink = `${money.nameLink} ${fin.ink}`
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
/** A fact a row is about wraps to a second line (5-25) — never "…". */
const wrap = `${money.sub} ${fin.wrapLine}`
const nextCell = (next: Next, menu: ReactNode) => (
  <span className={money.rowActions}>
    {next ? <Button appearance="text" onPress={next.run} data-testid={next.testId}>{next.label}</Button> : null}
    {menu}
  </span>
)

/* ── Purchase orders ─────────────────────────────────────────────────────────────────────────────────────────────────────────── */

export function PoTable({ pos, vendors, projectName, projectOf, studio, open, next, menu, focus, empty, actions, title = 'Purchase orders', help, table, billRef, entityOf }: {
  pos: PoView[]; vendors: VendorRecord[]; projectName?: (id: string) => string; studio: boolean
  /** (the calm UI build, 5-26) the project's facts for the one Project cell — without it the cell says the project's name */ projectOf?: (id: string | null) => ProjectFacts | null
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
  const owedWords = (p: PoView) => (p.overdueMinor && p.billIds.length ? billedWords(p) : p.overdueMinor ? `${money2(p.overdueMinor)} overdue` : p.balanceMinor ? `${money2(p.balanceMinor)} to pay` : 'Nothing to pay')
  const owedSub = (p: PoView) => <span className={wrap} data-tone={p.overdueMinor && !p.billIds.length ? 'alert' : undefined}>{owedWords(p)}</span>
  const amountSub = (p: PoView) => (p.advanceMinor ? `${money2(p.advanceMinor)} advance` : p.gstMinor ? `incl. ${money2(p.gstMinor)} GST` : null)
  const projectCell = (id: string) => (projectOf ? <ProjectCell project={projectOf(id)} /> : <span className={`${money.text} ${fin.wrapLine}`}>{projectName?.(id) ?? ''}</span>)
  const cell = (p: PoView, key: string): ReactNode => {
    switch (key) {
      case 'po': return <span className={money.stack}><button type="button" className={recordLink} onClick={() => open(p)} data-testid="po-open">{p.number}</button>{p.title ? <span className={wrap}>{p.title}</span> : null}</span>
      case 'project': return projectCell(p.projectId)
      case 'entity': return entityCell(entityOf?.(p))
      case 'vendor': return <span className={`${money.text} ${fin.wrapLine}`}>{vendor(p.vendorId)}</span>
      case 'amount': { const sub = amountSub(p); return <span className={money.stack}><span className={money.num}>{money2(p.totalMinor)}</span>{sub ? <span className={wrap}>{sub}</span> : null}</span> }
      case 'paid': return p.paidMinor ? <span className={money.stack}><span className={money.num}>{money2(p.paidMinor)}</span>{owedSub(p)}</span>
        : p.overdueMinor ? <span className={money.stack}><span className={money.none}>—</span>{owedSub(p)}</span> : <span className={money.none}>—</span>
      case 'status': { const s = statusSub(p); return <span className={money.tagStack}>{tagOf(PO_STATE_LABEL[p.state], PO_STATE_TONE[p.state])}{s ? <span className={wrap} data-tone={p.state === 'declined' ? 'alert' : undefined}>{s}</span> : null}</span> }
      case 'next': return nextCell(next(p), <RowMenu label={`More actions for ${p.number}`} title={p.number} items={menu(p)} />)
      default: return null
    }
  }
  const attrs = (p: PoView) => ({ 'data-po': p.id, 'data-focus': focus === p.id ? '' : undefined })
  const phone = useMediaQuery(MOBILE)
  if (phone) {
    const where = (p: PoView) => (studio ? projectLines(projectOf?.(p.projectId) ?? (projectName ? { number: '', name: projectName(p.projectId), client: null } : null)).first : null)
    return <FinanceCards title={title} testId="costs-pos" rows={pos} rowKey={(p) => p.id} actions={actions} help={help} empty={empty} rowAttrs={attrs}
                         card={(p) => {
                           const s = statusSub(p)
                           return {
                             title: p.number, open: () => open(p), openTestId: 'po-open', sub: p.title || null, amount: money2(p.totalMinor),
                             line: cardLine(vendor(p.vendorId), where(p), entityOf?.(p), amountSub(p), p.paidMinor ? `${money2(p.paidMinor)} paid` : null,
                               p.paidMinor || p.overdueMinor ? <span key="o" className={p.overdueMinor && !p.billIds.length ? fin.late : undefined}>{owedWords(p)}</span> : null),
                             status: <>{tagOf(PO_STATE_LABEL[p.state], PO_STATE_TONE[p.state])}{s ? <span className={p.state === 'declined' ? fin.late : undefined}>{s}</span> : null}</>,
                             next: next(p), menu: <RowMenu label={`More actions for ${p.number}`} title={p.number} items={menu(p)} />,
                           }
                         }} />
  }
  return <CreditsTable table={table} title={title} testId="costs-pos" defs={defs} rows={pos} rowKey={(p) => p.id} cell={cell} actions={actions} help={help} empty={empty} rowAttrs={attrs} />
}

/* ── Supplier bills ──────────────────────────────────────────────────────────────────────────────────────────────────────────── */

export function BillTable({ bills, vendors, pos, projectName, projectOf, studio, open, next, menu, focus, empty, actions, title = 'Supplier bills', help, table, entityOf }: {
  bills: BillView[]; vendors: VendorRecord[]; pos: PoView[]; projectName?: (id: string | null) => string; studio: boolean
  /** (the calm UI build, 5-26) the project's facts for the one Project cell */ projectOf?: (id: string | null) => ProjectFacts | null
  open: (b: BillView) => void; next: (b: BillView) => Next; menu: (b: BillView) => RowAction[]
  focus: string | null; empty: ReactNode; actions?: ReactNode; title?: string; help?: ReactNode; table: string
  /** (parity map, MO-079) the row's issuing entity — given only with two or more */ entityOf?: (b: BillView) => string | null
}) {
  const defs: TableColumnDef[] = [
    { key: 'bill', label: 'Bill', track: 'minmax(220px, 220fr)', locked: true },
    ...(studio ? [{ key: 'project', label: 'Project', track: 'minmax(190px, 190fr)' }] : []),
    ...(entityOf ? [ENTITY_COL] : []),
    { key: 'po', label: 'PO', track: 'minmax(150px, 150fr)' },   /* (the calm UI build, 5-25) a floor that holds "PO-2026-001" — the number itself was cut */
    { key: 'issued', label: 'Issued', track: 'minmax(110px, 110fr)' },
    { key: 'due', label: 'Due', track: 'minmax(120px, 120fr)' },
    { key: 'amount', label: 'Amount', track: 'minmax(130px, 130fr)' },
    { key: 'status', label: 'Status', track: 'minmax(150px, 150fr)' },
    { key: 'next', label: 'Next step', track: 'minmax(150px, 150fr)' },
  ]
  const vendor = (id: string) => vendors.find((v) => v.id === id)?.name ?? 'Vendor'
  const poNumber = (b: BillView) => (b.poId ? pos.find((p) => p.id === b.poId)?.number ?? '—' : null)
  const cell = (b: BillView, key: string): ReactNode => {
    switch (key) {
      case 'bill': return <span className={money.stack}><button type="button" className={`${recordLink} ${fin.wrapLine}`} onClick={() => open(b)} data-testid="bill-open">{vendor(b.vendorId)}</button><span className={wrap}>{b.reference}{b.docId ? ' · with its file' : ''}</span></span>
      case 'project': return projectOf ? <ProjectCell project={projectOf(b.projectId)} /> : <span className={`${money.text} ${fin.wrapLine}`}>{projectName?.(b.projectId) ?? ''}</span>
      case 'entity': return entityCell(entityOf?.(b))
      case 'po': return b.poId ? <span className={money.text}>{poNumber(b)}</span> : <span className={money.none}>On its own</span>
      case 'issued': return <span className={money.num}>{day(b.issuedOn)}</span>
      case 'due': return <span className={money.stack}><span className={money.num}>{day(b.dueOn)}</span>{b.overdueMinor ? <span className={wrap} data-tone="alert">{money2(b.overdueMinor)} overdue</span> : null}</span>
      case 'amount': return <span className={money.stack}><span className={money.num}>{money2(b.totalMinor)}</span>{b.paidMinor && b.balanceMinor ? <span className={wrap}>{money2(b.balanceMinor)} to pay</span> : null}</span>
      case 'status': return tagOf(BILL_STATE_LABEL[b.state], BILL_STATE_TONE[b.state])
      case 'next': return nextCell(next(b), <RowMenu label={`More actions for bill ${b.reference}`} title={`Bill ${b.reference}`} items={menu(b)} />)
      default: return null
    }
  }
  const attrs = (b: BillView) => ({ 'data-bill': b.id, 'data-focus': focus === b.id ? '' : undefined })
  const phone = useMediaQuery(MOBILE)
  if (phone) {
    return <FinanceCards title={title} testId="costs-bills" rows={bills} rowKey={(b) => b.id} actions={actions} help={help} empty={empty} rowAttrs={attrs}
                         card={(b) => ({
                           title: vendor(b.vendorId), open: () => open(b), openTestId: 'bill-open', sub: `${b.reference}${poNumber(b) ? ` · ${poNumber(b)}` : ' · on its own'}${b.docId ? ' · with its file' : ''}`,
                           amount: money2(b.totalMinor),
                           line: cardLine(studio ? projectLines(projectOf?.(b.projectId) ?? (b.projectId ? { number: '', name: projectName?.(b.projectId) ?? '', client: null } : null)).first : null, entityOf?.(b),
                             b.dueOn ? <span key="d" className={b.overdueMinor ? fin.late : undefined}>{`due ${day(b.dueOn)}${b.overdueMinor ? ` · ${money2(b.overdueMinor)} overdue` : ''}`}</span> : null,
                             b.paidMinor && b.balanceMinor ? `${money2(b.balanceMinor)} to pay` : null),
                           status: tagOf(BILL_STATE_LABEL[b.state], BILL_STATE_TONE[b.state]),
                           next: next(b), menu: <RowMenu label={`More actions for bill ${b.reference}`} title={`Bill ${b.reference}`} items={menu(b)} />,
                         })} />
  }
  return <CreditsTable table={table} title={title} testId="costs-bills" defs={defs} rows={bills} rowKey={(b) => b.id} cell={cell} actions={actions} help={help} empty={empty} rowAttrs={attrs} />
}

/* ── Expenses ────────────────────────────────────────────────────────────────────────────────────────────────────────────────── */

export function ExpenseTable({ expenses, people, projectName, projectOf, studio, open, next, menu, focus, empty, actions, title = 'Expenses', help, table, entityOf }: {
  expenses: ExpenseView[]; people: { id: string; name: string }[]; projectName?: (id: string | null) => string; studio: boolean
  /** (the calm UI build, 5-26) the project's facts for the one Project cell */ projectOf?: (id: string | null) => ProjectFacts | null
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
  const categoryLine = (e: ExpenseView): ReactNode => <>{e.category}{e.series?.live && e.series.every ? <span data-testid="expense-repeat-words">{` · ${repeatLabel(e.series.every)}`}</span> : null}{e.receipts.length ? ` · ${e.receipts.length} receipt${e.receipts.length === 1 ? '' : 's'}` : ''}</>
  /* (the calm UI build 2026-10-27, W-543) an expense its repeat logged says how often — "Repeats every month", never "Logged by its repeat" */
  const loggedBy = (e: ExpenseView) => (e.paidBy === 'member' ? 'A claim' : e.repeatOf ? (e.series?.every ? `Repeats ${repeatWords(e.series.every)}` : 'A repeating expense') : `Logged by ${name(e.createdBy)}`)
  const statusWords = (e: ExpenseView) => (e.state === 'sent_back' && e.reviewNote ? `“${e.reviewNote}”` : e.state === 'pending' ? 'An Owner or an Admin approves it' : null)
  const cell = (e: ExpenseView, key: string): ReactNode => {
    switch (key) {
      /* (pending modules S06) an expense of a live repeat says how often — the first one and every one it logged */
      case 'expense': return <span className={money.stack}><button type="button" className={`${recordLink} ${fin.wrapLine}`} onClick={() => open(e)} data-testid="expense-open">{e.description}</button><span className={wrap}>{categoryLine(e)}</span></span>
      case 'project': return projectOf ? <ProjectCell project={projectOf(e.projectId)} /> : <span className={`${money.text} ${fin.wrapLine}`}>{projectName?.(e.projectId) ?? ''}</span>
      case 'entity': return entityCell(entityOf?.(e))
      case 'paidOn': return <span className={money.num}>{day(e.spentOn)}</span>
      case 'amount': return <span className={money.stack}><span className={money.num}>{money2(e.amountMinor)}</span>{e.gstMinor ? <span className={wrap}>incl. {money2(e.gstMinor)} GST</span> : null}</span>
      case 'who': return <span className={money.stack}><span className={money.text}>{e.paidBy === 'member' ? name(e.claimantId) : 'The studio'}</span><span className={wrap}>{loggedBy(e)}</span></span>
      case 'status': { const s = statusWords(e)
        return <span className={money.tagStack}>{tagOf(EXPENSE_STATE_LABEL[e.state], EXPENSE_STATE_TONE[e.state])}{s ? <span className={wrap}>{s}</span> : null}</span> }
      case 'next': return nextCell(next(e), <RowMenu label={`More actions for ${e.description}`} title={e.description} items={menu(e)} />)
      default: return null
    }
  }
  const attrs = (e: ExpenseView) => ({ 'data-expense': e.id, 'data-focus': focus === e.id ? '' : undefined })
  const phone = useMediaQuery(MOBILE)
  if (phone) {
    return <FinanceCards title={title} testId="costs-expenses" rows={expenses} rowKey={(e) => e.id} actions={actions} help={help} empty={empty} rowAttrs={attrs}
                         card={(e) => {
                           const s = statusWords(e)
                           return {
                             title: e.description, open: () => open(e), openTestId: 'expense-open', sub: categoryLine(e), amount: money2(e.amountMinor),
                             line: cardLine(studio ? projectLines(projectOf?.(e.projectId) ?? (e.projectId ? { number: '', name: projectName?.(e.projectId) ?? '', client: null } : null)).first : null, entityOf?.(e),
                               `${e.paidBy === 'member' ? name(e.claimantId) : 'The studio'} · ${day(e.spentOn)}`, loggedBy(e)),
                             status: <>{tagOf(EXPENSE_STATE_LABEL[e.state], EXPENSE_STATE_TONE[e.state])}{s ? <span>{s}</span> : null}</>,
                             next: next(e), menu: <RowMenu label={`More actions for ${e.description}`} title={e.description} items={menu(e)} />,
                           }
                         }} />
  }
  return <CreditsTable table={table} title={title} testId="costs-expenses" defs={defs} rows={expenses} rowKey={(e) => e.id} cell={cell} actions={actions} help={help} empty={empty} rowAttrs={attrs} />
}

/* ── Payments out (Finance) ──────────────────────────────────────────────────────────────────────────────────────────────────── */

export function PayoutTable({ payouts, label, to, projectName, projectOf, menu, focus, empty, help, table, entityOf }: {
  payouts: PayoutRecord[]; label: (p: PayoutRecord) => string; to: (p: PayoutRecord) => string; projectName: (id: string | null) => string
  /** (the calm UI build, 5-26) the project's facts for the one Project cell */ projectOf?: (id: string | null) => ProjectFacts | null
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
  const whom = (p: PayoutRecord) => (p.kind === 'claim' ? 'A claim paid back' : p.advance ? 'The advance' : 'A vendor')
  const cell = (p: PayoutRecord, key: string): ReactNode => {
    switch (key) {
      case 'to': return <span className={money.stack}><span className={`${money.name} ${fin.wrapLine}`}>{to(p)}</span><span className={wrap}>{whom(p)}</span></span>
      case 'for': return <span className={`${money.text} ${fin.wrapLine}`}>{label(p)}</span>
      case 'project': return projectOf ? <ProjectCell project={projectOf(p.projectId)} /> : <span className={`${money.text} ${fin.wrapLine}`}>{projectName(p.projectId)}</span>
      case 'entity': return entityCell(entityOf?.(p))
      case 'paidOn': return <span className={money.num}>{day(p.paidOn)}</span>
      case 'amount': return <span className={money.stack}><span className={`${money.num}${p.reversedAt ? ` ${money.void}` : ''}`}>{money2(p.amountMinor)}</span>{p.reversedAt ? <span className={wrap} data-tone="alert">Reversed{p.reverseReason ? ` — “${p.reverseReason}”` : ''}</span> : null}</span>
      case 'how': return <span className={money.stack}><span className={money.text}>{methodLabel(p.method)}</span>{p.reference ? <span className={money.sub}>{p.reference}</span> : null}</span>
      case 'next': return <span className={money.rowActions}><RowMenu label={`More actions for the payment to ${to(p)}`} title="Payment" items={menu(p)} /></span>
      default: return null
    }
  }
  const attrs = (p: PayoutRecord) => ({ 'data-payout': p.id, 'data-focus': focus === p.id ? '' : undefined })
  /* (the calm UI build 2026-10-27, §2 · W-305) the studio's own payments list is "Payments made" — its chip says the same */
  const phone = useMediaQuery(MOBILE)
  if (phone) {
    return <FinanceCards title="Payments made" testId="costs-payouts" rows={payouts} rowKey={(p) => p.id} help={help} empty={empty} rowAttrs={attrs}
                         card={(p) => ({
                           title: to(p), sub: `${whom(p)} · ${label(p)}`, amount: money2(p.amountMinor), faint: !!p.reversedAt,
                           line: cardLine(projectLines(projectOf?.(p.projectId) ?? (p.projectId ? { number: '', name: projectName(p.projectId), client: null } : null)).first, entityOf?.(p), day(p.paidOn),
                             `${methodLabel(p.method)}${p.reference ? ` · ${p.reference}` : ''}`),
                           status: p.reversedAt ? <span className={fin.late}>Reversed{p.reverseReason ? ` — “${p.reverseReason}”` : ''}</span> : undefined,
                           menu: <RowMenu label={`More actions for the payment to ${to(p)}`} title="Payment" items={menu(p)} />,
                         })} />
  }
  return <CreditsTable table={table} title="Payments made" testId="costs-payouts" defs={defs} rows={payouts} rowKey={(p) => p.id} cell={cell} help={help} empty={empty} rowAttrs={attrs} />
}

/* ── Vendors (Finance) ───────────────────────────────────────────────────────────────────────────────────────────────────────── */

export function VendorTable({ vendors, counts, figures, open, menu, focus, empty, help, table, actions, status = true }: {
  vendors: VendorRecord[]; counts: (id: string) => { pos: number; committed: number; owed: number; overdue: number } | null; figures: boolean
  open: (v: VendorRecord) => void; menu: (v: VendorRecord) => RowAction[]; focus: string | null; empty: ReactNode; help?: ReactNode; table: string; actions?: ReactNode
  /** (the calm UI build 2026-10-27, 5-43) the Status column — left out while the chips already narrow the list to the active vendors */ status?: boolean
}) {
  /* (the calm UI build 2026-10-27, 5-43 · W-317 · W-303) "Purchase orders" (uppercased, "POs" read "POS"), "To pay" (one word for what the studio
     still owes — "Owed" meant the opposite on Client payments) */
  const defs: TableColumnDef[] = [
    { key: 'vendor', label: 'Vendor', track: 'minmax(240px, 240fr)', locked: true },
    { key: 'contact', label: 'Contact', track: 'minmax(190px, 190fr)' },
    { key: 'gst', label: 'GST', track: 'minmax(110px, 110fr)' },
    { key: 'pos', label: 'Purchase orders', track: 'minmax(150px, 150fr)' },
    ...(figures ? [{ key: 'committed', label: 'Committed', track: 'minmax(130px, 130fr)' }, { key: 'owed', label: 'To pay', track: 'minmax(130px, 130fr)' }] : []),
    ...(status ? [{ key: 'status', label: 'Status', track: 'minmax(130px, 130fr)' }] : []),
    { key: 'next', label: '', track: 'minmax(72px, 72fr)' },
  ]
  /* (the calm UI build 2026-10-27, 5-43 · W-316) "Plumbing · Contractor" — the studio's code and the on-site words are on the vendor's panel */
  const what = (v: VendorRecord) => (v.contractor ? `${v.contractor.trades.join(' · ') || 'No trade set'} · Contractor` : v.trade ?? 'No trade set')
  const stateTag = (v: VendorRecord) => (v.mergedInto ? tagOf('Merged', 'default') : v.isActive ? tagOf('Active', 'green') : tagOf('Inactive', 'default'))
  const cell = (v: VendorRecord, key: string): ReactNode => {
    const c = counts(v.id)
    switch (key) {
      case 'vendor': return <span className={money.stack}><button type="button" className={`${recordLink} ${fin.wrapLine}`} onClick={() => open(v)} data-testid="vendor-open">{v.name}</button><span className={wrap}>{what(v)}</span></span>
      case 'contact': return <span className={money.stack}><span className={money.text}>{v.contactName ?? '—'}</span>{v.phone ? <span className={money.sub}>{phoneLocal(v.phone)}</span> : null}</span>
      case 'gst': return v.chargesGst ? <span className={money.text}>Charges GST</span> : <span className={money.none}>—</span>
      case 'pos': return <span className={money.num}>{c?.pos ?? 0}</span>
      case 'committed': return c?.committed ? <span className={money.num}>{money2(c.committed)}</span> : <span className={money.none}>—</span>
      case 'owed': return c?.owed ? <span className={money.stack}><span className={money.num}>{money2(c.owed)}</span>{c.overdue ? <span className={wrap} data-tone="alert">{money2(c.overdue)} overdue</span> : null}</span> : <span className={money.none}>—</span>
      case 'status': return stateTag(v)
      case 'next': return <span className={money.rowActions}><RowMenu label={`More actions for ${v.name}`} title={v.name} items={menu(v)} /></span>
      default: return null
    }
  }
  const attrs = (v: VendorRecord) => ({ 'data-vendor': v.id, 'data-focus': focus === v.id ? '' : undefined })
  const phone = useMediaQuery(MOBILE)
  if (phone) {
    return <FinanceCards title="Vendors" testId="costs-vendors" rows={vendors} rowKey={(v) => v.id} help={help} empty={empty} actions={actions} rowAttrs={attrs}
                         card={(v) => {
                           const c = counts(v.id)
                           return {
                             title: v.name, open: () => open(v), openTestId: 'vendor-open', sub: what(v),
                             amount: figures && c?.owed ? money2(c.owed) : undefined,
                             line: cardLine(v.contactName, v.phone ? phoneLocal(v.phone) : null, v.chargesGst ? 'Charges GST' : null, c?.pos ? `${c.pos} purchase order${c.pos === 1 ? '' : 's'}` : null,
                               figures && c?.committed ? `${money2(c.committed)} committed` : null, figures && c?.overdue ? <span key="o" className={fin.late}>{`${money2(c.overdue)} overdue`}</span> : null),
                             status: status || v.mergedInto || !v.isActive ? stateTag(v) : undefined,
                             menu: <RowMenu label={`More actions for ${v.name}`} title={v.name} items={menu(v)} />,
                           }
                         }} />
  }
  return <CreditsTable table={table} title="Vendors" testId="costs-vendors" defs={defs} rows={vendors} rowKey={(v) => v.id} cell={cell} help={help} empty={empty} actions={actions} rowAttrs={attrs} />
}
