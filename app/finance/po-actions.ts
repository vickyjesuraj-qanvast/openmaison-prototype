'use server'

import { randomUUID } from 'node:crypto'
import { and, asc, eq, inArray, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { costDocuments, leadEvents, paymentsOut, projectMilestones, purchaseOrderLines, purchaseOrders, quoteItems, quotes, supplierBills, vendors, type PurchaseOrder } from '@/lib/db/schema'
import type { ProjectEventKind } from '@/lib/projects/events'
import { DATA_URL, dataUrlSize } from '@/lib/leads/file-store'
import { notify } from '@/lib/notifications/emit'
import { studioRunnerIds } from '@/lib/notifications/queries'
import { fetchStudio } from '@/lib/settings/queries'
import { completedBlock } from '@/lib/projects/handover-model'
import { dropLeadEvents } from '@/lib/leads/events'
import { displayDate } from '@/lib/format'
import { newShareToken } from '@/lib/projects/invoices-token'
import { fetchCostRules, fetchPoNumbers } from '@/lib/finance/queries'
import {
  ANSWER_VIA, DESCRIPTION_MAX, NOTE_MAX, REASON_MAX, REF_MAX, advanceOf, binds, dueFromTerms, editable, gstInside, lineAmount, poLinesProblem, poState, poTotals, termsLabel,
  type AdvanceKind, type PoState,
} from '@/lib/finance/model'
import { PAY_RULE, PO_APPROVE_RULE, PO_RECORD_RULE, PO_RULE, approvesPo, isPoTerms, nextPoNumber, paysOut, poWaits, preparesPo, recordsPo, type PoTerms } from '@/lib/finance/rules'
import { docProblem, forCosts, isRefusal, logCost, moneyHref, moneyWords, nameOf, touchCosts, type PickedDoc, type ProjectCtx, type Refusal } from '@/lib/finance/server'
import { todoHref } from '@/lib/finance/sections'

/*
 * (gaps build F1 — F1-Q5…Q9) A purchase order's life on the server: made and changed by the project's team (a Draft, numbered at once), sent
 * to the vendor (WhatsApp with the no-login link — opened on the press by the screen, recorded here), approved first when it is over the
 * studio's limit or asks for an advance (an Owner's or an Admin's own send approves it — one path, F-05's), the vendor's answer marked when it
 * came off the link, closed (by itself when paid in full — app/finance/cost-actions.ts — or short by an Owner or an Admin), cancelled, a Draft
 * removed, duplicated. Every refusal is `{ error: <the rule> }`; every removal answers with an Undo; every step writes its Activity line.
 */
const PO_GONE = 'This purchase order is not there any more'
type PoCtx = ProjectCtx & { po: PurchaseOrder; paid: number; state: PoState }
async function forPo(poId: string): Promise<PoCtx | Refusal> {
  const [po] = await db.select().from(purchaseOrders).where(and(eq(purchaseOrders.id, poId), isNull(purchaseOrders.deletedAt))).limit(1)
  if (!po) return { error: PO_GONE }
  const c = await forCosts(po.projectId); if (isRefusal(c)) return c
  const paid = (await db.select({ a: paymentsOut.amountMinor }).from(paymentsOut).where(and(eq(paymentsOut.poId, poId), isNull(paymentsOut.reversedAt)))).reduce((s, r) => s + r.a, 0)
  return { ...c, po, paid, state: poState({ status: po.status as 'draft', submittedAt: po.submittedAt?.getTime() ?? null, reviewNote: po.reviewNote, vendorAnswer: po.vendorAnswer as 'accepted' | null }, paid) }
}
const prepares = (c: ProjectCtx) => preparesPo(c.viewer, c.team)
/** (parity map, MO-038 · MO-094 · MO-098) a PO made elsewhere and a delivery are bookkeeping — the team, and Accounting on every project */
const records = (c: ProjectCtx) => recordsPo(c.viewer, c.team)
const href = (c: { p: { id: string } }, poId: string) => moneyHref(c.p.id, poId)

/* ── Make and change ──────────────────────────────────────────────────────────────────────────────────────────────────────────── */

export type PoLineInput = { description: string; category: string | null; qty: number; unit: string | null; unitMinor: number; quoteItemId: string | null; milestoneId: string | null }
export type PoInput = {
  id?: string | null; projectId: string; vendorId: string; title: string; lines: PoLineInput[]; chargesGst: boolean
  advanceKind: AdvanceKind; advanceValue: number; terms: PoTerms; termsText: string | null; expectedOn: number | null; deliveryAddress: string | null; vendorNote: string | null
  /** (parity map, MO-011) where the vendor sends its invoice — null / blank = the letterhead's own (no "Invoice to" on the paper) */
  billTo?: string | null
}
const trim = (v: string | null | undefined, max: number) => { const t = (v ?? '').trim().slice(0, max); return t || null }

/** Save a PO as a Draft — a new one numbered at once, or one that may change (a Draft; one the vendor answered with changes or a no, which goes
    back to a Draft to send again). Answers its id, number and whether it waits for approval when sent. */
export async function savePo(i: PoInput): Promise<{ id: string; number: string; waits: boolean } | Refusal> {
  const c = await forCosts(i.projectId); if (isRefusal(c)) return c
  if (!prepares(c)) return { error: PO_RULE }
  const before = i.id ? await forPo(i.id) : null
  if (before && isRefusal(before)) return before
  if (before && before.po.projectId !== i.projectId) return { error: PO_GONE }
  if (before?.po.external) return { error: EXTERNAL_KEPT }
  if (before && !editable(before.state)) return { error: before.state === 'awaiting' ? 'It is waiting for approval — take it back first' : 'A PO the vendor has is changed only once they ask for changes' }
  if (!before) { const shut = completedBlock(c.p.stage, 'money'); if (shut) return { error: shut } }
  const [v] = await db.select().from(vendors).where(eq(vendors.id, i.vendorId)).limit(1)
  if (!v || v.mergedInto) return { error: 'Pick the vendor again — that one is not in the directory' }
  if (!v.isActive && before?.po.vendorId !== v.id) return { error: `${v.name} is deactivated — pick another, or reactivate it in Finance › Vendors` }
  const lines = i.lines.map((l) => ({ ...l, description: (l.description ?? '').trim().slice(0, DESCRIPTION_MAX), qty: Number(l.qty) || 0, unitMinor: Math.round(Number(l.unitMinor) || 0) })).filter((l) => l.description || l.unitMinor)
  const why = poLinesProblem(lines); if (why) return { error: why }
  if (!isPoTerms(i.terms)) return { error: 'Pick the payment terms' }
  if (i.terms === 'custom' && !trim(i.termsText, 120)) return { error: 'Write the terms in your words' }
  /* the lines from the quote are this project's signed quote's; a milestone is this project's */
  const qIds = lines.map((l) => l.quoteItemId).filter((x): x is string => !!x)
  const okQ = new Set(qIds.length && c.p.quoteId ? (await db.select({ id: quoteItems.id }).from(quoteItems).where(and(eq(quoteItems.quoteId, c.p.quoteId), inArray(quoteItems.id, qIds)))).map((r) => r.id) : [])
  const mIds = lines.map((l) => l.milestoneId).filter((x): x is string => !!x)
  const okM = new Set(mIds.length ? (await db.select({ id: projectMilestones.id }).from(projectMilestones).where(and(eq(projectMilestones.projectId, i.projectId), inArray(projectMilestones.id, mIds)))).map((r) => r.id) : [])
  const studio = await fetchStudio()
  const gstRate = studio.gstRegistered === false && !i.chargesGst ? 0 : studio.gstPct
  const t = poTotals(lines, i.chargesGst, gstRate)
  if (t.totalMinor <= 0) return { error: 'A PO for S$0.00 has nothing to send' }
  const advanceValue = i.advanceKind === 'fixed' ? Math.round(Number(i.advanceValue) || 0) : Number(i.advanceValue) || 0
  if (i.advanceKind === 'pct' && (advanceValue <= 0 || advanceValue > 100)) return { error: 'An advance is between 1% and 100%' }
  if (i.advanceKind === 'fixed' && (advanceValue <= 0 || advanceValue > t.totalMinor)) return { error: `An advance is more than S$0 and no more than the ${moneyWords(t.totalMinor)} total` }
  const advanceMinor = advanceOf(i.advanceKind, advanceValue, t.totalMinor)
  const now = new Date()
  const cols = {
    vendorId: v.id, title: trim(i.title, 120), subtotalMinor: t.subtotalMinor, gstMinor: t.gstMinor, totalMinor: t.totalMinor, chargesGst: i.chargesGst, gstRate: i.chargesGst ? gstRate : 0,
    advanceKind: i.advanceKind, advanceValue: i.advanceKind === 'none' ? 0 : advanceValue, advanceMinor, terms: i.terms, termsText: i.terms === 'custom' ? trim(i.termsText, 120) : null,
    expectedOn: i.expectedOn ? new Date(i.expectedOn) : null, deliveryAddress: trim(i.deliveryAddress, 200), vendorNote: trim(i.vendorNote, NOTE_MAX), updatedBy: c.viewer.id, updatedAt: now,
    billTo: trim(i.billTo, 300),   // (parity map, MO-011)
  }
  const lineRows = (poId: string) => lines.map((l, k) => ({
    id: randomUUID(), poId, position: k, description: l.description, category: trim(l.category, 60), qty: l.qty, unit: trim(l.unit, 20), unitMinor: l.unitMinor,
    amountMinor: lineAmount(l.qty, l.unitMinor), quoteItemId: l.quoteItemId && okQ.has(l.quoteItemId) ? l.quoteItemId : null, milestoneId: l.milestoneId && okM.has(l.milestoneId) ? l.milestoneId : null,
  }))
  const waits = poWaits(c.viewer, await fetchCostRules(), { totalMinor: t.totalMinor, advanceMinor })
  if (before) {
    const back = before.state === 'changes' || before.state === 'declined'
    await db.transaction(async (tx) => {
      await tx.update(purchaseOrders).set({ ...cols, ...(back ? { status: 'draft', vendorAnswer: null, vendorAnswerNote: null, vendorAnsweredAt: null, answerVia: null, answerMarkedBy: null, approvedBy: null, approvedAt: null } : {}) }).where(eq(purchaseOrders.id, before.po.id))
      await tx.delete(purchaseOrderLines).where(eq(purchaseOrderLines.poId, before.po.id))
      if (lines.length) await tx.insert(purchaseOrderLines).values(lineRows(before.po.id))
    })
    await logCost(c, 'project_po_edited', { id: before.po.id, title: before.po.number, vendor: v.name, to: moneyWords(t.totalMinor), from: moneyWords(before.po.totalMinor) })
    touchCosts(c.p)
    return { id: before.po.id, number: before.po.number, waits }
  }
  const [rules, numbers] = await Promise.all([fetchCostRules(), fetchPoNumbers()])
  const id = randomUUID()
  const number = nextPoNumber(rules.numbering, numbers, now)
  const [q] = c.p.quoteId ? await db.select({ e: quotes.issuingEntity }).from(quotes).where(eq(quotes.id, c.p.quoteId)).limit(1) : []
  await db.transaction(async (tx) => {
    await tx.insert(purchaseOrders).values({ id, projectId: i.projectId, number, status: 'draft', ...cols, issuingEntity: q?.e ?? null, vendorToken: newShareToken(), createdBy: c.viewer.id, createdAt: now })
    if (lines.length) await tx.insert(purchaseOrderLines).values(lineRows(id))
  })
  await logCost(c, 'project_po_created', { id, title: number, vendor: v.name, to: moneyWords(t.totalMinor) })
  touchCosts(c.p)
  return { id, number, waits }
}

/** A copy of a PO as a new Draft (1.0 G-369) — the same vendor, lines and terms, a new number and link. */
export async function duplicatePo(poId: string): Promise<{ id: string; number: string } | Refusal> {
  const c = await forPo(poId); if (isRefusal(c)) return c
  if (!prepares(c)) return { error: PO_RULE }
  if (c.po.external) return { error: 'A PO made elsewhere isn’t copied — record the next one as it comes' }
  const shut = completedBlock(c.p.stage, 'money'); if (shut) return { error: shut }
  const lines = await db.select().from(purchaseOrderLines).where(eq(purchaseOrderLines.poId, poId)).orderBy(asc(purchaseOrderLines.position))
  const [rules, numbers] = await Promise.all([fetchCostRules(), fetchPoNumbers()])
  const id = randomUUID(), now = new Date()
  const number = nextPoNumber(rules.numbering, numbers, now)
  const o = c.po
  await db.transaction(async (tx) => {
    await tx.insert(purchaseOrders).values({
      id, projectId: o.projectId, vendorId: o.vendorId, number, status: 'draft', title: o.title, subtotalMinor: o.subtotalMinor, gstMinor: o.gstMinor, totalMinor: o.totalMinor, chargesGst: o.chargesGst, gstRate: o.gstRate,
      advanceKind: o.advanceKind, advanceValue: o.advanceValue, advanceMinor: o.advanceMinor, terms: o.terms, termsText: o.termsText, expectedOn: o.expectedOn, deliveryAddress: o.deliveryAddress, vendorNote: o.vendorNote,
      issuingEntity: o.issuingEntity, vendorToken: newShareToken(), createdBy: c.viewer.id, createdAt: now, updatedBy: c.viewer.id, updatedAt: now, billTo: o.billTo,
    })
    if (lines.length) await tx.insert(purchaseOrderLines).values(lines.map((l) => ({ ...l, id: randomUUID(), poId: id })))
  })
  const vendor = (await db.select({ n: vendors.name }).from(vendors).where(eq(vendors.id, o.vendorId)).limit(1))[0]?.n ?? ''
  await logCost(c, 'project_po_created', { id, title: number, vendor, to: moneyWords(o.totalMinor), from: o.number })
  touchCosts(c.p)
  return { id, number }
}

/** Remove a Draft that was never sent (its number is not given again) — with Undo. */
export async function removePo(poId: string): Promise<{ ok: true; undo: { poId: string; eventId: string } } | Refusal> {
  const c = await forPo(poId); if (isRefusal(c)) return c
  if (!(c.po.external ? records(c) : prepares(c))) return { error: c.po.external ? PO_RECORD_RULE : PO_RULE }
  /* (parity map, MO-038) a PO made elsewhere, recorded by mistake, is removed while nothing is paid or billed on it */
  if (c.po.external) { const why = await externalRemoveBlock(c); if (why) return { error: why } }
  else if (c.po.sentAt || !(c.state === 'draft' || c.state === 'sent_back')) return { error: c.state === 'awaiting' ? 'It is waiting for approval — take it back first' : 'Only a Draft never sent is removed — cancel a sent PO instead' }
  await db.update(purchaseOrders).set({ deletedAt: new Date(), deletedBy: c.viewer.id }).where(eq(purchaseOrders.id, poId))
  const eventId = await logCost(c, c.po.external ? kindOf('parity_b_po_unrecorded') : 'project_po_removed', { id: poId, title: c.po.number, to: moneyWords(c.po.totalMinor) })
  touchCosts(c.p)
  return { ok: true, undo: { poId, eventId } }
}
export async function undoRemovePo(u: { poId: string; eventId: string }): Promise<{ ok: true } | Refusal> {
  const [po] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, u.poId)).limit(1)
  if (!po || !po.deletedAt) return { error: PO_GONE }
  const c = await forCosts(po.projectId); if (isRefusal(c)) return c
  if (!(po.external ? records(c) : prepares(c))) return { error: po.external ? PO_RECORD_RULE : PO_RULE }
  await db.update(purchaseOrders).set({ deletedAt: null, deletedBy: null }).where(eq(purchaseOrders.id, u.poId))
  await dropLeadEvents([u.eventId])
  touchCosts(c.p)
  return { ok: true }
}

