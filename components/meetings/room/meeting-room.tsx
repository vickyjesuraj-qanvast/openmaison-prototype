'use client'

import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useBusyWhile } from '@/components/credits/upgrade-offers'   // (pending modules S41b-4)
import { Button, Checkbox } from '@/components/ds'
import { PageReveal } from '@/components/shell/page-reveal'
import { PageHeaderL2 } from '@/components/shell/page-header-l2'
import { Card } from '@/components/leads/detail/card'
import { Row } from '@/components/projects/overview/row'
import { MetaChip } from '@/components/om/meta-chip'
import { Chips } from '@/components/om/chips'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { TextField } from '@/components/om/text-field'
import { ConfirmDialog } from '@/components/om/confirm-dialog'
import { PortalMenu } from '@/components/om/portal-menu'
import { DropdownItem, MENU_WIDTH } from '@/components/leads/dropdown'
import { useSnackbar } from '@/components/om/snackbar'
import { useRun, refusalOf } from '@/components/leads/tasks/use-run'
import { AttachFilesModal } from '@/components/leads/tasks/attach-files-modal'
import { uploadPicked } from '@/components/leads/files/upload-picture'
import { SendContractDialog } from '@/components/contracts/editor/dialogs'
import { openCreditBlock, openPlans, usePlanLock } from '@/components/credits/credits-client'
import { ProTag } from '@/components/credits/pro-tag'
import { useMaisonAi, type MaisonSuggestion } from '@/lib/maison-ai'
import { fetchAttachLibrary } from '@/app/leads/files-actions'
import { openLeadDesign } from '@/app/visualizer/actions'
import { removeMessage, sendInConversation } from '@/app/projects/messages-actions'   // (pending modules S26) Share with the team
import { MESSAGE_MAX, conversationKey } from '@/lib/projects/messages-model'
import { copyText } from '@/lib/clipboard'
import { withFrom } from '@/lib/nav'
import { displayDate, displayDue, displayTime, formatInputDateTime, titleCaseName } from '@/lib/format'
import { meetingStepHref, meetingStepLabel, meetingStepWords } from '@/lib/meetings/next-step'   // (S42G) the stage the studio's rule allows
import type { LeadFile } from '@/lib/db/schema'
import {
  AIMS, BLOCK_MS, CHECK_IN_GRACE_MS, DEFAULT_LENGTH_MIN, DISCLOSURE, LISTENING_STAND_IN, WHERE, aimLabel, clientMeetingPath, consentLabel, firstOf, heldMinutes, tierOf, type AimKey, type MeetingState, type WhereKind,
} from '@/lib/meetings/model'
import { readMeeting, type Tip } from '@/lib/meetings/engine'
import { matchPortfolio } from '@/lib/meetings/portfolio'
import { inviteMessage, notesMessage, whenWords } from '@/lib/meetings/words'
import type { MeetingRoomData } from '@/lib/meetings/queries'
import { kindLabel } from '@/lib/meetings/objections'
import {
  deleteMeeting, draftQuoteFromMeeting, editBrief, endMeeting, inviteClient, meetingLink, pauseCopilot, remakeBrief, restoreMeeting, saveBriefToLead, saveMeetingNotes,
  shareMeeting, startMeeting, stopEarly, stopSharingMeeting, takeMeetingBlock, undoSaveBrief, writeUpMeeting,
} from '@/app/meetings/actions'
import { ChecklistCard, EstimateCard, HeardRows, MoodBoardDialog, ObjectionRows, PortfolioDialog, ScoreCard, StyleBoard, TipsCard } from './room-parts'
import { EditTextDialog, SaveToLeadDialog, type SavePlan } from './save-dialog'
import { MeetingRoomGhost, dueNow, useRememberMeetingShape } from './meeting-room-ghost'
import { WriteUpDialog as WriteUpDialogLazy } from '../write-up-dialog'
import styles from './room.module.css'

type PhoneView = 'notes' | 'tips' | 'checklist' | 'estimate' | 'more'

/**
 * (pending modules S23 — 1.0's Meeting Co-Pilot: the launcher, the live session and the brief; his "build all of them" 2026-10-11) A meeting's
 * one page, in three moments on the house frame (the L2 header, the lead Overview's two stacks of cards, the LEAD STAGES rows):
 *  · Before — what the studio knows and still has to find out (1.0's prep card), what the meeting is for and where, and the consent the
 *    client is given (1.0's Recording Reminder), with the co-pilot's price said before Start (the credits audit's Q-45 · E-22).
 *  · During — what is being said (typed, or a transcript pasted: listening isn't connected in the prototype, and the page says so), and the
 *    co-pilot reading it by rule: tips with the studio's own answers, the checklist ticking itself, the deal score, the rough estimate and the
 *    add-ons; mood boards, renders, past projects, their quote and the photos as tools. Each 10 minutes asks before the next (25 AI credits).
 *  · After — the brief: summary, what was heard, the next steps, the concerns with their answers, the follow-up message; Save to the lead
 *    (each change confirmed, with Undo), Share the notes with the client, Make a draft quote, and — where the lead hasn't reached Met — the
 *    stage the studio's rule allows (S42G: Met, or Contacted for a New lead under one stage at a time; lib/meetings/next-step.ts).
 * One filled button in the header for each moment. *(invented copy: every heading and line not 1.0's)*
 */
