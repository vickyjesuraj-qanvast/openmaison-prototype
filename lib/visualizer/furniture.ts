import { FURNITURE_CATEGORIES, FURNITURE_PRESETS } from './data/furniture.gen'
import type { Pt } from './engine/pixels'

/* AI Visualizer (REG-674) — furniture: the presets, Customize's finish tables and the Replace suggestions, 1.0's `visualizer.tsx` +
   `furniture-presets.ts` (B-78…B-82). Pure and client-safe. */

export { FURNITURE_CATEGORIES, FURNITURE_PRESETS }
export type FurnitureCategory = (typeof FURNITURE_CATEGORIES)[number]
export type FurniturePreset = { id: string; label: string; category: string; description: string; styleAffinities: string[] }

/** keep is the silent default; the row offers Remove · Replace · Customize (1.0 B-02). */
export type FurnitureAction = 'keep' | 'remove' | 'replace' | 'customize'
export type FurniturePick = { action: FurnitureAction; replacementDesc: string | null; customizeMaterial: string | null; customizeColor: string | null; refImage: string | null }
export const KEEP: FurniturePick = { action: 'keep', replacementDesc: null, customizeMaterial: null, customizeColor: null, refImage: null }
/** Pressing the active action returns to keep; each action clears the fields that do not belong to it (1.0's `nextFurnitureForAction`). */
export function nextPick(p: FurniturePick, a: FurnitureAction): FurniturePick {
  const next: FurnitureAction = p.action === a ? 'keep' : a
  if (next === 'keep' || next === 'remove') return { ...KEEP, action: next }
  if (next === 'replace') return { ...p, action: next, customizeMaterial: null, customizeColor: null }
  return { ...p, action: next, refImage: null }
}

/** (D3, verify round 1) The parts of a piece a finish can name — a fig's pot, an artwork's frame (its outline without the canvas), a TV's
    body (bezel and stand, never the screen), a lamp's shade and its base. Traced on the sample pieces (samples.ts `parts`). */
export type PartKey = 'pot' | 'frame' | 'body' | 'shade' | 'base'
/** A part's outline: `shape` (one or more outlines) without its `holes` (the canvas inside a frame, the screen inside a TV). */
export type PiecePart = { shape: Pt[][]; holes?: Pt[][] }
export type PieceParts = Partial<Record<PartKey, PiecePart>>
export const PART_WORD: Record<PartKey, string> = { pot: 'pot', frame: 'frame', body: 'frame and stand', shade: 'shade', base: 'base' }
/** `part` — the row finishes that part of the piece only (a Planter row the pot, never the leaves); a row without it finishes the piece. */
export type FinishGroup = { heading: string; options: string[]; part?: PartKey }
/** A word list as a matcher that takes plurals too ("curtain" finds "sheer curtains", "bench" "benches") — as 1.0's `containsAny` (F029). */
const words = (ws: string[]) => new RegExp(`\\b(?:${ws.map((w) => w.replace(/\s+/g, '\\s+')).join('|')})(?:s|es|ies)?\\b`)
/** Customize's finish chips, chosen by the piece's label — first match wins (1.0's `FURNITURE_FINISH_TYPES`). Bedding is its own row
    (a bedspread is cloth, not a headboard), ahead of the bed's. */
