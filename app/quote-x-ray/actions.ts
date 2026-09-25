'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leads, quoteComparisons, quotes, type QuoteComparison } from '@/lib/db/schema'
import { actingMember } from '@/lib/contracts/automation'
import { canOpenLead, fetchViewer } from '@/lib/leads/visibility'
import { logLeadEvent } from '@/lib/leads/events'
import { canDeleteComparison } from '@/lib/xray/policy'
import { fetchBrand } from '@/lib/templates/queries'
import { compareQuotes, ENGINE, readResult, refAsYours, type XrayOverrides, type YourLine } from '@/lib/xray/compare'
import { readOtherQuote, type RefLine, type RefQuote } from '@/lib/xray/reference'
import { cleanLines } from '@/lib/xray/reading'
import { loadYourLines } from '@/lib/xray/queries'

/** (REG-639, Q-10) A side read from a spreadsheet in the browser: its lines (checked again here) and, for theirs, the studio's name. */
export type SheetSide = { lines: unknown; studio?: string | null }
export type RunInput = { leadId: string | null; quoteId: string | null; yourFile: string | null; otherFile: string; other?: SheetSide | null; yours?: SheetSide | null }
export type RunResult = { id: string } | { error: 'unreadable-other' | 'unreadable-yours' | 'nothing-to-compare' | 'same-quote' }

const OTHER_STUDIO = 'The other studio'
/** A sheet's side as a reference-shaped quote; null when its lines don't pass the server's check. */
function sheetQuote(side: SheetSide | null | undefined, studio: string): RefQuote | null {
  const lines = side ? cleanLines(side.lines) : null
  return lines ? { key: 'sheet', studio, lines } : null
}

/**
 * Quote X-Ray (REG-529) — run a comparison and keep it. The other studio's file is read by name (the three reference quotes);
 * anything else is "one we couldn't read". Your side is a studio quote's real lines, or — in Upload two quotes — a file too.
 */
export async function runComparison(input: RunInput): Promise<RunResult> {
  /* (REG-641, parity Q-19) the run's checks (E-101): file names capped; the lead live and the viewer's; the quote live, on that
     lead, with lines to compare; the same reference on both sides of an upload is one quote, not two */
  const otherFile = String(input.otherFile ?? '').trim().slice(0, 120), yourFile = input.yourFile ? String(input.yourFile).trim().slice(0, 120) : null
  const named = typeof input.other?.studio === 'string' ? input.other.studio.trim().slice(0, 80) : ''
  const other = input.other ? sheetQuote(input.other, named || OTHER_STUDIO) : readOtherQuote(otherFile)
  if (!other) return { error: 'unreadable-other' }
  const brand = await fetchBrand()
  const viewer = await fetchViewer()
  let yours, yourLabel: string, clientName: string | null = null, leadId = input.leadId, quoteId = input.quoteId, quoteTotalMinor: number | null = null
  if (quoteId) {
    const [q] = await db.select({ number: quotes.number, title: quotes.title, leadId: quotes.leadId, amountMinor: quotes.amountMinor }).from(quotes).where(and(eq(quotes.id, quoteId), isNull(quotes.deletedAt), isNull(quotes.archivedAt)))
    if (!q || (leadId && q.leadId !== leadId)) return { error: 'nothing-to-compare' }
    yours = await loadYourLines(quoteId)
    if (!yours.length) return { error: 'nothing-to-compare' }
    yourLabel = `${q.number} · ${q.title}`
    quoteTotalMinor = q.amountMinor
    leadId = leadId ?? q.leadId
  } else if (yourFile) {
    const mine = input.yours ? sheetQuote(input.yours, brand.details.name) : readOtherQuote(yourFile)
    if (!mine) return { error: 'unreadable-yours' }
    if (!input.yours && !input.other && mine.key === other.key) return { error: 'same-quote' }
    yours = refAsYours(mine)
    yourLabel = yourFile.replace(/\.[a-z0-9]+$/i, '')
    quoteId = null
  } else return { error: 'nothing-to-compare' }
  if (leadId) {
    const [l] = await db.select({ name: leads.name }).from(leads).where(and(eq(leads.id, leadId), isNull(leads.deletedAt)))
    if (!l || !(await canOpenLead(viewer, leadId))) return { error: 'nothing-to-compare' }
    clientName = l.name
  }
  const result = compareQuotes(yours, other, { yourLabel, yourStudio: brand.details.name, clientName, quoteTotalMinor })
  const id = randomUUID()
  /* (REG-638) the reading keeps both sides' lines and its engine — corrections, Run again and the stale check read them */
  await db.insert(quoteComparisons).values({ id, leadId, quoteId, yourLabel, otherStudio: other.studio, otherFile, resultJson: JSON.stringify(result), createdBy: await actingMember(), createdAt: new Date(),
    inputsJson: JSON.stringify({ yours, theirs: other.lines }), engine: ENGINE, yourFile: quoteId ? null : yourFile })
  revalidatePath('/quote-x-ray')
  if (leadId) revalidatePath(`/leads/${leadId}`, 'layout')
  return { id }
}

