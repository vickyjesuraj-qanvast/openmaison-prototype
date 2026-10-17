import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leadFiles, leads } from '@/lib/db/schema'
import { canOpenLead, fetchViewer } from '@/lib/leads/visibility'
import { moneyFileHidden } from '@/lib/projects/money-visibility'
import { downloadName } from '@/lib/leads/file-model'
import { sendStored, standInOf, storedBytes } from '@/lib/leads/file-store'
import { STUDIO_CACHE } from '@/lib/visualizer/picture-store'
import { signedOutResponse } from '@/lib/auth/session'   // (pending modules S30) the studio's — behind sign-in

/**
 * (gaps build E, item 1) A lead's file as it was uploaded — any kind: a PDF opens in the viewer from here, a video plays (with the ranges
 * Safari asks for), and `?download=1` hands it over as a download under its own name (what Download fetches). Only to whoever may open the
 * file's lead (Who sees leads), never a project's money file to someone refused its money, never a trashed file. A demo stand-in with no
 * bytes of its own sends the picture it shows. PRODUCTION: like /files/img, this route needs an authenticated session before Who sees leads
 * is asked.
 */
export async function GET(req: Request, { params }: { params: Promise<{ fileId: string }> }) {
  const out = await signedOutResponse(); if (out) return out
  const { fileId } = await params
  const [f] = await db.select({ leadId: leadFiles.leadId, name: leadFiles.name, mime: leadFiles.mime, thumb: leadFiles.thumb, kind: leadFiles.kind })
    .from(leadFiles).innerJoin(leads, eq(leads.id, leadFiles.leadId))
    .where(and(eq(leadFiles.id, fileId), isNull(leadFiles.deletedAt), isNull(leads.deletedAt))).limit(1)
  const viewer = await fetchViewer()
  if (!f || f.kind === 'folder' || !(await canOpenLead(viewer, f.leadId))) return new Response('Not found', { status: 404 })
  if (await moneyFileHidden(fileId, viewer)) return new Response('Not found', { status: 404 })   // (fix-D, D-04 · F-17)
  const download = new URL(req.url).searchParams.get('download') === '1'
  const sent = sendStored(await storedBytes(fileId), req, { name: downloadName(f.name, f.mime), cache: STUDIO_CACHE, download })
  if (sent) return sent
  const stand = standInOf(f.thumb)
  return stand ? Response.redirect(new URL(stand, req.url), 307) : new Response('Not found', { status: 404 })
}
