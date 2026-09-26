import type { Box, Pt } from './engine/pixels'
import type { FallbackReading } from './engine/fallback'
import type { Sheen } from './engine/recolor'
import { FINISH_HEX, KEEP, finishRowFor, pieceKind, type FurniturePick, type PartKey, type PieceParts } from './furniture'
import { RELIGHT_NEUTRAL, lightingSet, presetById, type RelightKnobs } from './lighting'
import { headOfLabel, nounOf, readNote } from './note'
import { sampleByKey, type SampleRoom } from './samples'
import type { Pattern } from './patterns'
import { EMPTY_SCOPES, DEFAULT_ASPECTS, type EmptyScope, type FurnishDensity, type GeometryLock, type ReferenceRole, type StyleAspect, type StyleStrength } from './tools'
import { labelInText, normFurnitureKey, surfaceGroupFor, titleCaseLabel } from './surfaces'

/* AI Visualizer (REG-673) — the model: what a room reads as, the picks waiting for Generate, and what each version remembers.
   Pure and client-safe; the server stores these shapes as JSON (project_rooms.detection_json / state_json, render_jobs.variants_json). */

export const ORIGINAL = '__original__'   // 1.0's gallery key for the upload

/* ── the reading (1.0's detection, B-39) ── */
/** (audit 2026-09-26) Extra options a region grows with — the engine's `GrowExtras` (engine/segment), carried by a reading as they are. */
export type GrowOptions = { lightWeight?: number; edgeStop?: number; rivals?: Pt[]; pockets?: boolean; matte?: boolean; smooth?: number }
export type SurfaceDef = { id: string; label: string; x: number; y: number; seeds?: Pt[]; local?: number; global?: number; exclude?: Box[]; within?: Box; hull?: Pt[][]; cutout?: Pt[][]; key?: boolean
  /** (F186) See-through things standing in front of it — keyed between, never cut out whole (engine/segment `soft`). */
  soft?: Pt[][]
  /** Glass standing in front of it — the finish shows through (engine/segment `glass`). */
  glass?: Pt[][]
  /** (F191) A window's reveals within it — a paint covers them, a wallpaper stops at them. */
  reveals?: Pt[][]
  /** (wave F) Parts of it seen in pieces between things in front (the island's back panel between the stools' legs) — colour-keyed, never
      flooded (engine/run `computeRegion`). */
  keyed?: Pt[][]
  /** A drawn region (Draw a surface) — used as it is, no growing. */
  region?: Pt[]; manual?: boolean; grow?: GrowOptions }
export type FurnitureDef = { id: string; label: string; category: string; x: number; y: number; seeds?: Pt[]; box?: Box; local?: number; global?: number; cut?: Pt[]; plate?: Pt[]; region?: Pt[]; manual?: boolean
  /** (F182) Outlines the piece's region never enters — what stands in front of it. */
  cutout?: Pt[][]
  /** (F181) The pieces standing in front of this one, by label — Remove keeps their pixels, Customize never paints them. Without it the
      engine reads the order off the photo (a rug lies under everything; what stands lower in the picture is nearer). */
  front?: string[]
  /** (F064) Still there in the room's empty plate (the living room's curtains) — Empty the room can't take it out. */
  inPlate?: boolean
  /** (D3) Its parts a finish can name (a fig's pot, an artwork's frame, a TV's frame and stand) — Customize paints only that part. */
  parts?: PieceParts
  /** (F181) The piece it stands on (by label) and the feet it stands on it with: taking that piece out takes the feet (a TV on a console
      then hangs on the wall). */
  restsOn?: { piece: string; feet: Pt[][] }
  /** (F181) What of it the pieces in front hide (a rug's edge under the sofa's arm) — continued from its own pixels when they go
      (`mend`: along its rows or down its columns first). */
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
  /** (F182) Its traced outline is all of it (a sheer curtain with its shaded folds) — the region is the outline, not a colour grow. */
  whole?: boolean
  grow?: GrowOptions }
export type Detection = { kind: 'photo' | 'sketch'; source: 'sample' | 'fallback'; context: string | null; surfaces: SurfaceDef[]; furniture: FurnitureDef[]
  /** Removed from the list (1.0's ×): forgotten, never changed in the photo. */
  hidden?: string[] }

let seq = 0
export const newId = (p = 'x') => `${p}${Date.now().toString(36)}${(seq++).toString(36)}${Math.random().toString(36).slice(2, 6)}`

/** A sample room's curated reading (§5.2); `asSketch` for its sketch. */
export function sampleDetection(sample: SampleRoom, asSketch = false): Detection {
  if (asSketch) return { kind: 'sketch', source: 'sample', context: sample.context, surfaces: [], furniture: [] }
  return {
    kind: 'photo', source: 'sample', context: sample.context,
    surfaces: sample.surfaces.map((s, i) => ({ ...s, id: `${sample.key}-s${i}` })),
    furniture: sample.furniture.map((f, i) => ({ ...f, id: `${sample.key}-f${i}` })),
  }
}
/** A sample room's reading as it stands today, with the studio's own work kept: surfaces and pieces they added, outlines they redrew,
    what they took off the list. The curated outlines improve with the engine; a room made before an improvement gets it too. */