const FINISH_TYPES: { match: RegExp; heading: string; options: string[]; part?: PartKey }[] = [
  { match: words(['rug', 'carpet', 'runner']), heading: 'Weave / pile', options: ['Wool', 'Jute', 'Cotton flatweave', 'Shag pile', 'Persian-style', 'Sisal', 'Hide'] },
  { match: words(['curtain', 'drape', 'drapery', 'blind']), heading: 'Fabric', options: ['Linen', 'Cotton', 'Velvet', 'Sheer voile', 'Blackout'] },
  { match: words(['bedspread', 'duvet', 'quilt', 'coverlet', 'blanket', 'throw', 'cushion', 'pillow', 'bedding']), heading: 'Fabric', options: ['Linen', 'Cotton', 'Knit', 'Velvet', 'Bouclé', 'Wool'] },
  { match: words(['pendant', 'chandelier', 'sconce', 'lamp', 'light', 'lantern']), heading: 'Shade / finish', options: ['Brass', 'Matte black', 'Chrome', 'Brushed nickel', 'Opal glass', 'Smoked glass', 'Rattan shade', 'Linen shade'] },
  { match: words(['bar stool', 'counter stool', 'stool']), heading: 'Material', options: ['Leather', 'Velvet', 'Solid wood', 'Matte black metal', 'Woven rattan'] },
  { match: words(['bench', 'ottoman', 'pouf', 'pouffe']), heading: 'Upholstery', options: ['Velvet', 'Linen', 'Leather', 'Bouclé', 'Woven'] },
  { match: words(['dining chair', 'armchair', 'accent chair', 'lounge', 'chair', 'wingback']), heading: 'Upholstery', options: ['Velvet', 'Linen', 'Bouclé', 'Leather', 'Woven rattan', 'Moulded plastic', 'Solid wood'] },
  { match: words(['sofa', 'couch', 'sectional', 'loveseat', 'settee']), heading: 'Upholstery', options: ['Velvet', 'Linen', 'Bouclé', 'Leather', 'Chenille', 'Cotton weave'] },
  { match: words(['bed', 'headboard', 'daybed']), heading: 'Headboard', options: ['Velvet upholstered', 'Linen upholstered', 'Leather upholstered', 'Bouclé upholstered', 'Solid wood', 'Rattan'] },
  /* (verify round 1) a TV console is storage — its fronts, not a table top ("console table" stays a table) */
  { match: words(['tv console', 'media console', 'tv unit', 'media unit', 'tv cabinet', 'entertainment unit']), heading: 'Front / finish', options: ['Natural oak veneer', 'Walnut veneer', 'Matte lacquer', 'Gloss lacquer', 'Fluted wood', 'Rattan front', 'Glass front', 'Matte black'] },
  { match: words(['coffee table', 'side table', 'console', 'nightstand', 'bedside', 'end table', 'dining table', 'desk', 'table']), heading: 'Top / finish', options: ['Natural oak', 'Walnut', 'Black ash', 'White oak', 'Marble', 'Travertine', 'Glass', 'Matte black metal'] },
  { match: words(['wardrobe', 'cabinet', 'sideboard', 'credenza', 'dresser', 'chest', 'bookshelf', 'bookshelves', 'shelf', 'shelves', 'shelving', 'drawer', 'tv unit', 'media unit', 'vanity']), heading: 'Front / finish', options: ['Natural oak veneer', 'Walnut veneer', 'Matte lacquer', 'Gloss lacquer', 'Fluted wood', 'Rattan front', 'Glass front', 'Matte black'] },
  { match: words(['mirror', 'painting', 'artwork', 'art', 'print', 'poster', 'frame', 'canvas']), heading: 'Frame', options: ['Brass frame', 'Black frame', 'Natural wood frame', 'Gold-leaf frame', 'Slim metal frame', 'Frameless'], part: 'frame' },
  { match: words(['plant', 'planter', 'tree', 'fern', 'palm', 'succulent', 'pot', 'fig']), heading: 'Planter', options: ['Terracotta pot', 'Ceramic pot', 'Concrete pot', 'Woven basket', 'Matte black pot', 'Glazed stoneware'], part: 'pot' },
  { match: words(['vase', 'sculpture', 'bowl', 'figurine', 'ornament', 'object']), heading: 'Material', options: ['Ceramic', 'Terracotta', 'Brass', 'Marble', 'Glass', 'Stoneware'] },
  /* (D3) a TV's finish is its frame and stand — never the screen */
  { match: words(['tv', 'television']), heading: 'Finish', options: ['Stainless steel', 'Matte black', 'Gloss white', 'Panel-ready', 'Cream retro'], part: 'body' },
  { match: words(['fridge', 'refrigerator', 'oven', 'microwave', 'dishwasher', 'washer', 'dryer', 'hood', 'cooktop', 'stove']), heading: 'Finish', options: ['Stainless steel', 'Matte black', 'Gloss white', 'Panel-ready', 'Cream retro'] },
  { match: words(['sink', 'basin', 'bath', 'bathtub', 'toilet', 'shower', 'faucet', 'tap']), heading: 'Finish', options: ['Chrome', 'Brushed brass', 'Matte black', 'White ceramic', 'Stone'] },
]
const FINISH_BY_CATEGORY: Record<string, FinishGroup> = {
  Seating: { heading: 'Upholstery', options: ['Velvet', 'Linen', 'Bouclé', 'Leather', 'Cotton weave', 'Chenille', 'Woven rattan'] },
  Beds: { heading: 'Headboard', options: ['Velvet upholstered', 'Linen upholstered', 'Leather upholstered', 'Solid wood', 'Rattan'] },
  Tables: { heading: 'Top / finish', options: ['Natural oak', 'Walnut', 'Black ash', 'White oak', 'Marble', 'Glass', 'Matte black metal'] },
  Storage: { heading: 'Front / finish', options: ['Natural oak veneer', 'Walnut veneer', 'Matte lacquer', 'Gloss lacquer', 'Fluted wood', 'Glass front', 'Matte black'] },
  Lighting: { heading: 'Shade / finish', options: ['Brass', 'Matte black', 'Chrome', 'Brushed nickel', 'Opal glass', 'Rattan shade'] },
  Decor: { heading: 'Material', options: ['Ceramic', 'Terracotta', 'Brass', 'Marble', 'Glass', 'Woven'] },
  Appliances: { heading: 'Finish', options: ['Stainless steel', 'Matte black', 'Gloss white', 'Panel-ready'] },
  Fixtures: { heading: 'Finish', options: ['Chrome', 'Brushed brass', 'Matte black', 'White ceramic'] },
}
const FINISH_GENERIC: FinishGroup = { heading: 'Material / finish', options: ['Matte white', 'Matte black', 'Brushed steel', 'Brass', 'Natural wood', 'Walnut', 'Marble'] }
export const FURNITURE_COLOURS = ['Charcoal', 'Cream', 'Sage green', 'Terracotta', 'Navy', 'Emerald', 'Mustard', 'Blush pink', 'Tan', 'Light grey', 'Off-white', 'Black']
export function customizeFinishes(label: string, category: string): FinishGroup {
  const l = label.toLowerCase()
  for (const t of FINISH_TYPES) if (t.match.test(l)) return { heading: t.heading, options: t.options, ...(t.part ? { part: t.part } : {}) }
  return FINISH_BY_CATEGORY[category] ?? FINISH_GENERIC
}
/**
 * (D3, verify round 1) The finish row Customize offers for a piece: a row that names a part (Planter, Frame, a TV's Finish) only where
 * the photo marks that part (`parts`) — on a piece without it there is no finish row, and the Colour row finishes the whole piece.
 */
