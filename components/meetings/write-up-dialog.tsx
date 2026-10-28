'use client'

import { useState } from 'react'
import { Button, Checkbox, TextArea } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { Chips } from '@/components/om/chips'
import { TextField } from '@/components/om/text-field'
import { DateTimeField } from '@/components/om/date-field'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { AssigneeField } from '@/components/leads/assignee-field'
import { Dropzone } from '@/components/leads/move-stage/fields'
import { MSG } from '@/lib/forms'
import { fileSize, parseInputDateTime } from '@/lib/format'
import { FILE_UPLOAD_MAX, tooBigLine } from '@/lib/leads/file-model'
import { AIMS, WHERE, RECORDING_CONSENT, TRANSCRIBE_STAND_IN, TRANSCRIBES, firstOf, type AimKey, type WhereKind } from '@/lib/meetings/model'
import type { TeamMember } from '@/lib/meetings/queries'
import styles from './meetings.module.css'

export type WriteUpValue = { aim: AimKey; when: string; whereKind: WhereKind; memberIds: string[]; notes: string; recording: { name: string; data: string; size: number } | null; consent: boolean }
const toDataUrl = (f: File) => new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => rej(r.error); r.readAsDataURL(f) })

/**
 * (pending modules S23 — 1.0's "Analyze a Recording" / Upload Meeting Recording, and the meeting written up after it) A meeting the co-pilot
 * didn't sit in: the studio's notes, or a recording — kept in the lead's Files with its bytes (an audio file up to 8 MB, the Files limit), with
 * everyone's agreement ticked (1.0's permission line). Turning a recording into words isn't connected in the prototype, and the dialog says so:
 * the transcript or the notes are pasted, and the brief is made from them by rule. Nothing is metered (1.0 charged nothing here). *(invented copy)*
 */
