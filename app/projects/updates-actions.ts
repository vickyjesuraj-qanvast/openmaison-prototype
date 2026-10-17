'use server'

import { requirePlan } from '@/lib/credits/plan-gate'
import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { and, eq, inArray, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { keepBytes } from '@/lib/leads/file-store'   // (pending modules S34)
import { leadAssignees, leadFiles, leads, members, notifications, projectMilestones, projectUpdateFiles, projectUpdates, projects, settings, type ProjectUpdate } from '@/lib/db/schema'
import { canOpenLead, fetchViewer } from '@/lib/leads/visibility'
import { revalidateLead } from '@/lib/leads/queries'
import { runsStudio, type Viewer } from '@/lib/leads/assign-policy'
import { dropLeadEvents } from '@/lib/leads/events'
import { sanitizeContractHtml } from '@/lib/contracts/sanitize'
import { isBlankHtml } from '@/lib/quotes/text'
import { notify } from '@/lib/notifications/emit'
import { studioRunnerIds } from '@/lib/notifications/queries'
import { logProjectEvent, type ProjectEventKind } from '@/lib/projects/events'
import { CHANGE_RULE, mayChangeProject } from '@/lib/projects/policy'
import { fetchUpdateReview, fetchUpdateReviewStored, fetchUpdateReviewers, mediaOf, siteUpdatesFolder } from '@/lib/projects/updates'
import { titleCaseName } from '@/lib/format'
import { tellUpdate } from '@/lib/portal/client-tells'   // (gaps build H)
import { askedAuthor } from '@/lib/projects/acting-author'   // (simplify round 2, R2-C) an approval's update is the asker's
import {
  BODY_HTML_MAX, FILE_BYTES_MAX, MEDIA_MAX, REVIEW_RULE, SETTINGS_RULE, TITLE_MAX, UPDATE_REVIEW_KEY, deleteBlock, firstName, isUpdateStatus,
  mayReviewUpdate, mediaKindOf, parsePending, pendingWaits, publishesAtOnce, withdrawBlock, type UpdateMedia, type UpdatePendingRecord, type UpdateStatus,
} from '@/lib/projects/updates-model'
import { workspaceRefusal } from '@/lib/settings/desk'   // (S45C) the workspace's role rule

/*
 * (REG-948…, Projects round 3) An update's actions. Who sees a project is its lead's rule (`canOpenLead`); who writes, edits, sends,
 * withdraws and deletes an update is the project's team, Owners and Admins (`mayChangeProject`); who approves or sends back is an Owner or
 * an Admin (Q-17). Every refusal answers `{ error: <the rule> }`. Every step writes its `project_update_*` event, so Activity reads the
 * whole trail; a long string (a picture, a video, the body's HTML) travels inside one object argument (the F205 rule).
 */
type Refusal = { error: string }
const NOT_FOUND = 'This project is not there any more'
const GONE = 'This update is not there any more'

type Ctx = { p: typeof projects.$inferSelect; viewer: Viewer; team: string[] }
async function forProject(projectId: string, o: { change?: boolean } = { change: true }): Promise<Ctx | Refusal> {
  const [p] = await db.select().from(projects).where(and(eq(projects.id, projectId), isNull(projects.deletedAt))).limit(1)
  if (!p) return { error: NOT_FOUND }
  const viewer = await fetchViewer()
  if (!(await canOpenLead(viewer, p.leadId))) return { error: NOT_FOUND }
  const team = (await db.select({ memberId: leadAssignees.memberId }).from(leadAssignees).where(eq(leadAssignees.leadId, p.leadId))).map((r) => r.memberId)
  if (o.change && !mayChangeProject(viewer, team)) return { error: CHANGE_RULE }
  return { p, viewer, team }
}
async function forUpdate(updateId: string, o: { change?: boolean; review?: boolean } = { change: true }): Promise<(Ctx & { u: ProjectUpdate }) | Refusal> {
  const [u] = await db.select().from(projectUpdates).where(and(eq(projectUpdates.id, updateId), isNull(projectUpdates.deletedAt))).limit(1)
  if (!u) return { error: GONE }
  const c = await forProject(u.projectId, { change: !o.review && o.change !== false })
  if ('error' in c) return c
  if (o.review && !mayReviewUpdate(c.viewer.role, { id: c.viewer.id, reviewers: await fetchUpdateReviewers() })) return { error: REVIEW_RULE }
  return { ...c, u }
}
/** (gaps build D, item 10 — 1.0 D-76 · D-77) An Owner's, an Admin's or a named reviewer's post — or anyone's while review is off — reaches the
    client at once; the rule read as it stands now. */
const atOnceFor = async (c: Ctx) => publishesAtOnce(await fetchUpdateReview(), c.viewer.role, { id: c.viewer.id, reviewers: await fetchUpdateReviewers() })
/** (gaps build D, item 10 — 1.0 D-80 · D-114) An update that goes out to the client rings the project's team (never whoever sent it out). */
async function tellTeam(c: Ctx, u: { id: string; title: string }) {
  await tellUpdate(u.id)   // (gaps build H, H-Q17) every go-out tells the team — and, by the studio's switches, the client
  const to = c.team.filter((id) => id !== c.viewer.id)
  if (!to.length) return
  await notify('update_published', to, { title: `“${u.title}” went out to ${await clientFirstOf(c.p.leadId)}`, body: c.p.name, href: hrefOf(c.p.id, u.id), leadId: c.p.leadId, actorId: c.viewer.id })
}
const isRefusal = (x: unknown): x is Refusal => !!x && typeof x === 'object' && 'error' in x
function touch(leadId: string) {
  revalidateLead(leadId)   // the lead's tabs and every /projects page (its layout): the feed, the Overview card, the listing, Files
}
const nameOf = async (id: string | null | undefined) => (id ? (await db.select({ name: members.name }).from(members).where(eq(members.id, id)).limit(1))[0]?.name ?? 'Someone' : 'Someone')
const statusOf = (u: ProjectUpdate): UpdateStatus => (isUpdateStatus(u.status) ? u.status : 'draft')
const hrefOf = (projectId: string, updateId: string) => `/projects/${projectId}/updates?open=${encodeURIComponent(updateId)}`
const log = (c: Ctx, kind: ProjectEventKind, u: { id: string; title: string }, extra: { note?: string; again?: boolean; changes?: boolean } = {}, /** (simplify round 2) the line's actor when not the presser */ actorId?: string) =>
  logProjectEvent(db, c.p.leadId, c.p.id, kind, { id: u.id, title: u.title, name: c.p.name, number: c.p.number, ...extra }, actorId ? { actorId } : {})

/** Q-17: an update waiting reaches the studio's Owners and Admins (never its author). (fix-C, C-01) A held change says it is a change.
    (gaps build D, item 10) and the members Settings › Projects names as reviewers. */
async function askReview(c: Ctx, u: { id: string; title: string }, o: { changes?: boolean } = {}) {
  const to = [...new Set([...await studioRunnerIds(), ...await fetchUpdateReviewers()])].filter((id) => id !== c.viewer.id)
  await notify('update_review', to, { title: o.changes ? `${await nameOf(c.viewer.id)} changed a published update — review the change` : `${await nameOf(c.viewer.id)} sent an update for your review`, body: `“${u.title}” — ${c.p.name}`, href: hrefOf(c.p.id, u.id), leadId: c.p.leadId, actorId: c.viewer.id })
}
/** (fix-C, C-15) A review answered — approved, sent back, posted under the rule now, deleted — answers its bell rows for every reviewer:
    they read as read, so nobody opens a review that is no longer waiting. A delete takes them off (`drop`). */
async function answerReview(projectId: string, updateId: string, o: { drop?: boolean } = {}) {
  const where = and(eq(notifications.kind, 'update_review'), eq(notifications.href, hrefOf(projectId, updateId)))
  if (o.drop) await db.delete(notifications).where(where)
  else await db.update(notifications).set({ readAt: new Date() }).where(and(where, isNull(notifications.readAt)))
}
/** (fix-C, C-28) The client's first name, for the bell's one-dash bodies. */
const clientFirstOf = async (leadId: string) => firstName(titleCaseName((await db.select({ name: leads.name }).from(leads).where(eq(leads.id, leadId)).limit(1))[0]?.name ?? 'The client'))

/* ── Uploads ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────── */

const DATA_URL = /^data:([a-z0-9.+-]+\/[a-z0-9.+-]+);base64,[A-Za-z0-9+/=]+$/i
const bytesOf = (dataUrl: string) => Math.round((dataUrl.length - dataUrl.indexOf(',') - 1) * 0.75)

/**
 * One picked file, uploaded for real: its bytes kept beside it (`lead_file_images`, the Files tab's REG-684 store), filed in the lead's
 * "Site updates" folder, owned by the signed-in member — so the project's Files tab shows it at once. A picture comes sized to land
 * (components/leads/files/upload-picture.ts); a video carries its first frame as its poster; a document keeps its bytes and opens from
 * them. 1.0 saved only a video's or a document's name (D-101).
 */
export async function uploadUpdateFile(projectId: string, o: { name: string; data: string; poster?: string | null }): Promise<UpdateMedia | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forProject(projectId); if (isRefusal(c)) return c
  const name = (o.name ?? '').trim().slice(0, 200) || 'Upload'
  const m = DATA_URL.exec(o.data ?? '')
  if (!m) return { error: 'This file didn’t read — pick it again' }
  const mime = m[1]!.toLowerCase()
  const kind = mediaKindOf(name, mime)
  if (!kind) return { error: 'Pictures, videos, PDFs and Office documents only' }
  /* a picture the browser couldn't redraw (HEIC, TIFF) would never show — Files serves JPEG, PNG, WebP and GIF (REG-684) */
  if (kind === 'photo' && !/^image\/(jpeg|png|webp|gif)$/.test(mime)) return { error: 'This picture’s format doesn’t open here — save it as a JPEG' }
  const size = bytesOf(o.data)
  if (kind === 'photo' ? o.data.length >= 12_000_000 : size > FILE_BYTES_MAX) return { error: `${name} is over 6 MB — a shorter clip or a smaller file fits` }
  const poster = kind === 'video' && o.poster && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(o.poster) && o.poster.length < 400_000 ? o.poster : null
  const folder = await siteUpdatesFolder(c.p.leadId, c.viewer.id)
  const id = randomUUID(), now = new Date()
  const fileKind = kind === 'photo' ? 'image' : kind === 'video' ? 'video' : mime === 'application/pdf' || /\.pdf$/i.test(name) ? 'pdf' : 'doc'
  const row = { id, leadId: c.p.leadId, kind: fileKind, name, thumb: kind === 'photo' ? `/files/img/${id}` : poster, createdAt: now, parentId: folder, ownerId: c.viewer.id, sizeBytes: size, mime, updatedAt: now }
  await db.insert(leadFiles).values(row)
  await keepBytes(db, id, o.data)   // (pending modules S34) through the one file store
  touch(c.p.leadId)
  return mediaOf(projectId, row, true)
}

