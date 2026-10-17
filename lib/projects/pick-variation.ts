import 'server-only'
import { and, asc, eq, inArray, isNotNull, isNull, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { homeownerProfiles, leadEvents, leads, projectSelectionOptions, projectSelections, projects, quoteItems, quotes } from '@/lib/db/schema'
import { titleCaseName } from '@/lib/format'
import { parseDiscounts, quoteTotals } from '@/lib/quotes/math'
import { variationOfChoice } from './payments'
import { normPrice, voPickBlock, type PickUndo } from './choices-model'

/*
 * (fix-C, C-02) A pick that moves keeps its variation order in step. The order is money's own (drafted by `draftVariationFromPick` in
 * app/projects/payment-actions.ts: a "Client's choices" group with one line, `${choice} — ${option}`, at the pick's price before GST, a saving as
 * a minus quantity). Nothing here sends, approves, numbers or re-sizes — money's rules stay where they are; this only keeps a DRAFT order's
 * line true to the pick (or deletes the Draft when the new pick changes nothing), and refuses the change once the order has left Draft.
 */

type Refusal = { error: string }
const lineName = (choice: string, option: string) => `${choice} — ${option}`.slice(0, 120)

export type PickVariationPlan =
  | { kind: 'rewrite'; quoteId: string; number: string; lineId: string; title: string; to: { name: string; description: string | null; priceMinor: number } }
  | { kind: 'delete'; quoteId: string; number: string }

/** What a change of pick does to the choice's variation order — null when it has none; a refusal once the order has left Draft. */
export async function planPickVariation(selectionId: string, o: { choice: string; from: string | null; to: { name: string; description: string | null; priceMinor: number | null }; clientFirst: string }): Promise<PickVariationPlan | null | Refusal> {
  const vo = await variationOfChoice(selectionId) as { id: string; number: string; status?: string } | null
  if (!vo) return null
  const [q] = await db.select().from(quotes).where(and(eq(quotes.id, vo.id), isNull(quotes.deletedAt))).limit(1)
  if (!q) return null
  const block = voPickBlock({ number: q.number, status: q.status }, o.clientFirst)
  if (block) return { error: block }
  const items = (await db.select().from(quoteItems).where(eq(quoteItems.quoteId, q.id))).filter((i) => i.kind !== 'group')
  const line = (o.from ? items.find((i) => i.name === lineName(o.choice, o.from!)) : undefined) ?? (items.length === 1 ? items[0] : undefined)
  const price = normPrice(o.to.priceMinor)
  if (price == null) {
    if (items.length <= 1) return { kind: 'delete', quoteId: q.id, number: q.number }
    return { error: `${q.number} carries more than this pick — change it there first` }
  }
  if (!line) return { error: `${q.number} was changed by hand — change its line there first` }
  return { kind: 'rewrite', quoteId: q.id, number: q.number, lineId: line.id, title: lineName(o.choice, o.to.name), to: { name: o.to.name, description: o.to.description, priceMinor: price } }
}

/** Carry the plan out — after the pick itself is written. Answers what the pick's Undo needs. */
export async function applyPickVariation(plan: PickVariationPlan): Promise<NonNullable<PickUndo['vo']>> {
  const [q] = await db.select().from(quotes).where(eq(quotes.id, plan.quoteId)).limit(1)
  const now = new Date()
  if (plan.kind === 'delete') {
    await db.update(quotes).set({ deletedAt: now, updatedAt: now }).where(eq(quotes.id, plan.quoteId))
    return { quoteId: plan.quoteId, deleted: true, title: q?.title ?? '', amountMinor: q?.amountMinor ?? 0, line: null }
  }
  const [was] = await db.select().from(quoteItems).where(eq(quoteItems.id, plan.lineId)).limit(1)
  await db.update(quoteItems).set({ name: plan.title, description: plan.to.description, qty: plan.to.priceMinor < 0 ? -1 : 1, costMinor: Math.abs(plan.to.priceMinor), updatedAt: now }).where(eq(quoteItems.id, plan.lineId))
  const title = await retotal(plan.quoteId, (t) => (q && was && t === q.title && q.title === was.name ? plan.title : t))
  return { quoteId: plan.quoteId, deleted: false, title: q?.title ?? title, amountMinor: q?.amountMinor ?? 0, line: was ? { id: was.id, name: was.name, description: was.description, qty: was.qty, costMinor: was.costMinor } : null }
}

/** The order's total again from its lines (the editor's own sums), with its title kept or renamed with the line it was named after. */
async function retotal(quoteId: string, titleOf: (t: string) => string): Promise<string> {
  const [q] = await db.select().from(quotes).where(eq(quotes.id, quoteId)).limit(1)
  if (!q) return ''
  const lines = await db.select().from(quoteItems).where(eq(quoteItems.quoteId, quoteId))
  const t = quoteTotals(lines, { ...q, discounts: parseDiscounts(q.discountsJson) })
  const title = titleOf(q.title)
  await db.update(quotes).set({ title, amountMinor: t.totalMinor, updatedAt: new Date() }).where(eq(quotes.id, quoteId))
  if (title !== q.title) {
    await db.update(leadEvents).set({ detail: sql`json_set(${leadEvents.detail}, '$.title', ${title})` })
      .where(and(eq(leadEvents.kind, 'project_vo_created'), sql`json_extract(${leadEvents.detail}, '$.id') = ${quoteId}`))
  }
  return title
}

/** The pick's Undo for its order: the Draft back (undeleted), or its line and title as they were. Only while it is still a Draft. */
export async function undoPickVariation(u: NonNullable<PickUndo['vo']>, o: { projectId: string }): Promise<void> {
  const [q] = await db.select().from(quotes).where(and(eq(quotes.id, u.quoteId), eq(quotes.projectId, o.projectId), eq(quotes.kind, 'variation'))).limit(1)
  if (!q || q.status !== 'Draft') return
  if (u.deleted) { await db.update(quotes).set({ deletedAt: null, updatedAt: new Date() }).where(eq(quotes.id, q.id)); return }
  if (!u.line) return
  const [line] = await db.select().from(quoteItems).where(and(eq(quoteItems.id, u.line.id), eq(quoteItems.quoteId, q.id))).limit(1)
  if (!line) return
  const qty = u.line.qty < 0 ? -1 : 1
  await db.update(quoteItems).set({ name: String(u.line.name).slice(0, 200), description: typeof u.line.description === 'string' ? u.line.description.slice(0, 2000) : null, qty, costMinor: Math.max(0, Math.round(Number(u.line.costMinor) || 0)), updatedAt: new Date() }).where(eq(quoteItems.id, line.id))
  const title = typeof u.title === 'string' ? u.title.slice(0, 200) : q.title
  await retotal(q.id, () => title)
}

/* ── (simplify S-21, her "build everything" 2026-10-09) the variation orders a pick drafted — what Money's Needs you says ─────────────── */

/** A live variation order drafted from a choice's pick: which choice, which option, who picked it — "{person} chose {option} · Send VO-n". */
export type PickVariation = {
  quoteId: string; number: string; status: string; projectId: string; amountMinor: number
  selectionId: string; choice: string; option: string | null
  /** who picked it: the client on their portal (a household person by their own name), or the studio with them */
  by: 'client' | 'studio'; person: string | null; at: number | null
}
/**
 * Every live variation order drafted from a pick on these projects, oldest first. The order carries its choice (`quotes.selection_id`, set by
 * `draftVariationFromPick`); the choice carries the pick. A client's pick on the portal drafts its order by itself (app/portal/choices-actions.ts),
 * so a Draft here with `by: 'client'` is one the studio still has to send — K-M's money rows read it.
 */
export async function fetchPickVariations(projectIds: string[]): Promise<PickVariation[]> {
  if (!projectIds.length) return []
  const rows = await db.select({ q: quotes, s: projectSelections, client: leads.name }).from(quotes)
    .innerJoin(projectSelections, eq(projectSelections.id, quotes.selectionId)).innerJoin(projects, eq(projects.id, projectSelections.projectId)).innerJoin(leads, eq(leads.id, projects.leadId))
    .where(and(inArray(projectSelections.projectId, projectIds), eq(quotes.kind, 'variation'), isNull(quotes.deletedAt), isNotNull(quotes.selectionId))).orderBy(asc(quotes.createdAt))
  if (!rows.length) return []
  const optIds = rows.map((r) => r.s.chosenOptionId).filter((x): x is string => !!x)
  const homeIds = rows.map((r) => r.s.chosenHomeownerId).filter((x): x is string => !!x)
  const [opts, homes] = await Promise.all([
    optIds.length ? db.select({ id: projectSelectionOptions.id, name: projectSelectionOptions.name }).from(projectSelectionOptions).where(inArray(projectSelectionOptions.id, optIds)) : Promise.resolve([]),
    homeIds.length ? db.select({ id: homeownerProfiles.id, name: homeownerProfiles.name }).from(homeownerProfiles).where(inArray(homeownerProfiles.id, homeIds)) : Promise.resolve([]),
  ])
  const first = (n: string) => titleCaseName(n).split(/\s+/)[0] ?? n
  return rows.map(({ q, s, client }) => {
    const by = s.chosenBy === 'studio' ? 'studio' as const : 'client' as const
    const home = s.chosenHomeownerId ? homes.find((h) => h.id === s.chosenHomeownerId) : undefined
    return {
      quoteId: q.id, number: q.number, status: q.status, projectId: s.projectId, amountMinor: q.amountMinor,
      selectionId: s.id, choice: s.title, option: s.chosenOptionId ? opts.find((o) => o.id === s.chosenOptionId)?.name ?? null : null,
      by, person: by === 'client' ? first(home?.name ?? client) : null, at: s.chosenAt?.getTime() ?? null,
    }
  })
}
