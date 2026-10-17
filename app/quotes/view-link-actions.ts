'use server'

import { and, eq, gte, isNull, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { leadEvents, quotes } from '@/lib/db/schema'
import { revalidateLead } from '@/lib/leads/queries'
import { dropLeadEvents, logLeadEvent } from '@/lib/leads/events'
import { canOpenLead, fetchViewer } from '@/lib/leads/visibility'
import { isAccounting } from '@/lib/settings/roles'
import { fetchQuoteApproval, isApprover } from '@/lib/settings/queries'
import { newShareToken } from '@/lib/projects/invoices-token'
import { leadClosed } from '@/lib/visualizer/queries'
import { LEAD_CLOSED_SHARE } from '@/lib/visualizer/policy'
import { isViewToken, offersViewLink, viewLinkBlock, viewPath } from '@/lib/quotes/view-link'
import { quoteByViewToken, viewStampOf } from '@/lib/quotes/view-link-queries'
import type { Refusal } from '@/lib/company/template-rules'
import { deskRefusal } from '@/lib/quotes/desk'   // (S44Z) the editors' role rule on the server

/*
 * (pending modules S02 — 1.0's `POST /api/quotes/[id]/share-link`) The quote's view-only link, from the quote editor's ⋮ › Share a view-only
 * link. 1.0 minted one token per quote, returned it again on every press and rotated it on Regenerate (the old address 404'd); 2.0 keeps
 * that — Share answers the live link, or makes one — and Stop is 2.0's Regenerate in two presses: the old address stops at once, the next
 * Share makes a new one. Who may: whoever may send the quote to the client (Who sees leads; with approval on, an approver for a quote not
 * yet approved). Each make and stop is an Activity line; Stop's Undo puts the same link back and takes its line away.
 */

async function forQuote(quoteId: string): Promise<Refusal | { q: typeof quotes.$inferSelect; viewerId: string; role: string }> {
  const no = await deskRefusal(); if (no) return no   // (S44Z) the role first — before the quote is read
  const [q] = await db.select().from(quotes).where(and(eq(quotes.id, String(quoteId)), isNull(quotes.deletedAt))).limit(1)
  if (!q) return { error: 'This quote is gone' }
  if (!offersViewLink(q.kind)) return { error: 'A variation order is approved on its confirmation link — it has no view-only link' }
  const viewer = await fetchViewer()
  if (isAccounting(viewer.role)) return { error: 'Only the studio’s team shares a quote with the client' }
  if (!(await canOpenLead(viewer, q.leadId))) return { error: 'This lead isn’t one you can open' }
  return { q, viewerId: viewer.id, role: viewer.role }
}
const touch = (q: { id: string; leadId: string }, token?: string | null) => { revalidateLead(q.leadId); revalidatePath(`/quotes/${q.id}`); if (token) revalidatePath(viewPath(token)) }

/** Share: the live link, or a new one. `made` = this press made it (the dialog's words and the Activity line follow it). */
export async function shareQuoteView(quoteId: string): Promise<Refusal | { token: string; at: number; made: boolean }> {
  const got = await forQuote(quoteId); if ('error' in got) return got
  const { q } = got
  if (q.viewToken && q.viewTokenAt) return { token: q.viewToken, at: q.viewTokenAt.getTime(), made: false }
  const [approval, approver] = await Promise.all([fetchQuoteApproval(), isApprover(got.viewerId, got.role)])
  const block = viewLinkBlock({ status: q.status, approval, approver, archived: !!q.archivedAt })
  if (block) return { error: block }
  if (await leadClosed(q.leadId)) return { error: LEAD_CLOSED_SHARE }
  const token = newShareToken(), at = new Date()
  /* the compare-and-set: two presses at once make one link — the second reads the first's */
  await db.update(quotes).set({ viewToken: token, viewTokenAt: at, viewTokenBy: got.viewerId }).where(and(eq(quotes.id, q.id), isNull(quotes.viewToken)))
  const [now] = await db.select({ token: quotes.viewToken, at: quotes.viewTokenAt }).from(quotes).where(eq(quotes.id, q.id))
  if (!now?.token || !now.at) return { error: 'Couldn’t make the link — please try again' }
  /* (S42 B-23) made, not yet shared: its Activity line waits for the first Copy link or Send via WhatsApp (`noteQuoteViewShared`), and a
     dialog closed before either takes the link away again (`dropUnsharedQuoteView`) — never a live public link nobody sent */
  touch(q, now.token)
  return { token: now.token, at: now.at.getTime(), made: now.token === token }
}

/** (S42 B-23) Whether the live link was shared since it was made — its "made" line is on the lead. */
async function sharedSince(q: { id: string; leadId: string; viewTokenAt: Date | null }): Promise<boolean> {
  if (!q.viewTokenAt) return false
  const [hit] = await db.select({ id: leadEvents.id }).from(leadEvents)
    .where(and(eq(leadEvents.leadId, q.leadId), eq(leadEvents.kind, 'parity_s02_quote_view_shared'), sql`json_extract(${leadEvents.detail}, '$.id') = ${q.id}`, gte(leadEvents.at, new Date(q.viewTokenAt.getTime() - 1000)))).limit(1)
  return !!hit
}
/** (S42 B-23) The first Copy link or Send via WhatsApp of a link: the moment it is shared, its line goes on the lead (once). */
export async function noteQuoteViewShared(quoteId: string, token: string): Promise<Refusal | { ok: true }> {
  const got = await forQuote(quoteId); if ('error' in got) return got
  const { q } = got
  if (!q.viewToken || q.viewToken !== token) return { error: 'This view-only link was stopped' }
  if (!(await sharedSince(q))) { await logLeadEvent(db, q.leadId, 'parity_s02_quote_view_shared', { id: q.id, title: q.number }); revalidateLead(q.leadId) }
  return { ok: true }
}
/** (S42 B-23) The Share dialog closed before the link was copied or sent: a link this press made goes again — nothing was shared, nothing is said. */
export async function dropUnsharedQuoteView(quoteId: string, token: string): Promise<Refusal | { ok: true }> {
  const got = await forQuote(quoteId); if ('error' in got) return got
  const { q } = got
  if (!q.viewToken || q.viewToken !== token || (await sharedSince(q))) return { ok: true }
  await db.update(quotes).set({ viewToken: null, viewTokenAt: null, viewTokenBy: null }).where(and(eq(quotes.id, q.id), eq(quotes.viewToken, token)))
  touch(q, token)
  return { ok: true }
}

/** Stop: the address no longer opens (it says so in the studio's name). Answers what Undo needs to put it back. */
export async function stopQuoteView(quoteId: string): Promise<Refusal | { token: string; at: number; by: string | null; eventId: string }> {
  const got = await forQuote(quoteId); if ('error' in got) return got
  const { q } = got
  if (!q.viewToken || !q.viewTokenAt) return { error: 'This quote has no view-only link' }
  await db.update(quotes).set({ viewToken: null, viewTokenAt: null, viewTokenBy: null }).where(and(eq(quotes.id, q.id), eq(quotes.viewToken, q.viewToken)))
  const eventId = await logLeadEvent(db, q.leadId, 'parity_s02_quote_view_stopped', { id: q.id, title: q.number })
  touch(q, q.viewToken)
  return { token: q.viewToken, at: q.viewTokenAt.getTime(), by: q.viewTokenBy, eventId }
}

/** Stop's Undo: the same address opens again — unless a new link was made since (then the new one stays). */
export async function reopenQuoteView(quoteId: string, o: { token: string; at: number; by: string | null; eventId: string }): Promise<Refusal | { token: string }> {
  const got = await forQuote(quoteId); if ('error' in got) return got
  const { q } = got
  if (!isViewToken(o.token)) return { error: 'That link can’t be put back' }
  if (q.viewToken) return q.viewToken === o.token ? { token: o.token } : { error: 'A new view-only link was made since — that one stays' }
  await db.update(quotes).set({ viewToken: o.token, viewTokenAt: new Date(o.at), viewTokenBy: o.by }).where(and(eq(quotes.id, q.id), isNull(quotes.viewToken)))
  await dropLeadEvents([o.eventId])
  touch(q, o.token)
  return { token: o.token }
}

/** The open page's poll (no session — the token is the permission): the quote's stamp, or `gone` once the link no longer opens. */
export async function readQuoteViewStamp(token: string): Promise<{ stamp: number; at: number } | { gone: true }> {
  const hit = await quoteByViewToken(String(token))
  return hit ? await viewStampOf(hit.quoteId) : { gone: true }
}
