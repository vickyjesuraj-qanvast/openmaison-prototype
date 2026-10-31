'use server'

import { requirePlan } from '@/lib/credits/plan-gate'
import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { and, desc, eq, inArray, isNotNull, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leadEvents, leads, quoteComparisons, quotes, type QuoteComparison } from '@/lib/db/schema'
import { actingMember } from '@/lib/contracts/automation'
import { canOpenLead, fetchViewer } from '@/lib/leads/visibility'
import { logLeadEvent, type LeadEventDetail } from '@/lib/leads/events'
import { canDeleteComparison, COMPARISON_TRASH_RULE } from '@/lib/xray/policy'
import { fetchBrand } from '@/lib/templates/queries'
import { compareQuotes, ENGINE, readResult, refAsYours, type XrayOverrides, type YourLine } from '@/lib/xray/compare'
import { readOtherQuote, referenceQuote, type RefLine, type RefQuote } from '@/lib/xray/reference'
import { cleanLines } from '@/lib/xray/reading'
import { fetchDeletedComparisons, loadYourLines, type DeletedComparison } from '@/lib/xray/queries'
import { workspaceRefusal } from '@/lib/settings/desk'   // (S45C) the workspace's role rule
import type { Refusal } from '@/lib/company/template-rules'

/** (REG-639, Q-10) A side read in the browser — a spreadsheet, or (pending modules S21) a PDF's own words: its lines (checked again here)
    and, for theirs, the studio's name. */
export type SheetSide = { lines: unknown; studio?: string | null }
export type RunInput = { leadId: string | null; quoteId: string | null; yourFile: string | null; otherFile: string; other?: SheetSide | null; yours?: SheetSide | null
  /** (S42 E-05) a reference quote the browser recognised by the file's own words — its key; a file's name is never read as one */ otherRef?: string | null; yourRef?: string | null }
export type RunResult = { id: string } | { error: 'unreadable-other' | 'unreadable-yours' | 'nothing-to-compare' | 'same-quote' } | PlanLock | Refusal   // (S45C) Marketing's refusal, in the gate's words
/** (pending modules S19 — 1.0's plan gating: Quote X-Ray is Pro, every route gated) the refusal a Free studio's X-Ray press answers */
type PlanLock = { error: string; locked: true }
const xrayLock = async (): Promise<PlanLock | null> => { const l = await requirePlan('quote_xray'); return l ? { ...l, locked: true } : null }

const OTHER_STUDIO = 'The other studio'
/** A sheet's side as a reference-shaped quote; null when its lines don't pass the server's check. */
function sheetQuote(side: SheetSide | null | undefined, studio: string): RefQuote | null {
  const lines = side ? cleanLines(side.lines) : null
  return lines ? { key: 'sheet', studio, lines } : null
}

/**
 * Quote X-Ray (REG-529) — run a comparison and keep it. The other studio's file is one of the three reference quotes (by name), or the
 * lines the browser read from a spreadsheet or (pending modules S21) a PDF's own words, checked again here. Your side is a studio quote's
 * real lines, or — in Upload two quotes — a file too. The run charges nothing: Quote X-Ray is a plan feature (Pro), never a metered press —
 * 1.0's own rule (its price list carries "Quote X-ray analysis · 10" but no route spends it; its pricing page leaves it out on purpose).
 */
export async function runComparison(input: RunInput): Promise<RunResult> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const lock = await xrayLock(); if (lock) return lock
  /* (REG-641, parity Q-19) the run's checks (E-101): file names capped; the lead live and the viewer's; the quote live, on that
     lead, with lines to compare; the same reference on both sides of an upload is one quote, not two */
  const otherFile = String(input.otherFile ?? '').trim().slice(0, 120), yourFile = input.yourFile ? String(input.yourFile).trim().slice(0, 120) : null
  const named = typeof input.other?.studio === 'string' ? input.other.studio.trim().slice(0, 80) : ''
  const other = input.other ? sheetQuote(input.other, named || OTHER_STUDIO) : referenceQuote(input.otherRef)   // (S42 E-05) never by the file's name
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
    const mine = input.yours ? sheetQuote(input.yours, brand.details.name) : referenceQuote(input.yourRef)   // (S42 E-05)
    if (!mine) return { error: 'unreadable-yours' }
    if (!input.yours && !input.other && mine.key === other.key) return { error: 'same-quote' }
    /* (S21) one file read on both sides is one quote, not two (E-94) */
    if (input.yours && input.other && JSON.stringify(mine.lines) === JSON.stringify(other.lines)) return { error: 'same-quote' }
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
 * Recent comparisons › delete (REG-641, parity Q-20): its maker, an Owner or an Admin deletes it, and the lead's Activity keeps who removed
 * which reading. (the close-out round 2026-10-31, C-08) Softly, as a quote and a contract delete: the reading leaves Recent, its record and
 * every list, and waits in Deleted comparisons — the snackbar's Undo and the sheet's Restore bring it back, Delete forever removes it.
 */
