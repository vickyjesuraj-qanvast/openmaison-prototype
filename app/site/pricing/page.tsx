import { Ld } from '@/components/site/ld'
import { PricingView } from '@/components/site/pricing'
import { breadcrumbJsonLd, siteMetadata } from '@/lib/site/seo'

/* (S46D — D4, his "fix everything" 2026-10-19; finding D4 · raw T-2) OpenMaison's public Pricing — 1.0's plg page (live since 22 Sep), its metadata
   in 2.0's words ("AI credits", never tokens). Every figure on it is the app's own (lib/site/pricing.ts). */
export const metadata = siteMetadata({
  title: 'Pricing: Start free, upgrade when you’re ready',
  description: 'Start free with no card. Pro adds Quote X-Ray, your own quote templates, approvals and a bigger month of AI credits. Every AI action has a published price in AI credits, so you see what it costs before you press it.',
  path: '/site/pricing', card: 'pricing', ogTitle: 'OpenMaison: Pricing', ogDescription: 'Start free with no card. AI runs on AI credits, with a published price for every action.',
})

export default function PricingPage() {
  return <><Ld data={breadcrumbJsonLd([{ name: 'Home', path: '/site' }, { name: 'Pricing', path: '/site/pricing' }])} /><PricingView /></>
}
