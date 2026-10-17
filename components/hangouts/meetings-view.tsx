'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Checkbox, Switch, TextArea } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { Chips } from '@/components/om/chips'
import { ChipRail } from '@/components/om/chip-rail'
import { MetaChip } from '@/components/om/meta-chip'
import { EmptyState } from '@/components/om/empty-state'
import { IconButton } from '@/components/om/icon-button'
import { PortalMenu } from '@/components/om/portal-menu'
import { TextField } from '@/components/om/text-field'
import { Tooltip } from '@/components/om/tooltip'
import { Dialog } from '@/components/om/dialog'
import { useSnackbar } from '@/components/om/snackbar'
import { useHere } from '@/components/om/use-here'
import { DropdownDivider, DropdownItem, MENU_WIDTH } from '@/components/leads/dropdown'
import { Card } from '@/components/leads/detail/card'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import {
  addWalkIn, assignHangoutMeeting, cancelHangoutMeeting, endHangoutMeeting, hangoutPulse, restoreHangoutMeeting, setHangoutOutcome, setOnBreak, startHangoutMeeting, takeHangoutMeeting,
} from '@/app/qanvast-ops/hangouts/actions'
import { AREAS, BUDGET_BANDS, EMPTY_HOMEOWNER, HOME_STATUSES, KEY_TIMES, OUTCOMES, STYLES, firstName, keyLabel, lostReasonFor, reasonsOf, type HomeownerPrefs, type OutcomeKey } from '@/lib/hangouts/model'
import { PROPERTY_TYPES } from '@/lib/leads/enums'
import { isSgMobile, phoneDigits, phoneLocal, phoneTyped } from '@/lib/format'
import { MSG } from '@/lib/forms'
import { withFrom } from '@/lib/nav'
import { moveStageHref } from '@/lib/leads/move-link'
import type { HangoutMeetingRow, HangoutView } from '@/lib/hangouts/queries'
import { chatInScope, chatLines, chatMinutes, chatPress, chatScopes, chatFacts, chatTitle, chatTold, breakShown, firstChatScope, walkInAllowed, type ChatScope } from './chat-words'
import styles from './hangouts.module.css'
import own from './meetings-view.module.css'

const TONE: Record<string, 'default' | 'green' | 'yellow' | 'red' | 'blue'> = { 'in-progress': 'blue', converted: 'green', 'follow-up': 'yellow', dropped: 'default', scheduled: 'default', cancelled: 'default' }

/**
 * (pending modules S27) A Hangout's chats — 1.0's ID meeting view and the owner's All Meetings (IDMeetingView · OwnerDashboardTab): each
 * homeowner's chat at the studio's tables, as a card a designer reads at the table on a phone — who, with whom, which shift and table, how well
 * they fit, what they told the studio — and its one press: **Start** (on the day), **End** (its outcome and reason, 1.0's three, and what was said;
 * it becomes the lead's meeting with its follow-up task), then the notes. ⋮ gives a chat to someone on its shift (Owners and Admins), takes one
 * nobody has, opens the lead, messages them, cancels a waiting one (Undo). **Add a walk-in** books someone at the table; **On a break** keeps new
 * chats off you. On the day the list refreshes itself when a homeowner presses "I'm at the table". *(invented copy: every word but 1.0's
 * outcomes and reasons)*
 */
