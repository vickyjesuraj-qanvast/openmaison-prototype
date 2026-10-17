import type { Metadata } from 'next'
import { fetchImports } from '@/lib/leads/queries'
import { fetchLeadSources } from '@/lib/settings/queries'
import { liveSourceNames } from '@/lib/settings/types'
import { ImportsView } from './imports-view'
import { refusesPath } from '@/lib/leads/visibility'   // (parity map, PR-022) the Leads pipeline is never Accounting's
import { AccessGate } from '@/components/shell/access-gate'

export const metadata: Metadata = { title: 'Lead Import History' }
export const dynamic = 'force-dynamic'

export default async function ImportsPage() {
  if (await refusesPath('/leads/imports')) return <AccessGate section="Leads" />   // (parity map, PR-022)
  const [imports, sourceList] = await Promise.all([fetchImports(), fetchLeadSources()])
  /* (UX audit L4) The wizard reads a Lead Source cell against the studio's whole list and offers the live ones as the file's one source. */
  return <ImportsView imports={imports} sources={sourceList.sources.map((s) => s.name)} liveSources={liveSourceNames(sourceList.sources)} />
}