export async function deleteComparison(id: string): Promise<{ ok: true } | { error: 'gone' | 'not-allowed' } | PlanLock | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const lock = await xrayLock(); if (lock) return lock
  const c = await openComparison(id)
  if (!c) return { error: 'gone' }
  const viewer = await fetchViewer(), actor = await actingMember()
  if (!canDeleteComparison({ id: actor, role: viewer.role }, c.createdBy)) return { error: 'not-allowed' }
  await db.transaction(async (tx) => {
    await tx.update(quoteComparisons).set({ deletedAt: new Date() }).where(eq(quoteComparisons.id, id))
    /* (C-08) the line names its reading by id, so a restore right after it (the Undo) can take it away again */
    if (c.leadId) await logLeadEvent(tx, c.leadId, 'comparison_deleted', { id, title: titleOf(c) }, actor)
  })
  revalidate(c)
  return { ok: true }
}

/** (REG-641, Q-19) A comparison this viewer may act on — its lead live and theirs to open, or no lead at all. (C-08) A deleted one only
    when `deleted` asks for it (Restore · Delete forever); every other action answers a deleted reading as gone. */
async function openComparison(id: string, deleted = false): Promise<QuoteComparison | null> {
  const [c] = await db.select().from(quoteComparisons).where(and(eq(quoteComparisons.id, id), deleted ? isNotNull(quoteComparisons.deletedAt) : isNull(quoteComparisons.deletedAt)))
  if (!c) return null
  if (c.leadId) {
    const [l] = await db.select({ id: leads.id }).from(leads).where(and(eq(leads.id, c.leadId), isNull(leads.deletedAt)))
    if (!l || !(await canOpenLead(await fetchViewer(), c.leadId))) return null
  }
  return c
}

// ── (the close-out round 2026-10-31, C-08) Deleted comparisons: Undo, Restore, Delete forever ─────────────────────────────────

/** The reading's name in the lead's history — Recent's own words before C-08 kept them ("OM-10008 · Whole-home renovation · vs Cove Interior"). */
const titleOf = (c: Pick<QuoteComparison, 'yourLabel' | 'otherStudio'>) => `${c.yourLabel} · vs ${c.otherStudio}`
/** A restore this soon after its delete is the snackbar's Undo (the AI Visualizer's window, app/visualizer/actions.ts). */
const UNDO_MS = 120_000
/** A restore right after its delete takes the delete's line away (the undoStageMove way); later, the lead's Activity says it came back. */
async function untrail(c: QuoteComparison, actor: string) {
  if (!c.leadId) return
  const rows = await db.select({ id: leadEvents.id, at: leadEvents.at, detail: leadEvents.detail }).from(leadEvents).where(and(eq(leadEvents.leadId, c.leadId), eq(leadEvents.kind, 'comparison_deleted'))).orderBy(desc(leadEvents.at))
  const hit = rows.find((e) => (e.detail as LeadEventDetail | null)?.id === c.id)
  if (hit && Date.now() - hit.at.getTime() < UNDO_MS) await db.delete(leadEvents).where(eq(leadEvents.id, hit.id))
  else await logLeadEvent(db, c.leadId, 'comparison_restored', { id: c.id, title: titleOf(c) }, actor)
}
type Trash = { restored: number; kept: number } | { deleted: number; kept: number }
/** Every id given that is in Deleted and this viewer's to see, split by the delete's rule (its maker, an Owner or an Admin). */
async function trashed(ids: string[]): Promise<{ ok: QuoteComparison[]; kept: number; actor: string }> {
  const viewer = await fetchViewer(), actor = await actingMember()
  const ok: QuoteComparison[] = []
  let kept = 0
  for (const id of [...new Set(ids)]) {
    const c = await openComparison(id, true)
    if (!c) continue
    if (canDeleteComparison({ id: actor, role: viewer.role }, c.createdBy)) ok.push(c); else kept++
  }
  return { ok, kept, actor }
}
/** A refusal of every one is the rule itself, never "restored 0". */
const answer = (n: number, kept: number, done: (n: number) => Trash): Trash | { error: string } => (!n && kept ? { error: COMPARISON_TRASH_RULE } : !n ? { error: 'That comparison is already gone' } : done(n))

