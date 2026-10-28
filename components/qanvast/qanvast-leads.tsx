'use client'

import { useCallback, useMemo, useState, type MouseEvent } from 'react'
import { useRouter } from 'next/navigation'
import pageStyles from '@/app/leads/leads.module.css'
import { useMaisonAi } from '@/lib/maison-ai'
import { useShortcut } from '@/lib/keys/store'
import { useListingMaison } from '@/components/leads/use-listing-maison'
import { copyText } from '@/lib/clipboard'
import { Dropdown, DropdownDivider, DropdownItem, DropdownLabel, MENU_WIDTH } from '@/components/leads/dropdown'
import { ExportDialog } from '@/components/leads/export-dialog'
import { buildTable, downloadBlob, exportFileName, type ExportFormat } from '@/lib/leads/export'
import { TabSearchEmpty } from '@/components/leads/tasks/tab-search-empty'
import { IconButton } from '@/components/om/icon-button'
import { ScopePill } from '@/components/om/scope-pill'
import { useComingSoon, useSnackbar } from '@/components/om/snackbar'
import { Tabs } from '@/components/om/tabs'
import { Tooltip } from '@/components/om/tooltip'
import { ToolbarSearch } from '@/components/om/toolbar-search'
import { PageHeader } from '@/components/shell/page-header'
import { PageReveal } from '@/components/shell/page-reveal'
import { QanvastSkeleton } from '@/components/shell/skeleton'
import { displayDate, displayDateTimeTight, money, phoneDisplay } from '@/lib/format'
import { INACTIVE_STAGES, STAGES } from '@/lib/leads/enums'
import type { QanvastLeadsData } from '@/lib/leads/qanvast'
import { RETURN_FILTERS } from '@/lib/leads/return-tags'
import { filterByQuery } from '@/lib/search'
import { MOBILE, useMediaQuery } from '@/lib/breakpoint'
import { ColumnSettingsDrawer } from '@/components/om/column-settings'
import { useTableColumns } from '@/components/om/table-columns'
import { LeadFormModal, type LeadFormData, type LeadFormOpen } from '@/components/leads/lead-form'
import { FiltersModal } from '@/components/leads/filters-modal'
import { EMPTY_FILTERS, activeFilterCount, applyFilters, type LeadFilters } from '@/lib/leads/filters'
import { createLead } from '@/app/leads/actions'
import { uploadPicked } from '@/components/leads/files/upload-picture'
import { couldnt } from '@/components/leads/tasks/use-run'
import { assignableIds, assignHint, runsStudio, type Viewer } from '@/lib/leads/assign-policy'
import type { CustomFieldDef } from '@/lib/leads/custom-fields-model'
import type { LeadRow } from '@/lib/leads/queries'
import type { Member } from '@/lib/db/schema'
import { withFrom } from '@/lib/nav'
import toolbar from '@/components/om/tab-toolbar.module.css'
import { QANVAST_COLUMN_DEFS, QanvastTable } from './qanvast-table'
import styles from './qanvast-leads.module.css'
import { QANVAST_LEADS_HREF, QANVAST_TAB_ITEMS, onQanvastTabsClick } from './qanvast-tabs'

/**
 * Qanvast Ops › Leads (208 931:49232 · 209 931:49435 · 174 931:49680) — spec design-source/context/lead-return/
 * 02-qanvast-ops.txt, build plan 00-build-plan.md. The page frame (PageReveal + QanvastSkeleton, PageHeader with
 * Insights · Add Lead · kebab, MaisonFab + AiSheet) is copied from app/leads/workspace.tsx; the tabs are the Lead Details
 * Tabs (components/om/tabs.tsx). (pending modules S41b-5) Every tab is live now; Request Leads and the head's sort / customise controls
 * answer coming soon — search is real (REG-275). (one-home N-05) Add Lead, Insights and Filters are the house's own now: the
 * listing's lead form with the source set to Qanvast, Company › Reports › Leads (Owners and Admins, as the listing's Insights), and
 * the listing's Filters over these rows.
 * (the calm UI build 2026-10-27, 2-27 · 1-30 · 2-09 — the L1 header's one anatomy) Adding a lead and the reports belong to Leads: the header holds
 * the title and ⋮ — New Qanvast lead (C, the same form with the source set) · Request leads (coming soon) · Reports (Owners and Admins) · Export
 * all… — and the toolbar keeps the scope, search, Filters and Column settings.
 */
