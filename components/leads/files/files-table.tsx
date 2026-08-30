'use client'

import { useState } from 'react'
import { Checkbox, Tag } from '@/components/ds'
import { Avatar } from '@/components/om/avatar'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { useComingSoon } from '@/components/om/snackbar'
import { Tooltip } from '@/components/om/tooltip'
import { displayDate, fileSize } from '@/lib/format'
import { fileTypeLabel, isFolder, type FileRow } from '@/lib/leads/file-model'
import { FileMenu, FolderMenu, type FileAction, type FolderAction } from './files-grid'
import styles from './files-table.module.css'

export type FilesTableProps = {
  rows: FileRow[]
  selected: Set<string>
  /** The parent owns the selection; the table hands back the next set. */
  onSelect: (ids: Set<string>) => void
  onOpenFolder: (folder: FileRow) => void
  onOpenFile: (file: FileRow) => void
  /** A folder row offers the folder items (FolderAction), a file row the file items (FileAction). */
  onRowMenu: (row: FileRow, action: FileAction | FolderAction) => void
}

/* Column order + head copy — exactly as the mock types it (931:40168, spec 01-toolbar-empty-list.txt "List view"). Every head carries unfold_more 16. */
const HEADS: { key: string; label: string; col: string | undefined }[] = [
  { key: 'title', label: 'Title', col: styles.colTitle },
  { key: 'owner', label: 'Owner', col: styles.colOwner },
  { key: 'updated', label: 'Updated', col: styles.colUpdated },
  { key: 'type', label: 'File type', col: styles.colType },
  { key: 'size', label: 'File size', col: styles.colSize },
  { key: 'attached', label: 'Attached to', col: styles.colAttached },
]

/**
 * Lead Details › Files — list view (frame 90, table 931:40167; spec design-source/context/lead-files/
 * 01-toolbar-empty-list.txt "List view"). Head 56 (931:40168) · rows 60 (931:40181 photo / 931:40194 folder); columns
 * 40 · 420 (fluid) · 240 · 116 · 119 · 114 · 195 = 1244 as ONE CSS grid with subgrid rows (the Quotes/Contracts pattern,
 * REG-180 — components/leads/contracts/contracts-table.module.css). Title cell: 48×36 thumb box + name 14/Medium +
 * comment chip 34×24; Owner: Avatar 24 + name; Updated; File type; File size ("--" for folders); Attached to: Tag "Task" / "--".
 * No hover state is mocked: the row kebab (the tile's menu) sits at the row's right edge, visible on hover — the Quotes
 * hover pattern (.actions/.float) with the kebab only (build plan, logged). Sorting is inert (coming soon).
 */
export function FilesTable({ rows, selected, onSelect, onOpenFolder, onOpenFile, onRowMenu }: FilesTableProps) {
  const comingSoon = useComingSoon()
  const [menuRow, setMenuRow] = useState<string | null>(null)

  const ids = rows.map((r) => r.id)
  const on = ids.filter((id) => selected.has(id)).length
  const allSelected = ids.length > 0 && on === ids.length
  const someSelected = on > 0 && on < ids.length

  const toggle = (id: string) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id); else next.add(id)
    onSelect(next)
  }
  /** Head checkbox: everything selected → clear; otherwise select every row (the grid's group-head rule). */
  const toggleAll = () => {
    const next = new Set(selected)
    ids.forEach((id) => (allSelected ? next.delete(id) : next.add(id)))
    onSelect(next)
  }

  return (
    <div className={styles.card} role="table" aria-label="Files">
      {/* Head row 56 (931:40168 Type=HD): Selection p16/0/16/16 + six sortable heads p16/24/16/16. */}
      <div className={styles.head} role="row">
        <div className={`${styles.hCell} ${styles.colSel}`} role="columnheader">
          <Checkbox isSelected={allSelected} isIndeterminate={someSelected} isDisabled={rows.length === 0} onChange={toggleAll} aria-label="Select all files" />
        </div>
        {HEADS.map((h) => (
          <div key={h.key} className={`${styles.hCell} ${h.col ?? ''}`} role="columnheader">
            {/* Sort is inert in this prototype — the head answers coming soon. */}
            <button type="button" className={styles.hSort} onClick={comingSoon}>
              <span className={styles.hLabel}>{h.label}</span>
              <Icon name="unfold_more" size={16} />
            </button>
          </div>
        ))}
      </div>

      {rows.map((row, idx) => (
        <FileRowView
          key={row.id}
          row={row}
          isSelected={selected.has(row.id)}
          onToggle={() => toggle(row.id)}
          menuOpen={menuRow === row.id}
          onMenuToggle={() => setMenuRow((m) => (m === row.id ? null : row.id))}
          onMenuClose={() => setMenuRow(null)}
          /* Kebab flips up on the last two rows of a 3+ row table — the leads / tasks / quotes table rule. */
          menuSide={rows.length >= 3 && idx >= rows.length - 2 ? 'up' : 'down'}
          onOpenFolder={onOpenFolder} onOpenFile={onOpenFile} onRowMenu={onRowMenu}
        />
      ))}
    </div>
  )
}

