import 'server-only'
import { and, eq, inArray, isNull, ne } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leadFiles, projectUpdateFiles, projectUpdates, projects, type LeadFile } from '@/lib/db/schema'
import { sendStored, standInOf, storedBytes, storedThumb } from '@/lib/leads/file-store'   // (gaps build E, item 1)
import { downloadName } from '@/lib/leads/file-model'
import { LINK_CACHE } from '@/lib/visualizer/picture-store'
import { portalPath } from './model'
import { isSharedChoicePicture } from '@/lib/projects/choices'
import { isOwnProof } from '@/lib/projects/payments-portal'
import { isClientFloorPlanFile } from '@/lib/projects/floor-plan'   // (gaps build G)
import { isClientTicketFile } from '@/lib/projects/tickets'   // (gaps build H)
import { isClientMessageFile } from '@/lib/projects/messages'
import type { PortalVisitor } from './session'
import { hiddenOf, type SectionKey } from './sections'
import { fetchPortalSections } from './sections-queries'

/*
 * (Projects round 4a) The portal's own way to open a lead file — `/my/<address>/file/<fileId>` (app/my/[slug]/file/[fileId]/route.ts),
 * checked on the server like every portal request: the address, Live / Paused, the session (a client, or a studio preview), the file on
 * one of the visitor's homes, live (not trashed, not a folder) — and a rule that lets the client see it. Today's signed `/f/<token>` link is
 * left as it is for files sent on WhatsApp; the portal's own pages use this one.
 *
 * `PORTAL_FILE_RULES` is a REGISTRY: round 4a's rule is "marked Shown to client"; round 4b appends "media of a published update" (and later
 * rounds theirs). A file passes when any rule says yes.
 */
export type PortalFileRule = ((file: LeadFile) => boolean | Promise<boolean>) & { section?: SectionKey }
/** (Projects round 9, Q-45) A rule that belongs to one of the portal's sections: while the studio has it switched off, the rule lets nothing
    through. A rule a later round appends wraps itself the same way (`inSection('money', …)`). */
export const inSection = (section: SectionKey, rule: (file: LeadFile) => boolean | Promise<boolean>): PortalFileRule => Object.assign(rule, { section })
export const PORTAL_FILE_RULES: PortalFileRule[] = [
  inSection('files', (f) => !!f.shownToClientAt),   // (r4a) the lead's Files › Show to client
  inSection('choices', (f) => isSharedChoicePicture(f.id)),   // (Projects round 8) the picture of an option on a choice shared with the client
  inSection('money', (f) => isOwnProof(f.id, f.leadId)),   // (Projects round 6) the bank's confirmation the client sent with I have paid — off with the Money section (round 9)
  /* (r4b) a picture, video or document of a PUBLISHED update of the lead's project — never a draft's, one in review, sent back or withdrawn */
  inSection('updates', async (f) => (await db.select({ id: projectUpdateFiles.fileId }).from(projectUpdateFiles).innerJoin(projectUpdates, eq(projectUpdates.id, projectUpdateFiles.updateId))
    .innerJoin(projects, eq(projects.id, projectUpdates.projectId))
    .where(and(eq(projectUpdateFiles.fileId, f.id), eq(projects.leadId, f.leadId), eq(projectUpdates.status, 'published'), isNull(projectUpdates.deletedAt), isNull(projects.deletedAt))).limit(1)).length > 0),
  /* (gaps build G, G-Q1) a live plan's original, or a photo on a mark (or its thread) the client can see — never one on Studio only */
  inSection('floor-plan', (f) => isClientFloorPlanFile(f.id, f.leadId)),
  /* (gaps build H, H-Q7 · H-Q12) a photo on one of the home's issues (never on an internal note), a photo of a message still there */
  inSection('issues', (f) => isClientTicketFile(f.id, f.leadId)),
  inSection('messages', (f) => isClientMessageFile(f.id, f.leadId)),
]

/** The portal address of a file the client may open. */
export const portalFileHref = (slug: string, fileId: string) => portalPath(slug, `file/${fileId}`)

/** The file, when this visitor may open it through the portal; null otherwise (it answers not found — never why). */
export async function portalFileFor(visitor: PortalVisitor, fileId: string): Promise<LeadFile | null> {
  const leadIds = visitor.links.map((l) => l.leadId)
  if (!leadIds.length) return null
  const [f] = await db.select().from(leadFiles)
    .where(and(eq(leadFiles.id, fileId), inArray(leadFiles.leadId, leadIds), isNull(leadFiles.deletedAt), ne(leadFiles.kind, 'folder'))).limit(1)
  if (!f) return null
  const hidden = hiddenOf(await fetchPortalSections())   // (Projects round 9) a section switched off lets nothing of its own through
  for (const rule of PORTAL_FILE_RULES) if ((!rule.section || !hidden.includes(rule.section)) && await rule(f)) return f
  return null
}

/** The file's bytes, as it was uploaded (gaps build E, item 1 — one storage path, lib/leads/file-store.ts): a picture, a PDF that opens, a video
    that plays (by the range a player asks for — Safari asks before it plays), a spreadsheet that downloads under its name. `thumb`: the picture
    of a file that is not one (a PDF's first page, a video's first frame), for a grid's tile. A demo stand-in sends the picture it shows. */
export async function serveLeadFile(f: Pick<LeadFile, 'id' | 'name' | 'kind' | 'thumb' | 'mime'>, req: Request, o: { thumb?: boolean } = {}): Promise<Response> {
  if (o.thumb) return sendStored(await storedThumb(f.id), req, { name: `${f.name}.jpg`, cache: LINK_CACHE }) ?? new Response('Not found', { status: 404 })
  const sent = sendStored(await storedBytes(f.id), req, { name: downloadName(f.name, f.mime), cache: LINK_CACHE })
  if (sent) return sent
  const stand = standInOf(f.thumb) ?? (f.kind === 'pdf' ? '/figma-assets/file-pdf.svg' : f.kind === 'image' ? '/figma-assets/file-thumb-1.png' : null)
  return stand ? Response.redirect(new URL(stand, req.url), 307) : new Response('Not found', { status: 404 })
}
