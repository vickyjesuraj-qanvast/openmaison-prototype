import type { LeadFile, Member } from '@/lib/db/schema'
import { displayDateLong, parseInputDate, startOfDay } from '@/lib/format'
import { filterByQuery } from '@/lib/search'

/* Lead Details › Files (931-39056) — pure model shared by the grid, the list, the move dialog and the viewer. */

/** A file or folder row with what the views need beside the record. */
export type FileRow = LeadFile & {
  owner: Member | null
  commentCount: number
  /** "Attached to" (931:40181): what holds the file — a task, a note or a lead return (Task first when several do). */
  attachedTo: 'Task' | 'Note' | 'Return' | null
  /** Folders: direct children (files + folders) that are not trashed → "17 items". */
  itemCount: number
  /** (UX audit 2026-09-30, T9) The client's read-only link, as a path (`/f/<id>.<signature>`) — null for a folder, a trashed file, or an app
      with no signing secret. */
  share: string | null
  /** (fix-A, A-19) A project's own folder (Payments · Site updates · Choices): why it keeps its name and place; null for any other row. */
  system?: string | null
  /** (gaps build E, item 1) The file's own bytes are kept — Download gives them and the viewer opens them (/files/raw/<id>). False for a
      folder, a stand-in the demo carries in /public, and an invoice's or a receipt's entry (it opens the record's own page). */
  bytes?: boolean
  /** (pending modules S07 — the steps' note after S05) A money paper's entry — an invoice's, a receipt's, a credit note's, a selection receipt's:
      its page's address. It holds no bytes of its own; Open and Download both go to the paper the client sees (Download prints it). */
  paper?: string | null
}

/* ── (S42 audit C-03, call C·4 as recommended — his "build all of them" 2026-10-11; listed in s42/calls-for-vicky.md for his review) A money
      paper stays with its record ─────────────────────────────────────────────────────────────────────────────────────────────────── */
/** (pending modules S06) Accounting reads a project's files — every change is the team's (app/leads/files-actions.ts); (S46D) said by the contract
    import too, when a file of Files is asked to become a contract *(invented copy — S06)* */
export const FILES_READ_RULE = 'Accounting reads a project’s files — its team uploads and changes them'

/** What a money paper's entry is, from its page's address (`/projects/<id>/<kind>/<id>`) — the words its rule says. */
export function paperKindOf(paper: string): string {
  const k = paper.split('?')[0]!.split('/')[3]
  return k === 'invoices' ? 'invoice' : k === 'receipts' ? 'receipt' : k === 'credit-notes' ? 'credit note' : k === 'selection-receipts' ? 'selection receipt' : 'paper'
}
/** Why a money paper's entry is neither duplicated, renamed, moved nor deleted (S03's rule for a contract's kept PDF): it IS its record's
    paper — a copy would hold nothing, another name or place would lose it. Open, Download, Copy link, Send on WhatsApp and Show to client stay.
    *(invented copy)* */
export const paperRule = (name: string, paper: string) => { const k = paperKindOf(paper); return `${name} is the ${k}’s own copy — it stays while the ${k} does` }

/* ── (gaps build E, item 1) Every file kept: its real kind, type and glyph ─────────────────────────────────────────────────────────── */

/** What one upload may weigh: its bytes travel inside the action's one object under the 12 MB body (next.config.ts) — 8 MB of file. */
export const FILE_UPLOAD_MAX = 8 * 1024 * 1024
/** The refusal for a file over the cap, in the update composer's words (REG-951). */
export const tooBigLine = (name: string) => `${name} is over 8 MB — a smaller file fits`

