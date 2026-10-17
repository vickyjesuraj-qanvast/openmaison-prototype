'use client'

import { useMemo, useRef, useState, type CSSProperties } from 'react'
import { Button, Switch } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { CompareSlider } from '@/components/om/compare-slider'
import { CAMERA_MOVES, FRONT, RELIEF_MAX, RELIEF_MIN, poseFor, type MoveId } from '@/lib/visualizer/spatial/moves'
import { extendDepth, extendRoom } from '@/lib/visualizer/spatial/extend'
import { DepthView, type DepthViewHandle, type Margin } from './depth-view'
import { VIEW_COPY } from '@/lib/dev/ai-benches'
import { RoomBar } from './room-bar'
import { imgUrl, saveAs } from './pictures'
import type { useBenchRoom } from './use-bench-room'
import styles from './ai-bench.module.css'

/** The margin Fill the edges stands the room on: the photo and its depth, both extended 1.4× by mirroring (lib/visualizer/spatial/extend). */
export function useMargin(bench: ReturnType<typeof useBenchRoom>, on: boolean): Margin | null {
  const { read } = bench
  return useMemo(() => {
    if (!on || read?.status !== 'done' || !read.photo || !read.depth) return null
    const ext = extendRoom(read.photo, 1.4, 'mirror'), dep = extendDepth(read.depth.metres, read.depth.width, read.depth.height, 1.4)
    return { url: imgUrl(ext.img, 'image/jpeg'), metres: dep.metres, width: dep.width, height: dep.height, ox: dep.ox, oy: dep.oy }
  }, [on, read])
}

/** The Visualizer's slider (panels.module.css), for the room's relief. */
export function ReliefSlider({ value, onChange, id }: { value: number; onChange: (v: number) => void; id: string }) {
  const words = Math.abs(value - 1) < 0.05 ? 'As read' : value < 1 ? 'Flatter' : 'Deeper'
  return (
    <div className={styles.slider}>
      <label htmlFor={id}>Room depth</label><output htmlFor={id}>{words}</output>
      <input id={id} type="range" min={RELIEF_MIN} max={RELIEF_MAX} step={0.05} value={value} onChange={(e) => onChange(Number(e.target.value))} data-testid={`${id}-input`} />
    </div>
  )
}

/**
 * (pending modules S41 — 1.0's Spatial View › "Drag mesh" and "Angles", src/app/api/render/reangle) Look around: the photo's room in 3D,
 * drawn from its own pixels; Room depth, Trim edges (cut away what the photo never saw rather than stretch it) and Fill the edges (stand it on
 * the mirrored margin, so a turn meets more room). Camera moves: 1.0's six, each drawn from the same room — one press, free — and set against
 * the photo under the compare slider, the way 1.0 judged a model's drift. Download saves the still.
 */
