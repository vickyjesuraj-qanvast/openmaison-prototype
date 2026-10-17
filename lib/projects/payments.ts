import 'server-only'
import { receiptExtraOf } from '@/lib/finance/credit-records'   // (pending modules S07)
import { fetchLiveMethodValues } from './payment-methods-queries'   // (parity map, FB-112) P-D's read
import { randomUUID } from 'node:crypto'
import { and, asc, desc, eq, inArray, isNotNull, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { keepBytes } from '@/lib/leads/file-store'   // (pending modules S34)
import {
  homeownerProfiles, leadAssignees, leadFiles, leads, members, projectInvoices, projectMilestones, projectPayments, projectSelections, projects, quotePayments, quotes, settings,
  type Lead, type Project, type ProjectPayment,
} from '@/lib/db/schema'
import { canOpenLead, fetchViewer } from '@/lib/leads/visibility'
import { runsStudio, type Viewer } from '@/lib/leads/assign-policy'
import { isAccounting } from '@/lib/settings/roles'
import { MONEY_RULE } from './invoices-model'
import { titleCaseName } from '@/lib/format'
import { money2 } from '@/lib/quotes/math'
import type { FeedRow, NotificationRules } from '@/lib/notifications/model'
import type { ReceiptPaperData } from '@/components/projects/money/payments-receipt'
import type { ProjectNumbering } from './model'
import { seesMoney } from './policy'
import { moneyOf } from './money'
import { newShareToken } from './invoices-token'   // (gaps build B, item 6) a receipt's no-login link
import { readySentence } from './invoices-kinds'
import {
  DEFAULT_PAYMENT_RULES, DEFAULT_RECEIPT_NUMBERING, PAYMENT_RULES_KEY, RECEIPT_NUMBERING_KEY, confirmersOf, confirmsPayments, countsAsPaid, daysOverdue,
  isPaymentStatus, isPending, nextReceiptNumber, parsePaymentRules, parseReceiptNumbering, recordsPayments, reversesPayments,
  type PaymentRules, type PaymentStatus, type TeamMember,
} from './payments-model'

/*
 * (Projects round 6 — money in, part two) Payments on the server: Settings › Projects › Payments, the Money tab's payments, who confirms, the
 * receipt numbers, Files › Payments (each proof and each receipt filed in the project's documents), the listing's facts (Collected, Payment
 * overdue, a payment to confirm, an invoice waiting on the client) and the bell's overdue rows (derived from the date, never stored — the way
 * `derivedDue` raises a task). Who sees a payment is who sees the project's money (F-17, `seesMoney`); every action checks it again
 * (app/projects/payment-actions.ts).
 */

const ms = (d: Date | null | undefined) => (d ? d.getTime() : null)

/* ── Settings ──────────────────────────────────────────────────────────────────────────────────────────────────────────────── */

export async function fetchPaymentRules(): Promise<PaymentRules> {
  const [row] = await db.select().from(settings).where(eq(settings.key, PAYMENT_RULES_KEY)).limit(1)
  if (!row) return DEFAULT_PAYMENT_RULES
  try { return parsePaymentRules(JSON.parse(row.value)) } catch { return DEFAULT_PAYMENT_RULES }
}
export async function fetchReceiptNumbering(): Promise<ProjectNumbering> {
  const [row] = await db.select().from(settings).where(eq(settings.key, RECEIPT_NUMBERING_KEY)).limit(1)
  if (!row) return DEFAULT_RECEIPT_NUMBERING
  try { return parseReceiptNumbering(JSON.parse(row.value)) } catch { return DEFAULT_RECEIPT_NUMBERING }
}
export async function fetchReceiptNumbers(): Promise<string[]> {
  return (await db.select({ n: projectPayments.receiptNumber }).from(projectPayments).where(isNotNull(projectPayments.receiptNumber))).map((r) => r.n!).filter(Boolean)
}
const saveSetting = async (key: string, value: unknown) => {
  const now = new Date(), v = JSON.stringify(value)
  await db.insert(settings).values({ key, value: v, updatedAt: now }).onConflictDoUpdate({ target: settings.key, set: { value: v, updatedAt: now } })
}
export const savePaymentRules = (r: PaymentRules) => saveSetting(PAYMENT_RULES_KEY, r)
export const saveReceiptNumbering = (n: ProjectNumbering) => saveSetting(RECEIPT_NUMBERING_KEY, n)

/* ── Who confirms ─────────────────────────────────────────────────────────────────────────────────────────────────────────── */

const memberRows = () => db.select({ id: members.id, name: members.name, role: members.role, active: members.isActive }).from(members)
/** (Q-48) The members who confirm a client's payment on this lead's project — Settings › Projects › Payments, with the Owner as the fallback. */
export async function confirmerIdsFor(leadId: string, rules?: PaymentRules): Promise<string[]> {
  const [r, studio, team] = await Promise.all([rules ?? fetchPaymentRules(), memberRows(), db.select({ id: leadAssignees.memberId }).from(leadAssignees).where(eq(leadAssignees.leadId, leadId))])
  const all: TeamMember[] = studio.map((m) => ({ id: m.id, role: m.role, active: m.active !== false }))
  return confirmersOf(r, all.filter((m) => team.some((t) => t.id === m.id)), all)
}

/* ── The project, after the viewer's checks (the actions' one gate) ───────────────────────────────────────────────────────────── */

export type MoneyContext = { p: Project; lead: Lead; viewer: Viewer; team: string[]; client: string }
export const NOT_FOUND = 'This project is not there any more'
/** The project, when the viewer may see it (its lead's rule) and its money (F-17) — else the refusal's words. */
export async function moneyContext(projectId: string, money = MONEY_RULE): Promise<MoneyContext | { error: string }> {   // (parity map, MI-007) the rule's own words
  const [row] = await db.select({ p: projects, l: leads }).from(projects).innerJoin(leads, eq(leads.id, projects.leadId)).where(and(eq(projects.id, projectId), isNull(projects.deletedAt), isNull(leads.deletedAt))).limit(1)
  if (!row) return { error: NOT_FOUND }
  const viewer = await fetchViewer()
  if (!(await canOpenLead(viewer, row.p.leadId))) return { error: NOT_FOUND }
  const team = (await db.select({ memberId: leadAssignees.memberId }).from(leadAssignees).where(eq(leadAssignees.leadId, row.p.leadId))).map((r) => r.memberId)
  if (!seesMoney(viewer, team)) return { error: money }
  return { p: row.p, lead: row.l, viewer, team, client: titleCaseName(row.l.name) }
}

/* ── Files › Payments: each proof and each receipt in the project's documents ─────────────────────────────────────────────────── */

export const PAYMENTS_FOLDER = 'Payments'
async function paymentsFolder(leadId: string, ownerId: string | null): Promise<string> {
  const [have] = await db.select({ id: leadFiles.id }).from(leadFiles)
    .where(and(eq(leadFiles.leadId, leadId), eq(leadFiles.kind, 'folder'), eq(leadFiles.name, PAYMENTS_FOLDER), isNull(leadFiles.parentId), isNull(leadFiles.deletedAt))).limit(1)
  if (have) return have.id
  const id = randomUUID(), now = new Date()
  await db.insert(leadFiles).values({ id, leadId, kind: 'folder', name: PAYMENTS_FOLDER, thumb: null, createdAt: now, parentId: null, ownerId, updatedAt: now })
  return id
}
const safeName = (s: string) => s.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 90)
/** The bank's confirmation — a picture (kept as an upload's, REG-684) or a PDF — filed in Files › Payments. Returns the file's id. */
export async function fileProof(leadId: string, ownerId: string | null, o: { name: string; dataUrl: string }): Promise<string> {
  const folder = await paymentsFolder(leadId, ownerId)
  const id = randomUUID(), now = new Date()
  const mime = /^data:([^;,]+)[;,]/.exec(o.dataUrl)?.[1]?.toLowerCase() ?? 'application/octet-stream'
  const image = mime.startsWith('image/')
  const ext = mime === 'application/pdf' ? 'pdf' : mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg'
  const base = safeName(o.name.replace(/\.[a-z0-9]{2,5}$/i, '')) || 'Proof of payment'
  const size = Math.round((o.dataUrl.length - o.dataUrl.indexOf(',') - 1) * 0.75)
  await db.insert(leadFiles).values({ id, leadId, kind: image ? 'image' : 'pdf', name: `${base}.${ext}`, thumb: image ? `/files/img/${id}` : null, createdAt: now, parentId: folder, ownerId, sizeBytes: size, mime, updatedAt: now })
  await keepBytes(db, id, o.dataUrl)   // (pending modules S34) through the one file store
  return id
}
/** A receipt's entry in Files › Payments — "RCT-2026-001 · Deposit.pdf"; its page is the receipt itself (the prototype keeps no PDF bytes). */
async function fileReceipt(leadId: string, ownerId: string | null, o: { number: string; stage: string; at: Date }): Promise<string> {
  return fileMoneyDoc(leadId, ownerId, o)
}
/** (gaps build B, item 6 — 1.0 G-294's "{number}.pdf" in the project's documents) A money document's entry in Files › Payments — a receipt's, a
    sent invoice's: "INV-2026-008 · Mid-Project.pdf". Its page is the document itself (the receipt's rule, `receiptOfFile` · `invoiceOfFile`). */
