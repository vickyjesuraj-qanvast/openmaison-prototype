import 'server-only'
import { and, eq, inArray } from 'drizzle-orm'
import { db } from '@/lib/db'
import { stageLogs, type Quote } from '@/lib/db/schema'

/**
 * (UX audit Q5) The day each quote went to the client — the Quotes lists' "Sent to client" column and their "Waiting on client" chip. The
 * quote's own stamp (`client_sent_at`, REG-624) first; a quote the client holds (sent, confirmed, signed) from before that stamp existed, its first send; and
 * an Approved quote its lead's Quote Sent step sent (the Move stage window picks one approved system quote, REG-469 — its log names it by
 * title), the day of that step. Anything else has not gone to the client.
 */
export async function sentToClientDates(rows: Pick<Quote, 'id' | 'leadId' | 'title' | 'status' | 'sentAt' | 'clientSentAt'>[]): Promise<Map<string, Date | null>> {
  const out = new Map<string, Date | null>()
  const viaStep = rows.filter((q) => !q.clientSentAt && q.status === 'Approved')
  const logs = viaStep.length ? await db.select({ leadId: stageLogs.leadId, payload: stageLogs.payload, createdAt: stageLogs.createdAt }).from(stageLogs)
    .where(and(eq(stageLogs.toStage, 'Quote Sent'), inArray(stageLogs.leadId, [...new Set(viaStep.map((q) => q.leadId))]))) : []
  const picked = (payload: unknown): string | null => {
    try {
      const p = (typeof payload === 'string' ? JSON.parse(payload) : payload ?? {}) as { quoteTab?: unknown; quoteSelected?: unknown }
      return p.quoteTab === 'system' && typeof p.quoteSelected === 'string' ? p.quoteSelected : null
    } catch { return null }
  }
  for (const q of rows) {
    if (q.clientSentAt) { out.set(q.id, q.clientSentAt); continue }
    if (q.status === 'Sent to Client' || q.status === 'Confirmed' || q.status === 'Signed') { out.set(q.id, q.sentAt); continue }
    if (q.status === 'Approved') {
      const hit = logs.filter((l) => l.leadId === q.leadId && picked(l.payload) === q.title).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0]
      out.set(q.id, hit?.createdAt ?? null); continue
    }
    out.set(q.id, null)
  }
  return out
}
