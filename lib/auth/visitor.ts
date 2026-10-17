import 'server-only'
import { headers } from 'next/headers'
import { takeTry } from './limit'
import { isStandInProvider } from './provider'

/*
 * (pending modules S34 — the steps' notes after S13 · S30: "put 1.0's per-number / per-IP limit in front of the provider", "the visitor's real
 * address behind the proxy"; 1.0's src/lib/rate-limit.ts) 1.0's other count — five tries a minute from one visitor address — added to every
 * code step's own count once a REAL sign-in provider is plugged in (a code costs money then, and a flood is somebody's). The prototype's
 * stand-in sends nothing and costs nothing, and every tester shares one address, so it never counts here.
 * The address is the first hop of `X-Forwarded-For` (else `X-Real-IP`) — PRODUCTION: the proxy in front of the app must set it (Vercel does),
 * never pass a browser's own. One server's memory, as 1.0's was; a shared store is the developers' with the provider.
 */

export function visitorAddress(h: Headers): string | null {
  const first = h.get('x-forwarded-for')?.split(',')[0]?.trim()
  return first || h.get('x-real-ip')?.trim() || null
}

/** Counts one try of a code step from this visitor's address; false when it is one too many in the last minute. Always true on the stand-in. */
export async function visitorTry(step: 'send' | 'check'): Promise<boolean> {
  if (isStandInProvider()) return true
  const at = visitorAddress(await headers())
  return at ? takeTry(`ip:${step}:${at}`) : true
}

/** (pending modules S34 — the steps' note after S09: "1.0 limited sends to 10 a minute per IP") An invitation sent from this visitor's address —
    ten a minute, once a real delivery provider sends them (a stand-in invitation goes nowhere and costs nothing). */
export async function inviteTry(): Promise<boolean> {
  const { deliveryIsStandIn } = await import('@/lib/notifications/delivery')
  if (deliveryIsStandIn()) return true
  const at = visitorAddress(await headers())
  return at ? takeTry(`ip:invite:${at}`, Date.now(), 10) : true
}
export const INVITE_TOO_MANY = 'Too many invitations at once — wait a minute and try again'
