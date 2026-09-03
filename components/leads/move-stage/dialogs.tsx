'use client'

import { useState } from 'react'
import { Button, Checkbox } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { Dialog } from '@/components/om/dialog'
import { MSG } from '@/lib/forms'
import { displayDate } from '@/lib/format'
import { HOLD_DURATIONS, holdFollowUpAt } from '@/lib/leads/enums'
import { Divider, Dropzone, TextField } from './fields'
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
 * Move stage › On Hold. The dialog owns the duration vocabulary AND the follow-up date it promises: both come
 * from `HOLD_DURATIONS` / `holdFollowUpAt` (REG-286, audit finding "the On Hold duration → follow-up-date rule
 * is computed in four places"), measured from `openedAt` — the instant the dialog opened — so the date it
 * saves is the date the reader just agreed to, even if the dialog sat open across midnight.
 */
export function OnHoldDialog({
  open, onClose, onSave, reason, setReason, duration, setDuration, openedAt, followUp,
}: {
  open: boolean; onClose: () => void
  /** `followUpAt` is the ISO date this dialog just promised on screen — store THAT, never a recomputed one (REG-286). */
  onSave: (otherReason: string | undefined, followUpAt: string) => void
  reason: string; setReason: (v: string) => void
  duration: string; setDuration: (v: string) => void
  /** When the dialog was opened (ms). The follow-up date is measured from it. */
  openedAt?: number
  /** @deprecated Pass `openedAt` instead and let the dialog derive the line; only read while a caller still computes it. */
  followUp?: string
}) {
  // "Other reason" lives here — the parent only knows `reason` (see openQuestions in the change report).
  const [other, setOther] = useState('')
  const [showErrors, setShowErrors] = useState(false)
  const errors = {
    reason: !reason ? MSG.required : undefined,
    duration: !duration ? MSG.required : undefined,
    other: reason === 'Others' && !other.trim() ? MSG.required : undefined,
  }
  const invalid = Object.values(errors).some(Boolean)
  const reset = () => { setOther(''); setShowErrors(false) }   // the dialog stays mounted between leads — never carry text or errors over
  const close = () => { reset(); onClose() }
  // The promised date and the saved one are the same call on the same instant (REG-286).
  const followUpDate = (from: number) => holdFollowUpAt(duration, from)
  const followUpLine = openedAt === undefined ? (followUp ?? '') : displayDate(followUpDate(openedAt))
  const save = () => {
    if (invalid) { setShowErrors(true); return }
    const v = reason === 'Others' ? other.trim() : undefined
    reset()
    onSave(v, followUpDate(openedAt ?? Date.now()).toISOString())
  }
  return (
    <Dialog open={open} onClose={close} title="Move stage" width={400}
            subtitle={<span className={styles.subtitle}>Moving to On Hold</span>}
            footer={<><Button variant="secondary" appearance="outlined" onPress={close}>Cancel</Button>
                     <Button onPress={save}>Save &amp; Move</Button></>}>
      <TextField label="Reason" value={reason} onChange={setReason} mode="select"
                 options={['Property delay', 'Budget on hold', 'Travelling', 'Others']}
                 error={showErrors ? errors.reason : undefined} />
      {reason === 'Others' ? (
        <TextField label="Other reason" value={other} onChange={setOther} error={showErrors ? errors.other : undefined} />
      ) : null}
      <TextField label="Duration" value={duration} onChange={setDuration} mode="select"
                 options={HOLD_DURATIONS}
                 error={showErrors ? errors.duration : undefined} />
      <span className={styles.helper}>Next follow up date will be {followUpLine}</span>
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
      <TextField label="Reason" value={reason} onChange={setReason} mode="select"
                 options={['Property too far', 'Went with another firm', 'Budget mismatch', 'Unresponsive', 'Others']}
                 error={showErrors ? errors.reason : undefined} />
      {reason === 'Others' ? (
        <TextField label="Other reason" value={other} onChange={setOther} error={showErrors ? errors.other : undefined} />
      ) : null}
    </Dialog>
  )
}
