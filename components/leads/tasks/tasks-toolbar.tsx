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
import { TOUCH_TABLET, useMediaQuery } from '@/lib/breakpoint'
import { TASK_SCOPE_LABEL, TASK_SCOPES_IN_PILL, TASK_SOURCE_IN, TASK_SOURCE_LABEL, type TaskScope, type TaskSource } from '@/lib/leads/task-filters'
import { DropdownDivider } from '@/components/leads/dropdown'
import styles from './tasks-toolbar.module.css'

export type TasksMenuAction = 'saveAll' | 'manage' | 'export' | 'deleteAll'
export type TasksToolbarProps = {
  /** (REG-735) The list is empty (not filtered): only the title and ⋮ — the empty card carries the ways in, and search, Filters and
      the columns have nothing to act on yet. The first record brings them back. */
  bare?: boolean
  query: string
  onQuery: (q: string) => void
  /** New task ▾ (902:26678; the calm UI build 2026-10-27, W-021): Blank task · From a template. */
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
  /** Header kebab (902:27154): Save as a template · Templates · Export all… · Delete all. */
  onMenu: (action: TasksMenuAction) => void
  /** (REG-466) On the rail's Tasks page Add Task and the kebab sit in the page header, as the Leads header carries Add Lead and its kebab. */
  inHeader?: boolean
  /** (gaps build, package C — 16) The rail's Tasks page: whose tasks — All · Leads · Projects. (the calm UI build 2026-10-27, 1-06 · 1-26) It rides in
      the scope pill's menu at every width, as it did on a phone — the segment beside the pill was a second look for the same "narrow the list". */
  source?: { value: TaskSource; onChange: (s: TaskSource) => void }
  /** (simplify S-03 · S-06) On a project: the Tasks group's view switch (All tasks · Compliance) in the "All Tasks" title's place. */
  views?: ReactNode
}

/**
 * New task ▾ (902:26678): Blank task · From a template (the calm UI build 2026-10-27, 1-11 · 2-13 · 3-12, W-007 · W-021 — one create verb,
 * "New …", sentence case; was Add Task ▾: Create New Task · Use Template). On the tab the primary outlined button with a trailing chevron; in
 * the rail page's header the Leads header's filled primary with the plus. ≤767 (REG-354) the glyph alone — the menu, its title and every
 * action behind it are the same.
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
        <Tooltip label="New task" disabled={open} shortcut="create">
          <IconButton icon="add" label="New task" variant={header ? 'filled' : 'primary'} aria-haspopup="menu" aria-expanded={open} data-kb="create" data-kb-label="New task" onClick={() => setOpen((o) => !o)} />
        </Tooltip>
      ) : header ? (
        <Button iconStart={<Icon name="add" size={20} />} aria-haspopup="menu" aria-expanded={open} data-kb="create" data-kb-label="New task" onPress={() => setOpen((o) => !o)}>New task</Button>
      ) : (
        /* (Leads on the move, L4 — C-02) no overlay of ours: the DS button keeps its own box, the icon buttons the house 44 */
        <Button
          variant="primary" appearance="outlined"
          iconEnd={<span className={styles.chev} data-open={open || undefined}><Icon name="keyboard_arrow_down" size={20} /></span>}
          aria-haspopup="menu" aria-expanded={open} data-kb="create" data-kb-label="New task"
          onPress={() => setOpen((o) => !o)}
        >
          New task
        </Button>
      )}
      <Dropdown open={open} onClose={() => setOpen(false)} align={header ? 'right' : 'left'} sheetTitle="New task">
        <DropdownItem onSelect={pick(() => onAdd('new'))}>Blank task</DropdownItem>
        <DropdownItem onSelect={pick(() => onAdd('template'))}>From a template</DropdownItem>
        {projectId && fromQuote ? <DropdownItem onSelect={pick(() => setQuoteOpen(true))} help="The signed quote’s lines, by section">Suggest tasks from the quote</DropdownItem> : null}
      </Dropdown>
      {projectId ? <QuoteTasksDialog open={quoteOpen} projectId={projectId} onClose={() => setQuoteOpen(false)} /> : null}
    </span>
  )
}

/** The kebab (902:27154): Save as a template · Templates · Export all… · Delete all (the calm UI build 2026-10-27, W-636 · 1-42 — sentence
    case, one ellipsis; was Save all as Template · Manage Templates · Export all as... · Delete all). `deleteAll={false}` — the rail's Tasks page
    (1-42): Delete all left its menu, a one-press neighbour of Export over the studio's every task; select all + the bulk bar's Delete all does it. */