/** The composer was closed without saving: the uploads it made — never on any update, still the uploader's, in Site updates — go. */
export async function discardUpdateUploads(projectId: string, o: { fileIds: string[] }): Promise<{ removed: number } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forProject(projectId); if (isRefusal(c)) return c
  const ids = [...new Set(o.fileIds ?? [])].filter((x) => typeof x === 'string').slice(0, 50)
  if (!ids.length) return { removed: 0 }
  const linked = new Set((await db.select({ fileId: projectUpdateFiles.fileId }).from(projectUpdateFiles).where(inArray(projectUpdateFiles.fileId, ids))).map((r) => r.fileId))
  const mine = (await db.select({ id: leadFiles.id }).from(leadFiles).where(and(inArray(leadFiles.id, ids), eq(leadFiles.leadId, c.p.leadId), eq(leadFiles.ownerId, c.viewer.id)))).map((r) => r.id).filter((id) => !linked.has(id))
  if (mine.length) await db.delete(leadFiles).where(inArray(leadFiles.id, mine))
  touch(c.p.leadId)
  return { removed: mine.length }
}

/* ── Write, edit, send ───────────────────────────────────────────────────────────────────────────────────────────────────────── */

export type UpdateInput = {
  id?: string | null
  title: string
  html: string
  milestoneId?: string | null
  fileIds: string[]
  /** draft = Save draft · post = Post / Send for review / Resubmit · save = Save changes, keeping the update where it is (a published
      one edited by someone whose posts are reviewed goes back In review) */
  intent: 'draft' | 'post' | 'save'
}

