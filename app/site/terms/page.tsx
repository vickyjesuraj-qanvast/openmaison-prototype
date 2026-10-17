import { TermsView } from '@/components/site/legal'
import { siteMetadata } from '@/lib/site/seo'

export const metadata = siteMetadata({ title: 'Terms of Service | OpenMaison', description: 'Terms of Service for OpenMaison, the AI-powered Studio OS for interior design professionals. Operated by Qanvast Pte. Ltd., Singapore.', path: '/site/terms', card: 'terms' })

export default function Page() {
  return <TermsView />
}
