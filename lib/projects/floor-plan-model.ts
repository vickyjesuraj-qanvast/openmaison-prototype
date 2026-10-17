/**
 * (gaps build G — Q-19's "later", calls G-Q1…G-Q18 in design-source/context/parity/projects-gaps-build/g-read.md) Floor-plan mark-up with the
 * client — the pure, client-safe half: the tools, the trade layers, the ten M&E stamps and three zones (1.0's catalogues, their keys STABLE —
 * a port of 1.0's marks keeps every one), the shape check the server runs on every write, the plan's scale (1.0's `floor-plan-scale.ts`), the
 * numbers on pins and callouts, the point schedule, the site diary, the filters, and the view types both sides read.
 *
 * Not a CAD tool: marks, not geometry (1.0 F-183). Points are 0–1 on the plan's picture, so a mark stays put at any size.
 */

export type Pt = { x: number; y: number }
export type Side = 'studio' | 'client'

/* ── Tools (1.0 F-190 · F-191 · F-229) ─────────────────────────────────────────────────────────────────────────────────────── */
export type MarkTool = 'pen' | 'rect' | 'arrow' | 'text' | 'pin' | 'photo' | 'hatch' | 'cloud' | 'callout' | 'symbol' | 'dimension'
export const MARK_TOOLS: readonly MarkTool[] = ['pen', 'rect', 'arrow', 'text', 'pin', 'photo', 'hatch', 'cloud', 'callout', 'symbol', 'dimension']
export const isMarkTool = (v: unknown): v is MarkTool => typeof v === 'string' && (MARK_TOOLS as readonly string[]).includes(v)
/** How many points a tool needs before it can be drawn (1.0's MIN). */
export const MIN_POINTS: Record<MarkTool, number> = { pen: 2, rect: 2, arrow: 2, dimension: 2, hatch: 2, cloud: 2, callout: 2, text: 1, pin: 1, symbol: 1, photo: 1 }
/** A pen stroke keeps at most this many points (a long scribble is thinned on the way in). */
export const PEN_MAX_POINTS = 600
/** (G-Q6) What the client may draw — the comment pin and the simple shapes; stamps, zones, clouds, callouts and measuring are studio work. */
export const CLIENT_TOOLS: readonly MarkTool[] = ['pin', 'pen', 'rect', 'arrow', 'text', 'photo']

/** The tool's name — on the toolbar, a mark's card and the legend. */
export const TOOL_LABEL: Record<MarkTool, string> = {
  pen: 'Pen', rect: 'Box', arrow: 'Arrow', text: 'Text', pin: 'Comment pin', photo: 'Site photo', hatch: 'Zone', cloud: 'Revision cloud', callout: 'Callout', symbol: 'Stamp', dimension: 'Measurement',
}
/** The toolbar's one-line hint for each (1.0's "{label} — {hint}"). */
export const TOOL_HINT: Record<MarkTool, string> = {
  pen: 'Draw freehand, like a marker pen',
  rect: 'Drag a box round built-in work — a wardrobe, a kitchen run, a feature wall',
  arrow: 'Drag an arrow to point at something',
  text: 'Tap to write a short label on the plan',
  pin: 'Tap a spot to drop a numbered pin and start a conversation',
  photo: 'Tap a spot, then add site photos — they make a dated site diary',
  hatch: 'Drag to shade a zone',
  cloud: 'Drag to ring something that changed',
  callout: 'Drag from a spot to a numbered tag',
  symbol: 'Tap to place a socket, a light or a water point — they are counted for you',
  dimension: 'Drag along anything to read its real length',
}
export const TOOL_ICON: Record<MarkTool, string> = {
  pen: 'draw', rect: 'crop_square', arrow: 'arrow_outward', text: 'title', pin: 'push_pin', photo: 'photo_camera', hatch: 'texture',
  cloud: 'radio_button_unchecked', callout: 'tooltip', symbol: 'switch', dimension: 'space_bar',
}

