'use client'

import { useMemo, useRef, useState } from 'react'
import { Button, Switch } from '@/components/ds'
import { Chips } from '@/components/om/chips'
import { Drawer } from '@/components/om/drawer'
import { Icon } from '@/components/om/icon'
import { useSnackbar } from '@/components/om/snackbar'
import type { LibraryMaterial } from '@/lib/visualizer/materials'
import { elevationOf, firstWallOf, referenceLinesOf, referenceText } from '@/lib/planner/elevation'
import { pieceLook } from '@/lib/planner/look'
import { SIDES, SIDE_LABEL, lengthText, type Piece, type Room, type Side } from '@/lib/planner/model'
import { downloadDataUrl, svgToPng } from '../svg-png'
import styles from './elevation-panel.module.css'

const WIDE = 432   // the drawing's width in the drawer (480 less its 24 padding each side)
const LABEL_PX = 74   // (pending modules S15) the reference heights' words to the right of the wall: 68 px of words + a 6 px gap

/**
 * (parity map, TD-091 — 1.0's Room · Kitchen · Wardrobe elevations, as one drawing) A room's walls as you face them from inside, one at a
 * time: the wall to scale with the room's ceiling, its doors and windows, and the pieces against it with their widths and heights — a
 * kitchen's counter run, a bedroom's wardrobe wall are the same drawing. The house side panel (a sheet on a phone); Download PNG saves the
 * wall on screen. Read-only — the pieces move on the Top view.
 *
 * (pending modules S15 — card held:space-planner, "Elevations' reference lines (counter, cabinets, sockets) · revisit: cheap and useful for
 * briefing carpenters") 1.0's reference heights drawn across a standing wall as dashed lines in the primary colour (1.0's accent), their words
 * to the right of the wall — a kitchen's counter top and upper cabinets, a bathroom's mirror, every other wall's switches and sockets
 * (`referenceLinesOf`); *Show the usual heights* takes them away (a clean picture for a client) and the PNG carries what is on screen. The
 * panel opens on the wall the room's built-ins stand against (1.0's Kitchen / Wardrobe Elevation presets, `firstWallOf`), and the list
 * under the drawing walks the wall left to right with its doors and windows too — a window's height off the floor is what a counter or a
 * wardrobe works around. *(invented copy: the switch, the legend's sentence, the short words beside the lines, the doors' and windows' rows)*
 */
