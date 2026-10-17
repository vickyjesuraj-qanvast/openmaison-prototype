/**
 * (S44I — M9, UAT rows 350 · 325; as recommended, her ask 2026-10-15) The studio's own units — Settings › Quotes & pricing › Units, kept like
 * the Trades (REG-561 / REG-647): add, rename (the lines and the Price book follow), move, remove (what already uses one keeps it). Unset, the
 * seven a quote always offered — a studio that never opens the card loses nothing. Every unit picker reads them: the Items table's cell menu
 * (type-ahead), the phone's sheet, Set a value, the paste mapping, the Price book's item and section dialogs, Choices and the Marketplace.
 * Pure: server and browser.
 */
import { UNITS } from '@/lib/quotes/items-model'

export const UNITS_KEY = 'units'
/** The seven a quote offered before the studio kept its own. */
export const DEFAULT_UNITS: readonly string[] = UNITS
const UNIT_RE = /^[^\x00-\x1f]{1,40}$/
/** (S44P's grammar for a studio list — `TRADES_MAX` · `TRADES_FULL` · `TRADES_RULE` in lib/settings/trades.ts) The list holds this many; past it the
    card and New unit… say so rather than drop a name without a word. */
export const UNITS_MAX = 60
export const UNITS_FULL = `The units list holds ${UNITS_MAX} — remove one first`
/** Who adds, renames or removes a unit — Settings' setters' rule (`runsStudio`). */
export const UNITS_RULE = 'Only an Owner or an Admin changes the studio’s units'
/** A stored list: words, trimmed, once each whatever their case (the first spelling wins), at most `UNITS_MAX`. */
export function parseUnits(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  const seen = new Map<string, string>()
  for (const x of v) {
    if (typeof x !== 'string') continue
    const t = x.trim().replace(/\s+/g, ' ')
    if (t && UNIT_RE.test(t) && !seen.has(t.toLowerCase())) seen.set(t.toLowerCase(), t)
  }
  return [...seen.values()].slice(0, UNITS_MAX)
}
/** The studio's spelling of a unit typed in any case, or the typed words when the list has none. */
export const studioUnit = (units: readonly string[], typed: string) => units.find((u) => u.toLowerCase() === typed.trim().toLowerCase()) ?? typed.trim()
