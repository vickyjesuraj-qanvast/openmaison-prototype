import 'server-only'   // libSQL never reaches the browser: every client import of this module is `import type`
import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { homeownerLeadLinks, leadAssignees, leads } from '@/lib/db/schema'
import { sessionMemberId } from '@/lib/db/session'
import { isSgMobile, phoneDigits, titleCaseName } from '@/lib/format'
import { logLeadEvent } from '@/lib/leads/events'
import { ensureHomeownerLink } from '@/lib/leads/portal'
import { askAgainBlock } from '@/lib/leads/question-model'
import { canOpenLead, fetchViewer } from '@/lib/leads/visibility'
import { worksOn } from '@/lib/projects/policy'
import { tellClient } from './client-messages-send'
import { PORTAL_ACCESS_RULE, firstName, portalPath } from './model'
import { currentPortalSlug, fetchPortalLook, fetchPortalSettings } from './queries'

/*
 * (parity map, CP-110 — 1.0's Ask homeowner, M-172…M-174; a bug fix of REG-1252) Ask the client, told for real. Before, the ask was recorded
 * (and showed in the client's What needs you) but the client heard nothing: no bell row, no email, Send via WhatsApp opened nothing while the
 * snackbar said "Notification sent", and Copy gave the mock's placeholder link. Now:
 *   · the dialog shows the studio's REAL address — the client's questions page on their portal (`/my/<address>/questions/<home>`), or the
 *     portal's address before the first ask made their home — and WhatsApp opens on the press with a drafted line to the client's phone;
 *   · Send records the ask (1.0's five minutes between asks stay), and the client gets a row on their portal's bell (derived from the ask,
 *     lib/portal/notifications-model.ts) and `client_questions` by the house delivery layer (email by default);
 *   · a client who was never invited can't sign in, so the ask invites them too — one press, said in the dialog first — when their number is
 *     a mobile (the portal signs in by SMS) and the asker may invite (the client's team, their Manager, Owners and Admins); a withdrawn client
 *     is not invited again from here.
 */

export type AskState = 'invited' | 'invite' | 'withdrawn' | 'no-mobile' | 'no-access'
export type AskTarget = {
  leadId: string
  client: string
  first: string
  /** the eight digits WhatsApp is drafted to — null when the lead has no mobile */
  phone: string | null
  /** where the client answers: their questions page once their home exists on the portal, else the portal's address */
  address: string
  /** invited (asks reach them) · invite (this ask also invites them) · withdrawn · no-mobile · no-access (the asker may not invite) */
  state: AskState
  /** why an ask now would be refused (1.0's five minutes), or null */
  wait: string | null
  /** the portal can't be opened right now: the studio's own Paused, or OpenMaison closed it */
  stopped: 'paused' | 'closed' | null
  studio: string
}

/** Who the ask is to and whether it can go — for the dialog, read when it opens; null when the viewer can't open the lead. */
export async function askTargetOf(leadId: string): Promise<AskTarget | null> {
  const viewer = await fetchViewer()
  if (!(await canOpenLead(viewer, leadId))) return null
  const [l] = await db.select({ name: leads.name, phone: leads.phone }).from(leads).where(and(eq(leads.id, leadId), isNull(leads.deletedAt))).limit(1)
  if (!l) return null
  const [[link], team, slug, portal, look] = await Promise.all([
    db.select().from(homeownerLeadLinks).where(eq(homeownerLeadLinks.leadId, leadId)).limit(1),
    db.select({ id: leadAssignees.memberId }).from(leadAssignees).where(eq(leadAssignees.leadId, leadId)),
    currentPortalSlug(), fetchPortalSettings(), fetchPortalLook(),
  ])
  const digits = phoneDigits(l.phone)
  const mobile = isSgMobile(digits)
  const invited = !!link?.invitedAt && !link.withdrawnAt
  const state: AskState = link?.withdrawnAt ? 'withdrawn' : invited ? 'invited' : !mobile ? 'no-mobile' : worksOn(viewer, team.map((t) => t.id)) ? 'invite' : 'no-access'
  const client = titleCaseName(l.name)
  return {
    leadId, client, first: firstName(client), phone: mobile ? digits : null,
    address: link ? portalPath(slug, `questions/${link.id}`) : portalPath(slug),
    state, wait: askAgainBlock(link?.lastAskedAt ? new Date(link.lastAskedAt).getTime() : null, Date.now()),
    stopped: look.closed ? 'closed' : portal.paused ? 'paused' : null,
    studio: look.studio,
  }
}

/** Why an ask can't go for this client, in the rule's words, or null. */
export function askBlock(t: Pick<AskTarget, 'state' | 'first' | 'wait'>): string | null {
  if (t.state === 'withdrawn') return `${t.first}’s access to the portal was withdrawn — give it back in Invite to Portal first`
  if (t.state === 'no-mobile') return 'The client’s phone number isn’t a mobile number — fix it on the lead first'
  if (t.state === 'no-access') return PORTAL_ACCESS_RULE
  return t.wait
}

/**
 * The ask itself, after its checks: the 5-minute pace stamped, the Activity line (with the ids asked), the invite when this ask brings one,
 * then the client told — the bell row derives from the ask; `client_questions` goes by the delivery layer, once per ask. Answers the refusal,
 * or how it reached them.
 */
export async function recordAsk(leadId: string, ids: string[] | null): Promise<{ error: string } | { invited: boolean; told: number }> {
  const target = await askTargetOf(leadId)
  if (!target) return { error: 'This lead isn’t one you can open' }
  const block = askBlock(target)
  if (block) return { error: block }
  const link = await ensureHomeownerLink(leadId)
  const now = new Date()
  const invite = target.state === 'invite'
  await db.update(homeownerLeadLinks).set({
    lastAskedAt: now,
    ...(invite ? { invitedAt: link.invitedAt ?? now, invitedBy: link.invitedAt ? link.invitedBy : await sessionMemberId(), withdrawnAt: null, withdrawnBy: null } : {}),
  }).where(eq(homeownerLeadLinks.id, link.id))
  if (invite) await logLeadEvent(db, leadId, 'invite_sent')
  const eventId = await logLeadEvent(db, leadId, 'questionnaire_asked', ids ? { ids } : {})
  const told = await tellClient({
    event: 'client_questions', leadId, ref: eventId, path: `questions/${link.id}`, fields: {},
    plain: { title: `A few questions from ${target.studio}`, line: `${target.studio} has a few questions about your home — you can answer them on your page.` },
  })
  return { invited: invite, told }
}