export async function fileMoneyDoc(leadId: string, ownerId: string | null, o: { number: string; stage: string; at: Date }): Promise<string> {
  const folder = await paymentsFolder(leadId, ownerId)
  const id = randomUUID()
  await db.insert(leadFiles).values({ id, leadId, kind: 'pdf', name: `${safeName(`${o.number} · ${o.stage}`)}.pdf`, thumb: null, createdAt: o.at, parentId: folder, ownerId, sizeBytes: null, mime: 'application/pdf', updatedAt: o.at })
  return id
}
/** (gaps build B, item 6) A sent invoice filed in Files › Payments is the invoice itself: its entry opens the invoice's page. */
export async function invoiceOfFile(fileId: string): Promise<{ projectId: string; invoiceId: string } | null> {
  const [r] = await db.select({ projectId: projectInvoices.projectId, invoiceId: projectInvoices.id }).from(projectInvoices).where(eq(projectInvoices.fileId, fileId)).limit(1)
  return r ?? null
}
/** (fix-D, D-12 · A-18) A receipt filed in Files › Payments is the receipt itself: its entry opens the receipt's page (the prototype keeps no PDF
    bytes — the page prints as the PDF). The file's payment, when it is one. */
export async function receiptOfFile(fileId: string): Promise<{ projectId: string; paymentId: string } | null> {
  const [r] = await db.select({ projectId: projectPayments.projectId, paymentId: projectPayments.id }).from(projectPayments).where(eq(projectPayments.receiptFileId, fileId)).limit(1)
  return r ?? null
}
/** A reversed receipt's entry says so in Files — the page itself reads Reversed. */
export async function markReceiptFile(fileId: string | null, reversed: boolean): Promise<void> {
  if (!fileId) return
  const [f] = await db.select({ name: leadFiles.name }).from(leadFiles).where(eq(leadFiles.id, fileId)).limit(1)
  if (!f) return
  const plain = f.name.replace(/ \(reversed\)(\.pdf)$/i, '$1')
  await db.update(leadFiles).set({ name: reversed ? plain.replace(/\.pdf$/i, ' (reversed).pdf') : plain, updatedAt: new Date() }).where(eq(leadFiles.id, fileId))
}

