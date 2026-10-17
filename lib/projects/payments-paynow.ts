/**
 * (Projects round 6, F-15 — 1.0's paynow-qr.ts, G-304 · I-296) A PayNow QR with the amount: the SGQR payload a Singapore banking app reads —
 * the studio's UEN or mobile number, the exact amount (not editable in the app), the invoice number as the reference and the account's name
 * — and the QR code it prints as. Pure and client-safe; no library: the encoder below is the standard QR model 2 (byte mode, error
 * correction M, versions 1–15), after Project Nayuki's reference implementation, enough for a PayNow payload (~140 characters).
 */

/* ── The PayNow payload (EMVCo merchant-presented QR, the SGQR PayNow profile) ─────────────────────────────────────────────────────── */

const tlv = (id: string, value: string) => `${id}${String(value.length).padStart(2, '0')}${value}`
/** CRC-16/CCITT-FALSE over the payload and the CRC's own id and length ("6304"), as four hex digits. */
function crc16(s: string): string {
  let crc = 0xffff
  for (let i = 0; i < s.length; i++) {
    crc ^= s.charCodeAt(i) << 8
    for (let b = 0; b < 8; b++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}
/** What a PayNow ID is: a UEN (8–10 characters ending in a letter, M-257) or a Singapore mobile number. null when it is neither. */
export function payNowProxy(id: string): { type: 'uen' | 'mobile'; value: string } | null {
  const raw = id.replace(/\s+/g, '').toUpperCase()
  if (/^(\+?65)?[89]\d{7}$/.test(raw)) return { type: 'mobile', value: `+65${raw.slice(-8)}` }
  if (/^[0-9A-Z]{8,10}$/.test(raw) && /[A-Z]$/.test(raw)) return { type: 'uen', value: raw }
  return null
}
const clean = (s: string, max: number) => s.normalize('NFKD').replace(/[^\x20-\x7E]/g, '').trim().slice(0, max)

/** The payload for one payment: amount in cents, the reference the studio matches it by (the invoice number), the account's name. */
export function payNowPayload(o: { payNow: string; amountMinor: number; reference: string; merchant: string }): string | null {
  const proxy = payNowProxy(o.payNow)
  if (!proxy || !(o.amountMinor > 0)) return null
  const account = tlv('00', 'SG.PAYNOW') + tlv('01', proxy.type === 'uen' ? '2' : '0') + tlv('02', proxy.value) + tlv('03', '0')
  const body = tlv('00', '01') + tlv('01', '12') + tlv('26', account) + tlv('52', '0000') + tlv('53', '702')
    + tlv('54', (o.amountMinor / 100).toFixed(2)) + tlv('58', 'SG') + tlv('59', clean(o.merchant, 25) || 'NA') + tlv('60', 'Singapore')
    + tlv('62', tlv('01', clean(o.reference, 25) || 'NA')) + '6304'
  return body + crc16(body)
}

/* ── The QR code (model 2, byte mode, ECC level M) ──────────────────────────────────────────────────────────────────────────────── */

const ECC_PER_BLOCK = [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24]
const ECC_BLOCKS = [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10]
const MAX_VERSION = 15

const rawModules = (ver: number) => {
  let r = (16 * ver + 128) * ver + 64
  if (ver >= 2) { const n = Math.floor(ver / 7) + 2; r -= (25 * n - 10) * n - 55; if (ver >= 7) r -= 36 }
  return r
}
const dataCodewords = (ver: number) => Math.floor(rawModules(ver) / 8) - ECC_PER_BLOCK[ver]! * ECC_BLOCKS[ver]!

function gfMul(x: number, y: number): number {
  let z = 0
  for (let i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11d); z ^= ((y >>> i) & 1) * x }
  return z & 0xff
}
function rsDivisor(degree: number): number[] {
  const r = new Array<number>(degree).fill(0); r[degree - 1] = 1
  let root = 1
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < degree; j++) { r[j] = gfMul(r[j]!, root); if (j + 1 < degree) r[j]! ^= r[j + 1]! }
    root = gfMul(root, 0x02)
  }
  return r
}
function rsRemainder(data: number[], div: number[]): number[] {
  const r = new Array<number>(div.length).fill(0)
  for (const b of data) {
    const f = b ^ r.shift()!
    r.push(0)
    div.forEach((c, i) => { r[i]! ^= gfMul(c, f) })
  }
  return r
}
function alignmentPositions(ver: number, size: number): number[] {
  if (ver === 1) return []
  const n = Math.floor(ver / 7) + 2
  const step = Math.ceil((ver * 4 + 4) / (n * 2 - 2)) * 2
  const out = [6]
  for (let pos = size - 7; out.length < n; pos -= step) out.splice(1, 0, pos)
  return out
}

