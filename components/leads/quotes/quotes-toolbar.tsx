'use client'

import { useRef, useState } from 'react'
import { Button, SearchBar } from '@/components/ds'
import { Dropdown, DropdownItem } from '@/components/leads/dropdown'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { useSearchTarget } from '@/components/shell/search-focus'
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
  // The rail search tile and the "/" key focus the page's search input (page checklist). The DS SearchBar
  // owns its <input>, so the target is resolved from the wrapper once it mounts.
  const searchInput = useRef<HTMLInputElement | null>(null)
  useSearchTarget(searchInput)

  const pick = (fn: () => void) => () => { setMenu(null); fn() }

  return (
    <div className={styles.bar}>
      <h2 className={styles.title}>All Quotes</h2>
      <div className={styles.actions}>
        <span className={styles.menuWrap}>
          <Button
            variant="primary" appearance="outlined"
            iconEnd={<span className={styles.chev} data-open={menu === 'new' || undefined}><Icon name="keyboard_arrow_down" size={20} /></span>}
            aria-haspopup="menu" aria-expanded={menu === 'new'}
            onPress={() => setMenu((m) => (m === 'new' ? null : 'new'))}
          >
            New Quote
          </Button>
          <Dropdown open={menu === 'new'} onClose={() => setMenu(null)} align="left">
            <DropdownItem onSelect={pick(() => onNew('blank'))}>From Blank</DropdownItem>
            <DropdownItem onSelect={pick(() => onNew('template'))}>From Template</DropdownItem>
            <DropdownItem onSelect={pick(() => onNew('import'))}>Import from File</DropdownItem>
            <DropdownItem onSelect={pick(() => onNew('ai'))}>Create with AI</DropdownItem>
          </Dropdown>
        </span>
        <span ref={(el) => { searchInput.current = el?.querySelector('input') ?? null }} style={{ display: 'inline-flex' }}>
          <SearchBar
            appearance="outlined" size="md"
            placeholder="Search" aria-label="Search quotes"
            value={query} onChange={onQuery}
            className={styles.search}
          />
        </span>
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
          <Dropdown open={menu === 'more'} onClose={() => setMenu(null)} align="right">
            <DropdownItem onSelect={pick(() => onMenu('templates'))}>Manage Templates</DropdownItem>
            <DropdownItem onSelect={pick(() => onMenu('settings'))}>Quotes Settings</DropdownItem>
            <DropdownItem onSelect={pick(() => onMenu('deleted'))}>Deleted Quotes</DropdownItem>
          </Dropdown>
        </span>
      </div>
    </div>
  )
}
