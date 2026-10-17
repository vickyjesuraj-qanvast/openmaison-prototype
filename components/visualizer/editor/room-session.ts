'use client'

import { useEffect, useRef, useState, type RefObject } from 'react'
import { useSnackbar, useSnackbarDismiss } from '@/components/om/snackbar'
import { styleByName } from '@/lib/visualizer/styles'
import { COLOUR_HEX, FINISH_HEX, composeCustomizeDesc, pieceKind, type FurniturePick } from '@/lib/visualizer/furniture'
import { neutralKnobs, newId, recolourPick, tappedSurface, type Detection, type Finishes, type FurnitureDef, type MaterialRef, type PassKind, type Pending, type Slot, type SurfaceDef } from '@/lib/visualizer/model'
import type { RelightKnobs } from '@/lib/visualizer/lighting'
import { normFurnitureKey, titleCaseLabel } from '@/lib/visualizer/surfaces'
import { dominantColour } from '@/lib/visualizer/engine/palette'
import type { Pt } from '@/lib/visualizer/engine/pixels'
import { defKey, lightSceneFor, loadImg, previewLight, regionOf, regionOverlay, regionShare, washOverlay } from '@/lib/visualizer/engine/run'
import { boxAround, WIDE_TAP, type MarkedOn } from './editor-model'
import { pictureReader } from './picture-reader'
import type { Mode } from './rail'
import type { Marker } from './stage'
import type { SurfaceSel } from './panels/surfaces-panel'

/*
 * (pending modules S36 — her "build all of them" 2026-10-11; card public:try-it-visualizer, "the trial reuses the editor's panels, not a copy")
 * ONE ROOM ON SCREEN, as the AI Visualizer works it — taken out of the studio's editor (components/visualizer/editor/visualizer-editor.tsx)
 * so the website's no-account trial (components/visualizer/trial/*) runs the very same code, not a copy: the markers and the washes on the
 * photo, the lit region and the light's live preview, every pick (a finish, a piece, a look, Clear all, Take off the list) and the marking
 * of what the photo missed (a tap, a traced outline, a piece drawn round), the photo reader (HEIC on every browser) and where the
 * snackbar rests in the frame. Behaviour is the editor's, word for word — each piece keeps its audit reference (F0nn · round n · S20).
 * What stays each host's own: where its rooms and versions live (the studio's database; the trial's memory), Generate's charge (AI credits;
 * the trial's three free renders) and its studio-only dialogs.
 */

/**
 * (F146) The camera-app model (the tray and the dock) is for phones and portrait tablets. A tablet held landscape with room for the rail
 * — 900 wide and 600 tall or more, e.g. an iPad at 1024×768 — gets the desktop frame (the rail at 336, the photo ~690 wide), touch or not.
 */
export const ROOMY_LANDSCAPE = '(orientation: landscape) and (min-width: 900px) and (min-height: 600px)'
/**
 * (phone-tablet 0) A phone turned on its side (≤ 500 tall): the camera model's rows would leave the photo nothing, so it keeps the rail
 * model instead — the rooms in the top bar, the photo and the versions on the left, a narrow rail with the Describe box, the panel and the
 * compact go line on the right.
 */
export const SHORT_LANDSCAPE = '(orientation: landscape) and (max-height: 500px)'

/** The progress card's steps (1.0's status words, C-20 · C-24, one list per pass). */
export const PASS_STEPS: Record<PassKind, string[]> = {
  edit: ['Reading the photo', 'Laying your finishes', 'Matching the light and shadows', 'Keeping the version'],
  restyle: ['Reading the room', 'Choosing the look', 'Restyling every surface', 'Keeping the version'],
  relight: ['Reading the light', 'Relighting the room', 'Keeping the version'],
  transfer: ['Reading your reference', 'Carrying its palette across', 'Keeping the version'],
  empty: ['Finding the furniture', 'Taking it out', 'Keeping the version'],
  furnish: ['Reading the empty room', 'Furnishing it', 'Keeping the version'],
  sketch: ['Reading your sketch', 'Rendering it as a photo', 'Keeping the version'],
  note: ['Reading your note', 'Making the change', 'Keeping the version'],
}

/* ── what the photo shows (markers, the waiting washes) ── */

/** (F012) The markers the canvas draws for the mode on screen — each says what the version already wears and what waits. `hidden`: the
    host's reasons to draw none (markers hidden, a place / draw / pin mode, a sketch, a deleted design). */
