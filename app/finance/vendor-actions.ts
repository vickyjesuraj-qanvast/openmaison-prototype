'use server'

import { randomUUID } from 'node:crypto'
import { and, eq, inArray, ne } from 'drizzle-orm'
import { db } from '@/lib/db'
import { expenses, paymentsOut, priceBookItems, purchaseOrders, quoteItems, supplierBills, vendors, type Vendor } from '@/lib/db/schema'
import { projectContractors } from '@/lib/db/schema'   // (S45B) a merge moves the contractor's crew rows too
import { CODE_MAX, clampCrewCapacity, parseCrewTrades } from '@/lib/projects/contractors-model'
import { fetchViewer } from '@/lib/leads/visibility'
import { EMAIL_RE, MSG } from '@/lib/forms'
import { isSgPhone } from '@/lib/format'
import { NAME_MAX, NOTE_MAX, nameKey, type VendorRecord } from '@/lib/finance/model'
import { VENDOR_RULE, changesVendor, seesBank } from '@/lib/finance/rules'
import { vendorRecord } from '@/lib/finance/queries'
import { GONE, isRefusal, touchCosts, type Refusal } from '@/lib/finance/server'
import { workspaceRefusal } from '@/lib/settings/desk'   // (S45C) the workspace's role rule

/*
 * (gaps build F1 — F1-Q4) The studio's vendors: anyone adds one (a PO's or a bill's picker adds in place, 1.0's way); changing one, its bank
 * details, deactivating and merging are the Owners' and Admins'. Every refusal is `{ error: <the rule> }`; every removal answers with an Undo.
 */
export type VendorInput = {
  name: string; trade?: string | null; contactName?: string | null; phone?: string | null; email?: string | null; uen?: string | null; chargesGst?: boolean
  bankName?: string | null; accountName?: string | null; accountNo?: string | null; payNow?: string | null; notes?: string | null
  /** (S45B · H-UHD-2) Works on site: the studio's trades they do, how many sites at once, the studio's code — left out = unchanged */
  contractor?: { on: boolean; trades: string[]; capacity: number; code?: string | null }
}
const clean = (v: string | null | undefined, max = 120) => { const t = (v ?? '').trim().replace(/\s+/g, ' ').slice(0, max); return t || null }
const digits = (v: string | null | undefined) => (v ?? '').replace(/\D/g, '')

async function sameName(name: string, except?: string): Promise<Vendor | null> {
  const key = nameKey(name)
  const rows = await db.select().from(vendors).where(and(eq(vendors.isActive, true), except ? ne(vendors.id, except) : undefined))
  return rows.find((r) => nameKey(r.name) === key) ?? null
}
/** The input's problems, the house messages; null when it is fine. */
function problem(i: VendorInput): string | null {
  if (!clean(i.name, NAME_MAX)) return 'Give the vendor a name'
  const ph = digits(i.phone)
  if (ph && !isSgPhone(ph)) return MSG.phone
  const em = clean(i.email)
  if (em && !EMAIL_RE.test(em)) return MSG.email
  /* (S45B) a contractor names at least one trade and runs 1 to 20 sites at once */
  if (i.contractor?.on) {
    if (!parseCrewTrades(i.contractor.trades).length) return 'Pick the trades they do on site'
    if (clampCrewCapacity(i.contractor.capacity) === null) return MSG.capacity
  }
  return null
}
function columns(i: VendorInput, bank: boolean) {
  return {
    name: clean(i.name, NAME_MAX)!, trade: clean(i.trade, 60), contactName: clean(i.contactName), phone: digits(i.phone) || null, email: clean(i.email), uen: clean(i.uen, 20)?.toUpperCase() ?? null,
    chargesGst: !!i.chargesGst, notes: clean(i.notes, NOTE_MAX),
    ...(i.contractor ? contractorColumns(i) : {}),
    ...(bank ? { bankName: clean(i.bankName, 60), accountName: clean(i.accountName), accountNo: clean(i.accountNo, 30), payNow: clean(i.payNow, 30) } : {}),
  }
}

/** (S45B) The contractor's columns — on: its trades (the first is the vendor's Trade when none is set), sites at once, code; off: the switch only
    (the trades stay, so switching it back on finds them). */
function contractorColumns(i: VendorInput) {
  const c = i.contractor!
  if (!c.on) return { isContractor: false }
  const trades = parseCrewTrades(c.trades)
  return { isContractor: true, tradesJson: JSON.stringify(trades), crewCapacity: clampCrewCapacity(c.capacity) ?? 1, code: clean(c.code, CODE_MAX), ...(clean(i.trade, 60) ? {} : { trade: trades[0] ?? null }) }
}

