import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { fetchSigning } from '@/lib/contracts/queries'
import { SigningPage } from '@/components/contracts/sign/signing-page'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const data = await fetchSigning(id)
  return { title: data ? `Sign · ${data.contract.title}` : 'Sign' }
}

/** The signing link's page (REG-534): what the client opens from WhatsApp — review, one-time code, sign. */
export default async function SignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await fetchSigning(id)
  if (!data) notFound()
  return <SigningPage data={data} />
}