export function currentSampleReading(stored: Detection, sample: SampleRoom): Detection {
  if (stored.source !== 'sample') return stored
  const fresh = sampleDetection(sample, stored.kind === 'sketch')
  const redrawn = new Map([...stored.surfaces, ...stored.furniture].filter((x) => x.region && !x.manual).map((x) => [x.id, x.region!]))
  return {
    ...fresh, hidden: stored.hidden,
    surfaces: [...fresh.surfaces.map((s) => (redrawn.has(s.id) ? { ...s, region: redrawn.get(s.id) } : s)), ...stored.surfaces.filter((s) => s.manual)],
    furniture: [...fresh.furniture.map((f) => (redrawn.has(f.id) ? { ...f, region: redrawn.get(f.id) } : f)), ...stored.furniture.filter((f) => f.manual)],
  }
}

/** Any other photo: 1.0's own fallback three (B-40), the dots placed by the engine where the photo's regions are (engine/fallback.ts). */
export function fallbackDetection(dots?: { walls: Pt; floor: Pt; ceiling: Pt | null; reading?: FallbackReading }): Detection {
  /* (F180) The engine's reading places seeds and says how each surface grows — no `within` band, so no straight seam across the
     photo; a Floor the photo doesn't show is left out (the studio adds it by name or draws it). */
  if (dots?.reading) {
    /* (verify round 1) a caption bar across the photo's foot or head is never painted: the surfaces stop at its straight edge */
    const f = dots.reading.frame, within: Box | undefined = f && (f.top > 0 || f.bottom < 1) ? [0, f.top, 1, f.bottom] : undefined
    const surfaces: SurfaceDef[] = dots.reading.surfaces.map((s) => ({ id: newId('s'), label: s.label, x: s.x, y: s.y, seeds: s.seeds, local: s.local, global: s.global, grow: s.grow, ...(within ? { within } : {}) }))
    return { kind: 'photo', source: 'fallback', context: null, surfaces, furniture: [] }
  }
  const d = dots ?? { walls: { x: 0.5, y: 0.35 }, floor: { x: 0.5, y: 0.85 }, ceiling: { x: 0.5, y: 0.08 } }
  const surfaces: SurfaceDef[] = [
    { id: newId('s'), label: 'Walls', x: d.walls.x, y: d.walls.y, seeds: [d.walls], local: 6, global: 18, within: [0, 0.04, 1, 0.8] },
    { id: newId('s'), label: 'Floor', x: d.floor.x, y: d.floor.y, seeds: [d.floor], local: 7, global: 22, within: [0, 0.5, 1, 1] },
  ]
  if (d.ceiling) surfaces.push({ id: newId('s'), label: 'Ceiling', x: d.ceiling.x, y: d.ceiling.y, seeds: [d.ceiling], local: 5, global: 14, within: [0, 0, 1, 0.3] })
  return { kind: 'photo', source: 'fallback', context: null, surfaces, furniture: [] }
}
/** (F064) Why this piece can't be taken out of this photo — the room's empty plate still shows it (the living room's sheer curtains): the
    Furniture panel's Remove waits with this line; the engine says the same if asked. */
export function pieceRemoveBlock(f: Pick<FurnitureDef, 'inPlate'>): string | null {
  return f.inPlate ? 'This photo can’t take it out — Replace or Customize it instead' : null
}
/** (F023) A surface added by name and a tap: grown only near the tap and with tight colour limits (the engine also keeps it off the
    regions the photo already knows) — a tapped window frame never floods the walls. Draw it for anything larger. */
export function tappedSurface(label: string, p: Pt): SurfaceDef {
  const r = 0.2
  return { id: newId('s'), label, x: p.x, y: p.y, seeds: [p], local: 4, global: 10, within: [Math.max(0, p.x - r), Math.max(0, p.y - r), Math.min(1, p.x + r), Math.min(1, p.y + r)], manual: true }
}

/* ── the picks waiting for Generate (1.0's session state, now kept with the room — Q-07) ── */
export type Quality = 'fast' | 'high'
export type OpenTool = 'empty' | 'furnish' | null
export type TransferRef = { id: string; url: string; role: ReferenceRole; palette: string[] }
export type Pending = {
  /** surfaceId → material id (catalogue id · `lib:` a studio material · `own:` the design's own swatch). */
  materials: Record<string, string>
  /** furnitureId → what to do with the piece; keep is never stored. */
  furniture: Record<string, FurniturePick>
  style: string
  lighting: { presetId: string | null; knobs: RelightKnobs; instruction: string }
  transfer: { refs: TransferRef[]; strength: StyleStrength; aspects: StyleAspect[]; geometry: GeometryLock; keep: string }
  note: string
  quality: Quality
  variants: 1 | 2 | 3
  /** A tool that owns the primary button while it is open (1.0's drawers). */
  tool: OpenTool
  empty: { scope: EmptyScope; extra: string }
  furnish: { room: string; density: FurnishDensity; leaveOut: string; direction: string }
  /** Not a sketch after all (1.0's *Use as-is*). */
  asPhoto?: boolean
}
export const neutralKnobs = (): RelightKnobs => ({ ...RELIGHT_NEUTRAL, fixtures: { ...RELIGHT_NEUTRAL.fixtures } })
export const emptyPending = (): Pending => ({
  materials: {}, furniture: {}, style: '', lighting: { presetId: null, knobs: neutralKnobs(), instruction: '' },
  transfer: { refs: [], strength: 'balanced', aspects: [...DEFAULT_ASPECTS], geometry: 'structural', keep: '' },
  note: '', quality: 'fast', variants: 1, tool: null, empty: { scope: 'joinery', extra: '' }, furnish: { room: 'living', density: 'balanced', leaveOut: '', direction: '' },
})
/** A stored state, filled out to today's shape. */
export function readPending(raw: unknown): Pending {
  const base = emptyPending()
  if (!raw || typeof raw !== 'object') return base
  const r = raw as Partial<Pending>
  return { ...base, ...r, lighting: { ...base.lighting, ...(r.lighting ?? {}), knobs: { ...base.lighting.knobs, ...(r.lighting?.knobs ?? {}), fixtures: { ...base.lighting.knobs.fixtures, ...(r.lighting?.knobs?.fixtures ?? {}) } } }, transfer: { ...base.transfer, ...(r.transfer ?? {}) }, empty: { ...base.empty, ...(r.empty ?? {}) }, furnish: { ...base.furnish, ...(r.furnish ?? {}) }, materials: { ...(r.materials ?? {}) }, furniture: { ...(r.furniture ?? {}) } }
}