/** The composer's save — a new update or an edit — and where it lands under the review rule. */
export async function saveProjectUpdate(projectId: string, input: UpdateInput): Promise<{ id: string; status: UpdateStatus; held?: boolean } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forProject(projectId); if (isRefusal(c)) return c
  const title = (input.title ?? '').replace(/\s+/g, ' ').trim()
  if (!title) return { error: 'Give the update a title' }
  if (title.length > TITLE_MAX) return { error: `Keep the title to ${TITLE_MAX} characters` }
  if ((input.html ?? '').length > BODY_HTML_MAX * 2) return { error: 'The update is too long — shorten it' }
  const clean = sanitizeContractHtml(input.html ?? '')
  const body = isBlankHtml(clean) ? null : clean
  if (body && body.length > BODY_HTML_MAX) return { error: 'The update is too long — shorten it' }
  const fileIds = [...new Set((input.fileIds ?? []).filter((x) => typeof x === 'string'))]
  if (fileIds.length > MEDIA_MAX) return { error: `An update holds up to ${MEDIA_MAX} files` }
  if (fileIds.length) {
    const ok = await db.select({ id: leadFiles.id }).from(leadFiles).where(and(inArray(leadFiles.id, fileIds), eq(leadFiles.leadId, c.p.leadId), isNull(leadFiles.deletedAt)))
    if (ok.length !== fileIds.length) return { error: 'A file it carries is gone — remove it and save again' }
  }
  const milestoneId = typeof input.milestoneId === 'string' && input.milestoneId.trim() ? input.milestoneId.trim().slice(0, 64) : null
  /* (fix-C, C-24) the milestone is one of this project's live ones — the choices' check (choices-actions.ts `saveChoice`) */
  if (milestoneId) {
    const [m] = await db.select({ id: projectMilestones.id }).from(projectMilestones).where(and(eq(projectMilestones.id, milestoneId), eq(projectMilestones.projectId, projectId), isNull(projectMilestones.deletedAt))).limit(1)
    if (!m) return { error: 'That milestone is not on this project any more' }
  }
  const atOnce = await atOnceFor(c)
  const me = c.viewer.id, now = new Date()
  /* (simplify round 2 — R2-C, S-18) a new update an approval writes for someone's ask (the Mark done sheet's photos, ticked by a Designer and run
     on the Owner's *Approve as done*) is the asker's: written and sent by them, published by the approver — the way an approved update keeps
     its author. Set on the server only (lib/projects/acting-author.ts `asAskedBy`); a browser never names an author. */
  const author = !input.id ? askedAuthor() ?? me : me

  let id: string, prev: UpdateStatus | null, next: UpdateStatus, changed = true
  let before: ProjectUpdate | null = null
  if (!input.id) {
    id = randomUUID(); prev = null
    next = input.intent === 'draft' ? 'draft' : atOnce ? 'published' : 'in_review'
    await db.insert(projectUpdates).values({
      id, projectId, title, body, milestoneId, status: next, authorId: author, createdAt: now, updatedAt: now,
      ...(next === 'in_review' ? { submittedBy: author, submittedAt: now } : {}),
      ...(next === 'published' ? { publishedBy: me, publishedAt: now } : {}),
    })
  } else {
    const [u] = await db.select().from(projectUpdates).where(and(eq(projectUpdates.id, input.id), eq(projectUpdates.projectId, projectId), isNull(projectUpdates.deletedAt))).limit(1)
    if (!u) return { error: GONE }
    before = u; id = u.id; prev = statusOf(u)
    const links = (await db.select({ fileId: projectUpdateFiles.fileId }).from(projectUpdateFiles).where(eq(projectUpdateFiles.updateId, id)).orderBy(projectUpdateFiles.position)).map((r) => r.fileId)
    changed = u.title !== title || (u.body ?? null) !== body || (u.milestoneId ?? null) !== milestoneId || links.join() !== fileIds.join()
    const held = parsePending(u.pending)
    /* (fix-C, C-01) An edit to what the client already reads never takes it away: under the review rule the published words stay on the
       portal — with their date and their "Seen by" — and the change is held beside them until an Owner or an Admin approves it (the
       template rule, REG-501). Saved back to the published words, the held change goes. */
    if (prev === 'published' && !atOnce) {
      if (!changed) {
        if (held) { await db.update(projectUpdates).set({ pending: null, updatedAt: now }).where(eq(projectUpdates.id, id)); await answerReview(projectId, id) }
        touch(c.p.leadId)
        return { id, status: 'published' }
      }
      const rec: UpdatePendingRecord = { title, body, milestoneId, fileIds, by: me, at: now.getTime(), note: null, reviewedBy: null, reviewedAt: null }
      await db.update(projectUpdates).set({ pending: rec, updatedAt: now }).where(eq(projectUpdates.id, id))
      if (fileIds.length) await db.update(leadFiles).set({ updatedAt: now }).where(and(inArray(leadFiles.id, fileIds), isNull(leadFiles.deletedAt)))
      /* newly waiting (nothing held, or its Send back answered by this save): the review is asked; a held change re-worded keeps its ask */
      if (!pendingWaits(held)) { await log(c, 'project_update_submitted', { id, title }, { again: true, changes: true }); await askReview(c, { id, title }, { changes: true }) }
      touch(c.p.leadId)
      return { id, status: 'published', held: true }
    }
    /* (fix-C, C-09) Post from In review is a send under the rule as it is now — with review switched off, the author's post goes out */
    const sends = input.intent === 'post' && (prev === 'draft' || prev === 'sent_back' || prev === 'withdrawn' || (prev === 'in_review' && atOnce))
    next = sends ? (atOnce ? 'published' : 'in_review')
      : prev === 'published' && changed ? 'published'   // an Owner's or an Admin's edit (or anyone's with review off) reaches the client at once
      : prev
    const set: Partial<typeof projectUpdates.$inferInsert> = { title, body, milestoneId, status: next, updatedAt: now }
    if (held) set.pending = null   // what was held is folded into this save (the composer opened on it)
    if (prev !== 'draft' && changed) Object.assign(set, { editedAt: now, editedBy: me })
    if (next === 'in_review' && prev !== 'in_review') Object.assign(set, { submittedBy: me, submittedAt: now, reviewNote: null, reviewedBy: null, reviewedAt: null })
    if (next === 'published' && prev !== 'published') Object.assign(set, { publishedBy: me, publishedAt: now, withdrawnBy: null, withdrawnAt: null, reviewNote: null })
    await db.update(projectUpdates).set(set).where(eq(projectUpdates.id, id))
  }
  /* the files, in the order they were attached */
  if (changed) {
    await db.delete(projectUpdateFiles).where(eq(projectUpdateFiles.updateId, id))
    if (fileIds.length) await db.insert(projectUpdateFiles).values(fileIds.map((fileId, position) => ({ updateId: id, fileId, position, createdAt: now })))
    if (before && fileIds.length) await db.update(leadFiles).set({ updatedAt: now }).where(and(inArray(leadFiles.id, fileIds), isNull(leadFiles.deletedAt)))
  }
  /* the trail */
  const u = { id, title }
  const again = prev === 'sent_back' || prev === 'withdrawn' || prev === 'published'
  if (prev === null) await log(c, next === 'draft' ? 'project_update_drafted' : next === 'published' ? 'project_update_posted' : 'project_update_submitted', u, {}, author !== me ? author : undefined)
  else if (next !== prev) await log(c, next === 'published' ? 'project_update_posted' : 'project_update_submitted', u, { again })
  else if (changed && prev !== 'draft') await log(c, 'project_update_edited', u)
  if (next === 'in_review' && prev !== 'in_review') await askReview(c, u)
  if (prev === 'in_review' && next === 'published') await answerReview(projectId, id)   // (fix-C, C-15)
  if (next === 'published' && prev !== 'published') await tellTeam(c, u)   // (gaps build D, item 10)
  if (prev === 'published' && before && parsePending(before.pending)) await answerReview(projectId, id)
  touch(c.p.leadId)
  return { id, status: next }
}

