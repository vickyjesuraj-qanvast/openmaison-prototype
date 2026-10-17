import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leadFiles, leads, projectInvoices, projectPayments } from '@/lib/db/schema'
import { readShareToken } from '@/lib/leads/file-share'
import { downloadName } from '@/lib/leads/file-model'
import { sendStored, standInOf, storedBytes } from '@/lib/leads/file-store'
import { LINK_CACHE } from '@/lib/visualizer/picture-store'
import { isPreviewFetcher } from '@/lib/link-cards/bots'
import { previewHtml } from '@/lib/link-cards/html'
import { cardPath } from '@/lib/link-cards/model'
import { linkCard } from '@/lib/link-cards/queries'

/**
 * (UX audit 2026-09-30, T9) A shared file, as the client opens it from WhatsApp or a copied link — no session: the signed token IS the
 * permission (lib/leads/file-share.ts). It answers only while the file is live on a live lead. (gaps build E, item 1) It sends the file as it
 * was uploaded — a drawing's PDF opens, a spreadsheet downloads under its name, a video plays — through the one storage path
 * (lib/leads/file-store.ts); a demo stand-in with no bytes of its own sends the picture it shows.
 */
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const token = (await params).token
  const fileId = readShareToken(token)
  if (!fileId) return new Response('Not found', { status: 404 })
  /* (pending modules S02) a chat app drawing the link's preview gets the studio's card — the file's name, from whom — not the file */
  const url = new URL(req.url)
  if (!url.searchParams.has('raw') && isPreviewFetcher(req.headers.get('user-agent'))) {
    const card = await linkCard('file', token)
    if (card.open) return previewHtml(card, { url: `${url.origin}${url.pathname}`, image: `${url.origin}${cardPath('file', token)}`, raw: `${url.pathname}?raw=1` })
  }
  const [f] = await db.select({ name: leadFiles.name, kind: leadFiles.kind, thumb: leadFiles.thumb, mime: leadFiles.mime })
    .from(leadFiles).innerJoin(leads, eq(leads.id, leadFiles.leadId))
    .where(and(eq(leadFiles.id, fileId), isNull(leadFiles.deletedAt), isNull(leads.deletedAt)))
  if (!f || f.kind === 'folder') return new Response('Not found', { status: 404 })
  const sent = sendStored(await storedBytes(fileId), req, { name: downloadName(f.name, f.mime), cache: LINK_CACHE })
  if (sent) return sent
  /* (gaps build B, item 6) an invoice's or a receipt's entry holds no bytes — it is the record: its own no-login link opens the paper */
  const [inv] = await db.select({ token: projectInvoices.shareToken }).from(projectInvoices).where(eq(projectInvoices.fileId, fileId)).limit(1)
  const [rct] = inv?.token ? [] : await db.select({ token: projectPayments.shareToken }).from(projectPayments).where(eq(projectPayments.receiptFileId, fileId)).limit(1)
  if (inv?.token) return Response.redirect(new URL(`/invoice/${inv.token}`, req.url), 307)
  if (rct?.token) return Response.redirect(new URL(`/receipt/${rct.token}`, req.url), 307)
  const stand = standInOf(f.thumb)
  return stand ? Response.redirect(new URL(stand, req.url), 307) : new Response('Not found', { status: 404 })
}
