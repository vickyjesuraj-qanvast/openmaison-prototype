import 'server-only'   // libSQL never reaches the browser: every client import of this module is `import type`
import { clientPortalActs, clientUsageSince } from '@/lib/studio-health/queries'
import { fetchStudio } from '@/lib/settings/queries'
import { shortStudioName } from '@/lib/settings/types'
import { portalPath } from '@/lib/portal/model'
import { currentPortalSlug, fetchPortalSettings } from '@/lib/portal/queries'
import { fetchPlatform, type PlatformSettings } from '@/lib/platform'
import { fetchCollectionRules } from '@/lib/projects/payment-methods-queries'   // (parity map, FB-112 · P-D) the bank-feed ask

/*
 * (parity map, CP-148 · CP-149 · UC-082) Qanvast Ops › Studios: each studio OpenMaison runs, as one row — its portal (OpenMaison's switch,
 * beside the studio's own Paused so the operator reads both), its messages (held or sending) and what its clients did on the portal in the
 * last 30 days. The prototype runs one studio, this one. The switches' writes are app/qanvast-ops/studios/actions.ts.
 */

/** How far back the usage figures look. */
export const USAGE_DAYS = 30

/** (CP-149 — 1.0's leaderboard and studio health) What the studio's clients did on the portal in the last `USAGE_DAYS` days, counted from
    the records: sign-ins (a client's session — never a studio member's look-as), issues the client reported, messages the client's side
    wrote (the household included, a lead's conversation too; the team's own conversation never), and choices the client made on their page. */
export type PlatformUsage = { signIns: number; issues: number; messages: number; choices: number }

export type PlatformStudioRow = {
  id: string
  name: string
  /** "/my/demo-studio" — the address the portal opens on */
  address: string
  /** the studio's own Paused (Company › Client portal), told beside OpenMaison's switch */
  studioPaused: boolean
  platform: PlatformSettings
  usage: PlatformUsage
  /** (parity map, FB-112 — P-D's *Match bank transfers automatically*) the studio's standing ask to OpenMaison, so it reaches an operator */
  bankFeedAsk: { at: number; by: string | null } | null
  /** the window's first moment (ms) — "Since 10 Sep" */
  since: number
  now: number
}

/** The id the prototype's one studio answers to in Qanvast Ops' actions. */
export const THIS_STUDIO = 'this-studio'

/** The studios OpenMaison runs — the prototype has one, this studio. */
export async function fetchPlatformStudios(): Promise<PlatformStudioRow[]> {
  const now = Date.now()
  const since = new Date(now - USAGE_DAYS * 86_400_000)
  /* (pending modules S39) the four figures are counted from the client acts Company › Reports › Studio health counts per range — one rule */
  const [studio, slug, portal, platform, collection, acts] = await Promise.all([
    fetchStudio(), currentPortalSlug(), fetchPortalSettings(), fetchPlatform(), fetchCollectionRules(), clientPortalActs(),
  ])
  return [{
    id: THIS_STUDIO, name: shortStudioName(studio.name), address: portalPath(slug), studioPaused: portal.paused, platform,
    usage: clientUsageSince(acts, since.getTime()),
    bankFeedAsk: collection.bankFeed ? { at: collection.bankFeed.askedAt, by: collection.bankFeed.askedByName } : null,
    since: since.getTime(), now,
  }]
}
