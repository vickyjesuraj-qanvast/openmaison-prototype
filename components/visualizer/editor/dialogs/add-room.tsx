'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { Icon } from '@/components/om/icon'
import { Dropzone } from '@/components/leads/move-stage/fields'
import { SAMPLE_ROOMS } from '@/lib/visualizer/samples'
import { PHOTO_ACCEPT } from '@/lib/visualizer/policy'
import { useMediaQuery } from '@/lib/breakpoint'
import { UPLOAD_MAX_BYTES, isHeic } from '../editor-model'
import styles from './dialogs.module.css'

/** What the pickers offer: JPG, PNG and WebP, and HEIC — the editor opens it where the browser can, and says so where it can't. */
export const ROOM_ACCEPT = `${PHOTO_ACCEPT},image/heic,image/heif,.heic,.heif`   // (REG-735) the landing's welcome picks with it too

/** (critic 19) Why a file can't be a room photo, in words the studio can act on — or null when it can. A drop skips the picker's accept
    list, so a PDF or a very large export reaches here; each gets its own answer. A HEIC goes on: the editor redraws every room photo as
    a 1600px JPEG, so a big phone photo is fine up to 40 MB. */
export function photoProblem(f: File): string | null {
  const name = f.name || 'That file'
  if (!isHeic(f) && !PHOTO_ACCEPT.split(',').includes(f.type)) return f.type.startsWith('image/') ? `${name} is a picture we can’t read — use a JPG, PNG, WebP or HEIC.` : `${name} isn’t a photo — use a JPG, PNG, WebP or HEIC.`
  if (f.size > UPLOAD_MAX_BYTES) return `${name} is over 40 MB — export a smaller copy and try again`
  return null
}

/**
 * A room's photo, four ways (REG-673; 1.0's *Upload new room* + *Take photo*, B-25 · B-26, and Q-31): a photo from the computer, the
 * phone's camera, one of the lead's own files, or a sample room. The same options fill an empty design's canvas and the Add room dialog.
 * (critic 19) Drops and picks are checked here first, so a PDF or a file over 40 MB says why on the spot; several photos dropped
 * at once each become a room when the host takes `onFiles`, else the first photo is added and the rest are named.
 */
export function AddRoomOptions({ onFile, onFiles, onLeadFile, onSample, leadImages, leadName, busy }: {
  onFile: (f: File) => void
  /** Several photos at once — one room each, in the order dropped. Without it, the first photo is added. */
  onFiles?: (files: File[]) => void
  onLeadFile: (f: { id: string; name: string; url: string }) => void
  onSample: (key: string, sketch: boolean) => void
  leadImages: { id: string; name: string; url: string }[]
  leadName: string | null
  busy: boolean
}) {
  const camera = useRef<HTMLInputElement>(null)
  const dropped = useRef<File[]>([])
  /* (phone-10) a finger has nothing to drop: the box is the picker, and says so */
  const touch = useMediaQuery('(hover: none)')
  const title = touch ? (onFiles ? 'Choose room photos' : 'Choose a room photo') : onFiles ? 'Drop room photos or browse' : 'Drop a room photo or browse'
  const [problem, setProblem] = useState<string | null>(null)
  /* every file the studio gave, checked: the good ones go on, the others are named in one line under the box */
  const take = (files: File[]) => {
    const good = files.filter((f) => !photoProblem(f))
    const bad = files.map(photoProblem).filter((x): x is string => !!x)
    const skipped = !onFiles && good.length > 1 ? good.slice(1).map((f) => f.name) : []
    setProblem(bad.length ? (bad.length === 1 ? bad[0]! : `${bad.length} files can’t be room photos — ${bad[0]}`) : skipped.length ? `One photo at a time here — ${good[0]!.name} is being added; add ${skipped.join(', ')} next.` : null)
    if (!good.length) return
    if (onFiles && good.length > 1) onFiles(good)
    else onFile(good[0]!)
  }
  return (
    <div className={styles.stack} data-testid="viz-add-room">
      <div className={`${styles.section} ${styles.roomDrop}`} onDropCapture={(e) => { dropped.current = Array.from(e.dataTransfer.files) }} onDrop={() => { dropped.current = [] }}>
        <Dropzone title={title} label="Upload a room photo" helper="JPG, PNG, WebP or HEIC · large photos are resized · straight-on shots and clean 3D views work best" accept={ROOM_ACCEPT} uploading={busy}
                  onPick={(f) => { const all = dropped.current.length ? dropped.current : f ? [f] : []; dropped.current = []; take(all) }} />
        {problem ? <span className={styles.hint} role="alert" data-tone="error" data-testid="viz-photo-problem"><Icon name="error" size={16} weight={300} /> {problem}</span> : null}
        <span className={styles.camera}>
          <Button variant="secondary" appearance="outlined" iconStart={<Icon name="photo_camera" size={20} weight={300} />} onPress={() => camera.current?.click()}>Take a photo</Button>
          <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) take([f]) }} />
        </span>
      </div>
      {leadImages.length ? (
        <div className={styles.section}>
          <span className={styles.head}><span>From {leadName ? `${leadName}’s` : 'the lead’s'} files</span></span>
          <div className={styles.tiles}>
            {leadImages.map((f) => (
              <button key={f.id} type="button" className={styles.tile} disabled={busy} onClick={() => onLeadFile(f)} data-testid="viz-lead-file">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.url} alt="" loading="lazy" /><span className={styles.tileName}>{f.name}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <div className={styles.section}>
        <span className={styles.head}><span>Sample rooms</span></span>
        <div className={styles.tiles}>
          {SAMPLE_ROOMS.flatMap((s) => [{ s, sketch: false }, ...(s.sketch ? [{ s, sketch: true }] : [])]).map(({ s, sketch }) => (
            <button key={`${s.key}-${sketch}`} type="button" className={styles.tile} disabled={busy} onClick={() => onSample(s.key, sketch)} data-testid="viz-sample">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={sketch ? s.sketch! : s.original} alt="" loading="lazy" /><span className={styles.tileName}>{sketch ? `${s.name} sketch` : s.name}</span><span className={styles.tileSub}>{sketch ? 'A concept to render' : 'Furnished photo'}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export function AddRoomDialog({ open, onClose, ...p }: { open: boolean; onClose: () => void } & Parameters<typeof AddRoomOptions>[0]) {
  return (
    <Dialog open={open} onClose={onClose} title="Add a room" subtitle="A photo of the room — its surfaces and furniture are marked for you." size="modal" width={800}
            footer={<Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button>}>
      <AddRoomOptions {...p} />
    </Dialog>
  )
}
