import { Ld } from '@/components/site/ld'
import { ContactView } from '@/components/site/contact'
import { breadcrumbJsonLd, siteMetadata } from '@/lib/site/seo'

export const metadata = siteMetadata({
  title: 'Contact', ogTitle: 'Contact OpenMaison',
  description: 'Email hello@openmaison.ai or WhatsApp +65 8035 8955. We usually reply within a day.',
  path: '/site/contact', card: 'contact', ogDescription: 'Email or WhatsApp us. We usually reply within a day.',
})

export default function ContactPage() {
  return <><Ld data={breadcrumbJsonLd([{ name: 'Home', path: '/site' }, { name: 'Contact', path: '/site/contact' }])} /><ContactView /></>
}
