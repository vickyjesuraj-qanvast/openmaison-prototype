'use client'

import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { useSheetLayout } from '@/components/om/sheet'
import styles from './files-empty.module.css'

/**
 * Lead Details › Files — empty state (frame 87, 931:40314 / card 931:40340; spec design-source/context/lead-files/
 * 01-toolbar-empty-list.txt "Empty state"): 1244×784 card, centred illustration 931:40342 (undraw_photos 180×155 →
 * /figma-assets/empty-files.svg), texts 931:40352, buttons 931:40355 (Create Folder 931:40356 · Upload Files 931:40357).
 * Copied from components/leads/contracts/contracts-empty.tsx with the Files copy and leading-icon buttons.
 */
export function FilesEmpty({ onCreateFolder, onUpload, readOnly = false, onPhoto }: { onCreateFolder: () => void; onUpload: () => void; /** (pending modules S06) Accounting reads only — the card says whose files they are, with no buttons */ readOnly?: boolean
  /** (Leads on the move, L4 — P-11) A phone's first way in: the camera — on site, Files is photos. */
  onPhoto?: () => void }) {
  const phone = useSheetLayout()
  if (phone && onPhoto && !readOnly) {
    /* (L4 — P-11 · C-09) a phone: Take a photo is the filled one, then Choose files and Create Folder *(invented copy: the help line)* */
    return (
      <div className={styles.card} data-testid="files-empty">
        <div className={styles.inner}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/figma-assets/empty-files.svg" width={180} height={154} alt="" className={styles.art} />
          <div className={styles.texts}>
            <p className={styles.title}>No files yet</p>
            <p className={styles.body}>Take photos on site, or choose files from your phone.</p>
          </div>
          <div className={styles.phoneButtons}>
            {/* (the calm UI build 2026-10-27 — T-03 · 2-04) on a record page the one filled button is the header's: the camera leads, outlined */}
            <Button variant="primary" appearance="outlined" iconStart={<Icon name="photo_camera" size={20} />} onPress={onPhoto} data-kb="create" data-kb-label="Take a photo" data-testid="files-empty-photo">Take a photo</Button>
            <Button variant="secondary" appearance="outlined" iconStart={<Icon name="upload" size={20} />} onPress={onUpload}>Choose files</Button>
            <Button variant="secondary" appearance="outlined" iconStart={<Icon name="create_new_folder" size={20} />} onPress={onCreateFolder}>Create folder</Button>
          </div>
        </div>
      </div>
    )
  }
  return (
    <div className={styles.card} data-testid="files-empty">
      <div className={styles.inner}>
        {/* undraw_photos_09tf — the svg's viewBox is 140×120; scaled to the mock's 180 width the height lands at 154
            (the mock frame is 155 — the 1px is the frame's rounding, the aspect is kept). */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/figma-assets/empty-files.svg" width={180} height={154} alt="" className={styles.art} />
        <div className={styles.texts}>
          {/* (the calm UI build 2026-10-27 — 2-23 · W-159) plain words: what is missing and what to add — never "from your local" */}
          <p className={styles.title}>No files yet</p>
          <p className={styles.body}>{readOnly ? 'The project’s members add its files here.' : 'Upload photos, plans or documents.'}</p>
        </div>
        {readOnly ? null : <div className={styles.buttons}>
          {/* 931:40356 secondary outlined, leading create_new_folder 20 · 931:40357 primary, leading upload 20 — (the calm UI build 2026-10-27 —
              T-03 · 2-04) outlined now: on a record page the screen's one filled button is the header's */}
          <Button variant="secondary" appearance="outlined" iconStart={<Icon name="create_new_folder" size={20} />} onPress={onCreateFolder}>Create folder</Button>
          <Button variant="primary" appearance="outlined" iconStart={<Icon name="upload" size={20} />} onPress={onUpload} data-kb="create" data-kb-label="Upload files">Upload files</Button>   {/* (REG-735) C, while New File steps back */}
        </div>}
      </div>
    </div>
  )
}