/* ── Approval (F1-Q6) ─────────────────────────────────────────────────────────────────────────────────────────────────────────── */

/** Submit a PO that must wait for an Owner or an Admin; they hear it on the bell. */
export async function submitPo(poId: string): Promise<{ ok: true } | Refusal> {
  const c = await forPo(poId); if (isRefusal(c)) return c
  if (!prepares(c)) return { error: PO_RULE }
  if (c.state !== 'draft' && c.state !== 'sent_back') return { error: c.state === 'awaiting' ? 'It is waiting for approval already' : 'Only a Draft is submitted' }
  if (!poWaits(c.viewer, await fetchCostRules(), c.po)) return { error: 'It needs no approval — send it' }
  await db.update(purchaseOrders).set({ submittedBy: c.viewer.id, submittedAt: new Date(), reviewNote: null, reviewedBy: null, reviewedAt: null }).where(eq(purchaseOrders.id, poId))
  const vendor = (await db.select({ n: vendors.name }).from(vendors).where(eq(vendors.id, c.po.vendorId)).limit(1))[0]?.n ?? 'the vendor'
  await logCost(c, 'project_po_submitted', { id: poId, title: c.po.number, vendor, to: moneyWords(c.po.totalMinor) })
  /* (simplify S-10 · F1 F3) the approvers' bell lands on the row they act on — Finance › To do — with the margin against the quote in view */
  await notify('po_review', await studioRunnerIds(), { title: `Purchase order ${c.po.number} needs your approval`, body: `${vendor} · ${moneyWords(c.po.totalMinor)} · ${c.p.name}`, href: todoHref(poId), leadId: c.p.leadId, fields: { '{po}': c.po.number, '{vendor}': vendor } })
  touchCosts(c.p)
  return { ok: true }
}
/** Take a submission back (its maker, or anyone who prepares it). */
export async function withdrawPo(poId: string): Promise<{ ok: true } | Refusal> {
  const c = await forPo(poId); if (isRefusal(c)) return c
  if (!prepares(c)) return { error: PO_RULE }
  if (c.state !== 'awaiting') return { error: 'It is not waiting for approval' }
  await db.update(purchaseOrders).set({ submittedBy: null, submittedAt: null }).where(eq(purchaseOrders.id, poId))
  await logCost(c, 'project_po_withdrawn', { id: poId, title: c.po.number })
  touchCosts(c.p)
  return { ok: true }
}
/** Send a waiting PO back with a note (an Owner or an Admin); whoever submitted it hears why. */
export async function sendBackPo(poId: string, o: { note: string }): Promise<{ ok: true } | Refusal> {
  const c = await forPo(poId); if (isRefusal(c)) return c
  if (!approvesPo(c.viewer.role)) return { error: PO_APPROVE_RULE }
  if (c.state !== 'awaiting') return { error: 'It is not waiting for approval' }
  const note = (o.note ?? '').trim().slice(0, REASON_MAX)
  if (!note) return { error: 'Say what should change' }
  const by = c.po.submittedBy
  await db.update(purchaseOrders).set({ submittedBy: null, submittedAt: null, reviewNote: note, reviewedBy: c.viewer.id, reviewedAt: new Date() }).where(eq(purchaseOrders.id, poId))
  const vendor = (await db.select({ n: vendors.name }).from(vendors).where(eq(vendors.id, c.po.vendorId)).limit(1))[0]?.n ?? 'the vendor'
  await logCost(c, 'project_po_sent_back', { id: poId, title: c.po.number, vendor, note })
  if (by) await notify('po_sent_back', [by], { title: `Purchase order ${c.po.number} was sent back`, body: note, href: href(c, poId), leadId: c.p.leadId, fields: { '{po}': c.po.number, '{vendor}': vendor, '{note}': note } })
  touchCosts(c.p)
  return { ok: true }
}

