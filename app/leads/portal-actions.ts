'use server'

import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { homeownerLeadLinks } from '@/lib/db/schema'
import { ensureHomeownerLink } from '@/lib/leads/portal'
import { revalidateLead } from '@/lib/leads/queries'
import { logLeadEvent } from '@/lib/leads/events'

/*
 * (REG-609, parity Q-22) Invite to Portal › Send and Ask the client › Send leave a record — the link's stamps, read back as
 * "Invited on" / "Asked on" and as Activity lines. WhatsApp still opens on the press: the platform's own send is not the
 * prototype's to make. A repeat press re-stamps (1.0 resends when already invited).
 */
export async function invitePortal(leadId: string, o: { showHistory: boolean }): Promise<void> {
  const link = await ensureHomeownerLink(leadId)
  await db.update(homeownerLeadLinks).set({ invitedAt: new Date(), chatHistoryVisible: o.showHistory }).where(eq(homeownerLeadLinks.id, link.id))
  await logLeadEvent(db, leadId, 'invite_sent')   /* (REG-613) every invite, not only the latest stamp */
  revalidateLead(leadId)
}

export async function askClient(leadId: string): Promise<void> {
  const link = await ensureHomeownerLink(leadId)
  await db.update(homeownerLeadLinks).set({ lastAskedAt: new Date() }).where(eq(homeownerLeadLinks.id, link.id))
  await logLeadEvent(db, leadId, 'questionnaire_asked')   /* (REG-613) */
  revalidateLead(leadId)
}
