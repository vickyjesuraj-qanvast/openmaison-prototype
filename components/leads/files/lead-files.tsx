'use client'

import { titleCaseName } from '@/lib/format'
import { useRememberShape } from '@/lib/ghost-shape'
import { leadTabShape } from '@/components/leads/detail/tab-ghost-for'
import { useMemo, useRef, useState, type ReactNode } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { readFrom, withFrom } from '@/lib/nav'
import { openLeadDesign } from '@/app/visualizer/actions'
import { DetailBulkBar } from '@/components/leads/tasks/detail-bulk-bar'
import { couldnt, useRun } from '@/components/leads/tasks/use-run'
import { setFilesShown } from '@/app/portal/studio-actions'
import { shownLine } from '@/lib/portal/model'
import { CREATE_EVENTS, useCreateIntent } from '@/components/leads/tasks/use-create-intent'
import { useComingSoon, useSnackbar } from '@/components/om/snackbar'
import { EMPTY_FILE_FILTERS, activeFileFilterCount, applyFileFilters, childrenOf, descendantIds, downloadName, fileTypesIn, folderPath, nextFileHeadSort, paperRule, sortFilesByHead, type FileHeadSort, groupByDay, isFolder, searchFiles, type FileFilters, type FileRow } from '@/lib/leads/file-model'
import { usePdfPictures } from './use-pdf-pictures'
import type { LeadFilesData } from '@/lib/leads/files'
import { downloadBlob } from '@/lib/leads/export'
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
import { Icon } from '@/components/om/icon'
import { folderNameProblem, foldersIn, placeOf, type FolderNode } from '@/lib/folders'
import { DeletedFilesSheet } from './deleted-files-sheet'
import { useFileUpload } from './use-file-upload'   // (pending modules S05) the lead's one upload
import { useSendForSignature } from './use-send-for-signature'   // (S46D — D2)
import { signRowFor } from '@/lib/contracts/file-signing'
import { liveOrigin, renderHref, visualizeLabel } from './render-origin'
import { PhotoDialog } from '@/components/planner/photo/photo-dialog'   // (pending modules S28)
import { looksLikeFloorPlan } from '@/lib/planner/photo'
import { ColumnSettingsDrawer } from '@/components/om/column-settings'
import { useTableColumns } from '@/components/om/table-columns'
import { MOBILE, TOUCH_TABLET, useMediaQuery } from '@/lib/breakpoint'
import { FILE_COLUMN_DEFS } from './files-table'
import styles from './lead-files.module.css'

/** Folder card kebab (931:40130): Open · Move · Rename · Delete. */
type FolderMenuAction = 'open' | 'move' | 'rename' | 'delete'
/** File tile kebab (931:40131): Open · Move · Duplicate · Download · Rename · Delete. */
type FileMenuAction = FolderMenuAction | 'duplicate' | 'download' | 'visualize' | 'copyLink' | 'whatsapp' | 'shown' | 'picture3d'   // (pending modules S28) a floor plan's Make a 3D picture
  | 'sign'   // (S46D — D2) a PDF's Send for signature

type NameDialogState = { mode: 'create' } | { mode: 'rename'; target: FileRow }
/**
 * A dialog's payload with its own `open` flag: closing clears `open` only, so the exiting frame (lib/motion modalPanel,
 * 0.14 s) keeps its title / names / count instead of degrading to "Create Folder" / "these 0 items" / "Move 0 items"
 * (the quotes twin guards the same beat with `count={deleting?.length ?? 1}`).
 */
