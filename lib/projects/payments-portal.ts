import 'server-only'   // libSQL never reaches the browser: every client import of this module is `import type`
import { receiptExtraOf } from '@/lib/finance/credit-records'   // (pending modules S07)
import { and, desc, eq, inArray, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leadFiles, leads, projectInvoices, projectMilestones, projectPayments, projectScheduleShares, projects, type ProjectPayment } from '@/lib/db/schema'
import { titleCaseName } from '@/lib/format'
import { fetchBrand } from '@/lib/templates/queries'
import type { IssuingEntity } from '@/lib/templates/model'
import type { HomeFacts } from '@/lib/portal/needs'
import type { PortalVisitor } from '@/lib/portal/session'
import { portalPeopleOf, portalWho } from '@/lib/portal/household'
import { dayOfIso, parseSnapshot } from './schedule-model'
import { moneyOf, type InvoiceView, type MoneySummary } from './money'
import { letterheadOf, moneyInputOf } from './money-queries'
import { countsAsPaid } from './payments-model'
import { receiptFigures } from './payments'
import { paperForEntity } from './invoices-paper-queries'
import { fetchLiveMethodValues } from './payment-methods-queries'   // (parity map, FB-112 — P-D)
import type { InvoicePaperData } from '@/components/projects/money/invoice-paper'
import type { ReceiptPaperData } from '@/components/projects/money/payments-receipt'

/*
 * (Projects round 6 — the portal's Money tab, board 4, and What needs you's payment row, board 1) What the client reads of their project's
 * money: the contract as signed (with the changes they approved), what they have paid of it, each payment stage — paid with its receipt,
 * due with how to pay (the issuing entity's bank and PayNow, F-15: the one store, lib/company/entities.ts' records), waiting for the studio to
 * confirm, or planned — and their own proofs' answers. Only what is the client's leaves here: invoices sent (never a Draft's figures beyond
 * its share, never a void one), their own payments; no cost, no member's name, no internal note.
 */

const ms = (d: Date | null | undefined) => (d ? d.getTime() : null)

export type PortalPayStage = {
  key: string
  name: string
  pct: number
  amountMinor: number
  /** paid · due (sent, something owed) · to_confirm (the client's proof covers what is owed) · planned (not invoiced yet) */
  state: 'paid' | 'due' | 'to_confirm' | 'planned'
  invoiceId: string | null
  number: string | null
  dueAt: number | null
  /** (fix-F, F-35) When the invoice was sent — I have paid's day can't be before it. */
  sentAt?: number | null
  /** The day the last counted payment arrived — "Paid 8 Aug". */
  paidAt: number | null
  /** What is still owed after what counts and what waits (0 when nothing). */
  owedMinor: number
  paidMinor: number
  receipts: { paymentId: string; number: string; paidOn: number; amountMinor: number; reversed: boolean; /** (pending modules S07) taken from the client's credit note */ fromCredit?: string | null }[]
  /** (gaps build F2 — F2-Q9) the credit notes on its invoice — each opens its paper; a void one says so; (pending modules S07) an overpayment held
      as the client's credit says so, with what is left of it */
  credits?: { id: string; number: string; amountMinor: number; issuedAt: number; voided: boolean; overpayment?: boolean; leftMinor?: number
    /** (S42 audit C-22) a credit note whose money the studio still owes back (paid beyond what its invoice owes after it, not yet refunded) */ backMinor?: number }[]
  /** The client's proofs waiting for the studio (or trusted and still to be checked) — (fix-F, F-03) each with who sent it: `mine` for the
      reader's own ("You told…"), else the household person's given name. */
  waiting: { paymentId: string; amountMinor: number; paidOn: number; reference: string | null; at: number; by: string | null; mine: boolean }[]
  /** The newest proof the studio said did not arrive, with its reason — shown until something newer answers it. */
  refused: { amountMinor: number; paidOn: number; reason: string; at: number } | null
  /** When a planned stage falls: the schedule as last shared ("Planned for Fri 13 Nov"), else the quote's words ("Upon handover").
      (fix-F, F-34) `milestone` — the stage of the shared schedule it waits on, for a planned day already past. */
  planned: { day: number | null; words: string | null; milestone?: string | null } | null
}
export type PortalPay = { entity: string; accountName: string; bankName: string; accountNo: string; swift: string; payNow: string | null; payNowQr: string | null
  /** (parity map, CP-089 · FB-112 — P-D's pay box) the bank's branch code, and the ways the studio takes money today */ branch?: string; methods?: string[] }
