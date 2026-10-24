'use client'

import { usePlanLock } from '@/components/credits/credits-client'
import { ProTag } from '@/components/credits/pro-tag'
import { useEffect, useRef, useState, type DragEvent, type ReactNode } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ds'
import { EmptyState } from '@/components/om/empty-state'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { PortalMenu } from '@/components/om/portal-menu'
import { StatTile, StatTiles } from '@/components/om/stat-tile'
import { Tooltip } from '@/components/om/tooltip'
import { Chips } from '@/components/om/chips'
import { useSheetLayout } from '@/components/om/sheet'
import { useSnackbar } from '@/components/om/snackbar'
import { DropdownDivider, DropdownItem, DropdownLabel, MENU_WIDTH } from '@/components/leads/dropdown'
import { useCreditNotes } from '@/components/finance/books/credit-notes'
import { ProfitTile } from '@/components/finance/books/project-profit'
import { CostsSection, useProjectCosts } from '@/components/finance/project-costs'
import { useProjectNeeds } from '@/components/projects/project-context'
import { GHOST_MIN_MS } from '@/components/shell/page-reveal'
import { withFrom } from '@/lib/nav'
import { useRememberShape } from '@/lib/ghost-shape'
import { useFlagPref } from '@/lib/prefs'
import { money2 } from '@/lib/quotes/math'
import { seesBooks } from '@/lib/settings/roles'
import { isAccounting } from '@/lib/settings/roles'
import type { ProjectMoneyData } from '@/lib/projects/money-queries'
import { linesWord } from '@/lib/projects/money'   // (pending modules S02 — MI-014)
import type { ProjectCostsData } from '@/lib/finance/queries'
import type { ProjectBooks } from '@/lib/finance/books'
import { usePayments } from './payments-section'   // (Projects round 6) payments, receipts and reminders
import { useInvoices, type MoneyData } from './use-invoices'
import { MoneyNeeds } from './needs-list'
import { BillingSection, type BillingView } from './billing-section'
import { InvoicePanel, type InvoiceFocus } from './invoice-panel'
import { OrderFromQuoteDialog } from './order-from-quote-dialog'
import tile from '@/components/om/stat-tile.module.css'
import styles from './money.module.css'

/**
 * (Projects round 5 — F-01 · F-02 · F-04 · F-05 · F-06 · F-08 · F-09 · F-17) A project's Money tab, where money lives (F-01); every figure is
 * `moneyOf`'s / `costsOf`'s / `profitOf`'s — nothing here recomputes. Who sees it: the project's team, Owners and Admins (F-17).
 * (simplify S-07 · S-08 · S-09 · Q-05 · Q-06 · Q-08 · Q-10, the owner's "build everything" 2026-10-09; P3 §6.2) Eleven stacked sections become
 * four regions: the **head** — "Money" and ONE New ▾ in two groups (*Bill {client}* · *Costs*; C opens it) —, **Needs you** (every money step
 * waiting on this viewer, the server's rows, each with its real button), **To collect · To pay · Profit** (three tiles; a Designer sees what the
 * server hands them), then **two lists in one grammar**: *Billing* (the payment stages as the spine, payments and credit notes folded in, the
 * VOs as a sub-list) and *Costs* (one list with a Kind filter). Every record opens ONE side panel (`CostPanel`; an invoice's is
 * invoice-panel.tsx). On a phone the two lists sit behind a two-chip switch, remembered per browser (Q-06); at 1440 both show.
 * `?open=<invoice|payment|credit|po|bill|expense|vo>` lights the row and opens its panel on the right line; `&do=remind|record|confirm|pay|approve`
 * (+ `sendback` since round 2, R2-A) opens that step (contract C); `&send=1` opens the invoice's Send (gaps build B, item 5); `#costs` · `#billing` · `#changes` are anchors.
 */
