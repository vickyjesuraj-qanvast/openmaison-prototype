'use client'

import { Fragment, useMemo, useRef, useState, type ReactNode } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Button, Checkbox } from '@/components/ds'
import { DetailBulkBar } from '@/components/leads/tasks/detail-bulk-bar'
import { SegmentedIconToggle } from '@/components/om/segmented'
import { ColumnSettingsDrawer } from '@/components/om/column-settings'
import { ACTIONS_TRAIL, gridTemplateFor, useColumnLayout, useTableColumns, type TableColumn, type TableColumnDef } from '@/components/om/table-columns'
import { ColumnResizer, useColumnWidths } from '@/components/om/column-resize'
import { useColumnDrag } from '@/components/om/column-drag'
import { useOverflowX } from '@/components/om/use-overflow-x'
import { PortalMenu } from '@/components/om/portal-menu'
import { TabSearchEmpty } from '@/components/leads/tasks/tab-search-empty'
import { MOBILE, TABLET_DOWN, TOUCH_TABLET, useMediaQuery } from '@/lib/breakpoint'
import { useLongPress } from '@/components/leads/quotes/use-long-press'
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
import { EmptyState, type EmptyAction } from '@/components/om/empty-state'
import { GhostShape, useRememberShape } from '@/lib/ghost-shape'
import { libraryShape } from './library-ghost-for'
import { MoveDialog } from '@/components/om/folders/move-dialog'
import { NameDialog } from '@/components/leads/files/name-dialog'
import { countLine, folderNameProblem, foldersIn, foldersUnder, liveFolder, trailTo } from '@/lib/folders'
import { ScopePill } from '@/components/om/scope-pill'
import { LIBRARY_ROOT, type Folder, type FolderLibrary, type FolderUndo } from '@/lib/company/folder-libraries'
import { createLibraryFolder, deleteLibraryFolder, moveToLibraryFolder, renameLibraryFolder, undoDeleteLibraryFolder } from '@/app/company/folder-actions'
import { DropdownDivider, DropdownItem, MENU_WIDTH } from '@/components/leads/dropdown'
import { useRun } from '@/components/leads/tasks/use-run'
import { Refused, settle, newIdOf } from './refusal'
import { CompanyShell, templateTabs } from '@/components/company/company-shell'
import { TemplateLibraryGhost } from '@/components/company/company-ghosts'
import { PageReveal } from '@/components/shell/page-reveal'
import { PageHeader } from '@/components/shell/page-header'
import pageStyles from '@/app/leads/leads.module.css'
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
  folderId?: string | null
  /** (wave E, E5) Whoever changed it last, where the library keeps that apart from `author` (Materials); null = nobody since it was added.
      The card's foot reads "edited … by {editedBy ?? author}". */
  editedBy?: string | null }
export type LibraryKebabItem = { label: string; onSelect: () => void; tone?: 'danger'; disabled?: boolean; title?: string }
/** (REG-653, price book parity Q-15) A sortable column says what it sorts by; `true` on a *Used by* column sorts by the usage count. */
export type LibraryColumn<T> = TableColumnDef & { cell: (t: T) => ReactNode; sortable?: boolean | ((t: T) => number | string) }
export type LibraryFilter<T> = { key: string; label: string; test: (t: T) => boolean
  /** (REG-666) A to-do, not a kind (Awaiting approval · Proposed): its words for the chip that shows while something waits. */
  attention?: (n: number) => string
  /** (UX audit S7) The to-do chip's glyph (default the approvals' one). */
  icon?: string }
/** (REG-653, Q-15) A filter by one of the entry's values (a category, a vendor): the toolbar's Filters dialog, applied as picked. */
export type LibraryFacet<T> = { key: string; label: string; options: string[]; test: (t: T, value: string) => boolean
  /** (wave E, E6) The no-filter choice's words (default "Any {label}") — "Price book link: Any · Linked · Not linked". */
  any?: string }
export type LibraryBulkAction = { label: string; onClick: () => void; tone?: 'danger' }

export type LibraryGalleryProps<T extends LibraryItem> = {
  kind: TemplateKind
  items: T[]
  deleted: T[]
  now: number
  ariaLabel: string
  /** The rows of New template ▾ (DropdownItem / DropdownDivider); `close` shuts the menu. (audit 2026-09-26, F118) `place` = where the
      member stands: the open folder (what's new lands there) and this page's own address with its search (the `from` an editor goes back to). */
  newMenu: (close: () => void, place: LibraryPlace) => ReactNode
  /** The status filter's choices after "All · n" — (REG-666) one pill, "{filterLabel}: All ▾", scoped to the open folder. */
  filters?: LibraryFilter<T>[]
  /** The pill's word: "Status" · "Kind" (default "Show"). */
  filterLabel?: string
  /** Search beyond the title (the body's words). */
  searchText?: (t: T) => string
  /** The card's picture (inside the 220 thumb band) and the list's 26×36 glyph. */
  thumb: (t: T) => ReactNode
  glyph: (t: T) => ReactNode
  /** The card's second line and the usage line. (wave E, phone-5) `at.filter` = the scope pill's choice ('all' or a filter's key), so a
      line can leave out what the pill already says ("Personal" under Kind: Personal). */
  meta: (t: T, at: { filter: string }) => string
  usage: (t: T) => string
  chips?: (t: T) => ReactNode
  /** (REG-820) The list row's chips beside the name, when they differ from the card's — null where a column already says it (a Status or
      Kind column), so no tag takes the name's width to repeat its row. Defaults to `chips`. */
  listChips?: (t: T) => ReactNode
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
  empty: { title: string; help: string
    /** (REG-735, owner 2026-09-30) The library's first run — nothing in it and no folders: its ways in as buttons in the empty state, where
        the eye lands (New ▾'s rows, the usual way filled), while the toolbar keeps only the library's name and ⋮ (rules ② ③). */
    start?: (place: LibraryPlace) => { primary?: EmptyAction | null; secondary?: EmptyAction | null; link?: EmptyAction | null }
    /** (REG-735) Under the buttons: the library's samples — its ready-made designs — with their caption. */
    samples?: { label: string; node: ReactNode }
    /** (REG-735) A page whose first run is its own welcome (the AI Visualizer): it takes the empty state's, the intro's and the toolbar's
        place (rule ④ — say it once); ⋮ moves to the page header. */
    welcome?: ReactNode }
  children?: ReactNode
  /** (REG-594) Another Company section on the same gallery: its shell (title + tab strip) and what an entry is called. */
  /** (REG-677) A section with no peers (Materials) passes no tabs — no strip. */
  shell?: { title: string; tabs?: { label: string; href: string }[]
    /** (verify round 1) The section's own ghost for the reveal — the one its loading.tsx draws (Materials: toolbar, folders, cards). */
    skeleton?: ReactNode }
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
  /** (verify round 1, F204 · critic 15) Why the viewer may not delete this one for good — per row (its maker, an Owner or an Admin may);
      the sheet greys its Delete Forever, says why in the row, and Empty Trash counts only what the viewer may remove. */
  purgeRule?: (t: T) => string | null
  /** (verify round 1, F093 · D6) What else a Delete forever should say, for the rows it takes (renders kept in Files; "Used in n designs"). */
  foreverNote?: (ts: T[]) => string | null
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
  /** (REG-673) A Tools page on the same gallery (Tools › AI Visualizer): the L1 page header in place of Company's frame and tab strip. */
  page?: { title: string; skeleton: ReactNode }
  /** (REG-673) A card above the toolbar — what the page does, dismissible (Quote X-Ray's intro). */
  intro?: ReactNode
  /** (audit 2026-09-26, F119 · critic 14) Why this entry is never filed nor renamed here (a lead's design is its lead's, named after it), else
      null: Move to Folder and Rename leave its menu, and a bulk Move leaves it where it is, saying why. */
  fixed?: (t: T) => string | null
  /** (F127) The Move dialog's thumb for an entry — its picture, or (a colour-only material) its swatch. */
  moveThumb?: (t: T) => { src?: string | null; swatch?: string | null } | null
  /** (F122) The name's limit on the server — the Rename field stops there rather than the save cutting it. */
  nameMax?: number
  /** (wave E, gallery-9) The New ▾ rows carry a leading glyph (the AI Visualizer's) — the New Folder row a phone adds to it wears one too. */
  newIcons?: boolean
  /** (critic 14) Delete many in one call (the bulk bar), so one Undo brings back exactly what went. */
  onDeleteMany?: (ts: T[]) => Promise<unknown>
  /** (UX audit S8) The view a member who never picked one sees: the Price book's My Items opens as the list (the listing's table model);
      a member's own pick still sticks (om.<tableKey>.list). Default the grid. */
  defaultView?: 'grid' | 'list'
  /** (UX audit S7) Narrow the list to one of the filters — a fresh object each time (an import's "just imported" to-do). */
  focusFilter?: { key: string } | null
  /** (UX audit S12) A library with one way to make an entry (Materials): a plain button with its name, in place of a New ▾ of one row. */
  newAction?: (place: LibraryPlace) => { label: string; onPress: () => void }
  /** (Contracts on the move, P-10 · C-01 C-02 C-03 C-05 C-07 · C-14 — his "please check and built accordingly" 2026-10-22; OPT-IN, Templates ›
      Contracts only — every other library is as it was at every width) The gallery on the move. `rows` (the caller's phone model: a phone, a
      tablet held upright) draws the entries as a LIST of rows in the cards' place — the name 16/600, the state as words at 14, the kind's
      facts at 14, a chevron; the whole row opens it, ⋮ its menu (no Open: the row is the open), a hold selects where the bulk bar exists —
      `pinned` first (at the top level from every folder, saying where it lives), the folders as rows under the entries. `tabletColumns` =
      the list view's default set on a touch tablet (the rest in Column settings, remembered for the tablet) with the ⋮ frozen at the right.
      A touch tablet's cards read their lines at 14. */
  move?: { rows: boolean; facts: (t: T) => string; state?: (t: T) => string | null; pinned?: (t: T) => boolean; tabletColumns?: string[]; rowTestId?: string; menuTestId?: string }
}
/** (F118) Where the member stands when they press New ▾. */
export type LibraryPlace = { folderId: string | null; here: string }

