'use client'

import type { ReactNode } from 'react'
import { Checkbox } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { Tooltip } from '@/components/om/tooltip'
import styles from './folder-card.module.css'

/**
 * (REG-664) The Files tab's folder card (931:39089, 299×56: folder 24 · name 14/Semi Bold over "n items" 10/Regular · more_vert 24/Light,
 * fill #f2f2f2 r4, selected #eee5ff) and its Folders group (931:39084: head checkbox + "Folders", then the cards) — one piece for the Files
 * tab and every library that files its entries. A click opens the folder everywhere (REG-544); selection is the checkbox that takes the
 * folder icon's place on hover and while selected (inline on a touch pointer, REG-273); the kebab hands its anchor to the host, which
 * opens the folder's menu through the portal (Open · Move · Rename · Delete).
 */
export function FolderGroup({ label = 'Folders', ids, selected, onSelect, rowClassName, min, children }: {
  label?: string
  /** The group's folder ids — the head checkbox selects or clears them all. */
  ids: string[]
  selected?: Set<string>
  /** Omitted = no selection (a viewer with nothing to do in bulk). */
  onSelect?: (next: Set<string>) => void
  /** The host's own class for the row. */
  rowClassName?: string
  /** The narrowest card, so the folders line up with the host's cards below them (the galleries' 248). */
  min?: number
  children: ReactNode
}) {
  const on = selected ? ids.filter((id) => selected.has(id)).length : 0
  const all = ids.length > 0 && on === ids.length
  const toggle = () => {
    if (!selected || !onSelect) return
    const next = new Set(selected)
    ids.forEach((id) => (all ? next.delete(id) : next.add(id)))
    onSelect(next)
  }
  return (
    <div className={styles.group} role="group" aria-label={label}>
      <div className={styles.groupHead}>
        {onSelect ? <Checkbox isSelected={all} isIndeterminate={on > 0 && !all} onChange={toggle} aria-label={`Select all ${label.toLowerCase()}`} /> : null}
        <span className={styles.groupTitle}>{label}</span>
      </div>
      <div className={`${styles.row} ${rowClassName ?? ''}`} style={min ? ({ '--folder-min': `${min}px`, '--folder-min-narrow': `${min}px` } as React.CSSProperties) : undefined}>{children}</div>
    </div>
  )
}

export function FolderCard({ name, count, selected, onToggle, onOpen, onMenu, menuOpen }: {
  name: string
  /** "3 items" · "1 template" */
  count: string
  selected?: boolean
  onToggle?: () => void
  onOpen: () => void
  onMenu?: (anchor: HTMLElement) => void
  menuOpen?: boolean
}) {
  return (
    <div className={styles.folder} data-testid="folder-card" data-selected={selected || undefined} data-kb-row data-kb-id={`folder:${name}`}>
      {onToggle ? <span className={styles.pick} data-kb-select><Checkbox isSelected={!!selected} onChange={onToggle} aria-label={`Select ${name}`} /></span> : null}
      <button type="button" className={styles.folderMain} aria-label={`Open ${name}`} onClick={onOpen} data-kb-open>
        <Icon name="folder" size={24} className={styles.folderIcon} />
        <span className={styles.folderTexts}>
          <span className={styles.folderName}>{name}</span>
          <span className={styles.folderCount}>{count}</span>
        </span>
      </button>
      {onMenu ? (
        <span className={styles.menuWrap}>
          <Tooltip label="Folder actions" disabled={menuOpen}>
            <button type="button" className={styles.kebab} aria-label={`Actions for ${name}`} aria-haspopup="menu" aria-expanded={!!menuOpen}
                    onClick={(e) => onMenu(e.currentTarget)}>
              <Icon name="more_vert" size={24} weight={300} />
            </button>
          </Tooltip>
        </span>
      ) : null}
    </div>
  )
}
