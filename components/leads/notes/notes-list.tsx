'use client'

import { useState } from 'react'
import { Button } from '@/components/ds'
import { Dropdown, DropdownItem } from '@/components/leads/dropdown'
import { Icon } from '@/components/om/icon'
import { Tooltip } from '@/components/om/tooltip'
import { displayDateTimeDot } from '@/lib/format'
import type { NoteFilter, NoteKind } from '@/lib/leads/note-model'
import styles from './notes-list.module.css'

export type NotesListItem = {
  id: string
  kind: NoteKind
  title: string
  secondary: string
  createdAt: Date
  /** Unsaved new note / contact log — the last item while it is being written (frame 79 / 165). */
  draft?: boolean
}

export type NotesListProps = {
  items: NotesListItem[]
  filter: NoteFilter
  onFilter: (f: NoteFilter) => void
  selectedId: string | null
  onSelect: (id: string) => void
  onNew: (kind: NoteKind) => void
  onItemMenu: (id: string, action: 'edit' | 'delete') => void
}

/** Head chips (931:44884): All · Notes (sticky_note_2) · Contact (list_alt) — one per NoteFilter, in the mock's order. */
const FILTERS: { key: NoteFilter; label: string; icon?: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'note', label: 'Notes', icon: 'sticky_note_2' },
  { key: 'contact', label: 'Contact', icon: 'list_alt' },
]

type OpenMenu = { kind: 'new' } | { kind: 'item'; id: string } | null

/**
 * Lead Details › Notes — list column (931:44882 card, 360 wide; spec design-source/context/lead-notes/01-layout-list-editor.txt):
 * head 360×68 (931:44884, H g8 p16, bottom rule) = the "Choice" chips with a leading icon (36 tall, p10/12 · icon variant
 * p10/12/10/8, icon 16 + gap 4) and the New ▾ button (primary outlined, trailing keyboard_arrow_down; menu 931:45009 140×82
 * Note · Contact Log), then the items ("Table / Cell / Two line" 360×100, H g12 p16/24): leading icon 20 · title 14/Bold +
 * more_vert 20/Light kebab (menu 931:45488 140×82 Edit · Delete) · secondary 14/Regular · date 12/Regular secondary via
 * `displayDateTimeDot`. Selected = primary-variant fill + 4px primary band at the left edge; bottom rules between items.
 * Chip look copied from components/leads/move-stage/fields.tsx ChoiceChips (radio group) at the Notes sizes; the New ▾
 * chevron rotation from components/leads/contracts/contracts-toolbar.tsx. Menus toggle on their own trigger (REG-153);
 * every icon-only control carries a Tooltip (REG-75). The whole item (except the kebab) is the select button.
 */
export function NotesList({ items, filter, onFilter, selectedId, onSelect, onNew, onItemMenu }: NotesListProps) {
  const [menu, setMenu] = useState<OpenMenu>(null)
  const newOpen = menu?.kind === 'new'
  const close = () => setMenu(null)

  return (
    <div className={styles.column}>
      <div className={styles.head}>
        <div className={styles.chips} role="radiogroup" aria-label="Filter notes">
          {FILTERS.map((f) => (
            <button
              key={f.key} type="button" role="radio" aria-checked={filter === f.key}
              className={styles.chip} data-selected={filter === f.key || undefined} data-icon={f.icon ? '' : undefined}
              onClick={() => onFilter(f.key)}
            >
              {f.icon ? <Icon name={f.icon} size={16} className={styles.chipIcon} /> : null}
              {f.label}
            </button>
          ))}
        </div>
        <span className={styles.menuWrap}>
          <Button
            variant="primary" appearance="outlined"
            iconEnd={<span className={styles.chev} data-open={newOpen || undefined}><Icon name="keyboard_arrow_down" size={20} /></span>}
            aria-haspopup="menu" aria-expanded={newOpen}
            onPress={() => setMenu((m) => (m?.kind === 'new' ? null : { kind: 'new' }))}
          >
            New
          </Button>
          <Dropdown open={newOpen} onClose={close} align="right" width={140}>
            <DropdownItem onSelect={() => { close(); onNew('note') }}>Note</DropdownItem>
            <DropdownItem onSelect={() => { close(); onNew('contact') }}>Contact Log</DropdownItem>
          </Dropdown>
        </span>
      </div>

      <div className={styles.items} role="list" aria-label="Notes">
        {items.map((it) => {
          const selected = it.id === selectedId
          const open = menu?.kind === 'item' && menu.id === it.id
          return (
            <div key={it.id} role="listitem" className={styles.item} data-testid="note-item" data-selected={selected || undefined} data-draft={it.draft || undefined}>
              <button type="button" className={styles.itemMain} aria-pressed={selected} onClick={() => onSelect(it.id)}>
                <Icon name={it.kind === 'contact' ? 'list_alt' : 'sticky_note_2'} size={20} className={styles.itemIcon} />
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
                  <DropdownItem onSelect={() => { close(); onItemMenu(it.id, 'edit') }}>Edit</DropdownItem>
                  <DropdownItem onSelect={() => { close(); onItemMenu(it.id, 'delete') }}><span className={styles.danger}>Delete</span></DropdownItem>
                </Dropdown>
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
