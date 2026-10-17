'use client'

import { useState } from 'react'
import { Button, Switch } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { TextField } from '@/components/om/text-field'
import { Dropzone, FieldError, FileTile, useUploadSim } from '@/components/leads/move-stage/fields'
import { isPdfRefusal, readPickedPdf } from './read-pdf'
import type { PickedPdf } from '@/lib/contracts/pdf'
import styles from './import-contract-dialog.module.css'

/**
 * New Contract › Import from File (REG-534; 1.0's "Upload PDF" and "Upload an already-signed PDF" as one dialog): a title,
 * the PDF, and a switch for a copy the client has already signed — that one lands as Signed with the file as its signed copy.
 */
export function ImportContractDialog({ open, onClose, onImport }: { open: boolean; onClose: () => void; onImport: (o: { title: string; fileName: string; signed: boolean; file: PickedPdf }) => void | Promise<void> }) {
  const [title, setTitle] = useState('')
  const [file, setFile] = useState<PickedPdf | null>(null)
  const [problem, setProblem] = useState<string | null>(null)
  const [signed, setSigned] = useState(false)
  const [busy, setBusy] = useState(false)
  const { uploading, start } = useUploadSim()
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) { setWasOpen(open); if (open) { setTitle(''); setFile(null); setProblem(null); setSigned(false); setBusy(false) } }
  const ok = !!file && !busy
  /* (pending modules S03) the PDF itself is read and kept with the contract (Files › Contract & VOs); a file that isn't one is refused under the box */
  const pick = (f?: File) => { setProblem(null); if (!f) return; const read = readPickedPdf(f); start(() => { void read.then((r) => { if (isPdfRefusal(r)) setProblem(r.error); else setFile(r) }) }) }
  return (
    <Dialog open={open} onClose={onClose} title="Import a contract" size="form" width={600}
            subtitle="A PDF you already have. It joins the lead’s contracts, is kept in Files › Contract & VOs, and goes out through the same signing link."
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button><Button isDisabled={!ok} onPress={async () => { if (!file) return; setBusy(true); try { await onImport({ title: title.trim() || file.name.replace(/\.pdf$/i, ''), fileName: file.name, signed, file }) } finally { setBusy(false) } }}>{busy ? 'Importing…' : 'Import'}</Button></>}>
      <div className={styles.fields}>
        <TextField label="Contract title" value={title} onChange={setTitle} placeholder="Defaults to the file’s name" />
        {file ? <FileTile name={file.name} thumb={file.thumb ?? '/figma-assets/file-pdf.svg'} onDelete={() => setFile(null)} /> : (
          <Dropzone variant="compact" title={uploading ? 'Uploading…' : 'Upload the contract PDF'} helper="PDF" accept="application/pdf" uploading={uploading} onPick={pick} label="Upload the contract PDF" />
        )}
        <FieldError message={problem ?? undefined} />
        <label className={styles.switchRow}>
          <span className={styles.switchText}><span className={styles.switchLabel}>This copy is already signed</span><span className={styles.switchHelp}>Lands as Signed, with this file as the signed copy</span></span>
          <Switch size="sm" isSelected={signed} onChange={(v: boolean) => setSigned(v)} aria-label="This copy is already signed" />
        </label>
      </div>
    </Dialog>
  )
}
