'use client'

import { formatMm, measureMm, symbolOf, weightPx, SIDE_COLOR, type MarkShape, type MarkTool, type Pt, type Side, type SymbolGlyph } from '@/lib/projects/floor-plan-model'

/**
 * (gaps build G, G-Q4 · G-Q5) A mark drawn in SVG on the plan's own pixels (the viewBox is the picture's width × height; points are 0–1). `u` is
 * how many picture pixels make one screen pixel, so a pin, a stamp, a label and a line keep their size on screen at every zoom — and on the
 * printed page (export, G-Q13), where `u` is the picture's width over the page's. The canvas and the print draw through this one piece.
 * Zones are pattern-coded, not colour-coded (1.0: printed in mono for contractors); a resolved mark fades to 35 % (1.0 F-195).
 */
export type DrawMark = { id: string; tool: MarkTool; shape: MarkShape; side: Side; status?: 'open' | 'resolved' }
type Ctx = { w: number; h: number; u: number; num?: string; scale?: number | null; selected?: boolean; hit?: boolean; draft?: boolean }

const P = (p: Pt, c: Ctx) => ({ x: p.x * c.w, y: p.y * c.h })
const colorOf = (m: DrawMark) => m.shape.color ?? SIDE_COLOR[m.side]

/** The box two points span, in picture pixels. */
function box(a: Pt, b: Pt, c: Ctx) {
  const A = P(a, c), B = P(b, c)
  return { x: Math.min(A.x, B.x), y: Math.min(A.y, B.y), w: Math.abs(B.x - A.x), h: Math.abs(B.y - A.y) }
}
/** A revision cloud round a box: scallops of about 14 screen px along each side. */
function cloudPath(r: { x: number; y: number; w: number; h: number }, u: number): string {
  const step = 16 * u
  const pts: { x: number; y: number }[] = []
  const side = (x0: number, y0: number, x1: number, y1: number) => {
    const len = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.round(len / step))
    for (let i = 0; i < n; i++) pts.push({ x: x0 + ((x1 - x0) * i) / n, y: y0 + ((y1 - y0) * i) / n })
  }
  side(r.x, r.y, r.x + r.w, r.y); side(r.x + r.w, r.y, r.x + r.w, r.y + r.h); side(r.x + r.w, r.y + r.h, r.x, r.y + r.h); side(r.x, r.y + r.h, r.x, r.y)
  if (!pts.length) return ''
  let d = `M ${pts[0]!.x} ${pts[0]!.y}`
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]!, b = pts[(i + 1) % pts.length]!
    const rr = Math.max(2 * u, Math.hypot(b.x - a.x, b.y - a.y) / 2)
    d += ` A ${rr} ${rr} 0 0 1 ${b.x} ${b.y}`
  }
  return d
}

/** The patterns a zone fills with — one per mark, in its own colour. */
export function HatchDefs({ marks, u }: { marks: readonly DrawMark[]; u: number }) {
  const zones = marks.filter((m) => m.tool === 'hatch')
  if (!zones.length) return null
  return (
    <defs>
      {zones.map((m) => {
        const c = colorOf(m), s = 12 * u
        return (
          <pattern key={m.id} id={`hatch-${m.id}`} patternUnits="userSpaceOnUse" width={s} height={s} opacity={0.55}>
            {m.shape.pattern === 'dots' ? <circle cx={s / 2} cy={s / 2} r={1.4 * u} fill={c} />
              : m.shape.pattern === 'cross' ? <path d={`M0 0 L${s} ${s} M${s} 0 L0 ${s}`} stroke={c} strokeWidth={u} />
                : <path d={`M0 ${s} L${s} 0 M${-s / 4} ${s / 4} L${s / 4} ${-s / 4} M${s * 0.75} ${s * 1.25} L${s * 1.25} ${s * 0.75}`} stroke={c} strokeWidth={u} />}
          </pattern>
        )
      })}
    </defs>
  )
}

