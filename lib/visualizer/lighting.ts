import type { Pt } from './engine/pixels'
import { light as livingRoomLight } from './sample-rooms/living-room'
import { light as bedroomLight } from './sample-rooms/bedroom'
import { light as kitchenLight } from './sample-rooms/kitchen'

/* AI Visualizer (REG-674) — lighting: 1.0's `relight-controls.tsx` (B-93…B-99). Pure and client-safe. */

export type FixtureKey = 'cove' | 'pendants' | 'downlights' | 'accent'
export type Tri = 'on' | 'off' | 'unset'
export const FIXTURES: { key: FixtureKey; label: string }[] = [{ key: 'cove', label: 'Cove / strip' }, { key: 'pendants', label: 'Pendants' }, { key: 'downlights', label: 'Downlights' }, { key: 'accent', label: 'Accent' }]
export const EMPTY_FIXTURES: Record<FixtureKey, Tri> = { cove: 'unset', pendants: 'unset', downlights: 'unset', accent: 'unset' }
const ALL_OFF: Record<FixtureKey, Tri> = { cove: 'off', pendants: 'off', downlights: 'off', accent: 'off' }
export type RelightKnobs = { sunAngle: number; colorTemp: number; intensity: number; shadows: number; fixtures: Record<FixtureKey, Tri> }
export const RELIGHT_NEUTRAL: RelightKnobs = { sunAngle: 45, colorTemp: 4300, intensity: 50, shadows: 50, fixtures: { ...EMPTY_FIXTURES } }
export const RANGES = { sun: [0, 90], temp: [1800, 9000], intensity: [0, 100], shadows: [0, 100] } as const

/** 1.0's six moods — near-duplicates were dropped on purpose (B-94). `preview` is the same room under that light, 1.0's photo. */
export const RELIGHT_PRESETS: { id: string; label: string; desc: string; preview: string; knobs: RelightKnobs }[] = [
  { id: 'daylight', label: 'Daylight', desc: 'Bright, neutral sun through windows', preview: '/visualizer/lighting/daylight.jpg', knobs: { sunAngle: 70, colorTemp: 5600, intensity: 80, shadows: 50, fixtures: { ...ALL_OFF } } },
  { id: 'golden-hour', label: 'Golden Hour', desc: 'Warm, low, raking afternoon sun', preview: '/visualizer/lighting/golden-hour.jpg', knobs: { sunAngle: 12, colorTemp: 2500, intensity: 58, shadows: 70, fixtures: { ...ALL_OFF, accent: 'on' } } },
  { id: 'warm-cozy', label: 'Warm Cozy Home', desc: 'Dim, warm interior lamplight', preview: '/visualizer/lighting/warm-cozy.jpg', knobs: { sunAngle: 0, colorTemp: 2300, intensity: 42, shadows: 55, fixtures: { cove: 'on', pendants: 'on', downlights: 'off', accent: 'on' } } },
  { id: 'blue-hour', label: 'Blue Hour', desc: 'Cool, moody dusk with accent glow', preview: '/visualizer/lighting/blue-hour.jpg', knobs: { sunAngle: 4, colorTemp: 6400, intensity: 32, shadows: 60, fixtures: { ...ALL_OFF, cove: 'on', accent: 'on' } } },
  { id: 'overcast', label: 'Overcast', desc: 'Soft, flat, shadowless daylight', preview: '/visualizer/lighting/overcast.jpg', knobs: { sunAngle: 55, colorTemp: 6800, intensity: 46, shadows: 25, fixtures: { ...ALL_OFF } } },
  { id: 'spotlight', label: 'Directional Spotlight', desc: 'Dramatic, high-contrast accent lighting', preview: '/visualizer/lighting/spotlight.jpg', knobs: { sunAngle: 22, colorTemp: 4000, intensity: 26, shadows: 85, fixtures: { ...ALL_OFF, downlights: 'on', accent: 'on' } } },
]
export const presetById = (id: string | null | undefined) => RELIGHT_PRESETS.find((p) => p.id === id) ?? null

