'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AutoHideChrome } from '@/components/shell/auto-hide-chrome'
import { rememberView, useStoredView, type ListingView } from '@/lib/leads/view-pref'
import { copyText } from '@/lib/clipboard'
import { useRouter, useSearchParams } from 'next/navigation'
import { AnimatePresence } from 'motion/react'
import { GHOST_MIN_MS, PageReveal } from '@/components/shell/page-reveal'
import { ListingGhost } from '@/components/leads/listing-ghost'
import { GhostShape, useRememberShape } from '@/lib/ghost-shape'
import { REFUSED_KEY, Tooltip } from '@/components/om/tooltip'
import { STAGE_MOVE_KEY } from '@/components/leads/move-stage/screen-context'   // (Leads on the move, B-15)
import { PageHeader } from '@/components/shell/page-header'
import { useSnackbar } from '@/components/om/snackbar'
import { IconButton } from '@/components/om/icon-button'
import { Icon } from '@/components/om/icon'
import { Button } from '@/components/ds'
import { LeadsToolbar } from '@/components/leads/toolbar'
import { LeadsTable, DEFAULT_COLUMNS, TABLET_COLUMNS, isSortableColumn, type ColumnConfig, type LeadSort } from '@/components/leads/table'
import { readListing, writeListing } from '@/lib/leads/listing-url'
import { PROPERTY_TYPES } from '@/lib/leads/enums'   // (pending modules S05) a landing's property type, read against the list   // (parity P-18)
import { assignableIds, assignHint, runsStudio, type Viewer } from '@/lib/leads/assign-policy'
import { LeadCards } from '@/components/leads/lead-cards'
import { useShortcut } from '@/lib/keys/store'
import { MOBILE, TABLET_DOWN, TOUCH_TABLET, usableViewportHeight, useMediaQuery } from '@/lib/breakpoint'
import { Dropdown, DropdownItem, DropdownDivider } from '@/components/leads/dropdown'
import { AssignPopover } from '@/components/leads/assign-popover'
import { BulkBar } from '@/components/leads/bulk-bar'
import { suggestMember, type MemberStats } from '@/lib/leads/suggest'
import type { CustomFieldDef } from '@/lib/leads/custom-fields-model'
import { withFrom } from '@/lib/nav'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'   // (Projects round 7, Q-27)
import { uploadPicked } from '@/components/leads/files/upload-picture'   // (gaps build E, item 1)
import { ColumnSettingsDrawer } from '@/components/om/column-settings'
import { resetColumnPrefs, saveColumnPrefs, useColumnPrefs } from '@/lib/column-prefs'
import { reorderColumns } from '@/components/om/column-drag'
import { clearColumnWidths } from '@/lib/table-widths'
import { useMaisonAi } from '@/lib/maison-ai'
import { useListingMaison } from '@/components/leads/use-listing-maison'
import { LeadsEmptyState } from '@/components/leads/empty-state'
import { StageDropdown, type NextMove } from '@/components/leads/stage-dropdown'
import { StageFilterDropdown } from '@/components/leads/stage-filter-dropdown'
import { FiltersModal } from '@/components/leads/filters-modal'
import { SearchEmpty } from '@/components/leads/search-empty'
import { ATTENTION_LABEL, EMPTY_FILTERS, activeFilterCount, applyFilters, inAttention, type AttentionScope, type LeadFilters } from '@/lib/leads/filters'
import { KanbanBoard, type PendingDrop } from '@/components/leads/kanban/board'
import { DeleteLeadDialog } from '@/components/leads/delete-dialog'
import { LeadFormModal, type LeadFormOpen } from '@/components/leads/lead-form'
import { TasksPopover, type TasksPos } from '@/components/leads/tasks-popover'
import { DeletedLeadsSheet } from '@/components/leads/deleted-sheet'
import { ImportWizard } from '@/components/leads/import-wizard'
import { ReviewBanner } from '@/components/leads/review-banner'
import { ReviewSheet } from '@/components/leads/review-sheet'
import { MoveStageWizard } from '@/components/leads/move-stage/wizard'
import { OnHoldDialog, LostDialog } from '@/components/leads/move-stage/dialogs'
import { ReturnLeadWizard } from '@/components/leads/return/return-lead-wizard'
import { fetchAppealDraft, fetchLeadFilesForReturn, returnLead, undoReturn, type AppealDraft, type ReturnInput } from './return-actions'
import { displayDate, displayDateLong, displayDue, isSgPhone, money, phoneDisplay, phoneLocal } from '@/lib/format'
import { filterByQuery, phoneNeedles } from '@/lib/search'
import { type Stage } from '@/lib/leads/enums'
import { isMarketing, runsLeadSetup } from '@/lib/settings/roles'   // (S44O — call C6)
import { blockedReason, detailHref, isActiveStage, isCompletedFor, journeyIdx, nextStageOf, resumeStageOf, stageIntent } from '@/lib/leads/stage-policy'
import { liveReasonNames, type LeadReasons, type StageMovement } from '@/lib/settings/types'
import { ConfirmDialog } from '@/components/om/confirm-dialog'
import { ExportDialog } from '@/components/leads/export-dialog'
import { addLeadMembers, addTask, approveImportRows, assignMembers, completeTask, countLiveSigningLinks, createLead, deleteForever, deleteLeads, emptyTrash, importLeads, markLeadSeen, mergeImportRow, moveStage, quickMoveStage, rejectImportRows, restoreLeads, setTaskDue, undoStageMove, updateLead, updateStageDetails } from './actions'
import type { DeletedLead, LeadRow, ReviewRow } from '@/lib/leads/queries'
import type { KeptLead } from '@/lib/leads/purge'   // (fix-E, E-09)
import type { LeadFile, Member } from '@/lib/db/schema'
import styles from './leads.module.css'

type Anchored = { id: string; el: HTMLElement; top: number; left: number } | null

/* Anchored popovers are fixed-position; these derive their spot from the anchor so they can follow it while the table / board scrolls. */
/* Anchored popovers clamp on BOTH axes with a 16px floor (REG-269): the old one-sided
   `innerWidth - 420` / `innerHeight - N` went NEGATIVE on a narrow or short viewport, putting the card off
   the top-left of the screen with nothing to scroll it back. `clampPos` is the shared maths: the card's own
   footprint, the viewport, an edge inset. */
const POP_EDGE = 16
const clampAxis = (preferred: number, size: number, viewport: number) =>
  Math.max(POP_EDGE, Math.min(preferred, Math.max(POP_EDGE, viewport - size - POP_EDGE)))
const clampPos = (el: HTMLElement, w: number, h: number) => {
  const r = el.getBoundingClientRect()
  return { top: clampAxis(r.bottom + 4, h, usableViewportHeight()), left: clampAxis(r.left, w, window.innerWidth) }
}
const stagePos = (el: HTMLElement) => { const r = el.getBoundingClientRect(); const h = window.matchMedia(TOUCH_TABLET).matches ? 500 : 400; return { top: clampAxis(r.bottom, h, usableViewportHeight()), left: clampAxis(r.left, 240, window.innerWidth) } }   // menu hangs from the cell's bottom-left corner (780:86452) — (leads on the move, P-05) a finger's menu leads with the next move and the rows' reasons: 500 tall
const anchorRect = (el: HTMLElement) => ({ el, ...clampPos(el, 400, 456) })
/** (REG-610) The Assign popover opened from the bulk bar — one anchored state, this id instead of a lead's. */
const BULK = '__bulk__'
const tasksPos = (el: HTMLElement) => clampPos(el, 400, 532)   /* (REG-725) the popover's head is the house 64: a full list with the composer stands 532 */
const offscreen = (el: HTMLElement) => { const r = el.getBoundingClientRect(); return r.bottom < 0 || r.top > usableViewportHeight() }