export function finishRowFor(piece: { label: string; category: string; parts?: PieceParts }): FinishGroup | null {
  const row = customizeFinishes(piece.label, piece.category)
  return row.part && !piece.parts?.[row.part] ? null : row
}
/**
 * (D3) Where a Customize lands on a piece: the part its row names (the pot, the frame, the TV's frame and stand) — a colour picked with
 * it too; a lamp's shade for a shade or a glass, its base for a metal; null — the whole piece. `blocked` — the row names a part the
 * photo doesn't mark: the engine refuses rather than paint the leaves, the canvas or the screen.
 */
export function customizePart(piece: { label: string; category: string; parts?: PieceParts }, finish: string | null): { part: PartKey | null; blocked: PartKey | null } {
  const row = customizeFinishes(piece.label, piece.category), parts = piece.parts ?? {}
  if (row.part) {
    if (parts[row.part]) return { part: row.part, blocked: null }
    return { part: null, blocked: finish && row.options.includes(finish) ? row.part : null }
  }
  if (row.heading === 'Shade / finish' && (parts.shade || parts.base)) {
    const shadeWord = !finish || /shade|glass/i.test(finish)
    const part: PartKey | null = shadeWord ? (parts.shade ? 'shade' : null) : parts.base ? 'base' : null
    return { part, blocked: null }
  }
  return { part: null, blocked: null }
}
/** (wave E, surfaces-20) A Customize's colour and finish in words: the colour, then the finish in lower case — a finish picked WITH a colour
    loses its own colour word ('Navy' + 'Matte black pot' → 'Navy matte pot', 'Tan' + 'Black frame' → 'Tan frame'), never "Navy matte black
    pot". */
