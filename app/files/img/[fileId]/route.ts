import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { storedBytes } from '@/lib/leads/file-store'   // (pending modules S34)
import { leadFiles } from '@/lib/db/schema'
import { canOpenLead, fetchViewer } from '@/lib/leads/visibility'
import { moneyFileHidden } from '@/lib/projects/money-visibility'
import { sendPicture, STUDIO_CACHE } from '@/lib/visualizer/images'
import { signedOutResponse } from '@/lib/auth/session'   // (pending modules S30) the studio's — behind sign-in

/** (REG-684) An uploaded file's picture — kept beside the file, served at its address so pages never carry the picture itself; (audit
    2026-09-26, critic §1) only to whoever may open the file's lead. A render filed from the AI Visualizer keeps its own copy here (F093).
    (wave E, files-3 · critic-1) PRODUCTION: this route needs an authenticated session — no session, a 401 before Who sees leads is asked.
    (pending modules S30) It does now: a signed-out browser gets its 401 first (`signedOutResponse`); a browser that never signed in or out
    is still the demo's own session (lib/auth/paths.ts `DEMO_STANDING_SESSION`). */
export async function GET(req: Request, { params }: { params: Promise<{ fileId: string }> }) {
  const out = await signedOutResponse(); if (out) return out
  const { fileId } = await params
  const [f] = await db.select({ leadId: leadFiles.leadId }).from(leadFiles).where(eq(leadFiles.id, fileId))
  const viewer = await fetchViewer()
  if (!f || !(await canOpenLead(viewer, f.leadId))) return new Response('Not found', { status: 404 })
  if (await moneyFileHidden(fileId, viewer)) return new Response('Not found', { status: 404 })   // (fix-D, D-04 · F-17) a client's bank proof is the project's team's
  return sendPicture(await storedBytes(fileId), req.url, STUDIO_CACHE)   // (pending modules S34) through the one file store
}
