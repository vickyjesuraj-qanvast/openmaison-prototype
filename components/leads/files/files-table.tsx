'use client'

import { useState } from 'react'
import { Checkbox, Tag } from '@/components/ds'
import { menuSideFor } from '@/components/leads/menu-side'
import { Avatar } from '@/components/om/avatar'
import { ColumnResizer, useColumnWidths } from '@/components/om/column-resize'
import { gridTemplateFor, useColumnLayout, type TableColumn, type TableColumnDef } from '@/components/om/table-columns'
import { useColumnDrag } from '@/components/om/column-drag'
import { useOverflowX } from '@/components/om/use-overflow-x'
import { useRef } from 'react'
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
  /** The comment chip: the viewer with the comments panel open (the Tasks chip's interaction, REG-253). */
  onOpenComments: (file: FileRow) => void
  /** A folder row offers the folder items (FolderAction), a file row the file items (FileAction). */
  onRowMenu: (row: FileRow, action: FileAction | FolderAction) => void
  columns: readonly TableColumn[]
  /** A head dropped in a new place — the visible keys in their new order (useTableColumns.reorder). */
  onReorder: (keys: string[]) => void
  /** (REG-664) While searching: where each hit lives — a line under its name (the cell is the mock's "Two line"). */
  placeOf?: (f: FileRow) => string
  /** (F095) The file menu's AI Visualizer item for a picture (files-grid `visualizeLabel`). */
  visualizeLabel?: (f: FileRow) => string | null
}

/* Column order + head copy — exactly as the mock types it (931:40168, spec 01-toolbar-empty-list.txt "List view"). Every head carries unfold_more 16. */
/** The card's mocked tracks (files-table.module.css) — the user's dragged widths replace them (REG-427). */
/** The list's columns (931:40168, spec 01): Title locked first; the user's order, visibility and pins come from Column settings (REG-454). */
export const FILE_COLUMN_DEFS: readonly TableColumnDef[] = [
  { key: 'title', label: 'Title', track: 'minmax(418px, 1fr)', locked: true },
  { key: 'owner', label: 'Owner', track: '240px' },
  { key: 'updated', label: 'Updated', track: '116px' },
  { key: 'type', label: 'File type', track: '119px' },
  { key: 'size', label: 'File size', track: '114px' },
  { key: 'attached', label: 'Attached to', track: '195px' },
]
/* (REG-468) No sort glyph where ordering means nothing — see the sort audit of 2026-09-16. */
const SORTABLE: Record<string, boolean> = { owner: false, type: false, attached: false }
const COL_CLASS: Record<string, string | undefined> = { title: styles.colTitle, owner: styles.colOwner, updated: styles.colUpdated, type: styles.colType, size: styles.colSize, attached: styles.colAttached }

/**
 * Lead Details › Files — list view (frame 90, table 931:40167; spec design-source/context/lead-files/
 * 01-toolbar-empty-list.txt "List view"). Head 56 (931:40168) · rows 60 (931:40181 photo / 931:40194 folder); columns
 * 40 · 420 (fluid) · 240 · 116 · 119 · 114 · 195 = 1244 as ONE CSS grid with subgrid rows (the Quotes/Contracts pattern,
 * REG-180 — components/leads/contracts/contracts-table.module.css). Title cell: 48×36 thumb box + name 14/Medium +
 * comment chip 34×24; Owner: Avatar 24 + name; Updated; File type; File size ("--" for folders); Attached to: Tag "Task" / "--".
 * No hover state is mocked: the row kebab (the tile's menu) sits at the row's right edge, visible on hover — the Quotes
 * hover pattern (.actions/.float) with the kebab only (build plan, logged). Sorting is inert (coming soon).
 */
