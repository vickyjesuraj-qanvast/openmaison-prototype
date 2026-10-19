'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ds'
import { CompanyShell } from '@/components/company/company-shell'
import { UsageGhost } from '@/components/company/company-ghosts'
import { ReadOnlyNote } from '@/components/company/read-only-note'
import { DropdownDivider, DropdownItem, MENU_WIDTH } from '@/components/leads/dropdown'
import { ExportDialog } from '@/components/leads/export-dialog'
import { Avatar } from '@/components/om/avatar'
import { Dialog } from '@/components/om/dialog'
import { Icon } from '@/components/om/icon'
import { MetaChip } from '@/components/om/meta-chip'
import { PortalMenu } from '@/components/om/portal-menu'
import { ScopePill } from '@/components/om/scope-pill'
import { useSnackbar } from '@/components/om/snackbar'
import { StatTile } from '@/components/om/stat-tile'
import { SelectTrigger } from '@/components/om/select-trigger'
import { TabSearchEmpty } from '@/components/leads/tasks/tab-search-empty'
import { TextField } from '@/components/om/text-field'
import { ToolbarSearch } from '@/components/om/toolbar-search'
import { openPlans, openTopUp, refreshCredits, useCredits } from '@/components/credits/credits-client'
import { setDefaultMonthlyAmount, setMonthlyAmount } from '@/app/credits/actions'
import { aboutRenders, dayMonth, fmtCredits, refreshLine, runOutAt, toneOf, type CreditSummary } from '@/lib/credits/model'
import { sgd, TOPUP_CREDITS, TOPUP_PRICE } from '@/lib/credits/plans'
import { buildTable, downloadBlob, type ExportFormat } from '@/lib/leads/export'
import { displayDateTimeDot } from '@/lib/format'
import { ago } from '@/lib/templates/ago'
import { useMaisonAi, type MaisonSuggestion } from '@/lib/maison-ai'
import { withFrom } from '@/lib/nav'
import { PLAN_TABS } from '@/lib/company/sections'
import type { Usage, UsageLead, UsageMember, UsageRange, UsageRow, UsageTool } from '@/lib/credits/queries'
import { CreditsTable } from './credits-table'
import styles from './plan.module.css'

export type Ask = { id: string; memberId: string; name: string; kind: 'pool' | 'monthly'; needed: number; at: number }

const RANGES: { key: UsageRange; label: string }[] = [{ key: 'this', label: 'This month' }, { key: 'last', label: 'Last month' }, { key: '3m', label: 'Last 3 months' }, { key: '6m', label: 'Last 6 months' }]
/** (Q-25) The monthly amount's quick picks — 1.0's permanent cap under its 2.0 name. */
const PICKS = [300, 600, 1000]
/* (pending modules S10 — card held:maison-ai, "Plan & AI credits' words-only suggestions") each is asked and answered from the credits record —
   who used the most, when they run out at this month's pace, the leads with renders (lib/maison-ai/answers/money.ts · work.ts) */
const AI_SUGGESTIONS: MaisonSuggestion[] = [{ label: 'Who used the most this month?', ask: 'Who used the most AI credits this month?' }, 'How long will our AI credits last?', 'Which leads had renders?']
const PAGE = 20
const plural = (n: number, one: string, many = `${one}s`) => `${fmtCredits(n)} ${n === 1 ? one : many}`
const amountWords = (n: number | null) => (n == null ? 'No limit' : `${fmtCredits(n)} a month`)
/* (pending modules S23 · S19, joined at the lanes' merge) a meeting's co-pilot time counts in the words as it does in the number — 10 minutes a block */
const workLine = (r: { renders: number; quotes: number; copilot: number }) => [r.renders ? plural(r.renders, 'render') : null, r.quotes ? plural(r.quotes, 'quote read', 'quotes read') : null, r.copilot ? `${fmtCredits(r.copilot * 10)} min of the Meeting Copilot` : null].filter(Boolean).join(' · ') || 'Nothing yet'

