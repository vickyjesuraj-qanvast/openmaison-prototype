'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leads, quoteComparisons, quotes } from '@/lib/db/schema'
import { SESSION_MEMBER_ID } from '@/lib/db/session'
import { fetchBrand } from '@/lib/templates/queries'
import { compareQuotes, refAsYours } from '@/lib/xray/compare'
import { readOtherQuote } from '@/lib/xray/reference'
import { loadYourLines } from '@/lib/xray/queries'

export type RunInput = { leadId: string | null; quoteId: string | null; yourFile: string | null; otherFile: string }
export type RunResult = { id: string } | { error: 'unreadable-other' | 'unreadable-yours' | 'nothing-to-compare' }

/**
 * Quote X-Ray (REG-529) — run a comparison and keep it. The other studio's file is read by name (the three reference quotes);
 * anything else is "one we couldn't read". Your side is a studio quote's real lines, or — in Upload two quotes — a file too.
 */
export async function runComparison(input: RunInput): Promise<RunResult> {
  const other = readOtherQuote(input.otherFile)
  if (!other) return { error: 'unreadable-other' }
  const brand = await fetchBrand()
  let yours, yourLabel: string, clientName: string | null = null, leadId = input.leadId, quoteId = input.quoteId
  if (quoteId) {
    const [q] = await db.select({ number: quotes.number, title: quotes.title, leadId: quotes.leadId }).from(quotes).where(eq(quotes.id, quoteId))
    if (!q) return { error: 'nothing-to-compare' }
    yours = await loadYourLines(quoteId)
    yourLabel = `${q.number} · ${q.title}`
    leadId = leadId ?? q.leadId
  } else if (input.yourFile) {
    const mine = readOtherQuote(input.yourFile)
    if (!mine) return { error: 'unreadable-yours' }
    yours = refAsYours(mine)
    yourLabel = input.yourFile.replace(/\.[a-z0-9]+$/i, '')
    quoteId = null
  } else return { error: 'nothing-to-compare' }
  if (leadId) { const [l] = await db.select({ name: leads.name }).from(leads).where(eq(leads.id, leadId)); clientName = l?.name ?? null }
  const result = compareQuotes(yours, other, { yourLabel, yourStudio: brand.details.name, clientName })
  const id = randomUUID()
  await db.insert(quoteComparisons).values({ id, leadId, quoteId, yourLabel, otherStudio: other.studio, otherFile: input.otherFile, resultJson: JSON.stringify(result), createdBy: SESSION_MEMBER_ID, createdAt: new Date() })
  revalidatePath('/quote-x-ray')
  if (leadId) revalidatePath(`/leads/${leadId}`, 'layout')
  return { id }
}

/** Recent comparisons › delete: gone for good — a comparison is only ever a reading of two quotes (owner 2026-09-18). */
export async function deleteComparison(id: string): Promise<void> {
  const [row] = await db.select({ leadId: quoteComparisons.leadId }).from(quoteComparisons).where(eq(quoteComparisons.id, id))
  await db.delete(quoteComparisons).where(eq(quoteComparisons.id, id))
  revalidatePath('/quote-x-ray')
  if (row?.leadId) revalidatePath(`/leads/${row.leadId}`, 'layout')
}
