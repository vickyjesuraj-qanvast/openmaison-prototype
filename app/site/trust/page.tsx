import { Ld } from '@/components/site/ld'
import { TrustView } from '@/components/site/company-pages'
import { breadcrumbJsonLd, siteMetadata } from '@/lib/site/seo'

/* 1.0's description named "regional data residency"; 2.0 serves Singapore (her hold, 2026-10-12) */
export const metadata = siteMetadata({
  title: 'Trust & Security: Your data stays yours',
  description: 'How OpenMaison protects your studio’s data: encryption in transit and at rest, full data ownership and export, role-based access, and where your data lives.',
  path: '/site/trust', card: 'trust', ogTitle: 'OpenMaison: Trust & Security', ogDescription: 'Encryption, data ownership, role-based access and where your data lives, explained plainly.',
})

export default function TrustPage() {
  return <><Ld data={breadcrumbJsonLd([{ name: 'Home', path: '/site' }, { name: 'Trust & Security', path: '/site/trust' }])} /><TrustView /></>
}
