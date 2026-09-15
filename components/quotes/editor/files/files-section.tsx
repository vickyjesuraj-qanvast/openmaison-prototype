'use client'

import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Switch } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { useComingSoon } from '@/components/om/snackbar'
import { Dropdown, DropdownItem } from '@/components/leads/dropdown'
import { Dropzone } from '@/components/leads/move-stage/fields'
import { AttachFilesModal } from '@/components/leads/tasks/attach-files-modal'
import { NameDialog } from '@/components/leads/files/name-dialog'
import { useRun } from '@/components/leads/tasks/use-run'
import { renameFile } from '@/app/leads/files-actions'
import { attachQuoteFiles, detachQuoteFile, setQuoteFilesVisible, uploadQuoteFile } from '@/app/quotes/files-actions'
import { downloadBlob } from '@/lib/leads/export'
import type { LeadFile } from '@/lib/db/schema'
import { SectionCard } from '../section-card'
import styles from './files-section.module.css'

export type FilesSeed = {
  quoteId: string
  leadId: string
  /** The files this quote carries, in the order they were attached. */
  files: LeadFile[]
  /** Every file of the lead (not trashed) — the Attach files modal's "Your files". */
  leadFiles: LeadFile[]
  visible: boolean
}

const kindIcon = (f: LeadFile) => (f.kind === 'pdf' || f.mime === 'application/pdf' ? 'picture_as_pdf' : 'image')

/**
 * Files section (1238:32938 · empty 1370:30144 · with a file 1238:30486 · section-top 1370:30162 · tile kebab 1239:28329 ·
 * Attach files 1238:30353; REG-419 / REG-424). The card's own title counts the files; the section-top carries "Show in client
 * view" with the 20px switch (the mock's eye icon retired 2026-09-15), the same row Terms and Notes carry. The body
 * is the tiles the quote carries (169×183: image r2 + kind glyph · name · kebab) and the 68px dropzone — "browse" opens the
 * Attach files modal (the lead's files plus a local upload), a dropped file uploads at once and lands in the lead's Files
 * tab as well. A tile's kebab: Open (the file viewer) · Rename · Download · Delete (the link only — the lead keeps the file).
 */
