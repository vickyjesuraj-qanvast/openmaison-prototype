'use client'

import { useState } from 'react'
import { Button } from '@/components/ds'
import { Dropdown, DropdownItem } from '@/components/leads/dropdown'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { ScopePill } from '@/components/om/scope-pill'
import { Tooltip } from '@/components/om/tooltip'
import { ToolbarSearch } from '@/components/om/toolbar-search'
import { useSheetLayout } from '@/components/om/sheet'
import { TASK_SCOPE_LABEL, type TaskScope } from '@/lib/leads/task-filters'
import styles from './tasks-toolbar.module.css'

export type TasksMenuAction = 'saveAll' | 'manage' | 'export' | 'deleteAll'
export type TasksToolbarProps = {
  /** (REG-735) The list is empty (not filtered): only the title and ⋮ — the empty card carries the ways in, and search, Filters and
      the columns have nothing to act on yet. The first record brings them back. */
  bare?: boolean
  query: string
  onQuery: (q: string) => void
  /** Add Task menu (902:26678): Create New Task · Use Template. */
  onAdd: (kind: 'new' | 'template') => void
  onFilter: () => void
  /** The rail's Tasks page (REG-466): the scope chip in place of the "All Tasks" title, and a search placeholder that names the lead. */
  scope?: { value: TaskScope; onChange: (s: TaskScope) => void; count: number }
  searchPlaceholder?: string
  /** Column settings (REG-454) — omitted on a phone, where the cards place every cell themselves. */
  onColumns?: () => void
  /** Number of active filter groups — badge on the filter button (listing pattern). */
  filterCount: number
  /** Header kebab (902:27154): Save all as Template · Manage Templates · Export all as... · Delete all. */
  onMenu: (action: TasksMenuAction) => void
  /** (REG-466) On the rail's Tasks page Add Task and the kebab sit in the page header, as the Leads header carries Add Lead and its kebab. */
  inHeader?: boolean
}

/**
 * Add Task ▾ (902:26678): Create New Task · Use Template. On the tab the primary outlined button with a trailing chevron; in the
 * rail page's header the Leads header's filled primary with the plus. ≤767 (REG-354) the glyph alone — the menu, its title and
 * every action behind it are the same.
 */
export function AddTaskButton({ onAdd, header = false }: { onAdd: (kind: 'new' | 'template') => void; header?: boolean }) {
  const [open, setOpen] = useState(false)
  const sheet = useSheetLayout()
  const pick = (fn: () => void) => () => { setOpen(false); fn() }
  return (
    <span className={styles.menuWrap}>
      {sheet ? (
        <Tooltip label="Add Task" disabled={open} shortcut="create">
          <IconButton icon="add" label="Add Task" variant={header ? 'filled' : 'primary'} aria-haspopup="menu" aria-expanded={open} data-kb="create" data-kb-label="Add Task" onClick={() => setOpen((o) => !o)} />
        </Tooltip>
      ) : header ? (
        <Button iconStart={<Icon name="add" size={20} />} aria-haspopup="menu" aria-expanded={open} data-kb="create" data-kb-label="Add Task" onPress={() => setOpen((o) => !o)}>Add Task</Button>
      ) : (
        /* touchTarget: the 36px DS/om controls take a ≥40 target below 768 (REG-273), drawn unchanged. */
        <Button
          variant="primary" appearance="outlined" className={styles.touchTarget}
          iconEnd={<span className={styles.chev} data-open={open || undefined}><Icon name="keyboard_arrow_down" size={20} /></span>}
          aria-haspopup="menu" aria-expanded={open} data-kb="create" data-kb-label="Add Task"
          onPress={() => setOpen((o) => !o)}
        >
          Add Task
        </Button>
      )}
      <Dropdown open={open} onClose={() => setOpen(false)} align={header ? 'right' : 'left'} sheetTitle="Add Task">
        <DropdownItem onSelect={pick(() => onAdd('new'))}>Create New Task</DropdownItem>
        <DropdownItem onSelect={pick(() => onAdd('template'))}>Use Template</DropdownItem>
      </Dropdown>
    </span>
  )
}

