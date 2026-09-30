import type { Metadata } from 'next'
import { fetchImports } from '@/lib/leads/queries'
import { fetchLeadSources } from '@/lib/settings/queries'
import { liveSourceNames } from '@/lib/settings/types'
import { ImportsView } from './imports-view'

export const metadata: Metadata = { title: 'Lead Import History' }
export const dynamic = 'force-dynamic'

export default async function ImportsPage() {
  const [imports, sourceList] = await Promise.all([fetchImports(), fetchLeadSources()])
  /* (UX audit L4) The wizard reads a Lead Source cell against the studio's whole list and offers the live ones as the file's one source. */
  return <ImportsView imports={imports} sources={sourceList.sources.map((s) => s.name)} liveSources={liveSourceNames(sourceList.sources)} />
}
