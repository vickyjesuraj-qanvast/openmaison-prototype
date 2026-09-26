import { downscale, hexToRgb, rgbToHex, rgbToLab, type Img } from './pixels'

/* AI Visualizer engine (REG-673, audit §5.4) — a reference photo's five colours (1.0's "Read the style" brief): k-means on a 64 px copy,
   seeded by lightness so the run is deterministic; sorted light to dark with how much of the photo each covers.

   (audit 2026-09-26, F189) A mood board is swatches on a page: the page is not a material. `dropPage` leaves out a colour that owns the
   board's border and much of its area, and reads more clusters so each swatch keeps its own. `referencePalette` is how a style
   reference is read; `pickRoles` gives each part of a room the colour whose role it is — the floor the wood, the walls the lightest
   neutral, the joinery the deepest colour — instead of ranking by lightness alone. */

export function extractPalette(img: Img, k = 5, o: { dropPage?: boolean } = {}): { hex: string; share: number }[] {
  const s = downscale(img, 64)
  const n = s.width * s.height
  const px: [number, number, number][] = []
  for (let i = 0; i < n; i++) px.push([s.data[i * 4]!, s.data[i * 4 + 1]!, s.data[i * 4 + 2]!])
  const light = (c: [number, number, number]) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]
  const sorted = [...px].sort((a, b) => light(a) - light(b))
  let centres = Array.from({ length: k }, (_, i) => [...sorted[Math.min(n - 1, Math.floor(((i + 0.5) / k) * n))]!] as [number, number, number])
  const assign = new Int32Array(n)
  for (let it = 0; it < 10; it++) {
    for (let i = 0; i < n; i++) {
      let best = 0, bd = Infinity
      for (let c = 0; c < k; c++) { const q = centres[c]!, p = px[i]!; const dd = (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2; if (dd < bd) { bd = dd; best = c } }
      assign[i] = best
    }
    const sum = Array.from({ length: k }, () => [0, 0, 0, 0])
    for (let i = 0; i < n; i++) { const t = sum[assign[i]!]!, p = px[i]!; t[0]! += p[0]; t[1]! += p[1]; t[2]! += p[2]; t[3]! += 1 }
    centres = centres.map((c, i) => { const t = sum[i]!; return t[3]! ? [t[0]! / t[3]!, t[1]! / t[3]!, t[2]! / t[3]!] as [number, number, number] : c })
  }
  const counts = new Array(k).fill(0) as number[]
  for (let i = 0; i < n; i++) counts[assign[i]!]!++
  /* the page: the cluster that owns most of the border (the outer 4 px) and much of the board */
  let page = -1
  if (o.dropPage) {
    const border = new Array(k).fill(0) as number[]
    let bn = 0
    for (let y = 0; y < s.height; y++) for (let x = 0; x < s.width; x++) { if (x > 3 && y > 3 && x < s.width - 4 && y < s.height - 4) continue; border[assign[y * s.width + x]!]!++; bn++ }
    const top = border.reduce((b, v, i) => (v > border[b]! ? i : b), 0)
    if (bn && border[top]! / bn > 0.6 && counts[top]! / n > 0.3) page = top
  }
  const kept = centres.map((c, i) => ({ hex: rgbToHex(c[0], c[1], c[2]), share: counts[i]! / n, l: light(c), i })).filter((c) => c.i !== page && c.share > 0.02)
  const total = kept.reduce((t, c) => t + c.share, 0) || 1
  return kept.sort((a, b) => b.l - a.l).map(({ hex, share }) => ({ hex, share: page >= 0 ? share / total : share }))
}

/** A style reference read as a palette — a mood board's page left out, then each swatch its own cluster: the rest of the board is
    clustered afresh, seeded by the colours furthest apart (so walnut and sage, alike in lightness, don't share one). */
