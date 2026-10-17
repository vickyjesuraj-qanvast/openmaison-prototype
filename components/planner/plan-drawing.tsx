import type { ReactNode } from 'react'
import { catalogueItem, type Shape } from '@/lib/planner/catalogue'
import { floorLook, lightness, pieceLook } from '@/lib/planner/look'
import { OUTDOOR, WALL_T, areaText, openingSpan, planBounds, sideLine, sizeText, underlaySize, wallRuns, type Piece, type PlanDoc, type Room, type Side } from '@/lib/planner/model'
import type { LibraryMaterial } from '@/lib/visualizer/materials'
import styles from './plan-drawing.module.css'

/*
 * (gaps build J, J-Q9) A layout's top view as an SVG in centimetres — one drawing for every surface: the gallery's covers, the template
 * cards, the editor's Top view (which lays its handles over it through `children`), the paper and the client's Top. Floors in their
 * finish's colour, the walls merged (`wallRuns`), each door's gap and swing, each window's glazing, the pieces as their outlines. Words keep
 * their screen size at any zoom: they are drawn at the type token's size inside a `scale(unit)` (unit = centimetres per screen pixel), so the
 * type stays on the tokens. Rooms, pieces and openings carry `data-*` ids the editor's pointer reads.
 */

export type DrawingProps = {
  plan: Pick<PlanDoc, 'rooms' | 'pieces'> & { underlay?: PlanDoc['underlay'] }
  library?: LibraryMaterial[]
  /** 'none' (a cover) · 'names' · 'full' (names, sizes and areas) */ labels?: 'none' | 'names' | 'full'
  /** the overall dimensions outside the walls */ dims?: boolean
  /** centimetres per screen pixel — the words' and strokes' scale (a cover passes its own) */ unit?: number
  /** what the svg shows; default the plan's extent with a margin */ view?: { x: number; z: number; w: number; d: number }
  selectedRoom?: string | null
  selectedPiece?: string | null
  warn?: ReadonlySet<string>
  /** the studio's floor-plan picture under it (J-Q18) */ underlay?: boolean
  className?: string
  title?: string
  children?: ReactNode
  /** drawn first, under the floors (the editor's grid) */ beneath?: ReactNode
  /** the svg's own role (a cover is decorative) */ decorative?: boolean
  testId?: string
  /** (parity map, TD-081) the View menu's Furniture: off draws the rooms bare */ showPieces?: boolean
}

export function viewOf(plan: DrawingProps['plan'], margin = 80, withUnderlay = false) {
  const b = planBounds(plan, withUnderlay)
  return { x: b.x0 - margin, z: b.z0 - margin, w: b.x1 - b.x0 + margin * 2, d: b.z1 - b.z0 + margin * 2 }
}

export function PlanDrawing({ plan, library = [], labels = 'full', dims = false, unit = 1, view, selectedRoom = null, selectedPiece = null, warn, underlay = false, className, title, children, beneath, decorative = false, testId, showPieces = true }: DrawingProps) {
  const v = view ?? viewOf(plan, dims ? 120 : 60, underlay)
  const runs = wallRuns(plan.rooms)
  const u = underlay && plan.underlay?.visible ? plan.underlay : null
  const [uw, ud] = u ? underlaySize(u) : [0, 0]
  return (
    <svg className={`${styles.svg} ${className ?? ''}`} viewBox={`${v.x} ${v.z} ${v.w} ${v.d}`} preserveAspectRatio="xMidYMid meet"
         role={decorative ? undefined : 'img'} aria-hidden={decorative || undefined} aria-label={decorative ? undefined : title} data-testid={testId}>
      {beneath}
      {u ? <image href={u.url} x={u.x} y={u.z} width={uw} height={ud} opacity={u.opacity} preserveAspectRatio="none" data-underlay="" /> : null}
      {/* floors */}
      {plan.rooms.map((r) => {
        const f = floorLook(r, library)
        return <rect key={r.id} x={r.x} y={r.z} width={r.w} height={r.d} fill={f.hex} className={OUTDOOR.includes(r.kind) ? styles.outdoor : styles.floor} data-room-id={r.id} data-on={selectedRoom === r.id || undefined} />
      })}
      {/* pieces, under the walls' lines */}
      {showPieces ? plan.pieces.map((p) => <PieceGlyph key={p.id} p={p} library={library} on={selectedPiece === p.id} warn={!!warn?.has(p.id)} unit={unit} />) : null}
      {/* walls */}
      <g className={styles.walls}>
        {runs.map((run, i) => <WallRun key={i} run={run} />)}
      </g>
      {/* doors and windows */}
      {plan.rooms.flatMap((r) => r.openings.map((o) => <OpeningMark key={o.id} room={r} o={o} unit={unit} />))}
      {selectedRoom ? (() => { const r = plan.rooms.find((x) => x.id === selectedRoom); return r ? <rect x={r.x} y={r.z} width={r.w} height={r.d} className={styles.roomOn} strokeWidth={2.5 * unit} pointerEvents="none" /> : null })() : null}
      {labels !== 'none' ? plan.rooms.map((r) => <RoomLabel key={r.id} r={r} full={labels === 'full'} unit={unit} library={library} />) : null}
      {dims ? <Dimensions plan={plan} unit={unit} /> : null}
      {children}
    </svg>
  )
}