export function MeetingsView({ data }: { data: HangoutView }) {
  const router = useRouter()
  const snackbar = useSnackbar()
  const here = useHere(`/qanvast-ops/hangouts/${data.event.id}`)
  const today = data.event.phase === 'today'
  const me = data.viewer.id
  const [scope, setScope] = useState<ChatScope>(() => firstChatScope(data))
  const list = data.meetings.filter((r) => chatInScope(r, scope, me))
  const [ending, setEnding] = useState<{ row: HangoutMeetingRow; edit: boolean } | null>(null)
  const [walkIn, setWalkIn] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [onBreak, setBreak] = useState(data.viewer.onBreak)
  const [seenBreak, setSeenBreak] = useState(data.viewer.onBreak)
  if (seenBreak !== data.viewer.onBreak) { setSeenBreak(data.viewer.onBreak); setBreak(data.viewer.onBreak) }

  /* on the day: a homeowner's "I'm at the table" (and a teammate's press) shows without a reload */
  useEffect(() => {
    if (!today) return
    let last: string | null = null, stop = false
    const beat = async () => {
      if (stop || document.visibilityState !== 'visible') return
      try { const p = await hangoutPulse(data.event.id); if (last !== null && p !== last) router.refresh(); last = p } catch { /* the next beat tries again */ }
    }
    void beat()
    const t = window.setInterval(() => { void beat() }, 15_000)
    return () => { stop = true; window.clearInterval(t) }
  }, [today, data.event.id, router])

  const run = async (row: HangoutMeetingRow, what: string, fn: () => Promise<{ error: string } | object>, ok: string | null) => {
    setBusy(row.id)
    try {
      const r = await fn()
      if ('error' in r) { snackbar({ message: couldnt(what, refusalOf((r as { error: string }).error)) }); return false }
      if (ok) snackbar({ message: ok })
      router.refresh()
      return true
    } catch { snackbar({ message: couldnt(what) }); return false } finally { setBusy(null) }
  }
  const start = (r: HangoutMeetingRow) => void run(r, 'start the chat', () => startHangoutMeeting(r.id), `Chat with ${r.leadName} started`)
  const take = (r: HangoutMeetingRow) => void run(r, 'take the chat', () => takeHangoutMeeting(r.id), `${r.leadName}’s chat is yours`)
  const give = (r: HangoutMeetingRow, memberId: string, name: string) => void run(r, `give the chat to ${name}`, () => assignHangoutMeeting(r.id, memberId), `${r.leadName}’s chat is ${name}’s — they hear it on the bell`)
  const cancel = async (r: HangoutMeetingRow) => {
    const okd = await run(r, 'cancel the chat', () => cancelHangoutMeeting(r.id), null)
    if (okd) snackbar({ message: `${r.leadName}’s chat cancelled`, actionLabel: 'Undo', onAction: () => { void restoreHangoutMeeting(r.id).then((u) => { if ('error' in u) snackbar({ message: couldnt('put the chat back', refusalOf(u.error)) }); else router.refresh() }) } })
  }
  const toggleBreak = async (on: boolean) => {
    setBreak(on)
    try {
      const r = await setOnBreak(data.event.id, on)
      if ('error' in r) { setBreak(!on); snackbar({ message: couldnt(on ? 'take a break' : 'come back from the break', refusalOf(r.error)) }); return }
      snackbar({ message: on ? 'On a break — no new chat is given to you meanwhile' : 'Back at the table' })
      router.refresh()
    } catch { setBreak(!on); snackbar({ message: couldnt('change it') }) }
  }
  const copyPage = async () => {
    const path = data.participation?.pagePath
    if (!path) return
    try { await navigator.clipboard.writeText(`${window.location.origin}${path}`); snackbar({ message: 'Booking link copied — everyone who books arrives as a lead' }) } catch { snackbar({ message: couldnt('copy the link') }) }
  }
  const mayWalkIn = walkInAllowed(data)

  return (
    <div className={styles.section} data-testid="hangout-chats">
      {data.meetings.length === 0 ? (
        <EmptyState icon="group" title={data.event.phase === 'ended' ? 'No chats at this Hangout' : 'No chats booked yet'} testId="hangout-chats-empty"
                    help={data.event.phase === 'ended' ? 'Nobody booked a chat with the studio at this Hangout.' : 'Share your booking page — everyone who books a chat arrives as a lead, source Hangout. On the day, add walk-ins here.'}
                    primary={data.event.phase !== 'ended' && data.participation?.pagePath ? { label: 'Copy the booking link', icon: 'link', onPress: () => { void copyPage() } } : null}
                    secondary={mayWalkIn ? { label: 'Add a walk-in', icon: 'person_add', onPress: () => setWalkIn(true) } : null} kb={false} />
      ) : (
        <>
          <div className={styles.bar}>
            <div className={styles.views}>
                  <ChipRail label="Show" className={styles.rail}>
              <Chips label="Show" testId="hangout-chat-scope" value={scope} onChange={(v) => setScope(v as ChatScope)} options={chatScopes(data)} /></ChipRail>
                </div>
            <div className={styles.tools}>
              {breakShown(data) ? (
                <label className={own.breakRow} data-testid="hangout-break">
                  <Switch size="sm" isSelected={onBreak} onChange={(v: boolean) => { void toggleBreak(v) }} aria-label="I’m on a break" />
                  <span>On a break</span>
                </label>
              ) : null}
              {mayWalkIn ? <Button variant="secondary" appearance="outlined" iconStart={<Icon name="person_add" size={20} />} onPress={() => setWalkIn(true)} data-kb="create" data-kb-label="Add a walk-in" data-testid="hangout-walkin">Add a walk-in</Button> : null}
            </div>
          </div>
          {/* (S42E, E-12) someone who can't run the day's chats is told why, once, in place — not left with cards and no presses */}
          {today && !data.viewer.runs && !data.viewer.shiftsToday.length ? <p className={styles.help} data-testid="hangout-chats-why">Only the designers on today’s shifts, an Owner or an Admin start and end the chats — an Owner or an Admin adds you on the Plan.</p> : null}
          {list.length === 0 ? <p className={styles.help}>{scope === 'mine' ? 'No chats are yours here.' : 'Nothing here right now.'}</p> : (
            <div className={own.list} data-kb-list="hangout-chat" data-testid="hangout-chat-list">
              {list.map((r) => <ChatCard key={r.id} r={r} data={data} here={here} busy={busy === r.id} onStart={() => start(r)} onEnd={() => setEnding({ row: r, edit: false })} onEdit={() => setEnding({ row: r, edit: true })}
                                         onTake={() => take(r)} onGive={(id, name) => give(r, id, name)} onCancel={() => { void cancel(r) }} />)}
            </div>
          )}
        </>
      )}
      <EndDialog open={ending} onClose={() => setEnding(null)} onDone={(msg, leadId, go) => {
        setEnding(null)
        /* (S42E, call E·3) the ticked next step opens the lead's own window — Met / Contacted with this chat as its log, or Lost with its reason */
        if (go) { snackbar({ message: msg }); router.push(withFrom(go, here)); return }
        router.refresh(); snackbar({ message: msg, ...(leadId ? { actionLabel: 'Open the lead', onAction: () => router.push(withFrom(`/leads/${leadId}`, here)) } : {}) })
      }} />
      <WalkInDialog open={walkIn} data={data} onClose={() => setWalkIn(false)} onDone={(msg) => { setWalkIn(false); router.refresh(); snackbar({ message: msg }) }} />
    </div>
  )
}