function Workspace({ rows, team, now: initialNow, deleted, review, urlView, stageMovement, sources, liveSources, importSources, viewer, leadReasons, customFields, memberStats }: { /** (REG-612) the studio's active custom fields · what the suggestion scores members on */ customFields: CustomFieldDef[]; memberStats: MemberStats; rows: LeadRow[]; team: Member[]; now: number; deleted: DeletedLead[]; review: ReviewRow[]; urlView: ListingView | null; stageMovement: StageMovement; /** (REG-599) every source to filter by · the live ones the form offers */ sources: string[]; liveSources: string[]; /** (UX audit L4) every name on the studio's source list, retired ones too — what the import reads a Lead Source cell against */ importSources: string[]; /** (REG-601) who is looking, for the assignment rules */ viewer: Viewer; /** (REG-607) the studio's Lost and On Hold reasons for the two dialogs */ leadReasons: LeadReasons }) {
  const assignable = assignableIds(viewer, team)   /* (REG-601) */
  const assignHintText = assignHint(viewer)
  /* (REG-607) The studio's reasons for the two dialogs, "Others" last; only Owners and Admins delete (parity Q-41). */
  const holdOptions = liveReasonNames(leadReasons.hold)
  const lostOptions = liveReasonNames(leadReasons.lost)
  const canDelete = runsStudio(viewer.role)
  const readsReports = runsLeadSetup(viewer.role)   // (S44O — call C6) Reports › Leads: Owners, Admins and Marketing
  const desk = isMarketing(viewer.role)   // (S44O — C6) no project is Marketing's — a Won lead's row offers no Open project
  const openInsights = () => router.push(withFrom('/company/reports/leads', here()))   /* (REG-611) · (REG-1361) a door into Company › Reports › Leads · (parity P-18) Back lands on the listing as it was */
  const [liveLinks, setLiveLinks] = useState(0)   // (REG-607, parity Q-04) contracts whose signing link is live, counted when Delete opens
  const snackbar = useSnackbar()
  const router = useRouter()

  /* (parity P-18, B-01 — Projects' model, REG-926) The listing's view lives in its address: the pill's scope, the search, the Filters groups and
     the head sort are read from it once, here, and written back below as they change (lib/leads/listing-url.ts); every lead it opens carries
     `?from=` this address, so Back lands on the listing exactly as it was. Read on the client: a browser Back restores the address, not the
     server's props. A member no longer on the team drops out of the Members filter. */
  const params = useSearchParams()
  const [landed] = useState(() => {
    const l = readListing(params, isSortableColumn)
    return { ...l, filters: { ...l.filters, assignees: l.filters.assignees.filter((id) => team.some((m) => m.id === id)) } }
  })
  const [query, setQuery] = useState(landed.query)
  const [stageScope, setStageScope] = useState<Stage | null>(landed.stage)
  /* (UX audit L3) The pill's other kind of scope — Mine or one of the to-dos; a stage and these exclude each other. */
  const [attention, setAttention] = useState<AttentionScope | null>(landed.attention)
  const [stageMenuOpen, setStageMenuOpen] = useState(false)
  const [filters, setFiltersState] = useState<LeadFilters>(landed.filters)
  /* (parity P-18) The head sort, held here so the address keeps it; a Filters sort change owns it, as the table's own rule did ("the two never
     fight": Oldest sorts the Created head ascending, Newest lets it go). */
  const [sort, setSort] = useState<LeadSort>(landed.sort)
  const setFilters = (next: LeadFilters) => {
    if (next.sort !== filters.sort) setSort(next.sort === 'oldest' ? { key: 'created', dir: 'asc' } : null)
    setFiltersState(next)
  }
  const listing = useMemo(() => ({ stage: stageScope, attention, query, filters, sort }), [stageScope, attention, query, filters, sort])
  /* Written back a beat after the last change, beside whatever else the address holds (`?view=`); `null` as the entry's state so the router
     takes the new address in (useSearchParams, a later refresh) — Next's own docs. The beat keeps a fast typist under a browser's budget. */
  useEffect(() => {
    const t = setTimeout(() => {
      const next = writeListing(listing, window.location.search)
      if (next === window.location.search.replace(/^\?/, '')) return
      try { window.history.replaceState(null, '', `${window.location.pathname}${next ? `?${next}` : ''}${window.location.hash}`) } catch { /* over the budget: the next change writes it */ }
    }, 150)
    return () => clearTimeout(t)
  }, [listing])
  /** (parity P-18) This listing's address as it stands — what every way out carries as `?from=` (from the view itself, so a press inside the
      write's beat still carries it). Read in a handler, never in render. */
  const here = () => { const q = writeListing(listing, window.location.search); return `${window.location.pathname}${q ? `?${q}` : ''}` }
  const [filtersOpen, setFiltersOpen] = useState(false)
  // View persists across refresh: ?view= in the URL wins, then the stored preference, then table.
  const storedView = useStoredView()
  const [chosenView, setChosenView] = useState<ListingView | null>(urlView)
  const view: ListingView = chosenView ?? storedView ?? 'table'
  /* (REG-299, mock 1082:23305) ≤767 the listing is the mock's cards whatever view is remembered — the toggle is
     not in the row there. Server snapshot = desktop, so the markup hydrates as the mock and the width takes over. */
  const mobile = useMediaQuery(MOBILE)
  const setView = (v: ListingView) => { setChosenView(v); rememberView(v) }
  useRememberShape('leads', rows.length === 0)   // (UX audit build) the shape the listing opened on — its loading ghost draws the same one next time
  const deskColumns = useColumnPrefs<ColumnConfig>('leads', DEFAULT_COLUMNS)   // per user, in the browser (REG-454)
  /* (Leads on the move, L3 — P-06 · A-12) A touch tablet opens the table on its own set — Name · Stage · Last contact · Next follow-up · Members —
     remembered apart (`om.columns.leads.tablet`, the table core's tablet default, REG-2564's way): a column shown on the desk stays shown there. */
  const touchTablet = useMediaQuery(TOUCH_TABLET) && !mobile
  const tabletColumns = useColumnPrefs<ColumnConfig>('leads.tablet', TABLET_COLUMNS)
  const columnsKey = touchTablet ? 'leads.tablet' : 'leads'
  const columns = touchTablet ? tabletColumns : deskColumns
  /* (Leads on the move, P-08) ≤1024 a new lead opens on its own page, ready to call — the desk keeps the snackbar and the listing */
  const openAfterCreate = useMediaQuery(TABLET_DOWN)
  const [columnsOpen, setColumnsOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [kebabOpen, setKebabOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  /* (parity P-25, B-16) The bulk bar's Export opens the statement on the selection ("Selected leads"); ⋮ › Export all as… on none. */
  const [exportPicked, setExportPicked] = useState<LeadRow[] | null>(null)
  const [assign, setAssign] = useState<Anchored>(null)
  /* (Leads on the move, L3 — A-06) The stage sheet's fix: Assign, then the move the person asked for — the Move stage window opens once the
     member is on the lead (its owner rule met, REG-130), never a second trip back to the pill. */
  const [assignThen, setAssignThen] = useState<{ leadId: string; stage: Stage } | null>(null)
  /* (UX audit L5) The leads the BULK Assign popover acts on when it was opened for an import's new leads, not the selection. */
  const [bulkIds, setBulkIds] = useState<string[] | null>(null)
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
  const [confirmMove, setConfirmMove] = useState<{ leadId: string; stage: Stage; step?: boolean } | null>(null)   // linear: moving back needs no details, just a nod
  const [holdOpenedAt, setHoldOpenedAt] = useState(0)
  const [holdReason, setHoldReason] = useState('')   // set from the studio's list when the dialog opens (REG-607)
  /* (Dane's UAT 9.08) The Lost dialog's "Put On Hold instead": On Hold opens on its Custom date, set to the expected restart. */
  const [holdFrom, setHoldFrom] = useState<Date | null>(null)
  const [lostReason, setLostReason] = useState('')
  const [deleting, setDeleting] = useState<string[] | null>(null)
  /* (REG-607, parity Q-04) Delete opens with the count of contracts whose signing link is still live with the client. */
  const openDelete = (ids: string[]) => { setDeleteReason('Spam'); setLiveLinks(0); setDeleting(ids); void countLiveSigningLinks(ids).then(setLiveLinks).catch(() => setLiveLinks(0)) }
  const [deletedOpen, setDeletedOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  // The queue emptied under an open sheet → close it (render-phase adjust; the action's snackbar is the cue).
  if (reviewOpen && review.length === 0) setReviewOpen(false)
  const docked = review.length > 0 && !reviewOpen
  // Bottom-docked overlays (FAB, bulk bar, snackbar, AI sheet) lift above the review banner through `--bottom-dock`,
  // which the banner itself writes from its measured height (REG-302, components/leads/review-banner.tsx).
  const deletingRef = useRef(false)
  const [deleteReason, setDeleteReason] = useState('Spam')
  const [nowTick, setNowTick] = useState(initialNow)
  const [leadForm, setLeadForm] = useState<LeadFormOpen | null>(null)
  const [tasksFor, setTasksFor] = useState<({ id: string; el: HTMLElement } & TasksPos) | null>(null)
  const addRef = useRef<HTMLDivElement>(null)
  /* Return Lead from a row / kanban kebab (Qanvast leads only, REG-139) → the same wizard as the overview (931:48813, spec design-source/context/lead-return/).
     The listing has no files in memory, so they are fetched when the menu item is pressed. */
  const [returning, setReturning] = useState<{ leadId: string; files: LeadFile[]; appeal: AppealDraft | null } | null>(null)
  const openReturn = async (lead: LeadRow) => {
    setAssign(null); setStageMenu(null); setTasksFor(null)
    let files: LeadFile[] = []
    try { files = await fetchLeadFilesForReturn(lead.id) } catch { files = [] }
    /* (pending modules S05) a lead whose return Qanvast rejected is appealed — the wizard on that return as it was sent */
    const appeal = lead.returnStatus === 'rejected' ? await fetchAppealDraft(lead.id).catch(() => null) : null
    setReturning({ leadId: lead.id, files, appeal })
  }

  /* ---- Stage movement policy (Settings › Leads, user 2026-08-29) ----
     linear: one stage at a time through the Move stage window; later stages are locked, earlier ones are a confirm away.
     flexible: instant moves with Undo; only Won (it creates the project) opens the window. On Hold / Lost keep their dialogs. */
  // The pure rules (stageIntent · journeyIdx · blockedReason · isCompletedFor) live in lib/leads/stage-policy, shared with the Lead Details pages.
  const fail = (what: string) => snackbar({ message: `Couldn’t ${what} — please try again` })
  /** Every stage-move action runs through here: a failure gets the module's snackbar and releases a held kanban drop
      (on success the render-phase adjust above releases it once the refreshed rows agree, so the card never springs back first). */
  const run = async (what: string, fn: () => Promise<unknown>) => {
    try { await fn() } catch { fail(what); setPendingDrop(null) }
  }
  const quickMove = (lead: LeadRow, stage: Stage) => run('move the lead', async () => {
    const r = await quickMoveStage({ leadId: lead.id, fromStage: lead.stage, toStage: stage })
    if ('error' in r) { setPendingDrop(null); snackbar({ message: couldnt('move the lead', refusalOf(r.error)) }); return }   // (fix-E, A-01) the server's rule, said
    const { logId } = r
    snackbar({ message: `Moved to ${stage}`, key: STAGE_MOVE_KEY, actionLabel: 'Undo', onAction: () => { void run('undo the move', () => undoMove(lead.id, logId, lead.stage)) } })   // (Leads on the move, B-15)
  })
  /** (fix-E, E-09) Delete Forever / Empty Trash: what went — and, named, what stayed and why, with the way to its project. Deleted Leads
      purges the rest instead of refusing the whole trash for one lead. */
  const purged = (r: { removed: number; kept: KeptLead[] }, done: string) => {
    if (!r.kept.length) { snackbar({ message: done }); return }
    const k = r.kept[0]!
    const head = r.removed ? `${r.removed} deleted forever` : 'Nothing was deleted'
    const who = r.kept.length === 1 ? `${k.name} stays: ${k.deleted ? `${k.number} is in Deleted Projects` : 'its project is live'}` : `${r.kept.length} leads stay — they have projects`   // the house snackbar's width: the confirm said the rest
    snackbar({ message: `${head} — ${who}`, ...(r.kept.length === 1 ? { actionLabel: k.deleted ? 'Deleted Projects' : 'Open project', onAction: () => router.push(k.deleted ? `/projects?deleted=${encodeURIComponent(k.projectId)}` : withFrom(`/projects/${k.projectId}`, here())) } : {}) })
  }
  /** (fix-E, A-01) Every Undo of a move: a refusal (a lead whose project is live stays Won) says its rule. */
  const undoMove = async (leadId: string, logId: string, toStage: string) => {
    const u = await undoStageMove({ leadId, logId, toStage })
    if (u && 'error' in u) snackbar({ message: couldnt('undo the move', refusalOf(u.error)) })
  }
  /** Every stage change — table dropdown or kanban drop — comes through here.
      The branch set itself is `stageIntent` in lib/leads/stage-policy, shared with Lead Details (REG-286):
      this half only maps the intent onto the listing's dialogs, snackbar and held kanban drop. */
  const requestStageChange = (lead: LeadRow, stage: Stage) => {
    const intent = stageIntent(lead, stage, stageMovement, viewer.role)
    switch (intent.kind) {
      case 'none': setPendingDrop(null); return
      /* (UX audit 2026-09-30, L10) no reason pre-chosen — the required field asks for one (the Overview's rule too) */
      case 'hold': setHoldReason(''); setHoldFrom(null); setHoldOpenedAt(Date.now()); setOnHold(lead.id); return
      case 'lost': setLostReason(''); setLost(lead.id); return
      case 'blocked': setPendingDrop(null); snackbar({ message: intent.message, key: REFUSED_KEY }); return   // (Leads on the move, B-14) a sheet opening next withdraws it
      case 'confirm-resume': setConfirmMove({ leadId: lead.id, stage: intent.stage, step: intent.step }); return
      case 'wizard': setWizard({ leadId: lead.id, target: intent.stage }); return
      case 'quick': void quickMove(lead, intent.stage); return
    }
  }

  /** (Leads on the move, L3 — P-05 · Q-05 · A-06 · A-07) A card's stage sheet leads with the lead's next move — the lead page's primary: Move to
      {next}, Resume at {stage} for a parked lead; refused, the rule's sentence and, for the owner rule, Assign as the fix. Won has none. */
  const nextMoveFor = (row: LeadRow, anchor: HTMLElement | null): NextMove | null => {
    if (row.stage === 'Won') return null
    const target: Stage | null = isActiveStage(row.stage) ? nextStageOf(row) : resumeStageOf(row)
    if (!target) return null
    const label = isActiveStage(row.stage) ? `Move to ${target}` : `Resume at ${target}`
    const go = () => { setStageMenu(null); requestStageChange(row, target) }
    const intent = stageIntent(row, target, stageMovement, viewer.role)
    if (intent.kind !== 'blocked') return { label, onPress: go }
    const owner = intent.message === 'Assign a member first' && !assignHintText
    return {
      label, onPress: go, why: intent.message,
      fix: owner ? { label: 'Assign', onPress: () => { setStageMenu(null); setTasksFor(null); setAssignThen({ leadId: row.id, stage: target }); setAssign({ id: row.id, ...anchorRect(anchor ?? document.body) }) } } : null,
    }
  }

  const effectiveRows = useMemo(() => rows.map((r) => {
    const o = optimisticAssignees[r.id]
    if (!o) return r
    return { ...r, assignees: o.map((id) => team.find((m) => m.id === id)).filter((m): m is Member => !!m) }
  }), [rows, optimisticAssignees, team])

  // The primary band on a row = a new lead nobody has seen or clicked yet (user 2026-08-29). First interaction clears it.
  const [seenLocally, setSeenLocally] = useState<Set<string>>(() => new Set())
  const unseenIds = useMemo(() => new Set(rows.filter((r) => r.seenAt === null && !seenLocally.has(r.id)).map((r) => r.id)), [rows, seenLocally])
  const markSeen = (row: LeadRow) => {
    if (!unseenIds.has(row.id)) return
    setSeenLocally((s) => new Set(s).add(row.id))
    void markLeadSeen(row.id)
  }
  /** (parity P-18) A lead opened from the table, the kanban or a card: seen, then opened with the way back to this listing as it is. */
  const openLead = (lead: LeadRow) => { markSeen(lead); router.push(withFrom(`/leads/${lead.id}`, here())) }
  // Pipeline: stage scope (pill) → Filters modal → live search.
  /* (UX audit L3) …or the pill's attention scope: Mine, Overdue follow-ups (parked and Lost leads left out), Unassigned, Unseen (the band's own rule). */
  const scopeCtx = useMemo(() => ({ now: nowTick, viewerId: viewer.id, unseen: (r: LeadRow) => unseenIds.has(r.id) }), [nowTick, viewer.id, unseenIds])
  const scoped = useMemo(() => (stageScope ? effectiveRows.filter((r) => r.stage === stageScope)
    : attention ? effectiveRows.filter((r) => inAttention(r, attention, scopeCtx))
    : effectiveRows), [effectiveRows, stageScope, attention, scopeCtx])
  const attentionCounts = useMemo(() => {
    const c: Record<AttentionScope, number> = { mine: 0, overdue: 0, unassigned: 0, unseen: 0, today: 0 }
    for (const r of effectiveRows) for (const k of Object.keys(c) as AttentionScope[]) if (inAttention(r, k, scopeCtx)) c[k]++
    return c
  }, [effectiveRows, scopeCtx])
  const filtered = useMemo(() => {
    const base = applyFilters(scoped, filters, nowTick)
    /* Search stays the LAST step of the pipeline, and now matches everything a row SHOWS (REG-274, user
       2026-09-01: "in the lead listing search i should be able to search by mobile number as well").
       Matched fields: lead name · stage label · task titles · assignee NAMES · source · budget (the column's
       own "70,500", also the card's "S$70,500") · property type · the DISPLAYED created date ("17 Jul ’26",
       via the table's own displayDate, never the raw timestamp) · the On Hold follow-up date shown beside the
       phone · property address (the Customise-view column) · email — email is the one value with no column
       today, but it is on the lead and people look leads up by it.
       Phone goes through the matcher's `phones` argument, which compares DIGITS-ONLY on both sides at any
       length: "98", "9812 0443" and "+65 9812 0443" all find the stored "98120443". The old rule gated phones
       on `qDigits.length >= 3` and matched nothing else, so typing "98" — the start of five real numbers —
       emptied the list, and no lead could be found by its email, address, stage, assignee or task. */
    return filterByQuery(base, query, (r) => ({
      fields: [
        r.name, r.stage, r.source, r.propertyType, r.email, r.propertyAddress,
        r.area,   /* (pending modules S46C · H4 — 1.0's "Search name, area, phone, email") the District, as the District column (REG-607) prints it */
        r.budgetMinor > 0 ? money(r.budgetMinor) : null, displayDate(r.createdAt),   /* (UX audit L8) an unknown budget shows "--", so "0" finds nothing */
        r.onHoldFollowUp ? displayDateLong(new Date(r.onHoldFollowUp)) : null,   /* (Dane UAT 5.13) as the row prints it, with its day */
        ...r.tasks.map((t) => t.title),
        ...r.assignees.map((m) => m.name),
      ],
      phones: [r.phone],
    }))
  }, [scoped, filters, query, nowTick])
  /* (REG-610, parity Q-31) Row selection on the listing's table — the Deleted sheet's pattern; the bulk bar offers Assign (adds
     members) and Delete. A selection survives a filter change only for the rows still shown. */
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const liveSelected = useMemo(() => new Set([...selected].filter((id) => filtered.some((r) => r.id === id))), [selected, filtered])
  const toggleSelect = (id: string) => setSelected((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const toggleSelectAll = () => setSelected((prev) => (filtered.length > 0 && filtered.every((r) => prev.has(r.id)) ? new Set() : new Set(filtered.map((r) => r.id))))
  /* (REG-610, parity L-16 · REG-713) 1.0's "C" opens New Lead — now through the shared keyboard (components/shell/shortcuts), which
     answers it only when nothing is typed into and no dialog or menu is open, and obeys the single-key switch. */
  const openCreate = useCallback(() => setLeadForm({ mode: 'create' }), [])
  /* (pending modules S05 — the card's "Maison AI creates or updates a lead and moves its stage · revisit: it already does this for projects
     (REG-1645)") Maison AI's "Add a lead for …" lands here with `?new=1&client=&phone=&ptype=&budget=&source=&email=`: Create New Lead opens
     filled in once the page has revealed — nothing is made without the form — and the address keeps nothing (the Projects listing's way). */
  const fillOf = (q: { get: (k: string) => string | null }) => {
    if (q.get('new') !== '1') return null
    const num = (q.get('budget') ?? '').replace(/\D/g, '').slice(0, 9)
    const pick = (v: string | null, list: readonly string[]) => (v && list.includes(v) ? v : '')
    return {
      name: (q.get('client') ?? '').slice(0, 80), phone: (q.get('phone') ?? '').replace(/\D/g, '').slice(-8),
      propertyType: pick(q.get('ptype'), PROPERTY_TYPES), source: pick(q.get('source'), liveSources), email: (q.get('email') ?? '').slice(0, 120),
      budget: num ? Number(num).toLocaleString('en-SG') : '',
    }
  }
  /* on arrival, or while the listing is open (the address changes under it — the Projects listing's way, render-phase adjust) */
  const newKey = params.get('new') === '1' ? params.toString() : ''
  const [landNew, setLandNew] = useState<{ key: string; fill: ReturnType<typeof fillOf> } | null>(() => (newKey ? { key: newKey, fill: fillOf(params) } : null))
  const [seenNewKey, setSeenNewKey] = useState(newKey)
  if (seenNewKey !== newKey) { setSeenNewKey(newKey); if (newKey) setLandNew({ key: newKey, fill: fillOf(params) }) }
  useEffect(() => {
    if (!landNew?.fill) return
    const q = new URLSearchParams(window.location.search)
    for (const k of ['new', 'client', 'phone', 'ptype', 'budget', 'source', 'email', 'from']) q.delete(k)   // `from`: the listing has no Back — Maison AI's door carried it
    router.replace(`${window.location.pathname}${q.size ? `?${q}` : ''}${window.location.hash}`, { scroll: false })
    const fill = Object.fromEntries(Object.entries(landNew.fill).filter(([, v]) => v))
    const t = window.setTimeout(() => setLeadForm({ mode: 'create', prefill: fill }), GHOST_MIN_MS)
    return () => window.clearTimeout(t)
  }, [landNew, router])
  useShortcut('create', openCreate, true, 'Create New Lead')
  // Selection follows the pipeline: ids hidden by scope / filters / search drop out (render-phase adjust).
  const stageCounts = useMemo(() => {
    const c: Record<string, number> & { all: number } = { all: effectiveRows.length }
    for (const r of effectiveRows) c[r.stage] = (c[r.stage] ?? 0) + 1
    return c
  }, [effectiveRows])
  const clearAll = () => { setQuery(''); setStageScope(null); setAttention(null); setFilters(EMPTY_FILTERS) }
  const nothingMatches = rows.length > 0 && filtered.length === 0 && (query.trim() !== '' || activeFilterCount(filters) > 0 || stageScope !== null || attention !== null)
  /* (UX audit L11) A search that is a Singapore number ("+65 9123 4599", caller ID's way) and finds nobody offers to add the lead with it. */
  const phoneQuery = (() => { if (/[a-z@]/i.test(query)) return null; const local = phoneNeedles(query).at(-1) ?? ''; return isSgPhone(local) ? local : null })()

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
  const anyAnchored = !!(stageMenu || assign || tasksFor)
  useEffect(() => {
    if (!anyAnchored) return
    const follow = () => {
      setStageMenu((s) => (s ? (offscreen(s.el) ? null : { ...s, ...stagePos(s.el) }) : s))
      setAssign((s) => (s ? (offscreen(s.el) ? null : { ...s, ...anchorRect(s.el) }) : s))
      setTasksFor((s) => (s ? (offscreen(s.el) ? null : { ...s, ...tasksPos(s.el) }) : s))
    }
    document.addEventListener('scroll', follow, true)
    window.addEventListener('resize', follow)
    return () => { document.removeEventListener('scroll', follow, true); window.removeEventListener('resize', follow) }
  }, [anyAnchored])

  const applyAssign = async (memberIds: string[]) => {
    if (!assign) return
    if (assign.id === BULK) {   /* (REG-610) the bulk bar's Assign: add the ticked members to every selected lead — (UX audit L5) or to an import's new leads */
      const ids = bulkIds ?? [...liveSelected]
      setAssign(null); setBulkIds(null)
      try {
        const { assigned } = await addLeadMembers(ids, memberIds)
        const names = team.filter((m) => memberIds.includes(m.id)).map((m) => m.name).join(', ')
        snackbar({ message: assigned === 0 ? 'Already on every selected lead' : `${assigned} lead${assigned === 1 ? '' : 's'} assigned to ${names}` })
        setSelected(new Set())
        router.refresh()
      } catch { fail('assign the leads') }
      return
    }
    const leadId = assign.id
    const then = assignThen?.leadId === leadId ? assignThen : null
    setAssignThen(null)
    setOptimisticAssignees((o) => ({ ...o, [leadId]: memberIds }))
    setAssign(null)
    try {
      await assignMembers(leadId, memberIds)
      snackbar({ message: 'Members updated' })
      /* (A-06) the move the stage sheet was asked for, now that the lead has its member */
      const lead = rows.find((r) => r.id === leadId)
      if (then && lead && memberIds.length > 0) requestStageChange({ ...lead, assignees: team.filter((m) => memberIds.includes(m.id)) }, then.stage)
    } catch {
      // Back to the server's assignees — the optimistic set must not outlive a failed action.
      setOptimisticAssignees((o) => { const n = { ...o }; delete n[leadId]; return n })
      fail('update the members')
    }
  }

  const assignValue = assign
    ? (optimisticAssignees[assign.id] ?? rows.find((r) => r.id === assign.id)?.assignees.map((m) => m.id) ?? [])
    : []

  /* (UX audit L5) An import's next step: its new leads are selected (the table shows them, the bulk bar holds them) and the bulk Assign
     popover opens on them — hung from Add Lead, where the import began; a phone draws it as its sheet. */
  const canAssignImports = !assignHintText
  const openImportAssign = (ids: string[]) => {
    if (ids.length === 0) return
    setImportOpen(false)
    setStageMenu(null); setTasksFor(null)
    setSelected(new Set(ids))
    setBulkIds(ids)
    requestAnimationFrame(() => {
      const el = addRef.current ?? document.querySelector<HTMLElement>('[data-kb="create"]') ?? document.body
      setAssign({ id: BULK, ...anchorRect(el) })
    })
  }
  const openReviewFromImport = () => { setImportOpen(false); setNowTick(Date.now()); setReviewOpen(true) }


  /* (pending modules S05) The listing's three suggestions act, from the listing's own rows — (pending modules S10) one builder for the listing
     and Qanvast Ops › Leads (components/leads/use-listing-maison.ts) */
  const aiSuggestions = useListingMaison({ rows, newest: newest ?? null, team })
  useMaisonAi(aiSuggestions, docked)   /* (REG-507) the shell's FAB + sheet carry the listing's suggestions, raised above the review banner */

  /* The header's two menus, shared by the desktop and the mobile action sets (REG-299). */
  const addMenu = (
    <Dropdown open={addOpen} onClose={() => setAddOpen(false)} align="right" sheetTitle="Add Lead">
      <DropdownItem onSelect={() => { setAddOpen(false); setLeadForm({ mode: 'create' }) }} shortcut="create">Create New Lead</DropdownItem>
      <DropdownItem onSelect={() => { setAddOpen(false); setImportOpen(true) }}>Import from File</DropdownItem>
      <DropdownDivider />
      <DropdownItem onSelect={() => { setAddOpen(false); router.push('/company/integrations#email') }}>Link to Email</DropdownItem>   {/* (REG-602) the website's intake address */}
      <DropdownItem onSelect={() => { setAddOpen(false); router.push('/company/integrations#webhooks') }}>Link to Zapier</DropdownItem>   {/* (REG-612) the webhook card */}
      <DropdownItem onSelect={() => { setAddOpen(false); router.push('/company/integrations#meta') }}>Connect to Ads</DropdownItem>   {/* (REG-602) Meta Lead Ads */}
    </Dropdown>
  )
  const kebabMenu = (
    <Dropdown open={kebabOpen} onClose={() => setKebabOpen(false)} align="right" sheetTitle="Leads">
      <DropdownItem onSelect={() => { setKebabOpen(false); router.push('/leads/imports') }}>Lead Import History</DropdownItem>
      <DropdownItem onSelect={() => { setKebabOpen(false); setNowTick(Date.now()); setExportPicked(null); setExportOpen(true) }}>Export all as…</DropdownItem>
      <DropdownItem onSelect={() => { setKebabOpen(false); setDeletedOpen(true) }}>Deleted Leads</DropdownItem>
      <DropdownItem onSelect={() => { setKebabOpen(false); router.push(withFrom('/settings?section=leads', here())) }}>Leads Settings</DropdownItem>   {/* (REG-645) Lead management, Back returns here — (parity P-18) as it was */}
    </Dropdown>
  )

  return (
    <PageReveal skeleton={<GhostShape first={rows.length === 0}><ListingGhost /></GhostShape>}>   {/* (REG-708) the view's ghost, the one loading.tsx drew */}
        {/* (REG-401) The listing is the one surface that asked for it: ≤767 the chrome slides away as the list
            scrolls down and comes back on the way up. Renders nothing; inert at every wider width. */}
        <AutoHideChrome />
        <div className={styles.body} style={{ position: 'relative' }} data-view={mobile ? 'cards' : view}>
          <PageHeader
            title="Leads"
            actions={mobile ? (
              /* (REG-299, 1082:25131) The mobile header: Add Lead as the filled square, Insights and the kebab as
                 outlined squares — the same two menus, the same actions, icon-only. */
              <>
                {rows.length === 0 ? null : (   /* (REG-735) no lead yet: the empty card carries Create and Import */
                <div ref={addRef} style={{ position: 'relative' }}>
                  <Tooltip label="Add Lead" disabled={addOpen}>
                    <IconButton icon="add" label="Add Lead" variant="filled" aria-haspopup="menu" aria-expanded={addOpen} onClick={() => setAddOpen((o) => !o)} />
                  </Tooltip>
                  {addMenu}
                </div>
                )}
                {readsReports ? (   /* (REG-611, parity Q-24 · Q-41) Insights is Owners' and Admins' — (S44O — C6) and Marketing's */
                  <Tooltip label="Insights">
                    <IconButton icon="bar_chart_4_bars" label="Insights" onClick={openInsights} />
                  </Tooltip>
                ) : null}
                <div style={{ position: 'relative' }}>
                  <Tooltip label="More options" disabled={kebabOpen}>
                    <IconButton icon="more_vert" label="More options" aria-haspopup="menu" aria-expanded={kebabOpen} onClick={() => setKebabOpen((o) => !o)} />
                  </Tooltip>
                  {kebabMenu}
                </div>
              </>
            ) : (
              /* (REG-305, user 2026-09-02) Add Lead first, then Insights — the order the mobile mock draws (1082:25131). */
              <>
                {/* (REG-735) no lead yet: one filled button on the screen — the empty card's Create New Lead (it takes C) */}
                {rows.length === 0 ? null : (
                <div ref={addRef} style={{ position: 'relative' }} data-kb="create" data-kb-label="Create New Lead">   {/* (REG-713) C: lit here, answered by the create handler */}
                  <Button iconStart={<Icon name="add" size={20} />} aria-haspopup="menu" aria-expanded={addOpen} onPress={() => setAddOpen((o) => !o)}>
                    Add Lead
                  </Button>
                  {addMenu}
                </div>
                )}
                {readsReports ? (   /* (REG-611, parity Q-24 · Q-41) Insights is Owners' and Admins' — (S44O — C6) and Marketing's */
                  <Button variant="secondary" appearance="outlined"
                          iconStart={<Icon name="bar_chart_4_bars" size={20} />} onPress={openInsights}>
                    Insights
                  </Button>
                ) : null}
                <div style={{ position: 'relative' }}>
                  <Tooltip label="More options" disabled={kebabOpen}>
                    <IconButton icon="more_vert" label="More options" aria-haspopup="menu" aria-expanded={kebabOpen} onClick={() => setKebabOpen((o) => !o)} />
                  </Tooltip>
                  {kebabMenu}
                </div>
              </>
            )}
          />
          <div className={styles.content}>
            <LeadsToolbar bare={rows.length === 0}
              chipLabel={rows.length === 0 ? 'All Leads' : `${attention ? ATTENTION_LABEL[attention] : stageScope ?? 'All Leads'} (${filtered.length})`}   /* (UX audit L3) the pill names the scope it holds */
              onChipClick={() => { setNowTick(Date.now()); setStageMenuOpen((o) => !o) }}   /* the counts' clock: Overdue is "before today" */
              chipOpen={stageMenuOpen}
              chipScoped={stageScope !== null || attention !== null}   // (REG-295) a stage scope is a filter — say so; (UX audit L3) so is an attention scope
              onViewAll={() => { setStageScope(null); setAttention(null) }}   /* (Dane's UAT 1.05) back to All Leads in one press — search and Filters stay */
              /* (Leads on the move, L3 — P-05) a phone's "n to call today": the follow-ups due today or late, one press from the list */
              todo={mobile && rows.length > 0 && (attentionCounts.today > 0 || attention === 'today') ? {
                label: `${attentionCounts.today} to call today`, selected: attention === 'today',
                onClick: () => { setNowTick(Date.now()); if (attention === 'today') setAttention(null); else { setAttention('today'); setStageScope(null) } },
              } : null}
              chipMenu={
                <StageFilterDropdown open={stageMenuOpen} onClose={() => setStageMenuOpen(false)}
                                     counts={stageCounts} value={stageScope}
                                     onSelect={(s) => { setStageScope(s); setAttention(null) }} onManage={() => router.push(`${withFrom('/settings?section=leads', here())}#lead-stages`)}   /* (pending modules S05) Manage Stages › Settings › Lead management › Lead stages */
                                     phone={mobile}   /* (leads on the move, P-05) To call today leads the phone's To do group */
                                     attention={{ counts: attentionCounts, value: attention, onSelect: (k) => { setAttention(k); setStageScope(null) } }} />
              }
              query={query}
              onQueryChange={setQuery}
              onFilterClick={() => { setNowTick(Date.now()); setFiltersOpen(true) }}
              onColumnsClick={mobile ? undefined : () => setColumnsOpen(true)}   /* the phone's cards place every cell themselves (REG-454) */
              filterCount={activeFilterCount(filters)}
              view={view}
              onViewChange={(v) => { setNowTick(Date.now()); setView(v) }}
            />
            {rows.length === 0 ? (
              <LeadsEmptyState onImport={() => setImportOpen(true)} onCreate={() => setLeadForm({ mode: 'create' })} />
            ) : nothingMatches && (mobile || view === 'table') ? (
              <SearchEmpty onClearAll={clearAll} searching={query.trim() !== ''}
                           phone={phoneQuery ? phoneLocal(phoneQuery) : null}
                           onAddPhone={phoneQuery ? () => setLeadForm({ mode: 'create', prefill: { phone: phoneQuery } }) : undefined} />
            ) : mobile ? (
              /* (REG-299) The mock's cards — the table's anchors and popovers, one code path for every action. */
              <LeadCards
                rows={filtered}
                now={nowTick}
                query={query}
                openStageId={stageMenu?.id ?? null}
                unseenIds={unseenIds} onSeen={markSeen}   /* (leads on the move, A-01) the new mark, cleared on the first press */
                onOpen={openLead}   /* (parity P-18) */
                onStageClick={(row, anchor) => setStageMenu((m) => (m?.id === row.id ? null : { id: row.id, el: anchor, ...stagePos(anchor) }))}   /* toggles on its own cell (REG-153 / REG-332) */
                onTaskClick={openTasks}
                onAssignClick={(row, anchor) => setAssign((a) => (a?.id === row.id ? null : { id: row.id, ...anchorRect(anchor) }))}
              />
            ) : view === 'kanban' ? (
              <KanbanBoard
                canDelete={canDelete}
                rows={filtered}
                query={query}
                now={nowTick}
                unseenIds={unseenIds}
                onClearSearch={clearAll}
                stageScope={stageScope}
                filtering={activeFilterCount(filters) > 0 || attention !== null || (stageScope !== null && filtered.length === 0)}
                onKebabDelete={(lead) => { openDelete([lead.id]) }}
                onOpenProject={desk ? undefined : (lead) => { if (lead.project) router.push(withFrom(`/projects/${lead.project.id}`, here())) }}   /* (fix-E, A-09) */
                onKebabReturn={(lead) => { void openReturn(lead) }}
                onAssign={(row, anchor) => setAssign((a) => (a?.id === row.id ? null : { id: row.id, ...anchorRect(anchor) }))}
                pendingDrop={pendingDrop}
                onDragToStage={(lead, stage) => {
                  setPendingDrop({ leadId: lead.id, stage })
                  requestStageChange(lead, stage)
                }}
                canDrop={(lead, stage) => !blockedReason(lead, stage, stageMovement, viewer.role) && !isCompletedFor(lead, stage)}
                onDropBlocked={(lead, stage) => {
                  // Backward drops are simply not allowed (user 2026-08-29): the card springs back with the reason.
                  if (isCompletedFor(lead, stage)) { snackbar({ message: `${stage} is already completed — stages don’t move back`, key: REFUSED_KEY }); return }
                  snackbar({ message: blockedReason(lead, stage, stageMovement, viewer.role) ?? '', key: REFUSED_KEY })
                }}
                onNameClick={openLead}   /* (parity P-18) */
                onTaskClick={openTasks}
                /* (leads on the move, P-06 · A-15) a touch tablet's card carries the stage pill and ⋮ › Move to {next} — drag gives way to the pan there */
                openStageId={stageMenu?.id ?? null}
                onStageClick={(row, anchor) => setStageMenu((m) => (m?.id === row.id ? null : { id: row.id, el: anchor, ...stagePos(anchor) }))}
                nextMove={(row) => nextMoveFor(row, null)}
              />
            ) : (
              <LeadsTable
                canDelete={canDelete}
                rows={filtered}
                columns={columns}
                onReorder={(keys) => saveColumnPrefs(columnsKey, reorderColumns(columns, keys))}
                touchTablet={touchTablet}   /* (leads on the move, P-06) the tablet's tracks, Edit and ⋮ frozen at the right */
                unseenIds={unseenIds}
                onRowSeen={markSeen}
                onNameClick={openLead}   /* (parity P-18) */
                openStageId={stageMenu?.id ?? null}
                onStageClick={(row, anchor) => setStageMenu((m) => (m?.id === row.id ? null : { id: row.id, el: anchor, ...stagePos(anchor) }))}   /* toggles on its own cell (REG-153 / REG-332) */
                onTaskClick={openTasks}
                now={nowTick}
                onAssignClick={(row, anchor) => setAssign((a) => (a?.id === row.id ? null : { id: row.id, ...anchorRect(anchor) }))}
                selectable selected={liveSelected} onToggleSelect={toggleSelect} onToggleSelectAll={toggleSelectAll}   /* (REG-610, parity Q-31) */
                query={query}
                filterSort={filters.sort}
                sort={sort} onSortChange={setSort}   /* (parity P-18) the head sort lives in the address */
                onEditRow={(row) => setLeadForm({ mode: 'edit', lead: row })}
                onDeleteRow={(row) => { openDelete([row.id]) }}
                onOpenProject={desk ? undefined : (row) => { if (row.project) router.push(withFrom(`/projects/${row.project.id}`, here())) }}   /* (fix-E, A-09) */
                onReturnRow={(row) => { void openReturn(row) }}
                onCopyPhone={async (row) => {
                  // (REG-287) `phoneDisplay` is the app's one copy/export format — the literal "+65 ${row.phone}"
                  // template this replaced was a second rule that only agreed with it by luck.
                  try {
                    await copyText(phoneDisplay(row.phone))
                    snackbar({ message: 'Copied to clipboard' })
                  } catch {
                    snackbar({ message: phoneDisplay(row.phone) })
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
          return row ? blockedReason(row, stage, stageMovement, viewer.role) : null
        }}
        current={rows.find((r) => r.id === stageMenu?.id)?.stage as Stage | undefined ?? null}
        subject={(() => { const row = rows.find((r) => r.id === stageMenu?.id); return row ? `${row.name} · ${phoneLocal(row.phone)}` : undefined })()}
        next={(() => { const row = effectiveRows.find((r) => r.id === stageMenu?.id); return row ? nextMoveFor(row, stageMenu?.el ?? null) : null })()}   /* (leads on the move, P-05 · Q-05) */
        doneThrough={(() => { const row = rows.find((r) => r.id === stageMenu?.id); return row ? journeyIdx(row) : -1 })()}
        onSelect={(stage) => {
          const leadId = stageMenu!.id
          setStageMenu(null)
          const row = rows.find((r) => r.id === leadId)
          if (row) requestStageChange(row, stage)
        }}
      />
      {/* (REG-610, parity L-32) The statement's fields: all leads or what the list shows, the period, the columns, the format.
          (parity P-25, B-16) From the bulk bar, the statement opens on the selected leads. */}
      <ExportDialog open={exportOpen} rows={rows} all={rows} shown={filtered} selected={exportPicked ?? undefined} listingColumns={columns.filter((c) => c.visible).map((c) => c.key)} now={nowTick} onClose={() => { setExportOpen(false); setExportPicked(null) }}
                    onDone={(name, format, count) => snackbar({ message: `Exported ${count ?? rows.length} lead${(count ?? rows.length) === 1 ? '' : 's'} as ${format} · ${name}` })} />
      {view === 'table' && !mobile ? (
        <BulkBar count={liveSelected.size} onClear={() => setSelected(new Set())}
                 actions={[
                   ...(assignHintText ? [] : [{ label: 'Assign', onClick: (e: React.MouseEvent<HTMLButtonElement>) => { setBulkIds(null); setAssign({ id: BULK, ...anchorRect(e.currentTarget) }) } }]),
                   /* (parity P-25, B-16) Projects' bar has it: the selection as the statement's "Selected leads" — anyone who sees the list exports it */
                   { label: 'Export', onClick: () => { setNowTick(Date.now()); setExportPicked(filtered.filter((r) => liveSelected.has(r.id))); setExportOpen(true) } },
                   ...(canDelete ? [{ label: 'Delete', tone: 'danger' as const, kb: 'delete', onClick: () => openDelete([...liveSelected]) }] : []),
                 ]} />
      ) : null}
      <ConfirmDialog
        open={!!confirmMove}
        tone="primary"
        title={`Resume at ${confirmMove?.stage ?? ''}?`}
        message={confirmMove?.step
          ? `The ${confirmMove.stage} step opens next — ${rows.find((r) => r.id === confirmMove.leadId)?.stage ?? 'On Hold'} ends once it is saved. Details already recorded stay on its journey.`   /* (UX audit 2026-09-30, L1) */
          : `${rows.find((r) => r.id === confirmMove?.leadId)?.stage ?? 'On Hold'} ends and the lead continues from ${confirmMove?.stage ?? ''}. Details already recorded stay on its journey.`}
        confirmLabel="Resume"
        onCancel={() => { setConfirmMove(null); setPendingDrop(null) }}
        onConfirm={async () => {
          const move = confirmMove
          setConfirmMove(null)
          const lead = move ? rows.find((r) => r.id === move.leadId) : undefined
          if (!move || !lead) { setPendingDrop(null); return }
          /* (UX audit 2026-09-30, L1) a resume into an unreached Quote Sent or Won opens that step, never a silent jump */
          if (move.step) { setWizard({ leadId: lead.id, target: move.stage }); return }
          await quickMove(lead, move.stage)
        }}
      />
      {wizard ? (() => {
        const lead = effectiveRows.find((r) => r.id === wizard.leadId)   /* (leads on the move, A-06) with the member just assigned, before the refresh lands */
        if (!lead) return null
        return (
          <MoveStageWizard
            assignable={assignHintText ? [] : assignable}
            lead={lead}
            team={team}
            targetStage={wizard.target}
            mode={stageMovement}
            onClose={() => { setWizard(null); setPendingDrop(null) }}
            /* (Leads on the move, P-04 — "a refusal stays in the foot and nothing typed is lost") the window waits for the server; a refusal
               is answered back to it and said in its foot, the step as typed; only a landed save closes it (and settles a kanban drop) */
            onUpdate={async ({ stage, data }) => {
              try {
                if (stage === 'New') { await assignMembers(lead.id, data.assignees); setWizard(null); setPendingDrop(null); snackbar({ message: 'Members updated' }) }   // (REG-334) New's details are its members
                else {
                  const r = await updateStageDetails({ leadId: lead.id, stage, data })
                  if ('error' in r) return couldnt('update the details', refusalOf(r.error))   // (S43B · F1-07) the server's own check
                  setWizard(null); setPendingDrop(null); snackbar({ message: `${stage} details updated` })
                }
                return null
              } catch (e) { return couldnt('update the details', refusalOf(e)) }
            }}
            onSave={async ({ toStage, data, tasks }) => {
              try {
                const moved = await moveStage({ leadId: lead.id, fromStage: lead.stage, toStage, payload: data, tasks })
                if ('error' in moved) return couldnt('move the lead', refusalOf(moved.error))   // (fix-E, A-01)
                setWizard(null)
                const { projectId, projectNumber } = moved
                if (toStage === 'Won') {
                  // (REG-911) View opens the project Won made. (REG-1052) One sentence with New project's: the project's own number.
                  if (projectId) router.push(withFrom(`/projects/${projectId}?created=1`, here())); else snackbar({ message: projectNumber ? `Project ${projectNumber} created` : 'Project created' })   /* (simplify Q-16) Won opens the new project, which says "Project P-… created" (`?created=1`) · (fix-A, A-27) Back returns to the listing as it was */
                } else {
                  snackbar({ message: moved.planned ? `Moved to ${toStage} · a meeting is planned for ${displayDue(new Date(moved.planned.at))}` : `Moved to ${toStage}`, key: STAGE_MOVE_KEY })   // (pending modules S23) the in-person next step planned it
                }
                return null
              } catch (e) { return couldnt('move the lead', refusalOf(e)) }
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
            appeal={returning.appeal}   /* (pending modules S05) */
            lead={{ id: lead.id, name: lead.name, createdAt: lead.createdAt }}
            files={returning.files}
            now={nowTick}
            onClose={() => setReturning(null)}
            onConfirm={async (input: ReturnInput) => {
              // 931:49009 → 931:48553: the same snackbar + Undo as the overview; Undo lives as long as the snackbar (user 2026-08-30).
              const { returnId } = await returnLead(lead.id, input)
              snackbar({ message: input.appealOf ? 'Appeal sent to Qanvast' : 'Lead returned successfully', actionLabel: 'Undo', onAction: () => { void undoReturn(returnId).then(() => router.refresh()) } })   // (pending modules S05)
              router.refresh()
            }}
          />
        )
      })()}
      <OnHoldDialog
        open={!!onHold}
        onClose={() => { setOnHold(null); setPendingDrop(null) }}
        reason={holdReason} setReason={setHoldReason}
        openedAt={holdOpenedAt}
        followUpOn={holdFrom}   /* (Dane's UAT 9.08) from the Lost dialog's "Put On Hold instead" */
        options={holdOptions}
        onSave={(otherReason, followUpAt, duration) => {
          const lead = rows.find((r) => r.id === onHold)
          setOnHold(null)
          if (!lead) { setPendingDrop(null); return }
          const from = lead.stage
          void run('move the lead', async () => {
            const moved = await moveStage({
              leadId: lead.id, fromStage: from, toStage: 'On Hold',
              payload: { reason: otherReason ? `Others: ${otherReason}` : holdReason, duration, followUpAt },
              tasks: [],
            })
            if ('error' in moved) { setPendingDrop(null); snackbar({ message: couldnt('move the lead', refusalOf(moved.error)) }); return }   // (fix-E, A-01)
            const { logId } = moved
            /* (REG-607, parity Q-33) Undo lives as long as the snackbar, as a quick move's does. */
            snackbar({ message: 'Moved to On Hold', key: STAGE_MOVE_KEY, actionLabel: 'Undo', onAction: () => { void run('undo the move', () => undoMove(lead.id, logId, from)) } })
          })
        }}
        leadName={rows.find((r) => r.id === onHold)?.name}   /* (Leads on the move, P-04) */
      />
      <LostDialog
        open={!!lost}
        onClose={() => { setLost(null); setPendingDrop(null) }}
        reason={lostReason} setReason={setLostReason}
        options={lostOptions} reasons={leadReasons.lost} contactCount={rows.find((r) => r.id === lost)?.contactCount ?? 0} today={new Date(initialNow)}
        competitorHint={rows.find((r) => r.id === lost)?.lastComparison ?? null}   /* (REG-640) */
        /* (Dane's UAT 9.08) On Hold instead — a kanban card held over Lost moves to the On Hold column while that dialog decides */
        onHoldInstead={(restart) => {
          const id = lost
          setLost(null); setHoldReason(''); setHoldFrom(restart); setHoldOpenedAt(Date.now()); setOnHold(id)
          if (id && pendingDrop?.leadId === id) setPendingDrop({ leadId: id, stage: 'On Hold' })
        }}
        onSave={(d) => {
          const lead = rows.find((r) => r.id === lost)
          setLost(null)
          if (!lead) { setPendingDrop(null); return }
          const from = lead.stage
          void run('move the lead', async () => {
            const moved = await moveStage({ leadId: lead.id, fromStage: from, toStage: 'Lost', payload: { reason: d.otherReason ? `Others: ${d.otherReason}` : lostReason, ...(d.competitor ? { competitor: d.competitor } : {}), ...(d.restartAt ? { restartAt: d.restartAt } : {}) }, tasks: [] })
            if ('error' in moved) { setPendingDrop(null); snackbar({ message: couldnt('move the lead', refusalOf(moved.error)) }); return }   // (fix-E, A-01)
            const { logId } = moved
            snackbar({ message: 'Moved to Lost', key: STAGE_MOVE_KEY, actionLabel: 'Undo', onAction: () => { void run('undo the move', () => undoMove(lead.id, logId, from)) } })
          })
        }}
        leadName={rows.find((r) => r.id === lost)?.name}   /* (Leads on the move, P-04) */
      />
      <AssignPopover
        open={!!assign}
        team={team}
        value={assignValue}
        anchor={assign?.el}
        assignable={assignHintText ? [] : assignable} hint={assignHintText}
        suggestion={(() => { const r = assign && assign.id !== BULK ? rows.find((x) => x.id === assign.id) : null; return r && r.assignees.length === 0 ? suggestMember({ propertyType: r.propertyType, budgetMinor: r.budgetMinor, style: r.style, area: r.area }, team, memberStats) : null })()}   /* (REG-612) */
        onClose={() => { setAssign(null); setBulkIds(null); setAssignThen(null) }}
        onApply={applyAssign}
        subject={(() => { if (!assign) return undefined; if (assign.id === BULK) { const n = (bulkIds ?? [...liveSelected]).length; return `${n} lead${n === 1 ? '' : 's'}` } const r = rows.find((x) => x.id === assign.id); return r ? `${r.name} · ${phoneLocal(r.phone)}` : undefined })()}   /* (leads on the move, A-08) */
        requireOne={(rows.find((r) => r.id === assign?.id)?.stage ?? 'New') !== 'New'}
        position={assign}
      />
      <ColumnSettingsDrawer open={columnsOpen} onClose={() => setColumnsOpen(false)} pinning={{ max: 3 }}
                            columns={columns.map((c) => ({ ...c, locked: c.key === 'name' }))}
                            onSave={(next) => saveColumnPrefs(columnsKey, next)}   /* (leads on the move, P-06) a touch tablet keeps its own set */
                            onReset={() => { clearColumnWidths('leads'); resetColumnPrefs(columnsKey); return (touchTablet ? TABLET_COLUMNS : DEFAULT_COLUMNS).map((c) => ({ ...c, locked: c.key === 'name' })) }} />
      <TasksPopover
        lead={effectiveRows.find((r) => r.id === tasksFor?.id) ?? null}
        pos={tasksFor}
        anchor={tasksFor?.el}
        now={nowTick}
        onClose={() => setTasksFor(null)}
        onAddTask={async (lead, title, dueAt) => {
          try { await addTask(lead.id, title, dueAt ? dueAt.getTime() : null); return true }   /* (leads on the move, A-09) a finger's due preset */
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
        onOpenTask={(task) => { if (task.leadId) router.push(withFrom(`${detailHref(task.leadId, 'tasks')}?open=${task.id}`, here())) }}   // the task panel on Lead Details › Tasks, as the Overview's popover (REG-173) — (parity P-18) Back to this listing as it was
      />
      <LeadFormModal
        sources={liveSources}
        assignable={assignHintText ? [viewer.id] : assignable}
        selfAssign={assignHintText ? { id: viewer.id } : null}   /* (REG-609, parity C-07) a Designer's new lead is theirs */
        customFields={customFields}   /* (REG-612, parity Q-25) */
        team={team}
        now={nowTick}
        form={leadForm}
        onClose={() => setLeadForm(null)}
        onSubmit={async (mode, data, leadId, extras) => {
          try {
            if (mode === 'create') {
              /* (gaps build E, item 1) a picked file goes up with its bytes once the lead exists — only a name with no file behind it (the scripted
                 Fill from a document) is written with the lead */
              const picked = extras?.picked ?? []
              const id = await createLead({ ...data, files: (extras?.files ?? []).filter((n) => !picked.some((f) => f.name === n)), customValues: extras?.customValues })   /* (REG-609 · REG-612) the attached documents, the custom fields */
              snackbar({ message: 'Successfully Created' })
              for (const f of picked) {
                const up = await uploadPicked(id, f).catch(() => null)
                if (!up || 'error' in up) snackbar({ message: couldnt(`upload ${f.name}`, up && 'error' in up ? up.error : null) })
              }
              /* (Leads on the move, L3 — P-08) ≤1024 the new lead opens on its own page, ready to call; Back returns to the listing as it was */
              if (openAfterCreate) router.push(withFrom(`/leads/${id}`, here()))
            } else if (leadId) {
              await updateLead(leadId, { ...data, customValues: extras?.customValues })
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
        liveLinks={liveLinks}
        onClose={() => setDeleting(null)}
        reason={deleteReason}
        setReason={setDeleteReason}
        onOpenProject={(pid) => { setDeleting(null); router.push(withFrom(`/projects/${pid}`, here())) }}   /* (fix-E, E-10) */
        onDelete={async (picked) => {
          if (deletingRef.current) return
          const ids = picked   // (fix-E, A-09) the dialog named the leads with a project and left them out
          setDeleting(null)
          if (ids.length === 0) return
          deletingRef.current = true
          try {
            const refused = await deleteLeads(ids, deleteReason)
            /* (Projects round 7, Q-27) a lead with a project refuses: the snackbar says so and opens the project when there is one lead */
            if (refused) {
              const pid = refused.projectId
              snackbar({ message: couldnt('delete', refusalOf(refused.error)), ...(pid ? { actionLabel: 'Open project', onAction: () => router.push(withFrom(`/projects/${pid}`, here())) } : {}) })
              return
            }
            setSelected((prev) => { const n = new Set(prev); for (const id of ids) n.delete(id); return n })   /* (REG-610) */
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
      <FiltersModal open={filtersOpen} value={filters} team={team} now={nowTick} sources={sources} onClose={() => setFiltersOpen(false)} onApply={setFilters}
                    resultCount={filtered.length} />   {/* (leads on the move, A-11) the phone sheet's Done says what the live filters leave */}
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
        sources={importSources} batchSources={liveSources}   /* (UX audit L4) what a Lead Source cell is read against · step 2's one source */
        onAssign={canAssignImports ? openImportAssign : undefined}   /* (UX audit L5) "Assign these n" */
        onReview={openReviewFromImport}   /* (UX audit L5) "Review n duplicates" */
        onImport={async (payload) => {
          try { return await importLeads(payload) }
          catch { snackbar({ message: 'Couldn’t import the file — please try again' }); return null }
        }}
        onDone={(r) => {
          setImportOpen(false)
          /* (UX audit L5) The snackbar carries the next step: Assign for leads that arrived, Review for what waits in the queue. */
          const dups = r.duplicates + r.flagged
          const review = { actionLabel: 'Review', onAction: openReviewFromImport }
          snackbar(r.destination === 'listing'
            ? (r.approved === 0 && dups > 0
                ? { message: `${dups} possible duplicate${dups === 1 ? '' : 's'} sent to review`, ...review }
                : { message: `${r.approved} lead${r.approved === 1 ? '' : 's'} added to your listing`, ...(canAssignImports && r.leadIds.length > 0 ? { actionLabel: 'Assign', onAction: () => openImportAssign(r.leadIds) } : dups > 0 ? review : {}) })
            : { message: `${r.imported} lead${r.imported === 1 ? '' : 's'} ready for review`, ...(r.imported > 0 ? review : {}) })
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
          try { purged(await deleteForever(ids), ids.length === 1 ? 'Lead deleted forever' : `${ids.length} leads deleted forever`) }   // (Projects round 7, Q-27 · fix-E, E-09) what stayed, and why
          catch { snackbar({ message: 'Couldn’t delete — please try again' }) }
        }}
        onEmptyTrash={async () => {
          try { purged(await emptyTrash(), 'Trash emptied') }
          catch { snackbar({ message: 'Couldn’t empty the trash — please try again' }) }
        }}
      />
    </PageReveal>
  )
}

export function LeadsWorkspace(props: { rows: LeadRow[]; team: Member[]; now: number; deleted: DeletedLead[]; review: ReviewRow[]; urlView: ListingView | null; stageMovement: StageMovement; sources: string[]; liveSources: string[]; importSources: string[]; viewer: Viewer; leadReasons: LeadReasons; customFields: CustomFieldDef[]; memberStats: MemberStats }) {
  return <Workspace {...props} />
}