export function customizeWords(colour: string | null, finish: string | null): string {
  return [colour?.trim(), finishBesideColour(colour, finish).toLowerCase()].filter(Boolean).join(' ')
}
/** A finish as it reads beside a picked colour — without a colour word of its own ('Matte black pot' beside 'Navy' → 'Matte pot'). */
function finishBesideColour(colour: string | null, finish: string | null): string {
  if (!finish) return ''
  return colour ? finish.replace(/\b(?:black|white|cream)\b/gi, '').replace(/\s{2,}/g, ' ').trim() : finish.trim()
}
/** What the render is told for a Customize: "{colour} {finish}, {free text}" (1.0's `composeCustomizeDesc`). */
export function composeCustomizeDesc(p: FurniturePick): string {
  /* (wave E · wave F, surfaces-20) the finish loses its own colour word when a colour was picked with it, and reads in sentence case
     after it ('Navy matte pot', 'Emerald velvet'); a finish alone keeps its own words ('Matte black pot') */
  const palette = p.customizeColor ? customizeWords(p.customizeColor, p.customizeMaterial) : (p.customizeMaterial ?? '').trim()
  const free = (p.replacementDesc ?? '').trim()
  return [palette, free].filter(Boolean).join(', ')
}

/** (§5.3) The engine's colours for Customize's chips — a colour chip wins; a finish alone gives its own colour, or keeps the piece's. */
export const COLOUR_HEX: Record<string, string> = { Charcoal: '#3A4148', Cream: '#EFE5D1', 'Sage green': '#98AB8A', Terracotta: '#C2633D', Navy: '#233050', Emerald: '#1F6B4F', Mustard: '#D2A128', 'Blush pink': '#E7B7B9', Tan: '#C09A6D', 'Light grey': '#C8CACC', 'Off-white': '#F2EEE5', Black: '#1D1D1D' }
export const FINISH_HEX: Record<string, string | null> = {
  Wool: '#D9D0C1', Jute: '#B8996A', 'Cotton flatweave': '#E3DCCF', 'Shag pile': '#E6DFD2', 'Persian-style': '#8E3B2F', Sisal: '#C2A878', Hide: '#8B6A4E',
  Linen: '#D8CFC0', Cotton: '#EFEAE0', Knit: null, Velvet: null, 'Sheer voile': '#F4F1EA', Blackout: '#3B3B3B', Chenille: null, 'Cotton weave': '#E6DFD2', Bouclé: '#EDE6DA', Leather: '#7A4A2A', Woven: '#BFA37A',
  Brass: '#B59B4E', 'Matte black': '#232323', Chrome: '#C8CCD0', 'Brushed nickel': '#A8A9A4', 'Opal glass': '#F0EEE8', 'Smoked glass': '#4A4A4A', 'Rattan shade': '#C8A26B', 'Linen shade': '#E7DDCB',
  'Solid wood': '#9A6B43', 'Matte black metal': '#242424', 'Woven rattan': '#C19A5B', 'Moulded plastic': null,
  'Velvet upholstered': null, 'Linen upholstered': '#D8CFC0', 'Leather upholstered': '#7A4A2A', 'Bouclé upholstered': '#EDE6DA', Rattan: '#C19A5B',
  'Natural oak': '#C8A165', Walnut: '#6B4A2E', 'Black ash': '#2B2622', 'White oak': '#D9C3A0', Marble: '#E7E4DF', Travertine: '#D8C8AE', Glass: '#DCE3E6',
  'Natural oak veneer': '#C8A165', 'Walnut veneer': '#6B4A2E', 'Matte lacquer': '#EDEBE6', 'Gloss lacquer': '#F4F3EF', 'Fluted wood': '#B08A5B', 'Rattan front': '#C19A5B', 'Glass front': '#CBD5D8',
  'Brass frame': '#B59B4E', 'Black frame': '#1E1E1E', 'Natural wood frame': '#B8905F', 'Gold-leaf frame': '#CFA84A', 'Slim metal frame': '#8C8C8C', Frameless: null,
  'Terracotta pot': '#C2633D', 'Ceramic pot': '#EDEAE4', 'Concrete pot': '#9C9A96', 'Woven basket': '#BFA37A', 'Matte black pot': '#232323', 'Glazed stoneware': '#6E7F7A',
  Ceramic: '#EDEAE4', Terracotta: '#C2633D', Stoneware: '#8E857A',
  'Stainless steel': '#C0C3C6', 'Gloss white': '#F6F6F4', 'Panel-ready': null, 'Cream retro': '#EFE3C8',
  'Brushed brass': '#B39B5A', 'White ceramic': '#F3F2EE', Stone: '#BDB5A8', 'Matte white': '#F2F2EF', 'Brushed steel': '#A9ABAD', 'Natural wood': '#B8905F',
}
/** How a chosen finish reads on the photo: shine, weave or grain. */
export function finishSheen(finish: string | null): 'gloss' | 'satin' | 'textured' | 'natural' | 'matte' {
  if (!finish) return 'matte'
  const f = finish.toLowerCase()
  if (/gloss|chrome|glass|stainless|brass|nickel|gold|lacquer|marble/.test(f)) return f.includes('matte') ? 'matte' : 'gloss'
  if (/velvet|leather|chenille|satin/.test(f)) return 'satin'
  if (/wool|jute|sisal|shag|boucl|linen|weave|woven|rattan|cotton|hide|pile|knit/.test(f)) return 'textured'
  if (/oak|walnut|wood|ash|veneer|flut|teak/.test(f)) return 'natural'
  return 'matte'
}

