'use client'

import { useState } from 'react'
import { Button, Switch } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { TextField } from '@/components/om/text-field'
import { Dropzone, FileTile, useUploadSim } from '@/components/leads/move-stage/fields'
import styles from './import-contract-dialog.module.css'

/**
 * New Contract › Import from File (REG-534; 1.0's "Upload PDF" and "Upload an already-signed PDF" as one dialog): a title,
 * the PDF, and a switch for a copy the client has already signed — that one lands as Signed with the file as its signed copy.
 */
export function ImportContractDialog({ open, onClose, onImport }: { open: boolean; onClose: () => void; onImport: (o: { title: string; fileName: string; signed: boolean }) => void | Promise<void> }) {
  const [title, setTitle] = useState('')
  const [file, setFile] = useState<string | null>(null)
  const [signed, setSigned] = useState(false)
  const [busy, setBusy] = useState(false)
  const { uploading, start } = useUploadSim()
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) { setWasOpen(open); if (open) { setTitle(''); setFile(null); setSigned(false); setBusy(false) } }
  const ok = !!file && !busy
  return (
    <Dialog open={open} onClose={onClose} title="Import a contract" size="form" width={600}
            subtitle="A PDF you already have. It joins the lead's contracts and goes out through the same signing link."
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button><Button isDisabled={!ok} onPress={async () => { if (!file) return; setBusy(true); try { await onImport({ title: title.trim() || file.replace(/\.pdf$/i, ''), fileName: file, signed }) } finally { setBusy(false) } }}>{busy ? 'Importing…' : 'Import'}</Button></>}>
      <div className={styles.fields}>
        <TextField label="Contract title" value={title} onChange={setTitle} placeholder="Defaults to the file’s name" />
        {file ? <FileTile name={file} onDelete={() => setFile(null)} /> : (
          <Dropzone variant="compact" title={uploading ? 'Uploading…' : 'Upload the contract PDF'} helper="PDF" accept="application/pdf" uploading={uploading}
                    onPick={(f) => { const name = f?.name ?? 'Contract.pdf'; start(() => setFile(name)) }} />
        )}
        <label className={styles.switchRow}>
          <span className={styles.switchText}><span className={styles.switchLabel}>This copy is already signed</span><span className={styles.switchHelp}>Lands as Signed, with this file as the signed copy</span></span>
          <Switch size="sm" isSelected={signed} onChange={(v: boolean) => setSigned(v)} aria-label="This copy is already signed" />
        </label>
      </div>
    </Dialog>
  )
}
