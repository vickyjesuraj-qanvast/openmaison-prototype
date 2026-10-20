'use server'

import { revalidatePath } from 'next/cache'
import { and, eq, inArray, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { priceBookItems, priceBookSections, quoteItems, settings } from '@/lib/db/schema'
import { fetchTrades, TRADE_NOTES_KEY } from '@/lib/settings/queries'
import { parseTradeNotes, tradeKey } from '@/lib/settings/types'
import { TRADES_FULL, TRADES_MAX, TRADES_RULE, listedAs, sameName, type TradeMergeUndo, type TradeUsage } from '@/lib/settings/trades'
import { setTrades } from './actions'

/* (S44P — his UAT ask 2026-10-15, rows 319 · 340; triage M14) The trades' own writes beyond the list setter: a trade added from the Price
   book's item dialog, and two trades merged into one — with its Undo. Owners and Admins, as every Settings setter (REG-624); a refusal
   answers its rule as `{ error }` (the house rule, wave E · E7). Rename's rule holds: a record carries its trade in whatever case it was
   typed (REG-651), so a merge gathers every spelling of the merged trade. */

type Refusal = { error: string }
const LIST_NAME = /^[^\x00-\x1f]{1,40}$/   // the list's names, as renameIn (app/settings/actions.ts) takes them
const GONE = 'That trade is gone from the list — reload to see the trades as they are'
const clean = (s: string) => s.trim().replace(/\s+/g, ' ')

async function refusal(): Promise<string | null> {
  const { fetchViewer } = await import('@/lib/leads/visibility')
  const { runsStudio } = await import('@/lib/leads/assign-policy')
  return runsStudio((await fetchViewer()).role) ? null : TRADES_RULE
}
async function readNotes(): Promise<Record<string, string>> {
  const [row] = await db.select().from(settings).where(eq(settings.key, TRADE_NOTES_KEY)).limit(1)
  if (!row) return {}
  try { return parseTradeNotes(JSON.parse(row.value)) } catch { return {} }
}
async function writeNotes(notes: Record<string, string>) {
  const value = JSON.stringify(parseTradeNotes(notes))
  const now = new Date()
  await db.insert(settings).values({ key: TRADE_NOTES_KEY, value, updatedAt: now }).onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: now } })
}
function touch() {
  revalidatePath('/settings')
  revalidatePath('/company/price-book'); revalidatePath('/company/price-book/sections')
  revalidatePath('/quotes', 'layout'); revalidatePath('/leads', 'layout'); revalidatePath('/templates', 'layout'); revalidatePath('/company', 'layout')
}
const chunks = <T,>(xs: T[], n = 400): T[][] => { const out: T[][] = []; for (let i = 0; i < xs.length; i += n) out.push(xs.slice(i, i + n)); return out }

/** (row 319) "New category…" in the Price book: the name joins the studio's trades — said back with the list, or the rule that refused it. */
export async function addTrade(typed: string): Promise<{ trades: string[]; name: string } | Refusal> {
  const block = await refusal(); if (block) return { error: block }
  const name = clean(typeof typed === 'string' ? typed : '')
  if (!name) return { error: 'A category needs a name' }
  if (!LIST_NAME.test(name)) return { error: 'A trade’s name takes up to 40 characters' }
  const cur = (await fetchTrades()).trades
  const taken = listedAs(cur, name); if (taken) return { error: taken }
  if (cur.length >= TRADES_MAX) return { error: TRADES_FULL }
  const trades = await setTrades([...cur, name])
  touch()
  return { trades, name }
}

type Section = { lines?: { category?: unknown }[]; subs?: { lines?: { category?: unknown }[] }[] }
/** Every line of a section with its place — [-1, i] the section's own, [s, i] a sub-section's. */
const linesOf = (body: Section): [number, number, { category?: unknown }][] => [
  ...(body.lines ?? []).map((l, i) => [-1, i, l] as [number, number, { category?: unknown }]),
  ...(body.subs ?? []).flatMap((g, s) => (g.lines ?? []).map((l, i) => [s, i, l] as [number, number, { category?: unknown }])),
]
const lineAt = (body: Section, s: number, i: number) => (s < 0 ? body.lines?.[i] : body.subs?.[s]?.lines?.[i])
/** A line filed under `from` in any case — and not already under `into` exactly (a case variant merged into its other spelling). */
const filedUnder = (c: unknown, from: string, into: string): c is string => typeof c === 'string' && sameName(c, from) && c !== into