const MEMBER_DEFS = [
  { key: 'member', label: 'Member', track: 'minmax(220px, 220fr)', locked: true },
  { key: 'used', label: 'Used', track: 'minmax(240px, 240fr)' },
  { key: 'credits', label: 'AI credits', track: 'minmax(120px, 120fr)' },
  { key: 'amount', label: 'Monthly amount', track: 'minmax(170px, 170fr)' },
  { key: 'state', label: 'Status', track: 'minmax(170px, 170fr)' },
] as const
const TOOL_DEFS = [
  { key: 'tool', label: 'Tool', track: 'minmax(220px, 220fr)', locked: true },
  { key: 'share', label: 'Share', track: 'minmax(220px, 220fr)' },
  { key: 'times', label: 'Times used', track: 'minmax(120px, 120fr)' },
  { key: 'credits', label: 'AI credits', track: 'minmax(120px, 120fr)' },
] as const
const LEAD_DEFS = [
  { key: 'lead', label: 'Lead', track: 'minmax(220px, 220fr)', locked: true },
  { key: 'stage', label: 'Stage', track: 'minmax(140px, 140fr)' },
  { key: 'renders', label: 'Renders', track: 'minmax(110px, 110fr)' },
  { key: 'quotes', label: 'Quotes read', track: 'minmax(120px, 120fr)' },
  { key: 'credits', label: 'AI credits', track: 'minmax(120px, 120fr)' },
] as const
const ACTIVITY_DEFS = [
  { key: 'when', label: 'When', track: 'minmax(170px, 170fr)', locked: true },
  { key: 'what', label: 'What', track: 'minmax(220px, 220fr)' },
  { key: 'for', label: 'For', track: 'minmax(240px, 240fr)' },
  { key: 'who', label: 'Who', track: 'minmax(150px, 150fr)' },
  { key: 'credits', label: 'AI credits', track: 'minmax(120px, 120fr)' },
  { key: 'balance', label: 'Balance after', track: 'minmax(130px, 130fr)' },
] as const

/**
 * (REG-704, AI credits §5.7 · Q-22 … Q-27) Company › Plan & AI credits › Usage — 1.0's Usage & credits on Company's frame. The period is a
 * scope pill; three tiles say what is left, what was used (and, for the Owner, what that is at the top-up price — owners budget in S$,
 * E-13) and how long it lasts at this pace. The Owner answers asks at the top, sets each member's monthly amount in By member (quick
 * picks, a default for new members, Undo), and sees what AI cost per lead (By lead, won vs lost — E-15). Activity ties every charge to its
 * lead, design or quote (B-27). 1.0's reach: the Owner and Admins see the studio; everyone else, their own (Q-24).
 */