/** Sent back → sent again: In review, or straight to the client for an Owner or an Admin (or with review off). The reason is answered. */
export async function resubmitProjectUpdate(updateId: string): Promise<{ status: UpdateStatus } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forUpdate(updateId); if (isRefusal(c)) return c
  /* (fix-C, C-01) a held change sent back goes for review again — or, under the rule now, reaches the client */
  const held = parsePending(c.u.pending)
  if (statusOf(c.u) === 'published' && held?.note) {
    if (await atOnceFor(c)) {
      await applyHeld(c, held)
      await log(c, 'project_update_edited', { id: c.u.id, title: held.title })
      touch(c.p.leadId)
      return { status: 'published' }
    }
    await db.update(projectUpdates).set({ pending: { ...held, note: null, reviewedBy: null, reviewedAt: null }, updatedAt: new Date() }).where(eq(projectUpdates.id, updateId))
    await log(c, 'project_update_submitted', { id: c.u.id, title: held.title }, { again: true, changes: true })
    await askReview(c, { id: c.u.id, title: held.title }, { changes: true })
    touch(c.p.leadId)
    return { status: 'published' }
  }
  if (statusOf(c.u) !== 'sent_back') return { error: 'This update isn’t sent back any more' }
  const atOnce = await atOnceFor(c)
  const now = new Date(), next: UpdateStatus = atOnce ? 'published' : 'in_review'
  await db.update(projectUpdates).set(next === 'published'
    ? { status: next, publishedBy: c.viewer.id, publishedAt: now, reviewNote: null, updatedAt: now }
    : { status: next, submittedBy: c.viewer.id, submittedAt: now, reviewNote: null, reviewedBy: null, reviewedAt: null, updatedAt: now }).where(eq(projectUpdates.id, updateId))
  await log(c, next === 'published' ? 'project_update_posted' : 'project_update_submitted', c.u, { again: true })
  if (next === 'in_review') await askReview(c, c.u)
  else await tellTeam(c, c.u)   // (gaps build D, item 10)
  touch(c.p.leadId)
  return { status: next }
}

