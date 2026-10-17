import { SERVICES } from './registry'
import { SLOT_KEYS, isPlugged, pluggedName, type ServiceKey } from './slots'

/*
 * (pending modules S34) THE DEVELOPERS' ONE START-UP PLACE. `instrumentation.ts` calls `installServices()` once, when the server starts and
 * before it takes a request. Plug each real service in here with its seam's own call, e.g.
 *     setDeliveryAdapter(resendAnd360dialog({ resendKey: process.env.RESEND_API_KEY!, d360Key: process.env.D360_API_KEY! }))
 *     setSignInProvider(twilioVerify(...)) · setPaymentProvider(dodo(...)) · setFileStore(objectStorage(...)) · setPdfRenderer(chromium(...))
 *     setCalendarSync(googleCalendar(...)) · setTranscriber(deepgram(...)) · setFeedSource(qanvastFeeds(...)) · setAccountingProvider(xero(...))
 *     setStudioProvisioner(tenancy(...))
 * (lib/services/registry.ts lists every seam, its contract and 1.0's env names). The slots live on globalThis, so what is set here is what
 * every route, action and page of this server sends through. The prototype plugs nothing in: every stand-in answers, and the screens that
 * meet one say so.
 *
 * What it does today: it warns, once, when an environment holds a real service's key while that service is still the stand-in — 1.0's
 * "WhatsApp isn't configured" warning, turned round: a deployment that thinks it sends must be told it doesn't.
 */

export type ServiceState = { slot: ServiceKey; plugged: boolean; adapter: string; envSet: string[] }

/** Each slot, whether a real adapter is plugged into it, its name, and which of 1.0's env names this server holds. */
export function serviceStates(env: Record<string, string | undefined> = process.env): ServiceState[] {
  return SLOT_KEYS.map((slot) => {
    const names = SERVICES.filter((s) => s.slot === slot).flatMap((s) => s.env).filter((n) => !n.startsWith('NEXT_PUBLIC_'))
    return { slot, plugged: isPlugged(slot), adapter: pluggedName(slot) ?? 'stand-in', envSet: [...new Set(names)].filter((n) => !!env[n]) }
  })
}
/** A real service's key set while its stand-in still answers — the deployment would believe it sends, pays or stores. */
export function serviceWarnings(env: Record<string, string | undefined> = process.env): string[] {
  return serviceStates(env).filter((s) => !s.plugged && s.envSet.length && !(s.slot === 'delivery' && s.envSet.every((n) => n === 'NOTIFY_ALLOWLIST')))
    .map((s) => `${s.envSet.join(', ')} ${s.envSet.length === 1 ? 'is' : 'are'} set, but the ${s.slot} service is still the prototype’s stand-in — plug its adapter in lib/services/install.ts`)
}

let installed = false
export function installServices(): void {
  if (installed) return
  installed = true
  /* the developers' set… calls go here (above) */
  for (const w of serviceWarnings()) console.warn(`[services] ${w}`)
}
