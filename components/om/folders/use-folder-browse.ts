'use client'

import { useState } from 'react'
import { countLine, foldersIn, foldersUnder, placeOf, trailTo, type FolderNode } from '@/lib/folders'

/**
 * (REG-664) Browsing a library's folders inside a picker — the gallery's rules in one hook: the open folder (starting where `startId`'s
 * entry lives, else the top), its folders first (only those with something to pick at any depth), then what it holds; `pinned` entries
 * (a studio default) stay at the top wherever they are filed; a search looks in every folder, flat, and `where` names each hit's folder.
 */
export function useFolderBrowse<T extends { id: string; folderId?: string | null }>(folders: FolderNode[], entries: T[], opts: { query: string; startId?: string | null; pinned?: (t: T) => boolean }) {
  const inFolder = (e: T) => (e.folderId && folders.some((f) => f.id === e.folderId) ? e.folderId : null)
  const [at, setAt] = useState<string | null>(() => { const e = opts.startId ? entries.find((x) => x.id === opts.startId) : undefined; return e && !opts.pinned?.(e) ? inFolder(e) : null })
  const openAt = at && folders.some((f) => f.id === at) ? at : null
  const finding = opts.query.trim() !== ''
  const hasAny = (f: FolderNode) => { const ids = new Set([f.id, ...foldersUnder(folders, f.id)]); return entries.some((e) => { const p = inFolder(e); return !!p && ids.has(p) }) }
  const hereFolders = finding ? [] : foldersIn(folders, openAt).filter(hasAny)
  const here = entries.filter((e) => inFolder(e) === openAt)
  const pinned = !finding && openAt === null && opts.pinned ? entries.filter((e) => opts.pinned!(e) && !here.includes(e)) : []
  const hereEntries = finding ? entries : [...pinned, ...here]
  /** "HDB / 4-room" where it is not already obvious (a search hit, a pinned default filed away), else ''. */
  const where = (e: T) => { const p = inFolder(e); return p && (finding || p !== openAt) ? placeOf(folders, p) : '' }
  const holds = (f: FolderNode, one: string, many: string) => {
    const n = entries.filter((e) => inFolder(e) === f.id).length, subs = foldersIn(folders, f.id).filter(hasAny).length
    return [n || !subs ? countLine(n, one, many) : null, subs ? countLine(subs, 'folder', 'folders') : null].filter(Boolean).join(' · ')
  }
  return { openAt, go: setAt, trail: trailTo(folders, openAt), hereFolders, hereEntries, where, holds, finding }
}
