'use server'

import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leadAssignees, leads } from '@/lib/db/schema'
import { titleCaseName } from '@/lib/format'
import { logLeadEvent } from '@/lib/leads/events'
import { revalidateLead } from '@/lib/leads/queries'
import { canOpenLead, fetchViewer } from '@/lib/leads/visibility'
import { worksOn } from '@/lib/projects/policy'
import { PORTAL_ACCESS_RULE } from '@/lib/portal/model'

/*
 * (Projects round 9 — Q-41) Remind on WhatsApp, from a waiting item in Client access: the message is drafted and wa.me opens on the press (in
 * the browser, as the invite does); this records that it went — the item's "Reminded 2 days ago" and a line in the lead's Activity — so the
 * team sees who nudged the client and when. The rule is Client access's (`worksOn`).
 */
export async function recordReminder(leadId: string, input: { key: string; title: string }): Promise<{ error: string } | { at: number }> {
  const viewer = await fetchViewer()
  if (!(await canOpenLead(viewer, leadId))) return { error: 'This lead isn’t one you can open' }
  const [l] = await db.select({ name: leads.name }).from(leads).where(and(eq(leads.id, leadId), isNull(leads.deletedAt))).limit(1)
  if (!l) return { error: 'This lead was deleted' }
  const team = await db.select({ id: leadAssignees.memberId }).from(leadAssignees).where(eq(leadAssignees.leadId, leadId))
  if (!worksOn(viewer, team.map((t) => t.id))) return { error: PORTAL_ACCESS_RULE }
  const key = String(input.key ?? '').slice(0, 120), title = String(input.title ?? '').replace(/\s+/g, ' ').trim().slice(0, 160)
  if (!key || !title) return { error: 'Choose what to remind them about' }
  await logLeadEvent(db, leadId, 'portal_reminded', { id: key, title, name: titleCaseName(l.name) })
  revalidateLead(leadId)
  return { at: Date.now() }
}