/** (audit 2026-09-26, F052) The kinds of pick a Generate can take — what a pass uses up, what it leaves waiting. */
export type Slot = 'materials' | 'furniture' | 'style' | 'lighting' | 'note' | 'refs' | 'tool'
const sameJson = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
/**
 * After a Generate: what it applied is spent; quality, the variant count and the transfer's and the tools' settings stay (the studio's
 * habit — a reference is spent like a style card: F057 · F190; Keep unchanged stays with the other settings: F056).
 * (F052) `consumed` — only these kinds of pick are spent (a Restyle with a note it could not use keeps the note for the next Generate);
 * without it every pick is. (F003) `used` — the picks as the render started: a pick changed while it ran is the studio's newer choice and
 * stays.
 */
export function afterRender(p: Pending, o: { used?: Pending; consumed?: Slot[] } = {}): Pending {
  const used = o.used ?? p, spent = new Set<Slot>(o.consumed ?? ['materials', 'furniture', 'style', 'lighting', 'note', 'refs', 'tool'])
  const materials: Record<string, string> = {}
  for (const [id, mid] of Object.entries(p.materials)) if (!(spent.has('materials') && used.materials[id] === mid)) materials[id] = mid
  const furniture: Record<string, FurniturePick> = {}
  for (const [id, f] of Object.entries(p.furniture)) if (!(spent.has('furniture') && sameJson(used.furniture[id], f))) furniture[id] = f
  const refs = spent.has('refs') ? p.transfer.refs.filter((r) => !used.transfer.refs.some((u) => u.id === r.id)) : p.transfer.refs
  return {
    ...emptyPending(),
    materials, furniture,
    style: spent.has('style') && p.style === used.style ? '' : p.style,
    lighting: spent.has('lighting') && sameJson(p.lighting, used.lighting) ? emptyPending().lighting : p.lighting,
    note: spent.has('note') && p.note === used.note ? '' : p.note,
    tool: spent.has('tool') && p.tool === used.tool ? null : p.tool,
    quality: p.quality, variants: p.variants,
    transfer: { ...emptyPending().transfer, refs, strength: p.transfer.strength, aspects: p.transfer.aspects, geometry: p.transfer.geometry, keep: p.transfer.keep },
    empty: p.empty, furnish: p.furnish, asPhoto: p.asPhoto,
  }
}

/* ── a material, whatever its source ── */
export type MaterialRef = { id: string; name: string; hex: string; finish: Sheen; imageUrl: string | null; category: string; source: 'catalogue' | 'library' | 'design'
  /** (REG-680) A wallpaper's motif — its chip and its render wear it. (F187) A floor's, a tile's or a stone's structure too. */
  pattern?: Pattern | null }

/* ── what a version remembers (1.0's variant `materials` + `parentKey`, and more — Q-07) ── */
export type PassKind = 'edit' | 'restyle' | 'relight' | 'transfer' | 'empty' | 'furnish' | 'sketch' | 'note'
export type FinishedSurface = { materialId: string; name: string; hex: string; finish: Sheen; pattern?: Pattern | null
  /** The surface's label when the finish was laid (a version names its own surfaces even if the reading changes later). */
  label?: string }
/** The room as this version shows it: each surface's finish, the pieces taken out or restyled, whether a whole-room look replaced it. */
export type Finishes = { surfaces: Record<string, FinishedSurface>; removed: string[]; customized: Record<string, string>; reshaped: boolean; emptied: boolean; fromSketch: boolean; style: string | null; lighting: string | null }
export const NO_FINISHES: Finishes = { surfaces: {}, removed: [], customized: {}, reshaped: false, emptied: false, fromSketch: false, style: null, lighting: null }
export type Applied = { kind: PassKind; surfaces: { id: string; label: string; materialId: string; name: string }[]; furniture: { id: string; label: string; action: 'remove' | 'customize'; desc: string
  /** (wave F) The part a Customize landed on (the fig's pot) — the caption names the piece by it. */
  part?: PartKey | null }[]; style: string | null; lighting: string | null; note: string | null; palette: string[] | null; scope: string | null
  /** (audit 2026-09-26) What the pass could not do, in plain words — "Whole-room look — earlier changes replaced", "Kept: the curtains —
      this photo can't take them out". The version says so instead of claiming it. */
  caveat?: string | null }
