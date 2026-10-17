'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { and, asc, eq, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { memberPortfolioPictures, memberPortfolioProjects, members, projects } from '@/lib/db/schema'
import { fetchViewer } from '@/lib/leads/visibility'
import { runsStudio } from '@/lib/settings/roles'
import { PICTURE_URL } from '@/lib/leads/file-store'
import { detailsBlock } from '@/lib/company/member-rules'
import { currentPhotoId, isOwnPicture, photoColumns, storeMemberPhoto } from '@/lib/company/member-photo-store'
import { ABOUT_PHOTO_DATA_MAX, BIO_MAX, TITLE_MAX } from '@/lib/portal/about-model'
import { CAPTION_MAX, PICTURES_MAX, PLACE_MAX, WORK_DESC_MAX, WORK_MAX, WORK_TITLE_MAX, YEARS_MAX, clip } from '@/lib/portfolio/model'
import { PROPERTY_TYPES, STYLE_OPTIONS } from '@/lib/leads/enums'
import { workspaceRefusal } from '@/lib/settings/desk'   // (S45C) the workspace's role rule

/*
 * (pending modules S27 — api:designer-portfolio-profiles; 1.0's /api/id-profiles/records (+ projects, images) behind its never-mounted
 * ProfileEditor) A member's public card and their work. Who may: the member, for their own (1.0's ID edited their own profile); Owners and
 * Admins, for anyone — and only they say who is on the portal's About page (the studio's call, gaps build H). A deactivated member's card stays
 * as it was. Pictures travel inside one object; every remove is soft, answered with Undo. Refusals answer `{ error: <the rule> }`.
 */

type Refusal = { error: string }
const isErr = (x: unknown): x is Refusal => !!x && typeof x === 'object' && 'error' in x
const NOT_YOURS = 'Only they, an Owner or an Admin change their public profile'
const LEFT = 'They have left the studio — their profile stays as it was'
const PHOTO = 'That picture didn’t read — pick a JPG or PNG under 2 MB'
const touch = (memberId?: string) => {
  revalidatePath('/company/members'); revalidatePath('/qanvast-ops/hangouts', 'layout'); revalidatePath('/company/portal'); revalidatePath('/profile')
  if (memberId) revalidatePath(`/company/members/${memberId}/profile`)
}

async function editorOf(memberId: unknown): Promise<{ v: Awaited<ReturnType<typeof fetchViewer>>; m: typeof members.$inferSelect } | Refusal> {
  const v = await fetchViewer()
  const [m] = typeof memberId === 'string' ? await db.select().from(members).where(eq(members.id, memberId)).limit(1) : []
  if (!m) return { error: 'That member isn’t in the studio any more' }
  if (v.id !== m.id && !runsStudio(v.role)) return { error: NOT_YOURS }
  if (!m.isActive) return { error: LEFT }
  return { v, m }
}
async function workOf(workId: unknown) {
  const [w] = typeof workId === 'string' ? await db.select().from(memberPortfolioProjects).where(eq(memberPortfolioProjects.id, workId)).limit(1) : []
  if (!w) return { error: 'This piece of work is gone' } as Refusal
  const who = await editorOf(w.memberId); if (isErr(who)) return who
  return { ...who, w }
}

export type CardInput = { title: string; bio: string; years: number | null; shown?: boolean; photo?: string | null }
export type CardBefore = { shown: boolean; title: string | null; bio: string | null; years: number | null; photoId: string | null }

/** The card's words (and, for Owners and Admins, whether it is on the About page) — answers what it replaced, for Undo. */
export async function savePublicCard(memberId: string, input: CardInput): Promise<{ ok: true; previous: CardBefore } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const who = await editorOf(memberId); if (isErr(who)) return who
  const { v, m } = who
  const title = clip(input?.title, TITLE_MAX)
  const bio = typeof input?.bio === 'string' ? input.bio.replace(/\s+/g, ' ').trim() : ''
  if (bio.length > BIO_MAX) return { error: `Keep it to ${BIO_MAX} characters — two short lines` }
  const y = input?.years === null || input?.years === undefined ? null : Math.round(Number(input.years))
  if (y !== null && (!Number.isFinite(y) || y < 0 || y > YEARS_MAX)) return { error: `Years from 0 to ${YEARS_MAX}` }
  const shown = input?.shown === undefined ? m.portalShown : !!input.shown
  if (shown !== m.portalShown && !runsStudio(v.role)) return { error: 'Only Owners and Admins choose who is on the About page' }
  if (input?.photo !== undefined) { const why = detailsBlock(v, m); if (why) return { error: why } }
  const before = currentPhotoId(m)
  let photoId = before
  if (input?.photo === null) photoId = null
  else if (typeof input?.photo === 'string') {
    if (!PICTURE_URL.test(input.photo) || input.photo.length > ABOUT_PHOTO_DATA_MAX) return { error: PHOTO }
    const kept = await storeMemberPhoto(m.id, input.photo)
    if ('error' in kept) return kept
    photoId = kept.id
  }
  await db.update(members).set({ portalShown: shown, portalTitle: title, portalBio: bio || null, portalYears: y && y > 0 ? y : null, ...photoColumns(m.color, photoId) }).where(eq(members.id, m.id))
  touch(m.id)
  return { ok: true, previous: { shown: m.portalShown, title: m.portalTitle, bio: m.portalBio, years: m.portalYears ?? null, photoId: before } }
}
/** Undo of the above. */
export async function restorePublicCard(memberId: string, before: CardBefore): Promise<{ ok: true } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const who = await editorOf(memberId); if (isErr(who)) return who
  const { v, m } = who
  const photoId = typeof before?.photoId === 'string' && await isOwnPicture(m.id, before.photoId) ? before.photoId : null
  await db.update(members).set({ portalShown: runsStudio(v.role) ? !!before?.shown : m.portalShown, portalTitle: clip(before?.title, TITLE_MAX), portalBio: clip(before?.bio, BIO_MAX), portalYears: before?.years ?? null, ...photoColumns(m.color, photoId) }).where(eq(members.id, m.id))
  touch(m.id)
  return { ok: true }
}

