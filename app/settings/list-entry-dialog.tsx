'use client'

import { useState } from 'react'
import { Button } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { TextField } from '@/components/om/text-field'
import { MSG } from '@/lib/forms'
import styles from './settings.module.css'

export type EntryEdit = { name: string; position: number; gate?: number }

/**
 * (REG-647, settings parity Q-09) One entry of a Settings list — a lead source, a Lost or On Hold reason: its name (a rename carries the
 * leads and logs that hold it), its place in the list, and for a Lost reason the logged contacts it expects. The house form dialog.
 */
export function ListEntryDialog({ open, title, entry, total, withGate = false, note, taken, onClose, onSave }: {
  open: boolean; title: string; entry: EntryEdit | null; total: number; withGate?: boolean
  /** (sweep S4 #23) A name the list refused as taken: said on the Name field while it is still what is typed. */
  taken?: string | null
  /** One line under the fields — what a rename does, or what this entry asks for. */
  note?: string
  onClose: () => void; onSave: (e: EntryEdit) => void
}) {
  const [draft, setDraft] = useState<EntryEdit | null>(entry)
  const [seen, setSeen] = useState<EntryEdit | null>(entry)
  const [tried, setTried] = useState(false)
  if (seen !== entry) { setSeen(entry); setDraft(entry); setTried(false) }   // render-phase adjust: each opening starts from the entry
  const empty = !draft?.name.trim()
  const save = () => { if (!draft) return; if (empty) { setTried(true); return } onSave({ ...draft, name: draft.name.trim().replace(/\s+/g, ' ') }) }
  const positions = Array.from({ length: Math.max(1, total) }, (_, i) => String(i + 1))
  return (
    <Dialog open={open} onClose={onClose} title={title} subtitle={entry?.name} size="modal" width={400}   /* (sweep S4 #19) the modal scale's s, the modal header standard */
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button><Button onPress={save}>Save</Button></>}>
      {draft ? (
        <div className={styles.entryForm} data-testid="list-entry">
          <TextField label="Name" required value={draft.name} autoFocus maxLength={40} onChange={(v) => setDraft({ ...draft, name: v })} error={tried && empty ? MSG.required : taken && draft.name.trim().toLowerCase() === taken.trim().toLowerCase() ? `${taken.trim()} is already in the list` : undefined}
                     onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); save() } }} />
          <TextField label="Place in the list" mode="select" options={positions} value={String(draft.position)} onChange={(v) => setDraft({ ...draft, position: Number(v) })} />
          {withGate ? <TextField label="Needs logged contacts" value={draft.gate ? String(draft.gate) : ''} numeric="digits" maxLength={2} trailingIcon={null}
                                 onChange={(v) => setDraft({ ...draft, gate: v ? Math.min(20, Number(v)) : 0 })} helper="Blank asks for none — the Lost dialog says how many are logged" /> : null}
          {note ? <p className={styles.settingHelp}>{note}</p> : null}
        </div>
      ) : null}
    </Dialog>
  )
}