/** Add a vendor — anyone (a designer mid-PO). The bank details only from an Owner or an Admin; a name already in the directory is refused. */
export async function createVendor(i: VendorInput): Promise<{ vendor: VendorRecord } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const viewer = await fetchViewer()
  const why = problem(i); if (why) return { error: why }
  const twin = await sameName(i.name)
  if (twin) return { error: `${twin.name} is in the directory already — pick it` }
  const id = randomUUID(), now = new Date()
  await db.insert(vendors).values({ id, ...columns(i, seesBank(viewer.role)), isActive: true, createdBy: viewer.id, createdAt: now, updatedAt: now })
  const [v] = await db.select().from(vendors).where(eq(vendors.id, id)).limit(1)
  touchCosts()
  return { vendor: vendorRecord(v!, seesBank(viewer.role)) }
}

/** Change a vendor (Owners and Admins). */
export async function updateVendor(id: string, i: VendorInput): Promise<{ vendor: VendorRecord } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const viewer = await fetchViewer()
  if (!changesVendor(viewer.role)) return { error: VENDOR_RULE }
  const [v] = await db.select().from(vendors).where(eq(vendors.id, id)).limit(1)
  if (!v || v.mergedInto) return { error: GONE }
  const why = problem(i); if (why) return { error: why }
  const twin = await sameName(i.name, id)
  if (twin) return { error: `${twin.name} is in the directory already — merge the two instead` }
  const before = v.name
  await db.update(vendors).set({ ...columns(i, true), updatedBy: viewer.id, updatedAt: new Date() }).where(eq(vendors.id, id))
  /* a renamed vendor's name follows where it is written as words — the price book and the quotes' Vendor/Sub (F1-Q4) */
  const after = clean(i.name, NAME_MAX)!
  if (after !== before) {
    await db.update(priceBookItems).set({ vendor: after }).where(eq(priceBookItems.vendor, before))
    await db.update(quoteItems).set({ vendor: after }).where(eq(quoteItems.vendor, before))
  }
  const [n] = await db.select().from(vendors).where(eq(vendors.id, id)).limit(1)
  touchCosts()
  return { vendor: vendorRecord(n!, true) }
}

/** Deactivate (leaves every picker; its records stay) or reactivate a vendor — with Undo. */
export async function setVendorActive(id: string, active: boolean): Promise<{ ok: true; name: string } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const viewer = await fetchViewer()
  if (!changesVendor(viewer.role)) return { error: VENDOR_RULE }
  const [v] = await db.select().from(vendors).where(eq(vendors.id, id)).limit(1)
  if (!v || v.mergedInto) return { error: GONE }
  if (active) { const twin = await sameName(v.name, id); if (twin) return { error: `${twin.name} is active already — merge the two instead` } }
  await db.update(vendors).set({ isActive: active, deactivatedAt: active ? null : new Date(), updatedBy: viewer.id, updatedAt: new Date() }).where(eq(vendors.id, id))
  touchCosts()
  return { ok: true, name: v.name }
}

/* ── Merge (F1-Q4) ────────────────────────────────────────────────────────────────────────────────────────────────────────────── */

export type MergePreview = { pos: number; bills: number; expenses: number; payments: number; book: number; quoteLines: number; fills: string[]; /** (S45B) its places on projects */ crew?: number }
export type MergeUndo = { fromId: string; intoId: string; pos: string[]; bills: string[]; expenses: string[]; payments: string[]; book: string[]; quoteLines: string[]; filled: Record<string, string | null>; fromName: string; /** (S45B) */ crew?: string[] }

