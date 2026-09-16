'use client'

import { useMemo, useState, type MouseEvent } from 'react'
import { useRouter } from 'next/navigation'
import pageStyles from '@/app/leads/leads.module.css'
import { Button } from '@/components/ds'
import { AiSheet } from '@/components/leads/ai-sheet'
import { Dropdown } from '@/components/leads/dropdown'
import menuStyles from '@/components/leads/menus.module.css'
import { TabSearchEmpty } from '@/components/leads/tasks/tab-search-empty'
import { Icon } from '@/components/om/icon'
import { AppliedDot } from '@/components/om/applied-dot'
import { IconButton } from '@/components/om/icon-button'
import { useComingSoon, useSnackbar } from '@/components/om/snackbar'
import { Tabs } from '@/components/om/tabs'
import { Tooltip } from '@/components/om/tooltip'
import { ToolbarSearch } from '@/components/om/toolbar-search'
import { MaisonFab } from '@/components/shell/maison-fab'
import { PageHeader } from '@/components/shell/page-header'
import { PageReveal } from '@/components/shell/page-reveal'
import { QanvastSkeleton } from '@/components/shell/skeleton'
import { displayDate, money, phoneDisplay } from '@/lib/format'
import { INACTIVE_STAGES, STAGES } from '@/lib/leads/enums'
import type { QanvastLeadsData } from '@/lib/leads/qanvast'
import { RETURN_FILTERS } from '@/lib/leads/return-tags'
import { filterByQuery } from '@/lib/search'
import { MOBILE, useMediaQuery } from '@/lib/breakpoint'
import { ColumnSettingsDrawer } from '@/components/om/column-settings'
import { useTableColumns } from '@/components/om/table-columns'
import { QANVAST_COLUMN_DEFS, QanvastTable } from './qanvast-table'
import styles from './qanvast-leads.module.css'

/**
 * Qanvast Ops › Leads (208 931:49232 · 209 931:49435 · 174 931:49680) — spec design-source/context/lead-return/
 * 02-qanvast-ops.txt, build plan 00-build-plan.md. The page frame (PageReveal + QanvastSkeleton, PageHeader with
 * Insights · Add Lead · kebab, MaisonFab + AiSheet) is copied from app/leads/workspace.tsx; the tabs are the Lead Details
 * Tabs (components/om/tabs.tsx). Only Leads is live: Insights, Add Lead, the kebab, Request Leads, filter, the
 * other tabs and the head's sort / customise controls answer coming soon — search is real (REG-275).
 */
const TABS_HREF = '/qanvast-ops'
/* Leads · Credits · Reviews · Hangouts (spec 02). Tabs only takes hrefs, so the inert tabs carry a ?tab= href and the
   wrapper below intercepts their click (coming soon) — the Leads tab is the only real destination. */
const TAB_ITEMS = [
  { label: 'Leads', href: TABS_HREF },
  { label: 'Credits', href: `${TABS_HREF}?tab=credits` },
  { label: 'Reviews', href: `${TABS_HREF}?tab=reviews` },
  { label: 'Hangouts', href: `${TABS_HREF}?tab=hangouts` },
]

/* Maison AI suggestions: the listing's generic prompts (app/leads/workspace.tsx) — no Qanvast-specific copy exists in a mock. */
const AI_SUGGESTIONS = ['Draft an intro WhatsApp', 'Summarise this week’s new leads', 'Which leads need follow-up today?']