/** What merging `from` into `into` would move, for the question asked before it (row 340). */
export async function tradeUsage(from: string, into: string): Promise<TradeUsage | Refusal> {
  const block = await refusal(); if (block) return { error: block }
  const [items] = await db.select({ n: sql<number>`count(*)` }).from(priceBookItems).where(and(sql`lower(${priceBookItems.category}) = lower(${from})`, sql`${priceBookItems.category} <> ${into}`))
  const [lines] = await db.select({ n: sql<number>`count(*)` }).from(quoteItems).where(and(sql`lower(${quoteItems.category}) = lower(${from})`, sql`${quoteItems.category} <> ${into}`))
  let sectionLines = 0
  for (const sec of await db.select({ linesJson: priceBookSections.linesJson }).from(priceBookSections)) {
    try { sectionLines += linesOf(JSON.parse(sec.linesJson) as Section).filter(([, , l]) => filedUnder(l.category, from, into)).length } catch { /* an unreadable section is left as it is */ }
  }
  const notes = await readNotes()
  return { items: Number(items?.n ?? 0), lines: Number(lines?.n ?? 0), sectionLines, fromNote: !!notes[tradeKey(from)], intoNote: !!notes[tradeKey(into)] }
}

/**
 * (row 340) Merge `from` into `into`: the price book items, quote lines and My Sections' lines filed under `from` (any case) move to
 * `into`, `from` leaves the list, and the notes settle — `note` (typed in the trade's dialog) becomes `into`'s; else `into` keeps its own,
 * or takes `from`'s when it has none. Answers the list, the notes, what moved and the record its Undo puts back.
 */
export async function mergeTrade(input: { from: string; into: string; note?: string | null }): Promise<{ trades: string[]; notes: Record<string, string>; undo: TradeMergeUndo; moved: { items: number; lines: number; sectionLines: number } } | Refusal> {
  const block = await refusal(); if (block) return { error: block }
  const from = typeof input?.from === 'string' ? input.from : '', into = typeof input?.into === 'string' ? input.into : ''
  const cur = (await fetchTrades()).trades
  const at = cur.indexOf(from)
  if (at < 0 || !cur.includes(into) || from === into) return { error: GONE }
  const group = (rows: { id: string; category: string | null }[]) => {
    const by = new Map<string, string[]>()
    for (const r of rows) if (r.category) by.set(r.category, [...(by.get(r.category) ?? []), r.id])
    return [...by.entries()].map(([was, ids]) => ({ was, ids }))
  }
  const undo: TradeMergeUndo = { from, into, at, fromNote: null, intoNote: null, items: [], lines: [], sections: [] }
  await db.transaction(async (tx) => {
    const itemRows = await tx.select({ id: priceBookItems.id, category: priceBookItems.category }).from(priceBookItems).where(and(sql`lower(${priceBookItems.category}) = lower(${from})`, sql`${priceBookItems.category} <> ${into}`))
    const lineRows = await tx.select({ id: quoteItems.id, category: quoteItems.category }).from(quoteItems).where(and(sql`lower(${quoteItems.category}) = lower(${from})`, sql`${quoteItems.category} <> ${into}`))
    for (const ids of chunks(itemRows.map((r) => r.id))) await tx.update(priceBookItems).set({ category: into }).where(inArray(priceBookItems.id, ids))
    for (const ids of chunks(lineRows.map((r) => r.id))) await tx.update(quoteItems).set({ category: into }).where(inArray(quoteItems.id, ids))
    undo.items = group(itemRows); undo.lines = group(lineRows)
    for (const sec of await tx.select({ id: priceBookSections.id, linesJson: priceBookSections.linesJson }).from(priceBookSections)) {
      let body: Section
      try { body = JSON.parse(sec.linesJson) as Section } catch { continue }   // an unreadable section is left as it is
      const hit: [number, number, string][] = []
      for (const [s, i, l] of linesOf(body)) if (filedUnder(l.category, from, into)) { hit.push([s, i, l.category]); l.category = into }
      if (hit.length) { await tx.update(priceBookSections).set({ linesJson: JSON.stringify(body) }).where(eq(priceBookSections.id, sec.id)); undo.sections.push({ id: sec.id, at: hit }) }
    }
  })
  /* the notes: one key for a case variant (nothing moves); else `from`'s goes, `into` takes the typed note, or keeps its own, or takes `from`'s */
  const notes = await readNotes()
  const fk = tradeKey(from), ik = tradeKey(into)
  undo.fromNote = notes[fk] ?? null; undo.intoNote = notes[ik] ?? null
  const typed = typeof input.note === 'string' ? input.note.trim().slice(0, 600) : null
  if (fk !== ik) { if (typed === null && !notes[ik] && notes[fk]) notes[ik] = notes[fk]!; delete notes[fk] }
  if (typed !== null) { if (typed) notes[ik] = typed; else delete notes[ik] }
  const trades = await setTrades(cur.filter((t) => t !== from))
  await writeNotes(notes)
  touch()
  const moved = { items: undo.items.reduce((s, g) => s + g.ids.length, 0), lines: undo.lines.reduce((s, g) => s + g.ids.length, 0), sectionLines: undo.sections.reduce((s, g) => s + g.at.length, 0) }
  return { trades, notes: parseTradeNotes(await readNotes()), undo, moved }
}

