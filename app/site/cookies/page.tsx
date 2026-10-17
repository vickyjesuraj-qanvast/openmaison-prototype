import { CookiesView } from '@/components/site/legal'
import { siteMetadata } from '@/lib/site/seo'

export const metadata = siteMetadata({ title: 'Cookie Policy | OpenMaison', description: 'Cookie Policy for OpenMaison: what cookies we use, why, and how to manage your preferences.', path: '/site/cookies', card: 'cookies' })

export default function Page() {
  return <CookiesView />
}