export type Variant = { id: number; n: number; imageUrl: string; materials: { label: string; material: string }[]; parentKey: string; applied: Applied; finishes: Finishes; deletedAt?: number | null }

/** The Changes list (1.0's `{surface} → {material}`, C-63) — now with the furniture, the light and the look. */
export function changeLines(a: Applied): { what: string; to: string }[] {
  const out: { what: string; to: string }[] = []
  /* (simplicity pass) one line per surface group and finish — the two walls in the same paint read "Walls · Sage Green", not two labels;
     (verify round 1) a group this version changed on one surface only is that surface ("Feature Wall", never "Feature Walls") */
  const seen = new Set<string>(), name = surfaceWords(a.surfaces)
  for (const s of a.surfaces) { const what = name(s.label), k = `${what}|${s.name}`; if (seen.has(k)) continue; seen.add(k); out.push({ what, to: s.name }) }
  for (const f of a.furniture) out.push({ what: titleCaseLabel(f.label).replace(/\s*\([^)]*\)\s*$/, ''), to: f.action === 'remove' ? 'Taken out' : f.desc })
  if (a.style) out.push({ what: 'Style', to: a.style })
  if (a.palette?.length) out.push({ what: 'Palette', to: 'From the reference' })
  if (a.lighting) out.push({ what: 'Lighting', to: a.lighting })
  if (a.scope) out.push({ what: 'Room', to: a.scope })
  if (a.note) out.push({ what: 'Note', to: a.note })
  return out   // (the pass's `caveat` is the studio's to read — the editor shows it; the client's lists stay plain)
}

/** What the strip prints after V{n} (1.0's job descriptors, C-44). */
export function descriptor(a: Applied): string {
  switch (a.kind) {
    case 'restyle': return a.style ?? 'Restyle'
    case 'relight': return `Relit · ${a.lighting ?? 'Custom'}`
    case 'transfer': return 'Style transfer'
    case 'empty': return `Emptied · ${a.scope ?? EMPTY_SCOPES[1]!.label}`
    case 'furnish': return a.style ? `Furnished · ${a.style}` : 'Furnished'
    case 'sketch': return a.style ? `From sketch · ${a.style}` : 'From sketch'
    case 'note': return 'From a note'
    default: {
      const word = surfaceWords(a.surfaces)
      /* (wave F) a piece by its kind, never the photo's description of it (the finish a change replaced): "Sofa" for the grey fabric sofa
         made navy, "Planter" for a fig whose pot was painted; a piece taken out says so ("Sofa taken out") */
      const names = [...a.surfaces.map((s) => word(s.label)), ...a.furniture.map((f) => (f.action === 'remove' ? `${pieceKind(f.label)} taken out` : pieceKind(f.label, f.part)))].filter((n, i, all) => all.indexOf(n) === i)
      const head = names.slice(0, 2).join(', ') + (names.length > 2 ? ` +${names.length - 2}` : '')
      return a.style ? `${head || 'Edit'} · ${a.style}` : head || (a.lighting ? `Relit · ${a.lighting}` : 'Edit')
    }
  }
}
/** A surface's short word — "white painted back wall" → Walls. */
export const groupWord = (label: string) => { const g = surfaceGroupFor(label); return g === 'Other' ? titleCaseLabel(label) : g }
/** (verify round 1) How a version's surfaces are named in its lines: by their group ("Walls") where it changed more than one surface of
    it, by the surface itself where it changed one ("Window Frame", "Feature Wall") — as the Surfaces list names a group of one. */
function surfaceWords(surfaces: { label: string }[]): (label: string) => string {
  const labels = new Map<string, Set<string>>()
  for (const s of surfaces) { const g = groupWord(s.label); const set = labels.get(g) ?? new Set<string>(); set.add(s.label.toLowerCase()); labels.set(g, set) }
  /* (wave E, surfaces-26 · versions-6) a room has one floor, one ceiling, one splashback: changed, it is named by that word — never by the
     label that carries the finish it replaced ("V1 · Light Oak Floor" for a walnut floor), as Present's lines name it */
  /* (wave F) …and a surface named by its label goes without the finish words it starts with ("Back Wall", never "White Painted Back
     Wall" for a navy one), as a piece is named by its kind */
  return (label) => { const g = groupWord(label); return (labels.get(g)?.size ?? 0) !== 1 ? g : ONE_PER_ROOM.has(g) ? g : titleCaseLabel(bareLabel(label)) }
}
const ONE_PER_ROOM = new Set(['Floor', 'Ceiling', 'Backsplash'])
/** (wave F) The finish words a reading's label starts with ("white painted", "light grey", "oak veneer", "charcoal") — the finish a change
    replaced, never the surface's name in a caption. */
const LEAD_FINISH = /^(?:(?:white|off-white|grey|gray|light|dark|black|charcoal|navy|green|sage|beige|cream|brown|blue|painted|oak|walnut|veneer|quartz|marble|granite|tile|tiled|timber|wooden|wood|concrete|brick|stone|laminate|lacquered|gloss|matte|polished|wallpapered)\s+)+/i
const bareLabel = (label: string) => label.trim().replace(LEAD_FINISH, '') || label

