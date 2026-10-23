'use client'

import { useState } from 'react'
import { Button, Switch } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { TextField } from '@/components/om/text-field'
import { Dropzone, FieldError, FileTile, useUploadSim } from '@/components/leads/move-stage/fields'
import { isPdfRefusal, readPickedPdf } from './read-pdf'
import { readPickedContractFile } from './read-picture'
import { PhotoOrFile, useTouchPick } from './photo-or-file'
import type { PickedPdf } from '@/lib/contracts/pdf'
import { PHOTO_SIGNED_ONLY, isPictureData, pictureNameOf, titleOfFile } from '@/lib/contracts/picture'
import styles from './import-contract-dialog.module.css'

/** (S46D — D2) A PDF already in the lead's Files, handed in by Files › ⋮ › Send for signature: nothing is uploaded again. `inPlace` — it sits in
    Files › Contract & VOs already, so the contract keeps that very file; from anywhere else a copy is kept there (lib/contracts/files.ts). */
export type KeptPdfFile = { id: string; name: string; thumb: string | null; inPlace: boolean }
/** What Import answers: the picked PDF itself, or (S46D) the id of the lead's own file. (Contracts on the move, C4 — P-12) On touch `file` may be
    a PHOTO of the signed paper (a JPEG data URL in the same shape) — then `signed` is always true: a photo is the signed copy, never sent. */
export type ImportPick = { title: string; fileName: string; signed: boolean } & ({ file: PickedPdf; fromFileId?: undefined } | { file?: undefined; fromFileId: string })

const SUBTITLE = 'A PDF you already have. It joins the lead’s contracts, is kept in Files › Contract & VOs, and goes out through the same signing link.'
/* (S46D — D2) the same sentence for a file the lead's Files hold already: where the contract keeps it *(invented copy)* */
const KEPT_SUBTITLE = { inPlace: 'A PDF from the lead’s Files. It joins the lead’s contracts as it is, and goes out through the same signing link.',
  copied: 'A PDF from the lead’s Files. It joins the lead’s contracts, a copy is kept in Files › Contract & VOs, and it goes out through the same signing link.' }
/* (Contracts on the move, C4 — C-25 · C-14) On touch the sentence is the body's first line at 14 (the house subtitle reads 12) and says what a
   finger can bring: a PDF to send, or a photo of a page the client already signed *(invented copy)* */
const TOUCH_LEAD = 'A PDF to send for signing, or a photo of a page the client already signed. Kept in Files › Contract & VOs.'
/** A photo has no file name worth keeping (a phone's camera names every shot "image.jpg"): its copy is named after the contract. */
const PHOTO_TITLE = 'Signed contract'

/**
 * New Contract › Import from File (REG-534; 1.0's "Upload PDF" and "Upload an already-signed PDF" as one dialog): a title,
 * the PDF, and a switch for a copy the client has already signed — that one lands as Signed with the file as its signed copy.
 * (S46D — D2) Files' *Send for signature* opens it with the file already in it (`kept`); removing it offers the upload as before.
 * (Contracts on the move, C4 — P-12 · C-25, Q-04 as picked; his "please check and built accordingly" 2026-10-22) On touch the drop box is two rows
 * — Take a photo · Choose a file (a PDF or a picture) — and a photo can only be the signed copy: picking one turns "already signed" on and holds
 * it there, saying why. The desk keeps "Upload the contract PDF · PDF" and its subtitle exactly.
 */
