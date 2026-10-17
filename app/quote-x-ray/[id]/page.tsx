import type { Metadata } from 'next'
import { AccessGate } from '@/components/shell/access-gate'
import { refusesPath } from '@/lib/leads/visibility'   // (S44O — call C6)
import { notFound } from 'next/navigation'
import { readFrom } from '@/lib/nav'
import { fetchComparison } from '@/lib/xray/queries'
import { XrayResult } from '@/components/xray/xray-result'
import { XrayLockedRecord } from '@/components/xray/xray-locked-record'
import { planAllowsNow } from '@/lib/credits/plan-gate'

/** A stored comparison (REG-529): the record page behind Recent comparisons and the Activity feed. */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  if (await refusesPath(`/quote-x-ray/${id}`)) return { title: 'Quote X-Ray' }   // (S44O — C6) no record's name in a tab that is not theirs
  const c = await fetchComparison(id)
  return { title: c ? `${c.leadName ?? c.yourLabel} · vs ${c.otherStudio}` : 'Quote X-Ray' }
}
export const dynamic = 'force-dynamic'

export default async function XrayRecordPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ from?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams])
  if (await refusesPath(`/quote-x-ray/${id}`)) return <AccessGate section="Quote X-Ray" />   // (S44O — call C6) the role's own list (Marketing never reads a quote's money, a project or Finance) — before a record is read
  const [record, open] = await Promise.all([fetchComparison(id), planAllowsNow('quote_xray')])
  if (!record) notFound()
  /* (pending modules S19 — 1.0's plan gating) on Free the reading is locked: its frame, never its contents */
  if (!open) return <XrayLockedRecord record={{ leadId: record.leadId, leadName: record.leadName, yourLabel: record.yourLabel, otherStudio: record.otherStudio, createdAt: record.createdAt }} from={readFrom(sp.from)} />
  return <XrayResult record={record} from={readFrom(sp.from)} />
}
