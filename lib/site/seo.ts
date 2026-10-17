import type { Metadata } from 'next'
import { COMPANY, FREE_LINE, PUBLISHED_SITE, type Crumb } from './model'
import { MODULES } from './platform'
import { TRIAL_PAGES } from '@/lib/visualizer/trial/content'
import { trialEnabled } from '@/lib/visualizer/trial/policy'
import { toolsTrialEnabled, TRY_PATH } from '@/lib/trial/policy'

/*
 * (pending modules S35 — 1.0's src/lib/seo.ts and each page's `metadata`) The site's search layer: each page's title, description, canonical
 * address and link preview (the branded card, /card/site/<page>), and the structured data search engines and AI search read — Organization,
 * WebSite, SoftwareApplication (1.0's three, in the layout), a BreadcrumbList per page, an Article per post. Canonical and structured-data
 * addresses are the published site's (`PUBLISHED_SITE`, 1.0's NEXT_PUBLIC_SITE_URL) with the page's path on this app (`/site/…`); the
 * preview picture is drawn on the origin the page was opened on. Pure.
 */

export const absolute = (path: string) => `${PUBLISHED_SITE}${path === '/' ? '' : path}`
/** The branded link-preview picture of a site page (1.0's /api/og?v=2): one route draws them (app/card/[kind]/[key]/route.ts, kind `site`). */
export const siteCardPath = (key: string) => `/card/site/${encodeURIComponent(key)}`

/** The tab's title as 1.0's template printed it ("%s | OpenMaison"), never doubling the name. Absolute, so the app's "· OpenMaison" never joins it. */
export const brandedTitle = (t: string) => (/OpenMaison/.test(t) ? t : `${t} | OpenMaison`)
/** A site page's tags. */
export function siteMetadata(o: { title: string; description: string; path: string; card: string; cardAlt?: string; ogTitle?: string; ogDescription?: string; type?: 'website' | 'article'; index?: boolean; keywords?: string[]; extra?: Partial<Metadata['openGraph']> }): Metadata {
  const image = { url: siteCardPath(o.card), width: 1200, height: 630, alt: o.cardAlt ?? o.title }
  return {
    title: { absolute: brandedTitle(o.title) },
    description: o.description,
    ...(o.keywords?.length ? { keywords: o.keywords } : {}),
    alternates: { canonical: absolute(o.path) },
    robots: o.index === false ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: {
      title: o.ogTitle ?? o.title, description: o.ogDescription ?? o.description, url: absolute(o.path), siteName: COMPANY.name,
      images: [image], locale: 'en', type: o.type ?? 'website', ...(o.extra ?? {}),
    } as Metadata['openGraph'],
    twitter: { card: 'summary_large_image', title: o.ogTitle ?? o.title, description: o.ogDescription ?? o.description, images: [image.url] },
  }
}

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org', '@type': 'Organization', name: COMPANY.name, legalName: COMPANY.legalName, url: absolute('/site'),
    logo: { '@type': 'ImageObject', url: absolute('/figma-assets/logo.svg'), width: 512, height: 512 },
    description: 'Studio management software for interior designers. Covers leads, projects, quotes, invoices, and client chat.',
    foundingDate: COMPANY.foundingDate,
    areaServed: 'Singapore',
    contactPoint: { '@type': 'ContactPoint', contactType: 'sales', email: COMPANY.email, url: absolute('/site/contact'), availableLanguage: ['English'] },
    sameAs: [COMPANY.linkedin],
  }
}
export function webSiteJsonLd() {
  return {
    '@context': 'https://schema.org', '@type': 'WebSite', name: COMPANY.name, url: absolute('/site'), inLanguage: 'en',
    description: 'Software for interior design studios covering CRM, project management, quote reading, AI tools, and invoicing.',
    publisher: { '@type': 'Organization', name: COMPANY.name, url: absolute('/site') },
  }
}
export function softwareApplicationJsonLd() {
  return {
    '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: COMPANY.name, applicationCategory: 'BusinessApplication', applicationSubCategory: 'Project Management',
    operatingSystem: 'Web', url: absolute('/site'),
    description: 'Studio management software for interior designers with lead tracking, quote reading, project timelines, AI design tools, and invoicing.',
    featureList: [
      'Lead Management & CRM', 'Upload a quote & E-Signatures', 'Project Timeline & Gantt Charts', 'AI Visualizer', '3D Space Planner',
      'Financial Management (Invoices, POs, Expenses)', 'Maison AI Assistant', 'Meeting Copilot', 'Client Messages', 'Compliance Navigator',
    ],
    screenshot: absolute(siteCardPath('home')),
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'SGD', description: FREE_LINE },
  }
}
export function breadcrumbJsonLd(items: Crumb[]) {
  return {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: items.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: absolute(c.path) })),
  }
}
export function articleJsonLd(a: { slug: string; title: string; excerpt: string; publishedAt: string; updatedAt?: string; author: { name: string; role: string }; heroImage?: string; category: string; keywords: string[] }) {
  return {
    '@context': 'https://schema.org', '@type': 'Article', headline: a.title, description: a.excerpt, datePublished: a.publishedAt, dateModified: a.updatedAt ?? a.publishedAt,
    author: { '@type': 'Person', name: a.author.name, jobTitle: a.author.role, worksFor: { '@type': 'Organization', name: COMPANY.name } },
    publisher: { '@type': 'Organization', name: COMPANY.name, logo: { '@type': 'ImageObject', url: absolute('/figma-assets/logo.svg') } },
    mainEntityOfPage: { '@type': 'WebPage', '@id': absolute(`/site/blog/${a.slug}`) },
    image: absolute(a.heroImage ?? siteCardPath(`blog-${a.slug}`)), inLanguage: 'en', articleSection: a.category, keywords: a.keywords.join(', '),
  }
}
/** 1.0's FAQPage schema (getFaqJsonLd) — kept for the module FAQs, which 1.0 holds back from the pages for now (as here). */
export function faqJsonLd(faqs: { q: string; a: string }[]) {
  return { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) }
}
/** JSON-LD as a script's text — `<` escaped so a string can never close the tag. */
export const ldText = (o: unknown) => JSON.stringify(o).replace(/</g, '\\u003c')

