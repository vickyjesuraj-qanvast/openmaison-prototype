import 'server-only'
import { cookies } from 'next/headers'
import { STUDIO_VISIT_COOKIE } from './paths'
import { readStudioSession } from './session'

/**
 * (S42 B-02 — the audit's Major: a member checking a client link stamped "Viewed" as if the client had opened it) Whether this request comes
 * from the studio's own browser: a member signed in on it, or — the demo's own session can't tell a member from a client — a browser that has
 * opened a studio page (proxy.ts marks it, `STUDIO_VISIT_COOKIE`). Every client link's "Viewed" asks it first: the confirmation link, the
 * view-only link, the signing link and a set's link. A real client's browser has neither.
 */
export async function isStudioVisit(): Promise<boolean> {
  const jar = await cookies()
  if (jar.get(STUDIO_VISIT_COOKIE)?.value === '1') return true
  const s = await readStudioSession()
  return s.in && !s.standing
}
