'use client'

import { useState } from 'react'
import { Button, Checkbox } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { Dialog } from '@/components/om/dialog'
import { MSG } from '@/lib/forms'
import { displayDate, inputDate, parseInputDate, startOfDay } from '@/lib/format'
import { DEFAULT_HOLD_DURATION, HOLD_DURATIONS, holdDurationLabel, holdFollowUpAt } from '@/lib/leads/enums'
import { ChoiceChips, DateField, Divider, Dropzone, TextField } from './fields'
import styles from './wizard.module.css'

// The dialog shell and the destructive button are generic primitives (components/om/dialog); re-exported here so the
// screens that reached for them through this module keep working (audit 2026-08-30).
export { Dialog, DangerButton, type DialogSize } from '@/components/om/dialog'

/** Where the two shared dialogs are used: the Move stage window (their defaults) or Lead Details › Notes (spec 02). */
export type SharedDialogVariant = 'wizard' | 'notes'

export function AutoFillDialog({
  open, onClose, onUpload, title = 'Auto Fill', width = 400, variant = 'wizard',
}: {
  open: boolean; onClose: () => void; onUpload: () => void
  /** Notes › Auto Fill (931:45344) reuses this shell at 600 with the same title; the wizard keeps the 400 defaults. */
  title?: string; width?: number
  /** `notes` = the 600×348 mock (spec 02): the 64px modal header (`size="modal"`) and the 552×168 p40 dropzone. */
  variant?: SharedDialogVariant
}) {
  const notes = variant === 'notes'
  return (
    <Dialog open={open} onClose={onClose} title={title} width={width} size={notes ? 'modal' : 'compact'} nested={!notes}
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button>
                     <Button onPress={onUpload}>Upload</Button></>}>
      <Dropzone
        title={<>Drop in the conversation or <b>browse</b></>}
        helper="Upload a screenshot from any messaging app — we'll identify the channel, summarise the conversation, and suggest tasks."
        onPick={onUpload}
        variant={notes ? 'notes' : undefined}
      />
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
  open, onClose, onSave, autoAdded, suggestions, picked, onToggle, title = 'Suggested tasks', width = 400, variant = 'wizard',
}: {
  open: boolean; onClose: () => void; onSave: () => void
  /** (REG-319) Empty when nothing was scheduled — the Auto added group is then left out. */
  autoAdded: string; suggestions: string[]
  picked: Set<string>; onToggle: (s: string) => void
  /** Notes › Add tasks (931:45360) reuses this shell as "Add tasks" at 600; the wizard keeps the 400 defaults. */
  title?: string; width?: number
  variant?: SharedDialogVariant
}) {
  const notes = variant === 'notes'
  const footer = <><Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button>
                   <Button onPress={onSave}>Save</Button></>
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
export function OnHoldDialog({
  open, onClose, onSave, reason, setReason, openedAt,
}: {
  open: boolean; onClose: () => void
  /** `followUpAt` is the ISO date the dialog shows; `duration` the preset it matches or "Until …" — store both (REG-286 / REG-453). */
  onSave: (otherReason: string | undefined, followUpAt: string, duration: string) => void
  reason: string; setReason: (v: string) => void
  /** When the dialog was opened (ms). The presets and the pre-fill are measured from it. */
  openedAt: number
}) {
  // "Other reason" and the date live here — the parent only knows `reason`.
  const [other, setOther] = useState('')
  const [when, setWhen] = useState('')   // d/m/yyyy, the DateField's canonical string
  const [custom, setCustom] = useState(false)   // the Custom chip: the date field shows only then
  const [showErrors, setShowErrors] = useState(false)
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {   // every opening starts on the default preset with nothing carried over from the last lead
    setWasOpen(open)
    if (open) { setWhen(inputDate(holdFollowUpAt(DEFAULT_HOLD_DURATION, openedAt))); setCustom(false); setOther(''); setShowErrors(false) }
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
  return (
    <Dialog open={open} onClose={close} title="Move stage" width={400}
            subtitle={<span className={styles.subtitle}>Moving to On Hold</span>}
            footer={<><Button variant="secondary" appearance="outlined" onPress={close}>Cancel</Button>
                     <Button onPress={save}>Save &amp; Move</Button></>}>
      <TextField label="Reason" required value={reason} onChange={setReason} mode="select"
                 options={['Property delay', 'Budget on hold', 'Travelling', 'Others']}
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

export function LostDialog({
  open, onClose, onSave, reason, setReason,
}: {
  open: boolean; onClose: () => void; onSave: (otherReason?: string) => void
  reason: string; setReason: (v: string) => void
}) {
  const [other, setOther] = useState('')
  const [showErrors, setShowErrors] = useState(false)
  const errors = {
    reason: !reason ? MSG.required : undefined,
    other: reason === 'Others' && !other.trim() ? MSG.required : undefined,
  }
  const invalid = Object.values(errors).some(Boolean)
  const reset = () => { setOther(''); setShowErrors(false) }   // the dialog stays mounted between leads — never carry text or errors over
  const close = () => { reset(); onClose() }
  const save = () => { if (invalid) { setShowErrors(true); return } const v = reason === 'Others' ? other.trim() : undefined; reset(); onSave(v) }
  return (
    <Dialog open={open} onClose={close} title="Move stage" width={400}
            subtitle={<span className={styles.subtitle}>Moving to Lost</span>}
            footer={<><Button variant="secondary" appearance="outlined" onPress={close}>Cancel</Button>
                     <Button onPress={save}>Save &amp; Move</Button></>}>
      <TextField label="Reason" required value={reason} onChange={setReason} mode="select"
                 options={['Property too far', 'Went with another firm', 'Budget mismatch', 'Unresponsive', 'Others']}
                 error={showErrors ? errors.reason : undefined} />
      {reason === 'Others' ? (
        <TextField label="Other reason" required value={other} onChange={setOther} error={showErrors ? errors.other : undefined} />
      ) : null}
    </Dialog>
  )
}
