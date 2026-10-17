import { fetchMeetingInvite } from '@/lib/meetings/client'
import { icsOf } from '@/lib/meetings/calendar'

export const dynamic = 'force-dynamic'

/**
 * (pending modules S23 — the held card's "Google Calendar invites"; 1.0's unmerged branch's `.ics` route) The meeting's invite file, from the
 * client's link: the standard calendar file Apple Calendar, Outlook and Google all open — the studio's title ("First consultation with
 * Demo Studio"), the place, the day and time with the link. No session: the token is the permission. A link that no longer opens the
 * invitation (closed, cancelled, past) answers a plain 404 — nothing about the meeting. (pending modules S23) (invented copy)
 */
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const origin = (() => { try { return new URL(req.url).origin } catch { return null } })()
  const event = await fetchMeetingInvite(token, origin)
  if (!event) return new Response('This invitation is no longer available', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } })
  return new Response(icsOf(event), {
    headers: { 'Content-Type': 'text/calendar; charset=utf-8', 'Content-Disposition': 'attachment; filename="meeting.ics"', 'Cache-Control': 'no-store' },
  })
}
