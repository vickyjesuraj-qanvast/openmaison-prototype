import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { fetchBundleSigning } from '@/lib/contracts/queries'
import { BundleSigningPage } from '@/components/contracts/sign/bundle-signing-page'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const data = await fetchBundleSigning(id)
  return { title: data ? `Sign · ${data.documents.length} documents` : 'Sign' }
}

/** (REG-591) One link, several documents: the client reads each and signs once. */
export default async function SignBundlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await fetchBundleSigning(id)
  if (!data) notFound()
  return <BundleSigningPage data={data} />
}
