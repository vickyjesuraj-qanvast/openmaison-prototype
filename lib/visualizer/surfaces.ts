import { SURFACE_CATEGORY_MAP, type CatalogueCategory } from './catalogue'

/* AI Visualizer (REG-674) — surfaces as the Surfaces panel groups them, 1.0's `visualizer.tsx` (B-57, B-63). Pure and client-safe. */

export type SurfaceGroup = 'Walls' | 'Feature Walls' | 'Panelling' | 'Cabinets' | 'Wardrobes' | 'Open Shelving' | 'Countertops' | 'Backsplash' | 'Floor' | 'Ceiling' | 'Doors' | 'Trim & Moulding' | 'Other'
export const SURFACE_GROUP_ORDER: SurfaceGroup[] = ['Walls', 'Feature Walls', 'Panelling', 'Cabinets', 'Wardrobes', 'Open Shelving', 'Countertops', 'Backsplash', 'Floor', 'Ceiling', 'Doors', 'Trim & Moulding', 'Other']

/** A label's structural group — most specific first, so a slat feature wall is Panelling and a built-in wardrobe is Wardrobes (1.0 B-57). */
/** A label's head — what the surface IS, before where it sits ("white wall above the window" is a wall, not a window). */
const headOf = (label: string) => label.toLowerCase().split(/\s+(?:above|below|beside|behind|around|under|over|next to|by|near|of|facing)\s+/)[0]!

export function surfaceGroupFor(label: string): SurfaceGroup {
  const l = headOf(label)
  if (/panel|slat|flut|batten|wainscot|reeded|ribbed|groove|board.?and.?batten/.test(l)) return 'Panelling'
  if (/wardrobe|closet|armoire/.test(l)) return 'Wardrobes'
  if (/shelv|shelf|bookcase|display unit|open storage|niche/.test(l)) return 'Open Shelving'
  if (/cabinet|cabinetry|joinery|sideboard|credenza|tv unit|tv console|media unit|vanity unit|dresser/.test(l)) return 'Cabinets'
  if (/countertop|counter\b|worktop|island top|island|vanity top|tabletop/.test(l)) return 'Countertops'
  if (/backsplash|splashback/.test(l)) return 'Backsplash'
  if (/floor|flooring/.test(l)) return 'Floor'
  if (/ceiling|soffit|bulkhead/.test(l)) return 'Ceiling'
  if (/\bdoor\b|doorway|entry door/.test(l)) return 'Doors'
  if (/window|glazing|mullion|sill|skirting|baseboard|cornice|architrave|crown moulding|crown molding|moulding|molding|dado|picture rail|\btrim\b/.test(l)) return 'Trim & Moulding'
  if (/feature wall|accent wall|backdrop|feature|accent/.test(l)) return 'Feature Walls'
  if (/wall/.test(l)) return 'Walls'
  return 'Other'
}

/** The categories the picker leads with when a whole group is selected (trim is painted, metal or laminate — F045). */
export function groupMaterialCategories(group: SurfaceGroup): CatalogueCategory[] {
  const M = SURFACE_CATEGORY_MAP
  const key: Partial<Record<SurfaceGroup, string>> = { Walls: 'Walls', 'Feature Walls': 'Feature Wall', Panelling: 'Feature Wall', Cabinets: 'Cabinets', Wardrobes: 'Wardrobe', 'Open Shelving': 'Shelving', Countertops: 'Countertop', Backsplash: 'Backsplash', Floor: 'Floor', Ceiling: 'Ceiling', Doors: 'Door', 'Trim & Moulding': 'Trim' }
  const k = key[group]
  return k ? M[k] ?? [] : []
}

/** A label → its categories through its surface type (files an uploaded swatch; filters the studio's library). */
export function surfaceCategoriesFor(label: string): CatalogueCategory[] {
  const l = headOf(label)
  const key = /floor|flooring/.test(l) ? 'Floor' : /countertop|counter|island|vanity top/.test(l) ? 'Countertop' : /backsplash|splashback/.test(l) ? 'Backsplash'
    : /wardrobe/.test(l) ? 'Wardrobe' : /cabinet|joinery|shelv|drawer|sideboard|credenza/.test(l) ? 'Cabinets' : /ceiling/.test(l) ? 'Ceiling'
    : /frame|trim|sill|mullion|skirting|baseboard|cornice|architrave|mould|mold/.test(l) ? 'Trim' : /\bdoor\b/.test(l) ? 'Doors'
    : /window/.test(l) ? 'Window' : /curtain|drape/.test(l) ? 'Curtains' : /wall|panel|backdrop/.test(l) ? 'Walls' : null
  return key ? SURFACE_CATEGORY_MAP[key] ?? [] : []
}

/** "brown bar stool (left)" → "Brown Bar Stool (left)": title case with the position hint kept small. */
export function titleCaseLabel(label: string): string {
  const m = label.match(/^(.*?)(\s*\([^)]*\))?\s*$/)
  if (!m) return label
  const ACRONYMS: Record<string, string> = { tv: 'TV', led: 'LED', hdb: 'HDB', bto: 'BTO' }
  /* (F048) the small words stay small unless they open the label: "White Wall above the Window" */
  const SMALL = new Set(['a', 'an', 'the', 'and', 'or', 'of', 'in', 'on', 'at', 'to', 'by', 'for', 'with', 'above', 'below', 'under', 'over', 'near', 'beside', 'behind'])
  const main = (m[1] ?? '').trim().split(/\s+/).map((w, i) => i > 0 && SMALL.has(w.toLowerCase()) ? w.toLowerCase() : ACRONYMS[w.toLowerCase()] ?? w.split('-').map((p) => ACRONYMS[p.toLowerCase()] ?? (p ? p[0]!.toUpperCase() + p.slice(1).toLowerCase() : p)).join('-')).join(' ')
  const hint = (m[2] ?? '').trim()
  return hint ? `${main} ${hint.toLowerCase()}` : main
}
/** (verify round 1) A label inside a sentence: lower case, its acronyms kept and its "(position)" hint dropped — "Pick a colour for the
    wall-mounted TV first", never "…the wall-mounted tv". */
export function labelInText(label: string): string {
  return titleCaseLabel(label).replace(/\s*\([^)]*\)\s*$/, '').split(/(\s+|-)/).map((w) => (/^(TV|LED|HDB|BTO)$/.test(w) ? w : w.toLowerCase())).join('')
}
/** The furniture row's key: the label without its "(position)" hint, lower-cased — "(left)" and "(right)" are one row ×2. */
export const normFurnitureKey = (label: string) => label.replace(/\s*\([^)]*\)\s*$/, '').trim().toLowerCase()
/** A dot stays on the photo: 2.5 … 97.5 % (1.0's `clampDotPct`). */
export const clampDot = (v: number) => Math.max(0.025, Math.min(0.975, v))
