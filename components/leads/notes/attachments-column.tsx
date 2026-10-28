'use client'

import { useRef, useState } from 'react'
import { DropdownItem } from '@/components/leads/dropdown'
import { Icon } from '@/components/om/icon'
import { PortalMenu } from '@/components/om/portal-menu'
import { Tooltip } from '@/components/om/tooltip'
import type { LeadFile } from '@/lib/db/schema'
import { displayDate } from '@/lib/format'
import { noteWhen } from './notes-list'   // (the calm UI build 2026-10-27 — T-11) the list's own date and clock, one format
import styles from './attachments-column.module.css'

export type AttachmentsColumnProps = {
  files: LeadFile[]
  /** Tile kebab › Remove — detaches the file from the note (the file itself stays in the library). */
  onRemove: (fileId: string) => void
  /** Tile click — the parent routes to /leads/<id>/files/<fileId>. */
  onOpen: (file: LeadFile) => void
}

/** The tile's kind glyph: "picture_as_pdf" for a PDF, "image" otherwise (931:45548 caption) — files-grid.tsx kindIcon. */
const kindIcon = (f: LeadFile) => (f.kind === 'pdf' || f.mime === 'application/pdf' ? 'picture_as_pdf' : 'image')

/**
 * Lead Details › Notes — Attachments column (931:45548, 182×776, V g12 p16, left rule #e5e5e5; spec design-source/context/
 * lead-notes/01-layout-list-editor.txt): "Attachments" 14/Semi Bold, then tiles 150×158 (V p4, fill #f2f2f2, r4): image
 * 142×108 (cover, r2) + caption 142×42 (H g8 p8): kind icon 20/Regular #db382a + name 14/Semi Bold · more_vert 24/Light
 * #666666 (kebab → Remove — no menu mocked, invented), tiles 12 apart. Rendered only when a file is attached (frame 79
 * shows no column). Tile markup / CSS copied from components/leads/files/files-grid.tsx at the Notes sizes; a single
 * click opens (build plan: "tile click → /leads/<id>/files/<fileId>"). Kebabs toggle on their own trigger (REG-153)
 * and carry a Tooltip (REG-75).
 */
export function AttachmentsColumn({ files, onRemove, onOpen }: AttachmentsColumnProps) {
  const [menu, setMenu] = useState<string | null>(null)
  /* (REG-728) One menu at a time, through the body portal, anchored to the pressed kebab — inline, it hung inside this scrolling column. */
  const kebab = useRef<HTMLElement | null>(null)
  if (files.length === 0) return null
  const menuFile = menu ? files.find((f) => f.id === menu) ?? null : null

  return (
    <aside className={styles.column} aria-label="Attachments">
      <span className={styles.title}>Attachments</span>
      {files.map((f) => {
        const open = menu === f.id
        return (
          <div key={f.id} className={styles.tile} data-testid="note-attachment">
            <button type="button" className={styles.tileMain} aria-label={`Open ${f.name}, uploaded ${noteWhen(f.createdAt)}`} onClick={() => onOpen(f)}>
              {f.thumb ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={f.thumb} alt="" className={styles.tileImg} width={142} height={108} />
              ) : (
                /* No thumbnail (a PDF): the files grid's surface-variant box with the kind's glyph (spec silent). */
                <span className={styles.tileBox}><Icon name={kindIcon(f)} size={24} className={styles.tileBoxIcon} /></span>
              )}
              <span className={styles.caption}>
                <Icon name={kindIcon(f)} size={20} className={styles.kindIcon} />
                <span className={styles.tileText}>
                  <span className={styles.tileName}>{f.name}</span>
                  {/* (REG-600) when it was uploaded, at a glance — (Leads on the move, L4 — C-10, a bug fix at every width) the day only, ellipsised: the
                      whole stamp ran under the tile's ⋮ ("11⋮30 AM"); the time stays one hover away and in the tile's name for a reader */}
                  <Tooltip label={noteWhen(f.createdAt)}><span className={styles.tileTime} data-testid="note-attachment-day">{displayDate(f.createdAt)}</span></Tooltip>
                </span>
              </span>
            </button>
            <span className={styles.tileMenuWrap}>
              <Tooltip label="Attachment actions" disabled={open}>
                <button
                  type="button" className={styles.kebab}
                  aria-label={`Actions for ${f.name}`}
                  aria-haspopup="menu" aria-expanded={open}
                  onClick={(e) => { kebab.current = e.currentTarget; setMenu((m) => (m === f.id ? null : f.id)) }}
                >
                  <Icon name="more_vert" size={24} weight={300} />
                </button>
              </Tooltip>
            </span>
          </div>
        )
      })}
      {/* Not mocked: one item, at the Notes menus' 140 width (931:45488 / 931:45009). */}
      <PortalMenu open={!!menuFile} anchor={kebab} onClose={() => setMenu(null)} align="right" width={140} role="menu" sheetTitle="Attachment">
        <DropdownItem onSelect={() => { const f = menuFile; setMenu(null); if (f) onRemove(f.id) }}>Remove</DropdownItem>
      </PortalMenu>
    </aside>
  )
}
