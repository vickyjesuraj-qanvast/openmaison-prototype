import { fallbackDetection, ORIGINAL, type Detection, type Finishes, type VersionView } from '@/lib/visualizer/model'

/* The editor's own pure helpers (audit 2026-09-26) — what the orchestrator derives from the room and its versions. */

/**
 * (F082) What a version is compared with by default: its parent — or, when that was deleted, the nearest live version up the line, else
 * the Original. Present and the canvas' Compare read the same answer.
 */
export function beforeKeyOf(v: Pick<VersionView, 'key' | 'parentKey'>, all: Pick<VersionView, 'key' | 'parentKey' | 'deleted'>[]): string {
  const seen = new Set<string>([v.key])
  let key = v.parentKey
  while (key !== ORIGINAL && !seen.has(key)) {
    seen.add(key)
    const p = all.find((x) => x.key === key)
    if (!p) return ORIGINAL
    if (!p.deleted) return p.key
    key = p.parentKey
  }
  return ORIGINAL
}

/* The fallback three, with ids that never change — a pick made on them survives a reload and every re-read (F058). */
const FIXED: Record<string, string> = { Walls: 'sketch-walls', Floor: 'sketch-floor', Ceiling: 'sketch-ceiling' }
const SKETCH_AS_PHOTO = fallbackDetection().surfaces.map((s) => ({ ...s, id: FIXED[s.label] ?? s.id }))

/**
 * (F058) *Not a sketch? Use it as it is* is one pick (`pending.asPhoto`), never a change to the reading: while it is on, a sketch reads
 * as a photo with the fallback walls, floor and ceiling (plus whatever the studio marked by hand); ⌘Z or the snackbar's Undo takes the
 * one step back and *Render from sketch* is there again. A version rendered from the sketch keeps its own reading.
 */
export function effectiveDetection(d: Detection | null, asPhoto: boolean | undefined, f: Finishes): Detection | null {
  if (!d || d.kind !== 'sketch' || !asPhoto || f.fromSketch) return d
  return { ...d, kind: 'photo', source: 'fallback', surfaces: [...SKETCH_AS_PHOTO, ...d.surfaces.filter((s) => s.manual)] }
}

/**
 * (F022, verify round 2) The picture a version's shapes belong to: its own key when it swapped the room's picture for a whole-room look
 * (a restyle, a furnished look, a sketch rendered), else its parent's, up to the Original. Two versions with the same answer show the
 * room in the same place — a surface traced on one lines up on the other.
 */
const NEW_PICTURE = new Set<VersionView['kind']>(['restyle', 'furnish', 'sketch'])
export function pictureOf(key: string, all: Pick<VersionView, 'key' | 'parentKey' | 'kind' | 'finishes'>[]): string {
  const seen = new Set<string>()
  let k = key
  while (k !== ORIGINAL && !seen.has(k)) {
    seen.add(k)
    const v = all.find((x) => x.key === k)
    if (!v) return ORIGINAL
    const p = v.parentKey === ORIGINAL ? null : all.find((x) => x.key === v.parentKey) ?? null
    const own = v.finishes.reshaped || v.finishes.fromSketch
    if (own && (NEW_PICTURE.has(v.kind) || !(p?.finishes.reshaped || p?.finishes.fromSketch))) return v.key
    k = v.parentKey
  }
  return ORIGINAL
}

/** A box `r` around a point, inside the photo (0…1). */
export const boxAround = (p: { x: number; y: number }, r: number): [number, number, number, number] =>
  [Math.max(0, p.x - r), Math.max(0, p.y - r), Math.min(1, p.x + r), Math.min(1, p.y + r)]
/** (F023) How far a tap is read again to learn whether its own box (tappedSurface's 0.2) cut its region short. */
export const WIDE_TAP = 0.35

/** What a surface or a piece marked by hand carries: the version it was marked on (`ORIGINAL` for the photo). */
export type MarkedOn = { markedOn?: string }

/**
 * (F022) A surface or a piece marked by hand belongs to the picture it was marked on: on a version of another picture (a whole-room look
 * made after it, or the photo under a look it was marked on) it is left out — the list, the markers, Generate. Older marks (no
 * `markedOn`) keep reading as before.
 */
export function onPicture(d: Detection | null, viewKey: string, all: Pick<VersionView, 'key' | 'parentKey' | 'kind' | 'finishes'>[]): Detection | null {
  if (!d) return d
  const here = pictureOf(viewKey, all)
  const fits = (x: MarkedOn & { manual?: boolean }) => !x.manual || !x.markedOn || pictureOf(x.markedOn, all) === here
  if (d.surfaces.every(fits) && d.furniture.every(fits)) return d
  return { ...d, surfaces: d.surfaces.filter(fits), furniture: d.furniture.filter(fits) }
}

/** (F019) When the design was last touched, as the loader hands it over — a room's state or a render, whichever is newer. */
export function lastTouched(rooms: { updatedAt: number }[], jobs: { createdAt: number }[]): number | null {
  const at = Math.max(0, ...rooms.map((r) => r.updatedAt), ...jobs.map((j) => j.createdAt))
  return at > 0 ? at : null
}

/** (F014) "V13", or a run's "V13–V15" (a Generate's versions are numbered in a row). */
export const versionRange = (ns: number[]) => (ns.length > 1 ? `V${ns[0]}–V${ns[ns.length - 1]}` : `V${ns[0] ?? ''}`)

/**
 * (critic 19) A room photo, a reference or a swatch picked from the device: JPG, PNG, WebP and HEIC — redrawn as a JPEG before it is sent,
 * so a large phone photo goes up at a web size. (pending modules S20) HEIC on every browser: Safari draws it, elsewhere 1.0's converter
 * turns it into a JPEG first (`normalizePicture`, lib/heic.ts). A file the device gave no type is let through to be read — its own bytes
 * say whether it is a HEIC; anything else that isn't a picture is refused there.
 */
export { UPLOAD_MAX_BYTES, isHeic, untyped } from './picture-reader'   // (pending modules S36) in a light module of their own
