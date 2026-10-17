'use client'

import { useRef } from 'react'
import { Chips } from '@/components/om/chips'
import { ChipRail } from '@/components/om/chip-rail'
import { Icon } from '@/components/om/icon'
import { PHOTO_TYPES, ROOM_OPTIONS, type BenchRoom, type RoomRead } from './use-bench-room'
import styles from './ai-bench.module.css'

/** (pending modules S41) The room a photo view works on — the Visualizer's three sample rooms or a photo of your own — and how its reading
    went. "Your photo" opens the file picker; the chip moves only once a photo is picked. */
export function RoomBar({ room, read, pick, takePhoto, uploadError, testId }: {
  room: BenchRoom; read: RoomRead | null; pick: (key: string) => void; takePhoto: (f: File) => void; uploadError: string | null; testId: string
}) {
  const file = useRef<HTMLInputElement>(null)
  const status = !read || read.status === 'reading'
    ? <p className={styles.wait} data-testid={`${testId}-reading`}><Icon name="progress_activity" size={18} weight={300} className={styles.spin} />Reading the room’s depth…</p>
    : read.status === 'error'
      ? <p className={styles.refusal} role="alert">{read.error}</p>
      : <p className={styles.line} data-testid={`${testId}-read`}>{`${room.key === 'upload' ? room.name : `The sample ${room.name.toLowerCase()}`} · read in ${((read.ms ?? 0) / 1000).toFixed(1)} s · the camera ${read.depth?.camera === 'traced' ? 'read off its walls' : 'taken as the default (horizon at 45 %)'}`}</p>
  return (
    <div className={`${styles.stack} ${styles.tight}`}>
      <div className={styles.views}>
        <ChipRail label="Room" className={styles.rail}>
          <Chips label="Room" testId={`${testId}-room`} value={room.key} options={ROOM_OPTIONS}
                 onChange={(v) => { if (v === 'upload') file.current?.click(); else pick(v) }} />
        </ChipRail>
        <input ref={file} type="file" accept={PHOTO_TYPES} hidden aria-hidden tabIndex={-1} data-testid={`${testId}-file`}
               onChange={(e) => { const f = e.target.files?.[0]; if (f) takePhoto(f); e.target.value = '' }} />
      </div>
      {uploadError ? <p className={styles.refusal} role="alert">{uploadError}</p> : status}
    </div>
  )
}