/* ── a pick for a piece ── */
/** A pick for a piece, filled out. */
export const pickOf = (p: Pending, id: string): FurniturePick => p.furniture[id] ?? KEEP
/** (F032) Whether a Replace or a Customize can render yet — Replace needs words or a photo, Customize a colour, a finish or words that
    name a colour. The engine checks the same rule as a backstop. */
export function pickReady(f: FurniturePick): boolean {
  if (f.action === 'replace') return !!f.replacementDesc?.trim() || !!f.refImage
  if (f.action === 'customize') return !!f.customizeColor || !!f.customizeMaterial || !!readNote(`${f.replacementDesc ?? ''} sofa`)?.paints.length
  return true
}
/** What an unready pick still needs, in the words the rail shows. */
export function pickNeeds(f: FurniturePick, target: { label: string; category: string; parts?: PieceParts }): string | null {
  if (pickReady(f)) return null
  const piece = labelInText(target.label)   // (verify round 1) "the wall-mounted TV", never "the wall-mounted tv"
  if (f.action === 'replace') return `Pick or describe what replaces the ${piece} first.`
  /* (wave E, surfaces-14) a piece with no finish row takes a colour only — its words say so, as the panel's hint does */
  return finishRowFor(target) ? `Pick a colour or a finish for the ${piece} first.` : `Pick a colour for the ${piece} first.`
}
/** A finish with no colour of its own (Velvet, Chenille) keeps the piece's colour and changes its sheen. */
export const finishHasColour = (finish: string | null | undefined) => !!finish && !!FINISH_HEX[finish]

/* ── what can run on the version on screen (F053) ── */
export type ToolAvailability = { canRemove: boolean; removeWhy: string | null; canEmpty: boolean; emptyWhy: string | null; canFurnish: boolean; furnishWhy: string | null
  /** The room has panelling or fitted joinery — Keep built-ins and Strip to shell differ. */
  builtIns: boolean }
/** Remove, Empty the room and Furnish work where the room's empty plate is: a sample photo, the camera untouched. Each refusal says why.
    (verify round 1, fresh-desktop) `emptied` — the room's newest emptied version ("V4"), when there is one: Furnish on another version
    points to it instead of asking for the room to be emptied again. */
export function toolAvailability(room: { sampleKey: string | null; detection: Detection | null } | null, f: Finishes, reading?: Detection | null, o: { emptied?: string | null } = {}): ToolAvailability {
  const sample = sampleByKey(room?.sampleKey)
  const r = reading ?? (room?.detection ? readingFor({ detection: room.detection, sampleKey: room.sampleKey }, f) : null)
  const sketch = r?.kind === 'sketch'
  const plate = !!sample?.empty
  const removeWhy = sketch ? 'Render the sketch into a photo first' : !plate ? 'Needs a photo with the room empty behind it — this one doesn’t have that' : f.reshaped ? 'This version is a whole-room look — take pieces out from the Original or an edit' : null
  const emptyWhy = removeWhy ?? (f.emptied ? 'This version is already empty' : null)
  const furnishWhy = sketch ? 'Render the sketch into a photo first' : !plate ? 'Furnishing works on an emptied room — this photo can’t be emptied' : !f.emptied ? (o.emptied ? `Furnish works on an emptied version — open ${o.emptied}` : 'Empty the room first — then furnish') : null
  const builtIns = !!r?.surfaces.some((s) => /Panelling|Cabinets|Wardrobes|Open Shelving/.test(surfaceGroupFor(s.label)))
  return { canRemove: !removeWhy, removeWhy, canEmpty: !emptyWhy, emptyWhy, canFurnish: !furnishWhy, furnishWhy, builtIns }
}

/* ── the changes waiting (the rail's chips) and the primary button (1.0's matrix, C-01; audit §5.6) ── */
export type ChangeItem = {
  /** Stable: `m:{group}|{material}` · `f:{piece}|{action}` · style · refs · light · note · tool (the rail's chip ids). */
  id: string
  slot: Slot
  label: string
  /** The surfaces or pieces behind a materials or furniture chip — what its × clears. */
  ids: string[]
  /** An unready pick (F032) — the words the rail shows for it. */
  needs?: string | null
}
/**
 * (F006 · F035 · F175 · F036 · F197) The changes waiting, as the rail lists them and the button counts them: one chip per surface group
 * and finish — all of a group reads "Walls → Sage Green", one of it the surface's own name, some of it "Cabinets (2 of 3) → Forest Green"
 * — one per piece and action, then the look, the reference, the light, the note, the tool. A pick whose material is gone (a removed
 * swatch) is not a change: it isn't listed or counted (`danglingPicks` names them for the editor to drop).
 */
