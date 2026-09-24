'use client'

import { useState } from 'react'
import { Button } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { TextField } from '@/components/om/text-field'
import { DateTimeField } from '@/components/om/date-field'
import { MSG } from '@/lib/forms'
import { parseInputDateTime } from '@/lib/format'
import styles from '@/components/leads/move-stage/wizard.module.css'

/**
 * (REG-608, parity Q-03) Set a follow-up — 1.0 keeps a next follow-up date on the lead and turns it into a task; 2.0 keeps the
 * task as the single source: one dated Follow-up task on the lead, assigned to its members, which the bell raises 30 minutes
 * before. The dialog is the Move stage dialogs' 400 card; the date is picked, never typed (REG-119). Invented copy.
 */
export function FollowUpDialog({ open, leadName, today, onClose, onSave }: {
  open: boolean
  leadName: string
  /** The host's clock (never Date.now() in render). */
  today: Date
  onClose: () => void
  onSave: (v: { title: string; dueAt: Date }) => void
}) {
  const [when, setWhen] = useState('')   // d/m/yyyy, h:mm AM — the DateTimeField's canonical string
  const [title, setTitle] = useState('')
  const [showErrors, setShowErrors] = useState(false)
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {   // every opening starts fresh, titled for this lead
    setWasOpen(open)
    if (open) { setWhen(''); setTitle(`Follow up with ${leadName}`); setShowErrors(false) }
  }
  const due = when ? parseInputDateTime(when) : null
  const errors = { when: !when ? MSG.required : !due ? MSG.dateTime : undefined, title: !title.trim() ? MSG.required : undefined }
  const invalid = Object.values(errors).some(Boolean)
  const save = () => { if (invalid || !due) { setShowErrors(true); return } onSave({ title: title.trim(), dueAt: due }) }
  return (
    <Dialog open={open} onClose={onClose} title="Set a follow-up" width={400} size="form"
            subtitle={<span className={styles.subtitle}>{leadName}</span>}
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button>
                     <Button onPress={save}>Save</Button></>}>
      <DateTimeField label="When" required value={when} onChange={setWhen} today={today} error={showErrors ? errors.when : undefined} />
      <TextField label="Task" required value={title} onChange={setTitle} maxLength={120} trailingIcon={null} error={showErrors ? errors.title : undefined} />
      <span className={styles.helper}>A Follow-up task for the lead’s members; the bell raises it 30 minutes before.</span>
    </Dialog>
  )
}
