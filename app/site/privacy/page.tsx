import { PrivacyView } from '@/components/site/legal'
import { siteMetadata } from '@/lib/site/seo'

export const metadata = siteMetadata({ title: 'Privacy Policy | OpenMaison', description: 'Privacy Policy for OpenMaison: how we collect, use, and protect your personal data. Compliant with Singapore PDPA.', path: '/site/privacy', card: 'privacy' })

export default function Page() {
  return <PrivacyView />
}
