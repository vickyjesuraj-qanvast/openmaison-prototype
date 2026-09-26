/**
 * (audit 2026-09-26, F021 · F049) A piece's glyph, by what it is before what shelf it sits on: the TV reads as a TV (not a toolbox),
 * the fig as a plant, the curtains as curtains — then the category's glyph. Pure; every name is in the Material Symbols subset
 * (public/fonts/ICONS.txt), so none can render as a word. Order matters: "oak TV console" is storage, not a TV.
 */
const BY_WORD: [RegExp, string][] = [
  [/\bconsole table\b/, 'table_restaurant'],
  [/\b(console|sideboard|credenza|cabinet|dresser|chest|nightstand|bedside|wardrobe|drawers?)\b/, 'dresser'],
  [/\b(shel(f|ves)|bookcase|bookshelf|shelving)\b/, 'shelves'],
  [/\b(tv|television|monitor)\b/, 'tv'],
  [/\b(plant|fig|palm|fern|monstera|succulent|tree|planter|pot)\b/, 'potted_plant'],
  [/\b(curtains?|drapes?|drapery)\b/, 'curtains'],
  [/\b(blinds?|shades?)\b/, 'blinds'],
  [/\b(art|artwork|print|painting|poster|picture|frame|framed|mirror)\b/, 'wall_art'],
  [/\b(rug|carpet|runner|mat|bedspread|throw|blanket|cushions?|pillows?)\b/, 'texture'],
  [/\b(table lamp|desk lamp|bedside lamp)\b/, 'table_lamp'],
  [/\b(floor lamp|standing lamp|arc lamp)\b/, 'floor_lamp'],
  [/\b(pendant|chandelier|ceiling light|downlight)\b/, 'light'],
  [/\b(lamp|light|sconce)\b/, 'lightbulb'],
  [/\b(headboard|bed|mattress)\b/, 'bed'],
  [/\b(sofa|couch|settee|sectional|loveseat)\b/, 'weekend'],
  /* (F049) every table reads as a table — `table` alone is the spreadsheet grid */
  [/\b(dining table|coffee table|side table|end table|bistro table|table|desk)\b/, 'table_restaurant'],
  [/\b(fridge|refrigerator|oven|stove|hob|microwave|dishwasher|washer|dryer)\b/, 'kitchen'],
]
const BY_CATEGORY: Record<string, string> = { Seating: 'chair', Tables: 'table_restaurant', Storage: 'dresser', Beds: 'bed', Lighting: 'lightbulb', Decor: 'texture', Appliances: 'kitchen', Fixtures: 'plumbing' }
/** The glyph for a piece: its label's noun first, then its category, then a chair. */
export function furnitureGlyph(label: string, category: string): string {
  const l = label.toLowerCase().replace(/[-_]/g, ' ')
  for (const [re, glyph] of BY_WORD) if (re.test(l)) return glyph
  return BY_CATEGORY[category] ?? 'chair'
}
/** The glyphs this file can name — the subset must hold every one. */
export const FURNITURE_GLYPHS = [...new Set([...BY_WORD.map(([, g]) => g), ...Object.values(BY_CATEGORY), 'chair'])]
