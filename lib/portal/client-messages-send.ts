import 'server-only'
import { and, eq, gt, isNull, like } from 'drizzle-orm'
import { db } from '@/lib/db'
import { homeownerHouseholdLinks, homeownerLeadLinks, homeownerProfiles, leadAssignees, leads, members, notificationOutbox, projects, settings } from '@/lib/db/schema'
import { siteConfig } from '@/lib/config'
import { titleCaseName } from '@/lib/format'
import { deliver } from '@/lib/notifications/delivery'
import { fetchStudio } from '@/lib/settings/queries'
import { shortStudioName } from '@/lib/settings/types'
import { CLIENT_MESSAGES_KEY, DEFAULT_CLIENT_RULES, MESSAGE_GAP_MINUTES, clientEventDef, clientTemplateFor, composeClient, parseClientMessages, type ClientChannel, type ClientEvent, type ClientMessageRules } from './client-messages'
import { firstName, portalPath } from './model'
import { currentPortalSlug, fetchPortalSettings, placeOf } from './queries'
import { fetchPortalSections } from './sections-queries'

/*
 * (gaps build H — H-Q17…H-Q19) Telling the client, by itself. A sender (an invoice sent, a payment confirmed, an agreement out for signature, a
 * schedule shared, an update published, an issue answered, a message from the team) calls `tellClient` after its own write; the message goes
 * through E's delivery layer to everyone the home's portal is open to — the client and the household people invited, not withdrawn — on the
 * channels Settings › Notifications › Messages to clients keeps on, with the link to the thing on their portal. Nothing goes while the portal
 * is paused, for a section switched off, or to a client never invited (the studio's own WhatsApp covers them, REG-1056). It never throws:
 * a failure is the outbox's row, and the action that raised it carries on.
 */

export async function fetchClientMessageRules(): Promise<ClientMessageRules> {
  const [row] = await db.select().from(settings).where(eq(settings.key, CLIENT_MESSAGES_KEY)).limit(1)
  if (!row) return DEFAULT_CLIENT_RULES
  try { return parseClientMessages(JSON.parse(row.value)) } catch { return DEFAULT_CLIENT_RULES }
}
export async function saveClientMessageRules(r: ClientMessageRules): Promise<void> {
  const value = JSON.stringify(r)
  const updatedAt = new Date()
  await db.insert(settings).values({ key: CLIENT_MESSAGES_KEY, value, updatedAt }).onConflictDoUpdate({ target: settings.key, set: { value, updatedAt } })
}

type Person = { homeownerId: string; name: string; email: string | null; phone: string | null }
/** Everyone the lead's portal is open to: the client (their profile's email, else the lead's), then the household people invited. */
async function peopleOf(leadId: string): Promise<Person[]> {
  const [own, house, [lead]] = await Promise.all([
    db.select({ id: homeownerProfiles.id, name: homeownerProfiles.name, email: homeownerProfiles.email, phone: homeownerProfiles.phone }).from(homeownerLeadLinks)
      .innerJoin(homeownerProfiles, eq(homeownerProfiles.id, homeownerLeadLinks.homeownerId))
      .where(and(eq(homeownerLeadLinks.leadId, leadId), isNull(homeownerLeadLinks.withdrawnAt))).then((r) => r.filter(Boolean)),
    db.select({ id: homeownerProfiles.id, name: homeownerProfiles.name, email: homeownerProfiles.email, phone: homeownerProfiles.phone, invitedAt: homeownerHouseholdLinks.invitedAt }).from(homeownerHouseholdLinks)
      .innerJoin(homeownerProfiles, eq(homeownerProfiles.id, homeownerHouseholdLinks.homeownerId))
      .where(and(eq(homeownerHouseholdLinks.leadId, leadId), isNull(homeownerHouseholdLinks.withdrawnAt), isNull(homeownerHouseholdLinks.removedAt))),
    db.select({ email: leads.email, invitedAt: homeownerLeadLinks.invitedAt }).from(leads).leftJoin(homeownerLeadLinks, eq(homeownerLeadLinks.leadId, leads.id)).where(eq(leads.id, leadId)).limit(1),
  ])
  const out: Person[] = []
  if (lead?.invitedAt) for (const o of own) out.push({ homeownerId: o.id, name: titleCaseName(o.name), email: o.email ?? lead.email ?? null, phone: o.phone })
  for (const h of house) if (h.invitedAt && !out.some((p) => p.homeownerId === h.id)) out.push({ homeownerId: h.id, name: titleCaseName(h.name), email: h.email, phone: h.phone })
  return out
}

