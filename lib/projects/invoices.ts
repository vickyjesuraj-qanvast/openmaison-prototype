import 'server-only'
import { randomUUID } from 'node:crypto'
import { and, eq, inArray, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leadEvents, notifications, projectInvoices, projects, quotes, type Project } from '@/lib/db/schema'
import { sessionMemberId } from '@/lib/db/session'
import { notify } from '@/lib/notifications/emit'
import { leadMemberIds } from '@/lib/notifications/queries'
import { logProjectEvent } from './events'
import { money2 } from '@/lib/quotes/math'
import { allocate, billGstRate, gstOf, isOutsideContract, isVariationBill, moneyOf, rebalancePlan, rebalanceSentence, type RebalanceChange } from './money'
import { newShareToken } from './invoices-token'
import { fetchInvoiceRulesStored, moneyInputOf } from './money-queries'

/*
 * (Projects round 5) The writers behind money: the Drafts a project starts with (F-04), the rebalance (F-08) and what follows a variation
 * order's approval (F-07). Every surface reads lib/projects/money.ts; only these write amounts, so the numbers stay one set.
 */

/** A rebalance's way back: each re-sized Draft's amount and GST as they were. */
export type AmountsUndo = { id: string; amountMinor: number; gstMinor: number }[]

async function projectRow(projectId: string): Promise<Project | null> {
  const [p] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1)
  return p ?? null
}

/**
 * (F-04) One Draft per payment stage that has no live invoice — made with the project (lib/projects/create.ts), by R72 for the projects made
 * before money, and on the Money tab's first read of a project that has stages and no invoices. Each takes its share of what the contract
 * leaves (the allocation), under the base quote's issuing entity. Idempotent.
 */
export async function draftInvoicesFor(projectId: string, o: { at?: Date; actorId?: string | null } = {}): Promise<number> {
  const p = await projectRow(projectId)
  if (!p) return 0
  const input = await moneyInputOf(p)
  const liveRefs = new Set(input.invoices.filter((i) => i.status !== 'void').map((i) => i.stageRef))
  const missing = input.stages.filter((s) => !liveRefs.has(s.ref))
  if (!missing.length) return 0
  const m = moneyOf(input, Date.now())
  const fresh = missing.map((s) => ({ id: randomUUID(), stage: s }))
  /* (gaps build B) only what bills the contract shares it — never a one-off; a fixed-amount stage (fee first) takes its amount and is locked */
  const pool = [
    ...input.invoices.filter((i) => i.status !== 'void' && !isOutsideContract(i)).map((i) => ({ id: i.id, pct: i.pct, amountMinor: i.amountMinor, locked: true })),
    ...fresh.map((f) => (f.stage.fixedMinor != null ? { id: f.id, pct: 0, amountMinor: f.stage.fixedMinor, locked: true } : { id: f.id, pct: f.stage.pct, amountMinor: 0, locked: false })),
  ]
  const alloc = allocate(m.contractMinor, pool)
  const at = o.at ?? new Date()
  const by = o.actorId === undefined ? await sessionMemberId() : o.actorId   // (pending modules S43A) this browser's member
  await db.insert(projectInvoices).values(fresh.map((f) => {
    const amount = f.stage.fixedMinor != null ? f.stage.fixedMinor : alloc[f.id] ?? 0
    return {
      id: f.id, projectId, stageRef: f.stage.ref, stageName: f.stage.name, pct: f.stage.pct, position: f.stage.position, status: 'draft',
      amountMinor: amount, gstMinor: gstOf(amount, billGstRate(input, { kind: 'stage', stageRef: f.stage.ref })), issuingEntity: input.quote?.issuingEntity ?? null,   // (S43D, F2-04) the contract's own GST share
      createdBy: by, createdAt: at, updatedAt: at,
      kind: 'stage', shareToken: newShareToken(), fixedMinor: f.stage.fixedMinor ?? null,   // (gaps build B, items 6 · 13)
    }
  }))
  return fresh.length
}

