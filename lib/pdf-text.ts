/**
 * (REG-603) The text of a PDF, page by page, as lines — pdf.js loaded only when a PDF is dropped on the import wizard
 * (the worker is served from /pdfjs, copied from pdfjs-dist at build time). Items on the same baseline join into one line;
 * a wide gap between items becomes a column break ("  "), so a tabular lead sheet keeps its columns for the reader.
 */
export async function pdfLines(buf: ArrayBuffer): Promise<string[]> {
  return (await pdfReading(buf)).lines
}

/** (pending modules S11) The PDF's lines with its page count and its first page's size in points (A4 595 × 842, Letter 612 × 792) — what
    "Upload my existing quote" reads a quote's layout from. `maxPages` stops early on a long file (a quote's shape shows on its first pages). */
export async function pdfReading(buf: ArrayBuffer, maxPages = Infinity): Promise<{ lines: string[]; pages: number; size: { w: number; h: number } | null; firstPageLines: number }> {
  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.mjs'
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise
  const lines: string[] = []
  let size: { w: number; h: number } | null = null
  let firstPageLines = 0
  for (let p = 1; p <= Math.min(doc.numPages, maxPages); p += 1) {
    const page = await doc.getPage(p)
    if (p === 1) { const vp = page.getViewport({ scale: 1 }); size = { w: vp.width, h: vp.height } }
    const content = await page.getTextContent()
    type Item = { str: string; x: number; y: number; w: number; h: number }
    const items: Item[] = []
    for (const it of content.items) {
      if (!('str' in it) || !it.str.trim()) continue
      const [a, , , , x, y] = it.transform as number[]
      items.push({ str: it.str, x: x ?? 0, y: y ?? 0, w: it.width, h: Math.abs(a ?? it.height ?? 10) || 10 })
    }
    items.sort((m, n) => (Math.abs(n.y - m.y) > Math.min(m.h, n.h) * 0.6 ? n.y - m.y : m.x - n.x))
    let cur: Item[] = []
    const flush = () => { if (!cur.length) return; let s = ''; let end = -Infinity; for (const it of cur) { if (s) s += it.x - end > Math.max(6, it.h * 0.9) ? '  ' : ' '; s += it.str; end = it.x + it.w } lines.push(s.trim()); cur = [] }
    for (const it of items) {
      const last = cur[cur.length - 1]
      if (last && Math.abs(last.y - it.y) > Math.min(last.h, it.h) * 0.6) flush()
      cur.push(it)
    }
    flush()
    if (p === 1) firstPageLines = lines.length
    lines.push('')
  }
  return { lines, pages: doc.numPages, size, firstPageLines }
}
