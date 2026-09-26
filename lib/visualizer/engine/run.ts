'use client'

import { suggestMaterials } from '../catalogue'
import { COLOUR_HEX, FINISH_HEX, PART_WORD, composeCustomizeDesc, customizePart, finishSheen, replacementName, type PartKey } from '../furniture'
import { RELIGHT_PRESETS, SAMPLE_LIGHT, fixtureOfPiece, lightingSet, presetById, type LightFixture, type RelightKnobs } from '../lighting'
import { alternatesFor, fromCatalogue, LAID_CATEGORIES, materialFamily, shade, surfaceFamily } from '../materials'
import { NOTE_UNREAD, ORIGINAL, paintTargets, pickNeeds, readingFor, sampleDetection, toolAvailability, WHOLE_ROOM_UNMARKED, type Applied, type Detection, type Finishes, type FurnitureDef, type MaterialRef, type PassKind, type Pending, type Slot, type SurfaceDef } from '../model'
import { colourIn, keepMatch, keepTargets, readNote, type NoteReading } from '../note'
import { plainFinishName } from '../outputs'
import { patternSize, patternTile } from '../patterns'
import { sampleByKey, type SampleRoom } from '../samples'
import { styleByName } from '../styles'
import { labelInText, normFurnitureKey, surfaceGroupFor, titleCaseLabel } from '../surfaces'
import { EMPTY_SCOPES, namedPieces } from '../tools'
import { grade, styleLight, type LightScene } from './grade'
import { dominantColour, pickRoles, referencePalette } from './palette'
import { cloneImg, resample, rgbToHex, type Img, type Pt } from './pixels'
import { alongFill, castShadow, composite, featherMask, mendFrom, mirrorFill, paintAcc, paste, recolor, shadeIn, shadeTarget, spreadMask, textureFill, type PaintAcc } from './recolor'
import { clipToOutlines, edgeMatte, growRegion, insideOf, keepNear, maskCoverage, offHue, outlineRegion, polygonMask, tapSeeds } from './segment'
import { CEILING_M, frameFor, makeTexture, planeMap, quadMap, screenMap, type Frame, type TexMap, type Texture } from './texture'
import { rebuild, weaveFill, type Plane, type RebuildStep } from './mend'

/* AI Visualizer engine (REG-673, audit §5) — one Generate, in the browser: the photo on screen in, one to three variants out, each with
   what it applied and what the room now shows. The pixel work is the pure engine beside this file; this one loads pictures through a
   canvas and answers the passes the prototype cannot make with 1.0's own honest words.

   (audit 2026-09-26) What changed, pass by pass:
   · Remove lays the room's empty plate re-finished WHOLE (its surfaces grown without the photo's furniture holes, F179), keeps every
     piece in front of the one taken out and the visible part of those behind it (F181), reads the plate's light only off the room's own
     surfaces (F028), and every other change in the same Generate is worked out on the untouched photo first (F028).
   · Customize and Replace paint the piece only: its outline, never a neighbour standing in front of it, never the wall or floor the grow
     leaked into (F024). A surface or a piece tapped on the photo grows only near the tap (F023); a drawn one keeps off what stands in
     front of it (F033).
   · Floors, tiles and stone keep the photo's texture where the photo shows that kind of material, and lay their own grain, boards,
     joints or veins in the surface's perspective where it doesn't (F047 · F187 · F191).
   · The light and the note ride along with a restyle, a transfer, a sketch and a relight; what a pass could not use is reported
     (`consumed`) and waits for the next Generate (F052). A transfer maps a reference's colours by role (F189), keeps what "Keep
     unchanged" names (F056); Furnish follows the style and Leave out (F055); Empty says what it could not take out (F064); a restyle of an
     edited version says the look starts from the photo (F192). A Generate that would change nothing says so instead of saving a copy
     (F197). Each refusal names its real cause (F053). */

/** (audit 2026-09-26) How the engine reads and writes pictures — the browser's canvas by default. A Node check (the scripts that render
    the sample rooms with the very passes the browser runs) swaps in its own; nothing else changes. */
export type ImageIO = { decode: (url: string) => Promise<Img>; encode: (img: Img, quality: number) => string }
const canvasIO: ImageIO = {
  decode: (url) => new Promise<Img>((resolve, reject) => {
    const el = new Image()
    el.crossOrigin = 'anonymous'
    el.onload = () => {
      const c = document.createElement('canvas')
      c.width = el.naturalWidth; c.height = el.naturalHeight
      const ctx = c.getContext('2d', { willReadFrequently: true })
      if (!ctx) { reject(new Error('no canvas')); return }
      ctx.drawImage(el, 0, 0)
      const d = ctx.getImageData(0, 0, c.width, c.height)
      resolve({ width: d.width, height: d.height, data: d.data })
    }
    el.onerror = () => reject(new Error(`could not load ${url.slice(0, 60)}`))
    el.src = url
  }),
  encode: (img, quality) => {
    const c = document.createElement('canvas')
    c.width = img.width; c.height = img.height
    const ctx = c.getContext('2d')
    if (!ctx) return ''
    ctx.putImageData(new ImageData(img.data as unknown as Uint8ClampedArray<ArrayBuffer>, img.width, img.height), 0, 0)
    return c.toDataURL('image/jpeg', quality)
  },
}
let io: ImageIO = canvasIO
export function setImageIO(next: Partial<ImageIO>): void { io = { ...io, ...next }; imgCache.clear(); maskCache.clear() }

/** A short, collision-safe key for a picture's address — a data URL is ~150 KB; its FNV-1a hash and length stand in for it. */
export function urlKey(url: string): string {
  if (url.length <= 200) return url
  let h = 0x811c9dc5
  for (let i = 0; i < url.length; i++) { h ^= url.charCodeAt(i); h = Math.imul(h, 0x01000193) }
  return `#${url.length.toString(36)}.${(h >>> 0).toString(36)}`
}
/** (F212) The pictures read so far, most recent last — a small LRU, so browsing thirty versions doesn't keep thirty decoded photos. */
const IMG_CACHE = 16
const imgCache = new Map<string, Promise<Img>>()
function readImg(url: string): Promise<Img> {
  const k = urlKey(url), hit = imgCache.get(k)
  if (hit) { imgCache.delete(k); imgCache.set(k, hit); return hit }
  const p = io.decode(url)
  imgCache.set(k, p)
  p.catch(() => { if (imgCache.get(k) === p) imgCache.delete(k) })
  while (imgCache.size > IMG_CACHE) { const first = imgCache.keys().next(); if (first.done) break; imgCache.delete(first.value) }
  return p
}
/** A picture as pixels — a copy, free to change. */
export function loadImg(url: string): Promise<Img> { return readImg(url).then(cloneImg) }
export function toDataUrl(img: Img, quality = 0.9): string { return io.encode(img, quality) }

/* ── regions ── */
type Def = SurfaceDef | FurnitureDef
const isPiece = (d: Def): d is FurnitureDef => 'category' in d
/** (F030) The geometry that decides a region — a redrawn outline, a moved seed, a changed limit is another region. The canvas' highlight
    keys on it too, so a redraw lights the new region at once. */
export function defKey(def: Def): string {
  const g = isPiece(def)
    ? { r: def.region, s: def.seeds, x: def.x, y: def.y, l: def.local, g: def.global, m: def.manual, b: def.box, c: def.cut, co: def.cutout, cat: def.category, gr: def.grow, wh: def.whole }
    : { r: def.region, s: def.seeds, x: def.x, y: def.y, l: def.local, g: def.global, m: def.manual, e: def.exclude, w: def.within, h: def.hull, co: def.cutout, so: def.soft, gl: def.glass, k: def.key, gr: def.grow, ke: def.keyed }
  return JSON.stringify(g)
}
const readingKeys = new WeakMap<Detection, string>()
function readingKey(d: Detection | null | undefined): string {
  if (!d) return ''
  const hit = readingKeys.get(d); if (hit) return hit
  const k = urlKey([...d.surfaces, ...d.furniture].map((x) => `${x.id}:${defKey(x)}`).join('|'))
  readingKeys.set(d, k); return k
}
/** Masks are kept quantised (a mask is 0…1): a quarter of the memory, and a small LRU — thirty masks of a 900 px photo is 16 MB. */
const MASKS = 60
const maskCache = new Map<string, Uint8ClampedArray>()
function cacheGet(key: string, n: number): Float32Array | null {
  const q = maskCache.get(key)
  if (!q || q.length !== n) return null
  maskCache.delete(key); maskCache.set(key, q)
  const out = new Float32Array(n); for (let i = 0; i < n; i++) out[i] = q[i]! / 255
  return out
}
function cachePut(key: string, m: Float32Array): void {
  const q = new Uint8ClampedArray(m.length); for (let i = 0; i < m.length; i++) q[i] = Math.round(m[i]! * 255)
  maskCache.set(key, q)
  while (maskCache.size > MASKS) { const first = maskCache.keys().next(); if (first.done) break; maskCache.delete(first.value) }
}

export type RegionCtx = {
  /** The room's empty plate: its surfaces grow whole — the furniture the photo's outlines leave out isn't there (F179). */
  plate?: boolean
  /** The reading around the region: a piece keeps off its neighbours in front and the room's surfaces (F024); a tapped surface off
      what the photo already knows (F023); a drawn one off the pieces standing in front of it (F033). */
  reading?: Detection | null
}
/** A surface's or a piece's region on a photo — drawn, or grown from its seeds (cached per picture, per geometry). A fresh copy. */
export function regionOf(img: Img, url: string, def: Def, size = 480, ctx: RegionCtx = {}): Float32Array {
  /* only a piece, a tapped surface or a drawn one reads the room around it — a curated surface is the same mask whatever the reading */
  const reading = !ctx.plate && (isPiece(def) || def.manual || (def.region?.length ?? 0) >= 3) ? ctx.reading ?? null : null
  const key = `${urlKey(url)}|${def.id}|${defKey(def)}|${size}|${ctx.plate ? 'plate' : ''}|${readingKey(reading)}`
  const n = img.width * img.height
  const hit = cacheGet(key, n)
  if (hit) return hit
  const m = computeRegion(img, url, def, size, !!ctx.plate, reading)
  cachePut(key, m)
  return m
}
const boxPoly = (b: [number, number, number, number]): Pt[] => [{ x: b[0], y: b[1] }, { x: b[2], y: b[1] }, { x: b[2], y: b[3] }, { x: b[0], y: b[3] }]
const boxAround = (pts: Pt[], r: number): [number, number, number, number] => {
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y)
  return [Math.max(0, Math.min(...xs) - r), Math.max(0, Math.min(...ys) - r), Math.min(1, Math.max(...xs) + r), Math.min(1, Math.max(...ys) + r)]
}
/** A polygon that isn't just its box — a traced outline (a box `cut`, even drawn a hair off square, stands for "somewhere in here"). */
export function isTraced(poly: Pt[] | undefined): poly is Pt[] {
  if (!poly || poly.length < 3) return false
  if (poly.length !== 4) return true
  const near = (vs: number[]) => { const s = [...vs].sort((a, b) => a - b); return s[1]! - s[0]! < 0.006 && s[3]! - s[2]! < 0.006 }
  return !(near(poly.map((p) => p.x)) && near(poly.map((p) => p.y)))
}
const bboxOf = (d: Def): [number, number, number, number] => {
  const pts = d.region ?? (isPiece(d) ? d.cut : d.hull?.flat())
  if (isPiece(d) && d.box) return d.box
  if (pts?.length) return [Math.min(...pts.map((p) => p.x)), Math.min(...pts.map((p) => p.y)), Math.max(...pts.map((p) => p.x)), Math.max(...pts.map((p) => p.y))]
  return [d.x - 0.05, d.y - 0.05, d.x + 0.05, d.y + 0.05]
}
const overlap = (a: Def, b: Def) => { const p = bboxOf(a), q = bboxOf(b); return p[0] < q[2] && q[0] < p[2] && p[1] < q[3] && q[1] < p[3] }
/** Which stands nearer the camera (F181): a sample may say so (`front`); else a rug lies under everything, what hangs on a wall is behind
    what stands on the floor, and of two standing pieces the one whose foot is lower in the picture is nearer. */
