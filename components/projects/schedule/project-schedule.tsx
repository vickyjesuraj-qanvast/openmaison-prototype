'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import NextLink from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Button, SegmentedButton, SegmentedButtonItem } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { Dialog } from '@/components/om/dialog'
import { ConfirmDialog } from '@/components/om/confirm-dialog'
import { Drawer } from '@/components/om/drawer'
import { TextField } from '@/components/om/text-field'
import { PortalMenu } from '@/components/om/portal-menu'
import { useSnackbar } from '@/components/om/snackbar'
import { useEscapeLayer } from '@/components/om/surface'
import { DropdownDivider, DropdownItem, MENU_WIDTH } from '@/components/leads/dropdown'
import { couldnt, refusalOf, useRun } from '@/components/leads/tasks/use-run'
import { OutsideDialog } from '@/components/leads/tasks/outside-person'
import { ClientAccessPanel } from '@/components/portal/client-access-panel'
import { MOBILE, useMediaQuery } from '@/lib/breakpoint'
import { setFlagPref, useFlagPref } from '@/lib/prefs'
import { useRememberShape } from '@/lib/ghost-shape'
import { withFrom } from '@/lib/nav'
import { parseInputDate } from '@/lib/format'
import { waLink } from '@/lib/portal/model'
import { outsideMessage } from '@/lib/leads/outside'
import {
  STATUS_LABEL, dateOfDay, dayLabel, dayMonth, dayOf, dayOfIso, handoverOf, moveWith, namedHandover, nextPayment, nextPaymentWords, paidInFull, plural,
  scheduleNewsMessage, shortTitle, summaryOf,
  type ClientLayer, type ClientRow, type ExtensionAsk, type Milestone, type ScheduleChange,
} from '@/lib/projects/schedule-model'
import type { ScheduleData, ScheduleTask } from '@/lib/projects/schedule'
import {
  addMilestone, addMilestoneTask, askStageAgain, createSchedule, deleteMilestone, moveMilestone, renameMilestone, reorderMilestone, restoreMilestone, restoreMilestoneOrder, saveMilestone,
  saveScheduleAsTemplate, setMilestoneStatus, shareSchedule, undoMilestoneSave, undoMilestoneStatus, undoMove, type MilestonePatch, type ScheduleSource,
  /* (gaps build, package C) */
  answerMoreTime, approveMilestoneDone, askForMoreTime, moveMilestoneTo, rebuildSchedule, reopenShareAsk, resolveStage, sendBackMilestoneDone, sendBackShareAsk, undoMoreTimeAnswer, undoRebuild,
  undoResolveStage, withdrawMilestoneDone, withdrawMoreTime, withdrawShareAsk,
  undoMarkDone, type DoneTold,   // (simplify S-18)
  addMilestoneTasks, moveForVariation, notNowVariationDays, undoSuggestedTasks, undoVariationDays,   // (parity map, SC-094 · SC-056)
} from '@/app/projects/schedule-actions'
import { suggestForMilestone } from '@/lib/projects/task-suggestions'   // (parity map, SC-056) by rule — a stand-in for 1.0's AI
import { VoDaysDialog } from './vo-days-dialog'
import { SuggestTasksDialog } from './suggest-tasks-dialog'
import { MarkDoneSheet } from './mark-done-sheet'   // (simplify S-18) every Done opens one sheet
import { asksPastEnd } from '@/lib/projects/schedule-rules'   // (simplify Q-18)
import { tellClientText, tellDay } from '@/lib/projects/tell-client'
import { unsentWords } from '@/lib/notifications/held'   // (simplify round 2, R2-C)
import { money2 } from '@/lib/quotes/math'
import { SHARE_SHAPE_KEY } from './schedule-ghost'
import { isPausedStage, pausedLine } from '@/lib/portal/schedule-model'   // (simplify S-25 (1)) · (parity map, CP-064) P-F's paused line
import { recordTaskSentOutside, setTaskAssignees, setTaskOutside, setTasksDone, undoTaskOutside, updateTask } from '@/app/leads/tasks-actions'
import { ScheduleTimeline, type RowAction, type Zoom } from './schedule-timeline'
import { SCHEDULE_ROWS, SchedulePhone } from './schedule-phone'
import { AskDialog, MilestonePanel, type PanelAsks, type PanelTaskEdits } from './milestone-panel'
import { completedBlock } from '@/lib/projects/handover-model'   // (fix-E, E-17)
import { ShareDialog } from './share-dialog'
import { ClientSchedule } from './client-schedule'
import { StartSchedule } from './start-schedule'
import { RebuildDialog } from './rebuild-dialog'
import styles from './schedule.module.css'
import { useProjectCrew } from '@/components/projects/contractors/use-crew'   // (S45B · H-UHD-2) the project's contractors
import type { CrewBoardData } from '@/lib/projects/contractors'

