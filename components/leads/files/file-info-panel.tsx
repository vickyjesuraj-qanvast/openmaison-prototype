'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { SurfaceHead } from '@/components/om/dialog'
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
export function FileInfoPanel({ file, folder, me, onClose, origin = null, headless = false }: { file: FileRow; folder: FileRow | null; me: Member; onClose: () => void
  /** `href` null: the render's design was deleted forever — the From line stays, as words. */
  origin?: { render: RenderOrigin; href: string | null } | null
  /** (Leads on the move, L4 — C-23) Inside a phone's sheet, whose head is the sheet's own: the rows only. */
  headless?: boolean }) {
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
  if (headless) {
    return (
      <dl className={`${styles.block} ${styles.sheetBlock}`} data-testid="file-info-rows">
        {rows.map(([label, value]) => (
          <div key={label} className={styles.row}>
            <dt className={styles.label}>{label}</dt>
            <dd className={styles.value}>{value}</dd>
          </div>
        ))}
      </dl>
    )
  }
  return (
    <div className={styles.panel}>
      {/* (REG-725) the house head (components/om/dialog.tsx): 64 with its rule inside, the outlined bare close — as the Comments panel's. */}
      <SurfaceHead title="Information" onClose={onClose} className={styles.head} />
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