export function inFront(a: FurnitureDef, b: FurnitureDef): boolean {
  const la = normFurnitureKey(a.label), lb = normFurnitureKey(b.label)
  if (b.front?.length || a.front?.length) {
    if (b.front?.some((x) => normFurnitureKey(x) === la)) return true
    if (a.front?.some((x) => normFurnitureKey(x) === lb)) return false
  }
  const layer = (f: FurnitureDef) => (/\b(rugs?|carpets?|mats?|runners?)\b/.test(f.label.toLowerCase()) ? 0 : /\b(art|painting|print|frame|framed|mirror|tv|television|curtains?|drapes?|blinds?|sconce|shelf|shelves|clock|poster|canvas)\b/.test(f.label.toLowerCase()) ? 1 : 2)
  if (layer(a) !== layer(b)) return layer(a) > layer(b)
  return bboxOf(a)[3] > bboxOf(b)[3] + 0.004
}
/** A mask with others taken out of it — unless the region's own seed stands inside one (a feature wall marked on the wall). */
function keepOff(m: Float32Array, others: Float32Array[], seeds: Pt[], W: number, H: number): Float32Array {
  for (const o of others) {
    if (seeds.some((p) => (o[Math.min(H - 1, Math.max(0, Math.round(p.y * H))) * W + Math.min(W - 1, Math.max(0, Math.round(p.x * W)))] ?? 0) > 0.5)) continue
    for (let i = 0; i < m.length; i++) { const v = o[i]!; if (v > 0) m[i] = m[i]! * (1 - Math.min(1, v * 1.5)) }
  }
  return m
}
/** (F033) A piece the wall shows through — leaves, fronds, stems: a drawn surface behind it is keyed between them. */
const seeThrough = (f: FurnitureDef) => /\b(plants?|fig|tree|palm|fern|monstera|flowers?|pampas|grass|foliage|leaves)\b/i.test(f.label)
/** A piece's own pixels: its traced outline; else its region (grown inside its box). */
function outlineOf(img: Img, url: string, f: FurnitureDef, size: number, reading: Detection | null): Float32Array {
  if (isTraced(f.cut)) { const k = `${urlKey(url)}|${f.id}|outline|${JSON.stringify(f.cut)}|${img.width}`; const hit = cacheGet(k, img.width * img.height); if (hit) return hit; const m = polygonMask(img.width, img.height, f.cut); cachePut(k, m); return m }
  return regionOf(img, url, f, size, { reading })
}
function computeRegion(img: Img, url: string, def: Def, size: number, plate: boolean, reading: Detection | null): Float32Array {
  const W = img.width, H = img.height
  const seeds = def.seeds?.length ? def.seeds : [{ x: def.x, y: def.y }]
  if (def.region && def.region.length >= 3) {
    if (plate || isPiece(def)) return polygonMask(W, H, def.region)
    /* (F033) a drawn surface: the outline as drawn — grown on its own colour inside it where it can be — without the pieces in front */
    /* (verify round 1) a see-through piece in front (a fig's leaves) is keyed, not cut out whole: the wall between its leaves is painted */
    const near = reading ? reading.furniture.filter((f) => overlap(f, def)) : []
    const see = near.filter((f) => seeThrough(f) && isTraced(f.cut))
    const avoid = near.filter((f) => !see.includes(f)).map((f) => outlineOf(img, url, f, size, reading))
    return outlineRegion(img, def.region, { seeds: def.manual ? undefined : def.seeds, local: def.local, global: def.global, exclude: def.exclude, cutout: def.cutout, soft: def.soft, key: def.key, size, avoid, see: see.map((f) => f.cut!), grow: !/glass|glazing|mirror|window pane/i.test(def.label), ...(def.grow ?? {}) })
  }
  if (isPiece(def)) {
    const tapped = !!def.manual
    /* (F024) neighbours standing in front are never painted; a decor or lighting piece without a traced outline grows tighter */
    /* (wave E, surfaces-14) …but never one the studio clicked through to mark it (a cushion on the sofa is seen where it was clicked) */
    const clicked = tapped && !def.region ? seeds[0] ?? null : null
    const front = reading ? reading.furniture.filter((o) => o.id !== def.id && isTraced(o.cut) && overlap(o, def) && inFront(o, def) && !(clicked && inPoly(o.cut!, clicked.x, clicked.y))).map((o) => o.cut!) : []
    /* (F182 · F024, verify round 1) a piece whose traced outline is all of it (a sheer curtain, its shaded folds by the wall too): the
       outline, without what stands in front of it — never a colour grow that stops at the folds */
    /* (wave E, surfaces-12) its line finished by the colour, a few pixels either side: a trace a hair short of a lit base rail still
       takes it, a trace a hair over the floor leaves the floor */
    if (def.whole && isTraced(def.cut)) return edgeMatte(img, def.cut, 5, [...(def.cutout ?? []), ...front])
    const loose = /Decor|Lighting/.test(def.category) && !isTraced(def.cut)
    const global = tapped ? Math.min(def.global ?? 14, 14) : loose ? Math.min(def.global ?? 20, 16) : def.global
    const local = tapped ? Math.min(def.local ?? 6, 6) : def.local
    /* a piece only boxed (no traced outline) weighs lightness fully: a white pillow is not a beige headboard, a cream throw not a grey
       bedspread — lightness counts half only for the room's large surfaces, where it is shading */
    /* (wave E, surfaces-14) a piece marked with one click grows from the click and the colour around it that is the click's own in another
       light (a click in the shade between a plant's leaves takes the leaves), shade counting as shade — never a speck round the click */
    const oneClick = tapped && !isTraced(def.cut)
    const tap = oneClick ? tapSeeds(img, seeds[0]!) : null, loosen = !!tap?.hue   // a white or a grey keeps the tight limits
    const m = growRegion(img, tap?.seeds ?? seeds, { local: loosen ? 7 : local, global: loosen ? 19 : global, within: def.box ?? boxAround(seeds, 0.15), hull: def.cut && def.cut.length >= 3 ? [def.cut] : undefined, cutout: [...(def.cutout ?? []), ...front], size, ...(isTraced(def.cut) ? {} : { lightWeight: loosen ? 0.5 : 1 }), ...(loosen ? { pockets: true } : {}), ...(def.grow ?? {}) })
    /* …never what shows of a piece the photo already knows (the armchair behind a cushion — its outline without what stands in front of
       it), unless the click is on it */
    if (oneClick && reading) {
      const known = reading.furniture.filter((o) => o.id !== def.id && isTraced(o.cut) && overlap(o, def))
      keepOff(m, known.map((o) => {
        const q = polygonMask(W, H, o.cut!)
        for (const f of known) if (f.id !== o.id && inFront(f, o)) { const pf = polygonMask(W, H, f.cut!); for (let i = 0; i < q.length; i++) q[i] = q[i]! * (1 - pf[i]!) }
        return q
      }), seeds, W, H)
    }
    /* …and, where no traced outline bounds it, never the room's surfaces the grow leaked into (a curtain's top into the ceiling, a
       stool's legs into the floor) — a traced outline is the piece already */
    if (reading && !isTraced(def.cut)) return keepOff(m, reading.surfaces.filter((s) => !s.manual && !s.region).map((s) => regionOf(img, url, s, size)), seeds, W, H)
    /* (wave E, surfaces-12) a traced piece is all of its outline's middle: the grow decides the edge, but a patch it couldn't reach inside
       (a shaded arm end, a crease between cushions, a sunlit corner of a bedspread) is the piece too — never left in its old colour */
    if (isTraced(def.cut) && !tapped) {
      const P = polygonMask(W, H, def.cut)
      clipToOutlines(P, W, H, { cutout: [...(def.cutout ?? []), ...front] })
      const core = insideOf(P, W, H, Math.max(3, Math.round(W * 0.006)))
      for (let i = 0; i < m.length; i++) if (core[i]! > m[i]!) m[i] = core[i]!
    }
    return m
  }
  if (def.manual) {
    /* (F023) tapped: tight colour limits, near the tap only, and off every region the photo already knows */
    const m = growRegion(img, seeds, { local: Math.min(def.local ?? 4, 4), global: Math.min(def.global ?? 10, 10), within: def.within ?? boxAround(seeds, 0.2), hull: def.hull, cutout: def.cutout, exclude: def.exclude, size, ...(def.grow ?? {}) })
    if (!reading || plate) return m
    const others = [...reading.surfaces.filter((s) => s.id !== def.id && !s.manual && !s.region).map((s) => regionOf(img, url, s, size)), ...reading.furniture.map((f) => outlineOf(img, url, f, size, null))]
    return keepOff(m, others, seeds, W, H)
  }
  if (plate) return growRegion(img, seeds, { local: def.local, global: def.global, within: def.within, hull: def.hull, key: def.key, size, ...(def.grow ?? {}) })
  const grown = growRegion(img, seeds, { local: def.local, global: def.global, exclude: def.exclude, within: def.within, hull: def.hull, cutout: def.cutout, soft: def.soft, glass: def.glass, key: def.key, size, ...(def.grow ?? {}) })
  /* (wave F) a part seen in pieces between things in front of it (the island's back panel between the stools' legs) is keyed by its own
     colour there — its seeds inside that outline, lightness counting fully and a tight limit, so a walnut leg or a grey seat in its shade
     stays what it is — never flooded into what stands in front */
  const inKeyed = (def.keyed ?? []).filter((q) => q.length >= 3)
  const ks = inKeyed.length ? seeds.filter((p) => inKeyed.some((q) => inPoly(q, p.x, p.y))) : []
  if (!ks.length) return grown
  const keyedPart = growRegion(img, ks, { key: true, hull: inKeyed, cutout: def.cutout, local: def.local, global: 6, lightWeight: 1, size })
  keepNear(img, keyedPart, ks, 6); offHue(img, keyedPart, inKeyed)
  for (let i = 0; i < grown.length; i++) if (keyedPart[i]! > grown[i]!) grown[i] = keyedPart[i]!
  return grown
}
/** (F023) How much of the photo a surface's or a piece's region lights, 0…1 — a tap that spread over a quarter of it should be traced. */
export async function regionShare(url: string, def: Def, reading?: Detection | null): Promise<number> {
  const img = await readImg(url)
  return maskCoverage(regionOf(img, url, def, 480, { reading }))
}

/* ── the pass ── */
export type PassInput = {
  kind: PassKind
  /** The version on screen — its picture and what it shows. */
  base: { key: string; url: string; finishes: Finishes }
  /** `photoUrl` (wave F) — the room's own photo, the picture its reading describes (a sample's original is known without it). */
  room: { sampleKey: string | null; detection: Detection; name: string; photoUrl?: string | null }
  pending: Pending
  resolve: (id: string) => MaterialRef | null
  /** (F055) The lead's style — what Furnish and Render from sketch use when no style is picked (the Tools panel names it). */
  leadStyle?: string | null
  /** (F063) The picture under the light on screen (`unlitSource`): a relight of a relit version relights this, so lights don't stack. */
  unlit?: { key: string; url: string } | null
  /** (wave F, UAT 13.32) The light the version on screen was made under (`litAncestor`) — the light's own picture and the one under it:
      a change is made under that light too, so a wall repainted on it keeps the room's evening light. */
  underLight?: { lit: string; unlit: string } | null
}
export type PassVariant = { dataUrl: string; applied: Applied; finishes: Finishes; materials: { label: string; material: string }[] }
/** `consumed` — the kinds of pick the pass used up (afterRender clears only these; the rest wait for the next Generate, F052). */
export type PassOutput = { variants: PassVariant[]; consumed?: Slot[] } | { error: string }

const fail = (error: string): PassOutput => ({ error })
const blank = (kind: PassKind): Applied => ({ kind, surfaces: [], furniture: [], style: null, lighting: null, note: null, palette: null, scope: null, caveat: null })
const copyFinishes = (f: Finishes): Finishes => ({ ...f, surfaces: { ...f.surfaces }, removed: [...f.removed], customized: { ...f.customized } })
const lightLabel = (p: Pending) => (p.lighting.presetId ? presetById(p.lighting.presetId)?.label ?? 'Custom' : 'Custom')
const neutral = (): RelightKnobs => ({ sunAngle: 45, colorTemp: 4300, intensity: 50, shadows: 50, fixtures: { cove: 'unset', pendants: 'unset', downlights: 'unset', accent: 'unset' } })
const caveatOf = (lines: (string | null | undefined)[]) => { const l = lines.filter((x): x is string => !!x); return l.length ? l.join(' · ') : null }
const edited = (f: Finishes) => Object.keys(f.surfaces).length > 0 || f.removed.length > 0 || Object.keys(f.customized).length > 0 || f.emptied

/** (F188) The light a room already has — its windows and fixtures (a sample's, and the reading's own lighting pieces) — for a grade.
    `fixtures`: 'all'; 'fitted' — an emptied room keeps its downlights, not its lamps; 'none' — a whole-room look (its own ceiling). */
export function lightSceneFor(sampleKey: string | null, reading: Detection | null, o: { fixtures?: 'all' | 'fitted' | 'none' } = {}): LightScene | undefined {
  const s = sampleKey ? SAMPLE_LIGHT[sampleKey] : undefined
  const which = o.fixtures ?? 'all'
  const pieces = which === 'all' ? (reading?.furniture ?? []).filter((f) => f.category === 'Lighting' || /lamp|pendant|sconce|chandelier/i.test(f.label)).map((f) => fixtureOfPiece(f.label, f.box, f.x, f.y)).filter((x): x is LightFixture => !!x) : []
  const own = which === 'none' ? [] : (s?.fixtures ?? []).filter((f) => which === 'all' || f.kind !== 'accent')
  if (!s && !pieces.length) return undefined
  /* a whole-room look is its own render — its windows aren't where the photo's are (round 2: the photo's quad lit a look's wall and its
     artwork blue), so it goes down to lamp-light without a sky */
  const windows = which === 'none' ? [] : s?.windows ?? []
  /* (round 2) the pieces standing in front of a window keep their own tone after dark (a piece taken out isn't in the reading: the
     plate's glass shows) — a rug lies on the floor, below the glass */
  const wb = windows.map((w) => [Math.min(...w.map((p) => p.x)), Math.min(...w.map((p) => p.y)), Math.max(...w.map((p) => p.x)), Math.max(...w.map((p) => p.y))] as const)
  const before = which === 'none' ? [] : (reading?.furniture ?? []).filter((f) => !/\b(rugs?|carpets?|mats?|runners?)\b/i.test(f.label)).map((f) => (isTraced(f.cut) ? f.cut : f.region && f.region.length >= 3 ? f.region : f.box ? boxPoly(f.box) : null))
    .filter((q): q is Pt[] => !!q && wb.some(([x0, y0, x1, y1]) => q.some((p) => p.x > x0 && p.x < x1 && p.y > y0 && p.y < y1) || (Math.min(...q.map((p) => p.x)) < x1 && Math.max(...q.map((p) => p.x)) > x0 && Math.min(...q.map((p) => p.y)) < y1 && Math.max(...q.map((p) => p.y)) > y0)))
  return { windows, occluders: before, sill: which === 'none' ? [] : s?.occluders ?? [], fixtures: [...own, ...pieces] }
}

type Ctx = { i: PassInput; p: Pending; sample: SampleRoom | null; reading: Detection; size: number; scene: LightScene | undefined
  /** The picture the pass starts from, and its address (masks are cached under it). */
  base: Img; url: string; frame: Frame
  /** (wave F) The room's own photo, the size of `base`, when the version shows the same room (not a whole-room look, nothing taken out) and
      isn't the photo itself: a surface's region is read on it (a wall already papered or lit on the version reads as the wall it is). */
  photo?: { img: Img; url: string } | null }
const frames = new WeakMap<Detection, Map<string, Frame>>()
function frameOf(reading: Detection, W: number, H: number): Frame {
  let m = frames.get(reading); if (!m) { m = new Map(); frames.set(reading, m) }
  const k = `${W}x${H}`, hit = m.get(k); if (hit) return hit
  const f = frameFor(reading.surfaces.map((s) => ({ label: s.label, hull: s.region && s.region.length >= 4 ? [s.region] : s.hull, group: surfaceGroupFor(s.label) })), W, H)
  m.set(k, f); return f
}
async function makeCtx(i: PassInput, reading: Detection, sample: SampleRoom | null, size: number, from?: { url: string; img?: Img; reading?: Detection; fixtures?: 'all' | 'fitted' | 'none' }): Promise<Ctx> {
  const url = from?.url ?? i.base.url
  const base = from?.img ?? await loadImg(url)
  const r = from?.reading ?? reading
  const fixtures = from?.fixtures ?? (i.base.finishes.reshaped ? 'none' : i.base.finishes.emptied ? 'fitted' : 'all')
  return { i, p: i.pending, sample, reading: r, size, scene: lightSceneFor(i.room.sampleKey, r, { fixtures }), base, url, frame: frameOf(r, base.width, base.height), photo: from ? null : await photoOf(i, r, sample, url, base) }
}
/** (wave F) The room's own photo for a pass on a version of it — the sample's original, or the uploaded photo the editor names — the size of
    the version's picture; null where the version is the photo, a whole-room look, or shows the room with pieces taken out (the empty
    plate's areas aren't the photo's). */
