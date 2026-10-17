import { fontFile } from '@/lib/company/studio-fonts'
import { dataUrlHead, fontMime, sniffFont } from '@/lib/templates/fonts'

/**
 * (pending modules S11 — card held:quote-templates) One of the studio's own fonts, for the @font-face rule every document prints through
 * (`fontFaceCss`). Public, like the logo on a quote: the client's browser fetches it on the quote, confirmation and signing links. The
 * address is the upload's own id — a new upload is a new address — so it is kept for a year; a removed font answers not found and its
 * documents print the stack's next face.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ fontId: string }> }) {
  const { fontId } = await params
  const f = await fontFile(fontId)
  const head = f ? dataUrlHead(f.data) : null
  const format = head ? sniffFont(head) : null
  if (!f || !format) return new Response('Not found', { status: 404 })
  const bytes = Buffer.from(f.data.slice(f.data.indexOf(',') + 1), 'base64')
  return new Response(bytes, { headers: {
    'Content-Type': fontMime(format), 'Content-Length': String(bytes.length), 'Cache-Control': 'public, max-age=31536000, immutable',
    'X-Content-Type-Options': 'nosniff', 'Access-Control-Allow-Origin': '*',
  } })
}
