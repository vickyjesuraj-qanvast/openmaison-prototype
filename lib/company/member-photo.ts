/**
 * (pending modules S01 — Your own profile, her "build all of them" 2026-10-11; 1.0's profiles.avatar_url) A member's photo, as their avatar
 * shows it everywhere in the studio. `members.color` has always been the avatar's look — a tint (`#5B7FD7`), or `photo` for the demo's one
 * fixed portrait (REG-329). A member's own photo joins that vocabulary as `photo:<pictureId>|<the look under it>`: the picture is a
 * `studio_pictures` row of kind `member` (served at /company/picture/<id>), and the look under it is what the avatar goes back to when the
 * photo is taken off. One value, so every avatar the studio draws follows at once — no read had to learn a new column. One photo per member:
 * the same picture is their portrait on the client portal's About › Our team (`members.portal_photo_id` is kept in step, gaps build H).
 * Pure, client-safe.
 */

/** The demo's one fixed portrait (the look `photo`, REG-329). */
export const DEMO_PORTRAIT = '/figma-assets/avatar-user.png'
const OWN = /^photo:([A-Za-z0-9-]{1,64})\|(.+)$/

/*
 * (pending modules S13 — S01's note: "the portal shows a studio member's tint, not their photo, outside About › Our team") On the client's
 * portal a member of the client's own team shows their photo wherever they appear — the same picture, read through the portal's own address
 * (`/my/<address>/face/<pictureId>`, behind the portal's gate: only a member on one of that client's homes, app/my/[slug]/face/[id]). On a
 * client's page the look becomes `face:<address>/<pictureId>|<the look under it>`, so the one Avatar draws it. Made for a page, never stored.
 */
const FACE = /^face:([A-Za-z0-9~%-]{1,120})\/([A-Za-z0-9-]{1,64})\|(.+)$/
/** Where the portal serves a team member's photo to the client signed in at `slug` (the address as the page was opened, a preview's mark too). */
export const portalFaceHref = (slug: string, pictureId: string): string => `/my/${slug}/face/${pictureId}`
/** The client's own team, as one page of the portal may show them: the address the page was opened at, and the pictures it may draw. */
export type ClientFaces = { slug: string; pictures: ReadonlySet<string> }

/** The member's own photo's picture id, when their look carries one. */
export function photoIdOf(look: string | null | undefined): string | null {
  return OWN.exec(look ?? '')?.[1] ?? null
}
/** The look under a member's own photo — their tint, or `photo` — and any other look as it is. What the avatar returns to without the photo,
    and what a client's page shows (the studio's picture address is the studio's, never a client's). (pending modules S13) The portal's face
    form (`face:`) has a look under it too. */
export function lookUnder(look: string | null | undefined): string {
  const m = OWN.exec(look ?? '') ?? FACE.exec(look ?? '')
  return m ? m[m.length - 1]! : look ?? ''
}

/** The look with this picture over it (the look under it kept); `null` takes the photo off. */
export function withPhoto(look: string, pictureId: string | null): string {
  const under = lookUnder(look) || '#5B7FD7'
  return pictureId ? `photo:${pictureId}|${under}` : under
}
/** Where a member's own photo is read on the studio's pages. */
export const memberPhotoHref = (pictureId: string): string => `/company/picture/${pictureId}`
/** The picture an avatar shows for this look — the member's own photo, the demo's portrait — or null for a tinted initial. */
export function avatarSrc(look: string | null | undefined): string | null {
  const id = photoIdOf(look)
  if (id) return memberPhotoHref(id)
  const face = FACE.exec(look ?? '')   // (pending modules S13) a team member's photo on the client's portal
  if (face) return portalFaceHref(face[1]!, face[2]!)
  return look === 'photo' ? DEMO_PORTRAIT : null
}
/** A client's page carries no studio picture address: each line's or person's look becomes the look under any photo (the portal, the client's
    links). (pending modules S13) On the client's portal, `faces` names their own team's pictures: those show, through the portal's address. */
export function forClient<T extends { color: string | null }>(rows: T[], faces?: ClientFaces | null): T[] {
  return rows.map((r) => {
    const id = photoIdOf(r.color)
    if (!r.color || !id) return r
    return { ...r, color: faces?.pictures.has(id) ? `face:${faces.slug}/${id}|${lookUnder(r.color)}` : lookUnder(r.color) }
  })
}