/** A stamp's glyph, centred on (x, y), about 22 screen px across. */
function Glyph({ g, tag, x, y, u, c }: { g: SymbolGlyph; tag: string; x: number; y: number; u: number; c: string }) {
  const r = 11 * u, sw = 1.6 * u
  const label = tag ? <text x={x} y={y} dy={3.6 * u} textAnchor="middle" fontSize={9.5 * u} fontWeight={700} fill={c}>{tag}</text> : null
  if (g === 'downlight') return <g><circle cx={x} cy={y} r={r * 0.8} fill="#fff" stroke={c} strokeWidth={sw} /><path d={`M${x - r * 0.55} ${y - r * 0.55} L${x + r * 0.55} ${y + r * 0.55} M${x + r * 0.55} ${y - r * 0.55} L${x - r * 0.55} ${y + r * 0.55}`} stroke={c} strokeWidth={sw} /></g>
  if (g === 'floor-trap') return <g><rect x={x - r} y={y - r} width={r * 2} height={r * 2} rx={2 * u} fill="#fff" stroke={c} strokeWidth={sw} />{label}</g>
  if (g === 'socket-double') return <g><rect x={x - r * 1.25} y={y - r * 0.85} width={r * 2.5} height={r * 1.7} rx={3 * u} fill="#fff" stroke={c} strokeWidth={sw} />{label}</g>
  if (g === 'switch') return <g><circle cx={x} cy={y} r={r * 0.85} fill="#fff" stroke={c} strokeWidth={sw} /><line x1={x + r * 0.6} y1={y - r * 0.6} x2={x + r * 1.2} y2={y - r * 1.2} stroke={c} strokeWidth={sw} />{label}</g>
  if (g === 'pendant') return <g><line x1={x} y1={y - r * 1.4} x2={x} y2={y - r * 0.8} stroke={c} strokeWidth={sw} /><circle cx={x} cy={y} r={r * 0.85} fill="#fff" stroke={c} strokeWidth={sw} />{label}</g>
  if (g === 'water') return <g><path d={`M${x} ${y - r} C ${x + r} ${y - r * 0.1}, ${x + r * 0.8} ${y + r}, ${x} ${y + r} C ${x - r * 0.8} ${y + r}, ${x - r} ${y - r * 0.1}, ${x} ${y - r} Z`} fill="#fff" stroke={c} strokeWidth={sw} />{label}</g>
  if (g === 'aircon' || g === 'cove') return <g><rect x={x - r * 1.2} y={y - r * 0.75} width={r * 2.4} height={r * 1.5} rx={r * 0.75} fill="#fff" stroke={c} strokeWidth={sw} />{label}</g>
  return <g><circle cx={x} cy={y} r={r} fill="#fff" stroke={c} strokeWidth={sw} />{label}</g>
}

