/*
 * (pending modules S34 — card api:message-delivery-providers: "Delivered and Read receipts from WhatsApp" and "What happens to a client's
 * WhatsApp reply"; 1.0's src/app/api/webhooks/whatsapp/route.ts) What a provider's webhook tells the delivery layer, and the reader for
 * Meta's own envelope — the one 360dialog (1.0's provider) forwards untouched and the WhatsApp Cloud API sends itself. Pure.
 *
 * A provider with another envelope (Twilio, an email service's events) gives its adapter a `readWebhook` that answers the same `WebhookRead`;
 * the route (app/api/webhooks/whatsapp) and the layer (`applyReceipts` · `fileInbound`) never change.
 */

/** How a message the studio sent went, as the provider later reported it. `providerRef` = the id the adapter's `send` answered (a wamid). */
export type Receipt = { providerRef: string; status: 'sent' | 'delivered' | 'read' | 'failed'; at: number; error: string | null }
/** A message that came IN — a client's WhatsApp reply. `from` = +65 and the digits; `replyTo` = the wamid of the studio's message it answers. */
export type Inbound = { providerRef: string; from: string; kind: string; text: string | null; replyTo: string | null; at: number }
export type WebhookRead = { receipts: Receipt[]; inbound: Inbound[] }

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null)
const obj = (v: unknown): Record<string, unknown> | null => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null)
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])
/** Meta's timestamps are seconds since 1970, as a string. */
const when = (v: unknown, fallback: number): number => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n * 1000 : fallback }
const STATUSES = new Set(['sent', 'delivered', 'read', 'failed'])

/** Meta's WhatsApp webhook envelope (`entry[].changes[].value.statuses[]` and `.messages[]`) → receipts and inbound messages. */
export function readMetaEnvelope(body: unknown, now = Date.now()): WebhookRead {
  const out: WebhookRead = { receipts: [], inbound: [] }
  for (const entry of arr(obj(body)?.entry)) {
    for (const change of arr(obj(entry)?.changes)) {
      const value = obj(obj(change)?.value)
      if (!value) continue
      for (const s of arr(value.statuses)) {
        const o = obj(s)
        const id = str(o?.id), status = str(o?.status)
        if (!id || !status || !STATUSES.has(status)) continue
        const err = obj(arr(o?.errors)[0])
        const code = err && (typeof err.code === 'number' || typeof err.code === 'string') ? String(err.code) : null
        const why = err ? str(err.title) ?? str(err.message) : null
        out.receipts.push({ providerRef: id, status: status as Receipt['status'], at: when(o?.timestamp, now), error: status === 'failed' ? [code, why].filter(Boolean).join(' · ') || 'Failed' : null })
      }
      for (const m of arr(value.messages)) {
        const o = obj(m)
        const id = str(o?.id), from = str(o?.from)
        if (!id || !from) continue
        const kind = str(o?.type) ?? 'text'
        /* words: a text's body, a picture's or a document's caption, a button's label */
        const text = str(obj(o?.text)?.body) ?? str(obj(o?.[kind])?.caption) ?? str(obj(o?.button)?.text) ?? str(obj(obj(o?.interactive)?.button_reply)?.title)
        const digits = from.replace(/\D+/g, '')
        out.inbound.push({ providerRef: id, from: digits ? `+${digits}` : from, kind, text, replyTo: str(obj(o?.context)?.id), at: when(o?.timestamp, now) })
      }
    }
  }
  return out
}

/** A constant-time compare for the webhook's token — never the first wrong character's position (1.0's `constantTimeEqual`). */
export function sameSecret(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let x = 0
  for (let i = 0; i < a.length; i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return x === 0
}
