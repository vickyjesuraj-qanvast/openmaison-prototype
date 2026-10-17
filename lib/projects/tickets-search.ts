import 'server-only'
import { and, eq, isNull, like, or } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leads, projectTickets, projects } from '@/lib/db/schema'
import { titleCaseName } from '@/lib/format'
import { STATUS_WORDS, isTicketStatus } from './tickets-model'

/**
 * (gaps build H — H-Q26) The studio search's tickets: by number, subject, words or category, on a project the viewer sees (Who sees leads —
 * the caller's `seesLead`). Each opens on its project's Tickets tab (`?open=`).
 */
export type TicketHit = { kind: 'ticket'; id: string; title: string; sub: string; chip: string | null; href: string; icon: string; others: (string | null)[] }
export async function ticketHits(key: string, seesLead: (leadId: string) => boolean): Promise<TicketHit[]> {
  const k = `%${key.trim().split(/\s+/)[0] ?? key}%`
  const rows = await db.select({ t: projectTickets, project: projects.name, client: leads.name }).from(projectTickets)
    .innerJoin(projects, eq(projects.id, projectTickets.projectId)).innerJoin(leads, eq(leads.id, projects.leadId))
    .where(and(isNull(projects.deletedAt), isNull(leads.deletedAt), or(like(projectTickets.number, k), like(projectTickets.subject, k), like(projectTickets.body, k), like(projectTickets.category, k), like(leads.name, k), like(projects.name, k))))
    .limit(60)
  return rows.filter((r) => seesLead(r.t.leadId)).map((r) => ({
    kind: 'ticket', id: r.t.id, title: `${r.t.number} · ${r.t.subject}`, sub: [titleCaseName(r.client), r.project, r.t.category].filter(Boolean).join(' · '),
    chip: isTicketStatus(r.t.status) ? STATUS_WORDS[r.t.status] : null, href: `/projects/${r.t.projectId}/tickets?open=${encodeURIComponent(r.t.id)}`, icon: 'handyman',
    others: [r.t.body, r.t.category, r.client, r.project],
  }))
}