function WallRun({ run }: { run: ReturnType<typeof wallRuns>[number] }) {
  const h = WALL_T / 2
  const out: ReactNode[] = []
  for (const [s0, s1] of run.solid) {
    const cuts = run.cuts.filter((c) => c.a1 > s0 && c.a0 < s1).sort((a, b) => a.a0 - b.a0)
    let at = s0
    const seg = (a: number, b: number, k: string) => out.push(run.axis === 'h'
      ? <rect key={k} x={a - (a === s0 ? h : 0)} y={run.c - h} width={b - a + (a === s0 ? h : 0) + (b === s1 ? h : 0)} height={WALL_T} />
      : <rect key={k} x={run.c - h} y={a - (a === s0 ? h : 0)} width={WALL_T} height={b - a + (a === s0 ? h : 0) + (b === s1 ? h : 0)} />)
    cuts.forEach((c, i) => { const c0 = Math.max(s0, c.a0); if (c0 > at) seg(at, c0, `${s0}-${i}`); at = Math.max(at, Math.min(s1, c.a1)) })
    if (at < s1) seg(at, s1, `${s0}-end`)
  }
  return <>{out}</>
}

/** A door: the gap, its leaf open into the room and the arc of its swing. A window: the glazing across the wall's thickness. */
function OpeningMark({ room, o, unit }: { room: Room; o: Room['openings'][number]; unit: number }) {
  const [a0, a1] = openingSpan(room, o)
  const l = sideLine(room, o.side)
  const h = WALL_T / 2
  const pt = (a: number, off: number): [number, number] => (l.axis === 'h' ? [a, l.c + off] : [l.c + off, a])
  const inward: Record<Side, number> = { n: 1, s: -1, w: 1, e: -1 }
  const nrm = inward[o.side]
  if (o.kind === 'window') {
    const [x0, z0] = pt(a0, -h), [x1, z1] = pt(a1, h)
    const m1 = pt(a0, 0), m2 = pt(a1, 0)
    return (
      <g data-opening={o.id} data-room-id={room.id} className={styles.window}>
        <rect x={Math.min(x0, x1)} y={Math.min(z0, z1)} width={Math.abs(x1 - x0)} height={Math.abs(z1 - z0)} strokeWidth={1.2 * unit} />
        <line x1={m1[0]} y1={m1[1]} x2={m2[0]} y2={m2[1]} strokeWidth={1.2 * unit} />
      </g>
    )
  }
  const width = a1 - a0
  /* a wide opening (a balcony's, 1.4 m and more) slides: two panels in the wall's thickness, no swing */
  if (width >= 140) {
    const mid = (a0 + a1) / 2, ov = 8
    const [x1, z1] = pt(a0, -h / 2.5), [x2, z2] = pt(mid + ov, -h / 2.5), [x3, z3] = pt(mid - ov, h / 2.5), [x4, z4] = pt(a1, h / 2.5)
    return (
      <g data-opening={o.id} data-room-id={room.id} className={styles.door} data-sliding="">
        <line x1={x1} y1={z1} x2={x2} y2={z2} strokeWidth={2 * unit} />
        <line x1={x3} y1={z3} x2={x4} y2={z4} strokeWidth={2 * unit} />
      </g>
    )
  }
  const hinge = o.swing === 'right' ? a1 : a0, free = o.swing === 'right' ? a0 : a1
  const [hx, hz] = pt(hinge, nrm * h)
  const [ox, oz] = l.axis === 'h' ? [hx, hz + nrm * width] : [hx + nrm * width, hz]
  const [fx, fz] = pt(free, nrm * h)
  /* the arc turns from the free end to the leaf's tip; its sweep follows the side and the hinge */
  const cross = (fx - hx) * (oz - hz) - (fz - hz) * (ox - hx)
  return (
    <g data-opening={o.id} data-room-id={room.id} className={styles.door}>
      <line x1={hx} y1={hz} x2={ox} y2={oz} strokeWidth={2 * unit} />
      <path d={`M ${fx} ${fz} A ${width} ${width} 0 0 ${cross > 0 ? 1 : 0} ${ox} ${oz}`} strokeWidth={1 * unit} strokeDasharray={`${4 * unit} ${3 * unit}`} />
    </g>
  )
}

