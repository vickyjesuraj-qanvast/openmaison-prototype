'use client'

import { useRef, useState } from 'react'
import { Button, TextArea } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { TextField } from '@/components/om/text-field'
import { Tooltip } from '@/components/om/tooltip'
import { useSnackbar } from '@/components/om/snackbar'
import { photoOf } from '@/components/projects/floor-plan/plan-picture'
import { MSG } from '@/lib/forms'
import { BODY_MAX, NOTE_MAX, PHOTOS_MAX, SUBJECT_MAX } from '@/lib/projects/tickets-model'
import styles from './tickets.module.css'

/**
 * (gaps build H — H-Q3 · H-Q4 · H-Q9) The ticket's dialogs, on the house Dialog: New ticket (the client's report form, raised by the studio —
 * a call, a site visit), Mark resolved (an optional closing line the client reads), Escalate (a note Owners and Admins read). Each closes only
 * once its save lands (`onSave` answers whether it did); errors show after the first press and clear as typed.
 */
export type NewTicketInput = { category: string; subject: string; body: string; photos: string[]; assigneeId: string | null }

/** Photos picked for a form — shrunk in the browser (the floor plan's 1600 px), up to `max`. */
export function usePickedPhotos(max: number) {
  const snackbar = useSnackbar()
  const [photos, setPhotos] = useState<string[]>([])
  const input = useRef<HTMLInputElement>(null)
  const pick = async (files: FileList | null) => {
    const list = Array.from(files ?? []).filter((f) => f.type.startsWith('image/'))
    const room = max - photos.length
    if (!list.length) return
    if (room <= 0) { snackbar({ message: `Add up to ${max} photos` }); return }
    const read = (await Promise.all(list.slice(0, room).map((f) => photoOf(f)))).filter((x): x is string => !!x)
    if (list.length > room) snackbar({ message: `Add up to ${max} photos — ${room} added` })
    setPhotos((p) => [...p, ...read].slice(0, max))
  }
  const view = (
    <div className={styles.formRow}>
      <Tooltip label={photos.length >= max ? `Up to ${max} photos` : 'Add photos'}>
        <IconButton icon="add_photo_alternate" label="Add photos" onClick={() => input.current?.click()} disabled={photos.length >= max} data-testid="form-add-photo" />
      </Tooltip>
      <input ref={input} className={styles.fileInput} type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={(e) => { void pick(e.target.files); e.target.value = '' }} data-testid="form-photo-input" />
      <div className={styles.formPhotos}>
        {photos.map((p, i) => (
          <span key={i} className={styles.formPick}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p} alt="" />
            <button type="button" className={styles.unpick} aria-label={`Take photo ${i + 1} off`} onClick={() => setPhotos((x) => x.filter((_, k) => k !== i))}><Icon name="close" size={14} /></button>
          </span>
        ))}
      </div>
      <span className={styles.help}>{`Photos — up to ${max}, optional`}</span>
    </div>
  )
  return { photos, reset: () => setPhotos([]), view }
}

/** The Handled by select's first option. (invented copy) */
export const NOBODY = 'Nobody yet'

export function NewTicketDialog({ open, categories, team, client, onClose, onSave }: {
  open: boolean; categories: string[]; team: { id: string; name: string; onTeam: boolean }[]; client: string
  onClose: () => void; onSave: (i: NewTicketInput) => Promise<boolean>
}) {
  const [category, setCategory] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [assignee, setAssignee] = useState(NOBODY)
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)
  const ph = usePickedPhotos(PHOTOS_MAX)
  const names = team.map((m) => m.name)
  const reset = () => { setCategory(''); setSubject(''); setBody(''); setAssignee(NOBODY); setTried(false); ph.reset() }
  const save = async () => {
    setTried(true)
    if (!category || !subject.trim()) return
    setBusy(true)
    try {
      const ok = await onSave({ category, subject, body, photos: ph.photos, assigneeId: team.find((m) => m.name === assignee)?.id ?? null })
      if (ok) reset()
    } finally { setBusy(false) }
  }
  return (
    /* (the calm UI build 2026-10-27, 3-37 · 1-11) "New issue" — the client's word on both sides */
    <Dialog open={open} onClose={() => { reset(); onClose() }} title="New issue" subtitle={`For ${client} — they see it on their page and can answer there.`} size="modal" width={600}
            footer={<><Button variant="secondary" appearance="outlined" onPress={() => { reset(); onClose() }}>Cancel</Button><Button onPress={() => { void save() }} isDisabled={busy} data-testid="new-ticket-save">{busy ? 'Saving…' : 'Add issue'}</Button></>}>
      <div className={styles.form} data-testid="new-ticket">
        <TextField label="Category" mode="select" options={categories} value={category} onChange={setCategory} required error={tried && !category ? MSG.required : undefined} />
        <TextField label="Subject" value={subject} onChange={(v) => setSubject(v.slice(0, SUBJECT_MAX))} maxLength={SUBJECT_MAX} required error={tried && !subject.trim() ? MSG.required : undefined} helper="A short line — “Water stain under the kitchen sink”" />
        <TextArea label="What happened" value={body} onChange={(v: string) => setBody(v.slice(0, BODY_MAX))} className={styles.field} />
        {ph.view}
        <TextField label="Handled by" mode="select" options={[NOBODY, ...names]} value={assignee} onChange={setAssignee} helper="Optional — they hear it on the bell" />   {/* (the calm UI build 2026-10-27, W-244) */}
      </div>
    </Dialog>
  )
}

export function ResolveDialog({ open, number, client, onClose, onSave }: { open: boolean; number: string; client: string; onClose: () => void; onSave: (note: string) => Promise<boolean> }) {
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const save = async () => { setBusy(true); try { if (await onSave(note)) setNote('') } finally { setBusy(false) } }
  return (
    <Dialog open={open} onClose={onClose} title={`Mark ${number} resolved`} subtitle={`${client} reads your line and can reply to reopen it, or close it.`} size="modal" width={600}
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button><Button onPress={() => { void save() }} isDisabled={busy} data-testid="resolve-save">{busy ? 'Saving…' : 'Mark resolved'}</Button></>}>
      <div className={styles.form}>
        <TextArea label="A closing line to the client (optional)" value={note} onChange={(v: string) => setNote(v.slice(0, BODY_MAX))} className={styles.field} />
      </div>
    </Dialog>
  )
}

export function EscalateDialog({ open, number, onClose, onSave }: { open: boolean; number: string; onClose: () => void; onSave: (note: string) => Promise<boolean> }) {
  const [note, setNote] = useState('')
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)
  const save = async () => { setTried(true); if (!note.trim()) return; setBusy(true); try { if (await onSave(note)) { setNote(''); setTried(false) } } finally { setBusy(false) } }
  return (
    /* (the calm UI build 2026-10-27, 1-10 · W-181) Escalate → Flag to the Owner; "Needs your attention" (T-01) */
    <Dialog open={open} onClose={onClose} title={`Flag ${number} to the Owner`} subtitle="It turns Urgent, Owners and Admins hear it, and the project stays in Needs your attention until it is resolved." size="modal" width={600}
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button><Button onPress={() => { void save() }} isDisabled={busy} data-testid="escalate-save">{busy ? 'Saving…' : 'Flag to the Owner'}</Button></>}>
      <div className={styles.form}>
        <TextField label="Why it is urgent" value={note} onChange={(v) => setNote(v.slice(0, NOTE_MAX))} maxLength={NOTE_MAX} required error={tried && !note.trim() ? MSG.required : undefined} helper="Owners and Admins read this — the client doesn’t" />
      </div>
    </Dialog>
  )
}