export function stageMarkers(o: { reading: Detection | null; hidden: boolean; mode: Mode; pending: Pending; finishes: Finishes; resolve: (id: string) => MaterialRef | null; scopeIds: Set<string> }): Marker[] {
  const { reading, pending, finishes, resolve, scopeIds } = o
  if (!reading || o.hidden) return []
  if (o.mode === 'surfaces') return reading.surfaces.map((s) => {
    const mid = pending.materials[s.id], had = finishes.surfaces[s.id]
    return { id: s.id, kind: 'surface' as const, label: s.label, x: s.x, y: s.y, selected: scopeIds.has(s.id), fill: mid ? resolve(mid)?.hex ?? null : had?.hex ?? null, action: null, now: had?.name ?? null, pending: mid ? resolve(mid)?.name ?? null : null }
  })
  if (o.mode === 'furniture') return reading.furniture.map((f) => {
    const p = pending.furniture[f.id]
    /* (desktop-5) a piece being customised wears its pick as a surface does — its colour (or its finish's), so the lit piece previews the
       choice (the stage's tint) instead of reading as a purple piece */
    const tone = pieceTone(p)
    return { id: f.id, kind: 'furniture' as const, label: f.label, x: f.x, y: f.y, selected: scopeIds.has(f.id), fill: tone, action: p && p.action !== 'keep' ? p.action : null, now: finishes.customized[f.id] ?? null,
             pending: p && tone ? composeCustomizeDesc(p) || null : null }
  })
  return []
}
const pieceTone = (p: FurniturePick | undefined): string | null =>
  p?.action === 'customize' ? (p.customizeColor ? COLOUR_HEX[p.customizeColor] ?? null : p.customizeMaterial ? FINISH_HEX[p.customizeMaterial] ?? null : null) : null

export type WashItem = { def: SurfaceDef | FurnitureDef; hex: string }
/** (UX audit V5) Every pick still waiting for Generate, washed in its own colour — the surfaces' finishes and the pieces' new colours, never
    the one lit (its highlight wears its own). The host decides when the washes rest (Compare, a run, a mode on the photo). */
export function waitingWash(o: { reading: Detection | null; pending: Pending; resolve: (id: string) => MaterialRef | null; scopeIds: Set<string> }): WashItem[] {
  const { reading, pending, resolve, scopeIds } = o
  if (!reading) return []
  return [
    ...reading.surfaces.filter((x) => !scopeIds.has(x.id)).flatMap((x) => { const mid = pending.materials[x.id]; const m = mid ? resolve(mid) : null; return m ? [{ def: x, hex: m.hex }] : [] }),
    ...reading.furniture.filter((f) => !scopeIds.has(f.id)).flatMap((f) => { const hex = pieceTone(pending.furniture[f.id]); return hex ? [{ def: f, hex }] : [] }),
  ]
}

/**
 * The canvas' three layers over the picture: the region a selection lights (F030 · F024 — keyed on each region's geometry, read as
 * Generate reads the room; the last stays until the next lands, F177), the picks waiting (V5) and the light's live preview (F188 — graded
 * with the room's own windows and fixtures; the last stays while the next grades, only on the picture it was made from). `quiet`: Compare
 * or a run in this room — no highlight and no preview. `finishPreview` (the trial's): what a live preview passes through before it shows
 * (the trial stamps its mark on it, as on every result).
 */