export function QanvastLeads({ data }: { data: QanvastLeadsData }) {
  const { rows, counts } = data
  const router = useRouter()
  const comingSoon = useComingSoon()
  const snackbar = useSnackbar()
  const mobile = useMediaQuery(MOBILE)   // (REG-361) the listing's mobile header set
  /* Column settings (REG-454): order · visibility · up to three pinned, kept per browser; the phone cards ignore them. */
  const [columnsOpen, setColumnsOpen] = useState(false)
  const columnPrefs = useTableColumns('qanvast-leads', QANVAST_COLUMN_DEFS, mobile)

  /* ── status scope: null = All Leads · a stage name · a return label (RETURN_FILTERS) ── */
  const [scope, setScope] = useState<string | null>(null)
  const [scopeOpen, setScopeOpen] = useState(false)
  const scoped = useMemo(() => {
    if (scope === null) return rows
    if ((RETURN_FILTERS as readonly string[]).includes(scope)) return rows.filter((r) => r.tags.some((t) => t.label === scope))
    return rows.filter((r) => r.ret === null && r.stage === scope)
  }, [rows, scope])

  /* Search (REG-275, REG-274's rule): the last step of the pipeline, matching everything a ROW SHOWS — the name,
     the credits, the budget cell's own "70,500", the property type, the DISPLAYED created date ("17 Jul ’26", via
     the table's own displayDate — never the raw timestamp) and every status tag label, so a returned row is found
     by "Return Processing" as well as by "Approved". The phone under the name goes through the matcher's `phones`
     argument, which compares digits-only at any length: "98", "9812 0443" and "+65 9812 0443" all find the stored
     "98120443" (the owner's original complaint). Source is deliberately NOT matched: every row here is Qanvast and
     the column does not exist on this table — matching invisible data reads as a bug. */
  const [query, setQuery] = useState('')
  // The rail search tile and the "/" key focus the page's search input (page checklist). The DS SearchBar owns its
  const visible = useMemo(() => filterByQuery(scoped, query, (r) => ({
    fields: [r.name, String(r.credits), money(r.budgetMinor), r.propertyType, displayDate(r.createdAt), ...r.tags.map((t) => t.label)],
    phones: [r.phone],
  })), [scoped, query])
  const clearAll = () => { setQuery(''); setScope(null) }
  // "No results found" only when the reader narrowed something — an empty Qanvast table keeps its bare head.
  const nothingMatches = rows.length > 0 && visible.length === 0 && (query.trim() !== '' || scope !== null)

  const [aiOpen, setAiOpen] = useState(false)

  /* Inert tabs: intercept the Link click before Next follows it (Link honours defaultPrevented) and answer coming soon. */
  const onTabsClick = (e: MouseEvent<HTMLDivElement>) => {
    const tab = (e.target as Element).closest<HTMLAnchorElement>('a[role="tab"]')
    if (!tab || tab.getAttribute('href') === TABS_HREF) return
    e.preventDefault()
    comingSoon()
  }

  const item = (label: string, value: string | null) => {
    const selected = scope === value
    return (
      <button key={label} type="button" role="menuitemradio" aria-checked={selected}
              className={menuStyles.item} data-selected={selected || undefined}
              onClick={() => { setScope(value); setScopeOpen(false) }}>
        <span>{label}</span>
        {/* 12/Regular secondary count, right-aligned; 0 when the loader counted none. */}
        <span className={menuStyles.count}>{counts[label] ?? 0}</span>
      </button>
    )
  }
  const groupTitle = (label: string, tone: 'green' | 'yellow' | 'blue') => (
    <div className={styles.groupTitle} data-tone={tone}><span className={styles.dot} data-tone={tone} />{label}</div>
  )

  return (
    <PageReveal skeleton={<QanvastSkeleton />}>
      <div className={pageStyles.body} style={{ position: 'relative' }}>
        {/* Page Header / Leads 1200×68 (spec 02): "Qanvast Ops" · Insights 110×36 · Add Lead 121×36 · kebab 36 — all coming soon. */}
        <PageHeader
          title="Qanvast Ops"
          scrollShadow={false}   /* the sticky tab strip below carries the block's level-1 (REG-369) */
          actions={mobile ? (
            /* (REG-361, user 2026-09-06: "Qanvast Ops should match the leads listing page header") The listing's
               mobile header (REG-299, 1082:25131): Add Lead as the filled square, Insights and the kebab as
               outlined squares, all three on the title's row — the same actions, icon-only. */
            <>
              <Tooltip label="Add Lead">
                <IconButton icon="add" label="Add Lead" variant="filled" onClick={comingSoon} />
              </Tooltip>
              <Tooltip label="Insights">
                <IconButton icon="bar_chart_4_bars" label="Insights" onClick={comingSoon} />
              </Tooltip>
              <Tooltip label="More options">
                <IconButton icon="more_vert" label="More options" onClick={comingSoon} />
              </Tooltip>
            </>
          ) : (
            /* (REG-361) Add Lead first, then Insights — the listing's own order (REG-305). */
            <>
              <Button iconStart={<Icon name="add" size={20} />} onPress={comingSoon}>
                Add Lead
              </Button>
              <Button variant="secondary" appearance="outlined" iconStart={<Icon name="bar_chart_4_bars" size={20} />} onPress={comingSoon}>
                Insights
              </Button>
              <Tooltip label="More options">
                <IconButton icon="more_vert" label="More options" onClick={comingSoon} />
              </Tooltip>
            </>
          )}
        />
        {/* Page Tabs: Leads (selected) · Credits · Reviews · Hangouts. */}
        {/* (REG-368) `display: contents` — the wrapper only exists to intercept the inert tabs' clicks, and as a real
            box it was exactly the strip's height, so the sticky strip had nowhere to travel and scrolled away with it. */}
        <div className={styles.tabsHost} onClickCapture={onTabsClick}>
          <Tabs items={TAB_ITEMS} activeHref={TABS_HREF} aria-label="Qanvast Ops sections" className={styles.stickyTabs} />
        </div>

        <div className={pageStyles.content}>
          {/* Toolbar (y 144): "All Leads (99)" ▾ pill 151×36 … Request Leads 133×36 · search 280×36 (REG-275) · filter 36.
              The pill's count follows the pipeline, so it reads what the table shows while a search is on (the listing's rule). */}
          <div className={styles.bar}>
            <div className={styles.left}>
              <button type="button" className={styles.chip} onClick={() => setScopeOpen((o) => !o)}
                      aria-haspopup="menu" aria-expanded={scopeOpen} data-open={scopeOpen || undefined}>
                {`${scope ?? 'All Leads'} (${visible.length})`}
                <span className={styles.chipChevron}><Icon name="keyboard_arrow_down" size={20} /></span>
                {scope !== null ? <AppliedDot /> : null}   {/* (REG-295) */}
              </button>
              {/* Dropdown Menu / Leads "Lead Status" 200 wide (931:49435): All Leads · ACTIVE stages · INACTIVE stages · Lead Return states. */}
              <Dropdown open={scopeOpen} onClose={() => setScopeOpen(false)} align="left" width={200} sheetTitle="Lead Status">
                {item('All Leads', null)}
                <div className={styles.rule} role="separator" />
                {groupTitle('ACTIVE', 'green')}
                {STAGES.map((s) => item(s, s))}
                <div className={styles.rule} role="separator" />
                {groupTitle('INACTIVE', 'yellow')}
                {INACTIVE_STAGES.map((s) => item(s, s))}
                <div className={styles.rule} role="separator" />
                {groupTitle('Lead Return', 'blue')}
                {RETURN_FILTERS.map((s) => item(s, s))}
              </Dropdown>
            </div>
            {/* Right group (931:49232 / 931:49435 render): Request Leads · search · filter 36 — no kebab (spec 02's "filter · kebab" was a
                mis-transcription; audit 2026-08-30). Filter still answers coming soon (REG-193); the mock's inert 36px search ICON is
                now the DS Search Bar 280 every other list toolbar uses, wired live (REG-275, owner-directed — the mock draws the icon).
                The wrapper is a <label> so the 2px band it grows on a touch pointer still focuses the field (REG-273). */}
            <div className={styles.right}>
              <Button variant="secondary" appearance="outlined" onPress={comingSoon}>Request Leads</Button>
              <ToolbarSearch query={query} onQuery={setQuery} placeholder="Search" label="Search leads" />
              <Tooltip label="Filters">
                <IconButton icon="filter_list" label="Filters" onClick={comingSoon} />
              </Tooltip>
              {mobile ? null : (
                <Tooltip label="Column settings">
                  <IconButton icon="tune" label="Column settings" onClick={() => setColumnsOpen(true)} />
                </Tooltip>
              )}
            </div>
          </div>

          {nothingMatches ? (
            <TabSearchEmpty noun="leads" searching={query.trim() !== ''} onClearAll={clearAll} />
          ) : (
            <QanvastTable columns={columnPrefs.columns} onReorder={columnPrefs.reorder} rows={visible} onView={(id) => router.push(`/leads/${id}?from=qanvast`)}
                          onCopyPhone={async (row) => {
                            // (REG-351) The listing's own handler: one copy format (phoneDisplay), one confirmation.
                            try { await navigator.clipboard.writeText(phoneDisplay(row.phone)); snackbar({ message: 'Copied to clipboard' }) }
                            catch { snackbar({ message: phoneDisplay(row.phone) }) }
                          }} />
          )}
        </div>
      </div>

      <ColumnSettingsDrawer open={columnsOpen} onClose={() => setColumnsOpen(false)} pinning={{ max: 3 }} columns={columnPrefs.all} onSave={columnPrefs.save} onReset={columnPrefs.reset} />

      <AiSheet open={aiOpen} suggestions={AI_SUGGESTIONS} onSelect={() => { setAiOpen(false); comingSoon() }} onClose={() => setAiOpen(false)} />
      <MaisonFab onPress={() => setAiOpen((o) => !o)} />
    </PageReveal>
  )
}
