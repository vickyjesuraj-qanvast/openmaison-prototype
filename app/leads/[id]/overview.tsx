'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from 'react'
import { fromLabel, withFrom } from '@/lib/nav'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { MetaChip } from '@/components/om/meta-chip'
import { Tabs } from '@/components/om/tabs'
import { Tooltip } from '@/components/om/tooltip'
import { ConfirmDialog } from '@/components/om/confirm-dialog'
import { useComingSoon, useSnackbar } from '@/components/om/snackbar'
import { PageHeaderL2 } from '@/components/shell/page-header-l2'
import { useShortcut } from '@/lib/keys/store'
import { PageReveal } from '@/components/shell/page-reveal'
import { DetailSkeleton } from '@/components/shell/detail-skeleton'
import { useMaisonAi } from '@/lib/maison-ai'
import { AssignPopover } from '@/components/leads/assign-popover'
import { DeleteLeadDialog } from '@/components/leads/delete-dialog'
import { Dropdown, DropdownItem } from '@/components/leads/dropdown'
import { useSheetLayout } from '@/components/om/sheet'
import { LeadFormModal, type LeadFormOpen } from '@/components/leads/lead-form'
import { LostDialog, OnHoldDialog } from '@/components/leads/move-stage/dialogs'
import { AskClientDialog } from '@/components/leads/questionnaire/ask-client-dialog'
import { MoveStageWizard, type MovePick } from '@/components/leads/move-stage/wizard'
import { GHOST_MIN_MS } from '@/components/shell/page-reveal'
import { readMoveParams, type MoveStep } from '@/lib/leads/move-link'
import { StageDropdown } from '@/components/leads/stage-dropdown'
import { CREATE_EVENTS } from '@/components/leads/tasks/use-create-intent'
import { TasksPopover, type TasksPos } from '@/components/leads/tasks-popover'
import { AiBrief } from '@/components/leads/detail/ai-brief'
import { assignHint, assignableIds } from '@/lib/leads/assign-policy'
import { ActivityCard } from '@/components/leads/detail/activity-card'
import { FilesCard } from '@/components/leads/detail/files-card'
import { InfoColumn } from '@/components/leads/detail/info-column'
import { LeadStagesCard } from '@/components/leads/detail/stages-card'
import { FollowUpDialog } from '@/components/leads/detail/follow-up-dialog'
import { MyWorkCard } from '@/components/leads/detail/my-work-card'
import { QuestionnaireCard } from '@/components/leads/detail/questionnaire-card'
import { QuickLinks } from '@/components/leads/detail/quick-links'
import { QuoteCard } from '@/components/leads/detail/quote-card'
import { LeadReturnedCard } from '@/components/leads/detail/returned-card'
import { InvitePortalModal } from '@/components/leads/return/invite-portal-modal'
import { askClient, invitePortal } from '@/app/leads/portal-actions'
import { responseLine } from '@/lib/leads/tat'
import { suggestMember } from '@/lib/leads/suggest'
import { ReturnDetailsModal } from '@/components/leads/return/return-details-modal'
import { ReturnLeadWizard } from '@/components/leads/return/return-lead-wizard'
import { assignMembers, addTask, completeTask, countLiveSigningLinks, deleteLead, moveStage, quickMoveStage, resolveMoveHandoff, setFollowUp, setTaskDue, undoStageMove, updateLead, updateStageDetails } from '@/app/leads/actions'
import { createQuote } from '@/app/leads/quotes-actions'
import { askClientQuestions } from '@/app/leads/questions-actions'
import { returnLead, undoReturn, type ReturnInput } from '@/app/leads/return-actions'
import type { LeadFile } from '@/lib/db/schema'
import type { LeadDetail } from '@/lib/leads/detail'
import { returnTags } from '@/lib/leads/return-tags'
import { type Stage } from '@/lib/leads/enums'
import { briefsFor } from '@/lib/leads/briefs'
import { displayDateTimeDot, isOverdue, moneyCompact, phoneDigits, phoneDisplay, phoneLocal } from '@/lib/format'
import { DETAIL_TABS, blockedReason, canReturnLead, convertBlock, detailHref, isActiveStage, journeyIdx, nextStageOf, resumeStageOf, stageIntent, type DetailTabSlug } from '@/lib/leads/stage-policy'
import { runsStudio } from '@/lib/leads/assign-policy'
import { liveReasonNames } from '@/lib/settings/types'
import { openLeadDesign } from '@/app/visualizer/actions'
import styles from './overview.module.css'

type Anchored = { el: HTMLElement; top: number; left: number } | null
/* Anchored popovers are fixed-position; these derive their spot from the anchor so they can follow it while the page
   scrolls. Both axes clamp with a 16px floor (REG-269, the fix workspace.tsx already carries — this page keeps its own
   copies): the old one-sided `innerWidth - 420` / `innerHeight - N` went NEGATIVE on a narrow or short viewport and put
   the card off the top-left of the screen with nothing to scroll it back. */
const POP_EDGE = 16
const clampAxis = (preferred: number, size: number, viewport: number) =>
  Math.max(POP_EDGE, Math.min(preferred, Math.max(POP_EDGE, viewport - size - POP_EDGE)))
const stagePos = (el: HTMLElement) => { const r = el.getBoundingClientRect(); return { top: clampAxis(r.bottom + 4, 356, window.innerHeight), left: clampAxis(r.left, 240, window.innerWidth) } }
const anchorRect = (el: HTMLElement) => { const r = el.getBoundingClientRect(); return { el, top: clampAxis(r.bottom + 4, 456, window.innerHeight), left: clampAxis(r.left, 400, window.innerWidth) } }
const tasksPos = (el: HTMLElement) => { const r = el.getBoundingClientRect(); return { top: clampAxis(r.bottom + 4, 532, window.innerHeight), left: clampAxis(r.left, 400, window.innerWidth) } }
const offscreen = (el: HTMLElement) => { const r = el.getBoundingClientRect(); return r.bottom < 0 || r.top > window.innerHeight }
/** (UX audit 2026-09-30) The hand-off link's step (lib/leads/move-link.ts) as the stage it opens. */
const STEP_STAGE: Record<MoveStep, Stage> = { contacted: 'Contacted', met: 'Met', 'quote-sent': 'Quote Sent', won: 'Won' }

