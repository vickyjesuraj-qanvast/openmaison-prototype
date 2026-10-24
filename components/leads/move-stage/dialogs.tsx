'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Button, Checkbox } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { Dialog } from '@/components/om/dialog'
import { Sheet } from '@/components/om/sheet'
import { useOnTheMove } from '@/components/leads/log/use-move-layout'
import logStyles from '@/components/leads/log/log.module.css'
import { MSG } from '@/lib/forms'
import { displayDate, inputDate, parseInputDate, startOfDay } from '@/lib/format'
import { DEFAULT_HOLD_DURATION, HOLD_DURATIONS, holdDurationLabel, holdFollowUpAt } from '@/lib/leads/enums'
import { DEFAULT_HOLD_REASONS, DEFAULT_LOST_REASONS, LOST_COMPETITOR, LOST_POSTPONED, type LeadReason } from '@/lib/settings/types'
import { ChoiceChips, DateField, Divider, Dropzone, TextField } from './fields'
import styles from './wizard.module.css'
import { Chips } from '@/components/om/chips'
import { fetchCompetitorNames } from '@/app/settings/meetings-actions'   // (pending modules S23) the studio's competitors, for Lost
import { CONTACT_ACCEPT, type ContactKind } from '@/lib/leads/contact-fill'   // (S43B · F1-01)

// The dialog shell and the destructive button are generic primitives (components/om/dialog); re-exported here so the
// screens that reached for them through this module keep working (audit 2026-08-30).
export { Dialog, DangerButton, type DialogSize } from '@/components/om/dialog'

/** Where the two shared dialogs are used: the Move stage window (their defaults) or Lead Details › Notes (spec 02). */
export type SharedDialogVariant = 'wizard' | 'notes'

/**
 * Auto Fill's upload (REG-319). (S43B · F1-01 — his "fix all the pending things" 2026-10-15) The picked file is READ by rule
 * (`lib/leads/contact-fill.ts`, the host's `onUpload`): a chat export, an email or call notes fill what they plainly say; a picture is attached
 * and said so — never the mock's scripted values. The drop zone and Upload open the picker; while it reads, "Reading {file}…".
 */
export function AutoFillDialog({
  open, onClose, onUpload, title = 'Auto Fill', width = 400, variant = 'wizard', kind = 'contact', layered = false,
}: {
  /** reads and attaches the picked file — the host closes the dialog once it lands (what filled is said under the log's Auto Fill) */
  open: boolean; onClose: () => void; onUpload: (file: File) => Promise<void> | void
  /** Notes › Auto Fill (931:45344) reuses this shell at 600 with the same title; the wizard keeps the 400 defaults. */
  title?: string; width?: number
  /** `notes` = the 600×348 mock (spec 02): the 64px modal header (`size="modal"`) and the 552×168 p40 dropzone. */
  variant?: SharedDialogVariant
  /** a contact log, or Met's meeting log — the helper says what each is read for */
  kind?: ContactKind
  /** (REG-2656, the Leads audit's C-01 — a bug fix) opened from a phone sheet (the Notes tab's contact log): the nested layer above it */
  layered?: boolean
}) {
  const notes = variant === 'notes'
  const [busy, setBusy] = useState<string | null>(null)
  const input = useRef<HTMLInputElement | null>(null)
  const pick = async (file?: File) => {
    if (!file || busy) return
    setBusy(file.name)
    try { await onUpload(file) } finally { setBusy(null) }
  }
  return (
    <Dialog open={open} onClose={onClose} title={title} width={width} size={notes ? 'modal' : 'compact'} nested={!notes || layered}
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose} isDisabled={!!busy} className={styles.touchBtn}>Cancel</Button>
                     <Button onPress={() => input.current?.click()} isDisabled={!!busy} className={styles.touchBtn}>{busy ? 'Reading…' : 'Upload'}</Button></>}>
      <Dropzone
        title={busy ? <>Reading <b>{busy}</b>…</> : <>Drop in the conversation or <b>browse</b></>}
        helper={kind === 'meeting'
          ? 'Meeting notes, or the chat that set the meeting up — where and when they plainly say fill the log’s empty fields, and the file is attached. Photos are attached too; pictures can’t be read yet.'
          : 'A chat export (WhatsApp › Export chat), an email saved as a PDF, or your call notes — what they plainly say fills the log’s empty fields, and the file is attached. Screenshots are attached too; pictures can’t be read yet.'}
        onBrowse={() => { if (!busy) input.current?.click() }}
        onPick={(f) => { void pick(f) }}
        label="Choose the conversation"
        variant={notes ? 'notes' : undefined}
      />
      <input ref={input} type="file" accept={CONTACT_ACCEPT} hidden aria-hidden tabIndex={-1} data-testid="auto-fill-input"
             onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; void pick(f) }} />
    </Dialog>
  )
}

