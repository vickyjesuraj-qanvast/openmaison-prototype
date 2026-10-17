import { NextResponse, type NextRequest } from 'next/server'
import { applyReceipts, deliveryAdapter } from '@/lib/notifications/delivery'
import { fileInbound } from '@/lib/notifications/inbound'
import { readMetaEnvelope, sameSecret, type WebhookRead } from '@/lib/notifications/webhook-read'

/*
 * (pending modules S34 — her "build all of them" 2026-10-11; card api:message-delivery-providers; 1.0's POST /api/webhooks/whatsapp, the
 * same address and the same secret so the provider's setting ports as it is) The WhatsApp provider's webhook: how each message the studio
 * sent went (Delivered · Read · failed — `applyReceipts`, the outbox row found by the wamid its adapter answered) and the replies that came in
 * (`fileInbound` — into that client's conversation in Messages, or kept as they came).
 *
 * The gate is 1.0's: `?token=<WHATSAPP_WEBHOOK_SECRET>` on the URL the provider calls (360dialog appends it), compared in constant time; no
 * secret set = the webhook is off (503), a wrong one = 401. The envelope is Meta's own (360dialog forwards it untouched; the WhatsApp Cloud
 * API sends it) unless the plugged adapter reads its own (`readWebhook`, which may also check a signature — null refuses it). A body that
 * isn't JSON answers 200 so the provider doesn't retry it for a day (1.0's). GET is Meta's subscription check (`hub.verify_token` = the same
 * secret). PRODUCTION with one shared number across studios: 1.0's central router forwards each callback to its studio's own deployment by
 * the wamid (`/api/webhooks/whatsapp-central`, Platform side) — this route is what it forwards to.
 */

export const dynamic = 'force-dynamic'

function gate(req: NextRequest, token: string | null): NextResponse | null {
  const secret = process.env.WHATSAPP_WEBHOOK_SECRET
  if (!secret) return NextResponse.json({ error: 'Webhook disabled' }, { status: 503 })
  if (!sameSecret(token ?? '', secret)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return null
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams
  const refused = gate(req, q.get('hub.verify_token') ?? q.get('token'))
  if (refused) return refused
  const challenge = q.get('hub.challenge')
  return challenge ? new NextResponse(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } }) : NextResponse.json({ ok: true })
}

export async function POST(req: NextRequest) {
  const refused = gate(req, req.nextUrl.searchParams.get('token'))
  if (refused) return refused
  const text = await req.text()
  let body: unknown
  try { body = JSON.parse(text) } catch { return NextResponse.json({ ok: true }) }
  const adapter = deliveryAdapter()
  let read: WebhookRead | null
  try { read = adapter.readWebhook ? adapter.readWebhook({ body, text, headers: req.headers }) : readMetaEnvelope(body) } catch { read = null }
  if (!read) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const receipts = await applyReceipts(read.receipts)
  const filed = await fileInbound(read.inbound, { provider: adapter.readWebhook ? adapter.name : 'whatsapp-cloud' })
  return NextResponse.json({ ok: true, receipts, filed: filed.filter((f) => f.status === 'filed').length, kept: filed.filter((f) => f.status !== 'duplicate').length })
}
