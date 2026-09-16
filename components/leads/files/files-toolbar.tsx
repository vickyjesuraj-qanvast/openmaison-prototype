'use client'

import { useState } from 'react'
import { Button } from '@/components/ds'
import { Dropdown, DropdownItem } from '@/components/leads/dropdown'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { SegmentedIconToggle } from '@/components/om/segmented'
import { Tooltip } from '@/components/om/tooltip'
import { ToolbarSearch } from '@/components/om/toolbar-search'
import { useSheetLayout } from '@/components/om/sheet'
import type { FileRow } from '@/lib/leads/file-model'
import styles from './files-toolbar.module.css'

export type FilesView = 'list' | 'grid'

export type FilesToolbarProps = {
  /** The open folder (frame 91) — null at the root ("All Files"). */
  folder: FileRow | null
  onBack: () => void
  /** Breadcrumb kebab (931:39719 → folder menu 200×118): Move · Rename · Delete. */
  onFolderMenu: (action: 'move' | 'rename' | 'delete') => void
  query: string
  onQuery: (q: string) => void
  /** New File menu (931:40128): From Local Files · From Company Files · From Google Drive. */
  onNew: (kind: 'local' | 'company' | 'drive') => void
  /** filter_list (931:40164) — no Files filter is mocked; the caller answers coming soon. */
  onFilter: () => void
  /** Column settings (REG-454) — only in the list view, and never on a phone. */
  onColumns?: () => void
  view: FilesView
  onView: (view: FilesView) => void
  /** Header kebab (931:40139, 200×46): Deleted Files. */
  onMenu: (action: 'deleted') => void
}

/**
 * Lead Details › Files — toolbar row (931:40157 "Section items" 1244×36 H g16; spec design-source/context/lead-files/
 * 01-toolbar-empty-list.txt "Toolbar row"): "All Files" 16/Bold (931:40159) · New File ▾ (931:40161 primary outlined,
 * trailing keyboard_arrow_down 20) · Search 280 (931:40163) · filter_list 36 (931:40164) · Segmented view_list / view_kanban
 * (931:40165) · more_vert 36 (931:40166).
 * Folder open (frame 91, 931:39719): the title becomes the breadcrumb row — arrow_back 24/Light · "All Files" 16/Regular
 * secondary · "/" · folder name 16/Bold · more_vert 20/Light (Move · Rename · Delete).
 * Copied from components/leads/contracts/contracts-toolbar.tsx — same geometry, the Files copy + the segmented view toggle.
 * Menus toggle on their own trigger (REG-153); every icon-only control carries a Tooltip (REG-75).
 */