/** A word with an optional plural, bounded — "light" matches "lights" (1.0's `containsAny`). */
function containsAny(label: string, words: string[]): boolean {
  return new RegExp(`\\b(?:${words.map((w) => w.replace(/\s+/g, '\\s+')).join('|')})(?:s|es|ies)?\\b`, 'i').test(label)
}
/** The detector's category, corrected from the label (1.0's `inferCategoryFromLabel`). */
export function inferCategoryFromLabel(detected: string, fallback: string): string {
  const l = detected.toLowerCase().replace(/\([^)]*\)/g, '').trim()
  if (containsAny(l, ['painting', 'artwork', 'canvas', 'poster', 'print', 'photograph', 'frame', 'framed', 'wall art', 'gallery', 'galleries', 'tapestry', 'tapestries', 'mirror', 'plant', 'planter', 'flower', 'tree', 'vase', 'sculpture', 'rug', 'carpet', 'mat', 'throw pillow', 'cushion', 'pillow', 'blanket', 'throw', 'quilt', 'duvet', 'coverlet', 'curtain', 'drape', 'drapery', 'decor'])) return 'Decor'
  if (containsAny(l, ['lamp', 'light', 'lighting', 'sconce', 'chandelier', 'pendant', 'lantern', 'bulb', 'spotlight', 'flush mount'])) return 'Lighting'
  if (containsAny(l, ['shelf', 'shelves', 'bookshelf', 'cabinet', 'wardrobe', 'bookcase', 'dresser', 'credenza', 'sideboard', 'cupboard', 'chest'])) return 'Storage'
  if (containsAny(l, ['table', 'desk', 'nightstand', 'console', 'coffee table', 'dining table', 'side table'])) return 'Tables'
  if (containsAny(l, ['sofa', 'couch', 'chair', 'armchair', 'stool', 'bench', 'ottoman', 'pouf', 'sectional', 'loveseat', 'recliner'])) return 'Seating'
  if (containsAny(l, ['bed', 'headboard', 'mattress'])) return 'Beds'
  if (containsAny(l, ['fridge', 'refrigerator', 'oven', 'stove', 'microwave', 'dishwasher', 'washer', 'dryer'])) return 'Appliances'
  if (containsAny(l, ['sink', 'bathtub', 'toilet', 'shower', 'faucet', 'vanity', 'basin'])) return 'Fixtures'
  return fallback
}

