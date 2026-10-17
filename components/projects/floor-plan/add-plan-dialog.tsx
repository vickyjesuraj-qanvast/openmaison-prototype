'use client'

import { useState } from 'react'
import { Button, Switch } from '@/components/ds'
import { Chips } from '@/components/om/chips'
import { Dialog } from '@/components/om/dialog'
import { MetaChip } from '@/components/om/meta-chip'
import { TextField } from '@/components/om/text-field'
import { Dropzone, FieldError } from '@/components/leads/move-stage/fields'
import { NAME_MAX, planNameOf } from '@/lib/projects/floor-plan-model'
import type { FloorPlanFile } from '@/lib/projects/floor-plan'
import { isPlanFile, PLAN_ACCEPT } from './plan-picture'
import styles from './floor-plan.module.css'

/**
 * (gaps build G, G-Q2 · G-Q3 — 1.0 F-188 · F-189 · F-207) Add a plan: upload a picture or a PDF (its first page is what gets marked up; the
 * original is kept in Files › Floor plans), or use one already in the project's Files. Its name (the file's, unless typed), and — once the
 * project has a plan — whether it becomes the main plan, the one the client opens on (on by default, so a revised plan replaces the old in one
 * press, but said, never silent: 1.0 changed it without a word, F-244). The form dialog: a bottom sheet on a phone (REG-353).
 */
export function AddPlanDialog({ open, onClose, files, hasPlans, client, busy, startFromFiles = false, onAdd }: {
  open: boolean
  onClose: () => void
  files: FloorPlanFile[]
  hasPlans: boolean
  client: string
  busy: boolean
  startFromFiles?: boolean
  onAdd: (o: { file: File | null; fileId: string | null; name: string; main: boolean }) => void
}) {
  const [from, setFrom] = useState<'upload' | 'files'>(startFromFiles && files.length ? 'files' : 'upload')
  const [picked, setPicked] = useState<File | null>(null)
  const [fileId, setFileId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [main, setMain] = useState(true)
  const [tried, setTried] = useState(false)
  const [wasOpen, setWasOpen] = useState(open)
  if (wasOpen !== open) { setWasOpen(open); if (open) { setFrom(startFromFiles && files.length ? 'files' : 'upload'); setPicked(null); setFileId(null); setName(''); setMain(true); setTried(false) } }
  const chosen = from === 'upload' ? picked : files.find((f) => f.id === fileId) ?? null
  const missing = !chosen
  const wrongKind = from === 'upload' && picked && !isPlanFile(picked)
  const submit = () => {
    setTried(true)
    if (missing || wrongKind) return
    onAdd({ file: from === 'upload' ? picked : null, fileId: from === 'files' ? fileId : null, name: name.trim(), main: !hasPlans || main })
  }
  return (
    <Dialog open={open} onClose={onClose} title="Add a plan" size="form" width={600} closeOnScrim={false}
            subtitle="A picture or a PDF of the plan — a PDF’s first page is what you mark up, and the original is kept in Files › Floor plans."
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button><Button variant="primary" onPress={submit} isDisabled={busy} data-testid="plan-add-save">{busy ? 'Adding…' : 'Add plan'}</Button></>}>
      <div className={styles.form} data-testid="plan-add-dialog">
        {files.length ? <Chips label="Where it comes from" options={[{ value: 'upload', label: 'Upload a file' }, { value: 'files', label: 'From the project’s Files' }]} value={from} onChange={(v) => setFrom(v as 'upload' | 'files')} /> : null}
        {from === 'upload' ? (
          <>
            {picked ? (
              <div className={styles.pickedRow}>
                <MetaChip icon={/\.pdf$/i.test(picked.name) ? 'picture_as_pdf' : 'image'}>{picked.name}</MetaChip>
                <Button variant="secondary" appearance="text" size="sm" onPress={() => setPicked(null)}>Pick another</Button>
              </div>
            ) : (
              <Dropzone title="Drop the plan here or browse" helper="PDF, PNG, JPG or WebP — up to 8 MB" accept={PLAN_ACCEPT} label="Upload a floor plan"
                        onPick={(f) => { if (f) { setPicked(f); if (!name.trim()) setName(planNameOf(f.name)) } }} />
            )}
            <FieldError message={tried && !picked ? 'Pick the plan’s file' : tried && wrongKind ? 'A plan is a picture or a PDF' : undefined} />
          </>
        ) : (
          <div className={styles.fileList} role="radiogroup" aria-label="Files in the project">
            {files.map((f) => (
              <button key={f.id} type="button" role="radio" aria-checked={fileId === f.id} className={styles.fileRow} data-on={fileId === f.id || undefined}
                      onClick={() => { setFileId(f.id); if (!name.trim()) setName(planNameOf(f.name)) }}>
                <MetaChip icon={f.kind === 'pdf' ? 'picture_as_pdf' : 'image'}>{f.kind === 'pdf' ? 'PDF' : 'Picture'}</MetaChip>
                <span className={styles.fileName}>{f.name}</span>
              </button>
            ))}
            <FieldError message={tried && !fileId ? 'Pick the plan’s file' : undefined} />
          </div>
        )}
        <TextField label="Plan name" value={name} onChange={setName} maxLength={NAME_MAX} helper="Optional — the file’s name, unless you type one" />
        {hasPlans ? (
          <label className={styles.switchRow}>
            <Switch size="sm" isSelected={main} onChange={setMain} aria-label="Make it the main plan" />
            <span className={styles.switchText}><span>Make it the main plan</span><span className={styles.markLine}>{`The one ${client} opens on. The plan before it stays, with its marks.`}</span></span>
          </label>
        ) : null}
      </div>
    </Dialog>
  )
}