export function FilesTable({ rows, selected, onSelect, onOpenFolder, onOpenFile, onOpenComments, onRowMenu, columns, onReorder, placeOf, visualizeLabel }: FilesTableProps) {
  const comingSoon = useComingSoon()
  const [menuRow, setMenuRow] = useState<string | null>(null)
  /* (REG-286) Measured on open, exactly as the Quotes / Contracts twins do — only one row menu is open at a time. */
  const [menuSide, setMenuSide] = useState<'up' | 'down'>('down')

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

  /* ≤1024 the card is the table's own horizontal scroller (REG-269) and `data-scrolled` lifts the frozen
     column's shadow — the listing's one-liner (components/leads/table.tsx .scroller); at rest the 1px edge
     is all that shows, and no React state is touched on scroll. */
  const colWidths = useColumnWidths('lead-files')
  const tracks = gridTemplateFor(columns, colWidths, '40px')
  const headRow = useRef<HTMLDivElement>(null)
  const L0 = useColumnLayout(columns, headRow, { leading: 40 })
  const D = useColumnDrag(columns, onReorder)   /* drag a head to reorder (REG-462) */
  const L = { ...L0, style: (key: string) => ({ ...L0.style(key), ...D.style(key) }) }   /* (REG-614) every cell rides the drag's transform, so the whole column travels — the Items grid's rule (REG-572) */
  const [frame, overflowing] = useOverflowX()   // REG-430: the card scrolls sideways only once its tracks run past it
  return (
    <div ref={frame} className={styles.card} role="table" data-drag-root="" aria-label="Files" data-kb-list="file" data-cols="lead-files" data-overflow={overflowing || undefined}
         style={{ '--tracks': tracks } as React.CSSProperties}
         onScroll={(e) => e.currentTarget.toggleAttribute('data-scrolled', e.currentTarget.scrollLeft > 0)}>
      {/* Head row 56 (931:40168 Type=HD): Selection p16/0/16/16 + six sortable heads p16/24/16/16. */}
      <div ref={headRow} className={styles.head} role="row">
        <div className={`${styles.hCell} ${styles.colSel} ${styles.pin}`} role="columnheader" data-col="sel" data-kb-select-all data-pin-edge={L.edge('sel') || undefined} style={L.style('sel')}>
          <Checkbox isSelected={allSelected} isIndeterminate={someSelected} isDisabled={rows.length === 0} onChange={toggleAll} aria-label="Select all files" />
        </div>
        {columns.map((c) => (
          <div key={c.key} className={`${styles.hCell} ${COL_CLASS[c.key] ?? ''} ${c.pinned ? styles.pin : ''}`} role="columnheader" data-col={c.key} data-pin-edge={L.edge(c.key) || undefined} style={L.style(c.key)} {...D.head(c.key)}>
            {SORTABLE[c.key] === false ? (
              <span className={styles.hLabel}>{c.label}</span>
            ) : (
              /* Sort is inert in this prototype — the head answers coming soon. */
              <button type="button" className={styles.hSort} onClick={comingSoon}>
                <span className={styles.hLabel}>{c.label}</span>
                <Icon name="unfold_more" size={16} />
              </button>
            )}
            <ColumnResizer table="lead-files" column={c.key} label={c.label} min={c.key === 'title' ? 160 : 72} />
          </div>
        ))}
      </div>

      {rows.map((row) => (
        <FileRowView L={L}
          key={row.id}
          row={row}
          isSelected={selected.has(row.id)}
          onToggle={() => toggle(row.id)}
          menuOpen={menuRow === row.id}
          onMenuToggle={(trigger) => {
            /* (REG-286) This table still counted rows: with three files the last two kebabs opened UPWARD, over the
               toolbar and the tab strip, with half a screen free below them. The side is now measured off the
               trigger and this menu's real height (components/leads/menu-side.ts) — six items for a file, four for
               a folder. */
            if (menuRow !== row.id) setMenuSide(menuSideFor(trigger, isFolder(row) ? 4 : visualizeLabel?.(row) ? 7 : 6))
            setMenuRow((m) => (m === row.id ? null : row.id))
          }}
          onMenuClose={() => setMenuRow(null)}
          menuSide={menuSide}
          onOpenFolder={onOpenFolder} onOpenFile={onOpenFile} onOpenComments={onOpenComments} onRowMenu={onRowMenu}
          place={placeOf?.(row)} visualize={visualizeLabel?.(row) ?? null}
        />
      ))}
    </div>
  )
}

/* ---------------------------------------------------------------------------------------------- */

