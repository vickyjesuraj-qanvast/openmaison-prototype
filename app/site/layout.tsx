import type { ReactNode } from 'react'
import { SiteShell } from '@/components/site/site-shell'
import { INTRO_GATE } from '@/lib/site/intro'
import { Ld } from '@/components/site/ld'
import { organizationJsonLd, softwareApplicationJsonLd, webSiteJsonLd } from '@/lib/site/seo'
import './site-tokens.css'

/**
 * (pending modules S35 — his "build all of them" 2026-10-11; cards public:marketing-website · onboarding:book-a-demo; 1.0's (marketing)/layout.tsx)
 * OpenMaison's own website, under /site — open to anyone (lib/auth/paths.ts PUBLIC_PATHS), light only, its own frame (components/site/site-shell.tsx)
 * and token sheet (./site-tokens.css). The studio app's front door is unchanged: `/` is the Dashboard for a signed-in member, sign-in for a
 * signed-out browser. The company's structured data (Organization · WebSite · SoftwareApplication) rides on every page, as 1.0's did.
 */
/** The footer's © year, read once when the page is built. */
const YEAR = new Date().getFullYear()

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="om-site" data-testid="site">
      <Ld data={[organizationJsonLd(), webSiteJsonLd(), softwareApplicationJsonLd()]} />
      <script dangerouslySetInnerHTML={{ __html: INTRO_GATE }} />
      <SiteShell year={YEAR}>{children}</SiteShell>
    </div>
  )
}
