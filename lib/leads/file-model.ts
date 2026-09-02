import type { LeadFile, Member } from '@/lib/db/schema'
import { displayDateWeekday, startOfDay } from '@/lib/format'
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
}

export const isFolder = (f: Pick<LeadFile, 'kind'>) => f.kind === 'folder'

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
  return [...map.entries()].sort((a, b) => b[0] - a[0]).map(([day, list]) => ({ day, label: displayDateWeekday(new Date(day)), files: list }))
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