export function TasksMoreButton({ onMenu, group, deleteAll = true }: { onMenu: (action: TasksMenuAction) => void; /** (gaps build, package C — 16) the Tasks page's Group by project */ group?: { on: boolean; onToggle: () => void }; deleteAll?: boolean }) {
  const [open, setOpen] = useState(false)
  const pick = (fn: () => void) => () => { setOpen(false); fn() }
  return (
    <span className={styles.menuWrap}>
      <Tooltip label="More options" disabled={open}>
        <IconButton icon="more_vert" label="More options" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)} />
      </Tooltip>
      <Dropdown open={open} onClose={() => setOpen(false)} align="right" sheetTitle="All tasks">
        <DropdownItem onSelect={pick(() => onMenu('saveAll'))}>Save as a template</DropdownItem>
        <DropdownItem onSelect={pick(() => onMenu('manage'))}>Templates</DropdownItem>
        <DropdownItem onSelect={pick(() => onMenu('export'))}>Export all…</DropdownItem>
        {deleteAll ? <DropdownItem tone="danger" onSelect={pick(() => onMenu('deleteAll'))}>Delete all</DropdownItem> : null}   {/* (REG-728) the row's own tone */}
        {group ? <><DropdownDivider /><DropdownItem role="menuitemcheckbox" checked={group.on} onSelect={pick(group.onToggle)}>Group by project</DropdownItem></> : null}
      </Dropdown>
    </span>
  )
}

/**
 * Lead Details › Tasks — toolbar row (902:26378 "Section items", spec 01-listing-table.txt):
 * "All tasks" · New task (primary outlined, trailing chevron) · Search 280 · Filters · kebab.
 * Menus toggle on their own trigger (REG-153); every icon-only control carries a Tooltip (REG-75).
 */
