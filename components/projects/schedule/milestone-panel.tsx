'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import NextLink from 'next/link'
import { Button, Checkbox, Link, SegmentedButton, SegmentedButtonItem, Switch, TextArea } from '@/components/ds'
import { Drawer, DrawerRule } from '@/components/om/drawer'
import { DateField, DateTimeField } from '@/components/om/date-field'
import { TextField } from '@/components/om/text-field'
import { Chips } from '@/components/om/chips'
import { Dialog, FootStart } from '@/components/om/dialog'
import { ConfirmDialog } from '@/components/om/confirm-dialog'
import { Icon } from '@/components/om/icon'
import { MetaChip } from '@/components/om/meta-chip'
import { ReadOnlyNote } from '@/components/company/read-only-note'   // (fix-E, E-17)
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { PortalMenu } from '@/components/om/portal-menu'
import { DropdownItem, MENU_WIDTH } from '@/components/leads/dropdown'
import { OutsideBadge } from '@/components/leads/tasks/outside-person'
import { MOBILE, useMediaQuery } from '@/lib/breakpoint'
import { MSG, type FieldErrors } from '@/lib/forms'
import { money2 } from '@/lib/quotes/math'
import { displayDue, formatInputDateTime, inputDate, parseInputDate, parseInputDateTime } from '@/lib/format'
import { shareWaitLine } from '@/lib/projects/choices-model'   // (simplify S-21, K-C's words)
import { isOutsideKind, type Outside } from '@/lib/leads/outside'
import { withFrom } from '@/lib/nav'
import { askMaisonAi } from '@/lib/maison-ai'   // (parity map, SC-060) P-H's
import {
  CLIENT_NOTE_MAX, DESCRIPTION_MAX, MILESTONE_COLORS, MILESTONE_STATUSES, RESOLVE_MAX, STATUS_LABEL, TITLE_MAX, dateOfDay, dayLabel, dayMonth, dayOf, daysWord, extensionWords, isLate,
  isResolved, midTitle, plural, rangeLabel, spanWord, startedWords, wouldCycle,
  type ExtensionAsk, type Milestone, type MilestoneStatus, type PaymentOption, type WaitingOn,
} from '@/lib/projects/schedule-model'
import type { MilestonePatch } from '@/app/projects/schedule-actions'
import type { MilestoneInvoice, ScheduleTask } from '@/lib/projects/schedule'
import styles from './schedule.module.css'

const NOTHING = 'Nothing. It keeps its own dates'
type ErrKey = 'title' | 'start' | 'end' | 'member' | 'supplier' | 'payment'
const toInput = (n: number) => inputDate(dateOfDay(n))
const fromInput = (s: string): number | null => { const d = parseInputDate(s); return d ? dayOf(d) : null }
const isoDay = (n: number) => new Date(n * 86_400_000).toISOString().slice(0, 10)

/** (gaps build, package C) The asks and answers the panel can make — each resolves true once it lands. */
export type PanelAsks = {
  /** (5) More time: ask (a Designer or a Manager), take it back, answer it (an Owner or an Admin). */
  askMore: (m: Milestone, end: string, reason: string) => Promise<boolean>
  withdrawMore: (x: ExtensionAsk) => Promise<boolean>
  answerMore: (x: ExtensionAsk, o: { approve: boolean; note: string; draftUpdate: boolean }) => Promise<boolean>
  /** (8) A Done waiting: approve, send back with a note, take back. */
  approveDone: (m: Milestone) => Promise<boolean>
  sendBackDone: (m: Milestone, note: string) => Promise<boolean>
  withdrawDone: (m: Milestone) => Promise<boolean>
  /** (9) The client's "not right", answered with a note to them. */
  resolve: (m: Milestone, note: string, askAgain: boolean) => Promise<boolean>
}
/** (gaps build, package C — 11) A milestone's task, edited in place: its due, members, description, the outside person and their send. */
export type PanelTaskEdits = {
  due: (t: ScheduleTask, at: Date | null) => Promise<boolean>
  members: (t: ScheduleTask, ids: string[]) => Promise<boolean>
  description: (t: ScheduleTask, text: string) => Promise<boolean>
  outside: (t: ScheduleTask) => void
  send: (t: ScheduleTask) => void
}

/**
 * (Projects round 2 · Milestone.dc.html) One milestone's panel — the house Drawer (REG-725's head and foot), 560 wide as the canvas draws it, a
 * bottom sheet on a phone. Its layers appear as they are used (Depth.dc.html): the status; When (the dates, "Push it later by", what it moves
 * with, plan against actual, whether it decides the handover); its tasks; then the switches — shown to the client, waiting on someone, a
 * payment that falls due here, asking the client to confirm it. Save sends it all at once (one sentence, one Undo for all of it — B-02);
 * Cancel leaves it as it was, asking first when something was changed (B-35); Delete milestone asks first. A field that is wrong turns red with
 * its own words, and the first one comes into view (B-10). On a phone it also carries the name and a ⋮ (B-41).
 * (gaps build, package C) What waits on an Owner or an Admin first — a Done to approve, more time asked — with its answer; the day it really
 * started; its words, its bar's colour; the further milestones it waits on; its tasks edited in place; its invoices on Money; its last shares;
 * the client's "not right" marked resolved with a note to them; what the client reads about a pause.
 */
export function MilestonePanel({ milestone, readOnlyWhy = null, ...rest }: { milestone: Milestone | null; /** (fix-E, E-17) why every control reads only — said once, at the top */ readOnlyWhy?: string | null } & Omit<FormProps, 'm'>) {
  const phone = useMediaQuery(MOBILE)
  /* (B-35) × · Escape · Cancel go through the page's guard (`onClose`), which asks before unsaved edits are dropped */
  return (
    <Drawer open={!!milestone} title={milestone?.title ?? ''} width="widest" onClose={rest.onClose} label={milestone ? `Milestone ${milestone.title}` : 'Milestone'}
            actions={milestone && phone && rest.mayChange && rest.onPlace ? <PlaceMenu m={milestone} list={rest.list} onPlace={rest.onPlace} /> : undefined}
            footer={milestone ? <PanelFoot mayChange={rest.mayChange} onDelete={() => rest.onDelete(milestone)} onCancel={rest.onClose} formId={`ms-${milestone.id}`} /> : undefined}>
      {milestone && readOnlyWhy && !rest.mayChange ? <ReadOnlyNote text={readOnlyWhy} /> : null}
      {milestone ? <PanelForm key={milestone.id} m={milestone} {...rest} /> : null}
    </Drawer>
  )
}