/**
 * Recent comparisons › delete: gone for good — a comparison is only ever a reading of two quotes (owner 2026-09-18).
 * (REG-641, parity Q-20) Its maker, an Owner or an Admin deletes it, and the lead's Activity keeps who removed which reading.
 */
export async function deleteComparison(id: string): Promise<{ ok: true } | { error: 'gone' | 'not-allowed' }> {
  const c = await openComparison(id)
  if (!c) return { error: 'gone' }
  const viewer = await fetchViewer(), actor = await actingMember()
  if (!canDeleteComparison({ id: actor, role: viewer.role }, c.createdBy)) return { error: 'not-allowed' }
  await db.transaction(async (tx) => {
    await tx.delete(quoteComparisons).where(eq(quoteComparisons.id, id))
    if (c.leadId) await logLeadEvent(tx, c.leadId, 'comparison_deleted', { title: `${c.yourLabel} · vs ${c.otherStudio}` }, actor)
  })
  revalidate(c)
  return { ok: true }
}

/** (REG-641, Q-19) A comparison this viewer may act on — its lead live and theirs to open, or no lead at all. */
async function openComparison(id: string): Promise<QuoteComparison | null> {
  const [c] = await db.select().from(quoteComparisons).where(eq(quoteComparisons.id, id))
  if (!c) return null
  if (c.leadId) {
    const [l] = await db.select({ id: leads.id }).from(leads).where(and(eq(leads.id, c.leadId), isNull(leads.deletedAt)))
    if (!l || !(await canOpenLead(await fetchViewer(), c.leadId))) return null
  }
  return c
}

// ── (REG-640, X-Ray parity round 3) the record as a working copy ─────────────────────────────────────────────────────

type Inputs = { yours: YourLine[]; theirs: RefLine[] }
const readInputs = (c: QuoteComparison): Inputs | null => { try { const x = c.inputsJson ? JSON.parse(c.inputsJson) as Inputs : null; return x && Array.isArray(x.yours) && Array.isArray(x.theirs) ? x : null } catch { return null } }
const readOverrides = (c: QuoteComparison): XrayOverrides => { try { return c.overridesJson ? JSON.parse(c.overridesJson) as XrayOverrides : {} } catch { return {} } }
const samePair = (a: [string, number], b: [string, number]) => a[0] === b[0] && a[1] === b[1]
const revalidate = (c: Pick<QuoteComparison, 'id' | 'leadId'>) => { revalidatePath(`/quote-x-ray/${c.id}`); revalidatePath('/quote-x-ray'); if (c.leadId) revalidatePath(`/leads/${c.leadId}`, 'layout') }

/** A reading read again over the same lines with `overrides` — the figures, points, key points and draft follow. */
async function reread(c: QuoteComparison, inputs: Inputs, overrides: XrayOverrides) {
  const was = readResult(c.resultJson)
  const other: RefQuote = { key: 'sheet', studio: c.otherStudio, lines: inputs.theirs }
  return compareQuotes(inputs.yours, other, { yourLabel: c.yourLabel, yourStudio: was.yourStudio, clientName: was.client ?? null, quoteTotalMinor: was.quoteTotalMinor ?? null }, overrides)
}
async function writeOverrides(c: QuoteComparison, inputs: Inputs, overrides: XrayOverrides) {
  const clean: XrayOverrides = { split: overrides.split ?? [], pair: overrides.pair ?? [] }
  const empty = !clean.split!.length && !clean.pair!.length
  const result = await reread(c, inputs, clean)
  await db.update(quoteComparisons).set({ resultJson: JSON.stringify(result), overridesJson: empty ? null : JSON.stringify(clean),
    correctedBy: empty ? null : await actingMember(), correctedAt: empty ? null : new Date() }).where(eq(quoteComparisons.id, c.id))
  revalidate(c)
}

