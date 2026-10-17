'use client'

import { useState } from 'react'
import { Button } from '@/components/ds'
import { Chips } from '@/components/om/chips'
import { TextField } from '@/components/om/text-field'
import { FieldError } from '@/components/leads/move-stage/fields'
import { PlanCanvas } from '@/components/projects/floor-plan/plan-canvas'
import { formatMm, scaleFrom, type Pt } from '@/lib/projects/floor-plan-model'
import { AREA_MAX, AREA_MIN, scaleFromArea, sizeAt } from '@/lib/planner/photo'
import styles from './photo-dialog.module.css'

/** A plan's picture as the size reads it: its pixels and the share of them the plan covers (lib/planner/straighten.ts `footprintShare`). */
export type SizedPicture = { src: string; width: number; height: number; share: number; read: boolean }
export type SizeBy = 'area' | 'length'
export type Measured = { a: Pt; b: Pt; mm: number }

/** Millimetres per pixel from what the studio gave — one length marked on the plan wins, else the floor area — or null while neither reads. */
export function sizeOf(pic: SizedPicture, by: SizeBy, area: string, measured: Measured | null): number | null {
  if (by === 'length') return measured ? scaleFrom(measured.a, measured.b, measured.mm, pic.width, pic.height) : null
  const m2 = Number(area.replace(/,/g, ''))
  return Number.isFinite(m2) && m2 >= AREA_MIN && m2 <= AREA_MAX ? scaleFromArea(m2, pic.share, pic.width, pic.height) : null
}

/**
 * (pending modules S28) How big a floor plan is — two ways, the first needing nothing: **its floor area** (the lead's own on record, else the
 * planner's flat for its type; the plan's outline read off the picture turns square metres into its size) or **a length on the plan** (two
 * presses and how long it is — the Floor plan tab's own Set the scale, 1.0's Calibrate Scale). A line under each says what the plan then
 * measures, so a wrong number shows at once. Shared by Make a 3D picture and the planner's Change its size….
 */
export function SizeFields({ pic, by, onBy, area, onArea, areaHelper, measured, onMeasured, tried }: {
  pic: SizedPicture
  by: SizeBy; onBy: (v: SizeBy) => void
  area: string; onArea: (v: string) => void; areaHelper: string
  measured: Measured | null; onMeasured: (m: Measured | null) => void
  tried: boolean
}) {
  const [marking, setMarking] = useState(!measured)
  const mm = sizeOf(pic, by, area, measured)
  const m2 = Number(area.replace(/,/g, ''))
  const areaBad = !(Number.isFinite(m2) && m2 >= AREA_MIN && m2 <= AREA_MAX)
  return (
    <>
      <Chips label="How big it is" options={[{ value: 'area', label: 'Its floor area' }, { value: 'length', label: 'A length on the plan' }]} value={by}
             onChange={(v) => { onBy(v as SizeBy); if (v === 'length') setMarking(!measured) }} testId="photo-size-by" />
      {by === 'area' ? (
        <div className={styles.areaRow}>
          <TextField label="Floor area (m²)" value={area} onChange={onArea} numeric="decimal" maxLength={6} error={tried && areaBad ? `Between ${AREA_MIN} and ${AREA_MAX} m²` : undefined} helper={areaHelper} />
          {mm ? <span className={styles.line} data-testid="photo-size-line">{`The plan reads as about ${sizeAt(mm, pic.width, pic.height)}${pic.read ? '' : ' — its outline didn’t read clearly, so check one length on it'}`}</span> : null}
        </div>
      ) : (
        <div className={styles.lengthBox} data-testid="photo-length">
          {measured && !marking ? (
            <div className={styles.measured}>
              <span className={styles.line} data-testid="photo-length-line">{`Set — ${formatMm(measured.mm)} between the two points, so the plan reads as about ${sizeAt(mm ?? 0, pic.width, pic.height)}`}</span>
              <Button variant="secondary" appearance="text" size="sm" onPress={() => setMarking(true)}>Mark again</Button>
            </div>
          ) : (
            <PlanCanvas plan={{ id: 'size', width: pic.width, height: pic.height, picture: pic.src, scale: null, name: 'The floor plan' }} marks={[]} nums={NO_NUMS} side="studio" tool="scale" symbol={null} pattern="diagonal"
                        style={PEN} selected={null} onSelect={noop} onDraw={noop} onMove={noop} onErase={noop} maxHeight={420} testId="photo-scale"
                        onScale={async (a, b, length) => { onMeasured({ a, b, mm: length }); setMarking(false); return true }}
                        onScaleCancel={() => { setMarking(false); if (!measured) onBy('area') }} />
          )}
          <FieldError message={tried && !measured ? 'Mark both ends of a length you know, and say how long it is' : undefined} />
        </div>
      )}
    </>
  )
}

const NO_NUMS = new Map<string, string>()
const PEN = { color: null, weight: 2 as const, dashed: false }
const noop = () => {}
