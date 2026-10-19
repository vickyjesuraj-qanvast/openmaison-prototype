'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from 'react'
import { backLabel, fromLabel, withFrom } from '@/lib/nav'
import { copyText } from '@/lib/clipboard'
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
import { LeadFormModal, type LeadFormField, type LeadFormOpen } from '@/components/leads/lead-form'
import { LostDialog, OnHoldDialog } from '@/components/leads/move-stage/dialogs'
import { AskClientDialog, askedLine } from '@/components/leads/questionnaire/ask-client-dialog'
import { MoveStageWizard, type MovePick } from '@/components/leads/move-stage/wizard'
import { GHOST_MIN_MS } from '@/components/shell/page-reveal'
import { readMoveParams, type MoveStep } from '@/lib/leads/move-link'
import { StageDropdown } from '@/components/leads/stage-dropdown'
import { CREATE_EVENTS } from '@/components/leads/tasks/use-create-intent'
import { couldnt, refusalOf, useRun } from '@/components/leads/tasks/use-run'
import { OverviewTaskPanel } from '@/components/leads/detail/task-panel-host'
import { pulseRow } from '@/components/leads/detail/pulse'
import type { LeadTasksData } from '@/lib/leads/tasks'
import { TasksPopover, type TasksPos } from '@/components/leads/tasks-popover'
import { AiBrief } from '@/components/leads/detail/ai-brief'
import { assignHint, assignableIds } from '@/lib/leads/assign-policy'
import { ActivityCard } from '@/components/leads/detail/activity-card'
import { FilesCard } from '@/components/leads/detail/files-card'
import { useFileUpload } from '@/components/leads/files/use-file-upload'   // (pending modules S05) the lead's one upload
import { NameDialog } from '@/components/leads/files/name-dialog'
import { createFolder } from '@/app/leads/files-actions'
import { folderNameProblem, foldersIn } from '@/lib/folders'
import { InfoColumn } from '@/components/leads/detail/info-column'
import { LeadStagesCard } from '@/components/leads/detail/stages-card'
import { FollowUpDialog } from '@/components/leads/detail/follow-up-dialog'
import { MyWorkCard } from '@/components/leads/detail/my-work-card'
import { QuestionnaireCard } from '@/components/leads/detail/questionnaire-card'
import { QuickLinkItems, QuickLinks } from '@/components/leads/detail/quick-links'
import { QuoteCard } from '@/components/leads/detail/quote-card'
import { LeadReturnedCard } from '@/components/leads/detail/returned-card'
import { ClientAccessPanel } from '@/components/portal/client-access-panel'
import { askClient } from '@/app/leads/portal-actions'
import { responseLine } from '@/lib/leads/tat'
import { suggestMember } from '@/lib/leads/suggest'
import { ReturnDetailsModal } from '@/components/leads/return/return-details-modal'
import { ReturnLeadWizard } from '@/components/leads/return/return-lead-wizard'
import { assignMembers, addTask, completeTask, countLiveSigningLinks, deleteLead, markLeadSeen, moveStage, quickMoveStage, resolveMoveHandoff, restoreLeads, setFollowUp, setTaskDue, undoStageMove, updateLead, updateStageDetails } from '@/app/leads/actions'
import { createQuote } from '@/app/leads/quotes-actions'
import { askClientQuestions } from '@/app/leads/questions-actions'
import { fetchAppealDraft, returnLead, undoReturn, type AppealDraft, type ReturnInput } from '@/app/leads/return-actions'
import type { LeadFile } from '@/lib/db/schema'
import type { LeadDetail } from '@/lib/leads/detail'
import { returnTags } from '@/lib/leads/return-tags'
import { type Stage } from '@/lib/leads/enums'
import { OPEN_PROJECT, briefsFor } from '@/lib/leads/briefs'
import { displayDue, isOverdue, moneyCompact, phoneDigits, phoneDisplay, phoneLocal } from '@/lib/format'
import { DETAIL_TABS, blockedReason, canReturnLead, convertBlock, detailHref, headHasPrimary, heldMeetingStep, isActiveStage, journeyIdx, leadTabItems, nextStageOf, projectHoldsDelete, resumeStageOf, roleStageBlock, stageIntent, type DetailTabSlug } from '@/lib/leads/stage-policy'
import { carriesLeadTab, projectTabHref } from '@/lib/projects/tabs'   // (one-home N-10)
import { useRememberLeadShape } from '@/components/leads/detail/tab-ghost-for'
import { useLeadMaison, type LeadMaisonDoors } from '@/components/leads/detail/use-lead-maison'   // (parity P-33)
import { ProjectLayoutsDialog } from '@/components/planner/project-layouts-dialog'   // (one-home N-04)
import { remakeRefusal } from '@/lib/projects/handover-model'   // (fix-E, E-05)
import { runsStudio } from '@/lib/leads/assign-policy'
import { isMarketing, opensPath } from '@/lib/settings/roles'   // (S44O — call C6) Marketing's lead page: the lead's own work, never its quote
import { liveReasonNames } from '@/lib/settings/types'
import { openLeadDesign } from '@/app/visualizer/actions'
import { openLeadProject } from '@/app/projects/actions'
import { remakeLeadProject } from '@/app/projects/ending-actions'   // (Projects round 7, Q-26)
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
/** (pending modules S05) The fields an `?edit=<field>` landing opens Edit Lead on. */
const EDIT_FIELDS = ['name', 'phone', 'email', 'source', 'propertyType', 'propertyAddress', 'district', 'budget', 'leadAddress', 'nric', 'customerId', 'companyName', 'client2Name', 'notes'] as const
const STEP_STAGE: Record<MoveStep, Stage> = { contacted: 'Contacted', met: 'Met', 'quote-sent': 'Quote Sent', won: 'Won', 'on-hold': 'On Hold', lost: 'Lost' }   // (pending modules S05) the parking dialogs too
/** (one-home N-04) The Create link's label — the Tools tile's name (components/shell/tools-popover.tsx). */
const PLANNER = '3D Space Planner'

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
/**
 * `taskData` (Dane's UAT 5.05, 2026-10-01): the lead's tasks as the Tasks tab loads them — the Overview opens a pressed task in the tab's own
 * panel over the page instead of leaving for the Tasks tab (whose Back then left the lead).
 */