/* ── Zones (1.0's hatch patterns — pattern-coded, not colour-coded: these get printed in mono for contractors) ─────────────────── */
export type HatchKey = 'diagonal' | 'cross' | 'dots'
export const HATCHES: readonly { key: HatchKey; label: string; hint: string }[] = [
  { key: 'diagonal', label: 'Diagonal', hint: 'e.g. flooring' },
  { key: 'cross', label: 'Cross-hatch', hint: 'e.g. hacking or demolition' },
  { key: 'dots', label: 'Dotted', hint: 'e.g. tiling' },
]
export const isHatch = (v: unknown): v is HatchKey => typeof v === 'string' && HATCHES.some((h) => h.key === v)

/* ── Stamps (1.0's SYMBOL_CATALOGUE — electrical is quoted per point, so a stamp is counted) ─────────────────────────────────── */
export type SymbolGroup = 'power' | 'lighting' | 'wet'
export type SymbolGlyph = 'socket' | 'socket-double' | 'switch' | 'data' | 'aircon' | 'downlight' | 'cove' | 'pendant' | 'water' | 'floor-trap'
export type SymbolDef = { key: string; label: string; tag: string; group: SymbolGroup; glyph: SymbolGlyph }
export const SYMBOLS: readonly SymbolDef[] = [
  { key: 'socket_13a', label: '13A socket (single)', tag: '1G', group: 'power', glyph: 'socket' },
  { key: 'socket_13a_double', label: '13A socket (double)', tag: '2G', group: 'power', glyph: 'socket-double' },
  { key: 'switch', label: 'Light switch', tag: 'S', group: 'power', glyph: 'switch' },
  { key: 'data_tv', label: 'Data / TV point', tag: 'TV', group: 'power', glyph: 'data' },
  { key: 'aircon_point', label: 'Aircon point', tag: 'AC', group: 'power', glyph: 'aircon' },
  { key: 'downlight', label: 'Downlight', tag: '', group: 'lighting', glyph: 'downlight' },
  { key: 'cove_light', label: 'Cove light', tag: 'CV', group: 'lighting', glyph: 'cove' },
  { key: 'pendant', label: 'Pendant drop', tag: 'P', group: 'lighting', glyph: 'pendant' },
  { key: 'water_point', label: 'Water point', tag: 'W', group: 'wet', glyph: 'water' },
  { key: 'floor_trap', label: 'Floor trap', tag: 'FT', group: 'wet', glyph: 'floor-trap' },
]
export const SYMBOL_GROUPS: readonly { key: SymbolGroup; label: string }[] = [
  { key: 'power', label: 'Power and data' }, { key: 'lighting', label: 'Lighting' }, { key: 'wet', label: 'Wet works' },
]
export const symbolOf = (key: unknown): SymbolDef | null => (typeof key === 'string' ? SYMBOLS.find((s) => s.key === key) ?? null : null)

/* ── Trade layers (1.0's LAYERS; `studio_only` is a RULE: stripped from the client's data on the server, refused on the client's write) ── */
export type LayerDef = { key: string; label: string; hint: string; studioOnly?: boolean }
export const DEFAULT_LAYER = 'general'
export const CLIENT_LAYER = 'client'
export const STUDIO_ONLY = 'studio_only'
export const LAYERS: readonly LayerDef[] = [
  { key: 'general', label: 'General', hint: '#5500FF' },
  { key: 'carpentry', label: 'Carpentry', hint: '#8B5A2B' },
  { key: 'electrical', label: 'Electrical', hint: '#F19E2B' },
  { key: 'plumbing', label: 'Plumbing and wet works', hint: '#4E5BB4' },
  { key: 'lighting', label: 'Lighting', hint: '#C9A227' },
  { key: 'tiling', label: 'Tiling and flooring', hint: '#469E59' },
  { key: 'client', label: 'Client requests', hint: '#DB382A' },
  { key: 'studio_only', label: 'Studio only', hint: '#666666', studioOnly: true },
]
export const isLayer = (v: unknown): v is string => typeof v === 'string' && LAYERS.some((l) => l.key === v)
export const layerOf = (key: string): LayerDef => LAYERS.find((l) => l.key === key) ?? LAYERS[0]!
export const isStudioOnly = (key: string) => layerOf(key).studioOnly === true

