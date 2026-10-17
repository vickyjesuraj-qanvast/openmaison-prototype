import 'server-only'
import { and, eq, inArray, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { projects, quoteItems, quotes } from '@/lib/db/schema'
import { fetchViewer } from '@/lib/leads/visibility'
import { seesProfit } from '@/lib/settings/cost-visibility'
import { isApprovedVariation } from '@/lib/projects/money'
import { parseDiscounts, quoteTotals } from '@/lib/quotes/math'
import { profitsFor } from './books'
import { closingNumbersOf, type ClosingNumbers } from './profit'

/* the arithmetic and its type live in lib/finance/profit.ts (pure, client-safe): `closingNumbersOf` · `ClosingNumbers` · `MARGIN_GAP_PTS` */
export type { ClosingNumbers } from './profit'

/**
 * (parity map, PR-122 · PR-123 — 1.0 D-263 · D-306, `lib/project-closure.ts`, `project-closure-summary.ts`) A project's numbers at its close, for
 * the Hand over sheet and the Closing summary (P-E): its **costs** (committed — `costsOf`'s one figure) and its **margin** (contract value less
 * those costs — `profitOf`, the Money tab's margin), with the **expected** margin beside it and the warning strip when the two are more than 25
 * points apart (1.0's rule).
 *
 * - **Owners and Admins only** (Q-20 · F2-Q2): anyone else is handed `null`, never a figure.
 * - **The margin follows `profitGrade`** (simplify S-09): until the costs pass a tenth of the contract it is `null` (the surface prints "--" with
 *   `word` — *No costs yet* · *Early estimate*), and no warning is raised on it.
 * - **Expected** = what the signed quote planned (1.0 read a budget field 2.0 does not keep): the signed quote's and the approved variation
 *   orders' prices less their lines' costs, before GST (`quoteTotals`, the editor's Margin). `null` when there is no system quote or its lines
 *   carry no cost (an uploaded quote, a direct project's agreed value) — nothing to compare, no warning.
 */
export async function closingNumbers(projectId: string): Promise<ClosingNumbers | null> {
  const viewer = await fetchViewer()
  if (!seesProfit(viewer)) return null   // (parity map, FB-114) profit and margin are the books — Accounting reads them too · (pending modules S41b-1) and the Owner's cost switch
  const [p] = await db.select({ id: projects.id, quoteId: projects.quoteId }).from(projects).where(and(eq(projects.id, projectId), isNull(projects.deletedAt))).limit(1)
  if (!p) return null
  const profit = (await profitsFor([p.id])).get(p.id)
  if (!profit) return null
  /* the plan: the signed quote, and the variation orders the client approved */
  const vos = await db.select().from(quotes).where(and(eq(quotes.projectId, p.id), eq(quotes.kind, 'variation'), isNull(quotes.deletedAt)))
  const planned = [...(p.quoteId ? await db.select().from(quotes).where(eq(quotes.id, p.quoteId)).limit(1) : []), ...vos.filter((v) => isApprovedVariation(v.status))]
  const lines = planned.length ? await db.select().from(quoteItems).where(inArray(quoteItems.quoteId, planned.map((q) => q.id))) : []
  const plan = planned.map((q) => quoteTotals(lines.filter((l) => l.quoteId === q.id), { ...q, discounts: parseDiscounts(q.discountsJson) }))
  return closingNumbersOf(profit, plan.map((t) => ({ netMinor: t.totalMinor - t.gstMinor, costMinor: t.costMinor })))
}