export type WorkInput = { title: string; place?: string | null; propertyType?: string | null; style?: string | null; description?: string | null; projectId?: string | null }
export type PictureInput = { data: string; caption?: string | null; sourceFileId?: string | null }
async function workFields(input: WorkInput): Promise<Omit<typeof memberPortfolioProjects.$inferInsert, 'id' | 'memberId' | 'createdAt' | 'updatedAt'> | Refusal> {
  const title = clip(input?.title, WORK_TITLE_MAX)
  if (!title) return { error: 'Give the work a name' }
  const propertyType = typeof input?.propertyType === 'string' && (PROPERTY_TYPES as readonly string[]).includes(input.propertyType) ? input.propertyType : null
  const style = typeof input?.style === 'string' && (STYLE_OPTIONS as readonly string[]).includes(input.style) ? input.style : null
  const description = clip(input?.description, WORK_DESC_MAX + 200)
  if (description && description.length > WORK_DESC_MAX) return { error: `Keep it to ${WORK_DESC_MAX} characters` }
  let projectId: string | null = null
  if (typeof input?.projectId === 'string' && input.projectId) {
    const [p] = await db.select({ id: projects.id }).from(projects).where(and(eq(projects.id, input.projectId), isNull(projects.deletedAt))).limit(1)
    if (!p) return { error: 'That project is gone' }
    projectId = p.id
  }
  return { title, place: clip(input?.place, PLACE_MAX), propertyType, style, description, projectId }
}
function pictureRows(workId: string, list: PictureInput[] | undefined, start: number): (typeof memberPortfolioPictures.$inferInsert)[] | Refusal {
  const pics = Array.isArray(list) ? list : []
  for (const p of pics) if (typeof p?.data !== 'string' || !PICTURE_URL.test(p.data) || p.data.length > ABOUT_PHOTO_DATA_MAX) return { error: PHOTO }
  const t = new Date()
  return pics.map((p, i) => ({ id: randomUUID(), portfolioId: workId, data: p.data, caption: clip(p.caption, CAPTION_MAX), position: start + i, sourceFileId: typeof p.sourceFileId === 'string' ? p.sourceFileId.slice(0, 64) : null, createdAt: t }))
}

/** A new piece of work with its pictures, last in the member's order. */
export async function addWork(memberId: string, input: WorkInput & { pictures?: PictureInput[] }): Promise<{ id: string } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const who = await editorOf(memberId); if (isErr(who)) return who
  const live = await db.select({ id: memberPortfolioProjects.id, position: memberPortfolioProjects.position }).from(memberPortfolioProjects).where(and(eq(memberPortfolioProjects.memberId, who.m.id), isNull(memberPortfolioProjects.deletedAt)))
  if (live.length >= WORK_MAX) return { error: `A profile shows up to ${WORK_MAX} pieces of work — remove one first` }
  const f = await workFields(input); if (isErr(f)) return f
  if ((input?.pictures?.length ?? 0) > PICTURES_MAX) return { error: `Up to ${PICTURES_MAX} pictures for each piece of work` }
  const id = randomUUID(), t = new Date()
  const pics = pictureRows(id, input?.pictures, 0); if (isErr(pics)) return pics
  await db.insert(memberPortfolioProjects).values({ id, memberId: who.m.id, ...f, position: live.reduce((n, w) => Math.max(n, w.position + 1), 0), createdBy: who.v.id, createdAt: t, updatedAt: t })
  if (pics.length) await db.insert(memberPortfolioPictures).values(pics)
  touch(who.m.id)
  return { id }
}

