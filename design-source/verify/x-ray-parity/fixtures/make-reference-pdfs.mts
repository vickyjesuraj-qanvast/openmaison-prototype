// (S42 E-05) The probes' stand-ins for the owner's reference quotes: since a reference quote is recognised by the file's own words (never its
// name), the X-Ray probes drop a PDF that SAYS the reference's lines. Each is a one-page table of the curated lines (lib/xray/reference.ts),
// written the way design-source/uat/gen_files.py writes cove-interior-quotation.pdf. Run: npx tsx design-source/verify/x-ray-parity/fixtures/make-reference-pdfs.mts
import fs from 'node:fs'
import path from 'node:path'
import { REFERENCE_QUOTES } from '../../../../lib/xray/reference'
const here = path.dirname(new URL(import.meta.url).pathname)
const esc = (s: string) => s.replace(/[^\x20-\x7e]/g, (c) => (c === '—' ? '-' : c === '’' ? "'" : c === '×' ? 'x' : '?')).replace(/([()\\])/g, '\\$1')
function pdf(pages: string[][]): Buffer {
  const objs: string[] = []
  const add = (o: string) => { objs.push(o); return objs.length }
  const f1 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>')
  const contents = pages.map((ops) => { const st = ops.join('\n'); return add(`<< /Length ${Buffer.byteLength(st, 'latin1')} >>\nstream\n${st}\nendstream`) })
  const pagesId = objs.length + pages.length + 1
  const kids = contents.map((c) => add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${f1} 0 R >> >> /Contents ${c} 0 R >>`))
  add(`<< /Type /Pages /Kids [${kids.map((k) => `${k} 0 R`).join(' ')}] /Count ${kids.length} >>`)
  const cat = add(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`)
  let out = '%PDF-1.4\n'
  const offs: number[] = []
  objs.forEach((o, i) => { offs.push(Buffer.byteLength(out, 'latin1')); out += `${i + 1} 0 obj\n${o}\nendobj\n` })
  const x = Buffer.byteLength(out, 'latin1')
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offs.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objs.length + 1} /Root ${cat} 0 R >>\nstartxref\n${x}\n%%EOF\n`
  return Buffer.from(out, 'latin1')
}
const NAMES: Record<string, string> = { dyel: 'dyel-sales-contract.pdf', flo: 'flo-design-quotation.pdf', cove: 'cove-interior-quotation.pdf' }
for (const q of REFERENCE_QUOTES) {
  const ops: string[] = []
  const t = (x: number, y: number, s: string, size = 7) => ops.push(`BT /F1 ${size} Tf ${x} ${y} Td (${esc(s)}) Tj ET`)
  t(40, 800, `${q.studio} - Quotation (probe fixture)`, 14)
  let y = 770
  for (const l of q.lines) {
    t(40, y, l.trade.slice(0, 24)); t(150, y, (l.room ?? '-').slice(0, 18)); t(240, y, l.name.slice(0, 60)); t(470, y, String(l.qty)); t(495, y, l.unit ?? ''); t(535, y, (l.amountMinor / 100).toLocaleString('en-SG'))
    y -= 14
  }
  fs.writeFileSync(path.join(here, NAMES[q.key]!), pdf([ops]))
  console.log('wrote', NAMES[q.key])
}
