'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { rememberView, useStoredView, type ListingView } from '@/lib/leads/view-pref'
import { useRouter } from 'next/navigation'
import { AnimatePresence } from 'motion/react'
import { PageReveal } from '@/components/shell/page-reveal'
import { LeadsSkeleton } from '@/components/shell/skeleton'
import { KanbanSkeleton } from '@/components/leads/kanban/skeleton'
import { Tooltip } from '@/components/om/tooltip'
import { PageHeader } from '@/components/shell/page-header'
import { MaisonFab } from '@/components/shell/maison-fab'
import { useComingSoon, useSnackbar } from '@/components/om/snackbar'
import { IconButton } from '@/components/om/icon-button'
import { Icon } from '@/components/om/icon'
import { Button } from '@/components/ds'
import { LeadsToolbar } from '@/components/leads/toolbar'
import { LeadsTable, DEFAULT_COLUMNS, type ColumnConfig } from '@/components/leads/table'
import { Dropdown, DropdownItem, DropdownDivider } from '@/components/leads/dropdown'
import { AssignPopover } from '@/components/leads/assign-popover'
import { CustomiseView } from '@/components/leads/customise-view'
import { AiSheet } from '@/components/leads/ai-sheet'
import { LeadsEmptyState } from '@/components/leads/empty-state'
import { StageDropdown } from '@/components/leads/stage-dropdown'
import { StageFilterDropdown } from '@/components/leads/stage-filter-dropdown'
import { FiltersModal } from '@/components/leads/filters-modal'
import { SearchEmpty } from '@/components/leads/search-empty'
import { EMPTY_FILTERS, activeFilterCount, applyFilters, type LeadFilters } from '@/lib/leads/filters'
import { KanbanBoard, type PendingDrop } from '@/components/leads/kanban/board'
import { DeleteLeadDialog } from '@/components/leads/delete-dialog'
import { LeadFormModal } from '@/components/leads/lead-form'
import { TasksPopover, type TasksPos } from '@/components/leads/tasks-popover'
import { DeletedLeadsSheet } from '@/components/leads/deleted-sheet'
import { ImportWizard } from '@/components/leads/import-wizard'
import { ReviewBanner } from '@/components/leads/review-banner'
import { ReviewSheet } from '@/components/leads/review-sheet'
import { MoveStageWizard } from '@/components/leads/move-stage/wizard'
import { OnHoldDialog, LostDialog } from '@/components/leads/move-stage/dialogs'
import { ReturnLeadWizard } from '@/components/leads/return/return-lead-wizard'
import { fetchLeadFilesForReturn, returnLead, undoReturn, type ReturnInput } from './return-actions'
import { displayDate } from '@/lib/format'
import { STAGES, type Stage } from '@/lib/leads/enums'
import { blockedReason, detailHref, isActiveStage, isCompletedFor, journeyIdx } from '@/lib/leads/stage-policy'
import type { StageMovement } from '@/lib/settings/types'
import { ConfirmDialog } from '@/components/om/confirm-dialog'
import { ExportDialog } from '@/components/leads/export-dialog'
import { addTask, approveImportRows, assignMembers, completeTask, createLead, deleteForever, deleteLeads, emptyTrash, importLeads, markLeadSeen, mergeImportRow, moveStage, quickMoveStage, rejectImportRows, restoreLeads, setTaskDue, undoStageMove, updateLead, updateStageDetails } from './actions'
import type { LeadRow, ReviewRow } from '@/lib/leads/queries'
import type { Lead, LeadFile, Member } from '@/lib/db/schema'
import styles from './leads.module.css'

type Anchored = { id: string; el: HTMLElement; top: number; left: number } | null

/* Anchored popovers are fixed-position; these derive their spot from the anchor so they can follow it while the table / board scrolls. */
const stagePos = (el: HTMLElement) => { const r = el.getBoundingClientRect(); return { top: Math.min(r.bottom, window.innerHeight - 360), left: r.left } }   // menu hangs from the cell's bottom-left corner (780:86452)
const anchorRect = (el: HTMLElement) => { const r = el.getBoundingClientRect(); return { el, top: Math.min(r.bottom + 4, window.innerHeight - 460), left: Math.min(r.left, window.innerWidth - 420) } }
const tasksPos = (el: HTMLElement) => { const r = el.getBoundingClientRect(); return { top: Math.min(r.bottom + 4, window.innerHeight - 520), left: Math.min(r.left, window.innerWidth - 420) } }
const offscreen = (el: HTMLElement) => { const r = el.getBoundingClientRect(); return r.bottom < 0 || r.top > window.innerHeight }

