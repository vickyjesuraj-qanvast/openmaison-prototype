'use client'

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Button, Switch } from '@/components/ds'
import { Chips } from '@/components/om/chips'
import { Icon } from '@/components/om/icon'
import { loadImg } from '@/lib/visualizer/engine/run'
import { quadUsable, seedCorners, squaredSize, warpToRect, type Quad } from '@/lib/planner/corners'
import { CornerEditor } from '@/components/planner/photo/corner-editor'   // (S42 D·1) one corner editor, Make a 3D picture's and the bench's
import { cleanPlanImageData, flattenPlanBackground } from '@/lib/planner/straighten'
import { VIEW_COPY } from '@/lib/dev/ai-benches'
import { imgUrl, saveAs } from './pictures'
import { PHOTO_TYPES } from './use-bench-room'
import styles from './ai-bench.module.css'

const DEMO_PLAN = '/planner/demo/floor-plan-photo-waterway-sunrise.jpg'
type Src = { kind: 'demo' | 'upload'; url: string; name: string }

/**
 * (pending modules S41 — 1.0's /tools/floorplan-3d-sandbox, "Adjust paper corners": the sheet's four corners dragged by hand, "the ground-truth
 * escape hatch") Plan corners: a floor-plan photo with the four corners of its sheet to place — started where S28's rule finds the sheet, else
 * the picture's corners; drag them (or Tab to one and use the arrow keys, Shift for bigger steps) onto the paper's corners, and Square it maps
 * that quad onto a rectangle (one homography), so a photo taken at a slant comes out flat. Clean it runs S28's own background flattening and
 * levels on the result. Download saves the PNG. Proposed for Make a 3D picture in outcome-S41 — not on its screen until Vicky says.
 */
export function CornersSection() {
  const [src, setSrc] = useState<Src>({ kind: 'demo', url: DEMO_PLAN, name: 'The demo plan photo' })
  const [raster, setRaster] = useState<{ url: string; data: Uint8ClampedArray; width: number; height: number } | null>(null)
  const [quad, setQuad] = useState<Quad | null>(null)
  const [found, setFound] = useState(false)
  const [clean, setClean] = useState(true)
  const [result, setResult] = useState<{ url: string; w: number; h: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const file = useRef<HTMLInputElement>(null)

  /* the photo's pixels, and where its corners start */
  useEffect(() => {
    let gone = false
    loadImg(src.url).then((img) => {
      if (gone) return
      const seed = seedCorners(img)
      setRaster({ url: src.url, data: img.data, width: img.width, height: img.height }); setQuad(seed.quad); setFound(seed.found); setResult(null); setError(null)
    }).catch(() => { if (!gone) setError('That photo couldn’t be read.') })
    return () => { gone = true }
  }, [src])
  const r = raster?.url === src.url ? raster : null
  const size = useMemo(() => (quad ? squaredSize(quad) : null), [quad])

  const usable = !!(r && quad && quadUsable(quad, r.width, r.height))
  const square = () => {
    if (!r || !quad || !usable) return
    const out = warpToRect({ data: r.data, width: r.width, height: r.height }, quad)
    if (clean) { flattenPlanBackground(out); cleanPlanImageData(out) }
    setResult({ url: imgUrl({ width: out.width, height: out.height, data: out.data }), w: out.width, h: out.height })
  }
  const reset = () => { if (!r) return; const seed = seedCorners({ data: r.data, width: r.width, height: r.height }); setQuad(seed.quad); setFound(seed.found); setResult(null) }
  const pickFile = (f: File) => {
    if (!PHOTO_TYPES.split(',').includes(f.type)) { setError('Pick a JPG, PNG or WebP photo.'); return }
    const fr = new FileReader()
    fr.onload = () => { if (typeof fr.result === 'string') setSrc({ kind: 'upload', url: fr.result, name: f.name || 'Your plan photo' }) }
    fr.onerror = () => setError('That photo couldn’t be read.')
    fr.readAsDataURL(f)
  }
  const ratio = r ? r.width / r.height : 4 / 3
  return (
    <section className={styles.card} data-testid="bench-corners" aria-labelledby="bench-corners-title">
      <div className={styles.cardHead}>
        <h2 id="bench-corners-title" className={styles.cardTitle}>{VIEW_COPY.corners.title}</h2>
        <p className={styles.cardHelp}>{VIEW_COPY.corners.help}</p>
      </div>
      <div className={styles.row}>
        <Chips label="Plan photo" testId="bench-corners-source" value={src.kind}
               onChange={(v) => { if (v === 'upload') file.current?.click(); else setSrc({ kind: 'demo', url: DEMO_PLAN, name: 'The demo plan photo' }) }}
               options={[{ value: 'demo', label: 'The demo plan photo' }, { value: 'upload', label: src.kind === 'upload' ? src.name : 'Your plan photo' }]} />
        <input ref={file} type="file" accept={PHOTO_TYPES} hidden aria-hidden tabIndex={-1} data-testid="bench-corners-file"
               onChange={(e) => { const f = e.target.files?.[0]; if (f) pickFile(f); e.target.value = '' }} />
        <span className={styles.rowEnd}>
          <Button variant="secondary" appearance="text" iconStart={<Icon name="restart_alt" size={18} />} isDisabled={!r} onPress={reset} data-testid="bench-corners-reset">Start the corners again</Button>
        </span>
      </div>
      {error ? <p className={styles.refusal} role="alert">{error}</p> : <p className={styles.line} data-testid="bench-corners-seed">{r ? (found ? 'The corners start on the sheet the rule found (S28’s paper finder).' : 'No sheet stood out — the corners start near the picture’s own.') : 'Reading the photo…'}</p>}
      {r && quad ? (
        <CornerEditor src={r.url} width={r.width} height={r.height} quad={quad} onQuad={setQuad} alt={`${src.name}, with the sheet’s four corners to place`}
                      className={styles.corners} testId="bench-corners-editor" handleTestId="bench-corner" />
      ) : <div className={styles.corners} style={{ '--ratio': String(ratio) } as CSSProperties} data-testid="bench-corners-editor" />}
      <div className={styles.row}>
        <Button variant="primary" appearance="filled" iconStart={<Icon name="crop_free" size={20} />} isDisabled={!usable} onPress={square} data-testid="bench-corners-square">Square it</Button>
        <label className={styles.switchRow} data-testid="bench-corners-clean"><Switch size="sm" isSelected={clean} onChange={(v: boolean) => { setClean(v); setResult(null) }} aria-label="Clean it" />Clean it</label>
        {result ? (
          <span className={styles.rowEnd}>
            <Button variant="secondary" appearance="outlined" iconStart={<Icon name="download" size={20} />} onPress={() => saveAs(result.url, `plan-squared${src.kind === 'demo' ? '-demo' : ''}.png`)} data-testid="bench-corners-download">Download</Button>
          </span>
        ) : null}
      </div>
      {!usable && r && quad ? <p className={styles.refusal} role="alert">These four corners don’t make a sheet — move them so they go round it, each on its own corner.</p>
        : size && !result ? <p className={styles.line}>{`It will come out ${size.w} × ${size.h} px.`}</p> : null}
      {result ? (
        <div className={`${styles.stack} ${styles.tight}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={styles.result} src={result.url} alt="The plan, squared by its four corners" data-testid="bench-corners-result" data-width={result.w} data-height={result.h} />
          <p className={styles.line}>{`${result.w} × ${result.h} px${clean ? ' · cleaned (S28’s flattening and levels)' : ''}.`}</p>
        </div>
      ) : null}
    </section>
  )
}