/* ── Send (F1-Q5 · Q9) ────────────────────────────────────────────────────────────────────────────────────────────────────────── */

/**
 * Send the PO: recorded as Sent, the payment's due day worked out from the terms, the vendor's link opens from now. The screen opened WhatsApp
 * on the press with the link (REG-534). One that must wait is refused — unless an Owner or an Admin sends it: their send approves it (one path).
 */
export async function sendPo(poId: string): Promise<{ number: string; dueOn: number | null; again: boolean } | Refusal> {
  const c = await forPo(poId); if (isRefusal(c)) return c
  if (!prepares(c) && !approvesPo(c.viewer.role)) return { error: PO_RULE }
  if (c.po.external) return { error: EXTERNAL_NO_LINK }
  if (c.state !== 'draft' && c.state !== 'sent_back' && c.state !== 'awaiting') return { error: c.state === 'sent' || c.state === 'accepted' || c.state === 'part_paid' ? 'It is with the vendor already — copy its link instead' : 'Change it first, then send it again' }
  const runner = approvesPo(c.viewer.role)
  if (!runner && poWaits(c.viewer, await fetchCostRules(), c.po)) return { error: 'It needs an Owner’s or an Admin’s approval first — submit it' }
  if (c.po.totalMinor <= 0) return { error: 'A PO for S$0.00 has nothing to send' }
  const [v] = await db.select().from(vendors).where(eq(vendors.id, c.po.vendorId)).limit(1)
  if (!v?.isActive) return { error: `${v?.name ?? 'The vendor'} is deactivated — reactivate it or pick another` }
  const now = new Date()
  const due = dueFromTerms(c.po.terms as PoTerms, now)
  const again = !!c.po.sentAt
  const approvedBy = c.state === 'awaiting' || runner ? c.viewer.id : null
  const submitter = c.state === 'awaiting' ? c.po.submittedBy : null
  await db.update(purchaseOrders).set({
    status: 'sent', sentBy: c.viewer.id, sentAt: now, dueOn: due, submittedBy: null, submittedAt: null, reviewNote: null, reviewedBy: null, reviewedAt: null,
    approvedBy, approvedAt: approvedBy ? now : null, vendorAnswer: null, vendorAnswerNote: null, vendorAnsweredAt: null, answerVia: null, answerMarkedBy: null, vendorViewedAt: null,
    vendorToken: c.po.vendorToken ?? newShareToken(),
  }).where(eq(purchaseOrders.id, poId))
  await logCost(c, 'project_po_sent', { id: poId, title: c.po.number, vendor: v.name, to: moneyWords(c.po.totalMinor), due: due ? displayDate(due) : termsLabel(c.po.terms as PoTerms, c.po.termsText), again, requester: submitter ? await nameOf(submitter) : undefined })
  if (submitter && submitter !== c.viewer.id) await notify('po_approved', [submitter], { title: `Purchase order ${c.po.number} was approved and sent`, body: `${v.name} · ${moneyWords(c.po.totalMinor)}`, href: href(c, poId), leadId: c.p.leadId, fields: { '{po}': c.po.number, '{vendor}': v.name } })
  touchCosts(c.p)
  return { number: c.po.number, dueOn: due ? due.getTime() : null, again }
}