function ChatCard({ r, data, here, busy, onStart, onEnd, onEdit, onTake, onGive, onCancel }: {
  r: HangoutMeetingRow; data: HangoutView; here: string; busy: boolean; onStart: () => void; onEnd: () => void; onEdit: () => void; onTake: () => void; onGive: (memberId: string, name: string) => void; onCancel: () => void
}) {
  const router = useRouter()
  const [menu, setMenu] = useState(false)
  const kebab = useRef<HTMLSpanElement>(null)
  const mine = r.memberId === data.viewer.id
  const may = data.viewer.runs || mine
  const givable = data.designers.filter((d) => d.memberId !== r.memberId && (!r.shiftId || d.shiftIds.includes(r.shiftId)))
  const takeable = r.status === 'scheduled' && !r.memberId && data.designers.some((d) => d.memberId === data.viewer.id && (!r.shiftId || d.shiftIds.includes(r.shiftId)))
  const [nowTick, setNowTick] = useState(() => Date.now())
  useEffect(() => { if (r.status !== 'in-progress') return; const t = window.setInterval(() => setNowTick(Date.now()), 30_000); return () => window.clearInterval(t) }, [r.status])
  const minutes = chatMinutes(r, nowTick)
  const tone = TONE[r.status === 'completed' ? (r.outcome ?? 'default') : r.status] ?? 'default'
  const facts = chatFacts(r), told = chatTold(r)
  const leadHref = withFrom(`/leads/${r.leadId}`, here)
  const notesHref = r.meetingId ? withFrom(`/meetings/${r.meetingId}`, here) : null
  const press = chatPress(r, data)
  const primary = press?.kind === 'start' ? <Button onPress={onStart} isDisabled={busy} data-testid="chat-start">{press.label}</Button>
    : press?.kind === 'end' ? <Button onPress={onEnd} isDisabled={busy} data-testid="chat-end">{press.label}</Button>
    : press?.kind === 'take' ? <Button variant="secondary" appearance="outlined" onPress={onTake} isDisabled={busy} data-testid="chat-take">{press.label}</Button>
    : press?.kind === 'notes' && notesHref ? <Link href={notesHref} className={own.textLink} data-testid="chat-notes">{press.label}</Link> : null
  return (
    <Card title={chatTitle(r, minutes)} testId="hangout-chat">
      <div className={styles.cardBody} data-kb-row data-kb-id={r.id} data-status={r.status} data-member={r.memberId ?? ''}>
        <div className={styles.cardTop}>
          <span className={styles.who}>
            {/* (S42E, E-19) the homeowner's own initials beside their name — the designer is named in "With …" under it */}
            <span className={own.client} aria-hidden>{initialsOf(r.leadName)}</span>
            <span className={styles.whoText}>
              <span className={styles.nameRow}>
                {r.canOpen ? <Link href={leadHref} className={`${styles.nameLink} ${own.name}`} data-kb-open data-testid="chat-name">{r.leadName}</Link> : <span className={own.name} data-testid="chat-name">{r.leadName}</span>}
                <MetaChip color={tone}>{r.word}</MetaChip>
              </span>
              <span className={styles.whoLine} data-testid="chat-facts">{facts}</span>
            </span>
          </span>
          <span className={styles.press}>
            {primary}
            <span ref={kebab} className={styles.menuWrap}>
              <Tooltip label="More actions" disabled={menu}><IconButton icon="more_vert" label={`More actions for ${r.leadName}’s chat`} aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu((o) => !o)} /></Tooltip>
              <PortalMenu open={menu} anchor={kebab} onClose={() => setMenu(false)} align="right" width={MENU_WIDTH.detail} role="menu" sheetTitle={`${r.leadName}’s chat`}>
                {r.canOpen ? <DropdownItem onSelect={() => { setMenu(false); router.push(leadHref) }}>Open the lead</DropdownItem> : null}
                <DropdownItem help={phoneLocal(r.phone)} onSelect={() => { setMenu(false); window.open(`https://wa.me/65${phoneDigits(r.phone)}`, '_blank', 'noopener') }}>Message on WhatsApp</DropdownItem>
                {notesHref ? <DropdownItem help="The lead’s meeting — its notes, its brief and a recording" onSelect={() => { setMenu(false); router.push(notesHref) }}>Notes and recording</DropdownItem> : null}
                {r.status === 'completed' && may ? <DropdownItem onSelect={() => { setMenu(false); onEdit() }}>Change the outcome</DropdownItem> : null}
                {r.status === 'scheduled' && data.viewer.runs && givable.length ? <DropdownDivider /> : null}
                {r.status === 'scheduled' && data.viewer.runs ? givable.map((d) => <DropdownItem key={d.memberId} help={d.onBreak ? 'On a break' : undefined} onSelect={() => { setMenu(false); onGive(d.memberId, d.name) }}>{`Give to ${d.name}`}</DropdownItem>) : null}
                {takeable ? <DropdownItem onSelect={() => { setMenu(false); onTake() }}>Take it</DropdownItem> : null}
                {r.status === 'scheduled' && may ? <><DropdownDivider /><DropdownItem onSelect={() => { setMenu(false); onCancel() }}>Cancel the chat</DropdownItem></> : null}
              </PortalMenu>
            </span>
          </span>
        </div>
        {told ? <p className={styles.help} data-testid="chat-prefs">{told}</p> : null}
        {chatLines(r, data, minutes).map((l) => l.kind === 'outcome'
          ? <p key="outcome" className={styles.line} data-testid="chat-outcome">{l.text}{l.muted ? <span className={styles.muted}>{l.muted}</span> : null}</p>
          : <p key={l.text} className={styles.help}>{l.text}</p>)}
      </div>
    </Card>
  )
}

