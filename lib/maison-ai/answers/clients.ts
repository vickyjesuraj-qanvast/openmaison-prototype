import 'server-only'
import { and, desc, eq, inArray, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { homeownerLeadLinks, homeownerProfiles, leads, portalSessions, projectTickets, projects } from '@/lib/db/schema'
import { visibleLeadIds } from '@/lib/leads/visibility'
import { displayDayMonth, titleCaseName } from '@/lib/format'
import type { MaisonAnswer, MaisonRow } from '@/lib/maison-ai'
import { ON_LEADS, go, plural, row, type Ctx } from './common'

/*
 * (pending modules S10 — card held:maison-ai, "words-only suggestions … Company › Client portal set-up · Qanvast Ops" made to act) The Ask box's
 * answers about the client's side, by rule from the records: how clients sign in (the portal's own rule — a phone and a six-digit code, a
 * stand-in until sign-in exists), what they see (Company › Client portal's switches), who opened their portal (its sessions), the issues they
 * raised (Tickets). Who sees leads holds. *(invented copy: every title and line here)*
 */

const DAY = 86_400_000

export async function portalSignInAnswer(c: Ctx): Promise<MaisonAnswer> {
  const { fetchPortalSetup } = await import('@/lib/portal/queries')
  const s = await fetchPortalSetup()
  return { title: 'How clients sign in', text: `At /my/${s.slug}, with the mobile number on their lead and a six-digit code sent to it (in this demo, any six digits — real codes come with sign-in). A client sees their portal once you invite them from their lead’s Invite to Portal.`,
    rows: [
      row(c, 'clients', `${plural(s.clients.length, 'client')} invited`, 'Company › Client portal › Clients', '/company/portal/clients'),
      ...(s.sample ? [row(c, 'test', `See it as ${s.sample.client}`, 'Open as a test client — read-only', '/company/portal')] : []),
    ],
    link: { label: 'Open Company › Client portal', href: go(c, '/company/portal') } }
}

export async function portalSeesAnswer(c: Ctx): Promise<MaisonAnswer> {
  const { fetchPortalSetup } = await import('@/lib/portal/queries')
  const { PORTAL_SECTIONS } = await import('@/lib/portal/sections')
  const s = await fetchPortalSetup()
  const on = PORTAL_SECTIONS.filter((x) => s.sections[x.key])
  const rows: MaisonRow[] = PORTAL_SECTIONS.map((x) => row(c, x.key, `${x.name} · ${s.sections[x.key] ? 'On' : 'Off'}`, x.line, null))
  return { title: 'What a client sees', text: `${plural(on.length, 'section')} of ${PORTAL_SECTIONS.length} are on. Before work starts the Schedule is empty until you share it, Updates until one is published, and Money shows the payment schedule from the signed quote.`,
    rows, link: { label: 'Open Company › Client portal', href: go(c, '/company/portal') } }
}

export async function portalOpenedAnswer(c: Ctx): Promise<MaisonAnswer> {
  if (c.acct) return { title: 'Not for Accounting', text: ON_LEADS }
  const since = c.now - 7 * DAY
  const visible = await visibleLeadIds(c.viewer)
  const sessions = await db.select({ homeownerId: portalSessions.homeownerId, at: portalSessions.lastSeenAt, created: portalSessions.createdAt })
    .from(portalSessions).where(eq(portalSessions.kind, 'client')).orderBy(desc(portalSessions.createdAt))
  const thisWeek = sessions.filter((x) => Math.max(x.at?.getTime() ?? 0, x.created.getTime()) >= since)
  /* none this week: the last visits, so the answer still says who was there and when */
  const recent = thisWeek.length ? thisWeek : sessions.slice(0, 20)
  const who = recent.length ? await db.select({ homeownerId: homeownerLeadLinks.homeownerId, leadId: homeownerLeadLinks.leadId, name: homeownerProfiles.name, lead: leads.name })
    .from(homeownerLeadLinks).innerJoin(homeownerProfiles, eq(homeownerProfiles.id, homeownerLeadLinks.homeownerId)).innerJoin(leads, eq(leads.id, homeownerLeadLinks.leadId))
    .where(and(inArray(homeownerLeadLinks.homeownerId, [...new Set(recent.map((x) => x.homeownerId))]), isNull(leads.deletedAt))) : []
  const byPerson = new Map<string, { name: string; leadId: string; last: number; times: number }>()
  for (const x of recent) {
    const w = who.find((y) => y.homeownerId === x.homeownerId && (!visible || visible.has(y.leadId)))
    if (!w) continue
    const at = Math.max(x.at?.getTime() ?? 0, x.created.getTime())
    const p = byPerson.get(x.homeownerId)
    byPerson.set(x.homeownerId, { name: titleCaseName(w.name || w.lead), leadId: w.leadId, last: Math.max(p?.last ?? 0, at), times: (p?.times ?? 0) + 1 })
  }
  const list = [...byPerson.values()].sort((a, b) => b.last - a.last)
  /* (S42 D-14) the window is the last 7 days — a visit on last Wednesday is not "this week" on a Wednesday */
  if (!list.length) return { title: 'No client opened their portal in the last 7 days', text: 'A client’s visits to their portal show here.', link: { label: 'Open Company › Client portal', href: go(c, '/company/portal/clients') } }
  const proj = await db.select({ id: projects.id, leadId: projects.leadId }).from(projects).where(and(inArray(projects.leadId, list.map((x) => x.leadId)), isNull(projects.deletedAt)))
  return { title: thisWeek.length ? `${plural(list.length, 'client')} opened their portal in the last 7 days` : 'No client opened their portal in the last 7 days', text: thisWeek.length ? 'The most recent first — open one to see what waits for them.' : 'The last visits — open one to see what waits for them.',
    rows: list.slice(0, 10).map((x) => { const p = proj.find((y) => y.leadId === x.leadId); return row(c, x.leadId, x.name, `Last ${displayDayMonth(new Date(x.last))}${thisWeek.length ? ` · ${plural(x.times, 'visit')}` : ''}`, p ? `/projects/${p.id}` : `/leads/${x.leadId}`) }) }
}

export async function issuesAnswer(c: Ctx): Promise<MaisonAnswer> {
  if (c.acct) return { title: 'Not for Accounting', text: ON_LEADS }
  const since = c.now - 7 * DAY
  const visible = await visibleLeadIds(c.viewer)
  const rows = (await db.select({ id: projectTickets.id, projectId: projectTickets.projectId, leadId: projectTickets.leadId, number: projectTickets.number, subject: projectTickets.subject, status: projectTickets.status, by: projectTickets.raisedByName, kind: projectTickets.raisedKind, at: projectTickets.createdAt, project: projects.name })
    .from(projectTickets).innerJoin(projects, eq(projects.id, projectTickets.projectId)).where(isNull(projects.deletedAt)).orderBy(desc(projectTickets.createdAt)))
    .filter((t) => (!visible || visible.has(t.leadId)))
  const week = rows.filter((t) => t.at.getTime() >= since)
  const open = rows.filter((t) => t.status === 'open' || t.status === 'in_progress')
  const list = week.length ? week : open
  if (!list.length) return { title: 'No issue reported in the last 7 days', text: 'Nothing raised in the last 7 days, and none is open.', link: { label: 'Open Tickets', href: go(c, '/projects/tickets') } }
  return { title: week.length ? `${plural(week.length, 'issue')} reported in the last 7 days` : `None in the last 7 days — ${plural(open.length, 'issue')} still open`, text: 'Open one to answer it or mark it resolved.',
    rows: list.slice(0, 10).map((t) => row(c, t.id, `${t.number} · ${t.subject}`, `${t.project} · ${t.kind === 'client' ? `by ${t.by}` : 'raised by the studio'} · ${displayDayMonth(t.at)} · ${t.status.replace('_', ' ')}`, `/projects/${t.projectId}/tickets?open=${encodeURIComponent(t.id)}`)),
    link: { label: 'Open Tickets', href: go(c, '/projects/tickets') } }
}

/** (Qanvast Ops › Studios) OpenMaison's side: which studios' clients use the portal — the prototype runs one studio. */
export async function studiosPortalAnswer(c: Ctx): Promise<MaisonAnswer> {
  const { fetchStudio } = await import('@/lib/settings/queries')
  const studio = await fetchStudio()
  const since = c.now - 30 * DAY
  const sessions = (await db.select({ homeownerId: portalSessions.homeownerId, at: portalSessions.createdAt }).from(portalSessions).where(eq(portalSessions.kind, 'client'))).filter((x) => x.at.getTime() >= since)
  return { title: `${studio.name}: ${plural(new Set(sessions.map((x) => x.homeownerId)).size, 'client')} on the portal`, text: `The last 30 days — ${plural(sessions.length, 'visit')}. The prototype runs one studio; a real Qanvast Ops ranks every studio the same way.`,
    rows: [row(c, 'studio', studio.name, `${plural(sessions.length, 'portal visit')} in 30 days`, '/qanvast-ops/studios')] }
}