/* ── The vendor's answer, marked by the studio; close; cancel (F1-Q5) ─────────────────────────────────────────────────────────── */

export type AnswerUndo = { poId: string; eventId: string; answer: string | null; note: string | null; at: number | null; via: string | null; by: string | null }
/** The vendor said yes off the link — on the phone, on WhatsApp, by email, in person. */
export async function markPoAccepted(poId: string, o: { via: string }): Promise<{ ok: true; undo: AnswerUndo } | Refusal> {
  const c = await forPo(poId); if (isRefusal(c)) return c
  if (!prepares(c)) return { error: PO_RULE }
  if (c.state !== 'sent' && c.state !== 'changes' && c.state !== 'declined') return { error: c.state === 'accepted' || c.state === 'part_paid' ? 'The vendor has accepted it already' : 'Only a sent PO is accepted' }
  if (c.po.external) return { error: 'A PO made elsewhere is accepted already' }
  if (!ANSWER_VIA.some((v) => v.value === o.via)) return { error: 'Say how the vendor said yes' }
  const undo: Omit<AnswerUndo, 'eventId'> = { poId, answer: c.po.vendorAnswer, note: c.po.vendorAnswerNote, at: c.po.vendorAnsweredAt?.getTime() ?? null, via: c.po.answerVia, by: c.po.answerMarkedBy }
  await db.update(purchaseOrders).set({ vendorAnswer: 'accepted', vendorAnswerNote: null, vendorAnsweredAt: new Date(), answerVia: o.via, answerMarkedBy: c.viewer.id }).where(eq(purchaseOrders.id, poId))
  const vendor = (await db.select({ n: vendors.name }).from(vendors).where(eq(vendors.id, c.po.vendorId)).limit(1))[0]?.n ?? 'The vendor'
  const eventId = await logCost(c, 'project_po_answered', { id: poId, title: c.po.number, vendor, answer: 'accepted', via: o.via })
  touchCosts(c.p)
  return { ok: true, undo: { ...undo, eventId } }
}
export async function undoPoAnswer(u: AnswerUndo): Promise<{ ok: true } | Refusal> {
  const c = await forPo(u.poId); if (isRefusal(c)) return c
  if (!prepares(c)) return { error: PO_RULE }
  await db.update(purchaseOrders).set({ vendorAnswer: u.answer, vendorAnswerNote: u.note, vendorAnsweredAt: u.at ? new Date(u.at) : null, answerVia: u.via, answerMarkedBy: u.by }).where(eq(purchaseOrders.id, u.poId))
  await dropLeadEvents([u.eventId])
  touchCosts(c.p)
  return { ok: true }
}

