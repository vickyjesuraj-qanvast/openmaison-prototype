import 'server-only'
import { and, desc, eq, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { contracts } from '@/lib/db/schema'

/** (REG-632, contracts parity Q-09) The contract raised from this quote — a Signed one first, else the newest — and who signed it. */
export type QuoteContract = { id: string; title: string; status: string; signer: string | null }
/** (REG-632, contracts parity Q-09) The contract raised from a quote: a Signed one first, else the newest live one; its signer is the name typed online, else the recipient. */
export async function fetchQuoteContract(quoteId: string): Promise<QuoteContract | null> {
  const rows = await db.select({ id: contracts.id, title: contracts.title, status: contracts.status, signedBy: contracts.signedBy, recipientName: contracts.recipientName, createdAt: contracts.createdAt })
    .from(contracts).where(and(eq(contracts.fromQuoteId, quoteId), isNull(contracts.deletedAt), isNull(contracts.archivedAt))).orderBy(desc(contracts.createdAt))
  const c = rows.find((r) => r.status === 'Signed') ?? rows[0]
  return c ? { id: c.id, title: c.title, status: c.status, signer: c.status === 'Signed' ? c.signedBy ?? c.recipientName : null } : null
}
