import { Ld } from '@/components/site/ld'
import { StoryView } from '@/components/site/company-pages'
import { breadcrumbJsonLd, siteMetadata } from '@/lib/site/seo'

export const metadata = siteMetadata({
  title: 'Story: Built by the team behind Qanvast',
  description: 'We built Asia’s largest interior-design platform, watched studios drown in admin, and built OpenMaison to fix it. A decade inside the industry, in one tool.',
  path: '/site/story', card: 'story', ogTitle: 'OpenMaison: Our Story', ogDescription: 'From Qanvast to OpenMaison: a decade inside interior design, in one calm operating system.',
})

export default function StoryPage() {
  return <><Ld data={breadcrumbJsonLd([{ name: 'Home', path: '/site' }, { name: 'Story', path: '/site/story' }])} /><StoryView /></>
}