/** Every page of the site, for the sitemap (1.0's src/app/sitemap.ts: priorities and change frequencies as 1.0 set them). */
export function sitePages(blog: { slug: string; publishedAt: string; updatedAt?: string }[]): { path: string; priority: number; changeFrequency: 'weekly' | 'monthly' | 'yearly'; lastModified?: string }[] {
  return [
    { path: '/site', priority: 1, changeFrequency: 'weekly' },
    { path: '/site/platform', priority: 0.9, changeFrequency: 'monthly' },
    ...MODULES.map((m) => ({ path: m.href, priority: 0.8, changeFrequency: 'monthly' as const })),
    { path: '/site/story', priority: 0.7, changeFrequency: 'monthly' },
    { path: '/site/trust', priority: 0.6, changeFrequency: 'monthly' },
    { path: '/site/blog', priority: 0.7, changeFrequency: 'weekly' },
    { path: '/site/changelog', priority: 0.6, changeFrequency: 'weekly' },
    { path: '/site/careers', priority: 0.5, changeFrequency: 'monthly' },
    { path: '/site/contact', priority: 0.5, changeFrequency: 'yearly' },
    /* (pending modules S36) the AI Visualizer trial and its six landing pages — only while the trial is open (1.0's flag) */
    ...(trialEnabled() ? TRIAL_PAGES.map((t) => ({ path: t.path, priority: t.key === 'home' ? 0.8 : 0.7, changeFrequency: 'monthly' as const })) : []),
    /* (pending modules S41b-3) the no-account tools — only while they are open (their own switch) */
    ...(toolsTrialEnabled() ? [TRY_PATH.leads, TRY_PATH.quote, TRY_PATH.xray].map((path) => ({ path, priority: 0.7, changeFrequency: 'monthly' as const })) : []),
    ...blog.map((a) => ({ path: `/site/blog/${a.slug}`, priority: 0.7, changeFrequency: 'monthly' as const, lastModified: a.updatedAt ?? a.publishedAt })),
    { path: '/site/terms', priority: 0.2, changeFrequency: 'yearly' },
    { path: '/site/privacy', priority: 0.2, changeFrequency: 'yearly' },
    { path: '/site/cookies', priority: 0.2, changeFrequency: 'yearly' },
  ]
}
