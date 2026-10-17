/* (gaps build F1) Reads the demo's sample bills the way the bill dialog does — pdf.js's text joined into lines (lib/pdf-text.ts's rule), then
   `readBill` — and prints what it took. `npx tsx scripts/finance-read-test.mts` */
import { readFileSync } from 'node:fs'
import { readBill } from '../lib/finance/bill-reader'

async function linesOf(file: string): Promise<string[]> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const doc = await pdfjs.getDocument({ data: new Uint8Array(readFileSync(file)), verbosity: 0 }).promise
  const lines: string[] = []
  for (let p = 1; p <= doc.numPages; p += 1) {
    const content = await (await doc.getPage(p)).getTextContent()
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
    for (const it of items) { const last = cur[cur.length - 1]; if (last && Math.abs(last.y - it.y) > Math.min(last.h, it.h) * 0.6) flush(); cur.push(it) }
    flush()
  }
  return lines
}
const vendors = [{ id: 'woodcraft', name: 'Woodcraft Carpentry Pte Ltd', uen: '201534567K' }, { id: 'aquaflow', name: 'AquaFlow Plumbing Works', uen: '53412788B' }, { id: 'colourpro', name: 'ColourPro Painting Services', uen: null }]
for (const f of ['woodcraft-bill-WC-2391.pdf', 'aquaflow-bill-AF-7781.pdf', 'colourpro-bill-CP-0412.pdf', 'printhub-bill-PH-2210.pdf']) {
  const r = readBill(await linesOf(`public/uat-files/${f}`), vendors)
  console.log(f, JSON.stringify({ ...r, issuedOn: r.issuedOn ? new Date(r.issuedOn).toDateString() : null, dueOn: r.dueOn ? new Date(r.dueOn).toDateString() : null }))
}
