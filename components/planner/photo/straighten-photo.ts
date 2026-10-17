'use client'

import { normalizePicture } from '@/lib/heic'
import { PLAN_EDGE } from '@/lib/projects/floor-plan-model'
import { straightenCanvas } from '@/lib/planner/straighten-run'
import { planPictureOf } from '@/components/projects/floor-plan/plan-picture'
import { quadUsable, seedCorners, warpToRect, type Quad } from '@/lib/planner/corners'

/*
 * (pending modules S28 — card studio:floorplan-isometric-ai) The browser half of Make a 3D picture's first step: a picked floor plan (a phone
 * photo at any angle, a HEIC — S20's converter —, a PNG, or a PDF's first page as the Floor plan tab draws it) read onto a canvas at the
 * plan's long edge (2400, G's), then made straight and clean by 1.0's rules (lib/planner/straighten-run.ts: the sheet found and cut out, the
 * tilt left read from the walls, the paper's shading divided away and its levels stretched, the turn — and a quarter more for each press of
 * Turn a quarter — and the crop to its drawing). Off, only the quarter turns apply. The footprint — how much of the picture the plan covers —
 * rides along for the floor area's size.
 */

export type ReadPlan = { canvas: HTMLCanvasElement; name: string }
export type Straightened = { data: string; width: number; height: number; angle: number; share: number; read: boolean; /** a sheet of paper was found and cut out */ paper: boolean }

const loadImage = (src: string) => new Promise<HTMLImageElement | null>((resolve) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = () => resolve(null); img.src = src })
const canvasOf = (w: number, h: number) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c }

/** A picked file (or a file fetched from Files) drawn at the plan's long edge on white — null when it can't be read; `{ error }` in the words to say. */
export async function readPlanFile(file: Blob, name: string): Promise<ReadPlan | { error: string } | null> {
  let blob: Blob = file
  if (file instanceof File) { const n = await normalizePicture(file); if ('error' in n) return n; blob = n.file }
  const pic = await planPictureOf(blob, name)   // a PDF's first page, or the picture shrunk to 2400 on white
  if (!pic) return null
  const img = await loadImage(pic.data)
  if (!img) return null
  const c = canvasOf(pic.width, pic.height)
  const g = c.getContext('2d', { willReadFrequently: true }); if (!g) return null   // read back on the CPU from the first press: a GPU readback differs by a level here and there, and the straightening must give one answer
  g.drawImage(img, 0, 0)
  return { canvas: c, name }
}
/** A picture already on record (a project's floor plan) read onto a canvas as it is. */
export async function readPlanUrl(url: string, name: string): Promise<ReadPlan | null> {
  const img = await loadImage(url)
  if (!img || !img.naturalWidth) return null
  const k = Math.min(1, PLAN_EDGE / Math.max(img.naturalWidth, img.naturalHeight))
  const c = canvasOf(img.naturalWidth * k, img.naturalHeight * k)
  const g = c.getContext('2d', { willReadFrequently: true }); if (!g) return null
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, c.width, c.height)
  g.drawImage(img, 0, 0, c.width, c.height)
  return { canvas: c, name }
}

/**
 * The plan made straight and clean (or, `clean` off, only turned by its quarters), cropped to its drawing and kept under the plan's long edge,
 * as a JPEG — with the tilt it took away, whether a sheet of paper was found on the photo, and the share of the picture the plan covers
 * (FALLBACK_SHARE when its outline can't be read, `read` false). The one pipeline the Node harness checks (lib/planner/straighten-run.ts).
 */
export async function straightenPlan(src: ReadPlan, o: { clean: boolean; quarter: number; /** (S42 D·1) false: already squared by its corners */ paper?: boolean }): Promise<Straightened> {
  const r = straightenCanvas((w, h) => canvasOf(w, h), src.canvas, { clean: o.clean, quarter: o.quarter, edge: PLAN_EDGE, paper: o.paper })
  const out = r.canvas as HTMLCanvasElement
  return { data: out.toDataURL('image/jpeg', 0.9), width: out.width, height: out.height, angle: r.angle, share: r.share, read: r.read, paper: r.paper }
}

/**
 * (S42 D·1 — S41's proposal "Square it by its corners", built as recommended) A plan photo taken at a slant, squared by the four corners the
 * studio placed on its sheet (lib/planner/corners.ts — one homography, the house's own `squareToQuad`): the sheet onto a rectangle, as a
 * canvas the straightening then cleans and turns (`paper: false` — the sheet is already cut out). Where the corners start: the sheet S28's
 * paper finder reads, else the photo's own corners 6 % in.
 */
export function cornersStart(src: ReadPlan): { quad: Quad; found: boolean } {
  const g = src.canvas.getContext('2d', { willReadFrequently: true })
  if (!g) return seedCorners({ data: new Uint8ClampedArray(4), width: 1, height: 1 })
  return seedCorners(g.getImageData(0, 0, src.canvas.width, src.canvas.height))
}
export function squareByCorners(src: ReadPlan, quad: Quad): ReadPlan | null {
  const g = src.canvas.getContext('2d', { willReadFrequently: true })
  if (!g || !quadUsable(quad, src.canvas.width, src.canvas.height)) return null
  const out = warpToRect(g.getImageData(0, 0, src.canvas.width, src.canvas.height), quad, PLAN_EDGE)
  const full = canvasOf(out.width, out.height)
  const f = full.getContext('2d'); if (!f) return null
  f.putImageData(new ImageData(new Uint8ClampedArray(out.data), out.width, out.height), 0, 0)
  /* the sheet's own edge and its shadow stay off the plan — the same 1.2 % inset the straightening's paper cut takes */
  const inset = Math.round(Math.max(out.width, out.height) * 0.012)
  const c = canvasOf(out.width - inset * 2, out.height - inset * 2)
  const o = c.getContext('2d', { willReadFrequently: true }); if (!o) return null
  o.drawImage(full, inset, inset, c.width, c.height, 0, 0, c.width, c.height)
  return { canvas: c, name: src.name }
}
