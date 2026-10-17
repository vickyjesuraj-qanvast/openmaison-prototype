'use server'

import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { settings } from '@/lib/db/schema'
import { fetchViewer } from '@/lib/leads/visibility'
import { runsStudio } from '@/lib/leads/assign-policy'
import { INVOICE_NUMBERING_KEY, parseInvoiceNumbering } from '@/lib/projects/invoices-model'
import { INVOICE_NUMBERING_ENTITIES_KEY, type EntityNumbering } from '@/lib/projects/invoices-paper'
import { fetchInvoiceNumbering } from '@/lib/projects/money-queries'
import { RECEIPT_NUMBERING_KEY, parseReceiptNumbering } from '@/lib/projects/payments-model'
import { fetchReceiptNumbering } from '@/lib/projects/payments'
import { CREDIT_RULES_KEY, DEFAULT_CREDIT_RULES, parseCreditRules, type CreditRules } from '@/lib/finance/credit-model'
import { COST_RULES_KEY, parseCostRules } from '@/lib/finance/rules'
import { fetchCostRulesStored as fetchCostRules } from '@/lib/finance/queries'   // (pending modules S19) the stored rules — a Free plan's forced-off approvals are never written back
import { touchCosts } from '@/lib/finance/server'
import { fetchBrand } from '@/lib/templates/queries'
import { DOCUMENT_NUMBERS_RULE, TICKET_DOC, cleanPrefix, prefixClash, type DocumentNumbering, type DocumentNumbersInput, type TicketNumbersData } from '@/lib/settings/document-numbers'
import { TICKET_NUMBERING_KEY, parseTicketNumbering } from '@/lib/projects/tickets-model'   // (parity map, UC-058) the Tickets row
import { fetchTicketNumbering, ticketNumbers } from '@/lib/projects/tickets'
import type { ProjectNumbering } from '@/lib/projects/model'

type Refusal = { error: string }

const save = async (key: string, value: unknown, at: Date) => {
  const v = JSON.stringify(value)
  await db.insert(settings).values({ key, value: v, updatedAt: at }).onConflictDoUpdate({ target: settings.key, set: { value: v, updatedAt: at } })
}
async function creditRules(): Promise<CreditRules> {
  const [row] = await db.select().from(settings).where(eq(settings.key, CREDIT_RULES_KEY)).limit(1)
  if (!row) return DEFAULT_CREDIT_RULES
  try { return parseCreditRules(JSON.parse(row.value)) } catch { return DEFAULT_CREDIT_RULES }
}

/**
 * (simplify S-15 — P3 §6.7 · F1 §6.8) Settings › Finance › Document numbers' one Save: the four patterns, written under the settings keys
 * today's four numbering blocks wrote — `invoice_numbering` (as `setInvoiceRules`), `receipt_numbering` (as `setPaymentRules`),
 * `credit_note_rules.numbering` (as `setCreditRules`), `cost_rules.numbering` (as `setCostRules`) — each read through its own parser, and,
 * when the card shows them (two entities or more), each issuing entity's own invoice prefix (`invoice_numbering_entities`, as
 * `setEntityNumbering`). Invoices and receipts keep fix-D's D-31: a new prefix starts its own count unless a next number was typed with it.
 * Everything is checked before anything is written; a refusal is `{ error: <the rule> }`. Owners and Admins only.
 */
export async function setDocumentNumbers(input: DocumentNumbersInput): Promise<{ numbering: DocumentNumbering; entities: Record<string, string> | null; ticket?: ProjectNumbering } | Refusal> {
  const viewer = await fetchViewer()
  if (!runsStudio(viewer.role)) return { error: DOCUMENT_NUMBERS_RULE }
  if (!input || typeof input !== 'object') return { error: 'Couldn’t read the numbers — please try again' }
  const [inv0, rct0, cost0, cn0] = await Promise.all([fetchInvoiceNumbering(), fetchReceiptNumbering(), fetchCostRules(), creditRules()])
  /* each pattern through the parser its own block used, so a number reads the same whoever saved it */
  let invoice = parseInvoiceNumbering(input.invoice)
  if (invoice.prefix !== inv0.prefix && invoice.next === inv0.next) invoice = { ...invoice, next: 0 }   // (fix-D, D-31)
  let receipt = parseReceiptNumbering(input.receipt)
  if (receipt.prefix !== rct0.prefix && receipt.next === rct0.next) receipt = { ...receipt, next: 0 }   // (fix-D, D-31)
  const credit = parseCreditRules({ ...cn0, numbering: input.credit }).numbering
  const costs = parseCostRules({ ...cost0, numbering: input.po })
  const numbering: DocumentNumbering = { invoice, receipt, credit, po: costs.numbering }
  /* an entity's own prefix: blank takes the studio's; kept as the studio's pattern under its own prefix (setEntityNumbering's shape) */
  const ownPrefixes = input.entities && typeof input.entities === 'object' && !Array.isArray(input.entities)
    ? Object.entries(input.entities).filter(([id]) => typeof id === 'string' && id && id.length <= 80).slice(0, 20).map(([id, p]) => [id, cleanPrefix(typeof p === 'string' ? p : '')] as const)
    : null
  /* the card sends the entities by id; the refusal names them by name (Company › Profile's) */
  const names = ownPrefixes?.some(([, p]) => p) ? new Map((await fetchBrand()).details.entities.map((e) => [e.id, e.name])) : new Map<string, string>()
  /* (parity map, UC-058) the Tickets row — saved when the card sends it, checked against the others' prefixes */
  const ticket = input.ticket ? parseTicketNumbering(input.ticket) : null
  const clash = prefixClash(numbering, (ownPrefixes ?? []).map(([id, prefix]) => ({ name: names.get(id) ?? 'An issuing entity', prefix })), ticket ? [{ label: TICKET_DOC.label, prefix: ticket.prefix }] : [])
  if (clash) return { error: clash }
  const at = new Date()
  await save(INVOICE_NUMBERING_KEY, invoice, at)
  await save(RECEIPT_NUMBERING_KEY, receipt, at)
  await save(CREDIT_RULES_KEY, { ...cn0, numbering: credit }, at)
  await save(COST_RULES_KEY, costs, at)
  let entities: Record<string, string> | null = null
  if (ownPrefixes) {
    const own: EntityNumbering = Object.fromEntries(ownPrefixes.filter(([, p]) => p).map(([id, p]) => [id, { ...invoice, prefix: p, next: 0 }]))
    await save(INVOICE_NUMBERING_ENTITIES_KEY, own, at)
    entities = Object.fromEntries(ownPrefixes)
  }
  if (ticket) await save(TICKET_NUMBERING_KEY, ticket, at)
  revalidatePath('/settings'); revalidatePath('/projects', 'layout')
  touchCosts()   // Finance's pages read the PO numbers
  return { numbering, entities, ...(ticket ? { ticket } : {}) }
}

/** (parity map, UC-058) The Tickets row's pattern and every ticket number given — the card reads it when the page did not bring it. */
export async function readTicketNumbering(): Promise<TicketNumbersData> {
  const [numbering, numbers] = await Promise.all([fetchTicketNumbering(), ticketNumbers()])
  return { numbering, numbers }
}