/** The merge's Undo: each record that still carries `into` takes back the name it had, `from` returns to its place, both notes as they were. */
export async function undoMergeTrade(u: TradeMergeUndo): Promise<{ trades: string[]; notes: Record<string, string> } | Refusal> {
  const block = await refusal(); if (block) return { error: block }
  /* the browser hands the record back: every part is checked before it is written — names the list takes, every name carried one of
     `from`'s spellings, ids as ids, places as numbers */
  const name = (v: unknown): v is string => typeof v === 'string' && LIST_NAME.test(v)
  const id = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= 64
  if (!u || !name(u.from) || !name(u.into) || u.from === u.into) return { error: GONE }
  const from = u.from, into = u.into
  const groups = (gs: unknown) => (Array.isArray(gs) ? gs : []).slice(0, 200).filter((g): g is { was: string; ids: string[] } => !!g && name(g.was) && sameName(g.was, from) && Array.isArray(g.ids))
    .map((g) => ({ was: g.was, ids: g.ids.filter(id).slice(0, 20000) }))
  const items = groups(u.items), lines = groups(u.lines)
  const secs = (Array.isArray(u.sections) ? u.sections : []).slice(0, 2000).filter((s) => !!s && id(s.id) && Array.isArray(s.at))
  await db.transaction(async (tx) => {
    for (const g of items) for (const ids of chunks(g.ids)) await tx.update(priceBookItems).set({ category: g.was }).where(and(inArray(priceBookItems.id, ids), eq(priceBookItems.category, into)))
    for (const g of lines) for (const ids of chunks(g.ids)) await tx.update(quoteItems).set({ category: g.was }).where(and(inArray(quoteItems.id, ids), eq(quoteItems.category, into)))
    for (const s of secs) {
      const [row] = await tx.select({ linesJson: priceBookSections.linesJson }).from(priceBookSections).where(eq(priceBookSections.id, s.id))
      if (!row) continue
      let body: Section
      try { body = JSON.parse(row.linesJson) as Section } catch { continue }
      let hit = false
      for (const p of s.at.slice(0, 2000)) {
        if (!Array.isArray(p) || !Number.isInteger(p[0]) || !Number.isInteger(p[1]) || !name(p[2]) || !sameName(p[2], from)) continue
        const l = lineAt(body, p[0], p[1])
        if (l && l.category === into) { l.category = p[2]; hit = true }
      }
      if (hit) await tx.update(priceBookSections).set({ linesJson: JSON.stringify(body) }).where(eq(priceBookSections.id, s.id))
    }
  })
  const cur = (await fetchTrades()).trades
  const fk = tradeKey(from), ik = tradeKey(into)
  /* `from` back in its place — unless the list has it again (any case; a case variant only by its own spelling) */
  const back = fk === ik ? !cur.includes(from) : !cur.some((t) => sameName(t, from))
  const at = Math.max(0, Math.min(cur.length, Number.isInteger(u.at) ? u.at : cur.length))
  const trades = await setTrades(back ? [...cur.slice(0, at), from, ...cur.slice(at)] : cur)
  const notes = await readNotes()
  const fromNote = typeof u.fromNote === 'string' ? u.fromNote : null, intoNote = typeof u.intoNote === 'string' ? u.intoNote : null
  if (fk !== ik) { if (fromNote) notes[fk] = fromNote; else delete notes[fk] }
  if (intoNote) notes[ik] = intoNote; else delete notes[ik]
  await writeNotes(notes)
  touch()
  return { trades, notes: parseTradeNotes(await readNotes()) }
}
