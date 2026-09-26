import { patternSize, patternTile, type Pattern } from '@/lib/visualizer/patterns'
import { chipCss } from '@/lib/visualizer/materials'
import { changeLines, groupWord, type Detection, type FinishedSurface, type VersionView } from '@/lib/visualizer/model'
import { titleCaseLabel } from '@/lib/visualizer/surfaces'
import { plainFinishName } from '@/lib/visualizer/outputs'

/* What a version carries, read the same way by Present and the moodboard (audit 2026-09-26, F075 · critic 12). A version's own `applied`
   lists only what its pass changed — a relight of V2 still wears V2's walls, floor and sofa — so every label is looked up in the finish
   itself first (a finish laid since the audit stores its surface's label), then the room's reading, then the pass. */

export type Labels = Pick<Detection, 'surfaces' | 'furniture'> | null | undefined
export type Fact = { what: string; to: string }

const pieceWord = (label: string) => titleCaseLabel(label).replace(/\s*\([^)]*\)\s*$/, '')
/** A group named whole: its word ("Walls", "Floor") — one surface named by a singular noun reads singular ("Feature Wall", never
    "Feature Walls"), as the Surfaces list names a group of one. */
const wholeWord = (g: string, ls: (string | null)[]) => (ls.length === 1 && /s$/.test(g) && /[^s]$/i.test((ls[0] ?? '').trim()) ? g.replace(/s$/, '') : g)

/** A surface's label on this version — the finish's own, the room's reading, the pass that laid it. */
export function surfaceLabelOf(v: VersionView, id: string, labels: Labels): string | null {
  return v.finishes.surfaces[id]?.label ?? labels?.surfaces.find((s) => s.id === id)?.label ?? v.applied.surfaces.find((s) => s.id === id)?.label ?? null
}
/** A piece's name on this version — the room's reading, then the pass (without the reading's bracketed note). */
export function pieceLabelOf(v: VersionView, id: string, labels: Labels): string | null {
  const l = labels?.furniture.find((f) => f.id === id)?.label ?? v.applied.furniture.find((f) => f.id === id)?.label ?? null
  return l ? pieceWord(l) : null
}

/** (desktop-8 · desktop-15) A surface's finish in words: a colour a style transfer read off a reference photo is named afresh from its own
    colour for the surface it lies on — a worktop's among the stones, a wall's among the paints — so a version made before the rule
    improved reads by today's rule, and one colour on a wall and a worktop is two names, never a stone on the wall. */
