/**
 * (pending modules S22 — cards api:industry-news · public:industry-news-feed · studio:dashboard's "Industry News from Singapore property and
 * design RSS feeds"; S25's note: "if RSS headlines come back, map them into rowsFromFeed as Industry News — one reader, never two") 1.0's
 * Industry News reader (src/app/api/news/route.ts) in 2.0's shape — pure, server- and script-safe:
 *
 *   · 1.0's Singapore sources (src/lib/region-config.ts `newsSources`) and its reading of a feed: the first five items of each, the title, the
 *     link, the date, the description with its tags taken out (200 characters), and 1.0's topic by the title's words (property · design ·
 *     regulation · market — `topicOf`, its `categorizeArticle`);
 *   · each headline becomes an **Industry News** article in Market Insights (the one reader): its summary, then "Read it on {source}" linking out
 *     to the story — so a headline opens where every article opens, the Dashboard's card is its door, ⌘K and Maison AI find it, and its
 *     source's name is its byline. Never the studio's own words: the summary is the source's, cut, with the link to the whole story;
 *   · the sync keeps to the headlines' own rows (`feedStatements(…, { scope: 'headlines' })`): a story the sources stop sending is taken down,
 *     the editors' articles are never touched.
 *
 * HONEST STAND-IN: the prototype calls no outside service (the build's rule), so nothing here fetches — `readHeadlines(fetchText)` takes the
 * developers' fetcher; their scheduler runs it hourly (1.0 cached the feed for an hour) and writes `feedStatements(rowsFromFeed(articles), now,
 * { scope: 'headlines' })`. The demo has no headlines: a made-up story credited to a real newsroom would be a fabricated record.
 */
import type { FeedArticle } from './feed'

export type NewsSource = { name: string; url: string }
/** 1.0's Singapore feeds, as its region config listed them. */
export const NEWS_SOURCES: readonly NewsSource[] = [
  { name: 'PropertyGuru', url: 'https://www.propertyguru.com.sg/property-management-news/feed' },
  { name: 'EdgeProp', url: 'https://www.edgeprop.sg/rss.xml' },
  { name: 'CNA Housing', url: 'https://www.channelnewsasia.com/api/v1/rss-outbound-feed?_format=xml&category=6936' },
  { name: 'Home & Decor', url: 'https://www.homeanddecor.com.sg/feed/' },
  { name: 'SquareRooms', url: 'https://www.squarerooms.com.sg/feed/' },
]
/** How often the developers' scheduler reads the feeds — 1.0's cache. */
export const REFRESH_MINUTES = 60
/** A headline's id begins so — the editors' articles never do (lib/market-insights/feed.ts keeps each sync to its own). */
export const RSS_PREFIX = 'rss-'
/** 1.0 took the first five items of each feed. */
export const ITEMS_PER_SOURCE = 5

export type Topic = 'property' | 'design' | 'regulation' | 'market'
export const TOPIC_LABEL: Record<Topic, string> = { property: 'Property', design: 'Design', regulation: 'Regulation', market: 'Market' }

/** 1.0's `categorizeArticle`: the title's words, regulation first. */
export function topicOf(title: string): Topic {
  const t = title.toLowerCase()
  if (/\b(bca|ura|compliance|regulation|guideline|safety)\b/.test(t)) return 'regulation'
  if (/\b(design|interior|decor|style)\b|renovation trend/.test(t)) return 'design'
  if (/\b(cost|costs|revenue|market|industry)\b/.test(t)) return 'market'
  return 'property'
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: '’', nbsp: ' ', '#39': '’', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', ndash: '–', mdash: '—', hellip: '…' }
const decode = (s: string) => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+\d*);/gi, (m, e: string) => {
  const k = e.toLowerCase()
  if (ENTITIES[k] !== undefined) return ENTITIES[k]!
  if (k.startsWith('#x')) { const n = parseInt(k.slice(2), 16); return Number.isFinite(n) ? String.fromCodePoint(n) : m }
  if (k.startsWith('#')) { const n = parseInt(k.slice(1), 10); return Number.isFinite(n) ? String.fromCodePoint(n) : m }
  return m
})
const text = (s: string) => decode(s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim()
const tag = (xml: string, name: string) => { const m = new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i').exec(xml); return m ? m[1]! : '' }
/** A story's address the reader may open: the web over https (1.0 linked whatever the feed said). */
const safeLink = (u: string): string | null => { const t = text(u); return /^https:\/\/[^\s"'<>()]+$/i.test(t) ? t : null }
/** A short, stable id from the story's address — the same story keeps its row from one read to the next. */
export function storyId(link: string): string {
  let h = 5381
  for (let i = 0; i < link.length; i++) h = ((h << 5) + h + link.charCodeAt(i)) >>> 0
  return `${RSS_PREFIX}${h.toString(36)}${link.length.toString(36)}`
}

export type Headline = { id: string; title: string; summary: string; link: string; source: string; publishedAt: string | null; topic: Topic }

/** One feed's stories, as 1.0 read them: its first five items with a title and a safe link. */
export function parseFeed(xml: string, source: string): Headline[] {
  const out: Headline[] = []
  const re = /<item[\s>]([\s\S]*?)<\/item>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(xml)) && out.length < ITEMS_PER_SOURCE) {
    const item = m[1]!
    const title = text(tag(item, 'title')).slice(0, 200)
    const link = safeLink(tag(item, 'link'))
    if (!title || !link) continue
    const date = Date.parse(text(tag(item, 'pubDate')))
    const summary = text(tag(item, 'description')).slice(0, 200).trim()
    out.push({ id: storyId(link), title, summary: summary || title, link, source, publishedAt: Number.isFinite(date) ? new Date(date).toISOString() : null, topic: topicOf(title) })
  }
  return out
}

const escapeMd = (s: string) => s.replace(/([\\`*_{}[\]()#+!|>~])/g, '\\$1')
/** The headlines as Market Insights' feed rows: Industry News, the summary and the way to the whole story, the source as its byline. */
export function headlineArticles(list: readonly Headline[], now: number): FeedArticle[] {
  const seen = new Set<string>()
  return list.filter((h) => !seen.has(h.id) && seen.add(h.id)).map((h) => ({
    id: h.id, title: h.title, excerpt: h.summary, category: 'industry-news', tags: [TOPIC_LABEL[h.topic], h.source], author: h.source,
    content: `${escapeMd(h.summary)}\n\n[Read it on ${escapeMd(h.source)}](${h.link})`, read_time_minutes: 1, is_published: true, is_featured: false,
    published_at: h.publishedAt ?? new Date(now).toISOString(),
  }))
}

/** Every source read with the developers' fetcher (a failed source is left out, as 1.0's was) — never called by the prototype. */
export async function readHeadlines(fetchText: (url: string) => Promise<string>, sources: readonly NewsSource[] = NEWS_SOURCES): Promise<Headline[]> {
  const read = await Promise.allSettled(sources.map(async (s) => parseFeed(await fetchText(s.url), s.name)))
  return read.flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
}