function RoomLabel({ r, full, unit, library }: { r: Room; full: boolean; unit: number; library: LibraryMaterial[] }) {
  /* a room too small for its words at this zoom keeps quiet (the Rooms panel names it): the name needs its width, the size line its own */
  const wide = r.w / unit, tall = r.d / unit
  if (tall < 34 || wide < r.name.length * 7.4 + 10) return null
  const line = `${sizeText(r.w, r.d)} · ${areaText(r.w * r.d)}`
  const sized = full && tall > 60 && wide >= line.length * 5.8 + 10
  const dark = lightness(floorLook(r, library).hex) < 0.45
  return (
    <g transform={`translate(${r.x + r.w / 2} ${r.z + r.d / 2}) scale(${unit})`} className={styles.label} data-dark={dark || undefined} pointerEvents="none">
      <text className={styles.name} textAnchor="middle" y={sized ? -4 : 4}>{r.name}</text>
      {sized ? <text className={styles.size} textAnchor="middle" y={12}>{line}</text> : null}
    </g>
  )
}

function Dimensions({ plan, unit }: { plan: DrawingProps['plan']; unit: number }) {
  if (!plan.rooms.length) return null
  const b = planBounds({ rooms: plan.rooms, pieces: [] })
  const gap = 50, tick = 8
  const top = b.z0 - gap, left = b.x0 - gap
  return (
    <g className={styles.dims}>
      <line x1={b.x0} y1={top} x2={b.x1} y2={top} strokeWidth={1 * unit} />
      <line x1={b.x0} y1={top - tick} x2={b.x0} y2={top + tick} strokeWidth={1 * unit} /><line x1={b.x1} y1={top - tick} x2={b.x1} y2={top + tick} strokeWidth={1 * unit} />
      <g transform={`translate(${(b.x0 + b.x1) / 2} ${top - 6 * unit}) scale(${unit})`}><text className={styles.dimText} textAnchor="middle">{`${((b.x1 - b.x0) / 100).toFixed(2)} m`}</text></g>
      <line x1={left} y1={b.z0} x2={left} y2={b.z1} strokeWidth={1 * unit} />
      <line x1={left - tick} y1={b.z0} x2={left + tick} y2={b.z0} strokeWidth={1 * unit} /><line x1={left - tick} y1={b.z1} x2={left + tick} y2={b.z1} strokeWidth={1 * unit} />
      <g transform={`translate(${left - 6 * unit} ${(b.z0 + b.z1) / 2}) rotate(-90) scale(${unit})`}><text className={styles.dimText} textAnchor="middle">{`${((b.z1 - b.z0) / 100).toFixed(2)} m`}</text></g>
    </g>
  )
}

/* ── the pieces' outlines ──────────────────────────────────────────────────────────────────────────────────────────────────────── */
export function PieceGlyph({ p, library = [], on = false, warn = false, unit = 1 }: { p: Piece; library?: LibraryMaterial[]; on?: boolean; warn?: boolean; unit?: number }) {
  const c = catalogueItem(p.key)
  const look = pieceLook(p, library)
  const sw = 1 * unit
  return (
    <g transform={`translate(${p.x} ${p.z}) rotate(${p.rot})`} className={styles.piece} data-piece-id={p.id} data-on={on || undefined} data-warn={warn || undefined}>
      <Outline shape={c?.shape ?? 'cabinet'} w={p.w} d={p.d} fill={look.hex} sw={sw} />
      {on || warn ? <rect x={-p.w / 2 - 3 * unit} y={-p.d / 2 - 3 * unit} width={p.w + 6 * unit} height={p.d + 6 * unit} className={warn ? styles.warnRing : styles.onRing} strokeWidth={2 * unit} fill="none" pointerEvents="none" /> : null}
    </g>
  )
}

