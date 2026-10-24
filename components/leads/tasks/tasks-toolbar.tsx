'use client'

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { useParams, usePathname } from 'next/navigation'
import { QuoteTasksDialog } from '@/components/projects/schedule/suggest-tasks-dialog'   // (parity map, TD-022) P-E's one entry
import { readQuoteTaskSuggestions } from '@/app/projects/schedule-actions'
import { Button } from '@/components/ds'
import { Dropdown, DropdownItem } from '@/components/leads/dropdown'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { ScopePill } from '@/components/om/scope-pill'
import { Tooltip } from '@/components/om/tooltip'
import { ToolbarSearch } from '@/components/om/toolbar-search'
import { useSheetLayout } from '@/components/om/sheet'
import { TASK_SCOPE_LABEL, TASK_SOURCE_LABEL, type TaskScope, type TaskSource } from '@/lib/leads/task-filters'
import { DropdownDivider } from '@/components/leads/dropdown'
import { SegmentedButton, SegmentedButtonItem } from '@/components/ds'
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
  /** (UX audit 2026-09-30, T5 · T4) The rail page's to-do chips after the scope pill — "Overdue · 3" · "Due today · 2" · "Unassigned · 5": the
      house ScopePill's attention tone (REG-666), shown only while something waits; a press narrows the list to it, a second press lets go. */
  todos?: { key: string; label: string; short: string; icon: string; selected: boolean; onClick: () => void }[]
  searchPlaceholder?: string
  /** Column settings (REG-454) — omitted on a phone, where the cards place every cell themselves. */
  onColumns?: () => void
  /** Number of active filter groups — badge on the filter button (listing pattern). */
  filterCount: number
  /** Header kebab (902:27154): Save all as Template · Manage Templates · Export all as... · Delete all. */
  onMenu: (action: TasksMenuAction) => void
  /** (REG-466) On the rail's Tasks page Add Task and the kebab sit in the page header, as the Leads header carries Add Lead and its kebab. */
  inHeader?: boolean
  /** (gaps build, package C — 16) The rail's Tasks page: whose tasks — All · Leads · Projects; on a phone it rides in the scope's sheet. */
  source?: { value: TaskSource; onChange: (s: TaskSource) => void }
  /** (simplify S-03 · S-06) On a project: the Tasks group's view switch (All tasks · Compliance) in the "All Tasks" title's place. */
  views?: ReactNode
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
  /* (parity map, TD-022 — P-E) on a project's Tasks, a third way in: Suggest tasks from the quote — offered only once the project has a signed
     quote with lines to suggest from (read once, quietly; nothing shows while it reads or when it can't) */
  const pathname = usePathname()
  const params = useParams<{ id?: string | string[] }>()
  const projectId = pathname?.startsWith('/projects/') && typeof params?.id === 'string' ? params.id : null
  const [fromQuote, setFromQuote] = useState(false)
  const [quoteOpen, setQuoteOpen] = useState(false)
  useEffect(() => {
    if (!projectId) return
    let live = true
    void readQuoteTaskSuggestions(projectId).then((r) => { if (live) setFromQuote(!('error' in r) && !!r.quote && r.groups.length > 0) }, () => { if (live) setFromQuote(false) })
    return () => { live = false }
  }, [projectId])
  return (
    <span className={styles.menuWrap}>
      {sheet ? (
        <Tooltip label="Add Task" disabled={open} shortcut="create">
          <IconButton icon="add" label="Add Task" variant={header ? 'filled' : 'primary'} aria-haspopup="menu" aria-expanded={open} data-kb="create" data-kb-label="Add Task" onClick={() => setOpen((o) => !o)} />
        </Tooltip>
      ) : header ? (
        <Button iconStart={<Icon name="add" size={20} />} aria-haspopup="menu" aria-expanded={open} data-kb="create" data-kb-label="Add Task" onPress={() => setOpen((o) => !o)}>Add Task</Button>
      ) : (
        /* (Leads on the move, L4 — C-02) no overlay of ours: the DS button keeps its own box, the icon buttons the house 44 */
        <Button
          variant="primary" appearance="outlined"
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
        {projectId && fromQuote ? <DropdownItem onSelect={pick(() => setQuoteOpen(true))} help="The signed quote’s lines, by section">Suggest tasks from the quote</DropdownItem> : null}
      </Dropdown>
      {projectId ? <QuoteTasksDialog open={quoteOpen} projectId={projectId} onClose={() => setQuoteOpen(false)} /> : null}
    </span>
  )
}

/** The kebab (902:27154): Save all as Template · Manage Templates · Export all as... · Delete all. */
export function TasksMoreButton({ onMenu, group }: { onMenu: (action: TasksMenuAction) => void; /** (gaps build, package C — 16) the Tasks page's Group by project */ group?: { on: boolean; onToggle: () => void } }) {
  const [open, setOpen] = useState(false)
  const pick = (fn: () => void) => () => { setOpen(false); fn() }
  return (
    <span className={styles.menuWrap}>
      <Tooltip label="More options" disabled={open}>
        <IconButton icon="more_vert" label="More options" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)} />
      </Tooltip>
      <Dropdown open={open} onClose={() => setOpen(false)} align="right" sheetTitle="All Tasks">
        <DropdownItem onSelect={pick(() => onMenu('saveAll'))}>Save all as Template</DropdownItem>
        <DropdownItem onSelect={pick(() => onMenu('manage'))}>Manage Templates</DropdownItem>
        <DropdownItem onSelect={pick(() => onMenu('export'))}>Export all as...</DropdownItem>
        <DropdownItem tone="danger" onSelect={pick(() => onMenu('deleteAll'))}>Delete all</DropdownItem>   {/* (REG-728) the row's own tone */}
        {group ? <><DropdownDivider /><DropdownItem role="menuitemcheckbox" checked={group.on} onSelect={pick(group.onToggle)}>Group by project</DropdownItem></> : null}
      </Dropdown>
    </span>
  )
}

