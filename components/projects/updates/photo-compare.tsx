'use client'

import { useState } from 'react'
import { Button } from '@/components/ds'
import { CompareSlider } from '@/components/om/compare-slider'
import { Dialog } from '@/components/om/dialog'
import { TextField } from '@/components/om/text-field'
import styles from './updates.module.css'

export type ComparePhoto = { id: string; src: string; name: string }

/**
 * (gaps build D, item 10 — 1.0 D-29 · D-54's Compare) Two photos of an update before and after — the house `CompareSlider` (drag, arrow keys,
 * touch that never traps the page) in an l dialog (a sheet on a phone). The first photo is Before and the last is After (1.0 always paired the
 * first two, D-119); either can be changed from the update's own photos. The studio's update card and the portal's draw the same one.
 */
export function PhotoCompare({ open, title, photos, onClose }: { open: boolean; title: string; photos: ComparePhoto[]; onClose: () => void }) {
  const [pick, setPick] = useState<{ before: string; after: string } | null>(null)
  const key = open ? photos.map((p) => p.id).join(',') : null
  const [seen, setSeen] = useState<string | null>(null)
  if (key !== seen) { setSeen(key); setPick(photos.length >= 2 ? { before: photos[0]!.id, after: photos[photos.length - 1]!.id } : null) }
  const labelOf = (p: ComparePhoto, i: number) => `${i + 1}. ${p.name}`
  const options = photos.map(labelOf)
  const before = photos.find((p) => p.id === pick?.before) ?? null
  const after = photos.find((p) => p.id === pick?.after) ?? null
  const idOf = (label: string) => photos[options.indexOf(label)]?.id ?? null
  return (
    <Dialog open={open} onClose={onClose} title="Before and after" subtitle={title} size="modal" width={800}
            footer={<Button variant="secondary" appearance="outlined" onPress={onClose}>Close</Button>}>
      {before && after ? (
        <div className={styles.compare} data-testid="photo-compare">
          <div className={styles.compareFields}>
            <TextField label="Before" mode="select" options={options} value={labelOf(before, photos.indexOf(before))} onChange={(v) => { const id = idOf(v); if (id) setPick((p) => (p ? { ...p, before: id } : p)) }} />
            <TextField label="After" mode="select" options={options} value={labelOf(after, photos.indexOf(after))} onChange={(v) => { const id = idOf(v); if (id) setPick((p) => (p ? { ...p, after: id } : p)) }} />
          </div>
          <CompareSlider key={`${before.id}|${after.id}`} before={before.src} after={after.src} className={styles.compareBox} testId="photo-compare-slider" />
        </div>
      ) : null}
    </Dialog>
  )
}
