import type { Metadata } from 'next'
import { fetchScheduleTemplatesData } from '@/lib/company/schedule-templates'
import { ScheduleTemplatesGallery } from '@/components/company/templates/schedules/schedule-templates-gallery'
import { readFrom } from '@/lib/nav'
import { fetchFolders } from '@/lib/company/folders'
import { AccessGate } from '@/components/shell/access-gate'
import { refusesPath } from '@/lib/leads/visibility'

export const metadata: Metadata = { title: 'Schedule templates' }
export const dynamic = 'force-dynamic'

/** (Projects round 2, Q-12) Company › Templates › Schedules: the milestones a project's schedule can start from. */
export default async function ScheduleTemplatesPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  if (await refusesPath('/company/templates/schedules')) return <AccessGate section="Templates" />   // (S44Z — S44O's note) the role's own list, before a record is read: Marketing's leads, Accounting's books
  const [data, sp, folders] = await Promise.all([fetchScheduleTemplatesData(), searchParams, fetchFolders('schedules')])
  return <ScheduleTemplatesGallery data={data} from={readFrom(sp.from)} folders={folders} />
}
