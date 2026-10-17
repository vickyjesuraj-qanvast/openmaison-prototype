import { NextResponse, type NextRequest } from 'next/server'
import { paperPath } from '@/lib/paper-print'
import { pdfIsStandIn, pdfRenderer } from '@/lib/services/pdf'
import { siteConfig } from '@/lib/config'

/*
 * (pending modules S34 — lib/paper-print.ts) A paper page as a PDF file: GET /papers/pdf?path=/projects/…/invoices/… . Only a paper page
 * (`paperPath`, the allow-list) and only this app's own address are ever drawn, with the visitor's own cookies — the page keeps its own
 * permission (a studio page asks for a session, a client's link its token), so this address is open to anyone (lib/auth/paths.ts) and shows
 * nobody anything their own browser couldn't open. While the stand-in answers: 501, and the person prints from the page (Print › Save as PDF).
 */
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const path = paperPath(req.nextUrl.searchParams.get('path'))
  if (!path) return NextResponse.json({ error: 'That isn’t a paper this app can make into a PDF' }, { status: 400 })
  if (pdfIsStandIn()) return NextResponse.json({ error: 'The browser makes the PDF on this prototype — open the page and use Print › Save as PDF', page: path }, { status: 501 })
  const origin = (process.env.INTERNAL_RENDER_ORIGIN || siteConfig.url || req.nextUrl.origin).replace(/\/$/, '')
  const name = `${decodeURIComponent(path.split('?')[0]!.split('/').filter(Boolean).slice(-1)[0] ?? 'paper').replace(/[^\w.-]+/g, '-').slice(0, 80) || 'paper'}.pdf`
  try {
    const bytes = await pdfRenderer().render({ url: `${origin}${path}`, cookie: req.headers.get('cookie'), fileName: name })
    return new NextResponse(new Blob([new Uint8Array(bytes)], { type: 'application/pdf' }), { status: 200, headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${name}"`, 'Cache-Control': 'no-store' } })
  } catch (e) {
    return NextResponse.json({ error: `The PDF couldn’t be made — ${e instanceof Error ? e.message : 'the renderer refused'}. Print from the page instead.`, page: path }, { status: 502 })
  }
}
