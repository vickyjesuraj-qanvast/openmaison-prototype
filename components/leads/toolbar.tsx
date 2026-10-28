'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Button } from '@/components/ds'
import { IconButton } from '@/components/om/icon-button'
import { ScopePill } from '@/components/om/scope-pill'
import { SegmentedIconToggle } from '@/components/om/segmented'
import { Tooltip } from '@/components/om/tooltip'
import { ToolbarSearch } from '@/components/om/toolbar-search'
import styles from './toolbar.module.css'

export function LeadsToolbar({
  chipLabel,
  onChipClick,
  chipOpen = false,
  chipScoped = false,
  query,
  onQueryChange,
  onFilterClick,
  filterCount = 0,
  view,
  onViewChange,
  chipMenu, onColumnsClick, bare = false, onViewAll, todo = null }: {
  /** (Leads on the move, L3 — P-05) A phone's "to call today" chip: the leads with a follow-up due today or late, one press away — the house
   *  to-do pill (REG-666), on its own line under the row. Absent at every other width. */
  todo?: { label: string; selected: boolean; onClick: () => void } | null
  chipLabel: string
  onChipClick: () => void
  /** The pill's menu is open — chevron points up. */
  chipOpen?: boolean
  /** (REG-295) The pill stands off its default (a stage, not All Leads) — it wears the applied dot. */
  chipScoped?: boolean
  query: string
  onQueryChange: (q: string) => void
  onFilterClick: () => void
  /** Column settings (REG-454): the one entry point every table shares, after Filters. */
  onColumnsClick?: () => void
  /** A2: number of active filter groups — badge on the filter button. */
  filterCount?: number
  view: 'table' | 'kanban'
  onViewChange: (v: 'table' | 'kanban') => void
  /** Anchored menu rendered under the stage pill. */
  chipMenu?: ReactNode
  /** (Dane's UAT 1.05) While the pill holds a scope (a stage, Mine or a to-do): "View all" beside it returns to All Leads in one
      press — the scope only; search and Filters stay. Hidden at All Leads. */
  onViewAll?: () => void
  /** (REG-735) The studio has no lead yet: the row says "All Leads" and nothing else — the empty card carries Create and Import, and the
      stage pill, search, Filters, the columns and the views have nothing to act on. The first lead brings them back. */
  bare?: boolean
}) {
  const filterLabel = filterCount ? `Filters (${filterCount} active)` : 'Filters'   // one accessible name for the control and its tooltip (page-checklist › Tooltips)
  /* (Dane's UAT 1.05 · REG-354) The row stays one row on a phone: where the pill's words leave no room for View all beside it ("Overdue
     follow-ups (12)" at 390), it folds away — the pill's sheet opens on All Leads, its first row. Measured, never guessed: the pill's and the
     button's own widths against the room the row gives them; the observer's first call is the first measure. */
  const leftRef = useRef<HTMLDivElement>(null)
  const pillRef = useRef<HTMLButtonElement>(null)
  const viewAllRef = useRef<HTMLSpanElement>(null)
  const [folded, setFolded] = useState(false)
  const viewAll = chipScoped && !bare && !!onViewAll
  useEffect(() => {
    const left = leftRef.current, pill = pillRef.current, btn = viewAllRef.current
    if (!viewAll || !left || !pill || !btn) return
    const gap = parseFloat(getComputedStyle(btn).marginLeft) || 0
    const ro = new ResizeObserver(() => setFolded(left.clientWidth < pill.offsetWidth + gap + btn.offsetWidth))
    ro.observe(left); ro.observe(pill); ro.observe(btn)
    return () => ro.disconnect()
  }, [viewAll])
  return (
    <div className={styles.bar}>
      <div ref={leftRef} className={styles.left}>
        {/* (REG-729) The house scope pill (components/om/scope-pill.tsx) — the listing's own pill, now written once: the chevron turns
            while its menu is open, the applied dot off "All Leads" (REG-295). */}
        {bare ? <h2 className={styles.title}>All leads</h2> : (<>
        <ScopePill ref={pillRef} label={chipLabel} onClick={onChipClick} open={chipOpen} scoped={chipScoped} />
        {chipMenu}
        {viewAll ? (
          <span ref={viewAllRef} className={styles.viewAll} data-folded={folded || undefined} inert={folded || undefined} aria-hidden={folded || undefined}>
            <Button appearance="text" onPress={onViewAll} data-testid="view-all-leads">View all</Button>
          </span>
        ) : null}
        </>)}
      </div>
      {!bare && todo ? (
        <span className={styles.todo} data-testid="call-today">
          <ScopePill tone="attention" icon="call" menu={false} label={todo.label} selected={todo.selected} onClick={todo.onClick} />
        </span>
      ) : null}
      {bare ? null : (
      <div className={styles.right}>
        {/* (REG-276) The DS SearchBar, as every other list in the app uses (owner 2026-09-01: "make it like its in the DS SearchBar"), drawing
            its focus ring INSIDE the box (REG-241's lesson) and owning its clear. The placeholder names what the box matches (REG-274/275); the
            aria-label stays the plain name.
            (parity P-19, B-08 — a deliberate change of REG-298's phone rule) Through the house ToolbarSearch now, as Projects and the tab
            toolbars: on a phone the search glyph sits in the row between the pill and Filters and opens the box in that row — since ⌘K took
            the top bar's glyph (REG-709) nothing reached the listing's own box by touch. The rail's search tile and "/" still find it (the
            house piece is the page's search target). (Q-08) From 768 up the 280 box stays in the row, Leads' way. */}
        <span className={styles.searchSlot}>
          <ToolbarSearch query={query} onQuery={onQueryChange} placeholder="Search name, phone, email…" label="Search leads" />
        </span>
        <span className={styles.filterWrap}>
          <Tooltip label={filterLabel} shortcut="filters">
            <IconButton icon="filter_list" label={filterLabel} onClick={onFilterClick} selected={filterCount > 0} data-kb="filters" data-kb-label="Filters" />
          </Tooltip>
          {filterCount > 0 ? <span className={styles.filterBadge} aria-hidden>{filterCount}</span> : null}
        </span>
        {onColumnsClick ? (
          /* Column settings (REG-454): its own item in the row — inside the filter wrapper it touched Filters (owner 2026-09-16). */
          <Tooltip label="Column settings">
            <IconButton icon="tune" label="Column settings" onClick={onColumnsClick} />
          </Tooltip>
        ) : null}
        {/* (REG-299) ≤767 there is one view — the mock's cards — so the toggle leaves the row. */}
        <span className={styles.viewWrap} data-kb="view">   {/* (REG-713) V presses the view you are not on */}
          <SegmentedIconToggle
            label="View"
            value={view}
            onChange={(v) => onViewChange(v as 'table' | 'kanban')}
            options={[
              { value: 'table', icon: 'view_list', label: 'Table view' },
              { value: 'kanban', icon: 'view_kanban', label: 'Kanban view' },
            ]}
          />
        </span>
      </div>
      )}
    </div>
  )
}