const GENERIC_WORDS = new Set(['the', 'and', 'with', 'for', 'from', 'left', 'right', 'center', 'centre', 'top', 'bottom', 'near', 'above', 'below', 'side', 'corner', 'wall', 'mounted', 'floor', 'standing', 'freestanding', 'ceiling', 'built', 'large', 'small', 'tall', 'wide', 'mini', 'big', 'modern', 'wooden', 'wood', 'metal', 'metallic', 'glass', 'fabric', 'leather', 'velvet', 'rattan', 'plastic', 'matte', 'dark', 'light', 'black', 'white', 'grey', 'gray', 'brown', 'beige', 'cream', 'navy', 'green', 'blue', 'red', 'gold', 'silver', 'tan', 'oak', 'walnut'])
const CATEGORY_NOUN: Record<string, string> = { Seating: 'armchair', Tables: 'table', Storage: 'cabinet', Beds: 'bed', Lighting: 'light fixture', Decor: 'decor piece', Appliances: 'appliance', Fixtures: 'fixture' }
/** (F044) The kinds of piece a label can be, two words first ("coffee table" is not a "dining table"); `FAMILY` puts one kind's names
    together (a wingback is an armchair; a fig is a plant). */
const TYPES = ['coffee table', 'side table', 'dining table', 'console table', 'end table', 'bedside table', 'accent table', 'tv console', 'media console', 'tv unit', 'media unit', 'dining chair', 'accent chair', 'lounge chair', 'office chair', 'bar chair', 'bar stool', 'counter stool', 'floor lamp', 'table lamp', 'desk lamp', 'task lamp', 'wall sconce', 'pendant light', 'area rug', 'platform bed', 'display cabinet', 'wall art', 'gallery wall', 'fiddle leaf fig']
const FAMILY: Record<string, string> = { wingback: 'armchair', 'accent chair': 'armchair', 'lounge chair': 'armchair', couch: 'sofa', settee: 'sofa', sectional: 'sofa', loveseat: 'sofa',
  'bedside table': 'nightstand', 'media console': 'tv console', 'tv unit': 'tv console', 'media unit': 'tv console', sideboard: 'tv console', credenza: 'tv console',
  'pendant light': 'pendant', chandelier: 'pendant', 'counter stool': 'bar stool', 'area rug': 'rug', carpet: 'rug', 'fiddle leaf fig': 'plant', fig: 'plant', palm: 'plant', fern: 'plant', tree: 'plant',
  'wall art': 'art', 'gallery wall': 'art', canvas: 'art', print: 'art', poster: 'art', painting: 'art', headboard: 'bed', bedspread: 'throw', blanket: 'throw', quilt: 'throw', duvet: 'throw', drape: 'curtain', 'task lamp': 'desk lamp', television: 'tv' }
/** (pending modules S43C) Words that end in an s and are one thing ("pothos", "canvas") — never cut to "potho". */
const ONE_WITH_S = new Set(['pothos', 'canvas', 'cactus', 'hibiscus', 'lotus', 'atlas'])
const singular = (w: string) => (w.length > 3 && w.endsWith('s') && !w.endsWith('ss') && !ONE_WITH_S.has(w) ? w.slice(0, -1) : w)
/** (pending modules S43C) A label's letters without their accents ("bouclé" → "boucle"), so a word is never cut at an accented letter
    ("Bouclé sofa" was read as "Boucl sofa"). */
