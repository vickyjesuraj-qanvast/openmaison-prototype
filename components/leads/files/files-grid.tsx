'use client'

import { useState } from 'react'
import { Checkbox } from '@/components/ds'
import { Dropdown, DropdownItem } from '@/components/leads/dropdown'
import { Icon } from '@/components/om/icon'
import { Tooltip } from '@/components/om/tooltip'
import { MOBILE, useMediaQuery } from '@/lib/breakpoint'
import type { FileRow } from '@/lib/leads/file-model'
import styles from './files-grid.module.css'

/** File tile kebab (931:40131, 200×226): Open · Move · Duplicate · Download · Rename · Delete. */
export type FileAction = 'open' | 'move' | 'duplicate' | 'download' | 'rename' | 'delete'
/** Folder card kebab (931:40130, 200×154): Open · Move · Rename · Delete. */
export type FolderAction = 'open' | 'move' | 'rename' | 'delete'

/** One grid date group (931:39120) — `lib/leads/file-model.ts` groupByDay's shape. */
export type FileGroup = { day: number; label: string; files: FileRow[] }

export type FilesGridProps = {
  folders: FileRow[]
  groups: FileGroup[]
  selected: Set<string>
  /** The parent owns the selection; the grid hands back the next set. */
  onSelect: (ids: Set<string>) => void
  onOpenFolder: (folder: FileRow) => void
  onOpenFile: (file: FileRow) => void
  /** The comment chip: the viewer with the comments panel open (the Tasks chip's interaction, REG-253). */
  onOpenComments: (file: FileRow) => void
  onFolderMenu: (folder: FileRow, action: FolderAction) => void
  onFileMenu: (file: FileRow, action: FileAction) => void
}

/** The tile's kind glyph: "image" 20/Regular red, "picture_as_pdf" for a PDF (931:39125 caption). */
const kindIcon = (f: FileRow) => (f.kind === 'pdf' || f.mime === 'application/pdf' ? 'picture_as_pdf' : 'image')

/**
 * Lead Details › Files — grid view (frame 85, 931:39083 "Frame 114502" 1244 wide V g40; spec design-source/context/
 * lead-files/02-grid-select-bulk.txt): the Folders group (931:39084 — head 931:39085 + 299×56 cards 931:39089) then one
 * date group per calendar day (931:39120 — head 931:39121 + 299×262 tiles 931:39125), 4 across at 1244 with 16 gaps.
 * Selection (frames 96/97): no checkbox on the tile itself, so a tile / card follows the Drive convention (REG-183) —
 * one click toggles its selection, a double-click (or the kebab's Open) opens it; the group head checkbox is checked
 * when every item of the group is selected, indeterminate when some, and selects / clears the group on click.
 * Selected surfaces fill primary-variant (#eee5ff).
 * Structure copied from components/leads/tasks/attach-files-modal.tsx (group heads, folder cards, tiles) with the Files
 * tab's sizes; kebabs toggle on their own trigger (REG-153) and carry a Tooltip (REG-75).
 *
 * Touch (REG-273): a double-tap is hostile on a phone, so ≤767 the Drive convention splits in two — a single tap OPENS
 * the folder / file and selection moves onto an explicit checkbox, the same affordance the list view already carries on
 * every row (files-table.tsx "Cell / Selection"). The checkbox is not rendered at all above 767 (`display: none`), so the
 * desktop mock is untouched; `useMediaQuery` only swaps what the tap DOES, which no stylesheet can express.
 */
