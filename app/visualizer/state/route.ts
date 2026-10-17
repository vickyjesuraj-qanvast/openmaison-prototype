import { saveRoomState, type RoomStateInput } from '@/app/visualizer/actions'
import { signedOutResponse } from '@/lib/auth/session'   // (pending modules S30) the studio's — behind sign-in

/*
 * (D9, verify round 1 — F041 · F073 · F201) The leaving page's autosave: on pagehide, or when the tab goes hidden, the editor sends its
 * unsaved picks here with `fetch(…, { keepalive: true })` — a server action's request is dropped when the page unloads, this one outlives
 * it. It runs saveRoomState itself: the same viewer, the same Who sees leads, the same revision rule (a flush landing after a reloaded
 * page already saved the same picks answers as saved), and the same JSON back.
 *
 * Body: { roomId, pending?, detection?, baseRev? } as JSON, from this site only.
 */

export const dynamic = 'force-dynamic'
const MAX_BYTES = 2_000_000   // the editor sends addresses, not pictures (a keepalive body stays under 64 KB); anything this big is not a save

function sameSite(req: Request): boolean {
  const site = req.headers.get('sec-fetch-site')
  if (site && site !== 'same-origin') return false
  const origin = req.headers.get('origin')
  if (!origin) return true   // a same-origin request some browsers send without Origin; Sec-Fetch-Site above already vouched when present
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host')
  try { return !!host && new URL(origin).host === host } catch { return false }
}

export async function POST(req: Request) {
  const out = await signedOutResponse(); if (out) return out
  if (!sameSite(req)) return Response.json({ error: 'Not allowed.' }, { status: 403 })
  const type = req.headers.get('content-type') ?? ''
  if (!/^(application\/json|text\/plain)\b/i.test(type)) return Response.json({ error: 'Send the picks as JSON.' }, { status: 415 })
  const text = await req.text()
  if (text.length > MAX_BYTES) return Response.json({ error: 'That save is too big.' }, { status: 413 })
  let body: unknown
  try { body = JSON.parse(text) } catch { return Response.json({ error: 'Send the picks as JSON.' }, { status: 400 }) }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return Response.json({ error: 'Send the picks as JSON.' }, { status: 400 })
  const b = body as { roomId?: unknown; pending?: unknown; detection?: unknown; baseRev?: unknown }
  if (typeof b.roomId !== 'string' || !b.roomId || b.roomId.length > 64) return Response.json({ error: 'That room is gone.' }, { status: 400 })
  const input: RoomStateInput = {
    ...(b.pending && typeof b.pending === 'object' ? { pending: b.pending as RoomStateInput['pending'] } : {}),
    ...(b.detection && typeof b.detection === 'object' ? { detection: b.detection as RoomStateInput['detection'] } : {}),
    ...(typeof b.baseRev === 'number' && Number.isFinite(b.baseRev) ? { baseRev: b.baseRev } : {}),
  }
  const res = await saveRoomState(b.roomId, input)
  return Response.json(res, { headers: { 'Cache-Control': 'no-store' } })   // 200 with saveRoomState's own answer: saved, { conflict }, or { error }
}