/** Cancel a PO nothing is paid on, with a reason the vendor reads on its link — with Undo. */
export async function cancelPo(poId: string, o: { reason: string }): Promise<{ ok: true; undo: { poId: string; eventId: string } } | Refusal> {
  const c = await forPo(poId); if (isRefusal(c)) return c
  if (!prepares(c)) return { error: PO_RULE }
  if (c.state === 'cancelled' || c.state === 'closed') return { error: `It is ${c.state} already` }
  if (c.paid > 0) return { error: 'Something is paid on it — an Owner or an Admin closes it instead' }
  if (!c.po.sentAt) return { error: 'A Draft never sent is removed, not cancelled' }
  if (c.po.external) return { error: 'A PO made elsewhere is removed, not cancelled — it has no link to say so' }
  const reason = (o.reason ?? '').trim().slice(0, REASON_MAX)
  if (!reason) return { error: 'Say why it is cancelled' }
  await db.update(purchaseOrders).set({ status: 'cancelled', cancelledAt: new Date(), cancelledBy: c.viewer.id, cancelReason: reason, submittedAt: null, submittedBy: null }).where(eq(purchaseOrders.id, poId))
  const vendor = (await db.select({ n: vendors.name }).from(vendors).where(eq(vendors.id, c.po.vendorId)).limit(1))[0]?.n ?? 'the vendor'
  const eventId = await logCost(c, 'project_po_cancelled', { id: poId, title: c.po.number, vendor, reason })
  touchCosts(c.p)
  return { ok: true, undo: { poId, eventId } }
}
export async function undoCancelPo(u: { poId: string; eventId: string }): Promise<{ ok: true } | Refusal> {
  const c = await forPo(u.poId); if (isRefusal(c)) return c
  if (!prepares(c)) return { error: PO_RULE }
  if (c.po.status !== 'cancelled') return { error: 'It is not cancelled' }
  await db.update(purchaseOrders).set({ status: 'sent', cancelledAt: null, cancelledBy: null, cancelReason: null }).where(eq(purchaseOrders.id, u.poId))
  await dropLeadEvents([u.eventId])
  touchCosts(c.p)
  return { ok: true }
}

