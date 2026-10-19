'use client'

import { useState } from 'react'
import { Button, Switch } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { TextField } from '@/components/om/text-field'
import { Dropzone, FieldError, FileTile, useUploadSim } from '@/components/leads/move-stage/fields'
import { isPdfRefusal, readPickedPdf } from './read-pdf'
import type { PickedPdf } from '@/lib/contracts/pdf'
import styles from './import-contract-dialog.module.css'

/** (S46D — D2) A PDF already in the lead's Files, handed in by Files › ⋮ › Send for signature: nothing is uploaded again. `inPlace` — it sits in
    Files › Contract & VOs already, so the contract keeps that very file; from anywhere else a copy is kept there (lib/contracts/files.ts). */
export type KeptPdfFile = { id: string; name: string; thumb: string | null; inPlace: boolean }
/** What Import answers: the picked PDF itself, or (S46D) the id of the lead's own file. */
export type ImportPick = { title: string; fileName: string; signed: boolean } & ({ file: PickedPdf; fromFileId?: undefined } | { file?: undefined; fromFileId: string })

const SUBTITLE = 'A PDF you already have. It joins the lead’s contracts, is kept in Files › Contract & VOs, and goes out through the same signing link.'
/* (S46D — D2) the same sentence for a file the lead's Files hold already: where the contract keeps it *(invented copy)* */
const KEPT_SUBTITLE = { inPlace: 'A PDF from the lead’s Files. It joins the lead’s contracts as it is, and goes out through the same signing link.',
  copied: 'A PDF from the lead’s Files. It joins the lead’s contracts, a copy is kept in Files › Contract & VOs, and it goes out through the same signing link.' }

/**
 * New Contract › Import from File (REG-534; 1.0's "Upload PDF" and "Upload an already-signed PDF" as one dialog): a title,
 * the PDF, and a switch for a copy the client has already signed — that one lands as Signed with the file as its signed copy.
 * (S46D — D2) Files' *Send for signature* opens it with the file already in it (`kept`); removing it offers the upload as before.
 */
export function ImportContractDialog({ open, onClose, onImport, kept = null }: { open: boolean; onClose: () => void; onImport: (o: ImportPick) => void | Promise<void>; kept?: KeptPdfFile | null }) {
  const [title, setTitle] = useState('')
  const [file, setFile] = useState<PickedPdf | null>(null)
  const [useKept, setUseKept] = useState(!!kept)
  const [problem, setProblem] = useState<string | null>(null)
  const [signed, setSigned] = useState(false)
  const [busy, setBusy] = useState(false)
  const { uploading, start } = useUploadSim()
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) { setWasOpen(open); if (open) { setTitle(''); setFile(null); setUseKept(!!kept); setProblem(null); setSigned(false); setBusy(false) } }
  const own = useKept && kept ? kept : null
  const ok = (!!file || !!own) && !busy
  /* (pending modules S03) the PDF itself is read and kept with the contract (Files › Contract & VOs); a file that isn't one is refused under the box */
  const pick = (f?: File) => { setProblem(null); if (!f) return; const read = readPickedPdf(f); start(() => { void read.then((r) => { if (isPdfRefusal(r)) setProblem(r.error); else setFile(r) }) }) }
  const submit = async () => {
    const pickOf = (name: string) => title.trim() || name.replace(/\.pdf$/i, '')
    const o: ImportPick | null = own ? { title: pickOf(own.name), fileName: own.name, signed, fromFileId: own.id } : file ? { title: pickOf(file.name), fileName: file.name, signed, file } : null
    if (!o) return
    setBusy(true)
    try { await onImport(o) } finally { setBusy(false) }
  }
  return (
    <Dialog open={open} onClose={onClose} title="Import a contract" size="form" width={600}
            subtitle={own ? (own.inPlace ? KEPT_SUBTITLE.inPlace : KEPT_SUBTITLE.copied) : SUBTITLE}
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button><Button isDisabled={!ok} onPress={() => { void submit() }} data-testid="import-contract-go">{busy ? 'Importing…' : 'Import'}</Button></>}>
      <div className={styles.fields} data-testid="import-contract">
        <TextField label="Contract title" value={title} onChange={setTitle} placeholder="Defaults to the file’s name" />
        {own ? <FileTile name={own.name} thumb={own.thumb ?? '/figma-assets/file-pdf.svg'} onDelete={() => setUseKept(false)} />
          : file ? <FileTile name={file.name} thumb={file.thumb ?? '/figma-assets/file-pdf.svg'} onDelete={() => setFile(null)} /> : (
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