function Outline({ shape, w, d, fill, sw }: { shape: Shape; w: number; d: number; fill: string; sw: number }) {
  const x = -w / 2, z = -d / 2
  const base = <rect x={x} y={z} width={w} height={d} fill={fill} className={styles.body} strokeWidth={sw} rx={Math.min(4, w / 10)} />
  const line = (x1: number, z1: number, x2: number, z2: number, k: string) => <line key={k} x1={x1} y1={z1} x2={x2} y2={z2} className={styles.detail} strokeWidth={sw} />
  const box = (bx: number, bz: number, bw: number, bd: number, k: string, r = 3) => <rect key={k} x={bx} y={bz} width={bw} height={bd} rx={r} className={styles.part} strokeWidth={sw} fill={fill} />
  switch (shape) {
    case 'sofa': case 'armchair': {
      const back = Math.min(22, d * 0.25), arm = Math.min(18, w * 0.12)
      const seats = shape === 'armchair' ? 1 : Math.max(2, Math.round((w - 2 * arm) / 65))
      const sw2 = (w - 2 * arm) / seats
      return <g>{base}{box(x, z, w, back, 'b')}{box(x, z, arm, d, 'l')}{box(x + w - arm, z, arm, d, 'r')}{Array.from({ length: seats - 1 }, (_, i) => line(x + arm + sw2 * (i + 1), z + back, x + arm + sw2 * (i + 1), z + d, `s${i}`))}</g>
    }
    case 'lsofa': {
      const back = 22, seat = Math.min(95, d * 0.5)
      const path = `M ${x} ${z} H ${x + w} V ${z + d} H ${x + w - seat} V ${z + seat} H ${x} Z`
      return <g><path d={path} fill={fill} className={styles.body} strokeWidth={sw} />{box(x, z, w, back, 'b')}{box(x + w - back, z, back, d, 'r')}{line(x + w - seat, z + back, x + w - seat, z + seat, 'c')}</g>
    }
    case 'diningSet': case 'roundSet': {
      const round = shape === 'roundSet'
      const tw = round ? Math.min(w, d) * 0.62 : w, td = round ? tw : d * 0.56
      const chairs: [number, number][] = round ? [[0, -1], [1, 0], [0, 1], [-1, 0]] : (() => {
        const per = Math.max(1, Math.round(w / 65)); const out: [number, number][] = []
        for (let i = 0; i < per; i++) { const cx = -w / 2 + (w / per) * (i + 0.5); out.push([cx, -1], [cx, 1]) }
        return out
      })()
      const cw = 42, cd = 40
      return (
        <g>
          {chairs.map(([a, b], i) => {
            if (!round) return <rect key={i} x={a - cw / 2} y={b < 0 ? -td / 2 - cd + 6 : td / 2 - 6} width={cw} height={cd} rx={6} className={styles.part} strokeWidth={sw} fill={fill} />
            /* round: one chair on each of the four sides, square to it */
            const r = tw / 2 + cd / 2 - 6, across = a !== 0
            return <rect key={i} x={a * r - (across ? cd : cw) / 2} y={b * r - (across ? cw : cd) / 2} width={across ? cd : cw} height={across ? cw : cd} rx={6} className={styles.part} strokeWidth={sw} fill={fill} />
          })}
          {round ? <circle r={tw / 2} fill={fill} className={styles.body} strokeWidth={sw} /> : <rect x={-tw / 2} y={-td / 2} width={tw} height={td} rx={3} fill={fill} className={styles.body} strokeWidth={sw} />}
        </g>
      )
    }
    case 'bed': {
      const head = 8, pil = Math.min(28, d * 0.14), fold = d * 0.38
      const two = w > 140
      return <g>{base}{box(x, z, w, head, 'h', 1)}{two ? [box(x + 8, z + head + 6, w / 2 - 12, pil, 'p1', 6), box(x + w / 2 + 4, z + head + 6, w / 2 - 12, pil, 'p2', 6)] : box(x + 8, z + head + 6, w - 16, pil, 'p', 6)}{line(x, z + fold, x + w, z + fold, 'f')}</g>
    }
    case 'wardrobe': case 'cabinet': case 'dresser': case 'tall': case 'counter': case 'shelf': {
      const doors = shape === 'wardrobe' ? Math.max(2, Math.round(w / 50)) : shape === 'counter' ? Math.max(1, Math.round(w / 60)) : 1
      return <g>{base}{Array.from({ length: doors - 1 }, (_, i) => line(x + (w / doors) * (i + 1), z, x + (w / doors) * (i + 1), z + d, `d${i}`))}{shape === 'shelf' ? line(x, z + d / 2, x + w, z + d / 2, 'm') : shape === 'tall' ? [line(x, z, x + w, z + d, 'x1'), line(x + w, z, x, z + d, 'x2')] : line(x, z + d - 6, x + w, z + d - 6, 'front')}</g>
    }
    case 'island': return <g>{base}{line(x + 6, z + 6, x + w - 6, z + 6, 't')}{line(x + 6, z + d - 6, x + w - 6, z + d - 6, 'b')}</g>
    case 'tv': return <g>{base}{box(x + w * 0.1, z - 2, w * 0.8, 6, 's', 1)}</g>
    case 'table': case 'lowTable': case 'desk': case 'bench': return <g>{base}<rect x={x + 6} y={z + 6} width={Math.max(0, w - 12)} height={Math.max(0, d - 12)} rx={2} className={styles.detail} strokeWidth={sw} fill="none" /></g>
    case 'chair': return <g>{base}{box(x, z, w, 8, 'b', 2)}</g>
    case 'officeChair': return <g><circle r={Math.min(w, d) / 2} fill={fill} className={styles.body} strokeWidth={sw} />{box(-w * 0.35, z, w * 0.7, 10, 'b', 3)}</g>
    case 'fridge': return <g>{base}{line(x, z + d - 8, x + w, z + d - 8, 'f')}{line(x + w * 0.15, z + d - 8, x + w * 0.15, z + d, 'h')}</g>
    case 'washer': return <g>{base}<circle r={Math.min(w, d) * 0.3} className={styles.detail} strokeWidth={sw} fill="none" /></g>
    case 'toilet': return <g>{box(x, z, w, d * 0.28, 't', 3)}<ellipse cx={0} cy={z + d * 0.28 + (d * 0.72) / 2} rx={w * 0.45} ry={(d * 0.72) / 2} fill={fill} className={styles.body} strokeWidth={sw} /></g>
    case 'vanity': return <g>{base}<ellipse cx={0} cy={0} rx={Math.min(w * 0.3, 22)} ry={Math.min(d * 0.3, 15)} className={styles.detail} strokeWidth={sw} fill="none" /></g>
    case 'shower': return <g>{base}{line(x, z, x + w, z + d, 'a')}{line(x + w, z, x, z + d, 'b')}<circle r={5} className={styles.detail} strokeWidth={sw} fill="none" /></g>
    case 'bath': return <g>{base}<rect x={x + 8} y={z + 8} width={w - 16} height={d - 16} rx={Math.min(30, d / 2 - 8)} className={styles.detail} strokeWidth={sw} fill="none" /></g>
    case 'rug': return <g><rect x={x} y={z} width={w} height={d} fill={fill} className={styles.rug} strokeWidth={sw} /><rect x={x + 8} y={z + 8} width={w - 16} height={d - 16} className={styles.detail} strokeWidth={sw} strokeDasharray={`${4 * sw} ${3 * sw}`} fill="none" /></g>
    case 'plant': return <g><circle r={Math.min(w, d) / 2} fill={fill} className={styles.body} strokeWidth={sw} />{[0, 72, 144, 216, 288].map((a) => <circle key={a} cx={Math.cos((a * Math.PI) / 180) * w * 0.2} cy={Math.sin((a * Math.PI) / 180) * d * 0.2} r={Math.min(w, d) * 0.16} className={styles.detail} strokeWidth={sw} fill="none" />)}</g>
    case 'lamp': return <g><circle r={Math.min(w, d) / 2} fill={fill} className={styles.body} strokeWidth={sw} /><circle r={Math.min(w, d) / 6} className={styles.detail} strokeWidth={sw} fill="none" /></g>
    case 'pendant': return <g><circle r={Math.min(w, d) / 2} className={styles.hanging} strokeWidth={sw} strokeDasharray={`${4 * sw} ${3 * sw}`} fill="none" /><circle r={4} className={styles.detail} strokeWidth={sw} fill="none" /></g>
    default: return base
  }
}