/** End a chat — or change a held one's outcome: 1.0's three outcomes and their reasons, the scope in a line and what was said. */
/** (S42E, E-19) "Lim Wei Ling" → "LW" — the client portal panel's own initials. */
const initialsOf = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join('')

function EndDialog({ open, onClose, onDone }: { open: { row: HangoutMeetingRow; edit: boolean } | null; onClose: () => void; onDone: (msg: string, leadId: string | null, go?: string) => void }) {
  const snackbar = useSnackbar()
  const [seen, setSeen] = useState(open)
  const [outcome, setOutcome] = useState<OutcomeKey | null>(null)
  const [reason, setReason] = useState<string | null>(null)
  const [scope, setScope] = useState('')
  const [notes, setNotes] = useState('')
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)
  const [follow, setFollow] = useState(true)
  if (seen !== open) {
    setSeen(open); setTried(false); setFollow(true)
    const r = open?.row
    setOutcome((r?.outcome as OutcomeKey | null) ?? null); setReason(r?.reason ?? null); setScope(r?.scope ?? ''); setNotes(r?.notes ?? '')
  }
  const reasons = reasonsOf(outcome)
  /* (S42E — call E·3, as recommended; settles E-11) End offers the stage the outcome implies, ticked: a kept-going chat (Converted · Follow-up)
     moves the lead on by the studio's stage rule — Met, or Contacted first under one stage at a time — with this chat as that step's log; a dropped
     one marks the lead lost, its reason carried into the Lost reason. Each opens the lead's own window to confirm (S23's "held before Met"). */
  const row = open?.row ?? null
  const first = row ? firstName(row.leadName) : ''
  const offer: { step: 'contacted' | 'met' | 'lost'; label: string; help: string } | null = !row || open?.edit || !outcome ? null
    : outcome === 'dropped' ? (row.lostable ? { step: 'lost', label: `Mark ${first}’s lead as lost`, help: lostReasonFor(reason) ? `Their lead opens on Lost with “${lostReasonFor(reason)}” as the reason.` : 'Their lead opens on Lost to pick the reason.' } : null)
    : row.next && row.resume ? { step: row.next === 'Met' ? 'met' : 'contacted', label: `Resume ${first}’s lead at ${row.next}`, help: `Their lead is on hold — it asks to resume at ${row.next}, with this chat as the ${row.next === 'Met' ? 'Met log' : 'first contact'}.` }   // (S43B · F1-06) the meeting page's own offer (S42G)
    : row.next ? { step: row.next === 'Met' ? 'met' : 'contacted', label: `Move ${first} to ${row.next}`, help: row.next === 'Met' ? 'Their lead opens with this chat as the Met log.' : 'Their lead opens with this chat as their first contact — Met comes next.' }
    : null
  const pickOutcome = (o: OutcomeKey) => { setOutcome(o); const rs = reasonsOf(o); setReason(rs.length === 1 ? rs[0]! : rs.includes(reason ?? '') ? reason : null) }
  const submit = async () => {
    if (!open || busy) return
    if (!outcome || !reason) { setTried(true); return }
    setBusy(true)
    try {
      const input = { outcome, reason, scope, notes }
      if (open.edit) {
        const r = await setHangoutOutcome(open.row.id, input)
        if ('error' in r) { snackbar({ message: couldnt('change the outcome', refusalOf(r.error)) }); return }
        onDone(`${open.row.leadName}’s chat is now ${OUTCOMES.find((o) => o.key === outcome)!.label.toLowerCase()}`, null)
      } else {
        const r = await endHangoutMeeting(open.row.id, input)
        if ('error' in r) { snackbar({ message: couldnt('end the chat', refusalOf(r.error)) }); return }
        const go = offer && follow ? moveStageHref(r.leadId, offer.step, { ...(offer.step !== 'lost' && r.meetingId ? { meeting: r.meetingId } : {}), ...(offer.step === 'lost' && lostReasonFor(reason) ? { reason: lostReasonFor(reason)! } : {}) }) : undefined
        onDone(r.task ? `Chat with ${open.row.leadName} ended — “${r.task}” is on their lead` : `Chat with ${open.row.leadName} ended — it’s on their lead`, r.leadId, go)
      }
    } catch { snackbar({ message: couldnt(open.edit ? 'change the outcome' : 'end the chat') }) } finally { setBusy(false) }
  }
  const name = open?.row.leadName ?? ''
  return (
    <Dialog open={!!open} onClose={onClose} title={open?.edit ? 'Change the outcome' : `End the chat with ${name}`} subtitle={open?.edit ? undefined : 'It becomes their lead’s meeting, with a follow-up task for its next step.'} size="form" width={600} closeOnScrim={false}
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose} isDisabled={busy}>Cancel</Button><Button onPress={() => { void submit() }} isDisabled={busy} data-testid="end-save">{busy ? 'Saving…' : open?.edit ? 'Save' : 'End the chat'}</Button></>}>
      <div className={own.form}>
        <div className={styles.dim}>
          <span className={styles.dimLabel}>How did it go?</span>
          <Chips label="How did it go?" testId="end-outcome" value={outcome} onChange={(v) => pickOutcome(v as OutcomeKey)} options={OUTCOMES.map((o) => ({ value: o.key, label: o.label }))} />
          {tried && !outcome ? <span className={own.error} role="alert">Pick how it went</span> : null}
        </div>
        {outcome && reasons.length > 1 ? (
          <div className={styles.dim}>
            <span className={styles.dimLabel}>Why</span>
            <Chips label="Why" testId="end-reason" value={reason} onChange={setReason} options={[...reasons]} />
            {tried && !reason ? <span className={own.error} role="alert">Pick the reason</span> : null}
          </div>
        ) : null}
        <TextField label="The work in a line" value={scope} maxLength={160} onChange={setScope} helper="e.g. A full renovation of a 4-room resale flat" />
        <TextArea label="What was said" value={notes} onChange={(v: string) => setNotes(v)} description="Type or paste your notes — the lead’s meeting keeps them, and a brief is made from them." />
        {offer ? (
          <div className={own.follow} data-testid="end-follow" data-step={offer.step}>
            <Checkbox isSelected={follow} onChange={(on: boolean) => setFollow(on)}>{offer.label}</Checkbox>
            <span className={own.followHelp}>{follow ? offer.help : 'The lead stays where it is — the chat is still its meeting.'}</span>
          </div>
        ) : null}
      </div>
    </Dialog>
  )
}

