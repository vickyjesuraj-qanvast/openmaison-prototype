'use client'

import { useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Link, SegmentedButton, SegmentedButtonItem } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { MetaChip } from '@/components/om/meta-chip'
import { StatTile, StatTiles } from '@/components/om/stat-tile'
import { EmptyState } from '@/components/om/empty-state'
import { ScopePill } from '@/components/om/scope-pill'
import { PortalMenu } from '@/components/om/portal-menu'
import { DropdownItem, MENU_WIDTH } from '@/components/leads/dropdown'
import { CreditsTable } from '@/components/company/plan/credits-table'
import type { TableColumnDef } from '@/components/om/table-columns'
import { useFlagPref } from '@/lib/prefs'
import { withFrom } from '@/lib/nav'
import { dayMonth, dayOf, plural } from '@/lib/projects/schedule-model'
import type { CrewBoardData } from '@/lib/projects/contractors'
import {
  CREW_STATUS_LABEL, CREW_WINDOWS, LOOK_AHEAD_DAYS, boardOf, windowWordsOf, jobOf, sameTrade, shortVendor, siteRuns, startWords, tradesLine, tradesOfTitle, windowWords,
  type ContractorLine, type CrewJob, type Site, type Unstaffed,
} from '@/lib/projects/contractors-model'
import { useCrewActions } from './use-crew'
import wl from '@/components/projects/workload/workload.module.css'
import styles from './contractors.module.css'
import { BY_SITE_KEY } from './keys'

type Focus = 'free' | 'soon' | 'over' | 'gaps'
const JOB_TONE = { planned: 'default', on_site: 'blue', done: 'green' } as const

/**
 * (S45B · H-UHD-2 — 1.0's `/contractors` Contractor Dashboard, in 2.0's shape: no new page, no rail item — the Projects listing's Workload view,
 * Members · Contractors) Who is free to send where, over the next seven days: four tiles that narrow the list when pressed (Free this week ·
 * Free within 7 days · Over capacity · No contractor yet — 1.0's KPIs), the work starting with nobody on it (each with its one filled button,
 * Add a contractor), then By contractor — each contractor's sites as blocks against how many they run at once, free first (1.0's pivot that
 * exposes idle; "Put on a site" from a free row) — or By site, the studio's tracking sheet as the house table: each running project, a column
 * per trade, who is on it. The listing's search narrows both (a contractor, a trade, a code, a project); By site shows the projects the list
 * shows. A contractor opens in Finance › Vendors, a site on its Schedule. INVENTED COPY (REG-S45B).
 */
