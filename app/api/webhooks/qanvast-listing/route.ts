import { NextResponse, type NextRequest } from 'next/server'
import { sameSecret } from '@/lib/notifications/webhook-read'
import { readListingWebhook } from '@/lib/qanvast-listing/service'
import { applyListingAnswer } from '@/lib/qanvast-listing/queries'

/*
 * (pending modules S37 — his "build all of them" 2026-10-11; cards onboarding:qanvast-listing-verification · studio:verify-listing) QANVAST'S
 * ANSWER to the studio's listing application — the route Qanvast calls once its staff have checked the studio (1.0's Platform admin ›
 * Verification: Verify, or Reject with a note sent to the studio). The registry's `qanvast-listing-webhook`.
 *
 * The gate: `QANVAST_WEBHOOK_SECRET` as `Authorization: Bearer <secret>` or `?token=<secret>`, compared in constant time; no secret set = the
 * webhook is off (503), a wrong one = 401. The body: the plugged adapter's own (`readWebhook`, which may check a signature — null refuses it)
 * or this app's envelope — `{ application | ref, status: verified | rejected (or listed | changes), note?, reviewed_at? }`, or `{ answers: [...] }`.
 * Each answer lands once (`applyListingAnswer`, compare-and-set): a second call is `already`, a withdrawn or closed one `not_waiting`. 1.0 had
 * no such route — its staff page wrote nothing — so the secret's name is 2.0's own.
 */

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const secret = process.env.QANVAST_WEBHOOK_SECRET
  if (!secret) return NextResponse.json({ error: 'Webhook disabled' }, { status: 503 })
  const bearer = /^Bearer\s+(.+)$/i.exec(req.headers.get('authorization') ?? '')?.[1] ?? null
  if (!sameSecret(bearer ?? req.nextUrl.searchParams.get('token') ?? '', secret)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const text = await req.text()
  if (text.length > 64 * 1024) return NextResponse.json({ error: 'Too large' }, { status: 413 })
  let body: unknown
  try { body = JSON.parse(text) } catch { return NextResponse.json({ error: 'Not JSON' }, { status: 400 }) }
  const answers = readListingWebhook({ body, text, headers: req.headers })
  if (!answers) return NextResponse.json({ error: 'Not an answer' }, { status: 400 })
  const results = []
  for (const a of answers) results.push(await applyListingAnswer(a, 'qanvast'))
  return NextResponse.json({ ok: true, results })
}