/** (B-41) The phone panel's ⋮ — the row menu's place in the list (the name is the panel's own field there). */
function PlaceMenu({ m, list, onPlace }: { m: Milestone; list: Milestone[]; onPlace: (m: Milestone, a: 'up' | 'down' | 'add-after') => void }) {
  const [open, setOpen] = useState(false)
  const anchor = useRef<HTMLSpanElement>(null)
  const first = list[0]?.id === m.id, last = list[list.length - 1]?.id === m.id
  const pick = (a: 'up' | 'down' | 'add-after') => () => { setOpen(false); onPlace(m, a) }
  return (
    <span ref={anchor}>
      <Tooltip label="More for this milestone" disabled={open}><IconButton icon="more_vert" label={`More for ${m.title}`} variant="bare" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)} data-testid="panel-kebab" /></Tooltip>
      <PortalMenu open={open} anchor={anchor} onClose={() => setOpen(false)} align="right" width={MENU_WIDTH.wide} role="menu" sheetTitle={m.title}>
        <DropdownItem disabled={first} help={first ? 'It is first' : undefined} onSelect={pick('up')}>Move up</DropdownItem>
        <DropdownItem disabled={last} help={last ? 'It is last' : undefined} onSelect={pick('down')}>Move down</DropdownItem>
        <DropdownItem onSelect={pick('add-after')}>Add a milestone after</DropdownItem>
      </PortalMenu>
    </span>
  )
}

function PanelFoot({ mayChange, onDelete, onCancel, formId }: { mayChange: boolean; onDelete: () => void; onCancel: () => void; formId: string }) {
  return (
    <>
      {/* (B-57) the house danger text button — red, as the canvas draws it and as the access panel's Withdraw is */}
      {mayChange ? <FootStart><button type="button" className={styles.danger} onClick={onDelete} data-testid="panel-delete">Delete milestone</button></FootStart> : null}
      <Button variant="secondary" appearance="outlined" onPress={onCancel}>{mayChange ? 'Cancel' : 'Close'}</Button>
      {mayChange ? <Button onPress={() => (document.getElementById(formId) as HTMLFormElement | null)?.requestSubmit()} data-testid="panel-save">Save</Button> : null}
    </>
  )
}

type FormProps = {
  m: Milestone
  list: Milestone[]
  payments: PaymentOption[] | null
  tasks: ScheduleTask[]
  team: { id: string; name: string; color?: string; role?: string }[]
  client: string
  decider: string | null
  mayChange: boolean
  today: number
  onClose: () => void
  /** Resolves true once the save lands — the panel closes only then. */
  onSave: (m: Milestone, patch: MilestonePatch) => Promise<boolean>
  onDelete: (m: Milestone) => void
  onAddTask: (m: Milestone, title: string) => Promise<boolean>
  onToggleTask: (t: ScheduleTask) => void
  /** (r4b, layer 6) What the client has of it: the day the client was shown it — as done, the first share that carried it done (B-12) —
      null when it is in no share yet. */
  shared?: { day: number; done: boolean } | null
  /** (r4b) After "Something is not right": ask the client to confirm it again. Resolves true once it lands. */
  onAskAgain?: (m: Milestone) => Promise<boolean>
  /** (B-41) The phone panel's place in the list. */
  onPlace?: (m: Milestone, a: 'up' | 'down' | 'add-after') => void
  /** (B-35) Whether anything differs from the milestone as it is — the page's guard reads it before closing or opening another. */
  dirtyRef: { current: boolean }
  /* ── (gaps build, package C) ── */
  projectId?: string
  /** The viewer answers the schedule's asks (an Owner or an Admin), and who they are (whoever asked takes an ask back). */
  answers?: boolean
  viewerId?: string
  /** (5) The open ask for more time on it. */
  extension?: ExtensionAsk | null
  /** (14) Its invoices, as Money names them. */
  invoices?: MilestoneInvoice[]
  /** (12) Its last three shares that changed it for the client. */
  history?: { at: number; was?: string; now: string }[]
  /** (7) It has a change the client has not been shown — Share this change. */
  pending?: boolean
  onShareOne?: (m: Milestone) => void
  asks?: PanelAsks
  taskEdits?: PanelTaskEdits
  /** (gaps build, package C — 10) The Started prompt's Add tasks: the panel opens on its Add a task field. */
  startAdding?: boolean
  /** (simplify S-18 · S-25 (4)) Status → Done opens the Mark done sheet (over the panel) — the date, bringing what follows forward, the ticks */
  onMarkDone?: (m: Milestone) => void
  /** (simplify S-21, K-C's) its wait was started by sharing this choice — "Set by sharing Paint colours" under Waiting on someone */
  shareWait?: string | null
  /** (parity map, SC-056 · TD-023) Suggest tasks — the page opens the tick list (over the panel) for this milestone */
  onSuggest?: (m: Milestone) => void
  /** (S45B · H-UHD-2) its contractors — the page's section (components/projects/contractors/use-crew.tsx), after its tasks */
  crew?: (milestoneId: string) => ReactNode
}

