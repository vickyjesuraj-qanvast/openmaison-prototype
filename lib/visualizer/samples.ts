import type { RebuildStep } from './engine/mend'
import type { Box, Pt } from './engine/pixels'
import type { PieceParts } from './furniture'
import { room as livingRoom } from './sample-rooms/living-room'
import { room as bedroom } from './sample-rooms/bedroom'
import { room as kitchen } from './sample-rooms/kitchen'

/* AI Visualizer (REG-673, audit §5.2) — the sample rooms: the owner's three room photos and his kitchen sketch (1.0's public/visualizer-samples
   since 1.0's 4a51f3522, 2026-10-08 — copied to /visualizer/samples byte for byte; pending modules S43C) with their curated reading — what a
   detector would return, written once and checked by eye against the photos. One file a room (lib/visualizer/sample-rooms/*). Every surface
   and piece carries its dot and the seeds its region grows from. (audit 2026-09-26, F025 · F182 · F183 · F184 · F186) Outlines are traced to the
   photo, not boxed: a surface's `cutout`s follow what stands in front of it, a piece's `cut` is its visible outline (what stands in front of it
   left out), hulls follow the skirting, the ceiling line and the plinths — the engine clips them at full size, so a traced line is the edge.
   Check a change with scripts/viz/regions.mts and trace with scripts/viz/zoom.mts. */

export type SurfaceSeed = { label: string; x: number; y: number; seeds: Pt[]; local?: number; global?: number; exclude?: Box[]; within?: Box; cutout?: Pt[][]; key?: boolean
  /** (F186) See-through things in front of it (pampas plumes, a fig's leaves): the surface is keyed between them, never cut out whole. */
  soft?: Pt[][]
  /** (verify round 1) Glass in front of it (a tumbler on a nightstand): the new finish shows through, the glass's own glints stay light. */
  glass?: Pt[][]
  /** (F191) A window's reveals within it — a paint covers them, a wallpaper stops at them. */
  reveals?: Pt[][]
  /** (wave F) Parts of it seen in pieces between things standing in front (the island's back panel between the stools' legs): colour-keyed
      inside these outlines against its own colour there (its seeds inside them), pixel by pixel — never flooded into what stands in front. */
  keyed?: Pt[][]
  /** Where the surface can be — one or more rough outlines; the colour decides the rest (what stands in front of it stays out). */
  hull?: Pt[][] }