/** Close a PO short (an Owner or an Admin): the vendor delivered less — what is left is not owed. A PO paid in full closes by itself. */
export async function closePo(poId: string, o: { note: string }): Promise<{ ok: true; undo: { poId: string; eventId: string } } | Refusal> {
  const c = await forPo(poId); if (isRefusal(c)) return c
  if (!paysOut(c.viewer.role)) return { error: PAY_RULE }
  if (c.state !== 'sent' && c.state !== 'accepted' && c.state !== 'part_paid') return { error: c.state === 'closed' ? 'It is closed already' : 'Only a PO with the vendor is closed' }
  const note = (o.note ?? '').trim().slice(0, REASON_MAX)
  if (!note) return { error: 'Say why what is left isn’t owed' }
  await db.update(purchaseOrders).set({ status: 'closed', closedAt: new Date(), closedBy: c.viewer.id, closeNote: note }).where(eq(purchaseOrders.id, poId))
  const vendor = (await db.select({ n: vendors.name }).from(vendors).where(eq(vendors.id, c.po.vendorId)).limit(1))[0]?.n ?? 'the vendor'
  const eventId = await logCost(c, 'project_po_closed', { id: poId, title: c.po.number, vendor, note, to: moneyWords(c.paid) })
  touchCosts(c.p)
  return { ok: true, undo: { poId, eventId } }
}
export async function undoClosePo(u: { poId: string; eventId: string }): Promise<{ ok: true } | Refusal> {
  const c = await forPo(u.poId); if (isRefusal(c)) return c
  if (!paysOut(c.viewer.role)) return { error: PAY_RULE }
  if (c.po.status !== 'closed') return { error: 'It is not closed' }
  await db.update(purchaseOrders).set({ status: 'sent', closedAt: null, closedBy: null, closeNote: null }).where(eq(purchaseOrders.id, u.poId))
  await dropLeadEvents([u.eventId])
  touchCosts(c.p)
  return { ok: true }
}

