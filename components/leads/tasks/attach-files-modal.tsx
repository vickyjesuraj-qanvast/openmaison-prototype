'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Button, Checkbox, SearchBar } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { useOverflow } from '@/components/om/use-overflow'
import { IconButton } from '@/components/om/icon-button'
import { SegmentedIconToggle } from '@/components/om/segmented'
import { PortalMenu } from '@/components/om/portal-menu'
import { DropdownItem, MENU_WIDTH } from '@/components/leads/dropdown'
import { FolderCrumbs } from '@/components/om/folders/folder-crumbs'
import { AppliedDot } from '@/components/om/applied-dot'
import { descendantIds, fileTypeLabel } from '@/lib/leads/file-model'
import { Tooltip } from '@/components/om/tooltip'
import { SurfaceFoot, SurfaceHead, surfaceClasses } from '@/components/om/dialog'
import { useScrollLock } from '@/components/om/use-scroll-lock'
import { useDialogFocus, useEscapeLayer } from '@/components/om/surface'
import { Dropzone } from '@/components/leads/move-stage/fields'
import { bottomSheet, modalPanel, overlayFade, snackbarRise } from '@/lib/motion'
import { useSheetLayout } from '@/components/om/sheet'
import { displayDate, startOfDay } from '@/lib/format'
import { filterByQuery } from '@/lib/search'
import type { LeadFile } from '@/lib/db/schema'
import styles from './attach-files-modal.module.css'

/* Group headers read "Friday, 17 Jul ’26" — lib/format only has the short weekday (displayDateLong: "Fri, …"), so the long
   weekday is spelled out here. */
const DAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const dayLabel = (d: Date) => `${DAYS_LONG[d.getDay()]}, ${displayDate(d)}`

/** How long the simulated upload takes before the toast row shows the green check. */
const UPLOAD_MS = 1400

/** One row of the upload toast — one per picked file (T2). `file` stays at hand so a failed row's Retry sends it again. */
type ToastRow = { key: string; name: string; pdf: boolean; thumb: string | null; state: 'uploading' | 'done' | 'failed'; file: File | null }
/** (UX audit 2026-09-30, T1) What a host's upload answers: the real file (listed and ticked here), a refusal, or nothing — the old stand-in. */
export type UploadAnswer = LeadFile | { error: string } | null
const isFileRow = (r: unknown): r is LeadFile => !!r && typeof r === 'object' && 'id' in r && 'name' in r && !('error' in r)

/**
 * Attach files modal (902:28220 frame 57 · 56 one file + uploading toast 902:28261 · 58 · 64 empty): 1200×928 xl modal
 * (the import wizard's shell), dropzone on top, then "Your files" — folders, then one group per calendar day of tiles.
 * Spec: design-source/context/lead-tasks/04-comments-attach.txt.
 *
 * Selection: tiles toggle ids; a group's header checkbox selects / clears the group. Files already attached to the task
 * open pre-checked; the footer count and `onAttach` carry only the NEW picks (attached − already attached) so the parent's
 * "{n} files attached" stays honest. (UX audit 2026-09-30, T1 · T2) Every picked / dropped file — several at once — gets a row in the
 * upload toast and goes through the host's `onUploadPicked`: a host that uploads (the Tasks tab: the Files tab's `uploadFileRecord`,
 * REG-684) answers the real file, which is listed under today and ticked; a refused one reads Failed with a Retry. A host that answers
 * nothing keeps REG-149's stand-in ("Uploading…" 1.4 s → the mock's file under today, local id).
 */
