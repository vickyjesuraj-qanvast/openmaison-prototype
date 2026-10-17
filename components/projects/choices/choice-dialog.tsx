'use client'

import { useState } from 'react'
import { Button } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { DateField } from '@/components/om/date-field'
import { TextField } from '@/components/om/text-field'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import { useSnackbar } from '@/components/om/snackbar'
import { saveChoice } from '@/app/projects/choices-actions'
import { MSG } from '@/lib/forms'
import { inputDate, parseInputDate } from '@/lib/format'
import { NOTE_MAX, ROOM_MAX, STUDIO_NOTE_MAX, TITLE_MAX, pickBlock, type ChoiceMilestone, type ChoiceView } from '@/lib/projects/choices-model'
import { dayOf } from '@/lib/projects/schedule-model'
import styles from './choices.module.css'

const NONE = 'None'

/**
 * (Projects round 8) Add a choice, or change one — a form dialog (a bottom sheet on a phone, REG-353): what the client chooses, the room or
 * area it is for (the tab groups by it), the milestone the work belongs to (only when the project has a schedule — a pick can change until
 * it starts), the day the studio needs the answer, and a line for the client. A new choice lands as a Draft; its options come next, on the
 * card. The dialog closes only once its save lands.
 */
export function ChoiceDialog({ open, projectId, editing, milestones, clientFirst, today, stage = 'in_progress', onClose, onSaved }: {
  open: boolean
  projectId: string
  editing: ChoiceView | null
  milestones: ChoiceMilestone[]
  clientFirst: string
  today: Date
  /** (fix-C, C-11) The project's stage — a chosen choice's lock reads it. */
  stage?: string
  onClose: () => void
  onSaved: (id: string, isNew: boolean) => void
}) {
  const snack = useSnackbar()
  const [title, setTitle] = useState('')
  const [room, setRoom] = useState('')
  const [milestone, setMilestone] = useState(NONE)
  const [needed, setNeeded] = useState('')
  const [note, setNote] = useState('')
  const [studioNote, setStudioNote] = useState('')   // (gaps build D, item 11) the team's own note
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)
  /* each opening starts from the choice being edited, or blank (the render-phase adjust pattern) */
  const [seen, setSeen] = useState<string | null>(null)
  const key = open ? editing?.id ?? 'new' : null
  if (key !== seen) {
    setSeen(key)
    if (key) {
      setTitle(editing?.title ?? ''); setRoom(editing?.room ?? ''); setNote(editing?.note ?? ''); setStudioNote(editing?.studioNote ?? '')
      setMilestone(editing?.milestone?.title ?? NONE); setNeeded(editing?.neededBy ? inputDate(new Date(editing.neededBy)) : ''); setTried(false)
    }
  }
  const titleError = tried && !title.trim() ? MSG.required : undefined
  /* (fix-C, C-11) a pick locked by its milestone's start keeps that milestone — the field reads only and says why */
  const lock = editing && editing.status === 'chosen' && editing.milestone && pickBlock(editing, stage, dayOf(today)) ? `The pick is locked — ${editing.milestone.title} has started` : null
  const save = async () => {
    if (busy) return
    if (!title.trim()) { setTried(true); return }
    setBusy(true)
    try {
      const m = milestones.find((x) => x.title === milestone) ?? null
      const day = parseInputDate(needed)
      const r = await saveChoice(projectId, { id: editing?.id ?? null, title, room, milestoneId: m?.id ?? null, neededBy: day ? day.getTime() : null, note, studioNote })
      if ('error' in r) { snack({ message: couldnt(editing ? 'save the choice' : 'add the choice', refusalOf(r.error)) }); return }
      onSaved(r.id, !editing)
    } catch {
      snack({ message: couldnt(editing ? 'save the choice' : 'add the choice') })
    } finally {
      setBusy(false)
    }
  }
  return (
    <Dialog open={open} onClose={onClose} closeOnScrim={false} size="form" width={600} title={editing ? 'Edit choice' : 'Add a choice'}
            subtitle={editing ? (editing.status === 'draft' ? 'Only the studio sees it until you share it.' : `${clientFirst} sees the change at once.`) : `It starts as a draft — add the options, then share it with ${clientFirst}.`}
            footer={<>
              <Button variant="secondary" appearance="outlined" onPress={onClose} isDisabled={busy}>Cancel</Button>
              <Button onPress={() => { void save() }} isDisabled={busy} data-testid="choice-save">{busy ? 'Saving…' : editing ? 'Save changes' : 'Add choice'}</Button>
            </>}>
      <div className={styles.fields} data-testid="choice-dialog">
        <TextField label="What the client chooses" required value={title} onChange={setTitle} maxLength={TITLE_MAX} autoFocus={!editing} error={titleError}
                   helper={`${title.length}/${TITLE_MAX} · “Paint colours”, “Kitchen countertop”`} />
        <TextField label="Room or area" value={room} onChange={setRoom} maxLength={ROOM_MAX} helper="Where it goes — “Living and bedrooms”" />
        <div className={styles.row2}>
          {milestones.length ? (
            <TextField label="Milestone" mode="select" options={[NONE, ...milestones.map((m) => m.title)]} value={milestone} onChange={setMilestone} disabled={!!lock} helper={lock ?? 'The pick can change until it starts'} />
          ) : null}
          <DateField label="Needed by" value={needed} onChange={setNeeded} today={today} helper="When you need the answer" />
        </div>
        <TextField label={`A line for ${clientFirst}`} value={note} onChange={setNote} maxLength={NOTE_MAX} multiline={3} helper="Optional — what to think about, where to see it" />   {/* (fix-C, C-30) a few lines, their breaks kept */}
        {/* (gaps build D, item 11 — 1.0 F-162) the team's own note: never on the portal, the receipt or the client's preview */}
        <TextField label="A note for the team" value={studioNote} onChange={setStudioNote} maxLength={STUDIO_NOTE_MAX} multiline={2} helper={`Optional — only the studio sees it, never ${clientFirst}`} />
      </div>
    </Dialog>
  )
}