export const cycleTri = (t: Tri): Tri => (t === 'unset' ? 'on' : t === 'on' ? 'off' : 'unset')
/** The sliders' words (1.0 B-95). */
export const tempLabel = (k: number) => `${k}K · ${k <= 2500 ? 'amber' : k <= 3400 ? 'warm' : k <= 4600 ? 'neutral' : k <= 6000 ? 'cool' : 'daylight'}`
export const sunLabel = (a: number) => `${a <= 0 ? 'night' : a <= 25 ? 'low' : a >= 70 ? 'overhead' : 'mid'} · ${a}°`
export const intensityLabel = (i: number) => (i <= 30 ? 'dim' : i >= 70 ? 'bright' : 'moderate')
export const shadowLabel = (s: number) => (s <= 30 ? 'soft' : s >= 70 ? 'deep' : 'natural')

/** Lighting is set when a preset is on, a knob is off neutral, a fixture is set or an instruction is typed (1.0 B-12). */
export function lightingSet(k: RelightKnobs, presetId: string | null, instruction: string): boolean {
  if (presetId || instruction.trim()) return true
  if (k.sunAngle !== RELIGHT_NEUTRAL.sunAngle || k.colorTemp !== RELIGHT_NEUTRAL.colorTemp || k.intensity !== RELIGHT_NEUTRAL.intensity || k.shadows !== RELIGHT_NEUTRAL.shadows) return true
  return Object.values(k.fixtures).some((t) => t !== 'unset')
}
/** The Lighting mode's summary: the preset, Custom, or Off. */
export const lightingSummary = (k: RelightKnobs, presetId: string | null, instruction: string) => (presetId ? presetById(presetId)?.label ?? 'Custom' : lightingSet(k, null, instruction) ? 'Custom' : 'Off')

/* ── (audit 2026-09-26, F188) the light a room already has: where its windows are (a night or a dusk preset darkens them to the sky)
   and where its fixtures hang (a fixture switched on glows where it is, never on an empty ceiling). Traced once on the sample photos,
   like their surfaces; a photo nobody traced lights by the old rule of thumb. Pieces the reading marks as lighting (the kitchen's
   pendants, the bedroom's lamp) join these at render time. ── */
export type LightFixture = { kind: FixtureKey; x: number; y: number }
/** `windows` — the glazing, traced to the glass inside the frame; `occluders` — what stands in front of the glass that the reading doesn't
    list as a piece (the pot of basil and the vases on the kitchen sill, the pampas on the bedroom's): after dark they keep their own
    tone, never the sky's. The reading's pieces in front of a window (the sofa) are taken out at render time (round 2). */
export type RoomLight = { windows: Pt[][]; occluders?: Pt[][]; fixtures: LightFixture[] }
export const SAMPLE_LIGHT: Record<string, RoomLight> = { 'living-room': livingRoomLight, bedroom: bedroomLight, kitchen: kitchenLight }
/** A piece the reading marks as lighting, as the fixture it is: a pendant (or a chandelier) hangs; a lamp or a sconce is an accent. */
export function fixtureOfPiece(label: string, box: [number, number, number, number] | undefined, x: number, y: number): LightFixture | null {
  const l = label.toLowerCase()
  const kind: FixtureKey | null = /pendant|chandelier/.test(l) ? 'pendants' : /\blamp|sconce|lantern/.test(l) ? 'accent' : /downlight|spotlight|recessed/.test(l) ? 'downlights' : /strip|cove|\bled\b/.test(l) ? 'cove' : null
  if (!kind) return null
  /* a shade's opening: the bottom of a pendant, the middle of a lamp's shade — a floor lamp's shade tops its tall box */
  const at = kind === 'pendants' ? 0.88 : /floor lamp|standing lamp|arc lamp/.test(l) ? 0.1 : 0.3
  return box ? { kind, x: (box[0] + box[2]) / 2, y: box[1] + (box[3] - box[1]) * at } : { kind, x, y }
}