export function changeList(p: Pending, o: { reading: Detection | null; resolve: (id: string) => MaterialRef | null }): ChangeItem[] {
  const out: ChangeItem[] = []
  const reading = o.reading
  if (reading) {
    const groupTotal = new Map<string, number>()
    for (const s of reading.surfaces) { const g = groupWord(s.label); groupTotal.set(g, (groupTotal.get(g) ?? 0) + 1) }
    const byMat = new Map<string, { group: string; name: string; ids: string[]; labels: string[] }>()
    for (const [sid, mid] of Object.entries(p.materials)) {
      const s = reading.surfaces.find((x) => x.id === sid); if (!s) continue
      const m = o.resolve(mid); if (!m) continue
      const g = groupWord(s.label), k = `${g}|${mid}`, hit = byMat.get(k)
      if (hit) { hit.ids.push(sid); hit.labels.push(s.label) } else byMat.set(k, { group: g, name: m.name, ids: [sid], labels: [s.label] })
    }
    for (const [k, c] of byMat) {
      const total = groupTotal.get(c.group) ?? c.ids.length, one = new Set(c.labels.map((l) => l.toLowerCase())).size === 1
      /* (verify round 1) a group of one surface is named by it, as the Surfaces list names it ("Feature Wall", not "Feature Walls") */
      const what = total === 1 || (one && c.ids.length < total) ? titleCaseLabel(c.labels[0]!) : c.ids.length >= total ? c.group : `${c.group} (${c.ids.length} of ${total})`
      out.push({ id: `m:${k}`, slot: 'materials', label: `${what} → ${c.name}`, ids: c.ids })
    }
    const byPiece = new Map<string, { label: string; ids: string[]; needs: string | null }>()
    for (const [fid, f] of Object.entries(p.furniture)) {
      const d = reading.furniture.find((x) => x.id === fid); if (!d || f.action === 'keep') continue
      const k = `${normFurnitureKey(d.label)}|${f.action}`, hit = byPiece.get(k)
      if (hit) { hit.ids.push(fid); hit.needs ??= pickNeeds(f, d) }
      else byPiece.set(k, { label: `${titleCaseLabel(normFurnitureKey(d.label))} · ${f.action === 'remove' ? 'Remove' : f.action === 'replace' ? 'Replace' : 'Customize'}`, ids: [fid], needs: pickNeeds(f, d) })
    }
    for (const [k, c] of byPiece) out.push({ id: `f:${k}`, slot: 'furniture', label: c.label, ids: c.ids, needs: c.needs })
  }
  if (p.style) out.push({ id: 'style', slot: 'style', label: `Style · ${p.style}`, ids: [] })
  if (p.transfer.refs.length) out.push({ id: 'refs', slot: 'refs', label: `Reference · ${p.transfer.refs.length}`, ids: [] })
  if (lightingSet(p.lighting.knobs, p.lighting.presetId, p.lighting.instruction)) out.push({ id: 'light', slot: 'lighting', label: `Lighting · ${p.lighting.presetId ? presetById(p.lighting.presetId)?.label ?? 'Custom' : 'Custom'}`, ids: [] })
  if (p.note.trim()) out.push({ id: 'note', slot: 'note', label: 'Your note', ids: [] })
  if (p.tool) out.push({ id: 'tool', slot: 'tool', label: p.tool === 'empty' ? 'Empty the room' : 'Furnish the room', ids: [] })
  return out
}
/** (F197) The surfaces whose picked material no longer resolves (a swatch removed, a studio material deleted) — drop them. */
export function danglingPicks(p: Pending, resolve: (id: string) => MaterialRef | null): string[] {
  return Object.entries(p.materials).filter(([, mid]) => !resolve(mid)).map(([sid]) => sid)
}

export type Intent = { kind: PassKind | null; label: string; busy: string
  /** How many changes this Generate applies — the chips it uses. */
  changes: number; reason: string | null
  /** (F052) The chips the chosen pass can't use: they stay for the next Generate. */
  ignored?: string[]
  /** One line for them — "Not used by Empty the room — kept for your next Generate". */
  ignoredNote?: string | null
  /** The kinds of pick this Generate uses up — hand them to afterRender. */
  consumes?: Slot[]
  /** Every chip waiting, used or not (the rail's "Your changes · n"). */
  total?: number }