export type PortalMoneyHome = {
  homeId: string
  leadId: string
  projectId: string
  place: string
  contractMinor: number
  baseMinor: number | null
  variationsMinor: number
  variationsCount: number
  paidMinor: number
  stages: PortalPayStage[]
  /** How to pay — the entity the invoices are raised under. null when the studio has no bank or PayNow on it yet. */
  pay: PortalPay | null
}

const plannedOf = (stageRef: string, milestones: { paymentRef: string | null; paymentDue: string | null; id: string }[], snap: ReturnType<typeof parseSnapshot>, words: string | null) => {
  const m = milestones.find((x) => x.paymentRef === stageRef)
  const row = m && snap ? snap.rows.find((r) => r.id === m.id) : null
  const day = row ? dayOfIso(m!.paymentDue === 'start' ? row.start : row.end) : null
  return { day, words, milestone: row?.title ?? null }
}

function stagesOf(m: MoneySummary, pays: ProjectPayment[], milestones: { id: string; paymentRef: string | null; paymentDue: string | null }[], snap: ReturnType<typeof parseSnapshot>, who: (homeownerId: string | null) => { mine: boolean; name: string | null } = () => ({ mine: true, name: null })): PortalPayStage[] {
  /* (gaps build B) the client's invoices outside the stages — a one-off, a variation order billed on its own, one recorded from elsewhere — once
     sent, after the stages, on the same row (their name alone: they are no share of anything) */
  const extras = m.extras.filter((i) => i.status === 'sent').map((i) => ({ ref: i.stageRef, name: i.kind === 'variation' ? `Variation order ${i.stageName}` : i.stageName, pct: 0, due: null as string | null, invoice: i }))
  return [...m.stages, ...extras].map((s) => {
    const i: InvoiceView | null = s.invoice && s.invoice.status === 'sent' ? s.invoice : null
    if (!i) {
      return { key: s.ref, name: s.name, pct: s.pct, amountMinor: s.invoice?.amountMinor ?? ('nominalMinor' in s ? s.nominalMinor : 0), state: 'planned', invoiceId: null, number: null, dueAt: null, paidAt: null, owedMinor: 0, paidMinor: 0, receipts: [], waiting: [], refused: null, planned: plannedOf(s.ref, milestones, snap, s.due) }
    }
    const mine = pays.filter((p) => p.invoiceId === i.id)
    const counted = mine.filter(countsAsPaid)
    const waiting = mine.filter((p) => p.status === 'to_confirm')
    const owed = Math.max(0, i.balanceMinor - i.toConfirmMinor)
    const lastRefused = mine.filter((p) => p.status === 'not_received').sort((a, b) => (b.rejectedAt?.getTime() ?? 0) - (a.rejectedAt?.getTime() ?? 0))[0] ?? null
    const newestOther = Math.max(0, ...mine.filter((p) => p.status !== 'not_received').map((p) => p.createdAt.getTime()))
    return {
      key: s.ref, name: s.name, pct: s.pct, amountMinor: i.amountMinor,
      state: i.paidMinor + (i.creditedMinor ?? 0) >= i.amountMinor ? 'paid' : owed > 0 ? 'due' : 'to_confirm',
      invoiceId: i.id, number: i.label, dueAt: i.dueAt, sentAt: i.sentAt,
      paidAt: counted.length ? Math.max(...counted.map((p) => p.paidOn.getTime())) : null,
      owedMinor: owed, paidMinor: i.paidMinor,
      receipts: mine.filter((p) => p.receiptNumber && (p.status === 'confirmed' || p.status === 'reversed')).map((p) => ({ paymentId: p.id, number: p.receiptNumber!, paidOn: p.paidOn.getTime(), amountMinor: p.amountMinor, reversed: p.status === 'reversed', fromCredit: p.creditNoteId ? p.reference : null })),
      waiting: waiting.map((p) => { const w = who(p.submittedBy); return { paymentId: p.id, amountMinor: p.amountMinor, paidOn: p.paidOn.getTime(), reference: p.reference, at: p.createdAt.getTime(), by: w.name, mine: w.mine } }),
      refused: lastRefused && (lastRefused.rejectedAt?.getTime() ?? 0) > newestOther && owed > 0 ? { amountMinor: lastRefused.amountMinor, paidOn: lastRefused.paidOn.getTime(), reason: lastRefused.rejectReason ?? '', at: lastRefused.rejectedAt?.getTime() ?? 0 } : null,
      planned: null,
    }
  })
}

