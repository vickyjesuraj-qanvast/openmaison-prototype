'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ds'
import { IconButton } from '@/components/om/icon-button'
import { ScopePill } from '@/components/om/scope-pill'
import { Tooltip } from '@/components/om/tooltip'
import { ToolbarSearch } from '@/components/om/toolbar-search'
import { PortalMenu } from '@/components/om/portal-menu'
import { SegmentedIconToggle } from '@/components/om/segmented'   // (gaps build I) the Leads listing's view toggle
import { DropdownDivider, DropdownItem, DropdownLabel, MENU_WIDTH } from '@/components/leads/dropdown'
import { SCOPES, type ProjectScope, type ScopeGroup } from './scopes'
import styles from './projects-toolbar.module.css'

/**
 * (REG-924) The Projects listing's toolbar — the Leads listing's row (components/leads/toolbar.module.css): the scope pill at the left
 * (REG-295/297: one dominant single choice → a pill naming the value and its count, the applied dot off its default; Completed projects
 * hidden until asked, Q-25) and "View all" back to the default; search, Filters with its count and Column settings at the right. The tiles
 * above press the same scopes. `bare` (REG-735): the first run's card carries the way in, so nothing that can't act shows.
 * (parity P-20 · Q-07) The menu is the Leads listing's: Open projects · All projects · Mine, then the "To do" group, then the stages under the
 * lead's Active / Inactive labels; the phone sheet names the dimension ("Project status"); the pill counts the rows the list shows (`shown`,
 * after search and Filters, as "All Leads (n)" does) while each menu row keeps its scope's own count. (parity P-24) "Table view".
 */
export function ProjectsToolbar({ scope, counts, shown, onScope, query, onQuery, onFilter, filterCount, onColumns, bare = false, reviews = true, view }: {
  scope: ProjectScope
  counts: Record<ProjectScope, number>
  /** (parity P-20) The rows the list shows — the pill's count. */
  shown: number
  onScope: (s: ProjectScope) => void
  query: string
  onQuery: (q: string) => void
  onFilter: () => void
  filterCount: number
  onColumns?: () => void
  bare?: boolean
  /** (fix-A, A-29) Needs my review is an Owner's or an Admin's — or whoever has something in it (Q-48: a payment the designer confirms). */
  reviews?: boolean
  /** (gaps build I, I-Q1) List · Workload — the Leads listing's view toggle, for Owners, Admins and Managers */
  view?: { value: 'list' | 'workload'; onChange: (v: 'list' | 'workload') => void }
}) {
  const [open, setOpen] = useState(false)
  const pill = useRef<HTMLButtonElement>(null)
  const anchor = useRef<HTMLSpanElement>(null)
  const current = SCOPES.find((s) => s.key === scope) ?? SCOPES[0]!
  const filterLabel = filterCount ? `Filters (${filterCount} active)` : 'Filters'
  const pick = (s: ProjectScope) => { setOpen(false); onScope(s) }
  const group = (g: ScopeGroup) => SCOPES.filter((s) => s.group === g)
  const inactive = group('inactive').filter((s) => s.key !== 'on_hold' || counts.on_hold > 0 || scope === 'on_hold')
  const item = (s: (typeof SCOPES)[number]) => (
    <DropdownItem key={s.key} role="menuitemradio" checked={scope === s.key} meta={String(counts[s.key])} help={s.help} onSelect={() => pick(s.key)}>{s.label}</DropdownItem>
  )
  return (
    <div className={styles.bar}>
      <div className={styles.left}>
        {bare ? <h2 className={styles.title}>All Projects</h2> : (<>
          <span ref={anchor} className={styles.pillWrap}>
            <ScopePill ref={pill} label={`${current.label} (${shown})`} onClick={() => setOpen((o) => !o)} open={open} scoped={scope !== 'open'} />
            <PortalMenu open={open} anchor={anchor} onClose={() => setOpen(false)} align="left" width={MENU_WIDTH.wide} role="menu" sheetTitle="Project status">
              {group('top').map(item)}
              <DropdownDivider />
              <DropdownLabel>To do</DropdownLabel>
              {group('todo').filter((s) => s.key !== 'review' || reviews || counts.review > 0 || scope === 'review').map(item)}
              <DropdownDivider />
              <DropdownLabel tone="green" dot>Active</DropdownLabel>
              {group('active').map(item)}
              {inactive.length ? (   /* (gaps build, package A) On hold only when a project is */
                <>
                  <DropdownDivider />
                  <DropdownLabel tone="orange" dot>Inactive</DropdownLabel>
                  {inactive.map(item)}
                </>
              ) : null}
            </PortalMenu>
          </span>
          {scope !== 'open' ? <span className={styles.viewAll}><Button appearance="text" onPress={() => onScope('open')} data-testid="view-open-projects">View all</Button></span> : null}
        </>)}
      </div>
      {bare ? null : (
        <div className={styles.right}>
          {/* (parity Q-08) the Leads listing's slot on the house search: from 768 up the 280 box stays in the row (no info column beside a listing),
              the glyph only on a phone — one rule for both listings (components/leads/toolbar.module.css `.searchSlot`) */}
          <span className={styles.searchSlot}><ToolbarSearch query={query} onQuery={onQuery} placeholder="Search project, client, number…" label="Search projects" /></span>
          <span className={styles.filterWrap}>
            <Tooltip label={filterLabel} shortcut="filters">
              <IconButton icon="filter_list" label={filterLabel} onClick={onFilter} selected={filterCount > 0} data-kb="filters" data-kb-label="Filters" />
            </Tooltip>
            {filterCount > 0 ? <span className={styles.filterBadge} aria-hidden>{filterCount}</span> : null}
          </span>
          {onColumns ? (
            <Tooltip label="Column settings">
              <IconButton icon="tune" label="Column settings" onClick={onColumns} />
            </Tooltip>
          ) : null}
          {view ? (
            <span className={styles.viewWrap} data-kb="view" data-testid="projects-view">   {/* (REG-713) V presses the view you are not on */}
              <SegmentedIconToggle label="View" value={view.value} onChange={(v) => view.onChange(v === 'workload' ? 'workload' : 'list')}
                                   options={[{ value: 'list', icon: 'view_list', label: 'Table view' }, { value: 'workload', icon: 'group', label: 'Workload view' }]} />   {/* (parity P-24) the lead's word for the table */}
            </span>
          ) : null}
        </div>
      )}
    </div>
  )
}