const plainLetters = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
/** A label's (or a preset's) kind: the two-word kind it ends with, else its last noun — before any "in / with" ("fig in a pot" is a fig). */
function typeOf(text: string): { type: string; head: string } | null {
  const main = plainLetters(text.toLowerCase()).replace(/\([^)]*\)/g, '').split(/\s+(?:in|with|on|for|and)\s+/)[0]!.replace(/[^a-z\s-]/g, ' ').trim()
  const ws = main.split(/[\s-]+/).filter(Boolean).map(singular)
  if (!ws.length) return null
  const two = ws.length > 1 ? `${ws[ws.length - 2]} ${ws[ws.length - 1]}` : ''
  const three = ws.length > 2 ? `${ws[ws.length - 3]} ${two}` : ''
  const type = TYPES.includes(three) ? three : TYPES.includes(two) ? two : ws[ws.length - 1]!
  return { type, head: ws[ws.length - 1]! }
}
const canon = (t: string) => FAMILY[t] ?? FAMILY[t.split(' ').slice(-1)[0]!] ?? t
/** (wave F) A kind named by a plainer word in a caption ("Plant" for a fiddle leaf fig, "Rug" for an area rug). */
const KIND_WORD: Record<string, string> = { 'fiddle leaf fig': 'plant', 'area rug': 'rug' }
/** (wave F) Words that say what a piece is made of or finished in — never its kind ("linen curtains" are curtains). */
const FINISH_WORDS = new Set([...GENERIC_WORDS, 'linen', 'sheer', 'jute', 'knit', 'ceramic', 'upholstered', 'rattan', 'terracotta', 'marble', 'brass', 'chrome', 'cotton', 'wool', 'boucle', 'bouclé', 'concrete', 'stone', 'stainless', 'steel', 'cast', 'iron', 'undermount', 'framed', 'fabric', 'painted', 'woven', 'lacquered', 'sage', 'emerald', 'charcoal', 'ivory', 'taupe', 'olive', 'mustard', 'pink', 'yellow', 'orange', 'purple', 'teal'])
const cap = (s: string) => `${s.charAt(0).toUpperCase()}${s.slice(1)}`.replace(/\btv\b/gi, 'TV')
/**
 * (wave F) A piece in a version's caption: by its kind, never the photo's description of it — that carries the finish a change replaced
 * ("Sofa" for the grey fabric sofa made navy, "Coffee table", "Curtains" for the sheer ones). A kind the list doesn't know keeps the word
 * that says what it is ("Chopping board", "Basil plant"). A Customize that landed on one part names the part ("Planter" for a fig whose
 * pot was painted, "Art frame", "Lamp shade"). Sentence case.
 */
export function pieceKind(label: string, part?: PartKey | null): string {
  if (part === 'pot') return 'Planter'
  if (part === 'shade') return 'Lamp shade'
  if (part === 'base') return 'Lamp base'
  const main = plainLetters(label.toLowerCase()).replace(/\([^)]*\)/g, '').split(/\s+(?:in|with|on|for|and|of)\s+/)[0]!.replace(/[^a-z\s-]/g, ' ').trim()
  const ws = main.split(/[\s-]+/).filter(Boolean), sing = ws.map(singular)
  if (!ws.length) return label.trim()
  const n = sing.length, two = n > 1 ? `${sing[n - 2]} ${sing[n - 1]}` : '', three = n > 2 ? `${sing[n - 3]} ${two}` : ''
  const prev = n > 1 ? ws[n - 2]! : null
  let kind = TYPES.includes(three) ? three : TYPES.includes(two) ? two : prev && !FINISH_WORDS.has(prev) && !FINISH_WORDS.has(singular(prev)) ? two : sing[n - 1]!
  kind = KIND_WORD[kind] ?? kind
  const last = ws[n - 1]!
  if (last.length > 3 && /s$/.test(last) && !/ss$/.test(last) && !ONE_WITH_S.has(last) && !/s$/.test(kind)) kind += 's'   // "sheer curtains" → Curtains
  if (part === 'frame') { const fam = canon(sing[n - 1]!); return /frame|mirror/.test(fam) ? cap(fam) : `${cap(fam)} frame` }
  return cap(kind)
}
/**
 * Replace's Quick picks (1.0's `suggestReplacements`, B-79), by kind first (F044): the presets of the piece's own kind ranked by the style
 * (+10 exact, +3 partial) — a coffee table is offered coffee tables, an armchair armchairs — then the same-kind alternatives "{Style}
 * {kind}", then presets of the bare kind whose words agree ("Scandinavian table" is a dining table, so not for a coffee table). A preset
 * of another kind with the same last word is never offered.
 */
