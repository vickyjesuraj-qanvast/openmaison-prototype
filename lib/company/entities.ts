import 'server-only'
import { and, eq, isNull, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { contracts, quotes } from '@/lib/db/schema'
import type { IssuingEntity } from '@/lib/templates/model'

/**
 * (REG-647, settings parity Q-10) Issuing entities keep an id in the brand record; quotes and contracts name the entity they are issued
 * under. What names an entity is counted here — an entity in use is retired, never removed — and a rename is carried to every quote and
 * contract that names it, in the same save, so the records follow the entity (signed contracts keep their own signed letterhead).
 */
export async function fetchEntityUsage(): Promise<Record<string, number>> {
  const [q, c] = await Promise.all([
    db.select({ name: quotes.issuingEntity, n: sql<number>`count(*)` }).from(quotes).where(and(isNull(quotes.deletedAt), sql`${quotes.issuingEntity} is not null`)).groupBy(quotes.issuingEntity),
    db.select({ name: contracts.issuingEntity, n: sql<number>`count(*)` }).from(contracts).where(and(isNull(contracts.deletedAt), sql`${contracts.issuingEntity} is not null`)).groupBy(contracts.issuingEntity),
  ])
  const out: Record<string, number> = {}
  for (const r of [...q, ...c]) if (r.name) out[r.name] = (out[r.name] ?? 0) + Number(r.n)
  return out
}

/** Between the stored entities and the ones being saved: refuse removing one in use; carry renames. Returns the refusal, else null. */
export async function reconcileEntities(before: IssuingEntity[], after: IssuingEntity[]): Promise<string | null> {
  const usage = await fetchEntityUsage()
  const next = new Map(after.map((e) => [e.id, e]))
  for (const [i, e] of before.entries()) {
    if (i === 0) continue
    const now = next.get(e.id)
    if (!now && (usage[e.name] ?? 0) > 0) return `${e.name} is on ${usage[e.name]} ${usage[e.name] === 1 ? 'quote or contract' : 'quotes and contracts'} — retire it instead`
  }
  for (const [i, e] of before.entries()) {
    const now = next.get(e.id)
    if (i === 0 || !now || now.name === e.name) continue
    await db.update(quotes).set({ issuingEntity: now.name }).where(eq(quotes.issuingEntity, e.name))
    await db.update(contracts).set({ issuingEntity: now.name }).where(eq(contracts.issuingEntity, e.name))
  }
  return null
}
