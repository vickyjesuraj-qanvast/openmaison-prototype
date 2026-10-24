'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'motion/react'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { useOverflow } from '@/components/om/use-overflow'
import { FootStart, SurfaceFoot, SurfaceHead, surfaceClasses } from '@/components/om/dialog'
import { REFUSED_KEY, Tooltip } from '@/components/om/tooltip'
import { useSnackbar, useSnackbarDismiss } from '@/components/om/snackbar'
import { useSheetFootLift } from '@/components/om/sheet'
import { IconButton } from '@/components/om/icon-button'
import { ScreenBar } from '@/components/quotes/screen/screen-bar'
import { couldnt } from '@/components/leads/tasks/use-run'
import { useOnTheMove } from '@/components/leads/log/use-move-layout'
import { MoveScreen } from './screen-context'
import { MOBILE, useMediaQuery } from '@/lib/breakpoint'
import { modalPanel, overlayFade, duration, ease, spring } from '@/lib/motion'
import { STAGES, type Stage, reminderTaskTitle } from '@/lib/leads/enums'
import type { MoveTask } from '@/app/leads/actions'
import type { LeadRow } from '@/lib/leads/queries'
import { detailHref } from '@/lib/leads/stage-policy'
import { fetchStageDocuments, type StageDocuments } from '@/app/leads/quotes-actions'
import { fetchAttachLibrary } from '@/app/leads/files-actions'
import { uploadPicked } from '@/components/leads/files/upload-picture'
import { AttachFilesModal } from '@/components/leads/tasks/attach-files-modal'
import { FILL_ORDER, fillWords, readContactFile, type ContactFill } from '@/lib/leads/contact-fill'   // (S43B · F1-01)
import { fetchQuoteSendRule, fetchStageAsks, fetchUsualSplit } from '@/app/leads/actions'
import { fetchHeldMeetingForMet } from '@/app/meetings/actions'   // (S42G)
import type { LeadFile, Member } from '@/lib/db/schema'
import type { StageMovement } from '@/lib/settings/types'
import { NewPanel, ContactedPanel, MetPanel, QuoteSentPanel, WonPanel, approvedQuoteRows, signedContractRows, signedQuoteRows, wonQuoteRows, type MoveStep, type SendRule } from './panels'
import { AutoFillDialog, SuggestedTasksDialog } from './dialogs'
import { LinkButton } from './fields'
import { defaultMilestones, emptyLog, emptyMeeting, emptyWizardData, validateStage, SYSTEM_CONTRACT, SYSTEM_QUOTE, type ContactLog, type MeetingLog, type StageAsks, type StageErrors, type WizardData } from './types'
import { formatInputDateTime, parseInputDateTime } from '@/lib/format'
import styles from './wizard.module.css'
import { useScrollLock } from '@/components/om/use-scroll-lock'
import { useDialogFocus, useEscapeLayer } from '@/components/om/surface'
import { ReadOnlyScope } from '@/components/om/read-only'

const SUGGESTED = 'Prepare sample designs and floor plan illustrations for the client'

type RailState = 'done' | 'active' | 'todo' | 'locked'

/** (UX audit 2026-09-30, Q1 · C1 · L2) What a hand-off link (`?move=<step>&quote=|contract=|log=`, lib/leads/move-link.ts) brings
    already picked: a quote (for a contract, the quote it was raised from), a signed contract, a Notes-tab contact log. */
export type MovePick = { quoteId?: string | null; contractId?: string | null; log?: ContactLog | null; /** (pending modules S23) a held meeting, as the Met step's log */ meeting?: MeetingLog | null }
const isBlankLog = (l: ContactLog | undefined) => !!l && !l.channel && !l.when && !l.outcome && !l.nextStepWhen && !l.nextStepMode && !l.files.length && !l.notes.trim()
/** (S42G) a Met log nobody has started — a carried meeting takes its place */
const isBlankMeeting = (m: MeetingLog | undefined) => !!m && !m.where && !m.when && !m.files.length && !m.notes.trim() && !m.meetingId

/**
 * Move stage (780:83579 / 780:91593) under stage-movement policy (user 2026-08-29):
 * one stage is open for capture — the one the lead is moving into. Stages the lead
 * has already passed stay editable (a mistake can be fixed and saved); later stages
 * are locked until the current one is done. Flexible movement only opens this
 * window for Won (it creates the project), with the same rail.
 */
