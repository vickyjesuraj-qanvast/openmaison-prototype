'use server'

import { seesCost } from '@/lib/settings/cost-visibility'   // (pending modules S41b-1)
import { requirePlan } from '@/lib/credits/plan-gate'
import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { and, asc, eq, inArray, isNotNull, isNull, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { creditNotes, leadAssignees, leadEvents, leadFiles, leads, members, notifications, projectInvoices, projectMilestones, projectPayments, projects, quoteItems, quotes, settings, type ProjectInvoice } from '@/lib/db/schema'
import { fetchLeadActivity } from '@/lib/leads/activity'   // (simplify S-08) an invoice's history, in Activity's words
import { canOpenLead, fetchViewer } from '@/lib/leads/visibility'
import { revalidateLead } from '@/lib/leads/queries'
import { runsStudio, type Viewer } from '@/lib/leads/assign-policy'
import { notify } from '@/lib/notifications/emit'
import { moneyRunnerIds, studioRunnerIds } from '@/lib/notifications/queries'
import { fetchStudio } from '@/lib/settings/queries'
import { insertVariationOrder } from '@/lib/projects/draft-variation'   // (simplify round 2, R2-A) the insert, drafted as a named member
import { lineTotalMinor, money2, parseDiscounts, quoteTotals } from '@/lib/quotes/math'
import { displayDate, titleCaseName } from '@/lib/format'
import { logProjectEvent, type ProjectEventKind } from '@/lib/projects/events'
import { seesMoney } from '@/lib/projects/policy'
import { CHANGE_RULE, mayChangeProject } from '@/lib/projects/policy'
import { amountSentence, billGstRate, gstOf, isApprovedVariation, VARIANCE_TOLERANCE_MINOR, expectedFor, APPROVAL_VIA } from '@/lib/projects/money'
import { fetchInvoiceNumbering, fetchInvoiceRules, fetchInvoiceRulesStored, moneyInputOf, nextNumberFor } from '@/lib/projects/money-queries'
import type { InvoiceLine } from '@/lib/projects/money'
import { newShareToken } from '@/lib/projects/invoices-token'
import { fileMoneyDoc, fileProof } from '@/lib/projects/payments'
import { DESCRIPTION_MAX, NOTE_MAX, REF_MAX, TITLE_MAX, approverRemindBlock, cleanLines, dueOf, isOneOffReason, itemiseBlock, itemiseGap, itemiseWords, linesProblem, linesTotals, parseLines, reasonLabel } from '@/lib/projects/invoices-kinds'
import { parsePaperSettings, INVOICE_PAPER_KEY, type PaperSettings } from '@/lib/projects/invoices-paper'
import { parseProjectSplit } from '@/lib/projects/model'
import { applyRebalance, draftInvoicesFor, draftVariationInvoice, onVariationApproved, restoreAmounts, undoVariationApproved, type AmountsUndo } from '@/lib/projects/invoices'
import { moneyPaymentsOf } from '@/lib/projects/payments-records'   // (Projects round 6) a paid invoice is never voided
import {
  APPROVE_RULE, INVOICE_NUMBERING_KEY, INVOICE_RULES_KEY, MARK_RULE, MONEY_RULE, SEND_RULE, SETTINGS_RULE, TERMS_MAX, VOID_RULE,
  approvesInvoices, marksVariationApproved, parseInvoiceNumbering, parseInvoiceRules, preparesInvoices, sendsAtOnce, voidsInvoices,
  type InvoiceRules,
} from '@/lib/projects/invoices-model'
import type { ProjectNumbering } from '@/lib/projects/model'
import { completedBlock } from '@/lib/projects/handover-model'
import { tellInvoiceSent } from '@/lib/portal/client-tells'   // (gaps build H)
import { syncPreparedSnapshot } from '@/lib/quotes/prepared-server'   // (pending modules S04)
import { confirmKeyOf, confirmPath } from '@/lib/quotes/confirm'
import { workspaceRefusal } from '@/lib/settings/desk'   // (S45C) the workspace's role rule

/*
 * (Projects round 5 — money in, part one) The Money tab's actions. Who sees a project is its lead's rule (`canOpenLead`); who sees and moves
 * its money is the project's team, Owners and Admins (F-17); who sends an invoice follows Settings › Projects › Invoices need approval (F-05);
 * who voids one and who records a client's approval given elsewhere is an Owner or an Admin (F-18 · F-07). Every refusal answers
 * `{ error: <the rule> }`; every step writes its `project_*` event so Activity reads the whole trail.
 */
type Refusal = { error: string }
const NOT_FOUND = 'This project is not there any more'
const GONE = 'This invoice is not there any more'
const isRefusal = (x: unknown): x is Refusal => !!x && typeof x === 'object' && 'error' in x

type Ctx = { p: typeof projects.$inferSelect; viewer: Viewer; team: string[]; client: string }
/** The project, after the viewer's two checks: they may see it (the lead's rule) and its money (F-17). */
async function forMoney(projectId: string): Promise<Ctx | Refusal> {
  const [row] = await db.select({ p: projects, name: leads.name }).from(projects).innerJoin(leads, eq(leads.id, projects.leadId)).where(and(eq(projects.id, projectId), isNull(projects.deletedAt))).limit(1)
  if (!row) return { error: NOT_FOUND }
  const viewer = await fetchViewer()
  if (!(await canOpenLead(viewer, row.p.leadId))) return { error: NOT_FOUND }
  const team = (await db.select({ memberId: leadAssignees.memberId }).from(leadAssignees).where(eq(leadAssignees.leadId, row.p.leadId))).map((r) => r.memberId)
  if (!seesMoney(viewer, team)) return { error: MONEY_RULE }
  const shut = completedBlock(row.p.stage, 'money'); if (shut) return { error: shut }   // (Projects round 7, Q-24) a completed project's money is read-only
  return { p: row.p, viewer, team, client: titleCaseName(row.name) }
}
async function forInvoice(invoiceId: string): Promise<(Ctx & { i: ProjectInvoice }) | Refusal> {
  const [i] = await db.select().from(projectInvoices).where(eq(projectInvoices.id, invoiceId)).limit(1)
  if (!i) return { error: GONE }
  const c = await forMoney(i.projectId)
  return isRefusal(c) ? c : { ...c, i }
}
function touch(p: { id: string; leadId: string }) {
  revalidatePath('/projects', 'layout')
  revalidatePath(`/projects/${p.id}/money`)
  revalidateLead(p.leadId)
}
const nameOf = async (id: string | null | undefined) => (id ? (await db.select({ name: members.name }).from(members).where(eq(members.id, id)).limit(1))[0]?.name ?? 'Someone' : 'Someone')
const moneyHref = (projectId: string, invoiceId?: string) => `/projects/${projectId}/money${invoiceId ? `?open=${encodeURIComponent(invoiceId)}` : ''}`
const log = (c: Ctx, kind: ProjectEventKind, detail: Parameters<typeof logProjectEvent>[4]) => logProjectEvent(db, c.p.leadId, c.p.id, kind, { name: c.p.name, number: c.p.number, ...detail })

/* ── Variation orders (F-06 · F-07) ──────────────────────────────────────────────────────────────────────────────────────────── */

/**
 * New variation order: a quote in variation mode on the project — numbered VO-1, VO-2… per project, raised under the signed quote's
 * issuing entity and template, its GST as the contract's, no payment schedule of its own (the rebalance carries its money into the unsent
 * invoices). The editor opens on it; omissions are lines with a minus quantity.
 * (simplify round 2, R2-A) The gate stays here — the viewer sees the project and its money and may change it; the insert is
 * lib/projects/draft-variation.ts `insertVariationOrder`, drafted as this viewer (the client's pick drafts through the same function as the
 * project's own member — a server action can't take a "system" flag safely).
 */
export async function createVariationOrder(projectId: string): Promise<{ id: string; number: string } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forMoney(projectId); if (isRefusal(c)) return c
  if (!mayChangeProject(c.viewer, c.team)) return { error: CHANGE_RULE }
  return insertVariationOrder(c.p.id, { memberId: c.viewer.id })
}

export type VariationUndo = {
  quoteId: string; status: string; visibility: string; sentAt: number | null; clientSentAt: number | null
  confirmedAt: number | null; confirmedBy: string | null; confirmedVia: string | null; confirmedMarkedBy: string | null
  amounts: AmountsUndo; eventIds: string[]; raisedAt: number
}
/**
 * (F-07) Mark as approved by the client — an approval given in person, on WhatsApp, by email or on paper, with the day it was given (the
 * contracts' Mark as signed). The variation order is Confirmed as the link would confirm it; the contract value moves and the unsent Drafts
 * are re-sized (F-08). Answers the sentence and what Undo needs.
 */
export async function markVariationApproved(quoteId: string, o: { on: number; via: string }): Promise<{ sentence: string; undo: VariationUndo } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const [q] = await db.select().from(quotes).where(and(eq(quotes.id, quoteId), isNull(quotes.deletedAt))).limit(1)
  if (!q || q.kind !== 'variation' || !q.projectId) return { error: 'This variation order is not there any more' }
  const c = await forMoney(q.projectId); if (isRefusal(c)) return c
  if (!marksVariationApproved(c.viewer.role)) return { error: MARK_RULE }
  if (isApprovedVariation(q.status)) return { error: `${q.number} is already approved` }
  if (!q.amountMinor) return { error: `${q.number} changes nothing yet — add its lines first` }   // (fix-D, D-17) nothing to approve
  if (!APPROVAL_VIA.some((v) => v.value === o.via)) return { error: 'Say how the client approved it' }
  const on = new Date(typeof o.on === 'number' && Number.isFinite(o.on) ? Math.min(o.on, Date.now()) : Date.now())
  const ms = (d: Date | null) => (d ? d.getTime() : null)
  const before = { quoteId, status: q.status, visibility: q.visibility, sentAt: ms(q.sentAt), clientSentAt: ms(q.clientSentAt), confirmedAt: ms(q.confirmedAt), confirmedBy: q.confirmedBy, confirmedVia: q.confirmedVia, confirmedMarkedBy: q.confirmedMarkedBy }
  await db.update(quotes).set({ status: 'Confirmed', confirmedAt: on, confirmedBy: c.client, confirmedVia: o.via, confirmedMarkedBy: c.viewer.id, sentAt: q.sentAt ?? on, clientSentAt: q.clientSentAt ?? on, visibility: 'Shared', updatedAt: new Date() }).where(eq(quotes.id, quoteId))
  await syncPreparedSnapshot(quoteId)   // (pending modules S04) approved: the order keeps its preparer
  const r = await onVariationApproved(quoteId, { by: c.client, via: o.via, actorId: c.viewer.id, at: new Date() })
  touch(c.p); revalidatePath(`/quotes/${quoteId}`); revalidatePath(confirmPath(confirmKeyOf(q)))
  return { sentence: r ? `${q.number} approved — ${r.sentence.replace(/^The contract is now/, 'the contract is now')}` : `${q.number} approved`, undo: { ...before, amounts: r?.undo ?? [], eventIds: r?.eventIds ?? [], raisedAt: r?.raisedAt ?? Date.now() } }
}
/** The approval's Undo: the variation order back as it was, the Drafts back to their amounts, the trail and the bell rows it raised gone. */
export async function undoVariationApproval(undo: VariationUndo): Promise<{ ok: true } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const [q] = await db.select().from(quotes).where(eq(quotes.id, undo?.quoteId ?? '')).limit(1)
  if (!q || q.kind !== 'variation' || !q.projectId) return { error: 'Nothing to undo' }
  const c = await forMoney(q.projectId); if (isRefusal(c)) return c
  if (!marksVariationApproved(c.viewer.role)) return { error: MARK_RULE }
  const d = (n: number | null) => (typeof n === 'number' && Number.isFinite(n) ? new Date(n) : null)
  const s = (v: string | null) => (typeof v === 'string' ? v.slice(0, 200) : null)
  await db.update(quotes).set({ status: typeof undo.status === 'string' ? undo.status.slice(0, 40) : 'Draft', visibility: undo.visibility === 'Shared' ? 'Shared' : 'Private', sentAt: d(undo.sentAt), clientSentAt: d(undo.clientSentAt), confirmedAt: d(undo.confirmedAt), confirmedBy: s(undo.confirmedBy), confirmedVia: s(undo.confirmedVia), confirmedMarkedBy: s(undo.confirmedMarkedBy), updatedAt: new Date() }).where(eq(quotes.id, q.id))
  await undoVariationApproved(q.projectId, q.id, { undo: undo.amounts ?? [], eventIds: undo.eventIds ?? [], raisedAt: undo.raisedAt })
  await syncPreparedSnapshot(q.id)   // (pending modules S04)
  touch(c.p); revalidatePath(`/quotes/${q.id}`)
  return { ok: true }
}

