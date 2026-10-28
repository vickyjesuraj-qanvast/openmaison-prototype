/**
 * (pending modules S25 — card studio:market-insights; 1.0's Tools › Market Insights) The reading room's model — pure and client-safe: 1.0's
 * four categories, what a card and an article carry, and the words they print. Tools › Market Insights lists the articles OpenMaison's
 * editors publish (lib/market-insights/feed.ts is the seam); an article opens on its own page.
 */
import type { Block } from './markdown'

/** 1.0's four categories, in its order, with the glyph a card without a picture shows (1.0's category icons). (the calm UI build 2026-10-27,
    6-12 · T-13) Their names in sentence case — the keys, and the `?category=` they travel in, stay 1.0's. */
export const CATEGORIES = [
  { key: 'trends', label: 'Trends', icon: 'trending_up' },
  { key: 'reports', label: 'Reports', icon: 'bar_chart' },
  { key: 'case-studies', label: 'Case studies', icon: 'lightbulb' },
  { key: 'industry-news', label: 'Industry news', icon: 'article' },
] as const
export type InsightCategory = (typeof CATEGORIES)[number]['key']
export const isCategory = (v: unknown): v is InsightCategory => CATEGORIES.some((c) => c.key === v)
export const categoryLabel = (k: InsightCategory) => CATEGORIES.find((c) => c.key === k)?.label ?? 'Articles'
export const categoryIcon = (k: InsightCategory) => CATEGORIES.find((c) => c.key === k)?.icon ?? 'article'

/** An article as a card shows it. */
export type ArticleCard = {
  id: string
  title: string
  excerpt: string | null
  category: InsightCategory
  cover: string | null
  tags: string[]
  author: string
  readMinutes: number
  featured: boolean
  /** written for the demo — its card and its page say so */
  sample: boolean
  publishedAt: number
}
/** The listing: every live article, newest first. */
export type InsightsData = { articles: ArticleCard[] }
/** An article's page: the article, its body read into blocks, and what to read next. */
export type ArticleData = { article: ArticleCard; blocks: Block[]; more: ArticleCard[] }

/** Twenty-four cards, then Show more (the Marketplace's press for 1.0's endless list). */
export const PAGE_SIZE = 24
export const readWords = (n: number) => `${n} min read`
export const articlesWord = (n: number) => `${n} ${n === 1 ? 'article' : 'articles'}`
/** (invented copy) What the demo's sample articles say about themselves, on their page and above the list. */
export const SAMPLE_NOTE = 'A sample article written for the demo. Its figures are illustrative — not market data.'
export const SAMPLES_NOTE = 'Sample articles written for the demo — their figures are illustrative, not market data.'
/** Where the articles come from — (the calm UI build 2026-10-27, W-114) said by the header's info glyph, no longer a line under the list. */
export const SOURCE_LINE = 'Articles come from OpenMaison’s editors.'

/** 1.0's featured article: the newest one the editors marked featured (its list came featured first, then newest). */
export const featuredOf = (list: readonly ArticleCard[]): ArticleCard | null => list.filter((a) => a.featured).sort((a, b) => b.publishedAt - a.publishedAt)[0] ?? null
/** What a search reads in a card — 1.0's: the title, the excerpt and the tags. */
export const searchFields = (a: ArticleCard) => [a.title, a.excerpt, a.tags.join(' ')]
/** Read next: the newest others in the same category, then the newest of the rest. */
export function moreLike(a: ArticleCard, all: readonly ArticleCard[], n = 3): ArticleCard[] {
  const others = all.filter((x) => x.id !== a.id).sort((x, y) => y.publishedAt - x.publishedAt)
  return [...others.filter((x) => x.category === a.category), ...others.filter((x) => x.category !== a.category)].slice(0, n)
}
/** A tag's own search on the listing — what a tag on an article opens. */
export const tagHref = (tag: string) => `/market-insights?q=${encodeURIComponent(tag)}`