export function ProjectMoney({ data, costs = null, books = null }: { data: ProjectMoneyData; /** (gaps build F1) money out — null when the viewer may not see it */ costs?: ProjectCostsData | null
  /** (gaps build F2) profit for Owners and Admins, the credit notes and whether this viewer issues them */ books?: ProjectBooks | null }) {
  if (!data.money) {
    return (
      <div className={styles.tab} data-testid="project-money">
        <div className={styles.bar}><h2 className={styles.title}>Money</h2></div>
        <EmptyState icon="lock" tone="plain" title="Money is the project’s team’s" testId="money-hidden"
                    help="The contract value, the invoices and what the client has paid are for the project’s team, Owners and Admins. Ask one of them to add you to the team." />
      </div>
    )
  }
  const d = data as MoneyData
  return costs ? <WithCosts data={costs}>{(h) => <MoneyTab data={d} books={books} costs={h} />}</WithCosts> : <MoneyTab data={d} books={books} costs={null} />
}

/** The Costs orchestrator lives above the tab, so New ▾, Needs you and `?open=…&do=` reach the same steps as the Costs list. */
function WithCosts({ data, children }: { data: ProjectCostsData; children: (h: ReturnType<typeof useProjectCosts>) => ReactNode }) {
  const h = useProjectCosts(data)
  return <>{children(h)}</>
}

/* (simplify round 2, R2-A) `sendback` — an invoice, a PO or an expense waiting for approval: its Send back note (the Overview's Needs you rows) */
type Step = 'remind' | 'record' | 'confirm' | 'pay' | 'approve' | 'sendback' | 'use'   // (pending modules S07) `use` — a held credit on the next invoice
const STEPS: readonly Step[] = ['remind', 'record', 'confirm', 'pay', 'approve', 'sendback', 'use']