/* ── The rebalance on demand (F-08) — when the Drafts no longer add up (a value changed, an order revised) ───────────────────── */

export async function rebalanceProject(projectId: string): Promise<{ sentence: string; undo: AmountsUndo; eventId: string | null } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forMoney(projectId); if (isRefusal(c)) return c
  if (!preparesInvoices(c.viewer, c.team)) return { error: SEND_RULE }
  const r = await applyRebalance(projectId)
  const eventId = r.changes.length ? await log(c, 'project_money_rebalanced', { n: r.changes.length, names: r.changes.map((x) => x.stageName), to: money2(r.contractMinor) }) : null
  touch(c.p)
  return { sentence: r.sentence, undo: r.undo, eventId }
}
export async function undoRebalance(projectId: string, o: { undo: AmountsUndo; eventId: string | null }): Promise<{ ok: true } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forMoney(projectId); if (isRefusal(c)) return c
  if (!preparesInvoices(c.viewer, c.team)) return { error: SEND_RULE }
  await restoreAmounts(projectId, o.undo ?? [])
  if (o.eventId) await db.delete(leadEvents).where(and(eq(leadEvents.id, o.eventId), eq(leadEvents.projectId, projectId)))
  touch(c.p)
  return { ok: true }
}

/* ── Invoices (F-04 · F-05 · F-09 · F-13 · F-14 · F-18) ──────────────────────────────────────────────────────────────────────── */

/** (F-05) Submit for approval — a Designer's or a Manager's invoice while approval is on; the Owners and Admins hear it. */
export async function submitInvoice(invoiceId: string): Promise<{ ok: true } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forInvoice(invoiceId); if (isRefusal(c)) return c
  if (!preparesInvoices(c.viewer, c.team)) return { error: SEND_RULE }
  if (c.i.status !== 'draft') return { error: `${c.i.number ?? 'This invoice'} is already ${c.i.status === 'void' ? 'void' : 'sent'}` }
  if (c.i.submittedAt) return { ok: true }
  if (c.i.amountMinor <= 0) return { error: 'An invoice for S$0.00 has nothing to send' }
  const now = new Date()
  await db.update(projectInvoices).set({ submittedBy: c.viewer.id, submittedAt: now, updatedAt: now }).where(eq(projectInvoices.id, invoiceId))
  await log(c, 'project_invoice_submitted', { id: invoiceId, stage: c.i.stageName, to: money2(c.i.amountMinor) })
  await notify('invoice_review', await studioRunnerIds(), { title: `${await nameOf(c.viewer.id)} submitted an invoice for your approval`, body: `${c.i.stageName} · ${money2(c.i.amountMinor)} — ${c.p.name}`, href: moneyHref(c.p.id, invoiceId), leadId: c.p.leadId, actorId: c.viewer.id })
  touch(c.p)
  return { ok: true }
}
/** Taking a submission back (its Undo): the invoice is a Draft again and the approvers' bell rows go. */
export async function withdrawInvoiceSubmission(invoiceId: string): Promise<{ ok: true } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forInvoice(invoiceId); if (isRefusal(c)) return c
  if (!preparesInvoices(c.viewer, c.team)) return { error: SEND_RULE }
  if (c.i.status !== 'draft' || !c.i.submittedAt) return { ok: true }
  const at = c.i.submittedAt
  await db.update(projectInvoices).set({ submittedBy: null, submittedAt: null, updatedAt: new Date() }).where(eq(projectInvoices.id, invoiceId))
  await db.delete(leadEvents).where(and(eq(leadEvents.projectId, c.p.id), eq(leadEvents.kind, 'project_invoice_submitted'), sql`${leadEvents.at} >= ${Math.floor(at.getTime() / 1000) - 2}`, sql`json_extract(${leadEvents.detail}, '$.id') = ${invoiceId}`))
  await db.delete(notifications).where(and(eq(notifications.kind, 'invoice_review'), eq(notifications.href, moneyHref(c.p.id, invoiceId))))
  touch(c.p)
  return { ok: true }
}

/**
 * (F-04 · F-13 · F-14) Send: the invoice takes its number (Settings › Projects › Invoice numbers) and its due day (today + the payment
 * terms), is stamped Sent with who sent it, under the issuing entity it is raised under. The client's WhatsApp opens on the press, in the
 * browser, before this round trip (the signing link's rule). With approval on, only an Owner or an Admin sends (their Send of a submitted
 * invoice is its approval); anyone else submits.
 */
export async function sendInvoice(invoiceId: string): Promise<{ number: string; dueAt: number } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forInvoice(invoiceId); if (isRefusal(c)) return c
  if (!preparesInvoices(c.viewer, c.team) && !approvesInvoices(c.viewer.role)) return { error: SEND_RULE }
  const rules = await fetchInvoiceRules()
  if (!sendsAtOnce(c.viewer.role, rules)) return { error: APPROVE_RULE }
  if (c.i.status === 'sent' && c.i.number && c.i.dueAt) return { number: c.i.number, dueAt: c.i.dueAt.getTime() }   // sent again: the same number and due
  if (c.i.status !== 'draft') return { error: 'A void invoice is not sent — its fresh Draft is' }
  if (c.i.amountMinor <= 0) return { error: 'An invoice for S$0.00 has nothing to send' }
  const now = new Date()
  const input = await moneyInputOf(c.p)
  /* (parity map, MI-031) an itemised stage invoice goes only while its lines add up to it (its amount may have moved since: a re-size, an edit) */
  const linesWhy = c.i.kind === 'stage' ? itemiseBlock({ kind: 'stage', lines: parseLines(c.i.linesJson), amountMinor: c.i.amountMinor }, billGstRate(input, c.i)) : null; if (linesWhy) return { error: linesWhy }
  /* (gaps build B, item 12) the number of its issuing entity's own pattern, else the studio-wide one; (item 4) its own due day — the day picked
     on the Draft, the project's handover day, else the payment terms */
  const entity = c.i.issuingEntity ?? input.quote?.issuingEntity ?? null
  const number = await nextNumberFor(entity, now)
  const dueAt = dueOf({ dueMode: c.i.dueMode === 'date' || c.i.dueMode === 'handover' ? c.i.dueMode : null, dueOn: c.i.dueOn ? c.i.dueOn.getTime() : null }, { sentAt: now, termsDays: rules.termsDays, handoverDay: c.p.targetEndDate ? c.p.targetEndDate.getTime() : null })
  const approvedBy = c.i.submittedAt && c.i.submittedBy !== c.viewer.id ? c.i.submittedBy : null
  /* (fix-D, D-02 · F-08) the contract it is raised on, stamped: a sent invoice never changes, so its paper keeps the value it was issued against */
  const variationsMinor = input.variations.filter((v) => isApprovedVariation(v.status)).reduce((s, v) => s + v.amountMinor, 0)
  const baseMinor = input.baseMinor ?? 0
  await db.update(projectInvoices).set({
    number, status: 'sent', sentBy: c.viewer.id, sentAt: now, dueAt, gstMinor: c.i.kind === 'one_off' ? c.i.gstMinor : gstOf(c.i.amountMinor, billGstRate(input, c.i)),   // (gaps build B) a one-off's GST is its lines'
    issuingEntity: entity, reviewNote: null, updatedAt: now,
    contractMinor: Math.max(0, baseMinor + variationsMinor), baseMinor, variationsMinor,
    shareToken: c.i.shareToken ?? newShareToken(),   // (gaps build B, item 6) its no-login link — given with the Draft, so the message carried it
    ...(c.i.submittedAt ? { reviewedBy: c.viewer.id, reviewedAt: now } : {}),
  }).where(eq(projectInvoices.id, invoiceId))
  /* (gaps build B, item 6 — 1.0 G-294) filed in Files › Payments as "{number} · {stage}.pdf", its entry opening this invoice (the receipts' rule) */
  if (!c.i.fileId) { const fileId = await fileMoneyDoc(c.p.leadId, c.viewer.id, { number, stage: c.i.stageName, at: now }); await db.update(projectInvoices).set({ fileId }).where(eq(projectInvoices.id, invoiceId)) }
  /* (fix-D, D-31) the next number is read from the highest given under the prefix (`nextInvoiceNumber`) — Settings › Next number stays what an
     Owner typed, never filled in by a send */
  await log(c, 'project_invoice_sent', { id: invoiceId, stage: c.i.stageName, title: number, to: money2(c.i.amountMinor), due: displayDate(dueAt), ...(approvedBy ? { memberId: approvedBy } : {}) })
  await tellInvoiceSent(invoiceId)   // (gaps build H, H-Q17) the client hears of it by email / WhatsApp, as the studio's switches say
  /* (parity map, UC-098 — 1.0's "Invoice Sent" to Owners and Admins) whenever an invoice goes to the client, the studio's runners hear it —
     never the one who sent it (`notify` leaves the actor out) */
  await notify('invoice_sent', await moneyRunnerIds(), /* (parity map, FB-114) Accounting hears it too */ { title: `${await nameOf(c.viewer.id)} sent ${number} to ${c.client}`, body: `${c.i.stageName} · ${money2(c.i.amountMinor)} — ${c.p.name}, due ${displayDate(dueAt)}`,
    href: moneyHref(c.p.id, invoiceId), leadId: c.p.leadId, actorId: c.viewer.id, fields: { '{invoice}': number } })
  if (approvedBy) {
    await db.delete(notifications).where(and(eq(notifications.kind, 'invoice_review'), eq(notifications.href, moneyHref(c.p.id, invoiceId))))
    /* (fix-D, D-18 · F-05) the quotes' approval pattern: whoever submitted it hears that it was approved and sent */
    await notify('invoice_approved', [approvedBy], { title: `${await nameOf(c.viewer.id)} approved and sent your invoice ${number}`, body: `${c.i.stageName} · ${money2(c.i.amountMinor)} — ${c.p.name}`, href: moneyHref(c.p.id, invoiceId), leadId: c.p.leadId, actorId: c.viewer.id })
  }
  touch(c.p)
  return { number, dueAt: dueAt.getTime() }
}

