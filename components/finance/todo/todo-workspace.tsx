'use client'

import { usePlanLock } from '@/components/credits/credits-client'
import { ProTag } from '@/components/credits/pro-tag'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button, SearchBar } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { Chips } from '@/components/om/chips'
import { MetaChip } from '@/components/om/meta-chip'
import { ScopePill } from '@/components/om/scope-pill'
import { ChipRail } from '@/components/om/chip-rail'
import { EmptyState } from '@/components/om/empty-state'
import { PortalMenu } from '@/components/om/portal-menu'
import { Tooltip } from '@/components/om/tooltip'
import { useSheetLayout } from '@/components/om/sheet'
import { DropdownItem, MENU_WIDTH } from '@/components/leads/dropdown'
import { CreditsTable } from '@/components/company/plan/credits-table'
import { TabSearchEmpty } from '@/components/leads/tasks/tab-search-empty'
import { couldnt, refusalOf, useRun } from '@/components/leads/tasks/use-run'
import { useSnackbar } from '@/components/om/snackbar'
import { NoteDialog } from '@/components/templates/editor/review-bar'
import { GHOST_MIN_MS } from '@/components/shell/page-reveal'
import type { TableColumnDef } from '@/components/om/table-columns'
import { withFrom } from '@/lib/nav'
import { displayDate } from '@/lib/format'
import { money2 } from '@/lib/quotes/math'
import { waLink } from '@/lib/portal/model'
import { reminderMessage } from '@/lib/projects/payments-model'
import { payable } from '@/lib/finance/costs'
import { owedOldestFirst, ruleWords, type CommissionAsk } from '@/lib/finance/commission'
import { RECENT_KIND, RECENT_SHOWN, TODO_GROUP, groupLine, recentRows, todoGroupsFor, todoInputOf, todoRows, type RecentRow, type TodoData, type TodoGroupKey, type TodoRow } from '@/lib/finance/todo'
import { ENTITY_PARAM, entityChip, entityMenu, entityOf, entityPillLabel, matchesEntity } from '@/lib/finance/entity-scope'
import { ago } from '@/lib/templates/ago'
import { todoHref } from '@/lib/finance/sections'
import { confirmPayment, markNotReceived, remindInvoice, undoConfirmPayment, undoNotReceived } from '@/app/projects/payment-actions'
import { answerCommissionAsk, payMemberCommission, undoMemberCommission } from '@/app/finance/books-actions'
import { retryXero } from '@/app/finance/xero-actions'
import { ENTITY_COL, RowMenu, entityCell, type Next, type RowAction } from '../cost-tables'
import { useCosts } from '../use-costs'
import { PayMemberDialog, RuleDialog, type PayMemberTarget } from '../books/commission-dialogs'
import money from '@/components/projects/money/money.module.css'
import plan from '@/components/company/plan/plan.module.css'
import fin from '../finance.module.css'
import t from './todo.module.css'

/**
 * (simplify S-10 · Q-07 · S-14, her "build everything" 2026-10-09 — F1 §6.3, the report's concept screen 07) Company › Finance › **To do**, where
 * Finance lands: what the money needs from you, grouped by what you do — To approve · To pay · To collect · Stuck for Owners and Admins; a member's
 * own drafts, what was sent back to them, vendors who answered and their claims — each group a house table (the listing's model, a card per row
 * on a phone) with its sum in its head line, each row's action on the row and the rest in its ⋮. Every action is the one the record's own list
 * runs, in place, with its Undo: a PO, a bill, an expense or a claim through `useCosts` (the Money tab's and Money out's dialogs and panel); a
 * client's payment through the Money tab's own steps (Confirm · Not received · Remind on WhatsApp, its message); a commission ask through
 * Commission's dialogs; a member's pay through Pay {member} (S-12). "Who owes us" is listed here and owned by the project's Money — its rows
 * open there with the way back. `?open=<id>` (the bell, the search) lands on the row. The rows are lib/finance/todo.ts's — no number of its own.
 */
