'use client'

import { Fragment, useMemo, useRef, useState, type ReactNode } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Button, Checkbox } from '@/components/ds'
import { DetailBulkBar } from '@/components/leads/tasks/detail-bulk-bar'
import { SegmentedIconToggle } from '@/components/om/segmented'
import { ColumnSettingsDrawer } from '@/components/om/column-settings'
import { gridTemplateFor, useColumnLayout, useTableColumns, type TableColumn, type TableColumnDef } from '@/components/om/table-columns'
import { ColumnResizer, useColumnWidths } from '@/components/om/column-resize'
import { useColumnDrag } from '@/components/om/column-drag'
import { useOverflowX } from '@/components/om/use-overflow-x'
import { PortalMenu } from '@/components/om/portal-menu'
import { TabSearchEmpty } from '@/components/leads/tasks/tab-search-empty'
import { MOBILE, useMediaQuery } from '@/lib/breakpoint'
import { useFlagPref } from '@/lib/prefs'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { Avatar } from '@/components/om/avatar'
import { Tooltip } from '@/components/om/tooltip'
import { Dialog } from '@/components/om/dialog'
import { ConfirmDialog } from '@/components/om/confirm-dialog'
import { TextField } from '@/components/om/text-field'
import { ToolbarSearch } from '@/components/om/toolbar-search'
import { useSnackbar } from '@/components/om/snackbar'
import { FolderCard, FolderGroup } from '@/components/om/folders/folder-card'
import { FolderCrumbs } from '@/components/om/folders/folder-crumbs'
import { FolderEmpty } from '@/components/om/folders/folder-empty'
import { MoveDialog } from '@/components/om/folders/move-dialog'
import { NameDialog } from '@/components/leads/files/name-dialog'
import { countLine, folderNameProblem, foldersIn, foldersUnder, liveFolder, trailTo } from '@/lib/folders'
import { ScopePill } from '@/components/om/scope-pill'
import { LIBRARY_ROOT, type Folder, type FolderLibrary, type FolderUndo } from '@/lib/company/folder-libraries'
import { createLibraryFolder, deleteLibraryFolder, moveToLibraryFolder, renameLibraryFolder, undoDeleteLibraryFolder } from '@/app/company/folder-actions'
import { DropdownDivider, DropdownItem } from '@/components/leads/dropdown'
import { useRun } from '@/components/leads/tasks/use-run'
import { CompanyShell, templateTabs } from '@/components/company/company-shell'
import { ago } from '@/lib/templates/ago'
import type { TemplateKind } from '@/lib/company/sections'
import { LibraryDeletedSheet } from './library-deleted-sheet'
import { LibraryKebab, LibraryNewButton } from './library-toolbar-actions'
import gallery from './quote-templates-gallery.module.css'
import table from './templates-table.module.css'
import styles from './library-gallery.module.css'

/* (REG-538) One gallery for the simple libraries — Contracts · Tasks · T&Cs & Notes · Payments — on the Quotes gallery's shell:
   New template ▾ + the page kebab (Deleted Templates) in the header, the segment filter · search · Column settings · grid / list
   toggle toolbar, cards or the listing-model table, rename / delete dialogs, the shared Deleted sheet. Each kind supplies its
   thumb, its facts, its extra kebab rows and its actions. */

export type LibraryItem = { id: string; title: string; createdAt: Date; updatedAt: Date; author: string | null; authorColor: string | null; usedBy: number; deletedAt: Date | null
  /** (REG-664) Its folder in this library (null = the top). */
  folderId?: string | null }
export type LibraryKebabItem = { label: string; onSelect: () => void; tone?: 'danger'; disabled?: boolean; title?: string }
/** (REG-653, price book parity Q-15) A sortable column says what it sorts by; `true` on a *Used by* column sorts by the usage count. */
export type LibraryColumn<T> = TableColumnDef & { cell: (t: T) => ReactNode; sortable?: boolean | ((t: T) => number | string) }
export type LibraryFilter<T> = { key: string; label: string; test: (t: T) => boolean
  /** (REG-666) A to-do, not a kind (Awaiting approval · Proposed): its words for the chip that shows while something waits. */
  attention?: (n: number) => string }
/** (REG-653, Q-15) A filter by one of the entry's values (a category, a vendor): the toolbar's Filters dialog, applied as picked. */
export type LibraryFacet<T> = { key: string; label: string; options: string[]; test: (t: T, value: string) => boolean }
export type LibraryBulkAction = { label: string; onClick: () => void; tone?: 'danger' }

