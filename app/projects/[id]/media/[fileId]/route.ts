import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leadFiles, projects } from '@/lib/db/schema'
import { sendStored, storedBytes } from '@/lib/leads/file-store'
import { canOpenLead, fetchViewer } from '@/lib/leads/visibility'
import { moneyFileHidden } from '@/lib/projects/money-visibility'
import { STUDIO_CACHE } from '@/lib/visualizer/picture-store'
import { signedOutResponse } from '@/lib/auth/session'   // (pending modules S30) the studio's — behind sign-in

/**
 * (REG-950, Projects round 3) An update's video or document, as uploaded — its own bytes (1.0 kept only the name, D-101): a video plays
 * from here (with ranges, which Safari asks for before it plays one) and a PDF or an Office file opens from here. A picture keeps its
 * address at /files/img/<id> (REG-684). Only to whoever may open the project's lead; a file of another lead answers not found.
 * PRODUCTION: like /files/img, this route needs an authenticated session before Who sees leads is asked.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string; fileId: string }> }) {
  const out = await signedOutResponse(); if (out) return out
  const { id, fileId } = await params
  const [f] = await db.select({ leadId: leadFiles.leadId, name: leadFiles.name, projectLead: projects.leadId })
    .from(leadFiles).innerJoin(projects, eq(projects.leadId, leadFiles.leadId))
    .where(and(eq(leadFiles.id, fileId), eq(projects.id, id), isNull(leadFiles.deletedAt), isNull(projects.deletedAt))).limit(1)
  const viewer = await fetchViewer()
  if (!f || !(await canOpenLead(viewer, f.leadId))) return new Response('Not found', { status: 404 })
  if (await moneyFileHidden(fileId, viewer)) return new Response('Not found', { status: 404 })   // (fix-D, D-04 · F-17) a PDF proof is the project's team's
  /* (gaps build E, item 1) the one storage path's sender — ranges, the file's own name, only a safe type opens in place */
  return sendStored(await storedBytes(fileId), req, { name: f.name, cache: STUDIO_CACHE }) ?? new Response('Not found', { status: 404 })
}