/** The work's words, and pictures added to it (each removed one goes with its own Undo). */
export async function updateWork(workId: string, input: WorkInput & { pictures?: PictureInput[] }): Promise<{ ok: true } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const got = await workOf(workId); if (isErr(got)) return got
  const f = await workFields(input); if (isErr(f)) return f
  const have = await db.select({ id: memberPortfolioPictures.id, position: memberPortfolioPictures.position }).from(memberPortfolioPictures).where(and(eq(memberPortfolioPictures.portfolioId, got.w.id), isNull(memberPortfolioPictures.deletedAt)))
  if (have.length + (input?.pictures?.length ?? 0) > PICTURES_MAX) return { error: `Up to ${PICTURES_MAX} pictures for each piece of work` }
  const pics = pictureRows(got.w.id, input?.pictures, have.reduce((n, p) => Math.max(n, p.position + 1), 0)); if (isErr(pics)) return pics
  await db.update(memberPortfolioProjects).set({ ...f, updatedAt: new Date() }).where(eq(memberPortfolioProjects.id, got.w.id))
  if (pics.length) await db.insert(memberPortfolioPictures).values(pics)
  touch(got.m.id)
  return { ok: true }
}

/** Take a piece of work off the profile — Undo puts it back where it was. */
export async function removeWork(workId: string): Promise<{ ok: true } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const got = await workOf(workId); if (isErr(got)) return got
  await db.update(memberPortfolioProjects).set({ deletedAt: new Date(), updatedAt: new Date() }).where(eq(memberPortfolioProjects.id, got.w.id))
  touch(got.m.id)
  return { ok: true }
}
export async function restoreWork(workId: string): Promise<{ ok: true } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const got = await workOf(workId); if (isErr(got)) return got
  await db.update(memberPortfolioProjects).set({ deletedAt: null, updatedAt: new Date() }).where(eq(memberPortfolioProjects.id, got.w.id))
  touch(got.m.id)
  return { ok: true }
}

/** Move a piece of work one place earlier or later in the member's order. */
export async function moveWork(workId: string, dir: 'up' | 'down'): Promise<{ ok: true } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const got = await workOf(workId); if (isErr(got)) return got
  const list = await db.select({ id: memberPortfolioProjects.id }).from(memberPortfolioProjects).where(and(eq(memberPortfolioProjects.memberId, got.m.id), isNull(memberPortfolioProjects.deletedAt)))
    .orderBy(asc(memberPortfolioProjects.position), asc(memberPortfolioProjects.createdAt))
  const i = list.findIndex((w) => w.id === got.w.id), j = dir === 'up' ? i - 1 : i + 1
  if (i < 0 || j < 0 || j >= list.length) return { ok: true }
  const order = list.map((w) => w.id);[order[i], order[j]] = [order[j]!, order[i]!]
  for (const [n, id] of order.entries()) await db.update(memberPortfolioProjects).set({ position: n }).where(eq(memberPortfolioProjects.id, id))
  touch(got.m.id)
  return { ok: true }
}

async function pictureOf(pictureId: unknown) {
  const [p] = typeof pictureId === 'string' ? await db.select().from(memberPortfolioPictures).where(eq(memberPortfolioPictures.id, pictureId)).limit(1) : []
  if (!p) return { error: 'This picture is gone' } as Refusal
  const got = await workOf(p.portfolioId); if (isErr(got)) return got
  return { ...got, p }
}
/** Take a picture off a piece of work — Undo puts it back. */
export async function removeWorkPicture(pictureId: string): Promise<{ ok: true } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const got = await pictureOf(pictureId); if (isErr(got)) return got
  await db.update(memberPortfolioPictures).set({ deletedAt: new Date() }).where(eq(memberPortfolioPictures.id, got.p.id))
  touch(got.m.id)
  return { ok: true }
}
export async function restoreWorkPicture(pictureId: string): Promise<{ ok: true } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const got = await pictureOf(pictureId); if (isErr(got)) return got
  await db.update(memberPortfolioPictures).set({ deletedAt: null }).where(eq(memberPortfolioPictures.id, got.p.id))
  touch(got.m.id)
  return { ok: true }
}
/** Make a picture the work's first — the one its card opens on. */
export async function makeWorkCover(pictureId: string): Promise<{ ok: true } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const got = await pictureOf(pictureId); if (isErr(got)) return got
  const list = await db.select({ id: memberPortfolioPictures.id }).from(memberPortfolioPictures).where(and(eq(memberPortfolioPictures.portfolioId, got.w.id), isNull(memberPortfolioPictures.deletedAt)))
    .orderBy(asc(memberPortfolioPictures.position), asc(memberPortfolioPictures.createdAt))
  const order = [got.p.id, ...list.map((x) => x.id).filter((x) => x !== got.p.id)]
  for (const [n, id] of order.entries()) await db.update(memberPortfolioPictures).set({ position: n }).where(eq(memberPortfolioPictures.id, id))
  touch(got.m.id)
  return { ok: true }
}
