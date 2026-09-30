/** (UX audit build · the owner 2026-09-30) The AI Visualizer welcome's after: the living-room sample's own photo painted by the engine
 *  (`scripts/viz/welcome-render.mts`), so its before/after is one photo — what the picks change and nothing else. What it applied is the
 *  caption's word. */
export const WELCOME_AFTER = {
  sample: 'living-room',
  walls: 'paint-013',   // Mushroom
  floor: 'floor-006',   // Walnut Engineered
  sofa: { colour: 'Terracotta', material: 'Velvet' },
  image: '/visualizer/welcome/living-room-after.jpg',
  /** The caption's short name for the look. */
  label: 'Mushroom walls · walnut floor · terracotta sofa',
} as const
