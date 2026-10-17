import 'server-only'
import { randomUUID } from 'node:crypto'
import { and, desc, eq, inArray, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  creditNotes, expenses, leads, members, paymentsOut, projectInvoices, projectPayments, projects, purchaseOrders, settings, supplierBills, vendors, xeroLinks, xeroSyncLog,
} from '@/lib/db/schema'
import { titleCaseName } from '@/lib/format'
import { money2 } from '@/lib/quotes/math'
import { fetchBrand } from '@/lib/templates/queries'
import type { FeedRow, NotificationRules } from '@/lib/notifications/model'
import { channelsOf } from '@/lib/notifications/queries'
import { methodLabel } from './model'
import { raiseDueRepeats } from './repeats-server'
import { serviceSlot } from '@/lib/services/slots'   // (pending modules S34)
import {
  DEFAULT_XERO, XERO_KEY, accountKeysFor, expenseAccountKey, hashOf, parseXero, pushOutcome,
  type AccountKey, type XeroItem, type XeroKind, type XeroLinkRecord, type XeroSettings, type XeroStatus,
} from './xero'

/*
 * (gaps build F2 — F2-Q13) Xero on the server, simulated: the settings, what is due to push (every record the books hold that Xero should have —
 * approved money only), the push itself (a link per record, a line per push in the log) and the bell's derived row. No HTTP: the developers put
 * Xero's API where `push` writes a link.
 * (pending modules S34) …through ONE slot: `setAccountingProvider` (lib/services/slots.ts 'accounting'). Its `push(item, link, settings,
 * keys)` answers what Xero did with one record — created · updated · failed (its words) · skip — and the id Xero gave it; the link, the log,
 * the retries, the bell and "approved money only" stay here. The stand-in is the simulation (`pushOutcome`: it fails only where a mapping is
 * missing, and names each record by `remoteHint`). 1.0's env: XERO_CLIENT_ID · XERO_CLIENT_SECRET · XERO_REDIRECT_URI (the OAuth that
 * `connectXero` simulates); its five-minute `accounting-sync` cron = `/api/cron/accounting-sync` (lib/services/sweep.ts), which pushes only
 * once a real provider is plugged in — the prototype pushes on Sync now and after a money step (Push automatically).
 */
export type AccountingAnswer = { outcome: 'created' | 'updated' | 'failed' | 'skip'; message: string | null; /** the record's id in Xero (null keeps the one it had) */ remoteId?: string | null }
export type AccountingProvider = {
  name: string
  push(item: XeroItem, link: XeroLinkRecord | undefined, settings: XeroSettings, keys: readonly AccountKey[]): Promise<AccountingAnswer>
}
const SIMULATED: AccountingProvider = { name: 'simulated', push: async (item, link, s, keys) => pushOutcome(item, link, s, keys) }
const accounting = serviceSlot<AccountingProvider>('accounting', SIMULATED)
/** PRODUCTION: plug Xero's API in once, at start-up (lib/services/install.ts). */
export function setAccountingProvider(p: AccountingProvider): void { accounting.set(p) }
/** Whether the simulation still answers — Company › Integrations' Xero card says "Simulated on this prototype" while it does. */
export const accountingIsStandIn = (): boolean => accounting.standIn()

/** (pending modules S06) The mapping's account rows for the studio's own expense categories. */
export async function fetchAccountKeys(): Promise<AccountKey[]> {
  const { fetchExpenseCategories } = await import('./queries')
  return accountKeysFor((await fetchExpenseCategories()).list)
}
export async function fetchXeroSettings(): Promise<XeroSettings> {
  const [row] = await db.select().from(settings).where(eq(settings.key, XERO_KEY)).limit(1)
  if (!row) return DEFAULT_XERO
  try { return parseXero(JSON.parse(row.value)) } catch { return DEFAULT_XERO }
}
/** (one-home N-09) Company › Integrations' Xero card: the connection's state and who made it — read by everyone (Owners and Admins change it). */
export async function fetchXeroStatus(): Promise<XeroStatus> {
  const s = await fetchXeroSettings()
  const by = s.connectedBy ? (await db.select({ name: members.name }).from(members).where(eq(members.id, s.connectedBy)).limit(1))[0]?.name ?? null : null
  return { connected: s.connected, connectedAt: s.connectedAt, by, lastSyncAt: s.lastSyncAt }
}
export async function saveXeroSettings(next: XeroSettings): Promise<void> {
  const value = JSON.stringify(next)
  const updatedAt = new Date()
  await db.insert(settings).values({ key: XERO_KEY, value, updatedAt }).onConflictDoUpdate({ target: settings.key, set: { value, updatedAt } })
}

