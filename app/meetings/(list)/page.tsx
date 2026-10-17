import type { Metadata } from 'next'
import { fetchStudioMeetings } from '@/lib/meetings/queries'
import { MeetingsWorkspace } from '@/components/meetings/meetings-workspace'
import { refusesPath } from '@/lib/leads/visibility'
import { AccessGate } from '@/components/shell/access-gate'

/** (pending modules S23) Tools › Meeting Copilot — every meeting the viewer may see: the lead tab unpinned (REG-466's pattern). */
export const metadata: Metadata = { title: 'Meetings' }
export const dynamic = 'force-dynamic'

export default async function MeetingsPage() {
  if (await refusesPath('/meetings')) return <AccessGate section="Meetings" />
  const data = await fetchStudioMeetings()
  return <MeetingsWorkspace data={data} />
}