/**
 * Suggested tasks — F5 build resolution applied (REG-24): trailing checkboxes and
 * "Cancel" (mock had leading boxes + "Close"); flagged in the plan.
 * Notes › Add tasks (931:45360, spec 02) is the `notes` variant of the same dialog: the 64px modal header, body V g24 p24,
 * "Auto added" / "Suggestions" 14/Semi Bold ink, rows 552×46 (p12/16 g8, stroke #e5e5e5; the auto row filled #eee5ff),
 * the boxes LEADING as that mock draws them (REG-24's trailing resolution was the Move stage window's), a rule between
 * the groups. The auto-added row is not a control in either variant — its check_box 24/Light #5500ff is a Material glyph,
 * so it is an `Icon`, not a disabled DS Checkbox (which would grey the glyph); the window draws it trailing (REG-24) with
 * the same surface-variant stroke as the Notes mock (audit 2026-08-30: one auto-row look for both variants). The label →
 * row gap is not written in the spec; 12 is what the mock's 385 total leaves (64 + 24 + [20+12+46] + 24 + 1 + 24 + [20+12+46] + 24 + 68).
 */
export function SuggestedTasksDialog({
  open, onClose, onSave, autoAdded, suggestions, picked, onToggle, title = 'Suggested tasks', width = 400, variant = 'wizard', onSkip, skipLabel = 'Cancel',
}: {
  open: boolean; onClose: () => void; onSave: () => void
  /** (UX audit 2026-09-30, L10) The footer's secondary button when it does more than close: the Move stage window's "Move without
      tasks" completes the move, while ✕ / Esc (`onClose`) go back to the log. Without it the button is Cancel and closes. */
  onSkip?: () => void; skipLabel?: string
  /** (REG-319) Empty when nothing was scheduled — the Auto added group is then left out. */
  autoAdded: string; suggestions: string[]
  picked: Set<string>; onToggle: (s: string) => void
  /** Notes › Add tasks (931:45360) reuses this shell as "Add tasks" at 600; the wizard keeps the 400 defaults. */
  title?: string; width?: number
  variant?: SharedDialogVariant
}) {
  const notes = variant === 'notes'
  /* (Leads on the move, B-23) the feet's buttons take the 48 target on a finger — the label and the desk untouched (wizard.module.css .touchBtn) */
  const footer = <><Button variant="secondary" appearance="outlined" onPress={onSkip ?? onClose} className={styles.touchBtn}>{skipLabel}</Button>
                   <Button onPress={onSave} className={styles.touchBtn}>Save</Button></>
  if (notes) {
    return (
      <Dialog open={open} onClose={onClose} title={title} width={width} size="modal" footer={footer}>
        {autoAdded ? (<>
        <div className={styles.taskGroup}>
          <span className={styles.groupLabel} data-variant="notes">Auto added</span>
          <div className={styles.taskRow} data-auto="true" data-variant="notes">
            <Icon name="check_box" size={24} weight={300} className={styles.taskCheck} />
            <span className={styles.taskText}>{autoAdded}</span>
          </div>
        </div>
        <Divider />
        </>) : null}
        <div className={styles.taskGroup}>
          <span className={styles.groupLabel} data-variant="notes">Suggestions</span>
          {suggestions.map((s) => (
            <button key={s} type="button" className={styles.taskRow} data-variant="notes" onClick={() => onToggle(s)}>
              <Checkbox isSelected={picked.has(s)} onChange={() => onToggle(s)} aria-label={s} />
              <span className={styles.taskText}>{s}</span>
            </button>
          ))}
        </div>
      </Dialog>
    )
  }
  return (
    <Dialog open={open} onClose={onClose} title={title} width={width} footer={footer} nested>
      {autoAdded ? (<>
      <span className={styles.groupLabel}>Auto added</span>
      <div className={styles.taskRow} data-auto="true" aria-label={`Auto added task: ${autoAdded}`}>
        <span className={styles.taskText}>{autoAdded}</span>
        <Icon name="check_box" size={24} weight={300} className={styles.taskCheck} />
      </div>
      </>) : null}
      <span className={styles.groupLabel}>Suggestions</span>
      {suggestions.map((s) => (
        <button key={s} type="button" className={styles.taskRow} onClick={() => onToggle(s)}>
          <span className={styles.taskText}>{s}</span>
          <Checkbox isSelected={picked.has(s)} onChange={() => onToggle(s)} aria-label={s} />
        </button>
      ))}
    </Dialog>
  )
}

