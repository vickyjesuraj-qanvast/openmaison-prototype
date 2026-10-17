'use client'

import { useState } from 'react'
import { Button } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { TextField } from '@/components/om/text-field'
import { Dropzone, FieldError, FileTile, useUploadSim } from '@/components/leads/move-stage/fields'
import { isPdfRefusal, readPickedPdf } from '@/components/contracts/read-pdf'
import type { PickedPdf } from '@/lib/contracts/pdf'
import styles from '@/components/contracts/import-contract-dialog.module.css'

/**
 * (pending modules S03 — 1.0's Accounts › Signing Documents › Upload PDF) A standard document for the library: a title and the PDF. It
 * goes with a contract in Send together, or starts one (From Template). The dialog closes once the host's save lands; a file that isn't a
 * PDF, or is over 8 MB, is refused under the box. Import a contract's shape and words (one system).
 */
export function UploadPdfDialog({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (o: { title: string; file: PickedPdf }) => Promise<boolean> }) {
  const [title, setTitle] = useState('')
  const [file, setFile] = useState<PickedPdf | null>(null)
  const [problem, setProblem] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const { uploading, start } = useUploadSim()
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) { setWasOpen(open); if (open) { setTitle(''); setFile(null); setProblem(null); setBusy(false) } }
  const pick = (f?: File) => { setProblem(null); if (!f) return; const read = readPickedPdf(f); start(() => { void read.then((r) => { if (isPdfRefusal(r)) setProblem(r.error); else setFile(r) }) }) }
  const save = async () => { if (!file || busy) return; setBusy(true); try { await onSave({ title: title.trim() || file.name.replace(/\.pdf$/i, ''), file }) } finally { setBusy(false) } }
  return (
    <Dialog open={open} onClose={onClose} title="Upload a standard PDF" size="form" width={600}
            subtitle="A document you add to signings — terms and conditions, a warranty, a care guide. The client reads it and ticks to accept, then signs once with the agreement."
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button><Button isDisabled={!file || busy || uploading} onPress={() => { void save() }}>{busy ? 'Adding…' : 'Add to templates'}</Button></>}>
      <div className={styles.fields} data-testid="upload-pdf-dialog">
        <TextField label="Title" value={title} onChange={setTitle} placeholder="Defaults to the file’s name" />
        {file ? <FileTile name={file.name} thumb={file.thumb ?? '/figma-assets/file-pdf.svg'} onDelete={() => setFile(null)} /> : (
          <Dropzone variant="compact" title={uploading ? 'Uploading…' : 'Upload the PDF'} helper="PDF · up to 8 MB" accept="application/pdf" uploading={uploading} onPick={pick} label="Upload the PDF" />
        )}
        <FieldError message={problem ?? undefined} />
      </div>
    </Dialog>
  )
}