/** The PO's history for its panel: its Activity lines, newest first (the project's own trail — one record, two places). */
export async function poHistory(poId: string): Promise<{ at: number; kind: string; actorId: string | null; detail: Record<string, unknown> }[] | Refusal> {
  const c = await forPo(poId); if (isRefusal(c)) return c
  const rows = await db.select().from(leadEvents).where(and(eq(leadEvents.projectId, c.p.id)))
  return rows.filter((r) => (r.detail as { id?: string } | null)?.id === poId && (r.kind.startsWith('project_po_') || r.kind.startsWith('parity_b_po_'))).sort((a, b) => b.at.getTime() - a.at.getTime())
    .map((r) => ({ at: r.at.getTime(), kind: r.kind, actorId: r.actorId, detail: (r.detail ?? {}) as Record<string, unknown> }))
}


/* ── (parity map 2026-10-10) A PO made elsewhere (MO-038) · Mark delivered (MO-094 · PR-089) ───────────────────────────────────── */

const EXTERNAL_KEPT = 'A PO made elsewhere is kept as recorded — remove it and record it again'   // invented copy (parity map, MO-038)
const EXTERNAL_NO_LINK = 'A PO made elsewhere never goes to the vendor’s link'   // invented copy (parity map, MO-038)
/** The parity map's own Activity kinds (lib/leads/activity.ts region P-B reads them). */
const kindOf = (k: 'parity_b_po_recorded' | 'parity_b_po_unrecorded' | 'parity_b_po_delivered') => k as unknown as ProjectEventKind
async function externalRemoveBlock(c: PoCtx): Promise<string | null> {
  if (c.paid > 0) return 'Something is paid on it — reverse the payment first'
  const [bill] = await db.select({ id: supplierBills.id }).from(supplierBills).where(and(eq(supplierBills.poId, c.po.id), isNull(supplierBills.deletedAt))).limit(1)
  return bill ? 'A bill is recorded on it — remove the bill first' : null
}

export type ExternalPoInput = {
  projectId: string; vendorId: string
  /** its own number, as the other system (or the paper book) numbered it */ reference: string
  /** what the vendor is owed in all */ amountMinor: number; includesGst: boolean
  /** the day it was made (a day) */ madeOn: number
  title: string | null
  /** its file — the PDF or a photo of it */ file: PickedDoc | null
}
/**
 * (parity map, MO-038 — 1.0's "Upload PO", G-338 · G-344) Record a purchase order made outside OpenMaison: its vendor, its own number, its amount
 * (GST in it or not), the day and its file. It is a PO like any other from then on — it counts in the costs as committed, takes bills and payments,
 * closes when paid — marked *Recorded*, and never goes to the vendor's link (it has none). The project's team records it; no approval (it is made
 * already). Its own number keeps the studio's PO numbers untouched (fetchPoNumbers leaves it out).
 */
