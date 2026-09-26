import { hexToRgb, makeImg, type Img } from './engine/pixels'

/* AI Visualizer (REG-680; the testers' sheet row 195: "Wallpapers should have patterns — solid colours don't make sense") — every
   wallpaper in the catalogue wears its motif: on its chip (a CSS background, so the picker stays light) and on the wall (a tile the engine
   lays across the surface under the photo's light). A studio's own wallpaper with a photo tiles its photo instead. Pure and client-safe.

   (audit 2026-09-26, F047 · F187) Floors, tiles, stone and wood wear their structure too: planks with their joints and grain, herringbone
   and chevron, subway / square / hex / fish-scale / penny / basketweave / mosaic tiles with their grout, marble veins, terrazzo chips,
   granite speckle, slate, travertine. A `motif` is laid as it is (a herringbone is always a herringbone); a `surface` pattern is the
   material's own grain — the engine keeps the photo's texture where the photo already shows that kind of material and lays the grain
   where it doesn't (oak → walnut keeps the boards; tile → walnut lays planks). `size` is the real size of one tile, in metres, so a
   pattern keeps its scale across walls and floors. Every tile is seamless: its noise wraps at the tile's edges. */

export type PatternKind = 'stripe' | 'geometric' | 'wave' | 'floral' | 'botanical' | 'deco' | 'brick' | 'grasscloth' | 'linen' | 'concrete' | 'cork'
  | 'plank' | 'woodgrain' | 'herringbone' | 'chevron' | 'subway' | 'grid' | 'hex' | 'fishscale' | 'penny' | 'basketweave' | 'mosaic' | 'zellige'
  | 'marble' | 'terrazzo' | 'granite' | 'slate' | 'travertine' | 'cement' | 'woodlook'
export type Pattern = { kind: PatternKind; accent: string | null
  /** (F187) 'motif' — laid as it is (a wallpaper's print, a herringbone, a subway bond); 'surface' — the material's own grain, laid firmly
      only where the photo shows another kind of material. Missing = motif (every stored wallpaper). */
  role?: 'motif' | 'surface'
  /** (F191) One tile's real size in metres — its scale on a wall or a floor. Missing = the kind's own size. */
  size?: number }

/** The catalogue's twelve wallpapers, by id: the motif and its second colour (null = a texture of the one colour). */
export const WALLPAPER_PATTERNS: Record<string, Pattern> = {
  'wp-001': { kind: 'grasscloth', accent: null },
  'wp-002': { kind: 'linen', accent: null },
  'wp-003': { kind: 'botanical', accent: '#6E9A5B' },
  'wp-004': { kind: 'deco', accent: '#1E1E1E' },
  'wp-005': { kind: 'concrete', accent: null },
  'wp-006': { kind: 'stripe', accent: '#F2EFE8' },
  'wp-007': { kind: 'floral', accent: '#F1E7DC' },
  'wp-008': { kind: 'brick', accent: '#CFC8BE' },
  'wp-009': { kind: 'cork', accent: null },
  'wp-010': { kind: 'geometric', accent: '#C9C9C9' },
  'wp-011': { kind: 'linen', accent: null },
  'wp-012': { kind: 'wave', accent: '#EDE8DC' },
}

/** (F047 · F187) The floors, tiles, stone and wood-grain laminates whose look is a laid pattern, by catalogue id. Grout and veins go in
    `accent`; null = worked out from the swatch (a light tile takes a darker grout, a dark one a lighter). */
export const TILE_PATTERNS: Record<string, Pattern> = {
  'floor-002': { kind: 'herringbone', accent: null, role: 'motif', size: 0.3 },
  'floor-013': { kind: 'chevron', accent: null, role: 'motif', size: 1 },
  'floor-015': { kind: 'cement', accent: '#E6E1D6', role: 'motif', size: 0.4 },
  'tile-001': { kind: 'subway', accent: null, role: 'motif', size: 0.3 },
  'tile-003': { kind: 'hex', accent: '#9C968E', role: 'motif', size: 0.12 },
  'tile-004': { kind: 'fishscale', accent: null, role: 'motif', size: 0.16 },
  'tile-005': { kind: 'penny', accent: '#D6D3CC', role: 'motif', size: 0.1 },
  'tile-006': { kind: 'subway', accent: null, role: 'motif', size: 0.3 },
  'tile-008': { kind: 'cement', accent: '#EDE7DA', role: 'motif', size: 0.4 },
  'tile-009': { kind: 'herringbone', accent: null, role: 'motif', size: 0.2 },
  'tile-012': { kind: 'subway', accent: '#8E8E8E', role: 'motif', size: 0.3 },
  'tile-013': { kind: 'basketweave', accent: '#B9B2A8', role: 'motif', size: 0.2 },
  'tile-014': { kind: 'brick', accent: '#CFC8BE', role: 'motif', size: 0.45 },
  'tile-015': { kind: 'woodlook', accent: null, role: 'motif', size: 1.2 },
  'tile-016': { kind: 'mosaic', accent: null, role: 'motif', size: 0.2 },
  'stone-009': { kind: 'brick', accent: '#B9AFA4', role: 'motif', size: 0.45 },
}

