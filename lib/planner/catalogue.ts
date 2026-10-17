/*
 * (gaps build J, J-Q7) The 3D Space Planner's furniture — 42 pieces in seven groups, each a simple parametric shape the top view draws as
 * its outline and the 3D view builds from boxes and cylinders sized by the piece's own width × depth × height (1.0's nine geometry builders,
 * without its GLB models). Sizes are the common Singapore ones in centimetres (a super single is 107 × 190; an HDB wardrobe 60 deep).
 * Pure and client-safe: the server's shape check drops a key that is not here.
 */

export type Shape = 'sofa' | 'lsofa' | 'armchair' | 'table' | 'lowTable' | 'roundSet' | 'diningSet' | 'chair' | 'bench' | 'bed' | 'cabinet' | 'wardrobe'
  | 'shelf' | 'tv' | 'dresser' | 'desk' | 'officeChair' | 'counter' | 'island' | 'tall' | 'fridge' | 'washer' | 'toilet' | 'vanity' | 'shower' | 'bath'
  | 'rug' | 'plant' | 'lamp' | 'pendant'
export type Group = 'living' | 'dining' | 'bedroom' | 'study' | 'kitchen' | 'bathroom' | 'decor'
export const GROUPS: { key: Group; label: string; icon: string }[] = [
  { key: 'living', label: 'Living', icon: 'weekend' },
  { key: 'dining', label: 'Dining', icon: 'table_restaurant' },
  { key: 'bedroom', label: 'Bedroom', icon: 'bed' },
  { key: 'study', label: 'Study', icon: 'table_lamp' },
  { key: 'kitchen', label: 'Kitchen', icon: 'kitchen' },
  { key: 'bathroom', label: 'Bathroom', icon: 'plumbing' },
  { key: 'decor', label: 'Decor', icon: 'potted_plant' },
]
export type CatalogueItem = {
  key: string; name: string; group: Group; shape: Shape
  w: number; d: number; h: number
  color: string
  /** a rug lies flat, a pendant hangs: neither counts in an overlap */ loose?: boolean
  /** hung from the ceiling */ ceiling?: boolean
  /** a few more words the search finds it by */ words?: string
}

