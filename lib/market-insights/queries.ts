import 'server-only'   // libSQL never reaches the browser
import { and, desc, eq, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { marketInsights, type MarketInsight } from '@/lib/db/schema'
import { blocksOf } from './markdown'
import { isCategory, moreLike, type ArticleCard, type ArticleData, type InsightsData } from './model'

/*
 * (pending modules S25) Market Insights as its pages read it — the editors' live articles (never one they took down), newest first. Every
 * studio role reads them (1.0: owner · admin · id); Accounting's pages are the books (the pages' gate, `refusesWorkspace`). 1.0's article
 * address also opened a draft (its one-article route had no published filter); here a draft never reaches the studio's copy, so it can't.
 */

const tagsOf = (raw: string): string[] => { try { const a = JSON.parse(raw); return Array.isArray(a) ? a.filter((t): t is string => typeof t === 'string' && t.trim().length > 0) : [] } catch { return [] } }
const cardOf = (r: MarketInsight): ArticleCard | null => (isCategory(r.category) ? {
  id: r.id, title: r.title, excerpt: r.excerpt, category: r.category, cover: r.cover, tags: tagsOf(r.tags), author: r.author, readMinutes: r.readMinutes,
  featured: r.featured, sample: r.sample, publishedAt: r.publishedAt.getTime(),
} : null)

/** Every live article as a card, newest first — the listing, ⌘K and Maison AI read the same list. */
export async function liveArticles(): Promise<ArticleCard[]> {
  const rows = await db.select().from(marketInsights).where(isNull(marketInsights.removedAt)).orderBy(desc(marketInsights.publishedAt))
  return rows.map(cardOf).filter((a): a is ArticleCard => !!a)
}

export async function fetchInsights(): Promise<InsightsData> {
  return { articles: await liveArticles() }
}

/** An article's page, or null when the copy has no live article at that address (the editors took it down, or it never was). */
export async function fetchArticle(id: string): Promise<ArticleData | null> {
  if (!id || id.length > 120) return null
  const [row] = await db.select().from(marketInsights).where(and(eq(marketInsights.id, id), isNull(marketInsights.removedAt))).limit(1)
  const article = row ? cardOf(row) : null
  if (!row || !article) return null
  const all = await liveArticles()
  return { article, blocks: blocksOf(row.content), more: moreLike(article, all) }
}