export function ImportContractDialog({ open, onClose, onImport, kept = null }: { open: boolean; onClose: () => void; onImport: (o: ImportPick) => void | Promise<void>; kept?: KeptPdfFile | null }) {
  const [title, setTitle] = useState('')
  const [file, setFile] = useState<PickedPdf | null>(null)
  const [useKept, setUseKept] = useState(!!kept)
  const [problem, setProblem] = useState<string | null>(null)
  const [signed, setSigned] = useState(false)
  const [busy, setBusy] = useState(false)
  const { uploading, start } = useUploadSim()
  const touch = useTouchPick()
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) { setWasOpen(open); if (open) { setTitle(''); setFile(null); setUseKept(!!kept); setProblem(null); setSigned(false); setBusy(false) } }
  const own = useKept && kept ? kept : null
  const photo = !!file && isPictureData(file.data)
  const ok = (!!file || !!own) && !busy
  /* (pending modules S03) the PDF itself is read and kept with the contract (Files › Contract & VOs); a file that isn't one is refused under the box.
     (C4 — P-12) On touch a picture is read as the signed photo, and the switch goes on with it. */
  const pick = (f?: File) => {
    setProblem(null); if (!f) return
    const read = touch ? readPickedContractFile(f) : readPickedPdf(f)
    start(() => { void read.then((r) => { if (isPdfRefusal(r)) { setProblem(r.error); return } setFile(r); if (isPictureData(r.data)) setSigned(true) }) })
  }
  const submit = async () => {
    const pickOf = (name: string) => title.trim() || name.replace(/\.pdf$/i, '')
    /* (C4) a photo: the title typed, else "Signed contract"; the kept copy takes that name with its own extension */
    const photoPick = (f: PickedPdf): ImportPick => { const t = title.trim() || PHOTO_TITLE; const name = pictureNameOf(t, f.data); return { title: titleOfFile(name), fileName: name, signed: true, file: { ...f, name } } }
    const o: ImportPick | null = own ? { title: pickOf(own.name), fileName: own.name, signed, fromFileId: own.id } : file ? (photo ? photoPick(file) : { title: pickOf(file.name), fileName: file.name, signed, file }) : null
    if (!o) return
    setBusy(true)
    try { await onImport(o) } finally { setBusy(false) }
  }
  const lead = own ? (own.inPlace ? KEPT_SUBTITLE.inPlace : KEPT_SUBTITLE.copied) : touch ? TOUCH_LEAD : SUBTITLE
  return (
    <Dialog open={open} onClose={onClose} title="Import a contract" size="form" width={600}
            subtitle={touch ? undefined : lead}
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button><Button isDisabled={!ok} onPress={() => { void submit() }} data-testid="import-contract-go">{busy ? 'Importing…' : 'Import'}</Button></>}>
      <div className={styles.fields} data-testid="import-contract">
        {touch ? <p className={styles.lead} data-testid="import-contract-lead">{lead}</p> : null}
        <TextField label="Contract title" value={title} onChange={setTitle} placeholder={photo ? PHOTO_TITLE : 'Defaults to the file’s name'} />
        {own ? <FileTile name={own.name} thumb={own.thumb ?? '/figma-assets/file-pdf.svg'} onDelete={() => setUseKept(false)} />
          : file ? <FileTile name={photo ? pictureNameOf(title.trim() || PHOTO_TITLE, file.data) : file.name} kind={photo ? 'image' : undefined} thumb={file.thumb ?? (photo ? file.data : '/figma-assets/file-pdf.svg')} onDelete={() => { setFile(null); if (photo) setSigned(false) }} />
          : touch ? <PhotoOrFile ids={{ photo: 'import-take-photo', file: 'import-choose-file' }} label="Upload the contract" uploading={uploading} onPick={pick}
                                 photoHelp="A page the client already signed" fileHelp="A PDF, or a picture of the signed page" />
          : (
          <Dropzone variant="compact" title={uploading ? 'Uploading…' : 'Upload the contract PDF'} helper="PDF" accept="application/pdf" uploading={uploading} onPick={pick} label="Upload the contract PDF" />
        )}
        <FieldError message={problem ?? undefined} />
        <label className={styles.switchRow} data-held={photo || undefined}>
          <span className={styles.switchText}><span className={styles.switchLabel}>This copy is already signed</span><span className={styles.switchHelp} data-testid="import-signed-help">{photo ? PHOTO_SIGNED_ONLY : 'Lands as Signed, with this file as the signed copy'}</span></span>
          <Switch size="sm" isSelected={signed || photo} isDisabled={photo} onChange={(v: boolean) => setSigned(v)} aria-label="This copy is already signed" />
        </label>
      </div>
    </Dialog>
  )
}