/* (verify round 1, F129 · F204 · wave E, E7) Refused · settle · newIdOf · reasonOf live in ./refusal (the brand kit and the profile read them
   too, without the gallery); re-exported here for the libraries that already import them from the gallery. */
export { Refused, settle, newIdOf, reasonOf } from './refusal'
/** (verify round 1, F129) What a Restore / Delete forever / Empty Trash did, whichever words the library's action answers with — how many
    went ({ deleted } · { removed } · { done } · { restored }) and how many stayed ({ kept }); null when it answers nothing (void). */
function outcome(v: unknown, keys: string[]): { n: number; kept: number } | null {
  if (!v || typeof v !== 'object') return null
  const r = v as Record<string, unknown>
  for (const k of keys) { const n = r[k]; if (typeof n === 'number') return { n, kept: typeof r.kept === 'number' ? r.kept : 0 } }
  return null
}
type Snack = Parameters<ReturnType<typeof useSnackbar>>[0]
/** (critic 14) Names for a line: "Kevin Ng", "Kevin Ng and Tan residence", "Kevin Ng, Tan residence and 2 more". */
function nameList(names: string[]): string {
  const q = names.map((n) => `“${n}”`)
  if (q.length <= 2) return q.join(' and ')
  return `${q.slice(0, 2).join(', ')} and ${q.length - 2} more`
}
const reason = (why: string) => `${why.charAt(0).toLowerCase()}${why.slice(1).replace(/\.$/, '')}`
/** (critic 14) What stays and why, one sentence per reason: "“Kevin Ng” stays where it is — a lead’s design stays with its lead." */
function keptLine(kept: { name: string; why: string }[], where: string): string {
  const byWhy = new Map<string, string[]>()
  for (const k of kept) byWhy.set(k.why, [...(byWhy.get(k.why) ?? []), k.name])
  return [...byWhy].map(([why, names]) => `${nameList(names)} ${names.length === 1 ? 'stays' : 'stay'}${where ? ` ${where}` : ''} — ${reason(why)}.`).join(' ')
}

