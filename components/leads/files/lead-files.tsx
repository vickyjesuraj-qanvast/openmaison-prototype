'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { DetailBulkBar } from '@/components/leads/tasks/detail-bulk-bar'
import { useRun } from '@/components/leads/tasks/use-run'
import { CREATE_EVENTS, useCreateIntent } from '@/components/leads/tasks/use-create-intent'
import { useComingSoon, useSnackbar } from '@/components/om/snackbar'
import { childrenOf, folderPath, groupByDay, isFolder, searchFiles, type FileRow } from '@/lib/leads/file-model'
import type { LeadFilesData } from '@/lib/leads/files'
import { downloadBlob } from '@/lib/leads/export'
import {
  createFolder, deleteFilesForever, duplicateFiles, emptyFileTrash, moveFiles, renameFile, restoreFiles, trashFiles, uploadFile,
} from '@/app/leads/files-actions'
import { FilesToolbar } from './files-toolbar'
import { FilesEmpty } from './files-empty'
import { FilesGrid } from './files-grid'
import { FilesTable } from './files-table'
import { NameDialog } from './name-dialog'
import { TrashDialog } from './trash-dialog'
import { MoveDialog } from './move-dialog'
import { DeletedFilesSheet } from './deleted-files-sheet'
import { UploadToast } from './upload-toast'
import styles from './lead-files.module.css'

/** Folder card kebab (931:40130): Open · Move · Rename · Delete. */
type FolderMenuAction = 'open' | 'move' | 'rename' | 'delete'
/** File tile kebab (931:40131): Open · Move · Duplicate · Download · Rename · Delete. */
type FileMenuAction = FolderMenuAction | 'duplicate' | 'download'

type NameDialogState = { mode: 'create' } | { mode: 'rename'; target: FileRow }
/**
 * A dialog's payload with its own `open` flag: closing clears `open` only, so the exiting frame (lib/motion modalPanel,
 * 0.14 s) keeps its title / names / count instead of degrading to "Create Folder" / "these 0 items" / "Move 0 items"
 * (the quotes twin guards the same beat with `count={deleting?.length ?? 1}`).
 */
type Shown<T> = { payload: T; open: boolean }
type UploadToastState = { name: string; state: 'uploading' | 'done' }

/** How long the simulated upload takes before the toast row shows the green check (= tasks attach-files modal). */
const UPLOAD_MS = 1400

/**
 * Lead Details › Files (section 931-39056: 87 empty 931:40314 · 90 list 931:40141 · 85 grid 931:39057 · 89 menus 931:40007 ·
 * 91 folder open 931:39703 · 96/97 multi-select + bulk bar 931:39447 / 931:39576 · 98/99/103/105 dialogs · 100–107 Move ·
 * 104 Deleted Files 931:40208): the tab's state — view mode (grid by default: the mock's main frame 85; the empty frame 87
 * shows list selected — logged), the open folder (`?folder=<id>` so the browser back works), search across every folder,
 * selection + bulk bar (Move to Folder · Duplicate · Delete), the name / trash / move dialogs, the Deleted Files sheet and
 * the upload flow (hidden file input → toast "Uploading…" 1.4 s → `uploadFile()` → "File uploaded"), with the tasks
 * attach-files modal's toast timer. Actions run through the tabs' shared `useRun` (files-actions revalidates this route).
 * Plan: design-source/context/lead-files/00-build-plan.md · specs 01–04.
 */
