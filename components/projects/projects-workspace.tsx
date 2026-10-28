'use client'

import { unsentWords } from '@/lib/notifications/held'   // (simplify round 2)
import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Button, SegmentedButton, SegmentedButtonItem } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { StatTile, StatTiles } from '@/components/om/stat-tile'
import { EmptyState } from '@/components/om/empty-state'
import { useSnackbar } from '@/components/om/snackbar'
import { ColumnSettingsDrawer } from '@/components/om/column-settings'
import { useTableColumns } from '@/components/om/table-columns'
import { PageHeader } from '@/components/shell/page-header'
import { GHOST_MIN_MS, PageReveal } from '@/components/shell/page-reveal'
import { Dropdown, DropdownItem } from '@/components/leads/dropdown'
import { BulkBar } from '@/components/leads/bulk-bar'
import { AssignPopover } from '@/components/leads/assign-popover'
import { ExportDialog } from '@/components/leads/export-dialog'
import { TabSearchEmpty } from '@/components/leads/tasks/tab-search-empty'
import { useRun } from '@/components/leads/tasks/use-run'
import { GhostShape, useRememberShape } from '@/lib/ghost-shape'
import { useShortcut } from '@/lib/keys/store'
import { useMaisonAi, type MaisonSuggestion } from '@/lib/maison-ai'
import { lateMilestones } from '@/app/projects/maison-actions'   // (gaps build I)
import { answerQuestion } from '@/lib/maison-ai/answer'   // (parity map, PR-059)
import { MOBILE, usableViewportHeight, useMediaQuery } from '@/lib/breakpoint'
import { copyText } from '@/lib/clipboard'
import { withFrom } from '@/lib/nav'
import { moneyCompact } from '@/lib/format'
import { filterByQuery } from '@/lib/search'
import { addLeadMembers, assignMembers } from '@/app/leads/actions'
import { openLeadDesign } from '@/app/visualizer/actions'
import { createDirectProject, putProjectOnHold, renameProject, resumeProject, undoHoldChange, type HoldUndo, type NewProjectInput } from '@/app/projects/actions'
import { HoldProjectDialog } from './project-record-dialogs'   // (gaps build, package A — M-01)
import { DUPLICATE_NAME, STAGE_LABEL, TEAM_NEEDED, type ProjectRow, type ProjectsListData } from '@/lib/projects/model'
import { PROJECT_COLUMNS, projectColumns, projectStatement } from './project-columns'
import { ProjectsTable, type ProjectSort } from './projects-table'
import { ProjectCards } from './project-cards'
import { ProjectsToolbar } from './projects-toolbar'
import { ProjectsFiltersModal } from './projects-filters-modal'
import { NewProjectDialog } from './new-project-dialog'
import { RenameProjectDialog } from './project-dialogs'
import { ProjectsGhost, TILE_LABELS } from './projects-ghost'
import type { ProjectMenuAction } from './project-menu'
import { ClientAccessPanel } from '@/components/portal/client-access-panel'
import { useProjectEnding } from './ending/use-project-ending'   // (Projects round 7)
import { DeletedProjectsSheet } from './deleted-projects-sheet'
import { SCOPES, inScope, isScope, reviewLine, type ProjectScope, type ScopeContext } from './scopes'
import { mayReviewUpdate } from '@/lib/projects/updates-model'
import { EMPTY_PROJECT_FILTERS, activeProjectFilterCount, applyProjectFilters, isSortKey, type ProjectFilters } from './filters'
import pageStyles from '@/app/leads/leads.module.css'
import styles from './projects-workspace.module.css'
import { WorkloadView, CapacityDialog } from './workload/workload-view'   // (gaps build I)
import { ContractorsView } from './contractors/contractors-view'   // (S45B · H-UHD-2)
import { CONTRACTORS_OF_KEY } from './contractors/keys'
import { boardOf } from '@/lib/projects/contractors-model'
import { dayOf } from '@/lib/projects/schedule-model'
import { setCapacities } from '@/app/projects/workload-actions'
import { workloadOf, workloadPeople } from '@/lib/projects/workload'
import { setFlagPref, useFlagPref } from '@/lib/prefs'
import { ProjectLayoutsDialog } from '@/components/planner/project-layouts-dialog'

/** What the address carries (REG-926, the report: "filters, search and sort stay in the address"). */
export type ProjectsUrlState = { scope: string | null; q: string | null; sort: string | null; type: string | null; team: string | null; col: string | null; dir: string | null; new: string | null
  /** (fix-E, E-28) A deleted project's address landed here: it is said once, and the snackbar's Open opens Deleted Projects. */
  deleted?: { id: string; number: string } | null
  /** (gaps build I, I-Q1) `?view=workload` — the Workload view, for whoever sees it */
  view?: string | null
  /** (S45B · H-UHD-2) `?of=contractors` — the Workload view's Contractors */
  of?: string | null }