/** Withdrawn → out again, under the rule. 1.0 had no way back once unpublished (D-109). */
export async function republishProjectUpdate(updateId: string): Promise<{ status: UpdateStatus } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forUpdate(updateId); if (isRefusal(c)) return c
  if (statusOf(c.u) !== 'withdrawn') return { error: 'This update isn’t withdrawn any more' }
  const atOnce = await atOnceFor(c)
  const now = new Date(), next: UpdateStatus = atOnce ? 'published' : 'in_review'
  await db.update(projectUpdates).set(next === 'published'
    ? { status: next, publishedBy: c.viewer.id, publishedAt: now, withdrawnBy: null, withdrawnAt: null, updatedAt: now }
    : { status: next, submittedBy: c.viewer.id, submittedAt: now, withdrawnBy: null, withdrawnAt: null, reviewNote: null, reviewedBy: null, reviewedAt: null, updatedAt: now }).where(eq(projectUpdates.id, updateId))
  await log(c, next === 'published' ? 'project_update_posted' : 'project_update_submitted', c.u, { again: true })
  if (next === 'in_review') await askReview(c, c.u)
  else await tellTeam(c, c.u)   // (gaps build D, item 10)
  touch(c.p.leadId)
  return { status: next }
}

/* ── Review (Owners and Admins) ──────────────────────────────────────────────────────────────────────────────────────────────── */