type Cols = 'approve' | 'pay' | 'collect' | 'quiet'
const DEFS: Record<Cols, readonly TableColumnDef[]> = {
  approve: [
    { key: 'what', label: 'What', track: 'minmax(260px, 260fr)', locked: true },
    { key: 'project', label: 'Project', track: 'minmax(170px, 170fr)' },
    { key: 'asked', label: 'Asked by', track: 'minmax(140px, 140fr)' },
    { key: 'amount', label: 'Amount', track: 'minmax(130px, 130fr)' },
    { key: 'know', label: 'What to know', track: 'minmax(240px, 240fr)' },
    { key: 'next', label: 'Next step', track: 'minmax(190px, 190fr)' },
  ],
  pay: [
    { key: 'to', label: 'To', track: 'minmax(210px, 210fr)', locked: true },
    { key: 'for', label: 'For', track: 'minmax(200px, 200fr)' },
    { key: 'project', label: 'Project', track: 'minmax(170px, 170fr)' },
    { key: 'due', label: 'Due', track: 'minmax(170px, 170fr)' },
    { key: 'amount', label: 'Amount', track: 'minmax(140px, 140fr)' },
    { key: 'next', label: 'Next step', track: 'minmax(170px, 170fr)' },
  ],
  collect: [
    { key: 'client', label: 'Client', track: 'minmax(190px, 190fr)', locked: true },
    { key: 'invoice', label: 'Invoice', track: 'minmax(230px, 230fr)' },
    { key: 'project', label: 'Project', track: 'minmax(170px, 170fr)' },
    { key: 'due', label: 'Due', track: 'minmax(180px, 180fr)' },
    { key: 'amount', label: 'Amount', track: 'minmax(140px, 140fr)' },
    { key: 'next', label: 'Next step', track: 'minmax(210px, 210fr)' },
  ],
  quiet: [
    { key: 'what', label: 'What', track: 'minmax(280px, 280fr)', locked: true },
    { key: 'project', label: 'Project', track: 'minmax(170px, 170fr)' },
    { key: 'when', label: 'When', track: 'minmax(150px, 150fr)' },
    { key: 'amount', label: 'Amount', track: 'minmax(130px, 130fr)' },
    { key: 'know', label: 'What to know', track: 'minmax(220px, 220fr)' },
    { key: 'next', label: 'Next step', track: 'minmax(170px, 170fr)' },
  ],
}
const colsOf = (g: TodoGroupKey): Cols => (g === 'approve' || g === 'waiting' ? 'approve' : g === 'pay' ? 'pay' : g === 'collect' ? 'collect' : 'quiet')   // (parity map, MO-098) Waiting for approval reads as To approve
const HERE = todoHref()
const DAY = 86_400_000
type Act = { label: string; run: () => void; testId?: string } | null

