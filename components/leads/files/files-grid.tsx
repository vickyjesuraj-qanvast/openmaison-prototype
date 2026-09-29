'use client'

import { useRef, useState, type RefObject } from 'react'
import { Checkbox } from '@/components/ds'
import { DropdownItem, MENU_WIDTH } from '@/components/leads/dropdown'
import { PortalMenu } from '@/components/om/portal-menu'
import { FolderCard, FolderGroup } from '@/components/om/folders/folder-card'
import { countLine } from '@/lib/folders'
import { Icon } from '@/components/om/icon'
import { Tooltip } from '@/components/om/tooltip'
import { TOUCH_TABLET, useMediaQuery } from '@/lib/breakpoint'
import type { FileRow } from '@/lib/leads/file-model'
import styles from './files-grid.module.css'

/** File tile kebab (931:40131, 200×226): Open · Move · Duplicate · Download · Rename · Delete. */
export type FileAction = 'open' | 'move' | 'duplicate' | 'download' | 'rename' | 'delete' | 'visualize'
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
  /** (REG-664) While searching: where each hit lives ("Kitchen" · "All Files") — a search reaches every folder. */
  placeOf?: (f: FileRow) => string
  /** (F095) The file menu's AI Visualizer item for a picture — "Open this version in AI Visualizer" for a filed render; null hides it. */
  visualizeLabel?: (f: FileRow) => string | null
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
/** (audit 2026-09-26, round 3) A long name gives way in the middle — what tells files apart is often its end ("Render - Living room - V2.jpg"
    and "… - V3.jpg"), so the version and the extension always show and the start takes the ellipsis. A render's name splits at its
    version: on a phone's narrow card the room keeps the first line and the version the second. */
const nameParts = (name: string): { start: string; sep: string; tail: string } => {
  const v = /^(.*?)( - )(V\d+\.[a-z0-9]{1,5})$/i.exec(name)
  if (v) return { start: v[1]!, sep: v[2]!, tail: v[3]! }
  const e = /\.[a-z0-9]{1,5}$/i.exec(name)
  return e && e.index > 0 ? { start: name.slice(0, e.index), sep: '', tail: e[0] } : { start: name, sep: '', tail: '' }
}

function FileName({ name }: { name: string }) {
  const { start, sep, tail } = nameParts(name)
  return (
    <span className={styles.tileName} title={name} data-two={sep ? '' : undefined}>
      <span className={styles.nameStart}>{start}</span>{sep ? <span className={styles.nameSep}>{sep}</span> : null}<span className={styles.nameEnd}>{tail}</span>
    </span>
  )
}