type Shown<T> = { payload: T; open: boolean }
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
/** `base` (REG-913): whose page the tab sits on — `/projects/<id>` when a project carries the lead's files on; the lead's own page by default. */
export function LeadFiles({ leadId, data, base, views }: { leadId: string; data: LeadFilesData; base?: string; /** (simplify S-03) on a project: the Files & notes view switch in the title's place */ views?: ReactNode }) {
  const { files, trashed, renders, team, lead, now } = data
  const readOnly = data.readOnly   // (pending modules S06) Accounting reads a project's files — open and download; nothing to add or change
  useRememberShape(leadTabShape(leadId, 'files'), files.length === 0)   // (UX audit build) the shape this list opened on — its loading ghost draws the same one next time
  usePdfPictures(files)   // (gaps build E, item 1) a PDF kept before its first page was drawn gets it now, once
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
  const rootHref = `${base ?? `/leads/${leadId}`}/files`
  /* (REG-465) The tab's own origin (`?from=`, a Qanvast-opened lead) rides on every hop inside it, and a file opens with this
     very URL as its `from`, so the viewer's Back lands in the same folder with the same crumb. */
  const from = readFrom(params.get('from'))
  const pathname = usePathname(); const search = params.toString()
  const here = search ? `${pathname}?${search}` : pathname
  const openFolder = (f: FileRow) => { setQuery(''); router.push(withFrom(`${rootHref}?folder=${f.id}`, from)) }
  /* (REG-664) A crumb or Back: Back goes up ONE level (it jumped to All Files), and every folder on the way is a link. */
  const goTo = (id: string | null) => { setQuery(''); router.push(withFrom(id ? `${rootHref}?folder=${id}` : rootHref, from)) }
  /* (S42 audit C-03) a money paper's entry opens its paper — the page that IS the document (the viewer would show a glyph with nothing behind it) */
  const openFile = (f: FileRow) => router.push(withFrom(f.paper ?? `${rootHref}/${f.id}`, here))
  /* The comment chip (grid tile + list row) opens the viewer with its comments panel already open —
     the Tasks title-cell chip's interaction (REG-253, user 2026-09-01). */
  const openComments = (f: FileRow) => router.push(withFrom(`${rootHref}/${f.id}?panel=comments`, here))
  /* (REG-675, AI Visualizer Q-31) A photo of the room opens in the lead's design as a room of its own (the editor adds it once).
     (F095) A render filed from the Visualizer opens its own version instead — never a new room made of the render. */
  const labelFor = (f: FileRow) => (data.tools ? visualizeLabel(f, renders) : null)   // (S45C) the studio's tools only for whoever opens them
  /* (pending modules S28 — card studio:floorplan-isometric-ai) a floor plan — a picture or a PDF named so, or kept in a Floor plans folder —
     offers Make a 3D picture: the 3D Space Planner's photo dialog for this lead (its project's, once won) with the file as it is in Files */
  const floorPlanOf = (f: FileRow) => data.tools && !isFolder(f) && (f.kind === 'image' || f.kind === 'pdf') && looksLikeFloorPlan(f.name, folderPath(files, f.parentId ?? null).map((p) => p.name))
  const [picture3d, setPicture3d] = useState<FileRow | null>(null)
  /* (S46D — D2, finding D2) a PDF's Send for signature: Import a contract with the file already in it; a picture or a document says why not */
  const signRow = (f: FileRow) => signRowFor(f, { signs: data.signs, contract: data.contracts[f.id] ?? null })
  const signing = useSendForSignature({ leadId, files, here: () => here })
  const projectId = base?.startsWith('/projects/') ? base.slice('/projects/'.length).split('/')[0] ?? null : null
  const openInVisualizer = async (f: FileRow) => {
    const o = liveOrigin(renders[f.id])   // a render whose design was deleted forever opens as a plain picture
    if (o) { router.push(withFrom(renderHref(o), here)); return }
    const r = await openLeadDesign(leadId).catch(() => ({ error: 'Couldn’t open the AI Visualizer — please try again' }))
    if ('error' in r) { snackbar({ message: r.error }); return }
    router.push(withFrom(`/visualizer/${r.id}?file=${f.id}`, here))
  }

  /* ── list state ── */
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [headSort, setHeadSort] = useState<FileHeadSort>(null)   /* (pending modules S05) the list's heads sort */
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
  const touchTablet = useMediaQuery(TOUCH_TABLET) && !phone   /* (Leads on the move, L4 — C-07) the tablet's own default set, remembered apart */
  const columnPrefs = useTableColumns('lead-files', FILE_COLUMN_DEFS, phone, touchTablet)
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
     one snackbar once they have all landed. (pending modules S05) The run is the lead's one upload (use-file-upload.tsx), shared with the
     Overview's FILES card. */
  const picker = useRef<HTMLInputElement | null>(null)
  const { upload, toast: uploadToast } = useFileUpload(leadId)

  const nameOf = (id: string) => files.find((f) => f.id === id)?.name ?? trashed.find((f) => f.id === id)?.name ?? ''
  const rowsOf = (ids: string[]) => ids.map((id) => files.find((f) => f.id === id)).filter((f): f is FileRow => !!f)

  const pickFiles = () => picker.current?.click()
  const onPicked = (list: File[]) => { if (!readOnly) upload(list, currentId) }
  /* (Leads on the move, L4 — P-11 · C-09) Take a photo: the phone's camera at once (`capture="environment"`, pictures only), the photo into the
     open folder; the snackbar says where it went and offers the next one — a site visit is several photos in a row. */
  const camera = useRef<HTMLInputElement | null>(null)
  const takePhoto = () => camera.current?.click()
  const onPhotos = (list: File[]) => { if (!readOnly && list.length) upload(list, currentId, { where: folder?.name ?? 'All Files', again: takePhoto }) }
  /* (T2) Files dragged onto the tab: the grid / list shows where they will land and a drop uploads them all. Only a drag that carries files
     counts — a tile or a column head being dragged inside the page does not. */
  const [dropping, setDropping] = useState(false)
  const carriesFiles = (e: React.DragEvent) => [...e.dataTransfer.types].includes('Files')
  const dropHandlers = {
    onDragOver: (e: React.DragEvent) => { if (readOnly || !carriesFiles(e)) return; e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; if (!dropping) setDropping(true) },
    onDragLeave: (e: React.DragEvent) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDropping(false) },
    onDrop: (e: React.DragEvent) => { if (readOnly || !carriesFiles(e)) return; e.preventDefault(); setDropping(false); onPicked([...e.dataTransfer.files]) },
  }
  // Parity with the other tabs' window events (om:tasks:add / om:quotes:new): a future quick link raises `om:files:upload` here.
  /* (Leads on the move, L4 — P-11) on a phone the tab's first way in is the camera — a Create from the lead's screen opens it there too */
  useCreateIntent({ event: CREATE_EVENTS.files, onIntent: () => { if (!readOnly) { if (phone) takePhoto(); else pickFiles() } } })

  /* ── actions ── */
  /* (S42 audit C-03, call C·4) a money paper among the picked: the rule says why at the press, before a dialog opens (the server holds it too) */
  const unlessPaper = (what: string, ids: string[], go: () => void) => {
    const p = rowsOf(ids).find((f) => f.paper)
    if (p?.paper) { snackbar({ message: couldnt(what, paperRule(p.name, p.paper)) }); return }
    go()
  }
  const duplicate = (ids: string[]) => {
    const rows = rowsOf(ids)
    const done = rows.length === 1 ? (rows[0] && isFolder(rows[0]) ? 'Folder duplicated' : 'File duplicated') : `${rows.length} items duplicated`
    clearSelection()
    void run('duplicate', () => duplicateFiles(ids), done)
  }
  /* (gaps build E, item 1) Download gives the file as it was uploaded, under its own name — any kind (/files/raw/<id>); a demo stand-in picture
     gives the picture it shows. (pending modules S07 — was Coming soon, REG-1229) A money paper's entry — an invoice, a receipt, a credit note, a
     selection receipt — is its page: Download opens it printing (the house's Download PDF, `?print=1`) and Back returns here. */
  const download = (f: FileRow) => {
    if (f.paper) { router.push(withFrom(`${f.paper}?print=1`, here)); return }
    if (isFolder(f) || (!f.bytes && !(f.kind === 'image' && f.thumb))) { comingSoon(); return }
    void fetch(`/files/raw/${f.id}?download=1`).then((r) => { if (!r.ok) throw new Error(); return r.blob() })
      .then((blob) => downloadBlob(blob, downloadName(f.name, blob.type || f.mime))).catch(() => fail('download the file'))
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
    else if (action === 'shown') toggleShown(f)
    else if (action === 'picture3d') setPicture3d(f)   // (pending modules S28)
    else if (action === 'sign') { if (!signRow(f)?.why) signing.open(f) }   // (S46D — D2)
    else download(f)
  }
  /* (Projects r4a) Show to client / Stop showing: the portal's Files lists only files marked so — Undo puts it back */
  const toggleShown = (f: FileRow) => {
    const on = !f.shownToClientAt
    /* (pending modules S02) a render lands on the client's Designs too — the sentence says so once the server has answered */
    const box: { designs: number } = { designs: 0 }
    void run(on ? 'show the file to the client' : 'stop showing the file', async () => { const r = await setFilesShown(leadId, [f.id], on); if ('error' in r) return r; box.designs = r.designs })
      .then((ok) => { if (ok) snackbar({ message: shownLine(f.name, on, box.designs), actionLabel: 'Undo', onAction: () => { void run('undo that', () => setFilesShown(leadId, [f.id], !on)) } }) })
  }

  const moveRows = move ? rowsOf(move.payload) : []
  const trashNames = trash ? trash.payload.map(nameOf).filter(Boolean) : []
  /* (fix-C, C-25) a file on a published update: the client sees it there — the question says so before it goes */
  const onUpd = trash ? trash.payload.filter((id) => data.onUpdates?.[id]) : []
  const clientFirst = titleCaseName(lead.name).split(/\s+/)[0] || 'The client'
  const trashSeen = !onUpd.length ? null : onUpd.length === 1 && trash?.payload.length === 1 ? `It is on the update “${data.onUpdates[onUpd[0]!]}” — ${clientFirst} sees it there, and it leaves that update too.`
    : `${onUpd.length} of them are on published updates — ${clientFirst} sees them there, and they leave those updates too.`
  // Where the moved items sit: their own parent, not the browsed folder — a search hit can come from any folder (REG-183).
  // A selection spanning several folders (search only) has no single location → the root, so Move is enabled anywhere else.
  const moveParentId = moveRows[0] && moveRows.every((r) => (r.parentId ?? null) === (moveRows[0]?.parentId ?? null)) ? moveRows[0].parentId ?? null : null
  const moveFolder = moveParentId ? files.find((f) => f.id === moveParentId && isFolder(f)) ?? null : null

  return (
    <div className={styles.tab} {...dropHandlers}>
      {dropping ? <div className={styles.drop} aria-hidden><span className={styles.dropLine}>{`Drop to upload to ${folder?.name ?? 'All Files'}`}</span></div> : null}
      <FilesToolbar onColumns={phone || view !== 'list' ? undefined : () => setColumnsOpen(true)} bare={files.length === 0} views={views}   /* (REG-735) the empty card carries Upload and Create Folder */
        trail={trail} onGo={goTo} onNewFolder={() => openName({ mode: 'create' })}
        onFolderMenu={(action: FolderMenuAction) => { if (folder) itemMenu(folder, action) }}
        query={query} onQuery={setQuery}
        onNew={(kind) => (kind === 'local' ? pickFiles() : comingSoon())}   // From Google Drive — the developers' (OAuth); no mock beyond the menu item
        onFilter={() => setFiltersOpen(true)} filterCount={filterCount}   /* (T9) Type · Owner · Updated */
        view={view} onView={setView}
        onMenu={() => setDeletedOpen(true)} readOnly={readOnly}
        onPhoto={readOnly ? undefined : takePhoto}
      />
      {files.length === 0 ? (
        <FilesEmpty onCreateFolder={() => openName({ mode: 'create' })} onUpload={pickFiles} readOnly={readOnly} onPhoto={takePhoto} />
      ) : searching && visible.length === 0 ? (
        /* (T9) a search or a filter that finds nothing — the tabs' shared No-results card, with the way back */
        <TabSearchEmpty noun="files" searching={query.trim() !== ''} onClearAll={() => { setQuery(''); setFilters(EMPTY_FILE_FILTERS) }} />
      ) : folder && !searching && visible.length === 0 ? (
        /* (REG-664) An empty folder says so (it showed nothing at all). */
        readOnly ? <FolderEmpty help="The project’s team adds its files here." /> : (
        phone ? (
          /* (Leads on the move, L4 — P-11) a phone's empty folder: the camera, its photos landing here *(invented copy: the help line)* */
          <FolderEmpty help="Take photos into this folder, or choose files from ⋮.">
            <Button variant="primary" appearance="outlined" iconStart={<Icon name="photo_camera" size={20} />} onPress={takePhoto} data-testid="folder-empty-photo">Take a photo</Button>
          </FolderEmpty>
        ) : (
        <FolderEmpty help="Upload files here with New File, or move files in from their ⋯ menu.">
          <Button variant="primary" appearance="outlined" onPress={pickFiles}>Upload Files</Button>
        </FolderEmpty>))
      ) : view === 'grid' ? (
        // An open folder with nothing inside shows the grid with no groups (no empty-folder mock).
        <FilesGrid
          folders={folders} groups={groups}
          selected={selected} onSelect={setSelected}
          onOpenFolder={openFolder} onOpenFile={openFile} onOpenComments={openComments}
          onFolderMenu={itemMenu} onFileMenu={itemMenu} placeOf={hitPlace} visualizeLabel={labelFor} readOnly={readOnly} floorPlan={floorPlanOf} signRow={signRow}
        />
      ) : (
        <FilesTable columns={columnPrefs.columns} onReorder={columnPrefs.reorder}
          rows={sortFilesByHead(visible, headSort)} sort={headSort} onSort={(k) => setHeadSort((h) => nextFileHeadSort(h, k))}
          selected={selected} onSelect={setSelected}
          onOpenFolder={openFolder} onOpenFile={openFile} onOpenComments={openComments}
          onRowMenu={itemMenu} placeOf={hitPlace} visualizeLabel={labelFor} readOnly={readOnly} floorPlan={floorPlanOf} signRow={signRow}
        />
      )}
      {/* Hidden picker behind New File › From Local Files and the empty state's Upload Files (REG-149: any file works). */}
      <input
        ref={picker} type="file" hidden multiple data-testid="files-picker"
        onChange={(e) => { onPicked([...(e.target.files ?? [])]); e.target.value = '' }}
      />
      {/* (L4 — P-11) the camera's own picker: pictures only, the back camera first */}
      <input
        ref={camera} type="file" hidden accept="image/*" capture="environment" data-testid="files-camera"
        onChange={(e) => { onPhotos([...(e.target.files ?? [])]); e.target.value = '' }}
      />
      <DetailBulkBar
        count={selected.size}
        actions={[
          { label: 'Move to Folder', onClick: () => unlessPaper('move them', selectedIds, () => openMove(selectedIds)) },
          { label: 'Duplicate', onClick: () => unlessPaper('duplicate them', selectedIds, () => duplicate(selectedIds)) },
          { label: 'Delete', tone: 'danger', onClick: () => unlessPaper('move them to the Trash Folder', selectedIds, () => openTrash(selectedIds)) },
        ]}
        onClear={clearSelection}
      />
      <PhotoDialog open={!!picture3d} onClose={() => setPicture3d(null)} target={projectId ? { kind: 'project', id: projectId } : { kind: 'lead', id: leadId }}
                   from={picture3d ? { kind: 'file', fileId: picture3d.id, name: picture3d.name } : { kind: 'upload' }} back={here} />   {/* (pending modules S28) */}
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
        open={!!trash?.open} names={trashNames} seen={trashSeen}
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
          if (typeof id !== 'string') throw new Error(id.error)   // (gaps build E, item 2) the dialog says the rule
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
      {uploadToast}
      {signing.dialog}
      <FilesFiltersModal open={filtersOpen} team={team} types={fileTypesIn(files)} value={filters} now={now}
        onApply={setFilters}   /* (REG-464) live — the modal closes on Done */
        onClose={() => setFiltersOpen(false)} />
    </div>
  )
}
