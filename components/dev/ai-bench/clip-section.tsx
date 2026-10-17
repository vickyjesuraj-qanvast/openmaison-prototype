'use client'

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react'
import { Button, Switch } from '@/components/ds'
import { Chips } from '@/components/om/chips'
import { ChipRail } from '@/components/om/chip-rail'
import { Icon } from '@/components/om/icon'
import { ThreeView } from '@/components/planner/scene/three-view'
import { EXAMPLES, examplePlan } from '@/lib/planner/examples'
import { ORBIT_AMP, ORBIT_SECONDS, orbitYaw } from '@/lib/visualizer/spatial/moves'
import { clipExtension, clipType, recordCanvas, type Clip } from '@/lib/visualizer/spatial/clip'
import { DepthView, type DepthViewHandle } from './depth-view'
import { VIEW_COPY } from '@/lib/dev/ai-benches'
import { RoomBar } from './room-bar'
import { useMargin } from './look-section'
import { saveAs } from './pictures'
import type { useBenchRoom } from './use-bench-room'
import styles from './ai-bench.module.css'

const TURN_SECONDS = 12
const noSub = () => () => {}
const sizeWord = (b: number) => (b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`)

/**
 * (pending modules S41 — 1.0's Spatial View › Orbit video, src/app/api/render/orbit-video and its "AI frames" engine) A real clip, recorded in
 * this browser from 2.0's own 3D views, nothing invented: **the photo's room** turning gently side to side (±8° every 6 s, 1.0's frames'
 * ping-pong arc, drawn from the photo's own pixels), or **a 3D layout** — one of the planner's six examples — on a turntable, one turn in 12 s
 * (Dollhouse, 1.0's angled cutaway, or Isometric). Turn it previews the motion; Record makes the file (WebM, MP4 on Safari) to play here and
 * download. Proposed for the planner's 3D picture in outcome-S41.
 */
export function ClipSection({ bench }: { bench: ReturnType<typeof useBenchRoom> }) {
  const { room, read } = bench
  const [source, setSource] = useState<'photo' | 'layout'>('photo')
  const [example, setExample] = useState(EXAMPLES[0]!.key)
  const [look, setLook] = useState<'dollhouse' | 'iso'>('dollhouse')
  const [turning, setTurning] = useState(false)
  const [recording, setRecording] = useState<{ until: number; seconds: number } | null>(null)
  const [left, setLeft] = useState(0)
  const [clip, setClip] = useState<(Clip & { name: string }) | null>(null)
  const [error, setError] = useState<string | null>(null)
  const view = useRef<DepthViewHandle>(null)
  const layoutBox = useRef<HTMLDivElement>(null)
  const margin = useMargin(bench, true)
  const plan = useMemo(() => examplePlan(example), [example])
  const d = read?.status === 'done' ? read.depth ?? null : null
  const ratio = d ? d.width / d.height : 3 / 2
  /* whether this browser records (the server draws the press as if it can; the browser says) */
  const canRecord = useSyncExternalStore(noSub, () => clipType() !== null, () => true)

  /* Turn it — the photo's swing, previewed until it is switched off (a clip drives the same motion while it records) */
  useEffect(() => {
    if (source !== 'photo' || !turning || recording) return
    let raf = 0
    const v = view.current
    const t0 = performance.now()
    const tick = (now: number) => { v?.turn(orbitYaw((now - t0) / 1000)); raf = requestAnimationFrame(tick) }
    raf = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(raf); v?.turn(0) }
  }, [source, turning, recording])
  /* the seconds left while a clip records */
  useEffect(() => {
    if (!recording) return
    const id = window.setInterval(() => setLeft(Math.max(0, Math.ceil((recording.until - Date.now()) / 1000))), 250)
    return () => window.clearInterval(id)
  }, [recording])
  /* a clip's object URL goes with it */
  useEffect(() => () => { if (clip) URL.revokeObjectURL(clip.url) }, [clip])

  const record = async () => {
    setError(null)
    const canvas = source === 'photo' ? view.current?.canvas() ?? null : layoutBox.current?.querySelector('canvas') ?? null
    if (!canvas) { setError('The 3D view isn’t drawn yet — wait a moment and try again.'); return }
    const seconds = source === 'photo' ? ORBIT_SECONDS : TURN_SECONDS
    setRecording({ until: Date.now() + seconds * 1000, seconds }); setLeft(seconds)
    if (source === 'layout') setTurning(true)
    try {
      const c = await recordCanvas(canvas, seconds, source === 'photo' ? (t) => view.current?.turn(orbitYaw(t)) : undefined)
      const name = `${source === 'photo' ? `orbit-${room.key === 'upload' ? 'photo' : room.key}` : `turntable-${example}`}.${clipExtension(c.type)}`
      setClip({ ...c, name })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The clip couldn’t be recorded.')
    } finally {
      setRecording(null)
      if (source === 'photo') view.current?.turn(0)
    }
  }
  const busy = !!recording
  return (
    <section className={styles.card} data-testid="bench-clip" aria-labelledby="bench-clip-title">
      <div className={styles.cardHead}>
        <h2 id="bench-clip-title" className={styles.cardTitle}>{VIEW_COPY.clip.title}</h2>
        <p className={styles.cardHelp}>{VIEW_COPY.clip.help}</p>
      </div>
      <Chips label="What turns" testId="bench-clip-source" value={source} disabled={busy}
             onChange={(v) => { setSource(v as 'photo' | 'layout'); setTurning(false); setError(null) }}
             options={[{ value: 'photo', label: 'The photo’s room' }, { value: 'layout', label: 'A 3D layout' }]} />
      {source === 'photo' ? (
        <>
          <RoomBar {...bench} testId="bench-clip" />
          {d ? <DepthView ref={view} photo={room.url} depth={d} margin={margin} relief={1} trim ratio={ratio} label={`${room.name} in 3D, for a clip`} testId="bench-clip-view" />
            : <div className={styles.stage} style={{ '--ratio': String(ratio) } as CSSProperties} aria-hidden />}
        </>
      ) : (
        <>
          <div className={styles.views}>
            <ChipRail label="Layout" className={styles.rail}>
              <Chips label="Layout" testId="bench-clip-example" value={example} disabled={busy} onChange={setExample} options={EXAMPLES.map((e) => ({ value: e.key, label: e.name }))} />
            </ChipRail>
          </div>
          <Chips label="Look" testId="bench-clip-look" value={look} disabled={busy} onChange={(v) => setLook(v as 'dollhouse' | 'iso')}
                 options={[{ value: 'dollhouse', label: 'Dollhouse' }, { value: 'iso', label: 'Isometric' }]} />
          <div ref={layoutBox} className={styles.planner} data-testid="bench-clip-layout">
            {plan ? <ThreeView key={`${example}-${look}`} plan={plan} library={[]} mode="orbit" low={look === 'dollhouse'} look={look === 'dollhouse' ? 'front' : null} iso={look === 'iso'}
                               spin={turning ? TURN_SECONDS : 0} label={`${EXAMPLES.find((e) => e.key === example)?.name ?? 'Layout'} in 3D`} /> : null}
          </div>
        </>
      )}
      <div className={styles.row}>
        <label className={styles.switchRow} data-testid="bench-clip-turn"><Switch size="sm" isSelected={turning || busy} isDisabled={busy} onChange={setTurning} aria-label="Turn it" />Turn it</label>
        <Button variant="primary" appearance="filled" iconStart={<Icon name="timelapse" size={20} />} isDisabled={busy || !canRecord || (source === 'photo' && !d)} onPress={record} data-testid="bench-clip-record">
          {busy ? `Recording… ${left} s` : source === 'photo' ? `Record a ${ORBIT_SECONDS}-second clip` : `Record one turn (${TURN_SECONDS} s)`}
        </Button>
        {clip ? (
          <span className={styles.rowEnd}>
            <Button variant="secondary" appearance="outlined" iconStart={<Icon name="download" size={20} />} onPress={() => saveAs(clip.url, clip.name)} data-testid="bench-clip-download">Download the clip</Button>
          </span>
        ) : null}
      </div>
      {!canRecord ? <p className={styles.refusal} role="alert">This browser can’t record a clip — try Chrome, Edge, Firefox or Safari.</p> : null}
      {error ? <p className={styles.refusal} role="alert">{error}</p> : null}
      <p className={styles.line}>{source === 'photo' ? `The camera swings ${ORBIT_AMP}° each way about the room’s middle — the arc 1.0’s frames played. A bigger arc only shows more of what the photo never saw.` : 'One whole turn of the layout, as the planner draws it.'}</p>
      {clip ? (
        <div className={`${styles.stack} ${styles.tight}`}>
          <video className={styles.video} src={clip.url} controls loop muted playsInline data-testid="bench-clip-video" data-bytes={clip.bytes} aria-label={`The clip: ${clip.name}`} />
          <p className={styles.line} data-testid="bench-clip-facts">{`${clip.name} · ${clip.type.replace('video/', '').toUpperCase()} · ${sizeWord(clip.bytes)} · ${clip.seconds} s`}</p>
        </div>
      ) : null}
    </section>
  )
}
