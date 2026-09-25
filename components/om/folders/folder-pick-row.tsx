'use client'

import { Icon } from '@/components/om/icon'
import styles from './folder-pick-row.module.css'

/** (REG-664) A folder in a picker's list — the Move dialog's folder row (931:39219: folder 24 · name · keyboard_arrow_right 24/Light,
    hover #f2f2f2), with what it holds; a press opens it. */
export function FolderPickRow({ name, holds, onOpen }: { name: string; holds: string; onOpen: () => void }) {
  return (
    <button type="button" className={styles.row} onClick={onOpen} aria-label={`Open folder ${name}`} data-testid="folder-pick-row">
      <Icon name="folder" size={24} className={styles.icon} />
      <span className={styles.text}><span className={styles.name}>{name}</span><span className={styles.holds}>{holds}</span></span>
      <Icon name="keyboard_arrow_right" size={24} weight={300} className={styles.icon} />
    </button>
  )
}
