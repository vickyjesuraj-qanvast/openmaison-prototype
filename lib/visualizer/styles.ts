import { DESIGN_STYLES } from './data/styles.gen'

/* AI Visualizer (REG-673) — the 25 design styles, 1.0's `design-styles.ts` (B-87). Pure and client-safe. */

export type Finish = 'matte' | 'gloss' | 'satin' | 'textured' | 'natural'
export type ColorFamily = 'warm' | 'cool' | 'neutral' | 'bold'
export type DesignStyle = {
  id: string
  name: string
  /** The card's one line (1.0's words). */
  description: string
  /** How a material fits the style: tags score 3, a finish 2, a colour family 1 (1.0's `suggestMaterials`). */
  affinities: { tags: string[]; finishes: Finish[]; colorFamilies: ColorFamily[] }
  colorTemperature: 'warm' | 'cool' | 'neutral'
  /** The five colours on the card — wall, accent, wood / material, metal, pop. */
  colorPalette: string[]
}

export { DESIGN_STYLES }
export const STYLE_NAMES = DESIGN_STYLES.map((s) => s.name)
export const styleByName = (name: string | null | undefined): DesignStyle | null => (name ? DESIGN_STYLES.find((s) => s.name === name) ?? null : null)

/** (Q-32) The lead's style preference (the lead form's list, `STYLE_OPTIONS`) → the visualizer's style of that name or its nearest. */
const LEAD_STYLE_ALIAS: Record<string, string> = { Contemporary: 'Modern', 'Mid-century': 'Mid-Century Modern', Luxury: 'Dubai Luxury', Eclectic: 'Bohemian' }
export function styleForLead(leadStyle: string | null | undefined): DesignStyle | null {
  if (!leadStyle) return null
  return styleByName(LEAD_STYLE_ALIAS[leadStyle] ?? leadStyle)
}

/** The five 1.0 styles with finished renders of the sample rooms (1.0's `VISUALIZER_SAMPLE_STYLES`). */
export const RENDERED_STYLES = ['Scandinavian', 'Industrial', 'Japandi', 'Bohemian', 'Dubai Luxury'] as const
export const styleSlug = (name: string) => name.toLowerCase().replace(/\s+/g, '-')
