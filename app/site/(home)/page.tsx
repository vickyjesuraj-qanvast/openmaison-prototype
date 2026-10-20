import { HomeView } from '@/components/site/home'
import { Ld } from '@/components/site/ld'
import { breadcrumbJsonLd, siteMetadata } from '@/lib/site/seo'

/* (pending modules S35 — 1.0's (marketing)/page.tsx) The home page. Its words are 1.0's metadata in 2.0's names; "Singapore, Malaysia, UAE &
   India" is Singapore's alone (his hold, 2026-10-12). */
export const metadata = siteMetadata({
  title: 'OpenMaison: The AI Operating System for Interior Design Studios',
  description: 'OpenMaison is the first AI-native studio OS for interior design. Read quotes in 30 seconds, get AI coaching in client meetings, auto-generate project plans, and track margins in real time. Built for studios in Singapore.',
  keywords: ['interior design software', 'AI studio management', 'quote reading', 'interior design CRM', 'renovation project management', 'AI meeting copilot', 'interior design operating system', 'studio management platform', 'design studio AI', 'HDB renovation software'],
  path: '/site', card: 'home', cardAlt: 'OpenMaison: AI Studio OS',
  ogDescription: 'Read quotes in 30s. AI meeting coaching. Auto-generated project plans. Real-time margin tracking. Purpose-built for interior design studios.',
})

export default function SiteHome() {
  return <><Ld data={breadcrumbJsonLd([{ name: 'Home', path: '/site' }])} /><HomeView /></>
}
