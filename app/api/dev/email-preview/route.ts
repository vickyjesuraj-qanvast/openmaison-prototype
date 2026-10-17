import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { notificationOutbox } from '@/lib/db/schema'
import { emailHtmlOfRow } from '@/lib/notifications/delivery'
import { fetchViewer } from '@/lib/leads/visibility'
import { runsStudio } from '@/lib/leads/assign-policy'
import { devPreviewsOpen } from '@/lib/services/dev-previews'

/*
 * (pending modules S34 — 1.0's /api/dev/email-preview and /api/dev/email-gallery) A sent email as its HTML page would arrive, for the
 * developers wiring an email provider and for Vicky designing the page (lib/notifications/email-html.ts): GET /api/dev/email-preview?id=<an
 * outbox row>. Off in a production build unless OPENMAISON_DEV_PREVIEWS=1; an Owner's or an Admin's (the log names leads and people).
 */
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  if (!devPreviewsOpen()) return new Response('Not found', { status: 404 })
  const viewer = await fetchViewer()
  if (!runsStudio(viewer.role)) return new Response('Not found', { status: 404 })
  const id = new URL(req.url).searchParams.get('id') ?? ''
  const [r] = id ? await db.select().from(notificationOutbox).where(eq(notificationOutbox.id, id)).limit(1) : []
  if (!r || r.channel !== 'email') return new Response('No email by that id', { status: 404 })
  return new Response(await emailHtmlOfRow(r), { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Security-Policy': "default-src 'none'; img-src https: http: data:; style-src 'unsafe-inline'" } })
}
