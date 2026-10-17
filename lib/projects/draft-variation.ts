import 'server-only'
import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leadAssignees, leadEvents, leads, members, projectSelections, projects, quoteItems, quotes } from '@/lib/db/schema'
import { revalidateLead } from '@/lib/leads/queries'
import { fetchStudio } from '@/lib/settings/queries'
import { projectRef, validUntil } from '@/lib/quotes/refs'
import { DEFAULT_DENSITY } from '@/lib/quotes/items-model'
import { parseDiscounts, quoteTotals } from '@/lib/quotes/math'
import { logProjectEvent } from './events'
import { completedBlock } from './handover-model'
import { pickPriceDifference } from './choices'
import { variationOfChoice } from './payments'
import { newShareToken } from './invoices-token'

/*
 * (simplify round 2, R2-A — her "fix all the pending things" 2026-10-09; the leftover K-M named: "the sturdier system path for a client's pick")
 * Drafting a variation order, on the server only, AS a named member. The two server actions that draft one keep their own gate and pass their
 * viewer: Money's New ▾ › Variation order (`createVariationOrder`, app/projects/money-actions.ts) and Choices' *Draft a variation order*
 * (`draftVariationFromPick`, app/projects/payment-actions.ts). The client's priced pick on their portal (app/portal/choices-actions.ts) is not a
 * studio press: it drafts its order as the project's own member (`projectOwnMember`), so every pick drafts — whoever "you" are in View as.
 * A server action can't take a "system" flag safely (any client can call it); this module is not an action, so nothing outside the server
 * reaches it. The rules that are not the viewer's stay here: the project is live and not completed (Q-24, money is read-only once handed over),
 * the numbering (VO-n per project), the signed quote's entity, template and GST, the pick's one line, the choice linked (`quotes.selection_id`),
 * a second draft for the same choice opens the first. The lines, the `project_vo_created` row and its title rewrite are what the actions wrote.
 */

type Refusal = { error: string }
const NOT_FOUND = 'This project is not there any more'
export const NO_PRICE_CHANGE = 'The pick changes nothing on the price — there is no variation order to draft'

/**
 * Who a variation order is drafted as: the member it is prepared and created by (`quotes.prepared_by` · `created_by` — the editor's "Prepared
 * by", the lists' Creator), and who its Activity line names — `undefined` = the signed-in member, as every studio press is stamped; `null` = no
 * member pressed anything (the client's pick drafted it; Activity says "System", beside the pick's own line naming the client).
 */
export type DraftActor = { memberId: string; eventActorId?: string | null
  /** (pending modules S19) the id the order is made with — a contractor's quote read before it, charged against `quote:<id>` */
  id?: string }

/** The project's own member, for what the project does by itself: its first member (the earliest assigned, still active), else who made the
    project, else the studio's Owner (then an Admin). Null only for a project that is not there. */
export async function projectOwnMember(projectId: string): Promise<string | null> {
  const [p] = await db.select({ leadId: projects.leadId, createdBy: projects.createdBy }).from(projects).where(eq(projects.id, projectId)).limit(1)
  if (!p) return null
  const [team] = await db.select({ id: leadAssignees.memberId }).from(leadAssignees).innerJoin(members, eq(members.id, leadAssignees.memberId))
    .where(and(eq(leadAssignees.leadId, p.leadId), eq(members.isActive, true))).orderBy(asc(leadAssignees.assignedAt)).limit(1)
  if (team) return team.id
  if (p.createdBy) {
    const [maker] = await db.select({ id: members.id }).from(members).where(and(eq(members.id, p.createdBy), eq(members.isActive, true))).limit(1)
    if (maker) return maker.id
  }
  const [runner] = await db.select({ id: members.id }).from(members).where(and(inArray(members.role, ['Owner', 'Admin']), eq(members.isActive, true)))
    .orderBy(sql`case when ${members.role} = 'Owner' then 0 else 1 end`, asc(members.name)).limit(1)
  return runner?.id ?? null
}

function touch(p: { id: string; leadId: string }) {
  revalidatePath('/projects', 'layout')
  revalidatePath(`/projects/${p.id}/money`)
  revalidateLead(p.leadId)
}

/**
 * New variation order: a quote in variation mode on the project — numbered VO-1, VO-2… per project, raised under the signed quote's
 * issuing entity and template, its GST as the contract's, no payment schedule of its own (the rebalance carries its money into the unsent
 * invoices). The editor opens on it; omissions are lines with a minus quantity. The caller has checked who may (the actions' gates).
 */