/** (F-05) Send back with a note — the approver's answer to a submission; the invoice is a Draft again, its author hears why. */
export async function sendBackInvoice(invoiceId: string, o: { note: string }): Promise<{ ok: true } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forInvoice(invoiceId); if (isRefusal(c)) return c
  if (!approvesInvoices(c.viewer.role)) return { error: APPROVE_RULE }
  if (c.i.status !== 'draft' || !c.i.submittedAt) return { error: 'This invoice is not waiting for approval' }
  const note = (o?.note ?? '').trim().slice(0, 300)
  if (!note) return { error: 'Say what should change' }
  const now = new Date()
  const author = c.i.submittedBy
  await db.update(projectInvoices).set({ submittedBy: null, submittedAt: null, reviewNote: note, reviewedBy: c.viewer.id, reviewedAt: now, updatedAt: now }).where(eq(projectInvoices.id, invoiceId))
  await log(c, 'project_invoice_sent_back', { id: invoiceId, stage: c.i.stageName, note, ...(author ? { memberId: author } : {}) })
  await db.delete(notifications).where(and(eq(notifications.kind, 'invoice_review'), eq(notifications.href, moneyHref(c.p.id, invoiceId))))
  if (author) await notify('invoice_sent_back', [author], { title: `${await nameOf(c.viewer.id)} sent your invoice back`, body: `${c.i.stageName} — “${note}”`, href: moneyHref(c.p.id, invoiceId), leadId: c.p.leadId, actorId: c.viewer.id })
  touch(c.p)
  return { ok: true }
}

/** (REG-1067) An amount change's way back: the Draft as it was (amount, GST, reason, who edited it) and the others it re-sized. */
export type AmountUndo = {
  invoiceId: string; amountMinor: number; gstMinor: number; varianceReason: string | null; editedBy: string | null; editedAt: number | null
  amounts: AmountsUndo; eventIds: string[]
}
/**
 * (F-09) A Draft's amount, edited: more than S$1 off the schedule needs a reason (kept on the invoice, "Differs from the schedule by S$x");
 * back within S$1 it follows the schedule again. A Draft waiting for approval is sent back before it changes; a sent one never changes.
 * (F-08, REG-1067) The same press re-sizes the other unsent invoices so they take the difference — the model's rebalance, as a variation
 * order's approval and a void do — and answers that in one sentence with what Undo needs (the band's *Re-size them* is for a change made
 * elsewhere: a value set on the Overview, an order revised).
 */
export async function setInvoiceAmount(invoiceId: string, o: { amountMinor: number; reason?: string | null }): Promise<{ amountMinor: number; differs: boolean; sentence: string; undo: AmountUndo } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forInvoice(invoiceId); if (isRefusal(c)) return c
  if (!preparesInvoices(c.viewer, c.team)) return { error: SEND_RULE }
  if (c.i.status !== 'draft') return { error: 'A sent invoice never changes — void it and the fresh Draft takes its share' }
  if (c.i.submittedAt) return { error: 'It is waiting for approval — an Owner or an Admin sends it back before it changes' }
  if (c.i.kind === 'one_off') return { error: 'A one-off invoice comes to its lines — change its lines instead' }   // (gaps build B)
  if (c.i.kind === 'variation') return { error: `It bills ${c.i.stageName}’s own total — revise the variation order to change it` }
  const amount = Math.round(Number(o?.amountMinor))
  if (!Number.isFinite(amount) || amount < 0 || amount > 1e11) return { error: 'Enter an amount' }
  const input = await moneyInputOf(c.p)
  const contract = Math.max(0, (input.baseMinor ?? 0) + input.variations.filter((v) => isApprovedVariation(v.status)).reduce((s, v) => s + v.amountMinor, 0))
  const expected = expectedFor(invoiceId, contract, input.invoices) ?? c.i.amountMinor
  const off = Math.abs(amount - expected) > VARIANCE_TOLERANCE_MINOR
  const reason = (o?.reason ?? '').trim().slice(0, 300)
  if (off && !reason) return { error: `It differs from the schedule by ${money2(Math.abs(amount - expected))} — say why` }
  const now = new Date()
  const was = { invoiceId, amountMinor: c.i.amountMinor, gstMinor: c.i.gstMinor, varianceReason: c.i.varianceReason, editedBy: c.i.editedBy, editedAt: c.i.editedAt ? c.i.editedAt.getTime() : null }
  await db.update(projectInvoices).set({ amountMinor: amount, gstMinor: gstOf(amount, billGstRate(input, c.i)), varianceReason: off ? reason : null, editedBy: c.viewer.id, editedAt: now, updatedAt: now }).where(eq(projectInvoices.id, invoiceId))
  const eventIds = [await log(c, 'project_invoice_edited', { id: invoiceId, stage: c.i.stageName, from: money2(c.i.amountMinor), to: money2(amount), reason: off ? reason : null })]
  /* the others take the difference (an edit back on the schedule lands on its exact share with them) */
  const r = await applyRebalance(c.p.id)
  const others = r.changes.filter((x) => x.id !== invoiceId)
  /* (fix-D, D-42) the re-size follows the edit that caused it — a second later, so Activity reads cause before effect */
  if (r.changes.length) eventIds.push(await logProjectEvent(db, c.p.leadId, c.p.id, 'project_money_rebalanced', { name: c.p.name, number: c.p.number, n: r.changes.length, names: r.changes.map((x) => x.stageName), to: money2(r.contractMinor) }, { at: new Date(now.getTime() + 1000) }))
  const final = r.changes.find((x) => x.id === invoiceId)?.toMinor ?? amount
  touch(c.p)
  return { amountMinor: final, differs: off, sentence: amountSentence(c.i.stageName, final, off, others), undo: { ...was, amounts: r.undo.filter((u) => u.id !== invoiceId), eventIds } }
}
/** (REG-1067) The amount change's Undo: the Draft back as it was, the others back to their amounts, its lines gone. */
export async function undoInvoiceAmount(undo: AmountUndo): Promise<{ ok: true } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forInvoice(undo?.invoiceId ?? ''); if (isRefusal(c)) return c
  if (!preparesInvoices(c.viewer, c.team)) return { error: SEND_RULE }
  if (c.i.status !== 'draft') return { error: `${c.i.number ?? 'It'} has been sent since — it stays as it went` }
  await restoreAmounts(c.p.id, (undo.amounts ?? []).filter((a) => a.id !== c.i.id))
  const n = (v: number) => Math.max(0, Math.round(Number(v) || 0))
  await db.update(projectInvoices).set({
    amountMinor: n(undo.amountMinor), gstMinor: n(undo.gstMinor), varianceReason: typeof undo.varianceReason === 'string' ? undo.varianceReason.slice(0, 300) : null,
    editedBy: typeof undo.editedBy === 'string' ? undo.editedBy.slice(0, 80) : null, editedAt: typeof undo.editedAt === 'number' && Number.isFinite(undo.editedAt) ? new Date(undo.editedAt) : null, updatedAt: new Date(),
  }).where(eq(projectInvoices.id, c.i.id))
  const ids = (undo.eventIds ?? []).filter((id) => typeof id === 'string').slice(0, 5)
  if (ids.length) await db.delete(leadEvents).where(and(eq(leadEvents.projectId, c.p.id), inArray(leadEvents.id, ids)))
  touch(c.p)
  return { ok: true }
}

export type VoidUndo = { invoiceId: string; freshId: string | null; amounts: AmountsUndo; eventId: string }
/**
 * (F-18) Void a sent invoice — an Owner's or an Admin's, with a reason. It keeps its row and its number (the record); a fresh Draft takes its
 * stage's share, and the Drafts are re-sized so they add up. Paid ones are reversed first (round 6). Answers what Undo needs.
 */
export async function voidInvoice(invoiceId: string, o: { reason: string }): Promise<{ sentence: string; undo: VoidUndo } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forInvoice(invoiceId); if (isRefusal(c)) return c
  if (!voidsInvoices(c.viewer.role)) return { error: VOID_RULE }
  if (c.i.status !== 'sent') return { error: c.i.status === 'void' ? `${c.i.number ?? 'It'} is already void` : 'Only a sent invoice is voided — a Draft is edited' }
  const reason = (o?.reason ?? '').trim().slice(0, 300)
  if (!reason) return { error: 'Say why it is void' }
  /* (Projects round 6, F-18) a paid or part-paid invoice is never voided — its payments are reversed first */
  if ((await moneyPaymentsOf(c.p.id)).some((x) => x.invoiceId === invoiceId)) return { error: 'A payment is recorded against it — reverse the payment first' }
  const now = new Date()
  await db.update(projectInvoices).set({ status: 'void', voidReason: reason, voidedBy: c.viewer.id, voidedAt: now, updatedAt: now }).where(eq(projectInvoices.id, invoiceId))
  const made = await draftInvoicesFor(c.p.id, { at: now })
  const [fresh] = made ? await db.select({ id: projectInvoices.id }).from(projectInvoices).where(and(eq(projectInvoices.projectId, c.p.id), eq(projectInvoices.stageRef, c.i.stageRef), eq(projectInvoices.status, 'draft'))).limit(1) : []
  if (fresh) await db.update(projectInvoices).set({ replacesId: invoiceId }).where(eq(projectInvoices.id, fresh.id))
  const r = await applyRebalance(c.p.id)
  const eventId = await log(c, 'project_invoice_voided', { id: invoiceId, stage: c.i.stageName, title: c.i.number ?? c.i.externalRef ?? '', reason, to: money2(c.i.amountMinor), kind: c.i.kind })
  touch(c.p)
  /* (gaps build B) only a payment stage gets a fresh Draft; a variation order billed on its own can be billed again; a one-off is simply void */
  const sentence = fresh ? `${c.i.number ?? c.i.externalRef} is void — a fresh ${c.i.stageName} Draft takes its share` : c.i.kind === 'variation' ? `${c.i.number} is void — ${c.i.stageName} can be billed again` : `${c.i.number ?? c.i.externalRef} is void`
  return { sentence, undo: { invoiceId, freshId: fresh?.id ?? null, amounts: r.undo, eventId } }
}
export async function undoVoidInvoice(undo: VoidUndo): Promise<{ ok: true } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forInvoice(undo?.invoiceId ?? ''); if (isRefusal(c)) return c
  if (!voidsInvoices(c.viewer.role)) return { error: VOID_RULE }
  if (c.i.status !== 'void') return { ok: true }
  if (undo.freshId) {
    const [f] = await db.select({ status: projectInvoices.status }).from(projectInvoices).where(eq(projectInvoices.id, undo.freshId)).limit(1)
    if (f && f.status !== 'draft') return { error: 'Its fresh Draft has been sent since — void that one instead' }
    await db.delete(projectInvoices).where(and(eq(projectInvoices.id, undo.freshId), eq(projectInvoices.status, 'draft')))
  }
  await db.update(projectInvoices).set({ status: 'sent', voidReason: null, voidedBy: null, voidedAt: null, updatedAt: new Date() }).where(eq(projectInvoices.id, undo.invoiceId))
  await restoreAmounts(c.p.id, (undo.amounts ?? []).filter((a) => a.id !== undo.freshId))
  if (undo.eventId) await db.delete(leadEvents).where(and(eq(leadEvents.id, undo.eventId), eq(leadEvents.projectId, c.p.id)))
  touch(c.p)
  return { ok: true }
}