async function photoOf(i: PassInput, reading: Detection, sample: SampleRoom | null, url: string, base: Img): Promise<{ img: Img; url: string } | null> {
  const f = i.base.finishes
  if (reading.kind !== 'photo' || f.reshaped || f.emptied || f.removed.length) return null
  const photoUrl = sample ? sample.original : i.room.photoUrl ?? null
  if (!photoUrl || photoUrl === url) return null
  try {
    const img = await readImg(photoUrl)
    if (img.width === base.width && img.height === base.height) return { img, url: photoUrl }
    return { img: resample(img, base.width, base.height), url: `${photoUrl}#${base.width}x${base.height}` }
  } catch { return null }
}
/** (wave F) A surface's region for this pass: read on the room's own photo where the version shows the same room (a wall papered or lit on
    the version is still the wall the photo shows — never a few patches between the paper's stripes), else on the version's picture. */
function surfaceRegion(ctx: Ctx, def: SurfaceDef): Float32Array {
  return ctx.photo ? regionOf(ctx.photo.img, ctx.photo.url, def, ctx.size, { reading: ctx.reading }) : regionOf(ctx.base, ctx.url, def, ctx.size, { reading: ctx.reading })
}

/* ── laying a material (F047 · F187 · F191) ── */
const tileCache = new Map<string, Img>()
/** How a material lies on a surface: its tile (a motif, a floor's boards, the studio's own swatch photo) in the surface's perspective,
    and how much of the photo's own texture it keeps. */
async function textureFor(m: MaterialRef, def: SurfaceDef, ctx: Ctx): Promise<{ tex: Texture | null; detail: number }> {
  const known = ctx.reading.source !== 'fallback'
  const same = known && surfaceFamily(def.label) === materialFamily(m)
  let tile: Img | null = null, strength = 1, tileM = 0.6
  if (m.imageUrl && LAID_CATEGORIES.includes(m.category)) {
    const k = `photo|${urlKey(m.imageUrl)}`
    tile = tileCache.get(k) ?? null
    if (!tile) { try { tile = resample(await loadImg(m.imageUrl), 128, 128); tileCache.set(k, tile); if (tileCache.size > 24) { const f = tileCache.keys().next(); if (!f.done) tileCache.delete(f.value) } } catch { tile = null } }
    strength = m.category === 'Wallpapers' ? 1 : same ? 0.35 : 0.85
    tileM = m.category === 'Wallpapers' ? 0.5 : 0.6
  } else if (m.pattern) {
    const k = `${m.pattern.kind}|${m.pattern.accent}|${m.hex}`
    tile = tileCache.get(k) ?? patternTile(m.pattern, m.hex, 128)
    tileCache.set(k, tile)
    strength = (m.pattern.role ?? 'motif') === 'motif' ? 1 : !known ? 0.6 : same ? 0.25 : 0.85
    tileM = patternSize(m.pattern)
  }
  if (!tile) return { tex: null, detail: same ? 1 : known ? 0.35 : 0.6 }
  const tex = makeTexture(tile, mapFor(def, ctx, tileM), strength)
  return { tex, detail: strength >= 0.999 ? 0.3 : same ? 0.85 : 0.35 }
}
/** A floor or a ceiling lies on its plane; a worktop on its own, at counter height; an upright surface traced as a quad (a wall, a
    cabinet run, a drawn rectangle) takes its perspective; anything else lies flat on the photo, about 1.3 px a centimetre. */
function mapFor(def: SurfaceDef, ctx: Ctx, tileM: number): TexMap {
  const g = surfaceGroupFor(def.label), fr = ctx.frame
  if (g === 'Floor') return planeMap(fr, tileM, 0)
  if (g === 'Ceiling') return planeMap(fr, tileM, CEILING_M)
  const flat = screenMap(tileM * 130 * (fr.W / 900))
  const upright = !(g === 'Countertops' && !/waterfall|end|side|panel|upstand|front/i.test(def.label))
  if (!upright) return planeMap(fr, tileM, 0.9)
  const polys = def.region && def.region.length >= 4 ? [def.region] : def.hull ?? []
  /* (F191, verify round 1) each plane in its own perspective: a pixel takes the plane it lies in (the wall under a dropped ceiling isn't
     laid in the band beside it); a sliver too small to have a perspective of its own (a return beside a tall unit) takes its neighbour's */
  const planes = polys.map((q) => ({ poly: q.map((p) => ({ x: p.x * fr.W, y: p.y * fr.H })), map: quadMap(q, fr, tileM), area: polyArea(q) })).filter((q): q is { poly: Pt[]; map: TexMap; area: number } => !!q.map)
  if (!planes.length) return flat
  const big = [...planes].sort((a, b) => b.area - a.area), own = big.filter((q) => q.area >= 0.012)
  return (x, y) => {
    for (const q of own) if (inPoly(q.poly, x, y)) return q.map(x, y) ?? flat(x, y)
    for (const q of big) { const r = q.map(x, y); if (r) return r }
    return flat(x, y)
  }
}
const polyArea = (q: Pt[]) => { let a = 0; for (let i = 0, j = q.length - 1; i < q.length; j = i++) a += (q[j]!.x + q[i]!.x) * (q[j]!.y - q[i]!.y); return Math.abs(a / 2) }
const inPoly = (q: Pt[], x: number, y: number) => { let c = false; for (let i = 0, j = q.length - 1; i < q.length; j = i++) { const a = q[i]!, b = q[j]!; if ((a.y > y) !== (b.y > y) && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) c = !c } return c }
/** (F191, verify round 1) A wallpaper stops at a window's reveals (they take paint, never paper — a reveal papered in its own
    perspective reads as a torn strip); a paint covers them with the wall. */
const papered = (m: MaterialRef) => m.category === 'Wallpapers' || (m.pattern?.role ?? 'motif') === 'motif' && !!m.pattern
async function paint(img: Img, mask: Float32Array, m: MaterialRef, def: SurfaceDef, ctx: Ctx, acc: PaintAcc | null = null, strength = 1): Promise<void> {
  if (def.reveals?.length && papered(m)) {
    const W = img.width, H = img.height, o = new Float32Array(mask)
    for (const q of def.reveals) { const pm = polygonMask(W, H, q); for (let i = 0; i < o.length; i++) if (pm[i]! > 0) o[i] = o[i]! * (1 - pm[i]!) }
    mask = o
  }
  const { tex, detail } = await textureFor(m, def, ctx)
  if (acc) shadeTarget(img, mask, m.hex, m.finish, strength, tex, acc, { detail })
  else recolor(img, mask, m.hex, m.finish, strength, tex, { detail })
}
/** (F193) The surfaces one pass paints, laid together: each colour worked out on the picture as it was, then composited once — a shared
    edge is covered by both and shows neither the old paint nor a dark line. What lies on top where two regions overlap: a surface the
    studio drew or tapped (a feature wall marked on the wall), then the smaller region (a cabinet run over the wall it was grown into, a
    worktop over the floor), then the later pick. */
type SurfaceJob = { def: SurfaceDef; mask: Float32Array; hex: string; finish: MaterialRef['finish']; m?: MaterialRef; strength?: number
  /** (wave F) the colour is the surface where it is well lit (a reference's swatch) — see RecolorOpts.anchor */
  lit?: boolean }
async function paintSurfaces(img: Img, jobs: SurfaceJob[], ctx: Ctx | null, lifted: Float32Array | null = null): Promise<void> {
  if (!jobs.length) return
  /* a surface named twice (a pick and the note) takes the last */
  const marked = (d: SurfaceDef) => !!d.manual || (d.region?.length ?? 0) >= 3
  const order = [...new Map(jobs.map((j) => [j.def.id, j])).values()].map((j, n) => ({ j, n, area: maskCoverage(j.mask), marked: marked(j.def) }))
  order.sort((a, b) => (a.marked !== b.marked ? (a.marked ? -1 : 1) : Math.abs(a.area - b.area) > 1e-4 ? a.area - b.area : b.n - a.n))
  const acc = order.length > 1 ? paintAcc(img) : null   // one surface: recolor as it always was
  restoreRefinished(img, order.map(({ j }) => j), ctx, lifted)
  for (const { j } of order) {
    if (j.m && ctx) await paint(img, j.mask, j.m, j.def, ctx, acc, j.strength ?? 1)
    else if (acc) shadeTarget(img, j.mask, j.hex, j.finish, j.strength ?? 1, null, acc, j.lit ? { anchor: 'lit' } : {})
    else recolor(img, j.mask, j.hex, j.finish, j.strength ?? 1, null, j.lit ? { anchor: 'lit' } : {})
  }
  if (acc) composite(img, acc)
}
/** (wave F) A surface this version already re-finished (a fluted panel, a botanical paper) is re-finished from the wall the photo shows, not
    from the old finish: the photo's surface is laid back over the version's picture there first — light-matched to the version's own light
    around it (a note's evening light, a grade) — so a new paint takes the wall's real shading and grain, never the old paper's stripes or
    leaves, and its soft edge meets the photo's pixels, never a rim of the old finish. Nothing happens when nothing painted here carries an
    earlier finish, or the photo isn't known. `lifted` — where this pass took pieces out (the empty plate's floor there isn't the photo's). */
function restoreRefinished(img: Img, jobs: SurfaceJob[], ctx: Ctx | null, lifted: Float32Array | null): void {
  if (!ctx?.photo) return
  const again = jobs.filter((j) => ctx.i.base.finishes.surfaces[j.def.id])
  if (!again.length) return
  const n = img.width * img.height, m = new Float32Array(n)
  /* everything the earlier finish covered here (its soft edge too) goes back to the photo, whole */
  for (const j of again) for (let k = 0; k < n; k++) if (j.mask[k]! > 0.002) m[k] = 1
  if (lifted) for (let k = 0; k < n; k++) if (lifted[k]! > 0.02) m[k] = 0
  paste(img, ctx.photo.img, m, undefined, { feathered: true })
}
const finished = (m: MaterialRef, def: SurfaceDef) => ({ materialId: m.id, name: m.name, hex: m.hex, finish: m.finish, pattern: m.pattern ?? null, label: def.label })
/** A finish a version recorded, as a material to lay again (on the empty plate, on the furnished room): the material if it still
    resolves (its photo, its motif), in the colour the version laid. */
function materialOf(f: Finishes['surfaces'][string], resolve: (id: string) => MaterialRef | null): MaterialRef {
  const r = resolve(f.materialId)
  return { id: f.materialId, name: f.name, hex: f.hex, finish: f.finish, imageUrl: r?.imageUrl ?? null, category: r?.category ?? '', source: r?.source ?? 'catalogue', pattern: f.pattern ?? r?.pattern ?? null }
}

/* ── lifting a piece out (Remove, Furnish's Leave out) ── */
/** (wave E) What a sample says of a piece beyond the reading's own fields: the plane a rug lies on (samples `FurnitureSeed.plane`). */
const planeOf = (f: FurnitureDef): Plane | undefined => (f as FurnitureDef & { plane?: Plane }).plane
/** (wave E) …and how its hidden parts come back, step by step (samples `FurnitureSeed.rebuild`). */
const rebuildOf = (f: FurnitureDef): RebuildStep[] | undefined => (f as FurnitureDef & { rebuild?: RebuildStep[] }).rebuild
/** (wave E) Where a piece is fine strands with what's behind showing between them (a throw's fringe; samples `FurnitureSeed.wisps`): 1
    on a strand, 0 between — keyed on the photo's light in each zone (the strands are the zone's light pixels). Elsewhere 1. */
function strands(img: Img, f: FurnitureDef, own?: Float32Array): Float32Array | null {
  const zones = (f as FurnitureDef & { wisps?: Pt[][] }).wisps
  if (!zones?.length) return null
  const W = img.width, H = img.height, n = W * H, out = new Float32Array(n).fill(1), d = img.data
  const L = (i: number) => 0.299 * d[i * 4]! + 0.587 * d[i * 4 + 1]! + 0.114 * d[i * 4 + 2]!
  for (const q of zones) {
    const z = polygonMask(W, H, q), ls: number[] = []
    for (let i = 0; i < n; i++) if (z[i]! > 0.5) ls.push(L(i))
    if (ls.length < 20) continue
    ls.sort((a, b) => a - b)
    const lo = ls[Math.floor(ls.length * 0.2)]!, hi = ls[Math.floor(ls.length * 0.8)]!, t0 = lo + (hi - lo) * 0.35, span = Math.max(4, (hi - lo) * 0.3)
    /* (wave F) a pixel the outline only half covers (its soft edge along the fringe's end) is never a strand — no faint arc left over the
       floor where the outline ran */
    for (let i = 0; i < n; i++) { const w = z[i]!; if (w <= 0) continue; const k = Math.min(1, Math.max(0, (L(i) - t0) / span)) * (own ? Math.min(1, Math.max(0, (own[i]! - 0.6) / 0.3)) : 1); out[i] = 1 - w + w * k }
  }
  return out
}
/** (wave F) The pixels of a front piece's rim (two pixels deep, where it borders the lifted piece) whose colour is nearer the lifted
    piece's colour close by than its own — a blend of the two that goes with the lifted piece. */
function rimOf(img: Img, o: Float32Array, own: Float32Array, ownWide: Float32Array): Uint8Array {
  const W = img.width, H = img.height, n = W * H, d = img.data, out = new Uint8Array(n)
  const inner = insideOf(o, W, H, 2)
  let any = false
  for (let i = 0; i < n; i++) if (o[i]! > 0.5 && inner[i]! < 0.99 && ownWide[i]! > 0.5 && own[i]! < 0.5) { any = true; break }
  if (!any) return out
  const core = new Float32Array(n), lifted = new Float32Array(n)
  for (let i = 0; i < n; i++) { core[i] = inner[i]! >= 0.99 ? 1 : 0; lifted[i] = own[i]! > 0.5 ? 1 : 0 }
  const mean = (w: Float32Array, r: number) => {
    const b = featherMask(featherMask(w, W, H, r), W, H, r), ch = [0, 1, 2].map((c) => { const v = new Float32Array(n); for (let i = 0; i < n; i++) v[i] = d[i * 4 + c]! * w[i]!; return featherMask(featherMask(v, W, H, r), W, H, r) })
    return { b, ch }
  }
  const F = mean(core, 3), L = mean(lifted, 4)
  for (let i = 0; i < n; i++) {
    if (!(o[i]! > 0.5 && inner[i]! < 0.99 && ownWide[i]! > 0.5 && own[i]! < 0.5) || F.b[i]! < 1e-3 || L.b[i]! < 1e-3) continue
    let df = 0, dl = 0
    for (let c = 0; c < 3; c++) { const p = d[i * 4 + c]!, f = F.ch[c]![i]! / F.b[i]!, l = L.ch[c]![i]! / L.b[i]!; df += (p - f) ** 2; dl += (p - l) ** 2 }
    if (dl < df) out[i] = 1
  }
  return out
}
/** (wave E) Its shade on the pieces behind it, traced (samples `FurnitureSeed.casts`). */
const castsOf = (f: FurnitureDef): Pt[][] | undefined => (f as FurnitureDef & { casts?: Pt[][] }).casts
const isRug = (f: FurnitureDef) => /\b(rugs?|carpets?|mats?|runners?)\b/i.test(f.label)
/** The empty plate, re-finished the way the version shows the room (and the picks of this Generate), its surfaces whole (F179). */
async function platedRoom(ctx: Ctx, f: Finishes, picks: Map<string, MaterialRef>): Promise<Img | null> {
  const empty = ctx.sample?.empty
  if (!empty) return null
  const plate = resample(await loadImg(empty), ctx.base.width, ctx.base.height)
  /* the plate is its own picture — its surfaces are painted from it, never laid back from the furnished photo */
  const pctx: Ctx = { ...ctx, base: plate, url: empty, photo: null }
  const jobs: SurfaceJob[] = []
  for (const s of ctx.reading.surfaces) {
    const fin = f.surfaces[s.id], m = picks.get(s.id) ?? (fin ? materialOf(fin, ctx.i.resolve) : null)
    if (m) jobs.push({ def: s, mask: regionOf(plate, empty, s, ctx.size, { plate: true }), hex: m.hex, finish: m.finish, m })
  }
  await paintSurfaces(plate, jobs, pctx)
  return plate
}
/** Lays the plate under each piece taken out; returns where it went. The pieces that stay keep their pixels — all of one standing in
    front, the visible part of one behind (outside the lifted piece's own outline) — and the plate's light is read only off the room's
    own surfaces around it (F181 · F028).
    (verify round 1) A piece that stood on one taken out loses the feet it stood on it with (`restsOn` — the TV then hangs on the wall);
    what a piece behind had hidden is continued from its own pixels, as far as the sample traces it (`behind` — a rug under the sofa's
    arm), along its rows or its columns (`mend`), or taken down to shadow where it is the space under the piece (`mend: 'shade'`).
    (wave E) A rug is laid on in its own perspective from its own weave (`plane`, engine/mend `weaveFill`), before the pieces standing on
    it; a piece whose hidden parts the sample traces comes back part by part (`rebuild` — a chair's seat and post, a table's legs, a
    console's base and leg, a curtain's folds); a piece taken out takes its rim and the shade it cast on what is behind it (`casts`); a
    fringe in front keeps only its strands (`wisps`). */