export function useStageLayers(o: {
  imageUrl: string | null; lightUrl: string | null
  scope: (SurfaceDef | FurnitureDef)[]; reading: Detection | null; photoUrl: string | null; finishes: Finishes; sampleKey: string | null
  quiet: boolean; wash: WashItem[]
  /** `on` — the Lighting mode with a light set; `relit` — the sample's own relit picture when the pick is exactly its preset */
  lighting: { on: boolean; knobs: RelightKnobs; relit: string | null }
  finishPreview?: (url: string) => Promise<string>
}): { highlight: string | null; wash: string | null; preview: string | null } {
  const { imageUrl, lightUrl, scope, reading, finishes, quiet, lighting } = o
  const imgRef = useRef(imageUrl)
  const lightRef = useRef(lightUrl)
  const scopeRef = useRef(scope)
  const readingRef = useRef(reading)
  const photoRef = useRef<string | null>(o.photoUrl)
  const finishesRef = useRef(finishes)
  const knobsRef = useRef(lighting.knobs)
  const washRef = useRef(o.wash)
  const finishRef = useRef(o.finishPreview)
  const sceneRef = useRef({ sampleKey: o.sampleKey, fixtures: (finishes.reshaped ? 'none' : finishes.emptied ? 'fitted' : 'all') as 'none' | 'fitted' | 'all' })
  useEffect(() => {
    imgRef.current = imageUrl; lightRef.current = lightUrl; scopeRef.current = scope; readingRef.current = reading; knobsRef.current = lighting.knobs
    photoRef.current = o.photoUrl; finishesRef.current = finishes; washRef.current = o.wash; finishRef.current = o.finishPreview
    sceneRef.current = { sampleKey: o.sampleKey, fixtures: finishes.reshaped ? 'none' : finishes.emptied ? 'fitted' : 'all' }
  })
  /* (F030 · F024) the highlight keys on each region's geometry and reads the room as Generate does — a redraw lights the new region */
  const hlKey = imageUrl && scope.length && !quiet ? `${imageUrl.slice(-80)}|${scope.map((s) => `${s.id}:${defKey(s)}`).join(',')}` : null
  const [hl, setHl] = useState<{ key: string; img: string; url: string } | null>(null)
  useEffect(() => {
    if (!hlKey) return
    let alive = true
    const t = setTimeout(() => {
      const url = imgRef.current, defs = scopeRef.current
      if (!url || !defs.length) return
      regionOverlay(url, defs, undefined, { reading: readingRef.current, photoUrl: photoRef.current, finishes: finishesRef.current }).then((u) => { if (alive) setHl({ key: hlKey, img: url, url: u }) }).catch(() => {})
    }, 40)
    return () => { alive = false; clearTimeout(t) }
  }, [hlKey])
  /* (F177) the last highlight stays until the next one lands (the stage crossfades them) — never across photos */
  const highlight = hlKey && hl && hl.img === imageUrl ? hl.url : null
  const washKey = o.wash.length && imageUrl ? `${imageUrl.slice(-80)}|${o.wash.map((w) => `${w.def.id}:${defKey(w.def)}:${w.hex}`).join(',')}` : null
  const [washed, setWashed] = useState<{ key: string; img: string; url: string } | null>(null)
  useEffect(() => {
    if (!washKey) return
    let alive = true
    const t = setTimeout(() => {
      const url = imgRef.current, items = washRef.current
      if (!url || !items.length) return
      washOverlay(url, items, { reading: readingRef.current, photoUrl: photoRef.current, finishes: finishesRef.current }).then((u) => { if (alive) setWashed({ key: washKey, img: url, url: u }) }).catch(() => {})
    }, 60)
    return () => { alive = false; clearTimeout(t) }
  }, [washKey])
  const wash = washKey && washed && washed.img === imageUrl ? washed.url : null
  const pvKey = lighting.on && lightUrl && !lighting.relit && !quiet ? `${lightUrl.slice(-80)}|${JSON.stringify(lighting.knobs)}|${finishes.reshaped ? 'r' : finishes.emptied ? 'e' : 'a'}` : null
  const [pv, setPv] = useState<{ key: string; img: string; url: string } | null>(null)
  useEffect(() => {
    if (!pvKey) return
    let alive = true
    const t = setTimeout(() => {
      const url = lightRef.current
      if (!url) return
      /* (F188) the preview grades with the room's own windows and fixtures, as the render will */
      const scene = lightSceneFor(sceneRef.current.sampleKey, readingRef.current, { fixtures: sceneRef.current.fixtures })
      previewLight(url, knobsRef.current, scene).then((u) => (finishRef.current ? finishRef.current(u) : u)).then((u) => { if (alive) setPv({ key: pvKey, img: url, url: u }) }).catch(() => {})
    }, 90)
    return () => { alive = false; clearTimeout(t) }
  }, [pvKey])
  /* (F177) the last light stays while the next one grades — only on the picture it was made from */
  const preview = lighting.on && !quiet ? lighting.relit ?? (pvKey && pv && pv.img === lightUrl ? pv.url : null) : null
  return { highlight, wash, preview }
}

/* ── the picks, and marking what the photo missed ── */

/** A mode that owns the photo's pointer: place a tap, or trace an outline. */
export type Placing = { kind: 'place'; label: string; add: (p: Pt) => void } | { kind: 'draw'; label: string; done: (poly: Pt[]) => void } | null
/** (surfaces-10) The room's Undo snackbars share one place: the newest step replaces the one before it, whose Undo would be refused. */
export const UNDO_KEY = 'viz-undo'
/** (surfaces-14) A piece marked with one click whose outline reads under this share of the photo is a speck (a blotch in its leaves) —
    it is drawn round instead. Measured on the sample rooms: real one-click reads ran 0.06–1 %, the failures 0–0.04 %. */
const PIECE_MIN = 0.0005
/** A record without the given keys (a pick's ids). */
export const omit = <T,>(o: Record<string, T>, ids: string[]) => { const n = { ...o }; for (const id of ids) delete n[id]; return n }

/** The history a room's picks keep (components/visualizer/editor/use-editor-state.ts). */
type History = {
  stepNow: (roomId: string) => number
  undoStep: (roomId: string, before: number) => boolean
  edit: (roomId: string, fns: { pending?: (p: Pending) => Pending; detection?: (d: Detection) => Detection }) => void
}
type Snack = ReturnType<typeof useSnackbar>