/* ── Colour and weight (1.0 F-195: the role's colour by default) ──────────────────────────────────────────────────────────── */
export const SIDE_COLOR: Record<Side, string> = { studio: '#5500FF', client: '#DB382A' }
export const SWATCHES: readonly { hex: string; label: string }[] = [
  { hex: '#5500FF', label: 'Purple' }, { hex: '#DB382A', label: 'Red' }, { hex: '#F19E2B', label: 'Orange' }, { hex: '#469E59', label: 'Green' },
  { hex: '#4E5BB4', label: 'Blue' }, { hex: '#1F1F1F', label: 'Black' },
]
export const WEIGHTS: readonly { key: 1 | 2 | 3; label: string; px: number }[] = [{ key: 1, label: 'Thin', px: 2 }, { key: 2, label: 'Medium', px: 3 }, { key: 3, label: 'Thick', px: 5 }]
export const weightPx = (w: unknown) => WEIGHTS.find((x) => x.key === w)?.px ?? 3
const HEX = /^#[0-9a-fA-F]{6}$/

/* ── A mark's shape ─────────────────────────────────────────────────────────────────────────────────────────────────────────── */
export type MarkShape = {
  points: Pt[]
  color?: string
  weight?: 1 | 2 | 3
  dashed?: boolean
  /** a text mark's words, a pin's or a callout's first words, a photo pin's caption */
  text?: string
  symbol?: string
  pattern?: HatchKey
  /** a photo pin's pictures: lead_files ids in Files › Floor plans */
  photos?: string[]
  /** the day the photos were taken, yyyy-mm-dd (the site diary sorts by it) */
  takenOn?: string
}
export const TEXT_MAX = 280
export const COMMENT_MAX = 1000
export const PHOTOS_MAX = 5
export const NOTE_MAX = 500
export const NAME_MAX = 80

const round = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 10000) / 10000
/** Keeps every Nth point of a long stroke, its last point always. */
function thin(points: Pt[], max: number): Pt[] {
  if (points.length <= max) return points
  const step = points.length / max
  const out: Pt[] = []
  for (let i = 0; i < max - 1; i++) out.push(points[Math.floor(i * step)]!)
  out.push(points[points.length - 1]!)
  return out
}

/**
 * The server's check of a shape before it is kept (1.0's `validateAnnotationShape`, and more): a known tool, points that are numbers, enough of
 * them, a known stamp, words on a text mark, a known zone, a photo on a photo pin, a colour that is a hex literal (it is written into an SVG
 * attribute). Answers the clean shape to keep, or the refusal's words.
 */
export function cleanShape(tool: unknown, raw: unknown): { shape: MarkShape } | { error: string } {
  if (!isMarkTool(tool)) return { error: 'That isn’t a mark the floor plan knows' }
  const s = (raw ?? {}) as Record<string, unknown>
  const pts = Array.isArray(s.points) ? s.points : []
  if (!pts.every((p) => !!p && typeof p === 'object' && Number.isFinite((p as Pt).x) && Number.isFinite((p as Pt).y))) return { error: 'The mark’s points didn’t read — draw it again' }
  let points = (pts as Pt[]).map((p) => ({ x: round(p.x), y: round(p.y) }))
  if (points.length < MIN_POINTS[tool]) return { error: 'Drag a little further to draw it' }
  points = tool === 'pen' ? thin(points, PEN_MAX_POINTS) : points.slice(0, MIN_POINTS[tool] === 1 ? 1 : 2)
  const shape: MarkShape = { points }
  if (s.color !== undefined) { if (typeof s.color !== 'string' || !HEX.test(s.color)) return { error: 'That colour isn’t one the floor plan knows' }; shape.color = s.color.toUpperCase() }
  if (s.weight !== undefined) { if (s.weight !== 1 && s.weight !== 2 && s.weight !== 3) return { error: 'That thickness isn’t one the floor plan knows' }; shape.weight = s.weight }
  if (s.dashed === true) shape.dashed = true
  const text = typeof s.text === 'string' ? s.text.replace(/\s+/g, ' ').trim().slice(0, TEXT_MAX) : ''
  if (text) shape.text = text
  if (tool === 'text' && !text) return { error: 'Write the label first' }
  if (tool === 'symbol') { if (!symbolOf(s.symbol)) return { error: 'Pick a stamp first' }; shape.symbol = s.symbol as string }
  if (tool === 'hatch') shape.pattern = isHatch(s.pattern) ? s.pattern : 'diagonal'
  if (tool === 'photo') {
    const photos = Array.isArray(s.photos) ? [...new Set(s.photos.filter((x): x is string => typeof x === 'string' && x.length > 0 && x.length < 80))].slice(0, PHOTOS_MAX) : []
    if (!photos.length) return { error: 'Add a photo to the pin first' }
    shape.photos = photos
    if (s.takenOn !== undefined) {
      if (typeof s.takenOn !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s.takenOn) || Number.isNaN(Date.parse(s.takenOn))) return { error: 'The photos’ day didn’t read' }
      shape.takenOn = s.takenOn
    }
  }
  return { shape }
}

