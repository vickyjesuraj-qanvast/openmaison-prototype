'use client'

import { usePlanLock } from '@/components/credits/credits-client'
import { ProLocked, ProTag } from '@/components/credits/pro-tag'
import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button, SearchBar } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { Chips } from '@/components/om/chips'
import { ChipRail } from '@/components/om/chip-rail'
import { PortalMenu } from '@/components/om/portal-menu'
import { ScopePill } from '@/components/om/scope-pill'
import { Tooltip } from '@/components/om/tooltip'
import { useSheetLayout } from '@/components/om/sheet'
import { useSnackbar } from '@/components/om/snackbar'
import { DropdownItem, MENU_WIDTH } from '@/components/leads/dropdown'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import { GHOST_MIN_MS } from '@/components/shell/page-reveal'
import { money2 } from '@/lib/quotes/math'
import { MONEY_OUT_KINDS, moneyOutKindOf, moneyOutKindsFor, type MoneyOutKind } from '@/lib/finance/sections'
import type { FinanceData } from '@/lib/finance/queries'
import type { PayoutRecord } from '@/lib/finance/model'
import { costEntities } from '@/lib/finance/costs'
import { ENTITY_PARAM, entityChip, entityMenu, entityOf, entityPillLabel, matchesEntity } from '@/lib/finance/entity-scope'
import { createVendor } from '@/app/finance/vendor-actions'
import { BillTable, ExpenseTable, PayoutTable, PoTable, VendorTable } from './cost-tables'
import { useCosts } from './use-costs'
import { useVendorPanel } from './vendor-panel'
import { VendorDialog } from './vendor-dialog'
import type { CrewBoardData } from '@/lib/projects/contractors'
import { FinanceFrame } from './finance-frame'
import fin from './finance.module.css'

/**
 * (gaps build F1 — F-01 · F-19 · F1-Q1) Finance — the studio's money out, every project's and the overhead's, on Company's frame; a row opens its
 * record's panel — the Money tab's same steps (`useCosts`). Who sees what is the server's: the projects whose money the viewer sees, the
 * overhead for Owners and Admins (a member's own expenses otherwise), the figures for Owners and Admins.
 *
 * (simplify S-11, his "build everything" 2026-10-09 — F1 §6.4) **Money out** is one tab where Purchase orders · Bills · Expenses · Payments out were
 * four: a kind switch (house Chips — Purchase orders · Bills · Expenses · Paid; Paid is the Owners' and Admins') rides the address (`?kind=`), each
 * kind's own status chips moved into one scope pill ("Status: All ▾", the galleries' REG-666 pattern), and below it the kind's table exactly as
 * it was (`cost-tables.tsx`), its help line keeping the Owners' figures. One New ▾ (Purchase order · Supplier bill · Expense) for every kind.
 * The old tabs' addresses land here on their kind (app/company/finance/<old>/page.tsx). **Vendors** is its own tab, as it was.
 */
const STATUS: Record<MoneyOutKind, { value: string; label: string }[]> = {
  'purchase-orders': [{ value: 'todo', label: 'With the studio' }, { value: 'out', label: 'With the vendor' }, { value: 'done', label: 'Done' }],
  bills: [{ value: 'unpaid', label: 'To pay' }, { value: 'overdue', label: 'Overdue' }, { value: 'paid', label: 'Paid' }],
  expenses: [{ value: 'waiting', label: 'Waiting' }, { value: 'payback', label: 'To pay back' }, { value: 'mine', label: 'Mine' }],
  paid: [{ value: 'vendors', label: 'To vendors' }, { value: 'claims', label: 'Claims' }],
}

