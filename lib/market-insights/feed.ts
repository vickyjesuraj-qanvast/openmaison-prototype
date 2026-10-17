/**
 * (pending modules S25 — card studio:market-insights) The seam to the articles OpenMaison's editors publish — pure, server- and script-safe.
 * 1.0 kept them in one platform table, `market_insights`, written in Platform admin's CMS (src/app/admin/market-insights) and read by every
 * studio through `/api/market-insights` (published only, featured first, newest first). This is that table's row as 1.0 typed it
 * (src/lib/queries/market-insights.ts `MarketInsight`) and the one mapper from it to the studio's copy (lib/db/schema.ts `market_insights`):
 * the demo's sample articles (lib/market-insights/demo.ts) are written in the same shape and go through this mapper, so a real feed is the
 * developers' fetch of the editors' rows into `feedStatements` — nothing on a page changes. Writing and publishing stay the editors' (the
 * platform's CMS, outside the studio app).
 */
import { isCategory, type InsightCategory } from './model'

/** 1.0's `MarketInsight` — one article as the editors' table holds it. `is_sample` is 2.0's own: set only by the demo's sample articles,
    so the pages can say they were written for the demo. */
export type FeedArticle = {
  id: string
  title: string
  excerpt?: string | null
  content?: string | null
  category: string
  cover_image_url?: string | null
  tags?: string[] | null
  author?: string | null
  read_time_minutes?: number | null
  is_published: boolean
  is_featured?: boolean | null
  published_at?: string | null
  created_at?: string | null
  updated_at?: string | null
  is_sample?: boolean
}

export type ArticleRow = {
  id: string; title: string; excerpt: string | null; content: string; category: InsightCategory; cover: string | null; tags: string; author: string
  readMinutes: number; featured: boolean; sample: boolean; publishedAt: number; feedRef: string
}

/** The studio's id for an article: the editors' own, prefixed — a second sync finds the same row. */
export const articleId = (feedId: string) => `mi-${feedId}`
/** 1.0's default byline (its CMS put "Qanvast Team"); 2.0's editors sign as OpenMaison. *(invented copy)* */
export const DEFAULT_AUTHOR = 'OpenMaison Editors'
/** An article's longest body the copy keeps (1.0's longest seed was 9,000 characters). */
const MAX_BODY = 120_000

const clean = (v: unknown, max: number) => { const s = String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max); return s || null }
const at = (iso: string | null | undefined): number | null => { if (!iso) return null; const t = Date.parse(iso); return Number.isFinite(t) ? t : null }
/** A picture the pages may draw: the app's own file (a path), or one on the web over https. Anything else is left out. */
export const isPictureAddress = (u: unknown): u is string => typeof u === 'string' && (/^\/(?!\/)[^\s"'<>]*$/.test(u) || /^https:\/\/[^\s"'<>]+$/i.test(u))
/** Minutes to read at about 200 words a minute — what 1.0's editors typed by hand, when they didn't. */
export const minutesOf = (text: string) => Math.max(1, Math.round(text.replace(/```[\s\S]*?```/g, ' ').split(/\s+/).filter(Boolean).length / 200))

/** The editors' rows as the studio's: only what is published, under one of 1.0's four categories, with a title. Tags are cleaned (each once,
    up to twelve); the read time is the editors' when they gave one, else counted from the words; the date is when it was published (1.0
    stamped it on Publish), else when it was last changed. */
export function rowsFromFeed(feed: FeedArticle[]): ArticleRow[] {
  const out: ArticleRow[] = []
  const seen = new Set<string>()
  for (const a of feed) {
    const title = clean(a.title, 200)
    const id = clean(a.id, 80)
    if (!a.is_published || !title || !id || !isCategory(a.category) || seen.has(id)) continue
    seen.add(id)
    const content = String(a.content ?? '').replace(/\r\n?/g, '\n').trim().slice(0, MAX_BODY)
    const tags: string[] = []
    for (const t of a.tags ?? []) { const c = clean(t, 40); if (c && !tags.some((x) => x.toLowerCase() === c.toLowerCase())) tags.push(c) }
    const minutes = Number(a.read_time_minutes)
    out.push({
      id: articleId(id), title, excerpt: clean(a.excerpt, 600), content, category: a.category, cover: isPictureAddress(a.cover_image_url) ? a.cover_image_url : null,
      tags: JSON.stringify(tags.slice(0, 12)), author: clean(a.author, 80) ?? DEFAULT_AUTHOR,
      readMinutes: Number.isInteger(minutes) && minutes > 0 && minutes <= 120 ? minutes : minutesOf(content), featured: !!a.is_featured, sample: !!a.is_sample,
      publishedAt: at(a.published_at) ?? at(a.updated_at) ?? at(a.created_at) ?? 0, feedRef: id,
    })
  }
  return out
}

type Stmt = { sql: string; args: (string | number | null)[] }
/** The writes that bring the studio's copy in line with the editors' feed, in one batch: every article upserted by its id; one the feed
    stopped sending (unpublished or deleted by the editors) is marked removed — never deleted, so its address can say it was taken down —
    and one it sends again is back. */
/** (pending modules S22 — api:industry-news) The headlines' own ids (lib/market-insights/rss.ts `RSS_PREFIX`): each sync keeps to its own rows,
    so the editors' feed never takes a headline down and the headlines' never take an article. */
const RSS_ID = `${articleId('rss-')}%`
export function feedStatements(rows: ArticleRow[], now: number, o: { scope?: 'editors' | 'headlines' } = {}): Stmt[] {
  const s: Stmt[] = []
  for (const r of rows) {
    s.push({ sql: `INSERT INTO market_insights (id, title, excerpt, content, category, cover, tags, author, read_minutes, featured, sample, published_at, feed_ref, updated_at, removed_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
                   ON CONFLICT(id) DO UPDATE SET title = excluded.title, excerpt = excluded.excerpt, content = excluded.content, category = excluded.category, cover = excluded.cover,
                     tags = excluded.tags, author = excluded.author, read_minutes = excluded.read_minutes, featured = excluded.featured, sample = excluded.sample,
                     published_at = excluded.published_at, feed_ref = excluded.feed_ref, updated_at = excluded.updated_at, removed_at = NULL`,
      args: [r.id, r.title, r.excerpt, r.content, r.category, r.cover, r.tags, r.author, r.readMinutes, r.featured ? 1 : 0, r.sample ? 1 : 0, r.publishedAt, r.feedRef, now] })
  }
  const ids = rows.length ? rows.map((r) => `'${r.id.replace(/'/g, "''")}'`).join(',') : "''"
  s.push({ sql: `UPDATE market_insights SET removed_at = ? WHERE removed_at IS NULL AND id NOT IN (${ids}) AND id ${o.scope === 'headlines' ? 'LIKE' : 'NOT LIKE'} ?`, args: [now, RSS_ID] })
  return s
}