/** A shape moved by (dx, dy), kept on the picture — the whole mark travels. */
export function movedShape(shape: MarkShape, dx: number, dy: number): MarkShape {
  const xs = shape.points.map((p) => p.x), ys = shape.points.map((p) => p.y)
  const cx = Math.min(Math.max(dx, -Math.min(...xs)), 1 - Math.max(...xs))
  const cy = Math.min(Math.max(dy, -Math.min(...ys)), 1 - Math.max(...ys))
  return { ...shape, points: shape.points.map((p) => ({ x: round(p.x + cx), y: round(p.y + cy) })) }
}

/* ── The plan's scale (1.0's floor-plan-scale.ts: millimetres per picture pixel) ─────────────────────────────────────────────── */
export function pixelLength(a: Pt, b: Pt, w: number, h: number): number { return Math.hypot((b.x - a.x) * w, (b.y - a.y) * h) }
/** What one known length teaches the plan; null when it can't. */
export function scaleFrom(a: Pt, b: Pt, mm: number, w: number, h: number): number | null {
  if (!Number.isFinite(mm) || mm <= 0 || !w || !h) return null
  const px = pixelLength(a, b, w, h)
  return px > 2 ? mm / px : null
}
export function measureMm(a: Pt, b: Pt, scale: number | null | undefined, w: number, h: number): number | null {
  if (!scale || scale <= 0) return null
  return pixelLength(a, b, w, h) * scale
}
/** "850 mm" under a metre, "3.60 m" above; null → "Set the scale". */
export function formatMm(mm: number | null): string {
  if (mm === null || !Number.isFinite(mm)) return 'Set the scale'
  return Math.abs(mm) < 1000 ? `${Math.round(mm)} mm` : `${(mm / 1000).toFixed(2)} m`
}
/** "900", "900mm", "0.9m", "90 cm", "3,600" → millimetres; a bare small decimal ("3.6") is metres (1.0's rule). Null when it doesn't read. */
export function parseLengthMm(input: string): number | null {
  const raw = input.trim().toLowerCase().replace(/,/g, '')
  const m = /^(\d+(?:\.\d+)?)\s*(mm|cm|m)?$/.exec(raw)
  if (!m) return null
  const v = parseFloat(m[1]!)
  if (!Number.isFinite(v) || v <= 0) return null
  if (m[2] === 'mm') return v
  if (m[2] === 'cm') return v * 10
  if (m[2] === 'm') return v * 1000
  return !Number.isInteger(v) && v < 100 ? v * 1000 : v
}
/** The echo under the length box: "Reading that as 900 mm." */
export const lengthEcho = (input: string) => { const mm = parseLengthMm(input); return mm === null ? null : `Reading that as ${formatMm(mm)}` }