/**
 * Every pick on the room on screen, each a step ⌘Z takes back, and the ways of marking what the photo missed (1.0's + / draw / tap).
 * The host owns the selection and the modes; this works them.
 */
export function useRoomEdits(o: {
  roomId: string | null; viewKey: string; imageUrl: string | null; reading: Detection | null
  pending: Pending; finishes: Finishes; style: string
  ed: History
  patch: (fn: (p: Pending) => Pending, opts?: { coalesce?: string; history?: boolean }) => void
  patchDetection: (fn: (d: Detection) => Detection) => void
  resolve: (id: string) => MaterialRef | null
  snack: Snack
  pushRecent: (id: string) => void
  setMode: (m: Mode) => void; setSurfSel: (s: SurfaceSel) => void; setFurnSel: (k: string | null) => void
  setPlacing: (p: Placing) => void
  /** ≤1024: the tray folds away before a mode takes the photo */
  closeTray: () => void
  setRunError: (e: null) => void
}) {
  const { roomId, viewKey, imageUrl, reading, pending, finishes, style, ed, patch, patchDetection, resolve, snack, pushRecent, setMode, setSurfSel, setFurnSel, setPlacing, closeTray, setRunError } = o
  /** A snackbar's Undo — the step it names, while it is still the latest; once newer changes came after it, it says so (never nothing). */
  const undoFrom = (rid: string, before: number) => { if (!ed.undoStep(rid, before)) snack({ message: 'Newer changes came after that — use Undo to step back' }) }
  const pickMaterial = (ids: string[], mid: string | null) => {
    /* (round 3) the finish a surface already wears on this version is no change — picking it clears that surface's pick, so Generate never
       makes a copy of the version it starts from. A studio material recoloured since is a change (it lays the new colour). */
    const picked = mid ? resolve(mid) : null
    const wears = (id: string) => { const f = finishes.surfaces[id]; return !!f && !!picked && f.materialId === mid && f.hex.toLowerCase() === picked.hex.toLowerCase() }
    const set = mid ? ids.filter((id) => !wears(id)) : []
    patch((p) => ({ ...p, materials: { ...omit(p.materials, ids), ...Object.fromEntries(set.map((id) => [id, mid!])) } }))
    if (mid) pushRecent(mid)
  }
  const pickPiece = (ids: string[], pick: FurniturePick) => patch((p) => ({ ...p, furniture: pick.action === 'keep' ? omit(p.furniture, ids) : { ...p.furniture, ...Object.fromEntries(ids.map((id) => [id, pick])) } }), { coalesce: `furn:${ids.join(',')}:${pick.action}` })
  /* (pending modules S20 — Q-21 as she answered) a Replace the prototype can't draw becomes, on one press, a Customize in the pick's colour and
     finish (the words' colour, else the photo's, else the style's) — one step ⌘Z and the snackbar's Undo take back */
  const recolourToMatch = async (ids: string[]) => {
    if (!roomId || !reading) return
    const piece = reading.furniture.find((f) => f.id === ids[0]), p0 = ids[0] ? pending.furniture[ids[0]] : undefined
    if (!piece || !p0 || p0.action !== 'replace') return
    const photoHex = p0.refImage ? await loadImg(p0.refImage).then(dominantColour, () => null) : null
    const next = recolourPick(p0, { piece, photoHex, styleHex: styleByName(style)?.colorPalette[1] ?? null })
    const rid = roomId, before = ed.stepNow(rid)
    patch((p) => ({ ...p, furniture: { ...p.furniture, ...Object.fromEntries(ids.map((id) => [id, next])) } }))
    snack({ key: UNDO_KEY, message: `The ${pieceKind(piece.label).toLowerCase()} takes the pick’s colour`, actionLabel: 'Undo', onAction: () => undoFrom(rid, before) })
  }
  const clearAll = () => {
    if (!roomId) return
    const before = ed.stepNow(roomId)
    patch((p) => ({ ...p, materials: {}, furniture: {}, style: '', lighting: { presetId: null, knobs: neutralKnobs(), instruction: '' }, transfer: { ...p.transfer, refs: [] }, note: '', tool: null }))
    snack({ key: UNDO_KEY, message: 'Changes cleared', actionLabel: 'Undo', onAction: () => undoFrom(roomId, before) })
  }
  /* (F031) taking a surface or a piece off the list is one step — its picks with it — ⌘Z and the snackbar's Undo take it back alike */
  const forget = (ids: string[], what: string) => {
    if (!roomId) return
    const before = ed.stepNow(roomId)
    setRunError(null)
    ed.edit(roomId, { detection: (d) => ({ ...d, hidden: [...new Set([...(d.hidden ?? []), ...ids])] }), pending: (p) => ({ ...p, materials: omit(p.materials, ids), furniture: omit(p.furniture, ids) }) })
    setSurfSel(null); setFurnSel(null)
    snack({ key: UNDO_KEY, message: `${what} taken off the list`, actionLabel: 'Undo', onAction: () => undoFrom(roomId, before) })
  }
  const clearSlot = (slot: Slot, ids: string[]) => patch((p) => (
    slot === 'materials' ? { ...p, materials: omit(p.materials, ids) }
      : slot === 'furniture' ? { ...p, furniture: omit(p.furniture, ids) }
        : slot === 'style' ? { ...p, style: '' }
          : slot === 'refs' ? { ...p, transfer: { ...p.transfer, refs: [] } }
            : slot === 'lighting' ? { ...p, lighting: { presetId: null, knobs: neutralKnobs(), instruction: '' } }
              : slot === 'note' ? { ...p, note: '' } : { ...p, tool: null }))
  /* (F057) a style card and a reference both set the look — picking one takes the other off, with Undo */
  /* (style-light 4) only a card picked takes the references off — un-ticking it, or None, leaves them; the card and its references go
     as one step, so Undo puts back both */
  const pickStyle = (name: string) => {
    if (!roomId) return
    const next = pending.style === name ? '' : name, refs = pending.transfer.refs.length, before = ed.stepNow(roomId)
    const drops = !!next && refs > 0
    patch((p) => ({ ...p, style: next, ...(drops ? { transfer: { ...p.transfer, refs: [] } } : {}) }))
    if (drops) snack({ key: UNDO_KEY, message: refs === 1 ? 'Reference taken off' : 'References taken off', actionLabel: 'Undo', onAction: () => undoFrom(roomId, before) })
  }

  /** (F022) A surface or a piece marked by hand carries the version it was marked on (`markedOn`: its key, or the Original) — it reads
      only on versions of that picture (`onPicture`). */
  const markedOn = <T extends object>(def: T): T & MarkedOn => ({ ...def, markedOn: viewKey })
  const startDraw = (target: SurfaceDef | null, label?: string) => {
    closeTray()
    setPlacing({ kind: 'draw', label: target ? titleCaseLabel(target.label).toLowerCase() : (label ?? 'the surface').toLowerCase(), done: (poly) => addSurfaceDrawn(label ?? target?.label ?? 'Surface', poly, target ?? undefined) })
  }
  /* (F023) a tap grows only near itself; one that spreads over a quarter of the photo — or finds nothing — is traced instead.
     (verify round 2) …and one its box cut short is traced too: the same tap is read again with room to spread, and a region that grows
     past the tap's box was stopped by the box's straight edges, not by the surface's own — a tap never saves a rectangle. */
  const addSurfaceAt = async (label: string, p: Pt) => {
    if (!roomId) return
    const url = imageUrl, r = reading
    /* (surfaces-19) a tap inside a surface already on the list picks that one — the same region is never added twice; a surface that is
       only part of it is drawn instead */
    if (url && r) {
      const hit = await surfaceUnder(url, p, r).catch(() => null)
      if (hit) {
        setMode('surfaces'); setSurfSel({ kind: 'label', key: hit.label.toLowerCase() })
        snack({ message: `That’s ${titleCaseLabel(hit.label)} — already on the list`, actionLabel: 'Draw instead', onAction: () => startDraw(null, label) })
        return
      }
    }
    const def = markedOn(tappedSurface(label, p)), before = ed.stepNow(roomId)
    patchDetection((d) => ({ ...d, surfaces: [...d.surfaces, def] }))
    setMode('surfaces'); setSurfSel({ kind: 'label', key: label.toLowerCase() })
    if (!url || !r) return
    const withDef = { ...r, surfaces: [...r.surfaces, def] }
    const read = await Promise.all([regionShare(url, def, withDef), regionShare(url, { ...def, within: boxAround(p, WIDE_TAP) }, withDef)]).catch(() => null)
    if (!read) return
    const [share, wide] = read
    const spread = share > 0.25 || (wide > share * 1.15 && wide - share > 0.002)
    if (!spread && share >= 0.0005) return
    ed.undoStep(roomId, before)
    startDraw(null, label)
    snack({ message: spread ? 'This spread too far — trace its outline instead' : 'Nothing to mark there — trace its outline instead' })
  }
  const addSurfaceDrawn = (label: string, poly: Pt[], target?: SurfaceDef) => {
    const cx = poly.reduce((s, q) => s + q.x, 0) / poly.length, cy = poly.reduce((s, q) => s + q.y, 0) / poly.length
    if (target) patchDetection((d) => ({ ...d, surfaces: d.surfaces.map((s) => (s.id === target.id ? { ...s, region: poly, x: cx, y: cy, ...(s.manual ? { markedOn: viewKey } : {}) } : s)) }))
    else patchDetection((d) => ({ ...d, surfaces: [...d.surfaces, markedOn({ id: newId('s'), label, x: cx, y: cy, region: poly, manual: true })] }))
    setMode('surfaces'); setSurfSel({ kind: 'label', key: (target?.label ?? label).toLowerCase() })
  }
  /** (surfaces-19) The surface on the list under a tap on this picture, read as Generate reads it — or null. */
  const surfaceUnder = async (url: string, p: Pt, r: Detection): Promise<SurfaceDef | null> => {
    const img = await loadImg(url)
    const x = Math.min(img.width - 1, Math.max(0, Math.round(p.x * (img.width - 1)))), y = Math.min(img.height - 1, Math.max(0, Math.round(p.y * (img.height - 1))))
    for (const s of r.surfaces) if ((regionOf(img, url, s, 480, { reading: r })[y * img.width + x] ?? 0) >= 0.5) return s
    return null
  }
  /* (surfaces-14) a piece marked with one click is read at once, as a tapped surface is: an outline that comes back as a speck (or spills
     well past the piece) is traced instead — Customize and Remove never work on a blotch inside it */
  const addPieceAt = async (label: string, category: string, p: Pt) => {
    if (!roomId) return
    const before = ed.stepNow(roomId), url = imageUrl, r = reading
    const def = markedOn({ id: newId('f'), label, category, x: p.x, y: p.y, seeds: [p], box: [Math.max(0, p.x - 0.14), Math.max(0, p.y - 0.16), Math.min(1, p.x + 0.14), Math.min(1, p.y + 0.16)] as [number, number, number, number], local: 7, global: 20, manual: true })
    patchDetection((d) => ({ ...d, furniture: [...d.furniture, def] }))
    setMode('furniture'); setFurnSel(normFurnitureKey(label))
    if (!url || !r) return
    /* read as a tapped surface is (F023): once in its own box, once with room to spread — a region that grows past its box was stopped by
       the box's straight edges, not by the piece's own */
    const withDef = { ...r, furniture: [...r.furniture, def] }
    const wideBox: [number, number, number, number] = [Math.max(0, p.x - 0.24), Math.max(0, p.y - 0.27), Math.min(1, p.x + 0.24), Math.min(1, p.y + 0.27)]
    const read = await Promise.all([regionShare(url, def, withDef), regionShare(url, { ...def, box: wideBox }, withDef)]).catch(() => null)
    if (!read) return
    const [share, wide] = read
    const speck = share < PIECE_MIN, spill = share > 0.25 || (wide > share * 1.15 && wide - share > 0.002)
    if (!speck && !spill) return
    ed.undoStep(roomId, before)
    closeTray()
    setPlacing({ kind: 'draw', label: `the ${label.toLowerCase()}`, done: (poly) => addPieceDrawn(label, category, poly) })
    snack({ message: speck ? 'Couldn’t find its edges — draw round it instead' : 'This spread too far — draw round it instead' })
  }
  /** (surfaces-14) A piece drawn round by hand — its outline is its region, used as it is. */
  const addPieceDrawn = (label: string, category: string, poly: Pt[]) => {
    const xs = poly.map((q) => q.x), ys = poly.map((q) => q.y)
    const cx = xs.reduce((s, v) => s + v, 0) / poly.length, cy = ys.reduce((s, v) => s + v, 0) / poly.length
    const box: [number, number, number, number] = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]
    patchDetection((d) => ({ ...d, furniture: [...d.furniture, markedOn({ id: newId('f'), label, category, x: cx, y: cy, seeds: [{ x: cx, y: cy }], box, region: poly, manual: true })] }))
    setMode('furniture'); setFurnSel(normFurnitureKey(label))
  }
  /** (F023) "another like this" on a drawn surface is drawn too; else a tap marks it. */
  const addSurfaceLike = (label: string) => {
    if (reading?.surfaces.some((s) => s.label.toLowerCase() === label.toLowerCase() && s.region)) { startDraw(null, label); return }
    closeTray()
    setPlacing({ kind: 'place', label: `the other ${titleCaseLabel(label).toLowerCase()}`, add: (p) => { void addSurfaceAt(label, p) } })
  }
  const addPieceLike = (label: string, category: string) => {
    closeTray()
    setPlacing({ kind: 'place', label: `the other ${titleCaseLabel(label).toLowerCase()}`, add: (p) => { void addPieceAt(label, category, p) } })
  }
  /** (F042) What Add a surface / Add furniture hands back: a tap (or, for a surface, a traced outline) for the name picked. */
  const placeNamed = (kind: 'surface' | 'furniture', label: string, category: string, how: 'place' | 'draw') => {
    closeTray()
    if (kind === 'furniture') setPlacing({ kind: 'place', label: `the ${label.toLowerCase()}`, add: (p) => { void addPieceAt(label, category, p) } })
    else if (how === 'draw') startDraw(null, label)
    else setPlacing({ kind: 'place', label: `the ${label.toLowerCase()}`, add: (p) => { void addSurfaceAt(label, p) } })
  }
  return { undoFrom, pickMaterial, pickPiece, recolourToMatch, clearAll, forget, clearSlot, pickStyle, startDraw, addSurfaceAt, addSurfaceDrawn, addPieceAt, addPieceDrawn, addSurfaceLike, addPieceLike, placeNamed }
}

