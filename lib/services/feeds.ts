import 'server-only'
import { createHash } from 'node:crypto'
import { client } from '@/lib/db'
import { feedStatements as marketplaceStatements, rowsFromFeed as marketplaceRows, type FeedPayload as MarketplacePayload } from '@/lib/marketplace/feed'
import { feedStatements as insightsStatements, rowsFromFeed as insightsRows, type FeedArticle } from '@/lib/market-insights/feed'
import { headlineArticles, readHeadlines } from '@/lib/market-insights/rss'
import { feedStatements as hangoutStatements, rowsFromFeed as hangoutRows, type FeedPayload as HangoutsPayload } from '@/lib/hangouts/feed'
import { serviceSlot } from './slots'

/*
 * (pending modules S34 — the steps' notes after S22 · S24 · S25 · S27) OPENMAISON'S FEEDS, plugged in at one slot. Four feeds keep the
 * studio's copy of what OpenMaison and Qanvast publish, each through its own one mapper (`rowsFromFeed` → `feedStatements`, the shapes 1.0's
 * APIs answered, typed in each file):
 *   · the Marketplace — Qanvast's brands, deals, products and banners (lib/marketplace/feed.ts);
 *   · Market Insights — the articles OpenMaison's editors publish (lib/market-insights/feed.ts, scope 'editors');
 *   · Industry News — 1.0's Singapore RSS sources, read by `readHeadlines(fetchText)` (lib/market-insights/rss.ts, scope 'headlines');
 *   · Hangouts — Qanvast's events, their shifts and its answer to the studio's applications (lib/hangouts/feed.ts).
 * THE STAND-IN fetches nothing (the build calls no outside service): the demo's copies are the repair's samples (R141 · R142 · R144), each
 * marked as one. PRODUCTION: `setFeedSource({ name, marketplace?, insights?, fetchText?, hangouts? })` — any of the four, each answering 1.0's
 * payload — and the scheduler's hourly `/api/cron/feeds` (lib/services/sweep.ts) writes them. A real feed never sets `sample`; the editors'
 * sync takes the samples down by itself (an article the feed doesn't send is removed, never deleted). A feed that fails leaves the studio's
 * copy as it was — the next hour tries again — and so does one that answers nothing (each sync takes down what its feed stops sending, so an
 * empty answer is never trusted to mean "all gone").
 */

export type FeedSource = {
  name: string
  /** Qanvast's brand feed (1.0's /brands, /categories, /banners) */
  marketplace?: () => Promise<MarketplacePayload>
  /** OpenMaison's editors' articles (1.0's `market_insights`, published) */
  insights?: () => Promise<FeedArticle[]>
  /** Fetches one RSS address's text — Industry News reads 1.0's five sources through it */
  fetchText?: (url: string) => Promise<string>
  /** Qanvast's Hangouts — events, shifts, places and the studio's applications' answers */
  hangouts?: () => Promise<HangoutsPayload>
}
const NOTHING: FeedSource = { name: 'samples' }
const slot = serviceSlot<FeedSource>('feeds', NOTHING)
/** PRODUCTION: plug the feeds in once, at start-up (lib/services/install.ts). */
export function setFeedSource(f: FeedSource): void { slot.set(f) }
export const feedsAreStandIn = (): boolean => slot.standIn()

/** A participation's id, made the same way every time for one event (the repair's `sid` rule) — a second pull never doubles it. */
const feedId = (seed: string) => {
  const h = createHash('sha1').update(`feed:${seed}`).digest('hex')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`
}

export type FeedPull = Record<'marketplace' | 'insights' | 'headlines' | 'hangouts', number | 'off' | { error: string }>

/** Pull every feed the source has and write the studio's copy — each in one batch of its own. Never throws; answers what each did. */
export async function pullFeeds(now = Date.now()): Promise<FeedPull> {
  const f = slot.use()
  const run = async (has: unknown, work: () => Promise<number>) => {
    if (!has) return 'off' as const
    try { return await work() } catch (e) { return { error: (e instanceof Error ? e.message : String(e)).slice(0, 200) } }
  }
  const write = async (stmts: { sql: string; args: (string | number | null)[] }[]) => { if (stmts.length) await client.batch(stmts, 'write'); return stmts.length }
  /* each sync takes down what its feed no longer sends — so a feed that answers NOTHING is read as a failed one, never as "everything is gone":
     a fault upstream can't empty the studio's copy */
  const some = <T,>(list: readonly T[], what: string): readonly T[] => { if (!list.length) throw new Error(`the feed sent no ${what}`); return list }
  return {
    marketplace: await run(f.marketplace, async () => { const p = await f.marketplace!(); some(p?.brands ?? [], 'brands'); return write(marketplaceStatements(marketplaceRows(p), now)) }),
    insights: await run(f.insights, async () => write(insightsStatements(insightsRows([...some(await f.insights!(), 'articles')]), now, { scope: 'editors' }))),
    headlines: await run(f.fetchText, async () => write(insightsStatements(insightsRows(headlineArticles(some(await readHeadlines(f.fetchText!), 'headlines — no source answered'), now)), now, { scope: 'headlines' }))),
    hangouts: await run(f.hangouts, async () => { const p = await f.hangouts!(); some(p?.events ?? [], 'events'); return write(hangoutStatements(hangoutRows(p), now, (eventId) => feedId(`${eventId}:hangout:participation`))) }),
  }
}
