'use client'

import { useState } from 'react'
import { Button, Switch } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { TextField } from '@/components/om/text-field'
import { ChoiceCard } from '@/components/om/choice-card'
import styles from './publish-dialog.module.css'

/**
 * Publish (REG-485; 6d corrected: no review step): a note on what changed, whether this becomes the studio's default,
 * whether open draft quotes move to the new version. Sent quotes always keep the version they were sent with.
 */
export function PublishDialog({ open, onClose, name, nextVersion, isDefault, usedBy, busy, onPublish, origin = null, approve = null }: {
  open: boolean; onClose: () => void; name: string; nextVersion: number; isDefault: boolean; usedBy: number; busy: boolean
  onPublish: (opts: { note: string; setDefault: boolean; updateDrafts: boolean; then: 'stay' | 'origin' }) => void
  /** (REG-495) Opened from a quote or a lead: the choice to update that quote / start that lead's quote and go back. */
  origin?: { kind: 'quote' | 'lead'; label: string } | null
  /** (REG-501) Approving a designer's submission: the title and button say so, the designer's note is the default. */
  approve?: { by: string; note: string } | null
}) {
  const [note, setNote] = useState('')
  const [setDefault, setSetDefault] = useState(false)
  const [updateDrafts, setUpdateDrafts] = useState(true)
  const [then, setThen] = useState<'stay' | 'origin'>('origin')
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) { setWasOpen(open); if (open) { setNote(approve?.note ?? ''); setSetDefault(false); setUpdateDrafts(true); setThen('origin') } }
  return (
    <Dialog open={open} onClose={onClose} title={approve ? `Approve and publish ${name}${nextVersion > 1 ? ` v${nextVersion}` : ''}` : nextVersion === 1 ? `Publish ${name}` : `Publish ${name} v${nextVersion}`} size="modal" width={600}
            subtitle={approve ? `${approve.by} submitted this. Approving publishes it for the whole studio.` : nextVersion === 1 ? 'Publishing makes the template available when a quote is created.' : 'Every quote created from now on uses this version.'}
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose} isDisabled={busy}>Cancel</Button><Button onPress={() => onPublish({ note: note.trim(), setDefault, updateDrafts, then: origin ? then : 'stay' })} isDisabled={busy}>{busy ? 'Publishing…' : approve ? 'Approve and publish' : origin && then === 'origin' ? (origin.kind === 'quote' ? 'Publish and update' : 'Publish and start') : nextVersion === 1 ? 'Publish' : `Publish v${nextVersion}`}</Button></>}>
      <div className={styles.body}>
        <TextField label="What changed" value={note} onChange={setNote} maxLength={120} helper="Shows in the template's history." autoFocus />
        {origin ? (
          <div className={styles.choices} role="radiogroup" aria-label="After publishing">
            <ChoiceCard title={origin.kind === 'quote' ? `Publish and update ${origin.label}` : `Publish and start the quote for ${origin.label}`} help={origin.kind === 'quote' ? 'The quote moves to this template at the new version, and you go back to it.' : 'A quote on this template opens for the lead, with its sections and defaults.'} selected={then === 'origin'} onSelect={() => setThen('origin')} />
            <ChoiceCard title="Publish only" help="Stay here; the quote is untouched." selected={then === 'stay'} onSelect={() => setThen('stay')} />
          </div>
        ) : null}
        <label className={styles.row}>
          <span className={styles.rowText}><span className={styles.rowLabel}>Make it the studio’s default</span><span className={styles.rowHelp}>{isDefault ? 'It already is.' : 'New quotes start on the default unless another template is picked.'}</span></span>
          <Switch size="sm" isSelected={isDefault || setDefault} isDisabled={isDefault} onChange={(v: boolean) => setSetDefault(v)} aria-label="Make it the studio's default" />
        </label>
        {nextVersion > 1 ? (
        <label className={styles.row}>
          <span className={styles.rowText}><span className={styles.rowLabel}>Move open draft quotes to this version</span><span className={styles.rowHelp}>{usedBy ? `${usedBy} quote${usedBy === 1 ? '' : 's'} started from this template. ` : ''}Their own settings stay as they are; sent quotes keep the version they were sent with.</span></span>
          <Switch size="sm" isSelected={updateDrafts} onChange={(v: boolean) => setUpdateDrafts(v)} aria-label="Move open draft quotes to this version" />
        </label>
        ) : null}
      </div>
    </Dialog>
  )
}