function lift(img: Img, ctx: Ctx, removes: FurnitureDef[], plate: Img, out?: { kept?: Float32Array; mended?: Map<string, Float32Array> }): Float32Array {
  const W = img.width, H = img.height, n = W * H
  const gone = new Set(removes.map((r) => r.id)), goneKeys = new Set(removes.map((r) => normFurnitureKey(r.label)))
  const kept = ctx.reading.furniture.filter((f) => !gone.has(f.id))
  const polys = (ps: Pt[][]) => { const m = new Float32Array(n); for (const q of ps) { const pm = polygonMask(W, H, q); for (let i = 0; i < n; i++) if (pm[i]! > m[i]!) m[i] = pm[i]! } return m }
  /* the feet a kept piece stood on a lifted one with go with it */
  const feet = new Map(kept.filter((k) => k.restsOn && goneKeys.has(normFurnitureKey(k.restsOn.piece))).map((k) => [k.id, spreadMask(polys(k.restsOn!.feet), W, H, 1)]))
  const outline = new Map(kept.map((k) => {
    const o = outlineOf(ctx.base, ctx.url, k, ctx.size, ctx.reading), ft = feet.get(k.id)
    if (ft) for (let i = 0; i < n; i++) o[i] = o[i]! * (1 - ft[i]!)
    return [k.id, o]
  }))
  const keep = new Float32Array(n)
  for (const o of outline.values()) for (let i = 0; i < n; i++) if (o[i]! > keep[i]!) keep[i] = o[i]!
  const removed = new Float32Array(n)
  /* (wave F) the floor on the plate — its light is matched off the floor alone (a floor catches another light than the wall above it;
     a strip of it laid beside the wall never takes the wall's). Soft-edged: a zone's edge never shows as a change of light */
  const zones = ctx.sample?.empty ? ctx.reading.surfaces.filter((s) => !s.manual && !(s.region?.length) && surfaceGroupFor(s.label) === 'Floor').map((s) => featherMask(regionOf(plate, ctx.sample!.empty!, s, ctx.size, { plate: true }), W, H, 2)) : []
  for (const r of removes) {
    const own = outlineOf(ctx.base, ctx.url, r, ctx.size, ctx.reading), ownWide = spreadMask(own, W, H, 3)   // its rim too (a bowl's pale lip)
    /* (wave E) the shade it casts on a piece behind it (the sofa's on the rug beside the throw) goes with it: that part is mended too */
    const casts = castsOf(r)
    if (casts?.length) { const c = polys(casts); for (let i = 0; i < n; i++) if (c[i]! > ownWide[i]!) ownWide[i] = c[i]! }
    let m = r.plate && r.plate.length >= 3 ? polygonMask(W, H, r.plate) : r.cut && r.cut.length >= 3 ? spreadMask(polygonMask(W, H, r.cut), W, H, 3) : spreadMask(own, W, H, 5)
    for (const k of kept) { const ft = feet.get(k.id); if (ft && normFurnitureKey(k.restsOn!.piece) === normFurnitureKey(r.label)) for (let i = 0; i < n; i++) if (ft[i]! > m[i]!) m[i] = ft[i]! }
    /* (wave E) never less than its outline and the rim just past it (a plate traced along its cut left its soft edge half there) */
    { const rimM = spreadMask(own, W, H, 2); for (let i = 0; i < n; i++) if (rimM[i]! > m[i]!) m[i] = rimM[i]! }
    /* its shadow goes with it; the seam lies just outside it (a soft edge over the piece would leave its rim) */
    const shadow = castShadow(img, plate, m, keep)
    for (let i = 0; i < n; i++) if (shadow[i]! > m[i]!) m[i] = shadow[i]!
    m = featherMask(featherMask(spreadMask(m, W, H, 3), W, H, 3), W, H, 3)
    /* the pieces that stay keep their pixels: all of one in front, the visible part of one behind */
    for (const k of kept) {
      if (!overlap(k, r)) continue
      /* (wave F) a piece that stood on the lifted one (the TV on the console) keeps all of its traced outline but the feet it stood on it
         with — its bottom edge and the lit strip along it are its own, never cut back to the lifted piece's rim in steps */
      const stoodOn = !!k.restsOn && normFurnitureKey(k.restsOn.piece) === normFurnitureKey(r.label)
      const o = outline.get(k.id)!, front = inFront(k, r) || stoodOn, fine = front ? strands(ctx.base, k, o) : null
      /* (wave F) where it borders the lifted piece, a pixel of the rim of a piece in front (two pixels deep) that reads as the lifted piece
         rather than as itself (a throw's corner blended with the table's oak) goes with the lifted piece — never a tan line left round the
         throw; a rim that reads as itself (the console's top under the TV) stays */
      const release = front && !stoodOn ? rimOf(ctx.base, o, own, ownWide) : null
      for (let i = 0; i < n; i++) { const v = (front ? (release && release[i] ? 0 : o[i]!) : o[i]! * (1 - ownWide[i]!)) * (fine ? fine[i]! : 1); if (v > 0.01) m[i] = m[i]! * (1 - Math.min(1, v * 1.3)) }
    }
    /* (wave F) …and the shade they cast on the room, traced (the console's on the wall beside it): it stays, wherever it isn't under the
       lifted piece itself — the plate has no console, so it has no console's shade either */
    for (const k of kept) {
      const sh = castsOf(k); if (!sh?.length) continue
      /* its soft edge fades into the plate (a shade never ends in a line) */
      const c = featherMask(featherMask(polys(sh), W, H, Math.max(2, Math.round(W / 110))), W, H, Math.max(2, Math.round(W / 110)))
      for (let i = 0; i < n; i++) { const v = c[i]! * (1 - ownWide[i]!); if (v > 0.01) m[i] = m[i]! * (1 - Math.min(1, v * 1.3)) }
    }
    const under = cloneImg(img)   // the picture before the plate went on — a mend lays over this, never over a third of plate
    paste(img, plate, m, keep, { feathered: true, zones })
    /* (F181) a piece behind it had part of itself hidden by it (the console's drawer fronts behind the bowl and books on the table): the
       plate has no console there, so that part is mended from the piece's own pixels next to it — never the bare wall seen through it */
    const shades: Float32Array[] = []
    /* (wave E) what lies lowest is mended first: the rug under the sofa is laid before the table standing on it rebuilds its legs */
    for (const k of [...kept].sort((a, b) => (isRug(a) ? 0 : 1) - (isRug(b) ? 0 : 1))) {
      if (!overlap(k, r) || inFront(k, r)) continue
      const o = outline.get(k.id)!, hole = new Float32Array(n)
      /* (wave E) a piece whose hidden parts the sample traces (a chair's seat and leg behind the sofa's cushions, a table's front edge and
         legs, a console's rail and leg): each part rebuilt its own way where it was hidden — never a mirror or a smear of the whole */
      const steps = rebuildOf(k)
      if (steps?.length) {
        const cover = new Float32Array(n)
        for (const f of kept) if (f.id !== k.id && overlap(f, k) && inFront(f, k)) { const q = outline.get(f.id)!; for (let i = 0; i < n; i++) if (q[i]! > cover[i]!) cover[i] = q[i]! }
        const reach = new Float32Array(n); for (let i = 0; i < n; i++) reach[i] = m[i]! * (1 - Math.min(1, cover[i]!))
        /* (wave F) its shade falls on what was laid under it — the rug woven there (a few pixels past the lifted piece's edge too), never on
           the piece itself; with nothing woven under it, on the plate */
        let shadeReach: Float32Array | undefined
        if (out?.mended) for (const [id, mm] of out.mended) {
          if (id === k.id) continue
          shadeReach ??= new Float32Array(n)
          for (let i = 0; i < n; i++) { const v = mm[i]! * (1 - Math.min(1, cover[i]!)); if (v > shadeReach[i]!) shadeReach[i] = v }
        }
        const made = rebuild(img, ctx.base, reach, steps, cover, shadeReach, o)
        /* (wave F) its own edge where the lifted piece's rim lay over it, outside every traced step (a table leg's side against a throw):
           mended from its own pixels beside it — never a sliver of plate. (A piece the plate still shows has its own pixels there.) */
        const traced = polys(steps.filter((st) => st.how !== 'shade').flatMap((st) => st.area)), edge = new Float32Array(n)
        let rimmed = false
        if (!k.inPlate) for (let i = 0; i < n; i++) if (o[i]! > 0.5 && reach[i]! > 0.02 && traced[i]! < 0.5 && own[i]! < 0.5 && ownWide[i]! > 0.5) { edge[i] = Math.min(1, reach[i]!); rimmed = true }
        if (rimmed) { mendFrom(img, ctx.base, o, edge, cover, { rowsFirst: true, under }); for (let i = 0; i < n; i++) if (edge[i]! > made[i]!) made[i] = edge[i]! }
        if (out) {
          const acc = (out.mended ??= new Map()).get(k.id); if (acc) { for (let i = 0; i < n; i++) if (made[i]! > acc[i]!) acc[i] = made[i]! } else out.mended.set(k.id, made)
          /* (wave F) what it rebuilt (its legs, its wood too) stands in front of a piece mended before it (the rug laid under the sofa): a
             finish on that piece in the same Generate never paints them */
          const built = polys(steps.filter((st) => st.how !== 'shade').flatMap((st) => st.area))
          for (const [id, mm] of out.mended) {
            if (id === k.id) continue
            const b = kept.find((x) => x.id === id)
            if (!b || !overlap(k, b) || !inFront(k, b)) continue
            for (let i = 0; i < n; i++) { const v = built[i]! * Math.min(1, reach[i]! * 2); if (v > 0.01) mm[i] = mm[i]! * (1 - Math.min(1, v)) }
          }
        }
        continue
      }
      const back = k.behind?.length ? polys(k.behind) : null
      let any = false
      for (let i = 0; i < n; i++) { const w = back ? Math.max(o[i]!, back[i]!) : o[i]!; const v = w > 0.5 ? m[i]! : 0; if (v > 0.02) { hole[i] = v; any = true } }   // wherever the plate went over it
      if (!any) continue
      /* a few pixels more along the lifted piece's own edge — its rim (a bowl's pale lip) is never what the mend copies; nowhere else (a
         chair's leg the plate's shadow read brushed stays the chair's) */
      const wide = spreadMask(hole, W, H, 3), rim = spreadMask(own, W, H, 4)
      for (let i = 0; i < n; i++) if (o[i]! > 0.5 && rim[i]! > 0.5 && wide[i]! > hole[i]!) hole[i] = wide[i]!
      /* never copied from: another piece standing in front of it (the throw hanging over the rug) */
      const blocked = new Float32Array(n), cover = new Float32Array(n)
      for (const f of kept) if (f.id !== k.id && overlap(f, k) && inFront(f, k)) {
        const q = outline.get(f.id)!; for (let i = 0; i < n; i++) if (q[i]! > blocked[i]!) { blocked[i] = q[i]!; cover[i] = q[i]! }
        /* …nor the shade under it (the space under a coffee table is the rug in shadow, not the rug) */
        if (f.mend === 'shade' && f.behind?.length) { const u = polys(f.behind); for (let i = 0; i < n; i++) if (u[i]! > blocked[i]!) blocked[i] = u[i]! }
      }
      if (k.mend === 'shade' && back) {
        /* the space under it: taken down to shadow once everything behind it is mended (the rug under a table); its own visible edge
           mended as ever */
        /* deepest right under its top, lifting toward the floor, with soft sides — a shadow, not a dark slab */
        const dark = new Float32Array(n), ys = k.behind!.flat().map((q) => q.y), y0 = Math.min(...ys) * H, y1 = Math.max(...ys) * H
        for (let i = 0; i < n; i++) if (back[i]! > 0 && o[i]! < 0.5) { const y = (i - (i % W)) / W, t = Math.min(1, Math.max(0, (y - y0) / Math.max(1, y1 - y0))); dark[i] = hole[i]! * back[i]! * (1 - 0.6 * t); hole[i] = 0 }
        shades.push(featherMask(featherMask(dark, W, H, 4), W, H, 4))
      }
      /* never over what stands in front of it (the table over the rug) */
      for (let i = 0; i < n; i++) if (cover[i]! > 0) hole[i] = hole[i]! * (1 - Math.min(1, cover[i]!))
      const plane = planeOf(k)
      if (k.mend === 'texture' && plane) {
        /* (wave E) a rug laid on in its own perspective, from its own weave, in the light the empty floor has there */
        const reach = new Float32Array(n); for (let i = 0; i < n; i++) reach[i] = m[i]! * (1 - Math.min(1, cover[i]!))
        /* (wave F) a piece still to come out in this Generate (the table, after the sofa) is never the rug's weave or its light */
        const later = new Float32Array(blocked)
        for (const f of removes.slice(removes.indexOf(r) + 1)) {
          /* …nor the shade it casts on the rug (it goes with it) */
          const sh = castsOf(f), q = overlap(f, k) && inFront(f, k) ? outlineOf(ctx.base, ctx.url, f, ctx.size, ctx.reading) : null, c = sh?.length ? polys(sh) : null
          for (let i = 0; i < n; i++) { const v = Math.max(q ? q[i]! : 0, c ? c[i]! : 0); if (v > later[i]!) later[i] = v }
        }
        /* …and the shade the pieces that stay cast on it (the table's, traced) is theirs, never the rug's tone */
        const standShade = new Float32Array(n)
        for (const f of kept) { if (f.id === k.id) continue; const sh = castsOf(f); if (!sh?.length) continue; const c = polys(sh); for (let i = 0; i < n; i++) if (c[i]! > standShade[i]!) standShade[i] = c[i]! }
        weaveFill(img, o, hole, later, plane, { under, plate, reach, shaded: standShade })
        /* all of what was laid is the rug, its soft edge too (it meets the rug that shows) — a finish on the rug takes it whole */
        for (let i = 0; i < n; i++) if (hole[i]! > 0.02 && o[i]! > 0.5) hole[i] = 1
      } else if (k.mend === 'texture' && k.patch) textureFill(img, ctx.base, hole, k.patch, under, o)
      else if (k.mend === 'mirror' && typeof k.axis === 'number') {
        /* what its other side can't give (hidden there too) goes on from what the mirror gave back, along its rows */
        const rest = mirrorFill(img, ctx.base, o, hole, blocked, k.axis, under)
        mendFrom(img, cloneImg(img), o, rest, blocked, { rowsFirst: true, under })
      }
      else if (k.rails?.length) {
        /* a strip that runs across it (a console's bottom rail) goes on along its rows; the rest (its fronts) down its columns */
        const rail = polys(k.rails), along = new Float32Array(n)
        for (let i = 0; i < n; i++) if (rail[i]! > 0 && hole[i]! > 0) { along[i] = hole[i]! * rail[i]!; hole[i] = hole[i]! * (1 - rail[i]!) }
        mendFrom(img, ctx.base, o, hole, blocked, { under })
        const r0 = k.rails[0]!, slope = r0.length >= 2 ? ((r0[1]!.y - r0[0]!.y) / Math.max(1e-6, r0[1]!.x - r0[0]!.x)) * (H / W) : 0
        mendFrom(img, ctx.base, o, alongFill(img, ctx.base, o, along, blocked, slope, under), blocked, { rowsFirst: true, under })
      } else mendFrom(img, ctx.base, o, hole, blocked, { rowsFirst: k.mend === 'rows' || k.mend === 'shade', under })   // a table's hidden front edge runs along its rows
      /* what was mended of it is it — a Customize or a Replace of it in the same Generate paints there too */
      if (out) { const acc = (out.mended ??= new Map()).get(k.id); if (acc) { for (let i = 0; i < n; i++) if (hole[i]! > acc[i]!) acc[i] = hole[i]! } else out.mended.set(k.id, hole) }
    }
    for (const u of shades) shadeIn(img, u, 0.5)
    for (let i = 0; i < n; i++) if (m[i]! > removed[i]!) removed[i] = m[i]!
  }
  /* what stays standing where the plate went on — its own pixels and what was mended of it (a rug going on under the sofa): a surface laid
     on the plate afterwards (a new floor) keeps off it */
  if (out) {
    const standing = new Float32Array(n)
    for (const k of kept) {
      const o = outline.get(k.id)!, back = k.behind?.length ? polys(k.behind) : null
      for (let i = 0; i < n; i++) { const v = back ? Math.max(o[i]!, back[i]!) : o[i]!; if (v > standing[i]!) standing[i] = v }
      /* (wave E) and its rebuilt parts — never the shade under it (a new floor laid there keeps the shade the picture already has) */
      const built = (rebuildOf(k) ?? []).filter((st) => st.how !== 'shade').flatMap((st) => st.area)
      if (built.length) { const b = polys(built); for (let i = 0; i < n; i++) if (b[i]! > standing[i]!) standing[i] = b[i]! }
    }
    out.kept = standing
  }
  return removed
}
/** (round 2) Where a piece was taken out, the plate under it: a surface's region there is read on the plate. */
type Under = { img: Img; url: string; kept?: Float32Array }
/** A surface's region on a picture a piece was lifted from: the photo's region outside what was lifted, the plate's inside it. */
function across(ctx: Ctx, m: Float32Array, def: SurfaceDef, removed: Float32Array | null, under: Under | null): Float32Array {
  if (!removed || !under) return minus(m, removed)
  const pm = regionOf(under.img, under.url, def, ctx.size, { plate: true }), o = new Float32Array(m.length), kept = under.kept
  /* blended, not the larger: across the lifted piece's soft seam the two add up to the whole surface — no pale rim; never over what still
     stands there (a rug going on under the sofa that was taken out keeps its weave under a new floor) */
  for (let i = 0; i < o.length; i++) { const a = Math.min(1, removed[i]! * 1.2); o[i] = Math.min(1, m[i]! * (1 - a) + pm[i]! * a * (kept ? 1 - Math.min(1, kept[i]! * 1.5) : 1)) }
  return o
}
const minus = (m: Float32Array, removed: Float32Array | null) => { if (!removed) return m; const o = new Float32Array(m.length); for (let i = 0; i < m.length; i++) o[i] = m[i]! * (1 - Math.min(1, removed[i]! * 1.2)); return o }
/** (D3) A piece's part as a mask: its outlines without its holes, and without the pieces standing in front of it. */
function partMask(ctx: Ctx, def: FurnitureDef, key: PartKey): Float32Array {
  const W = ctx.base.width, H = ctx.base.height, part = def.parts?.[key], m = new Float32Array(W * H)
  if (!part) return m
  for (const poly of part.shape) { const pm = polygonMask(W, H, poly); for (let i = 0; i < m.length; i++) if (pm[i]! > m[i]!) m[i] = pm[i]! }
  const cut = (poly: Pt[]) => { const pm = polygonMask(W, H, poly); for (let i = 0; i < m.length; i++) if (pm[i]! > 0) m[i] = m[i]! * (1 - pm[i]!) }
  for (const poly of part.holes ?? []) cut(poly)
  for (const o of ctx.reading.furniture) if (o.id !== def.id && isTraced(o.cut) && overlap(o, def) && inFront(o, def)) cut(o.cut)
  return m
}
/** The mean colour of a region — a piece keeping its colour under a new finish (Velvet alone). */
function meanColour(img: Img, m: Float32Array): string {
  let r = 0, g = 0, b = 0, c = 0
  for (let i = 0; i < m.length; i++) { if (m[i]! < 0.5) continue; const p = i * 4; r += img.data[p]!; g += img.data[p + 1]!; b += img.data[p + 2]!; c++ }
  return c ? rgbToHex(r / c, g / c, b / c) : '#8B8B8B'
}

