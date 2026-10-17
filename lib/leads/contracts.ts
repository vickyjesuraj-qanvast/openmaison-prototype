import 'server-only'   // (REG-286) libSQL must never reach the browser bundle: every client import of this module is `import type`
import { and, asc, eq, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { contracts, leads, quotes, type Contract } from '@/lib/db/schema'
import { fetchBrand } from '@/lib/templates/queries'
import { fetchViewer } from '@/lib/leads/visibility'
import { fetchQuoteApproval, isApprover } from '@/lib/settings/queries'
import { countStandardDocs, namedQuotesOf } from '@/lib/contracts/queries'
import { defaultQuote } from '@/lib/contracts/snapshot'
import type { QuoteForSend } from '@/lib/contracts/readiness'
import type { ContractViewer } from '@/lib/contracts/policy'
import { fetchContractRules } from '@/lib/contracts/link-server'

/* Lead Details › Contracts (931-38609) — one loader for the tab. Archived / deleted contracts leave the list. */

export type LeadContractsData = {
  contracts: Contract[]
  /** (REG-591) Send together's defaults: the client's name and number, the studio's name for the draft. (UX audit C1) its stage — Mark as
      signed offers Move to Won until the lead is there. */
  lead: { name: string; phone: string; stage: string }
  studioName: string
  /** (REG-631, contracts parity Q-04) Who is looking — moving a studio-marked signature back is an Owner's or an Admin's. */
  viewer: ContractViewer
  /** (UX audit C2) The quotes the contracts name, by id, and Settings' quote approval — the tab's send checks. */
  quotes: Record<string, QuoteForSend>
  approvalRequired: boolean
  /** (S44Q — row 334) the member approves quotes: their send approves a Draft quote a contract names */
  canApprove: boolean
  /** (UX audit C6) The quote a new contract will name — the lead's Signed quote, else its latest (createContractDoc's rule) — for the empty state. */
  nextQuote: { number: string; amountMinor: number } | null
  /** (pending modules S03) the studio's Signing links window, in days — a send or a reminder says it */
  linkDays: number
  /** (pending modules S03) how many standard PDFs the library holds — Send together offers them with one of the lead's own */
  standardDocs: number
  now: number
}

export async function fetchLeadContracts(leadId: string): Promise<LeadContractsData> {
  const [rows, [lead], brand, viewer, approval, leadQuotes] = await Promise.all([
    db.select().from(contracts)
      .where(and(eq(contracts.leadId, leadId), isNull(contracts.archivedAt), isNull(contracts.deletedAt)))
      .orderBy(asc(contracts.createdAt)),
    db.select({ name: leads.name, phone: leads.phone, stage: leads.stage }).from(leads).where(eq(leads.id, leadId)),
    fetchBrand(),
    fetchViewer(),
    fetchQuoteApproval(),
    db.select({ number: quotes.number, amountMinor: quotes.amountMinor, status: quotes.status }).from(quotes)
      .where(and(eq(quotes.leadId, leadId), eq(quotes.kind, 'quote'), isNull(quotes.archivedAt), isNull(quotes.deletedAt))).orderBy(asc(quotes.createdAt)),   // (REG-1079) never a variation order
  ])
  const next = defaultQuote(leadQuotes)
  return {
    contracts: rows, lead: { name: lead?.name ?? '', phone: lead?.phone ?? '', stage: lead?.stage ?? '' }, studioName: brand.details.name, viewer: { id: viewer.id, role: viewer.role },
    quotes: await namedQuotesOf(rows), approvalRequired: approval === 'required', canApprove: await isApprover(viewer.id, viewer.role), nextQuote: next ? { number: next.number, amountMinor: next.amountMinor } : null, linkDays: (await fetchContractRules()).linkDays, standardDocs: await countStandardDocs(), now: Date.now(),
  }
}