export function UsageView({ summary, usage, asks, from, focus }: { summary: CreditSummary; usage: Usage; asks: Ask[]; from?: string; focus?: string }) {
  const router = useRouter()
  const snackbar = useSnackbar()
  const s = useCredits(summary) ?? summary
  const trusted = s.viewer.trusted && s.balance != null
  const owner = s.viewer.canSetAmounts
  useMaisonAi(AI_SUGGESTIONS)

  /* the period: a scope pill whose menu replaces `?range=` (the page reads it) */
  const [rangeOpen, setRangeOpen] = useState(false)
  const rangeRef = useRef<HTMLButtonElement>(null)
  const rangeLabel = RANGES.find((r) => r.key === usage.range)?.label ?? 'This month'
  const here = (range: UsageRange) => withFrom(range === 'this' ? '/company/plan' : `/company/plan?range=${range}`, from)
  const [pendingRange, go] = useTransition()

  /* monthly amounts — optimistic, put back when the server refuses (REG-656), with Undo (Q-25) */
  const [amounts, setAmounts] = useState<Record<string, number | null>>(() => Object.fromEntries(usage.members.map((m) => [m.id, m.cap])))
  const [seed, setSeed] = useState(usage.members)
  if (seed !== usage.members) { setSeed(usage.members); setAmounts(Object.fromEntries(usage.members.map((m) => [m.id, m.cap]))) }
  const [defaultAmount, setDefault] = useState<number | null>(usage.defaultAmount)
  const [seedDefault, setSeedDefault] = useState(usage.defaultAmount)
  if (seedDefault !== usage.defaultAmount) { setSeedDefault(usage.defaultAmount); setDefault(usage.defaultAmount) }
  const [menu, setMenu] = useState<{ memberId: string | 'default'; el: HTMLElement } | null>(null)
  const menuRef = useRef<HTMLElement | null>(null)
  const [custom, setCustom] = useState<{ memberId: string | 'default'; value: string; tried: boolean } | null>(null)
  const nameOf = (id: string) => usage.members.find((m) => m.id === id)?.name ?? 'This member'
  /* `from`: the value being replaced, when the caller knows it better than this render does — Undo runs from an older render's closure */
  const setAmount = async (memberId: string, amount: number | null, opts: { undo?: boolean; from?: number | null } = {}) => {
    const before = opts.from !== undefined ? opts.from : amounts[memberId] ?? null
    if (before === amount) return
    const name = nameOf(memberId)
    setAmounts((a) => ({ ...a, [memberId]: amount }))
    try {
      const r = await setMonthlyAmount(memberId, amount)
      if ('error' in r) { setAmounts((a) => ({ ...a, [memberId]: before })); snackbar({ message: r.error }); return }
      router.refresh(); void refreshCredits()
      snackbar({ key: `amount-${memberId}`, message: amount == null ? `${name} has no monthly amount` : `${name} can use ${fmtCredits(amount)} AI credits a month`, ...(opts.undo === false ? {} : { actionLabel: 'Undo', onAction: () => { void setAmount(memberId, before, { undo: false, from: amount }) } }) })
    } catch { setAmounts((a) => ({ ...a, [memberId]: before })); snackbar({ message: `Couldn’t change ${name}’s monthly amount` }) }
  }
  const setDefaultAmount = async (amount: number | null) => {
    const before = defaultAmount
    if (before === amount) return
    setDefault(amount)
    try {
      const r = await setDefaultMonthlyAmount(amount)
      if ('error' in r) { setDefault(before); snackbar({ message: r.error }); return }
      router.refresh()
      snackbar({ key: 'amount-default', message: amount == null ? 'New members start with no monthly amount' : `New members start with ${fmtCredits(amount)} AI credits a month`, actionLabel: 'Undo', onAction: () => { setDefault(before); void setDefaultMonthlyAmount(before).then(() => router.refresh()) } })
    } catch { setDefault(before); snackbar({ message: 'Couldn’t change the amount for new members' }) }
  }
  const pick = (target: string | 'default', amount: number | null) => { setMenu(null); if (target === 'default') void setDefaultAmount(amount); else void setAmount(target, amount) }
  const current = (target: string | 'default') => (target === 'default' ? defaultAmount : amounts[target] ?? null)

  /* an ask's member, arrived at from the bell (`?member=`): their ask stays in view — it holds the answer — else their row comes into
     view; the row flashes once either way */
  useEffect(() => {
    if (!focus) return
    const el = document.querySelector<HTMLElement>(`[data-ask-member="${CSS.escape(focus)}"]`) ?? document.querySelector<HTMLElement>(`[data-member="${CSS.escape(focus)}"]`)
    el?.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }, [focus])

  /* the tiles */
  const used = usage.tools.reduce((n, t) => n + t.credits, 0)
  const works = usage.members.reduce((a, m) => ({ renders: a.renders + m.renders, quotes: a.quotes + m.quotes, copilot: a.copilot + m.copilot }), { renders: 0, quotes: 0, copilot: 0 })
  const runOut = trusted && s.counting ? runOutAt({ used: s.usedThisPeriod ?? 0, balance: s.balance ?? 0, periodStart: s.periodStart, periodEnd: s.periodEnd, now: s.now }) : null
  const delta = usage.previous != null && usage.previous > 0 ? Math.round(((used - usage.previous) / usage.previous) * 100) : null
  const plan = s.planCredits ?? 0, top = s.topupCredits ?? 0, whole = Math.max(1, (s.allowance ?? 0) + top)
  /* (UX audit S5, REG-704) Low — the pool is low or out, or this pace runs out before the refresh: the Owner buys from where it is said,
     through the credits openers every other surface uses (the top-up and Plans dialogs). */
  const tone = toneOf(s)
  const lowNow = s.counting && (tone === 'low' || tone === 'empty' || !!runOut)
  const buyHere = s.viewer.canBuy && lowNow

  /* Activity: a search and a page at a time */
  const [query, setQuery] = useState('')
  const [shown, setShown] = useState(PAGE)
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? usage.rows.filter((r) => [r.words, r.forLabel ?? '', r.who ?? ''].some((v) => v.toLowerCase().includes(q))) : usage.rows
  }, [usage.rows, query])
  const [exportOpen, setExportOpen] = useState(false)
  const download = (format: ExportFormat) => {
    const head = ['When', 'What', 'For', 'Who', 'AI credits', ...(trusted ? ['Balance after'] : [])]
    const body = rows.map((r) => [displayDateTimeDot(new Date(r.at)), r.words, r.forLabel ?? '', r.who ?? '', signed(r.credits), ...(trusted ? [fmtCredits(r.balanceAfter)] : [])])
    const d = new Date(s.now)
    return downloadBlob(buildTable('OpenMaison — AI credits', head, body, format), `openmaison-ai-credits-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}.${format.toLowerCase()}`)
  }

  const memberCell = (m: UsageMember, key: string) => {
    const cap = amounts[m.id] ?? null
    switch (key) {
      case 'member': return <span className={styles.who}><Avatar name={m.name} color={m.color} size={36} tooltip={false} /><span className={styles.whoText}><span className={styles.whoName}>{m.name}</span><span className={styles.whoRole}>{m.role}</span></span></span>
      case 'used': {
        const top = Math.max(1, ...usage.members.map((x) => x.used))
        const tone = cap != null && m.used >= cap ? 'bad' : cap != null && m.used >= cap * 0.8 ? 'warn' : undefined
        return <span className={styles.used}><span className={styles.meter} aria-hidden><i data-tone={tone} style={{ width: `${Math.max(m.used > 0 ? 3 : 0, Math.min(100, (cap != null ? m.used / Math.max(1, cap) : m.used / top) * 100))}%` }} /></span><span className={styles.usedLine}>{workLine(m)}</span></span>
      }
      case 'credits': return <span className={styles.credit}>{fmtCredits(m.used)}</span>
      case 'amount': return owner ? (
        /* (REG-729) the house compact select trigger, its cell size (28) */
        <SelectTrigger size="s" className={styles.amount} data-none={cap == null || undefined} label={`${m.name}’s monthly amount`} value={amountWords(cap)} open={menu?.memberId === m.id}
                       onClick={(e) => { menuRef.current = e.currentTarget; setMenu({ memberId: m.id, el: e.currentTarget }) }} data-testid="member-amount" />
      ) : <span className={cap == null ? styles.m : undefined}>{amountWords(cap)}</span>
      case 'state': {
        const ask = asks.find((a) => a.memberId === m.id && a.kind === 'monthly')
        if (ask) return <MetaChip color="yellow" icon="person">Asked for more</MetaChip>
        if (cap != null && m.used >= cap) return <MetaChip color="red">At their amount</MetaChip>
        if (cap != null && m.used >= cap * 0.8) return <MetaChip color="yellow">Near it</MetaChip>
        return <span className={styles.m}>—</span>
      }
      default: return null
    }
  }
  const toolCell = (t: UsageTool, key: string) => {
    switch (key) {
      case 'tool': return <span className={styles.oneLine}>{t.label}</span>
      case 'share': return <span className={styles.used}><span className={styles.meter} aria-hidden><i style={{ width: `${used > 0 ? Math.max(3, (t.credits / used) * 100) : 0}%` }} /></span><span className={styles.usedLine}>{used > 0 ? `${Math.round((t.credits / used) * 100)}%` : '—'}</span></span>
      case 'times': return <span className={styles.num}>{fmtCredits(t.times)}</span>
      case 'credits': return <span className={styles.credit}>{fmtCredits(t.credits)}</span>
      default: return null
    }
  }
  const leadCell = (l: UsageLead, key: string) => {
    switch (key) {
      case 'lead': return <Link className={`${styles.link} ${styles.oneLine}`} href={withFrom(`/leads/${l.id}`, '/company/plan')}>{l.name}</Link>
      case 'stage': return <MetaChip color={l.stage === 'Won' ? 'green' : l.stage === 'Lost' ? 'red' : 'default'}>{l.stage}</MetaChip>
      case 'renders': return <span className={styles.num}>{l.renders ? fmtCredits(l.renders) : '—'}</span>
      case 'quotes': return <span className={styles.num}>{l.quotes ? fmtCredits(l.quotes) : '—'}</span>
      case 'credits': return <span className={styles.credit}>{fmtCredits(l.credits)}</span>
      default: return null
    }
  }
  const rowCell = (r: UsageRow, key: string) => {
    switch (key) {
      case 'when': return <span className={styles.oneLine} title={displayDateTimeDot(new Date(r.at))}>{displayDateTimeDot(new Date(r.at))}</span>
      case 'what': return <span className={styles.oneLine}>{r.words}</span>
      case 'for': return r.forHref ? <Link className={`${styles.link} ${styles.oneLine}`} href={withFrom(r.forHref, '/company/plan')}>{r.forLabel}</Link> : <span className={styles.m}>—</span>
      case 'who': return <span className={styles.oneLine}>{r.who ?? <span className={styles.m}>Studio</span>}</span>
      case 'credits': return <span className={styles.credit} data-tone={r.credits > 0 ? 'in' : r.credits === 0 ? 'zero' : undefined}>{signed(r.credits)}{r.reason === 'refund' ? ' back' : ''}</span>
      case 'balance': return <span className={styles.num}>{fmtCredits(r.balanceAfter)}</span>
      default: return null
    }
  }

  const menuTarget = menu?.memberId ?? null
  return (
    <CompanyShell title="Plan & AI credits" tabs={[...PLAN_TABS]} from={from} skeleton={<UsageGhost />}>
      <div className={styles.page} data-testid="plan-usage" aria-busy={pendingRange || undefined}>
        <div className={styles.bar}>
          <div className={styles.barStart}>
            <ScopePill ref={rangeRef} label={`Period: ${rangeLabel}`} short={rangeLabel} open={rangeOpen} scoped={usage.range !== 'this'} onClick={() => setRangeOpen((o) => !o)} />
            <PortalMenu open={rangeOpen} anchor={rangeRef} onClose={() => setRangeOpen(false)} align="left" width={MENU_WIDTH.standard} role="menu" sheetTitle="Period">   {/* (REG-728) standard rows: 200 */}
              {RANGES.map((r) => <DropdownItem key={r.key} role="menuitemradio" checked={usage.range === r.key} onSelect={() => { setRangeOpen(false); go(() => router.replace(here(r.key), { scroll: false })) }}>{r.label}</DropdownItem>)}
            </PortalMenu>
            <span className={styles.caption} data-testid="usage-window">{dayMonth(usage.from)} – {dayMonth(usage.to - 1)}</span>
          </div>
          <Button variant="secondary" appearance="outlined" iconStart={<Icon name="download" size={20} weight={300} />} onPress={() => setExportOpen(true)} isDisabled={!usage.rows.length}>Export</Button>
        </div>

        {trusted ? (
          <div className={styles.tiles} data-testid="usage-tiles">
            <StatTile label="AI credits left" value={fmtCredits(s.balance ?? 0)} help={`Refreshes ${refreshLine(s.periodEnd, s.now)}${(s.balance ?? 0) > 0 ? ` · about ${fmtCredits(aboutRenders(s.balance ?? 0))} renders` : ''}`} testId="tile-left">
              <span className={styles.tileBar} role="img" aria-label={`This month’s ${fmtCredits(plan)}, top-ups ${fmtCredits(top)}`}><i className={styles.barPlan} style={{ width: `${(plan / whole) * 100}%` }} /><i className={styles.barTop} style={{ width: `${(top / whole) * 100}%` }} /></span>
            </StatTile>
            <StatTile label={`Used · ${rangeLabel.toLowerCase()}`} value={fmtCredits(used)} help={[workLine(works), s.viewer.canBuy && used > 0 ? `about ${sgd(Math.round((used / TOPUP_CREDITS) * TOPUP_PRICE))} at the top-up price` : null, usage.refunded > 0 ? `${fmtCredits(usage.refunded)} given back` : null].filter(Boolean).join(' · ')} testId="tile-used">
              {delta != null ? <span className={styles.tileNote}><MetaChip icon={delta > 0 ? 'arrow_upward' : 'arrow_downward'}>{`${Math.abs(delta)}% vs the month before`}</MetaChip></span> : null}
            </StatTile>
            <StatTile label="At this pace" value={!s.counting ? 'Not counted yet' : runOut ? `Runs out ~${dayMonth(runOut)}` : `Lasts past ${dayMonth(s.periodEnd)}`} grade={!s.counting ? undefined : runOut ? ((s.balance ?? 0) <= 0 ? 'bad' : 'warn') : 'good'}
                      help={!s.counting ? 'AI tools don’t use AI credits yet' : runOut ? `Before the refresh on ${dayMonth(s.periodEnd)} — top up or pick Fast` : `This month’s credits refresh on ${dayMonth(s.periodEnd)}`} testId="tile-pace">
              {buyHere ? (
                <span className={styles.tileActions} data-testid="pace-buy">
                  <Button onPress={() => openTopUp()}>{`Buy ${fmtCredits(TOPUP_CREDITS)} AI credits · ${sgd(TOPUP_PRICE)}`}</Button>
                  <Button variant="secondary" appearance="outlined" onPress={openPlans}>See plans</Button>
                </span>
              ) : null}
            </StatTile>
          </div>
        ) : (
          <>
            <div className={styles.tiles} data-testid="usage-tiles">
              <StatTile label={`You used · ${rangeLabel.toLowerCase()}`} value={fmtCredits(used)} help={workLine(works)} testId="tile-used" />
              <StatTile label="Your monthly amount" value={s.memberCap == null ? 'No limit' : fmtCredits(s.memberCap)} help={s.memberCap == null ? `${s.owner.name} hasn’t set one` : `${fmtCredits(s.memberCapRemaining ?? 0)} left this month`} testId="tile-amount" />
              <StatTile label="Refreshes" value={dayMonth(s.periodEnd)} help={refreshLine(s.periodEnd, s.now).split(' · ')[1]} testId="tile-refresh" />
            </div>
            <ReadOnlyNote text={`You see your own AI credits. ${s.owner.name} and the Admins see the studio’s.`} />
          </>
        )}

        {owner && asks.length ? (
          <section className={styles.asks} aria-label="Waiting for AI credits" data-testid="usage-asks">
            {asks.map((a) => {
              const cap = amounts[a.memberId] ?? null
              const raise = cap != null ? Math.ceil((cap + Math.max(a.needed, 200)) / 100) * 100 : null
              return (
                <div key={a.id} className={styles.ask} data-testid="usage-ask" data-ask-member={a.memberId}>
                  <Icon name="person" size={20} weight={300} />
                  <span className={styles.askText}>
                    <b>{a.name} asked for more AI credits</b>
                    <span>{a.kind === 'monthly' ? `Used their ${cap != null ? fmtCredits(cap) : 'monthly amount'} for this month` : 'The studio ran out'} · {ago(a.at, s.now)}</span>
                  </span>
                  <span className={styles.askActions}>
                    {a.kind === 'monthly' && raise != null ? <Button onPress={() => { void setAmount(a.memberId, raise) }}>{`Raise to ${fmtCredits(raise)}`}</Button> : null}
                    {a.kind === 'monthly' ? <Button variant="secondary" appearance="outlined" onPress={() => setCustom({ memberId: a.memberId, value: cap != null ? String(cap) : '', tried: false })}>Another amount</Button> : null}
                    {a.kind === 'pool' ? <Button onPress={() => openTopUp()}>{`Buy ${fmtCredits(TOPUP_CREDITS)} · ${sgd(TOPUP_PRICE)}`}</Button> : null}
                  </span>
                </div>
              )
            })}
          </section>
        ) : null}

        {trusted ? (
          <CreditsTable table="credits-members" title="By member" testId="usage-members" defs={MEMBER_DEFS} rows={usage.members} rowKey={(m) => m.id} cell={memberCell}
                        rowAttrs={(m) => ({ 'data-member': m.id, 'data-focus': focus === m.id ? '' : undefined })}
                        help={owner ? 'A monthly amount keeps one person from using the studio’s month. Every active member is listed.' : `${s.owner.name} sets each person’s monthly amount.`}
                        actions={owner ? (
                          /* (REG-729) the house compact select trigger, its toolbar size (36) */
                          <SelectTrigger className={styles.amount} data-none={defaultAmount == null || undefined} label={`New members: ${amountWords(defaultAmount)}`} value={<>New members: {amountWords(defaultAmount)}</>} open={menuTarget === 'default'}
                                         onClick={(e) => { menuRef.current = e.currentTarget; setMenu({ memberId: 'default', el: e.currentTarget }) }} data-testid="default-amount" />
                        ) : null}
                        empty="No members yet." />
        ) : null}

        <CreditsTable table="credits-tools" title="By tool" testId="usage-tools" defs={TOOL_DEFS} rows={usage.tools} rowKey={(t) => t.key} cell={toolCell}
                      help="Leads, quotes, contracts and projects never use AI credits."
                      /* (pending modules S19 — 1.0's 2026-10-01 empty month) a quiet month that follows a busy one says so, one press from it */
                      empty={usage.range === 'this' && (usage.previous ?? 0) > 0
                        ? <span data-testid="usage-empty-last">Nothing used this month yet — last month used {fmtCredits(usage.previous ?? 0)}. <Button appearance="text" onPress={() => go(() => router.replace(here('last'), { scroll: false }))}>See last month</Button></span>
                        : `Nothing used ${rangeLabel.toLowerCase() === 'this month' ? 'this month' : `in ${rangeLabel.toLowerCase()}`}.`} />

        {trusted ? (
          <CreditsTable table="credits-leads" title="By lead" testId="usage-leads" defs={LEAD_DEFS} rows={usage.leads} rowKey={(l) => l.id} cell={leadCell}
                        help={usage.leadsWithRenders ? `Won ${usage.wonWithRenders} of the ${plural(usage.leadsWithRenders, 'lead')} with renders` : 'What AI cost for each lead'}
                        empty="No AI work tied to a lead in this period." />
        ) : null}

        <CreditsTable table="credits-activity" title="Activity" testId="usage-activity" defs={trusted ? ACTIVITY_DEFS : ACTIVITY_DEFS.filter((d) => d.key !== 'balance')} rows={rows.slice(0, shown)} rowKey={(r) => r.id} cell={rowCell}
                      help={trusted ? 'Every charge, refund, top-up and refresh, newest first' : 'Your charges and refunds, newest first'}
                      actions={<ToolbarSearch query={query} onQuery={(q) => { setQuery(q); setShown(PAGE) }} placeholder="Search activity" label="Search activity" />}
                      empty="Nothing in this period."
                      /* (REG-729) a search that finds nothing: the house no-results state, as every searchable list */
                      noResults={query.trim() ? <TabSearchEmpty noun="activity" searching onClearAll={() => { setQuery(''); setShown(PAGE) }} /> : undefined} />
        {rows.length > shown ? <span className={styles.more}><Button appearance="text" onPress={() => setShown((n) => n + PAGE)}>{`Show ${Math.min(PAGE, rows.length - shown)} more`}</Button></span> : null}
      </div>

      {/* (REG-728) standard rows: 200 */}
      <PortalMenu open={!!menu} anchor={menuRef} onClose={() => setMenu(null)} align="left" width={MENU_WIDTH.standard} role="menu" sheetTitle={menuTarget === 'default' ? 'New members start with' : menuTarget ? `${nameOf(menuTarget)}’s monthly amount` : ''}>
        {menuTarget ? (
          <>
            <DropdownItem role="menuitemradio" checked={current(menuTarget) == null} onSelect={() => pick(menuTarget, null)}>No limit</DropdownItem>
            {PICKS.map((n) => <DropdownItem key={n} role="menuitemradio" checked={current(menuTarget) === n} onSelect={() => pick(menuTarget, n)}>{`${fmtCredits(n)} a month`}</DropdownItem>)}
            <DropdownDivider />
            <DropdownItem onSelect={() => { const v = current(menuTarget); setMenu(null); setCustom({ memberId: menuTarget, value: v != null ? String(v) : '', tried: false }) }}>Another amount…</DropdownItem>
          </>
        ) : null}
      </PortalMenu>

      <AmountDialog state={custom} name={custom ? (custom.memberId === 'default' ? null : nameOf(custom.memberId)) : null} onChange={setCustom}
                    onSave={(amount) => { const t = custom?.memberId; setCustom(null); if (t) pick(t, amount) }} />

      <ExportDialog open={exportOpen} now={s.now} title="Export AI credits" download={(format) => download(format)} onClose={() => setExportOpen(false)}
                    onDone={(name, format) => snackbar({ message: `Exported ${plural(rows.length, 'row')} as ${format} · ${name}` })} />
    </CompanyShell>
  )
}

