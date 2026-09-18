/**
 * "Recreate from my current quote" (REG-491): the studio uploads the quote it sends today; the build matches it to the
 * house style that reproduces it. The match is curated for the three reference quotes (design-source/reference/quotes)
 * — the AI reading is a later build — and every other file lands on Letter, the most common shape. Client-safe.
 */
import type { PresetKey } from './presets'

export type SourceFile = { name: string; type: string; size: number; data: string | null }
export const MAX_KEPT_BYTES = 6 * 1024 * 1024   // a reference kept inline (data URI) up to 6 MB; larger files keep their name only

export function parseSourceFile(raw: string | null | undefined): SourceFile | null {
  if (!raw) return null
  try {
    const j = JSON.parse(raw) as Partial<SourceFile>
    if (typeof j.name !== 'string') return { name: raw, type: '', size: 0, data: null }
    return { name: j.name, type: typeof j.type === 'string' ? j.type : '', size: typeof j.size === 'number' ? j.size : 0, data: typeof j.data === 'string' ? j.data : null }
  } catch { return { name: raw, type: '', size: 0, data: null } }
}

export type Match = { key: PresetKey; confidence: 'high' | 'good' | 'fair'; reasons: string[] }

/** The curated match: the three reference PDFs by name, then the shape words a studio would put in a filename. */
export function matchSourceFile(name: string): Match {
  const n = name.toLowerCase()
  if (/sharon|dyel|sales.?contract/.test(n)) return { key: 'letter', confidence: 'high', reasons: ['A letter: the studio’s block, the date and the client’s details repeat on every page', 'Trades as lettered sections, rooms inside them, one amount column', 'Two-column sign-off in the footer, terms on the last page'] }
  if (/flo|scope/.test(n)) return { key: 'scope', confidence: 'high', reasons: ['A framed form: client and quotation details in two columns under the logo', 'Scope of work in lettered sections with a sub-total for each', 'Accreditation badges and the studio’s address in the footer'] }
  if (/stanley|cove|form/.test(n)) return { key: 'form', confidence: 'high', reasons: ['A boxed form on Letter paper: a grid table with a total for every page', 'Continuous item numbers, black header row, empty rows to the foot', 'Three signature columns on every page, stamp in the middle'] }
  if (/deck|present|proposal/.test(n)) return { key: 'presentation', confidence: 'good', reasons: ['A cover page, then rooms with photos and an investment summary'] }
  if (/grid|table|box/.test(n)) return { key: 'form', confidence: 'fair', reasons: ['A boxed table with page totals'] }
  return { key: 'letter', confidence: 'fair', reasons: ['The most common shape: a letter head that repeats, sections of work, terms at the end'] }
}
