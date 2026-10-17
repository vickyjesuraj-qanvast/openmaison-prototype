import { CATALOGUE, catalogueItem, suggestMaterials, type CatalogueItem } from './catalogue'
import type { Sheen } from './engine/recolor'
import type { MaterialRef } from './model'
import { patternCss, patternFromWords, surfacePatternOf } from './patterns'

/* AI Visualizer (REG-674) — every material a surface can take, as one shape: the catalogue (1.0's stock + Gush), the studio's library
   (`lib:` — Company › Materials, Q-18) and the design's own swatches (`own:` — 1.0's session customs). Pure and client-safe. */

export type LibraryMaterial = { id: string; name: string; category: string; hex: string; finish: string; imageUrl: string | null }
export type OwnSwatch = { id: string; name: string; category: string; hex: string; finish: string; imageUrl: string | null }

const sheen = (f: string): Sheen => (f === 'gloss' || f === 'satin' || f === 'textured' || f === 'natural' ? f : 'matte')
export const fromCatalogue = (c: CatalogueItem): MaterialRef => ({ id: c.id, name: c.name, hex: c.swatch, finish: sheen(c.finish), imageUrl: null, category: c.category, source: 'catalogue', pattern: surfacePatternOf(c) })
/** (REG-681; the testers' sheet row 206) A style as materials, not colours alone: the floor, the walls and the counters its affinities pick. */
const boards = new Map<string, MaterialRef[]>()
export function styleBoard(style: string): MaterialRef[] {
  const hit = boards.get(style); if (hit) return hit
  const out = ['floor', 'walls', 'countertop'].map((l) => suggestMaterials(l, style, 1)[0]).filter((c): c is CatalogueItem => !!c).map(fromCatalogue)
  boards.set(style, out); return out
}
/** (pending modules S43C) What a whole-room restyle lays on each surface of a reading — the style's nth pick for the surface (variant `v`,
    the first when it has fewer), the engine's restyle and Render from sketch read it, and so does the demo's record of a sample room's look
    (repair R162): a version lists exactly what its picture shows. */
export function restylePicks<T extends { label: string }>(surfaces: T[], style: string, v = 1): { def: T; m: MaterialRef }[] {
  const out: { def: T; m: MaterialRef }[] = []
  for (const s of surfaces) {
    const pick = suggestMaterials(s.label, style, 3)[v - 1] ?? suggestMaterials(s.label, style, 1)[0]
    if (pick) out.push({ def: s, m: fromCatalogue(pick) })
  }
  return out
}
/** A chip's background: the swatch photo, the wallpaper's motif, or the colour. */
export const chipCss = (m: Pick<MaterialRef, 'imageUrl' | 'pattern' | 'hex'>) => (m.imageUrl ? `center / cover no-repeat url("${m.imageUrl}")` : m.pattern ? patternCss(m.pattern, m.hex) : m.hex)

/** (F187) The categories whose look is a laid material (a floor's boards, a tile's grout, a stone's veins) — a studio's own material of
    these kinds wears its photo, or the pattern its words name, on the render; a paint never does. */
export const LAID_CATEGORIES = ['Flooring', 'Laminates', 'Tiles', 'Stone', 'Countertops', 'Wallpapers']
const ownPattern = (name: string, category: string) => (LAID_CATEGORIES.includes(category) ? patternFromWords(`${name} ${category === 'Flooring' ? 'plank' : ''}`) : null)
export function resolveMaterial(id: string, library: LibraryMaterial[], own: OwnSwatch[]): MaterialRef | null {
  if (id.startsWith('lib:')) { const m = library.find((x) => `lib:${x.id}` === id); return m ? { id, name: m.name, hex: m.hex, finish: sheen(m.finish), imageUrl: m.imageUrl, category: m.category, source: 'library', pattern: ownPattern(m.name, m.category) } : null }
  if (id.startsWith('own:')) { const m = own.find((x) => `own:${x.id}` === id); return m ? { id, name: m.name, hex: m.hex, finish: sheen(m.finish), imageUrl: m.imageUrl, category: m.category, source: 'design', pattern: ownPattern(m.name, m.category) } : null }
  const c = catalogueItem(id)
  return c ? fromCatalogue(c) : null
}

const rgb = (hex: string) => { const n = parseInt(hex.replace('#', '').padEnd(6, '0').slice(0, 6), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const }
const dist = (a: string, b: string) => { const p = rgb(a), q = rgb(b); return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) }
/** A lighter or darker shade of a colour — a variant of a studio swatch that has no neighbours in the catalogue. */
export function shade(hex: string, k: number): string {
  const [r, g, b] = rgb(hex)
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(k > 0 ? v + (255 - v) * k : v * (1 + k))))
  return `#${[f(r), f(g), f(b)].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase()}`
}

