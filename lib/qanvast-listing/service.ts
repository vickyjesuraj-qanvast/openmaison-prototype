import 'server-only'
import { serviceSlot } from '@/lib/services/slots'
import type { ListingKind, ListingOutcome, ProofKind } from './model'

/*
 * (pending modules S37 — his "build all of them" 2026-10-11; cards onboarding:qanvast-listing-verification · studio:verify-listing) QANVAST'S
 * LISTING API, plugged in at one slot (lib/services/slots.ts `qanvast`; the registry's `qanvast-listing`). Verifying a studio and listing it is
 * Qanvast's staff's work — 1.0's Platform admin › Verification, out of this build by his word — so 2.0 builds the studio's half and this seam:
 *   · submitListingApplication(payload) — the studio sends its application (or its changes) for review; the adapter answers Qanvast's id for it;
 *   · withdrawListingApplication(ref) — the studio takes a waiting one back;
 *   · readListingWebhook(raw) — Qanvast's answer, read off POST /api/webhooks/qanvast-listing (app/api/webhooks/qanvast-listing/route.ts):
 *     1.0's two — `verified` (listed) or `rejected` with the staff's note (the studio fixes and sends again).
 * THE STAND-IN sends nothing and takes nothing back (no Qanvast API is called): the application is kept as the studio's record, the card says
 * "Simulated on this prototype", and an Owner or an Admin may play either answer there, labelled "(demo)" (app/company/listing-actions.ts
 * `playListingAnswer`, refused once a real service is plugged in). PRODUCTION: `setQanvastListingService({ name, submit, withdraw?,
 * readWebhook? })` in lib/services/install.ts. A real adapter's refusal never leaves a half-made application: the studio's press says why.
 */

/** What an application sends — the studio's records that day and its own words. Pictures and files are read only when the adapter asks. */
export type ListingPayload = {
  applicationId: string
  kind: Exclude<ListingKind, 'outside'>
  studio: { name: string; uen: string; website: string | null; reviewLink: string | null; founded: number | null; awards: string[] }
  description: string
  differentiator: string | null
  projectsDelivered: number
  registrations: { id: string; name: string }[]
  photos: { id: string; read: () => Promise<string | null> }[]
  files: { id: string; kind: ProofKind; name: string; mime: string; size: number; read: () => Promise<string | null> }[]
  sentBy: { name: string; email: string | null; phone: string | null }
}
/** One answer from Qanvast: by the studio's own application id or Qanvast's ref for it. */
export type ListingAnswer = { applicationId?: string | null; providerRef?: string | null; outcome: ListingOutcome; note?: string | null; at?: number | null }

export type ListingService = {
  name: string
  /** Send it for review — Qanvast's id for it, or why not. */
  submit: (p: ListingPayload) => Promise<{ ref: string } | { error: string }>
  /** Take a waiting one back. */
  withdraw?: (ref: string) => Promise<{ ok: true } | { error: string }>
  /** Read Qanvast's webhook call (and check its signature); null refuses it. Without one, the route reads this app's own envelope. */
  readWebhook?: (raw: { body: unknown; text: string; headers: Headers }) => ListingAnswer[] | null
}

const STAND_IN: ListingService = { name: 'stand-in', submit: async () => ({ ref: '' }) }
const slot = serviceSlot<ListingService>('qanvast', STAND_IN)

/** PRODUCTION: plug Qanvast's listing API in once, at start-up (lib/services/install.ts). */
export function setQanvastListingService(s: ListingService): void { slot.set(s) }
export const listingServiceIsStandIn = (): boolean => slot.standIn()
export const listingServiceName = (): string => slot.use().name

/** Send an application through the seam. The stand-in sends nothing (ref null). Never throws. */
export async function submitListingApplication(p: ListingPayload): Promise<{ ref: string | null } | { error: string }> {
  if (slot.standIn()) return { ref: null }
  try {
    const r = await slot.use().submit(p)
    return 'error' in r ? { error: r.error } : { ref: r.ref || null }
  } catch (e) {
    console.error('[qanvast-listing] submit failed:', e instanceof Error ? e.message : e)
    return { error: 'Qanvast didn’t take the application — please try again' }
  }
}

/** Take a waiting application back through the seam (a stand-in or one never sent: nothing to call). Never throws. */
export async function withdrawListingApplication(ref: string | null): Promise<{ ok: true } | { error: string }> {
  const s = slot.use()
  if (slot.standIn() || !ref || !s.withdraw) return { ok: true }
  try { return await s.withdraw(ref) }
  catch (e) { console.error('[qanvast-listing] withdraw failed:', e instanceof Error ? e.message : e); return { error: 'Qanvast didn’t take it back — please try again' } }
}

/** Qanvast's webhook call, read by the plugged adapter, else as this app's own envelope (`readOwnEnvelope`). */
export function readListingWebhook(raw: { body: unknown; text: string; headers: Headers }): ListingAnswer[] | null {
  const s = slot.use()
  try { return s.readWebhook ? s.readWebhook(raw) : readOwnEnvelope(raw.body) } catch { return null }
}

/**
 * This app's own envelope for an answer — one, or `{ answers: [...] }`: `{ application | ref, status, note?, reviewed_at? }`. `status` takes 1.0's
 * words (`verified` · `rejected`) and the card's (`listed` · `changes`). Anything else is not an answer (null).
 */
export function readOwnEnvelope(body: unknown): ListingAnswer[] | null {
  const list = Array.isArray((body as { answers?: unknown } | null)?.answers) ? (body as { answers: unknown[] }).answers : [body]
  const out: ListingAnswer[] = []
  for (const x of list) {
    const o = (x ?? {}) as Record<string, unknown>
    const status = typeof o.status === 'string' ? o.status.toLowerCase() : ''
    const outcome: ListingOutcome | null = status === 'verified' || status === 'listed' ? 'verified' : status === 'rejected' || status === 'changes' ? 'rejected' : null
    const applicationId = typeof o.application === 'string' ? o.application : typeof o.applicationId === 'string' ? o.applicationId : null
    const providerRef = typeof o.ref === 'string' ? o.ref : typeof o.providerRef === 'string' ? o.providerRef : null
    if (!outcome || (!applicationId && !providerRef)) return null
    const at = typeof o.reviewed_at === 'string' ? Date.parse(o.reviewed_at) : typeof o.reviewed_at === 'number' ? o.reviewed_at : null
    out.push({ applicationId, providerRef, outcome, note: typeof o.note === 'string' ? o.note : null, at: at && Number.isFinite(at) ? at : null })
  }
  return out.length ? out : null
}
