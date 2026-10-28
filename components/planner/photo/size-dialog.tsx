'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import type { Underlay } from '@/lib/planner/model'
import { scaleOk } from '@/lib/planner/photo'
import { readPlanUrl, straightenPlan } from './straighten-photo'
import { SizeFields, sizeOf, type Measured, type SizeBy, type SizedPicture } from './size-fields'
import styles from './photo-dialog.module.css'

/**
 * (pending modules S28) The planner's **Change its size…** — the floor plan under the drawing given its size again (its floor area, or one
 * length marked on it), when the size it started with was off: the plan, the rooms on it and the furniture's places grow or shrink with it
 * in one Undo step (the pieces keep their own sizes — a sofa is as long as it is). Opens on the size the plan has now.
 */
export function SizeDialog({ open, onClose, underlay, onApply }: { open: boolean; onClose: () => void; underlay: Underlay | null; onApply: (mmPerPx: number) => void }) {
  const [pic, setPic] = useState<SizedPicture | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [by, setBy] = useState<SizeBy>('area')
  const [area, setArea] = useState('')
  const [measured, setMeasured] = useState<Measured | null>(null)
  const [tried, setTried] = useState(false)
  const [was, setWas] = useState(false)
  if (open !== was) { setWas(open); if (open) { setPic(null); setError(null); setBy('area'); setArea(''); setMeasured(null); setTried(false) } }
  const url = underlay?.url ?? null, name = underlay?.name ?? '', mmNow = underlay?.mmPerPx ?? 0
  useEffect(() => {
    if (!open || !url) return
    let live = true
    void readPlanUrl(url, name).then(async (r) => {
      if (!live) return
      if (!r) { setError('The floor plan didn’t read — please try again'); return }
      const s = await straightenPlan(r, { clean: false, quarter: 0 })
      if (!live) return
      setPic({ src: s.data, width: s.width, height: s.height, share: s.share, read: s.read })
      /* its floor area as the plan reads now — scaled to the picture as drawn here */
      const k = (underlay?.pxW ?? s.width) / s.width
      setArea(String(Math.round((s.share * s.width * s.height * (mmNow * k) ** 2) / 1_000_000)))
    }, () => { if (live) setError('The floor plan didn’t read — please try again') })
    return () => { live = false }
  }, [open, url])   // eslint-disable-line react-hooks/exhaustive-deps -- once per opening
  /* the size in the underlay's own pixels (the picture read here may be drawn smaller) */
  const mm = pic ? sizeOf(pic, by, area, measured) : null
  const apply = () => {
    setTried(true)
    if (!pic || !underlay) return
    const perOwn = mm ? mm * (pic.width / underlay.pxW) : null
    if (!scaleOk(perOwn)) return
    onApply(perOwn)
  }
  return (
    <Dialog open={open} onClose={onClose} title="Set its size" subtitle={`${name || 'The floor plan'} — the rooms and the furniture’s places follow it.`} size="form" width={600} closeOnScrim={false}
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button><Button onPress={apply} isDisabled={!pic} data-testid="planner-size-apply">Change it</Button></>}>
      <div className={styles.body} data-testid="planner-size-dialog">
        {error ? <p className={styles.error} role="alert">{error}</p> : !pic ? <div className={styles.well} role="status" aria-live="polite"><span className={styles.wellText}>Reading the plan…</span></div> : (
          <section className={styles.section} aria-label="How big it is">
            <SizeFields pic={pic} by={by} onBy={(v) => { setBy(v); if (v === 'area') setMeasured(null) }} area={area} onArea={setArea} measured={measured} onMeasured={setMeasured} tried={tried}
                        areaHelper="What the plan measures now — type the home’s own floor area" />
          </section>
        )}
      </div>
    </Dialog>
  )
}