/** Variants 2 and 3 (1.0: "the same intent with subtle material variations"): the nearest catalogue neighbours of the same category and
    colour family, closest first; a studio or design swatch varies by shade. */
export function alternatesFor(m: MaterialRef, count: number): MaterialRef[] {
  if (m.source !== 'catalogue') return [0.14, -0.14, 0.26].slice(0, count).map((k, i) => ({ ...m, id: `${m.id}~${i + 1}`, name: `${m.name} (${k > 0 ? 'lighter' : 'deeper'})`, hex: shade(m.hex, k) }))
  const self = catalogueItem(m.id)
  if (!self) return []
  const pool = CATALOGUE.filter((c) => c.id !== self.id && c.category === self.category)
  const same = pool.filter((c) => c.colorFamily === self.colorFamily)
  return (same.length >= count ? same : pool).sort((a, b) => dist(a.swatch, self.swatch) - dist(b.swatch, self.swatch)).slice(0, count).map(fromCatalogue)
}

/* ── (audit 2026-09-26, F187) what kind of material a surface shows, and a finish is — how much of the photo's texture a new finish keeps ── */
export type Family = 'paint' | 'wood' | 'tile' | 'stone' | 'fabric' | 'metal' | 'glass' | 'paper'
/** What a surface is made of now, read from its label ("light oak floor" → wood, "light grey tile floor" → tile). */
export function surfaceFamily(label: string): Family {
  const l = label.toLowerCase()
  if (/tile|ceramic|porcelain|mosaic|zellige/.test(l)) return 'tile'
  if (/marble|quartz|granite|stone|terrazzo|concrete|travertine|slate|limestone|worktop|countertop/.test(l)) return 'stone'
  if (/\boak\b|timber|wood|walnut|parquet|plank|veneer|\bash\b|teak|bamboo|laminate floor|floorboard/.test(l)) return 'wood'
  if (/wallpaper|grasscloth/.test(l)) return 'paper'
  if (/curtain|fabric|linen|upholster|rug|carpet/.test(l)) return 'fabric'
  if (/glass|window|mirror/.test(l)) return 'glass'
  if (/steel|metal|brass|chrome/.test(l)) return 'metal'
  if (/floor/.test(l)) return 'wood'
  return 'paint'
}
/** What a finish is made of, from its category and its kind (a laminate may be wood grain, stone effect or a solid colour). */
export function materialFamily(m: Pick<MaterialRef, 'id' | 'name' | 'category' | 'pattern'>): Family {
  const sub = (catalogueItem(m.id)?.subcategory ?? '').toLowerCase(), w = `${m.name} ${sub}`.toLowerCase()
  switch (m.category) {
    case 'Paints': case 'Gush Paints': case 'Gush Enamel': return 'paint'
    case 'Wallpapers': return 'paper'
    case 'Fabrics': return 'fabric'
    case 'Metals': return 'metal'
    case 'Glass': return 'glass'
    case 'Tiles': return /wood look/.test(w) ? 'wood' : 'tile'
    case 'Stone': return /brick/.test(w) ? 'tile' : 'stone'
    case 'Countertops': return /wood|butcher/.test(w) ? 'wood' : /metal|steel/.test(w) ? 'metal' : 'stone'
    case 'Flooring': return /marble|granite|terrazzo|concrete|slate|limestone|travertine/.test(w) ? 'stone' : /porcelain|cement tile|tile/.test(w) ? 'tile' : 'wood'
    case 'Laminates': return /wood|oak|walnut|ash|teak|maple|cherry|hickory/.test(w) ? 'wood' : /stone|marble|concrete|terrazzo|cement/.test(w) ? 'stone' : /metal|alumin|gold/.test(w) ? 'metal' : 'paint'
    default: {
      const k = m.pattern?.kind
      if (k === 'plank' || k === 'woodgrain' || k === 'herringbone' || k === 'chevron' || k === 'woodlook') return 'wood'
      if (k === 'marble' || k === 'granite' || k === 'terrazzo' || k === 'slate' || k === 'travertine' || k === 'concrete') return 'stone'
      if (k) return 'tile'
      return /floor|oak|walnut|wood|vinyl|plank/.test(w) ? 'wood' : /marble|stone|quartz|granite/.test(w) ? 'stone' : /tile/.test(w) ? 'tile' : 'paint'
    }
  }
}