export function FilesToolbar({ folder, onBack, onFolderMenu, query, onQuery, onNew, onFilter, onColumns, view, onView, onMenu }: FilesToolbarProps) {
  const [menu, setMenu] = useState<'new' | 'more' | 'folder' | null>(null)
  const sheet = useSheetLayout()   // (REG-354) the mobile canvas' one-row toolbar
  const pick = (fn: () => void) => () => { setMenu(null); fn() }

  return (
    <div className={styles.bar}>
      {folder ? (
        /* Breadcrumb row (931:39719, H g12): back · crumb (H g4) · folder kebab. "All Files" is plain text here — the mock
           draws it as a label, the arrow is the only way back (no invented link). */
        <div className={styles.crumbRow}>
          <Tooltip label="Back to All Files">
            <button type="button" className={styles.back} aria-label="Back to All Files" onClick={onBack}>
              <Icon name="arrow_back" size={24} weight={300} />
            </button>
          </Tooltip>
          <div className={styles.crumb}>
            <span className={styles.crumbRoot}>All Files</span>
            <span className={styles.crumbRoot} aria-hidden>/</span>
            <h2 className={styles.crumbTitle}>{folder.name}</h2>
          </div>
          <span className={styles.menuWrap}>
            <Tooltip label="Folder actions" disabled={menu === 'folder'}>
              <button
                type="button" className={styles.folderKebab}
                aria-label={`Actions for ${folder.name}`}
                aria-haspopup="menu" aria-expanded={menu === 'folder'}
                onClick={() => setMenu((m) => (m === 'folder' ? null : 'folder'))}
              >
                <Icon name="more_vert" size={20} weight={300} />
              </button>
            </Tooltip>
            <Dropdown open={menu === 'folder'} onClose={() => setMenu(null)} align="left" sheetTitle="New Folder">
              {/* Folder menu 200×118 (frame 91 @339,176) — verbatim order. */}
              <DropdownItem onSelect={pick(() => onFolderMenu('move'))}>Move</DropdownItem>
              <DropdownItem onSelect={pick(() => onFolderMenu('rename'))}>Rename</DropdownItem>
              <DropdownItem onSelect={pick(() => onFolderMenu('delete'))}><span className={styles.danger}>Delete</span></DropdownItem>
            </Dropdown>
          </span>
        </div>
      ) : (
        <h2 className={styles.title}>All Files</h2>
      )}
      <div className={styles.actions}>
        <span className={styles.menuWrap}>
          {/* (REG-354) ≤767 the canvas' toolbar is one row of glyphs, so the labelled primary is its icon;
              the menu, its title and every action behind it are the same. */}
          {sheet ? (
            <Tooltip label="New File">
              <IconButton icon="upload_file" label="New File" variant="primary"
                          aria-haspopup="menu" aria-expanded={menu === 'new'}
                          onClick={() => setMenu((m) => (m === 'new' ? null : 'new'))} />
            </Tooltip>
          ) : (
            <Button
              variant="primary" appearance="outlined"
              iconEnd={<span className={styles.chev} data-open={menu === 'new' || undefined}><Icon name="keyboard_arrow_down" size={20} /></span>}
              aria-haspopup="menu" aria-expanded={menu === 'new'}
              onPress={() => setMenu((m) => (m === 'new' ? null : 'new'))}
            >
              New File
            </Button>
          )}
          <Dropdown open={menu === 'new'} onClose={() => setMenu(null)} align="left" sheetTitle="New File">
            {/* New File menu 931:40128 (200×118) — verbatim order. */}
            <DropdownItem onSelect={pick(() => onNew('local'))}>From Local Files</DropdownItem>
            <DropdownItem onSelect={pick(() => onNew('company'))}>From Company Files</DropdownItem>
            <DropdownItem onSelect={pick(() => onNew('drive'))}>From Google Drive</DropdownItem>
          </Dropdown>
        </span>
        {/* (REG-275) The box matches the file name, its owner, its type label and what it is attached to
            (lib/leads/file-model.ts). The placeholder names those fields; the aria-label stays the plain name. */}
        <ToolbarSearch query={query} onQuery={onQuery} placeholder="Search name, owner, type…" label="Search files" />
        {/* (REG-273) `touchBtn` / `viewToggle` grow these 36px boxes to 40 at ≤767 — the icons keep their size. */}
        <Tooltip label="Filters">
          <IconButton icon="filter_list" label="Filters" className={styles.touchBtn} onClick={onFilter} />
        </Tooltip>
        {onColumns ? (
          /* Column settings (REG-454): the same drawer as the leads listing, after Filters — hidden ≤767 where the cards place every cell. */
          <Tooltip label="Column settings">
            <IconButton icon="tune" label="Column settings" onClick={onColumns} className={styles.touchBtn} />
          </Tooltip>
        ) : null}
        {/* Segmented Icon Button 931:40165: Start = view_list (frames 87/90 selected), End = view_kanban (frame 85 selected → grid). */}
        <span className={styles.viewToggle}>
          <SegmentedIconToggle
            label="View"
            value={view}
            options={[{ value: 'list', icon: 'view_list', label: 'List view' }, { value: 'grid', icon: 'view_kanban', label: 'Grid view' }]}
            onChange={(v) => onView(v === 'list' ? 'list' : 'grid')}
          />
        </span>
        <span className={styles.menuWrap}>
          <Tooltip label="More options" disabled={menu === 'more'}>
            <IconButton
              icon="more_vert" label="More options" className={styles.touchBtn}
              aria-haspopup="menu" aria-expanded={menu === 'more'}
              onClick={() => setMenu((m) => (m === 'more' ? null : 'more'))}
            />
          </Tooltip>
          <Dropdown open={menu === 'more'} onClose={() => setMenu(null)} align="right" sheetTitle="All Files">
            {/* Header kebab 931:40139 (200×46): the single item. */}
            <DropdownItem onSelect={pick(() => onMenu('deleted'))}>Deleted Files</DropdownItem>
          </Dropdown>
        </span>
      </div>
    </div>
  )
}
