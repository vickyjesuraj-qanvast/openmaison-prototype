import { Ld } from '@/components/site/ld'
import { ChangelogView } from '@/components/site/changelog-view'
import { breadcrumbJsonLd, siteMetadata } from '@/lib/site/seo'

export const metadata = siteMetadata({
  title: 'What’s New: OpenMaison Changelog',
  description: 'Everything new in OpenMaison — the features, polish and fixes that keep interior-design studios running calmer. Updated every couple of weeks.',
  path: '/site/changelog', card: 'changelog', ogTitle: 'What’s New at OpenMaison', ogDescription: 'A running record of the latest features and improvements across quotes, finance, projects, the client portal and AI.',
})

export default function ChangelogPage() {
  return <><Ld data={breadcrumbJsonLd([{ name: 'Home', path: '/site' }, { name: 'What’s New', path: '/site/changelog' }])} /><ChangelogView /></>
}