/**
 * Move stage › On Hold. The follow-up is a DATE — the 1 / 3 / 6 month presets as chips plus "Custom", which alone reveals
 * the "Follow up on" date field, pre-filled with the preset that was on (REG-453, user feedback 2026-09-16: "the customer
 * could have requested a follow up at any point in the future"; the owner: "add custom as the last option and when user
 * selects the custom then only reveal the date selection input"). The date the helper line promises is the date saved
 * (REG-286), measured from `openedAt` — the instant the dialog opened.
 */
/**
 * (Leads on the move, P-04 · B-13 · B-14 — his marks 2026-10-23, "continue the leads") On a phone and a tablet held upright On Hold and Lost
 * share ONE SHEET: the lead's name under the title, the studio's reasons as chips (Settings › Lead management › Reasons), the follow-up's
 * chips or the competitor, one filled Save & move at 48 across the foot (✕ is Cancel); the host's snackbar carries the Undo, as before. The
 * house Sheet, so a refusal said just before it opened is withdrawn (B-14). The desk and a tablet held sideways keep the two dialogs.
 * *(invented copy: "Mark as lost", "Why", "Follow up in")*
 */
function ParkSheet({ open, onClose, title, leadName, onSave, testId, children }: {
  open: boolean; onClose: () => void; title: string; leadName?: string; onSave: () => void; testId: string; children: ReactNode
}) {
  return (
    <Sheet open={open} onClose={onClose} title={title} subtitle={leadName} label={leadName ? `${title} — ${leadName}` : title}
           footer={<div className={logStyles.foot}><Button className={logStyles.footBtn} onPress={onSave} data-testid={`${testId}-save`}>Save &amp; move</Button></div>}>
      <div className={logStyles.body} data-sheet="" data-testid={testId}>{children}</div>
    </Sheet>
  )
}
function ReasonChips({ options, value, onChange, error, hint }: { options: readonly string[]; value: string; onChange: (v: string) => void; error?: string; hint?: string }) {
  return (
    <div className={logStyles.group} data-error={error ? '' : undefined}>
      <span className={logStyles.label}>Why</span>
      <Chips label="Reason" options={options} value={value || null} onChange={onChange} className={logStyles.chips} testId="park-reasons" />
      {error ? <span className={logStyles.error} role="alert">{error}</span> : hint ? <span className={logStyles.label}>{hint}</span> : null}
    </div>
  )
}