/** A catalogue item's pattern by its kind of material (the subcategory) — the planks of a hardwood, the veins of a marble. */
const BY_SUBCATEGORY: Record<string, Pattern> = {
  Hardwood: { kind: 'plank', accent: null, role: 'surface', size: 0.8 }, Vinyl: { kind: 'plank', accent: null, role: 'surface', size: 0.8 },
  Bamboo: { kind: 'plank', accent: null, role: 'surface', size: 0.6 }, Cork: { kind: 'cork', accent: null, role: 'surface', size: 0.3 },
  'Wood Grain': { kind: 'woodgrain', accent: null, role: 'surface', size: 0.8 }, Wood: { kind: 'woodgrain', accent: null, role: 'surface', size: 0.8 },
  Marble: { kind: 'marble', accent: null, role: 'surface', size: 1.2 }, Quartz: { kind: 'marble', accent: null, role: 'surface', size: 1.4 },
  Quartzite: { kind: 'marble', accent: null, role: 'surface', size: 1.4 }, Onyx: { kind: 'marble', accent: null, role: 'surface', size: 1 },
  'Stone Effect': { kind: 'marble', accent: null, role: 'surface', size: 1.2 },
  Terrazzo: { kind: 'terrazzo', accent: null, role: 'surface', size: 0.5 }, Granite: { kind: 'granite', accent: null, role: 'surface', size: 0.4 },
  Slate: { kind: 'slate', accent: null, role: 'surface', size: 0.8 }, Travertine: { kind: 'travertine', accent: null, role: 'surface', size: 1 },
  Limestone: { kind: 'grid', accent: null, role: 'surface', size: 1.2 }, Sandstone: { kind: 'slate', accent: null, role: 'surface', size: 0.8 },
  Concrete: { kind: 'concrete', accent: null, role: 'surface', size: 1.5 }, Porcelain: { kind: 'grid', accent: null, role: 'surface', size: 1.2 },
  'Large Format': { kind: 'grid', accent: null, role: 'motif', size: 1.2 }, Terracotta: { kind: 'grid', accent: null, role: 'motif', size: 0.6 },
  Zellige: { kind: 'zellige', accent: null, role: 'motif', size: 0.4 }, Patterned: { kind: 'cement', accent: null, role: 'motif', size: 0.4 },
  'Sintered Stone': { kind: 'concrete', accent: null, role: 'surface', size: 1.5 },
}
/** (F187) The pattern an item of the catalogue wears — by id first, then by its kind of material. */
export function surfacePatternOf(c: { id: string; subcategory?: string | null; name?: string; tags?: string[] } | null | undefined): Pattern | null {
  if (!c) return null
  const byId = WALLPAPER_PATTERNS[c.id] ?? TILE_PATTERNS[c.id]
  if (byId) return byId
  const sub = c.subcategory ? BY_SUBCATEGORY[c.subcategory] : undefined
  if (sub) return sub
  /* a studio's own material, by its words */
  return patternFromWords(`${c.name ?? ''} ${(c.tags ?? []).join(' ')} ${c.subcategory ?? ''}`)
}
/** A pattern from a material's words — "Walnut vinyl plank", "Carrara marble", "Herringbone oak" (a studio's own materials, F187). */
export function patternFromWords(words: string): Pattern | null {
  const w = words.toLowerCase()
  const has = (re: RegExp) => re.test(w)
  if (has(/herringbone/)) return { kind: 'herringbone', accent: null, role: 'motif', size: 0.3 }
  if (has(/chevron/)) return { kind: 'chevron', accent: null, role: 'motif', size: 1 }
  if (has(/subway|metro tile/)) return { kind: 'subway', accent: null, role: 'motif', size: 0.3 }
  if (has(/hexag|\bhex\b/)) return { kind: 'hex', accent: null, role: 'motif', size: 0.12 }
  if (has(/fish ?scale|scallop/)) return { kind: 'fishscale', accent: null, role: 'motif', size: 0.16 }
  if (has(/penny/)) return { kind: 'penny', accent: null, role: 'motif', size: 0.1 }
  if (has(/basket ?weave/)) return { kind: 'basketweave', accent: null, role: 'motif', size: 0.2 }
  if (has(/mosaic/)) return { kind: 'mosaic', accent: null, role: 'motif', size: 0.2 }
  if (has(/zellige/)) return { kind: 'zellige', accent: null, role: 'motif', size: 0.4 }
  if (has(/terrazzo/)) return { kind: 'terrazzo', accent: null, role: 'surface', size: 0.5 }
  if (has(/marble|calacatta|carrara|statuario|quartz|onyx/)) return { kind: 'marble', accent: null, role: 'surface', size: 1.2 }
  if (has(/granite/)) return { kind: 'granite', accent: null, role: 'surface', size: 0.4 }
  if (has(/slate|sandstone/)) return { kind: 'slate', accent: null, role: 'surface', size: 0.8 }
  if (has(/travertine/)) return { kind: 'travertine', accent: null, role: 'surface', size: 1 }
  if (has(/concrete|cement|microcement/)) return { kind: 'concrete', accent: null, role: 'surface', size: 1.5 }
  if (has(/\btiles?\b|porcelain|ceramic/)) return { kind: 'grid', accent: null, role: 'motif', size: 0.6 }
  if (has(/plank|parquet|floorboard|engineered|hardwood|laminate floor|vinyl|\blvt\b|\bspc\b/)) return { kind: 'plank', accent: null, role: 'surface', size: 0.8 }
  if (has(/\boak\b|walnut|\bash\b|teak|timber|\bwood|veneer|maple|cherry|hickory|birch|pine/)) return { kind: 'woodgrain', accent: null, role: 'surface', size: 0.8 }
  return null
}
/** A catalogue id's pattern (a wallpaper's motif, a laid floor or tile). The item's kind of material is read by `surfacePatternOf`. */
export const patternOf = (catalogueId: string | null | undefined): Pattern | null => (catalogueId ? WALLPAPER_PATTERNS[catalogueId] ?? TILE_PATTERNS[catalogueId] ?? null : null)

