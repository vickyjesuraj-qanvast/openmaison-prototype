/**
 * Stand-in artwork the document draws when the studio has not uploaded its own (REG-487): a round company stamp, the
 * accreditation badges a Singapore studio prints (Flo Design's strip), a "scan to pay" square. All inline SVG data URIs —
 * nothing leaves the page, nothing is fetched. Client-safe.
 */
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const uri = (svg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`

/** A round rubber stamp: the studio's name around the ring, the UEN across. */
export function stampSvg(name: string, uen: string, color = '#2D5BD1'): string {
  const ring = esc(name.toUpperCase() + ' · ')
  return uri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><defs><path id="r" d="M60,60 m-44,0 a44,44 0 1,1 88,0 a44,44 0 1,1 -88,0"/></defs><g fill="none" stroke="${color}" stroke-width="2.5" opacity=".85"><circle cx="60" cy="60" r="56"/><circle cx="60" cy="60" r="34"/></g><text font-family="Arial, sans-serif" font-size="9.5" font-weight="700" fill="${color}" letter-spacing="1.5" opacity=".85"><textPath href="#r" startOffset="0">${ring}${ring}</textPath></text><text x="60" y="57" text-anchor="middle" font-family="Arial, sans-serif" font-size="8" font-weight="700" fill="${color}" opacity=".85">${esc(uen)}</text><text x="60" y="69" text-anchor="middle" font-family="Arial, sans-serif" font-size="7" fill="${color}" opacity=".85">SINGAPORE</text></svg>`)
}

/** An accreditation badge as a small labelled tile. */
export function badgeSvg(label: string, sub = '', color = '#1A1A1A'): string {
  return uri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 40"><rect x="1" y="1" width="94" height="38" rx="5" fill="#fff" stroke="${color}" stroke-width="1.5"/><text x="48" y="${sub ? 19 : 25}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${label.length > 12 ? 8.5 : 10}" font-weight="700" fill="${color}">${esc(label)}</text>${sub ? `<text x="48" y="31" text-anchor="middle" font-family="Arial, sans-serif" font-size="7" fill="${color}">${esc(sub)}</text>` : ''}</svg>`)
}
export const DEMO_BADGES: string[] = [
  badgeSvg('CaseTrust', 'Accredited'), badgeSvg('bizSAFE', 'Level 3', '#0B6E4F'), badgeSvg('HDB', 'Licensed HB-09-1234A', '#C8102E'), badgeSvg('BCA', 'Registered', '#00529B'),
  badgeSvg('Qanvast', 'SuperTrust 2024', '#5500FF'), badgeSvg('Qanvast', 'SuperTrust 2025', '#5500FF'), badgeSvg('Qanvast', 'SuperTrust 2026', '#5500FF'),
]

/** A "scan to pay" square: a deterministic QR-like pattern (not a real code). */
export function payQrSvg(seed: string): string {
  let h = 2166136261
  for (const ch of seed) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0 }
  const cells: string[] = []
  const N = 21
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const finder = (x < 7 && y < 7) || (x >= N - 7 && y < 7) || (x < 7 && y >= N - 7)
    let on: boolean
    if (finder) { const fx = x % (N - 7) < 7 ? x % (N - 7) : x, fy = y % (N - 7) < 7 ? y % (N - 7) : y; const ex = fx === 0 || fx === 6 || fy === 0 || fy === 6; const inner = fx >= 2 && fx <= 4 && fy >= 2 && fy <= 4; on = ex || inner }
    else { h = (Math.imul(h, 1103515245) + 12345) >>> 0; on = (h >>> 16) % 3 === 0 }
    if (on) cells.push(`<rect x="${x * 4}" y="${y * 4}" width="4" height="4"/>`)
  }
  return uri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="-4 -4 92 92"><rect x="-4" y="-4" width="92" height="92" fill="#fff"/><g fill="#1A1A1A">${cells.join('')}</g></svg>`)
}