export function WriteUpDialog({ open, onClose, onSave, team, client, defaults, today, busy, start = 'notes' }: {
  open: boolean; onClose: () => void
  onSave: (v: WriteUpValue) => Promise<boolean>
  team: TeamMember[]
  client: string
  defaults: Partial<WriteUpValue>
  today: Date
  busy?: boolean
  /** opened as "Upload a recording" */
  start?: 'notes' | 'recording'
}) {
  const init = (): WriteUpValue => ({ aim: defaults.aim ?? 'first_consultation', when: defaults.when ?? '', whereKind: defaults.whereKind ?? 'In person', memberIds: defaults.memberIds ?? [], notes: defaults.notes ?? '', recording: null, consent: false })
  const [v, setV] = useState<WriteUpValue>(init)
  const [from, setFrom] = useState<'notes' | 'recording'>(start)
  const [tried, setTried] = useState(false)
  const [pickError, setPickError] = useState<string | null>(null)
  const [reading, setReading] = useState(false)
  const [shown, setShown] = useState(open)
  if (open !== shown) { setShown(open); if (open) { setV(init()); setFrom(start); setTried(false); setPickError(null) } }
  const set = (p: Partial<WriteUpValue>) => setV((x) => ({ ...x, ...p }))
  const errors = {
    when: !v.when ? MSG.required : !parseInputDateTime(v.when) ? MSG.dateTime : undefined,
    people: v.memberIds.length ? undefined : MSG.assignee,
    notes: v.notes.trim() || (TRANSCRIBES && from === 'recording' && v.recording) ? undefined : MSG.required,   // (pending modules S34) a transcriber writes the words
    recording: from === 'recording' && !v.recording ? 'Pick the recording' : undefined,
    consent: from === 'recording' && v.recording && !v.consent ? 'Tick it before the recording is kept' : undefined,
  }
  const pick = async (f?: File) => {
    setPickError(null)
    if (!f) return
    if (!/^audio\/|^video\/(mp4|webm)$/.test(f.type) && !/\.(mp3|m4a|wav|webm|ogg|aac|mp4)$/i.test(f.name)) { setPickError('Pick an audio file — mp3, m4a, wav, webm or ogg'); return }
    if (f.size > FILE_UPLOAD_MAX) { setPickError(tooBigLine(f.name)); return }
    setReading(true)
    try { set({ recording: { name: f.name, data: await toDataUrl(f), size: f.size } }) } catch { setPickError('This file didn’t read — pick it again') } finally { setReading(false) }
  }
  const save = async () => {
    setTried(true)
    if (Object.values(errors).some(Boolean)) return
    if (await onSave(from === 'recording' ? v : { ...v, recording: null, consent: false })) onClose()
  }
  return (
    <Dialog open={open} onClose={onClose} title={from === 'recording' ? 'Upload a recording' : 'Write up a meeting'} subtitle={`With ${firstOf(client)}`} size="modal" width={600} closeOnScrim={false}
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button><Button onPress={() => { void save() }} isDisabled={busy || reading} data-testid="writeup-save">Make the summary</Button></>}>
      <div className={styles.form} data-testid="writeup-dialog">
        <Chips label="From" value={from} onChange={(x) => setFrom(x as 'notes' | 'recording')} options={[{ value: 'notes', label: 'My notes' }, { value: 'recording', label: 'A recording' }]} testId="writeup-from" />
        <div className={styles.group}>
          <span className={styles.groupLabel}>What it was for</span>
          <Chips label="What it was for" value={v.aim} onChange={(a) => set({ aim: a as AimKey })} options={AIMS.map((a) => ({ value: a.key, label: a.label }))} />
        </div>
        <div className={styles.pair}>
          <DateTimeField label="Date and time" required value={v.when} onChange={(x) => set({ when: x })} today={today} error={tried ? errors.when : undefined} />
          <TextField label="Where" required value={v.whereKind} mode="select" options={[...WHERE]} onChange={(x) => set({ whereKind: x as WhereKind })} />
        </div>
        <AssigneeField label="Who went" team={team} value={v.memberIds} onChange={(ids) => set({ memberIds: ids })} error={tried ? errors.people : undefined} />
        {from === 'recording' ? (
          <div className={styles.group}>
            {v.recording ? (
              <div className={styles.fileRow} data-testid="writeup-recording">
                <Icon name="mic" size={24} weight={300} />
                <span className={styles.fileName}>{v.recording.name}</span>
                <span className={styles.muted}>{fileSize(v.recording.size)}</span>
                <Tooltip label="Remove the recording"><IconButton icon="close" label="Remove the recording" onClick={() => set({ recording: null, consent: false })} /></Tooltip>
              </div>
            ) : <Dropzone title={<>Drop the recording here or <b>browse</b></>} helper="mp3, m4a, wav, webm or ogg · up to 8 MB" accept="audio/*,.m4a,.mp3,.wav,.webm,.ogg" onPick={(f) => { void pick(f) }} uploading={reading} label="Upload the recording" />}
            {pickError || (tried && errors.recording) ? <p className={styles.error} role="alert">{pickError ?? errors.recording}</p> : null}
            {v.recording ? (
              <div className={styles.check}>
                <Checkbox isSelected={v.consent} onChange={(on: boolean) => set({ consent: on })} data-testid="writeup-consent">{RECORDING_CONSENT}</Checkbox>
                {tried && errors.consent ? <p className={styles.error} role="alert">{errors.consent}</p> : null}
              </div>
            ) : null}
            {TRANSCRIBES ? null : <p className={styles.note} data-testid="writeup-stand-in">{TRANSCRIBE_STAND_IN}</p>}
          </div>
        ) : null}
        <div className={styles.group}>
          <TextArea className={styles.notesBox} label={from === 'recording' ? 'Its transcript, or your notes from it' : 'What was said'} value={v.notes} onChange={(x: string) => set({ notes: x })} data-testid="writeup-notes" />
          <p className={styles.checkHelp}>A line can start with who said it — “Client:” or “Me:” — so the tips read the client’s words.</p>
          {tried && errors.notes ? <p className={styles.error} role="alert">{from === 'recording' ? 'Paste the transcript or your notes' : 'Write what was said'}</p> : null}
        </div>
      </div>
    </Dialog>
  )
}
