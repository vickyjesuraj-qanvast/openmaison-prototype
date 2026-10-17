import 'server-only'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leads } from '@/lib/db/schema'
import { titleCaseName } from '@/lib/format'
import { notify } from '@/lib/notifications/emit'
import { leadMemberIds, studioRunnerIds } from '@/lib/notifications/queries'

/** (REG-608) The stage-changed event: "{lead}: {from} → {to}", the parking reason as the body — Owners, Admins and the lead's members hear it
    (never the actor). One writer for every move: the Move stage window, a quick move and (S44R — UAT row 358, call C7) a signed agreement's. */
export async function notifyStageChange(leadId: string, from: string, to: string, payload: unknown, o: { body?: string | null; actorId?: string | null } = {}): Promise<void> {
  const p = (payload && typeof payload === 'object' ? payload : {}) as { reason?: string }
  const body = o.body !== undefined ? o.body : to === 'On Hold' || to === 'Lost' ? `${to === 'On Hold' ? 'On hold' : 'Lost'}${p.reason ? ` · ${p.reason}` : ''}` : null
  const [l] = await db.select({ name: leads.name }).from(leads).where(eq(leads.id, leadId))
  const name = l ? titleCaseName(l.name) : 'A lead'
  await notify('stage_changed', [...(await studioRunnerIds()), ...(await leadMemberIds(leadId))], { title: `${name}: ${from} → ${to}`, body, href: `/leads/${leadId}`, leadId, ...(o.actorId !== undefined ? { actorId: o.actorId } : {}) })
}