/** A kind's own real size (metres per tile) — a wallpaper's repeat, a tile bond's period. */
export const PATTERN_SIZE: Record<PatternKind, number> = {
  stripe: 0.35, geometric: 0.3, wave: 0.35, floral: 0.3, botanical: 0.45, deco: 0.35, brick: 0.45, grasscloth: 0.5, linen: 0.3, concrete: 1.5, cork: 0.3,
  plank: 0.8, woodgrain: 0.8, herringbone: 0.3, chevron: 1, subway: 0.3, grid: 1.2, hex: 0.12, fishscale: 0.16, penny: 0.1, basketweave: 0.2, mosaic: 0.2, zellige: 0.4,
  marble: 1.2, terrazzo: 0.5, granite: 0.4, slate: 0.8, travertine: 1, cement: 0.4, woodlook: 1.2,
}
export const patternSize = (p: Pattern) => p.size ?? PATTERN_SIZE[p.kind]

/* ── colours ── */
const lum = (hex: string) => { const [r, g, b] = hexToRgb(hex); return 0.299 * r + 0.587 * g + 0.114 * b }
const mixHex = (a: string, b: string, t: number) => { const p = hexToRgb(a), q = hexToRgb(b); return `#${p.map((v, i) => Math.round(v + (q[i]! - v) * t).toString(16).padStart(2, '0')).join('')}` }
/** The second colour a pattern draws with when the catalogue gives none: grout, joints, veins, chips. */
export function accentOf(p: Pattern, base: string): string {
  if (p.accent) return p.accent
  const light = lum(base) > 140
  switch (p.kind) {
    case 'plank': case 'woodgrain': case 'herringbone': case 'chevron': return mixHex(base, '#1E140C', 0.42)
    case 'woodlook': return light ? '#CFCAC0' : '#8E8A83'
    case 'marble': return light ? '#9C9892' : '#D9D4CC'
    case 'terrazzo': return light ? '#7E746A' : '#D8D0C4'
    case 'granite': return light ? '#3C3A38' : '#CFCBC4'
    case 'slate': case 'travertine': case 'concrete': case 'cork': return mixHex(base, light ? '#000000' : '#FFFFFF', 0.25)
    default: return light ? mixHex(base, '#6B6760', 0.45) : mixHex(base, '#E8E5DE', 0.55)   // grout
  }
}

