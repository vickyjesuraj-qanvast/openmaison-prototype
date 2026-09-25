import { MSG } from '@/lib/forms'

/*
 * (REG-664) Folders — one pure model for every place that files things: the lead's Files tab (REG-181) and every library a studio
 * builds up (the five template tabs, the Price book's My Items and My Sections). A folder sits at the top (`parentId` null) or inside
 * another, at any depth, as the Files tab's do; an entry names its folder the same way.
 */

export type FolderNode = { id: string; name: string; parentId: string | null }

/** The folders directly inside `parentId` (null = the top), in the order given. */
export const foldersIn = <T extends FolderNode>(folders: T[], parentId: string | null): T[] =>
  folders.filter((f) => (f.parentId ?? null) === parentId)

/** The chain from the top down to `id`, `id` included; empty at the top or for an id that no longer resolves. */
export function trailTo<T extends FolderNode>(folders: T[], id: string | null): T[] {
  const out: T[] = []
  const seen = new Set<string>()
  let cur = id ? folders.find((f) => f.id === id) : undefined
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id); out.unshift(cur)
    const pid = cur.parentId
    cur = pid ? folders.find((f) => f.id === pid) : undefined
  }
  return out
}

/** Every folder inside `id`, at any depth — a folder never moves into itself or anything under it. */
export function foldersUnder(folders: FolderNode[], id: string): string[] {
  const out: string[] = []
  const walk = (pid: string) => { for (const f of folders) if (f.parentId === pid && !out.includes(f.id)) { out.push(f.id); walk(f.id) } }
  walk(id)
  return out
}

/** Where something lives, for a search result: "HDB / 4-room"; '' at the top. */
export const placeOf = (folders: FolderNode[], id: string | null): string => trailTo(folders, id).map((f) => f.name).join(' / ')

/** A folder id that still resolves, else null (the top) — a link to a folder since deleted lands at the top, as the Files tab's does. */
export const liveFolder = <T extends FolderNode>(folders: T[], id: string | null | undefined): T | null =>
  id ? folders.find((f) => f.id === id) ?? null : null

export const FOLDER_NAME_MAX = 60

/** Why a folder can't take this name, else null: it is required, at most 60 characters, and not a sibling's name (case aside). */
export function folderNameProblem(name: string, siblings: FolderNode[], selfId?: string | null): string | null {
  const n = name.trim()
  if (!n) return MSG.required
  if (n.length > FOLDER_NAME_MAX) return MSG.folderLength
  if (siblings.some((f) => f.id !== selfId && f.name.trim().toLowerCase() === n.toLowerCase())) return MSG.folderTaken
  return null
}

/** "1 template" · "3 items" — a folder card's count. */
export const countLine = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`
