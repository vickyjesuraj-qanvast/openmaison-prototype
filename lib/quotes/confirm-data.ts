import 'server-only'
import { and, asc, eq, isNull, ne } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leadFiles, members, quoteFiles, quoteItems, quotes } from '@/lib/db/schema'
import { fetchBrand } from '@/lib/templates/queries'
import { lineTotalMinor } from './math'
import { projects } from '@/lib/db/schema'
import { moneySummaryOf } from '@/lib/projects/money-queries'
import { isApprovedVariation } from '@/lib/projects/money'
import { fetchQuoteRules } from '@/lib/settings/queries'

/** A quote status the confirmation link answers to: the studio has sent it (or approved it for the client). */
export const CONFIRMABLE = ['Approved', 'Sent to Client'] as const
export const isConfirmable = (status: string) => (CONFIRMABLE as readonly string[]).includes(status)

export type ConfirmExtras = {
  /** (REG-626, parity §8.2 · E-110) The link confirms only a quote the studio has sent; a draft says it is still being prepared. */
  open: boolean
  /** (REG-626, parity Q-32) The optional works the client may pick: each line's price with its GST, and what they answered. */
  optional: { id: string; name: string; description: string | null; minor: number; choice: 'want' | 'skip' | null }[]
  /** (S44Q — row 357) Settings › Quotes & pricing: the client may tick them (on, as always) — off, the page lists them read-only and the client
      asks the designer to add one */
  picks: boolean
  /** (REG-626, parity §8.2 · E-91) The files the studio shares with the quote while its Files section's "Show in client view" is on. */
  files: { id: string; name: string; kind: string; thumb: string | null }[]
  /** (UX audit Q6) Who "Ask for a change" writes to on WhatsApp: whoever prepared the quote, on their own number — else the studio's. */
  designer: { name: string; phone: string }
  /** (Projects round 5, F-07) A variation order: the page names it one and says what it does to the contract (before → after). */
  variation?: { before: number; after: number
    /** (gaps build D, item 2 — M-07) the client declined it on this page: when, their reason, the name they typed */
    declined?: { at: number; note: string | null; by: string | null } | null } | null
}

/** (REG-626 · S44Q, triage §12.2) The optional lines the confirmation page lists — the ones the client can answer: optional, not hidden from the
    client, not out of the quote. `confirmQuoteOnline` stores an answer for these only (and only while the page offered them for picking). */
export async function offeredOptionalLines(quoteId: string) {
  const rows = await db.select().from(quoteItems).where(and(eq(quoteItems.quoteId, quoteId), eq(quoteItems.optional, true), eq(quoteItems.kind, 'item'), ne(quoteItems.visibility, 'hidden'))).orderBy(asc(quoteItems.position))
  return rows.filter((i) => i.status !== 'Declined')
}

export async function fetchConfirmExtras(quoteId: string): Promise<ConfirmExtras | null> {
  const [q] = await db.select().from(quotes).where(and(eq(quotes.id, quoteId), isNull(quotes.deletedAt)))
  if (!q) return null
  const [items, files, team, brand, rules] = await Promise.all([
    offeredOptionalLines(quoteId),
    q.filesVisible ? db.select({ id: leadFiles.id, name: leadFiles.name, kind: leadFiles.kind, thumb: leadFiles.thumb }).from(quoteFiles).innerJoin(leadFiles, eq(leadFiles.id, quoteFiles.fileId))
      .where(and(eq(quoteFiles.quoteId, quoteId), isNull(leadFiles.deletedAt), ne(leadFiles.kind, 'folder'))) : Promise.resolve([]),
    db.select({ id: members.id, name: members.name, phone: members.phone }).from(members),
    fetchBrand(),
    fetchQuoteRules(),
  ])
  const prepared = team.find((m) => m.id === (q.preparedBy ?? q.createdBy)) ?? null
  /* (Projects round 5) the contract it changes — read from the one set of numbers (lib/projects/money.ts) */
  let variation: ConfirmExtras['variation'] = null
  if (q.kind === 'variation' && q.projectId) {
    const [p] = await db.select().from(projects).where(eq(projects.id, q.projectId)).limit(1)
    if (p) { const m = await moneySummaryOf(p); const before = m.contractMinor - (isApprovedVariation(q.status) ? q.amountMinor : 0); variation = { before, after: Math.max(0, before + q.amountMinor), declined: q.declinedAt ? { at: q.declinedAt.getTime(), note: q.declinedNote, by: q.declinedBy } : null } }
  }
  return {
    variation,
    open: isConfirmable(q.status),
    picks: rules.clientPicksOptional,
    optional: items.map((i) => ({ id: i.id, name: i.name, description: i.description, minor: Math.round(lineTotalMinor(i) * (1 + (q.gstEnabled && i.printAs !== 'behalf' ? i.gstPct / 100 : 0))), choice: i.clientChoice === 'want' || i.clientChoice === 'skip' ? i.clientChoice : null })),
    files,
    designer: { name: prepared?.name ?? brand.details.name, phone: (prepared?.phone ?? '').trim() || brand.details.phone },
  }
}