const EXT = (name: string) => (/\.([a-z0-9]{1,6})$/i.exec(name)?.[1] ?? '').toLowerCase()
const WORD = new Set(['doc', 'docx', 'rtf', 'odt', 'pages', 'txt', 'md'])
const SHEET = new Set(['xls', 'xlsx', 'xlsm', 'csv', 'ods', 'numbers', 'tsv'])
const SLIDES = new Set(['ppt', 'pptx', 'key', 'odp'])
const CAD = new Set(['dwg', 'dxf', 'dwf', 'rvt', 'rfa', 'ifc', 'dgn', 'vwx'])
const MODEL = new Set(['skp', '3dm', 'obj', 'stl', 'fbx', 'glb', 'gltf', '3ds', 'max', 'usdz'])
const VIDEO = new Set(['mp4', 'mov', 'm4v', 'webm', 'avi', 'mkv'])
const PICTURE = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif', 'tif', 'tiff', 'bmp'])
/** The types a browser may leave blank (CAD, SketchUp) or name loosely, from the name's extension. */
const MIME_BY_EXT: Record<string, string> = {
  pdf: 'application/pdf', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', csv: 'text/csv',
  ppt: 'application/vnd.ms-powerpoint', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  txt: 'text/plain', rtf: 'application/rtf', dwg: 'image/vnd.dwg', dxf: 'image/vnd.dxf', skp: 'application/vnd.sketchup.skp',
  mp4: 'video/mp4', mov: 'video/quicktime', m4v: 'video/x-m4v', webm: 'video/webm', zip: 'application/zip',
  mp3: 'audio/mpeg', m4a: 'audio/mp4', wav: 'audio/wav', ogg: 'audio/ogg', aac: 'audio/aac',   // (S43E W3-01) a meeting's recording
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', heic: 'image/heic', heif: 'image/heif',
}
/** A file's type as kept: the browser's when it named one, else the extension's, else a plain run of bytes. */
export function mimeFor(name: string, mime: string | null | undefined): string {
  const m = (mime ?? '').toLowerCase().trim()
  if (m && m !== 'application/octet-stream') return m
  return MIME_BY_EXT[EXT(name)] ?? 'application/octet-stream'
}
/** The row's kind — what the grid, the viewer and Activity branch on: a picture, a PDF, a video, or any other document (Word, Excel,
    PowerPoint, CAD, a 3D model …). A drawing's own type (`image/vnd.dwg`) is not a picture a browser can show. */
export function fileKindOf(name: string, mime: string | null | undefined): 'image' | 'pdf' | 'video' | 'doc' {
  const m = mimeFor(name, mime), ext = EXT(name)
  if (m === 'application/pdf' || ext === 'pdf') return 'pdf'
  if (m.startsWith('video/') || VIDEO.has(ext)) return 'video'
  if (!m.startsWith('image/vnd.') && !CAD.has(ext) && (m.startsWith('image/') || PICTURE.has(ext))) return 'image'
  return 'doc'
}
/** The glyph a file wears where it has no picture (the grid's box, the list's square, the viewer, the Move dialog): one per kind of work. */
export function fileGlyph(f: Pick<LeadFile, 'kind' | 'mime' | 'name'>): string {
  if (f.kind === 'folder') return 'folder'
  if (f.kind === 'pdf' || f.mime === 'application/pdf') return 'picture_as_pdf'
  if (f.kind === 'video' || (f.mime ?? '').startsWith('video/')) return 'photo_camera'   // (REG-950) a video's glyph
  if (f.kind === 'image') return 'image'
  if ((f.mime ?? '').startsWith('audio/')) return 'mic'   // (S43E W3-01) a meeting's recording
  const ext = EXT(f.name)
  if (SHEET.has(ext)) return 'table_chart'
  if (SLIDES.has(ext)) return 'space_dashboard'
  if (CAD.has(ext)) return 'design_services'
  if (MODEL.has(ext)) return 'view_in_ar'
  if (WORD.has(ext)) return 'description'
  return 'draft'
}
/** A name that downloads with its extension: "Q-101" holding a PNG saves as "Q-101.png". */
export function downloadName(name: string, mime: string | null | undefined): string {
  if (EXT(name)) return name
  const ext = Object.entries(MIME_BY_EXT).find(([, m]) => m === (mime ?? '').toLowerCase())?.[0]
  return ext ? `${name}.${ext === 'jpeg' ? 'jpg' : ext}` : name
}

/* ── (gaps build E, item 4) Starter folders ─────────────────────────────────────────────────────────────────────────────────────────── */

/** The folders a new project's Files opens with, beside the ones it files into by itself (`SYSTEM_FOLDERS`) — 1.0's set (H-14), the studio's
    own to rename, move or delete. `also`: a folder the studio already keeps under another name stands for it (A's Getting started files a
    signed contract in "Contract"). */
export const STARTER_FOLDERS: readonly { name: string; also?: readonly string[] }[] = [
  { name: 'Contract & VOs', also: ['Contract', 'Contracts', 'Contract/VO', 'Variation Orders'] },
  { name: 'Floor plans', also: ['Floor Plan', 'Floor Plans', 'Floorplans'] },
  { name: 'Renders' },
  { name: 'Quotes & BOQ', also: ['Quotes', 'BOQ'] },
  { name: 'Site photos', also: ['Site Photos', 'Photos'] },
]
/** Where a project's signed contract is filed (A's Getting started › Contract): the starter folder, else an older "Contract". */
export const CONTRACT_FOLDERS = ['Contract & VOs', 'Contract'] as const
/** (pending modules S05) Where the Quote Sent step's uploaded quote is kept: the starter folder, else one the studio keeps under its older names. */
export const QUOTE_FOLDERS = ['Quotes & BOQ', 'Quotes', 'BOQ'] as const
/** The starter folders a lead's Files still lacks — never one the studio already made (a live root folder of that name, or one it stands for). */
export function missingStarters(rootFolders: { name: string }[]): string[] {
  const have = new Set(rootFolders.map((f) => f.name.trim().toLowerCase()))
  return STARTER_FOLDERS.filter((s) => ![s.name, ...(s.also ?? [])].some((n) => have.has(n.toLowerCase()))).map((s) => s.name)
}