/* ── what rides along (F052) ── */
type Paint = { target: string; hex: string; name: string }
/** A note's colours on the surfaces they name, as jobs for `paintSurfaces` (regions read on the pass's untouched picture); recorded on
    the version as they are planned. */
function laySurfaces(ctx: Ctx, paints: Paint[], v: number, applied: Applied, finishes: Finishes, removed: Float32Array | null = null, under: Under | null = null): SurfaceJob[] {
  const jobs: SurfaceJob[] = []
  for (const pt of paints) {
    const hex = v === 1 ? pt.hex : shade(pt.hex, v === 2 ? 0.12 : -0.12)
    for (const def of paintTargets(ctx.reading, pt.target).surfaces) {
      const m: MaterialRef = { id: `note:${pt.name}`, name: pt.name, hex, finish: 'matte', imageUrl: null, category: 'Paints', source: 'catalogue', pattern: null }
      jobs.push({ def, mask: across(ctx, surfaceRegion(ctx, def), def, removed, under), hex, finish: 'matte', m })
      /* (verify round 1) one line per surface: the note re-laying a surface the style or a pick set replaces that line (the paint agrees) */
      applied.surfaces = [...applied.surfaces.filter((x) => x.id !== def.id), { id: def.id, label: def.label, materialId: m.id, name: pt.name }]; finishes.surfaces[def.id] = finished(m, def)
    }
  }
  return jobs
}
/** A note's colours on the pieces they name — after the surfaces, one piece at a time. */
function layPieces(img: Img, ctx: Ctx, paints: Paint[], v: number, applied: Applied, finishes: Finishes, removed: Float32Array | null = null): void {
  for (const pt of paints) {
    const hex = v === 1 ? pt.hex : shade(pt.hex, v === 2 ? 0.12 : -0.12)
    for (const def of paintTargets(ctx.reading, pt.target).pieces) {
      recolor(img, minus(regionOf(ctx.base, ctx.url, def, ctx.size, { reading: ctx.reading }), removed), hex, 'satin')
      applied.furniture = [...applied.furniture.filter((x) => x.id !== def.id), { id: def.id, label: def.label, action: 'customize', desc: pt.name }]; finishes.customized[def.id] = pt.name
    }
  }
}
/** A note's colours on the surfaces and pieces they name (regions read on the pass's picture, painted on `img`). */
async function lay(img: Img, ctx: Ctx, paints: Paint[], v: number, applied: Applied, finishes: Finishes, removed: Float32Array | null = null): Promise<void> {
  await paintSurfaces(img, laySurfaces(ctx, paints, v, applied, finishes, removed), ctx)
  layPieces(img, ctx, paints, v, applied, finishes, removed)
}
/** The light and the note on a picture a pass has made: the picked light (or the note's mood), the note's colours where the room's
    surfaces are known. Returns what it used — a note whose colours had nowhere to go waits for the next Generate. */
async function rideAlong(img: Img, ctx: Ctx, applied: Applied, finishes: Finishes, o: { paints: boolean; v?: number; removed?: Float32Array | null; skipLight?: boolean }): Promise<{ lighting: boolean; note: boolean }> {
  const p = ctx.p
  let lighting = false, note = false
  const text = p.note.trim(), r: NoteReading | null = text ? readNote(text) : null
  let paintsOk = true
  if (r?.paints.length) {
    if (o.paints && ctx.reading.surfaces.length + ctx.reading.furniture.length > 0) await lay(img, ctx, r.paints, o.v ?? 1, applied, finishes, o.removed ?? null)
    else paintsOk = false
  }
  if (!o.skipLight && lightingSet(p.lighting.knobs, p.lighting.presetId, p.lighting.instruction)) {
    grade(img, p.lighting.knobs, 1, ctx.scene)
    const warm = readNote(p.lighting.instruction)
    if (warm?.warmer) grade(img, { ...neutral(), colorTemp: warm.warmer > 0 ? 3400 : 5600 }, 0.7, ctx.scene)
    applied.lighting = lightLabel(p); finishes.lighting = applied.lighting; lighting = true
  } else if (r?.lighting) {
    const preset = presetById(r.lighting)
    if (preset) { grade(img, preset.knobs, 1, ctx.scene); applied.lighting = preset.label; finishes.lighting = preset.label }
  }
  if (r?.warmer && !lighting && !r.lighting) grade(img, { ...neutral(), colorTemp: r.warmer > 0 ? 3300 : 5800 }, 0.8, ctx.scene)
  if (text && r && paintsOk) { applied.note = text; note = true }
  else if (text && r && !paintsOk) applied.caveat = caveatOf([applied.caveat, 'Your note’s colours need the room’s marked surfaces — it waits for the next Generate'])
  else if (text && !r) applied.caveat = caveatOf([applied.caveat, UNREAD])
  return { lighting, note }
}
const UNREAD = 'We couldn’t turn your note into a change — it waits for the next Generate'
const slots = (base: Slot[], ride: { lighting: boolean; note: boolean }): Slot[] => [...new Set<Slot>([...base, ...(ride.lighting ? ['lighting' as const] : []), ...(ride.note ? ['note' as const] : [])])]

/** (wave F) A version under a light (a relight's own picture, `unlit` the picture under it — or, `underLight`, a version made on a lit
    one, with the light's own picture and the one under it): an edit, a note or a transfer is made on the picture under the light — its
    regions read on the room before the light changed it (no sunlit patch or leaf shadow read as another colour) — and the same light is
    laid again: each pixel keeps what the light did to it (the lit picture against the one under it, per channel), so a wall painted on a
    golden-hour version is the golden-hour room with the new wall, its sun patches and shadows on the new paint. A version made on a lit
    one goes back under the light first — its own changes kept, the light divided out (UAT 13.32: walls repainted on a version made on an
    evening light keep the evening). A pass that brings its own light lays that one instead — lights never stack (F063); on a version made
    on a lit one it goes on top, as that version's relight does. Null — not such a pass. */