export function AttachFilesModal({
  open, files, attached, onClose, onAttach, onUploadPicked, mode = 'files', chrome = 'tasks', layered = false,
}: {
  open: boolean
  files: LeadFile[]
  attached: string[]
  onClose: () => void
  onAttach: (fileIds: string[]) => void
  /** (UX audit 2026-09-30, T1) The host's upload for a picked / dropped file. Answer a promise of the real `LeadFile` (the Files tab's
      `uploadFileRecord`, REG-684) and the modal lists it and ticks it; answer nothing and it keeps REG-149's stand-in. */
  onUploadPicked: (file?: File) => void | Promise<UploadAnswer>
  /** image = the quote editor's "Add Image" (1271:41016): images only, one pick, "Add" (REG-415). */
  mode?: 'files' | 'image'
  /** quote = the quote editor's frames (Attach files 1238:30353 · Add Image 1271:41016): no checkboxes — a picked tile is
   *  tinted — the caption is kind glyph · name · kebab, folder cards count their items, "Search files", no dropzone helper,
   *  the `sort` glyph and a list-then-grid toggle. tasks = the Tasks tab's own mock (902:28220), unchanged. */
  chrome?: 'tasks' | 'quote'
  /** (REG-2641, the Leads audit's C-01 — a bug fix) opened from a phone sheet (the Notes tab's contact log): the layer above it */
  layered?: boolean
}) {
  const imageMode = mode === 'image'
  const quoteChrome = chrome === 'quote'
  useScrollLock(open)
  const [selected, setSelected] = useState<Set<string>>(() => new Set(attached))
  const [query, setQuery] = useState('')
  /* (pending modules S05 — the card's "Attach files dialog: type chip, Sort, list view, select all, folder ⋮ answer Coming soon · revisit: the
     Files tab has real filters, list view and folders") The bar does its job, the Files tab's way: File Type narrows to one kind, Sort orders
     by date or name, the view toggle lays the files out as the phone's list (canvas 2j), and a folder opens — the list then shows what is
     in it and everything inside (REG-666's "filter where you are"), with the folder crumb to go back up; a folder's ⋮ opens it or ticks
     every file inside it. */
  const [kindPick, setKindPick] = useState<string | null>(null)
  const [order, setOrder] = useState<'newest' | 'oldest' | 'name'>('newest')
  const [layout, setLayout] = useState<'grid' | 'list'>('grid')
  const [place, setPlace] = useState<string | null>(null)
  const [menu, setMenu] = useState<'type' | 'sort' | `folder:${string}` | null>(null)
  const typeRef = useRef<HTMLButtonElement>(null)
  const sortRef = useRef<HTMLSpanElement>(null)
  const folderMenuRef = useRef<HTMLButtonElement | null>(null)
  const [uploaded, setUploaded] = useState<LeadFile[]>([])
  const [toast, setToast] = useState<ToastRow[] | null>(null)
  const [toastCollapsed, setToastCollapsed] = useState(false)
  const [wasOpen, setWasOpen] = useState(open)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  /* (REG-287) `aria-modal` promised assistive tech the page behind is inert, but the panel only locked scrolling:
     Tab from the last control walked straight back out. The app's surface policy does all three (components/om/surface.ts,
     as in components/om/dialog.tsx): Esc closes the TOPMOST surface only (the date picker / a portal menu above wins
     first), focus moves onto the panel on open — unless a field inside already autofocused — Tab cycles inside it, and
     focus returns to the opener on close. */
  const panel = useRef<HTMLDivElement>(null)
  /* (REG-353) ≤767 this modal is the canvas' bottom sheet: it rises off the bottom edge and wears the grabber. */
  const sheet = useSheetLayout()
  useEscapeLayer(open, panel, onClose)
  useDialogFocus(open, panel)
  const [scrollRef, bodyScrolls] = useOverflow()   // the footer's shadow follows the body's scroll (REG-322)

  // Fresh state per opening (render-phase adjust): selection = what the task already has.
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) { setSelected(new Set(attached)); setQuery(''); setUploaded([]); setToast(null); setToastCollapsed(false); setKindPick(null); setOrder('newest'); setPlace(null); setMenu(null) }
  }
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])
  /* the toast's picture thumbs are object URLs of the picked files — released when the modal goes */
  const thumbs = useRef<string[]>([])
  const pickRun = useRef(0)   // each pick's rows get keys of their own
  useEffect(() => () => { for (const u of thumbs.current) URL.revokeObjectURL(u) }, [])

  /* An upload that landed is also in `files` once the page refreshes (the action revalidates the lead) — listed once. */
  const library = useMemo(() => [...uploaded.filter((u) => !files.some((f) => f.id === u.id)), ...(imageMode ? files.filter((f) => f.kind !== 'pdf') : files)], [uploaded, files, imageMode])
  /* (pending modules S05) where you are: the open folder and everything inside it; the folder cards are the ones directly in it */
  const inside = useMemo(() => (place ? new Set(descendantIds(library, place)) : null), [library, place])
  const here = inside ? library.filter((f) => inside.has(f.id)) : library
  const trail = useMemo(() => {
    const out: { id: string; name: string; parentId: string | null }[] = []
    let at = place
    while (at) { const f = library.find((x) => x.id === at); if (!f) break; out.unshift({ id: f.id, name: f.name, parentId: f.parentId ?? null }); at = f.parentId ?? null }
    return out
  }, [library, place])
  const kinds = useMemo(() => [...new Set(library.filter((f) => f.kind !== 'folder').map(fileTypeLabel))].sort((a, b) => a.localeCompare(b)), [library])
  const all = here.filter((f) => f.kind === 'folder' ? (f.parentId ?? null) === place : !kindPick || fileTypeLabel(f) === kindPick)
  /* Search matches everything a tile shows (REG-274): the file name, the kind caption under it ("pdf" / "image"),
     and the day heading the tile sits under, formatted by this modal's own `dayLabel` ("Friday, 17 Jul ’26") so a
     search for a day keeps that whole group. Folders carry neither a kind caption nor a day heading — they render
     under "Folders" — so they match on their name alone. Name-only was the previous rule. */
  const shown = filterByQuery(all, query, (f) => ({
    fields: f.kind === 'folder' ? [f.name] : [f.name, f.kind, dayLabel(f.createdAt)],
  }))
  const folders = kindPick ? [] : shown.filter((f) => f.kind === 'folder')   // a kind picked lists files of that kind, not folders
  const items = shown.filter((f) => f.kind !== 'folder')
  // One group per calendar day, newest day first (the spec shows a single day; the order is the library's — recent on top).
  // (pending modules S05) Sort: oldest day first, or by name in one group.
  const groups = order === 'name'
    ? (items.length ? [{ day: 0, label: 'By name', files: [...items].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })) }] : [])
    : [...items]
    .sort((a, b) => (order === 'oldest' ? a.createdAt.getTime() - b.createdAt.getTime() : b.createdAt.getTime() - a.createdAt.getTime()))
    .reduce<{ day: number; label: string; files: LeadFile[] }[]>((acc, f) => {
      const day = startOfDay(f.createdAt)
      const g = acc.find((x) => x.day === day)
      if (g) g.files.push(f); else acc.push({ day, label: dayLabel(f.createdAt), files: [f] })
      return acc
    }, [])
  /** A folder's own files, wherever they sit inside it — its ⋮ › Select. */
  const filesIn = (folderId: string) => { const ids = new Set(descendantIds(library, folderId)); return library.filter((f) => f.kind !== 'folder' && ids.has(f.id) && (!kindPick || fileTypeLabel(f) === kindPick)) }
  const openFolder = (id: string | null) => { setPlace(id); setQuery(''); setMenu(null) }
  const SORT_WORDS = { newest: 'Newest first', oldest: 'Oldest first', name: 'Name (A–Z)' } as const

  const attachedSet = new Set(attached)
  const picks = [...selected].filter((id) => !attachedSet.has(id))
  const toggle = (id: string) => setSelected((s) => { if (imageMode) return new Set(s.has(id) ? [] : [id]); const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const toggleGroup = (ids: string[], on: boolean) => setSelected((s) => { const n = new Set(s); ids.forEach((id) => (on ? n.add(id) : n.delete(id))); return n })

  /* (UX audit 2026-09-30, T1 · T2) Each picked or dropped file gets its row in the toast and goes through the host's upload; a real file
     comes back listed under today and ticked, so "Attach n Files" carries it. Image mode (the quote's Add Image) keeps one pick. */
  const setRow = (key: string, state: ToastRow['state']) => setToast((t) => (t ? t.map((r) => (r.key === key ? { ...r, state } : r)) : t))
  const send = (row: ToastRow) => {
    const answer = onUploadPicked(row.file ?? undefined)
    if (!answer || typeof (answer as Promise<UploadAnswer>).then !== 'function') return false
    setRow(row.key, 'uploading')
    ;(answer as Promise<UploadAnswer>).then((r) => {
      if (!isFileRow(r)) { setRow(row.key, 'failed'); return }
      setRow(row.key, 'done')
      setUploaded((u) => [r, ...u.filter((x) => x.id !== r.id)])
      setSelected((sel) => (imageMode ? new Set([r.id]) : new Set(sel).add(r.id)))
    }, () => setRow(row.key, 'failed'))
    return true
  }
  const retry = (key: string) => { const row = toast?.find((r) => r.key === key); if (row?.file) send(row) }
  const pickMany = (list: File[]) => {
    const picked = imageMode ? list.slice(0, 1) : list
    if (!picked.length) return
    const at = ++pickRun.current
    const rows: ToastRow[] = picked.map((file, i) => {
      let thumb: string | null = null
      if (file.type.startsWith('image/')) { try { thumb = URL.createObjectURL(file); thumbs.current.push(thumb) } catch { thumb = null } }
      return { key: `${at}-${i}`, name: file.name, pdf: /\.pdf$/i.test(file.name), thumb, state: 'uploading', file }
    })
    setToast((t) => [...rows, ...(t ?? [])])
    setToastCollapsed(false)
    const legacy = rows.filter((row) => !send(row))
    if (legacy.length) pickStandIn(legacy)
  }
  /* REG-149's stand-in — a host that keeps no upload of its own (its answer is nothing): the row turns done after the simulated beat and
     the mock's file joins the list under today. */
  const pickStandIn = (rows: ToastRow[]) => {
    if (!rows.length) return
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      setToast((t) => (t ? t.map((r) => (rows.some((x) => x.key === r.key) ? { ...r, state: 'done' } : r)) : t))
      // The uploaded file joins the library under today — the mock's thumbnail stands in for the real bytes (REG-149).
      // The kind follows the picked name, though: the dropzone advertises PDFs, and a PDF captioned with a photo of a
      // floor plan reads as a bug. A null thumb takes the row's existing surface-variant + glyph branch. Same
      // derivation as components/leads/return/return-lead-wizard.tsx, so the two surfaces agree about one pick.
      const at = new Date()
      setUploaded((u) => [...rows.map(({ name, pdf }, i): LeadFile => ({ id: `local-${at.getTime()}-${i}`, leadId: files[0]?.leadId ?? '', kind: pdf ? 'pdf' : 'image', name, thumb: pdf ? null : '/figma-assets/file-thumb-1.png', createdAt: at, parentId: null, ownerId: null, sizeBytes: 728064, mime: pdf ? 'application/pdf' : 'image/jpeg', updatedAt: at, deletedAt: null, shownToClientAt: null })), ...u])
    }, UPLOAD_MS)
  }

  const count = picks.length
  const attachLabel = imageMode ? 'Add' : count === 0 ? 'Attach Files' : count === 1 ? 'Attach 1 File' : `Attach ${count} Files`
  // The head counts the toast's rows, not the in-flight flag: the toast stays up after the row's green check (only ✕
  // removes it), and a count keyed off 'uploading' turned that frame into "Uploading 0 files" — the mock's head reads
  // "Uploading 2 files" over its finished rows (902:28261). (T2) One row per picked file; a failure says so once nothing is in flight.
  const uploadingCount = toast?.length ?? 0
  const failedCount = toast?.filter((r) => r.state === 'failed').length ?? 0
  const settled = !!toast && toast.every((r) => r.state !== 'uploading')
  const toastTitle = settled && failedCount ? (failedCount === uploadingCount ? (uploadingCount === 1 ? 'Upload failed' : `${uploadingCount} uploads failed`) : `${failedCount} of ${uploadingCount} uploads failed`)
    : uploadingCount === 1 ? 'Uploading 1 file' : `Uploading ${uploadingCount} files`

  return (
    <AnimatePresence>
      {open ? (
        <motion.div className={styles.overlay} data-layered={layered || undefined} variants={overlayFade} initial="initial" animate="animate" exit="exit"
                    onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
          {/* (REG-287) tabIndex={-1} so the panel can hold focus; the shared panel's `outline: none` (surfaceClasses.panel)
              leaves the ring to the panel's own controls. */}
          <motion.div ref={panel} className={`${surfaceClasses.panel} ${styles.panel}`} variants={sheet ? bottomSheet : modalPanel}
                      role="dialog" aria-modal aria-label={imageMode ? 'Add Image' : 'Attach files'} tabIndex={-1}>
            {sheet ? <span className={surfaceClasses.grabber} aria-hidden /> : null}
            {/* (REG-725) the house head and foot — head 64 (p20/24): title 20/Bold · bare 24px close · 1px rule (779:26016). */}
            <SurfaceHead title={imageMode ? 'Add Image' : 'Attach files'} onClose={onClose} className={styles.head} />

            <div ref={scrollRef} className={styles.body}>
              {/* Upload block (V g12): title 16/Semi Bold + dropzone 140 (p40, 2px dashed #cccccc on surface-bg). */}
              <div className={styles.uploadBlock}>
                <span className={styles.blockTitle}>Upload from your local files</span>
                <div className={styles.dropWrap}>
                  <Dropzone
                    title={<>Drop your file or <b>browse</b></>}
                    helper={quoteChrome ? undefined : imageMode ? 'Supports: JPEG or PNG' : 'Supports: JPEG, PNG, PDF'}
                    accept={imageMode ? 'image/*' : 'image/*,.pdf'}
                    onPick={(f) => { if (f) pickMany([f]) }}
                    onPickMany={imageMode ? undefined : pickMany}
                  />
                </div>
              </div>

              <div className={styles.rule} />

              {/* "Your files" block (V g16): bar (title · search 240 · File Type chip · sort · grid/list) then the groups (V g40). */}
              <div className={styles.filesBlock}>
                <div className={styles.bar}>
                  <span className={styles.blockTitle}>Your files</span>
                  <SearchBar
                    className={styles.search}
                    appearance="outlined"
                    placeholder={quoteChrome ? 'Search files' : 'Search'}
                    aria-label="Search files"
                    value={query}
                    onChange={setQuery}
                  />
                  {/* File Type filter chip — the listing toolbar's chip (components/leads/toolbar.module.css); the quote's frame draws it 93 wide (12/600,
                      expand_more 16). (pending modules S05) It narrows to one kind of file — the kinds the library holds — and names the one picked. */}
                  <button ref={typeRef} type="button" className={styles.chip} data-chrome={chrome} data-applied={kindPick ? 'true' : undefined}
                          aria-haspopup="menu" aria-expanded={menu === 'type'} onClick={() => setMenu((m) => (m === 'type' ? null : 'type'))} data-testid="attach-type">
                    <span>{kindPick ? `File Type: ${kindPick}` : 'File Type'}</span>
                    <span className={styles.chipChevron}><Icon name={quoteChrome ? 'expand_more' : 'keyboard_arrow_down'} size={quoteChrome ? 16 : 20} /></span>
                    {kindPick ? <AppliedDot /> : null}
                  </button>
                  <PortalMenu open={menu === 'type'} anchor={typeRef} onClose={() => setMenu(null)} align="left" width={MENU_WIDTH.standard} role="menu" sheetTitle="File type">
                    <DropdownItem role="menuitemradio" checked={!kindPick} onSelect={() => { setKindPick(null); setMenu(null) }}>All types</DropdownItem>
                    {kinds.map((k) => <DropdownItem key={k} role="menuitemradio" checked={kindPick === k} onSelect={() => { setKindPick(k); setMenu(null) }}>{k}</DropdownItem>)}
                  </PortalMenu>
                  <span ref={sortRef} style={{ display: 'inline-flex' }}>
                    <Tooltip label={`Sort · ${SORT_WORDS[order]}`} disabled={menu === 'sort'}>
                      <IconButton icon={quoteChrome ? 'sort' : 'swap_vert'} label={`Sort — ${SORT_WORDS[order]}`} aria-haspopup="menu" aria-expanded={menu === 'sort'} onClick={() => setMenu((m) => (m === 'sort' ? null : 'sort'))} data-testid="attach-sort" />
                    </Tooltip>
                  </span>
                  <PortalMenu open={menu === 'sort'} anchor={sortRef} onClose={() => setMenu(null)} align="right" width={MENU_WIDTH.standard} role="menu" sheetTitle="Sort">
                    {(['newest', 'oldest', 'name'] as const).map((o) => <DropdownItem key={o} role="menuitemradio" checked={order === o} onSelect={() => { setOrder(o); setMenu(null) }}>{SORT_WORDS[o]}</DropdownItem>)}
                  </PortalMenu>
                  <span className={styles.viewToggle}>
                    <SegmentedIconToggle
                      label="View"
                      value={layout}
                      options={quoteChrome
                        ? [{ value: 'list', icon: 'view_list', label: 'List view' }, { value: 'grid', icon: 'grid_view', label: 'Grid view' }]
                        : [{ value: 'grid', icon: 'grid_view', label: 'Grid view' }, { value: 'list', icon: 'view_list', label: 'List view' }]}
                      onChange={(v) => setLayout(v === 'list' ? 'list' : 'grid')}
                    />
                  </span>
                </div>
                {/* (pending modules S05) inside a folder: the house crumb, Back one level */}
                {trail.length ? <FolderCrumbs root="Your files" trail={trail} onGo={openFolder} /> : null}

                {library.length === 0 || (folders.length === 0 && groups.length === 0) ? (
                  /* Empty state (frame 64): illustration 140×120, "No files yet" 20/600, "Uploaded files will appear here." 14/400. (pending modules S05)
                     A library with files that a type, a search or an empty folder leaves nothing of says so instead. */
                  <div className={styles.empty}>
                    <div className={styles.emptyInner}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/figma-assets/empty-files.svg" width={140} height={120} alt="" className={styles.emptyArt} />
                      <div className={styles.emptyText}>
                        <p className={styles.emptyTitle}>{library.length === 0 ? 'No files yet' : 'Nothing here'}</p>
                        <p className={styles.emptyBody}>{library.length === 0 ? 'Uploaded files will appear here.' : query.trim() || kindPick ? 'No files match — clear the search or the file type.' : 'This folder is empty.'}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className={styles.groups} data-view={layout}>
                    {folders.length > 0 ? (
                      /* Folders (frames 56/58): header row + 276-wide folder cards. (pending modules S05) A card opens its folder; the group's own
                         checkbox is gone — a folder isn't attached, its files are (its ⋮ › Select ticks them). */
                      <div className={styles.group}>
                        <div className={styles.groupHead}>
                          <span className={styles.groupTitle}>Folders</span>
                        </div>
                        <div className={styles.row}>
                          {folders.map((f) => {
                            const inIt = filesIn(f.id)
                            const menuOpen = menu === `folder:${f.id}`
                            const picked = inIt.length > 0 && inIt.every((x) => selected.has(x.id))
                            return (
                            /* (pending modules S05) the card opens its folder; its ⋮ opens it or ticks every file inside it (one pick in Add Image: no ⋮) */
                            <div key={f.id} className={styles.folder} data-chrome={chrome} role="button" tabIndex={0} aria-label={`Open folder ${f.name}`} data-testid="attach-folder"
                                 /* a press inside its ⋮ menu (a portal) reaches here through React's tree — only the card's own presses open it */
                                 onClick={(e) => { if (e.currentTarget.contains(e.target as Node)) openFolder(f.id) }}
                                 onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openFolder(f.id) } }}>
                              <Icon name="folder" size={24} className={styles.folderIcon} />
                              {quoteChrome ? (
                                /* The quote's folder card (1238:30353): name 14/600 over "n items" 10/400 — the folder's own count. */
                                <span className={styles.folderText}>
                                  <span className={styles.folderName}>{f.name}</span>
                                  <span className={styles.folderCount}>{(() => { const n = files.filter((x) => x.parentId === f.id && x.kind !== 'folder').length; return `${n} ${n === 1 ? 'item' : 'items'}` })()}</span>
                                </span>
                              ) : <span className={styles.folderName}>{f.name}</span>}
                              {imageMode ? null : (
                                <>
                                  <Tooltip label="Folder actions" disabled={menuOpen}>
                                    <button type="button" className={styles.folderKebab} aria-label={`${f.name} actions`} aria-haspopup="menu" aria-expanded={menuOpen}
                                            onClick={(e) => { e.stopPropagation(); folderMenuRef.current = e.currentTarget; setMenu((m) => (m === `folder:${f.id}` ? null : `folder:${f.id}`)) }}>
                                      <Icon name="more_vert" size={24} weight={300} />
                                    </button>
                                  </Tooltip>
                                  <PortalMenu open={menuOpen} anchor={folderMenuRef} onClose={() => setMenu(null)} align="right" width={MENU_WIDTH.standard} role="menu" sheetTitle={f.name}>
                                    <DropdownItem onSelect={() => openFolder(f.id)}>Open</DropdownItem>
                                    <DropdownItem disabled={!inIt.length} title={!inIt.length ? 'No files in it yet' : undefined}
                                                  onSelect={() => { setMenu(null); toggleGroup(inIt.map((x) => x.id), !picked) }}>
                                      {`${picked ? 'Untick' : 'Tick'} its ${inIt.length === 1 ? 'file' : inIt.length ? `${inIt.length} files` : 'files'}`}
                                    </DropdownItem>
                                  </PortalMenu>
                                </>
                              )}
                            </div>
                            )
                          })}
                        </div>
                      </div>
                    ) : null}

                    {groups.map((g) => {
                      const ids = g.files.map((f) => f.id)
                      const on = ids.filter((id) => selected.has(id)).length
                      return (
                        <div key={g.day} className={styles.group}>
                          <div className={styles.groupHead}>
                            {quoteChrome ? null : (
                              <Checkbox
                                isSelected={on === ids.length}
                                isIndeterminate={on > 0 && on < ids.length}
                                onChange={(next) => toggleGroup(ids, next)}
                                aria-label={`Select all files from ${g.label}`}
                              />
                            )}
                            <span className={styles.groupTitle}>{g.label}</span>
                          </div>
                          <div className={styles.row}>
                            {g.files.map((f) => {
                              const isOn = selected.has(f.id)
                              return (
                                <div key={f.id} className={styles.tile} data-selected={isOn || undefined} data-chrome={chrome} role={quoteChrome ? 'button' : undefined} tabIndex={quoteChrome ? 0 : undefined}
                                     aria-pressed={quoteChrome ? isOn : undefined} aria-label={quoteChrome ? `${isOn ? 'Deselect' : 'Select'} ${f.name}` : undefined}
                                     onClick={() => toggle(f.id)} onKeyDown={quoteChrome ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(f.id) } } : undefined}>
                                  {f.thumb ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={f.thumb} alt="" className={styles.tileImg} />
                                  ) : (
                                    /* No thumbnail (a PDF): the overview file tile's surface-variant box with the kind's glyph. */
                                    <span className={styles.tileBox}><Icon name={f.kind === 'pdf' ? 'picture_as_pdf' : 'image'} size={24} className={styles.tileBoxIcon} /></span>
                                  )}
                                  {quoteChrome ? (
                                    /* The quote's caption (1238:30353): kind glyph 20 red · name 14/600 · kebab Light — the tile itself is the pick. */
                                    <div className={styles.caption}>
                                      <Icon name={f.kind === 'pdf' ? 'picture_as_pdf' : 'image'} size={20} className={styles.kindIcon} />
                                      <span className={styles.tileName}>{f.name}</span>
                                      {/* (pending modules S05) the mock's kebab is gone: the tile itself is the pick, and nothing else belongs to a file here */}
                                    </div>
                                  ) : (
                                    <div className={styles.caption} onClick={(e) => e.stopPropagation()}>
                                      <Checkbox isSelected={isOn} onChange={() => toggle(f.id)} aria-label={`Select ${f.name}`} />
                                      <span className={styles.tileName} onClick={() => toggle(f.id)}>{f.name}</span>
                                      <span className={styles.kind}>
                                        <Icon name={f.kind === 'pdf' ? 'picture_as_pdf' : 'image'} size={12} className={styles.kindIcon} />
                                        {f.kind}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Foot 68 (p16/24, top rule): Cancel (secondary outlined) · Attach n File(s) (primary; "Attach Files" disabled at 0). */}
            <SurfaceFoot shadow={bodyScrolls} className={styles.foot}>
              <Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button>
              <Button isDisabled={count === 0} onPress={() => onAttach(picks)}>{attachLabel}</Button>
            </SurfaceFoot>

            {/* Uploading toast (902:28261): 360×200 bottom-right of the modal (right 16, bottom 76), dark 56px head, 64px rows. */}
            <AnimatePresence>
              {toast ? (
                <motion.div className={styles.toast} data-collapsed={toastCollapsed || undefined} role="status" aria-live="polite"
                            variants={snackbarRise} initial="initial" animate="animate" exit="exit">
                  <div className={styles.toastHead}>
                    <span className={styles.toastTitle}>{toastTitle}</span>
                    <Tooltip label={toastCollapsed ? 'Expand' : 'Collapse'} side="top">
                      <button type="button" className={styles.toastBtn} aria-label={toastCollapsed ? 'Expand' : 'Collapse'} aria-expanded={!toastCollapsed}
                              onClick={() => setToastCollapsed((c) => !c)}>
                        <Icon name={toastCollapsed ? 'keyboard_arrow_up' : 'keyboard_arrow_down'} size={24} />
                      </button>
                    </Tooltip>
                    <Tooltip label="Dismiss" side="top">
                      <button type="button" className={styles.toastBtn} aria-label="Dismiss upload status" onClick={() => setToast(null)}>
                        <Icon name="close" size={24} />
                      </button>
                    </Tooltip>
                  </div>
                  {toastCollapsed ? null : (
                    <div className={styles.toastRows}>
                    {toast.map((row) => (
                    <div key={row.key} className={styles.toastRow} data-state={row.state}>
                      {row.pdf ? (
                        /* A PDF takes the tiles' surface-variant box + glyph at the thumb's 40×40: the mock's photograph
                           beside "Quotation.pdf" drew the same pick two ways at once (the tile below already got it right). */
                        <span className={styles.toastThumb} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--om-color-surface-variant)' }}>
                          <Icon name="picture_as_pdf" size={24} className={styles.tileBoxIcon} />
                        </span>
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={row.thumb ?? '/figma-assets/file-thumb-1.png'} alt="" className={styles.toastThumb} width={40} height={40} />
                      )}
                      <span className={styles.toastFile}>{row.name}</span>
                      {row.state === 'uploading' ? (
                        <>
                          <span className={styles.toastStatus}>Uploading...</span>
                          <span className={`${styles.toastIcon} ${styles.spin}`}><Icon name="progress_activity" size={20} /></span>
                        </>
                      ) : row.state === 'failed' ? (
                        <>
                          <span className={styles.toastFailed}>Failed</span>
                          <Tooltip label="Retry upload" side="top">
                            <button type="button" className={styles.toastRetry} aria-label={`Retry uploading ${row.name}`} disabled={!row.file} onClick={() => retry(row.key)}>
                              <Icon name="refresh" size={20} />
                            </button>
                          </Tooltip>
                        </>
                      ) : (
                        <span className={styles.toastIcon}><Icon name="check_circle" size={20} fill /></span>
                      )}
                    </div>
                    ))}
                    </div>
                  )}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
