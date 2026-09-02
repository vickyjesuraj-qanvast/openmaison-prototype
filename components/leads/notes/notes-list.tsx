'use client'

import { useState } from 'react'
import { Dropdown, DropdownItem } from '@/components/leads/dropdown'
import { Icon } from '@/components/om/icon'
import { Tooltip } from '@/components/om/tooltip'
import { TabSearchEmpty } from '@/components/leads/tasks/tab-search-empty'
import { displayDateTimeDot } from '@/lib/format'
import type { NoteKind } from '@/lib/leads/note-model'
import styles from './notes-list.module.css'

export type NotesListItem = {
  id: string
  kind: NoteKind
  title: string
  secondary: string
  createdAt: Date
  /** Unsaved new note / contact log — the last item while it is being written (frame 79 / 165). */
  draft?: boolean
  /** The Contacted stage's own log (REG-265): view-only — Edit and Delete render disabled. */
  locked?: boolean
}

export type NotesListProps = {
  items: NotesListItem[]
  /** True while a query is on — the empty list then shows the no-results card rather than "no notes". */
  searching: boolean
  /** The no-results card's Clear All: drops the query and puts the scope back to All Notes & Logs. */
  onClearAll: () => void
  selectedId: string | null
  onSelect: (id: string) => void
  onItemMenu: (id: string, action: 'edit' | 'delete') => void
}

/* (REG-293) Only the per-item kebab now — New ▾ moved to the tab's toolbar. */
type OpenMenu = { kind: 'item'; id: string } | null

/**
 * Lead Details › Notes — list column (931:44882 card, 400 wide; spec design-source/context/lead-notes/01-layout-list-editor.txt).
 * (REG-293) The column is ONLY the items now: its head — the kind chips (931:44884), New ▾ and the REG-275 search —
 * moved up to the tab's toolbar, where the lead listing keeps those same three things over its own one list.
 * Items ("Table / Cell / Two line" 360×100, H g12 p16/24): leading icon 20 · title 14/Bold + more_vert 20/Light kebab
 * (menu 931:45488 140×82 Edit · Delete) · secondary 14/Regular · date 12/Regular secondary via `displayDateTimeDot`.
 * Selected = primary-variant fill + 4px primary band at the left edge; bottom rules between items.
 * Menus toggle on their own trigger (REG-153); every icon-only control carries a Tooltip (REG-75).
 * The whole item (except the kebab) is the select button.
 */
export function NotesList({ items, searching, onClearAll, selectedId, onSelect, onItemMenu }: NotesListProps) {
  const [menu, setMenu] = useState<OpenMenu>(null)
  const close = () => setMenu(null)

  return (
    <div className={styles.column}>
      {/* (REG-275) Nothing left after the chips and the query — the tabs' shared no-results card, in the column.
          The unsaved draft is never filtered out, so this only ever answers a search / filter, never "no notes". */}
      {items.length === 0 ? (
        <div className={styles.empty}>
          <TabSearchEmpty noun="notes" searching={searching} onClearAll={onClearAll} />
        </div>
      ) : (
        <div className={styles.items} role="list" aria-label="Notes">
          {items.map((it) => {
            const selected = it.id === selectedId
            const open = menu?.kind === 'item' && menu.id === it.id
            return (
              <div key={it.id} role="listitem" className={styles.item} data-testid="note-item" data-selected={selected || undefined} data-draft={it.draft || undefined}>
                <button type="button" className={styles.itemMain} aria-pressed={selected} onClick={() => onSelect(it.id)}>
                  <Icon name={it.kind === 'contact' ? 'call_log' : 'sticky_note_2'} size={20} className={styles.itemIcon} />
                  <span className={styles.cellData}>
                    <span className={styles.titleBlock}>
                      <span className={styles.titleRow}>
                        <span className={styles.title}>{it.title}</span>
                      </span>
                      <span className={styles.secondary}>{it.secondary}</span>
                    </span>
                    <span className={styles.date}>{displayDateTimeDot(it.createdAt)}</span>
                  </span>
                </button>
                {/* Kebab sits in the title row (H g4: title 256 · more_vert 20) — placed beside the select button, never inside it. */}
                <span className={styles.kebabWrap}>
                  <Tooltip label={it.kind === 'contact' ? 'Contact log actions' : 'Note actions'} disabled={open}>
                    <button
                      type="button" className={styles.kebab}
                      aria-label={`Actions for ${it.title}`}
                      aria-haspopup="menu" aria-expanded={open}
                      onClick={() => setMenu((m) => (m?.kind === 'item' && m.id === it.id ? null : { kind: 'item', id: it.id }))}
                    >
                      <Icon name="more_vert" size={20} weight={300} />
                    </button>
                  </Tooltip>
                  <Dropdown open={open} onClose={close} align="right" width={140}>
                    {/* A stage-logged record keeps its items visible but inert (REG-265) — the title says why. */}
                    <DropdownItem disabled={it.locked} title={it.locked ? 'Logged by the Contacted stage — edit it in the Move stage window' : undefined}
                                  onSelect={() => { close(); onItemMenu(it.id, 'edit') }}>Edit</DropdownItem>
                    <DropdownItem tone="danger" disabled={it.locked} title={it.locked ? 'Logged by the Contacted stage — it cannot be deleted here' : undefined}
                                  onSelect={() => { close(); onItemMenu(it.id, 'delete') }}><span className={it.locked ? undefined : styles.danger}>Delete</span></DropdownItem>
                  </Dropdown>
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