export const CATALOGUE: CatalogueItem[] = [
  { key: 'sofa-3', name: '3-seater sofa', group: 'living', shape: 'sofa', w: 210, d: 90, h: 85, color: '#8C8C8C', words: 'couch settee' },
  { key: 'sofa-2', name: '2-seater sofa', group: 'living', shape: 'sofa', w: 150, d: 90, h: 85, color: '#8C8C8C', words: 'couch loveseat' },
  { key: 'sofa-l', name: 'L-shaped sofa', group: 'living', shape: 'lsofa', w: 260, d: 180, h: 85, color: '#7E8A8F', words: 'couch sectional corner' },
  { key: 'armchair', name: 'Armchair', group: 'living', shape: 'armchair', w: 85, d: 85, h: 80, color: '#B48A6A', words: 'lounge chair' },
  { key: 'coffee-table', name: 'Coffee table', group: 'living', shape: 'lowTable', w: 120, d: 60, h: 42, color: '#A07850' },
  { key: 'side-table', name: 'Side table', group: 'living', shape: 'table', w: 50, d: 50, h: 55, color: '#A07850', words: 'end table' },
  { key: 'tv-console', name: 'TV console', group: 'living', shape: 'tv', w: 180, d: 40, h: 50, color: '#5B4A3F', words: 'television cabinet' },
  { key: 'bookshelf', name: 'Bookshelf', group: 'living', shape: 'shelf', w: 90, d: 35, h: 190, color: '#C9B79C', words: 'shelves display' },

  { key: 'dining-4', name: 'Dining set for 4', group: 'dining', shape: 'diningSet', w: 120, d: 150, h: 75, color: '#A07850', words: 'table chairs' },
  { key: 'dining-6', name: 'Dining set for 6', group: 'dining', shape: 'diningSet', w: 180, d: 160, h: 75, color: '#A07850', words: 'table chairs' },
  { key: 'round-4', name: 'Round table for 4', group: 'dining', shape: 'roundSet', w: 160, d: 160, h: 75, color: '#C9B79C', words: 'table chairs' },
  { key: 'dining-table', name: 'Dining table', group: 'dining', shape: 'table', w: 160, d: 90, h: 75, color: '#A07850' },
  { key: 'dining-chair', name: 'Dining chair', group: 'dining', shape: 'chair', w: 45, d: 50, h: 85, color: '#5B4A3F' },
  { key: 'bench', name: 'Bench', group: 'dining', shape: 'bench', w: 140, d: 40, h: 45, color: '#A07850' },
  { key: 'sideboard', name: 'Sideboard', group: 'dining', shape: 'cabinet', w: 160, d: 45, h: 80, color: '#E4DDD3', words: 'buffet credenza' },

  { key: 'bed-king', name: 'King bed', group: 'bedroom', shape: 'bed', w: 190, d: 215, h: 100, color: '#E9E4DC', words: '183 x 203' },
  { key: 'bed-queen', name: 'Queen bed', group: 'bedroom', shape: 'bed', w: 165, d: 215, h: 100, color: '#E9E4DC', words: '152 x 190 160 x 200' },
  { key: 'bed-ss', name: 'Super single bed', group: 'bedroom', shape: 'bed', w: 112, d: 200, h: 95, color: '#E9E4DC', words: '107 x 190' },
  { key: 'bed-single', name: 'Single bed', group: 'bedroom', shape: 'bed', w: 96, d: 200, h: 95, color: '#E9E4DC', words: '91 x 190' },
  { key: 'bedside', name: 'Bedside table', group: 'bedroom', shape: 'cabinet', w: 45, d: 40, h: 50, color: '#C9B79C', words: 'nightstand' },
  { key: 'wardrobe-2', name: 'Wardrobe, 2 doors', group: 'bedroom', shape: 'wardrobe', w: 100, d: 60, h: 210, color: '#EDE7DD', words: 'closet' },
  { key: 'wardrobe-3', name: 'Wardrobe, 3 doors', group: 'bedroom', shape: 'wardrobe', w: 150, d: 60, h: 210, color: '#EDE7DD', words: 'closet' },
  { key: 'wardrobe-full', name: 'Full-height wardrobe', group: 'bedroom', shape: 'wardrobe', w: 200, d: 60, h: 250, color: '#EDE7DD', words: 'closet built-in carpentry' },
  { key: 'dresser', name: 'Dresser', group: 'bedroom', shape: 'dresser', w: 100, d: 45, h: 78, color: '#C9B79C', words: 'vanity dressing table' },

  { key: 'desk', name: 'Desk', group: 'study', shape: 'desk', w: 120, d: 60, h: 75, color: '#C9B79C', words: 'study table work' },
  { key: 'office-chair', name: 'Office chair', group: 'study', shape: 'officeChair', w: 60, d: 60, h: 100, color: '#3F3F46' },
  { key: 'drawers', name: 'Drawer cabinet', group: 'study', shape: 'cabinet', w: 45, d: 55, h: 70, color: '#E4DDD3', words: 'filing pedestal' },

  { key: 'counter', name: 'Kitchen counter', group: 'kitchen', shape: 'counter', w: 240, d: 60, h: 90, color: '#E4DDD3', words: 'base cabinets cabinet worktop' },
  { key: 'island', name: 'Kitchen island', group: 'kitchen', shape: 'island', w: 180, d: 90, h: 90, color: '#E4DDD3', words: 'counter' },
  { key: 'tall-unit', name: 'Tall unit', group: 'kitchen', shape: 'tall', w: 60, d: 60, h: 220, color: '#E4DDD3', words: 'oven pantry larder' },
  { key: 'fridge', name: 'Fridge', group: 'kitchen', shape: 'fridge', w: 70, d: 70, h: 180, color: '#D4D6D9', words: 'refrigerator' },
  { key: 'washer', name: 'Washing machine', group: 'kitchen', shape: 'washer', w: 60, d: 60, h: 85, color: '#F1F1F1', words: 'washer dryer laundry' },

  { key: 'toilet', name: 'Toilet', group: 'bathroom', shape: 'toilet', w: 40, d: 65, h: 75, color: '#F7F7F5', words: 'wc water closet' },
  { key: 'vanity', name: 'Vanity with basin', group: 'bathroom', shape: 'vanity', w: 80, d: 50, h: 85, color: '#E4DDD3', words: 'sink basin' },
  { key: 'shower', name: 'Shower', group: 'bathroom', shape: 'shower', w: 90, d: 90, h: 200, color: '#CFE3E8', words: 'screen glass' },
  { key: 'bathtub', name: 'Bathtub', group: 'bathroom', shape: 'bath', w: 170, d: 75, h: 55, color: '#F7F7F5', words: 'bath tub' },

  { key: 'rug', name: 'Rug', group: 'decor', shape: 'rug', w: 200, d: 140, h: 1, color: '#D8CBB8', loose: true, words: 'carpet mat' },
  { key: 'plant', name: 'Plant', group: 'decor', shape: 'plant', w: 45, d: 45, h: 120, color: '#5E8C61', words: 'pot greenery' },
  { key: 'floor-lamp', name: 'Floor lamp', group: 'decor', shape: 'lamp', w: 40, d: 40, h: 160, color: '#E9E4DC', words: 'light' },
  { key: 'pendant', name: 'Pendant light', group: 'decor', shape: 'pendant', w: 50, d: 50, h: 40, color: '#2F2F33', loose: true, ceiling: true, words: 'lamp light ceiling' },
  { key: 'shoe-cabinet', name: 'Shoe cabinet', group: 'decor', shape: 'cabinet', w: 100, d: 35, h: 100, color: '#E4DDD3', words: 'entrance foyer' },
  { key: 'console', name: 'Console table', group: 'decor', shape: 'table', w: 120, d: 35, h: 80, color: '#5B4A3F', words: 'entrance hall' },
]

const BY_KEY = new Map(CATALOGUE.map((c) => [c.key, c]))
export const catalogueItem = (key: string) => BY_KEY.get(key) ?? null
export const isPieceKey = (key: string) => BY_KEY.has(key)
/** (J-Q8) Never counted in an overlap: a rug lies flat, a pendant hangs. */
export const isLoose = (key: string) => !!BY_KEY.get(key)?.loose
export const pieceName = (key: string) => BY_KEY.get(key)?.name ?? 'Piece'
/** The search: every word in the name, the group or the piece's other words. */
export function searchPieces(q: string): CatalogueItem[] {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean)
  if (!words.length) return CATALOGUE
  return CATALOGUE.filter((c) => { const hay = `${c.name} ${c.group} ${c.words ?? ''}`.toLowerCase(); return words.every((w) => hay.includes(w)) })
}
/** (J-Q10) The eight colours a piece offers before the materials. */
export const PIECE_COLOURS = ['#F7F7F5', '#E4DDD3', '#C9B79C', '#A07850', '#5B4A3F', '#8C8C8C', '#3F3F46', '#5E7C8C']
/** (J-Q10) The eight colours, by the names a studio says them (the inspector's chips, and a described piece's colour — parity map, TD-090). */
export const PIECE_COLOUR_NAMES = ['Chalk', 'Linen', 'Oat', 'Walnut', 'Espresso', 'Stone grey', 'Charcoal', 'Slate blue']