const TABS_HREF = QANVAST_LEADS_HREF
/** (one-home N-05) Add Lead's new lead starts as a Qanvast one — the form's own prefill (UX audit L11), the source field set. */
const QANVAST_PREFILL: Partial<LeadFormData> = { source: 'Qanvast' }
/* Leads · Studios · Lead credits · Reviews · Hangouts (spec 02; (parity map, CP-148) Studios the second live tab) — one list for both pages,
   components/qanvast/qanvast-tabs.ts; the inert tabs answer coming soon there. */
const TAB_ITEMS = QANVAST_TAB_ITEMS

/* Maison AI suggestions: the listing's generic prompts (app/leads/workspace.tsx) — no Qanvast-specific copy exists in a mock. */

export function QanvastLeads({ data, leadRows, team, viewer, liveSources, customFields }: {
  data: QanvastLeadsData
  /** (one-home N-05) These leads as the listing's rows — what the house Filters read (members, tasks, seen) — and the lead form's inputs. */
  leadRows: LeadRow[]; team: Member[]; viewer: Viewer; liveSources: string[]; customFields: CustomFieldDef[]
}) {
  const { rows, counts } = data
  const router = useRouter()
  const comingSoon = useComingSoon()
  /* (one-home N-05) Insights is Owners' and Admins' (REG-611), a door into Company › Reports › Leads with the way back (REG-1361). */
  const canInsights = runsStudio(viewer.role)
  const openInsights = () => router.push(withFrom('/company/reports/leads', TABS_HREF))
  /* (one-home N-05) Add Lead: the listing's lead form, its rules the listing's — who this viewer may assign, a Designer's lead their own. */
  const [leadForm, setLeadForm] = useState<LeadFormOpen | null>(null)
  const assignHintText = assignHint(viewer)
  const assignable = assignableIds(viewer, team)
  const openCreate = useCallback(() => setLeadForm({ mode: 'create', prefill: QANVAST_PREFILL }), [])
  /* (the calm UI build 2026-10-27, 2-27) C keeps opening the Qanvast lead form here, now that its button is a row in the ⋮ */
  useShortcut('create', openCreate, true, 'New Qanvast lead')
  /* (one-home N-05) The house Filters (REG-464: they apply live) — sort, quick filters, property type, source, members, date. */
  const [filters, setFilters] = useState<LeadFilters>(EMPTY_FILTERS)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [nowTick, setNowTick] = useState(data.now)
  const filterCount = activeFilterCount(filters)
  const filterLabel = filterCount ? `Filters (${filterCount} active)` : 'Filters'
  const filterSources = useMemo(() => [...new Set(rows.map((r) => r.source))], [rows])
  const [kebabOpen, setKebabOpen] = useState(false)   /* (REG-609) the header kebab: Export all as… */
  const [exportOpen, setExportOpen] = useState(false)
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
  /* (one-home N-05) Then the Filters: `applyFilters` (the listing's own) over these leads' listing rows says which pass; the order is the
     filters' Sort, as the listing's is — newest at the top unless "Oldest at the top" is picked. */
  const filtered = useMemo(() => {
    const narrows = filterCount > (filters.sort === 'newest' ? 0 : 1)
    const passing = narrows ? new Set(applyFilters(leadRows, filters, nowTick).map((r) => r.id)) : null
    const kept = passing ? scoped.filter((r) => passing.has(r.id)) : scoped
    const dir = filters.sort === 'oldest' ? 1 : -1
    return [...kept].sort((a, b) => dir * (a.createdAt.getTime() - b.createdAt.getTime()))
  }, [scoped, leadRows, filters, filterCount, nowTick])

  /* Search (REG-275, REG-274's rule): the last step of the pipeline, matching everything a ROW SHOWS — the name,
     the credits, the budget cell's own "70,500", the property type, the DISPLAYED created date ("17 Jul ’26", via
     the table's own displayDate — never the raw timestamp) and every status tag label, so a returned row is found
     by "Return Processing" as well as by "Approved". The phone under the name goes through the matcher's `phones`
     argument, which compares digits-only at any length: "98", "9812 0443" and "+65 9812 0443" all find the stored
     "98120443" (the owner's original complaint). Source is deliberately NOT matched: every row here is Qanvast and
     the column does not exist on this table — matching invisible data reads as a bug. */
  const [query, setQuery] = useState('')
  // The rail search tile and the "/" key focus the page's search input (page checklist). The DS SearchBar owns its
  const visible = useMemo(() => filterByQuery(filtered, query, (r) => ({
    fields: [r.name, r.credits === null ? '' : String(r.credits), money(r.budgetMinor), r.propertyType, displayDate(r.createdAt), ...r.tags.map((t) => t.label)],
    phones: [r.phone],
  })), [filtered, query])
  const clearAll = () => { setQuery(''); setScope(null); setFilters(EMPTY_FILTERS) }
  // "No results found" only when the reader narrowed something — an empty Qanvast table keeps its bare head.
  const nothingMatches = rows.length > 0 && visible.length === 0 && (query.trim() !== '' || scope !== null || filterCount > 0)

  /* (REG-507) the shell's FAB + sheet — (pending modules S10) the listing's three, acting on these leads (they were words) */
  const newestLead = useMemo(() => [...leadRows].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null, [leadRows])
  useMaisonAi(useListingMaison({ rows: leadRows, newest: newestLead, team }))

  /* Inert tabs: intercept the Link click before Next follows it (Link honours defaultPrevented) and answer coming soon — (parity map, CP-148)
     Leads and Studios navigate (components/qanvast/qanvast-tabs.ts). */
  const onTabsClick = (e: MouseEvent<HTMLDivElement>) => onQanvastTabsClick(e, comingSoon)

  /* (REG-728) The house rows: a radio DropdownItem (the current scope in the Selected fill) with its count as the row's meta — 12/Regular
     secondary, right-aligned; 0 when the loader counted none (as text, so a 0 still prints). */
  const item = (label: string, value: string | null, shown: string = label) => (
    <DropdownItem key={label} role="menuitemradio" checked={scope === value} meta={String(counts[label] ?? 0)}
                  onSelect={() => { setScope(value); setScopeOpen(false) }}>
      {shown}
    </DropdownItem>
  )

  /* (REG-609, parity T-10) Export what the table shows — the house dialog, the listing's "Export all as…" wording, the Qanvast columns. */
  const exportQanvast = (format: ExportFormat): string => {
    const head = ['Name', 'Phone', 'Stage', 'Source', 'Credits', 'Budget (S$)', 'Property type', 'Created', 'Qanvast ID', 'Return window', 'Return status', 'Returned on', 'Return reason', 'Qanvast reply']
    const body = visible.map((r) => [r.name, phoneDisplay(r.phone), r.stage, r.source, r.credits === null ? '' : String(r.credits), money(r.budgetMinor), r.propertyType, displayDate(r.createdAt), r.qanvastLeadId ?? '', r.window.short, r.tags.map((t) => t.label).join(' · '), r.ret ? displayDateTimeTight(r.ret.returnedAt) : '', r.ret?.reason ?? '', r.ret?.replyReason ?? ''])
    return downloadBlob(buildTable('OpenMaison — Qanvast leads', head, body, format), exportFileName(format, new Date()).replace('openmaison-leads', 'openmaison-qanvast-leads'))
  }
  const kebabMenu = (
    <Dropdown open={kebabOpen} onClose={() => setKebabOpen(false)} align="right" sheetTitle="Qanvast Ops">
      {/* (the calm UI build 2026-10-27, 2-27 · 2-09) the header's Add Lead and Insights and the toolbar's Request Leads, moved here — the same presses */}
      <DropdownItem onSelect={() => { setKebabOpen(false); openCreate() }} shortcut="create" testId="qanvast-new-lead">New Qanvast lead</DropdownItem>
      <DropdownItem onSelect={() => { setKebabOpen(false); comingSoon() }} testId="qanvast-request-leads">Request leads</DropdownItem>
      {canInsights ? <DropdownItem onSelect={() => { setKebabOpen(false); openInsights() }} testId="qanvast-reports">Reports</DropdownItem> : null}
      <DropdownDivider />
      <DropdownItem onSelect={() => { setKebabOpen(false); setExportOpen(true) }}>Export all as…</DropdownItem>
    </Dropdown>
  )

  return (
    <PageReveal skeleton={<QanvastSkeleton />}>
      <div className={pageStyles.body} style={{ position: 'relative' }}>
        {/* Page Header / Leads 1200×68 (spec 02): "Qanvast Ops" · Insights 110×36 · Add Lead 121×36 · kebab 36. (one-home N-05) Add Lead opens
            the lead form, Insights Company › Reports › Leads (dropped for whoever may not read it, as on the listing). */}
        <PageHeader
          title="Qanvast Ops"
          scrollShadow={false}   /* the sticky tab strip below carries the block's level-1 (REG-369) */
          /* (the calm UI build 2026-10-27, 2-27 · 1-30) the title and ⋮ at every width — Add Lead and Insights are the ⋮'s rows now (the Leads page
             is where a lead is added and the reports are Company's); REG-361's phone squares go with them */
          actions={(
            <span className={styles.kebabWrap}>
              <Tooltip label="More options" disabled={kebabOpen}>
                {/* (REG-728) the house trigger: aria-expanded lets a press on the open kebab close its menu (REG-153) instead of reopening it */}
                <IconButton icon="more_vert" label="More options" aria-haspopup="menu" aria-expanded={kebabOpen} onClick={() => setKebabOpen((o) => !o)} />
              </Tooltip>
              {kebabMenu}
            </span>
          )}
        />
        {/* Page Tabs: Leads (selected) · Studios · Lead credits · Reviews · Hangouts. */}
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
              {/* (REG-729) The house scope pill — the applied dot off "All Leads" (REG-295) comes with it. */}
              {/* (the calm UI build 2026-10-27, 2-11 · 2-12) sentence case and the house count ("All leads · 7") */}
              <ScopePill label={`${scope ?? 'All leads'} · ${visible.length}`} onClick={() => setScopeOpen((o) => !o)}
                         open={scopeOpen} scoped={scope !== null} />
              {/* Dropdown Menu / Leads "Lead Status" 200 wide (931:49435): All Leads · ACTIVE stages · INACTIVE stages · Lead Return states.
                  (REG-728) The house group titles and rules (DropdownLabel · DropdownDivider: 1px with 4 above and below, so three of them
                  still take the menu to the mock's 613); "Lead Return" keeps the mock's blue, which DropdownLabel has no tone for (.returnTone). */}
              <Dropdown open={scopeOpen} onClose={() => setScopeOpen(false)} align="left" width={MENU_WIDTH.standard} sheetTitle="Lead Status">
                {item('All Leads', null, 'All leads')}
                <DropdownDivider />
                <DropdownLabel tone="green" dot>ACTIVE</DropdownLabel>
                {STAGES.map((s) => item(s, s))}
                <DropdownDivider />
                <DropdownLabel tone="orange" dot>INACTIVE</DropdownLabel>
                {INACTIVE_STAGES.map((s) => item(s, s))}
                <DropdownDivider />
                <div className={styles.returnTone}><DropdownLabel dot>Lead return</DropdownLabel></div>
                {RETURN_FILTERS.map((s) => item(s, s))}
              </Dropdown>
            </div>
            {/* Right group (931:49232 / 931:49435 render): Request Leads · search · filter 36 — no kebab (spec 02's "filter · kebab" was a
                mis-transcription; audit 2026-08-30). (one-home N-05) Filter opens the house Filters, with the house count on it (every list
                toolbar's: the applied groups, F opens it); the mock's inert 36px search ICON is
                now the DS Search Bar 280 every other list toolbar uses, wired live (REG-275, owner-directed — the mock draws the icon).
                The wrapper is a <label> so the 2px band it grows on a touch pointer still focuses the field (REG-273). */}
            <div className={styles.right}>
              <ToolbarSearch query={query} onQuery={setQuery} placeholder="Search" label="Search leads" />
              <span className={toolbar.filterWrap}>
                <Tooltip label={filterLabel} shortcut="filters">
                  <IconButton icon="filter_list" label={filterLabel} onClick={() => { setNowTick(Date.now()); setFiltersOpen(true) }} selected={filterCount > 0} data-kb="filters" data-kb-label="Filters" />
                </Tooltip>
                {filterCount > 0 ? <span className={toolbar.filterBadge} aria-hidden>{filterCount}</span> : null}
              </span>
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
                            try { await copyText(phoneDisplay(row.phone)); snackbar({ message: 'Copied to clipboard' }) }
                            catch { snackbar({ message: phoneDisplay(row.phone) }) }
                          }} />
          )}
        </div>
      </div>

      <ExportDialog open={exportOpen} onClose={() => setExportOpen(false)} title="Export Qanvast leads" download={exportQanvast}
                    onDone={(name, format) => snackbar({ message: `Exported ${visible.length} leads as ${format} · ${name}` })} />   {/* (REG-609) */}
      <ColumnSettingsDrawer open={columnsOpen} onClose={() => setColumnsOpen(false)} pinning={{ max: 3 }} columns={columnPrefs.all} onSave={columnPrefs.save} onReset={columnPrefs.reset} />
      {/* (one-home N-05) the listing's Filters, over the sources these rows carry */}
      <FiltersModal open={filtersOpen} value={filters} team={team} now={nowTick} sources={filterSources} onClose={() => setFiltersOpen(false)} onApply={setFilters} />
      {/* (one-home N-05) the listing's lead form, opened the way app/leads/workspace.tsx opens it — create only, the source set to Qanvast */}
      <LeadFormModal
        sources={liveSources}
        assignable={assignHintText ? [viewer.id] : assignable}
        selfAssign={assignHintText ? { id: viewer.id } : null}   /* (REG-609, parity C-07) a Designer's new lead is theirs */
        customFields={customFields}   /* (REG-612, parity Q-25) */
        team={team}
        now={nowTick}
        form={leadForm}
        onClose={() => setLeadForm(null)}
        onSubmit={async (mode, form, _leadId, extras) => {
          if (mode !== 'create') return false
          try {
            /* (gaps build E, item 1) a picked file goes up with its bytes once the lead exists — the listing's own steps */
            const picked = extras?.picked ?? []
            const id = await createLead({ ...form, files: (extras?.files ?? []).filter((n) => !picked.some((f) => f.name === n)), customValues: extras?.customValues })
            snackbar({ message: `${form.name.trim()} added`, actionLabel: 'Open', onAction: () => router.push(`/leads/${id}?from=qanvast`) })   // (the calm UI build 2026-10-27, 2-34 · W-392)
            for (const f of picked) {
              const up = await uploadPicked(id, f).catch(() => null)
              if (!up || 'error' in up) snackbar({ message: couldnt(`upload ${f.name}`, up && 'error' in up ? up.error : null) })
            }
            setLeadForm(null)
            router.refresh()   // the new Qanvast lead joins this table
            return true
          } catch {
            snackbar({ message: 'Couldn’t save the lead — please try again' })
            return false
          }
        }}
      />

    </PageReveal>
  )
}