export type LibraryGalleryProps<T extends LibraryItem> = {
  kind: TemplateKind
  items: T[]
  deleted: T[]
  now: number
  ariaLabel: string
  /** The rows of New template ▾ (DropdownItem / DropdownDivider); `close` shuts the menu. */
  newMenu: (close: () => void) => ReactNode
  /** The status filter's choices after "All · n" — (REG-666) one pill, "{filterLabel}: All ▾", scoped to the open folder. */
  filters?: LibraryFilter<T>[]
  /** The pill's word: "Status" · "Kind" (default "Show"). */
  filterLabel?: string
  /** Search beyond the title (the body's words). */
  searchText?: (t: T) => string
  /** The card's picture (inside the 220 thumb band) and the list's 26×36 glyph. */
  thumb: (t: T) => ReactNode
  glyph: (t: T) => ReactNode
  /** The card's second line and the usage line. */
  meta: (t: T) => string
  usage: (t: T) => string
  chips?: (t: T) => ReactNode
  /** The list's columns between Template and Updated. */
  columns: LibraryColumn<T>[]
  tableKey: string
  onOpen: (t: T) => void
  /** (REG-538) Where the gallery was opened from (Manage Templates on a tab or an editor): the shell's Back and crumb. */
  from?: string
  /** Kind-specific rows, placed after Open. */
  kebab?: (t: T) => LibraryKebabItem[]
  onDuplicate: (t: T) => Promise<unknown> | void
  onRename: (t: T, name: string) => Promise<unknown> | void
  /** (REG-646, settings parity Q-07) Why the viewer may not rename or delete this one (its author, an Owner or an Admin may), else null. */
  mayChange?: (t: T) => string | null
  onDelete: (t: T) => Promise<unknown> | void
  deleteMessage: (t: T) => string
  onRestore: (ids: string[]) => Promise<unknown>
  onDeleteForever: (ids: string[]) => Promise<unknown>
  onEmptyTrash: () => Promise<unknown>
  /** Why a deleted row cannot be removed for good (the sheet keeps it). */
  keepReason?: (t: T) => string | null
  /** The sheet's third column: the kind's own fact (kind · steps · split). */
  deletedMeta: { label: string; value: (t: T) => string }
  usageWord: (t: T) => string
  empty: { title: string; help: string }
  children?: ReactNode
  /** (REG-594) Another Company section on the same gallery: its shell (title + tab strip) and what an entry is called. */
  shell?: { title: string; tabs: { label: string; href: string }[] }
  noun?: { one: string; many: string }
  /** The list's first column head (default "Template"). */
  nameLabel?: string
  /** The kebab's row (default "Deleted Templates"). */
  deletedLabel?: string
  /** The New ▾ menu's rows are the caller's; this replaces "Open" as the first kebab row (e.g. "Edit"), per entry when the viewer may only read some. */
  openLabel?: string | ((t: T) => string)
  /** (sweep S5 #23) Why the viewer can make nothing from New ▾, else null — the button waits with the reason. */
  newBlock?: string | null
  /** (REG-652, price book parity Q-03) Why the viewer may not duplicate this one, else null (default: anyone may). */
  duplicateBlock?: (t: T) => string | null
  /** The list's *Updated by* column (default: the template libraries show it, another section asks for it). */
  byColumn?: boolean
  /** (REG-652) The Deleted sheet: why the viewer may not restore this one, and why they may not delete for good. */
  restoreBlock?: (t: T) => string | null
  purgeBlock?: string | null
  /** (REG-653, price book parity Q-14 · Q-15) Filters by value; the page kebab's own rows (they receive what the list shows); and the
      list's selection with its bulk bar — its actions for the ticked ids (`clear` empties the selection). */
  facets?: LibraryFacet<T>[]
  pageMenu?: (shown: T[]) => LibraryKebabItem[]
  bulk?: (ids: string[], clear: () => void) => LibraryBulkAction[]
  /** (REG-664, owner 2026-09-25) The library's folders — the Files tab's way: New Folder, folder cards first, the crumb, Move to Folder on
      every entry and in the bulk bar. `block` = why this viewer may not make, rename, move or delete folders (an Owner or an Admin may). */
  folders?: { library: FolderLibrary; list: Folder[]; block: string | null }
  /** (REG-664) The card's whole foot line, in place of "usage · edited … by …" (Quotes: the "Used by n quotes" link · paper). */
  foot?: (t: T) => ReactNode
  /** (REG-664) Why Delete is off for this one beyond `mayChange` (Quotes: the default · awaiting approval). */
  deleteBlock?: (t: T) => string | null
  /** (REG-664) The Deleted sheet's person and usage heads (default "Made by" · "Used by"). */
  deletedByLabel?: string
  deletedUsageLabel?: string
}