export async function insertVariationOrder(projectId: string, actor: DraftActor): Promise<{ id: string; number: string } | Refusal> {
  const [row] = await db.select({ p: projects, lead: leads }).from(projects).innerJoin(leads, eq(leads.id, projects.leadId))
    .where(and(eq(projects.id, typeof projectId === 'string' ? projectId : ''), isNull(projects.deletedAt))).limit(1)
  if (!row) return { error: NOT_FOUND }
  const { p, lead } = row
  const shut = completedBlock(p.stage, 'money'); if (shut) return { error: shut }   // (Projects round 7, Q-24) a completed project's money is read-only
  const [base] = p.quoteId ? await db.select().from(quotes).where(eq(quotes.id, p.quoteId)).limit(1) : []
  const studio = await fetchStudio()
  const [count] = await db.select({ n: sql<number>`count(*)` }).from(quotes).where(and(eq(quotes.projectId, p.id), eq(quotes.kind, 'variation')))
  const seq = Number(count?.n ?? 0) + 1
  /* (pending modules S19) an order read from a contractor's quote keeps the id its read was charged against (`quote:<id>`, AI credits) */
  const ask = typeof actor.id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(actor.id) ? actor.id : null
  const [taken] = ask ? await db.select({ id: quotes.id }).from(quotes).where(eq(quotes.id, ask)).limit(1) : []
  const id = ask && !taken ? ask : randomUUID(), now = new Date()
  const number = `VO-${seq}`
  await db.insert(quotes).values({
    id, leadId: p.leadId, number, title: `Variation order ${seq}`, amountMinor: 0, visibility: 'Private', status: 'Draft', createdAt: now, updatedAt: now,
    preparedBy: actor.memberId, createdBy: actor.memberId, propertyType: base?.propertyType ?? lead.propertyType, siteAddress: base?.siteAddress ?? lead.propertyAddress ?? null,
    nric: base?.nric ?? lead.icNumber ?? null, customerId: base?.customerId ?? lead.customerId ?? null, client2Name: base?.client2Name ?? null, client2Nric: base?.client2Nric ?? null,
    templateId: base?.templateId ?? null, templateVersion: base?.templateVersion ?? null, clientViewJson: base?.clientViewJson ?? null,
    validUntil: validUntil(now), projectRef: base?.projectRef ?? projectRef(lead.propertyType, now, seq), itemsDensity: DEFAULT_DENSITY,
    gstEnabled: base ? base.gstEnabled : studio.gstRegistered, issuingEntity: base?.issuingEntity ?? null, clientSignatureRequired: false, termsHtml: '', notesHtml: '',
    kind: 'variation', projectId: p.id,
    confirmToken: newShareToken(),   // (pending modules S04) the approval link's own key — never the order's id
  })
  /* the line money part one writes — `number` is the order's (the project's number it once carried was always overwritten by it) */
  await logProjectEvent(db, p.leadId, p.id, 'project_vo_created', { name: p.name, id, title: `Variation order ${seq}`, number }, actor.eventActorId === undefined ? {} : { actorId: actor.eventActorId })
  touch(p)
  return { id, number }
}

/**
 * Draft a variation order from a choice's pick: a quote in variation mode on the project (`insertVariationOrder` — VO-n, the signed quote's
 * entity, template and GST), titled after the choice, its one line the pick at its price against the quote (a saving is a line with a minus
 * quantity, as every omission), linked back to the choice. A second draft for the same choice answers the one already drafted (`existing`).
 * It then follows the variation order's own path (approval, the client's link, the rebalance) — nothing here sends it.
 */
export async function draftVariationForPick(selectionId: string, actor: DraftActor): Promise<{ id: string; number: string; existing: boolean } | Refusal> {
  const sid = typeof selectionId === 'string' ? selectionId : ''
  const diff = await pickPriceDifference(sid)
  if (!diff) return { error: NO_PRICE_CHANGE }
  const have = await variationOfChoice(sid)
  if (have) return { ...have, existing: true }
  const vo = await insertVariationOrder(diff.projectId, actor)
  if ('error' in vo) return vo
  const title = `${diff.title} — ${diff.option.name}`.slice(0, 120)
  const [q] = await db.select().from(quotes).where(eq(quotes.id, vo.id)).limit(1)
  if (!q) return { error: 'Couldn’t draft the variation order' }
  const studio = await fetchStudio()
  const now = new Date()
  const gst = q.gstEnabled ? studio.gstPct : 0
  const groupId = randomUUID()
  await db.insert(quoteItems).values([
    { id: groupId, quoteId: q.id, parentId: null, kind: 'group', position: 0, name: 'Client’s choices', status: 'Pending', qty: 1, costMinor: 0, markupMinor: 0, discountPct: 0, gstPct: gst, room: diff.room, createdAt: now, updatedAt: now },
    {
      id: randomUUID(), quoteId: q.id, parentId: groupId, kind: 'item', position: 0, name: title, description: diff.option.description, status: 'Pending',
      qty: diff.priceMinor < 0 ? -1 : 1, unit: 'Lot', costMinor: Math.abs(diff.priceMinor), markupMinor: 0, discountPct: 0, gstPct: gst, room: diff.room, createdAt: now, updatedAt: now,
    },
  ])
  const lines = await db.select().from(quoteItems).where(eq(quoteItems.quoteId, q.id))
  const t = quoteTotals(lines, { ...q, discounts: parseDiscounts(q.discountsJson) })
  await db.update(quotes).set({ title, amountMinor: t.totalMinor, selectionId: diff.selectionId, updatedAt: now }).where(eq(quotes.id, q.id))
  /* the line `insertVariationOrder` wrote names the order as it was made — it carries the choice's title now */
  await db.update(leadEvents).set({ detail: sql`json_set(json_set(${leadEvents.detail}, '$.title', ${title}), '$.choice', ${diff.title})` })
    .where(and(eq(leadEvents.projectId, diff.projectId), eq(leadEvents.kind, 'project_vo_created'), sql`json_extract(${leadEvents.detail}, '$.id') = ${q.id}`))
  await db.update(projectSelections).set({ updatedAt: now }).where(eq(projectSelections.id, diff.selectionId))
  revalidatePath(`/projects/${diff.projectId}/choices`); touch({ id: diff.projectId, leadId: diff.leadId }); revalidatePath(`/quotes/${q.id}`)
  return { id: q.id, number: vo.number, existing: false }
}
