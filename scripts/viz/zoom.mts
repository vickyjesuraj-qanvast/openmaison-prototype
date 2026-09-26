import sharp from 'sharp'
/* Dev aid (REG-673): a crop of a photo enlarged, with a faint grid and its coordinates in a margin — for tracing small outlines (a pot
   on a sill, a frame's inner edge). Optional polygons (JSON, 0…1) are drawn over it to check a trace.
   Usage: npx tsx scripts/viz/zoom.mts <public path> <out.png> x0 y0 x1 y1 [step] [polys-json] */
const [src, out, ...rest] = process.argv.slice(2)
const [x0, y0, x1, y1, stepArg] = rest.slice(0, 5).map(Number) as [number, number, number, number, number | undefined]
const polys: { x: number; y: number }[][] = rest[5] ? JSON.parse(rest[5]) : []
const step = stepArg || 0.01
const meta = await sharp(`public${src}`).metadata(); const W = meta.width!, H = meta.height!
const L = Math.round(x0 * W), T = Math.round(y0 * H), cw = Math.round((x1 - x0) * W), ch = Math.round((y1 - y0) * H)
const S = Math.max(1, Math.floor(1000 / cw)), M = 44
const w = cw * S, h = ch * S
const crop = await sharp(`public${src}`).extract({ left: L, top: T, width: cw, height: ch }).resize(w, h, { kernel: 'nearest' }).png().toBuffer()
const px = (x: number) => M + (x * W - L) * S, py = (y: number) => M + (y * H - T) * S
const el: string[] = []
const first = (v: number) => Math.ceil(v / step - 1e-6) * step
for (let v = first(x0); v <= x1 + 1e-9; v += step) { const X = px(v), major = Math.round(v / step) % 5 === 0; el.push(`<line x1="${X}" y1="${M}" x2="${X}" y2="${M + h}" stroke="${major ? '#ff0' : '#0ff'}" stroke-width="${major ? 1 : 0.5}" opacity="${major ? 0.7 : 0.4}"/>`); if (major) el.push(`<text x="${X - 14}" y="${M - 8}" font-size="12" fill="#000" font-family="Arial">${v.toFixed(3)}</text>`) }
for (let v = first(y0); v <= y1 + 1e-9; v += step) { const Y = py(v), major = Math.round(v / step) % 5 === 0; el.push(`<line x1="${M}" y1="${Y}" x2="${M + w}" y2="${Y}" stroke="${major ? '#ff0' : '#0ff'}" stroke-width="${major ? 1 : 0.5}" opacity="${major ? 0.7 : 0.4}"/>`); if (major) el.push(`<text x="2" y="${Y + 4}" font-size="11" fill="#000" font-family="Arial">${v.toFixed(3)}</text>`) }
for (const p of polys) el.push(`<polygon points="${p.map((q) => `${px(q.x)},${py(q.y)}`).join(' ')}" fill="rgba(255,0,140,0.18)" stroke="#f08" stroke-width="1.5"/>`)
const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w + 2 * M}" height="${h + 2 * M}">${el.join('')}</svg>`)
await sharp({ create: { width: w + 2 * M, height: h + 2 * M, channels: 3, background: '#fff' } }).composite([{ input: crop, left: M, top: M }, { input: svg, left: 0, top: 0 }]).png().toFile(out!)
console.log(`${W}x${H} crop ${cw}x${ch} ×${S}`)