/** Book someone at the table (1.0's registration at the desk): their name and mobile, when they're here, and their home. */
function WalkInDialog({ open, data, onClose, onDone }: { open: boolean; data: HangoutView; onClose: () => void; onDone: (msg: string) => void }) {
  const snackbar = useSnackbar()
  const todayShifts = data.shifts.filter((s) => { const d = new Date(data.now); return s.dayAt === new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() && data.designers.some((x) => x.shiftIds.includes(s.id)) })
  const fresh = () => ({ name: '', phone: '', email: '', shiftId: data.viewer.shiftsToday[0] ?? todayShifts[0]?.id ?? '', prefs: { ...EMPTY_HOMEOWNER } as HomeownerPrefs })
  const [f, setF] = useState(fresh)
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)
  const [wasOpen, setWasOpen] = useState(open)
  if (wasOpen !== open) { setWasOpen(open); if (open) { setF(fresh()); setTried(false) } }
  const errors = { name: f.name.trim() ? undefined : MSG.required, phone: !f.phone ? MSG.required : !isSgMobile(phoneDigits(f.phone)) ? 'Enter a Singapore mobile number — 8 or 9 first' : undefined, email: f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim()) ? MSG.email : undefined, type: f.prefs.propertyType ? undefined : MSG.required }
  const submit = async () => {
    if (busy) return
    if (errors.name || errors.phone || errors.email || errors.type || !f.shiftId) { setTried(true); return }
    setBusy(true)
    try {
      const r = await addWalkIn(data.event.id, { name: f.name, phone: f.phone, email: f.email, shiftId: f.shiftId, prefs: f.prefs })
      if ('error' in r) { snackbar({ message: couldnt('book the chat', refusalOf(r.error)) }); return }
      onDone(r.fresh ? `${f.name.trim()} is booked${r.sent ? ' — their link went to them' : ''}` : `${f.name.trim()} was booked already`)
    } catch { snackbar({ message: couldnt('book the chat') }) } finally { setBusy(false) }
  }
  const P = (patch: Partial<HomeownerPrefs>) => setF({ ...f, prefs: { ...f.prefs, ...patch } })
  return (
    <Dialog open={open} onClose={onClose} title="Add a walk-in" subtitle="They arrive as a lead, source Hangout — their own link goes to them." size="form" width={600} closeOnScrim={false}
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose} isDisabled={busy}>Cancel</Button><Button onPress={() => { void submit() }} isDisabled={busy} data-testid="walkin-save">{busy ? 'Booking…' : 'Book the chat'}</Button></>}>
      <div className={own.form}>
        <TextField label="Name" required value={f.name} maxLength={80} autoFocus onChange={(v) => setF({ ...f, name: v })} error={tried ? errors.name : undefined} />
        <TextField label="Mobile" required value={phoneTyped(f.phone)} numeric="digits" maxLength={9} inputMode="tel" onChange={(v) => setF({ ...f, phone: phoneDigits(v) })} error={tried ? errors.phone : undefined} />
        <TextField label="Email (optional)" value={f.email} maxLength={120} type="email" onChange={(v) => setF({ ...f, email: v })} error={tried ? errors.email : undefined} />
        {todayShifts.length > 1 ? <div className={styles.dim}><span className={styles.dimLabel}>Shift</span><Chips label="Shift" value={f.shiftId} onChange={(v) => setF({ ...f, shiftId: v })} options={todayShifts.map((s) => ({ value: s.id, label: s.short }))} /></div> : null}
        <TextField label="Their home" required mode="select" searchable options={[...PROPERTY_TYPES]} value={f.prefs.propertyType ?? ''} onChange={(v) => P({ propertyType: v })} error={tried ? errors.type : undefined} />
        <div className={styles.dim}><span className={styles.dimLabel}>New, resale or renovated</span><Chips label="New, resale or renovated" value={f.prefs.status} onChange={(v) => P({ status: v })} options={[...HOME_STATUSES]} /></div>
        <div className={styles.dim}><span className={styles.dimLabel}>Budget</span><Chips label="Budget" value={f.prefs.budget} onChange={(v) => P({ budget: v })} options={BUDGET_BANDS.map((b) => ({ value: b.key, label: b.label }))} /></div>
        <div className={styles.dim}><span className={styles.dimLabel}>Keys</span><Chips label="Keys" value={f.prefs.keys} onChange={(v) => P({ keys: v })} options={KEY_TIMES.map((k) => ({ value: k, label: keyLabel(k) }))} /></div>
        <div className={styles.dim}><span className={styles.dimLabel}>Area</span><Chips label="Area" value={f.prefs.area} onChange={(v) => P({ area: v })} options={[...AREAS]} /></div>
        <div className={styles.dim}><span className={styles.dimLabel}>Styles they like</span><Chips multiple label="Styles they like" value={f.prefs.styles} onChange={(v) => P({ styles: v.slice(0, 6) })} options={[...STYLES]} /></div>
      </div>
    </Dialog>
  )
}