/* (parity map, CP-089 · FB-112 — P-D) the branch code and the live ways ride along; with only cheques or cash taken, the box still says how to pay */
export const payOf = (e: IssuingEntity | null, methods?: string[]): PortalPay | null => {   // (S44R) the signing page's deposit reads it too
  const inPersonOnly = !!methods?.length && !methods.includes('bank_transfer') && !methods.includes('paynow')
  return e && (e.accountNo || e.payNow || inPersonOnly) ? { entity: e.name, accountName: e.accountName || e.name, bankName: e.bankName, accountNo: e.accountNo, swift: e.swift, payNow: e.payNow || null, payNowQr: e.payNowQr, branch: e.branch ?? '', ...(methods ? { methods } : {}) } : null
}

/** Each of the visitor's homes that is a project: its money as the client reads it. */
export async function fetchPortalMoney(links: { linkId: string; leadId: string }[], now = Date.now(), readerId: string | null = null): Promise<PortalMoneyHome[]> {
  const leadIds = links.map((l) => l.leadId)
  if (!leadIds.length) return []
  const ps = await db.select({ p: projects, l: leads }).from(projects).innerJoin(leads, eq(leads.id, projects.leadId)).where(and(inArray(projects.leadId, leadIds), isNull(projects.deletedAt)))
  if (!ps.length) return []
  const ids = ps.map((x) => x.p.id)
  const [pays, msRows, shares, brand, people, methods] = await Promise.all([
    db.select().from(projectPayments).where(inArray(projectPayments.projectId, ids)),
    db.select({ id: projectMilestones.id, projectId: projectMilestones.projectId, paymentRef: projectMilestones.paymentRef, paymentDue: projectMilestones.paymentDue }).from(projectMilestones).where(and(inArray(projectMilestones.projectId, ids), isNull(projectMilestones.deletedAt))),
    db.select().from(projectScheduleShares).where(inArray(projectScheduleShares.projectId, ids)).orderBy(desc(projectScheduleShares.sharedAt)),
    fetchBrand(),
    portalPeopleOf(leadIds),   // (fix-F, F-03) who sent each proof
    fetchLiveMethodValues(),   // (parity map, FB-112 — P-D) the pay box follows the live ways
  ])
  const out: PortalMoneyHome[] = []
  for (const l of links) {
    const row = ps.find((x) => x.l.id === l.leadId)
    if (!row) continue
    const { p } = row
    const input = await moneyInputOf(p)
    if (!input.stages.length) continue
    const m = moneyOf(input, now)
    const snap = parseSnapshot(shares.find((s) => s.projectId === p.id)?.snapshot ?? null)
    const firstSent = m.invoices.find((i) => i.status === 'sent')
    const { entity } = await letterheadOf(brand, firstSent?.issuingEntity ?? input.quote?.issuingEntity ?? null, p.quoteId)
    const place = (row.l.propertyAddress ?? row.l.leadAddress ?? '').split(',')[0]?.trim() ?? ''
    out.push({
      homeId: l.linkId, leadId: l.leadId, projectId: p.id, place,
      contractMinor: m.contractMinor, baseMinor: m.baseMinor, variationsMinor: m.variationsMinor, variationsCount: m.variations.filter((v) => v.approved).length,
      paidMinor: m.collectedMinor,
      stages: stagesOf(m, pays.filter((x) => x.projectId === p.id), msRows.filter((x) => x.projectId === p.id), snap, (id) => portalWho(people.get(l.leadId), id, readerId))
        .map((st) => ({ ...st, credits: (input.credits ?? []).filter((c) => c.invoiceId === st.invoiceId).map((c) => ({ id: c.id, number: c.number, amountMinor: c.amountMinor, issuedAt: c.issuedAt, voided: c.status === 'void',
          ...(c.kind === 'overpayment' ? { overpayment: true, leftMinor: m.held?.find((h) => h.id === c.id)?.heldMinor ?? 0 }
            /* (S42 audit C-22) the refund the studio's Needs you holds (lib/projects/money-needs.ts `money-to-refund`) — the same figure, said to the client */
            : c.status !== 'void' && !c.refundedMinor ? { backMinor: Math.max(0, Math.min(m.invoices.find((i) => i.id === c.invoiceId)?.refundDueMinor ?? 0, c.amountMinor)) } : {}) })) })),   // (gaps build F2) · (pending modules S07)
      pay: payOf(entity, methods),
    })
  }
  return out
}

