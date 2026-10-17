import type { Pt } from '../engine/pixels'

/* The sample rooms' shared pieces (lib/visualizer/samples.ts): where a room's pictures live, an ellipse as an outline, the five styles each
   room's looks are made in. */

export const base = (key: string) => `/visualizer/samples/${key}`
/** An ellipse as an outline (a ceiling's downlight ring, a bowl's rim): centre, radii, tilt (radians) — 0…1. */
export const oval = (cx: number, cy: number, rx: number, ry: number, tilt = 0, n = 16): Pt[] => Array.from({ length: n }, (_, k) => { const a = (k / n) * 2 * Math.PI, x = rx * Math.cos(a), y = ry * Math.sin(a); return { x: cx + x * Math.cos(tilt) - y * Math.sin(tilt), y: cy + x * Math.sin(tilt) + y * Math.cos(tilt) } })
/** The styles every sample room has a made-ahead look in (scripts/viz/sample-looks.mts) — a Style card's picture. */
export const LOOK_STYLES = ['Scandinavian', 'Industrial', 'Japandi', 'Bohemian', 'Dubai Luxury'] as const
export const looks = (key: string): Record<string, string> => Object.fromEntries(LOOK_STYLES.map((s) => [s, `${base(key)}/${s.toLowerCase().replace(/\s+/g, '-')}.jpg`]))
/** A box as an outline (x0, y0, x1, y1 — 0…1). */
export const rect = (x0: number, y0: number, x1: number, y1: number): Pt[] => [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }]
/** Points written as [x, y] pairs, read as outline points. */
export const pts = (...xy: number[]): Pt[] => { const o: Pt[] = []; for (let i = 0; i + 1 < xy.length; i += 2) o.push({ x: xy[i]!, y: xy[i + 1]! }); return o }