export function FilesGrid({ folders, groups, selected, onSelect, onOpenFolder, onOpenFile, onOpenComments, onFolderMenu, onFileMenu }: FilesGridProps) {
  const [menu, setMenu] = useState<string | null>(null)
  const touch = useMediaQuery(MOBILE)

  const toggle = (id: string) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id); else next.add(id)
    onSelect(next)
  }
  /** Group head: every item selected → clear the group; otherwise select the whole group (spec 02 "click selects / clears"). */
  const toggleGroup = (ids: string[]) => {
    const next = new Set(selected)
    const all = ids.every((id) => next.has(id))
    ids.forEach((id) => (all ? next.delete(id) : next.add(id)))
    onSelect(next)
  }
  const groupState = (ids: string[]) => {
    const on = ids.filter((id) => selected.has(id)).length
    return { all: ids.length > 0 && on === ids.length, some: on > 0 && on < ids.length }
  }

  return (
    <div className={styles.groups}>
      {folders.length > 0 ? (() => {
        const ids = folders.map((f) => f.id)
        const { all, some } = groupState(ids)
        return (
          /* Folders group (931:39084, V g16): head H g8 (checkbox 24 + "Folders" 14/Semi Bold) + cards row H g16. */
          <div className={styles.group} role="group" aria-label="Folders">
            <div className={styles.groupHead}>
              <Checkbox isSelected={all} isIndeterminate={some} onChange={() => toggleGroup(ids)} aria-label="Select all folders" />
              <span className={styles.groupTitle}>Folders</span>
            </div>
            <div className={`${styles.row} ${styles.foldersRow}`}>
              {folders.map((f) => {
                const isOn = selected.has(f.id)
                const open = menu === f.id
                return (
                  /* Folder card 299×56 (931:39089): fill #f2f2f2 r4, inner H g8 p12 → folder 24 · texts (name 14/Semi Bold,
                     "n items" 10/Regular secondary) · more_vert 24/Light. Selected (frame 97): fill #eee5ff. */
                  <div key={f.id} className={styles.folder} data-testid="folder-card" data-selected={isOn || undefined}>
                    {/* (REG-273) ≤767 only: the card's selection affordance, so the tap itself can open. */}
                    <span className={styles.pick}>
                      <Checkbox isSelected={isOn} onChange={() => toggle(f.id)} aria-label={`Select ${f.name}`} />
                    </span>
                    <button
                      type="button" className={styles.folderMain}
                      aria-pressed={touch ? undefined : isOn}
                      aria-label={touch ? `Open ${f.name}` : `${isOn ? 'Deselect' : 'Select'} ${f.name} (double-click opens)`}
                      onClick={() => (touch ? onOpenFolder(f) : toggle(f.id))}
                      onDoubleClick={() => onOpenFolder(f)}
                    >
                      <Icon name="folder" size={24} className={styles.folderIcon} />
                      <span className={styles.folderTexts}>
                        <span className={styles.folderName}>{f.name}</span>
                        <span className={styles.folderCount}>{f.itemCount === 1 ? '1 item' : `${f.itemCount} items`}</span>
                      </span>
                    </button>
                    <span className={styles.menuWrap}>
                      <Tooltip label="Folder actions" disabled={open}>
                        <button
                          type="button" className={styles.kebab}
                          aria-label={`Actions for ${f.name}`}
                          aria-haspopup="menu" aria-expanded={open}
                          onClick={() => setMenu((m) => (m === f.id ? null : f.id))}
                        >
                          <Icon name="more_vert" size={24} weight={300} />
                        </button>
                      </Tooltip>
                      <FolderMenu open={open} onClose={() => setMenu(null)} name={f.name} onPick={(a) => { setMenu(null); onFolderMenu(f, a) }} />
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })() : null}

      {groups.map((g) => {
        const ids = g.files.map((f) => f.id)
        const { all, some } = groupState(ids)
        return (
          /* Date group (931:39120, V g16): head H g8 (checkbox 24 + "Friday, 17 Jul ‘26" 14/Semi Bold) + tiles row H g16. */
          <div key={g.day} className={styles.group} role="group" aria-label={g.label}>
            <div className={styles.groupHead}>
              <Checkbox isSelected={all} isIndeterminate={some} onChange={() => toggleGroup(ids)} aria-label={`Select all files from ${g.label}`} />
              <span className={styles.groupTitle}>{g.label}</span>
            </div>
            <div className={styles.row}>
              {g.files.map((f) => {
                const isOn = selected.has(f.id)
                const open = menu === f.id
                return (
                  /* Tile 299×262 (931:39125): V p4, fill #f2f2f2 r4 → image 291×200 r2 (cover) · caption 291×54
                     (H g8 p16/8/12/8): kind icon 20 red + name 14/Semi Bold · comment chip 36×26 · more_vert 24/Light.
                     Selected (frame 96): the whole tile fills #eee5ff. */
                  <div key={f.id} className={styles.tile} data-testid="file-tile" data-selected={isOn || undefined}
                       data-chip={f.commentCount > 0 || undefined}>
                    {/* (REG-273) ≤767 only: the tile's selection affordance over the image's top-left, so the tap opens. */}
                    <span className={styles.tilePick}>
                      <Checkbox isSelected={isOn} onChange={() => toggle(f.id)} aria-label={`Select ${f.name}`} />
                    </span>
                    <button
                      type="button" className={styles.tileMain}
                      aria-pressed={touch ? undefined : isOn}
                      aria-label={touch ? `Open ${f.name}` : `${isOn ? 'Deselect' : 'Select'} ${f.name} (double-click opens)`}
                      onClick={() => (touch ? onOpenFile(f) : toggle(f.id))}
                      onDoubleClick={() => onOpenFile(f)}
                    >
                      {f.thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={f.thumb} alt="" className={styles.tileImg} width={291} height={200} />
                      ) : (
                        /* No thumbnail (a PDF): the attach-files modal's surface-variant box with the kind's glyph (spec silent). */
                        <span className={styles.tileBox}><Icon name={kindIcon(f)} size={24} className={styles.tileBoxIcon} /></span>
                      )}
                      <span className={styles.caption}>
                        <span className={styles.nameGroup}>
                          <Icon name={kindIcon(f)} size={20} className={styles.kindIcon} />
                          <span className={styles.tileName}>{f.name}</span>
                        </span>
                      </span>
                    </button>
                    {/* The chip sits BESIDE the tile button, not inside it — buttons cannot nest (the Tasks
                        title cell's rule); it opens the viewer's comments panel straight away (REG-253). */}
                    {f.commentCount > 0 ? (
                      <Tooltip label="Open comments">
                        <button type="button" className={styles.chip} data-action=""
                                aria-label={`Open ${f.commentCount} ${f.commentCount === 1 ? 'comment' : 'comments'} on ${f.name}`}
                                onClick={() => onOpenComments(f)}>
                          <Icon name="comment" size={16} weight={300} />
                          <span className={styles.chipCount}>{f.commentCount}</span>
                        </button>
                      </Tooltip>
                    ) : null}
                    <span className={styles.tileMenuWrap}>
                      <Tooltip label="File actions" disabled={open}>
                        <button
                          type="button" className={styles.kebab}
                          aria-label={`Actions for ${f.name}`}
                          aria-haspopup="menu" aria-expanded={open}
                          onClick={() => setMenu((m) => (m === f.id ? null : f.id))}
                        >
                          <Icon name="more_vert" size={24} weight={300} />
                        </button>
                      </Tooltip>
                      <FileMenu open={open} onClose={() => setMenu(null)} name={f.name} onPick={(a) => { setMenu(null); onFileMenu(f, a) }} />
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ---------------------------------------------------------------------------------------------- */

/** Folder kebab menu 931:40130 (200×154) — verbatim order; Delete #db382a. Shared with the list's folder rows. */
export function FolderMenu({ open, onClose, onPick, side = 'down', name }: { open: boolean; onClose: () => void; onPick: (a: FolderAction) => void; side?: 'down' | 'up'; name?: string }) {
  return (
    <Dropdown open={open} onClose={onClose} align="right" side={side} sheetTitle={name ?? 'Folder'}>
      <DropdownItem onSelect={() => onPick('open')}>Open</DropdownItem>
      <DropdownItem onSelect={() => onPick('move')}>Move</DropdownItem>
      <DropdownItem onSelect={() => onPick('rename')}>Rename</DropdownItem>
      <DropdownItem onSelect={() => onPick('delete')}><span className={styles.danger}>Delete</span></DropdownItem>
    </Dropdown>
  )
}

/** File kebab menu 931:40131 (200×226) — verbatim order; Delete #db382a. Shared with the list's file rows. */
export function FileMenu({ open, onClose, onPick, side = 'down', name }: { open: boolean; onClose: () => void; onPick: (a: FileAction) => void; side?: 'down' | 'up'; name?: string }) {
  return (
    <Dropdown open={open} onClose={onClose} align="right" side={side} sheetTitle={name ?? 'File'}>
      <DropdownItem onSelect={() => onPick('open')}>Open</DropdownItem>
      <DropdownItem onSelect={() => onPick('move')}>Move</DropdownItem>
      <DropdownItem onSelect={() => onPick('duplicate')}>Duplicate</DropdownItem>
      <DropdownItem onSelect={() => onPick('download')}>Download</DropdownItem>
      <DropdownItem onSelect={() => onPick('rename')}>Rename</DropdownItem>
      <DropdownItem onSelect={() => onPick('delete')}><span className={styles.danger}>Delete</span></DropdownItem>
    </Dropdown>
  )
}