/**
 * (F-12 · F-13) A confirmed payment's receipt: the next number of Settings › Projects › Receipt numbers (`RCT-{YYYY}-{seq}`), stamped once,
 * and its entry in Files › Payments. The number's uniqueness is the database's (a race takes the next one). Answers the number.
 */
export async function issueReceipt(paymentId: string, o: { at: Date; ownerId: string | null }): Promise<string | null> {
  const [row] = await db.select({ pay: projectPayments, inv: projectInvoices, p: projects }).from(projectPayments)
    .innerJoin(projectInvoices, eq(projectInvoices.id, projectPayments.invoiceId)).innerJoin(projects, eq(projects.id, projectPayments.projectId))
    .where(eq(projectPayments.id, paymentId)).limit(1)
  if (!row) return null
  if (row.pay.receiptNumber) return row.pay.receiptNumber
  const numbering = await fetchReceiptNumbering()
  for (let attempt = 0; attempt < 4; attempt++) {
    const numbers = await fetchReceiptNumbers()
    const number = nextReceiptNumber(numbering, numbers, o.at)
    try {
      const r = await db.update(projectPayments).set({ receiptNumber: number, shareToken: row.pay.shareToken ?? newShareToken(), updatedAt: new Date() }).where(and(eq(projectPayments.id, paymentId), isNull(projectPayments.receiptNumber)))
      if (!r.rowsAffected) break
      const fileId = await fileReceipt(row.p.leadId, o.ownerId, { number, stage: row.inv.stageName, at: o.at })
      await db.update(projectPayments).set({ receiptFileId: fileId }).where(eq(projectPayments.id, paymentId))
      /* (fix-D, D-31) the next number is read from the highest given under the prefix — Settings › Next number stays what an Owner typed */
      return number
    } catch { /* the number was taken a moment ago — the next one */ }
  }
  const [again] = await db.select({ n: projectPayments.receiptNumber }).from(projectPayments).where(eq(projectPayments.id, paymentId)).limit(1)
  return again?.n ?? null
}
/** A receipt taken back (a confirmation's or a record's Undo): its number is given back when it was the newest, and its file goes. */
export async function withdrawReceipt(paymentId: string): Promise<void> {
  const [pay] = await db.select().from(projectPayments).where(eq(projectPayments.id, paymentId)).limit(1)
  if (!pay?.receiptNumber) return
  await db.update(projectPayments).set({ receiptNumber: null, receiptFileId: null, updatedAt: new Date() }).where(eq(projectPayments.id, paymentId))
  if (pay.receiptFileId) await db.delete(leadFiles).where(eq(leadFiles.id, pay.receiptFileId))
  /* (fix-D, D-31) the next number is read from the highest given, so the newest one taken back is given again by itself */
}

/* ── The Money tab's payments ─────────────────────────────────────────────────────────────────────────────────────────────── */