export function TasksToolbar({ query, onQuery, onAdd, onFilter, onColumns, filterCount, onMenu, scope, todos, searchPlaceholder, inHeader = false, bare = false, source, views }: TasksToolbarProps) {
  const [scopeOpen, setScopeOpen] = useState(false)
  const sheet = useSheetLayout()
  /* (Dane's Tasks review, 2026-10-27) a finger can't hover a chip to read its tooltip: on a phone and a touch tablet the to-do chips say their
     words ("Overdue · 9") and sit in one row that swipes sideways when they don't all fit */
  const touchTablet = useMediaQuery(TOUCH_TABLET)
  const spelled = sheet || touchTablet
  const pick = (fn: () => void) => () => { setScopeOpen(false); fn() }
  /* (pending modules S46C · H4) The to-do chips don't always fit beside the scope and the search — an expanded rail, a 1280 screen: then every
     chip says only its glyph and count (its words stay its name and its tooltip), and the full words come back once the row has room for them.
     Measured, never guessed. (the calm UI build 2026-10-27, 1-27 · T-15) Never on a phone: there the chips have a line of their own and keep
     their words — a clock and a number don't say "overdue". */
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

  /* (Dane's Tasks review, 2026-10-27) the Leads listing's "View all" (Dane's UAT 1.05): while the pill holds a narrower scope, one press back to
     All tasks. Where the row has no room for it beside the pill and the tools (a long scope at 320) it folds away, as on Leads — the pill's sheet
     opens on All tasks, its first row. Measured, never guessed.
     (Dane's Tasks review, merged 2026-10-28 — change 10 on the calm build's pill) the pill holds whose tasks too now (1-26: the Leads · Projects
     switch is its menu's second group), so View all reads the pill as the Leads listing's does: it stands while the pill is off its default
     (the applied dot) and one press puts the whole pill back — All tasks, Leads and projects. Search and Filters stay; a picked to-do chip is let
     go, as picking a row of the pill's menu lets it go (lead-tasks.tsx `scope.onChange` · `source.onChange`). */
  const pillScoped = !!scope && (scope.value !== 'all' || (!!source && source.value !== 'all'))
  const viewAll = !!scope && !bare && pillScoped
  const viewAllPress = () => { if (scope && scope.value !== 'all') scope.onChange('all'); if (source && source.value !== 'all') source.onChange('all') }
  const barRef = useRef<HTMLDivElement>(null)
  const pillRef = useRef<HTMLButtonElement>(null)
  const viewAllRef = useRef<HTMLSpanElement>(null)
  const actionsRef = useRef<HTMLDivElement>(null)
  const [folded, setFolded] = useState(false)
  useEffect(() => {
    const bar = barRef.current, pill = pillRef.current, btn = viewAllRef.current, actions = actionsRef.current
    if (!viewAll || !bar || !pill || !btn || !actions) return
    const ro = new ResizeObserver(() => {
      /* the pill at its full words — a pill already squeezed to "Studi…" reads narrower than it needs (its label's hidden overflow added back) */
      const cut = Math.max(0, ...[...pill.querySelectorAll('*')].filter((el) => getComputedStyle(el).textOverflow === 'ellipsis').map((el) => el.scrollWidth - el.clientWidth))
      const tools = getComputedStyle(actions).display === 'none' ? 0 : actions.offsetWidth + 16   // the row's 16 gap before the tools
      setFolded(bar.clientWidth < pill.offsetWidth + cut + 8 + btn.offsetWidth + tools)   // View all sits 8 after the pill
    })
    ro.observe(bar); ro.observe(pill); ro.observe(btn); ro.observe(actions)
    return () => ro.disconnect()
  }, [viewAll])

  return (
    <div className={styles.bar} ref={barRef}>
      {scope && !bare ? (
        /* (REG-466) The rail's Tasks page: the listing's "All leads ▾" chip — All tasks · My tasks · General tasks, with the open count.
           (REG-729) The house scope pill (components/om/scope-pill), as the listing's: the applied dot off "All tasks" (REG-295), the 4% hover.
           (the calm UI build 2026-10-27, 1-06 · 1-25 · T-07) The count the house way, "Label · n"; Unassigned left the pill for its chip
           (TASK_SCOPES_IN_PILL); whose tasks — leads, projects — is the menu's second group at every width, and the pill names it once picked. */
        <span className={styles.scopeWrap} ref={wrapRef}>
          {/* (Dane's Tasks review, 2026-10-27) the pill and its menu in their own box: where the chips take a line of their own the scope box
              steps aside (`display: contents`) and the menu lost its anchor — on a touch tablet it opened ~4,000px down the page */}
          <span className={styles.pillWrap}>
          <ScopePill ref={pillRef} label={`${TASK_SCOPE_LABEL[scope.value]}${source ? TASK_SOURCE_IN[source.value] : ''} · ${scope.count}`} open={scopeOpen}
                     scoped={pillScoped} onClick={() => setScopeOpen((o) => !o)} />
          <Dropdown open={scopeOpen} onClose={() => setScopeOpen(false)} align="left" sheetTitle="Show">
            {[...TASK_SCOPES_IN_PILL, ...(TASK_SCOPES_IN_PILL.includes(scope.value) ? [] : [scope.value])].map((k) => (
              <DropdownItem key={k} role="menuitemradio" checked={scope.value === k} onSelect={pick(() => scope.onChange(k))}>{TASK_SCOPE_LABEL[k]}</DropdownItem>
            ))}
            {/* (gaps build, package C — 16) whose tasks: Leads and projects · Leads · Projects — (the calm UI build 2026-10-27, 1-26) here at every
                width, as a phone had it; the segment that stood beside the pill on a desk was the same choice in a second look */}
            {source ? <><DropdownDivider /><div data-testid="task-source" role="group" aria-label="Whose tasks">{(Object.keys(TASK_SOURCE_LABEL) as TaskSource[]).map((k) => (
              <DropdownItem key={`src-${k}`} role="menuitemradio" checked={source.value === k} onSelect={pick(() => source.onChange(k))}>{k === 'all' ? 'Leads and projects' : TASK_SOURCE_LABEL[k]}</DropdownItem>
            ))}</div></> : null}
          </Dropdown>
          </span>
          {viewAll ? (
            <span ref={viewAllRef} className={styles.viewAll} data-folded={folded || undefined} inert={folded || undefined} aria-hidden={folded || undefined}>
              <Button appearance="text" onPress={viewAllPress} data-testid="view-all-tasks">View all</Button>
            </span>
          ) : null}
          {/* (Dane's Tasks review, merged 2026-10-28) change 11's rule between View all and the Leads · Projects switch is not drawn: the switch is the
              pill menu's second group now (the calm UI build 1-26) — nothing stands after View all to divide from */}
          {todos?.length ? (
            <span className={styles.todos} data-testid="task-todos" data-spelled={spelled || undefined}>
              {/* (responsive audit W2-04) a phone's chips have a line of their own — (the calm UI build 2026-10-27, 1-27) and keep their words;
                  (Dane's Tasks review, 2026-10-27 — change 4) so do a touch tablet's, on one row of their own that swipes sideways */}
              {todos.map((t) => (
                <Tooltip key={t.key} label={t.label} disabled={spelled || !compact}>
                  <ScopePill tone="attention" icon={t.icon} menu={false} label={t.label} short={spelled ? undefined : t.short} compact={!spelled && compact} selected={t.selected} onClick={t.onClick} />
                </Tooltip>
              ))}
            </span>
          ) : null}
        </span>
      ) : (views ?? <h2 className={styles.title}>All tasks</h2>)}
      <div className={styles.actions} ref={actionsRef}>
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
