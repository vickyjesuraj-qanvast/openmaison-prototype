import { db } from '@/lib/db'
import { portalBellReads } from '@/lib/db/schema'
import { loginPath, portalPath } from '@/lib/portal/model'
import { portalFileFor, serveLeadFile } from '@/lib/portal/files'
import { portalGate } from '@/lib/portal/session'

/**
 * (Projects round 4a) A lead file opened from the portal — session-checked, as every portal request is (lib/portal/session.ts `portalGate`):
 * an old address redirects, a paused portal refuses (a studio preview still opens), a visitor not signed in goes to sign in, and the file
 * must be on one of their homes and pass a `PORTAL_FILE_RULES` rule (lib/portal/files.ts — Shown to client; round 4b adds an update's media).
 */
export async function GET(req: Request, { params }: { params: Promise<{ slug: string; fileId: string }> }) {
  const { slug, fileId } = await params
  const gate = await portalGate(slug, `file/${fileId}`)
  if (gate.kind === 'missing') return notFound(req, null)
  if (gate.kind === 'redirect') return Response.redirect(new URL(gate.to, req.url), 307)
  if (gate.kind === 'paused') return new Response(`${gate.look.studio}’s portal is paused`, { status: 403 })
  if (gate.kind === 'out') return Response.redirect(new URL(loginPath(slug, portalPath(slug, `file/${fileId}`)), req.url), 307)   // (fix-F, F-20) back to the file
  const f = await portalFileFor(gate.visitor, fileId)
  if (!f) return notFound(req, slug)
  /* (fix-F, F-14) a shown file the client opened is no longer new for them: What needs you, More's dot and the Files count let it go —
     kept as their read mark (the bell's store, `file:<id>`), never in a studio's preview. Opened = the file itself in a tab, not a thumbnail */
  if (!gate.visitor.preview && f.shownToClientAt && isPage(req)) await db.insert(portalBellReads).values({ homeownerId: gate.visitor.homeownerId, rowKey: `file:${f.id}`, readAt: new Date() }).onConflictDoNothing()
  return serveLeadFile(f, req, { thumb: new URL(req.url).searchParams.get('thumb') === '1' })   // (gaps build E, item 1) `?thumb=1`: a PDF's first page, a video's first frame
}

/** (fix-F, F-23) A file that isn't the client's (or is gone). Opened as a page (a tab the client follows) it lands on the portal's own notice
    in its frame with the way back — never a bare "Not found"; a picture, a video or a fetch asking for it gets the plain 404 (it names no file
    and leaks nothing either way). */
const isPage = (req: Request) => req.headers.get('sec-fetch-dest') === 'document' || (req.headers.get('accept') ?? '').includes('text/html')
function notFound(req: Request, slug: string | null): Response {
  if (!isPage(req)) return new Response('Not found', { status: 404 })
  return Response.redirect(new URL(slug ? portalPath(slug, 'gone') : '/my', req.url), 307)
}