/* ── Settings › Projects › Invoices (F-05 · F-13 · F-14) ─────────────────────────────────────────────────────────────────────── */

export async function setInvoiceRules(o: { rules?: Partial<InvoiceRules>; numbering?: ProjectNumbering }): Promise<{ rules: InvoiceRules; numbering: ProjectNumbering } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const viewer = await fetchViewer()
  if (!runsStudio(viewer.role)) return { error: SETTINGS_RULE }
  const now = new Date()
  if (o?.rules && 'approval' in o.rules) { const lock = await requirePlan('internal_approvals'); if (lock) return lock }   // (pending modules S19) invoice approval is Pro
  const cur = await fetchInvoiceRulesStored()   // the studio's own rules (a Free plan reads approval off — never written back)
  const rules = parseInvoiceRules({ ...cur, ...(o?.rules ?? {}), termsDays: o?.rules?.termsDays === undefined ? cur.termsDays : Math.min(TERMS_MAX, Math.max(0, Math.round(Number(o.rules.termsDays) || 0))) })
  await db.insert(settings).values({ key: INVOICE_RULES_KEY, value: JSON.stringify(rules), updatedAt: now }).onConflictDoUpdate({ target: settings.key, set: { value: JSON.stringify(rules), updatedAt: now } })
  /* (fix-D, D-19) approval switched off: the invoices waiting for it are their team's to send again — the submissions clear (Drafts as they
     were) and the approvers' bell rows go, so nobody is left reading "Waiting for an Owner or an Admin" */
  if (cur.approval && !rules.approval) {
    const waiting = await db.select({ id: projectInvoices.id, projectId: projectInvoices.projectId }).from(projectInvoices).where(and(eq(projectInvoices.status, 'draft'), sql`${projectInvoices.submittedAt} is not null`))
    if (waiting.length) {
      await db.update(projectInvoices).set({ submittedBy: null, submittedAt: null, updatedAt: now }).where(inArray(projectInvoices.id, waiting.map((w) => w.id)))
      await db.delete(notifications).where(and(eq(notifications.kind, 'invoice_review'), inArray(notifications.href, waiting.map((w) => moneyHref(w.projectId, w.id)))))
    }
  }
  let numbering = await fetchInvoiceNumbering()
  if (o?.numbering) {
    const prev = numbering
    numbering = parseInvoiceNumbering(o.numbering)
    /* (fix-D, D-31) a new prefix starts its own count: a Next number carried over from the old series is cleared unless it was typed with it */
    if (numbering.prefix !== prev.prefix && numbering.next === prev.next) numbering = { ...numbering, next: 0 }
    await db.insert(settings).values({ key: INVOICE_NUMBERING_KEY, value: JSON.stringify(numbering), updatedAt: now }).onConflictDoUpdate({ target: settings.key, set: { value: JSON.stringify(numbering), updatedAt: now } })
  }
  revalidatePath('/settings'); revalidatePath('/projects', 'layout')
  return { rules, numbering }
}

/* ══ (gaps build B) Money in, complete — the report's 4-finance rows, M-04 ════════════════════════════════════════════════════════════ */

const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '')
const cleanBlock = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/\r\n/g, '\n').replace(/[ \t]+\n/g, '\n').trim().slice(0, max) : '')
const dayStart = (ms: number) => { const d = new Date(ms); return new Date(d.getFullYear(), d.getMonth(), d.getDate()) }
const okDay = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? dayStart(v) : null)
/** Where the Money tab lists an invoice outside the stages — after every stage, in the order they were made. */
const extraPosition = async (projectId: string) => 1000 + Number((await db.select({ n: sql<number>`count(*)` }).from(projectInvoices).where(and(eq(projectInvoices.projectId, projectId), sql`${projectInvoices.position} >= 1000`)))[0]?.n ?? 0)
const DUE_MODES = ['terms', 'date', 'handover'] as const
type DueInput = { dueMode?: (typeof DUE_MODES)[number] | null; dueOn?: number | null }
/** (item 4) A Draft's due mode as stored: a day picked (it must be one), the handover day (it must exist), else the terms (null). */
function dueColumns(c: Ctx, o: DueInput): { dueMode: string | null; dueOn: Date | null } | Refusal {
  const mode = DUE_MODES.find((m) => m === o?.dueMode) ?? 'terms'
  if (mode === 'date') { const d = okDay(o.dueOn); if (!d) return { error: 'Pick the day it is due' }; return { dueMode: 'date', dueOn: d } }
  if (mode === 'handover') { if (!c.p.targetEndDate) return { error: 'The project has no handover day yet — set its target end on the Overview' }; return { dueMode: 'handover', dueOn: null } }
  return { dueMode: null, dueOn: null }
}
const rebalanceLine = (c: Ctx, r: Awaited<ReturnType<typeof applyRebalance>>, at: Date) =>
  logProjectEvent(db, c.p.leadId, c.p.id, 'project_money_rebalanced', { name: c.p.name, number: c.p.number, n: r.changes.length, names: r.changes.map((x) => x.stageName), to: money2(r.contractMinor) }, { at })
const takeEvents = async (projectId: string, list: unknown) => {
  const ids = (Array.isArray(list) ? list : []).filter((x): x is string => typeof x === 'string').slice(0, 5)
  if (ids.length) await db.delete(leadEvents).where(and(eq(leadEvents.projectId, projectId), inArray(leadEvents.id, ids)))
}

/* ── Item 1 · Bill this VO (1.0 G-131 · G-162 · G-163) ─────────────────────────────────────────────────────────────────────────── */

export type BillUndo = { invoiceId: string; amounts: AmountsUndo; eventIds: string[] }
/**
 * Bill a variation order on its own: a Draft for the order's own total (GST inside, as the contract's), in the contract — the unsent stage
 * Drafts give its money back (the rebalance, 1.0 G-163). For an order approved after every stage went out this is the only way its money is
 * invoiced. An omission is never billed: it shows as "S$x to credit".
 */
