import { flattenItems, lineTotalMinor, printsWord, descendantIds, withSectionWords } from '@/lib/quotes/math'
import { htmlToPlain, printAsWord } from '@/lib/quotes/items-model'
import type { QuoteItem } from '@/lib/db/schema'
import type { YourLine } from './compare'

/**
 * Quote X-Ray (REG-638, X-Ray parity Q-02) — a studio quote's lines as the comparison reads them, pure (the record's loader and
 * the demo repair share it): the quote's own count. In the quote's order (sections, then their lines, as the editor draws them);
 * items only; optional lines out and lines the client declined out, a declined section's lines with it — every line the
 * quote's subtotal leaves out, as `countedLines` does — except that a line printing a word (FOC · Inclusive · KIV · By client ·
 * Packaged · a custom word) stays, covered and unpriced, carrying its word. A line's trade is its category, else its section's
 * category, else the section's name; its room likewise. An untitled empty line ("Item", nothing on it) is not work.
 */
type Item = Pick<QuoteItem, 'id' | 'parentId' | 'kind' | 'status' | 'position' | 'optional' | 'printAs' | 'printAsText' | 'name' | 'description' | 'category' | 'room' | 'qty' | 'unit' | 'costMinor' | 'markupMinor' | 'discountPct' | 'gstPct'>

export function yourLinesFrom(items: Item[]): YourLine[] {
  const ordered = flattenItems(withSectionWords(items))   // (S44I — M17) a line in a section that prints a word carries that word
  const byId = new Map(items.map((i) => [i.id, i]))
  const declined = descendantIds(items, items.filter((i) => i.kind === 'group' && i.status === 'Declined').map((i) => i.id))
  const out: YourLine[] = []
  for (const i of ordered) {
    if (i.kind !== 'item' || i.status === 'Declined' || i.optional || declined.has(i.id)) continue
    const g = i.parentId ? byId.get(i.parentId) : undefined
    const word = printsWord(i) ? printAsWord(i) || null : null
    const amountMinor = word ? 0 : lineTotalMinor(i)
    const description = i.description ? htmlToPlain(i.description).trim() || null : null
    const name = (i.name ?? '').trim()
    if ((!name || name === 'Item') && !description && amountMinor === 0 && !word) continue
    out.push({ id: i.id, name: name || 'Untitled line', description, trade: i.category ?? g?.category ?? g?.name ?? null, room: i.room ?? g?.room ?? null, qty: i.qty, unit: i.unit, amountMinor, optional: false, word })
  }
  return out
}

/** What a reading's side depends on — the stale check (Q-15) compares this with the quote as it is now. */
export function linesFingerprint(lines: Pick<YourLine, 'id' | 'name' | 'qty' | 'unit' | 'amountMinor' | 'word'>[]): string {
  return lines.map((l) => `${l.id}:${l.name}:${l.qty}:${l.unit ?? ''}:${l.amountMinor}:${l.word ?? ''}`).join('|')
}
