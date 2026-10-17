'use client'

import { useMemo, useState, type CSSProperties } from 'react'
import { Button } from '@/components/ds'
import { Chips } from '@/components/om/chips'
import { Icon } from '@/components/om/icon'
import { EXTEND_FACTORS, EXTEND_MODES, extendRoom, type ExtendMode } from '@/lib/visualizer/spatial/extend'
import { VIEW_COPY } from '@/lib/dev/ai-benches'
import { RoomBar } from './room-bar'
import { imgUrl, saveAs } from './pictures'
import type { useBenchRoom } from './use-bench-room'
import styles from './ai-bench.module.css'

/**
 * (pending modules S41 — 1.0's Spatial View › "Extend room", src/app/api/render/outpaint + src/lib/spatial/pad-for-outpaint.ts) More room
 * around the photo, by rule: Mirror the edges (the photo's own edge reflected outward, fading into a soft blur) or 1.0's padded canvas
 * itself (what it sent its model), at 1.2 · 1.4 · 1.6 times the photo. The dashed line is the photo's own edge. Nothing new is painted — a
 * model would paint a sharp continuation into the same margin (the outpaint seam).
 */
export function ExtendSection({ bench }: { bench: ReturnType<typeof useBenchRoom> }) {
  const { room, read } = bench
  const [mode, setMode] = useState<ExtendMode>('mirror')
  const [factor, setFactor] = useState<number>(1.4)
  const photo = read?.status === 'done' ? read.photo ?? null : null
  const out = useMemo(() => (photo ? (() => { const e = extendRoom(photo, factor, mode); return { ...e, url: imgUrl(e.img, 'image/jpeg') } })() : null), [photo, factor, mode])
  const ratio = out ? out.img.width / out.img.height : 3 / 2
  const frame = out ? { left: `${(out.inner.x / out.img.width) * 100}%`, top: `${(out.inner.y / out.img.height) * 100}%`, width: `${(out.inner.w / out.img.width) * 100}%`, height: `${(out.inner.h / out.img.height) * 100}%` } : null
  return (
    <section className={styles.card} data-testid="bench-extend" aria-labelledby="bench-extend-title">
      <div className={styles.cardHead}>
        <h2 id="bench-extend-title" className={styles.cardTitle}>{VIEW_COPY.extend.title}</h2>
        <p className={styles.cardHelp}>{VIEW_COPY.extend.help}</p>
      </div>
      <RoomBar {...bench} testId="bench-extend" />
      <div className={styles.row}>
        <Chips label="How" testId="bench-extend-mode" value={mode} onChange={(v) => setMode(v as ExtendMode)} options={EXTEND_MODES.map((m) => ({ value: m.key, label: m.label }))} />
        <Chips label="Size" testId="bench-extend-size" value={String(factor)} onChange={(v) => setFactor(Number(v))} options={EXTEND_FACTORS.map((f) => ({ value: String(f), label: `${f}×` }))} />
        <span className={styles.rowEnd}>
          <Button variant="secondary" appearance="outlined" iconStart={<Icon name="download" size={20} />} isDisabled={!out} onPress={() => out && saveAs(out.url, `extended-${room.key === 'upload' ? 'photo' : room.key}.jpg`)} data-testid="bench-extend-download">Download</Button>
        </span>
      </div>
      <div className={styles.stage} style={{ '--ratio': String(ratio) } as CSSProperties} data-testid="bench-extend-stage" data-width={out?.img.width} data-height={out?.img.height}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {out ? <img src={out.url} alt={`${room.name}, extended ${factor} times`} data-testid="bench-extend-picture" /> : null}
        {frame ? <span className={styles.frame} style={frame} aria-hidden data-testid="bench-extend-frame" /> : null}
      </div>
      <p className={styles.line}>{`${EXTEND_MODES.find((m) => m.key === mode)?.line ?? ''} The dashed line is the photo’s own edge.`}</p>
    </section>
  )
}
