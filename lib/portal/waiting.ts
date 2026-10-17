import 'server-only'
import { inArray } from 'drizzle-orm'
import { db } from '@/lib/db'
import { homeownerLeadLinks } from '@/lib/db/schema'
import { loadHomeFacts } from './home'

/**
 * (Projects round 4a) What the portal tells Projects, for many leads at once: whether the client can open the portal (Getting started's
 * "Invite the client") and what waits on them that the portal knows — the questions asked and not answered, designs not opened yet, an
 * invite not opened (round 1's `waitingOf` reads the quotes and contracts; round 4b adds a stage to confirm, round 6 a payment).
 */
export type PortalFacts = { invited: boolean; waiting: string[] }

export async function fetchPortalFacts(leadIds: string[]): Promise<Map<string, PortalFacts>> {
  const out = new Map<string, PortalFacts>()
  if (!leadIds.length) return out
  const links = await db.select().from(homeownerLeadLinks).where(inArray(homeownerLeadLinks.leadId, leadIds))
  const live = links.filter((l) => l.invitedAt && !l.withdrawnAt)
  const facts = await loadHomeFacts(live.map((l) => ({ linkId: l.id, leadId: l.leadId, lastOpenedAt: l.lastOpenedAt?.getTime() ?? null })), '')
  for (const id of leadIds) {
    const link = live.find((l) => l.leadId === id)
    const f = facts.get(id)
    const waiting: string[] = []
    if (link && f) {
      if (f.questions.open > 0) waiting.push(`${f.questions.open} ${f.questions.open === 1 ? 'question awaits' : 'questions await'} an answer`)
      if (f.designs.some((d) => d.views === 0)) waiting.push('Designs not opened yet')
      if (!link.openedAt) waiting.push('Portal invite not opened yet')
      /* (r4b) a finished stage the studio asked them to confirm, as the listing's other lines say it ("Quote OM-10005 awaits confirmation") */
      for (const s of f.schedule?.toConfirm ?? []) waiting.push(`${s.title} awaits confirmation`)
    }
    out.set(id, { invited: !!link, waiting })
  }
  return out
}