export function MeetingRoom({ data, from }: { data: MeetingRoomData; from?: string }) {
  const m = data.meeting
  useRememberMeetingShape(m.id, m.status, { due: dueNow(m, data.now), invited: !!m.invitedAt })   // the next load's ghost draws this moment (REG-708)
  const router = useRouter()
  const snackbar = useSnackbar()
  const { run, fail, refresh } = useRun()
  const here = () => `${window.location.pathname}${window.location.search}`
  const first = firstOf(titleCaseName(data.lead.name))
  const studio = data.studioName || 'Your studio'
  const live = m.status === 'live', held = m.status === 'held', planned = m.status === 'planned', cancelled = m.status === 'cancelled'
  useBusyWhile(live)   // (pending modules S41b-4 — 1.0's `useBusyWhile(!sessionEnded)`) no upgrade offer while a meeting is live

  /* ── the words and the co-pilot's state, saved as they change ── */
  const [notes, setNotes] = useState(m.notes)
  const [state, setState] = useState<MeetingState>(m.state)
  const [fileIds, setFileIds] = useState<string[]>(m.fileIds)
  const [blocks, setBlocks] = useState(m.blocks)
  const [paused, setPaused] = useState(m.pausedAt !== null)
  /* the record moved under the page (Start took block 1, another tab kept the co-pilot on, a refresh after End): take its blocks and pause —
     render-phase adjust, keyed on what the server last said */
  const [server, setServer] = useState({ blocks: m.blocks, pausedAt: m.pausedAt, status: m.status })
  if (server.blocks !== m.blocks || server.pausedAt !== m.pausedAt || server.status !== m.status) {
    setServer({ blocks: m.blocks, pausedAt: m.pausedAt, status: m.status })
    setBlocks(m.blocks); setPaused(m.pausedAt !== null)
  }
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [clock, setClock] = useState(data.now)
  const [view, setView] = useState<PhoneView>('notes')
  useEffect(() => {
    if (!live) return
    const t = setInterval(() => setClock(Date.now()), 1000)
    return () => clearInterval(t)
  }, [live])
  const said = useDeferredValue(notes)
  const reading = useMemo(() => readMeeting({
    notes: said, aim: m.aim, client: data.lead.name, members: data.team.map((t) => t.name), own: data.playbook.own, state, answers: data.playbook.answers,
    competitors: data.playbook.competitors.map((c) => c.name), weights: data.copilot.weights, features: data.copilot.features,
  }), [said, m.aim, data, state])
  const f = data.copilot.features

  /* the first time a tip shows, a tick lands, the tier moves — kept for the timeline and Reports (render-phase adjust, on the page's clock) */
  if (live && !paused) {
    const unseen = reading.tips.filter((t) => !(t.key in state.seen))
    const fresh = reading.checklist.filter((c) => c.ticked && !(c.id in state.tickedAt))
    const last = state.scores[state.scores.length - 1]
    const moved = reading.lines.length > 0 && (!last || tierOf(last.score) !== reading.tier)
    if (unseen.length || fresh.length || moved) setState((s) => ({
      ...s,
      seen: unseen.length ? { ...s.seen, ...Object.fromEntries(unseen.map((t) => [t.key, clock])) } : s.seen,
      tickedAt: fresh.length ? { ...s.tickedAt, ...Object.fromEntries(fresh.map((c) => [c.id, clock])) } : s.tickedAt,
      scores: moved ? [...s.scores, { at: clock, score: reading.score }].slice(-200) : s.scores,
    }))
  }

  const editable = (live || held) && data.mayChange
  const dirty = useRef(false)
  const latest = useRef({ notes, state, fileIds })
  useEffect(() => { latest.current = { notes, state, fileIds } })
  useEffect(() => {
    if (!editable || !dirty.current) return
    const t = setTimeout(() => {
      const snap = latest.current
      void saveMeetingNotes(m.id, { notes: snap.notes, state: snap.state, fileIds: snap.fileIds }).then((r) => { if ('ok' in r) { dirty.current = false; setSavedAt(r.at) } else snackbar({ message: `Couldn’t save the notes — ${refusalOf(r.error) ?? 'please try again'}` }) }, () => snackbar({ message: 'Couldn’t save the notes — please try again' }))
    }, 1200)
    return () => clearTimeout(t)
  }, [notes, state, fileIds, editable, m.id, snackbar])
  /* leaving the page mid-meeting: the words go with a beacon (the AI Visualizer's leaving save, REG-685) */
  useEffect(() => {
    if (!editable) return
    const flush = () => { if (!dirty.current) return; const snap = latest.current; navigator.sendBeacon(`/meetings/${m.id}/state`, new Blob([JSON.stringify(snap)], { type: 'application/json' })) }
    window.addEventListener('pagehide', flush)
    return () => window.removeEventListener('pagehide', flush)
  }, [editable, m.id])
  const write = (next: string) => { dirty.current = true; setNotes(next) }
  const change = (fn: (s: MeetingState) => MeetingState) => { dirty.current = true; setState(fn) }

  /* ── the co-pilot's time: 10 minutes at a time ── */
  const startedAt = m.startedAt ?? m.startsAt
  const blockEnd = startedAt + blocks * BLOCK_MS
  const elapsedMin = Math.max(0, Math.floor((clock - startedAt) / 60_000))
  const checkIn = live && !paused && blocks > 0 && clock >= blockEnd - 60_000
  const overdue = live && !paused && blocks > 0 && clock >= blockEnd + CHECK_IN_GRACE_MS
  const pausing = useRef(false)
  useEffect(() => {
    if (!overdue || pausing.current) return
    pausing.current = true
    void pauseCopilot(m.id).then(() => { setPaused(true); pausing.current = false }, () => { pausing.current = false })
  }, [overdue, m.id])
  const keepGoing = async () => {
    const n = blocks + 1
    const r = await takeMeetingBlock(m.id, n).catch(() => null)
    if (!r) { fail('keep the co-pilot on'); return }
    if ('ok' in r) { setBlocks(n); setPaused(false); snackbar({ message: r.free ? `The co-pilot carries on — your free meeting covers it` : `The co-pilot carries on · ${r.charged || 25} AI credits for the next 10 minutes` }); return }
    setPaused(true)
    if (r.error === 'free_used') { snackbar({ message: 'Your free 30 minutes of the co-pilot are used — your notes carry on. The co-pilot comes with Pro.', actionLabel: 'See plans', onAction: openPlans }); return }
    if (r.error === 'insufficient_credits' || r.error === 'member_cap_reached') { openCreditBlock({ refusal: r as never, what: 'meeting', needed: 25, retry: () => { void keepGoing() } }); return }
    fail('keep the co-pilot on', refusalOf(r.error))
  }
  const wrapUp = () => { void pauseCopilot(m.id).then(() => setPaused(true), () => fail('pause the co-pilot')) }

  /* ── Before: what it is for, where, the consent ── */
  const [aim, setAim] = useState<AimKey>(m.aim as AimKey)
  const [aimNote, setAimNote] = useState(m.aimNote ?? '')
  const [whereKind, setWhereKind] = useState<WhereKind>(m.whereKind as WhereKind)
  const [consent, setConsent] = useState(false)
  const [consentError, setConsentError] = useState(false)
  const [starting, setStarting] = useState(false)
  const start = async () => {
    if (!consent) { setConsentError(true); snackbar({ message: `Tell ${first} about the co-pilot first — tick it in Get ready` }); return }
    if (starting) return
    setStarting(true)
    const r = await startMeeting(m.id, { consent, aim, aimNote, whereKind }).catch(() => null)
    setStarting(false)
    if (!r) { fail('start the meeting'); return }
    if ('ok' in r) { snackbar({ message: r.free ? 'The co-pilot is on — your free meeting covers the first 10 minutes' : `The co-pilot is on · ${r.charged || 25} AI credits for the first 10 minutes` }); refresh(); return }
    if (r.error === 'free_used') { snackbar({ message: 'Your free meeting with the co-pilot is used — the co-pilot comes with Pro. You can still write the meeting up after it.', actionLabel: 'See plans', onAction: openPlans }); return }
    if (r.error === 'insufficient_credits' || r.error === 'member_cap_reached') { openCreditBlock({ refusal: r as never, what: 'meeting', needed: 25, retry: () => { void start() } }); return }
    fail('start the meeting', refusalOf(r.error))
  }
  const price = data.credits.free
    ? data.credits.freeLeft > 0 ? `Your free meeting: the co-pilot is free for ${data.credits.freeLeft * 10} more minutes.` : 'Your free meeting with the co-pilot is used — the co-pilot comes with Pro.'
    : 'The co-pilot uses 25 AI credits for each 10 minutes, and asks before each next 10.'

  /* ── End ── */
  const [ending, setEnding] = useState(false)
  const [confirmEnd, setConfirmEnd] = useState(false)
  const end = async () => {
    setConfirmEnd(false)
    if (ending) return
    setEnding(true)
    if (dirty.current) await saveMeetingNotes(m.id, { notes, state, fileIds }).catch(() => null)
    const r = await endMeeting(m.id).catch(() => null)
    setEnding(false)
    if (!r || 'error' in r) { fail('end the meeting', r ? refusalOf(r.error) : null); return }
    const receipt = r.receipt.blocks ? ` · Co-pilot ${r.receipt.minutes} min · ${r.receipt.credits ? `${r.receipt.credits} AI credits` : 'free'}` : ''
    const next = r.next   // (S42G) the stage the rule allows — never a "Move to Met" the Overview would refuse
    snackbar({ message: `Meeting held — the brief is ready${receipt}`, ...(next ? { actionLabel: meetingStepLabel(next), onAction: () => router.push(meetingStepHref(data.lead.id, m.id, next)) } : {}) })
    refresh()
  }

  /* ── After ── */
  const brief = m.brief
  const [saving, setSaving] = useState(false)
  const [saveOpen, setSaveOpen] = useState(false)
  const [edit, setEdit] = useState<'summary' | 'actions' | 'followUp' | 'notes' | null>(null)
  const saveToLead = async (p: SavePlan): Promise<boolean> => {
    setSaving(true)
    const r = await saveBriefToLead(m.id, p).catch(() => null)
    setSaving(false)
    if (!r || 'error' in r) { fail('save to the lead', r ? refusalOf(r.error) : null); return false }
    const parts = [r.fields ? `${r.fields} ${r.fields === 1 ? 'detail' : 'details'}` : null, r.tasks ? `${r.tasks} ${r.tasks === 1 ? 'task' : 'tasks'}` : null].filter(Boolean).join(' and ')
    snackbar({ message: `Saved to ${first}’s lead${parts ? ` — ${parts}` : ''}`, actionLabel: 'Undo', onAction: () => { void run('undo the save', () => undoSaveBrief(m.id, r.undo), 'The lead is back as it was', { refresh: true }) } })
    refresh(); return true
  }
  const saveText = async (what: 'summary' | 'actions' | 'followUp' | 'notes', v: string): Promise<boolean> => {
    if (what === 'notes') {
      const a = await saveMeetingNotes(m.id, { notes: v, state, fileIds }).catch(() => null)
      if (!a || 'error' in a) { fail('save the notes', a ? refusalOf(a.error) : null); return false }
      setNotes(v)
      const b = await remakeBrief(m.id).catch(() => null)
      if (!b || 'error' in b) { fail('make the brief again', b ? refusalOf(b.error) : null); return false }
      snackbar({ message: 'Notes saved — the brief is made again from them' }); refresh(); return true
    }
    const r = await editBrief(m.id, what === 'actions' ? { actions: v.split('\n') } : { [what]: v }).catch(() => null)
    if (!r || 'error' in r) { fail('save the brief', r ? refusalOf(r.error) : null); return false }
    refresh(); return true
  }
  const [draftBusy, setDraftBusy] = useState(false)
  const draftQuote = async () => {
    if (m.quoteId) { router.push(withFrom(`/quotes/${m.quoteId}`, here())); return }
    if (draftBusy) return
    setDraftBusy(true)
    const r = await draftQuoteFromMeeting(m.id).catch(() => null)
    setDraftBusy(false)
    if (!r || 'error' in r) { fail('make the draft quote', r ? refusalOf(r.error) : null); return }
    snackbar({ message: `Draft quote made — ${r.lines} ${r.lines === 1 ? 'line' : 'lines'}${r.toPrice ? `, ${r.toPrice} to price` : ''}`, actionLabel: 'Open', onAction: () => router.push(withFrom(`/quotes/${r.quoteId}`, here())) })
    refresh()
  }

  /* ── the client's link: the invitation, the notes ── */
  const [send, setSend] = useState<{ kind: 'invite' | 'notes'; token: string } | null>(null)
  const [shareOpts, setShareOpts] = useState(m.share)
  /* (S42 audit C-06) a tick is offered only for what the meeting has — a board kept with it, an estimate with works and a price — and what is
     shared never asks for what isn't there */
  const hasBoards = state.boards.length > 0
  const hasEstimate = (m.brief?.estimate?.lines?.length ?? 0) > 0 && (m.brief?.estimate?.highMinor ?? 0) > 0
  const shareNow = { boards: shareOpts.boards && hasBoards, estimate: shareOpts.estimate && hasEstimate }
  const openSend = async (kind: 'invite' | 'notes') => {
    const r = await meetingLink(m.id).catch(() => null)
    if (!r || 'error' in r) { fail(kind === 'invite' ? 'make the invitation' : 'make the link', r ? refusalOf(r.error) : null); return }
    setShareOpts(m.share)
    setSend({ kind, token: r.token })
  }
  const absolute = (path: string) => `${window.location.origin}${path}`
  const stopShare = () => {
    void stopSharingMeeting(m.id).then((r) => {
      if ('error' in r) { fail('stop sharing', refusalOf(r.error)); return }
      refresh()
      snackbar({ message: `The notes are no longer shared — ${first}’s link shows the meeting only`, actionLabel: 'Undo', onAction: () => { void run('share them again', () => shareMeeting(m.id, r.share), 'The notes are shared again', { refresh: true }) } })
    }, () => fail('stop sharing'))
  }

  /* ── tools ── */
  const [boardOpen, setBoardOpen] = useState<{ style: string | null } | null>(null)
  const [portfolioOpen, setPortfolioOpen] = useState(false)
  const [attachOpen, setAttachOpen] = useState(false)
  const [library, setLibrary] = useState<LeadFile[]>([])
  const portfolio = useMemo(() => matchPortfolio(data.portfolio, { profile: reading.profile, leadStyle: data.lead.style, leadProperty: data.lead.propertyType, leadBudget: data.lead.budgetMinor }), [data.portfolio, reading.profile, data.lead])
  const openRender = () => {
    const w = window.open('', '_blank')
    void openLeadDesign(data.lead.id).then((r) => { if ('error' in r) { w?.close(); fail('open the AI Visualizer', r.error); return } if (w) w.location.href = withFrom(`/visualizer/${r.id}`, `/meetings/${m.id}`) }, () => { w?.close(); fail('open the AI Visualizer') })
  }
  /* (pending modules S21 — S19's rule for every opener of a Pro feature) Quote X-Ray is Pro: on Free, Their quote wears the tag and its press
     opens the lock card here, in the meeting — never a new tab that lands on a lock */
  const xrayLock = usePlanLock('quote_xray')
  const openXray = () => { if (xrayLock.locked) { xrayLock.open(); return } window.open(withFrom(`/quote-x-ray?lead=${data.lead.id}`, `/meetings/${m.id}`), '_blank', 'noopener') }
  const openAttach = () => { setAttachOpen(true); void fetchAttachLibrary(data.lead.id).then(setLibrary, () => {}) }
  const actOnTip = (t: Tip) => {
    change((s) => ({ ...s, acted: s.acted.includes(t.key) ? s.acted : [...s.acted, t.key] }))
    if (t.action?.kind === 'moodboard') setBoardOpen({ style: t.action.style ?? null })
    else if (t.action?.kind === 'xray') openXray()
    else if (t.action?.kind === 'portfolio') setPortfolioOpen(true)
    else if (t.action?.kind === 'render') openRender()
  }
  const keepBoard = (name: string) => { change((s) => ({ ...s, boards: s.boards.includes(name) ? s.boards : [...s.boards, name].slice(-12) })); snackbar({ message: `${name} mood board kept with the meeting` }) }

  /* ── Maison AI on this page (S10's note: a meeting's page registers its suggestions; answers by rule from its records) ── */
  const ask: MaisonSuggestion[] = useMemo(() => {
    const out: MaisonSuggestion[] = []
    if (planned) out.push({ label: `Prepare me for ${first}`, answer: { title: `Before you meet ${first}`, rows: [...data.prep.know.map((k) => ({ id: `k-${k.label}`, label: k.label, meta: k.value })), ...data.prep.unknown.map((u) => ({ id: `u-${u}`, label: `Still to find out: ${u}` })), ...data.prep.focus.map((x, i) => ({ id: `f-${i}`, label: x }))] } })
    if (live) {
      out.push({ label: 'What should I ask next?', answer: { title: 'Still to ask', rows: reading.checklist.filter((c) => !c.ticked).slice(0, 6).map((c) => ({ id: c.id, label: c.label, meta: c.category === 'critical' ? 'Must ask' : undefined })), text: reading.checklist.every((c) => c.ticked) ? 'Everything on the checklist is covered.' : undefined } })
      const o = reading.objections[reading.objections.length - 1]
      if (o) out.push({ label: `How do I answer their ${kindLabel(o.kind).toLowerCase()} concern?`, answer: { title: `${kindLabel(o.kind)} concern`, text: o.answer ? `${o.answer}` : `Your studio has no answer saved for this kind yet — add one in Settings › Meetings.`, link: { label: 'Objection answers', href: '/settings?section=meetings' } } })
      if (reading.addOns.length) out.push({ label: 'What’s missing from the scope?', answer: { title: 'Often added to these works', rows: reading.addOns.map((a) => ({ id: a.key, label: a.description, meta: `+S$ ${Math.round(a.valueMinor / 100).toLocaleString('en-SG')}` })) } })
    }
    if (held && brief) out.push({ label: 'Draft the follow-up message', answer: { title: `Follow-up for ${first}`, text: brief.followUp } })
    return out
  }, [planned, live, held, brief, first, data.prep, reading])
  useMaisonAi(ask)

  /* ── the header ── */
  const backHref = from ?? (data.project ? `/projects/${data.project.id}/meetings` : `/leads/${data.lead.id}/meetings`)
  const crumbs = [{ label: data.project ? 'Projects' : 'Leads', href: data.project ? '/projects' : '/leads' }, { label: titleCaseName(data.lead.name), href: data.project ? `/projects/${data.project.id}` : `/leads/${data.lead.id}` }]
  const title = `${aimLabel(m.aim) === 'Other' ? 'Meeting' : aimLabel(m.aim)} with ${first}`
  const [kebab, setKebab] = useState(false)
  const [writeUpOpen, setWriteUpOpen] = useState(false)
  const kebabRef = useRef<HTMLSpanElement>(null)
  const del = () => {
    void deleteMeeting(m.id).then((r) => {
      if ('error' in r) { fail('delete the meeting', refusalOf(r.error)); return }
      router.push(backHref)
      snackbar({ message: `${title} deleted`, actionLabel: 'Undo', onAction: () => { void run('restore the meeting', () => restoreMeeting(m.id, r.undo), 'Meeting restored') } })
    }, () => fail('delete the meeting'))
  }
  /* (pending modules S26 — S23's note: "a meeting could post its brief to the Team conversation") the brief's summary and next steps, written
     in the lead's Team conversation (the project's once Won) — the team reads it there; the client never sees it. Undo takes the line back. */
  const shareWithTeam = async () => {
    if (!brief) return
    const when = displayDate(new Date(m.startsAt))
    const steps = brief.actions.length ? `\n\nNext steps:\n${brief.actions.map((a, i) => `${i + 1}. ${a}`).join('\n')}` : ''
    const body = `${title} (${when}) — ${brief.summary}${steps}`.slice(0, MESSAGE_MAX)
    const key = conversationKey(data.project ? 'team' : 'lead-team', data.project ? data.project.id : data.lead.id)
    const r = await sendInConversation(key, { body }).catch(() => ({ error: 'please try again' }))
    if ('error' in r) { fail('share it with the team', refusalOf(r.error)); return }
    snackbar({ message: 'Shared in the team chat', actionLabel: 'Undo', onAction: () => { void removeMessage(r.line.id).then((u) => { if ('error' in u) fail('take it back', refusalOf(u.error)); else snackbar({ message: 'Taken back from the team chat' }) }) } })
  }
  /* (S42 audit C-04) a planned meeting is "Now" from its time to its planned end (Start a meeting now lands here), and only then has its time
     passed — the lists' rule (lib/meetings/model.ts `standingOf`); once its time has come the invitation is behind it *(invented copy: "Now")* */
  const due = dueNow(m, data.now)
  const statusChip = live ? (paused ? `Live · ${elapsedMin} min · co-pilot paused` : `Live · ${elapsedMin} min`) : held ? 'Held' : cancelled ? 'Cancelled' : !due ? 'Upcoming'
    : data.now < (m.endsAt ?? m.startsAt + DEFAULT_LENGTH_MIN * 60_000) ? 'Now' : 'Its time has passed'
  const primary = !data.mayChange ? null
    : planned ? <Button onPress={() => { void start() }} isDisabled={starting} data-kb="create" data-testid="room-start">{starting ? 'Starting…' : 'Start the meeting'}</Button>
    : live ? <Button onPress={() => setConfirmEnd(true)} isDisabled={ending} data-testid="room-end">{ending ? 'Making the brief…' : 'End the meeting'}</Button>
    : held && brief && !m.briefSavedAt ? <Button onPress={() => setSaveOpen(true)} data-testid="room-save">Save to the lead</Button>
    : held && brief ? <Button onPress={() => { void openSend('notes') }} data-testid="room-share">{m.sharedAt && !m.shareStoppedAt ? 'Send the notes again' : 'Share the notes'}</Button>
    : null
  const secondary = !data.mayChange ? null
    : planned && !due ? <Button variant="secondary" appearance="outlined" onPress={() => { void openSend('invite') }} data-testid="room-invite">{m.invitedAt ? 'Send the invitation again' : 'Send the invitation'}</Button>
    : held && brief && !m.briefSavedAt ? <Button variant="secondary" appearance="outlined" onPress={() => { void openSend('notes') }} data-testid="room-share">Share the notes</Button>
    : null
  const menu = data.mayChange ? (
    <span ref={kebabRef}>
      <Tooltip label="More actions" disabled={kebab}><IconButton icon="more_vert" label="More actions" aria-haspopup="menu" aria-expanded={kebab} onClick={() => setKebab((k) => !k)} /></Tooltip>
      <PortalMenu open={kebab} anchor={kebabRef} onClose={() => setKebab(false)} align="right" width={MENU_WIDTH.wide} role="menu" sheetTitle={title}>
        {planned ? <DropdownItem onSelect={() => { setKebab(false); setWriteUpOpen(true) }} help="From your notes, after it">Write it up instead</DropdownItem> : null}
        {live && blocks <= 1 && !notes.trim() ? <DropdownItem onSelect={() => { setKebab(false); void stopEarly(m.id).then((r) => { if ('error' in r) { fail('stop', refusalOf(r.error)); return } snackbar({ message: r.refunded ? `Stopped — the ${r.refunded} AI credits are back` : 'Stopped — the meeting is planned again' }); refresh() }, () => fail('stop')) }} help="Nothing said yet — its credits come back">Not starting after all</DropdownItem> : null}
        {live && !paused ? <DropdownItem onSelect={() => { setKebab(false); wrapUp() }} help="Your notes carry on">Pause the co-pilot</DropdownItem> : null}
        {held && brief ? <DropdownItem onSelect={() => { setKebab(false); void draftQuote() }}>{m.quoteId ? `Open the draft quote${data.quoteNumber ? ` ${data.quoteNumber}` : ''}` : 'Make a draft quote'}</DropdownItem> : null}
        {held && brief ? <DropdownItem onSelect={() => { setKebab(false); void shareWithTeam() }} help="The summary and the next steps, in the team chat — never the client’s"><span data-testid="room-share-team">Share with the team</span></DropdownItem> : null}
        {held ? <DropdownItem onSelect={() => { setKebab(false); setEdit('notes') }}>Edit the notes</DropdownItem> : null}
        {held && brief ? <DropdownItem onSelect={() => { setKebab(false); void run('make the brief again', () => remakeBrief(m.id), 'The brief is made again from the notes', { refresh: true }) }} help="Your edits to it stay">Make the brief again</DropdownItem> : null}
        {held && m.sharedAt && !m.shareStoppedAt ? <DropdownItem onSelect={() => { setKebab(false); stopShare() }}>Stop sharing the notes</DropdownItem> : null}
        <DropdownItem tone="danger" disabled={!data.mayDelete || live} title={live ? 'end it first' : !data.mayDelete ? 'whoever planned it, Owner or Admin' : undefined} onSelect={() => { setKebab(false); del() }}>Delete</DropdownItem>
      </PortalMenu>
    </span>
  ) : null

  /* (S42G) what isn't on the lead's record yet, and the stage the studio's rule lets it move to — the press lands on that step with the meeting */
  const stepOffer = held && !data.project && !data.linkedToLog ? data.lead.next : null
  const stepWords = stepOffer ? meetingStepWords(first, stepOffer) : null
  return (
    <PageReveal skeleton={<MeetingRoomGhost status={m.status} data={data} />}>
      <div className={styles.page} data-testid="meeting-room" data-status={m.status}>
        <PageHeaderL2 backHref={backHref} crumbs={crumbs} title={title}
          chips={<><MetaChip icon="event">{statusChip}</MetaChip><MetaChip icon="schedule">{displayDue(new Date(m.startsAt))}</MetaChip><MetaChip icon="home">{m.whereKind}</MetaChip></>}
          actions={<>{secondary}{primary}</>} titleActions={menu} />
        <div className={styles.content}>

        {/* ── what waits, said where it is decided ── */}
        {checkIn ? (
          <div className={styles.bannerRow} role="status" data-testid="room-check-in">
            <span className={styles.bannerText}><b>{Math.max(1, blocks) * 10} minutes in — keep the co-pilot on?</b>{data.credits.free && data.credits.freeLeft > 0 ? 'Your free meeting covers the next 10 minutes.' : '25 AI credits for the next 10 minutes. Your notes carry on either way.'}</span>
            <span className={styles.bannerActs}><Button variant="secondary" appearance="outlined" onPress={wrapUp} data-testid="room-wrap-up">Wrap up</Button><Button onPress={() => { void keepGoing() }} data-testid="room-keep-going">Keep going</Button></span>
          </div>
        ) : null}
        {live && paused ? (
          <div className={styles.bannerRow} role="status" data-testid="room-paused">
            <span className={styles.bannerText}><b>The co-pilot is paused</b>Your notes are still saved as you type — End the meeting makes the brief from them.</span>
            <span className={styles.bannerActs}><Button variant="secondary" appearance="outlined" onPress={() => { void keepGoing() }} data-testid="room-resume">Resume · 10 minutes</Button></span>
          </div>
        ) : null}
        {stepOffer && stepWords ? (
          <div className={styles.bannerRow} data-testid="room-step-offer" data-step={stepOffer.step.toLowerCase()} data-resume={stepOffer.resume || undefined}>
            <span className={styles.bannerText}><b>{stepWords.title}</b>{stepWords.line}</span>
            <span className={styles.bannerActs}><Button variant="secondary" appearance="outlined" onPress={() => router.push(meetingStepHref(data.lead.id, m.id, stepOffer))} data-testid="room-move-step">{meetingStepLabel(stepOffer)}</Button></span>
          </div>
        ) : null}
        {planned && m.clientAnswer ? <p className={styles.banner} data-testid="room-answer"><Icon name={m.clientAnswer === 'yes' ? 'check_circle' : 'info'} size={18} />{m.clientAnswer === 'yes' ? `${first} says they’ll be there.` : `${first} says the time doesn’t suit${m.clientAnswerNote ? `: “${m.clientAnswerNote}”` : '.'} — Change the plan from the meeting’s row, or call them.`}</p> : null}

        <div className={styles.phoneViews}>{live ? <Chips label="Show" value={view} onChange={(v) => setView(v as PhoneView)} options={[{ value: 'notes', label: 'Notes' }, { value: 'tips', label: `Tips${reading.tips.length ? ` · ${reading.tips.length}` : ''}` }, { value: 'checklist', label: 'Checklist' }, { value: 'estimate', label: 'Estimate' }, { value: 'more', label: 'More' }]} testId="room-phone-views" /> : null}</div>

        {planned || cancelled ? (
          /* ── Before ── */
          <div className={styles.grid}>
            <div className={`${styles.column} ${styles.act}`}>
              <Card title="Before the meeting" testId="room-prep">
                <div className={styles.cardBody}>
                  <div className={styles.group}>{data.prep.know.length ? data.prep.know.map((k) => <Row key={k.label} icon="check" name={k.label} meta={k.value} wrap />) : <p className={styles.line}>Nothing on record yet about the home or the budget.</p>}</div>
                  {data.prep.unknown.length ? <div className={styles.group}><span className={styles.groupLabel}>Still to find out</span><p className={styles.chipsRow}>{data.prep.unknown.map((u) => <span key={u} className={styles.unknown}>{u}</span>)}</p></div> : null}
                  {data.prep.last ? <div className={styles.group}><span className={styles.groupLabel}>Last meeting · {displayDate(new Date(data.prep.last.at))}{data.prep.last.count > 1 ? ` · ${data.prep.last.count} so far` : ''}</span><p className={styles.prose}>{data.prep.last.summary}</p></div> : null}
                  {data.prep.concerns.length || data.prep.competitors.length ? <div className={styles.group}><span className={styles.groupLabel}>To address</span>{data.prep.concerns.map((c) => <Row key={c} icon="flag" name={`${c} concern`} />)}{data.prep.competitors.map((c) => <Row key={c} icon="store" name={`Also talking to ${c}`} />)}</div> : null}
                  <div className={styles.group}><span className={styles.groupLabel}>Focus on</span><ol className={styles.steps}>{data.prep.focus.map((x) => <li key={x}>{x}</li>)}</ol></div>
                  {data.prep.temperature ? <div className={styles.group}><span className={styles.groupLabel}>How warm, at the last meeting</span><Row icon="trending_up" name={`${data.prep.temperature.score} · ${data.prep.temperature.tier}`} caption={data.prep.temperature.line} two /></div> : null}
                </div>
              </Card>
              {f.checklist ? <ChecklistCard rows={reading.checklist} closing={false} onToggle={() => {}} readOnly /> : null}
            </div>
            <div className={`${styles.column} ${styles.glance}`}>
              {cancelled ? <Card title="This meeting was cancelled" testId="room-cancelled"><div className={styles.cardBody}><p className={styles.line}>Plan another from the lead’s Meetings.</p></div></Card> : (
                <Card title="Get ready" testId="room-ready">
                  <div className={styles.form}>
                    <Chips label="What it’s for" value={aim} onChange={(a) => setAim(a as AimKey)} options={AIMS.map((a) => ({ value: a.key, label: a.label }))} disabled={!data.mayChange} testId="room-aim" />
                    <TextField label="What you want out of it (optional)" value={aimNote} onChange={setAimNote} maxLength={200} disabled={!data.mayChange} />
                    <TextField label="Where" value={whereKind} mode="select" options={[...WHERE]} onChange={(v) => setWhereKind(v as WhereKind)} disabled={!data.mayChange} />
                    <span className={styles.groupLabel}>Tell {first} before you start</span>
                    <p className={styles.disclosure} data-testid="room-disclosure">“{DISCLOSURE}”</p>
                    <Checkbox isSelected={consent} onChange={(on: boolean) => { setConsent(on); setConsentError(false) }} isDisabled={!data.mayChange} data-testid="room-consent">{consentLabel(first)}</Checkbox>
                    {consentError && !consent ? <p className={styles.note} role="alert" data-testid="room-consent-error">Tick it once {first} knows — the co-pilot starts after.</p> : null}
                    <p className={styles.price} data-testid="room-price"><Icon name="auto_awesome" size={16} />{price}</p>
                    <p className={styles.standIn}><Icon name="info" size={16} />{LISTENING_STAND_IN}</p>
                  </div>
                </Card>
              )}
              {/* (S42 C-04) a meeting whose time has come and that was never sent has no invitation to speak of — shown only when it applies */}
              {due && !m.invitedAt ? null : <Card title="Invitation" testId="room-invitation">
                <div className={styles.cardBody}>
                  <Row icon="event" name={whenWords(m.startsAt)} caption={m.place ?? m.whereKind} two />
                  <Row icon={m.invitedAt ? 'send' : 'schedule'} name={m.invitedAt ? `Sent ${displayDate(new Date(m.invitedAt))}${m.invitedVia === 'email' ? ' by email' : m.invitedVia === 'whatsapp' ? ' on WhatsApp' : ''}` : 'Not sent yet'} caption={m.clientAnswer === 'yes' ? `${first} is coming` : m.clientAnswer === 'no' ? 'The time doesn’t suit them' : m.clientViewedAt ? `${first} opened it` : undefined} two />
                </div>
              </Card>}
            </div>
          </div>
        ) : live ? (
          /* ── During ── */
          <div className={styles.grid} data-phone-view={view}>
            <div className={`${styles.column} ${styles.act}`}>
              <div data-view="notes" style={{ display: 'contents' }}>
                <Card title="What’s being said" metaRight={savedAt ? `Saved ${displayTime(new Date(savedAt))}` : undefined} testId="room-notes">
                  <div className={styles.cardBody}>
                    <p className={styles.standIn}><Icon name="info" size={16} />{LISTENING_STAND_IN}</p>
                    <div className={styles.notesBar}>
                      <Button appearance="text" onPress={() => write(`${notes}${notes && !notes.endsWith('\n') ? '\n' : ''}Client: `)} data-testid="notes-client">Client:</Button>
                      <Button appearance="text" onPress={() => write(`${notes}${notes && !notes.endsWith('\n') ? '\n' : ''}Me: `)}>Me:</Button>
                    </div>
                    <textarea className={styles.notes} value={notes} onChange={(e) => write(e.target.value)} disabled={!editable} placeholder={`Client: We’re thinking of redoing the kitchen and both bathrooms…`} aria-label="What’s being said" data-testid="room-notes-box" />
                    <div className={styles.tools} data-testid="room-tools">
                      {f.moodboard ? <Button variant="secondary" appearance="outlined" iconStart={<Icon name="palette" size={20} />} onPress={() => setBoardOpen({ style: null })}>Mood board</Button> : null}
                      <Button variant="secondary" appearance="outlined" iconStart={<Icon name="wand_shine" size={20} />} onPress={openRender}>Render a room</Button>
                      {f.portfolio_search ? <Button variant="secondary" appearance="outlined" iconStart={<Icon name="photo" size={20} />} onPress={() => setPortfolioOpen(true)}>Past projects{portfolio.length ? ` · ${portfolio.length}` : ''}</Button> : null}
                      {f.competitor_analysis ? <Button variant="secondary" appearance="outlined" iconStart={<Icon name="scan" size={20} />} onPress={openXray} aria-label={xrayLock.locked ? 'Their quote, a Pro feature' : undefined}>Their quote{xrayLock.locked ? <> <ProTag /></> : null}</Button> : null}
                      {f.floor_plan_notes ? <Button variant="secondary" appearance="outlined" iconStart={<Icon name="attach_file" size={20} />} onPress={openAttach}>Photos and floor plan{fileIds.length ? ` · ${fileIds.length}` : ''}</Button> : null}
                    </div>
                  </div>
                </Card>
              </div>
              <div data-view="more" style={{ display: 'contents' }}>
                {state.boards.length || data.designs.length || data.readings.length ? (
                  <Card title="From this meeting" testId="room-made">
                    <div className={styles.cardBody}>
                      {state.boards.length ? <div className={styles.boards}>{state.boards.map((b) => <StyleBoard key={b} name={b} />)}</div> : null}
                      {data.designs.map((d) => <Row key={d.id} icon="wand_shine" name={d.name} meta={`${d.renders} ${d.renders === 1 ? 'render' : 'renders'}`} href={withFrom(`/visualizer/${d.id}`, `/meetings/${m.id}`)} />)}
                      {data.readings.map((x) => <Row key={x.id} icon="scan" name={x.title} meta={displayTime(new Date(x.at))} href={withFrom(`/quote-x-ray/${x.id}`, `/meetings/${m.id}`)} />)}
                    </div>
                  </Card>
                ) : null}
              </div>
            </div>
            <div className={`${styles.column} ${styles.glance}`}>
              {f.coaching || f.moodboard ? <div data-view="tips" style={{ display: 'contents' }}><TipsCard tips={reading.tips} paused={paused} studio={studio} onAct={actOnTip} lockedActions={xrayLock.locked ? ['xray'] : undefined} onDismiss={(t) => change((s) => ({ ...s, dismissed: [...s.dismissed, t.key] }))} /></div> : null}
              {f.checklist ? <div data-view="checklist" style={{ display: 'contents' }}><ChecklistCard rows={reading.checklist} closing={reading.closing} onToggle={(id, on) => change((s) => ({ ...s, hand: { ...s.hand, [id]: on } }))} /></div> : null}
              <div data-view="estimate" style={{ display: 'contents' }}>
                {f.deal_scoring && reading.lines.length ? <ScoreCard score={reading.score} dims={reading.dims} /> : null}
                {f.live_quote ? <EstimateCard estimate={reading.estimate} addOns={reading.addOns} showAddOns={f.recommended_addons} /> : null}
              </div>
              <div data-view="more" style={{ display: 'contents' }}>
                <Card title="What we’ve heard" testId="room-heard"><div className={styles.cardBody}><HeardRows p={reading.profile} tags={reading.tags} /></div></Card>
              </div>
            </div>
          </div>
        ) : brief ? (
          /* ── After ── */
          <div className={styles.grid}>
            <div className={`${styles.column} ${styles.act}`}>
              <Card title="Summary" link={data.mayChange ? { label: 'Edit', onClick: () => setEdit('summary') } : undefined} testId="brief-summary"><div className={styles.cardBody}><p className={styles.prose} data-testid="brief-summary-text">{brief.summary}</p>{brief.madeFrom !== 'live' ? <p className={styles.note}>Made from {brief.madeFrom === 'recording' ? 'the recording’s transcript' : 'the notes'}, by rule.</p> : null}</div></Card>
              <Card title="Next steps" link={data.mayChange ? { label: 'Edit', onClick: () => setEdit('actions') } : undefined} testId="brief-steps"><div className={styles.cardBody}><ol className={styles.steps}>{brief.actions.map((a) => <li key={a}>{a}</li>)}</ol></div></Card>
              <Card title="Message to send" link={data.mayChange ? { label: 'Edit', onClick: () => setEdit('followUp') } : undefined} testId="brief-follow-up">
                <div className={styles.cardBody}>
                  <p className={styles.prose}>{brief.followUp}</p>
                  {data.mayChange ? <span className={styles.cardAct}><Button variant="secondary" appearance="outlined" iconStart={<Icon name="chat" size={20} />} onPress={() => { window.open(`https://wa.me/65${data.lead.phone}?text=${encodeURIComponent(brief.followUp)}`, '_blank', 'noopener') }} data-testid="brief-whatsapp">Send on WhatsApp</Button><Button appearance="text" onPress={() => { void copyText(brief.followUp).then(() => snackbar({ message: 'Message copied' }), () => fail('copy the message')) }}>Copy</Button></span> : null}
                </div>
              </Card>
              <Card title="What we heard" testId="brief-heard"><div className={styles.cardBody}><HeardRows p={brief.profile} tags={brief.tags} /></div></Card>
              <Card title="Concerns they raised" meta={brief.objections.length ? `· ${brief.objections.length}` : undefined} testId="brief-concerns"><div className={styles.cardBody}><ObjectionRows objections={brief.objections} studio={studio} /></div></Card>
              {state.boards.length || data.designs.length || data.readings.length || data.files.length ? (
                <Card title="From this meeting" testId="brief-made">
                  <div className={styles.cardBody}>
                    {state.boards.length ? <div className={styles.boards}>{state.boards.map((b) => <StyleBoard key={b} name={b} />)}</div> : null}
                    {data.designs.map((d) => <Row key={d.id} icon="wand_shine" name={d.name} meta={`${d.renders} ${d.renders === 1 ? 'render' : 'renders'}`} href={withFrom(`/visualizer/${d.id}`, `/meetings/${m.id}`)} />)}
                    {data.readings.map((x) => <Row key={x.id} icon="scan" name={x.title} href={withFrom(`/quote-x-ray/${x.id}`, `/meetings/${m.id}`)} />)}
                    {data.files.map((x) => <Row key={x.id} icon={x.id === m.recordingFileId ? 'mic' : x.kind === 'image' ? 'image' : 'description'} name={x.name} caption={x.id === m.recordingFileId ? 'The recording' : undefined} href={withFrom(`/leads/${data.lead.id}/files/${x.id}`, `/meetings/${m.id}`)} two={x.id === m.recordingFileId} />)}
                  </div>
                </Card>
              ) : null}
              <Card title="The notes" link={data.mayChange ? { label: 'Edit', onClick: () => setEdit('notes') } : undefined} testId="brief-notes"><div className={styles.cardBody}>{notes.trim() ? <pre className={styles.notesFull}>{notes}</pre> : <p className={styles.line}>No notes were taken.</p>}</div></Card>
            </div>
            <div className={`${styles.column} ${styles.glance}`}>
              <Card title="On the lead" testId="brief-on-lead">
                <div className={styles.cardBody}>
                  {m.briefSavedAt ? <Row icon="check_circle" name={`Saved to the lead ${displayDate(new Date(m.briefSavedAt))}`} caption="The details and the follow-up are on it" two /> : <Row icon="pending" name="Not saved to the lead yet" caption="Save it — the details heard and a follow-up task" two action={data.mayChange ? { label: 'Save', onPress: () => setSaveOpen(true) } : null} />}
                  {m.sharedAt && !m.shareStoppedAt ? <Row icon="link" name={`Shared with ${first} ${displayDate(new Date(m.sharedAt))}`} caption={m.clientViewedAt ? `${first} opened it` : 'Not opened yet'} two action={data.mayChange ? { label: 'Stop', onPress: stopShare } : null} /> : null}
                </div>
              </Card>
              {brief.score !== null && brief.dims && f.deal_scoring ? <ScoreCard score={brief.score} dims={brief.dims} /> : null}
              <EstimateCard estimate={brief.estimate} addOns={brief.upsells} showAddOns={f.recommended_addons} onDraft={data.mayChange && (brief.estimate.lines.length || brief.profile.rooms.length || m.quoteId) ? () => { void draftQuote() } : undefined} draftLabel={m.quoteId ? `Open the draft quote${data.quoteNumber ? ` ${data.quoteNumber}` : ''}` : draftBusy ? 'Making the draft…' : 'Make a draft quote'} />
              <Card title="The meeting" testId="brief-meeting">
                <div className={styles.cardBody}>
                  <Row icon="event" name={displayDue(new Date(m.startsAt))} caption={m.whereKind} two />
                  <Row icon="group" name={m.memberIds.map((id) => data.team.find((t) => t.id === id)?.name).filter(Boolean).join(', ') || 'The studio'} />
                  <Row icon={brief.madeFrom === 'live' ? 'mic' : brief.madeFrom === 'recording' ? 'upload_file' : 'notes'} name={brief.madeFrom === 'live' ? `With the co-pilot${m.blocks ? ` · ${heldMinutes(m)} min` : ''}` : brief.madeFrom === 'recording' ? 'From a recording' : 'Written up from notes'} caption={brief.madeFrom === 'live' && m.blocks ? (m.blocks - m.freeBlocks ? `${(m.blocks - m.freeBlocks) * 25} AI credits` : 'Your free meeting') : undefined} two />
                  <Row icon="check_box" name={`Checklist ${brief.checklist.done} of ${brief.checklist.total}`} caption={brief.checklist.missed.length ? `Not covered: ${brief.checklist.missed.join(', ')}` : 'Every must-ask covered'} two />
                  {Object.keys(state.seen).length ? <Row icon="lightbulb" name={`${Object.keys(state.seen).length} tips came up`} caption={`${state.acted.length} acted on`} two /> : null}
                </div>
              </Card>
            </div>
          </div>
        ) : (
          <Card title="Brief" testId="brief-missing"><div className={styles.cardBody}><p className={styles.line}>This meeting has no brief yet — write its notes up to make one.</p>{data.mayChange ? <span className={styles.cardAct}><Button onPress={() => setWriteUpOpen(true)}>Write it up</Button></span> : null}</div></Card>
        )}
        </div>
      </div>

      <ConfirmDialog open={confirmEnd} title="End the meeting?" message="The co-pilot stops and the brief is made from what was said. You can edit it after." confirmLabel="End the meeting" onCancel={() => setConfirmEnd(false)} onConfirm={() => { void end() }} />
      {brief ? <SaveToLeadDialog open={saveOpen} onClose={() => setSaveOpen(false)} onSave={saveToLead} brief={brief} lead={{ propertyType: data.lead.propertyType, areaSqft: data.lead.areaSqft, budgetMinor: data.lead.budgetMinor, style: data.lead.style, keyCollection: data.lead.keyCollection }} client={first} now={data.now} existingFollowUp={data.followUp} busy={saving} /> : null}
      {brief ? <EditTextDialog open={edit === 'summary'} onClose={() => setEdit(null)} title="Edit the summary" label="Summary" value={brief.summary} onSave={(v) => saveText('summary', v)} help="Kept when the brief is made again." /> : null}
      {brief ? <EditTextDialog open={edit === 'actions'} onClose={() => setEdit(null)} title="Edit the next steps" label="Next steps" value={brief.actions.join('\n')} onSave={(v) => saveText('actions', v)} lines /> : null}
      {brief ? <EditTextDialog open={edit === 'followUp'} onClose={() => setEdit(null)} title={`Edit the message to ${first}`} label="Message" value={brief.followUp} onSave={(v) => saveText('followUp', v)} help="Kept when the brief is made again." /> : null}
      <EditTextDialog open={edit === 'notes'} onClose={() => setEdit(null)} title="Edit the notes" label="What was said" value={notes} onSave={(v) => saveText('notes', v)} help="Saving makes the brief again from them — your edits to the summary, the steps and the message stay." />
      <WriteUpHere open={writeUpOpen} onClose={() => setWriteUpOpen(false)} data={data} />
      <MoodBoardDialog open={!!boardOpen} onClose={() => setBoardOpen(null)} heard={reading.styles} kept={state.boards} onKeep={keepBoard} client={first} style={boardOpen?.style ?? null} />
      <PortfolioDialog open={portfolioOpen} onClose={() => setPortfolioOpen(false)} matches={portfolio} all={data.portfolio.length} client={first} />
      <AttachFilesModal open={attachOpen} files={library} attached={fileIds} onClose={() => setAttachOpen(false)}
        onAttach={(ids) => { setAttachOpen(false); dirty.current = true; setFileIds(ids); snackbar({ message: ids.length ? `${ids.length} ${ids.length === 1 ? 'file' : 'files'} kept with the meeting` : 'No files with the meeting' }) }}
        onUploadPicked={(file) => (file ? uploadPicked(data.lead.id, file).then((r) => { if (r && !('error' in r)) setLibrary((l) => [r, ...l.filter((x) => x.id !== r.id)]); return r }) : undefined)} />
      {send ? (
        <SendContractDialog open onClose={() => setSend(null)}
          title={send.kind === 'invite' ? 'Send the invitation' : 'Share the notes'}
          subtitle={send.kind === 'invite' ? `${first} gets the day and the place, a calendar invite, and a way to say if the time doesn’t suit.` : `${first} reads the summary and what you’ll do next, written to them — never the score, the concerns or your notes.`}
          link={absolute(clientMeetingPath(send.token))} copyDone={send.kind === 'invite' ? 'Invitation link copied' : 'Notes link copied'} phoneLabel="Client mobile" sendLabel="Send on WhatsApp"
          defaults={{ name: titleCaseName(data.lead.name), phone: data.lead.phone }}
          draft={(name) => send.kind === 'invite' ? inviteMessage({ client: name, studio, aim: m.aim, startsAt: m.startsAt, whereKind: m.whereKind, place: m.place, link: absolute(clientMeetingPath(send.token)) }) : notesMessage({ client: name, followUp: brief?.followUp ?? null, link: absolute(clientMeetingPath(send.token)) })}
          onCopy={() => (send.kind === 'invite' ? inviteClient(m.id, 'copy') : shareMeeting(m.id, shareNow)).then((x) => { if ('error' in x) { fail(send.kind === 'invite' ? 'record the invitation' : 'share the notes', refusalOf(x.error)); return false } snackbar({ message: send.kind === 'invite' ? 'Invitation link copied' : 'Notes link copied — they’re shared' }); refresh(); return true }, () => false)}
          extra={send.kind === 'notes' ? (hasBoards || hasEstimate ? (
            <div className={styles.form} data-testid="share-options">
              {hasBoards ? <Checkbox isSelected={shareOpts.boards} onChange={(on: boolean) => setShareOpts((o) => ({ ...o, boards: on }))} data-testid="share-boards">{state.boards.length === 1 ? 'The mood board' : 'The mood boards'}</Checkbox> : null}
              {hasEstimate ? <Checkbox isSelected={shareOpts.estimate} onChange={(on: boolean) => setShareOpts((o) => ({ ...o, estimate: on }))} data-testid="share-estimate">The rough estimate (a range — never a quote)</Checkbox> : null}
            </div>
          ) : null) : data.lead.email ? (
            <div className={styles.cardAct}><span className={styles.note}>Or email it to {data.lead.email}.</span><Button appearance="text" onPress={() => { setSend(null); void inviteClient(m.id, 'email').then((x) => { if ('error' in x) fail('email the invitation', refusalOf(x.error)); else snackbar({ message: x.emailed === 'off' ? 'Your studio has the meeting email switched off — Settings › Notifications' : x.emailed === 'no_address' ? 'The lead has no email' : `Invitation emailed for ${whenWords(m.startsAt)}` }); refresh() }, () => fail('email the invitation')) }} data-testid="invite-email">Send by email</Button></div>
          ) : null}
          onSend={({ phone, message }) => {
            window.open(`https://wa.me/65${phone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener')   // on the press (REG-534)
            const kind = send.kind
            setSend(null)
            void run(kind === 'invite' ? 'record the invitation' : 'share the notes', () => (kind === 'invite' ? inviteClient(m.id, 'whatsapp') : shareMeeting(m.id, shareNow)), kind === 'invite' ? `Invitation sent to ${first}` : `Notes shared with ${first}`, { refresh: true })
          }} />
      ) : null}
    </PageReveal>
  )
}

/** Write it up instead (a planned meeting held without the co-pilot): the house write-up dialog, then the brief on this page. */
function WriteUpHere({ open, onClose, data }: { open: boolean; onClose: () => void; data: MeetingRoomData }) {
  const { fail, refresh } = useRun()
  const snackbar = useSnackbar()
  const router = useRouter()
  const m = data.meeting
  const [busy, setBusy] = useState(false)
  const today = useMemo(() => { const d = new Date(data.now); d.setHours(0, 0, 0, 0); return d }, [data.now])
  return (
    <WriteUpDialogLazy open={open} onClose={onClose} team={data.team} client={data.lead.name} today={today} busy={busy}
      defaults={{ aim: m.aim as AimKey, when: formatWhen(m.startsAt), whereKind: m.whereKind as WhereKind, memberIds: m.memberIds }}
      onSave={async (v) => {
        const { parseInputDateTime } = await import('@/lib/format')
        const at = parseInputDateTime(v.when)
        if (!at) return false
        setBusy(true)
        const r = await writeUpMeeting({ leadId: data.lead.id, meetingId: m.id, notes: v.notes, aim: v.aim, whereKind: v.whereKind, startsAt: at.getTime(), memberIds: v.memberIds, recording: v.recording ? { name: v.recording.name, data: v.recording.data } : null, consent: v.consent }).catch(() => null)
        setBusy(false)
        if (!r || 'error' in r) { fail('make the brief', r ? refusalOf(r.error) : null); return false }
        const next = r.next   // (S42G)
        snackbar({ message: 'Brief made from the notes', ...(next ? { actionLabel: meetingStepLabel(next), onAction: () => router.push(meetingStepHref(data.lead.id, m.id, next)) } : {}) })
        refresh(); return true
      }} />
  )
}
const formatWhen = (ms: number) => formatInputDateTime(new Date(ms))