function PanelForm({ m, list, payments, tasks, team, client, decider, mayChange, today, onSave, onAddTask, onToggleTask, shared = null, onAskAgain, dirtyRef,
  projectId, answers = false, viewerId, extension = null, invoices = [], history = [], pending = false, onShareOne, asks, taskEdits, startAdding = false, onMarkDone, shareWait = null, onSuggest, crew }: FormProps) {
  const phone = useMediaQuery(MOBILE)
  const [title, setTitle] = useState(m.title)
  const [status, setStatus] = useState<MilestoneStatus>(m.status)
  /* (simplify S-18) the sheet marked it done (or the page re-read it): the status follows the milestone, the panel's other edits stay */
  const [seenStatus, setSeenStatus] = useState(m.status)
  if (m.status !== seenStatus) { setSeenStatus(m.status); setStatus(m.status) }
  /* (simplify Q-18) the day a later end asked for — the More time dialog opens on it */
  const [askEnd, setAskEnd] = useState<number | null>(null)
  const [endAsked, setEndAsked] = useState<string | null>(null)
  const [start, setStart] = useState(toInput(m.start))
  const [end, setEnd] = useState(toInput(m.end))
  const [follows, setFollows] = useState<string | null>(m.followsId)
  const [after, setAfter] = useState<string[]>(() => (m.after ?? []).map((a) => a.id))
  const [moreLinks, setMoreLinks] = useState((m.after ?? []).length > 0)
  const [description, setDescription] = useState(m.description ?? '')
  const [color, setColor] = useState<string | null>(m.color ?? null)
  const [clientNote, setClientNote] = useState(m.clientNote ?? '')
  /* (parity map, CP-064) a Blocked stage's expected restart — optional; the client reads "Resuming around …" */
  const [resume, setResume] = useState(m.resumeOn != null ? toInput(m.resumeOn) : '')
  const [shown, setShown] = useState(m.clientVisible)
  const [waitOn, setWaitOn] = useState(!!m.waiting)
  const [who, setWho] = useState<WaitingOn>(m.waiting?.on ?? 'client')
  const [member, setMember] = useState(m.waiting?.memberId ?? '')
  const [supplier, setSupplier] = useState(m.waiting?.name ?? '')
  const [waitNote, setWaitNote] = useState(m.waiting?.note ?? '')
  const [until, setUntil] = useState(m.waiting?.until != null ? toInput(m.waiting.until) : '')
  const [payOn, setPayOn] = useState(!!m.paymentRef)
  const [payRef, setPayRef] = useState(m.paymentRef ?? '')
  const [payDue, setPayDue] = useState<'start' | 'end'>(m.paymentDue)
  const [ask, setAsk] = useState(m.confirm.askedAt !== null)
  const [stopAsking, setStopAsking] = useState(false)
  const [newTask, setNewTask] = useState<string | null>(startAdding ? '' : null)
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)
  const [asking, setAsking] = useState(false)
  /* (gaps build, package C) the small dialogs the asks open */
  const [dialog, setDialog] = useState<null | 'more' | 'approve-more' | 'decline-more' | 'send-back' | 'resolve'>(null)
  const [openTask, setOpenTask] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const todayDate = useMemo(() => dateOfDay(today), [today])

  const s = fromInput(start), e = fromInput(end)
  const len = s !== null && e !== null && e >= s ? e - s + 1 : null
  const push = (days: number) => { if (s !== null && e !== null) { setStart(toInput(s + days)); setEnd(toInput(e + days)) } }
  const others = list.filter((x) => x.id !== m.id && !wouldCycle(list, m.id, x.id))
  /* (B-51) options by id: two milestones of one name read apart by their dates */
  const optionLabel = (x: Milestone) => (others.filter((o) => o.title === x.title).length > 1 ? `${x.title} (${rangeLabel(x.start, x.end)})` : x.title)
  const leadM = follows ? list.find((x) => x.id === follows) ?? null : null
  const alsoOptions = others.filter((x) => x.id !== follows)
  const mine = tasks.filter((t) => t.milestoneId === m.id)
  const taken = new Map(list.filter((x) => x.id !== m.id && x.paymentRef).map((x) => [x.paymentRef!, x.title]))
  /* (B-23) the deposit is paid on signing: never offered (one tied before stays shown) */
  const payOptions = (payments ?? []).filter((p) => !taken.has(p.ref) && (!p.onSigning || p.ref === m.paymentRef))
  /* (B-08) the stage's amount as Money prints it, cents and all */
  const payLabel = (p: PaymentOption) => (p.fixedMinor ? `${p.name} · ${money2(p.fixedMinor)}` : `${p.name} · ${Number.isInteger(p.pct) ? p.pct : p.pct.toFixed(1)}%${p.amountMinor ? ` · ${money2(p.amountMinor)}` : ''}`)   // (S44O — row 297) a fixed fee is its amount, never 0%
  const memberName = team.find((x) => x.id === member)?.name ?? ''
  const late = m.plan && m.end !== m.plan.end ? m.end - m.plan.end : 0
  const started = startedWords(m)
  const running = m.status === 'in_progress' || m.status === 'blocked' || isLate(m, today)
  const linksNow = (m.after ?? []).map((a) => a.id)

  /* the patch the panel would send — also what tells it apart from the milestone as it is (B-35) */
  const patchOf = (): MilestonePatch => {
    const patch: MilestonePatch = {}
    if (title.trim() && title.trim() !== m.title) patch.title = title
    if (status !== m.status) patch.status = status
    if (s !== null && e !== null && (s !== m.start || e !== m.end)) { patch.start = isoDay(s); patch.end = isoDay(e) }
    if (follows !== m.followsId) patch.followsId = follows
    const wantAfter = after.filter((x) => x !== follows)
    if (wantAfter.length !== linksNow.length || wantAfter.some((x) => !linksNow.includes(x))) patch.after = wantAfter
    if (description.trim() !== (m.description ?? '').trim()) patch.description = description
    if (color !== (m.color ?? null)) patch.color = color
    if (clientNote.trim() !== (m.clientNote ?? '').trim()) patch.clientNote = clientNote
    /* (parity map, CP-064) the restart day, while it is Blocked — leaving Blocked clears it on the server */
    const resumeDay = status === 'blocked' && resume ? fromInput(resume) : null
    if (status === 'blocked' && resumeDay !== (m.resumeOn ?? null)) patch.resumeOn = resumeDay !== null ? isoDay(resumeDay) : null
    if (shown !== m.clientVisible) patch.clientVisible = shown
    const w = waitOn ? { on: who, memberId: who === 'member' ? member : null, name: who === 'supplier' ? supplier : null, note: waitNote, until: until ? isoDay(fromInput(until) ?? 0) : null } : null
    const was = m.waiting
    if (!!w !== !!was || (w && was && (w.on !== was.on || (w.memberId ?? null) !== was.memberId || (w.name ?? null) !== (was.name ?? null) || (w.note || null) !== (was.note || null) || (w.until ? fromInput(until) : null) !== was.until))) patch.waiting = w
    const pay = payOn ? { ref: payRef, due: payDue } : null
    if ((pay?.ref ?? null) !== m.paymentRef || (pay && pay.due !== m.paymentDue)) patch.payment = pay
    if (ask !== (m.confirm.askedAt !== null)) patch.askConfirm = ask
    return patch
  }
  const isDirty = mayChange && (Object.keys(patchOf()).length > 0 || title.trim() !== m.title)
  useEffect(() => { dirtyRef.current = isDirty }, [isDirty, dirtyRef])
  useEffect(() => () => { dirtyRef.current = false }, [dirtyRef])

  /* (B-10) each wrong field says so itself, in the house words — after the first Save, clearing as it is put right */
  const check = () => {
    const out: FieldErrors<ErrKey> = {}
    if (!title.trim()) out.title = MSG.required
    if (s === null) out.start = start ? MSG.date : MSG.required
    if (e === null) out.end = end ? MSG.date : MSG.required
    else if (s !== null && e < s) out.end = 'Choose a day on or after it starts'
    if (waitOn && who === 'member' && !member) out.member = MSG.choose
    if (waitOn && who === 'supplier' && !supplier.trim()) out.supplier = MSG.required
    if (payOn && !payRef) out.payment = MSG.choose
    return out
  }
  const live: FieldErrors<ErrKey> = tried ? check() : {}
  const err = (k: ErrKey) => live[k]

  const submit = async () => {
    if (!mayChange) return
    const found = check()
    setTried(true)
    if (Object.values(found).some(Boolean)) {
      /* the first wrong field comes into view */
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.scrollIntoView({ block: 'center', behavior: 'smooth' }))
      return
    }
    /* (simplify Q-18) the extension rule restrains: a Designer's or a Manager's later end on a running milestone is the ask for more time —
       the dates go back to as they are, the rest of the panel still saves */
    if (!answers && running && asks && e !== null && e > m.end) {
      if (extension) { setEndAsked(`More time is already asked — an Owner or an Admin answers it`); return }
      setAskEnd(e); setStart(toInput(m.start)); setEnd(toInput(m.end)); setDialog('more'); return
    }
    setBusy(true)
    await onSave(m, patchOf())
    setBusy(false)
  }
  const mineAsk = !!extension && extension.by === viewerId
  const doneMine = !!m.doneAsked && m.doneAsked.by === viewerId
  const run = async (fn: () => Promise<boolean>) => { setAsking(true); try { return await fn() } finally { setAsking(false) } }

  return (
    <form ref={formRef} id={`ms-${m.id}`} className={styles.panel} onSubmit={(ev) => { ev.preventDefault(); void submit() }} data-testid="milestone-panel" aria-busy={busy || undefined}>
      {/* (B-41) on a phone the panel carries the name — the row menu's Rename lives on the desktop's rows */}
      {phone && mayChange ? <TextField label="Name" value={title} maxLength={TITLE_MAX} onChange={setTitle} error={err('title')} /> : null}

      {/* (gaps build, package C — 8) a Done waiting for an Owner or an Admin: their answer here (the bell opens this panel); whoever asked can take it back */}
      {m.doneAsked && m.status !== 'done' ? (
        <div className={styles.askBand} role="status" data-testid="panel-done-ask">
          <Icon name="approval" size={20} weight={300} />
          <span className={styles.askText}>{`${doneMine ? 'You' : team.find((x) => x.id === m.doneAsked!.by)?.name.split(' ')[0] ?? 'A member'} marked it done on ${dayMonth(m.doneAsked.at)}${answers ? ' — approve it?' : ' — waiting for an Owner or an Admin to approve it.'}`}</span>
          {answers && asks ? (
            <span className={styles.askActions}>
              <Button size="sm" onPress={() => { void run(() => asks.approveDone(m)) }} isDisabled={asking} data-testid="approve-done">Approve as done</Button>
              <Button size="sm" variant="secondary" appearance="outlined" onPress={() => setDialog('send-back')} isDisabled={asking} data-testid="send-back-done">Send back</Button>
            </span>
          ) : doneMine && asks ? <Button size="sm" appearance="text" onPress={() => { void run(() => asks.withdrawDone(m)) }} isDisabled={asking} data-testid="withdraw-done">Take it back</Button> : null}
        </div>
      ) : null}
      {/* (gaps build, package C — 5) more time asked: the new last day, how much later, why — answered by an Owner or an Admin */}
      {extension ? (
        <div className={styles.askBand} role="status" data-testid="panel-more-ask">
          <Icon name="hourglass_top" size={20} weight={300} />
          <span className={styles.askText}>{`${mineAsk ? 'You asked' : `${extension.byName.split(' ')[0]} asks`} to end it ${dayLabel(extension.toEnd)}, ${extensionWords(extension)}: “${extension.reason}”${answers ? '' : mineAsk ? ' — waiting for an Owner or an Admin.' : ''}`}</span>
          {answers && asks ? (
            <span className={styles.askActions}>
              <Button size="sm" onPress={() => setDialog('approve-more')} isDisabled={asking} data-testid="approve-more">Approve</Button>
              <Button size="sm" variant="secondary" appearance="outlined" onPress={() => setDialog('decline-more')} isDisabled={asking} data-testid="decline-more">Decline</Button>
            </span>
          ) : mineAsk && asks ? <Button size="sm" appearance="text" onPress={() => { void run(() => asks.withdrawMore(extension)) }} isDisabled={asking} data-testid="withdraw-more">Take it back</Button> : null}
        </div>
      ) : null}

      {/* (B-42) the four statuses share the panel's width — at 390 they never push it sideways */}
      <div className={styles.statusSeg}>
        <SegmentedButton aria-label="Status" selectedKeys={[status]} isDisabled={!mayChange} onSelectionChange={(keys) => {
          const k = [...keys][0]
          /* (simplify S-18 · S-25 (4)) Done opens the Mark done sheet — the date, Bring forward, the client's ticks, the invoice */
          if (k === 'done' && m.status !== 'done' && onMarkDone) { onMarkDone(m); return }
          if (typeof k === 'string' && (MILESTONE_STATUSES as readonly string[]).includes(k)) setStatus(k as MilestoneStatus)
        }}>
          {MILESTONE_STATUSES.map((st) => <SegmentedButtonItem key={st} id={st}>{STATUS_LABEL[st]}</SegmentedButtonItem>)}
        </SegmentedButton>
      </div>
      {status === 'done' && m.status !== 'done' && s === m.start && e === m.end && m.end > today ? <p className={styles.note}>{`It ends today, ${spanWord(m.end - today)} early. What follows keeps its dates.`}</p> : null}
      {/* (gaps build, package C — 10) the day it really started, beside the plan */}
      {started && m.status !== 'not_started' ? <p className={styles.note} data-testid="panel-started">{started}.</p> : null}
      {/* (gaps build, package C) on a Blocked stage, what the client reads about the pause — optional; their schedule says it is paused */}
      {status === 'blocked' ? (
        <TextField label={`What ${client} reads (optional)`} value={clientNote} maxLength={CLIENT_NOTE_MAX} disabled={!mayChange} onChange={setClientNote}
                   helper={`Their schedule says this stage is paused, with these words. Empty, the reason stays with the team.`} />
      ) : null}
      {/* (parity map, CP-064 — 1.0 I-254 "Resuming around {date}") an optional expected restart; the client's schedule says it, or that it passed */}
      {status === 'blocked' ? (
        <DateField label="Expected to resume (optional)" value={resume} onChange={setResume} today={todayDate} disabled={!mayChange} name="panel-resume"
                   helper={resume ? `${client}’s schedule says it resumes around this day — and that the day has passed, if it does.` : `Empty, ${client}’s schedule says it is paused without a day.`} />
      ) : null}
      {/* (parity map, SC-060 — P-H's Maison AI) a quiet way to ask about this one milestone: the sheet opens with the question asked (from the records,
          no credits) */}
      {projectId ? <span className={styles.taskLinks}><Link variant="primary" onPress={() => askMaisonAi({ text: `What should I watch on ${m.title}?`, milestoneId: m.id, projectId })} data-testid="panel-ask-maison">Ask Maison AI about this</Link></span> : null}
      {/* (gaps build, package C — 12) its own words */}
      <TextArea label="Description" value={description} onChange={(v) => setDescription(v.slice(0, DESCRIPTION_MAX))} isDisabled={!mayChange} data-testid="panel-description" />

      <section className={styles.section} aria-label="When">
        <h3 className={styles.sectionTitle}>When</h3>
        <div className={styles.pair}>
          <DateField label="Starts" value={start} onChange={setStart} today={todayDate} disabled={!mayChange} error={err('start')} />
          <DateField label="Ends" value={end} onChange={(v) => { setEnd(v); setEndAsked(null) }} today={todayDate} disabled={!mayChange} error={err('end') ?? endAsked ?? undefined} />
        </div>
        <div className={styles.push}>
          <span>{len !== null ? `${daysWord(len)}.` : 'Choose both dates.'}{mayChange ? ' Push it later by' : ''}</span>
          {mayChange ? [1, 3, 7].map((d) => <Button key={d} variant="secondary" appearance="outlined" size="sm" onPress={() => push(d)}>{spanWord(d)}</Button>) : null}
        </div>
        {/* (gaps build, package C — 5) a Designer or a Manager on a running or late milestone asks for more time — an Owner or an Admin answers */}
        {mayChange && !answers && running && !extension && asks ? <span><Link variant="primary" onPress={() => setDialog('more')} data-testid="ask-more">Ask for more time</Link></span> : null}
        <TextField label="Moves with" mode="select" disabled={!mayChange} value={leadM ? optionLabel(leadM) : NOTHING} options={[...others.map(optionLabel), NOTHING]}
                   onChange={(v) => { const id = v === NOTHING ? null : others.find((x) => optionLabel(x) === v)?.id ?? null; setFollows(id); if (id) setAfter((a) => a.filter((x) => x !== id)) }}
                   helper={leadM ? `If ${midTitle(leadM.title)} moves, ${midTitle(m.title)} moves by the same number of days.` : 'It keeps its own dates when others move.'} />
        {/* (gaps build, package C — 6) it can wait on more than one: it starts once every one of them allows it */}
        {leadM && alsoOptions.length ? (moreLinks || after.length ? (
          <div className={styles.also} data-testid="panel-also">
            <span className={styles.caption}>It also waits for</span>
            <Chips multiple label="It also waits for" disabled={!mayChange} value={after.filter((x) => alsoOptions.some((o) => o.id === x))} options={alsoOptions.map((x) => ({ value: x.id, label: optionLabel(x) }))} onChange={setAfter} />
            {after.length ? <span className={styles.note}>{`It starts once ${listOf([leadM.title, ...after.map((x) => list.find((o) => o.id === x)?.title ?? '')].filter(Boolean))} allow it.`}</span> : null}
          </div>
        ) : mayChange ? <span><Link variant="primary" onPress={() => setMoreLinks(true)} data-testid="panel-also-add">It waits for another milestone too</Link></span> : null) : null}
        {m.plan && late ? <p className={styles.note}>{spanWord(late)} {late > 0 ? 'later' : 'earlier'} than first shared ({dayLabel(m.plan.end)}).</p> : null}
        {decider === m.id ? <p className={styles.note} data-tone="decides">This one decides the handover date.</p> : null}
        {/* (gaps build, package C — 12) the bar's colour: by its status, or one of the eight */}
        <div className={styles.also}>
          <span className={styles.caption}>Bar colour</span>
          <Chips label="Bar colour" disabled={!mayChange} value={color ?? 'status'} onChange={(v) => setColor(v === 'status' ? null : v)} testId="panel-color"
                 options={[{ value: 'status', label: 'By status' }, ...MILESTONE_COLORS.map((c) => ({ value: c.key, label: c.label, swatch: c.hex }))]} />
        </div>
      </section>

      <DrawerRule />
      <section className={styles.section} aria-label="Tasks">
        <div className={styles.sectionHead}><h3 className={styles.sectionTitle}>Tasks</h3><span className={styles.sectionMeta}>{mine.length ? `${mine.filter((t) => t.done).length} of ${mine.length} done` : 'None yet'}</span></div>
        {mine.length ? (
          <div className={styles.tasks}>
            {mine.map((t) => (
              <TaskRow key={t.id} t={t} team={team} today={todayDate} open={openTask === t.id} mayChange={mayChange} projectId={projectId}
                       onOpen={() => setOpenTask((o) => (o === t.id ? null : t.id))} onToggle={() => onToggleTask(t)} edits={taskEdits} />
            ))}
          </div>
        ) : null}
        {mayChange ? (newTask === null
          /* (parity map, SC-056 · TD-023) beside Add a task, Suggest tasks: the quote's lines for this stage and what it usually needs, ticked in a list */
          ? <span className={styles.taskLinks}><Link variant="primary" onPress={() => setNewTask('')} data-testid="panel-add-task">Add a task</Link>{onSuggest ? <Link variant="primary" onPress={() => onSuggest(m)} data-testid="panel-suggest-tasks">Suggest tasks</Link> : null}</span>
          : <TextField label="New task" value={newTask} autoFocus onChange={setNewTask}
                       onKeyDown={(ev) => { if (ev.key === 'Enter') { ev.preventDefault(); const t = newTask.trim(); if (t) void onAddTask(m, t).then((ok) => { if (ok) setNewTask('') }) } if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); setNewTask(null) } }}
                       helper="Enter adds it — due on the milestone’s last day, with the project’s team on it." />) : null}
      </section>
      {crew ? crew(m.id) : null}

      {/* (gaps build, package C — 14) its invoices, as Money names them — each opens on Money; once it is done, its Ready one to send */}
      {invoices.length && projectId ? (
        <>
          <DrawerRule />
          <section className={styles.section} aria-label="Invoices" data-testid="panel-invoices">
            <h3 className={styles.sectionTitle}>Invoices</h3>
            <div className={styles.invoices}>
              {invoices.map((i) => (
                <NextLink key={i.id} href={withFrom(`/projects/${projectId}/money?open=${encodeURIComponent(i.id)}`, `/projects/${projectId}/schedule`)} className={styles.invoice} data-testid="panel-invoice">
                  <span className={styles.invoiceText}>
                    <span className={styles.invoiceName}>{i.number ?? `${i.stage} invoice`}</span>
                    <span className={styles.note}>{`${i.stage} · ${money2(i.amountMinor)}${i.dueDay !== null && (i.state === 'sent' || i.state === 'overdue' || i.state === 'part_paid') ? ` · due ${dayMonth(i.dueDay)}` : ''}`}</span>
                  </span>
                  <MetaChip color={i.state === 'paid' || i.state === 'ready' ? 'green' : i.state === 'overdue' ? 'red' : i.state === 'sent' ? 'blue' : i.state === 'void' || i.state === 'draft' ? 'default' : 'yellow'}>{i.label}</MetaChip>
                  <Icon name="keyboard_arrow_right" size={20} className={styles.chev} />
                </NextLink>
              ))}
            </div>
            {m.status === 'done' ? invoices.filter((i) => i.state === 'ready').map((i) => (
              <span key={i.id}><NextLink href={withFrom(`/projects/${projectId}/money?open=${encodeURIComponent(i.id)}`, `/projects/${projectId}/schedule`)} className={styles.textLink} data-testid="panel-send-invoice">{`Send the ${i.stage} invoice`}</NextLink></span>
            )) : null}
          </section>
        </>
      ) : null}

      <DrawerRule />
      <section className={styles.switches} aria-label="More about it">
        <div className={styles.switchRow}>
          <span className={styles.switchText}>
            <span className={styles.switchLabel}>Shown to {client}</span>
            <span className={styles.switchHelp}>They see the name, the dates and whether it is done.</span>
            {/* (r4b, layer 6) whether it has reached them — the portal reads the newest share, never this row */}
            {m.clientVisible ? <span className={styles.switchHelp} data-testid="panel-shared">{shared ? `Shared with ${client} ${dayMonth(shared.day)}${shared.done ? ' as done' : ''}.` : `Not shared with ${client} yet — Share changes sends it.`}</span> : null}
            {/* (gaps build, package C — 7) one change can go on its own */}
            {pending && mayChange && onShareOne ? <span><Link variant="primary" onPress={() => onShareOne(m)} data-testid="panel-share-one">Share this change</Link></span> : null}
          </span>
          <Switch size="sm" isSelected={shown} isDisabled={!mayChange} onChange={(v: boolean) => setShown(v)} aria-label={`Shown to ${client}`} />
        </div>
        {/* (gaps build, package C — 12) its last three shares, as Share changes listed them */}
        {history.length ? (
          <ul className={styles.history} aria-label={`Shared with ${client}`} data-testid="panel-history">
            {history.map((h, i) => <li key={i} className={styles.historyRow}><span className={styles.historyDay}>{dayMonth(dayOf(new Date(h.at)))}</span><span className={styles.changeWords}>{h.was ? <s>{h.was}</s> : null}{h.now}</span></li>)}
          </ul>
        ) : null}
        <div className={styles.switchRow}>
          <span className={styles.switchText}><span className={styles.switchLabel}>Waiting on someone</span><span className={styles.switchHelp}>Say who and until when. The project then shows as waiting.</span>
            {shareWait && m.waiting ? <span className={styles.switchHelp} data-testid="panel-share-wait">{shareWaitLine(shareWait)}.</span> : null}</span>
          <Switch size="sm" isSelected={waitOn} isDisabled={!mayChange} onChange={(v: boolean) => setWaitOn(v)} aria-label="Waiting on someone" />
        </div>
        {waitOn ? (
          <div className={styles.switchMore}>
            <Chips label="Waiting on" value={who} disabled={!mayChange} onChange={(v) => setWho(v as WaitingOn)} options={[{ value: 'client', label: client }, { value: 'member', label: 'A member' }, { value: 'supplier', label: 'A supplier' }]} />
            {who === 'member' ? <TextField label="Member" mode="select" disabled={!mayChange} value={memberName} options={team.map((x) => x.name)} onChange={(v) => setMember(team.find((x) => x.name === v)?.id ?? '')} error={err('member')} /> : null}
            {who === 'supplier' ? <TextField label="Supplier" value={supplier} maxLength={60} disabled={!mayChange} onChange={setSupplier} error={err('supplier')} /> : null}
            <TextField label="What for" value={waitNote} maxLength={80} disabled={!mayChange} onChange={setWaitNote} helper={who === 'client' ? 'Paint colours, a key, a decision' : undefined} />
            <DateField label="Until (optional)" value={until} onChange={setUntil} today={todayDate} disabled={!mayChange} />
          </div>
        ) : null}
        {payments ? (
          <>
            <div className={styles.switchRow}>
              <span className={styles.switchText}><span className={styles.switchLabel}>A payment falls due here</span><span className={styles.switchHelp}>Tie it to a stage of the quote’s payment schedule.</span></span>
              <Switch size="sm" isSelected={payOn} isDisabled={!mayChange || (!payOptions.length && !m.paymentRef)} onChange={(v: boolean) => setPayOn(v)} aria-label="A payment falls due here" />
            </div>
            {payOn ? (
              <div className={styles.switchMore}>
                <TextField label="Payment stage" mode="select" disabled={!mayChange} value={(payments.find((p) => p.ref === payRef) && payLabel(payments.find((p) => p.ref === payRef)!)) ?? ''}
                           options={[...(m.paymentRef ? payments.filter((p) => p.ref === m.paymentRef) : []), ...payOptions.filter((p) => p.ref !== m.paymentRef)].map(payLabel)}
                           onChange={(v) => setPayRef(payments.find((p) => payLabel(p) === v)?.ref ?? '')} error={err('payment')} />
                <Chips label="Falls due" value={payDue} disabled={!mayChange} onChange={(v) => setPayDue(v === 'start' ? 'start' : 'end')} options={[{ value: 'start', label: 'When it starts' }, { value: 'end', label: 'When it is done' }]} />
              </div>
            ) : null}
          </>
        ) : null}
        <div className={styles.switchRow}>
          <span className={styles.switchText}>
            <span className={styles.switchLabel}>Ask {client} to confirm it</span>
            <span className={styles.switchHelp}>{m.confirm.answer ? 'Their answer is below.' : m.confirm.askedAt !== null && m.status === 'done' && shared?.done ? `Waiting for ${client} to confirm it on their portal.` : m.confirm.askedAt !== null && m.status === 'done' ? `${client} can confirm it once you share it as done.` : 'Once it is done, they confirm it on their portal.'}</span>
          </span>
          {/* (B-24) stopping the ask clears the client's answer — so with an answer on record, it asks first */}
          <Switch size="sm" isSelected={ask} isDisabled={!mayChange} onChange={(v: boolean) => { if (!v && m.confirm.answer && ask) setStopAsking(true); else setAsk(v) }} aria-label={`Ask ${client} to confirm it`} />
        </div>
        {/* (r4b, layer 6) the client's answer, as their portal took it: confirmed, or "something is not right" with what they noticed */}
        {m.confirm.answer ? (
          <div className={styles.switchMore} data-testid="panel-client-answer" data-answer={m.confirm.answer}>
            <p className={styles.answer} data-tone={m.confirm.answer === 'changes' && isResolved(m) ? 'confirmed' : m.confirm.answer}>
              <Icon name={m.confirm.answer === 'confirmed' || isResolved(m) ? 'check_circle' : 'error'} size={20} weight={300} fill={m.confirm.answer === 'confirmed' || isResolved(m)} />
              <span>{m.confirm.answer === 'confirmed' ? `${client} confirmed it` : `${client} says something is not right`}{m.confirm.answeredAt !== null ? ` · ${dayLabel(m.confirm.answeredAt)}` : ''}</span>
            </p>
            {m.confirm.answer === 'changes' && m.confirm.note ? <blockquote className={styles.answerNote}>{`“${m.confirm.note}”`}</blockquote> : null}
            {/* (gaps build, package C — 9) answered: what the studio changed, as the client reads it */}
            {m.confirm.answer === 'changes' && isResolved(m) ? <p className={styles.note} data-testid="panel-resolved">{`Resolved ${dayMonth(m.resolved!.at)} — ${client} reads: “${m.resolved!.note}”`}</p> : null}
            {m.confirm.answer === 'changes' && mayChange ? (
              <span className={styles.askActions}>
                {asks && !isResolved(m) ? <Button variant="primary" size="sm" onPress={() => setDialog('resolve')} isDisabled={asking} data-testid="panel-resolve">Mark resolved</Button> : null}
                {onAskAgain ? <Button variant="secondary" appearance="outlined" size="sm" isDisabled={asking} onPress={() => { setAsking(true); void onAskAgain(m).finally(() => setAsking(false)) }} data-testid="panel-ask-again">{`Ask ${client} again`}</Button> : null}
              </span>
            ) : null}
          </div>
        ) : null}
        {/* (gaps build, package C — 9) resolved, then asked again: the note stays on the stage for the client until they answer */}
        {!m.confirm.answer && m.resolved ? <p className={styles.note} data-testid="panel-resolved">{`Resolved ${dayMonth(m.resolved.at)} — ${client} reads: “${m.resolved.note}”`}</p> : null}
      </section>
      {m.tasks.total && !mine.length ? <p className={styles.note}>{plural(m.tasks.total, 'task')} inside.</p> : null}
      <ConfirmDialog open={stopAsking} nested title={`Stop asking ${client}?`} confirmLabel="Stop asking" tone="danger"
                     message={`${client} ${m.confirm.answer === 'confirmed' ? 'confirmed it' : 'said something is not right'}${m.confirm.answeredAt !== null ? ` on ${dayMonth(m.confirm.answeredAt)}` : ''}. Their answer is cleared when you save.`}
                     onCancel={() => setStopAsking(false)} onConfirm={() => { setStopAsking(false); setAsk(false) }} />
      {asks ? (
        <>
          <AskDialog open={dialog === 'more'} title={`More time on ${m.title}`} action="Ask for it" onClose={() => { setDialog(null); setAskEnd(null) }} testId="more-dialog"
                     lede={`It ends ${dayLabel(m.end)}. An Owner or an Admin approves the new day — the milestones that move with it follow.`}
                     date={{ label: 'New last day', min: dateOfDay(m.end + 1), today: todayDate, ...(askEnd !== null ? { initial: dateOfDay(askEnd) } : {}) }} note={{ label: 'Why it needs more time', required: true, max: 300 }}
                     onSubmit={async (v) => (v.date ? asks.askMore(m, isoDay(dayOf(parseInputDate(v.date)!)), v.note) : false)} />
          <AskDialog open={dialog === 'approve-more' && !!extension} title={`Approve more time on ${m.title}?`} action="Approve" onClose={() => setDialog(null)} testId="approve-more-dialog"
                     lede={extension ? `It moves to end ${dayLabel(extension.toEnd)}, ${extensionWords(extension)}; what moves with it follows.` : ''}
                     check={{ label: `Draft an update for ${client} with the new day`, initial: true }}
                     onSubmit={async (v) => (extension ? asks.answerMore(extension, { approve: true, note: '', draftUpdate: v.check }) : false)} />
          <AskDialog open={dialog === 'decline-more' && !!extension} title={`Decline more time on ${m.title}?`} action="Decline" onClose={() => setDialog(null)} testId="decline-more-dialog"
                     lede={extension ? `It keeps ending ${dayLabel(m.end)}. ${extension.byName.split(' ')[0]} reads your note.` : ''} note={{ label: 'A note (optional)', required: false, max: 300 }}
                     onSubmit={async (v) => (extension ? asks.answerMore(extension, { approve: false, note: v.note, draftUpdate: false }) : false)} />
          <AskDialog open={dialog === 'send-back'} title={`Send ${m.title} back?`} action="Send back" onClose={() => setDialog(null)} testId="send-back-dialog"
                     lede="It stays as it is, not done. Whoever marked it done reads your note." note={{ label: 'What is still to do', required: true, max: 300 }}
                     onSubmit={async (v) => asks.sendBackDone(m, v.note)} />
          <AskDialog open={dialog === 'resolve'} title={`Mark ${m.title} resolved`} action="Mark resolved" onClose={() => setDialog(null)} testId="resolve-dialog"
                     lede={`${client} said: “${m.confirm.note ?? 'something is not right'}”. Say what you changed — their schedule shows it under this stage.`}
                     note={{ label: `What you changed — ${client} reads this`, required: true, max: RESOLVE_MAX, area: true }} check={{ label: `Ask ${client} to confirm it again`, initial: true }}
                     onSubmit={async (v) => asks.resolve(m, v.note, v.check)} />
        </>
      ) : null}
    </form>
  )
}