function FileRowView({
  row, isSelected, onToggle,
  menuOpen, onMenuToggle, onMenuClose, menuSide,
  onOpenFolder, onOpenFile, onOpenComments, onRowMenu, L, place, visualize,
}: {
  row: FileRow
  isSelected: boolean
  onToggle: () => void
  menuOpen: boolean
  /** (REG-286) Hands the kebab up so the parent can measure which way its menu fits (menu-side.ts). */
  onMenuToggle: (trigger: HTMLElement) => void
  onMenuClose: () => void
  menuSide: 'up' | 'down'
  onOpenFolder: (folder: FileRow) => void
  onOpenFile: (file: FileRow) => void
  onOpenComments: (file: FileRow) => void
  onRowMenu: (row: FileRow, action: FileAction | FolderAction) => void
  L: ReturnType<typeof useColumnLayout>
  place?: string
  visualize: string | null
}) {
  const folder = isFolder(row)
  const open = () => (folder ? onOpenFolder(row) : onOpenFile(row))
  const pick = (action: FileAction | FolderAction) => { onMenuClose(); onRowMenu(row, action) }

  return (
    <div className={styles.row} role="row" data-kb-row data-kb-id={row.id} data-selected={isSelected || undefined} data-kind={folder ? 'folder' : 'file'}>
      {/* Selection cell 40×60 (931:40181 "Cell / Selection" H g12 p12/0/12/16, top rule). */}
      <div className={`${styles.cell} ${styles.colSel} ${styles.pin}`} role="cell" data-col="sel" data-kb-select data-pin-edge={L.edge('sel') || undefined} style={L.style('sel')}>
        <Checkbox isSelected={isSelected} onChange={onToggle} aria-label={`Select ${row.name}`} />
      </div>

      {/* Title cell "Cell / Two line" 420×60 H g12 p12/24/12/16: thumb 48×36 (fill #f2f2f2 r2 — image cover, or folder 24
          centred) + name 14/Medium + comment chip 34×24 (only with comments). The name opens the row. */}
      <div className={`${styles.cell} ${styles.colTitle} ${L.pinned('title') ? styles.pin : ''}`} role="cell" data-col="title" data-pin-edge={L.edge('title') || undefined} style={L.style('title')}>
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
        {place !== undefined ? (
          <span className={styles.nameStack}>
            <button type="button" className={styles.name} onClick={open} data-kb-open>{row.name}</button>
            <span className={styles.place}><Icon name="folder" size={14} weight={300} />{place}</span>
          </span>
        ) : <button type="button" className={styles.name} onClick={open} data-kb-open>{row.name}</button>}
        {/* The chip opens the viewer's comments panel straight away — the Tasks title cell's interaction (REG-253). */}
        {row.commentCount > 0 ? (
          <Tooltip label="Open comments">
            <button type="button" className={styles.chip} data-action=""
                    aria-label={`Open ${row.commentCount} ${row.commentCount === 1 ? 'comment' : 'comments'} on ${row.name}`}
                    onClick={() => onOpenComments(row)}>
              <Icon name="comment" size={16} weight={300} />
              <span className={styles.chipCount}>{row.commentCount}</span>
            </button>
          </Tooltip>
        ) : null}
      </div>

      {/* Owner "Cell / One line" 240 H g12: Avatar Generic 24 + "James" 14/Regular. No owner → "--" (spec silent; the
          File size column's empty mark reused). */}
      <div className={`${styles.cell} ${styles.colOwner} ${L.pinned('owner') ? styles.pin : ''}`} role="cell" data-col="owner" data-pin-edge={L.edge('owner') || undefined} style={L.style('owner')}>
        {row.owner ? (
          <>
            <Avatar name={row.owner.name} color={row.owner.color} size={24} tooltip={false} />
            <span className={styles.oneLine}>{row.owner.name}</span>
          </>
        ) : '--'}
      </div>

      {/* Updated "17 Jul ‘26" · File type "JPEG" / "Folder" · File size "711 KB" / "--" (frame 104 folder row). */}
      <div className={`${styles.cell} ${styles.colUpdated} ${L.pinned('updated') ? styles.pin : ''}`} role="cell" data-col="updated" data-pin-edge={L.edge('updated') || undefined} style={L.style('updated')}>{displayDate(row.updatedAt ?? row.createdAt)}</div>
      <div className={`${styles.cell} ${styles.colType} ${L.pinned('type') ? styles.pin : ''}`} role="cell" data-col="type" data-pin-edge={L.edge('type') || undefined} style={L.style('type')}>{fileTypeLabel(row)}</div>
      <div className={`${styles.cell} ${styles.colSize} ${L.pinned('size') ? styles.pin : ''}`} role="cell" data-col="size" data-pin-edge={L.edge('size') || undefined} style={L.style('size')}>{folder ? '--' : fileSize(row.sizeBytes)}</div>

      {/* Attached to: Tag Outlined Default "Task" (931:40181) or "--" (the mock repeats "Task" as a placeholder; the
          model's attachedTo decides). */}
      <div className={`${styles.cell} ${styles.colAttached} ${L.pinned('attached') ? styles.pin : ''}`} role="cell" data-col="attached" data-pin-edge={L.edge('attached') || undefined} style={L.style('attached')}>
        {row.attachedTo ? <Tag appearance="outlined">{row.attachedTo}</Tag> : '--'}
      </div>

      {/* Row kebab — not mocked for the list; the tile's kebab at the row's right edge on hover (Quotes .actions/.float,
          kebab only, no View): right 24, top (60 − 36) / 2 = 12. */}
      <span className={styles.actions} data-open={menuOpen || undefined}>
        <span className={styles.actionsInner}>
        <span className={styles.menuWrap}>
          <span className={styles.float}>
            {/* (REG-273) `touchBtn` takes this 36px button to a 40px box at ≤767; the glyph keeps its size. */}
            <Tooltip label={folder ? 'Folder actions' : 'File actions'} disabled={menuOpen}>
              <IconButton icon="more_vert" label={`Actions for ${row.name}`} variant="primary" className={styles.touchBtn}
                          aria-haspopup="menu" aria-expanded={menuOpen} onClick={(e) => onMenuToggle(e.currentTarget)} />
            </Tooltip>
          </span>
          {folder
            ? <FolderMenu open={menuOpen} onClose={onMenuClose} onPick={pick} side={menuSide} name={row.name} />
            : <FileMenu open={menuOpen} onClose={onMenuClose} onPick={pick} side={menuSide} name={row.name} visualize={visualize} />}
        </span>
        </span>
      </span>
    </div>
  )
}