/** (F-08) Re-size the unsent, unedited Drafts to the contract value now. Sent and paid invoices never change. */
export async function applyRebalance(projectId: string): Promise<{ changes: RebalanceChange[]; contractMinor: number; undo: AmountsUndo; sentence: string; /** (fix-D, D-17) the unsent Drafts */ drafts: number }> {
  const p = await projectRow(projectId)
  if (!p) return { changes: [], contractMinor: 0, undo: [], sentence: '', drafts: 0 }
  const input = await moneyInputOf(p)
  const m = moneyOf(input, Date.now())
  const changes = rebalancePlan(m.contractMinor, input.invoices)
  const undo: AmountsUndo = []
  const now = new Date()
  for (const c of changes) {
    const was = input.invoices.find((i) => i.id === c.id)!
    undo.push({ id: c.id, amountMinor: was.amountMinor, gstMinor: was.gstMinor })
    await db.update(projectInvoices).set({ amountMinor: c.toMinor, gstMinor: gstOf(c.toMinor, billGstRate(input, was)), updatedAt: now }).where(eq(projectInvoices.id, c.id))   // (S43D, F2-04)
  }
  /* (gaps build B) the stages' unsent Drafts — a one-off or a variation order billed on its own carries none of the contract's re-size */
  return { changes, contractMinor: m.contractMinor, undo, sentence: rebalanceSentence(changes, m.contractMinor), drafts: input.invoices.filter((i) => i.status === 'draft' && !isOutsideContract(i) && !isVariationBill(i)).length }
}
/** A rebalance's Undo: the Drafts' amounts as they were (only Drafts — a Draft sent since keeps what it was sent at). */
export async function restoreAmounts(projectId: string, undo: AmountsUndo): Promise<void> {
  const ids = undo.map((u) => u.id).filter((id) => typeof id === 'string').slice(0, 50)
  if (!ids.length) return
  const rows = await db.select({ id: projectInvoices.id, status: projectInvoices.status }).from(projectInvoices).where(and(eq(projectInvoices.projectId, projectId), inArray(projectInvoices.id, ids)))
  const now = new Date()
  for (const r of rows) {
    if (r.status !== 'draft') continue
    const u = undo.find((x) => x.id === r.id)!
    await db.update(projectInvoices).set({ amountMinor: Math.max(0, Math.round(u.amountMinor)), gstMinor: Math.max(0, Math.round(u.gstMinor)), updatedAt: now }).where(eq(projectInvoices.id, r.id))
  }
}

/**
 * (gaps build B, item 1 · S44O — UAT row 360) A variation order's own invoice: a Draft for the order's whole total (GST inside, as the contract's),
 * listed after the stages, under the order's issuing entity — Money's *Bill VO-n on its own* (`billVariation`) and, with Settings › Finance ›
 * *Variation orders are billed: On their own, up front*, every approval (`onVariationApproved`). None for an omission or an order that has one.
 * Answers its id and the line it wrote, or null.
 */
export async function draftVariationInvoice(q: typeof quotes.$inferSelect, p: Project, o: { actorId: string | null; at: Date }): Promise<{ id: string; eventId: string } | null> {
  if (q.amountMinor <= 0) return null
  const [have] = await db.select({ id: projectInvoices.id }).from(projectInvoices).where(and(eq(projectInvoices.projectId, p.id), eq(projectInvoices.stageRef, `vo:${q.id}`), sql`${projectInvoices.status} <> 'void'`)).limit(1)
  if (have) return null
  const input = await moneyInputOf(p)
  const [n] = await db.select({ n: sql<number>`count(*)` }).from(projectInvoices).where(and(eq(projectInvoices.projectId, p.id), sql`${projectInvoices.position} >= 1000`))
  const id = randomUUID()
  await db.insert(projectInvoices).values({
    id, projectId: p.id, stageRef: `vo:${q.id}`, stageName: q.number, pct: 0, position: 1000 + Number(n?.n ?? 0), status: 'draft',
    amountMinor: q.amountMinor, gstMinor: gstOf(q.amountMinor, billGstRate(input, { kind: 'variation', variationId: q.id })), issuingEntity: q.issuingEntity ?? input.quote?.issuingEntity ?? null,   // (S43D, F2-04) the order's own GST
    kind: 'variation', variationId: q.id, description: q.title, shareToken: newShareToken(), createdBy: o.actorId, createdAt: o.at, updatedAt: o.at,
  })
  const eventId = await logProjectEvent(db, p.leadId, p.id, 'project_invoice_created', { name: p.name, number: p.number, id, kind: 'variation', stage: q.number, vo: q.number, title: q.title, to: money2(q.amountMinor) }, { ...(o.actorId === null ? { actorId: null } : {}), at: o.at })
  return { id, eventId }
}

/** The project a variation order changes, when it is one. */
export async function variationProject(quoteId: string): Promise<{ quote: typeof quotes.$inferSelect; project: Project } | null> {
  const [q] = await db.select().from(quotes).where(eq(quotes.id, quoteId)).limit(1)
  if (!q || q.kind !== 'variation' || !q.projectId) return null
  const p = await projectRow(q.projectId)
  return p ? { quote: q, project: p } : null
}

export type ApprovalOutcome = { projectId: string; leadId: string; sentence: string; changes: RebalanceChange[]; undo: AmountsUndo; eventIds: string[]; contractMinor: number; raisedAt: number
  /** (gaps build B, item 1) no unsent stage is left to carry this addition — it needs its own invoice (*Bill this VO*) */ billable: boolean
  /** (S44O — row 360) the order's own Draft, made by the studio's rule — its Undo takes it away with the approval */ ownInvoiceId?: string | null }

/**
 * (F-07 · F-08) A variation order the client approved — on its confirmation link, or recorded by an Owner or an Admin: the contract value
 * moves (it is read from the approved orders), the unsent Drafts are re-sized, the trail is written (the approval, then the rebalance) and
 * the project's team hears it. Answers what an Undo needs.
 */