export function MoveStageWizard({
  lead, team, targetStage, mode = 'linear', onClose, onSave, onUpdate, onCreateQuote, onCreateContract, assignable = null, pick = null,
}: {
  lead: LeadRow
  team: Member[]
  /** (REG-601) The members this viewer may assign in the New step — null = everyone. */
  assignable?: string[] | null
  targetStage: Stage
  mode?: StageMovement
  onClose: () => void
  /** `quoteNumber` (REG-340): the signed system quote's "OM-nnnnn" on a Won move, for the "Project created" snackbar; null for an upload. */
  /** (REG-608) `tasks`: plain titles are General and undated; the Contacted reminder rides as a dated Follow-up for the lead's members. */
  /** (Leads on the move, P-04 — "a refusal stays in the foot and nothing typed is lost (the window never closes on a refused move)") The host
      answers the server's refusal as a sentence: the window keeps everything typed and says it in its foot; a host that closes the window
      itself on success answers nothing. */
  onSave: (payload: { toStage: Stage; data: WizardData; tasks: MoveTask[]; quoteNumber: string | null }) => void | Promise<string | null | void>
  /** Saving edits to a stage the lead has already completed — no move. The same answer as `onSave`. */
  onUpdate: (payload: { stage: Stage; data: WizardData }) => void | Promise<string | null | void>
  /** (REG-340) The From System empty states' "Create Quote ›" / "Create Contract ›". Default: the lead's tab with `?new=1`;
   *  the Overview passes its own so the Qanvast origin rides along. */
  onCreateQuote?: () => void
  onCreateContract?: () => void
  /** (UX audit 2026-09-30) The documents a hand-off link brings — applied to the step being entered, never to a completed one. */
  pick?: MovePick | null
}) {
  useScrollLock(true)   // the page never scrolls behind this surface
  /* (REG-273) Touch: a locked stage explains itself through a Tooltip, and the DS Tooltip never fires for a
     touch pointer — so below 768 the tap answers with the same sentence in the app's snackbar instead. The
     breakpoint has to be read in render because it decides whether the row has a click handler at all; the
     server snapshot is always the desktop answer, so nothing changes for a mouse. */
  const snackbar = useSnackbar()
  const touch = useMediaQuery(MOBILE)
  /* (Leads on the move, P-04 — his marks 2026-10-23, "continue the leads") On a phone and a tablet held upright the window is ONE STEP PER SCREEN:
     a 56 bar "Move to Met" over "Farah Ahmad · step 3 of 5", no rail, only that step's fields, one filled Save & move at 48 in the foot. A
     tablet held sideways and the desk keep the centred window with its rail, as they were. */
  const screen = useOnTheMove()
  const dismissSnack = useSnackbarDismiss()
  useEffect(() => { if (screen) dismissSnack(REFUSED_KEY) }, [screen, dismissSnack])   // (B-14) the refusal said before it never rests on the step
  // R3: Esc closes the window when it is the topmost surface (an inner dialog / menu / picker owns Esc while open); focus
  // moves in on open and returns to the opener on close (components/om/surface.ts).
  const panelRef = useRef<HTMLDivElement>(null)
  const railRef = useRef<HTMLDivElement>(null)
  useEscapeLayer(true, panelRef, onClose)
  useDialogFocus(true, panelRef)
  useSheetFootLift(screen, panelRef)   // (on the move) a snackbar raised from the step rests above its foot, never on Save & move
  const [scrollRef, bodyScrolls] = useOverflow()   // the footer's shadow follows the body's scroll (REG-322)
  /* (on the move, P-03's rule) a log being written now opens at now — Change picks another moment; read once, as the window opens */
  const [openedAt] = useState(() => Date.now())
  const nowStamp = formatInputDateTime(new Date(openedAt))
  // On Hold / Lost leads resume from the stage they left; a lead with no history starts before New.
  const fromIdx = STAGES.indexOf((STAGES as readonly string[]).includes(lead.stage) ? lead.stage as (typeof STAGES)[number] : lead.resumeStage as (typeof STAGES)[number])
  const [active, setActive] = useState<Stage>(targetStage)
  /* (UX audit 2026-09-30) A hand-off fills the step being ENTERED; a completed stage opens as it was recorded. */
  const entering = STAGES.indexOf(targetStage as (typeof STAGES)[number]) > fromIdx
  /* (on the move) a log whose only value is the opening moment is still a blank one — a hand-off's log or a held meeting takes its place */
  const unstamped = <L extends { when: string }>(l: L | undefined): L | undefined => (l && l.when === nowStamp ? { ...l, when: '' } : l)
  const unstampedRef = useRef(unstamped)   // the opening moment never changes — read by the held meeting's late arrival below
  const initialData = (): WizardData => {
    const base: WizardData = {
      ...emptyWizardData(lead.assignees.map((m) => m.id)),
      ...lead.stageData,                              // what earlier saves recorded, so completed stages open filled in
      assignees: lead.assignees.map((m) => m.id),
    }
    /* (pending modules S23) A meeting held with the co-pilot (or written up) arrives as the Met entry — the meeting IS the log, its id with it;
       the blank first log takes it, else it joins the list (a meeting already in the list is never added twice). */
    const met = pick?.meeting
    if (met && targetStage === 'Met' && entering) {
      if (base.meetings.some((m) => m.meetingId === met.meetingId)) return base
      return { ...base, meetings: base.meetings.length === 1 && !base.meetings[0]!.where && !base.meetings[0]!.when ? [met] : [...base.meetings.map((m) => ({ ...m, collapsed: true })), met] }
    }
    /* (L2) A contact log saved on the Notes tab arrives as the Contacted entry: the blank first log takes it, else it joins the list. */
    const log = pick?.log
    if (!log || targetStage !== 'Contacted' || !entering) return base
    return { ...base, logs: base.logs.length === 1 && isBlankLog(base.logs[0]) ? [log] : [...base.logs.map((l) => ({ ...l, collapsed: true })), log] }
  }
  const [data, setData] = useState<WizardData>(() => {
    const d = initialData()
    if (!screen || !entering) return d
    /* (on the move) the step being entered opens its fresh logs at now */
    if (targetStage === 'Contacted') return { ...d, logs: d.logs.map((l) => (l.when ? l : { ...l, when: nowStamp })) }
    if (targetStage === 'Met') return { ...d, meetings: d.meetings.map((m) => (m.when || m.meetingId ? m : { ...m, when: nowStamp })) }
    return d
  })
  const [dir, setDir] = useState(1)
  /* (REG-340) The From System lists are the lead's own quotes and contracts, read once when the window opens (the listing
     and the Overview never load them). Until they land the lists draw nothing; a failed read lists nothing, which leaves
     Upload as the way through. The stored selection is a document NAME: the untouched defaults (SYSTEM_QUOTE / SYSTEM_CONTRACT,
     what emptyWizardData and every earlier stage log hold) resolve to the first row this lead actually has — or to nothing,
     so a lead without an approved quote is asked to choose or upload (validateStage), never let through on a name it lacks. */
  const [docs, setDocs] = useState<StageDocuments | null>(null)
  /* (UX audit 2026-09-30, Q1) The studio's quote-approval rule, read with the documents: Quote Sent lists the quotes the move may send
     and names the approval one still needs. A failed read keeps the old list (approved and sent quotes only). */
  const [rule, setRule] = useState<SendRule | null>(null)
  /* (pending modules S05 — Manage Stages) what the studio set the steps to ask for, read with the documents; the defaults until it lands */
  const [stageAsks, setStageAsks] = useState<StageAsks>({})
  /* (held calls 2026-10-24) the studio's usual split — where Won's uploaded signed quote starts, at every width (panels.tsx `uploadSplit`) */
  const [usualSplit, setUsualSplit] = useState<WizardData['milestones'] | null>(null)
  /* (pending modules S05 — REG-149's 'Q-101' stand-in retired) the lead's files, for the steps' Attach rows: the house Attach files modal over
     the window — pick from Files or upload (the Files tab's own upload) — and the tiles are the files themselves */
  const [library, setLibrary] = useState<LeadFile[]>([])
  type AttachTarget = { kind: 'log' | 'meeting'; index: number } | { kind: 'quoteMeeting' | 'quoteRender' }
  const [attachFor, setAttachFor] = useState<AttachTarget | null>(null)
  const fileOf = (id: string) => library.find((f) => f.id === id)
  const pickRef = useRef({ pick, entering, targetStage })
  useEffect(() => {
    let live = true
    void fetchAttachLibrary(lead.id).then((files) => { if (live) setLibrary(files) }, () => {})
    /* (S42G — S23's rule "a meeting held IS the Met log", kept wherever Met is reached) Entering Met by any door with no meeting picked — the stage
       pill, the header's next step, the listing, the kanban, Maison AI — the lead's latest held meeting that no Met log holds yet arrives as the
       step's log, as the meeting's own offer brings it (`?meeting=`): the blank first log takes it, else it joins the list; never twice. */
    const at = pickRef.current
    if (at.targetStage === 'Met' && at.entering && !at.pick?.meeting) {
      void fetchHeldMeetingForMet(lead.id).then((met) => {
        if (!live || !met) return
        setData((cur) => cur.meetings.some((x) => x.meetingId === met.meetingId) ? cur
          : { ...cur, meetings: cur.meetings.length === 1 && isBlankMeeting(unstampedRef.current(cur.meetings[0])) ? [met] : [...cur.meetings.map((x) => ({ ...x, collapsed: true })), met] })
      }, () => {})
    }
    void fetchUsualSplit().then((rows) => { if (live && rows) setUsualSplit(rows) }, () => {})
    void Promise.all([fetchStageDocuments(lead.id), fetchQuoteSendRule().catch(() => null), fetchStageAsks().catch(() => ({}))]).then(
      ([d, r, asks]) => {
        if (!live) return
        setDocs(d)
        setRule(r)
        setStageAsks(asks)
        const { pick: p, entering: fresh, targetStage: into } = pickRef.current
        setData((cur) => {
          const resolve = (stored: string | null, sentinel: string, names: string[]) =>
            stored === sentinel && !names.includes(sentinel) ? names[0] ?? null : stored
          const sendable = approvedQuoteRows(d, r).filter((q) => !q.hold)
          const quoteSelected = resolve(cur.quoteSelected, SYSTEM_QUOTE, sendable.map((q) => q.name))
          const next: WizardData = {
            ...cur,
            quoteSelected,
            quoteSelectedId: cur.quoteSelectedId ?? sendable.find((q) => q.name === quoteSelected)?.id ?? null,
            wonQuote: resolve(cur.wonQuote, SYSTEM_QUOTE, signedQuoteRows(d).map((q) => q.name)),
            wonContract: resolve(cur.wonContract, SYSTEM_CONTRACT, signedContractRows(d).map((c) => c.name)),
          }
          if (!p || !fresh) return next
          /* The hand-off's documents, picked on the step being entered: the sent / confirmed quote for Quote Sent (Q1); the signed
             contract and the quote it was raised from for Won (C1) — each only where that step's list carries it. */
          const q = p.quoteId ? d.quotes.find((x) => x.id === p.quoteId) : undefined
          const c = p.contractId ? signedContractRows(d).find((x) => x.id === p.contractId) : undefined
          if (into === 'Quote Sent' && q) return { ...next, quoteTab: 'system', quoteSelected: q.title, quoteSelectedId: q.id }
          if (into === 'Won') {
            const signed = q ? signedQuoteRows(d).find((x) => x.id === q.id) : undefined
            return {
              ...next,
              ...(signed ? { wonQuoteTab: 'system' as const, wonQuote: signed.name, wonQuoteUploaded: null, milestones: defaultMilestones() } : {}),
              ...(c ? { wonContractTab: 'system' as const, wonContract: c.name } : {}),
            }
          }
          return next
        })
      },
      () => { if (live) setDocs({ quotes: [], contracts: [] }) },
    )
    return () => { live = false }
  }, [lead.id])
  const router = useRouter()
  const createQuote = onCreateQuote ?? (() => { onClose(); router.push(`${detailHref(lead.id, 'quotes')}?new=1`) })
  const createContract = onCreateContract ?? (() => { onClose(); router.push(`${detailHref(lead.id, 'contracts')}?new=1`) })
  // A completed stage is read-only until Edit (user 2026-08-29). Log stages unlock per log ('logs.0', 'meetings.1'); other stages as a whole ('stage').
  const [unlocked, setUnlocked] = useState<Set<string>>(() => new Set())
  const unlock = (k: string) => setUnlocked((u) => new Set(u).add(k))
  const [showErrors, setShowErrors] = useState(false)
  // Day-granular today for the date pickers — read once, never Date.now() in render output.
  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d }, [])
  // Auto Fill targets the log whose button was pressed (index into logs / meetings); null = dialog closed.
  const [autoFillFor, setAutoFillFor] = useState<number | null>(null)
  const autoFillOpen = autoFillFor !== null
  /* (S43B · F1-01) what Auto Fill read, per log ('logs.0' · 'meetings.1') — said at the top of that log */
  const [fillNotes, setFillNotes] = useState<Record<string, string>>({})
  const [suggestOpen, setSuggestOpen] = useState(false)
  const [pickedTasks, setPickedTasks] = useState<Set<string>>(() => new Set())   // (REG-553) suggestions start unticked — the tick is the reader's choice, as the Notes tab's dialog already does
  const [autoAddedTask, setAutoAddedTask] = useState('')
  const [autoAddedDue, setAutoAddedDue] = useState<string | null>(null)   // (REG-608) the schedule's own moment, ISO — the reminder's due date

  // (REG-269) Mobile: the stage rail is a horizontal strip across the top of the sheet, so the open stage has to be
  // scrolled into view. Move the strip's OWN scrollLeft — scrollIntoView would scroll the sheet's ancestors too and
  // break the sticky header / footer. A no-op at desktop, where the vertical rail never overflows sideways.
  useEffect(() => {
    const rail = railRef.current
    if (!rail || rail.scrollWidth <= rail.clientWidth) return
    const item = rail.querySelector<HTMLElement>('[data-state="active"]')
    if (!item) return
    const railBox = rail.getBoundingClientRect()
    const itemBox = item.getBoundingClientRect()
    rail.scrollLeft += itemBox.left - railBox.left - (railBox.width - itemBox.width) / 2   // centred; the browser clamps the range
  }, [active])

  /* (Leads on the move, P-04 — "a refusal stays in the foot and nothing typed is lost") the move in flight, and the server's refusal said in the
     foot — the window keeps everything typed; the next change clears it. At every width (the desk's window closed before the server answered). */
  const [pending, setPending] = useState(false)
  const [refusal, setRefusal] = useState<string | null>(null)
  const alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  const commit = (run: () => void | Promise<string | null | void>) => {
    setRefusal(null)
    const r = run()
    if (!r || typeof (r as Promise<unknown>).then !== 'function') return
    setPending(true)
    void (r as Promise<string | null | void>).then(
      (msg) => { if (alive.current && typeof msg === 'string' && msg) setRefusal(msg) },
      () => { if (alive.current) setRefusal('Couldn’t move the lead — please try again') },
    ).finally(() => { if (alive.current) setPending(false) })
  }
  const update = (patch: Partial<WizardData>) => { setData((d) => ({ ...d, ...patch })); setRefusal(null) }
  /* (UX audit 2026-09-30, Q1) A system quote the studio's approval still holds back can't be marked sent — the step says why. */
  const quoteHoldOf = (d: WizardData): string | null => {
    if (d.quoteTab !== 'system' || !docs) return null
    const row = approvedQuoteRows(docs, rule).find((q) => (d.quoteSelectedId ? q.id === d.quoteSelectedId : q.name === d.quoteSelected))
    return row?.hold ?? null
  }
  /* (fix-A, A-15) Won: a quote not signed yet can't be the signed quote — the step says why, as Quote Sent's approval does */
  const wonHoldOf = (d: WizardData): string | null => (d.wonQuoteTab === 'system' && docs ? wonQuoteRows(docs).find((q) => q.name === d.wonQuote)?.hold ?? null : null)
  const check = (stage: Stage, d: WizardData): StageErrors => {
    /* (pending modules S05) the studio's asks: the next call or meeting only when the lead is moving INTO Contacted — a correction of a
       stage it passed long ago never stops on a rule turned on since; the signed contract on every Won save */
    const asks: StageAsks = { wonContract: stageAsks.wonContract, contactNextStep: stage === 'Contacted' && STAGES.indexOf('Contacted') > fromIdx ? stageAsks.contactNextStep : false }
    const e = validateStage(stage, d, asks)
    const hold = stage === 'Quote Sent' ? quoteHoldOf(d) : null
    const wonHold = stage === 'Won' ? wonHoldOf(d) : null
    const held = hold && !e.quote ? { ...e, quote: hold } : e
    return wonHold && !held.wonQuote ? { ...held, wonQuote: wonHold } : held
  }
  // Errors only surface after the first Save attempt, then re-compute live so each clears as the user fixes it.
  const errors: StageErrors = showErrors ? check(active, data) : {}

  const activeIdx = STAGES.indexOf(active as (typeof STAGES)[number])
  const editing = activeIdx <= fromIdx           // a completed stage is open
  /* (REG-334, user 2026-09-04) A lead still in New owns its members here: the New panel is editable and Save assigns them.
     Past New the panel stays read-only (members move through the Assign popover), as before. */
  const newOpen = active === 'New' && fromIdx === 0
  const logKey = active === 'Contacted' ? 'logs' : active === 'Met' ? 'meetings' : null   // stages that are a list of logs (780:89150 / 780:90234)
  const stageLocked = editing && !logKey && !unlocked.has('stage') && !newOpen   // whole-stage read-only (Quote Sent / Won); New only while the lead has left it (REG-334)
  const lockedLog = (i: number) => editing && !unlocked.has(`${logKey}.${i}`)
  // Removing a log shifts the later ones down — their unlock keys move with them.
  const deleteLog = (i: number) => {
    if (!logKey) return
    setData((d) => logKey === 'logs' ? { ...d, logs: d.logs.filter((_, j) => j !== i) } : { ...d, meetings: d.meetings.filter((_, j) => j !== i) })
    const shift = (k: string): string[] => {
      const m = new RegExp(`^${logKey}\\.(\\d+)$`).exec(k)
      if (!m) return [k]
      const n = Number(m[1])
      return n === i ? [] : n > i ? [`${logKey}.${n - 1}`] : [k]
    }
    setUnlocked((u) => new Set(Array.from(u).flatMap(shift)))
    setFillNotes((n) => Object.fromEntries(Object.entries(n).flatMap(([k, v]) => shift(k).map((x) => [x, v] as const))))   // (S43B) each line stays with its log
  }
  const anyOpen = !editing || unlocked.size > 0 || newOpen
  // Reviewing a completed stage never locks the stage being entered — it stays open ('todo') to come back to.
  const railState = (stage: Stage, i: number): RailState => {
    if (stage === active) return 'active'
    if (i <= fromIdx) return 'done'
    if (stage === targetStage || i === fromIdx + 1) return 'todo'   // the next stage stays reachable even when a done stage was opened for viewing
    return 'locked'
  }
  // (REG-334) New is complete only once someone owns the lead (REG-130): a member-less lead in New shows New open, not checked.
  const isDone = (i: number) => i < fromIdx || (i === fromIdx && (i > 0 || data.assignees.length > 0))
  const railIcon = (state: RailState, done: boolean) => done ? 'check_circle' : state === 'locked' ? 'lock' : 'circle'
  // Same phrase as the listing's blockedReason (workspace.tsx): the lead's next stage is the gate.
  const lockReason = (i: number) =>
    mode === 'linear' ? `Complete ${STAGES[fromIdx + 1]} first` : `Available once the lead reaches ${STAGES[i - 1]}`

  const goTo = (stage: Stage, i: number) => {
    setDir(i > activeIdx ? 1 : -1)
    setActive(stage)
    setShowErrors(false)
    setUnlocked(new Set())
  }

  /** (pending modules S05) Files picked for a step land on it: a log's names and ids together (an older log's bare names keep their place). */
  const attachTo = (t: AttachTarget, picked: LeadFile[]) => {
    if (!picked.length) return
    const names = picked.map((f) => f.name), ids = picked.map((f) => f.id)
    const add = <L extends { files: string[]; fileIds?: string[] }>(l: L): L => ({ ...l, files: [...l.files, ...names], fileIds: [...(l.fileIds ?? l.files.map(() => '')), ...ids] })
    setData((d) => t.kind === 'log' ? { ...d, logs: d.logs.map((l, i) => (i === t.index ? add(l) : l)) }
      : t.kind === 'meeting' ? { ...d, meetings: d.meetings.map((m, i) => (i === t.index ? add(m) : m)) }
      : t.kind === 'quoteMeeting' ? { ...d, quoteMeetingFiles: [...(d.quoteMeetingFiles ?? []), ...ids] }
      : { ...d, quoteRenderFiles: [...(d.quoteRenderFiles ?? []), ...ids] })
  }
  const attachedOf = (t: AttachTarget | null): string[] => (!t ? [] : t.kind === 'log' ? data.logs[t.index]?.fileIds ?? [] : t.kind === 'meeting' ? data.meetings[t.index]?.fileIds ?? []
    : t.kind === 'quoteMeeting' ? data.quoteMeetingFiles ?? [] : data.quoteRenderFiles ?? [])
  /** The modal's upload — the Files tab's own (bytes kept); the new file joins the library so its tile can draw it. */
  const uploadForAttach = (file?: File) => (file ? uploadPicked(lead.id, file).then((r) => { if (r && !('error' in r)) setLibrary((l) => [r, ...l.filter((x) => x.id !== r.id)]); return r }) : undefined)
  /* (Leads on the move, P-03 · Q-02) Take a photo · Choose a file on a log: the picked file goes up at once through the same upload and joins the
     log; a refusal says why; the log's rows read "Uploading…" while it travels */
  const [uploadingAt, setUploadingAt] = useState<Record<string, number>>({})
  const pickFileFor = (kind: 'log' | 'meeting', index: number, file: File) => {
    const key = `${kind}.${index}`
    const step = (n: number) => setUploadingAt((u) => ({ ...u, [key]: Math.max(0, (u[key] ?? 0) + n) }))
    step(1)
    void uploadPicked(lead.id, file).then((r) => {
      if (r && !('error' in r)) { setLibrary((l) => [r, ...l.filter((x) => x.id !== r.id)]); attachTo({ kind, index }, [r]) }
      else snackbar({ message: couldnt(`upload ${file.name}`, r && 'error' in r ? r.error : null) })
    }, () => snackbar({ message: couldnt(`upload ${file.name}`, null) })).finally(() => step(-1))
  }
  /** Add Log — the new log opens for capture, the others keep their lock (user 2026-08-29); on the move it opens at now. */
  const addLog = () => {
    if (!logKey) return
    unlock(`${logKey}.${logKey === 'logs' ? data.logs.length : data.meetings.length}`)
    const when = screen ? formatInputDateTime(new Date()) : ''
    setData((d) => logKey === 'logs'
      ? { ...d, logs: [...d.logs.map((l) => ({ ...l, collapsed: true })), { ...emptyLog(), when }] }
      : { ...d, meetings: [...d.meetings.map((x) => ({ ...x, collapsed: true })), { ...emptyMeeting(), when }] })
  }

  /* (S43B · F1-01 — his "fix all the pending things" 2026-10-15, as recommended; REG-319's scripted fill retired) Auto Fill READS the picked
     file by rule (lib/leads/contact-fill.ts): what it plainly says lands only where the log is still empty (what was entered is kept, and said
     so); the file itself goes up to the lead's Files and onto the log, as before (S05) — a picture too, filling nothing; the line at the top of
     the log says what filled and what wasn't found, or why the file couldn't be read. Save then works out the reminder from the logs (REG-319). */
  const handleAutoFillUpload = async (file: File) => {
    const target = autoFillFor
    if (target === null) return
    const meeting = active === 'Met'
    const kind = meeting ? 'meeting' : 'contact'
    const read = await readContactFile(file, { kind, now: new Date(), members: team.map((m) => ({ name: m.name, email: m.email })) })
    const into: AttachTarget = { kind: meeting ? 'meeting' : 'log', index: target }
    void uploadPicked(lead.id, file).then((r) => { if (r && !('error' in r)) { setLibrary((l) => [r, ...l]); attachTo(into, [r]) } else snackbar({ message: `Couldn’t upload ${file.name} — please attach it again` }) }, () => snackbar({ message: `Couldn’t upload ${file.name} — please attach it again` }))
    const filled: (keyof ContactFill)[] = [], kept: (keyof ContactFill)[] = []
    if (read.ok) {
      const cur = (meeting ? data.meetings[target] : data.logs[target]) as Record<string, unknown> | undefined
      /* (on the move) a log's opening moment is the window's default, not what was entered — the file's own moment takes its place */
      const blank = (k: string, v: unknown) => !String(v ?? '').trim() || (screen && k === 'when' && v === nowStamp)
      for (const k of FILL_ORDER) {
        const v = read.fill[k]
        if (!v || !cur || !(k in cur)) continue
        const had = blank(k, cur[k]) ? '' : String(cur[k] ?? '').trim()
        if (!had) filled.push(k)
        else if (had !== v) kept.push(k)
      }
      const patch = Object.fromEntries(filled.map((k) => [k, read.fill[k]!]))
      setData((d) => meeting
        ? { ...d, meetings: d.meetings.map((m, i) => (i === target ? { ...m, ...Object.fromEntries(Object.entries(patch).filter(([k]) => blank(k, (m as Record<string, unknown>)[k]))) } : m)) }
        : { ...d, logs: d.logs.map((l, i) => (i === target ? { ...l, ...Object.fromEntries(Object.entries(patch).filter(([k]) => blank(k, (l as Record<string, unknown>)[k]))) } : l)) })
    }
    setFillNotes((n) => ({ ...n, [`${meeting ? 'meetings' : 'logs'}.${target}`]: fillWords({ file: file.name, kind, read, filled, kept }) }))
    setAutoFillFor(null)
  }

  /* (UX audit 2026-09-30, L2) A refused Save brings its first message into view — the attach row's sat below the fold, and only the
     foot said anything was wrong. Two frames: a collapsed log that holds the error opens in the first. */
  const revealError = () => requestAnimationFrame(() => requestAnimationFrame(() => {
    const el = panelRef.current?.querySelector<HTMLElement>('[role="alert"], [aria-invalid="true"]')
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }))
  const save = () => {
    const errs = check(active, data)
    if (Object.keys(errs).length) {
      setShowErrors(true)
      revealError()
      // Never hide an error inside a collapsed log (REG-124) — for both log-list stages.
      if (logKey) {
        const errored = (i: number) => Object.keys(errs).some((k) => k.startsWith(`${logKey}.${i}.`))
        setData((d) => logKey === 'logs'
          ? { ...d, logs: d.logs.map((l, i) => l.collapsed && errored(i) ? { ...l, collapsed: false } : l) }
          : { ...d, meetings: d.meetings.map((m, i) => m.collapsed && errored(i) ? { ...m, collapsed: false } : m) })
      }
      return
    }
    if (pending) return
    if (editing) { commit(() => onUpdate({ stage: active, data })); return }
    if (active === 'Contacted') {
      // Journey (user 2026-08-29): fields (manual or Auto Fill) → Save → Suggested tasks → Save there completes the stage.
      // Logs append oldest → newest (Add Log), so the operative commitment is the last one with a next step —
      // the first match dated the task from a superseded log.
      // (REG-319) The reminder the helper promises: from the last log that scheduled something — none scheduled, no auto-added task.
      const last = [...data.logs].reverse().find((l) => l.nextStepWhen)
      const reminder = last ? reminderTaskTitle(last.nextStepWhen, last.nextStepMode) : ''
      /* (UX audit 2026-09-30, L2) A log brought over from the Notes tab may already have raised its reminder there — never twice. */
      setAutoAddedTask(reminder && !lead.tasks.some((t) => t.title === reminder) ? reminder : '')
      setAutoAddedDue(last ? parseInputDateTime(last.nextStepWhen)?.toISOString() ?? null : null)   // (REG-608)
      setSuggestOpen(true)
      return
    }
    commit(() => onSave({ toStage: active, data, tasks: [], quoteNumber: signedQuoteNumber() }))
  }
  /* (REG-608) The auto-added reminder is a dated Follow-up for the lead's members (1.0's follow-up task); the suggestions stay plain. */
  const finishWithTasks = (titles: string[]) => { setSuggestOpen(false); commit(() => onSave({ toStage: active, data, tasks: titles.map((t): MoveTask => (autoAddedTask && t === autoAddedTask ? { title: t, kind: 'Follow-up', dueAt: autoAddedDue, assignLeadMembers: true } : t)), quoteNumber: null })) }
  /** The number of the system quote a Won move selected — an uploaded quote has none the window could know. */
  const signedQuoteNumber = () =>
    active === 'Won' && data.wonQuoteTab === 'system'
      ? docs?.quotes.find((q) => q.status === 'Signed' && q.title === data.wonQuote)?.number ?? null
      : null

  const panelTitle = editing ? `${active} details` : `Moving to ${active}`
  const editLink = stageLocked && active !== 'New' ? (
    <LinkButton icon="edit" onClick={() => unlock('stage')}>Edit</LinkButton>
  ) : null
  // Title row lives outside the read-only scope so Edit (and Add Log) stay clickable while the fields are disabled.
  const head = active === 'New' ? null : (
    <div className={styles.titleRow}>
      <p className={styles.panelTitle}>{panelTitle}</p>
      {logKey ? (
        <LinkButton icon="add" onClick={addLog}>
          Add Log
        </LinkButton>
      ) : editLink}
    </div>
  )
  /* (Leads on the move, P-04) what a log step needs one step per screen: the opening moment, the client's first name, the picked file's upload */
  const first = lead.name.trim().split(/\s+/)[0] ?? lead.name
  const moveStep = (kind: 'log' | 'meeting'): MoveStep | undefined => (screen
    ? { openedAt, first, onPickFile: (i, f) => pickFileFor(kind, i, f), uploadingAt: (i) => (uploadingAt[`${kind}.${i}`] ?? 0) > 0, onAddLog: addLog }
    : undefined)
  const panel = () => {
    switch (active) {
      case 'New': return <NewPanel team={team} data={data} update={update} editable={newOpen} error={errors.assignees} assignable={assignable} />
      case 'Contacted': return <ContactedPanel data={data} update={update} errors={errors} today={today} onAutoFill={setAutoFillFor} fillNote={(i) => fillNotes[`logs.${i}`] ?? null} lockedLog={lockedLog} onEditLog={editing ? (i) => unlock(`logs.${i}`) : undefined} onDeleteLog={deleteLog}
                                                onAttach={(i) => setAttachFor({ kind: 'log', index: i })} fileOf={fileOf}
                                                askNextStep={!!stageAsks.contactNextStep && STAGES.indexOf('Contacted') > fromIdx} move={moveStep('log')} />   // (pending modules S05) the studio's asks
      case 'Met': return <MetPanel data={data} update={update} errors={errors} today={today} onAutoFill={setAutoFillFor} fillNote={(i) => fillNotes[`meetings.${i}`] ?? null} lockedLog={lockedLog} onEditLog={editing ? (i) => unlock(`meetings.${i}`) : undefined} onDeleteLog={deleteLog}
                                    onAttach={(i) => setAttachFor({ kind: 'meeting', index: i })} fileOf={fileOf} move={moveStep('meeting')} />
      case 'Quote Sent': return <QuoteSentPanel data={data} update={update} errors={errors} docs={docs} rule={rule} onCreateQuote={createQuote}
                                                onAttach={(w) => setAttachFor({ kind: w === 'meeting' ? 'quoteMeeting' : 'quoteRender' })} fileOf={fileOf} leadName={lead.name} />
      case 'Won': return <WonPanel data={data} update={update} errors={errors} leadBudgetMinor={lead.budgetMinor} leadName={lead.name} docs={docs} onCreateQuote={createQuote} onCreateContract={createContract} contractOptional={stageAsks.wonContract === false}   // (pending modules S05)
                                    memberNames={lead.assignees.map((m) => m.name)} usualSplit={usualSplit} />
      default: return null
    }
  }

  /* the window's nested surfaces — Auto Fill, the lead's files, Suggested tasks — the same at every width */
  const nested = (
    <>
      <AutoFillDialog open={autoFillOpen} onClose={() => setAutoFillFor(null)} onUpload={handleAutoFillUpload} kind={active === 'Met' ? 'meeting' : 'contact'} />
      {/* (pending modules S05) the steps' Attach rows: the lead's own files, the Files tab's upload */}
      <AttachFilesModal open={!!attachFor} files={library} attached={attachedOf(attachFor)} onClose={() => setAttachFor(null)}
                        onAttach={(ids) => { const t = attachFor; setAttachFor(null); if (t) attachTo(t, ids.map((id) => fileOf(id)).filter((f): f is LeadFile => !!f)) }}
                        onUploadPicked={uploadForAttach} />
      <SuggestedTasksDialog
        open={suggestOpen}
        /* (UX audit 2026-09-30, L10 — supersedes REG-148's Cancel) ✕ / Esc go back to the log, nothing moved; the footer's
           "Move without tasks" says what it does — the stage details are valid, the move completes with no tasks. */
        onClose={() => setSuggestOpen(false)}
        onSkip={() => finishWithTasks([])} skipLabel="Move without tasks"
        onSave={() => finishWithTasks([autoAddedTask, ...Array.from(pickedTasks)].filter(Boolean))}
        autoAdded={autoAddedTask}
        suggestions={[SUGGESTED]}
        picked={pickedTasks}
        onToggle={(s) => setPickedTasks((p) => { const n = new Set(p); if (n.has(s)) n.delete(s); else n.add(s); return n })}
      />
    </>
  )
  const invalidLine = editing ? 'Unable to save. Please fill in the required fields.' : 'Unable to move. Please fill in the required fields.'

  if (screen) {
    /* (Leads on the move, P-04 · B-09 · B-23) One step per screen: the bar says the move and the step, the body only that step's fields, the
       foot one filled button at 48 — Save & move · Create project (Won) · Save changes (a completed step being edited) · Close (read only). */
    const stepN = activeIdx + 1
    const barTitle = editing ? (active === 'New' ? 'Members' : `${active} details`) : `Move to ${active}`
    const footLabel = editing ? (newOpen ? 'Assign' : 'Save changes') : active === 'Won' ? 'Create project' : 'Save & move'
    const footMessage = refusal ?? (showErrors && Object.keys(errors).length ? invalidLine : null)
    return (
      <AnimatePresence>
        <motion.div key="ov" className={styles.overlay} data-move="screen" variants={overlayFade} initial="initial" animate="animate" exit="exit">
          <motion.div ref={panelRef} className={`${surfaceClasses.panel} ${styles.modal}`} data-move="screen" variants={modalPanel} initial="initial" animate="animate" exit="exit"
                      role="dialog" aria-modal="true" aria-label="Move stage" tabIndex={-1} data-testid="move-step-screen">
            <ScreenBar className={styles.stepBar} title={barTitle} subtitle={`${lead.name} · step ${stepN} of ${STAGES.length}`} testId="move-step-bar"
                       leading={<Tooltip label="Close"><IconButton icon="arrow_back" label="Close the move" variant="bare" iconSize={24} iconWeight={300} onClick={onClose} data-kb="back" data-testid="move-step-close" /></Tooltip>}
                       trailing={stageLocked && active !== 'New' ? <LinkButton icon="edit" onClick={() => unlock('stage')}>Edit</LinkButton> : undefined} />
            <div ref={scrollRef} className={styles.stepBody}>
              <div className={styles.stepColumn}>
                <MoveScreen.Provider value>
                  <ReadOnlyScope readOnly={stageLocked}>{panel()}</ReadOnlyScope>
                </MoveScreen.Provider>
              </div>
            </div>
            <SurfaceFoot shadow={bodyScrolls} className={styles.stepFoot}>
              {footMessage ? (
                <motion.p className={styles.stepError} role="alert" data-testid="move-step-refusal"
                          initial={{ x: 0 }} animate={{ x: [0, -4, 4, -4, 0], transition: { duration: duration.sheet } }}>
                  <Icon name="error" size={20} />{footMessage}
                </motion.p>
              ) : null}
              {!anyOpen
                ? <Button variant="secondary" appearance="outlined" className={styles.stepBtn} onPress={onClose} data-testid="move-step-primary">Close</Button>
                : <Button className={styles.stepBtn} onPress={save} isDisabled={pending} data-testid="move-step-primary">{pending ? 'Saving…' : footLabel}</Button>}
            </SurfaceFoot>
          </motion.div>
          {nested}
        </motion.div>
      </AnimatePresence>
    )
  }

  return (
    <AnimatePresence>
      <motion.div key="ov" className={styles.overlay} variants={overlayFade} initial="initial" animate="animate" exit="exit"
                  onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
        <motion.div ref={panelRef} className={`${surfaceClasses.panel} ${styles.modal}`} variants={modalPanel} initial="initial" animate="animate" exit="exit"
                    role="dialog" aria-modal="true" aria-label="Move stage" tabIndex={-1}>
          {/* (REG-725) the house head and foot (components/om/dialog.tsx) and the shell's panel look (r12, level 5): the 64 head with
              its rule inside and the lead · stage line as its subtitle; the foot's top rule always, its shadow only while the step
              scrolls, the validation message on its left. The window keeps its own rail, overlay and phone sheet. */}
          <SurfaceHead title="Move stage" className={styles.head} onClose={onClose}
                       subtitle={<span className={styles.subtitle}><span>{lead.name}</span><span>·</span><span>Current stage: {lead.stage}</span></span>} />
          <div className={styles.body}>
            <div ref={railRef} className={styles.rail} role="tablist" aria-label="Stages">
              {STAGES.map((s, i) => {
                const st = railState(s, i)
                const done = isDone(i)          // a completed stage keeps its check even while it is the open tab
                const locked = st === 'locked'
                return (
                  /* aria-disabled, not `disabled`: a disabled button swallows the pointer, and the tooltip explains the lock.
                     On touch (REG-273) the tooltip cannot fire, so the locked row answers the tap with the same sentence
                     in the snackbar — the second channel the strip needs at ≤767. */
                  <Tooltip key={s} label={locked ? lockReason(i) : ''} side="right" disabled={!locked}>
                    <button type="button" role="tab" aria-selected={s === active} aria-disabled={locked || undefined}
                            className={styles.railItem} data-state={st}
                            onClick={locked
                              ? (touch ? () => snackbar({ message: lockReason(i), key: REFUSED_KEY }) : undefined)   // (S43E W1-01) one keyed snackbar with the house Tooltip's
                              : () => goTo(s, i)}>
                      <motion.span className={styles.railIcon} data-kind={done ? 'done' : st}
                                   initial={false}
                                   animate={done ? { scale: [0.6, 1] } : { scale: 1 }}   /* springs take 2 keyframes max — the overshoot is the pop */
                                   transition={spring.pop}>
                        <Icon name={railIcon(st, done)} size={20}
                              weight={done ? 300 : 400}
                              fill={done} />
                      </motion.span>
                      <span className={styles.railLabel}>{s}</span>
                    </button>
                  </Tooltip>
                )
              })}
            </div>
            {/* .panelWrap carries what this used to hold inline (flex:1 · min-width:0 · relative · overflow hidden);
                it is a class so the ≤767 sheet can add min-height:0 in the column layout (REG-269). */}
            <div className={styles.panelWrap}>
              <AnimatePresence mode="popLayout" custom={dir}>
                <motion.div
                  key={active}
                  ref={scrollRef}
                  className={styles.panel}
                  style={{ height: '100%' }}
                  initial={{ opacity: 0, x: dir * 16 }}
                  animate={{ opacity: 1, x: 0, transition: { duration: duration.step, ease: ease.decelerate } }}
                  exit={{ opacity: 0, x: dir * -16, transition: { duration: duration.modalExit, ease: ease.standard } }}
                >
                  {head}
                  <ReadOnlyScope readOnly={stageLocked}>{panel()}</ReadOnlyScope>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
          <SurfaceFoot shadow={bodyScrolls} className={styles.foot}>
            {refusal || (showErrors && Object.keys(errors).length) ? (
              <FootStart>
                <motion.span className={styles.footError}
                             initial={{ x: 0 }}
                             animate={{ x: [0, -4, 4, -4, 0], transition: { duration: duration.sheet } }}   /* the 280ms shake — no dedicated shake token in lib/motion yet */
                             data-testid="move-refusal"
                >
                  <Icon name="error" size={16} />
                  {refusal ?? invalidLine}
                </motion.span>
              </FootStart>
            ) : null}
            {/* One group, so the phone's stacked foot keeps the pair on one row under the message. */}
            <div className={styles.footBtns}>
              <Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button>
              {!anyOpen ? null : (
                <Button onPress={save} isDisabled={pending}>
                  {editing ? 'Save changes' : active === 'Won' ? 'Save & Convert to Project' : 'Save'}
                </Button>
              )}
            </div>
          </SurfaceFoot>
        </motion.div>

        {nested}
      </motion.div>
    </AnimatePresence>
  )
}
