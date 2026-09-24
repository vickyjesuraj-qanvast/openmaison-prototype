/**
 * (REG-603) The text of a PDF, page by page, as lines — pdf.js loaded only when a PDF is dropped on the import wizard
 * (the worker is served from /pdfjs, copied from pdfjs-dist at build time). Items on the same baseline join into one line;
 * a wide gap between items becomes a column break ("  "), so a tabular lead sheet keeps its columns for the reader.
 */
export async function pdfLines(buf: ArrayBuffer): Promise<string[]> {
  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.mjs'
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise
  const lines: string[] = []
  for (let p = 1; p <= doc.numPages; p += 1) {
    const page = await doc.getPage(p)
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
    lines.push('')
  }
  return lines
}
