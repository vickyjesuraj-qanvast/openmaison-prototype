'use client'

import { useRef, useState } from 'react'
import { Button, SearchBar } from '@/components/ds'
import { Dropdown, DropdownItem } from '@/components/leads/dropdown'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { useSearchTarget } from '@/components/shell/search-focus'
import styles from './tasks-toolbar.module.css'

export type TasksToolbarProps = {
  query: string
  onQuery: (q: string) => void
  /** Add Task menu (902:26678): Create New Task · Use Template. */
  onAdd: (kind: 'new' | 'template') => void
  onFilter: () => void
  /** Number of active filter groups — badge on the filter button (listing pattern). */
  filterCount: number
  /** Header kebab (902:27154): Save all as Template · Manage Templates · Export all as... · Delete all. */
  onMenu: (action: 'saveAll' | 'manage' | 'export' | 'deleteAll') => void
}

/**
 * Lead Details › Tasks — toolbar row (902:26378 "Section items", spec 01-listing-table.txt):
 * "All Tasks" · Add Task (primary outlined, trailing chevron) · Search 280 · Filters · kebab.
 * Menus toggle on their own trigger (REG-153); every icon-only control carries a Tooltip (REG-75).
 */
export function TasksToolbar({ query, onQuery, onAdd, onFilter, filterCount, onMenu }: TasksToolbarProps) {
  const [menu, setMenu] = useState<'add' | 'more' | null>(null)
  // The rail search tile and the "/" key focus the page's search input (page checklist). The DS SearchBar
  // owns its <input>, so the target is resolved from the wrapper once it mounts.
  const searchInput = useRef<HTMLInputElement | null>(null)
  useSearchTarget(searchInput)

  const pick = (fn: () => void) => () => { setMenu(null); fn() }

  return (
    <div className={styles.bar}>
      <h2 className={styles.title}>All Tasks</h2>
      <div className={styles.actions}>
        <span className={styles.menuWrap}>
          <Button
            variant="primary" appearance="outlined"
            iconEnd={<span className={styles.chev} data-open={menu === 'add' || undefined}><Icon name="keyboard_arrow_down" size={20} /></span>}
            aria-haspopup="menu" aria-expanded={menu === 'add'}
            onPress={() => setMenu((m) => (m === 'add' ? null : 'add'))}
          >
            Add Task
          </Button>
          <Dropdown open={menu === 'add'} onClose={() => setMenu(null)} align="left">
            <DropdownItem onSelect={pick(() => onAdd('new'))}>Create New Task</DropdownItem>
            <DropdownItem onSelect={pick(() => onAdd('template'))}>Use Template</DropdownItem>
          </Dropdown>
        </span>
        <span ref={(el) => { searchInput.current = el?.querySelector('input') ?? null }} style={{ display: 'inline-flex' }}>
          <SearchBar
            appearance="outlined" size="md"
            placeholder="Search" aria-label="Search tasks"
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
            <DropdownItem onSelect={pick(() => onMenu('saveAll'))}>Save all as Template</DropdownItem>
            <DropdownItem onSelect={pick(() => onMenu('manage'))}>Manage Templates</DropdownItem>
            <DropdownItem onSelect={pick(() => onMenu('export'))}>Export all as...</DropdownItem>
            <DropdownItem onSelect={pick(() => onMenu('deleteAll'))}><span className={styles.danger}>Delete all</span></DropdownItem>
          </Dropdown>
        </span>
      </div>
    </div>
  )
}