export function LibraryGallery<T extends LibraryItem>(p: LibraryGalleryProps<T>) {
  const { items, deleted, now, kind } = p
  const noun = p.noun ?? { one: 'template', many: 'templates' }
  const Noun = noun.one.charAt(0).toUpperCase() + noun.one.slice(1)
  const { run } = useRun()
  const snackbar = useSnackbar()
  /* (verify round 1, F129 · F204) run() with the server's words: a refusal reads "Couldn’t restore the design — only Dane, an Owner or an
     Admin can restore this design", never "please try again"; the success line may read the answer (how many went). */
  const act = async (what: string, fn: () => Promise<unknown>, done?: string | Snack | ((v: unknown) => string | Snack | null)): Promise<boolean> => {
    const out: { v?: unknown; why?: string } = {}
    const ok = await run(what, async () => { try { out.v = await fn() } catch (e) { if (e instanceof Refused) { out.why = e.message; return } throw e } })
    /* the server's sentence as it stands when it already says what happened ("Nothing was deleted — only …"); else after "Couldn’t …" */
    if (out.why !== undefined) { snackbar({ message: /^(Nothing|Couldn’t)\b/.test(out.why) ? out.why.replace(/\.$/, '') : `Couldn’t ${what} — ${reason(out.why)}` }); return false }
    if (!ok) return false
    const d = typeof done === 'function' ? done(out.v) : done
    if (d) snackbar(typeof d === 'string' ? { message: d } : d)
    return true
  }
  /** (verify round 1, F129) What a Delete forever / Empty Trash did, from what the action answers: all of it (the usual line), none, or
      some — "2 designs deleted forever — 1 stays" — never "Trash emptied" while rows stay. An action that answers nothing keeps the line. */
  const purgedLine = (v: unknown, expected: number, all: string): string => {
    const o = outcome(v, ['deleted', 'removed', 'done'])
    if (!o) return all
    const stayed = Math.max(o.kept, expected - o.n)
    if (o.n === 0) return `Nothing was deleted${stayed ? ` — ${stayed === 1 ? 'it stays' : `${stayed} stay`}` : ''}`
    return stayed ? `${countLine(o.n, noun.one, noun.many)} deleted forever — ${stayed} ${stayed === 1 ? 'stays' : 'stay'}` : all
  }
  /** (verify round 1, F129) The same for a Restore: "2 designs restored — 1 stays" when the rule kept some in the trash. */
  const restoredLine = (v: unknown, all: string): string => {
    const o = outcome(v, ['restored'])
    if (!o || !o.kept) return all
    return o.n ? `${countLine(o.n, noun.one, noun.many)} restored — ${o.kept} ${o.kept === 1 ? 'stays' : 'stay'}` : `Nothing was restored — ${o.kept === 1 ? 'it stays' : `${o.kept} stay`}`
  }
  const phone = useMediaQuery(MOBILE)
  /* (Contracts on the move, P-10 · C-05) a library that opts in: rows on the caller's phone model; a touch tablet's list opens with its own set */
  const rowsView = !!p.move?.rows
  const touchTablet = useMediaQuery(TOUCH_TABLET) && !phone
  const tabletKey = p.move?.tabletColumns?.join(',') ?? ''
  const tabletSet = !!tabletKey && touchTablet
  /* (verify round 3) 768–1024: list view's Column settings rides the page kebab (the button leaves the bar in CSS, `.columnsTool`), so the
     list's bar is the grid's one row — the library's name whole, nothing to jump when the folded search opens. Read when ⋮ opens. */
  const tabletDown = useMediaQuery(TABLET_DOWN)
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
  const place: LibraryPlace = { folderId: openId, here: params.toString() ? `${pathname}?${params.toString()}` : pathname }
  /* (REG-735) First run: the library holds nothing — no entry, no folder — so the page is its start: the empty state carries the ways in,
     and the toolbar keeps only what can act (the name, ⋮ for Deleted). The first entry brings the whole toolbar back. */
  const firstRun = items.length === 0 && flist.length === 0 && !openFolderRow
  const welcome = firstRun ? p.empty.welcome ?? null : null
  /* (UX audit build) the shape this library opened on — its loading ghost draws the same one next time (lib/ghost-shape.tsx) */
  useRememberShape(libraryShape(p.tableKey), firstRun)
  const [filter, setFilter] = useState('all')
  /* (UX audit S7) the caller's nudge onto one filter (render-phase adjust: a new object, a new narrowing) */
  const [seenFocus, setSeenFocus] = useState(p.focusFilter ?? null)
  if ((p.focusFilter ?? null) !== seenFocus) { setSeenFocus(p.focusFilter ?? null); if (p.focusFilter) setFilter(p.focusFilter.key) }
  const [listPref, setListPref] = useFlagPref(`om.${p.tableKey}.list`, p.defaultView === 'list')
  const view: 'grid' | 'list' = phone || rowsView || !listPref ? 'grid' : 'list'   // (P-10) the rows take the cards' place, and the list's
  const foldColumns = view === 'list' && tabletDown   // (verify round 3) Column settings in ⋮ at 768–1024
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
  const defs = useMemo<readonly TableColumnDef[]>(() => {
    const all: TableColumnDef[] = [{ key: 'name', label: p.nameLabel ?? 'Template', track: 'minmax(318px, 1fr)', locked: true }, ...p.columns.map(({ key, label, track, hidden }) => ({ key, label, track, hidden })), { key: 'updated', label: 'Updated', track: '132px' }, ...(byColumn ? [{ key: 'by', label: 'Updated by', track: '200px' }] : [])]
    /* (P-10 · C-05) a library that names its tablet set: every other column waits in Column settings on a touch tablet */
    if (!tabletKey) return all
    const keep = new Set(['name', ...tabletKey.split(',')])
    return all.map((d) => (keep.has(d.key) ? d : { ...d, tabletHidden: true }))
  }, [p.columns, p.nameLabel, byColumn, tabletKey])
  const columnPrefs = useTableColumns(p.tableKey, defs, phone, tabletSet)
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
     them finds across every folder, each result saying where it lives. The segments count the whole library either way.
     (Dane UAT 3.07) A sort finds too: the list sorts everything here — the open folder and all inside it, at the top the whole library — as
     one list, each row with its place; the folders step aside (they stayed on top, and the sort left out whatever sat inside them). */
  const sorting = view === 'list' && sort !== null
  const finding = query.trim() !== '' || activeFilter !== 'all' || activeFacets.length > 0 || sorting
  const browsing = !!F && !finding
  const listed = useMemo(() => (browsing ? shown.filter((t) => placeIdOf(t) === openId) : shown), [browsing, shown, openId, flist])   // eslint-disable-line react-hooks/exhaustive-deps
  const shownFolders = useMemo(() => (browsing ? foldersIn(flist, openId) : []), [browsing, flist, openId])
  /* (Contracts on the move, P-10) the rows' order: the pinned ones first (Default · At handover) — at the top level from every folder, each
     saying where it lives — then the rest as the list has them */
  const pinnedOf = p.move?.pinned
  const moveEntries = useMemo(() => {
    if (!rowsView || !pinnedOf) return listed
    const lifted = browsing && !openId ? shown.filter((t) => pinnedOf(t) && placeIdOf(t) !== null) : []
    const all = [...lifted, ...listed.filter((t) => !lifted.includes(t))]
    return [...all.filter((t) => pinnedOf(t)), ...all.filter((t) => !pinnedOf(t))]
  }, [rowsView, pinnedOf, listed, shown, browsing, openId])   // eslint-disable-line react-hooks/exhaustive-deps
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
  const liveSelected = useMemo(() => new Set([...(rowsView ? moveEntries : listed).filter((t) => selected.has(t.id)).map((t) => t.id), ...shownFolders.filter((f) => selected.has(f.id)).map((f) => f.id)]), [rowsView, moveEntries, listed, shownFolders, selected])
  const clearSelection = () => setSelected(new Set())
  /* Selection is for the library's own bulk actions, or for someone who runs the folders; anyone else files what they may one at a time
     from its menu — a Designer's list keeps no ticks (REG-654), not a row of boxes most of which Move to Folder would refuse. */
  const selectable = !!p.bulk || (!!F && !F.block)
  const isFolderId = (id: string) => flist.some((f) => f.id === id)

  const openLabel = (t: T) => (typeof p.openLabel === 'function' ? p.openLabel(t) : p.openLabel ?? 'Open')
  /* (P-10) a row on the move is the open itself — its ⋮ starts with the kind's own rows */
  const rows = (t: T): LibraryKebabItem[] => [...(rowsView ? [] : [{ label: openLabel(t), onSelect: () => p.onOpen(t) }]), ...(p.kebab?.(t) ?? [])]
  const pageRows = p.pageMenu?.(shown) ?? []
  const menuItem = menuFor ? listed.find((t) => t.id === menuFor) ?? (rowsView ? items.find((t) => t.id === menuFor) ?? null : null) : null
  const delBlock = (t: T) => p.mayChange?.(t) ?? p.deleteBlock?.(t) ?? null
  /* (critic 14) Why this one can't be filed: it has no place in folders (fixed), or its rename rule refuses the viewer. */
  const moveBlock = (t: T) => p.fixed?.(t) ?? p.mayChange?.(t) ?? null
  /* (F124) Each folder's own rule (an AI Visualizer folder is its maker's); a library without one keeps the gallery-wide rule. */
  const folderBlockOf = (f: Folder) => (f.mayChange !== undefined ? f.mayChange : F?.block ?? null)
  const closeMenu = () => setMenuFor(null)
  const menuRows = (t: T) => {
    const fixed = !!p.fixed?.(t)
    /* (verify round 1) A rule that greys several rows is said once, under the last row it greys — not three times over (the 224px menu
       stood ~300px tall saying the same sentence). */
    const dupWhy = p.duplicateBlock?.(t) ?? null
    const moveWhy = F && !fixed ? p.mayChange?.(t) ?? null : null
    const renameWhy = fixed ? null : p.mayChange?.(t) ?? null
    const delWhy = delBlock(t)
    const once = (why: string | null, later: (string | null)[]) => (why && !later.includes(why) ? why : null)
    return (
      <>
        {rows(t).map((it) => <DropdownItem key={it.label} onSelect={() => { closeMenu(); it.onSelect() }} disabled={it.disabled} help={it.disabled ? it.title : undefined}>{it.label}</DropdownItem>)}
        <DropdownDivider />
        <DropdownItem onSelect={() => { closeMenu(); void act(`duplicate the ${noun.one}`, () => settle(p.onDuplicate(t))) }} disabled={!!dupWhy} help={once(dupWhy, [moveWhy, renameWhy, delWhy])}>Duplicate</DropdownItem>
        {/* (F119) a fixed entry (a lead's design) is never filed nor renamed here — the rows leave rather than wait greyed forever */}
        {F && !fixed ? <DropdownItem onSelect={() => { closeMenu(); openMove([t.id], []) }} disabled={!!moveWhy} help={once(moveWhy, [renameWhy, delWhy])}>Move to Folder</DropdownItem> : null}
        {fixed ? null : <DropdownItem onSelect={() => { closeMenu(); setRename({ id: t.id, name: t.title }) }} disabled={!!renameWhy} help={once(renameWhy, [delWhy])}>Rename</DropdownItem>}
        <DropdownDivider />
        <DropdownItem tone="danger" onSelect={() => { closeMenu(); setDel(t) }} disabled={!!delWhy} help={delWhy}>Delete</DropdownItem>
      </>
    )
  }
  const toggleOne = (id: string) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const clearAll = () => { setQuery(''); setFacet({}); setFilter('all') }
  const doRename = () => { const r = rename; if (!r || !r.name.trim()) return; const t = items.find((x) => x.id === r.id); setRename(null); if (t) void act(`rename the ${noun.one}`, () => settle(p.onRename(t, r.name.trim())), `${Noun} renamed`) }

  /* ── (REG-664) folders ── */
  const [folderMenu, setFolderMenu] = useState<string | null>(null)
  const folderAnchor = useRef<HTMLElement | null>(null)
  const menuFolder = folderMenu ? flist.find((f) => f.id === folderMenu) ?? null : null
  const openFolderMenu = (f: Folder, el: HTMLElement) => { folderAnchor.current = el; setFolderMenu((m) => (m === f.id ? null : f.id)) }
  const [naming, setNaming] = useState<{ open: boolean; folder: Folder | null }>({ open: false, folder: null })
  const [move, setMove] = useState<{ open: boolean; entries: string[]; folders: string[]; note: string | null }>({ open: false, entries: [], folders: [], note: null })
  const openMove = (entries: string[], folders: string[], note: string | null = null) => setMove({ open: true, entries, folders, note })
  /* (critic 14) The bulk bar's Move: what may move goes to the dialog; what may not stays, and the dialog says which and why before the
     move — nothing is refused silently. With nothing movable, the snackbar says why and no dialog opens. */
  const bulkMove = (entryIds: string[], folderIds: string[]) => {
    const kept: { name: string; why: string }[] = []
    const entries = entryIds.filter((id) => { const t = items.find((x) => x.id === id); const why = t ? moveBlock(t) : null; if (t && why) kept.push({ name: t.title, why }); return !!t && !why })
    const folders = folderIds.filter((id) => { const f = flist.find((x) => x.id === id); const why = f ? folderBlockOf(f) : null; if (f && why) kept.push({ name: f.name, why }); return !!f && !why })
    if (!entries.length && !folders.length) { const whys = [...new Set(kept.map((k) => k.why))]; snackbar({ message: `Nothing to move — ${whys.length === 1 ? reason(whys[0]!) : 'you may not move these'}` }); return }
    openMove(entries, folders, kept.length ? keptLine(kept, 'where it is') : null)
  }
  const [folderDel, setFolderDel] = useState<{ open: boolean; folder: Folder | null }>({ open: false, folder: null })
  const [bulkDel, setBulkDel] = useState<{ open: boolean; entries: string[]; folders: string[] }>({ open: false, entries: [], folders: [] })
  const folderName = (id: string | null) => (id ? flist.find((f) => f.id === id)?.name ?? root : root)
  const saveFolderName = (name: string) => {
    const f = naming.folder; setNaming((n) => ({ ...n, open: false })); if (!F) return
    if (f) void run('rename the folder', () => renameLibraryFolder(f.id, name), 'Folder renamed')
    else void run('create the folder', () => createLibraryFolder(F.library, name, openId), 'Folder created')
  }
  const doMove = async (target: string | null) => {
    const pick = { entries: move.entries, folders: move.folders }; setMove((m) => ({ ...m, open: false, note: null })); if (!F) return
    /* (wave E, E7) the answer goes back to run as it is — a refusal ({ error: the rule }) is said, never "Moved" */
    let answer: unknown = null
    const ok = await run('move', async () => { answer = await moveToLibraryFolder(F.library, pick, target); return answer })
    if (!ok) return
    const r = { moved: 0, kept: 0, ...(answer && typeof answer === 'object' ? answer as { moved?: number; kept?: number } : {}) }
    clearSelection()
    const dest = folderName(target)
    snackbar({ message: r.kept ? (r.moved ? `Moved ${r.moved} to ${dest} — ${r.kept} you may not move stayed` : `Nothing moved — you may not move ${r.kept === 1 ? 'it' : 'these'}`) : `Moved to ${dest}` })
  }
  const doDeleteFolder = async () => {
    const f = folderDel.folder; setFolderDel((d) => ({ ...d, open: false })); if (!f) return
    let undo: unknown = null
    const leaving = trail.some((x) => x.id === f.id)
    const ok = await run('delete the folder', async () => { undo = await deleteLibraryFolder(f.id); return undo })   // (wave E, E7) a refusal is said
    if (!ok) return
    if (leaving) go(f.parentId ?? null)
    const u = undo as FolderUndo | null
    snackbar({ message: `${f.name} deleted`, actionLabel: 'Undo', onAction: () => { if (u) void run('restore the folder', () => undoDeleteLibraryFolder(u), `${f.name} restored`) } })
  }
  const doBulkDelete = async () => {
    const pick = bulkDel; setBulkDel((b) => ({ ...b, open: false }))
    const entries = pick.entries.map((id) => items.find((t) => t.id === id)).filter((t): t is T => !!t && !delBlock(t))
    const folders = F ? pick.folders.filter((id) => { const f = flist.find((x) => x.id === id); return !!f && !folderBlockOf(f) }) : []   // (F124) each folder's own rule
    const undos: FolderUndo[] = []
    let went = entries.length
    const ok = await act(`delete the ${noun.many}`, async () => {
      if (p.onDeleteMany && entries.length) { const o = outcome(await settle(p.onDeleteMany(entries)), ['deleted', 'removed', 'done']); if (o) went = o.n }   // what the server let go
      else for (const t of entries) await settle(p.onDelete(t))
      for (const id of folders) undos.push(await settle(deleteLibraryFolder(id)) as FolderUndo)   // (wave E, E7) a refusal stops here, said
    })
    if (!ok) return
    clearSelection()
    /* (verify round 1) the line names what went, as a single delete does — "2 designs deleted", "3 items" when folders went too */
    const what = folders.length ? countLine(went + folders.length, 'item', 'items') : countLine(went, noun.one, noun.many)
    snackbar({ message: `${what} deleted`, actionLabel: 'Undo', onAction: () => { void act(folders.length ? 'restore them' : `restore the ${noun.many}`, async () => { if (entries.length) await settle(p.onRestore(entries.map((t) => t.id))); for (const u of undos) await settle(undoDeleteLibraryFolder(u)) }, `${what} restored`) } })
  }
  /* (critic 14) The bulk bar's Delete: with nothing the viewer may delete, the snackbar says why and no confirm opens; otherwise the confirm
     counts what goes and names what stays. */
  const bulkDelete = (entryIds: string[], folderIds: string[]) => {
    const whys: string[] = []
    const okE = entryIds.filter((id) => { const t = items.find((x) => x.id === id); const why = t ? delBlock(t) : null; if (why) whys.push(why); return !!t && !why }).length
    const okF = folderIds.filter((id) => { const f = flist.find((x) => x.id === id); const why = f ? folderBlockOf(f) : null; if (why) whys.push(why); return !!f && !why }).length
    if (!okE && !okF) { const w = [...new Set(whys)]; snackbar({ message: `Nothing to delete — ${w.length === 1 ? reason(w[0]!) : 'you may not delete these'}` }); return }
    setBulkDel({ open: true, entries: entryIds, folders: folderIds })
  }
  const bulkEntries = [...liveSelected].filter((id) => !isFolderId(id))
  const bulkFolders = [...liveSelected].filter(isFolderId)
  /* (verify round 1) Ticks that can never be filed (a lead's design, F119) take no Move to Folder — the action leaves the bar rather than
     answer "Nothing to move" after the press; a mix moves the rest and the dialog names what stays. */
  const allFixed = bulkFolders.length === 0 && bulkEntries.length > 0 && bulkEntries.every((id) => { const t = items.find((x) => x.id === id); return !!t && !!p.fixed?.(t) })
  const bulkActions: LibraryBulkAction[] = F
    ? [
        ...(allFixed ? [] : [{ label: 'Move to Folder', onClick: () => bulkMove(bulkEntries, bulkFolders) }]),
        ...(p.bulk && bulkFolders.length === 0 ? p.bulk(bulkEntries, clearSelection) : [{ label: 'Delete', tone: 'danger' as const, onClick: () => bulkDelete(bulkEntries, bulkFolders) }]),
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
    const okE = e.filter((t) => !delBlock(t)).length
    const fs = bulkDel.folders.map((id) => flist.find((f) => f.id === id)).filter((f): f is Folder => !!f)
    const nF = fs.filter((f) => !folderBlockOf(f)).length
    /* (critic 14) what stays is named, with its reason — the row's own rule (its maker, an Owner or an Admin) */
    const kept = [...e.flatMap((t) => { const why = delBlock(t); return why ? [{ name: t.title, why }] : [] }), ...fs.flatMap((f) => { const why = folderBlockOf(f); return why ? [{ name: f.name, why }] : [] })]
    return [okE ? `${countLine(okE, noun.one, noun.many)} ${okE === 1 ? 'goes' : 'go'} to ${p.deletedLabel ?? 'Deleted Templates'} — you can restore ${okE === 1 ? 'it' : 'them'} there.` : null,
      nF ? `${countLine(nF, 'folder', 'folders')} ${nF === 1 ? 'goes' : 'go'}; what ${nF === 1 ? 'it holds' : 'they hold'} moves up a level.` : null,
      kept.length ? keptLine(kept, '') : null].filter(Boolean).join(' ')
  })()

  const kebab = (
    <LibraryKebab open={kebabOpen} onOpenChange={setKebabOpen} deletedCount={deleted.length} onDeleted={() => setDeletedOpen(true)} label={p.deletedLabel} sheetTitle={p.shell?.title}>
      {foldColumns || pageRows.length ? (
        <>
          {foldColumns ? <DropdownItem onSelect={() => { setKebabOpen(false); setColumnsOpen(true) }}>Column settings</DropdownItem> : null}
          {pageRows.map((it) => <DropdownItem key={it.label} onSelect={() => { setKebabOpen(false); it.onSelect() }} disabled={it.disabled} help={it.disabled ? it.title : undefined}>{it.label}</DropdownItem>)}
        </>
      ) : null}
    </LibraryKebab>
  )
  /* (REG-735) The first run's ways in — the caller's, each waiting with New ▾'s reason when this member may make nothing here. */
  const starts = firstRun && !welcome ? p.empty.start?.(place) ?? {} : {}
  const newAction = !p.newBlock && p.newAction ? p.newAction(place) : null
  const blocked = (a: EmptyAction | null | undefined) => (a ? { ...a, block: a.block ?? p.newBlock ?? null } : null)
  const shellTitle = p.shell?.title ?? 'Templates'   // (F123) a one-page section (Materials) is not crumbed "Materials / Materials"
  const frame = (children: ReactNode) => (p.page ? (
    <PageReveal skeleton={<GhostShape first={firstRun}>{p.page.skeleton}</GhostShape>}>
      <div className={pageStyles.body} style={{ position: 'relative' }}>
        <PageHeader title={p.page.title} actions={welcome ? kebab : undefined} />
        <div className={pageStyles.content}>{children}</div>
      </div>
    </PageReveal>
  ) : <CompanyShell title={p.shell?.title ?? 'Templates'} tabs={p.shell ? p.shell.tabs : templateTabs()} from={p.from} skeleton={<GhostShape first={firstRun}>{p.shell?.skeleton ?? <TemplateLibraryGhost />}</GhostShape>}>{children}</CompanyShell>)   /* (REG-708) Templates' galleries: the ghost (libraries)/loading.tsx draws */
  return frame(
    <>
      {welcome ? null : p.intro}
      {welcome ? null : (
      <div className={`${gallery.toolbar} ${styles.bar}`}>
        {/* (REG-666) Where you are takes the bar's left — the Files tab's toolbar: the library's name at the top, the crumb inside a
            folder (the whole way as links, Back up one level, the folder's own menu). */}
        <div className={styles.where}>
          {F && openFolderRow ? (
            <FolderCrumbs root={root} trail={trail} onGo={go} menuOpen={folderMenu === openFolderRow.id} onMenu={(el) => openFolderMenu(openFolderRow, el)} />
          ) : <h2 className={styles.here}>{F ? root : `${faceted.length} ${faceted.length === 1 ? noun.one : noun.many}`}</h2>}
        </div>
        <div className={`${gallery.toolbarEnd} ${styles.end}`}>
          {/* (wave E, gallery-9) Two groups — what narrows the list, and the tools. From 768 up both melt into the one cluster (display:
              contents); on a phone the scope keeps the bar's left and the tools its right, and when the two can't share a line the tools
              take the next one whole — nothing runs off the screen. */}
          {p.filters?.length && !firstRun ? (
          <div className={styles.scopes}>
          {/* (REG-666) A to-do shows only while something here waits for it; a press narrows the list to it. */}
          {(p.filters ?? []).filter((f) => f.attention && (counts[f.key] ?? 0) > 0).map((f) => (
            <span key={f.key} className={styles.todo}>
              <ScopePill tone="attention" icon={f.icon ?? 'approval'} menu={false} label={f.attention!(counts[f.key] ?? 0)} short={String(counts[f.key] ?? 0)} selected={activeFilter === f.key}
                         onClick={() => setFilter(activeFilter === f.key ? 'all' : f.key)} />
            </span>
          ))}
            <>
              <ScopePill ref={statusAnchor} label={`${p.filterLabel ?? 'Show'}: ${activeFilter === 'all' ? 'All' : (p.filters ?? []).find((f) => f.key === activeFilter)?.label ?? 'All'}`}
                         short={activeFilter === 'all' ? 'All' : (p.filters ?? []).find((f) => f.key === activeFilter)?.label ?? 'All'}
                         open={statusOpen} scoped={activeFilter !== 'all'} onClick={() => setStatusOpen((o) => !o)} />
              {/* (REG-728) a status list: the width scale's 240 */}
              <PortalMenu open={statusOpen} anchor={statusAnchor} onClose={() => setStatusOpen(false)} align="left" width={MENU_WIDTH.wide} role="menu" sheetTitle={p.filterLabel ?? 'Show'}>
                <DropdownItem role="menuitemradio" checked={activeFilter === 'all'} onSelect={() => { setStatusOpen(false); setFilter('all') }}>All · {faceted.length}</DropdownItem>
                {(p.filters ?? []).map((f) => (
                  <DropdownItem key={f.key} role="menuitemradio" checked={activeFilter === f.key} onSelect={() => { setStatusOpen(false); setFilter(f.key) }}>{f.label} · {counts[f.key] ?? 0}</DropdownItem>
                ))}
              </PortalMenu>
            </>
          </div>
          ) : null}
          <div className={styles.tools}>
          {/* (REG-735) On the first run only ⋮ stays — New, the folder, search, Filters and the views have nothing to act on yet. */}
          {firstRun ? null : (<>
          {/* (REG-541) The tab's own New ▾ leads the cluster; its kebab (Deleted Templates) closes it — the tab toolbars' order. */}
          {F ? (
            /* (REG-664) New Folder, as the Files tab's toolbar has it — in the open folder. (wave E, gallery-9) On a phone it rides New ▾ (its
               last row), so the one row keeps the scope, New, Search, Filters and ⋮; it stays out here when New ▾ is closed to this member. */
            <span className={styles.folderSlot} data-keep={p.newBlock || p.newAction ? '' : undefined}>
              <Tooltip label={F.block ?? 'New Folder'}>
                <span className={styles.newFolder}><IconButton icon="create_new_folder" label="New Folder" disabled={!!F.block} onClick={() => setNaming({ open: true, folder: null })} /></span>
              </Tooltip>
            </span>
          ) : null}
          {newAction ? (
            /* (UX audit S12) one way in, one plain button (the glyph on a phone, REG-354); New Folder keeps its own button beside it */
            <span className={gallery.newAnchor}>
              {phone ? (
                <Tooltip label={newAction.label} shortcut="create"><IconButton icon="add" label={newAction.label} variant="primary" onClick={newAction.onPress} data-testid="new-template" data-kb="create" data-kb-label={newAction.label} /></Tooltip>
              ) : <Button variant="primary" appearance="outlined" onPress={newAction.onPress} data-testid="new-template" data-kb="create" data-kb-label={newAction.label}>{newAction.label}</Button>}
            </span>
          ) : (
          <LibraryNewButton open={newOpen} onOpenChange={setNewOpen} block={p.newBlock ?? null}>
            {p.newMenu(() => setNewOpen(false), place)}
            {phone && F && !p.newBlock ? (
              <>
                <DropdownDivider />
                <DropdownItem onSelect={() => { setNewOpen(false); setNaming({ open: true, folder: null }) }} disabled={!!F.block} help={F.block}>{p.newIcons ? <span className={styles.menuIcon}><Icon name="create_new_folder" size={20} weight={300} />New Folder</span> : 'New Folder'}</DropdownItem>
              </>
            ) : null}
          </LibraryNewButton>
          )}
          {/* (verify round 3) the search's slot — on a narrow desk the box gives first (280 → 200) so ⋮ stays in the frame; below 1025 it is no box */}
          <span className={styles.searchSlot}><ToolbarSearch query={query} onQuery={setQuery} placeholder={openFolderRow ? `Search ${openFolderRow.name}` : `Search ${noun.many}`} label={`Search ${noun.many}`} /></span>
          {/* (sweep S5 #15) the listing's Filters: the count rides the button as a badge (REG-69 · REG-295) */}
          {p.facets?.length ? <span className={styles.filterWrap}><Tooltip label="Filters" shortcut="filters"><IconButton icon="filter_list" data-kb="filters" data-kb-label="Filters" label={activeFacets.length ? `Filters (${activeFacets.length} active)` : 'Filters'} onClick={() => setFacetsOpen(true)} selected={activeFacets.length > 0} /></Tooltip>{activeFacets.length ? <span className={styles.filterBadge} aria-hidden>{activeFacets.length}</span> : null}</span> : null}
          {view === 'list' ? <span className={styles.columnsTool}><Tooltip label="Column settings"><IconButton icon="tune" label="Column settings" onClick={() => setColumnsOpen(true)} /></Tooltip></span> : null}
          {/* (P-10) the rows are the one view on a phone and a tablet held upright — no toggle there */}
          {rowsView ? null : <span className={gallery.viewToggle} data-kb="view">
            <SegmentedIconToggle label="View" value={view} options={[{ value: 'list', icon: 'view_list', label: 'List view' }, { value: 'grid', icon: 'view_kanban', label: 'Grid view' }]} onChange={(v) => setListPref(v === 'list')} />
          </span>}
          </>)}
          {kebab}
          </div>
        </div>
      </div>
      )}

      {firstRun ? (
        /* (REG-735) The first run: the page's own welcome, else the house empty state with the library's ways in and its samples. */
        welcome ?? (
          <EmptyState icon={kind.icon} title={p.empty.title} help={p.empty.help} primary={blocked(starts.primary)} secondary={blocked(starts.secondary)} link={blocked(starts.link)}
                      extra={p.empty.samples?.node} extraLabel={p.empty.samples?.label} testId="library-empty" />
        )
      ) : shown.length === 0 && (query.trim() || activeFacets.length) ? (
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
      ) : rowsView && p.move ? (
        /* (Contracts on the move, P-10 · C-01 · C-02 · C-03 · C-07) the entries as rows — pinned first — then the folders as rows */
        <div className={styles.moveList} data-kb-list={noun.one} data-testid="library-rows">
          {moveEntries.length ? (
            <div className={styles.moveGroup} role="list" aria-label={p.ariaLabel}>
              {moveEntries.map((t) => {
                const where = placeText(t)
                return (
                  <MoveRow key={t.id} id={t.id} testId={p.move!.rowTestId ?? 'library-move-row'} menuTestId={p.move!.menuTestId ?? 'library-move-row-menu'}
                           name={t.title} state={p.move!.state?.(t) ?? null} facts={p.move!.facts(t)} place={where || null}
                           openLabel={`${openLabel(t)} ${t.title}`} selected={liveSelected.has(t.id)} selectable={selectable} selectMode={liveSelected.size > 0}
                           onOpen={() => p.onOpen(t)} onToggle={() => toggleOne(t.id)} menuOpen={menuFor === t.id} onMenu={(el) => openMenu(t, el)} />
                )
              })}
            </div>
          ) : null}
          {shownFolders.length ? (
            <div className={styles.moveGroup} role="list" aria-label="Folders">
              {shownFolders.map((f) => (
                <MoveRow key={f.id} id={f.id} folder testId="library-move-folder" menuTestId="library-move-folder-menu" name={f.name} state={null} facts={folderCount(f)} place={null}
                         openLabel={`Open ${f.name}`} selected={liveSelected.has(f.id)} selectable={selectable} selectMode={liveSelected.size > 0}
                         onOpen={() => go(f.id)} onToggle={() => toggleOne(f.id)} menuOpen={folderMenu === f.id} onMenu={(el) => openFolderMenu(f, el)} />
              ))}
            </div>
          ) : null}
        </div>
      ) : view === 'list' ? (
        <LibraryTable kbNoun={noun.one} frozenKebab={tabletSet} rows={listed} now={now} tableKey={p.tableKey} columns={columnPrefs.columns} extra={p.columns} onReorder={columnPrefs.reorder} glyph={p.glyph} chips={p.listChips ?? p.chips} onOpen={p.onOpen} menuFor={menuFor} onMenu={openMenu} ariaLabel={p.ariaLabel}
                      sort={sort} sortable={(k) => sortValue(k) !== null} onSort={onSort} openLabel={openLabel}
                      place={F && finding ? placeText : undefined}
                      folders={shownFolders} folderCount={folderCount} onOpenFolder={(f) => go(f.id)} folderMenuFor={folderMenu} onFolderMenu={openFolderMenu}
                      selection={selectable ? { selected: liveSelected, toggle: toggleOne, all: (on) => setSelected(on ? new Set([...listed.map((t) => t.id), ...shownFolders.map((f) => f.id)]) : new Set()) } : undefined} />
      ) : (
        <div className={styles.gridStack} data-kb-list={noun.one}>
          {shownFolders.length ? (
            <FolderGroup ids={shownFolders.map((f) => f.id)} selected={liveSelected} onSelect={selectable ? (next) => setSelected(next) : undefined} min={248}>
              {shownFolders.map((f) => (
                <FolderCard key={f.id} name={f.name} count={folderCount(f)} selected={liveSelected.has(f.id)} onToggle={selectable ? () => toggleOne(f.id) : undefined}
                            onOpen={() => go(f.id)} menuOpen={folderMenu === f.id} onMenu={(el) => openFolderMenu(f, el)} />
              ))}
            </FolderGroup>
          ) : null}
          {listed.length ? (
            <div className={`${gallery.grid} ${styles.cards}`} role="list" aria-label={p.ariaLabel} data-move={p.move ? '' : undefined}>
              {listed.map((t) => (
                <div key={t.id} className={gallery.card} role="listitem" data-testid="library-card" data-kb-row data-kb-id={t.id} data-selected={liveSelected.has(t.id) || undefined} data-selectable={selectable || undefined}>
                  {/* (sweep S5 #7) the selection rides the card too — the bulk bar was list-only, so a phone (always the grid) could never use it */}
                  {selectable ? <span className={styles.cardSel} data-kb-select><Checkbox isSelected={liveSelected.has(t.id)} onChange={() => toggleOne(t.id)} aria-label={`Select ${t.title}`} /></span> : null}
                  <button type="button" className={gallery.open} onClick={() => p.onOpen(t)} aria-label={`${openLabel(t)} ${t.title}`} data-kb-open>   {/* (REG-653, Q-18) the card's words are the menu's */}
                    <span className={gallery.thumb}>{p.thumb(t)}</span>
                    <span className={`${gallery.body} ${styles.cardBody}`}>
                      <span className={`${gallery.nameRow} ${styles.cardNameRow}`}><Tooltip label={t.title} whenCut><span className={`${gallery.name} ${styles.cardName}`}>{t.title}</span></Tooltip>{p.chips?.(t)}</span>
                      {/* (REG-664) While finding, where it lives leads the second line — the folder's name as it was typed. */}
                      <span className={`${gallery.meta} ${styles.cardMeta}`}>{F && finding && placeText(t) ? <><span className={styles.place}><Icon name="folder" size={14} weight={300} />{placeText(t)}</span>{' · '}</> : null}{p.meta(t, { filter: activeFilter })}</span>
                    </span>
                  </button>
                  <span className={`${gallery.usage} ${styles.cardUsage}`}>{p.foot ? p.foot(t) : <>{p.usage(t)} · edited {ago(t.updatedAt.getTime(), now)}{(t.editedBy ?? t.author) ? ` by ${t.editedBy ?? t.author}` : ''}</>}</span>
                  <span className={`${gallery.kebab} ${styles.cardKebab}`}>
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

      {/* (REG-728) rows with a second line (why a row waits): the width scale's 240, not 264 */}
      <PortalMenu open={!!menuItem} anchor={menuAnchor} onClose={closeMenu} align="right" width={MENU_WIDTH.wide} role="menu" sheetTitle={menuItem?.title ?? ''}>
        {menuItem ? menuRows(menuItem) : null}
      </PortalMenu>
      {F ? (
        <>
          {/* (REG-664) A folder's menu — the Files tab's (931:40130): Open · Move · Rename · Delete. */}
          <PortalMenu open={!!menuFolder} anchor={folderAnchor} onClose={() => setFolderMenu(null)} align="right" width={MENU_WIDTH.standard} role="menu" sheetTitle={menuFolder?.name ?? ''}>   {/* (REG-728) the Files tab's folder menu: 200, not 224 */}
            {menuFolder ? (() => {
              const fb = folderBlockOf(menuFolder)   // (F124) this folder's own rule, said in the row (sweep rule), not in a native title
              return (
                <>
                  <DropdownItem onSelect={() => { setFolderMenu(null); go(menuFolder.id) }}>Open</DropdownItem>
                  {/* (verify round 1) the one rule is said once, under Delete — the last row it greys */}
                  <DropdownItem onSelect={() => { setFolderMenu(null); openMove([], [menuFolder.id]) }} disabled={!!fb}>Move</DropdownItem>
                  <DropdownItem onSelect={() => { setFolderMenu(null); setNaming({ open: true, folder: menuFolder }) }} disabled={!!fb}>Rename</DropdownItem>
                  <DropdownDivider />
                  <DropdownItem tone="danger" onSelect={() => { setFolderMenu(null); setFolderDel({ open: true, folder: menuFolder }) }} disabled={!!fb} help={fb}>Delete</DropdownItem>
                </>
              )
            })() : null}
          </PortalMenu>
          <NameDialog open={naming.open} title={naming.folder ? 'Rename Folder' : 'Create Folder'} initial={naming.folder?.name ?? ''}
                      validate={(name) => folderNameProblem(name, foldersIn(flist, naming.folder ? naming.folder.parentId : openId), naming.folder?.id ?? null)}
                      onSave={saveFolderName} onClose={() => setNaming((n) => ({ ...n, open: false }))} />
          <MoveDialog open={move.open} title={moveTitle} root={root} folders={flist} moving={[...move.entries, ...move.folders]} current={moveFrom}
                      entries={items.map((t) => { const th = p.moveThumb?.(t); return { id: t.id, name: t.title, parentId: placeIdOf(t), thumb: th?.src ?? null, swatch: th?.swatch ?? null } })}
                      note={move.note}
                      onMove={(target) => { void doMove(target) }} onClose={() => setMove((m) => ({ ...m, open: false }))}
                      onCreateFolder={F.block ? undefined : async (name, parentId) => { const id = await newIdOf(createLibraryFolder(F.library, name, parentId)); snackbar({ message: 'Folder created' }); return id }} />
          {/* (wave E, E7) ↑ a refusal throws its rule; the Move dialog says it */}
          <ConfirmDialog open={folderDel.open} title={`Delete “${folderDel.folder?.name ?? 'folder'}”?`} confirmLabel="Delete"
                         message={(() => { const f = folderDel.folder; if (!f) return ''; const c = folderCount(f); const total = items.filter((t) => placeIdOf(t) === f.id).length + foldersIn(flist, f.id).length
                           /* (F128) "The 1 design inside moves up…" — the verb agrees with what the folder holds */
                           return total ? `The ${c} inside ${total === 1 ? 'moves' : 'move'} up to ${folderName(f.parentId)}. Nothing in it is deleted.` : 'It’s empty. You can undo this straight after.' })()}
                         onCancel={() => setFolderDel((d) => ({ ...d, open: false }))} onConfirm={() => { void doDeleteFolder() }} />
          <ConfirmDialog open={bulkDel.open} title={(() => {
                           /* the title counts what goes; what stays is named in the message */
                           const e = bulkDel.entries.filter((id) => { const t = items.find((x) => x.id === id); return !!t && !delBlock(t) }).length
                           const f = bulkDel.folders.filter((id) => { const x = flist.find((y) => y.id === id); return !!x && !folderBlockOf(x) }).length
                           return f ? `Delete ${countLine(e + f, 'item', 'items')}?` : `Delete ${countLine(e, noun.one, noun.many)}?` })()} confirmLabel="Delete"
                         message={bulkDelMessage} onCancel={() => setBulkDel((b) => ({ ...b, open: false }))} onConfirm={() => { void doBulkDelete() }} />
        </>
      ) : null}
      <Dialog open={!!rename} onClose={() => setRename(null)} title={`Rename ${noun.one}`} size="form" width={400}
              footer={<><Button variant="secondary" appearance="outlined" onPress={() => setRename(null)}>Cancel</Button><Button isDisabled={!rename?.name.trim()} onPress={doRename}>Rename</Button></>}>
        <TextField label={`${Noun} name`} required value={rename?.name ?? ''} maxLength={p.nameMax} autoFocus onChange={(v) => setRename((r) => (r ? { ...r, name: v } : r))} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); doRename() } }} />
      </Dialog>
      <ConfirmDialog open={!!del} title={`Delete ${del?.title ?? noun.one}?`} confirmLabel="Delete" message={del ? p.deleteMessage(del) : ''}
                     onCancel={() => setDel(null)} onConfirm={() => { const t = del; setDel(null); if (t) void act(`delete the ${noun.one}`, () => settle(p.onDelete(t)), { message: `${t.title} deleted`, actionLabel: 'Undo', onAction: () => { void act(`restore the ${noun.one}`, () => settle(p.onRestore([t.id])), `${t.title} restored`) } }) }} />
      {selectable ? <DetailBulkBar count={liveSelected.size} actions={bulkActions} onClear={clearSelection} /> : null}
      {p.facets?.length ? (
        <Dialog open={facetsOpen} onClose={() => setFacetsOpen(false)} title="Filters" size="form" width={400}
                footer={<><Button variant="secondary" appearance="outlined" isDisabled={!activeFacets.length} onPress={() => setFacet({})}>Clear All</Button><Button onPress={() => setFacetsOpen(false)}>Done</Button></>}>
          <div className={styles.facets} data-testid="library-facets">
            {p.facets.map((f) => (
              <TextField key={f.key} label={f.label} mode="select" options={[f.any ?? `Any ${f.label.toLowerCase()}`, ...f.options]} value={facet[f.key] && f.options.includes(facet[f.key]!) ? facet[f.key]! : f.any ?? `Any ${f.label.toLowerCase()}`}
                         onChange={(v) => setFacet((x) => ({ ...x, [f.key]: f.options.includes(v) ? v : '' }))} helper={f.options.length ? undefined : `No ${f.label.toLowerCase()} on any ${noun.one} yet`} />
            ))}
            <span className={styles.count}>{shown.length} {shown.length === 1 ? noun.one : noun.many} shown</span>
          </div>
        </Dialog>
      ) : null}
      <ColumnSettingsDrawer open={columnsOpen} onClose={() => setColumnsOpen(false)} pinning={{ max: 3 }} columns={columnPrefs.all} onSave={columnPrefs.save} onReset={columnPrefs.reset} />
      <LibraryDeletedSheet open={deletedOpen} onClose={() => setDeletedOpen(false)} rows={deleted} crumb={p.page ? p.page.title : shellTitle === kind.label ? shellTitle : `${shellTitle} / ${kind.label}`} ariaLabel={p.shell ? `Deleted ${kind.label.toLowerCase()}` : `Deleted ${kind.label.toLowerCase()} templates`}
                           title={p.deletedLabel} noun={p.noun} nameLabel={p.nameLabel} restoreBlock={p.restoreBlock} purgeBlock={p.purgeBlock} purgeRule={p.purgeRule} foreverNote={p.foreverNote} byLabel={p.deletedByLabel} usageLabel={p.deletedUsageLabel}
                           glyph={p.glyph} meta={p.deletedMeta} usage={p.usageWord} keepReason={p.keepReason}
                           onRestore={(ids) => act(ids.length === 1 ? `restore the ${noun.one}` : `restore the ${noun.many}`, () => settle(p.onRestore(ids)),
                             (v) => restoredLine(v, ids.length === 1 ? `${deleted.find((t) => t.id === ids[0])?.title ?? Noun} restored` : `${ids.length} ${noun.many} restored`))}   /* (sweep S5 #34) the failure names the object */
                           onDeleteForever={(ids) => act(ids.length === 1 ? `delete the ${noun.one} forever` : `delete the ${noun.many} forever`, () => settle(p.onDeleteForever(ids)),
                             (v) => purgedLine(v, ids.length, ids.length === 1 ? `${deleted.find((t) => t.id === ids[0])?.title ?? Noun} deleted forever` : `${ids.length} ${noun.many} deleted forever`))}
                           /* (verify round 1, F129) the line says what happened — never "Trash emptied" while the rows stay */
                           onEmptyTrash={(expected) => act('empty the trash', () => settle(p.onEmptyTrash()), (v) => purgedLine(v, expected, 'Trash emptied'))} />
      {p.children}
    </>,
  )
}

/** (Contracts on the move, P-10 · C-01 · C-02 · C-03 · C-07 — his "please check and built accordingly" 2026-10-22) An entry, or a folder, as a
    row on a phone and a tablet held upright: a card of the page's width — the name 16/600 (up to two lines, clear of the ⋮ in the corner),
    the state as words at 14, the facts at 14 with the chevron that says the whole row opens. No checkbox (C-03): a hold selects where the
    bulk bar exists, and while anything is selected a tap selects too (the Quotes card's rule, use-long-press.ts). The ⋮ is the house icon
    button with its own 44 box. */
function MoveRow({ id, name, state, facts, place, folder = false, openLabel, selected, selectable, selectMode, onOpen, onToggle, menuOpen, onMenu, testId, menuTestId }: {
  id: string; name: string; state: string | null; facts: string; place: string | null; folder?: boolean; openLabel: string
  selected: boolean; selectable: boolean; selectMode: boolean; onOpen: () => void; onToggle: () => void
  menuOpen: boolean; onMenu: (el: HTMLElement) => void; testId: string; menuTestId: string
}) {
  const hold = useLongPress(onToggle, { enabled: selectable })
  return (
    <div className={styles.moveRow} role="listitem" data-testid={testId} data-template-id={folder ? undefined : id} data-folder-id={folder ? id : undefined} data-selected={selected || undefined} data-kb-row data-kb-id={id}>
      <button type="button" className={styles.moveOpen} aria-label={selectMode && selectable ? `${selected ? 'Unselect' : 'Select'} ${name}` : openLabel} aria-pressed={selectMode && selectable ? selected : undefined} data-kb-open
              onClick={() => { if (hold.swallowClick()) return; if (selectMode && selectable) onToggle(); else onOpen() }}
              onContextMenu={selectable ? (e) => e.preventDefault() : undefined} {...hold.handlers}>
        <span className={styles.moveName}>{folder ? <span className={styles.moveGlyph} aria-hidden><Icon name="folder" size={20} weight={300} /></span> : null}{name}</span>
        {state ? <span className={styles.moveState} data-testid="library-move-state">{state}</span> : null}
        <span className={styles.moveFacts}>
          <span className={styles.moveFactsText}>{place ? <><span className={styles.place}><Icon name="folder" size={14} weight={300} />{place}</span>{' · '}</> : null}{facts}</span>
          <span className={styles.moveChev} aria-hidden><Icon name="chevron_right" size={24} /></span>
        </span>
      </button>
      <span className={styles.moveKebab}>
        <Tooltip label={folder ? 'Folder actions' : 'More options'} disabled={menuOpen}>
          <IconButton icon="more_vert" label={folder ? `Actions for ${name}` : `More options for ${name}`} variant="bare" iconSize={24} iconWeight={300} aria-haspopup="menu" aria-expanded={menuOpen}
                      onClick={(e) => onMenu(e.currentTarget)} data-testid={menuTestId} />
        </Tooltip>
      </span>
    </div>
  )
}

/** The list view (REG-537 / REG-538): the quote templates list's stylesheet on the listing's table model — head 56, rows 60, frozen Template, resizable, draggable, the row kebab on hover with its side measured.
    (REG-653, price book parity Q-15) Sortable heads sort (↑ · ↓ · off); a list with bulk actions carries its selection in the frozen name cell — the listing's box (REG-614). */
function LibraryTable<T extends LibraryItem>({ kbNoun, frozenKebab = false, rows, now, tableKey, columns, extra, onReorder, glyph, chips, onOpen, menuFor, onMenu, ariaLabel, sort, sortable, onSort, openLabel, selection, place, folders = [], folderCount, onOpenFolder, folderMenuFor = null, onFolderMenu }: {
  /** (REG-713) the J / K list's noun ("Next template") */
  kbNoun?: string
  /** (Contracts on the move, P-10 · C-05 — opt-in) A touch tablet: the row's ⋮ is a frozen cell at the right (the Quotes table's rule, K4 —
      P-11), its head an empty cell over it, so the first screen carries the actions. */
  frozenKebab?: boolean
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
  const tracks = gridTemplateFor(columns, colWidths, undefined, ACTIONS_TRAIL.kebab)
  const headRow = useRef<HTMLDivElement>(null)
  const L0 = useColumnLayout(columns, headRow)
  const D = useColumnDrag(columns, onReorder)
  const L = { ...L0, style: (key: string) => ({ ...L0.style(key), ...D.style(key) }) }   /* (REG-614) every cell rides the drag's transform, so the whole column travels — the Items grid's rule (REG-572) */
  const [frame, overflowing] = useOverflowX()
  const ids = [...folders.map((f) => f.id), ...rows.map((t) => t.id)]
  const allOn = !!selection && ids.length > 0 && ids.every((id) => selection.selected.has(id))
  const someOn = !!selection && ids.some((id) => selection.selected.has(id))
  return (
    <div ref={frame} className={table.card} role="table" data-drag-root="" aria-label={ariaLabel} data-cols={tableKey} data-kb-list={kbNoun ?? 'item'} data-overflow={overflowing || undefined} data-testid="library-table" data-frozen-kebab={frozenKebab || undefined}
         style={{ '--tracks': tracks } as React.CSSProperties} onScroll={(e) => { const el = e.currentTarget; el.toggleAttribute('data-scrolled', el.scrollLeft > 0); if (frozenKebab) el.toggleAttribute('data-at-end', el.scrollLeft + el.clientWidth >= el.scrollWidth - 1) }}>
      <div ref={headRow} className={table.head} role="row">
        {frozenKebab ? <div className={`${table.hCell} ${styles.hActions}`} role="columnheader" aria-label="Actions" data-col="actions" data-testid="library-actions-head" /> : null}
        {columns.map((c) => (
          <div key={c.key} className={`${table.hCell} ${c.key === 'name' ? table.colName : ''} ${c.pinned ? table.pin : ''}`} role="columnheader" data-col={c.key} data-pin-edge={L.edge(c.key) || undefined} style={L.style(c.key)} {...D.head(c.key)}
               aria-sort={sort?.key === c.key ? (sort.dir === 1 ? 'ascending' : 'descending') : undefined}>
            {c.key === 'name' && selection ? <span className={styles.selBox} data-kb-select-all><Checkbox isSelected={allOn} isIndeterminate={!allOn && someOn} isDisabled={ids.length === 0} onChange={(on: boolean) => selection.all(on)} aria-label="Select all" /></span> : null}
            {sortable(c.key) ? <button type="button" className={`${table.hSort} ${styles.hSort}`} onClick={() => onSort(c.key)} data-sorted={sort?.key === c.key || undefined}><span className={table.hLabel}>{c.label}</span><Icon name={sort?.key === c.key ? (sort.dir === 1 ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'} size={16} /></button> : <span className={table.hLabel}>{c.label}</span>}
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
          if (key === 'name') return cell('name', <>{selection ? <span className={styles.selBox} data-kb-select><Checkbox isSelected={selection.selected.has(f.id)} onChange={() => selection.toggle(f.id)} aria-label={`Select ${f.name}`} /></span> : null}<span className={table.thumb} aria-hidden><Icon name="folder" size={20} weight={300} /></span><Tooltip label={f.name} whenCut><button type="button" className={table.name} onClick={() => onOpenFolder?.(f)} aria-label={`Open ${f.name}`} data-kb-open>{f.name}</button></Tooltip><span className={styles.folderCount}>{folderCount?.(f)}</span></>, table.colName)
          if (key === 'updated') return cell('updated', ago(f.updatedAt, now))
          return cell(key, '')
        }
        return (
          <div key={f.id} className={frozenKebab ? `${table.row} ${styles.frozenRow}` : table.row} role="row" data-testid="library-folder-row" data-kb-row data-kb-id={f.id} data-selected={selection?.selected.has(f.id) || undefined}>
            {columns.map((c) => <Fragment key={c.key}>{render(c.key)}</Fragment>)}
            {onFolderMenu ? (
              <span className={frozenKebab ? `${table.actions} ${styles.frozenActions}` : table.actions} data-open={open || undefined}>
                <span className={frozenKebab ? `${table.actionsInner} ${styles.frozenInner}` : table.actionsInner}>
                  <span className={table.menuWrap}>
                    <span className={frozenKebab ? `${table.float} ${styles.frozenFloat}` : table.float}>
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
          if (key === 'name') return cell('name', <>{selection ? <span className={styles.selBox} data-kb-select><Checkbox isSelected={selection.selected.has(t.id)} onChange={() => selection.toggle(t.id)} aria-label={`Select ${t.title}`} /></span> : null}<span className={table.thumb} aria-hidden>{glyph(t)}</span><Tooltip label={t.title} whenCut><button type="button" className={table.name} onClick={() => onOpen(t)} aria-label={`${openLabel(t)} ${t.title}`} data-kb-open>{t.title}</button></Tooltip>{chips?.(t)}{place && place(t) ? <span className={styles.folderCount}><Icon name="folder" size={14} weight={300} /> {place(t)}</span> : null}</>, table.colName)
          if (key === 'updated') return cell('updated', ago(t.updatedAt.getTime(), now))
          if (key === 'by') return cell('by', t.author ? <><Avatar name={t.author} color={t.authorColor ?? 'var(--om-color-on-surface-secondary)'} size={24} tooltip={false} /><span className={table.oneLine}>{t.author}</span></> : '--', table.colBy)
          const c = extra.find((x) => x.key === key)
          return c ? cell(key, c.cell(t)) : null
        }
        return (
          <div key={t.id} className={frozenKebab ? `${table.row} ${styles.frozenRow}` : table.row} role="row" data-testid="library-row" data-kb-row data-kb-id={t.id} data-selected={selection?.selected.has(t.id) || undefined}>
            {columns.map((c) => <Fragment key={c.key}>{render(c.key)}</Fragment>)}
            <span className={frozenKebab ? `${table.actions} ${styles.frozenActions}` : table.actions} data-open={open || undefined}>
              <span className={frozenKebab ? `${table.actionsInner} ${styles.frozenInner}` : table.actionsInner}>
                <span className={table.menuWrap}>
                  <span className={frozenKebab ? `${table.float} ${styles.frozenFloat}` : table.float}>
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
