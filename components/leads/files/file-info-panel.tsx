'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { Icon } from '@/components/om/icon'
import { Tooltip } from '@/components/om/tooltip'
import { displayDate, fileSize } from '@/lib/format'
import { fileTypeLabel, type FileRow } from '@/lib/leads/file-model'
import type { Member } from '@/lib/db/schema'
import type { RenderOrigin } from '@/lib/visualizer/queries'
import { renderFromLine } from './render-origin'
import styles from './file-info-panel.module.css'

/**
 * Viewer › Information panel (frame 94, 931:39953): head 64 "Information" + close (931:39921), body p24 (931:39990) —
 * one block of label / value rows 20 tall, 16 apart: Owner · Uploaded · Modified · File type · File size · Location.
 * Owner reads "You" for the signed-in member; Location reads "Files" at the root, else the folder's name.
 * Spec: design-source/context/lead-files/03-viewer-panels.txt.
 * (F113, audit 2026-09-26) A render filed from the AI Visualizer adds one row, From, naming its design version — a link that opens it.
 */
export function FileInfoPanel({ file, folder, me, onClose, origin = null }: { file: FileRow; folder: FileRow | null; me: Member; onClose: () => void
  /** `href` null: the render's design was deleted forever — the From line stays, as words. */
  origin?: { render: RenderOrigin; href: string | null } | null }) {
  const rows: [string, ReactNode][] = [
    ['Owner', file.owner ? (file.owner.id === me.id ? 'You' : file.owner.name) : '--'],   /* no owner is not mocked → the list's "--" */
    ['Uploaded', displayDate(file.createdAt)],
    ['Modified', displayDate(file.updatedAt ?? file.createdAt)],
    ['File type', fileTypeLabel(file)],
    ['File size', fileSize(file.sizeBytes)],
    ['Location', folder ? folder.name : 'Files'],
    ...(origin ? [['From', origin.href
      ? <Link key="from" href={origin.href} className={styles.link} data-testid="file-info-origin">{renderFromLine(origin.render)}</Link>
      : <span key="from" data-testid="file-info-origin">{renderFromLine(origin.render)}</span>] as [string, ReactNode]] : []),
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
