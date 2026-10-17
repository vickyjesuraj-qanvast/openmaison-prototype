/** (UX audit build · the owner 2026-09-30) The AI Visualizer welcome's after: the living-room sample's own photo painted by the engine
 *  (`scripts/viz/welcome-render.mts`), so its before/after is one photo — what the picks change and nothing else. What it applied is the
 *  caption's word. */
export const WELCOME_AFTER = {
  sample: 'living-room',
  walls: 'paint-013',   // Mushroom
  floor: 'floor-006',   // Walnut Engineered
  sofa: { colour: 'Terracotta', material: 'Velvet' },
  image: '/visualizer/welcome/living-room-after.jpg',
  /** (S43B · F1-03) its before: the sample's own photo (SAMPLE_ROOMS' `original`, lib/visualizer/samples.ts) — named here so a light page (the
      website) shows the pair without the samples' tracings */
  before: '/visualizer/samples/living-room/original.jpg',
  /** The caption's short name for the look. */
  label: 'Mushroom walls · walnut floor · terracotta sofa',
  /** (S43B · F1-03) the three picks as swatches, in their own colours — the catalogue's `paint-013` · `floor-006` swatches and the sofa colour's
      (`COLOUR_HEX`, lib/visualizer/furniture.ts) — for the website's before/after, which shows this same pair */
  swatches: [{ name: 'Mushroom', hex: '#B5A99A' }, { name: 'Walnut', hex: '#6D4C3D' }, { name: 'Terracotta', hex: '#C2633D' }],
} as const
