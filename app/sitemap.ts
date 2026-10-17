import type { MetadataRoute } from 'next'
import { ALL_BLOG_ARTICLES } from '@/lib/site/blog/articles'
import { absolute, sitePages } from '@/lib/site/seo'

/* (pending modules S35 — 1.0's src/app/sitemap.ts) The website's pages for search engines — the site only: nothing of the studio app or a client
   link is listed (those answer noindex). Priorities and frequencies are 1.0's. */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date().toISOString()
  return sitePages(ALL_BLOG_ARTICLES).map((p) => ({ url: absolute(p.path), lastModified: p.lastModified ?? now, changeFrequency: p.changeFrequency, priority: p.priority }))
}
