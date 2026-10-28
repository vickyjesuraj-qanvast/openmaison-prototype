'use server'

import { and, eq, isNull, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leadAssignees, leadEvents, leads, quotes } from '@/lib/db/schema'
import { titleCaseName } from '@/lib/format'
import { logLeadEvent } from '@/lib/leads/events'
import { revalidateLead } from '@/lib/leads/queries'
import { canOpenLead, fetchViewer } from '@/lib/leads/visibility'
import { worksOn } from '@/lib/projects/policy'
import { workspaceRefusal } from '@/lib/settings/desk'
import { sessionMemberId } from '@/lib/db/session'
import { quoteReminderKey } from './remind'

/*
 * (the Dashboard redesigned 2026-10-26 — his marks P-01 · P-10 · lane D4) **A client reminded about a quote**, kept. The reminder itself is the
 * quote screen's own (its Remind words, lib/quotes/next-step.ts `reminderMessage`), drafted and opened in WhatsApp on the press — the studio sends
 * it; nothing changes on the quote. This keeps that it went, as Client access keeps its reminders (app/portal/remind-actions.ts): a line on the
 * client's Activity — "Dane reminded Ryan D’Souza on WhatsApp: “Variation order VO-2”." — so the team sees who nudged them and when, and the
 * docked field stops offering it for two days (lib/maison-ai/remind.ts). Undo takes the line back, for the one who wrote it, while it is fresh.
 * Who may: whoever works on the lead (`worksOn` — its members, their Manager, Owners and Admins), never Marketing (`workspaceRefusal`).
 */
type Refusal = { error: string }
const UNDO_WINDOW_MS = 15 * 60_000

export async function recordQuoteReminder(input: { quoteId: string }): Promise<{ eventId: string; at: number } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }
  const quoteId = String(input?.quoteId ?? '')
  const viewer = await fetchViewer()
  const [q] = await db.select({ id: quotes.id, leadId: quotes.leadId, number: quotes.number, status: quotes.status, kind: quotes.kind, name: leads.name }).from(quotes)
    .innerJoin(leads, eq(leads.id, quotes.leadId)).where(and(eq(quotes.id, quoteId), isNull(quotes.deletedAt), isNull(leads.deletedAt))).limit(1)
  if (!q) return { error: 'This quote was deleted' }
  if (!(await canOpenLead(viewer, q.leadId))) return { error: 'This lead isn’t one you can open' }
  const team = await db.select({ id: leadAssignees.memberId }).from(leadAssignees).where(eq(leadAssignees.leadId, q.leadId))
  if (!worksOn(viewer, team.map((t) => t.id))) return { error: 'Only the lead’s members, their Manager, Owners and Admins remind the client' }
  if (q.status !== 'Sent to Client') return { error: `${q.number} isn’t waiting on the client any more` }
  const title = `${q.kind === 'variation' ? 'Variation order' : 'Quote'} ${q.number}`
  const eventId = await logLeadEvent(db, q.leadId, 'portal_reminded', { id: quoteReminderKey(q.id), title, name: titleCaseName(q.name) })
  revalidateLead(q.leadId)
  return { eventId, at: Date.now() }
}

/** Undo: the reminder's line comes off the client's Activity — the one who kept it, within a quarter of an hour. The WhatsApp message itself is
    the studio's, in WhatsApp; only the record of it is taken back. */
export async function undoQuoteReminder(input: { eventId: string }): Promise<{ ok: true } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }
  const eventId = String(input?.eventId ?? '')
  const me = await sessionMemberId()
  const [e] = await db.select({ id: leadEvents.id, leadId: leadEvents.leadId, actorId: leadEvents.actorId, at: leadEvents.at, kind: leadEvents.kind }).from(leadEvents)
    .where(and(eq(leadEvents.id, eventId), eq(leadEvents.kind, 'portal_reminded'), sql`json_extract(${leadEvents.detail}, '$.id') like 'quote:%'`)).limit(1)
  if (!e) return { error: 'That reminder isn’t on the Activity any more' }
  if (e.actorId !== me) return { error: 'Only the one who reminded them can take it back' }
  if (Date.now() - e.at.getTime() > UNDO_WINDOW_MS) return { error: 'It was kept a while ago — it stays on the Activity' }
  await db.delete(leadEvents).where(eq(leadEvents.id, e.id))
  revalidateLead(e.leadId)
  return { ok: true }
}