/** The issuing entities a connection maps (the studio's own first), each with a Xero organisation name proposed. */
export async function entitiesForXero(): Promise<{ entity: string; proposed: string }[]> {
  const brand = await fetchBrand()
  const list = brand.details.entities.filter((e) => !e.retired)
  return (list.length ? list : [{ name: brand.details.name || 'The studio' }]).map((e) => ({ entity: e.name, proposed: `${e.name} (Xero)` }))
}

/** Every record Xero should hold — approved money only (1.0's rule): sent invoices, issued credit notes, confirmed payments, bills, approved
    expenses, payments out; their contacts. A void or reversed one that was pushed goes again (Xero voids it). */
export async function xeroItems(s: XeroSettings, keys?: readonly AccountKey[]): Promise<XeroItem[]> {
  await raiseDueRepeats()   // (pending modules S06) a repeating expense logged today is Xero's too
  const accountKeys = keys ?? await fetchAccountKeys()
  const orgOf = (entity: string | null | undefined) => s.organisations.find((o) => o.entity === (entity ?? ''))?.name ?? s.organisations[0]?.name ?? 'Xero'
  const firstOrg = s.organisations[0]?.name ?? 'Xero'
  const [invs, cns, pays, bills, exps, outs, vs, pjs] = await Promise.all([
    db.select().from(projectInvoices).where(inArray(projectInvoices.status, ['sent', 'void'])),
    db.select().from(creditNotes),
    db.select().from(projectPayments).where(inArray(projectPayments.status, ['confirmed', 'reversed'])),
    db.select().from(supplierBills).where(isNull(supplierBills.deletedAt)),
    db.select().from(expenses).where(and(eq(expenses.status, 'approved'), isNull(expenses.deletedAt))),
    db.select().from(paymentsOut),
    db.select().from(vendors),
    db.select({ id: projects.id, leadId: projects.leadId, name: projects.name, client: leads.name, phone: leads.phone, email: leads.email }).from(projects).innerJoin(leads, eq(leads.id, projects.leadId)).where(isNull(projects.deletedAt)),
  ])
  const links = await db.select({ kind: xeroLinks.recordKind, id: xeroLinks.recordId }).from(xeroLinks)
  const pushed = (kind: XeroKind, id: string) => links.some((l) => l.kind === kind && l.id === id)
  const project = (id: string | null) => pjs.find((p) => p.id === id) ?? null
  const items: XeroItem[] = []
  const salesTax = (gst: number) => (gst > 0 ? 'sales_gst' : 'sales_none')
  const buyTax = (gst: number) => (gst > 0 ? 'purchase_gst' : 'purchase_none')
  /* invoices (a void one only once it was pushed) and their clients */
  const clientIds = new Set<string>()
  for (const i of invs) {
    if (!i.number && !i.externalRef) continue
    if (i.status === 'void' && !pushed('invoice', i.id)) continue
    const p = project(i.projectId)
    if (!p) continue
    clientIds.add(p.id)
    const ref = i.number ?? i.externalRef ?? ''
    items.push({ kind: 'invoice', id: i.id, label: `${ref} · ${titleCaseName(p.client)}${i.status === 'void' ? ' (void)' : ''}`, amountMinor: i.amountMinor, organisation: orgOf(i.issuingEntity),
      needs: { accounts: [i.kind === 'one_off' ? 'one_off' : 'sales'], taxes: [salesTax(i.gstMinor)] }, hash: hashOf([ref, i.status, i.amountMinor, i.gstMinor, i.dueAt?.getTime()]), remoteHint: ref })
  }
  for (const c of cns) {
    if (c.status === 'void' && !pushed('credit_note', c.id)) continue
    const inv = invs.find((i) => i.id === c.invoiceId)
    const p = project(c.projectId)
    if (!p || !inv) continue
    clientIds.add(p.id)
    /* (pending modules S07 — D-14) an overpayment is money received and held for the client (Xero's own Overpayment): the bank, no sales, no tax */
    const over = c.kind === 'overpayment'
    items.push({ kind: 'credit_note', id: c.id, label: `${c.number} · ${titleCaseName(p.client)}${over ? ' (overpayment)' : ''}${c.status === 'void' ? ' (void)' : ''}`, amountMinor: c.amountMinor, organisation: orgOf(inv.issuingEntity),
      needs: over ? { accounts: ['bank'], taxes: [] } : { accounts: [inv.kind === 'one_off' ? 'one_off' : 'sales'], taxes: [salesTax(c.gstMinor)] }, hash: hashOf(over ? [c.number, c.status, c.amountMinor, c.gstMinor, 'overpayment'] : [c.number, c.status, c.amountMinor, c.gstMinor]), remoteHint: c.number })   // a credit note pushed before keeps its fingerprint
  }
  for (const x of pays) {
    if (x.status === 'reversed' && !pushed('payment', x.id)) continue
    const inv = invs.find((i) => i.id === x.invoiceId)
    const p = project(x.projectId)
    if (!p || !inv) continue
    /* (pending modules S07) a payment from the client's credit moves no money: Xero allocates the overpayment to the invoice — no bank line */
    const allocated = x.method === 'credit'
    items.push({ kind: 'payment', id: x.id, label: `${x.receiptNumber ?? 'Payment'} · ${titleCaseName(p.client)} · ${inv.number ?? ''}${allocated ? ` (from credit ${x.reference ?? ''})`.replace(' )', ')') : ''}${x.status === 'reversed' ? ' (reversed)' : ''}`, amountMinor: x.amountMinor, organisation: orgOf(inv.issuingEntity),
      needs: { accounts: allocated ? [] : ['bank'], taxes: [] }, hash: hashOf([x.amountMinor, x.paidOn.getTime(), x.status, methodLabel(x.method)]), remoteHint: x.receiptNumber ?? `PMT-${x.id.slice(0, 6)}` })
  }
  /* costs and their vendors */
  const vendorIds = new Set<string>()
  for (const b of bills) {
    /* (S44R — UAT row 361, call C8) approved money only: a bill that waits for an Owner's or an Admin's OK goes once approved (a payment made on it
       before the rule had it past the gate) */
    if (b.approvalWhy && !b.approvedAt && !outs.some((o) => o.billId === b.id && !o.reversedAt)) continue
    vendorIds.add(b.vendorId)
    const v = vs.find((x) => x.id === b.vendorId)
    items.push({ kind: 'bill', id: b.id, label: `Bill ${b.reference} · ${v?.name ?? 'A vendor'}`, amountMinor: b.totalMinor, organisation: firstOrg,
      needs: { accounts: ['pos'], taxes: [buyTax(b.gstMinor)] }, hash: hashOf([b.reference, b.totalMinor, b.gstMinor, b.dueOn?.getTime()]), remoteHint: b.reference })
  }
  for (const e of exps) {
    if (e.vendorId) vendorIds.add(e.vendorId)
    items.push({ kind: 'expense', id: e.id, label: `${e.description} · ${e.category}`, amountMinor: e.amountMinor, organisation: firstOrg,
      needs: { accounts: [expenseAccountKey(e.category, accountKeys)], taxes: [buyTax(e.gstMinor)] }, hash: hashOf([e.description, e.amountMinor, e.gstMinor, e.category, e.spentOn.getTime()]), remoteHint: `EXP-${e.id.slice(0, 6).toUpperCase()}` })
  }
  const poNumbers = outs.some((o) => o.poId) ? await db.select({ id: purchaseOrders.id, number: purchaseOrders.number, vendorId: purchaseOrders.vendorId }).from(purchaseOrders) : []
  for (const o of outs) {
    if (o.reversedAt && !pushed('payout', o.id)) continue
    if (o.vendorId) vendorIds.add(o.vendorId)
    const what = o.kind === 'claim' ? 'Claim paid back' : o.billId ? `Bill ${bills.find((b) => b.id === o.billId)?.reference ?? ''}` : poNumbers.find((p) => p.id === o.poId)?.number ?? 'Payment out'
    const to = o.kind === 'claim' ? 'a member' : vs.find((x) => x.id === o.vendorId)?.name ?? 'A vendor'
    items.push({ kind: 'payout', id: o.id, label: `${what} · ${to}${o.reversedAt ? ' (reversed)' : ''}`, amountMinor: o.amountMinor, organisation: firstOrg,
      needs: { accounts: ['bank'], taxes: [] }, hash: hashOf([o.amountMinor, o.paidOn.getTime(), o.reversedAt?.getTime()]), remoteHint: `PAY-${o.id.slice(0, 6).toUpperCase()}` })
  }
  for (const v of vs) if (vendorIds.has(v.id) || pushed('vendor', v.id)) items.unshift({ kind: 'vendor', id: v.id, label: v.name, amountMinor: null, organisation: firstOrg, needs: { accounts: [], taxes: [] }, hash: hashOf([v.name, v.phone, v.email, v.uen]), remoteHint: v.name })
  for (const pid of clientIds) { const p = project(pid)!; items.unshift({ kind: 'client', id: p.leadId, label: titleCaseName(p.client), amountMinor: null, organisation: firstOrg, needs: { accounts: [], taxes: [] }, hash: hashOf([p.client, p.phone, p.email]), remoteHint: titleCaseName(p.client) }) }
  return items
}

