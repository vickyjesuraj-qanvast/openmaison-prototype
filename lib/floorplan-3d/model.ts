import { planFromTemplate } from '@/lib/planner/templates'
import { lookLabel, type Look, type PlaceRoom } from '@/lib/planner/photo'

/*
 * (REG-2800) Tools › Floorplan to 3D Isometric — 1.0's module (`/tools/floorplan-3d-isometric`, Beta; spec docs/features/floorplan-3d/spec.md on
 * deployment/qanvast · plg) on its own page again: a floor-plan photo, straightened and cleaned in the browser; the rooms it holds; Dollhouse or
 * Top-down; an image model draws the 3D view to download. Pure and client-safe — the page, its ghost and the probe read it.
 *
 * The prototype has no image model, so (his pick 2026-10-23, "Sample floor plans with ready-made renders") sample plans carry views made ahead by
 * the image model 1.0 uses (Nano Banana 2 on Weave, 1.0's prompts — scripts/floorplan-3d/sample-inputs.mts), and say so; a studio's own plan is straightened for real and the page says plainly that reading its rooms
 * and drawing it need the image model (the seam: lib/floorplan-3d/service.ts `setFloorplanRenderer`). Nothing is charged — 1.0 charged none.
 */

export type { Look, PlaceRoom }

/** 1.0's two looks, in its words (`STYLE_OPTIONS`), with its two example pictures. */
export const LOOK_CHOICES: readonly { value: Look; label: string; line: string; example: string }[] = [
  { value: 'dollhouse', label: 'Dollhouse', line: 'Angled cutaway — walls with height, the classic 3D look.', example: '/floorplan-3d/look-dollhouse.jpg' },
  { value: 'top', label: 'Top-down', line: 'Straight-down view — reads like the plan, fully furnished.', example: '/floorplan-3d/look-top.jpg' },
]

export type SamplePlan = {
  key: string
  /** the home it is — the card's name and the download's */ name: string
  /** what kind of picture it is — the card's second line */ line: string
  /** the plan as a studio would receive it */ plan: string
  /** the planner flat it is drawn from — its rooms are the "We found" chips */ template: string
  /** the ready-made renders, per look — Regenerate shows the next take */ renders: Record<Look, readonly string[]>
}
const takes = (key: string, look: Look, n: number) => Array.from({ length: n }, (_, i) => `/floorplan-3d/samples/${key}-${look}-${i + 1}.jpg`)
/** The sample plans: S28's photo of a printed HDB 4-Room on a desk (what the straightening is for) and two plans saved from a PDF
    (scripts/floorplan-3d/sample-plans.mts), each a planner flat so its rooms are its own. A sample shows only once it has views, and offers
    only the looks it has (his call 2026-10-23, "Ship HDB 4-Room only": Weave's free runs drew the HDB 4-Room's two Dollhouse takes; the rest
    wait for renders — add the files and their count here and the sample or the look appears). *(invented copy: the names' second lines)* */
export const SAMPLE_PLANS: readonly SamplePlan[] = [
  { key: 'hdb-4-room', name: 'HDB 4-Room', line: 'A photo of a printed plan, taken at an angle', plan: '/planner/demo/floor-plan-photo-waterway-sunrise.jpg', template: 'hdb-4', renders: { dollhouse: takes('hdb-4-room', 'dollhouse', 2), top: [] } },
  { key: 'hdb-3-room', name: 'HDB 3-Room', line: 'A plan saved from a PDF', plan: '/floorplan-3d/samples/hdb-3-room.png', template: 'hdb-3', renders: { dollhouse: [], top: [] } },
  { key: 'condo-3-bedroom', name: 'Condo 3-Bedroom', line: 'A plan saved from a PDF, with a balcony', plan: '/floorplan-3d/samples/condo-3-bedroom.png', template: 'condo-3', renders: { dollhouse: [], top: [] } },
]
/** The looks a sample has views for, in 1.0's order. */
export const sampleLooks = (s: SamplePlan) => LOOK_CHOICES.filter((l) => s.renders[l.value].length > 0)
/** (2026-10-27) Why a look can't be picked, or null when it can: both looks are always offered (1.0), and a sample without views of one says
    so in its card — a studio's own plan is drawn in either by the image model. *(invented copy)* */
export const lookNotReady = (s: SamplePlan | null, look: Look): string | null =>
  s && !s.renders[look].length ? `This sample has no ${lookLabel(look).toLowerCase()} view yet` : null
/** The samples the page offers — those with a view to show. */
export const READY_SAMPLES: readonly SamplePlan[] = SAMPLE_PLANS.filter((s) => sampleLooks(s).length > 0)
export const samplePlan = (key: string | null | undefined) => SAMPLE_PLANS.find((s) => s.key === key) ?? null
/** A sample's rooms — its plan's own, from the flat it is drawn from. */
export const sampleRooms = (s: SamplePlan): PlaceRoom[] => planFromTemplate(s.template).rooms.map((r) => ({ name: r.name, kind: r.kind }))

/** "HDB 4-Room — Dollhouse.jpg" — the download, named for the plan and the look (1.0 saved every render as "3d-floor-plan.png"). */
export const renderFileName = (name: string, look: Look, ext: string) => `${name.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim() || 'Floor plan'} — ${lookLabel(look)}.${ext}`

/** The largest picture a studio's own plan may be (1.0's input cap, 10 MB). */
export const PLAN_MAX_BYTES = 10 * 1024 * 1024

/** The page's words, once — the page and its ghost both set them (REG-708: a ghost's bars wrap where the page's words do). 1.0's own words
    where it had them (its subtitle, How it works, the upload box, the pipeline's three steps). */
export const FP3D_WORDS = {
  title: 'Floorplan to 3D Isometric',
  hero: 'Turn any floor plan photo into a marketing-ready 3D view',
  sub: 'Dollhouse or Top-down — in under a minute.',   // (the calm UI build, 6-22) the looks by the cards' own names
  steps: [
    ['Upload any photo of a floor plan', ' — we straighten and clean it automatically.'],
    ['We read the rooms', '; you confirm the counts with one glance.'],
    ['Pick Dollhouse or Top-down', ' and get the 3D view in about 30 seconds.'],   // (the calm UI build, 6-22) the looks by the cards' own names
  ] as const,
  drop: 'Drop the floor plan here or browse',
  dropHelp: 'A photo is fine — any angle, even a picture of paper on a desk. JPG, PNG, WebP, HEIC or PDF.',
  get: 'What you’ll get',
  samples: 'Or try a sample plan',
  pipeline: ['Read the plan', 'Confirm the rooms', '3D render'] as const,
  /** (2026-10-27) the prototype's two lines about a studio's own plan — before the upload, and after it *(invented copy)*; (the calm UI build
      2026-10-27, 6-22 · W-293 — T-05: no prototype talk on a studio's screen) the first sits behind the header's info glyph, the held line stays */
  prototypeHint: 'On the prototype, your own plan is straightened but not drawn in 3D — the sample plans go all the way.',
  held: 'On the prototype, your own plan stops here — reading its rooms and drawing it in 3D need the image model the live app has.',
  /** (the calm UI build, 6-22 · W-349) under a sample's view — a sample, its views ready-made (was the image model's story) */
  sampleNote: 'Sample plan — ready-made views',
  /** (the calm UI build, 6-22) the wait for a sample's view */
  sampleWait: 'A sample plan’s views are ready-made — a moment.',
  /** the info glyph's name (the prototype's note about a studio's own plan) */
  prototypeLabel: 'What happens to your own plan here',
}
