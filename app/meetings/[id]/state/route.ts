import { saveMeetingNotes } from '@/app/meetings/actions'
import { signedOutResponse } from '@/lib/auth/session'   // (pending modules S30) the studio's — behind sign-in

/**
 * (pending modules S23) The leaving save — a meeting page closed or left mid-meeting sends its words with `navigator.sendBeacon` (the AI
 * Visualizer's `POST /visualizer/state`, REG-685). The same rule as the autosave: the meeting's lead must be one the member may change.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const out = await signedOutResponse(); if (out) return out
  const { id } = await params
  let body: unknown = null
  try { body = await req.json() } catch { return new Response(null, { status: 400 }) }
  const o = (body && typeof body === 'object' ? body : {}) as { notes?: unknown; state?: unknown; fileIds?: unknown }
  if (typeof o.notes !== 'string') return new Response(null, { status: 400 })
  const r = await saveMeetingNotes(id, { notes: o.notes, state: o.state, fileIds: Array.isArray(o.fileIds) ? o.fileIds.filter((x): x is string => typeof x === 'string') : undefined })
  return new Response(null, { status: 'ok' in r ? 204 : 403 })
}