/** One mark. `hit` adds a wide, invisible edge for the pointer (Select and Erase); `selected` rings it. */
export function MarkShapeSvg({ m, ctx }: { m: DrawMark; ctx: Ctx }) {
  const { u } = ctx
  const c = colorOf(m)
  const sw = weightPx(m.shape.weight) * u
  const dash = m.shape.dashed ? `${6 * u} ${4 * u}` : undefined
  const pts = m.shape.points
  const a = pts[0], b = pts[1] ?? pts[0]
  if (!a || !b) return null
  const A = P(a, ctx), B = P(b, ctx)
  const fade = m.status === 'resolved' ? 0.35 : 1
  const hitW = 18 * u
  const hitStroke = { stroke: 'transparent', strokeWidth: hitW, fill: 'none', pointerEvents: 'stroke' as const }
  let body: React.ReactNode = null, hit: React.ReactNode = null, bounds = { x: Math.min(A.x, B.x), y: Math.min(A.y, B.y), w: Math.abs(B.x - A.x), h: Math.abs(B.y - A.y) }

  if (m.tool === 'pen') {
    const d = pts.map((p) => { const q = P(p, ctx); return `${q.x},${q.y}` }).join(' ')
    body = <polyline points={d} fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={dash} />
    hit = <polyline points={d} {...hitStroke} strokeLinecap="round" strokeLinejoin="round" />
    const xs = pts.map((p) => p.x * ctx.w), ys = pts.map((p) => p.y * ctx.h)
    bounds = { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) }
  } else if (m.tool === 'rect' || m.tool === 'hatch' || m.tool === 'cloud') {
    const r = box(a, b, ctx)
    bounds = r
    if (m.tool === 'cloud') {
      const d = cloudPath(r, u)
      body = <path d={d} fill="none" stroke={c} strokeWidth={sw} strokeLinejoin="round" />
      hit = <path d={d} {...hitStroke} />
    } else {
      body = <rect x={r.x} y={r.y} width={r.w} height={r.h} fill={m.tool === 'hatch' ? `url(#hatch-${m.id})` : c} fillOpacity={m.tool === 'hatch' ? 1 : 0.06} stroke={c} strokeWidth={m.tool === 'hatch' ? Math.max(1, sw * 0.6) : sw} strokeDasharray={dash} />
      hit = m.tool === 'hatch' ? <rect x={r.x} y={r.y} width={r.w} height={r.h} fill="transparent" pointerEvents="all" /> : <rect x={r.x} y={r.y} width={r.w} height={r.h} {...hitStroke} />
    }
  } else if (m.tool === 'arrow') {
    const ang = Math.atan2(B.y - A.y, B.x - A.x), head = (10 + sw / u * 1.6) * u
    const h1 = { x: B.x - head * Math.cos(ang - 0.45), y: B.y - head * Math.sin(ang - 0.45) }, h2 = { x: B.x - head * Math.cos(ang + 0.45), y: B.y - head * Math.sin(ang + 0.45) }
    body = <g><line x1={A.x} y1={A.y} x2={B.x - (head * 0.6) * Math.cos(ang)} y2={B.y - (head * 0.6) * Math.sin(ang)} stroke={c} strokeWidth={sw} strokeLinecap="round" strokeDasharray={dash} /><polygon points={`${B.x},${B.y} ${h1.x},${h1.y} ${h2.x},${h2.y}`} fill={c} /></g>
    hit = <line x1={A.x} y1={A.y} x2={B.x} y2={B.y} {...hitStroke} />
  } else if (m.tool === 'dimension') {
    const ang = Math.atan2(B.y - A.y, B.x - A.x), t = 7 * u, nx = -Math.sin(ang) * t, ny = Math.cos(ang) * t
    const words = formatMm(measureMm(a, b, ctx.scale ?? null, ctx.w, ctx.h))
    const mid = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 }, fs = 11 * u, tw = (words.length * 6.4 + 12) * u
    body = (
      <g>
        <line x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke={c} strokeWidth={sw} />
        <line x1={A.x - nx} y1={A.y - ny} x2={A.x + nx} y2={A.y + ny} stroke={c} strokeWidth={sw} />
        <line x1={B.x - nx} y1={B.y - ny} x2={B.x + nx} y2={B.y + ny} stroke={c} strokeWidth={sw} />
        <rect x={mid.x - tw / 2} y={mid.y - fs} width={tw} height={fs * 1.8} rx={4 * u} fill="#fff" stroke={c} strokeWidth={u} />
        <text x={mid.x} y={mid.y} dy={fs * 0.35} textAnchor="middle" fontSize={fs} fontWeight={700} fill={c}>{words}</text>
      </g>
    )
    hit = <line x1={A.x} y1={A.y} x2={B.x} y2={B.y} {...hitStroke} />
  } else if (m.tool === 'callout') {
    const tag = ctx.num ?? 'C', fs = 11 * u, tw = (tag.length * 8.5 + 16) * u, th = 20 * u
    body = (
      <g>
        <line x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke={c} strokeWidth={sw} strokeDasharray={dash} />
        <circle cx={A.x} cy={A.y} r={3 * u} fill={c} />
        <rect x={B.x - tw / 2} y={B.y - th / 2} width={tw} height={th} rx={th / 2} fill={c} />
        <text x={B.x} y={B.y} dy={fs * 0.36} textAnchor="middle" fontSize={fs} fontWeight={700} fill="#fff">{tag}</text>
      </g>
    )
    hit = <g><line x1={A.x} y1={A.y} x2={B.x} y2={B.y} {...hitStroke} /><rect x={B.x - tw / 2 - 4 * u} y={B.y - th / 2 - 4 * u} width={tw + 8 * u} height={th + 8 * u} fill="transparent" pointerEvents="all" /></g>
  } else if (m.tool === 'text') {
    const fs = 14 * u, words = m.shape.text ?? ''
    const tw = Math.max(20, words.length * 7.4) * u
    body = <text x={A.x} y={A.y} dy={fs * 0.35} fontSize={fs} fontWeight={700} fill={c} stroke="#fff" strokeWidth={3 * u} paintOrder="stroke" strokeLinejoin="round">{words}</text>
    hit = <rect x={A.x - 4 * u} y={A.y - fs * 0.8} width={tw + 8 * u} height={fs * 1.6} fill="transparent" pointerEvents="all" />
    bounds = { x: A.x, y: A.y - fs * 0.6, w: tw, h: fs * 1.2 }
  } else if (m.tool === 'pin' || m.tool === 'photo') {
    const r = 12 * u, fs = 11 * u, tag = ctx.num ?? ''
    body = m.tool === 'pin'
      ? <g><circle cx={A.x} cy={A.y} r={r} fill={c} stroke="#fff" strokeWidth={2 * u} /><text x={A.x} y={A.y} dy={fs * 0.36} textAnchor="middle" fontSize={fs} fontWeight={700} fill="#fff">{tag}</text></g>
      : <g><rect x={A.x - r} y={A.y - r} width={r * 2} height={r * 2} rx={5 * u} fill={c} stroke="#fff" strokeWidth={2 * u} /><text x={A.x} y={A.y} dy={fs * 0.36} textAnchor="middle" fontSize={fs} fontWeight={700} fill="#fff">{tag}</text></g>
    hit = <circle cx={A.x} cy={A.y} r={r + 8 * u} fill="transparent" pointerEvents="all" />
    bounds = { x: A.x - r, y: A.y - r, w: r * 2, h: r * 2 }
  } else if (m.tool === 'symbol') {
    const def = symbolOf(m.shape.symbol)
    body = def ? <Glyph g={def.glyph} tag={def.tag} x={A.x} y={A.y} u={u} c={c} /> : null
    hit = <circle cx={A.x} cy={A.y} r={20 * u} fill="transparent" pointerEvents="all" />
    bounds = { x: A.x - 12 * u, y: A.y - 12 * u, w: 24 * u, h: 24 * u }
  }
  const pad = 6 * u
  return (
    <g data-mark={ctx.draft ? undefined : m.id} opacity={fade} data-tool={m.tool}>
      {body}
      {ctx.selected ? <rect x={bounds.x - pad} y={bounds.y - pad} width={bounds.w + pad * 2} height={bounds.h + pad * 2} rx={4 * u} fill="none" stroke="#5500FF" strokeWidth={2 * u} strokeDasharray={`${5 * u} ${3 * u}`} pointerEvents="none" /> : null}
      {ctx.hit ? hit : null}
    </g>
  )
}
