/* AI Visualizer engine (REG-673, audit §5) — pixel buffers and colour maths. Pure: runs in the browser (canvas ImageData) and in Node
   (sharp's raw RGBA) alike, so the engine can be checked against the real photos outside the app. */

export type Img = { width: number; height: number; data: Uint8ClampedArray }
export type Pt = { x: number; y: number }
export type Box = [number, number, number, number]   // x0, y0, x1, y1 — 0…1

export const makeImg = (width: number, height: number): Img => ({ width, height, data: new Uint8ClampedArray(width * height * 4) })
export const cloneImg = (a: Img): Img => ({ width: a.width, height: a.height, data: new Uint8ClampedArray(a.data) })

/** sRGB ↔ linear, as lookup tables for 0…255. */
export const SRGB_TO_LIN = (() => { const t = new Float32Array(256); for (let i = 0; i < 256; i++) { const c = i / 255; t[i] = c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 } return t })()
export function linToSrgb8(v: number): number {
  const c = v <= 0 ? 0 : v >= 1 ? 1 : v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055
  return Math.round(c * 255)
}
export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '').trim()
  const f = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.padEnd(6, '0').slice(0, 6)
  const n = parseInt(f, 16)
  return Number.isFinite(n) ? [(n >> 16) & 255, (n >> 8) & 255, n & 255] : [128, 128, 128]
}
export const rgbToHex = (r: number, g: number, b: number) => `#${[r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('').toUpperCase()}`

/** Relative luminance of a linear RGB triple. */
export const lum = (r: number, g: number, b: number) => 0.2126 * r + 0.7152 * g + 0.0722 * b

/** sRGB 8-bit → CIE Lab (D65). */
export function rgbToLab(r8: number, g8: number, b8: number): [number, number, number] {
  const r = SRGB_TO_LIN[r8]!, g = SRGB_TO_LIN[g8]!, b = SRGB_TO_LIN[b8]!
  const x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047, y = 0.2126 * r + 0.7152 * g + 0.0722 * b, z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116)
  const fx = f(x), fy = f(y), fz = f(z)
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)]
}

/** CIE Lab (D65) → sRGB 8-bit, clamped — the way back for a recolour worked out in Lab. */
export function labToRgb(L: number, a: number, b: number): [number, number, number] {
  const fy = (L + 16) / 116, fx = fy + a / 500, fz = fy - b / 200
  const inv = (t: number) => (t ** 3 > 0.008856 ? t ** 3 : (t - 16 / 116) / 7.787)
  const x = inv(fx) * 0.95047, y = inv(fy), z = inv(fz) * 1.08883
  const r = 3.2406 * x - 1.5372 * y - 0.4986 * z, g = -0.9689 * x + 1.8758 * y + 0.0415 * z, bl = 0.0557 * x - 0.204 * y + 1.057 * z
  return [linToSrgb8(r), linToSrgb8(g), linToSrgb8(bl)]
}
/** Lightness L* of an sRGB 8-bit triple (the cheap half of rgbToLab). */
export function labL(r8: number, g8: number, b8: number): number {
  const y = 0.2126 * SRGB_TO_LIN[r8]! + 0.7152 * SRGB_TO_LIN[g8]! + 0.0722 * SRGB_TO_LIN[b8]!
  return y > 0.008856 ? 116 * Math.cbrt(y) - 16 : 903.3 * y
}

/** A copy scaled so its long side is `long` (area-averaged when shrinking). */
export function downscale(src: Img, long: number): Img {
  const s = Math.min(1, long / Math.max(src.width, src.height))
  if (s >= 1) return cloneImg(src)
  const w = Math.max(1, Math.round(src.width * s)), h = Math.max(1, Math.round(src.height * s))
  const out = makeImg(w, h)
  const fx = src.width / w, fy = src.height / h
  for (let y = 0; y < h; y++) {
    const y0 = Math.floor(y * fy), y1 = Math.max(y0 + 1, Math.floor((y + 1) * fy))
    for (let x = 0; x < w; x++) {
      const x0 = Math.floor(x * fx), x1 = Math.max(x0 + 1, Math.floor((x + 1) * fx))
      let r = 0, g = 0, b = 0, n = 0
      for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) { const i = (yy * src.width + xx) * 4; r += src.data[i]!; g += src.data[i + 1]!; b += src.data[i + 2]!; n++ }
      const o = (y * w + x) * 4
      out.data[o] = r / n; out.data[o + 1] = g / n; out.data[o + 2] = b / n; out.data[o + 3] = 255
    }
  }
  return out
}

/** `src` resampled to exactly w × h (bilinear) — an empty plate or a finished render laid over a photo of another size. */
export function resample(src: Img, w: number, h: number): Img {
  if (src.width === w && src.height === h) return cloneImg(src)
  const out = makeImg(w, h)
  for (let y = 0; y < h; y++) {
    const sy = Math.min(src.height - 1, Math.max(0, ((y + 0.5) * src.height) / h - 0.5)), y0 = Math.floor(sy), y1 = Math.min(src.height - 1, y0 + 1), ty = sy - y0
    for (let x = 0; x < w; x++) {
      const sx = Math.min(src.width - 1, Math.max(0, ((x + 0.5) * src.width) / w - 0.5)), x0 = Math.floor(sx), x1 = Math.min(src.width - 1, x0 + 1), tx = sx - x0
      const o = (y * w + x) * 4
      for (let c = 0; c < 3; c++) {
        const a = src.data[(y0 * src.width + x0) * 4 + c]!, b = src.data[(y0 * src.width + x1) * 4 + c]!, d = src.data[(y1 * src.width + x0) * 4 + c]!, e = src.data[(y1 * src.width + x1) * 4 + c]!
        out.data[o + c] = (a * (1 - tx) + b * tx) * (1 - ty) + (d * (1 - tx) + e * tx) * ty
      }
      out.data[o + 3] = 255
    }
  }
  return out
}

/** A deterministic 0…1 noise for grain (no Math.random: the same pass renders the same pixels every time). */
export const hash2 = (x: number, y: number) => { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967295 }