/** The chip's picture — a CSS background that reads as the motif at 70 px. */
export function patternCss(p: Pattern, base: string): string {
  const a = accentOf(p, base)
  switch (p.kind) {
    case 'stripe': return `repeating-linear-gradient(90deg, ${base} 0 9px, ${a} 9px 18px)`
    case 'geometric': return `linear-gradient(45deg, ${a} 12%, transparent 12% 88%, ${a} 88%) 0 0 / 16px 16px, linear-gradient(-45deg, ${a} 12%, transparent 12% 88%, ${a} 88%) 0 0 / 16px 16px, ${base}`
    case 'wave': return `radial-gradient(circle at 50% 100%, ${base} 0 3px, ${a} 3px 5px, ${base} 5px 8px, ${a} 8px 10px, transparent 10px) 0 0 / 20px 10px, ${base}`
    case 'floral': return `radial-gradient(circle, ${a} 0 3px, transparent 3.5px) 0 0 / 14px 14px, radial-gradient(circle, ${a} 0 2px, transparent 2.5px) 7px 7px / 14px 14px, ${base}`
    case 'botanical': return `radial-gradient(ellipse 5px 11px at 50% 50%, ${a} 0 90%, transparent 100%) 0 0 / 22px 22px, radial-gradient(ellipse 11px 5px at 50% 50%, ${a} 0 90%, transparent 100%) 11px 11px / 22px 22px, ${base}`
    case 'deco': return `radial-gradient(circle at 50% 100%, ${base} 0 4px, ${a} 4px 5px, ${base} 5px 8px, ${a} 8px 9px, ${base} 9px) 0 0 / 18px 9px, ${base}`
    case 'brick': return `linear-gradient(${a} 0 2px, transparent 2px) 0 0 / 100% 10px, linear-gradient(90deg, ${a} 0 2px, transparent 2px) 0 0 / 22px 20px, linear-gradient(90deg, ${a} 0 2px, transparent 2px) 11px 10px / 22px 20px, ${base}`
    case 'grasscloth': return `repeating-linear-gradient(0deg, rgba(0,0,0,.06) 0 1px, transparent 1px 3px), repeating-linear-gradient(90deg, rgba(0,0,0,.08) 0 1px, transparent 1px 34px), ${base}`
    case 'linen': return `repeating-linear-gradient(0deg, rgba(0,0,0,.035) 0 1px, transparent 1px 3px), repeating-linear-gradient(90deg, rgba(0,0,0,.035) 0 1px, transparent 1px 3px), ${base}`
    case 'concrete': return `radial-gradient(circle at 30% 40%, rgba(255,255,255,.12), transparent 40%), radial-gradient(circle at 70% 70%, rgba(0,0,0,.1), transparent 45%), ${base}`
    case 'cork': return `radial-gradient(rgba(0,0,0,.18) 1px, transparent 1.5px) 0 0 / 5px 5px, radial-gradient(rgba(255,255,255,.18) 1px, transparent 1.5px) 2px 3px / 7px 7px, ${base}`
    case 'plank': return `linear-gradient(90deg, ${a} 0 1px, transparent 1px) 0 0 / 44px 12px, linear-gradient(90deg, ${a} 0 1px, transparent 1px) 22px 12px / 44px 24px, linear-gradient(${a} 0 1px, transparent 1px) 0 0 / 100% 12px, repeating-linear-gradient(0deg, rgba(0,0,0,.05) 0 1px, transparent 1px 4px), ${base}`
    case 'woodgrain': return `repeating-linear-gradient(0deg, rgba(0,0,0,.07) 0 1px, transparent 1px 5px), repeating-linear-gradient(0deg, rgba(255,255,255,.05) 0 2px, transparent 2px 9px), ${base}`
    case 'woodlook': return `linear-gradient(90deg, ${a} 0 2px, transparent 2px) 0 0 / 48px 12px, linear-gradient(90deg, ${a} 0 2px, transparent 2px) 24px 12px / 48px 24px, linear-gradient(${a} 0 2px, transparent 2px) 0 0 / 100% 12px, repeating-linear-gradient(0deg, rgba(0,0,0,.05) 0 1px, transparent 1px 4px), ${base}`
    case 'herringbone': return `linear-gradient(45deg, ${a} 0 1px, transparent 1px 8px, ${a} 8px 9px, transparent 9px) 0 0 / 16px 16px, linear-gradient(-45deg, transparent 0 7px, ${a} 7px 8px, transparent 8px) 8px 0 / 16px 16px, ${base}`
    case 'chevron': return `linear-gradient(135deg, ${a} 25%, transparent 25%) -8px 0 / 16px 16px, linear-gradient(225deg, ${a} 25%, transparent 25%) -8px 0 / 16px 16px, linear-gradient(315deg, ${a} 25%, transparent 25%) 0 0 / 16px 16px, linear-gradient(45deg, ${a} 25%, ${base} 25%) 0 0 / 16px 16px`
    case 'subway': return `linear-gradient(${a} 0 1px, transparent 1px) 0 0 / 100% 8px, linear-gradient(90deg, ${a} 0 1px, transparent 1px) 0 0 / 16px 16px, linear-gradient(90deg, ${a} 0 1px, transparent 1px) 8px 8px / 16px 16px, ${base}`
    case 'grid': return `linear-gradient(${a} 0 1px, transparent 1px) 0 0 / 22px 22px, linear-gradient(90deg, ${a} 0 1px, transparent 1px) 0 0 / 22px 22px, ${base}`
    case 'mosaic': return `linear-gradient(${a} 0 1px, transparent 1px) 0 0 / 7px 7px, linear-gradient(90deg, ${a} 0 1px, transparent 1px) 0 0 / 7px 7px, ${base}`
    case 'zellige': return `linear-gradient(${a} 0 1px, transparent 1px) 0 0 / 12px 12px, linear-gradient(90deg, ${a} 0 1px, transparent 1px) 0 0 / 12px 12px, radial-gradient(circle at 30% 30%, rgba(255,255,255,.18), transparent 60%) 0 0 / 12px 12px, ${base}`
    case 'hex': return `radial-gradient(circle, transparent 0 5px, ${a} 5px 6px, transparent 6px) 0 0 / 12px 10px, radial-gradient(circle, transparent 0 5px, ${a} 5px 6px, transparent 6px) 6px 5px / 12px 10px, ${base}`
    case 'fishscale': return `radial-gradient(circle at 50% 0, transparent 0 6px, ${a} 6px 7px, transparent 7px) 0 0 / 14px 7px, radial-gradient(circle at 50% 0, transparent 0 6px, ${a} 6px 7px, transparent 7px) 7px 3.5px / 14px 7px, ${base}`
    case 'penny': return `radial-gradient(circle, ${base} 0 3px, ${a} 3.5px) 0 0 / 8px 8px`
    case 'basketweave': return `linear-gradient(90deg, ${a} 0 1px, transparent 1px 8px, ${a} 8px 9px, transparent 9px) 0 0 / 16px 16px, linear-gradient(${a} 0 1px, transparent 1px) 0 0 / 8px 8px, ${base}`
    case 'marble': return `linear-gradient(115deg, transparent 38%, ${a} 40%, transparent 42%), linear-gradient(160deg, transparent 58%, ${a} 59%, transparent 61%), linear-gradient(35deg, transparent 70%, ${a} 71%, transparent 72%), ${base}`
    case 'terrazzo': return `radial-gradient(circle, ${a} 0 1.5px, transparent 2px) 0 0 / 9px 9px, radial-gradient(circle, ${mixHex(a, base, 0.5)} 0 1px, transparent 1.5px) 4px 5px / 11px 11px, ${base}`
    case 'granite': return `radial-gradient(${a} 0.8px, transparent 1.2px) 0 0 / 4px 4px, radial-gradient(${mixHex(base, '#FFFFFF', 0.4)} 0.8px, transparent 1.2px) 2px 1px / 5px 5px, ${base}`
    case 'slate': return `repeating-linear-gradient(170deg, rgba(0,0,0,.08) 0 2px, transparent 2px 7px), radial-gradient(circle at 40% 60%, rgba(255,255,255,.08), transparent 50%), ${base}`
    case 'travertine': return `repeating-linear-gradient(0deg, rgba(0,0,0,.06) 0 1px, transparent 1px 6px), radial-gradient(rgba(0,0,0,.18) 0.8px, transparent 1.2px) 0 0 / 9px 7px, ${base}`
    case 'cement': return `radial-gradient(circle, ${a} 0 4px, transparent 4.5px) 0 0 / 16px 16px, linear-gradient(45deg, transparent 45%, ${a} 45% 55%, transparent 55%) 0 0 / 16px 16px, linear-gradient(-45deg, transparent 45%, ${a} 45% 55%, transparent 55%) 0 0 / 16px 16px, ${base}`
  }
}