const FILLABLE: { key: 'phone' | 'email' | 'uen' | 'contactName' | 'trade' | 'bankName' | 'accountName' | 'accountNo' | 'payNow'; label: string }[] = [
  { key: 'contactName', label: 'contact' }, { key: 'phone', label: 'mobile' }, { key: 'email', label: 'email' }, { key: 'uen', label: 'UEN' }, { key: 'trade', label: 'trade' },
  { key: 'bankName', label: 'bank' }, { key: 'accountName', label: 'account name' }, { key: 'accountNo', label: 'account number' }, { key: 'payNow', label: 'PayNow' },
]
async function pair(fromId: string, intoId: string): Promise<{ from: Vendor; into: Vendor } | Refusal> {
  if (fromId === intoId) return { error: 'Pick another vendor to keep' }
  const rows = await db.select().from(vendors).where(inArray(vendors.id, [fromId, intoId]))
  const from = rows.find((r) => r.id === fromId), into = rows.find((r) => r.id === intoId)
  if (!from || !into || from.mergedInto || into.mergedInto) return { error: GONE }
  return { from, into }
}
/** What a merge moves — read only, so the dialog says it before anything moves (1.0's preview). */
export async function previewMerge(fromId: string, intoId: string): Promise<MergePreview | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const viewer = await fetchViewer()
  if (!changesVendor(viewer.role)) return { error: VENDOR_RULE }
  const pr = await pair(fromId, intoId); if (isRefusal(pr)) return pr
  const [pos, bills, exps, pays, book, lines] = await Promise.all([
    db.select({ id: purchaseOrders.id }).from(purchaseOrders).where(eq(purchaseOrders.vendorId, fromId)),
    db.select({ id: supplierBills.id }).from(supplierBills).where(eq(supplierBills.vendorId, fromId)),
    db.select({ id: expenses.id }).from(expenses).where(eq(expenses.vendorId, fromId)),
    db.select({ id: paymentsOut.id }).from(paymentsOut).where(eq(paymentsOut.vendorId, fromId)),
    db.select({ id: priceBookItems.id }).from(priceBookItems).where(eq(priceBookItems.vendor, pr.from.name)),
    db.select({ id: quoteItems.id }).from(quoteItems).where(eq(quoteItems.vendor, pr.from.name)),
  ])
  const crew = await db.select({ id: projectContractors.id }).from(projectContractors).where(eq(projectContractors.vendorId, fromId))   // (S45B)
  const fills = [...FILLABLE.filter((f) => !pr.into[f.key] && pr.from[f.key]).map((f) => f.label), ...(!pr.into.isContractor && pr.from.isContractor ? ['contractor details'] : [])]
  return { pos: pos.length, bills: bills.length, expenses: exps.length, payments: pays.length, book: book.length, quoteLines: lines.length, fills, crew: crew.length }
}
/** Merge a duplicate into the vendor that stays: its records move, the price book's and the quotes' names follow, the one that stays takes the
    details it lacks; the duplicate is kept as merged. One sentence with Undo. */