export async function onVariationApproved(quoteId: string, o: { by: string; via: string; actorId: string | null; at: Date }): Promise<ApprovalOutcome | null> {
  const vp = await variationProject(quoteId)
  if (!vp) return null
  const { quote: q, project: p } = vp
  const raisedAt = Date.now()
  /* (S44O — UAT row 360, her UAT ask 2026-10-15) Settings › Finance › *Variation orders are billed: On their own, up front* — the order gets its
     own Draft first (`draftVariationInvoice`), so the rebalance leaves the stages' shares as they were; Spread (the default) re-sizes them */
  const own = (await fetchInvoiceRulesStored()).voBilling === 'own' ? await draftVariationInvoice(q, p, { actorId: o.actorId, at: new Date(o.at.getTime() + 500) }) : null
  const r = await applyRebalance(p.id)
  const fromMinor = r.contractMinor - q.amountMinor
  const eventIds: string[] = []
  const actor = o.actorId === null ? { actorId: null } : {}
  eventIds.push(await logProjectEvent(db, p.leadId, p.id, 'project_vo_approved', { id: q.id, number: q.number, title: q.title, name: o.by, via: o.via, from: money2(fromMinor), to: money2(r.contractMinor), n: r.changes.length }, { ...actor, at: o.at }))
  if (own) eventIds.push(own.eventId)
  if (r.changes.length) eventIds.push(await logProjectEvent(db, p.leadId, p.id, 'project_money_rebalanced', { number: q.number, n: r.changes.length, names: r.changes.map((c) => c.stageName), to: money2(r.contractMinor) }, { ...actor, at: new Date(o.at.getTime() + 1000) }))
  await notify('variation_approved', await leadMemberIds(p.leadId), {
    title: `${o.by} approved variation order ${q.number}`, body: `${p.name} · the contract is now ${money2(r.contractMinor)}${r.changes.length ? ` — ${r.changes.length} unsent invoice${r.changes.length === 1 ? '' : 's'} re-sized` : ''}`,
    href: `/projects/${p.id}/money`, leadId: p.leadId, quoteId: q.id, actorId: o.actorId,
  })
  const billable = !own && !r.drafts && q.amountMinor > 0   // (gaps build B, item 1) none left to carry it: the sentence offers to bill it on its own
  /* (S44O — row 360) billed on its own by the studio's rule: the sentence says so, and the stages' shares stand */
  const sentence = own ? `The contract is now ${money2(r.contractMinor)} — ${q.number}’s own invoice is a Draft for ${money2(q.amountMinor)}; the stages keep their shares.`
    : rebalanceSentence(r.changes, r.contractMinor, { moved: true, drafts: r.drafts, bill: billable ? q.number : null })
  return { projectId: p.id, leadId: p.leadId, sentence, changes: r.changes, undo: r.undo, eventIds, contractMinor: r.contractMinor, raisedAt, billable, ownInvoiceId: own?.id ?? null }   // (REG-1067) the contract moved
}
/** Taking an approval back (its Undo): the trail it wrote and the bell rows it raised go; the Drafts return to their amounts. */
export async function undoVariationApproved(projectId: string, quoteId: string, o: { undo: AmountsUndo; eventIds: string[]; raisedAt: number }): Promise<void> {
  /* (S44O — row 360) its own invoice, still a Draft, goes with the approval (onVariationReverted's rule) — whoever billed it */
  await db.delete(projectInvoices).where(and(eq(projectInvoices.projectId, projectId), eq(projectInvoices.stageRef, `vo:${quoteId}`), eq(projectInvoices.status, 'draft')))
  await restoreAmounts(projectId, o.undo)
  const ids = o.eventIds.filter((id) => typeof id === 'string').slice(0, 10)
  if (ids.length) await db.delete(leadEvents).where(and(eq(leadEvents.projectId, projectId), inArray(leadEvents.id, ids)))
  await db.delete(notifications).where(and(eq(notifications.quoteId, quoteId), eq(notifications.kind, 'variation_approved')))
}
/** A variation order moved away from approved by another path (the status menu, Revise): the Drafts follow the contract back. (fix-D, D-01)
    Answers what moved and what an Undo needs — the re-sized Drafts and the trail it wrote. */
export async function onVariationReverted(quoteId: string, o: { at?: Date } = {}): Promise<{ changes: RebalanceChange[]; contractMinor: number; undo: AmountsUndo; eventIds: string[]; drafts: number } | null> {
  const vp = await variationProject(quoteId)
  if (!vp) return null
  /* (gaps build B, item 1) its own invoice, still a Draft, goes with its approval (a sent one stays on the record — "to credit" says the rest) */
  await db.delete(projectInvoices).where(and(eq(projectInvoices.projectId, vp.project.id), eq(projectInvoices.stageRef, `vo:${quoteId}`), eq(projectInvoices.status, 'draft')))
  const r = await applyRebalance(vp.project.id)
  const eventIds: string[] = []
  if (r.changes.length) eventIds.push(await logProjectEvent(db, vp.project.leadId, vp.project.id, 'project_money_rebalanced', { number: vp.quote.number, n: r.changes.length, names: r.changes.map((c) => c.stageName), to: money2(r.contractMinor) }, o.at ? { at: o.at } : {}))
  return { changes: r.changes, contractMinor: r.contractMinor, undo: r.undo, eventIds, drafts: r.drafts }
}
