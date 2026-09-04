'use client'

import type { ReactNode } from 'react'
import styles from './page-header.module.css'
import { useWindowScrolled } from './use-window-scrolled'

export function PageHeader({ title, actions }: { title: string; actions?: ReactNode }) {
  const scrolled = useWindowScrolled()   // (REG-331) the plate takes level-1 only while content scrolls under it
  return (
    <header className={styles.header} data-scrolled={scrolled || undefined}>
      <h1 className={styles.title}>{title}</h1>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </header>
  )
}
