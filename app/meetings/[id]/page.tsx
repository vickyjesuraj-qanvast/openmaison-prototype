import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { readFrom } from '@/lib/nav'
import { fetchMeetingRoom } from '@/lib/meetings/queries'
import { aimLabel, firstOf } from '@/lib/meetings/model'
import { titleCaseName } from '@/lib/format'
import { refusesPath } from '@/lib/leads/visibility'
import { AccessGate } from '@/components/shell/access-gate'
import { MeetingRoom } from '@/components/meetings/room/meeting-room'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  if (await refusesPath('/meetings')) return { title: 'Meeting' }
  const d = await fetchMeetingRoom(id)
  return { title: d ? `${aimLabel(d.meeting.aim) === 'Other' ? 'Meeting' : aimLabel(d.meeting.aim)} with ${firstOf(titleCaseName(d.lead.name))}` : 'Meeting' }
}

/** (pending modules S23) A meeting's one page — Before · During · After (components/meetings/room/meeting-room.tsx); one the viewer may not see answers not found. */
export default async function MeetingPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams])
  if (await refusesPath('/meetings')) return <AccessGate section="Meetings" />
  const data = await fetchMeetingRoom(id)
  if (!data) notFound()
  return <MeetingRoom data={data} from={readFrom(sp.from)} />
}
