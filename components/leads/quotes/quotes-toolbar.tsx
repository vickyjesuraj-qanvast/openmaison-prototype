'use client'

import { useState } from 'react'
import { Button } from '@/components/ds'
import { Dropdown, DropdownItem } from '@/components/leads/dropdown'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { ToolbarSearch } from '@/components/om/toolbar-search'
import { useSheetLayout } from '@/components/om/sheet'
import { ScopePill } from '@/components/om/scope-pill'
import styles from './quotes-toolbar.module.css'

export type QuotesToolbarProps = {
  /** (REG-735) The list is empty (not filtered): only the title and ⋮ — the empty card carries the ways in, and search, Filters and
      the columns have nothing to act on yet. The first record brings them back. */
  bare?: boolean
  query: string
  onQuery: (q: string) => void
  /** The tab's box reads "Search" (910:36319); the studio list names what it matches (REG-422). */
  searchPlaceholder?: string
  /** Create Quote (owner 2026-09-11, REG-405): one button, no menu — it opens the Create Quote modal, then the editor. */
  onCreate: () => void
  onFilter: () => void
  /** Column settings (REG-454) — omitted on a phone, where the cards place every cell themselves. */
  onColumns?: () => void
  /** Number of active filter groups — badge on the filter button (listing pattern). */
  filterCount: number
  /** Header kebab (910:36729): Manage Templates · Quotes Settings · Deleted Quotes; (sweep S1 · U-07) Archived Quotes before Deleted. */
  onMenu: (action: 'templates' | 'settings' | 'archived' | 'deleted') => void
  /** (UX audit Q4 · Q5) The to-do chips — "Waiting for my approval · 2", "Waiting on client · 3", "Expiring this week · 1" — each shown only
      while something waits on it (REG-666's attention pill); a press narrows the list, a second press lets go. */
  todos?: { key: string; label: string; count: number; icon: string; selected: boolean; onClick: () => void }[]
}

/**
 * Lead Details › Quotes — toolbar row (910:36314 "Section items", spec design-source/context/lead-quotes/01-listing-table.txt):
 * "All Quotes" · Create Quote (primary outlined; was "New Quote ▾" with a four-item menu — the quote editor's Create
 * Quote modal now holds those ways to start, owner 2026-09-11, REG-405) · Search 280 · Filters · kebab.
 * Copied from components/leads/tasks/tasks-toolbar.tsx — same geometry, the quotes' copy and menus.
 * Menus toggle on their own trigger (REG-153); every icon-only control carries a Tooltip (REG-75).
 */
export function QuotesToolbar({ query, onQuery, searchPlaceholder = 'Search', onCreate, onFilter, onColumns, filterCount, onMenu, bare = false, todos = [] }: QuotesToolbarProps) {
  const [menu, setMenu] = useState<'more' | null>(null)
  const sheet = useSheetLayout()   // (REG-354) the mobile canvas' one-row toolbar
  const pick = (fn: () => void) => () => { setMenu(null); fn() }

  return (
    <div className={styles.bar}>
      <h2 className={styles.title}>All Quotes</h2>
      {/* (UX audit Q4 · Q5) What waits today, before the tools — REG-666's to-do pills, the libraries' way; on a phone their own line under the row. */}
      {!bare && todos.some((t) => t.count > 0) ? (
        <span className={styles.todos} data-testid="quote-todos">
          {todos.filter((t) => t.count > 0).map((t) => (
            <ScopePill key={t.key} tone="attention" icon={t.icon} menu={false} label={t.label} short={sheet ? undefined : String(t.count)} selected={t.selected} onClick={t.onClick} />
          ))}
        </span>
      ) : null}
      <div className={styles.actions}>
        {bare ? null : (<>
        {/* (REG-354) ≤767 the canvas' toolbar is one row of glyphs, so the labelled primary is its icon. */}
        {sheet ? (
          <Tooltip label="Create Quote" shortcut="create">
            <IconButton icon="add" label="Create Quote" variant="primary" onClick={onCreate} data-kb="create" />
          </Tooltip>
        ) : (
          <Button variant="primary" appearance="outlined" onPress={onCreate} data-kb="create">Create Quote</Button>
        )}
        <ToolbarSearch query={query} onQuery={onQuery} placeholder={searchPlaceholder} label="Search quotes" />
        <span className={styles.filterWrap}>
          <Tooltip label="Filters" shortcut="filters">
            <IconButton icon="filter_list" data-kb="filters" data-kb-label="Filters" label={filterCount ? `Filters (${filterCount} active)` : 'Filters'} onClick={onFilter} selected={filterCount > 0} />
          </Tooltip>
          {filterCount > 0 ? <span className={styles.filterBadge} aria-hidden>{filterCount}</span> : null}
        </span>
        {onColumns ? (
          /* Column settings (REG-454): the same drawer as the leads listing, after Filters — hidden ≤767 where the cards place every cell. */
          <Tooltip label="Column settings">
            <IconButton icon="tune" label="Column settings" onClick={onColumns} />
          </Tooltip>
        ) : null}
        </>)}
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
            <DropdownItem onSelect={pick(() => onMenu('archived'))}>Archived Quotes</DropdownItem>
            <DropdownItem onSelect={pick(() => onMenu('deleted'))}>Deleted Quotes</DropdownItem>
          </Dropdown>
        </span>
      </div>
    </div>
  )
}