export function ContractorsView({ board, shown, query, here }: { board: CrewBoardData; /** the listing's rows (scope, Filters, search) */ shown: ReadonlySet<string>; query: string; here: string }) {
  const router = useRouter()
  const today = dayOf(new Date(board.now))
  /* (1.0's Window chips) how far the board looks for who is busy — the gaps and "free within 7 days" keep 1.0's seven */
  const [days, setDays] = useState<number>(LOOK_AHEAD_DAYS)
  const [windowOpen, setWindowOpen] = useState(false)
  const windowRef = useRef<HTMLButtonElement>(null)
  const ww = windowWordsOf(days)
  const b = useMemo(() => boardOf(board.contractors, board.crew, board.sites, board.trades, today, days), [board, today, days])
  const [bySite, setBySite] = useFlagPref(BY_SITE_KEY, false)
  const [focus, setFocus] = useState<Focus | null>(null)
  const actions = useCrewActions(board)
  const q = query.trim().toLowerCase()
  const places = board.sites.some((s) => s.mayAssign && siteRuns(s))
  const openSite = (s: Site | null) => { if (s?.visible) router.push(withFrom(`/projects/${s.id}/schedule?crew=1`, here)) }
  const openVendor = (id: string) => router.push(withFrom(`/company/finance/vendors?open=${encodeURIComponent(id)}`, here))

  if (!b.lines.length) {
    return (
      <div className={wl.view} data-testid="contractors-view">
        <EmptyState icon="handyman" title="No contractors yet" testId="contractors-empty" kb={false}
                    help="Mark the vendors who work on site in Company › Finance › Vendors — their trades and how many sites they run at once. Then put them on your projects’ milestones, and this view shows who is free to send where."
                    primary={{ label: 'Open Vendors', icon: 'open_in_new', onPress: () => router.push(withFrom('/company/finance/vendors', here)) }} />
      </div>
    )
  }

  const matches = (l: ContractorLine) => !q || [l.contractor.name, l.contractor.code ?? '', ...l.contractor.trades, ...l.jobs.map((j) => (j.site?.visible ? j.site.name : ''))].some((t) => t.toLowerCase().includes(q))
  const lines = b.lines.filter(matches).filter((l) => (focus === 'free' ? l.state === 'free' : focus === 'soon' ? l.state !== 'free' && l.freeFrom !== null && l.freeFrom <= today + 7 : focus === 'over' ? l.state === 'over' : true))
  const gaps = b.unstaffed.filter((g) => g.site.visible && (!q || [g.site.name, g.trade, g.milestone.title].some((t) => t.toLowerCase().includes(q))))
  const tile = (key: Focus, label: string, value: number, help: string, grade?: 'bad' | 'warn') => (
    <button key={key} type="button" className={styles.tileBtn} aria-pressed={focus === key} onClick={() => setFocus(focus === key ? null : key)} data-testid={`crew-tile-${key}`}>
      <StatTile label={label} value={value} help={help} grade={value > 0 ? grade : undefined} />
    </button>
  )

  return (
    <div className={wl.view} data-testid="contractors-view">
      <div className={wl.caption} data-testid="contractors-caption">   {/* a div, not the Members view's <p>: the By chips are a radiogroup (a <div>), never inside a paragraph */}
        {/* (the calm UI build 2026-10-27, 3-15 · W-469) how many — the window pill beside it says over when */}
        <span>{plural(b.lines.length, 'contractor')}</span>
        <span className={wl.captionActions}>
          <ScopePill ref={windowRef} label={`Window: ${CREW_WINDOWS.find((w) => w.days === days)?.label ?? 'This week'}`} short={CREW_WINDOWS.find((w) => w.days === days)?.label} open={windowOpen} scoped={days !== LOOK_AHEAD_DAYS} onClick={() => setWindowOpen((o) => !o)} />
          <PortalMenu open={windowOpen} anchor={windowRef} onClose={() => setWindowOpen(false)} align="right" width={MENU_WIDTH.standard} role="menu" sheetTitle="Window">
            {CREW_WINDOWS.map((w) => <DropdownItem key={w.days} role="menuitemradio" checked={days === w.days} onSelect={() => { setDays(w.days); setWindowOpen(false) }}>{w.label}</DropdownItem>)}
          </PortalMenu>
          {/* (the calm UI build 2026-10-27, 3-08 · T-10) a view switch, not chips */}
          <SegmentedButton aria-label="Show contractors" selectedKeys={[bySite ? 'site' : 'contractor']} data-testid="contractors-by"
                           onSelectionChange={(keys) => { const v = String([...keys][0] ?? ''); if (v) setBySite(v === 'site') }}>
            <SegmentedButtonItem id="contractor">By contractor</SegmentedButtonItem>
            <SegmentedButtonItem id="site">By site</SegmentedButtonItem>
          </SegmentedButton>
          <Button variant="primary" appearance="text" iconStart={<Icon name="storefront" size={20} />} onPress={() => router.push(withFrom('/company/finance/vendors?show=contractors', here))} data-testid="contractors-vendors">Vendors</Button>
        </span>
      </div>
      <StatTiles testId="contractor-tiles">
        {tile('free', `Free ${ww}`, b.kpis.freeNow, `Nothing booked ${ww}`)}
        {tile('soon', 'Free within 7 days', b.kpis.freeSoon, 'Their sites end this week')}
        {tile('over', 'Over capacity', b.kpis.over, 'More sites than they run at once', 'bad')}
        {tile('gaps', 'No contractor yet', gaps.length, 'Work starting with nobody on it', 'warn')}
      </StatTiles>
      {gaps.length && (focus === null || focus === 'gaps') ? <GapCard gaps={gaps} today={today} onAssign={(g) => actions.assign({ projectId: g.site.id, milestoneId: g.milestone.id, trade: g.trade })} onOpen={(g) => openSite(g.site)} /> : null}
      {focus === 'gaps' ? (gaps.length ? null : <div className={wl.card}><div className={wl.empty}>Every piece of work starting this week has its contractor.</div></div>)
        : bySite ? <SiteTable board={board} trades={b.trades} gaps={b.unstaffed} shown={shown} q={q} today={today} onOpen={openSite} onAssign={(s, trade, milestoneId) => actions.assign({ projectId: s.id, trade, milestoneId })} />
        : (
          <div className={wl.card} role="list" aria-label="Contractors" data-testid="contractor-lines">
            {lines.length === 0 ? <div className={wl.empty}>{q ? 'No contractor matches.' : 'No contractor is in this state now.'}</div> : null}
            {lines.map((l) => <Line key={l.contractor.id} line={l} places={places} needed={gaps.some((g) => l.contractor.trades.some((t) => sameTrade(t, g.trade)))}
                                    onAssign={() => actions.assign({ vendorId: l.contractor.id })} onOpen={(j) => openSite(j.site)} onVendor={() => openVendor(l.contractor.id)} />)}
          </div>
        )}
      {actions.dialog}
    </div>
  )
}

