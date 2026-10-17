'use server'

import { and, eq, isNull } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { leads, projects, quotes } from '@/lib/db/schema'
import { revalidateLead } from '@/lib/leads/queries'
import { titleCaseName } from '@/lib/format'
import { notify } from '@/lib/notifications/emit'
import { leadMemberIds, studioRunnerIds } from '@/lib/notifications/queries'
import { logProjectEvent } from '@/lib/projects/events'
import { DECLINE_NOTE_MAX } from '@/lib/projects/decline'
import { quoteByConfirmKey } from '@/lib/quotes/client-quote'
import { confirmKeyOf, confirmPath } from '@/lib/quotes/confirm'

/**
 * (gaps build D, item 2 — M-07; 1.0's ✗ Reject with its reason, I-292 · I-293 · `vo.client_rejected`) The client's **Decline** on a variation
 * order's confirmation link: their reason (required) and the name they typed go on the order (`quotes.declined_*`). The order stays Sent to
 * Client on the record but is back with the studio — Money says "Declined by the client", the portal stops asking, the waiting lines let it
 * go — until the studio revises it or sends it again (both clear the decline). The team hears it on the bell (`variation_declined`) and
 * Activity files it (`project_vo_declined`). A public endpoint, like *Ask for a change*: only an order the client holds (sent, not yet
 * approved) takes one, and the words are bounded; they travel in one object.
 */
export async function declineVariationOnline(token: string, o: { name: string; note: string }): Promise<{ declinedAt: number; by: string } | { error: string }> {
  const hit = await quoteByConfirmKey(typeof token === 'string' ? token : '')   // (pending modules S04) the link's token, never the order's id
  const [q] = hit ? await db.select().from(quotes).where(eq(quotes.id, hit.id)).limit(1) : []
  if (!q || q.deletedAt || q.archivedAt) return { error: 'This variation order is no longer available' }
  if (q.kind !== 'variation') return { error: 'Only a variation order can be declined here' }
  if (q.status === 'Confirmed' || q.status === 'Signed') return { error: 'You approved this variation order already' }
  if (q.status !== 'Approved' && q.status !== 'Sent to Client') return { error: 'This variation order can’t be answered now' }
  if (q.declinedAt) return { error: 'You declined this variation order already — your designer will be in touch' }
  const note = (typeof o?.note === 'string' ? o.note : '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
  if (!note) return { error: 'Say why, so your designer knows what to change' }
  if (note.length > DECLINE_NOTE_MAX) return { error: `Keep it to ${DECLINE_NOTE_MAX} characters` }
  const [l] = await db.select({ name: leads.name }).from(leads).where(eq(leads.id, q.leadId)).limit(1)
  const who = (typeof o?.name === 'string' ? o.name.replace(/\s+/g, ' ').trim().slice(0, 80) : '') || (l ? titleCaseName(l.name) : 'The client')
  const now = new Date()
  /* conditional on the order still waiting: two presses (or an approval at once) make one answer */
  const r = await db.update(quotes).set({ declinedAt: now, declinedNote: note, declinedBy: who, updatedAt: now })
    .where(and(eq(quotes.id, q.id), isNull(quotes.declinedAt), isNull(quotes.confirmedAt)))
  if (!r.rowsAffected) return { error: 'This variation order was answered already' }
  const [p] = q.projectId ? await db.select({ id: projects.id, name: projects.name, number: projects.number }).from(projects).where(eq(projects.id, q.projectId)).limit(1) : []
  if (p) await logProjectEvent(db, q.leadId, p.id, 'project_vo_declined', { id: q.id, title: q.title, number: q.number, name: p.name, note, by: 'client', person: who }, { actorId: null })
  await notify('variation_declined', [...await leadMemberIds(q.leadId), ...await studioRunnerIds(), ...(q.createdBy ? [q.createdBy] : [])],
    { title: `${who} declined variation order ${q.number}`, body: `“${note.length > 140 ? `${note.slice(0, 139)}…` : note}” — revise it and send it again, or delete it`, href: p ? `/projects/${p.id}/money` : `/quotes/${q.id}`, leadId: q.leadId, quoteId: q.id, actorId: null })
  revalidateLead(q.leadId)
  revalidatePath(`/quotes/${q.id}`)
  revalidatePath(confirmPath(confirmKeyOf(q)))
  if (p) revalidatePath(`/projects/${p.id}/money`)
  return { declinedAt: now.getTime(), by: who }
}
