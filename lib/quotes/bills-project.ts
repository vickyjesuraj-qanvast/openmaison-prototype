import 'server-only'
import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { projects } from '@/lib/db/schema'
import { fetchStudio } from '@/lib/settings/queries'

/**
 * (S44I — S43D's NB-06; 1.0's INV-051) The project a quote is the base of — it bills its invoices from that quote, issued from the quote's
 * issuing entity — and the rule that keeps the entity: "It bills P-2026-001’s invoices — they are issued from Demo Studio Pte Ltd"
 * (invented copy). Null for a quote no project bills from.
 */
export async function billsProjectOf(q: { id: string; issuingEntity: string | null }): Promise<{ number: string; from: string; rule: string } | null> {
  const [p] = await db.select({ number: projects.number }).from(projects).where(and(eq(projects.quoteId, q.id), isNull(projects.deletedAt))).limit(1)
  if (!p) return null
  const from = q.issuingEntity ?? (await fetchStudio()).name
  return { number: p.number, from, rule: `It bills ${p.number}’s invoices — they are issued from ${from}` }
}
