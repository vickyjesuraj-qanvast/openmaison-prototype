import 'server-only'
import { and, eq, inArray, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leads, projects } from '@/lib/db/schema'

/**
 * (fix-A, A-02) A direct project's client in a lead picker (Create Quote, New Contract, a contract template's sample lead, Quote X-Ray):
 * named with the project's number — "Zed Lim · P-2026-007" — so two clients of the same name never read the same, and what is picked says
 * it is a project's. The client stays pickable: a direct project's quotes and contracts are made this way and listed on its Key documents.
 */
export async function nameDirectClients<T extends { id: string; name: string }>(rows: T[]): Promise<T[]> {
  const ids = rows.map((r) => r.id)
  if (!ids.length) return rows
  const found = await db.select({ leadId: projects.leadId, number: projects.number }).from(projects).innerJoin(leads, eq(leads.id, projects.leadId))
    .where(and(inArray(projects.leadId, ids), eq(leads.direct, true), isNull(projects.deletedAt)))
  const numberOf = new Map(found.map((p) => [p.leadId, p.number]))
  return rows.map((r) => (numberOf.has(r.id) ? { ...r, name: `${r.name} · ${numberOf.get(r.id)}` } : r))
}
