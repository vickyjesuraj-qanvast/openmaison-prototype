import { CATALOGUE } from './data/catalogue.gen'
import { styleByName, type ColorFamily, type Finish } from './styles'

/* AI Visualizer (REG-673) — the material catalogue and its rules, 1.0's `mock-catalogue.ts` (B-61…B-64). Pure and client-safe. */

export const CATALOGUE_CATEGORY_LIST = ['Laminates', 'Paints', 'Gush Paints', 'Gush Enamel', 'Flooring', 'Countertops', 'Tiles', 'Wallpapers', 'Fabrics', 'Metals', 'Glass', 'Stone'] as const
export type CatalogueCategory = (typeof CATALOGUE_CATEGORY_LIST)[number]
/** The brand books shown as their own sections after the generic ones (1.0's picker). */
export const BRAND_CATEGORIES: CatalogueCategory[] = ['Gush Paints', 'Gush Enamel']
export const GENERIC_CATEGORIES = CATALOGUE_CATEGORY_LIST.filter((c) => !BRAND_CATEGORIES.includes(c))

export type CatalogueItem = {
  id: string
  name: string
  category: CatalogueCategory
  subcategory: string
  description: string
  swatch: string
  finish: Finish
  colorFamily: ColorFamily
  tags: string[]
}

export { CATALOGUE }
const BY_ID = new Map(CATALOGUE.map((c) => [c.id, c]))
export const catalogueItem = (id: string) => BY_ID.get(id) ?? null

/** Surface label → the categories that belong on it, most likely first (1.0's `SURFACE_CATEGORY_MAP`). */
export const SURFACE_CATEGORY_MAP: Record<string, CatalogueCategory[]> = {
  Walls: ['Paints', 'Wallpapers', 'Tiles', 'Laminates', 'Stone'], Wall: ['Paints', 'Wallpapers', 'Tiles', 'Laminates', 'Stone'],
  'Feature Wall': ['Wallpapers', 'Stone', 'Tiles', 'Paints', 'Laminates'], 'Accent Wall': ['Wallpapers', 'Stone', 'Tiles', 'Paints'],
  Floor: ['Flooring', 'Tiles', 'Stone'], Flooring: ['Flooring', 'Tiles', 'Stone'], Ceiling: ['Paints', 'Laminates'],
  Cabinets: ['Laminates', 'Paints', 'Metals'], Cabinet: ['Laminates', 'Paints', 'Metals'], 'Kitchen Cabinets': ['Laminates', 'Paints', 'Metals'], Wardrobe: ['Laminates', 'Paints'],
  Countertop: ['Countertops', 'Stone'], Countertops: ['Countertops', 'Stone'], 'Kitchen Counter': ['Countertops', 'Stone'], Island: ['Countertops', 'Stone', 'Laminates'],
  Backsplash: ['Tiles', 'Glass', 'Stone'], Splashback: ['Tiles', 'Glass', 'Stone'], Door: ['Laminates', 'Paints', 'Glass'], Doors: ['Laminates', 'Paints', 'Glass'],
  Window: ['Glass', 'Fabrics'], Trim: ['Paints', 'Metals', 'Laminates'], Curtains: ['Fabrics'], Sofa: ['Fabrics'], Upholstery: ['Fabrics'], Furniture: ['Laminates', 'Fabrics', 'Metals'], Shelving: ['Laminates', 'Metals'],
  Table: ['Laminates', 'Stone', 'Countertops'], Fixtures: ['Metals'], Hardware: ['Metals'], Railing: ['Metals', 'Glass'], Partition: ['Glass', 'Laminates'],
  'Shower Screen': ['Glass'], Mirror: ['Glass'], 'Bathroom Wall': ['Tiles', 'Stone', 'Paints'], 'Bathroom Floor': ['Tiles', 'Stone'],
}

