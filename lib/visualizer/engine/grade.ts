import type { FixtureKey, LightFixture, RelightKnobs } from '../lighting'
import { linToSrgb8, rgbToLab, SRGB_TO_LIN, type Img, type Pt } from './pixels'
import { polygonMask } from './segment'

/* AI Visualizer engine (REG-673, audit §5.1) — lighting as a grade of the photo's own pixels, from 1.0's live-tweak maths
   (relight-controls.tsx, B-99): brightness from intensity, contrast from deep shadows, a lift for soft shadows, the colour temperature,
   the low sun's raking warm-to-dusk gradient, and the fixtures. Measured against 1.0's neutral (45° · 4300 K · 50 · 50), so a neutral
   lighting changes nothing.

   (audit 2026-09-26, F188) Worked in linear light, the way light adds up: the exposure scales the photo and a filmic shoulder (Reinhard
   with the white point at the gain) rolls its highlights off, so a brighter room never burns to white. The colour temperature is a white
   balance (a blackbody's colour against 4300 K), not a tint. Dusk and night take the room down to lamp-light — ×0.45 and ×0.35 — and the
   windows go to the sky's own dark blue instead of staying daylit. A fixture switched on lights the room where it hangs (the room's own
   fixtures, `scene`): a downlight pools light below it, a pendant under its shade, a lamp around itself — and its shade glows. A photo
   nobody traced falls back to the old places. */

/** (round 2) `occluders` — the pieces standing in front of the windows (a sofa's arm): after dark they keep their own tone. `sill` — the
    small things on a sill (a pot of basil, pampas in a vase), traced loosely: inside them only what doesn't look like the glass around
    keeps its tone, so the sky shows between the stems. */
export type LightScene = { windows?: Pt[][]; occluders?: Pt[][]; sill?: Pt[][]; fixtures?: LightFixture[] }

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
/** A blackbody's colour as linear RGB (Tanner Helland's fit), luminance 1. */
function kelvin(T: number): [number, number, number] {
  const t = T / 100
  const r = t <= 66 ? 255 : 329.698727446 * (t - 60) ** -0.1332047592
  const g = t <= 66 ? 99.4708025861 * Math.log(t) - 161.1195681661 : 288.1221695283 * (t - 60) ** -0.0755148492
  const b = t >= 66 ? 255 : t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307
  const lin = [r, g, b].map((v) => SRGB_TO_LIN[Math.round(clamp(v, 0, 255))]!) as [number, number, number]
  const Y = 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2]
  return lin.map((v) => v / Y) as [number, number, number]
}
const REF = kelvin(4300)
/** White balance toward `temp` from 1.0's neutral 4300 K — about 40 % of the way a camera would see it, luminance kept. */
function whiteBalance(temp: number): [number, number, number] {
  const t = kelvin(temp)
  const g = t.map((v, i) => (v / REF[i]!) ** 0.42) as [number, number, number]
  const Y = 0.2126 * g[0] + 0.7152 * g[1] + 0.0722 * g[2]
  return g.map((v) => v / Y) as [number, number, number]
}
const LAMP = kelvin(2700), SPOT = kelvin(3300)

/** One light over the photo (0…1): where its pool of light centres and how wide and tall it spreads (shares of the photo's width and
    height) — the pool scales the room's light where it falls; the fitting's own glow (`gr`, a share of the width) is added. */
type Light = { x: number; y: number; sx: number; sy: number; pool: number; gx: number; gy: number; gr: number; glow: number; spot?: boolean
  /** A downlight or a pendant throws its light down: above this row (0…1) the pool falls away fast. */
  top?: number | null }
