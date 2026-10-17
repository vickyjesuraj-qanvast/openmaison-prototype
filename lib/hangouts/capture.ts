import 'server-only'
import { randomBytes, randomUUID } from 'node:crypto'
import { and, eq, inArray, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { hangoutDesigners, hangoutMeetings, hangoutParticipations, hangoutRegistrations, leadAssignees, leads, members, type HangoutEvent, type HangoutShift } from '@/lib/db/schema'
import { importLeads } from '@/app/leads/actions'
import { revalidateLead } from '@/lib/leads/queries'
import { phoneDigits, titleCaseName } from '@/lib/format'
import { siteConfig } from '@/lib/config'
import { deliver } from '@/lib/notifications/delivery'
import { fetchClientMessageRules } from '@/lib/portal/client-messages-send'
import { clientTemplateFor, composeClient } from '@/lib/portal/client-messages'
import { BUDGET_BANDS, computeMatchScore, firstName, hangoutOwnPath, parseStudioPrefs, pickDesigner, shiftLine, tableFor, type HomeownerPrefs } from './model'

/*
 * (pending modules S27 — Hangouts) A homeowner who books a chat with the studio at a Hangout — on the studio's page or at its table — always
 * arrives as one of the studio's leads, through the house capture path (lib/leads: one row imported to the listing, source Hangout, as the
 * website form, Meta and the webhooks arrive — app/leads/capture-actions.ts): a number the studio already has is that lead, never a second one.
 * Nothing here pretends a network of homeowners: every booking is a person who gave the studio their number.
 */

export const newToken = () => randomBytes(18).toString('base64url')
const json = (v: string | null | undefined): string[] => { try { const a = v ? JSON.parse(v) : []; return Array.isArray(a) ? a.filter((x): x is string => typeof x === 'string') : [] } catch { return [] } }

/** The live lead a number already is (not deleted) — the newest. */
export async function leadByPhone(phone: string): Promise<{ id: string; name: string } | null> {
  const want = phoneDigits(phone)
  if (!want) return null
  const rows = await db.select({ id: leads.id, name: leads.name, phone: leads.phone, createdAt: leads.createdAt }).from(leads).where(and(isNull(leads.deletedAt), eq(leads.direct, false)))
  const hit = rows.filter((l) => phoneDigits(l.phone) === want).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0]
  return hit ? { id: hit.id, name: hit.name } : null
}

/** A new lead from a booking — the house capture path (a one-row import into the listing), source Hangout, with what they told the studio. */
async function captureBooking(eventName: string, b: { name: string; phone: string; email: string | null; prefs: HomeownerPrefs; note: string | null }): Promise<string | null> {
  const headers = ['Lead Name', 'Lead Phone Number', 'Lead Email', 'Lead Source', 'Property Type', 'Estimated Budget (S$)', 'District', 'Style', 'Key Collection', 'Condition', 'Remarks']
  const budget = BUDGET_BANDS.find((x) => x.key === b.prefs.budget)
  const row = [b.name, b.phone, b.email ?? '', 'Hangout', b.prefs.propertyType ?? '', budget ? String(Math.round(budget.minor / 100)) : '', b.prefs.area ?? '', b.prefs.styles[0] ?? '',
    b.prefs.keys ?? '', b.prefs.status ?? '', [`Booked a chat at ${eventName}.`, b.prefs.styles.length > 1 ? `Styles: ${b.prefs.styles.join(', ')}.` : '', b.note ?? ''].filter(Boolean).join(' ')]
  const r = await importLeads({ fileName: `Hangout · ${eventName}`, headers, mapping: headers as never, rows: [row], destination: 'listing' })
  return r.leadIds[0] ?? null
}

export type Booking = { name: string; phone: string; email: string | null; prefs: HomeownerPrefs; shift: HangoutShift; via: 'page' | 'desk'; by: string | null; note?: string | null; designer?: string | null }
export type Booked = { regId: string; token: string; leadId: string; meetingId: string; memberId: string | null; table: number | null; fresh: boolean }

/**
 * Book one homeowner a chat: their lead (the number's, else a new one through the capture path), their registration and its own link, and the
 * chat at the studio's table on that shift — with the designer on it who is furthest below their share (lib/hangouts/model.ts `pickDesigner`),
 * or `designer` when the table says who. 1.0's 0–100 match score is kept on the chat when the studio said who it would like to meet. The lead
 * is given to that designer when nobody holds it yet. A number already booked on this event answers with that booking (`fresh: false`).
 */