export const isFolder = (f: Pick<LeadFile, 'kind'>) => f.kind === 'folder'

/** (fix-A, A-19) The folders a project files into by itself — found at the root of its Files by these names (lib/projects/payments.ts,
    updates.ts, choices.ts), so they keep their name and place: no Rename, Move, Duplicate or Delete, the rows say why. */
export const SYSTEM_FOLDERS: Readonly<Record<string, string>> = {
  Payments: 'The project files its receipts here',
  'Site updates': 'The project files its update photos and videos here',
  Choices: 'The project files its choice pictures here',
}
export const systemFolderReason = (f: Pick<LeadFile, 'kind' | 'name' | 'parentId'>, hasProject: boolean): string | null =>
  (hasProject && f.kind === 'folder' && !f.parentId ? SYSTEM_FOLDERS[f.name] ?? null : null)
export const systemFolderRule = (name: string, reason: string) => `${name} keeps its name and place — ${reason.charAt(0).toLowerCase()}${reason.slice(1)}`

/** "File type" column / Information panel: JPEG · PDF · Folder (931:40181, 931:40004, frame 104 "Folder"). */
export function fileTypeLabel(f: Pick<LeadFile, 'kind' | 'mime' | 'name'>): string {
  if (f.kind === 'folder') return 'Folder'
  const m = (f.mime ?? '').toLowerCase()
  if (m === 'image/jpeg' || m === 'image/jpg') return 'JPEG'
  if (m === 'image/png') return 'PNG'
  if (m === 'application/pdf' || f.kind === 'pdf') return 'PDF'
  const ext = f.name.split('.').pop()
  return ext && ext !== f.name ? ext.toUpperCase() : 'File'
}

/** Direct children of a folder (null = the root), untrashed, in creation order. */
export const childrenOf = <T extends LeadFile>(files: T[], parentId: string | null): T[] =>
  files.filter((f) => (f.parentId ?? null) === parentId && !f.deletedAt)

/** Every descendant id of a folder (for trash / restore / delete-forever cascades and to keep a folder out of itself in Move). */
export function descendantIds(files: LeadFile[], folderId: string): string[] {
  const out: string[] = []
  const walk = (pid: string) => { for (const f of files) if (f.parentId === pid) { out.push(f.id); if (f.kind === 'folder') walk(f.id) } }
  walk(folderId)
  return out
}

/** Folder chain from the root down to `folderId` (excluded when null) — the breadcrumb / "Current location". */
export function folderPath<T extends LeadFile>(files: T[], folderId: string | null): T[] {
  const path: T[] = []
  let cur = folderId ? files.find((f) => f.id === folderId) : undefined
  while (cur) { path.unshift(cur); cur = cur.parentId ? files.find((f) => f.id === cur!.parentId) : undefined }
  return path
}

/** Grid date groups (931:39120): one per calendar day of `createdAt`, newest day first — "Friday, 17 Jul ’26". */
export function groupByDay<T extends LeadFile>(files: T[]): { day: number; label: string; files: T[] }[] {
  const map = new Map<number, T[]>()
  for (const f of files) { const d = startOfDay(f.createdAt); const list = map.get(d); if (list) list.push(f); else map.set(d, [f]) }
  return [...map.entries()].sort((a, b) => b[0] - a[0]).map(([day, list]) => ({ day, label: displayDateLong(new Date(day)), files: list }))   // (the calm UI build 2026-10-27 — T-11 · 2-24) the house date, "Mon, 7 Sep ’26" — the long weekday ("Monday, 7 Sep ’26") was the grid’s alone
}

/**
 * Search across every folder — a hit outside the open folder is still a hit — over what the row / tile prints
 * (REG-274, user 2026-09-01 "look at the other pages"): name · owner name (the Owner cell, not the member id) ·
 * file type label ("JPEG" / "PDF" / "Folder", the same `fileTypeLabel` the File type cell prints) · "Attached to"
 * ("Task" / "Note" / "Return"). The name was the only searchable field before, so a file could not be found by its
 * owner or its type. One helper serves both views (the grid and the list read the same rows).
 * The generic stays open so a caller holding bare `LeadFile` rows still type-checks — those simply carry no owner or
 * attachment to match on.
 */