function lightsFor(fx: RelightKnobs['fixtures'], scene: LightScene | undefined): Light[] {
  const on = (k: FixtureKey) => fx[k] === 'on'
  const out: Light[] = []
  const add = (f: LightFixture) => {
    if (f.kind === 'downlights') out.push({ x: f.x, y: f.y + 0.3, sx: 0.045, sy: 0.3, pool: 0.95, gx: f.x, gy: f.y, gr: 0.01, glow: 1, top: f.y + 0.01, spot: true })
    else if (f.kind === 'pendants') out.push({ x: f.x, y: f.y + 0.18, sx: 0.075, sy: 0.2, pool: 1.2, gx: f.x, gy: f.y, gr: 0.014, glow: 0.9, top: f.y })
    else if (f.kind === 'accent') out.push({ x: f.x, y: f.y + 0.04, sx: 0.1, sy: 0.14, pool: 1.5, gx: f.x, gy: f.y, gr: 0.018, glow: 0.8, top: null })
    else out.push({ x: f.x, y: f.y + 0.06, sx: 0.2, sy: 0.12, pool: 0.5, gx: f.x, gy: f.y, gr: 0, glow: 0, top: null })
  }
  if (scene?.fixtures) { for (const f of scene.fixtures) if (on(f.kind)) add(f) }
  /* a photo nobody traced: 1.0's rule of thumb, softer */
  if (!scene) {
    if (on('cove')) for (let i = 0; i < 5; i++) out.push({ x: 0.1 + i * 0.2, y: 0.05, sx: 0.14, sy: 0.12, pool: 0.35, gx: 0, gy: 0, gr: 0, glow: 0 })
    if (on('pendants')) for (const x of [0.36, 0.5, 0.64]) out.push({ x, y: 0.42, sx: 0.1, sy: 0.2, pool: 0.45, gx: 0, gy: 0, gr: 0, glow: 0 })
    if (on('downlights')) for (const x of [0.2, 0.45, 0.7, 0.9]) out.push({ x, y: 0.4, sx: 0.07, sy: 0.28, pool: 0.4, gx: 0, gy: 0, gr: 0, glow: 0 })
    if (on('accent')) out.push({ x: 0.08, y: 0.62, sx: 0.18, sy: 0.25, pool: 0.4, gx: 0, gy: 0, gr: 0, glow: 0 }, { x: 0.92, y: 0.58, sx: 0.16, sy: 0.25, pool: 0.35, gx: 0, gy: 0, gr: 0, glow: 0 })
  }
  return out
}