/* ── the pictures a person hands over ── */

/** (critic 19 · pending modules S20) What the device hands over, and a picked picture redrawn as a JPEG (HEIC on every browser) —
    picture-reader.ts, a light module the website's trial loads before the editor. */
export function usePictureReader() {
  const snack = useSnackbar()
  const unsnack = useSnackbarDismiss()
  return pictureReader(snack, unsnack)
}

/* ── where a snackbar rests in the frame ── */

/**
 * (F014 · F089 · F140 · wave E, E1) Where a snackbar rests — the house offset (`--bottom-dock`, REG-302), measured from the frame while the
 * editor is open and given back when it closes:
 * - a desk, a tablet, a phone on its side: over the versions strip's left end (its head and first tile), centred on the strip — never
 *   on the photo, never on the canvas bar; with the camera model's tray up (the strip folded away), over the go line's left end;
 * - a phone held upright keeps its place: above the canvas bar, the versions, the tray, the go bar and the dock (a short one too);
 * - (code-robustness 3 · fresh-tablet 11 · fresh-phone 4) a dialog or a sheet open: the editor's rows don't count — the house place
 *   below a centred dialog, or, over a sheet (a phone's), just above the sheet's footer, never on its buttons.
 * (phone-tablet 11) The editor has no app rail: while it is open the snackbar lines up with the canvas' 16 px gutter, not the rail's 84.
 * `deps` — what changes the frame's rows (the host's own).
 */