/** (fix-C, C-01) A held change swapped into the published update: its words, milestone and files; the publish date kept, the edit stamped. */
async function applyHeld(c: Ctx & { u: ProjectUpdate }, held: UpdatePendingRecord, o: { reviewer?: string } = {}) {
  const now = new Date()
  const live = held.fileIds.length ? new Set((await db.select({ id: leadFiles.id }).from(leadFiles).where(and(inArray(leadFiles.id, held.fileIds), eq(leadFiles.leadId, c.p.leadId), isNull(leadFiles.deletedAt)))).map((r) => r.id)) : new Set<string>()
  const fileIds = held.fileIds.filter((id) => live.has(id))
  await db.update(projectUpdates).set({
    title: held.title, body: held.body, milestoneId: held.milestoneId, pending: null, editedAt: now, editedBy: held.by, updatedAt: now,
    ...(o.reviewer ? { reviewedBy: o.reviewer, reviewedAt: now, reviewNote: null } : {}),
  }).where(eq(projectUpdates.id, c.u.id))
  await db.delete(projectUpdateFiles).where(eq(projectUpdateFiles.updateId, c.u.id))
  if (fileIds.length) await db.insert(projectUpdateFiles).values(fileIds.map((fileId, position) => ({ updateId: c.u.id, fileId, position, createdAt: now })))
  await answerReview(c.p.id, c.u.id)
}

export async function approveProjectUpdate(updateId: string): Promise<{ status: UpdateStatus } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forUpdate(updateId, { review: true }); if (isRefusal(c)) return c
  /* (fix-C, C-01) a held change to a published update: the words swap in, the publish date and the client's place in the feed stay */
  const held = parsePending(c.u.pending)
  if (statusOf(c.u) === 'published' && held && pendingWaits(held)) {
    await applyHeld(c, held, { reviewer: c.viewer.id })
    await log(c, 'project_update_approved', { id: c.u.id, title: held.title }, { changes: true })
    if (held.by !== c.viewer.id) await notify('update_approved', [held.by], { title: `${await nameOf(c.viewer.id)} approved your change to “${held.title}”`, body: `${c.p.name} · ${await clientFirstOf(c.p.leadId)} reads the new words now`, href: hrefOf(c.p.id, updateId), leadId: c.p.leadId, actorId: c.viewer.id })
    touch(c.p.leadId)
    return { status: 'published' }
  }
  if (statusOf(c.u) !== 'in_review') return { error: 'This update isn’t waiting for review any more' }
  const now = new Date()
  /* an update published before (its edit went through review under the old rule) keeps its first publish date (fix-C, C-01) */
  await db.update(projectUpdates).set({ status: 'published', reviewedBy: c.viewer.id, reviewedAt: now, reviewNote: null, publishedBy: c.u.publishedAt ? c.u.publishedBy : c.viewer.id, publishedAt: c.u.publishedAt ?? now, updatedAt: now }).where(eq(projectUpdates.id, updateId))
  await log(c, 'project_update_approved', c.u)
  await tellTeam(c, c.u)   // (gaps build D, item 10) out to the client — the team hears it
  await answerReview(c.p.id, updateId)   // (fix-C, C-15)
  const author = c.u.submittedBy ?? c.u.authorId
  if (author) await notify('update_approved', [author], { title: `${await nameOf(c.viewer.id)} approved your update “${c.u.title}”`, body: `${c.p.name} · ${await clientFirstOf(c.p.leadId)} can see it now`, href: hrefOf(c.p.id, updateId), leadId: c.p.leadId, actorId: c.viewer.id })   // (fix-C, C-28) one dash
  touch(c.p.leadId)
  return { status: 'published' }
}