export function TodoWorkspace({ data, open }: { data: TodoData; open: string | null }) {
  const f = data.finance
  const s = f.summary
  const runs = f.viewer.runs
  const router = useRouter()
  const phone = useSheetLayout()
  const { run } = useRun()
  const snackbar = useSnackbar()
  const c = useCosts({ summary: s, vendors: f.vendors, projects: f.projects, fixed: null, rules: f.rules, viewer: f.viewer, people: f.people, trades: f.trades, gstRate: f.gstRate, now: f.now, studio: f.studio, entities: f.entities, categories: f.categories })
  /* (parity map, MO-079 · FB-105) "Issued by" — only with two or more issuing entities; it rides the address (`?entity=`) */
  const options = f.entities
  const params = useSearchParams()
  const [entityKey, setEntityKey] = useState<string | null>(() => params.get(ENTITY_PARAM))
  const scope = entityOf(options, entityKey)
  const pickEntity = (key: string | null) => {
    setEntityKey(key)
    try { const u = new URL(window.location.href); if (key) u.searchParams.set(ENTITY_PARAM, key); else u.searchParams.delete(ENTITY_PARAM); window.history.replaceState(null, '', u.toString()) } catch { /* the address is a convenience */ }
  }
  const entityAnchor = useRef<HTMLSpanElement>(null)
  const [entityOpen, setEntityOpen] = useState(false)
  const allRows = useMemo(() => todoRows(todoInputOf(data)), [data])
  const rows = useMemo(() => allRows.filter((r) => matchesEntity(r.entity, scope, options)), [allRows, scope, options])
  const recent = useMemo(() => recentRows(data).filter((r) => matchesEntity(r.entity, scope, options)), [data, scope, options])
  const [recentOpen, setRecentOpen] = useState(false)
  const groups = todoGroupsFor(f.viewer)   // (parity map, MO-098) a runner's · Accounting's (approves nothing) · a member's
  const [chip, setChip] = useState<'all' | TodoGroupKey>('all')
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [focus, setFocus] = useState<string | null>(null)
  const [refusing, setRefusing] = useState<TodoRow | null>(null)
  const [answering, setAnswering] = useState<CommissionAsk | null>(null)
  const [declining, setDeclining] = useState<CommissionAsk | null>(null)
  const [payingMember, setPayingMember] = useState<PayMemberTarget | null>(null)
  const [origin] = useState(() => (typeof window === 'undefined' ? '' : window.location.origin))
  const newAnchor = useRef<HTMLSpanElement>(null)
  const [newOpen, setNewOpen] = useState(false)

  /* `?open=<id>` (the bell, the search): read once on arrival — the row it names is marked and brought into view; a cost record that is not
     (or no longer) a row opens its panel, so the link never lands on nothing */
  const [openParam] = useState(open)
  const landed = useRef(false)
  const { requestOpen, setFocus: setCostFocus } = c
  useEffect(() => {
    if (!openParam || landed.current) return
    const tm = window.setTimeout(() => {
      landed.current = true
      const row = allRows.find((r) => r.ref === openParam || r.invoiceId === openParam)
      if (row) {
        setFocus(row.key)
        document.querySelector(`[data-todo="${CSS.escape(row.key)}"]`)?.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
      } else { setCostFocus(openParam); requestOpen(openParam) }
    }, GHOST_MIN_MS + 200)
    return () => window.clearTimeout(tm)
  }, [openParam, allRows, requestOpen, setCostFocus])

  const person = (id: string | null) => f.people.find((p) => p.id === id)?.name ?? 'A member'
  const q = query.trim().toLowerCase()
  const shown = rows.filter((r) => !q || r.hay.includes(q))
  const of = (g: TodoGroupKey) => shown.filter((r) => r.group === g)
  const counts = Object.fromEntries(groups.map((g) => [g, rows.filter((r) => r.group === g).length])) as Record<TodoGroupKey, number>

  /* ── what each row does ── */
  const moneyHref = (r: TodoRow, extra = '') => withFrom(`/projects/${r.projectId}/money?open=${encodeURIComponent(r.invoiceId ?? r.ref)}${extra}`, HERE)
  const go = (href: string) => router.push(href)
  const po = (id: string) => s.pos.find((p) => p.id === id)
  const bill = (id: string) => s.bills.find((b) => b.id === id)
  const expense = (id: string) => s.expenses.find((e) => e.id === id)
  const ask = (id: string) => data.commission?.asks.find((a) => a.id === id) ?? null
  const moneyOf = (r: TodoRow) => data.money.find((m) => m.projectId === r.projectId)
  const invoiceOf = (r: TodoRow) => moneyOf(r)?.invoices.find((v) => v.id === r.invoiceId)

  const confirm = (r: TodoRow) => {
    const m = moneyOf(r)
    setBusy(r.key)
    void run('confirm the payment', () => confirmPayment(r.ref), {
      message: `Confirmed — ${money2(r.amountMinor ?? 0)} from ${(m?.client ?? 'the client').split(/\s+/)[0]}`, actionLabel: 'Undo',
      onAction: () => { void run('take the confirmation back', () => undoConfirmPayment(r.ref), 'Back to To confirm', { refresh: true }) },
    }, { refresh: true, guard: r.key }).finally(() => setBusy(null))
  }
  const refuse = (r: TodoRow, reason: string) => {
    setBusy(r.key)
    void run('mark it not received', async () => { const x = await markNotReceived(r.ref, { reason }); if (!('error' in x)) setRefusing(null); return x }, {
      message: `Marked not received — ${(moneyOf(r)?.client ?? 'the client').split(/\s+/)[0]} reads why on their page`, actionLabel: 'Undo',
      onAction: () => { void run('take it back', () => undoNotReceived(r.ref), 'Back to To confirm', { refresh: true }) },
    }, { refresh: true }).finally(() => setBusy(null))
  }
  /* the Money tab's own reminder, its own message — WhatsApp opens on the press, before the round trip (REG-534) */
  const remind = (r: TodoRow) => {
    const m = moneyOf(r), v = invoiceOf(r)
    if (!m || !v) return
    const owed = Math.max(0, v.amountMinor - v.paidMinor - v.toConfirmMinor)
    const text = reminderMessage({ client: m.client, studio: f.studio, stage: v.stageName, number: v.label ?? '', amount: money2(owed), due: v.dueAt ? displayDate(new Date(v.dueAt)) : '', url: m.portalUrl ? `${origin}${m.portalUrl}` : null, late: v.dueAt !== null && data.now >= v.dueAt + DAY })
    window.open(waLink(m.phone, text), '_blank', 'noopener')
    void run('record the reminder', () => remindInvoice(v.id), `Reminder drafted on WhatsApp for ${m.client.split(/\s+/)[0]} — it’s on the project’s Activity`, { refresh: true, guard: r.key })
  }
  const payMember = (memberId: string) => {
    const lines = owedOldestFirst(data.commission?.lines ?? [], memberId)
    const pname = (id: string) => data.money.find((m) => m.projectId === id)?.name ?? f.projects.find((p) => p.id === id)?.name ?? 'A project'
    setPayingMember({ memberId, member: person(memberId), payNow: f.people.find((p) => p.id === memberId)?.paynow ?? null, lines: lines.map((l) => ({ projectId: l.projectId, project: pname(l.projectId), owedMinor: l.owedMinor })) })   // (simplify round 2) their PayNow
  }
  const retry = (r: TodoRow) => {
    const [kind, id] = r.ref.split(':') as [Parameters<typeof retryXero>[0]['kind'], string]
    setBusy(r.key)
    void retryXero({ kind, id }).then((x) => {
      if ('error' in x) { snackbar({ message: couldnt('retry the push', refusalOf(x.error)) }); return }
      snackbar({ message: x.failed ? 'It failed again — see why on the Xero tab' : 'It reached Xero' })
      router.refresh()
    }, (e: unknown) => snackbar({ message: couldnt('retry the push', refusalOf(e)) })).finally(() => setBusy(null))
  }
  const payMemberNow = (tg: PayMemberTarget, o: { amountMinor: number; paidOn: number; method: string; reference: string; note: string }) => {
    setBusy('pay-member')
    void payMemberCommission({ memberId: tg.memberId, amountMinor: o.amountMinor, paidOn: o.paidOn, method: o.method, reference: o.reference || null, note: o.note || null }).then((x) => {
      if ('error' in x) { snackbar({ message: couldnt('record the payment', refusalOf(x.error)) }); return }
      setPayingMember(null)
      snackbar({ message: x.sentence, actionLabel: 'Undo', onAction: () => { void run('take the payment back', () => undoMemberCommission(x.undo), 'Payment taken back') } })
    }, (e: unknown) => snackbar({ message: couldnt('record the payment', refusalOf(e)) })).finally(() => setBusy(null))
  }

  const action = (r: TodoRow): Act => {
    if (r.group === 'waiting') return null   // (parity map, MO-098) an Owner's or an Admin's to approve — the row says so where the button would be
    const fromNext = (n: Next): Act => (n ? { label: n.label, run: n.run, testId: n.testId } : null)
    switch (r.kind) {
      case 'po': { const p = po(r.ref); return p ? fromNext(c.poNext(p)) : null }
      case 'bill': { const b = bill(r.ref); return b ? fromNext(c.billNext(b)) : null }
      case 'po_balance': { const p = po(r.ref); if (!p || !f.viewer.pays) return null; const owed = payable({ po: p, bills: f.summary.bills }); return { label: owed.advanceDueMinor ? 'Pay the advance' : 'Pay', run: () => c.payPo(p), testId: 'todo-pay-po' } }
      case 'expense': case 'claim': { const e = expense(r.ref); return e ? fromNext(c.expenseNext(e)) : null }
      case 'invoice': return { label: 'Review on Money', run: () => go(moneyHref(r, '&do=approve')), testId: 'todo-review-invoice' }
      case 'confirm': return { label: 'Confirm', run: () => confirm(r), testId: 'todo-confirm' }
      case 'check': return { label: 'Check', run: () => confirm(r), testId: 'todo-check' }
      case 'remind': return { label: 'Remind on WhatsApp', run: () => remind(r), testId: 'todo-remind' }
      case 'send': return { label: data.sendsNow === false ? 'Submit for approval' : 'Send', run: () => go(moneyHref(r, '&send=1')), testId: 'todo-send' }   // (pending modules S06) the step it opens, in its words
      case 'ask': { const a = ask(r.ref); return a ? { label: 'Answer', run: () => setAnswering(a), testId: 'todo-answer' } : null }
      case 'commission': return { label: `Pay ${r.title.split(/\s+/)[0]}`, run: () => payMember(r.ref), testId: 'todo-pay-member' }
      case 'xero': return { label: 'Retry', run: () => retry(r), testId: 'todo-xero-retry' }
      default: return null
    }
  }
  const menu = (r: TodoRow): RowAction[] => {
    const onMoney: RowAction = { label: 'Open on the project’s Money', run: () => go(moneyHref(r)) }
    switch (r.kind) {
      case 'po': case 'po_balance': { const p = po(r.ref); return p ? c.poMenu(p) : [] }
      case 'bill': { const b = bill(r.ref); return b ? c.billMenu(b) : [] }
      case 'expense': case 'claim': { const e = expense(r.ref); return e ? c.expenseMenu(e) : [] }
      case 'invoice': case 'send': return [onMoney]
      case 'confirm': case 'check': return [{ label: 'Not received', run: () => setRefusing(r), help: `${(moneyOf(r)?.client ?? 'The client').split(/\s+/)[0]} reads why` }, onMoney]
      case 'remind': return [{ label: 'Record a payment', run: () => go(moneyHref(r, '&do=record')) }, onMoney]
      case 'ask': { const a = ask(r.ref); return a ? [...(r.group === 'waiting' ? [] : [{ label: 'Decline', run: () => setDeclining(a), tone: 'danger' as const }]), { label: 'Open in Commission', run: () => go(withFrom(`/company/finance/commissions?open=${encodeURIComponent(a.id)}`, HERE)) }] : [] }
      case 'commission': return [{ label: 'Open in Commission', run: () => go(withFrom(`/company/finance/commissions?open=${encodeURIComponent(r.ref)}`, HERE)) }]
      case 'xero': return [{ label: 'Open Xero', run: () => go('/company/finance/accounting') }]
      default: return []
    }
  }
  /* the row's first column opens its record — the panel for money out, the project's Money for money in, Commission, Xero */
  const opener = (r: TodoRow): { press: () => void } | { href: string } | null => {
    if (r.kind === 'po' || r.kind === 'po_balance') { const p = po(r.ref); return p ? { press: () => c.openPo(p) } : null }
    if (r.kind === 'bill') { const b = bill(r.ref); return b ? { press: () => c.openBill(b) } : null }
    if (r.kind === 'expense' || r.kind === 'claim') { const e = expense(r.ref); return e ? { press: () => c.openExpense(e) } : null }
    if (r.kind === 'invoice' || r.kind === 'confirm' || r.kind === 'check' || r.kind === 'remind' || r.kind === 'send') return r.projectId ? { href: moneyHref(r) } : null
    if (r.kind === 'ask' || r.kind === 'commission') return { href: withFrom(`/company/finance/commissions?open=${encodeURIComponent(r.ref)}`, HERE) }
    if (r.kind === 'xero') return { href: '/company/finance/accounting' }
    return null
  }

  /* ── the cells ── */
  const first = (r: TodoRow) => {
    const o = opener(r)
    const title = o && 'href' in o ? <Link href={o.href} className={money.nameLink} title={r.title}>{r.title}</Link>
      : o ? <button type="button" className={money.nameLink} onClick={o.press} title={r.title} data-testid="todo-open">{r.title}</button>
      : <span className={money.name}>{r.title}</span>
    return <span className={money.stack}>{title}{r.sub ? <span className={money.sub} title={r.sub}>{r.sub}</span> : null}</span>
  }
  const amount = (r: TodoRow) => (r.amountMinor === null ? <span className={money.none}>--</span>
    : <span className={money.stack}><span className={money.num}>{money2(r.amountMinor)}</span>{r.amountSub ? <span className={money.sub}>{r.amountSub}</span> : null}</span>)
  const next = (r: TodoRow) => {
    const a = action(r)
    return (
      <span className={money.rowActions}>
        {a ? <Button appearance="text" onPress={a.run} isDisabled={busy === r.key} data-testid={a.testId}>{a.label}</Button> : null}
        <RowMenu label={`More for ${r.title}`} title={r.title} items={menu(r)} />
      </span>
    )
  }
  const cell = (r: TodoRow, key: string): ReactNode => {
    switch (key) {
      case 'what': case 'to': case 'client': return first(r)
      case 'project': return <span className={money.text} title={r.project}>{r.project}</span>
      case 'asked': return r.asker ? <span className={money.stack}><span className={money.text}>{r.asker}</span>{r.askedAt ? <span className={money.sub}>{displayDate(new Date(r.askedAt))}</span> : null}</span> : <span className={money.none}>--</span>
      case 'for': case 'invoice': return <span className={money.text} title={r.about ?? undefined}>{r.about ?? '--'}</span>
      case 'due': return r.dueWords ? <span className={`${money.num}${r.late ? ` ${t.late}` : ''}`}>{r.dueWords}</span> : <span className={money.none}>--</span>
      case 'when': return r.when ? <span className={money.text}>{r.when}</span> : <span className={money.none}>--</span>
      case 'amount': return amount(r)
      case 'know': return r.know ? <span className={t.know} title={r.know}>{r.know}</span> : <span className={money.none}>--</span>
      case 'entity': return entityCell(entityChip(r.entity, options))   // (parity map, MO-079)
      case 'next': return next(r)
      default: return null
    }
  }

  /* ── the page ── */
  const canPo = f.projects.some((p) => p.prepares && !p.locked)
  const canBill = runs || f.projects.some((p) => p.prepares)
  const canRecord = f.projects.some((p) => p.records && !p.locked)   // (parity map, MO-098) Accounting records a PO made elsewhere without raising one
  const expLocked = usePlanLock('expense_management').locked   // (pending modules S19) expenses are Pro
  const newRows = [
    { key: 'po', show: canPo, label: 'Purchase order', help: 'To a sub-contractor or a supplier — the quote’s lines at their cost', run: () => c.newPo() },
    { key: 'bill', show: canBill, label: 'Supplier bill', help: 'A vendor’s invoice — drop its PDF and it is read for you', run: () => c.newBill() },
    { key: 'expense', show: true, label: 'Expense', help: 'Something bought for a project or the studio — or a claim to be paid back', run: () => c.newExpense() },
    /* (parity map, MO-038) a PO raised outside OpenMaison, recorded with its file */
    { key: 'external', show: canRecord, label: 'Record a PO made elsewhere', help: 'One raised in your accounting system or on paper — it counts in the costs', run: () => c.newExternalPo() },
  ]
  /* (simplify S-14) a member's weekly job on site is a claim — Expense leads their New */
  const newItems = (runs ? newRows : [newRows[2]!, newRows[0]!, newRows[1]!, newRows[3]!]).filter((x) => x.show)
  const newMenu = (
    <span ref={newAnchor}>
      {phone
        ? <Tooltip label="New" disabled={newOpen}><IconButton icon="add" label="New" variant="primary" onClick={() => setNewOpen((o) => !o)} aria-haspopup="menu" aria-expanded={newOpen} data-testid="todo-new" data-kb="create" data-kb-label="New" /></Tooltip>
        : <Button iconStart={<Icon name="add" size={20} />} iconEnd={<Icon name="arrow_drop_down" size={20} />} onPress={() => setNewOpen((o) => !o)} aria-haspopup="menu" aria-expanded={newOpen} data-testid="todo-new" data-kb="create" data-kb-label="New">New</Button>}
      <PortalMenu open={newOpen} anchor={newAnchor} onClose={() => setNewOpen(false)} align="right" width={MENU_WIDTH.wide} role="menu" sheetTitle="New">
        {newItems.map((x) => <DropdownItem key={x.key} onSelect={() => { setNewOpen(false); x.run() }} help={x.help} meta={x.key === 'expense' && expLocked ? <ProTag /> : undefined}>{x.label}</DropdownItem>)}
      </PortalMenu>
    </span>
  )
  const chipOptions = [{ value: 'all', label: `All · ${rows.length}` }, ...groups.map((g) => ({ value: g, label: `${TODO_GROUP[g].chip} · ${counts[g]}` }))]
  const chips = <Chips label="Show" options={chipOptions} value={chip} onChange={(v) => setChip(v as 'all' | TodoGroupKey)} testId="todo-chips" />
  /* (MO-079) the scope pill — a studio with one entity never sees it */
  const entityPill = options.length ? (
    <>
      <span ref={entityAnchor}><ScopePill label={entityPillLabel(scope)} short={scope ? scope.label : 'All'} open={entityOpen} scoped={!!scope} onClick={() => setEntityOpen((o) => !o)} /></span>
      <PortalMenu open={entityOpen} anchor={entityAnchor} onClose={() => setEntityOpen(false)} align="left" width={MENU_WIDTH.wide} role="menu" sheetTitle="Issued by">
        {entityMenu(options).map((x) => <DropdownItem key={x.key} role="menuitemradio" checked={x.key === 'all' ? !scope : scope?.key === x.key} meta={x.meta} onSelect={() => { setEntityOpen(false); pickEntity(x.key === 'all' ? null : x.key) }}>{x.label}</DropdownItem>)}
      </PortalMenu>
    </>
  ) : null
  /* (MO-079) with two or more entities, every group's table gains the Issued by column after Project */
  const defsOf = (g: TodoGroupKey): readonly TableColumnDef[] => {
    const d = DEFS[colsOf(g)]
    if (!options.length) return d
    const at = d.findIndex((x) => x.key === 'project') + 1
    return [...d.slice(0, at), ENTITY_COL, ...d.slice(at)]
  }
  /* (parity map, MO-084 · FB-009) Recently — each row opens its record: money out's panel here, money in's on its project's Money */
  const openRecent = (r: RecentRow): { press: () => void } | { href: string } | null => {
    if (r.kind === 'po') { const p = po(r.ref); return p ? { press: () => c.openPo(p) } : null }
    if (r.kind === 'bill') { const b = bill(r.ref); return b ? { press: () => c.openBill(b) } : null }
    if (r.kind === 'expense') { const e = expense(r.ref); return e ? { press: () => c.openExpense(e) } : null }
    if (r.kind === 'paid') { const id = r.opens; if (!id) return null; const p = po(id), b = bill(id), e = expense(id); return b ? { press: () => c.openBill(b) } : p ? { press: () => c.openPo(p) } : e ? { press: () => c.openExpense(e) } : null }
    return r.projectId ? { href: withFrom(`/projects/${r.projectId}/money?open=${encodeURIComponent(r.ref)}`, HERE) } : null
  }
  const recentShown = recentOpen ? recent : recent.slice(0, RECENT_SHOWN)
  const recently = !q && chip === 'all' && recent.length ? (
    <section className={plan.section} aria-labelledby="todo-recently-title" data-testid="todo-recently">
      <div className={plan.sectionHead}><div className={plan.sectionTitles}><h2 id="todo-recently-title" className={plan.sectionTitle}>Recently</h2>
        <span className={plan.sectionHelp}>{runs ? 'The newest money in and out across the studio' : 'The newest money out on your projects'}</span></div></div>
      <ul className={t.recent}>
        {recentShown.map((r) => {
          const o = openRecent(r)
          const title = o && 'href' in o ? <Link href={o.href} className={money.nameLink} title={r.title}>{r.title}</Link>
            : o ? <button type="button" className={money.nameLink} onClick={o.press} title={r.title}>{r.title}</button> : <span className={money.name}>{r.title}</span>
          const chipName = entityChip(r.entity, options)
          return (
            <li key={r.key} className={t.recentRow} data-testid="todo-recent" data-kind={r.kind}>
              <span className={t.recentKind}><MetaChip>{RECENT_KIND[r.kind]}</MetaChip></span>
              <span className={t.recentText}>{title}<span className={money.sub} title={r.project}>{r.project}{chipName ? ` · ${chipName}` : ''} · {ago(r.at, data.now)}</span></span>
              <span className={`${money.num} ${t.recentAmount}`}>{r.amountMinor === null ? '--' : money2(r.amountMinor)}</span>
            </li>
          )
        })}
      </ul>
      {recent.length > RECENT_SHOWN ? (
        <div className={money.toggleRow}>
          <button type="button" className={money.toggle} aria-expanded={recentOpen} onClick={() => setRecentOpen((x) => !x)} data-testid="todo-recent-more">
            {recentOpen ? 'Show less' : `Show ${recent.length - RECENT_SHOWN} more`}
            <span data-chev><Icon name={recentOpen ? 'keyboard_arrow_up' : 'expand_more'} size={20} /></span>
          </button>
        </div>
      ) : null}
    </section>
  ) : null
  const search = <SearchBar appearance="outlined" size="md" placeholder="Search what, who, project…" aria-label="Search To do" value={query} onChange={setQuery} />
  const visible = chip === 'all' ? groups : groups.filter((g) => g === chip)
  const nothing = rows.length === 0
  const noMatch = !nothing && q && visible.every((g) => of(g).length === 0)

  return (
    <div className={t.page} data-testid="finance-todo">
      {phone ? (
        <div className={fin.phoneTools}>
          <div className={fin.phoneBar}><span className={fin.phoneSearch}>{search}</span>{newMenu}</div>
          <ChipRail label="Show" className={t.rail}>{chips}</ChipRail>
          {entityPill ? <span>{entityPill}</span> : null}
        </div>
      ) : (
        <div className={fin.toolbar}>
          <span className={fin.search}>{search}</span>
          {chips}
          {entityPill}
          <span className={fin.toolEnd}>{newMenu}</span>
        </div>
      )}
      {nothing ? (
        <EmptyState icon="task" tone="plain" testId="todo-empty" title="Nothing needs you"
                    help={runs ? 'New purchase orders, bills, claims and client payments land here as they come in — each with what to do on its row.' : 'Your drafts, what is sent back to you, vendors’ answers and your claims land here.'} />
      ) : noMatch ? (
        <TabSearchEmpty noun="rows" searching onClearAll={() => { setQuery(''); setChip('all') }} />
      ) : visible.map((g) => {
        const list = of(g)
        if (!list.length) {
          /* a group with nothing in it keeps its head line only (F1 §6.3 ⑦) */
          return (
            <section key={g} className={plan.section} aria-label={TODO_GROUP[g].title} data-testid={`todo-${g}`}>
              <div className={plan.sectionHead}><div className={plan.sectionTitles}><h2 className={plan.sectionTitle}>{TODO_GROUP[g].title}</h2><span className={plan.sectionHelp}>{q ? 'Nothing here matches' : TODO_GROUP[g].empty}</span></div></div>
            </section>
          )
        }
        return (
          <CreditsTable key={g} table={`finance-todo-${colsOf(g)}`} title={TODO_GROUP[g].title} help={groupLine(g, list)} testId={`todo-${g}`} defs={defsOf(g)} rows={list} rowKey={(r) => r.key} cell={cell} empty={TODO_GROUP[g].empty}
                        rowAttrs={(r) => ({ 'data-todo': r.key, 'data-kind': r.kind, 'data-focus': focus === r.key ? '' : undefined })} />
        )
      })}
      {recently}

      {c.dialogs}
      <NoteDialog open={!!refusing} title="Not received" label="Why — the client reads it" action="Mark not received" required maxLength={300} busy={!!refusing && busy === refusing.key}
                  help="It stays on the record; the invoice is owed again." onClose={() => setRefusing(null)} onSubmit={(reason) => { if (refusing) refuse(refusing, reason) }} />
      <RuleDialog open={!!answering} title="Approve the ask" subtitle={answering ? `${person(answering.memberId)} on ${f.projects.find((p) => p.id === answering.projectId)?.name ?? 'the project'} — change the rate first if you like. It applies from today.` : undefined}
                  initial={answering ? { basis: answering.basis, rateBp: answering.rateBp, fixedMinor: answering.fixedMinor } : null} allowNone={false} approve busy={busy === 'answer'} saveLabel="Approve" testId="commission-answer-dialog"
                  onClose={() => setAnswering(null)} onSave={(o) => { const a = answering; if (!a) return; setBusy('answer'); void run('approve it', async () => { const x = await answerCommissionAsk(a.id, { approve: true, rateBp: o.rateBp, fixedMinor: o.fixedMinor, note: o.reason || null }); if (!('error' in x)) setAnswering(null); return x }, `Approved — ${person(a.memberId)} earns ${ruleWords({ basis: a.basis, rateBp: o.rateBp, fixedMinor: o.fixedMinor })} from today`).finally(() => setBusy(null)) }} />
      <NoteDialog open={!!declining} title="Decline the ask" label="Why not?" action="Decline" required maxLength={300} busy={busy === 'decline'}
                  help={`${declining ? person(declining.memberId) : 'They'} reads it with the answer.`} onClose={() => setDeclining(null)}
                  onSubmit={(note) => { const a = declining; if (!a) return; setBusy('decline'); void run('decline it', async () => { const x = await answerCommissionAsk(a.id, { approve: false, note }); if (!('error' in x)) setDeclining(null); return x }, 'Declined — they read your note').finally(() => setBusy(null)) }} />
      <PayMemberDialog open={!!payingMember} target={payingMember} busy={busy === 'pay-member'} onClose={() => setPayingMember(null)} onSave={(o) => { if (payingMember) payMemberNow(payingMember, o) }} />
    </div>
  )
}

