'use client'

import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import styles from './files-empty.module.css'

/**
 * Lead Details › Files — empty state (frame 87, 931:40314 / card 931:40340; spec design-source/context/lead-files/
 * 01-toolbar-empty-list.txt "Empty state"): 1244×784 card, centred illustration 931:40342 (undraw_photos 180×155 →
 * /figma-assets/empty-files.svg), texts 931:40352, buttons 931:40355 (Create Folder 931:40356 · Upload Files 931:40357).
 * Copied from components/leads/contracts/contracts-empty.tsx with the Files copy and leading-icon buttons.
 */
export function FilesEmpty({ onCreateFolder, onUpload, readOnly = false }: { onCreateFolder: () => void; onUpload: () => void; /** (pending modules S06) Accounting reads only — the card says whose files they are, with no buttons */ readOnly?: boolean }) {
  return (
    <div className={styles.card} data-testid="files-empty">
      <div className={styles.inner}>
        {/* undraw_photos_09tf — the svg's viewBox is 140×120; scaled to the mock's 180 width the height lands at 154
            (the mock frame is 155 — the 1px is the frame's rounding, the aspect is kept). */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/figma-assets/empty-files.svg" width={180} height={154} alt="" className={styles.art} />
        <div className={styles.texts}>
          <p className={styles.title}>{readOnly ? 'No files yet' : 'Add your first files'}</p>
          <p className={styles.body}>{readOnly ? 'The project’s team adds its files here.' : 'Create folders and upload files from your local.'}</p>
        </div>
        {readOnly ? null : <div className={styles.buttons}>
          {/* 931:40356 secondary outlined, leading create_new_folder 20 · 931:40357 primary filled, leading upload 20. */}
          <Button variant="secondary" appearance="outlined" iconStart={<Icon name="create_new_folder" size={20} />} onPress={onCreateFolder}>Create Folder</Button>
          <Button iconStart={<Icon name="upload" size={20} />} onPress={onUpload} data-kb="create" data-kb-label="Upload Files">Upload Files</Button>   {/* (REG-735) C, while New File steps back */}
        </div>}
      </div>
    </div>
  )
}