export async function billVariation(quoteId: string): Promise<{ id: string; sentence: string; undo: BillUndo } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const [q] = await db.select().from(quotes).where(and(eq(quotes.id, typeof quoteId === 'string' ? quoteId : ''), isNull(quotes.deletedAt))).limit(1)
  if (!q || q.kind !== 'variation' || !q.projectId) return { error: 'This variation order is not there any more' }
  const c = await forMoney(q.projectId); if (isRefusal(c)) return c
  if (!preparesInvoices(c.viewer, c.team)) return { error: SEND_RULE }
  if (!isApprovedVariation(q.status)) return { error: `${q.number} is not approved by the client yet — it is billed once it is` }
  if (q.amountMinor <= 0) return { error: `${q.number} takes money off the contract — it shows as money to credit, never as an invoice` }
  const [have] = await db.select({ id: projectInvoices.id }).from(projectInvoices).where(and(eq(projectInvoices.projectId, c.p.id), eq(projectInvoices.stageRef, `vo:${q.id}`), sql`${projectInvoices.status} <> 'void'`)).limit(1)
  if (have) return { error: `${q.number} has its own invoice already` }
  const now = new Date()
  /* (S44O — row 360) one writer for a VO's own invoice — this press and Settings › Finance's *On their own, up front* (lib/projects/invoices.ts) */
  const made = await draftVariationInvoice(q, c.p, { actorId: c.viewer.id, at: now })
  if (!made) return { error: `${q.number} has its own invoice already` }
  const id = made.id
  const eventIds = [made.eventId]
  const r = await applyRebalance(c.p.id)
  if (r.changes.length) eventIds.push(await rebalanceLine(c, r, new Date(now.getTime() + 1000)))
  touch(c.p); revalidatePath(`/quotes/${q.id}`)
  const names = r.changes.map((x) => x.stageName)
  const sentence = names.length
    ? `${q.number}’s invoice is a Draft for ${money2(q.amountMinor)} — ${names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]} were` : `${names[0]} was`} re-sized to give it back`
    : `${q.number}’s invoice is a Draft for ${money2(q.amountMinor)} — send it from Billing, under Outside the stages`   // (simplify S-07) Other invoices is Billing's group now
  return { id, sentence, undo: { invoiceId: id, amounts: r.undo, eventIds } }
}
export async function undoBillVariation(undo: BillUndo): Promise<{ ok: true } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forInvoice(typeof undo?.invoiceId === 'string' ? undo.invoiceId : ''); if (isRefusal(c)) return c
  if (!preparesInvoices(c.viewer, c.team)) return { error: SEND_RULE }
  if (c.i.status !== 'draft' || c.i.kind !== 'variation') return { error: `${c.i.number ?? 'It'} has been sent since — void it instead` }
  await db.delete(projectInvoices).where(and(eq(projectInvoices.id, c.i.id), eq(projectInvoices.status, 'draft')))
  await restoreAmounts(c.p.id, Array.isArray(undo.amounts) ? undo.amounts : [])
  await takeEvents(c.p.id, undo.eventIds)
  touch(c.p)
  return { ok: true }
}

/* ── Items 2 · 3 · 4 · One-off invoices, their lines, a description, a note to the client, a due day (M-04 · 1.0 G-253 · G-261 · G-269) ── */

export type OneOffInput = DueInput & {
  title: string; reason: string; description?: string | null; clientNote?: string | null
  lines: InvoiceLine[]; chargeGst: boolean
}
type OneOffCols = { stageName: string; reason: string; description: string | null; clientNote: string | null; linesJson: string; chargeGst: boolean; amountMinor: number; gstMinor: number; dueMode: string | null; dueOn: Date | null }
/** A one-off's fields, checked — the same on create and on change. */
function oneOffColumns(c: Ctx, o: OneOffInput, gstRate: number): OneOffCols | Refusal {
  const title = clean(o?.title, TITLE_MAX)
  if (!title) return { error: 'Say what the invoice is for' }
  if (!isOneOffReason(o?.reason)) return { error: 'Pick the reason' }
  const lines = cleanLines(o?.lines)
  const why = linesProblem(lines); if (why) return { error: why }
  const due = dueColumns(c, o); if (isRefusal(due)) return due
  const charge = !!o.chargeGst && gstRate > 0
  const t = linesTotals(lines, gstRate, charge)
  return {
    stageName: title, reason: o.reason, description: clean(o.description, DESCRIPTION_MAX) || null, clientNote: cleanBlock(o.clientNote, NOTE_MAX) || null,
    linesJson: JSON.stringify(lines), chargeGst: charge, amountMinor: t.totalMinor, gstMinor: t.gstMinor, ...due,
  }
}
/**
 * New invoice › One-off (M-04): something billed outside the agreed stages — a reimbursement, an upgrade, out-of-scope work — with its reason,
 * its lines (priced before GST, GST on top at the project's rate when charged), a note to the client and its due day. A Draft beside the stage
 * invoices; it follows their path (approval, send, remind, pay, receipt) and counts in Invoiced and Collected, never in the contract value.
 */
export async function createOneOffInvoice(projectId: string, o: OneOffInput): Promise<{ id: string; title: string } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forMoney(typeof projectId === 'string' ? projectId : ''); if (isRefusal(c)) return c
  if (!preparesInvoices(c.viewer, c.team)) return { error: SEND_RULE }
  const input = await moneyInputOf(c.p)
  const cols = oneOffColumns(c, o, input.gstRate); if (isRefusal(cols)) return cols
  const id = randomUUID(), now = new Date()
  await db.insert(projectInvoices).values({
    id, projectId: c.p.id, stageRef: `extra:${id}`, pct: 0, position: await extraPosition(c.p.id), status: 'draft', issuingEntity: input.quote?.issuingEntity ?? null, kind: 'one_off',
    ...cols, shareToken: newShareToken(), createdBy: c.viewer.id, createdAt: now, updatedAt: now,
  })
  await log(c, 'project_invoice_created', { id, kind: 'one_off', stage: cols.stageName, reason: reasonLabel(cols.reason), to: money2(cols.amountMinor) })
  touch(c.p)
  return { id, title: cols.stageName }
}
/** A one-off Draft changed (its lines, words, due day) — never once it is sent or while it waits for approval. */
export async function updateOneOffInvoice(invoiceId: string, o: OneOffInput): Promise<{ ok: true } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forInvoice(typeof invoiceId === 'string' ? invoiceId : ''); if (isRefusal(c)) return c
  if (!preparesInvoices(c.viewer, c.team)) return { error: SEND_RULE }
  if (c.i.kind !== 'one_off') return { error: 'Only a one-off invoice has lines of its own' }
  if (c.i.status !== 'draft') return { error: 'A sent invoice never changes — void it and make another' }
  if (c.i.submittedAt) return { error: 'It is waiting for approval — an Owner or an Admin sends it back before it changes' }
  const input = await moneyInputOf(c.p)
  const cols = oneOffColumns(c, o, input.gstRate); if (isRefusal(cols)) return cols
  await db.update(projectInvoices).set({ ...cols, updatedAt: new Date() }).where(eq(projectInvoices.id, c.i.id))
  await log(c, 'project_invoice_details', { id: c.i.id, stage: cols.stageName, what: ['lines'], to: money2(cols.amountMinor) })
  touch(c.p)
  return { ok: true }
}

/** (items 3 · 4) Any Draft's own words and due day: the description the client reads under its line, a note at the paper's foot, when it falls
    due. A sent invoice never changes (its paper went as it was). */
export async function setInvoiceDetails(invoiceId: string, o: DueInput & { description?: string | null; clientNote?: string | null
  /** (parity map, MI-031) a stage invoice itemised: its lines (before GST) adding up to it; null = one line again; absent = as they are */ lines?: InvoiceLine[] | null }): Promise<{ ok: true; what: string[] } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forInvoice(typeof invoiceId === 'string' ? invoiceId : ''); if (isRefusal(c)) return c
  if (!preparesInvoices(c.viewer, c.team)) return { error: SEND_RULE }
  if (c.i.status !== 'draft') return { error: 'A sent invoice never changes — its paper went as it was' }
  if (c.i.submittedAt) return { error: 'It is waiting for approval — an Owner or an Admin sends it back before it changes' }
  const due = dueColumns(c, o); if (isRefusal(due)) return due
  const description = clean(o?.description, DESCRIPTION_MAX) || null, clientNote = cleanBlock(o?.clientNote, NOTE_MAX) || null
  /* (parity map, MI-031) the lines: a stage invoice's only (a one-off has its own), each said, adding up to the invoice before GST */
  let linesJson: string | null | undefined
  if (o?.lines !== undefined) {
    if (o.lines === null || (Array.isArray(o.lines) && !o.lines.length)) linesJson = null
    else {
      if (c.i.kind !== 'stage') return { error: 'Only a payment stage’s invoice is itemised here' }
      const lines = cleanLines(o.lines)
      const why = linesProblem(lines); if (why) return { error: why }
      const gap = itemiseGap(lines, c.i.amountMinor, (await moneyInputOf(c.p)).gstRate)
      if (gap) return { error: `The lines don’t add up to the invoice: ${itemiseWords(gap)}` }
      linesJson = JSON.stringify(lines)
    }
  }
  const what = [
    description !== (c.i.description ?? null) ? 'description' : '',
    clientNote !== (c.i.clientNote ?? null) ? 'note to the client' : '',
    due.dueMode !== (c.i.dueMode ?? null) || (due.dueOn?.getTime() ?? null) !== (c.i.dueOn?.getTime() ?? null) ? 'due day' : '',
    linesJson !== undefined && linesJson !== (c.i.linesJson ?? null) ? 'lines' : '',
  ].filter(Boolean)
  if (!what.length) return { ok: true, what }
  await db.update(projectInvoices).set({ description, clientNote, ...due, ...(linesJson !== undefined ? { linesJson } : {}), updatedAt: new Date() }).where(eq(projectInvoices.id, c.i.id))
  await log(c, 'project_invoice_details', { id: c.i.id, stage: c.i.stageName, what, due: due.dueMode === 'date' && due.dueOn ? displayDate(due.dueOn) : due.dueMode === 'handover' ? 'handover day' : '' })
  touch(c.p)
  return { ok: true, what }
}

/** A Draft that is not a payment stage's, taken away — a one-off, or a variation order's own invoice; Undo puts it back as it was. */
export type RemovedInvoice = { row: Record<string, unknown>; amounts: AmountsUndo; eventIds: string[] }
const rowSnapshot = (i: ProjectInvoice): Record<string, unknown> => {
  const ms = (d: Date | null) => (d ? d.getTime() : null)
  return { ...i, createdAt: i.createdAt.getTime(), updatedAt: i.updatedAt.getTime(), editedAt: ms(i.editedAt), reviewedAt: ms(i.reviewedAt), dueOn: ms(i.dueOn), submittedAt: null, sentAt: null, dueAt: null, voidedAt: null }
}
export async function removeDraftInvoice(invoiceId: string): Promise<{ sentence: string; undo: RemovedInvoice } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forInvoice(typeof invoiceId === 'string' ? invoiceId : ''); if (isRefusal(c)) return c
  if (!preparesInvoices(c.viewer, c.team)) return { error: SEND_RULE }
  if (c.i.kind !== 'one_off' && c.i.kind !== 'variation') return { error: 'A payment stage’s invoice stays — change its amount, or void it once sent' }
  if (c.i.status !== 'draft') return { error: 'A sent invoice stays on the record — void it instead' }
  if (c.i.submittedAt) return { error: 'It is waiting for approval — an Owner or an Admin sends it back first' }
  const row = rowSnapshot(c.i)
  await db.delete(projectInvoices).where(and(eq(projectInvoices.id, c.i.id), eq(projectInvoices.status, 'draft')))
  const eventIds = [await log(c, 'project_invoice_removed', { id: c.i.id, stage: c.i.stageName, kind: c.i.kind, to: money2(c.i.amountMinor) })]
  const r = await applyRebalance(c.p.id)   // a variation order's own invoice gone: the Drafts carry its money again
  if (r.changes.length) eventIds.push(await rebalanceLine(c, r, new Date(Date.now() + 1000)))
  touch(c.p)
  return { sentence: c.i.kind === 'variation' ? `${c.i.stageName}’s invoice is gone${r.changes.length ? ' — the unsent invoices carry its money again' : ''}` : `The ${c.i.stageName} invoice is gone`, undo: { row, amounts: r.undo, eventIds } }
}
export async function undoRemoveInvoice(undo: RemovedInvoice): Promise<{ ok: true } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const r = (undo?.row ?? {}) as Record<string, unknown>
  const projectId = typeof r.projectId === 'string' ? r.projectId : ''
  const c = await forMoney(projectId); if (isRefusal(c)) return c
  if (!preparesInvoices(c.viewer, c.team)) return { error: SEND_RULE }
  const id = typeof r.id === 'string' ? r.id : ''
  const kind = r.kind === 'variation' ? 'variation' : r.kind === 'one_off' ? 'one_off' : null
  if (!id || !kind) return { error: 'Nothing to undo' }
  const [taken] = await db.select({ id: projectInvoices.id }).from(projectInvoices).where(eq(projectInvoices.id, id)).limit(1)
  if (taken) return { ok: true }
  if (kind === 'variation' && typeof r.variationId === 'string') {
    const [again] = await db.select({ id: projectInvoices.id }).from(projectInvoices).where(and(eq(projectInvoices.projectId, projectId), eq(projectInvoices.stageRef, `vo:${r.variationId}`), sql`${projectInvoices.status} <> 'void'`)).limit(1)
    if (again) return { error: 'The variation order was billed again since' }
  }
  await insertDraftFrom(projectId, r, kind)
  await restoreAmounts(projectId, Array.isArray(undo.amounts) ? undo.amounts : [])
  await takeEvents(projectId, undo.eventIds)
  touch(c.p)
  return { ok: true }
}
/** A Draft put back from its snapshot (a remove's or a record's Undo) — every column bounded, never a sent invoice's stamps. */
async function insertDraftFrom(projectId: string, r: Record<string, unknown>, kind: 'stage' | 'variation' | 'one_off') {
  const s = (k: string, max = 300) => (typeof r[k] === 'string' ? (r[k] as string).slice(0, max) : null)
  const n = (k: string) => (typeof r[k] === 'number' && Number.isFinite(r[k] as number) ? Math.round(r[k] as number) : 0)
  const t = (k: string) => (typeof r[k] === 'number' && Number.isFinite(r[k] as number) ? new Date(r[k] as number) : null)
  const id = s('id', 80)!
  const stageRef = kind === 'variation' ? `vo:${s('variationId', 80) ?? ''}` : kind === 'one_off' ? `extra:${id}` : s('stageRef', 120) ?? `extra:${id}`
  await db.insert(projectInvoices).values({
    id, projectId, stageRef, stageName: s('stageName', 120) ?? 'Invoice', pct: typeof r.pct === 'number' && Number.isFinite(r.pct) ? r.pct : 0, position: n('position'), status: 'draft',
    amountMinor: Math.max(0, n('amountMinor')), gstMinor: Math.max(0, n('gstMinor')), issuingEntity: s('issuingEntity', 200), varianceReason: s('varianceReason'), editedBy: s('editedBy', 80), editedAt: t('editedAt'),
    kind, variationId: s('variationId', 80), reason: s('reason', 40), description: s('description', DESCRIPTION_MAX), clientNote: s('clientNote', NOTE_MAX), linesJson: s('linesJson', 20000),
    chargeGst: typeof r.chargeGst === 'boolean' ? r.chargeGst : null, dueMode: s('dueMode', 20), dueOn: t('dueOn'), shareToken: s('shareToken', 40) ?? newShareToken(),
    fixedMinor: typeof r.fixedMinor === 'number' && Number.isFinite(r.fixedMinor) ? Math.round(r.fixedMinor) : null, createdBy: s('createdBy', 80), createdAt: t('createdAt') ?? new Date(), updatedAt: new Date(),
  }).onConflictDoNothing()
}

/* ── Item 9 · Record an invoice made outside OpenMaison (1.0 G-208 · G-219 · G-229) ───────────────────────────────────────────── */

export type ExternalInput = { reference: string; amountMinor: number; issuedOn: number; dueOn?: number | null; stageRef?: string | null; note?: string | null; file?: { name: string; dataUrl: string } | null }
export type ExternalUndo = { invoiceId: string; draft: Record<string, unknown> | null; fileId: string | null; amounts: AmountsUndo; eventIds: string[] }
/**
 * An invoice raised elsewhere (an accounting system, a paper book) — its own number, its amount with GST, the day it went, its file — counted in
 * the figures and marked Recorded. It stands for a payment stage whose invoice is still an unsent Draft (the Draft gives way to it), or for
 * nothing on the schedule (outside the contract). Payments are recorded against it as against any sent invoice.
 */
export async function recordExternalInvoice(projectId: string, o: ExternalInput): Promise<{ id: string; sentence: string; undo: ExternalUndo } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forMoney(typeof projectId === 'string' ? projectId : ''); if (isRefusal(c)) return c
  if (!preparesInvoices(c.viewer, c.team)) return { error: SEND_RULE }
  const reference = clean(o?.reference, REF_MAX)
  if (!reference) return { error: 'Enter the invoice’s own number' }
  const amount = Math.round(Number(o?.amountMinor))
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1e11) return { error: 'Enter its amount' }
  const issued = okDay(o?.issuedOn)
  if (!issued || issued.getTime() > Date.now()) return { error: 'Pick the day it was issued — today or before' }
  const due = o?.dueOn ? okDay(o.dueOn) : null
  if (due && due < issued) return { error: 'It is due on or after the day it was issued' }
  const [dup] = await db.select({ id: projectInvoices.id }).from(projectInvoices).where(and(eq(projectInvoices.projectId, c.p.id), eq(projectInvoices.externalRef, reference), sql`${projectInvoices.status} <> 'void'`)).limit(1)
  if (dup) return { error: `${reference} is recorded already` }
  const file = o?.file && typeof o.file.dataUrl === 'string' && o.file.dataUrl.startsWith('data:') ? o.file : null
  if (file && file.dataUrl.length > 8_000_000) return { error: 'The file is too large — under 6 MB, please' }
  const input = await moneyInputOf(c.p)
  /* the stage it stands for: its unsent Draft gives way (never one waiting for approval) */
  let draft: ProjectInvoice | null = null
  let stage: { ref: string; name: string; pct: number; position: number } | null = null
  if (o?.stageRef) {
    const s = input.stages.find((x) => x.ref === o.stageRef)
    if (!s) return { error: 'That payment stage is not there any more' }
    const [live] = await db.select().from(projectInvoices).where(and(eq(projectInvoices.projectId, c.p.id), eq(projectInvoices.stageRef, s.ref), sql`${projectInvoices.status} <> 'void'`)).limit(1)
    if (live && (live.status !== 'draft' || live.submittedAt)) return { error: `The ${s.name} invoice is ${live.status === 'draft' ? 'waiting for approval' : 'sent already'} — record this one for no stage` }
    draft = live ?? null
    stage = { ref: s.ref, name: s.name, pct: s.pct, position: s.position }
  }
  const id = randomUUID(), now = new Date()
  const fileId = file ? await fileProof(c.p.leadId, c.viewer.id, { name: clean(file.name, 90) || reference, dataUrl: file.dataUrl }) : null
  if (draft) await db.delete(projectInvoices).where(eq(projectInvoices.id, draft.id))
  const variationsMinor = input.variations.filter((v) => isApprovedVariation(v.status)).reduce((s, v) => s + v.amountMinor, 0)
  const note = clean(o?.note, DESCRIPTION_MAX)
  await db.insert(projectInvoices).values({
    id, projectId: c.p.id, stageRef: stage ? stage.ref : `extra:${id}`, stageName: stage ? stage.name : clean(note, TITLE_MAX) || `Invoice ${reference}`, pct: stage?.pct ?? 0,
    position: stage ? stage.position : await extraPosition(c.p.id), status: 'sent', amountMinor: amount, gstMinor: gstOf(amount, billGstRate(input, { kind: 'external', stageRef: stage ? stage.ref : null })),   // (S43D, F2-04)
    issuingEntity: input.quote?.issuingEntity ?? null, kind: 'external', externalRef: reference, externalFileId: fileId, description: note || null,
    sentBy: c.viewer.id, sentAt: issued, dueAt: due ?? issued, contractMinor: Math.max(0, (input.baseMinor ?? 0) + variationsMinor), baseMinor: input.baseMinor ?? 0, variationsMinor,
    createdBy: c.viewer.id, createdAt: now, updatedAt: now,
  })
  const eventIds = [await log(c, 'project_invoice_recorded', { id, ...(stage ? { stage: stage.name } : {}), ref: reference, to: money2(amount), due: displayDate(due ?? issued) })]
  const r = await applyRebalance(c.p.id)
  if (r.changes.length) eventIds.push(await rebalanceLine(c, r, new Date(now.getTime() + 1000)))
  touch(c.p)
  return {
    id, sentence: `${reference} recorded — ${money2(amount)}${stage ? ` for the ${stage.name} stage` : ', outside the payment schedule'}`,
    undo: { invoiceId: id, draft: draft ? rowSnapshot(draft) : null, fileId, amounts: r.undo, eventIds },
  }
}
export async function undoRecordExternal(undo: ExternalUndo): Promise<{ ok: true } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forInvoice(typeof undo?.invoiceId === 'string' ? undo.invoiceId : ''); if (isRefusal(c)) return c
  if (!preparesInvoices(c.viewer, c.team)) return { error: SEND_RULE }
  if (c.i.kind !== 'external') return { error: 'Nothing to undo' }
  if ((await moneyPaymentsOf(c.p.id)).some((x) => x.invoiceId === c.i.id)) return { error: 'A payment is recorded against it since — reverse the payment first' }
  await db.delete(projectInvoices).where(eq(projectInvoices.id, c.i.id))
  if (undo.fileId && undo.fileId === c.i.externalFileId) await db.delete(leadFiles).where(eq(leadFiles.id, undo.fileId))
  const d = undo.draft
  if (d && typeof d.id === 'string' && typeof d.stageRef === 'string') await insertDraftFrom(c.p.id, d, 'stage')
  else await draftInvoicesFor(c.p.id)
  await restoreAmounts(c.p.id, Array.isArray(undo.amounts) ? undo.amounts : [])
  await takeEvents(c.p.id, undo.eventIds)
  touch(c.p)
  return { ok: true }
}

/* ── Item 11 · Remind the approvers (1.0 G-226: once an hour per person) ───────────────────────────────────────────────────────── */

export async function remindApprovers(invoiceId: string): Promise<{ ok: true } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forInvoice(typeof invoiceId === 'string' ? invoiceId : ''); if (isRefusal(c)) return c
  if (!preparesInvoices(c.viewer, c.team)) return { error: SEND_RULE }
  if (c.i.status !== 'draft' || !c.i.submittedAt) return { error: 'This invoice is not waiting for approval' }
  if (approvesInvoices(c.viewer.role)) return { error: 'You approve invoices yourself — send it, or send it back' }
  const [last] = await db.select({ at: leadEvents.at }).from(leadEvents)
    .where(and(eq(leadEvents.projectId, c.p.id), eq(leadEvents.kind, 'project_invoice_approver_reminded'), eq(leadEvents.actorId, c.viewer.id), sql`json_extract(${leadEvents.detail}, '$.id') = ${c.i.id}`))
    .orderBy(sql`${leadEvents.at} desc`).limit(1)
  const block = approverRemindBlock(last ? last.at.getTime() : null, Date.now()); if (block) return { error: block }
  await log(c, 'project_invoice_approver_reminded', { id: c.i.id, stage: c.i.stageName, to: money2(c.i.amountMinor) })
  await notify('invoice_review', await studioRunnerIds(), { title: `${await nameOf(c.viewer.id)} is waiting for your approval`, body: `${c.i.stageName} · ${money2(c.i.amountMinor)} — ${c.p.name}, submitted ${displayDate(c.i.submittedAt)}`, href: moneyHref(c.p.id, c.i.id), leadId: c.p.leadId, actorId: c.viewer.id })
  touch(c.p)
  return { ok: true }
}

/* ── Item 13 · A project's own payment split (no system quote; 1.0's fee first behind Settings › Finance › Invoices) ──────────────────── */

export type SplitRowInput = { name: string; pct: number; fixedMinor?: number | null; milestoneId?: string | null }
export type SplitUndo = { projectId: string; split: unknown; refs: { id: string; ref: string | null }[]; eventId: string }
export async function setProjectSplit(projectId: string, o: { rows: SplitRowInput[]; template?: string | null }): Promise<{ sentence: string; undo: SplitUndo } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forMoney(typeof projectId === 'string' ? projectId : ''); if (isRefusal(c)) return c
  if (!mayChangeProject(c.viewer, c.team)) return { error: CHANGE_RULE }
  if (c.p.quoteId) return { error: 'The split comes from the signed quote’s Payment Schedule — change it there' }
  const invs = await db.select().from(projectInvoices).where(eq(projectInvoices.projectId, c.p.id))
  const stageInvs = invs.filter((i) => !i.stageRef.startsWith('extra:') && !i.stageRef.startsWith('vo:'))
  if (stageInvs.some((i) => i.status !== 'draft' || i.number)) return { error: 'A stage’s invoice has been sent — the split agreed then stays' }
  if (stageInvs.some((i) => i.submittedAt)) return { error: 'A stage’s invoice is waiting for approval — send it back first' }
  const rules = await fetchInvoiceRules()
  const raw = Array.isArray(o?.rows) ? o.rows.slice(0, 12) : []
  if (raw.some((r, i) => i > 0 && typeof r?.fixedMinor === 'number' && r.fixedMinor > 0)) return { error: 'Only the first stage may be a fixed amount' }
  if (!rules.feeFirst && typeof raw[0]?.fixedMinor === 'number' && raw[0].fixedMinor > 0) return { error: 'A fixed first stage is off in Settings › Finance › Invoices' }   // (simplify S-15) the Invoices card lives in Settings › Finance now
  const rows = raw.map((r, i) => ({
    name: clean(r?.name, 60), pct: typeof r?.pct === 'number' && Number.isFinite(r.pct) ? Math.round(r.pct * 100) / 100 : 0,
    fixedMinor: i === 0 && rules.feeFirst && typeof r?.fixedMinor === 'number' && Number.isFinite(r.fixedMinor) && r.fixedMinor > 0 ? Math.round(r.fixedMinor) : null,
    milestoneId: typeof r?.milestoneId === 'string' && r.milestoneId ? r.milestoneId : null,
  }))
  if (!rows.length) return { error: 'Add a payment stage' }
  if (rows.some((r) => !r.name)) return { error: 'Name every stage' }
  const shares = rows.filter((r) => r.fixedMinor == null)
  if (!shares.length) return { error: 'Add a stage with a share of the contract' }
  if (shares.some((r) => r.pct <= 0)) return { error: 'Give every stage a share above 0%' }
  const total = Math.round(shares.reduce((s, r) => s + r.pct, 0) * 100) / 100
  if (total !== 100) return { error: `The shares add up to ${total}% — make them 100%` }
  const value = c.p.agreedValueMinor ?? 0
  if (rows[0]!.fixedMinor != null && value && rows[0]!.fixedMinor >= value) return { error: 'The fixed first stage is the whole agreed value or more — make it less' }
  const ms = await db.select({ id: projectMilestones.id, ref: projectMilestones.paymentRef }).from(projectMilestones).where(and(eq(projectMilestones.projectId, c.p.id), isNull(projectMilestones.deletedAt)))
  if (rows.some((r) => r.milestoneId && !ms.some((m) => m.id === r.milestoneId))) return { error: 'That milestone is not on the schedule any more' }
  const used = rows.map((r) => r.milestoneId).filter(Boolean)
  if (new Set(used).size !== used.length) return { error: 'A milestone triggers one stage — pick another for each' }
  const prev = { projectId: c.p.id, split: c.p.paymentTemplate ?? null, refs: ms.filter((m) => m.ref?.startsWith('split:')).map((m) => ({ id: m.id, ref: m.ref })) }
  const template = typeof o?.template === 'string' ? o.template.slice(0, 80) : parseProjectSplit(c.p.paymentTemplate)?.template ?? null
  const split = { template, rows: rows.map((r) => ({ name: r.name, pct: r.fixedMinor != null ? 0 : r.pct, ...(r.fixedMinor != null ? { fixedMinor: r.fixedMinor } : {}) })) }
  const now = new Date()
  await db.update(projects).set({ paymentTemplate: split, updatedAt: now }).where(eq(projects.id, c.p.id))
  /* each stage's milestone: the refs the split's rows carry (`split:<n>`); a milestone no row names is no longer a payment point */
  for (const m of ms) if (m.ref?.startsWith('split:')) await db.update(projectMilestones).set({ paymentRef: null, updatedAt: now }).where(eq(projectMilestones.id, m.id))
  for (const [i, r] of rows.entries()) if (r.milestoneId) await db.update(projectMilestones).set({ paymentRef: `split:${i}`, updatedAt: now }).where(eq(projectMilestones.id, r.milestoneId))
  /* the stage Drafts made again from the new split (none was sent) */
  await db.delete(projectInvoices).where(and(eq(projectInvoices.projectId, c.p.id), eq(projectInvoices.status, 'draft'), sql`${projectInvoices.stageRef} like 'split:%'`))
  await draftInvoicesFor(c.p.id, { at: now })
  const names = split.rows.map((r) => ('fixedMinor' in r && r.fixedMinor ? `${r.name} ${money2(r.fixedMinor)}` : `${r.name} ${r.pct}%`))
  const eventId = await log(c, 'project_split_set', { names })
  touch(c.p); revalidatePath(`/projects/${c.p.id}/schedule`); revalidatePath(`/projects/${c.p.id}`)
  return { sentence: `The payment split is ${names.join(' · ')} — its invoices were made again`, undo: { ...prev, eventId } }
}
export async function undoProjectSplit(undo: SplitUndo): Promise<{ ok: true } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forMoney(typeof undo?.projectId === 'string' ? undo.projectId : ''); if (isRefusal(c)) return c
  if (!mayChangeProject(c.viewer, c.team)) return { error: CHANGE_RULE }
  const invs = await db.select().from(projectInvoices).where(and(eq(projectInvoices.projectId, c.p.id), sql`${projectInvoices.stageRef} like 'split:%'`))
  if (invs.some((i) => i.status !== 'draft' || i.submittedAt)) return { error: 'A stage’s invoice went out since — the split stays' }
  const now = new Date()
  const back = parseProjectSplit(undo.split)
  await db.update(projects).set({ paymentTemplate: back, updatedAt: now }).where(eq(projects.id, c.p.id))
  await db.update(projectMilestones).set({ paymentRef: null, updatedAt: now }).where(and(eq(projectMilestones.projectId, c.p.id), sql`${projectMilestones.paymentRef} like 'split:%'`))
  for (const r of Array.isArray(undo.refs) ? undo.refs.slice(0, 40) : []) if (typeof r?.id === 'string' && typeof r.ref === 'string' && r.ref.startsWith('split:')) await db.update(projectMilestones).set({ paymentRef: r.ref, updatedAt: now }).where(and(eq(projectMilestones.id, r.id), eq(projectMilestones.projectId, c.p.id)))
  await db.delete(projectInvoices).where(and(eq(projectInvoices.projectId, c.p.id), eq(projectInvoices.status, 'draft'), sql`${projectInvoices.stageRef} like 'split:%'`))
  await draftInvoicesFor(c.p.id, { at: now })
  if (typeof undo.eventId === 'string') await db.delete(leadEvents).where(and(eq(leadEvents.id, undo.eventId), eq(leadEvents.projectId, c.p.id)))
  touch(c.p); revalidatePath(`/projects/${c.p.id}/schedule`); revalidatePath(`/projects/${c.p.id}`)
  return { ok: true }
}

/* ── Items 12 · 14 · Settings › Projects › Invoices: the paper, and a number pattern per issuing entity ──────────────────────────── */

export async function setInvoicePaper(o: { paper: PaperSettings }): Promise<{ paper: PaperSettings } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const viewer = await fetchViewer()
  if (!runsStudio(viewer.role)) return { error: SETTINGS_RULE }
  const paper = parsePaperSettings(o?.paper)
  const now = new Date()
  await db.insert(settings).values({ key: INVOICE_PAPER_KEY, value: JSON.stringify(paper), updatedAt: now }).onConflictDoUpdate({ target: settings.key, set: { value: JSON.stringify(paper), updatedAt: now } })
  revalidatePath('/settings'); revalidatePath('/projects', 'layout')
  return { paper }
}

/* ── Items 7 · 16 · A variation order's own lines: omissions picked from the contract, its reason, one read from a contractor's paper ─── */

const VO_GONE = 'This variation order is not there any more'
type VoCtx = Ctx & { q: typeof quotes.$inferSelect }
/** A variation order that may still change: the project's money (the viewer may change the project), and not approved — once the client
    approved it, a change is a new version (Revise). */
async function forVariation(quoteId: string): Promise<VoCtx | Refusal> {
  const [q] = await db.select().from(quotes).where(and(eq(quotes.id, typeof quoteId === 'string' ? quoteId : ''), isNull(quotes.deletedAt))).limit(1)
  if (!q || q.kind !== 'variation' || !q.projectId) return { error: VO_GONE }
  const c = await forMoney(q.projectId); if (isRefusal(c)) return c
  if (!mayChangeProject(c.viewer, c.team)) return { error: CHANGE_RULE }
  if (isApprovedVariation(q.status)) return { error: `${q.number} is approved — revise it to change it` }
  return { ...c, q }
}
/** The order's total from its lines, as the items' own save works it out (the quote's GST and discounts). */
async function syncVariation(quoteId: string): Promise<number> {
  const [q] = await db.select().from(quotes).where(eq(quotes.id, quoteId)).limit(1)
  if (!q) return 0
  const lines = await db.select().from(quoteItems).where(eq(quoteItems.quoteId, quoteId))
  const t = quoteTotals(lines, { ...q, discounts: parseDiscounts(q.discountsJson) })
  await db.update(quotes).set({ amountMinor: t.totalMinor, updatedAt: new Date() }).where(eq(quotes.id, quoteId))
  revalidatePath(`/quotes/${quoteId}`)
  return t.totalMinor
}

/** (item 7 — 1.0 G-151) The signed quote's lines, grouped as it groups them, for *Omit from the contract*: each with its amount and whether
    this order omits it already. */
export type ContractLine = { id: string; name: string; group: string; qty: number; unit: string | null; amountMinor: number; omitted: boolean }
export async function contractLinesFor(voId: string): Promise<{ contract: string | null; lines: ContractLine[] } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forVariation(voId); if (isRefusal(c)) return c
  if (!c.p.quoteId) return { contract: null, lines: [] }
  const [base] = await db.select({ number: quotes.number }).from(quotes).where(eq(quotes.id, c.p.quoteId)).limit(1)
  const [items, mine] = await Promise.all([
    db.select().from(quoteItems).where(eq(quoteItems.quoteId, c.p.quoteId)).orderBy(asc(quoteItems.position)),
    db.select({ omitsId: quoteItems.omitsId }).from(quoteItems).where(and(eq(quoteItems.quoteId, c.q.id), isNotNull(quoteItems.omitsId))),
  ])
  const omitted = new Set(mine.map((m) => m.omitsId))
  const groupOf = (i: (typeof items)[number]) => (i.parentId ? items.find((g) => g.id === i.parentId)?.name : null) ?? i.category ?? 'Other lines'
  const lines = items.filter((i) => i.kind === 'item' && i.qty > 0)
    .map((i) => ({ id: i.id, name: i.name, group: groupOf(i), qty: i.qty, unit: i.unit, amountMinor: lineTotalMinor(i), omitted: omitted.has(i.id) }))
  return { contract: base?.number ?? null, lines }
}
/** (item 7 — 1.0 G-151) The ticked contract lines become credits on the order — each a line with a minus quantity, its price as signed, in a
    section "Omitted from the contract"; editable like any line. A line omitted already is not omitted twice. Answers the new lines' ids. */
export async function omitFromContract(voId: string, o: { ids: string[] }): Promise<{ ids: string[]; amountMinor: number } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forVariation(voId); if (isRefusal(c)) return c
  if (!c.p.quoteId) return { error: 'The project has no signed quote to omit from' }
  const ids = (Array.isArray(o?.ids) ? o.ids : []).filter((x): x is string => typeof x === 'string').slice(0, 200)
  if (!ids.length) return { error: 'Tick the lines being removed' }
  const [items, mine] = await Promise.all([
    db.select().from(quoteItems).where(and(eq(quoteItems.quoteId, c.p.quoteId), inArray(quoteItems.id, ids))),
    db.select().from(quoteItems).where(eq(quoteItems.quoteId, c.q.id)),
  ])
  const taken = new Set(mine.map((m) => m.omitsId).filter(Boolean))
  const picked = items.filter((i) => i.kind === 'item' && i.qty > 0 && !taken.has(i.id)).sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id))
  if (!picked.length) return { error: 'Those lines are omitted already' }
  const now = new Date()
  const OMIT_SECTION = 'Omitted from the contract'
  let group = mine.find((m) => m.kind === 'group' && !m.parentId && m.name === OMIT_SECTION) ?? null
  if (!group) {
    const id = randomUUID()
    const tops = mine.filter((m) => !m.parentId).length
    await db.insert(quoteItems).values({ id, quoteId: c.q.id, parentId: null, kind: 'group', position: tops, name: OMIT_SECTION, status: 'Pending', qty: 1, costMinor: 0, markupMinor: 0, discountPct: 0, gstPct: 0, createdAt: now, updatedAt: now })
    group = (await db.select().from(quoteItems).where(eq(quoteItems.id, id)).limit(1))[0] ?? null
  }
  const start = mine.filter((m) => m.parentId === group!.id).length
  const made = picked.map((i, k) => ({
    id: randomUUID(), quoteId: c.q.id, parentId: group!.id, kind: 'item' as const, position: start + k, name: i.name, description: i.description, descriptionHtml: i.descriptionHtml,
    status: 'Pending' as const, qty: -Math.abs(i.qty), unit: i.unit, costMinor: i.costMinor, markupMinor: i.markupMinor, discountPct: i.discountPct, gstPct: i.gstPct,
    room: i.room, category: i.category, section: i.section, visibility: 'visible' as const, omitsId: i.id, createdAt: now, updatedAt: now,
  }))
  await db.insert(quoteItems).values(made)
  const amountMinor = await syncVariation(c.q.id)
  touch(c.p)
  return { ids: made.map((m) => m.id), amountMinor }
}
/** (item 7 — 1.0 G-149) The order's "Reason for the change" — printed under its title. */
export async function setVariationReason(voId: string, o: { reason: string }): Promise<{ ok: true } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forVariation(voId); if (isRefusal(c)) return c
  const reason = cleanBlock(o?.reason, 500) || null
  if (reason === (c.q.changeReason ?? null)) return { ok: true }
  await db.update(quotes).set({ changeReason: reason, updatedAt: new Date() }).where(eq(quotes.id, c.q.id))
  revalidatePath(`/quotes/${c.q.id}`)
  return { ok: true }
}

/** (item 16 — 1.0's VO digitizer, `project-vo-quote-digitizer`) A variation order read from a contractor's quote: Upload a quote's reader
    (lib/quotes/upload.ts — a sheet for real, a reference PDF by its name) makes the lines, grouped as read; the order then follows its own path.
    No AI credits are charged here: Projects carries no metered press (Q-30). */
export type UploadGroupInput = { name: string | null; lines: { name: string; description?: string | null; qty?: number | null; unit?: string | null; costMinor?: number | null; markupMinor?: number | null; category?: string | null; room?: string | null }[] }
export async function createVariationFromUpload(projectId: string, o: { source: string; groups: UploadGroupInput[]; /** (pending modules S19) the id its read was charged against */ id?: string }): Promise<{ id: string; number: string; count: number; amountMinor: number } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forMoney(typeof projectId === 'string' ? projectId : ''); if (isRefusal(c)) return c
  if (!mayChangeProject(c.viewer, c.team)) return { error: CHANGE_RULE }
  const groups = (Array.isArray(o?.groups) ? o.groups : []).slice(0, 60)
  const total = groups.reduce((s, g) => s + (Array.isArray(g?.lines) ? g.lines.length : 0), 0)
  if (!total) return { error: 'The file has no lines we could use' }
  const vo = await insertVariationOrder(c.p.id, { memberId: c.viewer.id, id: typeof o?.id === 'string' ? o.id : undefined }); if (isRefusal(vo)) return vo
  const source = clean(o?.source, 80)
  const now = new Date()
  const studio = await fetchStudio()
  const [q] = await db.select().from(quotes).where(eq(quotes.id, vo.id)).limit(1)
  const gst = q?.gstEnabled ? studio.gstPct : 0
  let top = 0, count = 0
  const n = (v: unknown, lo: number, hi: number, d: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d)
  for (const g of groups) {
    const lines = (Array.isArray(g?.lines) ? g.lines : []).slice(0, 500)
    if (!lines.length) continue
    const name = clean(g?.name, 200)
    const parentId = name ? randomUUID() : null
    if (parentId) await db.insert(quoteItems).values({ id: parentId, quoteId: vo.id, parentId: null, kind: 'group', position: top++, name, status: 'Pending', qty: 1, costMinor: 0, markupMinor: 0, discountPct: 0, gstPct: gst, createdAt: now, updatedAt: now })
    /* (pending modules S41b-1) a member who doesn't see costs uploads prices only: each line's price sits in its cost (the price-only convention) */
    const priceOnly = !seesCost(c.viewer)
    const rows = lines.map((l, k) => ({
      id: randomUUID(), quoteId: vo.id, parentId, kind: 'item' as const, position: parentId ? k : top + k, name: clean(l?.name, 200) || 'Item', description: clean(l?.description, 2000) || null,
      status: 'Pending' as const, qty: n(l?.qty, -1_000_000, 1_000_000, 1), unit: clean(l?.unit, 20) || null,
      costMinor: Math.round(n(l?.costMinor, 0, 1e11, 0) + (priceOnly ? n(l?.markupMinor, 0, 1e11, 0) : 0)), markupMinor: priceOnly ? 0 : Math.round(n(l?.markupMinor, 0, 1e11, 0)),
      discountPct: 0, gstPct: gst, room: clean(l?.room, 80) || null, category: clean(l?.category, 80) || null, visibility: 'visible' as const, createdAt: now, updatedAt: now,
    }))
    for (let at = 0; at < rows.length; at += 50) await db.insert(quoteItems).values(rows.slice(at, at + 50))
    if (!parentId) top += rows.length
    count += rows.length
  }
  const title = source ? `From ${source}`.slice(0, 120) : `Variation order ${vo.number.replace(/^VO-/, '')}`
  await db.update(quotes).set({ title, updatedAt: now }).where(eq(quotes.id, vo.id))
  await db.update(leadEvents).set({ detail: sql`json_set(${leadEvents.detail}, '$.title', ${title})` })
    .where(and(eq(leadEvents.projectId, c.p.id), eq(leadEvents.kind, 'project_vo_created'), sql`json_extract(${leadEvents.detail}, '$.id') = ${vo.id}`))
  const amountMinor = await syncVariation(vo.id)
  touch(c.p)
  return { id: vo.id, number: vo.number, count, amountMinor }
}

/* ── (simplify S-08) An invoice's history in its panel ────────────────────────────────────────────────────────────────────────── */

/**
 * The invoice's own Activity lines — made, submitted, sent back, approved and sent, reminded, paid, confirmed, credited, voided — in Activity's
 * words (lib/leads/activity.ts reads them; nothing here words them again): every project line whose link lands on this invoice, one of its
 * payments or one of its credit notes. Read-only, so a completed project's panel still shows it; who reads it is who sees the money (F-17).
 */
export async function invoiceHistory(invoiceId: string): Promise<{ at: number; text: string }[] | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const [i] = await db.select({ id: projectInvoices.id, projectId: projectInvoices.projectId }).from(projectInvoices).where(eq(projectInvoices.id, typeof invoiceId === 'string' ? invoiceId : '')).limit(1)
  if (!i) return { error: GONE }
  const [p] = await db.select({ id: projects.id, leadId: projects.leadId }).from(projects).where(and(eq(projects.id, i.projectId), isNull(projects.deletedAt))).limit(1)
  if (!p) return { error: NOT_FOUND }
  const viewer = await fetchViewer()
  if (!(await canOpenLead(viewer, p.leadId))) return { error: NOT_FOUND }
  const team = (await db.select({ memberId: leadAssignees.memberId }).from(leadAssignees).where(eq(leadAssignees.leadId, p.leadId))).map((r) => r.memberId)
  if (!seesMoney(viewer, team)) return { error: MONEY_RULE }
  const [pays, credits, feed] = await Promise.all([
    db.select({ id: projectPayments.id }).from(projectPayments).where(eq(projectPayments.invoiceId, i.id)),
    db.select({ id: creditNotes.id }).from(creditNotes).where(eq(creditNotes.invoiceId, i.id)),
    fetchLeadActivity(p.leadId, { projectId: p.id }),
  ])
  const ids = new Set([i.id, ...pays.map((x) => x.id), ...credits.map((x) => x.id)])
  const mine = (href: string | undefined) => { if (!href) return false; const m = /[?&]open=([^&#]+)/.exec(href); return !!m && ids.has(decodeURIComponent(m[1]!)) }
  return feed.events.filter((e) => mine(e.link?.href)).map((e) => ({ at: e.at.getTime(), text: e.text })).sort((a, z) => z.at - a.at).slice(0, 40)
}
