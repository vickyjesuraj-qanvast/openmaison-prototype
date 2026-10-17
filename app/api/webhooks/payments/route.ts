import { NextResponse, type NextRequest } from 'next/server'
import { revalidatePath } from 'next/cache'
import { failCheckout, finishCheckout } from '@/lib/credits/checkout'
import { paymentProvider, paymentsAreStandIn } from '@/lib/credits/payments'

/*
 * (pending modules S34 — the steps' note after S19; 1.0's Dodo webhook, integration A-13) The payment provider says a checkout was paid —
 * or failed. Its adapter reads and VERIFIES the call (`readWebhook`: the signature in its headers against its secret; null refuses it, 401)
 * and names the sessions; each paid one finishes through the same records the demo checkout writes (lib/credits/checkout.ts — claimed once,
 * so the provider's retries finish nothing twice), each failed one is kept as failed. While the demo checkout answers there is no provider
 * to hear from (404). Always JSON; a provider retries on anything but 2xx.
 */

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  if (paymentsAreStandIn()) return NextResponse.json({ error: 'No payment provider on this server — the demo checkout pays inside the app' }, { status: 404 })
  const text = await req.text()
  let read: { paid: string[]; failed: string[] } | null
  try { read = await paymentProvider().readWebhook({ text, headers: req.headers }) } catch { read = null }
  if (!read) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  let paid = 0, failed = 0
  for (const id of read.paid ?? []) { if (typeof id === 'string' && 'ok' in (await finishCheckout(id))) paid++ }
  for (const id of read.failed ?? []) { if (typeof id === 'string' && (await failCheckout(id))) failed++ }
  if (paid) revalidatePath('/', 'layout')
  return NextResponse.json({ ok: true, paid, failed })
}