export function LibraryGallery<T extends LibraryItem>(p: LibraryGalleryProps<T>) {
  const { items, deleted, now, kind } = p
  const noun = p.noun ?? { one: 'template', many: 'templates' }
  const Noun = noun.one.charAt(0).toUpperCase() + noun.one.slice(1)
  const { run } = useRun()
  const snackbar = useSnackbar()
  const phone = useMediaQuery(MOBILE)
  const [query, setQuery] = useState('')
  /* (REG-664) Folders: the open one lives in the URL (?folder=, as the Files tab's does), so Back and a shared link land there. */
  const F = p.folders
  const router = useRouter(); const pathname = usePathname(); const params = useSearchParams()
  const flist = useMemo(() => F?.list ?? [], [F])
  const openFolderRow = F ? liveFolder(flist, params.get('folder')) : null
  const openId = openFolderRow?.id ?? null
  const trail = useMemo(() => trailTo(flist, openId), [flist, openId])
  const root = F ? LIBRARY_ROOT[F.library] : ''
  const placeIdOf = (t: T) => (t.folderId && flist.some((f) => f.id === t.folderId) ? t.folderId : null)
  const [filter, setFilter] = useState('all')
  const [listPref, setListPref] = useFlagPref(`om.${p.tableKey}.list`, false)
  const view: 'grid' | 'list' = phone || !listPref ? 'grid' : 'list'
  const [newOpen, setNewOpen] = useState(false)
  const [statusOpen, setStatusOpen] = useState(false)
  const statusAnchor = useRef<HTMLButtonElement | null>(null)
  const [kebabOpen, setKebabOpen] = useState(false)
  /* (sweep S5 #2) One menu for a card or a row, through the body portal (PortalMenu flips on the viewport): an in-cell menu was clipped by
     the list's scroller and a short list's opened upward past the card. The anchor is the kebab that was pressed. */
  const [menuFor, setMenuFor] = useState<string | null>(null)
  const menuAnchor = useRef<HTMLElement | null>(null)
  const openMenu = (t: T, el: HTMLElement) => { menuAnchor.current = el; setMenuFor((m) => (m === t.id ? null : t.id)) }
  const [rename, setRename] = useState<{ id: string; name: string } | null>(null)
  const [del, setDel] = useState<T | null>(null)
  const [deletedOpen, setDeletedOpen] = useState(false)
  const [columnsOpen, setColumnsOpen] = useState(false)
  const byColumn = p.byColumn ?? !p.shell
  const defs = useMemo<readonly TableColumnDef[]>(() => [{ key: 'name', label: p.nameLabel ?? 'Template', track: 'minmax(318px, 1fr)', locked: true }, ...p.columns.map(({ key, label, track, hidden }) => ({ key, label, track, hidden })), { key: 'updated', label: 'Updated', track: '132px' }, ...(byColumn ? [{ key: 'by', label: 'Updated by', track: '200px' }] : [])], [p.columns, p.nameLabel, byColumn])
  const columnPrefs = useTableColumns(p.tableKey, defs, phone)
  /* (REG-653, Q-15) Facet filters narrow the book first; the segments count what is left; search and the sort follow. */
  const [facet, setFacet] = useState<Record<string, string>>({})
  const [facetsOpen, setFacetsOpen] = useState(false)
  const activeFacets = (p.facets ?? []).filter((f) => facet[f.key] && f.options.includes(facet[f.key]!))
  /* (REG-666, owner 2026-09-25: "filter where you are") Everything narrows the open folder and what is inside it — at the top, the whole
     library: the status pill and its counts, the search, the Filters dialog. Nothing jumps out of the folder you are in. */
  const scopeIds = useMemo(() => (openId ? new Set([openId, ...foldersUnder(flist, openId)]) : null), [flist, openId])
  const scoped = useMemo(() => (scopeIds ? items.filter((t) => { const f = placeIdOf(t); return !!f && scopeIds.has(f) }) : items), [items, scopeIds])   // eslint-disable-line react-hooks/exhaustive-deps
  const faceted = useMemo(() => (activeFacets.length ? scoped.filter((t) => activeFacets.every((f) => f.test(t, facet[f.key]!))) : scoped), [scoped, activeFacets, facet])
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null)
  const sortValue = (key: string): ((t: T) => number | string) | null => {
    if (key === 'updated') return (t) => t.updatedAt.getTime()
    if (key === 'name') return (t) => t.title.toLowerCase()
    const c = p.columns.find((x) => x.key === key)
    if (typeof c?.sortable === 'function') return c.sortable
    if (c?.sortable === true && key === 'used') return (t) => t.usedBy
    return null
  }
  const counts = useMemo(() => Object.fromEntries((p.filters ?? []).map((f) => [f.key, faceted.filter(f.test).length])), [faceted, p.filters])
  /* (sweep S5 #4) A segment that has gone (the last proposal answered) leaves the list on All, never on a filter nobody can see. */
  const activeFilter = filter !== 'all' && (p.filters ?? []).some((f) => f.key === filter) ? filter : 'all'
  const shown = useMemo(() => {
    const f = (p.filters ?? []).find((x) => x.key === activeFilter)
    const base = f ? faceted.filter(f.test) : faceted
    const q = query.trim().toLowerCase()
    const found = q ? base.filter((t) => t.title.toLowerCase().includes(q) || (p.searchText?.(t).toLowerCase().includes(q) ?? false)) : base
    const by = sort ? sortValue(sort.key) : null
    return by && sort ? [...found].sort((a, b) => { const x = by(a), y = by(b); return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y))) * sort.dir }) : found
  }, [faceted, activeFilter, query, p, sort])   // eslint-disable-line react-hooks/exhaustive-deps
  const onSort = (key: string) => setSort((s) => (!s || s.key !== key ? { key, dir: 1 } : s.dir === 1 ? { key, dir: -1 } : null))
  /* (REG-664) Browse or find: with no search, segment or filter the page is the open folder — its folders, then what it holds; any of
     them finds across every folder, each result saying where it lives. The segments count the whole library either way. */
  const finding = query.trim() !== '' || activeFilter !== 'all' || activeFacets.length > 0
  const browsing = !!F && !finding
  const listed = useMemo(() => (browsing ? shown.filter((t) => placeIdOf(t) === openId) : shown), [browsing, shown, openId, flist])   // eslint-disable-line react-hooks/exhaustive-deps
  const shownFolders = useMemo(() => (browsing ? foldersIn(flist, openId) : []), [browsing, flist, openId])
  const folderCount = (f: Folder) => {
    const n = items.filter((t) => placeIdOf(t) === f.id).length
    const subs = foldersIn(flist, f.id).length
    return [n || !subs ? countLine(n, noun.one, noun.many) : null, subs ? countLine(subs, 'folder', 'folders') : null].filter(Boolean).join(' · ')
  }
  /** Where a found entry lives, from where you stand: "BTO" inside HDB; nothing when it sits right here. */
  const placeText = (t: T) => { const at = placeIdOf(t); if (at === openId) return ''; return trailTo(flist, at).slice(trail.length).map((f) => f.name).join(' / ') }
  /* A folder or a crumb: the search and the status stay applied — they now look where you went (and "Search all of …" widens a search). */
  const go = (id: string | null) => {
    setSelected(new Set())
    const q = new URLSearchParams(params.toString())
    if (id) q.set('folder', id); else q.delete('folder')
    const qs = q.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }
  /* (REG-653, Q-15) The list's selection: what is ticked among what the list shows — (REG-664) its folders too, so Move to Folder works
     on many at once. */
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const liveSelected = useMemo(() => new Set([...listed.filter((t) => selected.has(t.id)).map((t) => t.id), ...shownFolders.filter((f) => selected.has(f.id)).map((f) => f.id)]), [listed, shownFolders, selected])
  const clearSelection = () => setSelected(new Set())
  /* Selection is for the library's own bulk actions, or for someone who runs the folders; anyone else files what they may one at a time
     from its menu — a Designer's list keeps no ticks (REG-654), not a row of boxes most of which Move to Folder would refuse. */
  const selectable = !!p.bulk || (!!F && !F.block)
  const isFolderId = (id: string) => flist.some((f) => f.id === id)

  const openLabel = (t: T) => (typeof p.openLabel === 'function' ? p.openLabel(t) : p.openLabel ?? 'Open')
  const rows = (t: T): LibraryKebabItem[] => [{ label: openLabel(t), onSelect: () => p.onOpen(t) }, ...(p.kebab?.(t) ?? [])]
  const pageRows = p.pageMenu?.(shown) ?? []
  const menuItem = menuFor ? listed.find((t) => t.id === menuFor) ?? null : null
  const delBlock = (t: T) => p.mayChange?.(t) ?? p.deleteBlock?.(t) ?? null
  const closeMenu = () => setMenuFor(null)
  const menuRows = (t: T) => (
    <>
      {rows(t).map((it) => <DropdownItem key={it.label} onSelect={() => { closeMenu(); it.onSelect() }} disabled={it.disabled} title={it.title}>{it.label}</DropdownItem>)}
      <DropdownDivider />
      <DropdownItem onSelect={() => { closeMenu(); void run(`duplicate the ${noun.one}`, async () => { await p.onDuplicate(t) }) }} disabled={!!p.duplicateBlock?.(t)} title={p.duplicateBlock?.(t) ?? undefined}>Duplicate</DropdownItem>
      {F ? <DropdownItem onSelect={() => { closeMenu(); openMove([t.id], []) }} disabled={!!p.mayChange?.(t)} title={p.mayChange?.(t) ?? undefined}>Move to Folder</DropdownItem> : null}
      <DropdownItem onSelect={() => { closeMenu(); setRename({ id: t.id, name: t.title }) }} disabled={!!p.mayChange?.(t)} title={p.mayChange?.(t) ?? undefined}>Rename</DropdownItem>
      <DropdownDivider />
      <DropdownItem tone="danger" onSelect={() => { closeMenu(); setDel(t) }} disabled={!!delBlock(t)} title={delBlock(t) ?? undefined}>Delete</DropdownItem>
    </>
  )
  const toggleOne = (id: string) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const clearAll = () => { setQuery(''); setFacet({}); setFilter('all') }
  const doRename = () => { const r = rename; if (!r || !r.name.trim()) return; const t = items.find((x) => x.id === r.id); setRename(null); if (t) void run(`rename the ${noun.one}`, async () => { await p.onRename(t, r.name.trim()) }, `${Noun} renamed`) }

  /* ── (REG-664) folders ── */
  const [folderMenu, setFolderMenu] = useState<string | null>(null)
  const folderAnchor = useRef<HTMLElement | null>(null)
  const menuFolder = folderMenu ? flist.find((f) => f.id === folderMenu) ?? null : null
  const openFolderMenu = (f: Folder, el: HTMLElement) => { folderAnchor.current = el; setFolderMenu((m) => (m === f.id ? null : f.id)) }
  const [naming, setNaming] = useState<{ open: boolean; folder: Folder | null }>({ open: false, folder: null })
  const [move, setMove] = useState<{ open: boolean; entries: string[]; folders: string[] }>({ open: false, entries: [], folders: [] })
  const openMove = (entries: string[], folders: string[]) => setMove({ open: true, entries, folders })
  const [folderDel, setFolderDel] = useState<{ open: boolean; folder: Folder | null }>({ open: false, folder: null })
  const [bulkDel, setBulkDel] = useState<{ open: boolean; entries: string[]; folders: string[] }>({ open: false, entries: [], folders: [] })
  const folderName = (id: string | null) => (id ? flist.find((f) => f.id === id)?.name ?? root : root)
  const saveFolderName = (name: string) => {
    const f = naming.folder; setNaming((n) => ({ ...n, open: false })); if (!F) return
    if (f) void run('rename the folder', () => renameLibraryFolder(f.id, name), 'Folder renamed')
    else void run('create the folder', () => createLibraryFolder(F.library, name, openId), 'Folder created')
  }
  const doMove = async (target: string | null) => {
    const pick = { entries: move.entries, folders: move.folders }; setMove((m) => ({ ...m, open: false })); if (!F) return
    let r = { moved: 0, kept: 0 }
    const ok = await run('move', async () => { r = await moveToLibraryFolder(F.library, pick, target) })
    if (!ok) return
    clearSelection()
    const dest = folderName(target)
    snackbar({ message: r.kept ? (r.moved ? `Moved ${r.moved} to ${dest} — ${r.kept} you may not move stayed` : `Nothing moved — you may not move ${r.kept === 1 ? 'it' : 'these'}`) : `Moved to ${dest}` })
  }
  const doDeleteFolder = async () => {
    const f = folderDel.folder; setFolderDel((d) => ({ ...d, open: false })); if (!f) return
    let undo: FolderUndo | null = null
    const leaving = trail.some((x) => x.id === f.id)
    const ok = await run('delete the folder', async () => { undo = await deleteLibraryFolder(f.id) })
    if (!ok) return
    if (leaving) go(f.parentId ?? null)
    const u = undo as FolderUndo | null
    snackbar({ message: `${f.name} deleted`, actionLabel: 'Undo', onAction: () => { if (u) void run('restore the folder', () => undoDeleteLibraryFolder(u), `${f.name} restored`) } })
  }
  const doBulkDelete = async () => {
    const pick = bulkDel; setBulkDel((b) => ({ ...b, open: false }))
    const entries = pick.entries.map((id) => items.find((t) => t.id === id)).filter((t): t is T => !!t && !delBlock(t))
    const folders = F && !F.block ? pick.folders : []
    const undos: FolderUndo[] = []
    const ok = await run(`delete the ${noun.many}`, async () => {
      for (const t of entries) await p.onDelete(t)
      for (const id of folders) undos.push(await deleteLibraryFolder(id))
    })
    if (!ok) return
    clearSelection()
    const n = entries.length + folders.length
    snackbar({ message: `${n} deleted`, actionLabel: 'Undo', onAction: () => { void run('restore', async () => { if (entries.length) await p.onRestore(entries.map((t) => t.id)); for (const u of undos) await undoDeleteLibraryFolder(u) }, `${n} restored`) } })
  }
  const bulkEntries = [...liveSelected].filter((id) => !isFolderId(id))
  const bulkFolders = [...liveSelected].filter(isFolderId)
  const bulkActions: LibraryBulkAction[] = F
    ? [
        { label: 'Move to Folder', onClick: () => openMove(bulkEntries, bulkFolders) },
        ...(p.bulk && bulkFolders.length === 0 ? p.bulk(bulkEntries, clearSelection) : [{ label: 'Delete', tone: 'danger' as const, onClick: () => setBulkDel({ open: true, entries: bulkEntries, folders: bulkFolders }) }]),
      ]
    : p.bulk?.([...liveSelected], clearSelection) ?? []
  const moveTitle = (() => {
    const one = move.entries.length + move.folders.length === 1
    if (!one) return `Move ${move.entries.length + move.folders.length} items`
    const name = move.entries[0] ? items.find((t) => t.id === move.entries[0])?.title : flist.find((f) => f.id === move.folders[0])?.name
    return `Move “${name ?? ''}”`
  })()
  const moveFrom = (() => {
    const places = [...move.entries.map((id) => { const t = items.find((x) => x.id === id); return t ? placeIdOf(t) : null }), ...move.folders.map((id) => flist.find((f) => f.id === id)?.parentId ?? null)]
    return places.length && places.every((x) => x === places[0]) ? places[0] ?? null : null
  })()
  const bulkDelMessage = (() => {
    const e = bulkDel.entries.map((id) => items.find((t) => t.id === id)).filter((t): t is T => !!t)
    const okE = e.filter((t) => !delBlock(t)).length, keptE = e.length - okE
    const nF = bulkDel.folders.length
    return [okE ? `${countLine(okE, noun.one, noun.many)} go to ${p.deletedLabel ?? 'Deleted Templates'} — you can restore them there.` : null,
      nF ? `${countLine(nF, 'folder', 'folders')} ${nF === 1 ? 'goes' : 'go'}; what ${nF === 1 ? 'it holds' : 'they hold'} moves up a level.` : null,
      keptE ? `${keptE} you may not delete ${keptE === 1 ? 'stays' : 'stay'}.` : null].filter(Boolean).join(' ')
  })()

  return (
    <CompanyShell title={p.shell?.title ?? 'Templates'} tabs={p.shell?.tabs ?? templateTabs()} from={p.from}>
      <div className={`${gallery.toolbar} ${styles.bar}`}>
        {/* (REG-666) Where you are takes the bar's left — the Files tab's toolbar: the library's name at the top, the crumb inside a
            folder (the whole way as links, Back up one level, the folder's own menu). */}
        <div className={styles.where}>
          {F && openFolderRow ? (
            <FolderCrumbs root={root} trail={trail} onGo={go} menuOpen={folderMenu === openFolderRow.id} onMenu={(el) => openFolderMenu(openFolderRow, el)} />
          ) : <h2 className={styles.here}>{F ? root : `${faceted.length} ${faceted.length === 1 ? noun.one : noun.many}`}</h2>}
        </div>
        <div className={`${gallery.toolbarEnd} ${styles.end}`}>
          {/* (REG-666) A to-do shows only while something here waits for it; a press narrows the list to it. */}
          {(p.filters ?? []).filter((f) => f.attention && (counts[f.key] ?? 0) > 0).map((f) => (
            <ScopePill key={f.key} tone="attention" icon="approval" menu={false} label={f.attention!(counts[f.key] ?? 0)} short={String(counts[f.key] ?? 0)} selected={activeFilter === f.key}
                       onClick={() => setFilter(activeFilter === f.key ? 'all' : f.key)} />
          ))}
          {p.filters?.length ? (
            <>
              <ScopePill ref={statusAnchor} label={`${p.filterLabel ?? 'Show'}: ${activeFilter === 'all' ? 'All' : (p.filters ?? []).find((f) => f.key === activeFilter)?.label ?? 'All'}`}
                         short={activeFilter === 'all' ? 'All' : (p.filters ?? []).find((f) => f.key === activeFilter)?.label ?? 'All'}
                         open={statusOpen} scoped={activeFilter !== 'all'} onClick={() => setStatusOpen((o) => !o)} />
              <PortalMenu open={statusOpen} anchor={statusAnchor} onClose={() => setStatusOpen(false)} align="left" width={240} role="menu" sheetTitle={p.filterLabel ?? 'Show'}>
                <DropdownItem role="menuitemradio" checked={activeFilter === 'all'} onSelect={() => { setStatusOpen(false); setFilter('all') }}>All · {faceted.length}</DropdownItem>
                {(p.filters ?? []).map((f) => (
                  <DropdownItem key={f.key} role="menuitemradio" checked={activeFilter === f.key} onSelect={() => { setStatusOpen(false); setFilter(f.key) }}>{f.label} · {counts[f.key] ?? 0}</DropdownItem>
                ))}
              </PortalMenu>
            </>
          ) : null}
          {/* (REG-541) The tab's own New ▾ leads the cluster; its kebab (Deleted Templates) closes it — the tab toolbars' order. */}
          {F ? (
            /* (REG-664) New Folder, as the Files tab's toolbar has it — in the open folder. */
            <Tooltip label={F.block ?? 'New Folder'}>
              <span className={styles.newFolder}><IconButton icon="create_new_folder" label="New Folder" disabled={!!F.block} onClick={() => setNaming({ open: true, folder: null })} /></span>
            </Tooltip>
          ) : null}
          <LibraryNewButton open={newOpen} onOpenChange={setNewOpen} block={p.newBlock ?? null}>{p.newMenu(() => setNewOpen(false))}</LibraryNewButton>
          <ToolbarSearch query={query} onQuery={setQuery} placeholder={openFolderRow ? `Search ${openFolderRow.name}` : `Search ${noun.many}`} label={`Search ${noun.many}`} />
          {/* (sweep S5 #15) the listing's Filters: the count rides the button as a badge (REG-69 · REG-295) */}
          {p.facets?.length ? <span className={styles.filterWrap}><Tooltip label="Filters"><IconButton icon="filter_list" label={activeFacets.length ? `Filters (${activeFacets.length} active)` : 'Filters'} onClick={() => setFacetsOpen(true)} selected={activeFacets.length > 0} /></Tooltip>{activeFacets.length ? <span className={styles.filterBadge} aria-hidden>{activeFacets.length}</span> : null}</span> : null}
          {view === 'list' ? <Tooltip label="Column settings"><IconButton icon="tune" label="Column settings" onClick={() => setColumnsOpen(true)} /></Tooltip> : null}
          <span className={gallery.viewToggle}>
            <SegmentedIconToggle label="View" value={view} options={[{ value: 'list', icon: 'view_list', label: 'List view' }, { value: 'grid', icon: 'view_kanban', label: 'Grid view' }]} onChange={(v) => setListPref(v === 'list')} />
          </span>
          <LibraryKebab open={kebabOpen} onOpenChange={setKebabOpen} deletedCount={deleted.length} onDeleted={() => setDeletedOpen(true)} label={p.deletedLabel} sheetTitle={p.shell?.title}>
            {pageRows.length ? pageRows.map((it) => <DropdownItem key={it.label} onSelect={() => { setKebabOpen(false); it.onSelect() }} disabled={it.disabled} title={it.title}>{it.label}</DropdownItem>) : null}
          </LibraryKebab>
        </div>
      </div>

      {shown.length === 0 && (query.trim() || activeFacets.length) ? (
        /* (sweep S5 #16) a search or a filter with nothing to show: the house empty state, with the way back */
        <TabSearchEmpty noun={noun.many} searching={query.trim() !== ''} onClearAll={clearAll}
                        widen={openFolderRow && query.trim() ? { label: `Search all of ${root}`, onPress: () => go(null) } : undefined} />
      ) : browsing && openFolderRow && listed.length === 0 && shownFolders.length === 0 ? (
        /* (REG-664) An open folder with nothing inside says so. */
        <FolderEmpty help={`Move ${noun.many} here from their ⋯ menu, or make a folder inside it with New Folder.`} />
      ) : listed.length === 0 && shownFolders.length === 0 ? (
        <div className={gallery.empty} role="status">
          <span className={gallery.emptyGlyph}><Icon name={kind.icon} size={40} weight={300} /></span>
          <span className={gallery.emptyTitle}>{activeFilter !== 'all' ? `Nothing under ${(p.filters ?? []).find((f) => f.key === activeFilter)?.label ?? activeFilter}` : p.empty.title}</span>
          <span className={gallery.emptyHelp}>{p.empty.help}</span>
        </div>
      ) : view === 'list' ? (
        <LibraryTable rows={listed} now={now} tableKey={p.tableKey} columns={columnPrefs.columns} extra={p.columns} onReorder={columnPrefs.reorder} glyph={p.glyph} chips={p.chips} onOpen={p.onOpen} menuFor={menuFor} onMenu={openMenu} ariaLabel={p.ariaLabel}
                      sort={sort} sortable={(k) => sortValue(k) !== null} onSort={onSort} openLabel={openLabel}
                      place={F && finding ? placeText : undefined}
                      folders={shownFolders} folderCount={folderCount} onOpenFolder={(f) => go(f.id)} folderMenuFor={folderMenu} onFolderMenu={openFolderMenu}
                      selection={selectable ? { selected: liveSelected, toggle: toggleOne, all: (on) => setSelected(on ? new Set([...listed.map((t) => t.id), ...shownFolders.map((f) => f.id)]) : new Set()) } : undefined} />
      ) : (
        <div className={styles.gridStack}>
          {shownFolders.length ? (
            <FolderGroup ids={shownFolders.map((f) => f.id)} selected={liveSelected} onSelect={selectable ? (next) => setSelected(next) : undefined} min={248}>
              {shownFolders.map((f) => (
                <FolderCard key={f.id} name={f.name} count={folderCount(f)} selected={liveSelected.has(f.id)} onToggle={selectable ? () => toggleOne(f.id) : undefined}
                            onOpen={() => go(f.id)} menuOpen={folderMenu === f.id} onMenu={(el) => openFolderMenu(f, el)} />
              ))}
            </FolderGroup>
          ) : null}
          {listed.length ? (
            <div className={gallery.grid} role="list" aria-label={p.ariaLabel}>
              {listed.map((t) => (
                <div key={t.id} className={gallery.card} role="listitem" data-testid="library-card" data-selected={liveSelected.has(t.id) || undefined} data-selectable={selectable || undefined}>
                  {/* (sweep S5 #7) the selection rides the card too — the bulk bar was list-only, so a phone (always the grid) could never use it */}
                  {selectable ? <span className={styles.cardSel}><Checkbox isSelected={liveSelected.has(t.id)} onChange={() => toggleOne(t.id)} aria-label={`Select ${t.title}`} /></span> : null}
                  <button type="button" className={gallery.open} onClick={() => p.onOpen(t)} aria-label={`${openLabel(t)} ${t.title}`}>   {/* (REG-653, Q-18) the card's words are the menu's */}
                    <span className={gallery.thumb}>{p.thumb(t)}</span>
                    <span className={gallery.body}>
                      <span className={gallery.nameRow}><span className={gallery.name}>{t.title}</span>{p.chips?.(t)}</span>
                      {/* (REG-664) While finding, where it lives leads the second line — the folder's name as it was typed. */}
                      <span className={gallery.meta}>{F && finding && placeText(t) ? <><span className={styles.place}><Icon name="folder" size={14} weight={300} />{placeText(t)}</span>{' · '}</> : null}{p.meta(t)}</span>
                    </span>
                  </button>
                  <span className={gallery.usage}>{p.foot ? p.foot(t) : <>{p.usage(t)} · edited {ago(t.updatedAt.getTime(), now)}{t.author ? ` by ${t.author}` : ''}</>}</span>
                  <span className={gallery.kebab}>
                    <Tooltip label="More options" disabled={menuFor === t.id}>
                      <IconButton icon="more_vert" label={`More options for ${t.title}`} size={24} variant="bare" iconSize={24} iconWeight={300} aria-haspopup="menu" aria-expanded={menuFor === t.id}
                                  onClick={(e) => openMenu(t, e.currentTarget)} />
                    </Tooltip>
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}

      <PortalMenu open={!!menuItem} anchor={menuAnchor} onClose={closeMenu} align="right" width={264} role="menu" sheetTitle={menuItem?.title ?? ''}>
        {menuItem ? menuRows(menuItem) : null}
      </PortalMenu>
      {F ? (
        <>
          {/* (REG-664) A folder's menu — the Files tab's (931:40130): Open · Move · Rename · Delete. */}
          <PortalMenu open={!!menuFolder} anchor={folderAnchor} onClose={() => setFolderMenu(null)} align="right" width={224} role="menu" sheetTitle={menuFolder?.name ?? ''}>
            {menuFolder ? (
              <>
                <DropdownItem onSelect={() => { setFolderMenu(null); go(menuFolder.id) }}>Open</DropdownItem>
                <DropdownItem onSelect={() => { setFolderMenu(null); openMove([], [menuFolder.id]) }} disabled={!!F.block} title={F.block ?? undefined}>Move</DropdownItem>
                <DropdownItem onSelect={() => { setFolderMenu(null); setNaming({ open: true, folder: menuFolder }) }} disabled={!!F.block} title={F.block ?? undefined}>Rename</DropdownItem>
                <DropdownDivider />
                <DropdownItem tone="danger" onSelect={() => { setFolderMenu(null); setFolderDel({ open: true, folder: menuFolder }) }} disabled={!!F.block} title={F.block ?? undefined}>Delete</DropdownItem>
              </>
            ) : null}
          </PortalMenu>
          <NameDialog open={naming.open} title={naming.folder ? 'Rename Folder' : 'Create Folder'} initial={naming.folder?.name ?? ''}
                      validate={(name) => folderNameProblem(name, foldersIn(flist, naming.folder ? naming.folder.parentId : openId), naming.folder?.id ?? null)}
                      onSave={saveFolderName} onClose={() => setNaming((n) => ({ ...n, open: false }))} />
          <MoveDialog open={move.open} title={moveTitle} root={root} folders={flist} moving={[...move.entries, ...move.folders]} current={moveFrom}
                      entries={items.map((t) => ({ id: t.id, name: t.title, parentId: placeIdOf(t) }))}
                      onMove={(target) => { void doMove(target) }} onClose={() => setMove((m) => ({ ...m, open: false }))}
                      onCreateFolder={F.block ? undefined : async (name, parentId) => { const id = await createLibraryFolder(F.library, name, parentId); snackbar({ message: 'Folder created' }); return id }} />
          <ConfirmDialog open={folderDel.open} title={`Delete “${folderDel.folder?.name ?? 'folder'}”?`} confirmLabel="Delete"
                         message={(() => { const f = folderDel.folder; if (!f) return ''; const c = folderCount(f); const holds = items.some((t) => placeIdOf(t) === f.id) || foldersIn(flist, f.id).length > 0
                           return holds ? `The ${c} inside move up to ${folderName(f.parentId)}. Nothing in it is deleted.` : 'It’s empty. You can undo this straight after.' })()}
                         onCancel={() => setFolderDel((d) => ({ ...d, open: false }))} onConfirm={() => { void doDeleteFolder() }} />
          <ConfirmDialog open={bulkDel.open} title={`Delete ${bulkDel.entries.length + bulkDel.folders.length} ${bulkDel.folders.length ? 'items' : noun.many}?`} confirmLabel="Delete"
                         message={bulkDelMessage} onCancel={() => setBulkDel((b) => ({ ...b, open: false }))} onConfirm={() => { void doBulkDelete() }} />
        </>
      ) : null}
      <Dialog open={!!rename} onClose={() => setRename(null)} title={`Rename ${noun.one}`} size="form" width={400}
              footer={<><Button variant="secondary" appearance="outlined" onPress={() => setRename(null)}>Cancel</Button><Button isDisabled={!rename?.name.trim()} onPress={doRename}>Rename</Button></>}>
        <TextField label={`${Noun} name`} required value={rename?.name ?? ''} autoFocus onChange={(v) => setRename((r) => (r ? { ...r, name: v } : r))} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); doRename() } }} />
      </Dialog>
      <ConfirmDialog open={!!del} title={`Delete ${del?.title ?? noun.one}?`} confirmLabel="Delete" message={del ? p.deleteMessage(del) : ''}
                     onCancel={() => setDel(null)} onConfirm={() => { const t = del; setDel(null); if (t) void run(`delete the ${noun.one}`, async () => { await p.onDelete(t) }, { message: `${t.title} deleted`, actionLabel: 'Undo', onAction: () => { void run(`restore the ${noun.one}`, () => p.onRestore([t.id]), `${t.title} restored`) } }) }} />
      {selectable ? <DetailBulkBar count={liveSelected.size} actions={bulkActions} onClear={clearSelection} /> : null}
      {p.facets?.length ? (
        <Dialog open={facetsOpen} onClose={() => setFacetsOpen(false)} title="Filters" size="form" width={400}
                footer={<><Button variant="secondary" appearance="outlined" isDisabled={!activeFacets.length} onPress={() => setFacet({})}>Clear All</Button><Button onPress={() => setFacetsOpen(false)}>Done</Button></>}>
          <div className={styles.facets} data-testid="library-facets">
            {p.facets.map((f) => (
              <TextField key={f.key} label={f.label} mode="select" options={[`Any ${f.label.toLowerCase()}`, ...f.options]} value={facet[f.key] && f.options.includes(facet[f.key]!) ? facet[f.key]! : `Any ${f.label.toLowerCase()}`}
                         onChange={(v) => setFacet((x) => ({ ...x, [f.key]: f.options.includes(v) ? v : '' }))} helper={f.options.length ? undefined : `No ${f.label.toLowerCase()} on any ${noun.one} yet`} />
            ))}
            <span className={styles.count}>{shown.length} {shown.length === 1 ? noun.one : noun.many} shown</span>
          </div>
        </Dialog>
      ) : null}
      <ColumnSettingsDrawer open={columnsOpen} onClose={() => setColumnsOpen(false)} pinning={{ max: 3 }} columns={columnPrefs.all} onSave={columnPrefs.save} onReset={columnPrefs.reset} />
      <LibraryDeletedSheet open={deletedOpen} onClose={() => setDeletedOpen(false)} rows={deleted} crumb={`${p.shell?.title ?? 'Templates'} / ${kind.label}`} ariaLabel={p.shell ? `Deleted ${kind.label.toLowerCase()}` : `Deleted ${kind.label.toLowerCase()} templates`}
                           title={p.deletedLabel} noun={p.noun} nameLabel={p.nameLabel} restoreBlock={p.restoreBlock} purgeBlock={p.purgeBlock} byLabel={p.deletedByLabel} usageLabel={p.deletedUsageLabel}
                           glyph={p.glyph} meta={p.deletedMeta} usage={p.usageWord} keepReason={p.keepReason}
                           onRestore={(ids) => run(ids.length === 1 ? `restore the ${noun.one}` : `restore the ${noun.many}`, () => p.onRestore(ids), ids.length === 1 ? `${deleted.find((t) => t.id === ids[0])?.title ?? Noun} restored` : `${ids.length} ${noun.many} restored`)}   /* (sweep S5 #34) the failure names the object */
                           onDeleteForever={(ids) => run(ids.length === 1 ? `delete the ${noun.one} forever` : `delete the ${noun.many} forever`, () => p.onDeleteForever(ids), ids.length === 1 ? `${deleted.find((t) => t.id === ids[0])?.title ?? Noun} deleted forever` : `${ids.length} ${noun.many} deleted forever`)}
                           onEmptyTrash={() => run('empty the trash', () => p.onEmptyTrash(), 'Trash emptied')} />
      {p.children}
    </CompanyShell>
  )
}

/** The list view (REG-537 / REG-538): the quote templates list's stylesheet on the listing's table model — head 56, rows 60, frozen Template, resizable, draggable, the row kebab on hover with its side measured.
    (REG-653, price book parity Q-15) Sortable heads sort (↑ · ↓ · off); a list with bulk actions carries its selection in the frozen name cell — the listing's box (REG-614). */
function LibraryTable<T extends LibraryItem>({ rows, now, tableKey, columns, extra, onReorder, glyph, chips, onOpen, menuFor, onMenu, ariaLabel, sort, sortable, onSort, openLabel, selection, place, folders = [], folderCount, onOpenFolder, folderMenuFor = null, onFolderMenu }: {
  rows: T[]; now: number; tableKey: string; columns: readonly TableColumn[]; extra: LibraryColumn<T>[]; onReorder: (keys: string[]) => void
  glyph: (t: T) => ReactNode; chips?: (t: T) => ReactNode; onOpen: (t: T) => void
  menuFor: string | null; onMenu: (t: T, el: HTMLElement) => void; ariaLabel: string
  sort: { key: string; dir: 1 | -1 } | null; sortable: (key: string) => boolean; onSort: (key: string) => void; openLabel: (t: T) => string
  selection?: { selected: Set<string>; toggle: (id: string) => void; all: (on: boolean) => void }
  /** (REG-664) While finding: where each entry lives. */
  place?: (t: T) => string
  /** (REG-664) The open folder's folders, listed first — the Files tab's list order. */
  folders?: Folder[]; folderCount?: (f: Folder) => string; onOpenFolder?: (f: Folder) => void; folderMenuFor?: string | null; onFolderMenu?: (f: Folder, el: HTMLElement) => void
}) {
  const colWidths = useColumnWidths(tableKey)
  const tracks = gridTemplateFor(columns, colWidths)
  const headRow = useRef<HTMLDivElement>(null)
  const L0 = useColumnLayout(columns, headRow)
  const D = useColumnDrag(columns, onReorder)
  const L = { ...L0, style: (key: string) => ({ ...L0.style(key), ...D.style(key) }) }   /* (REG-614) every cell rides the drag's transform, so the whole column travels — the Items grid's rule (REG-572) */
  const [frame, overflowing] = useOverflowX()
  const ids = [...folders.map((f) => f.id), ...rows.map((t) => t.id)]
  const allOn = !!selection && ids.length > 0 && ids.every((id) => selection.selected.has(id))
  const someOn = !!selection && ids.some((id) => selection.selected.has(id))
  return (
    <div ref={frame} className={table.card} role="table" data-drag-root="" aria-label={ariaLabel} data-cols={tableKey} data-overflow={overflowing || undefined} data-testid="library-table"
         style={{ '--tracks': tracks } as React.CSSProperties} onScroll={(e) => e.currentTarget.toggleAttribute('data-scrolled', e.currentTarget.scrollLeft > 0)}>
      <div ref={headRow} className={table.head} role="row">
        {columns.map((c) => (
          <div key={c.key} className={`${table.hCell} ${c.key === 'name' ? table.colName : ''} ${c.pinned ? table.pin : ''}`} role="columnheader" data-col={c.key} data-pin-edge={L.edge(c.key) || undefined} style={L.style(c.key)} {...D.head(c.key)}
               aria-sort={sort?.key === c.key ? (sort.dir === 1 ? 'ascending' : 'descending') : undefined}>
            {c.key === 'name' && selection ? <span className={styles.selBox}><Checkbox isSelected={allOn} isIndeterminate={!allOn && someOn} isDisabled={ids.length === 0} onChange={(on: boolean) => selection.all(on)} aria-label="Select all" /></span> : null}
            {sortable(c.key) ? <button type="button" className={table.hSort} onClick={() => onSort(c.key)} data-sorted={sort?.key === c.key || undefined}><span className={table.hLabel}>{c.label}</span><Icon name={sort?.key === c.key ? (sort.dir === 1 ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'} size={16} /></button> : <span className={table.hLabel}>{c.label}</span>}
            <ColumnResizer table={tableKey} column={c.key} label={c.label} min={c.key === 'name' ? 160 : 72} />
          </div>
        ))}
      </div>
      {folders.map((f) => {
        /* (REG-664) A folder row: the folder glyph, its name (opens it), what it holds; the other columns rest. */
        const open = folderMenuFor === f.id
        const cell = (key: string, children: ReactNode, cls?: string) => (
          <div className={`${table.cell} ${cls ?? ''} ${L.pinned(key) ? table.pin : ''}`} role="cell" data-col={key} data-pin-edge={L.edge(key) || undefined} style={L.style(key)}>{children}</div>
        )
        const render = (key: string): ReactNode => {
          if (key === 'name') return cell('name', <>{selection ? <span className={styles.selBox}><Checkbox isSelected={selection.selected.has(f.id)} onChange={() => selection.toggle(f.id)} aria-label={`Select ${f.name}`} /></span> : null}<span className={`${table.thumb} ${styles.folderGlyph}`} aria-hidden><Icon name="folder" size={20} /></span><button type="button" className={table.name} onClick={() => onOpenFolder?.(f)} aria-label={`Open ${f.name}`}>{f.name}</button><span className={styles.folderCount}>{folderCount?.(f)}</span></>, table.colName)
          if (key === 'updated') return cell('updated', ago(f.updatedAt, now))
          return cell(key, '')
        }
        return (
          <div key={f.id} className={table.row} role="row" data-testid="library-folder-row" data-selected={selection?.selected.has(f.id) || undefined}>
            {columns.map((c) => <Fragment key={c.key}>{render(c.key)}</Fragment>)}
            {onFolderMenu ? (
              <span className={table.actions} data-open={open || undefined}>
                <span className={table.actionsInner}>
                  <span className={table.menuWrap}>
                    <span className={table.float}>
                      <Tooltip label="Folder actions" disabled={open}>
                        <IconButton icon="more_vert" label={`Actions for ${f.name}`} variant="primary" className={table.touchBtn} aria-haspopup="menu" aria-expanded={open}
                                    onClick={(e) => onFolderMenu(f, e.currentTarget)} />
                      </Tooltip>
                    </span>
                  </span>
                </span>
              </span>
            ) : null}
          </div>
        )
      })}
      {rows.map((t) => {
        const open = menuFor === t.id
        const cell = (key: string, children: ReactNode, cls?: string) => (
          <div className={`${table.cell} ${cls ?? ''} ${L.pinned(key) ? table.pin : ''}`} role="cell" data-col={key} data-pin-edge={L.edge(key) || undefined} style={L.style(key)}>{children}</div>
        )
        const render = (key: string): ReactNode => {
          if (key === 'name') return cell('name', <>{selection ? <span className={styles.selBox}><Checkbox isSelected={selection.selected.has(t.id)} onChange={() => selection.toggle(t.id)} aria-label={`Select ${t.title}`} /></span> : null}<span className={table.thumb} aria-hidden>{glyph(t)}</span><button type="button" className={table.name} onClick={() => onOpen(t)} aria-label={`${openLabel(t)} ${t.title}`}>{t.title}</button>{chips?.(t)}{place ? <span className={styles.folderCount}><Icon name="folder" size={14} weight={300} /> {place(t)}</span> : null}</>, table.colName)
          if (key === 'updated') return cell('updated', ago(t.updatedAt.getTime(), now))
          if (key === 'by') return cell('by', t.author ? <><Avatar name={t.author} color={t.authorColor ?? 'var(--om-color-on-surface-secondary)'} size={24} tooltip={false} /><span className={table.oneLine}>{t.author}</span></> : '--', table.colBy)
          const c = extra.find((x) => x.key === key)
          return c ? cell(key, c.cell(t)) : null
        }
        return (
          <div key={t.id} className={table.row} role="row" data-testid="library-row" data-selected={selection?.selected.has(t.id) || undefined}>
            {columns.map((c) => <Fragment key={c.key}>{render(c.key)}</Fragment>)}
            <span className={table.actions} data-open={open || undefined}>
              <span className={table.actionsInner}>
                <span className={table.menuWrap}>
                  <span className={table.float}>
                    <Tooltip label="More options" disabled={open}>
                      <IconButton icon="more_vert" label={`More options for ${t.title}`} variant="primary" className={table.touchBtn} aria-haspopup="menu" aria-expanded={open}
                                  onClick={(e) => onMenu(t, e.currentTarget)} />
                    </Tooltip>
                  </span>
                </span>
              </span>
            </span>
          </div>
        )
      })}
    </div>
  )
}
