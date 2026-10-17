import 'server-only'   // libSQL never reaches the browser: every client import of this module is `import type`
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { settings } from '@/lib/db/schema'

/*
 * (parity map, CP-148 · CP-149 · UC-082's operator pause) What OpenMaison — not the studio — has switched for this studio, in settings key
 * `platform`. Qanvast Ops › Studios is where an operator changes it (app/qanvast-ops/studios/actions.ts); the studio only reads it:
 *
 *   · `portalOff`      — every client portal page closes with a calm "This page is closed for now — contact {studio}" (the portal's gate,
 *                        `portalGate` / `portalActor` in lib/portal/session.ts read it through `PortalLook.closed`; the words are
 *                        components/portal/portal-notice.tsx's) and every portal action refuses; the studio's Company › Client portal says
 *                        "Closed by OpenMaison". Unlike the studio's own Paused (settings `portal`, Q-50) the studio cannot open it again —
 *                        only OpenMaison can. The four links outside the portal (confirm a quote · sign · renders · a shared file) keep working.
 *   Qanvast Ops › Studios' row (the usage figures) is lib/platform-studios.ts — kept apart so this read stays one settings row.
 *   · `messagesPaused` — the delivery layer (lib/notifications/delivery.ts, P-G) holds every message leaving the studio while it is on;
 *                        released when it goes off. The bell inside the app is not a message and keeps ringing.
 *
 * Unset → both off: a studio OpenMaison never touched loses nothing. Writes go through `savePlatform` only.
 */

export const PLATFORM_KEY = 'platform'

export type PlatformSettings = {
  portalOff: boolean
  portalOffAt: number | null
  /** The operator's name as Qanvast Ops recorded it — the studio is only ever told "OpenMaison". */
  portalOffBy: string | null
  messagesPaused: boolean
  messagesPausedAt: number | null
  messagesPausedBy: string | null
}

export const DEFAULT_PLATFORM: PlatformSettings = { portalOff: false, portalOffAt: null, portalOffBy: null, messagesPaused: false, messagesPausedAt: null, messagesPausedBy: null }

export function parsePlatform(v: unknown): PlatformSettings {
  const r = (v ?? {}) as Partial<Record<keyof PlatformSettings, unknown>>
  const num = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? x : null)
  const str = (x: unknown) => (typeof x === 'string' && x ? x : null)
  return {
    portalOff: r.portalOff === true, portalOffAt: num(r.portalOffAt), portalOffBy: str(r.portalOffBy),
    messagesPaused: r.messagesPaused === true, messagesPausedAt: num(r.messagesPausedAt), messagesPausedBy: str(r.messagesPausedBy),
  }
}

/** The platform's switches for this studio (both off when unset). */
export async function fetchPlatform(): Promise<PlatformSettings> {
  const [row] = await db.select().from(settings).where(eq(settings.key, PLATFORM_KEY)).limit(1)
  if (!row) return DEFAULT_PLATFORM
  try { return parsePlatform(JSON.parse(row.value)) } catch { return DEFAULT_PLATFORM }
}

/** (UC-082) Whether the delivery layer holds every outgoing message right now — P-G's sweep reads this before each send. */
export async function messagesPaused(): Promise<boolean> {
  return (await fetchPlatform()).messagesPaused
}

/** (CP-148) Whether OpenMaison has closed this studio's client portal. */
export async function portalClosedByPlatform(): Promise<boolean> {
  return (await fetchPlatform()).portalOff
}

export async function savePlatform(next: PlatformSettings): Promise<void> {
  const value = JSON.stringify(next)
  const updatedAt = new Date()
  await db.insert(settings).values({ key: PLATFORM_KEY, value, updatedAt }).onConflictDoUpdate({ target: settings.key, set: { value, updatedAt } })
}