export function grade(img: Img, k: RelightKnobs, amount = 1, scene?: LightScene): void {
  const W = img.width, H = img.height, d = img.data
  const intensity = 50 + (k.intensity - 50) * amount, shadows = 50 + (k.shadows - 50) * amount, temp = 4300 + (k.colorTemp - 4300) * amount
  const anyOn = Object.values(k.fixtures).some((t) => t === 'on')
  /* the time of day: night (sun 0°), dusk (a low sun in cool light), an evening interior (low light with the fixtures on) */
  const night = k.sunAngle <= 0, dusk = !night && k.sunAngle <= 10 && k.colorTemp > 5000
  const evening = !night && !dusk && k.sunAngle < 25 && k.intensity < 35 && anyOn
  const dark = night ? 0.24 : dusk ? 0.4 : evening ? 0.42 : 1
  const expo = 2 ** (((intensity - 50) / 50) * 0.8) * (1 + (dark - 1) * amount)
  /* after dark the lamps carry the warmth; the room's own light stays nearer neutral */
  const wb = whiteBalance(night && temp < 4300 ? 4300 + (temp - 4300) * 0.4 : temp)
  /* a warm sun warms what it lights; the shadows, lit by the sky, keep less of it (split toning — not a yellow filter) */
  const split = !night && temp < 4300
  /* the sun: low and above the horizon rakes warm light across the room and darkens the far side; at dusk the dark side alone */
  const low = night ? 0 : clamp((40 - k.sunAngle) / 30, 0, 1)
  const sun = low * 0.5 * amount
  const rakeWarm = temp < 4300 ? 1 : temp < 5200 ? 0.4 : 0
  const a = (72 * Math.PI) / 180, dx = Math.sin(a), dy = -Math.cos(a), len = Math.abs(W * dx) + Math.abs(H * dy)
  /* deep shadows darken the darks (the highlights hold); soft shadows lift them */
  const deep = shadows > 50 ? ((shadows - 50) / 50) * 0.45 : 0
  const lift = shadows < 50 ? ((50 - shadows) / 50) * 0.5 : 0
  const contrast = intensity < 40 ? 0.06 * amount : 0
  /* the windows go to the sky after dark */
  const skyAmt = (night || dusk ? 1 : evening ? 0.75 : 0) * amount
  const win = skyAmt > 0 && scene?.windows?.length ? windowMask(img, scene) : null
  const sky: [number, number, number] = night ? [0.0035, 0.006, 0.016] : evening ? [0.008, 0.014, 0.035] : [0.018, 0.034, 0.085]
  const lights = lightsFor(k.fixtures, scene).map((l) => ({ ...l, pool: l.pool * amount, glow: l.glow * amount, cx: l.x * W, cy: l.y * H, sxp: l.sx * W, syp: l.sy * H, gxp: l.gx * W, gyp: l.gy * H, grp: Math.max(1, l.gr * W), topp: l.top == null ? null : l.top * H }))
  const g = [0, 0, 0], o = [0, 0, 0]
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const p = (y * W + x) * 4, i = y * W + x
    const r0 = SRGB_TO_LIN[d[p]!]!, g0 = SRGB_TO_LIN[d[p + 1]!]!, b0 = SRGB_TO_LIN[d[p + 2]!]!
    if (split) {
      const Y0 = 0.2126 * r0 + 0.7152 * g0 + 0.0722 * b0, t = Math.min(1, Math.max(0, (Y0 - 0.03) / 0.5)), w = 0.35 + 0.65 * t * t * (3 - 2 * t)
      g[0] = expo * (1 + (wb[0] - 1) * w); g[1] = expo * (1 + (wb[1] - 1) * w); g[2] = expo * (1 + (wb[2] - 1) * w)
    } else { g[0] = expo * wb[0]; g[1] = expo * wb[1]; g[2] = expo * wb[2] }
    if (sun > 0.001) {
      const t = ((x - W / 2) * dx + (y - H / 2) * dy) / len + 0.5
      if (t < 0.45 && rakeWarm) { const s = sun * rakeWarm * (1 - t / 0.45); g[0] *= 1 + s * 0.55; g[1] *= 1 + s * 0.22; g[2] *= 1 - s * 0.25 }
      if (t > 0.55) { const s = sun * 0.8 * ((t - 0.55) / 0.45); g[0] *= 1 - s * 0.6; g[1] *= 1 - s * 0.6; g[2] *= 1 - s * 0.5 }
    }
    /* the fixtures' light, where it falls: more light on what's there (a pool on the floor, a scallop on the wall) */
    let glow = 0
    for (const l of lights) {
      const ex = (x - l.cx) / l.sxp, ey = (y - l.cy) / l.syp
      const q = ex * ex + ey * ey + (l.topp !== null && y < l.topp ? ((l.topp - y) / (0.03 * H)) ** 2 : 0)
      if (q < 9) { const s = l.pool * Math.exp(-q), c = l.spot ? SPOT : LAMP; g[0] += s * c[0]; g[1] += s * c[1]; g[2] += s * c[2] }
      if (l.glow > 0) { const rr = Math.hypot(x - l.gxp, y - l.gyp) / l.grp; if (rr < 3) glow += l.glow * Math.exp(-rr * rr) }
    }
    o[0] = r0 * g[0]; o[1] = g0 * g[1]; o[2] = b0 * g[2]
    /* a filmic shoulder where the light rose: white stays white, nothing clips (Reinhard, white point at the gain) */
    const G = 0.2126 * g[0] + 0.7152 * g[1] + 0.0722 * g[2]
    if (G > 1) {
      const Y = 0.2126 * r0 + 0.7152 * g0 + 0.0722 * b0
      if (Y > 1e-5) { const Yg = Y * G, Yt = (Yg * (1 + Y / G)) / (1 + Yg), s = Yt / Yg; o[0] *= s; o[1] *= s; o[2] *= s }
    }
    if (win && win[i]! > 0.002) { const m = win[i]! * skyAmt, v = 1 - (y / H) * 0.35; for (let c = 0; c < 3; c++) o[c] = o[c]! + (sky[c]! * v + (c === 0 ? r0 : c === 1 ? g0 : b0) * 0.05 - o[c]!) * m }
    if (glow > 0) { o[0] += glow * LAMP[0] * 0.6; o[1] += glow * LAMP[1] * 0.6; o[2] += glow * LAMP[2] * 0.6 }
    for (let c = 0; c < 3; c++) {
      let v = linToSrgb8(o[c]!) / 255
      if (contrast) v = 0.5 + (v - 0.5) * (1 + contrast)
      if (deep) v *= 1 - deep * (1 - v) * (1 - v)
      if (lift) v += (1 - (1 - v) * 0.49 - v) * lift
      d[p + c] = Math.round(clamp(v, 0, 1) * 255)
    }
  }
}

/** (round 2) Where the sky shows after dark: the glass inside the traced windows, never what stands in front of it (the reading's pieces
    and the sill's pots, `occluders`) — and only as much as the pane is lit by day, so the frames and the mullions keep their own dark and
    a shadowed corner of the garden doesn't turn into a blue box. The edge is feathered: no hard line across a curtain or a sill. */