const TILE_SCOPE: Record<(typeof TILE_LABELS)[number], ProjectScope> = { 'In progress': 'in_progress', 'Needs your attention': 'attention', 'Waiting on client': 'waiting', 'Completing this month': 'month' }   // (the calm UI build 2026-10-27, T-01)
/** (the calm UI build 2026-10-27, 3-11) the tiles as one line on a phone — each fact a door to its scope, a zero left out */
const PHONE_WORDS: Partial<Record<ProjectScope, (n: number) => string>> = {
  attention: (n) => `${n} need${n === 1 ? 's' : ''} your attention`, waiting: (n) => `${n} wait${n === 1 ? 's' : ''} on the client`,
  month: (n) => `${n} finish${n === 1 ? 'es' : ''} this month`, in_progress: (n) => `${n} in progress`,
}
const PHONE_ORDER: ProjectScope[] = ['attention', 'waiting', 'month', 'in_progress']
/** (the calm UI build 2026-10-27, 3-38) the tiles count open projects: they stand where the list shows open work, never on Completed */
const TILES_IN: readonly ProjectScope[] = ['open', 'all', 'mine', 'attention', 'waiting', 'month', 'review', 'setting_up', 'in_progress', 'on_hold']
const list = (v: string | null) => (v ? v.split(',').map((x) => x.trim()).filter(Boolean) : [])

/**
 * (REG-924…927) Projects — the listing. The Leads listing's model (REG-430): the L1 header with New project (C) and ⋮ (Export · Projects
 * Settings); the tiles that filter when pressed (Q-06: In progress · Needs attention · Waiting on client · Completing this month, and the open
 * projects' contract value for Owners and Admins); the scope pill (Completed hidden until asked, Q-25); search, Filters that apply live and
 * Column settings; the table on the core with selection and its bulk bar (Assign · Export), or the cards on a phone. The view lives in the
 * address. Who sees: the lead's rule, on the server.
 * (Lead ↔ Project parity, package K-D2) The Leads listing's grammar: the header's outlined Insights after New project, Tickets in ⋮ with its
 * count (P-21, Q-06); the Members cell assigns from the row and the card (P-17); the scope menu in the lead's order with Mine (P-20); the
 * chosen view remembered per browser, the address winning (P-24); Export as the lead's statement, the bulk bar's on the selection (P-25).
 */
