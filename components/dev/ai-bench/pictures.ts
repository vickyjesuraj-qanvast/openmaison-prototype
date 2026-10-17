'use client'

import { resample, type Img } from '@/lib/visualizer/engine/pixels'
import type { DepthMap } from '@/lib/visualizer/spatial/depth'

/* (pending modules S41) The bench's picture plumbing in the browser: pixels to a data URL and back, a file saved, and the reading's tint. */

/** Pixels as a data URL — PNG by default (a depth map keeps its exact greys), JPEG for photos. */
export function imgUrl(img: Img, type: 'image/png' | 'image/jpeg' = 'image/png', quality = 0.92): string {
  const c = document.createElement('canvas')
  c.width = img.width; c.height = img.height
  const ctx = c.getContext('2d')
  if (!ctx) return ''
  ctx.putImageData(new ImageData(new Uint8ClampedArray(img.data), img.width, img.height), 0, 0)
  return c.toDataURL(type, quality)
}

/** Saves `url` as `name` (the browser's own download). */
export function saveAs(url: string, name: string): void {
  const a = document.createElement('a')
  a.href = url; a.download = name; a.rel = 'noopener'
  document.body.appendChild(a); a.click(); a.remove()
}

/** A token's colour as RGB (the house palette's hues are tokens; a canvas needs numbers). */
export function tokenRgb(name: string, fallback: [number, number, number]): [number, number, number] {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(v)
  if (hex) { const h = hex[1]!.length === 3 ? hex[1]!.split('').map((c) => c + c).join('') : hex[1]!; const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255] }
  const rgb = /rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i.exec(v)
  return rgb ? [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])] : fallback
}

/** What each pixel was read as, in the house's categorical hues (category-palette.module.css: c1…c4 and Other) — one per group, by the
    depth map's kind codes (0 nothing read · 1 floor · 2 ceiling · 3 worktop · 4 upright · 5 piece). */
export const READ_GROUPS = [
  { key: 'level', label: 'Floor and worktops', codes: [1, 3], slot: 'c4', token: '--om-color-tertiary-green-default', fb: [70, 158, 89] },
  { key: 'ceiling', label: 'Ceiling', codes: [2], slot: 'c3', token: '--om-color-tertiary-blue-default', fb: [78, 88, 180] },
  { key: 'upright', label: 'Walls and fitted units', codes: [4], slot: 'c2', token: '--om-primitive-tertiary-yellow-d80', fb: [193, 126, 34] },
  { key: 'piece', label: 'Pieces', codes: [5], slot: 'c1', token: '--om-color-primary-default', fb: [85, 0, 255] },
  { key: 'rest', label: 'Not read', codes: [0], slot: 'other', token: '--om-color-on-surface-disabled', fb: [160, 160, 160] },
] as const

/** The photo at the map's size, each pixel tinted by what it was read as (45 %). */
export function readingTint(photo: Img, d: DepthMap): { img: Img; shares: Record<string, number> } {
  const base = resample(photo, d.width, d.height)
  const lut = new Map<number, [number, number, number]>()
  const shares: Record<string, number> = {}
  for (const g of READ_GROUPS) { const c = tokenRgb(g.token, [...g.fb] as [number, number, number]); for (const k of g.codes) lut.set(k, c); shares[g.key] = 0 }
  const N = d.width * d.height
  for (let i = 0; i < N; i++) {
    const code = d.kinds[i]!, c = lut.get(code) ?? [128, 128, 128]
    for (let k = 0; k < 3; k++) base.data[i * 4 + k] = base.data[i * 4 + k]! * 0.55 + c[k]! * 0.45
    const g = READ_GROUPS.find((x) => (x.codes as readonly number[]).includes(code))
    if (g) shares[g.key] = (shares[g.key] ?? 0) + 1 / N
  }
  return { img: base, shares }
}
