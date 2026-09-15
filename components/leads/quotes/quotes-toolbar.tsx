'use client'

import { useState } from 'react'
import { Button } from '@/components/ds'
import { Dropdown, DropdownItem } from '@/components/leads/dropdown'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { ToolbarSearch } from '@/components/om/toolbar-search'
import { useSheetLayout } from '@/components/om/sheet'
import styles from './quotes-toolbar.module.css'

export type QuotesToolbarProps = {
  query: string
  onQuery: (q: string) => void
  /** The tab's box reads "Search" (910:36319); the studio list names what it matches (REG-422). */
  searchPlaceholder?: string
  /** Create Quote (owner 2026-09-11, REG-405): one button, no menu — it opens the Create Quote modal, then the editor. */
  onCreate: () => void
  onFilter: () => void
  /** Number of active filter groups — badge on the filter button (listing pattern). */
  filterCount: number
  /** Header kebab (910:36729): Manage Templates · Quotes Settings · Deleted Quotes. */
  onMenu: (action: 'templates' | 'settings' | 'deleted') => void
}

/**
 * Lead Details › Quotes — toolbar row (910:36314 "Section items", spec design-source/context/lead-quotes/01-listing-table.txt):
 * "All Quotes" · Create Quote (primary outlined; was "New Quote ▾" with a four-item menu — the quote editor's Create
 * Quote modal now holds those ways to start, owner 2026-09-11, REG-405) · Search 280 · Filters · kebab.
 * Copied from components/leads/tasks/tasks-toolbar.tsx — same geometry, the quotes' copy and menus.
 * Menus toggle on their own trigger (REG-153); every icon-only control carries a Tooltip (REG-75).
 */
export function QuotesToolbar({ query, onQuery, searchPlaceholder = 'Search', onCreate, onFilter, filterCount, onMenu }: QuotesToolbarProps) {
  const [menu, setMenu] = useState<'more' | null>(null)
  const sheet = useSheetLayout()   // (REG-354) the mobile canvas' one-row toolbar
  const pick = (fn: () => void) => () => { setMenu(null); fn() }

  return (
    <div className={styles.bar}>
      <h2 className={styles.title}>All Quotes</h2>
      <div className={styles.actions}>
        {/* (REG-354) ≤767 the canvas' toolbar is one row of glyphs, so the labelled primary is its icon. */}
        {sheet ? (
          <Tooltip label="Create Quote">
            <IconButton icon="add" label="Create Quote" variant="primary" onClick={onCreate} />
          </Tooltip>
        ) : (
          <Button variant="primary" appearance="outlined" onPress={onCreate}>Create Quote</Button>
        )}
        <ToolbarSearch query={query} onQuery={onQuery} placeholder={searchPlaceholder} label="Search quotes" />
        <span className={styles.filterWrap}>
          <Tooltip label="Filters">
            <IconButton icon="filter_list" label={filterCount ? `Filters (${filterCount} active)` : 'Filters'} onClick={onFilter} selected={filterCount > 0} />
          </Tooltip>
          {filterCount > 0 ? <span className={styles.filterBadge} aria-hidden>{filterCount}</span> : null}
        </span>
        <span className={styles.menuWrap}>
          <Tooltip label="More options" disabled={menu === 'more'}>
            <IconButton
              icon="more_vert" label="More options"
              aria-haspopup="menu" aria-expanded={menu === 'more'}
              onClick={() => setMenu((m) => (m === 'more' ? null : 'more'))}
            />
          </Tooltip>
          <Dropdown open={menu === 'more'} onClose={() => setMenu(null)} align="right" sheetTitle="All Quotes">
            <DropdownItem onSelect={pick(() => onMenu('templates'))}>Manage Templates</DropdownItem>
            <DropdownItem onSelect={pick(() => onMenu('settings'))}>Quotes Settings</DropdownItem>
            <DropdownItem onSelect={pick(() => onMenu('deleted'))}>Deleted Quotes</DropdownItem>
          </Dropdown>
        </span>
      </div>
    </div>
  )
}