export async function mergeVendors(fromId: string, intoId: string): Promise<{ sentence: string; undo: MergeUndo } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const viewer = await fetchViewer()
  if (!changesVendor(viewer.role)) return { error: VENDOR_RULE }
  const pr = await pair(fromId, intoId); if (isRefusal(pr)) return pr
  const { from, into } = pr
  const undo: MergeUndo = { fromId, intoId, pos: [], bills: [], expenses: [], payments: [], book: [], quoteLines: [], filled: {}, fromName: from.name }
  await db.transaction(async (tx) => {
    undo.pos = (await tx.select({ id: purchaseOrders.id }).from(purchaseOrders).where(eq(purchaseOrders.vendorId, fromId))).map((r) => r.id)
    undo.bills = (await tx.select({ id: supplierBills.id }).from(supplierBills).where(eq(supplierBills.vendorId, fromId))).map((r) => r.id)
    undo.expenses = (await tx.select({ id: expenses.id }).from(expenses).where(eq(expenses.vendorId, fromId))).map((r) => r.id)
    undo.payments = (await tx.select({ id: paymentsOut.id }).from(paymentsOut).where(eq(paymentsOut.vendorId, fromId))).map((r) => r.id)
    undo.book = (await tx.select({ id: priceBookItems.id }).from(priceBookItems).where(eq(priceBookItems.vendor, from.name))).map((r) => r.id)
    undo.quoteLines = (await tx.select({ id: quoteItems.id }).from(quoteItems).where(eq(quoteItems.vendor, from.name))).map((r) => r.id)
    undo.crew = (await tx.select({ id: projectContractors.id }).from(projectContractors).where(eq(projectContractors.vendorId, fromId))).map((r) => r.id)   // (S45B)
    if (undo.crew.length) await tx.update(projectContractors).set({ vendorId: intoId }).where(inArray(projectContractors.id, undo.crew))
    if (undo.pos.length) await tx.update(purchaseOrders).set({ vendorId: intoId }).where(inArray(purchaseOrders.id, undo.pos))
    if (undo.bills.length) await tx.update(supplierBills).set({ vendorId: intoId }).where(inArray(supplierBills.id, undo.bills))
    if (undo.expenses.length) await tx.update(expenses).set({ vendorId: intoId }).where(inArray(expenses.id, undo.expenses))
    if (undo.payments.length) await tx.update(paymentsOut).set({ vendorId: intoId }).where(inArray(paymentsOut.id, undo.payments))
    if (undo.book.length) await tx.update(priceBookItems).set({ vendor: into.name }).where(inArray(priceBookItems.id, undo.book))
    if (undo.quoteLines.length) await tx.update(quoteItems).set({ vendor: into.name }).where(inArray(quoteItems.id, undo.quoteLines))
    const fill: Partial<Vendor> = {}
    for (const f of FILLABLE) if (!into[f.key] && from[f.key]) { undo.filled[f.key] = into[f.key] ?? null; (fill as Record<string, unknown>)[f.key] = from[f.key] }
    if (!into.chargesGst && from.chargesGst) { undo.filled.chargesGst = '0'; fill.chargesGst = true }
    /* (S45B) the one that stays takes the duplicate's contractor details when it has none */
    if (!into.isContractor && from.isContractor) { undo.filled.contractor = JSON.stringify({ tradesJson: into.tradesJson, crewCapacity: into.crewCapacity, code: into.code }); Object.assign(fill, { isContractor: true, tradesJson: from.tradesJson, crewCapacity: from.crewCapacity, code: from.code }) }
    if (Object.keys(fill).length) await tx.update(vendors).set({ ...fill, updatedBy: viewer.id, updatedAt: new Date() }).where(eq(vendors.id, intoId))
    await tx.update(vendors).set({ isActive: false, mergedInto: intoId, mergedAt: new Date(), mergedBy: viewer.id, deactivatedAt: new Date() }).where(eq(vendors.id, fromId))
  })
  touchCosts()
  const moved = [undo.pos.length ? `${undo.pos.length} PO${undo.pos.length === 1 ? '' : 's'}` : '', undo.bills.length ? `${undo.bills.length} bill${undo.bills.length === 1 ? '' : 's'}` : '', undo.expenses.length ? `${undo.expenses.length} expense${undo.expenses.length === 1 ? '' : 's'}` : ''].filter(Boolean)
  return { sentence: `${from.name} is merged into ${into.name}${moved.length ? ` — ${moved.join(', ')} moved with it` : ''}`, undo }
}
/** The merge's Undo: everything it moved goes back, the details it filled are emptied again, the duplicate is active again. */
export async function undoMerge(u: MergeUndo): Promise<{ ok: true } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const viewer = await fetchViewer()
  if (!changesVendor(viewer.role)) return { error: VENDOR_RULE }
  const [from] = await db.select().from(vendors).where(eq(vendors.id, u.fromId)).limit(1)
  if (!from || from.mergedInto !== u.intoId) return { error: 'This merge can’t be undone any more' }
  await db.transaction(async (tx) => {
    if (u.pos.length) await tx.update(purchaseOrders).set({ vendorId: u.fromId }).where(and(inArray(purchaseOrders.id, u.pos), eq(purchaseOrders.vendorId, u.intoId)))
    if (u.bills.length) await tx.update(supplierBills).set({ vendorId: u.fromId }).where(and(inArray(supplierBills.id, u.bills), eq(supplierBills.vendorId, u.intoId)))
    if (u.expenses.length) await tx.update(expenses).set({ vendorId: u.fromId }).where(and(inArray(expenses.id, u.expenses), eq(expenses.vendorId, u.intoId)))
    if (u.payments.length) await tx.update(paymentsOut).set({ vendorId: u.fromId }).where(and(inArray(paymentsOut.id, u.payments), eq(paymentsOut.vendorId, u.intoId)))
    if (u.book.length) await tx.update(priceBookItems).set({ vendor: u.fromName }).where(inArray(priceBookItems.id, u.book))
    if (u.quoteLines.length) await tx.update(quoteItems).set({ vendor: u.fromName }).where(inArray(quoteItems.id, u.quoteLines))
    if (u.crew?.length) await tx.update(projectContractors).set({ vendorId: u.fromId }).where(and(inArray(projectContractors.id, u.crew), eq(projectContractors.vendorId, u.intoId)))   // (S45B)
    const put: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(u.filled)) {
      if (k === 'contractor') { try { Object.assign(put, { isContractor: false, ...(JSON.parse(v ?? '{}') as Record<string, unknown>) }) } catch { put.isContractor = false } continue }   // (S45B)
      put[k] = k === 'chargesGst' ? v === '1' : v
    }
    if (Object.keys(put).length) await tx.update(vendors).set(put).where(eq(vendors.id, u.intoId))
    await tx.update(vendors).set({ isActive: true, mergedInto: null, mergedAt: null, mergedBy: null, deactivatedAt: null }).where(eq(vendors.id, u.fromId))
  })
  touchCosts()
  return { ok: true }
}
