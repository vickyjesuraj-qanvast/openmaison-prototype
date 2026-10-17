import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leadFiles } from '@/lib/db/schema'
import { canOpenLead, fetchViewer } from '@/lib/leads/visibility'
import { moneyFileHidden } from '@/lib/projects/money-visibility'
import { sendStored, storedThumb } from '@/lib/leads/file-store'
import { STUDIO_CACHE } from '@/lib/visualizer/picture-store'
import { signedOutResponse } from '@/lib/auth/session'   // (pending modules S30) the studio's — behind sign-in

/** (gaps build E, item 1) The picture of a file that is not one — a PDF's first page, a video's first frame — as /files/img serves a picture's
    own: only to whoever may open the file's lead, never a money file to someone refused the project's money. A trashed file keeps its picture
    for Deleted Files. */
export async function GET(req: Request, { params }: { params: Promise<{ fileId: string }> }) {
  const out = await signedOutResponse(); if (out) return out
  const { fileId } = await params
  const [f] = await db.select({ leadId: leadFiles.leadId, name: leadFiles.name }).from(leadFiles).where(eq(leadFiles.id, fileId)).limit(1)
  const viewer = await fetchViewer()
  if (!f || !(await canOpenLead(viewer, f.leadId))) return new Response('Not found', { status: 404 })
  if (await moneyFileHidden(fileId, viewer)) return new Response('Not found', { status: 404 })
  return sendStored(await storedThumb(fileId), req, { name: `${f.name}.jpg`, cache: STUDIO_CACHE }) ?? new Response('Not found', { status: 404 })
}
