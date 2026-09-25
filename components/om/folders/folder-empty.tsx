'use client'

import type { ReactNode } from 'react'
import { Icon } from '@/components/om/icon'
import styles from './folder-empty.module.css'

/** (REG-664) An open folder with nothing inside says so — the Files tab showed a blank page (no empty-folder mock). */
export function FolderEmpty({ help, children }: { help: string; children?: ReactNode }) {
  return (
    <div className={styles.empty} role="status" data-testid="folder-empty">
      <span className={styles.glyph}><Icon name="folder_open" size={40} weight={300} /></span>
      <span className={styles.title}>This folder is empty</span>
      <span className={styles.help}>{help}</span>
      {children ? <span className={styles.actions}>{children}</span> : null}
    </div>
  )
}