export function LeadOverview({ detail, tab, body, wide = false, origin, taskData }: { detail: LeadDetail; tab: DetailTabSlug; body?: ReactNode; wide?: boolean; origin?: string; taskData?: LeadTasksData }) {
  const { lead, team, now, stageMovement, quoteApproval, timeline, parked, daysInPipeline, activity, quote, files, questionnaire, ret, leadReasons, portal, returnsCount, responseTime, customFields, customValues, memberStats } = detail
  /* (REG-607) The studio's reasons for the two dialogs, "Others" last; only Owners and Admins delete (parity Q-41). */
  const holdOptions = liveReasonNames(leadReasons.hold)
  const lostOptions = liveReasonNames(leadReasons.lost)
  const canDelete = runsStudio(detail.viewer.role)
  /* (S44O — call C6, her UAT ask 2026-10-15) Marketing works the lead up to Met: no Quotes · Contracts · Meetings tab, no QUOTES card, the Create
     strip's Task · Note · Contact Log, and Quote Sent / Won are the designer's (`roleStageBlock`) — no Convert and no project to open */
  const desk = isMarketing(detail.viewer.role)
  const role = detail.viewer.role
  const [liveLinks, setLiveLinks] = useState(0)   // (REG-607, parity Q-04) contracts whose signing link is live, counted when Delete opens
  const router = useRouter()
  const snackbar = useSnackbar()
  const comingSoon = useComingSoon()
  const refresh = () => router.refresh()
  /* (pending modules S46C · H2) Opening the lead from anywhere — ⌘K, the bell, the Dashboard, a link — opens it: the listing's band and the Leads
     item's count clear as the listing's own press clears them (`markLeadSeen` stamps once and revalidates, so the rail's number follows). */
  const unseenId = lead.seenAt === null ? lead.id : null
  useEffect(() => { if (unseenId) void markLeadSeen(unseenId).catch(() => {}) }, [unseenId])
  /** Server actions awaited after their dialog has closed: a failure lands in the snackbar instead of vanishing (audit 2026-08-30). */
  const run = async (work: () => Promise<void>, failure: string) => { try { await work() } catch { snackbar({ message: failure }) } }

  /** Tab / quick-link hrefs keep the origin (931:49680, REG-465): `?from=` rides along so the crumb and Back hold across the tabs. */
  const leadHref = (slug: DetailTabSlug, query?: string) => {
    const parts = [query, origin ? `from=${encodeURIComponent(origin)}` : undefined].filter(Boolean)
    return parts.length ? `${detailHref(lead.id, slug)}?${parts.join('&')}` : detailHref(lead.id, slug)
  }
  /* (one-home N-10, the owner 2026-10-08: "let the lead data till won be in the leads and after it's won rest is all under projects") Once the
     lead has a live project, the tabs the project carries on — Tasks · Files · Notes & Logs · Questionnaire · Activity — are the project's alone:
     the strip keeps Overview · Quotes · Contracts, and every way into one of the others (the cards' View all and rows, the Create links, the
     task panel's Open in Tasks) lands on the project's tab, `?open=` / `?new=` / `?folder=` kept, Back returning to this page. */
  const project = detail.project
  const href = (slug: DetailTabSlug, query?: string) => {
    const to = project && carriesLeadTab(slug) ? projectTabHref(project.id, slug) : null
    return to ? withFrom(query ? `${to}?${query}` : to, leadHref(tab)) : leadHref(slug, query)
  }
  /** A file's viewer: the project's once the lead is on it (with the way back here), else the lead's. */
  const fileHref = (fileId: string) => (project ? withFrom(`/projects/${project.id}/files/${fileId}`, leadHref(tab)) : `/leads/${lead.id}/files/${fileId}`)

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
  /* (Dane's UAT 9.08) The Lost dialog's "Put On Hold instead": On Hold opens on its Custom date, set to the expected restart. */
  const [holdFrom, setHoldFrom] = useState<Date | null>(null)
  const [lostReason, setLostReason] = useState('')

  /* A flexible-mode quick move used to be awaited RAW here: `void quickMove(stage)` with nothing around it, so a
     server action that threw became an unhandled rejection — no snackbar, no change, nothing on screen. The listing's
     twin has always reported it. Both the move and its Undo now go through `run` (REG-286, audit "the stage-movement
     dispatch is written twice"), with the listing's own copy. */
  const quickMove = (stage: Stage) => run(async () => {
    const r = await quickMoveStage({ leadId: lead.id, fromStage: lead.stage, toStage: stage })
    if ('error' in r) { snackbar({ message: couldnt('move the lead', refusalOf(r.error)) }); return }   // (fix-E, A-01) the server's rule, said
    const { logId } = r
    snackbar({
      message: `Moved to ${stage}`,
      actionLabel: 'Undo',
      onAction: () => { void run(async () => { await undoMove(logId, lead.stage) }, 'Couldn’t undo the move — please try again') },
    })
    refresh()
  }, 'Couldn’t move the lead — please try again')
  /** (fix-E, A-01) Every Undo of a move: a refusal (a lead whose project is live stays Won) says its rule. */
  const undoMove = async (logId: string, toStage: string) => {
    const u = await undoStageMove({ leadId: lead.id, logId, toStage })
    if (u && 'error' in u) { snackbar({ message: couldnt('undo the move', refusalOf(u.error)) }); return }
    refresh()
  }
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
  const canReturn = canReturnLead({ source: lead.source, returnStatus: ret?.status, project: detail.project })   // (fix-E, A-01) a return parks the lead as Lost
  /* (pending modules S05 — the card's "Appeal a rejected return … a rejected return's only way forward is a dead link") A return Qanvast rejected
     is appealed from its banner (the LEAD RETURNED card, Return details' "here") and the ⋮'s own row: the wizard on that return as it was sent. */
  const [appeal, setAppeal] = useState<AppealDraft | null>(null)
  const appealable = canReturn && ret?.status === 'rejected'
  const openAppeal = async () => {
    const d = await fetchAppealDraft(lead.id).catch(() => null)
    if (!d) { snackbar({ message: 'This return can’t be appealed now — Qanvast hasn’t rejected it' }); return }
    setReturnDetailsOpen(false); setAppeal(d); setReturnOpen(true)
  }
  const openReturn = () => { if (appealable) { void openAppeal(); return } setAppeal(null); setReturnOpen(true) }
  const copyLink = async () => {
    try { await copyText(window.location.href); snackbar({ message: 'Link copied' }) }
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
  /* (pending modules S05 — Maison AI updates a lead: "change Mrs Tan's budget to 90k") `?edit=1` or `?edit=<field>` opens Edit Lead once the page
     has revealed — on that field, the project frame's `?edit=1` way (parity P-11); the address keeps nothing. Nothing is changed without the form. */
  const editParams = useSearchParams()
  const [landEdit] = useState(() => editParams.get('edit'))
  const editLanding = useRef<(focus: LeadFormField | null) => void>(() => {})
  useEffect(() => { editLanding.current = (focus) => setLeadForm({ mode: 'edit', lead, ...(focus ? { focus } : {}) }) })
  useEffect(() => {
    if (!landEdit) return
    const q = new URLSearchParams(window.location.search); q.delete('edit')
    router.replace(`${window.location.pathname}${q.size ? `?${q}` : ''}`, { scroll: false })
    const focus = (EDIT_FIELDS as readonly string[]).includes(landEdit) ? landEdit as LeadFormField : null
    const t = window.setTimeout(() => editLanding.current(focus), GHOST_MIN_MS)
    return () => window.clearTimeout(t)
  }, [landEdit, router])
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
    /* (Dane's UAT 7.13) The refusal already names the stage ("Resume at Quote Sent first") — the action says only the verb. */
    if (!isActiveStage(lead.stage)) return { label: 'Resume', stage: resumeStageOf(lead) }
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
    const intent = stageIntent(lead, stage, stageMovement, role)
    switch (intent.kind) {
      case 'none': return
      /* (UX audit 2026-09-30, L10 — supersedes REG-607's pre-pick) Both dialogs open with no reason chosen: the required field asks for
         one, where a hurried Save used to file every lost lead under the list's first reason. */
      case 'hold': setHoldReason(''); setHoldFrom(null); setHoldOpenedAt(Date.now()); setOnHold(true); return
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
  /* (REG-911, Projects round 1) A Won lead's next chapter is its project: the primary opens it — made now if the lead was won before
     projects existed. One record, two chapters. */
  /* (Projects round 7, Q-26) a Won lead whose project was deleted stays Won: its primary makes the project again */
  const remake = primaryKind === 'won' && !detail.project && !!detail.deletedProject
  /* (fix-E, E-05) only an Owner or an Admin removes the old one to make it again: anyone else reads why on the locked button, no confirm */
  const remakeLocked = remake && !canDelete ? remakeRefusal(detail.deletedProject!.number) : null
  const [remakeOpen, setRemakeOpen] = useState(false)
  const primaryLabel = primaryKind === 'won' ? (remake ? 'Make the project again' : 'Open project') : primaryKind === 'resume' ? `Resume at ${resumeStageOf(lead)}` : primaryKind === 'next' ? `Move to ${nextStage}` : 'Convert to Project'
  const convertPrimary = primaryKind === 'won' || primaryKind === 'convert'
  /* (S44O — call C6) Marketing's header: the next move while it is theirs (Contacted, Met, a resume short of Quote Sent); past that the lead is the
     designer's — no Convert, no project to open, so no filled button (the stage menu says why on Quote Sent and Won) */
  const deskPrimary = headHasPrimary(lead, stageMovement, role)   // (S44Z) the one rule the loaders' seed reads too (lib/ghost-shapes.server.ts)
  /* (REG-708 · parity P-07) the loaders' ghost draws this page's shape next time: the strip (the short one once the lead is on its project) and the
     header's actions (the locked Convert between the pill and the primary, or the pair a Won lead shows) */
  useRememberLeadShape(lead.id, { onProject: !!project, locked: !desk && !convertPrimary && !!wonBlock, noPrimary: !deskPrimary })   // (S44O — C6)
  const projectRun = useRun()
  const openProject = (projectId?: string | null) => {
    const here = `${window.location.pathname}${window.location.search}`
    if (projectId) { router.push(withFrom(`/projects/${projectId}`, here)); return }
    void projectRun.run('open the project', async () => { const r = await openLeadProject(lead.id); if ('error' in r) return r; router.push(withFrom(`/projects/${r.id}`, here)); return null }, undefined, { guard: 'project' })
  }
  const pressPrimary = () => {
    if (primaryKind === 'won' && remakeLocked) refuse(remakeLocked)
    else if (primaryKind === 'won' && remake) setRemakeOpen(true)
    else if (primaryKind === 'won') openProject(detail.project?.id)
    else if (primaryKind === 'convert') requestStageChange('Won')
    else if (primaryKind === 'resume') requestStageChange(resumeStageOf(lead))
    else if (primaryKind === 'next' && nextStage) requestStageChange(nextStage)
    else if (wonBlock) refuse(wonBlock)
  }
  /* (Dane's UAT 9.06, supersedes REG-168's "parked row → the resume stage") The parked row — On Hold or Lost — resumes the lead the way
     the header's "Resume at X" does: the "Resume at X?" confirm, then a quick resume or that step (REG-738). It opened the Move stage
     window at the stage the lead left, a second way in that skipped the confirm's words. */
  const openStageStep = (stage: string) => {
    if (stage === 'On Hold' || stage === 'Lost') { requestStageChange(resumeStageOf(lead)); return }
    { const byRole = roleStageBlock(role, stage); if (byRole) { refuse(byRole); return } }   // (S44O — C6) a completed Quote Sent / Won step is its quote
    const step = timeline.find((s) => s.stage === stage)
    if (step && step.state !== 'future') { setWizard(stage as Stage); return }
    requestStageChange(stage as Stage)
  }
  /** (REG-259) The card's head arrow: the Move stage window at the lead's position — for a parked lead, the stage it left. */
  const openCurrentStep = () => {
    if (!isActiveStage(lead.stage)) { setWizard(lead.resumeStage ?? 'New'); return }
    openStageStep(lead.stage)
  }

  /* ── (UX audit 2026-09-30, Q1 · C1 · L2) The hand-off: `?move=<step>&quote=|contract=|log=` (lib/leads/move-link.ts) — a sent or
     confirmed quote, a signed contract, a saved contact log offering the lead's next stage — opens the Move stage window at that step
     with the document already picked, once, then the parameters leave the address. The stage policy still decides: a step the lead
     can't reach answers as the pill would, with the way on; a parked lead confirms its resume first. The window opens as the page
     reveals (GHOST_MIN_MS), never under the ghost. ── */
  const openHandoff = async (h: NonNullable<ReturnType<typeof readMoveParams>>) => {
    const stage = STEP_STAGE[h.step]
    /* (Dane's UAT 8.17 — REG-779 unchanged) A signed notice keeps its Won link after the lead is Won: there is no step left to take, so
       the link lands on the lead's Contracts tab with that contract brought into view and pulsed once (`?open=`, read below). */
    if (h.step === 'won' && lead.stage === 'Won' && h.contract) {
      const resolved = await resolveMoveHandoff(lead.id, { quote: null, contract: h.contract, log: null, meeting: null }).catch(() => null)
      router.replace(href('contracts', resolved?.contractId ? `open=${encodeURIComponent(resolved.contractId)}` : undefined))
      return
    }
    const [resolved] = await Promise.all([
      h.quote || h.contract || h.log || h.meeting ? resolveMoveHandoff(lead.id, { quote: h.quote, contract: h.contract, log: h.log, meeting: h.meeting }).catch(() => null) : Promise.resolve(null),   /* (pending modules S23) a held meeting */
      new Promise((r) => setTimeout(r, GHOST_MIN_MS)),
    ])
    const pick: MovePick | null = resolved ? { quoteId: resolved.quoteId, contractId: resolved.contractId, log: resolved.log, meeting: resolved.meeting } : null
    const intent = stageIntent(lead, stage, stageMovement, role)
    if (intent.kind === 'blocked') { refuse(intent.message); return }
    if (intent.kind === 'hold' || intent.kind === 'lost') {
      stageRequest.current?.(stage)   // (pending modules S05) the dialog, as the pill opens it
      if (intent.kind === 'lost' && h.reason && lostOptions.includes(h.reason)) setLostReason(h.reason)   // (S42E, call E·3) a dropped Hangout chat's reason, where the studio's list has it
      return
    }
    setMovePick(pick)
    if (intent.kind === 'confirm-resume') { setConfirmMove({ stage: intent.stage, step: true }); return }
    setWizard(stage)   // the next step, Won, a Flexible move, or the stage the lead is in (its details) — the window, the document picked
  }
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const handoff = readMoveParams(searchParams)
  const handoffKey = handoff ? [handoff.step, handoff.quote, handoff.contract, handoff.log, handoff.meeting, handoff.reason].join('|') : ''
  const handoffRun = useRef<typeof openHandoff | null>(null)   // set after each commit, read in the effect below — never during render
  useEffect(() => { handoffRun.current = openHandoff })
  const handoffDone = useRef('')
  useEffect(() => {
    if (!handoffKey) { handoffDone.current = ''; return }
    if (handoffDone.current === handoffKey) return
    handoffDone.current = handoffKey
    const here = new URLSearchParams(window.location.search)
    const h = readMoveParams(here)
    for (const k of ['move', 'quote', 'contract', 'log', 'meeting', 'reason']) here.delete(k)
    const rest = here.toString()
    router.replace(rest ? `${pathname}?${rest}` : pathname, { scroll: false })
    if (h) void handoffRun.current?.(h)
  }, [handoffKey, pathname, router])
  /* ── (Dane's UAT 5.19 · 8.17) Arrivals that point at one thing on the page: `?pulse=lead-stages` (the "Moved to X" snackbar's View, from
     another tab) brings the LEAD STAGES card into view and pulses it once — the house attention pulse; `?open=<contractId>` on the Contracts
     tab (a signed notice on a lead already Won) does the same for that contract's row. Read once as the page reveals (GHOST_MIN_MS), then
     the parameter leaves the address. The timer is not cleared when the address changes — dropping the parameter is what changes it. ── */
  const pulseParam = tab === '' ? 'pulse' : tab === 'contracts' ? 'open' : null
  const pulseKey = pulseParam ? searchParams.get(pulseParam) : null
  const [pulseCard, setPulseCard] = useState<string | null>(null)
  const pulseDone = useRef('')
  useEffect(() => {
    if (!pulseKey || !pulseParam) { pulseDone.current = ''; return }
    if (pulseDone.current === pulseKey) return
    pulseDone.current = pulseKey
    const here = new URLSearchParams(window.location.search)
    here.delete(pulseParam)
    const rest = here.toString()
    router.replace(rest ? `${pathname}?${rest}` : pathname, { scroll: false })
    const onCard = pulseParam === 'pulse'
    setTimeout(() => {
      const el = onCard
        ? document.querySelector<HTMLElement>(`[data-card="${CSS.escape(pulseKey)}"]`)
        : document.querySelector<HTMLElement>(`[data-kb-list="contract"] [data-kb-row][data-kb-id="${CSS.escape(pulseKey)}"]`)
      if (!el) return
      el.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
      if (!onCard) { pulseRow(el); return }
      setPulseCard(pulseKey)
      setTimeout(() => setPulseCard((c) => (c === pulseKey ? null : c)), 1600)
    }, GHOST_MIN_MS + 250)
  }, [pulseKey, pulseParam, pathname, router])
  /* ── (Dane's UAT 5.05) A task pressed on the Overview — MY TASKS, the tasks popover, LEAD STAGES' next follow-up — opens in the Tasks
     tab's own panel over the page (`OverviewTaskPanel`); closing it leaves the reader on the Overview, and its Open in Tasks goes to the
     full tab. It used to leave for the Tasks tab, whose Back then left the lead (REG-465). ── */
  const [panelTask, setPanelTask] = useState<string | null>(null)
  if (panelTask && !taskData?.tasks.some((t) => t.id === panelTask)) setPanelTask(null)   // deleted under the open panel (render-phase adjust)
  const openTaskPanel = (taskId: string) => {
    if (tab === '' && taskData?.tasks.some((t) => t.id === taskId)) { setTasksFor(null); setPanelTask(taskId); return }
    router.push(href('tasks', `open=${taskId}`))
  }
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

  /* (one-home N-04) The 3D Space Planner from the Create links — it answered "Coming soon" while the planner was live. A lead with its project
     opens the project's layouts (the project ⋮'s "Plan the space in 3D…" dialog); (pending modules S07 — the projects card's "a 3D layout
     started on a lead before Won is not carried to its project", a deliberate change of R88's "a layout without a project carries no lead")
     before that, the same dialog with the LEAD's layouts: a new one is saved with the lead and goes to its project at Won. The editor's Back
     returns to this page, as the dialog's own layouts do. */
  const [planner, setPlanner] = useState<'project' | 'lead' | null>(null)
  const openPlanner = () => setPlanner(project ? 'project' : 'lead')

  const goTab = (slug: DetailTabSlug) => router.push(href(slug))
  /* (pending modules S05 — the card's "Coming soon presses whose target now exists: the Overview FILES card's Create Folder / Upload (the Files
     tab does both)") The empty card's two buttons do their job here, the Files tab's way: Upload Files picks files and uploads them with their
     bytes (the lead's one upload, its toast and its snackbar — View opens Files), Create Folder names a folder at the top of Files (Open
     opens it). The card fills as they land. */
  const filesPicker = useRef<HTMLInputElement | null>(null)
  const { upload: uploadFiles, toast: uploadToast } = useFileUpload(lead.id, { view: () => goTab('files') })
  const [folderOpen, setFolderOpen] = useState(false)
  const rootFolders = useMemo(() => foldersIn(files.filter((f) => f.kind === 'folder').map((f) => ({ id: f.id, name: f.name, parentId: f.parentId ?? null })), null), [files])
  const makeFolder = async (name: string) => {
    setFolderOpen(false)
    const r = await createFolder(lead.id, name, null).catch(() => null)
    if (typeof r !== 'string') { snackbar({ message: couldnt('create the folder', r ? refusalOf(r.error) : null) }); return }
    snackbar({ message: 'Folder created', actionLabel: 'Open', onAction: () => router.push(href('files', `folder=${r}`)) })
    refresh()
  }
  /** (Dane's UAT 5.19) The "Moved to X" snackbar's View on a tab other than the Overview: the Overview, LEAD STAGES pulsing once. */
  const viewStages = tab === '' ? {} : { actionLabel: 'View', onAction: () => router.push(href('', 'pulse=lead-stages')) }
  /* The tab window events come from CREATE_EVENTS, the map the listening tabs already read (REG-286) — these three
     dispatchers used to hard-code the same strings, so a rename on one side broke the quick link in silence. */
  /** New quote (QUOTES card › From Scratch, Create quick links › Quote): the Quotes tab handles it in place, elsewhere it opens with `?new=1`. */
  /* (UX audit Q12, the Overview's QUOTES card) From Scratch makes the blank quote at once, as the Quotes tab's empty card does; From Template
     keeps the Create Quote modal. */
  /* (Dane's UAT, b-doublequote) A double press made two quotes: the Quotes tab's own re-entrancy guard (`guard: 'create'`, RACE-05) — a
     press while the first is in flight is dropped. The failure line is the same "Couldn’t create the quote — please try again". */
  const createRun = useRun()
  const onBlankQuote = () => { void createRun.run('create the quote', async () => { const id = await createQuote(lead.id, null); router.push(withFrom(`/quotes/${id}`, `${window.location.pathname}${window.location.search}`)) }, undefined, { guard: 'create' }) }
  const onNewQuote = () => { if (tab === 'quotes') window.dispatchEvent(new CustomEvent(CREATE_EVENTS.quotes)); else router.push(href('quotes', 'new=1')) }
  /** New note (Create quick links › Note, 931-44865): the Notes tab starts the draft in place, elsewhere it opens with `?new=note`. */
  const onNewNote = () => { if (tab === 'notes') window.dispatchEvent(new CustomEvent(CREATE_EVENTS.notes, { detail: { kind: 'note' } })); else router.push(href('notes', 'new=note')) }
  /** (REG-337, user 2026-09-04) Create quick links › Contact Log: a contact-log draft on the Notes tab, the way Task and Note
   *  hand off — it used to open the Move stage window at Contacted, which is a stage move, not a record.
   *  (REG-551 → REG-552, owner 2026-09-23) The Meeting quick link is gone with the Meetings tab until their mocks land. */
  const onNewContactLog = () => { if (tab === 'notes') window.dispatchEvent(new CustomEvent(CREATE_EVENTS.notes, { detail: { kind: 'contact' } })); else router.push(href('notes', 'new=contact')) }
  /* (simplify S-14 · Q-04) the Create strip's handlers, named once: the strip on the row's right and — ≤767, where the strip is hidden — the
     ⋮ sheet's Create group both press them */
  const onQuickTask = () => { if (tab === 'tasks') window.dispatchEvent(new CustomEvent(CREATE_EVENTS.tasks)); else router.push(href('tasks', 'new=1')) }
  const onQuickOther = (label: string) => { if (label === 'Meeting') { if (tab === 'meetings') window.dispatchEvent(new CustomEvent(CREATE_EVENTS.meetings)); else router.push(href('meetings', 'new=1')); return }   /* (pending modules S23) */ if (label === 'Quote X-Ray') router.push(`/quote-x-ray?lead=${lead.id}&from=${encodeURIComponent(window.location.pathname + window.location.search)}`); else if (label === 'Contract') router.push(href('contracts', 'new=1')); else if (label === 'AI Visualizer') openVisualizer(); else if (label === PLANNER) openPlanner(); else comingSoon() }   /* (REG-529, REG-534; REG-639 · F110: back to the tab as it stood — a Files folder included — read at the press; one-home N-04) */
  /* (parity P-06 · Q-01, the owner's pick 2026-10-08) the strip's counts by the project strip's rule — what waits on you there: open tasks, quotes
     waiting for approval (an approver's), unanswered questions (LeadDetail.tabCounts); the house Tabs draws them as the project's */
  const tabItems = leadTabItems(!!project, detail.tabCounts).map((t) => ({ label: t.label, href: href(t.slug), count: t.count })).filter((t) => opensPath(role, t.href.split('?')[0]!))   // (S44O — C6) the tabs this member opens
  const activeTab = DETAIL_TABS.find((t) => t.slug === tab) ?? DETAIL_TABS[0]
  const returnedBy = ret ? team.find((m) => m.id === ret.returnedById) ?? null : null
  /* The briefs read the questionnaire off the lead, so hand them the counts the QUESTIONNAIRE card already prints —
     otherwise a lead with answers still reads "no questionnaire yet" beside a card saying 7 / 11 answered. */
  const briefLead = useMemo(
    /* (UX audit 2026-09-30, L2) `contacted`: a logged contact — the New brief stops saying "No contact yet" beside Last contact. */
    () => ({ ...lead, contacted: !!lead.lastContact, questionnaire: questionnaire ? { answered: questionnaire.clientAnswered + questionnaire.studioAnswered, total: questionnaire.total } : null, project: detail.project,
      /* (S42E, E-11) a New lead already met (its last contact a held meeting): the brief says so and offers its next stage — and (S42G) a lead
         in Contacted whose meeting no Met log holds yet (a New lead moved on with its meeting as the first contact): Met follows, not "book the meet" */
      met: lead.stage === 'New' && lead.lastContact?.outcome === 'Meeting held' ? { at: lead.lastContact.at, where: lead.lastContact.channel, step: heldMeetingStep(lead, stageMovement) }
        : lead.stage === 'Contacted' && detail.heldMeeting ? { at: new Date(detail.heldMeeting.at), where: detail.heldMeeting.where, step: heldMeetingStep(lead, stageMovement) } : null }),   // (fix-A, A-26) the Won brief speaks of the project
    [lead, questionnaire, detail.project, detail.heldMeeting, stageMovement],
  )
  /* (parity P-33 · Q-02, the owner's pick 2026-10-08) Maison AI acts on the lead as it acts on a project: the brief's buttons and the FAB's
     suggestions resolve to `{ run | answer | propose }` (components/leads/detail/use-lead-maison.ts) — the page's own doors, answers from the
     lead's and the studio's records, a follow-up task or a WhatsApp draft to confirm. Words with nothing on record behind them still say
     "Coming soon". */
  /* (S42E, E-11) the met-already brief's press: the lead's next stage by the studio's rule, the held meeting as that step's log */
  const logMeeting = async () => {
    const step = heldMeetingStep(lead, stageMovement)
    if (!step) return
    const id = detail.heldMeeting?.id ?? lead.lastContact?.meetingId   // (S42G) the meeting no Met log holds yet, else the last contact's
    const r = id ? await resolveMoveHandoff(lead.id, { meeting: id }).catch(() => null) : null
    setMovePick(r ? { quoteId: null, contractId: null, log: r.log, meeting: r.meeting } : null)
    setWizard(step)
  }
  const maisonDoors: LeadMaisonDoors = {
    followUp: () => setFollowUpOpen(true),
    logMeeting: () => { void logMeeting() },
    ask: () => setAskOpen(true),
    newQuote: onNewQuote,
    openQuote: (quoteId) => router.push(withFrom(`/quotes/${quoteId}`, `${window.location.pathname}${window.location.search}`)),
    visualizer: openVisualizer,
    openProject: () => openProject(detail.project?.id),
    edit: editLead,
    contactLog: onNewContactLog,
    tab: (slug, query) => href(slug, query),
    openTask: openTaskPanel,
  }
  const maison = useLeadMaison({ lead, quote, unanswered: detail.unansweredQuestions, parked, project: detail.project, team, doors: maisonDoors, desk })   // (S44O — C6)
  const aiSuggestions = useMemo(() => Array.from(new Set(briefsFor(lead.stage, briefLead).flatMap((b) => b.actions).filter((a) => a !== OPEN_PROJECT))).slice(0, 3).map(maison), [lead.stage, briefLead, maison])
  useMaisonAi(aiSuggestions)   /* (REG-507) the shell's FAB + sheet */
  /* (parity P-16, the owner's pick 2026-10-08 — the project's pattern, A-11 · D-14) Back names the place it returns to — "Back to Tasks",
     "Back to the project" — and the crumb never says "Leads" twice: a lead opened from the listing (`?from=/leads…`) reads "Leads /" once, that
     crumb keeping the listing's own address (its scope, search and filters). (lib/nav `backLabel` reads any `/leads/…` path as a lead — a Leads
     page that is not a lead keeps its section's name.) */
  const fromSection = fromLabel(origin)
  const backText = fromSection === 'Insights' || fromSection === 'Import History' ? `Back to ${fromSection}`
    : backLabel(origin, { leadName: origin?.startsWith(`/leads/${lead.id}`) ? lead.name : null, fallback: 'Back to Leads' })
  const crumbs = [
    ...(origin && fromSection && fromSection !== 'Leads' ? [{ label: fromSection, href: origin }] : []),
    { label: 'Leads', href: origin && fromSection === 'Leads' ? origin : '/leads' },   /* (REG-536) clickable */
  ]

  return (
    <PageReveal skeleton={<DetailSkeleton wide={wide} tab={tab} tabs={tabItems.map((t) => t.label)} shape={{ onProject: !!project, locked: !desk && !convertPrimary && !!wonBlock, noPrimary: !deskPrimary }} />}>   {/* (REG-708) the tab's own body — the ghost its [tab]/loading.tsx drew; (one-home N-10) the strip it shows */}
      <div className={styles.body}>
        <PageHeaderL2
          scrollShadow={false}   /* the sticky tab strip below carries the block's level-1 (REG-331 · REG-369) */
          backHref={origin ?? '/leads'}
          backLabel={backText}   /* (parity P-16) */
          crumbs={crumbs}
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
              {!desk && !convertPrimary && wonBlock ? (
                <Tooltip label={wonBlock}>
                  <span className={`${styles.anchor} ${styles.convertLocked}`} data-testid="convert-locked">
                    <Button variant="secondary" appearance="outlined" iconStart={<Icon name="lock" size={20} />} onPress={() => refuse(wonBlock)}>
                      Convert to Project
                    </Button>
                  </span>
                </Tooltip>
              ) : null}
{deskPrimary ? (
                            <Tooltip label={lead.stage === 'Won' ? (detail.project ? `Open ${detail.project.number}` : remakeLocked ? remakeLocked : detail.deletedProject ? `${detail.deletedProject.number} is in Deleted Projects` : 'Open the project') : convertPrimary ? 'Opens the Won step — it creates the project' : ''} disabled={!convertPrimary}>
                <span className={`${styles.anchor} ${styles.convertAction}`} data-testid="header-primary">
                  {remakeLocked
                    ? <Button variant="secondary" appearance="outlined" iconStart={<Icon name="lock" size={20} />} onPress={pressPrimary}>{primaryLabel}</Button>   /* (fix-E, E-05) Convert's locked look */
                    : <Button variant="primary" onPress={pressPrimary}>{primaryLabel}</Button>}
                </span>
              </Tooltip>
              ) : null}
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
                {/* (simplify S-14 · Q-04, the owner's "build everything" 2026-10-09) ≤767, where the Create strip is hidden, the sheet opens with its
                    Create group — the strip's own eight, its own handlers (the AI Visualizer row it used to carry, audit 2026-09-26 D7, is one of them) —
                    then the lead's rows as before */}
                {phoneSheet ? <QuickLinkItems busy={openingDesign ? 'AI Visualizer' : null} set={desk ? 'desk' : undefined} onPicked={() => setKebabOpen(false)}
                                              onTask={onQuickTask} onQuote={onNewQuote} onCallLog={onNewContactLog} onNote={onNewNote} onOther={onQuickOther} /> : null}
                <DropdownItem onSelect={() => { setKebabOpen(false); setLeadForm({ mode: 'edit', lead }) }} shortcut="edit">Edit</DropdownItem>
                {desk ? null : <DropdownItem onSelect={() => { setKebabOpen(false); setInviteOpen(true) }}>Invite to Portal</DropdownItem>}   {/* (S44O — C6) a client's access is whoever works on the lead (`worksOn`) — never Marketing */}
                {canReturn ? (
                  <DropdownItem onSelect={() => { setKebabOpen(false); openReturn() }}>{appealable ? 'Appeal the return' : 'Return Lead'}</DropdownItem>
                ) : null}
                <DropdownItem onSelect={() => { setKebabOpen(false); void copyLink() }}>Copy Link</DropdownItem>
                {canDelete ? (
                  /* (REG-728) the house danger row, where a red span in a plain row stood. (fix-E, A-09 · E-10 · Q-27) A lead with a live project
                     is refused in the row before the press — never after a reason was typed into the dialog. */
                  <DropdownItem tone="danger" disabled={!!detail.project} title={detail.project ? projectHoldsDelete(detail.project.number) : undefined}
                                onSelect={() => { setKebabOpen(false); setDeleteReason('Spam'); setLiveLinks(0); setDeleting(true); void countLiveSigningLinks([lead.id]).then(setLiveLinks).catch(() => setLiveLinks(0)) }}>
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
            teamChatHref={`/chat?open=${encodeURIComponent(`lead-team:${lead.id}`)}&from=${encodeURIComponent(`/leads/${lead.id}`)}`}   /* (pending modules S26) the lead's Team conversation — the project's once Won */
            customFields={customFields} customValues={customValues}   /* (REG-612) */
            lead={lead}
            team={team}
            onEdit={() => setLeadForm({ mode: 'edit', lead })}
            onAssign={openAssign}
            onAssigneeMenu={(anchor) => openAssign(anchor)}
            onCopy={async (what, value) => {
              // (REG-287) One copy format for the whole app — `phoneDisplay`, not a second "+65 ${value}" template here.
              try { await copyText(what === 'phone' ? phoneDisplay(value) : value); snackbar({ message: 'Copied to clipboard' }) }
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
                {/* (fix-A, A-26) · (parity P-33) the buttons act — `maison` answers each one's words */}
                <AiBrief stage={lead.stage} lead={briefLead} actions={maison} onAction={() => comingSoon()} />
                <div className={styles.grid}>
                  {/* Right column first: the two stacks were swapped as-is (user 2026-08-31). */}
                  {/* (parity P-04, the owner's pick 2026-10-08 — "after Won it's all under projects", REG-1378) A lead with a live project keeps its
                      sales record here — QUOTES, LEAD STAGES, RECENT ACTIVITY and the brief's THE PROJECT — and drops MY TASKS, FILES and
                      QUESTIONNAIRE: those records are the project's, and its Overview carries their cards. */}
                  <div className={styles.column}>
                    {project ? null : (
                    <div ref={myWorkRef} data-card="my-work">
                      <MyWorkCard
                        tasks={lead.tasks} now={now}
                        onCreate={(anchor) => openTasks(anchor)}
                        onComplete={async (task) => { try { await completeTask(task.id); refresh() } catch { snackbar({ message: 'Couldn’t complete the task — please try again' }) } }}
                        onOpenTask={(task) => openTaskPanel(task.id)}   /* (Dane's UAT 5.05) the task's panel over the Overview */
                        onOpenTab={() => goTab('tasks')}
                      />
                    </div>
                    )}
                    {desk ? null : <div data-card="quotes"><QuoteCard quote={quote} approval={quoteApproval} onOpenTab={() => goTab('quotes')} onFromScratch={onBlankQuote} onFromTemplate={onNewQuote} />   {/* (UX audit Q12) From Scratch makes the blank quote; From Template opens the modal */}</div>}   {/* (S44O — C6) never Marketing's */}
                    {project ? null : <div data-card="questionnaire"><QuestionnaireCard q={questionnaire} onAsk={() => setAskOpen(true)} onOpenTab={() => goTab('questionnaire')} /></div>}
                  </div>
                  <div className={styles.column}>
                    {ret ? (
                      <div data-card="lead-returned">
                        <LeadReturnedCard ret={ret} returnedBy={returnedBy} now={now} onView={() => setReturnDetailsOpen(true)} onAppeal={() => { void openAppeal() }} onOpenTab={() => goTab('activity')} />
                      </div>
                    ) : null}
                    <div data-card="lead-stages" className={styles.pulse} data-fresh={pulseCard === 'lead-stages' || undefined}>   {/* (Dane's UAT 5.19) View from another tab pulses it once */}
                    <LeadStagesCard
                      lastContact={lead.lastContact} onOpenContact={() => router.push(href('notes'))}
                      nextFollowUp={nextFollowUp} onOpenFollowUp={() => { if (nextFollowUp) openTaskPanel(nextFollowUp.id) }} onSetFollowUp={() => setFollowUpOpen(true)}
                      responseTime={responseLine(responseTime)} onOpenInsights={canDelete ? () => router.push(withFrom('/company/reports/leads', `/leads/${lead.id}`)) : undefined}   /* (REG-611) */
                      timeline={timeline} parked={parked} daysInPipeline={daysInPipeline}
                      blocked={(stage) => blockedReason(lead, stage as Stage, stageMovement, role)}
                      onOpenStage={openStageStep}
                      /* The head arrow opens the Move stage window at the current position, not the Activity tab
                         (user 2026-09-01, REG-259). */
                      onOpen={openCurrentStep}
                    />
                    </div>
                    {/* A tile opens the record it draws — folder in the Files tab, file in its viewer (REG-181), the routes the card's own arrow and "+n" already use. */}
                    {project ? null : (
                    <div data-card="files">
                    <FilesCard
                      files={files}
                      onOpenTab={() => goTab('files')}
                      onOpenFile={(file) => router.push(file.kind === 'folder' ? href('files', `folder=${file.id}`) : fileHref(file.id))}   /* (one-home N-10) the project's once it is live */
                      onCreateFolder={() => setFolderOpen(true)} onUpload={() => filesPicker.current?.click()}   /* (pending modules S05) */
                    />
                    </div>
                    )}
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

          <QuickLinks busy={openingDesign ? 'AI Visualizer' : null} set={desk ? 'desk' : undefined}   /* (S44O — C6) Marketing's: Task · Note · Contact Log */
            /* Same shape as Quote / Note / Question above: in place on its own tab, otherwise land on the Tasks tab
               with the add row already open. It used to open the MY TASKS popover, whose anchor only exists on the
               Overview — so from Quotes, Files, Notes … the link did nothing at all (user 2026-08-30). */
            onTask={onQuickTask}
            onQuote={onNewQuote}
            onCallLog={onNewContactLog}
            onNote={onNewNote}
            onOther={onQuickOther}
          />
        </div>
      </div>

      <StageDropdown
        open={!!stageMenu}
        position={stageMenu}
        onClose={() => setStageMenu(null)}
        blocked={(stage) => blockedReason(lead, stage, stageMovement, role)}
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
              else {
                const r = await updateStageDetails({ leadId: lead.id, stage, data })
                snackbar({ message: 'error' in r ? couldnt('save the stage details', refusalOf(r.error)) : `${stage} details updated` })   // (S43B · F1-07) the server's own check
              }
              refresh()
            }, 'Couldn’t save the stage details — please try again')
          }}
          onSave={({ toStage, data, tasks }) => {
            closeWizard()
            void run(async () => {
              const moved = await moveStage({ leadId: lead.id, fromStage: lead.stage, toStage, payload: data, tasks })
              if ('error' in moved) { snackbar({ message: couldnt('move the lead', refusalOf(moved.error)) }); refresh(); return }   // (fix-E, A-01)
              const { stamped, projectId, projectNumber } = moved
              // (REG-911) View opens the project Won made. (REG-1052) One sentence with New project's: the project's own number.
              if (toStage === 'Won') { if (projectId) router.push(withFrom(`/projects/${projectId}?created=1`, `${window.location.pathname}${window.location.search}`)); else { snackbar({ message: projectNumber ? `Project ${projectNumber} created` : 'Project created' }); openProject(projectId) } }   // (simplify Q-16) Won opens the new project, which says "Project P-… created" (`?created=1`)
              /* (UX audit 2026-09-30, Q1) The move marks its system quote sent to the client — the snackbar says which one. */
              /* (Dane's UAT 5.19) Moved from another tab, the reader stays where they are; View takes them to the Overview with the LEAD STAGES
                 card pulsing once. A move with Undo keeps Undo — the snackbar carries one action. */
              else snackbar({ message: stamped ? `Moved to ${toStage} · ${stamped} marked sent to the client` : moved.planned ? `Moved to ${toStage} · a meeting is planned for ${displayDue(new Date(moved.planned.at))}` : `Moved to ${toStage}`, ...viewStages })   // (pending modules S23) the in-person next step planned it
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
        followUpOn={holdFrom}   /* (Dane's UAT 9.08) from the Lost dialog's "Put On Hold instead" */
        options={holdOptions}
        onSave={(otherReason, followUpAt, duration) => {
          setOnHold(false)
          const from = lead.stage
          void run(async () => {
            const moved = await moveStage({
              leadId: lead.id, fromStage: from, toStage: 'On Hold',
              payload: { reason: otherReason ? `Others: ${otherReason}` : holdReason, duration, followUpAt },
              tasks: [],
            })
            if ('error' in moved) { snackbar({ message: couldnt('move the lead', refusalOf(moved.error)) }); refresh(); return }   // (fix-E, A-01)
            const { logId } = moved
            /* (REG-607, parity Q-33) Undo lives as long as the snackbar, as a quick move's does — the lead returns to where it was and the log goes.
               (parity P-14, the owner's pick 2026-10-08) One sentence per action kind on both records: "{name} is on hold", the project's words. */
            snackbar({ message: `${lead.name} is on hold`, actionLabel: 'Undo', onAction: () => { void run(async () => { await undoMove(logId, from) }, 'Couldn’t undo the move — please try again') } })
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
        onHoldInstead={(restart) => { setLost(false); setHoldReason(''); setHoldFrom(restart); setHoldOpenedAt(Date.now()); setOnHold(true) }}   /* (Dane's UAT 9.08) */
        onSave={(d) => {
          setLost(false)
          const from = lead.stage
          void run(async () => {
            const moved = await moveStage({ leadId: lead.id, fromStage: from, toStage: 'Lost', payload: { reason: d.otherReason ? `Others: ${d.otherReason}` : lostReason, ...(d.competitor ? { competitor: d.competitor } : {}), ...(d.restartAt ? { restartAt: d.restartAt } : {}) }, tasks: [] })
            if ('error' in moved) { snackbar({ message: couldnt('move the lead', refusalOf(moved.error)) }); refresh(); return }   // (fix-E, A-01)
            const { logId } = moved
            snackbar({ message: 'Moved to Lost', actionLabel: 'Undo', onAction: () => { void run(async () => { await undoMove(logId, from) }, 'Couldn’t undo the move — please try again') } })
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
        onOpenTask={(task) => openTaskPanel(task.id)}
      />
      {taskData ? (
        /* (Dane's UAT 5.05) the Tasks tab's panel and its actions, over the Overview */
        <OverviewTaskPanel leadId={lead.id} data={taskData} openId={panelTask} onClose={() => setPanelTask(null)}
                           onOpenInTasks={(id) => { setPanelTask(null); router.push(href('tasks', `open=${id}`)) }} />
      ) : null}
      <LeadFormModal
        team={team}
        now={now}
        sources={detail.sources}
        assignable={assignHint(detail.viewer) ? [detail.viewer.id] : assignableIds(detail.viewer, team)}
        customFields={customFields} customValues={customValues}   /* (REG-612) */
        form={leadForm}
        onClose={() => setLeadForm(null)}
        onSubmit={async (_mode, data, leadId, extras) => {
          /* (parity P-14, the owner's pick 2026-10-08) "Details saved" — the one sentence for an edit on both records (the project's) */
          try { await updateLead(leadId ?? lead.id, { ...data, customValues: extras?.customValues }); setLeadForm(null); snackbar({ message: 'Details saved' }); refresh(); return true }
          catch { snackbar({ message: 'Couldn’t save the lead — please try again' }); return false }
        }}
      />
      {/* (Projects round 7, Q-26) Make the project again — the deleted one is removed for good first (a lead has one project) */}
      <ConfirmDialog open={remakeOpen} title="Make the project again?" confirmLabel="Make it again"
                     message={`${detail.deletedProject?.number ?? 'Its project'} is in Deleted Projects. Making the project again removes it for good and starts a new one from the Won step. To keep it, restore it from Projects › Deleted Projects instead.`}
                     onCancel={() => setRemakeOpen(false)}
                     onConfirm={() => {
                       setRemakeOpen(false)
                       void projectRun.run('make the project again', async () => { const r = await remakeLeadProject(lead.id); if ('error' in r) return r; router.push(withFrom(`/projects/${r.id}`, `${window.location.pathname}${window.location.search}`)); return null }, 'Project made again', { guard: 'project' })
                     }} />
      <DeleteLeadDialog
        leads={deleting ? [lead] : null}
        liveLinks={liveLinks}
        onClose={() => setDeleting(false)}
        reason={deleteReason}
        setReason={setDeleteReason}
        onOpenProject={(pid) => { setDeleting(false); openProject(pid) }}   /* (fix-E, E-10) */
        onDelete={() => {
          setDeleting(false)
          // Leave the page only once the delete has succeeded.
          void run(async () => {
            const refused = await deleteLead(lead.id, deleteReason)
            /* (Projects round 7, Q-27) a lead with a project refuses — the snackbar says so and opens the project */
            if (refused) { const pid = refused.projectId; snackbar({ message: couldnt('delete the lead', refusalOf(refused.error)), ...(pid ? { actionLabel: 'Open project', onAction: () => openProject(pid) } : {}) }); return }
            /* (parity P-36 · P-14, the owner's pick 2026-10-08) "{name} deleted" with the listing's Undo (REG-28, `restoreLeads`) — the page leaves for
               the listing, and Undo puts the lead back where it was; the listing's own lines when it can't. */
            snackbar({
              message: `${lead.name} deleted`,
              actionLabel: 'Undo',
              onAction: async () => {
                try {
                  const n = await restoreLeads([lead.id])
                  if (n === 0) snackbar({ message: 'This lead was already deleted forever' })
                  else router.refresh()
                } catch { snackbar({ message: 'Couldn’t restore — please try again' }) }
              },
            })
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
            snackbar({ message: `Follow-up set for ${displayDue(dueAt)}` })
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
            if (ids?.length) { const r = await askClientQuestions(lead.id, ids); if (typeof r !== 'number') { snackbar({ message: `Couldn’t ask ${lead.name} — ${r.error.charAt(0).toLowerCase()}${r.error.slice(1)}` }); return } snackbar({ message: askedLine(lead.name, r) })   /* (parity map, CP-110) where the questions are now */ }
            else { const r = await askClient(lead.id); if (r && 'error' in r) { snackbar({ message: `Couldn’t ask ${lead.name} — ${r.error.charAt(0).toLowerCase()}${r.error.slice(1)}` }); return } snackbar({ message: `Notification sent to ${lead.name}` }) }   // (gaps build D, item 9) the 5-minute pace
            refresh()
          }, 'Couldn’t record the ask — please try again')
        }}
      />
      <ReturnLeadWizard
        open={returnOpen}
        appeal={appeal}   /* (pending modules S05) */
        lead={{ id: lead.id, name: lead.name, createdAt: lead.createdAt }}
        returnsCount={returnsCount}   /* (REG-609, parity Q-44) */
        files={files.filter((f) => f.kind !== 'folder')}
        now={now}
        onClose={() => setReturnOpen(false)}
        onConfirm={(input: ReturnInput) => run(async () => {
          // 931:49009 → 931:48553: the return opens in processing; Undo lives as long as the snackbar (user 2026-08-30).
          const { returnId } = await returnLead(lead.id, input)
          snackbar({ message: input.appealOf ? 'Appeal sent to Qanvast' : 'Lead returned successfully', actionLabel: 'Undo', onAction: () => { void undoReturn(returnId).then(refresh) } })   // (pending modules S05)
          refresh()
        }, input.appealOf ? 'Couldn’t send the appeal — please try again' : 'Couldn’t return the lead — please try again')}
      />
      {ret ? (
        <ReturnDetailsModal
          open={returnDetailsOpen}
          leadName={lead.name}
          ret={ret}
          now={now}
          onClose={() => setReturnDetailsOpen(false)}
          onOpenFile={(file: LeadFile) => { setReturnDetailsOpen(false); router.push(fileHref(file.id)) }}
          onAppeal={appealable ? () => { void openAppeal() } : undefined}   /* (pending modules S05) the banner's "here" */
          onChanged={refresh}
        />
      ) : null}
      {/* (Projects r4a, board 8) Invite to Portal opens the Client access panel — who can open the client's page and how that access stands,
          Invite / Resend on WhatsApp in one press, See it as the client, Withdraw — in place of the bare Invite dialog. */}
      <ClientAccessPanel open={inviteOpen} leadId={lead.id} onClose={() => setInviteOpen(false)} />
      {/* (pending modules S05) the FILES card's Upload Files and Create Folder, in place */}
      <input ref={filesPicker} type="file" hidden multiple data-testid="overview-files-picker" onChange={(e) => { const list = [...(e.target.files ?? [])]; e.target.value = ''; uploadFiles(list, null) }} />
      {uploadToast}
      <NameDialog open={folderOpen} title="Create Folder" initial="" onClose={() => setFolderOpen(false)}
                  validate={(name: string) => folderNameProblem(name, rootFolders, null)} onSave={(name: string) => { void makeFolder(name) }} />
      {/* (one-home N-04) the 3D Space Planner's ways in from the lead */}
      <ProjectLayoutsDialog project={planner === 'project' && project ? { id: project.id, name: project.name ?? lead.name } : null}
                            lead={planner === 'lead' && !project ? { id: lead.id, name: lead.name } : null} onClose={() => setPlanner(null)} />
    </PageReveal>
  )
}