/* ── What needs you (lib/portal/needs.ts NEED_PRODUCERS) and Before work starts' deposit ───────────────────────────────────────── */

/** A payment stage as What needs you and Before work starts read it (`HomeFacts.payments`). */
export type HomePayment = { invoiceId: string; projectId: string; stage: string; number: string | null; position: number; owedMinor: number; dueAt: number | null; sentAt: number | null; state: PortalPayStage['state']; paidAt: number | null }
/** (lib/portal/home.ts `loadHomeFacts`) Each home's invoices the client has: sent, with what is owed — fills `facts.payments` in place. */
export async function attachHomePayments(facts: Map<string, HomeFacts>, now = Date.now()): Promise<void> {
  const leadIds = [...facts.keys()]
  if (!leadIds.length) return
  const ps = await db.select().from(projects).where(and(inArray(projects.leadId, leadIds), isNull(projects.deletedAt)))
  for (const p of ps) {
    const f = facts.get(p.leadId)
    if (!f) continue
    const input = await moneyInputOf(p)
    const m = moneyOf(input, now)
    f.payments = m.stages.map((s): HomePayment => {
      const i = s.invoice && s.invoice.status === 'sent' ? s.invoice : null
      const owed = i ? Math.max(0, i.balanceMinor - i.toConfirmMinor) : 0
      return { invoiceId: i?.id ?? s.ref, projectId: p.id, stage: s.name, number: i?.number ?? null, position: s.position, owedMinor: owed, dueAt: i?.dueAt ?? null, sentAt: i?.sentAt ?? null,
        state: !i ? 'planned' : i.paidMinor + (i.creditedMinor ?? 0) >= i.amountMinor ? 'paid' : owed > 0 ? 'due' : 'to_confirm', paidAt: null }
    }).concat(m.extras.filter((i) => i.status === 'sent').map((i): HomePayment => {   // (gaps build B) an invoice outside the stages, once sent
      const owed = Math.max(0, i.balanceMinor - i.toConfirmMinor)
      return { invoiceId: i.id, projectId: p.id, stage: i.kind === 'variation' ? `Variation order ${i.stageName}` : i.stageName, number: i.label, position: i.position, owedMinor: owed, dueAt: i.dueAt, sentAt: i.sentAt,
        state: i.paidMinor + (i.creditedMinor ?? 0) >= i.amountMinor ? 'paid' : owed > 0 ? 'due' : 'to_confirm', paidAt: null }
    }))
  }
}

/* ── The client's own documents: an invoice and a receipt, on the paper the studio's pages print ────────────────────────────────── */