/** What each pass takes from the picks (the rest waits): the matrix picks one pass; the light and the note ride along where they can. */
const USES: Record<PassKind, Slot[]> = {
  edit: ['materials', 'furniture', 'style', 'lighting', 'note'],
  restyle: ['style', 'lighting', 'note'],
  transfer: ['refs', 'lighting', 'note'],
  relight: ['lighting', 'note'],
  note: ['note'],
  sketch: ['style', 'lighting', 'note'],
  empty: ['tool', 'lighting'],
  furnish: ['tool', 'style', 'lighting'],
}
const PASS_NAME: Record<PassKind, string> = { edit: 'this edit', restyle: 'the restyle', transfer: 'the style transfer', relight: 'the relight', note: 'the note', sketch: 'Render from sketch', empty: 'Empty the room', furnish: 'Furnish the room' }
export type IntentOptions = {
  hasImage: boolean; sketch: boolean
  /** The version on screen's reading — the visible surfaces and pieces (preferred to the two sets below). */
  reading?: Detection | null
  /** Resolves a material id — a pick whose material is gone doesn't count (F197). */
  resolve?: (id: string) => MaterialRef | null
  /** (F053) What can run on the version on screen — Empty and Furnish wait with the reason where they can't. */
  tools?: ToolAvailability | null
  visibleSurfaces?: Set<string>; visibleFurniture?: Set<string>
}
export function intentFor(p: Pending, o: IntentOptions): Intent {
  const reading: Detection | null = o.reading ?? (o.visibleSurfaces || o.visibleFurniture
    ? { kind: 'photo', source: 'fallback', context: null, surfaces: [...(o.visibleSurfaces ?? [])].map((id) => ({ id, label: id, x: 0, y: 0 })), furniture: [...(o.visibleFurniture ?? [])].map((id) => ({ id, label: id, category: '', x: 0, y: 0 })) }
    : null)
  const resolve = o.resolve ?? ((id: string) => ({ id, name: id, hex: '#808080', finish: 'matte' as const, imageUrl: null, category: '', source: 'catalogue' as const }))
  const list = changeList(p, { reading, resolve })
  const has = (s: Slot) => list.some((c) => c.slot === s)
  const materials = has('materials'), pieces = has('furniture'), light = has('lighting'), note = has('note'), style = has('style'), refs = has('refs')
  const plan = (kind: PassKind, label: string, busy: string, reason: string | null = null): Intent => {
    const uses = USES[kind]
    const used = list.filter((c) => uses.includes(c.slot) && (c.slot !== 'tool' || kind === 'empty' || kind === 'furnish'))
    const ignored = list.filter((c) => !used.includes(c)).map((c) => c.id)
    const n = used.filter((c) => c.slot !== 'tool').length
    return { kind: reason ? null : kind, label: kind === 'edit' && !reason ? (n > 1 ? `Generate · ${n} changes` : 'Generate') : label, busy, changes: n, reason, ignored, ignoredNote: ignored.length ? `Not used by ${PASS_NAME[kind]} — kept for your next Generate` : null, consumes: uses, total: list.length }
  }
  const off = (label: string, reason: string): Intent => ({ kind: null, label, busy: 'Rendering…', changes: list.length, reason, ignored: [], ignoredNote: null, consumes: [], total: list.length })
  if (!o.hasImage) return off('Generate', 'Add a room photo first.')
  if (o.sketch && !p.asPhoto) return plan('sketch', 'Render from sketch', 'Rendering your sketch…')
  if (p.tool === 'empty') return plan('empty', 'Empty the room', 'Emptying the room…', o.tools && !o.tools.canEmpty ? `${o.tools.emptyWhy}.` : null)
  if (p.tool === 'furnish') return plan('furnish', 'Furnish the room', 'Furnishing…', o.tools && !o.tools.canFurnish ? `${o.tools.furnishWhy}.` : null)
  if (materials || pieces) {
    /* (F032) a Replace with nothing chosen waits with what it needs, instead of failing after the progress card */
    const unready = list.find((c) => c.needs)
    if (unready) return plan('edit', 'Generate', 'Rendering…', unready.needs!)
    const removing = Object.entries(p.furniture).some(([id, f]) => f.action === 'remove' && reading?.furniture.some((x) => x.id === id))
    if (removing && o.tools && !o.tools.canRemove) return plan('edit', 'Generate', 'Rendering…', `${o.tools.removeWhy}.`)
    return plan('edit', 'Generate', 'Rendering…')
  }
  if (refs) return plan('transfer', 'Style transfer', 'Reading the reference…', p.transfer.aspects.length ? null : 'Pick at least one thing to carry over from the reference.')
  if (style) return plan('restyle', `Restyle as ${p.style}`, 'Restyling…')
  if (light) return plan('relight', 'Relight', 'Relighting…')
  if (note) {
    /* (verify round 1) a note the rules can't read — or whose colours have nowhere to go on this version — says so before any progress
       card runs, never after it (and never saves a copy of the version) */
    const r = readNote(p.note)
    if (!r) return off('Generate from note', NOTE_UNREAD)
    const only = r.paints.length && !r.style && !r.lighting && !r.warmer && !r.empty
    if (only && reading && !r.paints.some((pt) => { const t = paintTargets(reading, pt.target); return t.surfaces.length + t.pieces.length > 0 })) {
      return off('Generate from note', reading.surfaces.length + reading.furniture.length === 0 ? WHOLE_ROOM_UNMARKED : `We couldn’t find the ${r.paints[0]!.target} on this photo — add it in Surfaces first.`)
    }
    return plan('note', 'Generate from note', 'Reading your note…')
  }
  return off('Generate', 'Pick a finish, a style or a light first.')
}

/** The engine's words for a note it can't read (engine/run.ts says the same after a Generate). */
export const NOTE_UNREAD = 'We couldn’t turn that note into a change — try a surface and a finish, like “sage green walls”.'
/** (F022) A whole-room look keeps none of the photo's outlines — a change that needs one says so. */
export const WHOLE_ROOM_UNMARKED = 'This version is a whole-room look — its surfaces aren’t marked. Draw one, or edit from the Original.'
/** What a note's colour names on a reading: the surfaces whose label or group holds it; the pieces that ARE it (their head noun — "walls"
    never paints the wall-mounted TV). */
export function paintTargets(reading: Detection, target: string): { surfaces: SurfaceDef[]; pieces: FurnitureDef[] } {
  return {
    surfaces: reading.surfaces.filter((x) => x.label.toLowerCase().includes(target) || surfaceGroupFor(x.label).toLowerCase().includes(target)),
    pieces: reading.furniture.filter((x) => { const h = nounOf(headOfLabel(x.label)), t = nounOf(target.split(/\s+/).pop() ?? target); return h === t || (target.includes(' ') && x.label.toLowerCase().includes(target)) }),
  }
}