export async function sendBackProjectUpdate(updateId: string, o: { note: string }): Promise<{ status: UpdateStatus } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forUpdate(updateId, { review: true }); if (isRefusal(c)) return c
  const held = parsePending(c.u.pending)
  const heldWaits = statusOf(c.u) === 'published' && pendingWaits(held)
  if (statusOf(c.u) !== 'in_review' && !heldWaits) return { error: 'This update isn’t waiting for review any more' }
  const note = (o.note ?? '').replace(/\s+/g, ' ').trim().slice(0, 300)
  if (!note) return { error: 'Say why it goes back' }
  const now = new Date()
  /* (fix-C, C-01) a held change goes back to its author with the reason; the client keeps reading the published words */
  if (heldWaits && held) {
    await db.update(projectUpdates).set({ pending: { ...held, note, reviewedBy: c.viewer.id, reviewedAt: now.getTime() }, updatedAt: now }).where(eq(projectUpdates.id, updateId))
    await log(c, 'project_update_sent_back', { id: c.u.id, title: held.title }, { note, changes: true })
    await answerReview(c.p.id, updateId)
    if (held.by !== c.viewer.id) await notify('update_sent_back', [held.by], { title: `${await nameOf(c.viewer.id)} sent your change to “${held.title}” back`, body: note, href: hrefOf(c.p.id, updateId), leadId: c.p.leadId, actorId: c.viewer.id })
    touch(c.p.leadId)
    return { status: 'published' }
  }
  await db.update(projectUpdates).set({ status: 'sent_back', reviewedBy: c.viewer.id, reviewedAt: now, reviewNote: note, updatedAt: now }).where(eq(projectUpdates.id, updateId))
  await log(c, 'project_update_sent_back', c.u, { note })
  await answerReview(c.p.id, updateId)   // (fix-C, C-15)
  const author = c.u.submittedBy ?? c.u.authorId
  if (author) await notify('update_sent_back', [author], { title: `${await nameOf(c.viewer.id)} sent your update “${c.u.title}” back`, body: note, href: hrefOf(c.p.id, updateId), leadId: c.p.leadId, actorId: c.viewer.id })
  touch(c.p.leadId)
  return { status: 'sent_back' }
}

/* ── Withdraw and delete, each with its Undo ─────────────────────────────────────────────────────────────────────────────────── */

export async function withdrawProjectUpdate(updateId: string): Promise<{ eventId: string } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forUpdate(updateId); if (isRefusal(c)) return c
  const block = withdrawBlock({ status: statusOf(c.u), clientOpenedAt: c.u.clientOpenedAt?.getTime() ?? null, publishedAt: c.u.publishedAt?.getTime() ?? null })
  if (block) return { error: block }
  const now = new Date()
  await db.update(projectUpdates).set({ status: 'withdrawn', withdrawnBy: c.viewer.id, withdrawnAt: now, updatedAt: now }).where(eq(projectUpdates.id, updateId))
  const eventId = await log(c, 'project_update_withdrawn', c.u)
  touch(c.p.leadId)
  return { eventId }
}
/** Withdraw's Undo: back as it was published — its date, its publisher — and the withdraw's line goes with it. */
export async function undoWithdrawProjectUpdate(updateId: string, o: { eventId: string }): Promise<{ status: UpdateStatus } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forUpdate(updateId); if (isRefusal(c)) return c
  if (statusOf(c.u) !== 'withdrawn' || !c.u.publishedAt) return { error: 'This update was changed since — publish it again instead' }
  await db.update(projectUpdates).set({ status: 'published', withdrawnBy: null, withdrawnAt: null, updatedAt: new Date() }).where(eq(projectUpdates.id, updateId))
  if (o.eventId) await dropLeadEvents([o.eventId])
  touch(c.p.leadId)
  return { status: 'published' }
}

export async function deleteProjectUpdate(updateId: string): Promise<{ eventId: string } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forUpdate(updateId); if (isRefusal(c)) return c
  const block = deleteBlock({ status: statusOf(c.u) })
  if (block) return { error: block }
  const now = new Date()
  await db.update(projectUpdates).set({ deletedAt: now, deletedBy: c.viewer.id, updatedAt: now }).where(eq(projectUpdates.id, updateId))
  const eventId = await log(c, 'project_update_deleted', c.u)
  await answerReview(c.p.id, updateId, { drop: true })   // (fix-C, C-15) a review row never outlives its update
  touch(c.p.leadId)
  return { eventId }
}
/** Delete's Undo — its files never left Files, so the update comes back whole. */
export async function restoreProjectUpdate(updateId: string, o: { eventId: string }): Promise<{ status: UpdateStatus } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const [u] = await db.select().from(projectUpdates).where(eq(projectUpdates.id, updateId)).limit(1)
  if (!u) return { error: GONE }
  const c = await forProject(u.projectId); if (isRefusal(c)) return c
  await db.update(projectUpdates).set({ deletedAt: null, deletedBy: null }).where(eq(projectUpdates.id, updateId))
  if (o.eventId) await dropLeadEvents([o.eventId])
  if (statusOf(u) === 'in_review') await askReview({ ...c, viewer: { ...c.viewer, id: u.submittedBy ?? c.viewer.id } }, u)   // (fix-C, C-15) its review asked again
  touch(c.p.leadId)
  return { status: statusOf(u) }
}