export function LookSection({ bench }: { bench: ReturnType<typeof useBenchRoom> }) {
  const { room, read } = bench
  const view = useRef<DepthViewHandle>(null)
  const [relief, setRelief] = useState(1)
  const [trim, setTrim] = useState(true)
  const [fill, setFill] = useState(true)
  const [moved, setMoved] = useState(false)
  const [stills, setStills] = useState<{ key: string; front: string; shots: Partial<Record<MoveId, string>> } | null>(null)
  const [picked, setPicked] = useState<MoveId | null>(null)
  const margin = useMargin(bench, fill)
  const d = read?.status === 'done' ? read.depth ?? null : null
  const ratio = d ? d.width / d.height : 3 / 2
  const key = `${room.url}|${relief}|${trim}|${fill}`
  const shots = stills?.key === key ? stills : null
  const drawMoves = () => {
    const v = view.current; if (!v) return
    const front = v.capture(FRONT); if (!front) return
    const pivot = v.pivot(), out: Partial<Record<MoveId, string>> = {}
    for (const m of CAMERA_MOVES) { const s = v.capture(poseFor(m, pivot)); if (s) out[m.id] = s }
    setStills({ key, front, shots: out }); setPicked('orbit-left')
  }
  const sel = picked && shots ? CAMERA_MOVES.find((m) => m.id === picked) ?? null : null
  return (
    <section className={styles.card} data-testid="bench-look" aria-labelledby="bench-look-title">
      <div className={styles.cardHead}>
        <h2 id="bench-look-title" className={styles.cardTitle}>{VIEW_COPY.look.title}</h2>
        <p className={styles.cardHelp}>{VIEW_COPY.look.help}</p>
      </div>
      <RoomBar {...bench} testId="bench-look" />
      <div className={styles.row}>
        <ReliefSlider id="bench-look-relief" value={relief} onChange={setRelief} />
        <label className={styles.switchRow} data-testid="bench-look-trim"><Switch size="sm" isSelected={trim} onChange={setTrim} aria-label="Trim edges" />Trim edges</label>
        <label className={styles.switchRow} data-testid="bench-look-fill"><Switch size="sm" isSelected={fill} onChange={setFill} aria-label="Fill the edges" />Fill the edges</label>
        <span className={styles.rowEnd}>
          {/* 1.0's "describe a custom move": here the move is made by hand, then kept as a still */}
          <Button variant="secondary" appearance="text" iconStart={<Icon name="download" size={18} />} isDisabled={!d} onPress={() => { const s = view.current?.capture(); if (s) saveAs(s, `view-${room.key === 'upload' ? 'photo' : room.key}.jpg`) }} data-testid="bench-look-save">Download this view</Button>
          <Button variant="secondary" appearance="text" iconStart={<Icon name="restart_alt" size={18} />} isDisabled={!moved} onPress={() => view.current?.reset()} data-testid="bench-look-reset">Back to the photo</Button>
        </span>
      </div>
      {d ? (
        <DepthView ref={view} photo={room.url} depth={d} margin={margin} relief={relief} trim={trim} ratio={ratio} onMove={setMoved}
                   label={`${room.name} in 3D — drag or use the arrow keys to look around`} testId="bench-look-view" />
      ) : <div className={styles.stage} style={{ '--ratio': String(ratio) } as CSSProperties} aria-hidden />}

      <div className={styles.cardHead}>
        <h3 className={styles.cardTitle}>{VIEW_COPY.moves.title}</h3>
        <p className={styles.cardHelp}>{VIEW_COPY.moves.help}</p>
      </div>
      <div className={styles.row}>
        <Button variant="primary" appearance="filled" iconStart={<Icon name="view_in_ar" size={20} />} isDisabled={!d} onPress={drawMoves} data-testid="bench-moves-draw">{shots ? 'Draw them again' : 'Draw the six moves'}</Button>
        {sel && shots?.shots[sel.id] ? (
          <span className={styles.rowEnd}>
            <Button variant="secondary" appearance="outlined" iconStart={<Icon name="download" size={20} />} onPress={() => saveAs(shots.shots[sel.id]!, `${sel.id}-${room.key}.jpg`)} data-testid="bench-moves-download">Download this move</Button>
          </span>
        ) : null}
      </div>
      {shots ? (
        <>
          <div className={styles.moves} role="group" aria-label="Camera moves" data-testid="bench-moves">
            {CAMERA_MOVES.map((m) => (
              <button key={m.id} type="button" aria-pressed={picked === m.id} className={styles.move} data-selected={picked === m.id || undefined}
                      style={{ '--ratio': String(ratio) } as CSSProperties} onClick={() => setPicked(m.id)} data-testid={`bench-move-${m.id}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={shots.shots[m.id]} alt="" />
                <span className={styles.moveName}>{m.label}</span>
              </button>
            ))}
          </div>
          {sel && shots.shots[sel.id] ? (
            <div className={styles.compareWrap} style={{ '--ratio': String(ratio) } as CSSProperties}>
              <CompareSlider className={styles.compare} before={shots.front} after={shots.shots[sel.id]!} beforeLabel="The photo" afterLabel={sel.label} testId="bench-moves-compare" />
            </div>
          ) : null}
          <p className={styles.line}>Big moves open gaps behind the pieces — the photo never saw there. A model that invents the hidden room plugs in at the reangle seam.</p>
        </>
      ) : null}
    </section>
  )
}
