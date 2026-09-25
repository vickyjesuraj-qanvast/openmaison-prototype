'use client'

import { Fragment } from 'react'
import { Icon } from '@/components/om/icon'
import { Tooltip } from '@/components/om/tooltip'
import type { FolderNode } from '@/lib/folders'
import styles from './folder-crumbs.module.css'

/**
 * (REG-664) Where you are, inside a folder — the Files tab's breadcrumb row (931:39719: arrow_back 24/Light · "All Files" 16/Regular
 * secondary · "/" · the folder 16/Bold · more_vert 20/Light), grown for folders inside folders: every level on the way is a link, and
 * Back goes up ONE level (it jumped to the top). The open folder's own menu (Move · Rename · Delete) hands its anchor to the host.
 */
export function FolderCrumbs({ root, trail, onGo, onMenu, menuOpen }: {
  /** The top's name: "All Files" · "Quotes" · "My Items". */
  root: string
  /** From the top down to the open folder (the last). */
  trail: FolderNode[]
  /** A crumb or Back: the folder to open, null = the top. */
  onGo: (id: string | null) => void
  onMenu?: (anchor: HTMLElement) => void
  menuOpen?: boolean
}) {
  const here = trail[trail.length - 1]
  if (!here) return null
  const parent = trail[trail.length - 2] ?? null
  const backTo = parent ? parent.name : root
  return (
    <div className={styles.crumbRow} data-testid="folder-crumbs">
      <Tooltip label={`Back to ${backTo}`}>
        <button type="button" className={styles.back} aria-label={`Back to ${backTo}`} onClick={() => onGo(parent?.id ?? null)}>
          <Icon name="arrow_back" size={24} weight={300} />
        </button>
      </Tooltip>
      <nav className={styles.crumb} aria-label="Folder path">
        <button type="button" className={styles.link} onClick={() => onGo(null)}>{root}</button>
        {trail.slice(0, -1).map((f) => (
          <Fragment key={f.id}>
            <span className={styles.sep} aria-hidden>/</span>
            <button type="button" className={styles.link} onClick={() => onGo(f.id)}>{f.name}</button>
          </Fragment>
        ))}
        <span className={styles.sep} aria-hidden>/</span>
        <h2 className={styles.title} aria-current="page">{here.name}</h2>
      </nav>
      {onMenu ? (
        <Tooltip label="Folder actions" disabled={menuOpen}>
          <button type="button" className={styles.kebab} aria-label={`Actions for ${here.name}`} aria-haspopup="menu" aria-expanded={!!menuOpen}
                  onClick={(e) => onMenu(e.currentTarget)}>
            <Icon name="more_vert" size={20} weight={300} />
          </button>
        </Tooltip>
      ) : null}
    </div>
  )
}