/** (simplify round 3, the owner's "you decide" 2026-10-10) Why `tellClient` would reach nobody for this event on this lead — its rule, read
    without sending: the event off on both channels, the portal paused, the event's portal section off, no one invited; null when someone hears. */
export async function whyClientWontHear(leadId: string, event: ClientEvent): Promise<'off' | 'paused' | 'section' | 'not-invited' | null> {
  const def = clientEventDef(event)
  if (!def) return 'off'
  const rules = await fetchClientMessageRules()
  if (!rules.channels[event].email && !rules.channels[event].whatsapp) return 'off'
  const [portal, sections] = await Promise.all([fetchPortalSettings(), fetchPortalSections()])
  if (portal.paused) return 'paused'
  if (def.section && !sections[def.section]) return 'section'
  return (await peopleOf(leadId)).length ? null : 'not-invited'
}

export type ClientSend = {
  event: ClientEvent
  leadId: string
  /** the record this message is about — with the event and the person, what keeps it from going twice */
  ref: string
  /** where it opens on their portal, after /my/<address>/ — "money?open=…", "issues?open=…" */
  path: string
  /** the event's own fields ({invoice}, {amount}, {document}, {update}, {ticket}, {subject}, {sender}, {message}) */
  fields: Record<string, string>
  /** the plain words, should a studio's template name a field this send can't fill */
  plain: { title: string; line: string }
}

/** Send the event's messages. Answers how many went (the prototype's adapter records them as sent). (simplify round 2, R2-C) Inside an Undo's
    window (`holdClientMail`, lib/notifications/delivery.ts) they are held until it passes — counted here as going; the Undo takes them back. */
export async function tellClient(s: ClientSend): Promise<number> {
  try {
    const def = clientEventDef(s.event)
    if (!def) return 0
    const rules = await fetchClientMessageRules()
    const channels = (['email', 'whatsapp'] as ClientChannel[]).filter((c) => rules.channels[s.event][c])
    if (!channels.length) return 0
    const [portal, sections] = await Promise.all([fetchPortalSettings(), fetchPortalSections()])
    if (portal.paused || (def.section && !sections[def.section])) return 0
    const people = await peopleOf(s.leadId)
    if (!people.length) return 0
    const [slug, studio, [project], team] = await Promise.all([
      currentPortalSlug(), fetchStudio(),
      db.select({ id: projects.id, name: projects.name, address: leads.propertyAddress }).from(leads).leftJoin(projects, and(eq(projects.leadId, leads.id), isNull(projects.deletedAt))).where(eq(leads.id, s.leadId)).limit(1),
      db.select({ name: members.name }).from(leadAssignees).innerJoin(members, eq(members.id, leadAssignees.memberId)).where(eq(leadAssignees.leadId, s.leadId)).limit(1),
    ])
    const link = `${siteConfig.url.replace(/\/$/, '')}${portalPath(slug, s.path)}`
    const base: Record<string, string> = {
      '{studio}': shortStudioName(studio.name), '{link}': link, '{project}': project?.name || placeOf(project?.address) || 'your home',
      ...(team[0] ? { '{designer}': firstName(team[0].name) } : {}), ...s.fields,
    }
    let sent = 0
    for (const p of people) {
      /* a message from the team: at most one an hour to each person on this conversation (H-Q17) */
      if (s.event === 'client_message') {
        const since = new Date(Date.now() - MESSAGE_GAP_MINUTES * 60_000)
        const [recent] = await db.select({ id: notificationOutbox.id }).from(notificationOutbox)
          .where(and(like(notificationOutbox.key, `c:client_message:${project?.id ?? s.leadId}:%:${p.homeownerId}:%`), gt(notificationOutbox.createdAt, since))).limit(1)
        if (recent) continue
      }
      const fields = { ...base, '{client}': firstName(p.name) }
      for (const channel of channels) {
        const msg = composeClient(channel, clientTemplateFor(rules.templates, s.event, channel), fields, s.plain)
        const key = s.event === 'client_message' ? `c:client_message:${project?.id ?? s.leadId}:${s.ref}:${p.homeownerId}:${channel}` : `c:${s.event}:${s.ref}:${p.homeownerId}:${channel}`
        const st = await deliver({ key, event: s.event, channel, to: { memberId: null, name: p.name, email: p.email, phone: p.phone }, subject: msg.subject, body: msg.body, href: link, leadId: s.leadId, notificationId: null })
        if (st === 'sent' || st === 'held') sent++   // (simplify round 2) held = it goes once its Undo's window passes
      }
    }
    return sent
  } catch { return 0 }
}
