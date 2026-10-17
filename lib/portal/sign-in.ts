import 'server-only'
import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { homeownerLeadLinks, homeownerProfiles, leads } from '@/lib/db/schema'
import { phoneDigits } from '@/lib/format'
import { endSessionsWithout } from './session'

/**
 * (fix-G, G-02) The number the Client access panel shows is the number that opens the portal. When the lead's phone changes, the client's
 * portal sign-in moves with it: the lead's link points at the new number's profile (made if none — a client with no portal link yet has
 * nothing to move), and the old number's sessions end once it opens nothing else. Answers the new number when it moved (the lead's
 * Activity says so in the edit's line), else null.
 */
export async function movePortalSignIn(leadId: string, fromPhone: string | null | undefined, toPhone: string | null | undefined): Promise<string | null> {
  const from = phoneDigits(fromPhone), to = phoneDigits(toPhone)
  if (!to || from === to) return null
  const [link] = await db.select().from(homeownerLeadLinks).where(eq(homeownerLeadLinks.leadId, leadId)).limit(1)
  if (!link) return null
  const [old] = await db.select().from(homeownerProfiles).where(eq(homeownerProfiles.id, link.homeownerId)).limit(1)
  if (old && phoneDigits(old.phone) === to) return null
  let [next] = await db.select().from(homeownerProfiles).where(eq(homeownerProfiles.phone, to)).limit(1)
  if (!next) {
    const [l] = await db.select({ name: leads.name, email: leads.email }).from(leads).where(eq(leads.id, leadId)).limit(1)
    const now = new Date()
    const id = randomUUID()
    await db.insert(homeownerProfiles).values({ id, phone: to, name: l?.name ?? old?.name ?? 'Client', email: l?.email ?? null, createdAt: now, updatedAt: now })
    ;[next] = await db.select().from(homeownerProfiles).where(eq(homeownerProfiles.id, id)).limit(1)
  }
  if (!next) return null
  await db.update(homeownerLeadLinks).set({ homeownerId: next.id }).where(eq(homeownerLeadLinks.id, link.id))
  if (old) await endSessionsWithout(old.id)
  return to
}
