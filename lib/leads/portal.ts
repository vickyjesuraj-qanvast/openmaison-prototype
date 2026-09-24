import 'server-only'   // (REG-286) libSQL must never reach the browser bundle: client readers import types only
import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { homeownerLeadLinks, homeownerProfiles, leads, type HomeownerLeadLink } from '@/lib/db/schema'

/*
 * (REG-609, parity Q-22) The portal's lead-stage records — 1.0's auto-bind (`ensureHomeownerForLead`): a lead with a phone
 * has one homeowner profile (by phone) and one link carrying its portal token. The invite and the questionnaire ask are
 * stamped on the link, and the Overview, the Questionnaire tab and Activity read them back.
 */
export type PortalLink = { invitedAt: Date | null; askedAt: Date | null; token: string; chatHistoryVisible: boolean }
export const toPortalLink = (l: HomeownerLeadLink): PortalLink => ({ invitedAt: l.invitedAt, askedAt: l.lastAskedAt, token: l.portalToken, chatHistoryVisible: l.chatHistoryVisible })

export async function fetchPortalLink(leadId: string): Promise<PortalLink | null> {
  const [l] = await db.select().from(homeownerLeadLinks).where(eq(homeownerLeadLinks.leadId, leadId)).limit(1)
  return l ? toPortalLink(l) : null
}

/** Find-or-create the profile (by phone) and the lead's link. Idempotent: a second call returns the same link. */
export async function ensureHomeownerLink(leadId: string): Promise<HomeownerLeadLink> {
  const [existing] = await db.select().from(homeownerLeadLinks).where(eq(homeownerLeadLinks.leadId, leadId)).limit(1)
  if (existing) return existing
  const [lead] = await db.select({ name: leads.name, phone: leads.phone, email: leads.email }).from(leads).where(eq(leads.id, leadId)).limit(1)
  if (!lead) throw new Error('lead not found')
  const now = new Date()
  let [profile] = await db.select().from(homeownerProfiles).where(eq(homeownerProfiles.phone, lead.phone)).limit(1)
  if (!profile) {
    const id = randomUUID()
    await db.insert(homeownerProfiles).values({ id, phone: lead.phone, name: lead.name, email: lead.email, createdAt: now, updatedAt: now })
    ;[profile] = await db.select().from(homeownerProfiles).where(eq(homeownerProfiles.id, id)).limit(1)
  }
  const id = randomUUID()
  await db.insert(homeownerLeadLinks).values({ id, homeownerId: profile!.id, leadId, portalToken: randomUUID(), chatHistoryVisible: true, invitedAt: null, lastAskedAt: null, createdAt: now })
  const [link] = await db.select().from(homeownerLeadLinks).where(eq(homeownerLeadLinks.id, id)).limit(1)
  return link!
}