export type PaymentView = {
  id: string; invoiceId: string; invoiceNumber: string | null; stageName: string
  amountMinor: number; paidOn: number; method: string; reference: string | null; note: string | null
  source: 'studio' | 'client'; status: PaymentStatus; trusted: boolean
  /** Who recorded it (a member's name) or who said they paid (the client's). */
  by: string
  proof: { id: string; name: string; image: boolean } | null
  receiptNumber: string | null
  confirmedBy: string | null; confirmedAt: number | null
  rejectedBy: string | null; rejectedAt: number | null; rejectReason: string | null
  reversedBy: string | null; reversedAt: number | null; reverseReason: string | null
  createdAt: number
  /** (gaps build B, item 6) the receipt's no-login link's token */
  shareToken?: string | null
}
export type PaymentsData = {
  list: PaymentView[]
  /** (parity map, FB-112 — Settings › Finance › Client payments, P-D's `fetchLiveMethodValues`) the ways the studio takes money today */ methods?: string[]
  rules: PaymentRules
  /** Who confirms a client's payment on this project, by name — the banner's "Waiting for Germaine". */
  confirmers: { id: string; name: string }[]
  viewer: { records: boolean; confirms: boolean; reverses: boolean }
}

export function paymentView(r: ProjectPayment, o: { invoiceNumber: string | null; stageName: string; names: Map<string, string>; client: string; proof: { id: string; name: string; mime: string | null; gone: boolean } | null }): PaymentView {
  const name = (id: string | null) => (id ? o.names.get(id) ?? 'Someone' : null)
  return {
    id: r.id, invoiceId: r.invoiceId, invoiceNumber: o.invoiceNumber, stageName: o.stageName,
    amountMinor: r.amountMinor, paidOn: r.paidOn.getTime(), method: r.method, reference: r.reference, note: r.note,
    source: r.source === 'client' ? 'client' : 'studio', status: isPaymentStatus(r.status) ? r.status : 'to_confirm', trusted: r.trusted,
    by: r.source === 'client' ? o.client : name(r.recordedBy) ?? 'Someone',
    proof: o.proof && !o.proof.gone ? { id: o.proof.id, name: o.proof.name, image: !!o.proof.mime?.startsWith('image/') } : null,
    receiptNumber: r.receiptNumber,
    confirmedBy: name(r.confirmedBy), confirmedAt: ms(r.confirmedAt),
    rejectedBy: name(r.rejectedBy), rejectedAt: ms(r.rejectedAt), rejectReason: r.rejectReason,
    reversedBy: name(r.reversedBy), reversedAt: ms(r.reversedAt), reverseReason: r.reverseReason,
    createdAt: r.createdAt.getTime(),
    shareToken: r.receiptNumber ? r.shareToken : null,   // (gaps build B, item 6)
  }
}

/** Every payment of a project, newest first, with the names and the files behind them. */
export async function paymentViewsOf(projectId: string, client: string): Promise<PaymentView[]> {
  const rows = await db.select({ pay: projectPayments, number: projectInvoices.number, stage: projectInvoices.stageName }).from(projectPayments)
    .innerJoin(projectInvoices, eq(projectInvoices.id, projectPayments.invoiceId)).where(eq(projectPayments.projectId, projectId))
    .orderBy(desc(projectPayments.paidOn), desc(projectPayments.createdAt))
  if (!rows.length) return []
  const [people, files] = await Promise.all([
    memberRows(),
    db.select({ id: leadFiles.id, name: leadFiles.name, mime: leadFiles.mime, deletedAt: leadFiles.deletedAt }).from(leadFiles).where(inArray(leadFiles.id, rows.map((r) => r.pay.proofFileId).filter((x): x is string => !!x).concat(['-']))),
  ])
  const names = new Map(people.map((m) => [m.id, m.name]))
  return rows.map((r) => {
    const f = r.pay.proofFileId ? files.find((x) => x.id === r.pay.proofFileId) ?? null : null
    return paymentView(r.pay, { invoiceNumber: r.number, stageName: r.stage, names, client, proof: f ? { id: f.id, name: f.name, mime: f.mime, gone: !!f.deletedAt } : null })
  })
}

/** The Money tab's payments (round 5's `fetchProjectMoney` hands them on). */
export async function fetchPaymentsData(p: Project, l: Lead, viewer: Viewer, teamIds: string[]): Promise<PaymentsData> {
  const rules = await fetchPaymentRules()
  const [list, confirmerIds, people, methods] = await Promise.all([paymentViewsOf(p.id, titleCaseName(l.name)), confirmerIdsFor(l.id, rules), memberRows(), fetchLiveMethodValues()])
  return {
    list, rules, methods,
    confirmers: confirmerIds.map((id) => ({ id, name: people.find((m) => m.id === id)?.name ?? 'Someone' })),
    viewer: { records: recordsPayments(viewer, teamIds), confirms: confirmsPayments(viewer, confirmerIds), reverses: reversesPayments(viewer.role) },
  }
}

/* ── For the listing, the Overview and the rail (many projects at once) ──────────────────────────────────────────────────────── */

