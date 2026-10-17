import 'server-only'   // libSQL never reaches the browser
import { and, eq, isNotNull, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leadAssignees, members, quotes } from '@/lib/db/schema'
import { withYou } from '@/lib/db/session'   // (pending modules S43A) "you" = this request's member
import { livePrepared, withClient, type PreparedSnapshot } from './prepared'
import { GST_RULE_NOW } from './math'   // (S44O — call C3)

/**
 * (pending modules S04) Keeps a quote's preparer in step with where the quote is: the moment it is with its client (sent, confirmed or signed)
 * the paper's preparer is kept as it prints now — once (a second send keeps the first); back before the client (a mark's Undo, Revise) it reads
 * live again. Every write that moves a quote to or from its client calls this after it lands. Idempotent. (S44O — call C3) It stamps the quote's
 * GST rounding at the same moment (`quotes.gst_rule`).
 */
export async function syncPreparedSnapshot(quoteId: string): Promise<void> {
  const [q] = await db.select({ id: quotes.id, leadId: quotes.leadId, status: quotes.status, clientSentAt: quotes.clientSentAt, preparedBy: quotes.preparedBy, preparedJson: quotes.preparedJson })
    .from(quotes).where(eq(quotes.id, String(quoteId))).limit(1)
  if (!q) return
  if (!withClient(q)) {
    if (q.preparedJson) await db.update(quotes).set({ preparedJson: null }).where(and(eq(quotes.id, q.id), isNotNull(quotes.preparedJson)))
    return
  }
  /* (S44O — call C3, her UAT ask 2026-10-15) and its GST's rounding, stamped as it first goes to the client — the figure it went out with never
     moves if the rule does. Unlike the preparer it is never cleared: a revision keeps the rounding its client has already read. */
  await db.update(quotes).set({ gstRule: GST_RULE_NOW }).where(and(eq(quotes.id, q.id), isNull(quotes.gstRule)))
  if (q.preparedJson) return
  const [team, assignees] = await Promise.all([
    db.select().from(members).then(withYou),
    db.select({ memberId: leadAssignees.memberId }).from(leadAssignees).where(eq(leadAssignees.leadId, q.leadId)),
  ])
  const kept: PreparedSnapshot = { ...livePrepared({ preparedBy: q.preparedBy, members: team, teamIds: assignees.map((a) => a.memberId) }), at: Date.now() }
  /* the compare-and-set: two sends at once keep one */
  await db.update(quotes).set({ preparedJson: JSON.stringify(kept) }).where(and(eq(quotes.id, q.id), isNull(quotes.preparedJson)))
}