function windowMask(img: Img, scene: LightScene): Float32Array {
  const W = img.width, H = img.height, d = img.data, n = W * H
  const win = new Float32Array(n)
  for (const poly of scene.windows ?? []) { const m = polygonMask(W, H, poly); for (let i = 0; i < n; i++) if (m[i]! > win[i]!) win[i] = m[i]! }
  for (const poly of scene.occluders ?? []) { const m = polygonMask(W, H, poly); for (let i = 0; i < n; i++) if (m[i]! > 0) win[i] = win[i]! * (1 - m[i]!) }
  for (let i = 0; i < n; i++) {
    if (win[i]! <= 0) continue
    const p = i * 4, Y = 0.2126 * SRGB_TO_LIN[d[p]!]! + 0.7152 * SRGB_TO_LIN[d[p + 1]!]! + 0.0722 * SRGB_TO_LIN[d[p + 2]!]!
    const t = Math.min(1, Math.max(0, (Y - 0.035) / 0.16))
    win[i] = win[i]! * t * t * (3 - 2 * t)
  }
  if (scene.sill?.length) {
    const occ = new Float32Array(n)
    for (const poly of scene.sill) { const m = polygonMask(W, H, poly); for (let i = 0; i < n; i++) if (m[i]! > occ[i]!) occ[i] = m[i]! }
    /* the glass behind, guessed from the glass around (a blur over the pane only) — a stem stands out from it, a gap between stems doesn't */
    const r = Math.max(3, Math.round(W * 0.014)), wt = new Float32Array(n), ch = [new Float32Array(n), new Float32Array(n), new Float32Array(n)]
    for (let i = 0; i < n; i++) { const w = win[i]! * (1 - occ[i]!); if (w <= 0) continue; wt[i] = w; for (let c = 0; c < 3; c++) ch[c]![i] = d[i * 4 + c]! * w }
    const bw = soften(wt, W, H, r), bc = ch.map((a) => soften(a, W, H, r))
    for (let i = 0; i < n; i++) {
      if (occ[i]! <= 0 || win[i]! <= 0) continue
      /* told apart by colour more than by lightness — the glass behind has its own lights and darks (a lit wall across the street) */
      let diff = 99
      if (bw[i]! > 1e-3) {
        const a = rgbToLab(d[i * 4]!, d[i * 4 + 1]!, d[i * 4 + 2]!), k = (c: number) => Math.min(255, Math.max(0, Math.round(bc[c]![i]! / bw[i]!))), b = rgbToLab(k(0), k(1), k(2))
        diff = Math.hypot((a[0] - b[0]) * 0.3, a[1] - b[1], a[2] - b[2])
      }
      const t = Math.min(1, Math.max(0, (diff - 5) / 9)), obj = t * t * (3 - 2 * t)
      win[i] = win[i]! * (1 - occ[i]! * obj)
    }
  }
  return soften(win, W, H, Math.max(1, Math.round(W * 0.0025)))
}
/** A separable box blur, twice — a soft edge a few pixels wide. */
function soften(m: Float32Array, W: number, H: number, r: number): Float32Array {
  let cur = m
  for (let pass = 0; pass < 2; pass++) {
    const tmp = new Float32Array(cur.length), out = new Float32Array(cur.length), span = 2 * r + 1
    for (let y = 0; y < H; y++) { let acc = 0; for (let x = -r; x <= r; x++) acc += cur[y * W + Math.min(W - 1, Math.max(0, x))]!; for (let x = 0; x < W; x++) { tmp[y * W + x] = acc / span; acc += cur[y * W + Math.min(W - 1, x + r + 1)]! - cur[y * W + Math.max(0, x - r)]! } }
    for (let x = 0; x < W; x++) { let acc = 0; for (let y = -r; y <= r; y++) acc += tmp[Math.min(H - 1, Math.max(0, y)) * W + x]!; for (let y = 0; y < H; y++) { out[y * W + x] = acc / span; acc += tmp[Math.min(H - 1, y + r + 1) * W + x]! - tmp[Math.max(0, y - r) * W + x]! } }
    cur = out
  }
  return cur
}

/** A style's light: warm styles take a little amber, cool ones a little blue (the restyle stand-in for styles without a finished render). */
export function styleLight(temperature: 'warm' | 'cool' | 'neutral'): RelightKnobs {
  const base: RelightKnobs = { sunAngle: 45, colorTemp: 4300, intensity: 52, shadows: 50, fixtures: { cove: 'unset', pendants: 'unset', downlights: 'unset', accent: 'unset' } }
  return temperature === 'warm' ? { ...base, colorTemp: 3500 } : temperature === 'cool' ? { ...base, colorTemp: 5600, intensity: 55 } : base
}
