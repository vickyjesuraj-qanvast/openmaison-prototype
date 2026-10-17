import 'server-only'
import { and, eq, gt, isNull, like } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leadAssignees, notifications } from '@/lib/db/schema'
import { notify } from '@/lib/notifications/emit'
import { studioRunnerIds } from '@/lib/notifications/queries'
import { CHAT_QUIET_MINUTES, firstWords } from '@/lib/projects/messages-model'
import { mutedAmong } from '@/lib/projects/conversations'

/**
 * (gaps build H — H-Q15, moved here by pending modules S34 so a client's WhatsApp reply rings the very same bell) The team hears a client's
 * message: the lead's members (else the studio's Owners and Admins), at most once per conversation in 15 minutes while it waits unread
 * (G's quiet window), never whoever muted the conversation (UC-070). `key` = the conversation (`project:<id>` · `lead:<id>`), `gist` = the
 * message in a line ("Photos" when it is only pictures). Never throws.
 */
export async function tellTeamOfClientMessage(o: { leadId: string; project: { id: string; name: string } | null; key: string; from: string; gist: string; now?: Date }): Promise<void> {
  try {
    const now = o.now ?? new Date()
    const href = o.project ? `/projects/${o.project.id}/messages` : `/chat?open=${encodeURIComponent(o.key)}`
    const since = new Date(now.getTime() - CHAT_QUIET_MINUTES * 60_000)
    const [recent] = await db.select({ id: notifications.id }).from(notifications).where(and(eq(notifications.kind, 'chat_message'), like(notifications.href, `${href}%`), gt(notifications.createdAt, since), isNull(notifications.readAt))).limit(1)
    if (recent) return
    const team = (await db.select({ id: leadAssignees.memberId }).from(leadAssignees).where(eq(leadAssignees.leadId, o.leadId))).map((r) => r.id)
    const to = team.length ? team : await studioRunnerIds()
    const muted = await mutedAmong(o.key, to)
    const where = o.project ? o.project.name : 'their lead page'
    const heard = to.filter((m) => !muted.has(m))
    if (heard.length) await notify('chat_message', heard, { title: `${o.from} sent a message`, body: `${firstWords(o.gist || 'Photos', 120)} · ${where}`, href, leadId: o.leadId, actorId: null, fields: { '{comment}': firstWords(o.gist || 'Photos', 300) } })
  } catch (e) { console.error('[messages] the team’s bell for a client’s message didn’t ring:', e instanceof Error ? e.message : e) }
}