export function suggestReplacements(category: string, style: string, limit = 4, label?: string): FurniturePreset[] {
  const cat = label ? inferCategoryFromLabel(label, category) : category
  const clean = (label ?? '').toLowerCase().replace(/\([^)]*\)/g, '').trim()
  const mine = label ? typeOf(label) : null
  const kind = mine ? canon(mine.type) : null
  const styleScore = (p: FurniturePreset) => { let n = p.styleAffinities.includes(style) ? 10 : 0; const s = style.toLowerCase(); for (const a of p.styleAffinities) if (s && (a.toLowerCase().includes(s) || s.includes(a.toLowerCase()))) n += 3; return n }
  const exact: { p: FurniturePreset; score: number }[] = [], weak: { p: FurniturePreset; score: number }[] = []
  for (const p of FURNITURE_PRESETS) {
    if (!kind) { if (p.category.toLowerCase() === cat.toLowerCase()) weak.push({ p, score: styleScore(p) }); continue }
    const byLabel = typeOf(p.label), byDesc = typeOf(p.description.split(/[,.;]/)[0] ?? '')
    /* a bare label ("Scandinavian table") takes its kind from its words ("… dining table") */
    const t = byLabel && byLabel.type === byLabel.head && byDesc && byDesc.head === byLabel.head ? byDesc : byLabel
    if (!t) continue
    const theirs = canon(t.type)
    if (theirs === kind) exact.push({ p, score: styleScore(p) + 20 })
    else if (t.type === t.head && canon(t.head) === canon(mine!.head) && !TYPES.includes(mine!.type)) weak.push({ p, score: styleScore(p) + 4 })
  }
  exact.sort((a, b) => b.score - a.score); weak.sort((a, b) => b.score - a.score)
  const word = kind ?? (clean.split(/\s+/).filter((w) => w && !GENERIC_WORDS.has(w)).join(' ').trim() || CATEGORY_NOUN[cat] || '')
  /* (verify round 1) in the presets' own case — "Scandinavian coffee table", "Modern TV console" */
  const generated: FurniturePreset[] = word ? [style, 'Modern', 'Scandinavian', 'Mid-century', 'Industrial', 'Minimalist', 'Luxury'].filter((d, i, all) => d && all.indexOf(d) === i)
    .map((d, i) => ({ id: `gen-${i}`, label: `${d} ${word}`.replace(/\btv\b/gi, 'TV'), category: cat, description: `a ${d.toLowerCase()} ${word}, in keeping with the room`, styleAffinities: [] })) : []
  const seen = new Set<string>(), out: FurniturePreset[] = []
  for (const p of [...exact.map((x) => x.p), ...generated, ...weak.map((x) => x.p)]) { const k = p.label.toLowerCase(); if (seen.has(k)) continue; seen.add(k); out.push(p); if (out.length >= limit) break }
  return out
}

/** (verify round 1, fresh-desktop) What a Replace swapped the piece for, in a few words the client can read: a Quick pick by its name
    ("a Mid-Century coffee table" — the chip's value is the preset's long description), words of the studio's own cut at a word with "…". */
export function replacementName(desc: string): string {
  const d = desc.trim()
  if (!d) return ''
  const art = (x: string) => (/^(a|an|the|my|our)\s/i.test(x) ? x : `${/^[aeiou]/i.test(x) ? 'an' : 'a'} ${x}`)
  const preset = FURNITURE_PRESETS.find((p) => p.description.trim() === d)
  if (preset) return art(preset.label)
  const gen = d.match(/^a (.+), in keeping with the room$/i)
  if (gen) return art(`${gen[1]!.charAt(0).toUpperCase()}${gen[1]!.slice(1)}`.replace(/\btv\b/gi, 'TV'))
  const first = d.split(/[.;\n]/)[0]!.trim()
  return first.length <= 56 ? first : `${first.slice(0, 56).replace(/[\s,]+\S*$/, '')}…`
}