/** The kebab (902:27154): Save all as Template · Manage Templates · Export all as... · Delete all. */
export function TasksMoreButton({ onMenu }: { onMenu: (action: TasksMenuAction) => void }) {
  const [open, setOpen] = useState(false)
  const pick = (fn: () => void) => () => { setOpen(false); fn() }
  return (
    <span className={styles.menuWrap}>
      <Tooltip label="More options" disabled={open}>
        <IconButton icon="more_vert" label="More options" className={styles.touchTarget} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)} />
      </Tooltip>
      <Dropdown open={open} onClose={() => setOpen(false)} align="right" sheetTitle="All Tasks">
        <DropdownItem onSelect={pick(() => onMenu('saveAll'))}>Save all as Template</DropdownItem>
        <DropdownItem onSelect={pick(() => onMenu('manage'))}>Manage Templates</DropdownItem>
        <DropdownItem onSelect={pick(() => onMenu('export'))}>Export all as...</DropdownItem>
        <DropdownItem tone="danger" onSelect={pick(() => onMenu('deleteAll'))}>Delete all</DropdownItem>   {/* (REG-728) the row's own tone */}
      </Dropdown>
    </span>
  )
}

/**
 * Lead Details › Tasks — toolbar row (902:26378 "Section items", spec 01-listing-table.txt):
 * "All Tasks" · Add Task (primary outlined, trailing chevron) · Search 280 · Filters · kebab.
 * Menus toggle on their own trigger (REG-153); every icon-only control carries a Tooltip (REG-75).
 */
export function TasksToolbar({ query, onQuery, onAdd, onFilter, onColumns, filterCount, onMenu, scope, searchPlaceholder, inHeader = false, bare = false }: TasksToolbarProps) {
  const [scopeOpen, setScopeOpen] = useState(false)
  const pick = (fn: () => void) => () => { setScopeOpen(false); fn() }

  return (
    <div className={styles.bar}>
      {scope && !bare ? (
        /* (REG-466) The rail's Tasks page: the listing's "All Leads ▾" chip — All Tasks · My Tasks · Unassigned · Studio Tasks, with the open count.
           (REG-729) The house scope pill (components/om/scope-pill), as the listing's: the applied dot off "All Tasks" (REG-295), the 4% hover. */
        <span className={styles.scopeWrap}>
          <ScopePill label={`${TASK_SCOPE_LABEL[scope.value]} (${scope.count})`} open={scopeOpen} scoped={scope.value !== 'all'} onClick={() => setScopeOpen((o) => !o)} />
          <Dropdown open={scopeOpen} onClose={() => setScopeOpen(false)} align="left" sheetTitle="Show">
            {(Object.keys(TASK_SCOPE_LABEL) as TaskScope[]).map((k) => (
              <DropdownItem key={k} role="menuitemradio" checked={scope.value === k} onSelect={pick(() => scope.onChange(k))}>{TASK_SCOPE_LABEL[k]}</DropdownItem>
            ))}
          </Dropdown>
        </span>
      ) : (
        <h2 className={styles.title}>All Tasks</h2>
      )}
      <div className={styles.actions}>
        {bare ? null : (<>
        {inHeader ? null : <AddTaskButton onAdd={onAdd} />}
        <ToolbarSearch query={query} onQuery={onQuery} placeholder={searchPlaceholder ?? 'Search title, member, tag…'} label="Search tasks" />
        <span className={styles.filterWrap}>
          <Tooltip label="Filters" shortcut="filters">
            <IconButton icon="filter_list" data-kb="filters" data-kb-label="Filters" label={filterCount ? `Filters (${filterCount} active)` : 'Filters'} className={styles.touchTarget}
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
        </>)}
        {inHeader ? null : <TasksMoreButton onMenu={onMenu} />}
      </div>
    </div>
  )
}
