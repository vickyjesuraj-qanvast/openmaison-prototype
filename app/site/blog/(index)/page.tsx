import { Ld } from '@/components/site/ld'
import { BlogIndex } from '@/components/site/blog'
import { ALL_BLOG_ARTICLES } from '@/lib/site/blog/articles'
import { cardOf } from '@/lib/site/blog/cards'
import { breadcrumbJsonLd, siteMetadata } from '@/lib/site/seo'

export const metadata = siteMetadata({
  title: 'Blog', ogTitle: 'Blog | OpenMaison',
  description: 'Practical articles on running a design studio, using AI tools, and keeping up with renovation trends.',
  path: '/site/blog', card: 'blog', ogDescription: 'Practical articles on running a design studio, using AI tools, and renovation trends.',
})

export default function BlogPage() {
  return <><Ld data={breadcrumbJsonLd([{ name: 'Home', path: '/site' }, { name: 'Blog', path: '/site/blog' }])} /><BlogIndex posts={ALL_BLOG_ARTICLES.map(cardOf)} /></>
}
