import sharp from 'sharp'
/* Dev aid (REG-673): a photo with a 0.05 coordinate grid, cropped to a box and enlarged — for tracing a region's outline.
   Usage: npx tsx scripts/viz/grid.mts <public path> <out.jpg> x0 y0 x1 y1 */
const [src, out, ...b] = process.argv.slice(2)
const [x0, y0, x1, y1, stepArg] = b.map(Number) as [number, number, number, number, number | undefined]
const step = stepArg || 0.05
const meta = await sharp(`public${src}`).metadata(); const W = meta.width!, H = meta.height!
const lines: string[] = []
for (let v = 0; v <= 1.0001; v += step) {
  const X = Math.round(v * W), Y = Math.round(v * H), major = Math.round(v * 100) % (step < 0.05 ? 5 : 10) === 0
  lines.push(`<line x1="${X}" y1="0" x2="${X}" y2="${H}" stroke="${major ? '#ff0' : '#0ff'}" stroke-width="${major ? 1.4 : 0.7}" opacity="0.8"/>`)
  lines.push(`<line x1="0" y1="${Y}" x2="${W}" y2="${Y}" stroke="${major ? '#ff0' : '#0ff'}" stroke-width="${major ? 1.4 : 0.7}" opacity="0.8"/>`)
  lines.push(`<text x="${X + 2}" y="${Math.round(y0 * H) + 12}" font-size="11" fill="#ff0" font-family="Arial">${v.toFixed(2)}</text>`)
  lines.push(`<text x="${Math.round(x0 * W) + 2}" y="${Y - 2}" font-size="11" fill="#ff0" font-family="Arial">${v.toFixed(2)}</text>`)
}
const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${lines.join('')}</svg>`)
const full = await sharp(`public${src}`).composite([{ input: svg, top: 0, left: 0 }]).png().toBuffer()
const L = Math.round(x0 * W), T = Math.round(y0 * H)
await sharp(full).extract({ left: L, top: T, width: Math.min(W - L, Math.round((x1 - x0) * W)), height: Math.min(H - T, Math.round((y1 - y0) * H)) }).resize(1100).jpeg({ quality: 85 }).toFile(out!)
