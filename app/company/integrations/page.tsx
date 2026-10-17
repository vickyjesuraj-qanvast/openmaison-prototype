import type { Metadata } from 'next'
import { like, or } from 'drizzle-orm'
import { db } from '@/lib/db'
import { imports } from '@/lib/db/schema'
import { fetchLeadCapture, fetchStudio } from '@/lib/settings/queries'
import { withoutSecrets } from '@/lib/settings/types'
import { IntegrationsView } from '@/components/company/integrations-view'
import { readFrom } from '@/lib/nav'
import { fetchViewer } from '@/lib/leads/visibility'
import { isMarketing, runsLeadSetup } from '@/lib/settings/roles'   // (S44O — C6)
import { accountingIsStandIn, fetchXeroStatus } from '@/lib/finance/xero-server'
import { calendarIsStandIn } from '@/lib/meetings/calendar-sync'   // (pending modules S34)
import { fetchListingRead } from '@/lib/qanvast-listing/queries'   // (pending modules S37)

export const metadata: Metadata = { title: 'Company · Integrations' }
export const dynamic = 'force-dynamic'

/** Company › Integrations (REG-602): where leads come in from — Qanvast, the website form's email, Meta Lead Ads — and what is still to come.
    (one-home N-09) Xero's connection too: its live card, Connect and Disconnect here; Finance › Accounting keeps the mapping and the sync log. */
export default async function IntegrationsPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const [capture, studio, arrivals, sp, viewer, xero, listing] = await Promise.all([
    fetchLeadCapture(), fetchStudio(),
    db.select({ fileName: imports.fileName, createdAt: imports.createdAt, importedRows: imports.importedRows }).from(imports).where(or(like(imports.fileName, 'Website form%'), like(imports.fileName, 'Meta Lead Ads%'))),
    searchParams,
    fetchViewer(),   /* (REG-612) */
    fetchXeroStatus(),   /* (one-home N-09) */
    fetchListingRead(),   /* (pending modules S37) the Qanvast card follows the listing */
  ])
  /* (S44O — call C6) lead capture is the lead set-up — Marketing's too. Xero is the books': Marketing never sees its card; everyone else reads
     it as before (S44 closing regression — the first cut hid it from Designers and Managers too, a change C6 never asked for). */
  const canManage = runsLeadSetup(viewer.role)
  /* (pending modules S34) the connections still the prototype's stand-ins: Qanvast, the email intake, Meta and Gmail have no provider behind
     them on this build (lib/services/registry.ts); Xero and the studio's calendar are slots a real adapter fills */
  const simulated = { qanvast: true, email: true, meta: true, gmail: true, xero: accountingIsStandIn(), calendar: calendarIsStandIn() }
  return <IntegrationsView capture={canManage ? capture : withoutSecrets(capture)} studioName={studio.name} arrivals={arrivals.map((a) => ({ fileName: a.fileName, at: a.createdAt.getTime(), rows: a.importedRows }))} from={readFrom(sp.from)} canManage={canManage} xero={isMarketing(viewer.role) ? null : xero} simulated={simulated} qanvastListed={listing.state === 'listed'} />
}