export function OnHoldDialog({
  open, onClose, onSave, reason, setReason, openedAt, options = DEFAULT_HOLD_REASONS.map((r) => r.name), followUpOn = null, leadName,
}: {
  /** (Leads on the move, P-04) the lead's name — the sheet on the move says whose hold it is */
  leadName?: string
  open: boolean; onClose: () => void
  /** `followUpAt` is the ISO date the dialog shows; `duration` the preset it matches or "Until …" — store both (REG-286 / REG-453). */
  onSave: (otherReason: string | undefined, followUpAt: string, duration: string) => void
  reason: string; setReason: (v: string) => void
  /** When the dialog was opened (ms). The presets and the pre-fill are measured from it. */
  openedAt: number
  /** (REG-607) The studio's live On Hold reasons (Settings › Leads › Reasons), "Others" last. */
  options?: readonly string[]
  /** (Dane's UAT 9.08) Opened from the Lost dialog's "Put On Hold instead": the dialog opens on Custom with this date (REG-453's field). */
  followUpOn?: Date | null
}) {
  const screen = useOnTheMove()
  // "Other reason" and the date live here — the parent only knows `reason`.
  const [other, setOther] = useState('')
  const [when, setWhen] = useState('')   // d/m/yyyy, the DateField's canonical string
  const [custom, setCustom] = useState(false)   // the Custom chip: the date field shows only then
  const [showErrors, setShowErrors] = useState(false)
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {   // every opening starts on the default preset with nothing carried over from the last lead
    setWasOpen(open)
    if (open) { setWhen(inputDate(followUpOn ?? holdFollowUpAt(DEFAULT_HOLD_DURATION, openedAt))); setCustom(!!followUpOn); setOther(''); setShowErrors(false) }
  }
  const today = new Date(openedAt)
  const picked = parseInputDate(when)
  const errors = {
    reason: !reason ? MSG.required : undefined,
    other: reason === 'Others' && !other.trim() ? MSG.required : undefined,
    when: !when ? MSG.required : !picked ? MSG.date : startOfDay(picked) <= startOfDay(today) ? MSG.future : undefined,
  }
  const invalid = Object.values(errors).some(Boolean)
  const preset = custom ? 'Custom' : (HOLD_DURATIONS.find((d) => inputDate(holdFollowUpAt(d, openedAt)) === when) ?? null)
  const pick = (d: string) => { if (d === 'Custom') { setCustom(true); return } setCustom(false); setWhen(inputDate(holdFollowUpAt(d, openedAt))) }
  const close = () => { setOther(''); setShowErrors(false); onClose() }
  const save = () => {
    if (invalid || !picked) { setShowErrors(true); return }
    const v = reason === 'Others' ? other.trim() : undefined
    setOther(''); setShowErrors(false)
    onSave(v, picked.toISOString(), holdDurationLabel(picked, openedAt))
  }
  if (screen) {
    return (
      <ParkSheet open={open} onClose={close} title="Put on hold" leadName={leadName} onSave={save} testId="hold-sheet">
        <ReasonChips options={options} value={reason} onChange={setReason} error={showErrors ? errors.reason : undefined} />
        {reason === 'Others' ? <TextField label="Other reason" required value={other} onChange={setOther} error={showErrors ? errors.other : undefined} /> : null}
        <div className={logStyles.group}>
          <span className={logStyles.label}>Follow up in</span>
          <Chips label="Follow up in" options={[...HOLD_DURATIONS, 'Custom']} value={preset} onChange={pick} className={logStyles.chips} testId="hold-durations" />
        </div>
        {custom ? <DateField label="Follow up on" required value={when} onChange={setWhen} today={today} error={showErrors ? errors.when : undefined} /> : null}
        <span className={logStyles.label} data-testid="hold-next">Next follow up date will be {picked ? displayDate(picked) : '—'}</span>
      </ParkSheet>
    )
  }
  /* (parity P-10, the owner's pick 2026-10-08) The project's Put on hold dialog's twin: the same 400 `form` size — so on a phone both rise as a
     bottom sheet (REG-353; this one was a centred card) — and the same title; the line under it still says it is a stage move. */
  return (
    <Dialog open={open} onClose={close} title="Put on hold" width={400} size="form"
            subtitle={<span className={styles.subtitle}>Moving to On Hold</span>}
            footer={<><Button variant="secondary" appearance="outlined" onPress={close}>Cancel</Button>
                     <Button onPress={save}>Save &amp; Move</Button></>}>
      <TextField label="Reason" required value={reason} onChange={setReason} mode="select"
                 options={options}
                 error={showErrors ? errors.reason : undefined} />
      {reason === 'Others' ? (
        <TextField label="Other reason" required value={other} onChange={setOther} error={showErrors ? errors.other : undefined} />
      ) : null}
      <ChoiceChips label="Duration" required options={[...HOLD_DURATIONS, 'Custom']} value={preset} onChange={pick} />
      {custom ? <DateField label="Follow up on" required value={when} onChange={setWhen} today={today} error={showErrors ? errors.when : undefined} /> : null}
      <span className={styles.helper}>Next follow up date will be {picked ? displayDate(picked) : '—'}</span>
    </Dialog>
  )
}

