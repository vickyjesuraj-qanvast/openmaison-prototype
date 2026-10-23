'use client'

import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Switch } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { DropdownItem, MENU_WIDTH } from '@/components/leads/dropdown'
import { PortalMenu } from '@/components/om/portal-menu'
import { Dropzone } from '@/components/leads/move-stage/fields'
import { AttachFilesModal } from '@/components/leads/tasks/attach-files-modal'
import { NameDialog } from '@/components/leads/files/name-dialog'
import { useRun } from '@/components/leads/tasks/use-run'
import { renameFile } from '@/app/leads/files-actions'
import { attachQuoteFiles, detachQuoteFile, setQuoteFilesVisible } from '@/app/quotes/files-actions'
import { orThrow } from '@/lib/company/template-rules'   // (S44Z) an action's refusal into run()'s own failure line
import { uploadPicked } from '@/components/leads/files/upload-picture'   // (gaps build E, item 1)
import { downloadBlob } from '@/lib/leads/export'
import { downloadName } from '@/lib/leads/file-model'
import type { LeadFile } from '@/lib/db/schema'
import { SectionCard } from '../section-card'
import { withFrom } from '@/lib/nav'
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
export function FilesCard({ seed, open, onToggle, onHandlePointerDown, onSaved, onCount, onVisible }: {
  seed: FilesSeed
  open: boolean
  onToggle: () => void
  onHandlePointerDown: (e: PointerEvent<HTMLButtonElement>) => void
  onSaved: (updatedAt: number) => void
  onCount: (n: number) => void
  /** (quotes on the move 2026-10-22, K1's ask) The switch as it stands — the section list's one-line summary follows it live. */
  onVisible?: (visible: boolean) => void
}) {
  const router = useRouter()
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

  /* (sweep S1 #10) An optimistic write that the server refuses is put back — never a value on screen that was not kept. */
  const toggleVisible = (next: boolean) => {
    setVisible(next); onVisible?.(next)
    void run('save the setting', async () => { const r = await orThrow(setQuoteFilesVisible(quoteId, next)); onSaved(r.updatedAt) })
      .then((ok) => { if (!ok) { setVisible(!next); onVisible?.(!next) } })
  }
  /* The modal answers with the files newly ticked (its "Attach n Files" counts those) — they join the ones the quote already carries. */
  const attachSet = (ids: string[]) => {
    setModal(false)
    if (!ids.length) return
    void run('attach the files', async () => { const r = await orThrow(attachQuoteFiles(quoteId, ids)); setFiles(r.files); onSaved(r.updatedAt) }, ids.length === 1 ? '1 file attached' : `${ids.length} files attached`)
  }
  /* (gaps build E, item 1) the picked file goes up with its bytes — the lead's Files' own upload (upload-picture.ts) — and joins the quote */
  const upload = (file?: File) => {
    setUploading(true)
    void run('upload the file', async () => {
      if (!file) return { error: 'This file didn’t read — pick it again' }
      const up = await uploadPicked(leadId, file)
      if (!up || 'error' in up) return up ?? { error: 'The upload didn’t land' }
      const r = await orThrow(attachQuoteFiles(quoteId, [up.id]))
      setFiles(r.files); setLeadFiles((l) => [...l, up]); onSaved(r.updatedAt)
    }, `${file?.name?.trim() || 'The file'} added to the quote`).finally(() => setUploading(false))
  }
  const remove = (file: LeadFile) => {
    setMenuFor(null)
    const at = filesRef.current.findIndex((f) => f.id === file.id)
    setFiles((fs) => fs.filter((f) => f.id !== file.id))
    void run('remove the file', async () => { const r = await orThrow(detachQuoteFile(quoteId, file.id)); onSaved(r.updatedAt) },
      { message: `${file.name} removed from the quote`, actionLabel: 'Undo', onAction: () => { void run('restore the file', async () => { const r = await orThrow(attachQuoteFiles(quoteId, [file.id])); setFiles(r.files); onSaved(r.updatedAt) }) } })
      .then((ok) => { if (!ok) setFiles((fs) => (fs.some((f) => f.id === file.id) ? fs : [...fs.slice(0, Math.max(0, at)), file, ...fs.slice(Math.max(0, at))])) })
  }
  const rename = (file: LeadFile, name: string) => {
    setRenaming(null)
    const v = name.trim()
    if (!v || v === file.name) return
    const named = (n: string) => (fs: LeadFile[]) => fs.map((f) => (f.id === file.id ? { ...f, name: n } : f))
    setFiles(named(v)); setLeadFiles(named(v))
    void run('rename the file', () => renameFile(file.id, v), 'File renamed')
      .then((ok) => { if (!ok) { setFiles(named(file.name)); setLeadFiles(named(file.name)) } })
  }
  /* Download (pending modules S04 — card held:quotes, "Quote Files › Download of a non-image — Coming soon · revisit: a lead's Files now download
     any kind"): the file as it was uploaded, under its own name — the lead's Files' own way (/files/raw/<id>?download=1, any kind; a demo stand-in
     picture gives the picture it shows). A file of which only the name was kept says so. */
  const download = async (file: LeadFile) => {
    setMenuFor(null)
    try {
      const res = await fetch(`/files/raw/${file.id}?download=1`)
      if (!res.ok) { fail('download the file', `only the name of ${file.name} was kept`); return }
      const blob = await res.blob()
      downloadBlob(blob, downloadName(file.name, blob.type || file.mime))
    } catch { fail('download the file') }
  }
  const openFile = (file: LeadFile) => router.push(withFrom(`/leads/${leadId}/files/${file.id}`, `/quotes/${quoteId}`))   /* (REG-465) Back returns to the quote */

  const toolbar = (
    <Tooltip label="The files show on the client’s confirmation page">   {/* (REG-626, parity §8.2 · E-91) the switch now reaches the client */}
      <label className={styles.switchRow}>Show in client view <Switch size="sm" isSelected={visible} onChange={toggleVisible} aria-label="Show in client view" /></label>
    </Tooltip>
  )

  return (
    <SectionCard id="section-files" title={`Files (${files.length})`} open={open} onToggle={onToggle} actions={toolbar} onHandlePointerDown={onHandlePointerDown}>
      <div className={styles.body}>
        {files.length ? (
          <div className={styles.grid} role="list" aria-label="Attached files">
            {files.map((file) => (
              <FileTile key={file.id} file={file} menuOpen={menuFor === file.id} onToggleMenu={() => setMenuFor((m) => (m === file.id ? null : file.id))} onCloseMenu={() => setMenuFor(null)}
                        onOpen={() => openFile(file)} onRename={() => { setMenuFor(null); setRenaming(file) }} onDownload={() => { void download(file) }} onDelete={() => remove(file)} />
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

/** One tile the quote carries (169×183: image · kind glyph · name · kebab). (REG-728) Its menu opens through the body portal (PortalMenu),
 *  as every row menu does — still under the tile, flush with its left edge (1239:28329): anchored on the tile, not the 24px kebab. */
function FileTile({ file, menuOpen, onToggleMenu, onCloseMenu, onOpen, onRename, onDownload, onDelete }: {
  file: LeadFile; menuOpen: boolean; onToggleMenu: () => void; onCloseMenu: () => void
  onOpen: () => void; onRename: () => void; onDownload: () => void; onDelete: () => void
}) {
  const tile = useRef<HTMLDivElement>(null)
  return (
    <div ref={tile} className={styles.tile} role="listitem">
      <button type="button" className={styles.tileMain} onClick={onOpen} aria-label={`Open ${file.name}`}>
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
        <Tooltip label="More options" disabled={menuOpen}>
          <IconButton icon="more_vert" label={`More options for ${file.name}`} size={24} variant="bare" iconSize={24} iconWeight={300} aria-haspopup="menu" aria-expanded={menuOpen}
                      onClick={onToggleMenu} />
        </Tooltip>
      </span>
      <PortalMenu open={menuOpen} anchor={tile} onClose={onCloseMenu} align="left" width={MENU_WIDTH.standard} role="menu" sheetTitle={file.name}>
        <DropdownItem onSelect={() => { onCloseMenu(); onOpen() }}>Open</DropdownItem>
        <DropdownItem onSelect={onRename}>Rename</DropdownItem>
        <DropdownItem onSelect={onDownload}>Download</DropdownItem>
        <DropdownItem tone="danger" onSelect={onDelete}>Delete</DropdownItem>
      </PortalMenu>
    </div>
  )
}