export function searchFiles<T extends LeadFile & Partial<Pick<FileRow, 'owner' | 'attachedTo'>>>(files: T[], query: string): T[] {
  return filterByQuery(files, query, (f) => ({
    fields: [f.name, f.owner?.name, fileTypeLabel(f), f.attachedTo],
  }))
}

/* ── (UX audit 2026-09-30, T9) Files › Filters: Type · Owner · Updated — the Tasks filter modal's panes (REG-464, live) ── */
export type FileFilters = {
  /** File type labels as the File type column prints them (fileTypeLabel): "JPEG" · "PNG" · "PDF" · "Folder" … */
  types: string[]
  /** Owner member ids. */
  owners: string[]
  /** d/m/yyyy (DateField — picked, never typed, REG-119) — the last change's day, from and to. */
  from: string
  to: string
}
export const EMPTY_FILE_FILTERS: FileFilters = { types: [], owners: [], from: '', to: '' }
export const activeFileGroups = (f: FileFilters) => ({ types: f.types.length > 0, owners: f.owners.length > 0, updated: !!(parseInputDate(f.from) || parseInputDate(f.to)) })
export const activeFileFilterCount = (f: FileFilters) => Object.values(activeFileGroups(f)).filter(Boolean).length
/** The type labels a lead's files carry, in the column's words — the Type pane's chips. */
export const fileTypesIn = (files: Pick<LeadFile, 'kind' | 'mime' | 'name'>[]) => [...new Set(files.map(fileTypeLabel))].sort((a, b) => (a === 'Folder' ? -1 : b === 'Folder' ? 1 : a.localeCompare(b)))
/** Rows that pass every active group; Updated reads the last change (the upload when nothing changed since). */
export function applyFileFilters<T extends LeadFile>(rows: T[], f: FileFilters): T[] {
  const from = parseInputDate(f.from)?.getTime() ?? null
  const toDay = parseInputDate(f.to)
  const to = toDay ? toDay.getTime() + 86_400_000 : null
  return rows.filter((r) => {
    if (f.types.length && !f.types.includes(fileTypeLabel(r))) return false
    if (f.owners.length && (!r.ownerId || !f.owners.includes(r.ownerId))) return false
    const at = (r.updatedAt ?? r.createdAt).getTime()
    if (from !== null && at < from) return false
    if (to !== null && at >= to) return false
    return true
  })
}

/* ── (pending modules S05 — card held:leads, "Coming soon sort on the Tasks and Files table heads … revisit: the listing and galleries sort")
   The list view's heads that kept their glyph (REG-468): Title, Updated and File size cycle A→Z, Z→A, off — the Contracts / Quotes heads' model
   (S03 · S04). Folders stay first (REG-664) and sort among themselves; a folder has no size, so a size order keeps them as they were. ── */
export const FILE_SORT_KEYS = ['title', 'updated', 'size'] as const
export type FileSortKey = (typeof FILE_SORT_KEYS)[number]
export type FileHeadSort = { key: FileSortKey; dir: 'asc' | 'desc' } | null
export const isFileSortKey = (k: string): k is FileSortKey => (FILE_SORT_KEYS as readonly string[]).includes(k)
export const nextFileHeadSort = (s: FileHeadSort, key: FileSortKey): FileHeadSort => (s?.key !== key ? { key, dir: 'asc' } : s.dir === 'asc' ? { key, dir: 'desc' } : null)
export const fileHeadWords = (key: FileSortKey, dir: 'asc' | 'desc') => (key === 'title' ? (dir === 'asc' ? 'A to Z' : 'Z to A') : key === 'updated' ? (dir === 'asc' ? 'oldest first' : 'newest first') : dir === 'asc' ? 'smallest first' : 'largest first')
export function sortFilesByHead<T extends Pick<LeadFile, 'kind' | 'name' | 'updatedAt' | 'createdAt' | 'sizeBytes'>>(rows: T[], sort: FileHeadSort): T[] {
  if (!sort) return rows
  const sign = sort.dir === 'asc' ? 1 : -1
  const by = (list: T[]) => list.map((r, i) => ({ r, i })).sort((a, b) => {
    if (sort.key === 'title') return a.r.name.localeCompare(b.r.name, undefined, { numeric: true, sensitivity: 'base' }) * sign || a.i - b.i
    if (sort.key === 'updated') return ((a.r.updatedAt ?? a.r.createdAt).getTime() - (b.r.updatedAt ?? b.r.createdAt).getTime()) * sign || a.i - b.i
    if (isFolder(a.r) || isFolder(b.r)) return a.i - b.i
    return ((a.r.sizeBytes ?? 0) - (b.r.sizeBytes ?? 0)) * sign || a.i - b.i
  }).map((x) => x.r)
  return [...by(rows.filter(isFolder)), ...by(rows.filter((f) => !isFolder(f)))]
}