export function FilesGrid({ folders, groups, selected, onSelect, onOpenFolder, onOpenFile, onOpenComments, onFolderMenu, onFileMenu, placeOf, visualizeLabel }: FilesGridProps) {
  /* (REG-728) The tile's menu opens through the body portal, anchored to the pressed kebab, as the folder card's (REG-664) — an
     inline menu hung inside the tile's row. One menu at a time, so one instance serves every tile. */
  const [menu, setMenu] = useState<string | null>(null)
  const fileAnchor = useRef<HTMLElement | null>(null)
  const menuFile = menu ? groups.flatMap((g) => g.files).find((f) => f.id === menu) ?? null : null
  const pickFile = (a: FileAction) => { const f = menuFile; setMenu(null); if (f) onFileMenu(f, a) }
  /* (REG-664) The folder card is the shared one (components/om/folders); its menu opens through the portal, anchored to the kebab. */
  const [folderMenu, setFolderMenu] = useState<string | null>(null)
  const folderAnchor = useRef<HTMLElement | null>(null)
  const menuFolder = folderMenu ? folders.find((f) => f.id === folderMenu) ?? null : null
  const pickFolder = (a: FolderAction) => { const f = menuFolder; setFolderMenu(null); if (f) onFolderMenu(f, a) }
  /* (REG-385) The tap-opens convention belongs to the POINTER, not the width: a touch tablet at 768–1024 had the
     desktop's "one tap selects, double-tap opens" — a gesture no touch platform teaches — with no checkbox to
     select with either. TOUCH_TABLET is the same hook REG-307/310 use for every other hover-only affordance. */
  const touch = useMediaQuery(TOUCH_TABLET)

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
    <div className={styles.groups} data-kb-list="file">
      {folders.length > 0 ? (
        /* Folders group (931:39084, V g16): head H g8 (checkbox 24 + "Folders" 14/Semi Bold) + cards row H g16 — the shared pieces. */
        <FolderGroup ids={folders.map((f) => f.id)} selected={selected} onSelect={onSelect}>
          {folders.map((f) => (
            <FolderCard key={f.id} name={f.name} selected={selected.has(f.id)} onToggle={() => toggle(f.id)} onOpen={() => onOpenFolder(f)}
                        count={placeOf ? `${placeOf(f)} · ${countLine(f.itemCount, 'item', 'items')}` : countLine(f.itemCount, 'item', 'items')}
                        menuOpen={folderMenu === f.id} onMenu={(el) => { folderAnchor.current = el; setFolderMenu((m) => (m === f.id ? null : f.id)) }} />
          ))}
        </FolderGroup>
      ) : null}
      <FolderMenu open={!!menuFolder} anchor={folderAnchor} onClose={() => setFolderMenu(null)} name={menuFolder?.name ?? ''} onPick={pickFolder} />
      <FileMenu open={!!menuFile} anchor={fileAnchor} onClose={() => setMenu(null)} name={menuFile?.name} visualize={menuFile ? visualizeLabel?.(menuFile) ?? null : null} onPick={pickFile} />

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
                  <div key={f.id} className={styles.tile} data-testid="file-tile" data-kb-row data-kb-id={f.id} data-selected={isOn || undefined}
                       data-chip={f.commentCount > 0 || undefined}>
                    {/* (REG-273) ≤767 only: the tile's selection affordance over the image's top-left, so the tap opens. */}
                    <span className={styles.tilePick} data-kb-select>
                      <Checkbox isSelected={isOn} onChange={() => toggle(f.id)} aria-label={`Select ${f.name}`} />
                    </span>
                    <button
                      type="button" className={styles.tileMain} data-kb-open="dblclick"
                      aria-pressed={touch ? undefined : isOn}
                      aria-label={touch ? `Open ${f.name}` : `${isOn ? 'Deselect' : 'Select'} ${f.name} (double-click opens)`}
                      onClick={() => (touch ? onOpenFile(f) : toggle(f.id))}
                      onDoubleClick={() => onOpenFile(f)}
                    >
                      {placeOf ? <span className={styles.tilePlace}><Icon name="folder" size={16} weight={300} /><span className={styles.tilePlaceName}>{placeOf(f)}</span></span> : null}
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
                          <FileName name={f.name} />
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
                          onClick={(e) => { fileAnchor.current = e.currentTarget; setMenu((m) => (m === f.id ? null : f.id)) }}
                        >
                          <Icon name="more_vert" size={24} weight={300} />
                        </button>
                      </Tooltip>
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

/** Folder kebab menu 931:40130 (200×154) — verbatim order; Delete #db382a. Shared by the grid's folder cards and the list's folder rows.
 *  (REG-728) Through the body portal, anchored to the kebab (`anchor` must hold it, so a second press on it toggles). */
export function FolderMenu({ open, anchor, onClose, onPick, name }: { open: boolean; anchor: RefObject<HTMLElement | null>; onClose: () => void; onPick: (a: FolderAction) => void; name?: string }) {
  return (
    <PortalMenu open={open} anchor={anchor} onClose={onClose} align="right" width={MENU_WIDTH.standard} role="menu" sheetTitle={name || 'Folder'}>
      <DropdownItem onSelect={() => onPick('open')}>Open</DropdownItem>
      <DropdownItem onSelect={() => onPick('move')}>Move</DropdownItem>
      <DropdownItem onSelect={() => onPick('rename')}>Rename</DropdownItem>
      <DropdownItem tone="danger" onSelect={() => onPick('delete')}>Delete</DropdownItem>
    </PortalMenu>
  )
}

/** File kebab menu 931:40131 (200×226) — verbatim order; Delete #db382a. Shared by the grid's tiles and the list's file rows.
 *  (REG-728) Through the body portal, anchored to the kebab (`anchor` must hold it, so a second press on it toggles). */
export function FileMenu({ open, anchor, onClose, onPick, name, visualize = null }: { open: boolean; anchor: RefObject<HTMLElement | null>; onClose: () => void; onPick: (a: FileAction) => void; name?: string
  /** (REG-675, AI Visualizer Q-31) the item's words: a photo opens as a room of the lead's design, a filed render as its own version (F095); null hides it */
  visualize?: string | null }) {
  return (
    <PortalMenu open={open} anchor={anchor} onClose={onClose} align="right" width={MENU_WIDTH.standard} role="menu" sheetTitle={name || 'File'}>
      <DropdownItem onSelect={() => onPick('open')}>Open</DropdownItem>
      {visualize ? <DropdownItem onSelect={() => onPick('visualize')}>{visualize}</DropdownItem> : null}
      <DropdownItem onSelect={() => onPick('move')}>Move</DropdownItem>
      <DropdownItem onSelect={() => onPick('duplicate')}>Duplicate</DropdownItem>
      <DropdownItem onSelect={() => onPick('download')}>Download</DropdownItem>
      <DropdownItem onSelect={() => onPick('rename')}>Rename</DropdownItem>
      <DropdownItem tone="danger" onSelect={() => onPick('delete')}>Delete</DropdownItem>
    </PortalMenu>
  )
}