/** A descriptive label ("polished concrete floor") → its categories; the exact map wins, then keywords, most specific first (1.0 B-62). */
export function resolveSurfaceCategories(label: string): CatalogueCategory[] | undefined {
  const exact = SURFACE_CATEGORY_MAP[label]
  if (exact) return exact
  const l = label.toLowerCase().split(/\s+(?:above|below|beside|behind|around|under|over|next to|by|near|of|facing)\s+/)[0]!   // what it is, not where it sits
  const has = (...ws: string[]) => ws.some((w) => l.includes(w))
  if (has('backsplash', 'splashback')) return SURFACE_CATEGORY_MAP.Backsplash
  if (has('countertop', 'counter top', 'worktop', 'counter', 'vanity top')) return SURFACE_CATEGORY_MAP.Countertop
  if (has('wardrobe', 'closet')) return SURFACE_CATEGORY_MAP.Wardrobe
  if (has('cabinet', 'cabinetry', 'joinery', 'carpentry', 'millwork')) return SURFACE_CATEGORY_MAP.Cabinets
  if (has('shelv', 'shelf', 'bookcase')) return SURFACE_CATEGORY_MAP.Shelving
  if (has('ceiling', 'soffit', 'bulkhead')) return SURFACE_CATEGORY_MAP.Ceiling
  if (has('floor', 'flooring', 'parquet')) return SURFACE_CATEGORY_MAP.Floor
  if (has('partition', 'divider', 'screen')) return SURFACE_CATEGORY_MAP.Partition
  /* (F045) a door or window's frame, sill or moulding is trim — paints and metals, not glass; a bare 'Window' keeps glass */
  if (has('frame', 'trim', 'sill', 'mullion', 'skirting', 'baseboard', 'cornice', 'architrave', 'moulding', 'molding')) return SURFACE_CATEGORY_MAP.Trim
  if (has('door')) return SURFACE_CATEGORY_MAP.Door
  if (has('window', 'glazing')) return SURFACE_CATEGORY_MAP.Window
  if (has('curtain', 'drape', 'blind')) return SURFACE_CATEGORY_MAP.Curtains
  if (has('feature wall', 'accent wall', 'tv wall', 'headboard feature')) return SURFACE_CATEGORY_MAP['Feature Wall']
  if (has('panel', 'paneling', 'panelling', 'slat', 'cladding', 'fluted', 'batten')) return SURFACE_CATEGORY_MAP['Feature Wall']
  if (has('wall')) return SURFACE_CATEGORY_MAP.Walls
  return undefined
}

function hexToRgb(hex: string): [number, number, number] | null {
  const h = hex.replace('#', '').trim()
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null
  const n = parseInt(full, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
/** 0 (opposite) … 1 (identical): how close a swatch sits to the nearest colour of a palette. */
function paletteProximity(swatch: string, palette: string[]): number {
  const c = hexToRgb(swatch)
  if (!c || !palette.length) return 0
  let min = Infinity
  for (const p of palette) { const q = hexToRgb(p); if (q) min = Math.min(min, Math.hypot(c[0] - q[0], c[1] - q[1], c[2] - q[2])) }
  return min === Infinity ? 0 : Math.max(0, 1 - min / 441.673)
}

/**
 * The Suggested row (1.0's `suggestMaterials`, B-62): no style → nothing; the surface's categories are a HARD filter ordered by the
 * surface's category priority, then by closeness to the style card's palette ×100 + the style fit (tags 3 · finish 2 · colour family 1);
 * a label with no category falls back to a pure style ranking with a score of at least 5.
 */
export function suggestMaterials(label: string, style: string, limit = 6, catalogue: CatalogueItem[] = CATALOGUE): CatalogueItem[] {
  const s = styleByName(style)
  if (!s) return []
  const a = s.affinities
  const fit = (item: CatalogueItem) => a.tags.reduce((n, t) => n + (item.tags.includes(t) ? 3 : 0), 0) + (a.finishes.includes(item.finish) ? 2 : 0) + (a.colorFamilies.includes(item.colorFamily) ? 1 : 0)
  const cats = resolveSurfaceCategories(label)
  if (!cats) return catalogue.map((item) => ({ item, score: fit(item) })).filter((x) => x.score >= 5).sort((x, y) => y.score - x.score).slice(0, limit).map((x) => x.item)
  return catalogue
    .filter((item) => cats.includes(item.category))
    .map((item) => ({ item, pri: cats.indexOf(item.category), score: paletteProximity(item.swatch, s.colorPalette) * 100 + fit(item) }))
    .sort((x, y) => x.pri - y.pri || y.score - x.score)
    .slice(0, limit)
    .map((x) => x.item)
}

/** The picker's search: name · category · subcategory · description · tags (1.0's fuzzy match, as words). */
export function searchCatalogue(query: string, items: CatalogueItem[] = CATALOGUE): CatalogueItem[] {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (!words.length) return items
  return items.filter((c) => { const hay = `${c.name} ${c.category} ${c.subcategory} ${c.description} ${c.tags.join(' ')}`.toLowerCase(); return words.every((w) => hay.includes(w)) })
}
