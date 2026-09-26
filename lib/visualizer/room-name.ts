/*
 * (audit 2026-09-26, fresh eyes) A room made from a photo takes a room's name, not the file's: "sophia-living-room.jpg" → "Living room",
 * "IMG_2034.jpg" → nothing (the server then names it "Room n"). Pure, client-safe. The words are Singapore homes' rooms.
 */
const ROOMS: [RegExp, string][] = [
  [/\bmaster\s*(bed\s*room|bedroom|br)\b/, 'Master bedroom'],
  [/\b(living\s*(and|&)?\s*dining|living\s*dining)\b/, 'Living and dining'],
  [/\bliving\s*(room|area)?\b|\blounge\b/, 'Living room'],
  [/\bdining\s*(room|area)?\b/, 'Dining room'],
  [/\bkitchen\b|\bpantry\b/, 'Kitchen'],
  [/\b(bed\s*room|bedroom)\b|\bbr\s?\d\b/, 'Bedroom'],
  [/\b(kids|children'?s?)\s*(room|bedroom)?\b|\bnursery\b/, 'Kids’ room'],
  [/\b(bath\s*room|bathroom|toilet|wc|powder\s*room)\b/, 'Bathroom'],
  [/\bstudy\b|\b(home\s*)?office\b/, 'Study'],
  [/\bbalcony\b|\bpatio\b/, 'Balcony'],
  [/\bfoyer\b|\bentrance\b|\bentryway\b/, 'Foyer'],
  [/\b(yard|utility|service)\s*(area|room)?\b|\blaundry\b/, 'Utility area'],
  [/\bwalk[-\s]?in\s*(wardrobe|closet)\b|\bwardrobe\b/, 'Walk-in wardrobe'],
  [/\bstore\s*room\b|\bstoreroom\b|\bbomb\s*shelter\b/, 'Storeroom'],
]
/** The camera's own names carry nothing a studio would call a room. */
const CAMERA = /^(img|dsc|dscn|dcim|pxl|photo|image|screenshot|whatsapp image|scan|picture|mvimg|p\d{6,})[\s_-]*[\d\s_.-]*/i

/** The room a file's name speaks of, else its own words when they read as a name, else null ("Room n"). */
export function roomNameFromFile(fileName: string): string | null {
  const stem = fileName.replace(/\.[a-z0-9]{2,5}$/i, '').replace(/[-_.]+/g, ' ').replace(/\s+/g, ' ').trim()
  const words = stem.toLowerCase()
  for (const [re, name] of ROOMS) if (re.test(words)) return name
  if (!stem || CAMERA.test(stem) && !/[a-z]{3,}/i.test(stem.replace(CAMERA, ''))) return null
  if (!/[a-z]{2,}/i.test(stem)) return null
  const clean = stem.slice(0, 40)
  return clean.charAt(0).toUpperCase() + clean.slice(1)
}