async function paperBase(p: typeof projects.$inferSelect, invoiceId: string, now: number) {
  const input = await moneyInputOf(p)
  const m = moneyOf(input, now)
  const invoice = m.invoices.find((i) => i.id === invoiceId && i.status !== 'draft')
  if (!invoice) return null
  const [brand, [lead]] = await Promise.all([fetchBrand(), db.select().from(leads).where(eq(leads.id, p.leadId)).limit(1)])
  const { entity, letterhead } = await letterheadOf(brand, invoice.issuingEntity, p.quoteId)
  const quoteNumber = input.quote?.number ?? null
  const layout = await paperForEntity(brand.details.entities, entity?.name ?? null)   // (gaps build B, item 14)
  return {
    invoice, money: m, entity, letterhead, studio: brand.details, layout, methods: await fetchLiveMethodValues(),   // (parity map, FB-112)
    client: { name: titleCaseName(lead?.name ?? ''), phone: lead?.phone ?? '' }, property: lead?.propertyAddress ?? lead?.leadAddress ?? null,
    project: { name: p.name, number: p.number }, quoteNumber,
  }
}
/** A visitor's project, when the invoice or payment is on one of their homes; null otherwise (never says why). */
async function projectFor(visitor: PortalVisitor, projectId: string) {
  const [p] = await db.select().from(projects).where(and(eq(projects.id, projectId), isNull(projects.deletedAt))).limit(1)
  return p && visitor.links.some((l) => l.leadId === p.leadId) ? p : null
}

export async function fetchPortalInvoice(visitor: PortalVisitor, invoiceId: string, now = Date.now()): Promise<InvoicePaperData | null> {
  const [row] = await db.select({ projectId: projectInvoices.projectId, status: projectInvoices.status }).from(projectInvoices).where(eq(projectInvoices.id, invoiceId)).limit(1)
  if (!row || row.status === 'draft') return null
  const p = await projectFor(visitor, row.projectId)
  if (!p) return null
  const b = await paperBase(p, invoiceId, now)
  if (!b) return null
    return {
    invoice: b.invoice, money: b.money, letterhead: b.letterhead, entity: b.entity, studioPhone: b.studio.phone, studioEmail: b.studio.email,
    client: b.client, property: b.property, project: b.project, quoteNumber: b.quoteNumber, draftDue: now, now, layout: b.layout,   // (gaps build B, item 14)
    methods: b.methods,   // (parity map, FB-112 — P-D) How to pay follows the live ways
  }
}

export async function fetchPortalReceipt(visitor: PortalVisitor, paymentId: string, now = Date.now()): Promise<ReceiptPaperData | null> {
  const [pay] = await db.select().from(projectPayments).where(eq(projectPayments.id, paymentId)).limit(1)
  if (!pay || !pay.receiptNumber) return null
  const p = await projectFor(visitor, pay.projectId)
  if (!p) return null
  const b = await paperBase(p, pay.invoiceId, now)
  if (!b) return null
  const fig = await receiptFigures(pay)
  return {
    letterhead: b.letterhead, studioPhone: b.studio.phone, studioEmail: b.studio.email, client: b.client, property: b.property, project: b.project,
    invoice: { number: b.invoice.label, stageName: b.invoice.stageName, pct: b.invoice.pct, kind: b.invoice.kind, outside: b.invoice.outside, fixed: b.invoice.fixedMinor != null },   // (gaps build B)
    payment: { number: pay.receiptNumber, amountMinor: pay.amountMinor, paidOn: pay.paidOn.getTime(), method: pay.method, reference: pay.reference, issuedAt: (pay.confirmedAt ?? pay.createdAt).getTime(), reversed: pay.status === 'reversed' ? { reason: pay.reverseReason ?? '', at: ms(pay.reversedAt) } : null },
    figures: fig, layout: b.layout, extra: await receiptExtraOf(pay.id),   // (pending modules S07)
  }
}

/** (lib/portal/files.ts PORTAL_FILE_RULES) A file the client may open because it is the proof of a payment they sent themselves. */
export async function isOwnProof(fileId: string, leadId: string): Promise<boolean> {
  const [hit] = await db.select({ id: projectPayments.id }).from(projectPayments).innerJoin(projects, eq(projects.id, projectPayments.projectId))
    .innerJoin(leadFiles, eq(leadFiles.id, projectPayments.proofFileId))
    .where(and(eq(projectPayments.proofFileId, fileId), eq(projectPayments.source, 'client'), eq(projects.leadId, leadId))).limit(1)
  return !!hit
}
