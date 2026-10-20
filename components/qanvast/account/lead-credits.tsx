'use client'

import Link from 'next/link'
import { useMemo, useRef, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ds'
import { CreditsTable } from '@/components/company/plan/credits-table'
import { DropdownItem, MENU_WIDTH } from '@/components/leads/dropdown'
import { EmptyState } from '@/components/om/empty-state'
import { PortalMenu } from '@/components/om/portal-menu'
import { SelectTrigger } from '@/components/om/select-trigger'
import { StatTile, StatTiles } from '@/components/om/stat-tile'
import { ArticleChart } from '@/components/market-insights/article-chart'
import { displayDate, moneySGD, phoneLocal } from '@/lib/format'
import { withFrom } from '@/lib/nav'
import { useMaisonAi, type MaisonSuggestion } from '@/lib/maison-ai'
import type { TableColumnDef } from '@/components/om/table-columns'
import type { ChartSpec } from '@/lib/market-insights/markdown'
import type { CreditsContracts, CreditsData, CreditsOverview, CreditsTransactions, StatementView } from '@/lib/qanvast-account/queries'
import { budgetK, creditsText, creditsWords, entitlementLines, monthLong, monthShort, type ContractRow, type CreditMonth } from '@/lib/qanvast-account/model'
import { QANVAST_CREDITS_HREF, QANVAST_LEADS_HREF } from '@/components/qanvast/qanvast-tabs'
import { AccountFrame } from './account-frame'
import { CreditsGhost } from './account-ghost'
import { CREDIT_VIEWS, W, type CreditViewKey } from './words'
import styles from './account.module.css'

/**
 * (pending modules S41b-5 — 1.0's `deployment/qanvast` Qanvast Ops › Credits: credits/page.tsx · contracts · transactions · leads; the S41b sweep's
 * M-04; his "build all of them" 2026-10-11) **Qanvast Ops › Lead credits**, Owners only (1.0's rule). Three views, each at 1.0's own address:
 *   · **Overview** — what is left (1.0's "Lead Credits Balance"), this month's use, a refund Qanvast approved and hasn't credited yet (the studio's
 *     own return); 1.0's "Need more credits? Contact your BD" as the balance's help; Leads received · Credits used by month as two small charts
 *     (1.0 drew one chart on two axes — the house chart has one axis, so two charts side by side); 1.0's Monthly Overview table; Closures in the
 *     last six months (contracts approved, conversion, the contracts' value — 1.0 summed the leads' budgets there) with 1.0's two footnotes.
 *     1.0's three door cards (View All Leads · Contracts · Transactions) are the view chips and the tab strip's Leads.
 *   · **Transactions** — one month's statement (1.0's month select, back to the first transaction): brought forward, each lead's credits with the
 *     client (their lead one press away, when Who sees leads lets the viewer open it), what was added, the total and carried forward.
 *   · **Contracts** — each contract: when it started, what was paid, its credits (and free credits), the leads' budget it buys, its photoshoots
 *     and social media posts used of what it gives (1.0's "View more" folded them; here they are the cell's lines).
 * Tables on the listing's model (Column settings, phone cards); every figure from Qanvast through the seam. *(invented copy: the help lines,
 * the empty states, the on-the-way tile)*
 */
export function LeadCredits({ data, view }: { data: CreditsData; view: CreditViewKey }) {
  const state = data.gate ? { gate: true as const } : { gate: false as const, error: 'error' in data ? data.error : undefined, expired: 'error' in data ? data.expired : undefined, standIn: data.standIn }
  const ok = !data.gate && !('error' in data) ? data : null
  const [month, setMonth] = useState(false)
  const monthRef = useRef<HTMLButtonElement>(null)
  const router = useRouter()
  const tx = ok?.view === 'transactions' ? ok : null
  const tools = tx ? (
    <span className={styles.menuWrap}>
      <SelectTrigger ref={monthRef} label="Month" value={monthLong(tx.month)} open={month} onClick={() => setMonth((o) => !o)} data-testid="credits-month" />
      <PortalMenu open={month} anchor={monthRef} onClose={() => setMonth(false)} role="menu" width={MENU_WIDTH.standard} align="right" sheetTitle="Month">
        {tx.options.map((k) => (
          <DropdownItem key={k} role="menuitemradio" checked={k === tx.month} onSelect={() => { setMonth(false); router.push(monthHref(k, tx.now)) }}>{monthLong(k)}</DropdownItem>
        ))}
      </PortalMenu>
    </span>
  ) : null
  useMaisonAi(useMemo(() => suggestions(ok), [ok]))
  return (
    <AccountFrame tab="credits" views={CREDIT_VIEWS} view={view} state={state} tools={tools} ghost={<CreditsGhost view={view} />} testId="lead-credits">
      {ok?.view === 'overview' ? <Overview d={ok} /> : ok?.view === 'transactions' ? <Transactions d={ok} /> : ok?.view === 'contracts' ? <Contracts d={ok} /> : null}
    </AccountFrame>
  )
}

/** A month's statement: this month needs no ?month= (its address is the view's own). */
const monthHref = (k: string, now: number) => {
  const here = new Date(now)
  const thisMonth = `${here.getFullYear()}-${String(here.getMonth() + 1).padStart(2, '0')}`
  return k === thisMonth ? `${QANVAST_CREDITS_HREF}/transactions` : `${QANVAST_CREDITS_HREF}/transactions?month=${k}`
}
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

/* ── Overview ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────── */

const MONTH_DEFS: readonly TableColumnDef[] = [
  { key: 'month', label: 'Month', track: 'minmax(160px, 160fr)', locked: true },
  { key: 'leads', label: 'Leads received', track: 'minmax(152px, 152fr)' },
  { key: 'budget', label: 'Leads’ budgets', track: 'minmax(160px, 160fr)' },
  { key: 'credits', label: 'Credits used', track: 'minmax(144px, 144fr)' },
  { key: 'closures', label: 'Closures', track: 'minmax(120px, 120fr)' },
]

function Overview({ d }: { d: CreditsOverview }) {
  const nothing = d.balance === 0 && d.contracts === 0 && d.months.every((m) => !m.leads && !m.credits)
  if (nothing) {
    return <EmptyState icon="credit_card" tone="plain" testId="credits-empty" kb={false} title="No lead credits yet"
                       help="When the studio signs a contract with Qanvast, its credits, the leads they bought and each month’s statement show here." />
  }
  const now = d.months.find((m) => m.key === d.thisMonth)
  const used = now?.credits ?? 0
  const got = now?.leads ?? 0
  /* the months by their short names (a phone's six columns hold "Aug", not "Aug 2026"); the range under the title says the years */
  const range = d.months.length ? `${monthLong(d.months[0]!.key)} to ${monthLong(d.months[d.months.length - 1]!.key)}` : null
  const chart = (title: string, key: 'leads' | 'credits'): ChartSpec => ({
    kind: 'bar', title, subtitle: range, source: null, sourceUrl: null, prefix: '', suffix: '',
    labels: d.months.map((m) => m.label.split(' ')[0]!), series: [{ key, label: title, values: d.months.map((m) => m[key]) }],
  })
  const back = d.onTheWay.credits > 0
  return (
    <>
      <StatTiles testId="credits-tiles">
        <StatTile label={W.left} value={creditsText(d.balance)} help={W.topUp} testId="credits-left" />
        <StatTile label={W.usedIn(monthLong(d.thisMonth).split(' ')[0]!)} value={creditsText(used)} help={`${plural(got, 'lead')} from Qanvast this month`} testId="credits-used"
                  press={{ href: `${QANVAST_CREDITS_HREF}/transactions`, label: `${creditsWords(used)} used this month — open this month’s statement` }} />
        {back ? (
          <StatTile label={W.onTheWay} value={creditsText(d.onTheWay.credits)} testId="credits-on-the-way"
                    help={`${names(d.onTheWay.names)} — Qanvast approved the ${d.onTheWay.names.length === 1 ? 'return' : 'returns'} and credits ${d.onTheWay.names.length === 1 ? 'it' : 'them'} once processed`}
                    press={{ href: QANVAST_LEADS_HREF, label: `${creditsWords(d.onTheWay.credits)} on the way back — open the Qanvast leads` }} />
        ) : null}
      </StatTiles>

      <section className={styles.section} aria-labelledby="credits-months">
        <div className={styles.sectionHead}><div className={styles.sectionTitles}>
          <h2 id="credits-months" className={styles.sectionTitle}>{W.byMonth}</h2>
          <p className={styles.sectionHelp}>{W.byMonthHelp}</p>
        </div></div>
        <div className={styles.charts} data-testid="credits-charts">
          <ArticleChart spec={chart(W.leadsChart, 'leads')} />
          <ArticleChart spec={chart(W.creditsChart, 'credits')} />
        </div>
      </section>

      <CreditsTable<CreditMonth> table="qanvast-credit-months" title={W.monthByMonth} help="Newest first" defs={MONTH_DEFS} rows={[...d.months].reverse()} rowKey={(m) => m.key}
                                 testId="credits-months-table" empty="No months to show yet."
                                 cell={(m, key) => {
                                   switch (key) {
                                     case 'month': return <Link className={styles.leadLink} href={monthHref(m.key, d.now)}>{monthLong(m.key)}</Link>
                                     case 'leads': return <span className={styles.num}>{m.leads}</span>
                                     case 'budget': return <span className={styles.num}>{moneySGD(m.budget * 100)}</span>
                                     case 'credits': return <span className={styles.num}>{creditsText(m.credits)}</span>
                                     default: return <span className={styles.num}>{m.closures}</span>
                                   }
                                 }} />

      <section className={styles.section} aria-labelledby="credits-closures">
        <div className={styles.sectionHead}><div className={styles.sectionTitles}>
          <h2 id="credits-closures" className={styles.sectionTitle}>{W.closures}</h2>
        </div></div>
        <StatTiles testId="credits-closures">
          <StatTile label="Contracts approved" value={d.closures.contracts} help={`From ${plural(d.closures.leads, 'Qanvast lead')}`} testId="closures-contracts" />
          <StatTile label="Conversion rate" value={`${d.closures.rate}%`} help="Contracts approved of the leads received" testId="closures-rate" />
          <StatTile label="Value of contracts" value={moneySGD(d.closures.sum * 100)} help="What those contracts are worth" testId="closures-sum" />
        </StatTiles>
        <p className={styles.foot} data-testid="closures-foot">{d.standIn ? W.closuresFootSimulated : W.closuresFoot}</p>
      </section>
    </>
  )
}
const names = (list: string[]) => (list.length <= 2 ? list.join(' and ') : `${list.slice(0, 2).join(', ')} and ${plural(list.length - 2, 'other')}`)

/* ── Transactions ──────────────────────────────────────────────────────────────────────────────────────────────────────────────── */

type StRow = StatementView['rows'][number]
const STATEMENT_DEFS: readonly TableColumnDef[] = [
  { key: 'date', label: 'Date', track: 'minmax(120px, 120fr)', locked: true },
  { key: 'what', label: 'Description', track: 'minmax(320px, 420fr)' },
  { key: 'minus', label: 'Taken', track: 'minmax(112px, 112fr)' },
  { key: 'plus', label: 'Added', track: 'minmax(112px, 112fr)' },
  { key: 'balance', label: 'Balance', track: 'minmax(120px, 120fr)' },
]

function Transactions({ d }: { d: CreditsTransactions }) {
  const router = useRouter()
  const here = `${QANVAST_CREDITS_HREF}/transactions${d.month ? `?month=${d.month}` : ''}`
  const st = d.statement
  if (!st.rows.length) {
    return <EmptyState icon="receipt_long" tone="plain" testId="credits-statement-empty" kb={false} title="No credits yet"
                       help="When Qanvast sends the studio a lead, the credits it takes show here, month by month, with what each contract added." />
  }
  const cell = (r: StRow, key: string): ReactNode => {
    if (r.kind !== 'entry') {
      if (key === 'what') return <span className={`${styles.cellMain} ${styles.strong}`}>{r.label}</span>
      if (r.kind === 'total' && key === 'minus') return r.minus ? <span className={`${styles.num} ${styles.strong}`}>−{creditsText(r.minus)}</span> : null
      if (r.kind === 'total' && key === 'plus') return r.plus ? <span className={`${styles.num} ${styles.strong}`}>+{creditsText(r.plus)}</span> : null
      if (r.kind !== 'total' && key === 'balance') return <span className={`${styles.num} ${styles.strong}`}>{creditsText(r.balance)}</span>
      return null
    }
    switch (key) {
      case 'date': return <span className={styles.num}>{displayDate(new Date(r.at))}</span>
      case 'what': return r.lead ? (
        <span className={styles.cellLines}>
          <span className={styles.cellMain}>{r.what}</span>
          <span className={styles.cellLine}>
            {r.leadId ? <Link className={styles.leadLink} href={withFrom(`/leads/${r.leadId}`, here)}>{r.lead.name}</Link> : r.lead.name}
            {r.lead.contact ? ` · ${phoneLocal(r.lead.contact)}` : ''}{r.lead.budget ? ` · S$${budgetK(r.lead.budget)} budget` : ''}
          </span>
        </span>
      ) : <span className={styles.cellMain}>{r.what}</span>
      case 'minus': return r.minus ? <span className={styles.num}>−{creditsText(r.minus)}</span> : null
      case 'plus': return r.plus ? <span className={`${styles.num} ${styles.in}`}>+{creditsText(r.plus)}</span> : null
      default: return <span className={styles.num}>{creditsText(r.balance)}</span>
    }
  }
  return (
    <>
      <div className={styles.statement}>
        <CreditsTable<StRow> table="qanvast-credit-statement" title={W.statement(monthLong(d.month))} help={W.statementHelp} defs={STATEMENT_DEFS} rows={st.rows}
                             rowKey={(r) => r.id} cell={cell} testId="credits-statement" empty="" rowAttrs={(r) => ({ 'data-kind': r.kind, 'data-testid': 'statement-row' })} />
      </div>
      {!st.entries ? (
        <p className={styles.note} data-testid="credits-month-quiet">
          <span className={styles.noteText}>{`Nothing was taken or added in ${monthLong(d.month)}.`}</span>
          {d.lastActive ? <Button variant="primary" appearance="text" onPress={() => router.push(monthHref(d.lastActive!, d.now))} data-testid="credits-last-active">{`Show ${monthLong(d.lastActive)}`}</Button> : null}
        </p>
      ) : null}
    </>
  )
}

/* ── Contracts ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────── */

const CONTRACT_DEFS: readonly TableColumnDef[] = [
  { key: 'number', label: 'Contract', track: 'minmax(128px, 128fr)', locked: true },
  { key: 'start', label: 'Started', track: 'minmax(120px, 120fr)' },
  { key: 'amount', label: 'Paid', track: 'minmax(120px, 120fr)' },
  { key: 'credits', label: 'Credits', track: 'minmax(176px, 176fr)' },
  { key: 'budget', label: 'Leads’ budget', track: 'minmax(168px, 168fr)' },
  { key: 'ents', label: 'Includes', track: 'minmax(280px, 280fr)' },
]

function Contracts({ d }: { d: CreditsContracts }) {
  return (
    <CreditsTable<ContractRow> table="qanvast-credit-contracts" title={W.contracts} help={W.contractsHelp} defs={CONTRACT_DEFS} rows={d.contracts} rowKey={(c) => c.id}
                               testId="credits-contracts" empty="No contracts with Qanvast yet — when the studio signs one, it shows here with what it includes."
                               cell={(c, key) => {
                                 switch (key) {
                                   case 'number': return <span className={styles.num}>{c.number}</span>
                                   case 'start': return <span className={styles.num}>{c.start ? displayDate(new Date(c.start)) : '—'}</span>
                                   case 'amount': return <span className={styles.num}>{moneySGD(c.amount * 100)}</span>
                                   case 'credits': return (
                                     <span className={styles.cellLines}>
                                       <span className={`${styles.cellMain} ${styles.num}`}>{creditsText(c.credits)}</span>
                                       {c.freeCredits ? <span className={styles.cellLine}>{`+ ${creditsText(c.freeCredits)} free`}</span> : null}
                                     </span>
                                   )
                                   case 'budget': return <span className={styles.cellMain}>{c.budget}</span>
                                   default: {
                                     const lines = entitlementLines(c)
                                     return lines.length ? <span className={styles.cellLines}>{lines.map((l, i) => <span key={l} className={i ? styles.cellLine : styles.cellMain}>{l}</span>)}</span> : <span className={styles.muted}>Nothing more</span>
                                   }
                                 }
                               }} />
  )
}

/* ── Maison AI: answered from what the page holds ─────────────────────────────────────────────────────────────────────────────── */

function suggestions(d: CreditsOverview | CreditsTransactions | CreditsContracts | null): MaisonSuggestion[] {
  if (!d) return []
  if (d.view === 'overview') {
    const busiest = [...d.months].sort((a, b) => b.leads - a.leads)[0]
    return [
      { label: 'How many lead credits are left?', answer: { title: `${creditsWords(d.balance)} left`, text: d.onTheWay.credits ? `${creditsWords(d.onTheWay.credits)} more are on the way back — ${names(d.onTheWay.names)}’s ${d.onTheWay.names.length === 1 ? 'return was' : 'returns were'} approved. ${W.topUp}` : W.topUp, link: { label: 'Open this month’s statement', href: `${QANVAST_CREDITS_HREF}/transactions` } } },
      { label: 'Which month brought the most Qanvast leads?', answer: busiest && busiest.leads
        ? { title: `${monthLong(busiest.key)} — ${plural(busiest.leads, 'lead')}`, rows: d.months.filter((m) => m.leads).map((m) => ({ id: m.key, label: monthShort(m.key), meta: `${plural(m.leads, 'lead')} · ${creditsWords(m.credits)}`, href: monthHref(m.key, d.now), share: m.leads / busiest.leads })) }
        : { title: 'No Qanvast leads in the last six months', text: 'When Qanvast sends the studio a lead, it is counted here month by month.' } },
    ]
  }
  if (d.view === 'transactions') {
    const leadsHere = d.statement.rows.filter((r): r is Extract<StRow, { kind: 'entry' }> => r.kind === 'entry' && !!r.lead)
    return [
      { label: `Which leads used credits in ${monthLong(d.month)}?`, answer: leadsHere.length
        ? { title: plural(leadsHere.length, 'lead'), rows: leadsHere.map((r) => ({ id: r.id, label: r.lead!.name, meta: `${displayDate(new Date(r.at))} · ${creditsWords(r.minus ?? 0)}`, href: r.leadId ? `/leads/${r.leadId}` : undefined })) }
        : { title: `No leads in ${monthLong(d.month)}`, text: 'Pick another month at the top right.' } },
    ]
  }
  const left = d.contracts.flatMap((c) => entitlementLines(c).map((l) => ({ id: `${c.id}:${l}`, label: `${c.number} · ${l}` })))
  return [
    { label: 'What do our contracts still include?', answer: left.length ? { title: 'What your contracts include', rows: left } : { title: 'Nothing more', text: 'Your contracts give credits only.' } },
  ]
}
