// The UAT's sample images (REG-669) → public/uat-files/ — drawn as SVG, rendered by sharp (Next's own image dependency).
const sharp = require('sharp')
const path = require('path')
const OUT = process.argv[2]

const svg = (w, h, body) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`)
const label = (x, y, s, size = 22, fill = '#fff') => `<text x="${x}" y="${y}" font-family="Helvetica, Arial, sans-serif" font-size="${size}" fill="${fill}">${s}</text>`

;(async () => {
  /* A QR-like square (the prototype shows its own sample QR once a picture is picked). Finder squares + a seeded pattern. */
  let cells = ''
  let seed = 7
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
  const N = 29, S = 9, M = 18
  const finder = (cx, cy) => `<rect x="${M + cx * S}" y="${M + cy * S}" width="${7 * S}" height="${7 * S}" fill="#000"/><rect x="${M + (cx + 1) * S}" y="${M + (cy + 1) * S}" width="${5 * S}" height="${5 * S}" fill="#fff"/><rect x="${M + (cx + 2) * S}" y="${M + (cy + 2) * S}" width="${3 * S}" height="${3 * S}" fill="#000"/>`
  const inFinder = (x, y) => (x < 8 && y < 8) || (x > N - 9 && y < 8) || (x < 8 && y > N - 9)
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!inFinder(x, y) && rnd() > 0.5) cells += `<rect x="${M + x * S}" y="${M + y * S}" width="${S}" height="${S}" fill="#000"/>`
  await sharp(svg(300, 300, `<rect width="300" height="300" fill="#fff"/>${cells}${finder(0, 0)}${finder(N - 7, 0)}${finder(0, N - 7)}`)).png().toFile(path.join(OUT, 'paynow-qr.png'))

  /* Fluted feature wall panel — vertical oak slats. */
  let slats = ''
  for (let i = 0; i < 40; i++) slats += `<rect x="${i * 20}" y="0" width="14" height="600" fill="${i % 2 ? '#B98A55' : '#C49766'}"/><rect x="${i * 20 + 14}" y="0" width="6" height="600" fill="#7A5634"/>`
  await sharp(svg(800, 600, `<rect width="800" height="600" fill="#A67C4E"/>${slats}<rect x="0" y="540" width="800" height="60" fill="rgba(0,0,0,0.45)"/>${label(24, 580, 'Fluted feature wall panel (sample photo)')}`)).jpeg({ quality: 82 }).toFile(path.join(OUT, 'fluted-panel.jpg'))

  /* Sophia's living room — a simple illustration. */
  await sharp(svg(1200, 800, `<rect width="1200" height="800" fill="#EDE6DA"/><rect y="560" width="1200" height="240" fill="#C9B79C"/>
    <rect x="120" y="120" width="360" height="300" fill="#BFD7E6" stroke="#fff" stroke-width="14"/><line x1="300" y1="120" x2="300" y2="420" stroke="#fff" stroke-width="10"/>
    <rect x="560" y="420" width="480" height="140" rx="24" fill="#6F7F73"/><rect x="580" y="360" width="440" height="90" rx="20" fill="#7E8E82"/>
    <rect x="640" y="580" width="320" height="24" rx="8" fill="#8C6A48"/><circle cx="1080" cy="300" r="60" fill="#F3D28B"/><rect x="1072" y="300" width="16" height="260" fill="#555"/>
    <rect x="0" y="740" width="1200" height="60" fill="rgba(0,0,0,0.4)"/>${label(30, 780, 'Sophia Wong — living room, Blk 201 Tampines St 21 (sample site photo)', 26)}`)).jpeg({ quality: 80 }).toFile(path.join(OUT, 'sophia-living-room.jpg'))

  /* Kitchen mood board — swatches (a photo, not a quote: the readers must refuse it). */
  const sw = [['#F4F1EA', 'Quartz, Calacatta'], ['#8A6F55', 'Walnut laminate'], ['#2F3B45', 'Navy cabinets'], ['#C8A26B', 'Brass handles'], ['#D9D4CC', 'Grey tiles 600x600'], ['#6E8B6B', 'Sage accent']]
  let board = ''
  sw.forEach(([c, n], i) => { const x = 60 + (i % 3) * 370, y = 90 + Math.floor(i / 3) * 330; board += `<rect x="${x}" y="${y}" width="340" height="260" rx="12" fill="${c}"/>${label(x + 16, y + 290, n, 22, '#333')}` })
  await sharp(svg(1200, 800, `<rect width="1200" height="800" fill="#FAF8F4"/>${label(60, 60, 'Kitchen mood board', 32, '#222')}${board}`)).jpeg({ quality: 82 }).toFile(path.join(OUT, 'kitchen-moodboard.jpg'))
  console.log('images written to', OUT)
})()
