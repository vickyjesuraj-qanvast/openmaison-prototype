import type { Metadata } from 'next'
import { like, or } from 'drizzle-orm'
import { db } from '@/lib/db'
import { imports } from '@/lib/db/schema'
import { fetchLeadCapture, fetchStudio } from '@/lib/settings/queries'
import { IntegrationsView } from '@/components/company/integrations-view'
import { readFrom } from '@/lib/nav'
import { fetchViewer } from '@/lib/leads/visibility'
import { runsStudio } from '@/lib/leads/assign-policy'

export const metadata: Metadata = { title: 'Company · Integrations' }
export const dynamic = 'force-dynamic'

/** Company › Integrations (REG-602): where leads come in from — Qanvast, the website form's email, Meta Lead Ads — and what is still to come. */
export default async function IntegrationsPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const [capture, studio, arrivals, sp, viewer] = await Promise.all([
    fetchLeadCapture(), fetchStudio(),
    db.select({ fileName: imports.fileName, createdAt: imports.createdAt, importedRows: imports.importedRows }).from(imports).where(or(like(imports.fileName, 'Website form%'), like(imports.fileName, 'Meta Lead Ads%'))),
    searchParams,
    fetchViewer(),   /* (REG-612) */
  ])
  return <IntegrationsView capture={capture} studioName={studio.name} arrivals={arrivals.map((a) => ({ fileName: a.fileName, at: a.createdAt.getTime(), rows: a.importedRows }))} from={readFrom(sp.from)} canManage={runsStudio(viewer.role)} />
}