const linkRecord = (l: typeof xeroLinks.$inferSelect): XeroLinkRecord => ({ recordKind: l.recordKind, recordId: l.recordId, status: l.status === 'failed' ? 'failed' : 'synced', hash: l.hash, remoteId: l.remoteId, error: l.error, attempts: l.attempts, pushedAt: l.pushedAt?.getTime() ?? null })

/** Push what is due (or only `only`): each item created, updated or failed — a link per record, a log line per push. Simulated. */
export async function pushToXero(by: string | null, only?: { kind: XeroKind; id: string }): Promise<{ created: number; updated: number; failed: number; runId: string }> {
  const s = await fetchXeroSettings()
  const runId = randomUUID()
  const out = { created: 0, updated: 0, failed: 0, runId }
  if (!s.connected) return out
  const keys = await fetchAccountKeys()
  const items = (await xeroItems(s, keys)).filter((i) => !only || (i.kind === only.kind && i.id === only.id))
  const links = (await db.select().from(xeroLinks)).map(linkRecord)
  const now = new Date()
  for (const item of items) {
    const link = links.find((l) => l.recordKind === item.kind && l.recordId === item.id)
    /* (pending modules S34) the provider's answer — a throw is a failure with its words, never the whole run's */
    const answer = await accounting.use().push(item, link, s, keys).catch((e: unknown): AccountingAnswer => ({ outcome: 'failed', message: (e instanceof Error ? e.message : String(e)).slice(0, 300) || 'Xero didn’t take it' }))
    const { outcome, message } = answer
    if (outcome === 'skip') continue
    const remoteId = outcome === 'failed' ? link?.remoteId ?? null : answer.remoteId ?? link?.remoteId ?? item.remoteHint
    const row = { status: outcome === 'failed' ? 'failed' : 'synced', error: outcome === 'failed' ? message : null, hash: outcome === 'failed' ? link?.hash ?? null : item.hash, remoteId, organisation: item.organisation,
      attempts: (link?.attempts ?? 0) + 1, pushedAt: outcome === 'failed' ? (link?.pushedAt ? new Date(link.pushedAt) : null) : now, updatedAt: now }
    await db.insert(xeroLinks).values({ id: randomUUID(), recordKind: item.kind, recordId: item.id, ...row })
      .onConflictDoUpdate({ target: [xeroLinks.recordKind, xeroLinks.recordId], set: row })
    await db.insert(xeroSyncLog).values({ id: randomUUID(), runId, recordKind: item.kind, recordId: item.id, label: item.label, amountMinor: item.amountMinor, outcome, message, by, at: now })
    out[outcome] += 1
  }
  await saveXeroSettings({ ...s, lastSyncAt: now.getTime() })
  return out
}