export function ElevationPanel({ room, pieces, library, layoutName, onClose }: {
  room: Room | null; pieces: Piece[]; library: LibraryMaterial[]; layoutName: string; onClose: () => void
}) {
  const snackbar = useSnackbar()
  const [side, setSide] = useState<Side>(() => (room ? firstWallOf(room, pieces) : 'n'))
  const [seen, setSeen] = useState(room?.id ?? null)
  if ((room?.id ?? null) !== seen) { setSeen(room?.id ?? null); if (room) setSide(firstWallOf(room, pieces)) }   // another room: its own wall (render-phase adjust)
  const [heights, setHeights] = useState(true)
  const e = useMemo(() => (room ? elevationOf(room, side, pieces) : null), [room, side, pieces])
  const refs = useMemo(() => (room && e ? referenceLinesOf(room, e) : []), [room, e])
  const shown = useMemo(() => (heights ? refs : []), [heights, refs])
  const svg = useRef<SVGSVGElement>(null)
  const download = async () => {
    const url = await svgToPng(svg.current)
    if (!url || !room || !e) { snackbar({ message: 'Couldn’t draw the picture — please try again', key: 'planner-elevation-png' }); return }
    downloadDataUrl(url, `${layoutName} — ${room.name}, ${e.wallName.toLowerCase()}`)
    snackbar({ message: `${room.name}’s ${e.wallName.toLowerCase()} downloaded`, key: 'planner-elevation-png' })   // (S15) a second download replaces the first's line in place
  }
  const m = 40, top = 30, bottom = 46
  /* the words beside the lines take LABEL_PX of the drawing's width, whatever the wall's length: solve for the width in centimetres */
  const vw = e ? (e.length + m * 2) / (shown.length ? 1 - LABEL_PX / WIDE : 1) : 100, vh = e ? e.height + top + bottom : 100
  const unit = vw / WIDE   // centimetres per screen pixel — the words keep their size
  const y = (cm: number) => (e ? top + e.height - cm : 0)
  /* the words beside the lines: each at its line (a band's at its middle, on two lines), nudged down so none sits on another */
  const words = useMemo(() => {
    const out: { key: string; at: number; lines: string[] }[] = []
    let last = -Infinity
    for (const l of shown) {   // top first
      const lines = l.y1 > l.y0 ? [l.short, `${l.y0}–${l.y1}`] : [`${l.short} ${l.y0}`]
      const half = (lines.length * 12) / 2
      let at = (top + (e?.height ?? 0) - (l.y0 + l.y1) / 2) / unit   // its centre, in screen pixels from the drawing's top
      if (at - half < last + 2) at = last + 2 + half
      last = at + half
      out.push({ key: l.key, at, lines })
    }
    return out
  }, [shown, e, unit])
  const rows = e ? [
    ...e.openings.map((o) => ({ id: o.id, a0: o.a0, name: o.kind === 'door' ? 'Door' : 'Window', sub: o.kind === 'door' ? `${Math.round(o.a1 - o.a0)} wide · ${Math.round(o.y1 - o.y0)} high` : `${Math.round(o.a1 - o.a0)} wide · ${Math.round(o.y1 - o.y0)} high · ${Math.round(o.y0)} off the floor` })),
    ...e.pieces.map((p) => ({ id: p.id, a0: p.a0, name: p.name, sub: `${Math.round(p.a1 - p.a0)} wide · ${Math.round(p.y1 - p.y0)} high${p.y0 > 0 ? ` · ${Math.round(p.y0)} off the floor` : ''}${p.gap > 2 ? ` · ${p.gap} cm from the wall` : ''}` })),
  ].sort((a, b) => a.a0 - b.a0) : []
  return (
    <Drawer open={!!room} onClose={onClose} title={room ? `${room.name} · wall elevations` : 'Wall elevations'} width="wide"
            footer={<Button variant="secondary" appearance="outlined" onPress={() => { void download() }} iconStart={<Icon name="download" size={20} weight={300} />} data-testid="planner-elevation-png">Download PNG</Button>}>
      {room && e ? (
        <div className={styles.body} data-testid="planner-elevation" data-side={side}>
          <Chips label="Wall" options={SIDES.map((s) => ({ value: s, label: `${SIDE_LABEL[s]}${room.walls[s] ? '' : ' (open)'}` }))} value={side} onChange={(v) => setSide(v as Side)} testId="planner-elevation-wall" />
          {/* (S42 D-18) an open side has no wall — its words say so */}
          <p className={styles.line}>{room.walls[side] ? `Facing the ${SIDE_LABEL[side].toLowerCase()} wall from inside the room · ${lengthText(e.length)} long · ceiling ${lengthText(e.height)}` : `Facing the open ${SIDE_LABEL[side].toLowerCase()} side from inside the room · ${lengthText(e.length)} long · ceiling ${lengthText(e.height)}`}</p>
          {refs.length ? (
            <label className={styles.switchRow} data-testid="planner-elevation-heights">
              <Switch size="sm" isSelected={heights} onChange={(v: boolean) => setHeights(v)} aria-label="Show the usual heights" />
              <span>Show the usual heights</span>
            </label>
          ) : null}
          <svg ref={svg} className={styles.svg} viewBox={`0 0 ${vw} ${vh}`} role="img" aria-label={`${room.name}, ${e.wallName.toLowerCase()} — elevation${shown.length ? `, with ${shown.map((l) => `${l.label.toLowerCase()} at ${referenceText(l)}`).join(', ')}` : ''}`} data-testid="planner-elevation-drawing">
            {/* the wall: its face, the floor line, the ceiling line (dashed when the side is open) */}
            <rect x={m} y={top} width={e.length} height={e.height} className={e.standing ? styles.wall : styles.open} strokeWidth={1.5 * unit} strokeDasharray={e.standing ? undefined : `${6 * unit} ${4 * unit}`} />
            {/* (S15) the upper cabinets' band behind everything — doors, windows and pieces are drawn over it */}
            {shown.filter((l) => l.y1 > l.y0).map((l) => <rect key={`band-${l.key}`} x={m} y={y(l.y1)} width={e.length} height={l.y1 - l.y0} className={styles.band} />)}
            {/* (S15) the reference heights: dashed across the wall under the doors, windows and pieces (1.0's order — a piece's words stay clear; its wash lets the line show through) */}
            {shown.map((l) => (
              <g key={l.key} data-ref={l.key} data-height={l.y1 > l.y0 ? `${l.y0}-${l.y1}` : String(l.y0)} className={styles.ref}>
                {(l.y1 > l.y0 ? [l.y0, l.y1] : [l.y0]).map((h) => <line key={h} x1={m} y1={y(h)} x2={m + e.length} y2={y(h)} strokeWidth={1 * unit} strokeDasharray={`${6 * unit} ${3 * unit}`} />)}
              </g>
            ))}
            {e.openings.map((o) => (
              <g key={o.id} className={o.kind === 'door' ? styles.door : styles.window}>
                <rect x={m + o.a0} y={y(o.y1)} width={o.a1 - o.a0} height={o.y1 - o.y0} strokeWidth={1.2 * unit} />
                {o.kind === 'window' ? <line x1={m + (o.a0 + o.a1) / 2} y1={y(o.y1)} x2={m + (o.a0 + o.a1) / 2} y2={y(o.y0)} strokeWidth={1 * unit} /> : null}
              </g>
            ))}
            {e.pieces.map((p) => {
              const fill = pieceLook({ key: p.key, color: pieces.find((q) => q.id === p.id)?.color ?? null, finish: pieces.find((q) => q.id === p.id)?.finish ?? null }, library).hex
              const w = p.a1 - p.a0, h = p.y1 - p.y0
              return (
                <g key={p.id} data-piece={p.key}>
                  <rect x={m + p.a0} y={y(p.y1)} width={w} height={h} fill={fill} className={styles.piece} strokeWidth={1.2 * unit} />
                  {w / unit > 54 && h / unit > 30 ? (
                    <g transform={`translate(${m + p.a0 + w / 2} ${y(p.y1) + h / 2}) scale(${unit})`} className={styles.label}>
                      <text textAnchor="middle" y={-2} className={styles.name}>{p.name.length > Math.floor(w / unit / 6.5) ? `${p.name.slice(0, Math.max(3, Math.floor(w / unit / 6.5) - 1))}…` : p.name}</text>
                      <text textAnchor="middle" y={12} className={styles.size}>{`${Math.round(w)} × ${Math.round(h)}`}</text>
                    </g>
                  ) : null}
                </g>
              )
            })}
            {words.map((w) => (
              <g key={`w-${w.key}`} transform={`translate(${m + e.length + 6 * unit} ${w.at * unit}) scale(${unit})`} className={styles.refWords} data-ref-words={w.key}>
                {w.lines.map((t, i) => <text key={t} y={3.5 - ((w.lines.length - 1) * 12) / 2 + i * 12} className={styles.refText}>{t}</text>)}
              </g>
            ))}
            {/* the floor */}
            <line x1={m - 12 * unit} y1={y(0)} x2={m + e.length + 12 * unit} y2={y(0)} className={styles.floor} strokeWidth={2 * unit} />
            {/* the wall's length under it, the ceiling's height beside it */}
            <g className={styles.dims}>
              <line x1={m} y1={y(0) + 22 * unit} x2={m + e.length} y2={y(0) + 22 * unit} strokeWidth={1 * unit} />
              <line x1={m} y1={y(0) + 16 * unit} x2={m} y2={y(0) + 28 * unit} strokeWidth={1 * unit} /><line x1={m + e.length} y1={y(0) + 16 * unit} x2={m + e.length} y2={y(0) + 28 * unit} strokeWidth={1 * unit} />
              <g transform={`translate(${m + e.length / 2} ${y(0) + 38 * unit}) scale(${unit})`}><text textAnchor="middle" className={styles.dimText}>{lengthText(e.length)}</text></g>
              <g transform={`translate(${m - 14 * unit} ${top + e.height / 2}) rotate(-90) scale(${unit})`}><text textAnchor="middle" className={styles.dimText}>{lengthText(e.height)}</text></g>
            </g>
          </svg>
          {shown.length ? (
            <p className={styles.line} data-testid="planner-elevation-legend">{`Dashed: the usual heights to work to — ${shown.map((l) => `${l.label.toLowerCase()} ${referenceText(l)}`).join(', ')}. Check them on site.`}</p>
          ) : null}
          {rows.length ? (
            <ul className={styles.list} aria-label="Along this wall, left to right" data-testid="planner-elevation-list">
              {rows.map((r) => (
                <li key={r.id} className={styles.row}><span>{r.name}</span><span className={styles.rowSub}>{r.sub}</span></li>
              ))}
            </ul>
          ) : null}
          {!e.pieces.length ? <p className={styles.line}>{room.walls[side] ? 'Nothing stands against this wall yet — pieces within 45 cm of it show here.' : 'An open side — nothing to draw against. Pieces within 45 cm of it show here.'}</p> : null}
        </div>
      ) : null}
    </Drawer>
  )
}