/**
 * Lead Details › Tasks — toolbar row (902:26378 "Section items", spec 01-listing-table.txt):
 * "All Tasks" · Add Task (primary outlined, trailing chevron) · Search 280 · Filters · kebab.
 * Menus toggle on their own trigger (REG-153); every icon-only control carries a Tooltip (REG-75).
 */
export function TasksToolbar({ query, onQuery, onAdd, onFilter, onColumns, filterCount, onMenu, scope, todos, searchPlaceholder, inHeader = false, bare = false, source, views }: TasksToolbarProps) {
  const [scopeOpen, setScopeOpen] = useState(false)
  const sheet = useSheetLayout()
  const pick = (fn: () => void) => () => { setScopeOpen(false); fn() }
  /* (pending modules S46C · H4) Four to-do chips (Upcoming joined Overdue · Due today · Unassigned) don't always fit beside the scope, the Leads ·
     Projects switch and the search — an expanded rail, a 1280 screen: then every chip says only its glyph and count (its words stay its name
     and its tooltip), as they do on a tablet, and the full words come back once the row has room for them. Measured, never guessed. */
  const wrapRef = useRef<HTMLSpanElement>(null)
  const [compact, setCompact] = useState(false)
  const compactRef = useRef(false)
  const needRef = useRef(0)
  const todoKey = (todos ?? []).map((t) => t.label).join('|')
  useLayoutEffect(() => {
    const el = wrapRef.current
    if (!el || !todoKey) return
    const fit = () => {
      if (!compactRef.current) {
        if (el.scrollWidth > el.clientWidth + 1) { needRef.current = el.scrollWidth; compactRef.current = true; setCompact(true) }
      } else if (el.clientWidth >= needRef.current) { compactRef.current = false; setCompact(false) }
    }
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    const chips = el.querySelector('[data-testid="task-todos"]')
    if (chips) ro.observe(chips)   // a count that grows, or the words coming back, re-measures too
    return () => ro.disconnect()
  }, [todoKey])

  return (
    <div className={styles.bar}>
      {scope && !bare ? (
        /* (REG-466) The rail's Tasks page: the listing's "All Leads ▾" chip — All Tasks · My Tasks · Unassigned · Studio Tasks, with the open count.
           (REG-729) The house scope pill (components/om/scope-pill), as the listing's: the applied dot off "All Tasks" (REG-295), the 4% hover. */
        <span className={styles.scopeWrap} ref={wrapRef}>
          <ScopePill label={`${TASK_SCOPE_LABEL[scope.value]} (${scope.count})`} open={scopeOpen} scoped={scope.value !== 'all'} onClick={() => setScopeOpen((o) => !o)} />
          <Dropdown open={scopeOpen} onClose={() => setScopeOpen(false)} align="left" sheetTitle="Show">
            {(Object.keys(TASK_SCOPE_LABEL) as TaskScope[]).map((k) => (
              <DropdownItem key={k} role="menuitemradio" checked={scope.value === k} onSelect={pick(() => scope.onChange(k))}>{TASK_SCOPE_LABEL[k]}</DropdownItem>
            ))}
            {/* (gaps build, package C — 16) on a phone the toolbar is one row: whose tasks rides in this sheet */}
            {sheet && source ? <><DropdownDivider />{(Object.keys(TASK_SOURCE_LABEL) as TaskSource[]).map((k) => (
              <DropdownItem key={`src-${k}`} role="menuitemradio" checked={source.value === k} onSelect={pick(() => source.onChange(k))}>{k === 'all' ? 'Leads and projects' : TASK_SOURCE_LABEL[k]}</DropdownItem>
            ))}</> : null}
          </Dropdown>
          {/* (gaps build, package C — 16) whose tasks: All · Leads · Projects */}
          {source && !sheet ? (
            <span className={styles.source} data-testid="task-source">
              <SegmentedButton aria-label="Whose tasks" selectedKeys={[source.value]} onSelectionChange={(keys) => { const k = [...keys][0]; if (k === 'all' || k === 'leads' || k === 'projects') source.onChange(k) }}>
                {(Object.keys(TASK_SOURCE_LABEL) as TaskSource[]).map((k) => <SegmentedButtonItem key={k} id={k}>{TASK_SOURCE_LABEL[k]}</SegmentedButtonItem>)}
              </SegmentedButton>
            </span>
          ) : null}
          {todos?.length ? (
            <span className={styles.todos} data-testid="task-todos">
              {/* (responsive audit W2-04) a phone's chips have a line of their own and say only their glyph and count, as they did beside the pill */}
              {todos.map((t) => (
                <Tooltip key={t.key} label={t.label} disabled={!(compact || sheet)}>
                  <ScopePill tone="attention" icon={t.icon} menu={false} label={t.label} short={t.short} compact={compact || sheet} selected={t.selected} onClick={t.onClick} />
                </Tooltip>
              ))}
            </span>
          ) : null}
        </span>
      ) : (views ?? <h2 className={styles.title}>All Tasks</h2>)}
      <div className={styles.actions}>
        {bare ? null : (<>
        {inHeader ? null : <AddTaskButton onAdd={onAdd} />}
        <ToolbarSearch query={query} onQuery={onQuery} placeholder={searchPlaceholder ?? 'Search title, member, tag…'} label="Search tasks" />
        <span className={styles.filterWrap}>
          <Tooltip label="Filters" shortcut="filters">
            <IconButton icon="filter_list" data-kb="filters" data-kb-label="Filters" label={filterCount ? `Filters (${filterCount} active)` : 'Filters'}
                        onClick={onFilter} selected={filterCount > 0} />
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
        {inHeader ? null : <TasksMoreButton onMenu={onMenu} />}
      </div>
    </div>
  )
}