export function referencePalette(img: Img, k = 6): { hex: string; share: number }[] {
  /* (verify round 1) read with room to spare — a board read at a web size (the editor keeps it at 900 px) leaves the page's own shades
     more pixels, and six clusters ran out before walnut and sage parted; clusters as alike as one colour are merged back after */
  const K = k + 3
  const first = extractPalette(img, 5, { dropPage: true })
  const s = downscale(img, 64), n = s.width * s.height
  const px: [number, number, number][] = []
  for (let i = 0; i < n; i++) px.push([s.data[i * 4]!, s.data[i * 4 + 1]!, s.data[i * 4 + 2]!])
  /* the page's colour, if the first read dropped one: the border's own colour */
  const all = extractPalette(img, 5)
  const pageHex = all.find((c) => !first.some((f) => f.hex === c.hex))?.hex ?? null
  const page = pageHex ? hexToRgb(pageHex) : null
  const d2 = (a: readonly number[], b: readonly number[]) => (a[0]! - b[0]!) ** 2 + (a[1]! - b[1]!) ** 2 + (a[2]! - b[2]!) ** 2
  const rest = page ? px.filter((p) => d2(p, page) > 14 ** 2) : px
  if (rest.length < 20) return first
  /* farthest-point seeds from the mean */
  const mean = [0, 1, 2].map((c) => rest.reduce((t, p) => t + p[c]!, 0) / rest.length) as [number, number, number]
  const centres: [number, number, number][] = [rest.reduce((b, p) => (d2(p, mean) < d2(b, mean) ? p : b), rest[0]!)]
  while (centres.length < K) { let best = rest[0]!, bd = -1; for (const p of rest) { const d = Math.min(...centres.map((c) => d2(p, c))); if (d > bd) { bd = d; best = p } } if (bd < 12 ** 2) break; centres.push([...best] as [number, number, number]) }
  const assign = new Int32Array(rest.length)
  for (let it = 0; it < 12; it++) {
    for (let i = 0; i < rest.length; i++) { let b = 0, bd = Infinity; for (let c = 0; c < centres.length; c++) { const d = d2(rest[i]!, centres[c]!); if (d < bd) { bd = d; b = c } } assign[i] = b }
    const sum = centres.map(() => [0, 0, 0, 0])
    for (let i = 0; i < rest.length; i++) { const t = sum[assign[i]!]!, p = rest[i]!; t[0]! += p[0]; t[1]! += p[1]; t[2]! += p[2]; t[3]! += 1 }
    for (let c = 0; c < centres.length; c++) { const t = sum[c]!; if (t[3]!) centres[c] = [t[0]! / t[3]!, t[1]! / t[3]!, t[2]! / t[3]!] }
  }
  const counts = centres.map(() => 0)
  for (let i = 0; i < rest.length; i++) counts[assign[i]!]!++
  /* one colour read twice (two shades of the page, a swatch's lit and shaded half) is one: merged, weighted by what each holds */
  type C = { c: [number, number, number]; n: number; lab: [number, number, number] }
  let cs: C[] = centres.map((c, i) => ({ c, n: counts[i]!, lab: rgbToLab(Math.round(c[0]), Math.round(c[1]), Math.round(c[2])) })).filter((x) => x.n > 0)
  for (let merged = true; merged;) {
    merged = false
    for (let a = 0; a < cs.length && !merged; a++) for (let b = a + 1; b < cs.length && !merged; b++) {
      const A = cs[a]!, B = cs[b]!
      if (Math.hypot(A.lab[0] - B.lab[0], A.lab[1] - B.lab[1], A.lab[2] - B.lab[2]) >= 9) continue
      const n = A.n + B.n, c = [0, 1, 2].map((j) => (A.c[j]! * A.n + B.c[j]! * B.n) / n) as [number, number, number]
      cs = [...cs.filter((x) => x !== A && x !== B), { c, n, lab: rgbToLab(Math.round(c[0]), Math.round(c[1]), Math.round(c[2])) }]
      merged = true
    }
  }
  const light = (c: [number, number, number]) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]
  return cs.map((x) => ({ hex: rgbToHex(x.c[0], x.c[1], x.c[2]), share: x.n / rest.length, l: light(x.c) })).filter((c) => c.share > 0.025).sort((a, b) => b.share - a.share).slice(0, k).sort((a, b) => b.l - a.l).map(({ hex, share }) => ({ hex, share }))
}

/** The colour a swatch photo reads as — its largest cluster (a studio's own material in a render). */
export function dominantColour(img: Img): string {
  const p = extractPalette(img, 3)
  return [...p].sort((a, b) => b.share - a.share)[0]?.hex ?? '#BFBFBF'
}

/* ── roles ── */
/** A colour's hue (°), saturation and lightness (0…1). */
export function hsl(hex: string): { h: number; s: number; l: number } {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255) as [number, number, number]
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min
  if (d < 1e-6) return { h: 0, s: 0, l }
  const s = d / (1 - Math.abs(2 * l - 1))
  const h = max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return { h: h * 60, s, l }
}
export type Role = 'walls' | 'feature' | 'floor' | 'joinery' | 'stone' | 'soft'
/**
 * Each part of a room, the colours whose role it is, best first: the floor — the colour nearest a wood (a warm brown), else the darkest
 * quiet one; the walls, the ceiling and the trim — the lightest quiet colour; a feature wall or panelling — the most saturated middle
 * tone; the joinery — the deepest saturated colour, else the darkest; worktops and splashbacks — the lightest; soft pieces — a saturated
 * middle tone the walls and floor didn't take. `variant` 2 and 3 step to each role's next candidate.
 */
export function pickRoles(palette: string[], variant = 1): Record<Role, string> {
  const cs = [...new Set(palette)].map((hex) => ({ hex, ...hsl(hex) }))
  const pick = (list: typeof cs, fallback: string) => (list[Math.min(list.length - 1, variant - 1)] ?? list[0])?.hex ?? fallback
  const fb = cs[0]?.hex ?? '#BFBFBF'
  const byLight = [...cs].sort((a, b) => b.l - a.l)
  const quiet = byLight.filter((c) => c.s < 0.22 || c.l > 0.88)
  const wood = cs.filter((c) => c.h >= 12 && c.h <= 48 && c.s >= 0.15 && c.s <= 0.7 && c.l >= 0.2 && c.l <= 0.62).sort((a, b) => Math.abs(a.l - 0.38) - Math.abs(b.l - 0.38))
  const darkQuiet = [...cs].filter((c) => c.s < 0.35).sort((a, b) => a.l - b.l)
  const walls = pick(quiet.length ? quiet : byLight, fb)
  const floor = pick(wood.length ? wood : darkQuiet.length ? darkQuiet : [...byLight].reverse(), fb)
  const sat = (c: { s: number; l: number }) => c.s * (1 - Math.abs(c.l - 0.5))
  const joinery = pick([...cs].filter((c) => c.l < 0.45 && c.hex !== floor).sort((a, b) => sat(b) + (0.45 - b.l) - (sat(a) + (0.45 - a.l))), [...byLight].reverse()[0]?.hex ?? fb)
  const feature = pick([...cs].filter((c) => c.l > 0.25 && c.l < 0.8 && c.hex !== floor).sort((a, b) => sat(b) - sat(a)), walls)
  const stone = pick(byLight, fb)
  const soft = pick([...cs].filter((c) => c.hex !== walls && c.hex !== floor && c.l > 0.2 && c.l < 0.85).sort((a, b) => sat(b) - sat(a)), feature)
  return { walls, feature, floor, joinery, stone, soft }
}