/* ── seamless noise: a lattice that wraps at `period` cells, so a tile's edges meet ── */
const hashP = (x: number, y: number, seed: number) => { let h = (x * 374761393 + y * 668265263 + seed * 2246822519) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967295 }
const wrap = (i: number, p: number) => ((i % p) + p) % p
function vnoise(x: number, y: number, period: number, seed: number): number {
  const x0 = Math.floor(x), y0 = Math.floor(y), tx = x - x0, ty = y - y0
  const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty)
  const a = hashP(wrap(x0, period), wrap(y0, period), seed), b = hashP(wrap(x0 + 1, period), wrap(y0, period), seed)
  const c = hashP(wrap(x0, period), wrap(y0 + 1, period), seed), d = hashP(wrap(x0 + 1, period), wrap(y0 + 1, period), seed)
  return (a * (1 - sx) + b * sx) * (1 - sy) + (c * (1 - sx) + d * sx) * sy
}
/** Fractal noise over [0,1)² that wraps: `base` cells on the first octave. */
function fbm(u: number, v: number, base: number, octaves: number, seed: number): number {
  let s = 0, amp = 0.5, tot = 0, f = base
  for (let o = 0; o < octaves; o++) { s += vnoise(u * f, v * f, f, seed + o * 17) * amp; tot += amp; amp *= 0.5; f *= 2 }
  return s / tot
}
/** Distance (in tile units) to the nearest and next-nearest points of a lattice that wraps — Voronoi, for hexes and pennies. */
function nearest2(u: number, v: number, pts: [number, number][], ah = 1): [number, number] {
  let d1 = Infinity, d2 = Infinity
  for (const [px, py] of pts) for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) {
    const d = Math.hypot(u - (px + ox), (v - (py + oy)) * ah)
    if (d < d1) { d2 = d1; d1 = d } else if (d < d2) d2 = d
  }
  return [d1, d2]
}

/** The motif as a square tile of `t` pixels — laid across a surface by the engine (engine/recolor `texture`). (A hex or fish-scale bond
    is not square: its tile is `t` wide and as tall as its period needs.) */
