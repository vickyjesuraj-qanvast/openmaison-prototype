'use client'

import { useState } from 'react'
import { Button } from '@/components/ds'
import { Dropdown, DropdownItem } from '@/components/leads/dropdown'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { ToolbarSearch } from '@/components/om/toolbar-search'
import { useSheetLayout } from '@/components/om/sheet'
import styles from './quotes-toolbar.module.css'

export type QuotesToolbarProps = {
  query: string
  onQuery: (q: string) => void
  /** New Quote menu (910:36664): From Blank · From Template · Import from File · Create with AI. */
  onNew: (kind: 'blank' | 'template' | 'import' | 'ai') => void
  onFilter: () => void
  /** Number of active filter groups — badge on the filter button (listing pattern). */
  filterCount: number
  /** Header kebab (910:36729): Manage Templates · Quotes Settings · Deleted Quotes. */
  onMenu: (action: 'templates' | 'settings' | 'deleted') => void
}

/**
 * Lead Details › Quotes — toolbar row (910:36314 "Section items", spec design-source/context/lead-quotes/01-listing-table.txt):
 * "All Quotes" · New Quote (primary outlined, trailing chevron) · Search 280 · Filters · kebab.
 * Copied from components/leads/tasks/tasks-toolbar.tsx — same geometry, the quotes' copy and menus.
 * Menus toggle on their own trigger (REG-153); every icon-only control carries a Tooltip (REG-75).
 */
export function QuotesToolbar({ query, onQuery, onNew, onFilter, filterCount, onMenu }: QuotesToolbarProps) {
  const [menu, setMenu] = useState<'new' | 'more' | null>(null)
  const sheet = useSheetLayout()   // (REG-354) the mobile canvas' one-row toolbar
  const pick = (fn: () => void) => () => { setMenu(null); fn() }

  return (
    <div className={styles.bar}>
      <h2 className={styles.title}>All Quotes</h2>
      <div className={styles.actions}>
        <span className={styles.menuWrap}>
          {/* (REG-354) ≤767 the canvas' toolbar is one row of glyphs, so the labelled primary is its icon;
              the menu, its title and every action behind it are the same. */}
          {sheet ? (
            <Tooltip label="New Quote">
              <IconButton icon="add" label="New Quote" variant="primary"
                          aria-haspopup="menu" aria-expanded={menu === 'new'}
                          onClick={() => setMenu((m) => (m === 'new' ? null : 'new'))} />
            </Tooltip>
          ) : (
            <Button
              variant="primary" appearance="outlined"
              iconEnd={<span className={styles.chev} data-open={menu === 'new' || undefined}><Icon name="keyboard_arrow_down" size={20} /></span>}
              aria-haspopup="menu" aria-expanded={menu === 'new'}
              onPress={() => setMenu((m) => (m === 'new' ? null : 'new'))}
            >
              New Quote
            </Button>
          )}
          <Dropdown open={menu === 'new'} onClose={() => setMenu(null)} align="left" sheetTitle="New Quote">
            <DropdownItem onSelect={pick(() => onNew('blank'))}>From Blank</DropdownItem>
            <DropdownItem onSelect={pick(() => onNew('template'))}>From Template</DropdownItem>
            <DropdownItem onSelect={pick(() => onNew('import'))}>Import from File</DropdownItem>
            <DropdownItem onSelect={pick(() => onNew('ai'))}>Create with AI</DropdownItem>
          </Dropdown>
        </span>
        <ToolbarSearch query={query} onQuery={onQuery} placeholder="Search title, number, status…" label="Search quotes" />
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