export type PaymentFacts = {
  /** Collected on the sent invoices (what counts, never above an invoice's amount). */
  collectedMinor: number
  /** Invoices past their due day with something still owed (a client's proof waiting is not owed), and the longest wait in days. */
  overdue: { n: number; minor: number; days: number }
  /** A client's proofs waiting for their confirmer — counted for the viewer only when they confirm on this project. */
  toConfirm: number
  /** Waiting on client: "Invoice INV-2026-006 awaits payment". */
  waits: string[]
  /* (gaps build B) money in, complete */
  /** Whether these facts were read for the viewer — false for a viewer refused the project's money (every figure then reads nothing). */
  sees?: boolean
  /** (item 8) Collected on the invoices that bill the contract (never a one-off or one recorded for no stage). */
  contractCollectedMinor?: number
  /** (items 5 · 8) The stages' invoices ready to send, oldest first: since when, and how much. */
  ready?: ReadyInvoice[]
}
/** (gaps build B, items 5 · 8) A payment stage's invoice ready to send — a Draft, not submitted, its milestone reached. */
export type ReadyInvoice = { id: string; projectId: string; stage: string; amountMinor: number; since: number; milestone: string | null; due: 'start' | 'end' | null; /** its milestone is done (else begun) */ done?: boolean }
/** The payments' facts for many projects (the listing's Collected, Payment overdue, Needs my review and Waiting on client). */
export async function paymentFactsFor(projects_: { id: string; leadId: string }[], viewer: Pick<Viewer, 'id' | 'role'> & Partial<Pick<Viewer, 'teamIds'>>, now = Date.now()): Promise<Map<string, PaymentFacts>> {
  const out = new Map<string, PaymentFacts>()
  const ids = projects_.map((p) => p.id)
  if (!ids.length) return out
  const [invs, pays, rules, studio, team] = await Promise.all([
    db.select({ id: projectInvoices.id, projectId: projectInvoices.projectId, number: projectInvoices.number, amountMinor: projectInvoices.amountMinor, dueAt: projectInvoices.dueAt, stageRef: projectInvoices.stageRef, externalRef: projectInvoices.externalRef })
      .from(projectInvoices).where(and(inArray(projectInvoices.projectId, ids), eq(projectInvoices.status, 'sent'))),
    db.select({ invoiceId: projectPayments.invoiceId, projectId: projectPayments.projectId, amountMinor: projectPayments.amountMinor, status: projectPayments.status, trusted: projectPayments.trusted })
      .from(projectPayments).where(and(inArray(projectPayments.projectId, ids), inArray(projectPayments.status, ['confirmed', 'to_confirm']))),
    fetchPaymentRules(), memberRows(),
    db.select({ leadId: leadAssignees.leadId, memberId: leadAssignees.memberId }).from(leadAssignees).where(inArray(leadAssignees.leadId, projects_.map((p) => p.leadId))),
  ])
  const all: TeamMember[] = studio.map((m) => ({ id: m.id, role: m.role, active: m.active !== false }))
  const ready = await readyInvoicesFor(ids, now)   // (gaps build B, items 5 · 8)
  for (const p of projects_) {
    const f: PaymentFacts = { collectedMinor: 0, overdue: { n: 0, minor: 0, days: 0 }, toConfirm: 0, waits: [], sees: false, contractCollectedMinor: 0, ready: [] }
    /* (fix-D, D-04 · F-17) a viewer refused the project's money gets no money fact — no "Payment overdue", no invoice waiting, nothing collected */
    if (!seesMoney({ id: viewer.id, role: viewer.role, teamIds: viewer.teamIds ?? [] }, team.filter((t) => t.leadId === p.leadId).map((t) => t.memberId))) { out.set(p.id, f); continue }
    f.sees = true
    f.ready = ready.get(p.id) ?? []   // (gaps build B, items 5 · 8)
    const mine = pays.filter((x) => x.projectId === p.id)
    for (const i of invs.filter((x) => x.projectId === p.id)) {
      const paid = mine.filter((x) => x.invoiceId === i.id && countsAsPaid(x)).reduce((s, x) => s + x.amountMinor, 0)
      const pending = mine.filter((x) => x.invoiceId === i.id && isPending(x)).reduce((s, x) => s + x.amountMinor, 0)
      f.collectedMinor += Math.min(i.amountMinor, paid)
      if (!i.stageRef.startsWith('extra:')) f.contractCollectedMinor = (f.contractCollectedMinor ?? 0) + Math.min(i.amountMinor, paid)   // (gaps build B, item 8)
      const owed = Math.max(0, i.amountMinor - paid - pending)
      if (owed > 0) {
        const days = daysOverdue(ms(i.dueAt), now)
        if (i.dueAt && now >= i.dueAt.getTime() + 86_400_000) { f.overdue.n++; f.overdue.minor += owed; f.overdue.days = Math.max(f.overdue.days, days) }
        else f.waits.push(`Invoice ${i.number ?? i.externalRef ?? ''} awaits payment`.replace('  ', ' '))   // (fix-D, D-45) one line per fact: an overdue one is "Payment overdue" alone
      }
    }
    const waiting = mine.filter((x) => x.status === 'to_confirm').length
    if (waiting) {
      const confirmers = confirmersOf(rules, all.filter((m) => team.some((t) => t.leadId === p.leadId && t.memberId === m.id)), all)
      if (confirmers.includes(viewer.id)) f.toConfirm = waiting
    }
    out.set(p.id, f)
  }
  return out
}

