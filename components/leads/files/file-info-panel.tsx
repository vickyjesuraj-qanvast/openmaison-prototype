'use client'

import { Icon } from '@/components/om/icon'
import { Tooltip } from '@/components/om/tooltip'
import { displayDate, fileSize } from '@/lib/format'
import { fileTypeLabel, type FileRow } from '@/lib/leads/file-model'
import type { Member } from '@/lib/db/schema'
import styles from './file-info-panel.module.css'

/**
 * Viewer › Information panel (frame 94, 931:39953): head 64 "Information" + close (931:39921), body p24 (931:39990) —
 * one block of label / value rows 20 tall, 16 apart: Owner · Uploaded · Modified · File type · File size · Location.
 * Owner reads "You" for the signed-in member; Location reads "Files" at the root, else the folder's name.
 * Spec: design-source/context/lead-files/03-viewer-panels.txt.
 */
export function FileInfoPanel({ file, folder, me, onClose }: { file: FileRow; folder: FileRow | null; me: Member; onClose: () => void }) {
  const rows: [string, string][] = [
    ['Owner', file.owner ? (file.owner.id === me.id ? 'You' : file.owner.name) : '--'],   /* no owner is not mocked → the list's "--" */
    ['Uploaded', displayDate(file.createdAt)],
    ['Modified', displayDate(file.updatedAt ?? file.createdAt)],
    ['File type', fileTypeLabel(file)],
    ['File size', fileSize(file.sizeBytes)],
    ['Location', folder ? folder.name : 'Files'],
  ]
  return (
    <div className={styles.panel}>
      <div className={styles.head}>
        <h2 className={styles.title}>Information</h2>
        <Tooltip label="Close">
          <button type="button" className={styles.close} aria-label="Close" onClick={onClose}>
            <Icon name="close" size={24} />
          </button>
        </Tooltip>
      </div>
      <div className={styles.body}>
        <dl className={styles.block}>
          {rows.map(([label, value]) => (
            <div key={label} className={styles.row}>
              <dt className={styles.label}>{label}</dt>
              <dd className={styles.value}>{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  )
}
