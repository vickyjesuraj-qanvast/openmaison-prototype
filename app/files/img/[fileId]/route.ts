import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leadFileImages, leadFiles } from '@/lib/db/schema'
import { canOpenLead, fetchViewer } from '@/lib/leads/visibility'
import { sendPicture, STUDIO_CACHE } from '@/lib/visualizer/images'

/** (REG-684) An uploaded file's picture — kept beside the file, served at its address so pages never carry the picture itself; (audit
    2026-09-26, critic §1) only to whoever may open the file's lead. A render filed from the AI Visualizer keeps its own copy here (F093).
    (wave E, files-3 · critic-1) PRODUCTION: this route needs an authenticated session — no session, a 401 before Who sees leads is asked.
    The prototype has no login, so a cookie-less request reads as the signed-in member (parity map 17 says so). */
export async function GET(req: Request, { params }: { params: Promise<{ fileId: string }> }) {
  const { fileId } = await params
  const [f] = await db.select({ leadId: leadFiles.leadId }).from(leadFiles).where(eq(leadFiles.id, fileId))
  if (!f || !(await canOpenLead(await fetchViewer(), f.leadId))) return new Response('Not found', { status: 404 })
  const [pic] = await db.select({ data: leadFileImages.data }).from(leadFileImages).where(eq(leadFileImages.fileId, fileId))
  return sendPicture(pic?.data, req.url, STUDIO_CACHE)
}