const LIGHT_KNEE = 225   // where a lit new finish starts to roll off toward white (0…255)
async function underTheLight(i: PassInput): Promise<PassOutput | null> {
  if (i.kind !== 'edit' && i.kind !== 'note' && i.kind !== 'transfer') return null
  const pair = i.unlit && i.unlit.url !== i.base.url ? { lit: i.base.url, unlit: i.unlit.url }
    : i.underLight && i.underLight.lit !== i.base.url && i.underLight.unlit !== i.base.url && i.underLight.lit !== i.underLight.unlit ? i.underLight : null
  if (!pair) return null
  const p = i.pending, note = p.note.trim() ? readNote(p.note) : null
  /* a note that empties the room or restyles it is a whole new picture, not a change under the light; a piece taken out shows what was
     behind it, which the light never fell on the same way (its ratio would print the piece's ghost) — the empty plate is matched to the
     lit picture instead, as ever */
  if (i.kind === 'note' && (!note || note.empty || (note.style && !note.paints.length))) return null
  if (Object.values(p.furniture).some((f) => f.action === 'remove')) return null
  const ownLight = lightingSet(p.lighting.knobs, p.lighting.presetId, p.lighting.instruction) || !!note?.lighting
  const after = pair.lit !== i.base.url
  if (after && ownLight) return null
  const view = await loadImg(i.base.url), W = view.width, H = view.height
  const fit = async (url: string): Promise<Img> => { const x = await loadImg(url); return x.width === W && x.height === H ? x : resample(x, W, H) }
  const lit = after ? await fit(pair.lit) : view, under = await fit(pair.unlit)
  const V = view.data, L = lit.data, U = under.data
  /* the picture the change is made on: the one under the light — or this version with the light divided back out */
  let src = pair.unlit
  if (after) {
    const back: Img = { width: W, height: H, data: new Uint8ClampedArray(W * H * 4) }, B = back.data
    for (let q = 0; q < V.length; q += 4) {
      B[q] = ((V[q]! + 6) * (U[q]! + 6)) / (L[q]! + 6) - 6; B[q + 1] = ((V[q + 1]! + 6) * (U[q + 1]! + 6)) / (L[q + 1]! + 6) - 6; B[q + 2] = ((V[q + 2]! + 6) * (U[q + 2]! + 6)) / (L[q + 2]! + 6) - 6; B[q + 3] = 255
    }
    src = toDataUrl(back)
  }
  const out = await runPass({ ...i, base: { ...i.base, url: src }, unlit: null, underLight: null })
  if ('error' in out || ownLight) return out
  const S = after ? (await fit(src)).data : U   // the picture as the pass read it
  /* what a relit render has that the photo doesn't (a lamp it switched on) stays as the render shows it */
  const sample = sampleByKey(i.room.sampleKey), preset = Object.entries(sample?.relit ?? {}).find(([, u]) => u === pair.lit)?.[0]
  const keep = new Float32Array(W * H)
  for (const q of (preset ? sample?.relitKeep?.[preset] : null) ?? []) { const pm = polygonMask(W, H, q); for (let k = 0; k < keep.length; k++) if (pm[k]! > keep[k]!) keep[k] = pm[k]! }
  const kept = featherMask(keep, W, H, 1)
  for (const v of out.variants) {
    const made = await fit(v.dataUrl), d = made.data
    for (let k = 0, q = 0; k < W * H; k++, q += 4) {
      /* what the light did to the pixel, carried onto the new picture: a pixel the change left alone comes back as this version's own
         exactly (divided out and laid again, a highlight past white would dim), a changed one takes the light; a pixel the light takes
         toward white keeps its hue and rolls off softly (a sunlit patch or a lamp's glow on a pale new paint stays the light's orange,
         never a lemon yellow, and never a flat disc with a rim where it would have passed white) */
      const moved = Math.max(Math.abs(d[q]! - S[q]!), Math.abs(d[q + 1]! - S[q + 1]!), Math.abs(d[q + 2]! - S[q + 2]!))
      const w = moved <= 3 ? 0 : moved >= 12 ? 1 : (moved - 3) / 9
      const gr = (L[q]! + 6) / (U[q]! + 6), gg = (L[q + 1]! + 6) / (U[q + 1]! + 6), gb = (L[q + 2]! + 6) / (U[q + 2]! + 6)
      let lr = (d[q]! + 6) * gr - 6, lg = (d[q + 1]! + 6) * gg - 6, lb = (d[q + 2]! + 6) * gb - 6
      const lt = Math.max(lr, lg, lb)
      if (lt > LIGHT_KNEE) { const s = (LIGHT_KNEE + (255 - LIGHT_KNEE) * (1 - Math.exp(-(lt - LIGHT_KNEE) / (255 - LIGHT_KNEE)))) / lt; lr *= s; lg *= s; lb *= s }
      let r = V[q]! + (d[q]! - S[q]!) * gr, g = V[q + 1]! + (d[q + 1]! - S[q + 1]!) * gg, b = V[q + 2]! + (d[q + 2]! - S[q + 2]!) * gb
      r += (lr - r) * w; g += (lg - g) * w; b += (lb - b) * w
      const top = Math.max(r, g, b)
      if (top > 255) { const f = 255 / top; r *= f; g *= f; b *= f }
      const t = kept[k]!
      d[q] = Math.max(0, r + (V[q]! - r) * t); d[q + 1] = Math.max(0, g + (V[q + 1]! - g) * t); d[q + 2] = Math.max(0, b + (V[q + 2]! - b) * t)
    }
    v.dataUrl = toDataUrl(made)
  }
  return out
}

export async function runPass(i: PassInput): Promise<PassOutput> {
  const p = i.pending, size = p.quality === 'high' ? 640 : 480
  const sample = sampleByKey(i.room.sampleKey)
  const reading = readingFor(i.room, i.base.finishes)
  const count = i.kind === 'edit' || i.kind === 'restyle' || i.kind === 'transfer' ? p.variants : 1
  try {
    const underLight = await underTheLight(i)
    if (underLight) return underLight
    switch (i.kind) {
      case 'sketch': return await sketchPass(i, sample, reading, size)
      case 'empty': return await emptyPass(await makeCtx(i, reading, sample, size))
      case 'furnish': return await furnishPass(i, sample, reading, size)
      case 'restyle': return await restylePass(i, sample, reading, size, count)
      case 'relight': return await relightPass(i, sample, reading, size)
      case 'transfer': return await transferPass(await makeCtx(i, reading, sample, size), count)
      case 'note': return await notePass(i, sample, reading, size)
      default: { const w = p.note.trim(), r = w ? readNote(w) : null; return await editPass(await makeCtx(i, reading, sample, size), count, w ? { note: w, paints: r?.paints ?? [], preset: r?.lighting ?? null, warmer: r?.warmer ?? 0 } : undefined) }   // (REG-679) the words ride along
    }
  } catch {
    return fail('Couldn’t render this version — please try again.')
  }
}

type NoteExtra = { note?: string; paints?: Paint[]; preset?: string | null; warmer?: number }
async function editPass(ctx: Ctx, count: number, extra?: NoteExtra, kind: PassKind = 'edit'): Promise<PassOutput> {
  const { i, p, reading, size } = ctx
  const surfaces = new Map(reading.surfaces.map((s) => [s.id, s]))
  const pieces = new Map(reading.furniture.map((f) => [f.id, f]))
  const picks = Object.entries(p.furniture).filter(([id, f]) => f.action !== 'keep' && pieces.has(id))
  const asked = picks.filter(([, f]) => f.action === 'remove').map(([id]) => pieces.get(id)!)
  if (asked.length) { const t = toolAvailability({ sampleKey: i.room.sampleKey, detection: i.room.detection }, i.base.finishes, reading); if (!t.canRemove) return fail(`${t.removeWhy}. Replace or Customize the piece instead.`) }
  /* (F064) a piece the empty plate still shows (the living room's sheer curtains) can't be taken out — said, never claimed */
  const stays: FurnitureDef[] = []
  if (asked.length && ctx.sample) for (const r of asked) if (await stillInPlate(ctx.sample, r, ctx.base.width, ctx.base.height)) stays.push(r)
  const removes = asked.filter((r) => !stays.includes(r))
  const stayNames = [...new Set(stays.map((x) => labelInText(normFurnitureKey(x.label))))]
  const them = stayNames.length > 1 || /s$/.test(stayNames[0] ?? '') ? 'them' : 'it'
  const staysLine = stays.length ? `Kept: the ${stayNames.join(', the ')} — this photo can’t take ${them} out` : null
  for (const [id, f] of picks) { const need = pickNeeds(f, pieces.get(id)!); if (need) return fail(need) }
  /* (D3) a finish that names a part the photo doesn't mark (a planter on a plant nobody traced) is refused — never the leaves, the canvas
     or the screen painted with it */
  for (const [id, f] of picks) {
    if (f.action !== 'customize') continue
    const def = pieces.get(id)!, cp = customizePart(def, f.customizeMaterial)
    if (cp.blocked) return fail(`This photo doesn’t mark the ${PART_WORD[cp.blocked]} of the ${labelInText(normFurnitureKey(def.label))} — pick a colour for the whole piece instead.`)
  }
  const mats = Object.entries(p.materials).map(([id, mid]) => ({ def: surfaces.get(id), m: i.resolve(mid) })).filter((x): x is { def: SurfaceDef; m: MaterialRef } => !!x.def && !!x.m)
  /* (F028) every region of this Generate is read on the untouched photo, before anything is lifted out */
  const opts = { reading }
  const surfMask = new Map(mats.map(({ def }) => [def.id, surfaceRegion(ctx, def)]))
  /* (F023) a surface whose region came out empty (a tap on a busy spot) isn't painted — and the version doesn't claim it */
  const missed = mats.filter(({ def }) => maskCoverage(surfMask.get(def.id)!) < 0.0003).map(({ def }) => def)
  if (missed.length && missed.length === mats.length && !picks.length && !extra?.paints?.length && !p.style && !lightingSet(p.lighting.knobs, p.lighting.presetId, p.lighting.instruction)) return fail(`We couldn’t find the ${labelInText(missed[0]!.label)} where it was marked — trace its outline instead.`)
  const painted = mats.filter(({ def }) => !missed.includes(def))
  const pieceMask = new Map(picks.filter(([, f]) => f.action !== 'remove').map(([id]) => [id, regionOf(ctx.base, ctx.url, pieces.get(id)!, size, opts)]))
  if (stays.length && !removes.length && !mats.length && !pieceMask.size && !extra?.paints?.length && !p.style && !lightingSet(p.lighting.knobs, p.lighting.presetId, p.lighting.instruction)) return fail(`${staysLine}. Replace or Customize ${them} instead.`)
  const out: PassVariant[] = []
  let ride = { lighting: false, note: false }
  /* (round 2) the plate as the version shows the room — this Generate's picks are laid afterwards over the photo and the plate together,
     so a floor changed in the same pass is one floor, never the photo's oak in the sofa's footprint (the light match compares like with
     like); (wave E) lifted once — every variant starts from the same room with the pieces taken out */
  let lifted: { img: Img; removed: Float32Array; under: Under; shot: { kept?: Float32Array; mended?: Map<string, Float32Array> } } | null = null
  if (removes.length) {
    const plate = await platedRoom(ctx, i.base.finishes, new Map())
    if (!plate) return fail('Needs a photo with the room empty behind it — this one doesn’t have that. Replace or Customize the piece instead.')
    const im = cloneImg(ctx.base), sh: { kept?: Float32Array; mended?: Map<string, Float32Array> } = {}
    const rm = lift(im, ctx, removes, plate, sh)
    lifted = { img: im, removed: rm, under: { img: plate, url: ctx.sample!.empty!, kept: sh.kept }, shot: sh }
  }
  for (let v = 1; v <= count; v++) {
    const img = cloneImg(lifted?.img ?? ctx.base)
    const applied = blank(kind), finishes = copyFinishes(i.base.finishes)
    const vm = new Map(mats.map(({ def, m }) => [def.id, v === 1 ? m : alternatesFor(m, 2)[v - 2] ?? m]))
    const removed: Float32Array | null = lifted?.removed ?? null, under: Under | null = lifted?.under ?? null
    const shot = lifted?.shot ?? {}
    /* a piece's paint mask on this picture: its region outside what was lifted, and what was mended of it */
    const paintMask = (id: string, m: Float32Array) => { const o = minus(m, removed), md = shot.mended?.get(id); if (md) for (let i = 0; i < o.length; i++) if (md[i]! > o[i]!) o[i] = md[i]!; return o }
    if (removes.length) {
      for (const r of removes) { finishes.removed.push(r.id); delete finishes.customized[r.id]; applied.furniture.push({ id: r.id, label: r.label, action: 'remove', desc: 'Taken out' }) }
    }
    if (missed.length) applied.caveat = caveatOf([`Couldn’t find the ${[...new Set(missed.map((d) => labelInText(d.label)))].join(', the ')} where it was marked — trace its outline`])
    if (staysLine) applied.caveat = caveatOf([applied.caveat, staysLine])
    const jobs: SurfaceJob[] = []
    for (const { def } of painted) {
      const m = vm.get(def.id)!
      jobs.push({ def, mask: across(ctx, surfMask.get(def.id)!, def, removed, under), hex: m.hex, finish: m.finish, m })
      applied.surfaces.push({ id: def.id, label: def.label, materialId: m.id, name: m.name })
      finishes.surfaces[def.id] = finished(m, def)
    }
    /* (F193) the note's colours on surfaces join the picks' — every surface of this Generate laid in one go */
    if (extra?.paints?.length) jobs.push(...laySurfaces(ctx, extra.paints, v, applied, finishes, removed, under))
    /* (wave F) with pieces taken out, a surface re-finished again is laid over the version as it shows the room: the plate under the
       pieces carries the version's finishes, so the photo laid back around it would leave a box of the old finish where the TV hung */
    await paintSurfaces(img, jobs, lifted ? { ...ctx, photo: null } : ctx, removed)
    /* (wave E) a piece takes its light from the untouched photo — a surface laid just now that ran a pixel onto it (a floor onto a sofa's
       rail) never darkens its new colour; where a piece was lifted out the picture itself is the one to read (the mended side is there) */
    const pieceLight = { light: removed ? undefined : ctx.base }
    /* Replace (§5.1): the piece keeps its shape — the pick brings its colour and finish: a colour its words name wins, then its photo's
       colour, then the style's (F040) */
    for (const [id, f] of picks) {
      if (f.action !== 'replace') continue
      const def = pieces.get(id)!, words = `${f.replacementDesc ?? ''}`
      /* (verify round 1) the colour the words name ("…walnut coffee table…") — the main clause first, so "…with brass legs" doesn't win */
      const said = colourIn(words.split(/\s+with\s+|,/)[0] ?? '')?.hex ?? colourIn(words)?.hex
      let hex = said ?? (f.refImage ? dominantColour(await loadImg(f.refImage)) : styleByName(p.style)?.colorPalette[1] ?? '#8B7355')
      if (v > 1) hex = shade(hex, v === 2 ? 0.12 : -0.12)
      recolor(img, paintMask(id, pieceMask.get(id)!), hex, finishSheen(words), 1, null, pieceLight)
      /* (verify round 1) a Quick pick by its name ("Swapped for a Mid-Century coffee table"), the studio's words cut at a word */
      const desc = words.trim() ? `Swapped for ${replacementName(words)}` : 'Swapped for the piece in the photo'
      finishes.customized[id] = desc
      applied.furniture.push({ id, label: def.label, action: 'customize', desc })
    }
    for (const [id, f] of picks) {
      if (f.action !== 'customize') continue
      /* (D3) the part the finish names — the fig's pot, the art's frame, the TV's frame and stand — else the whole piece */
      const def = pieces.get(id)!, part = customizePart(def, f.customizeMaterial).part
      const own = part ? partMask(ctx, def, part) : pieceMask.get(id)!, mask = part ? minus(own, removed) : paintMask(id, own)
      /* a colour chip wins; a finish gives its own colour — or, with none of its own (Velvet), keeps the piece's and changes its sheen */
      let hex = (f.customizeColor && COLOUR_HEX[f.customizeColor]) || (f.customizeMaterial && FINISH_HEX[f.customizeMaterial]) || readNote(`${f.replacementDesc ?? ''} sofa`)?.paints[0]?.hex || (f.customizeMaterial ? meanColour(ctx.base, own) : null)
      if (!hex) continue
      if (v > 1) hex = shade(hex, v === 2 ? 0.12 : -0.12)
      recolor(img, mask, hex, finishSheen(f.customizeMaterial), 1, null, pieceLight)
      const desc = composeCustomizeDesc(f) || 'Customized'
      finishes.customized[id] = desc
      /* (wave F) the part it landed on rides along — the caption names the piece by it ("Planter" for a fig whose pot was painted) */
      applied.furniture.push({ id, label: def.label, action: 'customize', desc, ...(part ? { part } : {}) })
    }
    if (extra?.paints?.length) layPieces(img, ctx, extra.paints, v, applied, finishes, removed)
    const style = styleByName(p.style)
    if (style) { grade(img, styleLight(style.colorTemperature), 0.5, ctx.scene); applied.style = style.name; finishes.style = style.name }
    const light = extra?.preset ? RELIGHT_PRESETS.find((x) => x.id === extra.preset)?.knobs ?? null : lightingSet(p.lighting.knobs, p.lighting.presetId, p.lighting.instruction) ? p.lighting.knobs : null
    if (light) { grade(img, light, 1, ctx.scene); applied.lighting = extra?.preset ? presetById(extra.preset)?.label ?? 'Custom' : lightLabel(p); finishes.lighting = applied.lighting; ride = { ...ride, lighting: true } }
    const warm = extra?.warmer || (light === p.lighting.knobs ? readNote(p.lighting.instruction)?.warmer ?? 0 : 0)
    if (warm) grade(img, { ...neutral(), colorTemp: warm > 0 ? 3300 : 5800 }, 0.8, ctx.scene)
    if (extra?.note) {
      /* the words ride along; a note the rules can't read stays for the next Generate, and the version says so */
      if (readNote(extra.note)) { applied.note = extra.note; ride = { ...ride, note: true } } else applied.caveat = caveatOf([applied.caveat, UNREAD])
      /* (verify round 1) colours the note names on nothing this version shows — said, never claimed */
      /* (wave E, tablet-15) said plainly: what wasn't found, joined by "or", and where to pick it instead */
      if (extra.paints?.length && !extra.paints.some((pt) => { const t = paintTargets(reading, pt.target); return t.surfaces.length + t.pieces.length > 0 })) {
        const names = [...new Set(extra.paints.map((pt) => (/^wall$/i.test(pt.target.trim()) ? 'walls' : pt.target.trim())))], what = names.map((t) => `the ${t}`).join(' or ')
        const them = names.length > 1 || /s$/.test(names[0] ?? '') ? 'them' : 'it'
        applied.caveat = caveatOf([applied.caveat, i.base.finishes.reshaped ? `Couldn’t find ${what} in this look, so the note’s colours weren’t applied — pick them on the Original instead` : `Couldn’t find ${what} on this photo, so the note’s colours weren’t applied — add ${them} in Surfaces first`])
      }
    }
    out.push({ dataUrl: toDataUrl(img), applied, finishes, materials: applied.surfaces.map((s) => ({ label: titleCaseLabel(s.label), material: s.name })) })
  }
  /* (F197) a Generate that would change nothing — a pick whose material is gone — says so instead of keeping a copy; (verify round 1) a
     note whose colours had nowhere to go changes nothing either (a whole-room look's surfaces aren't marked) */
  if (out.every((o) => !o.applied.surfaces.length && !o.applied.furniture.length && !o.applied.style && !o.applied.lighting && (!o.applied.note || (kind === 'note' && !extra?.warmer)))) {
    /* (F022) a whole-room look has none of the photo's outlines: its surfaces aren't marked */
    if (i.base.finishes.reshaped && (Object.keys(p.materials).length || extra?.paints?.length)) return fail(WHOLE_ROOM_UNMARKED)
    if (kind === 'note' && extra?.paints?.length) return fail(`We couldn’t find the ${extra.paints[0]!.target} on this photo — add it in Surfaces first.`)
    return fail('Nothing changed — pick a finish, a style or a light first.')
  }
  return { variants: out, consumed: slots(['materials', 'furniture', ...(p.style ? ['style' as const] : [])], ride) }
}

