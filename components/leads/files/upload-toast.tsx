'use client'

import { AnimatePresence, motion } from 'motion/react'
import { Icon } from '@/components/om/icon'
import { Tooltip } from '@/components/om/tooltip'
import { snackbarRise } from '@/lib/motion'
import styles from './upload-toast.module.css'

/** One file in the toast: its name, its picture (an object URL — the mock's JPEG for a file that is not one), where it is. */
export type UploadRow = { key: string; name: string; state: 'uploading' | 'done' | 'failed'; thumb?: string | null }

/**
 * Upload toast — the tasks attach-files modal's "Uploading" toast (902:28261, 360×200: dark 56px head + 64px file rows),
 * copied from components/leads/tasks/attach-files-modal.tsx and fixed to the viewport (right 24, above the Maison FAB
 * band — see the module CSS) for the Files tab's upload flow (build plan: "Uploading…" → uploadFile() → done). The Files
 * mocks carry no toast of their own. Rises like every toast (lib/motion snackbarRise).
 * The head reads the mock's "Uploading n files" over its rows, finished or not (the mock's head reads "Uploading 2 files" over a completed
 * row); the thumb is the picked picture itself (F113, audit 2026-09-26) — the mock's JPEG only for a file that is not a picture.
 * (audit 2026-09-26, F205) A refused upload reads Failed and Retry sends the same file again. (wave E, files-12) Once nothing is in flight,
 * a failure says so in the head — "Upload failed" (invented copy; no mock draws a failure).
 * (UX audit 2026-09-30, T2) One row per file — a pick or a drop takes several; past four rows the list scrolls under the head, and the head
 * says how many failed ("1 of 3 uploads failed", invented copy).
 */
export function UploadToast({
  rows, collapsed, onToggle, onClose, onRetry,
}: {
  rows: UploadRow[] | null
  collapsed: boolean
  onToggle: () => void
  onClose: () => void
  onRetry?: (key: string) => void
}) {
  const n = rows?.length ?? 0
  const failed = rows?.filter((r) => r.state === 'failed').length ?? 0
  const settled = !!rows && rows.every((r) => r.state !== 'uploading')
  const title = settled && failed
    ? failed === n ? (n === 1 ? 'Upload failed' : `${n} uploads failed`) : `${failed} of ${n} uploads failed`
    : n === 1 ? 'Uploading 1 file' : `Uploading ${n} files`
  return (
    <AnimatePresence>
      {rows && rows.length ? (
        <motion.div className={styles.toast} data-collapsed={collapsed || undefined} role="status" aria-live="polite"
                    variants={snackbarRise} initial="initial" animate="animate" exit="exit" data-testid="upload-toast">
          <div className={styles.toastHead}>
            <span className={styles.toastTitle}>{title}</span>
            <Tooltip label={collapsed ? 'Expand' : 'Collapse'} side="top">
              <button type="button" className={styles.toastBtn} aria-label={collapsed ? 'Expand' : 'Collapse'} aria-expanded={!collapsed}
                      onClick={onToggle}>
                <Icon name={collapsed ? 'keyboard_arrow_up' : 'keyboard_arrow_down'} size={24} />
              </button>
            </Tooltip>
            <Tooltip label="Dismiss" side="top">
              <button type="button" className={styles.toastBtn} aria-label="Dismiss upload status" onClick={onClose}>
                <Icon name="close" size={24} />
              </button>
            </Tooltip>
          </div>
          {collapsed ? null : (
            <div className={styles.toastRows}>
              {rows.map((row) => (
                <div key={row.key} className={styles.toastRow} data-state={row.state}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={row.thumb ?? '/figma-assets/file-thumb-1.png'} alt="" className={styles.toastThumb} width={40} height={40} />
                  <span className={styles.toastFile}>{row.name}</span>
                  {row.state === 'uploading' ? (
                    <>
                      <span className={styles.toastStatus}>Uploading...</span>
                      <span className={`${styles.toastIcon} ${styles.spin}`}><Icon name="progress_activity" size={20} /></span>
                    </>
                  ) : row.state === 'failed' ? (
                    <>
                      <span className={styles.toastFailed}>Failed</span>
                      <Tooltip label="Retry upload" side="top">
                        <button type="button" className={styles.toastRetry} aria-label={`Retry uploading ${row.name}`} onClick={() => onRetry?.(row.key)}>
                          <Icon name="refresh" size={20} />
                        </button>
                      </Tooltip>
                    </>
                  ) : (
                    <span className={styles.toastIcon}><Icon name="check_circle" size={20} fill /></span>
                  )}
                </div>
              ))}
            </div>
          )}
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
