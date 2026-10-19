'use server'

import { randomUUID } from 'node:crypto'
import { firstWords, logLeadEvent } from '@/lib/leads/events'
import { revalidatePath } from 'next/cache'
import { and, asc, eq, inArray, isNotNull, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { fileComments, leadFileRenders, leadFiles, leads, members, type LeadFile } from '@/lib/db/schema'
import { sessionMemberId } from '@/lib/db/session'
import { notify } from '@/lib/notifications/emit'
import { leadMemberIds } from '@/lib/notifications/queries'
import { FILES_READ_RULE, FILE_UPLOAD_MAX, descendantIds, fileKindOf, mimeFor, paperRule, systemFolderReason, systemFolderRule, tooBigLine } from '@/lib/leads/file-model'
import { moneyPapersOf } from '@/lib/leads/files'   // (S42 audit C-03)
import { DATA_URL, PICTURE_URL, copyStored, dataUrlSize, imageAddress, keepBytes, keepThumb, thumbAddress } from '@/lib/leads/file-store'
import { contractsKeeping } from '@/lib/contracts/files'
import { canOpenLead, fetchViewer } from '@/lib/leads/visibility'
import { isAccounting } from '@/lib/settings/roles'
import { hiddenMoneyFiles } from '@/lib/projects/money-visibility'
import { projects } from '@/lib/db/schema'   // (fix-A, A-19)
import { folderNameProblem } from '@/lib/folders'
import { revalidateLead } from '@/lib/leads/queries'

/* Lead Details › Files (931-39056). Every action revalidates the lead's pages; the client calls router.refresh() as well. */

type Refusal = { error: string }
/* (REG-286 · REG-667 · pending modules S43A) Every write stamp is the signed-in member — this browser's (`sessionMemberId()`), read before a
   transaction opens and passed in as a value. */
/**
 * (REG-286) One shared eviction for every detail tab — this helper named Files and Tasks by hand but never Notes,
 * the return details modal or Activity, all of which show the lead's files. `fileIds` additionally clears the
 * viewer route `/leads/{lead}/files/{file}`, which is a page of its own and was refreshed for comments only.
 */
const touch = (leadId: string, ...fileIds: string[]) => {
  revalidateLead(leadId)
  for (const f of fileIds) revalidatePath(`/leads/${leadId}/files/${f}`)
}

/* ── (gaps build E, item 2) Who sees leads on every file action ─────────────────────────────────────────────────────────────────────
   The pages already asked (a lead the member may not open answers not found), but the actions took any id: now each one asks again on the
   server — the lead must be one the signed-in member may open (REG-601, `canOpenLead`), every file named must be that lead's, and a
   project's money files (Files › Payments, a client's proof, a receipt, an invoice) are for whoever sees its money (fix-D, D-04 · F-17).
   A refusal says the rule in the house words (app/portal/studio-actions.ts `setFilesShown`). */
const NOT_YOURS = 'This lead isn’t one you can open'
const GONE = 'That file isn’t there any more'
const MONEY_FILE = 'That file is part of the project’s money — only whoever sees its money can change it'
async function mayOpenLead(leadId: string | null): Promise<Refusal | null> {
  if (!leadId) return { error: GONE }
  const [l] = await db.select({ id: leads.id }).from(leads).where(eq(leads.id, leadId)).limit(1)
  if (!l) return { error: 'The lead is gone' }
  return (await canOpenLead(await fetchViewer(), leadId)) ? null : { error: NOT_YOURS }
}
/** The one lead the named files belong to, once Who sees leads (and the money rule) let this member act on them. */
async function filesOf(fileIds: string[]): Promise<{ leadId: string } | Refusal> {
  const ids = [...new Set(fileIds.filter((id) => typeof id === 'string' && id))]
  if (!ids.length) return { error: GONE }
  const rows = await db.select({ id: leadFiles.id, leadId: leadFiles.leadId }).from(leadFiles).where(inArray(leadFiles.id, ids))
  const leadIds = [...new Set(rows.map((r) => r.leadId))]
  if (!rows.length || leadIds.length !== 1) return { error: GONE }   // a file of another lead never rides along
  const leadId = leadIds[0]!
  const viewer = await fetchViewer()
  if (!(await canOpenLead(viewer, leadId))) return { error: NOT_YOURS }
  const hidden = await hiddenMoneyFiles(leadId, viewer)
  if (ids.some((id) => hidden.has(id))) return { error: MONEY_FILE }
  return { leadId }
}
const isRefusal = (r: unknown): r is Refusal => !!r && typeof r === 'object' && 'error' in r
/* (pending modules S06 — the Accounting role's open question 3, as recommended: the card's "a bookkeeper can delete project files") Accounting
   opens a project's Files to read a proof, an invoice or a bill — read-only: every change here (upload, folders, rename, move, duplicate,
   delete, restore, comments) is the team's. The Files tab draws no control that would be refused (`LeadFilesData.readOnly`). */
async function readsOnly(): Promise<Refusal | null> { return isAccounting((await fetchViewer()).role) ? { error: FILES_READ_RULE } : null }

/** (fix-A, A-19) A project files its receipts, update photos and choice pictures into its own root folders, found by name — so those keep
    their name and place: renaming, moving, duplicating or deleting one is refused with the reason. */
const refuseSystemFolders = async (leadId: string, rows: Pick<LeadFile, 'kind' | 'name' | 'parentId'>[]): Promise<{ error: string } | null> => {
  if (!rows.some((f) => systemFolderReason(f, true))) return null
  const [p] = await db.select({ id: projects.id }).from(projects).where(eq(projects.leadId, leadId)).limit(1)
  const hit = p ? rows.find((f) => systemFolderReason(f, true)) : null
  return hit ? { error: systemFolderRule(hit.name, systemFolderReason(hit, true)!) } : null
}
const allOf = (leadId: string) => db.select().from(leadFiles).where(eq(leadFiles.leadId, leadId))
/** (S42 audit C-03, call C·4) A money paper's entry — an invoice's, a receipt's, a credit note's, a selection receipt's — stays as it was
    filed: no copy (it would hold nothing), no other name or place, no trash. Among `ids`, the first one that is one says why. */
async function refusePapers(ids: string[]): Promise<Refusal | null> {
  if (!ids.length) return null
  const papers = await moneyPapersOf(ids)
  const hit = ids.find((id) => papers.has(id))
  if (!hit) return null
  const [f] = await db.select({ name: leadFiles.name }).from(leadFiles).where(eq(leadFiles.id, hit)).limit(1)
  return { error: paperRule(f?.name ?? 'This file', papers.get(hit)!) }
}
/**
 * ids + the descendants of any folder among them that pass `follow(descendant, folder)` — folders carry their contents
 * through trash / restore / delete, but an item the user trashed on its own (its own row in Deleted Files) is neither
 * re-stamped by trashing its folder nor pulled back by restoring it.
 */
const withDescendants = async (leadId: string, ids: string[], follow: (f: LeadFile, folder: LeadFile) => boolean) => {
  const all = await allOf(leadId)
  const set = new Set(ids)
  for (const id of ids) {
    const f = all.find((x) => x.id === id); if (f?.kind !== 'folder') continue
    for (const d of descendantIds(all, id)) { const c = all.find((x) => x.id === d); if (c && follow(c, f)) set.add(d) }
  }
  return [...set]
}
/** Trashed in the same `trashFiles` call as the folder (one timestamp for the whole cascade). */
const trashedTogether = (f: LeadFile, folder: LeadFile) => !!f.deletedAt && !!folder.deletedAt && f.deletedAt.getTime() === folder.deletedAt.getTime()

/** (REG-664) The lead's live folders beside `parentId` — a new or renamed folder's name must differ from theirs (lib/folders.ts). */
const siblingFolders = async (leadId: string, parentId: string | null) =>
  (await allOf(leadId)).filter((f) => f.kind === 'folder' && !f.deletedAt && (f.parentId ?? null) === parentId).map((f) => ({ id: f.id, name: f.name, parentId: f.parentId ?? null }))

/** Create Folder (931:39191) — at the root or inside `parentId`. Returns the new id. (REG-664) The name is checked as the dialog checks it. */
export async function createFolder(leadId: string, name: string, parentId: string | null = null): Promise<string | Refusal> {
  const ro = await readsOnly(); if (ro) return ro   // (pending modules S06) Accounting reads only
  const shut = await mayOpenLead(leadId); if (shut) return shut   // (gaps build E, item 2)
  if (parentId) { const p = await filesOf([parentId]); if (isRefusal(p)) return p; if (p.leadId !== leadId) return { error: GONE } }
  const problem = folderNameProblem(name, await siblingFolders(leadId, parentId)); if (problem) return { error: problem }
  const id = randomUUID(); const now = new Date()
  await db.insert(leadFiles).values({ id, leadId, kind: 'folder', name: name.trim(), thumb: null, createdAt: now, parentId, ownerId: await sessionMemberId(), updatedAt: now })
  touch(leadId); return id
}

/**
 * New File › From Local Files / Upload Files / a drop (REG-149 → gaps build E, item 1): the picked file itself, kept — its bytes beside its
 * row (`lib/leads/file-store.ts`), its real kind, type and size, owned by the signed-in member, in the open folder. A picture shows itself
 * (/files/img/<id>, REG-684); a PDF, a video or any other document shows the picture the browser drew of it (its first page, its first
 * frame — /files/thumb/<id>), else its glyph. Download gives the file under its name; the viewer opens a PDF and plays a video.
 * Up to 8 MB (`FILE_UPLOAD_MAX`): the request's own 12 MB limit (next.config.ts) carries the bytes as text, so this rule — not a failed
 * request — decides. (audit 2026-09-26, F205) a long string travels inside the one object: React's action decoder counts a bare string
 * argument against a 1,000,000 limit whenever the action takes more than one argument.
 */
export async function uploadFile(leadId: string, o: { parentId?: string | null; name?: string; data?: string | null; image?: string | null; thumb?: string | null } = {}): Promise<string | Refusal> {
  const ro = await readsOnly(); if (ro) return ro   // (pending modules S06) Accounting reads only
  const shut = await mayOpenLead(leadId); if (shut) return shut   // (gaps build E, item 2)
  const parentId = o.parentId ?? null
  if (parentId) { const p = await filesOf([parentId]); if (isRefusal(p)) return p; if (p.leadId !== leadId) return { error: GONE } }
  const name = (typeof o.name === 'string' ? o.name : '').replace(/[\\/]/g, '-').trim().slice(0, 200) || 'Upload'
  const data = typeof o.data === 'string' ? o.data : typeof o.image === 'string' ? o.image : ''
  const m = DATA_URL.exec(data)
  if (!m) return { error: 'This file didn’t read — pick it again' }   // (REG-951's words) a name alone is never a file
  const size = dataUrlSize(data)
  if (size > FILE_UPLOAD_MAX) return { error: tooBigLine(name) }
  const mime = mimeFor(name, m[1])
  const kind = fileKindOf(name, mime)
  const id = randomUUID(); const now = new Date()
  /* a picture a browser shows is its own thumbnail; anything else wears the picture drawn of it, when one came (a small JPEG / PNG / WebP) */
  const shows = kind === 'image' && /^image\/(jpeg|png|webp|gif)$/.test(mime)
  const drawn = !shows && typeof o.thumb === 'string' && PICTURE_URL.test(o.thumb) && o.thumb.length < 800_000 ? o.thumb : null
  const thumb = shows ? imageAddress(id) : drawn ? thumbAddress(id) : null
  const me = await sessionMemberId()
  await db.transaction(async (tx) => {
    await tx.insert(leadFiles).values({ id, leadId, kind, name, thumb, createdAt: now, parentId, ownerId: me, sizeBytes: size, mime, updatedAt: now })
    await keepBytes(tx, id, mime === m[1]!.toLowerCase() ? data : `data:${mime};base64,${m[2]}`)
    if (drawn) await keepThumb(tx, id, drawn)
  })
  touch(leadId); return id
}

/**
 * (UX audit 2026-09-30, T1) The same upload, answering the row it made — the Attach files modal (a task's, a note's) lists the real file,
 * ticked, where a stand-in with a local id used to sit and fail on Attach. A long picture travels inside the one object (F205).
 */
export async function uploadFileRecord(leadId: string, o: { parentId?: string | null; name?: string; data?: string | null; image?: string | null; thumb?: string | null } = {}): Promise<LeadFile | Refusal> {
  const ro = await readsOnly(); if (ro) return ro   // (pending modules S06) Accounting reads only
  if (!leadId) return { error: 'A studio task has no lead’s Files to keep the upload in' }
  const id = await uploadFile(leadId, o)
  if (isRefusal(id)) return id
  const [row] = await db.select().from(leadFiles).where(eq(leadFiles.id, id))
  return row ?? { error: 'The upload didn’t land' }
}

/** Rename File / Rename Folder (931:39434 / 931:39178). */
export async function renameFile(fileId: string, name: string): Promise<void | Refusal> {
  const ro = await readsOnly(); if (ro) return ro   // (pending modules S06) Accounting reads only
  const g = await filesOf([fileId]); if (isRefusal(g)) return g   // (gaps build E, item 2)
  const leadId = g.leadId
  const [f] = await db.select().from(leadFiles).where(eq(leadFiles.id, fileId))
  const shut = f ? await refuseSystemFolders(leadId, [f]) : null; if (shut) return shut   // (fix-A, A-19)
  const paper = await refusePapers([fileId]); if (paper) return paper   // (S42 C-03)
  if (f?.kind === 'folder') { const problem = folderNameProblem(name, await siblingFolders(leadId, f.parentId ?? null), fileId); if (problem) return { error: problem } }   // (REG-664)
  else if (!name.trim()) return { error: 'A name is required' }
  await db.update(leadFiles).set({ name: name.trim().slice(0, 200), updatedAt: new Date() }).where(eq(leadFiles.id, fileId))
  touch(leadId, fileId)
}

/** Move dialog (931:39216): into a folder or to the root (null). A folder never moves into itself or its own descendants. */
export async function moveFiles(fileIds: string[], parentId: string | null): Promise<void | Refusal> {
  const ro = await readsOnly(); if (ro) return ro   // (pending modules S06) Accounting reads only
  if (!fileIds.length) return
  const g = await filesOf(parentId ? [...fileIds, parentId] : fileIds); if (isRefusal(g)) return g   // (gaps build E, item 2) the destination too
  const leadId = g.leadId
  const all = await allOf(leadId)
  const shut = await refuseSystemFolders(leadId, all.filter((f) => fileIds.includes(f.id))); if (shut) return shut   // (fix-A, A-19)
  const paper = await refusePapers(fileIds); if (paper) return paper   // (S42 C-03) a paper keeps its place (its folder may move, the paper with it)
  const blocked = new Set<string>()
  for (const id of fileIds) { const f = all.find((x) => x.id === id); if (f?.kind === 'folder') { blocked.add(id); for (const d of descendantIds(all, id)) blocked.add(d) } }
  /* (REG-664) A refused move says so: it returned quietly and the tab still announced "Moved to …". The destination must be one of the
     lead's live folders, and never one being moved or inside one. */
  if (parentId) {
    const dest = all.find((x) => x.id === parentId)
    if (!dest || dest.kind !== 'folder' || dest.deletedAt) return { error: 'That folder isn’t there any more' }
    if (blocked.has(parentId)) return { error: 'A folder can’t go inside itself' }
  }
  await db.update(leadFiles).set({ parentId, updatedAt: new Date() }).where(inArray(leadFiles.id, fileIds))
  touch(leadId, ...fileIds)
}

/** Duplicate (tile / viewer kebab, bulk bar): a copy beside the original, same name (the mock is silent — the tasks rule). Folders copy their contents. */
export async function duplicateFiles(fileIds: string[]): Promise<string[] | Refusal> {
  const ro = await readsOnly(); if (ro) return ro   // (pending modules S06) Accounting reads only
  if (!fileIds.length) return []
  const g = await filesOf(fileIds); if (isRefusal(g)) return g   // (gaps build E, item 2)
  const leadId = g.leadId
  const all = await allOf(leadId)
  const shut = await refuseSystemFolders(leadId, all.filter((f) => fileIds.includes(f.id))); if (shut) return shut   // (fix-A, A-19) a second "Payments" would split its receipts
  /* (S42 C-03) a copy of a money paper would be a dead file (no bytes, no page) — a folder holding one is refused for the same reason */
  const paper = await refusePapers([...new Set(fileIds.flatMap((id) => [id, ...(all.find((x) => x.id === id)?.kind === 'folder' ? descendantIds(all, id) : [])]))].filter((id) => !all.find((x) => x.id === id)?.deletedAt))
  if (paper) return paper
  const now = new Date()
  const made: string[] = []
  // (REG-286) One transaction: a folder copy is a tree. Unwrapped, a failure mid-recursion left a duplicated folder
  // holding only the children that happened to land — a copy the user has to inspect file by file to trust.
  await db.transaction(async (tx) => {
    const copy = async (id: string, parentId: string | null) => {
      const f = all.find((x) => x.id === id); if (!f) return
      const nid = randomUUID()
      await tx.insert(leadFiles).values({ ...f, id: nid, parentId, createdAt: now, updatedAt: now, deletedAt: null })
      /* (REG-684 → gaps build E) a copy keeps its own bytes and picture, at its own addresses */
      const kept = await copyStored(tx, f.id, nid)
      const thumb = f.thumb === imageAddress(f.id) ? (kept.bytes ? imageAddress(nid) : null) : f.thumb === thumbAddress(f.id) ? (kept.thumb ? thumbAddress(nid) : null) : f.thumb
      if (thumb !== f.thumb) await tx.update(leadFiles).set({ thumb }).where(eq(leadFiles.id, nid))
      const [from] = await tx.select().from(leadFileRenders).where(eq(leadFileRenders.fileId, f.id))
      if (from) await tx.insert(leadFileRenders).values({ ...from, fileId: nid })   // (audit 2026-09-26, F095) and, a filed render, the version it is
      made.push(nid)
      if (f.kind === 'folder') for (const c of all.filter((x) => x.parentId === id && !x.deletedAt)) await copy(c.id, nid)
    }
    for (const id of fileIds) { const f = all.find((x) => x.id === id); if (f) await copy(id, f.parentId ?? null) }
  })
  touch(leadId); return made
}

/** Move to Trash Folder (931:39204) — soft; folders take their (untrashed) contents along under one timestamp. */
export async function trashFiles(fileIds: string[]): Promise<void | Refusal> {
  const ro = await readsOnly(); if (ro) return ro   // (pending modules S06) Accounting reads only
  if (!fileIds.length) return
  const g = await filesOf(fileIds); if (isRefusal(g)) return g   // (gaps build E, item 2)
  const leadId = g.leadId
  const ids = await withDescendants(leadId, fileIds, (f) => !f.deletedAt)
  const picked = await db.select({ name: leadFiles.name, kind: leadFiles.kind, parentId: leadFiles.parentId }).from(leadFiles).where(inArray(leadFiles.id, fileIds))
  const shut = await refuseSystemFolders(leadId, picked); if (shut) return shut   // (fix-A, A-19)
  /* (pending modules S03) a contract's PDF — its signed copy, or the uploaded document itself — stays while the contract does (delete the
     contract first); a folder holding one stays too */
  const paper = await refusePapers(ids); if (paper) return paper   // (S42 C-03) a money paper stays while its record does; a folder holding one too
  const kept = await contractsKeeping(ids)
  if (kept.length) {
    const [f] = await db.select({ name: leadFiles.name }).from(leadFiles).where(eq(leadFiles.id, kept[0]!.fileId))
    return { error: `${f?.name ?? 'This file'} is ${kept[0]!.signed ? 'the signed copy' : 'the PDF'} of ${kept[0]!.title} — it stays while the contract does` }
  }
  await db.update(leadFiles).set({ deletedAt: new Date() }).where(inArray(leadFiles.id, ids))
  for (const f of picked) await logLeadEvent(db, leadId, 'file_trashed', { name: f.name, kind: f.kind })   /* (REG-613) */
  touch(leadId, ...ids)
}

/**
 * Deleted Files › Restore — back where it was: a folder brings back what was trashed together with it (same timestamp),
 * not what was trashed separately before; a parent that is itself still trashed is restored too, so the item is reachable.
 */
export async function restoreFiles(fileIds: string[]): Promise<void | Refusal> {
  const ro = await readsOnly(); if (ro) return ro   // (pending modules S06) Accounting reads only
  if (!fileIds.length) return
  const g = await filesOf(fileIds); if (isRefusal(g)) return g   // (gaps build E, item 2)
  const leadId = g.leadId
  const ids = await withDescendants(leadId, fileIds, trashedTogether)
  const all = await allOf(leadId)
  const set = new Set(ids)
  for (const id of ids) { let p = all.find((x) => x.id === id)?.parentId ?? null; while (p) { const f = all.find((x) => x.id === p); if (f?.deletedAt) set.add(f.id); p = f?.parentId ?? null } }
  await db.update(leadFiles).set({ deletedAt: null }).where(inArray(leadFiles.id, [...set]))
  touch(leadId, ...set)
}

/** Deleted Files › Delete Forever — hard delete of the folder and everything inside it (comments, task attachments and the kept bytes cascade). */
export async function deleteFilesForever(fileIds: string[]): Promise<void | Refusal> {
  const ro = await readsOnly(); if (ro) return ro   // (pending modules S06) Accounting reads only
  if (!fileIds.length) return
  const g = await filesOf(fileIds); if (isRefusal(g)) return g   // (gaps build E, item 2)
  const leadId = g.leadId
  const ids = await withDescendants(leadId, fileIds, () => true)
  const picked = await db.select({ name: leadFiles.name, kind: leadFiles.kind }).from(leadFiles).where(inArray(leadFiles.id, fileIds))
  await db.delete(leadFiles).where(inArray(leadFiles.id, ids))
  for (const f of picked) await logLeadEvent(db, leadId, 'file_deleted', { name: f.name, kind: f.kind })   /* (REG-613) */
  touch(leadId, ...ids)
}

/** Deleted Files › Empty Trash. (gaps build E, item 2) A money file the member doesn't see stays where it is — the trash they see empties. */
export async function emptyFileTrash(leadId: string): Promise<void | Refusal> {
  const ro = await readsOnly(); if (ro) return ro   // (pending modules S06) Accounting reads only
  const shut = await mayOpenLead(leadId); if (shut) return shut
  const hidden = await hiddenMoneyFiles(leadId)
  const trashed = (await db.select({ id: leadFiles.id }).from(leadFiles).where(and(eq(leadFiles.leadId, leadId), isNotNull(leadFiles.deletedAt)))).map((r) => r.id).filter((id) => !hidden.has(id))
  if (trashed.length) await db.delete(leadFiles).where(inArray(leadFiles.id, trashed))
  touch(leadId)
}

/* ── comments (viewer › Comments panel 931:39891) ── */
export async function addFileComment(fileId: string, body: string): Promise<string | Refusal> {
  const ro = await readsOnly(); if (ro) return ro   // (pending modules S06) Accounting reads only
  const g = await filesOf([fileId]); if (isRefusal(g)) return g   // (gaps build E, item 2)
  const leadId = g.leadId
  const text = (typeof body === 'string' ? body : '').trim().slice(0, 4000)
  if (!text) return { error: 'Write a comment first' }
  const id = randomUUID()
  await db.insert(fileComments).values({ id, fileId, authorId: await sessionMemberId(), body: text, createdAt: new Date() })
  await notifyFileComment(fileId, leadId, text)   /* (UX audit 2026-09-30, T8) */
  touch(leadId, fileId); return id
}

/** (UX audit 2026-09-30, T8) A file's comment reaches the lead's team — never its author (`notify` drops the actor); the row opens the file's comments. */
async function notifyFileComment(fileId: string, leadId: string, body: string): Promise<void> {
  const to = await leadMemberIds(leadId)
  if (!to.length) return
  const [[f], [l], [who]] = await Promise.all([
    db.select({ name: leadFiles.name }).from(leadFiles).where(eq(leadFiles.id, fileId)),
    db.select({ name: leads.name }).from(leads).where(eq(leads.id, leadId)),
    db.select({ name: members.name }).from(members).where(eq(members.id, await sessionMemberId())),
  ])
  await notify('file_comment', to, {
    title: `${who?.name ?? 'Someone'} commented on ${f?.name ?? 'a file'}`, body: `“${firstWords(body)}”${l ? ` · ${l.name}` : ''}`,
    href: `/leads/${leadId}/files/${fileId}?panel=comments`, leadId,
    fields: { '{file}': f?.name ?? 'a file', '{comment}': firstWords(body) },   // (gaps build E, item 5) the message's own fields
  })
}
/** (gaps build E, item 2) The comment's file, once Who sees leads lets this member at it; `own`: only its author edits it (the panel's Edit is
    offered on your own comments alone; Delete on any, as before). */
async function commentOf(commentId: string, o: { own?: boolean } = {}): Promise<{ fileId: string; leadId: string } | Refusal> {
  const [c] = await db.select({ fileId: fileComments.fileId, authorId: fileComments.authorId }).from(fileComments).where(eq(fileComments.id, commentId))
  if (!c) return { error: 'That comment isn’t there any more' }
  const g = await filesOf([c.fileId]); if (isRefusal(g)) return g
  if (o.own && c.authorId !== await sessionMemberId()) return { error: 'Only whoever wrote a comment can edit it' }
  return { fileId: c.fileId, leadId: g.leadId }
}
export async function editFileComment(commentId: string, body: string): Promise<void | Refusal> {
  const ro = await readsOnly(); if (ro) return ro   // (pending modules S06) Accounting reads only
  const c = await commentOf(commentId, { own: true }); if (isRefusal(c)) return c
  const text = (typeof body === 'string' ? body : '').trim().slice(0, 4000)
  if (!text) return { error: 'Write a comment first' }
  await db.update(fileComments).set({ body: text, updatedAt: new Date() }).where(eq(fileComments.id, commentId))
  touch(c.leadId, c.fileId)
}
export async function deleteFileComment(commentId: string): Promise<void | Refusal> {
  const ro = await readsOnly(); if (ro) return ro   // (pending modules S06) Accounting reads only
  const c = await commentOf(commentId); if (isRefusal(c)) return c
  await db.delete(fileComments).where(eq(fileComments.id, commentId))
  touch(c.leadId, c.fileId)
}

/**
 * (gaps build E, item 1) A file kept before its picture was (an update's PDF, a demo file): the browser draws its first page once it has the
 * bytes and hands the picture here, so Files shows the page from then on. Only for a file with kept bytes and no picture yet.
 */
export async function keepFilePicture(fileId: string, o: { image: string }): Promise<{ thumb: string } | Refusal> {
  const g = await filesOf([fileId]); if (isRefusal(g)) return g
  const image = typeof o?.image === 'string' ? o.image : ''
  if (!PICTURE_URL.test(image) || image.length >= 800_000) return { error: 'That picture didn’t read' }
  const [f] = await db.select({ thumb: leadFiles.thumb, kind: leadFiles.kind }).from(leadFiles).where(and(eq(leadFiles.id, fileId), isNull(leadFiles.deletedAt)))
  if (!f || f.kind === 'folder' || f.kind === 'image') return { error: GONE }
  if (f.thumb) return { thumb: f.thumb }
  await db.transaction(async (tx) => {
    await keepThumb(tx, fileId, image)
    await tx.update(leadFiles).set({ thumb: thumbAddress(fileId) }).where(eq(leadFiles.id, fileId))
  })
  touch(g.leadId, fileId)
  return { thumb: thumbAddress(fileId) }
}

/** (pending modules S05 — the Move stage window's Attach rows, REG-149's 'Q-101' stand-in retired) The lead's files as the Attach files modal
    lists them — its folders too, to browse — once Who sees leads lets this member open the lead. */
export async function fetchAttachLibrary(leadId: string): Promise<LeadFile[]> {
  if (await mayOpenLead(leadId)) return []
  return db.select().from(leadFiles).where(and(eq(leadFiles.leadId, leadId), isNull(leadFiles.deletedAt))).orderBy(asc(leadFiles.createdAt))
}
