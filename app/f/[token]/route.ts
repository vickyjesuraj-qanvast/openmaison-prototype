import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leadFileImages, leadFiles, leads } from '@/lib/db/schema'
import { readShareToken } from '@/lib/leads/file-share'
import { LINK_CACHE } from '@/lib/visualizer/picture-store'

/**
 * (UX audit 2026-09-30, T9) A shared file, as the client opens it from WhatsApp or a copied link — no session: the signed token IS the
 * permission (lib/leads/file-share.ts). It answers only while the file is live on a live lead; the picture itself when the upload kept one
 * (REG-684), else what the viewer shows for it (the prototype keeps no PDF bytes — the viewer's PDF mark, as Download's rule).
 */
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const fileId = readShareToken((await params).token)
  if (!fileId) return new Response('Not found', { status: 404 })
  const [f] = await db.select({ name: leadFiles.name, kind: leadFiles.kind, thumb: leadFiles.thumb })
    .from(leadFiles).innerJoin(leads, eq(leads.id, leadFiles.leadId))
    .where(and(eq(leadFiles.id, fileId), isNull(leadFiles.deletedAt), isNull(leads.deletedAt)))
  if (!f || f.kind === 'folder') return new Response('Not found', { status: 404 })
  const [pic] = await db.select({ data: leadFileImages.data }).from(leadFileImages).where(eq(leadFileImages.fileId, fileId))
  const m = pic ? /^data:(image\/(?:jpeg|png|webp|gif));base64,(.+)$/.exec(pic.data) : null
  if (m) {
    return new Response(Buffer.from(m[2]!, 'base64'), { headers: {
      'Content-Type': m[1]!, 'Cache-Control': LINK_CACHE,
      'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(f.name)}`,
    } })
  }
  const stand = f.thumb?.startsWith('/') && !f.thumb.startsWith('/files/img/') ? f.thumb : f.kind === 'pdf' ? '/figma-assets/file-pdf.svg' : '/figma-assets/file-thumb-1.png'
  return Response.redirect(new URL(stand, req.url), 307)
}
