'use client'

import { useState } from 'react'
import { Dropdown, DropdownItem } from '@/components/leads/dropdown'
import { Icon } from '@/components/om/icon'
import { Tooltip } from '@/components/om/tooltip'
import type { LeadFile } from '@/lib/db/schema'
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
  if (files.length === 0) return null

  return (
    <aside className={styles.column} aria-label="Attachments">
      <span className={styles.title}>Attachments</span>
      {files.map((f) => {
        const open = menu === f.id
        return (
          <div key={f.id} className={styles.tile} data-testid="note-attachment">
            <button type="button" className={styles.tileMain} aria-label={`Open ${f.name}`} onClick={() => onOpen(f)}>
              {f.thumb ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={f.thumb} alt="" className={styles.tileImg} width={142} height={108} />
              ) : (
                /* No thumbnail (a PDF): the files grid's surface-variant box with the kind's glyph (spec silent). */
                <span className={styles.tileBox}><Icon name={kindIcon(f)} size={24} className={styles.tileBoxIcon} /></span>
              )}
              <span className={styles.caption}>
                <Icon name={kindIcon(f)} size={20} className={styles.kindIcon} />
                <span className={styles.tileName}>{f.name}</span>
              </span>
            </button>
            <span className={styles.tileMenuWrap}>
              <Tooltip label="Attachment actions" disabled={open}>
                <button
                  type="button" className={styles.kebab}
                  aria-label={`Actions for ${f.name}`}
                  aria-haspopup="menu" aria-expanded={open}
                  onClick={() => setMenu((m) => (m === f.id ? null : f.id))}
                >
                  <Icon name="more_vert" size={24} weight={300} />
                </button>
              </Tooltip>
              {/* Not mocked: one item, at the Notes menus' 140 width (931:45488 / 931:45009). */}
              <Dropdown open={open} onClose={() => setMenu(null)} align="right" width={140} sheetTitle="Attachment">
                <DropdownItem onSelect={() => { setMenu(null); onRemove(f.id) }}>Remove</DropdownItem>
              </Dropdown>
            </span>
          </div>
        )
      })}
    </aside>
  )
}
