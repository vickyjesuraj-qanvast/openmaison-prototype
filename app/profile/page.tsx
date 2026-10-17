import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { fetchYourProfile } from '@/lib/company/your-profile'
import { YourProfileView } from '@/components/profile/your-profile-view'
import { readFrom } from '@/lib/nav'

export const metadata: Metadata = { title: 'Your profile' }
export const dynamic = 'force-dynamic'

/** (pending modules S01 — 1.0's Settings › Your Profile) The signed-in member's own name, email, phone, photo and signature. */
export default async function YourProfilePage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const [data, sp] = await Promise.all([fetchYourProfile(), searchParams])
  if (!data) notFound()
  return <YourProfileView data={data} from={readFrom(sp.from)} />
}