export type XeroLogRow = { id: string; runId: string; kind: XeroKind; recordId: string; label: string; amountMinor: number | null; outcome: 'created' | 'updated' | 'failed'; message: string | null; by: string | null; at: number }
export type XeroData = {
  settings: XeroSettings
  entities: { entity: string; proposed: string }[]
  /** What would go on the next sync (new, changed, failed). */
  due: (XeroItem & { failed: string | null })[]
  /** Records Xero holds, by kind. */
  synced: Record<XeroKind, number>
  failed: (XeroLinkRecord & { label: string })[]
  log: XeroLogRow[]
  /** (pending modules S06) the mapping's account rows — one per expense category the studio keeps */ accountKeys: AccountKey[]
}
export async function fetchXero(): Promise<XeroData> {
  const s = await fetchXeroSettings()
  const [entities, logRows, linkRows] = await Promise.all([entitiesForXero(), db.select().from(xeroSyncLog).orderBy(desc(xeroSyncLog.at)).limit(200), db.select().from(xeroLinks)])
  const links = linkRows.map(linkRecord)
  const accountKeys = await fetchAccountKeys()
  const items = s.connected ? await xeroItems(s, accountKeys) : []
  const due = items.filter((i) => { const l = links.find((x) => x.recordKind === i.kind && x.recordId === i.id); return !l || l.status === 'failed' || l.hash !== i.hash })
    .map((i) => ({ ...i, failed: links.find((x) => x.recordKind === i.kind && x.recordId === i.id && x.status === 'failed')?.error ?? null }))
  const synced = { client: 0, vendor: 0, invoice: 0, credit_note: 0, payment: 0, bill: 0, expense: 0, payout: 0 } as Record<XeroKind, number>
  for (const l of links) if (l.status === 'synced' && l.recordKind in synced) synced[l.recordKind as XeroKind] += 1
  return {
    settings: s, entities, due, synced, accountKeys,
    failed: links.filter((l) => l.status === 'failed').map((l) => ({ ...l, label: items.find((i) => i.kind === l.recordKind && i.id === l.recordId)?.label ?? l.recordId })),
    log: logRows.map((r) => ({ id: r.id, runId: r.runId, kind: r.recordKind as XeroKind, recordId: r.recordId, label: r.label, amountMinor: r.amountMinor, outcome: r.outcome === 'failed' ? 'failed' : r.outcome === 'updated' ? 'updated' : 'created', message: r.message, by: r.by, at: r.at.getTime() })),
  }
}

