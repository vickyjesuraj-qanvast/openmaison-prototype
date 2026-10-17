import { redirect } from 'next/navigation'
import { oldCopilotTarget } from '@/lib/links/old-links'

export const dynamic = 'force-dynamic'

/** (pending modules S41b-2) 1.0's Tools › Meeting Copilot: Meetings — its insights on Company › Reports › Meetings, a session on its meeting. */
export default async function OldCopilotTool({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  redirect(await oldCopilotTarget(await searchParams))
}