const signed = (n: number) => (n > 0 ? `+${fmtCredits(n)}` : n < 0 ? `−${fmtCredits(-n)}` : '0')

/** "Another amount…" — a monthly amount the quick picks don't have (the house form dialog, a digits field). */
function AmountDialog({ state, name, onChange, onSave }: { state: { memberId: string; value: string; tried: boolean } | null; name: string | null; onChange: (s: { memberId: string; value: string; tried: boolean } | null) => void; onSave: (amount: number | null) => void }) {
  const n = state ? Number(state.value) : 0
  const bad = !!state && state.value.trim() !== '' && (!Number.isFinite(n) || n < 10 || n > 1_000_000)
  const save = () => { if (!state) return; if (bad) { onChange({ ...state, tried: true }); return } onSave(state.value.trim() === '' ? null : Math.round(n)) }
  return (
    <Dialog open={!!state} onClose={() => onChange(null)} title={name ? `${name}’s monthly amount` : 'New members start with'} size="form" width={400}
            footer={<><Button variant="secondary" appearance="outlined" onPress={() => onChange(null)}>Cancel</Button><Button onPress={save}>Save</Button></>}>
      <TextField label="AI credits a month" value={state?.value ?? ''} numeric="digits" inputMode="numeric" maxLength={7} onChange={(v) => { if (state) onChange({ ...state, value: v }) }}
                 onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); save() } }}
                 error={state?.tried && bad ? 'Enter at least 10 AI credits' : undefined}
                 helper={state && state.value.trim() !== '' && !bad ? `About ${fmtCredits(aboutRenders(n))} renders a month` : 'Leave it empty for no limit'} />
    </Dialog>
  )
}
