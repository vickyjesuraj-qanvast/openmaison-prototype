import 'server-only'
import { randomUUID } from 'node:crypto'
import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { studioPictures } from '@/lib/db/schema'
import { PICTURE_URL } from '@/lib/leads/file-store'
import { ABOUT_PHOTO_DATA_MAX } from '@/lib/portal/about-model'
import { photoIdOf, withPhoto } from './member-photo'

/**
 * (pending modules S01) Where a member's photo is kept and how it is put on: the picture is a `studio_pictures` row of kind `member` (the
 * About page's portraits already lived there, gaps build H), never deleted — a replaced or taken-off photo keeps its row, so Undo puts it
 * back. Every writer — Your profile, Company › Members › Edit details, Members › About page — goes through `photoColumns`, so the avatar's
 * look and the About portrait never drift apart.
 */
export const MEMBER_PHOTO_MSG = 'That photo didn’t read — pick a JPG or PNG under 2 MB'   // the About page's own words (gaps build H)

/** Keeps a picture the browser shrank as the member's; its id, or the rule when it is not a picture. */
export async function storeMemberPhoto(memberId: string, dataUrl: unknown): Promise<{ id: string } | { error: string }> {
  const data = typeof dataUrl === 'string' ? dataUrl : ''
  if (!PICTURE_URL.test(data) || data.length > ABOUT_PHOTO_DATA_MAX) return { error: MEMBER_PHOTO_MSG }
  const id = randomUUID()
  await db.insert(studioPictures).values({ id, kind: 'member', memberId, data, caption: null, position: 0, createdAt: new Date() })
  return { id }
}

/** Whether `pictureId` is one of this member's own pictures (an Undo putting back an earlier photo names one). */
export async function isOwnPicture(memberId: string, pictureId: string): Promise<boolean> {
  const [p] = await db.select({ id: studioPictures.id }).from(studioPictures)
    .where(and(eq(studioPictures.id, pictureId), eq(studioPictures.kind, 'member'), eq(studioPictures.memberId, memberId), isNull(studioPictures.deletedAt))).limit(1)
  return !!p
}

/** The member's columns with this photo on (`null` takes it off): the avatar's look and the About page's portrait, in step. */
export function photoColumns(look: string, pictureId: string | null): { color: string; portalPhotoId: string | null } {
  return { color: withPhoto(look, pictureId), portalPhotoId: pictureId }
}

/** The member's photo now — their look's, else (a portrait set on the About page before S01) the About page's. */
export const currentPhotoId = (m: { color: string; portalPhotoId: string | null }): string | null => photoIdOf(m.color) ?? m.portalPhotoId ?? null
