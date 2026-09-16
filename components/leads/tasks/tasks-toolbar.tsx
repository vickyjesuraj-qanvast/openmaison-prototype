'use client'

import { useState } from 'react'
import { Button } from '@/components/ds'
import { Dropdown, DropdownItem } from '@/components/leads/dropdown'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { ToolbarSearch } from '@/components/om/toolbar-search'
import { useSheetLayout } from '@/components/om/sheet'
import styles from './tasks-toolbar.module.css'

export type TasksToolbarProps = {
  query: string
  onQuery: (q: string) => void
  /** Add Task menu (902:26678): Create New Task · Use Template. */
  onAdd: (kind: 'new' | 'template') => void
  onFilter: () => void
  /** Column settings (REG-454) — omitted on a phone, where the cards place every cell themselves. */
  onColumns?: () => void
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
export function TasksToolbar({ query, onQuery, onAdd, onFilter, onColumns, filterCount, onMenu }: TasksToolbarProps) {
  const [menu, setMenu] = useState<'add' | 'more' | null>(null)
  const sheet = useSheetLayout()   // (REG-354) the mobile canvas' one-row toolbar
  const pick = (fn: () => void) => () => { setMenu(null); fn() }

  return (
    <div className={styles.bar}>
      <h2 className={styles.title}>All Tasks</h2>
      <div className={styles.actions}>
        <span className={styles.menuWrap}>
          {/* touchTarget: the 36px DS/om controls take a ≥40 target below 768 (REG-273), drawn unchanged. */}
          {/* (REG-354) ≤767 the canvas' toolbar is one row of glyphs, so the labelled primary is its icon;
              the menu, its title and every action behind it are the same. */}
          {sheet ? (
            <Tooltip label="Add Task">
              <IconButton icon="add" label="Add Task" variant="primary"
                          aria-haspopup="menu" aria-expanded={menu === 'add'}
                          onClick={() => setMenu((m) => (m === 'add' ? null : 'add'))} />
            </Tooltip>
          ) : (
            <Button
              variant="primary" appearance="outlined" className={styles.touchTarget}
              iconEnd={<span className={styles.chev} data-open={menu === 'add' || undefined}><Icon name="keyboard_arrow_down" size={20} /></span>}
              aria-haspopup="menu" aria-expanded={menu === 'add'}
              onPress={() => setMenu((m) => (m === 'add' ? null : 'add'))}
            >
              Add Task
            </Button>
          )}
          <Dropdown open={menu === 'add'} onClose={() => setMenu(null)} align="left" sheetTitle="Add Task">
            <DropdownItem onSelect={pick(() => onAdd('new'))}>Create New Task</DropdownItem>
            <DropdownItem onSelect={pick(() => onAdd('template'))}>Use Template</DropdownItem>
          </Dropdown>
        </span>
        <ToolbarSearch query={query} onQuery={onQuery} placeholder="Search title, member, tag…" label="Search tasks" />
        <span className={styles.filterWrap}>
          <Tooltip label="Filters">
            <IconButton icon="filter_list" label={filterCount ? `Filters (${filterCount} active)` : 'Filters'} className={styles.touchTarget}
                        onClick={onFilter} selected={filterCount > 0} />
          </Tooltip>
          {filterCount > 0 ? <span className={styles.filterBadge} aria-hidden>{filterCount}</span> : null}
        </span>
        {onColumns ? (
          /* Column settings (REG-454): the same drawer as the leads listing, after Filters — hidden ≤767 where the cards place every cell. */
          <Tooltip label="Column settings">
            <IconButton icon="tune" label="Column settings" onClick={onColumns} className={styles.touchTarget} />
          </Tooltip>
        ) : null}
        <span className={styles.menuWrap}>
          <Tooltip label="More options" disabled={menu === 'more'}>
            <IconButton
              icon="more_vert" label="More options" className={styles.touchTarget}
              aria-haspopup="menu" aria-expanded={menu === 'more'}
              onClick={() => setMenu((m) => (m === 'more' ? null : 'more'))}
            />
          </Tooltip>
          <Dropdown open={menu === 'more'} onClose={() => setMenu(null)} align="right" sheetTitle="All Tasks">
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
