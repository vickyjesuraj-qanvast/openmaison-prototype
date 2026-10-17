import { suggestMaterials } from '@/lib/visualizer/catalogue'
import { styleByName } from '@/lib/visualizer/styles'
import { OUTDOOR, type PlanDoc, type Room } from './model'
import { planFromTemplate, templateByKey, type TemplateGroup } from './templates'

/*
 * (parity map, TD-073 — 1.0's "Made with Space Planner") The planner's examples: each of the six Singapore flats furnished by the rule
 * (*Start with furniture placed*) and finished in one of the AI Visualizer's design styles — its floors and walls the style's own picks
 * from the catalogue (`suggestMaterials`, the Visualizer's style boards), wet rooms in the style's bathroom tiles. Made by rule, never a
 * model; an example opens as the studio's own copy. 1.0's four (HDB 4-Room Japandi, Condo 3-Bedroom Scandinavian, Landed, HDB 5-Room
 * Minimalist) plus the other two flats. Pure and client-safe.
 */

export type PlanExample = { key: string; template: string; style: string; name: string; group: TemplateGroup; line: string }

export const EXAMPLES: PlanExample[] = [
  { key: 'ex-hdb-4-japandi', template: 'hdb-4', style: 'Japandi' },
  { key: 'ex-condo-3-scandinavian', template: 'condo-3', style: 'Scandinavian' },
  { key: 'ex-landed-transitional', template: 'landed', style: 'Transitional' },
  { key: 'ex-hdb-5-minimalist', template: 'hdb-5', style: 'Minimalist' },
  { key: 'ex-hdb-3-modern', template: 'hdb-3', style: 'Modern' },
  { key: 'ex-condo-2-tropical', template: 'condo-2', style: 'Tropical' },
].map((e) => {
  const t = templateByKey(e.template)!
  return { ...e, name: `${t.name} — ${e.style}`, group: t.group, line: styleByName(e.style)?.description ?? t.line }
})
export const exampleByKey = (key: string | null | undefined) => EXAMPLES.find((e) => e.key === key) ?? null

const WET: Room['kind'][] = ['bathroom', 'yard']
/** An example as a fresh plan: the flat, furnished, each room's floor and walls in the style's materials (outside spaces keep theirs). */
export function examplePlan(key: string): PlanDoc | null {
  const e = exampleByKey(key)
  if (!e) return null
  const base = planFromTemplate(e.template, true)
  const pick = (label: string) => suggestMaterials(label, e.style, 1)[0]?.id ?? null
  const floor = pick('Floor'), walls = pick('Walls'), wetFloor = pick('Bathroom Floor'), wetWalls = pick('Bathroom Wall')
  const rooms = base.rooms.map((r): Room => {
    if (OUTDOOR.includes(r.kind)) return r
    if (WET.includes(r.kind)) return { ...r, floor: wetFloor, wall: wetWalls }
    if (r.kind === 'kitchen') return { ...r, floor: wetFloor ?? floor, wall: walls }   // a Singapore kitchen is tiled underfoot
    return { ...r, floor, wall: walls }
  })
  return { ...base, rooms }
}
