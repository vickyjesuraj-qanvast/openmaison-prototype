'use client'

import { useRef } from 'react'
import { Icon } from '@/components/om/icon'
import { useReadOnly } from '@/components/om/read-only'
import { useSheetLayout } from '@/components/om/sheet'
import { TOUCH_TABLET, useMediaQuery } from '@/lib/breakpoint'
import { CONTRACT_FILE_ACCEPT, PHOTO_ACCEPT } from '@/lib/contracts/picture'
import styles from './photo-or-file.module.css'

/** (Contracts on the move, C4 — P-12) A finger drives the page: a phone (≤767, any pointer) or a touch tablet (≤1024 with no hover). */
export function useTouchPick(): boolean {
  const phone = useSheetLayout()
  const tablet = useMediaQuery(TOUCH_TABLET)
  return phone || tablet
}

/**
 * (Contracts on the move, C4 — P-12 · C-25 · C-27, Q-04 as picked; his "please check and built accordingly" 2026-10-22) Where a desk drops a PDF,
 * a finger gets two rows: **Take a photo** — the phone's camera at once (`capture="environment"`, pictures only), the paper the client just signed
 * on site — and **Choose a file** (a PDF or a picture, from the phone's files or photos). The Create Quote phone step's 56 rows composed (a 36
 * glyph tile, the title at 16, its meaning at 14, a chevron); each row is the press and opens its own hidden picker. `uploading` holds both rows
 * and says so in the first. Read-only scopes draw nothing, as the Dropzone.
 */
export function PhotoOrFile({ onPick, ids, uploading = false, photoHelp = 'The signed paper, with your camera', fileHelp = 'A PDF or a picture', label }: {
  onPick: (file?: File) => void
  /** The two rows' test ids (the probe's handles). */
  ids: { photo: string; file: string }
  uploading?: boolean
  photoHelp?: string
  fileHelp?: string
  /** What the two rows upload, for a screen reader (the group's name). */
  label: string
}) {
  const ro = useReadOnly()
  const photo = useRef<HTMLInputElement>(null)
  const file = useRef<HTMLInputElement>(null)
  if (ro) return null
  const take = (which: 'photo' | 'file') => () => { if (!uploading) (which === 'photo' ? photo : file).current?.click() }   // the ref is read on the press, never in render
  const picked = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onPick(f) }
  return (
    <div className={styles.list} role="group" aria-label={label} aria-busy={uploading || undefined} data-photo-or-file="">
      <div className={styles.phoneRow}>
        <button type="button" className={styles.phoneMain} onClick={take('photo')} disabled={uploading} data-testid={ids.photo}>
          <span className={styles.glyph}><Icon name="photo_camera" size={20} weight={300} /></span>
          <span className={styles.rowText}><span className={styles.rowTitle}>{uploading ? 'Uploading…' : 'Take a photo'}</span><span className={styles.rowDesc}>{photoHelp}</span></span>
          <span className={styles.trail}><Icon name="chevron_right" size={24} /></span>
        </button>
        <input ref={photo} type="file" accept={PHOTO_ACCEPT} capture="environment" className={styles.input} tabIndex={-1} aria-hidden onChange={picked} data-testid={`${ids.photo}-input`} />
      </div>
      <div className={styles.phoneRow}>
        <button type="button" className={styles.phoneMain} onClick={take('file')} disabled={uploading} data-testid={ids.file}>
          <span className={styles.glyph}><Icon name="upload_file" size={20} weight={300} /></span>
          <span className={styles.rowText}><span className={styles.rowTitle}>Choose a file</span><span className={styles.rowDesc}>{fileHelp}</span></span>
          <span className={styles.trail}><Icon name="chevron_right" size={24} /></span>
        </button>
        <input ref={file} type="file" accept={CONTRACT_FILE_ACCEPT} className={styles.input} tabIndex={-1} aria-hidden onChange={picked} data-testid={`${ids.file}-input`} />
      </div>
    </div>
  )
}