export function useFrameSnackbarPlace(rootRef: RefObject<HTMLDivElement | null>, short: boolean, deps: readonly unknown[]): void {
  const dismissSnack = useSnackbarDismiss()
  const dismissRef = useRef(dismissSnack)
  useEffect(() => { dismissRef.current = dismissSnack })
  useEffect(() => {
    const root = rootRef.current; if (!root) return
    const css = document.documentElement.style
    let raf = 0
    const write = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        /* (UX audit V12) where the stage starts — the Maison AI button rides its top corner in the camera model, clear of the versions */
        const body = root.querySelector<HTMLElement>('[data-viz-body]')?.getBoundingClientRect()
        if (body) root.style.setProperty('--viz-stage-top', `${Math.round(body.top)}px`)
        const phone = window.matchMedia('(max-width: 767px)').matches, H = window.innerHeight, SNACK = 48
        const base = phone ? 16 : 24
        /* the snackbar's own band: 16 from the left (no app rail here), 344 wide — the width of the screen less its gutters on a phone */
        const left = 16, right = phone ? window.innerWidth - 16 : 16 + 344
        const covers = (r: DOMRect) => r.height > 0 && r.right > left && r.left < right
        const modals = document.querySelectorAll<HTMLElement>('[aria-modal="true"]')
        /** the snackbar's bottom edge, from the top of the screen; null — the house place */
        let edge: number | null = null, narrowTo: number | null = null, shiftTo: number | null = null, overFab = false
        if (modals.length) {
          const m = modals[modals.length - 1]!, foot = m.lastElementChild
          const mr = m.getBoundingClientRect(), fr = foot?.getBoundingClientRect()
          /* a sheet (it rises from the foot of the screen) with a footer: above the footer; a centred dialog: the house place */
          if (mr.bottom >= H - 2 && fr && fr.height > 0 && fr.height <= 120 && Math.abs(fr.bottom - mr.bottom) <= 2 && covers(fr)) edge = fr.top - 8
        } else if (!phone || short) {
          /* (E1) centred on the strip (or, the tray up, on the go line — the dock's tabs under it don't count) */
          const strip = root.querySelector<HTMLElement>('[data-viz-strip]')?.getBoundingClientRect()
          const go = root.querySelector<HTMLElement>('[data-viz-go]'), tabs = go?.querySelector<HTMLElement>('[role="tablist"]')
          const gr = go?.getBoundingClientRect(), goBottom = tabs ? tabs.getBoundingClientRect().top : gr?.bottom ?? 0
          const band = strip && strip.height > 24 && covers(strip) ? { top: strip.top, bottom: strip.bottom }
            : gr && goBottom - gr.top > 24 && covers(gr) ? { top: gr.top, bottom: goBottom } : null
          if (band) edge = band.top + (band.bottom - band.top + SNACK) / 2
          /* (round 3) with few versions the newest tile sits under the snackbar's band — rest it after the last tile when the strip has
             room, so "V1 is ready" never hides V1 (many versions: the newest is at the far end, clear of it) */
          if (!phone && band && strip) {
            const tiles = [...root.querySelectorAll<HTMLElement>('[data-viz-strip] [role="listitem"]')].map((t) => t.getBoundingClientRect()).filter((r) => r.width > 0)
            const last = tiles.length ? Math.max(...tiles.map((r) => r.right)) : 0
            /* the Maison AI button can sit in the strip's band (a landscape tablet): rest clear of it, or — when only its place is free —
               over it, the button stepping aside while the snackbar shows (the snackbar keeps its fixed 344, the owner's rule) */
            const fab = root.querySelector<HTMLElement>('button[aria-label="Maison AI"]')?.getBoundingClientRect()
            const fabIn = !!fab && fab.width > 0 && fab.bottom > band.top && fab.top < band.bottom
            const clear = fabIn ? fab.left - 8 : strip.right - 16
            if (last > left && last + 16 + 344 <= clear) shiftTo = Math.round(last + 16)
            else if (last > left && fabIn && last + 16 + 344 <= strip.right - 16) { shiftTo = Math.round(last + 16); overFab = true }
          }
          /* a phone on its side under 768 wide: the phone's full-width snackbar keeps to the photo's column, off the rail's go line
             (read by snackbar.module.css's `right` at ≤767 when it takes `--snackbar-right`) */
          if (phone && strip && strip.width > 0) narrowTo = Math.max(16, Math.round(window.innerWidth - strip.right + 16))
        } else {
          const marks = [...root.querySelectorAll<HTMLElement>('[data-viz-bottom], [role="toolbar"][aria-label="Canvas"]')]
            .map((el) => el.getBoundingClientRect()).filter((r) => covers(r) && r.top > 0)
          if (marks.length) edge = Math.min(...marks.map((r) => r.top)) - 8
        }
        /* (E1) a slim strip (a phone on its side) puts the centred snackbar below the house place — never closer than 2px to the edge */
        if (edge === null) css.removeProperty('--bottom-dock')
        else css.setProperty('--bottom-dock', `${Math.max(2 - base, Math.round(H - edge - base))}px`)
        if (narrowTo === null) css.removeProperty('--snackbar-right')
        else css.setProperty('--snackbar-right', `${narrowTo}px`)
        /* the snackbar's left edge rides the house `--rail-w` (left = rail + 32; the editor's own is −16 → 16) */
        css.setProperty('--rail-w', shiftTo === null ? '-16px' : `${shiftTo - 32}px`)
        /* the button steps aside only while a snackbar is on screen over its place */
        root.toggleAttribute('data-snack-fab', overFab && !!document.querySelector('[role="status"][aria-live="polite"] > *'))
      })
    }
    write()
    const ro = new ResizeObserver(write)
    ro.observe(root)
    for (const el of root.querySelectorAll('[data-viz-body], [data-viz-strip], [data-viz-go]')) ro.observe(el)
    /* a dialog opening or closing (they portal into the body), a snackbar arriving (measured once the dialog has settled) */
    /* (round 3) …and once more when a sheet has finished rising: while it slides up it isn't at the screen's foot yet, so a snackbar raised
       just before it opened stayed in the house place, on the sheet's last line */
    let late = 0
    /* (round 3) a dialog or a sheet opening over the page puts away the page's snackbars — raised just before, they sat on its footer or
       its last line; what the dialog itself says afterwards stays */
    let modals = document.querySelectorAll('[aria-modal="true"]').length
    const mo = new MutationObserver(() => {
      const n = document.querySelectorAll('[aria-modal="true"]').length
      if (n > modals) dismissRef.current('*')
      modals = n
      write(); window.clearTimeout(late); late = window.setTimeout(write, 400)
    })
    mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-modal'] })
    window.addEventListener('resize', write)
    return () => { cancelAnimationFrame(raf); window.clearTimeout(late); ro.disconnect(); mo.disconnect(); window.removeEventListener('resize', write); css.removeProperty('--bottom-dock'); css.removeProperty('--snackbar-right') }
  }, [short, ...deps])   // eslint-disable-line react-hooks/exhaustive-deps -- the host names what moves its rows
  /* (phone-tablet 11) The editor has no app rail: while it is open the snackbar lines up with the canvas' 16 px gutter, not the rail's 84
     (the house host sits at the rail's width + 32). */
  useEffect(() => {
    const css = document.documentElement.style
    css.setProperty('--rail-w', '-16px')
    return () => { css.removeProperty('--rail-w') }
  }, [])
}
