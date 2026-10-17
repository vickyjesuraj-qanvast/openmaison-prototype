'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { and, asc, eq, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { studioPictures } from '@/lib/db/schema'
import { fetchViewer } from '@/lib/leads/visibility'
import { runsStudio } from '@/lib/leads/assign-policy'
import { PICTURE_URL } from '@/lib/leads/file-store'
import { sanitizeContractHtml } from '@/lib/contracts/sanitize'
import { readAbout, saveAbout } from '@/lib/portal/about'
import { ABOUT_PHOTOS_MAX, ABOUT_PHOTO_DATA_MAX, AWARDS_MAX, AWARD_MAX, STORY_MAX, parseAbout, type StudioAbout } from '@/lib/portal/about-model'
import { workspaceRefusal } from '@/lib/settings/desk'   // (S45C) the workspace's role rule

/*
 * (gaps build H — H-Q21 · H-Q22) Company › Profile › About the studio, for clients ((pending modules S27) a member's card on the About page
 * moved to their Public profile — app/company/portfolio-actions.ts). Owners and
 * Admins change them (the profile's rule, REG-646). A picture travels inside one object; a removed photo keeps its row so Undo puts it back.
 */
type Refusal = { error: string }
const RULE = 'Only Owners and Admins change what clients read about the studio'
async function runner(): Promise<Refusal | null> { return runsStudio((await fetchViewer()).role) ? null : { error: RULE } }
const touch = () => { revalidatePath('/company/profile'); revalidatePath('/company/members'); revalidatePath('/company/portal'); revalidatePath('/', 'layout') }   // (pending modules S01) a portrait is the member's avatar everywhere

/** The year, the story and the awards — answers what was saved and what it replaced (the snackbar's Undo saves that back). */
export async function saveStudioAbout(input: StudioAbout): Promise<{ about: StudioAbout; previous: StudioAbout } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const no = await runner(); if (no) return no
  const previous = await readAbout()
  const story = typeof input?.story === 'string' ? input.story : ''
  if (story.length > STORY_MAX) return { error: `Keep the story under ${STORY_MAX.toLocaleString('en-SG')} characters` }
  const awards = Array.isArray(input?.awards) ? input.awards : []
  if (awards.length > AWARDS_MAX) return { error: `Up to ${AWARDS_MAX} awards` }
  if (awards.some((a) => typeof a?.name === 'string' && a.name.trim().length > AWARD_MAX)) return { error: `Keep an award’s name under ${AWARD_MAX} characters` }
  const about = parseAbout({ year: input?.year, story: sanitizeContractHtml(story), awards: awards.map((a) => ({ ...a, id: a?.id || randomUUID() })) })
  await saveAbout(about)
  touch()
  return { about, previous }
}

/** Add a photo (the browser shrank it) — at the end; the first is the cover. */
export async function addAboutPhoto(input: { dataUrl: string; caption?: string }): Promise<{ id: string } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const no = await runner(); if (no) return no
  const data = String(input?.dataUrl ?? '')
  if (!PICTURE_URL.test(data) || data.length > ABOUT_PHOTO_DATA_MAX) return { error: 'That photo didn’t read — pick a JPG or PNG under 2 MB' }
  const have = await db.select({ id: studioPictures.id, position: studioPictures.position }).from(studioPictures).where(and(eq(studioPictures.kind, 'about'), isNull(studioPictures.deletedAt)))
  if (have.length >= ABOUT_PHOTOS_MAX) return { error: `Up to ${ABOUT_PHOTOS_MAX} photos — remove one first` }
  const id = randomUUID()
  await db.insert(studioPictures).values({ id, kind: 'about', memberId: null, data, caption: typeof input?.caption === 'string' ? input.caption.trim().slice(0, 80) || null : null, position: have.reduce((m, r) => Math.max(m, r.position + 1), 0), createdAt: new Date() })
  touch()
  return { id }
}
export async function removeAboutPhoto(id: string): Promise<{ ok: true } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const no = await runner(); if (no) return no
  await db.update(studioPictures).set({ deletedAt: new Date() }).where(and(eq(studioPictures.id, String(id ?? '')), eq(studioPictures.kind, 'about')))
  touch()
  return { ok: true }
}
export async function restoreAboutPhoto(id: string): Promise<{ ok: true } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const no = await runner(); if (no) return no
  const live = await db.select({ id: studioPictures.id }).from(studioPictures).where(and(eq(studioPictures.kind, 'about'), isNull(studioPictures.deletedAt)))
  if (live.length >= ABOUT_PHOTOS_MAX) return { error: `Up to ${ABOUT_PHOTOS_MAX} photos — remove one first` }
  await db.update(studioPictures).set({ deletedAt: null }).where(and(eq(studioPictures.id, String(id ?? '')), eq(studioPictures.kind, 'about')))
  touch()
  return { ok: true }
}
/** Make a photo the cover — it moves to the front, the rest keep their order. Answers the order it replaced (Undo). */
export async function makeAboutCover(id: string): Promise<{ order: string[] } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const no = await runner(); if (no) return no
  const rows = await db.select({ id: studioPictures.id }).from(studioPictures).where(and(eq(studioPictures.kind, 'about'), isNull(studioPictures.deletedAt))).orderBy(asc(studioPictures.position), asc(studioPictures.createdAt))
  const order = rows.map((r) => r.id)
  if (!order.includes(id)) return { error: 'That photo isn’t there any more' }
  await setAboutOrder([id, ...order.filter((x) => x !== id)])
  return { order }
}
export async function setAboutOrder(order: string[]): Promise<{ ok: true } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const no = await runner(); if (no) return no
  await db.transaction(async (tx) => { for (const [i, id] of (Array.isArray(order) ? order : []).entries()) await tx.update(studioPictures).set({ position: i }).where(and(eq(studioPictures.id, String(id)), eq(studioPictures.kind, 'about'))) })
  touch()
  return { ok: true }
}