async function restylePass(i: PassInput, sample: SampleRoom | null, reading: Detection, size: number, count: number): Promise<PassOutput> {
  const style = styleByName(i.pending.style)
  if (!style) return fail('Pick a style first — that’s the look the whole room is restyled into.')
  const look = sample?.looks[style.name]
  const out: PassVariant[] = []
  const finishedBase: Finishes = { ...copyFinishes(i.base.finishes), style: style.name }
  let ride = { lighting: false, note: false }
  if (look && reading.kind === 'photo') {
    /* (F192) 1.0's finished render: the room as photographed in the new look — a version's own finishes and pieces don't carry over,
       and the version says so */
    const caveat = i.base.key !== ORIGINAL && edited(i.base.finishes) ? 'Whole-room look — earlier changes replaced' : null
    const lookImg = await loadImg(look)
    const ctx = await makeCtx(i, { ...reading, surfaces: [], furniture: [] }, sample, size, { url: look, img: lookImg, reading: { ...reading, surfaces: [], furniture: [] }, fixtures: 'none' })
    for (let v = 1; v <= count; v++) {
      const x = cloneImg(lookImg)
      if (v === 2) grade(x, { ...neutral(), colorTemp: 3600, intensity: 54 }, 0.9)
      if (v === 3) grade(x, { ...neutral(), colorTemp: 5400, shadows: 42 }, 0.9)
      const a: Applied = { ...blank('restyle'), style: style.name, caveat }
      const f: Finishes = { ...finishedBase, surfaces: {}, removed: [], customized: {}, reshaped: true, emptied: false }
      ride = await rideAlong(x, ctx, a, f, { paints: false })
      const untouched = v === 1 && !ride.lighting && !a.lighting
      out.push({ dataUrl: untouched ? look : toDataUrl(x), applied: a, finishes: f, materials: [] })   // an untouched finished render keeps its own address
    }
    return { variants: out, consumed: slots(['style'], ride) }
  }
  if (!reading.surfaces.length) return fail('We couldn’t restyle this photo — mark its walls or floor first.')
  const ctx = await makeCtx(i, reading, sample, size)
  /* (wave E, files-17) a photo nobody traced is read roughly: a whole-room restyle lays its finishes there as a soft wash — the edges
     feathered wide, the photo's own texture kept under a lighter hand — so a region that stops short or runs over reads as light, never as
     torn-paper blotches of new paint on the floor, a beam or a splashback. A surface the studio drew or tapped keeps its edge. */
  const rough = (s: SurfaceDef) => reading.source === 'fallback' && !s.region && !s.manual
  const soften = (m: Float32Array) => { const r = Math.max(4, Math.round(ctx.base.width * 0.008)); return featherMask(featherMask(m, ctx.base.width, ctx.base.height, r), ctx.base.width, ctx.base.height, r) }
  const masks = new Map(reading.surfaces.map((s) => { const m = surfaceRegion(ctx, s); return [s.id, rough(s) ? soften(m) : m] as const }))
  for (let v = 1; v <= count; v++) {
    const img = cloneImg(ctx.base), a: Applied = { ...blank('restyle'), style: style.name }, f: Finishes = { ...finishedBase, surfaces: { ...finishedBase.surfaces } }
    const jobs: SurfaceJob[] = []
    for (const s of reading.surfaces) {
      const pick = suggestMaterials(s.label, style.name, 3)[v - 1] ?? suggestMaterials(s.label, style.name, 1)[0]
      if (!pick) continue
      const m = fromCatalogue(pick)
      jobs.push({ def: s, mask: masks.get(s.id)!, hex: m.hex, finish: m.finish, m, ...(rough(s) ? { strength: 0.7 } : {}) })
      a.surfaces.push({ id: s.id, label: s.label, materialId: m.id, name: m.name }); f.surfaces[s.id] = finished(m, s)
    }
    await paintSurfaces(img, jobs, ctx)
    grade(img, styleLight(style.colorTemperature), 1, ctx.scene)
    ride = await rideAlong(img, ctx, a, f, { paints: true, v })
    out.push({ dataUrl: toDataUrl(img), applied: a, finishes: f, materials: a.surfaces.map((s) => ({ label: titleCaseLabel(s.label), material: s.name })) })
  }
  return { variants: out, consumed: slots(['style'], ride) }
}

async function relightPass(i: PassInput, sample: SampleRoom | null, reading: Detection, size: number): Promise<PassOutput> {
  const p = i.pending, id = p.lighting.presetId
  const a = { ...blank('relight'), lighting: lightLabel(p) }
  const f = { ...copyFinishes(i.base.finishes), lighting: a.lighting }
  /* (F063) a new light goes on the picture under the old one, not on top of it */
  const src = i.unlit ?? { key: i.base.key, url: i.base.url }
  const knobs = id ? presetById(id)?.knobs ?? p.lighting.knobs : p.lighting.knobs
  const relit = id && src.key === ORIGINAL && !p.lighting.instruction.trim() && JSON.stringify(knobs) === JSON.stringify(p.lighting.knobs) ? sample?.relit?.[id] : undefined
  const r = p.note.trim() ? readNote(p.note) : null
  if (relit && !r) return { variants: [{ dataUrl: relit, applied: a, finishes: f, materials: [] }], consumed: ['lighting'] }
  const ctx = await makeCtx(i, reading, sample, size, { url: relit ?? src.url })
  const img = cloneImg(ctx.base)
  const ride = await rideAlong(img, ctx, a, f, { paints: true, skipLight: !!relit })
  if (!relit && !ride.lighting) grade(img, p.lighting.knobs, 1, ctx.scene)
  if (p.lighting.instruction.trim() && !a.note) a.note = p.lighting.instruction.trim()
  return { variants: [{ dataUrl: toDataUrl(img), applied: a, finishes: f, materials: [] }], consumed: slots(['lighting'], ride) }
}

async function transferPass(ctx: Ctx, count: number): Promise<PassOutput> {
  const { i, reading, size } = ctx
  const t = i.pending.transfer
  if (!t.refs.length) return fail('Upload a style reference image first.')
  if (!t.aspects.length) return fail('Pick at least one thing to carry over from the reference.')
  /* (F189) each reference read afresh — a mood board without its page, a cluster per swatch */
  const colours: string[] = []
  for (const r of t.refs) {
    if (r.role !== 'overall' && r.role !== 'palette' && r.role !== 'materials') continue
    let pal: string[] = r.palette
    try { pal = referencePalette(await loadImg(r.url)).map((x) => x.hex) } catch { /* the stored palette */ }
    colours.push(...pal)
  }
  if (!colours.length) return fail('Pick a reference for its palette or materials — the others only lend their light.')
  const strength = t.strength === 'hint' ? 0.45 : t.strength === 'full' ? 1 : 0.75
  const keep = keepTargets(t.keep)   // (F056) "the floor", "the client's green sofa"
  const masks = new Map([...reading.surfaces.map((d) => [d.id, surfaceRegion(ctx, d)] as const), ...reading.furniture.map((d) => [d.id, regionOf(ctx.base, ctx.url, d, size, { reading })] as const)])
  const out: PassVariant[] = []
  let ride = { lighting: false, note: false }
  const kept: string[] = []
  for (let v = 1; v <= count; v++) {
    const roles = pickRoles(colours, v)
    const img = cloneImg(ctx.base), a: Applied = { ...blank('transfer'), palette: [...new Set(colours)].slice(0, 6) }, f = copyFinishes(i.base.finishes)
    const jobs: SurfaceJob[] = []
    for (const s of reading.surfaces) {
      const g = surfaceGroupFor(s.label)
      if (keep.length && keepMatch(keep, s.label, g)) { if (v === 1) kept.push(titleCaseLabel(s.label)); continue }
      const wall = g === 'Walls' || g === 'Ceiling' || g === 'Trim & Moulding', feature = g === 'Feature Walls' || g === 'Panelling'
      const joinery = g === 'Cabinets' || g === 'Wardrobes' || g === 'Open Shelving' || g === 'Doors', stone = g === 'Countertops' || g === 'Backsplash'
      let hex: string | null = null
      if (t.aspects.includes('palette')) { if (wall) hex = roles.walls; else if (feature) hex = roles.feature }
      if (t.aspects.includes('materials')) { if (g === 'Floor') hex = roles.floor; else if (joinery) hex = roles.joinery; else if (stone) hex = roles.stone }
      if (!hex) continue
      /* (wave F) the floor takes the reference wood's depth, not only its hue: its colour is the swatch in good light, so the floor's lit
         boards are the swatch and its shade darker (a walnut reference gives a walnut floor, never a honey one) — and it isn't let back
         toward the photo's own lightness as much as a paint (How far thins its colour less) */
      const floor = g === 'Floor'
      jobs.push({ def: s, mask: masks.get(s.id)!, hex, finish: floor ? 'natural' : 'matte', strength: floor ? Math.max(strength, 0.9) : strength, ...(floor ? { lit: true } : {}) })
      /* (verify round 1) named in words — the hex stays in `hex`; a client, a quote line or the moodboard never reads "#E8E6E2": one rule
         with what leaves the editor (outputs `plainFinishName`: "Reference colour, close to Off-White Matte") */
      const name = plainFinishName(`Reference ${hex}`, s.label)
      a.surfaces.push({ id: s.id, label: s.label, materialId: `ref:${hex}`, name }); f.surfaces[s.id] = { materialId: `ref:${hex}`, name, hex, finish: g === 'Floor' ? 'natural' : 'matte', label: s.label }
    }
    await paintSurfaces(img, jobs, ctx)
    if (t.aspects.includes('furniture') || t.aspects.includes('decor')) {
      for (const d of reading.furniture) {
        const l = d.label.toLowerCase()
        const soft = /sofa|chair|stool|bench|ottoman|headboard|bedspread|cushion|throw|rug|curtain/.test(l)
        if (!soft) continue
        if (keep.length && keepMatch(keep, d.label)) { if (v === 1) kept.push(titleCaseLabel(normFurnitureKey(d.label))); continue }
        if (/rug|curtain|throw|cushion/.test(l) ? !t.aspects.includes('decor') : !t.aspects.includes('furniture')) continue
        /* (wave E, surfaces-5) a sheer stays sheer — it takes a tint of the colour, the garden still shows through it; the pieces take their
           light from the untouched photo (the surfaces were laid first) */
        recolor(img, masks.get(d.id)!, roles.soft, 'textured', strength * (/\b(sheer|voile|net)\b/.test(l) ? 0.4 : 0.85), null, { light: ctx.base })
      }
    }
    if (t.aspects.includes('lighting')) { const warm = colours.slice(0, 3).reduce((n, h) => n + (parseInt(h.slice(1, 3), 16) - parseInt(h.slice(5, 7), 16)), 0) / Math.max(1, Math.min(3, colours.length)); grade(img, { ...neutral(), colorTemp: warm > 12 ? 3500 : warm < -8 ? 5600 : 4300 }, strength, ctx.scene) }
    ride = await rideAlong(img, ctx, a, f, { paints: true, v })
    if (kept.length) a.caveat = caveatOf([a.caveat, `Kept as it is: ${[...new Set(kept)].join(', ')}`])
    f.style = 'Style transfer'
    out.push({ dataUrl: toDataUrl(img), applied: a, finishes: f, materials: [] })
  }
  if (!out.some((o) => o.applied.surfaces.length) && !t.aspects.includes('lighting') && !t.aspects.includes('furniture') && !t.aspects.includes('decor')) return fail('We couldn’t find a surface to carry the reference — mark the walls or the floor first.')
  return { variants: out, consumed: slots(['refs'], ride) }
}