/** "1st" · "2nd" · "3rd" · "11th" — a place in the list (REG-1070). */
const nth = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`

const WIDE = '(min-width: 1200px)'
/** (B-30) The scale a viewer picked, kept per browser. */
const MONTHS_KEY = 'om.schedule.months'

/**
 * (Projects round 2 — the Schedule; the Project Schedule Proposal as drawn) A project's Schedule tab: where the job stands (one sentence and
 * three figures), the scale and Today, who sees it and what they still have to be shown, Add milestone, then the list that is also the
 * timeline — or, on a phone, its rows. A move says what it did in one sentence with Undo; Share changes stores what the client sees next; the
 * client's copy can sit beside the list. A project with no milestones starts here (Start.dc.html).
 * (gaps build, package C) Rebuild the schedule from the kebab; full screen; a row dragged to a new place; the start's and the end's prompt (a
 * band under the summary: post an update, add tasks, send the stage's invoice); the asks that wait on an Owner or an Admin, and their answers.
 */
export function ProjectSchedule({ data, crew: crewData = null }: { data: ScheduleData; /** (S45B · H-UHD-2) the contractors' records — the project's crew, the Assign dialog's roster */ crew?: CrewBoardData | null }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const snackbar = useSnackbar()
  const { run } = useRun()
  const phone = useMediaQuery(MOBILE)
  /* (held calls 2026-10-24, W3-04) a phone and a tablet held upright read the rows, not the timeline — the scale, Today, full screen and the
     legend are the timeline's, so they go with it; the phone keeps its own bar, summary and dock (`phone`) */
  const asRows = useMediaQuery(SCHEDULE_ROWS)
  const wide = useMediaQuery(WIDE)
  const today = dayOf(new Date(data.now))
  const client = data.clientFirst

  /* the list as the page holds it — a move lands here at once, the server's answer replaces it (render-phase adjust, never an effect) */
  const [seen, setSeen] = useState(data.milestones)
  const [list, setList] = useState(data.milestones)
  if (data.milestones !== seen) { setSeen(data.milestones); setList(data.milestones) }
  useRememberShape(`lead.${data.projectId}.schedule`, !list.length)   // (B-46, REG-817) the tab's ghost opens on the shape it last had: Start, or the list
  /* (B-30) Weeks or Months: ?scale= wins, else what this browser picked last */
  const [months, setMonths] = useFlagPref(MONTHS_KEY, false)
  const scaleParam = params.get('scale')
  const zoom: Zoom = scaleParam === 'months' ? 'months' : scaleParam === 'weeks' ? 'weeks' : months ? 'months' : 'weeks'
  const [todayTick, setTodayTick] = useState(0)
  const [openId, setOpenId] = useState<string | null>(params.get('open'))
  const [shareOpen, setShareOpen] = useState(params.get('share') === '1')
  /* (gaps build, package C — 7) Share this change: the dialog opens with that change ticked alone */
  const [shareOnly, setShareOnly] = useState<string[] | null>(null)
  /* the header's Share changes lands here with ?share=1 — also when the tab is already open */
  const shareParam = params.get('share') === '1'
  const [seenShare, setSeenShare] = useState(shareParam)
  if (shareParam !== seenShare) { setSeenShare(shareParam); if (shareParam) setShareOpen(true) }
  const [pane, setPane] = useState(false)
  const [renaming, setRenaming] = useState<Milestone | null>(null)
  /* (B-15) Add milestone — after the last one, or after the one its row's ⋮ named; (B-37) a blank schedule's first one on works start */
  const [adding, setAdding] = useState<{ after: Milestone | null; start?: string } | null>(null)
  const [deleting, setDeleting] = useState<Milestone | null>(null)
  /* (simplify S-18) the Mark done sheet — every Done opens it; the Overview's rows and the phone's site bar land with ?done=<id> (contract C) */
  const [doneFor, setDoneFor] = useState<string | null>(params.get('done'))
  const doneParam = params.get('done')
  const [seenDone, setSeenDone] = useState(doneParam)
  if (doneParam !== seenDone) { setSeenDone(doneParam); if (doneParam) setDoneFor(doneParam) }
  /* (simplify Q-18) a Designer's drag past a running milestone's end becomes the ask for more time, its new last day filled in */
  const [moreFor, setMoreFor] = useState<{ m: Milestone; end: number } | null>(null)
  const [saving, setSaving] = useState(false)
  const [access, setAccess] = useState(false)
  const [kebab, setKebab] = useState(false)
  const kebabRef = useRef<HTMLSpanElement>(null)
  const [fresh, setFresh] = useState<string | null>(null)
  /* (gaps build, package C) */
  const [rebuilding, setRebuilding] = useState(false)
  /* (gaps build I, I-Q17) Maison AI's "Draft a schedule from the quote" lands with ?draft=ai: the Rebuild dialog on its Maison AI way, or the Start
     card on it when there is no schedule yet */
  const draftAi = params.get('draft') === 'ai' && data.mayChange
  const [seenDraft, setSeenDraft] = useState(false)
  if (draftAi && !seenDraft) { setSeenDraft(true); if (list.length) setRebuilding(true) }
  if (!draftAi && seenDraft) setSeenDraft(false)
  const [full, setFull] = useState(false)
  if (full && asRows) setFull(false)   // (W3-04) a tablet turned upright leaves full screen — the rows have none (render-phase adjust)
  const fullRef = useRef<HTMLDivElement>(null)
  useEscapeLayer(full, fullRef, () => setFull(false))
  const [nudge, setNudge] = useState<{ kind: 'started' | 'done'; id: string } | null>(null)
  /* (parity map, SC-094) an approved variation order's days — Needs you's row and the toolbar land on its dialog (`?vo=<id>`, once) */
  const [voFor, setVoFor] = useState<string | null>(params.get('vo'))
  const voParam = params.get('vo')
  const [seenVo, setSeenVo] = useState(voParam)
  if (voParam !== seenVo) { setSeenVo(voParam); if (voParam) setVoFor(voParam) }
  /* (parity map, SC-056 · TD-023) the milestone whose suggested tasks are open */
  const [suggestFor, setSuggestFor] = useState<string | null>(null)
  const [addTaskFor, setAddTaskFor] = useState<string | null>(null)
  const [outsideFor, setOutsideFor] = useState<ScheduleTask | null>(null)
  const pulse = (id: string) => { setFresh(id); window.setTimeout(() => setFresh((f) => (f === id ? null : f)), 1600) }
  const here = () => `${pathname}${params.toString() ? `?${params.toString()}` : ''}`
  /** Takes a query key off the address without a new history entry (Share's `share`, the panel's `open`, the scale's `scale`). */
  const dropParam = (key: string) => { if (params.get(key) !== null) { const next = new URLSearchParams(params); next.delete(key); router.replace(`${pathname}${next.size ? `?${next}` : ''}`, { scroll: false }) } }
  const setZoom = (z: Zoom) => { setMonths(z === 'months'); dropParam('scale') }
  /* (simplify S-18) ?done= is read once, then cleared from the address — a second one pushed on the same page (the site bar's Done, an
     Overview row) opens the sheet again */
  useEffect(() => { if (doneParam) dropParam('done') }, [doneParam])   // eslint-disable-line react-hooks/exhaustive-deps -- dropParam reads the address as it is
  useEffect(() => { if (voParam) dropParam('vo') }, [voParam])   // eslint-disable-line react-hooks/exhaustive-deps -- (parity map, SC-094) read once, as ?done= is
  /* (S45B) ?crew= · ?assign= · ?trade= are read once, as ?done= is */
  useEffect(() => {
    if (params.get('crew') === null && params.get('assign') === null) return
    const next = new URLSearchParams(params); next.delete('crew'); next.delete('assign'); next.delete('trade')
    router.replace(`${pathname}${next.size ? `?${next}` : ''}`, { scroll: false })
  }, [params, pathname, router])

  /* (B-35 · B-36) the panel: closing it drops ?open= (a reload or Back never reopens it); unsaved edits are asked about first */
  const panelDirty = useRef(false)
  const [discard, setDiscard] = useState<(() => void) | null>(null)
  const guard = (go: () => void) => { if (openId && panelDirty.current && data.mayChange) setDiscard(() => go); else go() }
  const closeOpen = () => { panelDirty.current = false; setOpenId(null); setAddTaskFor(null); dropParam('open') }
  const openRow = (m: Milestone) => { if (m.id !== openId) guard(() => { panelDirty.current = false; setOpenId(m.id) }) }

  const snapshot = data.share?.snapshot ?? null
  const changes: ScheduleChange[] = data.changes
  const was = useMemo(() => {
    const out = new Map<string, { start: number; end: number }>()
    for (const r of snapshot?.rows ?? []) {
      const m = list.find((x) => x.id === r.id)
      const s = dayOfIso(r.start), e = dayOfIso(r.end)
      if (m && s !== null && e !== null && (m.start !== s || m.end !== e)) out.set(m.id, { start: s, end: e })
    }
    return out
  }, [snapshot, list])
  /* (r4b, layer 6) what the client has of a milestone; (B-12) as done, from the FIRST share that carried it done — never the newest's day */
  const sharedRow = (m: Milestone) => snapshot?.rows.find((r) => r.id === m.id) ?? null
  const doneDay = (m: Milestone) => { const at = data.doneShared[m.id]; return at !== undefined ? dayOf(new Date(at)) : null }
  const clientLayer = (m: Milestone): ClientLayer | null => { const d = doneDay(m); return data.share && sharedRow(m)?.state === 'done' && d !== null ? { first: client, sharedDay: d } : null }
  const sharedOf = (m: Milestone) => { const r = sharedRow(m); if (!r || !data.share) return null; const done = r.state === 'done'; return { day: (done ? doneDay(m) : null) ?? dayOf(new Date(data.share.at)), done } }
  /* (B-38) the full name in a sentence the studio reads back */
  const askAgain = async (m: Milestone) => run(`ask ${client} again`, () => askStageAgain(m.id), `Asked ${client} again to confirm ${m.title}`)
  const waitingWho = (m: Milestone) => (!m.waiting ? null : m.waiting.on === 'client' ? client : m.waiting.on === 'member' ? data.team.find((x) => x.id === m.waiting!.memberId)?.name.split(' ')[0] ?? 'a member' : m.waiting.name || 'a supplier')
  const open = list.find((m) => m.id === openId) ?? null
  /* (S45B · H-UHD-2) the project's contractors: each row's line names its crew, the panel lists them, the toolbar's Contractors opens them all;
     `?crew=1` opens them (the Workload view's and a vendor's doors), `?assign=<milestone>&trade=` opens Add a contractor on it (a gap's door) */
  const crew = useProjectCrew({ board: crewData, projectId: data.projectId, mayChange: data.mayChange && data.stage !== 'completed', here: pathname, nested: !!open })
  const crewParam = params.get('crew') === '1' ? 'crew' : params.get('assign') !== null ? `assign:${params.get('assign')}:${params.get('trade') ?? ''}` : null
  const [seenCrew, setSeenCrew] = useState<string | null>(null)
  if (crewParam !== seenCrew) {
    setSeenCrew(crewParam)
    if (crewParam === 'crew') crew.open()
    else if (crewParam && data.mayChange) { const [, ms, trade] = crewParam.split(':'); crew.assign({ projectId: data.projectId, milestoneId: ms || null, trade: trade || null }) }
  }
  const h = handoverOf(list)
  /* (gaps build, package C — 5) the open asks for more time, by milestone */
  const extOf = (m: Milestone): ExtensionAsk | null => (data.extensions ?? []).find((x) => x.milestoneId === m.id) ?? null
  const moreTo = (m: Milestone) => extOf(m)?.toEnd ?? null
  const answers = !!data.answers
  const shareAsk = data.shareAsk ?? null
  /* (simplify S-24, the owner's "build everything", 2026-10-09) Share N changes — a real button beside the toolbar's line, whatever holds the
     header's slot; the line keeps opening what the client sees. Under share approval it asks an Owner or an Admin. The ghost remembers it. */
  const asksToShare = !!data.rules?.shareApproval && !answers
  const shareLabel = !data.mayChange || !list.length || !changes.length ? null
    : !data.share ? (asksToShare ? 'Ask to share the schedule' : 'Share the schedule')
    : asksToShare ? `Ask to share ${plural(changes.length, 'change')}` : `Share ${plural(changes.length, 'change')}`
  useEffect(() => { setFlagPref(SHARE_SHAPE_KEY, !!shareLabel) }, [shareLabel])

  /* ── the answers ── */
  const moved = async (m: Milestone, to: { start: number; end: number }) => {
    /* (simplify Q-18) the extension rule: past its end, a Designer or a Manager asks — the bar stays where it was */
    if (asksPastEnd(data.viewer.role, m, today, to.end)) {
      if (extOf(m)) { snackbar({ message: `More time is already asked for ${shortTitle(m.title)} — an Owner or an Admin answers it` }); return }
      setMoreFor({ m, end: to.end }); return
    }
    const prev = list
    setList(moveWith(list, m.id, to.start, to.end).list)
    pulse(m.id)
    const iso = (n: number) => new Date(n * 86_400_000).toISOString().slice(0, 10)
    try {
      const r = await moveMilestone(m.id, { start: iso(to.start), end: iso(to.end) })
      if ('error' in r) { setList(prev); snackbar({ message: couldnt(`move ${m.title}`, refusalOf(r.error)) }); return }
      if (r.sentence) snackbar({ key: 'schedule-move', message: r.sentence, actionLabel: 'Undo', onAction: () => { setList(prev); void run('undo the move', () => undoMove(r.undo)) } })
    } catch { setList(prev); snackbar({ message: couldnt(`move ${m.title}`) }) }
  }
  /* (simplify S-18) every Done — the row's Mark done, its ⋮, the panel's Status, a phone row's Done — opens the Mark done sheet (it took over
     B-09's "Mark {m} done today?" and the done prompt: the date, bringing what follows forward, telling the client, its invoice). Any other
     status is said in one sentence with Undo; (gaps build, package C — 10) a start brings its prompt. */
  const status = async (m: Milestone, s: Milestone['status']) => {
    if (m.status === s) return
    if (s === 'done') { setDoneFor(m.id); return }
    const prev = list
    setList(list.map((x) => (x.id === m.id ? { ...x, status: s } : x)))
    try {
      const r = await setMilestoneStatus(m.id, s)
      if ('error' in r) { setList(prev); snackbar({ message: couldnt(`mark ${m.title} ${STATUS_LABEL[s].toLowerCase()}`, refusalOf(r.error)) }); return }
      snackbar({ key: 'schedule-status', message: r.sentence, actionLabel: 'Undo', onAction: () => { setList(prev); setNudge(null); void run('undo the change', () => undoMilestoneStatus(r.undo)) } })
      if (!r.asked && s === 'in_progress' && data.mayChange) setNudge({ kind: 'started', id: m.id })
    } catch { setList(prev); snackbar({ message: couldnt(`mark ${m.title} ${STATUS_LABEL[s].toLowerCase()}`) }) }
  }
  const waitsForApproval = () => !!data.rules?.completionApproval && !answers
  /* (REG-1070) a reorder answers like every change on the schedule — where it went, in one sentence, with Undo (the dates never move) */
  const reorder = async (m: Milestone, dir: -1 | 1) => {
    const name = shortTitle(m.title)
    try {
      const r = await reorderMilestone(m.id, dir)
      if ('error' in r) { snackbar({ message: couldnt(`move ${name}`, refusalOf(r.error)) }); return }
      pulse(m.id)
      snackbar({ key: 'schedule-move', message: `${name} moved ${dir < 0 ? 'up' : 'down'} — now ${nth(r.place)} of ${r.of}`, actionLabel: 'Undo',
                 onAction: () => { void run('undo the move', () => restoreMilestoneOrder(r.undo), `${name} is back where it was`).then((ok) => { if (ok) pulse(m.id) }) } })
    } catch { snackbar({ message: couldnt(`move ${name}`) }) }
  }
  /* (gaps build, package C — 13) a row dragged to a new place: the list's order only, said in one sentence with Undo */
  const reorderTo = async (m: Milestone, index: number) => {
    const name = shortTitle(m.title)
    const prev = list
    const order = list.filter((x) => x.id !== m.id); order.splice(index, 0, m)
    setList(order)
    try {
      const r = await moveMilestoneTo(m.id, index)
      if ('error' in r) { setList(prev); snackbar({ message: couldnt(`move ${name}`, refusalOf(r.error)) }); return }
      pulse(m.id)
      snackbar({ key: 'schedule-move', message: `${name} moved — now ${nth(r.place)} of ${r.of}`, actionLabel: 'Undo',
                 onAction: () => { setList(prev); void run('undo the move', () => restoreMilestoneOrder(r.undo), `${name} is back where it was`) } })
    } catch { setList(prev); snackbar({ message: couldnt(`move ${name}`) }) }
  }
  const act = (m: Milestone, a: RowAction) => {
    if (a.kind === 'open') openRow(m)
    else if (a.kind === 'rename') setRenaming(m)
    else if (a.kind === 'status') void status(m, a.status)
    else if (a.kind === 'up' || a.kind === 'down') void reorder(m, a.kind === 'up' ? -1 : 1)
    else if (a.kind === 'add-after') setAdding({ after: m })
    else if (a.kind === 'delete') setDeleting(m)
  }
  const remove = async (m: Milestone) => {
    setDeleting(null); closeOpen()
    const prev = list
    setList(list.filter((x) => x.id !== m.id))
    try {
      const r = await deleteMilestone(m.id)
      if ('error' in r) { setList(prev); snackbar({ message: couldnt(`delete ${m.title}`, refusalOf(r.error)) }); return }
      snackbar({ message: `“${m.title}” deleted`, actionLabel: 'Undo', onAction: () => { setList(prev); void run('bring it back', () => restoreMilestone(r.undo)).then((ok) => { if (ok) pulse(m.id) }) } })
    } catch { setList(prev); snackbar({ message: couldnt(`delete ${m.title}`) }) }
  }
  /* (B-02) one sentence names everything the Save did; one Undo puts all of it back */
  const save = async (m: Milestone, patch: MilestonePatch): Promise<boolean> => {
    if (!Object.keys(patch).length) { closeOpen(); return true }
    try {
      const r = await saveMilestone(m.id, patch)
      if ('error' in r) { snackbar({ message: couldnt(`save ${m.title}`, refusalOf(r.error)) }); return false }
      closeOpen(); pulse(m.id)
      const undo = r.undo
      snackbar(undo ? { key: 'schedule-move', message: r.sentence, actionLabel: 'Undo', onAction: () => { setNudge(null); void run('undo the change', () => undoMilestoneSave(undo), `${shortTitle(m.title)} is back as it was`) } } : { message: r.sentence })
      /* (gaps build, package C — 10) a save that started it or finished it brings its prompt */
      if (patch.status && patch.status !== m.status && (patch.status === 'in_progress' || (patch.status === 'done' && !waitsForApproval()))) setNudge({ kind: patch.status === 'done' ? 'done' : 'started', id: m.id })
      return true
    } catch { snackbar({ message: couldnt(`save ${m.title}`) }); return false }
  }
  const addTask = async (m: Milestone, title: string) => run('add the task', () => addMilestoneTask(m.id, title), `Task added to ${shortTitle(m.title)}`)
  /* (parity map, SC-056 · TD-023) a milestone's suggested tasks — by rule from the signed quote's lines and the stage's usual steps (no credits) */
  const signedQuote = (data.quotes ?? []).find((q) => q.id === data.start.quote?.id) ?? (data.quotes ?? []).find((q) => q.signed) ?? null
  const suggestM = suggestFor ? list.find((x) => x.id === suggestFor) ?? null : null
  const suggestions = suggestM ? suggestForMilestone({ title: suggestM.title, description: suggestM.description, lines: signedQuote?.items ?? [], propertyType: data.propertyType ?? null,
    existing: data.tasks.filter((t) => t.milestoneId === suggestM.id).map((t) => t.title) }) : []
  const addSuggested = async (titles: string[]): Promise<boolean> => {
    const m = suggestM
    if (!m) return false
    try {
      const r = await addMilestoneTasks(m.id, { titles })
      if ('error' in r) { snackbar({ message: couldnt('add the tasks', refusalOf(r.error)) }); return false }
      snackbar({ message: r.sentence, actionLabel: 'Undo', onAction: () => { void run('take the tasks back', () => undoSuggestedTasks(r.undo), 'The tasks are taken back', { refresh: true }) } })
      router.refresh()
      return true
    } catch { snackbar({ message: couldnt('add the tasks') }); return false }
  }
  /* (parity map, SC-094) an approved variation order's days: move what follows (or ask for the days), or not now — one sentence, one Undo */
  const voDays = data.voDays ?? null
  const voAsk = voFor ? voDays?.open.find((v) => v.id === voFor) ?? null : null
  const moveForVo = async (milestoneId: string): Promise<boolean> => {
    const v = voAsk
    if (!v) return false
    try {
      const r = await moveForVariation(v.id, { milestoneId })
      if ('error' in r) { snackbar({ message: couldnt('move the schedule', refusalOf(r.error)) }); return false }
      pulse(milestoneId)
      snackbar({ key: 'schedule-move', message: r.sentence, actionLabel: 'Undo', onAction: () => { void run('undo the move', () => undoVariationDays(r.undo), `${v.number}’s days wait for an answer again`, { refresh: true }) } })
      router.refresh()
      return true
    } catch { snackbar({ message: couldnt('move the schedule') }); return false }
  }
  const notNowVo = async (): Promise<boolean> => {
    const v = voAsk
    if (!v) return false
    try {
      const r = await notNowVariationDays(v.id, data.projectId)
      if ('error' in r) { snackbar({ message: couldnt('leave the schedule as it is', refusalOf(r.error)) }); return false }
      snackbar({ message: r.sentence, actionLabel: 'Undo', onAction: () => { void run('undo', () => undoVariationDays(r.undo), `${v.number}’s days wait for an answer again`, { refresh: true }) } })
      router.refresh()
      return true
    } catch { snackbar({ message: couldnt('leave the schedule as it is') }); return false }
  }
  const toggleTask = (t: ScheduleTask) => { void run(t.done ? 'reopen the task' : 'complete the task', () => setTasksDone([t.id], !t.done), t.done ? 'Task reopened' : 'Task completed', { refresh: true }) }
  /* (B-01) the share says truthfully who will see it; (B-53) with the portal live, it offers the client's WhatsApp news in one press.
     (gaps build, package C — 7 · 8) only the ticked changes; a press that asks an Owner or an Admin says so */
  const share = async (note: string, only: string[] | null): Promise<boolean> => {
    try {
      const r = await shareSchedule(data.projectId, { note, only })
      if ('error' in r) { snackbar({ message: couldnt('share the schedule', refusalOf(r.error)) }); return false }
      if (r.asked) { snackbar({ message: `Asked an Owner or an Admin to share ${data.share ? plural(r.n, 'change') : 'the schedule'} with ${client}` }); return true }
      const said = data.share ? `Shared ${plural(r.n, 'change')} with ${client}` : `Schedule shared with ${client}`
      if (!r.live) snackbar({ message: `Schedule kept for ${client} — they see it once you invite them`, ...(data.mayChange ? { actionLabel: `Invite ${client}`, onAction: () => setAccess(true) } : {}) })
      else if (data.portal.phone && data.portal.path) {
        const shown = list.filter((m) => m.clientVisible)
        const hand = handoverOf(shown)
        const text = scheduleNewsMessage({ client, studio: data.studioName, url: `${window.location.origin}${data.portal.path}`, handover: hand ? dayLabel(hand.end) : null, n: r.n, first: !data.share })
        snackbar({ message: said, actionLabel: `Tell ${client} on WhatsApp`, onAction: () => { window.open(waLink(data.portal.phone!, text), '_blank', 'noopener') } })
      } else snackbar({ message: said })
      return true
    } catch { snackbar({ message: couldnt('share the schedule') }); return false }
  }
  const closeShare = () => { setShareOpen(false); setShareOnly(null); dropParam('share') }
  /* (simplify S-18) after an approved Done ran its ticks: the one WhatsApp, offered on the snackbar — the emails already went */
  const offerTell = (m: Milestone, told: DoneTold | undefined) => {
    const phone = data.portal.phone
    if (!told || !phone || !(told.shared || told.invoice || told.photos)) return
    const origin = window.location.origin
    const text = tellClientText('done', { client: data.clientName, studio: data.studioName, url: data.portal.live && data.portal.path ? `${origin}${data.portal.path}` : null, milestone: m.title, confirm: told.confirm, photos: told.photos,
      invoice: told.invoice ? { stage: told.invoice.stage, amount: money2(told.invoice.amountMinor), number: told.invoice.number, due: told.invoice.dueAt ? tellDay(told.invoice.dueAt) : null, link: told.invoice.link ? `${origin}${told.invoice.link}` : null } : null })
    snackbar({ key: 'tell-client', message: `Tell ${client} on WhatsApp too?`, actionLabel: 'Open WhatsApp', onAction: () => { window.open(waLink(phone, text), '_blank', 'noopener') } })
  }
  const closeDone = () => setDoneFor(null)
  const create = async (start: string, source: ScheduleSource) => {
    /* (B-37) Nothing yet makes nothing until the first milestone is added: Add milestone opens with works start remembered */
    if (source === 'blank') { setAdding({ after: null, start }); return true }
    const ok = await run('set up the schedule', () => createSchedule(data.projectId, { start, source }), typeof source === 'object' && 'ai' in source ? 'Schedule set up from Maison AI’s draft — every date can be dragged' : 'Schedule set up')
    if (ok) dropParam('draft')   // (gaps build I) Maison AI's draft landed: a reload never opens it again
    return ok
  }
  /* (gaps build, package C — 2) the rebuild, in one sentence with Undo */
  const rebuild = async (start: string, source: ScheduleSource): Promise<boolean> => {
    try {
      const r = await rebuildSchedule(data.projectId, { start, source })
      if ('error' in r) { snackbar({ message: couldnt('rebuild the schedule', refusalOf(r.error)) }); return false }
      snackbar({ key: 'schedule-move', message: r.sentence, actionLabel: 'Undo', onAction: () => { void run('undo the rebuild', () => undoRebuild(r.undo), 'The schedule is back as it was') } })
      return true
    } catch { snackbar({ message: couldnt('rebuild the schedule') }); return false }
  }
  const add = async (title: string): Promise<boolean> => {
    const a = adding
    let id: string | null = null
    const ok = await run('add the milestone', async () => { const r = await addMilestone(data.projectId, { title, afterId: a?.after?.id ?? null, start: a?.start ?? null }); if ('id' in r) id = r.id; return r }, a?.after ? `Milestone added after ${shortTitle(a.after.title)}` : 'Milestone added')
    if (ok) { setAdding(null); if (id) pulse(id) }
    return ok
  }
  const addHelp = !adding ? undefined
    : adding.after ? `It starts the next weekday after ${adding.after.title} ends, and moves with it. Drag it or open it to set its dates.`
      : !list.length ? `It starts on works start, ${dayLabel(dayOfIso(adding.start ?? '') ?? today)}. Open it to set its dates.`
        : 'It starts after the last one ends. Drag it or open it to set its dates.'
  const addDialog = <NameDialog open={!!adding} title="Add milestone" label="Milestone name" initial="" action="Add" onClose={() => setAdding(null)} onSave={add} help={addHelp} />

  /* ── (gaps build, package C) the asks and their answers — each one sentence, each with Undo ── */
  const asks: PanelAsks = {
    askMore: async (m, end, reason) => {
      try {
        const r = await askForMoreTime(m.id, { end, reason })
        if ('error' in r) { snackbar({ message: couldnt('ask for more time', refusalOf(r.error)) }); return false }
        snackbar({ message: r.sentence, actionLabel: 'Undo', onAction: () => { void run('take the ask back', () => withdrawMoreTime(r.id, { undo: true }), 'The ask is taken back') } })
        return true
      } catch { snackbar({ message: couldnt('ask for more time') }); return false }
    },
    withdrawMore: async (x) => run('take the ask back', () => withdrawMoreTime(x.id), 'The ask for more time is taken back'),
    answerMore: async (x, o) => {
      try {
        const r = await answerMoreTime(x.id, o)
        if ('error' in r) { snackbar({ message: couldnt(o.approve ? 'approve more time' : 'decline more time', refusalOf(r.error)) }); return false }
        snackbar({ key: 'schedule-move', message: r.sentence, actionLabel: 'Undo', onAction: () => { void run('undo the answer', () => undoMoreTimeAnswer(r.undo), 'The ask waits again') } })
        return true
      } catch { snackbar({ message: couldnt('answer the ask') }); return false }
    },
    approveDone: async (m) => {
      try {
        const r = await approveMilestoneDone(m.id)
        if ('error' in r) { snackbar({ message: couldnt(`approve ${m.title}`, refusalOf(r.error)) }); return false }
        /* (simplify S-18) the ticks that rode with the ask ran with the approval — one Undo takes them back with it */
        /* (simplify round 2, R2-C) the client's emails those ticks raised wait out this Undo — taken back with it, and its sentence says so (the
           sheet's own words; it replaces the WhatsApp offer, key 'tell-client') */
        snackbar({ key: 'schedule-status', message: r.sentence, actionLabel: 'Undo', onAction: () => {
          void run('undo the approval', async () => {
            const x = await undoMarkDone(r.undo)
            if (!('error' in x)) snackbar({ key: 'tell-client', message: `${shortTitle(m.title)} is back as it was${unsentWords(x.unsent)}` })
            return x
          })
        } })
        offerTell(m, r.told)
        return true
      } catch { snackbar({ message: couldnt(`approve ${m.title}`) }); return false }
    },
    sendBackDone: async (m, note) => {
      try {
        const r = await sendBackMilestoneDone(m.id, { note })
        if ('error' in r) { snackbar({ message: couldnt(`send ${m.title} back`, refusalOf(r.error)) }); return false }
        snackbar({ message: r.sentence, actionLabel: 'Undo', onAction: () => { void run('undo the send-back', () => undoMilestoneStatus(r.undo)) } })
        return true
      } catch { snackbar({ message: couldnt(`send ${m.title} back`) }); return false }
    },
    withdrawDone: async (m) => {
      try {
        const r = await withdrawMilestoneDone(m.id)
        if ('error' in r) { snackbar({ message: couldnt('take the ask back', refusalOf(r.error)) }); return false }
        snackbar({ message: r.sentence, actionLabel: 'Undo', onAction: () => { void run('undo', () => undoMilestoneStatus(r.undo)) } })
        return true
      } catch { snackbar({ message: couldnt('take the ask back') }); return false }
    },
    resolve: async (m, note, askAgainToo) => {
      try {
        const r = await resolveStage(m.id, { note, askAgain: askAgainToo })
        if ('error' in r) { snackbar({ message: couldnt(`mark ${m.title} resolved`, refusalOf(r.error)) }); return false }
        snackbar({ message: r.sentence, actionLabel: 'Undo', onAction: () => { void run('undo', () => undoResolveStage(r.undo), `${shortTitle(m.title)} is back as it was`) } })
        return true
      } catch { snackbar({ message: couldnt(`mark ${m.title} resolved`) }); return false }
    },
  }
  /* (gaps build, package C — 11) a milestone's task edited in place: each change saves at once */
  const sendOutside = (t: ScheduleTask) => {
    const o = t.external
    if (!o?.phone) return
    const text = outsideMessage({ person: o.name, studio: data.studioName, sender: data.team.find((x) => x.id === data.viewer.id)?.name ?? data.studioName, client: data.clientName, address: null, title: t.title, due: t.dueAt != null ? new Date(t.dueAt) : null, description: t.description ?? null })
    window.open(waLink(o.phone, text), '_blank', 'noopener')
    void run('record the send', () => recordTaskSentOutside(t.id), `Sent to ${o.name} on WhatsApp`)
  }
  const taskEdits: PanelTaskEdits = {
    due: async (t, at) => run('set the due date', () => updateTask(t.id, { dueAt: at }), { message: 'Due date updated', key: `task-due-${t.id}` }),
    members: async (t, ids) => run('update the members', () => setTaskAssignees(t.id, ids), 'Members updated'),
    description: async (t, text) => run('save the description', () => updateTask(t.id, { description: text }), 'Task updated'),
    outside: (t) => setOutsideFor(t),
    send: sendOutside,
  }
  const saveOutside = async (t: ScheduleTask, v: { name: string; phone: string; kind: string } | null): Promise<string | null> => {
    try {
      const r = await setTaskOutside(t.id, v)
      if ('error' in r) { if (v) return r.error; snackbar({ message: couldnt('take them off', refusalOf(r.error)) }); return null }
      setOutsideFor(null)
      const words = !v ? `${r.undo.was?.name ?? 'They'} taken off the task` : r.undo.was ? `${v.name} saved on the task` : `${v.name} added to the task`
      snackbar({ message: words, actionLabel: 'Undo', onAction: () => { void run('undo the change', () => undoTaskOutside(r.undo), 'Undone') } })
      return null
    } catch { return 'Couldn’t save — please try again' }
  }
  const recentPeople = useMemo(() => {
    const seenKeys = new Set<string>()
    return data.tasks.flatMap((t) => (t.external && !seenKeys.has(t.external.phone ?? t.external.name) && seenKeys.add(t.external.phone ?? t.external.name) ? [{ name: t.external.name, phone: t.external.phone, kind: (t.external.kind === 'supplier' ? 'supplier' : 'subcontractor') as 'supplier' | 'subcontractor' }] : [])).slice(0, 6)
  }, [data.tasks])
  const outsideDialog = (
    <OutsideDialog open={!!outsideFor} nested value={outsideFor?.external ? { name: outsideFor.external.name, phone: outsideFor.external.phone, kind: outsideFor.external.kind === 'supplier' ? 'supplier' : 'subcontractor' } : null}
                   recent={recentPeople} onClose={() => setOutsideFor(null)} onSave={(v) => (outsideFor ? saveOutside(outsideFor, v) : Promise.resolve(null))}
                   onRemove={outsideFor?.external ? () => { const t = outsideFor; void saveOutside(t, null) } : undefined} />
  )

  /* ── a project with no milestones starts here ── */
  if (!list.length) {
    return (
      <div className={styles.tab} data-testid="project-schedule">
        <StartSchedule key={draftAi ? 'ai' : 'start'} data={data} onCreate={create} onManageTemplates={() => router.push(withFrom('/company/templates/schedules', here()))} draftAi={draftAi} />
        {/* (S45B) contractors on dates of their own, before the project has a schedule */}
        {crew.total ? (
          <div className={styles.nudge} role="status" data-testid="schedule-crew-band">
            <Icon name="handyman" size={20} weight={300} />
            <span className={styles.nudgeText}>{`${crew.total} ${crew.total === 1 ? 'contractor is' : 'contractors are'} on this project, on dates of their own.`}</span>
            <span className={styles.askActions}><Button size="sm" variant="secondary" appearance="outlined" onPress={crew.open} data-testid="schedule-crew">Open</Button></span>
          </div>
        ) : null}
        {crew.node}
        {addDialog}
      </div>
    )
  }

  const sum = summaryOf(list, snapshot, today, { waitingWho })
  const done = list.filter((m) => m.status === 'done').length
  const allDone = done === list.length
  const named = namedHandover(h)
  const toGo = h ? h.end - today : null
  const pay = data.payments ? nextPayment(list, data.payments, today) : null
  const payWords = pay ? nextPaymentWords(pay) : data.payments && paidInFull(list, data.payments) ? 'Paid in full' : '--'
  const shareDay = data.share ? dayOf(new Date(data.share.at)) : null
  /* (routed from C) the client reads the LAST SHARED plan — the line says which handover that is while the live one differs */
  const sharedH = snapshot?.handover ? dayOfIso(snapshot.handover) : null
  const sharedHandover = sharedH !== null && h && sharedH !== h.end ? `, handover ${dayLabel(sharedH)}` : ''
  /* (B-01) a client with no portal sees nothing yet; (B-54) the count of what to share only for those who may share it */
  const sees = !data.portal.live
    ? (data.portal.withdrawn ? `${client}’s portal access is withdrawn — they see no schedule.` : `${client} has no portal yet — invite them to see the schedule.`)
    : data.share && shareDay !== null
      ? (changes.length ? `${client} still sees the schedule shared on ${dayMonth(shareDay)}${sharedHandover}.` : `${client} sees this schedule. Last shared ${dayMonth(shareDay)}.`)
      : `${client} hasn’t seen the schedule yet.`
  const seesCount = data.mayChange && data.share && changes.length ? plural(changes.length, 'change') : null
  const seesButton = (
    <button type="button" className={styles.sees} aria-pressed={pane} onClick={() => setPane((p) => !p)} data-testid="client-sees">
      <Icon name="visibility" size={16} weight={300} />
      <span>{sees}{seesCount ? <> <span className={styles.seesCount}>{seesCount} to share.</span></> : null}</span>
    </button>
  )
  /* (parity map, SC-094 — 1.0's "+3d" VO chip) the days approved variation orders add; while one waits for an answer, it opens its dialog —
     (the calm UI build 2026-10-27, 3-23 · T-06) said in the summary's line as words, not a capitals tag in the toolbar */
  const voChip = voDays && voDays.total > 0 ? (
    <Tooltip label={voDays.vos.map((v) => `${v.number} · +${plural(v.days, 'day')}${v.answer === 'moved' ? ' · moved' : v.answer === 'asked' ? ' · asked for' : ''}`).join('; ')}>
      {voDays.open.length && data.mayChange
        ? <Button appearance="text" onPress={() => setVoFor(voDays.open[0]!.id)} data-testid="vo-days">{`+${plural(voDays.total, 'day')} from changes`}</Button>
        : <span className={styles.voWords} data-testid="vo-days" tabIndex={0}>{`+${plural(voDays.total, 'day')} from changes`}</span>}
    </Tooltip>
  ) : null
  const shareButton = shareLabel ? (
    <Button variant="primary" appearance="outlined" size={phone ? 'sm' : undefined} onPress={() => setShareOpen(true)} data-testid="schedule-share">{shareLabel}</Button>
  ) : null
  const scheduleMenu = (
    <span ref={kebabRef}>
      <Tooltip label="More for the schedule" disabled={kebab}><IconButton icon="more_vert" label="More for the schedule" aria-haspopup="menu" aria-expanded={kebab} onClick={() => setKebab((k) => !k)} data-testid="schedule-kebab" /></Tooltip>
      <PortalMenu open={kebab} anchor={kebabRef} onClose={() => setKebab(false)} align="right" width={MENU_WIDTH.wide} role="menu" sheetTitle="Schedule">
        {/* (gaps build, package C — 2) a new list over this one — from a quote, a template or an uploaded quote; what keeps its name stays */}
        {data.mayChange ? <DropdownItem onSelect={() => { setKebab(false); setRebuilding(true) }} help="From a quote, a template or an uploaded quote — what keeps its name stays">Rebuild the schedule…</DropdownItem> : null}
        {data.mayChange && (data.quotes ?? []).some((q) => q.lines > 0) ? <DropdownItem onSelect={() => { setKebab(false); const next = new URLSearchParams(params); next.set('draft', 'ai'); setSeenDraft(false); router.replace(`${pathname}?${next}`, { scroll: false }) }} help="From the quote and the scope — reviewed before anything changes">Draft with Maison AI…</DropdownItem> : null}   {/* (gaps build I) */}
        {data.mayChange ? <DropdownDivider /> : null}
        {/* (B-27) saving it as a template only reads it — offered to the team, Owners and Admins after completion too (REG-1022) */}
        {/* (S45B) on a phone the toolbar's Contractors lives here */}
        {phone && crew.has ? <DropdownItem meta={crew.count ? String(crew.count) : undefined} onSelect={() => { setKebab(false); crew.open() }} help="Who works on site, and when">Contractors</DropdownItem> : null}
        {data.mayTemplate ? <DropdownItem onSelect={() => { setKebab(false); setSaving(true) }}>Save as a template</DropdownItem> : null}
        <DropdownItem onSelect={() => { setKebab(false); router.push(withFrom('/company/templates/schedules', here())) }}>Manage schedule templates</DropdownItem>
      </PortalMenu>
    </span>
  )
  const clientPane = (
    <div className={styles.client}>
      {/* (simplify S-25 (1)) a stage Blocked live reads Paused, as the client's page says */}
      {data.share ? <ClientSchedule studio={data.studioName} rows={data.share.snapshot.rows.map((r) => withLiveAnswer(r, list.find((x) => x.id === r.id)))} news={data.share.note ? { head: `Updated ${dayMonth(dayOf(new Date(data.share.at)))}`, note: data.share.note } : null}
                                    paused={new Set(data.share.snapshot.rows.filter((r) => { const m = list.find((x) => x.id === r.id); return isPausedStage(r, m ? { status: m.status, deleted: false } : null) }).map((r) => r.id))}
                                    pausedLines={Object.fromEntries(list.filter((m) => m.status === 'blocked').flatMap((m) => { const t = pausedLine({ note: m.clientNote?.trim() || null, resumeOn: m.resumeOn != null ? dateOfDay(m.resumeOn).getTime() : null }, data.now); return t ? [[m.id, t]] : [] }))} />
        : <ClientSchedule studio={data.studioName} rows={[]} empty={`Nothing yet — ${client} sees the schedule once you share it.`} />}
    </div>
  )
  /* (B-58) the canvas's day; the diamonds' source in this project's own words */
  const legend = `The line marks today, ${dayLabel(today)}.${zoom === 'weeks' ? ' Shaded columns are weekends.' : ''}${data.payments ? ` A diamond is a payment from ${data.start.quote ? 'the quote’s schedule' : 'the payment schedule'}.` : ''}${was.size ? ' A dashed outline is where the client last saw it.' : ''}${list.some((m) => m.followsId || m.after?.length) ? ' A line joins a milestone to what it waits on — red when it started before that one allows.' : ''}`

  /* (gaps build, package C — 10) the prompt after a start or a Done: post an update (the Updates composer, the milestone picked), add tasks, send its invoice */
  const nudgeM = nudge ? list.find((m) => m.id === nudge.id) ?? null : null
  const readyInvoice = nudgeM ? (data.invoices?.[nudgeM.id] ?? []).find((i) => i.state === 'ready') ?? null : null
  const updateHref = (m: Milestone) => withFrom(`/projects/${data.projectId}/updates?new=1&milestone=${encodeURIComponent(m.id)}`, here())
  /* (gaps build, package C — 5 · 8 → the calm UI build 2026-10-27, 3-01 · T-04) what waits on an Owner or an Admin is said on its own row ("Done —
     waiting for approval" · "More time asked, to …") and answered in its panel (Approve · Decline), and it is the Overview's Needs your attention row
     and the header's button — the band that said it a fourth time above the list is gone */

  const toolbarStart = (
    <div className={styles.toolStart}>
      <SegmentedButton aria-label="Scale" selectedKeys={[zoom]} onSelectionChange={(keys) => { const k = [...keys][0]; if (k === 'weeks' || k === 'months') setZoom(k) }}>
        <SegmentedButtonItem id="weeks">Weeks</SegmentedButtonItem>
        <SegmentedButtonItem id="months">Months</SegmentedButtonItem>
      </SegmentedButton>
      <Button appearance="text" onPress={() => setTodayTick((t) => t + 1)} data-testid="schedule-today">Today</Button>
      {/* (gaps build, package C — 13) the list to the window's edges; Esc or the same button brings it back */}
      <Tooltip label={full ? 'Leave full screen' : 'Full screen'}>
        <IconButton icon={full ? 'close_fullscreen' : 'fullscreen'} label={full ? 'Leave full screen' : 'Full screen'} onClick={() => setFull((f) => !f)} data-testid="schedule-full" />
      </Tooltip>
      {/* (the calm UI build 2026-10-27, 3-23 · T-05) how to read the chart — today's line, weekends, the diamonds, the joining lines — behind a "?"
          on the chart's head, no longer a paragraph under it on every visit */}
      <Tooltip label={legend}>
        <IconButton icon="help" label="How to read the schedule" onClick={() => {}} data-testid="schedule-legend" />
      </Tooltip>
    </div>
  )
  const timeline = (
    <ScheduleTimeline list={list} zoom={zoom} today={today} was={was} payments={data.payments} decider={data.decider} waitingWho={waitingWho} client={clientLayer} mayChange={data.mayChange}
                      fresh={fresh} todayTick={todayTick} onOpen={openRow} onMove={(m, to) => { void moved(m, to) }} onAction={act} moreTo={moreTo} onReorderTo={(m, i) => { void reorderTo(m, i) }}
                      crewLine={crew.has ? crew.lineFor : undefined} />
  )

  return (
    <div className={styles.tab} data-testid="project-schedule" data-docked={phone && data.mayChange ? '' : undefined}>
      <section className={styles.summary} aria-label="Where the job stands" data-testid="schedule-summary">
        <div className={styles.summaryInner}>
        <div className={styles.summaryText}>
          {/* (the calm UI build 2026-10-27, 3-23) on a desk the paragraph is the headline's own second sentence (quiet, never red), not a block of its own */}
          <p className={styles.headline} data-alert={list.some((m) => m.status !== 'done' && m.end < today) || undefined}>
            <span className={styles.headlineLead}>{sum.headline}</span>{!phone && sum.line ? <span className={styles.headlineMore}>{` ${sum.line}`}</span> : null}
          </p>
          {phone ? <p className={styles.subline}>{allDone ? `Every milestone is done · ${done} of ${list.length}` : `${toGo !== null && toGo >= 0 ? `${plural(toGo, 'day')} to go · ` : ''}${done} of ${list.length} done`}</p> : null}
          {/* (the calm UI build 2026-10-27, 3-23) the days variation orders add and who sees the schedule — one line in the summary, out of the toolbar */}
          {phone ? null : <p className={styles.summaryMeta} data-testid="schedule-summary-meta">{voChip}{seesButton}</p>}
        </div>
        {phone ? null : (
          <dl className={styles.stats}>
            <div className={styles.stat}><dt>Done</dt><dd>{done} of {list.length}</dd></div>
            {/* (B-29) a finished job says when it was handed over, not how long ago */}
            {allDone && h
              ? <div className={styles.stat}><dt>{named ? 'Handed over' : 'Finished'}</dt><dd>{dayMonth(h.end)}</dd></div>
              : <div className={styles.stat}><dt>{named ? 'To handover' : 'To the finish'}</dt><dd>{toGo === null ? '--' : toGo >= 0 ? plural(toGo, 'day') : `${plural(-toGo, 'day')} past`}</dd></div>}
            {data.payments ? <div className={styles.stat}><dt>Next payment</dt><dd data-alert={pay && (pay.overdue || pay.passed) ? '' : undefined} data-testid="next-payment">{payWords}</dd></div> : null}
          </dl>
        )}
        </div>
      </section>

      {/* (gaps build, package C — 10) the start's and the end's prompt */}
      {nudge && nudgeM ? (
        <div className={styles.nudge} role="status" data-testid="schedule-nudge" data-kind={nudge.kind}>
          <Icon name={nudge.kind === 'done' ? 'check_circle' : 'flag'} size={20} weight={300} />
          <span className={styles.nudgeText}>{nudge.kind === 'done' ? `${shortTitle(nudgeM.title)} is done — tell ${client}${readyInvoice ? ', and send its invoice' : ''}?` : `${shortTitle(nudgeM.title)} has started — tell ${client}, or line up its tasks.`}</span>
          <span className={styles.askActions}>
            <NextLink href={updateHref(nudgeM)} className={styles.textLink} data-testid="nudge-update">Post an update</NextLink>
            {nudge.kind === 'started' ? <button type="button" className={styles.textLink} onClick={() => { setAddTaskFor(nudgeM.id); setOpenId(nudgeM.id); setNudge(null) }} data-testid="nudge-tasks">Add tasks</button> : null}
            {nudge.kind === 'done' && readyInvoice ? <NextLink href={withFrom(`/projects/${data.projectId}/money?open=${encodeURIComponent(readyInvoice.id)}`, here())} className={styles.textLink} data-testid="nudge-invoice">{`Send the ${readyInvoice.stage} invoice`}</NextLink> : null}
            <Tooltip label="Dismiss"><IconButton icon="close" label="Dismiss" size={24} variant="bare" iconSize={20} onClick={() => setNudge(null)} /></Tooltip>
          </span>
        </div>
      ) : null}
      {/* (gaps build, package C — 8) a share asked and who it waits on — (the calm UI build 2026-10-27, 3-01) a milestone's ask lives on its row */}
      {shareAsk && data.mayChange ? (
        <div className={styles.nudge} role="status" data-testid="share-ask-band">
          <Icon name="share" size={20} weight={300} />
          <span className={styles.nudgeText}>{answers ? `${shareAsk.byName.split(' ')[0]} asked to share ${plural(shareAsk.milestoneIds.length, 'change')} with ${client}${shareAsk.note ? `: “${shareAsk.note}”` : '.'}` : shareAsk.by === data.viewer.id ? `Your ${plural(shareAsk.milestoneIds.length, 'change')} wait for an Owner or an Admin to share them with ${client}.` : `${shareAsk.byName.split(' ')[0]}’s ${plural(shareAsk.milestoneIds.length, 'change')} wait for an Owner or an Admin.`}</span>
          <span className={styles.askActions}>
            {answers ? <Button size="sm" onPress={() => setShareOpen(true)} data-testid="share-ask-review">Review and share</Button>
              : shareAsk.by === data.viewer.id ? <Button size="sm" appearance="text" onPress={() => { void (async () => { const r = await withdrawShareAsk(shareAsk.id); if ('error' in r) snackbar({ message: couldnt('take the ask back', refusalOf(r.error)) }); else snackbar({ message: 'The ask to share is taken back', actionLabel: 'Undo', onAction: () => { void run('undo', () => reopenShareAsk(r.undo)) } }) })() }} data-testid="share-ask-withdraw">Take it back</Button> : null}
          </span>
        </div>
      ) : null}

      {/* (B-41) on a phone: who sees it and the schedule's ⋮, under the summary */}
      {phone ? <div className={styles.phoneBar}>{seesButton}<span className={styles.toolActs}>{shareButton}{scheduleMenu}</span></div> : (
        <div className={styles.toolbar} data-rows={asRows || undefined}>
          {asRows ? null : toolbarStart}
          <div className={styles.toolEnd}>
            {/* (S45B · H-UHD-2) who works on site — shown once the studio keeps contractors (or the project has some) */}
            {crew.has ? <Button appearance="text" iconStart={<Icon name="handyman" size={20} />} onPress={crew.open} data-testid="schedule-crew">{crew.count ? `Contractors · ${crew.count}` : 'Contractors'}</Button> : null}
            {shareButton}
            <span className={styles.toolActs}>
              {/* (the calm UI build 2026-10-27, 3-12 · T-13) one create grammar on every tab: "New milestone" (was Add milestone) */}
              {data.mayChange ? <Button variant="primary" appearance="outlined" iconStart={<Icon name="add" size={20} />} onPress={() => setAdding({ after: null })} data-testid="add-milestone">New milestone</Button> : null}
              {scheduleMenu}
            </span>
          </div>
        </div>
      )}

      <div className={styles.body} data-pane={pane && wide && !phone ? '' : undefined}>
        {asRows
          ? <SchedulePhone list={list} today={today} was={was} payments={data.payments} waitingWho={waitingWho} client={clientLayer} onOpen={openRow} moreTo={moreTo} crewLine={crew.has ? crew.lineFor : undefined}
                           onDone={data.mayChange ? (m) => setDoneFor(m.id) : undefined} />
          : full ? null : timeline}
        {pane && wide && !phone ? (
          <aside className={styles.pane} aria-label={`What ${client} sees`} data-testid="client-pane">
            <div className={styles.paneHead}>
              <span className={styles.paneText}><span className={styles.paneTitle}>What {client} sees</span><span className={styles.paneSub}>{data.share && shareDay !== null ? `Shared ${dayMonth(shareDay)}${sharedHandover}` : 'Not shared yet'}</span></span>
              <Tooltip label="Close"><IconButton icon="close" label={`Close what ${client} sees`} size={24} variant="bare" iconSize={24} iconFamily="outlined" onClick={() => setPane(false)} /></Tooltip>
            </div>
            <div className={styles.paneBody}>{clientPane}</div>
            <div className={styles.paneFoot}><Icon name="info" size={16} weight={300} /> {data.portal.live ? `Changes reach ${client} only when you share them.` : `${client} sees this once invited to the portal.`}</div>
          </aside>
        ) : null}
      </div>
      {/* (the calm UI build 2026-10-27, 3-23) the legend is the "?" on the chart head (toolbarStart) */}

      {/* (gaps build, package C — 13) full screen: the scale, Today and the list to the window's edges, above the page and under its menus and panel */}
      {full && !asRows ? (
        <div ref={fullRef} className={styles.full} data-om-surface="" role="region" aria-label={`Schedule — full screen`} data-testid="schedule-full-view">
          <div className={styles.fullBar}>
            <span className={styles.fullTitle}>{`Schedule · ${data.clientName}`}</span>
            {toolbarStart}
          </div>
          {timeline}
        </div>
      ) : null}

      {phone && data.mayChange ? <div className={styles.dock}><Button variant="primary" appearance="outlined" onPress={() => setAdding({ after: null })} data-testid="add-milestone">New milestone</Button></div> : null}

      <Drawer open={pane && (!wide || phone)} title={`What ${client} sees`} onClose={() => setPane(false)}>{clientPane}</Drawer>
      <MilestonePanel milestone={open} list={list} payments={data.payments} tasks={data.tasks} team={data.team} client={client} decider={data.decider} mayChange={data.mayChange} today={today} readOnlyWhy={completedBlock(data.stage, 'schedule')}
                      onClose={() => guard(closeOpen)} onSave={save} onDelete={(m) => setDeleting(m)} onAddTask={addTask} onToggleTask={toggleTask}
                      shared={open ? sharedOf(open) : null} onAskAgain={askAgain} dirtyRef={panelDirty}
                      onPlace={(m, a) => guard(() => { closeOpen(); if (a === 'add-after') setAdding({ after: m }); else void reorder(m, a === 'up' ? -1 : 1) })}
                      projectId={data.projectId} answers={answers} viewerId={data.viewer.id} extension={open ? extOf(open) : null} invoices={open ? data.invoices?.[open.id] ?? [] : []}
                      history={open ? data.shareHistory?.[open.id] ?? [] : []} pending={!!open && changes.some((c) => c.id === open.id)} asks={asks} taskEdits={taskEdits} startAdding={!!open && addTaskFor === open.id}
                      onShareOne={(m) => guard(() => { closeOpen(); setShareOnly([m.id]); setShareOpen(true) })}
                      onMarkDone={(m) => setDoneFor(m.id)} shareWait={open ? data.shareWaits?.[open.id] ?? null : null}
                      onSuggest={data.mayChange ? (m) => setSuggestFor(m.id) : undefined}
                      crew={crew.has ? crew.section : undefined} />
      {/* (parity map, SC-056 · TD-023) the milestone's suggested tasks, over its panel */}
      <SuggestTasksDialog open={!!suggestM} title={suggestM?.title ?? ''} suggestions={suggestions} nested={!!open} onClose={() => setSuggestFor(null)} onAdd={addSuggested} />
      {/* (parity map, SC-094) an approved variation order's days */}
      <VoDaysDialog open={!!voAsk && data.mayChange} vo={voAsk} list={list} today={today} role={data.viewer.role} onClose={() => setVoFor(null)} onMove={moveForVo} onNotNow={notNowVo} />
      <ShareDialog open={shareOpen} onClose={closeShare} onShare={share} onInvite={data.mayChange ? () => setAccess(true) : undefined} client={client} studio={data.studioName}
                   milestones={list} changes={changes} last={snapshot} sharedDay={shareDay} today={today} portal={data.portal}
                   approval={data.rules?.shareApproval && !answers ? 'ask' : 'now'} ask={answers ? shareAsk : null} only={shareOnly}
                   onSendBack={shareAsk ? async (note) => { const r = await sendBackShareAsk(shareAsk.id, { note }); if ('error' in r) { snackbar({ message: couldnt('send the changes back', refusalOf(r.error)) }); return false } snackbar({ message: `Sent back to ${shareAsk.byName.split(' ')[0]} with your note`, actionLabel: 'Undo', onAction: () => { void run('undo', () => reopenShareAsk(r.undo)) } }); return true } : undefined} />
      <RebuildDialog open={rebuilding} onClose={() => { setRebuilding(false); dropParam('draft') }} onRebuild={rebuild} list={list} quotes={data.quotes ?? []} templates={data.start.templates} signedId={data.start.quote?.id ?? null} today={today}
                     ai={{ rooms: data.scope ?? [], propertyType: data.kind?.propertyType ?? null, projectType: data.kind?.projectType ?? null, client: data.clientFirst }} draftAi={draftAi} />   {/* (gaps build I) */}
      <ClientAccessPanel open={access} leadId={data.leadId} project onClose={() => setAccess(false)} />
      {outsideDialog}
      {addDialog}
      {crew.node}
      <NameDialog open={!!renaming} title="Rename milestone" label="Milestone name" initial={renaming?.title ?? ''} action="Rename" onClose={() => setRenaming(null)}
                  onSave={async (name) => { const m = renaming!; const ok = await run('rename the milestone', () => renameMilestone(m.id, name), 'Milestone renamed'); if (ok) setRenaming(null); return ok }} />
      <NameDialog open={saving} title="Save as a template" label="Template name" initial={`${data.clientName}’s schedule`} action="Save" onClose={() => setSaving(false)}
                  onSave={async (name) => {
                    let id: string | null = null
                    const ok = await run('save the template', async () => { const r = await saveScheduleAsTemplate(data.projectId, name); if ('id' in r) id = r.id; return r })
                    if (ok) { setSaving(false); snackbar({ message: 'Saved to Company › Templates › Project schedules', actionLabel: 'Open', onAction: () => { if (id) router.push(withFrom(`/templates/schedules/${id}`, here())) } }) }
                    return ok
                  }} />
      <ConfirmDialog open={!!deleting} nested={!!open} title={`Delete ${deleting?.title ?? 'this milestone'}?`} confirmLabel="Delete" tone="danger"
                     message={`Its tasks stay on the project. The milestones that moved with it keep their dates.${deleting?.paymentRef ? ' Its payment is no longer tied to a milestone.' : ''}`}
                     onCancel={() => setDeleting(null)} onConfirm={() => { if (deleting) void remove(deleting) }} />
      <ConfirmDialog open={!!discard} nested title="Discard your changes?" message={`Your changes to ${open?.title ?? 'this milestone'} aren’t saved.`} confirmLabel="Discard" cancelLabel="Keep editing" tone="danger"
                     onCancel={() => setDiscard(null)} onConfirm={() => { const go = discard; setDiscard(null); panelDirty.current = false; go?.() }} />
      {/* (simplify S-18) every Done — the row, its ⋮, the panel's Status, a phone row's Done, ?done=<id> — opens the one sheet; over the panel
          when the panel is open */}
      <MarkDoneSheet milestoneId={doneFor} open={!!doneFor} nested={!!open} onClose={closeDone} onInvite={data.mayChange ? () => setAccess(true) : undefined}
                     onDone={() => { const id = doneFor; setNudge(null); if (id) pulse(id) }} />
      {/* (simplify Q-18) a Designer's drag past a running milestone's end: the ask for more time, its day filled in; the bar stayed put */}
      <AskDialog open={!!moreFor} title={moreFor ? `More time on ${moreFor.m.title}` : 'More time'} action="Ask for it" onClose={() => setMoreFor(null)} testId="drag-more-dialog"
                 lede={moreFor ? `It ends ${dayLabel(moreFor.m.end)}. An Owner or an Admin approves the new day — the milestones that move with it follow.` : ''}
                 date={moreFor ? { label: 'New last day', min: dateOfDay(moreFor.m.end + 1), today: dateOfDay(today), initial: dateOfDay(moreFor.end) } : undefined}
                 note={{ label: 'Why it needs more time', required: true, max: 300 }}
                 onSubmit={async (v) => { const f = moreFor; const d = v.date ? parseInputDate(v.date) : null; return f && d ? asks.askMore(f.m, `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`, v.note) : false }} />
    </div>
  )
}

/** A one-field form dialog (rename · add · save as a template) — the house Dialog, its foot's two buttons; it closes only once the save lands. */
function NameDialog({ open, title, label, initial, action, help, onClose, onSave }: { open: boolean; title: string; label: string; initial: string; action: string; help?: string; onClose: () => void; onSave: (name: string) => Promise<boolean> }) {
  const [value, setValue] = useState(initial)
  const [seen, setSeen] = useState({ open, initial })
  if (seen.open !== open || seen.initial !== initial) { setSeen({ open, initial }); if (open) setValue(initial) }
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const submit = async () => {
    const v = value.trim()
    if (!v) { setError(`Enter the ${label.toLowerCase()}`); return }
    setError(null); setBusy(true)
    await onSave(v)
    setBusy(false)
  }
  return (
    <Dialog open={open} onClose={onClose} title={title} width={400} size="form" closeOnScrim={false}
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button><Button onPress={() => { void submit() }} isDisabled={busy} data-testid="name-dialog-save">{action}</Button></>}>
      <form onSubmit={(e) => { e.preventDefault(); void submit() }}>
        <TextField label={label} value={value} onChange={(v) => { setValue(v); if (error) setError(null) }} maxLength={80} autoFocus error={error ?? undefined} helper={help} />
      </form>
    </Dialog>
  )
}

/** (REG-1051) The pane is what the client sees: the shared copy, with the asks and answers the portal lays over it live (the portal's
    `portalStages` — a stage the client confirmed after the share reads Confirmed there, so it does here). */
function withLiveAnswer(r: ClientRow, m: Milestone | undefined): ClientRow {
  if (!m) return r
  return { ...r, confirm: m.confirm.answer ?? (m.confirm.askedAt !== null && m.status === 'done' ? 'asked' : null) }
}