export function ProjectsWorkspace({ data, url }: { data: ProjectsListData; url: ProjectsUrlState }) {
  const { team, now, viewer } = data
  const router = useRouter()
  const pathname = usePathname()
  const snackbar = useSnackbar()
  const { run } = useRun()
  const phone = useMediaQuery(MOBILE)
  useRememberShape('projects', data.rows.length === 0)

  /* ── the view, read from the address once, written back as it changes ── */
  const [scope, setScope] = useState<ProjectScope>(isScope(url.scope) ? url.scope : 'open')
  const [query, setQuery] = useState(url.q ?? '')
  const [filters, setFilters] = useState<ProjectFilters>({ sort: isSortKey(url.sort) ? url.sort : 'newest', types: list(url.type), team: list(url.team) })
  /* (parity P-22) only a column that sorts: an old address naming Members or Project type (labels now, REG-468) sorts nothing */
  const [sort, setSort] = useState<ProjectSort>(url.col && PROJECT_COLUMNS.some((c) => c.key === url.col && c.sort) ? { key: url.col, dir: url.dir === 'desc' ? 'desc' : 'asc' } : null)
  /* (gaps build I, I-Q1) the Workload view — Owners, Admins and Managers; the address keeps it, the ghost remembers who sees the switch */
  const wl = data.workload ?? null
  /* (S45B · H-UHD-2) the view's Contractors — everyone who works on projects; Members stays the Owners', Admins' and Managers' */
  const cb = data.contractors ?? null
  const [storedOf, rememberOf] = useFlagPref(CONTRACTORS_OF_KEY, false)
  const [chosenOf, setChosenOf] = useState<'members' | 'contractors' | null>(url.of === 'contractors' ? 'contractors' : url.of === 'members' ? 'members' : null)
  const of: 'members' | 'contractors' = !cb ? 'members' : !wl ? 'contractors' : chosenOf ?? (storedOf ? 'contractors' : 'members')
  const setOf = (v: 'members' | 'contractors') => { setChosenOf(v); rememberOf(v === 'contractors') }
  /* (parity P-24, B-13) the chosen view is remembered per browser, as Leads' table / kanban (`om.leads.view`): the address wins
     (`?view=workload` · `?view=list`), else the last one chosen here, else the table */
  const [storedWorkload, rememberWorkload] = useFlagPref('om.projects.workload', false)
  const [chosenView, setChosenView] = useState<'list' | 'workload' | null>(url.view === 'workload' || url.view === 'list' ? url.view : null)
  const view: 'list' | 'workload' = chosenView ?? (storedWorkload ? 'workload' : 'list')
  const setView = (v: 'list' | 'workload') => { setChosenView(v); rememberWorkload(v === 'workload') }
  const workload = (!!wl || !!cb) && view === 'workload'
  useEffect(() => { setFlagPref('om.shape.projects.views', !!wl || !!cb); setFlagPref('om.shape.projects.insights', !!wl) }, [wl, cb])   // (S45B) the toggle and Insights apart
  useEffect(() => {
    const p = new URLSearchParams()
    if (workload) p.set('view', 'workload')   // (gaps build I)
    if (workload && of === 'contractors' && wl) p.set('of', 'contractors')   // (S45B)
    if (scope !== 'open') p.set('scope', scope)
    if (query.trim()) p.set('q', query.trim())
    if (filters.sort !== 'newest') p.set('sort', filters.sort)
    if (filters.types.length) p.set('type', filters.types.join(','))
    if (filters.team.length) p.set('team', filters.team.join(','))
    if (sort) { p.set('col', sort.key); p.set('dir', sort.dir) }
    const next = p.toString()
    if (next !== window.location.search.replace(/^\?/, '')) router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false })
  }, [scope, query, filters, sort, pathname, router, workload, of, wl])
  const here = () => `${window.location.pathname}${window.location.search}`
  const [capacityOpen, setCapacityOpen] = useState(false)

  /* ── the pipeline: scope → Filters → search → a head's sort ── */
  const registry = useMemo(() => projectColumns(data.totalValueMinor !== null, data.margins !== false && data.totalValueMinor !== null), [data.totalValueMinor, data.margins])   // (pending modules S41b-1)
  const columnPrefs = useTableColumns('projects', registry, phone)
  /* (parity P-17) a row's members as just picked, until the server's rows arrive (the Leads listing's optimistic assignees) */
  const [optimisticTeam, setOptimisticTeam] = useState<Record<string, string[]>>({})
  const [seenRows, setSeenRows] = useState(data.rows)
  if (seenRows !== data.rows) { setSeenRows(data.rows); setOptimisticTeam({}) }
  const rows = useMemo(() => (Object.keys(optimisticTeam).length === 0 ? data.rows : data.rows.map((r) => {
    const ids = optimisticTeam[r.id]
    return ids ? { ...r, team: ids.map((id) => team.find((m) => m.id === id)).filter((m): m is NonNullable<typeof m> => !!m).map((m) => ({ id: m.id, name: m.name, color: m.color })) } : r
  })), [data.rows, optimisticTeam, team])
  const ctx = useMemo<ScopeContext>(() => ({ now, me: viewer.id }), [now, viewer.id])   // (parity P-20) Mine reads who is looking
  const counts = useMemo(() => Object.fromEntries(SCOPES.map((s) => [s.key, rows.filter((r) => inScope(r, s.key, ctx)).length])) as Record<ProjectScope, number>, [rows, ctx])
  const filtered = useMemo(() => {
    const scoped = applyProjectFilters(rows.filter((r) => inScope(r, scope, ctx)), filters)
    const found = filterByQuery(scoped, query, (r) => ({ fields: [r.name, r.number, r.client, r.property, r.propertyType, r.projectType, STAGE_LABEL[r.stage], ...r.team.map((m) => m.name)], phones: [r.phone] }))
    if (!sort) return found
    const def = registry.find((c) => c.key === sort.key)
    return def?.sort ? [...found].sort((a, b) => (sort.dir === 'asc' ? 1 : -1) * def.sort!(a, b)) : found
  }, [rows, scope, filters, query, sort, registry, ctx])
  const filterCount = activeProjectFilterCount(filters)
  const nothingMatches = rows.length > 0 && filtered.length === 0
  /* (fix-A, A-24) ONE sort, as the Leads listing's "the two never fight": a heading's sort sets the base order back to the default, an order
     picked in Filters (or its Clear All) takes the heading's off */
  const cycleSort = (key: string) => {
    setSort((s) => (s?.key !== key ? { key, dir: 'asc' } : s.dir === 'asc' ? { key, dir: 'desc' } : null))
    setFilters((f) => (f.sort === 'newest' ? f : { ...f, sort: 'newest' }))
  }
  const applyFilters = (next: ProjectFilters) => { if (next.sort !== filters.sort) setSort(null); setFilters(next) }
  const headSort = sort ? registry.find((c) => c.key === sort.key)?.label ?? null : null

  /* ── selection + the bulk bar ── */
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const live = useMemo(() => new Set([...selected].filter((id) => filtered.some((r) => r.id === id))), [selected, filtered])
  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const toggleAll = () => setSelected((s) => (filtered.length && filtered.every((r) => s.has(r.id)) ? new Set() : new Set(filtered.map((r) => r.id))))
  /* `id`: the row whose Members cell asked (parity P-17) — null for the bulk bar's Assign */
  const [assign, setAssign] = useState<{ id: string | null; el: HTMLElement; top: number; left: number } | null>(null)
  const anchorAt = (el: HTMLElement, id: string | null = null) => { const r = el.getBoundingClientRect(); return { id, el, top: Math.max(16, Math.min(r.bottom + 4, usableViewportHeight() - 456 - 16)), left: Math.max(16, Math.min(r.left, window.innerWidth - 400 - 16)) } }
  const assignRow = assign?.id ? rows.find((r) => r.id === assign.id) ?? null : null
  const openAssign = (r: ProjectRow, el: HTMLElement) => setAssign(anchorAt(el, r.id))

  /* ── dialogs ── */
  const [newOpen, setNewOpen] = useState(false)
  const openNew = useCallback(() => setNewOpen(true), [setNewOpen])   // the setter named, so the React Compiler keeps this memo
  /* ⌘K's Create lands here with `?new=1`: New project opens as the page reveals (GHOST_MIN_MS), never under the ghost; the address drops it. */
  const [landNew] = useState(url.new === '1')   // read once: the address sync below drops `new` from the URL
  /* (parity map, PR-059 — 1.0's mAIson made a project) New project filled in: Maison AI's "Start a new project for …" lands with
     `?new=1&client=&phone=&ptype=` — on arrival, or while the listing is open (the address changes under it); the next C opens empty */
  const params = useSearchParams()
  const fillFrom = (p: { get: (k: string) => string | null }) => {
    const f = { client: (p.get('client') ?? '').slice(0, 80), phone: (p.get('phone') ?? '').replace(/\D/g, '').slice(0, 8), propertyType: (p.get('ptype') ?? '').slice(0, 60) }
    return f.client || f.phone || f.propertyType ? f : null
  }
  const [newFill, setNewFill] = useState(() => (url.new === '1' ? fillFrom(params) : null))
  const [seenNew, setSeenNew] = useState(url.new)
  if (url.new !== seenNew) { setSeenNew(url.new); if (url.new === '1') { setNewFill(fillFrom(params)); setNewOpen(true) } }
  useEffect(() => {
    if (!landNew) return
    const t = setTimeout(() => setNewOpen(true), GHOST_MIN_MS)
    return () => clearTimeout(t)
  }, [landNew])
  useShortcut('create', openNew, true, 'New project')   // (REG-713) C
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [columnsOpen, setColumnsOpen] = useState(false)
  const [kebabOpen, setKebabOpen] = useState(false)
  const [plannerFor, setPlannerFor] = useState<{ id: string; name: string } | null>(null)   // (gaps build J) a row's layouts
  /* (fix-A, A-04 · parity P-25) Export: null closed, [] from ⋮, the selection from the bulk bar ("Selected projects") */
  const [exportSel, setExportSel] = useState<ProjectRow[] | null>(null)
  const [renaming, setRenaming] = useState<ProjectRow | null>(null)
  const [accessFor, setAccessFor] = useState<string | null>(null)   // (Projects r4a) the Client access panel's lead
  const [holdFor, setHoldFor] = useState<ProjectRow | null>(null)   // (gaps build, package A — M-01) the row menu's Put on hold…
  /* (Projects round 7) the ending's dialogs from the row menu, and the Deleted projects sheet from ⋮ */
  const ending = useProjectEnding({ origin: '/projects' })
  const [trashOpen, setTrashOpen] = useState(false)
  /* (fix-E, E-28) A deleted project's address (its page, a tab, a file, an old bell row) lands here and says where it went — once, as the page
     reveals; the address sync above drops `deleted` from the URL. */
  const [landDeleted] = useState(url.deleted ?? null)
  useEffect(() => {
    if (!landDeleted) return
    const t = setTimeout(() => snackbar({ message: `${landDeleted.number} is in Deleted projects`, actionLabel: 'Open', onAction: () => setTrashOpen(true) }), GHOST_MIN_MS)
    return () => clearTimeout(t)
  }, [landDeleted, snackbar])

  const open = (r: ProjectRow) => router.push(withFrom(`/projects/${r.id}`, here()))
  const openInsights = () => router.push(withFrom('/company/reports/projects', here()))   // (gaps build I, I-Q6 · REG-1361) Company › Reports › Projects
  const onMenu = (r: ProjectRow, a: ProjectMenuAction) => {
    /* (parity P-09 · P-11, K-A2's menu) Edit details first in the row ⋮ too: the project page opens its one form on arrival (`?edit=1`) */
    if (a === 'edit') router.push(withFrom(`/projects/${r.id}?edit=1`, here()))
    else if (a === 'rename') setRenaming(r)
    else if (a === 'lead') router.push(withFrom(`/leads/${r.leadId}`, here()))
    else if (a === 'quote' && r.quoteId) router.push(withFrom(`/quotes/${r.quoteId}`, here()))
    else if (a === 'contract' && r.contractId) router.push(withFrom(`/contracts/${r.contractId}`, here()))
    else if (a === 'copy') void copyText(`${window.location.origin}/projects/${r.id}`).then(() => snackbar({ message: 'Link copied' }), () => snackbar({ message: 'Couldn’t copy — please try again' }))
    else if (a === 'access') setAccessFor(r.leadId)
    else if (a === 'complete') ending.open(r.ends?.requested && r.ends.runs ? 'review' : 'complete', { id: r.id, name: r.name })   // (Projects round 7)
    else if (a === 'reopen') ending.open('reopen', { id: r.id, name: r.name })
    else if (a === 'delete') ending.open('delete', { id: r.id, name: r.name })
    else if (a === 'hold') setHoldFor(r)   // (gaps build, package A — M-01)
    else if (a === 'resume') void run('resume the project', async () => {
      const res = await resumeProject(r.id); if ('error' in res) return res
      snackbar({ message: `${r.name} is running again`, actionLabel: 'Undo', onAction: holdUndo(res.undo, `${r.name} is on hold again`) })
    }, undefined, { refresh: true })
    else if (a === 'visualizer') {   // (fix-A) 1.0's Photo Renders: the row's lead's design, found or made on first open (Q-30: nothing metered)
      const back = here()
      void openLeadDesign(r.leadId).catch(() => ({ error: 'Couldn’t open the design — please try again' }))
        .then((res) => { if ('error' in res) snackbar({ message: res.error }); else router.push(withFrom(`/visualizer/${res.id}`, back)) })
    }
    else if (a === 'planner') setPlannerFor({ id: r.id, name: r.name })   // (gaps build J, J-Q3)
  }
  const holdUndo = (u: HoldUndo, back: string) => () => { void run('put it back', async () => { const x = await undoHoldChange(u); if (!('error' in x)) snackbar({ message: `${back}${unsentWords(x.unsent)}` }); return x }, undefined, { refresh: true }) }   // (simplify round 2) the Undo says when it kept the client's message from going
  /* (parity P-25, B-15) the Leads listing's statement: which · the period on Start date · every column or the list's own · the format */
  const statement = useMemo(() => projectStatement(registry), [registry])
  const createProject = async (input: NewProjectInput): Promise<boolean | { error: string }> => {
    let made: { id: string; number: string } | null = null
    let onField: string | null = null   // (gaps build, package A — 10) a taken name · (S42F) a team with nobody on it — said on the form's field, not in a snackbar
    const ok = await run('create the project', async () => { const r = await createDirectProject(input); if ('error' in r) { if (r.error === DUPLICATE_NAME || r.error === TEAM_NEEDED) { onField = r.error; return null } return r } made = r; return null })
    const field = onField as string | null
    if (field) return { error: field }
    const m = made as { id: string; number: string } | null
    if (ok && m) { snackbar({ message: `Project ${m.number} created` }); router.push(withFrom(`/projects/${m.id}`, here())) }   // (simplify Q-16) Create opens the new project — its Start is the next step
    return ok
  }

  /* ── Maison AI: from the studio's own rows — (gaps build I, I-Q16 · I-Q17) the suggestions do things now, nothing metered (Q-30) ── */
  const late = rows.find((r) => r.attention.length > 0)
  const maison = useMemo<MaisonSuggestion[]>(() => [
    { label: 'Find late milestones', answer: async () => {
      const r = await lateMilestones()
      if ('error' in r) return { title: 'Nothing to show', text: r.error }
      return r.rows.length
        ? { title: `${r.rows.length} ${r.rows.length === 1 ? 'milestone' : 'milestones'} overdue`, text: 'Across every running project you see — open one on its schedule.',   // (parity P-34) "overdue": past its day now
            rows: r.rows.map((x) => ({ id: x.milestoneId, label: `${x.title} · ${x.project}`, meta: `${x.number} · ${x.days} ${x.days === 1 ? 'day' : 'days'} late`, href: withFrom(`/projects/${x.projectId}/schedule?open=${encodeURIComponent(x.milestoneId)}`, here()) })) }
        : { title: 'Nothing is overdue', text: 'Every running milestone is on time or done.' }
    } },
    late ? { label: `Open ${late.name}`, run: () => open(late) } : { label: 'Which projects need attention this week?', run: () => setScope('attention') },
    { label: 'Which updates are waiting for review?', run: () => setScope('review') },   // (REG-958, Q-30) a question, not a metered AI press
    /* (parity map, PR-059 — 1.0's mAIson create_project) by rule, from the records: a won lead with no project opens its own, a lead whose quote is
       confirmed or signed is one move from Won, and a client who came directly starts New project here — nothing made without the form */
    { label: 'Start a project', answer: async () => {
      const a = await answerQuestion({ question: 'Start a project', path: here() })
      return { ...a, rows: a.rows?.map((r) => (r.id === 'new' ? { id: r.id, label: 'Start a new project', meta: 'A client who came to you directly — the form opens', run: () => { setNewFill(null); setNewOpen(true) } } : r)) }
    } },
    ...(wl ? [{ label: 'Who has room for a new project?', answer: () => {
      const lines = workloadOf(rows, team, { id: viewer.id, role: viewer.role, teamIds: wl.teamIds }, wl.defaultCapacity).lines.filter((l) => l.person && l.state === 'room')
      return Promise.resolve(lines.length
        ? { title: `${lines.length} ${lines.length === 1 ? 'person has' : 'people have'} room`, text: 'By their capacity, against the running projects they carry.', rows: lines.map((l) => ({ id: l.person!.id, label: l.person!.name, meta: `${l.words} · ${l.count} of ${l.capacity}`, run: () => setView('workload') })) }
        : { title: 'Everyone is full', text: 'Nobody has room by their capacity — Set capacity on the Workload view, or share a project.', rows: [{ id: 'workload', label: 'Open the Workload view', run: () => setView('workload') }] })
    } } as MaisonSuggestion] : []),
    /* (S45B · H-UHD-2) by rule, from the records: the contractors with nothing booked this week, and the work starting with nobody on it */
    ...(cb && cb.contractors.some((c) => c.isActive) ? [{ label: 'Which contractors are free this week?', answer: () => {
      const b = boardOf(cb.contractors, cb.crew, cb.sites, cb.trades, dayOf(new Date(cb.now)))
      const free = b.lines.filter((l) => l.state === 'free' || l.state === 'room')
      const go = () => { setOf('contractors'); setView('workload') }
      return Promise.resolve(free.length
        ? { title: `${free.length} ${free.length === 1 ? 'contractor has' : 'contractors have'} room this week`, text: b.unstaffed.length ? `${b.unstaffed.length} ${b.unstaffed.length === 1 ? 'piece of work starts' : 'pieces of work start'} with no contractor.` : 'Every piece of work starting this week has its contractor.', rows: free.map((l) => ({ id: l.contractor.id, label: l.contractor.name, meta: `${l.contractor.trades.join(' · ')} · ${l.words}`, run: go })) }
        : { title: 'Every contractor is busy this week', text: 'By the sites they run at once, over the next seven days.', rows: [{ id: 'contractors', label: 'Open the contractors', run: go }] })
    } } as MaisonSuggestion] : []),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [late, wl, cb, rows, team, viewer.id, viewer.role])
  useMaisonAi(maison, live.size > 0)

  const total = data.totalValueMinor
  const tileValue = (l: (typeof TILE_LABELS)[number]) => counts[TILE_SCOPE[l]]
  const first = rows.length === 0

  return (
    <PageReveal skeleton={<GhostShape first={first}><ProjectsGhost /></GhostShape>}>
      <div className={pageStyles.body} style={{ position: 'relative' }} data-view={phone ? 'cards' : 'table'} data-testid="projects-workspace">
        <PageHeader title="Projects" actions={
          <>
            {first ? null : phone ? (
              <Tooltip label="New project" shortcut="create"><IconButton icon="add" label="New project" variant="filled" onClick={openNew} data-kb="create" data-kb-label="New project" /></Tooltip>
            ) : (
              <span data-kb="create" data-kb-label="New project"><Button iconStart={<Icon name="add" size={20} />} onPress={openNew}>New project</Button></span>
            )}
            {/* (the calm UI build 2026-10-27, 1-30 · W-217) the L1 header is title · New project · ⋮ — the reports' door (was the outlined
                "Insights" after New project) is the ⋮'s first row, "Reports", behind the same gate (Company › Reports › Projects: Owners, Admins,
                a Manager for their team — whoever sees the Workload view) */}
            <div style={{ position: 'relative' }}>
              <Tooltip label="More options" disabled={kebabOpen}><IconButton icon="more_vert" label="More options" aria-haspopup="menu" aria-expanded={kebabOpen} onClick={() => setKebabOpen((o) => !o)} data-testid="projects-kebab" /></Tooltip>
              <Dropdown open={kebabOpen} onClose={() => setKebabOpen(false)} align="right" sheetTitle="Projects">
                {first || !wl ? null : <span className={styles.menuRow} data-testid="open-insights"><DropdownItem onSelect={() => { setKebabOpen(false); openInsights() }}>Reports</DropdownItem></span>}
                <DropdownItem onSelect={() => { setKebabOpen(false); setExportSel([]) }}>Export all as…</DropdownItem>
                <DropdownItem onSelect={() => { setKebabOpen(false); setTrashOpen(true) }}>Deleted projects</DropdownItem>   {/* (Projects round 7, Q-26) · (the calm UI build 2026-10-27, 3-40 · W-170) */}
                {/* (S46 — REG-2524) Tickets left this menu for the rail, a place of its own as Tasks is (his ask 2026-10-19) */}
                <DropdownItem onSelect={() => { setKebabOpen(false); router.push(withFrom('/settings?section=projects', here())) }}>Project settings</DropdownItem>   {/* (the calm UI build 2026-10-27, 3-40 · W-591) */}
              </Dropdown>
            </div>
          </>
        } />
        <div className={pageStyles.content}>
          {first || workload || !TILES_IN.includes(scope) || phone ? null : (
            /* (parity P-30) the house row of tiles: one row from 1025, 3 + 2 at a tablet's width — (the calm UI build 2026-10-27, 3-38 · T-06)
               the Dashboard's look: five white cards, each boxed, one caption; they stand where they count (open work — not on Workload or
               Completed, whose rows they don't describe) */
            <StatTiles className={styles.tiles} testId="project-tiles">
              {TILE_LABELS.map((l) => {
                const s = TILE_SCOPE[l]
                const n = tileValue(l)
                return (
                  <button key={l} type="button" className={styles.tileBtn} aria-pressed={scope === s} onClick={() => setScope(scope === s ? 'open' : s)} data-testid={`tile-${s}`}>
                    <StatTile look="card" label={l} value={n} grade={s === 'attention' && n > 0 ? 'bad' : undefined} wrap />
                  </button>
                )
              })}
              {total !== null ? <div className={styles.valueTile}><StatTile look="card" testId="tile-value" label="Contract value" value={moneyCompact(total)} help="Open projects" wrap /></div> : null}
            </StatTiles>
          )}
          <ProjectsToolbar bare={first} reviews={viewer.reviews ?? mayReviewUpdate(viewer.role)} scope={scope} counts={counts} shown={filtered.length} onScope={setScope} query={query} onQuery={setQuery} onFilter={() => setFiltersOpen(true)} filterCount={filterCount} onColumns={phone || workload ? undefined : () => setColumnsOpen(true)}
                           view={wl || cb ? { value: view, onChange: setView } : undefined} />
          {/* (the calm UI build 2026-10-27, 3-11 · T-15) a phone's tiles: one line under the pill, each fact a door to its scope (the same handles), the
              studio's open value after them — nothing in a tile is lost, nothing fills the first screen */}
          {!first && !workload && TILES_IN.includes(scope) && phone ? (
            <p className={styles.phoneTiles} data-testid="project-tiles">
              {PHONE_ORDER.filter((s) => counts[s] > 0).map((s) => (
                <span key={s} className={styles.phoneTile}>
                  <button type="button" className={styles.phoneDoor} aria-pressed={scope === s} data-alert={s === 'attention' || undefined} onClick={() => setScope(scope === s ? 'open' : s)} data-testid={`tile-${s}`}>{PHONE_WORDS[s]!(counts[s])}</button>
                </span>
              ))}
              {total !== null ? <span className={styles.phoneTile} data-testid="tile-value">{`${moneyCompact(total)} open`}</span> : null}
            </p>
          ) : null}
          {first ? (
            <EmptyState icon="business_center" title="No projects yet" testId="projects-empty"
                        help="A project begins when a lead is won — the Won step creates it. For a client who came straight to you, add the project here."
                        primary={{ label: 'New project', icon: 'add', onPress: openNew }} secondary={{ label: 'Open Leads', onPress: () => router.push('/leads') }} />
          ) : workload ? (   /* (gaps build I, I-Q2) the rows the list shows — scope, Filters, search; (S45B) Members · Contractors */
            <>
              {/* (the calm UI build 2026-10-27, 3-08 · T-10) Members · Contractors is a view switch — the design system's SegmentedButton, not chips */}
              {wl && cb ? (
                <SegmentedButton aria-label="Workload of" selectedKeys={[of]} data-testid="workload-of" className={styles.workloadOf}
                                 onSelectionChange={(keys) => { const v = String([...keys][0] ?? ''); if (v) setOf(v === 'contractors' ? 'contractors' : 'members') }}>
                  <SegmentedButtonItem id="members">Members</SegmentedButtonItem>
                  <SegmentedButtonItem id="contractors">Contractors</SegmentedButtonItem>
                </SegmentedButton>
              ) : null}
              {of === 'contractors' && cb ? <ContractorsView board={cb} shown={new Set(filtered.map((r) => r.id))} query={query} here={`/projects?view=workload${wl ? '&of=contractors' : ''}`} />
                : wl ? <WorkloadView rows={filtered} people={team} viewer={{ id: viewer.id, role: viewer.role, teamIds: wl.teamIds }} studioDefault={wl.defaultCapacity} sets={wl.sets}
                                     onOpen={open} onSetCapacity={() => setCapacityOpen(true)} onInsights={openInsights} /> : null}
            </>
          ) : nothingMatches ? (
            <TabSearchEmpty noun="projects" searching={query.trim() !== ''} onClearAll={() => { setQuery(''); setFilters(EMPTY_PROJECT_FILTERS); setSort(null); setScope('open') }} />
          ) : phone ? (
            <ProjectCards rows={filtered} query={query} now={now} onOpen={open} onMenu={onMenu} onAssign={openAssign} reason={scope === 'review' ? reviewLine : undefined} />
          ) : (
            <ProjectsTable rows={filtered} columns={columnPrefs.columns} registry={registry} sort={sort} onSort={cycleSort} onReorder={columnPrefs.reorder}
                           selected={live} onToggle={toggle} onToggleAll={toggleAll} onOpen={open} onMenu={onMenu} onAssign={openAssign} query={query} now={now} reason={scope === 'review' ? reviewLine : undefined} />
          )}
        </div>
      </div>
      {phone || workload ? null : (
        <BulkBar count={live.size} onClear={() => setSelected(new Set())} actions={[
          ...(data.assignHint ? [] : [{ label: 'Assign', onClick: (e: React.MouseEvent<HTMLButtonElement>) => setAssign(anchorAt(e.currentTarget)) }]),
          { label: 'Export', onClick: () => setExportSel(filtered.filter((r) => live.has(r.id))) },
        ]} />
      )}
      {/* (parity P-17, B-05) one popover for the bulk bar and a row's Members cell — a row's is the Leads listing's: its members ticked, and
          `requireOne` (a project is past New, so it never ends with nobody); "Members updated" as the lead's */}
      <AssignPopover open={!!assign} team={team} value={assignRow ? assignRow.team.map((m) => m.id) : []} anchor={assign?.el} position={assign} assignable={data.assignable} hint={data.assignHint}
                     requireOne={!!assignRow}
                     onClose={() => setAssign(null)}
                     onApply={(ids) => {
                       setAssign(null)
                       if (assignRow) {
                         const r = assignRow
                         setOptimisticTeam((o) => ({ ...o, [r.id]: ids }))
                         void run('update the members', () => assignMembers(r.leadId, ids), 'Members updated')
                           .then((ok) => { if (!ok) setOptimisticTeam((o) => { const n = { ...o }; delete n[r.id]; return n }) })   // a refusal puts the members back (REG-656)
                         return
                       }
                       const leadIds = filtered.filter((r) => live.has(r.id)).map((r) => r.leadId)
                       const names = team.filter((m) => ids.includes(m.id)).map((m) => m.name).join(', ')
                       void run('assign the projects', () => addLeadMembers(leadIds, ids).then((r) => { snackbar({ message: r.assigned === 0 ? 'Already on every selected project' : `${r.assigned} project${r.assigned === 1 ? '' : 's'} assigned to ${names}` }); setSelected(new Set()); router.refresh() }))
                     }} />
      <ExportDialog<ProjectRow> open={!!exportSel} title="Export Projects" onClose={() => setExportSel(null)} statement={statement} now={now}
                    all={rows} shown={filtered} selected={exportSel?.length ? exportSel : undefined} listingColumns={columnPrefs.columns.map((c) => c.key)}
                    onDone={(name, format, count) => snackbar({ message: `Exported ${count ?? rows.length} project${(count ?? rows.length) === 1 ? '' : 's'} as ${format} · ${name}` })} />
      <ProjectsFiltersModal open={filtersOpen} value={filters} team={team.filter((m) => m.isActive)} onApply={applyFilters} onClose={() => setFiltersOpen(false)}
                            headSort={headSort} onClearHead={() => setSort(null)} />
      <ColumnSettingsDrawer open={columnsOpen} onClose={() => setColumnsOpen(false)} pinning={{ max: 3 }} columns={columnPrefs.all} onSave={columnPrefs.save} onReset={columnPrefs.reset} />
      {wl?.sets ? (   /* (gaps build I, I-Q3) each person's capacity — Undo puts every number back */
        <CapacityDialog open={capacityOpen} studioDefault={wl.defaultCapacity} onClose={() => setCapacityOpen(false)} onSettings={() => router.push(withFrom('/settings?section=projects#workload-settings', here()))}
                        people={workloadPeople(team, viewer, wl.teamIds, rows)}
                        onSave={(caps) => run('save the capacities', async () => {
                          const r = await setCapacities({ caps }); if ('error' in r) return r
                          const before = r.before
                          snackbar({ key: 'capacity', message: r.changed ? `Capacity saved for ${r.changed} ${r.changed === 1 ? 'person' : 'people'}` : 'Nothing changed', ...(r.changed ? { actionLabel: 'Undo', onAction: () => { void run('put the capacities back', () => setCapacities({ caps: before }), 'Capacities put back', { refresh: true }) } } : {}) })
                        }, undefined, { refresh: true })} />
      ) : null}
      <NewProjectDialog open={newOpen} onClose={() => { setNewOpen(false); setNewFill(null) }} initial={newFill} splits={data.splits} team={team} assignable={data.assignable} selfId={viewer.role === 'Designer' ? viewer.id : null} onCreate={createProject}
                        memberLoad={data.memberLoad} memberStats={data.memberStats}
                        onOpenExisting={(to) => router.push(withFrom(to, here()))} />
      <ProjectLayoutsDialog project={plannerFor} onClose={() => setPlannerFor(null)} />
      <RenameProjectDialog open={!!renaming} name={renaming?.name ?? ''} onClose={() => setRenaming(null)}
                           onSave={(name) => { const r = renaming; return r ? run('rename the project', () => renameProject(r.id, name), 'Project renamed', { refresh: true }) : Promise.resolve(false) }} />
      <ClientAccessPanel open={!!accessFor} leadId={accessFor} project onClose={() => setAccessFor(null)} />
      <HoldProjectDialog open={!!holdFor} name={holdFor?.name ?? ''} client={holdFor?.client ?? ''} hold={holdFor?.hold ?? null} today={new Date(now)} projectId={holdFor?.id} onClose={() => setHoldFor(null)}
                         onSave={(v) => { const r = holdFor; return r ? run('put the project on hold', async () => {
                           const res = await putProjectOnHold(r.id, v); if ('error' in res) return res
                           snackbar({ message: r.hold ? 'Hold changed' : `${r.name} is on hold`, actionLabel: 'Undo', onAction: holdUndo(res.undo, r.hold ? 'The hold is as it was' : `${r.name} is running again`) })
                         }, undefined, { refresh: true }) : Promise.resolve(false) }} />
      {ending.node}
      <DeletedProjectsSheet open={trashOpen} onClose={() => setTrashOpen(false)} onChanged={() => router.refresh()} />
    </PageReveal>
  )
}