export function FilesCard({ seed, open, onToggle, onHandlePointerDown, onSaved, onCount }: {
  seed: FilesSeed
  open: boolean
  onToggle: () => void
  onHandlePointerDown: (e: PointerEvent<HTMLButtonElement>) => void
  onSaved: (updatedAt: number) => void
  onCount: (n: number) => void
}) {
  const router = useRouter()
  const comingSoon = useComingSoon()
  const { run, fail } = useRun()
  const { quoteId, leadId } = seed
  const [files, setFiles] = useState<LeadFile[]>(seed.files)
  const [leadFiles, setLeadFiles] = useState<LeadFile[]>(seed.leadFiles)
  const [visible, setVisible] = useState(seed.visible)
  const [modal, setModal] = useState(false)
  const [menuFor, setMenuFor] = useState<string | null>(null)
  const [renaming, setRenaming] = useState<LeadFile | null>(null)
  const [uploading, setUploading] = useState(false)
  const filesRef = useRef(files); useEffect(() => { filesRef.current = files })
  useEffect(() => { onCount(files.length) }, [files.length, onCount])

  const toggleVisible = (next: boolean) => {
    setVisible(next)
    void run('save the setting', async () => { const r = await setQuoteFilesVisible(quoteId, next); onSaved(r.updatedAt) })
  }
  /* The modal answers with the files newly ticked (its "Attach n Files" counts those) — they join the ones the quote already carries. */
  const attachSet = (ids: string[]) => {
    setModal(false)
    if (!ids.length) return
    void run('attach the files', async () => { const r = await attachQuoteFiles(quoteId, ids); setFiles(r.files); onSaved(r.updatedAt) }, ids.length === 1 ? '1 file attached' : `${ids.length} files attached`)
  }
  const upload = (file?: File) => {
    setUploading(true)
    void run('upload the file', async () => {
      const r = await uploadQuoteFile(quoteId, file?.name)
      setFiles(r.files); setLeadFiles((l) => [...l, r.file]); onSaved(r.updatedAt)
    }, `${file?.name?.trim() || 'Living Room'} added to the quote`).finally(() => setUploading(false))
  }
  const remove = (file: LeadFile) => {
    setMenuFor(null)
    setFiles((fs) => fs.filter((f) => f.id !== file.id))
    void run('remove the file', async () => { const r = await detachQuoteFile(quoteId, file.id); onSaved(r.updatedAt) },
      { message: `${file.name} removed from the quote`, actionLabel: 'Undo', onAction: () => { void run('restore the file', async () => { const r = await attachQuoteFiles(quoteId, [file.id]); setFiles(r.files); onSaved(r.updatedAt) }) } })
  }
  const rename = (file: LeadFile, name: string) => {
    setRenaming(null)
    const v = name.trim()
    if (!v || v === file.name) return
    setFiles((fs) => fs.map((f) => (f.id === file.id ? { ...f, name: v } : f)))
    setLeadFiles((fs) => fs.map((f) => (f.id === file.id ? { ...f, name: v } : f)))
    void run('rename the file', () => renameFile(file.id, v), 'File renamed')
  }
  /* Download: an image downloads its thumbnail as a real file (the demo has no originals); anything else is coming soon — the viewer's rule. */
  const download = async (file: LeadFile) => {
    setMenuFor(null)
    if (file.kind !== 'image' || !file.thumb) { comingSoon(); return }
    try {
      const blob = await (await fetch(file.thumb)).blob()
      const ext = file.mime === 'image/png' ? 'png' : 'jpg'
      downloadBlob(blob, /\.[a-z0-9]+$/i.test(file.name) ? file.name : `${file.name}.${ext}`)
    } catch { fail('download the file') }
  }
  const openFile = (file: LeadFile) => router.push(`/leads/${leadId}/files/${file.id}`)

  const toolbar = (
    <label className={styles.switchRow}>Show in client view <Switch size="sm" isSelected={visible} onChange={toggleVisible} aria-label="Show in client view" /></label>
  )

  return (
    <SectionCard id="section-files" title={`Files (${files.length})`} open={open} onToggle={onToggle} actions={toolbar} onHandlePointerDown={onHandlePointerDown}>
      <div className={styles.body}>
        {files.length ? (
          <div className={styles.grid} role="list" aria-label="Attached files">
            {files.map((file) => (
              <div key={file.id} className={styles.tile} role="listitem">
                <button type="button" className={styles.tileMain} onClick={() => openFile(file)} aria-label={`Open ${file.name}`}>
                  {file.thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={file.thumb} alt="" className={styles.tileImg} />
                  ) : (
                    <span className={styles.tileBox}><Icon name={kindIcon(file)} size={32} weight={300} /></span>
                  )}
                  <span className={styles.caption}>
                    <Icon name={kindIcon(file)} size={20} className={styles.kindIcon} />
                    <span className={styles.tileName}>{file.name}</span>
                  </span>
                </button>
                <span className={styles.menuWrap}>
                  <Tooltip label="More options" disabled={menuFor === file.id}>
                    <IconButton icon="more_vert" label={`More options for ${file.name}`} size={24} variant="bare" iconSize={24} iconWeight={300} aria-haspopup="menu" aria-expanded={menuFor === file.id}
                                onClick={() => setMenuFor((m) => (m === file.id ? null : file.id))} />
                  </Tooltip>
                </span>
                {/* The menu hangs under the tile, flush with its left edge (1239:28329) — anchored on the tile, not the 24px kebab. */}
                <Dropdown open={menuFor === file.id} onClose={() => setMenuFor(null)} align="left" sheetTitle={file.name}>
                  <DropdownItem onSelect={() => { setMenuFor(null); openFile(file) }}>Open</DropdownItem>
                  <DropdownItem onSelect={() => { setMenuFor(null); setRenaming(file) }}>Rename</DropdownItem>
                  <DropdownItem onSelect={() => { void download(file) }}>Download</DropdownItem>
                  <DropdownItem tone="danger" onSelect={() => remove(file)}>Delete</DropdownItem>
                </Dropdown>
              </div>
            ))}
          </div>
        ) : null}
        <Dropzone variant="compact" title={<>Drop your file or <b>browse</b></>} uploading={uploading} onPick={upload} onBrowse={() => setModal(true)} />
      </div>
      <AttachFilesModal open={modal} chrome="quote" files={leadFiles} attached={files.map((f) => f.id)} onClose={() => setModal(false)}
                        onAttach={attachSet} onUploadPicked={(f) => upload(f)} />
      <NameDialog open={!!renaming} title="Rename File" initial={renaming?.name ?? ''} onSave={(name) => { if (renaming) rename(renaming, name) }} onClose={() => setRenaming(null)} />
    </SectionCard>
  )
}