/** The QR code's modules (true = dark), row by row — or null when the text is too long for version 15. */
export function qrMatrix(text: string): boolean[][] | null {
  const bytes = Array.from(new TextEncoder().encode(text))
  let ver = 1
  for (; ver <= MAX_VERSION; ver++) {
    const bits = 4 + (ver < 10 ? 8 : 16) + bytes.length * 8
    if (bits <= dataCodewords(ver) * 8) break
  }
  if (ver > MAX_VERSION) return null
  /* the data bits: mode, count, bytes, terminator, padding */
  const bb: number[] = []
  const put = (val: number, len: number) => { for (let i = len - 1; i >= 0; i--) bb.push((val >>> i) & 1) }
  put(0b0100, 4); put(bytes.length, ver < 10 ? 8 : 16); bytes.forEach((b) => put(b, 8))
  const cap = dataCodewords(ver) * 8
  put(0, Math.min(4, cap - bb.length)); put(0, (8 - (bb.length % 8)) % 8)
  for (let pad = 0xec; bb.length < cap; pad ^= 0xec ^ 0x11) put(pad, 8)
  const data: number[] = []
  for (let i = 0; i < bb.length; i += 8) data.push(bb.slice(i, i + 8).reduce((a, b) => (a << 1) | b, 0))
  /* error correction, split into blocks and interleaved */
  const blocks = ECC_BLOCKS[ver]!, eccLen = ECC_PER_BLOCK[ver]!
  const raw = Math.floor(rawModules(ver) / 8)
  const shortBlocks = blocks - (raw % blocks), shortLen = Math.floor(raw / blocks)
  const div = rsDivisor(eccLen)
  const parts: number[][] = []
  for (let i = 0, k = 0; i < blocks; i++) {
    const dat = data.slice(k, k + shortLen - eccLen + (i < shortBlocks ? 0 : 1)); k += dat.length
    const ecc = rsRemainder(dat, div)
    if (i < shortBlocks) dat.push(0)
    parts.push(dat.concat(ecc))
  }
  const words: number[] = []
  for (let i = 0; i < parts[0]!.length; i++) parts.forEach((p, j) => { if (i !== shortLen - eccLen || j >= shortBlocks) words.push(p[i]!) })

  /* the function patterns */
  const size = ver * 4 + 17
  const m: boolean[][] = Array.from({ length: size }, () => new Array<boolean>(size).fill(false))
  const fn: boolean[][] = Array.from({ length: size }, () => new Array<boolean>(size).fill(false))
  const set = (x: number, y: number, dark: boolean) => { m[y]![x] = dark; fn[y]![x] = true }
  for (let i = 0; i < size; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0) }
  const finder = (cx: number, cy: number) => {
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
      const x = cx + dx, y = cy + dy
      if (x >= 0 && x < size && y >= 0 && y < size) { const d = Math.max(Math.abs(dx), Math.abs(dy)); set(x, y, d !== 2 && d !== 4) }
    }
  }
  finder(3, 3); finder(size - 4, 3); finder(3, size - 4)
  const al = alignmentPositions(ver, size)
  al.forEach((ay, i) => al.forEach((ax, j) => {
    if ((i === 0 && j === 0) || (i === 0 && j === al.length - 1) || (i === al.length - 1 && j === 0)) return
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(ax + dx, ay + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1)
  }))
  const formatBits = (mask: number) => {
    const d = (0 << 3) | mask   // ECC level M = 00
    let rem = d
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537)
    const bits = ((d << 10) | rem) ^ 0x5412
    const bit = (i: number) => ((bits >>> i) & 1) !== 0
    for (let i = 0; i <= 5; i++) set(8, i, bit(i))
    set(8, 7, bit(6)); set(8, 8, bit(7)); set(7, 8, bit(8))
    for (let i = 9; i < 15; i++) set(14 - i, 8, bit(i))
    for (let i = 0; i < 8; i++) set(size - 1 - i, 8, bit(i))
    for (let i = 8; i < 15; i++) set(8, size - 15 + i, bit(i))
    set(8, size - 8, true)
  }
  formatBits(0)   // reserves the format areas; the real bits follow the mask
  if (ver >= 7) {
    let rem = ver
    for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25)
    const bits = (ver << 12) | rem
    for (let i = 0; i < 18; i++) { const dark = ((bits >>> i) & 1) !== 0; const a = size - 11 + (i % 3), b = Math.floor(i / 3); set(a, b, dark); set(b, a, dark) }
  }
  /* the codewords, in the zigzag */
  let bi = 0
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j
        const up = ((right + 1) & 2) === 0
        const y = up ? size - 1 - vert : vert
        if (!fn[y]![x] && bi < words.length * 8) { m[y]![x] = ((words[bi >>> 3]! >>> (7 - (bi & 7))) & 1) !== 0; bi++ }
      }
    }
  }
  /* the mask with the lowest penalty */
  const masked = (mask: number) => m.map((row, y) => row.map((v, x) => {
    if (fn[y]![x]) return v
    const flip = mask === 0 ? (x + y) % 2 === 0 : mask === 1 ? y % 2 === 0 : mask === 2 ? x % 3 === 0 : mask === 3 ? (x + y) % 3 === 0
      : mask === 4 ? (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0 : mask === 5 ? ((x * y) % 2) + ((x * y) % 3) === 0
        : mask === 6 ? (((x * y) % 2) + ((x * y) % 3)) % 2 === 0 : (((x + y) % 2) + ((x * y) % 3)) % 2 === 0
    return flip ? !v : v
  }))
  let best: boolean[][] | null = null, bestScore = Infinity
  for (let mask = 0; mask < 8; mask++) {
    formatBits(mask)
    const g = masked(mask)
    const s = penalty(g)
    if (s < bestScore) { bestScore = s; best = g }
  }
  return best
}