/* ── What both sides read ───────────────────────────────────────────────────────────────────────────────────────────────────── */
export type CommentView = { id: string; body: string; photos: { id: string; src: string }[]; side: Side; author: string; mine: boolean; at: number }
export type MarkView = {
  id: string; tool: MarkTool; shape: MarkShape; layer: string; side: Side; author: string; mine: boolean
  status: 'open' | 'resolved'; resolvedAt: number | null; resolvedBy: string | null
  /** the photo pin's pictures, with their addresses */
  photos: { id: string; src: string }[]
  task: { id: string; title: string; done: boolean } | null
  variation: { id: string; number: string; status: string } | null
  comments: CommentView[]
  at: number; updatedAt: number
}
export type ConfirmView = { id: string; planId: string; name: string; at: number; note: string | null; changedSince: boolean }
export type PlanView = {
  id: string; name: string; isMain: boolean; width: number; height: number; picture: string
  /** the original's address (a PDF opens in the browser) and its kind */
  original: { href: string; kind: string; name: string } | null
  scale: number | null; addedBy: string | null; addedSide: Side; at: number; marks: number
}

/** Pins numbered 1, 2… and callouts C1, C2… in the order they were made — the plan, the cards and the legend say the same number (1.0's
    `buildLegend`). A pin on Studio only is S1, S2…, so the numbers the client reads are the studio's too. Deleted marks are not here, so the
    numbers close up. */
export function numberMarks(marks: readonly Pick<MarkView, 'id' | 'tool' | 'at' | 'layer'>[]): Map<string, string> {
  const out = new Map<string, string>()
  let pin = 0, callout = 0, own = 0
  for (const m of [...marks].sort((a, b) => a.at - b.at)) {
    if (m.tool === 'pin' || m.tool === 'photo') out.set(m.id, isStudioOnly(m.layer) ? `S${++own}` : String(++pin))
    else if (m.tool === 'callout') out.set(m.id, `C${++callout}`)
  }
  return out
}

/** A mark's name on its card and in the legend: "Pin 3", "Callout C2", "13A socket (single)", "Zone · Cross-hatch", "Measurement · 2.40 m". */
export function markName(m: Pick<MarkView, 'tool' | 'shape'>, num: string | undefined, plan?: { scale: number | null; width: number; height: number }): string {
  if (m.tool === 'pin') return `Pin ${num ?? ''}`.trim()
  if (m.tool === 'photo') return `Site photo ${num ?? ''}`.trim()
  if (m.tool === 'callout') return `Callout ${num ?? ''}`.trim()
  if (m.tool === 'symbol') return symbolOf(m.shape.symbol)?.label ?? 'Stamp'
  if (m.tool === 'hatch') return `Zone · ${HATCHES.find((h) => h.key === m.shape.pattern)?.label ?? 'Diagonal'}`
  if (m.tool === 'dimension' && plan && m.shape.points.length >= 2) return `Measurement · ${formatMm(measureMm(m.shape.points[0]!, m.shape.points[1]!, plan.scale, plan.width, plan.height))}`
  return TOOL_LABEL[m.tool]
}

/* ── The rail's filter (1.0 F-202) ──────────────────────────────────────────────────────────────────────────────────────────── */
export type Who = 'both' | 'studio' | 'client'
export type MarkFilter = { who: Who; resolved: boolean; hidden: readonly string[] }
export const ALL_MARKS: MarkFilter = { who: 'both', resolved: true, hidden: [] }
export function filterMarks<M extends Pick<MarkView, 'side' | 'status' | 'layer'>>(marks: readonly M[], f: MarkFilter): M[] {
  return marks.filter((m) => (f.who === 'both' || m.side === f.who) && (f.resolved || m.status !== 'resolved') && !f.hidden.includes(m.layer))
}
/** Marks per layer, in the catalogue's order (chips that reshuffle as marks arrive are unusable — 1.0's `tallyLayers`). */
export function layerCounts(marks: readonly Pick<MarkView, 'layer'>[]): Map<string, number> {
  const out = new Map<string, number>()
  for (const m of marks) out.set(m.layer, (out.get(m.layer) ?? 0) + 1)
  return out
}

