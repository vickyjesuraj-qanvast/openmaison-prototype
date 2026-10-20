import { emailLogoFile } from '@/lib/notifications/email-logo'

/**
 * (S44O — UAT rows 314 · 337, M15 — the developers' fix, call C10 as recommended, his UAT ask 2026-10-15) The studio's logo as its notification
 * emails draw it: the brand kit's PNG copy (lib/notifications/email-logo.ts). Public — a mail app fetches it with no session — and it shows only
 * what every email the studio sends already shows. The address carries the copy's fingerprint (`?v=`), so a new logo is a new address.
 */
export const dynamic = 'force-dynamic'

export async function GET() {
  const f = await emailLogoFile()
  if (!f) return new Response('Not found', { status: 404 })
  return new Response(new Uint8Array(f.bytes), { headers: { 'Content-Type': f.mime, 'Content-Length': String(f.bytes.length), 'Cache-Control': 'public, max-age=86400', 'X-Content-Type-Options': 'nosniff' } })
}
