'use client'

import { useRememberShape } from '@/lib/ghost-shape'
import { leadTabShape } from '@/components/leads/detail/tab-ghost-for'
import { useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { readFrom, withFrom } from '@/lib/nav'
import { openLeadDesign } from '@/app/visualizer/actions'
import { DetailBulkBar } from '@/components/leads/tasks/detail-bulk-bar'
import { useRun } from '@/components/leads/tasks/use-run'
import { CREATE_EVENTS, useCreateIntent } from '@/components/leads/tasks/use-create-intent'
import { useComingSoon, useSnackbar } from '@/components/om/snackbar'
import { EMPTY_FILE_FILTERS, activeFileFilterCount, applyFileFilters, childrenOf, descendantIds, fileTypesIn, folderPath, groupByDay, isFolder, searchFiles, type FileFilters, type FileRow } from '@/lib/leads/file-model'
import type { LeadFilesData } from '@/lib/leads/files'
import { downloadBlob } from '@/lib/leads/export'
import { uploadPicked } from './upload-picture'
import {
  createFolder, deleteFilesForever, duplicateFiles, emptyFileTrash, moveFiles, renameFile, restoreFiles, trashFiles,
} from '@/app/leads/files-actions'
import { FilesFiltersModal } from './files-filters-modal'
import { useFileShare } from './use-file-share'
import { TabSearchEmpty } from '@/components/leads/tasks/tab-search-empty'
import { FilesToolbar } from './files-toolbar'
import { FilesEmpty } from './files-empty'
import { FilesGrid } from './files-grid'
import { FilesTable } from './files-table'
import { NameDialog } from './name-dialog'
import { TrashDialog } from './trash-dialog'
import { MoveDialog } from '@/components/om/folders/move-dialog'
import { FolderEmpty } from '@/components/om/folders/folder-empty'
import { Button } from '@/components/ds'
import { folderNameProblem, foldersIn, placeOf, type FolderNode } from '@/lib/folders'
import { DeletedFilesSheet } from './deleted-files-sheet'
import { UploadToast, type UploadRow } from './upload-toast'
import { liveOrigin, renderHref, visualizeLabel } from './render-origin'
import { ColumnSettingsDrawer } from '@/components/om/column-settings'
import { useTableColumns } from '@/components/om/table-columns'
import { MOBILE, useMediaQuery } from '@/lib/breakpoint'
import { FILE_COLUMN_DEFS } from './files-table'
import styles from './lead-files.module.css'

/** Folder card kebab (931:40130): Open · Move · Rename · Delete. */
type FolderMenuAction = 'open' | 'move' | 'rename' | 'delete'
/** File tile kebab (931:40131): Open · Move · Duplicate · Download · Rename · Delete. */
type FileMenuAction = FolderMenuAction | 'duplicate' | 'download' | 'visualize' | 'copyLink' | 'whatsapp'

type NameDialogState = { mode: 'create' } | { mode: 'rename'; target: FileRow }
/**
 * A dialog's payload with its own `open` flag: closing clears `open` only, so the exiting frame (lib/motion modalPanel,
 * 0.14 s) keeps its title / names / count instead of degrading to "Create Folder" / "these 0 items" / "Move 0 items"
 * (the quotes twin guards the same beat with `count={deleting?.length ?? 1}`).
 */
type Shown<T> = { payload: T; open: boolean }
/** (T2) A toast row with the file behind it, so Retry sends the same file to the same folder. */
type Upload = UploadRow & { file: File; parentId: string | null }

/** (T2) The least a row reads "Uploading…" — a local upload lands in a blink, and a row that flashes past reads as nothing happening. */
const UPLOAD_MS = 400

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
  const { files, trashed, renders, team, lead, now } = data
  useRememberShape(leadTabShape(leadId, 'files'), files.length === 0)   // (UX audit build) the shape this list opened on — its loading ghost draws the same one next time
  /* (UX audit 2026-09-30, T9) the client's read-only link: Copy link · Send on WhatsApp, signed by whoever sends it */
  const share = useFileShare({ lead, sender: (team.find((m) => m.isYou) ?? team[0])?.name ?? '' })
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
  /* (REG-465) The tab's own origin (`?from=`, a Qanvast-opened lead) rides on every hop inside it, and a file opens with this
     very URL as its `from`, so the viewer's Back lands in the same folder with the same crumb. */
  const from = readFrom(params.get('from'))
  const pathname = usePathname(); const search = params.toString()
  const here = search ? `${pathname}?${search}` : pathname
  const openFolder = (f: FileRow) => { setQuery(''); router.push(withFrom(`${rootHref}?folder=${f.id}`, from)) }
  /* (REG-664) A crumb or Back: Back goes up ONE level (it jumped to All Files), and every folder on the way is a link. */
  const goTo = (id: string | null) => { setQuery(''); router.push(withFrom(id ? `${rootHref}?folder=${id}` : rootHref, from)) }
  const openFile = (f: FileRow) => router.push(withFrom(`${rootHref}/${f.id}`, here))
  /* The comment chip (grid tile + list row) opens the viewer with its comments panel already open —
     the Tasks title-cell chip's interaction (REG-253, user 2026-09-01). */
  const openComments = (f: FileRow) => router.push(withFrom(`${rootHref}/${f.id}?panel=comments`, here))
  /* (REG-675, AI Visualizer Q-31) A photo of the room opens in the lead's design as a room of its own (the editor adds it once).
     (F095) A render filed from the Visualizer opens its own version instead — never a new room made of the render. */
  const labelFor = (f: FileRow) => visualizeLabel(f, renders)
  const openInVisualizer = async (f: FileRow) => {
    const o = liveOrigin(renders[f.id])   // a render whose design was deleted forever opens as a plain picture
    if (o) { router.push(withFrom(renderHref(o), here)); return }
    const r = await openLeadDesign(leadId).catch(() => ({ error: 'Couldn’t open the AI Visualizer — please try again' }))
    if ('error' in r) { snackbar({ message: r.error }); return }
    router.push(withFrom(`/visualizer/${r.id}?file=${f.id}`, here))
  }

  /* ── list state ── */
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  /* (UX audit 2026-09-30, T9) Files › Filters — Type · Owner · Updated, live (REG-464). Like a search they look past the open folder: in it
     and everything inside it (REG-666's "filter where you are"), each hit wearing its place. */
  const [filters, setFilters] = useState<FileFilters>(EMPTY_FILE_FILTERS)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const filterCount = activeFileFilterCount(filters)
  // Search spans every folder (a hit outside the open folder is still a hit); otherwise the open folder's children.
  // (REG-664) Folders come first in both views — the list mixed them in among the files by date.
  const visible = useMemo(() => {
    const inside = currentId ? new Set(descendantIds(files, currentId)) : null
    const base = query.trim() ? searchFiles(files, query) : filterCount ? files.filter((f) => !f.deletedAt && (!inside || inside.has(f.id))) : childrenOf(files, currentId)
    const rows = filterCount ? applyFileFilters(base, filters) : base
    return [...rows.filter(isFolder), ...rows.filter((f) => !isFolder(f))]
  }, [files, query, currentId, filters, filterCount])
  /* (REG-664) The folders as the shared kit reads them — the crumb, the Move dialog, the name check, a hit's location. */
  const folderNodes = useMemo<FolderNode[]>(() => files.filter(isFolder).map((f) => ({ id: f.id, name: f.name, parentId: f.parentId ?? null })), [files])
  const trail = useMemo(() => folderPath(files, currentId), [files, currentId])
  const searching = query.trim() !== '' || filterCount > 0   // (T9) a filter reaches past the open folder, as a search does
  const hitPlace = searching ? (f: FileRow) => placeOf(folderNodes, f.parentId ?? null) || 'All Files' : undefined
  const folders = useMemo(() => visible.filter(isFolder), [visible])
  const groups = useMemo(() => groupByDay(visible.filter((f) => !isFolder(f))), [visible])
  // Selection follows the visible set (render-phase adjust).
  const visibleIds = useMemo(() => new Set(visible.map((f) => f.id)), [visible])
  if ([...selected].some((id) => !visibleIds.has(id))) setSelected(new Set([...selected].filter((id) => visibleIds.has(id))))
  const selectedIds = [...selected]
  const clearSelection = () => setSelected(new Set())

  /* ── overlays ── */
  const [nameDialog, setNameDialog] = useState<Shown<NameDialogState> | null>(null)
  /* Column settings (REG-454): order · visibility · up to three pinned, kept per browser; the phone cards ignore them. */
  const [columnsOpen, setColumnsOpen] = useState(false)
  const phone = useMediaQuery(MOBILE)
  const columnPrefs = useTableColumns('lead-files', FILE_COLUMN_DEFS, phone)
  const [trash, setTrash] = useState<Shown<string[]> | null>(null)
  const [move, setMove] = useState<Shown<string[]> | null>(null)
  const [deletedOpen, setDeletedOpen] = useState(false)
  const openName = (payload: NameDialogState) => setNameDialog({ payload, open: true })
  const openTrash = (ids: string[]) => setTrash({ payload: ids, open: true })
  const openMove = (ids: string[]) => setMove({ payload: ids, open: true })
  const closeName = () => setNameDialog((s) => (s ? { ...s, open: false } : s))
  const closeTrash = () => setTrash((s) => (s ? { ...s, open: false } : s))
  const closeMove = () => setMove((s) => (s ? { ...s, open: false } : s))

  /* ── upload: the picked file's own name persists (REG-149: only the bytes behind it stay the mock's JPEG) ──
     (UX audit 2026-09-30, T2) a pick or a drop takes several files: one toast row each, uploaded one after another into the open folder,
     one snackbar once they have all landed. */
  const picker = useRef<HTMLInputElement | null>(null)
  const [toast, setToast] = useState<Upload[] | null>(null)
  const [toastCollapsed, setToastCollapsed] = useState(false)
  /* (F113) The toast shows each picked picture itself (object URLs, released when the toast goes). */
  const thumbUrls = useRef<string[]>([])
  const releaseThumbs = () => { for (const u of thumbUrls.current) URL.revokeObjectURL(u); thumbUrls.current = [] }
  useEffect(() => () => { for (const u of thumbUrls.current) URL.revokeObjectURL(u) }, [])

  const nameOf = (id: string) => files.find((f) => f.id === id)?.name ?? trashed.find((f) => f.id === id)?.name ?? ''
  const rowsOf = (ids: string[]) => ids.map((id) => files.find((f) => f.id === id)).filter((f): f is FileRow => !!f)

  const pickFiles = () => picker.current?.click()
  const setRow = (key: string, state: Upload['state']) => setToast((t) => (t ? t.map((r) => (r.key === key ? { ...r, state } : r)) : t))
  /** One file to the server — the shared upload (upload-picture.ts `uploadPicked`); true when it landed. */
  const send = async (row: Upload): Promise<boolean> => {
    setRow(row.key, 'uploading')
    const [r] = await Promise.all([uploadPicked(leadId, row.file, row.parentId).catch(() => null), new Promise((ok) => setTimeout(ok, UPLOAD_MS))])
    const ok = !!r && !('error' in r)
    setRow(row.key, ok ? 'done' : 'failed')
    return ok
  }
  const onPicked = (list: File[]) => {
    if (!list.length) return
    const at = Date.now()
    const rows: Upload[] = list.map((file, i) => {
      let thumb: string | null = null
      if (file.type.startsWith('image/')) { try { thumb = URL.createObjectURL(file); thumbUrls.current.push(thumb) } catch { thumb = null } }
      return { key: `${at}-${i}`, name: file.name, state: 'uploading', thumb, file, parentId: currentId }
    })
    setToast((t) => [...rows, ...(t ?? []).filter((r) => r.state === 'uploading')])
    setToastCollapsed(false)
    void (async () => {
      let landed = 0
      for (const row of rows) if (await send(row)) landed++
      const failed = rows.length - landed
      /* one line for the whole pick — the rows say which; a failure names what failed */
      if (!failed) snackbar({ message: landed === 1 ? 'File uploaded' : `${landed} files uploaded` })
      else fail(rows.length === 1 ? `upload ${rows[0]!.name}` : `upload ${failed} of ${rows.length} files`)
    })()
  }
  const retryUpload = (key: string) => {
    const row = toast?.find((r) => r.key === key)
    if (row) void send(row).then((ok) => { if (ok) snackbar({ message: 'File uploaded' }); else fail(`upload ${row.name}`) })
  }
  /* (T2) Files dragged onto the tab: the grid / list shows where they will land and a drop uploads them all. Only a drag that carries files
     counts — a tile or a column head being dragged inside the page does not. */
  const [dropping, setDropping] = useState(false)
  const carriesFiles = (e: React.DragEvent) => [...e.dataTransfer.types].includes('Files')
  const dropHandlers = {
    onDragOver: (e: React.DragEvent) => { if (!carriesFiles(e)) return; e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; if (!dropping) setDropping(true) },
    onDragLeave: (e: React.DragEvent) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDropping(false) },
    onDrop: (e: React.DragEvent) => { if (!carriesFiles(e)) return; e.preventDefault(); setDropping(false); onPicked([...e.dataTransfer.files]) },
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
      .then((ok) => { if (ok && leaving) router.push(withFrom(rootHref, from)) })
  }
  // One handler behind every kebab: the folder card / breadcrumb menu (931:40130: Open · Move · Rename · Delete), the file
  // tile menu (931:40131: + Duplicate · Download) and the list row's kebab (same items as the tile / card — logged).
  const itemMenu = (f: FileRow, action: FileMenuAction) => {
    if (action === 'open') { if (isFolder(f)) openFolder(f); else openFile(f) }
    else if (action === 'move') openMove([f.id])
    else if (action === 'rename') openName({ mode: 'rename', target: f })
    else if (action === 'delete') openTrash([f.id])
    else if (action === 'duplicate') duplicate([f.id])
    else if (action === 'visualize') void openInVisualizer(f)
    else if (action === 'copyLink') share.copyLink(f)   // (T9)
    else if (action === 'whatsapp') share.sendWhatsApp(f)
    else download(f)
  }

  const moveRows = move ? rowsOf(move.payload) : []
  const trashNames = trash ? trash.payload.map(nameOf).filter(Boolean) : []
  // Where the moved items sit: their own parent, not the browsed folder — a search hit can come from any folder (REG-183).
  // A selection spanning several folders (search only) has no single location → the root, so Move is enabled anywhere else.
  const moveParentId = moveRows[0] && moveRows.every((r) => (r.parentId ?? null) === (moveRows[0]?.parentId ?? null)) ? moveRows[0].parentId ?? null : null
  const moveFolder = moveParentId ? files.find((f) => f.id === moveParentId && isFolder(f)) ?? null : null

  return (
    <div className={styles.tab} {...dropHandlers}>
      {dropping ? <div className={styles.drop} aria-hidden><span className={styles.dropLine}>{`Drop to upload to ${folder?.name ?? 'All Files'}`}</span></div> : null}
      <FilesToolbar onColumns={phone || view !== 'list' ? undefined : () => setColumnsOpen(true)} bare={files.length === 0}   /* (REG-735) the empty card carries Upload and Create Folder */
        trail={trail} onGo={goTo} onNewFolder={() => openName({ mode: 'create' })}
        onFolderMenu={(action: FolderMenuAction) => { if (folder) itemMenu(folder, action) }}
        query={query} onQuery={setQuery}
        onNew={(kind) => (kind === 'local' ? pickFiles() : comingSoon())}   // From Company Files · From Google Drive — no mock beyond the menu item
        onFilter={() => setFiltersOpen(true)} filterCount={filterCount}   /* (T9) Type · Owner · Updated */
        view={view} onView={setView}
        onMenu={() => setDeletedOpen(true)}
      />
      {files.length === 0 ? (
        <FilesEmpty onCreateFolder={() => openName({ mode: 'create' })} onUpload={pickFiles} />
      ) : searching && visible.length === 0 ? (
        /* (T9) a search or a filter that finds nothing — the tabs' shared No-results card, with the way back */
        <TabSearchEmpty noun="files" searching={query.trim() !== ''} onClearAll={() => { setQuery(''); setFilters(EMPTY_FILE_FILTERS) }} />
      ) : folder && !searching && visible.length === 0 ? (
        /* (REG-664) An empty folder says so (it showed nothing at all). */
        <FolderEmpty help="Upload files here with New File, or move files in from their ⋯ menu.">
          <Button variant="primary" appearance="outlined" onPress={pickFiles}>Upload Files</Button>
        </FolderEmpty>
      ) : view === 'grid' ? (
        // An open folder with nothing inside shows the grid with no groups (no empty-folder mock).
        <FilesGrid
          folders={folders} groups={groups}
          selected={selected} onSelect={setSelected}
          onOpenFolder={openFolder} onOpenFile={openFile} onOpenComments={openComments}
          onFolderMenu={itemMenu} onFileMenu={itemMenu} placeOf={hitPlace} visualizeLabel={labelFor}
        />
      ) : (
        <FilesTable columns={columnPrefs.columns} onReorder={columnPrefs.reorder}
          rows={visible}
          selected={selected} onSelect={setSelected}
          onOpenFolder={openFolder} onOpenFile={openFile} onOpenComments={openComments}
          onRowMenu={itemMenu} placeOf={hitPlace} visualizeLabel={labelFor}
        />
      )}
      {/* Hidden picker behind New File › From Local Files and the empty state's Upload Files (REG-149: any file works). */}
      <input
        ref={picker} type="file" hidden multiple data-testid="files-picker"
        onChange={(e) => { onPicked([...(e.target.files ?? [])]); e.target.value = '' }}
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
      <ColumnSettingsDrawer open={columnsOpen} onClose={() => setColumnsOpen(false)} pinning={{ max: 3 }} columns={columnPrefs.all} onSave={columnPrefs.save} onReset={columnPrefs.reset} />
      <NameDialog
        open={!!nameDialog?.open}
        title={nameDialog?.payload.mode === 'rename' ? (isFolder(nameDialog.payload.target) ? 'Rename Folder' : 'Rename File') : 'Create Folder'}
        initial={nameDialog?.payload.mode === 'rename' ? nameDialog.payload.target.name : ''}
        validate={(name: string) => {
          const d = nameDialog?.payload
          if (d?.mode === 'rename' && !isFolder(d.target)) return null   // a file's name: required only (Save waits while it is empty)
          const parent = d?.mode === 'rename' ? d.target.parentId ?? null : currentId
          return folderNameProblem(name, foldersIn(folderNodes, parent), d?.mode === 'rename' ? d.target.id : null)
        }}
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
        open={!!move?.open} title={moveRows.length === 1 && moveRows[0] ? `Move “${moveRows[0].name}”` : `Move ${moveRows.length} items`}
        root="All Files" folders={folderNodes} moving={move?.payload ?? []} current={moveFolder?.id ?? null}
        entries={files.filter((f) => !isFolder(f)).map((f) => ({ id: f.id, name: f.name, parentId: f.parentId ?? null, thumb: f.thumb }))}
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
        rows={toast} collapsed={toastCollapsed}
        onToggle={() => setToastCollapsed((c) => !c)}
        onClose={() => { setToast(null); releaseThumbs() }}
        onRetry={retryUpload}
      />
      <FilesFiltersModal open={filtersOpen} team={team} types={fileTypesIn(files)} value={filters} now={now}
        onApply={setFilters}   /* (REG-464) live — the modal closes on Done */
        onClose={() => setFiltersOpen(false)} />
    </div>
  )
}