export type FurnitureSeed = { label: string; category: string; x: number; y: number; seeds: Pt[]; box: Box; local?: number; global?: number
  /** What Remove replaces with the empty plate when it is more than the outline: the piece with its legs and the shadow it casts. */
  plate?: Pt[]
  /** The piece's whole outline, with what sits on it (cushions, a throw, the bowl and books on a table) — what Remove lifts out with the
      room's empty plate. */
  cut?: Pt[]
  /** Outlines inside the piece that aren't it (the throw across a bedspread) — Customize never paints them. */
  cutout?: Pt[][]
  /** The pieces standing in front of this one, by label — Remove keeps their pixels, Customize never paints them. */
  front?: string[]
  /** Still there in the room's empty plate (the living room's linen curtains) — Remove and Empty the room can't take it out. */
  inPlate?: boolean
  /** (D3) Its parts a finish can name — Customize paints only that part (the fig's pot, never its leaves). */
  parts?: PieceParts
  /** (F181) The piece it stands on and the feet it stands on it with — taking that piece out takes the feet too. */
  restsOn?: { piece: string; feet: Pt[][] }
  /** (F181) What of it the pieces in front hide, traced where it can be told (a rug's edge under the sofa's arm, a table's leg behind the
      sofa) — taking those pieces out continues it there from its own pixels (`mend`: along its rows or down its columns first). */
  behind?: Pt[][]
  mend?: 'rows' | 'columns' | 'shade' | 'texture' | 'mirror'
  /** (verify round 1) With `mend: 'mirror'` — the piece's upright axis (0…1 across the photo): its hidden side comes back as the side
      that shows (an armchair's arm behind the sofa's cushions). */
  axis?: number
  /** (verify round 1) Strips of it that run across the picture (a console's bottom rail) — when a piece in front of it goes, they go
      on along their rows, the rest of it down its columns. */
  rails?: Pt[][]
  /** (verify round 1) With `mend: 'texture'` — a clean patch of the piece (0…1 box) its hidden part is laid from (a rug's weave). */
  patch?: Box
  /** (wave E) With `mend: 'texture'` — the plane it lies on, by its four corners (back-left, back-right, front-right, front-left; 0…1,
      traced where they show, carried on straight where they don't): its hidden part is laid in its own perspective (engine/mend). */
  plane?: [Pt, Pt, Pt, Pt]
  /** (wave E) How its hidden parts come back when what stands in front of it goes, step by step on traced areas — a seat's front along
      its rows, a post down its column, a leg copied from the leg that shows, the space under it in shade (engine/mend `rebuild`). */
  rebuild?: RebuildStep[]
  /** (wave E) Zones of its outline that are fine strands with what's behind showing between them (a throw's fringe) — when what's behind
      is taken out, only the strands stay. */
  wisps?: Pt[][]
  /** (S43C) Per `wisps` zone, which pixels are the strands: 'light' (the default — a fringe lighter than the floor under it), 'dark'
      (olive branches darker than the pale wall behind them, read against the wall right there) or 'olive' (leaves yellower than the grey
      shade they hang in). */
  wispTones?: ('light' | 'dark' | 'olive')[]
  /** (wave E) Its shade on the pieces behind it (the sofa's on the rug beside the throw) — taken out, the shade goes with it. */
  casts?: Pt[][]
  /** (F182) Its traced outline is all of it (a sheer curtain with its shaded folds) — Customize paints the outline, not a colour grow. */
  whole?: boolean }
export type SampleRoom = {
  key: string
  name: string
  /** What the photo is (1.0's `roomContext`). */
  context: string
  original: string
  /** (S43C) This photo in five styles, made ahead by the engine's own restyle (scripts/viz/sample-looks.mts — Generate's first variant, the
      same picture): a Style card's picture. A restyle runs the engine on the photo as for any photo, so its outlines stay. */
  looks: Record<string, string>
  /** The same room emptied — what Remove and Empty the room lay over the photo (S43C: made from the photo itself, see the room's file). */
  empty?: string
  /** (S43C) `photo` — the plate is the photo itself with the pieces taken out, in the photo's own light: Remove lays it as it is (a plate
      rendered apart — 1.0's — is matched to the photo's light around each piece). */
  plateLight?: 'photo'
  /** A line drawing of this very room (the owner's kitchen sketch) — Render from sketch turns it into `original`. */
  sketch?: string
  /** (S43C) This photo relit, made ahead by the engine's own relight (scripts/viz/sample-looks.mts), by lighting preset — Generate makes the
      same picture. */
  relit?: Record<string, string>
  /** (wave F) What a relit render has that the photo doesn't (a lamp switched on where the photo shows none), by preset: an edit made under
      that light keeps it as the render shows it — the new finish goes round it (engine/run `underTheLight`). */
  relitKeep?: Record<string, Pt[][]>
  surfaces: SurfaceSeed[]
  furniture: FurnitureSeed[]
}

export const SAMPLE_ROOMS: SampleRoom[] = [livingRoom, bedroom, kitchen]

export const sampleByKey = (key: string | null | undefined) => SAMPLE_ROOMS.find((s) => s.key === key) ?? null
/** A photo the studio added that IS a sample (a lead file carrying a sample's picture) — read as that sample. */
export const sampleByImage = (url: string | null | undefined) => (url ? SAMPLE_ROOMS.find((s) => s.original === url || s.sketch === url) ?? null : null)
