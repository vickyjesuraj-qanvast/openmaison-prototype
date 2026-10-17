'use client'

import { useMemo, useState, type CSSProperties } from 'react'
import { Button } from '@/components/ds'
import { Chips } from '@/components/om/chips'
import { Icon } from '@/components/om/icon'
import { CompareSlider } from '@/components/om/compare-slider'
import { StatTile, StatTiles } from '@/components/om/stat-tile'
import { depthPicture, metresWord, type DepthKind } from '@/lib/visualizer/spatial/depth'
import { VIEW_COPY } from '@/lib/dev/ai-benches'
import { RoomBar } from './room-bar'
import { READ_GROUPS, imgUrl, readingTint, saveAs } from './pictures'
import type { useBenchRoom } from './use-bench-room'
import pal from '@/components/om/category-palette.module.css'
import styles from './ai-bench.module.css'

const KIND_WORD: Record<DepthKind, string> = { floor: 'Floor', ceiling: 'Ceiling', level: 'Worktop', upright: 'Upright', piece: 'Piece', rest: 'Not read' }

/**
 * (pending modules S41 — 1.0's Spatial View › Depth, src/app/api/render/depth) The photo's depth, by rule: the photo and its grey map (near
 * white, 1.0's convention) under the house compare slider, or What it read — the photo tinted by what each pixel was read as (1.0's Detector
 * Sandbox's job: every surface and piece named) — with the map's near and far, how the camera was read, and each layer's distances.
 * Download saves the grey map as a PNG.
 */
export function DepthSection({ bench }: { bench: ReturnType<typeof useBenchRoom> }) {
  const { room, read } = bench
  const [show, setShow] = useState<'depth' | 'reading'>('depth')
  const d = read?.status === 'done' ? read.depth ?? null : null
  const photo = read?.status === 'done' ? read.photo ?? null : null
  const depthUrl = useMemo(() => (d ? imgUrl(depthPicture(d)) : null), [d])
  const tint = useMemo(() => (d && photo ? (() => { const t = readingTint(photo, d); return { url: imgUrl(t.img, 'image/jpeg'), shares: t.shares } })() : null), [d, photo])
  const ratio = d ? d.width / d.height : 3 / 2
  const surfaces = d?.layers.filter((l) => l.kind !== 'piece').length ?? 0, pieces = d?.layers.filter((l) => l.kind === 'piece').length ?? 0
  const fileName = `depth-${room.key === 'upload' ? 'photo' : room.key}.png`
  return (
    <section className={styles.card} data-testid="bench-depth" aria-labelledby="bench-depth-title">
      <div className={styles.cardHead}>
        <h2 id="bench-depth-title" className={styles.cardTitle}>{VIEW_COPY.depth.title}</h2>
        <p className={styles.cardHelp}>{VIEW_COPY.depth.help}</p>
      </div>
      <RoomBar {...bench} testId="bench-depth" />
      <div className={styles.row}>
        <Chips label="Show" testId="bench-depth-show" value={show} onChange={(v) => setShow(v as 'depth' | 'reading')}
               options={[{ value: 'depth', label: 'Depth' }, { value: 'reading', label: 'What it read' }]} />
        <span className={styles.rowEnd}>
          <Button variant="secondary" appearance="outlined" size="md" iconStart={<Icon name="download" size={20} />} isDisabled={!depthUrl}
                  onPress={() => depthUrl && saveAs(depthUrl, fileName)} data-testid="bench-depth-download">Download the depth map</Button>
        </span>
      </div>
      {!d || !photo ? (
        <div className={styles.stage} style={{ '--ratio': String(ratio) } as CSSProperties} aria-hidden />
      ) : show === 'depth' ? (
        <div className={styles.compareWrap} style={{ '--ratio': String(ratio) } as CSSProperties}>
          <CompareSlider className={styles.compare} before={room.url} after={depthUrl ?? room.url} beforeLabel="Photo" afterLabel="Depth" start={50} testId="bench-depth-compare" />
        </div>
      ) : (
        <div className={`${styles.stack} ${styles.tight}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <div className={styles.stage} style={{ '--ratio': String(ratio) } as CSSProperties}><img src={tint?.url} alt={`What the bench read in ${room.name}`} data-testid="bench-depth-reading" /></div>
          <ul className={styles.legend} aria-label="What each colour is">
            {READ_GROUPS.map((g) => (
              <li key={g.key} className={styles.legendItem}><span className={`${styles.swatch} ${pal[g.slot]}`} aria-hidden />{`${g.label} · ${Math.round((tint?.shares[g.key] ?? 0) * 100)} %`}</li>
            ))}
          </ul>
        </div>
      )}
      {d ? (
        <>
          <StatTiles testId="bench-depth-tiles">
            <StatTile label="Nearest" value={metresWord(d.near)} testId="bench-depth-near" />
            <StatTile label="Farthest" value={metresWord(d.far)} testId="bench-depth-far" />
            <StatTile label="The camera" value={d.camera === 'traced' ? 'Read off the walls' : 'Default'} help={`Horizon at ${Math.round((d.frame.yh / d.height) * 100)} % of the height`} />
            <StatTile label="Read" value={`${surfaces} surfaces · ${pieces} pieces`} help={d.source === 'sample' ? 'The sample room’s curated reading' : 'Walls · Floor · Ceiling by rule'} />
          </StatTiles>
          <ul className={styles.layers} aria-label="Each layer’s distance" data-testid="bench-depth-layers">
            {d.layers.map((l, i) => (
              <li key={`${l.label}-${i}`} className={styles.layer}>
                <span className={styles.layerName}>{l.label}</span>
                <span className={styles.layerKind}>{KIND_WORD[l.kind]}</span>
                <span className={styles.layerRange}>{Math.abs(l.far - l.near) < 0.05 ? metresWord(l.near) : `${metresWord(l.near)} – ${metresWord(l.far)}`}</span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  )
}
