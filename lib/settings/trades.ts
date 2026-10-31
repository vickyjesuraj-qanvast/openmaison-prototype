/**
 * (S44P — his UAT ask 2026-10-15, rows 264 · 340 · 341 · 319; triage M14) One name per trade. Pure and client-safe: Settings › Trades, the
 * Price book's item dialog, its bulk Set category and the trade actions (app/settings/trades-actions.ts) read the same words and rules.
 *
 * - A name already in a list says WHICH entry it matches — a case variant ("carpentry works") read as "it exists, but where?" (row 264).
 * - Renaming a trade onto one already in the list merges them: its price book items, quote lines and My Sections' lines move, it leaves the
 *   list, Undo puts every record back (row 340). Rename's own rule — whatever case a record was typed in — holds for a merge.
 * - A list of categories counts a case variant once, the trades' own spelling first (row 341).
 */

/** (rows 319 · 340) Who adds or merges a trade — Settings' setters' rule (`runsStudio`), in the price book's grammar (BOOK_RULE · SECTION_RULE). */
export const TRADES_RULE = 'Only an Owner or an Admin changes the studio’s trades'
/** The list holds this many (`parseTrades`) — a name past it was dropped without a word. */
export const TRADES_MAX = 60
export const TRADES_FULL = `The trades list holds ${TRADES_MAX} — merge or remove one first`

/** Two names for the same trade: the same words in any case, any spacing at the ends. */
export const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

/** The entry of `names` that `typed` matches (any case), else null — `except` (the entry being renamed) never counts. */
export function listedMatch(names: readonly string[], typed: string, except?: string | null): string | null {
  const t = typed.trim()
  if (!t) return null
  return names.find((n) => n !== except && sameName(n, t)) ?? null
}

/**
 * (row 264) The field's message for a name already in the list: the house words when it is typed exactly as listed, else the entry it
 * matches named — "Already in the list as “Carpentry Works”". Undefined when the name is free.
 */
export function listedAs(names: readonly string[], typed: string, except?: string | null): string | undefined {
  const hit = listedMatch(names, typed, except)
  if (!hit) return undefined
  return hit === typed.trim() ? `${hit} is already in the list` : `Already in the list as “${hit}”`
}

/** (row 341) Names that differ only in case count once — the first spelling met wins (pass the trades first), in A–Z order. */
export function oneSpelling(...lists: readonly (readonly (string | null | undefined)[])[]): string[] {
  const seen = new Map<string, string>()
  for (const list of lists) for (const raw of list) { const n = (raw ?? '').trim(); if (n && !seen.has(n.toLowerCase())) seen.set(n.toLowerCase(), n) }
  return [...seen.values()].sort((a, b) => a.localeCompare(b))
}

/** What a merge moves: price book items, quote lines and the lines inside My Sections — and whether each trade carries a note. */
export type TradeUsage = { items: number; lines: number; sectionLines: number; fromNote: boolean; intoNote: boolean }

const n = (k: number, one: string, many: string) => `${k} ${k === 1 ? one : many}`

/** "3 price book items, 11 quote lines and 2 lines in My Sections" — the parts that move, else null. */
export function movedWords(u: Pick<TradeUsage, 'items' | 'lines' | 'sectionLines'>): string | null {
  const parts = [u.items ? n(u.items, 'price book item', 'price book items') : null, u.lines ? n(u.lines, 'quote line', 'quote lines') : null, u.sectionLines ? n(u.sectionLines, 'line in a saved section', 'lines in saved sections') : null].filter((x): x is string => !!x)
  if (!parts.length) return null
  return parts.length === 1 ? parts[0]! : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`
}

/** (row 340) The merge's question — "Merge Electrical into Electrical Works?" — and what it does, before it does it. */
export const mergeTitle = (from: string, into: string) => `Merge ${from} into ${into}?`
export function mergeMessage(from: string, into: string, u: TradeUsage, note: string | null): string {
  const moved = movedWords(u)
  const what = moved ? `${moved} move to ${into}, and ${from} leaves the trades.` : `Nothing is filed under ${from} yet — it leaves the trades.`
  /* the note — said only when something happens to one (Undo puts both back whatever happens): `note` is what the trade's dialog typed
     (null = untouched, '' = emptied) */
  const same = sameName(from, into)
  const said = note ? ` ${into} takes the note you typed.` : note === '' || same ? '' : u.fromNote && u.intoNote ? ` ${into} keeps its own note.` : u.fromNote ? ` ${into} takes its note.` : ''
  return `${what}${said}`
}
/** The snackbar once it is done. */
export function mergedLine(from: string, into: string, u: Pick<TradeUsage, 'items' | 'lines' | 'sectionLines'>): string {
  const moved = movedWords(u)
  return moved ? `${from} merged into ${into} — ${moved} moved` : `${from} merged into ${into}`
}

/**
 * What a merge changed, to put back — every record by id with the name it carried (a merge also gathers other spellings of the same
 * trade), each line of My Sections by its place, the list's order and both notes. Travels to the browser and back in one object (the house
 * rule for a long argument); the Undo action checks every part before it writes.
 */
export type TradeMergeUndo = {
  from: string; into: string
  /** where `from` sat in the list */ at: number
  fromNote: string | null; intoNote: string | null
  items: { was: string; ids: string[] }[]
  lines: { was: string; ids: string[] }[]
  /** a section's lines: [sub-section index (−1 = the section's own lines), line index, the name it carried] */
  sections: { id: string; at: [number, number, string][] }[]
}