export async function bookChat(e: HangoutEvent, b: Booking): Promise<Booked | { error: string }> {
  const phone = phoneDigits(b.phone)
  const [already] = await db.select().from(hangoutRegistrations).where(and(eq(hangoutRegistrations.eventId, e.id), eq(hangoutRegistrations.phone, phone))).limit(1)
  if (already) {
    const [m] = await db.select().from(hangoutMeetings).where(and(eq(hangoutMeetings.registrationId, already.id), isNull(hangoutMeetings.cancelledAt))).limit(1)
    return { regId: already.id, token: already.token, leadId: already.leadId, meetingId: m?.id ?? '', memberId: m?.memberId ?? null, table: m?.tableNumber ?? null, fresh: false }
  }
  const name = titleCaseName(b.name).slice(0, 80)
  const existing = await leadByPhone(phone)
  const leadId = existing?.id ?? await captureBooking(e.name, { name, phone, email: b.email, prefs: b.prefs, note: b.note ?? null })
  if (!leadId) return { error: 'This number is waiting for the studio to look at it — the studio will be in touch' }
  /* who takes it: the table's pick, else the designer on the shift furthest below their share */
  const [plan, booked, [p]] = await Promise.all([
    db.select().from(hangoutDesigners).where(eq(hangoutDesigners.eventId, e.id)),
    db.select({ memberId: hangoutMeetings.memberId }).from(hangoutMeetings).where(and(eq(hangoutMeetings.eventId, e.id), isNull(hangoutMeetings.cancelledAt))),
    db.select().from(hangoutParticipations).where(eq(hangoutParticipations.eventId, e.id)).limit(1),
  ])
  const onShift = plan.filter((d) => json(d.shiftIds).includes(b.shift.id))
  const people = onShift.length ? await db.select({ id: members.id, name: members.name, isActive: members.isActive }).from(members).where(inArray(members.id, onShift.map((d) => d.memberId))) : []
  const cands = onShift.flatMap((d) => { const m = people.find((x) => x.id === d.memberId && x.isActive); return m ? [{ memberId: m.id, name: m.name, sharePct: d.sharePct, onBreak: !!d.onBreakAt, chats: booked.filter((x) => x.memberId === m.id).length }] : [] })
  const memberId = b.designer && cands.some((c) => c.memberId === b.designer) ? b.designer : pickDesigner(cands)
  /* the studio's tables: on each shift its designers take them in turn (lib/hangouts/model.ts `tableFor`) */
  const tables = (() => { try { const t = JSON.parse(p?.tables ?? '[]') as unknown[]; return t.map(Number).filter((n) => Number.isInteger(n) && n > 0) } catch { return [] } })()
  const table = tableFor(tables, onShift.map((d) => d.memberId), memberId)
  const match = computeMatchScore(b.prefs, parseStudioPrefs(p?.preferencesJson))
  const now = new Date()
  const regId = randomUUID(), token = newToken(), meetingId = randomUUID()
  await db.insert(hangoutRegistrations).values({ id: regId, eventId: e.id, leadId, name, phone, email: b.email, preferencesJson: JSON.stringify(b.prefs), shiftId: b.shift.id, via: b.via, token, createdBy: b.by, createdAt: now })
  await db.insert(hangoutMeetings).values({ id: meetingId, eventId: e.id, registrationId: regId, leadId, memberId, shiftId: b.shift.id, tableNumber: table, status: 'scheduled', matchScore: match?.score ?? null,
    assignedBy: memberId ? (b.designer ? b.by : 'rule') : null, assignedAt: memberId ? now : null, createdAt: now, updatedAt: now })
  if (memberId) {
    const holders = await db.select({ memberId: leadAssignees.memberId }).from(leadAssignees).where(eq(leadAssignees.leadId, leadId))
    if (!holders.length) await db.insert(leadAssignees).values({ id: randomUUID(), leadId, memberId, assignedAt: now, assignedBy: b.by }).onConflictDoNothing()
  }
  revalidateLead(leadId)
  return { regId, token, leadId, meetingId, memberId, table, fresh: true }
}

/** The homeowner's own link — by WhatsApp and email through the house outbox (Settings › Notifications › Messages to clients, "A Hangout chat
    is booked"); a real provider is the developers' (`setDeliveryAdapter`). Answers whether anything went. */
export async function sendOwnLink(o: { regId: string; pageToken: string; token: string; leadId: string; name: string; phone: string; email: string | null; studio: string; eventName: string; venue: string; shift: HangoutShift; designer: string | null; dayCount: number }): Promise<boolean> {
  const rules = await fetchClientMessageRules()
  const link = `${siteConfig.url.replace(/\/$/, '')}${hangoutOwnPath(o.pageToken, o.token)}`
  const when = shiftLine({ id: o.shift.id, label: o.shift.label, dayAt: o.shift.dayAt.getTime(), startTime: o.shift.startTime, endTime: o.shift.endTime })
  const fields = { '{client}': firstName(o.name), '{studio}': o.studio, '{designer}': o.designer ? firstName(o.designer) : o.studio, '{event}': o.eventName, '{when}': when, '{where}': o.venue, '{link}': link }
  let went = false
  for (const channel of ['whatsapp', 'email'] as const) {
    if (!rules.channels.client_hangout[channel]) continue
    if (channel === 'email' && !o.email) continue
    const msg = composeClient(channel, clientTemplateFor(rules.templates, 'client_hangout', channel), fields, { title: `Your chat with ${o.studio}`, line: `You’re booked at ${o.eventName}, ${when}, ${o.venue}.` })
    const st = await deliver({ key: `c:client_hangout:${o.regId}:${channel}`, event: 'client_hangout', channel, to: { memberId: null, name: o.name, email: o.email, phone: o.phone }, subject: msg.subject, body: msg.body, href: link, leadId: o.leadId, notificationId: null })
    if (st === 'sent' || st === 'held' || st === 'duplicate') went = true
  }
  if (went) await db.update(hangoutRegistrations).set({ linkSentAt: new Date() }).where(eq(hangoutRegistrations.id, o.regId))
  return went
}