/* ── (fix-C, C-01) A held change: its author takes it back, with Undo ─────────────────────────────────────────────────────────── */

/** Discard the change waiting on a published update — the client never saw it; the published words stay. Answers what Undo needs. */
export async function discardUpdateChanges(updateId: string): Promise<{ pending: UpdatePendingRecord } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forUpdate(updateId); if (isRefusal(c)) return c
  const held = parsePending(c.u.pending)
  if (!held) return { error: 'No change waits on this update any more' }
  await db.update(projectUpdates).set({ pending: null, updatedAt: new Date() }).where(eq(projectUpdates.id, updateId))
  await answerReview(c.p.id, updateId)
  touch(c.p.leadId)
  return { pending: held }
}
/** Discard's Undo: the change held again, as it was. */
export async function restoreUpdateChanges(updateId: string, o: { pending: UpdatePendingRecord }): Promise<{ ok: true } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forUpdate(updateId); if (isRefusal(c)) return c
  const rec = parsePending(o?.pending)
  if (!rec) return { error: 'Nothing to undo' }
  if (parsePending(c.u.pending)) return { error: 'This update was changed since' }
  if ((rec.body ?? '').length > BODY_HTML_MAX || rec.title.length > TITLE_MAX) return { error: 'Nothing to undo' }
  await db.update(projectUpdates).set({ pending: { ...rec, body: rec.body ? sanitizeContractHtml(rec.body) : null }, updatedAt: new Date() }).where(eq(projectUpdates.id, updateId))
  if (pendingWaits(rec)) await db.update(notifications).set({ readAt: null }).where(and(eq(notifications.kind, 'update_review'), eq(notifications.href, hrefOf(c.p.id, updateId))))
  touch(c.p.leadId)
  return { ok: true }
}

/* ── Settings › Projects › Updates ───────────────────────────────────────────────────────────────────────────────────────────── */

/** The setting's value: `{ on }`, with `reviewers` only when some are named (an empty list keeps the old shape). */
const reviewValue = (on: boolean, reviewers: string[]) => JSON.stringify(reviewers.length ? { on, reviewers } : { on })

/** (Q-17) *Updates need review before the client sees them* — Owners and Admins switch it. Updates already In review stay there. */
export async function setUpdateReview(o: { on: boolean }): Promise<{ on: boolean } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const viewer = await fetchViewer()
  if (!runsStudio(viewer.role)) return { error: SETTINGS_RULE }
  { const lock = await requirePlan('internal_approvals'); if (lock) return lock }   // (pending modules S19) approvals are Pro
  const value = reviewValue(o.on !== false, await fetchUpdateReviewers())   // (gaps build D, item 10) the named reviewers stay
  await db.insert(settings).values({ key: UPDATE_REVIEW_KEY, value, updatedAt: new Date() }).onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } })
  revalidatePath('/settings')
  revalidatePath('/projects', 'layout')
  return { on: o.on !== false }
}

/**
 * (gaps build D, item 10 — 1.0 D-76 · D-77's named approvers) Settings › Projects › Updates › *Who reviews*: Owners and Admins always, and the
 * members named here (Designers or Managers, active). They approve and send back as an Owner does, and their own posts go out at once. Owners
 * and Admins change it; the answer names who reviews now.
 */
export async function setUpdateReviewers(o: { ids: string[] }): Promise<{ ids: string[] } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const viewer = await fetchViewer()
  if (!runsStudio(viewer.role)) return { error: SETTINGS_RULE }
  const want = [...new Set((Array.isArray(o?.ids) ? o.ids : []).filter((x): x is string => typeof x === 'string'))].slice(0, 30)
  const rows = want.length ? await db.select({ id: members.id, role: members.role, active: members.isActive }).from(members).where(inArray(members.id, want)) : []
  const ids = want.filter((id) => rows.some((r) => r.id === id && r.active !== false && !runsStudio(r.role)))
  if (ids.length !== want.length) return { error: 'Only active Designers and Managers can be named — Owners and Admins review already' }
  { const lock = await requirePlan('internal_approvals'); if (lock) return lock }   // (pending modules S19) approvals are Pro
  const value = reviewValue(await fetchUpdateReviewStored(), ids)
  await db.insert(settings).values({ key: UPDATE_REVIEW_KEY, value, updatedAt: new Date() }).onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } })
  revalidatePath('/settings')
  revalidatePath('/projects', 'layout')
  return { ids }
}