/** (F2-Q15) The bell: one row while any push to Xero has failed — for Owners and Admins (the caller asks); gone once they go through. */
export async function derivedXeroRows(rules: NotificationRules): Promise<FeedRow[]> {
  const s = await fetchXeroSettings()
  if (!s.connected) return []
  const failed = await db.select().from(xeroLinks).where(eq(xeroLinks.status, 'failed'))
  if (!failed.length) return []
  const at = Math.max(...failed.map((f) => f.updatedAt.getTime()))
  return [{ id: `xero-failed-${failed.length}-${at}`, kind: 'xero_failed', title: failed.length === 1 ? 'A push to Xero failed' : `${failed.length} pushes to Xero failed`,
    body: failed[0]!.error ?? 'It waits for Retry', href: '/company/finance/accounting', at, readAt: null, channels: channelsOf(rules, 'xero_failed'), derived: true }]
}
export const xeroAmount = (m: number | null) => (m === null ? '' : money2(m))
/** (F2-Q13) *Push automatically*: after a money step, a sync runs when the studio is connected with the switch on (simulated — no queue). */
export async function autoPushXero(by: string | null): Promise<void> {
  const s = await fetchXeroSettings()
  if (!s.connected || !s.auto) return
  try { await pushToXero(by) } catch { /* a failed push is the sync log's to tell, never the money step's */ }
}