/** (F064) Whether the empty plate still shows a piece (the living room's curtains): the photo and the plate agree inside its outline. */
const inPlateCache = new Map<string, boolean>()
async function stillInPlate(sample: SampleRoom, f: FurnitureDef, W: number, H: number): Promise<boolean> {
  if (typeof f.inPlate === 'boolean') return f.inPlate
  if (!sample.empty || f.manual) return false
  const k = `${sample.key}|${f.id}|${JSON.stringify(f.cut ?? f.box)}`
  const hit = inPlateCache.get(k); if (hit !== undefined) return hit
  const orig = resample(await loadImg(sample.original), W, H), plate = resample(await loadImg(sample.empty), W, H)
  const m = f.cut && f.cut.length >= 3 ? polygonMask(W, H, f.cut) : f.box ? polygonMask(W, H, [{ x: f.box[0], y: f.box[1] }, { x: f.box[2], y: f.box[1] }, { x: f.box[2], y: f.box[3] }, { x: f.box[0], y: f.box[3] }]) : null
  let d = 0, c = 0
  if (m) for (let i = 0; i < m.length; i++) { if (m[i]! < 0.5) continue; const p = i * 4; d += Math.abs(orig.data[p]! - plate.data[p]!) + Math.abs(orig.data[p + 1]! - plate.data[p + 1]!) + Math.abs(orig.data[p + 2]! - plate.data[p + 2]!); c += 3 }
  const same = c > 0 && d / c < 16
  inPlateCache.set(k, same)
  return same
}

async function emptyPass(ctx: Ctx): Promise<PassOutput> {
  const { i, sample, reading } = ctx
  const t = toolAvailability({ sampleKey: i.room.sampleKey, detection: i.room.detection }, i.base.finishes, reading)
  if (!t.canEmpty || !sample?.empty) return fail(`${t.emptyWhy ?? 'Needs a photo with the room empty behind it — this one doesn’t have that'}.`)
  const img = await platedRoom(ctx, i.base.finishes, new Map())
  if (!img) return fail('Needs a photo with the room empty behind it — this one doesn’t have that.')
  const f = copyFinishes(i.base.finishes)
  /* what the plate still shows stays (and stays on the list); every other piece is gone */
  const all = [...sampleDetection(sample).furniture, ...reading.furniture.filter((x) => x.manual)]
  const staying = new Set<string>()
  for (const x of all) if (await stillInPlate(sample, x, img.width, img.height)) staying.add(x.id)
  f.removed = [...new Set([...f.removed, ...all.filter((x) => !staying.has(x.id)).map((x) => x.id)])]
  for (const id of f.removed) delete f.customized[id]
  /* "anything else to take out": say plainly what this photo can't */
  const extra = i.pending.empty.extra.trim()
  const named = extra ? namedPieces(extra, all) : { matched: [], unmatched: [] }
  const cant = named.matched.filter((x) => staying.has(x.id)).map((x) => labelInText(normFurnitureKey(x.label)))
  const caveat = caveatOf([cant.length ? `Kept: the ${[...new Set(cant)].join(', the ')} — this photo can’t take ${cant.length > 1 || /s$/.test(cant[0] ?? '') ? 'them' : 'it'} out` : null, named.unmatched.length ? `Couldn’t find ${named.unmatched.map((u) => `“${u}”`).join(', ')} on this photo` : null])
  const scope = EMPTY_SCOPES.find((s) => s.key === i.pending.empty.scope)?.label ?? EMPTY_SCOPES[1]!.label
  /* (F064, verify round 1) the version keeps only what it did with "anything else" — never the request echoed when it kept those pieces
     (the caveat says why) */
  const took = [...new Set(named.matched.filter((x) => !staying.has(x.id)).map((x) => labelInText(normFurnitureKey(x.label))))]
  const a: Applied = { ...blank('empty'), scope, note: took.length ? `Also took out the ${took.join(', the ')}` : null, caveat }
  /* the light rides along; a note that paints the room waits for the next Generate (a scope and "anything else" belong in an image
     model's prompt when there is one) */
  const ride = await rideAlong(img, { ...ctx, base: img, scene: lightSceneFor(i.room.sampleKey, null, { fixtures: 'fitted' }) }, a, f, { paints: false })
  if (i.pending.note.trim() && !ride.note) a.caveat = caveatOf([caveat])
  return { variants: [{ dataUrl: toDataUrl(img), applied: a, finishes: { ...f, emptied: true }, materials: [] }], consumed: slots(['tool'], { lighting: ride.lighting, note: false }) }
}

async function furnishPass(i: PassInput, sample: SampleRoom | null, reading: Detection, size: number): Promise<PassOutput> {
  const t = toolAvailability({ sampleKey: i.room.sampleKey, detection: i.room.detection }, i.base.finishes, reading)
  if (!t.canFurnish || !sample) return fail(`${t.furnishWhy ?? 'Empty the room first — then furnish'}.`)
  const style = styleByName(i.pending.style || i.leadStyle || '')
  const look = style ? sample.looks[style.name] : undefined
  const room = sampleDetection(sample)
  const leave = namedPieces(i.pending.furnish.leaveOut, room.furniture)
  const a: Applied = { ...blank('furnish'), note: [i.pending.furnish.leaveOut && `Leave out: ${i.pending.furnish.leaveOut}`, i.pending.furnish.direction].filter(Boolean).join(' · ') || null }
  if (look) {
    const lookImg = await loadImg(look)
    const ctx = await makeCtx(i, { ...room, surfaces: [], furniture: [] }, sample, size, { url: look, img: lookImg, reading: { ...room, surfaces: [], furniture: [] }, fixtures: 'none' })
    const f: Finishes = { ...copyFinishes(i.base.finishes), surfaces: {}, removed: [], customized: {}, emptied: false, reshaped: true, style: style!.name }
    a.style = style!.name
    a.caveat = caveatOf([leave.matched.length ? `Leave out works on the room’s own furniture — the ${style!.name} look places its own pieces` : null, Object.keys(i.base.finishes.surfaces).length ? 'Whole-room look — earlier changes replaced' : null])
    const img = cloneImg(lookImg)
    const ride = await rideAlong(img, ctx, a, f, { paints: false })
    return { variants: [{ dataUrl: ride.lighting ? toDataUrl(img) : look, applied: a, finishes: f, materials: [] }], consumed: slots(['tool', 'style'], { lighting: ride.lighting, note: false }) }
  }
  /* no finished look: the room as photographed, furnished, wearing the emptied version's finishes — and the style's own materials on the
     rest, in its light; Leave out lifts those pieces with the empty plate */
  const ctx = await makeCtx(i, room, sample, size, { url: sample.original, reading: room, fixtures: 'all' })
  const img = cloneImg(ctx.base)
  const f: Finishes = { ...copyFinishes(i.base.finishes), removed: [], customized: {}, emptied: false, reshaped: false, style: null }
  const picks = new Map<string, MaterialRef>()
  const jobs: SurfaceJob[] = []
  for (const s of room.surfaces) {
    const fin = i.base.finishes.surfaces[s.id]
    const m = fin ? materialOf(fin, i.resolve) : style ? (() => { const c = suggestMaterials(s.label, style.name, 1)[0]; return c ? fromCatalogue(c) : null })() : null
    if (!m) continue
    picks.set(s.id, m)
    jobs.push({ def: s, mask: regionOf(ctx.base, ctx.url, s, size, { reading: room }), hex: m.hex, finish: m.finish, m })
    f.surfaces[s.id] = finished(m, s)
    if (!fin) a.surfaces.push({ id: s.id, label: s.label, materialId: m.id, name: m.name })
  }
  await paintSurfaces(img, jobs, ctx)
  if (style) { grade(img, styleLight(style.colorTemperature), 1, ctx.scene); a.style = style.name; f.style = style.name }
  if (leave.matched.length) {
    const plate = await platedRoom(ctx, f, picks)
    if (plate) { lift(img, ctx, leave.matched, plate); for (const x of leave.matched) { f.removed.push(x.id); a.furniture.push({ id: x.id, label: x.label, action: 'remove', desc: 'Left out' }) } }
  }
  const ride = await rideAlong(img, ctx, a, f, { paints: false })
  return { variants: [{ dataUrl: toDataUrl(img), applied: a, finishes: f, materials: a.surfaces.map((s) => ({ label: titleCaseLabel(s.label), material: s.name })) }], consumed: slots(['tool', ...(style && i.pending.style ? ['style' as const] : [])], { lighting: ride.lighting, note: false }) }
}

async function sketchPass(i: PassInput, sample: SampleRoom | null, reading: Detection, size: number): Promise<PassOutput> {
  if (!sample?.sketch || i.base.key !== ORIGINAL || reading.kind !== 'sketch') return fail('Render from sketch works on the sample sketch — this picture isn’t one.')
  const style = styleByName(i.pending.style || i.leadStyle || '')
  const look = style ? sample.looks[style.name] : undefined
  const room = sampleDetection(sample)
  const a: Applied = { ...blank('sketch') }
  const f: Finishes = { ...copyFinishes(i.base.finishes), fromSketch: true, reshaped: !!look, style: null }
  if (look) {
    const lookImg = await loadImg(look)
    const ctx = await makeCtx(i, { ...room, surfaces: [], furniture: [] }, sample, size, { url: look, img: lookImg, reading: { ...room, surfaces: [], furniture: [] }, fixtures: 'none' })
    const img = cloneImg(lookImg)
    a.style = style!.name; f.style = style!.name
    const ride = await rideAlong(img, ctx, a, f, { paints: false })
    return { variants: [{ dataUrl: ride.lighting ? toDataUrl(img) : look, applied: a, finishes: f, materials: [] }], consumed: slots(i.pending.style ? ['style'] : [], ride) }
  }
  /* no finished look: the room the sketch draws, in the style's materials and light (or as it is, with no style) */
  const ctx = await makeCtx(i, room, sample, size, { url: sample.original, reading: room, fixtures: 'all' })
  const img = cloneImg(ctx.base)
  if (style) {
    const jobs: SurfaceJob[] = []
    for (const s of room.surfaces) {
      const c = suggestMaterials(s.label, style.name, 1)[0]; if (!c) continue
      const m = fromCatalogue(c)
      jobs.push({ def: s, mask: regionOf(ctx.base, ctx.url, s, size, { reading: room }), hex: m.hex, finish: m.finish, m })
      a.surfaces.push({ id: s.id, label: s.label, materialId: m.id, name: m.name }); f.surfaces[s.id] = finished(m, s)
    }
    await paintSurfaces(img, jobs, ctx)
    grade(img, styleLight(style.colorTemperature), 1, ctx.scene)
    a.style = style.name; f.style = style.name
  }
  const ride = await rideAlong(img, ctx, a, f, { paints: true })
  return { variants: [{ dataUrl: style || ride.lighting || ride.note ? toDataUrl(img) : sample.original, applied: a, finishes: f, materials: a.surfaces.map((s) => ({ label: titleCaseLabel(s.label), material: s.name })) }], consumed: slots(i.pending.style ? ['style'] : [], ride) }
}

async function notePass(i: PassInput, sample: SampleRoom | null, reading: Detection, size: number): Promise<PassOutput> {
  const note = i.pending.note.trim()
  const r = readNote(note)
  if (!r) return fail(NOTE_UNREAD)
  if (r.empty) {
    const o = await emptyPass(await makeCtx({ ...i, pending: { ...i.pending, note: '' } }, reading, sample, size))
    if ('variants' in o) { o.variants.forEach((v) => { v.applied.note = note }); o.consumed = ['note'] }
    return o
  }
  if (r.style && !r.paints.length) {
    const o = await restylePass({ ...i, pending: { ...i.pending, style: r.style, note: '' } }, sample, reading, size, 1)
    if ('variants' in o) { o.variants.forEach((v) => { v.applied.note = note; v.applied.kind = 'note' }); o.consumed = ['note', ...(o.consumed ?? []).filter((s) => s !== 'style')] }
    return o
  }
  const ctx = await makeCtx({ ...i, pending: { ...i.pending, materials: {}, furniture: {}, style: r.style ?? '' } }, reading, sample, size)
  const o = await editPass(ctx, 1, { note, paints: r.paints, preset: r.lighting, warmer: r.warmer }, 'note')
  if ('variants' in o) o.consumed = ['note']
  return o
}

/** The canvas's live light preview (Q-22): the version on screen graded as the sliders move, before anything is kept. `scene` — the
    room's windows and fixtures (`lightSceneFor`), so the preview is the render. */
export async function previewLight(url: string, knobs: RelightKnobs, scene?: LightScene): Promise<string> {
  const img = await loadImg(url)
  grade(img, knobs, 1, scene)
  return toDataUrl(img, 0.82)
}

/** The regions of the surfaces or pieces picked, as one translucent overlay (the canvas lights what a pick will change — 2.0 only).
    `ctx.reading` — the version's reading, so the overlay is exactly what Generate will paint (a drawn surface without what stands in
    front of it, a piece without its neighbours). */
export async function regionOverlay(url: string, defs: (SurfaceDef | FurnitureDef)[], rgb: [number, number, number] = [85, 0, 255], ctx: { reading?: Detection | null; photoUrl?: string | null; finishes?: Finishes | null } = {}): Promise<string> {
  const img = await readImg(url)
  /* (wave F) `photoUrl` — the room's own photo, when the version on screen shows the same room (`finishes`: not a whole-room look, not
     emptied, nothing taken out — the rule Generate reads by): a surface is lit where Generate will paint it, read on the photo */
  let photo: { img: Img; url: string } | null = null
  const f = ctx.finishes, same = !f || !(f.reshaped || f.emptied || f.removed.length)
  if (ctx.photoUrl && ctx.photoUrl !== url && same && (ctx.reading?.kind ?? 'photo') === 'photo') {
    const p = await readImg(ctx.photoUrl).catch(() => null)
    if (p) photo = p.width === img.width && p.height === img.height ? { img: p, url: ctx.photoUrl } : { img: resample(p, img.width, img.height), url: `${ctx.photoUrl}#${img.width}x${img.height}` }
  }
  const masks = defs.map((d) => (photo && !isPiece(d) ? regionOf(photo.img, photo.url, d, 480, { reading: ctx.reading ?? null }) : regionOf(img, url, d, 480, { reading: ctx.reading ?? null })))
  const out = new Uint8ClampedArray(img.width * img.height * 4)
  for (let k = 0; k < img.width * img.height; k++) {
    let a = 0
    for (const m of masks) { const v = m[k]!; if (v > a) a = v }
    if (a > 0.02) { out[k * 4] = rgb[0]; out[k * 4 + 1] = rgb[1]; out[k * 4 + 2] = rgb[2]; out[k * 4 + 3] = Math.round(a * 110) }
  }
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height
  c.getContext('2d')?.putImageData(new ImageData(out, img.width, img.height), 0, 0)
  return c.toDataURL('image/png')
}