function GapCard({ gaps, today, onAssign, onOpen }: { gaps: Unstaffed[]; today: number; onAssign: (g: Unstaffed) => void; onOpen: (g: Unstaffed) => void }) {
  return (
    <section className={styles.gapCard} aria-label="Starting with no contractor" data-testid="contractor-gaps">
      <div className={styles.gapHead}><h3 className={styles.gapTitle}>Starting with no contractor</h3><span className={styles.gapHelp}>{plural(gaps.length, 'piece', 'pieces')} of work this week — the trades your contractors do</span></div>
      {gaps.map((g) => (
        <div key={g.key} className={styles.gapRow} data-testid="contractor-gap" data-trade={g.trade}>
          <span className={wl.nobody}><Icon name="person_add" size={20} /></span>
          <span className={styles.gapText}>
            <span className={styles.gapName}>{g.milestone.title}</span>
            <span className={styles.gapLine}>{[sameTrade(g.trade, g.milestone.title) ? null : g.trade, g.site.name, startWords(g, today)].filter(Boolean).join(' · ')}</span>
          </span>
          {/* (the calm UI build 2026-10-27, 3-15 · T-03) outlined — the page's one filled button is the header's */}
          {g.site.mayAssign ? <Button size="sm" variant="primary" appearance="outlined" onPress={() => onAssign(g)} data-testid="contractor-gap-add">Add a contractor</Button>
            : <Button size="sm" variant="secondary" appearance="outlined" onPress={() => onOpen(g)}>Open</Button>}
        </div>
      ))}
    </section>
  )
}

function Line({ line: l, places, needed, onAssign, onOpen, onVendor }: { line: ContractorLine; places: boolean
  /** (the calm UI build 2026-10-27, 3-15) work of its trade starts with nobody on it — its row shows the verb; every other row keeps it in its ⋮ */
  needed: boolean
  onAssign: () => void; onOpen: (j: CrewJob) => void; onVendor: () => void }) {
  const [menu, setMenu] = useState(false)
  const menuRef = useRef<HTMLSpanElement>(null)
  const free = l.state === 'free' || l.state === 'room'
  const cap = Math.max(1, l.contractor.capacity)
  const slots = Math.max(cap, l.jobs.length)
  return (
    <div className={wl.row} role="listitem" data-testid="contractor-row" data-contractor={l.contractor.id} data-state={l.state}>
      <span className={wl.who}>
        <span className={wl.nobody}><Icon name="handyman" size={20} /></span>
        <span className={wl.whoText}>
          <Tooltip label={`Open ${l.contractor.name} in Finance › Vendors`}><button type="button" className={styles.whoName} onClick={onVendor} data-testid="contractor-open">{shortVendor(l.contractor.name)}</button></Tooltip>
          {/* (the calm UI build 2026-10-27, 3-15 · W-521) the trades alone — the two-letter code stays on the vendor's record (and search still finds it) */}
          <span className={wl.role}>{tradesLine(l.contractor)}</span>
        </span>
      </span>
      <span className={wl.bar} style={{ '--slots': slots } as CSSProperties} aria-label={`${l.contractor.name}: ${l.peak} of ${cap}`}>
        {Array.from({ length: slots }, (_, i) => {
          const j = l.jobs[i]
          if (!j) return <span key={`free-${i}`} className={wl.slot} aria-hidden />
          const over = l.state === 'over' && i >= cap
          const why = [j.trade, j.milestone?.title ?? null, windowWords(j), j.late ? 'running late' : CREW_STATUS_LABEL[j.state].toLowerCase(), over ? 'past capacity' : null].filter(Boolean).join(' · ')
          const name = j.site?.visible ? j.site.name : 'Another project'
          return (
            <Tooltip key={j.id} label={`${name} · ${why}`}>
              <button type="button" className={wl.block} data-over={over ? '' : undefined} onClick={() => onOpen(j)} aria-label={`${name} · ${why}`} disabled={!j.site?.visible} data-testid="contractor-block">
                {j.late ? <span className={wl.dot} aria-hidden /> : null}
                <span className={wl.blockName}>{j.site?.visible ? j.site.client : 'Another project'}</span>
              </button>
            </Tooltip>
          )
        })}
      </span>
      <span className={wl.state}>
        {/* (the calm UI build 2026-10-27, 3-15 · T-06) the load as words in its tone, not a capitals tag */}
        <span className={styles.stateTop}>
          <span className={wl.loadWord} data-tone={l.state} data-testid="contractor-load">{l.words}</span>
          <span ref={menuRef} className={styles.rowMenu}>
            <Tooltip label="More for this contractor" disabled={menu}><IconButton icon="more_vert" label={`More for ${l.contractor.name}`} variant="bare" aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu((o) => !o)} data-testid="contractor-menu" /></Tooltip>
          </span>
        </span>
        <span className={wl.count}>{l.detail}</span>
        {/* (the calm UI build 2026-10-27, 3-15 · T-02 · W-594) "Assign to a project" (was Put on a site): the verb shows on the row whose trade has work
            starting with nobody on it; on every other free row it is in the row's ⋮, with Open in Vendors */}
        {places && free && needed ? <span className={styles.assign}><Link variant="primary" onPress={onAssign} data-testid="contractor-assign">Assign to a project</Link></span> : null}
      </span>
      <PortalMenu open={menu} anchor={menuRef} onClose={() => setMenu(false)} align="right" width={MENU_WIDTH.wide} role="menu" sheetTitle={shortVendor(l.contractor.name)}>
        {places && free && !needed ? <span className={styles.menuRow} data-testid="contractor-assign"><DropdownItem onSelect={() => { setMenu(false); onAssign() }} help="Put them on a milestone or their own dates">Assign to a project</DropdownItem></span> : null}
        <DropdownItem onSelect={() => { setMenu(false); onVendor() }}>Open in Finance › Vendors</DropdownItem>
      </PortalMenu>
    </div>
  )
}

