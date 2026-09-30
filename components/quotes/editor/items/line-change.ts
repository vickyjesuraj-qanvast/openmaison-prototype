import { diffQuoteItems, type Diffable, type LineWas } from '@/lib/quotes/diff'
import { money2 } from '@/lib/quotes/math'

/**
 * (UX audit Q10) What a line is since the quote's last kept version — Version History counts "2 changed", and the Items table now shows
 * which: new lines and changed ones (name · quantity · price · discount, REG-595's diff) wear a tint and a tag while the revision is worked on.
 */
export type LineChange = { kind: 'added' | 'changed'; since: number; was: LineWas | null }
export type LineChanges = Map<string, LineChange>

/** The quote's lines against the kept version's (`prev`), keyed by line id. `version` is the one being worked on. */
export function lineChanges(prev: Diffable[] | null, lines: Diffable[], version: number): LineChanges {
  const out: LineChanges = new Map()
  if (!prev || version < 2) return out
  const d = diffQuoteItems(prev, lines)
  for (const id of d.added) out.set(id, { kind: 'added', since: version - 1, was: null })
  for (const [id, was] of d.changed) out.set(id, { kind: 'changed', since: version - 1, was })
  return out
}

/** The tag's words and its tooltip — what the line was in the kept version. */
export function changeTag(c: LineChange): { label: string; help: string } {
  if (c.kind === 'added') return { label: `New since v${c.since}`, help: `Not in version ${c.since} — added in this revision` }
  const w = c.was
  return { label: `Changed since v${c.since}`, help: w ? `In version ${c.since}: ${w.name} · ${w.qty} × ${money2(w.unitPriceMinor)} = ${money2(w.totalMinor)}` : `Changed since version ${c.since}` }
}
