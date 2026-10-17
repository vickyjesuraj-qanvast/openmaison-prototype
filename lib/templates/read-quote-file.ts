/**
 * (pending modules S11 — card held:quote-templates) "Upload my existing quote", in the browser: a PDF is read for its words (pdf.js, the
 * import wizard's reader; its first six pages hold a quote's shape) and matched by rule (`readLayout`). (S43B · F1-02) A photo or scan, or a
 * PDF with no words in it (a scan saved as PDF), is never matched by its name: it says plainly that it can't be read and the studio picks the
 * design that looks closest (`unreadMatch`). Nothing leaves the browser.
 */
import { readLayout, unreadMatch, type Match } from './recreate'

export async function readQuoteFile(file: File): Promise<Match> {
  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
  if (!isPdf) return unreadMatch('A photo has no words to read here — pick the design that looks closest. It sits beside the canvas to match against.')
  try {
    const { pdfReading } = await import('@/lib/pdf-text')
    const r = await pdfReading(await file.arrayBuffer(), 6)
    if (!r.lines.some((l) => l.trim().length > 2)) return unreadMatch('This PDF is a picture of a page, with no words to read — pick the design that looks closest.')
    return readLayout(r)
  } catch {
    return unreadMatch('This PDF couldn’t be opened to read — pick the design that looks closest.')
  }
}
