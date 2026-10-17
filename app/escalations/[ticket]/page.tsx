import { redirect } from 'next/navigation'
import { oldTicketTarget } from '@/lib/links/old-links'

export const dynamic = 'force-dynamic'

/** (pending modules S41b-2) 1.0's `/escalations/<ticket>` — every ticket notification's link (its number, `T-2026-…`): Projects › Tickets with
    the ticket open when the member may see its project, else Projects › Tickets. Its own route, with no loader: a plain 307. */
export default async function OldTicketPage({ params }: { params: Promise<{ ticket: string }> }) {
  redirect(await oldTicketTarget(decodeURIComponent((await params).ticket)))
}
