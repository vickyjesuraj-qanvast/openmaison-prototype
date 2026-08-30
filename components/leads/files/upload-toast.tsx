'use client'

import { AnimatePresence, motion } from 'motion/react'
import { Icon } from '@/components/om/icon'
import { Tooltip } from '@/components/om/tooltip'
import { snackbarRise } from '@/lib/motion'
import styles from './upload-toast.module.css'

/**
 * Upload toast — the tasks attach-files modal's "Uploading" toast (902:28261, 360×200: dark 56px head + 64px file row),
 * copied from components/leads/tasks/attach-files-modal.tsx and fixed to the viewport (right 24, above the Maison FAB
 * band — see the module CSS) for the Files tab's upload flow (build plan: "Uploading…" → uploadFile() → done). The Files
 * mocks carry no toast of their own. Rises like every toast (lib/motion snackbarRise).
 * Head copy is the mock's static "Uploading 1 file" in both states (the mock's head reads "Uploading 2 files" over a
 * completed row); the thumb is the mock's JPEG — the picked file becomes "Living Room" (REG-149).
 * The twin's "Failed" + retry row is left out: nothing in this flow can fail.
 */
export function UploadToast({
  toast, collapsed, onToggle, onClose,
}: {
  toast: { name: string; state: 'uploading' | 'done' } | null
  collapsed: boolean
  onToggle: () => void
  onClose: () => void
}) {
  return (
    <AnimatePresence>
      {toast ? (
        <motion.div className={styles.toast} data-collapsed={collapsed || undefined} role="status" aria-live="polite"
                    variants={snackbarRise} initial="initial" animate="animate" exit="exit">
          <div className={styles.toastHead}>
            <span className={styles.toastTitle}>Uploading 1 file</span>
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
            <div className={styles.toastRow} data-state={toast.state}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/figma-assets/file-thumb-1.png" alt="" className={styles.toastThumb} width={40} height={40} />
              <span className={styles.toastFile}>{toast.name}</span>
              {toast.state === 'uploading' ? (
                <>
                  <span className={styles.toastStatus}>Uploading...</span>
                  <span className={`${styles.toastIcon} ${styles.spin}`}><Icon name="progress_activity" size={20} /></span>
                </>
              ) : (
                <span className={styles.toastIcon}><Icon name="check_circle" size={20} fill /></span>
              )}
            </div>
          )}
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
