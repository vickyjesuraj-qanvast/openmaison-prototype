import { Ld } from '@/components/site/ld'
import { CareersView } from '@/components/site/company-pages'
import { breadcrumbJsonLd, siteMetadata } from '@/lib/site/seo'

export const metadata = siteMetadata({
  title: 'Jobs', ogTitle: 'Jobs at OpenMaison',
  description: 'Small team, remote-first, flexible hours. We’re hiring engineers, designers, and growth people to build AI tools for interior design studios.',
  path: '/site/careers', card: 'careers', ogDescription: 'Remote-first, flexible hours, learning budget. We’re building AI tools for design studios.',
})

export default function CareersPage() {
  return <><Ld data={breadcrumbJsonLd([{ name: 'Home', path: '/site' }, { name: 'Careers', path: '/site/careers' }])} /><CareersView /></>
}
