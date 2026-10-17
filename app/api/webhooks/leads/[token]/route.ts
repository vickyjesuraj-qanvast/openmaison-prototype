import { createHmac, timingSafeEqual } from 'node:crypto'
import { NextResponse, type NextRequest } from 'next/server'
import { takeTry } from '@/lib/auth/limit'
import { captureLead, recordWebhookArrival } from '@/lib/leads/capture'
import { readWebhookPayload } from '@/lib/leads/webhook-payload'
import { sameSecret } from '@/lib/notifications/webhook-read'
import { fetchLeadCapture } from '@/lib/settings/queries'

/*
 * (pending modules S34 — Company › Integrations › Webhooks had no address behind its URLs; 1.0's POST /api/webhooks/leads/[token], its rules
 * kept) A lead POSTed by an external system — Zapier, Make, Typeform, a website builder, Google Ads' Lead Form — to the URL the studio
 * generated. The token in the address is the permission (an endpoint revoked or regenerated answers 404); Google's `google_key` must match
 * the endpoint's key (another endpoint with a key, 1.0's X-Signature HMAC); 10 a minute per endpoint (1.0's); 64 KB at most; JSON or a form's fields. The lead lands as every captured lead does
 * (`captureLead` → a one-row import: New and unread, its source the endpoint's label — a known phone waits in Review imported leads), and
 * the endpoint's counters and log move as the page shows them. Google's "Send test lead" answers `test` and makes none. This is real, not a
 * stand-in: nothing here calls a provider. PRODUCTION: the page shows OpenMaison's intake host (lib/settings/types.ts `webhookUrl`) —
 * point it at this route, and with one database per studio the token names the studio (1.0 kept the endpoint's studio on its row).
 */
export const dynamic = 'force-dynamic'
const MAX_BODY = 64 * 1024

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const bytes = await req.arrayBuffer().catch(() => null)
  if (!bytes) return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  if (bytes.byteLength > MAX_BODY) return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
  const capture = await fetchLeadCapture()
  const w = capture.webhooks.find((x) => x.active && x.token && sameSecret(x.token, String(token ?? '')))
  if (!w) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!takeTry(`lead-webhook:${w.id}`, Date.now(), 10)) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  const text = new TextDecoder().decode(bytes)
  /* (1.0's verifyWebhookSignature) an endpoint that carries a signing key and isn't Google's checks the body's HMAC — `X-Signature` = hex
     sha256 of the raw body under the key. The page makes keys for Google only; a key ported from 1.0's endpoint (its signing_secret) keeps
     working as it did */
  if (w.platform !== 'google_ads' && w.key) {
    const want = createHmac('sha256', w.key).update(text, 'utf8').digest()
    const got = Buffer.from(req.headers.get('x-signature') ?? '', 'hex')
    if (got.length !== want.length || !timingSafeEqual(got, want)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  let payload: Record<string, unknown>
  try {
    payload = (req.headers.get('content-type') ?? '').includes('application/x-www-form-urlencoded') ? Object.fromEntries(new URLSearchParams(text).entries()) : JSON.parse(text) as Record<string, unknown>
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('The body must be one JSON object')
  } catch (e) { return NextResponse.json({ error: 'Invalid body', detail: e instanceof Error ? e.message : 'unreadable' }, { status: 400 }) }
  if (w.platform === 'google_ads' && !(w.key && typeof payload.google_key === 'string' && sameSecret(payload.google_key, w.key))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const a = readWebhookPayload(payload, w.platform)
  if (a.isTest) return NextResponse.json({ status: 'test' })
  if (!a.name) return NextResponse.json({ error: 'Validation failed', detail: 'name is required' }, { status: 400 })
  if (!a.phone && !a.email) return NextResponse.json({ error: 'Validation failed', detail: 'a phone or an email is required' }, { status: 400 })
  const r = await captureLead('webhook', { name: a.name, phone: a.phone ?? '', email: a.email ?? undefined, propertyType: a.propertyType ?? undefined, budget: a.budget ?? undefined, message: a.message ?? undefined }, undefined, w.label)
  const outcome: 'created' | 'duplicate' = r.flagged > 0 ? 'duplicate' : 'created'
  await recordWebhookArrival(w.id, outcome, a.name)
  return NextResponse.json({ status: outcome, import_id: r.importId })
}