/* ---------------------------------------------------------------------------------------------- */

function FileRowView({
  row, isSelected, onToggle,
  menuOpen, onMenuToggle, onMenuClose, menuSide,
  onOpenFolder, onOpenFile, onRowMenu,
}: {
  row: FileRow
  isSelected: boolean
  onToggle: () => void
  menuOpen: boolean
  onMenuToggle: () => void
  onMenuClose: () => void
  menuSide: 'up' | 'down'
  onOpenFolder: (folder: FileRow) => void
  onOpenFile: (file: FileRow) => void
  onRowMenu: (row: FileRow, action: FileAction | FolderAction) => void
}) {
  const folder = isFolder(row)
  const open = () => (folder ? onOpenFolder(row) : onOpenFile(row))
  const pick = (action: FileAction | FolderAction) => { onMenuClose(); onRowMenu(row, action) }

  return (
    <div className={styles.row} role="row" data-selected={isSelected || undefined} data-kind={folder ? 'folder' : 'file'}>
      {/* Selection cell 40×60 (931:40181 "Cell / Selection" H g12 p12/0/12/16, top rule). */}
      <div className={`${styles.cell} ${styles.colSel}`} role="cell">
        <Checkbox isSelected={isSelected} onChange={onToggle} aria-label={`Select ${row.name}`} />
      </div>

      {/* Title cell "Cell / Two line" 420×60 H g12 p12/24/12/16: thumb 48×36 (fill #f2f2f2 r2 — image cover, or folder 24
          centred) + name 14/Medium + comment chip 34×24 (only with comments). The name opens the row. */}
      <div className={`${styles.cell} ${styles.colTitle}`} role="cell">
        <span className={styles.thumb} aria-hidden>
          {folder ? (
            <Icon name="folder" size={24} className={styles.thumbIcon} />
          ) : row.thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={row.thumb} alt="" className={styles.thumbImg} width={48} height={36} />
          ) : (
            /* No thumbnail (a PDF): the kind's glyph in the same box (spec silent — the grid tile's fallback). */
            <Icon name="picture_as_pdf" size={24} className={styles.thumbIcon} />
          )}
        </span>
        <button type="button" className={styles.name} onClick={open}>{row.name}</button>
        {row.commentCount > 0 ? (
          <span className={styles.chip} aria-label={`${row.commentCount} ${row.commentCount === 1 ? 'comment' : 'comments'}`}>
            <Icon name="comment" size={16} weight={300} />
            <span className={styles.chipCount}>{row.commentCount}</span>
          </span>
        ) : null}
      </div>

      {/* Owner "Cell / One line" 240 H g12: Avatar Generic 24 + "James" 14/Regular. No owner → "--" (spec silent; the
          File size column's empty mark reused). */}
      <div className={`${styles.cell} ${styles.colOwner}`} role="cell">
        {row.owner ? (
          <>
            <Avatar name={row.owner.name} color={row.owner.color} size={24} />
            <span className={styles.oneLine}>{row.owner.name}</span>
          </>
        ) : '--'}
      </div>

      {/* Updated "17 Jul ‘26" · File type "JPEG" / "Folder" · File size "711 KB" / "--" (frame 104 folder row). */}
      <div className={`${styles.cell} ${styles.colUpdated}`} role="cell">{displayDate(row.updatedAt ?? row.createdAt)}</div>
      <div className={`${styles.cell} ${styles.colType}`} role="cell">{fileTypeLabel(row)}</div>
      <div className={`${styles.cell} ${styles.colSize}`} role="cell">{folder ? '--' : fileSize(row.sizeBytes)}</div>

      {/* Attached to: Tag Outlined Default "Task" (931:40181) or "--" (the mock repeats "Task" as a placeholder; the
          model's attachedTo decides). */}
      <div className={`${styles.cell} ${styles.colAttached}`} role="cell">
        {row.attachedTo ? <Tag appearance="outlined">{row.attachedTo}</Tag> : '--'}
      </div>

      {/* Row kebab — not mocked for the list; the tile's kebab at the row's right edge on hover (Quotes .actions/.float,
          kebab only, no View): right 24, top (60 − 36) / 2 = 12. */}
      <span className={styles.actions} data-open={menuOpen || undefined}>
        <span className={styles.menuWrap}>
          <span className={styles.float}>
            <Tooltip label={folder ? 'Folder actions' : 'File actions'} disabled={menuOpen}>
              <IconButton icon="more_vert" label={`Actions for ${row.name}`} variant="primary"
                          aria-haspopup="menu" aria-expanded={menuOpen} onClick={onMenuToggle} />
            </Tooltip>
          </span>
          {folder
            ? <FolderMenu open={menuOpen} onClose={onMenuClose} onPick={pick} side={menuSide} />
            : <FileMenu open={menuOpen} onClose={onMenuClose} onPick={pick} side={menuSide} />}
        </span>
      </span>
    </div>
  )
}