const listOf = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`)

/** (gaps build, package C — 11) One of the milestone's tasks: ticked from the row, edited in place when opened — its due (a date and a time),
    its members (the studio's, as chips), its description, the outside person and *Send on WhatsApp*; each saves as it changes. */
function TaskRow({ t, team, today, open, mayChange, projectId, onOpen, onToggle, edits }: {
  t: ScheduleTask; team: { id: string; name: string }[]; today: Date; open: boolean; mayChange: boolean; projectId?: string
  onOpen: () => void; onToggle: () => void; edits?: PanelTaskEdits
}) {
  const [desc, setDesc] = useState(t.description ?? '')
  const [seen, setSeen] = useState(t.description ?? '')
  if ((t.description ?? '') !== seen) { setSeen(t.description ?? ''); setDesc(t.description ?? '') }
  const due = t.dueAt != null ? new Date(t.dueAt) : null
  const names = (t.assignees ?? []).map((id) => team.find((x) => x.id === id)?.name.split(' ')[0]).filter(Boolean)
  const outside: Outside | null = t.external ? { name: t.external.name, phone: t.external.phone, kind: isOutsideKind(t.external.kind) ? t.external.kind : 'subcontractor', sentAt: t.external.sentAt } : null
  const meta = [due ? displayDue(due) : null, names.length ? names.join(', ') : null, outside ? outside.name : null].filter(Boolean).join(' · ')
  return (
    <div className={styles.taskBox} data-open={open || undefined} data-testid="panel-task">
      <div className={styles.task} data-done={t.done || undefined}>
        <Checkbox isSelected={t.done} isDisabled={!mayChange} onChange={onToggle} aria-label={t.done ? `Reopen ${t.title}` : `Mark ${t.title} as completed`} />
        <button type="button" className={styles.taskBtn} onClick={onOpen} aria-expanded={open} data-testid="panel-task-open">
          <span className={styles.taskTitle}>{t.title}</span>
          {meta ? <span className={styles.note}>{meta}</span> : null}
        </button>
        {outside ? <OutsideBadge o={outside} /> : null}
        <Icon name={open ? 'keyboard_arrow_up' : 'keyboard_arrow_down'} size={20} className={styles.chev} />
      </div>
      {open && edits ? (
        <div className={styles.taskEdit}>
          <DateTimeField label="Due" value={due ? formatInputDateTime(due) : ''} today={today} disabled={!mayChange}
                         onChange={(v) => { const d = parseInputDateTime(v); if (d) void edits.due(t, d) }} />
          <div className={styles.also}>
            <span className={styles.caption}>Members</span>
            <Chips multiple label="Members" disabled={!mayChange} value={t.assignees ?? []} options={team.map((x) => ({ value: x.id, label: x.name }))} onChange={(ids) => { void edits.members(t, ids) }} />
          </div>
          <TextArea label="Description" value={desc} onChange={setDesc} isDisabled={!mayChange} onBlur={() => { if (desc !== (t.description ?? '')) void edits.description(t, desc) }} />
          <div className={styles.taskOutside}>
            {outside ? (
              <>
                <span className={styles.note}>{`${outside.name} · outside the studio${outside.sentAt ? ` · sent ${dayMonth(dayOf(new Date(outside.sentAt)))}` : ''}`}</span>
                <span className={styles.askActions}>
                  {outside.phone ? <Button size="sm" variant="secondary" appearance="outlined" iconStart={<Icon name="chat" size={20} />} onPress={() => edits.send(t)} isDisabled={!mayChange} data-testid="panel-task-send">Send on WhatsApp</Button> : null}
                  {mayChange ? <Button size="sm" appearance="text" onPress={() => edits.outside(t)}>Change</Button> : null}
                </span>
              </>
            ) : mayChange ? <span><Link variant="primary" onPress={() => edits.outside(t)} data-testid="panel-task-outside">Add a subcontractor or supplier</Link></span> : null}
          </div>
          {projectId ? <span><NextLink href={withFrom(`/projects/${projectId}/tasks?open=${encodeURIComponent(t.id)}`, `/projects/${projectId}/schedule`)} className={styles.textLink}>Open in Tasks</NextLink></span> : null}
        </div>
      ) : null}
    </div>
  )
}

/** (gaps build, package C) A small form dialog for an ask or its answer — a date, a note, a tick; the house Dialog, nested over the panel; it
    closes only once the press lands. */
export function AskDialog({ open, title, action, lede, date, note, check, onClose, onSubmit, testId }: {
  open: boolean; title: string; action: string; lede?: string; testId?: string
  /** `initial` (simplify Q-18): the day a drag or a date asked for, filled in */
  date?: { label: string; min: Date; today: Date; initial?: Date }
  note?: { label: string; required: boolean; max: number; area?: boolean }
  check?: { label: string; initial: boolean }
  onClose: () => void
  onSubmit: (v: { date: string; note: string; check: boolean }) => Promise<boolean>
}) {
  const [d, setD] = useState('')
  const [n, setN] = useState('')
  const [c, setC] = useState(check?.initial ?? false)
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)
  const [was, setWas] = useState(false)
  if (open !== was) { setWas(open); if (open) { setD(date?.initial ? inputDate(date.initial) : ''); setN(''); setC(check?.initial ?? false); setTried(false) } }
  const dateErr = date && !parseInputDate(d) ? MSG.required : undefined
  const noteErr = note?.required && !n.trim() ? MSG.required : undefined
  const go = async () => {
    setTried(true)
    if (dateErr || noteErr || busy) return
    setBusy(true)
    const ok = await onSubmit({ date: d, note: n.trim(), check: c })
    setBusy(false)
    if (ok) onClose()
  }
  return (
    <Dialog open={open} onClose={onClose} title={title} width={400} size="form" nested closeOnScrim={false}
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button><Button onPress={() => { void go() }} isDisabled={busy} data-testid={`${testId}-go`}>{action}</Button></>}>
      <form className={styles.panel} onSubmit={(ev) => { ev.preventDefault(); void go() }} noValidate data-testid={testId}>
        {lede ? <p className={styles.note}>{lede}</p> : null}
        {date ? <DateField label={date.label} value={d} onChange={setD} today={date.today} min={date.min} required error={tried ? dateErr : undefined} /> : null}
        {note ? (note.area
          ? <TextArea label={note.label} value={n} onChange={(v) => setN(v.slice(0, note.max))} isRequired={note.required} errorMessage={tried ? noteErr : undefined} isInvalid={!!(tried && noteErr)} />
          : <TextField label={note.label} value={n} onChange={(v) => setN(v.slice(0, note.max))} maxLength={note.max} required={note.required} autoFocus={!date} error={tried ? noteErr : undefined} />) : null}
        {check ? <Checkbox isSelected={c} onChange={setC}>{check.label}</Checkbox> : null}
        <button type="submit" hidden aria-hidden tabIndex={-1} />
      </form>
    </Dialog>
  )
}
