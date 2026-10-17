import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Ld } from '@/components/site/ld'
import { ArticleView } from '@/components/site/blog'
import { ALL_BLOG_ARTICLES, articleOf } from '@/lib/site/blog/articles'
import { cardOf, postDateLong } from '@/lib/site/blog/cards'
import { articleJsonLd, breadcrumbJsonLd, siteMetadata } from '@/lib/site/seo'

/* (pending modules S35 — 1.0's blog/[slug]/page.tsx) An article, built ahead; its Article and BreadcrumbList data, its cover as the link preview.
   Back returns to the Journal as it was left (`?from=`, the Journal's own address only). */
/* (pending modules S41b-3) built ahead, but no `dynamicParams = false`: with it, Next 16 answered every one of these pages 404 (NoFallbackError)
   after any whole-app revalidation (View as, a task, a sign-in — revalidatePath('/', 'layout')) until the next build; an unknown one is the
   site's own 404, said by this segment's layout above the streamed ghost */
export function generateStaticParams() { return ALL_BLOG_ARTICLES.map((a) => ({ slug: a.slug })) }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const a = articleOf((await params).slug)
  if (!a) return {}
  const m = siteMetadata({ title: a.title, description: a.excerpt, path: `/site/blog/${a.slug}`, card: `blog-${a.slug}`, type: 'article', keywords: a.keywords,
    extra: { publishedTime: a.publishedAt, modifiedTime: a.updatedAt ?? a.publishedAt, authors: [a.author.name], tags: a.keywords } as Metadata['openGraph'] })
  return { ...m, authors: [{ name: a.author.name }] }
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const a = articleOf((await params).slug)
  if (!a) notFound()
  const related = (a.relatedSlugs ?? []).map((s) => articleOf(s)).filter((x): x is NonNullable<typeof x> => !!x).slice(0, 3).map(cardOf)
  return (
    <>
      <Ld data={[articleJsonLd(a), breadcrumbJsonLd([{ name: 'Home', path: '/site' }, { name: 'Blog', path: '/site/blog' }, { name: a.title, path: `/site/blog/${a.slug}` }])]} />
      <ArticleView article={{ slug: a.slug, title: a.title, category: a.category, readTime: a.readTime, author: a.author, publishedAt: a.publishedAt, date: postDateLong(a.publishedAt), heroImage: a.heroImage, heroAlt: a.heroAlt, sections: a.sections, keyStats: a.keyStats }}
                   related={related} />
    </>
  )
}