function Workspace({ rows, team, now: initialNow, deleted, review, urlView, stageMovement }: { rows: LeadRow[]; team: Member[]; now: number; deleted: Lead[]; review: ReviewRow[]; urlView: ListingView | null; stageMovement: StageMovement }) {
  const comingSoon = useComingSoon()
  const snackbar = useSnackbar()
  const router = useRouter()

  const [query, setQuery] = useState('')
  const [stageScope, setStageScope] = useState<Stage | null>(null)
  const [stageMenuOpen, setStageMenuOpen] = useState(false)
  const [filters, setFilters] = useState<LeadFilters>(EMPTY_FILTERS)
  const [filtersOpen, setFiltersOpen] = useState(false)
  // View persists across refresh: ?view= in the URL wins, then the stored preference, then table.
  const storedView = useStoredView()
  const [chosenView, setChosenView] = useState<ListingView | null>(urlView)
  const view: ListingView = chosenView ?? storedView ?? 'table'
  const setView = (v: ListingView) => { setChosenView(v); rememberView(v) }
  const [columns, setColumns] = useState<ColumnConfig[]>(DEFAULT_COLUMNS)
  const [addOpen, setAddOpen] = useState(false)
  const [kebabOpen, setKebabOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)
  const [assign, setAssign] = useState<Anchored>(null)
  const [customise, setCustomise] = useState<{ el: HTMLElement; top: number; left: number } | null>(null)
  const [optimisticAssignees, setOptimisticAssignees] = useState<Record<string, string[]>>({})
  // An optimistic assignee set is released once the refreshed row carries it (render-phase adjust, like pendingDrop below); a failed action drops its entry in applyAssign.
  const settledAssignees = Object.keys(optimisticAssignees).filter((id) => {
    const r = rows.find((x) => x.id === id), o = optimisticAssignees[id]
    return !!r && !!o && r.assignees.length === o.length && r.assignees.every((m) => o.includes(m.id))
  })
  if (settledAssignees.length > 0) setOptimisticAssignees((o) => { const n = { ...o }; for (const id of settledAssignees) delete n[id]; return n })
  const [stageMenu, setStageMenu] = useState<Anchored>(null)
  const [wizard, setWizard] = useState<{ leadId: string; target: Stage } | null>(null)
  const [onHold, setOnHold] = useState<string | null>(null)   // leadId
  const [pendingDrop, setPendingDrop] = useState<PendingDrop>(null)   // kanban drop waiting on the stage flow
  // Drop resolved: the refreshed rows show the lead in its target column → release the hold (render-phase adjust).
  if (pendingDrop && rows.find((r) => r.id === pendingDrop.leadId)?.stage === pendingDrop.stage) setPendingDrop(null)
  const [lost, setLost] = useState<string | null>(null)
  const [confirmMove, setConfirmMove] = useState<{ leadId: string; stage: Stage } | null>(null)   // linear: moving back needs no details, just a nod
  const [holdOpenedAt, setHoldOpenedAt] = useState(0)
  const [holdReason, setHoldReason] = useState('Property delay')
  const [holdDuration, setHoldDuration] = useState('3 months')
  const [lostReason, setLostReason] = useState('Property too far')
  const [deleting, setDeleting] = useState<string[] | null>(null)
  const [deletedOpen, setDeletedOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  // The queue emptied under an open sheet → close it (render-phase adjust; the action's snackbar is the cue).
  if (reviewOpen && review.length === 0) setReviewOpen(false)
  const docked = review.length > 0 && !reviewOpen
  // Bottom-docked overlays (bulk bar, snackbar, AI sheet) lift above the review banner.
  useEffect(() => {
    document.documentElement.style.setProperty('--bottom-dock', docked ? '56px' : '0px')   // banner 50 + 16 inset − 10
    return () => { document.documentElement.style.removeProperty('--bottom-dock') }
  }, [docked])
  const deletingRef = useRef(false)
  const [deleteReason, setDeleteReason] = useState('Spam')
  const [nowTick, setNowTick] = useState(initialNow)
  const [leadForm, setLeadForm] = useState<{ mode: 'create' } | { mode: 'edit'; lead: LeadRow } | null>(null)
  const [tasksFor, setTasksFor] = useState<({ id: string; el: HTMLElement } & TasksPos) | null>(null)
  const addRef = useRef<HTMLDivElement>(null)
  const fabRef = useRef<HTMLDivElement>(null)   // the Maison AI FAB — the sheet exempts it from outside presses so the FAB toggles (REG-153)
  /* Return Lead from a row / kanban kebab (Qanvast leads only, REG-139) → the same wizard as the overview (931:48813, spec design-source/context/lead-return/).
     The listing has no files in memory, so they are fetched when the menu item is pressed. */
  const [returning, setReturning] = useState<{ leadId: string; files: LeadFile[] } | null>(null)
  const openReturn = async (lead: LeadRow) => {
    setAssign(null); setStageMenu(null); setTasksFor(null)
    let files: LeadFile[] = []
    try { files = await fetchLeadFilesForReturn(lead.id) } catch { files = [] }
    setReturning({ leadId: lead.id, files })
  }

  /* ---- Stage movement policy (Settings › Leads, user 2026-08-29) ----
     linear: one stage at a time through the Move stage window; later stages are locked, earlier ones are a confirm away.
     flexible: instant moves with Undo; only Won (it creates the project) opens the window. On Hold / Lost keep their dialogs. */
  // The pure rules (isActiveStage · journeyIdx · blockedReason · isCompletedFor) live in lib/leads/stage-policy, shared with the Lead Details pages.
  const fail = (what: string) => snackbar({ message: `Couldn’t ${what} — please try again` })
  /** Every stage-move action runs through here: a failure gets the module's snackbar and releases a held kanban drop
      (on success the render-phase adjust above releases it once the refreshed rows agree, so the card never springs back first). */
  const run = async (what: string, fn: () => Promise<unknown>) => {
    try { await fn() } catch { fail(what); setPendingDrop(null) }
  }
  const quickMove = (lead: LeadRow, stage: Stage) => run('move the lead', async () => {
    const { logId } = await quickMoveStage({ leadId: lead.id, fromStage: lead.stage, toStage: stage })
    snackbar({ message: `Moved to ${stage}`, actionLabel: 'Undo', onAction: () => { void run('undo the move', () => undoStageMove({ leadId: lead.id, logId, toStage: lead.stage })) } })
  })
  /** Every stage change — table dropdown or kanban drop — comes through here. */
  const requestStageChange = (lead: LeadRow, stage: Stage) => {
    if (lead.stage === stage) { setPendingDrop(null); return }
    if (stage === 'On Hold') { setHoldReason('Property delay'); setHoldDuration('3 months'); setHoldOpenedAt(Date.now()); setOnHold(lead.id); return }
    if (stage === 'Lost') { setLostReason('Property too far'); setLost(lead.id); return }
    const from = journeyIdx(lead), to = STAGES.indexOf(stage as (typeof STAGES)[number])
    // A parked lead (On Hold / Lost) resuming really changes where it is — one confirm, any stage.
    if (!isActiveStage(lead.stage)) { setConfirmMove({ leadId: lead.id, stage }); return }
    // A completed stage is never "moved back to" (user 2026-08-29): it opens for viewing in the window, Edit lives inside.
    if (to <= from) { setWizard({ leadId: lead.id, target: stage }); return }
    if (stageMovement === 'linear') {
      if (to === from + 1) { setWizard({ leadId: lead.id, target: stage }); return }
      setPendingDrop(null)
      snackbar({ message: blockedReason(lead, stage, stageMovement) ?? `Complete ${STAGES[from + 1]} first` })
      return
    }
    if (stage === 'Won') { setWizard({ leadId: lead.id, target: stage }); return }
    void quickMove(lead, stage)
  }

  const effectiveRows = useMemo(() => rows.map((r) => {
    const o = optimisticAssignees[r.id]
    if (!o) return r
    return { ...r, assignees: o.map((id) => team.find((m) => m.id === id)).filter((m): m is Member => !!m) }
  }), [rows, optimisticAssignees, team])

  // Pipeline: stage scope (pill) → Filters modal → live search.
  const scoped = useMemo(() => (stageScope ? effectiveRows.filter((r) => r.stage === stageScope) : effectiveRows), [effectiveRows, stageScope])
  const filtered = useMemo(() => {
    const base = applyFilters(scoped, filters, nowTick)
    if (!query.trim()) return base
    const q = query.trim().toLowerCase()
    const qDigits = q.replace(/\D/g, '')   // "9812 0443" matches the stored "98120443"
    return base.filter((r) =>
      r.name.toLowerCase().includes(q) || (qDigits.length >= 3 && r.phone.includes(qDigits)) ||
      r.source.toLowerCase().includes(q) || r.propertyType.toLowerCase().includes(q))
  }, [scoped, filters, query, nowTick])
  // Selection follows the pipeline: ids hidden by scope / filters / search drop out (render-phase adjust).
  const stageCounts = useMemo(() => {
    const c: Record<string, number> & { all: number } = { all: effectiveRows.length }
    for (const r of effectiveRows) c[r.stage] = (c[r.stage] ?? 0) + 1
    return c
  }, [effectiveRows])
  const clearAll = () => { setQuery(''); setStageScope(null); setFilters(EMPTY_FILTERS) }
  const nothingMatches = rows.length > 0 && filtered.length === 0 && (query.trim() !== '' || activeFilterCount(filters) > 0 || stageScope !== null)

  // The primary band on a row = a new lead nobody has seen or clicked yet (user 2026-08-29). First interaction clears it.
  const [seenLocally, setSeenLocally] = useState<Set<string>>(() => new Set())
  const unseenIds = useMemo(() => new Set(rows.filter((r) => r.seenAt === null && !seenLocally.has(r.id)).map((r) => r.id)), [rows, seenLocally])
  const markSeen = (row: LeadRow) => {
    if (!unseenIds.has(row.id)) return
    setSeenLocally((s) => new Set(s).add(row.id))
    void markLeadSeen(row.id)
  }
  const newest = useMemo(() => [...rows].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0], [rows])

  // Tasks popover anchored under a task box — table cell or kanban card (user 2026-08-29).
  const openTasks = (row: LeadRow, anchor: HTMLElement) => {
    if (tasksFor?.id === row.id) { setTasksFor(null); return }   // pressing the open popover's own trigger closes it
    const t = Date.now()
    setNowTick(t)
    setAssign(null); setStageMenu(null)
    setTasksFor({ id: row.id, seq: t, el: anchor, ...tasksPos(anchor) })
  }
  // Popovers follow their cell while anything scrolls (user 2026-08-29) and close once the anchor leaves the viewport.
  const anyAnchored = !!(stageMenu || assign || customise || tasksFor)
  useEffect(() => {
    if (!anyAnchored) return
    const follow = () => {
      setStageMenu((s) => (s ? (offscreen(s.el) ? null : { ...s, ...stagePos(s.el) }) : s))
      setAssign((s) => (s ? (offscreen(s.el) ? null : { ...s, ...anchorRect(s.el) }) : s))
      setCustomise((s) => (s ? (offscreen(s.el) ? null : { ...s, ...anchorRect(s.el) }) : s))
      setTasksFor((s) => (s ? (offscreen(s.el) ? null : { ...s, ...tasksPos(s.el) }) : s))
    }
    document.addEventListener('scroll', follow, true)
    window.addEventListener('resize', follow)
    return () => { document.removeEventListener('scroll', follow, true); window.removeEventListener('resize', follow) }
  }, [anyAnchored])

  const applyAssign = async (memberIds: string[]) => {
    if (!assign) return
    const leadId = assign.id
    setOptimisticAssignees((o) => ({ ...o, [leadId]: memberIds }))
    setAssign(null)
    try {
      await assignMembers(leadId, memberIds)
      snackbar({ message: 'Assignees updated' })
    } catch {
      // Back to the server's assignees — the optimistic set must not outlive a failed action.
      setOptimisticAssignees((o) => { const n = { ...o }; delete n[leadId]; return n })
      fail('update the assignees')
    }
  }

  const assignValue = assign
    ? (optimisticAssignees[assign.id] ?? rows.find((r) => r.id === assign.id)?.assignees.map((m) => m.id) ?? [])
    : []

  const holdFollowUp = useMemo(() => {
    const days = holdDuration.startsWith('1') ? 30 : holdDuration.startsWith('3') ? 90 : 180
    return displayDate(new Date((holdOpenedAt || 0) + days * 86400000))
  }, [holdDuration, holdOpenedAt])

  const aiSuggestions = useMemo(() => {
    return [
      newest ? `Draft intro WhatsApp for ${newest.name}` : 'Draft an intro WhatsApp',
      'Summarise this week’s new leads',
      'Which leads need follow-up today?',
    ]
  }, [newest])

  return (
    <PageReveal skeleton={view === 'kanban' ? <KanbanSkeleton /> : <LeadsSkeleton />}>
        <div className={styles.body} style={{ position: 'relative' }} data-view={view}>
          <PageHeader
            title="Leads"
            actions={
              <>
                <Button variant="secondary" appearance="outlined"
                        iconStart={<Icon name="bar_chart_4_bars" size={20} />} onPress={comingSoon}>
                  Insights
                </Button>
                <div ref={addRef} style={{ position: 'relative' }}>
                  <Button iconStart={<Icon name="add" size={20} />} aria-haspopup="menu" aria-expanded={addOpen} onPress={() => setAddOpen((o) => !o)}>
                    Add Lead
                  </Button>
                  <Dropdown open={addOpen} onClose={() => setAddOpen(false)} align="right">
                    <DropdownItem onSelect={() => { setAddOpen(false); setLeadForm({ mode: 'create' }) }}>Create New Lead</DropdownItem>
                    <DropdownItem onSelect={() => { setAddOpen(false); setImportOpen(true) }}>Import from File</DropdownItem>
                    <DropdownDivider />
                    <DropdownItem onSelect={() => { setAddOpen(false); comingSoon() }}>Link to Email</DropdownItem>
                    <DropdownItem onSelect={() => { setAddOpen(false); comingSoon() }}>Link to Zapier</DropdownItem>
                    <DropdownItem onSelect={() => { setAddOpen(false); comingSoon() }}>Connect to Ads</DropdownItem>
                  </Dropdown>
                </div>
                <div style={{ position: 'relative' }}>
                  <Tooltip label="More options" disabled={kebabOpen}>
                    <IconButton icon="more_vert" label="More options" aria-haspopup="menu" aria-expanded={kebabOpen} onClick={() => setKebabOpen((o) => !o)} />
                  </Tooltip>
                  <Dropdown open={kebabOpen} onClose={() => setKebabOpen(false)} align="right">
                    <DropdownItem onSelect={() => { setKebabOpen(false); router.push('/leads/imports') }}>Lead Import History</DropdownItem>
                    <DropdownItem onSelect={() => { setKebabOpen(false); setNowTick(Date.now()); setExportOpen(true) }}>Export all as…</DropdownItem>
                    <DropdownItem onSelect={() => { setKebabOpen(false); setDeletedOpen(true) }}>Deleted Leads</DropdownItem>
                    <DropdownItem onSelect={() => { setKebabOpen(false); router.push('/settings') }}>Leads Settings</DropdownItem>
                  </Dropdown>
                </div>
              </>
            }
          />
          <div className={styles.content}>
            <LeadsToolbar
              chipLabel={rows.length === 0 ? 'All Leads' : `${stageScope ?? 'All Leads'} (${filtered.length})`}
              onChipClick={() => setStageMenuOpen((o) => !o)}
              chipOpen={stageMenuOpen}
              chipMenu={
                <StageFilterDropdown open={stageMenuOpen} onClose={() => setStageMenuOpen(false)}
                                     counts={stageCounts} value={stageScope}
                                     onSelect={(s) => setStageScope(s)} onManage={comingSoon} />
              }
              query={query}
              onQueryChange={setQuery}
              onFilterClick={() => { setNowTick(Date.now()); setFiltersOpen(true) }}
              filterCount={activeFilterCount(filters)}
              view={view}
              onViewChange={(v) => { setNowTick(Date.now()); setView(v) }}
            />
            {rows.length === 0 ? (
              <LeadsEmptyState onImport={() => setImportOpen(true)} onCreate={() => setLeadForm({ mode: 'create' })} />
            ) : nothingMatches && view === 'table' ? (
              <SearchEmpty onClearAll={clearAll} searching={query.trim() !== ''} />
            ) : view === 'kanban' ? (
              <KanbanBoard
                rows={filtered}
                query={query}
                now={nowTick}
                unseenIds={unseenIds}
                onClearSearch={clearAll}
                stageScope={stageScope}
                filtering={activeFilterCount(filters) > 0 || (stageScope !== null && filtered.length === 0)}
                onKebabDelete={(lead) => { setDeleteReason('Spam'); setDeleting([lead.id]) }}
                onKebabReturn={(lead) => { void openReturn(lead) }}
                onAssign={(row, anchor) => setAssign((a) => (a?.id === row.id ? null : { id: row.id, ...anchorRect(anchor) }))}
                pendingDrop={pendingDrop}
                onDragToStage={(lead, stage) => {
                  setPendingDrop({ leadId: lead.id, stage })
                  requestStageChange(lead, stage)
                }}
                canDrop={(lead, stage) => !blockedReason(lead, stage, stageMovement) && !isCompletedFor(lead, stage)}
                onDropBlocked={(lead, stage) => {
                  // Backward drops are simply not allowed (user 2026-08-29): the card springs back with the reason.
                  if (isCompletedFor(lead, stage)) { snackbar({ message: `${stage} is already completed — stages don’t move back` }); return }
                  snackbar({ message: blockedReason(lead, stage, stageMovement) ?? '' })
                }}
                onNameClick={(lead) => { markSeen(lead); router.push(`/leads/${lead.id}`) }}
                onTaskClick={openTasks}
              />
            ) : (
              <LeadsTable
                rows={filtered}
                columns={columns}
                unseenIds={unseenIds}
                onRowSeen={markSeen}
                onNameClick={(lead) => { markSeen(lead); router.push(`/leads/${lead.id}`) }}
                openStageId={stageMenu?.id ?? null}
                onStageClick={(row, anchor) => {
                  setStageMenu({ id: row.id, el: anchor, ...stagePos(anchor) })
                }}
                onTaskClick={openTasks}
                now={nowTick}
                onAssignClick={(row, anchor) => setAssign((a) => (a?.id === row.id ? null : { id: row.id, ...anchorRect(anchor) }))}
                onTuneClick={(anchor) => setCustomise((c) => (c ? null : anchorRect(anchor)))}   // the gear toggles its popover (REG-153)
                tuneOpen={!!customise}
                query={query}
                filterSort={filters.sort}
                onEditRow={(row) => setLeadForm({ mode: 'edit', lead: row })}
                onDeleteRow={(row) => { setDeleteReason('Spam'); setDeleting([row.id]) }}
                onReturnRow={(row) => { void openReturn(row) }}
                onCopyPhone={async (row) => {
                  try {
                    await navigator.clipboard.writeText(`+65 ${row.phone}`)
                    snackbar({ message: 'Copied to clipboard' })
                  } catch {
                    snackbar({ message: `+65 ${row.phone}` })
                  }
                }}
              />
            )}
          </div>
          <AnimatePresence>
            {docked ? (
              <ReviewBanner count={review.length}
                            duplicates={review.filter((r) => r.row.status === 'duplicate').length}
                            onOpen={() => setReviewOpen(true)} />
            ) : null}
          </AnimatePresence>
        </div>

      <StageDropdown
        open={!!stageMenu}
        position={stageMenu}
        onClose={() => setStageMenu(null)}
        blocked={(stage) => {
          const row = rows.find((r) => r.id === stageMenu?.id)
          return row ? blockedReason(row, stage, stageMovement) : null
        }}
        current={rows.find((r) => r.id === stageMenu?.id)?.stage as Stage | undefined ?? null}
        doneThrough={(() => { const row = rows.find((r) => r.id === stageMenu?.id); return row ? journeyIdx(row) : -1 })()}
        onSelect={(stage) => {
          const leadId = stageMenu!.id
          setStageMenu(null)
          const row = rows.find((r) => r.id === leadId)
          if (row) requestStageChange(row, stage)
        }}
      />
      <ExportDialog open={exportOpen} rows={rows} now={nowTick} onClose={() => setExportOpen(false)}
                    onDone={(name, format) => snackbar({ message: `Exported ${rows.length} leads as ${format} · ${name}` })} />
      <ConfirmDialog
        open={!!confirmMove}
        tone="primary"
        title={`Resume at ${confirmMove?.stage ?? ''}?`}
        message={`${rows.find((r) => r.id === confirmMove?.leadId)?.stage ?? 'On Hold'} ends and the lead continues from ${confirmMove?.stage ?? ''}. Details already recorded stay on its journey.`}
        confirmLabel="Resume"
        onCancel={() => { setConfirmMove(null); setPendingDrop(null) }}
        onConfirm={async () => {
          const move = confirmMove
          setConfirmMove(null)
          const lead = move ? rows.find((r) => r.id === move.leadId) : undefined
          if (!move || !lead) { setPendingDrop(null); return }
          await quickMove(lead, move.stage)
        }}
      />
      {wizard ? (() => {
        const lead = rows.find((r) => r.id === wizard.leadId)
        if (!lead) return null
        return (
          <MoveStageWizard
            lead={lead}
            team={team}
            targetStage={wizard.target}
            mode={stageMovement}
            onClose={() => { setWizard(null); setPendingDrop(null) }}
            onUpdate={({ stage, data }) => {
              setWizard(null); setPendingDrop(null)
              void run('update the details', async () => {
                await updateStageDetails({ leadId: lead.id, stage, data })
                snackbar({ message: `${stage} details updated` })
              })
            }}
            onSave={({ toStage, data, tasks }) => {
              setWizard(null)
              void run('move the lead', async () => {
                await moveStage({ leadId: lead.id, fromStage: lead.stage, toStage, payload: data, tasks })
                if (toStage === 'Won') {
                  snackbar({ message: `Project created for ${lead.name} · OM-10001`, actionLabel: 'View', onAction: comingSoon })
                } else {
                  snackbar({ message: `Moved to ${toStage}` })
                }
              })
            }}
          />
        )
      })() : null}
      {(() => {
        const lead = returning ? rows.find((r) => r.id === returning.leadId) : undefined
        if (!returning || !lead) return null
        return (
          <ReturnLeadWizard
            open
            lead={{ id: lead.id, name: lead.name, createdAt: lead.createdAt }}
            files={returning.files}
            now={nowTick}
            onClose={() => setReturning(null)}
            onConfirm={async (input: ReturnInput) => {
              // 931:49009 → 931:48553: the same snackbar + Undo as the overview; Undo lives as long as the snackbar (user 2026-08-30).
              const { returnId } = await returnLead(lead.id, input)
              snackbar({ message: 'Lead returned successfully', actionLabel: 'Undo', onAction: () => { void undoReturn(returnId).then(() => router.refresh()) } })
              router.refresh()
            }}
          />
        )
      })()}
      <OnHoldDialog
        open={!!onHold}
        onClose={() => { setOnHold(null); setPendingDrop(null) }}
        reason={holdReason} setReason={setHoldReason}
        duration={holdDuration} setDuration={setHoldDuration}
        followUp={holdFollowUp}
        onSave={(otherReason) => {
          const lead = rows.find((r) => r.id === onHold)
          setOnHold(null)
          if (!lead) { setPendingDrop(null); return }
          const days = holdDuration.startsWith('1') ? 30 : holdDuration.startsWith('3') ? 90 : 180
          void run('move the lead', async () => {
            await moveStage({
              leadId: lead.id, fromStage: lead.stage, toStage: 'On Hold',
              payload: { reason: otherReason ? `Others: ${otherReason}` : holdReason, duration: holdDuration, followUpAt: new Date(Date.now() + days * 86400000).toISOString() },
              tasks: [],
            })
            snackbar({ message: 'Moved to On Hold' })
          })
        }}
      />
      <LostDialog
        open={!!lost}
        onClose={() => { setLost(null); setPendingDrop(null) }}
        reason={lostReason} setReason={setLostReason}
        onSave={(otherReason) => {
          const lead = rows.find((r) => r.id === lost)
          setLost(null)
          if (!lead) { setPendingDrop(null); return }
          void run('move the lead', async () => {
            await moveStage({ leadId: lead.id, fromStage: lead.stage, toStage: 'Lost', payload: { reason: otherReason ? `Others: ${otherReason}` : lostReason }, tasks: [] })
            snackbar({ message: 'Moved to Lost' })
          })
        }}
      />
      <AssignPopover
        open={!!assign}
        team={team}
        value={assignValue}
        anchor={assign?.el}
        onClose={() => setAssign(null)}
        onApply={applyAssign}
        requireOne={(rows.find((r) => r.id === assign?.id)?.stage ?? 'New') !== 'New'}
        position={assign}
      />
      <CustomiseView
        open={!!customise}
        columns={columns}
        onClose={() => setCustomise(null)}
        onSave={(cols) => { setColumns(cols); setCustomise(null) }}
        position={customise}
        anchor={customise?.el}
      />
      <TasksPopover
        lead={effectiveRows.find((r) => r.id === tasksFor?.id) ?? null}
        pos={tasksFor}
        anchor={tasksFor?.el}
        now={nowTick}
        onClose={() => setTasksFor(null)}
        onAddTask={async (lead, title) => {
          try { await addTask(lead.id, title); return true }
          catch { snackbar({ message: 'Couldn’t add the task — please try again' }); return false }
        }}
        onCompleteTask={async (_lead, task) => {
          try { await completeTask(task.id); return true }
          catch { snackbar({ message: 'Couldn’t complete the task — please try again' }); return false }
        }}
        onSetDue={async (_lead, task, due) => {
          try { await setTaskDue(task.id, due); return true }
          catch { snackbar({ message: 'Couldn’t set the due date — please try again' }); return false }
        }}
        onOpenTask={(task) => router.push(`${detailHref(task.leadId, 'tasks')}?open=${task.id}`)}   // the task panel on Lead Details › Tasks, as the Overview's popover (REG-173)
      />
      <LeadFormModal
        now={nowTick}
        form={leadForm}
        onClose={() => setLeadForm(null)}
        onSubmit={async (mode, data, leadId) => {
          try {
            if (mode === 'create') {
              await createLead(data)
              snackbar({ message: 'Successfully Created' })
            } else if (leadId) {
              await updateLead(leadId, data)
              snackbar({ message: 'Successfully Updated' })
            }
            setLeadForm(null)
            return true
          } catch {
            snackbar({ message: 'Couldn’t save the lead — please try again' })
            return false
          }
        }}
      />
      <DeleteLeadDialog
        leads={deleting ? rows.filter((r) => deleting.includes(r.id)) : null}
        onClose={() => setDeleting(null)}
        reason={deleteReason}
        setReason={setDeleteReason}
        onDelete={async () => {
          if (deletingRef.current) return
          const ids = deleting ?? []
          setDeleting(null)
          if (ids.length === 0) return
          deletingRef.current = true
          try {
            await deleteLeads(ids, deleteReason)
          } catch {
            snackbar({ message: 'Couldn’t delete — please try again' })
            return
          } finally {
            deletingRef.current = false
          }
          snackbar({
            message: ids.length === 1 ? 'Lead deleted' : `${ids.length} leads deleted`,
            actionLabel: 'Undo',
            onAction: async () => {
              try {
                const n = await restoreLeads(ids)
                if (n === 0) snackbar({ message: ids.length === 1 ? 'This lead was already deleted forever' : 'These leads were already deleted forever' })
                else if (n < ids.length) snackbar({ message: `${n} of ${ids.length} leads restored — the rest were already deleted forever` })
              } catch {
                snackbar({ message: 'Couldn’t restore — please try again' })
              }
            },
          })
        }}
      />
      <FiltersModal open={filtersOpen} value={filters} team={team} now={nowTick} onClose={() => setFiltersOpen(false)} onApply={setFilters} />
      <ReviewSheet
        open={reviewOpen}
        rows={review}
        now={nowTick}
        onClose={() => setReviewOpen(false)}
        onApprove={async (ids) => {
          try {
            const { approved, flagged } = await approveImportRows(ids)
            const already = ids.length === 1 ? 'This lead was already reviewed' : 'These leads were already reviewed'
            const done = approved === 1 ? 'Lead approved and added to your leads' : `${approved} leads approved and added to your leads`
            const flaggedMsg = flagged === 1 ? 'Flagged as a duplicate — review it before approving' : `${flagged} flagged as duplicates — review them before approving`
            snackbar({ message: approved === 0 && flagged === 0 ? already
              : approved === 0 ? flaggedMsg
              : flagged > 0 ? `${done} · ${flagged} flagged as duplicate${flagged === 1 ? '' : 's'}` : done })
            return true
          } catch { snackbar({ message: 'Couldn’t approve — please try again' }); return false }
        }}
        onReject={async (ids) => {
          try {
            const n = await rejectImportRows(ids)
            snackbar({ message: n === 0 ? (ids.length === 1 ? 'This lead was already reviewed' : 'These leads were already reviewed') : n === 1 ? 'Lead rejected' : `${n} leads rejected` })
            return true
          } catch { snackbar({ message: 'Couldn’t reject — please try again' }); return false }
        }}
        onMerge={async (rowId, picks) => {
          try {
            const ok = await mergeImportRow(rowId, picks)
            snackbar({ message: ok ? 'Merged into the existing lead' : 'This lead can no longer be merged — approve it as a new lead' })
            return ok
          } catch { snackbar({ message: 'Couldn’t merge — please try again' }); return false }
        }}
      />
      <ImportWizard
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={async (payload) => {
          try { return await importLeads(payload) }
          catch { snackbar({ message: 'Couldn’t import the file — please try again' }); return null }
        }}
        onDone={(r) => {
          setImportOpen(false)
          snackbar(r.destination === 'listing' ? (r.approved === 0 && r.duplicates + r.flagged > 0 ? { message: `${r.duplicates + r.flagged} possible duplicate${r.duplicates + r.flagged === 1 ? '' : 's'} sent to review` } : { message: `${r.approved} lead${r.approved === 1 ? '' : 's'} added to your listing` }) : { message: `${r.imported} lead${r.imported === 1 ? '' : 's'} ready for review` })
        }}
      />
      <DeletedLeadsSheet
        open={deletedOpen}
        deleted={deleted}
        onClose={() => setDeletedOpen(false)}
        onRestore={async (ids) => {
          try {
            const n = await restoreLeads(ids)
            snackbar({ message: n === 0 ? 'Already restored' : n === 1 ? 'Lead restored' : `${n} leads restored` })
          } catch { snackbar({ message: 'Couldn’t restore — please try again' }) }
        }}
        onDeleteForever={async (ids) => {
          try { await deleteForever(ids); snackbar({ message: ids.length === 1 ? 'Lead deleted forever' : `${ids.length} leads deleted forever` }) }
          catch { snackbar({ message: 'Couldn’t delete — please try again' }) }
        }}
        onEmptyTrash={async () => {
          try { await emptyTrash(); snackbar({ message: 'Trash emptied' }) }
          catch { snackbar({ message: 'Couldn’t empty the trash — please try again' }) }
        }}
      />
      <AiSheet
        open={aiOpen}
        suggestions={aiSuggestions}
        onSelect={() => { setAiOpen(false); comingSoon() }}
        onClose={() => setAiOpen(false)}
        anchorRef={fabRef}
      />
      <div ref={fabRef} style={{ display: 'contents' }}>
        <MaisonFab onPress={() => setAiOpen((o) => !o)} raised={docked} />
      </div>
    </PageReveal>
  )
}

export function LeadsWorkspace(props: { rows: LeadRow[]; team: Member[]; now: number; deleted: Lead[]; review: ReviewRow[]; urlView: ListingView | null; stageMovement: StageMovement }) {
  return <Workspace {...props} />
}