/** The standard's four penalty rules (runs, 2×2 blocks, finder-like patterns, dark balance) — picks the most readable mask. */
function penalty(g: boolean[][]): number {
  const n = g.length
  let score = 0, dark = 0
  const lines: boolean[][] = [...g, ...g.map((_, x) => g.map((row) => row[x]!))]
  for (const line of lines) {
    let run = 1
    for (let i = 1; i <= n; i++) {
      if (i < n && line[i] === line[i - 1]) { run++; continue }
      if (run >= 5) score += 3 + (run - 5)
      run = 1
    }
    const s = line.map((v) => (v ? '1' : '0')).join('')
    for (const p of ['10111010000', '00001011101']) { let at = s.indexOf(p); while (at !== -1) { score += 40; at = s.indexOf(p, at + 1) } }
  }
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    if (g[y]![x]) dark++
    if (y < n - 1 && x < n - 1) { const c = g[y]![x]; if (g[y]![x + 1] === c && g[y + 1]![x] === c && g[y + 1]![x + 1] === c) score += 3 }
  }
  const total = n * n
  score += (Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1) * 10
  return score
}

/** The matrix as one SVG path (a 4-module quiet zone around it): "M4,4h1v1h-1z…" — the caller draws it at any size. */
export function qrPath(mx: boolean[][], quiet = 4): string {
  let d = ''
  mx.forEach((row, y) => row.forEach((v, x) => { if (v) d += `M${x + quiet},${y + quiet}h1v1h-1z` }))
  return d
}