function MoneyTab({ data, books, costs }: { data: MoneyData; books: ProjectBooks | null; costs: ReturnType<typeof useProjectCosts> | null }) {
  const { project, client, money: m, viewer } = data
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const phone = useSheetLayout()
  const [focus, setFocus] = useState<string | null>(null)
  const [panel, setPanel] = useState<InvoiceFocus | null>(null)
  const [newOpen, setNewOpen] = useState(false)
  const [ordering, setOrdering] = useState(false)
  const [view, setView] = useState<BillingView>('all')
  /* (Q-06) the phone's Billing · Costs switch, remembered per browser like the listing's view */
  const [costsFirst, setCostsFirst] = useFlagPref('om.money.costs', false)
  const newAnchor = useRef<HTMLSpanElement>(null)
  const payments = usePayments(data, focus)
  const cn = useCreditNotes({ projectId: project.id, books, m, people: data.people, focus, records: payments.canRecord, client: data.client.firstName })
  const inv = useInvoices(data, { payments, cn, setFocus })
  const needs = useProjectNeeds().filter((r) => r.tab === 'money')
  const admin = seesBooks(viewer.role)   // (parity map, MI-007) Billing's four views are the books — Accounting reads them too
  const first = !m.stages.length
  /* (fix-D, D-39) the loader's next time keeps the Needs you rows this tab opens with */
  useRememberShape(`lead.${project.id}.money`, needs.length > 0)

  const openInvoice = (id: string, step: InvoiceFocus['step'] = null, line: string | null = null) => { setFocus(id); setPanel({ id, step, line }) }

  /* ── arrival: `?open=` (the bell, Activity, search, Needs you on the Overview, the header's filled button) · `&do=` · `&send=1` — read on arrival
     and again whenever the address names a record while the tab is open (the header's button lands here too); the address keeps nothing ── */
  const readArrival = (n: number) => ({ open: params.get('open'), step: STEPS.find((x) => x === params.get('do')) ?? null, send: params.get('send') === '1', n,
    /* (pending modules S10) Maison AI's "paid 5,000": Record a payment opens with it */ amountMinor: (() => { const a = Number(params.get('amount')); return Number.isFinite(a) && a > 0 ? Math.round(a * 100) : null })() })
  const [arrival, setArrival] = useState(() => readArrival(0))
  const arrivalKey = params.get('open') ? `${params.get('open')}|${params.get('do') ?? ''}|${params.get('send') ?? ''}` : null
  const [seenKey, setSeenKey] = useState(arrivalKey)
  if (arrivalKey !== seenKey) { setSeenKey(arrivalKey); if (arrivalKey) setArrival(readArrival(arrival.n + 1)) }
  const latest = useRef({ m, data, payments, cn, inv, costs, viewer, phone, setCostsFirst })
  useEffect(() => { latest.current = { m, data, payments, cn, inv, costs, viewer, phone, setCostsFirst } })
  useEffect(() => {
    const id = arrival.open
    if (!id) return
    const t = window.setTimeout(() => {
      const L = latest.current
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const scroll = (sel: string) => requestAnimationFrame(() => requestAnimationFrame(() => document.querySelector(sel)?.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' })))   // after a phone's list switch lands
      const pay = L.data.payments?.list.find((x) => x.id === id) ?? null
      const credit = L.cn.credits.find((x) => x.id === id) ?? null
      const invId = L.m.invoices.some((x) => x.id === id) ? id : pay?.invoiceId ?? credit?.invoiceId ?? null
      if (invId) {
        const i = L.m.invoices.find((x) => x.id === invId)!
        if (L.phone) L.setCostsFirst(false)   // (Q-06) a phone shows the list the record is on
        setFocus(invId)
        scroll(`[data-invoice="${CSS.escape(invId)}"]`)
        if (arrival.step === 'record' && L.payments.canRecord && i.status === 'sent' && L.inv.owed(i) > 0) { L.payments.recordFor(i, arrival.amountMinor); return }
        if (arrival.step === 'sendback' && i.state === 'awaiting' && L.viewer.approves && !L.viewer.locked) { L.inv.openSendBack(i); return }   // (R2-A) the approver's Send back note
        /* (pending modules S07 — D-14) the Overview's "Use on INV-…": the held credit goes on the oldest invoice that owes, with its Undo */
        if (arrival.step === 'use' && credit && L.cn.usableFor(credit).length) { L.cn.applyOn(credit); return }
        /* (gaps build B, item 5) "Send the {stage} invoice" lands with `&send=1` (or `&do=approve`): its Send opens once, for whoever sends */
        if ((arrival.send || arrival.step === 'approve') && i.status === 'draft' && i.amountMinor > 0 && !L.viewer.locked
            && ((i.state === 'ready' && L.viewer.prepares && L.viewer.sendsAtOnce) || (i.state === 'awaiting' && L.viewer.approves))) { L.inv.openSend(i); return }
        setPanel({ id: invId, line: pay?.id ?? credit?.id ?? null, step: arrival.step === 'remind' ? 'remind' : arrival.step === 'confirm' ? 'confirm' : null })
        return
      }
      const vo = L.m.variations.find((x) => x.id === id)
      if (vo) { setFocus(vo.id); scroll(`[data-vo-id="${CSS.escape(vo.id)}"]`); return }
      const k = L.costs
      if (k) {
        const s = k.summary
        const po = s.pos.find((x) => x.id === id), bill = s.bills.find((x) => x.id === id), exp = s.expenses.find((x) => x.id === id)
        if (!po && !bill && !exp) return
        if (L.phone) L.setCostsFirst(true)
        k.c.setFocus(id)
        scroll(`[data-po="${CSS.escape(id)}"],[data-bill="${CSS.escape(id)}"],[data-expense="${CSS.escape(id)}"]`)
        const next = po ? k.c.poNext(po) : bill ? k.c.billNext(bill) : exp ? k.c.expenseNext(exp) : null
        /* `&do=pay` opens the payout; `&do=approve` a PO's Approve and send (an expense's Approve stays a press, in its panel) */
        if (next && ((arrival.step === 'pay' && /^Pay/.test(next.label)) || (arrival.step === 'approve' && ((po && next.label === 'Approve and send') || (bill && next.label === 'Approve'))))) { next.run(); return }   // (S44R, C8) a bill's Approve too
        /* (R2-A) `&do=sendback`: a PO or an expense waiting for approval opens its Send back note — the row ⋮'s own step, for whoever may answer it */
        if (arrival.step === 'sendback') {
          const back = (po ? k.c.poMenu(po) : exp ? k.c.expenseMenu(exp) : []).find((a) => a.label === 'Send back')
          if (back) { back.run(); return }
        }
        k.c.requestOpen(id)
      }
    }, arrival.n === 0 ? GHOST_MIN_MS + 150 : 60)   // the first arrival waits for the ghost; a later one is on a page already drawn
    return () => window.clearTimeout(t)
  }, [arrival])
  /* (pending modules S10 — cards studio:maison-assistant · api:maison-bot-assistant, "changes by chat … invoices, expenses, POs, VOs") Maison
     AI's "raise a one-off invoice / a PO / an expense / a bill for Benjamin" lands with `?new=<kind>`: the house form opens — New ▾'s own row,
     with its own rule — and nothing is made until it is saved there (a variation order, made as a Draft at once, is proposed in the sheet
     instead). A row the member doesn't have says why. */
  const snackbar = useSnackbar()
  const [newKind] = useState(() => params.get('new'))
  useEffect(() => {
    if (!newKind) return
    const t = window.setTimeout(() => {
      const L = latest.current
      const k = L.costs
      const why = L.viewer.locked ?? null
      const bills = !why && L.viewer.prepares && L.m.stages.length > 0
      if (why) { snackbar({ message: why }); return }
      if (newKind === 'one-off' && bills) { L.inv.openOneOff('new'); return }
      if (newKind === 'po' && k?.can.po) { k.c.newPo(); return }
      if (newKind === 'bill' && k?.can.bill) { k.c.newBill(); return }
      if (newKind === 'expense' && k?.can.expense) { k.c.newExpense(); return }
      snackbar({ message: newKind === 'one-off' && !L.m.stages.length ? 'Set up the payment schedule first — billing starts from it' : 'That isn’t yours to start on this project — its members, their Managers, Owners and Admins do' })
    }, GHOST_MIN_MS + 150)
    return () => window.clearTimeout(t)
  }, [newKind])   // eslint-disable-line react-hooks/exhaustive-deps -- once per arrival; `latest` holds the page as it stands
  useEffect(() => {
    if (!params.get('open') && !params.get('send') && !params.get('do') && !params.get('new') && !params.get('amount')) return
    const next = new URLSearchParams(params.toString()); next.delete('open'); next.delete('send'); next.delete('do'); next.delete('new'); next.delete('amount')
    router.replace(next.size ? `${pathname}?${next}` : pathname, { scroll: false })
  }, [params, pathname, router])

  /* ── Region 1: the head — one New ▾, two groups (P3 §6.2) ── */
  const locked = viewer.locked
  const keeper = isAccounting(viewer.role)   // (parity map, MI-007) a variation order changes what was agreed — never Accounting's
  const billItems = viewer.prepares && !locked && !first ? [
    ...(keeper ? [] : [<DropdownItem key="vo" onSelect={() => { setNewOpen(false); inv.newVariation() }} help="A change to the works, approved by the client on its link">Variation order</DropdownItem>,
    <DropdownItem key="vo-up" onSelect={() => { setNewOpen(false); inv.openVoUpload() }} help="Read from a contractor’s quote — a spreadsheet or a PDF"   /* (S42 D-08) what the dialog reads, said alike */>Variation order from a contractor’s quote</DropdownItem>]),
    <DropdownItem key="one-off" onSelect={() => { setNewOpen(false); inv.openOneOff('new') }} help="A reimbursement, an upgrade, out-of-scope work — outside the contract value">One-off invoice</DropdownItem>,
    <DropdownItem key="record" onSelect={() => { setNewOpen(false); inv.openRecordExternal() }} help="An invoice raised in your accounting system or on paper">Record an invoice made elsewhere</DropdownItem>,
  ] : []
  const can = costs?.can ?? { po: false, bill: false, expense: false, external: false }
  const expLocked = usePlanLock('expense_management').locked   // (pending modules S19) expenses are Pro
  const costItems = costs ? [
    ...(can.po ? [<DropdownItem key="po" onSelect={() => { setNewOpen(false); costs.c.newPo() }} help={costs.data.viewer.costs === false ? 'To a sub-contractor or a supplier — the quote’s lines, with the vendor’s prices' : 'To a sub-contractor or a supplier — the quote’s lines at their cost'}>Purchase order</DropdownItem>] : []),
    ...(costs.fromQuote ? [<DropdownItem key="order" onSelect={() => { setNewOpen(false); setOrdering(true) }} help="One Draft PO for each vendor, from the signed quote’s lines">Order from the quote</DropdownItem>] : []),
    /* (parity map, MO-038) a PO raised elsewhere, recorded on the project — it counts in the costs */
    ...(can.external ? [<DropdownItem key="external" onSelect={() => { setNewOpen(false); costs.c.newExternalPo() }} help="One raised in your accounting system or on paper — it counts in the costs">Record a PO made elsewhere</DropdownItem>] : []),
    ...(can.bill ? [<DropdownItem key="bill" onSelect={() => { setNewOpen(false); costs.c.newBill() }} help="A vendor’s invoice — drop its PDF and it is read for you">Supplier bill</DropdownItem>] : []),
    ...(can.expense ? [<DropdownItem key="expense" onSelect={() => { setNewOpen(false); costs.c.newExpense() }} help="Something bought for the project — or a claim to be paid back" meta={expLocked ? <ProTag /> : undefined}>Expense</DropdownItem>] : []),   /* (pending modules S19) Pro on Free */
  ] : []
  /* C presses New — unless the empty Billing's own first button answers it (REG-735: one filled button, one C) */
  const kb = first ? {} : { 'data-kb': 'create', 'data-kb-label': 'New' }
  const newMenu = billItems.length || costItems.length ? (
    <span ref={newAnchor}>
      {phone
        ? <Tooltip label="New" shortcut={first ? undefined : 'create'} disabled={newOpen}><IconButton icon="add" label="New" variant="primary" onClick={() => setNewOpen((o) => !o)} aria-haspopup="menu" aria-expanded={newOpen} disabled={inv.busy === 'new-vo'} {...kb} data-testid="money-new" /></Tooltip>
        : <Button variant="primary" appearance="outlined" iconStart={<Icon name="add" size={20} />} iconEnd={<Icon name="arrow_drop_down" size={20} />} onPress={() => setNewOpen((o) => !o)} aria-haspopup="menu" aria-expanded={newOpen} isDisabled={inv.busy === 'new-vo'} {...kb} data-testid="money-new">New</Button>}
      <PortalMenu open={newOpen} anchor={newAnchor} onClose={() => setNewOpen(false)} align="right" width={MENU_WIDTH.detail} role="menu" sheetTitle="New on Money">
        {billItems.length ? <><DropdownLabel>Bill {client.firstName}</DropdownLabel>{billItems}</> : null}
        {billItems.length && costItems.length ? <DropdownDivider /> : null}
        {costItems.length ? <><DropdownLabel>Costs</DropdownLabel>{costItems}</> : null}
      </PortalMenu>
    </span>
  ) : null

  /* ── Region 3: To collect · To pay · Profit (house StatTiles) ── */
  const overdue = m.invoices.filter((i) => i.overdueMinor > 0)
  const nextUp = m.stages.find((s) => s.invoice && s.invoice.status === 'draft' && s.invoice.amountMinor > 0)
  const nextLine = nextUp?.invoice
    ? `Next: ${nextUp.name} ${money2(nextUp.invoice.amountMinor)} — ${nextUp.invoice.state === 'ready' ? 'ready to send' : nextUp.invoice.state === 'awaiting' ? 'waiting for approval' : nextUp.milestone ? `when ${nextUp.milestone.title} is ${nextUp.milestone.due === 'start' ? 'under way' : 'done'}` : 'on signing'}`
    : m.leftMinor > 0 ? `${money2(m.leftMinor)} left to invoice` : 'Every stage is invoiced'
  const collectHow = [
    `Contract ${money2(m.contractMinor)}${m.variationsMinor ? ` (${m.source === 'quote' ? 'signed quote' : 'agreed value'} ${money2(m.baseMinor ?? 0)} ${m.variationsMinor < 0 ? '−' : '+'} variation orders ${money2(Math.abs(m.variationsMinor))})` : ''}`,
    `invoiced ${money2(m.contractInvoicedMinor ?? m.invoicedMinor)}`, `${money2(m.leftMinor)} left to invoice`,   // the contract's own — a one-off is "outside the contract" below
    ...(m.outsideMinor ? [`${money2(m.outsideMinor)} outside the contract`] : []),
    ...(m.toConfirmMinor ? [`${money2(m.toConfirmMinor)} to confirm`] : []),
    ...(m.uncheckedMinor ? [`${money2(m.uncheckedMinor)} not yet checked`] : []),
  ].join(' · ')
  /* (Contracts on the move, C4 — P-11 · C-24) the tile's contract line on ≤1024: the total and its source in a few words — "Contract S$81,355.42 ·
     signed quote OM-10004", "Contract S$81,355.42 · OM-10004 + 1 variation order", "… · the agreed value" */
  const approvedVos = m.variations.filter((v) => v.approved).length
  const baseWords = m.source === 'quote' ? (data.quote ? data.quote.number : 'the signed quote') : m.source === 'agreed' ? 'the agreed value' : 'no value agreed yet'
  const contractLine = `Contract ${money2(m.contractMinor)} · ${approvedVos ? `${m.source === 'quote' && !data.quote ? 'signed quote' : baseWords} + ${approvedVos} variation order${approvedVos === 1 ? '' : 's'}` : m.source === 'quote' && data.quote ? `signed quote ${data.quote.number}` : baseWords}`
  const paidPct = m.contractMinor ? Math.min(100, (m.collectedContractMinor / m.contractMinor) * 100) : 0
  const s = costs?.summary ?? null
  const seesCosts = !!costs?.data.viewer.seesFigures
  const waitingOk = s ? s.pos.filter((p) => p.state === 'awaiting').reduce((x, p) => x + p.totalMinor, 0) + s.expenses.filter((e) => e.state === 'pending').reduce((x, e) => x + e.amountMinor, 0) : 0
  /* (simplify round 2, R2-A — P3 §6.2) pressing a tile goes to its list: To collect → Billing, To pay → Costs (Profit keeps its hover); on a phone
     the Billing · Costs switch shows that list first. The figure's own hover stays on the value; the tile is the one focus stop. */
  const goList = (list: 'billing' | 'costs') => {
    if (phone && costs) setCostsFirst(list === 'costs')
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    requestAnimationFrame(() => requestAnimationFrame(() => document.getElementById(list)?.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' })))   // after a phone's switch lands
  }
  const payHow = s ? `Committed ${money2(s.committedMinor)} — POs sent, bills and approved expenses · paid out ${money2(s.paidMinor)}${s.claimsOwedMinor ? ` · ${money2(s.claimsOwedMinor)} of it owed to the team (claims)` : ''}` : ''
  const tiles = first ? null : (
    /* (simplify round 2, R2-A — P3 §6.3) at 390: To collect takes the row (value, bar, next line); To pay · Profit side by side under it; a
       Designer's Contract value takes its own row (`moneyTiles`) */
    <StatTiles testId="money-tiles" className={styles.moneyTiles}>
      <StatTile label="To collect" value={<Tooltip label={collectHow}><span className={styles.tileValue}>{money2(m.outstandingMinor)}</span></Tooltip>} figure={money2(m.outstandingMinor)} grade={overdue.length ? 'bad' : undefined} testId="tile-collect"
                press={{ label: `To collect ${money2(m.outstandingMinor)}. ${collectHow}. Opens Billing`, onPress: () => goList('billing') }}
                help={<span className={styles.touchHelp}>{overdue.length ? `${money2(m.overdueMinor)} overdue` : m.toConfirmMinor ? `${money2(m.toConfirmMinor)} to confirm` : m.outstandingMinor ? 'Sent and not yet paid' : 'Nothing owed right now'}</span>}>
        <span className={styles.collectBar} role="progressbar" aria-label="Collected of the contract" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(paidPct)}><span className={styles.collectFill} style={{ width: `${paidPct}%` }} /></span>
        <span className={`${tile.help} ${styles.touchHelp}`} data-testid="money-collected">{money2(m.collectedContractMinor)} collected of {money2(m.contractMinor)}</span>
        {/* (Contracts on the move, C4 — P-11 · C-24) ≤1024 the contract total and where it comes from, at 14 — on a desk it is the value's hover
            breakdown, which a finger never sees (money.module.css `.contractLine`, not drawn from 1025 up); a Designer's own Contract value tile says it */}
        {seesCosts || books?.profit ? <span className={`${tile.help} ${styles.contractLine}`} data-testid="money-contract-line">{contractLine}</span> : null}
        <span className={`${tile.help} ${styles.touchHelp}`} data-testid="money-next">{nextLine}</span>
      </StatTile>
      {seesCosts && s ? (
        <StatTile label="To pay" value={<Tooltip label={payHow}><span className={styles.tileValue}>{money2(s.owedMinor)}</span></Tooltip>} figure={money2(s.owedMinor)}
                  grade={s.overdueMinor ? 'bad' : undefined} testId="tile-pay" press={{ label: `To pay ${money2(s.owedMinor)}. ${payHow}. Opens Costs`, onPress: () => goList('costs') }}
                  help={<span className={styles.touchHelp}>{[s.overdueMinor ? `${money2(s.overdueMinor)} overdue` : s.owedMinor ? 'To vendors, not yet due' : 'Nothing owed right now', waitingOk ? `${money2(waitingOk)} waiting for approval` : null].filter(Boolean).join(' · ')}</span>} />
      ) : null}
      {/* (simplify round 2) the Profit tile opens Costs, as To pay does */}
      {books?.profit ? <ProfitTile profit={books.profit} onPress={() => goList('costs')} /> : null}
      {/* a Designer: what the contract is beside what is owed (the server hands them no cost figures) */}
      {!seesCosts && !books?.profit ? <StatTile label="Contract value" value={money2(m.contractMinor)} testId="tile-contract" help={<span className={styles.touchHelp}>{m.variationsMinor ? `${m.source === 'quote' ? 'Signed quote' : 'Agreed value'} ${money2(m.baseMinor ?? 0)} ${m.variationsMinor < 0 ? '−' : '+'} variation orders ${money2(Math.abs(m.variationsMinor))}` : m.source === 'quote' ? `From the signed quote${data.quote ? ` ${data.quote.number}${data.quote.lines ? ` · ${linesWord(data.quote.lines)}` : ''}` : ''}` : 'The value agreed for the project'}</span>} /> : null}
    </StatTiles>
  )

  /* ── Region 4: Billing (or its empty state) ── */
  const billing = first ? (
    <section id="billing" className={styles.list} data-list="billing">
      <EmptyState icon="payments" title="No payment schedule yet" testId="money-empty"
                  help={data.quote ? `The schedule comes from the signed quote ${data.quote.number}’s Payment Schedule — add its stages there, and each becomes an invoice here.` : data.split ? `Pick the stages this project is billed in — each a share of the agreed value${m.contractMinor ? ` (${money2(m.contractMinor)})` : ', set on the Overview'} — and each becomes an invoice here.` : 'The schedule comes from the signed quote, or from the split agreed when the project began. Set the contract value on the Overview and pick a split.'}
                  primary={data.quote ? { label: `Open ${data.quote.number}`, icon: 'request_quote', onPress: () => router.push(withFrom(`/quotes/${data.quote!.id}${keeper ? '/preview' : ''}`, inv.here)) }
                    : data.split && inv.splitEditable ? { label: 'Pick the payment split', icon: 'payments', onPress: inv.openSplit, testId: 'money-pick-split' }   /* (gaps build B, item 13) no longer a dead end */
                      : { label: 'Open the Overview', icon: 'business_center', onPress: () => router.push(`/projects/${project.id}`) }}
                  secondary={data.split && inv.splitEditable && !m.contractMinor ? { label: 'Set the value on the Overview', icon: 'business_center', onPress: () => router.push(`/projects/${project.id}`) } : null} />
    </section>
  ) : (
    <BillingSection data={data} inv={inv} payments={payments} cn={cn} view={view} onView={setView} admin={admin} focus={focus} onOpen={(id) => openInvoice(id)} />
  )

  /* (simplify round 2, R2-A — P3 §6.8, J11) A bill's PDF or photo dropped anywhere on the tab opens today's Supplier bill dialog reading it — the
     Files tab's drop pattern (components/leads/files/lead-files.tsx: only a drag that carries files counts; the tab wears the Dropzone's "over"
     look with one line), for whoever records a bill here (New ▾ › Supplier bill's own rule). A drop on an open dialog (a portal) is the dialog's
     own. The dialog is use-costs.tsx's, unchanged: the file goes to its own picker, so its reader, its checks and its refusals are the ones a
     browse would meet. */
  const canDropBill = !!costs?.can.bill
  const [dropping, setDropping] = useState(false)
  const carriesFiles = (e: DragEvent) => [...e.dataTransfer.types].includes('Files')
  const inTab = (e: DragEvent) => e.currentTarget.contains(e.target as Node)
  /* (simplify round 2) a dropped bill opens the Supplier bill dialog already reading it — the dialog's own `file` (R2-E) */
  const dropBill = (file: File) => { if (!costs) return; costs.c.newBill(file) }
  const dropHandlers = canDropBill ? {
    onDragOver: (e: DragEvent) => { if (!carriesFiles(e) || !inTab(e)) return; e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; if (!dropping) setDropping(true) },
    onDragLeave: (e: DragEvent) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDropping(false) },
    onDrop: (e: DragEvent) => { if (!carriesFiles(e) || !inTab(e)) return; e.preventDefault(); setDropping(false); const file = e.dataTransfer.files[0]; if (file) dropBill(file) },
  } : {}

  return (
    <div className={styles.tab} data-testid="project-money" data-dropping={dropping || undefined} {...dropHandlers}>
      {dropping ? <div className={styles.drop} aria-hidden data-testid="money-drop"><span className={styles.dropLine}>Drop to record a supplier bill</span></div> : null}
      <div className={styles.bar}>
        <h2 className={styles.title}>Money</h2>
        <div className={styles.actions}>{newMenu}</div>
      </div>
      <MoneyNeeds rows={needs} data={data} inv={inv} payments={payments} cn={cn} costs={costs} onOpenInvoice={openInvoice} />
      {tiles}
      {/* (Q-06) ≤767: one list at a time behind two chips, remembered; at a desk both lists show and the switch is not drawn */}
      {costs ? (
        <div className={styles.listSwitch}>
          <Chips label="Show" options={[{ value: 'billing', label: 'Billing' }, { value: 'costs', label: 'Costs' }]} value={costsFirst ? 'costs' : 'billing'} onChange={(v) => setCostsFirst(v === 'costs')} testId="money-list-switch" />
        </div>
      ) : null}
      <div className={styles.lists} data-show={costs && costsFirst ? 'costs' : 'billing'}>
        {billing}
        {costs ? <CostsSection h={costs} onOrder={() => setOrdering(true)} /> : null}
      </div>
      {payments.dialogs}
      {cn.dialogs}
      {inv.dialogs}
      <InvoicePanel focus={panel} data={data} inv={inv} payments={payments} cn={cn} onClose={() => setPanel(null)} />
      {costs ? <OrderFromQuoteDialog open={ordering} projectId={project.id} onClose={() => setOrdering(false)} onMade={(ids) => { setOrdering(false); if (ids[0]) costs.c.setFocus(ids[0]) }} /> : null}
    </div>
  )
}

