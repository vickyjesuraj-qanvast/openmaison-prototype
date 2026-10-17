import type { MetadataRoute } from 'next'
import { PUBLISHED_SITE } from '@/lib/site/model'

/*
 * (pending modules S35 — 1.0's src/app/robots.ts) Crawlers may read the website and its preview pictures, nothing else: the studio app and every
 * client link stay out (1.0 listed its app's paths one by one; here the app is everything that isn't /site, so the rule reads the other way).
 * AI search (ChatGPT browsing, Perplexity) may read the site for brand visibility; AI TRAINING crawlers are blocked everywhere — 1.0's four.
 */
/* the site's pages and pictures, plus what a crawler needs to draw them (the scripts, styles and fonts Next serves, the icon font, the logo its
   structured data names) — a page whose styles are blocked reads as broken on a phone */
const SITE = ['/site', '/card/site/', '/sitemap.xml', '/llms.txt', '/_next/static/', '/fonts/', '/figma-assets/logo.svg', '/figma-assets/logo-wordmark.svg']
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: SITE, disallow: '/' },
      { userAgent: 'ChatGPT-User', allow: SITE, disallow: '/' },
      { userAgent: 'PerplexityBot', allow: SITE, disallow: '/' },
      { userAgent: 'GPTBot', disallow: '/' },
      { userAgent: 'Google-Extended', disallow: '/' },
      { userAgent: 'Bytespider', disallow: '/' },
      { userAgent: 'CCBot', disallow: '/' },
    ],
    sitemap: `${PUBLISHED_SITE}/sitemap.xml`,
  }
}