export function surfaceFinishName(f: Pick<FinishedSurface, 'materialId' | 'name' | 'hex'>, label: string | null): string {
  if (f.materialId.startsWith('ref:') && /^#[0-9a-f]{6}$/i.test(f.hex)) return plainFinishName(`Reference ${f.hex}`, label)
  return finishName(f.name, label)
}

/** The finishes, one per material, with where each one goes: a surface group it covers whole ("Walls", "Floor"), else the surfaces
    themselves ("White Painted Back Wall") — the rule `surfaceFacts` reads by (verify round 1). (desktop-8) A reference colour is one
    swatch per name it takes: the same colour on the walls and on the worktop is "close to Linen" over Walls and "close to Quartz
    Calacatta" over Countertops, as Present lists them — `finish.name` carries the name in words. */
export function finishGroups(v: VersionView, labels: Labels): { finish: FinishedSurface; where: string[] }[] {
  const out: { key: string; finish: FinishedSurface; labels: string[] }[] = []
  for (const [id, f] of Object.entries(v.finishes.surfaces)) {
    const label = surfaceLabelOf(v, id, labels)
    const name = surfaceFinishName(f, label)
    const key = f.materialId.startsWith('ref:') ? `${f.materialId}|${name}` : f.materialId
    const at = out.find((x) => x.key === key)
    if (at) { if (label && !at.labels.includes(label)) at.labels.push(label); continue }
    out.push({ key, finish: { ...f, name }, labels: label ? [label] : [] })
  }
  return out.map(({ finish, labels: ls }) => {
    const where: string[] = []
    for (const l of ls) {
      const g = groupWord(l)
      const mine = ls.filter((x) => groupWord(x) === g).length
      const inRoom = labels?.surfaces.filter((s) => groupWord(s.label) === g).length ?? 0
      const word = !labels || inRoom <= mine ? wholeWord(g, ls.filter((x) => groupWord(x) === g)) : titleCaseLabel(l)
      if (!where.includes(word)) where.push(word)
    }
    return { finish, where }
  })
}

/** The pieces this version restyled or took out, by name. */
export function pieceFacts(v: VersionView, labels: Labels): Fact[] {
  const removed = new Set(v.finishes.removed)
  const out: Fact[] = []
  for (const [id, desc] of Object.entries(v.finishes.customized)) if (!removed.has(id) && desc) out.push({ what: pieceLabelOf(v, id, labels) ?? 'A piece', to: desc })
  for (const id of v.finishes.removed) { const what = pieceLabelOf(v, id, labels); if (what) out.push({ what, to: 'Taken out' }) }
  return out
}

/* (verify round 1 · audit 2026-09-26) A style transfer names its finishes by the reference's colour code ("Reference #1D1A13"); the studio
   reads it in words — the nearest catalogue finish of the surface's kind by eye (Lab ΔE), or just "Reference colour" when nothing is close.
   One rule with the quote lines and the client's link (`plainFinishName`). Any other name is kept as it is. */
export function finishName(name: string, surfaceLabel?: string | null): string {
  return plainFinishName(name, surfaceLabel)
}

/** The surfaces' lines: a group the finish covers whole reads by the group ("Walls · Sage Green", "Floor · Walnut vinyl plank"); where the
    room has more of the group than the finish covers, or the group wears two finishes, each surface reads by its own name ("Back Wall ·
    Sage Green") — never "Walls" for one wall of three. Without the room's reading, a group is taken as whole. A surface laid twice in one
    pass (a style, then a note on the same ceiling) reads once, the later finish winning (verify round 1). */
function surfaceFacts(v: VersionView, labels: Labels): Fact[] {
  return surfaceLines(Object.entries(v.finishes.surfaces).map(([id, f]) => { const label = surfaceLabelOf(v, id, labels); return { id, label, name: surfaceFinishName(f, label) } }), labels)
}
/** The lines for a set of surfaces and the names of their finishes — `surfaceFacts`' rule, shared with what a pass changed. */
function surfaceLines(entries: { id: string; label: string | null; name: string }[], labels: Labels): Fact[] {
  const byLabel = new Map<string, { label: string | null; name: string }>()
  for (const { id, label, name } of entries) {
    const k = label ? label.trim().toLowerCase() : `#${id}`
    byLabel.delete(k)   // the later one wins, and takes the later place
    byLabel.set(k, { label, name })
  }
  const groups = new Map<string, { label: string | null; name: string }[]>()
  for (const x of byLabel.values()) { const g = x.label ? groupWord(x.label) : 'A surface'; groups.set(g, [...(groups.get(g) ?? []), x]) }
  const out: Fact[] = []
  for (const [g, xs] of groups) {
    const names = [...new Set(xs.map((x) => x.name))]
    const inRoom = labels?.surfaces.filter((s) => groupWord(s.label) === g).length ?? 0
    const whole = !labels || inRoom <= xs.length
    if (names.length === 1 && whole) { out.push({ what: wholeWord(g, xs.map((x) => x.label)), to: names[0]! }); continue }
    const seen = new Set<string>()
    for (const x of xs) { const what = x.label ? titleCaseLabel(x.label) : g, k = `${what}|${x.name}`; if (seen.has(k)) continue; seen.add(k); out.push({ what, to: x.name }) }
  }
  return out
}

/** Everything the version shows, as lines — one per surface group and finish, the pieces, the look and the light. */
export function carriedFacts(v: VersionView, labels: Labels): Fact[] {
  const out: Fact[] = [...surfaceFacts(v, labels)]
  out.push(...pieceFacts(v, labels))
  if (v.finishes.emptied) out.push({ what: 'Room', to: 'Emptied' })
  if (v.finishes.style) out.push({ what: 'Style', to: v.finishes.style })
  if (v.finishes.lighting) out.push({ what: 'Lighting', to: v.finishes.lighting })
  return out
}

/**
 * (surfaces-26 · desktop-8) What a version's own pass changed — Present's "What changed" — named exactly as "Everything in" names it: a
 * surface group the pass covered whole reads by the group ("Ceiling · Olive Green", never the reading's "White Ceiling", which is the
 * finish it replaced); one finish on part of a group, or two finishes in one group, read surface by surface — never the group word twice.
 * The pieces, the look, the light, a note: as the pass lists them.
 */
export function changedFacts(v: VersionView, labels: Labels): Fact[] {
  const surfaces = surfaceLines(v.applied.surfaces.map((s) => {
    const label = s.label || surfaceLabelOf(v, s.id, labels)
    const f = v.finishes.surfaces[s.id]
    const name = f && f.materialId === s.materialId ? surfaceFinishName(f, label) : finishName(s.name, label)
    return { id: s.id, label, name }
  }), labels)
  return [...surfaces, ...changeLines({ ...v.applied, surfaces: [] })]
}

/** (verify round 1) What a version shows that `before` doesn't — "What changed" against a version further up the line when the one in
    between was deleted (its own pass no longer says the whole difference). Against the Original (null), everything the version shows. */
export function factsSince(v: VersionView, before: VersionView | null, labels: Labels): Fact[] {
  const had = new Set((before ? carriedFacts(before, labels) : []).map((f) => `${f.what}|${f.to}`))
  return carriedFacts(v, labels).filter((f) => !had.has(`${f.what}|${f.to}`))
}

/* (F087) A finish's chip draws the very tile the engine lays on the wall — one bitmap, the same motif and the same scale on screen and in
   print (the CSS gradients drew a different motif, and the printer blew them up). Browser-only; memoised per pattern and colour. */
const tiles = new Map<string, string | null>()
function patternUrl(p: Pattern, base: string): string | null {
  if (typeof document === 'undefined') return null
  const k = `${p.kind}|${p.accent ?? ''}|${base}`
  if (tiles.has(k)) return tiles.get(k) ?? null
  let url: string | null = null
  try {
    const img = patternTile(p, base, 96)
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height
    const ctx = c.getContext('2d')
    if (ctx) { const d = ctx.createImageData(img.width, img.height); d.data.set(img.data); ctx.putImageData(d, 0, 0); url = c.toDataURL('image/png') }
  } catch { url = null }
  tiles.set(k, url)
  return url
}
/** (F087) For print: the motif laid out once over a whole chip-sized bitmap (480×360) at the chip's scale — one picture, no repeating
    background, which some PDF viewers draw as seams or blow up. Browser-only; memoised. */
const boards = new Map<string, string | null>()
function patternBoard(p: Pattern, base: string): string | null {
  if (typeof document === 'undefined') return null
  const k = `${p.kind}|${p.accent ?? ''}|${base}|${patternSize(p)}`
  if (boards.has(k)) return boards.get(k) ?? null
  let url: string | null = null
  try {
    const tile = patternTile(p, base, 96)
    const t = document.createElement('canvas'); t.width = tile.width; t.height = tile.height
    const tctx = t.getContext('2d')
    const c = document.createElement('canvas'); c.width = 480; c.height = 360
    const ctx = c.getContext('2d')
    if (tctx && ctx) {
      const d = tctx.createImageData(tile.width, tile.height); d.data.set(tile.data); tctx.putImageData(d, 0, 0)
      /* the chip shows ~300px on screen; the board is drawn at 1.6× that so the print stays crisp, the repeat at the chip's scale */
      const w = Math.round(Math.min(96, Math.max(24, patternSize(p) * 100)) * 1.6), h = Math.round((w * tile.height) / tile.width)
      ctx.fillStyle = base; ctx.fillRect(0, 0, c.width, c.height)
      for (let y = 0; y < c.height; y += h) for (let x = 0; x < c.width; x += w) ctx.drawImage(t, x, y, w, h)
      url = c.toDataURL('image/png')
    }
  } catch { url = null }
  boards.set(k, url)
  return url
}
/** A finish's swatch for the moodboard: a wallpaper as one pre-tiled picture (F087), anything else as `finishChip`. */
export function finishBoard(f: Pick<FinishedSurface, 'hex' | 'pattern'>, imageUrl: string | null = null): string {
  if (!imageUrl && f.pattern) { const url = patternBoard(f.pattern, f.hex); if (url) return `url("${url}") center / cover no-repeat, ${f.hex}` }
  return finishChip(f, imageUrl)
}

/** A finish's swatch as a CSS background: its photo, its motif as the engine paints it, or its colour. */
export function finishChip(f: Pick<FinishedSurface, 'hex' | 'pattern'>, imageUrl: string | null = null, maxPx = 96): string {
  if (!imageUrl && f.pattern) {
    const url = patternUrl(f.pattern, f.hex)
    /* a repeat's real size sets its scale — a metre of pattern ≈ 100px of chip, so boards read longer than a wallpaper's repeat; a small chip
       caps the repeat (`maxPx`) so it still shows the motif, not one stripe of it (audit 2026-09-26) */
    if (url) return `url("${url}") 0 0 / ${Math.round(Math.min(maxPx, Math.max(Math.min(24, maxPx), patternSize(f.pattern) * 100)))}px auto repeat, ${f.hex}`
  }
  return chipCss({ imageUrl, pattern: f.pattern ?? null, hex: f.hex })
}