/**
 * (Q-14) Correct a match on the record: `split` takes lines apart (Not the same item), `pair` puts two together (Same item
 * as…). Each is kept on the reading and the reading is read again. Returns the corrections as they were, for Undo.
 */
export async function correctComparison(id: string, change: { split?: [string, number][]; pair?: [string, number][] }): Promise<{ previous: XrayOverrides } | { error: 'gone' | 'old' }> {
  const c = await openComparison(id)
  if (!c) return { error: 'gone' }
  const inputs = readInputs(c)
  if (!inputs) return { error: 'old' }
  const previous = readOverrides(c)
  const split = (previous.split ?? []).filter((p) => !(change.pair ?? []).some((q) => samePair(p, q)))
  const pair = (previous.pair ?? []).filter((p) => !(change.split ?? []).some((q) => samePair(p, q)))
  for (const p of change.split ?? []) if (!split.some((q) => samePair(p, q))) split.push(p)
  for (const p of change.pair ?? []) if (!pair.some((q) => samePair(p, q))) pair.push(p)
  await writeOverrides(c, inputs, { split, pair })
  return { previous }
}

/** Undo of a correction: the reading's corrections set back exactly as they were. */
export async function setComparisonOverrides(id: string, overrides: XrayOverrides): Promise<void> {
  const c = await openComparison(id)
  const inputs = c ? readInputs(c) : null
  if (!c || !inputs) return
  await writeOverrides(c, inputs, overrides)
}

/**
 * (Q-15) Run again: a new reading of the quote as it is now against the same other quote — the old reading stays. Corrections
 * carry over where both lines still exist.
 */
export async function rerunComparison(id: string): Promise<{ id: string } | { error: 'gone' | 'nothing-to-compare' }> {
  const c = await openComparison(id)
  if (!c?.quoteId) return { error: 'gone' }
  const [q] = await db.select({ number: quotes.number, title: quotes.title, leadId: quotes.leadId, amountMinor: quotes.amountMinor, deletedAt: quotes.deletedAt, archivedAt: quotes.archivedAt }).from(quotes).where(eq(quotes.id, c.quoteId))
  if (!q || q.deletedAt || q.archivedAt) return { error: 'gone' }
  const yours = await loadYourLines(c.quoteId)
  if (!yours.length) return { error: 'nothing-to-compare' }
  const theirs = readInputs(c)?.theirs ?? readOtherQuote(c.otherFile)?.lines ?? null
  if (!theirs) return { error: 'gone' }
  const ids = new Set(yours.map((l) => l.id)), prev = readOverrides(c)
  const keep = (p: [string, number]) => ids.has(p[0]) && p[1] >= 0 && p[1] < theirs.length
  const overrides: XrayOverrides = { split: (prev.split ?? []).filter(keep), pair: (prev.pair ?? []).filter(keep) }
  const carried = overrides.split!.length + overrides.pair!.length > 0
  const [lead] = c.leadId ? await db.select({ name: leads.name }).from(leads).where(eq(leads.id, c.leadId)) : []
  const brand = await fetchBrand()
  const yourLabel = `${q.number} · ${q.title}`
  const result = compareQuotes(yours, { key: 'sheet', studio: c.otherStudio, lines: theirs }, { yourLabel, yourStudio: brand.details.name, clientName: lead?.name ?? null, quoteTotalMinor: q.amountMinor }, overrides)
  const newId = randomUUID()
  await db.insert(quoteComparisons).values({ id: newId, leadId: c.leadId, quoteId: c.quoteId, yourLabel, otherStudio: c.otherStudio, otherFile: c.otherFile, resultJson: JSON.stringify(result),
    createdBy: await actingMember(), createdAt: new Date(), inputsJson: JSON.stringify({ yours, theirs }), engine: ENGINE,
    overridesJson: carried ? JSON.stringify(overrides) : null, correctedBy: carried ? c.correctedBy : null, correctedAt: carried ? c.correctedAt : null })
  revalidate({ id: newId, leadId: c.leadId })
  return { id: newId }
}

/** (Q-16) What went to the client, and how — the last send is kept on the reading and the lead's Activity says so. */
export async function recordComparisonSent(id: string, text: string, via: 'whatsapp' | 'copy'): Promise<void> {
  const c = await openComparison(id)
  if (!c) return
  await db.update(quoteComparisons).set({ sentAt: new Date(), sentBy: await actingMember(), sentText: text.slice(0, 4000), sentVia: via === 'copy' ? 'copy' : 'whatsapp' }).where(eq(quoteComparisons.id, id))
  revalidate(c)
}
