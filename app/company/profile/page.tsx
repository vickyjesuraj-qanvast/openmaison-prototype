import type { Metadata } from 'next'
import { AccessGate } from '@/components/shell/access-gate'
import { fetchBrand, fetchTemplates } from '@/lib/templates/queries'
import { ProfileView } from '@/components/company/profile-view'
import { readFrom } from '@/lib/nav'
import { fetchEntityUsage } from '@/lib/company/entities'
import { fetchAboutSetup } from '@/lib/portal/about'   // (gaps build H)
import { fetchRegistrations } from '@/lib/compliance/queries'   // (one-home N-07)
import { fetchListing } from '@/lib/qanvast-listing/queries'   // (pending modules S37)
import { fetchViewer, refusesPath } from '@/lib/leads/visibility'
import { seesQanvastReviews } from '@/lib/qanvast-account/policy'   // (pending modules S41b-5; S42E call E·2 — Owners and Admins)

export const metadata: Metadata = { title: 'Company · Profile' }
export const dynamic = 'force-dynamic'

/** Company › Profile (REG-487): the company details and issuing entities every quote template prints. */
export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  if (await refusesPath('/company/profile')) return <AccessGate section="Profile" />   // (S44O — call C6) the role's own list (Marketing never reads a quote's money, a project or Finance) — before a record is read
  const [brand, data, sp, usage, about, registrations, listing, viewer] = await Promise.all([fetchBrand(), fetchTemplates(), searchParams, fetchEntityUsage(), fetchAboutSetup(), fetchRegistrations(), fetchListing(), fetchViewer()])
  /* (REG-646) Back to where it was opened from (Settings › Studio, E-95); Owners and Admins change it (Q-07).
     (REG-707, owner 2026-09-28) No template preview here: it came with the brand kit, which moved to Templates (REG-554) with its own.
     (one-home N-07) The studio's registrations — the one record the Compliance Navigator and the signing pages read.
     (pending modules S37) Listed on Qanvast — the studio's application to be listed, and its listing (1.0's /verify). */
  return <ProfileView brand={brand} from={readFrom(sp.from)} canRun={data.canRun} usage={usage}
                      about={about} registrations={registrations} listing={listing} qanvastReviews={seesQanvastReviews(viewer.role)} />
}