/**
 * Lead Details › Overview (858-24770): the lead's home. Every rule the listing already settled applies here unchanged —
 * stage movement policy (REG-111…132) behind the header pill, tasks/assign flows, the Lead form as the editor,
 * Qanvast-only returns (REG-139), tooltips + coming-soon on every inert affordance. Spec dumps: design-source/context/lead-overview/.
 */
/**
 * `body` renders a tab's own content inside the lead frame (Tasks tab); `wide` drops the info column (the Tasks mock 902-26362
 * has none). Without either, the frame shows the coming-soon body for tabs that have no mocks yet.
 * `origin` (931:49680's `?from=qanvast`, any in-app path since REG-465): the L2 crumb reads "{section} / Leads" and Back goes there.
 */
export function LeadOverview({ detail, tab, body, wide = false, origin }: { detail: LeadDetail; tab: DetailTabSlug; body?: ReactNode; wide?: boolean; origin?: string }) {
  const { lead, team, now, stageMovement, quoteApproval, timeline, parked, daysInPipeline, activity, quote, files, questionnaire, ret, leadReasons, portal, returnsCount, responseTime, customFields, customValues, memberStats } = detail
  /* (REG-607) The studio's reasons for the two dialogs, "Others" last; only Owners and Admins delete (parity Q-41). */
  const holdOptions = liveReasonNames(leadReasons.hold)
  const lostOptions = liveReasonNames(leadReasons.lost)
  const canDelete = runsStudio(detail.viewer.role)
  const [liveLinks, setLiveLinks] = useState(0)   // (REG-607, parity Q-04) contracts whose signing link is live, counted when Delete opens
  const router = useRouter()
  const snackbar = useSnackbar()
  const comingSoon = useComingSoon()
  const refresh = () => router.refresh()
  /** Server actions awaited after their dialog has closed: a failure lands in the snackbar instead of vanishing (audit 2026-08-30). */
  const run = async (work: () => Promise<void>, failure: string) => { try { await work() } catch { snackbar({ message: failure }) } }

  /* ── stage movement (shared policy helpers) ── */
  const [stageMenu, setStageMenu] = useState<{ top: number; left: number; el: HTMLElement } | null>(null)
  const [wizard, setWizard] = useState<Stage | null>(null)
  /* (UX audit 2026-09-30, Q1 · C1 · L2) The documents a hand-off link brought, picked in the window it opens. */
  const [movePick, setMovePick] = useState<MovePick | null>(null)
  const closeWizard = () => { setWizard(null); setMovePick(null) }
  const [onHold, setOnHold] = useState(false)
  const [lost, setLost] = useState(false)
  /* `step` (UX audit 2026-09-30, L1): the resume opens that stage's step in the Move stage window instead of moving at once. */
  const [confirmMove, setConfirmMove] = useState<{ stage: Stage; step: boolean } | null>(null)
  const [holdOpenedAt, setHoldOpenedAt] = useState(0)
  const [holdReason, setHoldReason] = useState('')   // set from the studio's list when the dialog opens (REG-607)
  const [lostReason, setLostReason] = useState('')

  /* A flexible-mode quick move used to be awaited RAW here: `void quickMove(stage)` with nothing around it, so a
     server action that threw became an unhandled rejection — no snackbar, no change, nothing on screen. The listing's
     twin has always reported it. Both the move and its Undo now go through `run` (REG-286, audit "the stage-movement
     dispatch is written twice"), with the listing's own copy. */
  const quickMove = (stage: Stage) => run(async () => {
    const { logId } = await quickMoveStage({ leadId: lead.id, fromStage: lead.stage, toStage: stage })
    snackbar({
      message: `Moved to ${stage}`,
      actionLabel: 'Undo',
      onAction: () => { void run(async () => { await undoStageMove({ leadId: lead.id, logId, toStage: lead.stage }); refresh() }, 'Couldn’t undo the move — please try again') },
    })
    refresh()
  }, 'Couldn’t move the lead — please try again')
  /* ── popovers, dialogs ── */
  const [kebabOpen, setKebabOpen] = useState(false)
  /* (audit 2026-09-26, D7) ≤767 the Create quick links are gone (quick-links.module.css), so the kebab's sheet carries the lead's way
     into its AI Visualizer design — as Quote X-Ray reached the phone through the quote rows' menu (REG-639, E-81). */
  const phoneSheet = useSheetLayout()
  const [assign, setAssign] = useState<Anchored>(null)
  const [tasksFor, setTasksFor] = useState<({ el: HTMLElement } & TasksPos) | null>(null)
  const [leadForm, setLeadForm] = useState<LeadFormOpen | null>(null)
  const [deleting, setDeleting] = useState(false)
  /* (REG-608, parity Q-03) The next follow-up = the earliest dated open task; "Set a follow-up" raises one. */
  const [followUpOpen, setFollowUpOpen] = useState(false)
  const nextTask = lead.tasks.filter((t) => t.dueAt).sort((a, b) => a.dueAt!.getTime() - b.dueAt!.getTime())[0] ?? null
  const nextFollowUp = nextTask ? { id: nextTask.id, title: nextTask.title, dueAt: nextTask.dueAt!, overdue: isOverdue(nextTask.dueAt, now) } : null
  const [deleteReason, setDeleteReason] = useState('Spam')
  const [askOpen, setAskOpen] = useState(false)   // QUESTIONNAIRE card › Ask Client → the Ask the client dialog (931:46853)
  /* Qanvast lead return (931:48236, spec design-source/context/lead-return/): kebab › Return Lead → wizard; LEAD RETURNED › View Details → details; kebab › Invite to Portal (931:48844). */
  const [returnOpen, setReturnOpen] = useState(false)
  const [returnDetailsOpen, setReturnDetailsOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  // Return Lead is offered to Qanvast leads only (REG-139) and not while a return is in processing or already approved; a rejected one may be returned again.
  const canReturn = canReturnLead({ source: lead.source, returnStatus: ret?.status })
  const copyLink = async () => {
    try { await navigator.clipboard.writeText(window.location.href); snackbar({ message: 'Link copied' }) }
    catch { snackbar({ message: 'Couldn’t copy — please try again' }) }
  }
  const myWorkRef = useRef<HTMLDivElement>(null)
  const stagePillRef = useRef<HTMLSpanElement>(null)

  const openTasks = (anchor: HTMLElement) => {
    if (tasksFor && tasksFor.el === anchor) { setTasksFor(null); return }   // the open popover's own trigger closes it (REG-153)
    setAssign(null); setStageMenu(null)
    setTasksFor({ el: anchor, seq: Date.now(), ...tasksPos(anchor) })
  }
  const openAssign = (anchor: HTMLElement) => {
    setAssign((a) => (a?.el === anchor ? null : anchorRect(anchor)))
    setTasksFor(null); setStageMenu(null)
  }
  /* (REG-713) E edits the lead and A opens Assign — also while the info column is folded to its strip: Assign then hangs under the
     stage button, the header's nearest control, instead of the column's Collaborators link. */
  const editLead = useCallback(() => setLeadForm({ mode: 'edit', lead }), [lead])
  useShortcut('edit', editLead, true, 'Edit the lead')
  const assignByKey = useCallback(() => {
    const link = Array.from(document.querySelectorAll<HTMLElement>('[data-kb="assign"]')).find((el) => el.getClientRects().length > 0)
    const anchor = link ?? stagePillRef.current
    if (anchor) { setAssign(anchorRect(anchor)); setTasksFor(null); setStageMenu(null) }
  }, [])
  useShortcut('assign', assignByKey, true, 'Assign')

  /* The stage moves come after the popovers: `refuse` offers Assign (assignByKey) as the way on (UX audit 2026-09-30). */
  /** (UX audit 2026-09-30, Q1 · L6) A refused move names the way on as the snackbar's action: assign someone, resume the parked lead,
      or move to the next stage — the window, where the lock only said "Complete Quote Sent first". `stage` null = Assign. */
  const wayOn = (): { label: string; stage: Stage | null } | null => {
    if (lead.assignees.length === 0 && isActiveStage(lead.stage)) return { label: 'Assign', stage: null }
    if (!isActiveStage(lead.stage)) { const at = resumeStageOf(lead); return { label: `Resume at ${at}`, stage: at } }
    const next = nextStageOf(lead)
    return next ? { label: `Move to ${next}`, stage: next } : null
  }
  /** The refusal snackbar. Its action reaches the stage request through a ref (set after each commit): the request refuses, and the
      refusal requests — a loop the React Compiler reads as a render-time call when the two name each other. */
  const stageRequest = useRef<((stage: Stage) => void) | null>(null)
  const refusal = (message: string) => {
    const w = wayOn()
    return w ? { message, actionLabel: w.label, onAction: () => { if (w.stage) stageRequest.current?.(w.stage); else assignByKey() } } : { message }
  }
  /** Every stage change on this page — pill, stages card, quick links — comes through here.
      The branch set is `stageIntent` in lib/leads/stage-policy, the one copy the listing runs too (REG-286);
      this half only maps the intent onto this page's dialogs and snackbar. */
  const requestStageChange = (stage: Stage): void => {
    const intent = stageIntent(lead, stage, stageMovement)
    switch (intent.kind) {
      case 'none': return
      /* (UX audit 2026-09-30, L10 — supersedes REG-607's pre-pick) Both dialogs open with no reason chosen: the required field asks for
         one, where a hurried Save used to file every lost lead under the list's first reason. */
      case 'hold': setHoldReason(''); setHoldOpenedAt(Date.now()); setOnHold(true); return
      case 'lost': setLostReason(''); setLost(true); return
      case 'blocked': snackbar(refusal(intent.message)); return
      case 'confirm-resume': setConfirmMove({ stage: intent.stage, step: intent.step }); return
      case 'wizard': setWizard(intent.stage); return
      case 'quick': void quickMove(intent.stage); return
    }
  }
  const refuse = (message: string) => snackbar(refusal(message))
  useEffect(() => { stageRequest.current = requestStageChange })
  /** A LEAD STAGES row, and the card's head arrow at the lead's current position (REG-259): the Move stage
      window for a reached stage, the resume flow for a parked lead, the guarded request for a future one. */
  /** (REG-469 · UX audit 2026-09-30, L1 · L6) Why Convert to Project cannot open the Won step right now — null when it may. A parked lead
      resumes first (Convert stays locked while it is On Hold or Lost); in Linear the reason names the whole path left. */
  const wonBlock = convertBlock(lead, stageMovement)
  /* (UX audit 2026-09-30, L6 — Vicky's call on mock 858-24770 · REG-165 · REG-469) One filled primary, and it is the step that is
     possible now: "Move to Met" (the window at the next stage) until Won is reachable, "Resume at X" while the lead is parked, then
     Convert to Project. While it is locked, Convert stays beside it outlined with its lock, and its press says the path and offers the move. */
  const nextStage = nextStageOf(lead)
  const primaryKind: 'won' | 'convert' | 'resume' | 'next' | 'locked' = lead.stage === 'Won' ? 'won' : !wonBlock ? 'convert'
    : !isActiveStage(lead.stage) ? 'resume' : nextStage ? 'next' : 'locked'
  const primaryLabel = primaryKind === 'resume' ? `Resume at ${resumeStageOf(lead)}` : primaryKind === 'next' ? `Move to ${nextStage}` : 'Convert to Project'
  const convertPrimary = primaryKind === 'won' || primaryKind === 'convert'
  const pressPrimary = () => {
    if (primaryKind === 'won') comingSoon()
    else if (primaryKind === 'convert') requestStageChange('Won')
    else if (primaryKind === 'resume') requestStageChange(resumeStageOf(lead))
    else if (primaryKind === 'next' && nextStage) requestStageChange(nextStage)
    else if (wonBlock) refuse(wonBlock)
  }
  const openStageStep = (stage: string) => {
    if (stage === 'On Hold' || stage === 'Lost') { setWizard(lead.resumeStage ?? 'New'); return }
    const step = timeline.find((s) => s.stage === stage)
    if (step && step.state !== 'future') { setWizard(stage as Stage); return }
    requestStageChange(stage as Stage)
  }

  /* ── (UX audit 2026-09-30, Q1 · C1 · L2) The hand-off: `?move=<step>&quote=|contract=|log=` (lib/leads/move-link.ts) — a sent or
     confirmed quote, a signed contract, a saved contact log offering the lead's next stage — opens the Move stage window at that step
     with the document already picked, once, then the parameters leave the address. The stage policy still decides: a step the lead
     can't reach answers as the pill would, with the way on; a parked lead confirms its resume first. The window opens as the page
     reveals (GHOST_MIN_MS), never under the ghost. ── */
  const openHandoff = async (h: NonNullable<ReturnType<typeof readMoveParams>>) => {
    const stage = STEP_STAGE[h.step]
    const [resolved] = await Promise.all([
      h.quote || h.contract || h.log ? resolveMoveHandoff(lead.id, { quote: h.quote, contract: h.contract, log: h.log }).catch(() => null) : Promise.resolve(null),
      new Promise((r) => setTimeout(r, GHOST_MIN_MS)),
    ])
    const pick: MovePick | null = resolved ? { quoteId: resolved.quoteId, contractId: resolved.contractId, log: resolved.log } : null
    const intent = stageIntent(lead, stage, stageMovement)
    if (intent.kind === 'blocked') { refuse(intent.message); return }
    if (intent.kind === 'hold' || intent.kind === 'lost') return
    setMovePick(pick)
    if (intent.kind === 'confirm-resume') { setConfirmMove({ stage: intent.stage, step: true }); return }
    setWizard(stage)   // the next step, Won, a Flexible move, or the stage the lead is in (its details) — the window, the document picked
  }
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const handoff = readMoveParams(searchParams)
  const handoffKey = handoff ? [handoff.step, handoff.quote, handoff.contract, handoff.log].join('|') : ''
  const handoffRun = useRef<typeof openHandoff | null>(null)   // set after each commit, read in the effect below — never during render
  useEffect(() => { handoffRun.current = openHandoff })
  const handoffDone = useRef('')
  useEffect(() => {
    if (!handoffKey) { handoffDone.current = ''; return }
    if (handoffDone.current === handoffKey) return
    handoffDone.current = handoffKey
    const here = new URLSearchParams(window.location.search)
    const h = readMoveParams(here)
    for (const k of ['move', 'quote', 'contract', 'log']) here.delete(k)
    const rest = here.toString()
    router.replace(rest ? `${pathname}?${rest}` : pathname, { scroll: false })
    if (h) void handoffRun.current?.(h)
  }, [handoffKey, pathname, router])
  // Popovers follow their anchor while the page scrolls and close once it leaves the viewport (REG-129).
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

  /** Tab / quick-link hrefs keep the origin (931:49680, REG-465): `?from=` rides along so the crumb and Back hold across the tabs. */
  const href = (slug: DetailTabSlug, query?: string) => {
    const parts = [query, origin ? `from=${encodeURIComponent(origin)}` : undefined].filter(Boolean)
    return parts.length ? `${detailHref(lead.id, slug)}?${parts.join('&')}` : detailHref(lead.id, slug)
  }
  /* (REG-673, Q-02) AI Visualizer: the lead's design — made on first open — and Back returns to the very page the link was pressed on:
     (F110) the URL as it stands, so a Files folder (`?folder=`) or any other state of the tab comes back with it. Read at the press. */
  /* (wave E, tablet-11) The action that makes / finds the design runs ~1 s before the editor's ghost can show: it runs in a transition that
     also holds the navigation, so the quick link spins (aria-busy) from the press until the editor takes over, and a second press waits. */
  const [openingDesign, startOpeningDesign] = useTransition()
  const openVisualizer = () => {
    if (openingDesign) return
    const here = `${window.location.pathname}${window.location.search}`
    startOpeningDesign(async () => {
      const r = await openLeadDesign(lead.id).catch(() => ({ error: 'Couldn’t open the design — please try again' }))
      if ('error' in r) { snackbar({ message: r.error }); return }
      startOpeningDesign(() => router.push(withFrom(`/visualizer/${r.id}`, here)))
    })
  }

  const goTab = (slug: DetailTabSlug) => router.push(href(slug))
  /* The tab window events come from CREATE_EVENTS, the map the listening tabs already read (REG-286) — these three
     dispatchers used to hard-code the same strings, so a rename on one side broke the quick link in silence. */
  /** New quote (QUOTES card › From Scratch, Create quick links › Quote): the Quotes tab handles it in place, elsewhere it opens with `?new=1`. */
  /* (UX audit Q12, the Overview's QUOTES card) From Scratch makes the blank quote at once, as the Quotes tab's empty card does; From Template
     keeps the Create Quote modal. */
  const onBlankQuote = () => { void run(async () => { const id = await createQuote(lead.id, null); router.push(withFrom(`/quotes/${id}`, `${window.location.pathname}${window.location.search}`)) }, 'Couldn’t create the quote — please try again') }
  const onNewQuote = () => { if (tab === 'quotes') window.dispatchEvent(new CustomEvent(CREATE_EVENTS.quotes)); else router.push(href('quotes', 'new=1')) }
  /** New note (Create quick links › Note, 931-44865): the Notes tab starts the draft in place, elsewhere it opens with `?new=note`. */
  const onNewNote = () => { if (tab === 'notes') window.dispatchEvent(new CustomEvent(CREATE_EVENTS.notes, { detail: { kind: 'note' } })); else router.push(href('notes', 'new=note')) }
  /** (REG-337, user 2026-09-04) Create quick links › Contact Log: a contact-log draft on the Notes tab, the way Task and Note
   *  hand off — it used to open the Move stage window at Contacted, which is a stage move, not a record.
   *  (REG-551 → REG-552, owner 2026-09-23) The Meeting quick link is gone with the Meetings tab until their mocks land. */
  const onNewContactLog = () => { if (tab === 'notes') window.dispatchEvent(new CustomEvent(CREATE_EVENTS.notes, { detail: { kind: 'contact' } })); else router.push(href('notes', 'new=contact')) }
  const tabItems = DETAIL_TABS.map((t) => ({ label: t.label, href: href(t.slug) }))
  const activeTab = DETAIL_TABS.find((t) => t.slug === tab) ?? DETAIL_TABS[0]
  const returnedBy = ret ? team.find((m) => m.id === ret.returnedById) ?? null : null
  /* The briefs read the questionnaire off the lead, so hand them the counts the QUESTIONNAIRE card already prints —
     otherwise a lead with answers still reads "no questionnaire yet" beside a card saying 7 / 11 answered. */
  const briefLead = useMemo(
    /* (UX audit 2026-09-30, L2) `contacted`: a logged contact — the New brief stops saying "No contact yet" beside Last contact. */
    () => ({ ...lead, contacted: !!lead.lastContact, questionnaire: questionnaire ? { answered: questionnaire.clientAnswered + questionnaire.studioAnswered, total: questionnaire.total } : null }),
    [lead, questionnaire],
  )
  const aiSuggestions = useMemo(() => Array.from(new Set(briefsFor(lead.stage, briefLead).flatMap((b) => b.actions))).slice(0, 3), [lead.stage, briefLead])
  useMaisonAi(aiSuggestions)   /* (REG-507) the shell's FAB + sheet */

  return (
    <PageReveal skeleton={<DetailSkeleton wide={wide} tab={tab} />}>   {/* (REG-708) the tab's own body — the ghost its [tab]/loading.tsx drew */}
      <div className={styles.body}>
        <PageHeaderL2
          scrollShadow={false}   /* the sticky tab strip below carries the block's level-1 (REG-331 · REG-369) */
        backHref={origin ?? '/leads'}
          crumbs={[...(fromLabel(origin) && origin ? [{ label: fromLabel(origin)!, href: origin }] : []), { label: 'Leads', href: '/leads' }]}   /* (REG-536) clickable */
          title={lead.name}
          chips={
            <>
              <MetaChip icon="call">{phoneLocal(lead.phone)}</MetaChip>
              {/* (UX audit 2026-09-30, L8) An unknown budget is stored as 0; it reads "--" like every other blank, never "S$ 0". */}
              <MetaChip icon="money_bag">{lead.budgetMinor > 0 ? moneyCompact(lead.budgetMinor) : '--'}</MetaChip>
              <MetaChip icon="home">{lead.propertyType}</MetaChip>
              {/* Green marks a Qanvast lead — the source that behaves differently (Return Lead, Qanvast Ops).
                  Every other source is a plain chip, so the colour means something (user 2026-08-30).
                  The leading glyph is a deviation: the mock draws this one chip WITHOUT an icon while its three
                  neighbours have one (01-header spec, "Tag Outlined Green (no icon)"). One glyph for every source —
                  Material Symbols ships no brand marks, so per-source icons would be honest for Referral and
                  Walk-in and invented for Instagram, Facebook and the rest (user 2026-08-31). `database` was the
                  owner's pick; it is not in the mocks' icon set, so the font subset was regenerated for it. */}
              <MetaChip color={lead.source === 'Qanvast' ? 'green' : 'default'} icon="database">{lead.source}</MetaChip>
              {/* return + refund state chips (931:48553 · 931:49138): Return Processing yellow · Return Rejected red · Return Approved green + Refund Processing / Credited */}
              {returnTags(ret).map((t) => <MetaChip key={t.label} color={t.color}>{t.label}</MetaChip>)}
            </>
          }
          actions={
            <>
              <span className={`${styles.anchor} ${styles.stageAction}`} ref={stagePillRef} data-kb="move-stage">
                <Tooltip label="Move stage" shortcut="move-stage" disabled={!!stageMenu}>
                {/* (REG-728) the chevron turns while the stage menu is open, as every other menu trigger's does */}
                <Button variant="secondary" appearance="outlined" iconEnd={<span className={styles.chev} data-open={!!stageMenu || undefined}><Icon name="keyboard_arrow_down" size={20} /></span>} aria-haspopup="menu" aria-expanded={!!stageMenu}
                        onPress={() => { const el = stagePillRef.current; if (!el) return; setStageMenu((s) => (s ? null : { el, ...stagePos(el) })) }}>
                  Stage: {lead.stage}
                </Button>
                </Tooltip>
              </span>
              {/* (REG-469, user feedback 2026-09-16: "shouldn't we allow someone to do that and automatically change the stage to Won?")
                  Convert to Project IS winning the lead: where the policy lets this lead reach Won, the button opens the Move stage
                  window at the Won step (the same path as picking Won on the pill); where it does not, the lock stays and the press
                  says why (blockedReason — "Complete Quote Sent first", "Assign a member first"). A Won lead's button converts (REG-204). */}
              {/* (UX audit 2026-09-30, L6 · Q1) While Won is out of reach Convert stays, outlined with its lock (≥1025; up to 1024 the row
                  keeps the pill and the primary), and its press names the whole path left with the way on as the snackbar's action. */}
              {!convertPrimary && wonBlock ? (
                <Tooltip label={wonBlock}>
                  <span className={`${styles.anchor} ${styles.convertLocked}`} data-testid="convert-locked">
                    <Button variant="secondary" appearance="outlined" iconStart={<Icon name="lock" size={20} />} onPress={() => refuse(wonBlock)}>
                      Convert to Project
                    </Button>
                  </span>
                </Tooltip>
              ) : null}
              <Tooltip label={lead.stage === 'Won' ? 'Convert to Project' : convertPrimary ? 'Opens the Won step — it creates the project' : ''} disabled={!convertPrimary}>
                <span className={`${styles.anchor} ${styles.convertAction}`} data-testid="header-primary">
                  <Button variant="primary" onPress={pressPrimary}>{primaryLabel}</Button>
                </span>
              </Tooltip>
            </>
          }
          titleActions={
            <span className={styles.anchor}>
              <Tooltip label="More options" disabled={kebabOpen}>
                <IconButton icon="more_vert" label="More options" aria-haspopup="menu" aria-expanded={kebabOpen} onClick={() => setKebabOpen((o) => !o)} />
              </Tooltip>
              {/* Kebab menu per 931:49039 (Qanvast: Invite to Portal · Return Lead · Copy Link · Delete) / 931:49047 (others, no Return Lead).
                  The mock menus carry no Edit; the built overview keeps it first (its only editor entry besides the info column). */}
              <Dropdown open={kebabOpen} onClose={() => setKebabOpen(false)} align="right" sheetTitle={lead.name}>
                <DropdownItem onSelect={() => { setKebabOpen(false); setLeadForm({ mode: 'edit', lead }) }} shortcut="edit">Edit</DropdownItem>
                {phoneSheet ? <DropdownItem onSelect={() => { setKebabOpen(false); openVisualizer() }}>AI Visualizer</DropdownItem> : null}
                <DropdownItem onSelect={() => { setKebabOpen(false); setInviteOpen(true) }}>Invite to Portal</DropdownItem>
                {canReturn ? (
                  <DropdownItem onSelect={() => { setKebabOpen(false); setReturnOpen(true) }}>Return Lead</DropdownItem>
                ) : null}
                <DropdownItem onSelect={() => { setKebabOpen(false); void copyLink() }}>Copy Link</DropdownItem>
                {canDelete ? (
                  /* (REG-728) the house danger row, where a red span in a plain row stood */
                  <DropdownItem tone="danger" onSelect={() => { setKebabOpen(false); setDeleteReason('Spam'); setLiveLinks(0); setDeleting(true); void countLiveSigningLinks([lead.id]).then(setLiveLinks).catch(() => setLiveLinks(0)) }}>
                    Delete
                  </DropdownItem>
                ) : null}
              </Dropdown>
            </span>
          }
        />
        <Tabs items={tabItems} activeHref={href(tab)} aria-label="Lead sections" className={styles.stickyTabs} />

        <div className={styles.row}>
          {/* "Add" beside a row opens the form ON that row, not at the top of fifteen fields (user 2026-08-31). */}
          {wide ? null : (
          <InfoColumn
            portal={portal}   /* (REG-609) */
            customFields={customFields} customValues={customValues}   /* (REG-612) */
            lead={lead}
            team={team}
            onEdit={() => setLeadForm({ mode: 'edit', lead })}
            onAssign={openAssign}
            onAssigneeMenu={(anchor) => openAssign(anchor)}
            onCopy={async (what, value) => {
              // (REG-287) One copy format for the whole app — `phoneDisplay`, not a second "+65 ${value}" template here.
              try { await navigator.clipboard.writeText(what === 'phone' ? phoneDisplay(value) : value); snackbar({ message: 'Copied to clipboard' }) }
              catch { snackbar({ message: 'Couldn’t copy — please try again' }) }
            }}
            // (REG-287) wa.me wants country code + local number, so the local half goes through `phoneDigits`.
            onWhatsApp={() => window.open(`https://wa.me/65${phoneDigits(lead.phone)}`, '_blank', 'noopener')}
            onDirections={() => window.open(`https://www.google.com/maps/search/${encodeURIComponent(lead.leadAddress ?? '')}`, '_blank', 'noopener')}
          />
          )}

          <div className={styles.centre} data-tab={tab || 'overview'}>
            {tab === '' ? (
              <>
                <AiBrief stage={lead.stage} lead={briefLead} onAction={() => comingSoon()} />
                <div className={styles.grid}>
                  {/* Right column first: the two stacks were swapped as-is (user 2026-08-31). */}
                  <div className={styles.column}>
                    <div ref={myWorkRef} data-card="my-work">
                      <MyWorkCard
                        tasks={lead.tasks} now={now}
                        onCreate={(anchor) => openTasks(anchor)}
                        onComplete={async (task) => { try { await completeTask(task.id); refresh() } catch { snackbar({ message: 'Couldn’t complete the task — please try again' }) } }}
                        onOpenTask={(task) => router.push(href('tasks', `open=${task.id}`))}
                        onOpenTab={() => goTab('tasks')}
                      />
                    </div>
                    <div data-card="quotes"><QuoteCard quote={quote} approval={quoteApproval} onOpenTab={() => goTab('quotes')} onFromScratch={onBlankQuote} onFromTemplate={onNewQuote} />   {/* (UX audit Q12) From Scratch makes the blank quote; From Template opens the modal */}</div>
                    <div data-card="questionnaire"><QuestionnaireCard q={questionnaire} onAsk={() => setAskOpen(true)} onOpenTab={() => goTab('questionnaire')} /></div>
                  </div>
                  <div className={styles.column}>
                    {ret ? (
                      <div data-card="lead-returned">
                        <LeadReturnedCard ret={ret} returnedBy={returnedBy} onView={() => setReturnDetailsOpen(true)} onAppeal={comingSoon} onOpenTab={() => goTab('activity')} />
                      </div>
                    ) : null}
                    <div data-card="lead-stages">
                    <LeadStagesCard
                      lastContact={lead.lastContact} onOpenContact={() => router.push(href('notes'))}
                      nextFollowUp={nextFollowUp} onOpenFollowUp={() => { if (nextFollowUp) router.push(href('tasks', `open=${nextFollowUp.id}`)) }} onSetFollowUp={() => setFollowUpOpen(true)}
                      responseTime={responseLine(responseTime)} onOpenInsights={canDelete ? () => router.push(withFrom('/leads/insights', `/leads/${lead.id}`)) : undefined}   /* (REG-611) */
                      timeline={timeline} parked={parked} daysInPipeline={daysInPipeline}
                      blocked={(stage) => blockedReason(lead, stage as Stage, stageMovement)}
                      onOpenStage={openStageStep}
                      /* The head arrow opens the Move stage window at the current position, not the Activity tab
                         (user 2026-09-01, REG-259). */
                      onOpen={() => openStageStep(lead.stage)}
                    />
                    </div>
                    {/* A tile opens the record it draws — folder in the Files tab, file in its viewer (REG-181), the routes the card's own arrow and "+n" already use. */}
                    <div data-card="files">
                    <FilesCard
                      files={files}
                      onOpenTab={() => goTab('files')}
                      onOpenFile={(file) => router.push(file.kind === 'folder' ? href('files', `folder=${file.id}`) : `/leads/${lead.id}/files/${file.id}`)}
                      onCreateFolder={comingSoon} onUpload={comingSoon}
                    />
                    </div>
                    <div data-card="recent-activity"><ActivityCard items={activity} now={now} onOpenTab={() => goTab('activity')} /></div>
                  </div>
                </div>
              </>
            ) : body ? body : (
              <div className={styles.soon} role="status">
                <span className={styles.soonTitle}>{activeTab.label}</span>
                <span>Coming soon in OpenMaison 2.0</span>
              </div>
            )}
          </div>

          <QuickLinks busy={openingDesign ? 'AI Visualizer' : null}
            /* Same shape as Quote / Note / Question above: in place on its own tab, otherwise land on the Tasks tab
               with the add row already open. It used to open the MY TASKS popover, whose anchor only exists on the
               Overview — so from Quotes, Files, Notes … the link did nothing at all (user 2026-08-30). */
            onTask={() => { if (tab === 'tasks') window.dispatchEvent(new CustomEvent(CREATE_EVENTS.tasks)); else router.push(href('tasks', 'new=1')) }}
            onQuote={onNewQuote}
            onCallLog={onNewContactLog}
            onNote={onNewNote}
            onOther={(label) => { if (label === 'Quote X-Ray') router.push(`/quote-x-ray?lead=${lead.id}&from=${encodeURIComponent(window.location.pathname + window.location.search)}`); else if (label === 'Contract') router.push(href('contracts', 'new=1')); else if (label === 'AI Visualizer') openVisualizer(); else comingSoon() }}   /* (REG-529, REG-534; REG-639 · F110: back to the tab as it stood — a Files folder included — read at the press) */
          />
        </div>
      </div>

      <StageDropdown
        open={!!stageMenu}
        position={stageMenu}
        onClose={() => setStageMenu(null)}
        blocked={(stage) => blockedReason(lead, stage, stageMovement)}
        current={lead.stage as Stage}
        subject={`${lead.name} · ${phoneLocal(lead.phone)}`}
        doneThrough={journeyIdx(lead)}
        onSelect={(stage) => { setStageMenu(null); requestStageChange(stage) }}
      />
      <ConfirmDialog
        open={!!confirmMove}
        tone="primary"
        title={`Resume at ${confirmMove?.stage ?? ''}?`}
        message={confirmMove?.step
          ? `The ${confirmMove.stage} step opens next — ${lead.stage} ends once it is saved. Details already recorded stay on its journey.`   /* (UX audit 2026-09-30, L1) */
          : `${lead.stage} ends and the lead continues from ${confirmMove?.stage ?? ''}. Details already recorded stay on its journey.`}
        confirmLabel="Resume"
        onCancel={() => { setConfirmMove(null); setMovePick(null) }}
        onConfirm={() => {
          // `quickMove` reports its own failure now (REG-286), so the resume confirm no longer wraps it a second time.
          const c = confirmMove
          setConfirmMove(null)
          if (!c) return
          /* (UX audit 2026-09-30, L1) A resume into an unreached Quote Sent or Won runs that step — its checks and fields — never a silent jump. */
          if (c.step) setWizard(c.stage)
          else void quickMove(c.stage)
        }}
      />
      {wizard ? (
        <MoveStageWizard
          assignable={assignHint(detail.viewer) ? [] : assignableIds(detail.viewer, team)}
          lead={lead}
          team={team}
          targetStage={wizard}
          mode={stageMovement}
          pick={movePick}
          onClose={closeWizard}
          /* (REG-340) The From System empty states hand off the way the Create column does, keeping the Qanvast origin. */
          onCreateQuote={() => { closeWizard(); onNewQuote() }}
          onCreateContract={() => { closeWizard(); if (tab === 'contracts') window.dispatchEvent(new CustomEvent(CREATE_EVENTS.contracts)); else router.push(href('contracts', 'new=1')) }}
          onUpdate={({ stage, data }) => {
            closeWizard()
            void run(async () => {
              if (stage === 'New') { await assignMembers(lead.id, data.assignees); snackbar({ message: 'Members updated' }) }   // (REG-334) New's details are its members
              else { await updateStageDetails({ leadId: lead.id, stage, data }); snackbar({ message: `${stage} details updated` }) }
              refresh()
            }, 'Couldn’t save the stage details — please try again')
          }}
          onSave={({ toStage, data, tasks, quoteNumber }) => {
            closeWizard()
            void run(async () => {
              const { stamped } = await moveStage({ leadId: lead.id, fromStage: lead.stage, toStage, payload: data, tasks })
              // (REG-340) The number is the signed system quote's own; an uploaded quote has none to print.
              if (toStage === 'Won') snackbar({ message: `Project created for ${lead.name}${quoteNumber ? ` · ${quoteNumber}` : ''}`, actionLabel: 'View', onAction: comingSoon })
              /* (UX audit 2026-09-30, Q1) The move marks its system quote sent to the client — the snackbar says which one. */
              else snackbar({ message: stamped ? `Moved to ${toStage} · ${stamped} marked sent to the client` : `Moved to ${toStage}` })
              refresh()
            }, 'Couldn’t move the lead — please try again')
          }}
        />
      ) : null}
      <OnHoldDialog
        open={onHold}
        onClose={() => setOnHold(false)}
        reason={holdReason} setReason={setHoldReason}
        openedAt={holdOpenedAt}
        options={holdOptions}
        onSave={(otherReason, followUpAt, duration) => {
          setOnHold(false)
          const from = lead.stage
          void run(async () => {
            const { logId } = await moveStage({
              leadId: lead.id, fromStage: from, toStage: 'On Hold',
              payload: { reason: otherReason ? `Others: ${otherReason}` : holdReason, duration, followUpAt },
              tasks: [],
            })
            /* (REG-607, parity Q-33) Undo lives as long as the snackbar, as a quick move's does — the lead returns to where it was and the log goes. */
            snackbar({ message: 'Moved to On Hold', actionLabel: 'Undo', onAction: () => { void run(async () => { await undoStageMove({ leadId: lead.id, logId, toStage: from }); refresh() }, 'Couldn’t undo the move — please try again') } })
            refresh()
          }, 'Couldn’t move the lead — please try again')
        }}
      />
      <LostDialog
        open={lost}
        onClose={() => setLost(false)}
        reason={lostReason} setReason={setLostReason}
        options={lostOptions} reasons={leadReasons.lost} contactCount={lead.contactCount} today={new Date(now)}
        competitorHint={lead.lastComparison}   /* (REG-640) */
        onSave={(d) => {
          setLost(false)
          const from = lead.stage
          void run(async () => {
            const { logId } = await moveStage({ leadId: lead.id, fromStage: from, toStage: 'Lost', payload: { reason: d.otherReason ? `Others: ${d.otherReason}` : lostReason, ...(d.competitor ? { competitor: d.competitor } : {}), ...(d.restartAt ? { restartAt: d.restartAt } : {}) }, tasks: [] })
            snackbar({ message: 'Moved to Lost', actionLabel: 'Undo', onAction: () => { void run(async () => { await undoStageMove({ leadId: lead.id, logId, toStage: from }); refresh() }, 'Couldn’t undo the move — please try again') } })
            refresh()
          }, 'Couldn’t move the lead — please try again')
        }}
      />
      <AssignPopover
        open={!!assign}
        team={team}
        value={lead.assignees.map((m) => m.id)}
        anchor={assign?.el}
        assignable={assignHint(detail.viewer) ? [] : assignableIds(detail.viewer, team)} hint={assignHint(detail.viewer)}
        suggestion={lead.assignees.length ? null : suggestMember({ propertyType: lead.propertyType, budgetMinor: lead.budgetMinor, style: lead.style, area: lead.area }, team, memberStats)}   /* (REG-612) */
        onClose={() => setAssign(null)}
        onApply={(memberIds) => { setAssign(null); void run(async () => { await assignMembers(lead.id, memberIds); snackbar({ message: 'Members updated' }); refresh() }, 'Couldn’t update the members — please try again') }}
        requireOne={lead.stage !== 'New'}
        position={assign}
      />
      <TasksPopover
        lead={tasksFor ? lead : null}
        pos={tasksFor}
        anchor={tasksFor?.el}
        now={now}
        onClose={() => setTasksFor(null)}
        onAddTask={async (_lead, title) => {
          try { await addTask(lead.id, title); refresh(); return true }
          catch { snackbar({ message: 'Couldn’t add the task — please try again' }); return false }
        }}
        onCompleteTask={async (_lead, task) => {
          try { await completeTask(task.id); refresh(); return true }
          catch { snackbar({ message: 'Couldn’t complete the task — please try again' }); return false }
        }}
        onSetDue={async (_lead, task, due) => {
          try { await setTaskDue(task.id, due); refresh(); return true }
          catch { snackbar({ message: 'Couldn’t set the due date — please try again' }); return false }
        }}
        onOpenTask={(task) => router.push(href('tasks', `open=${task.id}`))}
      />
      <LeadFormModal
        team={team}
        now={now}
        sources={detail.sources}
        assignable={assignHint(detail.viewer) ? [detail.viewer.id] : assignableIds(detail.viewer, team)}
        customFields={customFields} customValues={customValues}   /* (REG-612) */
        form={leadForm}
        onClose={() => setLeadForm(null)}
        onSubmit={async (_mode, data, leadId, extras) => {
          try { await updateLead(leadId ?? lead.id, { ...data, customValues: extras?.customValues }); setLeadForm(null); snackbar({ message: 'Successfully Updated' }); refresh(); return true }
          catch { snackbar({ message: 'Couldn’t save the lead — please try again' }); return false }
        }}
      />
      <DeleteLeadDialog
        leads={deleting ? [lead] : null}
        liveLinks={liveLinks}
        onClose={() => setDeleting(false)}
        reason={deleteReason}
        setReason={setDeleteReason}
        onDelete={() => {
          setDeleting(false)
          // Leave the page only once the delete has succeeded.
          void run(async () => {
            await deleteLead(lead.id, deleteReason)
            snackbar({ message: 'Lead deleted' })
            router.push('/leads')
          }, 'Couldn’t delete the lead — please try again')
        }}
      />
      <FollowUpDialog
        open={followUpOpen} leadName={lead.name} today={new Date(now)}
        onClose={() => setFollowUpOpen(false)}
        onSave={({ title, dueAt }) => {
          setFollowUpOpen(false)
          void run(async () => {
            await setFollowUp(lead.id, { title, dueAt: dueAt.toISOString() })
            snackbar({ message: `Follow-up set for ${displayDateTimeDot(dueAt)}` })
            refresh()
          }, 'Couldn’t set the follow-up — please try again')
        }}
      />
      <AskClientDialog
        open={askOpen} leadName={lead.name}
        onClose={() => setAskOpen(false)}
        questions={detail.unansweredQuestions}   /* (UX audit T12) the quick ask lists what it will ask, as the Questionnaire tab's does */
        onSend={(ids) => {   /* (REG-609, parity Q-22) recorded on the portal link — "Client asked on …" */
          setAskOpen(false)
          void run(async () => {
            if (ids?.length) { const r = await askClientQuestions(lead.id, ids); if (typeof r !== 'number') { snackbar({ message: `Couldn’t ask ${lead.name} — ${r.error.charAt(0).toLowerCase()}${r.error.slice(1)}` }); return } snackbar({ message: `${r === 1 ? '1 question' : `${r} questions`} sent to ${lead.name}` }) }
            else { await askClient(lead.id); snackbar({ message: `Notification sent to ${lead.name}` }) }
            refresh()
          }, 'Couldn’t record the ask — please try again')
        }}
      />
      <ReturnLeadWizard
        open={returnOpen}
        lead={{ id: lead.id, name: lead.name, createdAt: lead.createdAt }}
        returnsCount={returnsCount}   /* (REG-609, parity Q-44) */
        files={files.filter((f) => f.kind !== 'folder')}
        now={now}
        onClose={() => setReturnOpen(false)}
        onConfirm={(input: ReturnInput) => run(async () => {
          // 931:49009 → 931:48553: the return opens in processing; Undo lives as long as the snackbar (user 2026-08-30).
          const { returnId } = await returnLead(lead.id, input)
          snackbar({ message: 'Lead returned successfully', actionLabel: 'Undo', onAction: () => { void undoReturn(returnId).then(refresh) } })
          refresh()
        }, 'Couldn’t return the lead — please try again')}
      />
      {ret ? (
        <ReturnDetailsModal
          open={returnDetailsOpen}
          leadName={lead.name}
          ret={ret}
          onClose={() => setReturnDetailsOpen(false)}
          onOpenFile={(file: LeadFile) => { setReturnDetailsOpen(false); router.push(`/leads/${lead.id}/files/${file.id}`) }}
        />
      ) : null}
      <InvitePortalModal
        open={inviteOpen}
        lead={{ name: lead.name, phone: lead.phone, invitedAt: portal?.invitedAt ?? null }}
        onClose={() => setInviteOpen(false)}
        onSend={(phone: string, showHistory: boolean) => {
          // Send via WhatsApp (931:48844): the ready-to-send message with the mock's portal link — invented behaviour, REG-192.
          setInviteOpen(false)
          window.open(`https://wa.me/65${phone}?text=${encodeURIComponent(`Hi ${lead.name}, track your project on OpenMaison: http://openmaison.ai/my/portalexample/login`)}`, '_blank')
          /* (REG-609, parity Q-22) The invite is recorded on the portal link — the info column's "Portal" row and Activity read it. */
          void run(async () => { await invitePortal(lead.id, { showHistory }); snackbar({ message: 'WhatsApp opened with the invite' }); refresh() }, 'Couldn’t record the invite — please try again')
        }}
      />
    </PageReveal>
  )
}