/* ── (gaps build B, items 5 · 8) A stage's invoice ready to send — read light, for many projects at once ─────────────────────────── */

/**
 * The payment stages' invoices ready to send, per project, oldest first: a Draft not waiting for approval, above S$0, whose milestone reached its
 * payment point (begun for a stage due at its start, done for one due at its end), or — on no milestone — a deposit due on signing (the money
 * model's `stageReady`, read without the whole model). Since: the milestone's done day (its last day when it carries none), its start, or the
 * project's own start for a deposit.
 */
export async function readyInvoicesFor(projectIds: string[], now = Date.now()): Promise<Map<string, ReadyInvoice[]>> {
  const out = new Map<string, ReadyInvoice[]>()
  if (!projectIds.length) return out
  const drafts = await db.select({ id: projectInvoices.id, projectId: projectInvoices.projectId, stageRef: projectInvoices.stageRef, stageName: projectInvoices.stageName, amountMinor: projectInvoices.amountMinor })
    .from(projectInvoices).where(and(inArray(projectInvoices.projectId, projectIds), eq(projectInvoices.status, 'draft'), isNull(projectInvoices.submittedAt), eq(projectInvoices.kind, 'stage')))
  const live = drafts.filter((d) => d.amountMinor > 0 && !d.stageRef.startsWith('extra:') && !d.stageRef.startsWith('vo:'))
  if (!live.length) return out
  const pids = [...new Set(live.map((d) => d.projectId))]
  const quoteRefs = live.map((d) => d.stageRef).filter((r) => !r.startsWith('split:'))
  const [ms_, pays, ps] = await Promise.all([
    db.select({ projectId: projectMilestones.projectId, ref: projectMilestones.paymentRef, title: projectMilestones.title, status: projectMilestones.status, due: projectMilestones.paymentDue, start: projectMilestones.startDate, end: projectMilestones.endDate, doneAt: projectMilestones.doneAt })
      .from(projectMilestones).where(and(inArray(projectMilestones.projectId, pids), isNull(projectMilestones.deletedAt), isNotNull(projectMilestones.paymentRef))),
    quoteRefs.length ? db.select({ id: quotePayments.id, dueKind: quotePayments.dueKind }).from(quotePayments).where(inArray(quotePayments.id, quoteRefs)) : Promise.resolve([] as { id: string; dueKind: string }[]),
    db.select({ id: projects.id, createdAt: projects.createdAt, stage: projects.stage }).from(projects).where(inArray(projects.id, pids)),
  ])
  for (const d of live) {
    const p = ps.find((x) => x.id === d.projectId)
    if (!p || p.stage === 'completed') continue
    const m = ms_.find((x) => x.projectId === d.projectId && x.ref === d.stageRef)
    let since: number | null = null
    if (m) {
      const reached = m.due === 'start' ? m.status !== 'not_started' : m.status === 'done'
      if (reached) since = m.due === 'start' ? Math.min(now, m.start.getTime()) : m.doneAt?.getTime() ?? Math.min(now, m.end.getTime())
    } else {
      const onSigning = d.stageRef.startsWith('split:') ? d.stageRef === 'split:0' : pays.find((x) => x.id === d.stageRef)?.dueKind === 'approval'
      if (onSigning) since = p.createdAt.getTime()
    }
    if (since === null) continue
    const list = out.get(d.projectId) ?? []
    list.push({ id: d.id, projectId: d.projectId, stage: d.stageName, amountMinor: d.amountMinor, since, milestone: m?.title ?? null, due: m ? (m.due === 'start' ? 'start' : 'end') : null, done: m?.status === 'done' })
    out.set(d.projectId, list.sort((a, b) => a.since - b.since))
  }
  return out
}

/** (gaps build B, item 5 — 1.0's "Complete & bill", G-255) The bell's row the moment a stage turns Ready: "{stage} invoice is ready to send",
    for the project's team (Owners and Admins when it has none), derived like an overdue invoice and gone once it is sent or submitted. */
export async function derivedReadyRows(memberId: string, role: string, rules: NotificationRules, now = Date.now()): Promise<FeedRow[]> {
  if (!rules.channels.invoice_ready?.in_app) return []
  const ps = await db.select({ id: projects.id, leadId: projects.leadId, name: projects.name }).from(projects).where(and(isNull(projects.deletedAt), inArray(projects.stage, ['setting_up', 'in_progress'])))
  if (!ps.length) return []
  const [ready, links] = await Promise.all([readyInvoicesFor(ps.map((p) => p.id), now), db.select({ leadId: leadAssignees.leadId, memberId: leadAssignees.memberId }).from(leadAssignees).where(inArray(leadAssignees.leadId, ps.map((p) => p.leadId)))])
  const channels = (Object.entries(rules.channels.invoice_ready) as [FeedRow['channels'][number], boolean][]).filter(([, on]) => on).map(([c]) => c)
  const out: FeedRow[] = []
  for (const p of ps) {
    const team = links.filter((x) => x.leadId === p.leadId).map((x) => x.memberId)
    if (!(team.includes(memberId) || (team.length === 0 && runsStudio(role)))) continue
    for (const r of ready.get(p.id) ?? []) {
      out.push({ id: `inv-ready-${r.id}`, kind: 'invoice_ready', title: readySentence(r.stage, r.amountMinor), body: `${p.name} · ${r.milestone ? `${r.milestone} is ${r.done ? 'done' : 'under way'}` : 'due on signing'}`,
        href: `/projects/${p.id}/money?open=${encodeURIComponent(r.id)}`, at: r.since, readAt: null, channels, derived: true, fields: { '{invoice}': r.stage } })   // (S42 audit A-09)
    }
  }
  return out
}