/* ── versions ── */
export type VersionView = { key: string; n: number; jobId: string; variantId: number; label: string; descriptor: string; imageUrl: string; parentKey: string; applied: Applied; finishes: Finishes; createdAt: number; createdBy: string | null; kind: PassKind; deleted: boolean }
export const versionKey = (jobId: string, variantId: number) => `${jobId}:${variantId}`

/** A version as the light rules read it — its applied changes, when known. */
type LightView = Pick<VersionView, 'key' | 'kind' | 'parentKey'> & { applied?: Pick<Applied, 'surfaces' | 'furniture' | 'style' | 'palette' | 'scope' | 'lighting'> | null }
/** (wave F, UAT 13.32) A version that only changed the light: a relight, or a note that changed nothing but the light ("warmer evening
    light") — a light too, so a new light replaces it and an edit made on it is made under it. */
export const lightOnly = (v: LightView): boolean =>
  v.kind === 'relight' || (v.kind === 'note' && !!v.applied && !v.applied.surfaces.length && !v.applied.furniture.length && !v.applied.style && !v.applied.palette?.length && !v.applied.scope)
/** (F063) The picture under the light on screen: a relight of a relight goes back to the last version that wasn't relit (or the
    Original) — a new light replaces the old one instead of stacking on it. Null for a version that isn't a relight (wave F: a note that
    only changed the light counts as one). */
export function unlitSource(view: LightView | null, versions: LightView[]): { key: string } | null {
  if (!view || !lightOnly(view)) return null
  let cur: LightView | null = view
  const seen = new Set<string>()
  while (cur && lightOnly(cur) && !seen.has(cur.key)) {
    seen.add(cur.key)
    if (cur.parentKey === ORIGINAL) return { key: ORIGINAL }
    const parentKey: string = cur.parentKey
    cur = versions.find((v) => v.key === parentKey) ?? null
  }
  return cur ? { key: cur.key } : { key: ORIGINAL }
}
/** (wave F, UAT 13.32) The light a version was made under: an edit, a transfer or a note made on a lit version — or on one made on it —
    still shows that light, so the next change is made under it too (`key` the light's own version, `unlitKey` the picture under it).
    Null for a light itself (`unlitSource` has it), and once a pass since brought its own picture or its own light (a style, an emptied or
    furnished room, a sketch, a light picked with the change). */
export function litAncestor(view: LightView | null, versions: LightView[]): { key: string; unlitKey: string } | null {
  if (!view || lightOnly(view)) return null
  let cur: LightView | null = view
  const seen = new Set<string>()
  while (cur && !seen.has(cur.key)) {
    seen.add(cur.key)
    if (lightOnly(cur)) { const u = unlitSource(cur, versions); return u ? { key: cur.key, unlitKey: u.key } : null }
    const a = cur.applied
    if (!a || a.lighting || a.scope || (cur.kind !== 'edit' && cur.kind !== 'transfer' && cur.kind !== 'note') || (cur.kind === 'note' && a.style)) return null
    if (cur.parentKey === ORIGINAL) return null
    const parentKey: string = cur.parentKey
    cur = versions.find((v) => v.key === parentKey) ?? null
  }
  return null
}

/** The room's reading for the version on screen (§5.2): a sketch's photo reads as its sample; a whole-room look keeps none of the photo's
    outlines — its walls, floor and pieces were redrawn by the look (F022), so only what the studio marked on it stays; taken-out pieces
    are gone; manual adds always stay. */
export function readingFor(room: { detection: Detection; sampleKey: string | null }, f: Finishes): Detection {
  let d = room.detection
  if (d.kind === 'sketch' && f.fromSketch) { const s = sampleByKey(room.sampleKey); d = s ? { ...sampleDetection(s), hidden: d.hidden, surfaces: [...sampleDetection(s).surfaces, ...d.surfaces.filter((x) => x.manual)], furniture: [...sampleDetection(s).furniture, ...d.furniture.filter((x) => x.manual)] } : { ...d, kind: 'photo' } }
  const hidden = new Set(d.hidden ?? [])
  return {
    ...d,
    surfaces: d.surfaces.filter((s) => !hidden.has(s.id) && (!f.reshaped || s.manual)),
    furniture: d.furniture.filter((x) => !hidden.has(x.id) && !f.removed.includes(x.id) && (!f.reshaped || x.manual)),
  }
}

/** The summary each mode shows beside its name. */
export function modeSummary(p: Pending): Record<'style' | 'surfaces' | 'furniture' | 'lighting' | 'tools', string> {
  const n = Object.keys(p.materials).length, m = Object.values(p.furniture).filter((f) => f.action !== 'keep').length
  return {
    style: p.style || (p.transfer.refs.length ? 'Reference' : 'None'),
    surfaces: n ? `${n} set` : '',
    furniture: m ? `${m} changed` : '',
    lighting: p.lighting.presetId ? presetById(p.lighting.presetId)?.label ?? 'Custom' : lightingSet(p.lighting.knobs, null, p.lighting.instruction) ? 'Custom' : 'Off',
    tools: p.tool === 'empty' ? 'Empty the room' : p.tool === 'furnish' ? 'Auto furnish' : p.note.trim() ? 'Note added' : '',
  }
}
