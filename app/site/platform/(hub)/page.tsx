import { Ld } from '@/components/site/ld'
import { PlatformHub } from '@/components/site/platform-pages'
import { breadcrumbJsonLd, siteMetadata } from '@/lib/site/seo'

export const metadata = siteMetadata({
  title: 'Platform: Everything your studio needs, nothing it doesn’t',
  description: 'One system, three pillars: AI design & presentation, the margin engine, and studio operations. Leads, quotes, projects, finance and AI, built in, not bolted on.',
  path: '/site/platform', card: 'platform', ogTitle: 'OpenMaison: The Platform', ogDescription: 'One system, three pillars. Design, margins and operations for interior design studios.',
})

export default function PlatformPage() {
  return <><Ld data={breadcrumbJsonLd([{ name: 'Home', path: '/site' }, { name: 'Platform', path: '/site/platform' }])} /><PlatformHub /></>
}