/* ── The bell: an invoice past its due day (derived, as `derivedDue` raises a task — gone the moment it is paid) ────────────────── */

export async function derivedPaymentRows(memberId: string, role: string, rules: NotificationRules, now = Date.now()): Promise<FeedRow[]> {
  if (!rules.channels.payment_overdue.in_app) return []
  const rows = await db.select({ i: projectInvoices, p: projects }).from(projectInvoices).innerJoin(projects, eq(projects.id, projectInvoices.projectId))
    .where(and(eq(projectInvoices.status, 'sent'), isNull(projects.deletedAt), isNotNull(projectInvoices.dueAt)))   // (fix-D, D-11 · E-02) money still owed on a completed project keeps its row
  const late = rows.filter((r) => r.i.dueAt && now >= r.i.dueAt.getTime() + 86_400_000)
  if (!late.length) return []
  const [pays, links] = await Promise.all([
    db.select({ invoiceId: projectPayments.invoiceId, amountMinor: projectPayments.amountMinor, status: projectPayments.status, trusted: projectPayments.trusted }).from(projectPayments)
      .where(and(inArray(projectPayments.invoiceId, late.map((r) => r.i.id)), inArray(projectPayments.status, ['confirmed', 'to_confirm']))),
    db.select({ leadId: leadAssignees.leadId, memberId: leadAssignees.memberId }).from(leadAssignees).where(inArray(leadAssignees.leadId, late.map((r) => r.p.leadId))),
  ])
  const channels = (Object.entries(rules.channels.payment_overdue) as [FeedRow['channels'][number], boolean][]).filter(([, on]) => on).map(([c]) => c)
  const out: FeedRow[] = []
  for (const { i, p } of late) {
    const mine = pays.filter((x) => x.invoiceId === i.id)
    const owed = i.amountMinor - mine.filter(countsAsPaid).reduce((s, x) => s + x.amountMinor, 0) - mine.filter(isPending).reduce((s, x) => s + x.amountMinor, 0)
    if (owed <= 0) continue
    const team = links.filter((x) => x.leadId === p.leadId).map((x) => x.memberId)
    if (!(team.includes(memberId) || (team.length === 0 && runsStudio(role)) || isAccounting(role))) continue   // (parity map, MI-007) Accounting chases every late payment
    const due = i.dueAt!
    /* (fix-D, C's note) the row's day is the invoice's due day — the bell's "Due {day} · n days late" and the body's "due {day}" name one date */
    const at = new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime()   // (REG-1072's rule) its due day's local midnight: "n days late" counts as the Money tab's "n days overdue"
    out.push({ id: `pay-late-${i.id}`, kind: 'payment_overdue', title: `Overdue: ${i.number ?? `the ${i.stageName} invoice`} · ${money2(owed)}`, body: `${p.name} · ${i.stageName}, due ${due.getDate()} ${due.toLocaleString('en-SG', { month: 'short' })}`, href: `/projects/${p.id}/money?open=${encodeURIComponent(i.id)}`, at, readAt: null, channels, derived: true, fields: { '{invoice}': i.stageName } })   // (S42 audit A-09)
  }
  return out
}

/* ── The receipt's page (F-12: the invoice page's frame, on the issuing entity's letterhead) ───────────────────────────────────── */

/** One payment, for its receipt — the viewer's checks first (the project's lead, then money). */
export async function paymentOf(projectId: string, paymentId: string): Promise<ProjectPayment | null> {
  const [r] = await db.select().from(projectPayments).where(and(eq(projectPayments.id, paymentId), eq(projectPayments.projectId, projectId))).limit(1)
  return r ?? null
}
/** What a receipt prints of its invoice: the total, what is paid to date (counting this one when it counts) and what is still owed. */
export async function receiptFigures(pay: ProjectPayment): Promise<{ invoiceTotal: number; paidToDate: number; outstanding: number }> {
  const [inv] = await db.select({ amountMinor: projectInvoices.amountMinor }).from(projectInvoices).where(eq(projectInvoices.id, pay.invoiceId)).limit(1)
  const all = await db.select().from(projectPayments).where(eq(projectPayments.invoiceId, pay.invoiceId))
  /* paid to date as the receipt was issued: this payment, and the others that count and were confirmed before it (a reversed receipt keeps
     its figures — its stamp says Reversed) */
  const at = (pay.confirmedAt ?? pay.createdAt).getTime()
  const before = all.filter((x) => x.id !== pay.id && countsAsPaid(x) && (x.confirmedAt ?? x.createdAt).getTime() <= at)
  const paidToDate = before.reduce((s, x) => s + x.amountMinor, 0) + pay.amountMinor
  const total = inv?.amountMinor ?? 0
  return { invoiceTotal: total, paidToDate: Math.min(total, paidToDate), outstanding: Math.max(0, total - paidToDate) }
}