export function LeadFiles({ leadId, data }: { leadId: string; data: LeadFilesData }) {
  const { files, trashed } = data
  const router = useRouter()
  const snackbar = useSnackbar()
  const comingSoon = useComingSoon()
  const { run, fail } = useRun()

  /* ── location: the open folder lives in the URL (?folder=<id>) ── */
  const params = useSearchParams()
  const folderId = params.get('folder')
  // An id that no longer resolves (trashed, deleted, not a folder) falls back to the root — no mock for a dead link.
  const folder = useMemo(() => (folderId ? files.find((f) => f.id === folderId && isFolder(f)) ?? null : null), [files, folderId])
  const currentId = folder?.id ?? null
  const rootHref = `/leads/${leadId}/files`
  const openFolder = (f: FileRow) => { setQuery(''); router.push(`${rootHref}?folder=${f.id}`) }
  const back = () => { setQuery(''); router.push(rootHref) }
  const openFile = (f: FileRow) => router.push(`${rootHref}/${f.id}`)

  /* ── list state ── */
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  // Search spans every folder (a hit outside the open folder is still a hit); otherwise the open folder's children.
  const visible = useMemo(() => (query.trim() ? searchFiles(files, query) : childrenOf(files, currentId)), [files, query, currentId])
  const folders = useMemo(() => visible.filter(isFolder), [visible])
  const groups = useMemo(() => groupByDay(visible.filter((f) => !isFolder(f))), [visible])
  // Selection follows the visible set (render-phase adjust).
  const visibleIds = useMemo(() => new Set(visible.map((f) => f.id)), [visible])
  if ([...selected].some((id) => !visibleIds.has(id))) setSelected(new Set([...selected].filter((id) => visibleIds.has(id))))
  const selectedIds = [...selected]
  const clearSelection = () => setSelected(new Set())

  /* ── overlays ── */
  const [nameDialog, setNameDialog] = useState<Shown<NameDialogState> | null>(null)
  const [trash, setTrash] = useState<Shown<string[]> | null>(null)
  const [move, setMove] = useState<Shown<string[]> | null>(null)
  const [deletedOpen, setDeletedOpen] = useState(false)
  const openName = (payload: NameDialogState) => setNameDialog({ payload, open: true })
  const openTrash = (ids: string[]) => setTrash({ payload: ids, open: true })
  const openMove = (ids: string[]) => setMove({ payload: ids, open: true })
  const closeName = () => setNameDialog((s) => (s ? { ...s, open: false } : s))
  const closeTrash = () => setTrash((s) => (s ? { ...s, open: false } : s))
  const closeMove = () => setMove((s) => (s ? { ...s, open: false } : s))

  /* ── upload: the picked file's own name persists (REG-149: only the bytes behind it stay the mock's JPEG) ── */
  const picker = useRef<HTMLInputElement | null>(null)
  const [toast, setToast] = useState<UploadToastState | null>(null)
  const [toastCollapsed, setToastCollapsed] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  const nameOf = (id: string) => files.find((f) => f.id === id)?.name ?? trashed.find((f) => f.id === id)?.name ?? ''
  const rowsOf = (ids: string[]) => ids.map((id) => files.find((f) => f.id === id)).filter((f): f is FileRow => !!f)

  const pickFiles = () => picker.current?.click()
  const onPicked = (file: File | undefined) => {
    if (!file) return
    if (timer.current) clearTimeout(timer.current)
    setToast({ name: file.name, state: 'uploading' })
    setToastCollapsed(false)
    const parentId = currentId
    timer.current = setTimeout(() => {
      timer.current = null
      // The name the toast just showed is the name that lands (= the Return Lead wizard's call); dropping it left every
      // upload named "Living Room" — the action's default — a beat after the real name was on screen.
      void uploadFile(leadId, parentId, file.name).then(
        () => { setToast((t) => (t ? { ...t, state: 'done' } : t)); snackbar({ message: 'File uploaded' }) },
        () => fail('upload the file'),
      )
    }, UPLOAD_MS)
  }
  // Parity with the other tabs' window events (om:tasks:add / om:quotes:new): a future quick link raises `om:files:upload` here.
  useCreateIntent({ event: CREATE_EVENTS.files, onIntent: pickFiles })

  /* ── actions ── */
  const duplicate = (ids: string[]) => {
    const rows = rowsOf(ids)
    const done = rows.length === 1 ? (rows[0] && isFolder(rows[0]) ? 'Folder duplicated' : 'File duplicated') : `${rows.length} items duplicated`
    clearSelection()
    void run('duplicate', () => duplicateFiles(ids), done)
  }
  const download = (f: FileRow) => {
    // Image files download their thumbnail (the mock's JPEG stands in for the bytes, REG-149); PDFs / folders have no file behind them.
    if (f.kind !== 'image' || !f.thumb) { comingSoon(); return }
    const name = /\.jpe?g$/i.test(f.name) ? f.name : `${f.name}.jpg`
    void fetch(f.thumb).then((r) => r.blob()).then((blob) => downloadBlob(blob, name)).catch(() => fail('download the file'))
  }
  const confirmTrash = () => {
    const ids = trash?.open ? trash.payload : null; closeTrash(); if (!ids?.length) return
    // Trashing the open folder (or one of its ancestors) leaves nowhere to stand → back to All Files.
    const leaving = !!folder && folderPath(files, folder.id).some((p) => ids.includes(p.id))
    clearSelection()
    // The Undo snackbar rides with the success (RACE-03): a failed trash shows only "Couldn’t move to the Trash Folder".
    void run('move to the Trash Folder', () => trashFiles(ids), { message: 'Moved to Trash Folder', actionLabel: 'Undo', onAction: () => { void run('restore', () => restoreFiles(ids), 'Restored') } })
      .then((ok) => { if (ok && leaving) router.push(rootHref) })
  }
  // One handler behind every kebab: the folder card / breadcrumb menu (931:40130: Open · Move · Rename · Delete), the file
  // tile menu (931:40131: + Duplicate · Download) and the list row's kebab (same items as the tile / card — logged).
  const itemMenu = (f: FileRow, action: FileMenuAction) => {
    if (action === 'open') { if (isFolder(f)) openFolder(f); else openFile(f) }
    else if (action === 'move') openMove([f.id])
    else if (action === 'rename') openName({ mode: 'rename', target: f })
    else if (action === 'delete') openTrash([f.id])
    else if (action === 'duplicate') duplicate([f.id])
    else download(f)
  }

  const moveRows = move ? rowsOf(move.payload) : []
  const trashNames = trash ? trash.payload.map(nameOf).filter(Boolean) : []
  // Where the moved items sit: their own parent, not the browsed folder — a search hit can come from any folder (REG-183).
  // A selection spanning several folders (search only) has no single location → the root, so Move is enabled anywhere else.
  const moveParentId = moveRows[0] && moveRows.every((r) => (r.parentId ?? null) === (moveRows[0]?.parentId ?? null)) ? moveRows[0].parentId ?? null : null
  const moveFolder = moveParentId ? files.find((f) => f.id === moveParentId && isFolder(f)) ?? null : null

  return (
    <div className={styles.tab}>
      <FilesToolbar
        folder={folder} onBack={back}
        onFolderMenu={(action: FolderMenuAction) => { if (folder) itemMenu(folder, action) }}
        query={query} onQuery={setQuery}
        onNew={(kind) => (kind === 'local' ? pickFiles() : comingSoon())}   // From Company Files · From Google Drive — no mock beyond the menu item
        onFilter={comingSoon}   // no Files filter mock (931:40164)
        view={view} onView={setView}
        onMenu={() => setDeletedOpen(true)}
      />
      {files.length === 0 ? (
        <FilesEmpty onCreateFolder={() => openName({ mode: 'create' })} onUpload={pickFiles} />
      ) : view === 'grid' ? (
        // An open folder with nothing inside shows the grid with no groups (no empty-folder mock).
        <FilesGrid
          folders={folders} groups={groups}
          selected={selected} onSelect={setSelected}
          onOpenFolder={openFolder} onOpenFile={openFile}
          onFolderMenu={itemMenu} onFileMenu={itemMenu}
        />
      ) : (
        <FilesTable
          rows={visible}
          selected={selected} onSelect={setSelected}
          onOpenFolder={openFolder} onOpenFile={openFile}
          onRowMenu={itemMenu}
        />
      )}
      {/* Hidden picker behind New File › From Local Files and the empty state's Upload Files (REG-149: any file works). */}
      <input
        ref={picker} type="file" hidden data-testid="files-picker"
        onChange={(e) => { onPicked(e.target.files?.[0]); e.target.value = '' }}
      />
      <DetailBulkBar
        count={selected.size}
        actions={[
          { label: 'Move to Folder', onClick: () => openMove(selectedIds) },
          { label: 'Duplicate', onClick: () => duplicate(selectedIds) },
          { label: 'Delete', tone: 'danger', onClick: () => openTrash(selectedIds) },
        ]}
        onClear={clearSelection}
      />
      <NameDialog
        open={!!nameDialog?.open}
        title={nameDialog?.payload.mode === 'rename' ? (isFolder(nameDialog.payload.target) ? 'Rename Folder' : 'Rename File') : 'Create Folder'}
        initial={nameDialog?.payload.mode === 'rename' ? nameDialog.payload.target.name : ''}
        onSave={(name: string) => {
          const d = nameDialog?.open ? nameDialog.payload : null; closeName(); if (!d) return
          if (d.mode === 'create') void run('create the folder', () => createFolder(leadId, name, currentId), 'Folder created')
          else void run('rename', () => renameFile(d.target.id, name), 'Renamed')
        }}
        onClose={closeName}
      />
      <TrashDialog
        open={!!trash?.open} names={trashNames}
        onNo={closeTrash}
        onYes={confirmTrash}
      />
      <MoveDialog
        open={!!move?.open} items={moveRows} files={files} currentFolder={moveFolder}
        onMove={(parentId: string | null) => {
          const ids = move?.open ? move.payload : null; closeMove(); if (!ids?.length) return
          const dest = parentId ? nameOf(parentId) : ''
          clearSelection()
          void run('move', () => moveFiles(ids, parentId), dest ? `Moved to ${dest}` : 'Moved to All Files')
        }}
        onCreateFolder={async (name: string, parentId: string | null) => {
          const id = await createFolder(leadId, name, parentId)
          snackbar({ message: 'Folder created' })
          return id
        }}
        onClose={closeMove}
      />
      <DeletedFilesSheet
        open={deletedOpen} trashed={trashed} files={files}
        onClose={() => setDeletedOpen(false)}
        // The promises go back to the sheet so its ref-guarded runner / row pending state hold until the action settles.
        onRestore={(ids: string[]) => run('restore', () => restoreFiles(ids), 'Restored')}
        onDeleteForever={(ids: string[]) => run('delete', () => deleteFilesForever(ids), 'Deleted forever')}
        onEmptyTrash={() => run('empty the trash', () => emptyFileTrash(leadId), 'Trash emptied')}
      />
      <UploadToast
        toast={toast} collapsed={toastCollapsed}
        onToggle={() => setToastCollapsed((c) => !c)}
        onClose={() => setToast(null)}
      />
    </div>
  )
}