/* ── Points and the site diary (1.0 F-203 · F-204) ─────────────────────────────────────────────────────────────────────────── */
export type PointRow = { group: SymbolGroup; label: string; rows: { def: SymbolDef; count: number }[]; total: number }
/** Stamps counted per symbol, resolved included (a resolved socket is still a socket to wire), in the catalogue's groups. */
export function pointSchedule(marks: readonly Pick<MarkView, 'tool' | 'shape'>[]): { groups: PointRow[]; total: number } {
  const counts = new Map<string, number>()
  for (const m of marks) if (m.tool === 'symbol' && m.shape.symbol && symbolOf(m.shape.symbol)) counts.set(m.shape.symbol, (counts.get(m.shape.symbol) ?? 0) + 1)
  const groups = SYMBOL_GROUPS.map((g) => {
    const rows = SYMBOLS.filter((s) => s.group === g.key && counts.has(s.key)).map((def) => ({ def, count: counts.get(def.key)! }))
    return { group: g.key, label: g.label, rows, total: rows.reduce((n, r) => n + r.count, 0) }
  }).filter((g) => g.rows.length)
  return { groups, total: groups.reduce((n, g) => n + g.total, 0) }
}
export type DiaryDay = { day: string; marks: { id: string; num: string | undefined; text: string | null; author: string; photos: { id: string; src: string }[] }[]; photos: number }
/** Photo pins grouped by the day the photos were taken (else the day the pin was made), newest day first. */
export function siteDiary(marks: readonly MarkView[], nums: Map<string, string>, dayOf: (at: number) => string): DiaryDay[] {
  const by = new Map<string, DiaryDay>()
  for (const m of marks) {
    if (m.tool !== 'photo' || !m.photos.length) continue
    const day = m.shape.takenOn ?? dayOf(m.at)
    const d = by.get(day) ?? { day, marks: [], photos: 0 }
    d.marks.push({ id: m.id, num: nums.get(m.id), text: m.shape.text ?? null, author: m.author, photos: m.photos })
    d.photos += m.photos.length
    by.set(day, d)
  }
  return [...by.values()].sort((a, b) => (a.day < b.day ? 1 : -1))
}
/** Today in the viewer's own time, yyyy-mm-dd — a photo pin's day. */
export function isoDay(at: number): string {
  const d = new Date(at)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/* ── Words both sides share ────────────────────────────────────────────────────────────────────────────────────────────────── */
export const SIDE_LABEL: Record<Side, string> = { studio: 'Studio', client: 'Client' }
/** (G-Q11) The studio's line under a confirmation — what kind of record it is. */
export const CONFIRM_NATURE = 'Confirmed in the portal, signed in with their phone and a one-time code — not a contract-grade signature'
/** The task a mark becomes (1.0 F-217: the mark's words, else "Floor plan: follow up on {mark}"). */
export function taskTitleOf(m: Pick<MarkView, 'tool' | 'shape' | 'comments'>, name: string): string {
  const words = (m.shape.text ?? m.comments[0]?.body ?? '').replace(/\s+/g, ' ').trim()
  return (words ? words : `Floor plan: follow up on ${name.toLowerCase()}`).slice(0, 120)
}
/** The plan's name when none was typed: the file's name without its ending. */
/** A picked file's name as a plan's name. (S42 D-15) A device's slug — "floor-plan-photo-waterway-sunrise.jpg" — reads as words: hyphens and
    underscores become spaces and an all-lowercase slug takes a capital ("Floor plan photo waterway sunrise"); a name typed with spaces stays
    as typed. */
export const planNameOf = (fileName: string) => {
  let base = fileName.replace(/\.[a-z0-9]{2,5}$/i, '').trim()
  if (/[-_]/.test(base) && !/\s/.test(base)) { base = base.replace(/[-_]+/g, ' ').trim(); if (base === base.toLowerCase()) base = base.charAt(0).toUpperCase() + base.slice(1) }
  return base.replace(/\s+/g, ' ').slice(0, NAME_MAX) || 'Floor plan'
}
/** The long edge a plan's picture is drawn at (1.0's 2400). */
export const PLAN_EDGE = 2400
/** The picture's size limit, in characters of its data URL. */
export const PICTURE_MAX = 6_000_000
/** The studio's 15-minute quiet window per plan for the client's marks and comments (1.0's floor-plan-notify-window). */
export const QUIET_MINUTES = 15