export type ReceiptDocData = {
  paper: ReceiptPaperData
  project: { id: string; name: string }
  payment: PaymentView
  viewer: { reverses: boolean }
}
/** A receipt's page in the studio: who sees the project's money sees it (F-17); a payment with no receipt (to confirm, not received) has none. */
export async function fetchReceiptDoc(projectId: string, paymentId: string): Promise<ReceiptDocData | null> {
  const pay = await paymentOf(projectId, paymentId)
  if (!pay?.receiptNumber) return null
  const { fetchInvoiceDoc } = await import('./money-queries')
  const d = await fetchInvoiceDoc(projectId, pay.invoiceId)
  if (!d) return null
  const [fig, list] = await Promise.all([receiptFigures(pay), paymentViewsOf(projectId, d.client.name)])
  const view = list.find((x) => x.id === pay.id)
  if (!view) return null
  return {
    paper: {
      letterhead: d.letterhead, studioPhone: d.studio.phone, studioEmail: d.studio.email, client: { name: d.client.name, phone: d.client.phone }, property: d.property,
      project: { name: d.project.name, number: d.project.number }, invoice: { number: d.invoice.number ?? d.invoice.externalRef ?? null, stageName: d.invoice.stageName, pct: d.invoice.pct, kind: d.invoice.kind, outside: d.invoice.outside, fixed: d.invoice.fixedMinor != null },   // (gaps build B)
      payment: { number: pay.receiptNumber, amountMinor: pay.amountMinor, paidOn: pay.paidOn.getTime(), method: pay.method, reference: pay.reference, issuedAt: (pay.confirmedAt ?? pay.createdAt).getTime(), reversed: pay.status === 'reversed' ? { reason: pay.reverseReason ?? '', at: ms(pay.reversedAt) } : null },
      figures: fig,
      layout: d.layout,   // (gaps build B, item 14)
      extra: await receiptExtraOf(pay.id),   // (pending modules S07 — D-14) the extra kept as the client's credit
    },
    project: { id: d.project.id, name: d.project.name },
    payment: view,
    viewer: { reverses: reversesPayments(d.viewer.role) },
  }
}

/* ── A pick's variation order (Choices → money part one's variation mode) ────────────────────────────────────────────────────── */

/** The variation orders drafted from picks, by the choice they came from — the choice card's link ("VO-2 · Draft"). */
export async function variationsOfChoices(selectionIds: string[]): Promise<Map<string, { id: string; number: string; status: string }>> {
  const out = new Map<string, { id: string; number: string; status: string }>()
  if (!selectionIds.length) return out
  const rows = await db.select({ id: quotes.id, number: quotes.number, status: quotes.status, selectionId: quotes.selectionId }).from(quotes)
    .where(and(inArray(quotes.selectionId, selectionIds), eq(quotes.kind, 'variation'), isNull(quotes.deletedAt))).orderBy(asc(quotes.createdAt))
  for (const r of rows) if (r.selectionId) out.set(r.selectionId, { id: r.id, number: r.number, status: r.status })
  return out
}
/** The live variation order already drafted from this choice, if any. */
export async function variationOfChoice(selectionId: string): Promise<{ id: string; number: string } | null> {
  return (await variationsOfChoices([selectionId])).get(selectionId) ?? null
}
/** Is the choice on this project? (The action's guard before it drafts.) */
export async function choiceOnProject(selectionId: string): Promise<{ projectId: string } | null> {
  const [s] = await db.select({ projectId: projectSelections.projectId }).from(projectSelections).where(and(eq(projectSelections.id, selectionId), isNull(projectSelections.deletedAt))).limit(1)
  return s ?? null
}

/* ── The client's name on a payment they sent ───────────────────────────────────────────────────────────────────────────────── */

export async function homeownerName(id: string | null): Promise<string | null> {
  if (!id) return null
  const [h] = await db.select({ name: homeownerProfiles.name }).from(homeownerProfiles).where(eq(homeownerProfiles.id, id)).limit(1)
  return h ? titleCaseName(h.name) : null
}

/** The money summary the actions read after a write (a sentence names what the invoice is now). */
export async function invoiceAfter(p: Project, invoiceId: string, now = Date.now()) {
  const { moneyInputOf } = await import('./money-queries')
  const m = moneyOf(await moneyInputOf(p), now)
  return m.invoices.find((i) => i.id === invoiceId) ?? null
}