export function FinanceWorkspace({ tab, data, todoCount, crew = null }: { tab: 'money-out' | 'vendors'; data: FinanceData; todoCount: number; /** (S45B) the contractors' records, for a contractor's panel */ crew?: CrewBoardData | null }) {
  const s = data.summary
  const params = useSearchParams()
  const snackbar = useSnackbar()
  const phone = useSheetLayout()
  const runs = data.viewer.runs
  const c = useCosts({ summary: s, vendors: data.vendors, projects: data.projects, fixed: null, rules: data.rules, viewer: data.viewer, people: data.people, trades: data.trades, gstRate: data.gstRate, now: data.now, studio: data.studio, entities: data.entities, categories: data.categories })
  const projectName = (id: string | null) => (id ? data.projects.find((p) => p.id === id)?.name ?? '' : 'Studio overhead')
  const expLocked = usePlanLock('expense_management').locked   // (pending modules S19) expenses are Pro
  const vp = useVendorPanel({ vendors: c.vendors, summary: s, trades: data.trades, viewer: data.viewer, projectName, initial: tab === 'vendors' ? params.get('open') : null, crew })
  /* the kind rides the address; a link to another kind of this tab moves the switch with it (the render-phase adjust) */
  const asked = params.get('kind')
  const [kind, setKind] = useState<MoneyOutKind>(() => moneyOutKindOf(asked, runs))
  const [wasAsked, setWasAsked] = useState(asked)
  if (asked !== wasAsked) { setWasAsked(asked); if (asked) setKind(moneyOutKindOf(asked, runs)) }
  const [query, setQuery] = useState('')
  const [chip, setChip] = useState(tab === 'vendors' && params.get('show') === 'contractors' ? 'contractors' : 'all')   // (S45B) the Workload view's door lands on Contractors
  const [wasTab, setWasTab] = useState(`${tab}:${kind}`)
  if (`${tab}:${kind}` !== wasTab) { setWasTab(`${tab}:${kind}`); setChip('all'); setQuery('') }
  const [adding, setAdding] = useState(false)
  const [busy, setBusy] = useState(false)
  /* (parity map, MO-079 · FB-105) "Issued by", only with two or more issuing entities — it rides the address (`?entity=`) like the kind */
  const options = data.entities
  const [entityKey, setEntityKey] = useState<string | null>(() => params.get(ENTITY_PARAM))
  const scope = entityOf(options, entityKey)
  const pickEntity = (key: string | null) => {
    setEntityKey(key)
    try { const u = new URL(window.location.href); if (key && key !== 'all') u.searchParams.set(ENTITY_PARAM, key); else u.searchParams.delete(ENTITY_PARAM); window.history.replaceState(null, '', u.toString()) } catch { /* the address is a convenience */ }
  }
  const entityAnchor = useRef<HTMLSpanElement>(null)
  const [entityOpen, setEntityOpen] = useState(false)
  const projectEntity = (id: string | null) => (id ? data.projects.find((p) => p.id === id)?.entity ?? null : null)
  const ent = costEntities(s, projectEntity)
  const statusAnchor = useRef<HTMLSpanElement>(null)
  const [statusOpen, setStatusOpen] = useState(false)
  const newAnchor = useRef<HTMLSpanElement>(null)
  const [newOpen, setNewOpen] = useState(false)
  const pickKind = (k: MoneyOutKind) => {
    setKind(k)
    try { const u = new URL(window.location.href); u.searchParams.set('kind', k); u.searchParams.delete('open'); u.searchParams.delete('new'); window.history.replaceState(null, '', u.toString()) } catch { /* the address is a convenience */ }
  }
  /* `?new=1` (the search's Create rows) opens the kind's New; `?open=<id>` its record */
  const [newParam] = useState(() => params.get('new') === '1')
  const [openParam] = useState(() => params.get('open'))
  const [arrivalKind] = useState(kind)
  const { requestOpen, setFocus, newPo, newBill, newExpense } = c
  useEffect(() => {
    if (!newParam && !openParam) return
    const tm = window.setTimeout(() => {
      if (openParam) { setFocus(openParam); requestOpen(openParam) }
      else if (tab === 'vendors') setAdding(true)
      else if (arrivalKind === 'purchase-orders') newPo()
      else if (arrivalKind === 'bills') newBill()
      else if (arrivalKind === 'expenses') newExpense()
    }, GHOST_MIN_MS + 200)
    return () => window.clearTimeout(tm)
  }, [newParam, openParam, tab, arrivalKind, requestOpen, setFocus, newPo, newBill, newExpense])

  const q = query.trim().toLowerCase()
  const has = (...xs: (string | null | undefined)[]) => !q || xs.some((x) => (x ?? '').toLowerCase().includes(q))
  const vname = (id: string | null) => c.vendorOf(id)?.name ?? ''
  const canPo = data.projects.some((p) => p.prepares && !p.locked)
  const canBill = runs || data.projects.some((p) => p.prepares)
  const canRecord = data.projects.some((p) => p.records && !p.locked)   // (parity map, MO-098) Accounting records a PO made elsewhere without raising one

  const inScope = (name: string | null) => matchesEntity(name, scope, options)
  const pos = s.pos.filter((p) => has(p.number, p.title, vname(p.vendorId), projectName(p.projectId)) && inScope(ent.po(p)))
  const posTodo = pos.filter((p) => ['draft', 'awaiting', 'sent_back', 'changes', 'declined'].includes(p.state))
  const posOut = pos.filter((p) => ['sent', 'accepted', 'part_paid'].includes(p.state))
  const posDone = pos.filter((p) => p.state === 'closed' || p.state === 'cancelled')
  const bills = s.bills.filter((b) => has(b.reference, vname(b.vendorId), projectName(b.projectId)) && inScope(ent.bill(b)))
  const expenses = s.expenses.filter((e) => has(e.description, e.category, projectName(e.projectId), c.personName(e.claimantId)) && inScope(ent.expense(e)))
  const payoutLabel = (p: PayoutRecord) => (p.kind === 'claim' ? `“${s.expenses.find((e) => e.id === p.expenseId)?.description ?? 'A claim'}”` : p.billId ? `Bill ${s.bills.find((b) => b.id === p.billId)?.reference ?? ''}${p.poId ? ` · ${s.pos.find((x) => x.id === p.poId)?.number ?? ''}` : ''}` : s.pos.find((x) => x.id === p.poId)?.number ?? '')
  const payoutTo = (p: PayoutRecord) => (p.kind === 'claim' ? c.personName(p.memberId) : vname(p.vendorId))
  const payouts = [...s.payouts].sort((a, b) => b.paidOn - a.paidOn).filter((p) => has(payoutTo(p), payoutLabel(p), projectName(p.projectId), p.reference) && inScope(ent.payout(p)))
  /* the rows' Issued by column — only with two or more entities */
  const chipOf = options.length ? { po: (p: (typeof s.pos)[number]) => entityChip(ent.po(p), options), bill: (b: (typeof s.bills)[number]) => entityChip(ent.bill(b), options),
    expense: (e: (typeof s.expenses)[number]) => entityChip(ent.expense(e), options), payout: (p: PayoutRecord) => entityChip(ent.payout(p), options) } : null
  const vendors = c.vendors.filter((v) => has(v.name, v.trade, v.contactName, v.phone))
  const billRef = (id: string) => s.bills.find((b) => b.id === id)?.reference

  const addVendor = async (i: Parameters<typeof createVendor>[0]) => {
    setBusy(true)
    try {
      const r = await createVendor(i)
      if ('error' in r) { snackbar({ message: couldnt('add the vendor', refusalOf(r.error)) }); return }
      setAdding(false); setFocus(r.vendor.id); snackbar({ message: `${r.vendor.name} is in the directory` })
    } catch (e) { snackbar({ message: couldnt('add the vendor', refusalOf(e)) }) } finally { setBusy(false) }
  }

  const count = (label: string, n: number) => `${label} · ${n}`
  const newBtn = (label: string, run: () => void, testId: string, show = true) => (show ? <Button iconStart={<Icon name="add" size={20} />} onPress={run} data-kb="create" data-kb-label={label} data-testid={testId}>{label}</Button> : null)

  if (tab === 'vendors') {
    const active = vendors.filter((v) => v.isActive && !v.mergedInto), inactive = vendors.filter((v) => !v.isActive || v.mergedInto)
    const onSite = active.filter((v) => !!v.contractor)   // (S45B · H-UHD-2 — 1.0's Contractors filter) the vendors who work on site
    const shown = chip === 'inactive' ? inactive : chip === 'all' ? active : chip === 'contractors' ? onSite : vendors
    const counts = (id: string) => { const b = s.byVendor.find((x) => x.vendorId === id); return { pos: s.pos.filter((p) => p.vendorId === id).length, committed: b?.committedMinor ?? 0, owed: b?.owedMinor ?? 0, overdue: b?.overdueMinor ?? 0 } }
    return (
      <FinanceFrame tab="vendors" runs={runs} todoCount={todoCount}>
        <div className={fin.page} data-testid="finance-vendors">
          <div className={fin.toolbar}>
            <span className={fin.search}><SearchBar appearance="outlined" size="md" placeholder="Search vendors, trades, people" aria-label="Search vendors, trades, people" value={query} onChange={setQuery} /></span>
            <Chips label="Show" options={[{ value: 'all', label: count('Active', active.length) }, ...(onSite.length || chip === 'contractors' ? [{ value: 'contractors', label: count('Contractors', onSite.length) }] : []), { value: 'inactive', label: count('Inactive', inactive.length) }, { value: 'everyone', label: count('All', vendors.length) }]} value={chip} onChange={setChip} testId="finance-chips" />
            <span className={fin.toolEnd}>{newBtn('New vendor', () => setAdding(true), 'finance-new-vendor')}</span>
          </div>
          <VendorTable table="finance-vendors" vendors={shown} counts={counts} figures={data.viewer.seesFigures} open={vp.open} menu={vp.menu} focus={c.focus}
                       help={data.viewer.changesVendor ? 'The studio’s sub-contractors and suppliers. Merge a duplicate into the one that stays; deactivate one you no longer use.' : 'The studio’s sub-contractors and suppliers — add one when you need it.'}
                       empty={q ? 'No vendor matches.' : 'No vendors yet — add the studio’s first.'} />
          <VendorDialog open={adding} initial={null} trades={data.trades} bank={data.viewer.seesBank} busy={busy} onClose={() => setAdding(false)} onSave={(i) => { void addVendor(i) }} />
        </div>
        {c.dialogs}
        {vp.node}
      </FinanceFrame>
    )
  }

  /* ── Money out ── */
  const kinds = moneyOutKindsFor(runs)
  const legacy = MONEY_OUT_KINDS.find((k) => k.key === kind)!.legacy
  const countOf = (v: string): number => {
    switch (v) {
      case 'todo': return posTodo.length
      case 'out': return posOut.length
      case 'done': return posDone.length
      case 'unpaid': return bills.filter((b) => b.state !== 'paid').length
      case 'overdue': return bills.filter((b) => b.state === 'overdue').length
      case 'paid': return bills.filter((b) => b.state === 'paid').length
      case 'waiting': return expenses.filter((e) => e.state === 'pending' || e.state === 'sent_back').length
      case 'payback': return expenses.filter((e) => e.state === 'to_pay_back').length
      case 'mine': return expenses.filter((e) => e.createdBy === data.viewer.id || e.claimantId === data.viewer.id).length
      case 'vendors': return payouts.filter((p) => p.kind !== 'claim').length
      case 'claims': return payouts.filter((p) => p.kind === 'claim').length
      default: return 0
    }
  }
  const allCount = kind === 'purchase-orders' ? pos.length : kind === 'bills' ? bills.length : kind === 'expenses' ? expenses.length : payouts.length
  const statusLabel = chip === 'all' ? 'All' : STATUS[kind].find((x) => x.value === chip)?.label ?? 'All'
  const newRows = [
    { key: 'po', show: canPo, label: 'Purchase order', help: 'To a sub-contractor or a supplier — the quote’s lines at their cost', run: () => newPo(), testId: 'finance-new-po' },
    { key: 'bill', show: canBill, label: 'Supplier bill', help: 'A vendor’s invoice — drop its PDF and it is read for you', run: () => newBill(), testId: 'finance-new-bill' },
    { key: 'expense', show: true, label: 'Expense', help: 'Something bought for a project or the studio — or a claim to be paid back', run: () => newExpense(), testId: 'finance-new-expense' },
    /* (parity map, MO-038) a PO raised outside OpenMaison, recorded with its file */
    { key: 'external', show: canRecord, label: 'Record a PO made elsewhere', help: 'One raised in your accounting system or on paper — it counts in the costs', run: () => c.newExternalPo(), testId: 'finance-new-external-po' },
  ].filter((x) => x.show)
  const placeholder = kind === 'purchase-orders' ? 'Search POs, vendors, projects' : kind === 'bills' ? 'Search bills, vendors, projects' : kind === 'expenses' ? 'Search expenses, projects, people' : 'Search payments, vendors, people'
  const search = <SearchBar appearance="outlined" size="md" placeholder={placeholder} aria-label={placeholder} value={query} onChange={setQuery} />
  const kindChips = <Chips label="Kind" options={kinds.map((k) => ({ value: k.key, label: k.label }))} value={kind} onChange={(v) => pickKind(v as MoneyOutKind)} testId="money-out-kinds" />
  const statusPill = (
    <>
      <span ref={statusAnchor}><ScopePill label={`Status: ${statusLabel}`} short={statusLabel} open={statusOpen} scoped={chip !== 'all'} onClick={() => setStatusOpen((o) => !o)} /></span>
      <PortalMenu open={statusOpen} anchor={statusAnchor} onClose={() => setStatusOpen(false)} align="left" width={MENU_WIDTH.wide} role="menu" sheetTitle="Status">
        <DropdownItem role="menuitemradio" checked={chip === 'all'} onSelect={() => { setStatusOpen(false); setChip('all') }}>All · {allCount}</DropdownItem>
        {STATUS[kind].map((x) => <DropdownItem key={x.value} role="menuitemradio" checked={chip === x.value} onSelect={() => { setStatusOpen(false); setChip(x.value) }}>{x.label} · {countOf(x.value)}</DropdownItem>)}
      </PortalMenu>
    </>
  )
  /* (MO-079) the scope pill — a studio with one entity never sees it */
  const entityPill = options.length ? (
    <>
      <span ref={entityAnchor}><ScopePill label={entityPillLabel(scope)} short={scope ? scope.label : 'All'} open={entityOpen} scoped={!!scope} onClick={() => setEntityOpen((o) => !o)} /></span>
      <PortalMenu open={entityOpen} anchor={entityAnchor} onClose={() => setEntityOpen(false)} align="left" width={MENU_WIDTH.wide} role="menu" sheetTitle="Issued by">
        {entityMenu(options).map((x) => <DropdownItem key={x.key} role="menuitemradio" checked={x.key === 'all' ? !scope : scope?.key === x.key} meta={x.meta} onSelect={() => { setEntityOpen(false); pickEntity(x.key === 'all' ? null : x.key) }}>{x.label}</DropdownItem>)}
      </PortalMenu>
    </>
  ) : null
  const newMenu = newRows.length ? (
    <span className={phone ? undefined : fin.toolEnd} ref={newAnchor}>
      {phone
        ? <Tooltip label="New" disabled={newOpen}><IconButton icon="add" label="New" variant="primary" onClick={() => setNewOpen((o) => !o)} aria-haspopup="menu" aria-expanded={newOpen} data-testid="finance-new" data-kb="create" data-kb-label="New" /></Tooltip>
        : <Button iconStart={<Icon name="add" size={20} />} iconEnd={<Icon name="arrow_drop_down" size={20} />} onPress={() => setNewOpen((o) => !o)} aria-haspopup="menu" aria-expanded={newOpen} data-testid="finance-new" data-kb="create" data-kb-label="New">New</Button>}
      <PortalMenu open={newOpen} anchor={newAnchor} onClose={() => setNewOpen(false)} align="right" width={MENU_WIDTH.wide} role="menu" sheetTitle="New">
        {newRows.map((x) => <DropdownItem key={x.key} onSelect={() => { setNewOpen(false); x.run() }} help={x.help} meta={x.key === 'expense' && expLocked ? <ProTag /> : undefined}><span data-testid={x.testId}>{x.label}</span></DropdownItem>)}
      </PortalMenu>
    </span>
  ) : null

  /* (MO-079) the studio's sum said for the entity picked — the same records, the scope's share (costsOf's numbers, added, never recomputed) */
  const scopedCommitted = scope ? pos.reduce((x, p) => x + p.committedMinor, 0) + bills.reduce((x, b) => x + b.committedMinor, 0) + expenses.reduce((x, e) => x + e.committedMinor, 0) : 0
  const scopedOwed = scope ? pos.reduce((x, p) => x + p.balanceMinor, 0) + bills.filter((b) => !b.poId).reduce((x, b) => x + b.balanceMinor, 0) + expenses.reduce((x, e) => x + e.owedMinor, 0) : 0
  const scopedHelp = scope ? `${money2(scopedCommitted)} committed under ${scope.label} · ${money2(scopedOwed)} still to pay` : ''
  let table: React.ReactNode = null
  if (kind === 'purchase-orders') {
    const shown = chip === 'todo' ? posTodo : chip === 'out' ? posOut : chip === 'done' ? posDone : pos
    table = <PoTable table="finance-pos" pos={shown} vendors={c.vendors} studio projectName={projectName} open={c.openPo} next={c.poNext} menu={c.poMenu} focus={c.focus} billRef={billRef} entityOf={chipOf?.po}
                     help={data.viewer.seesFigures ? (scope ? scopedHelp : `${money2(s.committedMinor)} committed across the studio · ${money2(s.owedMinor)} still to pay${s.overdueMinor ? ` · ${money2(s.overdueMinor)} overdue` : ''}`) : 'The POs of the projects you work on.'}
                     empty={q ? 'No PO matches.' : 'No purchase orders yet — a project’s team raises them from its Money tab, or here.'} />
  } else if (kind === 'bills') {
    const shown = chip === 'unpaid' ? bills.filter((b) => b.state !== 'paid') : chip === 'overdue' ? bills.filter((b) => b.state === 'overdue') : chip === 'paid' ? bills.filter((b) => b.state === 'paid') : bills
    table = <BillTable table="finance-bills" bills={shown} vendors={c.vendors} pos={s.pos} studio projectName={projectName} open={c.openBill} next={c.billNext} menu={c.billMenu} focus={c.focus} entityOf={chipOf?.bill}
                       help={runs ? 'Supplier bills on every project and the studio’s overhead. Drop a bill’s PDF and it is read for you.' : 'Supplier bills on the projects you work on.'}
                       empty={q ? 'No bill matches.' : 'No supplier bills recorded yet.'} />
  } else if (kind === 'expenses' && expLocked) {
    /* (pending modules S19 — 1.0's plan gating: "the Expenses tab in Finance → Operations" locked) on Free the list is the lock — what was
       logged is kept and keeps counting in the reports */
    table = <ProLocked feature="expense_management" kept={expenses.length ? `Your ${expenses.length} ${expenses.length === 1 ? 'expense is' : 'expenses are'} kept and still count in the reports` : null} testId="expenses-locked" />
  } else if (kind === 'expenses') {
    const shown = chip === 'waiting' ? expenses.filter((e) => e.state === 'pending' || e.state === 'sent_back') : chip === 'payback' ? expenses.filter((e) => e.state === 'to_pay_back') : chip === 'mine' ? expenses.filter((e) => e.createdBy === data.viewer.id || e.claimantId === data.viewer.id) : expenses
    table = <ExpenseTable table="finance-expenses" expenses={shown} people={data.people} studio projectName={projectName} open={c.openExpense} next={c.expenseNext} menu={c.expenseMenu} focus={c.focus} entityOf={chipOf?.expense}
                          help={`${runs ? 'Every expense and claim — on projects and the studio’s overhead.' : 'Your expenses and claims, and those on the projects you work on.'}${data.viewer.seesFigures && s.claimsOwedMinor ? ` ${money2(s.claimsOwedMinor)} to pay back to the team.` : ''}`}
                          empty={q ? 'No expense matches.' : 'No expenses logged yet.'} />
  } else {
    const shown = chip === 'vendors' ? payouts.filter((p) => p.kind !== 'claim') : chip === 'claims' ? payouts.filter((p) => p.kind === 'claim') : payouts
    table = <PayoutTable table="finance-payouts" payouts={shown} label={payoutLabel} to={payoutTo} projectName={projectName} menu={c.payoutMenu} focus={c.focus} entityOf={chipOf?.payout}
                         help={`${money2(s.paidMinor - s.expenses.filter((e) => e.status === 'approved' && e.paidBy !== 'member').reduce((x, e) => x + e.amountMinor, 0))} paid out — a payment is recorded from its PO, bill or claim.`}
                         empty={q ? 'No payment matches.' : 'Nothing paid out yet — pay from a PO, a bill or a claim.'} />
  }
  return (
    <FinanceFrame tab="money-out" runs={runs} todoCount={todoCount}>
      <div className={fin.page} data-testid="finance-money-out">
        {phone ? (
          <div className={fin.phoneTools}>
            <div className={fin.phoneBar}><span className={fin.phoneSearch}>{search}</span>{newMenu}</div>
            <ChipRail label="Kind" className={fin.kindRail}>{kindChips}</ChipRail>
            {entityPill ? <span className={fin.inlineRow}>{statusPill}{entityPill}</span> : <span>{statusPill}</span>}
          </div>
        ) : (
          <div className={fin.toolbar}>
            <span className={fin.search}>{search}</span>
            {kindChips}
            {statusPill}
            {entityPill}
            {newMenu}
          </div>
        )}
        <div className={fin.kindBody} data-testid={`finance-${legacy}`}>{table}</div>
      </div>
      {c.dialogs}
      {vp.node}
    </FinanceFrame>
  )
}
