import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { fetchYourProfile } from '@/lib/company/your-profile'
import { fetchSessionTeam } from '@/lib/db/session'
import { YourProfileView } from '@/components/profile/your-profile-view'
import { readFrom } from '@/lib/nav'

export const metadata: Metadata = { title: 'Your profile' }
export const dynamic = 'force-dynamic'

/** (pending modules S01 — 1.0's Settings › Your Profile) The signed-in member's own name, email, phone, photo and signature. */
export default async function YourProfilePage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  /* (the calm UI build 2026-10-27 — the audit's 1-39) your own Take new leads lives here now — the switch itself, read from your member record */
  const [data, sp, team] = await Promise.all([fetchYourProfile(), searchParams, fetchSessionTeam().catch(() => [])])
  if (!data) notFound()
  const you = team.find((m) => m.isYou) ?? null
  return <YourProfileView data={data} from={readFrom(sp.from)} accepting={you ? you.acceptingLeads : undefined} />
}