export function patternTile(p: Pattern, base: string, t: number): Img {
  const tall = p.kind === 'hex' ? Math.round(t * Math.sqrt(3) / 2) : t
  const img = makeImg(t, tall), d = img.data
  const [br, bg, bb] = hexToRgb(base), [ar, ag, ab] = hexToRgb(accentOf(p, base))
  const put = (x: number, y: number, mix: number, lift = 0) => {
    const i = (y * t + x) * 4, k = Math.max(0, Math.min(1, mix))
    d[i] = Math.max(0, Math.min(255, (br + (ar - br) * k) * (1 + lift)))
    d[i + 1] = Math.max(0, Math.min(255, (bg + (ag - bg) * k) * (1 + lift)))
    d[i + 2] = Math.max(0, Math.min(255, (bb + (ab - bb) * k) * (1 + lift)))
    d[i + 3] = 255
  }
  const soft = (v: number, w = 1) => Math.max(0, Math.min(1, 0.5 - v / w))   // an anti-aliased edge: < 0 inside
  const px = 1 / t   // one pixel, in tile units
  /** A joint line of `w` pixels at the distance `dist` (tile units) from it. */
  const line = (dist: number, w = 1) => soft(dist / px - w / 2)
  /** Wood: long streaks along u, the board's own tone and a darker late wood — for planks, herringbone and chevron boards. */
  const grain = (a: number, b: number, board: number) => (fbm(a * 0.5, b * 6, 4, 3, 11 + board) - 0.5) * 0.2 + (vnoise(a * 2, b * 40, 40, 7 + board) - 0.5) * 0.09 + (hashP(board, board * 7, 5) - 0.5) * 0.2
  for (let y = 0; y < tall; y++) for (let x = 0; x < t; x++) {
    const u = (x + 0.5) / t, v = (y + 0.5) / tall
    switch (p.kind) {
      case 'stripe': put(x, y, soft(Math.abs(u - 0.75) * t - t / 4)); break
      case 'geometric': { const e = Math.abs(Math.abs(u - 0.5) + Math.abs(v - 0.5) - 0.42) * t; put(x, y, soft(e - 1.2)); break }
      case 'wave': {
        let mix = 0
        for (const [cx, cy] of [[0.5, 0.5], [0, 1], [1, 1], [0.5, 1.5], [0, 0], [1, 0]] as const) {
          const r = Math.hypot(u - cx, v - cy) * t, ring = r % (t / 6)
          if (r < t * 0.5 && v <= cy + 0.001) mix = Math.max(mix, soft(Math.abs(ring - t / 12) - 1.2))
        }
        put(x, y, mix); break
      }
      case 'floral': {
        let mix = soft(Math.hypot(u - 0.5, v - 0.5) * t - t * 0.08)
        for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2, qx = 0.5 + Math.cos(a) * 0.16, qy = 0.5 + Math.sin(a) * 0.16; mix = Math.max(mix, soft(Math.hypot(u - qx, v - qy) * t - t * 0.075)) }
        put(x, y, mix * 0.9); break
      }
      case 'botanical': {
        let mix = 0
        for (const [cx, cy, ang] of [[0.3, 0.35, 0.7], [0.72, 0.68, -0.6], [0.78, 0.2, 2.2], [0.2, 0.85, -2.1]] as const) {
          const dx = u - cx, dy = v - cy, rx = dx * Math.cos(ang) + dy * Math.sin(ang), ry = -dx * Math.sin(ang) + dy * Math.cos(ang)
          const e = (rx / 0.2) ** 2 + (ry / 0.075) ** 2
          if (e < 1) mix = Math.max(mix, Math.abs(ry) < 0.006 ? 0.35 : 1 - e * 0.25)
        }
        put(x, y, mix); break
      }
      case 'deco': {
        let mix = 0
        for (const cx of [0, 0.5, 1]) { const cy = cx === 0.5 ? 0.5 : 1, r = Math.hypot(u - cx, v - cy) * t; if (r < t * 0.5 && v <= cy) { const ring = r % (t / 5); mix = Math.max(mix, soft(Math.abs(ring - t / 10) - 1)) } }
        put(x, y, 1 - mix * 0.9); break   // gold lines on black
      }
      case 'brick': {
        const row = Math.floor(v * 4), off = row % 2 ? 0.5 : 0, bu = (u + off) % 0.5, bv = (v * 4) % 1
        const mortar = Math.min(bu * t, (0.5 - bu) * t, bv * (t / 4), (1 - bv) * (t / 4))
        put(x, y, soft(mortar - 1), (hashP(Math.floor((u + off) * 2) % 2, row, 3) - 0.5) * 0.08); break
      }
      case 'grasscloth': put(x, y, 0, (fbm(0, v, 64, 1, 3) - 0.5) * 0.12 + (vnoise(u * 16, v * 64, 16, 9) - 0.5) * 0.05 - (x === 0 ? 0.08 : 0)); break
      case 'linen': put(x, y, 0, ((vnoise(u * 96, v * 48, 48, 2) - 0.5) + (vnoise(u * 48, v * 96, 48, 4) - 0.5)) * 0.05); break
      case 'concrete': put(x, y, 0, (fbm(u, v, 4, 4, 21) - 0.5) * 0.14 + (vnoise(u * 64, v * 64, 64, 22) - 0.5) * 0.04); break
      case 'cork': put(x, y, 0, (vnoise(u * 48, v * 48, 48, 31) - 0.5) * 0.24 + (vnoise(u * 12, v * 12, 12, 32) - 0.5) * 0.1); break
      case 'plank': case 'woodlook': {
        /* four boards across, one board long; the joints stagger by a quarter */
        const row = Math.floor(v * 4), bv = v * 4 - row, off = [0, 0.5, 0.25, 0.75][row]!, bu = (u + off) % 1
        const board = row * 4 + Math.floor((u + off) % 2)
        const joint = Math.max(line(Math.min(bv, 1 - bv) / 4, p.kind === 'woodlook' ? 2 : 1), line(Math.min(bu, 1 - bu), p.kind === 'woodlook' ? 2 : 1))
        put(x, y, joint * (p.kind === 'woodlook' ? 1 : 0.8), grain(bu, bv / 4 + row / 4, board)); break
      }
      case 'woodgrain': put(x, y, 0, (fbm(u, v * 3, 2, 4, 41) - 0.5) * 0.2 + (vnoise(u * 3, v * 60, 60, 42) - 0.5) * 0.1); break
      case 'chevron': {
        /* two strips across the tile; the boards in one run up at 45°, in the next down, meeting on a straight spine */
        const S = 0.5, b = 0.125, k = Math.floor(u / S), o = k % 2 === 0 ? 1 : -1, lx = u - k * S
        const dd = v + o * lx, n = Math.floor(dd / b), across = dd / b - n
        const edge = Math.min(across, 1 - across) * b / Math.SQRT2
        const spine = Math.min(Math.abs(lx), Math.abs(S - lx))
        put(x, y, Math.max(line(edge), line(spine)) * 0.85, grain(lx / S, across, wrap(n, 8) + k * 8)); break
      }
      case 'herringbone': {
        /* 1 × 2 boards in the classic interlocking staircase (each board's end against its neighbour's side), turned 45°: the tile holds
           one period, 2√2 board widths square. Axis-aligned cell (i, j) → its staircase m and step k (see audit notes, F047). */
        const R = 2 * Math.SQRT2, X = u * R, Y = v * R
        const fi = (X - Y) / Math.SQRT2, fj = (X + Y) / Math.SQRT2
        const i = Math.floor(fi), j = Math.floor(fj), a = i + j, bb = j - i
        const m = bb % 2 === 0 ? bb / 2 : wrap(a, 4) === 1 ? (bb + 1) / 2 : (bb - 1) / 2
        const sx = i + m, sy = j - m
        const kk = sx === sy ? sx : sx === sy + 1 ? sy : sx, horiz = kk % 2 === 0
        const x0 = kk - m, y0 = kk + m, x1 = x0 + (horiz ? 2 : 1), y1 = y0 + (horiz ? 1 : 2)
        const edge = Math.min(fi - x0, x1 - fi, fj - y0, y1 - fj) / R   // tile units
        const along = horiz ? (fi - x0) / 2 : (fj - y0) / 2, across = horiz ? fj - y0 : fi - x0
        put(x, y, line(edge, 1.3), grain(along, across, wrap(m * 7 + kk, 16))); break
      }
      case 'subway': {
        const row = Math.floor(v * 4), bv = v * 4 - row, off = row % 2 ? 0.25 : 0, bu = ((u + off) * 2) % 1
        const g = Math.max(line(Math.min(bv, 1 - bv) / 4, 1.2), line(Math.min(bu, 1 - bu) / 2, 1.2))
        put(x, y, g, (hashP(Math.floor((u + off) * 2) % 2, row, 51) - 0.5) * 0.05 + (1 - bv) * 0.03 - (bv < 0.15 ? 0.02 : 0)); break
      }
      case 'grid': {
        const bu = (u * 2) % 1, bv = (v * 2) % 1
        const g = Math.max(line(Math.min(bu, 1 - bu) / 2, 1.2), line(Math.min(bv, 1 - bv) / 2, 1.2))
        put(x, y, g, (hashP(Math.floor(u * 2), Math.floor(v * 2), 61) - 0.5) * 0.05 + (fbm(u, v, 3, 3, 62) - 0.5) * 0.06); break
      }
      case 'mosaic': case 'zellige': {
        const n = p.kind === 'mosaic' ? 8 : 4, bu = (u * n) % 1, bv = (v * n) % 1, ix = Math.floor(u * n), iy = Math.floor(v * n)
        const g = Math.max(line(Math.min(bu, 1 - bu) / n, 1), line(Math.min(bv, 1 - bv) / n, 1))
        const tone = (hashP(ix, iy, 71) - 0.5) * (p.kind === 'zellige' ? 0.28 : 0.14)
        const glaze = p.kind === 'zellige' ? (vnoise(u * n * 3, v * n * 3, n * 3, 72) - 0.5) * 0.12 : 0
        put(x, y, g, tone + glaze); break
      }
      case 'hex': {
        const [d1, d2] = nearest2(u, v, [[0.25, 0.25], [0.75, 0.25], [0, 0.75], [0.5, 0.75]], Math.sqrt(3) / 2)
        put(x, y, line((d2 - d1) / 2, 1.3), (vnoise(u * 8, v * 8, 8, 81) - 0.5) * 0.06); break
      }
      case 'fishscale': {
        /* rows of discs, each row half a scale across and overlapping the row above: a pixel belongs to the lowest disc that holds it */
        const R = 0.25, rows = 4
        let best = -Infinity, rim = 1, shade = 0
        for (let r = -1; r <= rows; r++) for (let c = -1; c <= 2; c++) {
          const cx = c * 2 * R + (r % 2 ? R : 0), cy = r * (1 / rows)
          const dd = Math.hypot(Math.min(Math.abs(u - cx), 1 - Math.abs(u - cx)), v - cy)
          if (dd < R && cy > best) { best = cy; rim = line(R - dd, 1.2); shade = (dd / R) * 0.08 }
        }
        put(x, y, best === -Infinity ? 1 : rim, -shade); break
      }
      case 'penny': {
        const [d1] = nearest2(u, v, [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]])
        put(x, y, soft((0.22 - d1) / px), (hashP(Math.floor(u * 2), Math.floor(v * 2), 91) - 0.5) * 0.08); break
      }
      case 'basketweave': {
        const cx = Math.floor(u * 2), cy = Math.floor(v * 2), lu = (u * 2) % 1, lv = (v * 2) % 1, flip = (cx + cy) % 2 === 1
        const a = flip ? lv : lu, c = flip ? lu : lv
        const g = Math.max(line(Math.min(lu, 1 - lu) / 2, 1.2), line(Math.min(lv, 1 - lv) / 2, 1.2), line(Math.abs(c - 0.5) / 2, 1))
        put(x, y, g, (hashP(cx, cy * 2 + (c > 0.5 ? 1 : 0), 95) - 0.5) * 0.08 + (a - 0.5) * 0.02); break
      }
      case 'marble': {
        const warp = fbm(u, v, 2, 5, 101) * 3.2
        const vein = Math.abs(Math.sin((u * 2 + v * 1) * Math.PI + warp * Math.PI))
        const fine = Math.abs(Math.sin((u * 1 - v * 3) * Math.PI * 2 + fbm(u, v, 4, 4, 103) * 6))
        const mix = Math.max(Math.pow(1 - vein, 14) * 0.85, Math.pow(1 - fine, 24) * 0.35)
        put(x, y, mix, (fbm(u, v, 3, 3, 105) - 0.5) * 0.05); break
      }
      case 'terrazzo': {
        let chip = 0, lift = 0
        const n = 7
        for (let ix = 0; ix < n; ix++) for (let iy = 0; iy < n; iy++) {
          const cx = (ix + hashP(ix, iy, 111)) / n, cy = (iy + hashP(ix, iy, 112)) / n, r = (0.18 + hashP(ix, iy, 113) * 0.25) / n
          const dx = Math.min(Math.abs(u - cx), 1 - Math.abs(u - cx)), dy = Math.min(Math.abs(v - cy), 1 - Math.abs(v - cy))
          if (Math.hypot(dx, dy * (0.7 + hashP(ix, iy, 114) * 0.6)) < r) { const kind = hashP(ix, iy, 115); chip = kind < 0.55 ? 1 : kind < 0.8 ? 0.55 : 0; lift = kind >= 0.8 ? -0.18 : 0 }
        }
        put(x, y, chip, lift + (vnoise(u * 32, v * 32, 32, 116) - 0.5) * 0.04); break
      }
      case 'granite': {
        const h = hashP(x % t, y % tall, 121), h2 = vnoise(u * 24, v * 24, 24, 122)
        put(x, y, h < 0.16 ? 0.85 : 0, h > 0.9 ? 0.14 : (h2 - 0.5) * 0.1); break
      }
      case 'slate': put(x, y, 0, (fbm(u * 0.5, v * 2, 3, 4, 131) - 0.5) * 0.22 + (vnoise(u * 4, v * 28, 28, 132) - 0.5) * 0.08); break
      case 'travertine': {
        const band = (fbm(u * 0.3, v * 3, 2, 3, 141) - 0.5) * 0.16 + (vnoise(u * 2, v * 48, 48, 142) - 0.5) * 0.06
        const [pd] = nearest2(u, v, Array.from({ length: 14 }, (_, q) => [hashP(q, 1, 144), hashP(q, 2, 145)] as [number, number]))
        const pit = soft((pd - 0.012) / px) * 0.55
        put(x, y, pit, band); break
      }
      case 'cement': {
        const bu = (u * 2) % 1, bv = (v * 2) % 1
        const g = Math.max(line(Math.min(bu, 1 - bu) / 2, 1.2), line(Math.min(bv, 1 - bv) / 2, 1.2))
        const r = Math.hypot(bu - 0.5, bv - 0.5), petal = Math.abs(Math.cos(Math.atan2(bv - 0.5, bu - 0.5) * 2))
        const motif = r < 0.12 ? 1 : r < 0.38 && r < 0.2 + petal * 0.2 ? 0.85 : Math.min(Math.abs(bu - bv), Math.abs(bu + bv - 1)) < 0.03 ? 0.7 : 0
        put(x, y, Math.max(g * 0.6, motif), (vnoise(u * 16, v * 16, 16, 151) - 0.5) * 0.05); break
      }
    }
  }
  return img
}
