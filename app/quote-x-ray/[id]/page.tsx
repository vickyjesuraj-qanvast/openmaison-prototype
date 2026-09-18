import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { readFrom } from '@/lib/nav'
import { fetchComparison } from '@/lib/xray/queries'
import { XrayResult } from '@/components/xray/xray-result'

/** A stored comparison (REG-529): the record page behind Recent comparisons and the Activity feed. */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const c = await fetchComparison(id)
  return { title: c ? `${c.leadName ?? c.yourLabel} · vs ${c.otherStudio}` : 'Quote X-Ray' }
}
export const dynamic = 'force-dynamic'

export default async function XrayRecordPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ from?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams])
  const record = await fetchComparison(id)
  if (!record) notFound()
  return <XrayResult record={record} from={readFrom(sp.from)} />
}