/** Deleted comparisons, for the sheet — the lead's own on its page, else every one this viewer sees (lib/xray/queries.ts). */
export async function listDeletedComparisons(leadId: string | null): Promise<DeletedComparison[]> {
  if (await workspaceRefusal()) return []   // (S45C) the workspace's role rule — before anything is read
  return fetchDeletedComparisons(leadId)
}

/** Restore — the snackbar's Undo and the sheet's Restore: back in Recent and on its record, as it was (its date and its place kept). */
export async function restoreComparisons(ids: string[]): Promise<Trash | { error: string } | PlanLock | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const lock = await xrayLock(); if (lock) return lock
  const { ok, kept, actor } = await trashed(ids)
  if (ok.length) await db.update(quoteComparisons).set({ deletedAt: null }).where(inArray(quoteComparisons.id, ok.map((c) => c.id)))
  for (const c of ok) { await untrail(c, actor); revalidate(c) }
  return answer(ok.length, kept, (n) => ({ restored: n, kept }))
}

/** Delete forever — the rows go; the lead's Activity says which reading went for good, and by whom. */
export async function deleteComparisonsForever(ids: string[]): Promise<Trash | { error: string } | PlanLock | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const lock = await xrayLock(); if (lock) return lock
  const { ok, kept, actor } = await trashed(ids)
  if (ok.length) await db.transaction(async (tx) => {
    for (const c of ok) if (c.leadId) await logLeadEvent(tx, c.leadId, 'comparison_purged', { id: c.id, title: titleOf(c) }, actor)
    await tx.delete(quoteComparisons).where(inArray(quoteComparisons.id, ok.map((c) => c.id)))
  })
  for (const c of ok) revalidate(c)
  return answer(ok.length, kept, (n) => ({ deleted: n, kept }))
}

/** Delete all forever — every deleted comparison on the sheet (the lead's, or the studio's) that this viewer may remove; the rest stay. */
export async function emptyComparisonTrash(leadId: string | null): Promise<Trash | { error: string } | PlanLock | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const rows = await fetchDeletedComparisons(leadId)
  return deleteComparisonsForever(rows.filter((r) => r.mine).map((r) => r.id))
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
export async function correctComparison(id: string, change: { split?: [string, number][]; pair?: [string, number][] }): Promise<{ previous: XrayOverrides } | { error: 'gone' | 'old' } | PlanLock | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const lock = await xrayLock(); if (lock) return lock
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
export async function setComparisonOverrides(id: string, overrides: XrayOverrides): Promise<void | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  if (await xrayLock()) return
  const c = await openComparison(id)
  const inputs = c ? readInputs(c) : null
  if (!c || !inputs) return
  await writeOverrides(c, inputs, overrides)
}

/**
 * (Q-15) Run again: a new reading of the quote as it is now against the same other quote — the old reading stays. Corrections
 * carry over where both lines still exist.
 */
export async function rerunComparison(id: string): Promise<{ id: string } | { error: 'gone' | 'nothing-to-compare' } | PlanLock | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const lock = await xrayLock(); if (lock) return lock
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
export async function recordComparisonSent(id: string, text: string, via: 'whatsapp' | 'copy'): Promise<void | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  if (await xrayLock()) return
  const c = await openComparison(id)
  if (!c) return
  await db.update(quoteComparisons).set({ sentAt: new Date(), sentBy: await actingMember(), sentText: text.slice(0, 4000), sentVia: via === 'copy' ? 'copy' : 'whatsapp' }).where(eq(quoteComparisons.id, id))
  revalidate(c)
}