/** By site — the studio's tracking sheet as the house table: a running project a row, a trade a column, who is on it (1.0's By site). */
function SiteTable({ board, trades, gaps, shown, q, today, onOpen, onAssign }: {
  board: CrewBoardData; trades: string[]; gaps: Unstaffed[]; shown: ReadonlySet<string>; q: string; today: number
  onOpen: (s: Site) => void; onAssign: (s: Site, trade: string, milestoneId: string | null) => void
}) {
  const sitesById = new Map(board.sites.map((s) => [s.id, s]))
  const jobs = board.crew.map((r) => jobOf(r, sitesById, today))
  const rows = board.sites.filter((s) => s.visible && siteRuns(s) && shown.has(s.id))
    .filter((s) => !q || [s.name, s.number].some((t) => t.toLowerCase().includes(q)) || jobs.some((j) => j.projectId === s.id && [j.vendorName, j.trade].some((t) => t.toLowerCase().includes(q))))
  const defs: TableColumnDef[] = [
    { key: 'project', label: 'Project', track: 'minmax(240px, 240fr)', locked: true },
    { key: 'next', label: 'Next on site', track: 'minmax(180px, 180fr)' },
    ...trades.map((t) => ({ key: `t:${t.toLowerCase()}`, label: t, track: 'minmax(170px, 170fr)' })),
  ]
  const nextOf = (s: Site) => {
    const m = s.milestones.filter((x) => x.status !== 'done' && x.start >= today && (tradesOfTitle(x.title, trades).length || jobs.some((j) => j.milestoneId === x.id))).sort((a, c) => a.start - c.start)[0]
    return m ? `${m.title} · ${dayMonth(m.start)}` : null
  }
  const cell = (s: Site, key: string): ReactNode => {
    if (key === 'project') return <span className={styles.stack}><button type="button" className={styles.siteName} onClick={() => onOpen(s)} data-testid="site-open">{s.name}</button><span className={styles.siteSub}>{[s.number, s.onHold ? 'On hold' : null].filter(Boolean).join(' · ')}</span></span>
    if (key === 'next') { const n = nextOf(s); return n ? <span className={styles.siteSub}>{n}</span> : <span className={styles.cellNone}>--</span> }
    const trade = trades.find((t) => `t:${t.toLowerCase()}` === key)
    if (!trade) return null
    const on = jobs.filter((j) => j.projectId === s.id && sameTrade(j.trade, trade))
    const gap = gaps.find((g) => g.site.id === s.id && sameTrade(g.trade, trade))
    return (
      <span className={styles.stack} data-testid="site-cell">
        {on.length ? <span className={styles.cellChips}>{on.map((j) => <MetaChip key={j.id} color={JOB_TONE[j.state]}>{shortVendor(j.vendorName)}</MetaChip>)}</span> : null}
        {gap ? <span className={styles.cellGap} data-testid="site-gap"><span>{`Nobody yet · ${startWords(gap, today)}`}</span>{s.mayAssign ? <span><Link variant="primary" onPress={() => onAssign(s, trade, gap.milestone.id)}>Add one</Link></span> : null}</span> : null}
        {!on.length && !gap ? <span className={styles.cellNone}>--</span> : null}
      </span>
    )
  }
  return <CreditsTable table="contractors-by-site" title="By site" testId="contractors-sites" defs={defs} rows={rows} rowKey={(s) => s.id} cell={cell}
                       help="Each running project the list shows, a column per trade — who is on it, and the work starting this week with nobody"
                       empty={q ? 'No project matches.' : 'No running project to show.'} />
}