/** What the Lost dialog hands back beside the reason (REG-607): the "Others" text, the competitor, the expected restart. */
export type LostDetail = { otherReason?: string; competitor?: string; restartAt?: string }

/**
 * Move stage › Lost (REG-607, parity Q-07 · Q-38). The reasons are the studio's list (Settings › Leads › Reasons — 1.0's seven and
 * 2.0's own, "Others" last). Two of them ask for a detail: the competitor's name, and the expected restart date with the nudge
 * toward On Hold when it is under six months away. A reason that expects logged contacts says how many there are — a hint, not a
 * block (the owner's call, 2026-09-24): Save never waits on it.
 */
export function LostDialog({
  open, onClose, onSave, reason, setReason, options = DEFAULT_LOST_REASONS.map((r) => r.name), reasons = DEFAULT_LOST_REASONS, contactCount = 0, today, competitorHint = null, onHoldInstead, leadName,
}: {
  /** (Leads on the move, P-04) the lead's name — the sheet on the move says whose it is */
  leadName?: string
  open: boolean; onClose: () => void; onSave: (detail: LostDetail) => void
  reason: string; setReason: (v: string) => void
  /** The live reason names the select offers. */
  options?: readonly string[]
  /** The studio's Lost reasons with their contact gates, for the hint. */
  reasons?: LeadReason[]
  /** The lead's logged contacts — the stage window's and the Notes tab's. */
  contactCount?: number
  /** The host's clock, for the restart date picker (never Date.now() in render). */
  today: Date
  /** (REG-640, X-Ray parity Q-18) The lead's latest Quote X-Ray — the competitor starts as its other studio, editable. */
  competitorHint?: { studio: string; at: number } | null
  /** (Dane's UAT 9.08) The nudge's "Put On Hold instead": the host closes this dialog and opens On Hold with the follow-up on `restart`. */
  onHoldInstead?: (restart: Date) => void
}) {
  const screen = useOnTheMove()
  const [other, setOther] = useState('')
  const [competitor, setCompetitor] = useState(competitorHint?.studio ?? '')
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) { setWasOpen(open); if (open) setCompetitor(competitorHint?.studio ?? '') }
  /* (pending modules S23) The studio's competitors (Settings › Meetings › Competitors) are offered under the field — a press puts the name in
     it; a firm not on the list is still typed. Read each time the dialog opens, so a name just added is there. */
  const [rivals, setRivals] = useState<string[]>([])
  useEffect(() => {
    if (!open) return
    let live = true
    fetchCompetitorNames().then((names) => { if (live) setRivals(names.slice(0, 12)) }).catch(() => { /* the field still takes a name */ })
    return () => { live = false }
  }, [open])
  const [restart, setRestart] = useState('')   // d/m/yyyy, the DateField's canonical string
  const [showErrors, setShowErrors] = useState(false)
  const restartDate = restart ? parseInputDate(restart) : null
  const errors = {
    reason: !reason ? MSG.required : undefined,
    other: reason === 'Others' && !other.trim() ? MSG.required : undefined,
    restart: restart && !restartDate ? MSG.date : undefined,
  }
  const invalid = Object.values(errors).some(Boolean)
  const gate = reasons.find((r) => r.name === reason)?.minContacts ?? 0
  const contactHint = gate > 0
    ? contactCount >= gate ? `${contactCount} ${contactCount === 1 ? 'contact' : 'contacts'} logged` : `${contactCount} of ${gate} contacts logged — this reason usually follows ${gate}`
    : undefined
  const soon = restartDate ? (startOfDay(restartDate) - startOfDay(today)) / 86_400_000 < 182 : false   // 1.0's nudge: under six months, hold instead
  /* (Dane's UAT 9.08) The nudge acts: a restart still ahead becomes On Hold's follow-up date. A date already passed keeps only the words —
     On Hold would refuse it ("Choose a date after today"). */
  const canHold = !!onHoldInstead && !!restartDate && startOfDay(restartDate) > startOfDay(today)
  const reset = () => { setOther(''); setCompetitor(''); setRestart(''); setShowErrors(false) }   // the dialog stays mounted between leads — never carry text or errors over
  const close = () => { reset(); onClose() }
  const save = () => {
    if (invalid) { setShowErrors(true); return }
    const detail: LostDetail = {
      otherReason: reason === 'Others' ? other.trim() : undefined,
      competitor: reason === LOST_COMPETITOR && competitor.trim() ? competitor.trim() : undefined,
      restartAt: reason === LOST_POSTPONED && restartDate ? restartDate.toISOString() : undefined,
    }
    reset(); onSave(detail)
  }
  const nudge = reason === LOST_POSTPONED && soon ? (
    <div className={styles.nudge} role="note" data-testid="lost-hold-nudge">
      <Icon name="warning" size={16} />
      <span className={styles.nudgeBody}>
        <span>Under 6 months away — consider On Hold instead.</span>
        {canHold ? (
          <button type="button" className={styles.nudgeAction} onClick={() => { const d = restartDate; if (!d) return; reset(); onHoldInstead?.(d) }}>
            Put On Hold instead
          </button>
        ) : null}
      </span>
    </div>
  ) : null
  if (screen) {
    return (
      <ParkSheet open={open} onClose={close} title="Mark as lost" leadName={leadName} onSave={save} testId="lost-sheet">
        <ReasonChips options={options} value={reason} onChange={setReason} error={showErrors ? errors.reason : undefined} hint={contactHint} />
        {reason === 'Others' ? <TextField label="Other reason" required value={other} onChange={setOther} error={showErrors ? errors.other : undefined} /> : null}
        {reason === LOST_COMPETITOR ? (
          <TextField label="Competitor (optional)" value={competitor} onChange={setCompetitor} maxLength={80} trailingIcon={null}
                     helper={competitorHint && competitor === competitorHint.studio ? `From the Quote X-Ray of ${displayDate(new Date(competitorHint.at))}` : undefined} />
        ) : null}
        {reason === LOST_COMPETITOR && rivals.length ? (
          <Chips label="Your competitors" options={rivals} value={rivals.find((n) => n.toLowerCase() === competitor.trim().toLowerCase()) ?? null} onChange={setCompetitor} testId="lost-competitor-chips" className={logStyles.chips} />
        ) : null}
        {reason === LOST_POSTPONED ? <DateField label="Expected restart (optional)" value={restart} onChange={setRestart} today={today} error={showErrors ? errors.restart : undefined} /> : null}
        {nudge}
      </ParkSheet>
    )
  }
  return (
    <Dialog open={open} onClose={close} title="Move stage" width={400}
            subtitle={<span className={styles.subtitle}>Moving to Lost</span>}
            footer={<><Button variant="secondary" appearance="outlined" onPress={close}>Cancel</Button>
                     <Button onPress={save}>Save &amp; Move</Button></>}>
      <TextField label="Reason" required value={reason} onChange={setReason} mode="select"
                 options={options}
                 error={showErrors ? errors.reason : undefined} helper={contactHint} />
      {reason === 'Others' ? (
        <TextField label="Other reason" required value={other} onChange={setOther} error={showErrors ? errors.other : undefined} />
      ) : null}
      {reason === LOST_COMPETITOR ? (
        <TextField label="Competitor (optional)" value={competitor} onChange={setCompetitor} maxLength={80} trailingIcon={null}
                   helper={competitorHint && competitor === competitorHint.studio ? `From the Quote X-Ray of ${displayDate(new Date(competitorHint.at))}` : undefined} />
      ) : null}
      {reason === LOST_COMPETITOR && rivals.length ? (
        <Chips label="Your competitors" options={rivals} value={rivals.find((n) => n.toLowerCase() === competitor.trim().toLowerCase()) ?? null} onChange={setCompetitor} testId="lost-competitor-chips" />   /* (pending modules S23) (invented copy: the group's name) */
      ) : null}
      {reason === LOST_POSTPONED ? (<>
        <DateField label="Expected restart (optional)" value={restart} onChange={setRestart} today={today} error={showErrors ? errors.restart : undefined} />
        {/* (Dane's UAT 9.08) The nudge in the house warning tone — the grey helper line went unread — with the move it suggests. Save & Move
            is unchanged: it still never blocks (REG-607). */}
        {nudge}
      </>) : null}
    </Dialog>
  )
}