export async function recordExternalPo(i: ExternalPoInput): Promise<{ id: string; number: string } | Refusal> {
  const c = await forCosts(i.projectId); if (isRefusal(c)) return c
  if (!records(c)) return { error: PO_RECORD_RULE }
  const shut = completedBlock(c.p.stage, 'money'); if (shut) return { error: shut }
  const [v] = await db.select().from(vendors).where(eq(vendors.id, i.vendorId)).limit(1)
  if (!v || v.mergedInto) return { error: 'Pick the vendor again — that one is not in the directory' }
  if (!v.isActive) return { error: `${v.name} is deactivated — pick another, or reactivate it in Finance › Vendors` }
  const number = trim(i.reference, REF_MAX)
  if (!number) return { error: 'Enter the PO’s own number' }
  const [twin] = await db.select({ id: purchaseOrders.id }).from(purchaseOrders).where(eq(purchaseOrders.number, number)).limit(1)
  if (twin) return { error: `A PO numbered ${number} is recorded already` }
  const amount = Math.round(Number(i.amountMinor) || 0)
  if (!(amount > 0)) return { error: 'Enter what the PO comes to' }
  const madeOn = i.madeOn ? new Date(i.madeOn) : null
  const day = madeOn ? new Date(madeOn.getFullYear(), madeOn.getMonth(), madeOn.getDate()) : null
  if (!day || day.getTime() > Date.now()) return { error: 'Pick the day it was made — today or before' }
  if (!i.file) return { error: 'Add the PO’s file — its PDF or a photo' }
  const why = docProblem(i.file); if (why) return { error: why }
  const studio = await fetchStudio()
  const rate = i.includesGst && studio.gstPct > 0 ? studio.gstPct : 0
  const gstMinor = rate ? gstInside(amount, rate) : 0
  const [q] = c.p.quoteId ? await db.select({ e: quotes.issuingEntity }).from(quotes).where(eq(quotes.id, c.p.quoteId)).limit(1) : []
  const id = randomUUID(), docId = randomUUID(), now = new Date()
  const m = DATA_URL.exec(i.file.dataUrl)!
  await db.transaction(async (tx) => {
    await tx.insert(purchaseOrders).values({
      id, projectId: i.projectId, vendorId: v.id, number, status: 'sent', title: trim(i.title, 120), subtotalMinor: amount - gstMinor, gstMinor, totalMinor: amount, chargesGst: rate > 0, gstRate: rate,
      advanceKind: 'none', advanceValue: 0, advanceMinor: 0, terms: 'custom', termsText: 'As agreed', dueOn: null,
      issuingEntity: q?.e ?? null, vendorToken: null, createdBy: c.viewer.id, createdAt: now, updatedBy: c.viewer.id, updatedAt: now,
      sentBy: c.viewer.id, sentAt: day, approvedBy: c.viewer.id, approvedAt: now, vendorAnswer: 'accepted', vendorAnsweredAt: day, answerVia: 'elsewhere', answerMarkedBy: c.viewer.id,
      external: true, externalRef: number, externalFileId: docId,
    })
    const thumb = i.file!.thumb && /^data:image\/(jpeg|png|webp);base64,/.test(i.file!.thumb) && i.file!.thumb.length < 600_000 ? i.file!.thumb : null
    await tx.insert(costDocuments).values({ id: docId, recordKind: 'po', recordId: id, name: i.file!.name.slice(0, 160), mime: m[1]!.toLowerCase(), sizeBytes: dataUrlSize(i.file!.dataUrl), data: i.file!.dataUrl, thumb, createdBy: c.viewer.id, createdAt: now })
  })
  await logCost(c, kindOf('parity_b_po_recorded'), { id, title: number, vendor: v.name, to: moneyWords(amount) })
  touchCosts(c.p)
  return { id, number }
}

export type DeliveredUndo = { poId: string; eventId: string }
/** (parity map, MO-094 · PR-089) Mark a PO delivered — its late-delivery row and bell end. The project's team (and Owners and Admins); with Undo. */
export async function markPoDelivered(poId: string): Promise<{ ok: true; undo: DeliveredUndo } | Refusal> {
  const c = await forPo(poId); if (isRefusal(c)) return c
  if (!records(c)) return { error: PO_RECORD_RULE }
  if (!binds(c.state)) return { error: 'Only a PO with the vendor is delivered — send it first' }   // invented copy (parity map, MO-094)
  if (c.po.deliveredAt) return { error: 'It is marked delivered already' }
  await db.update(purchaseOrders).set({ deliveredAt: new Date(), deliveredBy: c.viewer.id }).where(eq(purchaseOrders.id, poId))
  const vendor = (await db.select({ n: vendors.name }).from(vendors).where(eq(vendors.id, c.po.vendorId)).limit(1))[0]?.n ?? 'the vendor'
  const eventId = await logCost(c, kindOf('parity_b_po_delivered'), { id: poId, title: c.po.number, vendor, due: c.po.expectedOn ? displayDate(c.po.expectedOn) : undefined })
  touchCosts(c.p)
  return { ok: true, undo: { poId, eventId } }
}
export async function undoPoDelivered(u: DeliveredUndo): Promise<{ ok: true } | Refusal> {
  const c = await forPo(u.poId); if (isRefusal(c)) return c
  if (!records(c)) return { error: PO_RECORD_RULE }
  await db.update(purchaseOrders).set({ deliveredAt: null, deliveredBy: null }).where(eq(purchaseOrders.id, u.poId))
  await dropLeadEvents([u.eventId])
  touchCosts(c.p)
  return { ok: true }
}
