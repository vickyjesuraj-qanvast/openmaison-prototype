import type { BlogArticle } from './types'

/* (pending modules S35) An article's card and its date, read on the server (1.0's: "23 Mar 2026", Singapore's day — never the browser's clock). */
const DAY = new Intl.DateTimeFormat('en-SG', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Singapore' })
const LONG = new Intl.DateTimeFormat('en-SG', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Singapore' })
export const postDate = (iso: string) => DAY.format(new Date(iso))
export const postDateLong = (iso: string) => LONG.format(new Date(iso))
export function cardOf(a: BlogArticle) {
  return { slug: a.slug, category: a.category, title: a.title, excerpt: a.excerpt, heroImage: a.heroImage ?? null, heroAlt: a.heroAlt ?? a.title, date: postDate(a.publishedAt), readTime: a.readTime }
}
